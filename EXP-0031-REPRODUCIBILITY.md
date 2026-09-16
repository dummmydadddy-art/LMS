# EXP-0031: Reproducibility & Replication Guide

**Experiment Identifier:** `EXP-0031`  
**Git Branch:** `exp-0031`  
**Base Commit:** `3bd36c7` (verified parent: `d5aa6d7` from EXP-0029/0030 certified lineage)  
**Host Platform:** Windows PowerShell, PHP 8.3.32, Ollama (persistent `llama3.2:latest`)  
**Production Isolation:** `EduConnect-LMS-Production` strictly untouched (HEAD at `1768832`)  

---

## 1. Environment & Infrastructure Verification

Execute the following PowerShell commands to verify repository state and runtime dependencies:

```powershell
# 1. Verify Git branch and clean state in experimental repo
cd "d:/Collage project/EduConnect-LMS-Experimental"
git status
git branch --show-current
git log -n 1 --oneline 3bd36c7

# 2. Verify Production repository isolation (remains strictly untouched)
cd "d:/Collage project/EduConnect-LMS-Production"
git status
git rev-parse HEAD

# 3. Verify local Ollama server status and model availability
curl http://127.0.0.1:11434/api/tags
# Expected: llama3.2:latest must be present in models array

# 4. Verify SQLite RAG database integrity
Get-Item "d:/Collage project/EduConnect-LMS-Experimental/database/rag_materials.sqlite3"
```

---

## 2. Artifact Provenance & Cryptographic Checksums

| Artifact File | Description | SHA-256 Checksum |
|---|---|---|
| `backend/rag_premise_verifier.php` | Hybrid Verifier with Decoupled Tier-1 Fast Path & Gating | `c6cbdb38669e06180598685ba056345ec41b072236a5369bb93ebc59bf6a12df` |
| `EXP-0031-TIER1-FORENSICS.md` | Forensic analysis of all 46 false refutations from EXP-0030 | `f28ba24a1b02b70f07b1e4fbbbe08c772be56a0cf26aa0eaae3ba891d4e77dd6` |
| `EXP-0031-DESIGN.md` | Architecture design & 5-point structural pipeline specification | `34e4499fbce573752e50cf60bcaeb7ccfaae34764d26f63457a4e69b0ebfd75e` |
| `EXP-0031-TIER1-CHALLENGE-DATASET.json` | Targeted Tier-1 Challenge Dataset ($N = 150$) | `a9f5d376be459ea3a493c0d8d08cb57ff17865c15ee98858850937a0916a693b` |
| `EXP-0031-TIER1-CHALLENGE-VALIDATION.md` | Validation report for Challenge Dataset ($N = 150$) | `1d3000b59f3c7a0d4218685799981882bf6ef8c2f03666b6c00d47228a6f2c69` |
| `EXP-0031-BLIND-DATASET.json` | Main Blind Evaluation Dataset ($N = 500$) | `712f9daea02d0f355ed11413ce0d98226937f59279508340d4ea13ec0e80039d` |
| `EXP-0031-BLIND-DATASET-VALIDATION.md` | Cryptographic & collision audit report ($N = 500$) | `cfaefd6928eeb59be83e921d283bf3ca802ee4cefa0458aaec9154a43c7b39ea` |
| `scratch/exp0031_challenge_retrieval_cache.json` | Prefetched SQLite retrieval cache for Challenge Dataset | `5a687177efd92daad8234cdaabe2efdd63ccae119c60151b27799261e55bbb90` |
| `scratch/exp0031_blind_retrieval_cache.json` | Prefetched SQLite retrieval cache for Blind Dataset | `be122411aa58513731aff4ae0af570a6c69ddd745524de85ee37416b2f8030ab` |
| `EXP-0031-ABLATION-RESULTS.json` | Ablation results across E0–E4 on Challenge Dataset | `3198316d7a3810938b5847b2f716a8d5f77cccefad4b6bdfe0eb83c204a8fcb2` |
| `EXP-0031-RESULTS.json` | Full per-case predictions & metrics on Blind Dataset ($N = 500$) | Dynamic |
| `EXP-0031-ERROR-ANALYSIS.md` | Residual error forensics and boundary failure analysis | Dynamic |
| `EXP-0031-MANIFEST.json` | Complete experiment manifest and artifact registry | Dynamic |
| `EXP-0031-RESEARCH-REPORT.md` | Full 23-section research report | Dynamic |

---

## 3. End-to-End Replication Protocol

### Step 1: Forensic Trace Extraction & Categorization
```powershell
php scratch/forensic_extract_46.php
php scratch/classify_46_taxonomy.php
# Analyzes the 46 false refutations from EXP-0030
# Produces: EXP-0031-TIER1-FORENSICS.md
```

### Step 2: Challenge Dataset Construction ($N = 150$)
```powershell
php scratch/build_challenge_dataset.php
php scratch/build_chal_val_doc.php
# Generates: EXP-0031-TIER1-CHALLENGE-DATASET.json and validation report
```

### Step 3: Blind Dataset Construction & Collision Verification ($N = 500$)
```powershell
php scratch/create_exp0031_blind_dataset.php
php scratch/finalize_blind_dataset.php
php scratch/verify_dataset_collisions.php
php scratch/generate_blind_val_doc.php
# Generates: EXP-0031-BLIND-DATASET.json and validation report
# Verifies: 0 collisions against all 14,450 historical queries
```

### Step 4: Retrieval Cache Generation
```powershell
php -d memory_limit=1024M scratch/prefetch_exp0031.php
# Produces:
# - scratch/exp0031_challenge_retrieval_cache.json
# - scratch/exp0031_blind_retrieval_cache.json
```

### Step 5: Challenge Dataset Ablation (E0 through E4)
```powershell
php -d memory_limit=2048M scratch/run_exp0031_challenge_ablation.php
# Evaluates modes E0, E1, E2, E3, E4 on N = 150
# Produces: EXP-0031-ABLATION-RESULTS.json
```

### Step 6: 500-Case Blind Evaluation (E0 through E4)
```powershell
php -d memory_limit=2048M scratch/run_exp0031_blind_evaluation.php
# Evaluates modes E0, E1, E2, E3, E4 on N = 500
# Computes McNemar test and full confusion matrices
# Produces: EXP-0031-RESULTS.json
```

---

## 4. Invariant Verification

1. **Production Isolation:** `EduConnect-LMS-Production` directory is unmodified.
2. **Deterministic Reproducibility:** Fixed random seeds, temperature = 0.0, identical Ollama prompt formatting.
3. **No Benchmark Hardcoding:** Zero test queries, identifiers, or ground-truth labels are embedded in verifier logic.
4. **Curriculum Grounding:** Closed-domain evidence boundary invariant (`evidence_used: true`) preserved across 100% of exits.