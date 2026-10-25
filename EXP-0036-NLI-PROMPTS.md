# EXP-0036: Tier-2 NLI Prompts & Cryptographic Hashes

**Lineage:** EXP-0035 (Commit `2bcccca`) -> EXP-0036  
**Status:** FROZEN  
**Date:** 2026-09-16  

All prompt templates evaluated in EXP-0036 are documented below with their exact character-level verbatim text, parameter signatures, and SHA-256 cryptographic hashes.

---

## 1. Prompt Inventory & Hashes

| Prompt ID | Name | Mode Usage | SHA-256 Hash |
|---|---|---|---|
| **P0** | Baseline Unstructured B5 Prompt | N0 | `8b72b4620a938a85704ba6c7410a4d20228ffd35c60107a93c2319c126e16fc0` |
| **P1** | Structured Evidence Prompt | N1, N3, N6 | `048292dc1c1e75b2c8cfacd0368de100e9b0ca42b8e4e111da8039534c69ed2c` |
| **P2** | Structured + Explicit Polarity | N2, N5 | `06286d824b822ef1bc6f51ac1797d94043279fc1054283dc24fa4f21500bc610` |
| **P3** | Structured + Few-Shot Demonstrations | N4 | `3a137de9dcc10e8fb6c77faaf2f8eecb5b7eb0c97062436d37b83453d90cf4d3` |
| **P4** | Full Candidate Prompt (Structured + Polarity + Few-Shot) | N7 | `4f715d6195b135c2aca9290d2bc9203adefb33daaeccafdc97d952784a2f9112` |

---

## 2. Verbatim Prompt Specifications

### Prompt P0: Baseline Unstructured (Mode N0)
* **SHA-256:** `8b72b4620a938a85704ba6c7410a4d20228ffd35c60107a93c2319c126e16fc0`
```text
Curriculum Fact: "{premise}"
Student Claim: "{hypothesis}"
Task: Evaluate if the Student Claim is ENTAILMENT, CONTRADICTION, or NEUTRAL strictly against the Curriculum Fact.
Definitions:
- CONTRADICTION: The Claim asserts a rule, default, behavior, or constraint that conflicts with or is incompatible with the Fact (e.g. includes vs excludes, requires vs optional/automatic, synchronous vs asynchronous).
- ENTAILMENT: The Claim is directly supported or logically follows from the Fact.
- NEUTRAL: The Fact does not confirm or refute the Claim.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
```

### Prompt P1: Structured Evidence Prompt (Modes N1, N3, N6)
* **SHA-256:** `048292dc1c1e75b2c8cfacd0368de100e9b0ca42b8e4e111da8039534c69ed2c`
```text
EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Determine whether the EVIDENCE CONTEXT directly supports (ENTAILMENT), contradicts (CONTRADICTION), or does not contain enough facts to verify (NEUTRAL) the STUDENT CLAIM.
Definitions:
- ENTAILMENT: The claim is confirmed by the evidence, even if phrased differently, descriptively, or indirectly.
- CONTRADICTION: The claim asserts a property, default, behavior, or constraint that conflicts with or is incompatible with the evidence.
- NEUTRAL: The evidence does not address the specific assertion.

JSON ONLY: {"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}
```

### Prompt P2: Structured + Explicit Polarity Reasoning (Modes N2, N5)
* **SHA-256:** `06286d824b822ef1bc6f51ac1797d94043279fc1054283dc24fa4f21500bc610`
```text
EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

POLARITY AND COMPARATIVE ANALYSIS:
- Negations in claim: {negList}
- Comparative terms: {compList}
- Antonym / Opposite conflicts: {antList}
- Polarity inversion risk: {mismatchStr}

TASK:
Evaluate if the STUDENT CLAIM is ENTAILMENT, CONTRADICTION, or NEUTRAL strictly against the EVIDENCE CONTEXT.
If the claim inverts direction, timing, or constraints (e.g. before vs after, 1D vs 2D, permits vs forbids), classify as CONTRADICTION.
If the claim describes the actual mechanism or rules accurately, classify as ENTAILMENT.
If not addressed, classify as NEUTRAL.

JSON ONLY: {"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}
```

### Prompt P3: Structured + Few-Shot Demonstrations (Mode N4)
* **SHA-256:** `3a137de9dcc10e8fb6c77faaf2f8eecb5b7eb0c97062436d37b83453d90cf4d3`
```text
You are a strict technical verification judge for a web development curriculum.

REFERENCE DEMONSTRATIONS:
[EXAMPLE 1 - Direct Entailment]
Evidence: "const declarations create block-scoped variables that cannot be reassigned after initialization."
Claim: "const variables have block scope."
Analysis: The evidence explicitly asserts block scope for const.
Output: {"label":"ENTAILMENT","confidence":0.95,"rationale":"Directly supported by evidence statement"}

[EXAMPLE 2 - Descriptive Paraphrase Entailment]
Evidence: "Array.prototype.map creates a new array populated with the results of calling a provided function on every element in the calling array."
Claim: "map transforms every element in an array without mutating the original array."
Analysis: Creating a new array with transformed results entails the original array is not mutated and every element is transformed.
Output: {"label":"ENTAILMENT","confidence":0.95,"rationale":"Descriptive evidence supports non-mutating transformation"}

[EXAMPLE 3 - Technical Mechanism Entailment]
Evidence: "PostgreSQL B-Tree indexes sort entries in balanced tree structures to accelerate equality and range queries."
Claim: "B-Tree indexes speed up WHERE column = value lookups in SQL."
Analysis: Equality queries directly correspond to column = value lookups.
Output: {"label":"ENTAILMENT","confidence":0.95,"rationale":"Equality query acceleration entails WHERE column = value speedup"}

[EXAMPLE 4 - Explicit Contradiction]
Evidence: "JavaScript execution is single-threaded; asynchronous operations are managed via the event loop, not multi-threaded CPU execution."
Claim: "JavaScript executes asynchronous callbacks concurrently across multiple native CPU threads."
Analysis: Single-threaded event loop contradicts concurrent execution across multiple native threads.
Output: {"label":"CONTRADICTION","confidence":0.95,"rationale":"Directly contradicts single-threaded execution model"}

[EXAMPLE 5 - Polarity Inversion Contradiction]
Evidence: "display: flex defines a one-dimensional layout model along either the row or column axis."
Claim: "display: flex establishes a 2-dimensional grid layout."
Analysis: One-dimensional along either row or column directly contradicts 2-dimensional grid layout.
Output: {"label":"CONTRADICTION","confidence":0.95,"rationale":"One-dimensional flex directly conflicts with 2-dimensional claim"}

[EXAMPLE 6 - Comparative Timing Contradiction]
Evidence: "Resolved Promise microtasks are always processed before the next macrotask (such as setTimeout) runs in the event loop."
Claim: "setTimeout executes before resolved Promise microtasks."
Analysis: Microtasks run before macrotasks; claiming setTimeout runs before microtasks inverts the execution order.
Output: {"label":"CONTRADICTION","confidence":0.95,"rationale":"Inverts relative execution order between microtasks and macrotasks"}

[EXAMPLE 7 - Insufficient Evidence / Out of Curriculum]
Evidence: "React useState hook preserves local component state between re-renders."
Claim: "Django ORM automatically creates database migrations for PostgreSQL schema changes."
Analysis: The evidence discusses React state; it contains no information about Django ORM or PostgreSQL migrations.
Output: {"label":"NEUTRAL","confidence":0.35,"rationale":"Evidence does not address the claim topic"}

NEW CASE TO EVALUATE:
EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Following the reference demonstrations above, determine if the STUDENT CLAIM is ENTAILMENT, CONTRADICTION, or NEUTRAL relative to the EVIDENCE CONTEXT.
JSON ONLY: {"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}
```

### Prompt P4: Full Candidate Champion (Mode N7)
* **SHA-256:** `4f715d6195b135c2aca9290d2bc9203adefb33daaeccafdc97d952784a2f9112`
```text
You are a strict technical verification judge for a web development curriculum.

REFERENCE DEMONSTRATIONS:
[EXAMPLE 1 - Direct Entailment]
Evidence: "const declarations create block-scoped variables that cannot be reassigned after initialization."
Claim: "const variables have block scope."
Analysis: The evidence explicitly asserts block scope for const.
Output: {"label":"ENTAILMENT","confidence":0.95,"rationale":"Directly supported by evidence statement"}

[EXAMPLE 2 - Descriptive Paraphrase Entailment]
Evidence: "Array.prototype.map creates a new array populated with the results of calling a provided function on every element in the calling array."
Claim: "map transforms every element in an array without mutating the original array."
Analysis: Creating a new array with transformed results entails the original array is not mutated and every element is transformed.
Output: {"label":"ENTAILMENT","confidence":0.95,"rationale":"Descriptive evidence supports non-mutating transformation"}

[EXAMPLE 3 - Technical Mechanism Entailment]
Evidence: "PostgreSQL B-Tree indexes sort entries in balanced tree structures to accelerate equality and range queries."
Claim: "B-Tree indexes speed up WHERE column = value lookups in SQL."
Analysis: Equality queries directly correspond to column = value lookups.
Output: {"label":"ENTAILMENT","confidence":0.95,"rationale":"Equality query acceleration entails WHERE column = value speedup"}

[EXAMPLE 4 - Explicit Contradiction]
Evidence: "JavaScript execution is single-threaded; asynchronous operations are managed via the event loop, not multi-threaded CPU execution."
Claim: "JavaScript executes asynchronous callbacks concurrently across multiple native CPU threads."
Analysis: Single-threaded event loop contradicts concurrent execution across multiple native threads.
Output: {"label":"CONTRADICTION","confidence":0.95,"rationale":"Directly contradicts single-threaded execution model"}

[EXAMPLE 5 - Polarity Inversion Contradiction]
Evidence: "display: flex defines a one-dimensional layout model along either the row or column axis."
Claim: "display: flex establishes a 2-dimensional grid layout."
Analysis: One-dimensional along either row or column directly contradicts 2-dimensional grid layout.
Output: {"label":"CONTRADICTION","confidence":0.95,"rationale":"One-dimensional flex directly conflicts with 2-dimensional claim"}

[EXAMPLE 6 - Comparative Timing Contradiction]
Evidence: "Resolved Promise microtasks are always processed before the next macrotask (such as setTimeout) runs in the event loop."
Claim: "setTimeout executes before resolved Promise microtasks."
Analysis: Microtasks run before macrotasks; claiming setTimeout runs before microtasks inverts the execution order.
Output: {"label":"CONTRADICTION","confidence":0.95,"rationale":"Inverts relative execution order between microtasks and macrotasks"}

[EXAMPLE 7 - Insufficient Evidence / Out of Curriculum]
Evidence: "React useState hook preserves local component state between re-renders."
Claim: "Django ORM automatically creates database migrations for PostgreSQL schema changes."
Analysis: The evidence discusses React state; it contains no information about Django ORM or PostgreSQL migrations.
Output: {"label":"NEUTRAL","confidence":0.35,"rationale":"Evidence does not address the claim topic"}

POLARITY ANALYSIS:
- Negation cues: {negList}
- Comparative cues: {compList}
- Antonym cues: {antList}
- Polarity inversion risk: {mismatchStr}

NEW CASE TO EVALUATE:
EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Following the demonstrations and polarity analysis, determine whether the STUDENT CLAIM is ENTAILMENT, CONTRADICTION, or NEUTRAL relative to the EVIDENCE CONTEXT.
JSON ONLY: {"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}
```
