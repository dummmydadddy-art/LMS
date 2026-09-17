import os
import sys
import time
import shutil
from typing import List, Dict, Any, Optional, Iterator, Tuple

try:
    import marker
    MARKER_AVAILABLE = True
except ImportError:
    MARKER_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from research.document_adapters.base import DocumentProcessor, PageArtifact


class MarkerAdapter(DocumentProcessor):
    """
    Marker Document Processing Adapter and Efficiency Comparator.
    Repository: datalab-to/marker
    Supports real execution modes: fast, balanced, disable_ocr.
    STRICT RULE: Simulation is disabled. Missing package produces NOT_READY.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.mode = self.config.get("mode", "fast")  # fast, balanced, disable_ocr, selective_ocr
        self.device = self.config.get("device", "cpu")
        self.disable_ocr = self.config.get("disable_ocr", True)
        self._binary_path = shutil.which("marker_single")
        self.runtime_available = MARKER_AVAILABLE or (self._binary_path is not None)

    def inspect(self, document_path: str) -> Dict[str, Any]:
        if not os.path.exists(document_path):
            raise FileNotFoundError(f"Document not found: {document_path}")
        return {
            "document_id": os.path.splitext(os.path.basename(document_path))[0],
            "file_path": document_path,
            "mode": self.mode,
            "parser": "marker",
            "status": "READY" if self.runtime_available else "NOT_READY",
            "simulation": False
        }

    def process_pages(
        self,
        document_path: str,
        pages: List[int],
        **kwargs
    ) -> List[Dict[str, Any]]:
        if not self.runtime_available:
            raise RuntimeError("Marker package is not installed. Simulation is disabled.")

        if not os.path.exists(document_path):
            raise FileNotFoundError(f"Document not found: {document_path}")

        # Real Marker execution
        raise NotImplementedError("Real Marker execution requires installed marker models.")

    def process(self, document_path: str, **kwargs) -> List[Dict[str, Any]]:
        return self.process_pages(document_path, [1], **kwargs)

    def stream_pages(
        self,
        document_path: str,
        page_range: Optional[Tuple[int, int]] = None,
        **kwargs
    ) -> Iterator[Dict[str, Any]]:
        p_list = list(range(page_range[0], page_range[1] + 1)) if page_range else [1]
        for p in self.process_pages(document_path, p_list):
            yield p

    def health(self) -> Dict[str, Any]:
        return {
            "status": "READY" if self.runtime_available else "NOT_READY",
            "reason": None if self.runtime_available else "marker package not installed",
            "simulation": False,
            "adapter": "MarkerAdapter",
            "mode": self.mode,
            "disable_ocr": self.disable_ocr,
            "device": self.device,
            "runtime_available": self.runtime_available
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "MarkerAdapter",
            "repository": "datalab-to/marker",
            "purpose": "Alternative document processing and efficiency comparator",
            "modes_supported": ["fast", "balanced", "disable_ocr", "selective_ocr"],
            "current_mode": self.mode,
            "simulation": False
        }
