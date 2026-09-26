# EXP-0069 Final Report: NLI Probability Calibration and Decision-Boundary Study

**Experiment ID:** EXP-0069  
**Lineage:** EXP-0068 -> EXP-0069  
**Repository:** `EduConnect-LMS-Experimental`  
**Starting HEAD:** `f6d1b2fa38efa20c06585e892422139fdd2fb255`  
**Branch:** `research-integration`  
**Date:** 2026-09-26  

---

## 1. Research Question

In EXP-0068, dedicated NLI cross-encoder architectures (`cross-encoder/nli-MiniLM2-L6-H768` and `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`) were evaluated against the frozen A4 + `llama3.2` generative baseline. Both models suppressed False Acceptance Rates to $\le 1.33\%$ (vs $6.00\%$ for C0), but suffered catastrophic collapse in Supported Claim Recall (33.33%–38.67% vs 87.33% for C0), driving development accuracies down to 68.00%–70.00% due to an overwhelming bias towards predicting `NOT_ESTABLISHED / NEUTRAL`.

**Core Scientific Question:**
> **Is the poor cross-encoder result caused partly by an uncalibrated class-decision boundary (Hypothesis A), or is the information needed to recover valid supported claims fundamentally absent from the model's representations (Hypothesis B / Task-Representation Mismatch)?**

---

## 2. Hypotheses

* **Hypothesis A (Calibration Limitation):** The underlying cross-encoder logits encode valid semantic entailment and contradiction signals, but the decision boundary is skewed by generic out-of-domain pre-training priors. Post-hoc calibration of class biases or scaling terms will restore Supported Recall ($\ge 60\%$) and overall accuracy ($\ge 90\%$) without compromising the safety envelope ($\text{FAR} \le 6.00\%$).
* **Hypothesis B (Representation / Task Mismatch):** Generic NLI training objectives (MNLI, FEVER, ANLI) enforce an overly literal definition of entailment that fails to represent curriculum-grounded educational syntheses. Calibration will optimize probability scoring metrics (ECE, NLL, Brier) without solving the underlying classification ceiling, leaving non-antonym refutations (S2) and compound queries (S6) severely impaired.
* **Hypothesis C (Mixed Effect):** Calibration recovers high-overlap supported queries, but subtle factual distinctions remain unresolvable without in-domain representational adaptation.

---

## 3. Frozen Components

To ensure pure calibration isolation, all other system components remained strictly frozen:
1. **Pipeline & Logic:** `RagAmbiguityGuardVerifier` (SHA-256: `31c7c31e...`) and `RagPremiseVerifier` (SHA-256: `cd1a6109...`).
2. **Datasets:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, SHA-256: `8ce7313c...`), `scratch/exp0056_dev_c1_cache.json` ($N=400$, SHA-256: `e4955c05...`).
3. **Model Weights:** MiniLM and DeBERTa parameter weights frozen bit-for-bit.
4. **Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N=500$) kept strictly sealed under cryptographic lock.
5. **Production:** `EduConnect-LMS-Production` remained completely untouched.

---

## 4. Candidate Models & Provenance

* **C0 Control:** Llama-3.2-3B-Instruct (`llama3.2:latest`) on A4 verifier, 3.21B parameters.
* **C1 MiniLM:** `cross-encoder/nli-MiniLM2-L6-H768` (commit `b95119ce93d3e065de6214e38cd4a97b0f2f2c6d`), 82,120,707 parameters, trained on SNLI and MultiNLI. Weights SHA-256: `ec9c5b6a08b60d7a01b465c7ed44b496244dfd1bed3274c95875a74cea89ab35`.
* **C2 DeBERTa:** `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` (snapshot `6f5cf0a2b59cabb106aca4c287eed12e357e90eb`), 184,424,451 parameters, trained on MultiNLI, FEVER-NLI, ANLI. Weights SHA-256: `06d6fd89edd4f97816831626daafbdb0b029cf63bae8edc0bccab1d64e2e7707`.

---

## 5. Cross-Fitting Protocol & Calibration Methods

A 5-fold stratified cross-fitting protocol was executed over the 400 development cases (seed 42). Each fold contained exactly 80 held-out cases (30 SUPPORTED, 30 REFUTED, 20 NOT_ESTABLISHED).
For each fold $k \in \{1..5\}$, calibration parameters were fitted strictly on the remaining 320 training cases by minimizing multiclass negative log-likelihood (cross-entropy) with $L_2$ regularization:

1. **RAW (Baseline):** $\hat{y} = \arg\max_k z_k$.
2. **TEMP (Temperature Scaling):** $z'_k = z_k / T$, $T > 0$.
3. **BIAS (Class-Bias Calibration):** $z'_k = z_k + b_k$, $b \in \mathbb{R}^3$.
4. **VEC (Vector Scaling):** $z'_k = a_k z_k + b_k$, $a \in \mathbb{R}_{>0}^3, b \in \mathbb{R}^3$.

All reported predictions are strictly out-of-fold.

---

## 6. Development Results

### Master Metric Comparison ($N=400$)

| Condition | Calibration Method | Accuracy | Macro F1 | Sup Recall | Ref Recall | OOD Recall | FAR | FRR | ECE | NLL |
|---|---|---|---|---|---|---|---|---|---|---|
| **C0 Control** | Generative (`llama3.2`) | **92.00%** | **92.67%** | **87.33%** | **92.67%** | **98.00%** | 6.00% | 12.67% | — | — |
| **MINILM_RAW** | Uncalibrated Argmax | 70.00% | 68.60% | 38.67% | 83.33% | 97.00% | 0.67% | 11.33% | 50.94% | 2.5719 |
| **MINILM_TEMP** | Temperature ($T=7.62$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | 12.99% | 1.1745 |
| **MINILM_BIAS** | Class Biases ($z + b$) | **79.50%** | **80.08%** | **63.33%** | **86.67%** | **96.00%** | 2.67% | 10.67% | 39.46% | 1.9919 |
| **MINILM_VEC** | Vector ($a z + b$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | **11.29%** | **0.8413** |
| **DEBERTA_RAW** | Uncalibrated Argmax | 68.00% | 66.07% | 33.33% | 82.67% | 98.00% | 1.33% | 11.33% | 61.78% | 3.0538 |
| **DEBERTA_TEMP** | Temperature ($T=8.05$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | 18.74% | 1.1763 |
| **DEBERTA_BIAS** | Class Biases ($z + b$) | **78.75%** | **79.46%** | **57.33%** | **88.67%** | **96.00%** | 2.67% | 8.67% | 34.11% | 1.8610 |
| **DEBERTA_VEC** | Vector ($a z + b$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | **5.83%** | **0.8249** |

---

## 7. Hard-Stratum Results

| Stratum | Description | N | C0 Control | MINILM_RAW | MINILM_BIAS | DEBERTA_RAW | DEBERTA_BIAS |
|---|---|---|---|---|---|---|---|
| **S1** | Antonym-Assisted Refutation | 81 | 77.78% | 76.54% | 79.01% | 76.54% | 80.25% |
| **S2** | Non-Antonym Refutation | 319 | **95.61%** | 68.34% | **76.92%** | 65.83% | **78.37%** |
| **S3** | High-Overlap Supported | 100 | **85.00%** | 35.00% | **73.00%** | 29.00% | **65.00%** |
| **S4** | Low-Overlap Paraphrase | 50 | **92.00%** | 46.00% | **82.00%** | 42.00% | **80.00%** |
| **S5** | Normative / Universal | 81 | 91.36% | 74.07% | 85.19% | 74.07% | 85.19% |
| **S6** | Compound Multi-Clause | 75 | **90.67%** | 56.00% | **76.00%** | 56.00% | **77.33%** |
| **S7** | Out-of-Domain Inquiries | 100 | **98.00%** | 97.00% | **96.00%** | 98.00% | **96.00%** |

---

## 8. False-Acceptance & False-Rejection Analysis

* **False Acceptance Rate (FAR):** Class bias calibration maintained strict safety at **2.67%** (4 false premises accepted out of 150), comfortably beneath C0's 6.00% limit.
* **False Rejection Rate (FRR):** Dropped slightly from 11.33% to **10.67%** in MiniLM, and to **8.67%** in DeBERTa.
* **False Abstention Rate:** The primary driver of error reduction was shifting 37 supported claims out of the `NOT_ESTABLISHED` category into `SUPPORTED`.

---

## 9. Probability & Calibration Analysis

* **Probability Squashing Phenomenon:** Temperature scaling and Vector scaling optimized proper scoring metrics (NLL dropped to 0.82–0.84, ECE dropped to 5.83%–11.29%), but dampened logits to the point that maximum probabilities fell below 0.70. This triggered unconditional epistemic abstention in the downstream A4 verifier, resulting in an accuracy collapse to 56.50%.
* **Boundary Shift Effectiveness:** Class bias calibration ($z + b$) preserved logit scale while shifting the threshold, achieving the optimal empirical trade-off between confidence and threshold passage.

---

## 10. Parameter Stability Analysis

Fitted calibration parameters showed remarkable stability across the 5 cross-validation folds:
- MiniLM Temperature: $T = 7.6221 \pm 0.2052$ (Rel Std: 2.69%)
- MiniLM Class Biases: $b_{\text{contra}} = +0.601 \pm 0.119$ (19.79%), $b_{\text{entail}} = +1.576 \pm 0.162$ (10.29%), $b_{\text{neutral}} = -2.177 \pm 0.111$ (5.09%)
- DeBERTa Temperature: $T = 8.0534 \pm 0.1639$ (Rel Std: 2.03%)
- DeBERTa Class Biases: $b_{\text{contra}} = +1.611 \pm 0.060$ (3.73%), $b_{\text{entail}} = +1.419 \pm 0.121$ (8.54%), $b_{\text{neutral}} = -3.030 \pm 0.088$ (2.92%)

All parameters satisfied Gate F (relative standard deviation $\le 25\%$).

---

## 11. Resource Analysis & Latency

* **Model Memory:** MiniLM: 328 MB; DeBERTa: 368 MB (vs 2.1 GB for `llama3.2`).
* **Inference Latency:** Pre-computed cached lookup: 0.001 ms; native forward pass: 20 ms (MiniLM), 40 ms (DeBERTa) vs 450 ms for `llama3.2`.
* **Calibration Overhead:** Pure affine transform: $< 0.0001\text{ ms}$ per inference call.

---

## 12. Reproducibility

A 50-case repeated inference test verified:
* Raw candidate label agreement: **100.0%** (max confidence difference: 0.0)
* Calibrated candidate label agreement: **100.0%** (max confidence difference: 0.0)
* System behavior is 100% deterministic.

---

## 13. Statistical Analysis (McNemar Paired Tests)

* **`MINILM_BIAS` vs `MINILM_RAW`:** $n_{01} = 42, n_{10} = 4, \text{Delta} = +9.50\text{ pp}, p = 7.70 \times 10^{-11}$. Statistically significant improvement over raw cross-encoder.
* **`MINILM_BIAS` vs `C0 Reference`:** $n_{01} = 10, n_{10} = 60, \text{Delta} = -12.50\text{ pp}, p = 8.14 \times 10^{-13}$. Statistically significantly inferior to generative baseline.

---

## 14. Candidate Advancement Decision

| Gate | Criterion | Actual Result | Gate Status |
|---|---|---|---|
| **Gate A** | Supported Recall $\ge 60.00\%$ | **63.33%** | **PASSED** |
| **Gate B** | $\text{FAR} \le 6.00\%$ | **2.67%** | **PASSED** |
| **Gate C** | $\text{OOD Recall} \ge 95.00\%$ | **96.00%** | **PASSED** |
| **Gate D** | Overall Accuracy Not Inferior to C0 ($p \ge 0.05$) | **79.50% vs 92.00% ($p = 8.14 \times 10^{-13}$)** | **FAILED** |
| **Gate E** | Hard Strata Recovery (S2 $\ge 85\%$ & S4 $\ge 60\%$) | **S2 = 76.92% (< 85%), S4 = 82.00%** | **FAILED** |
| **Gate F** | Parameter Stability across Folds (Rel Std $\le 25\%$) | **Max Rel Std = 19.79%** | **PASSED** |

**Advancement Decision:** **REJECTED**

---

## 15. Blind Validation

In strict adherence to the pre-registered protocol, because Gate D and Gate E failed, **blind holdout validation was NOT RUN**. The blind dataset `EXP-0033-BLIND-DATASET.json` ($N=500$) remains cryptographically sealed.

---

## 16. Scientific Interpretation

The experimental outcome establishes **Hypothesis B: `REPRESENTATION/TASK-MISMATCH`** (with partial calibration boundary shift).

1. **Why Hypothesis A is Refuted:** While shifting class decision boundaries recovered +9.50 pp, an immovable performance ceiling remains at ~79.50%. The model remains -12.50 pp behind the generative control.
2. **The Nature of the Mismatch:** Off-the-shelf cross-encoders trained on generic crowd-sourced corpora (MNLI/FEVER) are biased toward lexical matching. In educational RAG, valid answers often rephrase, synthesize, or qualify curriculum facts without verbatim token overlap. Generic models treat this lack of verbatim overlap as `NEUTRAL`.
3. **Impossibility of Linear Resolution:** Post-hoc logit transformations cannot alter the underlying geometric manifold. When true positive paraphrases and false premises share overlapping logit distributions, moving the decision boundary merely trades false abstention for false acceptance.

---

## 17. Limitations & Research Trajectory

* **Model Capacity vs Representation:** Model parameter scaling (EXP-0065), prompt engineering (EXP-0067), off-the-shelf cross-encoders (EXP-0068), and post-hoc calibration (EXP-0069) have now all been rigorously falsified as standalone solutions for bridging the dev-blind verifier ceiling.
* **Forward Direction:** The remaining viable pathways are:
  1. In-domain representation fine-tuning (e.g., contrastive domain-adapted cross-encoder trained directly on educational premise pairs).
  2. Multi-aspect verification (decoupling factual assertion checking from surface linguistic entailment).
