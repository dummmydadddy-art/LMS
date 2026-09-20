# research/retrieval_adapters/bge_qdrant_pipeline.py
"""
BGE-M3 + Qdrant Offline and Online Retrieval Pipeline.
Repository: FlagOpen/FlagEmbedding & qdrant/qdrant

Features:
- Offline indexing:
  Chunks -> BGE-M3 dense (1024-dim) + BGE-M3 sparse (lexical weights) -> Qdrant collection
- Storage isolation:
  Dedicated storage under research/data/qdrant/ or configured path
- Supported retrieval modes:
  1. MODE_DENSE: Qdrant dense vector search (dense_k)
  2. MODE_SPARSE: Qdrant sparse vector search (sparse_k)
  3. MODE_HYBRID_RRF: Dense + sparse candidate retrieval fused via RRF (hybrid_k)
  4. MODE_HYBRID_THEN_LATE_INTERACTION: Hybrid candidate retrieval followed by PyLate ColBERT late interaction (late_interaction_k)
- Candidate pool contract:
  Configurable dense_k, sparse_k, hybrid_k, late_interaction_k recorded in run metadata
- Strict governance:
  Zero MiniLM cross-encoder substitution in BGE-M3 pipeline, zero simulations, canonical RetrievalResult output
- Resource budgets:
  Enforces ResourcePolicy
"""

import os
import sys
import time
import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple

# Safe DLL import sequence for Windows C++ runtimes
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    import transformers
except ImportError:
    pass

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as rest_models
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

try:
    from pylate import models as pylate_models, rank as pylate_rank
    PYLATE_AVAILABLE = True
except ImportError:
    PYLATE_AVAILABLE = False

try:
    from FlagEmbedding import BGEM3FlagModel
    FLAG_AVAILABLE = True
except ImportError:
    FLAG_AVAILABLE = False

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter
from research.runtime.resource_policy import ResourcePolicy


# Canonical retrieval mode constants
MODE_DENSE = "MODE_DENSE"
MODE_SPARSE = "MODE_SPARSE"
MODE_HYBRID_RRF = "MODE_HYBRID_RRF"
MODE_HYBRID_THEN_LATE_INTERACTION = "MODE_HYBRID_THEN_LATE_INTERACTION"


class BGEQdrantPipeline(ResearchRetriever):
    """
    End-to-end BGE-M3 and Qdrant retrieval pipeline with optional PyLate ColBERT late interaction.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.mode = self.config.get("mode", MODE_HYBRID_RRF)
        self.collection_name = self.config.get("collection_name", "bge_m3_qdrant_c2_085")
        self.storage_location = self.config.get("storage_location", ":memory:")
        self.embedding_model_name = self.config.get("embedding_model", "BAAI/bge-m3")
        self.colbert_model_name = self.config.get("colbert_model", "lightonai/GTE-ModernColBERT-v1")
        self.vector_dim = self.config.get("vector_dim", 1024)
        self.use_fp16 = self.config.get("use_fp16", False)
        self.batch_size = self.config.get("batch_size", 4)
        self.max_length = self.config.get("max_length", 512)

        # Candidate Pool Contract
        self.dense_k = int(self.config.get("dense_k", 20))
        self.sparse_k = int(self.config.get("sparse_k", 20))
        self.hybrid_k = int(self.config.get("hybrid_k", 10))
        self.late_interaction_k = int(self.config.get("late_interaction_k", 5))
        self.rrf_k = int(self.config.get("rrf_k", 60))

        # Resource Policy
        self.resource_policy = ResourcePolicy(
            max_pages=self.config.get("max_pages", 10),
            max_chunks=self.config.get("max_chunks", 50),
            max_candidates=self.config.get("max_candidates", 20),
            max_context_tokens=self.config.get("max_context_tokens", 2048),
            retrieval_timeout_sec=self.config.get("retrieval_timeout_sec", 30.0),
            inference_timeout_sec=self.config.get("inference_timeout_sec", 45.0)
        )

        self._client: Optional[QdrantClient] = None
        self._flag_model: Optional[BGEM3FlagModel] = None
        self._pylate_model: Optional[Any] = None
        self._baseline_adapter = EXP0040BaselineAdapter(config)
        self._index_manifest: Optional[Dict[str, Any]] = None
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return

        if not QDRANT_AVAILABLE:
            raise ImportError("qdrant-client package is required for BGEQdrantPipeline")
        if not FLAG_AVAILABLE:
            raise ImportError("FlagEmbedding package is required for BGEQdrantPipeline")

        self._baseline_adapter.initialize()

        # Connect / initialize Qdrant
        if self.storage_location != ":memory:":
            os.makedirs(self.storage_location, exist_ok=True)
            self._client = QdrantClient(path=self.storage_location)
        else:
            self._client = QdrantClient(location=":memory:")

        self._initialized = True

    def _load_bge_model(self) -> BGEM3FlagModel:
        if self._flag_model is not None:
            return self._flag_model

        target_device = self.device
        if target_device == "cuda" and TORCH_AVAILABLE and torch.cuda.is_available():
            free_mem = torch.cuda.mem_get_info()[0] / (1024 ** 3)
            if free_mem < 2.5:
                target_device = "cpu"

        self._flag_model = BGEM3FlagModel(
            self.embedding_model_name,
            use_fp16=(self.use_fp16 and target_device == "cuda"),
            device=target_device
        )
        return self._flag_model

    def _load_pylate_model(self) -> Any:
        if self._pylate_model is not None:
            return self._pylate_model

        if not PYLATE_AVAILABLE:
            raise RuntimeError("pylate library is required for MODE_HYBRID_THEN_LATE_INTERACTION")

        target_device = self.device
        if target_device == "cuda" and TORCH_AVAILABLE and torch.cuda.is_available():
            free_mem = torch.cuda.mem_get_info()[0] / (1024 ** 3)
            if free_mem < 2.0:
                target_device = "cpu"

        self._pylate_model = pylate_models.ColBERT(
            model_name_or_path=self.colbert_model_name,
            device=target_device
        )
        return self._pylate_model

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, force: bool = False) -> int:
        """
        Offline indexing: Encodes chunks into BGE-M3 dense and sparse representations,
        and indexes them into a dual-vector Qdrant collection.
        """
        self.initialize()
        if self._client is None:
            raise RuntimeError("Qdrant client not initialized")

        collections = [c.name for c in self._client.get_collections().collections]
        if self.collection_name in collections:
            if force:
                self._client.delete_collection(self.collection_name)
            else:
                return self._client.count(self.collection_name).count

        # Create dual-vector collection
        self._client.create_collection(
            collection_name=self.collection_name,
            vectors_config={
                "dense": rest_models.VectorParams(
                    size=self.vector_dim,
                    distance=rest_models.Distance.COSINE
                )
            },
            sparse_vectors_config={
                "sparse": rest_models.SparseVectorParams()
            }
        )

        chunks = documents if documents is not None else self._baseline_adapter.raw_chunks
        children_dict = self._baseline_adapter.children_dict
        parents_dict = self._baseline_adapter.parents_dict
        bge_model = self._load_bge_model()

        texts = [c["content"] for c in chunks]
        encoded = bge_model.encode(
            texts,
            batch_size=self.batch_size,
            max_length=self.max_length,
            return_dense=True,
            return_sparse=True,
            return_colbert_vecs=False
        )

        dense_vecs = encoded["dense_vecs"]
        lexical_weights = encoded["lexical_weights"]

        points = []
        for idx, c in enumerate(chunks):
            cid = c.get("id", c.get("chunk_id", f"chunk_{idx}"))
            c_info = children_dict.get(cid, {})
            p_id = c_info.get("parent_id", c.get("parent_id", cid))
            p_obj = parents_dict.get(p_id, {})

            # Prepare dense vector
            d_vec = dense_vecs[idx].tolist()

            # Prepare sparse vector
            lw = lexical_weights[idx]
            sparse_indices = [int(k) for k in lw.keys()]
            sparse_values = [float(v) for v in lw.values()]
            s_vec = rest_models.SparseVector(indices=sparse_indices, values=sparse_values)

            # Deterministic integer point ID
            point_id = int(hashlib.md5(cid.encode("utf-8")).hexdigest()[:15], 16)

            payload = {
                "doc_id": c.get("document_id", c.get("doc_id", "")),
                "chunk_id": cid,
                "parent_id": p_id,
                "section_id": c_info.get("section_id", c.get("section_id", "")),
                "title": c.get("title", ""),
                "heading": c.get("heading", ""),
                "content": c.get("content", ""),
                "position": c.get("chunk_index", idx),
                "token_count": c.get("token_count", len(c.get("content", "").split())),
                "parent_content": p_obj.get("parent_content", "")
            }

            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector={"dense": d_vec, "sparse": s_vec},
                    payload=payload
                )
            )

        self._client.upsert(
            collection_name=self.collection_name,
            points=points
        )

        # Generate index manifest
        config_hash = hashlib.sha256(json.dumps(self.config, sort_keys=True).encode("utf-8")).hexdigest()
        self._index_manifest = {
            "collection_name": self.collection_name,
            "vector_dimensions": self.vector_dim,
            "distance_metric": "Cosine",
            "point_count": len(points),
            "storage_location": self.storage_location,
            "embedding_model": self.embedding_model_name,
            "configuration_hash": config_hash,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        }

        return len(points)

    def retrieve(self, query: str, top_k: Optional[int] = None, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: Optional[int] = None, **kwargs) -> Dict[str, Any]:
        """
        Online retrieval executing the selected mode:
        MODE_DENSE, MODE_SPARSE, MODE_HYBRID_RRF, or MODE_HYBRID_THEN_LATE_INTERACTION.
        """
        self.initialize()
        start_time = time.time()

        if self._client is None:
            raise RuntimeError("Qdrant client not initialized")

        # Auto-index if collection is missing
        collections = [c.name for c in self._client.get_collections().collections]
        if self.collection_name not in collections:
            self.index()

        bge_model = self._load_bge_model()

        # Determine effective limits based on Candidate Pool Contract and ResourcePolicy
        dense_limit = min(self.dense_k, self.resource_policy.max_candidates)
        sparse_limit = min(self.sparse_k, self.resource_policy.max_candidates)
        hybrid_limit = min(self.hybrid_k, self.resource_policy.max_candidates)
        late_interaction_limit = min(self.late_interaction_k, self.resource_policy.max_candidates)

        mode = kwargs.get("mode", self.mode)
        q_enc = bge_model.encode(
            [query],
            return_dense=(mode in (MODE_DENSE, MODE_HYBRID_RRF, MODE_HYBRID_THEN_LATE_INTERACTION)),
            return_sparse=(mode in (MODE_SPARSE, MODE_HYBRID_RRF, MODE_HYBRID_THEN_LATE_INTERACTION)),
            return_colbert_vecs=False
        )

        dense_hits = []
        sparse_hits = []

        # 1. Dense retrieval
        if mode in (MODE_DENSE, MODE_HYBRID_RRF, MODE_HYBRID_THEN_LATE_INTERACTION):
            q_dense = q_enc["dense_vecs"][0].tolist()
            res_dense = self._client.query_points(
                collection_name=self.collection_name,
                query=q_dense,
                using="dense",
                limit=dense_limit,
                with_payload=True
            )
            dense_hits = res_dense.points

        # 2. Sparse retrieval
        if mode in (MODE_SPARSE, MODE_HYBRID_RRF, MODE_HYBRID_THEN_LATE_INTERACTION):
            q_lw = q_enc["lexical_weights"][0]
            s_indices = [int(k) for k in q_lw.keys()]
            s_values = [float(v) for v in q_lw.values()]
            q_sparse = rest_models.SparseVector(indices=s_indices, values=s_values)
            res_sparse = self._client.query_points(
                collection_name=self.collection_name,
                query=q_sparse,
                using="sparse",
                limit=sparse_limit,
                with_payload=True
            )
            sparse_hits = res_sparse.points

        # 3. Candidate selection / fusion
        candidates: List[Dict[str, Any]] = []

        if mode == MODE_DENSE:
            for rank_idx, hit in enumerate(dense_hits, start=1):
                candidates.append({
                    "hit": hit,
                    "score": float(hit.score),
                    "rank": rank_idx,
                    "retrieval_method": "bge_m3_dense"
                })

        elif mode == MODE_SPARSE:
            for rank_idx, hit in enumerate(sparse_hits, start=1):
                candidates.append({
                    "hit": hit,
                    "score": float(hit.score),
                    "rank": rank_idx,
                    "retrieval_method": "bge_m3_sparse"
                })

        elif mode in (MODE_HYBRID_RRF, MODE_HYBRID_THEN_LATE_INTERACTION):
            # Reciprocal Rank Fusion of dense and sparse pools
            rrf_scores: Dict[Any, float] = {}
            hits_by_id: Dict[Any, Any] = {}

            for r, h in enumerate(dense_hits, start=1):
                hits_by_id[h.id] = h
                rrf_scores[h.id] = rrf_scores.get(h.id, 0.0) + (1.0 / (self.rrf_k + r))

            for r, h in enumerate(sparse_hits, start=1):
                hits_by_id[h.id] = h
                rrf_scores[h.id] = rrf_scores.get(h.id, 0.0) + (1.0 / (self.rrf_k + r))

            sorted_ids = sorted(rrf_scores.keys(), key=lambda pid: rrf_scores[pid], reverse=True)
            for rank_idx, pid in enumerate(sorted_ids[:hybrid_limit], start=1):
                candidates.append({
                    "hit": hits_by_id[pid],
                    "score": rrf_scores[pid],
                    "rank": rank_idx,
                    "retrieval_method": "bge_m3_hybrid_rrf"
                })

            # 4. Optional PyLate Late-Interaction Reranking
            if mode == MODE_HYBRID_THEN_LATE_INTERACTION and candidates:
                pylate_model = self._load_pylate_model()
                cand_texts = [c["hit"].payload["content"] for c in candidates]
                
                # Late-interaction rerank
                q_emb = pylate_model.encode([query], is_query=True)
                doc_embs = pylate_model.encode(cand_texts, is_query=False, batch_size=8)
                
                rerank_scores = pylate_rank.rerank(
                    documents_ids=[[i for i in range(len(candidates))]],
                    queries_embeddings=q_emb,
                    documents_embeddings=[doc_embs]
                )
                
                # Sort candidates by ColBERT score
                ranked_colbert = []
                for item in rerank_scores[0]:
                    idx = item["id"]
                    colbert_score = float(item["score"])
                    cand = candidates[idx]
                    cand["colbert_score"] = colbert_score
                    cand["score"] = colbert_score
                    cand["retrieval_method"] = "bge_m3_hybrid_pylate"
                    ranked_colbert.append(cand)

                candidates = ranked_colbert[:late_interaction_limit]

        # Format output as canonical RetrievalResult
        final_k = top_k if top_k is not None else len(candidates)
        results: List[Dict[str, Any]] = []

        for rank_idx, cand in enumerate(candidates[:final_k], start=1):
            hit = cand["hit"]
            payload = hit.payload
            rr = RetrievalResult(
                doc_id=payload.get("doc_id", ""),
                chunk_id=payload.get("chunk_id", ""),
                section_id=payload.get("section_id", ""),
                score=float(cand["score"]),
                rank=rank_idx,
                retrieval_method=cand["retrieval_method"],
                evidence_type="TEXT",
                metadata={
                    "mode": mode,
                    "title": payload.get("title", ""),
                    "heading": payload.get("heading", ""),
                    "parent_id": payload.get("parent_id", ""),
                    "position": payload.get("position", 0),
                    "token_count": payload.get("token_count", 0),
                    "candidate_pool": {
                        "dense_k": dense_limit,
                        "sparse_k": sparse_limit,
                        "hybrid_k": hybrid_limit,
                        "late_interaction_k": late_interaction_limit
                    }
                },
                content=payload.get("content", ""),
                title=payload.get("title", ""),
                heading=payload.get("heading", ""),
                parent_id=payload.get("parent_id", "")
            )
            results.append(rr.to_dict())

        latency_ms = (time.time() - start_time) * 1000.0

        return {
            "query": query,
            "results": results,
            "latency_ms": round(latency_ms, 2),
            "metadata": {
                "pipeline": "BGEQdrantPipeline",
                "mode": mode,
                "collection": self.collection_name,
                "storage_location": self.storage_location,
                "embedding_model": self.embedding_model_name,
                "colbert_model": self.colbert_model_name if mode == MODE_HYBRID_THEN_LATE_INTERACTION else None,
                "candidate_pool_contract": {
                    "dense_k": dense_limit,
                    "sparse_k": sparse_limit,
                    "hybrid_k": hybrid_limit,
                    "late_interaction_k": late_interaction_limit,
                    "rrf_k": self.rrf_k
                },
                "resource_policy": self.resource_policy.to_dict(),
                "dense_hits_count": len(dense_hits),
                "sparse_hits_count": len(sparse_hits),
                "final_count": len(results)
            }
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "READY" if (QDRANT_AVAILABLE and FLAG_AVAILABLE) else "NOT_READY",
            "pipeline": "BGEQdrantPipeline",
            "qdrant_available": QDRANT_AVAILABLE,
            "flag_embedding_available": FLAG_AVAILABLE,
            "pylate_available": PYLATE_AVAILABLE,
            "collection_name": self.collection_name,
            "storage_location": self.storage_location,
            "mode": self.mode,
            "device": self.device
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "BGEQdrantPipeline",
            "repository": "FlagOpen/FlagEmbedding & qdrant/qdrant",
            "modes_supported": [
                MODE_DENSE,
                MODE_SPARSE,
                MODE_HYBRID_RRF,
                MODE_HYBRID_THEN_LATE_INTERACTION
            ],
            "current_mode": self.mode,
            "embedding_model": self.embedding_model_name,
            "colbert_model": self.colbert_model_name,
            "vector_dim": self.vector_dim,
            "storage_location": self.storage_location,
            "candidate_pool_contract": {
                "dense_k": self.dense_k,
                "sparse_k": self.sparse_k,
                "hybrid_k": self.hybrid_k,
                "late_interaction_k": self.late_interaction_k
            }
        }
