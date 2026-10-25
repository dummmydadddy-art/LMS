# EXP-0065: Experimental Protocol

**Experiment Identifier:** EXP-0065  
**Title:** Verifier/NLI Capacity Isolation Benchmark  
**Branch:** `research-integration`  
**Starting Research HEAD:** `276e88a84f6fe665c9d6a360637f07ff188cbd58`  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (FROZEN — UNTOUCHED at `176883227602671b545e061dacf228aedc3271a5`)  
**Date:** 2026-09-26  
**Status:** PRE-EXECUTION SPECIFICATION  

---

## 1. Primary Research Question

> **Does replacing the 3B-class Tier-2 NLI model with a larger/more capable local instruction model improve verifier accuracy while preserving the existing safety envelope?**

### Scientific Context & Motivation
1. **Retrieval is near-perfect:** EXP-0059 demonstrated that BGE-M3 + PyLate ColBERT achieves Recall@1 = 96.88% and Recall@5 = 99.61%.
2. **Downstream accuracy is stagnant:** Across EXP-0037 (71.60%), EXP-0040 (72.00%), EXP-0056 (72.80%), EXP-0061 (72.80%), and EXP-0064 (73.00%), blind holdout accuracy remains bounded near the ~72.80% ceiling with no statistically significant gains from retrieval modifications (McNemar $p = 1.0$).
3. **Downstream error attribution:** The error taxonomy in `POST_AUDIT_RAG_DELTA.md` showed that 80–90 of 142 blind errors directly trace to Tier-2 LLM NLI misclassifications (47 false rejections where valid claims are called contradictions, and 31 false acceptances where subtle contradictions are missed).
4. **Hypothesis:** Upgrading the Tier-2 NLI model capacity from 3B parameters (`llama3.2:latest`) to higher-capacity local models (`qwen3:4b`, `qwen3:8b`) will reduce false rejections and false acceptances, breaking through the 72.80% blind accuracy ceiling without degrading the safety envelope (Standard FAR $\le 18.50\%$).

---

## 2. Invariants & Strict Isolation Boundaries

To ensure 100% scientific attribution to Tier-2 NLI model capacity:
1. **ZERO Retrieval Changes:** No changes to query embedding, lexical indexing, dense retrieval, RRF, or vector stores.
2. **ZERO Chunking Changes:** Document chunks and parent-child hierarchies remain identical.
3. **ZERO Structural Gating Changes:** Gating rules, evidence filtering, and candidate evidence selection are strictly frozen.
4. **ZERO Generator Changes:** The generative model is excluded entirely from this benchmark.
5. **ZERO Verifier Logic Redesign:** The frozen A4 verifier logic in `backend/rag_ambiguity_guard_verifier.php` remains unmodified.
6. **ZERO Blind Data Contamination:** `EXP-0033-BLIND-DATASET.json` remains sealed until the development candidate clears the advancement rule. No hyperparameter or prompt tuning on blind data.
7. **ZERO Production Modifications:** `EduConnect-LMS-Production` remains untouched.

---

## 3. Locked Reference Artifacts & Hashes

| Component | Path | Expected SHA-256 Hash |
| :--- | :--- | :--- |
| **A4 Verifier** | `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| **Development Dataset** | `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| **Blind Dataset (SEALED)** | `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| **Dev Retrieval Cache** | `scratch/exp0056_dev_c1_cache.json` | 400 frozen query evidence bundles |
| **Blind Retrieval Cache** | `scratch/exp0056_blind_c1_cache.json` | 500 frozen query evidence bundles |

---

## 4. Evaluated Model Capacity Conditions

All models run locally via Ollama with `temperature = 0.0`, `format = "json"`, `stream = false`, `num_predict = 25`, and strict NLI prompts.

### C0 — Control (Baseline 3B-Class)
- **Model:** `llama3.2:latest`
- **Parameter Scale:** ~3.2B
- **Quantization:** Q4_K_M (~2.0 GB)
- **Role:** Frozen project reference baseline.

### C1 — Intermediate Model
- **Model:** `qwen3:4b`
- **Parameter Scale:** ~4B
- **Quantization:** Standard Ollama Q4 (~2.5 GB)
- **Role:** Evaluate whether small capacity increase + architectural improvements improve NLI classification.

### C2 — Larger Model
- **Model:** `qwen3:8b`
- **Parameter Scale:** ~8B
- **Quantization:** Standard Ollama Q4 (~5.2 GB)
- **Role:** Evaluate higher-capacity instruction following and logical discrimination under CPU/RAM offload.

---

## 5. NLI Contract & Deterministic Replay Harness

### NLI Contract
- **Input:** Premise (Evidence Context), Hypothesis (Student Claim / Predicate), Epistemic Directive (`P4_neutral`).
- **Prompt Mode:** Frozen Mode A4 (`P4` default, `P4_neutral` on guarded queries).
- **Target Label Space:** `CONTRADICTION`, `ENTAILMENT`, `NEUTRAL`.
- **Output Mapping:**
  - `CONTRADICTION` $\to$ `REFUTED`
  - `ENTAILMENT` $\to$ `SUPPORTED`
  - `NEUTRAL` $\to$ `NOT_ESTABLISHED`
- **Format:** Strict JSON `{"label": "...", "confidence": 0.0-1.0}`.
- **Failures:** Parsing failures are recorded as `PARSE_FAILURE` and count as incorrect predictions.

### Replay Architecture
- Replay harness feeds frozen queries and pre-retrieved evidence chunks directly into `RagAmbiguityGuardVerifier::verify($query, $chunks, ['mode' => 'A4', 'model' => $modelName])`.
- Zero live retrieval or generative overhead.

---

## 6. Pre-Registered Metrics & Analysis Plan

### 6.1 Performance Metrics
- **Overall Accuracy:** $\frac{\text{Correct}}{N}$
- **Macro F1:** Mean of F1 across SUPPORTED, REFUTED, NOT_ESTABLISHED
- **Standard FAR (False Acceptance Rate):** $\frac{\text{False Acceptances}}{\text{Total Non-Supported Ground Truth}}$
- **FRR (False Rejection Rate):** $\frac{\text{False Rejections}}{\text{Total Supported Ground Truth}}$
- **Supported Recall:** $\frac{\text{True Supported}}{\text{Total Supported}}$
- **Refutation Recall:** $\frac{\text{True Refuted}}{\text{Total Refuted}}$
- **NOT_ESTABLISHED Recall:** $\frac{\text{True NOT_ESTABLISHED}}{\text{Total NOT_ESTABLISHED}}$
- **OOD Recall / Safety:** Accuracy on out-of-curriculum queries
- **Efficiency:** Latency P50, P95, Mean (ms), Peak RAM / VRAM

### 6.2 Statistical Testing
- **Paired McNemar Exact Test** against C0 on identical test items.
- **Score 95% Confidence Interval** for paired difference $\Delta = \text{Acc}_{\text{Candidate}} - \text{Acc}_{\text{C0}}$.
- **Non-inferiority margin:** $\Delta_{\text{NI}} = -3.00\text{ pp}$.

---

## 7. Candidate Advancement Rule (Phase 1 $\to$ Phase 2)

A candidate model advances from Development ($N=400$) to Blind Validation ($N=500$) if and only if:
1. **Accuracy Signal (Requirement A):** Statistically non-inferior and numerically superior to C0 ($\text{Acc}_{\text{Cand}} > \text{Acc}_{\text{C0}}$) or demonstrates significant reduction in dominant error categories (False Rejections / False Acceptances).
2. **Safety Preservation (Requirement B):** Standard $\text{FAR} \le 18.50\%$ and OOD Recall $\ge 90.00\%$.

If no candidate satisfies both requirements, EXP-0065 stops after development evaluation.
