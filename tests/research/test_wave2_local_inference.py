# tests/research/test_wave2_local_inference.py
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.local_inference import (
    OllamaAdapter,
    LlamaCppAdapter,
    Gemma3nAdapter,
    BitNetAdapter,
    get_llm_backend
)


class TestWave2LocalInference(unittest.TestCase):

    def test_ollama_adapter(self):
        backend = OllamaAdapter()
        d = backend.describe()
        self.assertEqual(d["name"], "OllamaAdapter")
        self.assertEqual(d["default_model"], "llama3.2:latest")

    def test_llama_cpp_adapter(self):
        backend = LlamaCppAdapter({"n_gpu_layers": 16, "quantization": "Q4_K_M"})
        h = backend.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])
        self.assertEqual(h["n_gpu_layers"], 16)
        
        # Generation test must fail cleanly when runtime is not installed
        with self.assertRaises(RuntimeError) as ctx:
            backend.generate("Hello local curriculum inference", max_tokens=10)
        self.assertIn("not loaded", str(ctx.exception).lower())
        backend.unload()

    def test_gemma3n_adapter(self):
        backend = Gemma3nAdapter({"model_available": False, "role": "retrieval_router"})
        h = backend.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])
        
        # Routing test uses explicit heuristic fallback
        route = backend.route_query("Explain the difference between flexbox and grid")
        self.assertEqual(route["complexity"], "COMPLEX_VERIFICATION")
        self.assertEqual(route["recommended_route"], "wave1_hierarchical_rag")
        self.assertEqual(route["method"], "heuristic_fallback")

    def test_bitnet_adapter(self):
        backend = BitNetAdapter()
        h = backend.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])
        self.assertEqual(h["bit_width"], 1.58)

        # Generation test must fail cleanly when runtime/weights are not installed
        with self.assertRaises(RuntimeError) as ctx:
            backend.generate("BitNet ultra-efficient prompt", max_tokens=10)
        self.assertIn("not loaded", str(ctx.exception).lower())
        backend.unload()


if __name__ == "__main__":
    unittest.main()
