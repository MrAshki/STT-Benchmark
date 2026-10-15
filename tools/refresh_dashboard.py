"""Refresh the dashboard from saved raw reference/prediction rows, then build."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
from prepare_dashboard import snapshot, ROOT

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,default=ROOT/'outputs/review-v2/evaluation-v2.json')
parser.add_argument('--node',type=Path,default=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
parser.add_argument('--builder',type=Path,default=Path.home()/'.codex/plugins/cache/openai-curated-remote/data-analytics/1.0.11/scripts/data-app.mjs')
args=parser.parse_args()
if not args.node.is_file() or not args.builder.is_file():
    raise SystemExit('The Data build runtime is required. Pass --node and --builder paths. The current built dashboard can run without rebuilding.')
target=ROOT/'dashboard/src/data.json'
old=json.loads(target.read_text(encoding='utf-8-sig'))
data=snapshot(args.source);data['id']=old['id'];data['buildStatus']='complete'
# Keep the last source snapshot for review if the build fails.
target.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
subprocess.run([str(args.node),str(args.builder),'build','--project-dir',str(ROOT/'dashboard'),'--separate-data'],check=True)
print('Dashboard refreshed. Restart the server with the same --source path, then refresh the browser.')
