# EXP-0033: Experimental Design Document
## Cross-Encoder Score Calibration + Evidence-Gate Adaptation

**Experiment ID:** EXP-0033  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `exp-0033`  
**Parent Lineage:** `EXP-0032` (commit `79ef335`)  
**Frozen Verifier Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Date:** 2026-09-16  

---

## 1. Problem Formulation & Research Question

In EXP-0032, replacing the baseline nomic/BM25 retrieval stack (R0) with an open-source hybrid stack featuring `cross-encoder/ms-marco-MiniLM-L-6-v2` reranking (R4) demonstrated substantial retrieval precision improvements (e.g., eliminating Out-Of-Distribution contamination from 10.0% to 3.3%). However, it induced a severe **downstream verifier regression**:
- Accuracy collapsed from **65.00% (R0) to 58.33% (R4)** ($p = 0.0042$, McNemar test).
- False Acceptance Rate (FAR) surged from **23.48% to 42.42%**.
- 36 queries that succeeded under R0 failed under R4 ($n_{10} = 36$).

### Forensic Diagnosis
Forensic analysis (`EXP-0033-SCORE-DISTRIBUTION.md`) established that the failure was **not an information retrieval failure**, but a **score-scale collision**:
1. The frozen E4 verifier includes an evidence adequacy gate at Stage 3:
   $$\text{if } \max_{c \in \text{retrieved}} \text{sim}(c) < 0.28 \implies \text{STATUS\_NOT\_ESTABLISHED}$$
2. In EXP-0032, MiniLM raw logits $x$ were converted to similarity via standard logistic sigmoid:
   $$\text{sim}(c) = \sigma(x) = \frac{1}{1 + e^{-x}}$$
3. For borderline and moderate in-curriculum relevant evidence, MiniLM outputs logits in $[-3.5, -1.0]$, which map to $\sigma(x) \in [0.029, 0.269] < 0.28$. Consequently, genuine curriculum evidence was discarded at Stage 3 as "insufficient evidence", preventing the query from reaching Tier-1 opposite dictionaries or Tier-2 NLI reasoning.

### Research Question
Can principled score calibration (parametric/non-parametric) and/or evidence-gate adaptation recover the downstream verifier accuracy and safety of Mode R4 without sacrificing its superior retrieval precision and OOD suppression?

---

## 2. Scientific Hypotheses

- **Hypothesis H1 (Calibration Recovery):** Recalibrating MiniLM logits using an independent development dataset (via Platt scaling or temperature scaling) will map true curriculum evidence above the frozen 0.28 evidence gate while keeping OOD queries below the gate, recovering $\ge 70\%$ of the 36 false abstentions.
- **Hypothesis H2 (Safety & Precision Preservation):** Calibrated R4 (E5/E6) will reduce downstream FAR to $\le 25.0\%$ (matching or beating R0: 23.48%) while maintaining Novel-OOD rejection $\ge 90.0\%$.
- **Hypothesis H3 (Downstream Parity or Superiority):** Downstream accuracy for Calibrated R4 (E5/E6) will significantly outperform uncalibrated R4 ($p < 0.01$) and achieve non-inferiority or statistical parity with R0 ($p > 0.05$).

---

## 3. Calibration Candidates (Fitted on Independent Development Data)

Using $N = 432$ query-chunk pairs from `EXP-0033-CALIBRATION-DATASET.json`:
- **C0 (Raw):** Direct logit passed through min-max bounding.
- **C1 (Min-Max):** $p(x) = \frac{x - (-11.4976)}{8.5013 - (-11.4976)}$.
- **C2 (Sigmoid):** $p(x) = \frac{1}{1 + e^{-x}}$.
- **C3 (Temperature Scaling):** $p(x) = \frac{1}{1 + e^{-x / 2.6559}}$ ($T^* = 2.6559$, NLL = 0.1920).
- **C4 (Platt Scaling):** $p(x) = \frac{1}{1 + e^{-(0.6236 \cdot x + 3.2801)}}$ ($a = 0.6236, b = 3.2801$, NLL = 0.1180, Brier = 0.0283, ECE = 0.0107).

---

## 4. Experimental Modes Definition

| Mode | Retrieval Pipeline | Calibration Method | Evidence Gate Threshold | Downstream Verifier |
| :--- | :--- | :--- | :--- | :--- |
| **E0** | Baseline R0 (nomic 768d + BM25 + RRF + rule rerank) | None (Cosine Sim) | 0.28 (Frozen baseline) | Frozen EXP-0031 E4 |
| **E1** | Mode R4 (BGE 384d + BM25 + RRF + MiniLM CPU) | Raw Logits (Min-Max normalized) | 0.28 (Frozen baseline) | Frozen EXP-0031 E4 |
| **E2** | Mode R4 | C1: Empirical Min-Max | 0.28 (Frozen baseline) | Frozen EXP-0031 E4 |
| **E3** | Mode R4 | C2: Standard Sigmoid | 0.28 (Frozen baseline) | Frozen EXP-0031 E4 |
| **E4** | Mode R4 | C3: Temperature Scaling ($T=2.6559$) | 0.28 (Frozen baseline) | Frozen EXP-0031 E4 |
| **E5** | Mode R4 | C4: Platt Scaling ($a=0.6236, b=3.2801$) | 0.28 (Frozen baseline) | Frozen EXP-0031 E4 |
| **E6** | Mode R4 | C4: Platt Scaling | 0.35 (Tuned on dev set) | Frozen EXP-0031 E4 |

---

## 5. Primary Blind Dataset Specification ($N = 500$)

To ensure strict zero-leakage evaluation, a new $N = 500$ blind dataset will be constructed across the approved curriculum modules:
- **SUPPORTED:** 125 cases
- **FALSE_PREMISE:** 125 cases
- **AMBIGUOUS:** 75 cases
- **OUT_OF_CURRICULUM (OOD):** 50 cases
- **PARAPHRASE:** 50 cases
- **ADVERSARIAL:** 75 cases

All queries must be checked for zero exact or near-duplicate overlap with `EXP-0025-DEVELOPMENT-DATASET.json` and prior blind test sets. Dataset SHA-256 will be frozen before evaluation.

---

## 6. Target Metrics & Statistical Testing

### 6.1 Downstream Verifier Metrics
- Overall Accuracy (%)
- Macro F1 (%)
- False Acceptance Rate (FAR, %): $\frac{\text{False Accepted}}{\text{Total Negative}}$
- False Refutation Rate (FRR, %): $\frac{\text{False Refuted}}{\text{Total Positive}}$
- Supported Recall (%)
- Refutation Recall (%)
- NOT_ESTABLISHED Recall (%)
- Sub-category accuracies: OOD, Novel-OOD, Ambiguity, Paraphrase, Adversarial.

### 6.2 Statistical Rigor
- Contingency matrix: $n_{00}, n_{01}, n_{10}, n_{11}$.
- Edwards-corrected McNemar $\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$ and exact two-sided binomial test $p$-values.
- Primary comparisons:
  1. E0 (Baseline R0) vs. E5 (Platt Calibrated R4)
  2. E0 (Baseline R0) vs. E6 (Platt Calibrated R4 + Tuned Gate)
  3. E3 (Raw Sigmoid R4) vs. E5 (Platt Calibrated R4)

### 6.3 Hardware Budget & Execution Guardrails
- **Host GPU:** NVIDIA RTX 3050 Laptop GPU (4 GB VRAM) — reserved for Ollama LLM.
- **CPU:** Intel Core i5-12450H (16 GB RAM) — strictly hosts BGE embedding model and MiniLM cross-encoder.
- **Offline Invariant:** Zero external network calls.
- **Decision Policy:** Result will be classified as `PROMISING`, `CONDITIONAL`, or `NO MEANINGFUL IMPROVEMENT` (no `CHAMPION` declaration allowed).
