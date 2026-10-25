# EXP-0030: Dynamic Curriculum Grounding + Asymmetric Pass-2 Calibration Design Specification

**Experiment ID:** `EXP-0030`  
**Base Lineage:** EXP-0029 (Commit `d5aa6d7`)  
**Status:** IMPLEMENTATION DESIGN SPECIFICATION  

---

## 1. Mathematical & Theoretical Motivation

EXP-0029 successfully introduced pre-filtering (`C7`), lifting accuracy by $+8.34\text{ pp}$ over B5 and resolving OOD parametric leakage ($+32.50\text{ pp}$) and ambiguity over-inference ($+24.00\text{ pp}$) with zero regressions over B5. However, two crucial limitations remained:

1. **Static Entity Boundary Blocklist:**  
   Component A checked for 27 explicit external technologies (`go`, `mongodb`, `svelte`, etc.). For unlisted novel technologies (e.g., `htmx`, `lit`, `clojure`, `elixir`, `deno`, `bun`, `prisma`), the verifier lacked explicit entity awareness.
2. **Symmetric Pass-2 Over-Refutation ($FAR = 30.48\%$):**  
   In B5 and C7, Pass-2 contradiction probing (`B4_probe`) used the same confidence threshold ($0.70$) as Pass-1 entailment. Because Pass-2 is an adversarial probe specifically prompted to detect contradictions, its polarity sensitivity is elevated. For supported claims with compound clauses, negative constraints (*"without mutating"*), or non-literal paraphrasing, Pass-2 frequently outputs `CONTRADICTION` with confidence $0.70\text{--}0.74$, incorrectly overturning benign claims.

---

## 2. Dynamic Curriculum Boundary Architecture (Component A v2)

Instead of matching against a hardcoded 27-item array, the verifier loads `EXP-0030-CURRICULUM-VOCABULARY.json` containing 106 verified curriculum concepts extracted from `material_chunks`.

### Decision Procedure:
1. **Entity Discovery:** Extract potential entity and technology tokens $E_q = \{e_1, e_2, \dots\}$ from the query (capitalized multi-word phrases, hyphenated technical terms, framework names).
2. **Curriculum Membership Check:**
   $$\text{is\_curriculum}(e) = (e \in \text{CurriculumVocab}) \lor (\text{alias}(e) \in \text{CurriculumVocab})$$
3. **Evidence Passage Co-occurrence Check:**  
   If $e \notin \text{CurriculumVocab}$, inspect the retrieved evidence passages $T_{ev}$:
   $$\text{in\_evidence}(e) = (e \in T_{ev})$$
4. **Gating Rule:**
   $$\text{If } \exists e \in E_q \text{ s.t. } \neg\text{is\_curriculum}(e) \land \neg\text{in\_evidence}(e) \implies \text{entity\_status} = \text{'MISMATCH'} \implies \text{pass2\_gate} = \text{'ABSTAIN'}$$
   When `pass2_gate = 'ABSTAIN'`, any Pass-1 parametric hallucination is overridden to `NEUTRAL`, and Pass-2 is blocked, resolving the claim as `NOT_ESTABLISHED`.

---

## 3. Asymmetric Pass-2 Calibration

Pass 2 decision logic is decoupled into two independent confidence thresholds:
- $T_{contra}$: Minimum confidence required for Pass 2 to declare `CONTRADICTION`.
- $T_{entail}$: Minimum confidence required for Pass 1 to declare `ENTAILMENT`.

### Asymmetric Rule:
$$T_{contra} > T_{entail}$$
By establishing $T_{contra} = 0.75$ (or higher, calibrated on development data) while maintaining $T_{entail} = 0.70$ (or $0.65$), Pass 2 requires stronger evidence before overturning a neutral Pass-1 state into a hard refutation.

---

## 4. Experimental Modes & Ablation Matrix

| Mode | Pre-Filter Entity Engine | Pass-1 Threshold | Pass-2 Threshold | Asymmetric? | Purpose |
|:---:|:---|:---:|:---:|:---:|:---|
| **D0** | Static 27-item list (C7) | 0.70 | 0.70 | No | Frozen C7 baseline control |
| **D1** | Dynamic Curriculum Vocabulary | 0.70 | 0.70 | No | Isolate dynamic vocabulary effect |
| **D2** | Static 27-item list (C7) | 0.70 | Asymmetric ($T_c > T_e$) | Yes | Isolate asymmetric calibration effect |
| **D3** | Dynamic Curriculum Vocabulary | 0.70 | Asymmetric ($T_c > T_e$) | Yes | **Primary Candidate Method** |
| **D4** | Dynamic Curriculum Vocabulary | 0.75 | 0.75 | No | High-symmetric control |
