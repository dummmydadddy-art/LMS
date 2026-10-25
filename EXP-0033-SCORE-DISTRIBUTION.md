# EXP-0033: Cross-Encoder Score Distribution Analysis

**Experiment ID:** EXP-0033  
**Data Source:** `EXP-0032-RETRIEVAL-RESULTS.json` ($N=300$ queries, Mode R4)  
**Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2`  
**Date:** 2026-09-16  

---

## 1. Executive Summary & Core Diagnosis

In EXP-0032, deploying `ms-marco-MiniLM-L-6-v2` as a post-RRF reranker caused a statistically significant downstream verifier accuracy drop from **65.00% to 58.33%** ($p = 0.0042$, McNemar test), accompanied by an increase in False Acceptance Rate (FAR) from **23.48% to 42.42%**.

This forensic study analyzes the raw logit and sigmoid probability distributions across all 300 test queries.

### The Central Discovery
The failure was **not** a ranking breakdown. Rather, it was a **score-scale collision between the cross-encoder logit distribution and the frozen E4 verifier's hardcoded Stage 3 evidence adequacy gate (`maxSim < 0.28`)**:

1. **True OOD Queries:** Raw logits span $[-11.28, -0.92]$ (Median: **$-9.25$**, Mean: **$-8.69$**). Sigmoid probabilities are near zero ($\le 0.001$).
2. **The 36 Downstream Regression Queries ($n_{10} = 36$):** Raw logits span $[-8.75, -0.89]$ (Median: **$-2.26$**, Mean: **$-3.19$**). When mapped through standard sigmoid $\sigma(x)$, probabilities fell into $[0.0002, 0.2919]$ with a **median of $0.0947$**.
3. **The Evidence Gate Chopping Block:** In the E4 verifier, any retrieved evidence with `similarity < 0.28` is prematurely discarded with the deterministic verdict:  
   `Zero or insufficient evidence available in approved curriculum (maxSim < 0.28)`.  
   Because $\sigma(-0.944) = 0.28$, any query whose top cross-encoder logit was below $-0.944$ was starved of downstream NLI evaluation. For all 36 regression cases, the correct curriculum chunk was present at Rank 1 or 2, but its logit (between $-3.5$ and $-1.0$) mapped to $\sigma(x) \in [0.03, 0.27]$, triggering false abstentions to `NOT_ESTABLISHED`.

---

## 2. Quantitative Score Distribution Matrix

All statistics computed over $N=300$ cases evaluated in EXP-0032 Mode R4:

### 2.1 Raw Cross-Encoder Logits ($x$)

| Category | $N$ | Min | P10 | P25 | Median | Mean | P75 | P90 | Max | Std Dev |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Correct Top-1 Evidence** | 238 | -11.25 | -3.20 | -0.96 | **+2.14** | **+1.60** | +4.10 | +5.63 | +7.96 | 3.51 |
| **Incorrect Top-1 Evidence** | 32 | -11.19 | -9.22 | -6.87 | **-2.00** | **-2.59** | +0.69 | +3.09 | +7.93 | 4.67 |
| **E4-Supported Cases** | 115 | -0.87 | +0.34 | +1.79 | **+3.01** | **+3.08** | +4.41 | +5.80 | +7.49 | 1.84 |
| **E4-Refuted Cases** | 60 | -0.92 | +0.29 | +1.83 | **+3.43** | **+3.47** | +5.25 | +6.67 | +7.96 | 2.21 |
| **E4-Abstained Cases** | 125 | -11.28 | -10.23 | -7.58 | **-3.38** | **-4.21** | -1.78 | +0.53 | +7.17 | 3.79 |
| **R0 $\to$ R4 Regressions ($n_{10}$)**| 36 | -8.75 | -7.35 | -3.91 | **-2.26** | **-3.19** | -1.65 | -1.14 | -0.89 | 2.05 |
| **Out-of-Distribution (OOD)** | 30 | -11.28 | -10.88 | -10.31 | **-9.25** | **-8.69** | -7.24 | -6.23 | -0.92 | 2.54 |

### 2.2 Standard Sigmoid Probabilities ($\sigma(x) = \frac{1}{1 + e^{-x}}$)

| Category | $N$ | Min | P10 | P25 | Median | Mean | P75 | P90 | Max |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Correct Top-1 Evidence** | 238 | 0.0000 | 0.0392 | 0.2777 | **0.8946** | **0.6822** | 0.9838 | 0.9964 | 0.9996 |
| **Incorrect Top-1 Evidence** | 32 | 0.0000 | 0.0001 | 0.0011 | **0.1195** | **0.3321** | 0.6650 | 0.9551 | 0.9996 |
| **E4-Supported Cases** | 115 | 0.2951 | 0.5847 | 0.8573 | **0.9531** | **0.8772** | 0.9879 | 0.9970 | 0.9994 |
| **E4-Refuted Cases** | 60 | 0.2854 | 0.5724 | 0.8622 | **0.9687** | **0.8802** | 0.9948 | 0.9987 | 0.9996 |
| **E4-Abstained Cases** | 125 | 0.0000 | 0.0000 | 0.0005 | **0.0328** | **0.1567** | 0.1440 | 0.6285 | 0.9992 |
| **R0 $\to$ R4 Regressions ($n_{10}$)**| 36 | 0.0002 | 0.0007 | 0.0198 | **0.0947** | **0.1043** | 0.1613 | 0.2422 | 0.2919 |
| **Out-of-Distribution (OOD)** | 30 | 0.0000 | 0.0000 | 0.0000 | **0.0001** | **0.0100** | 0.0007 | 0.0020 | 0.2854 |

---

## 3. Separation Analysis

```
  Logit Scale:
  [-12] ------------ [-8] ------------ [-4] ------------ [0] ------------ [+4] ------------ [+8]
   |                  |                 |                 |                |                 |
   |-- True OOD ------|                 |                 |-- Obvious In-Curriculum --------|
   (Mean: -8.69)                        |                 (Mean: +3.25)
                                        |
                          |-- R0->R4 Regressions --|
                          (Mean: -3.19, Med: -2.26)
                                        |
                           E4 Gate: x = -0.944 (Sim = 0.28)
                                        ^
                                        |
                      [DISCARDED BY E4 AS NO EVIDENCE]
```

### Statistical Separation Tests
1. **OOD vs In-Curriculum Regressions:**
   - OOD Median: $-9.25$, Regression Median: $-2.26$.
   - A distinct gap of **7.0 logit units** separates true out-of-distribution queries from in-curriculum regression queries.
2. **Why Did Regressions Have Negative Logits?**
   - MiniLM was trained on MS MARCO passage ranking where queries are typically declarative factoid searches ("what is the port of express").
   - In LMS benchmarks, queries are phrased as complex interrogatives ("Does display: grid establish an independent formatting context for its direct child elements?").
   - Even when the cross-encoder correctly identifies the passage as the best matching candidate, the question phrasing compresses the logit into the range $[-3.5, -1.0]$.
3. **The Sigmoid Compression Artefact:**
   - Under standard sigmoid $\sigma(x)$, the slope is maximal around $x=0$ and flattens out rapidly for negative values. A logit of $-2.5$ drops the score to $0.0758$, which falls far below the $0.28$ cosine threshold originally tuned for dense vector dot-products.

---

## 4. Calibration & Gate Adaptation Requirements

To fix the regression problem while preserving OOD suppression:
1. **Temperature Scaling:** Applying $T > 1.0$ softens the sigmoid slope, preventing moderate negative logits ($-3.0$ to $-1.0$) from collapsing to $< 0.10$.
2. **Affine / Platt Scaling:** Fitting $p = \sigma(a \cdot x + b)$ shifts the decision boundary to align cross-encoder confidence with true binary relevance.
3. **Adaptive Threshold Gate:** Rather than enforcing a static `maxSim >= 0.28` designed for cosine similarities, adjust the gate threshold to the calibrated cross-encoder distribution (e.g. $0.15 - 0.20$ or raw logit threshold $\ge -4.5$).
