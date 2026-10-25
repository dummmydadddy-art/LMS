# research/runtime/observability.py
"""
Observability and Telemetry Module for EduConnect-LMS Research Architecture.
Records structured metrics and execution traces across all experimental pipelines.

Required fields per experimental call:
- profile_id: str
- component_ids: List[str]
- configuration_hash: str
- model_ids: Dict[str, str]
- model_revisions: Dict[str, str]
- source_pdf_hash: str
- dataset_hash: str
- retrieved_pages: List[int]
- retrieved_chunks: List[str]
- retrieval_scores: List[float]
- retrieval_method: str
- fusion_method: str
- context_tokens: int
- latency_ms: float
- peak_memory_mb: float
- gpu_usage_mb: float
- fallbacks: List[str]
- errors: List[str]
- runtime_versions: Dict[str, str]
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import time
import hashlib
import json
import sys

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


@dataclass
class ExecutionTrace:
    profile_id: str = "default"
    component_ids: List[str] = field(default_factory=list)
    configuration_hash: str = ""
    model_ids: Dict[str, str] = field(default_factory=dict)
    model_revisions: Dict[str, str] = field(default_factory=dict)
    source_pdf_hash: str = ""
    dataset_hash: str = ""
    retrieved_pages: List[int] = field(default_factory=list)
    retrieved_chunks: List[str] = field(default_factory=list)
    retrieval_scores: List[float] = field(default_factory=list)
    retrieval_method: str = "dense"
    fusion_method: str = "none"
    context_tokens: int = 0
    latency_ms: float = 0.0
    peak_memory_mb: float = 0.0
    gpu_usage_mb: float = 0.0
    fallbacks: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    runtime_versions: Dict[str, str] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "profile_id": self.profile_id,
            "component_ids": self.component_ids,
            "configuration_hash": self.configuration_hash,
            "model_ids": self.model_ids,
            "model_revisions": self.model_revisions,
            "source_pdf_hash": self.source_pdf_hash,
            "dataset_hash": self.dataset_hash,
            "retrieved_pages": self.retrieved_pages,
            "retrieved_chunks": self.retrieved_chunks,
            "retrieval_scores": [round(float(s), 4) for s in self.retrieval_scores],
            "retrieval_method": self.retrieval_method,
            "fusion_method": self.fusion_method,
            "context_tokens": self.context_tokens,
            "latency_ms": round(self.latency_ms, 2),
            "peak_memory_mb": round(self.peak_memory_mb, 2),
            "gpu_usage_mb": round(self.gpu_usage_mb, 2),
            "fallbacks": self.fallbacks,
            "errors": self.errors,
            "runtime_versions": self.runtime_versions,
            "timestamp": self.timestamp
        }


class ObservabilityTracker:
    """Singleton/manager for collecting and logging execution traces."""

    def __init__(self):
        self.traces: List[ExecutionTrace] = []

    def start_trace(self, profile_id: str, config: Optional[Dict[str, Any]] = None) -> ExecutionTrace:
        cfg = config or {}
        cfg_str = json.dumps(cfg, sort_keys=True, default=str)
        cfg_hash = hashlib.sha256(cfg_str.encode("utf-8")).hexdigest()

        runtime_versions = {
            "python": sys.version.split()[0],
        }
        if TORCH_AVAILABLE:
            runtime_versions["torch"] = torch.__version__

        trace = ExecutionTrace(
            profile_id=profile_id,
            configuration_hash=cfg_hash,
            runtime_versions=runtime_versions,
            timestamp=time.time()
        )
        return trace

    def record_trace(self, trace: ExecutionTrace):
        # Capture current memory if not set
        if trace.peak_memory_mb == 0.0 and PSUTIL_AVAILABLE:
            try:
                p = psutil.Process()
                trace.peak_memory_mb = p.memory_info().rss / (1024 * 1024)
            except Exception:
                pass

        if trace.gpu_usage_mb == 0.0 and TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                trace.gpu_usage_mb = torch.cuda.memory_allocated() / (1024 * 1024)
            except Exception:
                pass

        self.traces.append(trace)

    def export_jsonl(self, file_path: str):
        with open(file_path, "w", encoding="utf-8") as f:
            for t in self.traces:
                f.write(json.dumps(t.to_dict()) + "\n")


GLOBAL_OBSERVABILITY = ObservabilityTracker()
