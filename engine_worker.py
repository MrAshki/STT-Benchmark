"""Run one local ASR engine in an isolated process."""
import argparse
import gc
import json
import os
from pathlib import Path
import socket
import statistics
import subprocess
import threading
import time

from benchlib import ROOT, dump, load, pcm

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HOME'] = str(ROOT / '.cache' / 'huggingface')


class TransformersEngine:
    def __init__(self, spec, directory):
        import torch
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
        self.torch, self.device = torch, spec.get('device', 'cuda:0')
        self.processor = AutoProcessor.from_pretrained(spec['source'], local_files_only=True, trust_remote_code=False)
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(spec['source'], local_files_only=True,
                    trust_remote_code=False, use_safetensors=True, dtype='auto').to(self.device).eval()
        if self.model.config.model_type != 'whisper':
            raise ValueError('This adapter supports Transformers Whisper models only.')
        self.info = {'device': self.device, 'dtype': str(self.model.dtype),
                     'parameters': sum(p.numel() for p in self.model.parameters()),
                     'generation_config': self.model.generation_config.to_dict(),
                     'attention_implementation': self.model.config._attn_implementation,
                     'long_audio': 'Use native timestamp decoding for audio longer than 30 seconds.'}
        if self.device.startswith('cuda'):
            torch.cuda.synchronize(); torch.cuda.reset_peak_memory_stats()

    def transcribe(self, path):
        _, signal = pcm(path)
        long = len(signal) > 30 * 16000
        inputs = self.processor(signal, sampling_rate=16000, return_tensors='pt',
                                return_attention_mask=True, truncation=not long,
                                padding='longest' if long else 'max_length')
        inputs = {k: v.to(self.device, dtype=self.model.dtype) if k == 'input_features' else v.to(self.device) for k, v in inputs.items()}
        with self.torch.inference_mode():
            output = self.model.generate(**inputs, **({'return_timestamps': True} if long else {}))
        if self.device.startswith('cuda'):
            self.torch.cuda.synchronize()
        return self.processor.batch_decode(output, skip_special_tokens=True)[0].strip()

    def close(self):
        if self.device.startswith('cuda'):
            self.info['peak_torch_allocated_MiB'] = self.torch.cuda.max_memory_allocated() / 1024**2
        self.model = None
        gc.collect()


class VoskEngine:
    def __init__(self, spec, directory):
        from vosk import Model, SetLogLevel
        SetLogLevel(-1)
        self.model = Model(spec['source'])
        self.info = {'device': 'cpu', 'dtype': 'Native Vosk model format', 'decoder': 'Native KaldiRecognizer defaults; no grammar supplied.'}

    def transcribe(self, path):
        from vosk import KaldiRecognizer
        data, _ = pcm(path)
        decoder = KaldiRecognizer(self.model, 16000)
        parts = []
        for start in range(0, len(data), 8000):
            if decoder.AcceptWaveform(data[start:start + 8000]):
                parts.append(json.loads(decoder.Result()).get('text', ''))
        parts.append(json.loads(decoder.FinalResult()).get('text', ''))
        return ' '.join(p for p in parts if p).strip()

    def close(self):
        self.model = None


class CppEngine:
    def __init__(self, spec, directory):
        import requests
        self.process, self.log = None, None
        self.session = requests.Session(); self.session.trust_env = False
        with socket.socket() as socket_:
            socket_.bind(('127.0.0.1', 0)); port = socket_.getsockname()[1]
        self.url = 'http://127.0.0.1:' + str(port)
        args = [spec['executable'], '-m', spec['source'], '--host', '127.0.0.1', '--port', str(port), '-l', 'fa']
        if spec.get('device') == 'cpu':
            args.append('-ng')
        self.info = {'device': spec.get('device', 'cuda:0'), 'dtype': 'Unchanged GGML file type',
                     'command': args, 'decoding': 'Native whisper-server defaults; Persian transcription; no prompt, VAD or grammar.'}
        help_result = subprocess.run([spec['executable'], '--help'], capture_output=True, text=True, encoding='utf-8', errors='replace',
                                     creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0), timeout=30)
        self.info['native_defaults_help'] = help_result.stdout + help_result.stderr
        self.log_path = Path(directory) / 'native-server.log'
        self.log = self.log_path.open('w', encoding='utf-8')
        try:
            self.process = subprocess.Popen(args, cwd=directory, stdout=self.log, stderr=self.log,
                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            deadline = time.monotonic() + 180
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise RuntimeError('Native server stopped: ' + self.log_path.read_text(encoding='utf-8', errors='replace')[-3000:])
                try:
                    self.session.get(self.url + '/', timeout=1)
                    self.log.flush()
                    native_log = self.log_path.read_text(encoding='utf-8', errors='replace')
                    self.info['native_runtime_startup'] = native_log
                    if spec.get('device', 'cuda:0').startswith('cuda') and 'using CUDA' not in native_log:
                        raise RuntimeError('CUDA execution was requested but the native startup log did not confirm the CUDA backend.')
                    return
                except requests.ConnectionError:
                    time.sleep(.2)
            raise TimeoutError('Native server did not start within 180 seconds.')
        except Exception:
            self.close()
            raise

    def transcribe(self, path):
        with Path(path).open('rb') as audio:
            response = self.session.post(self.url + '/inference', files={'file': ('sample.wav', audio, 'audio/wav')},
                                         data={'response_format': 'json'}, timeout=600)
        response.raise_for_status()
        result = response.json()
        if not isinstance(result.get('text'), str):
            raise RuntimeError('Native server returned no text field: ' + str(result))
        return result['text'].strip()

    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                self.process.kill(); self.process.wait()
        if self.log:
            self.log.close()
        self.session.close()


def run(config_path, dataset_path, output):
    import psutil
    spec, dataset, output = load(config_path), load(dataset_path), Path(output)
    output.mkdir(parents=True, exist_ok=True)
    settings = spec.pop('evaluation')
    attempts, info, engine = [], {'model_id': spec['id'], 'status': 'loading'}, None
    peak, stop = [0], threading.Event()
    def monitor():
        process = psutil.Process()
        while not stop.wait(.1):
            try:
                peak[0] = max(peak[0], sum(p.memory_info().rss for p in [process, *process.children(recursive=True)] if p.is_running()))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    thread = threading.Thread(target=monitor, daemon=True); thread.start()
    try:
        started = time.perf_counter()
        engine = {'whisper_cpp': CppEngine, 'transformers': TransformersEngine, 'vosk': VoskEngine}[spec['backend']](spec, output)
        info.update(engine.info, load_s=time.perf_counter() - started)
        if settings['warmup']:
            started = time.perf_counter(); engine.transcribe(dataset[0]['prepared_path'])
            info['warmup_s'] = time.perf_counter() - started
        for sample in dataset:
            item = {k: sample[k] for k in ['id', 'category', 'speaker_id', 'prompt_id', 'duration_s']}
            item.update(model_id=spec['id'], status='ok')
            try:
                texts, times = [], []
                for _ in range(settings['repeats']):
                    started = time.perf_counter(); text = engine.transcribe(sample['prepared_path'])
                    times.append(time.perf_counter() - started); texts.append(text)
                item.update(prediction=texts[0], inference_s=statistics.median(times), repeat_seconds=times,
                            repeat_predictions=texts, repeat_agreement=len(set(texts)) == 1)
                print(spec['id'], sample['id'], round(item['inference_s'], 3), 'seconds', flush=True)
            except Exception as exc:
                item.update(status='error', error=repr(exc))
            attempts.append(item); dump(output / 'attempts.json', attempts)
        info['status'] = 'complete' if all(a['status'] == 'ok' for a in attempts) else 'partial'
    except Exception as exc:
        info.update(status='error', error=repr(exc))
        completed = {a['id'] for a in attempts}
        attempts.extend({**{k: s[k] for k in ['id', 'category', 'speaker_id', 'prompt_id', 'duration_s']},
                         'model_id': spec['id'], 'status': 'error', 'error': repr(exc)} for s in dataset if s['id'] not in completed)
    finally:
        if engine:
            engine.close(); info.update(engine.info)
        stop.set(); thread.join(timeout=2)
        info['peak_process_tree_rss_MiB'] = peak[0] / 1024**2
        info['memory_method'] = 'Peak sampled sum of worker and child process RSS; 100 ms interval, includes load and warmup.'
        dump(output / 'attempts.json', attempts); dump(output / 'engine.json', info)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('config'); parser.add_argument('dataset'); parser.add_argument('output')
    args = parser.parse_args()
    run(args.config, args.dataset, args.output)
