# tests/research/test_wave2_llmlingua.py
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.context_processing import LLMLinguaAdapter


class TestWave2LLMLingua(unittest.TestCase):

    def setUp(self):
        self.adapter = LLMLinguaAdapter({"mode": "LLMLingua-2", "target_rate": 0.50, "model_name": "microsoft/llmlingua-2-uninstalled"})
        self.contexts = [
            {
                "id": "PARENT_ea1f3b17_24_00",
                "content": "CSS FLEXBOX LAYOUT GUIDE:\n- display: flex initiates flex formatting context.\n- flex-direction: row or column.\nBasically and essentially furthermore in order to align items use justify-content."
            },
            {
                "id": "PARENT_ea1f3b17_24_01",
                "content": "FLEXBOX ALIGNMENT SPECIFICATIONS:\n- align-items: controls cross axis alignment: flex-start, flex-end, center, stretch.\nObviously this is critical for responsive layouts."
            }
        ]

    def test_neural_compression_error_enforcement(self):
        h = self.adapter.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])

        with self.assertRaises(RuntimeError) as ctx:
            self.adapter.compress(self.contexts, query="justify-content flexbox")
        self.assertIn("not installed", str(ctx.exception).lower())

    def test_disabled_mode_preserves_provenance(self):
        disabled_adapter = LLMLinguaAdapter({"mode": "disabled"})
        h = disabled_adapter.health()
        self.assertEqual(h["status"], "READY")
        self.assertFalse(h["simulation"])

        res = disabled_adapter.compress(self.contexts, query="test")
        self.assertEqual(res["compression_ratio"], 1.0)
        self.assertEqual(res["original_token_count"], res["compressed_token_count"])
        self.assertFalse(res["simulation"])
        self.assertEqual(len(res["preserved_context_ids"]), 2)
        self.assertIn("PARENT_ea1f3b17_24_00", res["preserved_context_ids"])
        self.assertIn("PARENT_ea1f3b17_24_01", res["preserved_context_ids"])
        self.assertIn("display: flex", res["compressed_context"])


if __name__ == "__main__":
    unittest.main()
