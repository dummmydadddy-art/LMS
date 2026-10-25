# EXP-0037: Pre-Registered Statistical Analysis Plan

**Experiment:** EXP-0037 (Controlled Ambiguity Mitigation Experiment)  
**Parent Lineage:** `d8c1ed3` (EXP-0036 Development HEAD)  
**Authoritative Baseline Comparators:**
* EXP-0035 M2 (Authoritative Clean Baseline): Accuracy = 66.80% (334/500), FAR = 18.12%, Refutation Recall = 53.70%
* EXP-0036 N7 (Parent Semantic Champion): Accuracy = 68.60% (343/500), FAR = 20.56%, Refutation Recall = 67.90%
* EXP-0031 R0 (Historical Reference Baseline): Accuracy = 69.60% (348/500), Macro F1 = 68.58%

**Status:** PRE-REGISTERED & FROZEN PRIOR TO BLIND EVALUATION  
**Date:** 2026-09-17  

---

## 1. Primary Statistical Objectives

EXP-0037 investigates whether a deterministic ambiguity routing guard can resolve the -14.67 pp collapse on AMBIGUOUS queries observed in EXP-0036, thereby driving Standard FAR down to the safety envelope ($\le 18.50\%$) while preserving N7's +16.80 pp breakthrough on FALSE_PREMISE refutation.

---

## 2. Hypothesis Testing Framework

### Primary Hypotheses:
* **H1 (FAR Reduction):** The guarded candidate achieves Standard $	ext{FAR} \le 18.50\%$ on blind evaluation (reducing the 20.56% failure of N7).
* **H2 (Ambiguity Regression Mitigation):** Accuracy on AMBIGUOUS queries increases by at least $+8.00$ pp over N7 (recovering towards or exceeding M2's 64.00%).
* **H3 (Refutation Preservation):** Refutation Recall remains $\ge 65.00\%$ and FALSE_PREMISE accuracy remains $\ge 64.00\%$ (preserving the core semantic gain of N7).
* **H4 (OOD Safety Invariant):** OOD Recall remains $\ge 90.00\%$ and Novel-OOD Recall remains $\ge 90.00\%$.
* **H5 (Superior Overall Performance):** Accuracy and Macro F1 match or exceed N7 (68.60% / 68.44%) while maintaining safety compliance.

---

## 3. Paired Inferential Test Specifications

### 3.1 Candidate vs EXP-0036 N7
* **Test:** McNemar's Test with Edwards' Continuity Correction on the $N = 500$ paired binary correctness vectors:
  $$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
  where:
  - $n_{01}$: cases where N7 was incorrect but Candidate is correct.
  - $n_{10}$: cases where N7 was correct but Candidate is incorrect.
* **Significance Level:** $\alpha = 0.05$ (two-sided).
* **Confidence Interval:** Wilson score / Newcombe paired difference 95% CI on $\Delta = Acc_{Cand} - Acc_{N7}$.

### 3.2 Candidate vs EXP-0035 M2
* **Test:** Paired McNemar's Test with continuity correction ($p < 0.05$).
* **Requirement:** $n_{01} > n_{10}$ with $\Delta Acc > 0$.

### 3.3 Non-Inferiority Comparison vs EXP-0031 R0 (69.60%)
* **Test:** One-sided 95% Lower Confidence Bound (LCB) on accuracy difference:
  $$\text{LCB} = (Acc_{Cand} - Acc_{R0}) - 1.645 \times \text{SE}_{\Delta}$$
* **Non-Inferiority Margin:** $\Delta_{NI} = -3.00\text{ pp}$.
* **Criterion:** Non-inferiority is formally established if $\text{LCB} > -3.00\text{ pp}$.

---

## 4. Pre-Registered Decision Thresholds

| Decision Category | Formal Criteria | Action |
|---|---|---|
| **ADOPT** | 1. Blind Standard $\text{FAR} \le 18.50\%$\n2. Blind Accuracy $> 66.80\%$ ($p < 0.05$ vs M2)\n3. Non-inferior to R0 (LCB $> -3.00$ pp)\n4. Refutation Recall $\ge 65.00\%$\n5. OOD Recall $\ge 90.00\%$ | Promote directly to production champion |
| **CONDITIONAL** | 1. Blind Standard $\text{FAR} \le 19.00\%$\n2. Blind Accuracy $\ge 67.50\%$\n3. Refutation Recall $\ge 64.00\%$\n4. Clear ambiguity recovery demonstrated | Qualified candidate for subsequent iteration |
| **REJECT** | 1. Blind Standard $\text{FAR} > 19.50\%$ OR\n2. Refutation Recall collapses below $60.00\%$ OR\n3. OOD Recall drops below $88.00\%$ | Reject candidate; do not deploy |

---

## 5. Frozen Dataset Protocol
* Development dataset: `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256 `8ce7313c...`).
* Blind dataset: `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256 `3b4fd6c7...`).
* Under zero-leakage protocol, blind labels remain completely uninspected until development freeze is formally committed.
