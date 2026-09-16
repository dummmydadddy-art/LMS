# EXP-0029: Ambiguity + Entity-Grounding Pre-Filter Design Specification

**Experiment:** EXP-0029 Ambiguity + Entity-Grounding Pre-Filter  
**Date:** 2026-09-16  
**Repository:** `EduConnect-LMS-Experimental` (branch: `exp-0029`)  
**Production Isolation:** `EduConnect-LMS-Production` (Untouched)  
**Verifier File:** `backend/rag_premise_verifier.php`  

---

## 1. Overview & Architectural Motivation

In the EXP-0028 Shadow Evaluation, Mode B5 established superior refutation recall (+18.4% over EXP-0027 A5) by executing a two-pass semantic contradiction probe when Pass 1 produced an uncertain label. However, forensic analysis revealed three critical failure mechanisms:
1. **OOD Parametric Leakage:** Out-of-curriculum queries (e.g. Go goroutines, MongoDB aggregation, Svelte reactivity) exceeded the 0.28 retrieval threshold on generic programming terms. Tier-2 `llama3.2:latest` then validated true real-world claims via pre-trained weights rather than grounding decisions on curriculum text.
2. **Ambiguity Over-Inference:** Subjective/open-ended queries (*"best width"*, *"how many pixels"*) matched partial topical keywords, and Pass 2 forced binary decisions (`SUPPORTED` or `REFUTED`) instead of abstaining with `NOT_ESTABLISHED`.
3. **Pass-2 Over-Refutation:** Contradiction probing over-indexed on negative phrasing (*"without calling next()"*) in valid compound statements.

EXP-0029 introduces a lightweight, deterministic **Pre-Filter** placed immediately before Pass 2 / Tier-2 escalation to produce an auditable gate decision object without altering frozen A0–A5 or B1–B5 behaviors.

---

## 2. System Architecture

```text
Query
  ↓
Stage 0: ECMAScript non-existent operator syntax check (Tier 1 structural)
  ↓
Stage 1: Out-of-curriculum external framework boundary (Tier 1 regex)
  ↓
Stage 2: Compound clause decomposition
  ↓
Stage 3: Curriculum relevance threshold check (similarity ≥ 0.28)
  ↓
Stage 4: Atomic evidence unit extraction with focal subject alignment
  ↓
Stage 5: Per-clause proposition evaluation:
  ├── Tier-1 dictionary antonym check? → Fast-path REFUTED / SUPPORTED
  ├── Tier-1 predicate negation check? → Fast-path REFUTED / SUPPORTED
  ↓
NEW EXP-0029 Pre-Filter (evaluatePreFilter):
  ├── Component A: Entity Grounding Check
  │     Extracts query tech entities vs evidence text
  │     Returns: MATCH | MISMATCH | UNCERTAIN
  ├── Component B: Ambiguity & Question-Type Gate
  │     Detects subjective, open-ended, or multi-interpretation queries
  │     Returns: CLEAR_FACTUAL | AMBIGUOUS | OPEN_ENDED | SUBJECTIVE
  └── Component C: Evidence Adequacy Check
        Evaluates stem overlap ratio and dense similarity
        Returns: ADEQUATE | PARTIAL | INADEQUATE
  ↓
Pass 2 Gating Logic:
  ├── pass2_gate: "ALLOW"  → Execute standard B5 Pass 1 + Pass 2
  ├── pass2_gate: "BLOCK"  → Execute Pass 1; suppress Pass 2 if NEUTRAL (→ NOT_ESTABLISHED)
  └── pass2_gate: "ABSTAIN" → Suppress Pass 1 parametric leakage + block Pass 2 (→ NOT_ESTABLISHED)
  ↓
Final Output Contract: evidence_used === true
```

---

## 3. Pre-Filter Decision Object Contract

Every Tier-2 diagnostic record and top-level response includes the structured decision object:

```json
{
  "entity_status": "MATCH|MISMATCH|UNCERTAIN",
  "question_type": "CLEAR_FACTUAL|AMBIGUOUS|OPEN_ENDED|SUBJECTIVE",
  "evidence_status": "ADEQUATE|PARTIAL|INADEQUATE",
  "pass2_gate": "ALLOW|BLOCK|ABSTAIN",
  "reason_codes": [
    "OOD_ENTITY",
    "ENTITY_MISMATCH",
    "SUBJECTIVE_QUERY",
    "OPEN_ENDED_QUERY",
    "AMBIGUOUS_QUERY",
    "LOW_GROUNDING",
    "PARTIAL_EVIDENCE"
  ]
}
```

---

## 4. Component Details

### Component A: Entity Grounding Check
- **Purpose:** Detect queries whose primary technical entity or library is completely absent from the retrieved evidence chunks.
- **External Entity Registry:** Covers 27 major non-curriculum libraries, languages, and tools: `Go`, `MongoDB`, `Cassandra`, `Svelte`, `SolidJS`, `Alpine.js`, `Vue`, `Angular`, `Tailwind`, `Webpack`, `Rollup`, `Vite`, `Babel`, `Cypress`, `RxJS`, `Redux Saga`, `ESLint`, `Prettier`, `GraphQL`, `WebSockets`, `OAuth 2.0 PKCE`, `SOAP`, `Apache Thrift`, `Server-Sent Events`, `Redis`, `Docker`, `Kubernetes`.
- **Logic:** If an external technical entity is present in the query but absent from the retrieved evidence text, `entity_status = MISMATCH` and reason code `OOD_ENTITY` is emitted.

### Component B: Ambiguity & Question-Type Gate
- **Subjective Queries:** Detects opinion / recommendation keywords (`best`, `ideal`, `proper`, `better`, `recommended`, `nice`, `preferable`, `optimal`, `easiest`). Emits `SUBJECTIVE` and `SUBJECTIVE_QUERY`.
- **Open-Ended Queries:** Detects unconstrained quantitative inquiries (`how many lines`, `what percentage of`, `how many pixels`, `how fast`, `maximum number of rows`). Emits `OPEN_ENDED` and `OPEN_ENDED_QUERY`.
- **Ambiguous Queries:** Detects architectural trade-offs without single answers (`flexbox vs grid`, `PUT vs PATCH`, `denormalization`). Emits `AMBIGUOUS` and `AMBIGUOUS_QUERY`.

### Component C: Evidence Adequacy
- **Metrics:**
  - $sim_{top}$: Maximum similarity among retrieved chunks.
  - $ratio_{stem}$: Proportion of query non-stopword stems present in evidence.
  - $overlap_{count}$: Absolute count of matching stems.
- **Classification:**
  - `INADEQUATE` if $sim_{top} < 0.35$ OR $ratio_{stem} < 0.20$ OR $overlap_{count} < 2$.
  - `PARTIAL` if $sim_{top} < 0.45$ OR $ratio_{stem} < 0.40$.
  - `ADEQUATE` otherwise.

---

## 5. Ablation Modes Matrix (C0 through C7)

| Mode | Pre-Filter Status | Component A (Entity) | Component B (Ambiguity) | Component C (Evidence) | Gate Behavior |
|---|---|---|---|---|---|
| **C0** | B5 Baseline Control | OFF | OFF | OFF | `ALLOW` (Unmodified B5) |
| **C1** | Entity Grounding Only | **ON** | OFF | OFF | `ABSTAIN` on MISMATCH, else `ALLOW` |
| **C2** | Ambiguity Gate Only | OFF | **ON** | OFF | `ABSTAIN` on non-factual, else `ALLOW` |
| **C3** | Evidence Adequacy Only | OFF | OFF | **ON** | `BLOCK` on INADEQUATE, else `ALLOW` |
| **C4** | Entity + Ambiguity | **ON** | **ON** | OFF | A then B priority |
| **C5** | Entity + Evidence | **ON** | OFF | **ON** | A then C priority |
| **C6** | Ambiguity + Evidence | OFF | **ON** | **ON** | B then C priority |
| **C7** | Full Combined Pre-Filter | **ON** | **ON** | **ON** | Comprehensive multi-tier gating |

---

## 6. Strict Scientific Invariants
- Zero changes to `EduConnect-LMS-Production`.
- Frozen EXP-0027 (A0–A5) and EXP-0028 (B1–B5) configurations remain unchanged.
- `evidence_used: true` strictly maintained on every exit.
- No handcrafted dictionary additions.