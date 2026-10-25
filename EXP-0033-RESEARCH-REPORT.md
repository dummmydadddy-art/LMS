# EXP-0033: Cross-Encoder Score Calibration & Evidence-Gate Adaptation
## Research Report & Scientific Evaluation

**Experiment ID:** EXP-0033  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `exp-0033`  
**Parent Lineage:** `EXP-0032` (commit `79ef335`)  
**Frozen Verifier Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Date:** 2026-09-16  
**Status:** COMPLETE & FROZEN  

---

## 1. Abstract

In EXP-0032, replacing the baseline nomic/BM25 retrieval stack (R0) with an open-source hybrid stack featuring `BAAI/bge-small-en-v1.5` and `cross-encoder/ms-marco-MiniLM-L-6-v2` (R4) substantially improved retrieval precision and eliminated out-of-distribution (OOD) contamination (10.0% $\to$ 3.3%). However, downstream premise verifier accuracy collapsed from 65.00% to 58.33%, while False Acceptance Rate (FAR) surged from 23.48% to 42.42%.

EXP-0033 investigated the root cause: an **uncalibrated score-scale collision between cross-encoder logits and the frozen E4 verifier's hardcoded evidence adequacy gate (`maxSim < 0.28`)**. On an independent development set ($N = 432$ pairs), we fitted parametric and non-parametric calibration methods, identifying **Platt Scaling ($a=0.6236, b=3.2801$)** as achieving near-perfect probabilistic calibration (ECE = 0.0107, Brier = 0.0283). Across a completely new, unseen 500-case blind evaluation dataset:

1. **Recovery Over Uncalibrated R4:** Platt Scaling (E5) achieved a **dramatic, statistically significant recovery over uncalibrated Mode R4 (E3)**:
   - Downstream Accuracy jumped from **51.80% to 62.00%** ($+10.20$ percentage points, McNemar $\chi^2 = 30.12, p = 3.8 \times 10^{-8}$).
   - False Acceptance Rate (FAR) dropped from **57.28% to 38.97%** ($-18.31$ percentage points).
   - False abstentions plummeted from **98 down to 55** (**43 false abstentions permanently eliminated**).
2. **Comparison with Baseline R0:** Despite this recovery, Platt-calibrated R4 (62.00%) did not reach downstream parity with baseline R0 (E0: 69.60%, $p = 0.000002$).
3. **Retrieval Superiority:** Mode R4 outperformed baseline R0 across all retrieval metrics (Recall@1: 90.89% vs. 89.33%, MRR: 0.9451 vs. 0.9318, nDCG@5: 0.9574 vs. 0.9452) and achieved an **82.4% reduction in OOD contamination** (6.00% vs. 34.00%).

In accordance with experimental rules, the scientific verdict is **CONDITIONAL**: **retrieval improvement without downstream verifier improvement** compared to baseline R0, but establishing that score calibration successfully cures the threshold starving mechanism.

---

## 2. Motivation & Forensic Background

In EXP-0032, raw cross-encoder relevance logits from `cross-encoder/ms-marco-MiniLM-L-6-v2` were passed through standard logistic sigmoid $\sigma(x) = \frac{1}{1 + e^{-x}}$ into `$maxSimilarity`.

Forensic score analysis (`EXP-0033-SCORE-DISTRIBUTION.md`) revealed that:
- For borderline and moderate in-curriculum claims, MiniLM outputs logits in $[-3.5, -1.0]$.
- Standard sigmoid mapped these logits to $[0.029, 0.269]$.
- The frozen E4 verifier gate at Stage 3:
  $$\text{if } \max_{c \in \text{retrieved}} \text{sim}(c) < 0.28 \implies \text{STATUS\_NOT\_ESTABLISHED}$$
  severed all downstream verification for any query whose top logit was below $-0.944$, falsely starving Tier-1 and Tier-2 reasoning of legitimate evidence.

---

## 3. Calibration Methodology & Development Sweep

Using $N = 432$ pairs from `EXP-0033-CALIBRATION-DATASET.json` (completely isolated from blind tests):

| Calibration Method | Mathematical Formulation | Brier Score | Log Loss | ECE (10 bins) | Optimization Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C1: Min-Max** | $p(x) = \frac{x - (-11.4976)}{8.5013 - (-11.4976)}$ | 0.0447 | 0.1798 | 0.0750 | Linear bounding |
| **C2: Sigmoid** | $p(x) = \frac{1}{1 + e^{-x}}$ | 0.0466 | 0.3221 | 0.0554 | Fixed baseline |
| **C3: Temp Scaling** | $p(x) = \frac{1}{1 + e^{-x / 2.6559}}$ | 0.0478 | 0.1920 | 0.0741 | Fitted $T=2.6559$ |
| **C4: Platt Scaling** | $p(x) = \frac{1}{1 + e^{-(0.6236 \cdot x + 3.2801)}}$ | **0.0283** | **0.1180** | **0.0107** | **Champion ($a=0.6236, b=3.2801$)** |

### Evidence-Gate Sweep Analysis (`EXP-0033-GATE-THRESHOLD-ANALYSIS.md`):
- Sweeping $\theta \in [0.15, 0.45]$ on development data showed that under Platt scaling, the in-curriculum pass rate remained rock-solid at **98.33%** across thresholds up to 0.45.
- $\theta = 0.35$ was selected for Mode E6, providing an additional $0.52$ logit safety margin against distractors.

---

## 4. Primary Blind Benchmark Evaluation ($N = 500$)

Evaluated across `EXP-0033-BLIND-DATASET.json` (SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`), featuring zero historical collisions against 3,600 previous benchmark queries.

### 4.1 Retrieval Quality Metrics (R0 vs. R4)

| Metric | Mode R0 (Baseline nomic/BM25) | Mode R4 (BGE/BM25/MiniLM) | Delta |
| :--- | :--- | :--- | :--- |
| **Recall@1** | 89.33% | **90.89%** | $+1.56\%$ |
| **Recall@3** | 97.78% | **98.44%** | $+0.66\%$ |
| **Recall@5** | 98.44% | **99.33%** | $+0.89\%$ |
| **MRR** | 0.9318 | **0.9451** | $+0.0133$ |
| **nDCG@5** | 0.9452 | **0.9574** | $+0.0122$ |
| **OOD Contamination Rate** | 34.00% | **6.00%** | **$-28.00\%$ (82.4% drop)** |

Mode R4 demonstrates unambiguous retrieval superiority over R0 across all ranking and safety metrics.

---

### 4.2 Downstream Premise Verifier Performance (Modes E0–E6)

| Mode | Configuration | Accuracy | Macro F1 | FAR | FRR | Sup. Recall | Ref. Recall | NE Recall | False Abstentions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E0** | Baseline R0 + E4 Verifier (Gate 0.28) | **69.60%** | **68.58%** | **23.00%** | 14.55% | **77.00%** | **56.79%** | 73.60% | **18** |
| **E1** | Mode R4 + Raw Logit + E4 (Gate 0.28) | 48.20% | 46.45% | 62.44% | 10.33% | 37.56% | 24.69% | 96.80% | 111 |
| **E3** | Mode R4 + Standard Sigmoid + E4 | 51.80% | 50.73% | 57.28% | 11.27% | 42.72% | 30.86% | 94.40% | 98 |
| **E4** | Mode R4 + Temp Scaling ($T=2.66$) | 56.00% | 55.16% | 51.17% | 12.21% | 48.83% | 36.42% | 93.60% | 83 |
| **E2** | Mode R4 + Min-Max Calibration | 60.80% | 60.07% | 41.31% | 13.15% | 58.69% | 43.83% | 86.40% | 60 |
| **E5** | Mode R4 + **Platt Scaling** (Gate 0.28) | **62.00%** | **61.38%** | **38.97%** | 13.15% | **61.03%** | **48.15%** | 81.60% | **55** |
| **E6** | Mode R4 + Platt Scaling + **Gate 0.35** | **62.00%** | **61.47%** | **40.85%** | 13.15% | **59.15%** | **48.15%** | 84.80% | **59** |

---

### 4.3 Category-Specific Accuracy Breakdown

| Category | $N$ | E0 (R0 Baseline) | E3 (Uncalibrated R4) | E5 (Platt Calibrated R4) | E6 (Platt + Gate 0.35) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SUPPORTED** | 125 | **72.80%** | 38.40% | **56.80%** | 55.20% |
| **FALSE_PREMISE** | 125 | **55.20%** | 28.80% | **47.20%** | 47.20% |
| **AMBIGUOUS** | 75 | 61.33% | **92.00%** | 73.33% | 78.67% |
| **OOD (Overall)** | 50 | 92.00% | **98.00%** | 94.00% | 94.00% |
| *— KNOWN_OOD* | 25 | 96.00% | 96.00% | 96.00% | 96.00% |
| *— NOVEL_OOD* | 25 | 88.00% | **100.00%** | **92.00%** | **92.00%** |
| **PARAPHRASE** | 50 | **84.00%** | 52.00% | 68.00% | 68.00% |
| **ADVERSARIAL** | 75 | **72.00%** | 41.33% | 58.67% | 56.00% |

---

## 5. Statistical Hypothesis Testing (McNemar Tests)

| Comparison | $n_{00}$ | $n_{11}$ | $n_{01}$ (A wrong, B right) | $n_{10}$ (A right, B wrong) | $\chi^2$ (corrected) | $p$-value | Scientific Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E3 vs. E5** (Raw Sigmoid vs. Platt) | 174 | 243 | **67** | **16** | **30.1205** | **$3.8 \times 10^{-8}$** | **Platt Scaling decisively cures raw R4** |
| **E3 vs. E6** (Raw Sigmoid vs. Platt+Gate) | 178 | 247 | **63** | **12** | **33.3333** | **$7.7 \times 10^{-9}$** | **Significant improvement over raw R4** |
| **E0 vs. E5** (Baseline R0 vs. Platt) | 139 | 297 | **13** | **51** | **21.3906** | **$0.000002$** | **R0 remains superior downstream** |
| **E0 vs. E6** (Baseline R0 vs. Platt+Gate) | 136 | 294 | **16** | **54** | **19.5571** | **$0.000005$** | **R0 remains superior downstream** |

---

## 6. Root Cause Forensic Analysis: The Residual Gap

Why does Platt-calibrated R4 (62.00%) not beat baseline R0 (69.60%)?

Forensic inspection of the 51 regressions ($n_{10} = 51$) revealed:
1. **The MS-MARCO Cross-Encoder Domain Bias (44 / 51 cases, 86.3%):**
   - For non-lexical claims that convey curriculum concepts without sharing exact keyword tokens (e.g., `EXP33-SUP-0020`: *"Does em unit compute dimensions relative to the font size of the immediate parent?"*), `ms-marco-MiniLM-L-6-v2` assigns extreme negative pre-activation logits ($-9.0$ to $-11.5$).
   - Platt scaling correctly maps logits around $-2.5$ to $0.85$, but cannot map $-11.0$ above $0.28$ without also passing true OOD queries.
   - In contrast, nomic-embed-text (R0) produces a dense cosine similarity of $0.5021$, easily clearing the gate.
2. **Upstream Dense Retrieval Misses (7 / 51 cases, 13.7%):**
   - In 7 cases, BGE dense retrieval failed to include the gold curriculum chunk in the top-10 candidate pool sent to MiniLM.

---

## 7. Hardware & Resource Telemetry

All benchmarks executed strictly locally within the hardware envelope:
- **GPU:** NVIDIA RTX 3050 Laptop GPU (4 GB VRAM) — VRAM used: **2.32 GB / 4.00 GB (58.0%)**.
- **CPU:** Intel Core i5-12450H — BGE embedding & MiniLM cross-encoder executed on CPU.
- **RAM:** 15.32 GB / 15.68 GB.
- **Retrieval Latency:**
  - R0: p50 = **61.76 ms**, p95 = **70.54 ms**, Mean = **62.13 ms**.
  - R4: p50 = **431.43 ms**, p95 = **499.16 ms**, Mean = **411.41 ms**.
- **Calibration Overhead:** **5.96 $\mu$s to 6.20 $\mu$s per query** (completely negligible).
- **Verifier Latency (cached):** p50 = **15.00 ms to 16.55 ms**.

---

## 8. Final Synthesis & Recommendations

### Scientific Takeaways:
1. **Calibration Is Mandatory:** Directly passing raw or sigmoid-mapped cross-encoder scores into hardcoded similarity gates produces disastrous downstream collapse ($-17.8\%$ accuracy, $57\%$ FAR). Platt scaling recovers $10.2\%$ accuracy and cures 43 false abstentions.
2. **Threshold Tuning Has Hit Diminishing Returns:** Modifying the evidence gate threshold ($\theta=0.35$ vs $\theta=0.28$) yielded identical accuracy (62.00%). Further threshold tweaking cannot distinguish between true OOD queries and MS-MARCO false-negative logits.
3. **The Path Forward (EXP-0034):**
   - **Hybrid Dense-Cross Score Ensembling:** Compute final evidence similarity as a weighted blend of dense cosine similarity and Platt-calibrated cross-encoder probability:  
     $$S_{\text{final}} = \alpha S_{\text{dense}} + (1 - \alpha) P_{\text{Platt}}$$
   - **Candidate Pool Expansion:** Expand the candidate pool from 10 to 15 chunks before reranking.
