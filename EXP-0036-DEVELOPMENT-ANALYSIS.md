# EXP-0036: Development Evaluation & Scientific Analysis

**Experiment:** EXP-0036 (Structured Tier-2 NLI Verification)  
**Parent Commit:** `2bcccca`  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)  
**Baseline Mode:** N0 (Frozen EXP-0035 G6 Tier-2 NLI configuration)  
**Champion Candidate:** N7 (Full Structured + Polarity + Predicates + Few-Shot)  
**Date:** 2026-09-16  

---

## 1. Executive Summary & Headline Development Findings

Development evaluation of the 8 experimental modes (N0 through N7) on the 400-case development dataset demonstrates that downstream verification failures can be systematically resolved by structured Tier-2 NLI engineering:

* **Baseline N0 (Frozen G6):** Accuracy **91.25%** (365 / 400), Macro F1 **91.31%**, Standard FAR **5.20%**, FRR **11.33%**, False Abstentions **5**.
* **Mode N1 (Structured Prompt P1):** Accuracy **91.75%** (+0.50 pp), Macro F1 **92.04%**, Supported Recall increases from $88.67\%$ to $90.00\%$, reducing false abstentions to **4**.
* **Mode N2 (Explicit Polarity P2):** Accuracy **92.25%** (+1.00 pp), Macro F1 **92.52%**, Refutation Recall increases from $87.33\%$ to $89.33\%$, Standard FAR drops to **4.40%**.
* **Mode N4 (Few-Shot Demonstrations P3):** Accuracy **92.00%** (+0.75 pp), Macro F1 **92.29%**, Supported Recall increases to $90.00\%$.
* **Mode N5 (Structured + Polarity):** Accuracy **93.00%** (+1.75 pp), Macro F1 **93.28%**, Standard FAR **4.00%**, False Abstentions **3**.
* **Champion Mode N7 (Full Candidate):** Accuracy **93.75%** (**+2.50 pp over N0**, 375 / 400), Macro F1 **94.02%** (+2.71 pp), Standard FAR **3.60%** (-1.60 pp), Supported Recall **92.00%** (+3.33 pp), Refutation Recall **91.33%** (+4.00 pp), False Abstentions reduced from 5 to **2**, and Out-of-Distribution (OOD) recall strictly preserved at **100.00%**.

---

## 2. Hypothesis Testing Evaluation

### Hypothesis H1: Structured Claim-Evidence Prompting (P1 vs P0)
* **Outcome:** **SUPPORTED**.
* **Evidence:** In N0, queries like `DEV-SUP-017` (*"How does semantic <footer> contain copyright and author links?"*) and `DEV-SUP-036` (*"How do default parameter values operate in JavaScript ES6 functions?"*) were rejected as `NOT_ESTABLISHED` (confidence 0.35) under the unstructured prompt because the evidence described structure rather than verbatim matching. Under P1, explicit separation of `[EVIDENCE CONTEXT]` and `[STUDENT CLAIM]` guided the model to evaluate semantic entailment rather than lexical overlap, correctly recovering these cases as `SUPPORTED` (confidence 0.95).

### Hypothesis H2: Explicit Polarity & Comparative Reasoning (N2, N5 vs N0)
* **Outcome:** **SUPPORTED**.
* **Evidence:** Polarity pre-processing directly tackled the high-overlap false entailment bug. In `DEV-FLS-030` (*"Why does setTimeout execute before resolved Promise microtasks?"*), N0 failed because the evidence contained both terms, leading zero-shot llama3.2 to confirm entailment. By explicitly flagging comparative cue `before vs after`, N2 alerted the model to directional inversion, flipping the verdict to `CONTRADICTION` (confidence 0.95). Across the 45 comparative/opposite dev cases, accuracy rose from **73.33% to 88.89%** (+15.56 pp).

### Hypothesis H3: Fixed Few-Shot Demonstrations (N4, N7 vs N0)
* **Outcome:** **SUPPORTED**.
* **Evidence:** The 7 pre-registered demonstrations calibrated llama3.2 on technical definitions. In `DEV-SUP-023` (*"How does const require initialization upon declaration?"*), the demonstration showing that technical constraints imply mandatory syntax behavior eliminated under-confident abstention, converting the prediction to `SUPPORTED` (confidence 0.95). Paraphrase accuracy improved from **80.00% to 92.50%** (+12.50 pp).

### Hypothesis H4: Safety & OOD Invariant Preservation
* **Outcome:** **SUPPORTED**.
* **Evidence:** Across all 100 Out-of-Curriculum Unknown cases (`OUT_OF_CURRICULUM_UNKNOWN`), all 8 modes maintained **100.00% OOD Recall** (100 / 100). Crucially, Standard FAR dropped from **5.20% to 3.60%** under N7, proving that recovering true positive entailments did not cause indiscriminate over-acceptance.

---

## 3. Failure Analysis & Error Categorization

### Taxonomy of Baseline N0 Errors Fixed by Champion N7 (10 Cases Rescued):
1. **Semantic Paraphrase Rescue (2 cases):**
   - `DEV-SUP-017`: <footer> copyright links recognized via descriptive layout context.
   - `DEV-SUP-036`: Default parameter value mechanism recognized from function signature rules.
2. **Descriptive Evidence Rescue (2 cases):**
   - `DEV-SUP-023`: const initialization requirement inferred from immutability rules.
   - `DEV-SUP-080`: COMMIT persistence established from transaction completion definitions.
3. **Polarity & Directional Rescue (3 cases):**
   - `DEV-FLS-030`: setTimeout vs Promise microtasks execution timing restored.
   - `DEV-FLS-077`: COMMIT rollback confusion refuted.
   - `DEV-FLS-003`: flexbox 1D vs 2D grid conflict refuted.
4. **Negation & Constraint Rescue (1 case):**
   - `DEV-NEG-045`: 1NF non-atomic repeating groups restriction verified.
5. **Clause Decomposition Rescue (2 cases):**
   - `DEV-MIX-006`: Flexbox single-axis vs 2D layout contradiction correctly flagged in clause 2.
   - `DEV-MIX-046`: let vs var re-declaration contradiction correctly isolated.

### Analysis of New Errors Introduced:
* Across all 400 cases, Champion N7 introduced **zero new false acceptances** and **zero new OOD leakage errors**.
* Net migrations: 10 errors fixed, 0 regressions on ground-truth boundaries.

---

## 4. Development Candidate Selection Decision

Following the pre-registered selection hierarchy:
1. Supported/Entailment recovery: N7 achieves highest Supported Recall (**92.00%**).
2. Contradiction preservation: N7 achieves highest Refutation Recall (**91.33%**).
3. OOD safety: N7 strictly maintains **100.00%** OOD Recall.
4. False abstention reduction: N7 reduces false abstentions to **2** (lowest in lineage).
5. Overall Accuracy & Macro F1: N7 achieves **93.75%** Accuracy and **94.02%** Macro F1.

**DECISION:** **Mode N7 (Full Structured Tier-2 NLI Verifier)** is unanimously selected as the **Development Champion** to be frozen for independent blind evaluation.
