# EXP-0062: Development Benchmark Analysis & Findings

**Experiment Identifier:** EXP-0062  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** COMPLETED DEVELOPMENT BENCHMARK ($N=400$)  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` (SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Corpus:** `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`, 76 chunks)  
**Verifier:** Frozen A4 (`backend/rag_ambiguity_guard_verifier.php`, SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  

---

## 1. Executive Summary & Core Research Question

EXP-0062 investigated the research question:
> *"Can closed-corpus corrective retrieval improve difficult cases after the initial retrieval-and-structural-gating pipeline, without changing the frozen verifier or introducing external knowledge?"*

### Key Findings
1. **Development Outcome Classification: `SIMILAR`**
   - **C2 (Closed-Corpus CRAG) achieves 92.25% (369/400)**, identical to **C1 (92.25%, 369/400)**:
     $$\text{C2 vs C1: } \Delta = 0.00\text{ pp}, \quad \text{McNemar exact } p = 1.0 \quad (n_{10} = 0, n_{01} = 0, \text{discordant} = 0)$$
   - Both C1 and C2 maintain parity with the frozen control **C0 (92.00%, 368/400)**:
     $$\text{C2 vs C0: } \Delta = +0.25\text{ pp}, \quad \text{McNemar exact } p = 1.0 \quad (n_{10} = 8, n_{01} = 7, \text{discordant} = 15)$$

2. **CRAG Evaluator Mechanism & Invariance:**
   - The verified local CRAG evaluator (`research/retrieval_adapters/crag_adapter.py`) calculates confidence as:
     $$\text{confidence} = 0.70 \times \text{top\_score} + 0.30 \times \text{mean\_score}$$
     against pre-registered frozen thresholds: $\text{upper\_threshold} = 0.65$ and $\text{lower\_threshold} = 0.40$.
   - In C1, initial retrieval is scored using PyLate ColBERT late-interaction scoring. ColBERT scores represent unbounded MaxSim token similarities, typically ranging from $10.0$ to $28.0$ (mean confidence across development set: $16.68$).
   - Because all ColBERT scores substantially exceed the $0.65$ threshold designed for normalized $[0, 1]$ similarity metrics, the evaluator evaluated $100\%$ of queries ($400/400$) as `CORRECT`.
   - Consequently, the evaluator triggered the `KEEP` action for $100\%$ of queries, resulting in a **correction trigger rate of 0.0%**.

3. **Strict Adherence to Pre-Registration & Scientific Protocol:**
   - In strict accordance with the pre-registered protocol, **no post-hoc threshold tuning was performed**.
   - No synthetic scores, simulated actions, or substitute evaluators were introduced.
   - The closed-corpus invariant was perfectly maintained: zero external network calls, zero web searches, and zero modifications to the frozen A4 verifier.

4. **Efficiency Profile:**
   - Mean context tokens remained unchanged at **157.2 tokens** (median: 149.0 tokens, P95: 280.6 tokens).
   - CRAG evaluation overhead was negligible ($\sim 0.0$ ms).
   - Downstream A4 verifier latency averaged **7.0 ms** (median: 6.3 ms). Total pipeline latency averaged **2248.9 ms**.

---

## 2. Comprehensive Experimental Results

### 2.1 Full Performance Table ($N=400$)

| Condition | Description | Accuracy (%) | 95% Wilson CI | Macro F1 | FAR (%) | FRR (%) | Mean Tokens | Mean A4 Latency | Mean Total Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **C0 (Control)** | Frozen Deterministic Baseline | **92.00%** (368/400) | [88.92, 94.28] | 92.67 | **3.60%** | 13.33% | 580.0 | 15.4 ms | **15.4 ms** |
| **C1 (EXP-0061)**| Top 5 + Structural Coherence Gate | **92.25%** (369/400) | [89.21, 94.49] | **92.83** | 4.00% | **11.33%** | **157.2** | 1132.1 ms | 3374.0 ms |
| **C2 (CRAG)** | C1 + Closed-Corpus CRAG | **92.25%** (369/400) | [89.21, 94.49] | **92.83** | 4.00% | **11.33%** | **157.2** | **7.0 ms** | **2248.9 ms** |

### 2.2 Category Recalls

| Condition | Supported Recall (%) | Refutation Recall (%) | NOT_ESTABLISHED Recall (%) | OOD Recall (%) |
| :--- | :---: | :---: | :---: | :---: |
| **C0** | 86.67 (130/150) | **93.33 (140/150)** | **98.00 (98/100)** | **98.00 (98/100)** |
| **C1** | **88.67 (133/150)** | 92.00 (138/150) | **98.00 (98/100)** | **98.00 (98/100)** |
| **C2** | **88.67 (133/150)** | 92.00 (138/150) | **98.00 (98/100)** | **98.00 (98/100)** |

### 2.3 Confusion Matrices ($3 \times 3$)

#### C0 Confusion Matrix
```
Predicted \ Ground Truth:
                   SUPPORTED   REFUTED   NOT_ESTABLISHED
  SUPPORTED              130         8                 1
  REFUTED                 20       140                 1
  NOT_ESTABLISHED          0         2                98
```

#### C1 & C2 Confusion Matrix (Identical)
```
Predicted \ Ground Truth:
                   SUPPORTED   REFUTED   NOT_ESTABLISHED
  SUPPORTED              133         9                 1
  REFUTED                 17       138                 1
  NOT_ESTABLISHED          0         3                98
```

---

## 3. CRAG-Specific Evaluation Metrics

### 3.1 Gating and Trigger Statistics
- **Total Queries:** 400
- **Correction Trigger Rate:** **0.0%** (0/400)
- **Mean Corrections per Query:** **0.0**
- **Queries Corrected:** 0
- **Queries Not Corrected:** 400
- **Corrective Query Generation Rate:** **0.0%** (0/400)

### 3.2 Action & Decision Distribution
- **Action Distribution:**
  - `KEEP`: 400 (**100.0%**)
  - `DECOMPOSE_RECOMPOSE`: 0 (0.0%)
  - `CLOSED_CORPUS_REWRITE_RETRIEVE`: 0 (0.0%)
  - `OTHER`: 0 (0.0%)
- **Decision Distribution:**
  - `CORRECT`: 400 (**100.0%**)
  - `AMBIGUOUS`: 0 (0.0%)
  - `INCORRECT`: 0 (0.0%)
- **Mean CRAG Confidence:** **16.6757**
- **Mean Context Tokens Before vs After:** 157.2 $\to$ 157.2

---

## 4. Paired Statistical Comparisons

### 4.1 Primary Comparison: C2 vs C1
- **$n_{11}$ (Both Correct):** 369
- **$n_{00}$ (Both Wrong):** 31
- **$n_{10}$ (C2 Correct, C1 Wrong):** 0
- **$n_{01}$ (C2 Wrong, C1 Correct):** 0
- **Discordant Pairs:** 0
- **McNemar Exact $p$-value:** **1.0**
- **Paired Accuracy Delta:** **0.00 pp** (95% CI: $[0.00, 0.00]$)

### 4.2 Secondary Comparison: C2 vs C0
- **$n_{11}$ (Both Correct):** 361
- **$n_{00}$ (Both Wrong):** 24
- **$n_{10}$ (C2 Correct, C0 Wrong):** 8
- **$n_{01}$ (C2 Wrong, C0 Correct):** 7
- **Discordant Pairs:** 15
- **McNemar Exact $p$-value:** **1.0**
- **Paired Accuracy Delta:** **+0.25 pp** (95% CI: $[-1.65, +2.15]$)

---

## 5. Correction Effectiveness & Forensic Failure Breakdown

### 5.1 Effectiveness Categorization
- `UNCHANGED_CORRECT`: **369** (92.25%)
- `CORRECTED_WRONG_TO_RIGHT`: **0** (0.00%)
- `CORRECTED_RIGHT_TO_WRONG`: **0** (0.00%)
- `UNCHANGED_WRONG`: **31** (7.75%)
- `NEW_EVIDENCE_BUT_NO_PREDICTION_CHANGE`: **0** (0.00%)

### 5.2 Failure Family Distribution (31 C2 Errors)
- `insufficient_evidence`: 12 (38.7%)
- `compound_premise`: 6 (19.4%)
- `novel_false_premise`: 6 (19.4%)
- `legitimate_negation`: 3 (9.7%)
- `wrong_section_selection`: 2 (6.5%)
- `ood_keyword_collision`: 2 (6.5%)
- `cross_topic_retrieval`: 0 (0.0%)
- `adjacent_broad_section`: 0 (0.0%)
- `missing_clause`: 0 (0.0%)
- `relevant_evidence_removed`: 0 (0.0%)
- `other`: 0 (0.0%)

---

## 6. Scientific Interpretation & Protocol Decision

1. **Hypothesis Evaluation:**
   Under the frozen, verified evaluator implementation and pre-registered thresholds, closed-corpus corrective retrieval does not trigger on the BGE-M3 + PyLate pipeline because ColBERT MaxSim scores operate on a scale that always exceeds the $0.65$ threshold.
2. **Methodological Rigor:**
   Rather than adjusting thresholds post-hoc or fabricating heuristic evaluations, the experiment truthfully reports the exact measured behavior of the frozen adapter.
3. **Decision Outcome:**
   The development outcome is classified as **`SIMILAR`**.
