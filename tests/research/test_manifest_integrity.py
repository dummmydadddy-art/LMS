# tests/research/test_manifest_integrity.py
"""
Test manifest and artifact integrity.
Verifies external component declarations, configuration integrity,
and historical dataset/prediction hashes.
"""

import unittest
import os
import json
import yaml
import hashlib

HISTORICAL_HASHES = {
    "EXP-0033-BLIND-DATASET.json": "3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08",
    "EXP-0025-DEVELOPMENT-DATASET.json": "8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b",
    "EXP-0040-BLIND-PREDICTIONS.json": "56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1"
}

REQUIRED_CONFIGS = [
    "baseline_exp0040.yaml",
    "exp0041_bge_reranker.yaml",
    "exp0042_bge_m3_dense.yaml",
    "exp0043_hybrid_qdrant.yaml",
    "exp0044_pylate_colbert.yaml",
    "exp0045_llamaindex_fusion.yaml",
    "exp0046_crag_corrective.yaml",
    "exp0047_lightrag_kg.yaml"
]

REQUIRED_REQS = [
    "requirements-core-research.txt",
    "requirements-bge.txt",
    "requirements-qdrant.txt",
    "requirements-pylate.txt",
    "requirements-llamaindex.txt",
    "requirements-haystack.txt",
    "requirements-crag.txt",
    "requirements-lightrag.txt"
]


class TestManifestIntegrity(unittest.TestCase):

    def test_historical_artifact_hashes(self):
        for fname, expected_hash in HISTORICAL_HASHES.items():
            self.assertTrue(os.path.exists(fname), f"Historical artifact {fname} missing")
            with open(fname, "rb") as f:
                actual_hash = hashlib.sha256(f.read()).hexdigest()
            self.assertEqual(
                actual_hash,
                expected_hash,
                f"Historical artifact {fname} altered! Expected {expected_hash}, got {actual_hash}"
            )

    def test_external_component_manifest_json(self):
        manifest_path = "EXTERNAL-COMPONENT-MANIFEST.json"
        self.assertTrue(os.path.exists(manifest_path))
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIn("components", data)
        self.assertEqual(len(data["components"]), 7)

    def test_external_component_manifest_yaml(self):
        yaml_path = "research/manifests/external_components.yaml"
        self.assertTrue(os.path.exists(yaml_path))
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.assertIn("external_components", data)
        self.assertEqual(len(data["external_components"]), 7)

    def test_integration_configs_exist(self):
        for cfg in REQUIRED_CONFIGS:
            path = os.path.join("research/integration_configs", cfg)
            self.assertTrue(os.path.exists(path), f"Config missing: {path}")
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            self.assertIn("experiment_id", data)
            self.assertIn("feature_flags", data)
            self.assertIn("retriever", data)
            self.assertIn("verifier", data)

    def test_requirements_files_exist(self):
        for req in REQUIRED_REQS:
            self.assertTrue(os.path.exists(req), f"Requirements file missing: {req}")


if __name__ == "__main__":
    unittest.main()
