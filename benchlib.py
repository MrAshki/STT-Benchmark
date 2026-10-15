"""Data preparation and deterministic ASR scoring."""
import csv
import hashlib
import json
import re
import subprocess
import unicodedata
import wave
from pathlib import Path

import numpy as np
from jiwer import process_characters, process_words

ROOT = Path(__file__).resolve().parent
PROFILES = ('raw', 'normalized')
NORMALIZATION = {
    'id': 'persian-orthography-v1', 'unicode': 'NFC',
    'letters': 'Arabic yeh/kaf to Persian yeh/kaf',
    'digits': 'Arabic and Persian digits to ASCII digits; no number-word conversion',
    'diacritics': 'Remove Arabic combining marks and tatweel',
    'spacing': 'ZWNJ/ZWJ become spaces; remove bidi controls; collapse whitespace',
    'punctuation': 'Unicode punctuation and symbols become spaces',
    'semantic_rewrite': False, 'CER': 'Includes internal spaces after each profile transform',
    'raw': 'Collapse whitespace only; preserve punctuation, spelling, digits and diacritics',
}


def dump(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    temp.replace(path)


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def fingerprint(path):
    path = Path(path)
    files = [path] if path.is_file() else sorted(p for p in path.rglob('*') if p.is_file())
    if not files:
        raise ValueError('No model files: ' + str(path))
    return {p.name if path.is_file() else p.relative_to(path).as_posix(): digest(p) for p in files}


def normalize(text):
    text = unicodedata.normalize('NFC', text)
    text = text.translate(str.maketrans('يك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'یک01234567890123456789'))
    text = re.sub(r'[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]', '', text)
    text = re.sub(r'[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]', '', text)
    text = re.sub(r'[\u200c\u200d]', ' ', text)
    text = ''.join(' ' if unicodedata.category(c)[0] in {'P', 'S'} else c for c in text)
    return ' '.join(text.split())


def score(reference, prediction):
    result = {}
    for profile in PROFILES:
        ref, hyp = (normalize(reference), normalize(prediction)) if profile == 'normalized' else (' '.join(reference.split()), ' '.join(prediction.split()))
        words, chars = process_words(ref, hyp), process_characters(ref, hyp)
        n, cn = words.hits + words.substitutions + words.deletions, chars.hits + chars.substitutions + chars.deletions
        if not n or not cn:
            raise ValueError('A reference is empty after the ' + profile + ' transform.')
        errors = words.substitutions + words.deletions + words.insertions
        ce = chars.substitutions + chars.deletions + chars.insertions
        chunks = [{'type': a.type, 'reference': words.references[0][a.ref_start_idx:a.ref_end_idx],
                   'prediction': words.hypotheses[0][a.hyp_start_idx:a.hyp_end_idx]} for a in words.alignments[0]]
        result[profile] = {'reference': ref, 'prediction': hyp, 'S': words.substitutions,
                           'D': words.deletions, 'I': words.insertions, 'N': n,
                           'char_errors': ce, 'char_N': cn, 'WER_pct': 100 * errors / n,
                           'CER_pct': 100 * ce / cn, 'exact_match': ref == hyp, 'alignment': chunks}
    return result


def read_manifest(path):
    path = Path(path).resolve()
    with path.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream))
    if not rows:
        raise ValueError('The reference CSV is empty.')
    ids, paths = set(), set()
    for row in rows:
        if not row.get('file_name') or not row.get('reference', '').strip():
            raise ValueError('Each row must have file_name and reference.')
        source = (path.parent / row['file_name']).resolve()
        if not source.is_file():
            raise ValueError('Audio file not found: ' + str(source))
        row.setdefault('id', source.stem)
        if not re.fullmatch(r'[A-Za-z0-9_-]+', row['id']):
            raise ValueError('Use letters, digits, hyphens or underscores in IDs.')
        if row['id'] in ids or source in paths:
            raise ValueError('Duplicate audio path or ID.')
        score(row['reference'], '')
        ids.add(row['id']); paths.add(source)
        row.update(source_path=str(source), category=row.get('category') or 'custom',
                   speaker_id=row.get('speaker_id') or 'unknown', prompt_id=row.get('prompt_id') or row['id'])
    return rows


def prepare(rows, directory, ffmpeg):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    output = []
    for row in rows:
        target = directory / (row['id'] + '.wav')
        subprocess.run([ffmpeg, '-nostdin', '-v', 'error', '-y', '-i', row['source_path'],
                        '-map_metadata', '-1', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', str(target)], check=True, capture_output=True)
        with wave.open(str(target), 'rb') as stream:
            samples = np.frombuffer(stream.readframes(stream.getnframes()), dtype='<i2')
        if not len(samples) or not np.any(samples):
            raise ValueError('Empty or silent audio: ' + row['id'])
        output.append({**row, 'prepared_path': str(target.resolve()), 'duration_s': len(samples) / 16000,
                       'source_sha256': digest(row['source_path']), 'prepared_sha256': digest(target)})
    return output


def pcm(path):
    with wave.open(str(path), 'rb') as stream:
        if (stream.getframerate(), stream.getnchannels(), stream.getsampwidth()) != (16000, 1, 2):
            raise ValueError('Expected mono 16 kHz PCM16 WAV.')
        data = stream.readframes(stream.getnframes())
    return data, np.frombuffer(data, dtype='<i2').astype(np.float32) / 32768


def aggregates(attempts, model_ids, by=None):
    results = []
    for model in model_ids:
        candidates = [r for r in attempts if r['model_id'] == model]
        groups = sorted({r[by] for r in candidates}) if by else [None]
        for group in groups:
            block = [r for r in candidates if not by or r[by] == group]
            good = [r for r in block if r['status'] == 'ok']
            item = {'model_id': model, 'completed': len(good), 'expected': len(block),
                    'coverage_pct': 100 * len(good) / len(block) if block else 0}
            if by:
                item[by] = group
            for profile in PROFILES:
                totals = {key: sum(r['scores'][profile][key] for r in good) for key in ['S', 'D', 'I', 'N', 'char_errors', 'char_N']}
                item[profile] = {**totals,
                    'WER_pct': 100 * (totals['S'] + totals['D'] + totals['I']) / totals['N'] if totals['N'] else None,
                    'CER_pct': 100 * totals['char_errors'] / totals['char_N'] if totals['char_N'] else None,
                    'exact_match_pct': 100 * sum(r['scores'][profile]['exact_match'] for r in good) / len(good) if good else None}
            audio = sum(r['duration_s'] for r in good)
            elapsed = sum(r['inference_s'] for r in good)
            item.update(audio_s=audio, inference_s=elapsed, RTF=elapsed / audio if audio else None)
            results.append(item)
    return results


def summarize(attempts, model_ids):
    common_ids = set.intersection(*({r['id'] for r in attempts if r['model_id'] == m and r['status'] == 'ok'} for m in model_ids))
    return {'overall': aggregates(attempts, model_ids), 'by_category': aggregates(attempts, model_ids, 'category'),
            'by_speaker': aggregates(attempts, model_ids, 'speaker_id'), 'common_file_ids': sorted(common_ids),
            'common_subset': aggregates([r for r in attempts if r['id'] in common_ids], model_ids)}
