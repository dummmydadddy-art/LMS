# EXP-0064: Development-Set Analysis & Findings

**Experiment Identifier:** EXP-0064  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** COMPLETED DEVELOPMENT BENCHMARK ($N=400$)  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Frozen A4 Verifier:** `backend/rag_ambiguity_guard_verifier.php` (SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  

---

## 1. Executive Summary & Research Question

EXP-0064 investigated the primary research question:
> *"Can a visual-document retrieval modality recover useful page-level evidence that text retrieval misses, and does text+visual evidence fusion improve the validated EXP-0061 pipeline?"*

### Key Findings
1. **Visual-Only Retrieval (C2):** Standalone visual multi-vector retrieval using `vidore/colsmol-256m` over rendered PDF pages achieved **88.50% downstream accuracy** (354/400). While demonstrating impressive visual understanding without OCR or text embeddings, it **statistically degraded** downstream verifier accuracy compared to the reference text pipeline C1 (92.50%, $\Delta = -4.00$ pp, McNemar $p = 0.005223$).
2. **Text + Visual Fusion (C3):** Fusing C1 text candidates and C2 visual candidates via Reciprocal Rank Fusion ($k=60$, equal weights $0.5/0.5$) achieved **92.25% downstream accuracy** (369/400). This result is **statistically indistinguishable** from the reference text pipeline C1 (92.50%, $\Delta = -0.25$ pp, 95% CI $[-1.10, +0.60]$, McNemar $p = 1.0$) and the frozen control C0 (92.00%, $\Delta = +0.25$ pp, 95% CI $[-1.89, +2.39]$, McNemar $p = 1.0$).
3. **Genuine Modality Complementarity:** Visual retrieval demonstrated genuine orthogonal signal:
   - **7 queries** were correctly verified under visual retrieval (C2) where text retrieval (C1) failed.
   - **23 queries** were correctly verified under text retrieval (C1) where visual retrieval (C2) failed.
   - Standalone visual retrieval achieved exceptional Out-of-Distribution (OOD) rejection: **99.00%** (99/100 correct, 0 false acceptances).
4. **Primary Cause of Standalone Degradation:** The downstream gap between C2 (88.50%) and C1 (92.50%) is driven primarily by **granularity mismatch** rather than retrieval failure. ColSmol retrieves at the whole-page level (~500–1000 tokens), whereas C1 operates on fine-grained 85-token semantic chunks. When entire page contexts are presented to the A4 verifier, evidence dilution and sibling-topic interference increase the False Acceptance Rate (FAR: 8.00% in C2 vs 4.00% in C1) and reduce Refutation Recall (84.00% in C2 vs 92.00% in C1).

---

## 2. Benchmark Results Summary ($N=400$)

| Metric | C0: Frozen Control | C1: EXP-0061 Reference | C2: Visual-Only (ColSmol) | C3: Text+Visual Fusion |
|---|:---:|:---:|:---:|:---:|
| **Downstream Accuracy** | **92.00%** (368/400) | **92.50%** (370/400) | **88.50%** (354/400) | **92.25%** (369/400) |
| **95% Wilson CI** | [88.92%, 94.28%] | [89.50%, 94.70%] | [85.00%, 91.27%] | [89.21%, 94.49%] |
| **Macro F1** | 92.67% | 93.05% | 89.34% | 92.83% |
| **False Acceptance Rate (FAR)** | 3.60% (9/250) | 4.00% (10/250) | 8.00% (20/250) | 4.00% (10/250) |
| **False Rejection Rate (FRR)** | 13.33% (20/150) | 10.67% (16/150) | 12.67% (19/150) | 11.33% (17/150) |
| **Supported Recall** | 86.67% (130/150) | 89.33% (134/150) | 86.00% (129/150) | 88.67% (133/150) |
| **Refutation Recall** | 93.33% (140/150) | 92.00% (138/150) | 84.00% (126/150) | 92.00% (138/150) |
| **OOD Recall / Accuracy** | 98.00% (98/100) | 98.00% (98/100) | **99.00%** (99/100) | 98.00% (98/100) |
| **Mean Retrieval Latency** | 12.4 ms | 15.6 ms | 76.0 ms | 91.6 ms |

---

## 3. Category Breakdown ($N=400$)

| Category | $N$ | C0 | C1 | C2 | C3 |
|---|:---:|:---:|:---:|:---:|:---:|
| `SUPPORTED_CURRICULUM` | 100 | 84.0% (84/100) | 87.0% (87/100) | 86.0% (86/100) | 86.0% (86/100) |
| `NOVEL_FALSE_PREMISE` | 100 | 94.0% (94/100) | 94.0% (94/100) | 86.0% (86/100) | 94.0% (94/100) |
| `OUT_OF_CURRICULUM_UNKNOWN` | 100 | 98.0% (98/100) | 98.0% (98/100) | **99.0%** (99/100) | 98.0% (98/100) |
| `LEGITIMATE_NEGATION` | 50 | 92.0% (46/50) | 94.0% (47/50) | 86.0% (43/50) | 94.0% (47/50) |
| `MIXED_COMPOUND_PREMISE` | 50 | 92.0% (46/50) | 88.0% (44/50) | 80.0% (40/50) | 88.0% (44/50) |

---

## 4. Paired Statistical Comparisons

### 4.1 Primary Hypothesis: C3 (Fusion) vs C1 (Text Reference)
- **Accuracy Difference:** $-0.25$ pp (95% CI: $[-1.10, +0.60]$)
- **Contingency Matrix:**
  - Both Correct ($n_{11}$): 368
  - Both Incorrect ($n_{00}$): 29
  - C3 Correct / C1 Incorrect ($n_{10}$): 1
  - C3 Incorrect / C1 Correct ($n_{01}$): 2
- **Discordant Pairs ($b+c$):** 3
- **McNemar Exact Two-Sided $p$-value:** $1.000000$
- **Decision Outcome:** **SIMILAR**
- **Conclusion:** Text+visual fusion does not significantly outperform or degrade the reference text pipeline. Development-set accuracy was statistically indistinguishable from the reference text pipeline C1.

#### Discordant Cases (C3 vs C1):
1. `DEV-SUP-023` ("How does const require initialization upon declaration?"): C3=REFUTED, C1=SUPPORTED. Fused candidate included full page text containing other variable declaration nuances that triggered false refutation.
2. `DEV-FLS-001` ("Why does box-sizing: content-box include padding and border inside the declared width?"): C3=SUPPORTED, C1=REFUTED. Visual page inclusion diluted the specific box-sizing boundary rule.
3. `DEV-FLS-065` ("Why does Second Normal Form (2NF) permit partial functional dependencies on primary keys?"): C3=REFUTED, C1=SUPPORTED. Here, visual page inclusion recovered the necessary tabular normalization context, enabling correct refutation!

---

### 4.2 Secondary Hypothesis: C2 (Visual-Only) vs C1 (Text Reference)
- **Accuracy Difference:** $-4.00$ pp (95% CI: $[-6.66, -1.34]$)
- **Contingency Matrix:**
  - Both Correct ($n_{11}$): 347
  - Both Incorrect ($n_{00}$): 23
  - C2 Correct / C1 Incorrect ($n_{10}$): 7
  - C2 Incorrect / C1 Correct ($n_{01}$): 23
- **Discordant Pairs ($b+c$):** 30
- **McNemar Exact Two-Sided $p$-value:** $0.005223$ ($p < 0.01$)
- **Decision Outcome:** **DEGRADES**
- **Conclusion:** Standalone visual-only retrieval alone is significantly inferior to text retrieval downstream ($\Delta = -4.00$ pp, $p = 0.0052$).

---

### 4.3 Secondary Hypothesis: C3 (Fusion) vs C0 (Frozen Control)
- **Accuracy Difference:** $+0.25$ pp (95% CI: $[-1.89, +2.39]$)
- **Contingency Matrix:**
  - Both Correct ($n_{11}$): 359
  - Both Incorrect ($n_{00}$): 22
  - C3 Correct / C0 Incorrect ($n_{10}$): 10
  - C3 Incorrect / C0 Correct ($n_{01}$): 9
- **Discordant Pairs ($b+c$):** 19
- **McNemar Exact Two-Sided $p$-value:** $1.000000$
- **Decision Outcome:** **SIMILAR**
- **Conclusion:** Development-set accuracy was statistically indistinguishable from the frozen C0 control.

---

### 4.4 Secondary Hypothesis: C2 (Visual-Only) vs C0 (Frozen Control)
- **Accuracy Difference:** $-3.50$ pp (95% CI: $[-6.16, -0.84]$)
- **Contingency Matrix:**
  - Both Correct ($n_{11}$): 346
  - Both Incorrect ($n_{00}$): 24
  - C2 Correct / C0 Incorrect ($n_{10}$): 8
  - C2 Incorrect / C0 Correct ($n_{01}$): 22
- **Discordant Pairs ($b+c$):** 30
- **McNemar Exact Two-Sided $p$-value:** $0.016125$ ($p < 0.05$)
- **Decision Outcome:** **DEGRADES**

---

## 5. Text vs Visual Complementarity Analysis

The 30 discordant queries between C1 and C2 reveal meaningful qualitative trade-offs between modalities:

```
Total Queries: 400
├── Both Correct: 347 (86.75%)
├── Both Wrong:    23  (5.75%)
└── Discordant:    30  (7.50%)
    ├── Visual Recovers Text Failure (C2 correct, C1 wrong):  7 queries (1.75%)
    └── Text Recovers Visual Failure (C1 correct, C2 wrong): 23 queries (5.75%)
```

### 5.1 Queries where Visual Recovers Text Failures (7 Cases)
Visual retrieval succeeded where text retrieval failed on queries involving architectural concepts and definitions where page-level visual layout provides holistic context:
1. `DEV-SUP-036`: "How do default parameter values operate in JavaScript ES6 functions?"
2. `DEV-SUP-055`: "What is the significance of HTTP 403 Forbidden status code?"
3. `DEV-SUP-099`: "Why does direct state mutation fail to trigger component re-renders in React?"
4. `DEV-FLS-077`: "Why does COMMIT roll back changes made by preceding SQL statements in a transaction?"
5. `DEV-UNK-010`: "How does Alembic auto-generate database migration scripts from SQLAlchemy metadata?"
6. `DEV-UNK-029`: "How does Android handle lifecycle events in ViewModel during configuration changes?"
7. `DEV-NEG-026`: "Why doesn't the macrotask queue execute before pending microtasks in the event loop?"

In cases like `DEV-UNK-010` and `DEV-UNK-029`, visual multi-vector scoring across the entire page correctly recognized that the visual page contained no relevant technical schema, whereas text chunking had minor keyword overlaps causing false acceptance.

### 5.2 Queries where Text Recovers Visual Failures (23 Cases)
Text retrieval succeeded over visual retrieval on queries requiring fine-grained phrase matching or specific negated clauses:
- `DEV-FLS-011`: Semantic HTML tag nesting (`<footer>` inside `<header>`). The whole page contained both tags, leading the verifier to misread the relationship.
- `DEV-FLS-024`: TDZ and `let` scoping details.
- `DEV-FLS-028`: `const` shallow immutability.
- `DEV-FLS-040`: `JSON.stringify` circular reference handling.
- `DEV-FLS-087`, `DEV-FLS-088`, `DEV-FLS-095`: Specific React hook lifecycle distinctions (`useMemo`, `useCallback`, `useLayoutEffect`).

---

## 6. Granularity Mismatch: Root Cause Analysis

Why does ColSmol-256M achieve 88.50% standalone accuracy rather than matching or exceeding text retrieval?
1. **Granularity Disparity:**
   - **Text Chunks (C1):** 85-token semantic chunks tightly bounded around specific rules (e.g., just the `const` reassignment rule, or just the `useEffect` cleanup rule).
   - **Visual Pages (C2):** 500–1000 tokens encompassing all topics on a page. Page 9 (React Hooks), for example, covers overview, rules, and hook definitions.
2. **Impact on Frozen A4 Verifier:**
   - The A4 verifier was designed and calibrated for concise evidence chunks.
   - When fed an entire page, the probability of encountering an unrelated sibling rule on that page that confounds Tier-1 dictionary matching or Tier-2 NLI increases.
   - This directly explains why FAR rose from 4.00% to 8.00% and Refutation Recall dropped from 92.00% to 84.00%.

---

## 7. Operational & Governance Verification

1. **Protocol Adherence:** All experimental conditions, models, parameters ($k=5$, RRF $k=60$, equal weights $0.5/0.5$), and scripts were prespecified and frozen prior to execution.
2. **Zero Blind Evaluation:** The blind dataset `EXP-0033-BLIND-DATASET.json` remained sealed and untouched.
3. **Zero Production Mutation:** `EduConnect-LMS-Production` remained untouched at `176883227602671b545e061dacf228aedc3271a5`.
4. **Authentic Evidence Bridge:** Strictly zero OCR and zero synthetic descriptions were generated. Text was mapped deterministically from authentic PDF extraction.
5. **No Model Substitution:** `vidore/colsmol-256m` was used exclusively for visual retrieval.

---

## 8. Conclusion & Recommendation

1. **Standalone Visual Retrieval:** While `ColSmol-256M` provides remarkable zero-shot document page understanding without OCR (88.50% accuracy, 99.0% OOD rejection), standalone visual page retrieval is **not recommended** as a replacement for fine-grained text retrieval due to the granularity dilution problem ($\Delta = -4.00$ pp, $p = 0.0052$).
2. **Text + Visual Fusion:** RRF fusion ($k=60$) successfully protects the pipeline against visual degradation, achieving **92.25% accuracy** (statistically indistinguishable from C1 at 92.50% and C0 at 92.00%). However, it does not provide a statistically significant improvement over C1.
3. **Future Research Direction:** To unlock the full potential of visual document retrieval, future work should explore **visual-to-chunk alignment** or **hierarchical visual retrieval** (retrieving the visual page, then using bounding box / text segment attention to extract the relevant paragraph), bridging the granularity gap.
