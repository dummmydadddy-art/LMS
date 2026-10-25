# EXP-0068 Protocol: Dedicated NLI Cross-Encoder Architecture Benchmark

**Experiment ID:** EXP-0068  
**Date:** 2026-09-26  
**Status:** Pre-registered Protocol  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Starting HEAD:** `d217d456218213184f4c88d79d0281e4053156a3` (`d217d45`)  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (Strictly Frozen — Untouched)  

---

## 1. Primary Research Question & Scientific Motivation

In prior iterations of the RAG verification investigation:
- **EXP-0065 (Parameter Scaling):** Conclusively falsified the hypothesis that scaling local generative LLM parameter count (3.2B $\to$ 4B $\to$ 8B) resolves the downstream verification bottleneck. Larger generative models displayed increased semantic hyper-skepticism and elevated false rejection rates (FRR 12.67% $\to$ 29.33%).
- **EXP-0066 (Generalization & Attribution):** Pinpointed that 75.00% of blind holdout errors (102/136) originate in verifier logic, with 59.56% occurring inside Tier-2 Semantic NLI (false acceptances: 35, false rejections: 28, epistemic abstentions: 17), whereas retrieval deficiencies accounted for only 5.88% (8/136).
- **EXP-0067 (Decision Formulation):** Tested four distinct prompt-level decision formulations on `llama3.2:latest` (anti-presupposition, contrastive, bidirectional polarity, counterfactual stress). All candidates degraded development accuracy (80.75% down to 68.50% vs C0 92.00%) by trading presupposition false acceptances for catastrophic collapse of supported-claim recall (supported recall fell from 85.33% to 48.67%–74.67%).

### Core Research Question:
> **Can a dedicated premise–hypothesis NLI sequence-classification model classify claim–evidence relations more reliably than a generative instruction LLM used as zero-shot NLI?**

### Core Hypotheses:
- **H1 (Architectural Efficacy):** A task-specialized premise–hypothesis cross-encoder sequence-classification model will achieve higher NLI classification accuracy on claim–evidence verification than a generative instruction LLM (`llama3.2:latest`) operating zero-shot via JSON prompting.
- **H2 (Presupposition Resistance):** A dedicated cross-encoder will significantly reduce presupposition-driven false acceptances (`REFUTED -> SUPPORTED`) by evaluating the explicit premise–hypothesis entailment relation directly rather than generating conversational continuations.
- **H3 (Paraphrase Robustness):** A dedicated cross-encoder will reduce semantic hyper-skepticism / false rejections (`SUPPORTED -> REFUTED`) by learning dense cross-attention representations of semantic entailment that tolerate lexical variation, avoiding prompt-induced over-skepticism.

---

## 2. Invariants & Strict Isolation Boundaries

To isolate the cross-encoder architecture as the **sole independent variable**:
1. **ZERO Retrieval Changes:** The retrieval pipeline (BGE-M3 + Qdrant + PyLate) and pre-retrieved candidate evidence pools are frozen.
2. **ZERO Chunking Changes:** Document chunk representations and parent–child hierarchies remain identical.
3. **ZERO Tier-1 Deterministic Changes:** All deterministic checks (antonym dictionary `$semanticOpposites`, regex fast-paths, entity alignment) remain identical.
4. **ZERO Verifier Framework Changes:** Intent classification, clause decomposition, polarity pre-processing, ambiguity detection, predicate decomposition, post-verification guards, and clause aggregation remain strictly frozen.
5. **ZERO Generative JSON Prompting for C1/C2:** Native logits/probabilities from sequence-classification heads are mapped via native three-class argmax. No prompt engineering, no chain-of-thought, no formatting heuristics.
6. **ZERO Fine-Tuning:** All candidate models are evaluated pure off-the-shelf / zero-shot.
7. **ZERO Blind Data Contamination:** `EXP-0033-BLIND-DATASET.json` ($N=500$) remains sealed. No candidate may be evaluated on blind data unless all advancement gates are cleared.
8. **ZERO Production Modifications:** `EduConnect-LMS-Production` remains untouched.

---

## 3. Experimental Conditions

### C0 — Control (Frozen A4 Verifier)
- **Model:** `llama3.2:latest` (Ollama, ~3.2B parameters, Q4_K_M)
- **Architecture:** Generative instruction-tuned LLM with JSON prompt schema
- **Role:** Frozen project reference baseline (Dev Accuracy: 92.00%, 368/400)

### C1 — NLI MiniLM (Cross-Encoder)
- **Model:** `cross-encoder/nli-MiniLM2-L6-H768`
- **Revision / Commit:** `b95119ce93d3e065de6214e38cd4a97b0f2f2c6d`
- **Architecture:** 6-layer MiniLM sequence-classification cross-encoder (~82.1M parameters)
- **Pretraining / NLI Data:** SNLI + MultiNLI
- **Class Mapping (`id2label`):**
  - Index 0: `CONTRADICTION` $\to$ `REFUTED`
  - Index 1: `ENTAILMENT` $\to$ `SUPPORTED`
  - Index 2: `NEUTRAL` $\to$ `NOT_ESTABLISHED`

### C2 — DeBERTa NLI (Cross-Encoder)
- **Model:** `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`
- **Revision / Commit:** `6f5cf0a2b59cabb106aca4c287eed12e357e90eb`
- **Architecture:** DeBERTa-v3-base sequence-classification cross-encoder (~86M backbone / ~184M embedding+head parameters)
- **Pretraining / NLI Data:** MultiNLI + FEVER-NLI + ANLI (Adversarial NLI)
- **Class Mapping (`id2label`):**
  - Checked from `model.config.id2label` (verified prior to inference)

---

## 4. Input Representation & Decision Rule

### Semantic Pairing:
- **Premise:** Evidence text retrieved from the curriculum document bundle.
- **Hypothesis:** Student query / assertion claim text.

### Decision Rule:
Native three-class argmax over softmax probabilities:
$$\hat{y} = \arg\max \left( P(\text{contradiction}), P(\text{entailment}), P(\text{neutral}) \right)$$
- If $\hat{y} = \text{entailment} \implies \text{SUPPORTED}$
- If $\hat{y} = \text{contradiction} \implies \text{REFUTED}$
- If $\hat{y} = \text{neutral} \implies \text{NOT\_ESTABLISHED}$

Threshold tuning is explicitly excluded from EXP-0068 to preserve pure architectural comparison.

---

## 5. Development Dataset & Shortcut-Stratified Analysis

**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`).

All 400 cases are pre-stratified into 7 deterministic strata:
- **S1 — Antonym-Assisted ($N=213$):** Lexical match to `$semanticOpposites`.
- **S2 — Non-Antonym ($N=187$):** Lacks antonym dictionary match (core false-premise testbed).
- **S3 — High Overlap Support ($N=100$):** `SUPPORTED_CURRICULUM` queries with high lexical overlap.
- **S4 — Low Overlap / Paraphrase ($N=50$):** Legitimate negation / transformed syntax (core hyper-skepticism testbed).
- **S5 — Normative / Subjective / Universal ($N=40$):** Normative or universal quantifiers.
- **S6 — Compound / Multi-Clause ($N=50$):** Multi-proposition claims.
- **S7 — Out-of-Curriculum OOD ($N=100$):** External technology queries.

---

## 6. Pre-Registered Candidate Advancement Gates

A candidate may advance to blind validation if and only if **ALL** six gates pass:

- **Gate A (False Acceptance Reduction):** Total false acceptance count (`REFUTED -> SUPPORTED`) decreases relative to C0 ($\text{FAR} \le \text{FAR}_{\text{C0}}$).
- **Gate B (Supported Recall Preservation):** Supported claim recall does not materially degrade ($\text{Drop} \le 3.00\text{ pp}$ relative to C0; Supported Recall $\ge 82.33\%$).
- **Gate C (OOD Safety Preservation):** OOD classification accuracy / safety remains $\ge 95.00\%$.
- **Gate D (Overall Development Non-Inferiority):** Overall accuracy is non-inferior to C0 (Exact McNemar paired test $p > 0.05$ or paired $\Delta \ge -1.50\text{ pp}$).
- **Gate E (Hard-Stratum Survivability):** Performance improvements survive on S2 (Non-antonym) and S4 (Low-overlap paraphrase) rather than being confined to easy/antonym-assisted cases.
- **Gate F (Computational Viability):** Resource envelope acceptable (peak RAM $\le 8\text{ GB}$, latency acceptable for interactive verifier).

### Stop Rule:
If neither C1 nor C2 clears all six gates, **STOP IMMEDIATELY**. Do not evaluate on `EXP-0033-BLIND-DATASET.json`. The blind holdout remains strictly sealed.

---

## 7. Required Artifacts
- `EXP-0068-PROTOCOL.md` (this file)
- `EXP-0068-MODEL-MANIFEST.json`
- `EXP-0068-DEVELOPMENT-PREDICTIONS.json`
- `EXP-0068-DEVELOPMENT-METRICS.json`
- `EXP-0068-STRATIFIED-ANALYSIS.json`
- `EXP-0068-ERROR-TRANSITIONS.json`
- `EXP-0068-CALIBRATION-ANALYSIS.json`
- `EXP-0068-FAILURE-ANALYSIS.md`
- `EXP-0068-DEVELOPMENT-ANALYSIS.md`
- `EXP-0068-FINAL-REPORT.md`
- (If gates pass) `EXP-0068-BLIND-PREDICTIONS.json`, `EXP-0068-BLIND-METRICS.json`, `EXP-0068-BLIND-ANALYSIS.md`, `EXP-0068-INDEPENDENT-AUDIT.md`.
