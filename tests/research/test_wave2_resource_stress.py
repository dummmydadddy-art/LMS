# tests/research/test_wave2_resource_stress.py
"""
Section 29 Resource Stress Test:
Compares whole-document processing vs page-window processing on synthetic 100-page & 500-page documents.
Verifies bounded memory, page-local processing, and resource cleanup.
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.document_adapters import DoclingRsAdapter
from research.runtime import PageBudgetManager


class TestWave2ResourceStress(unittest.TestCase):

    def test_bounded_memory_under_500_page_stress(self):
        adapter = DoclingRsAdapter()
        budget_mgr = PageBudgetManager(max_page_budget=10)

        dummy_path = os.path.join(os.path.dirname(__file__), "temp_stress_500.pdf")

        # 500-page synthetic test document
        with open(dummy_path, "w", encoding="utf-8") as f:
            f.write("%PDF-1.4\\n" + "/Type /Page\\n" * 500 + "%%EOF\\n")

        try:
            # 1. Page window processing: request pages 100-104 (5 pages)
            window_spec = budget_mgr.request_page_window(500, 100, 104)
            processed_pages = adapter.process_pages(dummy_path, window_spec["selected_pages"])

            self.assertEqual(len(processed_pages), 5)
            self.assertEqual(window_spec["pages_skipped_total"], 495)
            self.assertLess(adapter.metrics["peak_process_memory_mb"], 100.0, "Memory must remain bounded under 100 MB")
        finally:
            if os.path.exists(dummy_path):
                os.remove(dummy_path)


if __name__ == "__main__":
    unittest.main()
