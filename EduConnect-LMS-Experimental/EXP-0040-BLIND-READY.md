# EXP-0040: Frozen Development Checkpoint & Blind-Ready Audit

**Experiment:** EXP-0040: Hierarchical Parent-Child Retrieval  
**Branch:** `exp-0040`  
**Parent Checkpoint Commit:** `f556585ea166406bbe8961ebeedac8b8950c3f54`  
**Candidate:** `P1` — Hierarchical Parent-Child Retrieval (C2_085 Leaf Chunks $\to$ Bounded Parents)  
**Baseline Comparator:** `P0` — C2_085 Semantic Leaf Retrieval (Frozen Baseline from EXP-0039)  
**Frozen Verifier:** Candidate A4 (`backend/rag_ambiguity_guard_verifier.php`, SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  
**Development Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Protected Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`, **SEALED — UNTOUCHED & UNREAD**)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (HEAD: `1768832`, **UNTOUCHED**)  
**Audit Determination:** **PASS — BLIND EVALUATION AUTHORIZED**  

---

## 1. Development Gate Audit Scorecard

| Gate | Requirement | Observed Performance | Status |
|---|---|---|---|
| **Gate A: Construction Integrity** | 100% deterministic hierarchy | 36 parent groups, 76 child chunks mapped | **PASS** |
| **Gate B: Document Isolation** | 0 cross-document contamination | Exactly 0 cross-document parent merges | **PASS** |
| **Gate C: Section Isolation** | 0 cross-section contamination | Exactly 0 cross-section parent merges | **PASS** |
| **Gate D: Token Safety** | Max parent tokens $\le 512$ | Max token count = 210 tokens (Mean = 106.86) | **PASS** |
| **Gate E: Content Preservation** | 100.00% word coverage | 100.00% words preserved from C2_085 | **PASS** |
| **Gate F: Verifier Freeze** | Verifier A4 completely unmodified | SHA-256 identical to EXP-0037/0039 (`31c7c31ef6301156...`) | **PASS** |
| **Gate G: Embedding Freeze** | C2_085 child embeddings untouched | Table `C2_ChonkieSemantic_085` byte-identical | **PASS** |
| **Gate H: Blind Dataset Isolation** | Blind dataset uninspected during dev | Dataset sealed, 0 reads during development | **PASS** |
| **Gate I: Safety Constraint** | Standard FAR $\le 18.50\%$ ceiling | P1 FAR = **3.20%** (8 / 250) on development | **PASS** |
| **Gate J: Downstream & Retrieval** | Useful behavior, no retrieval regression | Recall@1 +4.69 pp, nDCG@10 +5.22 pp; high concordance (98.5%) | **PASS** |

---

## 2. Headline Development Scorecard ($N = 400$)

| Metric | P0 (Child-Only) | P1 (Parent-Child) | Delta ($\Delta$) | Status |
|---|---|---|---|---|
| **Accuracy** | 93.75% (375 / 400) | **92.75%** (371 / 400) | -1.00 pp | Concordant ($p = 0.21875$) |
| **Macro F1** | 94.33% | **93.39%** | -0.94 pp | High balance |
| **Standard FAR** | 2.80% (7 / 250) | **3.20%** (8 / 250) | +0.40 pp | **PASS** ($\le 18.50\%$ ceiling) |
| **False Rejection Rate (FRR)** | 11.33% (17 / 150) | **12.67%** (19 / 150) | +1.34 pp | Controlled |
| **Supported Recall** | 88.67% (133 / 150) | **87.33%** (131 / 150) | -1.34 pp | Controlled |
| **Refutation Recall** | 95.33% (143 / 150) | **94.67%** (142 / 150) | -0.66 pp | Controlled |
| **NOT_ESTABLISHED Recall** | 99.00% (99 / 100) | **98.00%** (98 / 100) | -1.00 pp | High precision |
| **OOD Recall** | 99.00% (99 / 100) | **98.00%** (98 / 100) | -1.00 pp | Robust |
| **Novel-OOD Recall** | N/A | **N/A** | N/A | Subset absent from dev |
| **Recall@1** | 92.97% | **97.66%** | **+4.69 pp** | **IMPROVED** |
| **Recall@5** | 100.00% | **100.00%** | 0.00 pp | Ceiling maintained |
| **nDCG@5** | 86.12% | **87.55%** | **+1.43 pp** | **IMPROVED** |
| **nDCG@10** | 85.77% | **90.99%** | **+5.22 pp** | **IMPROVED** |

---

## 3. Paired Inferential Statistics ($N = 400$)

- $n_{11} = 370$ (Both correct)
- $n_{00} = 24$ (Both incorrect)
- $n_{01} = 1$ (P1 wins: `DEV-MIX-021` - compound clause restoration)
- $n_{10} = 5$ (P1 regressions: sibling antonym collisions and evidence dilution)
- Discordant count: $n_{01} + n_{10} = 6$ ($1.5\%$ discordance, $98.5\%$ agreement)
- Accuracy Delta: $\Delta = -1.00$ pp
- Continuity-Corrected McNemar: $\chi^2_{\text{cc}} = 1.5000$
- Exact Two-Sided Binomial $p$-value: $p = \mathbf{0.21875}$ (Difference is statistically indistinguishable from zero)
- Paired Standard Error: $\text{SE} = 0.6103$ pp
- 95% Confidence Interval: $[-2.20\text{ pp}, +0.20\text{ pp}]$
- One-Sided 95% LCB: $\mathbf{-2.0039\text{ pp}} > -3.00\text{ pp}$ margin (**Non-inferiority satisfied**)

---

## 4. Auditor Certification & Next Phase Authorization

1. Candidate P1 satisfies all 10 pre-registered development gates (A through J).
2. The blind dataset `EXP-0033-BLIND-DATASET.json` has NOT been inspected, parsed, or accessed for tuning.
3. Candidate P1 is formally certified as **BLIND READY**.
4. In accordance with Section 16 of the experimental protocol, execution halts at this checkpoint until blind evaluation is explicitly authorized.

**Status:** **`PASS — BLIND READY (STOPPING BEFORE BLIND EVALUATION)`**
