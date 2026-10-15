import unittest

from benchlib import score, normalize, summarize
from reporting import md_to_html, validate_agent


class EvaluationTests(unittest.TestCase):
    def test_empty_prediction_is_deletions(self):
        block = score('سلام دنیا', '')['raw']
        self.assertEqual((block['D'], block['N'], block['WER_pct']), (2, 2, 100))

    def test_insertions_can_exceed_one_hundred_percent(self):
        self.assertEqual(score('سلام', 'الف ب ج')['raw']['WER_pct'], 300)

    def test_normalization_does_not_rewrite_meaning(self):
        self.assertEqual(normalize('علي كاظمي ۷۳'), 'علی کاظمی 73')
        self.assertNotEqual(normalize('هفتاد و سه'), normalize('۷۳'))
        self.assertNotEqual(normalize('می‌خوام'), normalize('می‌خواهم'))
        self.assertEqual(score('می‌خوام', 'می خوام')['normalized']['WER_pct'], 0)

    def test_weighted_corpus_and_failure_coverage(self):
        rows = []
        for model in ['a','b']:
            for id_, ref, hyp in [('short','الف','ب'),('long','یک دو سه چهار پنج شش هفت هشت نه','یک دو سه چهار پنج شش هفت هشت نه')]:
                rows.append(dict(model_id=model,id=id_,status='ok',category='test',speaker_id='one',duration_s=1,inference_s=.1,scores=score(ref,hyp)))
        rows[3] = {**rows[3], 'status':'error'}
        result = summarize(rows,['a','b'])
        self.assertAlmostEqual(result['overall'][0]['raw']['WER_pct'], 10)
        self.assertEqual(result['overall'][1]['coverage_pct'], 50)
        self.assertEqual(result['common_file_ids'], ['short'])

    def test_generated_html_cannot_run_script(self):
        output = md_to_html('<script>alert(1)</script><img src=x onerror=alert(2)>')
        self.assertNotIn('<script',output)
        self.assertNotIn('<img',output)

    def test_unmeasured_numeric_claims_are_rejected(self):
        facts = {'model.x.name':'Example', 'overall.x.all.normalized.WER_pct':'10.000'}
        summary = ('The model has measured results on this small sample. '*8) + '{{F:model.x.name}}'
        report = '## Results\n| Model | WER |\n|---|---|\n| {{F:model.x.name}} | {{F:overall.x.all.normalized.WER_pct}} |\n' + ('The sample supports a limited comparison. '*70)
        validate_agent({'summary':summary,'report_markdown':report}, facts)
        with self.assertRaises(ValueError):
            validate_agent({'summary':summary,'report_markdown':report+' Accuracy is 99.99 percent.'}, facts)
        with self.assertRaises(ValueError):
            validate_agent({'summary':summary,'report_markdown':report+' {{F:invented.value}}'}, facts)


if __name__ == '__main__':
    unittest.main()
