# tests/research/test_adapters.py
"""
Unit and functional tests for all 8 research retrieval adapters.
Verifies interface compliance, health, metadata, and invariant validation.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.retrieval_adapters import (
    ResearchRetriever,
    RetrievalResult,
    EXP0040BaselineAdapter,
    BGEFlagAdapter,
    QdrantAdapter,
    PyLateAdapter,
    LlamaIndexAdapter,
    HaystackHierarchyAdapter,
    CRAGAdapter,
    LightRAGAdapter,
    get_retriever,
    ADAPTER_REGISTRY
)


class TestResearchAdapters(unittest.TestCase):

    def setUp(self):
        self.sample_query = "How does flexbox align items along the cross axis?"

    def test_adapter_registry_completeness(self):
        required_keys = ["exp0040", "baseline", "bge_flag", "qdrant", "pylate", "llamaindex", "haystack", "crag", "lightrag"]
        for k in required_keys:
            self.assertIn(k, ADAPTER_REGISTRY, f"Registry missing key: {k}")

    def test_baseline_adapter_contract(self):
        adapter = EXP0040BaselineAdapter()
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        d = adapter.describe()
        self.assertEqual(d["name"], "EXP0040BaselineAdapter")
        self.assertTrue(d["frozen"])

        adapter.initialize()
        self.assertEqual(len(adapter.parents), 36, "Baseline must assemble exactly 36 bounded parents")
        self.assertEqual(len(adapter.children_dict), 76, "Baseline must index exactly 76 child chunks")
        self.assertTrue(adapter.validate_hierarchical_invariants())

        # Test retrieval
        meta = adapter.retrieve_with_metadata(self.sample_query, top_k=3)
        self.assertEqual(len(meta["results"]), 3)
        self.assertIn("latency_ms", meta)
        self.assertGreater(meta["results"][0]["similarity"], 0.0)

    def test_bge_flag_adapter_contract(self):
        adapter = BGEFlagAdapter({"mode": "reranker"})
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        d = adapter.describe()
        self.assertEqual(d["name"], "BGEFlagAdapter")
        self.assertIn("reranker", d["modes_supported"])
        adapter.clear_memory()

    def test_qdrant_adapter_contract(self):
        adapter = QdrantAdapter({"storage_location": ":memory:"})
        adapter.initialize()
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        self.assertGreater(h["points_count"], 0)

        meta = adapter.retrieve_with_metadata(self.sample_query, top_k=3)
        self.assertEqual(len(meta["results"]), 3)

    def test_pylate_adapter_contract(self):
        adapter = PyLateAdapter()
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        d = adapter.describe()
        self.assertEqual(d["name"], "PyLateAdapter")

    def test_llamaindex_adapter_contract(self):
        adapter = LlamaIndexAdapter({"num_queries": 3})
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        d = adapter.describe()
        self.assertEqual(d["name"], "LlamaIndexAdapter")

        meta = adapter.retrieve_with_metadata(self.sample_query, top_k=3)
        self.assertEqual(len(meta["results"]), 3)
        self.assertIn("generated_queries", meta["metadata"])
        self.assertEqual(len(meta["metadata"]["generated_queries"]), 3)

    def test_haystack_adapter_contract(self):
        adapter = HaystackHierarchyAdapter()
        adapter.initialize()
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        
        comp = adapter.compare_with_exp0040()
        self.assertEqual(comp["status"], "EXP-0040-H_COMPARATOR_VALID")
        self.assertEqual(comp["cross_document_contamination"], 0)
        self.assertEqual(comp["cross_section_contamination"], 0)

    def test_crag_adapter_contract(self):
        adapter = CRAGAdapter({"upper_threshold": 0.65, "lower_threshold": 0.40})
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        self.assertFalse(h["web_search_enabled"], "CRAG must NOT have web search enabled")

        meta = adapter.retrieve_with_metadata(self.sample_query, top_k=3)
        self.assertEqual(len(meta["results"]), 3)
        self.assertIn(meta["metadata"]["decision"], ["CORRECT", "AMBIGUOUS", "INCORRECT"])

    def test_lightrag_adapter_contract(self):
        adapter = LightRAGAdapter({"working_dir": "research/data/test_lightrag"})
        adapter.initialize()
        h = adapter.health()
        self.assertEqual(h["status"], "ok")
        self.assertGreater(h["entity_count"], 0)

        meta = adapter.retrieve_with_metadata(self.sample_query, top_k=3)
        self.assertEqual(len(meta["results"]), 3)


if __name__ == "__main__":
    unittest.main()
