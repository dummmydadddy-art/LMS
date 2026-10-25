# EXP-0067: Failure Mode & Attribution Analysis

**Experiment Identifier:** EXP-0067  
**Topic:** Failure Attribution & Root-Cause Mechanics of NLI Decision Reformulations  
**Evaluated Candidates:** C0 (Control), C1 (Anti-Presupposition), C2 (Contrastive), C3 (Bidirectional Ladder), C4 (Counterfactual Stress)  
**Evaluated Model:** `llama3.2:latest` (3.2B)  
**Date:** 2026-09-26  

---

## 1. Executive Summary of Failure Dynamics

In EXP-0067, all four candidate decision formulations (C1–C4) successfully reduced false acceptances on false premises (`REFUTED -> SUPPORTED`), but simultaneously triggered an **asymmetric catastrophic collapse in valid claim entailment**. 

| Condition | False Acceptances (`REF -> SUP`) | Supported Abstentions (`SUP -> NE`) | False Rejections (`SUP -> REF`) | Supported Recall (%) |
| :--- | :---: | :---: | :---: | :---: |
| **C0 (Control P4)** | 9 | 0 | 19 | **87.33%** |
| **C1 (Anti-Presupposition)** | **0** (-9) | **76** (+76) | 15 (-4) | **39.33%** (-48.00 pp) |
| **C2 (Contrastive)** | **0** (-9) | **26** (+26) | **46** (+27) | **52.00%** (-35.33 pp) |
| **C3 (Bidirectional Ladder)** | **1** (-8) | **52** (+52) | 17 (-2) | **54.00%** (-33.33 pp) |
| **C4 (Counterfactual Stress)**| **3** (-6) | 7 (+7) | **61** (+42) | **54.67%** (-32.66 pp) |

### The Core Failure Phenomenon:
Negative prompt directives intended to counteract sycophancy do not teach the model **subtle epistemic discrimination**. Instead, they drastically shift the model's decision threshold toward **hyper-skepticism**:
- When warned *"topic overlap is not entailment"* and *"never assume the claim is true"*, the 3.2B model ceases recognizing legitimate semantic paraphrases, classifying valid curriculum statements as `NOT_ESTABLISHED` (C1, C3) or asserting spurious conflicts to output `REFUTED` (C2, C4).

---

## 2. Transition Mechanics & Error Breakdown

From `EXP-0067-ERROR-TRANSITIONS.json`, we observe three distinct, mutually destructive failure patterns across the candidate formulations:

### Pattern A: Epistemic Paralysis / Hyper-Abstention (C1, C3)
- **C1 Transition:** `SUPPORTED: C0(SUPPORTED) -> C1(NOT_ESTABLISHED)` occurred **69 times**.
- **C3 Transition:** `SUPPORTED: C0(SUPPORTED) -> C3(NOT_ESTABLISHED)` occurred **45 times**.
- **Root Cause:**
  Directive 5 in C1: *"If the evidence discusses the topic but does not explicitly establish the claim, classify as NEUTRAL."*
  Small models (3B) lack the semantic nuance to separate *"merely discusses topic without proving"* from *"proves claim using synonymous or generalized terminology"*. Whenever a student query phrased a concept with different syntax than the textbook sentence, the model interpreted the phrasing difference as *"failing to explicitly establish"* and defaulted to `NOT_ESTABLISHED`.

### Pattern B: Aggressive Over-Refutation / Spurious Contradiction (C2, C4)
- **C2 Transition:** `SUPPORTED: C0(SUPPORTED) -> C2(REFUTED)` occurred **29 times**.
- **C4 Transition:** `SUPPORTED: C0(SUPPORTED) -> C4(REFUTED)` occurred **44 times**.
- **Root Cause:**
  In C4, the prompt instructed: *"CONFLICT CHECK: Does the evidence establish an opposite property, alternative default, conflicting behavior, or rule incompatible with the claim? -> Return CONTRADICTION."*
  Because checking for contradiction was placed first with high priority, the model actively hunted for discrepancies. Any minor detail present in the curriculum snippet but absent from the student's question was treated as a "conflicting constraint", producing **61 false rejections** across the dataset.

### Pattern C: False Premise Over-Abstention (C1, C3)
- In C1, while false acceptances dropped to 0, `NOVEL_FALSE_PREMISE` accuracy actually fell from **94.00% in C0 to 79.00% in C1**.
- Why? 21 false premise claims were classified as `NOT_ESTABLISHED` instead of `REFUTED`.
- In a safety-critical LMS, failing to refute a false premise (and merely saying "not established") allows students to harbor misconceptions.

---

## 3. Representative Qualitative Failure Cases

### Case 1: Valid Paraphrase Destroyed by Hyper-Abstention (C1, C3)
- **Case ID:** `DEV-SUP-004`
- **Curriculum Evidence:** `[Topic: HTML & CSS Fundamentals] [Subject: CSS Box Model] The CSS box model consists of margins, borders, padding, and the actual content area.`
- **Student Claim:** `What are the four components that make up the CSS box model?`
- **Expected Label:** `SUPPORTED`
- **C0 Prediction:** `SUPPORTED` (Correct, confidence 0.95)
- **C1 Prediction:** `NOT_ESTABLISHED` (Abstention, confidence 0.35)
- **C3 Prediction:** `NOT_ESTABLISHED` (Abstention, confidence 0.35)
- **Model Rationale:** *"The context mentions margins, borders, padding, and content, but does not explicitly state that these are four distinct components in numbered form."*
- **Diagnostic:** Literal lexical rigidity. The model required the explicit numeral "four" to appear verbatim in the evidence text.

### Case 2: Valid Concept Destroyed by Spurious Contradiction (C4)
- **Case ID:** `DEV-SUP-001`
- **Curriculum Evidence:** `[Topic: HTML & CSS Fundamentals] [Subject: display] - display: flex (initiates the flex formatting context).`
- **Student Claim:** `How does display: flex initiate flex formatting context?`
- **Expected Label:** `SUPPORTED`
- **C0 Prediction:** `SUPPORTED` (Correct, confidence 0.95)
- **C4 Prediction:** `REFUTED` (False Rejection, confidence 0.96)
- **Model Rationale:** *"The evidence asserts that display: flex initiates flex formatting context, but does not specify the internal browser engine mechanism of how it initiates it."*
- **Diagnostic:** Under counterfactual stress, the model elevated the interrogative pronoun "how" into a missing causal prerequisite, refuting a fundamentally correct curriculum fact.

### Case 3: Subtle False Premise Correctly Neutralized
- **Case ID:** `DEV-FLS-046`
- **Curriculum Evidence:** `[Topic: Web Architecture] HTTP POST requests are non-idempotent by specification; submitting multiple identical requests may create multiple server-side resources.`
- **Student Claim:** `Why does HTTP POST guarantee idempotency across multiple repeated requests?`
- **Expected Label:** `REFUTED`
- **C0 Prediction:** `SUPPORTED` (False Acceptance! Confidence 0.95 — C0 succumbed to the presupposition)
- **C1 Prediction:** `NOT_ESTABLISHED` (Abstention, confidence 0.35 — prevented false acceptance)
- **C4 Prediction:** `REFUTED` (Correct! Confidence 0.96 — successfully refuted the false claim)
- **Diagnostic:** C4's explicit conflict-first priority correctly identified that POST is non-idempotent, successfully overturning C0's sycophantic acceptance. However, as shown in Case 2, this same mechanism wreaked havoc on valid queries.

---

## 4. Fundamental Theoretical Insight: The Pareto Frontier of In-Context NLI

EXP-0065 demonstrated that **scaling model parameters (3B -> 8B)** does not resolve downstream verifier errors.  
EXP-0067 now demonstrates that **re-engineering zero-shot prompt formulations** cannot expand the Pareto frontier.

Instead, prompt engineering merely moves the operating point along a rigid trade-off curve:

```text
False Acceptance (Sycophancy)  <===========================>  False Rejection (Hyper-Skepticism)
           [C0: 9 FA, 19 FR]                                           [C4: 3 FA, 61 FR]
                                                                       [C1: 0 FA, 76 NE]
```

When prompt instructions push the model away from sycophantic agreement, the model does not become "smarter"—it simply becomes more prone to say "No" or "I don't know". In a 3B parameter model, the representational capacity to simultaneously handle complex lexical paraphrasing while detecting subtle clause-level predicate negations does not exist within in-context instruction following.

---

## 5. Architectural Implications

1. **Prompt Reformulation Is Exhausted:** Further tinkering with prompt templates, system instructions, or polarity priority ladders will not bridge the 19.2 pp dev-to-blind gap.
2. **Deterministic Pre-Processing Remains Essential:** The only component that successfully refutes false premises with 0% false rejections is the **Tier-1 deterministic structural parser** (antonym extraction and regex constraints).
3. **The Next Frontier Must Be Representation or Architecture:** Since neither model scale (EXP-0065) nor decision formulation (EXP-0067) can overcome the 3B NLI ceiling, future investigation must focus on **fine-tuned NLI specialized encoders (e.g. DeBERTa-v3-NLI)** or **structured graph-based verification** where claim decomposition and evidence entailment are verified at the symbolic triple level rather than through generative LLM text prompts.
