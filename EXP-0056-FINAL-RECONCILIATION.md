# EXP-0056: Final Scientific Reconciliation Patch

**Experiment:** EXP-0056: PageIndex Structural Navigation for Retrieval-Efficient RAG  
**Branch:** `research-integration`  
**Base Commit:** `3af3418d029cc7ab3820cc95b7931ecd7e277bfa`  
**EXP-0056 Commit:** `627f404e94fc35f0d9e9596712dcf50d75dd1011`  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (FROZEN HEAD: `176883227602671b545e061dacf228aedc3271a5`)  
**Date:** September 17, 2026  
**Operational Decision:** **ADOPT**  
**Scientific Claim:** **CONDITIONAL**  
**Status:** CLOSED & RECONCILED  

---

## 1. Construct Identity Statement

This experiment evaluated two distinct architectural stages:
1. **Document Indexing:** Genuine upstream **PageIndex PDF-native indexing** via `pageindex.page_index_flash` (version `0.2.18`). Operates directly on authentic PDF documents using character-level span clustering and embedded document bookmarks, producing a 3-level hierarchical outline (5 modules, 23 sections, 50 nodes covering all 23 pages).
2. **Query Routing:** **PageIndex-derived deterministic structural routing** implemented via deterministic regular expression and keyword matching logic (`route_query()` in `scratch/exp0056_retrieval_builder.py` and `search_tree()` in `research/document_navigation/pageindex_adapter.py`). It does **not** evaluate native PageIndex agentic reasoning retrieval (`agent_tools` / LLM-based tree traversal).

**Scientific Conclusion:** PageIndex indexing was genuine PDF-native execution. Query routing was PageIndex-derived deterministic structural routing. Therefore this experiment should be interpreted as evaluating PageIndex-derived structural routing rather than native PageIndex agentic retrieval.

---

## 2. Pre-Registered Hypotheses vs. Empirical Outcomes

### Hypothesis $H_1$ (Search Space & Context Reduction): CONFIRMED (Empirical)
- **Pre-registered Target:** Candidate page reduction $\ge 50\%$ across routed queries without eliminating gold evidence.
- **Observed Result:** 
  - Routed queries achieved **79.85% candidate page reduction** (from 23 baseline pages to 4.63 pages).
  - Across all blind queries (including fallbacks), candidate page reduction was **58.13%**.
  - Candidate context token reduction was **58.36%**.
  - *Definition:* "Candidate pages" refers to pages belonging to the candidate module/section structurally routed prior to dense retrieval (the search space presented to the dense retriever), compared against the 23-page total curriculum baseline.

### Hypothesis $H_2$ (PageIndex PDF-Native Fidelity Gate): CONFIRMED
- **Pre-registered Target:** Genuine upstream `pageindex.page_index_flash` generates a deterministic hierarchical document tree with 100% page coverage, 0 missing pages, 0 cross-document contamination, operating strictly locally without cloud dependencies.
- **Observed Result:** 
  - Evaluated on 4 authentic PDF corpora (5p, 20p, 50p, 23p full curriculum).
  - Page coverage: exactly **100.0%** across all files.
  - Missing pages: **0** across all files.
  - Memory consumption: $<15$ MB delta RSS for 50 pages; **0.0 MB GPU VRAM**.
  - *Distinction:* Page-coverage fidelity is distinct from retrieval correctness.

### Hypothesis $H_3$ (Downstream Quality & Safety): CONDITIONAL
- **Pre-registered Target:** Candidate C1 accuracy $\ge 71.40\%$ (baseline 72.00%) and safety ceiling $	ext{FAR} \le 17.50\%$ on the locked blind holdout benchmark ($N = 500$).
- **Observed Result:** 
  - Blind accuracy: **72.80% [95% Wilson CI: 68.74%, 76.52%]** (B0: 72.00% [67.91%, 75.76%], $+0.80$ pp).
  - False Acceptance Rate: **16.03% (46/287) [95% Wilson CI: 12.24%, 20.72%]** (B0: 17.07% (49/287) [13.16%, 21.85%], $-1.04$ pp). Observed candidate FAR is below the operational ceiling of $17.50\%$, though the 95% Wilson upper bound (20.72%) does not establish that the population parameter is strictly below the ceiling.
  - Paired comparison: $n_{11} = 358, n_{00} = 134, n_{10} = 2, n_{01} = 6$.
  - McNemar's Edwards-corrected $\chi^2 = 1.1250$, exact two-sided binomial $p = 0.2891$.
  - **Statistical Finding:** Observed paired accuracy difference was $+0.80$ percentage points, with 6 improvements and 2 regressions; the paired difference was not statistically significant by McNemar's test ($p = 0.2891$). Formal non-inferiority was not established by McNemar alone.

---

## 3. Corrected Blind Metrics Scorecard

```
====================================================================================================
EXP-0056 RECONCILED BLIND SCORECARD (N=500)
====================================================================================================
Dataset                       : EXP-0033-BLIND-DATASET.json (N=500, SHA-256: 3b4fd6c7...)
Control Retriever (B0)        : EXP-0040 Bounded Parents (Global Unconstrained Search)
Candidate Retriever (C1)      : PageIndex-Derived Structural Routing + Bounded Fallback
Frozen Verifier               : Candidate A4 (rag_ambiguity_guard_verifier.php, SHA-256: 31c7c31e...)
----------------------------------------------------------------------------------------------------
Metric                        | Control B0        | Candidate C1      | Delta     | Status
------------------------------+-------------------+-------------------+-----------+-------------------------------------
Accuracy                      | 72.00% [67.91, 75.76]| 72.80% [68.74, 76.52]| +0.80 pp  | Observed Gain
Macro F1                      | 72.24%            | 73.04%            | +0.80 pp  | Non-inferior
False Acceptance Rate (FAR)   | 17.07% [13.16, 21.85]| 16.03% [12.24, 20.72]| -1.04 pp  | Observed FAR below ceiling (<=17.50%)
False Rejection Rate (FRR)    | 27.70% [22.13, 34.06]| 27.23% [21.69, 33.57]| -0.47 pp  | Non-inferior
Supported Recall              | 72.30% (154/213)  | 72.77% (155/213)  | +0.47 pp  | Stable
Refutation Recall             | 67.90% (110/162)  | 68.52% (111/162)  | +0.62 pp  | Stable
NOT_ESTABLISHED Recall        | 76.80% (96/125)   | 78.40% (98/125)   | +1.60 pp  | Stable
Candidate Page Reduction (All)| 0.00%             | 58.13%            | +58.13 pp | Observed Reduction
Routed Page Reduction         | 0.00%             | 79.85%            | +79.85 pp | Observed Reduction
Context Token Reduction       | 0.00%             | 58.36%            | +58.36 pp | Observed Reduction
Fallback Frequency            | 0.00%             | 27.20% (136/500)  | +27.20 pp | Safe Escalation
----------------------------------------------------------------------------------------------------
Paired McNemar Test           : n11=358, n00=134, n10=2, n01=6 | chi2=1.1250, p=0.2891 (Not Sig)
Fidelity Benchmark            : 100.0% page coverage, 0 missing pages, 0 duplicates, 0.0 MB VRAM
Production Isolation          : HEAD 176883227602671b545e061dacf228aedc3271a5 (CLEAN & UNTOUCHED)
====================================================================================================
```

---

## 4. Operational Decision vs. Scientific Claim

```
======================================================================
DUAL DECISION SUMMARY
======================================================================
OPERATIONAL DECISION: ADOPT
Rationale: Prunes 58.13% of candidate pages and 58.36% of context
tokens while maintaining downstream verification behavior and
reducing False Acceptances by 3 cases (FAR 16.03% vs 17.07%).

SCIENTIFIC CLAIM: CONDITIONAL
Rationale:
1. Document indexing was genuine PageIndex PDF-native execution.
2. Query routing was PageIndex-derived deterministic structural routing.
3. The paired accuracy difference (+0.80 pp) was not statistically
   significant by McNemar's test (p = 0.2891).
4. Formal non-inferiority was not established by McNemar alone.
======================================================================
```

---

## 5. Experiment Closure

EXP-0056 is officially **CLOSED & RECONCILED**.

Protocol constraints:
- Do NOT start EXP-0057.
- Do NOT modify the production repository.
- Halt execution.
