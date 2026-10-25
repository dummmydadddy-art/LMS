# EXP-0039: Reconciled Independent Audit Checkpoint & Scientific Integrity Report

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Current Audited Commit:** `3376305`  
**Parent Commit:** `e1cf1503851a5ff2fc1b3a86897556943878cf13` (EXP-0038 audit checkpoint)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (Audited Commit: `1768832`, UNTOUCHED)  
**Historical Lineage Predictions:** EXP-0037 and EXP-0038 predictions and artifacts UNTOUCHED  
**Underlying Development Predictions:** `scratch/exp0039_dev_predictions.json` (100% UNCHANGED)  
**Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3`, SEALED, UNREAD, UNTOUCHED)  
**Auditor:** Independent Research Integrity & Statistical Auditor  
**Audit Determination:** **CONDITIONAL PASS — C2_085 BLIND READY AFTER DOCUMENTED REPORT CORRECTIONS**  

---

## 1. Procedural & Experimental Lineage Integrity

| Audit Checkpoint | Requirement | Observed Status | Compliance |
|---|---|---|---|
| **Git Lineage** | Branched from exact completed EXP-0038 audit commit `e1cf1503851a5ff2fc1b3a86897556943878cf13` | Verified via `git log -n 5` | **COMPLIANT** |
| **Production Repo** | `EduConnect-LMS-Production` must remain completely untouched | Zero commits, zero file modifications (HEAD: `1768832`) | **COMPLIANT** |
| **Blind Dataset Isolation** | `EXP-0033-BLIND-DATASET.json` ($N = 500$) must NOT be opened, parsed, embedded, or executed | File remains untouched; SHA-256 verified; 0 references in dev benchmark scripts | **COMPLIANT** |
| **Verifier Code Freeze** | `backend/rag_ambiguity_guard_verifier.php`, `backend/rag_premise_verifier.php`, thresholds, prompts untouched | Unchanged from EXP-0037/EXP-0038 frozen state | **COMPLIANT** |
| **Historical Lineage** | Do NOT overwrite historical tables (`material_chunks_exp0032`, `material_chunks_exp0038_c1`) | Both historical tables preserved in `database/rag_materials.sqlite3` | **COMPLIANT** |
| **Original Artifact Preservation** | Do NOT delete or overwrite original EXP-0039 result artifacts | Original `EXP-0039-*` files preserved intact; reconciliation artifacts created separately | **COMPLIANT** |
| **Prediction Immutability** | No changes to raw predictions or post-hoc threshold tuning | `scratch/exp0039_dev_predictions.json` remains bit-for-bit identical | **COMPLIANT** |

---

## 2. Gating & Content Preservation Audit

| Gate | Requirement | Evidence & Verification Result | Compliance |
|---|---|---|---|
| **Token Safety Gate** | Measure sentence token lengths before embedding; split if > 512 tokens | Max chunk length in C2_085 = 181 tokens; 0 chunks > 512 tokens; 0 tokenizer warnings | **PASS** |
| **Content Preservation Gate** | 100.0% word, character, code, list, and heading coverage against C0 source | Verified 100.00% unique word coverage (0 missing words) across all 5 authentic curriculum documents | **PASS** |
| **Hierarchical Context Gate** | Document title and section heading context preserved in chunks | All chunks retain document title and primary heading context | **PASS** |
| **Database Persistence Gate** | Dedicated SQLite tables created with 384-dim binary embeddings | Tables `C1_ChonkieRecursive` (10), `C2_ChonkieSemantic_075` (69), `C2_ChonkieSemantic_080` (71), `C2_ChonkieSemantic_085` (76) isolated | **PASS** |

---

## 3. Methodological & Reporting Reconciliation Audit

### 3.1 EXP-0037 Comparator Discrepancy
- **Defect:** Original report cited `90.75% Accuracy / 90.70% Macro F1 / 18.50% FAR / 0.00% FRR` as the "EXP-0037 Champion".
- **Audit Verification:** Traced to reporting contamination from EXP-0038 development results on EXP-0025 ($N=400$, where Intervention C1 achieved 90.75% accuracy) and the EXP-0036 safety ceiling (18.50% FAR).
- **Resolution:** Authoritative EXP-0037 blind results ($N=500$, `EXP-0033-BLIND-DATASET.json`) are formally restored:
  - Accuracy: **71.60%** (358 / 500)
  - Macro F1: **71.81%**
  - Standard FAR: **15.33%** (44 / 287)
  - FRR: **30.99%** (66 / 213)
  - Supported Recall: **69.01%**
  - Refutation Recall: **70.37%**
  - NOT_ESTABLISHED Recall: **77.60%**
  - OOD Recall: **94.00%**
  - Novel-OOD Recall: **92.00%**
  - False Acceptances: **44**
  - False Abstentions: **19**
- **Proper Development Baseline:** In the development population ($N=400$, `EXP-0025-DEVELOPMENT-DATASET.json`), the valid baseline is Control C0 (**92.00% Accuracy**, **92.77% Macro F1**).
- **Status:** **RECONCILED & SEPARATED BY POPULATION**.

### 3.2 Retrieval nDCG@5 > 100% Defect
- **Defect:** `scratch/run_exp0039_retrieval_benchmark.py` reported nDCG@5 values up to 212.88%.
- **Audit Verification:** Traced to line 256 of the retrieval script: `idcg = 1.0 / np.log2(2)`. The calculation assumed only 1 relevant chunk existed per query. Under semantic chunking, an average of 5.1 chunks match the query's curriculum rule, causing DCG to sum up to 2.56.
- **Resolution:** Standard bounded nDCG@5 formula implemented: $\text{IDCG}@5 = \sum_{r=1}^{\min(|G|, 5)} \frac{1}{\log_2(r + 1)}$.
  - Recomputed nDCG@5: **C0 = 90.29%**, **C1 = 95.45%**, **C2_075 = 86.09%**, **C2_080 = 86.23%**, **C2_085 = 86.02%**.
  - Bounded strictly within $[0\%, 100\%]$.
  - **Recall@5 remains 100.0%** across all conditions.
- **Status:** **RECONCILED & MATHEMATICALLY VERIFIED**.

### 3.3 Paired Contingency Table Index Inversion
- **Defect:** The previously committed `EXP-0039-DEVELOPMENT-RESULTS.json` labeled $n_{01}$ as "c0 only" and $n_{10}$ as "cand only".
- **Audit Verification:** Standard convention is:
  - $n_{01} = \text{baseline incorrect, candidate correct}$ (Candidate wins).
  - $n_{10} = \text{baseline correct, candidate incorrect}$ (Candidate losses).
  - $\Delta = 100 \times (n_{01} - n_{10}) / 400$.
- **Resolution:** Direct vectorized recomputation from raw predictions confirms:
  - **C1 vs C0:** $n_{01} = 2, n_{10} = 6, \Delta = -1.00\text{ pp}$.
  - **C2_075 vs C0:** $n_{01} = 10, n_{10} = 3, \Delta = +1.75\text{ pp}$.
  - **C2_080 vs C0:** $n_{01} = 9, n_{10} = 3, \Delta = +1.50\text{ pp}$.
  - **C2_085 vs C0:** $n_{01} = 9, n_{10} = 2, \Delta = \mathbf{+1.75\text{ pp}}$.
- **Status:** **RECONCILED & ARITHMETICALLY CONSISTENT**.

### 3.4 Non-Inferiority Verification
- **Audit Verification:** Pre-registered non-inferiority margin is $\Delta_{\text{NI}} = -3.00$ pp.
  - Paired SE for C2_085 vs C0: $0.8245$ pp.
  - One-sided 95% LCB: $\Delta - 1.6448536 \times \text{SE} = +1.75 - 1.3562 = \mathbf{+0.3938\text{ pp}}$.
  - Criterion $\text{LCB} > \Delta_{\text{NI}}$ is strictly satisfied ($\mathbf{+0.39\text{ pp}} > \mathbf{-3.00\text{ pp}}$).
- **Status:** **VERIFIED (NON-INFERIORITY RIGOROUSLY ESTABLISHED)**.

### 3.5 Novel-OOD Development Subset Reporting Clarification
- **Audit Verification:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$) contains an overall `OUT_OF_CURRICULUM_UNKNOWN` category (100 cases, 99.00% recall), but lacks a separate isolated Novel-OOD subset. Conflating OOD with Novel-OOD in the development report was a reporting imprecision.
- **Resolution:** Formally recorded as `Novel-OOD Recall: N/A — separate Novel-OOD subset is not present in EXP-0025-DEVELOPMENT-DATASET.json.` Ordinary development OOD recall remains `99.00% (99/100)`.
- **Status:** **RECONCILED & PRECISELY DOCUMENTED**.

---

## 4. Candidate Selection Re-Audit (7-Level Priority Hierarchy)

1. **Level 1 (Gating Requirements):** 100.0% content preservation, 0 tokenizer overflow errors across all chunks. (**PASS**)
2. **Level 2 (Safety Constraint):** FAR ceiling $\le 18.50\%$. C2_085 achieves **2.80%** (7 / 250). False Abstentions on supported claims = **0**. (**PASS**)
3. **Level 3 (Downstream Accuracy):** Joint-highest accuracy (**93.75%**, +1.75 pp over C0); highest Macro F1 (**94.33%**, +1.56 pp over C0); highest positive 95% LCB (**+0.39 pp**). (**PASS**)
4. **Level 4 (Retrieval Quality):** Recall@5 is exactly **100.0%** (256 / 256). (**PASS**)
5. **Level 5 (Semantic Coherence & Boundary Forensics):** Resolves context fragmentation in C2_075 (`DEV-FLS-040`), achieving higher Refutation Recall (95.33% vs 94.67%); fewest regressions ($n_{10} = 2$). (**PASS**)
6. **Level 6 (Latency):** Lowest retrieval latency among semantic chunkers (P50 = 409.2ms). (**PASS**)
7. **Level 7 (Simplicity):** Threshold 0.85 delivers optimal proposition granularity (76 chunks) without over-segmentation. (**PASS**)

**Determination:**
**C2_085 SELECTION IS FULLY RETAINED.**

---

## 5. Final Audit Determination

- **Lineage Integrity:** STRICT COMPLIANCE (zero unauthorized file modifications, production untouched, blind dataset untouched).
- **Predictions Integrity:** STRICT COMPLIANCE (underlying raw predictions unchanged).
- **Reporting Reconciliation:** FULLY DOCUMENTED & RESOLVED (discrepancy register, corrected metrics, and paired statistics audited).
- **Blind Benchmark Readiness:** System is certified fully ready for frozen blind evaluation.

**Final Audit Verdict:**
`CONDITIONAL PASS — C2_085 BLIND READY AFTER DOCUMENTED REPORT CORRECTIONS`
