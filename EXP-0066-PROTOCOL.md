# EXP-0066 Protocol: Dev–Blind Generalization and Error Attribution Analysis

**Experiment ID:** EXP-0066  
**Date:** 2026-09-26  
**Status:** Pre-registered Protocol  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Starting HEAD:** `9a9c2ffe8432aec535e205432bab2028c8d06396`  
**Mode:** Analysis-Only Diagnostic Study (Zero Pipeline Modifications, Zero Model Inference)

---

## 1. Research Context & Purpose

In EXP-0065, an empirical capacity-scaling benchmark on the development benchmark ($N=400$) conclusively rejected the hypothesis that scaling Tier-2 NLI model parameter count from 3B to 4B/8B solves the downstream verification ceiling:
- C0 (`llama3.2:latest`, 3.2B): **92.00%** (368/400)
- C1 (`qwen3:4b`, 4.0B): **89.25%** (357/400, McNemar $p = 0.089$)
- C2 (`qwen3:8b`, 8.2B): **86.00%** (344/400, McNemar $p = 0.0007$, statistically significantly inferior)

Larger models degraded verification accuracy by inducing semantic hyper-skepticism (False Rejection Rate rose from 12.67% in C0 to 22.00% in C1 and 29.33% in C2).

However, historical evaluations on the sealed holdout benchmark (`EXP-0033-BLIND-DATASET.json`, $N=500$) demonstrate that the champion pipeline (BGE-M3 + Qdrant + PyLate + frozen A4 verifier, condition B0/B1) achieves only:
- EXP-0061 Blind Accuracy: **72.80%** (364/500, 136 errors)
- EXP-0064 Blind Accuracy: **73.00%** (365/500, 135 errors)

This reveals a persistent **19.20 percentage point generalization gap** between development performance (92.00%) and blind holdout performance (72.80%).

### Primary Research Question
> **Why does the exact same verifier architecture achieve approximately 92% accuracy on development data but only approximately 72–73% on the blind holdout?**

Is this degradation caused by:
1. Distribution shift between development and blind datasets?
2. Query difficulty or structural complexity differences?
3. Lexical and pattern differences (e.g., memorized templates in development)?
4. Compositional shifts in false-premise construction (antonym dictionary reliance)?
5. Inherent NLI failure modes under complex syntax?
6. Ambiguity guard failure modes on in-curriculum underspecified queries?
7. Retrieval deficiency (evidence missing from top-$k$)?

---

## 2. Experimental Boundaries & Guardrails

To preserve scientific rigor, EXP-0066 is strictly governed by the following constraints:
1. **Analysis-Only**: No changes to retrieval, chunking, indexing, gating, premise verification, or generator code.
2. **Zero Model Inference**: No new Ollama or local LLM runs are permitted initially. All diagnostic analyses are conducted on locked dataset files, prediction files, and query-level retrieval caches.
3. **Sealed Blind Holdout Protection**: Blind dataset labels are used strictly for diagnostic attribution. No thresholds, prompts, few-shot examples, or dictionary entries may be tuned against the blind set.
4. **Isolated Environment**: Production repository (`D:\Collage project\EduConnect-LMS-Production`) remains completely untouched.
5. **Statistical Integrity**: All reported statistical tests must include exact test statistics, sample sizes, degrees of freedom, and multiple-comparison adjustments (Benjamini-Hochberg FDR).

---

## 3. Pre-Registered Hypotheses

- **H1 (Distribution Shift & Query Structure):** The blind dataset exhibits significantly higher structural and lexical complexity (e.g., longer queries, auxiliary verb questions rather than Wh-questions, normative/subjective markers) compared to development data.
- **H2 (False-Premise Compositional Shift):** Development false premises disproportionately match the frozen 138-pair antonym dictionary (Tier-1 deterministic shortcut), whereas blind false premises feature subtle semantic, scope, and attribute contradictions that bypass Tier-1 and expose Tier-2 NLI vulnerabilities.
- **H3 (Ambiguity Gating Vulnerability):** Development non-established queries consist entirely of out-of-curriculum external technologies that trigger vector-similarity abstention, whereas blind non-established queries introduce in-curriculum ambiguity (`AMBIGUOUS` category) where vector similarity is high and the Ambiguity Guard fails to abstain.
- **H4 (Semantic Hyper-Skepticism / False Rejection):** Valid supported queries in the blind set suffer elevated false rejection (SUP $\to$ REF) due to Tier-1 pattern collisions (e.g., technical antonym dual-mentions) and Tier-2 NLI over-skepticism on paraphrased text.
- **H5 (Retrieval Deficiency):** A non-trivial fraction of blind errors is attributable to retrieval failure (absence of relevant ground truth chunks in the top-5 candidate pool).

---

## 4. Evaluation Dimensions & Methodology

### 4.1 Dataset Comparability Dimensions
Compare `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$) and `EXP-0033-BLIND-DATASET.json` ($N=500$) across:
- Total sample size ($N$)
- Ground-truth label distributions: `SUPPORTED`, `REFUTED`, `NOT_ESTABLISHED`
- Query categories and sub-types
- Query character length (Mean, Median, P95)
- Query word count (Mean, Median, P95)
- Query unique-token ratio (lexical diversity)
- Syntactic clause count and question-type breakdown

### 4.2 Query Difficulty Features (Deterministic Extraction)
Derive objective, deterministic features for all 900 cases:
- **Lexical:** Character count, word count, unique token ratio, Jaccard similarity with retrieved top-5 evidence, lexical unigram overlap ratio.
- **Linguistic Markers:** Negation markers, Antonym dictionary matches (`$semanticOpposites`), Comparative markers, Universal quantifiers (`always`, `never`, `all`, `only`), Normative/Subjective markers (`best`, `should`, `optimal`), Conditional markers, Causal markers.
- **Syntactic Form:** Opening query token (`how`, `why`, `does`, `can`, `is`, `should`, `what`, `other`), Clause count.
- **Contextual Evidence:** Evidence token count in top-5 chunks, Maximum retrieval cosine similarity (`top_sim`).

### 4.3 Statistical Comparison Tests
- **Continuous Features:** Two-sided Mann-Whitney U test (normal approximation for large $N$) with Cliff's delta effect size ($d$).
- **Categorical / Binary Features:** Pearson's $\chi^2$ test of independence ($2 \times 2$ and $2 \times k$ contingency tables) or Fisher's exact test.
- **Multiplicity Correction:** Benjamini-Hochberg False Discovery Rate (FDR) control at $\alpha = 0.05$ across all hypothesis tests.

### 4.4 Error Stratification
Using locked predictions from C0 (`EXP-0065-DEVELOPMENT-PREDICTIONS.json`) and B0 (`EXP-0061-BLIND-PREDICTIONS.json`), stratify accuracy and error modes across:
- Ground-truth class
- Query category
- Query length terciles
- Negation presence
- Antonym dictionary presence
- Decision tier (`TIER_1_DETERMINISTIC`, `TIER_2_SEMANTIC_NLI`, `TIER_2_ABSTENTION`, `TIER_2_AMBIGUITY_GUARD`)

### 4.5 Error Attribution Taxonomy
Each blind error ($N=136$) is classified into mutually exclusive, evidence-backed categories:
- **A. Retrieval-supported:** Relevant curriculum evidence is present in top-5 context.
- **B. Retrieval-deficient:** Relevant evidence is missing from top-5 context (top similarity $< 0.26$ or complete topic omission).
- **C. Evidence-present / Verifier-wrong:** Correct evidence exists in context, but the verifier errs:
  - `C1 (Tier-1 Deterministic Collision)`: Antonym/polarity fast path incorrectly refutes a valid claim.
  - `C2 (Tier-2 Semantic NLI False Acceptance)`: NLI model hallucinates entailment on subtle false premise.
  - `C3 (Tier-2 Semantic NLI False Rejection)`: NLI model over-rejects supported claim.
  - `C4 (Tier-2 NLI Abstention)`: NLI model fails to establish relation and abstains.
- **D. Ambiguity-guard error:** Ambiguity Guard fails to recognize in-curriculum ambiguity/subjectivity and routes query to factual NLI, or falsely triggers on factual query.
- **E. Unknown / Borderline:** Insufficient trace evidence to attribute.

### 4.6 Generation Identifiability Assessment
Verify whether existing artifacts contain generated natural language answers and independent answer faithfulness annotations. If absent, explicitly record:
`GENERATION IDENTIFIABILITY: NOT CURRENTLY IDENTIFIABLE`.

---

## 5. Artifact Lineage & Verification Hashes

| Artifact Path | Description | SHA-256 Checksum |
| :--- | :--- | :--- |
| `EXP-0025-DEVELOPMENT-DATASET.json` | Locked Dev Benchmark ($N=400$) | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| `EXP-0033-BLIND-DATASET.json` | Locked Blind Holdout ($N=500$) | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| `EXP-0065-DEVELOPMENT-PREDICTIONS.json` | Dev Predictions (C0, C1, C2) | `89ef70d8f59a5d61e919ad2bf7c2226d3e2075e3948b73957acb1bad2e740afb` |
| `EXP-0061-BLIND-PREDICTIONS.json` | Blind Predictions (B0, B1) | `b424b3f3a47ec9e3690d1ac3a0ae60e0693d470ce2ec00467017de1d8b3bbb37` |
| `EXP-0056-BLIND-PREDICTIONS.json` | Historical Blind Reference | `175595afa9c71b75bec96b52de9c591190d4d7a751e290190f41d549e1f803a9` |
| `EXP-0064-BLIND-PREDICTIONS.json` | EXP-0064 Blind Validation | `5d3fc3464373f5ad670c0380508ef0350bb0bdc3560007302e1fc6b74518108b` |
| `scratch/exp0056_dev_c1_cache.json` | Dev Retrieval Context Cache | `e4955c0513a96e18b889d3992d8433da78b977c0b3b981b3c3e8a216569e9e0a` |
| `scratch/exp0056_blind_c1_cache.json` | Blind Retrieval Context Cache | `f042efd87af49bec424cabbe8b86eca21644db92b0d7e8bb576ce2d0851f9b8e` |
| `backend/rag_ambiguity_guard_verifier.php` | Frozen A4 Verifier Implementation | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| `backend/rag_premise_verifier.php` | Tier-1 & Tier-2 NLI Engine | `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179` |

---

## 6. Execution Command
The diagnostic analyzer will be executed as:
```bash
python research/exp0066_analyzer.py
```
Outputs produced:
- `EXP-0066-DATASET-COMPARISON.json`
- `EXP-0066-ERROR-STRATIFICATION.json`
- `EXP-0066-ANALYSIS.md`
- `EXP-0066-FAILURE-ATTRIBUTION.md`
- `EXP-0066-FINAL-REPORT.md`
