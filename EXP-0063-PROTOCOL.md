# EXP-0063: Experimental Protocol

**Experiment Identifier:** EXP-0063  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** FROZEN PROTOCOL (Pre-Execution Specification)  
**Research Question:** *"Can a genuine CRAG-style retrieval-quality evaluator be made runtime-compatible with the BGE-M3 + PyLate retrieval pipeline without inventing arbitrary score thresholds?"*

---

## 1. Scientific Purpose & Context

### 1.1 Background & Motivation
- **EXP-0059 & EXP-0060:** Established that neural retrieval (BGE-M3 + PyLate ColBERT) provides superior recall over deterministic baselines, but downstream accuracy was degraded by cross-module evidence noise. Truncating evidence budget alone ($k=20 \to k=5$) did not restore accuracy.
- **EXP-0061:** Structural coherence gating successfully eliminated cross-module noise, achieving development-set accuracy (92.25%) statistically indistinguishable from the frozen control (92.00%, McNemar $p = 1.0$), and blind-set accuracy (72.80%) statistically indistinguishable from control (72.80%, McNemar $p = 1.0$).
- **EXP-0062:** Evaluated closed-corpus corrective retrieval. However, the evaluation layer in `research/retrieval_adapters/crag_adapter.py` computed confidence as:
  $$\text{confidence} = 0.70 \times \text{top\_score} + 0.30 \times \text{mean\_score}$$
  against fixed thresholds ($\text{upper} = 0.65, \text{lower} = 0.40$). Because PyLate ColBERT produces unbounded MaxSim token scores (mean confidence $\approx 16.68$), 100% of queries evaluated as `CORRECT` ($\text{trigger\_rate} = 0.0\%$), resulting in zero corrective actions.
- **EXP-0063 Purpose:** Determines whether a genuine CRAG retrieval-quality evaluator can be executed locally and integrated with the BGE-M3 + PyLate pipeline without inventing arbitrary score thresholds, substitute LLM judges, or heuristic score normalizations.

---

## 2. Scientific Governance & Invariants

In strict adherence to experimental integrity:
1. **NO Pipeline Alterations:** Do NOT modify BGE-M3, Qdrant, PyLate, the EXP-0061 structural coherence gate, or the frozen A4 verifier (`backend/rag_ambiguity_guard_verifier.php`).
2. **NO External Knowledge or Web Search:** Strictly zero external HTTP calls, zero web searches (Google, Bing, Wikipedia).
3. **NO Heuristic Substitutions:**
   - Do NOT invent a similarity-score normalization (e.g., min-max, sigmoid, z-score) and call it CRAG.
   - Do NOT replace the evaluator with an unrelated LLM judge (e.g., prompting Ollama/Llama) and claim it is CRAG.
   - Do NOT tune thresholds post-hoc after observing retrieval scores.
4. **NO Gold Label Leakage:** The evaluator must never access ground-truth labels during inference.
5. **NO Blind Dataset Access:** `EXP-0033-BLIND-DATASET.json` remains strictly locked and sealed.
6. **NO Production Modifications:** `EduConnect-LMS-Production` must remain frozen at commit `176883227602671b545e061dacf228aedc3271a5`.

---

## 3. Evaluator Requirements & Provenance Criteria

### 3.1 Genuine Evaluator Definition
A genuine CRAG retrieval-quality evaluator must:
1. Evaluate the pair:
   $$\text{QUERY} + \text{RETRIEVED PASSAGE / EVIDENCE}$$
   rather than simply consuming upstream numeric retriever similarity scores.
2. Produce a confidence degree and a discrete retrieval-quality verdict:
   $$\text{verdict} \in \{\text{CORRECT}, \text{AMBIGUOUS}, \text{INCORRECT}\}$$
3. Route between:
   - `CORRECT`: Retain retrieved evidence (`KEEP`).
   - `AMBIGUOUS`: Execute supported closed-corpus context refinement (`DECOMPOSE_RECOMPOSE` / context expansion).
   - `INCORRECT`: Execute closed-corpus re-retrieval from `C2_ChonkieSemantic_085` (`CLOSED_CORPUS_REWRITE_RETRIEVE`).

### 3.2 Provenance Requirements
If official CRAG evaluator weights are available, the following must be recorded:
- Upstream repository and author attribution (`HuskyInSalt/CRAG`).
- Evaluator architecture (e.g., fine-tuned T5-large or specified encoder).
- Model checkpoint filename and SHA-256 hash.
- Model revision.
- Tokenizer and inference dependencies.
- Hardware requirements (CPU/RAM/GPU/VRAM).
- Expected input prompt / sequence format.

---

## 4. Feasibility Gate & Stop Condition

### 4.1 Technical Feasibility Investigation
Before executing any benchmark:
1. Audit `research/retrieval_adapters/crag_adapter.py` and determine its actual implementation.
2. Search local environment and cache for official CRAG evaluator model weights.
3. Determine if official weights can be verified and executed locally using only local resources.

### 4.2 Feasibility Stop Condition
- If official CRAG evaluator weights are **NOT available locally** or cannot be verified with authentic provenance:
  - Record `CRAG_EVALUATOR_STATUS = NOT_READY`.
  - Document the exact technical blocker in `EXP-0063-CRAG-EVALUATOR-PROVENANCE.md`.
  - **STOP immediately after feasibility investigation.**
  - Do NOT proceed to the $N=400$ benchmark.
  - Do NOT substitute a heuristic.

### 4.3 20-Query Activation Gate (Only if Runnable)
If and only if a genuine evaluator is locally runnable:
- Evaluate the 20-query feasibility set from `EXP-0025-DEVELOPMENT-DATASET.json`.
- Verify the evaluator produces more than one distinct decision state across the set without labels.
- Verify that all corrective actions conform to the closed-corpus invariant.

---

## 5. Locked Reference Artifacts

| Component | Path | SHA-256 Hash |
| :--- | :--- | :--- |
| **Development Dataset** | `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| **Blind Dataset (LOCKED)** | `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| **Frozen A4 Verifier** | `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| **Document Corpus** | `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`) | 76 chunks across 23 parent sections |
