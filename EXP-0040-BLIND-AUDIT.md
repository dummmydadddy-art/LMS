# EXP-0040: Independent Audit Report

**Experiment:** EXP-0040: Hierarchical Parent-Child Retrieval  
**Branch:** `exp-0040`  
**Candidate:** `P1` — Hierarchical Parent-Child Retrieval  
**Baseline Comparator:** `P0` — C2_085 Child-Only Retrieval  
**Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`)  
**Prediction Artifact:** `EXP-0040-BLIND-PREDICTIONS.json` (SHA-256: `56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1`, LOCKED READ-ONLY)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (HEAD: `1768832`, UNTOUCHED)  
**Auditor:** Independent Research Integrity Auditor  
**Date:** September 17, 2026  
**Audit Determination:** **PASS — PRODUCTION ADOPTION CERTIFIED**  

---

## 1. Zero-Trust Verification Checklist

| Audit Check | Registered Requirement | Verified Measurement | Result |
|---|---|---|---|
| **Blind Dataset Hash** | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | **PASS** |
| **Prediction Artifact Hash** | Immutable hash lock recorded before unblinding | `56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1` (Read-Only) | **PASS** |
| **Prediction Count & Uniqueness** | Exactly 500 unique IDs, 0 nulls, 0 duplicates | Exactly 500 valid predictions | **PASS** |
| **Two-Phase Isolation** | Zero labels or categories loaded during Phase 1 | Verified via code inspection and runtime logs | **PASS** |
| **Frozen Verifier Integrity** | A4 byte-identical to EXP-0039 (`31c7c31ef630...`) | SHA-256 confirmed byte-identical | **PASS** |
| **C2_085 Embedding Freeze** | No re-embedding or chunk alteration | Exact 76 chunks and embeddings preserved | **PASS** |
| **Safety Ceiling (FAR)** | Standard FAR $\le 18.50\%$ | Observed FAR = **17.07%** (49 / 287) | **PASS** |
| **Non-Inferiority Bound** | One-sided 95% LCB $> -3.00$ pp | Observed LCB = **-0.9771 pp** | **PASS** |
| **Production Isolation** | `EduConnect-LMS-Production` untouched | HEAD `1768832` confirmed clean | **PASS** |
| **Git Hygiene & Discipline** | Clean worktree, separate completion commit | All commits atomic and verified | **PASS** |

---

## 2. Independent Recomputation of All Metrics

An independent script recomputed all metrics directly from the raw `EXP-0040-BLIND-PREDICTIONS.json` and `EXP-0033-BLIND-DATASET.json` files without referencing intermediate files:
- **Total Correct:** 360 / 500 = **72.00%** (Identical)
- **Macro F1:** **72.24%** (Identical)
- **False Acceptance Rate (FAR):** 49 / 287 = **17.07%** (Identical)
- **False Rejection Rate (FRR):** 59 / 213 = **27.70%** (Identical)
- **Supported Recall:** 154 / 213 = **72.30%** (Identical)
- **Refutation Recall:** 110 / 162 = **67.90%** (Identical)
- **NOT_ESTABLISHED Recall:** 96 / 125 = **76.80%** (Identical)
- **OOD Recall:** 47 / 50 = **94.00%** (Identical)
- **Novel-OOD Recall:** **N/A** (No dedicated Novel-OOD subset in dataset)
- **Contingency:** $n_{11}=347, n_{00}=130, n_{01}=13, n_{10}=10$ (Identical)
- **McNemar $p$-value:** **0.67764** (Identical)
- **95% CI:** $[-1.28\text{{ pp}}, +2.48\text{{ pp}}]$ (Identical)

---

## 3. Auditor Verdict

Candidate P1 meets all research, safety, statistical, and architectural standards.
The experiment is certified with verdict: **`PASS — FULL PROTOCOL COMPLIANCE`**.
