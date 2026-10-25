# tests/research/test_determinism.py
"""
Determinism test: Verifies that repeated indexing and retrieval calls produce
identical rankings, chunk/parent IDs, and similarity scores.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.retrieval_adapters import (
    EXP0040BaselineAdapter,
    LlamaIndexAdapter,
    QdrantAdapter
)


class TestDeterminism(unittest.TestCase):

    def setUp(self):
        self.queries = [
            "How does flexbox align items along the cross axis?",
            "Can const declarations be reassigned in JavaScript?",
            "What HTTP status code is used for creating a resource?"
        ]

    def test_baseline_retrieval_determinism(self):
        adapter1 = EXP0040BaselineAdapter()
        adapter2 = EXP0040BaselineAdapter()

        for q in self.queries:
            res1 = adapter1.retrieve(q, top_k=5)
            res2 = adapter2.retrieve(q, top_k=5)

            self.assertEqual(len(res1), len(res2))
            for r1, r2 in zip(res1, res2):
                self.assertEqual(r1["id"], r2["id"], f"Non-deterministic parent ID for query: {q}")
                self.assertAlmostEqual(r1["similarity"], r2["similarity"], places=4)
                self.assertEqual(r1["rank"], r2["rank"])

    def test_qdrant_retrieval_determinism(self):
        adapter = QdrantAdapter({"storage_location": ":memory:"})
        adapter.initialize()

        for q in self.queries:
            res1 = adapter.retrieve(q, top_k=3)
            res2 = adapter.retrieve(q, top_k=3)

            for r1, r2 in zip(res1, res2):
                self.assertEqual(r1["id"], r2["id"])
                self.assertAlmostEqual(r1["similarity"], r2["similarity"], places=4)

    def test_llamaindex_expansion_determinism(self):
        adapter = LlamaIndexAdapter({"num_queries": 3})
        for q in self.queries:
            vars1 = adapter._generate_query_variations(q)
            vars2 = adapter._generate_query_variations(q)
            self.assertEqual(vars1, vars2, "Query variations must be strictly deterministic")


if __name__ == "__main__":
    unittest.main()
