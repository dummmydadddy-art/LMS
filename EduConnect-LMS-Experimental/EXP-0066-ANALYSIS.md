# EXP-0066: Dev–Blind Generalization and Diagnostic Analysis

**Experiment ID:** EXP-0066  
**Date:** 2026-09-26  
**Status:** Completed Analysis  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Starting HEAD:** `9a9c2ffe8432aec535e205432bab2028c8d06396`  
**Analysis Type:** Empirical Diagnostic & Generalization Study (Zero Code Modifications, Zero Model Inference)

---

## 1. Executive Summary

EXP-0066 investigates the root causes of the **19.20 percentage point generalization gap** observed between the development benchmark (`EXP-0025-DEVELOPMENT-DATASET.json`, $N=400$, accuracy = **92.00%**) and the sealed blind holdout (`EXP-0033-BLIND-DATASET.json`, $N=500$, accuracy = **72.80%**) under the champion frozen A4 verifier pipeline.

Following EXP-0065's empirical disproof of the model-capacity hypothesis (which showed that increasing Tier-2 NLI model size to 4B and 8B failed to improve development accuracy and degraded calibration by inducing semantic hyper-skepticism), EXP-0066 conducted a comprehensive statistical, linguistic, and architectural autopsy of both datasets and the frozen verifier's execution traces.

### Core Quantitative Findings:
1. **The Gap is Structural and Driven by Distribution Shift:**
   - The development benchmark contains substantial artificial regularities: **32.8%** of queries are concentrated in just 5 query prefix templates, including **50 identical synthetic queries** (`how does external technology framework N manage distributed cluster coordination?` where only $N=51\dots 100$ varies).
   - In development false premises, **88.67%** (133/150) matched entries in the frozen 138-pair antonym dictionary (`$semanticOpposites`), allowing the Tier-1 deterministic fast path to correctly resolve **100%** of tested cases without invoking the LLM.
   - In blind false premises, antonym match drops to **45.68%** (74/162, $\chi^2 = 64.46, p = 8.88 \times 10^{-16}$). When antonym cues are absent, refutation accuracy collapses from **81.08%** down to **57.95%**—barely above chance.
2. **The Introduction of In-Curriculum Ambiguity Exposed Gating Weaknesses:**
   - In development, **100%** of non-established queries (`OUT_OF_CURRICULUM_UNKNOWN`) were out-of-curriculum external technologies whose near-zero cosine similarity ($\text{maxSim} < 0.28$) allowed Tier-1 to abstain trivially with **98.00%** accuracy.
   - In blind, 75 queries represent **in-curriculum ambiguity/subjectivity** (`AMBIGUOUS` category), where cosine similarity is high ($\ge 0.60$). The Ambiguity Guard failed on **33.33%** (25/75) of these cases, routing them to Tier-2 NLI, which forced erroneous factual verdicts (14 False Refutations, 11 False Acceptances).
3. **Valid Supported Claims Suffer False Rejections (21.13% FRR on Blind):**
   - On blind supported queries ($N=213$), the verifier suffered **45 False Rejections** (SUP $\to$ REF) and **13 False Abstentions** (SUP $\to$ NE).
   - 17 False Rejections were caused by **Tier-1 deterministic collisions** (valid queries discussing dual concepts, such as `border-box` vs `content-box` or `flex-direction: column` vs `row`, triggering false polarity inversion).
   - 28 False Rejections were caused by **Tier-2 Semantic NLI hyper-skepticism**, where the LLM demanded exact syntactic matching and over-interpreted paraphrased statements as contradictions.
4. **Retrieval is Not the Bottleneck:**
   - High-level evidence attribution confirms that **98.40%** (492/500) of blind queries had sufficient ground-truth curriculum passages retrieved in the top-5 candidate pool.
   - Only **8 errors** (5.88% of blind errors, 1.60% of all blind queries) were attributable to retrieval deficiency ($\text{maxSim} < 0.26$).
5. **Generation Identifiability:**
   - Forensic audit of all historical prediction artifacts reveals that generated answer texts and end-to-end response correctness annotations were never logged. Hence, generation quality is **NOT CURRENTLY IDENTIFIABLE** from existing artifacts.

---

## 2. Dataset Comparability: Development vs. Blind

The table below contrasts the structural, categorical, and lexical properties of `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$) and `EXP-0033-BLIND-DATASET.json` ($N=500$):

| Dimension | Development ($N=400$) | Blind ($N=500$) | Absolute Difference | Relative Shift / Ratio |
| :--- | :---: | :---: | :---: | :---: |
| **Total Query Count ($N$)** | 400 | 500 | +100 | $1.25\times$ |
| **SUPPORTED (Ground Truth)** | 150 (37.50%) | 213 (42.60%) | +5.10% | $+13.6\%$ |
| **REFUTED (Ground Truth)** | 150 (37.50%) | 162 (32.40%) | -5.10% | $-13.6\%$ |
| **NOT_ESTABLISHED (Ground Truth)** | 100 (25.00%) | 125 (25.00%) | 0.00% | Identical ($1.00\times$) |
| **Categories Present** | 5 | 6 | +1 category | Taxonomy restructured |
| — Supported Curriculum | 100 (25.00%) | 125 (25.00%) | 0.00% | Baseline supported |
| — Paraphrased Supported | 0 (0.00%) | 50 (10.00%) | +10.00% | Novel in blind |
| — Adversarial Phrasing | 0 (0.00%) | 75 (15.00%) | +15.00% | Novel in blind |
| — False Premise / Contradiction | 100 (25.00%) | 125 (25.00%) | 0.00% | Composition shifted |
| — Legitimate Negation | 50 (12.50%) | 0 (0.00%) | -12.50% | Merged into categories |
| — Mixed Compound Premise | 50 (12.50%) | 0 (0.00%) | -12.50% | Merged into categories |
| — Out-of-Curriculum Unknown (OOD) | 100 (25.00%) | 50 (10.00%) | -15.00% | Reduced fraction |
| — In-Curriculum Ambiguous | 0 (0.00%) | 75 (15.00%) | +15.00% | Novel in blind |
| **Query Character Length (Mean)** | 78.77 | 91.02 | +12.25 chars | $+15.55\%$ |
| **Query Character Length (Median)** | 80.00 | 90.00 | +10.00 chars | $+12.50\%$ |
| **Query Character Length (P95)** | 106.00 | 115.00 | +9.00 chars | $+8.49\%$ |
| **Query Word Count (Mean)** | 12.06 | 14.06 | +2.00 words | $+16.58\%$ |
| **Query Word Count (Median)** | 12.00 | 14.00 | +2.00 words | $+16.67\%$ |
| **Query Word Count (P95)** | 17.00 | 18.00 | +1.00 word | $+5.88\%$ |
| **Unique Token Ratio (Mean)** | 0.9734 | 0.9683 | -0.0051 | $-0.52\%$ |
| **Lexical Overlap Ratio w/ Top-5** | 0.4879 | 0.4509 | -0.0370 | $-7.58\%$ |
| **Top-1 Retrieval Similarity (Mean)** | 0.7309 | 0.6489 | -0.0820 | $-11.22\%$ |

---

## 3. Query Difficulty Features & Statistical Significance

To establish whether the blind set is measurably more complex than the development benchmark, 15 objective, deterministic features were extracted across all 900 queries without LLM intervention.

### 3.1 Continuous Feature Distributions

Continuous distributions were compared using the two-sided Mann-Whitney U test (normal approximation for large $N$) and Cliff's delta effect size ($d$). $p$-values were adjusted for multiple testing using the Benjamini-Hochberg False Discovery Rate (FDR) procedure:

| Feature | Dev Mean (Median, P95) | Blind Mean (Median, P95) | Mann-Whitney U | Cliff's Delta ($d$) | Raw $p$-value | FDR Adj. $p$-value | Significant ($\alpha=0.05$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Character Length** | 78.77 (80.0, 106.0) | 91.02 (90.0, 115.0) | 49,208.5 | **-0.5079** | $0.0000$ | $0.0000$ | **Yes** (Large effect) |
| **Word Count** | 12.06 (12.0, 17.0) | 14.06 (14.0, 18.0) | 53,883.0 | **-0.4612** | $0.0000$ | $0.0000$ | **Yes** (Medium-Large) |
| **Unique Token Ratio** | 0.973 (1.00, 1.00) | 0.968 (1.00, 1.00) | 108,614.5 | **+0.0861** | $0.0256$ | $0.0349$ | **Yes** (Negligible) |
| **Jaccard Sim. w/ Ev.** | 0.034 (0.03, 0.06) | 0.036 (0.03, 0.06) | 96,634.5 | **-0.0337** | $0.3799$ | $0.4384$ | No |
| **Lexical Overlap Ratio** | 0.488 (0.47, 0.75) | 0.451 (0.44, 0.75) | 114,643.0 | **+0.1464** | $1.69 \times 10^{-4}$ | $3.62 \times 10^{-4}$ | **Yes** (Small) |
| **Syntactic Clauses** | 1.37 (1.0, 3.0) | 1.19 (1.0, 2.0) | 107,816.0 | **+0.0782** | $0.0431$ | $0.0539$ | No (after FDR) |
| **Top-5 Evidence Tokens**| 564.04 (580.0, 761.0)| 538.23 (555.5, 664.0)| 116,493.5 | **+0.1649** | $2.14 \times 10^{-5}$ | $5.35 \times 10^{-5}$ | **Yes** (Small) |
| **Top-1 Cosine Sim.** | 0.731 (0.90, 0.99) | 0.649 (0.70, 0.99) | 120,204.0 | **+0.2020** | $1.93 \times 10^{-7}$ | $7.23 \times 10^{-7}$ | **Yes** (Small-Medium)|

### 3.2 Linguistic & Semantic Markers

Categorical features were analyzed via $2 \times 2$ contingency tables and Pearson's $\chi^2$ test with FDR adjustment:

| Marker Feature | Dev Count (%) | Blind Count (%) | $\chi^2$ Statistic | Raw $p$-value | FDR Adj. $p$-value | Significant ($\alpha=0.05$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Negation Markers** | 18 (4.50%) | 50 (10.00%) | 9.624 | $1.92 \times 10^{-3}$ | $3.20 \times 10^{-3}$ | **Yes** ($2.2\times$ increase) |
| **Antonym Dictionary Match** | 213 (53.25%) | 171 (34.20%) | 32.967 | $9.37 \times 10^{-9}$ | $4.69 \times 10^{-8}$ | **Yes** (Significant drop) |
| **Comparative Markers** | 137 (34.25%) | 181 (36.20%) | 0.370 | $0.5431$ | $0.5470$ | No |
| **Universal Quantifiers** | 36 (9.00%) | 88 (17.60%) | 13.835 | $1.99 \times 10^{-4}$ | $3.74 \times 10^{-4}$ | **Yes** ($1.96\times$ increase) |
| **Normative / Subjective** | 4 (1.00%) | 42 (8.40%) | 25.091 | $5.47 \times 10^{-7}$ | $1.64 \times 10^{-6}$ | **Yes** ($8.40\times$ increase) |
| **Conditional Markers** | 24 (6.00%) | 35 (7.00%) | 0.363 | $0.5470$ | $0.5470$ | No |
| **Causal Markers** | 0 (0.00%) | 7 (1.40%) | 5.644 | $0.0175$ | $0.0263$ | **Yes** |

### 3.3 Syntactic Phrasing Shift (Question Opening)

The most striking qualitative shift between the datasets lies in the grammatical form of the queries:

| Opening Token | Dev Count (%) | Blind Count (%) | Structural Function |
| :--- | :---: | :---: | :--- |
| **"how"** | 140 (35.00%) | 110 (22.00%) | Explanatory Wh-question |
| **"why"** | 170 (42.50%) | 140 (28.00%) | Presupposition / Causal Wh-question |
| **"what"** | 39 (9.75%) | 12 (2.40%) | Definitional Wh-question |
| **"does"** | **0 (0.00%)** | **147 (29.40%)** | Closed polar verification query |
| **"is"** | **0 (0.00%)** | **42 (8.40%)** | Closed polar verification query |
| **"can"** | **0 (0.00%)** | **20 (4.00%)** | Modal possibility verification query |
| **"should"** | **0 (0.00%)** | **19 (3.80%)** | Normative subjective evaluation |
| **"do" / "are" / "which"** | **0 (0.00%)** | **5 (1.00%)** | Polar verification query |
| **Other / Declarative** | 51 (12.75%) | 5 (1.00%) | Miscellaneous statement |

**Key Finding:** In the development dataset, **0.00%** of queries were polar verification questions (`does`, `is`, `can`, `should`). 87.25% were open Wh-questions (`how`, `why`, `what`). In the blind holdout, **46.60%** (233/500) of queries are closed polar verification questions. This represents a fundamental syntactic shift: closed polar questions invite direct confirmation/negation, whereas open Wh-questions in development served as explanations where the premise was largely assumed to be true unless it matched an explicit antonym.

---

## 4. Pattern Memorization & Dataset Regularities

A forensic audit of the development benchmark reveals clear evidence of synthetic template memorization:
1. **Template Prefix Concentration:**
   - In Development, **32.75%** of all queries share one of just 5 three-word opening prefixes:
     - `how does external`: 50 queries (12.50%)
     - `why doesn t`: 35 queries (8.75%)
     - `what is the`: 28 queries (7.00%)
     - `why can t`: 11 queries (2.75%)
     - `why does http`: 7 queries (1.75%)
   - In Blind, top-5 prefix concentration is only **11.60%**, and trigram diversity is significantly higher (0.893 vs. 0.786).
2. **The 50-Item Synthetic Clone Series (`DEV-UNK-051` to `DEV-UNK-100`):**
   - 50 out of the 100 `OUT_OF_CURRICULUM_UNKNOWN` queries in development are programmatic copies:
     - `DEV-UNK-051`: *"How does external technology framework 51 manage distributed cluster coordination?"*
     - `DEV-UNK-052`: *"How does external technology framework 52 manage distributed cluster coordination?"*
     - $\dots$ through `DEV-UNK-100`.
   - Because these artificial framework names yielded zero vector similarity ($\text{maxSim} < 0.28$), the Tier-1 fast path automatically returned `NOT_ESTABLISHED` for all 50 queries without executing any NLI logic. This single synthetic artifact artificially inflated development accuracy by **+12.50 percentage points**.

---

## 5. False-Premise Generalization: The Antonym Shortcut Collapse

The system's premise verifier relies on a two-tier architecture:
- **Tier-1 Deterministic Fast Path:** Employs domain-scoped conceptual antonym pairs (`$semanticOpposites`, containing 319 normalized technical word-pair patterns) to detect contradictions via lexical polarity inversion.
- **Tier-2 Semantic NLI:** Deploys local instruction-tuned LLMs (`llama3.2:latest`) to verify subtle, non-lexical, or relational contradictions against retrieved evidence.

### 5.1 Antonym Cue Availability and Performance

We segregated all false-premise queries in both datasets according to whether they contained a lexical match in `$semanticOpposites`:

| Dataset & False-Premise Slice | Total ($N$) | Antonym Cue Present | Antonym Cue Absent | Refutation Accuracy (Cue Present) | Refutation Accuracy (Cue Absent) | False Acceptance Rate (REF $\to$ SUP) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Development REFUTED** | 150 | **133 (88.67%)** | 17 (11.33%) | **93.23%** (124/133) | **88.24%** (15/17) | 6.00% (9/150) |
| **Blind REFUTED** | 162 | **74 (45.68%)** | **88 (54.32%)** | **81.08%** (60/74) | **57.95%** (51/88) | **21.60%** (35/162) |
| **Shift Significance** | — | $\chi^2 = 64.46$ | $p = 8.88 \times 10^{-16}$ | — | **Drop: -23.13%** | **Increase: $3.6\times$** |

### 5.2 Mechanics of the Failure Mode
1. **Shortcut Dependence:** On development data, **88.67%** of false premises contained explicit antonym cues (e.g., `row` vs. `column`, `inline` vs. `block`, `content-box` vs. `border-box`), allowing Tier-1 to handle 73 cases deterministically with **100% precision**.
2. **Subtle Contradiction Vulnerability:** On blind holdout data, **54.32%** of false premises feature conceptual, functional, or relational contradictions that lack explicit antonyms (e.g., *"Why does mutating a state object directly without calling setState reliably trigger re-rendering?"*, *"Why does a class selector have higher CSS specificity weight than an ID selector?"*).
3. **100% of Blind False Acceptances Stem from Tier-2 NLI:**
   - Every single one of the **35 False Acceptances** (REF $\to$ SUP) on the blind dataset occurred in **Tier-2 Semantic NLI**.
   - When Tier-1 bypassed the query, the LLM evaluated the query against retrieved evidence passages discussing both `class` and `id`, or `setState` and direct mutation. Because the evidence shared high lexical overlap with the query, the LLM exhibited **sycophancy / presupposition confirmation bias**, falsely verifying the contradictory claim.

---

## 6. Error Stratification: C0 vs. B0

### 6.1 Full Confusion Matrices

#### Development Benchmark (C0: `llama3.2:latest`, $N=400$, Accuracy = 92.00%)
| Ground Truth Label | Predicted SUPPORTED | Predicted REFUTED | Predicted NOT_ESTABLISHED | Class Recall | Class Errors |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPPORTED ($N=150$)** | **131** | 19 | 0 | **87.33%** | 19 (12.67% FRR) |
| **REFUTED ($N=150$)** | 9 | **139** | 2 | **92.67%** | 11 (7.33% FAR) |
| **NOT_ESTABLISHED ($N=100$)** | 1 | 1 | **98** | **98.00%** | 2 (2.00% FAR) |

#### Blind Holdout Benchmark (B0: Un-gated Frozen A4, $N=500$, Accuracy = 72.80%)
| Ground Truth Label | Predicted SUPPORTED | Predicted REFUTED | Predicted NOT_ESTABLISHED | Class Recall | Class Errors |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPPORTED ($N=213$)** | **155** | 45 | 13 | **72.77%** | 58 (27.23% FRR) |
| **REFUTED ($N=162$)** | 35 | **111** | 16 | **68.52%** | 51 (31.48% FAR) |
| **NOT_ESTABLISHED ($N=125$)** | 11 | 16 | **98** | **78.40%** | 27 (21.60% FAR) |

### 6.2 Category-Level Accuracy and Degradation Gap

| Category | Dev $N$ | Dev Acc. | Blind $N$ | Blind B0 Acc. | Gap (Dev $-$ Blind) | Dominant Failure Mode |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Standard Supported** | 100 | 85.00% | 125 | 72.80% | **-12.20%** | SUP $\to$ REF (25), SUP $\to$ NE (9) |
| **Paraphrased Supported** | — | — | 50 | 76.00% | — | SUP $\to$ REF (9), SUP $\to$ NE (3) |
| **False Premise** | 100 | 94.00% | 125 | 69.60% | **-24.40%** | REF $\to$ SUP (24), REF $\to$ NE (14) |
| **Adversarial (Mixed)** | — | — | 75 | 66.67% | — | REF $\to$ SUP (11), SUP $\to$ REF (11) |
| **Ambiguous / Subjective**| — | — | 75 | 66.67% | — | NE $\to$ REF (14), NE $\to$ SUP (11) |
| **Out-of-Curriculum (OOD)**| 100 | 98.00% | 50 | 96.00% | **-2.00%** | Near-perfect vector abstention |
| **Legitimate Negation** | 50 | 92.00% | — | — | — | Merged into general categories |
| **Mixed Compound** | 50 | 90.00% | — | — | — | Merged into general categories |

### 6.3 Query Length Stratification

| Length Tercile | Dev $N$ | Dev Accuracy | Blind $N$ | Blind Accuracy | Gap |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Short ($<11$ words)** | 148 | 91.22% | 101 | 75.25% | **-15.97%** |
| **Medium ($11-15$ words)**| 205 | 92.20% | 231 | 74.03% | **-18.17%** |
| **Long ($>15$ words)** | 47 | 93.62% | 168 | 69.64% | **-23.98%** |

**Key Finding:** As query length exceeds 15 words, the generalization gap widens from **15.97%** to **23.98%**. Blind long queries contain complex syntactic clauses and multiple technical qualifiers that trigger both Tier-1 dictionary collisions and Tier-2 NLI confusion.

---

## 7. Generation Identifiability Assessment

In accordance with protocol section 12, all historical evaluation files, prediction caches, and experiment reports (`EXP-0001` through `EXP-0065`) were audited to determine whether downstream answer generation quality can be decoupled from verification correctness.

- **Artifacts Audited:** `EXP-0021-END-TO-END-RESULTS.json`, `EXP-0056-BLIND-PREDICTIONS.json`, `EXP-0061-BLIND-PREDICTIONS.json`, `EXP-0064-BLIND-PREDICTIONS.json`, `EXP-0065-DEVELOPMENT-PREDICTIONS.json`, and all report files in `tests/rag/reports/`.
- **Finding:** Every existing evaluation artifact strictly records verification classification labels (`predicted`, `expected`, `confidence`, `decision_tier`, `decision_reason`). Not a single file logs the generated natural language response, token generation logs, or independent answer faithfulness/correctness annotations.
- **Formal Status:**  
  `GENERATION IDENTIFIABILITY: NOT CURRENTLY IDENTIFIABLE`

Downstream generation quality remains an unmeasured variable in the RAG research lineage and will require a dedicated evaluation protocol.
