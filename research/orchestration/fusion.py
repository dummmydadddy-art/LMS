# research/orchestration/fusion.py
"""
Framework-Independent Fusion Layer for EduConnect Research Integration.
Supports:
- Reciprocal Rank Fusion (RRF): score = sum(weight / (k + rank))
- Weighted Rank Fusion
- Score Normalization: Min-Max, Sigmoid, Z-score
- Deduplication: doc_id / chunk_id
- Grouping: Page grouping, Section grouping, Child-Parent grouping
- Configurable Candidate Pools

Governance:
- Neutral defaults only (no scientific tuning during integration).
- Framework independent: zero reliance on LlamaIndex, Haystack, or external frameworks.
- Strictly operates on RetrievalResult or dicts conforming to the common data contract.
"""

import math
from typing import List, Dict, Any, Optional, Tuple, Callable
from collections import defaultdict

from research.retrieval_adapters.base import RetrievalResult


class ScoreNormalizer:
    """Provides standard score normalization methods."""

    @staticmethod
    def min_max(scores: List[float], epsilon: float = 1e-9) -> List[float]:
        if not scores:
            return []
        min_s = min(scores)
        max_s = max(scores)
        if abs(max_s - min_s) < epsilon:
            return [1.0 for _ in scores]
        return [(s - min_s) / (max_s - min_s) for s in scores]

    @staticmethod
    def sigmoid(scores: List[float]) -> List[float]:
        return [1.0 / (1.0 + math.exp(-s)) for s in scores]

    @staticmethod
    def z_score(scores: List[float], epsilon: float = 1e-9) -> List[float]:
        if not scores:
            return []
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        std_dev = math.sqrt(variance)
        if std_dev < epsilon:
            return [0.0 for _ in scores]
        return [(s - mean) / std_dev for s in scores]


class FusionLayer:
    """
    Framework-independent fusion engine implementing rank-based and score-based combinations.
    """

    def __init__(
        self,
        default_rrf_k: int = 60,
        candidate_pool_size: int = 20,
        normalization_method: str = "min_max"
    ):
        self.default_rrf_k = default_rrf_k
        self.candidate_pool_size = candidate_pool_size
        self.normalization_method = normalization_method

    def normalize(self, scores: List[float], method: Optional[str] = None) -> List[float]:
        m = method or self.normalization_method
        if m == "min_max":
            return ScoreNormalizer.min_max(scores)
        elif m == "sigmoid":
            return ScoreNormalizer.sigmoid(scores)
        elif m == "z_score":
            return ScoreNormalizer.z_score(scores)
        return scores

    def reciprocal_rank_fusion(
        self,
        ranked_lists: List[List[Dict[str, Any]]],
        weights: Optional[List[float]] = None,
        k: Optional[int] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Computes standard Reciprocal Rank Fusion over multiple ranked result lists.
        Formula: RRF(d) = sum_i(weight_i / (k + rank_{i}(d)))
        """
        k_val = k if k is not None else self.default_rrf_k
        num_lists = len(ranked_lists)
        if weights is None:
            weights = [1.0 / num_lists for _ in range(num_lists)] if num_lists > 0 else []

        scores: Dict[str, float] = defaultdict(float)
        items_map: Dict[str, Dict[str, Any]] = {}
        contributing: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        for list_idx, r_list in enumerate(ranked_lists):
            w = weights[list_idx] if list_idx < len(weights) else 1.0
            for rank_idx, item in enumerate(r_list[:self.candidate_pool_size], start=1):
                item_id = item.get("chunk_id") or item.get("id") or str(rank_idx)
                rrf_score = w / (k_val + rank_idx)
                scores[item_id] += rrf_score
                if item_id not in items_map:
                    items_map[item_id] = item
                contributing[item_id].append({
                    "list_index": list_idx,
                    "rank": rank_idx,
                    "rrf_score": rrf_score,
                    "original_score": item.get("score") or item.get("similarity", 0.0)
                })

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        fused_results = []
        for rank_idx, i_id in enumerate(sorted_ids[:top_k], start=1):
            base_item = dict(items_map[i_id])
            fused_score = scores[i_id]
            base_item["rank"] = rank_idx
            base_item["score"] = round(fused_score, 6)
            base_item["fused_score"] = round(fused_score, 6)
            base_item["similarity"] = round(fused_score, 6)
            base_item["retrieval_method"] = "reciprocal_rank_fusion"
            if "metadata" not in base_item:
                base_item["metadata"] = {}
            base_item["metadata"]["contributing_ranks"] = contributing[i_id]
            fused_results.append(base_item)

        return fused_results

    def weighted_rank_fusion(
        self,
        ranked_lists: List[List[Dict[str, Any]]],
        weights: List[float],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Combines multiple normalized score lists using explicit linear weights.
        """
        scores: Dict[str, float] = defaultdict(float)
        items_map: Dict[str, Dict[str, Any]] = {}

        for list_idx, r_list in enumerate(ranked_lists):
            w = weights[list_idx] if list_idx < len(weights) else 1.0
            raw_scores = [float(item.get("score") or item.get("similarity", 0.0)) for item in r_list]
            norm_scores = self.normalize(raw_scores)

            for item, n_s in zip(r_list[:self.candidate_pool_size], norm_scores):
                item_id = item.get("chunk_id") or item.get("id")
                scores[item_id] += w * n_s
                if item_id not in items_map:
                    items_map[item_id] = item

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        fused_results = []
        for rank_idx, i_id in enumerate(sorted_ids[:top_k], start=1):
            base_item = dict(items_map[i_id])
            f_score = scores[i_id]
            base_item["rank"] = rank_idx
            base_item["score"] = round(f_score, 4)
            base_item["fused_score"] = round(f_score, 4)
            base_item["similarity"] = round(f_score, 4)
            base_item["retrieval_method"] = "weighted_rank_fusion"
            fused_results.append(base_item)

        return fused_results

    def deduplicate(
        self,
        results: List[Dict[str, Any]],
        key: str = "chunk_id"
    ) -> List[Dict[str, Any]]:
        """Deduplicates results preserving the highest-ranked instance."""
        seen = set()
        deduped = []
        for r in results:
            val = r.get(key) or r.get("id")
            if val not in seen:
                seen.add(val)
                deduped.append(r)
        return deduped

    def group_by_page(
        self,
        results: List[Dict[str, Any]],
        top_pages: int = 3
    ) -> List[Dict[str, Any]]:
        """Groups chunk-level results by page start/end."""
        pages_map: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
        for r in results:
            p_start = r.get("page_start", 1)
            pages_map[p_start].append(r)

        grouped = []
        for p, chunks in sorted(pages_map.items()):
            max_score = max(c.get("score", c.get("similarity", 0.0)) for c in chunks)
            grouped.append({
                "page": p,
                "max_score": round(max_score, 4),
                "chunks_count": len(chunks),
                "chunks": chunks
            })
        grouped.sort(key=lambda x: x["max_score"], reverse=True)
        return grouped[:top_pages]

    def group_by_section(
        self,
        results: List[Dict[str, Any]],
        top_sections: int = 3
    ) -> List[Dict[str, Any]]:
        """Groups results by section_id or heading."""
        sections_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for r in results:
            sec = r.get("section_id") or r.get("heading") or "General"
            sections_map[sec].append(r)

        grouped = []
        for sec, chunks in sections_map.items():
            max_score = max(c.get("score", c.get("similarity", 0.0)) for c in chunks)
            grouped.append({
                "section": sec,
                "max_score": round(max_score, 4),
                "chunks_count": len(chunks),
                "chunks": chunks
            })
        grouped.sort(key=lambda x: x["max_score"], reverse=True)
        return grouped[:top_sections]

    def group_child_to_parent(
        self,
        child_results: List[Dict[str, Any]],
        parents_dict: Dict[str, Dict[str, Any]],
        children_dict: Dict[str, Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Groups child leaf chunks into parent context units with deterministic tie-breaking.
        """
        parent_groups_map = {}
        for c in child_results:
            cid = c.get("chunk_id") or c.get("id")
            if cid not in children_dict:
                continue
            c_info = children_dict[cid]
            p_id = c_info["parent_id"]

            if p_id not in parent_groups_map:
                parent_groups_map[p_id] = {
                    "parent_id": p_id,
                    "parent_obj": parents_dict.get(p_id, {}),
                    "contributing_children": [],
                    "max_fused_score": -999.0,
                    "earliest_doc_pos": 9999
                }

            score = float(c.get("score") or c.get("similarity") or c.get("fused_score", 0.0))
            parent_groups_map[p_id]["contributing_children"].append(c)
            if score > parent_groups_map[p_id]["max_fused_score"]:
                parent_groups_map[p_id]["max_fused_score"] = score
            if c_info.get("position_in_document", 9999) < parent_groups_map[p_id]["earliest_doc_pos"]:
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
                "doc_id": p_obj.get("source_id", ""),
                "chunk_id": p_item["parent_id"],
                "parent_id": p_item["parent_id"],
                "id": p_item["parent_id"],
                "title": p_obj.get("document_title", ""),
                "heading": p_obj.get("section_heading", ""),
                "content": p_obj.get("parent_content", ""),
                "score": round(float(p_item["max_fused_score"]), 4),
                "similarity": round(float(p_item["max_fused_score"]), 4),
                "fused_score": round(float(p_item["max_fused_score"]), 4),
                "contributing_children": p_item["contributing_children"],
                "evidence_type": "TEXT",
                "retrieval_method": "child_parent_grouping",
                "metadata": {
                    "source_id": p_obj.get("source_id", ""),
                    "section_id": p_obj.get("section_id", ""),
                    "num_child_hits": len(p_item["contributing_children"]),
                    "parent_token_count": p_obj.get("parent_token_count", 0)
                }
            }
            top_results.append(res)

        return top_results
