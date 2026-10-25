# EXP-0061: Experimental Protocol

**Experiment Identifier:** EXP-0061  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** FROZEN PROTOCOL (Pre-Execution Specification)  
**Research Question:** *"Can structural coherence gating remove unrelated evidence from the final A4 context while preserving the strongest C4 evidence?"*

---

## 1. Scientific Purpose & Role Separation

### 1.1 Context & Motivation
EXP-0060 established that:
- Relevant evidence in C4 is overwhelmingly concentrated in ranks 1–5 (Recall@1 = 96.88%, Recall@5 = 98.44%).
- Downstream A4 verifier accuracy modestly improved from C4-20 (86.75%) to C4-5 (87.75%, $+1.00$ pp, McNemar $p = 0.21875$).
- However, reducing evidence volume alone does not restore the C0 accuracy level (92.00%, $p = 0.00762$).
- OOD errors remain substantial even with top-5 evidence ($25/31$ errors) because unrelated curriculum chunks that exhibit spurious keyword or semantic overlap with out-of-curriculum queries still enter the top-5 candidate pool.

Therefore, EXP-0061 investigates whether **structural coherence gating** can deterministically filter out structurally unrelated evidence from the top-5 evidence set prior to A4 verification.

### 1.2 Structure: Two-Phase Design
This experiment consists of two phases:
- **Phase A (Reconciliation):** Complete 400-query pairwise reconciliation of EXP-0059 C4 (86.50%) and EXP-0060 C4-20 (86.75%). Fully certified before Phase B.
- **Phase B (Structural Gating):** $N=400$ development benchmark across three conditions: `C0`, `C4-5`, and `C4-5-SG`.

### 1.3 Scientific Role Separation
The experiment protocol is specified externally:
- **NO new repositories or retrieval algorithms:** Zero additions to BGE-M3, PyLate, Qdrant, or RRF.
- **NO LLM or learned classifier for gating:** Structural gate must be strictly deterministic and metadata-driven.
- **NO semantic query-to-section classifier:** Gating relies exclusively on structural document metadata and retrieval rank.
- **NO post-hoc tuning:** Thresholds and grouping logic are frozen prior to execution.
- **NO verifier modifications:** Frozen A4 verifier (`backend/rag_ambiguity_guard_verifier.php`) remains untouched.
- **NO blind access or evaluation:** `EXP-0033-BLIND-DATASET.json` remains strictly untouched.
- **NO production modifications:** `EduConnect-LMS-Production` remains untouched at `176883227602671b545e061dacf228aedc3271a5`.

---

## 2. Locked Reference Artifacts

| Component | Path | SHA-256 Hash |
| :--- | :--- | :--- |
| **Development Dataset** | `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| **Blind Dataset (LOCKED - DO NOT ACCESS)** | `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| **Frozen A4 Verifier** | `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| **EXP-0040 Blind Predictions (FROZEN)** | `EXP-0040-BLIND-PREDICTIONS.json` | `56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1` |
| **EXP-0055 Blind Predictions (FROZEN)** | `EXP-0055-BLIND-PREDICTIONS.json` | `fe2c71a87738f242a9e480b2e8329c39dc2252d04e087a0b6236270bb719bba2` |
| **EXP-0056 Blind Predictions (FROZEN)** | `EXP-0056-BLIND-PREDICTIONS.json` | `175595afa9c71b75bec96b52de9c591190d4d7a751e290190f41d549e1f803a9` |
| **Document Corpus** | `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`) | 76 child chunks across 23 parent sections |

---

## 3. Phase A Reconciliation Summary

Phase A resolved the $+0.25$ pp difference between EXP-0059 C4 (346/400) and EXP-0060 C4-20 (347/400):
- **399 / 400 predictions (99.75%)** are identical.
- **Retrieval evidence is 100% byte-identical** across all 400 queries.
- **Single Discrepancy:** `DEV-UNK-048` (*"What is the purpose of the Raft consensus algorithm in distributed systems?"*), an out-of-curriculum query.
- **Root Cause:** Local Ollama `llama3.2:latest` NLI returned a borderline `CONTRADICTION` (0.96) under heavy sequential load in EXP-0059, but returned `NEUTRAL` (0.35) in EXP-0060. Five independent re-runs in isolation confirmed `NOT_ESTABLISHED` consistently.
- **Certification:** Documented in `EXP-0061-C4-RECONCILIATION.json` and `EXP-0061-C4-RECONCILIATION.md`. Phase A is certified.

---

## 4. Experimental Conditions

The benchmark evaluates three conditions over the $N=400$ development queries:

### C0 — FROZEN CONTROL
- **Architecture:** EXP-0056 deterministic structural retrieval over `C2_ChonkieSemantic_085` + frozen A4 verifier.
- **Source:** `scratch/exp0056_dev_predictions.json` (Accuracy: 92.00%, 368/400).
- **Invariance:** Unmodified, frozen reference baseline.

### C4-5 — MINIMAL EVIDENCE BUDGET (Ungated Reference)
- **Architecture:** BGE-M3 Dense + Sparse $\to$ Qdrant Hybrid RRF ($k=60$) $\to$ PyLate `lightonai/GTE-ModernColBERT-v1` reranking.
- **Evidence Handoff:** Top 5 PyLate-ranked chunks handed directly to A4 (`chunks[:5]`).
- **Baseline Accuracy:** 87.75% (351/400 in EXP-0060).

### C4-5-SG — STRUCTURAL COHERENCE GATED
- **Architecture:** EXACT SAME C4 retrieval ranking as C4-5.
- **Evidence Handoff:** Top 5 PyLate-ranked chunks filtered by deterministic structural coherence gating before handing to A4.
- **Gating Rule:**
  1. Group top-5 chunks by structural section `(document_id, heading)`.
  2. Identify dominant structural section from rank-1 chunk.
  3. Retain chunks belonging to this dominant section (and adjacent continuous chunks within the same document).
  4. Remove structurally disjoint cross-module or cross-topic chunks.
  5. Preserve internal ranking order and original retrieval scores of retained chunks.
  6. Record `pre_gate_chunk_ids`, `post_gate_chunk_ids`, `removed_chunk_ids`, `removed_sections`, and `gate_reason`.

---

## 5. Evaluation Protocol

### 5.1 20-Query Technical Gate
Prior to the full $N=400$ execution, verify:
1. Exact ranking preservation: `pre_gate_chunk_ids` strictly identical to C4-5.
2. Deterministic gating: Gating decisions produce identical results across runs.
3. Trace fidelity: All gate fields properly populated.
4. Verifier compatibility: Frozen A4 verifier processes gated chunks cleanly.

### 5.2 Full Development Benchmark ($N=400$)
Execute C0, C4-5, C4-5-SG across all 400 cases in `EXP-0025-DEVELOPMENT-DATASET.json`.
Emit:
- `EXP-0061-DEVELOPMENT-TRACES.jsonl`
- `EXP-0061-DEVELOPMENT-PREDICTIONS.json`
- `EXP-0061-DEVELOPMENT-METRICS.json`

### 5.3 Primary Metrics
- **Accuracy** (with 95% Wilson score confidence interval)
- **Macro F1**
- **FAR** (False Acceptance Rate on non-supported cases)
- **FRR** (False Rejection Rate on supported cases)
- **Category Recalls:** Supported, Refutation, NOT_ESTABLISHED, and OOD Recalls
- Full $3 \times 3$ confusion matrices

### 5.4 Gate Statistics
- Percentage of queries with evidence removed
- Mean, median, max chunks removed
- Number of queries reduced to 0 chunks (if any)
- Category breakdown of gated queries (OOD vs In-Curriculum)

### 5.5 Paired Statistical Comparisons
- C4-5-SG vs C4-5 (evaluating the pure effect of structural gating)
- C4-5-SG vs C0 (evaluating gap closure to frozen baseline)
- Metrics: $n_{11}, n_{00}, n_{10}, n_{01}$, discordant pairs, McNemar exact two-sided p-value, paired accuracy difference, 95% CI.

### 5.6 Forensic & OOD Analysis
- Classify all prediction transitions across C4-5 and C4-5-SG into forensic failure families:
  OOD keyword collision, irrelevant high-rank evidence, relevant evidence retained, relevant evidence removed, compound premise, legitimate negation, novel false premise, section contamination, verifier ambiguity.
- Specifically evaluate whether structural gating reduces OOD false acceptances without inducing false rejections on supported curriculum queries.
