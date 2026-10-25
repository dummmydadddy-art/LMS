# tests/research/test_wave2_page_budget.py
"""
Section 30 Page Window Test:
Example: 500-page document, request pages 201-205.
Expected: pages processed = 5, pages before = skipped (200), pages after = skipped (295).
Automated assertion of key architectural invariant.
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.runtime import PageBudgetManager


class TestWave2PageBudget(unittest.TestCase):

    def test_section_30_page_window_specification(self):
        mgr = PageBudgetManager(max_page_budget=10)
        
        # 500-page document, request pages 201-205
        total_pages = 500
        start_page = 201
        end_page = 205

        record = mgr.request_page_window(total_pages, start_page, end_page)

        self.assertEqual(record["pages_processed"], 5, "Must process exactly 5 pages")
        self.assertEqual(record["pages_skipped_before"], 200, "Must skip exactly 200 pages before window")
        self.assertEqual(record["pages_skipped_after"], 295, "Must skip exactly 295 pages after window")
        self.assertEqual(record["pages_skipped_total"], 495, "Total skipped must be 495 pages")
        self.assertEqual(record["selected_pages"], [201, 202, 203, 204, 205])


if __name__ == "__main__":
    unittest.main()
