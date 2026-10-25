# tests/research/test_production_clean.py
"""
Production repository protection test.
Verifies that EduConnect-LMS-Production remains untouched at HEAD 176883227602671b545e061dacf228aedc3271a5
and that no research files or experimental commits have leaked into production.
"""

import unittest
import subprocess
import os

PROD_REPO = "D:/Collage project/EduConnect-LMS-Production"
EXPECTED_PROD_HEAD = "176883227602671b545e061dacf228aedc3271a5"


class TestProductionClean(unittest.TestCase):

    def test_production_head(self):
        if not os.path.exists(PROD_REPO):
            self.skipTest("Production repository not found at specified path")

        res = subprocess.run(
            ["git", "-C", PROD_REPO, "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True
        )
        prod_head = res.stdout.strip()
        self.assertEqual(
            prod_head,
            EXPECTED_PROD_HEAD,
            f"Production repository HEAD mismatch! Expected {EXPECTED_PROD_HEAD}, got {prod_head}"
        )

    def test_production_no_research_leaks(self):
        if not os.path.exists(PROD_REPO):
            self.skipTest("Production repository not found at specified path")

        # Check that research directory does NOT exist in production
        prod_research_dir = os.path.join(PROD_REPO, "research")
        self.assertFalse(
            os.path.exists(prod_research_dir),
            "Research directory has leaked into production repository!"
        )

        # Check git status for any research files
        res = subprocess.run(
            ["git", "-C", PROD_REPO, "status", "--short"],
            capture_output=True,
            text=True,
            check=True
        )
        status_out = res.stdout
        self.assertNotIn("research/", status_out)
        self.assertNotIn("EXP-", status_out)


if __name__ == "__main__":
    unittest.main()
