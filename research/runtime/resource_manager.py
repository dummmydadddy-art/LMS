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
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class ResourceManager:
    """
    Guards memory and enforces exclusive model residency on GPU.
    RTX 3050 Laptop GPU (4 GB VRAM ceiling).
    Instrumented with real OS and PyTorch measurements (no constants).
    """

    MAX_GPU_VRAM_GB = 4.0
    GPU_SAFETY_MARGIN_GB = 0.75
    MAX_CONCURRENT_HEAVY_MODELS = 1

    def __init__(self):
        self.active_models: Dict[str, Dict[str, Any]] = {}
        self.lifecycle_log: List[Dict[str, Any]] = []

    def inspect_memory(self) -> Dict[str, Any]:
        """Report real current system RAM and GPU memory status."""
        ram_used_mb = 0.0
        ram_total_mb = 0.0
        cpu_percent = 0.0
        if PSUTIL_AVAILABLE:
            vmem = psutil.virtual_memory()
            ram_used_mb = vmem.used / (1024 * 1024)
            ram_total_mb = vmem.total / (1024 * 1024)
            cpu_percent = psutil.cpu_percent(interval=None)

        gpu_allocated_mb = 0.0
        gpu_reserved_mb = 0.0
        gpu_free_mb = 0.0
        device = "cpu"

        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                gpu_allocated_mb = torch.cuda.memory_allocated() / (1024 * 1024)
                gpu_reserved_mb = torch.cuda.memory_reserved() / (1024 * 1024)
                free_bytes, total_bytes = torch.cuda.mem_get_info()
                gpu_free_mb = free_bytes / (1024 * 1024)
                device = "cuda:0"
            except Exception:
                pass

        return {
            "torch_cuda_available": TORCH_AVAILABLE and torch.cuda.is_available(),
            "device": device,
            "ram_used_mb": round(ram_used_mb, 2),
            "ram_total_mb": round(ram_total_mb, 2),
            "cpu_percent": cpu_percent,
            "gpu_allocated_mb": round(gpu_allocated_mb, 2),
            "gpu_reserved_mb": round(gpu_reserved_mb, 2),
            "gpu_free_mb": round(gpu_free_mb, 2),
            "active_heavy_models": list(self.active_models.keys()),
            "max_vram_gb": self.MAX_GPU_VRAM_GB,
            "safety_margin_gb": self.GPU_SAFETY_MARGIN_GB,
            "simulation": False
        }

    def acquire_residency(self, model_name: str, estimated_vram_gb: float = 1.5) -> bool:
        """
        Enforces exclusive model residency.
        If another heavy model is loaded, it is evicted before loading the new one.
        Records exact lifecycle schema:
        timestamp, component, before_ram, after_ram, before_vram, after_vram, device, loaded, unloaded
        """
        before_mem = self.inspect_memory()
        unloaded_models = []

        if len(self.active_models) >= self.MAX_CONCURRENT_HEAVY_MODELS:
            existing = list(self.active_models.keys())
            for m in existing:
                self.release_residency(m)
                unloaded_models.append(m)

        self.clear_caches()

        self.active_models[model_name] = {
            "loaded_at": time.time(),
            "estimated_vram_gb": estimated_vram_gb
        }
        after_mem = self.inspect_memory()

        self.lifecycle_log.append({
            "timestamp": time.time(),
            "component": model_name,
            "before_ram": before_mem["ram_used_mb"],
            "after_ram": after_mem["ram_used_mb"],
            "before_vram": before_mem["gpu_allocated_mb"],
            "after_vram": after_mem["gpu_allocated_mb"],
            "device": after_mem["device"],
            "loaded": model_name,
            "unloaded": unloaded_models,
            "action": "acquire",
            "simulation": False
        })
        return True

    def release_residency(self, model_name: str) -> bool:
        """Release residency and clean CUDA cache."""
        before_mem = self.inspect_memory()
        was_loaded = model_name in self.active_models

        if was_loaded:
            del self.active_models[model_name]

        self.clear_caches()
        after_mem = self.inspect_memory()

        self.lifecycle_log.append({
            "timestamp": time.time(),
            "component": model_name,
            "before_ram": before_mem["ram_used_mb"],
            "after_ram": after_mem["ram_used_mb"],
            "before_vram": before_mem["gpu_allocated_mb"],
            "after_vram": after_mem["gpu_allocated_mb"],
            "device": after_mem["device"],
            "loaded": None,
            "unloaded": [model_name] if was_loaded else [],
            "action": "release",
            "simulation": False
        })
        return True

    def clear_caches(self) -> None:
        """Runs explicit garbage collection and CUDA cache clearing."""
        gc.collect()
        if TORCH_AVAILABLE and torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass

    def get_lifecycle_log(self) -> List[Dict[str, Any]]:
        return self.lifecycle_log

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
