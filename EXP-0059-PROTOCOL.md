# EXP-0059: Experimental Protocol

**Experiment Identifier:** EXP-0059  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** FROZEN PROTOCOL (Pre-Execution Specification)  
**Research Question:** *"Can dense+sparse hybrid retrieval followed by fine-grained late-interaction reranking improve evidence retrieval over the existing deterministic structural retrieval baseline while preserving downstream verifier behavior?"*

---

## 1. Scientific Role Separation & Governance

This experiment protocol is scientifically specified externally. In accordance with strict experimental governance:

### Prohibitions
- **NO hypothesis changes:** The core research question is strictly frozen.
- **NO new retrieval algorithms:** Only prespecified BGE-M3, Qdrant RRF, and PyLate ColBERT models.
- **NO condition alterations:** C0–C4 conditions remain fixed.
- **NO post-hoc tuning:** Thresholds, fusion weights, and candidate pool sizes must never be tuned after observing results.
- **NO verifier modifications:** Frozen A4 verifier (`backend/rag_ambiguity_guard_verifier.php`) must remain untouched.
- **NO dataset alterations:** Benchmark dataset is frozen; blind dataset must NEVER be accessed or evaluated.
- **NO blind evaluation:** Blind evaluation is strictly forbidden in this development cycle.
- **NO production modifications:** `EduConnect-LMS-Production` repository must remain untouched at commit `176883227602671b545e061dacf228aedc3271a5`.
- **NO subjective declarations:** No winner promotion or speculative declarations beyond reporting empirical metrics.

### Responsibilities
- Execute the specified experiment faithfully.
- Verify genuine local runtime implementation (zero synthetic scores, zero mock fallbacks).
- Record exact configurations and run traces.
- Calculate standardized retrieval and downstream classification metrics.
- Perform paired statistical significance tests (McNemar exact test, 95% CI).
- Perform deep forensic failure analysis across the 8 specified failure families.
- Verify all locked hashes and repository integrity before single clean Git commit.

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
| **Document Corpus** | `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`) | Exact 76 child chunks across 23 parent sections |

---

## 3. Experimental Conditions

The benchmark evaluates five conditions over the $N=400$ development queries:

### C0 — CONTROL (EXP-0056 Deterministic Structural Retrieval)
- **Architecture:** PageIndex structural navigation and bounded parent expansion over `C2_ChonkieSemantic_085`.
- **Verifier:** Frozen A4 verifier.
- **Reference Predictions:** `scratch/exp0056_dev_predictions.json` (Accuracy: 92.00%, 368/400).
- **Invariance:** Unmodified, frozen baseline comparator.

### C1 — BGE-M3 DENSE
- **Architecture:** Dense semantic vector retrieval only using `BAAI/bge-m3` (1024 dimensions, cosine distance).
- **Candidate Pool:** `dense_k = 20`.
- **Storage:** Isolated Qdrant collection `bge_m3_qdrant_c2_085` at `research/data/qdrant/exp0059_c2_085`.

### C2 — BGE-M3 SPARSE
- **Architecture:** Sparse lexical retrieval only using `BAAI/bge-m3` learned lexical term weights.
- **Candidate Pool:** `sparse_k = 20`.
- **Storage:** Isolated Qdrant collection `bge_m3_qdrant_c2_085` at `research/data/qdrant/exp0059_c2_085`.

### C3 — BGE-M3 HYBRID (Dense + Sparse RRF)
- **Architecture:** Dense vector search (`dense_k = 20`) combined with sparse lexical search (`sparse_k = 20`), fused via Reciprocal Rank Fusion:
  $$\text{RRF}(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{1}{k_{\text{rrf}} + r_m(d)}$$
  where $k_{\text{rrf}} = 60$.
- **Candidate Pool:** `hybrid_k = 20`.

### C4 — BGE-M3 HYBRID + PYLATE (Candidate Generation + ColBERT Reranking)
- **Architecture:** C3 hybrid retrieval candidate generation (`hybrid_k = 20`), followed by fine-grained late-interaction reranking using `lightonai/GTE-ModernColBERT-v1` via PyLate.
- **Candidate Pool:** `late_interaction_k = 20`.
- **Constraint:** Reranker operates strictly over the bounded C3 candidate pool. The frozen MiniLM cross-encoder is NOT invoked in C4.

### C5 — BGE-M3 NATIVE MULTI-VECTOR (Secondary Condition)
- **Status:** `NOT_EXECUTED`.
- **Reason:** Native token-level multi-vector indexing in Qdrant requires custom multi-vector schema and segment configuration not pre-configured in the adapter. PyLate ColBERT (C4) serves as the verified primary late-interaction condition. No simulation will be conducted.

---

## 4. Fixed Retrieval Parameters Contract

All parameters are prespecified and frozen:

$$\begin{aligned}
\text{dense\_k} &= 20 \\
\text{sparse\_k} &= 20 \\
\text{hybrid\_k} &= 20 \\
\text{late\_interaction\_k} &= 20 \\
k_{\text{rrf}} &= 60
\end{aligned}$$

No post-hoc tuning or condition-dependent parameter adjustments are permitted.

---

## 5. Verifier Evidence Bridge Contract

The downstream verifier is the frozen A4 verifier (`RagAmbiguityGuardVerifier::verify($query, $retrievedChunks, ['mode' => 'A4'])`).
Line 1207 of `backend/rag_premise_verifier.php` enforces a curriculum relevance threshold:
`($chunk['similarity'] ?? 0.0) >= 0.28`.
Because RRF scores ($\approx 0.01 - 0.03$) and ColBERT scores ($\approx 5.0 - 15.0$) are not calibrated to bi-encoder cosine similarities, passing raw scores would trigger false `NOT_ESTABLISHED` abstentions prematurely.

In accordance with the established repository standard (from EXP-0057):
- A non-scoring syntactical compatibility sentinel (`similarity = 1.0`) is passed strictly at the PHP gate boundary.
- The sentinel satisfies the legacy existence gate without altering evidence text, ordering, or classification logic.
- As confirmed by static and runtime audits, this value is never used for downstream probability estimation, ranking, or confidence calculation.

---

## 6. Evaluation Protocol

### 6.1 Technical Readiness Feasibility Gate (20 Queries)
Prior to running the full $N=400$ benchmark, a 20-query feasibility run over the first 20 development cases will verify:
1. Valid normalized schema (`RetrievalResult`) across all conditions.
2. Non-empty, genuine outputs with genuine model scores.
3. No cross-condition contamination.
4. Correct Qdrant dual-vector indexing over all 76 `C2_ChonkieSemantic_085` chunks.
5. Verifier preservation: C0 control predictions match frozen EXP-0056 outputs.

### 6.2 Full Development Benchmark ($N=400$)
Execute C1, C2, C3, C4 across all 400 cases in `EXP-0025-DEVELOPMENT-DATASET.json`.
Emit:
- `EXP-0059-DEVELOPMENT-TRACES.jsonl`
- `EXP-0059-DEVELOPMENT-PREDICTIONS.json`
- `EXP-0059-DEVELOPMENT-METRICS.json`

### 6.3 Retrieval Metrics
Using the objective semantic rules established in EXP-0038/EXP-0039 mapped to `C2_ChonkieSemantic_085`:
- **Recall@1, Recall@3, Recall@5, Recall@10**
- **nDCG@5, nDCG@10**
- Mean, Median, and P95 Retrieval Latency

### 6.4 Downstream A4 Metrics
- **Accuracy** (with 95% Wilson score confidence interval)
- **Macro F1**
- **False Acceptance Rate (FAR)**
- **False Rejection Rate (FRR)**
- **Supported Recall, Refutation Recall, NOT_ESTABLISHED Recall, OOD Recall**
- Full $3 \times 3$ confusion matrices

### 6.5 Statistical Significance Testing
- **Paired McNemar Exact Test** (two-sided binomial, $p=0.5$):
  - Primary: C4 vs C0
  - Secondary: C1 vs C0, C2 vs C0, C3 vs C0, C4 vs C3
  - Contingency table: $n_{11}$ (both correct), $n_{00}$ (both incorrect), $n_{10}$ (candidate correct, baseline incorrect), $n_{01}$ (candidate incorrect, baseline correct)
  - Accurate discordant pair reporting

### 6.6 Forensic Failure Analysis
Categorize all errors into the 8 failure families:
1. Wrong section selection
2. Adjacent/broad section selection
3. Missing clause evidence
4. Compound premise retrieval
5. OOD keyword collision
6. Novel false premise
7. Legitimate negation
8. Cross-topic retrieval

Determine whether late-interaction reranking (C4) resolves the fine-grained section selection failures identified in EXP-0057.
