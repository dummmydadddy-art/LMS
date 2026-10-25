# EXP-0036: Statistical Verification & Blind Evaluation Plan

**Experiment:** EXP-0036  
**Target:** Rigorous Statistical Testing of Champion N7 vs Baselines  
**Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256 `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`)  
**Status:** PRE-REGISTERED PRIOR TO BLIND UNBLINDING  

---

## 1. Primary & Secondary Comparisons

### Primary Statistical Comparison 1: Champion N7 vs Baseline G6 (EXP-0035 B1)
* **Baseline Score:** Accuracy **67.00%** (335 / 500), Macro F1 **66.07%**.
* **Hypothesis:** Mode N7 demonstrates statistically significant improvement over G6 ($p < 0.05$) or non-inferiority with positive margin.
* **Test:** Two-sided paired McNemar's test with continuity correction on 500 matched query predictions.

### Primary Statistical Comparison 2: Champion N7 vs Baseline M2 (EXP-0035 B0)
* **Baseline Score:** Accuracy **66.80%** (334 / 500), Macro F1 **65.89%** (verified authoritative baseline).
* **Test:** Paired McNemar's test.

### Secondary Statistical Comparison: Champion N7 vs Historical R0 (EXP-0031)
* **Target Benchmark:** Accuracy **69.60%** (348 / 500), Macro F1 **68.58%**.
* **Hypothesis:** Non-inferiority of open-source local pipeline (N7) relative to frozen closed baseline (R0) within pre-registered non-inferiority margin $\Delta = -3.00$ percentage points.
* **Test:** One-sided asymptotic 95% confidence interval of paired difference $(p_{N7} - p_{R0})$. Non-inferiority established if lower bound $> -3.00\%$.

---

## 2. Statistical Formulas & Decision Rules

### McNemar's Test with Continuity Correction
For the $2 \times 2$ contingency table of paired prediction outcomes:
$$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
Where:
* $n_{01}$: Cases failed by baseline but correct under N7.
* $n_{10}$: Cases correct under baseline but failed by N7 (regressions).

### Pre-Registered Decision Criteria
1. **ADOPT:**
   - Accuracy $Acc_{N7} > Acc_{G6}$ with McNemar $p < 0.05$.
   - One-sided 95% CI lower bound vs R0 $> -3.00\%$.
   - Standard FAR $\le 18.50\%$.
   - Zero OOD regressions ($OOD \ge 88.00\%$, Novel-OOD $\ge 98.00\%$).
2. **CONDITIONAL:**
   - Accuracy $Acc_{N7} \ge Acc_{G6}$ with zero net regressions ($n_{10} = 0$).
   - Non-inferiority against R0 inconclusive but gap closed to $\le 1.50$ pp.
   - Ready for downstream generation evaluation.
3. **REJECT:**
   - Any statistically significant degradation ($n_{10} > n_{01}$, $p < 0.05$).
   - Standard FAR $> 20.00\%$.
   - OOD recall regression below $85.00\%$.
