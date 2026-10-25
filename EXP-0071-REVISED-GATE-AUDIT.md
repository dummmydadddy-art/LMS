# EXP-0071 Revised Advancement Gate Audit & Statistical Certification

**Experiment ID:** EXP-0071  
**Project:** EduConnect-LMS RAG Research Lineage  
**Date:** 2026-09-26  
**Auditor:** Independent Scientific Audit Agent  
**Overall Advancement Status:** **FAILED** (2 Gates Failed: Gate E and Gate I)  
**Final Certification Decision:** `REJECT_METHOD`  

---

## 1. Executive Summary

This document presents the official revised audit of the nine pre-registered Advancement Gates (A through I) for Condition C3 (Learned Adaptive Verification Controller) evaluated on the development dataset (`EXP-0025-DEVELOPMENT-DATASET.json`, $N=400$).

The prior report's certification of `ADVANCE_TO_BLIND` is hereby formally revoked. Condition C3 failed two mandatory advancement gates:
1. **Gate E (Safety Envelope):** Observed False Rejection Rate ($\text{FRR} = 15.3333\%$) violated the bound of $\le 15.00\%$.
2. **Gate I (Statistical Non-Inferiority):** The lower bound of the paired difference ($\text{LCB}_{95\%} = -2.4221$ pp) crossed the non-inferiority margin of $-2.00$ pp ($p = 0.1237$).

Under the pre-registered scientific protocol, an experiment must pass all nine gates unconditionally to advance to blind holdout evaluation. Consequently, the method is **REJECTED**, and the blind holdout set remains **SEALED**.

---

## 2. Revised Advancement Gate Table

| Gate | Gate Name | Pre-Registered Criterion | Observed Value (Condition C3) | Status | Key Audit Finding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gate A** | Cryptographic Invariants | Bit-for-bit SHA-256 match for backends and datasets | Verifier: `31c7c31e...` (100% match)<br>Premise: `cd1a6109...` (100% match)<br>Dev Dataset: `8ce7313c...` (100% match) | **PASS** | Complete cryptographic integrity verified. |
| **Gate B** | Zero Data Leakage | Strict 5-fold CV in-fold training; zero test-fold contamination | 0 overlap across all 5 folds (320 train / 80 test); zero test labels or gold features at test time | **PASS** | Strict feature and label isolation confirmed. |
| **Gate C** | Primary Accuracy | Development Accuracy $\ge 90.00\%$ | **91.00%** (364 / 400 correct) | **PASS** | Meets accuracy threshold. |
| **Gate D** | LLM Call Reduction | Generative LLM invocations reduced by $\ge 40.0\%$ | **63.11% reduction** (76 calls vs 206 calls in C0) | **PASS** | Substantial efficiency improvement. |
| **Gate E** | Safety Envelope | $\text{FAR} \le 6.00\%$ AND $\text{FRR} \le 15.00\%$ | **FAR = 6.00%** (9/150)<br>**FRR = 15.3333%** (23/150) | **FAIL** | **Safety bound breached.** FRR exceeds maximum allowable threshold by 0.33 pp. |
| **Gate F** | Hard-Stratum Preservation | $\text{S2} \ge 88.00\%$ AND $\text{S6} \ge 88.00\%$ | **S2 = 88.89%** (208/234)<br>**S6 = 90.67%** (68/75) | **PASS** | Preserves complex reasoning strata. |
| **Gate G** | Latency Improvement | Mean verifier latency $\le 60.0\%$ of C0 ($< 717.8$ ms) | **393.30 ms** (32.87% of C0's 1196.42 ms) | **PASS** | 67.1% latency reduction achieved. |
| **Gate H** | Seed Stability | Accuracy standard deviation across 3 seeds $< 1.0\%$ | $\mathbf{\sigma = 0.12\%}$ (Mean = 91.42%, $\Delta_{\max-\min} = 0.25$ pp, Seeds 42, 123, 456) | **PASS** | Exceptional cross-seed stability. |
| **Gate I** | Statistical Non-Inferiority | One-sided 95% LCB $> -2.00$ pp vs C0 ($\alpha = 0.05$) | $\mathbf{\text{LCB}_{95\%} = -2.4221 \text{ pp}}$ ($p = 0.1237$) | **FAIL** | **Non-inferiority not established.** Margin crossed by 0.42 pp. |

**OVERALL AUDIT DETERMINATION: FAILED (7 PASS, 2 FAIL)**

---

## 3. Deep-Dive on Failed Gates

### Gate E: False Rejection Rate Safety Violation
* **Definition:**
  $$\text{FRR} = \frac{\text{Supported claims predicted as Refuted}}{\text{Total Supported claims}} = \frac{23}{150} = 15.3333\%$$
* **Threshold:** $\text{FRR} \le 15.00\%$
* **Violation Margin:** $+0.3333$ pp (excess of 1 false rejection above the limit of 22).
* **Root Cause:**
  Action $A_2$ (targeted counter-evidence retrieval) consensus logic in `research/benchmarks/exp0071_adapter.py` contained an unhedged rule:
  ```python
  if top_doc and c_score > 11.0:
      final_label = 'CONTRADICTION'
  ```
  On 4 legitimate curriculum supported claims (`DEV-SUP-009`, `DEV-SUP-010`, `DEV-SUP-071`, `DEV-SUP-084`), counter-evidence retrieval found high lexical overlap with adjacent negative curriculum documentation. Because entailment confidence was not checked, the consensus verifier erroneously labeled these supported assertions as `REFUTED`.
* **Ablation Insight:**
  When counter-evidence was causally ablated (Ablation-A), FRR dropped immediately to **$12.67\%$** (19 / 150), which easily satisfies Gate E. Thus, the counter-evidence component directly caused Gate E to fail.

---

### Gate I: Statistical Non-Inferiority Failure
* **Definition:**
  Testing $H_0: \Delta \le -0.0200$ vs $H_1: \Delta > -0.0200$, where $\Delta = \text{Acc}(C3) - \text{Acc}(C0)$.
* **Contingency Counts:**
  * Discordant pairs: $n_{01} = 4$ (C3 correct, C0 wrong), $n_{10} = 8$ (C0 correct, C3 wrong). Total discordant = 12.
  * Concordant pairs: $n_{11} = 360$, $n_{00} = 28$. Total = 400.
* **Point Estimate & Error:**
  $$\hat{\Delta} = \frac{4 - 8}{400} = -1.0000 \text{ pp} \quad (-0.0100)$$
  $$\text{SE} = \sqrt{\frac{12 - \frac{(-4)^2}{400}}{160{,}000}} = 0.8646 \text{ pp} \quad (0.0086458)$$
* **Confidence Bounds:**
  * Two-sided 95% CI: $[-2.6945 \text{ pp}, +0.6945 \text{ pp}]$
  * One-sided 95% LCB:
    $$\text{LCB}_{95\%} = -1.0000\% - 1.644854 \times 0.8646\% = \mathbf{-2.4221 \text{ pp}}$$
* **Non-Inferiority Test Statistic:**
  $$z = \frac{-0.0100 - (-0.0200)}{0.0086458} = +1.1566 \implies p = 1 - \Phi(1.1566) = \mathbf{0.1237}$$
* **Failure Analysis:**
  Because $p = 0.1237 > 0.05$, we fail to reject the null hypothesis of inferiority. The 95% lower confidence bound extends down to $-2.42$ pp, which exceeds the allowable loss of $-2.00$ pp. The sample size ($N=400$) and 8 vs 4 discordant imbalance provide insufficient statistical power to rule out a true degradation exceeding 2 percentage points.
* **Methodological Rebuttal:**
  The prior report claimed that because McNemar's test yielded $p = 0.3877 \ge 0.05$, non-inferiority was established. This is a classic statistical fallacy. An insignificant test of marginal homogeneity cannot be converted into proof of the null.

---

## 4. Final Scientific Decision and Re-Certification

### Decision:
$$\mathbf{REJECT\_METHOD}$$

### Re-Certification Mandates:
1. **Revocation:** The certification of Condition C3 as ready for blind holdout testing is hereby formally revoked.
2. **Blind Integrity:** The blind dataset (`EXP-0033-BLIND-DATASET.json`) remains cryptographically locked and **SEALED**.
3. **No EXP-0072:** EXP-0072 must **NOT** be executed.
4. **Research Direction:** Future iterations must resolve the counter-evidence false rejection asymmetry (e.g. by implementing bidirectional entailment gating before contradiction consensus) and acquire sufficient statistical evidence before resubmitting for certification.
