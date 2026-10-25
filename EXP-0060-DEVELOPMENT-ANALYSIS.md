# EXP-0060: Development Benchmark Analysis & Findings

**Experiment Identifier:** EXP-0060  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** COMPLETED DEVELOPMENT BENCHMARK ($N=400$)  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` (SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Corpus:** `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`, 76 chunks)  
**Verifier:** Frozen A4 (`backend/rag_ambiguity_guard_verifier.php`, SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  

---

## 1. Executive Summary & Core Research Question

EXP-0060 investigated the isolated evidence-budget question:
> *"Does reducing the amount of retrieved evidence passed from the C4 retrieval stage into the frozen A4 verifier improve downstream decisions without changing the retrieval ranking itself?"*

### Key Findings
1. **Primary Finding (Pattern D):**
   - **Evidence volume is NOT the dominant cause of the C4 downstream gap.**
   - Slicing the evidence handed to A4 from $k=20$ down to $k=5$ yields a minor, statistically non-significant improvement: **C4-5 = 87.75% (351/400)** vs **C4-20 = 86.75% (347/400)** ($\Delta = +1.00\text{ pp}$, McNemar exact $p = 0.21875$, $n_{10}=5, n_{01}=1$).
   - C4-10 ($k=10$) produces virtually identical accuracy to C4-20: **86.50% (346/400)** ($\Delta = -0.25\text{ pp}$, McNemar exact $p = 1.0$, $n_{10}=0, n_{01}=1$).
   - Even with minimal evidence ($k=5$), downstream accuracy remains statistically significantly below C0 (**87.75% vs 92.00%**, $\Delta = -4.25\text{ pp}$, McNemar exact $p = 0.005988$).

2. **Relevance Concentration in Top 5 Ranks:**
   - Across the 256 curriculum queries with gold relevant chunks, **99.61% (255/256)** contain a gold relevant chunk within **Ranks 1–5**.
   - Only **0.39% (1/256)** have the first relevant chunk in Ranks 6–10.
   - Exactly **0.00% (0/256)** have relevant evidence located exclusively in Ranks 11–20.
   - Consequently, truncating evidence from $k=20$ to $k=5$ does *not* cause false rejections on supported cases (FRR drops from 12.67% to 11.33%).

3. **OOD Collision Localization:**
   - Out of 100 out-of-curriculum queries, C4-20 had 24 false refutations and 1 false acceptance (75.0% OOD recall).
   - Truncating to C4-10 had zero effect on OOD errors (still 24 false refutations, 1 false acceptance, 75.0% OOD recall).
   - Truncating to C4-5 eliminated only 2 false refutations (22 false refutations, 1 false acceptance, 77.0% OOD recall).
   - **Conclusion:** OOD keyword collisions occur at the very top of the neural retrieval ranking (Ranks 1–5), because the surface tokens in out-of-curriculum queries (e.g., "variable", "scope", "function", "HTTP") match curriculum chunks directly. Evidence volume truncation does not fix OOD collisions; an explicit structural curriculum boundary gate is required.

4. **Substantial Context & Latency Savings:**
   - C4-5 reduces mean context tokens by **77.4%** (301.0 tokens vs 1331.9 tokens in C4-20).
   - C4-5 reduces total end-to-end latency by **38.7%** (2294.3 ms vs 3742.5 ms in C4-20), primarily by preventing the downstream A4 verifier from scanning 20 chunks when escalating to Tier-2 NLI.

---

## 2. Comprehensive Experimental Results

### 2.1 Full Performance Table ($N=400$)

| Condition | Evidence Budget ($k$) | Downstream Accuracy | 95% Wilson CI | Macro F1 | FAR (%) | FRR (%) | Mean Tokens | Mean Total Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **C0 (Control)** | 5 (hierarchical) | **92.00%** (368/400) | [88.92, 94.28] | **92.67** | **3.60%** | 13.33% | 580.0 | **15.4 ms** |
| **C4-20 (Reference)**| 20 | 86.75% (347/400) | [83.08, 89.73] | 86.67 | 3.60% | 12.67% | 1331.9 | 3742.5 ms |
| **C4-10 (Reduced)** | 10 | 86.50% (346/400) | [82.80, 89.50] | 86.45 | 4.00% | 12.67% | 587.5 | 2270.7 ms |
| **C4-5 (Minimal)** | 5 | 87.75% (351/400) | [84.17, 90.61] | 87.69 | **3.60%** | **11.33%** | **301.0** | 2294.3 ms |

### 2.2 Category Recalls

| Condition | Supported Recall (%) | Refutation Recall (%) | NOT_ESTABLISHED Recall (%) | OOD Recall (%) |
| :--- | :---: | :---: | :---: | :---: |
| **C0** | 86.67 (130/150) | 93.33 (140/150) | **98.00 (98/100)** | **98.00 (98/100)** |
| **C4-20** | 87.33 (131/150) | **94.00 (141/150)** | 75.00 (75/100) | 75.00 (75/100) |
| **C4-10** | 87.33 (131/150) | 93.33 (140/150) | 75.00 (75/100) | 75.00 (75/100) |
| **C4-5** | **88.67 (133/150)** | **94.00 (141/150)** | 77.00 (77/100) | 77.00 (77/100) |

---

## 3. Shared Retrieval Ranking & Relevance Distribution

Retrieval was executed once using the frozen BGE-M3 + PyLate pipeline (`EXP-0059`). The ranking was strictly shared across C4-20, C4-10, and C4-5:
- **Recall@1:** 96.88%
- **Recall@3:** 99.61%
- **Recall@5:** 99.61%
- **Recall@10:** 100.00%
- **nDCG@5:** 86.92%
- **nDCG@10:** 86.13%

### Relevant Evidence Rank Distribution ($N=256$ curriculum queries)
- **Ranks 1–5:** 255 queries (**99.61%**)
- **Ranks 6–10:** 1 query (**0.39%**)
- **Ranks 11–20:** 0 queries (**0.00%**)
- **Not in Top 20:** 0 queries (**0.00%**)

This confirms that PyLate ColBERT late interaction concentrates relevant evidence almost entirely into the top 5 ranks.

---

## 4. Paired Statistical Comparisons

### 4.1 C4-10 vs C4-20
- **Paired Accuracy Delta:** $-0.25\text{ pp}$ [95% CI: $-0.74, +0.24$]
- **McNemar Exact $p$-value:** $p = 1.0$
- **Contingency:** $n_{11} = 346, n_{00} = 53, n_{10} = 0, n_{01} = 1$
- **Discordant Pairs:** 1
- **Interpretation:** Truncating from 20 to 10 chunks changes the classification of only 1 out of 400 queries. The difference is statistically negligible.

### 4.2 C4-5 vs C4-20
- **Paired Accuracy Delta:** $+1.00\text{ pp}$ [95% CI: $-0.20, +2.20$]
- **McNemar Exact $p$-value:** $p = 0.21875$
- **Contingency:** $n_{11} = 346, n_{00} = 48, n_{10} = 5, n_{01} = 1$
- **Discordant Pairs:** 6
- **Interpretation:** Minimal evidence ($k=5$) yields 5 improvements and 1 regression relative to C4-20, a net gain of 4 cases (+1.00 pp). This difference does not reach statistical significance ($p = 0.22$).

### 4.3 C4-5 vs C0
- **Paired Accuracy Delta:** $-4.25\text{ pp}$ [95% CI: $-7.12, -1.38$]
- **McNemar Exact $p$-value:** $p = 0.005988$
- **Contingency:** $n_{11} = 342, n_{00} = 23, n_{10} = 9, n_{01} = 26$
- **Discordant Pairs:** 35
- **Interpretation:** C4-5 remains statistically significantly below C0 ($p = 0.006$), driven by the remaining 23 OOD classification errors in C4-5 vs only 2 in C0.

---

## 5. Forensic Analysis: Transition Causes & OOD Collision Breakdown

Across the discordant cases between evidence budgets, the transition causes were:
- `ood_keyword_collision`: 2 cases (OOD queries where fewer chunks reduced verifier over-entrenchment)
- `relevant_evidence_retained`: 2 cases (supported queries where top 5 chunks were sufficient, avoiding noise from lower ranks)
- `compound_premise`: 1 case (multi-clause query where top 5 chunks provided cleaner focal evidence)
- `novel_false_premise`: 1 case
- `relevant_evidence_removed`: 0 cases (no case lost necessary evidence when moving to $k=5$)

### OOD Error Breakdown ($N=100$)
| Condition | OOD Accuracy | False Acceptances (SUPPORTED) | False Refutations (REFUTED) |
| :--- | :---: | :---: | :---: |
| **C0** | **98.0%** (98/100) | 1 | 1 |
| **C4-20** | 75.0% (75/100) | 1 | 24 |
| **C4-10** | 75.0% (75/100) | 1 | 24 |
| **C4-5** | 77.0% (77/100) | 1 | 22 |

---

## 6. Efficiency Trade-offs

```
Context Tokens:
  C4-20: [████████████████████] 1332 tokens
  C4-10: [████████            ]  588 tokens (-55.9%)
  C4-5:  [████                ]  301 tokens (-77.4%)

Total Latency:
  C4-20: [████████████████████] 3743 ms
  C4-10: [████████████        ] 2271 ms (-39.3%)
  C4-5:  [████████████        ] 2294 ms (-38.7%)
```

---

## 7. Conclusion for Scientific Role Separation

The empirical evidence rules out Hypothesis B (more evidence hurts because of noise as the primary cause of the gap) and Hypothesis C (intermediate budget optimal). The data conclusively demonstrates **Pattern D**:
**Evidence volume is not the dominant cause of the downstream gap between neural retrieval and structural baseline.**

The gap is structural: C0 achieves 98% OOD accuracy because its deterministic page-index router explicitly refuses out-of-curriculum queries. In contrast, BGE-M3 + PyLate retrieves the most semantically similar curriculum chunk even for out-of-curriculum queries, causing the downstream NLI verifier to evaluate false evidence. To close the downstream gap, future research must introduce an explicit **out-of-curriculum boundary gating mechanism** prior to or in conjunction with fine-grained late-interaction retrieval.
