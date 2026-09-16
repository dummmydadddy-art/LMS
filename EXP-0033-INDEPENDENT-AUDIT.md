# EXP-0033: Independent Scientific and Statistical Audit Report

**Audit Target:** EXP-0033: Cross-Encoder Score Calibration & Evidence-Gate Adaptation  
**Auditor Role:** Independent Research Auditor  
**Repository:** `EduConnect-LMS-Experimental`  
**Audited Commit:** `75f4755`  
**Parent Lineage Baseline:** `79ef335` (EXP-0032 benchmark commit)  
**Frozen Verifier Baseline:** `01d6220` (EXP-0031 E4 verifier commit)  
**Date of Audit:** 2026-09-16  
**Final Audit Decision:** **CONDITIONAL**  

---

## 1. Executive Verdict

EXP-0033 evaluated whether calibrating `cross-encoder/ms-marco-MiniLM-L-6-v2` relevance scores and adapting the Stage 3 evidence adequacy gate in the frozen EXP-0031 E4 verifier resolves the downstream accuracy collapse observed in EXP-0032.

### Audit Summary:
1. **Mathematical & Statistical Verification:** **100% REPRODUCED AND VERIFIED**. All reported downstream metrics, confusion matrices, class recalls, and McNemar test statistics were independently recomputed directly from the underlying prediction records (`scratch/exp0033_predictions.json`) and matched the reported headline numbers exactly to four decimal places.
2. **Platt Scaling Efficacy:** **PROVABLY SIGNIFICANT RECOVERY OVER UNCALIBRATED R4**. Platt scaling ($a = 0.6236, b = 3.2801$) reduced uncalibrated Mode R4's false abstentions from 98 down to 55 (rescuing 43 claims), lowered False Acceptance Rate (FAR) from 57.28% to 38.97%, and restored accuracy from 51.80% to 62.00% ($+10.20$ percentage points, McNemar $\chi^2 = 30.1205, p = 1.39 \times 10^{-8}$).
3. **Downstream Comparison with Baseline R0:** **STATISTICALLY SIGNIFICANT REGRESSION PERSISTS**. Platt-calibrated Mode R4 (62.00%) did not surpass or match baseline R0 (69.60%). The gap of $-7.60$ percentage points is statistically significant ($n_{01} = 13, n_{10} = 51, \chi^2 = 21.3906, p = 1.88 \times 10^{-6}$).
4. **Causality & Root Cause Distinction:** **PARTIALLY VALIDATED**. The headline claim that "score-scale mismatch was the primary driver of Mode R4 collapse" is only partially supported. While score-scale mismatch caused the 43 false abstentions on borderline queries (logits $[-3.5, -1.0]$), it does **not** explain the remaining 55 false abstentions or the $7.60\%$ performance deficit to R0. That residual gap is driven by an **upstream cross-encoder domain bias**, where MS-MARCO pre-trained MiniLM assigns severe negative logits ($-9.0$ to $-11.5$) to non-lexical, conceptual curriculum assertions. Post-hoc threshold adaptation alone cannot separate these false negatives from true OOD queries.
5. **Leakage & Clean Separation:** **CLEAN**. There was zero query collision between the calibration set and blind set, zero historical collision against 3,600 prior queries, and calibration parameters were frozen prior to blind evaluation.
6. **Hardware & Resource Viability:** **VERIFIED WITH MEMORY WARNING**. The dedicated process RSS of the benchmark components is under 1.5 GB. However, total host system RAM was measured at 15.32 GB / 15.68 GB (97.7%), which represents global system-wide memory load rather than isolated benchmark consumption, posing a paging risk on 16 GB machines if concurrent host processes are active.

---

## 2. Repository and Commit Provenance

All repository assertions were verified via direct git inspection:

- **Git Branch:** `exp-0033`
- **Current HEAD Commit:** `75f475586616428cf1fb5f7fe51ee085c7e0f2d4` (`75f4755`)
- **Parent Commit:** `79ef33568c07ddbe47447d6be3fecda467475f85` (`79ef335`, EXP-0032 final benchmark commit)
- **Frozen Verifier Ancestor:** `01d62208031dbdb4065664ecab58c0c46b5a3297` (`01d6220`, EXP-0031 E4 commit)
- **Commit Verification:**
  - `75f4755` contains the complete EXP-0033 implementation (23 files changed, 123,640 insertions, 2 deletions).
  - The commit message `EXP-0033: calibrate cross-encoder scores and adapt evidence gate` matches the audit log.
  - `git status --porcelain` confirms **ZERO uncommitted EXP-0033 files**.
- **Manifest Integrity Audit:**
  - All 14 files declared in `EXP-0033-MANIFEST.json` exist on disk.
  - Every file was re-hashed independently via SHA-256 and matched the manifest entries exactly to the byte:
    * `EXP-0033-ABLATION-RESULTS.json`: `31b3d27b5ecc...` (24,300 bytes) — **VERIFIED**
    * `EXP-0033-BLIND-DATASET-VALIDATION.md`: `cc5f81582823...` (3,879 bytes) — **VERIFIED**
    * `EXP-0033-BLIND-DATASET.json`: `3b4fd6c70258...` (118,526 bytes) — **VERIFIED**
    * `EXP-0033-CALIBRATION-ANALYSIS.md`: `b82f9c107b42...` (6,762 bytes) — **VERIFIED**
    * `EXP-0033-CALIBRATION-DATASET.json`: `9c487e065b51...` (131,097 bytes) — **VERIFIED**
    * `EXP-0033-DESIGN.md`: `67509e99b59c...` (6,283 bytes) — **VERIFIED**
    * `EXP-0033-ERROR-ANALYSIS.md`: `3c14bc31c0d5...` (7,626 bytes) — **VERIFIED**
    * `EXP-0033-GATE-THRESHOLD-ANALYSIS.md`: `9d570f8ed867...` (6,752 bytes) — **VERIFIED**
    * `EXP-0033-HARDWARE-RESULTS.json`: `c3eecf7f1455...` (1,665 bytes) — **VERIFIED**
    * `EXP-0033-REPRODUCIBILITY.md`: `17bfd46337d4...` (3,996 bytes) — **VERIFIED**
    * `EXP-0033-RESEARCH-REPORT.md`: `2565458127e9...` (10,802 bytes) — **VERIFIED**
    * `EXP-0033-RESULTS.json`: `27d1be08aa0f...` (28,242 bytes) — **VERIFIED**
    * `EXP-0033-SCORE-DISTRIBUTION.md`: `fc2ea7583985...` (6,707 bytes) — **VERIFIED**
    * `EXP-0033-STATISTICAL-ANALYSIS.md`: `de615c08beb3...` (5,840 bytes) — **VERIFIED**

---

## 3. Experimental Lineage Reconstruction

The EXP-0033 artifact graph and execution pipeline was reconstructed from commit `75f4755`:

### Artifact Classification:
- **Source Implementation:**
  - `backend/exp0032_retrieval.php` (added `raw_logit` exposure to chunk dictionaries)
  - `backend/rag_premise_verifier.php` (added `evidence_gate_threshold` runtime option at Stage 3, defaulting to 0.28)
- **Calibration Datasets & Scripts:**
  - `EXP-0033-CALIBRATION-DATASET.json` ($N=432$ candidate pairs from development set)
  - `fit_calibration.py` (L-BFGS-B parameter optimization for C1–C4)
- **Blind Datasets & Validation:**
  - `EXP-0033-BLIND-DATASET.json` ($N=500$ unseen cases)
  - `build_exp0033_blind_dataset.py` (dataset generator script with collision checks)
  - `EXP-0033-BLIND-DATASET-VALIDATION.md` (collision and distribution audit)
- **Benchmark Runner & Caches:**
  - `scratch/run_exp0033_benchmark.php` (main evaluation harness for E0–E6)
  - `scratch/exp0033_retrieval_cache.json` (prefetched R0 and R4 candidate pools and logits)
  - `scratch/exp0033_predictions.json` (per-query predictions across modes)
  - `scratch/exp0033_nli_cache.json` (1,157 cached Tier-2 Ollama NLI responses)
- **Analysis, Telemetry & Documentation:**
  - `EXP-0033-DESIGN.md`, `EXP-0033-SCORE-DISTRIBUTION.md`, `EXP-0033-CALIBRATION-ANALYSIS.md`
  - `EXP-0033-GATE-THRESHOLD-ANALYSIS.md`, `EXP-0033-ERROR-ANALYSIS.md`, `EXP-0033-STATISTICAL-ANALYSIS.md`
  - `EXP-0033-HARDWARE-RESULTS.json`, `EXP-0033-RESULTS.json`, `EXP-0033-ABLATION-RESULTS.json`
  - `EXP-0033-REPRODUCIBILITY.md`, `EXP-0033-RESEARCH-REPORT.md`, `EXP-0033-MANIFEST.json`

### Complete Data Flow:
```
EXP-0025 Development Queries (N=150)
  ↓ (R4 Retrieval via Python Bridge on Port 8100)
Candidate Pairs (N=432: 132 relevant, 300 non-relevant)
  ↓ (fit_calibration.py: L-BFGS-B optimization)
Calibration Models Fitted: C1 (Min-Max), C2 (Sigmoid), C3 (Temp T=2.66), C4 (Platt a=0.62, b=3.28)
  ↓ (Evidence Gate Threshold Sweep on Development Data: θ ∈ [0.15, 0.45])
Parameters Frozen: C4 Platt Scaling & Gate Thresholds θ=0.28 (E1–E5) and θ=0.35 (E6)
  ↓ (Synthesis of Unseen Queries with 0 Historical Overlap)
EXP-0033 Blind Dataset (N=500, SHA-256: 3b4fd6c7...)
  ↓ (scratch/run_exp0033_benchmark.php)
Parallel Evaluation: E0 (R0 Baseline), E1 (Raw Logit), E2 (Min-Max), E3 (Sigmoid), E4 (Temp), E5 (Platt), E6 (Platt+Gate)
  ↓
Final Labels, Confusion Matrices, McNemar Tests & Research Report
```

---

## 4. Calibration Leakage Audit

A strict audit was conducted to verify whether any blind test data leaked into the calibration process:

1. **Query Overlap Audit:**
   - Intersection of query strings between `EXP-0033-CALIBRATION-DATASET.json` and `EXP-0033-BLIND-DATASET.json`: **EXACTLY ZERO (0 collisions)**.
   - Intersection of query strings between `EXP-0025-DEVELOPMENT-DATASET.json` and `EXP-0033-BLIND-DATASET.json`: **EXACTLY ZERO (0 collisions)**.
2. **Template / Near-Duplicate Leakage:**
   - Jaccard token similarity was evaluated between all 500 blind queries and all 400 development queries.
   - Only 4 pairs out of 500 (0.8%) showed similarity $> 0.85$ (e.g., standard phrasing variations for canonical ECMAScript rules such as `Promise.race` settled status). None of these queries had their labels or logits accessed by `fit_calibration.py`.
3. **Document Overlap:**
   - The knowledge base chunks (`database/rag_materials.sqlite3`, 23 chunks) are the fixed curriculum course materials. In closed-domain LMS RAG, the knowledge base is held invariant while queries and claims vary.
4. **Parameter Freezing:**
   - Fitting in `fit_calibration.py` evaluated solely the 432 development pairs.
   - Platt parameters ($a = 0.6236, b = 3.2801$) and threshold choices ($\theta = 0.28, 0.35$) were documented in `EXP-0033-CALIBRATION-ANALYSIS.md` and `EXP-0033-GATE-THRESHOLD-ANALYSIS.md` before blind execution.
5. **Leakage Verdict:** **ZERO TEST-SET LEAKAGE DETECTED**.

---

## 5. Evidence-Gate Audit

The implementation of Stage 3 in `backend/rag_premise_verifier.php` was mapped and analyzed:

### Gate Logic:
```php
$maxSimilarity = 0.0;
foreach ($retrievedChunks as $chunk) {
    $sim = (float)($chunk['similarity'] ?? 0.0);
    if ($sim > $maxSimilarity) $maxSimilarity = $sim;
}
$evidenceGateThreshold = isset($runtimeOptions['evidence_gate_threshold']) ? (float)$runtimeOptions['evidence_gate_threshold'] : 0.28;
if (empty($retrievedChunks) || $maxSimilarity < $evidenceGateThreshold) {
    return [
        'has_presupposition' => true,
        'status' => self::STATUS_NOT_ESTABLISHED,
        'decision_tier' => self::TIER_1,
        'decision_reason' => "Zero or insufficient evidence available in approved curriculum (maxSim < {$evidenceGateThreshold})"
    ];
}
```

### Audit Findings:
1. **The 0.28 Threshold Provenance:** The threshold `0.28` originated in EXP-0026 as the baseline evidence adequacy threshold for `nomic-embed-text` cosine similarities. It was not fitted for cross-encoders. Modes E1 through E5 kept this threshold unchanged, providing an unconfounded test of whether calibration alone rescues false abstentions under the frozen gate.
2. **The 0.35 Threshold in Mode E6:** Threshold `0.35` was derived from the development sweep (`EXP-0033-GATE-THRESHOLD-ANALYSIS.md`), which demonstrated that under Platt scaling, `0.35` provided an additional $0.52$ logit safety margin against distractors while incurring zero additional false abstentions on the development set.
3. **Blind Outcome of E6:** On the blind dataset, Mode E6 achieved 62.00% accuracy, identical to E5 (62.00%), while producing slightly higher false abstentions (59 vs. 55) and higher FAR (40.85% vs. 38.97%). This confirms that $\theta = 0.35$ was not overfitted to produce an artificially inflated blind result.
4. **Other Gate Conditions in Pipeline:**
   - Stage 0: Structural non-existent JS operator check (ECMAScript syntax).
   - Stage 1: Out-of-curriculum external framework regex (Django, Ruby, Flutter, etc.).
   - Line 1365: Candidate evidence filter requiring `overlapCount >= 1 || hasAntonym || hasPredicateNegation || subjectBoost > 0`.
   - Stage 5: NLI Pass 1 threshold ($0.70$) and Pass 2 contradiction threshold ($0.70$).
   - All other thresholds remained frozen from EXP-0031 E4.

---

## 6. Score-Scale Causality Audit

The central causal claim in EXP-0033 is:
> *"Cross-encoder score-scale mismatch with E4's evidence gate was confirmed as the primary driver of Mode R4's downstream collapse in EXP-0032."*

### Scientific Distinction:
1. **Correlation:** In EXP-0032, deploying R4 caused a drop from 65.00% to 58.33% downstream accuracy.
2. **Implementation Mechanism:** The evidence gate dropped any chunk with similarity $< 0.28$. Standard sigmoid mapped logits $x < -0.944$ to $< 0.28$.
3. **Causal Demonstration (Partially Confirmed):**
   - In 43 queries where logits were between $-3.5$ and $-1.0$, applying Platt calibration shifted scores above $0.28$, allowing the verifier to evaluate them correctly.
   - This caused an absolute $+10.20\%$ accuracy recovery ($51.80\% \to 62.00\%$, $p = 3.8 \times 10^{-8}$) and reduced FAR by $18.31\%$.
   - **This proves that score-scale mismatch was indeed the causal mechanism for those 43 cases.**
4. **Causal Non-Sequitur / Boundary Condition (Residual Deficit):**
   - The report implies score-scale mismatch was the *entire* or *primary* cause of the overall deficit relative to R0.
   - However, 55 false abstentions persisted under Platt calibration, and R0 remained significantly superior ($69.60\%$ vs $62.00\%$, $p = 0.000002$).
   - Forensic analysis of the 51 regressions ($n_{10} = 51$) revealed that in 44 cases (86.3%), MiniLM assigned logits between $-7.5$ and $-11.5$ to valid curriculum evidence (e.g. `EXP33-SUP-0020` on "em units": logit $-11.33$; `EXP33-SUP-0010` on "position: relative": logit $-9.13$).
   - Because true OOD queries also have logits between $-9.0$ and $-11.5$, **no monotonic calibration function can rescue these cases without destroying OOD rejection**.
   - Therefore, the remaining $7.60\%$ accuracy deficit to R0 is caused by **upstream cross-encoder domain bias (lack of lexical overlap on conceptual claims in MS-MARCO pre-training)**, NOT gate score-scale mismatch.

---

## 7. Blind Dataset Integrity Audit

Inspection of `EXP-0033-BLIND-DATASET.json` ($N = 500$):

| Property | Target Specification | Actual Measured | Audit Status |
| :--- | :--- | :--- | :--- |
| **Total Cases ($N$)** | Exactly 500 | 500 | **PASS** |
| **Unique Case IDs** | 500 unique | 500 unique | **PASS** |
| **Unique Queries** | 500 unique | 500 unique | **PASS** |
| **Historical Collisions** | 0 against 3,600 prior cases | 0 collisions | **PASS** |
| **Calibration Set Collisions** | 0 against 150 dev queries | 0 collisions | **PASS** |
| **Target Label: SUPPORTED** | 213 (42.60%) | 213 (42.60%) | **PASS** |
| **Target Label: REFUTED** | 162 (32.40%) | 162 (32.40%) | **PASS** |
| **Target Label: NOT_ESTABLISHED** | 125 (25.00%) | 125 (25.00%) | **PASS** |
| **Category: SUPPORTED** | 125 (25.00%) | 125 (25.00%) | **PASS** |
| **Category: FALSE_PREMISE** | 125 (25.00%) | 125 (25.00%) | **PASS** |
| **Category: AMBIGUOUS** | 75 (15.00%) | 75 (15.00%) | **PASS** |
| **Category: OOD (Known/Novel)** | 50 (25 Known / 25 Novel) | 50 (25 Known / 25 Novel) | **PASS** |
| **Category: PARAPHRASE** | 50 (10.00%) | 50 (10.00%) | **PASS** |
| **Category: ADVERSARIAL** | 75 (38 SUP / 37 REF) | 75 (38 SUP / 37 REF) | **PASS** |

The blind dataset is verified as uncompromised and properly constructed.

---

## 8. Independent Metric Recalculation

All metrics were recomputed directly from `scratch/exp0033_predictions.json` across all $N = 500$ test queries:

### Comprehensive Recalculation Table:

| Mode | Metric | Recomputed Value | Reported in Artifacts | Discrepancy | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E0 (Baseline R0)** | Accuracy | **69.60%** (348/500) | 69.60% | 0.00% | **MATCH** |
| | Macro F1 | **68.58%** | 68.58% | 0.00% | **MATCH** |
| | FAR | **23.00%** (49/213) | 23.00% | 0.00% | **MATCH** |
| | FRR | **14.55%** (31/213) | 14.55% | 0.00% | **MATCH** |
| | Supported Recall | **77.00%** (164/213) | 77.00% | 0.00% | **MATCH** |
| | Refutation Recall | **56.79%** (92/162) | 56.79% | 0.00% | **MATCH** |
| | NE Recall | **73.60%** (92/125) | 73.60% | 0.00% | **MATCH** |
| | False Abstentions | **18** | 18 | 0 | **MATCH** |
| | Novel-OOD Accuracy | **88.00%** (22/25) | 88.00% | 0.00% | **MATCH** |
| **E3 (Raw Sigmoid)** | Accuracy | **51.80%** (259/500) | 51.80% | 0.00% | **MATCH** |
| | Macro F1 | **50.73%** | 50.73% | 0.00% | **MATCH** |
| | FAR | **57.28%** (122/213) | 57.28% | 0.00% | **MATCH** |
| | FRR | **11.27%** (24/213) | 11.27% | 0.00% | **MATCH** |
| | Supported Recall | **42.72%** (91/213) | 42.72% | 0.00% | **MATCH** |
| | Refutation Recall | **30.86%** (50/162) | 30.86% | 0.00% | **MATCH** |
| | NE Recall | **94.40%** (118/125) | 94.40% | 0.00% | **MATCH** |
| | False Abstentions | **98** | 98 | 0 | **MATCH** |
| | Novel-OOD Accuracy | **100.00%** (25/25) | 100.00% | 0.00% | **MATCH** |
| **E5 (Platt Scaling)**| Accuracy | **62.00%** (310/500) | 62.00% | 0.00% | **MATCH** |
| | Macro F1 | **61.38%** | 61.38% | 0.00% | **MATCH** |
| | FAR | **38.97%** (83/213) | 38.97% | 0.00% | **MATCH** |
| | FRR | **13.15%** (28/213) | 13.15% | 0.00% | **MATCH** |
| | Supported Recall | **61.03%** (130/213) | 61.03% | 0.00% | **MATCH** |
| | Refutation Recall | **48.15%** (78/162) | 48.15% | 0.00% | **MATCH** |
| | NE Recall | **81.60%** (102/125) | 81.60% | 0.00% | **MATCH** |
| | False Abstentions | **55** | 55 | 0 | **MATCH** |
| | Novel-OOD Accuracy | **92.00%** (23/25) | 92.00% | 0.00% | **MATCH** |
| **E6 (Platt + Gate 0.35)**| Accuracy | **62.00%** (310/500) | 62.00% | 0.00% | **MATCH** |
| | Macro F1 | **61.47%** | 61.47% | 0.00% | **MATCH** |
| | FAR | **40.85%** (87/213) | 40.85% | 0.00% | **MATCH** |
| | FRR | **13.15%** (28/213) | 13.15% | 0.00% | **MATCH** |
| | Supported Recall | **59.15%** (126/213) | 59.15% | 0.00% | **MATCH** |
| | Refutation Recall | **48.15%** (78/162) | 48.15% | 0.00% | **MATCH** |
| | NE Recall | **84.80%** (106/125) | 84.80% | 0.00% | **MATCH** |
| | False Abstentions | **59** | 59 | 0 | **MATCH** |
| | Novel-OOD Accuracy | **92.00%** (23/25) | 92.00% | 0.00% | **MATCH** |

### Confusion Matrices:
- **E0 (Baseline R0):**
  - SUPPORTED: [164 SUP, 31 REF, 18 NE]
  - REFUTED: [11 SUP, 92 REF, 59 NE]
  - NOT_ESTABLISHED: [15 SUP, 18 REF, 92 NE]
- **E3 (Raw Sigmoid R4):**
  - SUPPORTED: [91 SUP, 24 REF, 98 NE]
  - REFUTED: [4 SUP, 50 REF, 108 NE]
  - NOT_ESTABLISHED: [1 SUP, 6 REF, 118 NE]
- **E5 (Platt Calibrated R4):**
  - SUPPORTED: [130 SUP, 28 REF, 55 NE]
  - REFUTED: [8 SUP, 78 REF, 76 NE]
  - NOT_ESTABLISHED: [7 SUP, 16 REF, 102 NE]

Every single reported count and percentage is confirmed exact.

---

## 9. Statistical Verification

Independent recomputation of paired discordance and statistical hypothesis tests:

### Statistical Test Recalculation Table:

| Comparison | $n_{00}$ | $n_{11}$ | $n_{01}$ (A wrong, B right) | $n_{10}$ (A right, B wrong) | Edwards $\chi^2$ (Recomputed) | Edwards $\chi^2$ (Reported) | Exact Binomial $p$ (Recomputed) | Reported $p$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E3 vs. E5** (Sigmoid vs Platt) | 174 | 243 | **67** | **16** | **30.1205** | 30.1205 | **$1.39 \times 10^{-8}$** | $0.000000$ |
| **E3 vs. E6** (Sigmoid vs Platt+Gate) | 178 | 247 | **63** | **12** | **33.3333** | 33.3333 | **$1.69 \times 10^{-9}$** | $0.000000$ |
| **E0 vs. E5** (R0 vs Platt) | 139 | 297 | **13** | **51** | **21.3906** | 21.3906 | **$1.88 \times 10^{-6}$** | $0.000002$ |
| **E0 vs. E6** (R0 vs Platt+Gate) | 136 | 294 | **16** | **54** | **19.5571** | 19.5571 | **$5.85 \times 10^{-6}$** | $0.000005$ |
| **E1 vs. E5** (Logit vs Platt) | 171 | 222 | **88** | **19** | **43.2150** | 43.2150 | **$4.89 \times 10^{-11}$** | $0.000000$ |
| **E4 vs. E5** (Temp vs Platt) | 175 | 265 | **45** | **15** | **14.0167** | 14.0167 | **$9.13 \times 10^{-5}$** | $0.000091$ |

### Scientific Evaluation:
- **E3 $\to$ E5 Recovery:** Overwhelmingly significant ($p = 1.39 \times 10^{-8}$, ratio 4.19 : 1). The claim that Platt calibration meaningfully and substantially improves Mode R4 is statistically rock-solid.
- **E0 $\to$ E5 Regression:** Statistically significant ($p = 1.88 \times 10^{-6}$, ratio 3.92 : 1 in favor of R0). The claim that R0 remains superior downstream is statistically confirmed.

---

## 10. Rescue and Regression Forensics

Detailed tracking of the paired transitions:

### 10.1 The 67 Rescued Cases ($E3 \to E5$):
- **SUPPORTED:** 23 cases rescued
- **FALSE_PREMISE:** 23 cases rescued
- **ADVERSARIAL:** 13 cases rescued
- **PARAPHRASE:** 8 cases rescued
- **Archetype:** Queries with raw logits in $[-3.5, -1.0]$. In E3, standard sigmoid produced similarity $\in [0.03, 0.27] < 0.28$, prematurely killing the query. Platt scaling mapped these logits to $[0.75, 0.93] \ge 0.28$, allowing Tier-1 opposite matching or Tier-2 NLI to execute successfully.

### 10.2 The 51 Regressions ($E0 \to E5$):
- **Error Type Breakdown:**
  - `SUPPORTED -> NOT_ESTABLISHED`: **34 cases** (66.7%)
  - `REFUTED -> NOT_ESTABLISHED`: **15 cases** (29.4%)
  - `NOT_ESTABLISHED -> REFUTED`: **2 cases** (3.9%)
- **Mechanism Breakdown:**
  - **44 cases (86.3%)** fell below the 0.28 gate ($e5\_sim < 0.28$) due to extreme negative logits ($-7.5$ to $-11.5$) from MiniLM on non-lexical claims (e.g. `EXP33-SUP-0020` on "em units" had logit $-11.33$; `EXP33-SUP-0010` on "position: relative" had logit $-9.13$). In contrast, nomic dense embeddings in R0 scored these chunks at $0.50 - 0.60$.
  - **7 cases (13.7%)** failed because BGE-small dense retrieval did not include the gold chunk in the top-10 candidate pool sent to MiniLM.

---

## 11. Hardware and Resource Audit

### Measurements Audit:
- **Reported Hardware Metrics:**
  - GPU VRAM: 2321 MB / 4096 MB (56.6%)
  - System RAM: 15.32 GB / 15.68 GB (97.7%)
  - Retrieval p50: 431.43 ms, p95: 499.16 ms
  - Calibration Overhead: ~6.20 $\mu$s
  - Verifier p50: 16.55 ms

### Critical Audit Finding on RAM:
- The reported RAM figure ($15.32$ GB / $97.7\%$) represents **HOST SYSTEM-WIDE COMMITTED MEMORY** including Windows OS, background services, Antigravity IDE, and browser processes.
- Independent process RSS audit (`scratch/audit_process_memory.py`) reveals:
  - Python bridge (BGE-small + MiniLM on CPU): ~600–800 MB during active inference.
  - Ollama LLM (`llama3.2:latest` on GPU): ~20–50 MB CPU RSS + 2.32 GB GPU VRAM.
  - PHP evaluation harness: ~50–100 MB RSS.
  - **Total dedicated benchmark component footprint: $< 1.5$ GB RAM.**
- **Operational Risk Assessment:** While the models themselves easily fit in memory, executing the suite on a 16 GB laptop when other heavy host applications are open will push physical RAM usage to $98\%$, risking page-fault paging and latency spikes. The documentation should explicitly note that background host applications must be closed during benchmarking.

---

## 12. Reproducibility Audit

### Reproducibility Risk Matrix:

| Issue | Severity | Evidence in Repository | Reproduction Impact |
| :--- | :--- | :--- | :--- |
| **Pre-computed Retrieval & NLI Caches** | Low (Positive) | `scratch/exp0033_retrieval_cache.json` & `exp0033_nli_cache.json` committed to git | Enables fast, 100% deterministic re-evaluation of E0–E6 in ~15 seconds without calling Ollama. |
| **Windows DLL Conflict (Torch/MKL)** | Medium | `retrieval_bridge.py` requires `KMP_DUPLICATE_LIB_OK=TRUE` and importing `pyarrow` before `torch` | Linux reproductions unaffected; Windows reproductions will crash with access violation if modified. |
| **System RAM Headroom** | Medium | System committed RAM reached 15.32 GB (97.7%) | Machines with exactly 16 GB RAM require closing browsers/IDEs to avoid paging. |
| **Model Weight Freezing** | Low (Positive) | BGE, MiniLM, and LLaMA 3.2 are locked by exact identifiers | High fidelity across sentence-transformers versions. |
| **Port Conflicts** | Low | Hardcoded to ports 8100 and 11434 | If port 8100 is occupied, reproduction requires changing port flag. |

Overall reproducibility rating: **HIGH (Fully reproducible from committed artifacts and scripts)**.

---

## 13. Scientific Wording Audit

Three statements in `EXP-0033-RESEARCH-REPORT.md` and related documentation were flagged as scientifically imprecise or overstated:

### Problematic Statement 1:
> *"Cross-encoder score-scale mismatch with E4's evidence gate was confirmed as the primary driver of Mode R4's downstream collapse in EXP-0032."*
- **Why It Is Problematic:** Score-scale mismatch only explains the 43 false abstentions on borderline queries ($[-3.5, -1.0]$). It does **not** explain the remaining 55 false abstentions or the $7.60\%$ deficit relative to R0, which are caused by MiniLM's negative logit bias on non-lexical claims. Calling it the "primary driver" of the entire collapse overstates the causal reach of calibration.
- **Scientifically Defensible Replacement:**
  > *"Score-scale mismatch with E4's evidence gate was confirmed as a major contributing mechanism for the false abstentions observed in EXP-0032, accounting for approximately 44% of false abstentions on borderline queries. However, the residual performance gap between Mode R4 and baseline R0 is driven by cross-encoder lexical bias on conceptual curriculum assertions."*

### Problematic Statement 2:
> *"Platt scaling achieved a dramatic, statistically significant recovery over uncalibrated Mode R4"*
- **Why It Is Problematic:** "Dramatic" is hyperbolic and non-neutral scientific prose.
- **Scientifically Defensible Replacement:**
  > *"Platt scaling achieved a statistically significant and practically substantial recovery over uncalibrated Mode R4 (+10.20 percentage points in accuracy, p = 3.8e-8)."*

### Problematic Statement 3:
> *"Mode R4 outperformed baseline R0 across all retrieval metrics"*
- **Why It Is Problematic:** While technically accurate for isolated retrieval ranking (Recall@1/3/5, MRR, nDCG@5), stating this without immediately emphasizing the downstream verifier regression risks misleading readers into believing R4 is superior overall.
- **Scientifically Defensible Replacement:**
  > *"While Mode R4 achieved higher isolated retrieval ranking metrics (Recall@1 of 90.89% vs 89.33%) and stronger OOD filtering (6.00% vs 34.00% contamination) than baseline R0, this did not translate to downstream premise verification superiority."*

---

## 14. EXP-0034 Readiness Assessment

EXP-0033 proposes investigating:
$$S_{\text{final}} = \alpha \cdot S_{\text{dense}} + (1 - \alpha) \cdot P_{\text{Platt}}$$
combined with candidate pool expansion from 10 to 15.

### Readiness Evaluation:
1. **Is dense score fusion motivated by evidence?**
   **YES.** The forensic error analysis proved that nomic dense embeddings successfully assigned high similarity ($0.50 - 0.60$) to non-lexical conceptual queries (`EXP33-SUP-0020`, `EXP33-SUP-0010`), whereas MiniLM cross-encoder assigned severe negative logits ($-9.0$ to $-11.5$). Dense score fusion directly addresses this diagnosed weakness.
2. **Is candidate pool expansion (10 $\to$ 15) motivated?**
   **YES.** 13.7% of the regressions (7 / 51 cases) occurred because BGE-small dense retrieval did not include the gold chunk in the top-10 candidate pool sent to MiniLM. Expanding the candidate pool to 15 directly mitigates candidate truncation.
3. **Does fusion create a new calibration challenge?**
   **CRITICAL WARNING: YES.** Dense cosine similarities typically range in $[0.30, 0.85]$, whereas Platt probabilities range in $[0.02, 0.99]$. Blending them creates a new hybrid distribution that cannot blindly use the old $0.28$ or $0.35$ gate.
4. **Mandatory Protocol Constraints for EXP-0034:**
   - The fusion weight $\alpha$ and the blended gate threshold $\theta_{\text{blended}}$ MUST be jointly tuned on the independent development dataset (`EXP-0025-DEVELOPMENT-DATASET.json`), NEVER on the blind dataset.
   - All parameters ($\alpha$, $\theta_{\text{blended}}$, pool size 15) must be frozen before blind testing.
   - Success criteria: Downstream accuracy must achieve statistical parity with baseline R0 ($p > 0.05$ on McNemar test) while preserving FAR $\le 25.0\%$ and Novel-OOD rejection $\ge 90.0\%$.

---

## 15. Final Decision

In accordance with the audit protocol:

```text
FINAL DECISION: CONDITIONAL
```

### Justification:
The experiment is mathematically rigorous, fully reproducible, and successfully demonstrates that cross-encoder score calibration cures a major portion of the downstream false-abstention problem ($+10.20\%$ accuracy, $p = 3.8 \times 10^{-8}$). However, it is classified as **CONDITIONAL** (rather than PASS) because:
1. Downstream accuracy remains statistically inferior to baseline R0 (62.00% vs. 69.60%, $p = 0.000002$).
2. The causal narrative in the research report overattributed the entire R4 deficit to gate score-scale mismatch, obscuring the upstream cross-encoder lexical bias that accounts for the remaining 55 false abstentions.
3. Host system RAM consumption reached 97.7%, requiring operational caveats for 16 GB hardware environments.

---

### GO / NO-GO FOR EXP-0034

```text
GO
```

**Evidence-Based Reasons:**
1. **The Root Cause is Conclusively Isolated:** EXP-0033 proved that post-hoc threshold calibration has reached its mathematical limit (both $\theta=0.28$ and $\theta=0.35$ produce identical 62.00% accuracy). The remaining bottleneck is confirmed to be upstream lexical bias and candidate pool truncation.
2. **Dense Fusion is Empirically Motivated:** Nomic dense embeddings successfully captured the 44 conceptual queries that MiniLM missed, providing a clear mathematical rationale for ensembling dense conceptual scores with cross-encoder precision scores.
3. **Candidate Pool Truncation is Proven:** 13.7% of regressions were confirmed as upstream pool misses, directly validating the expansion from 10 to 15 candidates.
4. **Hardware Budget Permissible:** Retrieval latency (431 ms) and dedicated component RAM ($< 1.5$ GB) leave sufficient headroom on the RTX 3050 / i5-12450H envelope to support candidate pool expansion and linear score blending.
5. **Clear Success Criteria Established:** The failure of E5 to beat R0 establishes an unambiguous scientific target for EXP-0034: non-inferiority to R0 downstream accuracy ($69.60\%$) with FAR $\le 25.0\%$.

---

### Repository State at Audit Completion
- **Current HEAD Commit:** `75f475586616428cf1fb5f7fe51ee085c7e0f2d4` (`75f4755`)
- **Tracked Repository Status:** Clean (zero uncommitted changes to existing tracked files).
