"""Build a reviewed dashboard snapshot from saved ASR outputs. No model or API calls."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from benchlib import ROOT, digest, load, score
from number_profile import evaluate, numeric_values


def snapshot(source):
    source=Path(source).resolve(); data=load(source)
    records=data.get('records',data.get('attempts'))
    if not isinstance(records,list) or not records:
        raise ValueError('Expected records or attempts containing model/file results.')
    models=data.get('models',[])
    if not models:
        raise ValueError('Model metadata is required.')
    names={m['id']:m['name'] for m in models}
    pairs=set(); rows=[]; samples_checked={}
    for r in records:
        key=(r['model_id'],r['id'])
        if key in pairs or key[0] not in names:
            raise ValueError('Duplicate result or unknown model: '+str(key))
        pairs.add(key)
        identity=tuple(r.get(k) for k in ['reference','category','speaker_id','duration_s'])
        if r['id'] in samples_checked and samples_checked[r['id']]!=identity:
            raise ValueError('Conflicting recording metadata: '+r['id'])
        samples_checked[r['id']]=identity
        duration=r.get('duration_s')
        if not isinstance(duration,(float,int)) or not math.isfinite(duration) or duration<=0:
            raise ValueError('Recording duration must be positive and finite.')
        timing=r.get('inference_s')
        if timing is not None and (not isinstance(timing,(float,int)) or not math.isfinite(timing) or timing<0):
            raise ValueError('Invalid processing time.')
        if r.get('semantic_score') not in [None,0,1,2]:
            raise ValueError('Invalid semantic review label.')
        row={k:r.get(k) for k in ['id','model_id','category','speaker_id','prompt_id','status','duration_s','reference','prediction','inference_s','semantic_score','review_reason','review_reason_fa','review_confidence','style','repeat_agreement']}
        row.update(model_name=names[key[0]],category=r.get('category') or 'custom',speaker_id=r.get('speaker_id') or 'unknown',
                   status=r.get('status','ok'),error=r.get('error'),style=r.get('style') or 'not_reviewed',
                   review_author=data.get('author') if r.get('semantic_score') is not None else None)
        if row['status']=='ok':
            if not isinstance(row['prediction'],str) or not isinstance(row['reference'],str):
                raise ValueError('Successful results require reference and prediction strings.')
            # Recompute from raw text: never treat saved aggregate percentages as input facts.
            calculated=score(row['reference'],row['prediction'])
            numeric=evaluate(row['reference'],row['prediction'],row['category'])
            if row['category']=='numbers':
                row['number_entity_exact']=numeric_values(row['reference'],'numbers')==numeric_values(row['prediction'],'numbers')
            for profile,block in [('raw',calculated['raw']),('orthography',calculated['normalized']),('number',numeric)]:
                for field in ['S','D','I','N','char_errors','char_N','exact_match','reference','prediction','alignment']:
                    row[profile+'_'+field]=block[field]
        rows.append(row)
    selected_ids={m['id'] for m in models}
    samples={r['id']:r for r in rows}
    for mid in selected_ids:
        for id_,sample in samples.items():
            if (mid,id_) not in pairs:
                rows.append({**{k:sample[k] for k in ['id','category','speaker_id','prompt_id','duration_s','reference']},
                             'model_id':mid,'model_name':names[mid],'status':'missing','error':'No model/file result was supplied.',
                             'semantic_score':None,'style':'not_reviewed'})
    source_meta={'label':'Local measured Persian STT outputs','provider':'Local files','files':[str(source)],
                 'executedAt':datetime.now(timezone.utc).isoformat(),'classification':'measured',
                 'evidenceFlow':[{'title':'Saved model outputs','detail':str(source)+'; SHA-256 '+digest(source)},
                                 {'title':'Recompute scores','detail':'tools/prepare_dashboard.py recomputes raw/orthography/number counts from reference and prediction. Model inference is not repeated.'},
                                 {'title':'Aggregate selected rows','detail':'Sum S+D+I over sum reference N. Sum median per-file times; divide by selected audio duration for RTF. Count distinct audio IDs once.'},
                                 {'title':'Qualitative labels','detail':data.get('author','No semantic labels supplied')+'; available labels are separate from computed metrics.'}],
                 'metricDefinitions':[{'label':'WER (%)','definition':'100 × sum(S+D+I) / sum(reference words), over successful selected rows.'},
                                      {'label':'CER (%)','definition':'100 × sum(character errors) / sum(reference characters). Includes spaces.'},
                                      {'label':'Exact match (%)','definition':'Percentage of successful selected outputs exactly equal after the chosen transform.'},
                                      {'label':'Processing time','definition':'Sum of per-file median inference times, excluding load and warmup.'},
                                      {'label':'Semantic labels','definition':'Supplied single-reviewer text judgments. Not a validated similarity metric.'}],
                 'notes':['Numbers-aware normalization applies to numbers and brackets only.','Different engines, device types and precision are part of this run.','Missing and failed outputs are not scored as zero error.']}
    engines=data.get('engines',{})
    model_rows=[{'id':m['id'],'name':m['name'],'backend':m['backend'],'device':engines.get(m['id'],{}).get('device',m.get('device')),
                 'dtype':engines.get(m['id'],{}).get('dtype'),'load_s':engines.get(m['id'],{}).get('load_s'),
                 'parameters':engines.get(m['id'],{}).get('parameters')} for m in models]
    return {'surface':'dashboard','title':'Persian STT Benchmark','subtitle':'Accuracy, speed and faithful transcription',
            'status':'reviewed','buildStatus':'creating','generatedAt':datetime.now(timezone.utc).isoformat(),
            'filters':[], 'queries':{'observations':{'rows':rows,'source':source_meta},'models':{'rows':model_rows,'source':source_meta}},
            'benchmark':{'source_sha256':digest(source),'source_file':str(source),'audio_origin':'See the supplied dataset manifest',
                         'review_author':data.get('author'),'review_method':data.get('qualitative_review',{}),'number_profile':data.get('number_profile',{}),
                         'limitations':data.get('source_limitations',data.get('limitations',[]))}}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',default=str(ROOT/'outputs/review-v2/evaluation-v2.json'))
    p.add_argument('--output',default=str(ROOT/'work/dashboard-snapshot.json'))
    args=p.parse_args(); target=Path(args.output); target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(snapshot(args.source),ensure_ascii=False,indent=2),encoding='utf-8')
    print('Snapshot:',target)
