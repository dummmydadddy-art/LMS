import os
import json
import re
import hashlib
import time
from typing import Dict, Any, List, Optional, Tuple

try:
    import pageindex
    PAGEINDEX_AVAILABLE = True
except ImportError:
    PAGEINDEX_AVAILABLE = False


class PageIndexNode:
    def __init__(
        self,
        node_id: str,
        node_title: str,
        page_start: int,
        page_end: int,
        section: str,
        document_id: str,
        parent_node: Optional[str] = None
    ):
        self.node_id = node_id
        self.node_title = node_title
        self.page_start = page_start
        self.page_end = page_end
        self.section = section
        self.document_id = document_id
        self.parent_node = parent_node
        self.children: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "node_title": self.node_title,
            "parent_node": self.parent_node,
            "children": self.children,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "section": self.section,
            "document_id": self.document_id
        }


class PageIndexAdapter:
    """
    Local structural navigation adapter for PageIndex hierarchy.
    Repository: VectifyAI/PageIndex
    Purely local tree navigation. Zero cloud API calls, zero web search.
    Removes all fabricated outlines. Missing SDK reports NOT_READY.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.nodes: Dict[str, PageIndexNode] = {}
        self.root_nodes: List[str] = []
        self.tree_metadata: Dict[str, Any] = {}
        self._initialized = False

    def build_tree(
        self,
        document_path: str,
        structure_outline: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Builds structural tree from actual document outline or via PageIndex SDK.
        Does NOT invent synthetic chapters if no outline or SDK is available.
        """
        start_t = time.time()
        doc_id = os.path.splitext(os.path.basename(document_path))[0]

        if structure_outline is None:
            if not PAGEINDEX_AVAILABLE:
                raise RuntimeError(
                    "PageIndex SDK (pageindex) is not installed and no document outline was provided. "
                    "Simulation is disabled."
                )
            # Invoke real PageIndex SDK when available
            # tree_data = pageindex.build_tree(document_path)
            raise NotImplementedError("Local PageIndex SDK tree builder requires PageIndex model configuration.")

        self.nodes = {}
        self.root_nodes = []
        covered_pages = set()

        current_parent_at_level: Dict[int, str] = {}
        for idx, item in enumerate(structure_outline, start=1):
            lvl = item.get("level", 1)
            node_id = f"NODE_{doc_id[:6]}_{idx:03d}"
            title = item.get("title", f"Section {idx}")
            p_start = int(item.get("start", 1))
            p_end = int(item.get("end", p_start))

            for p in range(p_start, p_end + 1):
                covered_pages.add(p)

            parent_id = current_parent_at_level.get(lvl - 1)
            node = PageIndexNode(
                node_id=node_id,
                node_title=title,
                page_start=p_start,
                page_end=p_end,
                section=title,
                document_id=doc_id,
                parent_node=parent_id
            )
            self.nodes[node_id] = node

            if parent_id and parent_id in self.nodes:
                self.nodes[parent_id].children.append(node_id)
            else:
                self.root_nodes.append(node_id)

            current_parent_at_level[lvl] = node_id

        build_time_ms = (time.time() - start_t) * 1000.0
        serialized = json.dumps([n.to_dict() for n in self.nodes.values()], sort_keys=True)
        tree_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        self.tree_metadata = {
            "document_id": doc_id,
            "tree_hash": tree_hash,
            "node_count": len(self.nodes),
            "root_count": len(self.root_nodes),
            "page_coverage": len(covered_pages),
            "build_time_ms": round(build_time_ms, 2)
        }
        self._initialized = True
        return self.tree_metadata

    def load_tree(self, tree_data: List[Dict[str, Any]], document_id: str = "doc") -> Dict[str, Any]:
        """Loads a pre-computed or extracted tree without simulation."""
        start_t = time.time()
        self.nodes = {}
        self.root_nodes = []
        covered_pages = set()

        for item in tree_data:
            nid = item["node_id"]
            node = PageIndexNode(
                node_id=nid,
                node_title=item.get("node_title", ""),
                page_start=item.get("page_start", 1),
                page_end=item.get("page_end", 1),
                section=item.get("section", ""),
                document_id=item.get("document_id", document_id),
                parent_node=item.get("parent_node")
            )
            node.children = item.get("children", [])
            self.nodes[nid] = node
            if not node.parent_node:
                self.root_nodes.append(nid)
            for p in range(node.page_start, node.page_end + 1):
                covered_pages.add(p)

        build_time_ms = (time.time() - start_t) * 1000.0
        serialized = json.dumps(tree_data, sort_keys=True)
        tree_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        self.tree_metadata = {
            "document_id": document_id,
            "tree_hash": tree_hash,
            "node_count": len(self.nodes),
            "root_count": len(self.root_nodes),
            "page_coverage": len(covered_pages),
            "build_time_ms": round(build_time_ms, 2)
        }
        self._initialized = True
        return self.tree_metadata

    def search_tree(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search structural tree for relevant chapter/section and return page ranges.
        """
        start_t = time.time()
        if not self._initialized or not self.nodes:
            return []

        query_words = set(re.findall(r"\b\w+\b", query.lower()))
        scored_nodes = []

        for nid, node in self.nodes.items():
            title_words = set(re.findall(r"\b\w+\b", node.node_title.lower()))
            overlap = len(query_words.intersection(title_words))
            if overlap > 0:
                scored_nodes.append((node, overlap))

        scored_nodes.sort(key=lambda x: (x[1], -(x[0].page_end - x[0].page_start)), reverse=True)

        results = []
        for n, score in scored_nodes[:top_k]:
            results.append({
                "node_id": n.node_id,
                "node_title": n.node_title,
                "page_range": (n.page_start, n.page_end),
                "section": n.section,
                "relevance_score": score,
                "document_id": n.document_id,
                "query_latency_ms": round((time.time() - start_t) * 1000.0, 2)
            })

        return results

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        node = self.nodes.get(node_id)
        return node.to_dict() if node else None

    def get_page_range(self, node_id: str) -> Optional[Tuple[int, int]]:
        node = self.nodes.get(node_id)
        if node:
            return (node.page_start, node.page_end)
        return None

    def health(self) -> Dict[str, Any]:
        return {
            "status": "READY" if PAGEINDEX_AVAILABLE else "NOT_READY",
            "reason": None if PAGEINDEX_AVAILABLE else "PageIndex Python package (pageindex) not installed",
            "simulation": False,
            "adapter": "PageIndexAdapter",
            "local_only": True,
            "cloud_disabled": True,
            "sdk_installed": PAGEINDEX_AVAILABLE,
            "total_nodes_loaded": len(self.nodes)
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "PageIndexAdapter",
            "repository": "VectifyAI/PageIndex",
            "purpose": "Structural navigation through long documents to identify bounded page windows",
            "execution_mode": "STRICTLY LOCAL (Zero cloud, zero telemetry, zero web search)",
            "node_schema": ["node_id", "node_title", "parent_node", "children", "page_start", "page_end", "section", "document_id"],
            "simulation": False
        }
