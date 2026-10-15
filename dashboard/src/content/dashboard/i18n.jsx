import React from 'react';
export const fa={
'Models ·':'مدل‌ها ·','Processing time (s)':'زمان پردازش (ثانیه)','Reference and model outputs':'مرجع و خروجی مدل‌ها','Substitutions replace reference words. Deletions omit reference words. Insertions add words absent from the reference.':'جایگزینی: واژهٔ مدل با مرجع فرق دارد. حذف: واژه‌ای از مرجع در خروجی نیست. افزوده: واژه‌ای در خروجی هست که در مرجع نیست.','Overview':'نمای کلی','Data exploration':'کاوش داده‌ها','Transcripts':'بررسی متن‌ها','Data assistant':'دستیار داده',
'Models':'مدل‌ها','Category':'دستهٔ آزمون','Speaker':'گوینده','Both speakers':'هر دو گوینده','All categories':'همهٔ دسته‌ها','Reset':'نمایش همهٔ داده‌ها','Export CSV':'دریافت داده‌های این نما (CSV)','Full report ↗':'گزارش کامل انگلیسی ↗',
'Benchmark controls':'کنترل‌های بنچمارک',
'Numbers':'اعداد','Email addresses':'نشانی ایمیل','Brackets':'پرانتز و آکولاد','Difficult words':'واژه‌های دشوار','Colloquial speech':'گفتار محاوره‌ای',
'Scoring profile':'روش امتیازدهی','Raw':'بدون یکسان‌سازی','Orthography':'نوشتار یکسان','Number-aware':'نوشتار و اعداد یکسان','Lower WER and CER are better.':'WER و CER کمتر، بهتر است.','↓ Lower is better':'↓ مقدار کمتر، بهتر است','Lower WER and CER mean fewer transcription errors.':'WER و CER کمتر یعنی خطای رونویسی کمتر.',
'Numbers and spoken number words use a common form in number and bracket tests. Email and colloquial wording are not rewritten.':'در آزمون اعداد و نشانه‌ها، عدد رقمی و عدد نوشتاری به شکل مشترک تبدیل می‌شوند. عبارت‌های ایمیل و محاوره بازنویسی نمی‌شوند.',
'Persian letter forms, digit glyphs, spacing and punctuation use a common form. Spoken numbers remain words.':'شکل حروف فارسی، شکل رقم‌ها، فاصله و نشانه‌گذاری یکسان می‌شود. عدد نوشتاری همچنان به صورت واژه باقی می‌ماند.',
'Raw text comparison uses whitespace tokenization.':'در متن خام، مرز واژه‌ها با فاصله مشخص می‌شود.',
' Each profile changes the reference word count. A change in WER between profiles is not a model improvement.':' هر روش می‌تواند تعداد واژه‌های مرجع را تغییر دهد. تغییر WER بین دو روش به معنی بهتر شدن مدل نیست.',
'Recordings':'فایل‌های صوتی','Distinct recordings in this view.':'تعداد فایل‌های صوتی یکتا در نمای فعلی.','Audio duration':'مدت صوت','Each recording is counted once.':'زمان هر فایل صوتی فقط یک بار شمرده می‌شود.',
'Completed outputs':'خروجی‌های کامل','Missing and failed outputs are excluded from WER.':'خروجی غایب یا ناموفق در محاسبهٔ WER وارد نمی‌شود.','Lowest WER':'کمترین خطای واژه','No scored outputs':'خروجی قابل امتیازدهی وجود ندارد',
'Speed and accuracy':'سرعت و دقت','Lower and farther left is better. Time excludes model loading and warmup. CPU and GPU results describe this system.':'نقطهٔ پایین‌تر و چپ‌تر بهتر است. زمان بارگذاری و گرم‌کردن مدل حساب نشده است. نتایج CPU و GPU مربوط به همین سیستم هستند.',
'Error by test category':'خطا در هر دستهٔ آزمون','Weighted WER (%). Each category has four recordings in the full dataset.':'WER با وزن تعداد واژه‌های مرجع، بر حسب درصد. هر دسته در مجموعهٔ کامل چهار فایل صوتی دارد.',
'Model comparison':'مقایسهٔ مدل‌ها','Model':'مدل','WER (%)':'خطای واژه WER (%)','CER (%)':'خطای نویسه CER (%)','Exact':'متن‌های کاملاً برابر','Time (s)':'زمان (ثانیه)','RTF':'زمان پردازش ÷ مدت صوت',
'Saved meaning review':'حفظ معنا؛ نظر ارزیاب','Codex text review · single reviewer · no audio review. This is separate from WER.':'ارزیابی متنی Codex، با یک ارزیاب و بدون شنیدن صوت انجام شده است. این نظرها از WER جدا هستند.',
'Full':'حفظ کامل','Partial':'حفظ نسبی','Critical':'تغییر مهم','Reviewed':'ارزیابی‌شده','Full: material facts preserved. Partial: local errors. Critical: key facts lost or changed. No labels means no assessed score.':'حفظ کامل: اطلاعات اصلی حفظ شده‌اند. حفظ نسبی: بخشی از متن خطا دارد. تغییر مهم: اطلاعات کلیدی حذف یا عوض شده‌اند. بدون برچسب یعنی ارزیابی انجام نشده است.',
'A small paired test: two people read the same prompts. Speaker differences cannot establish a gender effect.':'این آزمون کوچک است: دو نفر متن‌های یکسان را خوانده‌اند. تفاوت نتایج این دو نفر، اثر جنسیت را ثابت نمی‌کند.',
'Coverage and checks':'پوشش و بررسی داده','Unique recording / model pairs':'زوج‌های یکتای فایل و مدل','Missing or failed outputs':'خروجی‌های غایب یا ناموفق','Text changed across repeats':'خروجی با متن متفاوت بین تکرارها','Reference words (':'واژه‌های مرجع (','Semantic review coverage':'پوشش ارزیابی معنا',
'Normalization sensitivity':'مقایسهٔ روش‌های امتیازدهی','Normalization sensitivity chart':'نمودار اثر نرمال‌سازی','Raw WER (%)':'WER متن خام (%)','Orthography WER (%)':'WER نوشتار یکسان (%)','Number-aware WER (%)':'WER اعداد یکسان (%)','Combined normalization effect (pp)':'اثر کلی نرمال‌سازی (واحد درصد)',
'The combined effect is raw WER minus number-aware WER, in percentage points. A positive value means normalization reduced the measured error. WER uses a different reference-word denominator after each transform.':'اثر کلی برابر است با WER متن خام منهای WER عددآگاه، بر حسب واحد درصد. مقدار مثبت یعنی نرمال‌سازی خطای اندازه‌گیری‌شده را کاهش داده است. تعداد واژه‌های مرجع در هر روش می‌تواند فرق کند.',
'The combined effect is raw WER minus number-aware WER, in percentage points. This is a scoring effect, not a model change. The current profile does not rewrite email or colloquial wording, and each transform can change the reference-word denominator.':'اثر کلی برابر است با WER متن خام منهای WER عددآگاه، بر حسب واحد درصد. این تفاوت از روش امتیازدهی می‌آید و خود مدل عوض نشده است. پروفایل فعلی عبارت‌های ایمیل و محاوره را بازنویسی نمی‌کند و هر تبدیل می‌تواند تعداد واژه‌های مرجع را تغییر دهد.',
'WER = 100 × (substitutions + deletions + insertions) / reference words. Ratios use a different denominator after each transform.':'WER برابر است با صد ضرب‌در مجموع جایگزینی، حذف و افزوده، تقسیم بر تعداد واژه‌های مرجع. مخرج این نسبت بعد از هر تبدیل ممکن است عوض شود.',
'Results by speaker':'نتایج هر گوینده','Speaker WER comparison':'نمودار نتایج هر گوینده','Files':'فایل','Sub.':'جایگزینی','Del.':'حذف','Ins.':'افزوده','Colloquial style review':'ارزیابی لحن محاوره‌ای',
'Saved labels for colloquial recordings only. A retained style does not imply correct meaning.':'این برچسب‌های ذخیره‌شده فقط مربوط به فایل‌های محاوره‌ای هستند. حفظ لحن به معنی درست بودن معنا نیست.','Per-output labels':'برچسب هر خروجی',
'Numeric value preservation':'حفظ مقدار عددی','Number tests only. Compare parsed number values, including leading zeroes. This ignores surrounding sentence errors and complements WER.':'فقط آزمون اعداد: مقدار استخراج‌شدهٔ عدد با مرجع مقایسه می‌شود و صفر ابتدای عدد حفظ می‌شود. این سنجه، خطاهای باقی جمله را حساب نمی‌کند و در کنار WER قرار می‌گیرد.',
'Correct value':'مقدار درست','Assessed recordings':'فایل‌های بررسی‌شده','Outputs to inspect':'بررسی خروجی هر فایل','Recording':'فایل صوتی','Saved review':'نظر ذخیره‌شده','Inspect transcript':'بررسی متن',
'Open the file-level results table.':'نمایش جدول نتیجهٔ هر فایل.','File-level results':'نتایج تفصیلی فایل‌ها','Open the reference and model outputs.':'نمایش متن مرجع و خروجی مدل‌ها.',
'Explain this view':'توضیح نمای فعلی','Local mode uses computed facts. OpenRouter mode sends the filtered benchmark evidence and recent messages to the configured model. No database is required.':'راهنمای محلی از محاسبات همین نما استفاده می‌کند. در حالت OpenRouter، داده‌های فیلترشده و پیام‌های اخیر به مدل ارسال می‌شوند. دیتابیس لازم نیست.',
' Use OpenRouter · deepseek/deepseek-v4-pro':' استفاده از OpenRouter · deepseek/deepseek-v4-pro','You':'شما','Local data guide':'راهنمای محلی داده','Question about benchmark':'پرسش دربارهٔ بنچمارک','Ask about accuracy, speed, meaning or style…':'دربارهٔ دقت، سرعت، معنا یا لحن بپرسید…','Working…':'در حال بررسی…','Ask':'بپرس',
'retained':'محاوره حفظ شده','mixed':'ترکیبی از رسمی و محاوره','formalized':'رسمی شده','not_reviewed':'ارزیابی نشده',
'Compare transcripts':'مقایسهٔ متن‌ها','Choose a recording, then compare its confirmed reference with each model output.':'یک فایل را انتخاب کنید. سپس متن مرجع تأییدشده را با خروجی هر مدل مقایسه کنید.',
'Confirmed spoken reference':'متن مرجع تأییدشده','This is the spoken script used as the answer key.':'این متنِ خوانده‌شده، مبنای محاسبهٔ خطا است.','Model output · unchanged':'خروجی مدل · بدون تغییر',
'Word errors':'خطاهای واژه','Substitutions (S)':'جایگزینی (S)','Deletions (D)':'حذف از مرجع (D)','Insertions (I)':'افزوده به خروجی (I)','Reference words (N)':'واژه‌های مرجع (N)',
'A substitution replaces reference words. A deletion leaves reference words out. An insertion adds words that are absent from the reference.':'جایگزینی یعنی مدل به‌جای واژه‌های مرجع، واژهٔ دیگری نوشته است. حذف یعنی بخشی از مرجع در خروجی نیست. افزوده یعنی واژه‌ای در خروجی آمده که در مرجع نیست.',
'How this WER was calculated':'روش محاسبهٔ WER این خروجی','Reference text used for scoring':'متن مرجع پس از تبدیل انتخاب‌شده','Model text used for scoring':'خروجی مدل پس از تبدیل انتخاب‌شده','Show scoring text and error details':'نمایش متن امتیازدهی و جزئیات خطاها',
'Error group':'گروه خطا','Error type':'نوع خطا','Expected in reference':'بخش مورد انتظار در مرجع','Written by model':'بخش نوشته‌شده توسط مدل','Substitution':'جایگزینی','Deletion':'حذف','Insertion':'افزوده','Absent':'وجود ندارد','No word errors under this scoring profile.':'در روش انتخاب‌شده، خطای واژه وجود ندارد.',
'Groups can contain several words. They follow the minimum word-edit alignment; they do not prove an acoustic error.':'هر گروه ممکن است چند واژه داشته باشد. این تطبیق بر پایهٔ کمترین ویرایش واژه است و به‌تنهایی خطای شنیدن را ثابت نمی‌کند.',
'Saved qualitative review':'ارزیابی کیفی ذخیره‌شده','Meaning':'معنا','Style':'لحن','Fully preserved':'حفظ کامل','Partly preserved':'حفظ نسبی','Key information changed':'تغییر اطلاعات کلیدی','Not reviewed':'ارزیابی نشده',
'Single Codex text review. This is an opinion, separate from computed WER.':'نظر متنی یک ارزیاب Codex است و از WER محاسباتی جدا است.','Original English note':'متن اصلی انگلیسیِ نظر','Audio playback is not available.':'پخش صوت در دسترس نیست.',
'The raw output above is unchanged. The selected scoring profile only changes the text used for scoring.':'خروجی خام بالا تغییری نکرده است. روش انتخاب‌شده فقط متن مورد استفاده برای محاسبهٔ امتیاز را تغییر می‌دهد.',
'Profile':'روش امتیازدهی','Scoring legend':'راهنمای خطاها','Show reference and model text':'نمایش متن مرجع و مدل','Error details':'جزئیات خطاها'
};
export function tr(s,lang){if(lang!=='fa'||typeof s!=='string')return s;if(fa[s]!=null)return fa[s];const clean=s.trim();return fa[clean]!=null?s.replace(clean,fa[clean]):s;}
// Localize authored content only. Shared runtime and source rows stay unchanged.
export function localize(node,lang){
 if(lang!=='fa')return node;
 if(typeof node==='string')return tr(node,lang);
 if(Array.isArray(node))return node.map(n=>localize(n,lang));
 if(!React.isValidElement(node))return node;
 const p={};for(const key of ['title','label','placeholder','aria-label','caption'])if(typeof node.props[key]==='string')p[key]=tr(node.props[key],lang);
 for(const key of ['columns','sections'])if(Array.isArray(node.props[key]))p[key]=node.props[key].map(c=>({...c,label:tr(c.label,lang)}));
 if(node.props.children!==undefined)p.children=localize(node.props.children,lang);
 return React.cloneElement(node,p);
}
