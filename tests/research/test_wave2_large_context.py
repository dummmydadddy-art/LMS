# tests/research/test_wave2_large_context.py
"""
Section 31 Large-Context Test:
Synthetic retrieved context = 8000 tokens.
LLMLingua compression: original tokens recorded, compressed tokens recorded,
compression ratio recorded, source provenance retained.
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.context_processing import LLMLinguaAdapter


class TestWave2LargeContext(unittest.TestCase):

    def test_8000_token_context_large_context_handling(self):
        # Generate 8000-token retrieved context across 10 parents
        synthetic_contexts = []
        base_paragraph = "The curriculum specifies in rigorous detail that flexbox defines alignment along the main and cross axes. " * 8
        for i in range(10):
            pid = f"PARENT_SYNTH_8000_{i:02d}"
            content = f"HEADING SPECIFICATION UNIT {i}:\n" + (base_paragraph + "\n") * 10
            synthetic_contexts.append({"id": pid, "content": content})

        # 1. Neural mode without installation: must fail cleanly without simulation
        neural_adapter = LLMLinguaAdapter({"mode": "LLMLingua-2", "target_rate": 0.50, "model_name": "microsoft/llmlingua-2-uninstalled"})
        self.assertEqual(neural_adapter.health()["status"], "NOT_READY")
        self.assertFalse(neural_adapter.health()["simulation"])
        with self.assertRaises(RuntimeError) as ctx:
            neural_adapter.compress(synthetic_contexts, query="flexbox alignment axes")
        self.assertIn("not installed", str(ctx.exception).lower())

        # 2. Disabled baseline mode: must preserve entire context and provenance
        disabled_adapter = LLMLinguaAdapter({"mode": "disabled"})
        res = disabled_adapter.compress(synthetic_contexts, query="flexbox alignment axes")

        self.assertGreater(res["original_token_count"], 7000, "Context must be approximately 8000 tokens")
        self.assertEqual(res["compressed_token_count"], res["original_token_count"])
        self.assertEqual(res["compression_ratio"], 1.0)
        self.assertFalse(res["simulation"])
        self.assertEqual(len(res["preserved_context_ids"]), 10)
        for i in range(10):
            self.assertIn(f"PARENT_SYNTH_8000_{i:02d}", res["preserved_context_ids"])


if __name__ == "__main__":
    unittest.main()
