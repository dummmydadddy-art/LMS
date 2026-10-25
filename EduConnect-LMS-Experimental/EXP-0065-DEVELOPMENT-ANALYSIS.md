# EXP-0065: Development Benchmark Analysis

**Experiment Identifier:** EXP-0065  
**Stage:** Phase 1 — Development Evaluation  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256 Verified)  
**Date:** 2026-09-26  
**Status:** COMPLETE — ADVANCEMENT GATE EVALUATED  

---

## 1. Primary Benchmark Scorecard ($N = 400$)

| Evaluation Metric | C0: Baseline (`llama3.2:latest`) | C1: Intermediate (`qwen3:4b`) | C2: Larger (`qwen3:8b`) | Delta (C1 - C0) | Delta (C2 - C0) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Model Parameter Scale** | ~3.2B | ~4.0B | ~8.2B | +0.8B | +5.0B |
| **Quantization** | Q4_K_M (2.0 GB) | Q4_K_M (2.5 GB) | Q4_K_M (5.2 GB) | — | — |
| **Runtime Residency** | 100% GPU VRAM | 100% GPU VRAM | Partial GPU + CPU/RAM | — | — |
| **Overall Accuracy** | **92.00%** (368/400) | **89.25%** (357/400) | **86.00%** (344/400) | **-2.75 pp** | **-6.00 pp** |
| **Macro F1 Score** | **92.67%** | **89.56%** | **85.79%** | -3.11 pp | -6.88 pp |
| **Standard FAR (Safety)** | **4.00%** (10/250) | **2.00%** (5/250) | **2.00%** (5/250) | **-2.00 pp** | **-2.00 pp** |
| **FRR (False Rejection)** | **12.67%** (19/150) | **22.00%** (33/150) | **29.33%** (44/150) | **+9.33 pp** | **+16.66 pp** |
| **Refutation Recall** | **92.67%** (139/150) | **94.00%** (141/150) | **92.67%** (139/150) | **+1.33 pp** | 0.00 pp |
| **Supported Recall** | **87.33%** (131/150) | **78.00%** (117/150) | **70.67%** (106/150) | **-9.33 pp** | **-16.66 pp** |
| **NOT_ESTABLISHED Recall**| **98.00%** (98/100) | **99.00%** (99/100) | **99.00%** (99/100) | +1.00 pp | +1.00 pp |
| **Structured Parse Failures** | **0** (0.0%) | **0** (0.0%) | **0** (0.0%) | 0 | 0 |
| **Mean Latency per Query** | 1,196.4 ms | 739.3 ms | 2,505.8 ms | -457.1 ms (-38%) | +1,309.4 ms (+109%) |
| **P50 (Median) Latency** | 1,701.3 ms | 1,027.9 ms | 3,394.5 ms | -673.4 ms | +1,693.2 ms |
| **P95 Latency** | 3,503.7 ms | 2,146.5 ms | 6,953.3 ms | -1,357.2 ms | +3,449.6 ms |
| **Peak VRAM Utilization** | 2,203 MiB / 4,096 MiB | 2,490 MiB / 4,096 MiB | 2,359 MiB / 4,096 MiB | +287 MiB | +156 MiB |
| **Peak Host RAM Overhead** | ~120 MiB | ~150 MiB | ~3,400 MiB | +30 MiB | +3,280 MiB |

---

## 2. Paired Statistical Evaluation against C0

### Candidate C1 (`qwen3:4b`) vs C0 Control
- **Both Correct ($n_{11}$):** 345
- **Both Incorrect ($n_{00}$):** 20
- **Candidate Gains ($n_{10}$ — C1 correct, C0 wrong):** 12
- **Candidate Regressions ($n_{01}$ — C0 correct, C1 wrong):** 23
- **Total Discordant Pairs:** 35
- **Paired Accuracy Delta ($\Delta$):** **-2.75 pp**
- **Standard Error ($\text{SE}_{\Delta}$):** 1.4726 pp
- **Two-Sided 95% Confidence Interval:** `[-5.64 pp, +0.14 pp]`
- **One-Sided 95% Lower Confidence Bound (LCB):** **-5.17 pp** (violates non-inferiority margin of $-3.00$ pp)
- **Exact McNemar 2-Sided $p$-value:** **$p = 0.089531$**
- **Statistical Finding:** C1 is numerically inferior and does not establish non-inferiority to C0 under the $-3.00$ pp margin ($\text{LCB} = -5.17 < -3.00$).

---

### Candidate C2 (`qwen3:8b`) vs C0 Control
- **Both Correct ($n_{11}$):** 332
- **Both Incorrect ($n_{00}$):** 20
- **Candidate Gains ($n_{10}$ — C2 correct, C0 wrong):** 12
- **Candidate Regressions ($n_{01}$ — C0 correct, C2 wrong):** 36
- **Total Discordant Pairs:** 48
- **Paired Accuracy Delta ($\Delta$):** **-6.00 pp**
- **Standard Error ($\text{SE}_{\Delta}$):** 1.7059 pp
- **Two-Sided 95% Confidence Interval:** `[-9.34 pp, -2.66 pp]`
- **One-Sided 95% Lower Confidence Bound (LCB):** **-8.81 pp** (severe violation of $-3.00$ pp margin)
- **Exact McNemar 2-Sided $p$-value:** **$p = 0.000717$** ($p < 0.001$)
- **Statistical Finding:** C2 is **statistically significantly INFERIOR** to C0 ($p < 0.001$). Scaling to 8B capacity with offload substantially degrades verifier performance.

---

## 3. Category-by-Category Forensic Breakdown ($N = 400$)

| Dataset Category | $N$ | C0 Accuracy | C1 Accuracy | C2 Accuracy | C1 Discordance ($n_{10} / n_{01}$) | C2 Discordance ($n_{10} / n_{01}$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **SUPPORTED_CURRICULUM** | 100 | **85.00%** (85) | **74.00%** (74) | **67.00%** (67) | 5 / 16 (-11 net) | 4 / 22 (-18 net) |
| **NOVEL_FALSE_PREMISE** | 100 | **94.00%** (94) | **95.00%** (95) | **95.00%** (95) | 4 / 3 (+1 net) | 5 / 4 (+1 net) |
| **OUT_OF_CURRICULUM_UNKNOWN** | 100 | **98.00%** (98) | **99.00%** (99) | **99.00%** (99) | 1 / 0 (+1 net) | 1 / 0 (+1 net) |
| **LEGITIMATE_NEGATION** | 50 | **92.00%** (46) | **86.00%** (43) | **78.00%** (39) | 0 / 3 (-3 net) | 0 / 7 (-7 net) |
| **MIXED_COMPOUND_PREMISE** | 50 | **86.00%** (43) | **88.00%** (44) | **84.00%** (42) | 2 / 1 (+1 net) | 2 / 3 (-1 net) |

### Key Observations by Category
1. **Curriculum Support Collapse:** Both C1 and C2 suffer major regressions on `SUPPORTED_CURRICULUM` (-11.00 pp in C1, -18.00 pp in C2). Valid inquiries regarding core curriculum features are rejected or forced into abstention.
2. **False Premise Consistency:** On `NOVEL_FALSE_PREMISE`, both C1 and C2 perform exceptionally well (95.00% accuracy, gaining 1 net case over C0).
3. **Out of Curriculum Robustness:** Both C1 and C2 achieve near-perfect 99.00% accuracy on out-of-domain terms.
4. **Legitimate Negation Vulnerability:** On `LEGITIMATE_NEGATION` (e.g., "Why doesn't X require Y?"), C2 dropped to 78.00% (7 regressions vs 0 gains).

---

## 4. Pre-Registered Advancement Gate Evaluation

Section 12 of `EXP-0065-PROTOCOL.md` defines the formal advancement rule:
1. **Requirement A (Accuracy Signal):** Overall development performance must be meaningfully better than C0 ($\text{Acc}_{\text{Cand}} > \text{Acc}_{\text{C0}}$).
   - **Candidate C1:** $\text{Acc} = 89.25\% < 92.00\%$ ($\Delta = -2.75$ pp). **FAILED.**
   - **Candidate C2:** $\text{Acc} = 86.00\% < 92.00\%$ ($\Delta = -6.00$ pp, $p = 0.000717$). **FAILED.**
2. **Requirement B (Safety Preservation):** $\text{FAR} \le 18.50\%$ and Refutation Recall $\ge 90.00\%$.
   - **Candidate C1:** $\text{FAR} = 2.00\%$, Refutation Recall $= 94.00\%$. **PASSED.**
   - **Candidate C2:** $\text{FAR} = 2.00\%$, Refutation Recall $= 92.67\%$. **PASSED.**

### Formal Decision: ADVANCEMENT REJECTED
Because neither candidate satisfies Requirement A, **neither model is authorized to advance to the sealed blind holdout evaluation**.

In strict accordance with Section 12 and Section 21 of the protocol:
- `EXP-0033-BLIND-DATASET.json` remains **SEALED** and **UNTOUCHED**.
- No candidate tuning or calibration on blind data will be conducted.
- EXP-0065 concludes at Phase 1.
