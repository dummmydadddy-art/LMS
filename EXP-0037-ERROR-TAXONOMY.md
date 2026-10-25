# EXP-0037: Error Taxonomy & Failure Forensics

**Experiment:** EXP-0037  
**Lineage:** EXP-0036 (`d8c1ed3`) -> EXP-0037  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)  
**Date:** 2026-09-17  

---

## 1. Classification of Baseline A0 Failure Modes

Forensic analysis of the 38 baseline errors in Candidate A0 reveals four distinct root causes:

### Category 1: Temporal & Sequential Inversion (Fixed in A4)
* **Mechanism:** Queries asserting reversed execution orders (e.g. macrotasks before microtasks, setTimeout before Promises). When evidence mentions both concepts in proximity, uncalibrated NLI models latch onto semantic relatedness and confirm entailment.
* **Representative Cases:** `DEV-FLS-030`, `DEV-MIX-005`.
* **Mitigation:** Polarity pre-processing combined with atomic predicate relation extraction (`before` vs `after`) forces strict sequential alignment.

### Category 2: Lifecycle & Timing Misassertions (Fixed in A4)
* **Mechanism:** Queries asserting that asynchronous effects execute synchronously (e.g. useEffect before browser paint, or empty dependency array running on every render).
* **Representative Cases:** `DEV-FLS-081`, `DEV-FLS-086`.
* **Mitigation:** Exact predicate constraint matching identifies the contradiction between the claim constraint and the curriculum definition.

### Category 3: Architectural Operational Contradictions (Fixed in A4)
* **Mechanism:** Queries asserting delayed persistence (e.g. WAL writing only after reboot).
* **Representative Cases:** `DEV-FLS-073`.
* **Mitigation:** The universal quantifier detector flags "only after", triggering evidence scrutiny which reveals that WAL logs are written *synchronously before* disk page updates.

### Category 4: Pseudo-Negation Over-Triggering (Fixed in A4)
* **Mechanism:** Legitimate technical descriptions utilizing negative verbs (e.g. "prevent re-declaration", "avoid memory leaks") being misclassified as negative questions or contradictions.
* **Representative Cases:** `DEV-SUP-037`.
* **Mitigation:** Differentiating predicate negation keywords from legitimate technical capability verbs allows accurate entailment recognition.

---

## 2. Ambiguity & Subjectivity Protection Architecture

To prevent downstream forced-choice hallucinations on ambiguous queries without damaging genuine technical claims, the verifier enforces a tripartite decision rule:

```
                  [Ambiguity Detected]
                           |
        +------------------+------------------+
        |                                     |
[Explicit Contradiction?]            [Evidence Analysis]
        |                                     |
       YES -> CASE C (REFUTED)      +---------+---------+
                                    |                   |
                           [Mandatory Rule]    [Trade-offs / Alternatives]
                                    |                   |
                         CASE A (SUPPORTED)    CASE B (NOT_ESTABLISHED)
```

1. **CASE A (Explicit Mandate):** Evidence contains prescriptive rule markers (`must`, `required`, `mandatory`, `standard convention`) topically linked to the assertion. Supported verdict is permitted.
2. **CASE B (Trade-off / Contextual):** Evidence discusses trade-offs, situational use cases, or lacks an objective curriculum mandate. Forced-choice entailment is suppressed to `NOT_ESTABLISHED`.
3. **CASE C (Explicit Contradiction):** Evidence explicitly contradicts the claim. Refuted verdict is preserved.
