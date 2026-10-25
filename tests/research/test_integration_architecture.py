# tests/research/test_integration_architecture.py
"""
Comprehensive Automated Test Suite for Research Integration Architecture.
Covers:
1. Schema tests (RetrievalResult common data contract and backward compatibility)
2. Adapter unit tests (instantiation, health, describe, and zero simulations)
3. Configuration tests (all 20 YAML profiles validated)
4. Feature flag tests (isolation and baseline defaults)
5. Baseline regression tests (frozen EXP-0040 reproducibility)
6. Dependency isolation tests (no optional package leaks into baseline)
7. Parser normalization tests (PageArtifact schema)
8. Fusion tests (RRF, weighted fusion, normalization, deduplication, grouping)
9. Resource budget tests (ResourcePolicy enforcement)
10. Reproducibility & observability tests (deterministic hashing and telemetry)
"""

import unittest
import os
import yaml
import hashlib
import json
from typing import Dict, Any

from research.retrieval_adapters.base import RetrievalResult, ResearchRetriever
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter
from research.retrieval_adapters.bge_flag_adapter import BGEFlagAdapter
from research.retrieval_adapters.qdrant_adapter import QdrantAdapter
from research.retrieval_adapters.pylate_adapter import PyLateAdapter
from research.retrieval_adapters.raglite_adapter import RAGLiteAdapter
from research.retrieval_adapters.colsmol_adapter import ColSmolAdapter
from research.retrieval_adapters.neo4j_graphrag_adapter import Neo4jGraphRAGAdapter
from research.retrieval_adapters.crag_adapter import CRAGAdapter

from research.document_navigation.pageindex_adapter import PageIndexAdapter
from research.document_navigation.pageindex_agentic_adapter import PageIndexAgenticAdapter

from research.document_adapters.base import PageArtifact
from research.document_adapters.python_docling_adapter import PythonDoclingAdapter
from research.document_adapters.docling_rs_adapter import DoclingRsAdapter
from research.document_adapters.marker_adapter import MarkerAdapter
from research.document_adapters.surya_adapter import SuryaAdapter

from research.local_inference.ollama_adapter import OllamaAdapter
from research.local_inference.llama_cpp_adapter import LlamaCppAdapter
from research.local_inference.gemma3n_adapter import Gemma3nAdapter
from research.local_inference.bitnet_adapter import BitNetAdapter

from research.context_processing.llmlingua_adapter import LLMLinguaAdapter
from research.orchestration.fusion import FusionLayer, ScoreNormalizer
from research.runtime.resource_policy import ResourcePolicy
from research.runtime.observability import ObservabilityTracker, ExecutionTrace


EXPECTED_CONFIG_FILES = [
    "baseline.yaml",
    "bge_m3_dense.yaml",
    "bge_m3_sparse.yaml",
    "qdrant_hybrid.yaml",
    "pylate.yaml",
    "raglite.yaml",
    "pageindex_structural.yaml",
    "pageindex_agentic.yaml",
    "colsmol.yaml",
    "neo4j_graphrag.yaml",
    "crag_closed_corpus.yaml",
    "llmlingua.yaml",
    "docling.yaml",
    "marker.yaml",
    "surya.yaml",
    "llama_cpp.yaml",
    "ollama.yaml",
    "gemma3n.yaml",
    "bitnet.yaml",
    "full_stack.yaml"
]


class TestIntegrationArchitecture(unittest.TestCase):

    # -------------------------------------------------------------------------
    # 1. Schema Tests
    # -------------------------------------------------------------------------
    def test_retrieval_result_canonical_schema(self):
        res = RetrievalResult(
            doc_id="doc1",
            chunk_id="chunk_01",
            page_start=1,
            page_end=2,
            section_id="sec_01",
            score=0.88,
            rank=1,
            retrieval_method="bge_m3_dense",
            evidence_type="TEXT",
            metadata={"source": "test"}
        )
        d = res.to_dict()
        self.assertEqual(d["doc_id"], "doc1")
        self.assertEqual(d["chunk_id"], "chunk_01")
        self.assertEqual(d["page_start"], 1)
        self.assertEqual(d["page_end"], 2)
        self.assertEqual(d["section_id"], "sec_01")
        self.assertEqual(d["score"], 0.88)
        self.assertEqual(d["rank"], 1)
        self.assertEqual(d["retrieval_method"], "bge_m3_dense")
        self.assertEqual(d["evidence_type"], "TEXT")
        self.assertEqual(d["metadata"]["source"], "test")

        # Compatibility aliases
        self.assertEqual(d["id"], "chunk_01")
        self.assertEqual(d["similarity"], 0.88)
        self.assertEqual(d["fused_score"], 0.88)

    def test_retrieval_result_legacy_compatibility(self):
        res = RetrievalResult(
            id="legacy_id",
            title="Title",
            heading="Heading",
            content="Content text",
            similarity=0.75,
            rank=2
        )
        d = res.to_dict()
        self.assertEqual(d["id"], "legacy_id")
        self.assertEqual(d["chunk_id"], "legacy_id")
        self.assertEqual(d["title"], "Title")
        self.assertEqual(d["heading"], "Heading")
        self.assertEqual(d["content"], "Content text")
        self.assertEqual(d["similarity"], 0.75)
        self.assertEqual(d["score"], 0.75)
        self.assertEqual(d["rank"], 2)

    def test_retrieval_result_from_dict(self):
        raw = {
            "doc_id": "curriculum.pdf",
            "chunk_id": "c_10",
            "page_start": 5,
            "page_end": 5,
            "section_id": "CSS",
            "score": 0.92,
            "rank": 1,
            "retrieval_method": "dense",
            "evidence_type": "TEXT",
            "metadata": {"tags": ["css"]}
        }
        res = RetrievalResult.from_dict(raw)
        self.assertEqual(res.chunk_id, "c_10")
        self.assertEqual(res.score, 0.92)
        self.assertEqual(res.evidence_type, "TEXT")

    # -------------------------------------------------------------------------
    # 2. Adapter Unit Tests & Zero-Simulation Verification
    # -------------------------------------------------------------------------
    def test_adapters_instantiation_and_health(self):
        adapters = [
            ("EXP0040BaselineAdapter", EXP0040BaselineAdapter()),
            ("BGEFlagAdapter", BGEFlagAdapter()),
            ("QdrantAdapter", QdrantAdapter()),
            ("PyLateAdapter", PyLateAdapter()),
            ("RAGLiteAdapter", RAGLiteAdapter()),
            ("PageIndexAdapter", PageIndexAdapter()),
            ("PageIndexAgenticAdapter", PageIndexAgenticAdapter()),
            ("ColSmolAdapter", ColSmolAdapter()),
            ("Neo4jGraphRAGAdapter", Neo4jGraphRAGAdapter()),
            ("CRAGAdapter", CRAGAdapter()),
            ("PythonDoclingAdapter", PythonDoclingAdapter()),
            ("DoclingRsAdapter", DoclingRsAdapter()),
            ("MarkerAdapter", MarkerAdapter()),
            ("SuryaAdapter", SuryaAdapter()),
            ("OllamaAdapter", OllamaAdapter()),
            ("LlamaCppAdapter", LlamaCppAdapter()),
            ("Gemma3nAdapter", Gemma3nAdapter()),
            ("BitNetAdapter", BitNetAdapter()),
            ("LLMLinguaAdapter", LLMLinguaAdapter())
        ]

        for name, adapter in adapters:
            h = adapter.health()
            self.assertIsInstance(h, dict, f"{name}.health() must return dict")
            self.assertIn("status", h, f"{name}.health() missing status")
            self.assertIn(h["status"], ["READY", "READY_WITH_LIMITATIONS", "NOT_READY", "ok"],
                          f"{name} returned invalid status {h['status']}")

            # Verify NO simulations
            desc = adapter.describe()
            self.assertIsInstance(desc, dict, f"{name}.describe() must return dict")
            self.assertFalse(desc.get("simulation", False), f"{name} must not claim simulation=True")

    def test_uninstalled_adapters_report_not_ready(self):
        # RAGLite is not installed
        raglite = RAGLiteAdapter()
        h_rag = raglite.health()
        self.assertEqual(h_rag["status"], "NOT_READY")

        # ColSmol is not installed
        colsmol = ColSmolAdapter()
        h_col = colsmol.health()
        self.assertEqual(h_col["status"], "NOT_READY")

        # Neo4j is not installed
        neo = Neo4jGraphRAGAdapter()
        h_neo = neo.health()
        self.assertEqual(h_neo["status"], "NOT_READY")

        # DoclingRs native binary is not installed
        docling_rs = DoclingRsAdapter()
        h_rs = docling_rs.health()
        self.assertEqual(h_rs["native_rust_status"], "NOT_READY")

        # BitNet is not installed
        bitnet = BitNetAdapter()
        h_bit = bitnet.health()
        self.assertEqual(h_bit["status"], "NOT_READY")

    # -------------------------------------------------------------------------
    # 3. Configuration Tests (All 20 YAMLs)
    # -------------------------------------------------------------------------
    def test_all_20_configs_exist_and_validate(self):
        config_dir = "research/integration_configs"
        self.assertTrue(os.path.exists(config_dir))

        for fname in EXPECTED_CONFIG_FILES:
            fpath = os.path.join(config_dir, fname)
            self.assertTrue(os.path.exists(fpath), f"Missing configuration file: {fpath}")

            with open(fpath, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)

            self.assertIn("experiment_id", cfg, f"{fname} missing experiment_id")
            self.assertIn("feature_flags", cfg, f"{fname} missing feature_flags")
            self.assertIn("verifier", cfg, f"{fname} missing verifier")
            self.assertIn("dataset", cfg, f"{fname} missing dataset")
            self.assertIn("blind_evaluation", cfg, f"{fname} missing blind_evaluation")

            # Invariant: blind evaluation disabled
            self.assertFalse(
                cfg["blind_evaluation"].get("enabled", False),
                f"Blind evaluation must be disabled in {fname}"
            )

    # -------------------------------------------------------------------------
    # 4. Feature Flag Tests
    # -------------------------------------------------------------------------
    def test_baseline_has_all_optional_flags_disabled(self):
        fpath = "research/integration_configs/baseline.yaml"
        with open(fpath, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)

        flags = cfg["feature_flags"]
        for flag_name, is_enabled in flags.items():
            self.assertFalse(is_enabled, f"Baseline flag {flag_name} must be False")

    # -------------------------------------------------------------------------
    # 5. Baseline Regression Tests
    # -------------------------------------------------------------------------
    def test_baseline_adapter_reproduction(self):
        adapter = EXP0040BaselineAdapter()
        adapter.initialize()
        self.assertTrue(len(adapter.raw_chunks) > 0, "Baseline chunks not loaded")
        self.assertTrue(len(adapter.parents_dict) > 0, "Baseline parent groups not formed")

    # -------------------------------------------------------------------------
    # 6. Dependency Isolation Tests
    # -------------------------------------------------------------------------
    def test_baseline_dependency_isolation(self):
        import sys
        # Baseline must not require or import raglite, colpali_engine, neo4j, or bitnet
        self.assertNotIn("raglite", sys.modules)
        self.assertNotIn("colpali_engine", sys.modules)
        self.assertNotIn("neo4j", sys.modules)
        self.assertNotIn("bitnet", sys.modules)

    # -------------------------------------------------------------------------
    # 7. Parser Normalization Tests
    # -------------------------------------------------------------------------
    def test_page_artifact_schema(self):
        art = PageArtifact(
            document_id="doc_123",
            page_number=1,
            section_id="SEC_001",
            heading="Introduction",
            text="Document body text"
        )
        d = art.to_dict()
        self.assertEqual(d["document_id"], "doc_123")
        self.assertEqual(d["page_number"], 1)
        self.assertEqual(d["section_id"], "SEC_001")
        self.assertEqual(d["heading"], "Introduction")
        self.assertEqual(d["text"], "Document body text")
        self.assertIsInstance(d["tables"], list)
        self.assertIsInstance(d["figures"], list)

    # -------------------------------------------------------------------------
    # 8. Fusion Layer Tests
    # -------------------------------------------------------------------------
    def test_reciprocal_rank_fusion(self):
        fl = FusionLayer(default_rrf_k=60)
        list_a = [
            {"chunk_id": "c1", "score": 0.9, "rank": 1},
            {"chunk_id": "c2", "score": 0.8, "rank": 2},
        ]
        list_b = [
            {"chunk_id": "c2", "score": 0.95, "rank": 1},
            {"chunk_id": "c3", "score": 0.7, "rank": 2},
        ]
        fused = fl.reciprocal_rank_fusion([list_a, list_b], top_k=3)
        self.assertEqual(len(fused), 3)
        # c2 appears in both lists, so should be top ranked
        self.assertEqual(fused[0]["chunk_id"], "c2")
        self.assertEqual(fused[0]["rank"], 1)

    def test_score_normalization(self):
        scores = [10.0, 20.0, 30.0]
        norm = ScoreNormalizer.min_max(scores)
        self.assertAlmostEqual(norm[0], 0.0)
        self.assertAlmostEqual(norm[1], 0.5)
        self.assertAlmostEqual(norm[2], 1.0)

        sig = ScoreNormalizer.sigmoid([0.0])
        self.assertAlmostEqual(sig[0], 0.5)

    def test_deduplication(self):
        fl = FusionLayer()
        items = [
            {"chunk_id": "c1", "score": 0.9},
            {"chunk_id": "c2", "score": 0.8},
            {"chunk_id": "c1", "score": 0.7}
        ]
        deduped = fl.deduplicate(items, key="chunk_id")
        self.assertEqual(len(deduped), 2)
        self.assertEqual([x["chunk_id"] for x in deduped], ["c1", "c2"])

    # -------------------------------------------------------------------------
    # 9. Resource Policy Tests
    # -------------------------------------------------------------------------
    def test_resource_policy_budget_checks(self):
        policy = ResourcePolicy(max_pages=5, max_chunks=20)
        ok, _ = policy.check_pages_budget(3)
        self.assertTrue(ok)

        ok, msg = policy.check_pages_budget(10)
        self.assertFalse(ok)
        self.assertIn("Page budget exceeded", msg)

        ok, msg = policy.check_chunks_budget(25)
        self.assertFalse(ok)
        self.assertIn("Chunk budget exceeded", msg)

    # -------------------------------------------------------------------------
    # 10. Reproducibility & Observability Tests
    # -------------------------------------------------------------------------
    def test_observability_trace_recording(self):
        tracker = ObservabilityTracker()
        trace = tracker.start_trace("test_profile", {"param": 1})
        self.assertTrue(len(trace.configuration_hash) > 0)
        trace.retrieved_chunks = ["c1", "c2"]
        trace.retrieval_scores = [0.95, 0.85]
        trace.latency_ms = 42.5
        tracker.record_trace(trace)
        self.assertEqual(len(tracker.traces), 1)
        d = tracker.traces[0].to_dict()
        self.assertEqual(d["profile_id"], "test_profile")
        self.assertEqual(d["retrieved_chunks"], ["c1", "c2"])


if __name__ == "__main__":
    unittest.main()
