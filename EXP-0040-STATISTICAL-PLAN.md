# EXP-0040: Pre-Registered Statistical Analysis Plan

**Experiment:** EXP-0040: Hierarchical Parent-Child Retrieval  
**Branch:** `exp-0040`  
**Evaluation Population:**
- Development Phase: `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)
- Blind Evaluation Phase (Protected): `EXP-0033-BLIND-DATASET.json` ($N = 500$)
**Primary Statistical Comparator:**
- Development: Condition P0 (C2_085 Child-Only Baseline)
- Blind: EXP-0039 C2_085 (Accuracy 71.40%, Macro F1 71.64%, FAR 18.47%, FRR 27.70%)

---

## 1. Hypotheses

- **$H_0$ (Null Hypothesis):** Hierarchical parent-child retrieval (P1) is inferior to child-only retrieval (P0) by more than the pre-registered non-inferiority margin:
  $$\Delta = \text{Accuracy}_{P1} - \text{Accuracy}_{P0} \le \Delta_{\text{NI}} = -3.00\text{ pp}$$
- **$H_1$ (Alternative Hypothesis):** P1 is non-inferior to P0 under the pre-registered margin:
  $$\text{LCB}_{95} > -3.00\text{ pp}$$

---

## 2. Statistical Methodology

1. **Paired 2x2 Contingency Matrix:**
   Direct case-by-case comparison:
   - $n_{11}$: Both models correct
   - $n_{00}$: Both models incorrect
   - $n_{01}$: P0 incorrect, P1 correct (Candidate wins)
   - $n_{10}$: P0 correct, P1 incorrect (Candidate regressions)
2. **McNemar Continuity-Corrected Chi-Square:**
   $$\chi^2_{\text{cc}} = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
3. **Exact Two-Sided Binomial P-Value:**
   $$p = 2 \times \min\left(\sum_{k=0}^{\min(n_{01}, n_{10})} \binom{n_{\text{disc}}}{k} 0.5^{n_{\text{disc}}}, 1 - \sum_{k=0}^{\min(n_{01}, n_{10})-1} \binom{n_{\text{disc}}}{k} 0.5^{n_{\text{disc}}}\right)$$
4. **Paired Standard Error:**
   $$\text{SE}_{\text{paired}} = \sqrt{\frac{(n_{01} + n_{10}) - \frac{(n_{01} - n_{10})^2}{N}}{N^2}} \times 100\%$$
5. **95% Confidence Interval & Lower Confidence Bound:**
   $$\text{CI}_{95} = \Delta \pm 1.95996 \times \text{SE}_{\text{paired}}$$
   $$\text{LCB}_{95} = \Delta - 1.64485 \times \text{SE}_{\text{paired}}$$
6. **Pre-Registered Decision Rules:**
   - Safety Ceiling: Standard $\text{FAR} \le 18.50\%$ on both development and blind sets.
   - Non-Inferiority: $\text{LCB}_{95} > -3.00\text{ pp}$.
