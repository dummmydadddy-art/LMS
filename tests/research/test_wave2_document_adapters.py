# tests/research/test_wave2_document_adapters.py
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.document_adapters import (
    DoclingRsAdapter,
    MarkerAdapter,
    SuryaAdapter,
    SelectiveVisionPolicy,
    get_document_processor
)


class TestWave2DocumentAdapters(unittest.TestCase):

    def setUp(self):
        self.real_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "multipage_curriculum.pdf"))

    def test_docling_rs_adapter(self):
        adapter = DoclingRsAdapter()
        h = adapter.health()
        self.assertEqual(h["status"], "READY")
        self.assertFalse(h["simulation"])
        self.assertTrue(h["streaming_enabled"])

        # Real windowed page processing
        pages = adapter.convert_page_range(self.real_pdf, 1, 2)
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0]["page_number"], 1)
        self.assertEqual(pages[0]["parser"], "docling.rs")
        self.assertFalse(pages[0]["metadata"]["simulation"])
        self.assertIn("reading_order", pages[0]["metadata"])
        self.assertGreater(adapter.metrics["peak_process_memory_mb"], 0)

    def test_marker_adapter(self):
        adapter = MarkerAdapter({"mode": "fast", "disable_ocr": True})
        h = adapter.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])

        with self.assertRaises(RuntimeError) as ctx:
            adapter.process_pages(self.real_pdf, [1, 2])
        self.assertIn("not installed", str(ctx.exception).lower())

    def test_surya_adapter(self):
        adapter = SuryaAdapter({"ocr_batch_size": 2, "device": "cpu"})
        h = adapter.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])

        with self.assertRaises(RuntimeError) as ctx:
            adapter.ocr_pages(self.real_pdf, [1])
        self.assertIn("not installed", str(ctx.exception).lower())

    def test_selective_vision_policy(self):
        policy = SelectiveVisionPolicy(min_char_count=50)

        # Reliable text: should NOT trigger OCR
        reliable_text = "This is a comprehensive standard curriculum section covering CSS Flexbox layout properties and alignment axes."
        needs_ocr, reason, _ = policy.evaluate_page(reliable_text, page_num=1)
        self.assertFalse(needs_ocr)
        self.assertEqual(reason, "text_extraction_reliable")

        # Sparse text: should trigger OCR
        sparse_text = "Img"
        needs_ocr_sparse, reason_sparse, _ = policy.evaluate_page(sparse_text, page_num=2)
        self.assertTrue(needs_ocr_sparse)
        self.assertIn("sparse_text", reason_sparse)


if __name__ == "__main__":
    unittest.main()
