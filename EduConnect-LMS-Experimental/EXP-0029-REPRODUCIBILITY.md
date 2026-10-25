# EXP-0029: Reproducibility Guide & Provenance Log

**Experiment ID:** EXP-0029 Ambiguity + Entity-Grounding Pre-Filter  
**Git Branch:** `exp-0029`  
**Base Commit:** `2cfc95a`  
**Date:** 2026-09-16 07:40:53 UTC  
**PHP Version:** 8.3.32  
**LLM Model:** `llama3.2:latest` (Ollama 127.0.0.1:11434, temperature=0.0, num_predict=25, num_thread=8)  

## 1. Cryptographic File Provenance

| File | Path | SHA-256 Checksum |
|------|------|------------------|
| Verifier Implementation | `backend/rag_premise_verifier.php` | `c7329a0a8501dcdcc6b439c788df649a91ba9ab31d71554ff8c733036b8ee503` |
| Blind Dataset (300 cases) | `EXP-0029-BLIND-DATASET.json` | `ee8c6dc122516a06eb7be90104ba5617e2fe788eaf66b6035aa78c205d92f120` |
| Blind Retrieval Cache | `scratch/blind_retrieval_cache_300.json` | `49dd9ac6c4f09a39bf41800d467514523770777ed42e0945203b9cd9a7592d98` |
| Ablation Results | `EXP-0029-ABLATION-RESULTS.json` | `47dbd2a370c6e020194a952723d1279f88cdf727c403eba9e53dee18621cc507` |
| Main Evaluation Results | `EXP-0029-RESULTS.json` | `468b3919cc2d887dfc0ca77c67e839966c45fd51bda64aa4587c173bac410dad` |
| Design Specification | `EXP-0029-DESIGN.md` | `1d3fa267401949a4eaf31e50260f79f64525ba17ef44bf04333a00f57796508b` |
| Threshold Analysis | `EXP-0029-THRESHOLD-ANALYSIS.md` | `65a0636784cc9576a6474faff4a8234ea5c9c9c94451ac1493ace6a71d936914` |
| Blind Dataset Validation | `EXP-0029-BLIND-DATASET-VALIDATION.md` | `412209d1d00f194b5bf7926f87640dde88c6e3eea9b5ec8f70565bc4deca52a4` |

## 2. Command Provenance & Reproduction Sequence

To reproduce all results from scratch in `EduConnect-LMS-Experimental`:

```bash
# 1. Verify working branch and clean status
git checkout exp-0029

# 2. Run blind dataset build and collision validation
php scratch/build_blind_dataset.php
php scratch/validate_blind_dataset.php

# 3. Prefetch retrieval evidence cache
php scratch/prefetch_blind_retrieval.php

# 4. Execute C0-C7 ablation study on shadow benchmark
php scratch/run_exp0029_ablations.php

# 5. Execute 300-case comparative evaluation across A5, B5, C1, C4, C7
php scratch/run_blind_evaluation.php

# 6. Execute security & production isolation regression check
php scratch/run_security_regression_check.php
```

## 3. Environment & Configuration Parameters

- **Ollama Endpoint:** `http://127.0.0.1:11434/api/generate`
- **Keep-Alive:** `-1` (resident in VRAM)
- **Pass 1 Decision Threshold:** `0.70`
- **Pass 2 Decision Threshold:** `0.70`
- **Pre-Filter Minimum Stem Overlap:** `0.20`
- **Pre-Filter Inadequate Overlap Count:** `< 2` stems
- **Pre-Filter Similarity Floor:** `0.35` (below 0.35 = INADEQUATE)
- **Strict Invariant:** `evidence_used === true` (100% verified)
