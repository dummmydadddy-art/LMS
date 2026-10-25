# EXP-0039: Pre-Registered Statistical Analysis Plan

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Control Baseline:** Control C0 (Legacy Regex Chunker, 23 chunks, Candidate A4 verifier: Accuracy = 90.75%, Macro F1 = 90.70%, FAR = 18.50%, FRR = 0.00%)  
**Date:** September 2026  

---

## 1. Primary & Secondary Hypotheses

### 1.1 Non-Inferiority Hypothesis (Primary)
We hypothesize that conservative proposition-preserving chunking (Intervention $C$) is **non-inferior** to Control C0 in downstream verification accuracy, within a pre-registered non-inferiority margin of $\Delta_{NI} = -3.00$ percentage points ($-0.0300$):
$$\begin{aligned}
H_0 &: p_C - p_0 \le -0.0300 \quad (\text{Inferior}) \\
H_1 &: p_C - p_0 > -0.0300 \quad (\text{Non-Inferior})
\end{aligned}$$

### 1.2 Superiority Hypothesis (Secondary)
We test whether Intervention $C$ achieves statistically significant superiority over Control C0:
$$\begin{aligned}
H_0 &: p_C = p_0 \\
H_1 &: p_C > p_0 \quad (\alpha = 0.05, \text{two-sided})
\end{aligned}$$

---

## 2. Statistical Formulation & Lower Confidence Bound

Because the evaluation is conducted on a paired sample ($N = 400$ identical queries evaluated under both C0 and Candidate $C$), we use the paired binary contingency table:

| | Candidate Correct (1) | Candidate Incorrect (0) | Total |
|---|---|---|---|
| **C0 Correct (1)** | $n_{11}$ | $n_{01}$ | $n_{1\cdot}$ |
| **C0 Incorrect (0)** | $n_{10}$ | $n_{00}$ | $n_{0\cdot}$ |
| **Total** | $n_{\cdot 1}$ | $n_{\cdot 0}$ | $N$ |

### 2.1 Paired Standard Error of Proportion Difference
The standard error of the paired difference $\hat{\Delta} = \hat{p}_C - \hat{p}_0 = \frac{n_{10} - n_{01}}{N}$ is given by:
$$\text{SE}_{\text{paired}} = \frac{1}{N} \sqrt{n_{01} + n_{10} - \frac{(n_{01} - n_{10})^2}{N}}$$

### 2.2 One-Sided 95% Lower Confidence Bound (LCB)
At significance level $\alpha = 0.05$, the one-sided 95% lower confidence bound is:
$$\text{LCB}_{95} = \hat{\Delta} - 1.645 \cdot \text{SE}_{\text{paired}}$$

### 2.3 Formal Decision Rule
- **Non-Inferiority Established:** Confirmed **IF AND ONLY IF** $\text{LCB}_{95} > -0.0300$ (i.e. $> -3.00$ pp).
- **Non-Inferiority Inconclusive / Failed:** If $\text{LCB}_{95} \le -0.0300$.

---

## 3. Methodological Reporting Correction Regarding EXP-0038

> [!IMPORTANT]
> **Methodological Correction Note:**  
> In EXP-0038 development analysis, the statement *"McNemar p = 0.0912 > 0.05 therefore non-inferiority is formally established"* was noted.  
> Statistically, $p > 0.05$ in a standard two-sided McNemar test merely denotes **failure to reject the null hypothesis of equality** ($H_0: p_C = p_0$); it does **NOT** establish non-inferiority.  
> Establishing non-inferiority requires demonstrating that the entire 95% one-sided confidence interval falls strictly above the pre-registered non-inferiority margin:
> $$\text{LCB}_{95} = (\hat{p}_C - \hat{p}_0) - 1.645 \cdot \text{SE}_{\text{paired}} > \Delta_{NI} = -3.00\text{ pp}$$
> In EXP-0039, this rigorous non-inferiority framework is strictly implemented in all analysis code, JSON outputs, and audit artifacts. Historical EXP-0038 artifacts remain untouched per reproducibility rules.

---

## 4. Hypothesis Testing & Significance Metrics

1. **McNemar Test with Continuity Correction:**
   $$\chi^2_{\text{cc}} = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
2. **Exact Two-Sided Binomial Test:**
   When discordant count $n_{01} + n_{10} < 25$, the exact binomial test under $B(n_{01} + n_{10}, 0.5)$ is computed.
3. **Retrieval Metrics ($N = 400$):**
   - $\text{Recall@1} = \frac{\text{Hits in top 1}}{\text{Queries with gold chunk}}$
   - $\text{Recall@5} = \frac{\text{Hits in top 5}}{\text{Queries with gold chunk}}$
   - $\text{MRR} = \frac{1}{N_{\text{eval}}} \sum_{i=1}^{N_{\text{eval}}} \frac{1}{\text{rank}_i}$
   - $\text{nDCG@5} = \frac{1}{N_{\text{eval}}} \sum_{i=1}^{N_{\text{eval}}} \frac{\text{DCG}_i}{\text{IDCG}_i}$
4. **Downstream Safety Metrics:**
   - $\text{False Acceptance Rate (FAR)} = \frac{\text{False Acceptances}}{\text{Total Non-Supported Queries}} \times 100\%$ (Target: $\le 18.50\%$)
   - $\text{False Rejection Rate (FRR)} = \frac{\text{False Refutations}}{\text{Total Supported Queries}} \times 100\%$ (Target: $0.00\%$)
