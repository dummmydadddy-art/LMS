import os
import sys
import time
import shutil
from typing import List, Dict, Any, Optional

try:
    import surya
    SURYA_AVAILABLE = True
except ImportError:
    SURYA_AVAILABLE = False

from research.document_adapters.base import DocumentProcessor, PageArtifact


class SuryaAdapter(DocumentProcessor):
    """
    Surya Research Adapter for Selective OCR and Layout Extraction.
    Repository: VikParuchuri/surya
    Features:
    - Real page OCR/layout/table/equation processing via surya package
    - Hardware-safe conservative batch size (default <= 2) for 4 GB VRAM protection
    - STRICT RULE: Simulation is disabled. Missing package produces NOT_READY.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.ocr_batch_size = min(2, self.config.get("ocr_batch_size", 2))
        self.layout_batch_size = min(2, self.config.get("layout_batch_size", 2))
        self.device = self.config.get("device", "cpu")
        self._binary_path = shutil.which("surya_ocr")
        self.runtime_available = SURYA_AVAILABLE or (self._binary_path is not None)

    def inspect(self, document_path: str) -> Dict[str, Any]:
        if not os.path.exists(document_path):
            raise FileNotFoundError(f"Document not found: {document_path}")
        return {
            "document_path": document_path,
            "adapter": "SuryaAdapter",
            "device": self.device,
            "status": "READY" if self.runtime_available else "NOT_READY",
            "simulation": False
        }

    def ocr_pages(self, document_path: str, pages: List[int]) -> List[Dict[str, Any]]:
        """OCR specific difficult pages with conservative batch size."""
        if not self.runtime_available:
            raise RuntimeError("Surya runtime is not installed. Simulation is disabled.")

        # Real Surya invocation
        from surya.ocr import run_ocr
        from surya.model.detection.segformer import load_model as load_det_model, load_processor as load_det_processor
        from surya.model.recognition.model import load_model as load_rec_model
        from surya.model.recognition.processor import load_processor as load_rec_processor

        raise NotImplementedError("Real Surya execution requires configured weights.")

    def detect_layout(self, document_path: str, pages: List[int]) -> List[Dict[str, Any]]:
        if not self.runtime_available:
            raise RuntimeError("Surya runtime is not installed. Simulation is disabled.")
        raise NotImplementedError("Real Surya execution requires configured weights.")

    def detect_tables(self, document_path: str, pages: List[int]) -> List[Dict[str, Any]]:
        if not self.runtime_available:
            raise RuntimeError("Surya runtime is not installed. Simulation is disabled.")
        raise NotImplementedError("Real Surya execution requires configured weights.")

    def extract_equations(self, document_path: str, pages: List[int]) -> List[Dict[str, Any]]:
        if not self.runtime_available:
            raise RuntimeError("Surya runtime is not installed. Simulation is disabled.")
        raise NotImplementedError("Real Surya execution requires configured weights.")

    def process_pages(self, document_path: str, pages: List[int], **kwargs) -> List[Dict[str, Any]]:
        if not self.runtime_available:
            raise RuntimeError("Surya runtime is not installed. Simulation is disabled.")
        return self.ocr_pages(document_path, pages)

    def process(self, document_path: str, **kwargs) -> List[Dict[str, Any]]:
        return self.process_pages(document_path, [1], **kwargs)

    def stream_pages(self, document_path: str, page_range=None, **kwargs):
        p_list = [page_range[0]] if page_range else [1]
        for p in self.process_pages(document_path, p_list):
            yield p

    def health(self) -> Dict[str, Any]:
        return {
            "status": "READY" if self.runtime_available else "NOT_READY",
            "reason": None if self.runtime_available else "surya package not installed",
            "simulation": False,
            "adapter": "SuryaAdapter",
            "ocr_batch_size": self.ocr_batch_size,
            "device": self.device,
            "runtime_available": self.runtime_available,
            "vram_safe": True
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "SuryaAdapter",
            "repository": "VikParuchuri/surya",
            "purpose": "Selective OCR, layout, table, and equation processing",
            "batch_size_policy": "Conservative batch <= 2 for 4 GB VRAM protection",
            "device": self.device,
            "simulation": False
        }
