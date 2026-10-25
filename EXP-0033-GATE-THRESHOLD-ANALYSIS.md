# EXP-0033: Evidence-Gate Threshold Sweep & Adaptation Analysis

**Experiment ID:** EXP-0033  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 150$ development cases: 120 in-curriculum, 30 OOD)  
**Evaluator:** Stage 3 Evidence Adequacy Gate (`maxSimilarity < threshold`)  
**Date:** 2026-09-16  

---

## 1. Context & Objective

In the EXP-0031 E4 verifier baseline, Stage 3 enforces a hardcoded curriculum relevance threshold:
```php
if (empty($retrievedChunks) || $maxSimilarity < 0.28) {
    return ['status' => self::STATUS_NOT_ESTABLISHED, ...];
}
```
In EXP-0032, raw cross-encoder relevance logits from `cross-encoder/ms-marco-MiniLM-L-6-v2` were passed through standard sigmoid $\sigma(x)$ into `$maxSimilarity`. Because $\sigma(-0.944) = 0.28$, any query whose top cross-encoder logit was below $-0.944$ was immediately cut off as having "insufficient evidence", causing 36 downstream regressions.

This study sweeps experimental thresholds $\theta \in \{0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45\}$ across the independent development dataset to determine:
1. Whether score calibration alone (under the frozen $\theta = 0.28$ gate) cures the false abstentions.
2. What optimal evidence gate threshold $\theta^*$ best balances in-curriculum acceptance vs. out-of-distribution rejection.

---

## 2. Experimental Threshold Sweep Results (Development Set)

Evaluated over $N = 150$ development cases (120 in-curriculum claims across CSS, JS, React, DB, Node, REST; 30 out-of-curriculum unknown claims).

### 2.1 C4: Platt Scaling ($a = 0.6236, b = 3.2801$)

| Threshold ($\theta$) | In-Curr Pass (%) | OOD Rejection (%) | False Abstentions ($/120$) | F1 Balance | Equivalent Logit Cutoff ($x^*$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0.15** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 | $-8.04$ |
| **0.20** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 | $-7.48$ |
| **0.25** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 | $-7.02$ |
| **0.28 (Frozen)** | **98.33% (118/120)** | **96.67% (29/30)** | **2** | **0.9749** | **$-6.77$** |
| **0.30** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 | $-6.62$ |
| **0.35 (Tuned)** | **98.33% (118/120)** | **96.67% (29/30)** | **2** | **0.9749** | **$-6.25$** |
| **0.40** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 | $-5.91$ |
| **0.45** | 98.33% (118/120) | 100.00% (30/30) | 2 | 0.9916 | $-5.58$ |

*Note on the 2 false abstentions:* `DEV-SUP-026` (rest parameters) and `DEV-FLS-039` (`Object.freeze`) had top logits of $-9.46$ and $-8.90$ due to retrieval candidate misses (the relevant chunks were not retrieved by BGE in the top 5 pool), not calibration error.

---

### 2.2 C2: Standard Sigmoid ($\sigma(x)$) — The Failure Baseline

| Threshold ($\theta$) | In-Curr Pass (%) | OOD Rejection (%) | False Abstentions ($/120$) | F1 Balance | Equivalent Logit Cutoff ($x^*$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0.15** | 95.00% (114/120) | 100.00% (30/30) | 6 | 0.9744 | $-1.73$ |
| **0.20** | 93.33% (112/120) | 100.00% (30/30) | 8 | 0.9655 | $-1.39$ |
| **0.25** | 91.67% (110/120) | 100.00% (30/30) | 10 | 0.9565 | $-1.10$ |
| **0.28 (Frozen)** | **91.67% (110/120)** | **100.00% (30/30)** | **10** | **0.9565** | **$-0.94$** |
| **0.30** | 91.67% (110/120) | 100.00% (30/30) | 10 | 0.9565 | $-0.85$ |
| **0.35** | 90.83% (109/120) | 100.00% (30/30) | 11 | 0.9520 | $-0.62$ |
| **0.40** | 90.83% (109/120) | 100.00% (30/30) | 11 | 0.9520 | $-0.41$ |
| **0.45** | 90.83% (109/120) | 100.00% (30/30) | 11 | 0.9520 | $-0.20$ |

*Analysis:* Under standard sigmoid, even lowering the threshold from 0.28 to 0.15 fails to recover the false abstentions (6 false abstentions remain). This demonstrates that **lowering the threshold without recalibrating the score is insufficient**.

---

### 2.3 C3: Temperature Scaling ($T = 2.6559$)

| Threshold ($\theta$) | In-Curr Pass (%) | OOD Rejection (%) | False Abstentions ($/120$) | F1 Balance |
| :--- | :--- | :--- | :--- | :--- |
| **0.15** | 97.50% (117/120) | 100.00% (30/30) | 3 | 0.9873 |
| **0.20** | 96.67% (116/120) | 100.00% (30/30) | 4 | 0.9831 |
| **0.25** | 95.83% (115/120) | 100.00% (30/30) | 5 | 0.9787 |
| **0.28 (Frozen)** | **95.00% (114/120)** | **100.00% (30/30)** | **6** | **0.9744** |
| **0.30** | 95.00% (114/120) | 100.00% (30/30) | 6 | 0.9744 |
| **0.35** | 94.17% (113/120) | 100.00% (30/30) | 7 | 0.9700 |
| **0.40** | 91.67% (110/120) | 100.00% (30/30) | 10 | 0.9565 |
| **0.45** | 90.83% (109/120) | 100.00% (30/30) | 11 | 0.9520 |

---

### 2.4 C1: Min-Max Normalization

| Threshold ($\theta$) | In-Curr Pass (%) | OOD Rejection (%) | False Abstentions ($/120$) | F1 Balance |
| :--- | :--- | :--- | :--- | :--- |
| **0.15** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 |
| **0.20** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 |
| **0.25** | 98.33% (118/120) | 96.67% (29/30) | 2 | 0.9749 |
| **0.28 (Frozen)** | **98.33% (118/120)** | **96.67% (29/30)** | **2** | **0.9749** |
| **0.30** | 98.33% (118/120) | 100.00% (30/30) | 2 | 0.9916 |
| **0.35** | 97.50% (117/120) | 100.00% (30/30) | 3 | 0.9873 |
| **0.40** | 96.67% (116/120) | 100.00% (30/30) | 4 | 0.9831 |
| **0.45** | 95.83% (115/120) | 100.00% (30/30) | 5 | 0.9787 |

---

## 3. Threshold Comparison & Decision Rationale

### Key Insights:
1. **Under Platt Scaling (C4):** The in-curriculum pass rate is remarkably stable at **98.33%** across thresholds from 0.15 all the way up to 0.45, with only 2 false abstentions (which are caused by upstream retrieval misses).
2. **Logit Boundary Separation:**
   - At $\theta = 0.28$ (Frozen E4 default), the logit cutoff is $x^* = -6.77$.
   - At $\theta = 0.35$ (Tuned gate), the logit cutoff is $x^* = -6.25$.
   - Both cutoffs lie cleanly in the separation margin between in-curriculum relevant evidence (median logit $+2.14$, 10th percentile $-3.20$) and out-of-distribution queries (median logit $-9.25$, 75th percentile $-7.24$).
3. **Safety Margin:**
   - Setting $\theta = 0.35$ provides an additional $0.52$ logit safety margin against marginal distractors while incurring **zero additional false abstentions** on the development set.

---

## 4. Frozen Protocol Decisions for Blind Evaluation

In accordance with Parts 5 & 6:
- **Modes E1 through E5:** Retain the frozen verifier baseline evidence gate threshold $\mathbf{\theta = 0.28}$. This directly measures the isolated impact of score calibration against the frozen baseline.
- **Mode E6:** Evaluates the combined strategy: **Platt Calibrated Scores (C4)** paired with the tuned evidence adequacy threshold $\mathbf{\theta = 0.35}$.

Both parameters ($\text{C4}: a=0.6236, b=3.2801$ and $\text{E6 Gate}: \theta=0.35$) are hereby **FROZEN** prior to blind dataset generation and evaluation.
