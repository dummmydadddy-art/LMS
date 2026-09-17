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
        self.synth_doc = "scratch/test_doc.txt"
        with open(self.synth_doc, "w", encoding="utf-8") as f:
            f.write("Test curriculum document text for streaming document ingestion.")

    def tearDown(self):
        if os.path.exists(self.synth_doc):
            os.remove(self.synth_doc)

    def test_docling_rs_adapter(self):
        adapter = DoclingRsAdapter()
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        self.assertTrue(h["streaming_enabled"])

        # Windowed page processing
        pages = adapter.convert_page_range(self.synth_doc, 1, 3)
        self.assertEqual(len(pages), 3)
        self.assertEqual(pages[0]["page_number"], 1)
        self.assertEqual(pages[0]["parser"], "docling.rs")
        self.assertIn("reading_order", pages[0]["metadata"])

    def test_marker_adapter(self):
        adapter = MarkerAdapter({"mode": "fast", "disable_ocr": True})
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        self.assertEqual(h["mode"], "fast")

        pages = adapter.process_pages(self.synth_doc, [1, 2])
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0]["parser"], "marker")

    def test_surya_adapter(self):
        adapter = SuryaAdapter({"ocr_batch_size": 2, "device": "cpu"})
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        self.assertEqual(h["ocr_batch_size"], 2)

        ocr_out = adapter.ocr_pages(self.synth_doc, [5])
        self.assertEqual(len(ocr_out), 1)
        self.assertEqual(ocr_out[0]["page_number"], 5)
        self.assertGreater(ocr_out[0]["confidence"], 0.8)

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
