# research/local_inference/base.py
"""
Base interface for local LLM inference engines in Wave 2.
Enforces unified lifecycle: load -> generate -> unload -> memory inspection.
Supports Ollama, llama.cpp, Gemma 3n, and BitNet backends.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import gc

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class LocalLLMBackend(ABC):
    """Abstract base class for all EduConnect local LLM backends."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.model_loaded = False
        self.device = self.config.get("device", "cpu")

    @abstractmethod
    def load(self, model_config: Optional[Dict[str, Any]] = None) -> Any:
        """Load model weights into memory/VRAM."""
        pass

    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate completion for prompt, returning text, tokens, and latency."""
        pass

    @abstractmethod
    def unload(self) -> None:
        """Unload model from RAM/VRAM and release caches."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Report backend health, model loaded status, and device availability."""
        pass

    def memory(self) -> Dict[str, Any]:
        """Inspect current RAM and VRAM consumption."""
        vram_mb = 0.0
        if TORCH_AVAILABLE and torch.cuda.is_available():
            vram_mb = torch.cuda.memory_allocated() / (1024 * 1024)
        return {
            "device": self.device,
            "model_loaded": self.model_loaded,
            "allocated_vram_mb": round(vram_mb, 2)
        }

    @abstractmethod
    def describe(self) -> Dict[str, Any]:
        """Describe backend architecture, supported quantization, and capabilities."""
        pass

    def clear_cache(self):
        gc.collect()
        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass
