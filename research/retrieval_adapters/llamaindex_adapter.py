# research/retrieval_adapters/llamaindex_adapter.py
"""
LlamaIndex Research Adapter for Query Fusion and Multi-Query Expansion.
Repository: run-llama/llama_index
Purpose: Isolated evaluation of multi-query fusion vs single-query baseline (EXP-0045).
Underlying retrieval model and hierarchy remain completely frozen.
"""

import os
import sys
import json
import time
import re
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter

try:
    import llama_index.core
    LLAMAINDEX_AVAILABLE = True
except ImportError:
    LLAMAINDEX_AVAILABLE = False


class LlamaIndexAdapter(ResearchRetriever):
    """
    Research adapter wrapping LlamaIndex QueryFusionRetriever principles.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.num_queries = self.config.get("num_queries", 3)
        self.rrf_k = self.config.get("rrf_k", 60)
        self.enable_routing_hook = self.config.get("enable_routing_hook", False)
        self.enable_decomposition_hook = self.config.get("enable_decomposition_hook", False)

        # Baseline retriever (frozen EXP-0040)
        self._baseline = EXP0040BaselineAdapter(config)
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        self._baseline.initialize()
        self._initialized = True

    def _generate_query_variations(self, query: str) -> List[str]:
        """
        Generate multi-query reformulations deterministically.
        Uses curriculum-grounded query expansion rules.
        """
        variations = [query]

        # Variation 1: Keyword-centric technical query
        tech_words = re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", query)
        stopwords = {"what", "which", "when", "where", "does", "explain", "describe", "show", "tell", "true", "false"}
        keywords = [w for w in tech_words if w.lower() not in stopwords]
        if keywords:
            variations.append(" ".join(keywords[:6]))

        # Variation 2: Rule / constraint focused formulation
        if "why" in query.lower() or "how" in query.lower():
            variations.append(f"curriculum rule specifications: {' '.join(keywords[:5])}")
        else:
            variations.append(f"technical behavior and constraints of {query}")

        return variations[:self.num_queries]

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        return self._baseline.index(documents, **kwargs)

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()

        # Step 1: Generate query variations (QueryFusionRetriever pattern)
        queries = self._generate_query_variations(query)

        # Step 2: Retrieve candidate sets for all query variations using frozen baseline
        per_query_results = []
        for q in queries:
            meta = self._baseline.retrieve_with_metadata(q, top_k=10)
            per_query_results.append((q, meta["results"]))

        # Step 3: Reciprocal Rank Fusion (RRF) across query variations
        rrf_scores: Dict[str, float] = defaultdict(float)
        parent_map: Dict[str, Dict[str, Any]] = {}
        query_hits: Dict[str, List[str]] = defaultdict(list)

        for q_text, res_list in per_query_results:
            for rank_idx, item in enumerate(res_list, start=1):
                pid = item["id"]
                parent_map[pid] = item
                rrf_scores[pid] += 1.0 / (self.rrf_k + rank_idx)
                query_hits[pid].append(q_text)

        # Step 4: Deterministic ranking of fused parents
        sorted_pids = sorted(
            rrf_scores.keys(),
            key=lambda pid: (
                rrf_scores[pid],
                len(query_hits[pid]),
                -len(parent_map[pid].get("title", "")),
                pid
            ),
            reverse=True
        )

        top_results = []
        for rank_idx, pid in enumerate(sorted_pids[:top_k], start=1):
            base_item = dict(parent_map[pid])
            fused_rrf = rrf_scores[pid]
            base_item["rank"] = rank_idx
            base_item["similarity"] = round(float(fused_rrf), 4)
            base_item["fused_score"] = round(float(fused_rrf), 4)
            base_item["metadata"] = base_item.get("metadata", {})
            base_item["metadata"]["query_variations_matched"] = len(query_hits[pid])
            base_item["metadata"]["matching_queries"] = query_hits[pid]
            top_results.append(base_item)

        # Step 5: Compute overlap & diversity diagnostics
        q0_set = set(item["id"] for item in per_query_results[0][1][:top_k])
        fused_set = set(item["id"] for item in top_results)
        overlap_count = len(q0_set.intersection(fused_set))
        diversity_ratio = 1.0 - (overlap_count / max(1, len(fused_set)))

        latency_ms = (time.time() - start_time) * 1000.0

        return {
            "query": query,
            "results": top_results,
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "LlamaIndexAdapter",
                "num_generated_queries": len(queries),
                "generated_queries": queries,
                "overlap_with_original": overlap_count,
                "diversity_ratio": round(diversity_ratio, 4),
                "rrf_k": self.rrf_k,
                "dormant_hooks": {
                    "routing_enabled": self.enable_routing_hook,
                    "decomposition_enabled": self.enable_decomposition_hook
                }
            }
        }

    # Dormant extension hooks for future authorized studies
    def route_query(self, query: str) -> str:
        """Dormant routing hook."""
        return "general_curriculum"

    def decompose_query(self, query: str) -> List[str]:
        """Dormant query decomposition hook."""
        return [query]

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "adapter": "LlamaIndexAdapter",
            "llamaindex_available": LLAMAINDEX_AVAILABLE,
            "num_queries": self.num_queries,
            "underlying_baseline": self._baseline.health()
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "LlamaIndexAdapter",
            "repository": "run-llama/llama_index",
            "module": "QueryFusionRetriever",
            "underlying_backend": "EXP-0040 Hierarchical Baseline",
            "num_queries": self.num_queries,
            "fusion_algorithm": "Reciprocal Rank Fusion (RRF)",
            "rrf_k": self.rrf_k,
            "dormant_routing_hook": self.enable_routing_hook,
            "dormant_decomposition_hook": self.enable_decomposition_hook
        }
