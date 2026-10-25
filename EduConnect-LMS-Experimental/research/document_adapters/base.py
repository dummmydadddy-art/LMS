# research/document_adapters/base.py
"""
Base interface for document processing adapters in Wave 2.
Supports streaming ingestion, page-window processing, and selective visual inspection.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Iterator, Tuple
import os
import time


@dataclass
class PageArtifact:
    document_id: str
    page_number: int
    section_id: str
    heading: str
    text: str
    tables: List[Dict[str, Any]] = field(default_factory=list)
    figures: List[Dict[str, Any]] = field(default_factory=list)
    equations: List[str] = field(default_factory=list)
    source_path: str = ""
    parser: str = "base"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "page_number": self.page_number,
            "section_id": self.section_id,
            "heading": self.heading,
            "text": self.text,
            "tables": self.tables,
            "figures": self.figures,
            "equations": self.equations,
            "source_path": self.source_path,
            "parser": self.parser,
            "metadata": self.metadata
        }


class DocumentProcessor(ABC):
    """Abstract base class for all Wave 2 document parsers and engines."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.metrics: Dict[str, Any] = {
            "pages_processed": 0,
            "pages_skipped": 0,
            "conversion_time_ms": 0.0,
            "peak_process_memory_mb": 0.0,
            "page_processing_latency": [],
            "output_size_mb": 0.0
        }

    @abstractmethod
    def inspect(self, document_path: str) -> Dict[str, Any]:
        """Inspect document metadata without full decoding (page count, title, format)."""
        pass

    @abstractmethod
    def process(self, document_path: str, **kwargs) -> List[Dict[str, Any]]:
        """Process the entire document (use with caution on large PDFs)."""
        pass

    @abstractmethod
    def process_pages(self, document_path: str, pages: List[int], **kwargs) -> List[Dict[str, Any]]:
        """Process strictly the requested page numbers, skipping all others."""
        pass

    @abstractmethod
    def stream_pages(
        self,
        document_path: str,
        page_range: Optional[Tuple[int, int]] = None,
        **kwargs
    ) -> Iterator[Dict[str, Any]]:
        """Yield page records sequentially without buffering the entire document in RAM."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return parser readiness, binary presence, and runtime dependencies."""
        pass

    @abstractmethod
    def describe(self) -> Dict[str, Any]:
        """Return parser description, version, supported formats, and capabilities."""
        pass
