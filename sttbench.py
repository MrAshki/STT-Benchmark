"""Local Persian STT benchmark. Use check, run and report."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import uuid

from benchlib import ROOT, NORMALIZATION, digest, dump, fingerprint, load, prepare, read_manifest, score, summarize


def configuration(path):
    cfg = load(path)
    cfg['manifest'] = str((ROOT / cfg['manifest']).resolve())
    if not cfg.get('references_confirmed'):
        raise ValueError('Confirm the reference transcripts in the config before evaluation.')
    seen = set()
    for spec in cfg['models']:
        if spec['id'] in seen or not re.fullmatch(r'[a-z0-9_-]+', spec['id']):
            raise ValueError('Model IDs must be unique lowercase letters, digits, hyphens or underscores.')
        seen.add(spec['id'])
        if spec['backend'] not in {'whisper_cpp', 'transformers', 'vosk'}:
            raise ValueError('Unsupported engine: ' + spec['backend'])
        spec['source'] = str((ROOT / spec['source']).resolve())
        if not Path(spec['source']).exists():
            raise ValueError('Model path not found: ' + spec['source'])
        if spec['backend'] == 'whisper_cpp':
            spec['executable'] = str((ROOT / spec['executable']).resolve())
            if not Path(spec['executable']).is_file():
                raise ValueError('whisper-server executable not found.')
        if spec['backend'] == 'transformers':
            if not (Path(spec['source']) / 'config.json').is_file():
                raise ValueError('Expected a local Transformers model folder.')
    if not seen:
        raise ValueError('Select at least one model.')
    if cfg['evaluation']['repeats'] not in range(1, 11):
        raise ValueError('Use between one and ten repetitions.')
    return cfg


def environment():
    import torch
    return {'python': sys.version, 'executable': sys.executable, 'platform': platform.platform(),
            'torch': torch.__version__, 'cuda_build': torch.version.cuda,
            'gpu': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            'packages': {d.metadata['Name']: d.version for d in importlib.metadata.distributions()}}


def check(cfg):
    import torch
    rows = read_manifest(cfg['manifest'])
    if not shutil.which(cfg.get('ffmpeg', 'ffmpeg')):
        raise ValueError('FFmpeg is not on PATH.')
    if any(m.get('device', '').startswith('cuda') for m in cfg['models']):
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA is not available. No automatic CPU fallback is enabled.')
        value = torch.ones((16, 16), device='cuda')
        if (value @ value).sum().item() != 4096:
            raise RuntimeError('GPU check failed.')
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
    from vosk import Model
    report = {'environment': environment(), 'audio_count': len(rows), 'models': cfg['models'], 'status': 'ready',
              'note': 'Import and GPU checks passed. This does not prove model inference will fit GPU memory.'}
    dump(ROOT / 'results' / 'environment-check.json', report)
    print('Ready:', len(rows), 'audio files,', len(cfg['models']), 'models. GPU:', report['environment']['gpu'])


def export_csv(path, records):
    if not records:
        return
    keys = list(dict.fromkeys(k for r in records for k in r))
    with Path(path).open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=keys); writer.writeheader(); writer.writerows(records)


def evaluate(cfg, only_file=None, model_id=None, repeats=None, resume=None):
    rows = read_manifest(cfg['manifest'])
    if only_file:
        rows = [r for r in rows if r['id'] == only_file]
        if not rows:
            raise ValueError('Audio ID not found: ' + only_file)
    if model_id:
        cfg['models'] = [m for m in cfg['models'] if m['id'] == model_id]
        if not cfg['models']:
            raise ValueError('Model ID not found: ' + model_id)
    if repeats is not None:
        cfg['evaluation']['repeats'] = repeats
    if cfg['evaluation']['repeats'] not in range(1, 11):
        raise ValueError('Use between one and ten repetitions.')
    run = Path(resume).resolve() if resume else ROOT / 'results' / (datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:6])
    run.mkdir(parents=True, exist_ok=True)
    print('Run:', run, flush=True)
    models = []
    for spec in cfg['models']:
        print('Check model fingerprint:', spec['id'], flush=True)
        models.append({**spec, 'files_sha256': fingerprint(spec['source']),
                       'executable_sha256': digest(spec['executable']) if spec.get('executable') else None})
    signature_data = {'config': cfg, 'references': rows,
                      'audio': {r['id']: digest(r['source_path']) for r in rows}, 'models': models,
                      'normalization': NORMALIZATION, 'code': {p: digest(ROOT / p) for p in ['sttbench.py', 'benchlib.py', 'engine_worker.py']},
                      'environment': environment()}
    signature = hashlib.sha256(json.dumps(signature_data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    existing = run / 'run.json'
    if existing.exists() and load(existing)['signature'] != signature:
        raise ValueError('Resume rejected: models, references, audio, code, environment or settings have changed.')
    dump(existing, {'signature': signature, 'started_utc': datetime.now(timezone.utc).isoformat(), **signature_data,
                    'timing': 'Median repeated full-file processing of prepared WAV. Includes read, feature extraction, decoding and local HTTP overhead for whisper.cpp. Excludes model load and warmup.',
                    'comparison': 'Model plus engine plus saved settings. Vosk uses CPU; Whisper uses GPU when configured. No engine-only speed claim.',
                    'data_limit': 'Small human Telegram recording set. Two speakers; paired prompts are not independent. No general Persian or gender ranking.'})
    dataset = prepare(rows, run / 'prepared', cfg.get('ffmpeg', 'ffmpeg'))
    dump(run / 'dataset.json', dataset)
    for spec in cfg['models']:
        directory = run / spec['id']; directory.mkdir(exist_ok=True)
        previous = directory / 'attempts.json'
        done = {r['id']: r for r in load(previous) if r['status'] == 'ok'} if previous.exists() else {}
        pending = [r for r in dataset if r['id'] not in done]
        if not pending:
            print('Reuse completed model:', spec['id'], flush=True)
            continue
        dump(directory / 'spec.json', {**spec, 'evaluation': cfg['evaluation']})
        dump(directory / 'pending.json', pending)
        log = directory / 'worker.log'
        with log.open('a', encoding='utf-8') as output:
            process = subprocess.run([sys.executable, '-B', str(ROOT / 'engine_worker.py'), str(directory / 'spec.json'),
                                      str(directory / 'pending.json'), str(directory)], stdout=output, stderr=subprocess.STDOUT,
                                     creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        current = load(previous) if previous.exists() else []
        merged = {**done, **{r['id']: r for r in current}}
        for sample in pending:
            if sample['id'] not in merged:
                merged[sample['id']] = {**{k: sample[k] for k in ['id', 'category', 'speaker_id', 'prompt_id', 'duration_s']},
                                       'model_id': spec['id'], 'status': 'error', 'error': 'Worker stopped; see worker.log. Exit code: ' + str(process.returncode)}
        dump(previous, list(merged.values()))
        print(spec['name'], ':', sum(r['status'] == 'ok' for r in merged.values()), '/', len(dataset), 'complete', flush=True)
    attempts = [r for spec in cfg['models'] for r in load(run / spec['id'] / 'attempts.json')]
    indexed = {r['id']: r for r in dataset}
    for item in attempts:
        item['reference'] = indexed[item['id']]['reference']
        if item['status'] == 'ok':
            item['scores'] = score(item['reference'], item['prediction'])
    metrics = summarize(attempts, [m['id'] for m in cfg['models']])
    evidence = {'models': models, 'environment': environment(), 'evaluation': cfg['evaluation'], 'normalization': NORMALIZATION,
                'dataset': [{k: v for k, v in r.items() if k not in {'source_path', 'prepared_path'}} for r in dataset],
                'attempts': attempts, 'metrics': metrics, 'engines': {m['id']: load(run / m['id'] / 'engine.json') if (run / m['id'] / 'engine.json').exists() else {'status': 'error'} for m in cfg['models']},
                'limitations': ['Only this dataset was measured.', 'Two human speakers recorded via Telegram.', 'References supplied and confirmed by the user; not independently audited by listening.',
                                'Paired readings share prompts.', 'Different engines, devices and native decoding settings are part of the comparison.',
                                'Structural targets are metadata, not a separate semantic score.']}
    dump(run / 'evidence.json', evidence)
    dump(run / 'metrics.json', metrics)
    flat = []
    for a in attempts:
        item = {k: v for k, v in a.items() if k not in {'scores', 'repeat_seconds', 'repeat_predictions'}}
        for profile, block in a.get('scores', {}).items():
            item.update({profile + '_' + k: v for k, v in block.items() if k not in {'alignment', 'reference', 'prediction'}})
        flat.append(item)
    export_csv(run / 'per-file.csv', flat)
    from reporting import numeric_report
    numeric_report(run, evidence)
    print('Saved evidence, metrics, CSV and numeric report:', run, flush=True)
    return run


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ['check', 'run']:
        command = commands.add_parser(name)
        command.add_argument('--config', default=str(ROOT / 'configs' / 'local.json'))
        if name == 'run':
            command.add_argument('--only-file'); command.add_argument('--model'); command.add_argument('--repeats', type=int); command.add_argument('--resume')
    report = commands.add_parser('report'); report.add_argument('--run', required=True)
    args = parser.parse_args()
    if args.command == 'report':
        from reporting import agent_report
        agent_report(Path(args.run).resolve())
    else:
        cfg = configuration(args.config)
        if args.command == 'check':
            check(cfg)
        else:
            evaluate(cfg, args.only_file, args.model, args.repeats, args.resume)


if __name__ == '__main__':
    main()
