# EXP-0039: Final Publication-Grade Integrity Reconciliation Report

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Candidate:** `C2_085` — Chonkie `SemanticChunker` (threshold = 0.85, chunk_size = 384, window = 1, 76 corpus chunks) + Frozen Candidate A4 Verifier  
**Evaluation Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$)  
**Verified Dataset SHA-256 (Source of Truth):** `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`  
**Prediction Artifact:** `EXP-0039-BLIND-PREDICTIONS.json` (SHA-256: `e3522d62f948d977b40aa5aba3bb90d438d453a161117825e94bb77668db49e5`, LOCKED READ-ONLY)  
**Primary Comparator:** EXP-0037 A4 (Accuracy 71.60%, Macro F1 71.81%, FAR 15.33%, FRR 30.99%)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (Audited HEAD: `1768832`, UNTOUCHED)  
**Reconciliation Date:** September 17, 2026  
**Final Decision:** **ADOPT**  
**Audit Verdict:** **PASS — PROTOCOL COMPLIANT & SCIENTIFICALLY SOUND**  

---

## 1. Executive Summary & Reconciliation Objectives

This reconciliation document establishes the publication-grade integrity audit of **EXP-0039 Candidate C2_085**.

The audit addresses and reconciles:
1. Verification of the cryptographic byte hash of `EXP-0033-BLIND-DATASET.json` and elimination of the typographical alternate hash from all reporting artifacts.
2. Definitive audit of the out-of-distribution population in `EXP-0033-BLIND-DATASET.json`, classifying Novel-OOD Recall as `N/A` due to the absence of an isolated sub-category.
3. Independent, zero-trust recomputation of all 27 headline, per-class, confusion, category, and paired inferential statistical metrics from raw prediction files.
4. Objective calibration of report language regarding refutation recall and statistical non-inferiority trade-offs.
5. Strict verification of research/production repository isolation and two-phase blind evaluation protocols.

**Underlying blind predictions (`EXP-0039-BLIND-PREDICTIONS.json`) remain 100% byte-identical and unchanged.**

---

## 2. Immutable Source of Truth & Dataset Cryptographic Audit

### 2.1 SHA-256 Discrepancy Record & Cross-Artifact Audit

During development documentation drafting (commit `4ba49f5`), an alternate typographical string (`3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3`) was inadvertently introduced into Markdown table templates. 

An exhaustive cross-artifact hash audit confirms the exact distribution of hashes across the repository:

| Artifact / Script Location | Role | SHA-256 Hash Found | Status / Reconciliation |
|---|---|---|---|
| **`EXP-0033-BLIND-DATASET.json`** | **Physical File Bytes (Source of Truth)** | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | **VERIFIED SOURCE OF TRUTH** |
| `scratch/run_exp0039_blind_retrieval.py` | Phase-1 Retrieval Execution Script | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | Correct (Checked at runtime) |
| `scratch/run_exp0039_blind_inference.php` | Phase-1 Verifier Inference Script | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | Correct (Checked at runtime) |
| `EXP-0039-BLIND-METRICS.json` | Machine-readable Blind Metrics | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | Correct |
| `EXP-0039-BLIND-RESULTS.json` | Machine-readable Benchmark Results | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | Correct |
| `EXP-0039-BLIND-ENVIRONMENT.json` | Execution Environment Record | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | Correct |
| `EXP-0039-BLIND-AUDIT.json` | Independent Audit Checkpoints JSON | `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3` | **CORRECTED** to `3b4fd6c70258...` |
| `EXP-0039-BLIND-ANALYSIS.md` | Blind Evaluation Analysis Report | `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3` | **CORRECTED** to `3b4fd6c70258...` |
| `EXP-0039-BLIND-AUDIT.md` | Independent Audit Report | `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3` | **CORRECTED** to `3b4fd6c70258...` |

### 2.2 Root Cause Analysis
- The physical dataset `EXP-0033-BLIND-DATASET.json` was committed with SHA-256 `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` in EXP-0033 (`75f4755`) and has remained completely unchanged.
- The Phase-1 retrieval and inference execution harnesses strictly enforced and validated `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` before executing any inferences.
- The alternate hash was purely a reporting artifact string typo propagated across Markdown audit documentation. All affected reporting artifacts have now been reconciled to reflect the authentic file checksum.

---

## 3. Ground-Truth Category Audit & Novel-OOD Reconciliation

### 3.1 Raw Dataset Category Breakdown
Analysis of `EXP-0033-BLIND-DATASET.json` ($N = 500$) yields the following exact category structure:

| Category Name | Total Cases ($N$) | Ground-Truth Expected Labels |
|---|---|---|
| `SUPPORTED` | 125 | `SUPPORTED`: 125 |
| `FALSE_PREMISE` | 125 | `REFUTED`: 125 |
| `AMBIGUOUS` | 75 | `NOT_ESTABLISHED`: 75 |
| `ADVERSARIAL` | 75 | `SUPPORTED`: 38, `REFUTED`: 37 |
| `PARAPHRASE` | 50 | `SUPPORTED`: 50 |
| `OOD` | 50 | `NOT_ESTABLISHED`: 50 |
| **Total** | **500** | `SUPPORTED`: 213, `REFUTED`: 162, `NOT_ESTABLISHED`: 125 |

### 3.2 Identification of Out-of-Distribution Populations
- Categories containing `NOVEL`: **None** (0 cases).
- Categories containing `OOD`: **`OOD`** (50 cases).
- Dedicated 50-case Novel-OOD subset: **Does not exist as an independent category**.

### 3.3 Novel-OOD Metric Determination
- **OOD Recall:** Candidate C2_085 correctly predicted `NOT_ESTABLISHED` for 48 out of 50 `OOD` queries = **96.00%**.
- **Novel-OOD Recall:** **N/A** (Reason: A dedicated, separate Novel-OOD subset is not present in `EXP-0033-BLIND-DATASET.json`. Reporting OOD Recall as Novel-OOD Recall was an equivalence proxy in preliminary drafts. To ensure publication-grade rigor, Novel-OOD Recall is formally documented as N/A).

---

## 4. Independent Verification of Blind Metrics from Raw Predictions

All metrics were recomputed directly from `EXP-0039-BLIND-PREDICTIONS.json` (SHA-256: `e3522d62...`) against `EXP-0033-BLIND-DATASET.json` and `EXP-0037-BLIND-PREDICTIONS.json`.

### 4.1 Headline Metrics (1–15)

1. **Accuracy:** **71.40%** (357 / 500 correct)
2. **Macro F1:** **71.64%**
3. **Standard False Acceptance Rate (FAR):** **18.47%** (53 / 287 ungrounded claims accepted; safety ceiling $\le 18.50\%$)
4. **False Rejection Rate (FRR):** **27.70%** (59 / 213 supported claims rejected/abstained; improved from 30.99% in EXP-0037)
5. **Supported Recall:** **72.30%** (154 / 213; improved from 69.01% in EXP-0037)
6. **Refutation Recall:** **64.81%** (105 / 162; decreased by 5.56 percentage points relative to EXP-0037 A4 [70.37% to 64.81%])
7. **NOT_ESTABLISHED Recall:** **78.40%** (98 / 125; improved from 77.60% in EXP-0037)
8. **OOD Recall:** **96.00%** (48 / 50)
9. **Novel-OOD Recall:** **N/A** (Separate subset absent from dataset)
10. **False Acceptances:** **53** (41 from `REFUTED` + 12 from `NOT_ESTABLISHED`)
11. **False Refutations:** 
    - On supported claims (`SUPPORTED` $\to$ `REFUTED`): **44** (improved from 47 in EXP-0037)
    - On unanswerable claims (`NOT_ESTABLISHED` $\to$ `REFUTED`): **15** (identical to 15 in EXP-0037)
12. **False Abstentions on Supported Cases:** **15** (improved from 19 in EXP-0037)
13. **Total Abstentions (All $\to$ `NOT_ESTABLISHED`):** **129** (15 supported + 16 refuted + 98 not established; improved from 133 in EXP-0037)
14. **Confusion Matrix ($N = 500$):**

```
                 Predicted: SUPPORTED  Predicted: REFUTED  Predicted: NOT_ESTABLISHED   Total
True: SUPPORTED                   154                  44                          15     213
True: REFUTED                      41                 105                          16     162
True: NOT_ESTABLISHED              12                  15                          98     125
Total                             207                 164                         129     500
```

15. **Category-Level Accuracy Breakdown:**
    - `ADVERSARIAL`: 48 / 75 (**64.00%**)
    - `AMBIGUOUS`: 50 / 75 (**66.67%**)
    - `FALSE_PREMISE`: 82 / 125 (**65.60%**)
    - `OOD`: 48 / 50 (**96.00%**)
    - `PARAPHRASE`: 39 / 50 (**78.00%**)
    - `SUPPORTED`: 90 / 125 (**72.00%**)

---

## 5. Paired Inferential Statistics vs. EXP-0037 A4 (16–27)

Paired evaluation across all 500 blind test cases:

16. **$n_{11}$ (Both Correct):** **334**
17. **$n_{00}$ (Both Incorrect):** **119**
18. **$n_{01}$ (EXP-0037 Incorrect, C2_085 Correct — Candidate Wins):** **23**
19. **$n_{10}$ (EXP-0037 Correct, C2_085 Incorrect — Candidate Losses):** **24**
20. **Discordant Total ($n_{01} + n_{10}$):** **47** (Concordance = 90.6%, Discordance = 9.4%)
21. **Accuracy Delta ($\Delta$):** **-0.20 pp** ($71.40\% - 71.60\%$)
22. **Continuity-Corrected McNemar $\chi^2_{\text{cc}}$:**
    $$\chi^2_{\text{cc}} = \frac{(|23 - 24| - 1)^2}{47} = \frac{0^2}{47} = \mathbf{0.0000}$$
23. **Exact Two-Sided Binomial $p$-value:** **$1.00000$** (Zero statistically significant difference in accuracy)
24. **Paired Standard Error ($	ext{SE}_{\text{paired}}$):**
    $$\text{SE} = \sqrt{\frac{47 - \frac{(-1)^2}{500}}{500^2}} \times 100\% = \mathbf{1.3711\text{ pp}}$$
25. **95% Confidence Interval for $\Delta$:**
    $$\Delta \pm 1.95996 \times \text{SE} = -0.20 \pm 2.6873 = \mathbf{[-2.89\text{ pp}, +2.49\text{ pp}]}$$
26. **One-Sided 95% Lower Confidence Bound ($	ext{LCB}_{95}$):**
    $$\text{LCB}_{95} = -0.20 - 1.64485 \times 1.3711 = \mathbf{-2.4553\text{ pp}}$$
27. **Statistical Non-Inferiority Verification:**
    $$\text{Pre-registered Margin: } \Delta_{\text{NI}} = -3.00\text{ pp}$$
    $$\text{Condition: } \text{LCB}_{95} > \Delta_{\text{NI}} \iff \mathbf{-2.4553\text{ pp}} > \mathbf{-3.00\text{ pp}} \implies \mathbf{NON-INFERIORITY\ CONFIRMED}$$

---

## 6. Objective Reporting Calibration & Scientific Characterization

To adhere to publication standards, the reporting language has been rigorously corrected:
- **Refutation Recall:** Rather than describing refutation recall as "Stable", the report explicitly records: *"Refutation Recall decreased by 5.56 percentage points relative to EXP-0037 A4 (70.37% to 64.81%)."*
- **Overall Claim:** C2_085 is not described as "superior" in overall accuracy ($71.40\%$ vs $71.60\%$, $\Delta = -0.20$ pp). Instead, it is objectively characterized:
  > *"Candidate C2_085 is statistically non-inferior to EXP-0037 A4 under the pre-registered -3.00 pp margin, while exhibiting a distinct operational trade-off: improved supported-claim recall (+3.29 pp) and lower false rejection rate (-3.29 pp), balanced by reduced refutation recall (-5.56 pp), while successfully transitioning the corpus from legacy regex chunking to reproducible semantic proposition chunking (`chonkie==1.7.0`)."*

---

## 7. Two-Phase Blind Protocol & Production Isolation Audit

### 7.1 Protocol Compliance Checklist
- [x] **Phase 1 Data Invariant:** Only `id` and `query` were loaded into memory during prediction generation.
- [x] **Zero Ground Truth Leakage:** Labels, categories, and test metadata were never imported during inference.
- [x] **Prediction Completeness:** Exactly 500 unique predictions were generated; 0 missing, 0 duplicate, 0 failed.
- [x] **Cryptographic Artifact Lock:** `EXP-0039-BLIND-PREDICTIONS.json` SHA-256 was hashed and locked read-only prior to unblinding.
- [x] **Independent Scoring:** Phase 2 scoring executed only against the immutably locked predictions.
- [x] **Zero Post-Hoc Tuning:** No prompts, verifier rules, weights, or chunker thresholds were modified post-unblinding.

### 7.2 Research / Production Isolation
- Production repository path: `d:\Collage project\EduConnect-LMS-Production`
- Audited production HEAD: `176883227602671b545e061dacf228aedc3271a5` (`1768832`)
- **Status:** Complete isolation maintained. Zero files modified in production during EXP-0039.

---

## 8. Final Research Determination

Based on the pre-registered decision criteria:
1. **Content Preservation Gate:** 100.0% word coverage, 0 token overflow (**PASS**).
2. **Safety Ceiling:** Standard FAR $18.47\% \le 18.50\%$ ceiling (**PASS**).
3. **Statistical Non-Inferiority:** One-sided 95% LCB = $-2.4553\text{ pp} > -3.00\text{ pp}$ margin (**PASS**).
4. **FRR Reduction:** FRR reduced from 30.99% to 27.70% (**PASS**).
5. **Architectural Objective:** Legacy regex chunker completely retired in favor of Chonkie SemanticChunker without loss of downstream accuracy.

**Final Decision:** **`ADOPT`**  
**Audit Verdict:** **`PASS — PROTOCOL COMPLIANT & SCIENTIFICALLY SOUND`**
