# research/local_inference/__init__.py
from research.local_inference.base import LocalLLMBackend
from research.local_inference.ollama_adapter import OllamaAdapter
from research.local_inference.llama_cpp_adapter import LlamaCppAdapter
from research.local_inference.gemma3n_adapter import Gemma3nAdapter
from research.local_inference.bitnet_adapter import BitNetAdapter

LLM_BACKENDS = {
    "ollama": OllamaAdapter,
    "llama_cpp": LlamaCppAdapter,
    "llamacpp": LlamaCppAdapter,
    "gemma3n": Gemma3nAdapter,
    "bitnet": BitNetAdapter
}


def get_llm_backend(name_or_config=None) -> LocalLLMBackend:
    if isinstance(name_or_config, dict):
        backend_name = name_or_config.get("llm_backend", name_or_config.get("backend", "ollama")).lower()
        cls = LLM_BACKENDS.get(backend_name, OllamaAdapter)
        return cls(name_or_config)
    backend_name = str(name_or_config or "ollama").lower()
    cls = LLM_BACKENDS.get(backend_name, OllamaAdapter)
    return cls()


__all__ = [
    "LocalLLMBackend",
    "OllamaAdapter",
    "LlamaCppAdapter",
    "Gemma3nAdapter",
    "BitNetAdapter",
    "get_llm_backend",
    "LLM_BACKENDS"
]
