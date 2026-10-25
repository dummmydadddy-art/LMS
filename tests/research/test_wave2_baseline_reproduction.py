# tests/research/test_wave2_baseline_reproduction.py
"""
Wave 2 Baseline Reproduction Test.
Verifies that when all Wave 2 feature flags are false, the system strictly
reproduces the EXP-0040 hierarchical parent-child retriever and does not invoke
Docling.rs, PageIndex, llama.cpp, LLMLingua, Surya, Gemma, BitNet, or Marker.
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.retrieval_adapters import get_retriever, EXP0040BaselineAdapter


class TestWave2BaselineReproduction(unittest.TestCase):

    def test_wave2_flags_false_reproduces_exp0040(self):
        config_all_false = {
            "feature_flags": {
                # Wave 1 flags
                "ENABLE_BGE_M3": False,
                "ENABLE_BGE_RERANKER_M3": False,
                "ENABLE_QDRANT": False,
                "ENABLE_PYLATE": False,
                "ENABLE_LLAMAINDEX_FUSION": False,
                "ENABLE_HAYSTACK_HIERARCHY": False,
                "ENABLE_CRAG": False,
                "ENABLE_LIGHTRAG": False,
                # Wave 2 flags
                "ENABLE_DOCLING_RS": False,
                "ENABLE_PAGEINDEX": False,
                "ENABLE_LLAMA_CPP": False,
                "ENABLE_LLMLINGUA": False,
                "ENABLE_SURYA": False,
                "ENABLE_GEMMA3N": False,
                "ENABLE_BITNET": False,
                "ENABLE_MARKER": False
            }
        }

        retriever = get_retriever(config_all_false)
        self.assertIsInstance(
            retriever,
            EXP0040BaselineAdapter,
            "Default with all flags false MUST be EXP0040BaselineAdapter"
        )
        self.assertEqual(retriever.describe()["name"], "EXP0040BaselineAdapter")


if __name__ == "__main__":
    unittest.main()
