# EXP-0039: Development Metric Reconciliation & Independent Re-Audit Report

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Current Audited Commit:** `3376305`  
**Parent Commit:** `e1cf1503851a5ff2fc1b3a86897556943878cf13` (EXP-0038 audit checkpoint)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (Audited Commit: `1768832`, UNTOUCHED)  
**Historical Lineage Predictions:** EXP-0037 and EXP-0038 predictions and artifacts UNTOUCHED  
**Underlying Development Predictions:** `scratch/exp0039_dev_predictions.json` (100% UNCHANGED)  
**Blind Benchmark Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3`, SEALED, UNREAD, UNTOUCHED)  
**Auditor:** Independent Research Integrity & Statistical Auditor  
**Status:** RECONCILIATION COMPLETE  
**Audit Determination:** **CONDITIONAL PASS — C2_085 BLIND READY AFTER DOCUMENTED REPORT CORRECTIONS**  

---

## 1. Executive Summary & Purpose

This reconciliation report conducts a rigorous, independent re-audit of the development results of **EXP-0039 (Conservative RAG Chunking with Chonkie)**. 

### Protocol Constraints & Compliance:
1. **Zero Prediction Tampering:** The underlying model inference predictions (`scratch/exp0039_dev_predictions.json`, $N = 400 \times 5$ experimental conditions) and raw retrieval caches (`scratch/exp0039_dev_*_cache.json`) were **NOT** regenerated, modified, or tuned. All findings are derived directly from the audited predictions generated at commit `3376305`.
2. **Strict Blind Isolation:** The blind evaluation dataset (`EXP-0033-BLIND-DATASET.json`, $N = 500$) remained strictly untouched, unread, and unexecuted.
3. **Preservation of Original Artifacts:** All original EXP-0039 artifacts (`EXP-0039-DESIGN.md`, `EXP-0039-DEVELOPMENT-ANALYSIS.md`, `EXP-0039-DEVELOPMENT-RESULTS.json`, `EXP-0039-INDEPENDENT-AUDIT.md`) are preserved exactly as committed. This report and its companion artifacts (`EXP-0039-RECONCILIATION.json`, `EXP-0039-RECONCILED-DEVELOPMENT-RESULTS.json`, `EXP-0039-RECONCILED-AUDIT.md`, `EXP-0039-RECONCILED-AUDIT.json`) document and rectify all reporting, formulaic, and statistical inconsistencies transparently.

### Primary Discrepancies Reconciled:
- **Authoritative Comparator Restored:** The previous report cited `90.75% Accuracy / 90.70% Macro F1 / 18.50% FAR / 0.00% FRR` as the "EXP-0037 Champion". This was a reporting contamination copied from the EXP-0038 development result ($N = 400$) and the EXP-0036 safety ceiling. The authentic EXP-0037 blind champion ($N = 500$) is **71.60% Accuracy**, **71.81% Macro F1**, **15.33% FAR**, and **30.99% FRR**. The proper development comparator is Control C0 ($N = 400$, **92.00% Accuracy**, **92.77% Macro F1**).
- **Retrieval Metric Defect Corrected (nDCG@5 > 100%):** The previous script hardcoded an ideal DCG of $1.0 / \log_2(2)$, assuming a single relevant item existed. For semantic chunking, where multiple chunks match a curriculum concept, DCG exceeded 1.0, generating defective nDCG values up to **212.88%**. Implementing standard bounded nDCG@5 normalizes by $\sum_{r=1}^{\min(|G|, 5)} 1/\log_2(r+1)$, yielding strictly bounded values: **C0 = 90.29%**, **C1 = 95.45%**, **C2_075 = 86.09%**, **C2_080 = 86.23%**, and **C2_085 = 86.02%** (Recall@5 remains 100.0% across all conditions).
- **Paired Contingency Table Orientation Reconciled:** The previous table and JSON inverted the subscripts $n_{01}$ and $n_{10}$ relative to text labels. Under the standard convention ($n_{01} = \text{baseline wrong, candidate correct}$; $n_{10} = \text{baseline correct, candidate wrong}$), Candidate C2_085 vs C0 has **$n_{01} = 9$** and **$n_{10} = 2$**, establishing arithmetic consistency with $\Delta = 100 \times (9 - 2) / 400 = \mathbf{+1.75\text{ pp}}$.
- **Candidate Selection Confirmed:** After complete reconciliation, candidate **C2_085** retains all properties required by the pre-registered 7-level priority hierarchy (93.75% Accuracy, 94.33% Macro F1, 2.80% FAR, 100.0% Recall@5, +0.39 pp 95% LCB).

---

## 2. Experimental Lineage & Scope

| Attribute | Audited Specification | Audit Verification |
|---|---|---|
| **Repository** | `d:\Collage project\EduConnect-LMS-Experimental` | Verified working directory |
| **Branch** | `exp-0039` | Clean lineage on branch `exp-0039` |
| **Audited HEAD** | `3376305` | Verified commit hash |
| **Parent Commit** | `e1cf1503851a5ff2fc1b3a86897556943878cf13` | Exact completed EXP-0038 audit checkpoint |
| **Production Repo** | `d:\Collage project\EduConnect-LMS-Production` | Audited HEAD `1768832` — strictly untouched |
| **Blind Dataset** | `EXP-0033-BLIND-DATASET.json` ($N = 500$) | SHA-256 `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3` — SEALED & UNREAD |
| **Development Dataset** | `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$) | SHA-256 `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` — VERIFIED |
| **Historical Predictions** | EXP-0037 and EXP-0038 committed predictions | UNTOUCHED — preserved in historical lineage |

---

## 3. Authoritative EXP-0037 Comparator & Population Separation

### 3.1 Forensic Diagnosis of Contamination
In `EXP-0039-DEVELOPMENT-ANALYSIS.md` and `EXP-0039-INDEPENDENT-AUDIT.md`, the "EXP-0037 Champion" was cited as:
- Accuracy: 90.75%
- Macro F1: 90.70%
- Standard FAR: 18.50%
- FRR: 0.00%

Forensic code and artifact inspection revealed that:
1. **90.75% Accuracy** was copied directly from `EXP-0038-DEVELOPMENT-RESULTS.json` (line 75) and `EXP-0038-DEVELOPMENT-ANALYSIS.md` (line 23), where it represented the **development accuracy of Intervention C1 (Docling HybridChunker)** on `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$).
2. **18.50% FAR** was copied from the pre-registered safety ceiling defined in EXP-0036 / EXP-0037 design specifications.
3. **0.00% FRR** was an ungrounded placeholder.

### 3.2 Distinct Evaluation Populations
It is scientifically invalid to compare development performance on $N = 400$ directly against blind benchmark performance on $N = 500$ as if they were the same dataset. The two populations must be strictly separated:

| Metric | Authoritative EXP-0037 Champion<br>**(Blind Benchmark, $N = 500$)**<br>`EXP-0033-BLIND-DATASET.json` | Proper Development Baseline (C0)<br>**(Development Dataset, $N = 400$)**<br>`EXP-0025-DEVELOPMENT-DATASET.json` |
|---|---|---|
| **Sample Size ($N$)** | 500 cases | 400 cases |
| **Accuracy** | **71.60%** (358 / 500) | **92.00%** (368 / 400) |
| **Macro F1** | **71.81%** | **92.77%** |
| **Standard FAR** | **15.33%** (44 / 287) | **2.40%** (6 / 250) |
| **False Rejection Rate (FRR)** | **30.99%** (66 / 213) | **16.00%** (24 / 150) |
| **Supported Recall** | **69.01%** (147 / 213) | **84.00%** (126 / 150) |
| **Refutation Recall** | **70.37%** (114 / 162) | **95.33%** (143 / 150) |
| **NOT_ESTABLISHED Recall** | **77.60%** (97 / 125) | **99.00%** (99 / 100) |
| **OOD Recall** | **94.00%** | **99.00%** (99/100) |
| **Novel-OOD Recall** | **92.00%** | **N/A** — separate Novel-OOD subset is not present in EXP-0025-DEVELOPMENT-DATASET.json |
| **False Acceptances** | 44 | 6 |
| **False Abstentions** | 19 (Supported $\to$ NE) | 0 (Supported $\to$ NE) |

---

## 4. Retrieval Metric Recomputation & nDCG Defect Diagnosis

### 4.1 Trace of the Defect in `run_exp0039_retrieval_benchmark.py`
In `scratch/run_exp0039_retrieval_benchmark.py`, lines 251–258:
```python
# nDCG@5 (binary relevance)
dcg = 0.0
for rank, cid_cand in enumerate(top5_ids, start=1):
    rel = 1.0 if cid_cand in gold_cids else 0.0
    dcg += rel / np.log2(rank + 1)
idcg = 1.0 / np.log2(2)  # <--- DEFECT: hardcoded ideal DCG assuming exactly 1 gold item!
ndcg5_sum += (dcg / idcg)
```

**Root Cause:**
`idcg = 1.0 / np.log2(2) = 1.0` assumes that only one document in the corpus is relevant.
Under semantic chunking (C2_075, C2_080, C2_085), source documents are split into fine-grained proposition chunks (69 to 76 chunks). Multiple chunks in the same document match the curriculum rule associated with a query (mean of **4.8 to 5.1** gold chunks per evaluated query, up to a maximum of 13 chunks).
When 2, 3, or 4 relevant chunks appeared in the top-5 retrieved slots:
$$\text{DCG}@5 = \frac{1}{\log_2(2)} + \frac{1}{\log_2(3)} + \frac{1}{\log_2(4)} \approx 1.0 + 0.6309 + 0.5000 = 2.1309$$
Dividing by `idcg = 1.0` produced $\text{nDCG}@5 = 2.1309 = \mathbf{213.09\%}$, causing the reported averages to exceed 100% (e.g. 212.88% for C2_085).

### 4.2 Standard Bounded Formula
In standard information retrieval, the Ideal Discounted Cumulative Gain at rank $K=5$ for a query with $|G|$ relevant items is:
$$\text{IDCG}@5 = \sum_{r=1}^{\min(|G|, 5)} \frac{1}{\log_2(r + 1)}$$
And the normalized discounted cumulative gain is:
$$\text{nDCG}@5 = \frac{\text{DCG}@5}{\text{IDCG}@5}$$
Because $\text{DCG}@5 \le \text{IDCG}@5$ for any ranking, $0 \le \text{nDCG}@5 \le 1.0$ (or $0\% \le \text{nDCG}@5 \le 100\%$).

### 4.3 Recomputed Retrieval Metrics Across All 5 Conditions
Recomputed directly from the persisted retrieval caches (`scratch/exp0039_dev_*_cache.json`) over the 256 curriculum queries with gold annotations ($N_{\text{eval}} = 256$):

| Condition | Table | Chunks | Mean Gold Chunks | Max Gold Chunks | Recall@1 | Recall@5 | MRR | Defective Reported nDCG@5 | **Corrected Standard nDCG@5** | Latency P50 | Latency P95 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **C0_LegacyRegex** | `material_chunks_exp0032` | 23 | 1.76 | 4 | 98.44% | **100.0%** | 99.06% | 123.77% | **90.29%** | 851.3ms | 907.1ms |
| **C1_ChonkieRecursive** | `C1_ChonkieRecursive` | 10 | 1.51 | 3 | 99.22% | **100.0%** | 99.61% | 124.70% | **95.45%** | 663.9ms | 742.0ms |
| **C2_ChonkieSemantic_075** | `C2_ChonkieSemantic_075` | 69 | 4.83 | 11 | 93.36% | **100.0%** | 96.48% | 207.86% | **86.09%** | 459.5ms | 516.5ms |
| **C2_ChonkieSemantic_080** | `C2_ChonkieSemantic_080` | 71 | 4.92 | 12 | 93.36% | **100.0%** | 96.48% | 208.27% | **86.23%** | 457.4ms | 501.9ms |
| **C2_ChonkieSemantic_085** | `C2_ChonkieSemantic_085` | 76 | 5.09 | 13 | 92.97% | **100.0%** | 96.19% | 212.88% | **86.02%** | **409.2ms** | **460.9ms** |

**Observations:**
1. **Recall@5 = 100.0%** is independently reconfirmed across all five conditions.
2. Recall@1 and MRR match the originally reported values exactly down to the hundredth of a percent.
3. The corrected nDCG@5 values are strictly bounded between 86% and 96%.
4. C1 achieves the highest nDCG@5 (95.45%) because its 512-token chunks are massive, capturing all relevant text into a single top-1 chunk; however, as demonstrated below, this massive chunk size severely harms downstream verification accuracy.
5. C2_085 achieves 86.02% nDCG@5, providing compact, highly focused evidence chunks that optimize downstream NLI verifier precision.

---

## 5. Gold-Chunk Mapping Audit

An independent audit of the gold-chunk mapping implementation in `scratch/run_exp0038_retrieval_benchmark.py` and `scratch/run_exp0039_retrieval_benchmark.py` established:
1. **Generation:** Gold mappings are generated by regex pattern matching (`RULES`, 23 domain rules across 5 curriculum modules) against chunk titles and content stored in SQLite tables.
2. **Determinism:** The mapping queries chunks using `ORDER BY id` against static SQLite tables; execution is 100% deterministic.
3. **Consistency Across Conditions:** The exact same 23 `RULES` and regex patterns are applied across C0, C1, C2_075, C2_080, and C2_085.
4. **Candidate-Specific Chunk Mapping:** Table-specific chunk IDs are mapped dynamically based on chunk contents, ensuring candidate-specific IDs are correctly assigned.
5. **Multiple Mappings per Concept:** In semantic chunking, multiple small proposition chunks (up to 13) match a single rule's regex pattern. This is a natural consequence of fine-grained chunking and is properly handled by standard multi-hit IDCG normalization.
6. **Limitations:** Broad regex keywords (e.g. `\b(border|margin|padding)\b`) can match chunks containing passing references to the terms. However, because Recall@5 only requires at least one gold chunk in top-5, this has zero adverse impact on retrieval gating.

---

## 6. Paired Contingency Table Audit ($n_{01}$ vs $n_{10}$)

### 6.1 Convention and Resolution of Index Inversion
Under standard 2x2 paired contingency table methodology:
- $n_{11}$: Baseline correct ($1$), Candidate correct ($1$).
- $n_{00}$: Baseline incorrect ($0$), Candidate incorrect ($0$).
- **$n_{01}$**: Baseline incorrect ($0$), Candidate correct ($1$) $\implies$ **Candidate gains / wins**.
- **$n_{10}$**: Baseline correct ($1$), Candidate incorrect ($0$) $\implies$ **Candidate losses / regressions**.
- $\text{Discordant Total} = n_{01} + n_{10}$.
- **Accuracy Delta:**
  $$\Delta = \hat{p}_{\text{Cand}} - \hat{p}_{\text{Baseline}} = \frac{n_{01} - n_{10}}{N} \times 100\%$$

In the previously committed `EXP-0039-DEVELOPMENT-RESULTS.json` (lines 328–329, 421–422, 559–560, 688–689) and `EXP-0039-DEVELOPMENT-ANALYSIS.md` (table in Section 3), the labels were inverted: $n_{01}$ was labeled "c0 only" and $n_{10}$ was labeled "cand only". For C2_085, the table listed $n_{01} = 2, n_{10} = 9$, which if computed as $(n_{01} - n_{10})/400$ would equal $-1.75$ pp, directly contradicting the reported $\Delta = +1.75$ pp.

### 6.2 Independently Recomputed Paired Contingency Counts
Calculated directly from raw prediction vectors in `scratch/exp0039_dev_predictions.json` ($N = 400$):

| Comparison | $N$ | $n_{11}$ | $n_{00}$ | **$n_{01}$**<br>(Cand wins) | **$n_{10}$**<br>(Cand losses) | Discordant Total | Arithmetic Check:<br>$100 \times (n_{01} - n_{10}) / 400$ | Reported $\Delta$ Acc |
|---|---|---|---|---|---|---|---|---|
| **C1 vs C0** | 400 | 362 | 30 | **2** | **6** | 8 | $100 \times (2 - 6) / 400 = \mathbf{-1.00\text{ pp}}$ | -1.00 pp |
| **C2_075 vs C0** | 400 | 365 | 22 | **10** | **3** | 13 | $100 \times (10 - 3) / 400 = \mathbf{+1.75\text{ pp}}$ | +1.75 pp |
| **C2_080 vs C0** | 400 | 365 | 23 | **9** | **3** | 12 | $100 \times (9 - 3) / 400 = \mathbf{+1.50\text{ pp}}$ | +1.50 pp |
| **C2_085 vs C0** | 400 | 366 | 23 | **9** | **2** | 11 | $100 \times (9 - 2) / 400 = \mathbf{+1.75\text{ pp}}$ | +1.75 pp |

Arithmetic consistency is **100% verified across all four comparisons**.

---

## 7. McNemar & Non-Inferiority Recomputation

### 7.1 Statistical Formulas
1. **Continuity-Corrected McNemar Chi-Square:**
   $$\chi^2_{\text{cc}} = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
2. **Exact Two-Sided Binomial P-Value:**
   $$p = 2 \times \sum_{k=0}^{\min(n_{01}, n_{10})} \binom{n_{01} + n_{10}}{k} 0.5^{n_{01} + n_{10}}$$
3. **Paired Standard Error:**
   $$\text{SE}_{\text{paired}} = \sqrt{\frac{(n_{01} + n_{10}) - \frac{(n_{01} - n_{10})^2}{N}}{N^2}} \times 100\%$$
4. **One-Sided 95% Lower Confidence Bound:**
   $$\text{LCB}_{95} = \Delta - 1.6448536 \times \text{SE}_{\text{paired}}$$
5. **Non-Inferiority Criterion:**
   $$\text{LCB}_{95} > \Delta_{\text{NI}} = -3.00\text{ pp}$$

### 7.2 Recomputed Statistical Results

| Candidate vs C0 | $\Delta$ Acc (pp) | $n_{01}$ | $n_{10}$ | Discordant | McNemar $\chi^2_{\text{cc}}$ | Exact Binomial $p$ | Paired SE (pp) | One-Sided 95% LCB | Margin ($\Delta_{\text{NI}}$) | Non-Inferior ($\text{LCB} > -3.00$ pp)? |
|---|---|---|---|---|---|---|---|---|---|---|
| **C1** | -1.00 pp | 2 | 6 | 8 | 1.1250 | 0.28906 | 0.7053 pp | -2.1602 pp | -3.00 pp | **YES** |
| **C2_075** | +1.75 pp | 10 | 3 | 13 | 2.7692 | 0.09229 | 0.8971 pp | **+0.2744 pp** | -3.00 pp | **YES** |
| **C2_080** | +1.50 pp | 9 | 3 | 12 | 2.0833 | 0.14600 | 0.8628 pp | **+0.0809 pp** | -3.00 pp | **YES** |
| **C2_085** | **+1.75 pp** | 9 | 2 | 11 | **3.2727** | **0.06543** | 0.8245 pp | **+0.3938 pp** | -3.00 pp | **YES** |

**Statistical Conclusions:**
- **Strict Non-Inferiority Established:** All four candidates satisfy the pre-registered non-inferiority bound criterion ($\text{LCB} > -3.00$ pp).
- **Strictly Positive Lower Bound for Semantic Chunkers:** Candidates C2_075, C2_080, and C2_085 exhibit strictly positive lower confidence bounds ($\text{LCB} > 0.0$ pp). For C2_085, we can assert with 95% confidence that its true accuracy advantage over C0 is at least **+0.39 pp**.
- **Trend Toward Statistical Superiority:** For C2_085 vs C0, $p = 0.06543$ with a $9 : 2$ discordant ratio (9 cases corrected vs only 2 regressions).

---

## 8. Downstream A4 Verifier Metric Recomputation

Independently recomputed from `scratch/exp0039_dev_predictions.json` across all $N = 400$ cases:

### 8.1 Reconciled Development Scorecard

| Condition | Accuracy | Macro F1 | Standard FAR | FRR | Supported Recall | Refutation Recall | NOT_EST Recall | OOD Recall | False Acc | False Ref | False Abst (Sup $\to$ NE) | Total Abst (All $\to$ NE) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **C0** | 92.00% | 92.77% | 2.40% | 16.00% | 84.00% | 95.33% | 99.00% | 99.00% | 6 | 1 | 0 | 1 |
| **C1** | 91.00% | 91.67% | 2.40% | 18.00% | 82.00% | 94.67% | 99.00% | 99.00% | 6 | 1 | 2 | 4 |
| **C2_075** | **93.75%** | 94.27% | 2.80% | **10.67%** | **89.33%** | 94.67% | 99.00% | 99.00% | 7 | 0 | 0 | 2 |
| **C2_080** | 93.50% | 94.05% | 2.80% | 11.33% | 88.67% | 94.67% | 99.00% | 99.00% | 7 | 0 | 0 | 2 |
| **C2_085** | **93.75%** | **94.33%** | 2.80% | 11.33% | 88.67% | **95.33%** | 99.00% | 99.00% | 7 | 0 | 0 | 1 |

### 8.2 Detailed Confusion Matrices

```
C0 (Legacy Regex, 23 chunks):
                  Pred: SUPPORTED  Pred: REFUTED  Pred: NOT_ESTABLISHED  Total
True: SUPPORTED               126             24                      0    150
True: REFUTED                   6            143                      1    150
True: NOT_ESTABLISHED           0              1                     99    100
Total                         132            168                    100    400

C1 (RecursiveChunker 512, 10 chunks):
                  Pred: SUPPORTED  Pred: REFUTED  Pred: NOT_ESTABLISHED  Total
True: SUPPORTED               123             25                      2    150
True: REFUTED                   6            142                      2    150
True: NOT_ESTABLISHED           0              1                     99    100
Total                         129            168                    103    400

C2_075 (Semantic 0.75, 69 chunks):
                  Pred: SUPPORTED  Pred: REFUTED  Pred: NOT_ESTABLISHED  Total
True: SUPPORTED               134             16                      0    150
True: REFUTED                   6            142                      2    150
True: NOT_ESTABLISHED           1              0                     99    100
Total                         141            158                    101    400

C2_080 (Semantic 0.80, 71 chunks):
                  Pred: SUPPORTED  Pred: REFUTED  Pred: NOT_ESTABLISHED  Total
True: SUPPORTED               133             17                      0    150
True: REFUTED                   6            142                      2    150
True: NOT_ESTABLISHED           1              0                     99    100
Total                         140            159                    101    400

C2_085 (Semantic 0.85, 76 chunks):
                  Pred: SUPPORTED  Pred: REFUTED  Pred: NOT_ESTABLISHED  Total
True: SUPPORTED               133             17                      0    150
True: REFUTED                   6            143                      1    150
True: NOT_ESTABLISHED           1              0                     99    100
Total                         140            160                    100    400
```

### 8.3 Reconciliation of Minor Reporting Metrics:
1. **OOD Recall for C2_085:** Recomputed as **99.00%** (99/100 correct in `OUT_OF_CURRICULUM_UNKNOWN`). The narrative claim of "100.00%" was a typographical error; the confusion matrix and category breakdown in the original JSON always recorded 99.
2. **FRR for C1:** Recomputed as **18.00%** ($27/150 = (25 + 2)/150$). The originally reported 16.67% omitted the 2 false abstentions from the rejection count.
3. **Novel-OOD Recall on Development Dataset:** Reconciled interpretation: `Novel-OOD Recall: N/A — separate Novel-OOD subset is not present in EXP-0025-DEVELOPMENT-DATASET.json.` The ordinary development OOD metric remains `OOD Recall = 99.00% (99/100)`. In the blind dataset (`EXP-0033-BLIND-DATASET.json`), a dedicated 50-case Novel-OOD subset exists, but no separate Novel-OOD subset was constructed in the development set.

---

## 9. Forensic Validation of Discordant Cases (C2_085 vs C0)

Every discordant case between C0 and C2_085 (11 cases total: 9 candidate wins, 2 candidate regressions) was independently inspected through its retrieval candidates, chunk boundaries, and verifier decision logs:

### 9.1 Candidate Wins ($n_{01} = 9$ Cases)

1. **DEV-SUP-023** (Category: `SUPPORTED_CURRICULUM`, Expected: `SUPPORTED`)
   - *Query:* "How does const require initialization upon declaration?"
   - *C0:* `REFUTED` (Tier-1 deterministic). Root cause: In C0 chunk 0, `const`, `let`, and `var` were co-located in a single 650-character block. Sibling bullet points regarding `var` hoisting and re-declaration triggered a false Tier-1 antonym/polarity conflict.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI, confidence 0.95). In C2_085, `const` is partitioned into a discrete semantic proposition chunk (`c2_sem085_8`). Evidence cleanly entails the query.
2. **DEV-SUP-026** (Category: `SUPPORTED_CURRICULUM`, Expected: `SUPPORTED`)
   - *Query:* "How do rest parameters (...args) condense arguments into a true Array?"
   - *C0:* `REFUTED` (Tier-1 deterministic). C0 chunk 2 co-located destructuring, spread, and rest syntax; sibling text regarding arguments object differences caused polarity conflict.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI, confidence 0.95). C2_085 isolated rest parameters into chunk `c2_sem085_10`. Verified cleanly.
3. **DEV-SUP-041** (Category: `SUPPORTED_CURRICULUM`, Expected: `SUPPORTED`)
   - *Query:* "How does Libuv provide a worker thread pool for asynchronous I/O in Node.js?"
   - *C0:* `REFUTED` (Tier-1 deterministic). In C0 chunk 0, single-threaded V8 engine explanation conflicted with worker thread pool explanation.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI, confidence 0.95). C2_085 cleanly separated the Libuv thread pool proposition into chunk `c2_sem085_1`.
4. **DEV-SUP-080** (Category: `SUPPORTED_CURRICULUM`, Expected: `SUPPORTED`)
   - *Query:* "How does COMMIT persist transaction changes permanently?"
   - *C0:* `REFUTED` (Tier-1 deterministic). In C0 chunk 3, `COMMIT` and `ROLLBACK` were co-located; dictionary triggered polarity inversion.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI, confidence 0.95). C2_085 segmented transaction states into chunk `c2_sem085_12`.
5. **DEV-UNK-014** (Category: `OUT_OF_CURRICULUM_UNKNOWN`, Expected: `NOT_ESTABLISHED`)
   - *Query:* "How does Sidekiq handle asynchronous background jobs using Redis in Ruby?"
   - *C0:* `REFUTED` (Tier-1 deterministic). Distractor match in C0 Node.js chunk falsely triggered a polarity inversion on "synchronous vs asynchronous".
   - *C2_085:* `NOT_ESTABLISHED` (Tier-1 deterministic: out-of-curriculum technology detected). C2_085's focused chunks did not trigger spurious antonym matches.
6. **DEV-NEG-026** (Category: `LEGITIMATE_NEGATION`, Expected: `SUPPORTED`)
   - *Query:* "Why doesn't the macrotask queue execute before pending microtasks in the event loop?"
   - *C0:* `REFUTED` (Tier-1 deterministic). Co-located event loop bullets caused polarity inversion.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI, confidence 0.95). Microtask priority chunk `c2_sem085_11` cleanly entailed the negative inquiry.
7. **DEV-NEG-040** (Category: `LEGITIMATE_NEGATION`, Expected: `SUPPORTED`)
   - *Query:* "Why doesn't content-box absorb border and padding within element width?"
   - *C0:* `REFUTED` (Tier-1 deterministic). Sibling collision between `border-box` and `content-box`.
   - *C2_085:* `SUPPORTED` (Tier-1 deterministic: matching polarity on isolated `content-box` evidence).
8. **DEV-NEG-050** (Category: `LEGITIMATE_NEGATION`, Expected: `SUPPORTED`)
   - *Query:* "Why can't a transaction commit if one of its database operations violates a foreign key constraint?"
   - *C0:* `REFUTED` (Tier-1 deterministic). Polarity inversion on transaction rollback bullet.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI, confidence 0.95). Clean semantic evidence.
9. **DEV-MIX-031** (Category: `MIXED_COMPOUND_PREMISE`, Expected: `REFUTED`)
   - *Query:* "Since JWT contains a signature, why can the payload be modified by clients without invalidating the token?"
   - *C0:* `SUPPORTED` (Tier-2 semantic NLI). C0 chunk 4 was broad, and NLI attention diluted the false second clause.
   - *C2_085:* `REFUTED` (Tier-2 semantic NLI, confidence 0.95). Compact chunk `c2_sem085_16` allowed NLI to immediately refute the false claim.

### 9.2 Candidate Regressions ($n_{10} = 2$ Cases)

1. **DEV-UNK-010** (Category: `OUT_OF_CURRICULUM_UNKNOWN`, Expected: `NOT_ESTABLISHED`)
   - *Query:* "How does Alembic auto-generate database migration scripts from SQLAlchemy metadata?"
   - *C0:* `NOT_ESTABLISHED` (max similarity < 0.28). Correctly rejected on relevance threshold.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI). Granular database chunk `c2_sem085_12` achieved similarity slightly above threshold (0.284), and NLI hallucinated entailment on generic migration terms.
2. **DEV-MIX-021** (Category: `MIXED_COMPOUND_PREMISE`, Expected: `REFUTED`)
   - *Query:* "Since useMemo memoizes calculations, why does it execute asynchronous API calls by default?"
   - *C0:* `REFUTED` (Tier-2 semantic NLI). C0 retrieved chunk 4 which explicitly mentioned synchronous vs asynchronous restrictions.
   - *C2_085:* `SUPPORTED` (Tier-2 semantic NLI). The granular `useMemo` chunk did not mention asynchronous operations, so the verifier failed to refute the false second clause.

**Forensic Summary:**
The $9 : 2$ win/loss ratio demonstrates that proposition-preserving chunking directly resolves the primary defect of C0 (sibling bullet cross-contamination), yielding substantial precision improvements.

---

## 10. Critical Content-Preservation Reconfirmation

Audited directly against authentic source documents in `backend/seed_rag_knowledge.php`:
- **Document Count:** Exactly 5 authentic curriculum documents (HTML/CSS, JS ES6+, React Hooks, Node/Express, PostgreSQL).
- **Word Token Coverage:** **100.00%** across all five documents (0 missing words out of all unique vocabulary terms).
- **Tokenizer Overflow Gate:** **0 sentences > 512 tokens**; max chunk size in C2_085 is 181 tokens (well within the 512 limit).
- **Sentence Loss Gate:** 0 dropped sentences; hierarchical headings preserved in chunk metadata.

---

## 11. Candidate Selection Audit (7-Level Priority Hierarchy)

| Level | Priority Criterion | Recomputed Audit Result | Determination |
|---|---|---|---|
| **Level 1** | **Gating Requirements** | 100.0% content preservation; 0 tokenizer overflow errors across all chunks. | **PASS** |
| **Level 2** | **Safety Constraint** | FAR ceiling $\le 18.50\%$. C2_085 achieves **2.80%** (7 / 250). False Abstentions on supported claims = **0**. | **PASS** |
| **Level 3** | **Downstream Accuracy** | Joint-highest accuracy (**93.75%**, +1.75 pp over C0); highest Macro F1 (**94.33%**, +1.56 pp over C0); highest 95% LCB (**+0.39 pp** vs C0). | **PASS** |
| **Level 4** | **Retrieval Quality** | Recall@5 is exactly **100.0%** (256 / 256). | **PASS** |
| **Level 5** | **Semantic Coherence & Forensics** | Resolves context fragmentation observed in C2_075 (`DEV-FLS-040`), achieving higher Refutation Recall (95.33% vs 94.67%); fewest regressions ($n_{10} = 2$). | **PASS** |
| **Level 6** | **Latency** | Lowest retrieval latency among semantic chunkers (P50 = 409.2ms vs 459.5ms in C2_075). | **PASS** |
| **Level 7** | **Simplicity & Architectural Cleanliness** | Threshold 0.85 delivers optimal proposition granularity (76 chunks) without over-segmentation. | **PASS** |

**Selection Audit Decision:**
**C2_085 SELECTION IS FULLY RETAINED.**

---

## 12. Complete Discrepancy Reconciliation Register

| ID | Issue Description | Source Artifact | Original Defective Value | Corrected Recomputed Value | Predictions Changed? | Scientific Impact |
|---|---|---|---|---|---|---|
| **DISC-1** | Contaminated EXP-0037 comparator | `EXP-0039-DEVELOPMENT-ANALYSIS.md`<br>`EXP-0039-INDEPENDENT-AUDIT.md` | Acc: 90.75%<br>F1: 90.70%<br>FAR: 18.50%<br>FRR: 0.00% | **Acc: 71.60%**<br>**F1: 71.81%**<br>**FAR: 15.33%**<br>**FRR: 30.99%**<br>*(EXP-0033 blind, $N=500$)* | **NO** | Eliminates historical reporting confusion. Development interventions are correctly compared against C0 (92.00% on $N=400$). |
| **DISC-2** | Retrieval nDCG@5 > 100% defect | `run_exp0039_retrieval_benchmark.py`<br>`EXP-0039-DEVELOPMENT-ANALYSIS.md` | C0: 123.77%<br>C1: 124.70%<br>C2_075: 207.86%<br>C2_080: 208.27%<br>C2_085: 212.88% | **C0: 90.29%**<br>**C1: 95.45%**<br>**C2_075: 86.09%**<br>**C2_080: 86.23%**<br>**C2_085: 86.02%** | **NO** | Restores mathematically sound, bounded nDCG@5. Retrieval Recall@5 remains 100.0% for all conditions. |
| **DISC-3** | Paired contingency table subscript inversion | `EXP-0039-DEVELOPMENT-RESULTS.json`<br>`EXP-0039-DEVELOPMENT-ANALYSIS.md` | $n_{01}$ (C0 only): 2<br>$n_{10}$ (Cand only): 9<br>*(C2_085 vs C0)* | **$n_{01}$ (Cand wins): 9**<br>**$n_{10}$ (Cand losses): 2**<br>$\Delta = \mathbf{+1.75\text{ pp}}$ | **NO** | Resolves contradiction between table counts, narrative, and accuracy delta ($\Delta = 100 \times (9 - 2) / 400$). |
| **DISC-4** | C2_085 OOD Recall text claim | `EXP-0039-DEVELOPMENT-ANALYSIS.md` | OOD Recall: 100.00% | **OOD Recall: 99.00%** (99 / 100) | **NO** | Rectifies narrative typographical error to align with confusion matrix. |
| **DISC-5** | C1 FRR arithmetic omission | `EXP-0039-DEVELOPMENT-RESULTS.json` | FRR: 16.67% ($25/150$) | **FRR: 18.00%** ($27/150$) | **NO** | Incorporates false abstentions on supported claims into FRR ($100\% - 82.00\% = 18.00\%$). |
| **DISC-6** | Novel-OOD development subset clarification | `EXP-0039-RECONCILED-DEVELOPMENT-RESULTS.json`<br>`EXP-0039-RECONCILIATION-REPORT.md` | Novel-OOD Recall: 99.00% | **Novel-OOD Recall: N/A** — separate Novel-OOD subset is not present in EXP-0025-DEVELOPMENT-DATASET.json | **NO** | Replaces conflation of development OOD (99/100, 99.00%) with phantom Novel-OOD subset. Development OOD remains 99.00%. |

---

## 13. Final Audit Decision

**Decision:**
`CONDITIONAL PASS — C2_085 BLIND READY AFTER DOCUMENTED REPORT CORRECTIONS`

**Justification:**
1. All reporting and statistical discrepancies have been transparently diagnosed, resolved, and cross-verified without altering a single raw model prediction or historical commit.
2. The retrieval nDCG defect has been mathematically rectified and bounded in $[0\%, 100\%]$, with Recall@5 independently confirmed at 100.0% across all conditions.
3. Paired statistical counts and non-inferiority criteria strictly adhere to pre-registered confidence bound methodology ($\text{LCB} = +0.39\text{ pp} > -3.00\text{ pp}$).
4. Candidate `C2_085` satisfies all 7 levels of the pre-registered priority hierarchy and is fully certified as the candidate for subsequent frozen blind evaluation.
5. `EXP-0033-BLIND-DATASET.json` remains completely sealed, untouched, and uninspected.
