# EXP-0035: Inferential Statistical Analysis & Hypothesis Testing

**Experiment:** EXP-0035 (Frozen Blind Benchmark Evaluation)  
**Evaluated Champion:** B1 (EXP-0035 G6 Champion: Decomposed NLI + Dynamic Relevance Gating)  
**Primary Comparator:** B0 (Frozen EXP-0034 M2 Hybrid Baseline, $\alpha = 0.50$, Pool-15, Gate $\theta = 0.28$)  
**Secondary Comparator:** Frozen Baseline R0 (EXP-0031 E4 Baseline, PostgreSQL FTS + pgvector)  
**Sample Size:** $N = 500$ paired blind cases  
**Date:** 2026-09-16  
**Status:** COMPLETE STATISTICAL ANALYSIS  

---

## 1. Primary Comparison: B1 (G6 Champion) vs. B0 (M2 Baseline)

### 2x2 Paired Contingency Matrix ($N = 500$)

```text
                        B1 Correct (1)      B1 Incorrect (0)       Total
B0 Correct (1)               334                   0                334
B0 Incorrect (0)               1                 165                166
Total                        335                 165                500
```

* **Concordant Pairs:**
  - Both Correct ($n_{11}$): 334 (66.80%)
  - Both Incorrect ($n_{00}$): 165 (33.00%)
* **Discordant Pairs:**
  - B0 Incorrect, B1 Correct ($n_{01}$): **1** (`EXP33-SUP-0020`)
  - B0 Correct, B1 Incorrect ($n_{10}$): **0**
  - Total Discordant ($n_{01} + n_{10}$): 1

### Paired McNemar Test
$$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}} = \frac{(|1 - 0| - 1)^2}{1} = \frac{0}{1} = 0.0000$$
$$p\text{-value} = 1.000000$$

* **Accuracy Difference:** $\hat{d} = 67.00\% - 66.80\% = \mathbf{+0.20\%}$ (+1 query rescued)
* **Paired Standard Error:**
  $$\text{Var}(\hat{d}) = \frac{1 - \frac{(1 - 0)^2}{500}}{250,000} = \frac{0.998}{250,000} = 0.000003992 \implies \text{SE} = 0.001998 \approx 0.20\%$$
* **95% Two-Sided Confidence Interval:**
  $$\hat{d} \pm 1.96 \times \text{SE} = +0.20\% \pm 0.39\% = \mathbf{[-0.19\%, +0.59\%]}$$

### Interpretation
The accuracy gain of B1 over B0 (+0.20 pp) is **not statistically significant** at the $\alpha = 0.05$ level ($p = 1.000$). However, because $n_{10} = 0$, B1 introduced **zero regressions** across all 500 test cases, confirming that dynamic intent gating and clause decomposition operate as a strict, non-destructive refinement over the hybrid baseline.

---

## 2. Secondary Comparison: B1 (G6 Champion) vs. R0 (Frozen Baseline)

### 2x2 Paired Contingency Matrix ($N = 500$)

```text
                        B1 Correct (1)      B1 Incorrect (0)       Total
R0 Correct (1)               328                  20                348
R0 Incorrect (0)               7                 145                152
Total                        335                 165                500
```

* Concordant Pairs: $n_{11} = 328, n_{00} = 145$
* Discordant Pairs:
  - R0 Incorrect, B1 Correct ($n_{01}$): 7
  - R0 Correct, B1 Incorrect ($n_{10}$): 20
  - Total Discordant ($n_{01} + n_{10}$): 27

### Paired McNemar Test
$$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}} = \frac{(|7 - 20| - 1)^2}{27} = \frac{12^2}{27} = \frac{144}{27} = 5.3333$$
$$p\text{-value} = 0.020921 \quad (p < 0.05)$$

* **Accuracy Difference:** $\hat{d} = 67.00\% - 69.60\% = \mathbf{-2.60\%}$
* **Paired Standard Error:**
  $$\text{Var}(\hat{d}) = \frac{27 - \frac{(-13)^2}{500}}{250,000} = \frac{27 - 0.338}{250,000} = \frac{26.662}{250,000} = 0.00010665 \implies \text{SE} = 1.0327\%$$
* **95% Two-Sided Confidence Interval ($Z = 1.96$):**
  $$\hat{d} \pm 1.96 \times \text{SE} = -2.60\% \pm 2.02\% = \mathbf{[-4.62\%, -0.58\%]}$$
* **95% One-Sided Lower Confidence Bound ($Z = 1.645$):**
  $$\hat{d} - 1.645 \times \text{SE} = -2.60\% - 1.70\% = \mathbf{-4.30\%}$$

---

## 3. Formal Non-Inferiority Testing

According to the pre-registered protocol in `EXP-0035-STATISTICAL-PLAN.md`:
* Pre-specified non-inferiority margin: $\Delta = 3.00\%$ (Lower bound threshold: $-\Delta = -3.00\%$)
* Observed 95% One-Sided Lower Bound: $\mathbf{-4.30\%}$
* Observed 95% Two-Sided Lower Bound: $\mathbf{-4.62\%}$

```text
Non-Inferiority Margin Boundary: ----------------------- [-3.00%]
95% One-Sided Lower Bound:               [-4.30%]
95% Two-Sided Confidence Interval:  [-4.62% ======= -2.60% ======= -0.58%]
```

### Formal Decision
**`NON-INFERIORITY NOT ESTABLISHED`**

Because the 95% one-sided lower confidence bound ($-4.30\%$) and the two-sided lower bound ($-4.62\%$) fall well below the non-inferiority margin of $-3.00\%$, formal statistical non-inferiority of the open-source hybrid reranking stack relative to frozen baseline R0 is **NOT ESTABLISHED**. Baseline R0 remains statistically significantly superior to B1 ($p = 0.0209$).

---

## 4. Evaluation of Pre-Registered Hypotheses

| Hypothesis | Pre-Registered Metric Criterion | Observed Empirical Evidence | Formal Verdict |
|---|---|---|---|
| **H1: Intent-Aware Gating** | Reduce false abstentions on legitimate conceptual queries without increasing FAR by $> 1.0$ pp | Rescued 1 false abstention (`EXP33-SUP-0020`); FAR remained invariant at 18.12%; 7 borderline queries remained below 0.26 | **PARTIALLY SUPPORTED** |
| **H2: Clause-Grounded Evidence** | Prevent partial-support hallucinations; improve multi-clause accuracy | Improved development mixed-compound accuracy from 78.0% to 82.0% (+4.0 pp); 0 false acceptances on NOT_ESTABLISHED | **SUPPORTED** |
| **H3: OOD Rejection Safety** | OOD recall invariant to gating and decomposition | OOD recall remained exactly 100.0% on development and 92.0% on blind (0 degradation) | **SUPPORTED** |
| **H4: Scalar Gate Inadequacy** | No single scalar gate satisfies accuracy and FAR | Development sensitivity sweep proved lowering scalar threshold destroys OOD recall (collapsing to 49.0% at $\theta = 0.20$) | **SUPPORTED** |

---

## 5. Statistical Conclusion

1. **B1 vs B0:** B1 provides a safe, incremental improvement over B0 (+0.20 pp accuracy, 0 regressions, zero FAR increase).
2. **B1 vs R0:** While closing the gap from -3.00 pp to -2.60 pp, the remaining deficit is statistically significant ($p = 0.0209$), and statistical non-inferiority is formally not established due to the confidence interval extending to $-4.62\%$.
3. **Primary Root Cause:** The remaining performance deficit is concentrated in 20 queries where R0 was correct but B1 failed, driven by Tier-2 NLI semantic reasoning and phrase-level entailment limitations rather than retrieval ranking or gating failures.
