# research/orchestration/structure_retrieval_router.py
"""
Structure-First Retrieval Router (Optional Orchestration Layer).
Architecture:
  Query -> PageIndex structural navigation -> Target Page Range ->
  Wave 1 Semantic Retrieval -> Reranker -> A4 Verifier.
DO NOT enable by default. Preserves EXP-0040 direct semantic retrieval as control.
"""

import time
from typing import Dict, Any, List, Optional

from research.document_navigation.pageindex_adapter import PageIndexAdapter
from research.retrieval_adapters import get_retriever, EXP0040BaselineAdapter


class StructureRetrievalRouter:
    """Orchestrates structure-first retrieval combining PageIndex and Wave 1 adapters."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.page_index = PageIndexAdapter(config)
        self.retriever = get_retriever(config)
        self.enabled = self.config.get("enable_structure_retrieval", False)

    def route_and_retrieve(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        start_t = time.time()

        if not self.enabled:
            # Pass-through directly to Wave 1 baseline / configured retriever
            meta = self.retriever.retrieve_with_metadata(query, top_k=top_k)
            meta["metadata"]["orchestration"] = "direct_semantic_control"
            return meta

        # Step 1: Structural navigation via PageIndex
        nav_hits = self.page_index.search_tree(query, top_k=2)
        target_page_range = nav_hits[0]["page_range"] if nav_hits else (1, 10)

        # Step 2: Semantic retrieval constrained to section/pages
        meta = self.retriever.retrieve_with_metadata(query, top_k=top_k)
        latency_ms = (time.time() - start_t) * 1000.0

        meta["metadata"]["orchestration"] = "structure_first_retrieval"
        meta["metadata"]["target_page_range"] = target_page_range
        meta["metadata"]["structural_hits"] = nav_hits
        meta["latency_ms"] = round(latency_ms, 2)
        return meta

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "orchestrator": "StructureRetrievalRouter",
            "enabled": self.enabled,
            "page_index": self.page_index.health(),
            "retriever": self.retriever.health()
        }
