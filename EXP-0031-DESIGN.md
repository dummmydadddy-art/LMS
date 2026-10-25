# EXP-0031: Design Specification — Tier-1 Semantic/Syntactic Decoupling & Clause-Grounded Polarity Disambiguation

**Experiment:** EXP-0031  
**Lineage:** EXP-0028 (B5) → EXP-0029 (C7) → EXP-0030 (D3) → EXP-0031 (E4)  
**Base Commit:** `3bd36c7` (exp-0030)  
**Branch:** `exp-0031`  
**Date:** 2026-09-16  
**Status:** IMPLEMENTATION DESIGN  

---

## 1. Problem Statement & Motivation

The EXP-0030 independent scientific audit established that:
1. **Pass-2 Asymmetric Calibration Was Ineffective:** Adjusting second-pass contradiction thresholds from 0.70 to 0.75 produced zero decision changes on both shadow ($N=500$) and blind ($N=400$) splits due to the bimodal confidence distribution ($0.35$ vs $\ge 0.95$) of zero-shot NLI models.
2. **True Root Cause of Elevated FAR:** **35 of 46 false refutations (76.09%)** on supported claims originate in the Tier-1 deterministic fast path. Stage 5 fast-path logic matches lexical antonyms (e.g. `mutable` vs `immutable`, `atomic` vs `partial`) and predicate negation keywords (`reassign`, `arguments`, `render`, `transitive`) without verifying proposition-level semantic contradiction.

EXP-0031 decouples lexical opposition from semantic contradiction by introducing a structured intermediate validation stage before Tier-1 can emit `REFUTED`.

---

## 2. Core Architectural Hypothesis

Many Tier-1 false refutations occur because the verifier equates **opposite-looking tokens** with **contradictory propositions**, without verifying:
- Which clause the term belongs to;
- Whether the term is inside the scope of a negation;
- Whether the term occurs in a subordinate condition (`even if`, `unless`);
- Whether the query asserts a disjunctive alternative (`A or B`);
- Whether the terms refer to the same technical entity and predicate target.

By adding a deterministic **Structural Validation Stage** before Tier-1 fast-path refutation:
- True technical contradictions (e.g., asserting `var is block-scoped` when evidence states `var is function-scoped`) are accepted with high confidence;
- False collisions (e.g., asserting `const creates an immutable binding` when evidence states `objects remain mutable`) are downgraded to `NO_DETERMINISTIC_REFUTATION` and fall through cleanly.

---

## 3. The 5-Point Structural Validation Pipeline

For any clause where Stage 5 identifies a lexical antonym or predicate negation candidate match:

```
Candidate Match in Evidence Unit
               ↓
    [1. Entity Alignment]
       - Do query and evidence share the exact technical focal subject?
       - Are sibling bullet concepts cleanly separated?
               ↓ (Pass)
    [2. Predicate Alignment]
       - Do opposite terms modify the same grammatical argument/target?
       - E.g. column atomicity ≠ transaction atomicity
               ↓ (Pass)
    [3. Negation Scope]
       - Does query use prevention/negative phrasing ('without', 'avoid', 'cannot')?
       - Distinguish 'X does not Y' from 'X does Y'
               ↓ (Pass)
    [4. Scope Validity]
       - Is opposition inside a subordinate conditional ('even if', 'unless', 'when')?
       - Is opposition inside an alternative disjunction ('either... or...')?
               ↓ (Pass)
    [5. Contradiction Confidence]
       - If ALL checks pass → contradiction_confidence = HIGH → Emit REFUTED
       - If ANY check fails → contradiction_confidence = LOW → Emit NO_DETERMINISTIC_REFUTATION
               ↓
    [Conservative Fall-Through]
       - Fall through to pre-filter gating and Tier-2 Semantic NLI
```

### Validation Check Details

### 1. Entity & Focal Subject Alignment (`entity_aligned`)
- **Rule:** Before an antonym can trigger refutation, the focal subject of the evidence unit must match the subject of the query clause.
- **Sibling Disambiguation:** Prevents cross-contamination across sibling list items:
  - `401 Unauthorized` vs `403 Forbidden`
  - `COMMIT` vs `ROLLBACK`
  - `align-items` vs `justify-content`
  - `useRef` vs `useState` (state immutability vs ref mutability)
  - `flexbox` vs `grid`
  - `HTTP PUT` vs `HTTP POST`

### 2. Predicate Target Alignment (`predicate_aligned`)
- **Rule:** The matched opposite tokens must modify the same proposition target.
- **Disambiguation Matrix:**
  - `atomic / partial`: Column scalar atomicity (1NF) $\neq$ Database transaction atomicity (ACID) $\neq$ HTTP PATCH partial modification.
  - `mutable / immutable`: Variable identifier binding (`const`) $\neq$ Object property contents $\neq$ React state copies.
  - `synchronous / asynchronous`: Event loop execution $\neq$ React state batching $\neq$ Node.js background I/O.

### 3. Negation Scope Disambiguation (`polarity_aligned`)
- **Rule:** Detect negative polarity operators in the query:
  `without`, `avoid`, `avoids`, `prevent`, `prevents`, `prevented`, `cannot`, `can't`, `does not`, `doesn't`, `never`, `no`, `eliminate`, `eliminates`.
- **Logic:**
  - If a query asks *"Can arrow functions be passed as method callbacks without creating their own dynamic this binding?"*, the phrase `without creating... dynamic this` is an asserted negative property. Evidence stating `Arrow functions do not bind their own this` **confirms** the assertion, rather than contradicting it.
  - If query has negative polarity on predicate $P$, and evidence has negative polarity on predicate $P$, the relation is **CONSISTENT**, not contradictory.

### 4. Conditional & Disjunctive Scope Validity (`scope_valid`)
- **Conditionals:** Identifies `even if`, `if`, `when`, `unless`, `only if`. Opposition located inside the conditional subordinate clause does not contradict the main proposition.
  - Example: *"Why is HTTP PUT considered idempotent even if the server updates an internal last-modified timestamp on the record?"* The phrase `updates last-modified timestamp` is an acknowledged subordinate qualification, not an assertion that PUT is non-idempotent.
- **Disjunctions:** Identifies `either... or...`, `or`. If evidence confirms one valid branch of an alternative execution path, the non-occurrence of the other branch must not refute the query.

---

## 4. Tier-1 Decision Contract & Schema

Stage 5 emits a finite, structured internal contract:

```php
[
    'lexical_opposition' => bool,
    'entity_aligned' => bool,
    'predicate_aligned' => bool,
    'polarity_aligned' => bool,
    'scope_valid' => bool,
    'contradiction_confidence' => 'HIGH' | 'LOW',
    'tier1_decision' => 'REFUTED' | 'NO_DETERMINISTIC_REFUTATION',
    'validation_reason' => string
]
```

### The Conservatism Invariant
```text
When validation is uncertain: DO NOT REFUTE.
Fall through to pre-filter and Tier-2 NLI.
```

---

## 5. Experimental Ablation Modes (E0–E4)

| Mode | Name | Description | Active Features |
|---|---|---|---|
| **E0** | Frozen Baseline | EXP-0030 D3 candidate | 106-concept dynamic vocab, legacy Tier-1 fast path, $T_{contra}=0.75, T_{entail}=0.70$ |
| **E1** | Entity & Predicate Alignment | Adds checks [1] and [2] | E0 + Sibling entity separation + Predicate target matching |
| **E2** | Explicit Negation Scope | Adds check [3] | E1 + Negation polarity inversion (`without`, `avoid`, `cannot`) |
| **E3** | Scope & Disjunction | Adds check [4] | E2 + Conditional (`even if`) & Disjunctive (`either... or`) scope |
| **E4** | Full Candidate | Full EXP-0031 candidate | E3 + Conservative fall-through contract + Confidence logging |

---

## 6. Preserved Components from EXP-0029 & EXP-0030

1. **Dynamic Curriculum Vocabulary:** The 106-concept database-grounded vocabulary is retained identically.
2. **Pre-Filter Ambiguity & Entity Gates:** The pre-filter gating logic (`ALLOW`, `ABSTAIN`, `BLOCK`) is retained.
3. **Threshold Freeze:** No threshold tuning. $T_{contra} = 0.75, T_{entail} = 0.70$ remain strictly frozen.
4. **Strict Invariants:** $100\%$ `evidence_used`, zero secret leakage, zero benchmark hardcoding.