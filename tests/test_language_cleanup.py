import unittest

from scripts.clean_alert_language import normalize_text, cleanup_text


class LanguageCleanupTests(unittest.TestCase):
    def test_cleanup_text_repairs_common_errors(self):
        dirty = "The prntr was maintenece..  Please check the hopr."
        cleaned = cleanup_text(dirty)
        self.assertIn("printer", cleaned)
        self.assertIn("maintenance", cleaned)
        self.assertNotIn("maintenece", cleaned)
        self.assertNotIn("hopr", cleaned)
        self.assertNotIn("..", cleaned)
        self.assertTrue(cleaned.endswith("."))

    def test_normalize_text_keeps_abbreviations(self):
        text = "Check the HMI and PSU before rebooting the machine."
        cleaned = normalize_text(text)
        self.assertIn("HMI", cleaned)
        self.assertIn("PSU", cleaned)
        self.assertTrue(cleaned.endswith("."))


if __name__ == "__main__":
    unittest.main()
