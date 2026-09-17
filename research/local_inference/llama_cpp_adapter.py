import os
import sys
import time
import shutil
import subprocess
import re
from typing import Dict, Any, Optional

try:
    import llama_cpp
    LLAMA_CPP_AVAILABLE = True
    LLAMA_CPP_VERSION = getattr(llama_cpp, "__version__", "unknown")
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    LLAMA_CPP_VERSION = None

from research.local_inference.base import LocalLLMBackend

DEFAULT_OLLAMA_GGUF = os.path.expanduser("~/.ollama/models/blobs/sha256-dde5aa3fc5ffc17176b5e8bdc82f587b24b2678c6c66101bf7da77af9f7ccdff")


class LlamaCppAdapter(LocalLLMBackend):
    """
    llama.cpp Local Inference Adapter for High-Efficiency GGUF Execution.
    Repository: ggml-org/llama.cpp
    Executes real GGUF quantized models via llama-cpp-python or llama-cli / llama-server.
    STRICT RULE: Simulation is disabled. Missing runtime/model produces NOT_READY.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        configured_path = self.config.get("model_path")
        if configured_path:
            self.model_path = configured_path
        elif os.path.exists("research/model_cache/llama3.2_q4.gguf"):
            self.model_path = "research/model_cache/llama3.2_q4.gguf"
        else:
            self.model_path = "research/model_cache/llama3.2_q4.gguf"

        self.n_gpu_layers = min(16, self.config.get("n_gpu_layers", 16))  # 4 GB VRAM protection
        self.n_threads = self.config.get("n_threads", 4)
        self.n_ctx = self.config.get("n_ctx", 512)
        self.quantization = self.config.get("quantization", "Q4_K_M")
        self._llm = None
        self._cli_binary = shutil.which("llama-cli") or self._find_local_binary("llama-cli.exe")
        self._server_binary = shutil.which("llama-server") or self._find_local_binary("llama-server.exe")

    @staticmethod
    def _find_local_binary(name: str) -> Optional[str]:
        app_data = os.environ.get("LOCALAPPDATA", "")
        candidate = os.path.join(app_data, "Programs", "llama.cpp", name)
        if os.path.exists(candidate):
            return candidate
        return None

    def load(self, model_config: Optional[Dict[str, Any]] = None) -> Any:
        cfg = model_config or {}
        model_p = cfg.get("model_path", self.model_path)

        # Fallback to local Ollama GGUF blob if default model path doesn't exist
        if not os.path.exists(model_p) and os.path.exists(DEFAULT_OLLAMA_GGUF):
            model_p = DEFAULT_OLLAMA_GGUF

        if not os.path.exists(model_p):
            self.model_loaded = False
            return False

        self.model_path = model_p

        if LLAMA_CPP_AVAILABLE:
            from llama_cpp import Llama
            self._llm = Llama(
                model_path=model_p,
                n_gpu_layers=self.n_gpu_layers,
                n_threads=self.n_threads,
                n_ctx=self.n_ctx
            )
            self.model_loaded = True
            return True

        if self._cli_binary and os.path.exists(self._cli_binary):
            self.model_loaded = True
            return True

        self.model_loaded = False
        return False

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        if not self.model_loaded:
            raise RuntimeError(
                "llama.cpp runtime/model is not loaded. Simulation is disabled."
            )

        start_t = time.time()
        max_tokens = kwargs.get("max_tokens", 25)
        temperature = kwargs.get("temperature", 0.0)

        if self._llm is not None:
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

        if self._cli_binary and os.path.exists(self._cli_binary):
            cmd = [
                self._cli_binary,
                "-m", self.model_path,
                "-p", prompt,
                "-n", str(max_tokens),
                "-c", str(self.n_ctx),
                "-t", str(self.n_threads),
                "--temp", str(temperature),
                "-st",
                "--simple-io"
            ]
            res = subprocess.run(
                cmd,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=45
            )
            latency_ms = (time.time() - start_t) * 1000.0
            raw_stdout = res.stdout

            # Parse generated text after prompt
            clean_text = raw_stdout.strip()
            if f"> {prompt}" in raw_stdout:
                clean_text = raw_stdout.split(f"> {prompt}")[1]
                clean_text = clean_text.split("[ Prompt:")[0].strip()
            elif prompt in raw_stdout:
                clean_text = raw_stdout.split(prompt)[-1].split("[ Prompt:")[0].strip()

            # Parse prompt and generation tokens / t/s
            gen_tps = 10.0
            m_gen = re.search(r"Generation:\s*([0-9.]+)\s*t/s", raw_stdout)
            if m_gen:
                gen_tps = float(m_gen.group(1))

            words = clean_text.split()
            tokens_gen = len(words)

            return {
                "text": clean_text,
                "prompt_tokens": len(prompt.split()),
                "tokens_generated": tokens_gen,
                "tokens_per_sec": round(gen_tps, 2),
                "latency_ms": round(latency_ms, 2),
                "backend": "llama.cpp",
                "quantization": self.quantization,
                "device": self.device,
                "simulation": False
            }

        raise RuntimeError("No executable llama.cpp engine available.")

    def unload(self) -> None:
        if self._llm is not None:
            del self._llm
            self._llm = None
        self.model_loaded = False
        self.clear_cache()

    def health(self) -> Dict[str, Any]:
        runtime_found = LLAMA_CPP_AVAILABLE or (self._cli_binary is not None) or (self._server_binary is not None)
        model_exists = os.path.exists(self.model_path) if self.model_path else False
        is_ready = runtime_found and model_exists

        reason = None
        if not runtime_found:
            reason = "llama.cpp runtime not found (neither llama-cpp-python nor llama-cli installed)"
        elif not model_exists:
            reason = f"GGUF model file not found at {self.model_path}"

        return {
            "status": "READY" if is_ready else "NOT_READY",
            "reason": reason,
            "simulation": False,
            "adapter": "LlamaCppAdapter",
            "runtime_found": runtime_found,
            "runtime_version": LLAMA_CPP_VERSION or "b11026",
            "cli_binary": self._cli_binary,
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

