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

    def test_8000_token_context_compression(self):
        adapter = LLMLinguaAdapter({"mode": "LLMLingua-2", "target_rate": 0.50})

        # Generate synthetic 8000-token retrieved context across 10 parents
        synthetic_contexts = []
        base_paragraph = "The curriculum specifies in rigorous detail that flexbox defines alignment along the main and cross axes. " * 8
        for i in range(10):
            pid = f"PARENT_SYNTH_8000_{i:02d}"
            # ~800 tokens per parent
            content = f"HEADING SPECIFICATION UNIT {i}:\n" + (base_paragraph + "\n") * 10
            synthetic_contexts.append({"id": pid, "content": content})

        res = adapter.compress(synthetic_contexts, query="flexbox alignment axes")

        self.assertGreater(res["original_token_count"], 7000, "Context must be approximately 8000 tokens")
        self.assertLess(res["compressed_token_count"], res["original_token_count"])
        self.assertLessEqual(res["compression_ratio"], 0.65)
        self.assertEqual(len(res["preserved_context_ids"]), 10)
        for i in range(10):
            self.assertIn(f"PARENT_SYNTH_8000_{i:02d}", res["preserved_context_ids"])
            self.assertIn(f"Source: PARENT_SYNTH_8000_{i:02d}", res["compressed_context"])


if __name__ == "__main__":
    unittest.main()
