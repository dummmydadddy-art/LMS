# EXP-0038: Pre-Registered Statistical Analysis Plan

**Experiment:** EXP-0038 (Structure-Aware Evidence Chunking with Docling HybridChunker)  
**Parent Lineage:** `4372d43` (EXP-0037 Completed Blind-Evaluation Commit)  
**Authoritative Baseline Comparator:**
* Control Condition (C0): Baseline regex/heuristic chunker (23 chunks, chunkSize=650, chunkOverlap=100) + Frozen Verifier A4  
* Intervention Condition (C1): Docling native HybridChunker (21 chunks, max_tokens=512) + Frozen Verifier A4  
**Evaluation Set:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$ cases, SHA-256 `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Status:** PRE-REGISTERED & COMMITTED PRIOR TO BLIND EVALUATION  
**Date:** 2026-09-17  

---

## 1. Primary Statistical Objectives

EXP-0038 investigates whether replacing naive regex chunking with structure-aware Docling HybridChunker alters the retrieval distribution, retrieval recall/precision, and downstream premise verification accuracy when evaluated through the unchanged EXP-0037 champion verifier A4 (`rag_ambiguity_guard_verifier.php`, prompt `P4_neutral`, thresholds 0.85/0.80).

The statistical evaluation addresses two primary questions:
1. **Retrieval Layer Hypothesis:** Does structure-aware chunking maintain or improve retrieval Recall@1, Recall@5, MRR, and nDCG@5 over the 400 development queries?
2. **Downstream Verification Hypothesis:** Does the resulting evidence pool maintain or improve verification accuracy, reduce false acceptances/abstentions, and preserve the safety envelope ($\text{FAR} \le 18.50\%$)?

---

## 2. Hypothesis Testing Framework

### Formal Hypotheses:
* **H1 (Retrieval Recall & Ranking):** C1 achieves Recall@5 $\ge 97.00\%$, and MRR / nDCG@5 non-inferior to C0 ($\Delta \text{MRR} \ge -0.01$, $\Delta \text{nDCG@5} \ge -0.01$).
* **H2 (Downstream Accuracy Non-Inferiority):** Verification accuracy of C1 is non-inferior to C0 ($\Delta \text{Accuracy} \ge -1.0\%$).
* **H3 (Safety Envelope Invariant):** Standard False Acceptance Rate (FAR) remains strictly bounded $\le 18.50\%$, and False Refutation Rate (FRR) remains $\le 12.00\%$.
* **H4 (Subcategory Calibration):** OOD Recall remains $\ge 95.00\%$, and AMBIGUOUS accuracy remains $\ge 80.00\%$.
* **H5 (High Concordance):** The overall prediction concordance between C0 and C1 exceeds $95.00\%$, confirming that structural chunking stabilizes evidence without disruptive prediction drift.

---

## 3. Paired Inferential Test Specifications

### 3.1 Paired McNemar Test with Edwards' Continuity Correction
We evaluate the paired binary correctness vectors $Y_{\text{C0}} \in \{0, 1\}^N$ and $Y_{\text{C1}} \in \{0, 1\}^N$ over the $N = 400$ development queries:

$$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}, \quad \text{df} = 1$$

where:
* $n_{11}$: Both C0 and C1 correctly classify the query.
* $n_{00}$: Both C0 and C1 incorrectly classify the query.
* $n_{01}$: C0 is incorrect, but C1 is correct (Net Gain for Docling).
* $n_{10}$: C0 is correct, but C1 is incorrect (Net Loss for Docling).

* **Significance Level:** $\alpha = 0.05$ (two-tailed).
* **Null Hypothesis ($H_0$):** $P(n_{01}) = P(n_{10})$ (Docling chunking has no effect on marginal classification error).
* **Alternative Hypothesis ($H_1$):** $P(n_{01}) \ne P(n_{10})$ (Statistically significant divergence in classification performance).

---

## 4. Pre-Registered Decision Thresholds & Promotion Gate

| Decision Category | Formal Criteria | Action |
|---|---|---|
| **PASS — BLIND READY** | 1. Content Preservation Gate: 100.0% word token coverage (**VERIFIED**)\n2. Retrieval Recall@5 $\ge 97.00\%$\n3. Downstream Dev Accuracy $\ge 90.00\%$\n4. Standard Dev $\text{FAR} \le 18.50\%$\n5. McNemar test shows no significant regression ($p \ge 0.05$ or $n_{01} \ge n_{10}$)\n6. Strict Zero Blind Contamination: SHA-256 verified | Freeze method, submit to Independent Audit Checkpoint |
| **CONDITIONAL** | 1. Dev Accuracy $\ge 89.00\%$ but minor regression in specific subcategory\n2. High concordance ($\ge 95.0\%$) but localized boundary issue | Perform forensic root-cause analysis on discordant cases |
| **FAIL / REJECT** | 1. Content loss $> 0.0\%$\n2. Dev Accuracy $< 89.00\%$ OR $\text{FAR} > 18.50\%$\n3. Significant regression ($p < 0.05$ with $n_{10} > n_{01}$) | Revert intervention; do not proceed to blind evaluation |

---

## 5. Blind Dataset Protection Protocol
* The blind evaluation dataset `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256 `3b4fd6c7...`) remains completely isolated, unread, and unexecuted throughout the development phase.
* Under no circumstances may blind queries, labels, or categories be accessed prior to the completion and formal approval of the Independent Audit Checkpoint.
