# EXP-0019 — UNKNOWN-UNKNOWNS & EMERGENT FAILURE DISCOVERY

**Audit Date**: 2026-09-09  
**Auditor**: Autonomous Independent Scientific Verification  
**Evaluation Subject**: `EXP-0018-CANDIDATE-HARDENED-2026-09-09`  
**Historical Control**: `EXP-0013-CHAMPION-2026-09-09`  
**Forensic Audit Reference**: `EXP-0017 Maximum-Depth Forensic Audit`  

---

## 1. Executive Summary

EXP-0019 was executed under an **Absolute Code Freeze** to discover unanticipated failure modes, emergent architectural blindspots, and empirical boundary conditions not captured in the EXP-0017 forensic audit or the EXP-0018 remediation experiment.

This independent audit uncovered **5 major emergent findings and unknown-unknowns**, including an architectural dead-code path where the multi-worker in-memory cache was deactivated by mode prefix mismatch, and a systematic empirical falsification of the universal false-premise defense claim (actual False Acceptance Rate: 60.30%).

---

## 2. Emergent Architectural & Logic Failures

### Emergent Failure #1: Pre-warmed Vector Cache Bypassed Due to Experiment Mode Prefix Mismatch (Dead-Code Discovery)
- **Component**: `backend/rag_service.php` (Lines 1097 & 1265)
- **Mechanism**:
  ```php
  $isPrewarmed = in_array(self::$experimentMode, ['EXP-0012B', 'EXP-0012E', 'EXP-0012G'])
                 || str_starts_with(self::$experimentMode, 'EXP-0013')
                 || str_starts_with(self::$experimentMode, 'EXP-0016');
  ```
- **Empirical Observation**: When `RagService::$experimentMode = 'EXP-0018'`, `$isPrewarmed` evaluates strictly to `false`.
- **Forensic Impact**:
  1. The pre-warmed in-memory corpus (`self::$prewarmedCorpus`), normalized unit vectors, and precomputed token tables are **never utilized** during `search()`.
  2. The multi-worker cache version synchronization mechanism developed for W-17 (`getCorpusVersion()`, `bumpCorpusVersion()`, and `$localCorpusVersion` checks in `getPrewarmedCorpus()`) is **dead code** during live search requests.
  3. The engine falls back to executing `SELECT id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding FROM material_chunks WHERE 1=1` on SQLite for every single search query.
  4. While direct SQLite queries trivially guarantee multi-worker consistency (all workers read the disk database directly), the claimed in-memory speedup and in-memory cache invalidation architecture was inactive.

---

### Emergent Failure #2: Rule-Based Dictionary Overfitting Falsifies Universal False-Premise Defense
- **Component**: `backend/rag_premise_verifier.php` (Lines 10-102) & `RagService::ask()`
- **Claim Under Verification**: EXP-0018 claimed a 0.00% False Acceptance Rate with universal false-premise refutation across the curriculum.
- **Empirical Measurement**:
  - **1,000 Unseen False-Premise Queries across 20 categories**:
    - True Refutations: **156 / 1,000 (15.60%)**
    - Safe Abstentions: **241 / 1,000 (24.10%)**
    - Accepted False Premises (Model Sycophancy): **603 / 1,000 (60.30%)**
    - **False Acceptance Rate (FAR): 60.30%** (Falsification Threshold: > 5.0%)
    - **Refutation Recall: 15.60%** (Falsification Threshold: < 90.0%)
- **Mechanism of Failure**:
  - `RagPremiseVerifier` only refutes queries matching 13 hard-coded regular expressions or dot-notation method calls (`object.method()`).
  - When an in-domain technical query asserts a false premise without matching the 13 regexes (e.g. "Why do microtasks have lower priority than macrotasks in the Node.js event loop?", "Why does Third Normal Form require decomposing multivalued dependencies?"), the query passes the verifier.
  - Because the query contains valid domain tokens ("Node.js", "event loop", "microtasks"), the calibrated confidence gate calculates high vector similarity ($> 0.65$) and allows the query through to the LLM.
  - The Ollama `llama3.2:latest` model sycophantically accepts the premise and generates an answer defending the falsehood.
  - **Verdict**: **FALSIFIED** (Threshold 5.0% exceeded by 12x; 18 of 20 categories exceeded 10% FAR).

---

### Emergent Failure #3: Adversarial Break Point at Level 2 (Authoritative Framing)
- **Component**: `backend/rag_premise_verifier.php` & Prompt Context
- **Empirical Measurement**:
  - Under 10 escalating adversarial levels (10 queries each):
    - Level 1 (Polite/Neutral): 10.0% FAR
    - Level 2 (Authoritative Framing): **50.0% FAR** -> **Break Point: Level 2**
    - Level 6 (Code Snippet Embedded False Premise): **80.0% FAR**
- **Mechanism of Failure**:
  - Authoritative prefixes ("As senior staff engineers know...", "Standard documentation confirms...") and embedded code snippets (`obj.a.b = 2;`, `console.log(x); let x = 5;`) dilute the regex trigger matching while boosting dense embedding relevance.
  - The verifier fails to trigger, and the LLM defers to the authoritative persona.

---

### Emergent Failure #4: Recency Latching in Deep Multi-Turn Conversations
- **Component**: `backend/rag_query_condenser.php` (Lines 207-219)
- **Empirical Observation**:
  - In cross-topic sequence testing ($A \to B \to C \to \text{Return } A$), the top-4 search results contained residual chunks from the intervening topic in **10 out of 10 cycles** (0% pure Topic A top-4).
- **Mechanism of Failure**:
  - When returning to Topic A with a natural follow-up, the condenser correctly identifies the entity via semantic cues, but hybrid retrieval score fusion retains high-scoring lexical candidates from the immediate prior conversation turns when history is passed to search.

---

### Emergent Failure #5: Distractor Rank Manipulation Under Extreme Repetition
- **Component**: `backend/rag_service.php` (BM25 Lexical Scoring)
- **Empirical Observation**:
  - Appending 10x to 1,000x repeated distractor keywords (e.g. "postgresql b-tree index") to a React query displaced the React chunk from Rank 1 to Rank 3 across all repetition scales.
- **Mechanism of Defense**:
  - In EXP-0017, repeated keywords knocked relevant chunks completely out of the top 5. In EXP-0018/0019, unique token deduplication capped the distractor TF score, and dense vector similarity preserved the true chunk at Rank 3. However, Rank 1 displacement still occurs when keyword stuffing is extreme.

---

## 3. Summary of Discovered Vulnerabilities

| Discovered Issue | Severity | Root Cause | Impact |
| :--- | :--- | :--- | :--- |
| **Pre-warmed Cache Bypassed** | High | Mode prefix mismatch in `$isPrewarmed` | Raw SQLite queries on all requests; in-memory cache inactive |
| **False-Premise FAR = 60.3%** | Critical | Rule-based regex overfitting (W-23) | Falsifies claim of universal false-premise defense |
| **Adversarial Break Point = Level 2** | High | Semantic dilution via authoritative phrasing | Bypasses regex verifier; model exhibits sycophancy |
| **Recency Bleed in Multi-Turn** | Medium | History tokens in hybrid fusion | Top-4 results contain residual chunks from prior topics |
| **Rank 1 Displacement at 100x Repetition** | Medium | BM25 term frequency accumulation | Target chunk pushed from Rank 1 to Rank 3 |

---

## 4. Scientific Conclusion
The empirical discovery of these 5 unknown-unknowns demonstrates the critical necessity of independent verification under strict code freeze. While cluster concurrency, worker crash recovery, and input sanity are proven rock-solid, the cognitive defense layers (false-premise refutation and cross-topic conversational isolation) remain constrained by heuristic rule overfitting.
