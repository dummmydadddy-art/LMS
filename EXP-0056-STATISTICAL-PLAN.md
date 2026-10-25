# EXP-0056: Pre-Registered Statistical Analysis Plan

**Experiment:** EXP-0056: PageIndex Structural Navigation for Retrieval-Efficient RAG  
**Date:** September 2026  
**Status:** PRE-REGISTERED  

---

## 1. Primary & Secondary Endpoints

### 1.1 Retrieval & Efficiency Endpoints
- **Primary Endpoint 1 (Search Space Reduction):**
  $$\text{page\_reduction} = 1 - \frac{\text{candidate\_pages}_{\text{C1}}}{\text{baseline\_pages}_{\text{B0}}}$$
  $$\text{context\_reduction} = 1 - \frac{\text{candidate\_tokens}_{\text{C1}}}{\text{baseline\_tokens}_{\text{B0}}}$$
  *Target Criterion:* $\text{page\_reduction} \ge 50\%$ across routed queries.
- **Primary Endpoint 2 (Fallback Frequency):** Rate of fallback invocations due to structural routing uncertainty.
- **Primary Endpoint 3 (Retrieval Latency):** Mean, median (p50), and 95th percentile (p95) retrieval time per query.

### 1.2 Downstream Verification Endpoints
- **Primary Accuracy Endpoint:** Overall 3-class verification accuracy on `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$) and `EXP-0033-BLIND-DATASET.json` ($N = 500$).
  *Criterion:* Accuracy must remain non-inferior to EXP-0040 baseline ($72.00\%$, acceptable bound $\ge 71.40\%$) with 0 unhandled regressions.
- **Primary Safety Endpoint:** Standard False Acceptance Rate (FAR $\le 17.50\%$).
- **Secondary Verifier Endpoints:** Macro F1, False Rejection Rate (FRR), Supported Recall, Refutation Recall, NOT_ESTABLISHED Recall.

---

## 2. Statistical Testing Methodology

### 2.1 Paired Binary Classification (Accuracy & Safety)
- For downstream verification predictions on identical benchmark queries, evaluate paired $2 \times 2$ contingency table:
  - $n_{11}$: Both B0 and C1 correct
  - $n_{00}$: Both B0 and C1 incorrect
  - $n_{10}$: B0 correct, C1 incorrect (regressions)
  - $n_{01}$: B0 incorrect, C1 correct (improvements)
- **McNemar's Test:**
  $$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
  evaluated with 1 degree of freedom (two-sided, $\alpha = 0.05$).
- **Sample Parity Note:** If discordant pairs $n_{10} + n_{01} = 0$, report exact empirical sample parity. Do not assert inferential proof of non-inferiority from a degenerate sample interval.

### 2.2 Confidence Intervals
- For all proportions (Accuracy, Macro F1, FAR, FRR, Category Recalls), compute 95% two-sided **Wilson Score Confidence Intervals**:
  $$\text{CI}_{95\%} = \frac{\hat{p} + \frac{z^2}{2N} \pm z \sqrt{\frac{\hat{p}(1-\hat{p})}{N} + \frac{z^2}{4N^2}}}{1 + \frac{z^2}{N}}$$
  with $z = 1.95996$.
- For efficiency metrics, report mean, standard deviation, median, p50, and p95 across all queries.

---

## 3. Decision Framework & Matrix

| Decision | Efficiency Criteria | Downstream RAG Criteria |
|---|---|---|
| **ADOPT** | Search space reduction $\ge 50\%$, bounded fallback $\le 35\%$, 100% fidelity | Blind Accuracy $\ge 71.40\%$, FAR $\le 17.50\%$, zero unhandled regressions |
| **CONDITIONAL** | Modest search reduction ($25-50\%$), 100% fidelity | Blind Accuracy $\ge 70.00\%$, FAR $\le 18.50\%$ |
| **REJECT** | Severe regression ($n_{10} > 5$), FAR $> 18.50\%$, or fidelity violation | Downstream accuracy drops significantly |
| **PROMISING** | Significant efficiency gain, but downstream needs calibration | Inconclusive downstream metrics |
