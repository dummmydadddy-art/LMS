# EXP-0062: Experimental Protocol

**Experiment Identifier:** EXP-0062  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** FROZEN PROTOCOL (Pre-Execution Specification)  
**Research Question:** *"Can closed-corpus corrective retrieval improve difficult cases after the initial retrieval-and-structural-gating pipeline, without changing the frozen verifier or introducing external knowledge?"*

---

## 1. Scientific Purpose & Construct Definition

### 1.1 Context & Motivation
- **EXP-0059:** BGE-M3 + PyLate late-interaction retrieval significantly improved evidence retrieval recall (Recall@1 = 96.88% vs C0 = 85.55%), but downstream A4 accuracy lagged behind the baseline (86.50% vs 92.00%).
- **EXP-0060:** Truncating evidence budget alone ($k=20 \to k=10 \to k=5$) did not close the gap ($k=5 \implies 87.75\%$), confirming that evidence volume was not the primary driver.
- **EXP-0061:** Structural coherence gating successfully removed cross-module noise, yielding development-set accuracy statistically indistinguishable from the frozen control (C4-5-SG = 92.25% vs C0 = 92.00%, McNemar $p = 1.0$), and blind-set accuracy statistically indistinguishable from control (B1 = 72.80% vs B0 = 72.80%, McNemar $p = 1.0$). However, blind OOD accuracy remained at 92.0% (vs B0 = 96.0%).
- **EXP-0062:** Evaluates whether an adaptive, closed-corpus corrective retrieval layer inspired by CRAG can diagnose poor retrieval quality and self-correct difficult cases without external knowledge or verifier modifications.

### 1.2 Construct Terminology: Closed-Corpus Corrective Retrieval
The original CRAG framework (Yan et al., 2024) utilizes web search as an external corrective mechanism.
**THIS EXPERIMENT DOES NOT.**
- **Construct Name:** *"Closed-corpus corrective retrieval inspired by CRAG"*.
- **Closed-Corpus Invariant:** Strictly NO external search (Google, Bing, Wikipedia, external HTTP APIs).
- **Corpus Restriction:** All retrieval and re-retrieval operations search strictly within `C2_ChonkieSemantic_085` (the 76-child-chunk educational corpus in `database/rag_materials.sqlite3`).

### 1.3 Scientific Role Separation & Boundaries
The experiment protocol is fixed externally:
- **NO new retrieval frameworks:** No CRAG substitutes, no ColSmol, no GraphRAG, no RAGLite.
- **NO model modifications:** Zero changes to BGE-M3, PyLate, Qdrant, or A4.
- **NO post-hoc threshold tuning:** CRAG evaluator thresholds are frozen prior to execution.
- **NO LLM evaluator or prompt engineering:** Use only the verified local evaluator in `research/retrieval_adapters/crag_adapter.py`.
- **NO blind evaluation:** `EXP-0033-BLIND-DATASET.json` remains strictly untouched. No blind predictions emitted.
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
| **EXP-0061 Blind Predictions (FROZEN)** | `EXP-0061-BLIND-PREDICTIONS.json` | `05073ba8ec3175865a7d307137f7129f79cb256b9c97b83ea3f605a92a549117` |
| **Document Corpus** | `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`) | 76 child chunks across 23 parent sections |

---

## 3. Experimental Conditions

The benchmark evaluates three conditions over the $N=400$ development queries:

### C0 — FROZEN CONTROL
- **Architecture:** EXP-0056 deterministic structural retrieval over `C2_ChonkieSemantic_085` + frozen A4 verifier.
- **Source:** `scratch/exp0056_dev_predictions.json` (Accuracy: 92.00%, 368/400).
- **Invariance:** Unmodified, frozen reference baseline.

### C1 — EXP-0061 REFERENCE (Candidate Pipeline without CRAG)
- **Architecture:** BGE-M3 Dense+Sparse $\to$ Qdrant RRF ($k=60$) $\to$ PyLate ColBERT $\to$ Top-5 evidence $\to$ Structural Coherence Gate $\to$ Frozen A4.
- **Reproduction Constraint:** Must reproduce the established EXP-0061 development path (Accuracy: 92.25%, 369/400).

### C2 — CLOSED-CORPUS CRAG (Adaptive Corrective Layer)
- **Initial Pipeline:** EXACT SAME initial retrieval as C1:
  $$\text{BGE-M3 Hybrid} \to \text{PyLate} \to \text{Top-5} \to \text{Structural Coherence Gate}$$
  *Isolation Invariant:* `c1_pre_crag_chunk_ids == c2_initial_chunk_ids`, `c1_pre_crag_scores == c2_initial_scores`.
- **CRAG Evaluation:**
  Evaluated using the verified local evaluator in `research/retrieval_adapters/crag_adapter.py`:
  $$\text{confidence} = 0.70 \times \text{top\_score} + 0.30 \times \text{mean\_score}$$
  - If $\text{confidence} \ge \text{upper\_threshold}$ ($0.65$): Action = `KEEP` (pass-through, no corrective retrieval).
  - If $\text{lower\_threshold} \le \text{confidence} < \text{upper\_threshold}$ ($0.40 \le \text{conf} < 0.65$): Action = `DECOMPOSE_RECOMPOSE` (context expansion).
  - If $\text{confidence} < \text{lower\_threshold}$ ($0.40$): Action = `CLOSED_CORPUS_REWRITE_RETRIEVE` (technical keyword query reformulation + closed-corpus re-retrieval from `C2_085` + candidate fusion).
- **Post-Correction Structural Gate:** The exact same structural coherence gate is re-applied to post-correction candidates.
- **Verification:** Post-gate evidence handed to frozen A4 verifier with sentinel `similarity = 1.0`.

---

## 4. Frozen CRAG Parameters & Correction Budget

The following parameters are frozen prior to execution:
- `upper_threshold`: $0.65$
- `lower_threshold`: $0.40$
- `max_correction_rounds`: $1$ (strictly bounded; no recursive retries)
- `re_retrieval_top_k`: $5$
- `re_retrieval_corpus`: `C2_ChonkieSemantic_085` (SQLite table)
- `query_reformulation_stopwords`: `{"what", "which", "when", "where", "does", "explain", "describe", "show", "tell", "true", "false", "that", "this", "with"}`
- `query_reformulation_max_terms`: $5$

---

## 5. Evaluation Protocol

### 5.1 20-Query Technical Feasibility Gate
Prior to full $N=400$ execution, verify:
1. C1 and C2 initial retrieval are strictly identical.
2. CRAG action is genuine.
3. No external network retrieval occurred.
4. No gold labels were accessed.
5. No A4 changes occurred.
6. Maximum one correction round.
7. Correction searches only `C2_085`.
8. No synthetic evidence or scores.
9. Structural gate remains unchanged.
10. Output schema is valid.
11. Correction traces are complete.

### 5.2 Full Development Benchmark ($N=400$)
Execute C0, C1, and C2 across all 400 cases in `EXP-0025-DEVELOPMENT-DATASET.json`.
Emit:
- `EXP-0062-DEVELOPMENT-TRACES.jsonl`
- `EXP-0062-DEVELOPMENT-PREDICTIONS.json`
- `EXP-0062-DEVELOPMENT-METRICS.json`

### 5.3 Primary Metrics
- **Accuracy** (Wilson 95% CI)
- **Macro F1**
- **FAR** and **FRR**
- **Category Recalls:** Supported, Refutation, NOT_ESTABLISHED, and OOD Recalls
- Full $3 \times 3$ confusion matrices

### 5.4 CRAG-Specific Metrics
- Correction trigger rate
- Mean corrections per query
- Queries corrected vs not corrected
- Corrective query generation rate
- Action distribution (`KEEP`, `DECOMPOSE_RECOMPOSE`, `CLOSED_CORPUS_RETRIEVE`, `OTHER`)
- Mean context tokens before vs after correction

### 5.5 Correction Effectiveness & Forensics
For every C2 query, classify:
- `UNCHANGED_CORRECT`
- `CORRECTED_WRONG_TO_RIGHT`
- `CORRECTED_RIGHT_TO_WRONG`
- `UNCHANGED_WRONG`
- `NEW_EVIDENCE_BUT_NO_PREDICTION_CHANGE`

Classify transitions into established failure families:
`wrong_section_selection`, `cross_topic_retrieval`, `adjacent_broad_section`, `compound_premise`, `missing_clause`, `legitimate_negation`, `novel_false_premise`, `ood_keyword_collision`, `relevant_evidence_removed`, `insufficient_evidence`, `other`.

### 5.6 Paired Statistical Comparisons
- Primary: C2 vs C1
- Secondary: C2 vs C0
- Metrics: $n_{11}, n_{00}, n_{10}, n_{01}$, discordant pairs, McNemar exact two-sided $p$-value, paired accuracy difference, 95% CI.

### 5.7 Development Decision Rule
Classify the C2 development outcome as one of:
- `IMPROVES`
- `DEGRADES`
- `SIMILAR`
- `INCONCLUSIVE`
based on the measured paired evidence.
