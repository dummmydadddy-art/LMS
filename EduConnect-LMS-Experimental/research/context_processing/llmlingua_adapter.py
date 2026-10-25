import os
import sys
import time
import re
from typing import List, Dict, Any, Optional, Tuple

try:
    from llmlingua import PromptCompressor
    LLMLINGUA_AVAILABLE = True
except ImportError:
    LLMLINGUA_AVAILABLE = False


class LLMLinguaAdapter:
    """
    LLMLingua Research Adapter for Context Compression and Token Budget Optimization.
    Repository: microsoft/LLMLingua
    Uses real PromptCompressor from llmlingua library.
    STRICT RULE: Simulation is disabled. Missing package produces NOT_READY (except mode=disabled).
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.mode = self.config.get("mode", "LLMLingua-2")  # disabled, LLMLingua, LLMLingua-2
        self.target_rate = self.config.get("target_rate", 0.55)
        self.model_name = self.config.get("model_name", "microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank")
        self.device = self.config.get("device", "cpu")
        self._compressor = None

    def _is_model_available(self) -> bool:
        if os.path.exists(self.model_name):
            return True
        hf_home = os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface/hub"))
        repo_folder = "models--" + self.model_name.replace("/", "--")
        model_dir = os.path.join(hf_home, repo_folder, "snapshots")
        if os.path.exists(model_dir):
            for root, _, files in os.walk(model_dir):
                for f in files:
                    if f.endswith(".safetensors") or f.endswith(".bin"):
                        return True
        return False

    def _get_compressor(self) -> Any:
        if not LLMLINGUA_AVAILABLE:
            raise RuntimeError("llmlingua package is not installed. Handcrafted token pruning simulation has been removed.")
        if not self._is_model_available():
            raise RuntimeError(
                f"LLMLingua model '{self.model_name}' is not installed in local cache. Simulation is disabled."
            )
        if self._compressor is None:
            is_llmlingua2 = "llmlingua-2" in self.model_name.lower() or self.mode == "LLMLingua-2"
            self._compressor = PromptCompressor(
                model_name=self.model_name,
                device_map=self.device,
                use_llmlingua2=is_llmlingua2
            )
        return self._compressor

    def compress(
        self,
        retrieved_contexts: List[Dict[str, Any]],
        query: str = "",
        instruction: str = ""
    ) -> Dict[str, Any]:
        """
        Compresses retrieved evidence context.
        Returns:
            compressed_context: str
            original_token_count: int
            compressed_token_count: int
            compression_ratio: float
            preserved_context_ids: List[str]
            latency_ms: float
        """
        start_t = time.time()
        preserved_ids = [c.get("id", f"ctx_{i}") for i, c in enumerate(retrieved_contexts)]

        if self.mode == "disabled" or not retrieved_contexts:
            # Genuine pass-through baseline
            texts = [c.get("content", "") for c in retrieved_contexts]
            joined = "\n\n".join(texts)
            words = joined.split()
            latency = (time.time() - start_t) * 1000.0
            return {
                "compressed_context": joined,
                "original_token_count": len(words),
                "compressed_token_count": len(words),
                "compression_ratio": 1.0,
                "preserved_context_ids": preserved_ids,
                "latency_ms": round(latency, 2),
                "mode": "disabled",
                "simulation": False
            }

        if not LLMLINGUA_AVAILABLE:
            raise RuntimeError(
                "llmlingua package is not installed. Handcrafted token pruning simulation has been removed."
            )

        compressor = self._get_compressor()
        context_texts = [c.get("content", "") for c in retrieved_contexts]

        comp_res = compressor.compress_prompt(
            context_texts,
            instruction=instruction,
            question=query,
            rate=self.target_rate
        )

        latency = (time.time() - start_t) * 1000.0
        raw_ratio = comp_res.get("ratio", 1.0)
        if isinstance(raw_ratio, str):
            try:
                ratio_float = float(raw_ratio.replace("x", "").strip())
            except ValueError:
                ratio_float = 1.0
        else:
            ratio_float = float(raw_ratio)

        return {
            "compressed_context": comp_res.get("compressed_prompt", ""),
            "original_token_count": comp_res.get("origin_tokens", 0),
            "compressed_token_count": comp_res.get("compressed_tokens", 0),
            "compression_ratio": round(ratio_float, 4),
            "preserved_context_ids": preserved_ids,
            "latency_ms": round(latency, 2),
            "mode": self.mode,
            "simulation": False
        }

    def health(self) -> Dict[str, Any]:
        if self.mode == "disabled":
            return {
                "status": "READY",
                "mode": "disabled",
                "simulation": False,
                "adapter": "LLMLinguaAdapter",
                "llmlingua_installed": LLMLINGUA_AVAILABLE,
                "model_available": True
            }

        is_model_cached = self._is_model_available()
        is_ready = LLMLINGUA_AVAILABLE and is_model_cached

        reason = None
        if not LLMLINGUA_AVAILABLE:
            reason = "llmlingua package not installed"
        elif not is_model_cached:
            reason = f"LLMLingua model '{self.model_name}' is not installed in local cache"

        return {
            "status": "READY" if is_ready else "NOT_READY",
            "reason": reason,
            "simulation": False,
            "adapter": "LLMLinguaAdapter",
            "mode": self.mode,
            "target_rate": self.target_rate,
            "model_name": self.model_name,
            "llmlingua_installed": LLMLINGUA_AVAILABLE,
            "model_available": is_model_cached
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "LLMLinguaAdapter",
            "repository": "microsoft/LLMLingua",
            "purpose": "Prompt and context token compression for long contexts",
            "modes_supported": ["disabled", "LLMLingua", "LLMLingua-2"],
            "current_mode": self.mode,
            "target_rate": self.target_rate,
            "provenance_safety": "Preserves source context IDs and evidence traceability",
            "simulation": False
        }
