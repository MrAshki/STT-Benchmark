import React from 'react';
import {EvidenceChart} from '../../data-app-public.jsx';
import {aggregate,categories} from './metrics.mjs';
import './benchmark-charts.css';

const aliases={'large-v3':'Large V3',turbo:'V3 Turbo','persian-v4':'Persian V4',vosk:'Vosk 0.42'};
const palette={'large-v3':'#2563eb',turbo:'#0d9488','persian-v4':'#8b5cf6',vosk:'#d97706'};
const shortCategories={
 fa:{numbers:'اعداد',emails:'ایمیل',brackets:'نشانه‌ها',hard_words:'دشوار',colloquial:'محاوره'},
 en:{numbers:'Numbers',emails:'Emails',brackets:'Brackets',hard_words:'Hard words',colloquial:'Colloquial'}
};
const label=(m)=>aliases[m.id]||m.name;
const isFa=(lang)=>lang==='fa';
function ModelKey({models,lang,showColors=true}){
 return <div className="stt-chart-key" aria-label={isFa(lang)?'راهنمای نام مدل‌ها':'Model name key'}>
  {models.map(m=><div className="stt-chart-key-item" key={m.id}>{showColors&&<i aria-hidden="true" style={{background:palette[m.id]||'var(--chart-1)'}}/>}<span><bdi>{label(m)}</bdi><small><bdi>{m.name}</bdi></small></span></div>)}
 </div>;
}
function ChartFrame({plot,lang,compact=false}){
 // SVG geometry must keep its left-to-right coordinate system in both languages.
 // Only the plot has a minimum width. The card, its controls and its prose still fit the page.
 return <div className="stt-chart-scroll" dir="ltr" role="region" tabIndex={0} aria-label={isFa(lang)?'ناحیهٔ نمودار؛ در صفحهٔ باریک، افقی جابه‌جا کنید':'Chart area; scroll horizontally on narrow screens'}><div className={'stt-chart-geometry'+(compact?' stt-chart-geometry-compact':'')}>{plot}</div></div>;
}
export function SpeedAccuracyChart({evidence,summary,lang='en'}){
 const fa=isFa(lang),time=fa?'زمان پردازش (ثانیه)':'Processing time (s)',wer=fa?'خطای واژه WER (%)':'WER (%)',series=fa?'مدل':'Model';
 const plotted=summary.filter(m=>Number.isFinite(m.WER)&&Number.isFinite(m.seconds));
 const chartRows=plotted.map(m=>({[series]:label(m),[time]:m.seconds,[wer]:m.WER}));
 const colors=Object.fromEntries(plotted.map(m=>[label(m),palette[m.id]||'var(--chart-1)']));
 return <EvidenceChart id="speed-accuracy" title={fa?'مقایسهٔ سرعت و خطای واژه':'Speed and word error'} variant="card" {...evidence} rows={chartRows} height={300}
  spec={{type:'scatter',x:time,y:wer,series,showLegend:false,colors,valueDecimals:2,xLabel:time,yLabel:wer,stackable:false}}
  renderPlot={plot=><ChartFrame plot={plot} lang={lang}/>}>
  {!plotted.length&&<p className="stt-note">{fa?'برای این فیلتر، خروجی کامل همراه با زمان ثبت‌شده وجود ندارد.':'No completed and timed outputs match these filters.'}</p>}
  <ModelKey models={plotted} lang={lang}/>
  <p className="stt-note">{fa?'هر نقطه یک مدل است. محور افقی: مجموع زمان پردازش فایل‌های انتخاب‌شده، به ثانیه. محور عمودی: WER با وزن تعداد واژه‌های مرجع. نقطهٔ پایین‌تر و چپ‌تر بهتر است. زمان بارگذاری و گرم‌کردن مدل حساب نشده است؛ نتایج CPU و GPU مربوط به همین سیستم هستند.':'Each point is one model. Horizontal: total processing seconds for the selected recordings. Vertical: WER weighted by reference words. Lower and farther left is better. Model loading and warmup are excluded; CPU and GPU results describe this system.'}</p>
 </EvidenceChart>;
}
export function CategoryErrorChart({evidence,rows,summary,profile,lang='en'}){
 const fa=isFa(lang),category=fa?'دستهٔ آزمون':'Test category',wer=fa?'خطای واژه WER (%)':'WER (%)',series=fa?'مدل':'Model',completed=fa?'فایل‌های کامل':'Completed recordings';
 const matrix=summary.flatMap(m=>Object.keys(categories).map(c=>{
  const a=aggregate(rows.filter(r=>r.model_id===m.id&&r.category===c),profile);
  return {[series]:label(m),[category]:shortCategories[fa?'fa':'en'][c],[wer]:a.WER,[completed]:a.completed};
 })).filter(r=>r[completed]&&Number.isFinite(r[wer]));
 const included=summary.filter(m=>matrix.some(r=>r[series]===label(m)));
 return <EvidenceChart id="category-matrix" title={fa?'خطای واژه در دسته‌های آزمون':'Word error by test category'} variant="card" {...evidence} rows={matrix} height={340}
  spec={{type:'heatmap',xTickLabelLayout:'angled',reverseRows:true,x:category,y:wer,series,showValues:true,rowHeight:42,showLegend:false,showXAxisLabel:false,showYAxisLabel:false,missingValues:'gap',valueDecimals:1,colorDomain:[0,Math.max(1,...matrix.map(r=>r[wer]))],tooltipFields:[{field:completed,label:completed}]}}
  renderPlot={plot=><ChartFrame plot={plot} lang={lang}/>}>
  {!matrix.length&&<p className="stt-note">{fa?'برای این فیلتر، خروجی قابل امتیازدهی وجود ندارد.':'No scored outputs match these filters.'}</p>}
  <ModelKey models={included} lang={lang} showColors={false}/>
  <p className="stt-note">{fa?'هر خانه: WER یک مدل در یک دسته، بر حسب درصد؛ کمتر بهتر است. نوار رنگی زیر نمودار، مقیاس خطا را نشان می‌دهد. خانهٔ خالی یعنی دادهٔ قابل امتیازدهی وجود ندارد، نه خطای صفر. مقادیر فقط از فایل‌های همین فیلتر محاسبه می‌شوند.':'Each cell is one model’s WER in one category, in percent; lower is better. The color bar below the chart shows the error scale. A blank cell means no scored data, not zero errors. Values use only the recordings in the current filters.'}</p>
 </EvidenceChart>;
}

export function SpeakerErrorChart({evidence,rows,summary,profile,lang='en'}){
 const fa=isFa(lang),model=fa?'مدل':'Model',speaker=fa?'گوینده':'Speaker',wer=fa?'خطای واژه WER (%)':'WER (%)';
 const speakerNames=fa?{boy:'مرد',girl:'زن'}:{boy:'Man',girl:'Woman'};
 const plotted=summary.flatMap(m=>['boy','girl'].map(s=>{
  const a=aggregate(rows.filter(r=>r.model_id===m.id&&r.speaker_id===s),profile);
  return {[model]:label(m),[speaker]:speakerNames[s],[wer]:a.WER,completed:a.completed};
 })).filter(r=>r.completed&&Number.isFinite(r[wer]));
 return <EvidenceChart id="speaker-chart" title={fa?'مقایسهٔ خطای واژهٔ دو گوینده':'Word error by speaker'} variant="card" {...evidence} rows={plotted} height={300}
  spec={{type:'bar',x:model,y:wer,series:speaker,showLegend:true,stackable:false,valueDecimals:1,yLabel:wer,showXAxisLabel:false,colors:{[speakerNames.boy]:'#2563eb',[speakerNames.girl]:'#ec4899'}}}
  renderPlot={plot=><ChartFrame plot={plot} lang={lang} compact/>}> 
  {!plotted.length&&<p className="stt-note">{fa?'برای این فیلتر، نتیجهٔ قابل مقایسه‌ای برای گوینده‌ها وجود ندارد.':'No comparable speaker results match these filters.'}</p>}
  <p className="stt-note">{fa?'هر ستون WER یک مدل برای یک گوینده را نشان می‌دهد؛ ستون کوتاه‌تر بهتر است. این آزمون فقط دو گوینده دارد و برای نتیجه‌گیری دربارهٔ جنسیت کافی نیست.':'Each bar shows one model’s WER for one speaker; a shorter bar is better. This test has only two speakers and cannot support a conclusion about gender.'}</p>
 </EvidenceChart>;
}

export function NormalizationChart({evidence,rows,summary,lang='en'}){
 const fa=isFa(lang),model=fa?'مدل':'Model',profile=fa?'روش امتیازدهی':'Scoring profile',wer=fa?'خطای واژه WER (%)':'WER (%)';
 const names=fa?{raw:'خام',orthography:'نوشتار یکسان',number:'عددآگاه'}:{raw:'Raw',orthography:'Orthography',number:'Number-aware'};
 const plotted=summary.flatMap(m=>Object.keys(names).map(p=>{
  const a=aggregate(rows.filter(r=>r.model_id===m.id),p);
  return {[model]:label(m),[profile]:names[p],[wer]:a.WER,completed:a.completed};
 })).filter(r=>r.completed&&Number.isFinite(r[wer]));
 return <EvidenceChart id="normalization-chart" title={fa?'اثر نرمال‌سازی بر WER':'Normalization effect on WER'} variant="card" {...evidence} rows={plotted} height={300}
  spec={{type:'bar',x:model,y:wer,series:profile,showLegend:true,stackable:false,valueDecimals:1,yLabel:wer,showXAxisLabel:false,colors:{[names.raw]:'#64748b',[names.orthography]:'#0d9488',[names.number]:'#8b5cf6'}}}
  renderPlot={plot=><ChartFrame plot={plot} lang={lang} compact/>}> 
  {!plotted.length&&<p className="stt-note">{fa?'برای این فیلتر، دادهٔ قابل امتیازدهی وجود ندارد.':'No scored data match these filters.'}</p>}
  <p className="stt-note">{fa?'هر گروه، WER یک مدل را پیش و پس از یکسان‌سازی متن نشان می‌دهد؛ ستون کوتاه‌تر بهتر است. تغییر ستون‌ها اثر روش امتیازدهی است و به معنی تغییر خود مدل نیست.':'Each group shows one model’s WER before and after text normalization; a shorter bar is better. The change reflects the scoring method, not a change to the model.'}</p>
 </EvidenceChart>;
}
