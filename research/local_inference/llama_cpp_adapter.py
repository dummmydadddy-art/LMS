import os
import sys
import time
import shutil
from typing import Dict, Any, Optional

try:
    import llama_cpp
    LLAMA_CPP_AVAILABLE = True
    LLAMA_CPP_VERSION = getattr(llama_cpp, "__version__", "unknown")
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    LLAMA_CPP_VERSION = None

from research.local_inference.base import LocalLLMBackend


class LlamaCppAdapter(LocalLLMBackend):
    """
    llama.cpp Local Inference Adapter for High-Efficiency GGUF Execution.
    Repository: ggml-org/llama.cpp
    Executes real GGUF quantized models via llama-cpp-python or llama-server.
    STRICT RULE: Simulation is disabled. Missing runtime/model produces NOT_READY.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.model_path = self.config.get("model_path", "research/model_cache/llama3.2_q4.gguf")
        self.n_gpu_layers = min(16, self.config.get("n_gpu_layers", 16))  # 4 GB VRAM protection
        self.n_threads = self.config.get("n_threads", 6)
        self.n_ctx = self.config.get("n_ctx", 2048)
        self.quantization = self.config.get("quantization", "Q4_K_M")
        self._llm = None
        self._server_binary = shutil.which("llama-server")

    def load(self, model_config: Optional[Dict[str, Any]] = None) -> Any:
        cfg = model_config or {}
        model_p = cfg.get("model_path", self.model_path)

        if not os.path.exists(model_p):
            self.model_loaded = False
            return False

        if not LLAMA_CPP_AVAILABLE:
            self.model_loaded = False
            return False

        from llama_cpp import Llama
        self._llm = Llama(
            model_path=model_p,
            n_gpu_layers=self.n_gpu_layers,
            n_threads=self.n_threads,
            n_ctx=self.n_ctx
        )
        self.model_loaded = True
        return True

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        if not self.model_loaded or self._llm is None:
            raise RuntimeError(
                "llama.cpp runtime/model is not loaded. Simulation is disabled."
            )

        start_t = time.time()
        max_tokens = kwargs.get("max_tokens", 128)
        temperature = kwargs.get("temperature", 0.0)

        output = self._llm(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )
        text = output["choices"][0]["text"]
        eval_tokens = output.get("usage", {}).get("completion_tokens", 0)
        prompt_tokens = output.get("usage", {}).get("prompt_tokens", 0)

        latency_ms = (time.time() - start_t) * 1000.0
        tokens_per_sec = eval_tokens / max(0.001, latency_ms / 1000.0)

        return {
            "text": text,
            "prompt_tokens": prompt_tokens,
            "tokens_generated": eval_tokens,
            "tokens_per_sec": round(tokens_per_sec, 2),
            "latency_ms": round(latency_ms, 2),
            "backend": "llama.cpp",
            "quantization": self.quantization,
            "device": self.device,
            "simulation": False
        }

    def unload(self) -> None:
        if self._llm is not None:
            del self._llm
            self._llm = None
        self.model_loaded = False
        self.clear_cache()

    def health(self) -> Dict[str, Any]:
        runtime_found = LLAMA_CPP_AVAILABLE or (self._server_binary is not None)
        model_exists = os.path.exists(self.model_path) if self.model_path else False
        is_ready = runtime_found and model_exists

        reason = None
        if not runtime_found:
            reason = "llama.cpp runtime not found (neither llama-cpp-python nor llama-server installed)"
        elif not model_exists:
            reason = f"GGUF model file not found at {self.model_path}"

        return {
            "status": "READY" if is_ready else "NOT_READY",
            "reason": reason,
            "simulation": False,
            "adapter": "LlamaCppAdapter",
            "runtime_found": runtime_found,
            "runtime_version": LLAMA_CPP_VERSION,
            "model_path": self.model_path,
            "model_exists": model_exists,
            "quantization": self.quantization,
            "context_size": self.n_ctx,
            "n_gpu_layers": self.n_gpu_layers
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "LlamaCppAdapter",
            "repository": "ggml-org/llama.cpp",
            "purpose": "Efficient local quantized inference (GGUF)",
            "supported_quantizations": ["Q4_K_M", "Q5_K_M", "Q8_0", "F16"],
            "offload_strategy": "Hybrid CPU + GPU layers bounded to 4 GB VRAM ceiling",
            "simulation": False
        }
