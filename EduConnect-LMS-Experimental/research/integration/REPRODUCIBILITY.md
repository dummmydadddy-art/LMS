# Reproducibility Guide & Verification Protocol

**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Baseline Anchor:** EXP-0040 / C2_085 / A4 (Commit `63d961ee9a94d69c911f785a8b6a7d25cabd18f9`)

---

## 1. Cryptographic Invariants & Reference Hashes

The following reference artifacts are cryptographically locked and must remain unaltered across all integration activities:

| Artifact Name | Path | Reference SHA-256 / Git Commit | Verification Method |
| :--- | :--- | :--- | :--- |
| **Production HEAD** | `../EduConnect-LMS-Production` | `176883227602671b545e061dacf228aedc3271a5` | `git rev-parse HEAD` |
| **Frozen A4 Verifier** | `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` | `sha256sum` |
| **Development Dataset** | `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` | `sha256sum` |
| **Blind Dataset** | `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | `sha256sum` |
| **EXP-0040 Predictions** | `EXP-0040-BLIND-PREDICTIONS.json` | `56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1` | `sha256sum` |
| **EXP-0055 Predictions** | `EXP-0055-BLIND-PREDICTIONS.json` | `fe2c71a87738f242a9e480b2e8329c39dc2252d04e087a0b6236270bb719bba2` | `sha256sum` |
| **EXP-0056 Predictions** | `EXP-0056-BLIND-PREDICTIONS.json` | `175595afa9c71b75bec96b52de9c591190d4d7a751e290190f41d549e1f803a9` | `sha256sum` |
| **EXP-0057 Dev Commit** | Git History | `a573361b412ac88edc7f8422e661ca4a4491beae` | `git log` |

---

## 2. Automated Hash Verification

To verify that all locked artifacts match their reference hashes:

```powershell
py -3.12 scratch/verify_locked_hashes.py
```

Expected Output:
```
[MATCH] EXP-0025-DEVELOPMENT-DATASET.json: 8ce7313c48fd1108...
[MATCH] EXP-0033-BLIND-DATASET.json: 3b4fd6c70258982a...
[MATCH] EXP-0040-BLIND-PREDICTIONS.json: 56003df48c432bac...
[MATCH] EXP-0055-BLIND-PREDICTIONS.json: fe2c71a87738f242...
[MATCH] EXP-0056-BLIND-PREDICTIONS.json: 175595afa9c71b75...
[MATCH] backend/rag_ambiguity_guard_verifier.php: 31c7c31ef6301156...
```

---

## 3. Baseline Reproduction Protocol

The baseline profile `research/integration_configs/baseline.yaml` guarantees that retrieval and downstream verification match the frozen EXP-0040 results byte-for-byte.

### Step 1: Execute Baseline Retrieval
```powershell
py -3.12 -c "
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter
import json

adapter = EXP0040BaselineAdapter()
adapter.initialize()
res = adapter.retrieve_with_metadata('What is CSS flexbox?', top_k=5)
print('Retrieved', len(res['results']), 'parent contexts.')
"
```

### Step 2: Run Baseline Regression Test
```powershell
py -3.12 -m unittest tests/research/test_baseline_reproduction.py
```

Expected result: All baseline tests pass with 0 regressions.

---

## 4. Full Test Suite Execution

To run the complete automated research test suite:

```powershell
py -3.12 -m unittest discover -s tests/research -p "test_*.py"
```

---

## 5. Production Protection Verification

To verify that production has not been touched:

```powershell
git -C "D:\Collage project\EduConnect-LMS-Production" rev-parse HEAD
# Output must be: 176883227602671b545e061dacf228aedc3271a5

py -3.12 -m unittest tests/research/test_production_clean.py
```
