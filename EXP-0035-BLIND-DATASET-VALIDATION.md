# EXP-0035: Blind Dataset Integrity and Pre-Flight Validation

**Experiment:** EXP-0035 (Frozen Blind Evaluation)  
**Evaluated Commit:** `f392b13`  
**Evaluation Date:** 2026-09-16  
**Dataset Path:** `EXP-0033-BLIND-DATASET.json`  
**Status:** VALIDATED & BIT-IDENTICAL  

---

## 1. SHA-256 Hash Verification

| Parameter | Expected / Historical Value | Evaluated Disk Value | Match Status |
|---|---|---|---|
| **File Path** | `EXP-0033-BLIND-DATASET.json` | `EXP-0033-BLIND-DATASET.json` | MATCH |
| **Record Count ($N$)** | 500 | 500 | MATCH |
| **Expected SHA-256** | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | **EXACT MATCH** |

*Verification Command:*
```powershell
(Get-FileHash -Algorithm SHA256 EXP-0033-BLIND-DATASET.json).Hash
# Returns: 3B4FD6C70258982ACB9F4B87DED84DBB401EE821F5A853A6547CF982C18A7B08
```

---

## 2. Blind Partition Composition Audit

The 500 blind queries span the following certified distributions:

| Category | Query Count | Percentage |
|---|---|---|
| `SUPPORTED` (Curriculum Ground Truth) | 213 | 42.60% |
| `FALSE_PREMISE` (Novel Misconceptions) | 147 | 29.40% |
| `AMBIGUOUS` (Subjective / Underspecified) | 70 | 14.00% |
| `OOD` (Out-of-Curriculum Technologies) | 70 | 14.00% |
| **Total** | **500** | **100.00%** |

Within these categories, challenge tags include:
* `NOVEL_OOD`: 25 queries
* `PARAPHRASE`: 50 queries
* `ADVERSARIAL`: 75 queries

---

## 3. Pre-Flight Isolation Certification

1. **Zero Prior Tuning:** Development parameter tuning ($\alpha = 0.50$, pool = 15, intent threshold mapping, and clause segmentation regex) was conducted exclusively on `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$).
2. **Zero Contamination:** At no point during EXP-0035 design, development, or implementation were blind labels accessed or used for feature selection or threshold calibration.
3. **Frozen Implementation:** All configuration parameters in `EXP-0035-CONFIG-FROZEN.json` match `backend/rag_intent_clause_verifier.php` without discrepancy.
