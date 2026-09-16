# EXP-0036: Pre-Check & Baseline Provenance Audit

**Target Experiment:** EXP-0036 (Structured Tier-2 NLI Verification)  
**Parent Commit:** `2bcccca` (EXP-0035 complete blind evaluation and final analysis)  
**Branch:** `exp-0036`  
**Date:** 2026-09-16  
**Status:** COMPLETE AUDIT  

---

## 1. Provenance Discrepancy Investigation

### The Observed Discrepancy
* **EXP-0034 Final Report (Commit `b2fb2f2`):** Mode M2 reported Accuracy **66.60%** (333 / 500).
* **EXP-0035 Blind Reproduction (Commit `2bcccca`):** Mode B0 (M2 Baseline) reported Accuracy **66.80%** (334 / 500).
* **Net Divergence:** $+0.20$ percentage points ($+1$ case out of 500).

### Forensic Isolation of the Root Cause
A paired bit-level comparison between `scratch/exp0034_predictions.json` (`M2`) and `scratch/exp0035_blind_predictions.json` (`B0`) revealed that 499 out of 500 predictions (99.8%) were completely identical. Exactly **one query** differed:

* **Query ID:** `EXP33-SUP-0124`
* **Module:** `DATABASE`
* **Query Text:** *"Can parameterized queries safeguard relational database applications against SQL injection attacks?"*
* **Expected Label:** `SUPPORTED`
* **Fused Retrieval Similarity:** $0.3165$ (Top Chunk: *PostgreSQL Database Design*, passes Stage 3 gate $> 0.28$)
* **EXP-0034 Execution:**
  - Status: `NOT_ESTABLISHED`
  - Confidence: `0.35`
  - Decision Tier: `TIER_2_ABSTENTION`
  - Decision Reason: *"Insufficient or neutral evidence in retrieved curriculum passages to establish premise"*
* **EXP-0035 Execution:**
  - Status: `SUPPORTED`
  - Confidence: `0.95`
  - Decision Tier: `TIER_2_SEMANTIC_NLI`
  - Decision Reason: *"Premise entailed by curriculum evidence according to Tier-2 NLI"* (Latency: $1441.4$ ms)

### Technical Root Cause
The difference was caused by zero-shot Tier-2 NLI prompt sensitivity under Ollama `llama3.2:latest`:
1. In EXP-0034, the un-cached live call for `EXP33-SUP-0124` generated a marginal confidence score of $0.35$ (default fallback for ambiguous JSON output), falling below the $0.70$ entailment acceptance threshold and triggering a `NOT_ESTABLISHED` abstention.
2. In EXP-0035, the live Ollama call correctly extracted entailment with confidence $0.95$, triggering a `SUPPORTED` verdict.

### Authoritative Baseline Declaration for EXP-0036
For all comparative evaluations in EXP-0036:
* **Authoritative M2 Baseline for EXP-0036:** **66.80%** (334 / 500), matching the verified execution state of `exp-0035` (`EXP-0035-BLIND-RESULTS.json`).
* **Historical Baseline for EXP-0034:** **66.60%** (333 / 500), preserved verbatim in historical commit `b2fb2f2`.
* **Rationale:** EXP-0036 builds directly from commit `2bcccca` (`exp-0035`). The single-case divergence ($1/500 = 0.20$ pp) is empirically documented and exemplifies the exact problem EXP-0036 is tasked to eliminate: **unstructured zero-shot prompt volatility in Tier-2 NLI.**
