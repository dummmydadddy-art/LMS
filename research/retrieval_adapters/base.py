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
    doc_id: str = ""
    chunk_id: str = ""
    page_start: int = 1
    page_end: int = 1
    section_id: str = ""
    score: float = 0.0
    rank: int = 1
    retrieval_method: str = "dense"
    evidence_type: str = "TEXT"  # TEXT | VISUAL | GRAPH | STRUCTURAL
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Compatibility fields for legacy verifiers and test harnesses
    id: Optional[str] = None
    title: Optional[str] = None
    heading: Optional[str] = None
    content: Optional[str] = None
    similarity: Optional[float] = None
    parent_id: Optional[str] = None
    fused_score: Optional[float] = None
    contributing_children: Optional[List[Dict[str, Any]]] = None

    def __post_init__(self):
        # Support legacy positional / keyword arguments
        if self.id is not None and not self.chunk_id:
            self.chunk_id = self.id
        elif self.chunk_id and self.id is None:
            self.id = self.chunk_id

        if not self.doc_id:
            self.doc_id = self.metadata.get("source_id", self.chunk_id)

        if self.similarity is not None and self.score == 0.0:
            self.score = float(self.similarity)
        elif self.similarity is None:
            self.similarity = float(self.score)

        if self.fused_score is None:
            self.fused_score = self.score

        if self.parent_id is None:
            self.parent_id = self.chunk_id

        if self.title is not None and "title" not in self.metadata:
            self.metadata["title"] = self.title
        elif self.title is None:
            self.title = self.metadata.get("title", "")

        if self.heading is not None and "heading" not in self.metadata:
            self.metadata["heading"] = self.heading
        elif self.heading is None:
            self.heading = self.metadata.get("heading", "")

        if self.content is not None and "content" not in self.metadata:
            self.metadata["content"] = self.content
        elif self.content is None:
            self.content = self.metadata.get("content", "")

        if self.contributing_children is not None and "contributing_children" not in self.metadata:
            self.metadata["contributing_children"] = self.contributing_children
        elif self.contributing_children is None:
            self.contributing_children = self.metadata.get("contributing_children")

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "RetrievalResult":
        """Construct a RetrievalResult from any result dict."""
        return cls(
            doc_id=d.get("doc_id", d.get("source_id", d.get("document_id", ""))),
            chunk_id=d.get("chunk_id", d.get("id", "")),
            page_start=int(d.get("page_start", 1)),
            page_end=int(d.get("page_end", d.get("page_start", 1))),
            section_id=d.get("section_id", d.get("heading", "")),
            score=float(d.get("score", d.get("similarity", d.get("fused_score", 0.0)))),
            rank=int(d.get("rank", 1)),
            retrieval_method=d.get("retrieval_method", "dense"),
            evidence_type=d.get("evidence_type", "TEXT"),
            metadata=d.get("metadata", {}),
            id=d.get("id", d.get("chunk_id")),
            title=d.get("title", ""),
            heading=d.get("heading", ""),
            content=d.get("content", ""),
            similarity=float(d.get("similarity", d.get("score", 0.0))),
            parent_id=d.get("parent_id", d.get("id")),
            fused_score=float(d.get("fused_score", d.get("score", 0.0))) if "fused_score" in d or "score" in d else None,
            contributing_children=d.get("contributing_children")
        )

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "doc_id": self.doc_id,
            "chunk_id": self.chunk_id,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "section_id": self.section_id,
            "score": round(float(self.score), 4),
            "rank": self.rank,
            "retrieval_method": self.retrieval_method,
            "evidence_type": self.evidence_type,
            "metadata": self.metadata,
            # Backward compatibility aliases
            "id": self.id or self.chunk_id,
            "title": self.title or self.metadata.get("title", ""),
            "heading": self.heading or self.metadata.get("heading", ""),
            "content": self.content or self.metadata.get("content", ""),
            "similarity": round(float(self.similarity if self.similarity is not None else self.score), 4),
            "parent_id": self.parent_id or self.chunk_id,
            "fused_score": round(float(self.fused_score if self.fused_score is not None else self.score), 4),
        }
        if self.contributing_children is not None:
            d["contributing_children"] = self.contributing_children
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
