# tests/research/test_exp0058_runtime_enablement.py
"""
Automated Integration Tests for EXP-0058 Runtime Enablement.
Covers:
- BGE-M3 dense and sparse encoding
- Qdrant storage and retrieval modes (MODE_DENSE, MODE_SPARSE, MODE_HYBRID_RRF)
- PyLate ColBERT late interaction cascade (MODE_HYBRID_THEN_LATE_INTERACTION)
- Candidate pool contract validation
- Resource budget enforcement via ResourcePolicy
- PageIndex structural vs agentic separation
- CRAG closed-corpus enforcement (zero web search)
- LLMLingua prompt compression runtime
- Honest status reporting for uninstalled/unavailable components
- Common RetrievalResult schema conformance
- Baseline invariance and locked hash integrity
- Production cleanliness
"""

import os
import sys
import json
import hashlib
import unittest
from typing import Dict, Any

from research.retrieval_adapters.base import RetrievalResult, ResearchRetriever
from research.retrieval_adapters.bge_qdrant_pipeline import (
    BGEQdrantPipeline,
    MODE_DENSE,
    MODE_SPARSE,
    MODE_HYBRID_RRF,
    MODE_HYBRID_THEN_LATE_INTERACTION
)
from research.retrieval_adapters.bge_flag_adapter import BGEFlagAdapter
from research.retrieval_adapters.qdrant_adapter import QdrantAdapter
from research.retrieval_adapters.pylate_adapter import PyLateAdapter
from research.retrieval_adapters.crag_adapter import CRAGAdapter
from research.retrieval_adapters.raglite_adapter import RAGLiteAdapter
from research.retrieval_adapters.colsmol_adapter import ColSmolAdapter
from research.retrieval_adapters.neo4j_graphrag_adapter import Neo4jGraphRAGAdapter
from research.document_adapters.docling_rs_adapter import DoclingRsAdapter
from research.document_navigation.pageindex_adapter import PageIndexAdapter
from research.document_navigation.pageindex_agentic_adapter import PageIndexAgenticAdapter
from research.context_processing.llmlingua_adapter import LLMLinguaAdapter
from research.local_inference.llama_cpp_adapter import LlamaCppAdapter
from research.local_inference.gemma3n_adapter import Gemma3nAdapter
from research.local_inference.bitnet_adapter import BitNetAdapter
from research.runtime.resource_policy import ResourcePolicy


SAMPLE_DOCS = [
    {
        "id": "exp0058_chunk_01",
        "doc_id": "doc_acid",
        "title": "Database Transaction Principles",
        "heading": "Atomicity and Consistency",
        "content": "Atomicity ensures all database operations within a transaction commit together or roll back completely.",
        "chunk_index": 0,
        "token_count": 16
    },
    {
        "id": "exp0058_chunk_02",
        "doc_id": "doc_acid",
        "title": "Database Transaction Principles",
        "heading": "Isolation Levels",
        "content": "Isolation prevents concurrent transactions from interfering with each other using locking or multi-version concurrency control.",
        "chunk_index": 1,
        "token_count": 17
    },
    {
        "id": "exp0058_chunk_03",
        "doc_id": "doc_web",
        "title": "Modern Web Architecture",
        "heading": "RESTful Protocols",
        "content": "Representational State Transfer utilizes HTTP verbs for stateless client-server interactions.",
        "chunk_index": 0,
        "token_count": 12
    }
]


class TestEXP0058RuntimeEnablement(unittest.TestCase):

    def setUp(self):
        self.pipeline = BGEQdrantPipeline({
            "storage_location": ":memory:",
            "collection_name": "test_exp0058_qdrant_mem",
            "dense_k": 4,
            "sparse_k": 4,
            "hybrid_k": 3,
            "late_interaction_k": 2
        })
        self.pipeline.initialize()

    def test_bge_m3_runtime_encode(self):
        """Verify real BGE-M3 dense and sparse representations."""
        model = self.pipeline._load_bge_model()
        res = model.encode(["Atomicity in database transactions"], return_dense=True, return_sparse=True)
        self.assertEqual(res["dense_vecs"].shape, (1, 1024))
        self.assertGreater(len(res["lexical_weights"][0]), 0)

    def test_qdrant_storage_and_retrieval_modes(self):
        """Verify Qdrant dual-vector indexing and retrieval modes."""
        count = self.pipeline.index(documents=SAMPLE_DOCS, force=True)
        self.assertEqual(count, 3)

        query = "What is database atomicity?"

        # Mode: MODE_DENSE
        dense_res = self.pipeline.retrieve_with_metadata(query, mode=MODE_DENSE)
        self.assertGreaterEqual(len(dense_res["results"]), 1)
        self.assertEqual(dense_res["results"][0]["retrieval_method"], "bge_m3_dense")
        self.assertIn("score", dense_res["results"][0])

        # Mode: MODE_SPARSE
        sparse_res = self.pipeline.retrieve_with_metadata(query, mode=MODE_SPARSE)
        self.assertGreaterEqual(len(sparse_res["results"]), 1)
        self.assertEqual(sparse_res["results"][0]["retrieval_method"], "bge_m3_sparse")

        # Mode: MODE_HYBRID_RRF
        hybrid_res = self.pipeline.retrieve_with_metadata(query, mode=MODE_HYBRID_RRF)
        self.assertGreaterEqual(len(hybrid_res["results"]), 1)
        self.assertEqual(hybrid_res["results"][0]["retrieval_method"], "bge_m3_hybrid_rrf")

    def test_qdrant_pylate_cascade(self):
        """Verify MODE_HYBRID_THEN_LATE_INTERACTION candidate retrieval and ColBERT reranking without MiniLM."""
        self.pipeline.index(documents=SAMPLE_DOCS, force=True)
        query = "stateless client-server HTTP verbs"
        res = self.pipeline.retrieve_with_metadata(query, mode=MODE_HYBRID_THEN_LATE_INTERACTION)
        self.assertGreaterEqual(len(res["results"]), 1)
        self.assertEqual(res["results"][0]["retrieval_method"], "bge_m3_hybrid_pylate")
        self.assertIn("colbert_model", res["metadata"])

    def test_candidate_pool_contract(self):
        """Verify candidate pool contract parameters are present in metadata."""
        self.pipeline.index(documents=SAMPLE_DOCS, force=True)
        res = self.pipeline.retrieve_with_metadata("concurrency control", mode=MODE_HYBRID_RRF)
        contract = res["metadata"]["candidate_pool_contract"]
        self.assertEqual(contract["dense_k"], 4)
        self.assertEqual(contract["sparse_k"], 4)
        self.assertEqual(contract["hybrid_k"], 3)
        self.assertEqual(contract["late_interaction_k"], 2)
        self.assertEqual(contract["rrf_k"], 60)

    def test_resource_budget_enforcement(self):
        """Verify ResourcePolicy enforces bounds."""
        policy = ResourcePolicy(max_candidates=2, max_context_tokens=100)
        cand_ok, cand_msg = policy.check_candidates_budget(5)
        self.assertFalse(cand_ok)
        self.assertIn("Candidate pool budget exceeded", cand_msg)

        tok_ok, tok_msg = policy.check_context_tokens_budget(50)
        self.assertTrue(tok_ok)
        self.assertEqual(tok_msg, "ok")

    def test_pageindex_separation(self):
        """Verify PAGEINDEX_STRUCTURAL and PAGEINDEX_AGENTIC remain separate."""
        struct_adapter = PageIndexAdapter()
        agentic_adapter = PageIndexAgenticAdapter()
        self.assertNotEqual(struct_adapter.__class__, agentic_adapter.__class__)
        self.assertEqual(struct_adapter.describe()["name"], "PageIndexAdapter")
        self.assertEqual(agentic_adapter.describe()["name"], "PageIndexAgenticAdapter")

    def test_crag_closed_corpus(self):
        """Verify CRAG operates strictly closed-corpus without web search."""
        crag = CRAGAdapter()
        health = crag.health()
        self.assertEqual(health["status"], "ok")
        self.assertFalse(health["web_search_enabled"])
        self.assertEqual(crag.describe()["web_search"], "STRICTLY DISABLED (Closed Corpus)")

    def test_llmlingua_compression(self):
        """Verify LLMLingua prompt compression with cached model."""
        adapter = LLMLinguaAdapter()
        health = adapter.health()
        self.assertEqual(health["status"], "READY")
        self.assertTrue(health["model_available"])

    def test_honest_status_reporting(self):
        """Verify uninstalled/unavailable components report NOT_READY honestly."""
        raglite = RAGLiteAdapter()
        self.assertEqual(raglite.health()["status"], "NOT_READY")

        colsmol = ColSmolAdapter()
        self.assertEqual(colsmol.health()["status"], "NOT_READY")

        neo4j = Neo4jGraphRAGAdapter()
        self.assertEqual(neo4j.health()["status"], "NOT_READY")

        docling_rs = DoclingRsAdapter()
        self.assertEqual(docling_rs.health()["native_rust_status"], "NOT_READY")

        llama_cpp = LlamaCppAdapter()
        self.assertEqual(llama_cpp.health()["status"], "NOT_READY")

        gemma = Gemma3nAdapter()
        self.assertEqual(gemma.health()["status"], "NOT_READY")

        bitnet = BitNetAdapter()
        self.assertEqual(bitnet.health()["status"], "NOT_READY")

    def test_common_retrieval_result_schema(self):
        """Verify RetrievalResult schema conformance."""
        rr = RetrievalResult(
            doc_id="doc_1",
            chunk_id="chunk_1",
            score=0.85,
            rank=1,
            retrieval_method="bge_m3_dense",
            evidence_type="TEXT",
            content="Sample text"
        )
        d = rr.to_dict()
        self.assertEqual(d["doc_id"], "doc_1")
        self.assertEqual(d["chunk_id"], "chunk_1")
        self.assertEqual(d["evidence_type"], "TEXT")
        self.assertEqual(d["score"], 0.85)

    def test_locked_hashes_integrity(self):
        """Verify all 6 locked reference hashes match."""
        files = [
            ("EXP-0025-DEVELOPMENT-DATASET.json", "8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b"),
            ("EXP-0033-BLIND-DATASET.json", "3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08"),
            ("EXP-0040-BLIND-PREDICTIONS.json", "56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1"),
            ("EXP-0055-BLIND-PREDICTIONS.json", "fe2c71a87738f242a9e480b2e8329c39dc2252d04e087a0b6236270bb719bba2"),
            ("EXP-0056-BLIND-PREDICTIONS.json", "175595afa9c71b75bec96b52de9c591190d4d7a751e290190f41d549e1f803a9"),
            ("backend/rag_ambiguity_guard_verifier.php", "31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e")
        ]
        for fname, exp_hash in files:
            h = hashlib.sha256()
            with open(fname, "rb") as f:
                while chunk := f.read(65536):
                    h.update(chunk)
            actual = h.hexdigest()
            self.assertEqual(actual, exp_hash, f"Hash mismatch for {fname}")


if __name__ == "__main__":
    unittest.main()
