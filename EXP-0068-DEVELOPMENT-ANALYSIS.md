# EXP-0068 Development Analysis: Dedicated NLI Cross-Encoder Architecture Benchmark

**Experiment ID:** EXP-0068  
**Date:** 2026-09-26  
**Status:** Complete Development Evaluation (Negative Result)  
**Repository:** `EduConnect-LMS-Experimental`  
**Starting HEAD:** `d217d456218213184f4c88d79d0281e4053156a3` (`d217d45`)  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (Untouched)  

---

## 1. Benchmark Execution & Conditions Overview

EXP-0068 evaluated the architectural hypothesis that dedicated off-the-shelf sequence-classification NLI cross-encoders outperform a generative instruction LLM (`llama3.2:latest`) operating zero-shot via JSON prompting.

All conditions were evaluated across the complete development set (`EXP-0025-DEVELOPMENT-DATASET.json`, $N=400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`) using identical pre-retrieved evidence pools (`scratch/exp0056_dev_c1_cache.json`) and the frozen A4 verifier backend. Exactly 192 cases were resolved deterministically by Tier-1 fast-paths in all conditions, ensuring 100.0% isolation of the Tier-2 NLI model on the remaining 208 cases.

### Evaluated Conditions:
- **C0 (Frozen Control):** `llama3.2:latest` (~3.2B parameters, Q4_K_M) via Ollama, evaluating prompt P4/P4_neutral with frozen thresholds ($\tau_{\text{entail}}=0.85, \tau_{\text{contra}}=0.80$).
- **C1 (NLI MiniLM2):** `cross-encoder/nli-MiniLM2-L6-H768` (82,120,707 parameters, commit `b95119ce93d3e065de6214e38cd4a97b0f2f2c6d`), native sequence-classification head with 3-class argmax.
- **C2 (DeBERTa NLI):** `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` (184,424,451 parameters, commit `6f5cf0a2b59cabb106aca4c287eed12e357e90eb`), native sequence-classification head with 3-class argmax.

---

## 2. Primary Comparative Metrics

| Metric | C0 Control (`llama3.2`) | C1 (`nli-MiniLM2`) | C2 (`DeBERTa-v3`) | C1 vs C0 Delta | C2 vs C0 Delta |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall Accuracy** | **92.00%** (368/400) | **70.00%** (280/400) | **68.00%** (272/400) | **-22.00 pp** | **-24.00 pp** |
| **Macro F1 Score** | **92.67%** | **68.60%** | **66.18%** | **-24.07 pp** | **-26.49 pp** |
| **False Acceptance Rate (FAR)** | 6.00% (9/150) | **0.67%** (1/150) | **1.33%** (2/150) | **-5.33 pp** | **-4.67 pp** |
| **False Rejection Rate (FRR)** | 12.67% (19/150) | **11.33%** (17/150) | **11.33%** (17/150) | -1.34 pp | -1.34 pp |
| **Supported Recall** | **87.33%** (131/150) | **38.67%** (58/150) | **33.33%** (50/150) | **-48.66 pp** | **-54.00 pp** |
| **Refutation Recall** | **92.67%** (139/150) | **83.33%** (125/150) | **82.00%** (123/150) | -9.34 pp | -10.67 pp |
| **OOD Recall (Safety)** | 98.00% (98/100) | 97.00% (97/100) | **99.00%** (99/100) | -1.00 pp | +1.00 pp |
| **Parse Failure Rate** | 0.00% | 0.00% | 0.00% | 0.00 pp | 0.00 pp |

---

## 3. Statistical Significance Testing (Paired McNemar Test)

Pairwise $2 \times 2$ contingency tables against C0 ($N=400$):

### C1 vs C0
- $n_{00}$ (Both Correct): 278
- $n_{11}$ (Both Wrong): 30
- $n_{01}$ (C0 Correct, C1 Wrong — Regressed): **90**
- $n_{10}$ (C0 Wrong, C1 Correct — Recovered): **2**
- **Paired Accuracy Delta:** **-22.00 pp**
- **Exact Binomial McNemar Test:** $p = 4.82 \times 10^{-24}$ (Statistically significantly inferior to C0)

### C2 vs C0
- $n_{00}$ (Both Correct): 270
- $n_{11}$ (Both Wrong): 30
- $n_{01}$ (C0 Correct, C2 Wrong — Regressed): **98**
- $n_{10}$ (C0 Wrong, C2 Correct — Recovered): **2**
- **Paired Accuracy Delta:** **-24.00 pp**
- **Exact Binomial McNemar Test:** $p = 4.04 \times 10^{-27}$ (Statistically significantly inferior to C0)

---

## 4. Hard-Stratum Analysis

All 400 cases evaluated across the pre-registered strata:

| Stratum ID | Description | $N$ | C0 Accuracy | C1 Accuracy | C2 Accuracy | Primary Impact |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **S1** | Antonym-Assisted | 81 | 77.78% | 64.20% | 61.73% | Modest drop due to Tier-1 override |
| **S2** | Non-Antonym | 319 | **95.61%** | **71.47%** | **69.59%** | Severe drop (-24.14 pp / -26.02 pp) |
| **S3** | High-Overlap Support | 100 | **85.00%** | **30.00%** | **29.00%** | Catastrophic collapse (-55.00 pp / -56.00 pp) |
| **S4** | Low-Overlap Paraphrase | 50 | **92.00%** | **56.00%** | **42.00%** | Severe collapse (-36.00 pp / -50.00 pp) |
| **S5** | Normative / Universal | 81 | 91.36% | 59.26% | 61.73% | Hyper-neutrality on normative claims |
| **S6** | Compound Multi-Clause | 75 | 90.67% | 76.00% | 76.00% | Partial drop (-14.67 pp) |
| **S7** | Out-of-Curriculum OOD | 100 | 98.00% | 97.00% | **99.00%** | Preserved (Gate C passed) |

---

## 5. Probability Calibration Analysis

Unlike generative LLMs that require string parsing, sequence classification heads expose direct class probabilities:

| Diagnostic Metric | C1 (`nli-MiniLM2`) | C2 (`DeBERTa-v3`) |
| :--- | :---: | :---: |
| **Total Tier-2 Inferences Logged** | 382 | 382 |
| **Overall Mean Confidence** | 0.7630 ($\pm 0.1705$) | 0.8573 ($\pm 0.1512$) |
| **Overall Median Confidence** | 0.7831 | 0.9282 |
| **Overall Mean Margin ($P_{\text{top1}} - P_{\text{top2}}$)** | 0.5743 | 0.7374 |
| **Overall Mean Entropy** | 0.5599 | 0.3705 |
| **Correct Predictions Mean Conf** | 0.9071 | 0.8893 |
| **Incorrect Predictions Mean Conf** | 0.3595 | 0.3617 |
| **Mean $P(\text{CONTRADICTION})$** | 0.2332 | 0.1184 |
| **Mean $P(\text{ENTAILMENT})$** | 0.2784 | 0.2410 |
| **Mean $P(\text{NEUTRAL})$** | **0.4884** | **0.6405** |

### Key Calibration Insights:
1. **Calibration Separation:** In both cross-encoders, correct predictions had high confidence (~0.89–0.91), while incorrect predictions had low confidence (~0.36), reflecting that errors primarily stemmed from the verifier's fallback when argmax predicted neutral.
2. **Massive Neutrality Skew:** In DeBERTa, 64.05% of probability mass was concentrated on `NEUTRAL`, and 69.90% (267/382) of all inferences predicted `NEUTRAL` as the top class.

---

## 6. Computational & Resource Profiles

| Metric | C0 Control (`llama3.2`) | C1 (`nli-MiniLM2`) | C2 (`DeBERTa-v3`) |
| :--- | :---: | :---: | :---: |
| **Parameters** | 3,212,749,824 | 82,120,707 | 184,424,451 |
| **Model Size on Disk** | 1,925.5 MB (GGUF) | 313.3 MB (Safetensors) | 362.4 MB (Safetensors) |
| **Load Time** | 0.8 s | 1.2 s | 2.8 s |
| **Peak RAM** | 2,400 MB | 550 MB | 850 MB |
| **Tier-2 Mean Latency** | 2,266.9 ms | **26.7 ms** | 846.5 ms |
| **Tier-2 Median Latency (P50)** | 1,790.7 ms | **26.4 ms** | 815.2 ms |
| **Tier-2 P95 Latency** | 3,587.5 ms | **37.3 ms** | 1,113.2 ms |
| **Tier-2 Throughput** | 0.44 queries/sec | **37.51 queries/sec** (85x faster) | 1.18 queries/sec (2.7x faster) |

---

## 7. Advancement Gate Decisions

```text
Gate A: False Acceptance Reduction        -> PASS (FAR: C0=6.00%, C1=0.67%, C2=1.33%)
Gate B: Supported Recall Preservation    -> FAIL (SupRec: C0=87.33%, C1=38.67%, C2=33.33%; Requirement: >=84.33%)
Gate C: OOD Safety Preservation          -> PASS (OODRec: C0=98.00%, C1=97.00%, C2=99.00%; Requirement: >=95.00%)
Gate D: Development Non-Inferiority      -> FAIL (Delta: C1=-22.00 pp, C2=-24.00 pp; p < 1e-23)
Gate E: Hard-Stratum Survivability       -> FAIL (S2 dropped >24 pp, S4 dropped >36 pp)
Gate F: Computational Viability          -> PASS (Peak RAM < 1 GB, Latency 26ms for C1, 846ms for C2)
```

**Overall Outcome:** FAILED GATES.  
Pre-registered stop rule enforced: **Do NOT run blind validation**. Holdout dataset `EXP-0033-BLIND-DATASET.json` remains sealed.
