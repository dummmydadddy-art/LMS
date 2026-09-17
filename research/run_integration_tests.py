# research/run_integration_tests.py
"""
Comprehensive Integration Test Suite Runner for EduConnect-LMS Research.
Runs all Wave 1 (RAG Adapters) and Wave 2 (Document Intelligence & Local Inference) tests.
"""

import unittest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Wave 1 test suites
from tests.research.test_manifest_integrity import TestManifestIntegrity
from tests.research.test_production_clean import TestProductionClean
from tests.research.test_adapters import TestResearchAdapters
from tests.research.test_baseline_reproduction import TestBaselineReproduction
from tests.research.test_determinism import TestDeterminism

# Wave 2 test suites
from tests.research.test_wave2_document_adapters import TestWave2DocumentAdapters
from tests.research.test_wave2_pageindex import TestWave2PageIndex
from tests.research.test_wave2_local_inference import TestWave2LocalInference
from tests.research.test_wave2_llmlingua import TestWave2LLMLingua
from tests.research.test_wave2_resource_manager import TestWave2ResourceManager
from tests.research.test_wave2_page_budget import TestWave2PageBudget
from tests.research.test_wave2_resource_stress import TestWave2ResourceStress
from tests.research.test_wave2_large_context import TestWave2LargeContext
from tests.research.test_wave2_windows_compatibility import TestWave2WindowsCompatibility
from tests.research.test_wave2_baseline_reproduction import TestWave2BaselineReproduction


def run_all_tests():
    print("=" * 70)
    print("EDUCONNECT-LMS WAVE 1 & WAVE 2 INTEGRATION TEST SUITE")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    test_classes = [
        # Integrity & Isolation
        ("Manifest & Artifact Integrity", TestManifestIntegrity),
        ("Production Repository Cleanliness", TestProductionClean),
        ("Wave 1 Baseline Reproduction", TestBaselineReproduction),
        ("Wave 2 Baseline Reproduction", TestWave2BaselineReproduction),
        ("Retrieval Determinism", TestDeterminism),
        # Wave 1 Adapters
        ("Wave 1 Retrieval Adapters", TestResearchAdapters),
        # Wave 2 Document Intelligence & Efficiency
        ("Wave 2 Document Adapters", TestWave2DocumentAdapters),
        ("Wave 2 PageIndex Navigation", TestWave2PageIndex),
        ("Wave 2 Local Inference Backends", TestWave2LocalInference),
        ("Wave 2 LLMLingua Compression", TestWave2LLMLingua),
        ("Wave 2 Resource Manager & Residency", TestWave2ResourceManager),
        ("Wave 2 Page Window Budget", TestWave2PageBudget),
        ("Wave 2 Resource Stress (500p)", TestWave2ResourceStress),
        ("Wave 2 Large-Context Compression (8000t)", TestWave2LargeContext),
        ("Wave 2 Windows 11 Compatibility", TestWave2WindowsCompatibility),
    ]

    for name, cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    start_time = time.time()
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print()
    print("=" * 70)
    print("RESEARCH INTEGRATION VERIFICATION SUMMARY (WAVE 1 & WAVE 2)")
    print("=" * 70)
    print(f"Total Tests Executed: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Elapsed Time: {elapsed:.2f}s")
    print("=" * 70)

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
