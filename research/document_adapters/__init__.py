# research/document_adapters/__init__.py
"""Document adapters registry and exports."""

from research.document_adapters.base import DocumentProcessor, PageArtifact
from research.document_adapters.docling_rs_adapter import DoclingRsAdapter
from research.document_adapters.python_docling_adapter import PythonDoclingAdapter
from research.document_adapters.marker_adapter import MarkerAdapter
from research.document_adapters.surya_adapter import SuryaAdapter
from research.document_adapters.selective_vision import SelectiveVisionPolicy

DOCUMENT_PROCESSORS = {
    "docling_rs": DoclingRsAdapter,
    "docling": DoclingRsAdapter,
    "python_docling": PythonDoclingAdapter,
    "marker": MarkerAdapter,
    "surya": SuryaAdapter
}


def get_document_processor(name_or_config=None) -> DocumentProcessor:
    if isinstance(name_or_config, dict):
        name = name_or_config.get("processor", "docling_rs").lower()
        cls = DOCUMENT_PROCESSORS.get(name, DoclingRsAdapter)
        return cls(name_or_config)
    name = str(name_or_config or "docling_rs").lower()
    cls = DOCUMENT_PROCESSORS.get(name, DoclingRsAdapter)
    return cls()


__all__ = [
    "DocumentProcessor",
    "PageArtifact",
    "DoclingRsAdapter",
    "PythonDoclingAdapter",
    "MarkerAdapter",
    "SuryaAdapter",
    "SelectiveVisionPolicy",
    "get_document_processor",
    "DOCUMENT_PROCESSORS"
]
