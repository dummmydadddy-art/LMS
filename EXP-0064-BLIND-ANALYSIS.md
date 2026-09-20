# EXP-0064: Sealed Blind Validation Analysis & Findings

**Experiment Identifier:** EXP-0064  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** COMPLETE — SEALED BLIND EVALUATION ($N=500$)  
**Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N=500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`)  
**Frozen A4 Verifier:** `backend/rag_ambiguity_guard_verifier.php` (SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  
**Candidate Evaluated:** B2 (Text + Visual Fusion: BGE-M3 + PyLate + ColSmol-256M + RRF $k=60$ + Structural Coherence Gate + Frozen A4)  
**Historical Comparators:**
- B0: Established Frozen Control (`EXP-0061-BLIND-PREDICTIONS.json`, 72.80%, 364/500)
- B1: Historical EXP-0061 Text Pipeline (`EXP-0061-BLIND-PREDICTIONS.json`, 72.80%, 364/500)

---

## 1. Executive Summary & Research Question

EXP-0064 investigated whether adding a visual-document retrieval modality (`vidore/colsmol-256m`) and fusing it with dense+sparse text retrieval via Reciprocal Rank Fusion ($k=60$) improves downstream verification accuracy on sealed blind data.

### Key Blind Results
1. **Primary Comparison (B2 vs B1):**
   - Candidate B2 achieved **73.00% blind accuracy** (365/500, 95% Wilson CI: $[68.94\%, 76.71\%]$).
   - Historical text-only baseline B1 achieved **72.80% blind accuracy** (364/500, 95% Wilson CI: $[68.74\%, 76.52\%]$).
   - Paired accuracy difference: $\Delta = +0.20$ percentage points (95% CI: $[-0.84, +1.24]$).
   - Discordant pairs: 7 out of 500 (B2 correct / B1 wrong: 4; B2 wrong / B1 correct: 3).
   - McNemar exact two-sided $p$-value: **$p = 1.000000$**.
   - Scientific Classification: **SIMILAR**. Text+visual evidence fusion does not statistically improve or degrade downstream accuracy relative to the reference text pipeline on blind data.
2. **Secondary Comparison (B2 vs B0):**
   - $\Delta = +0.20$ percentage points (95% CI: $[-2.86, +3.26]$).
   - Discordant pairs: 61 ($n_{10} = 31, n_{01} = 30$).
   - McNemar exact two-sided $p$-value: **$p = 1.000000$**.
   - Scientific Classification: **SIMILAR**.
3. **Modality Complementarity on Blind Data:**
   - **493 queries (98.6%)** had identical predictions between B1 and B2.
   - **4 queries (0.8%)** were recovered by visual fusion (B2 correct, B1 wrong).
   - **3 queries (0.6%)** were harmed by visual fusion (B2 wrong, B1 correct).
   - Net gain: $+1$ query (+0.20 pp).
4. **Efficiency & Overhead:**
   - Visual retrieval added an incremental latency of **80.56 ms** per query (~2.0% of total latency).
   - Total pipeline latency averaged 3930.95 ms (P95: 5649.80 ms).
   - Peak RAM: 12.1 GB; Peak VRAM: 0.0 MB (CPU execution).

---

## 2. Comprehensive Blind Results Table ($N=500$)

| Metric | B0: Frozen Control | B1: EXP-0061 Reference Text | B2: EXP-0064 Text+Visual Fusion |
|---|:---:|:---:|:---:|
| **Downstream Accuracy** | **72.80%** (364/500) | **72.80%** (364/500) | **73.00%** (365/500) |
| **95% Wilson CI** | [68.74%, 76.52%] | [68.74%, 76.52%] | [68.94%, 76.71%] |
| **Macro F1** | 73.04% | 73.00% | 73.22% |
| **False Acceptance Rate (FAR)** | 16.03% (46/287) | 17.07% (49/287) | 17.42% (50/287) |
| **False Rejection Rate (FRR)** | 27.23% (58/213) | 27.23% (58/213) | 26.76% (57/213) |
| **Supported Recall** | 72.77% (155/213) | 72.77% (155/213) | 73.24% (156/213) |
| **Refutation Recall** | 68.52% (111/162) | 70.99% (115/162) | 70.37% (114/162) |
| **NOT_ESTABLISHED Recall** | 78.40% (98/125) | 75.20% (94/125) | 76.00% (95/125) |
| **OOD Recall / Accuracy** | 96.00% (48/50) | 92.00% (46/50) | 92.00% (46/50) |
| **Mean Retrieval Latency** | 12.8 ms | 2215.6 ms | 2292.0 ms |
| **Mean Total Latency** | 1650.4 ms | 3850.4 ms | 3931.0 ms |

---

## 3. Blind Category Breakdown ($N=500$)

| Category | $N$ | B0 (Control) | B1 (Text Ref) | B2 (Fusion) |
|---|:---:|:---:|:---:|:---:|
| `SUPPORTED` | 125 | 72.8% (91/125) | 73.6% (92/125) | 73.6% (92/125) |
| `FALSE_PREMISE` | 125 | 69.6% (87/125) | 72.0% (90/125) | 72.0% (90/125) |
| `AMBIGUOUS` | 75 | 66.7% (50/75) | 64.0% (48/75) | **65.3%** (49/75) |
| `OOD` | 50 | 96.0% (48/50) | 92.0% (46/50) | 92.0% (46/50) |
| `PARAPHRASE` | 50 | 76.0% (38/50) | 76.0% (38/50) | 76.0% (38/50) |
| `ADVERSARIAL` | 75 | 66.7% (50/75) | 66.7% (50/75) | 66.7% (50/75) |

---

## 4. Paired Statistical Hypotheses & Contingency Matrices

### 4.1 Primary Hypothesis: B2 (Fusion) vs B1 (Text Reference)
- **Accuracy Difference:** $+0.20$ pp (95% CI: $[-0.84, +1.24]$)
- **Contingency Matrix ($2 \times 2$):**
  - Both Correct ($n_{11}$): 361
  - Both Incorrect ($n_{00}$): 132
  - B2 Correct / B1 Incorrect ($n_{10}$): 4
  - B2 Incorrect / B1 Correct ($n_{01}$): 3
- **Discordant Pairs ($b+c$):** 7
- **McNemar Exact Two-Sided $p$-value:** $1.000000$
- **Decision Outcome:** **SIMILAR**
- **Conclusion:** Text+visual fusion does not significantly improve or degrade the validated text pipeline on blind data. Performance is statistically indistinguishable from the text reference B1.

---

### 4.2 Secondary Hypothesis: B2 (Fusion) vs B0 (Frozen Control)
- **Accuracy Difference:** $+0.20$ pp (95% CI: $[-2.86, +3.26]$)
- **Contingency Matrix ($2 \times 2$):**
  - Both Correct ($n_{11}$): 334
  - Both Incorrect ($n_{00}$): 105
  - B2 Correct / B0 Incorrect ($n_{10}$): 31
  - B2 Incorrect / B0 Correct ($n_{01}$): 30
- **Discordant Pairs ($b+c$):** 61
- **McNemar Exact Two-Sided $p$-value:** $1.000000$
- **Decision Outcome:** **SIMILAR**
- **Conclusion:** Performance is statistically indistinguishable from the established frozen control B0.

---

### 4.3 Reference Comparison: B1 vs B0
- **Accuracy Difference:** $+0.00$ pp (95% CI: $[-3.05, +3.05]$)
- **Contingency Matrix:** $n_{11} = 334, n_{00} = 106, n_{10} = 30, n_{01} = 30$
- **McNemar Exact Two-Sided $p$-value:** $1.000000$
- **Decision Outcome:** **SIMILAR**

---

## 5. Visual Complementarity & Discordant Query Audit

Comparing B2 and B1 across all 500 blind queries revealed exactly 7 discordant cases (1.4% of queries):

### 5.1 Cases Where Visual Fusion Recovered Text Failures (4 Queries)
1. `EXP33-FLS-0113`: *"Why does Second Normal Form (2NF) mandate partial dependencies on candidate keys?"*
   - Expected: `REFUTED`
   - B1: `SUPPORTED` (False Acceptance) | B2: `REFUTED` (Correct)
   - Mechanism: Visual retrieval of Page 21 ("Database Normalization Forms") provided the complete definition of 2NF (which eliminates partial dependencies), enabling Tier-1 antonym resolution that text chunks missed.
2. `EXP33-FLS-0116`: *"How does a LEFT JOIN drop rows from the left table if they lack corresponding right table matches?"*
   - Expected: `REFUTED`
   - B1: `SUPPORTED` (False Acceptance) | B2: `REFUTED` (Correct)
   - Mechanism: Visual retrieval brought in Page 20 ("Relational Database Modeling"), preserving the explicit SQL JOIN rule that all left table rows are retained.
3. `EXP33-AMB-0069`: *"When is it appropriate to bypass React state entirely and use direct DOM manipulation?"*
   - Expected: `NOT_ESTABLISHED`
   - B1: `REFUTED` (False Refutation) | B2: `NOT_ESTABLISHED` (Correct)
   - Mechanism: Fusion of Page 10 ("useState Hook") diluted false keyword collisions, preventing an erroneous contradiction claim.
4. `EXP33-ADV-0005`: *"Why is HTTP DELETE considered idempotent even if the second identical call returns a 404 status code?"*
   - Expected: `SUPPORTED`
   - B1: `REFUTED` (False Rejection) | B2: `SUPPORTED` (Correct)
   - Mechanism: Visual retrieval of Page 18 ("RESTful API Design Principles") included the complete HTTP idempotency definition (idempotency refers to side-effects on the server state, not the response status code), resolving the adversarial trap.

### 5.2 Cases Where Visual Fusion Harmed Text Successes (3 Queries)
1. `EXP33-FLS-0003`: *"Why does box-sizing: content-box include border and padding inside the declared element width?"*
   - Expected: `REFUTED`
   - B1: `REFUTED` (Correct) | B2: `SUPPORTED` (False Acceptance)
   - Mechanism: Visual page inclusion for Page 2 brought full CSS box model text that diluted the strict `border-box` vs `content-box` boundary.
2. `EXP33-FLS-0030`: *"Why does an async function return undefined rather than wrapping its return value in a Promise?"*
   - Expected: `REFUTED`
   - B1: `REFUTED` (Correct) | B2: `SUPPORTED` (False Acceptance)
   - Mechanism: Page 8 text containing multiple async/await examples caused Tier-2 NLI to misattribute a snippet and accept the premise.
3. `EXP33-ADV-0044`: *"Why does box-sizing: content-box include border and padding inside the declared CSS width property?"*
   - Expected: `REFUTED`
   - B1: `REFUTED` (Correct) | B2: `SUPPORTED` (False Acceptance)
   - Mechanism: Re-occurrence of the box model whole-page dilution effect.

---

## 6. Out-of-Distribution (OOD) Analysis

| Condition | Total OOD | Correct | Accuracy | False Acceptances | False Refutations | False Abstentions |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **B0 (Control)** | 50 | 48 | **96.0%** | 0 | 2 | 0 |
| **B1 (Text Ref)** | 50 | 46 | **92.0%** | 0 | 4 | 0 |
| **B2 (Fusion)** | 50 | 46 | **92.0%** | 0 | 4 | 0 |

- **Zero False Acceptances:** Neither text nor visual fusion accepted any OOD queries as supported.
- **Safety Invariant:** Visual evidence fusion did not compromise the system's boundary detection or out-of-curriculum guardrails.

---

## 7. Efficiency & Resource Profiling

| Stage | Mean Latency | Median Latency | P95 Latency |
|---|:---:|:---:|:---:|
| Text Retrieval (BGE-M3 + PyLate) | 2215.60 ms | 2213.05 ms | 2440.45 ms |
| Visual Retrieval (ColSmol-256M) | 76.31 ms | 74.77 ms | 87.57 ms |
| Reciprocal Rank Fusion ($k=60$) | 0.07 ms | 0.00 ms | 0.99 ms |
| Structural Coherence Gate | 0.04 ms | 0.00 ms | 0.00 ms |
| Downstream A4 Verifier | 1638.93 ms | 1774.55 ms | 3440.90 ms |
| **Total Pipeline (B2)** | **3930.95 ms** | **4059.25 ms** | **5649.80 ms** |

- **Incremental Visual Cost:** $+80.56$ ms relative to B1 (~2.0% overhead).
- **Peak Host RAM:** 12,089.8 MB (~12.1 GB).
- **Peak VRAM:** 0.0 MB (CPU execution via float32).

---

## 8. Final Scientific Verdict & Guidance

1. **Blind Outcome vs B1:** **SIMILAR** ($\Delta = +0.20$ pp, McNemar exact $p = 1.0$).
2. **Blind Outcome vs B0:** **SIMILAR** ($\Delta = +0.20$ pp, McNemar exact $p = 1.0$).
3. **Scientific Implication:**
   - Visual document retrieval over rendered PDF pages can be seamlessly integrated with dense+sparse text retrieval without compromising downstream accuracy or latency.
   - However, text+visual evidence fusion does **not** provide a statistically significant improvement over the reference text pipeline on blind data.
   - Whole-page visual retrieval introduces a trade-off: it helps resolve complex architectural queries (where holistic page context is beneficial), but can dilute fine-grained syntactic boundaries (e.g., CSS box-sizing properties).
