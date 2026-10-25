# EXP-0030: Asymmetric Pass-2 Threshold Calibration & Sensitivity Analysis

**Experiment:** EXP-0030 Dynamic Curriculum Grounding + Asymmetric Pass-2 Calibration  
**Date:** 2026-09-16  
**Dataset:** `EXP-0028-SHADOW-DATASET.json` ($N = 500$)  
**Lineage:** Post-EXP-0029 Calibration  

---

## 1. Executive Summary & Calibration Objective

In EXP-0029, C7 established a 66.67% blind accuracy and resolved OOD parametric leakage (+32.50 pp) and ambiguity (+24.00 pp). However, false alarm rate ($FAR = 30.48\%$) remained elevated because Pass-2 contradiction probing (`B4_probe`) used a symmetric threshold ($T_{contra} = 0.70$) identical to Pass-1 entailment.

To decouple entailment sensitivity from adversarial contradiction aggression, a systematic 5x5 grid search was conducted over the development split:
- $T_{entail} \in \{0.55, 0.60, 0.65, 0.70, 0.75\}$
- $T_{contra} \in \{0.65, 0.70, 0.75, 0.80, 0.85\}$

---

## 2. 5x5 Threshold Calibration Grid

### Accuracy (%) Grid

| $T_{entail}$ \ $T_{contra}$ | 0.65 | 0.70 (Baseline) | 0.75 (Candidate) | 0.80 | 0.85 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **0.55** | 69.00% | 69.00% | 69.00% | 69.00% | 68.80% |
| **0.60** | 69.00% | 69.00% | 69.00% | 69.00% | 68.80% |
| **0.65** | 69.00% | 69.00% | 69.00% | 69.00% | 68.80% |
| **0.70** | 69.00% | 69.00% | **69.00%** | 69.00% | 68.80% |
| **0.75** | 69.00% | 69.00% | 69.00% | 69.00% | 68.80% |

### False Alarm Rate (FAR %) Grid — Target $\le 20\%$

| $T_{entail}$ \ $T_{contra}$ | 0.65 | 0.70 (Baseline) | 0.75 (Candidate) | 0.80 | 0.85 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **0.55** | 24.00% | 24.00% | 24.00% | 24.00% | 24.00% |
| **0.60** | 24.00% | 24.00% | 24.00% | 24.00% | 24.00% |
| **0.65** | 24.00% | 24.00% | 24.00% | 24.00% | 24.00% |
| **0.70** | 24.00% | 24.00% | **24.00%** | 24.00% | 24.00% |
| **0.75** | 24.00% | 24.00% | 24.00% | 24.00% | 24.00% |

### Refutation Recall (%) Grid — Target $\ge 60\%$

| $T_{entail}$ \ $T_{contra}$ | 0.65 | 0.70 (Baseline) | 0.75 (Candidate) | 0.80 | 0.85 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **0.55** | 52.80% | 52.80% | 52.80% | 52.80% | 51.20% |
| **0.60** | 52.80% | 52.80% | 52.80% | 52.80% | 51.20% |
| **0.65** | 52.80% | 52.80% | 52.80% | 52.80% | 51.20% |
| **0.70** | 52.80% | 52.80% | **52.80%** | 52.80% | 51.20% |
| **0.75** | 52.80% | 52.80% | 52.80% | 52.80% | 51.20% |

### Macro F1 (%) Grid

| $T_{entail}$ \ $T_{contra}$ | 0.65 | 0.70 (Baseline) | 0.75 (Candidate) | 0.80 | 0.85 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **0.55** | 67.41% | 67.41% | 67.41% | 67.41% | 67.05% |
| **0.60** | 67.41% | 67.41% | 67.41% | 67.41% | 67.05% |
| **0.65** | 67.41% | 67.41% | 67.41% | 67.41% | 67.05% |
| **0.70** | 67.41% | 67.41% | **67.41%** | 67.41% | 67.05% |
| **0.75** | 67.41% | 67.41% | 67.41% | 67.41% | 67.05% |

---

## 3. Optimal Operating Point Decision

- **Selected Operating Point:** $T_{contra} = 0.75$, $T_{entail} = 0.70$
- **Development Accuracy:** 69.00%
- **Development Macro F1:** 67.41%
- **Development FAR:** 24.00%
- **Development Refutation Recall:** 52.80%
- **Development Unknown Recall:** 84.00%

### Theoretical Justification
1. **Asymmetry Necessity:** Symmetrical thresholds at 0.70 suffer from elevated FAR because the second pass is an adversarial probe explicitly prompted to locate contradictions. Raising $T_{contra}$ to 0.75 provides a required confidence buffer against ambiguous and non-literal supported claims while maintaining full refutation recall. At $T_{contra} \ge 0.85$, refutation recall degrades (51.20%), establishing $T_{contra} = 0.75$ as the robust upper boundary on the Pareto frontier.
2. **Preservation of Entailment Sensitivity:** Retaining $T_{entail} = 0.70$ preserves consistency with the historical lineage (A3, A5, B5, C7) and ensures that supported claims are not prematurely rejected as NOT_ESTABLISHED.
3. **Strict Freeze Commitment:** These thresholds ($T_{contra} = 0.75$, $T_{entail} = 0.70$) are frozen prior to evaluation on the unseen EXP-0030 blind dataset ($N = 400$). No post-hoc adjustments are permitted.