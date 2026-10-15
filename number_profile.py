"""Persian numeric equivalence profile. It does not repair recognition errors."""
import re
from benchlib import normalize, score

VALUES = dict(zip('صفر یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده سیزده چهارده پانزده شانزده هفده هجده نوزده'.split(),range(20)))
VALUES.update({'بیست':20,'سی':30,'چهل':40,'پنجاه':50,'شصت':60,'هفتاد':70,'هشتاد':80,'نود':90,
               'صد':100,'یکصد':100,'دویست':200,'سیصد':300,'چهارصد':400,'پانصد':500,'ششصد':600,
               'هفتصد':700,'هشتصد':800,'نهصد':900,'شیش':6,'چار':4,'چارصد':400,'پونصد':500,'هفصد':700})
SCALES = {'هزار':1000,'میلیون':1000000,'میلیارد':1000000000}
DESCRIPTION = {'id':'persian-numeric-equivalence-v1','status':'Exploratory, added after inspection of the first run.',
 'scope':'Number equivalence applied to the numbers and brackets categories only. Other categories retain orthography-v1.',
 'supported':'Nonnegative integers to billions; spoken decimal fractions; consecutive single-digit dictation; numeric thousands separators.',
 'aliases':{'شیش':6,'چار':4,'چارصد':400,'پونصد':500,'هفصد':700,'یکصد':100},
 'no_repairs':'No conversion of صرف, صف, صفت, نو, سد or هفته to intended number words. Leading zeroes are significant.',
 'meaning':'A deterministic text score, not proof that a recording was correctly understood.',
 'spacing':'Original orthography-v1 rules are retained. Joined-versus-spaced words can still differ.'}


def cardinal(tokens):
    items = [t for t in tokens if t != 'و']
    if len(items)>1 and 'و' not in tokens and all(t in VALUES and VALUES[t]<10 for t in items):
        return ''.join(str(VALUES[t]) for t in items)
    total = current = 0
    previous = None
    for token in items:
        if token in SCALES:
            total += (current or 1)*SCALES[token]; current = 0
        else:
            value = VALUES[token]
            if token == 'صد' and previous in VALUES and VALUES[previous] in range(1,10):
                current = current-VALUES[previous]+VALUES[previous]*100
            else:
                current += value
        previous = token
    return str(total+current)


def transform(text, category):
    if category not in {'numbers','brackets'}:
        return normalize(text)
    text = text.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'))
    saved = {}
    def protect(match):
        original = match.group(0)
        pieces = re.split(r'[.,٬٫]',original)
        if len(pieces)>=3 and len(pieces[0])<=3 and all(len(p)==3 for p in pieces[1:]):
            value = ''.join(pieces)
        elif '٬' in original or (',' in original and len(pieces[-1])==3):
            value = ''.join(pieces)
        else:
            value = original.replace('٫','.').replace(',','.')
        token = 'zznumericplaceholder'+chr(97+len(saved))+'zz'
        saved[token] = value
        return token
    text = re.sub(r'(?<!\w)[0-9]+(?:[.,٬٫][0-9]+)*(?!\w)',protect,text)
    tokens = normalize(text).split()
    out, i = [], 0
    def span(start):
        end = start
        while end < len(tokens):
            if tokens[end] in VALUES or tokens[end] in SCALES:
                end += 1
            elif tokens[end] == 'و' and end+1<len(tokens) and (tokens[end+1] in VALUES or tokens[end+1] in SCALES):
                end += 1
            else:
                break
        return end
    while i<len(tokens):
        if tokens[i] in VALUES or tokens[i] in SCALES:
            j = span(i)
            number = cardinal(tokens[i:j])
            if j<len(tokens) and tokens[j]=='ممیز' and j+1<len(tokens) and tokens[j+1] in VALUES:
                k = span(j+1)
                number += '.'+cardinal(tokens[j+1:k]); j=k
            out.append(number); i=j
        else:
            out.append(saved.get(tokens[i],tokens[i])); i+=1
    return ' '.join(out)


def evaluate(reference, prediction, category):
    # Raw scoring here preserves canonical decimal punctuation. It does not normalize a second time.
    return score(transform(reference,category),transform(prediction,category))['raw']


def numeric_values(text, category):
    return re.findall(r'(?<!\w)[0-9]+(?:\.[0-9]+)?(?!\w)',transform(text,category))
