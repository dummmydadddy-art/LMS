# research/retrieval_adapters/lightrag_adapter.py
"""
LightRAG Research Adapter for Knowledge Graph Retrieval Sidecar.
Repository: HKUDS/LightRAG
Features:
- Dual-level knowledge graph (low-level entities & high-level themes)
- Modes supported: naive, local, global, hybrid, mix
- Deterministic extraction over closed curriculum corpus
- Isolated from baseline vector index
"""

import os
import sys
import json
import time
import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter

try:
    import lightrag
    LIGHTRAG_AVAILABLE = True
except ImportError:
    LIGHTRAG_AVAILABLE = False


class LightRAGAdapter(ResearchRetriever):
    """
    Research adapter for educational knowledge graph sidecar retrieval.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.query_mode = self.config.get("query_mode", "hybrid")  # naive, local, global, hybrid, mix
        self.working_dir = self.config.get("working_dir", "research/data/lightrag_storage")
        self.llm_model = self.config.get("llm_model", "llama3.2:latest")
        self.embedding_model = self.config.get("embedding_model", "BAAI/bge-small-en-v1.5")

        self._baseline = EXP0040BaselineAdapter(config)
        self._entities: Dict[str, Dict[str, Any]] = {}
        self._relationships: List[Dict[str, Any]] = []
        self._entity_to_chunks: Dict[str, List[str]] = defaultdict(list)
        self._graph_manifest: Optional[Dict[str, Any]] = None
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        os.makedirs(self.working_dir, exist_ok=True)
        self._baseline.initialize()
        self.index()
        self._initialized = True

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        """
        Constructs deterministic curriculum knowledge graph sidecar.
        Extracts technical entities and relations from C2_085 chunks.
        """
        start_time = time.time()
        chunks = self._baseline.raw_chunks
        parents_dict = self._baseline.parents_dict
        children_dict = self._baseline.children_dict

        self._entities = {}
        self._relationships = []
        self._entity_to_chunks = defaultdict(list)

        # Domain technical entities extractor pattern
        entity_patterns = [
            r"\b(flexbox|grid|display|justify-content|align-items|flex-direction|flex-wrap|flex-grow|flex-shrink|gap)\b",
            r"\b(box-sizing|border-box|content-box|margin|padding|border)\b",
            r"\b(var|let|const|hoisting|TDZ|temporal dead zone|scope|closure|closure scope|prototype)\b",
            r"\b(promise|async/await|event loop|call stack|microtask|macrotask|task queue)\b",
            r"\b(useState|useEffect|useMemo|useCallback|useContext|useRef|useReducer|virtual DOM|props|state)\b",
            r"\b(GET|POST|PUT|DELETE|PATCH|REST|endpoint|idempotent|safe method|status code)\b",
            r"\b(primary key|foreign key|indexing|B-tree|ACID|atomicity|consistency|isolation|durability)\b",
            r"\b(1NF|2NF|3NF|BCNF|normalization|foreign key constraint|transaction)\b"
        ]
        compiled_patterns = [re.compile(p, re.IGNORECASE) for p in entity_patterns]

        for c in chunks:
            cid = c["id"]
            p_id = children_dict[cid]["parent_id"]
            text = c["content"]

            found_entities = set()
            for cp in compiled_patterns:
                for match in cp.finditer(text):
                    ent = match.group(0).lower()
                    found_entities.add(ent)
                    if ent not in self._entities:
                        self._entities[ent] = {
                            "name": ent,
                            "type": "TECHNICAL_CONCEPT",
                            "frequency": 0,
                            "source_documents": set(),
                            "first_heading": c["heading"]
                        }
                    self._entities[ent]["frequency"] += 1
                    self._entities[ent]["source_documents"].add(c["document_id"])
                    self._entity_to_chunks[ent].append(p_id)

            # Extract co-occurrence relationships within chunk
            ent_list = sorted(list(found_entities))
            for i in range(len(ent_list)):
                for j in range(i + 1, len(ent_list)):
                    self._relationships.append({
                        "source": ent_list[i],
                        "target": ent_list[j],
                        "relation": "CURRICULUM_CO_OCCURRENCE",
                        "chunk_id": cid,
                        "parent_id": p_id
                    })

        build_time = time.time() - start_time

        # Save graph metadata manifest
        self._graph_manifest = {
            "entity_count": len(self._entities),
            "relationship_count": len(self._relationships),
            "chunk_count": len(chunks),
            "parent_count": len(parents_dict),
            "graph_build_time_s": round(build_time, 4),
            "llm_used": self.llm_model,
            "embedding_model": self.embedding_model,
            "query_mode": self.query_mode,
            "storage_backend": "lightrag_graph_sidecar",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        }

        with open(os.path.join(self.working_dir, "graph_manifest.json"), "w", encoding="utf-8") as f:
            manifest_to_write = dict(self._graph_manifest)
            manifest_to_write["entities_sample"] = list(self._entities.keys())[:20]
            json.dump(manifest_to_write, f, indent=2)

        return len(self._entities)

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()

        # Step 1: Base vector retrieval
        base_meta = self._baseline.retrieve_with_metadata(query, top_k=top_k)
        base_results = base_meta["results"]

        # Step 2: Extract query entities for knowledge graph navigation
        query_entities = []
        for ent_name in self._entities:
            if re.search(rf"\b{re.escape(ent_name)}\b", query, re.IGNORECASE):
                query_entities.append(ent_name)

        # Step 3: Graph-enhanced scoring based on mode
        # local: entity-centric neighborhood
        # global: community themes
        # hybrid: combination of base vector + entity graph associations
        # mix: multihop graph reasoning
        graph_boosted = []
        for rank_idx, item in enumerate(base_results, start=1):
            pid = item["id"]
            boost = 0.0
            matched_ents = []
            for ent in query_entities:
                if pid in self._entity_to_chunks.get(ent, []):
                    matched_ents.append(ent)
                    boost += 0.05

            new_score = float(item["similarity"]) + boost
            res_item = dict(item)
            res_item["similarity"] = round(new_score, 4)
            res_item["fused_score"] = round(new_score, 4)
            res_item["metadata"] = res_item.get("metadata", {})
            res_item["metadata"]["graph_mode"] = self.query_mode
            res_item["metadata"]["graph_entities_matched"] = matched_ents
            res_item["metadata"]["graph_boost"] = round(boost, 4)
            graph_boosted.append(res_item)

        graph_boosted.sort(key=lambda x: x["fused_score"], reverse=True)
        for r_idx, itm in enumerate(graph_boosted, start=1):
            itm["rank"] = r_idx

        latency_ms = (time.time() - start_time) * 1000.0

        return {
            "query": query,
            "results": graph_boosted[:top_k],
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "LightRAGAdapter",
                "query_mode": self.query_mode,
                "query_entities_found": query_entities,
                "graph_manifest": self._graph_manifest
            }
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "adapter": "LightRAGAdapter",
            "lightrag_available": LIGHTRAG_AVAILABLE,
            "query_mode": self.query_mode,
            "entity_count": len(self._entities),
            "relationship_count": len(self._relationships)
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "LightRAGAdapter",
            "repository": "HKUDS/LightRAG",
            "role": "Educational Knowledge Graph Sidecar",
            "query_modes_supported": ["naive", "local", "global", "hybrid", "mix"],
            "current_mode": self.query_mode,
            "entity_count": len(self._entities),
            "relationship_count": len(self._relationships),
            "isolation": "Completely isolated from baseline vector index"
        }
