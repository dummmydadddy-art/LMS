# EXP-0069 Development Analysis: NLI Probability Calibration & Decision-Boundary Benchmark

**Experiment ID:** EXP-0069  
**Lineage:** EXP-0068 -> EXP-0069  
**Evaluation Scope:** Development Dataset (`EXP-0025-DEVELOPMENT-DATASET.json`, $N=400$)  
**Protocol:** Stratified 5-Fold Cross-Fitting (Strict Out-of-Fold Evaluation, Seed 42)  
**Date:** 2026-09-26  

---

## 1. Executive Summary

EXP-0069 systematically evaluated post-hoc calibration methods—Temperature Scaling ($T$), Class-Bias Calibration ($z+b$), and Vector Scaling ($a\odot z+b$)—applied to two frozen dedicated NLI cross-encoders (`cross-encoder/nli-MiniLM2-L6-H768` and `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`) across 400 development cases.

**Key Findings:**
1. **Class-Bias Calibration (C3)** produced the strongest cross-encoder performance to date:
   - MiniLM accuracy increased from **70.00% to 79.50%** (+9.50 pp, paired McNemar $p = 7.7 \times 10^{-11}$).
   - DeBERTa accuracy increased from **68.00% to 78.75%** (+10.75 pp, paired McNemar $p = 1.1 \times 10^{-11}$).
   - Supported Claim Recall recovered by +24.66 pp (MiniLM: 38.67% -> 63.33%; DeBERTa: 33.33% -> 57.33%).
   - False Acceptance Rate remained safely controlled at **2.67%** (well below the C0 limit of 6.00%).
2. **Temperature Scaling (C2) and Vector Scaling (C4)** exposed an architectural conflict with the A4 verifier:
   - While optimizing proper scoring rules (ECE dropped to **5.83%**, NLL to **0.82**), logit dampening drove calibrated probabilities below the verifier's 0.70 confidence threshold, triggering an accuracy collapse to **56.50%**.
3. **Hypothesis Resolution:**
   - Shifting decision boundaries recovered 38 supported claims, confirming partial calibration bias.
   - However, even under optimal class bias, accuracy (79.50%) remained **-12.50 pp below the C0 control ($92.00\%$, paired McNemar $p = 8.14 \times 10^{-13}$)**.
   - Non-antonym false premises (S2) remained deficient at 76.92% (vs 95.61% for C0).
   - Therefore, the underlying root cause is definitively established as **`REPRESENTATION/TASK-MISMATCH`**.

---

## 2. Comprehensive Numerical Results

### Table 1: End-to-End Development Performance ($N=400$)

| Condition | Architecture | Transform | Accuracy | Macro F1 | Sup Recall | Ref Recall | OOD Recall | FAR | FRR | ECE | NLL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **C0 Control** | Llama-3.2-3B | Generative | **92.00%** | **92.67%** | **87.33%** | **92.67%** | **98.00%** | 6.00% | 12.67% | — | — |
| **MINILM_RAW** | MiniLM2-L6 | Argmax | 70.00% | 68.60% | 38.67% | 83.33% | 97.00% | 0.67% | 11.33% | 50.94% | 2.5719 |
| **MINILM_TEMP** | MiniLM2-L6 | $z / T$ | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | 0.00% | 10.67% | 12.99% | 1.1745 |
| **MINILM_BIAS** | MiniLM2-L6 | $z + b$ | **79.50%** | **80.08%** | **63.33%** | **86.67%** | **96.00%** | 2.67% | 10.67% | 39.46% | 1.9919 |
| **MINILM_VEC** | MiniLM2-L6 | $a z + b$ | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | 0.00% | 10.67% | 11.29% | 0.8413 |
| **DEBERTA_RAW** | DeBERTa-v3 | Argmax | 68.00% | 66.07% | 33.33% | 82.67% | 98.00% | 1.33% | 11.33% | 61.78% | 3.0538 |
| **DEBERTA_TEMP** | DeBERTa-v3 | $z / T$ | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | 0.00% | 10.67% | 18.74% | 1.1763 |
| **DEBERTA_BIAS** | DeBERTa-v3 | $z + b$ | **78.75%** | **79.46%** | **57.33%** | **88.67%** | **96.00%** | 2.67% | 8.67% | 34.11% | 1.8610 |
| **DEBERTA_VEC** | DeBERTa-v3 | $a z + b$ | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | 0.00% | 10.67% | 5.83% | 0.8249 |

---

## 3. Stratified Hard-Category Analysis

### Table 2: Accuracy Breakdown by Research Strata (S1–S7)

| Stratum | Description | N | C0 Control | MINILM_RAW | MINILM_BIAS | DEBERTA_RAW | DEBERTA_BIAS |
|---|---|---|---|---|---|---|---|
| **S1** | Antonym-Assisted Refutation | 81 | 77.78% | 76.54% | 79.01% | 76.54% | 80.25% |
| **S2** | Non-Antonym Refutation | 319 | **95.61%** | 68.34% | **76.92%** | 65.83% | **78.37%** |
| **S3** | High-Overlap Supported | 100 | **85.00%** | 35.00% | **73.00%** | 29.00% | **65.00%** |
| **S4** | Low-Overlap Paraphrase | 50 | **92.00%** | 46.00% | **82.00%** | 42.00% | **80.00%** |
| **S5** | Normative / Universal | 81 | 91.36% | 74.07% | 85.19% | 74.07% | 85.19% |
| **S6** | Compound Multi-Clause | 75 | **90.67%** | 56.00% | **76.00%** | 56.00% | **77.33%** |
| **S7** | Out-of-Domain Inquiries | 100 | **98.00%** | 97.00% | **96.00%** | 98.00% | **96.00%** |

### Stratum Findings:
- **S3 & S4 Recovery:** Class bias calibration recovered substantial ground on supported claims, jumping from 35.00% to 73.00% in S3, and from 46.00% to 82.00% in S4.
- **S2 Persistent Ceiling:** Non-antonym factual refutations only reached 76.92%–78.37%, lagging far behind C0's 95.61% (-18.69 pp).
- **S7 Safety Stability:** Out-of-domain rejection remained stable at 96.00%–98.00%, confirming that shifting the entailment boundary did not cause widespread parametric hallucinations.

---

## 4. Parameter Stability Across 5 Folds

To ensure that the fitted decision boundaries are generalizable and not overfitted to specific folds, parameter variance was tracked across the 5 cross-validation folds ($N=320$ training cases per fold):

### Table 3: Cross-Validation Parameter Estimates & Stability

| Model | Method | Parameter | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean ± Std | Rel Std (%) |
|---|---|---|---|---|---|---|---|---|---|---|
| **MiniLM** | TEMP | $T$ | 7.654 | 7.629 | 7.967 | 7.338 | 7.522 | 7.622 ± 0.205 | 2.69% |
| **MiniLM** | BIAS | $b_{\text{contra}}$ | +0.730 | +0.512 | +0.420 | +0.628 | +0.713 | +0.601 ± 0.119 | 19.79% |
| **MiniLM** | BIAS | $b_{\text{entail}}$ | +1.521 | +1.548 | +1.883 | +1.400 | +1.528 | +1.576 ± 0.162 | 10.29% |
| **MiniLM** | BIAS | $b_{\text{neutral}}$ | -2.251 | -2.060 | -2.303 | -2.028 | -2.241 | -2.177 ± 0.111 | 5.09% |
| **DeBERTa** | TEMP | $T$ | 8.246 | 7.973 | 8.133 | 7.776 | 8.139 | 8.053 ± 0.164 | 2.03% |
| **DeBERTa** | BIAS | $b_{\text{contra}}$ | +1.695 | +1.584 | +1.514 | +1.636 | +1.626 | +1.611 ± 0.060 | 3.73% |
| **DeBERTa** | BIAS | $b_{\text{entail}}$ | +1.390 | +1.378 | +1.637 | +1.266 | +1.424 | +1.419 ± 0.121 | 8.54% |
| **DeBERTa** | BIAS | $b_{\text{neutral}}$ | -3.086 | -2.963 | -3.152 | -2.902 | -3.049 | -3.030 ± 0.088 | 2.92% |

*Result:* All parameters exhibited relative standard deviations $< 20\%$, satisfying Gate F ($\le 25\%$). The stability of $b_{\text{neutral}} \approx -2.18$ (MiniLM) and $-3.03$ (DeBERTa) confirms that the neutral bias is a systematic property of these models on educational benchmarks.

---

## 5. Statistical Significance Analysis (McNemar Paired Tests)

### Table 4: McNemar Discordant Pair Analysis ($N=400$)

| Comparison | $n_{01}$ (Base Wrong, Cand Correct) | $n_{10}$ (Base Correct, Cand Wrong) | Discordant Pairs | Paired Delta | 95% Confidence Interval | Exact Two-Sided $p$-value | Significance |
|---|---|---|---|---|---|---|---|
| **MINILM_BIAS vs MINILM_RAW** | 42 | 4 | 46 | +9.50 pp | [+5.78, +13.22] | $7.70 \times 10^{-11}$ | **Statistically Significant** |
| **DEBERTA_BIAS vs DEBERTA_RAW** | 47 | 4 | 51 | +10.75 pp | [+6.93, +14.57] | $1.10 \times 10^{-11}$ | **Statistically Significant** |
| **MINILM_BIAS vs C0 Reference** | 10 | 60 | 70 | -12.50 pp | [-16.03, -8.97] | $8.14 \times 10^{-13}$ | **Significantly Inferior to C0** |
| **DEBERTA_BIAS vs C0 Reference** | 10 | 63 | 73 | -13.25 pp | [-16.82, -9.68] | $1.52 \times 10^{-13}$ | **Significantly Inferior to C0** |

---

## 6. Error Transition Dynamics

Comparing `MINILM_BIAS` against `MINILM_RAW`:
- **Recovered Cases ($N=42$):**
  - 37 cases previously misclassified as `NOT_ESTABLISHED` (false abstentions) were correctly promoted to `SUPPORTED`.
  - 5 compound or false premise cases previously misclassified as `NOT_ESTABLISHED` were correctly resolved as `REFUTED`.
- **Regressed Cases ($N=4$):**
  - 3 false premises were over-promoted to `SUPPORTED` (inducing false acceptances).
  - 1 supported case shifted to `REFUTED`.
- **Net Performance Gain:** $+38$ net cases (+9.50 pp).

---

## 7. Gate Audit & Advancement Verdict

| Gate | Requirement | Evaluated Metric (`MINILM_BIAS`) | Status |
|---|---|---|---|
| **Gate A** | Supported Claim Recall $\ge 60.00\%$ | **63.33%** (vs Raw 38.67%) | **PASSED** |
| **Gate B** | False Acceptance Rate $\le 6.00\%$ | **2.67%** (vs C0 6.00%) | **PASSED** |
| **Gate C** | Out-of-Domain Recall $\ge 95.00\%$ | **96.00%** (vs Raw 97.00%) | **PASSED** |
| **Gate D** | Overall Accuracy Not Inferior to C0 ($p \ge 0.05$) | **79.50% vs 92.00% ($p = 8.14 \times 10^{-13}$)** | **FAILED** |
| **Gate E** | Hard Strata Recovery (S2 $\ge 85\%$ & S4 $\ge 60\%$) | **S2 = 76.92% (< 85%), S4 = 82.00%** | **FAILED** |
| **Gate F** | Parameter Stability (Rel Std $\le 25\%$) | **Max Rel Std = 19.79%** | **PASSED** |

**Final Advancement Verdict:** **REJECTED**  
**Blind Holdout (`EXP-0033-BLIND-DATASET.json`):** **SEALED (NOT RUN)**  
**Scientific Decision:** **`REPRESENTATION/TASK-MISMATCH`**
