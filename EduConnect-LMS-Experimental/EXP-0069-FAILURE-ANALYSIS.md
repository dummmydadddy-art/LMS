# EXP-0069 Failure Analysis: Limits of Post-Hoc NLI Probability Calibration

**Experiment ID:** EXP-0069  
**Lineage:** EXP-0068 -> EXP-0069  
**Focus:** Diagnostic Investigation of Residual Errors and Calibration Limitations in NLI Cross-Encoders  
**Evaluation Target:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$)

---

## 1. Executive Summary

EXP-0069 evaluated whether the severe performance degradation of dedicated NLI cross-encoders observed in EXP-0068 (MiniLM: 70.00%, DeBERTa: 68.00% vs C0: 92.00%) could be rectified via post-hoc probability and decision-boundary calibration (5-fold stratified cross-fitting).

While Class-Bias Calibration (C3) yielded a statistically significant improvement for MiniLM (+9.50 pp, reaching 79.50%, $p = 7.7 \times 10^{-11}$) and DeBERTa (+10.75 pp, reaching 78.75%), **both candidates remained severely inferior to the frozen C0 control ($92.00\%$, paired McNemar $p = 8.14 \times 10^{-13}$)**. Furthermore, Temperature Scaling (C2) and Vector Scaling (C4) triggered catastrophic verification collapse (56.50%), as probability softening caused predictions to fail the 0.70 epistemic confidence gate.

These empirical results decisively refute **Hypothesis A (Pure Calibration Limitation)** and establish **Hypothesis B (Representation / Task Mismatch)** as the primary root cause.

---

## 2. Quantitative Performance Summary Across All Conditions

| Condition | Calibration Method | Accuracy | Macro F1 | Supported Recall | Refutation Recall | OOD Recall | FAR | FRR | ECE | NLL | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **C0 Control** | Frozen A4 + `llama3.2` | **92.00%** | **92.67%** | **87.33%** | **92.67%** | **98.00%** | 6.00% | 12.67% | — | — | **Reference** |
| **MINILM_RAW** | Uncalibrated Argmax | 70.00% | 68.60% | 38.67% | 83.33% | 97.00% | 0.67% | 11.33% | 50.94% | 2.5719 | Baseline |
| **MINILM_TEMP** | Temperature ($T=7.62$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | 12.99% | 1.1745 | Collapsed |
| **MINILM_BIAS** | Class Biases ($z + b$) | **79.50%** | **80.08%** | **63.33%** | **86.67%** | **96.00%** | 2.67% | 10.67% | 39.46% | 1.9919 | **Best Calibrated** |
| **MINILM_VEC** | Vector ($a \odot z + b$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | **11.29%** | **0.8413** | Collapsed |
| **DEBERTA_RAW** | Uncalibrated Argmax | 68.00% | 66.07% | 33.33% | 82.67% | 98.00% | 1.33% | 11.33% | 61.78% | 3.0538 | Baseline |
| **DEBERTA_TEMP** | Temperature ($T=8.05$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | 18.74% | 1.1763 | Collapsed |
| **DEBERTA_BIAS** | Class Biases ($z + b$) | 78.75% | 79.46% | 57.33% | 88.67% | 96.00% | 2.67% | 8.67% | 34.11% | 1.8610 | Improved |
| **DEBERTA_VEC** | Vector ($a \odot z + b$) | 56.50% | 50.51% | 10.67% | 69.33% | 98.00% | **0.00%** | 10.67% | **5.83%** | **0.8249** | Collapsed |

---

## 3. The Calibration–Classification Paradox

A critical scientific discovery of EXP-0069 is the sharp dissociation between probability calibration quality and downstream task accuracy:

1. **Probability Metrics Show Massive Optimization:**
   - Under Vector Scaling (C4), ECE plummeted from 50.94% to **11.29%** in MiniLM, and from 61.78% to **5.83%** in DeBERTa.
   - NLL dropped by more than 67% (from 2.57 to 0.84 for MiniLM; from 3.05 to 0.82 for DeBERTa).
   - Brier score dropped by more than 53% (from 1.13 to 0.53).
2. **Yet Classification Performance Suffers Total Degradation:**
   - Despite near-perfect calibration curves, accuracy collapsed to **56.50%**.
   - Supported Recall dropped to **10.67%** (only 16 out of 150 supported claims verified).
3. **Causal Mechanism of the Collapse:**
   - Cross-entropy optimization penalized the models' severe raw overconfidence by drastically dampening logit magnitudes ($T \approx 7.6$–$8.1$, scale vector $a \approx [0.05, 0.01, 0.38]$).
   - This compressed calibrated softmax probabilities into the $[0.35, 0.65]$ range.
   - However, the downstream A4 verifier enforces a non-negotiable epistemic safety gate: confidence $\ge 0.70$ is required for asserting entailment or contradiction.
   - Consequently, probability-calibrated predictions were uniformly rejected by the safety gate and converted into `NOT_ESTABLISHED` (epistemic abstention).

---

## 4. Residual Error Taxonomy for Best Calibrated Model (`MINILM_BIAS`)

In the best candidate (`MINILM_BIAS`, 79.50%), 82 cases failed verification out of 400. The breakdown of these 82 residual errors reveals the precise boundaries of what calibration could and could not fix:

```
Total Development Cases: 400
├── Correct Decisions: 318 (79.50%)
└── Errors: 82 (20.50%)
    ├── Persistent False Abstentions (SUPPORTED → NOT_ESTABLISHED): 55 cases (67.1% of errors)
    ├── False Rejections (SUPPORTED → REFUTED): 16 cases (19.5% of errors)
    ├── False Premise Abstentions (REFUTED → NOT_ESTABLISHED): 7 cases (8.5% of errors)
    └── False Acceptances (REFUTED → SUPPORTED): 4 cases (4.9% of errors)
```

### A. Persistent False Abstentions ($N=55$)
* **Mechanism:** The student claim states a valid pedagogical truth (e.g., `"grid-template-columns define columns in Grid layout"`), but the cross-encoder logit for `NEUTRAL` exceeds the logit for `ENTAILMENT` by more than the $+1.58$ bias shift.
* **Why Calibration Failed:** The underlying representations encode sentence-level topical relatedness rather than strict truth-conditional subsumption. Because the passage provides detailed contextual elaboration beyond the student's concise claim, the model treats the student claim as an unmentioned or under-specified fact (`NEUTRAL`).

### B. False Rejections ($N=16$)
* **Mechanism:** Legitimate curriculum facts misclassified as `REFUTED`.
* **Example:** In complex syntactic constructions or negative claims (`"undefined is not an object"`), the model misinterprets grammatical negation markers as contradiction against affirmative evidence. Shifting the class bias could not resolve these without simultaneously worsening False Acceptance.

### C. False Acceptances ($N=4$)
* **Mechanism:** Subtle false premises accepted as supported.
* **Impact on Safety:** While FAR remained low at 2.67% (passing Gate B $\le 6.00\%$), shifting the entailment bias upwards unavoidably pulled 4 false premise claims into false acceptance (compared to only 1 in raw MiniLM).

---

## 5. Hard Strata Analysis

| Stratum | Description | N | C0 Control | MINILM_RAW | MINILM_BIAS | Delta vs Raw | Status vs Gate E |
|---|---|---|---|---|---|---|---|
| **S1** | Antonym-Assisted Refutation | 81 | 77.78% | 76.54% | 79.01% | +2.47 pp | Resolved by Tier-1 |
| **S2** | Non-Antonym Refutation | 319 | **95.61%** | 68.34% | **76.92%** | +8.58 pp | **FAILED Gate E (< 85%)** |
| **S3** | High-Overlap Supported | 100 | **85.00%** | 35.00% | **73.00%** | +38.00 pp | Large recovery |
| **S4** | Low-Overlap Paraphrase | 50 | **92.00%** | 46.00% | **82.00%** | +36.00 pp | Substantial recovery |
| **S5** | Normative / Universal | 81 | 91.36% | 74.07% | 85.19% | +11.12 pp | Improved |
| **S6** | Compound Multi-Clause | 75 | **90.67%** | 56.00% | **76.00%** | +20.00 pp | Deficient (-14.67 pp vs C0) |
| **S7** | Out-of-Domain Inquiries | 100 | **98.00%** | 97.00% | **96.00%** | -1.00 pp | Preserved safety |

### Analysis of Stratum Deficits
1. **S2 Deficit (-18.69 pp vs C0):**
   In subtle false premises lacking explicit antonym pairs, off-the-shelf cross-encoders fail to discern conflicting property values (e.g., claiming a function returns a Promise when it returns an Array). The model defaults to `NEUTRAL` because both concepts belong to the same topic.
2. **S6 Deficit (-14.67 pp vs C0):**
   Compound sentences requiring multi-predicate conjunction are poorly evaluated when individual atomic checks return weak neutral signals.

---

## 6. Root-Cause Synthesis: Why Generic NLI Models Fail Educational RAG

The empirical evidence from EXP-0068 and EXP-0069 isolates three fundamental representational limitations of off-the-shelf cross-encoders:

1. **The MNLI/FEVER Prior Mismatch:**
   Models trained on MNLI/SNLI/FEVER are heavily tuned to identify direct lexical contradictions or trivial semantic restatements. In contrast, educational RAG verification requires evaluating whether a student's conceptual synthesis is validly grounded in curriculum source text. Generic models systematically confuse explanatory depth in the premise with ungroundedness in the hypothesis.
2. **Strictness vs. Neutrality Dilemma:**
   Because generic NLI models treat any missing detail in the hypothesis as `NEUTRAL`, they penalize concise student summaries as "unestablished".
3. **Rigid Logit Topology:**
   Post-hoc linear calibration can shift the hyperplane ($z + b$), but cannot alter the relative geometric distance between data points in logit space. If two dissimilar semantic concepts have indistinguishable raw logits, no affine transformation can separate them.

---

## 7. Advancement Decision & Next Steps

* **All Advancement Gates Audited:**
  - Gate A (Supported Recall $\ge 60\%$): **PASS** (63.33%)
  - Gate B (FAR $\le 6\%$): **PASS** (2.67%)
  - Gate C (OOD Recall $\ge 95\%$): **PASS** (96.00%)
  - Gate D (Overall Accuracy vs C0, $p \ge 0.05$): **FAIL** ($79.50\%$ vs $92.00\%$, $p = 8.14 \times 10^{-13}$)
  - Gate E (Hard Strata: S2 $\ge 85\%$ & S4 $\ge 60\%$): **FAIL** (S2 = 76.92% < 85%)
  - Gate F (Parameter Stability across Folds): **PASS** (max relative std = 19.79% $\le 25\%$)
* **Verdict:** **REJECT**.
* **Blind Holdout:** **SEALED**.
* **Directive:** Do not proceed to blind evaluation. In-domain representation learning or multi-aspect verification architectures are required to resolve the structural representation gap.
