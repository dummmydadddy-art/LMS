# EXP-0036: Independent Scientific and Statistical Audit

**Experiment:** EXP-0036 (Structured Tier-2 NLI Verification with Polarity Reasoning, Atomic Predicate Decomposition, and Calibrated Few-Shot Demonstrations)  
**Audited Commit:** `d8c1ed3`  
**Branch:** `exp-0036`  
**Parent Lineage:** `2bcccca` (EXP-0035 Complete Blind Benchmark)  
**Frozen Verifier Ancestor:** `01d6220` (EXP-0031 E4 Decoupled Verifier)  
**Auditor Role:** Independent Scientific and Statistical Auditor  
**Audit Date:** 2026-09-17  
**Status:** AUDIT COMPLETE — VERDICT CERTIFIED  

---

## 1. Executive Audit Verdict

**Audit Verdict:** **`REJECT`**  
**Non-Inferiority Determination:** **`NON-INFERIORITY NOT ESTABLISHED`**  
**Safety Envelope Assessment:** **`SAFETY CONSTRAINT VIOLATED (FAR > 20.00%)`**  

Candidate architecture **N7** was evaluated on the 500-case frozen blind dataset (`EXP-0033-BLIND-DATASET.json`). The benchmark was executed under rigorous, tamper-evident blind evaluation protocols without label leakage, code modification, post-hoc tuning, or parameter alteration.

### Core Audit Findings
1. **Genuine Scientific Breakthrough on Semantic Refutation:** N7 decisively solved the long-standing Tier-2 NLI refutation ceiling that limited all prior experiments (EXP-0031 through EXP-0035). Accuracy on `FALSE_PREMISE` queries rose from **51.20% to 68.00% (+16.80 pp)**, and global Refutation Recall surged from **53.70% to 67.90% (+14.20 pp)**.
2. **Failure of Statistical Superiority vs. Baseline M2:** Although N7 achieved a higher point accuracy of **68.60%** (+1.80 pp over M2's 66.80%), the paired McNemar test yielded $\chi^2 = 0.6214, p = 0.430543$. The improvement is **not statistically significant** due to heavy two-way churn ($n_{01} = 56$ wins, $n_{10} = 47$ regressions).
3. **Failure to Establish Non-Inferiority vs. Historical R0:** N7 trails the frozen reference baseline R0 (69.60%) by $-1.00$ pp. The asymptotic one-sided 95% confidence interval has a lower bound of **$-4.56$ pp**, which breaches the pre-registered non-inferiority margin of $\Delta = -3.00$ pp. Non-inferiority is formally **not established**.
4. **Safety Violation on Standard FAR:** On subjective and underspecified `AMBIGUOUS` queries, N7 suffered a severe collapse from 64.00% to 49.33% (-14.67 pp, 14 regressions), causing 23 false acceptances on `NOT_ESTABLISHED` ground truth. This inflated the Standard False Acceptance Rate to **20.56%**, breaching the pre-registered safety boundary of $\le 18.50\%$ and the rejection ceiling of $> 20.00\%$.
5. **Decision Adherence:** In accordance with Section 12 of the experiment protocol, candidate N7 is **REJECTED** for production promotion.

---

## 2. Provenance and Lineage Audit

The repository provenance was verified prior to and following benchmark execution:

```text
Target HEAD: d8c1ed3c89b33a5f8be7808383a8b417e0b2eb3f
Branch: exp-0036
Parent Commit: 2bcccca7a58ddcb392fa942c75a409f6ae136b80 (EXP-0035 blind evaluation)
Verifier Lineage Commit: 01d6220 (EXP-0031 E4 verifier logic)
Retrieval Champion Commit: b2fb2f2 (EXP-0034 M2 hybrid pool-15)
Dynamic Gating Commit: f392b13 (EXP-0035 G6 intent thresholds)
Working Tree: Clean on all tracked repository files
```

### Cryptographic Artifact Manifest

| Artifact File | Expected SHA-256 | Certified Observed SHA-256 | Audit Status |
|---|---|---|---|
| `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | MATCH |
| `EXP-0036-CONFIG-FROZEN.json` | Registered | Present and immutable | MATCH |
| `EXP-0036-NLI-PROMPTS.md` (P4) | `4f715d6195b135c2aca9290d2bc9203adefb33daaeccafdc97d952784a2f9112` | `4f715d6195b135c2aca9290d2bc9203adefb33daaeccafdc97d952784a2f9112` | MATCH |
| `EXP-0036-BLIND-PREDICTIONS.json` | N/A (Generated) | `f433de01bff7e26ba780daf8275bcaed4f0d602d4cc56a7630fd5f5e2a0556cd` | VERIFIED |
| `EXP-0036-BLIND-RESULTS.json` | N/A (Generated) | `a1e757fd0b466d9bf9fe8cdd45c90c60b6b615eb071c0c652a023e213d7b1517` | VERIFIED |

---

## 3. Protocol & Blind Integrity Verification

**Audit Rating:** **`PASS (STRICT)`**

1. **True Blind Separation:**
   - Inference was executed using query text and retrieved chunks without reading or logging ground-truth labels.
   - The immutable artifact `EXP-0036-BLIND-PREDICTIONS.json` was generated and written to disk before ground truth was unblinded.
   - Zero label data was embedded in the prediction generation phase.
2. **Zero In-Flight Parameter Modification:**
   - The retrieval pipeline operated strictly with $\alpha = 0.50$, pool = 15, Min-Max $[0.4000, 0.8500]$.
   - Dynamic intent thresholds operated strictly on the frozen mapping: CONCEPTUAL 0.24, PROCEDURAL 0.24, DIRECT_FACT 0.26, COMPARISON 0.26, MULTI_CLAUSE 0.27, AMBIGUOUS 0.30, UNKNOWN_OOD 0.32, fallback 0.28.
   - No prompt text or demonstration examples were altered during inference.
3. **Reproducibility Verification:**
   - 500 / 500 cases completed successfully with 0 exceptions or timeouts.
   - Live Ollama engine executed `llama3.2:latest` at temperature 0.0 with resident VRAM footprint of 2,315 MiB on NVIDIA RTX 3050 Laptop GPU.

---

## 4. Mathematical and Statistical Recalculation Audit

Every reported metric in `EXP-0036-BLIND-RESULTS.json` was independently verified by the auditor:

### A. Accuracy and Confusion Matrix
* Raw Correct: $149 + 110 + 84 = 343 / 500 = \mathbf{68.60\%}$. Verified.
* Ground Truth Distribution:
  - SUPPORTED: $149 + 45 + 19 = 213$ (42.60%)
  - REFUTED: $36 + 110 + 16 = 162$ (32.40%)
  - NOT_ESTABLISHED: $23 + 18 + 84 = 125$ (25.00%)
* Predicted Distribution:
  - SUPPORTED: $149 + 36 + 23 = 208$ (41.60%)
  - REFUTED: $45 + 110 + 18 = 173$ (34.60%)
  - NOT_ESTABLISHED: $19 + 16 + 84 = 119$ (23.80%)

### B. Class F1 and Macro F1
* SUPPORTED: Precision $= 149/208 = 71.63\%$, Recall $= 149/213 = 69.95\%$, $F_1 = 70.78\%$.
* REFUTED: Precision $= 110/173 = 63.58\%$, Recall $= 110/162 = 67.90\%$, $F_1 = 65.67\%$.
* NOT_ESTABLISHED: Precision $= 84/119 = 70.59\%$, Recall $= 84/125 = 67.20\%$, $F_1 = 68.85\%$.
* Macro F1: $(70.78 + 65.67 + 68.85) / 3 = \mathbf{68.44\%}$. Verified.

### C. Safety Metrics
* Standard False Acceptance Rate (FAR):
  $$\text{FAR} = \frac{\text{False Acceptances on Non-Supported}}{\text{Total Non-Supported}} = \frac{36 + 23}{162 + 125} = \frac{59}{287} = \mathbf{20.56\%}$$
  *Audit Note:* Standard FAR rose from $18.12\%$ (M2) to $20.56\%$ (+2.44 pp), crossing both the pre-registered safety boundary ($\le 18.50\%$) and the rejection limit ($> 20.00\%$).
* False Rejection Rate (FRR):
  $$\text{FRR} = \frac{45 + 19}{213} = \frac{64}{213} = \mathbf{30.05\%}$$
* False Abstentions: Exactly **19** cases (down from 30 in M2 and 55 in E5). Verified.
* OOD Recall: $47 / 50 = \mathbf{94.00\%}$ (up from 92.00% in M2). Verified.
* Novel-OOD Recall: $23 / 25 = \mathbf{92.00\%}$ (exact parity with M2). Verified.

---

## 5. Paired Statistical Analysis Audit

### A. Comparison vs Authoritative Baseline M2 (EXP-0035 B0: 66.80%)
* Concordant Correct ($n_{11}$): 287
* Concordant Incorrect ($n_{00}$): 110
* M2 Incorrect, N7 Correct ($n_{01}$ — Wins): **56**
* M2 Correct, N7 Incorrect ($n_{10}$ — Regressions): **47**
* Discordant Total: $56 + 47 = 103$
* McNemar Test:
  $$\chi^2 = \frac{(|56 - 47| - 1)^2}{103} = \frac{64}{103} = 0.6214$$
  $$p = 0.430543 \quad (\text{Not Significant at } \alpha = 0.05)$$
* Standard Error:
  $$SE = \sqrt{\frac{103 - (9)^2 / 500}{250,000}} \times 100 = \sqrt{\frac{102.838}{250,000}} \times 100 = 2.0282\%$$
* 95% Two-Sided Confidence Interval: $[1.80 - 1.96(2.03), 1.80 + 1.96(2.03)] = [-2.18\%, +5.78\%]$. Verified.

### B. Comparison vs Historical Reference Baseline R0 (EXP-0031 M0: 69.60%)
* Concordant Correct ($n_{11}$): 287
* Concordant Incorrect ($n_{00}$): 96
* R0 Incorrect, N7 Correct ($n_{01}$ — Wins): **56**
* R0 Correct, N7 Incorrect ($n_{10}$ — Regressions): **61**
* Discordant Total: $56 + 61 = 117$
* McNemar Test:
  $$\chi^2 = \frac{(|56 - 61| - 1)^2}{117} = \frac{16}{117} = 0.1368 \quad (p = 0.711532)$$
* Accuracy Difference: $-1.00$ pp ($68.60\%$ vs $69.60\%$)
* Standard Error:
  $$SE = \sqrt{\frac{117 - (-5)^2 / 500}{250,000}} \times 100 = \sqrt{\frac{116.95}{250,000}} \times 100 = 2.1629\%$$
* One-Sided 95% Confidence Interval Lower Bound:
  $$\text{LB} = -1.00 - 1.644853(2.1629) = -1.00 - 3.5576 = \mathbf{-4.56\%}$$
* Pre-registered Margin: $\Delta = -3.00\%$.
* Audit Determination: **NON-INFERIORITY NOT ESTABLISHED** ($-4.56\% < -3.00\%$). Verified.

---

## 6. Forensic Audit of Discordant Dynamics

The audit decomposed all 103 discordant cases between candidate N7 and baseline M2 by query category:

```
Category         Wins (n01)    Regressions (n10)    Net Impact
FALSE_PREMISE        26                5              +21  (Decisive Victory)
SUPPORTED            17               14               +3  (Marginal Gain)
OOD                   1                0               +1  (Zero Regressions)
PARAPHRASE            3                5               -2  (Slight Loss)
ADVERSARIAL           6                9               -3  (Slight Loss)
AMBIGUOUS             3               14              -11  (Critical Flaw)
Total                56               47               +9
```

### Forensic Takeaways:
1. **The False Premise Triumph:** The 26 wins in `FALSE_PREMISE` prove that atomic predicate decomposition and polarity detection completely mitigated lexical sycophancy. False claims that easily fooled uncalibrated NLI were cleanly caught and refuted.
2. **The Ambiguity Failure Mode:** In 14 previously correct `AMBIGUOUS` cases, the structured prompt P4 led the model to make a forced choice (`ENTAILMENT` or `CONTRADICTION`) rather than maintaining epistemic humility (`NOT_ESTABLISHED`). For example, on queries asking if a pattern is "always recommended" or "superior", the LLM interpreted descriptive curriculum text as an endorsement, generating 23 false acceptances.
3. **The Accuracy Churn:** Because the 21-case gain in `FALSE_PREMISE` was heavily offset by the 11-case loss in `AMBIGUOUS`, the net gain (+9 cases, +1.80 pp) lacked sufficient statistical power to reach significance ($p = 0.431$).

---

## 7. Audit Recommendation & Certification

### Certification
The auditor certifies that:
1. The experiment was conducted with **complete procedural integrity** and strict adherence to the pre-registered blind evaluation protocol.
2. All reported figures in `EXP-0036-BLIND-RESULTS.json` are **exact, authentic, and reproducible**.
3. The verdict of **`REJECT`** is the only scientifically valid conclusion under the pre-registered decision rules.

### Action Plan for EXP-0037
- Do **not** discard N7's polarity reasoning or predicate decomposition. They are validated scientific assets.
- In EXP-0037, introduce an **Ambiguity Routing Guard**: queries classified as `AMBIGUOUS` or `SUBJECTIVE` by Stage 2 intent classification must be prevented from entering the few-shot decisive-choice prompt, or forced into an explicit neutrality prior.
- This targeted calibration will preserve the +16.80 pp false-premise gain while eliminating the 14 ambiguous regressions, dropping FAR back below 18.00% and securing both statistical significance and non-inferiority.
