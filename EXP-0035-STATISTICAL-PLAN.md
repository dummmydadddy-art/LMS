# EXP-0035: Statistical Verification and Testing Plan

**Experiment:** EXP-0035 (Dynamic Intent-Aware Relevance Gating & Compound-Clause NLI Decomposition)  
**Parent Lineage:** EXP-0034 Champion M2 (`b2fb2f2`, Audit `5726c2b`)  
**Frozen Baselines:**  
- Verifier: EXP-0031 E4 (`01d6220` in `backend/rag_premise_verifier.php`)  
- Retrieval: EXP-0034 Champion M2 (Hybrid $\alpha = 0.50$, Min-Max $[0.4000, 0.8500]$, Pool-15)  
- Historical Retrieval: EXP-0031 R0 (PostgreSQL FTS + pgvector)  
**Date:** 2026-09-16  
**Status:** FROZEN PRIOR TO BLIND EVALUATION  

---

## 1. Objectives & Testing Framework

EXP-0035 evaluates whether deterministic query-intent classification, intent-aware dynamic relevance gating $\theta(\text{intent})$, and compound-clause proposition decomposition can:
1. Recover the 3.00 percentage point accuracy deficit observed in EXP-0034 relative to frozen baseline R0.
2. Resolve the dual residual failure modes identified in the EXP-0034 forensic audit (10 Stage 3 gate failures and 9 Tier-2 NLI failures).
3. Establish formal statistical non-inferiority to R0 within a pre-specified margin $\Delta = 3.00\%$.
4. Preserve strict safety bounds on False Acceptance Rate ($\text{FAR} \le 19.0\%$) and Out-of-Distribution rejection ($\text{OOD Recall} \ge 88.0\%$).

---

## 2. Pre-Registered Hypotheses & Falsification Criteria

### Hypothesis H1: Intent-Aware Threshold Recovery
* **Hypothesis:** Modulating the Stage 3 relevance threshold using deterministic linguistic intent ($\theta(\text{intent}) = 0.24$ for curriculum-grounded conceptual/procedural queries) reduces false abstentions on legitimate technical claims by $\ge 30\%$ without increasing the False Acceptance Rate on negative claims by $> 1.0$ pp.
* **Falsification Condition:**
  $$\Delta \text{False Abstentions} < 30\% \quad \lor \quad \Delta \text{Standard FAR} > +1.0\%$$

### Hypothesis H2: Compound-Clause Grounding Precision
* **Hypothesis:** Evaluating evidence adequacy per decomposed proposition clause prevents partial-support hallucinations on mixed compound claims, improving accuracy on mixed compound premises by $\ge 15.0$ percentage points over aggregate passage scoring.
* **Falsification Condition:**
  $$\text{Acc}_{\text{G6}}(\text{Mixed}) - \text{Acc}_{\text{G0}}(\text{Mixed}) < 15.0\%$$

### Hypothesis H3: OOD Rejection Safety Invariance
* **Hypothesis:** Lowering the relevance threshold conditionally for in-domain conceptual queries does not compromise out-of-curriculum boundary rejection.
* **Falsification Condition:**
  $$\text{Recall}_{\text{OOD}}(\text{G6}) < \text{Recall}_{\text{OOD}}(\text{G0})$$

### Hypothesis H4: Scalar Gate Inadequacy
* **Hypothesis:** No single global static scalar threshold $\theta \in [0.20, 0.30]$ can simultaneously achieve both $\ge 70.0\%$ accuracy and $\le 19.0\%$ standard FAR on the benchmark.
* **Falsification Condition:**
  $$\exists \theta^* \in [0.20, 0.30] : \text{Acc}(\theta^*) \ge 70.0\% \land \text{FAR}(\theta^*) \le 19.0\%$$

---

## 3. Primary and Secondary Statistical Metrics

### 1. Downstream Accuracy (Primary)
$$\text{Acc} = \frac{\sum_{i=1}^N \mathbb{I}[\hat{y}_i = y_i]}{N} \times 100\%$$

### 2. Macro F1 Score (Primary)
Unweighted arithmetic mean of per-class F1 across `SUPPORTED`, `REFUTED`, and `NOT_ESTABLISHED`:
$$\text{Macro F1} = \frac{F_1(\text{SUP}) + F_1(\text{REF}) + F_1(\text{NE})}{3} \times 100\%$$

### 3. Standard False Acceptance Rate (FAR — Safety Primary)
Proportion of ungrounded or false claims (REFUTED, AMBIGUOUS, OOD) incorrectly verified as SUPPORTED:
$$\text{Standard FAR} = \frac{\text{False Acceptances}}{N_{\text{REF}} + N_{\text{AMB}} + N_{\text{OOD}}} \times 100\%$$

### 4. False Abstention Count (Type II Error on Evidence)
Number of valid, supported curriculum claims incorrectly rejected as `NOT_ESTABLISHED` due to gate or NLI abstention:
$$\text{False Abstentions} = \sum_{i \in \text{SUP}} \mathbb{I}[\hat{y}_i = \text{NOT\_ESTABLISHED}]$$

### 5. Out-of-Distribution Rejection Recall (Safety Primary)
$$\text{Recall}_{\text{OOD}} = \frac{\sum_{i \in \text{OOD}} \mathbb{I}[\hat{y}_i = \text{NOT\_ESTABLISHED}]}{N_{\text{OOD}}} \times 100\%$$

---

## 4. Hypothesis Testing & Significance Protocols

### A. Paired McNemar Test
For pairwise model comparisons on identical query sets (e.g., G6 vs. G0, G6 vs. R0):
$$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
* $n_{01}$: Model A incorrect, Model B correct
* $n_{10}$: Model A correct, Model B incorrect
* Degrees of freedom: $df = 1$
* Significance threshold: $\alpha = 0.05$ ($p < 0.05$ required; $p < 0.001$ denotes highly significant)

### B. Paired Difference Confidence Intervals
The standard error of the paired difference $\hat{d} = \text{Acc}_B - \text{Acc}_A$ is calculated via:
$$\text{Var}(\hat{d}) = \frac{(n_{01} + n_{10}) - \frac{(n_{01} - n_{10})^2}{N}}{N^2}$$
$$\text{SE}(\hat{d}) = \sqrt{\text{Var}(\hat{d})}$$
* 95% Two-Sided CI: $\hat{d} \pm 1.96 \times \text{SE}(\hat{d})$
* 95% One-Sided Lower Bound: $\hat{d} - 1.645 \times \text{SE}(\hat{d})$

---

## 5. Non-Inferiority Testing Protocol

* **Comparator Baseline:** Frozen baseline R0 ($\text{Acc}_{\text{R0}} = 69.60\%$ on 500 blind cases)
* **Pre-Specified Non-Inferiority Margin:** $\Delta = 3.00\%$ (Lower margin limit: $-\Delta = -3.00\%$)
* **Formal Decision Rule:**
  $$\text{Non-Inferiority Established} \iff \hat{d} - 1.645 \times \text{SE}(\hat{d}) \ge -3.00\%$$
* If the lower bound is strictly greater than or equal to $-3.00\%$, non-inferiority is declared **ESTABLISHED**.
* If the lower bound is less than $-3.00\%$, the outcome must be explicitly declared **NON-INFERIORITY NOT ESTABLISHED**.

---

## 6. Pre-Registered Decision Matrix for Blind Authorization

| Evaluation Outcome | Metric Threshold | Action / Decision |
|---|---|---|
| Decisive Superiority | $\text{Acc}_{\text{G6}} \ge 70.0\% \land \text{FAR} \le 18.5\%$ | Declare Champion; Authorized for Production |
| Non-Inferiority Established | $\text{Lower Bound} \ge -3.00\% \land \text{FAR} \le 18.5\%$ | Declare Non-Inferior Champion; Candidate Pass |
| Conditional Improvement | $\text{Acc}_{\text{G6}} > \text{Acc}_{\text{G0}} \land \text{Lower Bound} < -3.00\%$ | CONDITIONAL; Progress over M2, but R0 remains superior |
| Safety Breach | $\text{FAR} > 19.5\% \lor \text{OOD Recall} < 85.0\%$ | REJECT; Safety invariant violated |
| Degradation | $\text{Acc}_{\text{G6}} \le \text{Acc}_{\text{G0}}$ | FAIL; No recovery demonstrated |
