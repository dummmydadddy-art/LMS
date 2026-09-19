# research/retrieval_adapters/pylate_adapter.py
"""
PyLate Research Adapter for ColBERT Late-Interaction Retrieval.
Repository: lightonai/pylate
Model: lightonai/GTE-ModernColBERT-v1
Purpose: Late-interaction MaxSim retrieval tested as isolated retrieval replacement (EXP-0044).
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

try:
    from pylate import models, rank
    PYLATE_AVAILABLE = True
except ImportError:
    PYLATE_AVAILABLE = False


class PyLateAdapter(ResearchRetriever):
    """
    Research adapter providing late-interaction MaxSim retrieval via PyLate.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.model_name = self.config.get("model_name", "lightonai/GTE-ModernColBERT-v1")
        self.query_max_tokens = self.config.get("query_max_tokens", 128)
        self.doc_max_tokens = self.config.get("doc_max_tokens", 512)
        self.embedding_dim = self.config.get("embedding_dim", 128)
        self.use_fp16 = self.config.get("use_fp16", False)

        self._colbert_model = None
        self._doc_embeddings = None
        self._baseline_adapter = EXP0040BaselineAdapter(config)
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        self._baseline_adapter.initialize()
        self._initialized = True

    def _load_model(self):
        if self._colbert_model is not None:
            return self._colbert_model

        target_device = self.device
        if target_device == "cuda" and TORCH_AVAILABLE and torch.cuda.is_available():
            free_mem = torch.cuda.mem_get_info()[0] / (1024 ** 3)
            if free_mem < 2.0:
                target_device = "cpu"

        print(f"[PyLateAdapter] Loading {self.model_name} on {target_device}...", flush=True)
        if not PYLATE_AVAILABLE:
            raise RuntimeError("pylate library is not installed. Simulation is disabled.")
        self._colbert_model = models.ColBERT(
            model_name_or_path=self.model_name,
            device=target_device
        )
        return self._colbert_model

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        chunks = self._baseline_adapter.raw_chunks
        model = self._load_model()

        texts = [c["content"] for c in chunks]
        print(f"[PyLateAdapter] Encoding {len(texts)} chunks for late interaction...", flush=True)
        
        if not PYLATE_AVAILABLE:
            raise RuntimeError("pylate library is not installed. Simulation is disabled.")

        self._doc_embeddings = model.encode(
            texts,
            is_query=False,
            batch_size=8
        )
        return len(texts)

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()

        if self._doc_embeddings is None:
            self.index()

        if not PYLATE_AVAILABLE:
            raise RuntimeError("pylate library is not installed. Simulation is disabled.")

        model = self._load_model()
        chunks = self._baseline_adapter.raw_chunks
        children_dict = self._baseline_adapter.children_dict
        parents_dict = self._baseline_adapter.parents_dict

        # Encode query
        q_emb = model.encode([query], is_query=True)
        # MaxSim ranking via PyLate
        scores = rank.rerank(
            documents_ids=[[i for i in range(len(chunks))]],
            queries_embeddings=q_emb,
            documents_embeddings=[self._doc_embeddings]
        )
        # scores is list of ranked candidates
        raw_scores = {}
        for item in scores[0]:
            raw_scores[item["id"]] = float(item["score"])

        # Group scored chunks into parent groups
        parent_groups_map = {}
        for idx, c in enumerate(chunks):
            cid = c["id"]
            score = raw_scores.get(idx, 0.0)
            c_info = children_dict[cid]
            p_id = c_info["parent_id"]

            if p_id not in parent_groups_map:
                parent_groups_map[p_id] = {
                    "parent_id": p_id,
                    "parent_obj": parents_dict[p_id],
                    "contributing_children": [],
                    "max_fused_score": -999.0,
                    "earliest_doc_pos": 9999
                }

            child_item = {
                "id": cid,
                "maxsim_score": score,
                "fused_score": score,
                "content": c["content"]
            }
            parent_groups_map[p_id]["contributing_children"].append(child_item)
            if score > parent_groups_map[p_id]["max_fused_score"]:
                parent_groups_map[p_id]["max_fused_score"] = score
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
                    "source_id": p_obj["source_id"],
                    "section_id": p_obj["section_id"],
                    "num_child_hits": len(p_item["contributing_children"]),
                    "retrieval_mode": "pylate_maxsim"
                }
            }
            top_results.append(res)

        latency_ms = (time.time() - start_time) * 1000.0

        return {
            "query": query,
            "results": top_results,
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "PyLateAdapter",
                "model": self.model_name,
                "device": self.device,
                "maxsim_metric": "DotProduct / MaxSim"
            }
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "ready_status": "READY" if PYLATE_AVAILABLE else "NOT_READY",
            "reason": None if PYLATE_AVAILABLE else "pylate library is not installed",
            "adapter": "PyLateAdapter",
            "pylate_available": PYLATE_AVAILABLE,
            "model_name": self.model_name,
            "device": self.device,
            "index_loaded": self._doc_embeddings is not None
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "PyLateAdapter",
            "repository": "lightonai/pylate",
            "model": self.model_name,
            "embedding_dim": self.embedding_dim,
            "query_token_limit": self.query_max_tokens,
            "doc_token_limit": self.doc_max_tokens,
            "scoring": "Late interaction MaxSim",
            "hardware_safety": "CPU-compatible fallback, lazy loading, memory safety"
        }
