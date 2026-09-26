# EXP-0070 Development Analysis: Domain-Specific NLI Fine-Tuning

**Experiment ID:** EXP-0070  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, 5-Fold Stratified Cross-Validation)  
**Control Baseline:** Frozen A4 + `llama3.2:latest` (C0, 92.00%)  
**Fine-Tuned Candidate:** `C1_FT_MINILM` (`cross-encoder/nli-MiniLM2-L6-H768`)  
**Lineage:** EXP-0068 -> EXP-0069 -> EXP-0070  
**Date:** 2026-09-26  

---

## 1. Executive Summary

EXP-0070 evaluated whether task-specific supervised fine-tuning of dedicated NLI cross-encoders on clean educational claim–evidence relationships could overcome the severe neutral-class bias and representation ceiling established in EXP-0068 and EXP-0069.

Under a strict 5-fold stratified cross-validation protocol ($N=400$, evaluated strictly out-of-fold through the frozen A4 verification pipeline):
1. **Performance Gains Over Raw & Calibrated Cross-Encoders:**
   * Raw MiniLM (EXP-0068): 70.00% Accuracy, 38.67% Supported Recall.
   * Calibrated MiniLM (EXP-0069): 79.50% Accuracy, 63.33% Supported Recall.
   * **Fine-Tuned MiniLM (EXP-0070): 82.75% Accuracy, 65.33% Supported Recall.**
   * Net gain: **+12.75 pp** over raw cross-encoder, **+3.25 pp** over post-hoc calibration.
2. **Presupposition Safety Envelope:**
   * False Acceptance Rate (FAR) dropped to **1.33%** (only 2 false premises accepted out of 150), vastly outperforming the generative baseline (C0 FAR = 6.00%, 9 false acceptances).
3. **The Persistent Generalization Gap vs C0 Control:**
   * Despite fine-tuning, the candidate remained **-9.25 pp inferior to C0** (82.75% vs 92.00%, McNemar $n_{01}=4, n_{10}=41, p = 9.33 \times 10^{-9}$).
   * Supported claim recall reached only 65.33% (vs C0 87.33%, -22.00 pp deficit).
   * Consequently, **Advancement Gate A and Gate B failed**, and blind evaluation was strictly NOT RUN.

---

## 2. Master Metric Comparison ($N=400$)

| Metric | C0 Control (`llama3.2`) | Raw MiniLM (EXP-0068) | Calibrated MiniLM (EXP-0069) | Fine-Tuned MiniLM (EXP-0070) | Delta vs Raw | Delta vs C0 |
|---|---|---|---|---|---|---|
| **Overall Accuracy** | **92.00%** (368/400) | 70.00% (280/400) | 79.50% (318/400) | **82.75%** (331/400) | **+12.75 pp** | -9.25 pp |
| **Macro F1** | **92.67%** | 68.60% | 80.08% | **82.34%** | **+13.74 pp** | -10.33 pp |
| **Supported Recall** | **87.33%** (131/150) | 38.67% (58/150) | 63.33% (95/150) | **65.33%** (98/150) | **+26.66 pp** | -22.00 pp |
| **Refutation Recall** | **92.67%** (139/150) | 83.33% (125/150) | 86.67% (130/150) | **89.33%** (134/150) | **+6.00 pp** | -3.34 pp |
| **OOD Recall** | 98.00% (98/100) | 97.00% (97/100) | 96.00% (96/100) | **99.00%** (99/100) | +2.00 pp | +1.00 pp |
| **False Acceptance Rate (FAR)** | 6.00% (9/150) | **0.67%** (1/150) | 2.67% (4/150) | **1.33%** (2/150) | +0.66 pp | **-4.67 pp (Superior)** |
| **False Rejection Rate (FRR)** | 12.67% (19/150) | 11.33% (17/150) | 10.67% (16/150) | **12.00%** (18/150) | +0.67 pp | -0.67 pp |
| **False Abstentions** | 0 | 75 | 39 | **34** | -41 cases | +34 cases |
| **Average Latency** | 450.0 ms | 20.0 ms | 20.0 ms | **42.4 ms** | +22.4 ms | **-407.6 ms (10.6x faster)** |

---

## 3. Confusion Matrix Breakdown

### Fine-Tuned MiniLM (`C1_FT_MINILM`, $N=400$)

```
                  Predicted SUPPORTED   Predicted REFUTED   Predicted NOT_ESTABLISHED   Total
True SUPPORTED             98                  18                      34                150
True REFUTED                2                 134                      14                150
True NOT_ESTABLISHED        0                   1                      99                100
Total Predicted           100                 153                     147                400
```

* **Entailment Recovery:** Fine-tuning successfully converted 40 false abstentions from raw cross-encoders into verified supported claims.
* **Safety Dominance:** Only 2 false premises were misclassified as supported (`DEV-NOVEL-033`, `DEV-NOVEL-071`), maintaining an exceptional precision of **98.00%** on positive assertions.

---

## 4. Hard-Stratum Analysis (S1–S7)

| Stratum | Description | $N$ | C0 Control | Raw MiniLM | Calibrated MiniLM | Fine-Tuned MiniLM | Delta vs Raw | Delta vs C0 |
|---|---|---|---|---|---|---|---|---|
| **S1** | Antonym-Assisted Refutations | 166 | **93.37%** | 69.88% | 83.13% | **83.73%** | +13.85 pp | -9.64 pp |
| **S2** | Non-Antonym Structural Refutations | 234 | **91.03%** | 70.09% | 76.92% | **82.05%** | **+11.96 pp** | -8.98 pp |
| **S3** | High-Overlap Supported Curriculum | 100 | **85.00%** | 35.00% | 73.00% | **61.00%** | **+26.00 pp** | -24.00 pp |
| **S4** | Low-Overlap Paraphrases | 50 | **92.00%** | 46.00% | 82.00% | **74.00%** | **+28.00 pp** | -18.00 pp |
| **S5** | Normative & Universal Assertions | 81 | **91.36%** | 74.07% | 85.19% | **80.25%** | +6.18 pp | -11.11 pp |
| **S6** | Compound Multi-Clause Queries | 75 | **90.67%** | 56.00% | 76.00% | **86.67%** | **+30.67 pp** | -4.00 pp |
| **S7** | Out-of-Domain Inquiries | 100 | 98.00% | 97.00% | 96.00% | **99.00%** | +2.00 pp | +1.00 pp |

### Key Strata Insights:
1. **Compound Generalization (S6):** Even though all compound queries were strictly excluded from direct training, fine-tuned MiniLM generalized exceptionally well to compound cases, jumping from 56.00% (raw) to **86.67%** (only -4.00 pp behind C0).
2. **Non-Antonym Contradiction Detection (S2):** S2 accuracy reached **82.05%** (+11.96 pp over raw 70.09%), passing Gate D and proving that fine-tuning learned genuine contextual contradiction beyond simple dictionary antonym matching.
3. **The Paraphrase Ceiling (S3 & S4):** The model continues to suffer from false abstentions on valid curriculum assertions (S3: 61.00%, S4: 74.00%), failing Gate E's 80.00% threshold for S4.

---

## 5. Statistical Significance (McNemar Paired Test)

*Evaluated against C0 on identical $N=400$ development cases with continuity correction:*

* $n_{01}$ (Correct in Fine-Tuned C1, Incorrect in C0): **4**
* $n_{10}$ (Correct in C0, Incorrect in Fine-Tuned C1): **41**
* Discordant Total: $45$
* Concordant Correct ($n_{11}$): $327$
* Concordant Incorrect ($n_{00}$): $28$
* $\chi^2 = \frac{(|4 - 41| - 1)^2}{45} = \frac{36^2}{45} = \mathbf{28.80}$
* **Exact Two-Sided $p$-value: $9.33 \times 10^{-9}$**
* **Paired Delta:** $-9.25\text{ pp}$ [95% CI: $-12.41\text{ pp}, -6.09\text{ pp}$]

**Conclusion:** The candidate is **statistically significantly inferior to the frozen C0 generative control** ($p < 10^{-8}$).

---

## 6. Pre-Registered Gate Evaluation Summary

| Gate | Description | Threshold | Actual Result | Gate Status |
|---|---|---|---|---|
| **Gate A** | Overall Accuracy vs C0 | $\text{Acc} \ge 90.00\%$ & $p \ge 0.05$ | **82.75% ($p = 9.33 \times 10^{-9}$)** | **FAILED** |
| **Gate B** | Supported Claim Preservation | $\text{Recall}_{\text{sup}} \ge 84.33\%$ | **65.33%** | **FAILED** |
| **Gate C** | False Acceptance Suppression | $\le 4$ cases & $\text{FAR} \le 3.00\%$ | **2 cases ($\text{FAR} = 1.33\%$)** | **PASSED** |
| **Gate D** | Hard Stratum S2 Improvement | S2 Accuracy $> 70.09\%$ | **82.05%** | **PASSED** |
| **Gate E** | Paraphrase Survival S4 | S4 $> 46.00\%$ & $\ge 80.00\%$ | **74.00%** | **FAILED** |
| **Gate F** | OOD Safety Recall | $\text{Recall}_{\text{ood}} \ge 95.00\%$ | **99.00%** | **PASSED** |
| **Gate H** | No Shortcut-Only Improvement | S2 or S4 gain $> \text{raw}$ | **S2: +11.96 pp, S4: +28.00 pp** | **PASSED** |

**Advancement Verdict:** **REJECTED**. Gates A, B, and E failed. In strict accordance with the pre-registered protocol, blind validation was **NOT RUN**.
