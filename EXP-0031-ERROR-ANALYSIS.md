# EXP-0031: Error Analysis & Residual Failure Forensics

**Experiment:** EXP-0031  
**Dataset:** `EXP-0031-BLIND-DATASET.json` ($N = 500$)  
**Date:** 2026-09-16  
**Comparison:** E0 (Frozen Baseline) vs E4 (Full Candidate)  

---

## 1. High-Level Summary of Error Dynamics

| Metric | E0 (Baseline) | E4 (Candidate) | Delta (E4 - E0) |
|---|---|---|---|
| **Overall Accuracy** | 58.00% (290/500) | 62.80% (314/500) | +4.80% (+24) |
| **Macro F1** | 58.84% | 61.61% | +2.77% |
| **False Alarm Rate (FAR)** | 39.44% | 21.60% | -17.84% |
| **False Refutation Rate (FRR)** | 35.21% | 16.43% | -18.78% |
| **Refutation Recall** | 54.32% | 45.68% | -8.64% |
| **Tier-1 Invocations** | 128 (25.6%) | 56 (11.2%) | -72 |
| **Tier-1 False Refutations** | 56 | 12 | -44 |
| **Tier-1 Precision** | 47.66% | 70.00% | +22.34% |

---

## 2. Statistical Significance Analysis (McNemar Test)

- Discordant pairs: 52
  - $b$ (E0 correct, E4 incorrect): 14
  - $c$ (E0 incorrect, E4 correct): 38
- Edwards-corrected $\chi^2$: `10.1731`
- Exact two-tailed binomial $p$-value: `1.195120e-3`
- Significant at $\alpha = 0.05$: **YES (Statistically Significant)**
- Significant at $\alpha = 0.01$: **YES (Highly Significant)**

---

## 3. Residual Error Taxonomy in E4

Total residual errors in E4: **186** out of 500 cases (37.20% error rate).

| Residual Error Category | Count | Percentage of Errors | Description |
|---|---|---|---|
| **Tier-1 False Refutations** | 12 | 6.5% | Lexical collisions surviving structural validation |
| **Tier-2 False Refutations** | 23 | 12.4% | Zero-shot NLI overconfidence in Pass-1 or Pass-2 |
| **Tier-2 False Abstentions** | 11 | 5.9% | Supported claims evaluated as NEUTRAL or blocked by pre-filter |
| **Unresolved Refutations (False Negatives)** | 88 | 47.3% | False premises where NLI returned NEUTRAL |
| **OOD Entity Leakage** | 5 | 2.7% | Out-of-curriculum claims not intercepted by boundary gate |
| **Ambiguity Leakage** | 47 | 25.3% | Subjective / open-ended questions not intercepted |

---

## 4. Case Forensics of Representative Residual Errors

### TIER1_FALSE_REFUTATION (12 cases)

- **[EXP31-SUP-0001]** Expected: `SUPPORTED` | Actual: `REFUTED` | Tier: `TIER_1_DETERMINISTIC`
  - **Query:** "Does flexbox allow items to shrink along the main axis when flex-shrink is set to 1?"
  - **Reason:** Contradictory evidence found via Tier-1 curriculum fast path
- **[EXP31-SUP-0007]** Expected: `SUPPORTED` | Actual: `REFUTED` | Tier: `TIER_1_DETERMINISTIC`
  - **Query:** "Does the cross axis run perpendicular to the main axis established by the flex-direction property?"
  - **Reason:** Contradictory evidence found via Tier-1 curriculum fast path
- **[EXP31-SUP-0015]** Expected: `SUPPORTED` | Actual: `REFUTED` | Tier: `TIER_1_DETERMINISTIC`
  - **Query:** "Does content-box calculate the total rendered element width by adding padding and borders onto the specified width?"
  - **Reason:** Contradictory evidence found via Tier-1 curriculum fast path

### TIER2_FALSE_REFUTATION (23 cases)

- **[EXP31-SUP-0025]** Expected: `SUPPORTED` | Actual: `REFUTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does the spread operator expand elements of an iterable into function argument positions?"
  - **Reason:** Semantic contradiction established by Tier-2 NLI over curriculum evidence
- **[EXP31-SUP-0068]** Expected: `SUPPORTED` | Actual: `REFUTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does app.use(express.json()) parse incoming request bodies encoded with Content-Type application/json?"
  - **Reason:** Semantic contradiction established by Tier-2 NLI over curriculum evidence
- **[EXP31-SUP-0070]** Expected: `SUPPORTED` | Actual: `REFUTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does an Express error-handling middleware function declare exactly four parameters (err, req, res, next)?"
  - **Reason:** Semantic contradiction established by Tier-2 NLI over curriculum evidence

### TIER2_FALSE_ABSTENTION (11 cases)

- **[EXP31-SUP-0058]** Expected: `SUPPORTED` | Actual: `NOT_ESTABLISHED` | Tier: `TIER_2_ABSTENTION`
  - **Query:** "Does React Context avoid passing props manually through intermediate components in a deeply nested tree?"
  - **Reason:** Insufficient or neutral evidence in retrieved curriculum passages to establish premise
- **[EXP31-SUP-0066]** Expected: `SUPPORTED` | Actual: `NOT_ESTABLISHED` | Tier: `TIER_2_ABSTENTION`
  - **Query:** "Can Express middleware access both the request object and the response object?"
  - **Reason:** Insufficient or neutral evidence in retrieved curriculum passages to establish premise
- **[EXP31-SUP-0078]** Expected: `SUPPORTED` | Actual: `NOT_ESTABLISHED` | Tier: `TIER_2_ABSTENTION`
  - **Query:** "Does calling res.status(201) set the HTTP response status code to Created before sending data?"
  - **Reason:** Insufficient or neutral evidence in retrieved curriculum passages to establish premise

### OOD_LEAKAGE (5 cases)

- **[EXP31-OOD-0018]** Expected: `NOT_ESTABLISHED` | Actual: `REFUTED` | Tier: `TIER_1_DETERMINISTIC`
  - **Query:** "Does RxJS handle asynchronous event streams using Observables and pipeable operators?"
  - **Reason:** Contradictory evidence found via Tier-1 curriculum fast path
- **[EXP31-OOD-0025]** Expected: `NOT_ESTABLISHED` | Actual: `REFUTED` | Tier: `TIER_1_DETERMINISTIC`
  - **Query:** "Does SOAP encode remote procedure calls in structured XML envelopes over HTTP protocols?"
  - **Reason:** Contradictory evidence found via Tier-1 curriculum fast path
- **[EXP31-OOD-0029]** Expected: `NOT_ESTABLISHED` | Actual: `SUPPORTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does Lit provide lightweight reactive web components using standard browser custom elements?"
  - **Reason:** Premise entailed by curriculum evidence according to Tier-2 NLI

### AMBIGUITY_LEAKAGE (47 cases)

- **[EXP31-AMB-0001]** Expected: `NOT_ESTABLISHED` | Actual: `REFUTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Is flexbox significantly easier to learn and master than traditional CSS float layouts?"
  - **Reason:** Semantic contradiction established by Tier-2 NLI over curriculum evidence
- **[EXP31-AMB-0004]** Expected: `NOT_ESTABLISHED` | Actual: `REFUTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Are semantic HTML elements always more aesthetically appealing than generic div elements?"
  - **Reason:** Semantic contradiction established by Tier-2 NLI over curriculum evidence
- **[EXP31-AMB-0008]** Expected: `NOT_ESTABLISHED` | Actual: `REFUTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does using inline styles result in cleaner and more maintainable code than external stylesheets?"
  - **Reason:** Semantic contradiction established by Tier-2 NLI over curriculum evidence

### UNRESOLVED_REFUTATION (88 cases)

- **[EXP31-FP-0004]** Expected: `REFUTED` | Actual: `SUPPORTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does flex-grow: 0 cause flex items to expand to consume all unused space in the parent?"
  - **Reason:** Premise entailed by curriculum evidence according to Tier-2 NLI
- **[EXP31-FP-0005]** Expected: `REFUTED` | Actual: `SUPPORTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does box-sizing default to border-box in standard browser root stylesheets?"
  - **Reason:** Premise entailed by curriculum evidence according to Tier-2 NLI
- **[EXP31-FP-0009]** Expected: `REFUTED` | Actual: `SUPPORTED` | Tier: `TIER_2_SEMANTIC_NLI`
  - **Query:** "Does setting gap: 20px in flexbox apply 20px padding to the exterior outer container borders?"
  - **Reason:** Premise entailed by curriculum evidence according to Tier-2 NLI

