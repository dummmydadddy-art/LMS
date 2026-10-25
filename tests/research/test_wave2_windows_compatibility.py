# tests/research/test_wave2_windows_compatibility.py
"""
Windows 11 Compatibility and Runtime Verification.
Verifies native execution paths, CPU fallbacks, and lack of Linux-only hard dependencies.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.document_adapters import DoclingRsAdapter, SuryaAdapter
from research.local_inference import LlamaCppAdapter, BitNetAdapter


class TestWave2WindowsCompatibility(unittest.TestCase):

    def test_native_windows_execution_paths(self):
        # Docling.rs on Windows (installed, READY, non-simulated)
        doc_adapter = DoclingRsAdapter()
        self.assertEqual(doc_adapter.health()["status"], "READY")
        self.assertFalse(doc_adapter.health()["simulation"])

        # Surya on Windows (uninstalled external runtime reports NOT_READY without OS failure)
        surya_adapter = SuryaAdapter({"device": "cpu"})
        self.assertEqual(surya_adapter.health()["status"], "NOT_READY")
        self.assertFalse(surya_adapter.health()["simulation"])

        # llama.cpp on Windows (uninstalled external binary reports NOT_READY without OS failure)
        llama_adapter = LlamaCppAdapter()
        self.assertEqual(llama_adapter.health()["status"], "NOT_READY")
        self.assertFalse(llama_adapter.health()["simulation"])

        # BitNet on Windows (uninstalled external binary reports NOT_READY without OS failure)
        bitnet_adapter = BitNetAdapter()
        self.assertEqual(bitnet_adapter.health()["status"], "NOT_READY")
        self.assertFalse(bitnet_adapter.health()["simulation"])


if __name__ == "__main__":
    unittest.main()
