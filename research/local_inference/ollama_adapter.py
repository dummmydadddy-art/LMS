# research/local_inference/ollama_adapter.py
"""
Ollama Local LLM Backend Adapter.
Preserves existing baseline inference connection to local Ollama daemon.
"""

import json
import time
import urllib.request
from typing import Dict, Any, Optional

from research.local_inference.base import LocalLLMBackend


class OllamaAdapter(LocalLLMBackend):
    """Local inference adapter wrapping existing Ollama daemon."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.endpoint = self.config.get("endpoint", "http://127.0.0.1:11434/api/generate")
        self.model = self.config.get("model", "llama3.2:latest")
        self.temperature = self.config.get("temperature", 0.0)
        self.model_loaded = True

    def load(self, model_config: Optional[Dict[str, Any]] = None) -> Any:
        self.model_loaded = True
        return True

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        start_t = time.time()
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", self.temperature),
                "num_predict": kwargs.get("max_tokens", 256)
            }
        }
        req = urllib.request.Request(
            self.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                latency_ms = (time.time() - start_t) * 1000.0
                return {
                    "text": data.get("response", ""),
                    "tokens_generated": data.get("eval_count", 0),
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "latency_ms": round(latency_ms, 2),
                    "backend": "ollama",
                    "model": self.model
                }
        except Exception as e:
            latency_ms = (time.time() - start_t) * 1000.0
            return {
                "text": f"Error communicating with Ollama: {e}",
                "tokens_generated": 0,
                "latency_ms": round(latency_ms, 2),
                "backend": "ollama",
                "status": "error"
            }

    def unload(self) -> None:
        self.clear_cache()

    def health(self) -> Dict[str, Any]:
        # Quick ping to Ollama
        try:
            req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
            with urllib.request.urlopen(req, timeout=3) as resp:
                status = "ok" if resp.status == 200 else "degraded"
        except Exception:
            status = "offline"

        return {
            "status": status,
            "backend": "OllamaAdapter",
            "model": self.model,
            "endpoint": self.endpoint
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "OllamaAdapter",
            "runtime": "Ollama local service",
            "default_model": self.model,
            "role": "Frozen reference local inference backend"
        }
