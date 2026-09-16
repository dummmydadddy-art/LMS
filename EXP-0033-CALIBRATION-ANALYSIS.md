# EXP-0033: Cross-Encoder Calibration Analysis

**Experiment ID:** EXP-0033  
**Dataset:** `EXP-0033-CALIBRATION-DATASET.json` ($N = 432$ query-chunk pairs: 132 relevant, 300 non-relevant)  
**Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2`  
**Date:** 2026-09-16  

---

## 1. Executive Summary

In EXP-0032, raw cross-encoder relevance logits from `cross-encoder/ms-marco-MiniLM-L-6-v2` were passed through standard sigmoid $\sigma(x)$ directly into the frozen EXP-0031 E4 verifier's evidence gate (`maxSim < 0.28`). This caused severe false abstentions because borderline-relevant pairs with logits $x \in [-3.5, -1.0]$ produced probabilities $\sigma(x) \in [0.03, 0.27]$, falling below the gate threshold $0.28$.

To resolve this issue without manual heuristic patching, we fitted four parametric and non-parametric calibration methods on a completely independent calibration dataset of 432 pairs derived from the EXP-0025 development corpus.

### Key Finding
**Platt Scaling (C4)** emerges as the clear champion calibration method:
- **Brier Score:** Reduced from 0.0466 (Standard Sigmoid) to **0.0283** (39.3% reduction).
- **Log Loss:** Reduced from 0.3221 (Standard Sigmoid) to **0.1180** (63.4% reduction).
- **Expected Calibration Error (ECE):** Reduced from 0.0554 to **0.0107** (80.7% reduction, near-perfect alignment).
- **Discriminative Power:** Preserved perfectly at **ROC-AUC = 0.9822** and **PR-AUC = 0.9765** (monotonic transformation).

---

## 2. Calibration Dataset Distribution

The calibration set was constructed from 150 development cases across CSS, JavaScript, React, Node.js/Express, Database/SQL, and REST APIs:
- Total candidate pairs evaluated: $N = 432$
- Positive (Ground-Truth Relevant) pairs: $N_+ = 132$ (30.56%)
- Negative (Distractor / Non-relevant) pairs: $N_- = 300$ (69.44%)
- Raw logit range: $[-11.4976, +8.5013]$
- Mean logit: $-6.7605 \pm 6.8180$

---

## 3. Calibration Methods & Mathematical Formulations

### C1: Empirical Min-Max Scaling
Maps logits linearly across observed calibration extrema $[\min, \max]$:
$$p_{C1}(x) = \frac{x - x_{\min}}{x_{\max} - x_{\min}} = \frac{x - (-11.4976)}{8.5013 - (-11.4976)} = \frac{x + 11.4976}{19.9989}$$
- **Drawback:** Highly sensitive to outlier logits; produces uniform gradient rather than probabilistic S-curve.

### C2: Standard Logistic Sigmoid
Direct logistic mapping without parameter adjustment:
$$p_{C2}(x) = \sigma(x) = \frac{1}{1 + e^{-x}}$$
- **Drawback:** Assumes logit $0.0$ corresponds to probability $0.50$. For `ms-marco-MiniLM-L-6-v2`, marginal relevance occurs at negative logits ($-3.0$ to $-1.0$). Standard sigmoid maps these to $[0.047, 0.269]$, starving the verifier.

### C3: Temperature Scaling
Softens or sharpens the logistic curve using scalar temperature parameter $T > 0$:
$$p_{C3}(x) = \sigma\left(\frac{x}{T}\right) = \frac{1}{1 + e^{-x / T}}$$
Optimized via L-BFGS-B minimizing cross-entropy loss:
- **Fitted Temperature:** $T^* = 2.6559$
- **Optimization NLL:** $0.1920$
- **Effect:** Temperature scaling flattens the sigmoid, bringing negative logits closer to 0.5, but shifts both positive and negative tails symmetrically.

### C4: Platt Scaling (Affine Logistic Regression)
Fits both scale $a$ and intercept/bias $b$ via maximum likelihood estimation:
$$p_{C4}(x) = \sigma(a \cdot x + b) = \frac{1}{1 + e^{-(a \cdot x + b)}}$$
Optimized via L-BFGS-B minimizing negative log-likelihood:
- **Fitted Parameters:** $a = 0.6236, \quad b = 3.2801$
- **Optimization NLL:** $0.1180$
- **Effect:** The positive bias $b = +3.2801$ shifts the decision boundary to $x_{decision} = -b / a = -3.2801 / 0.6236 \approx -5.26$. This precisely aligns with the empirical threshold separating valid curriculum evidence from ungrounded distractors and OOD queries.

---

## 4. Empirical Evaluation & Comparison

All metrics evaluated with 10-bin Expected Calibration Error (ECE), Brier Score Loss, Log Loss (Cross-Entropy), ROC-AUC, and PR-AUC:

| Method | Description | Brier Score | Log Loss | ROC-AUC | PR-AUC | ECE (10 bins) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C0 / C1** | Min-Max Linear | 0.0447 | 0.1798 | 0.9822 | 0.9765 | 0.0750 |
| **C2** | Standard Sigmoid | 0.0466 | 0.3221 | 0.9822 | 0.9765 | 0.0554 |
| **C3** | Temperature Scaling ($T=2.6559$) | 0.0478 | 0.1920 | 0.9822 | 0.9765 | 0.0741 |
| **C4** | **Platt Scaling ($a=0.6236, b=3.2801$)** | **0.0283** | **0.1180** | **0.9822** | **0.9765** | **0.0107** |

### Calibration Quality Visual Representation
```
Prob. Calibration (ECE):
C2 (Sigmoid)   : [====              ] ECE = 0.0554
C3 (Temp Scale): [======            ] ECE = 0.0741
C4 (Platt)     : [=                 ] ECE = 0.0107  <-- BEST (80.7% lower error)

Log Loss (NLL):
C2 (Sigmoid)   : [================  ] 0.3221
C3 (Temp Scale): [=========         ] 0.1920
C4 (Platt)     : [======            ] 0.1180        <-- BEST (63.4% lower loss)
```

---

## 5. Behavior on Representative Query Types

Evaluating how each calibration function transforms key query logit archetypes:

| Query Type | Typical Logit $x$ | C2 Sigmoid $\sigma(x)$ | C3 Temp ($T=2.66$) | C4 Platt ($a=0.62, b=3.28$) | Status vs E4 Gate (0.28) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Clear Relevant** | $+4.00$ | $0.9820$ | $0.8184$ | **$0.9969$** | Passes Gate in all |
| **Moderate Relevant** | $+1.00$ | $0.7311$ | $0.5930$ | **$0.9799$** | Passes Gate in all |
| **Borderline Relevant** | **$-2.50$** | **$0.0759$ (FAILS)**| $0.2796$ (FAILS) | **$0.8483$ (PASSES)** | **C4 Prevents False Abstention** |
| **Weak Evidence** | **$-4.00$** | **$0.0180$ (FAILS)**| $0.1798$ (FAILS) | **$0.6869$ (PASSES)** | Routed to Tier-2 NLI |
| **Marginal Distractor** | **$-6.00$** | $0.0025$ | $0.0945$ | **$0.3866$** | Evaluated near boundary |
| **Clear Distractor** | **$-8.00$** | $0.0003$ | $0.0469$ | **$0.1534$ (REJECTED)**| Safely blocked |
| **True OOD Query** | **$-9.50$** | $0.0001$ | $0.0270$ | **$0.0664$ (REJECTED)**| Safely blocked |
| **Severe OOD Query** | **$-11.00$** | $0.0000$ | $0.0156$ | **$0.0271$ (REJECTED)**| Safely blocked |

---

## 6. Conclusion & Recommendation

1. **Failure of C2 (Standard Sigmoid):** Direct sigmoid mapping is fundamentally unsuited for `ms-marco-MiniLM-L-6-v2` when coupled with a 0.28 threshold because the model's pre-activation scores have a substantial negative bias for true relevant pairs.
2. **Superiority of C4 (Platt):** By learning both scaling $a = 0.6236$ and shift $b = 3.2801$, Platt scaling achieves an ECE of $0.0107$ and cleanly rescues borderline relevant evidence into the $[0.60, 0.85]$ range while keeping OOD queries firmly below $0.15$.
3. **Selection:** Platt Scaling (C4) is selected as the primary score calibration candidate for the EXP-0033 benchmark.
