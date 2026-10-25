# EXP-0067 Protocol: Counter-Presupposition and Bidirectional NLI Decision Formulation

**Experiment ID:** EXP-0067  
**Date:** 2026-09-26  
**Status:** Pre-registered Protocol  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Starting HEAD:** `0f125dffd7c3399335e0f9abdae9461beef16885` (`0f125df`)  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (Strictly Frozen — Untouched)  
**Evaluated Model:** `llama3.2:latest` (~3.2B, Q4_K_M) across all conditions  

---

## 1. Primary Research Question & Motivation

In EXP-0065, scaling local NLI model parameters from 3.2B to 4B/8B was conclusively falsified as a solution to downstream verification bottlenecks:
- C0 (`llama3.2:latest`, 3.2B): 92.00% Dev Accuracy
- C1 (`qwen3:4b`, 4.0B): 89.25% Dev Accuracy
- C2 (`qwen3:8b`, 8.2B): 86.00% Dev Accuracy (Statistically inferior, $p = 0.0007$; FRR escalated from 12.67% to 29.33%)

In EXP-0066, detailed error attribution of the 19.20 pp dev-to-blind generalization gap revealed that **75.00% of blind failures (102/136)** stem from verifier decision logic (**59.56% inside Tier-2 Semantic NLI**), while retrieval deficiency accounts for only **5.88%** of errors:
- **Tier-2 False Acceptance (REFUTED $\to$ SUPPORTED):** 35 errors (25.74% of all errors) caused by presupposition sycophancy on subtle false premises.
- **Tier-2 False Rejection (SUPPORTED $\to$ REFUTED):** 28 errors (20.59% of all errors) caused by semantic hyper-skepticism on valid paraphrases.
- **Tier-2 Epistemic Abstention:** 17 errors (12.50% of all errors) caused by uncalibrated neutral default.

### Research Question:
> **Can a different NLI decision formulation reduce presupposition-driven false acceptance while also reducing semantic over-rejection, without degrading OOD safety?**

### Core Hypothesis:
Explicitly separating claim verification from topic relevance, enforcing counter-presupposition rules, and formulating verification as an explicit bidirectional polarity test will reduce false acceptance of subtle false premises while preserving semantic entailment of valid paraphrases, without altering model weights or retrieval context.

---

## 2. Invariants & Strict Isolation Boundaries

To ensure 100% scientific attribution to Tier-2 NLI decision formulation:
1. **ZERO Model Changes:** The model is locked to `llama3.2:latest` across all conditions.
2. **ZERO Retrieval Changes:** The retrieval pipeline (BGE-M3 + Qdrant + PyLate) and pre-retrieved candidate pools are frozen.
3. **ZERO Chunking Changes:** Document chunk representations and parent-child hierarchies remain identical.
4. **ZERO Tier-1 Deterministic Changes:** Antonym dictionaries (`$semanticOpposites`), regex patterns, and fast-path thresholds are frozen.
5. **ZERO Generator Changes:** Generation is excluded.
6. **ZERO Blind Data Contamination:** `EXP-0033-BLIND-DATASET.json` remains sealed during development selection. No candidate may be tuned on blind data.
7. **ZERO Production Modifications:** `EduConnect-LMS-Production` remains untouched.

---

## 3. Experimental Conditions & Ablation Matrix

All conditions run locally via Ollama with `temperature = 0.0`, `format = "json"`, `stream = false`, `num_predict = 25`, and strict JSON schema enforcement.

### C0 — Control (Frozen A4 Verifier)
- **Formulation:** Current A4 verifier baseline (`P4` default, `P4_neutral` on guarded queries).
- **Prompt Hash (P4):** `c3dadd0df526efd5edcf700919a6454c27a863363dd97793aee5efa1503d5db6`
- **Role:** Frozen project reference baseline.

### C1 — Explicit Anti-Presupposition Prompt
- **Formulation:** Zero-shot instruction prompt with explicit anti-presupposition directives:
  1. The truth of the student claim must never be assumed.
  2. Topic overlap is not evidence of entailment.
  3. A sentence discussing an entity does not establish every property asserted about that entity.
  4. The evidence must explicitly support the predicate/relation in the claim.
  5. If the evidence discusses the topic but does not establish the claim $\to$ `NOT_ESTABLISHED`.
  6. If the evidence directly conflicts with the claim $\to$ `REFUTED`.
- **Constraint:** No chain-of-thought, no hidden reasoning, no few-shot demonstrations.

### C2 — Contrastive Claim Verification
- **Formulation:** C1 directives + explicit contrastive evaluation prompt:
  - Contrast whether the evidence directly supports the asserted claim, directly contradicts the claim, or merely discusses the topic without establishing either.
- **Labels:** Strictly `SUPPORTED`, `REFUTED`, `NOT_ESTABLISHED`.

### C3 — Bidirectional Polarity Check
- **Formulation:** C2 directives + explicit priority decision ladder:
  ```text
  Step 1: Does the evidence establish the opposite predicate / conflicting constraint?
          -> If YES: REFUTED
  Step 2: Else, does the evidence establish the asserted predicate?
          -> If YES: SUPPORTED
  Step 3: Else:
          -> NOT_ESTABLISHED
  ```
- **Role:** Counteract sycophancy by testing for refutation *before* checking for entailment.

### C4 — Counterfactual / Presupposition Stress Formulation
- **Formulation:** C3 directives + explicit stress instruction:
  - *"Do not treat the claim's presupposition as evidence."*
  - Distinguish *"Evidence discusses X"* from *"Evidence establishes that X has property Y"*.
  - Require explicit evidence for asserted relations, comparisons, defaults, causality, or constraints.

---

## 4. Output Contract

Every condition must return strict JSON:
```json
{
  "label": "SUPPORTED",
  "confidence": 0.91
}
```
- Allowed labels only: `SUPPORTED`, `REFUTED`, `NOT_ESTABLISHED`.
- Parsing failures are logged as `PARSE_FAILURE` and count as incorrect predictions.

---

## 5. Development Dataset & Shortcut-Stratified Analysis

**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`).

To ensure candidates do not merely exploit development regularities, all 400 cases are pre-stratified into 7 deterministic strata:
- **S1 — Antonym-Assisted ($N=213$):** Query contains a lexical match to `$semanticOpposites`.
- **S2 — Non-Antonym ($N=187$):** Query lacks an antonym dictionary match.
- **S3 — High Overlap Support ($N=100$):** `SUPPORTED_CURRICULUM` queries with high lexical overlap.
- **S4 — Low Overlap / Paraphrase ($N=50$):** `LEGITIMATE_NEGATION` queries with transformed syntax.
- **S5 — Normative / Subjective / Universal ($N=40$):** Queries containing normative or universal quantifiers.
- **S6 — Compound / Multi-Clause ($N=50$):** `MIXED_COMPOUND_PREMISE` multi-proposition claims.
- **S7 — Out-of-Curriculum OOD ($N=100$):** `OUT_OF_CURRICULUM_UNKNOWN` external technology queries.

---

## 6. Pre-Registered Metrics

1. **Overall Performance:** Accuracy, Macro F1, Standard FAR, FRR, Parse Failure Rate.
2. **False-Premise Diagnostics:** Refutation Recall, False Acceptance Count (`REFUTED -> SUPPORTED`), False Abstention Count (`REFUTED -> NOT_ESTABLISHED`).
3. **Valid Support Diagnostics:** Supported Recall, False Rejection Count (`SUPPORTED -> REFUTED`), False Abstention Count (`SUPPORTED -> NOT_ESTABLISHED`).
4. **OOD Diagnostics:** OOD Recall, OOD False Acceptance (`OOD -> SUPPORTED`), OOD False Refutation (`OOD -> REFUTED`).
5. **Stratum Breakdown:** Accuracy across S1 through S7.
6. **Efficiency:** Mean, Median, P95 latency (ms), model load time, peak memory.

---

## 7. Pareto Failure Guard & Candidate Advancement Gates

A candidate advances to Blind Validation (`EXP-0033-BLIND-DATASET.json`, $N=500$) if and only if it clears all five pre-registered gates:
- **Gate A (False Acceptance Reduction):** Demonstrates a reproducible, numerical reduction in False Acceptance (`REFUTED -> SUPPORTED`) relative to C0 on development data.
- **Gate B (Supported Recall Preservation):** Does not cause a material degradation in Supported Recall ($\le 3.00\text{ pp}$ drop from C0).
- **Gate C (OOD Safety Preservation):** OOD Recall remains $\ge 95.00\%$.
- **Gate D (Overall Non-Inferiority):** Overall development accuracy is non-inferior to C0 (paired McNemar $p > 0.05$ or $\Delta \ge -1.50\text{ pp}$).
- **Gate E (Non-Shortcut Generalization):** Improvement is observed on non-antonym (S2) or compound (S6) strata, not merely on dictionary-assisted cases (S1).

**Stop Rule:** If no candidate satisfies all five gates, the experiment terminates after development evaluation, and blind validation is NOT conducted.

---

## 8. Statistical Testing Plan

- **Paired McNemar Exact Test:** Evaluates significance of discordant pairs ($b$ vs. $c$) between each candidate and C0.
- **Paired Accuracy Delta & 95% Score CI:** Reported for each condition relative to C0.
- **Multiple Comparisons Adjustment:** Benjamini-Hochberg FDR applied across candidate conditions C1–C4.

---

## 9. Artifact Verification Hashes

| Artifact Path | Expected SHA-256 Checksum |
| :--- | :--- |
| `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| `backend/rag_premise_verifier.php` | `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179` |
| `scratch/exp0056_dev_c1_cache.json` | `e4955c0513a96e18b889d3992d8433da78b977c0b3b981b3c3e8a216569e9e0a` |
| `scratch/exp0056_blind_c1_cache.json` | `f042efd87af49bec424cabbe8b86eca21644db92b0d7e8bb576ce2d0851f9b8e` |
