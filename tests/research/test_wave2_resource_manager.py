# tests/research/test_wave2_resource_manager.py
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.runtime import ResourceManager


class TestWave2ResourceManager(unittest.TestCase):

    def setUp(self):
        self.mgr = ResourceManager()

    def test_memory_inspection(self):
        mem = self.mgr.inspect_memory()
        self.assertIn("gpu_allocated_mb", mem)
        self.assertEqual(mem["max_vram_gb"], 4.0)
        self.assertEqual(mem["safety_margin_gb"], 0.75)

    def test_exclusive_residency_enforcement(self):
        # Acquire Model 1
        self.mgr.acquire_residency("BGE-M3", estimated_vram_gb=1.5)
        self.assertIn("BGE-M3", self.mgr.active_models)
        self.assertEqual(len(self.mgr.active_models), 1)

        # Acquire Model 2: Must evict Model 1 to maintain MAX_CONCURRENT_HEAVY_MODELS = 1
        self.mgr.acquire_residency("llama.cpp", estimated_vram_gb=2.0)
        self.assertIn("llama.cpp", self.mgr.active_models)
        self.assertNotIn("BGE-M3", self.mgr.active_models)
        self.assertEqual(len(self.mgr.active_models), 1)

        # Release Model 2
        self.mgr.release_residency("llama.cpp")
        self.assertEqual(len(self.mgr.active_models), 0)

    def test_sequential_residency_cycle(self):
        models = ["BGE-M3", "llama.cpp", "Surya"]
        for m in models:
            self.mgr.acquire_residency(m)
            self.assertEqual(len(self.mgr.active_models), 1)
            self.assertIn(m, self.mgr.active_models)
            self.mgr.release_residency(m)
            self.assertEqual(len(self.mgr.active_models), 0)


if __name__ == "__main__":
    unittest.main()
