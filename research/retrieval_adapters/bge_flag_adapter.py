# research/retrieval_adapters/bge_flag_adapter.py
"""
FlagEmbedding Adapter for BAAI/bge-m3 and BAAI/bge-reranker-v2-m3.
Supports 4 independently selectable modes:
1. dense: 1024-dim dense retrieval
2. sparse: lexical weight retrieval
3. multi_vector: ColBERT-style late interaction
4. reranker: BGE reranker v2 M3
Hardware Safety: Sequential residency, lazy loading, automatic CPU fallback for 4 GB VRAM.
"""

import os
import sys
import gc
import json
import time
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class BGEFlagAdapter(ResearchRetriever):
    """
    Research adapter for FlagEmbedding suite (BGE-M3 and BGE-Reranker-v2-m3).
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.mode = self.config.get("mode", "reranker")  # dense, sparse, multi_vector, reranker, hybrid
        self.bge_model_name = self.config.get("embedding_model", "BAAI/bge-m3")
        self.reranker_model_name = self.config.get("reranker_model", "BAAI/bge-reranker-v2-m3")
        self.use_fp16 = self.config.get("use_fp16", True and self.device == "cuda")
        self.batch_size = self.config.get("batch_size", 4)
        self.max_length = self.config.get("max_length", 512)

        # Baseline hierarchy and parent-child aggregation fallback
        self._baseline_adapter = EXP0040BaselineAdapter(config)
        self._flag_model = None
        self._flag_reranker = None
        self._doc_embeddings: Dict[str, Any] = {}
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        self._baseline_adapter.initialize()
        self._initialized = True

    def _load_flag_model(self):
        """Lazy-load BGE-M3 model with sequential residency safety."""
        if self._flag_model is not None:
            return self._flag_model

        # Ensure no competing large model is resident
        if self._flag_reranker is not None:
            del self._flag_reranker
            self._flag_reranker = None
            self.clear_memory()

        try:
            from FlagEmbedding import BGEM3FlagModel
            # Check VRAM: if < 2GB free on GPU, use CPU
            target_device = self.device
            if target_device == "cuda" and TORCH_AVAILABLE and torch.cuda.is_available():
                free_mem = torch.cuda.mem_get_info()[0] / (1024 ** 3)
                if free_mem < 2.5:
                    target_device = "cpu"

            print(f"[BGEFlagAdapter] Loading {self.bge_model_name} on {target_device}...", flush=True)
            self._flag_model = BGEM3FlagModel(
                self.bge_model_name,
                use_fp16=(self.use_fp16 and target_device == "cuda"),
                device=target_device
            )
            return self._flag_model
        except Exception as e:
            print(f"[BGEFlagAdapter] Fallback loading error: {e}", flush=True)
            raise

    def _load_flag_reranker(self):
        """Lazy-load BGE reranker v2 M3 with sequential residency safety."""
        if self._flag_reranker is not None:
            return self._flag_reranker

        if self._flag_model is not None:
            del self._flag_model
            self._flag_model = None
            self.clear_memory()

        try:
            from FlagEmbedding import FlagReranker
            target_device = self.device
            if target_device == "cuda" and TORCH_AVAILABLE and torch.cuda.is_available():
                free_mem = torch.cuda.mem_get_info()[0] / (1024 ** 3)
                if free_mem < 2.0:
                    target_device = "cpu"

            print(f"[BGEFlagAdapter] Loading {self.reranker_model_name} on {target_device}...", flush=True)
            self._flag_reranker = FlagReranker(
                self.reranker_model_name,
                use_fp16=(self.use_fp16 and target_device == "cuda"),
                device=target_device
            )
            return self._flag_reranker
        except Exception as e:
            print(f"[BGEFlagAdapter] Reranker loading error: {e}", flush=True)
            raise

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        chunks = self._baseline_adapter.raw_chunks
        
        # In dense/sparse/multi-vector mode, pre-compute document representations
        if self.mode in ("dense", "sparse", "multi_vector", "hybrid"):
            model = self._load_flag_model()
            texts = [c["content"] for c in chunks]
            cids = [c["id"] for c in chunks]
            
            return_dense = self.mode in ("dense", "hybrid")
            return_sparse = self.mode in ("sparse", "hybrid")
            return_colbert_vecs = self.mode in ("multi_vector", "hybrid")

            encoded = model.encode(
                texts,
                batch_size=self.batch_size,
                max_length=self.max_length,
                return_dense=return_dense,
                return_sparse=return_sparse,
                return_colbert_vecs=return_colbert_vecs
            )
            for i, cid in enumerate(cids):
                self._doc_embeddings[cid] = {
                    k: encoded[k][i] for k in encoded if k in ("dense_vecs", "lexical_weights", "colbert_vecs")
                }
        return len(chunks)

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()
        
        chunks = self._baseline_adapter.raw_chunks
        parents_dict = self._baseline_adapter.parents_dict
        children_dict = self._baseline_adapter.children_dict

        # MODE 1: EXP-0041 BGE Reranker Replacement
        # Keep BGE-small dense pool fixed; replace ONLY the cross-encoder with BGE reranker v2 M3
        if self.mode == "reranker":
            # 1. Obtain baseline dense pool (top-20 from BGE-small)
            q_vec = self._baseline_adapter._get_query_embedding(query)
            child_sims = []
            for c in chunks:
                cid = c["id"]
                c_vec = self._baseline_adapter._child_embeddings.get(cid)
                sim = float(np.dot(q_vec, c_vec)) if c_vec is not None else 0.0
                child_sims.append((c, sim))
            child_sims.sort(key=lambda x: x[1], reverse=True)
            pool = child_sims[:20]

            # 2. Score with BGE reranker v2 M3
            reranker = self._load_flag_reranker()
            pairs = [[query, c[0]["content"]] for c in pool]
            scores = reranker.compute_score(pairs, batch_size=self.batch_size)
            if isinstance(scores, (int, float)):
                scores = [scores]

            # Normalize scores and map to parents
            cand_scored = []
            for rank_idx, ((c, dense_sim), raw_score) in enumerate(zip(pool, scores)):
                # Sigmoid normalization for BGE reranker logit
                norm_rerank = 1.0 / (1.0 + np.exp(-float(raw_score)))
                dense_norm = (dense_sim - 0.40) / 0.45
                dense_norm = max(0.0, min(1.0, dense_norm))
                fused = 0.50 * dense_norm + 0.50 * norm_rerank

                cand_scored.append({
                    "id": c["id"],
                    "dense_similarity": dense_sim,
                    "raw_score": float(raw_score),
                    "fused_score": fused,
                    "content": c["content"]
                })

        # MODE 2: EXP-0042 BGE-M3 Dense Embedding Only
        elif self.mode == "dense":
            model = self._load_flag_model()
            q_enc = model.encode([query], return_dense=True, return_sparse=False, return_colbert_vecs=False)
            q_vec = q_enc["dense_vecs"][0]

            cand_scored = []
            for c in chunks:
                cid = c["id"]
                if cid in self._doc_embeddings:
                    d_vec = self._doc_embeddings[cid]["dense_vecs"]
                else:
                    d_vec = model.encode([c["content"]], return_dense=True)["dense_vecs"][0]
                sim = float(np.dot(q_vec, d_vec))
                cand_scored.append({
                    "id": cid,
                    "dense_similarity": sim,
                    "fused_score": sim,
                    "content": c["content"]
                })
            cand_scored.sort(key=lambda x: x["fused_score"], reverse=True)

        # MODE 3: EXP-0043 Sparse or Hybrid
        elif self.mode in ("sparse", "multi_vector", "hybrid"):
            model = self._load_flag_model()
            q_enc = model.encode(
                [query],
                return_dense=True,
                return_sparse=True,
                return_colbert_vecs=True
            )
            cand_scored = []
            for c in chunks:
                cid = c["id"]
                d_enc = self._doc_embeddings.get(cid)
                if not d_enc:
                    d_enc = model.encode([c["content"]], return_dense=True, return_sparse=True, return_colbert_vecs=True)
                
                score = 0.0
                if self.mode == "sparse":
                    score = float(model.compute_lexical_matching_score(q_enc["lexical_weights"][0], d_enc["lexical_weights"]))
                elif self.mode == "multi_vector":
                    score = float(model.colbert_score(q_enc["colbert_vecs"][0], d_enc["colbert_vecs"]))
                else: # hybrid
                    dense_s = float(np.dot(q_enc["dense_vecs"][0], d_enc["dense_vecs"]))
                    sparse_s = float(model.compute_lexical_matching_score(q_enc["lexical_weights"][0], d_enc["lexical_weights"]))
                    colbert_s = float(model.colbert_score(q_enc["colbert_vecs"][0], d_enc["colbert_vecs"]))
                    score = 0.4 * dense_s + 0.3 * sparse_s + 0.3 * colbert_s

                cand_scored.append({
                    "id": cid,
                    "fused_score": score,
                    "content": c["content"]
                })
            cand_scored.sort(key=lambda x: x["fused_score"], reverse=True)

        # Map candidate chunks to bounded parent groups
        parent_groups_map = {}
        for c in cand_scored:
            c_info = children_dict[c["id"]]
            p_id = c_info["parent_id"]

            if p_id not in parent_groups_map:
                parent_groups_map[p_id] = {
                    "parent_id": p_id,
                    "parent_obj": parents_dict[p_id],
                    "contributing_children": [],
                    "max_fused_score": -999.0,
                    "earliest_doc_pos": 9999
                }

            parent_groups_map[p_id]["contributing_children"].append(c)
            if c["fused_score"] > parent_groups_map[p_id]["max_fused_score"]:
                parent_groups_map[p_id]["max_fused_score"] = c["fused_score"]
            if c_info["position_in_document"] < parent_groups_map[p_id]["earliest_doc_pos"]:
                parent_groups_map[p_id]["earliest_doc_pos"] = c_info["position_in_document"]

        ranked_parents = list(parent_groups_map.values())
        ranked_parents.sort(key=lambda x: x["parent_id"])
        ranked_parents.sort(key=lambda x: x["earliest_doc_pos"])
        ranked_parents.sort(key=lambda x: len(x["contributing_children"]), reverse=True)
        ranked_parents.sort(key=lambda x: x["max_fused_score"], reverse=True)

        top_results = []
        for rank_idx, p_item in enumerate(ranked_parents[:top_k], start=1):
            p_obj = p_item["parent_obj"]
            res = {
                "rank": rank_idx,
                "id": p_item["parent_id"],
                "chunk_id": p_item["parent_id"],
                "parent_id": p_item["parent_id"],
                "title": p_obj["document_title"],
                "heading": p_obj["section_heading"],
                "content": p_obj["parent_content"],
                "similarity": round(float(p_item["max_fused_score"]), 4),
                "fused_score": round(float(p_item["max_fused_score"]), 4),
                "contributing_children": p_item["contributing_children"],
                "metadata": {
                    "mode": self.mode,
                    "source_id": p_obj["source_id"],
                    "section_id": p_obj["section_id"],
                    "num_child_hits": len(p_item["contributing_children"]),
                    "parent_token_count": p_obj["parent_token_count"]
                }
            }
            top_results.append(res)

        latency_ms = (time.time() - start_time) * 1000.0

        return {
            "query": query,
            "results": top_results,
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "BGEFlagAdapter",
                "mode": self.mode,
                "embedding_model": self.bge_model_name,
                "reranker_model": self.reranker_model_name,
                "device": self.device,
                "use_fp16": self.use_fp16
            }
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "adapter": "BGEFlagAdapter",
            "mode": self.mode,
            "device": self.device,
            "use_fp16": self.use_fp16,
            "model_loaded": (self._flag_model is not None or self._flag_reranker is not None),
            "torch_available": TORCH_AVAILABLE
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "BGEFlagAdapter",
            "repository": "FlagOpen/FlagEmbedding",
            "modes_supported": ["dense", "sparse", "multi_vector", "reranker", "hybrid"],
            "current_mode": self.mode,
            "embedding_model": self.bge_model_name,
            "embedding_dim": 1024,
            "reranker_model": self.reranker_model_name,
            "hardware_safety": "Sequential model residency, lazy loading, automatic CPU fallback",
            "device": self.device,
            "precision": "fp16" if (self.use_fp16 and self.device == "cuda") else "fp32"
        }
