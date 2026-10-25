# EXP-0028: Comprehensive Error Analysis & Failure Taxonomy

**Experiment:** EXP-0028 (Next-Generation Semantic NLI Premise Verifier)  
**Baseline Model:** EXP-0027 Mode A5 (Two-Tier Hybrid Baseline)  
**Champion Candidate:** EXP-0028 Mode B5 (Synthesized Semantic Two-Pass NLI)  
**Date Certified:** 2026-09-15  
**Evaluation Scope:** 1,600 test cases (600 Failure Dataset + 1,000 Generalization Pool across LEAVEOUT, CROSS-DOMAIN, OOD, and PARAPHRASE)

---

## 1. Executive Summary & Quantitative Flip Distribution

EXP-0028 evaluated whether a multi-layered semantic NLI architecture combining **structured incompatibility prompts (B1)**, **polarity/modality guidance (B2)**, **contextual curriculum framing (B3)**, and a **targeted second-pass contradiction probe (B4)** could eliminate the severe generalization failures of the EXP-0027 baseline without reintroducing handcrafted dictionaries.

Across all evaluated benchmarks (1,600 cases):
- **Total Positive Flips (A5 Wrong $\to$ B5 Right):** **284 cases** (17.75% of all evaluated queries corrected)
- **Total Negative Flips (A5 Right $\to$ B5 Wrong):** **123 cases** (7.69%)
- **Net Improvement:** **+161 net correct cases** ( < 10^{-14}$)
- **Remaining Double Errors (Both A5 & B5 Wrong):** **448 cases** (28.00%)

---

## 2. Failure Taxonomy & Residual Error Distribution

Analyzing the 571 remaining errors in Mode B5 (123 negative flips + 448 double errors) reveals four distinct failure categories:

| Error Category | Mechanism | Count | % of Errors | Root Cause Description |
|---|---|---|---|---|
| **Class 1: Pass 1 False Entailment Bypass** | Single-pass false positive | 168 | 29.4% | Pass 1 LLM assigns `ENTAILMENT` with confidence $\ge 0.70$ due to heavy surface token overlap, bypassing Pass 2 probe. |
| **Class 2: Evidence Multi-Hop Omission** | Incomplete retrieved context | 184 | 32.2% | Retrieved top chunk describes general functionality but omits subtle edge-case restriction. |
| **Class 3: Modality Asymmetry** | Prescriptive vs descriptive mismatch | 112 | 19.6% | Query phrases a soft recommendation ("should avoid") while curriculum describes mechanical default. |
| **Class 4: OOD Terminology Drift** | Lexical gap in 3.2B LLM | 107 | 18.7% | Extreme indirect or highly colloquial phrasing fails zero-shot comprehension without domain fine-tuning. |

---

## 3. Forensic Analysis: 10 Representative Positive Flips (A5 Wrong $\to$ B5 Right)

These cases illustrate how Mode B5's second-pass contradiction probe and incompatibility definitions successfully corrected catastrophic false acceptances and false neutrals in A5:

### Positive Case #1: [EXP28-CONTRA-001] (FAILURE_600)
- **Query:** "Does the semantic <nav> element represent the main unique text of the document rather than site links?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `SUPPORTED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #2: [EXP28-CONTRA-003] (FAILURE_600)
- **Query:** "Does the <footer> tag represent an independently syndicateable blog entry or forum post?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `NOT_ESTABLISHED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #3: [EXP28-CONTRA-004] (FAILURE_600)
- **Query:** "Does the <article> element define introductory navigation menus across the website?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `NOT_ESTABLISHED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #4: [EXP28-CONTRA-005] (FAILURE_600)
- **Query:** "Why does the <section> tag represent only site links and skip thematic grouping?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `NOT_ESTABLISHED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #5: [EXP28-CONTRA-006] (FAILURE_600)
- **Query:** "Does HTML5 permit putting five <main> tags in a single page to separate minor paragraphs?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `NOT_ESTABLISHED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #6: [EXP28-CONTRA-017] (FAILURE_600)
- **Query:** "Does the <main> element structure concluding footer notes and licensing declarations?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `NOT_ESTABLISHED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #7: [EXP28-CONTRA-018] (FAILURE_600)
- **Query:** "Does flex-basis define the maximum allowable expansion size after extra room is assigned?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `SUPPORTED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #8: [EXP28-CONTRA-020] (FAILURE_600)
- **Query:** "Does invoking an arrow function with the new keyword construct a valid prototype instance?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `SUPPORTED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #9: [EXP28-CONTRA-021] (FAILURE_600)
- **Query:** "Does a variable declared with const allow assigning an entirely different string later?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `SUPPORTED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

### Positive Case #10: [EXP28-CONTRA-022] (FAILURE_600)
- **Query:** "Why does accessing an identifier in the temporal dead zone evaluate cleanly to undefined?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `SUPPORTED` (FAILED — lacked dictionary antonym or defaulted to false acceptance)
- **Champion B5 Prediction:** `REFUTED` (PASSED)
- **Two-Pass Invocation:** TRUE (Pass 1 uncertain $\to$ Pass 2 targeted contradiction probe confirmed incompatibility)
- **Forensic Mechanism:** Under A5, the 3B model saw technical tokens and predicted false agreement or neutral abstention. Under B5, the Pass 2 probe explicitly asked whether the assertion contradicted the curriculum fact, cleanly identifying the incompatibility.

---

## 4. Forensic Analysis: 10 Representative Negative Flips (A5 Right $\to$ B5 Wrong)

These cases illustrate remaining edge cases where Mode B5 failed while A5 happened to succeed:

### Negative Case #1: [EXP28-CONTRA-007] (FAILURE_600)
- **Query:** "Why does the CSS flex-wrap property restrict items to stay on a single line permanently?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #2: [EXP28-CONTRA-011] (FAILURE_600)
- **Query:** "Does the CSS gap property insert margins along the exterior boundary of the container?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #3: [EXP28-CONTRA-016] (FAILURE_600)
- **Query:** "Why does semantic markup confuse assistive screen reading tools during landmark parsing?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #4: [EXP28-CONTRA-054] (FAILURE_600)
- **Query:** "Does the npm configuration manifest embed the compiled binary executables of every installed module?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `NOT_ESTABLISHED` (Incorrect)
- **Two-Pass Invocation:** TRUE
- **Forensic Mechanism:** Pass 2 probe evaluated the assertion as neutral or ambiguous relative to the retrieved sentence fragment.

### Negative Case #5: [EXP28-CONTRA-055] (FAILURE_600)
- **Query:** "Does the HTTP GET method delete stored entries from the database?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `NOT_ESTABLISHED` (Incorrect)
- **Two-Pass Invocation:** TRUE
- **Forensic Mechanism:** Pass 2 probe evaluated the assertion as neutral or ambiguous relative to the retrieved sentence fragment.

### Negative Case #6: [EXP28-CONTRA-057] (FAILURE_600)
- **Query:** "Does the HTTP PUT method apply small individual attribute patches to an existing entity?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #7: [EXP28-CONTRA-083] (FAILURE_600)
- **Query:** "Can you clarify if flex-grow: 0 instruct an item to expand and consume all available empty room?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #8: [EXP28-CONTRA-085] (FAILURE_600)
- **Query:** "Can you clarify if the CSS gap property insert margins along the exterior boundary of the container?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #9: [EXP28-CONTRA-109] (FAILURE_600)
- **Query:** "Can you clarify if calling useState within if blocks adhere to the standard Rules of Hooks?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

### Negative Case #10: [EXP28-CONTRA-119] (FAILURE_600)
- **Query:** "Can you clarify if react 18 execute state dispatchers one by one without grouping updates together?"
- **Category:** `SEMANTIC_CONTRADICTION` | **Expected:** `REFUTED`
- **Baseline A5 Prediction:** `REFUTED` (Correct)
- **Champion B5 Prediction:** `SUPPORTED` (Incorrect)
- **Two-Pass Invocation:** FALSE
- **Forensic Mechanism:** Pass 1 assigned `SUPPORTED` with confidence $\ge 0.70$ due to surface token similarity, preventing the Pass 2 probe from executing.

---

## 5. Actionable Architectural Recommendations for EXP-0029

Based on this forensic analysis, future improvements should focus on:
1. **Entailment Verification Guard (Addressing Class 1 Errors):**
   - Currently, Pass 2 is triggered only when Pass 1 is `NEUTRAL` or confidence $< 0.70$.
   - For queries with interrogative contradiction cues ("why does X permanently restrict...", "does X forbid..."), trigger Pass 2 even on `ENTAILMENT` if the overlap ratio is high, eliminating false entailment bypasses.
2. **Context-Window Expansion for Evidence Framing (Addressing Class 2 Errors):**
   - In B3/B5, only the single top matching line + title is passed to the LLM. Expanding to include 1 preceding and 1 succeeding context line within the chunk will resolve multi-hop omissions.
3. **Modality Calibration Matrix (Addressing Class 3 Errors):**
   - Explicitly decouple normative assertions ("must", "should", "required") from descriptive facts ("can", "supports", "defaults").