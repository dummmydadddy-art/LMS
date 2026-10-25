# EXP-0037: Blind Benchmark Readiness Certification

**Experiment:** EXP-0037 (Controlled Ambiguity Mitigation Experiment)  
**Evaluated Branch:** `exp-0037`  
**Parent Commit:** `d8c1ed31d42cd7e8472b04a0853541631c32030a`  
**Development Champion:** **A4** (Stage-2 Ambiguity Routing Guard + Neutrality Prior `P4_neutral` + Dynamic Threshold tau_entail = 0.85, tau_contra = 0.80)  
**Status:** DEVELOPMENT FROZEN — READY FOR INDEPENDENT BLIND BENCHMARK AUDIT  
**Date:** 2026-09-17  

---

## 1. Readiness Certification Checklist

* [x] **Branch Verified:** Working tree is clean on branch `exp-0037` branched from `d8c1ed3`.
* [x] **Zero Blind Contamination:** The blind evaluation dataset (`EXP-0033-BLIND-DATASET.json`, $N = 500$, SHA-256 `3b4fd6c7...`) has NOT been executed, inspected, unblinded, or mined during development.
* [x] **Development Ablations Complete:** All 5 modes (A0, A1, A2, A3, A4) evaluated on `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256 `8ce7313c...`).
* [x] **Safety Boundaries Verified on Dev:** Standard FAR reduced from 4.40% to **2.40%** (-2.00 pp), eliminating 5 false acceptances with zero regressions.
* [x] **Refutation Gains Preserved:** Refutation Recall rose from 92.00% to **95.33%** (+3.33 pp), and FALSE_PREMISE accuracy rose from 92.00% to **96.00%** (+4.00 pp).
* [x] **OOD Invariants Preserved:** Out-of-Distribution Recall strictly maintained at **99.00%** (99/100).
* [x] **False Abstentions Preserved:** 0 false abstentions across all 400 queries.
* [x] **Configuration Frozen:** All parameters, prompt hashes, and architecture modules frozen in `EXP-0037-CONFIG-FROZEN.json`.
* [x] **Statistical Plan Pre-Registered:** Paired McNemar tests vs N7 and M2, and non-inferiority vs R0 pre-registered in `EXP-0037-STATISTICAL-PLAN.md`.

---

## 2. Explicit Stop Condition Confirmation

* **Blind Benchmark Status:** **NOT STARTED**.
* Execution of the EXP-0037 blind benchmark requires separate explicit user authorization.
