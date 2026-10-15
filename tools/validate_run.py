"""Check a saved run against its measurements and unchanged model files."""
import argparse
from pathlib import Path
import statistics
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from benchlib import dump, fingerprint, load, score, summarize

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('run')
args = parser.parse_args()
run = Path(args.run).resolve()
evidence = load(run / 'evidence.json')
ids = [m['id'] for m in evidence['models']]
expected = len(evidence['dataset']) * len(ids)
attempts = evidence['attempts']
if len(attempts) != expected or len({(r['model_id'],r['id']) for r in attempts}) != expected:
    raise RuntimeError('Missing or duplicate model/audio results.')
for row in attempts:
    if row['status'] != 'ok':
        continue
    if row['scores'] != score(row['reference'],row['prediction']):
        raise RuntimeError('Score mismatch: '+row['id'])
    if row['inference_s'] != statistics.median(row['repeat_seconds']):
        raise RuntimeError('Timing mismatch: '+row['id'])
    if len(row['repeat_seconds']) != evidence['evaluation']['repeats']:
        raise RuntimeError('Missing timing repetitions: '+row['id'])
if evidence['metrics'] != summarize(attempts,ids):
    raise RuntimeError('Aggregate metric mismatch.')
checks = {}
for model in evidence['models']:
    checks[model['id']] = fingerprint(model['source']) == model['files_sha256']
    if not checks[model['id']]:
        raise RuntimeError('Model files changed: '+model['id'])
result = {'status':'passed','expected':expected,'completed':sum(r['status']=='ok' for r in attempts),
          'scores_recomputed':True,'aggregate_scores_recomputed':True,'timing_medians_checked':True,
          'model_hashes_unchanged':checks,
          'nonidentical_repetitions':[r['model_id']+'/'+r['id'] for r in attempts if r['status']=='ok' and not r['repeat_agreement']]}
dump(run / 'validation.json',result)
print(result)
