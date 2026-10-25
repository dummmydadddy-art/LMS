# EXP-0039: Independent Audit Checkpoint & Scientific Integrity Report

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Current Audited Commit:** `4ba49f5`  
**Parent Commit:** `e1cf1503851a5ff2fc1b3a86897556943878cf13` (EXP-0038 audit checkpoint)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (Audited Commit: `1768832`, UNTOUCHED)  
**Frozen Research Champion Comparator:** EXP-0037 (Accuracy 90.75%, Macro F1 90.70%, FAR 18.50%, FRR 0.00%, Recall@5 100.0%)  
**Verifier Configuration:** Candidate A4 (`rag_ambiguity_guard_verifier.php`, prompt `P4_neutral`, thresholds 0.85/0.80)  
**Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3`, SEALED & UNTOUCHED)  
**Auditor:** Independent Automated Research Integrity Auditor  
**Audit Determination:** **PASS — SCIENTIFICALLY SOUND & BLIND READY**  

---

## 1. Procedural & Experimental Lineage Integrity

| Audit Checkpoint | Requirement | Observed Status | Compliance |
|---|---|---|---|
| **Git Lineage** | Branched from exact completed EXP-0038 audit commit `e1cf1503851a5ff2fc1b3a86897556943878cf13` | Verified via `git log -n 3` | **COMPLIANT** |
| **Production Repo** | `EduConnect-LMS-Production` must remain completely untouched | Zero commits, zero file modifications (HEAD: `1768832`) | **COMPLIANT** |
| **Blind Dataset Integrity** | `EXP-0033-BLIND-DATASET.json` ($N = 500$) must NOT be opened, parsed, or executed | File remains untouched; SHA-256 verified; 0 references in benchmark scripts | **COMPLIANT** |
| **Verifier Code Freeze** | `backend/rag_ambiguity_guard_verifier.php`, `backend/rag_premise_verifier.php`, thresholds, prompts untouched | Unchanged from EXP-0037/EXP-0038 frozen state | **COMPLIANT** |
| **Historical Lineage** | Do NOT overwrite historical tables (`material_chunks_exp0032`, `material_chunks_exp0038_c1`) | Both historical tables preserved in `rag_materials.sqlite3` | **COMPLIANT** |

---

## 2. Gating & Pre-Verification Audit

| Gate | Requirement | Evidence & Verification Result | Compliance |
|---|---|---|---|
| **Token Safety Gate (Section 5)** | Measure sentence token lengths before embedding; split if > 512 tokens | Max sentence length in corpus = 196 tokens; 0 sentences > 512 tokens; 0 tokenizer warnings | **PASS** |
| **Content Preservation Gate (Section 6)** | 100.0% word, character, code, list, and heading coverage against C0 source | Verified 1320/1320 unique words (100.0% coverage, 0 missing words) across all 5 documents for C1 and all C2 grid variants | **PASS** |
| **Hierarchical Context Gate (Section 7)** | Document title and section heading context preserved in chunks | All chunks retain document title, primary heading, and spanned headings in metadata and text prefixes | **PASS** |
| **Database Persistence Gate (Section 8)** | Dedicated SQLite tables created with 384-dim binary embeddings | Tables `C1_ChonkieRecursive` (10), `C2_ChonkieSemantic_075` (69), `C2_ChonkieSemantic_080` (71), `C2_ChonkieSemantic_085` (76) indexed | **PASS** |

---

## 3. Methodological Reporting Correction: EXP-0038 Non-Inferiority

> [!NOTE]
> **Reporting Correction Audit Record:**  
> In EXP-0038 development documentation, it was stated that *"p = 0.0912 > 0.05 therefore non-inferiority is formally established"*.  
> As formally recognized in EXP-0039, a p-value $> 0.05$ in a standard two-sided test merely indicates failure to reject the null hypothesis of equality; it does not demonstrate non-inferiority.  
> In EXP-0039, non-inferiority is established strictly using the pre-registered margin $\Delta_{NI} = -3.00$ percentage points and the one-sided 95% lower confidence bound:
> $$\text{LCB}_{95} = (\hat{p}_C - \hat{p}_0) - 1.645 \cdot \text{SE}_{\text{paired}} > -0.0300$$
> This methodological correction is formally documented in `EXP-0039-STATISTICAL-PLAN.md`, `EXP-0039-DEVELOPMENT-ANALYSIS.md`, and this audit checkpoint without retroactively altering historical EXP-0038 records.

---

## 4. Software & Library Compatibility Audit

- **Chonkie Version:** `1.7.0` (with `chonkie-core==0.10.2` and `tokie==0.1.4`).
- **SemanticChunker Parameter Mapping:**
  - The experimental design called for `mode="window", similarity_window=1, chunk_size=384, min_sentences=1`.
  - In Chonkie 1.7.0, windowed similarity with Savitzky-Golay peak filtering is the native algorithm of `SemanticChunker`, parameterized directly via `similarity_window=1`. Passing `mode="window"` in `kwargs` is fully supported and verified.
- **Pre-registered Grid Compliance:**
  - Only the pre-registered threshold values ($0.75, 0.80, 0.85$) were evaluated. Zero post-hoc hyperparameter tuning or non-registered grid evaluations were performed.

---

## 5. Candidate Selection Verification (7-Level Priority Hierarchy)

1. **Gating Compliance (Level 1):** Verified 100.0% content preservation and zero token safety overflows across all candidates.
2. **Safety Constraint (Level 2):** False Acceptance Rate ceiling $\le 18.50\%$. All candidates compliant: C0 = 2.40%, C1 = 2.40%, C2_075 = 2.80%, C2_080 = 2.80%, C2_085 = 2.80%.
3. **Downstream Accuracy (Level 3):** Candidate `C2_085` achieved joint-highest accuracy (**93.75%**, +1.75 pp over C0) and highest Macro F1 (**94.33%**, +1.56 pp over C0), with highest positive lower confidence bound ($\text{LCB} = +0.39$ pp).
4. **Retrieval Quality (Level 4):** Recall@5 is exactly **100.0%** for `C2_085`.
5. **Semantic Coherence & Boundary Forensics (Level 5):** `C2_085` resolved `DEV-FLS-040` (the context fragmentation issue in C2_075/C2_080), achieving higher Refutation Recall (95.33% vs 94.67%) with only 2 candidate-specific discordant errors vs 9 corrected cases.
6. **Latency (Level 6):** `C2_085` exhibited lowest retrieval latency among semantic chunkers (P50 = 409.2ms).
7. **Simplicity (Level 7):** `C2_085` decisively outperformed C1 RecursiveChunker (93.75% vs 91.00%), confirming that semantic proposition boundaries eliminate sibling bullet contamination.

---

## 6. Audit Determination & Recommendation

- **Integrity Status:** All procedural, scientific, statistical, and code freeze protocols have been adhered to with zero deviations.
- **Audited Champion Recommendation:** Candidate `C2_085` (Chonkie SemanticChunker, threshold = 0.85).
- **Audit Verdict:** **PASS — SCIENTIFICALLY SOUND & BLIND READY.**

