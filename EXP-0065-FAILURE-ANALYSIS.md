# EXP-0065: Forensic Failure Analysis

**Experiment:** EXP-0065 (Verifier/NLI Capacity Isolation Benchmark)  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)  
**Backbone:** Frozen A4 Verifier (`31c7c31e...`) + Frozen PageIndex/Chonkie Evidence Caches  
**Date:** 2026-09-26  

---

## 1. Executive Summary of Failure Dynamics

EXP-0065 isolated the effect of scaling the Tier-2 NLI model from 3.2B parameters (`llama3.2:latest`) to 4.0B (`qwen3:4b`) and 8.2B (`qwen3:8b`).

The evaluation revealed an unexpected, counter-intuitive scientific phenomenon:
> **Scaling model capacity improves safety (halving False Acceptance Rate from 4.00% to 2.00%), but severely degrades overall verifier accuracy (from 92.00% down to 89.25% and 86.00%) due to an explosion in False Rejections (FRR rising from 12.67% to 22.00% and 29.33%).**

Larger models exhibit **hyper-skepticism**: under frozen zero-shot NLI prompts, they interpret descriptive technical explanations as failing strict logical entailment, classifying valid curriculum statements as `NEUTRAL` (`NOT_ESTABLISHED`).

---

## 2. Global Confusion Matrices ($N = 400$)

### C0: Baseline Control (`llama3.2:latest`, 3.2B)
```
                     Predicted: SUPPORTED   REFUTED   NOT_ESTABLISHED   Total
True: SUPPORTED              131          19                 0           150
      REFUTED                  9         139                 2           150
      NOT_ESTABLISHED          1           1                98           100
Total                        141         159               100           400
```
- Accuracy: **92.00%** (368/400) | Macro F1: **92.67%**
- Standard FAR: **4.00%** (10/250) | FRR: **12.67%** (19/150)
- Parse Failures: **0**

---

### C1: Intermediate Model (`qwen3:4b`, 4.0B)
```
                     Predicted: SUPPORTED   REFUTED   NOT_ESTABLISHED   Total
True: SUPPORTED              117          24                 9           150
      REFUTED                  5         141                 4           150
      NOT_ESTABLISHED          0           1                99           100
Total                        122         166               112           400
```
- Accuracy: **89.25%** (357/400) | Macro F1: **89.56%**
- Standard FAR: **2.00%** (5/250) | FRR: **22.00%** (33/150)
- Parse Failures: **0**

---

### C2: Larger Model (`qwen3:8b`, 8.2B)
```
                     Predicted: SUPPORTED   REFUTED   NOT_ESTABLISHED   Total
True: SUPPORTED              106          20                24           150
      REFUTED                  5         139                 6           150
      NOT_ESTABLISHED          0           1                99           100
Total                        111         160               129           400
```
- Accuracy: **86.00%** (344/400) | Macro F1: **85.79%**
- Standard FAR: **2.00%** (5/250) | FRR: **29.33%** (44/150)
- Parse Failures: **0**

---

## 3. Directional Error Transition Matrix

| Error Transition Type | Direction Meaning | C0 (3.2B) | C1 (4.0B) | C2 (8.2B) | Delta (C1 - C0) | Delta (C2 - C0) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`SUP → REF`** | True Supported wrongly refuted (False Contradiction) | 19 | 24 | 20 | +5 | +1 |
| **`SUP → NE`** | True Supported wrongly abstained (False Neutrality) | 0 | 9 | 24 | **+9** | **+24** |
| **`REF → SUP`** | False premise accepted (Critical False Acceptance) | 9 | 5 | 5 | **-4** (-44%) | **-4** (-44%) |
| **`REF → NE`** | False premise abstained rather than refuted (Safe Error) | 2 | 4 | 6 | +2 | +4 |
| **`NE → SUP`** | Unestablished query accepted (Hallucination Error) | 1 | 0 | 0 | **-1** (-100%) | **-1** (-100%) |
| **`NE → REF`** | Unestablished query refuted (False Contradiction) | 1 | 1 | 1 | 0 | 0 |
| **Parse Failures** | Structured JSON parse error | 0 | 0 | 0 | 0 | 0 |
| **Total Errors** | All misclassifications | **32** | **43** | **56** | **+11** | **+24** |

---

## 4. Deep Forensic Case Analysis

### 4.1 The Hyper-Skepticism Defect (`SUP → NE`)
The primary source of failure in larger models is the transition of valid curriculum queries into `NOT_ESTABLISHED`.

#### Case Study 1: HTTP Status Code Queries (`DEV-SUP-051` to `DEV-SUP-056`)
- **Query:** `DEV-SUP-051: "What is the significance of HTTP 200 OK status code?"`
- **Curriculum Evidence:** `[Topic: Web Development Fundamentals] [Subject: HTTP Protocols] - HTTP 200 OK: Standard response for successful HTTP requests.`
- **Ground Truth:** `SUPPORTED`
- **C0 (`llama3.2`):** `SUPPORTED` ($\text{conf} = 0.95$). Entailment recognized.
- **C1 (`qwen3:4b`):** `NOT_ESTABLISHED` ($\text{conf} = 0.35$).
- **C2 (`qwen3:8b`):** `NOT_ESTABLISHED` ($\text{conf} = 0.35$).
- **Root Cause:** When the query condenser / proposition extractor isolates `"the significance of HTTP 200 OK status code"`, C2 evaluates whether the evidence explicitly defines the word `"significance"`. Because the evidence says `"Standard response for successful HTTP requests"` without using the literal word `"significance"`, the 8.2B model classifies the relationship as `NEUTRAL`, triggering verifier abstention.

#### Case Study 2: Syntactic Explanations (`DEV-SUP-026`)
- **Query:** `"How do rest parameters (...args) condense arguments into a true Array?"`
- **Curriculum Evidence:** `"Rest parameters allow representing an indefinite number of arguments as an Array instance."`
- **Ground Truth:** `SUPPORTED`
- **C0:** `SUPPORTED`
- **C2:** `NOT_ESTABLISHED`
- **Root Cause:** C2 distinguishes between `"condense"` (metaphorical/action verb) and `"allow representing"` (definitional verb), declaring `NEUTRAL` due to lack of strict lexical overlap.

---

### 4.2 The Safety Triumph: Halving Critical False Acceptances (`REF → SUP`)
On the safety boundary, the larger models demonstrated clear superiority:
- False acceptances on fabricated APIs and contradictory claims dropped from 9 cases in C0 to **5 cases in C1 and C2**.
- Unestablished query false acceptances dropped from 1 in C0 to **0 in both C1 and C2**.
- **Cases Rescued by C1/C2 from C0's False Acceptances:**
  - `DEV-FLS-014` [NOVEL_FALSE_PREMISE]: C0 incorrectly predicted `SUPPORTED` $\to$ C1 and C2 correctly predicted `REFUTED`.
  - `DEV-FLS-032` [NOVEL_FALSE_PREMISE]: C0 incorrectly predicted `SUPPORTED` $\to$ C1 and C2 correctly predicted `REFUTED`.
  - `DEV-FLS-067` [NOVEL_FALSE_PREMISE]: C0 incorrectly predicted `SUPPORTED` $\to$ C1 and C2 correctly predicted `REFUTED`.
  - `DEV-OOD-041` [OUT_OF_CURRICULUM_UNKNOWN]: C0 predicted `SUPPORTED` $\to$ C1 and C2 correctly predicted `NOT_ESTABLISHED`.

---

## 5. Summary Conclusion of Failure Taxonomy

The hypothesis that increasing model capacity would automatically raise verifier accuracy while preserving safety was **falsified**:
1. **Safety was preserved and enhanced** ($\text{FAR}$ halved to 2.00%).
2. **Accuracy was degraded** by +9.33 pp (C1) and +16.66 pp (C2) in False Rejection Rate.
3. The underlying bottleneck is not model size in isolation, but the **interaction between model scale and the rigid zero-shot NLI prompt template**. Larger models demand higher entailment stringency, turning the verifier into an over-conservative abstainer.
