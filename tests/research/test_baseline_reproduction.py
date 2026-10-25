# tests/research/test_baseline_reproduction.py
"""
Test baseline reproduction: Verifies that when all research feature flags are false,
the integration framework reproduces the EXP-0040 hierarchical parent-child retriever.
"""

import unittest
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.retrieval_adapters import get_retriever, EXP0040BaselineAdapter


class TestBaselineReproduction(unittest.TestCase):

    def setUp(self):
        self.dev_cache_path = "scratch/exp0040_dev_p1_cache.json"
        self.dev_dataset_path = "EXP-0025-DEVELOPMENT-DATASET.json"

    def test_default_flag_routing(self):
        # Empty config
        r1 = get_retriever({})
        self.assertIsInstance(r1, EXP0040BaselineAdapter)

        # All flags explicitly false
        all_false_flags = {
            "feature_flags": {
                "ENABLE_BGE_M3": False,
                "ENABLE_BGE_RERANKER_M3": False,
                "ENABLE_QDRANT": False,
                "ENABLE_PYLATE": False,
                "ENABLE_LLAMAINDEX_FUSION": False,
                "ENABLE_HAYSTACK_HIERARCHY": False,
                "ENABLE_CRAG": False,
                "ENABLE_LIGHTRAG": False
            }
        }
        r2 = get_retriever(all_false_flags)
        self.assertIsInstance(r2, EXP0040BaselineAdapter)

    def test_chunk_and_parent_counts(self):
        adapter = EXP0040BaselineAdapter()
        adapter.initialize()
        self.assertEqual(len(adapter.raw_chunks), 76, "Corpus must have exactly 76 C2_085 chunks")
        self.assertEqual(len(adapter.parents), 36, "Hierarchy must have exactly 36 bounded parent groups")
        self.assertEqual(len(adapter.children_dict), 76, "Children dict must have 76 entries")

    def test_reproduction_against_exp0040_cache(self):
        if not os.path.exists(self.dev_cache_path) or not os.path.exists(self.dev_dataset_path):
            self.skipTest("Dev dataset or cache not found")

        dev_cases = json.load(open(self.dev_dataset_path, "r", encoding="utf-8"))
        dev_cache = json.load(open(self.dev_cache_path, "r", encoding="utf-8"))

        adapter = EXP0040BaselineAdapter()
        adapter.initialize()

        # Check sample cases from development dataset
        sample_cases = dev_cases[:10]
        for case in sample_cases:
            cid = case["id"]
            query = case["query"]
            expected_p1 = dev_cache.get(cid)
            if not expected_p1:
                continue

            meta = adapter.retrieve_with_metadata(query, top_k=5)
            retrieved = meta["results"]

            # Top-1 retrieved parent ID must match cached P1 top-1 parent ID
            expected_top1_id = expected_p1[0]["id"]
            actual_top1_id = retrieved[0]["id"]
            self.assertEqual(
                actual_top1_id,
                expected_top1_id,
                f"Mismatch for case {cid}: expected {expected_top1_id}, got {actual_top1_id}"
            )


if __name__ == "__main__":
    unittest.main()
