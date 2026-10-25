# EXP-0032: Retrieval Error Analysis & Forensic Investigation

**Experiment ID:** EXP-0032  
**Branch:** `exp-0032`  
**Dataset:** `EXP-0032-RETRIEVAL-BENCHMARK.json` ($N=300$)  
**Frozen Verifier Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Date:** 2026-09-16  

---

## 1. Executive Summary

This error analysis examines the failure modes observed across the five evaluated retrieval configurations:
- **Mode R0 (Baseline):** `nomic-embed-text` (768d) + Okapi BM25 + RRF ($k=60$)
- **Mode R1 (Dense BGE-Small):** `BAAI/bge-small-en-v1.5` (384d) + BM25 + RRF ($k=60$)
- **Mode R2 (Dense E5-Small):** `intfloat/e5-small-v2` (384d, prefixed) + BM25 + RRF ($k=60$)
- **Mode R3 (Baseline + MiniLM Reranker):** R0 pool ($N=10$) + `ms-marco-MiniLM-L-6-v2` (top 5, CPU)
- **Mode R4 (BGE-Small + MiniLM Reranker):** R1 pool ($N=10$) + `ms-marco-MiniLM-L-6-v2` (top 5, CPU)

### Key Empirical Findings
1. **Curriculum Retrieval Saturation:** In a focused technical curriculum of 23 chunks, hybrid BM25 + dense bi-encoder retrieval already achieves **97.78% Recall@5** and **0.9330 MRR** under baseline R0. Neither BGE-small (R1: 97.04%) nor E5-small (R2: 97.41%) significantly altered top-5 evidence presence.
2. **The Reranker Disconnect (The Score Distribution Mismatch):**
   - MiniLM cross-encoder reranking produced a severe downstream degradation: accuracy dropped from **65.00% to 58.33%** ($p = 0.0042$, McNemar test), and FAR rose from **23.48% to 42.42%**.
   - **Root Cause Identified:** The frozen E4 verifier incorporates a Stage 3 evidence gating invariant (`maxSim < 0.28` $\to$ `NOT_ESTABLISHED`). In R0/R1, cosine similarities reside in the range $[0.50, 0.85]$. However, the cross-encoder generates uncalibrated logits which, when transformed through sigmoid, yielded scores $< 0.28$ on 36 legitimate technical claims, starving the downstream NLI tier and causing false abstentions ($n_{10} = 36$).
3. **The OOD Trade-off:**
   - In R0, 60.0% of Out-of-Distribution (OOD) queries retrieved an unrelated curriculum chunk with high similarity ($\ge 0.55$).
   - In R4, cross-encoder reranking crushed OOD scores, achieving **0.0% OOD contamination** and boosting AMBIGUOUS query accuracy from 44.44% to 75.56%.

---

## 2. Failure Taxonomy & Quantification

Failures across the 300 benchmark cases are classified into five distinct categories:

| Failure Category | Definition | R0 Baseline | Mode R1 (BGE) | Mode R4 (BGE+MiniLM) | Impact on Task |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Type 1: Retrieval Failure** | Gold chunk completely missing from top-5 candidates | 6 cases (2.22%) | 8 cases (2.96%) | 6 cases (2.22%) | Verifier has zero ground truth evidence |
| **Type 2: Ranking Failure** | Gold chunk present in top-5 but ranked below distractor (rank 2–5) | 20 cases (7.41%) | 19 cases (7.04%) | 26 cases (9.63%) | Verifier may focus on suboptimal context |
| **Type 3: Reranking Inversion** | Gold chunk was top-1 in R1, but pushed down or suppressed by reranker | N/A | N/A | 14 cases (5.19%) | Negative cross-encoder transfer |
| **Type 4: Score Calibration Failure** | Correct chunk retrieved, but similarity score $< 0.28$, triggering verifier gate | 0 cases (0.00%) | 0 cases (0.00%) | **36 cases (13.33%)** | False `NOT_ESTABLISHED` (FAR jump) |
| **Type 5: Verifier Inference Failure** | Correct evidence retrieved at top-1 with high similarity, but verifier erred | 79 cases (26.33%) | 79 cases (26.33%) | 59 cases (19.67%) | Downstream NLI / rule limitation |

---

## 3. Case-by-Case Forensic Dissections

### Case Study A: Score Calibration Failure (Type 4)
- **Case ID:** `EXP31-SUP-0003`
- **Query:** *"Does display: grid establish an independent formatting context for its direct child elements?"*
- **Expected Label:** `SUPPORTED`
- **Gold Chunk:** `ea1f3b17-0657-4ee2-b155-c56b775dd25e_chunk_3` (CSS Grid System)
- **R0 Performance:**
  - Retrieved Rank 1: `HTML & CSS Fundamentals` (CSS Grid chunk, sim = 0.7196)
  - E4 Decision: `SUPPORTED` (Tier-2 NLI confidence: 0.95) — **CORRECT**
- **R4 Performance:**
  - Retrieved Rank 1: `HTML & CSS Fundamentals` (CSS Grid chunk, cross-encoder sigmoid sim = **0.0014**)
  - E4 Decision: `NOT_ESTABLISHED` — **INCORRECT (False Abstention)**
  - Verifier Diagnostics: `Zero or insufficient evidence available in approved curriculum (maxSim < 0.28)`
- **Forensic Diagnosis:** The cross-encoder correctly placed the gold CSS Grid chunk at Rank 1, but output an uncalibrated negative logit ($-6.57$). The sigmoid transformation yielded $0.0014$. The frozen verifier's Stage 3 evidence adequacy gate (`maxSim < 0.28`) rejected the chunk before Tier-2 NLI was ever invoked.

---

### Case Study B: Positive Disambiguation via Cross-Encoder (Type 5 Prevention)
- **Case ID:** `EXP31-AMB-0017`
- **Query:** *"Should developers avoid using var in all legacy and modern JavaScript development?"*
- **Expected Label:** `NOT_ESTABLISHED` (Normative, subjective value judgment)
- **R0 Performance:**
  - Retrieved Rank 1: `JavaScript ES6+ Deep Dive` (Variables chunk, sim = 0.6214)
  - E4 Decision: `SUPPORTED` — **INCORRECT (False Acceptance)**
  - Reason: Tier-2 NLI was fed the chunk discussing `let` vs `var` and hallucinated entailment of the normative advice.
- **R4 Performance:**
  - Retrieved Rank 1: `JavaScript ES6+ Deep Dive` (cross-encoder sigmoid sim = **0.0002**)
  - E4 Decision: `NOT_ESTABLISHED` — **CORRECT**
  - Reason: MiniLM recognized that the passage does not answer the normative query "Should developers avoid...", assigning a very low score. The verifier correctly abstained.

---

### Case Study C: Subtle Retrieval Inversion (Type 3)
- **Case ID:** `EXP31-SUP-0036`
- **Query:** *"Does setTimeout schedule a callback function to run as a macrotask after a minimum delay?"*
- **Expected Label:** `SUPPORTED`
- **Gold Chunk:** `c254cc49-47b8-455f-bc9e-bc834c0276fe_chunk_3` (Async JS, Event Loop, Macrotasks)
- **R0 / R1 Retrieval:**
  - Rank 1: `React Hooks Tutorial` (sim = 0.5881) — distractor mentioning timeouts
  - Rank 2: `JavaScript ES6+ Deep Dive` (sim = 0.5620) — gold chunk
  - E4 Verifier: Passed both to NLI; correctly synthesized `SUPPORTED`.
- **R4 Retrieval:**
  - Rank 1: `JavaScript ES6+ Deep Dive` (sim = 0.0941)
  - Gate Triggered: `0.0941 < 0.28` $\to$ verifier dropped case to `NOT_ESTABLISHED`.

---

## 4. OOD Evidence Contamination Breakdown

For the $N=30, \text{OOD}$ queries (queries about Django, Laravel, Spring Boot, Vue, Flutter, MongoDB):

| Mode | Queries Tested | Top-1 Contamination ($\ge 0.55$) | Contamination Rate | Downstream OOD Accuracy |
| :--- | :--- | :--- | :--- | :--- |
| **R0** | 30 | 18 | **60.00%** | 90.00% |
| **R1** | 30 | 29 | **96.67%** | 90.00% |
| **R2** | 30 | 30 | **100.00%** | 90.00% |
| **R3** | 30 | 0 | **0.00%** | **96.67%** |
| **R4** | 30 | 0 | **0.00%** | **96.67%** |

### Critical Insight:
Dense bi-encoders (`bge-small` and `e5-small`) suffer from **hypersphere crowding**: because their vector space projects all text onto a unit hypersphere, out-of-domain technical queries always find an in-domain technical vector that has cosine similarity $\ge 0.55$.  
Conversely, **cross-encoders perform full joint self-attention** between the query and document tokens, recognizing semantic irrelevance and suppressing the score to zero.

---

## 5. Architectural Recommendations for Next Phase

1. **Decouple Reranking Score from Verifier Relevance Gate:**  
   The downstream verifier must not apply an arbitrary cosine similarity threshold (`maxSim < 0.28`) to cross-encoder probabilities or logits.
2. **Platt Scaling / Temperature Calibration:**  
   If cross-encoder scores are to be passed as `similarity`, they must be calibrated via temperature scaling ($T \approx 4.0$) so that moderately relevant passages do not collapse to $0.001$.
3. **Preserve Hybrid Baseline for In-Domain Retrieval:**  
   Because BM25 + RRF already achieves 97.78% Recall@5 on 23 chunks, dense embedding replacement alone cannot move the needle on downstream accuracy. Focus must shift to query conditioning and evidence adequacy.
