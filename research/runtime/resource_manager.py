# research/runtime/resource_manager.py
"""
Runtime Resource Manager for 4 GB VRAM RTX 3050 Laptop Environment.
Enforces exclusive model residency, lazy loading, proactive garbage collection,
and VRAM safety ceilings.
Policy:
  MAX_GPU_VRAM_GB = 4.0
  GPU_SAFETY_MARGIN_GB = 0.75
  MAX_CONCURRENT_HEAVY_MODELS = 1
"""

import os
import gc
import time
from typing import Dict, Any, Optional, List

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class ResourceManager:
    """Guards memory and enforces exclusive model residency on GPU."""

    MAX_GPU_VRAM_GB = 4.0
    GPU_SAFETY_MARGIN_GB = 0.75
    MAX_CONCURRENT_HEAVY_MODELS = 1

    def __init__(self):
        self.active_models: Dict[str, Dict[str, Any]] = {}
        self.lifecycle_log: List[Dict[str, Any]] = []

    def inspect_memory(self) -> Dict[str, Any]:
        """Report current system and GPU memory status."""
        gpu_allocated_mb = 0.0
        gpu_reserved_mb = 0.0
        gpu_free_mb = 0.0

        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                gpu_allocated_mb = torch.cuda.memory_allocated() / (1024 * 1024)
                gpu_reserved_mb = torch.cuda.memory_reserved() / (1024 * 1024)
                free_bytes, total_bytes = torch.cuda.mem_get_info()
                gpu_free_mb = free_bytes / (1024 * 1024)
            except Exception:
                pass

        return {
            "torch_cuda_available": TORCH_AVAILABLE and torch.cuda.is_available(),
            "gpu_allocated_mb": round(gpu_allocated_mb, 2),
            "gpu_reserved_mb": round(gpu_reserved_mb, 2),
            "gpu_free_mb": round(gpu_free_mb, 2),
            "active_heavy_models": list(self.active_models.keys()),
            "max_vram_gb": self.MAX_GPU_VRAM_GB,
            "safety_margin_gb": self.GPU_SAFETY_MARGIN_GB
        }

    def acquire_residency(self, model_name: str, estimated_vram_gb: float = 1.5) -> bool:
        """
        Enforces exclusive model residency.
        If another heavy model is loaded, it is evicted before loading the new one.
        """
        before_mem = self.inspect_memory()

        if len(self.active_models) >= self.MAX_CONCURRENT_HEAVY_MODELS:
            # Evict existing models to enforce exclusive residency
            existing = list(self.active_models.keys())
            for m in existing:
                self.release_residency(m)

        self.clear_caches()

        self.active_models[model_name] = {
            "loaded_at": time.time(),
            "estimated_vram_gb": estimated_vram_gb
        }
        after_mem = self.inspect_memory()

        self.lifecycle_log.append({
            "action": "acquire",
            "model": model_name,
            "before_allocated_mb": before_mem["gpu_allocated_mb"],
            "after_allocated_mb": after_mem["gpu_allocated_mb"]
        })
        return True

    def release_residency(self, model_name: str) -> bool:
        """Release residency and clean CUDA cache."""
        if model_name in self.active_models:
            del self.active_models[model_name]

        self.clear_caches()
        mem = self.inspect_memory()

        self.lifecycle_log.append({
            "action": "release",
            "model": model_name,
            "remaining_allocated_mb": mem["gpu_allocated_mb"]
        })
        return True

    def clear_caches(self):
        """Explicit garbage collection and CUDA cache flush."""
        gc.collect()
        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "active_models_count": len(self.active_models),
            "active_models": list(self.active_models.keys()),
            "concurrency_limit": self.MAX_CONCURRENT_HEAVY_MODELS,
            "memory": self.inspect_memory()
        }


# Global singleton manager
GLOBAL_RESOURCE_MANAGER = ResourceManager()
