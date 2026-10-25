# EXP-0070 Failure Analysis: Error Attribution & Representation Ceiling

**Experiment ID:** EXP-0070  
**Condition:** `C1_FT_MINILM` (Domain-Specific Fine-Tuned Cross-Encoder)  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, 5-Fold Stratified Cross-Validation)  
**Total Errors:** 69 / 400 (17.25% Error Rate, 82.75% Accuracy)  
**Date:** 2026-09-26  

---

## 1. Global Error Taxonomy ($N=69$)

The 69 residual out-of-fold prediction errors decompose into three distinct failure classes:

| Error Category | Case Count | % of All Errors | Primary Mechanism |
|---|---|---|---|
| **Class I: Supported False Abstention (`SUPPORTED -> NOT_ESTABLISHED`)** | **34** | **49.28%** | Cross-encoder assigns sub-threshold confidence ($< 0.70$) to valid pedagogical paraphrases, defaulting to epistemic abstention. |
| **Class II: Supported False Rejection (`SUPPORTED -> REFUTED`)** | **18** | **26.09%** | Cross-encoder misinterprets legitimate syntactic negation, negative-polarity facts, or scope constraints as contradiction. |
| **Class III: Subtle False-Premise Under-Detection (`REFUTED -> NOT_ESTABLISHED`)** | **14** | **20.29%** | Non-antonym factual counter-assertions lack explicit lexical opposition, causing model to predict `NEUTRAL`. |
| **Class IV: False Acceptance (`REFUTED -> SUPPORTED`)** | **2** | **2.90%** | Presupposition sycophancy: high lexical overlap overrides factual discrepancy (`DEV-NOVEL-033`, `DEV-NOVEL-071`). |
| **Class V: OOD False Refutation (`NOT_ESTABLISHED -> REFUTED`)** | **1** | **1.45%** | Out-of-curriculum inquiry contains terms triggering spurious contradiction signals (`DEV-UNK-003`). |
| **TOTAL** | **69** | **100.0%** | — |

---

## 2. In-Depth Analysis of Failure Classes

### Class I: Supported False Abstention (34 cases, 49.3% of errors)
* **Description:** The student assertion is fully verified by curriculum evidence, but the cross-encoder fails to produce an entailment probability $\ge 0.70$ with margin $\ge 0.20$.
* **Exemplar Case `DEV-SUP-014`:**
  * *Query:* "How does grid-auto-flow control placement of automatically generated grid items?"
  * *Curriculum Context:* `[Topic: HTML & CSS Fundamentals] [Subject: grid-auto-flow] - grid-auto-flow: Controls auto-placement algorithm: row (default), column, dense.`
  * *Model Behavior:* $P(\text{entail}) = 0.582, P(\text{neutral}) = 0.391$.
  * *Etiology:* The training supervision taught the model that asserting properties requires strong evidence. When the student query rephrases "auto-placement algorithm" as "placement of automatically generated grid items", the cross-encoder's contextual representations perceive lexical divergence and hesitate, distributing mass between entailment and neutrality.

### Class II: Supported False Rejection (18 cases, 26.1% of errors)
* **Description:** Legitimate negative facts are misclassified as `REFUTED`.
* **Exemplar Case `DEV-NEG-013`:**
  * *Query:* "Why does box-sizing: border-box prevent padding from expanding total element width?"
  * *Curriculum Context:* `[Topic: HTML & CSS Fundamentals] [Subject: box-sizing] - box-sizing: border-box (width includes padding and border) vs content-box (default).`
  * *Model Behavior:* Predicted `CONTRADICTION` ($P = 0.841$).
  * *Etiology:* The word "prevent" and the presence of contrasting values ("border-box vs content-box") in the premise trigger the cross-encoder's contradiction head, failing to realize that the student is inquiring about the *intended mechanism* of `border-box`.

### Class III: Subtle False-Premise Under-Detection (14 cases, 20.3% of errors)
* **Description:** Counterfactual educational claims that alter subtle quantitative or relational parameters are abstained as `NOT_ESTABLISHED` rather than aggressively refuted.
* **Exemplar Case `DEV-NOVEL-019`:**
  * *Query:* "Why does PostgreSQL enforce Read Committed isolation by executing all transactions in strict serializable sequence?"
  * *Curriculum Context:* `[Topic: PostgreSQL Database Design] [Subject: transaction isolation] - PostgreSQL supports 4 standard isolation levels: Read Committed (default), Repeatable Read, Serializable.`
  * *Model Behavior:* Predicted `NOT_ESTABLISHED` ($P(\text{neutral}) = 0.622, P(\text{contra}) = 0.345$).
  * *Etiology:* The premise does not state "PostgreSQL does not execute all transactions in strict serializable sequence"; it merely lists the 4 levels and states Read Committed is default. Generic cross-encoder embeddings do not possess the world knowledge that executing in serializable sequence *precludes* default Read Committed isolation.

### Class IV: Presupposition False Acceptance (2 cases, 2.9% of errors)
* **Description:** Presupposition sycophancy where a false premise is accepted as true.
* **Exemplar Cases:**
  * `DEV-NOVEL-033`: High surface token match between premise and student assertion tricked the model into predicting `ENTAILMENT` ($P = 0.724$).
  * `DEV-NOVEL-071`: Entailment head overconfidently matched curriculum terminology.
* **Significance:** At only 2 cases ($\text{FAR} = 1.33\%$), fine-tuning achieves industry-leading safety, vastly outperforming C0 (9 false acceptances, $\text{FAR} = 6.00\%$).

---

## 3. The Representation Ceiling: Why Small-Sample Fine-Tuning Cannot Match Generative LLMs

1. **Analytical Logic vs. World-Model Reasoning:**
   * Llama-3.2-3B has 3.2 billion parameters trained on trillions of tokens, granting it rich semantic world-models to infer unstated consequences (e.g. knowing that if A is asynchronous, it cannot be synchronous, or that Read Committed is different from Serializable).
   * MiniLM has 82 million parameters. While domain fine-tuning on 276 pairs taught it the class distribution and surface cues of educational assertions, it lacks parametric memory to reason about technical concepts absent explicit premise statements.
2. **The Paraphrase-Precision Trade-off:**
   * To prevent false acceptance (which causes dangerous sycophancy in RAG), the fine-tuned model must penalize claims that go beyond the premise.
   * However, penalizing unstated facts inevitably penalizes valid pedagogical paraphrases where students express the same truth conditions using different vocabulary.

---

## 4. Conclusion

Domain-specific fine-tuning delivers substantial gains (+12.75 pp over raw cross-encoders, +3.25 pp over calibrated cross-encoders) and reduces false acceptances to a near-zero 1.33%. However, its inability to resolve complex paraphrases (S4: 74%) and non-antonym refutations (S2: 82%) leaves an insurmountable 9.25 pp deficit behind the 3B generative verifier (C0: 92.00%).
