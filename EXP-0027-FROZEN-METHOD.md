# EXP-0027: Frozen Method Specification

**Experiment:** EXP-0027 Hybrid Evidence-Grounded NLI Verifier
**Commit:** dea0027 (branch: exp-0027)
**Frozen Date:** 2026-09-15
**Verifier File:** `backend/rag_premise_verifier.php` (950 lines)
**Status:** FROZEN — No modifications permitted after this document is created.

---

## 1. Architecture Overview

Two-tier hybrid verification architecture:
- **Tier-1 (Deterministic Fast Path):** Syntax parsing, out-of-curriculum boundary detection, legitimate negation handling, frozen 138-pair semantic opposite dictionary, predicate negation keywords, entity-subject cross-contamination filtering.
- **Tier-2 (Generic Semantic NLI):** Zero-shot natural language inference over retrieved curriculum evidence using local Ollama `llama3.2:latest`. Routes to Tier-2 ONLY when Tier-1 cannot confidently resolve.

### Decision Flow
```
Query → Stage 0: Syntax check (nonexistent operators) → REFUTED
      → Stage 1: Out-of-curriculum detection → NOT_ESTABLISHED
      → Stage 2: Compound clause decomposition
      → Stage 3: Curriculum relevance threshold (similarity ≥ 0.28) → NOT_ESTABLISHED if below
      → Stage 4: Evidence unit extraction (min 15 char lines)
      → Stage 5: Per-clause evaluation:
          → Tier-1 dictionary hit? → Fast path REFUTED/SUPPORTED
          → Tier-1 predicate negation hit? → Fast path REFUTED/SUPPORTED
          → No Tier-1 resolution → Tier-2 NLI inference
      → Aggregate: any REFUTED → REFUTED; any NOT_ESTABLISHED → NOT_ESTABLISHED; else SUPPORTED
```

## 2. Ablation Modes

| Mode | Description | Dictionary | Tier-2 | Threshold |
|------|------------|------------|--------|----------|
| A0 | Frozen EXP-0025 baseline | ON | OFF | N/A |
| A1 | Tier-2 NLI only | OFF | ON | 0.50 |
| A2 | Tier-1 + Tier-2 (uncalibrated) | ON | ON | 0.50 |
| A3 | Tier-1 + Tier-2 (calibrated) | ON | ON | 0.70 |
| A4 | Structural + Tier-2 (no dict) | OFF | ON | 0.70 |
| A5 | Final candidate (full hybrid) | ON | ON | 0.70 |

Default production mode: **A5**

## 3. Tier-1 Semantic Opposite Dictionary

**Count:** 138 pairs (FROZEN from EXP-0025, lines 40-359)
**Status:** DO NOT MODIFY OR EXPAND

The dictionary covers domain-specific technical antonyms across:
- CSS Layout: flexbox axes, box-sizing models, grid vs flex
- JavaScript: scope types, mutability, sync/async, single/multi-threaded
- React: hook lifecycle, state immutability, batching, prop drilling
- REST API: HTTP methods, status codes, idempotency, JWT security
- Database: ACID properties, normalization forms, indexing, transactions
- HTML: semantic elements, structural roles

Examples: `['mutable', 'immutable']`, `['synchronous', 'asynchronous']`, `['shallow copy', 'deep copy']`, `['block scope', 'function scope']`

## 4. Tier-1 Predicate Negation Keywords

**Keywords (line 769):** reassign, reassigned, reassignment, mutate, mutating, mutation, hoist, hoisted, constructors, arguments, clone, cache, xml, duplicate, render, re-render, batch, cleanup, encrypt, speed, drilling, unmount, transitive, anomalies

**Logic:** If query contains keyword K without negation but evidence contains negation before K (or vice versa), signal predicate polarity contradiction.

## 5. Entity Subject Filtering

**Technical entities (lines 670-682):** justify-content, align-items, flex-direction, flex-grow, flex-shrink, flex-wrap, gap, box-sizing variants, const/var/let, TDZ, arrow functions, React hooks (useLayoutEffect, useCallback, useContext, useEffect, useState, useRef, useMemo), event loop components, Express middleware, JWT, ACID properties, B-tree, normalization forms, HTTP methods, semantic HTML elements, display types.

**Cross-subject exclusion rules (lines 698-717):** Prevents cross-contamination between sibling bullet items (var/let/const, commit/rollback, align-items/justify-content, flex-grow/flex-shrink, grid/flexbox, semantic HTML tags, border-box/content-box).

## 6. Tier-2 NLI Configuration

### Model
- **Identifier:** `llama3.2:latest`
- **Ollama endpoint:** `http://127.0.0.1:11434/api/generate`
- **Temperature:** 0.0
- **Max tokens:** 25 (`num_predict`)
- **Threads:** 8 (`num_thread`)
- **Keep alive:** -1 (persistent)
- **Format:** JSON
- **Timeout:** 45 seconds

### NLI Prompt (verbatim, line 488-493)
```
Premise: "{premise}"
Hypothesis: "{hypothesis}"
Task: Determine relation strictly from Premise alone (CONTRADICTION, ENTAILMENT, or NEUTRAL). Do not assume unstated facts.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
```

### Decision Thresholds
- **A5 (candidate):** confidence ≥ 0.70 for CONTRADICTION or ENTAILMENT to take effect
- Below threshold → treated as NEUTRAL → NOT_ESTABLISHED

### Fallback Behavior
- Communication error → return NEUTRAL with confidence 0.0
- Unparseable JSON → regex fallback to extract label from raw text
- Missing confidence → default 0.35 for NEUTRAL, 0.95 for CONTRADICTION/ENTAILMENT

### Caching
- In-memory PHP array cache keyed by `md5(premise || hypothesis || model)`
- Cache hits return latency 0.5ms
- Cache is per-process (cleared on worker restart)

## 7. Evidence Requirements

- Minimum retrieval similarity: 0.28 (below → NOT_ESTABLISHED)
- Minimum evidence line length: 15 characters
- Evidence lines extracted from retrieved chunks split by newline
- Combined normalized text = title + line content
- Focal subject extracted from bullet-point format (`- subject: description`)

## 8. Legitimate Negation Handling

Regex pattern (line 417) detects queries asking "why can't/cannot/doesn't/isn't" patterns and "without mutating/adding/requiring" patterns.

When `is_negation_inquiry = true`:
- A CONTRADICTION from evidence is interpreted as SUPPORTED (the negation inquiry is asking about a known constraint)
- Exception: "without throwing/error/exception" is NOT treated as negation inquiry

## 9. Tier-2 Routing Conditions

Tier-2 is invoked when ALL of the following hold:
1. Ablation mode is NOT A0 (which is Tier-1 only)
2. Tier-1 dictionary did NOT find an antonym match
3. Tier-1 predicate negation did NOT fire
4. There are candidate evidence matches (overlap ≥ 1 or subject boost)

In modes A2, A3, A5: Tier-1 contradictions take priority (fast path). Only unresolved cases escalate to Tier-2.
In mode A1: Dictionary is disabled, so nearly all cases route to Tier-2.
In mode A4: Dictionary is disabled but structural checks remain.

## 10. Output Contract

Every exit path returns:
- `evidence_used: true` (strict invariant)
- `decision_tier`: TIER_1_DETERMINISTIC | TIER_2_SEMANTIC_NLI | TIER_2_ABSTENTION
- `status`: SUPPORTED | REFUTED | NOT_ESTABLISHED
- `confidence`: 0.0-1.0
- `tier2_diagnostics`: array of per-clause NLI invocation details (or null for Tier-1)

## 11. Benchmark-Specific Content Audit

### Items embedded in verifier code:
- 138 semantic opposite pairs: domain-specific but not benchmark-case-specific. Pairs describe general technical antonyms (mutable/immutable, sync/async) not tied to specific test query phrasings.
- Entity list: general technical terms, not benchmark IDs.
- Predicate keywords: general technical verbs, not benchmark-specific.
- Out-of-curriculum regex: names external frameworks (Django, Ruby, etc.) — domain boundary, not benchmark-specific.

### Assessment:
The Tier-1 dictionary IS curriculum-specific (CSS/JS/React/SQL/REST domain) but NOT benchmark-case-specific. It encodes general domain knowledge about technical opposites. The key question is whether Tier-2 can handle cases OUTSIDE this dictionary's coverage — which is what the evaluation must test.
