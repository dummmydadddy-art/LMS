# research/runtime/resource_policy.py
"""
Unified Resource Policy for EduConnect-LMS Research Architecture.
Enforces common limits across all retrieval, parsing, local inference, and fusion components.

Policy Ceilings:
- max_pages: int
- max_chunks: int
- max_candidates: int
- max_context_tokens: int
- retrieval_timeout_sec: float
- inference_timeout_sec: float
- target_cpu_ram_mb: float
- target_gpu_vram_mb: float

Invariants:
- Components may report budget failure, but must NOT silently bypass limits.
- No simulations or fabricated fake metrics.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
import time


@dataclass
class ResourcePolicy:
    """Configurable resource policy enforcing ceilings across the pipeline."""
    max_pages: int = 10
    max_chunks: int = 50
    max_candidates: int = 20
    max_context_tokens: int = 2048
    retrieval_timeout_sec: float = 30.0
    inference_timeout_sec: float = 45.0
    target_cpu_ram_mb: float = 8192.0
    target_gpu_vram_mb: float = 3500.0

    @classmethod
    def from_dict(cls, d: Optional[Dict[str, Any]]) -> "ResourcePolicy":
        if not d:
            return cls()
        return cls(
            max_pages=int(d.get("max_pages", 10)),
            max_chunks=int(d.get("max_chunks", 50)),
            max_candidates=int(d.get("max_candidates", 20)),
            max_context_tokens=int(d.get("max_context_tokens", 2048)),
            retrieval_timeout_sec=float(d.get("retrieval_timeout_sec", 30.0)),
            inference_timeout_sec=float(d.get("inference_timeout_sec", 45.0)),
            target_cpu_ram_mb=float(d.get("target_cpu_ram_mb", 8192.0)),
            target_gpu_vram_mb=float(d.get("target_gpu_vram_mb", 3500.0))
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "max_pages": self.max_pages,
            "max_chunks": self.max_chunks,
            "max_candidates": self.max_candidates,
            "max_context_tokens": self.max_context_tokens,
            "retrieval_timeout_sec": self.retrieval_timeout_sec,
            "inference_timeout_sec": self.inference_timeout_sec,
            "target_cpu_ram_mb": self.target_cpu_ram_mb,
            "target_gpu_vram_mb": self.target_gpu_vram_mb
        }

    def check_pages_budget(self, pages_count: int) -> tuple[bool, str]:
        if pages_count > self.max_pages:
            return False, f"Page budget exceeded: {pages_count} > {self.max_pages}"
        return True, "ok"

    def check_chunks_budget(self, chunks_count: int) -> tuple[bool, str]:
        if chunks_count > self.max_chunks:
            return False, f"Chunk budget exceeded: {chunks_count} > {self.max_chunks}"
        return True, "ok"

    def check_candidates_budget(self, candidates_count: int) -> tuple[bool, str]:
        if candidates_count > self.max_candidates:
            return False, f"Candidate pool budget exceeded: {candidates_count} > {self.max_candidates}"
        return True, "ok"

    def check_context_tokens_budget(self, tokens_count: int) -> tuple[bool, str]:
        if tokens_count > self.max_context_tokens:
            return False, f"Context token budget exceeded: {tokens_count} > {self.max_context_tokens}"
        return True, "ok"


# Helper type alias
Tuple_Check = tuple[bool, str]


class ResourceBudgetExceededError(RuntimeError):
    """Raised when an operation strictly violates an unbypassed resource limit."""
    pass
