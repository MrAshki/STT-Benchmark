import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from benchlib import ROOT, dump, score, summarize
from reporting import agent_report


class ReportFlowTests(unittest.TestCase):
    def test_one_request_writes_summary_full_report_and_download_link(self):
        attempt = dict(model_id='test',id='clip',status='ok',category='custom',speaker_id='speaker',
                       prompt_id='prompt',duration_s=1,inference_s=.1,reference='سلام',prediction='سلام',
                       repeat_seconds=[.1],repeat_agreement=True,scores=score('سلام','سلام'))
        evidence = {'models':[{'id':'test','name':'Test model'}],'dataset':[{'id':'clip','prompt_id':'prompt','speaker_id':'speaker',
                    'reference':'سلام','duration_s':1,'source_sha256':'example'}],'attempts':[attempt],
                    'metrics':summarize([attempt],['test']), 'environment':{},'evaluation':{},'normalization':{},
                    'engines':{},'limitations':['This is a unit test, not a benchmark result.']}
        generated = {'summary':('This is a test report for {{F:model.test.name}} on the supplied recording. '
                    'The measured word error rate is {{F:overall.test.all.normalized.WER_pct}} percent. '
                    'The sample is too small to support a general accuracy claim.'),
                    'report_markdown':'## Measured comparison\n| Model | WER |\n|---|---|\n| {{F:model.test.name}} | {{F:overall.test.all.normalized.WER_pct}} |\n\n' + ('The measured result applies only to the supplied sample and the recorded engine settings. '*30)}
        reply = Mock()
        reply.json.return_value = {'id':'test-only','usage':{},'choices':[{'finish_reason':'stop','message':{'content':json.dumps(generated)}}]}
        scratch = (ROOT / '.cache' / 'tests').resolve()
        self.assertTrue(scratch.is_relative_to(ROOT.resolve()))
        scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as directory, patch.dict('os.environ',{'OPENROUTER_API_KEY':'unit-test-not-a-real-key'}), patch('reporting.requests.post',return_value=reply) as api:
            run = Path(directory)
            dump(run / 'evidence.json',evidence)
            agent_report(run)
            api.assert_called_once()
            self.assertIn('Download Full Report',(run / 'index.html').read_text(encoding='utf-8'))
            self.assertIn('Original output',(run / 'report.html').read_text(encoding='utf-8'))
            self.assertNotIn('{{F:',(run / 'report.md').read_text(encoding='utf-8'))
            self.assertEqual(json.loads((run / 'agent-status.json').read_text())['status'],'complete')


if __name__ == '__main__':
    unittest.main()
