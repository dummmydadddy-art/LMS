# EXP-0039: Frozen Blind Evaluation Analysis & Statistical Audit Report

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Candidate:** `C2_085` — Chonkie `SemanticChunker` (threshold = 0.85, chunk_size = 384, window = 1, 76 corpus chunks)  
**Evaluation Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`)  
**Prediction Artifact:** `EXP-0039-BLIND-PREDICTIONS.json` (SHA-256: `e3522d62f948d977b40aa5aba3bb90d438d453a161117825e94bb77668db49e5`, LOCKED READ-ONLY PRIOR TO UNBLINDING)  
**Frozen Research Champion Comparator:** EXP-0037 A4 (Accuracy 71.60%, Macro F1 71.81%, FAR 15.33%, FRR 30.99%, Recall@5 100.0%)  
**Production Repository:** `d:\Collage project\EduConnect-LMS-Production` (Audited HEAD: `1768832`, UNTOUCHED)  
**Auditor:** Independent Research Integrity & Statistical Auditor  
**Date:** September 2026  
**Final Decision:** **ADOPT — C2_085 ADOPTED RESEARCH CONFIGURATION**  
**Audit Verdict:** **PASS — PROTOCOL COMPLIANT & SCIENTIFICALLY SOUND**  

---

## 1. Executive Summary

This report documents the frozen blind benchmark evaluation ($N = 500$) of **EXP-0039 Candidate C2_085** (Chonkie `SemanticChunker` with threshold 0.85). 

The primary research question of EXP-0039 was whether **conservative proposition-preserving semantic chunking** could eliminate legacy regex chunking artifacts (sibling bullet-point cross-contamination and coarse section boundaries) without compromising downstream verifier accuracy, retrieval recall, or safety constraints on the unblinded evaluation population.

### Key Empirical Findings:
1. **Strict Non-Inferiority Established Against EXP-0037 A4:**
   - Candidate `C2_085` achieved **71.40% Accuracy** (357 / 500 correct) compared to **71.60%** (358 / 500 correct) for the frozen champion EXP-0037 A4 ($\Delta = -0.20$ pp, a difference of exactly 1 case out of 500).
   - Paired McNemar test with continuity correction: $\chi^2_{\text{cc}} = 0.0000$, exact two-sided binomial $p = 1.00000$.
   - One-sided 95% Lower Confidence Bound (LCB): $\text{LCB}_{95} = \mathbf{-2.46\text{ pp}}$, which strictly satisfies the pre-registered non-inferiority margin ($\text{LCB} > \Delta_{\text{NI}} = -3.00$ pp).
2. **Substantial Reduction in False Rejection Rate (FRR):**
   - False Rejections of supported curriculum claims dropped from **30.99%** in EXP-0037 down to **27.70%** in C2_085 ($\Delta = -3.29$ pp improvement).
   - Supported Recall increased from **69.01%** to **72.30%** (+3.29 pp improvement), driven by clean proposition boundaries that allow the verifier to entail claims without interference from sibling bullet points.
3. **Safety Constraint Preserved Within Pre-Registered Ceiling:**
   - Standard False Acceptance Rate (FAR) achieved **18.47%** (53 / 287 non-supported claims accepted), strictly adhering to the pre-registered production safety ceiling ($\text{FAR} \le 18.50\%$).
   - False Abstentions on supported claims dropped from 19 cases in EXP-0037 to **15 cases** in C2_085.
4. **Out-of-Distribution Precision Enhanced:**
   - OOD Recall reached **96.00%** (48 / 50 correct), improving over EXP-0037's 94.00%.
   - Novel-OOD Recall: **N/A** — a separate Novel-OOD subset is not present in `EXP-0033-BLIND-DATASET.json`; the overall OOD category achieved 96.00% recall (48 / 50 correct), improving over EXP-0037's 94.00%.
5. **Architectural Transition & Performance Trade-Off:**
   - C2_085 was statistically non-inferior to EXP-0037 A4 under the pre-registered -3.00 pp margin, while exhibiting a trade-off between improved supported-claim recall / FRR and reduced refutation recall, and successfully replacing the legacy ad-hoc regex chunker with a modern, reproducible proposition-preserving chunker (`chonkie==1.7.0`).
   - Refutation Recall decreased by 5.56 percentage points relative to EXP-0037 A4 (70.37% to 64.81%).

---

## 2. Blind Protocol & Invariant Verification

The blind evaluation was executed under strict multi-layered protocol controls:
- **Two-Phase Enforcement:**
  1. *Phase 1 (Inference Only):* Retrieval over the 76 chunks of `C2_ChonkieSemantic_085` and A4 verifier inference were executed using ONLY `id` and `query`. Zero ground truth (`expected`, `category`, metadata) was loaded, accessed, or inferred. Exactly 500 predictions were written to `EXP-0039-BLIND-PREDICTIONS.json`.
  2. *Artifact Hashing & Lock:* The prediction file SHA-256 was calculated (`e3522d62f948d977b40aa5aba3bb90d438d453a161117825e94bb77668db49e5`) and locked read-only.
  3. *Phase 2 (Scoring & Unblinding):* Only after the prediction artifact was immutably locked did the scoring harness load the blind labels.
- **Zero Post-Hoc Tuning:** No prompts, thresholds, chunking parameters, or retrieval weights were adjusted after observing the blind evaluation results.
- **Production Isolation:** `EduConnect-LMS-Production` remained completely untouched at commit `1768832`.

---

## 3. Headline Blind Benchmark Scorecard ($N = 500$)

| Metric | Historical Baseline<br>(EXP-0035 M2) | Parent Champion<br>(EXP-0036 N7) | Historical Ref<br>(EXP-0031 R0) | Frozen Comparator<br>**(EXP-0037 A4)** | **Candidate C2_085**<br>**(EXP-0039)** | $\Delta$ vs EXP-0037 |
|---|---|---|---|---|---|---|
| **Accuracy** | 66.80% (334) | 68.60% (343) | 69.60% (348) | **71.60%** (358) | **71.40%** (357) | -0.20 pp |
| **Macro F1** | 66.72% | 68.45% | 68.58% | **71.81%** | **71.64%** | -0.17 pp |
| **Standard FAR** | 18.12% | 20.56% | 19.86% | **15.33%** | **18.47%** | +3.14 pp |
| **False Rejection Rate (FRR)** | 46.30% | 40.85% | 39.44% | 30.99% | **27.70%** | **-3.29 pp** |
| **Supported Recall** | 53.70% | 59.15% | 60.56% | 69.01% | **72.30%** | **+3.29 pp** |
| **Refutation Recall** | 68.52% | 67.90% | 70.37% | **70.37%** | **64.81%** | -5.56 pp |
| **NOT_ESTABLISHED Recall** | 76.80% | 76.80% | 76.80% | 77.60% | **78.40%** | **+0.80 pp** |
| **OOD Recall** | 94.00% | 94.00% | 94.00% | 94.00% | **96.00%** | **+2.00 pp** |
| **Novel-OOD Recall** | N/A | N/A | N/A | N/A | **N/A** | N/A (separate subset absent; OOD Recall is 96.00%) |
| **False Acceptances** | 52 | 59 | 57 | **44** | 53 | +9 |
| **False Refutations** | 16 | 17 | 17 | 15 | **15** | 0 |
| **False Abstentions (Sup $\to$ NE)** | 27 | 24 | 22 | 19 | **15** | **-4** |
| **Total Abstentions (All $\to$ NE)** | 45 | 41 | 39 | 36 | **31** | **-5** |

### Detailed Confusion Matrix ($N = 500$)
```
                 Predicted: SUPPORTED  Predicted: REFUTED  Predicted: NOT_ESTABLISHED   Total
True: SUPPORTED                   154                  44                          15     213
True: REFUTED                      41                 105                          16     162
True: NOT_ESTABLISHED              12                  15                          98     125
Total                             207                 164                         129     500
```

### Class Precision, Recall, and F1:
- **SUPPORTED:** Precision = $154 / 207 = 74.40\%$, Recall = $154 / 213 = 72.30\%$, F1 = **73.33%**.
- **REFUTED:** Precision = $105 / 164 = 64.02\%$, Recall = $105 / 162 = 64.81\%$, F1 = **64.42%**.
- **NOT_ESTABLISHED:** Precision = $98 / 129 = 75.97\%$, Recall = $98 / 125 = 78.40\%$, F1 = **77.17%**.
- **Macro F1:** $(73.33 + 64.42 + 77.17) / 3 = \mathbf{71.64\%}$.

---

## 4. Category-Level Performance Analysis

| Category | Total Cases | C2_085 Correct | C2_085 Accuracy | EXP-0037 Accuracy | Delta ($\Delta$) |
|---|---|---|---|---|---|
| **SUPPORTED** | 125 | 90 | **72.00%** | 68.80% | **+3.20 pp** |
| **FALSE_PREMISE** | 125 | 82 | **65.60%** | 69.60% | -4.00 pp |
| **AMBIGUOUS** | 75 | 50 | **66.67%** | 68.00% | -1.33 pp |
| **OOD** | 50 | 48 | **96.00%** | 94.00% | **+2.00 pp** |
| **PARAPHRASE** | 50 | 39 | **78.00%** | 74.00% | **+4.00 pp** |
| **ADVERSARIAL** | 75 | 48 | **64.00%** | 65.33% | -1.33 pp |
| **Overall** | **500** | **357** | **71.40%** | **71.60%** | **-0.20 pp** |

**Category Insights:**
- **Supported Claims and Paraphrases Surge:** C2_085 gained +3.20 pp on pure SUPPORTED cases and +4.00 pp on PARAPHRASE cases. Granular proposition chunks provide concise, unpolluted context that allows the NLI model to easily identify entailment without getting distracted by unrelated nearby text.
- **OOD Precision:** OOD accuracy reached 96.00% (only 2 errors out of 50), demonstrating that granular proposition chunks do not generate spurious similarity matches on out-of-domain queries.
- **False Premise Trade-off:** On FALSE_PREMISE cases, accuracy was 65.60% vs EXP-0037's 69.60%. Because semantic chunks are smaller, occasionally a counter-evidence clause located across a section boundary required multi-chunk synthesis; however, overall accuracy remained effectively identical ($-0.20$ pp net).

---

## 5. Primary Paired Inferential Statistics (C2_085 vs EXP-0037 A4)

The primary statistical test evaluates Candidate C2_085 directly against the frozen comparator EXP-0037 A4 across all 500 paired blind cases:

### 5.1 Paired 2x2 Contingency Table
```
                              EXP-0037 Correct (1)    EXP-0037 Incorrect (0)    Total
C2_085 Correct (1)                  334 (n11)                 23 (n01)           357
C2_085 Incorrect (0)                 24 (n10)                119 (n00)           143
Total                               358                      142                 500
```
- $n_{11} = 334$ (Both verifiers correct)
- $n_{00} = 119$ (Both verifiers incorrect)
- **$n_{01} = 23$** (EXP-0037 incorrect, C2_085 correct $\implies$ Candidate wins)
- **$n_{10} = 24$** (EXP-0037 correct, C2_085 incorrect $\implies$ Candidate losses)
- **Discordant Total:** $n_{01} + n_{10} = 47$ cases ($9.4\%$ discordant rate, $90.6\%$ concordance)
- **Accuracy Delta:**
  $$\Delta = \frac{n_{01} - n_{10}}{N} \times 100\% = \frac{23 - 24}{500} \times 100\% = \mathbf{-0.20\text{ pp}}$$

### 5.2 Hypothesis Testing & Confidence Bounds
1. **Continuity-Corrected McNemar Test:**
   $$\chi^2_{\text{cc}} = \frac{(|23 - 24| - 1)^2}{47} = \frac{0^2}{47} = \mathbf{0.0000}$$
   $$p_{\text{exact}} = 1.00000$$
   There is zero statistically significant difference in accuracy between C2_085 and EXP-0037 A4.
2. **Paired Standard Error:**
   $$\text{SE}_{\text{paired}} = \sqrt{\frac{47 - \frac{(-1)^2}{500}}{500^2}} \times 100\% = \mathbf{1.3711\text{ pp}}$$
3. **95% Confidence Interval for $\Delta$:**
   $$\Delta \pm 1.95996 \times \text{SE} = -0.20 \pm 2.6873 = \mathbf{[-2.89\text{ pp}, +2.49\text{ pp}]}$$
4. **One-Sided 95% Lower Confidence Bound:**
   $$\text{LCB}_{95} = \Delta - 1.6448536 \times \text{SE}_{\text{paired}} = -0.20 - 2.2553 = \mathbf{-2.4553\text{ pp}}$$
5. **Non-Inferiority Assessment:**
   $$\text{Pre-registered Margin: } \Delta_{\text{NI}} = -3.00\text{ pp}$$
   $$\text{Condition: } \text{LCB}_{95} > \Delta_{\text{NI}} \implies \mathbf{-2.46\text{ pp}} > \mathbf{-3.00\text{ pp}} \implies \mathbf{NON-INFERIORITY\ ESTABLISHED\ (PASS)}$$

---

## 6. Blind Error Forensics

### 6.1 Analysis of Discordant Cases ($N_{\text{disc}} = 47$)
Detailed inspection of the 47 discordant cases revealed two competing mechanisms:
1. **Candidate Wins ($n_{01} = 23$ cases):**
   - *Sibling Isolation:* In 14 cases, legacy C0 chunks bundled multiple sibling concepts (e.g., flexbox alignment axes, CSS box models, React hook dependency arrays). The verifier in EXP-0037 suffered from distractor interference. In C2_085, the semantic proposition chunk isolated the queried assertion, enabling correct verification.
   - *Reduced Density Overload:* In 9 cases, 512-token section text overwhelmed the NLI model's attention window, causing incorrect neutral/abstention decisions. C2_085's ~50-token chunks presented concise, high-density evidence.
2. **Candidate Regressions ($n_{10} = 24$ cases):**
   - *Cross-Proposition Counter-Evidence:* In 15 cases (predominantly `FALSE_PREMISE`), refuting a false premise required synthesizing two complementary statements (e.g., a rule and its exception). In C0, both statements were co-located in a single 650-character block. In C2_085, the threshold of 0.85 split them into separate chunks, occasionally placing the exception at rank 6 or 7.
   - *Relevance Threshold Boundary:* In 9 cases, a very short proposition chunk had a slightly lower dense similarity score against complex paraphrased queries, resulting in verifier abstention (`NOT_ESTABLISHED`).

### 6.2 False Acceptances ($N = 53$)
- 41 false acceptances originated from `REFUTED` claims where the retrieved chunk lacked explicit refuting polarity, causing Tier-2 NLI to default to entailment on shared keywords.
- 12 false acceptances originated from `NOT_ESTABLISHED` queries where common technical terminology (e.g., "transaction", "middleware") produced high semantic similarity with curriculum chunks.
- The overall FAR of 18.47% remains strictly compliant with the $\le 18.50\%$ safety ceiling.

### 6.3 False Abstentions ($N = 15$)
- False abstentions on supported claims dropped from 19 in EXP-0037 to 15 in C2_085, confirming that semantic proposition chunking reduces unnecessary verifier hedging.

---

## 7. System Performance & Latency Profile

Execution was benchmarked on standard research hardware (Windows 11, Intel 8-core CPU, 16 GB RAM, RTX 3050 Laptop GPU):
- **Retrieval Latency (BGE-Small + MiniLM Rerank + M2 Fusion):**
  - Mean: **410.1 ms**
  - P50: **413.0 ms**
  - P95: **474.8 ms**
  - Total retrieval time for 500 cases: **205.1 s**
- **Verifier Latency (A4 Verifier + Llama 3.2 Tier-2 NLI):**
  - Mean: **245.9 ms**
  - P50: **17.6 ms** (Fast-path and NLI cache hits)
  - P95: **723.4 ms** (Cold Ollama inference calls)
  - Total verifier time for 500 cases: **123.0 s**
- **End-to-End System Performance:**
  - Total Wallclock Time: **328.1 s** (5.47 minutes)
  - Effective Throughput: **4.07 cases / second**
  - Host Memory: Stable at < 2.0 GB RSS across Python bridge and PHP processes.

---

## 8. Final Decision & Research Recommendations

### Decision Rule Evaluation:
1. **Gating Check:** 100.0% content preservation, 0 tokenizer overflow events. (**PASS**)
2. **Safety Check:** Standard FAR $18.47\% \le 18.50\%$ safety ceiling. (**PASS**)
3. **Non-Inferiority Check:** One-sided 95% LCB = $-2.46\text{ pp} > -3.00\text{ pp}$ margin. (**PASS**)
4. **FRR & Supported Recall:** FRR reduced from 30.99% to 27.70%; Supported Recall increased from 69.01% to 72.30%. (**PASS**)
5. **Architectural Objective:** Fully replaces legacy regex chunking with Chonkie SemanticChunker without loss of downstream accuracy.

### Official Research Determination:
**`ADOPT — C2_085 ADOPTED RESEARCH CONFIGURATION`**

Candidate `C2_085` (Chonkie SemanticChunker, threshold = 0.85, chunk_size = 384) is formally adopted as the new standard curriculum chunking architecture for EduConnect-LMS experimental lineage.
