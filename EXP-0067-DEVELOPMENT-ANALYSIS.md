# EXP-0067: Development Benchmark Analysis

**Experiment Identifier:** EXP-0067  
**Stage:** Phase 1 — Development Evaluation  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Evaluated Model:** `llama3.2:latest` (3.2B, Q4_K_M) across all conditions  
**Date:** 2026-09-26  
**Status:** COMPLETE — ADVANCEMENT GATES EVALUATED (STOP RULE TRIGGERED)  

---

## 1. Executive Summary

EXP-0067 investigated whether prompt-level NLI decision reformulations (explicit anti-presupposition rules, contrastive evaluation, bidirectional polarity ladders, and counterfactual stress) can reduce presupposition-driven false acceptances without degrading supported claim recall or OOD safety.

### Primary Scientific Finding:
The experiment **falsified the hypothesis** that decision reformulation alone can resolve the verifier bottleneck:
1. **False Acceptance Reduction Achieved:** Formulations successfully suppressed false acceptance of subtle false premises (`REFUTED -> SUPPORTED` dropped from 9 cases in C0 to **0 cases in C1 and C2**, 1 in C3, and 3 in C4).
2. **Catastrophic Pareto Collapse in Supported Recall:** Suppressing presupposition sycophancy via negative instruction prompts induced severe **semantic hyper-skepticism and epistemic abstention**. Supported Recall collapsed from **87.33% in C0 down to 39.33% (C1), 52.00% (C2), 54.00% (C3), and 54.67% (C4)**.
3. **All Candidates Statistically Inferior to C0:**
   - C1: 68.50% ($\Delta = -23.50\text{ pp}$, McNemar $p = 1.34 \times 10^{-20}$)
   - C2: 78.00% ($\Delta = -14.00\text{ pp}$, McNemar $p = 7.64 \times 10^{-13}$)
   - C3: 75.00% ($\Delta = -17.00\text{ pp}$, McNemar $p = 8.89 \times 10^{-15}$)
   - C4: 80.75% ($\Delta = -11.25\text{ pp}$, McNemar $p = 2.45 \times 10^{-9}$)
4. **Pre-Registered Gate Evaluation:** Every single candidate **failed Gate B** (Supported Recall degradation $> 3.0\text{ pp}$) and **failed Gate D** (Overall Non-Inferiority).
5. **Sealed Holdout Protection:** Under the pre-registered protocol, no candidate advanced to blind validation. `EXP-0033-BLIND-DATASET.json` ($N = 500$) remains **100% sealed and unopened**.

---

## 2. Primary Development Scorecard ($N = 400$)

| Evaluation Metric | C0: Control (Frozen A4) | C1: Anti-Presupposition | C2: Contrastive | C3: Bidirectional Ladder | C4: Counterfactual Stress |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Model** | `llama3.2:latest` | `llama3.2:latest` | `llama3.2:latest` | `llama3.2:latest` | `llama3.2:latest` |
| **Overall Accuracy** | **92.00%** (368/400) | **68.50%** (274/400) | **78.00%** (312/400) | **75.00%** (300/400) | **80.75%** (323/400) |
| **Accuracy Delta ($\Delta$)** | — | **-23.50 pp** | **-14.00 pp** | **-17.00 pp** | **-11.25 pp** |
| **Macro F1 Score** | **0.9267** | **0.6760** | **0.7742** | **0.7463** | **0.8132** |
| **False Acceptances (`REF -> SUP`)** | 9 | **0** | **0** | **1** | 3 |
| **False Rejections (`SUP -> REF`)** | 19 | 15 | **46** | 17 | **61** |
| **Supported Abstentions (`SUP -> NE`)**| 0 | **76** | **26** | **52** | 7 |
| **Refuted Abstentions (`REF -> NE`)** | 2 | **34** | 14 | **29** | 3 |
| **Supported Recall** | **87.33%** (131/150) | **39.33%** (59/150) | **52.00%** (78/150) | **54.00%** (81/150) | **54.67%** (82/150) |
| **Refutation Recall** | **92.67%** (139/150) | **77.33%** (116/150) | **90.00%** (135/150) | **80.00%** (120/150) | **96.00%** (144/150) |
| **OOD Recall** | **98.00%** (98/100) | **99.00%** (99/100) | **99.00%** (99/100) | **99.00%** (99/100) | **97.00%** (97/100) |
| **Mean Latency per Query** | 1,196.4 ms | 1,913.6 ms | 1,597.5 ms | 1,775.9 ms | 1,152.2 ms |
| **Parse Failures** | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

---

## 3. Paired Statistical Evaluation against C0

### Candidate C1 vs C0 Control
- **C0 Correct, C1 Correct ($n_{00}$):** 272
- **C0 Incorrect, C1 Incorrect ($n_{11}$):** 30
- **Candidate Gains ($b$ — C0 wrong, C1 correct):** 2
- **Candidate Regressions ($c$ — C0 correct, C1 wrong):** 96
- **Net Gain ($b - c$):** **-94**
- **Two-Sided Exact McNemar $p$-value:** **$p = 1.34 \times 10^{-20}$**
- **Statistical Significance:** Highly statistically significant inferiority ($p < 0.001$).

### Candidate C2 vs C0 Control
- **C0 Correct, C2 Correct ($n_{00}$):** 302
- **C0 Incorrect, C2 Incorrect ($n_{11}$):** 22
- **Candidate Gains ($b$ — C0 wrong, C2 correct):** 10
- **Candidate Regressions ($c$ — C0 correct, C2 wrong):** 66
- **Net Gain ($b - c$):** **-56**
- **Two-Sided Exact McNemar $p$-value:** **$p = 7.64 \times 10^{-13}$**
- **Statistical Significance:** Highly statistically significant inferiority ($p < 0.001$).

### Candidate C3 vs C0 Control
- **C0 Correct, C3 Correct ($n_{00}$):** 298
- **C0 Incorrect, C3 Incorrect ($n_{11}$):** 30
- **Candidate Gains ($b$ — C0 wrong, C3 correct):** 2
- **Candidate Regressions ($c$ — C0 correct, C3 wrong):** 70
- **Net Gain ($b - c$):** **-68**
- **Two-Sided Exact McNemar $p$-value:** **$p = 8.89 \times 10^{-15}$**
- **Statistical Significance:** Highly statistically significant inferiority ($p < 0.001$).

### Candidate C4 vs C0 Control
- **C0 Correct, C4 Correct ($n_{00}$):** 314
- **C0 Incorrect, C4 Incorrect ($n_{11}$):** 23
- **Candidate Gains ($b$ — C0 wrong, C4 correct):** 9
- **Candidate Regressions ($c$ — C0 correct, C4 wrong):** 54
- **Net Gain ($b - c$):** **-45**
- **Two-Sided Exact McNemar $p$-value:** **$p = 2.45 \times 10^{-9}$**
- **Statistical Significance:** Highly statistically significant inferiority ($p < 0.001$).

---

## 4. Category-Level Performance Breakdown

| Curriculum Category ($N$) | C0 Acc (%) | C1 Acc (%) | C2 Acc (%) | C3 Acc (%) | C4 Acc (%) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPPORTED_CURRICULUM** ($N=100$) | **85.0%** (85/100) | 34.0% (34/100) | 35.0% (35/100) | 48.0% (48/100) | 48.0% (48/100) |
| **NOVEL_FALSE_PREMISE** ($N=100$) | **94.0%** (94/100) | 79.0% (79/100) | 90.0% (90/100) | 80.0% (80/100) | **96.0%** (96/100) |
| **OUT_OF_CURRICULUM_UNKNOWN** ($N=100$) | 98.0% (98/100) | **99.0%** (99/100) | **99.0%** (99/100) | **99.0%** (99/100) | 97.0% (97/100) |
| **LEGITIMATE_NEGATION** ($N=50$) | **92.0%** (46/50) | 50.0% (25/50) | 86.0% (43/50) | 66.0% (33/50) | 68.0% (34/50) |
| **MIXED_COMPOUND_PREMISE** ($N=50$) | 90.0% (45/50) | 74.0% (37/50) | 90.0% (45/50) | 74.0% (37/50) | **96.0%** (48/50) |

---

## 5. Shortcut-Stratified Analysis (S1–S7)

| Stratum Code & Description | $N$ | C0 Acc (%) | C1 Acc (%) | C2 Acc (%) | C3 Acc (%) | C4 Acc (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **S1: Antonym-Assisted** | 111 | **81.98%** | 56.76% | 70.27% | 63.96% | 73.87% |
| **S2: Non-Antonym** | 289 | **95.85%** | 73.01% | 80.97% | 79.24% | 83.39% |
| **S3: High Overlap Support** | 100 | **85.00%** | 34.00% | 35.00% | 48.00% | 48.00% |
| **S4: Low Overlap / Paraphrase** | 50 | **92.00%** | 50.00% | 86.00% | 66.00% | 68.00% |
| **S5: Normative / Universal** | 8 | **100.00%** | 50.00% | 37.50% | 75.00% | 87.50% |
| **S6: Compound / Multi-Clause** | 50 | 90.00% | 74.00% | 90.00% | 74.00% | **96.00%** |
| **S7: Out-of-Curriculum OOD** | 100 | 98.00% | **99.00%** | **99.00%** | **99.00%** | 97.00% |

### Key Stratified Findings:
1. **Non-Antonym Performance (S2):** In S2 ($N=289$), where queries cannot rely on Tier-1 lexical dictionary matches, all four candidate prompts experienced major drops of between $-12.46\text{ pp}$ and $-22.84\text{ pp}$ relative to C0.
2. **Compound Multi-Clause Handling (S6):** C4 achieved an improvement in compound premise verification (96.00% vs 90.00% in C0), because its counterfactual stress prompt excelled at detecting single invalid clauses within compound assertions. However, this gain was overwhelmed by its massive collapse on single supported claims (S3: 48.00% vs 85.00%).

---

## 6. Pre-Registered Advancement Gate Assessment

| Advancement Gate | Evaluation Criterion | C1 Status | C2 Status | C3 Status | C4 Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Gate A: False Acceptance Reduction** | $\text{FA}_{\text{cand}} < \text{FA}_{\text{C0}}$ ($9$) | **PASS** (0) | **PASS** (0) | **PASS** (1) | **PASS** (3) |
| **Gate B: Supported Recall Preservation** | $\Delta \text{SupRec} \ge -3.00\text{ pp}$ (from $87.33\%$) | **FAIL** (39.33%, -48.0 pp) | **FAIL** (52.00%, -35.3 pp) | **FAIL** (54.00%, -33.3 pp) | **FAIL** (54.67%, -32.7 pp) |
| **Gate C: OOD Safety Preservation** | $\text{OOD Recall} \ge 95.00\%$ | **PASS** (99.00%) | **PASS** (99.00%) | **PASS** (99.00%) | **PASS** (97.00%) |
| **Gate D: Overall Non-Inferiority** | McNemar $p > 0.05$ or $\Delta \ge -1.50\text{ pp}$ | **FAIL** ($p < 10^{-19}$) | **FAIL** ($p < 10^{-12}$) | **FAIL** ($p < 10^{-14}$) | **FAIL** ($p < 10^{-8}$) |
| **Gate E: Non-Shortcut Generalization** | Improvement on S2 or S6 | **FAIL** (Both lower) | **PASS** (S6 neutral) | **FAIL** (Both lower) | **PASS** (S6 +6.0 pp) |
| **OVERALL ADVANCEMENT DECISION** | All 5 Gates Cleared | **REJECTED** | **REJECTED** | **REJECTED** | **REJECTED** |

---

## 7. Scientific Conclusion & Protocol Decision

1. **Rejection of Experimental Hypothesis:** Prompt-level anti-presupposition framing cannot resolve verifier sycophancy without triggering crippling semantic hyper-skepticism in small local models (3B parameters).
2. **Stop Rule Enforced:** In accordance with Section 7 of `EXP-0067-PROTOCOL.md`, no candidate cleared Gate B or Gate D.
3. **Sealed Blind Holdout Protection:** Phase 2 blind validation was **NOT conducted**. The blind dataset remains pristine and uncompromised.
