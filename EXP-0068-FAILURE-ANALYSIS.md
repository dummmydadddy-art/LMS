# EXP-0068 Failure Analysis: Cross-Encoder Pragmatic Mismatch & Semantic Over-Abstention

**Experiment ID:** EXP-0068  
**Date:** 2026-09-26  
**Status:** Negative Result / Stop Rule Executed  
**Repository:** `EduConnect-LMS-Experimental`  
**Starting HEAD:** `d217d456218213184f4c88d79d0281e4053156a3`  

---

## 1. Executive Summary

EXP-0068 evaluated whether dedicated off-the-shelf sequence-classification NLI cross-encoders (**C1:** `cross-encoder/nli-MiniLM2-L6-H768`, 82.1M params; **C2:** `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`, 184.4M params) could resolve the verifier bottleneck that neither parameter scaling (EXP-0065) nor prompt reformulation (EXP-0067) solved.

The experimental outcome is an **unambiguous, statistically decisive negative result**:
- **C0 Control (`llama3.2:latest` on frozen A4):** 92.00% Dev Accuracy (368/400)
- **C1 (`nli-MiniLM2`):** 70.00% Dev Accuracy (280/400, $\Delta = -22.00\text{ pp}$, McNemar $p = 4.82 \times 10^{-24}$)
- **C2 (`DeBERTa-v3-base`):** 68.00% Dev Accuracy (272/400, $\Delta = -24.00\text{ pp}$, McNemar $p = 4.04 \times 10^{-27}$)

While the cross-encoders succeeded in suppressing false acceptances (**Gate A passed:** FAR dropped from 6.00% down to 0.67% in C1 and 1.33% in C2), they induced a **catastrophic collapse in supported claim recall** (**Gate B failed catastrophically:** Supported Recall fell from 87.33% to 38.67% in C1 and 33.33% in C2).

Consequently, **Gate B, Gate D, and Gate E failed decisively**. Under the pre-registered protocol stop rule, **Blind Validation was NOT RUN**, and `EXP-0033-BLIND-DATASET.json` ($N=500$) remains strictly sealed.

---

## 2. Quantitative Failure Matrix

### 2.1 Confusion Matrix Comparison ($N=400$)

| Actual \ Pred | C0: SUP | C0: REF | C0: NEUT | C1: SUP | C1: REF | C1: NEUT | C2: SUP | C2: REF | C2: NEUT |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SUPPORTED** ($N=150$) | **131** | 19 | 0 | **58** | 17 | **75** | **50** | 17 | **83** |
| **REFUTED** ($N=150$) | 9 | **139** | 2 | 1 | **125** | 24 | 2 | **123** | 25 |
| **NOT_ESTABLISHED** ($N=100$) | 1 | 1 | **98** | 0 | 3 | **97** | 0 | 1 | **99** |

### 2.2 Error Class Breakdown

| Error Class | C0 Count | C1 Count | C2 Count | $\Delta_{\text{C1 - C0}}$ | $\Delta_{\text{C2 - C0}}$ | Primary Mechanism |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **False Acceptance** (`REFUTED -> SUPPORTED`) | 9 | 1 | 2 | -8 (-88.9%) | -7 (-77.8%) | Cross-encoders eliminate presupposition sycophancy |
| **False Rejection** (`SUPPORTED -> REFUTED`) | 19 | 17 | 17 | -2 (-10.5%) | -2 (-10.5%) | Resolved by Tier-1 fast-paths ($17/19$ cases) |
| **False Abstention** (`SUPPORTED -> NOT_ESTABLISHED`) | **0** | **75** | **83** | **+75** | **+83** | **Cross-encoder pragmatic mismatch & hyper-neutrality** |
| **Refutation Abstention** (`REFUTED -> NOT_ESTABLISHED`) | 2 | 24 | 25 | +22 | +23 | Failure to detect subtle technical contradictions |
| **OOD False Acceptance** (`OOD -> SUPPORTED`) | 1 | 0 | 0 | -1 | -1 | Preserved |
| **OOD False Refutation** (`OOD -> REFUTED`) | 1 | 3 | 1 | +2 | 0 | Slight lexical collision in C1 |

---

## 3. Root Cause Analysis: The Three Failure Mechanisms

### Mechanism 1: Pragmatic Mismatch Between Natural Sentence NLI and Educational Queries
Off-the-shelf NLI models (SNLI, MultiNLI, ANLI, FEVER) are fine-tuned exclusively on declarative sentence pairs of the form:
- Premise: *"A woman is slicing lemons on a cutting board."*
- Hypothesis: *"A person is preparing food in a kitchen."* $\to$ `ENTAILMENT`

In an educational RAG setting, student queries are interrogative or mechanistic clauses:
- Evidence: `"[Topic: CSS Flexbox] [Subject: align-items] align-items specifies the default alignment for items along the cross axis inside the flex container."`
- Student Claim: `"How does align-items control cross-axis alignment in Flexbox?"`

To an off-the-shelf cross-encoder, a question or mechanistic inquiry is **not a declarative proposition that is entailed by the premise**. The model recognizes that the premise discusses the entity, but because the hypothesis is formulated as an interrogative request rather than a direct logical deduction, the model's sequence-classification head routes the pair to `NEUTRAL`.
- In C1, **75 out of 150 supported claims** were classified as `NEUTRAL`.
- In C2, **83 out of 150 supported claims** were classified as `NEUTRAL`.

### Mechanism 2: Generative LLM Pragmatics vs Sequence Classification Literalism
A generative instruction-tuned LLM (`llama3.2:latest`) bridges the pragmatic gap because its prompt instructions explicitly instruct it to evaluate the curriculum context:
> *"Determine whether the STUDENT CLAIM is ENTAILMENT, CONTRADICTION, or NEUTRAL relative to the EVIDENCE CONTEXT."*

The generative LLM interprets the question `"How does align-items control cross-axis alignment in Flexbox?"` pragmatically as asserting the relation `(align-items, controls, cross-axis alignment)`, finding that the evidence explicitly confirms this relation. The cross-encoder, lacking instruction-following capabilities, relies purely on literal token representations and surface semantic entailment learned from crowdsourced NLI benchmarks.

### Mechanism 3: Extreme Prior Bias Toward Neutrality
Analysis of the 764 raw probability calibrations logged during development reveals an overwhelming bias toward `NEUTRAL`:
- **C1 Mean Class Probabilities:** $P(\text{neutral}) = 48.84\%$, $P(\text{entailment}) = 27.84\%$, $P(\text{contradiction}) = 23.32\%$.
- **C2 Mean Class Probabilities:** $P(\text{neutral}) = 64.05\%$, $P(\text{entailment}) = 24.10\%$, $P(\text{contradiction}) = 11.84\%$.
- In C2, **69.90% (267/382)** of all Tier-2 queries evaluated had `NEUTRAL` as the top-1 argmax prediction.

Because ANLI and FEVER penalize false entailments aggressively during pretraining, DeBERTa-v3 has learned to default to `NEUTRAL` whenever lexical phrasing diverges from exact declarative matching.

---

## 4. Hard-Stratum Impact

The collapse in accuracy was concentrated precisely in the curriculum-supported strata:

1. **S3 — High-Overlap Support ($N=100$):**
   - C0: 85.00%
   - C1: 30.00% (-55.00 pp)
   - C2: 29.00% (-56.00 pp)
   *Finding:* Even when lexical overlap with the curriculum is high, the interrogative syntax causes both cross-encoders to predict `NOT_ESTABLISHED`.

2. **S4 — Low-Overlap Paraphrase ($N=50$):**
   - C0: 92.00%
   - C1: 56.00% (-36.00 pp)
   - C2: 42.00% (-50.00 pp)
   *Finding:* Cross-encoders cannot tolerate syntactic restructuring or paraphrasing in technical domains without fine-tuning.

3. **S2 — Non-Antonym Queries ($N=319$):**
   - C0: 95.61%
   - C1: 71.47% (-24.14 pp)
   - C2: 69.59% (-26.02 pp)
   *Finding:* On queries lacking explicit antonym dictionary triggers, the cross-encoders regressed by over 24 percentage points.

---

## 5. Pairwise Transition Diagnostics

### Recovered Cases (C0 Incorrect $\to$ Candidate Correct)
Only **2 out of 400 cases** were recovered by C1 and C2:
1. `DEV-SUP-031`: *"How does async/await allow asynchronous code to be written sequentially?"*
   - C0 predicted `REFUTED` (hyper-skepticism on "sequentially").
   - C1 and C2 correctly predicted `SUPPORTED`.
2. `DEV-UNK-010`: *"How does Alembic auto-generate database migration scripts from SQLAlchemy metadata?"*
   - C0 predicted `SUPPORTED` (sycophancy / false acceptance on out-of-curriculum topic).
   - C1 and C2 correctly predicted `NOT_ESTABLISHED`.

### Regressed Cases (C0 Correct $\to$ Candidate Incorrect)
- **C1 Regressions:** 90 cases (83 were valid supported claims turned into `NOT_ESTABLISHED`).
- **C2 Regressions:** 98 cases (91 were valid supported claims turned into `NOT_ESTABLISHED`).

---

## 6. Advancement Gate Evaluation & Decision

```text
Gate A: False Acceptance Reduction        -> PASS (FAR: C0=6.00%, C1=0.67%, C2=1.33%)
Gate B: Supported Recall Preservation    -> FAIL (SupRec: C0=87.33%, C1=38.67%, C2=33.33%; Limit: >=84.33%)
Gate C: OOD Safety Preservation          -> PASS (OODRec: C0=98.00%, C1=97.00%, C2=99.00%; Limit: >=95.00%)
Gate D: Development Non-Inferiority      -> FAIL (Delta: C1=-22.00 pp, C2=-24.00 pp; p < 1e-23)
Gate E: Hard-Stratum Survivability       -> FAIL (S2 dropped >24 pp, S4 dropped >36 pp)
Gate F: Computational Viability          -> PASS (RAM < 1 GB, Latency 26ms for C1, 846ms for C2)
```

**Final Decision:** Under pre-registered protocol Section 6 and Section 19, neither candidate satisfies Gate B, Gate D, or Gate E. Blind validation is **ABORTED**. Holdout dataset `EXP-0033-BLIND-DATASET.json` remains sealed.
