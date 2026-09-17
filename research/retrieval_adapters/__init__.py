# research/retrieval_adapters/__init__.py
"""
Retrieval Adapters Registry and Factory for EduConnect-LMS Research.
Enforces Rule 12: The current adopted system (EXP-0040) MUST remain the default
when all research flags are disabled.
"""

from typing import Dict, Any, Optional

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter
from research.retrieval_adapters.bge_flag_adapter import BGEFlagAdapter
from research.retrieval_adapters.qdrant_adapter import QdrantAdapter
from research.retrieval_adapters.pylate_adapter import PyLateAdapter
from research.retrieval_adapters.llamaindex_adapter import LlamaIndexAdapter
from research.retrieval_adapters.haystack_hierarchy_adapter import HaystackHierarchyAdapter
from research.retrieval_adapters.crag_adapter import CRAGAdapter
from research.retrieval_adapters.lightrag_adapter import LightRAGAdapter

ADAPTER_REGISTRY = {
    "exp0040": EXP0040BaselineAdapter,
    "baseline": EXP0040BaselineAdapter,
    "bge_flag": BGEFlagAdapter,
    "flagembedding": BGEFlagAdapter,
    "qdrant": QdrantAdapter,
    "pylate": PyLateAdapter,
    "llamaindex": LlamaIndexAdapter,
    "haystack": HaystackHierarchyAdapter,
    "crag": CRAGAdapter,
    "lightrag": LightRAGAdapter,
}


def get_retriever(config: Optional[Dict[str, Any]] = None) -> ResearchRetriever:
    """
    Instantiate a research retriever based on configuration and feature flags.
    If no feature flags are enabled, strictly returns EXP0040BaselineAdapter.
    """
    cfg = config or {}
    flags = cfg.get("feature_flags", {})

    # Check feature flags (case-insensitive)
    flag_bge_m3 = flags.get("ENABLE_BGE_M3", flags.get("enable_bge_m3", False))
    flag_bge_reranker_m3 = flags.get("ENABLE_BGE_RERANKER_M3", flags.get("enable_bge_reranker_m3", False))
    flag_qdrant = flags.get("ENABLE_QDRANT", flags.get("enable_qdrant", False))
    flag_pylate = flags.get("ENABLE_PYLATE", flags.get("enable_pylate", False))
    flag_llamaindex = flags.get("ENABLE_LLAMAINDEX_FUSION", flags.get("enable_llamaindex_fusion", False))
    flag_haystack = flags.get("ENABLE_HAYSTACK_HIERARCHY", flags.get("enable_haystack_hierarchy", False))
    flag_crag = flags.get("ENABLE_CRAG", flags.get("enable_crag", False))
    flag_lightrag = flags.get("ENABLE_LIGHTRAG", flags.get("enable_lightrag", False))

    # Feature-flagged routing
    if flag_bge_reranker_m3:
        sub_cfg = dict(cfg)
        sub_cfg["mode"] = "reranker"
        return BGEFlagAdapter(sub_cfg)

    if flag_bge_m3:
        sub_cfg = dict(cfg)
        sub_cfg["mode"] = cfg.get("retrieval", {}).get("mode", "dense")
        return BGEFlagAdapter(sub_cfg)

    if flag_qdrant:
        return QdrantAdapter(cfg)

    if flag_pylate:
        return PyLateAdapter(cfg)

    if flag_llamaindex:
        return LlamaIndexAdapter(cfg)

    if flag_haystack:
        return HaystackHierarchyAdapter(cfg)

    if flag_crag:
        return CRAGAdapter(cfg)

    if flag_lightrag:
        return LightRAGAdapter(cfg)

    # Explicit adapter name fallback if specified in config
    retriever_name = cfg.get("retriever") or cfg.get("retrieval", {}).get("backend", "exp0040")
    adapter_cls = ADAPTER_REGISTRY.get(str(retriever_name).lower(), EXP0040BaselineAdapter)
    return adapter_cls(cfg)


__all__ = [
    "ResearchRetriever",
    "RetrievalResult",
    "EXP0040BaselineAdapter",
    "BGEFlagAdapter",
    "QdrantAdapter",
    "PyLateAdapter",
    "LlamaIndexAdapter",
    "HaystackHierarchyAdapter",
    "CRAGAdapter",
    "LightRAGAdapter",
    "get_retriever",
    "ADAPTER_REGISTRY"
]
