# EXP-0060: Experimental Protocol

**Experiment Identifier:** EXP-0060  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** FROZEN PROTOCOL (Pre-Execution Specification)  
**Research Question:** *"Does reducing the amount of retrieved evidence passed from the C4 retrieval stage into the frozen A4 verifier improve downstream decisions without changing the retrieval ranking itself?"*

---

## 1. Scientific Purpose & Role Separation

### 1.1 Context & Hypothesis
EXP-0059 established that:
- BGE-M3 + PyLate late-interaction retrieval substantially improves evidence retrieval (Recall@1 = 96.88%, nDCG@5 = 86.92% vs C0 Recall@1 = 85.55%, nDCG@5 = 80.91%).
- Despite superior retrieval quality, C4 downstream verifier accuracy (86.50%) lagged behind the deterministic baseline C0 (92.00%).
- Forensic analysis identified OOD keyword collisions ($26/31$ errors) as the dominant disagreement family.
- C1–C4 passed an average of 3097 context tokens (20 chunks) to A4, compared to 580 tokens (5 bounded parent chunks) in C0.

EXP-0060 isolates a single variable: **the evidence budget handed to the frozen A4 verifier**, while holding the retrieval ranking and scoring strictly invariant.

### 1.2 Scientific Role Separation
The experiment specification is fixed externally:
- **NO new repositories or retrieval algorithms:** Zero changes to BGE-M3, PyLate, Qdrant, or RRF.
- **NO re-ranking or candidate pool alterations:** Candidate pool remains `k=20`.
- **NO verifier modifications:** Frozen A4 verifier (`backend/rag_ambiguity_guard_verifier.php`) remains untouched.
- **NO threshold or weight tuning:** No post-hoc parameter adjustments.
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

## 3. Experimental Conditions

The benchmark evaluates four conditions over the $N=400$ development queries:

### C0 — FROZEN CONTROL
- **Architecture:** EXP-0056 deterministic structural retrieval over `C2_ChonkieSemantic_085` + frozen A4 verifier.
- **Source:** `scratch/exp0056_dev_predictions.json` (Accuracy: 92.00%, 368/400).
- **Invariance:** Unmodified, frozen reference baseline.

### C4-20 — EXP-0059 REFERENCE (Full Evidence Budget)
- **Architecture:** BGE-M3 Dense + Sparse $\to$ Qdrant Hybrid RRF ($k=60$) $\to$ PyLate `lightonai/GTE-ModernColBERT-v1` reranking.
- **Evidence Handoff:** Top 20 PyLate-ranked chunks handed to A4.
- **Reproduction Constraint:** Must reproduce EXP-0059 C4 downstream results (Accuracy: 86.50%, 346/400).

### C4-10 — REDUCED EVIDENCE (Intermediate Evidence Budget)
- **Architecture:** EXACT SAME C4 retrieval ranking as C4-20.
- **Evidence Handoff:** Pass ONLY the top 10 PyLate-ranked chunks to A4 (`chunks[:10]`).
- **Isolation Invariant:** Prefix invariant `c4_10_chunks == c4_20_chunks[:10]`.

### C4-5 — MINIMAL EVIDENCE (Minimal Evidence Budget)
- **Architecture:** EXACT SAME C4 retrieval ranking as C4-20.
- **Evidence Handoff:** Pass ONLY the top 5 PyLate-ranked chunks to A4 (`chunks[:5]`).
- **Isolation Invariant:** Prefix invariant `c4_5_chunks == c4_20_chunks[:5]`.

---

## 4. Critical Isolation & Invariance Rules

1. **Prefix Identity:**
   $$\text{C4-5}_{\text{evidence}} \equiv \text{C4-10}_{\text{evidence}}[0:5] \equiv \text{C4-20}_{\text{evidence}}[0:5]$$
   $$\text{C4-10}_{\text{evidence}} \equiv \text{C4-20}_{\text{evidence}}[0:10]$$
2. **Zero Retrieval Modification:**
   Retrieval is executed once per query to obtain the full top-20 PyLate ranking. Slicing happens strictly at the evidence bridge.
3. **Verifier Bridge Sentinel:**
   As established in EXP-0057/EXP-0059, `$chunk['similarity'] = 1.0` is passed strictly at the PHP gate boundary to satisfy `backend/rag_premise_verifier.php` line 1207 (`($chunk['similarity'] ?? 0.0) >= 0.28`). This value is never used for scoring, ranking, or probability estimation.

---

## 5. Evaluation Protocol

### 5.1 20-Query Technical Gate
Prior to running the full $N=400$ benchmark, a 20-query technical gate will verify:
1. C4-20 reproduces EXP-0059 retrieval outputs.
2. C4-10 is the exact prefix (`[:10]`) of C4-20.
3. C4-5 is the exact prefix (`[:5]`) of C4-20.
4. Downstream A4 verifier executes with zero modifications.
5. No synthetic scores, no blind access, no production modifications.

### 5.2 Full Development Benchmark ($N=400$)
Execute C0, C4-20, C4-10, C4-5 across all 400 cases in `EXP-0025-DEVELOPMENT-DATASET.json`.
Emit:
- `EXP-0060-DEVELOPMENT-TRACES.jsonl`
- `EXP-0060-DEVELOPMENT-PREDICTIONS.json`
- `EXP-0060-DEVELOPMENT-METRICS.json`

### 5.3 Primary Metrics
- **Accuracy** (with 95% Wilson score confidence interval)
- **Macro F1**
- **FAR** (False Acceptance Rate on non-supported cases)
- **FRR** (False Rejection Rate on supported cases)
- **Supported, Refutation, NOT_ESTABLISHED, and OOD Recalls**
- Full $3 \times 3$ confusion matrices

### 5.4 Retrieval Metrics
Reported once for the shared C4 ranking:
- Recall@1, Recall@3, Recall@5, Recall@10
- nDCG@5, nDCG@10
- Relevant chunk appearance distribution: Ranks 1–5, Ranks 6–10, Ranks 11–20

### 5.5 Efficiency Metrics
- Context Tokens: Mean, Median, P95 for C4-20, C4-10, C4-5 (verifying $C4\text{-}5 < C4\text{-}10 < C4\text{-}20$)
- A4 Verification Latency & Total Latency
- Peak RAM and VRAM

### 5.6 Paired Statistical Comparisons
- C4-10 vs C4-20
- C4-5 vs C4-20
- C4-5 vs C0
- Metrics: $n_{11}, n_{00}, n_{10}, n_{01}$, discordant pairs, McNemar exact two-sided p-value, paired accuracy difference, 95% CI.

### 5.7 Forensic & OOD Analysis
- Classify all prediction transitions across evidence budgets into forensic failure families:
  OOD keyword collision, irrelevant high-rank evidence, relevant evidence retained, relevant evidence removed, compound premise, legitimate negation, novel false premise, section contamination, verifier ambiguity.
- Specifically evaluate whether evidence reduction reduces OOD false acceptances without inducing false abstentions on supported cases.
