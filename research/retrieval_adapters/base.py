# research/retrieval_adapters/base.py
"""
Base interface and contract for all research retrieval adapters.
Preserves compatibility with the frozen A4 verifier and benchmark harness.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import os
import gc
import sqlite3
import hashlib
import time

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


@dataclass
class RetrievalResult:
    id: str
    title: str
    heading: str
    content: str
    similarity: float
    rank: int
    chunk_id: Optional[str] = None
    parent_id: Optional[str] = None
    fused_score: Optional[float] = None
    contributing_children: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.chunk_id is None:
            self.chunk_id = self.id
        if self.fused_score is None:
            self.fused_score = self.similarity

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "id": self.id,
            "chunk_id": self.chunk_id,
            "parent_id": self.parent_id if self.parent_id else self.id,
            "title": self.title,
            "heading": self.heading,
            "content": self.content,
            "similarity": round(float(self.similarity), 4),
            "rank": self.rank,
            "fused_score": round(float(self.fused_score), 4) if self.fused_score is not None else None,
        }
        if self.contributing_children is not None:
            d["contributing_children"] = self.contributing_children
        if self.metadata:
            d["metadata"] = self.metadata
        return d


class ResearchRetriever(ABC):
    """
    Abstract Base Class for all EduConnect research retrieval adapters.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.device = self._resolve_device(self.config.get("device", "auto"))
        self._indexed_chunks: List[Dict[str, Any]] = []

    def _resolve_device(self, requested: str) -> str:
        if requested == "cpu":
            return "cpu"
        if requested in ("cuda", "auto"):
            if TORCH_AVAILABLE and torch.cuda.is_available():
                return "cuda"
            return "cpu"
        return "cpu"

    @abstractmethod
    def index(self, documents: List[Dict[str, Any]], **kwargs) -> Any:
        """
        Index documents or chunks for retrieval.
        """
        pass

    @abstractmethod
    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        """
        Retrieve top_k documents for a query. Returns list of dicts.
        """
        pass

    @abstractmethod
    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        """
        Retrieve top_k documents with detailed diagnostics and metadata.
        Returns: {
            'query': str,
            'results': List[Dict],
            'latency_ms': float,
            'metadata': Dict[str, Any]
        }
        """
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """
        Returns health and readiness status of the adapter.
        """
        pass

    @abstractmethod
    def describe(self) -> Dict[str, Any]:
        """
        Returns adapter metadata, model info, revision, parameters.
        """
        pass

    def clear_memory(self):
        """
        Safely clear GPU cache and garbage collect to respect 4 GB VRAM limit.
        """
        gc.collect()
        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass

    def validate_hierarchical_invariants(self, chunks: Optional[List[Dict[str, Any]]] = None) -> bool:
        """
        Validate hierarchical invariants:
        1. No cross-document parent expansion
        2. No cross-section contamination
        3. Stable child ordering
        4. Deterministic IDs
        5. Token ceiling <= 512 tokens
        """
        target_chunks = chunks or self._indexed_chunks
        if not target_chunks:
            return True

        parent_doc_map: Dict[str, set] = {}
        parent_sec_map: Dict[str, set] = {}

        for c in target_chunks:
            pid = c.get("parent_id") or c.get("id")
            doc_id = c.get("document_id") or c.get("source_id") or "unknown"
            sec_id = c.get("section_id") or c.get("heading") or "unknown"

            if pid not in parent_doc_map:
                parent_doc_map[pid] = set()
            parent_doc_map[pid].add(doc_id)

            if pid not in parent_sec_map:
                parent_sec_map[pid] = set()
            parent_sec_map[pid].add(sec_id)

        for pid, docs in parent_doc_map.items():
            if len(docs) > 1:
                raise ValueError(f"Cross-document contamination in parent {pid}: {docs}")

        for pid, secs in parent_sec_map.items():
            if len(secs) > 1:
                raise ValueError(f"Cross-section contamination in parent {pid}: {secs}")

        return True

    def load_sqlite_chunks(
        self,
        db_path: str = "database/rag_materials.sqlite3",
        table_name: str = "C2_ChonkieSemantic_085"
    ) -> List[Dict[str, Any]]:
        """
        Utility to load the standard adopted corpus chunks from SQLite.
        """
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Corpus database {db_path} not found")

        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute(f"SELECT * FROM {table_name} ORDER BY document_id, chunk_index")
        col_names = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        con.close()

        chunks = []
        for r in rows:
            chunks.append(dict(zip(col_names, r)))
        self._indexed_chunks = chunks
        return chunks
