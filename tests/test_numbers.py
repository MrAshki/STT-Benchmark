import unittest
from number_profile import transform, numeric_values, evaluate


class NumberTests(unittest.TestCase):
    def test_amount_and_numeric_separators(self):
        text='دوازده هزار و سیصد و چهل و پنج'
        for variant in [text,'۱۲٬۳۴۵','12,345']:
            self.assertEqual(transform(variant,'numbers'),'12345')

    def test_phone_preserves_zero_and_extra_digits(self):
        self.assertEqual(transform('صفر نه سه پنج هشت دو چهار شش هفت یک صفر','numbers'),'09358246710')
        self.assertNotEqual(transform('093558246710','numbers'),'09358246710')

    def test_version_and_spaced_hundreds(self):
        self.assertEqual(transform('نسخه سه ممیز پنج شناسه شش صد و هفت','brackets'),'نسخه 3.5 شناسه 607')
        self.assertEqual(transform('نسخه ۳٫۵','brackets'),'نسخه 3.5')

    def test_no_recognition_repair_or_colloquial_rewrite(self):
        self.assertIn('صرف',transform('صرف نه یک دو','numbers'))
        self.assertIn('نو',transform('صفت نو یک دو','numbers'))
        self.assertEqual(transform('یا نه چون اگه دیر بشه','colloquial'),'یا نه چون اگه دیر بشه')
        self.assertEqual(transform('هفصد و پونصد','numbers'),'1200')

    def test_correct_format_change_scores_zero_wrong_value_does_not(self):
        self.assertEqual(evaluate('مبلغ دوازده هزار و سیصد و چهل و پنج تومان','مبلغ 12,345 تومان','numbers')['WER_pct'],0)
        self.assertGreater(evaluate('صفر نه سه پنج','09355','numbers')['WER_pct'],0)


if __name__=='__main__':
    unittest.main()
