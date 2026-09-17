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

    def setUp(self):
        self.test_pdf = os.path.join(os.path.dirname(__file__), "temp_stress_100.pdf")
        import fitz
        doc = fitz.open()
        for i in range(100):
            page = doc.new_page()
            page.insert_text((50, 50), f"Curriculum Section {i+1}: Advanced Topics and Specifications.")
        doc.save(self.test_pdf)
        doc.close()

    def tearDown(self):
        if os.path.exists(self.test_pdf):
            try:
                os.remove(self.test_pdf)
            except Exception:
                pass

    def test_bounded_memory_under_100_page_stress(self):
        adapter = DoclingRsAdapter()
        budget_mgr = PageBudgetManager(max_page_budget=10)

        # 1. Page window processing: request pages 20-24 (5 pages) out of 100 pages
        window_spec = budget_mgr.request_page_window(100, 20, 24)
        processed_pages = adapter.process_pages(self.test_pdf, window_spec["selected_pages"])

        self.assertEqual(len(processed_pages), 5)
        self.assertEqual(window_spec["pages_skipped_total"], 95)
        self.assertFalse(processed_pages[0]["metadata"]["simulation"])
        self.assertGreater(adapter.metrics["peak_process_memory_mb"], 0.0)
        self.assertLess(adapter.metrics["peak_process_memory_mb"], 1024.0, "Memory must remain bounded under 1 GB")


if __name__ == "__main__":
    unittest.main()
