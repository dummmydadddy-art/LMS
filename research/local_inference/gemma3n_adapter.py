import os
import sys
import time
import json
from typing import Dict, Any, Optional

try:
    import torch
    import transformers
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

from research.local_inference.base import LocalLLMBackend


class Gemma3nAdapter(LocalLLMBackend):
    """
    Gemma 3n E2B Research Adapter for Local Inference and Retrieval Routing.
    Model: google/gemma-3n-E2B-it
    STRICT RULE: Rule-based routing is strictly labeled as heuristic_fallback.
    Missing model produces NOT_READY. Simulation is disabled.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.model_id = self.config.get("model_id", "google/gemma-3n-E2B-it")
        self.role = self.config.get("role", "retrieval_router")
        self.device = self.config.get("device", "cpu")
        self.dtype = self.config.get("dtype", "float32")
        self.model_available = self._check_model_availability()
        self._model = None
        self._tokenizer = None

    def _check_model_availability(self) -> bool:
        """Check whether model is downloaded/cached locally without requiring network/auth."""
        if not TRANSFORMERS_AVAILABLE:
            return False
        # Check custom path if provided
        if os.path.exists(self.model_id):
            return True
        # Check HuggingFace hub cache
        hf_home = os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface/hub"))
        model_dir_name = f"models--{self.model_id.replace('/', '--')}"
        expected_dir = os.path.join(hf_home, model_dir_name)
        if os.path.exists(expected_dir):
            snapshots_dir = os.path.join(expected_dir, "snapshots")
            if os.path.exists(snapshots_dir) and os.listdir(snapshots_dir):
                return True
        return False

    def load(self, model_config: Optional[Dict[str, Any]] = None) -> bool:
        if not self.model_available:
            self.model_loaded = False
            return False

        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_id, local_files_only=True)
            self._model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                local_files_only=True,
                torch_dtype=torch.float32 if self.device == "cpu" else torch.bfloat16
            )
            self.model_loaded = True
            return True
        except Exception:
            self.model_loaded = False
            return False

    def classify_query_heuristic_fallback(self, query: str) -> Dict[str, Any]:
        """
        Deterministic rule-based keyword routing fallback.
        Explicitly labeled as heuristic_fallback (NOT Gemma model inference).
        """
        q_lower = query.lower()
        if any(w in q_lower for w in ["why", "difference", "compare", "contradict", "explain"]):
            complexity = "COMPLEX_VERIFICATION"
            route = "wave1_hierarchical_rag"
        elif any(w in q_lower for w in ["diagram", "table", "layout", "chart"]):
            complexity = "VISUAL_DOCUMENT"
            route = "surya_marker_vision"
        else:
            complexity = "SIMPLE_FACTOID"
            route = "cheap_dense_retrieval"

        return {
            "query": query,
            "complexity": complexity,
            "recommended_route": route,
            "method": "heuristic_fallback",
            "model": None,
            "simulation": False
        }

    def route_query(self, query: str) -> Dict[str, Any]:
        """Routes query using loaded model, or explicitly falls back to heuristic."""
        if self.model_loaded and self._model is not None:
            prompt = f"Classify query routing: {query}\nRouting:"
            gen = self.generate(prompt, max_tokens=16)
            return {
                "query": query,
                "complexity": "MODEL_DERIVED",
                "recommended_route": gen["text"].strip(),
                "method": "gemma_3n_inference",
                "model": self.model_id,
                "simulation": False
            }
        return self.classify_query_heuristic_fallback(query)

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        if not self.model_loaded or self._model is None:
            raise RuntimeError(
                "Gemma-3n model is not loaded. Simulation is disabled. "
                "Use classify_query_heuristic_fallback() for keyword routing."
            )

        start_t = time.time()
        max_tokens = kwargs.get("max_tokens", 64)

        inputs = self._tokenizer(prompt, return_tensors="pt")
        input_tokens = inputs.input_ids.shape[1]

        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=kwargs.get("temperature", 0.0)
            )

        output_tokens = outputs.shape[1] - input_tokens
        text = self._tokenizer.decode(outputs[0][input_tokens:], skip_special_tokens=True)
        latency_ms = (time.time() - start_t) * 1000.0

        return {
            "text": text,
            "model_id": self.model_id,
            "revision": getattr(self._model.config, "_commit_hash", "local"),
            "runtime": "transformers",
            "device": self.device,
            "dtype": str(self._model.dtype),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": round(latency_ms, 2),
            "simulation": False
        }

    def unload(self) -> None:
        if self._model is not None:
            del self._model
            del self._tokenizer
            self._model = None
            self._tokenizer = None
        self.model_loaded = False
        self.clear_cache()

    def health(self) -> Dict[str, Any]:
        reason = None
        if not self.model_available:
            reason = f"Model {self.model_id} not found in local cache (access requires Hugging Face license acceptance)"

        return {
            "status": "READY" if self.model_available else "NOT_READY",
            "reason": reason,
            "simulation": False,
            "adapter": "Gemma3nAdapter",
            "model_available": self.model_available,
            "model_id": self.model_id,
            "role": self.role,
            "heuristic_fallback_available": True
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "Gemma3nAdapter",
            "model": self.model_id,
            "purpose": "Lightweight helper for routing, classification, and reformulation",
            "runtime_support": ["Transformers"],
            "current_role": self.role,
            "simulation": False
        }
