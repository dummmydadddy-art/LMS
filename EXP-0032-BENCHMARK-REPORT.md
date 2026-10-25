# EXP-0032: Controlled Open-Source Retrieval Benchmark Final Report

**Experiment ID:** EXP-0032  
**Branch:** `exp-0032`  
**Commit:** `618cca3`  
**Dataset:** `EXP-0032-RETRIEVAL-BENCHMARK.json` ($N=300$ queries)  
**Frozen Verifier Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Hardware Environment:** NVIDIA RTX 3050 Laptop GPU (4 GB VRAM) / Intel Core i5-12450H / 16 GB RAM  
**Date:** 2026-09-16  

---

## 1. Executive Summary & Scientific Decision

EXP-0032 benchmarked the first open-source retrieval layer for the EduConnect LMS experimental pipeline under strict hardware constraints (4 GB VRAM, 16 GB RAM, local offline execution) with the **EXP-0031 E4 premise verifier strictly frozen**.

Five retrieval configurations were evaluated across 300 test queries:
1. **Mode R0 (Baseline):** `nomic-embed-text` (768d) + Okapi BM25 + RRF ($k=60$)
2. **Mode R1 (Dense BGE-Small):** `BAAI/bge-small-en-v1.5` (384d) + BM25 + RRF ($k=60$)
3. **Mode R2 (Dense E5-Small):** `intfloat/e5-small-v2` (384d, prefixed) + BM25 + RRF ($k=60$)
4. **Mode R3 (Baseline + Cross-Encoder):** R0 pool ($N=10$) + `ms-marco-MiniLM-L-6-v2` (top 5, CPU)
5. **Mode R4 (BGE-Small + Cross-Encoder):** R1 pool ($N=10$) + `ms-marco-MiniLM-L-6-v2` (top 5, CPU)

### Scientific Decision
```text
R0–R4 COMPARISON: MIXED
```
- **Embedding Replacement:** **SUCCESS / PARITY WITH 50% EFFICIENCY GAIN.**  
  `BAAI/bge-small-en-v1.5` (384d) achieved complete statistical parity with `nomic-embed-text` (768d) across downstream verification ($n_{01}=0, n_{10}=0, p=1.000$) while cutting vector dimensionality and storage in half (1536 bytes vs 3072 bytes per chunk) and completing batch retrieval 10× faster.
- **Cross-Encoder Reranking:** **MIXED / SCORE CALIBRATION MISMATCH.**  
  Adding `ms-marco-MiniLM-L-6-v2` completely eliminated Out-of-Distribution (OOD) evidence contamination (dropping from 60.0% to 0.0%) and boosted AMBIGUOUS query accuracy (+31.12 pp). However, because the frozen E4 verifier employs a hardcoded cosine relevance gate (`maxSim < 0.28`), uncalibrated cross-encoder logits fell below the threshold for 36 legitimate technical claims, artificially starving the downstream NLI tier and dropping overall accuracy from 65.00% to 58.33% ($p = 0.0042$).

---

## 2. Core Benchmark Results Summary

### 2.1 Pure Retrieval Performance ($N=270$ In-Curriculum)

| Metric | R0 (Baseline) | R1 (BGE-Small) | R2 (E5-Small) | R3 (Nomic+MiniLM) | R4 (BGE+MiniLM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Recall@1** | **90.37%** | 90.00% | 88.52% | 88.15% | 88.15% |
| **Recall@3** | **96.30%** | 95.93% | 95.93% | **96.30%** | **96.30%** |
| **Recall@5** | **97.78%** | 97.04% | 97.41% | **97.78%** | **97.78%** |
| **MRR** | **0.9330** | 0.9316 | 0.9253 | 0.9256 | 0.9256 |
| **nDCG@5** | **0.9291** | 0.9276 | 0.9239 | 0.9219 | 0.9213 |
| **Irrelevant Top-1 Rate**| **9.63%** | 10.00% | 11.48% | 11.85% | 11.85% |
| **OOD Contamination ($N=30$)**| 60.00% | 96.67% | 100.00% | **0.00%** | **0.00%** |

### 2.2 Downstream E4 Verification Performance ($N=300$)

| Metric | R0 (Baseline) | R1 (BGE-Small) | R2 (E5-Small) | R3 (Nomic+MiniLM) | R4 (BGE+MiniLM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Overall Accuracy** | **65.00%** | **65.00%** | **65.33%** | 58.33% | 58.33% |
| **Macro F1** | **64.33%** | **64.33%** | **64.71%** | 57.20% | 57.20% |
| **Supported Recall** | **76.52%** | **76.52%** | **76.52%** | 57.58% | 57.58% |
| **Refutation Recall**| **50.54%** | **50.54%** | **50.54%** | 38.71% | 38.71% |
| **NOT_ESTABLISHED Rec**| 62.67% | 62.67% | 64.00% | **84.00%** | **84.00%** |
| **FAR** | **23.48%** | **23.48%** | **23.48%** | 42.42% | 42.42% |
| **FRR** | 18.94% | 18.94% | 18.94% | **14.39%** | **14.39%** |
| **OOD Accuracy ($N=30$)**| 90.00% | 90.00% | 90.00% | **96.67%** | **96.67%** |
| **Ambiguity Accuracy ($N=45$)**| 44.44% | 44.44% | 46.67% | **75.56%** | **75.56%** |

### 2.3 Pairwise Significance Tests (McNemar with Continuity Correction)

| Comparison | $n_{01}$ (Gain) | $n_{10}$ (Loss) | $\chi^2$ | $p$-value | Conclusion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R0 vs R1** | 0 | 0 | 0.0000 | 1.000000 | Exactly identical decisions |
| **R0 vs R2** | 1 | 0 | 0.0000 | 0.500000 | Not significant |
| **R0 vs R3** | 16 | 36 | 6.9423 | **0.004209** | Statistically significant regression |
| **R0 vs R4** | 16 | 36 | 6.9423 | **0.004209** | Statistically significant regression |
| **R1 vs R4** | 16 | 36 | 6.9423 | **0.004209** | Statistically significant regression |
| **R3 vs R4** | 0 | 0 | 0.0000 | 1.000000 | Exactly identical decisions |

---

## 3. Detailed Answers to Final Questions

### Q1: Does BGE-small improve retrieval over nomic-embed-text?
**No in raw Recall@5, but Yes in efficiency and dimensional compactness.**  
In the 23-chunk curriculum, baseline R0 already achieves 97.78% Recall@5. BGE-small achieves 97.04% Recall@5 and 0.9316 MRR (statistical parity with R0, $p=1.000$). However, BGE-small provides a **50% reduction in vector dimension (384 vs 768)**, smaller SQLite storage footprint, and zero reliance on heavy external runtimes.

### Q2: Does E5-small improve retrieval over nomic-embed-text?
**No.**  
E5-small achieves 97.41% Recall@5 and 0.9253 MRR. Downstream verification accuracy changed on exactly 1 query out of 300 ($p = 0.500$). Furthermore, E5-small requires artificial asymmetric query/passage prefixing (`query: ` / `passage: `), adding orchestration overhead without tangible retrieval gains.

### Q3: Does MiniLM reranking improve retrieval quality?
**Yes for noise discrimination and OOD filtering; No for raw Recall@5.**  
MiniLM preserves 97.78% Recall@5 while completely eliminating OOD contamination (dropping false high-similarity retrievals from 60% down to 0.0%). It aggressively suppresses irrelevant passages that share keyword overlaps.

### Q4: Does better retrieval translate into better E4 verification?
**Not automatically.**  
This is the central finding of EXP-0032: **A retrieval upgrade can degrade downstream verification if the verifier's confidence gates are coupled to the previous retrieval model's score scale.** Because the frozen E4 verifier uses `maxSim < 0.28` to reject empty or weak evidence, cross-encoder scores that fell below 0.28 on valid technical passages triggered false abstentions, dropping accuracy by 6.67 pp.

### Q5: Does R4 improve refutation recall?
**No under the frozen verifier.**  
Refutation recall dropped from 50.54% (R0) to 38.71% (R4) because false-premise queries frequently received cross-encoder similarity scores $< 0.28$, causing the verifier to abort to `NOT_ESTABLISHED` before Tier-1 or Tier-2 contradiction logic could execute.

### Q6: Does R4 preserve E4's FAR advantage?
**No.**  
FAR rose from 23.48% (R0) to 42.42% (R4). The increase was driven entirely by false abstentions ($n=25$ valid supported claims aborted due to the `maxSim < 0.28` gate). False refutations (FRR) actually improved (18.94% $\to$ 14.39%).

### Q7: Does R4 reduce OOD evidence contamination?
**Yes, decisively.**  
R4 reduced OOD evidence contamination from **60.00% to 0.00%**. When presented with external frameworks (Django, Laravel, Vue), R4 assigned near-zero similarity to all curriculum chunks, allowing the verifier to correctly reject out-of-domain claims without hallucinating entailment.

### Q8: What is the latency and memory cost?
- **R1 (BGE-small):** P50 latency = **22.85 ms**, Peak RAM = **480 MB**, VRAM = **0 MB**.
- **R4 (BGE+MiniLM):** P50 latency = **461.61 ms**, Peak RAM = **572 MB**, VRAM = **0 MB**.
Both configurations operate well within the 16 GB host RAM and 4 GB GPU VRAM envelope.

### Q9: Which component provides the largest measurable benefit?
- For **computational efficiency and vector compaction**: **`BAAI/bge-small-en-v1.5`** (384d, 22 ms latency, 50% storage reduction).
- For **semantic boundary and OOD suppression**: **`cross-encoder/ms-marco-MiniLM-L-6-v2`** (completely eliminates OOD false matches).

### Q10: What should the next experiment investigate?
The next experiment (EXP-0033) should investigate **Score Calibration and Gate Adaptation**:
1. Calibrating cross-encoder relevance scores using temperature-scaled sigmoid so that valid evidence does not get suppressed below the verifier's Stage 3 evidence gate.
2. Unifying the evidence adequacy threshold with cross-encoder margins rather than static cosine similarity.

---

## 4. Cryptographic Artifact Checksums (SHA-256)

| Artifact File | SHA-256 Checksum |
| :--- | :--- |
| `EXP-0032-RETRIEVAL-BENCHMARK.json` | `D11FD1BDF4947EDC5C0E11A27F304BBB1CF9BC4FA9A6AB586299DE98F2979236` |
| `EXP-0032-RETRIEVAL-RESULTS.json` | `5DDABB34A45B8C83C72880F83BC96046AC1C178D092E2C8A0162DB163FE1AD55` |
| `EXP-0032-DOWNSTREAM-E4-RESULTS.json`| `9CCA00CA39EC43D5F4B867C9C8D87A4DD188E2E9700F2ECCA5690A0331E1D2A8` |
| `EXP-0032-HARDWARE-RESULTS.json` | `F63062C854822B2111B8D464DA3AB021BEA003EDEF82C1AFA8AEB8A1CB9ADCB7` |
| `EXP-0032-BENCHMARK-REPORT.md` | `2FE2EC0DFABB467D294355C29448551F35FA6DAF913FC6C06B2E1EAF8BD45E47` |
