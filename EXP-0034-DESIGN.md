# EXP-0034: Experimental Design Document
## Hybrid Dense-Cross Reranking and Candidate Pool Study

**Experiment ID:** EXP-0034  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `exp-0034`  
**Parent Lineage (EXP-0033 Audit Commit):** `0d1ecc9`  
**EXP-0033 Audited Commit:** `75f4755`  
**EXP-0032 Parent Commit:** `79ef335`  
**Frozen Verifier Ancestor:** `01d6220` (EXP-0031 E4 verifier commit)  
**Date:** 2026-09-16  

---

## 1. Immutability and Lineage Declaration

**STRICT IMMUTABILITY CLAUSE:**
All artifacts, code, datasets, caches, results, and reports from experiments EXP-0031, EXP-0032, and EXP-0033 remain strictly **IMMUTABLE**. No historical commit or artifact shall be altered, deleted, or overwritten. Specifically:
- `EXP-0033-BLIND-DATASET.json` remains frozen as the authoritative blind evaluation benchmark ($N = 500$).
- `EXP-0033-CALIBRATION-DATASET.json` ($N = 432$) and `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$) serve strictly as independent development resources.
- `backend/rag_premise_verifier.php` remains frozen at commit `01d6220` (E4 mode logic and rules unchanged).
- No blind labels will be inspected or utilized to select normalization methods, fusion weights ($\alpha$), candidate pool sizes, or gate thresholds.

---

## 2. Research Question & Problem Formulation

### Context from EXP-0033
EXP-0033 independently audited and reproduced the following downstream verification performance:
- **Baseline R0:** 69.60% Accuracy, 23.00% FAR, 18 False Abstentions.
- **Raw R4 (EXP-0032):** 51.80% Accuracy, 57.28% FAR, 98 False Abstentions.
- **Platt Calibrated R4 (E5):** 62.00% Accuracy, 38.97% FAR, 55 False Abstentions ($p = 1.39 \times 10^{-8}$ vs E3).

While Platt calibration successfully rescued 43 borderline cases whose raw logits fell in $[-3.5, -1.0]$, **a significant gap of $-7.60$ pp to Baseline R0 remained** ($p = 1.88 \times 10^{-6}$).

Forensic error analysis in EXP-0033 demonstrated that:
1. **44 of 51 regressions (86.3%)** were caused by an upstream cross-encoder domain bias: MS-MARCO MiniLM assigns severe negative logits ($-9.0$ to $-11.5$, Platt probability $< 0.01$) to valid curriculum passages expressing conceptual relationships without high surface-lexical token overlap.
2. **7 of 51 regressions (13.7%)** were caused by candidate pool truncation: the gold curriculum chunk was absent from the initial top-10 dense candidates passed to the reranker.
3. Because dense embeddings (e.g., BGE-small, nomic) capture conceptual semantic proximity effectively (dense cosine similarity $0.50 - 0.65$ on those same missed passages), hybrid score fusion ($S_{\text{final}} = \alpha S_{\text{dense\_norm}} + (1-\alpha) P_{\text{Platt}}$) and candidate pool expansion ($10 \to 15$) represent the mathematically principled solution.

### Primary Research Question
Can hybrid dense retrieval/reranking score fusion combined with candidate pool expansion recover the conceptual curriculum evidence lost by the MS-MARCO MiniLM cross-encoder, bridging the downstream performance gap to Baseline R0 while preserving the strict OOD rejection and low False Acceptance Rate (FAR) of the E4 verification pipeline under local hardware constraints (RTX 3050 4 GB VRAM / 16 GB RAM)?

---

## 3. Scientific Hypotheses

- **Hypothesis H1 (Conceptual Recovery via Dense Fusion):** Linear blending of normalized dense cosine similarities with Platt-calibrated cross-encoder probabilities ($S_{\text{final}} = \alpha S_{\text{dense\_norm}} + (1-\alpha) P_{\text{Platt}}$) will elevate non-lexical conceptual curriculum evidence above the Stage 3 evidence adequacy gate, recovering $\ge 50\%$ of the 44 severe-negative-logit regressions identified in EXP-0033.
- **Hypothesis H2 (Candidate Pool Truncation Mitigation):** Expanding the dense candidate pool from top-10 to top-15 will increase evidence recall for queries where the target chunk was ranked in positions 11–15, rescuing at least 4 of the 7 pool-truncation regressions without degrading reranking latency beyond acceptable interactive limits ($< 500$ ms).
- **Hypothesis H3 (Safety Preservation):** The hybrid pipeline will preserve downstream FAR $\le 25.0\%$ (matching or closely bounding Baseline R0: 23.00%) and Novel-OOD rejection $\ge 88.0\%$, ensuring that dense score blending does not inadvertently inflate out-of-curriculum noise above the evidence gate.
- **Hypothesis H4 (Downstream Parity / Non-Inferiority to R0):** Mode M2 (top-15 candidate pool with optimal $\alpha$) will achieve statistical non-inferiority to Baseline R0 on the blind benchmark ($p > 0.05$ via two-tailed McNemar test, or falling within a pre-declared margin $\Delta \le 3.0$ pp).

---

## 4. Controlled Experimental Modes

| Mode | Pipeline Architecture | Candidate Pool | Fusion Formula | Calibration / Normalization | Gate Threshold | Verifier |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **M0** | Frozen Baseline R0 (nomic 768d + BM25 + RRF + rule rerank) | 10 | None (Raw Cosine) | None | 0.28 | Frozen E4 (`01d6220`) |
| **M1** | Hybrid Dense-Cross Rerank (BGE-small 384d + MiniLM CPU) | 10 | $S = \alpha S_{\text{dense\_norm}} + (1-\alpha) P_{\text{Platt}}$ | Platt ($a=0.6236, b=3.2801$) + Frozen Norm | Frozen $\theta$ | Frozen E4 (`01d6220`) |
| **M2** | Expanded Candidate Pool Hybrid (BGE-small 384d + MiniLM CPU) | 15 | $S = \alpha S_{\text{dense\_norm}} + (1-\alpha) P_{\text{Platt}}$ | Platt ($a=0.6236, b=3.2801$) + Frozen Norm | Frozen $\theta$ | Frozen E4 (`01d6220`) |
| **M3** | Pool-Size Ablation (Development Only) | 10, 15, 20 | Varying Pool Sizes | Same as M1 | Frozen $\theta$ | Frozen E4 (`01d6220`) |
| **M4** | Alpha Ablation (Development Only) | 15 | $\alpha \in \{0.0, 0.1, \dots, 1.0\}$ | Same as M1 | Frozen $\theta$ | Frozen E4 (`01d6220`) |
| **M5** | Frozen Champion Hybrid Configuration | Selected Pool | Selected $\alpha^*$ | Selected Normalization | Selected $\theta^*$ | Frozen E4 (`01d6220`) |

---

## 5. Development Protocols and Pre-Registration

### Development Datasets
All tuning of dense normalization methods, fusion weight $\alpha$, candidate pool size, and evidence gate threshold $\theta$ will be conducted exclusively on:
1. `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)
2. `EXP-0033-CALIBRATION-DATASET.json` ($N = 432$ query-chunk pairs)

**ZERO BLIND DATA LEAKAGE:** The blind test set `EXP-0033-BLIND-DATASET.json` will remain strictly untouched and uninspected until the final configuration is formally locked in `EXP-0034-CONFIG-FROZEN.json`.

### Pre-Declared Non-Inferiority Margin
- **Authoritative R0 Reference Accuracy:** 69.60% (348 / 500)
- **Non-Inferiority Margin ($\Delta$):** $3.00$ percentage points ($66.60\%$)
- **Statistical Non-Inferiority Condition:** McNemar test two-tailed $p > 0.05$ when compared against Mode M0.
- **Safety Boundary:** Downstream FAR $\le 25.0\%$, Novel-OOD rejection $\ge 88.0\%$.

### Pre-Registered Tie-Breaking Decision Rule
If multiple candidate configurations $(\alpha, \text{pool\_size})$ perform within $1.0$ percentage point of downstream accuracy on development data, the winning configuration will be selected according to the following strict priority:
1. **Lowest Downstream FAR** (prioritizing safety against false acceptances).
2. **Highest Novel-OOD Rejection Rate** (preserving out-of-curriculum boundaries).
3. **Lowest Candidate Pool Size** (preferring top-10 or top-15 over top-20 to conserve CPU inference budget).
