# EXP-0031: Independent Statistical & Scientific Audit Report

**Audit Target:** EXP-0031 — Tier-1 Semantic/Syntactic Decoupling & Clause-Grounded Polarity Disambiguation  
**Repository:** `d:/Collage project/EduConnect-LMS-Experimental`  
**Active Branch:** `exp-0031`  
**Audited Commit:** `01d6220`  
**Parent Commit:** `3bd36c7` (Certified EXP-0030 Frozen Baseline)  
**Production Commit:** `1768832` (`EduConnect-LMS-Production`, Verified Untouched)  
**Audit Date:** 2026-09-16  
**Audit Type:** Strict Post-Execution Statistical, Cryptographic & Scientific Audit (AUDIT ONLY — Zero Re-execution)  
**Scientific Decision:** `CONDITIONAL`  

---

## 1. Executive Summary & Core Verdict

This independent audit conducted a complete, ground-up verification of EXP-0031 from the raw prediction records, frozen datasets, and cryptographic hashes without re-executing model runs or altering source code.

### Primary Audit Findings:
1. **Repository & Isolation Integrity (CONFIRMED):**
   - Active branch is `exp-0031` at commit `01d6220`.
   - Parent lineage is exactly `3bd36c7` (EXP-0030).
   - Production repository (`EduConnect-LMS-Production`) remains completely untouched at commit `1768832`.
   - Implementation file `backend/rag_premise_verifier.php` contains zero hardcoded benchmark IDs, queries, or ground-truth labels.
2. **False Alarm Rate (FAR) Target Exceeded (CONFIRMED):**
   - The primary goal was reducing FAR below 25.0%.
   - Measured FAR on Ground-Truth Supported claims dropped from **39.44% (E0)** to **21.60% (E4)** (**-17.84 pp reduction**, 45.2% relative decrease).
   - Measured signal-detection FAR across all non-refuted claims dropped from **28.11% (E0)** to **15.68% (E4)** (**-12.43 pp reduction**).
3. **Decoupling of Tier-1 Deterministic False Refutations (CONFIRMED):**
   - Tier-1 false refutations on Supported claims collapsed from **56 cases (E0)** down to **12 cases (E4)** (**-78.57% reduction**, 44 false alarms prevented, 0 new false alarms introduced).
   - Tier-1 precision on Supported refutations surged from **47.66% (E0)** to **70.00% (E4)** (**+22.34 pp**).
4. **Statistically Significant Paired Accuracy Lift (CONFIRMED):**
   - Overall Accuracy rose from **58.00% (290/500)** to **62.80% (314/500)** (**+4.80 pp**, +24 net correct cases).
   - Macro F1 rose from **58.84%** to **61.61%** (**+2.77 pp**).
   - Paired contingency analysis: $n_{01} = 38$ (E0 incorrect $\rightarrow$ E4 correct), $n_{10} = 14$ (E0 correct $\rightarrow$ E4 incorrect).
   - Edwards-corrected McNemar statistic: $\chi^2 = 10.1731, p = 0.001195$ ($p < 0.0012$, statistically significant at both $\alpha = 0.05$ and $\alpha = 0.01$).
5. **The Primary Scientific Trade-Off (CONFIRMED & CRITICAL):**
   - Refutation recall decreased from **54.32% (E0)** to **45.68% (E4)** (**-8.64 pp**, -14 cases lost out of 162).
   - Forensic decomposition of the 14 lost refutations reveals that E0 had captured them via *coincidental* lexical collisions (e.g. `COMMIT` vs `ROLLBACK` in the same bullet point). When E4 decoupled these collisions and fell through to Tier-2, the zero-shot local LLM (`llama3.2`) failed to establish semantic contradiction.
   - Therefore, Tier-1 precision improved substantially, but recall-oriented contradiction detection became more conservative.

---

## 2. Artifact Inventory & Cryptographic Checksum Audit

All 12 EXP-0031 artifacts and associated cache files were independently inventoried and hashed:

| Artifact File | Size (Bytes) | SHA-256 Checksum | Audit Status |
|---|:---:|---|:---:|
| `backend/rag_premise_verifier.php` | 91,483 | `e9e00ac7fa4cb3aeddc6a4ebe3f2fd0191ab7af7996231edddaee8f6c9576f57` | VERIFIED |
| `EXP-0031-DESIGN.md` | 7,905 | `60abe4d7bbc8a560ae6f102d999cd431e4977cb5d0b0870dba32ed95fb193a3e` | VERIFIED |
| `EXP-0031-TIER1-FORENSICS.md` | 15,615 | `10eb91173adfcb74877b52227560d281e5ce262b5112319656e14161334102e7` | VERIFIED |
| `EXP-0031-TIER1-CHALLENGE-DATASET.json` | 45,263 | `88844632ee4420fb706dd89e91f9d17af9536ad9a9cdb57018e1831cb37acff9` | VERIFIED |
| `EXP-0031-TIER1-CHALLENGE-VALIDATION.md` | 1,418 | `6d645a724b1e93535b189a9488f4d17ba77c0338d4ea7e9ab3c6fb0c2faa9c11` | VERIFIED |
| `EXP-0031-BLIND-DATASET.json` | 134,396 | `712f9daea02d0f355ed11413ce0d98226937f59279508340d4ea13ec0e80039d` | VERIFIED |
| `EXP-0031-BLIND-DATASET-VALIDATION.md` | 3,946 | `04fc991c43a80c120859df23797b67f968aff16a175fc4d818d6ea8c27bb9538` | VERIFIED |
| `EXP-0031-ABLATION-RESULTS.json` | 2,404,905 | `3198316d7a3810938b5847b2f716a8d5f77cccefad4b6bdfe0eb83c204a8fcb2` | VERIFIED |
| `EXP-0031-RESULTS.json` | 7,407,473 | `ce1139313a70fd7d90b9985e0a15212c2869c4a169bab65da50e2ec38893b1cf` | VERIFIED |
| `EXP-0031-ERROR-ANALYSIS.md` | 7,606 | `f5c14ca70f369d539856705637d72817c94526a7802132617ab1c87ed79a1550` | VERIFIED |
| `EXP-0031-REPRODUCIBILITY.md` | 5,435 | `fa7923d9d2de399027f51d221710ec9031045425c699300c893f27e97eb082d3` | VERIFIED |
| `EXP-0031-MANIFEST.json` | 5,959 | `9c2a6abf1d3a701c41967842be7ab003ebc39aadb78e19380c5b07bc823c5719` | VERIFIED |
| `EXP-0031-RESEARCH-REPORT.md` | 29,366 | `87456ce4e908baf18dbbd1d76227ac7844cc0ed25d4aa9690aaffdcd38525250` | VERIFIED |
| `scratch/exp0031_blind_retrieval_cache.json` | 139,443,665 | `be122411aa58513731aff4ae0af570a6c69ddd745524de85ee37416b2f8030ab` | VERIFIED |
| `scratch/exp0031_challenge_retrieval_cache.json` | 41,951,410 | `5a687177efd92daad8234cdaabe2efdd63ccae119c60151b27799261e55bbb90` | VERIFIED |
| `scratch/exp0031_nli_cache.json` | 60,113 | `47dce2cae33d9f1aeda5a4743bfe18b3e41c82c7dc168094fb14de6f47f5ecb8` | VERIFIED |

---

## 3. Blind Dataset Independent Audit ($N = 500$)

- **Total Cases:** Exactly 500.
- **Unique Case IDs:** 500 (0 duplicate IDs).
- **Unique Query Strings:** 500 (0 duplicate queries; 0 normalized duplicates).
- **Category Composition:**
  - `SUPPORTED`: 125 cases (25.0%)
  - `FALSE_PREMISE`: 125 cases (25.0%)
  - `AMBIGUOUS`: 75 cases (15.0%)
  - `OOD`: 50 cases (10.0%) [25 Known-OOD, 25 Novel-OOD]
  - `PARAPHRASE`: 50 cases (10.0%)
  - `ADVERSARIAL`: 75 cases (15.0%) [38 Supported, 37 Refuted]
- **Target Label Distribution:**
  - `SUPPORTED`: 213 cases (42.6%)
  - `REFUTED`: 162 cases (32.4%)
  - `NOT_ESTABLISHED`: 125 cases (25.0%)
- **Historical Collision Audit:**
  - Checked against 117 historical benchmark JSON files containing 13,092 normalized queries from EXP-0001 through EXP-0030.
  - **Detected Collisions: Exactly 0 collisions.**
- **Evaluator Leakage:**
  - Grep and AST inspection of `backend/rag_premise_verifier.php` confirmed **0 benchmark IDs, 0 query strings, and 0 test mappings**.

---

## 4. Challenge Dataset Independent Audit ($N = 150$)

- **Total Cases:** Exactly 150.
- **Unique IDs & Queries:** 150 unique IDs, 150 unique queries.
- **Target Labels:** 93 SUPPORTED, 57 REFUTED.
- **Subcategory Taxonomy:**
  - `NEG` (Negation Scope Disambiguation): 30 cases
  - `CMP` (Compound Claim Syntactic Governor): 30 cases
  - `DIS` (Disjunction & Non-Exclusivity): 25 cases
  - `CND` (Subordinate & Conditional Boundaries): 20 cases
  - `PRD` (Predicate Target Mismatch): 15 cases
  - `ENT` (Entity & Sibling Bullet Alignment): 15 cases
  - `LEX` (Lexical Antonym Collision): 15 cases
- **Dataset Cross-Contamination:**
  - Overlap with Blind Dataset: **0 queries (100% disjoint)**.
  - Overlap with historical EXP-0030 failure records: 22 targeted queries (deliberately included to evaluate whether the 46 failure modes were resolved).
  - Evaluator leakage in verifier source: **0 IDs**.

---

## 5. Comprehensive Metric Recalculation & Comparison

The table below presents the independently recalculated metrics across all 5 ablation modes, compared directly against the claims in `EXP-0031-RESEARCH-REPORT.md`:

| Metric | E0 (Baseline) | E1 (Entity/Pred) | E2 (Neg Scope) | E3 (Sub/Disj) | E4 (Candidate) | E4 vs E0 Delta | Audit Verdict |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Overall Accuracy** | 58.00% (290/500) | 61.00% (305/500) | 62.80% (314/500) | 62.80% (314/500) | **62.80% (314/500)** | **+4.80 pp (+24)** | CONFIRMED |
| **Macro F1** | 58.84% | 60.48% | 61.61% | 61.61% | **61.61%** | **+2.77 pp** | CONFIRMED |
| **Supported Precision** | 58.37% | 60.00% | 61.17% | 61.17% | **61.17%** | **+2.80 pp** | CONFIRMED |
| **Supported Recall** | 60.56% | 73.24% | 78.40% | 78.40% | **78.40%** | **+17.84 pp** | CONFIRMED |
| **Refuted Precision** | 48.09% | 53.52% | 58.27% | 58.27% | **58.27%** | **+10.18 pp** | CONFIRMED |
| **Refuted Recall** | 54.32% | 46.91% | 45.68% | 45.68% | **45.68%** | **-8.64 pp (-14)** | CONFIRMED |
| **NOT_EST Precision** | 76.04% | 74.49% | 73.00% | 73.00% | **73.00%** | -3.04 pp | CONFIRMED |
| **NOT_EST Recall** | 58.40% | 58.40% | 58.40% | 58.40% | **58.40%** | 0.00 pp | CONFIRMED |
| **False Alarm Rate (FAR)** | 39.44% | 26.76% | 21.60% | 21.60% | **21.60%** | **-17.84 pp** | CONFIRMED |
| **False Refutation Rate (FRR)** | 35.21% | 22.54% | 16.43% | 16.43% | **16.43%** | **-18.78 pp** | CONFIRMED |
| **Refutation Recall** | 54.32% | 46.91% | 45.68% | 45.68% | **45.68%** | **-8.64 pp** | CONFIRMED |
| **Unknown Recall** | 58.40% | 58.40% | 58.40% | 58.40% | **58.40%** | 0.00 pp | CONFIRMED |
| **OOD Accuracy** | 90.00% | 90.00% | 90.00% | 90.00% | **90.00%** | 0.00 pp | CONFIRMED |
| **Novel-OOD Accuracy** | 87.10% | 87.10% | 87.10% | 87.10% | **87.10%** | 0.00 pp | CONFIRMED |
| **Ambiguity Accuracy** | 37.33% | 37.33% | 37.33% | 37.33% | **37.33%** | 0.00 pp | CONFIRMED |
| **Paraphrase Accuracy** | 56.00% | 74.00% | 74.00% | 74.00% | **74.00%** | **+18.00 pp (+9)** | CONFIRMED |
| **Adversarial Accuracy** | 60.00% | 60.00% | 65.33% | 65.33% | **65.33%** | **+5.33 pp (+4)** | CONFIRMED |
| **Tier-1 Invocations** | 128 (25.6%) | 74 (14.8%) | 56 (11.2%) | 56 (11.2%) | **56 (11.2%)** | **-72 calls (-56.3%)** | CONFIRMED |
| **Tier-1 False Refutations** | 56 | 25 | 12 | 12 | **12** | **-44 (-78.6%)** | CONFIRMED |
| **Tier-1 Precision** | 47.66% | 56.14% | 70.00% | 70.00% | **70.00%** | **+22.34 pp** | CONFIRMED |
| **Pass-2 Invocation Rate** | 19.60% | 22.20% | 23.20% | 23.20% | **23.20%** | +3.60 pp | CONFIRMED |
| **Avg LLM Calls / Query** | 0.94 | 1.07 | 1.12 | 1.12 | **1.12** | +0.18 calls | CONFIRMED |
| **Evidence Used Invariant** | 100.0% | 100.0% | 100.0% | 100.0% | **100.0%** | 0.00 pp | CONFIRMED |

---

## 6. Paired Statistical Significance & Disagreement Decomposition

### 2x2 Contingency Table (E0 vs E4, $N = 500$)

```
                       E4 Correct          E4 Incorrect          Total
E0 Correct                276                   14                290
E0 Incorrect               38                  172                210
Total                     314                  186                500
```

- **$n_{11}$ (Both Correct):** 276
- **$n_{00}$ (Both Incorrect):** 172
- **$n_{10}$ (E0 Correct, E4 Incorrect — Regressions):** **14**
- **$n_{01}$ (E0 Incorrect, E4 Correct — Improvements):** **38**
- **Total Discordant Pairs ($n_{10} + n_{01}$):** **52**
- **Edwards-Corrected McNemar Statistic:**
  $$\chi^2 = \frac{(|14 - 38| - 1)^2}{52} = \frac{23^2}{52} = \frac{529}{52} = \mathbf{10.1731}$$
- **Exact Two-Tailed Binomial $p$-value:**
  $$p = \sum_{k=0}^{14} \binom{52}{k} (0.5)^{52} \times 2 = \mathbf{1.195120 \times 10^{-3}} \; (p = 0.001195)$$
- **Statistical Significance Audit:**
  - $\alpha = 0.05$: **STATISTICALLY SIGNIFICANT**
  - $\alpha = 0.01$: **STATISTICALLY SIGNIFICANT** ($p < 0.0012$)

### Causal Decomposition of the 52 Disagreements:

1. **38 Improvements (E0 False Refutation $\rightarrow$ E4 Supported):**
   - **Supported Claims (20 cases):** Legitimate supported claims that contained antonym or negation terms (e.g. `main axis`, `cross axis`, `synchronous`, `mutable`). In E0, legacy Tier-1 matched the keyword and falsely refuted them. In E4, structural validation prevented false trigger, fell through to Tier-2 NLI, and correctly predicted `SUPPORTED`.
   - **Paraphrase Claims (9 cases):** Complex syntactically inverted sentences (e.g. `const` binding reassignment prevention, `useCallback` cached reference) saved from false refutation.
   - **Adversarial Claims (9 cases):** Claims with tricky negation inquiry phrasing (e.g. "without mutating", "without blocking the main thread") correctly preserved by polarity concordance.
2. **14 Regressions (E0 Coincidental Hit $\rightarrow$ E4 Miss):**
   - **False Premise Claims (9 cases):** `EXP31-FP-0027`, `0049`, `0050`, `0054`, `0062`, `0065`, `0111`, `0116`, `0125`.
   - **Adversarial Claims (5 cases):** `EXP31-ADV-0042`, `0046`, `0053`, `0060`, `0064`.
   - **Root Cause:** In all 14 cases, the query was factually false, but the retrieved evidence chunk contrasted multiple concepts (e.g. `COMMIT` vs `ROLLBACK`, `useMemo` vs `useRef`). In E0, Tier-1 fired naively because the antonym string appeared in the chunk. In E4, structural checks recognized that the evidence line was not refuting the query's specific subject, so it downgraded Tier-1 to `NO_DETERMINISTIC_REFUTATION`. When evaluated by Tier-2 NLI, the zero-shot local model was insufficiently sensitive to the contradiction (12 predicted `SUPPORTED`, 2 predicted `NOT_ESTABLISHED`).

---

## 7. Granular Audit of the 46 Historical Forensic Target Cases

The audit traced the 46 historical false refutation cases from EXP-0030:
- **Historical Forensic Cases in EXP-0030 Audit:** 46 cases.
- **Matched Cases in EXP-0031 Challenge Suite:** 22 cases.
  - In E0: 21 false refutations.
  - In E4: 0 false refutations.
  - **Historical False Refutations Prevented in Challenge Suite: 21 of 21 (100.0% prevention).**
- **Distinction from Blind Dataset:**
  - The Blind Dataset ($N = 500$) is completely novel and has 0 overlap with the historical 46 cases.
  - On this novel blind benchmark, E0 generated 56 Tier-1 false refutations on Supported claims; E4 reduced this to 12 (44 prevented, 78.6% drop).

---

## 8. Challenge Dataset Performance & Generalization Audit ($N = 150$)

| Subcategory | Count | E0 Accuracy | E4 Accuracy | Delta | Structural Component Responsible |
|---|:---:|:---:|:---:|:---:|---|
| **Negation Scope (`NEG`)** | 30 | 63.33% (19/30) | **76.67% (23/30)** | **+13.33 pp** | Step 3 (Polarity concordance & inquiry handling) |
| **Compound Claims (`CMP`)** | 30 | 76.67% (23/30) | **80.00% (24/30)** | **+3.33 pp** | Step 2 (Predicate target alignment) |
| **Disjunction (`DIS`)** | 25 | 92.00% (23/25) | **92.00% (23/25)** | 0.00 pp | Step 4 (Non-exclusivity preservation) |
| **Conditionals (`CND`)** | 20 | 65.00% (13/20) | **70.00% (14/20)** | **+5.00 pp** | Step 4 (Subordinate clause boundary gating) |
| **Predicate Mismatch (`PRD`)** | 15 | 33.33% ( 5/15) | **73.33% (11/15)** | **+40.00 pp** | Step 2 (Direct object & modifier alignment) |
| **Entity Mismatch (`ENT`)** | 15 | 40.00% ( 6/15) | **40.00% ( 6/15) **| 0.00 pp | Step 1 (Sibling bullet cross-talk filtering) |
| **Lexical Collision (`LEX`)** | 15 | 40.00% ( 6/15) | **60.00% ( 9/15)** | **+20.00 pp** | Step 1 & 2 (Opposite dictionary disambiguation) |
| **TOTAL CHALLENGE SET** | **150** | **63.33% (95/150)** | **73.33% (110/150)** | **+10.00 pp** | Full 5-point structural validation pipeline |

---

## 9. Ablation Trajectory & Component Attribution

The audit independently verified the progression from E0 to E4:
1. **E0 $\rightarrow$ E1 (Entity & Predicate Decoupling):**
   - Accounts for **62.5% of the total accuracy gain** (+3.00 pp on blind set, +6.67 pp on challenge set).
   - Eliminates 31 Tier-1 false refutations and cuts FAR from 39.44% to 26.76%.
   - Proves that sibling-bullet collisions and predicate target mismatches were the single largest source of Tier-1 failure.
2. **E1 $\rightarrow$ E2 (Negation Scope & Polarity Concordance):**
   - Accounts for **37.5% of the total accuracy gain** (+1.80 pp on blind set, +3.33 pp on challenge set).
   - Eliminates another 13 Tier-1 false refutations and lowers FAR from 26.76% to 21.60% (surpassing the $< 25\%$ target).
3. **E2 $\rightarrow$ E3 / E4 (Subordinate Scope & Fall-Through Finalization):**
   - Metrics plateau (accuracy 62.80%, FAR 21.60%).
   - E3 and E4 act as safety clamps that prevent regressions on complex conditionals, but do not produce additional raw score deltas on this test split.

---

## 10. Answers to Specific Scientific Audit Questions

### Q1: Did EXP-0031 significantly improve overall paired classification?
**YES.** Paired accuracy improved from 58.00% to 62.80% (+4.80 pp, +24 net cases), and Macro F1 rose from 58.84% to 61.61%. The Edwards-corrected McNemar test ($n_{01} = 38, n_{10} = 14$) is statistically significant with $p = 0.001195 < 0.01$.

### Q2: Did it reduce FAR below the 25% target?
**YES.** FAR on Supported claims dropped from 39.44% to 21.60% (-17.84 pp reduction). Under standard signal detection theory across all non-refuted claims, FAR dropped from 28.11% to 15.68%.

### Q3: Did it substantially reduce Tier-1 false refutation?
**YES.** Tier-1 false refutations on Supported claims collapsed from 56 to 12 (-78.57% reduction). Tier-1 precision rose from 47.66% to 70.00% (+22.34 pp).

### Q4: How much refutation recall was sacrificed?
**Exactly 8.64 pp** (14 cases out of 162 refuted ground-truth cases, dropping from 54.32% to 45.68%).

### Q5: Is that recall loss acceptable relative to the research objective?
**Scientifically nuanced.** The primary research objective was to eliminate false alarms and prevent student premise rejection on valid questions. The system gained 38 correctly resolved Supported claims (0 regressions on Supported claims) at the cost of 14 lost Refuted claims. Because the 14 lost refutations were previously captured by coincidental and invalid lexical overlap, losing them reflects a principled departure from ungrounded heuristic matching. However, because Tier-2 NLI failed to recover them, the system became more conservative overall. This trade-off is manageable for an instructional RAG assistant (where falsely refuting a student's correct statement is far more harmful than cautiously abstaining on a subtle falsehood), but requires targeted work on Tier-2 contradiction sensitivity.

### Q6: Did the challenge dataset confirm the Tier-1 improvement?
**YES.** Challenge set accuracy rose from 63.33% to 73.33% (+10.00 pp), with 21 of 21 matched historical false refutations completely eliminated.

### Q7: Did OOD / Novel-OOD remain intact?
**YES.** OOD accuracy remained exactly 90.00% across all modes (Novel-OOD: 87.10%, Known-OOD: 94.74%), with 0 regressions.

### Q8: What is now the dominant remaining failure mode?
**Unresolved Refutations (False Negatives).** In E4, 88 of the 186 residual errors (47.3%) are false premises where the system returned `NOT_ESTABLISHED` or `SUPPORTED` due to absent negative evidence and Tier-2 NLI neutrality.

---

## 11. Final Scientific Recommendation & Decision

### Decision: `CONDITIONAL`

**Scientific Justification:**
- While EXP-0031 decisively met the primary engineering goal (reducing False Alarm Rate below 25%, achieving 21.60%, and slashing Tier-1 false refutations by 78.6% with high statistical significance $p = 0.001195$), the material loss of 8.64 pp in refutation recall prevents an unconditional declaration of superiority.
- The pipeline has achieved high precision and safety on benign and supported queries, but is now operating with a conservative bias on subtle technical refutations.
- Adoption is **CONDITIONAL** upon advancing to open-source RAG benchmarking with improved semantic NLI contradiction prompts or curriculum antithesis augmentation in the next research cycle.

---

## 12. Verification Sign-Off

- **Lead Auditor:** Independent Statistical & Verification Agent
- **Audit Target Branch:** `exp-0031` (Commit `01d6220`)
- **Status:** Complete, Verified, Certified
- **Recommended Next Step:** Independent audit of EXP-0031, then transition to hardware-constrained open-source RAG benchmarking.
