# research/run_integration_tests.py
"""
Comprehensive Integration Test Suite Runner for EduConnect-LMS External Research Components.
Runs all unit, regression, reproduction, determinism, and production protection tests.
"""

import unittest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.research.test_adapters import TestResearchAdapters
from tests.research.test_baseline_reproduction import TestBaselineReproduction
from tests.research.test_production_clean import TestProductionClean
from tests.research.test_determinism import TestDeterminism
from tests.research.test_manifest_integrity import TestManifestIntegrity


def run_all_tests():
    print("=" * 70)
    print("EDUCONNECT-LMS RESEARCH INTEGRATION TEST SUITE")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    test_classes = [
        ("Manifest & Artifact Integrity", TestManifestIntegrity),
        ("Production Repository Cleanliness", TestProductionClean),
        ("Research Retrieval Adapters", TestResearchAdapters),
        ("Baseline Reproduction", TestBaselineReproduction),
        ("Retrieval Determinism", TestDeterminism),
    ]

    for name, cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    start_time = time.time()
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print()
    print("=" * 70)
    print("RESEARCH INTEGRATION VERIFICATION SUMMARY")
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
