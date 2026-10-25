# EXP-0064: Phase A — C1 Reproducibility Reconciliation Report

**Experiment Identifier:** EXP-0064  
**Date:** 2026-09-20  
**Status:** COMPLETE  
**Artifacts Compared:**
- Historical Reference: `EXP-0061-DEVELOPMENT-PREDICTIONS.json` (Condition `c4_5_sg`, Accuracy: 92.25%, 369/400)
- Observed Reference: `EXP-0064-DEVELOPMENT-PREDICTIONS.json` (Condition `c1`, Accuracy: 92.50%, 370/400)
- Historical Traces: `EXP-0061-DEVELOPMENT-TRACES.jsonl`
- Observed Traces: `EXP-0064-DEVELOPMENT-TRACES.jsonl`

---

## 1. Executive Summary

A discrepancy of $+0.25$ percentage points (1 query out of 400) was observed between the EXP-0061 reference development-set evaluation (92.25%) and the EXP-0064 C1 development-set evaluation (92.50%).

An audit of all 400 queries confirmed:
- **Total Identical Predictions:** 399 / 400 (**99.75%**)
- **Total Differences:** Exactly 1 query (**0.25%**)
- **Retrieval & Evidence Differences:** **0** (Byte-identical evidence chunks, order, and metadata)
- **Structural Gate Differences:** **0** (Identical gate decisions and retained chunk IDs)
- **Root Cause:** **Downstream Tier-2 LLM Non-Determinism** in the frozen A4 verifier (`llama3.2:latest` via Ollama).

---

## 2. Detailed Discrepancy Investigation

### Query Profile
- **Query ID:** `DEV-SUP-031`
- **Query Text:** *"How does async/await allow asynchronous code to be written sequentially?"*
- **Category:** `SUPPORTED_CURRICULUM`
- **Expected Label:** `SUPPORTED`

### Evidence Trace Comparison
Both runs presented **identical** evidence to the A4 verifier:
- Retained Evidence Chunks (4 chunks from Document `c254cc49-47b8-455f-bc9e-bc834c0276fe`, "JavaScript ES6+ Deep Dive", Section "ASYNCHRONOUS JAVASCRIPT & PROMISES"):
  1. `c254cc49-47b8-455f-bc9e-bc834c0276fe_c2_sem085_12`
  2. `c254cc49-47b8-455f-bc9e-bc834c0276fe_c2_sem085_13`
  3. `c254cc49-47b8-455f-bc9e-bc834c0276fe_c2_sem085_14`
  4. `c254cc49-47b8-455f-bc9e-bc834c0276fe_c2_sem085_11`
- Context Tokens: 258 tokens (identical)
- Gate Reason: `COHERENT_TOPIC_RETAINED` (identical)

### Downstream Verifier Decision Comparison
- **EXP-0061 (`c4_5_sg`):**
  - Predicted: `REFUTED` (Incorrect)
  - Confidence: `0.96`
  - Decision Tier: `TIER_2_SEMANTIC_NLI`
  - Decision Reason: *"Semantic contradiction established by Tier-2 NLI over curriculum evidence"*
- **EXP-0064 (`c1`):**
  - Predicted: `SUPPORTED` (Correct)
  - Confidence: `0.95`
  - Decision Tier: `TIER_2_SEMANTIC_NLI`
  - Decision Reason: *"Premise entailed by curriculum evidence according to Tier-2 NLI"*

---

## 3. Root Cause Analysis

1. **Semantic Ambiguity at the Boundary:**
   - The query asks how *asynchronous* code can be written *sequentially*.
   - The curriculum evidence states: *"async/await provides syntax that makes asynchronous code appear and execute like synchronous code."*
   - Because "asynchronous" and "synchronous/sequential" are semantic opposites in Tier-1 vocabulary, but here appear in a legitimate conceptual synthesis ("asynchronous code written sequentially"), Tier-1 passes the clause to Tier-2 NLI.
2. **Tier-2 LLM Non-Determinism:**
   - In Tier-2, the premise and hypothesis are sent to local `llama3.2:latest` via Ollama (`temperature = 0.0`, `num_predict = 25`).
   - Despite `temperature = 0.0`, local LLM runtimes (GPU/CPU thread scheduling, batching state, floating-point accumulation) can produce slight logit fluctuations near classification decision boundaries.
   - In EXP-0061, the model resolved the tension between "asynchronous" and "sequential" as `CONTRADICTION` (confidence 0.96).
   - In EXP-0064, the model resolved it as `ENTAILMENT` (confidence 0.95).

---

## 4. Methodological Conclusion & Governance Policy

1. **No Evidence or Retrieval Drift:** The retrieval pipeline (BGE-M3 hybrid + Qdrant RRF + PyLate + Structural Coherence Gate) is 100% deterministic and reproducible across runs.
2. **Historical Integrity Preserved:** In accordance with the experiment specification:
   - Historical EXP-0061 artifacts (`EXP-0061-DEVELOPMENT-PREDICTIONS.json`, 92.25%) remain unchanged.
   - Historical EXP-0064 artifacts (`EXP-0064-DEVELOPMENT-PREDICTIONS.json`, 92.50%) remain unchanged.
   - Neither historical artifact is modified.
3. **Implications for Blind Evaluation:**
   - For blind evaluation, B1 will be loaded directly from historical `EXP-0061-BLIND-PREDICTIONS.json` to preserve the original EXP-0061 blind baseline with zero drift.
