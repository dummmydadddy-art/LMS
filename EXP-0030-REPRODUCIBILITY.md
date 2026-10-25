# EXP-0030: Reproducibility & Audit Trail Guide

**Experiment Identifier:** `EXP-0030`  
**Git Branch:** `exp-0030`  
**Base Commit:** `d5aa6d7` (verified lineage from certified EXP-0029 audit)  
**Host Platform:** Windows PowerShell, PHP 8.3.32, Ollama (persistent llama3.2:latest)  

---

## 1. Environment & Infrastructure Verification

```powershell
# Verify Git branch and clean state
cd "d:/Collage project/EduConnect-LMS-Experimental"
git status
git log -n 1 --oneline d5aa6d7

# Verify Production isolation (remains untouched at commit 1768832)
cd "d:/Collage project/EduConnect-LMS-Production"
git status
git rev-parse HEAD

# Verify local Ollama server status
curl http://127.0.0.1:11434/api/tags
```

---

## 2. Artifact Provenance & Cryptographic Checksums

| Artifact File | Description | SHA-256 Checksum |
|---|---|---|
| `backend/rag_premise_verifier.php` | Generated Artifact | `f4b50e0fd62cfc8c6970c1999bd22c528f98ae71dfbb3e4169b7e643056f480e` |
| `EXP-0030-CURRICULUM-VOCABULARY.json` | Generated Artifact | `493ef48325ee5d1565e913189f03e97f1494831f34bad62d81e4cfea22958167` |
| `EXP-0030-BLIND-DATASET.json` | Generated Artifact | `4372b569eeb9cd22afea73d10971a384084036795f8aa63c4f4052363e864ab9` |
| `scratch/blind_retrieval_cache_400.json` | Generated Artifact | `eb93153c07933cf1374086265ff3ddd1bf91fbcd9e1788001d2b1077376ec0a9` |
| `EXP-0030-RESULTS.json` | Generated Artifact | `d25dd32ce365a60175546e2237591bbf618998c6be80dd5f249fd30153ec4815` |
| `EXP-0030-ABLATION-RESULTS.json` | Generated Artifact | `bdb2ce76cc4790c5aebaf1bfd42ca9a053a9d8f5274b588fd3f8f50498dd3877` |

---

## 3. End-to-End Replication Protocol

### Step 1: Curriculum Vocabulary Extraction
```powershell
php scratch/build_curriculum_vocabulary.php
# Produces: EXP-0030-CURRICULUM-VOCABULARY.json
```

### Step 2: Threshold Calibration Search (500 Shadow Cases)
```powershell
php scratch/run_exp0030_threshold_calibration.php
# Explores 5x5 grid (Te in [0.55-0.75], Tc in [0.65-0.85])
# Freezes operating point: Tc = 0.75, Te = 0.70
# Produces: EXP-0030-THRESHOLD-ANALYSIS.md
```

### Step 3: Blind Dataset Construction & Audit
```powershell
php scratch/build_exp0030_blind_dataset.php
# Constructs 400 blind cases (0 past collisions against 11,404 queries)
# Produces: EXP-0030-BLIND-DATASET.json and EXP-0030-BLIND-DATASET-VALIDATION.md
```

### Step 4: Retrieval Cache Prefetching
```powershell
php scratch/prefetch_exp0030_retrieval.php
# Fetches top-4 RAG material chunks via nomic-embed-text
# Produces: scratch/blind_retrieval_cache_400.json
```

### Step 5: Main Blind Evaluation Execution
```powershell
php scratch/run_exp0030_blind_evaluation.php
# Scores 400 cases across B5, D0, D1, D2, D3, D4
# Produces: EXP-0030-RESULTS.json
```

### Step 6: Statistical Significance & Security Audit
```powershell
php scratch/run_statistical_analysis.php
php scratch/run_security_regression_check.php
# Computes exact McNemar tests, zero-regression audit, and production checks
# Produces: scratch/exp0030_statistical_summary.json
```

---

## 4. Deterministic Invariant Guarantees
- **Evidence Used Contract:** `evidence_used: true` is asserted across 100.0% of exit paths in all evaluated modes.
- **Production Isolation:** `EduConnect-LMS-Production` remains untouched.
- **Frozen Baselines:** Historical baseline files from EXP-0027, EXP-0028, and EXP-0029 remain byte-for-byte frozen.