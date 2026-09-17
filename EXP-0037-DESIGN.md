# EXP-0037: Experimental Design — Controlled Ambiguity Mitigation via Deterministic Stage-2 Routing & Neutrality Calibration

**Experiment Identifier:** EXP-0037  
**Target Milestone:** Controlled Ambiguity Mitigation & Safety Ceiling Restitution  
**Parent Lineage:** `d8c1ed31d42cd7e8472b04a0853541631c32030a` (EXP-0036 Frozen Commit)  
**Ancestor Lineage:**  
- Verifier Ancestor: `01d6220` (EXP-0031 E4)  
- Retrieval Champion: `b2fb2f2` (EXP-0034 Hybrid Dense M2, pool=15, alpha=0.50, min-max [0.40, 0.85])  
- Dynamic Gating Champion: `f392b13` / `2bcccca` (EXP-0035 G6 Intent & Clause Verifier)  
- Structured Semantic NLI: `d8c1ed3` (EXP-0036 N7 Polarity & Predicate Decomposition)  
**Branch:** `exp-0037`  
**Date:** 2026-09-17  
**Status:** DEVELOPMENT PHASE — STRICT ZERO-LEAKAGE PROTOCOL  

---

## 1. Scientific Motivation & Empirical Problem Statement

In EXP-0036, candidate **N7** (Structured Tier-2 NLI with explicit polarity reasoning, atomic predicate decomposition, and 7 calibrated few-shot demonstrations) delivered a substantial breakthrough in semantic refutation:
* **FALSE_PREMISE Accuracy:** jumped from **51.20%** (M2 baseline) to **68.00%** (**+16.80 pp**, 85/125 cases).
* **Refutation Recall:** rose from **53.70%** to **67.90%** (**+14.20 pp**).
* **Overall Accuracy:** reached **68.60%** (+1.80 pp over M2).

However, candidate N7 was formally **REJECTED** due to a severe safety breach:
* **Standard False Acceptance Rate (FAR):** increased from **18.12%** to **20.56%** (+2.44 pp), breaching the pre-registered safety boundary of $\le 18.50\%$.
* **AMBIGUOUS Query Collapse:** Accuracy on ambiguous/subjective queries collapsed from **64.00%** (M2) to **49.33%** (**-14.67 pp**, 37/75 cases).
* **Mechanism of Failure:** 
  The structured few-shot prompt (P4) exhibited forced-choice over-confidence on subjective, normative, or comparative queries that lacked an indisputable objective rule in the curriculum. The model produced 23 false acceptances on ground-truth `NOT_ESTABLISHED` cases, forcing verdicts into `SUPPORTED` (confidence 0.95) instead of recognizing epistemic insufficiency.

EXP-0037 is designed to isolate, mitigate, and resolve this specific failure mode without sacrificing N7's semantic refutation capabilities.

---

## 2. Research Questions & Hypotheses

### Primary Research Question
Can a deterministic ambiguity/subjectivity abstention shield reduce false acceptances on underspecified or normative queries while preserving the semantic refutation gains from N7?

### Formal Hypotheses
* **H1 (FAR Reduction):** A deterministic ambiguity routing guard operating at Stage 2 reduces Standard FAR back within the safety envelope ($\le 18.50\%$).
* **H2 (Ambiguity Recovery):** The guard prevents forced-choice hallucinations on subjective/normative queries, increasing AMBIGUOUS accuracy by $\ge +8.00$ pp.
* **H3 (Refutation Preservation):** Polarity reasoning and atomic predicate decomposition gains on FALSE_PREMISE queries (+16.80 pp) are fully preserved.
* **H4 (OOD Invariant):** Out-of-distribution detection ($\ge 90.00\%$) and legitimate technical support are unharmed.
* **H5 (Non-Inferiority):** The resulting system approaches or exceeds the historical R0 (69.60%) performance while satisfying all production safety criteria.

---

## 3. Strict Non-Leakage & Scope Boundaries

To prevent overfitting, shortcut learning, and benchmark contamination, the following invariants are strictly enforced:
1. **Zero Blind Inspection:** The blind dataset (`EXP-0033-BLIND-DATASET.json`, $N=500$, SHA-256 `3b4fd6c7...`) remains completely uninspected and unused during development. No individual blind cases or labels are referenced.
2. **Preserved Retrieval Stack:**
   - Dense model: `BAAI/bge-small-en-v1.5` (384-dim)
   - Cross-encoder reranker: `cross-encoder/ms-marco-MiniLM-L-6-v2`
   - Candidate pool: 15
   - Dense normalization: Min-Max [0.40, 0.85]
   - Score fusion: $lpha 	imes 	ext{norm}(dense) + (1-lpha) 	imes 	ext{platt}(cross)$, $lpha = 0.50$
   - Stage-3 relevance gate: $	heta(intent)$ from EXP-0035
3. **Preserved Semantic Machinery:**
   - Polarity reasoning (negation cues, comparative terms, antonyms) from N7
   - Atomic predicate decomposition from N7
   - 7 pre-registered development demonstrations strictly from `EXP-0025-DEVELOPMENT-DATASET.json`
4. **Targeted Intervention:**
   - Only the experimentally registered ambiguity mitigation layer (`backend/rag_ambiguity_guard_verifier.php`) is introduced.

---

## 4. Stage-2 Ambiguity Routing Guard Architecture

The Ambiguity Routing Guard operates deterministically before the decisive N7 few-shot prompt:

```
Query -> Intent Classification (G2)
      -> Clause Decomposition (G4)
      -> Polarity Pre-processor (N2): Antonym Conflict? -> REFUTED (Tier 1 Fast Path)
      -> Stage-2 Ambiguity Detector:
           - Normative: should, ought to, recommended, advisable
           - Subjective: best, better, superior, ideal, preferable, optimal, etc.
           - Comparative: strictly better, more suitable, preferable to, etc.
           - Universal: always, never, universally, generally
           - Intent Marker: best, better, perfect, optimal, superior, etc.
      -> IF Ambiguity Detected:
           - Evaluate Evidence Grounding:
               * CASE A: Explicit rule/mandate in evidence ('must', 'required', 'rule', etc.)
                         AND no trade-offs -> allow SUPPORTED (if NLI confirms)
               * CASE B: Evidence discusses trade-offs, alternatives, or lacks universal rule
                         -> override forced entailment to NOT_ESTABLISHED
               * CASE C: Evidence contradicts claim -> REFUTED
      -> ELSE: Standard N7 Execution
```

Principle: **Explicit Evidence > Subjective Inference**  
(Not: Ambiguity = Always Unknown).

---

## 5. Candidate Matrix & Causal Ablation Plan

| Candidate | Identifier | Ambiguity Routing Guard | Prompt Mode | Entailment Threshold (Guarded) | Contradiction Threshold (Guarded) | Causal Component Isolated |
|---|---|---|---|---|---|---|
| **A0** | Frozen N7 Baseline | Disabled | P4 | 0.70 | 0.70 | Reference comparator (EXP-0036 N7) |
| **A1** | Guarded Routing | Enabled | P4 | 0.70 | 0.70 | $A0 \to A1$: Isolates Stage-2 routing guard |
| **A2** | Guarded + Neutrality Prior | Enabled | P4_neutral | 0.70 | 0.70 | $A1 \to A2$: Isolates epistemic prompt directive |
| **A3** | Guarded + Dynamic Threshold | Enabled | P4 | 0.85 | 0.80 | $A2 \to A3$: Isolates dynamic threshold elevation |
| **A4** | Guarded + Prior + Threshold | Enabled | P4_neutral | 0.85 | 0.80 | $A3 \to A4$: Measures full combined effect |

---

## 6. Pre-Registered Selection Criteria Hierarchy

1. **Priority 1:** Reduce Standard FAR ($\le 18.50\%$).
2. **Priority 2:** Improve AMBIGUOUS accuracy ($\ge 60.00\%$).
3. **Priority 3:** Preserve FALSE_PREMISE accuracy ($\ge 68.00\%$) and Refutation Recall ($\ge 67.00\%$).
4. **Priority 4:** Preserve OOD Recall ($\ge 90.00\%$).
5. **Priority 5:** Minimize False Abstentions ($\le 5$ dev, $\le 20$ blind).
6. **Priority 6:** Overall Accuracy and Macro F1.
