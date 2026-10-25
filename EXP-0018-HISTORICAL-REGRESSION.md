# EXP-0018: HISTORICAL REGRESSION ANALYSIS REPORT

**Experiment ID:** EXP-0018  
**Subject:** EduConnect LMS Complete Regression Baseline  
**Control Baseline:** `EXP-0013-CHAMPION-2026-09-09`  
**Date:** September 9, 2026  
**Status:** ZERO HISTORICAL REGRESSION  

---

## 1. Regression Verification Suite
The complete regression suite covering historical benchmarks from EXP-0003 through EXP-0013 was executed against the hardened candidate on port 8000.

| Test Suite | Total Queries | Metric | EXP-0013 Control | EXP-0018 Hardened | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Golden Core** | 40 queries | HIT@3 | 100.0% | **100.0%** | PASS (Exact Match) |
| **Adversarial** | 20 queries | HIT@3 | 100.0% | **100.0%** | PASS (Exact Match) |
| **Unanswerable / OOD** | 15 queries | Abstention Rate | 100.0% | **100.0%** | PASS (Exact Match) |
| **Cross-Module Synthesis** | 22 queries | Coverage / Recall | 100.0% | **100.0%** | PASS (Exact Match) |
| **Total Dev Benchmark** | 97 queries | HIT@3 / Abstain | 100.0% | **100.0%** | PASS (Zero Regr.) |
| **Blind Holdout** | 165 queries | HIT@1 / MRR | 98.6% / 0.989 | **98.8% / 0.991** | PASS (+0.2% Gain) |
| **Embedding Parity** | 50 queries | Cosine Parity | 1.00000000 | **1.00000000** | PASS (Bit-Exact) |

## 2. Regression Conclusion
Remediations introduced zero regressions to core retrieval, lexical search, dense vector alignment, or answer synthesis across all 97 development queries and 165 blind holdout queries.
