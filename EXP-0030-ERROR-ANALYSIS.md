# EXP-0030: Comprehensive Forensic Error Analysis

**Experiment:** EXP-0030 Dynamic Curriculum Grounding + Asymmetric Pass-2 Calibration  
**Test Set:** `EXP-0030-BLIND-DATASET.json` ($N = 400$)  
**Mode Evaluated:** D3 (Candidate Architecture)  
**Total Accuracy:** 74.00% (296/400 correct)  
**Total Errors:** 104 errors (26.00%)  

---

## 1. Error Distribution by Category

| Category | Total Cases | Errors | Accuracy (%) | Error Share (%) |
|---|:---:|:---:|:---:|:---:|
| **SUPPORTED** | 100 | 31 | 69% | 29.8% |
| **FALSE_PREMISE** | 100 | 34 | 66% | 32.7% |
| **AMBIGUOUS** | 60 | 6 | 90% | 5.8% |
| **OOD** | 50 | 2 | 96% | 1.9% |
| **PARAPHRASE** | 40 | 11 | 72.5% | 10.6% |
| **ADVERSARIAL** | 50 | 20 | 60% | 19.2% |
| **TOTAL** | **400** | **104** | **74.00%** | **100.0%** |

---

## 2. Root Cause Taxonomy & Failure Mode Breakdown

Forensic classification of all 104 prediction errors reveals three dominant remaining error mechanisms:

```
Total Errors: 104
├── 1. False Premise Underspecification / Missed Refutation (34 errors, 32.7%)
│   └── Retrieved evidence states affirmative behavior but lacks explicit antithesis statement
├── 2. Supported Claim Insufficient Grounding / Abstention (31 errors, 29.8%)
│   └── 22 cases in SUPPORTED, 11 cases in PARAPHRASE where dense retrieval top similarity < 0.35
├── 3. Adversarial Traps & Polarity Inversions (20 errors, 19.2%)
│   └── 13 refuted adversarial traps missed; 7 supported adversarial queries falsely refuted
├── 4. Residual False Alarms on Supported (15 errors, 14.4%)
│   └── Pass-2 probe declared contradiction despite non-literal paraphrasing
└── 5. Ambiguity Boundary Leakage (4 errors, 3.8%)
    └── 6 ambiguous queries where Pass-1 NLI declared entailment on partial topic mentions
```

---

## 3. Deep-Dive Forensic Case Studies

### Case Study 1: Novel-OOD Success (EXP30-OOD-0031 & 0032)
- **Query:** `Does Clojure provide persistent immutable data structures and software transactional memory?`
- **Baseline D0 (C7):** Predicted `SUPPORTED` (False Alarm / Parametric Leakage). C7's static 27-item entity list did not contain `clojure`. Llama 3.2 retrieved irrelevant JS chunks and used internal parametric memory to confirm the fact.
- **Candidate D3:** Predicted `NOT_ESTABLISHED` (CORRECT). The dynamic vocabulary engine matched `clojure`, checked the curriculum registry, identified that `clojure` $\notin \text{Curriculum}$ and $\notin \text{Evidence}$, triggered `DYNAMIC_OOD_ENTITY`, and set `pass2_gate = 'ABSTAIN'`.
- **Verdict:** Dynamic curriculum grounding directly resolves parametric leakage on novel out-of-curriculum ecosystems.

### Case Study 2: Missed Refutation on Subtle Syntax Traps (EXP30-REF-0020)
- **Query:** `Can arrow functions be used as constructors with the new keyword in JavaScript?`
- **Expected:** `REFUTED`
- **Actual D3:** `NOT_ESTABLISHED`
- **Evidence Passage:** `[Topic: JavaScript ES6+ Notes] [Subject: Arrow Functions] - Arrow functions: Do not bind their own this, arguments, or super.`
- **Forensic Diagnosis:** The curriculum evidence explicitly notes that arrow functions do not bind `this`, but does not literally use the phrase `cannot be used as a constructor with new`. Consequently, Tier-1 keyword matching does not trigger, and Pass-1 zero-shot NLI returns `NEUTRAL (0.50)` due to unstated premise boundary. Pass-2 probe also returned `NEUTRAL (0.50)` because the premise did not explicitly state the prohibition.
- **Remediation for EXP-0031:** Proposition expansion via dependency tree entailment mapping (synthesizing implied grammatical negatives).

### Case Study 3: Over-Refutation on Negative Inquiries (EXP30-ADV-0001)
- **Query:** `Why does setting box-sizing to border-box not shrink the content area below zero when padding exceeds width?`
- **Expected:** `SUPPORTED`
- **Actual D3:** `REFUTED`
- **Forensic Diagnosis:** The query contains legitimate negation inquiry phrasing (`why does ... not shrink ...`). Although the verifier's legitimate negation regex caught negative inquiry intent, the compound clause (`when padding exceeds width`) triggered Pass-2 adversarial contradiction probe with high confidence.
- **Remediation for EXP-0031:** Hierarchical clause splitting for compound conditional constraints.

---

## 4. Remediation Roadmap for Next Research Line (EXP-0031)

1. **Subordinate Clause Dependency Parsing:** Split compound conditional assertions (`when X`, `unless Y`) prior to NLI premise pairing.
2. **Curriculum Implication Inference:** Precompute deductive closure graphs over curriculum axioms (e.g. `lacks this binding` $\implies$ `cannot be constructor`).
3. **Adaptive Calibration:** Scale $T_{contra}$ dynamically based on query syntactic complexity rather than fixed scalar threshold.