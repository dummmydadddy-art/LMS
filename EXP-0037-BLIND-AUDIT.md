# EXP-0037: Independent Blind Evaluation Audit Report

**Experiment:** EXP-0037 (Controlled Ambiguity Mitigation Experiment)  
**Evaluator / Auditor:** Independent Scientific Audit Framework  
**Date of Audit:** 2026-09-17  
**Branch:** `exp-0037`  
**Audited Commit:** `4cd5b372feb13ac37fd160bf5865dfc0cb141817`  
**Parent Commit:** `d8c1ed3c89b33a5f8be7808383a8b417e0b2eb3f` (EXP-0036 Frozen HEAD)  
**Evaluated Artifacts:**
* Blind Dataset: `EXP-0033-BLIND-DATASET.json` ($N = 500$)
* Blind Predictions: `EXP-0037-BLIND-PREDICTIONS.json`
* Scored Results: `EXP-0037-BLIND-RESULTS.json`
* Metrics Summary: `EXP-0037-BLIND-METRICS.json`
* Forensics Registry: `EXP-0037-BLIND-FORENSICS.json`
* System Telemetry: `EXP-0037-BLIND-ENVIRONMENT.json`

**Formal Audit Verdict:** **PASS — PROTOCOL FULLY COMPLIANT — DECISION: ADOPT**

---

## 1. Procedural and Scientific Integrity Verification

### 1.1 Dataset Hash Invariance
* **Expected Dataset SHA-256:** `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`
* **Measured Dataset SHA-256:** `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`
* **Status:** **VERIFIED (Bit-for-bit identical)**

### 1.2 Two-Phase Blind Execution Protocol
* **Phase 1 Isolation:** The benchmark harness (`scratch/run_exp0037_blind_benchmark.php`) read strictly the `id` and `query` attributes of each case during prediction generation. Ground-truth attributes (`expected`, `category`, `sub_category`, `module`) were inaccessible to the inference loop.
* **Prediction Generation Integrity:**
  * Total cases processed: 500 / 500
  * Duplicate case IDs: 0
  * Missing predictions: 0
  * Runtime exceptions / fallback defaults: 0
* **Immutable Prediction Hash Lock:**
  * File: `EXP-0037-BLIND-PREDICTIONS.json`
  * SHA-256: `bfa8ed1f95a73134a33bb99be674e68b307496fd152d5a35496f756a04a32c6f`
  * Verified: Wrote to disk and hashed before Phase 2 unblinding logic was triggered.
* **Phase 2 Unblinding:** Scoring, categorization, paired McNemar calculations, and forensics extraction occurred strictly downstream of prediction persistence.

### 1.3 Repository & Codebase Invariance
* **Active Branch:** `exp-0037` (HEAD: `4cd5b37`)
* **Core Code Files:**
  * `backend/rag_ambiguity_guard_verifier.php` — Clean, zero modifications during blind execution.
  * `backend/rag_structured_nli_verifier.php` — Clean, zero modifications.
  * `backend/rag_premise_verifier.php` — Clean, zero modifications.
  * `backend/rag_intent_clause_verifier.php` — Clean, zero modifications.
* **Production Repository (`EduConnect-LMS-Production`):**
  * Path: `d:\Collage project\EduConnect-LMS-Production`
  * Commit: `1768832`
  * Working tree: Untouched and clean.

---

## 2. Independent Mathematical and Metric Audit

The auditor independently recalculated all summary and paired inferential statistics directly from `EXP-0037-BLIND-PREDICTIONS.json` and `EXP-0033-BLIND-DATASET.json`:

### 2.1 Confusion Matrix Verification
```
                     Predicted: SUPPORTED   REFUTED   NOT_ESTABLISHED   Total
True: SUPPORTED              147          47                19           213
      REFUTED                 31         114                17           162
      NOT_ESTABLISHED         13          15                97           125
Total                        191         176               133           500
```
* **True Positives ($TP$):** $147 + 114 + 97 = 358$
* **Accuracy:** $\frac{358}{500} = \mathbf{71.60\%}$ (Verified)

### 2.2 Class Metrics Verification
* **SUPPORTED:**
  * Precision: $\frac{147}{191} = 76.963\% \to \mathbf{76.96\%}$
  * Recall: $\frac{147}{213} = 69.014\% \to \mathbf{69.01\%}$
  * F1: $\frac{2 \times 76.963 \times 69.014}{76.963 + 69.014} = \mathbf{72.77\%}$
* **REFUTED:**
  * Precision: $\frac{114}{176} = 64.773\% \to \mathbf{64.77\%}$
  * Recall: $\frac{114}{162} = 70.370\% \to \mathbf{70.37\%}$
  * F1: $\frac{2 \times 64.773 \times 70.370}{64.773 + 70.370} = \mathbf{67.46\%}$
* **NOT_ESTABLISHED:**
  * Precision: $\frac{97}{133} = 72.932\% \to \mathbf{72.93\%}$
  * Recall: $\frac{97}{125} = 77.600\% \to \mathbf{77.60\%}$
  * F1: $\frac{2 \times 72.932 \times 77.600}{72.932 + 77.600} = \mathbf{75.19\%}$
* **Macro F1:** $\frac{72.77 + 67.46 + 75.19}{3} = \mathbf{71.81\%}$ (Verified)

### 2.3 Operational Risk Metrics Verification
* **Non-Supported Ground Truth Total:** $162\ (\text{REF}) + 125\ (\text{NE}) = 287$
* **False Acceptances ($FA$):** $31\ (\text{REF}\to\text{SUP}) + 13\ (\text{NE}\to\text{SUP}) = 44$
* **Standard FAR:** $\frac{44}{287} = \mathbf{15.33\%}$ (Verified; comfortably meets $\le 18.50\%$ threshold)
* **Supported Ground Truth Total:** $213$
* **False Rejections ($FR$):** $47\ (\text{SUP}\to\text{REF}) + 19\ (\text{SUP}\to\text{NE}) = 66$
* **False Rejection Rate ($FRR$):** $\frac{66}{213} = \mathbf{30.99\%}$ (Verified)

---

## 3. Paired Inferential Test Audit

### 3.1 Candidate A4 vs EXP-0036 N7
* $n_{11} = 340$, $n_{00} = 139$
* $n_{01}$ (N7 wrong, A4 right) $= 18$
* $n_{10}$ (N7 right, A4 wrong) $= 3$
* Total discordant cases: $18 + 3 = 21$
* Continuity-corrected McNemar Statistic:
  $$\chi^2 = \frac{(|18 - 3| - 1)^2}{21} = \frac{14^2}{21} = \frac{196}{21} \approx 9.3333$$
* $p$-value: $p = 0.002250$ ($p < 0.01$)
* **Audit Verdict:** The superior accuracy of Candidate A4 over EXP-0036 N7 is statistically established with extreme rigor.

### 3.2 Candidate A4 vs EXP-0035 M2
* $n_{11} = 297$, $n_{00} = 105$
* $n_{01}$ (M2 wrong, A4 right) $= 61$
* $n_{10}$ (M2 right, A4 wrong) $= 37$
* Total discordant cases: $61 + 37 = 98$
* Continuity-corrected McNemar Statistic:
  $$\chi^2 = \frac{(|61 - 37| - 1)^2}{98} = \frac{23^2}{98} = \frac{529}{98} \approx 5.3980$$
* $p$-value: $p = 0.020160$ ($p < 0.05$)
* **Audit Verdict:** Significant outperformance over the clean baseline M2 is confirmed.

### 3.3 Non-Inferiority vs EXP-0031 R0
* $\Delta = +2.00$ pp ($71.60\% - 69.60\%$)
* Discordant: $n_{01} = 63$, $n_{10} = 53$ ($N_{disc} = 116$)
* Variance: $\text{Var}(\Delta) = \frac{116 - (10)^2 / 500}{250000} = \frac{115.8}{250000} = 0.0004632$
* $\text{SE} = \sqrt{0.0004632} \times 100 = 2.1522$ pp
* 1-Sided 95% LCB: $+2.00 - (1.644853 \times 2.1522) = +2.00 - 3.5401 = \mathbf{-1.54\text{ pp}}$
* Pre-registered non-inferiority margin: $\Delta_{NI} = -3.00$ pp
* Condition: $-1.54\text{ pp} > -3.00\text{ pp}$
* **Audit Verdict:** Non-inferiority is firmly established. In addition, the point estimate exceeds R0 by $+2.00$ pp.

---

## 4. Pre-Registered Decision Rule Compliance

The pre-registered criteria from `EXP-0037-STATISTICAL-PLAN.md` require:

1. **Standard FAR $\le 18.50\%$:** Measured $15.33\%$ $\to$ **SATISFIED**
2. **Accuracy $> 66.80\%$ ($p < 0.05$ vs M2):** Measured $71.60\%$ ($p = 0.020$) $\to$ **SATISFIED**
3. **Non-inferior to R0 (LCB $> -3.00$ pp):** Measured $-1.54$ pp $\to$ **SATISFIED**
4. **Refutation Recall $\ge 65.00\%$:** Measured $70.37\%$ $\to$ **SATISFIED**
5. **OOD Recall $\ge 90.00\%$:** Measured $94.00\%$ $\to$ **SATISFIED**

Because every condition for unconditional adoption is satisfied, the formal decision is:

$$\mathbf{FINAL\ DECISION:\ ADOPT}$$

---

## 5. Auditor Sign-Off

The blind evaluation of EXP-0037 has been conducted in complete adherence to strict zero-leakage, frozen-candidate protocols. No anomalies, data leakage, or procedural infractions were detected.

**Audit Status:** **OFFICIALLY PASSED AND APPROVED FOR PRODUCTION ADOPTION.**
