# EXP-0036: Downstream Tier-2 NLI Error Taxonomy

**Lineage:** EXP-0035 -> EXP-0036  
**Scope:** Forensic analysis of residual failure modes in zero-shot vs structured Tier-2 NLI verifiers.  
**Dataset Reference:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$) & historical blind traces.  

---

## 1. Error Taxonomy Classification Matrix

Residual verification errors are categorized into six mutually exclusive technical classes:

| Class Code | Name | Primary Vulnerability | Mechanism | Remedy in N7 |
|---|---|---|---|---|
| **E-SEM-01** | Lexical Sycophancy | False Entailment | High term overlap with premise induces entailment despite opposite assertion | Polarity Pre-processor (P2/P4) |
| **E-SEM-02** | Descriptive Abstention | False Abstention | Evidence explains mechanism without verbatim keywords; model returns NEUTRAL | Structured Prompt (P1/P4) |
| **E-SEM-03** | Temporal / Ordering Inversion | False Entailment | Claims invert event sequence (e.g. before vs after, micro vs macro) | Polarity Cue Extraction |
| **E-SEM-04** | Antonym Blindness | Missed Contradiction | Domain antonyms (1D/2D, border-box/content-box) not recognized as mutually exclusive | Antonym Detection Table |
| **E-SEM-05** | Predicate Conjunction Collapse | False Acceptance | Multi-attribute claim has true entity but false constraint; model verifies entity only | Predicate Decomposition (N3) |
| **E-SEM-06** | Lexical Fast-Path Over-Firing | False Refutation | Tier-1 keyword triggers refutation on legitimate question discussing constraints | Tier-1 Negation Re-routing |

---

## 2. In-Depth Forensic Case Studies

### Case Study 1: E-SEM-01 (Lexical Sycophancy in Comparative Claims)
* **Query ID:** `DEV-FLS-030`
* **Query:** *"Why does setTimeout execute before resolved Promise microtasks?"*
* **Ground Truth:** `REFUTED`
* **Retrieved Evidence:** *"Resolved Promise microtasks are always processed before the next macrotask (such as setTimeout) runs in the event loop."*
* **N0 Failure:** Zero-shot llama3.2 sees `setTimeout`, `Promise`, `microtasks`, `before`, and outputs `{"label":"ENTAILMENT","confidence":0.95}`.
* **N7 Resolution:** Polarity pre-processor notes comparative `before` and extracts directional dependency. The structured prompt prompts the model: *"Pay special attention to whether the claim inverts timing or directionality stated in the evidence."* Result: `{"label":"CONTRADICTION","confidence":0.95}`.

### Case Study 2: E-SEM-02 (Descriptive Evidence False Abstention)
* **Query ID:** `DEV-SUP-023`
* **Query:** *"How does const require initialization upon declaration?"*
* **Ground Truth:** `SUPPORTED`
* **Retrieved Evidence:** *"const declarations create block-scoped variables that cannot be reassigned after initialization."*
* **N0 Failure:** The premise states *"cannot be reassigned after initialization"* rather than *"requires initialization upon declaration"*. N0 outputs `NEUTRAL` (confidence 0.35), causing false abstention.
* **N7 Resolution:** Few-shot Demonstration 1 specifically models const block scoping and immutability. P4 recognizes that initialization upon declaration is logically entailed by the inability to assign post-initialization. Verdict: `SUPPORTED` (confidence 0.95).

### Case Study 3: E-SEM-05 (Predicate Conjunction Collapse)
* **Query ID:** `DEV-FLS-013`
* **Query:** *"Why does border-box add padding onto declared width rather than absorbing it?"*
* **Ground Truth:** `REFUTED`
* **Retrieved Evidence:** *"box-sizing: border-box includes padding and border within the element's specified width and height."*
* **N0 Failure:** Model confirms border-box relates to padding and width, missing the negation *"rather than absorbing it"*. Output: `SUPPORTED`.
* **N7 Resolution:** Atomic predicate decomposition isolates predicate 1 (*border-box adds padding onto declared width*) and predicate 2 (*rather than absorbing it*). Antonym cue flags *includes vs adds onto*. Result: `REFUTED` (confidence 0.95).
