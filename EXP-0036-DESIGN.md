# EXP-0036: Experimental Design — Structured Tier-2 NLI Verification & Polarity-Aware Grounding

**Experiment Identifier:** EXP-0036  
**Target Milestone:** Downstream Tier-2 Semantic NLI Verification Hardening  
**Parent Lineage:** `2bcccca7a58ddcb392fa942c75a409f6ae136b80` (EXP-0035 Blind Final Benchmark)  
**Ancestor Verifier:** `01d6220` (EXP-0031)  
**Retrieval Champion:** `b2fb2f2` (EXP-0034 Hybrid Dense M2, pool=15, alpha=0.50)  
**Dynamic Gating Champion:** `f392b13` (EXP-0035 G6 Decomposed Clause Verifier)  
**Branch:** `exp-0036`  
**Date:** 2026-09-16  
**Status:** DEVELOPMENT FROZEN — READY FOR BLIND AUDIT  

---

## 1. Research Problem & Motivation

In EXP-0035, the implementation of dynamic intent-aware gating (G3) and compound clause decomposition (G6) successfully eliminated false rejections on multi-part queries (+0.20 pp blind, 0 regressions across 500 cases). However, comprehensive forensic analysis of the remaining 165 blind errors revealed that **the retrieval pipeline is no longer the bottleneck**:
* Fused Recall@5 on curriculum evidence exceeds **98.2%**.
* In 9 out of 10 analyzed failure cases, the relevant curriculum evidence was already ranked in the top-5 candidates and passed the relevance gate $\theta(intent)$.
* The downstream verifier rejected these grounded queries due to **Tier-2 NLI semantic verification failures**.

### Primary Failure Modes of Tier-2 NLI (Zero-Shot Ollama `llama3.2:latest`):
1. **Descriptive Evidence Under-Confidence:** When curriculum evidence describes a technical mechanism rather than using verbatim keyword matches (e.g. *"array populated with results of calling function"* for *"transforms without mutating"*), the zero-shot prompt outputs `NEUTRAL` with confidence below the acceptance threshold (0.35 vs 0.70 threshold), causing a false abstention.
2. **Polarity & Directional Inversion:** In subtle false claims that invert temporal order, dimensions, or constraints (e.g., *"display: flex initiates 2-dimensional grid"*, *"COMMIT rolls back transactions"*, *"setTimeout executes before microtasks"*), high lexical overlap confuses the model into predicting `ENTAILMENT`.
3. **Compound Predicate Collapse:** Complex single-sentence technical assertions containing both an attribute and a constraint often cause the NLI model to focus only on the entity rather than checking the constraint.

EXP-0036 directly intervenes on the **Tier-2 NLI semantic verification stage** without altering the underlying embedding models, candidate pool size, or frozen retrieval fusion parameters.

---

## 2. Research Question & Primary Hypotheses

### Research Question
Can improved Tier-2 NLI prompt framing, structured claim-evidence reasoning, and explicit polarity pre-processing reduce neutral/incorrect abstentions on legitimate technical curriculum evidence while preserving contradiction detection and Out-of-Distribution (OOD) safety?

### Primary Hypotheses
* **H1 (Structured Framing):** Explicitly structuring the NLI prompt into distinct `[EVIDENCE CONTEXT]`, `[STUDENT CLAIM]`, and `[TASK]` sections reduces false `NEUTRAL` abstentions on supported technical curriculum statements.
* **H2 (Polarity Pre-processing):** Deterministic extraction of negation markers, comparative relations, and antonym conflicts passed as structured cues prevents polarity inversion on false claims.
* **H3 (Calibrated Few-Shot Demonstrations):** Pre-registering 7 fixed demonstrations strictly drawn from the development dataset improves semantic entailment recognition on paraphrased and descriptive curriculum evidence.
* **H4 (Safety Preservation):** The above improvements can be achieved with zero regression on Out-of-Distribution (OOD) safety ($100.0\%$ OOD recall) and without inflating the Standard False Acceptance Rate ($FAR \le 5.20\%$ dev, $\le 18.12\%$ blind).

---

## 3. Experimental Modes (Ablation Matrix)

All modes operate over the frozen EXP-0035 G6 retrieval stack (BGE-small + MiniLM reranker, pool=15, $\alpha=0.50$, dynamic gate $\theta(intent)$):

| Mode | Identifier | Prompt Family | Polarity Pre-processor | Predicate Decomposition | Demonstrations |
|---|---|---|---|---|---|
| **N0** | Frozen G6 Baseline | P0 (B5 prompt) | Disabled | Disabled | None (Zero-shot) |
| **N1** | Structured Evidence Prompt | P1 (Structured) | Disabled | Disabled | None (Zero-shot) |
| **N2** | Explicit Polarity Reasoning | P2 (Polarity Cues) | Enabled | Disabled | None (Zero-shot) |
| **N3** | Claim Decomposition | P1 (Structured) | Disabled | Enabled | None (Zero-shot) |
| **N4** | Few-Shot NLI Prompt | P3 (7 Demonstrations) | Disabled | Disabled | 7 Fixed Dev Cases |
| **N5** | Structured + Polarity | P2 (Polarity Cues) | Enabled | Disabled | None (Zero-shot) |
| **N6** | Structured + Clause Decomp | P1 (Structured) | Disabled | Enabled | None (Zero-shot) |
| **N7** | Full Candidate Champion | P4 (Full Structured) | Enabled | Enabled | 7 Fixed Dev Cases |

---

## 4. Development Dataset & Zero-Leakage Protocol

* **Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$).
* **Composition:**
  - `SUPPORTED_CURRICULUM`: 100 cases (Expected: `SUPPORTED`)
  - `NOVEL_FALSE_PREMISE`: 100 cases (Expected: `REFUTED`)
  - `OUT_OF_CURRICULUM_UNKNOWN`: 100 cases (Expected: `NOT_ESTABLISHED`)
  - `LEGITIMATE_NEGATION`: 50 cases (Expected: `SUPPORTED`)
  - `MIXED_COMPOUND_PREMISE`: 50 cases (Expected: `REFUTED`)
* **Total Ground Truth:** 150 SUPPORTED, 150 REFUTED, 100 NOT_ESTABLISHED.
* **Strict Blind Isolation Rule:** The blind dataset (`EXP-0033-BLIND-DATASET.json`, $N = 500$, SHA-256 `3b4fd6c7...`) remains completely uninspected, un-evaluated, and frozen until all development artifacts and configurations are finalized and committed. No blind labels or error cases are utilized for prompt wording or demonstration selection.
