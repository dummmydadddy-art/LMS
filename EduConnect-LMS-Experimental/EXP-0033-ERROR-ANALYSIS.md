# EXP-0033: Comprehensive Error Analysis & Forensic Decomposition

**Experiment ID:** EXP-0033  
**Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$ blind cases)  
**Parent Baseline:** EXP-0031 E4  
**Date:** 2026-09-16  

---

## 1. Executive Summary

EXP-0033 investigated whether cross-encoder score calibration and evidence-gate adaptation recover downstream verifier accuracy lost during open-source retrieval integration in EXP-0032.

### The Major Breakthrough:
Platt Scaling (E5) achieved a **dramatic, statistically significant recovery over uncalibrated Mode R4 (E3)**:
- Downstream Accuracy jumped from **51.80% to 62.00%** ($+10.20$ percentage points, McNemar $\chi^2 = 30.12, p < 10^{-6}$).
- False Acceptance Rate (FAR) dropped from **57.28% to 38.97%** ($-18.31$ percentage points).
- Supported Recall jumped from **42.72% to 61.03%** ($+18.31$ percentage points).
- False Abstentions plummeted from **98 down to 55** (**43 false abstentions permanently eliminated**).

### The Remaining Boundary:
Despite this recovery, Platt-calibrated R4 (E5: 62.00%) **did not surpass baseline R0 (E0: 69.60%)** ($n_{01} = 13, n_{10} = 51, \chi^2 = 21.39, p = 0.000002$). Forensic decomposition reveals that this is caused by an **upstream domain gap in MS-MARCO cross-encoder pre-training**, which assigns severe negative logits ($-9.0$ to $-11.5$) to certain in-curriculum concepts that lack lexical overlap with the query.

---

## 2. Quantitative Error Breakdown by Experimental Mode

| Mode | Accuracy | Macro F1 | FAR | FRR | Sup. Recall | Ref. Recall | NE Recall | False Abstentions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E0 (Baseline R0)** | **69.60%** | **68.58%** | **23.00%** | 14.55% | **77.00%** | **56.79%** | 73.60% | **18** |
| **E1 (Raw Logit)** | 48.20% | 46.45% | 62.44% | 10.33% | 37.56% | 24.69% | 96.80% | 111 |
| **E3 (Raw Sigmoid R4)** | 51.80% | 50.73% | 57.28% | 11.27% | 42.72% | 30.86% | 94.40% | 98 |
| **E4 (Temp Scaling)** | 56.00% | 55.16% | 51.17% | 12.21% | 48.83% | 36.42% | 93.60% | 83 |
| **E2 (Min-Max)** | 60.80% | 60.07% | 41.31% | 13.15% | 58.69% | 43.83% | 86.40% | 60 |
| **E5 (Platt Scaling)** | **62.00%** | **61.38%** | **38.97%** | 13.15% | **61.03%** | **48.15%** | 81.60% | **55** |
| **E6 (Platt + Gate 0.35)** | **62.00%** | **61.47%** | **40.85%** | 13.15% | **59.15%** | **48.15%** | 84.80% | **59** |

---

## 3. Forensic Analysis: Rescued Cases ($E3 \to E5$, $N = 67$)

In 67 test queries, Platt calibration successfully overturned false predictions produced by uncalibrated Mode R4 (E3). 

### Breakdown of Rescued Cases:
- **SUPPORTED:** 23 cases rescued (queries previously starved at Stage 3 due to logits between $-3.5$ and $-1.0$).
- **FALSE_PREMISE:** 23 cases rescued (evidence now passes the gate into Tier-1 opposite dictionaries or Tier-2 NLI).
- **ADVERSARIAL:** 13 cases rescued.
- **PARAPHRASE:** 8 cases rescued.

### Representative Rescued Query Archetypes:
1. **`EXP33-SUP-0005`** (*"Does justify-content: space-between distribute remaining space evenly between flex children?"*):
   - Raw MiniLM logit: $-1.825$
   - Standard Sigmoid (E3): $0.1388 < 0.28 \implies$ **FALSE ABSTENTION (`NOT_ESTABLISHED`)**.
   - Platt Scaled (E5): $\sigma(0.6236 \cdot (-1.825) + 3.2801) = 0.8949 \ge 0.28 \implies$ **CORRECTLY SUPPORTED**.
2. **`EXP33-FLS-0028`** (*"Why does Promise.all resolve successfully if one of its member promises encounters a rejection?"*):
   - Raw MiniLM logit: $-2.114$
   - Standard Sigmoid (E3): $0.1077 < 0.28 \implies$ **FALSE ABSTENTION (`NOT_ESTABLISHED`)**.
   - Platt Scaled (E5): $0.8767 \ge 0.28 \implies$ Reaches Tier-1 opposite dictionary $\implies$ **CORRECTLY REFUTED**.
3. **`EXP33-PAR-0023`** (*"Does useMemo keep the result of a computationally expensive operation cached until one of its dependencies changes?"*):
   - Raw MiniLM logit: $-2.450$
   - Standard Sigmoid (E3): $0.0794 < 0.28 \implies$ **FALSE ABSTENTION**.
   - Platt Scaled (E5): $0.8522 \ge 0.28 \implies$ **CORRECTLY SUPPORTED**.

---

## 4. Forensic Analysis: Regression Breakdown ($E0 \to E5$, $n_{10} = 51$)

There are 51 cases where baseline R0 succeeded but Platt-calibrated R4 failed.

### Error Decomposition:
- `SUPPORTED -> NOT_ESTABLISHED`: **34 cases** (66.7%)
- `REFUTED -> NOT_ESTABLISHED`: **15 cases** (29.4%)
- `NOT_ESTABLISHED -> REFUTED`: **2 cases** (3.9%)

### Root Cause Analysis of the 49 False Abstentions:
1. **The MS-MARCO Domain Over-Penalty (44 / 51 cases, 86.3%):**
   - In 44 of these cases, MiniLM assigned an extreme negative logit ($x \le -7.50$).
   - Because $0.6236 \cdot (-7.50) + 3.2801 = -1.3969 \implies \sigma(-1.3969) = 0.1983 < 0.28$, these queries were rejected at the evidence gate.
   - Example 1: `EXP33-SUP-0020` (*"Does em unit compute dimensions relative to the font size of the immediate parent?"*)
     - R0 nomic embedding matched the chunk with cosine similarity **0.5021** (passed gate, correctly verified).
     - R4 MiniLM gave `raw_logit = -11.329` (calibrated similarity: **0.0222**). MiniLM failed to recognize semantic relevance due to the lack of exact token overlap.
   - Example 2: `EXP33-SUP-0010` (*"Does position: relative keep the element in the normal flow while allowing offset via top and left?"*)
     - R0 cosine similarity: **0.5777** (passed gate).
     - R4 MiniLM logit: **-9.135** (calibrated similarity: **0.0819**).
2. **Upstream Candidate Retrieval Miss (7 / 51 cases, 13.7%):**
   - In 7 cases, BGE-small-en-v1.5 dense retrieval did not include the gold chunk in the top-10 candidate pool sent to MiniLM, preventing the reranker from seeing the correct evidence.

---

## 5. Category-Specific Accuracies Across Key Modes

| Category | $N$ | E0 (Baseline R0) | E3 (Raw Sigmoid) | E5 (Platt Scaling) | E6 (Platt + Gate 0.35) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SUPPORTED** | 125 | **72.80%** | 38.40% | **56.80%** | 55.20% |
| **FALSE_PREMISE** | 125 | **55.20%** | 28.80% | **47.20%** | 47.20% |
| **AMBIGUOUS** | 75 | 61.33% | **92.00%** | 73.33% | 78.67% |
| **OOD (All)** | 50 | 92.00% | **98.00%** | 94.00% | 94.00% |
| *— KNOWN_OOD* | 25 | 96.00% | 96.00% | 96.00% | 96.00% |
| *— NOVEL_OOD* | 25 | 88.00% | **100.00%** | **92.00%** | **92.00%** |
| **PARAPHRASE** | 50 | **84.00%** | 52.00% | 68.00% | 68.00% |
| **ADVERSARIAL** | 75 | **72.00%** | 41.33% | 58.67% | 56.00% |

### Strategic Insights:
- **Novel-OOD Protection:** Platt-calibrated R4 (E5) preserves superior Novel-OOD rejection (**92.00%**) compared to baseline R0 (**88.00%**), while uncalibrated R4 achieved 100% only through pathological over-abstention.
- **Ambiguity Shielding:** Ambiguity accuracy in E5 is **73.33%** (and **78.67%** in E6), significantly higher than R0 (**61.33%**).

---

## 6. Actionable Scientific Takeaway

Score calibration successfully recovers $10.2\%$ accuracy and cures $43$ false abstentions without any prompt modifications or code heuristics. However, the remaining gap to R0 cannot be bridged by threshold tuning alone because MiniLM's out-of-the-box weights assign negative logits to certain conceptual descriptions.

To achieve downstream parity with R0, future research must implement:
1. **Score Ensemble / Hybrid Blending:** Combine calibrated cross-encoder probabilities with normalized dense cosine similarities (e.g., $S = \alpha S_{\text{dense}} + (1-\alpha) P_{\text{Platt}}$) so that dense representations protect conceptual queries while cross-encoders filter distractors and OOD queries.
2. **Upstream Pool Expansion:** Expand candidate pool from 10 to 15 to eliminate the 13.7% candidate miss rate.
