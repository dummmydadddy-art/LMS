# EXP-0066: Final Report — Dev–Blind Generalization and Error Attribution Analysis

**Experiment ID:** EXP-0066  
**Date:** 2026-09-26  
**Status:** Completed and Closed  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Starting HEAD:** `9a9c2ffe8432aec535e205432bab2028c8d06396`  
**Evaluation Mode:** Analysis-Only Diagnostic Study (Zero Pipeline Modifications, Zero Model Inference)

---

## 1. Core Research Question & Direct Answer

### Research Question:
> **Why does the exact same verifier architecture achieve approximately 92% accuracy on development data (`EXP-0025-DEVELOPMENT-DATASET.json`, $N=400$) but only approximately 72–73% on the blind holdout (`EXP-0033-BLIND-DATASET.json`, $N=500$)?**

### Direct Empirical Answer:
The **19.20 percentage point generalization gap** (92.00% Dev vs. 72.80% Blind B0) is **NOT** caused by model capacity limits (disproven by EXP-0065) and **NOT** caused by retrieval failure (retrieval deficiency accounts for only 5.88% of blind errors). 

Instead, the degradation is caused by a **two-fold structural phenomenon**:

1. **Development Benchmark Artifacts & Shortcut Memorization:**
   The 92.00% development score was artificially inflated by regularities that allowed simple heuristics to bypass complex NLI reasoning:
   - **Antonym Dictionary Shortcut:** 88.67% (133/150) of development false premises contained explicit antonym cues from the static 138-pair dictionary (`$semanticOpposites`), enabling the Tier-1 deterministic fast path to resolve 73 cases with 100% precision.
   - **Trivial Out-of-Curriculum Abstention:** 100% of non-established queries in development were external technologies (Python/Django frameworks), including **50 identical synthetic queries** (`how does external technology framework N manage distributed cluster coordination?`). Their near-zero cosine similarity ($\text{maxSim} < 0.28$) allowed Tier-1 to abstain trivially with 98.00% accuracy.
   - **Template Regularity:** 32.75% of development queries were concentrated in just 5 opening prefixes. 87.25% were open Wh-questions (`how`, `why`, `what`) and 0.00% were polar verification questions (`does`, `is`, `can`).

2. **Blind Holdout Realities & Verification Architecture Collapse:**
   The blind holdout breaks these shortcuts, exposing three distinct architectural vulnerabilities in the verifier:
   - **False-Premise Generalization Breakdown:** 54.32% (88/162) of blind false premises lack antonym cues. For these subtle, presuppositionally phrased claims, refutation accuracy collapses from 81.08% down to **57.95%**. Tier-2 NLI suffers from sycophancy and high lexical overlap entanglement, falsely verifying **35 false premises** as supported (25.74% of all blind errors).
   - **In-Curriculum Ambiguity Blindspot:** The blind set introduces 75 in-curriculum ambiguous queries (`AMBIGUOUS` category). Because they are in-curriculum, vector similarity is high ($\ge 0.60$), bypassing vector thresholding. The Ambiguity Guard fails on **33.33%** (25/75) of these queries, routing them to Tier-2 NLI, which forces erroneous factual decisions (18.38% of all blind errors).
   - **Tier-1 Deterministic Overfitting & Tier-2 Hyper-Skepticism:** On valid supported queries, the verifier suffers a **21.13% False Rejection Rate** (45 errors). 17 errors are caused by Tier-1 polarity collisions when queries mention dual technical concepts (e.g., `flex-direction: column` vs `row`, `border-box` vs `content-box`), and 28 errors are caused by Tier-2 NLI rejecting paraphrased text.

---

## 2. Key Metrics Summary

| Metric | Development Benchmark ($N=400$) | Blind Holdout ($N=500$, B0) | Blind Holdout ($N=500$, B1 Gated) | Generalization Gap (Dev $-$ B0) |
| :--- | :---: | :---: | :---: | :---: |
| **Overall Accuracy** | **92.00%** (368/400) | **72.80%** (364/500) | **72.80%** (364/500) | **-19.20%** |
| **Total Error Count** | 32 errors (8.00%) | 136 errors (27.20%) | 136 errors (27.20%) | $+3.4\times$ errors |
| **Supported Recall** | 87.33% (131/150) | 72.77% (155/213) | 72.77% (155/213) | **-14.56%** |
| **False Rejection Rate (FRR)**| 12.67% (19/150) | 21.13% (45/213) | 19.72% (42/213) | **+8.46%** |
| **False Abstention Rate (FAR_abs)**| 0.00% (0/150) | 6.10% (13/213) | 7.51% (16/213) | **+6.10%** |
| **Refutation Recall** | 92.67% (139/150) | 68.52% (111/162) | 70.99% (115/162) | **-24.15%** |
| **False Acceptance Rate (FAR_acc)**| 6.00% (9/150) | 21.60% (35/162) | 22.22% (36/162) | **+15.60%** |
| **Non-Established Recall** | 98.00% (98/100) | 78.40% (98/125) | 75.20% (94/125) | **-19.60%** |
| — OOD Recall | 98.00% (98/100) | 96.00% (48/50) | 94.00% (47/50) | -2.00% |
| — In-Curriculum Ambiguity Recall| — | **66.67%** (50/75) | **62.67%** (47/75) | Novel in Blind |

---

## 3. High-Level Error Attribution Breakdown

All 136 blind errors were individually traced across ground-truth evidence passages, retrieval ranks, similarity scores, and verifier diagnostic logs:

| Attribution Class | Error Count | % of Blind Errors ($N=136$) | % of Total Blind Queries ($N=500$) | Primary Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **A. Retrieval-Supported Total** | **492** | — | **98.40%** | Evidence present in top-5 candidate pool |
| **B. Retrieval-Deficient** | **8** | **5.88%** | **1.60%** | Top-5 evidence missing ($\text{maxSim} < 0.26$) |
| **C. Evidence-Present / Verifier-Wrong** | **102** | **75.00%** | **20.40%** | Verifier failed despite evidence availability |
| — C1. Tier-1 Deterministic Collision | 21 | 15.44% | 4.20% | Antonym fast path falsely refuted valid query |
| — C2. Tier-2 NLI False Acceptance | 35 | 25.74% | 7.00% | Sycophancy / presupposition confirmation |
| — C3. Tier-2 NLI False Rejection | 28 | 20.59% | 5.60% | Semantic hyper-skepticism on paraphrase |
| — C4. Tier-2 NLI Epistemic Abstention | 17 | 12.50% | 3.40% | Failed to establish relation; defaulted to neutral |
| — C5. Tier-2 Other NLI Error | 1 | 0.74% | 0.20% | Miscellaneous classification error |
| **D. Ambiguity-Guard Error** | **25** | **18.38%** | **5.00%** | Missed in-curriculum subjective query; routed to NLI |
| **E. Unknown / Borderline** | **1** | **0.74%** | **0.20%** | Unclassified borderline case |
| **Total Errors** | **136** | **100.00%** | **27.20%** | — |

---

## 4. Key Scientific Insights

1. **Parameter Scaling is Orthogonal to Generalization:**
   EXP-0065 proved that moving from 3.2B to 8.2B does not fix these errors and actually increases false rejections. EXP-0066 explains why: the errors are structural and semantic, driven by how the prompt instructs the model to compare claims against evidence. Scaling model weights simply amplifies the model's existing biases (e.g., hyper-skepticism or sycophancy).
2. **Deterministic Shortcuts Create Fragility:**
   Tier-1 was designed as a high-precision fast path. However, in practice, it acts as a double-edged sword: it boosts development accuracy by matching synthetic templates, but on blind data it causes 21 false rejections on valid queries while missing 54.3% of genuine false premises.
3. **Ambiguity Gating Must Be Semantic, Not Lexical:**
   Surface regexes fail when ambiguous questions are phrased professionally (e.g., *"Is foreign key cascade deletion safe for all e-commerce order relationships?"*). Without semantic ambiguity detection, in-curriculum questions pollute the NLI pipeline.
4. **Generation Quality Remains an Open Research Question:**
   Because all historical pipelines only evaluated intermediate verification classification, end-to-end generated answer quality is **NOT CURRENTLY IDENTIFIABLE**.

---

## 5. Next Scientific Research Direction

In accordance with protocol section 14, the quantitative evidence points unequivocally to:

### Recommended Direction: `NLI PROMPT / DECISION FORMULATION`

#### Quantitative Justification:
1. **Dominant Failure Concentration:** **59.56%** of all blind errors (81/136) occur directly inside the Tier-2 Semantic NLI reasoning step, with another **15.44%** in Tier-1 decision rules. Together, decision formulation accounts for **75.00%** of all errors.
2. **Tractable and High-Impact:**
   - Replacing the current unconstrained NLI prompt with a **counter-factual verification prompt** (forcing the model to explicitly state what evidence would refute the claim before verifying it) directly addresses the 35 False Acceptances.
   - Introducing calibrated entailment thresholds with relaxed lexical matching directly addresses the 28 False Rejections.
   - Adding dual-concept exception logic to Tier-1 eliminates the 21 deterministic collisions.
3. **Why Alternative Directions Are Rejected for the Immediate Next Step:**
   - `RETRIEVAL`: Disqualified because retrieval is already 98.40% effective; fixing retrieval at best addresses 8 errors.
   - `MODEL CAPACITY`: Disqualified by EXP-0065 (8B was statistically inferior to 3B).
   - `GENERATION`: While unmeasured, generation depends downstream on correct verification verdicts. Fixing generation before the verifier stops hallucinating support for false premises is premature.

---

## 6. Artifact Verification Hashes

| Artifact Path | SHA-256 Checksum |
| :--- | :--- |
| `EXP-0066-PROTOCOL.md` | `cce0ea17f152030d349b0308ada254d1447363f782ee3eb5a73da7a22776f370` |
| `research/exp0066_analyzer.py` | `d0c7bafab6d683e18925ed5aa4e6dcba4e6a0bf460f669242dc46ce9de6a26ad` |
| `EXP-0066-DATASET-COMPARISON.json` | `e257bae3a6240c4a874d9d4e95a2081ec2fbc04bef4d474e69ed413ad9f55e7d` |
| `EXP-0066-ERROR-STRATIFICATION.json` | `f3bfdee497647dfc7df7c97a2163aaf58e0ae893860552e36b596362f68c1528` |
| `EXP-0066-ANALYSIS.md` | `16cbf68bb3d6612beecd1eb981b4972e46edd85eb9be3ab0df449cda4342337b` |
| `EXP-0066-FAILURE-ATTRIBUTION.md` | `9f53f64d8e7397047c3ea9cfeaf154d3c60accd0d6a9118ca91da564cf9d817c` |
