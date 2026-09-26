# EXP-0071 Final Research Report: Adaptive Verification Budget Allocation with Evidence Sufficiency and Risk-Controlled Escalation

**Experiment ID:** EXP-0071  
**Project:** EduConnect-LMS RAG Research Lineage  
**Date:** 2026-09-26  
**Status:** COMPLETE — AUDITED & RE-CERTIFIED  
**Decision:** `REJECT_METHOD` (Prior `ADVANCE_TO_BLIND` Revoked)  
**Blind Dataset Status:** `BLIND_STATUS = SEALED` (SHA-256 Verified, Unopened)  

---

## 1. Executive Summary

EXP-0071 evaluated an **Adaptive Verification Controller (AVC)**—dynamically allocating a finite verification budget ($B \le 3$) among fast-path rules ($A_0$), cheap cross-encoder verification ($A_1$), targeted counter-evidence retrieval ($A_2$), expensive generative LLM escalation ($A_3$), and epistemic abstention ($A_4$)—to test whether it can preserve the accuracy and safety of an expensive generative LLM verifier (C0 control) while reducing inference latency and generative LLM call volume.

### Summary of Audit and Re-Certification Findings:
1. **Primary Development Accuracy:** Learned controller Policy P1 (Condition `C3`, $B=3$) achieved **$91.00\%$ dev accuracy** (364 / 400), trailing the frozen C0 control ($92.00\%$) by 1.00 percentage point.
2. **Generative LLM Invocations Reduced by $63.11\%$:** While C0 invoked `llama3.2` on all 206 Tier-2 claims, C3 escalated only 76 claims to the generative LLM (63 unique cases in terminal accounting), successfully resolving 81.0% of claims via fast paths, cheap NLI, and counter-evidence consensus.
3. **Inference Latency Reduced by $67.1\%$:** Mean verifier latency dropped from $1196.42$ ms (C0) to **$393.30$ ms** (C3).
4. **Gate E Safety Envelope Failed:** Observed False Rejection Rate (FRR) was **$15.3333\%$** (23 / 150 supported claims erroneously refuted), breaching the pre-registered safety envelope ($\text{FRR} \le 15.00\%$). Gate E is **FAILED**.
5. **Gate I Statistical Non-Inferiority Failed:** Under a paired non-inferiority margin of $\Delta = -2.00$ pp, the one-sided 95% Lower Confidence Bound is **$-2.4221$ pp** ($p = 0.1237$). Non-inferiority was **NOT ESTABLISHED**. Gate I is **FAILED**.
6. **Counter-Evidence Causality Defect:** Tracing of $A_2$ invocations revealed only 1 true recovery (`DEV-MIX-027`), but 4 induced false rejections on supported claims (`DEV-SUP-009`, `DEV-SUP-010`, `DEV-SUP-071`, `DEV-SUP-084`), which pushed FRR over the safety limit. Clean causal ablation (Ablation-A) without counter-evidence achieves identical accuracy ($91.50\%$) and drops FRR to $12.67\%$.

Because Gate E and Gate I failed, the certification is revoked and the method is rejected. The blind holdout dataset remains **SEALED**.

---

## 2. Experimental Conditions and Results Summary

| Condition | Architecture / Policy | Budget ($B$) | Dev Accuracy | Supported Recall | Refutation Recall | FAR | FRR | Mean Latency | LLM Calls | LLM Call Reduction | Non-Inferiority ($H_1: \Delta > -2\%$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`C0`** | Frozen A4 + `llama3.2` Control | 3 | **92.00%** | 87.33% | 92.67% | 6.00% | 12.67% | 1196.4 ms | 206 | 0.0% | Reference |
| **`C1`** | Fine-Tuned MiniLM Alone | 1 | **82.75%** | 65.33% | 89.33% | 1.33% | 12.00% | 42.4 ms | 0 | 100.0% | Inferior ($p < 0.0001$) |
| **`C2`** | Fixed-Rule Adaptive Controller (P0) | 3 | **85.00%** | 68.67% | 92.67% | 2.67% | 20.67% | 237.9 ms | 40 | 80.6% | Inferior ($p = 0.0009$) |
| **`C3`** | **Learned Adaptive Controller (P1)** | **3** | **91.00%** | **84.67%** | **92.67%** | **6.00%** | **15.33%** | **393.3 ms** | **76** | **63.1%** | **NOT ESTABLISHED ($p = 0.1237$)** |
| **`C4`** | Prior Retrained Ablation (No CE)* | 3 | **78.25%** | 61.33% | 81.33% | 0.67% | 9.33% | 47.4 ms | 1 | 99.5% | Confounded Method |
| **`Abl-A`**| **Clean Causal Ablation (No CE)** | **3** | **91.50%** | **87.33%** | **92.00%** | **5.33%** | **12.67%** | **388.5 ms** | **57** | **72.3%** | **Passes Gate E (FRR=12.67%)** |
| **`C5`** | Retrained Ablation (No Suff) | 3 | **91.00%** | 85.33% | 92.00% | 6.00% | 14.00% | 408.8 ms | 80 | 61.2% | Feature Effect: $-1.00$ pp |

*\*Note:* Prior C4 was confounded by target remapping during model retraining, causing routing collapse to cheap NLI. Clean causal ablation (Ablation-A) with identical C3 model parameters yields 91.50% accuracy with 12.67% FRR.

---

## 3. Stratified Breakdown Across Difficulty Strata (S1–S7)

| Stratum | Description | $n$ | `C0` (LLM) | `C1` (MiniLM) | `C2` (P0) | `C3` (P1) | `Ablation-A` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S1** | Antonym-Assisted Refutation | 166 | 93.37% | 83.73% | 86.14% | **93.98%** | 93.98% |
| **S2** | Non-Antonym Structural Refutation | 234 | 91.03% | 82.05% | 84.19% | **88.89%** | 89.74% |
| **S3** | High-Overlap Supported Curriculum | 100 | 85.00% | 61.00% | 66.00% | **81.00%** | 84.00% |
| **S4** | Low-Overlap Paraphrase & Negation | 50 | 92.00% | 74.00% | 82.00% | **92.00%** | 92.00% |
| **S5** | Normative & Universal Assertions | 81 | 91.36% | 80.25% | 83.95% | **90.12%** | 91.36% |
| **S6** | Compound Multi-Clause Queries | 75 | 90.67% | 86.67% | 88.00% | **90.67%** | 90.67% |
| **S7** | Out-of-Domain Inquiries | 100 | 98.00% | 99.00% | 99.00% | **98.00%** | 98.00% |

Condition C3 satisfied Gate F on S2 ($88.89\% \ge 88.00\%$) and S6 ($90.67\% \ge 88.00\%$).

---

## 4. Reconciled Terminal Action Accounting

Assigning exactly one terminal action per case across all 400 development cases resolves the previous arithmetic discrepancy:

| Terminal Action | Description | Case Count ($n$) | Correct Cases ($n$) | Action Accuracy | Proportion of Cases |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$A_0$ Fast Path** | Deterministic regex / Ambiguity guard | 194 | 181 | 93.30% | 48.50% |
| **$A_1$ Cheap NLI** | MiniLM accepted without escalation | 128 | 121 | 94.53% | 32.00% |
| **$A_2$ Counter-Evidence** | Resolved via counter-evidence consensus | 15 | 11 | 73.33% | 3.75% |
| **$A_3$ Expensive LLM** | Escalated to `llama3.2` | 63 | 51 | 80.95% | 15.75% |
| **$A_4$ Epistemic Abstain** | Terminal abstention | 0 | 0 | N/A | 0.00% |
| **TOTAL** | — | **400** | **364** | **91.00%** | **100.00%** |

* $\sum \text{Action Counts} = 194 + 128 + 15 + 63 + 0 = 400$
* $\sum \text{Correct Cases} = 181 + 121 + 11 + 51 + 0 = 364$

---

## 5. Advancement Gates Evaluation

| Gate | Criterion Description | Pre-Registered Threshold | Observed Value (C3) | Revised Status |
| :--- | :--- | :--- | :--- | :--- |
| **Gate A** | Cryptographic Invariant Integrity | Bit-for-bit SHA-256 match | All hashes verified 100% | **PASS** |
| **Gate B** | Zero Data Leakage | 5-Fold In-Fold CV | Strict in-fold training (0 test leakage) | **PASS** |
| **Gate C** | Primary Accuracy | Accuracy $\ge 90.00\%$ | **$91.00\%$** (364/400) | **PASS** |
| **Gate D** | LLM Call Reduction | Call reduction $\ge 40.0\%$ | **$63.11\%$** (76 calls vs 206) | **PASS** |
| **Gate E** | Safety Envelope | $\text{FAR} \le 6.00\%$, $\text{FRR} \le 15.00\%$ | **FAR = 6.00%**, **FRR = 15.3333%** | **FAIL** |
| **Gate F** | Hard-Stratum Preservation | $\text{S2} \ge 88.00\%$, $\text{S6} \ge 88.00\%$ | **S2 = 88.89%**, **S6 = 90.67%** | **PASS** |
| **Gate G** | Latency Improvement | Latency $\le 60.0\%$ of C0 | **32.87% of C0** ($393$ vs $1196$ ms) | **PASS** |
| **Gate H** | Seed Stability | Accuracy Std Dev $< 1.0\%$ | **$\sigma = 0.12\%$**, $\Delta = 0.25$ pp | **PASS** |
| **Gate I** | Statistical Non-inferiority | One-sided 95% LCB $> -2.00$ pp vs C0 | **$\text{LCB}_{95\%} = -2.4221$ pp** ($p = 0.1237$) | **FAIL** |

**Overall Gate Status:** **FAILED (2 FAILED GATES)**

---

## 6. Scientific Decision and Recommended Next Action

### Formal Decision:
$$\mathbf{REJECT\_METHOD}$$

### Recommended Next Steps:
1. `ADVANCE_TO_BLIND` is rescinded.
2. `EXP-0033-BLIND-DATASET.json` remains sealed and untouched.
3. `EXP-0072` is cancelled.
4. Future iterations must eliminate unhedged counter-evidence consensus that causes false rejections on supported claims.
