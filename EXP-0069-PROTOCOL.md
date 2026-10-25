# EXP-0069 Protocol: NLI Probability Calibration and Decision-Boundary Study

**Experiment ID:** EXP-0069  
**Lineage:** EXP-0068 (Dedicated Cross-Encoder Architecture Benchmark) -> EXP-0069  
**Date:** 2026-09-26  
**Repository:** `EduConnect-LMS-Experimental`  
**Starting HEAD:** `f6d1b2fa38efa20c06585e892422139fdd2fb255`  
**Branch:** `research-integration`  
**Target:** Natural Language Inference (NLI) Verifier Probability Calibration & Decision Boundary

---

## 1. Executive Summary & Research Question

In EXP-0068, dedicated NLI sequence classifiers (`cross-encoder/nli-MiniLM2-L6-H768` and `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`) were evaluated against the frozen A4 + `llama3.2` control. Both models achieved dramatic reductions in False Acceptance Rate (0.67% and 1.33% vs 6.00% for C0), but suffered catastrophic collapse in Supported Claim Recall (38.67% and 33.33% vs 87.33% for C0), resulting in overall development accuracies of 70.00% and 68.00% (statistically inferior to C0 at $p < 10^{-15}$).

The primary failure mode identified in EXP-0068 was extreme `NOT_ESTABLISHED / NEUTRAL` bias: the models assigned `NEUTRAL` to 50–55% of legitimately supported claims and 16–22% of false premise claims. However, probability diagnostics revealed that the models produced non-trivial confidence separation between classes despite poor raw argmax decisions.

**Central Research Question:**
> **Is the poor cross-encoder result caused partly by an uncalibrated class-decision boundary (Hypothesis A), or is the information needed to recover valid supported claims absent from the model's representations themselves (Hypothesis B / Task-Representation Mismatch)?**

---

## 2. Competing Scientific Hypotheses

### Hypothesis A — Calibration Limitation
The underlying cross-encoder logits contain sufficient latent discriminative information to distinguish valid pedagogical claims from false premises, but the off-the-shelf decision boundary is poorly positioned due to generic NLI training priors (MultiNLI, SNLI, FEVER).
* **Predictions under Hypothesis A:**
  1. Post-hoc decision boundary calibration (via class biases or vector scaling) will substantially recover Supported Claim Recall (towards C0 baseline of ~87%).
  2. False Acceptance Rate will remain tightly controlled ($\le 6.00\%$).
  3. Hard strata (S2 non-antonym refutations, S4 low-overlap paraphrases, S6 compound queries) will exhibit statistically significant recovery.
  4. Calibration parameters will remain stable across cross-validation folds.

### Hypothesis B — Representation / Task Mismatch
The cross-encoder's contextual representations systematically fail to capture educational domain relationships (e.g., treating curriculum-definitional paraphrases, syntactic variations, and multi-clause claims as non-entailed neutral statements).
* **Predictions under Hypothesis B:**
  1. Temperature scaling and class calibration will improve calibration metrics (NLL, ECE, Brier score) but fail to achieve material classification accuracy recovery.
  2. S4 low-overlap paraphrases will remain severely depressed (supported claims ranked below neutral).
  3. Shifting decision boundaries to recover supported claims will induce an unacceptable spike in False Acceptance Rate (FAR $> 6.00\%$) or false refutation of out-of-curriculum queries.
  4. Decision boundaries and parameters will be unstable across folds.

### Hypothesis C — Mixed Effect
Calibration recovers partial supported recall (e.g., high-overlap queries S3), but low-overlap semantic paraphrases (S4) and complex compound structures (S6) remain fundamentally unrecoverable without in-domain representational adaptation.

---

## 3. Strict Isolation & Frozen Experimental Backbone

To isolate calibration from model architecture and retrieval, the following components are strictly **frozen**:
1. **Verification Logic:**
   - `backend/rag_ambiguity_guard_verifier.php` (SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)
   - `backend/rag_premise_verifier.php` (SHA-256: `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179`)
2. **Datasets & Evidence:**
   - Development Dataset: `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)
   - Development Evidence Cache: `scratch/exp0056_dev_c1_cache.json` ($N=400$, SHA-256: `e4955c0513a96e18b889d3992d8433da78b977c0b3b981b3c3e8a216569e9e0a`)
   - Blind Holdout: `EXP-0033-BLIND-DATASET.json` ($N=500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`) — strictly sealed unless Gates A–F pass.
3. **Model Weights:**
   - C1: `cross-encoder/nli-MiniLM2-L6-H768` (weights unchanged, 82,120,707 params)
   - C2: `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` (snapshot `6f5cf0a2b59cabb106aca4c287eed12e357e90eb`, weights unchanged, 184,424,451 params)
4. **Independent Variable:**
   - **ONLY** the post-hoc mapping from raw model logits $z \in \mathbb{R}^3$ to calibrated probabilities $P' \in \Delta^2$ and discrete decisions $\hat{y} \in \{\text{CONTRADICTION}, \text{ENTAILMENT}, \text{NEUTRAL}\}$.
5. **No Production Modification:**
   - `D:\Collage project\EduConnect-LMS-Production` remains completely untouched.

---

## 4. 5-Fold Stratified Cross-Fitting Protocol

To prevent calibration overfitting and data leakage:
1. The 400 cases of `EXP-0025-DEVELOPMENT-DATASET.json` are partitioned into 5 stratified folds of exactly 80 cases each:
   - 30 `SUPPORTED` claims
   - 30 `REFUTED` claims
   - 20 `NOT_ESTABLISHED` claims
   - Fixed random state: seed = 42.
2. For each fold $k \in \{1, 2, 3, 4, 5\}$:
   - Calibration parameters are fitted **exclusively** on the remaining 4 folds ($N=320$ cases).
   - The fitted calibration transformation is applied to held-out fold $k$ ($N=80$ cases).
   - Out-of-fold calibrated probabilities and decisions are recorded.
3. Combining all held-out folds yields exactly 400 out-of-fold evaluated test cases where no case informed its own calibration parameters.

---

## 5. Calibration Mathematical Formulations

Let canonical classes be indexed as:
- $k = 0$: `CONTRADICTION` (maps to `REFUTED`)
- $k = 1$: `ENTAILMENT` (maps to `SUPPORTED`)
- $k = 2$: `NEUTRAL` (maps to `NOT_ESTABLISHED`)

Let $z = (z_0, z_1, z_2) \in \mathbb{R}^3$ represent the raw cross-encoder logits for a given premise-hypothesis pair.

### Condition C1: Raw Argmax (EXP-0068 Historical Baseline)
$$\hat{y} = \arg\max_{k \in \{0, 1, 2\}} z_k, \quad P_k = \frac{\exp(z_k)}{\sum_j \exp(z_j)}, \quad \text{conf} = \max_k P_k$$

### Condition C2: Temperature Scaling (Calibration Negative-Control)
A single positive scalar temperature $T > 0$ scales the logit magnitude:
$$z'_k = \frac{z_k}{T}, \quad P_k(T) = \frac{\exp(z_k / T)}{\sum_j \exp(z_j / T)}$$
$$\hat{y} = \arg\max_k z'_k = \arg\max_k z_k$$
*Purpose:* Temperature scaling preserves class ranking and argmax decisions. It tests whether probability calibration (NLL, ECE, Brier) improves independently of classification boundaries.

### Condition C3: Class-Bias Calibration (Boundary Shift)
Class-specific additive bias terms $b = (b_0, b_1, b_2) \in \mathbb{R}^3$ shift decision thresholds against the empirical neutrality prior:
$$z'_k = z_k + b_k, \quad P_k(b) = \frac{\exp(z_k + b_k)}{\sum_j \exp(z_j + b_j)}$$
$$\hat{y} = \arg\max_{k \in \{0, 1, 2\}} (z_k + b_k)$$

### Condition C4: Vector Scaling (Affine Logit Transform)
Class-specific scale parameters $a = (a_0, a_1, a_2) \in \mathbb{R}_{>0}^3$ and bias parameters $b = (b_0, b_1, b_2) \in \mathbb{R}^3$:
$$z'_k = a_k z_k + b_k, \quad P_k(a, b) = \frac{\exp(a_k z_k + b_k)}{\sum_j \exp(a_j z_j + b_j)}$$
$$\hat{y} = \arg\max_{k \in \{0, 1, 2\}} (a_k z_k + b_k)$$

---

## 6. Proper Scoring Objective Function

In accordance with strict calibration principles, parameters are fitted by minimizing **multiclass negative log-likelihood (cross-entropy)** with $L_2$ regularization:
$$\mathcal{L}_{\text{cal}}(\theta) = -\frac{1}{M} \sum_{i=1}^M \sum_{k=0}^2 y_{i, k} \log P_k(z_i; \theta) + \Omega(\theta)$$
where:
- $y_{i, k} \in \{0, 1\}$ is the one-hot ground truth label.
- For C2: $\Omega(T) = \lambda_T (T - 1)^2$, with $\lambda_T = 10^{-3}$.
- For C3: $\Omega(b) = \lambda_b \sum_{k=0}^2 b_k^2$, with $\lambda_b = 10^{-2}$.
- For C4: $\Omega(a, b) = \lambda_a \sum_{k=0}^2 (a_k - 1)^2 + \lambda_b \sum_{k=0}^2 b_k^2$, with $\lambda_a = 5 \times 10^{-2}, \lambda_b = 10^{-2}$.

Optimization is performed using L-BFGS-B with bounds $T \in [0.05, 20.0]$ and $a_k \in [0.01, 10.0]$.

---

## 7. Evaluated Strata Breakdown

All candidates are evaluated across the 7 established research strata ($N=400$):
- **S1: Antonym-Assisted Refutations** ($N=81$): Fast-path lexical oppositions.
- **S2: Non-Antonym Refutations** ($N=319$): Subtle factual contradictions without direct antonym cues.
- **S3: High-Overlap Supported Claims** ($N=100$): Surface lexical overlap with curriculum facts.
- **S4: Low-Overlap Supported Paraphrases** ($N=50$): True semantic equivalences without token overlap.
- **S5: Normative / Universal Claims** ($N=81$): Broad general statements.
- **S6: Compound / Multi-Clause Claims** ($N=75$): Complex conjunctive or qualified claims.
- **S7: Out-of-Domain Inquiries** ($N=100$): Completely ungrounded / out-of-curriculum claims.

---

## 8. Candidate Advancement Decision Gates

To prevent premature promotion of degraded candidates, a calibrated cross-encoder must satisfy **ALL** of the following gates to qualify for blind evaluation:

| Gate | Description | Threshold / Criterion |
|---|---|---|
| **Gate A** | Supported Claim Recall | Material recovery over raw candidate ($\ge 60.00\%$ vs raw $\sim 38\%$) |
| **Gate B** | False Acceptance Rate | Safety boundary preserved: $\text{FAR} \le \text{FAR}_{\text{C0}} = 6.00\%$ |
| **Gate C** | Out-of-Domain Recall | Robust abstention: $\text{OOD Recall} \ge 95.00\%$ |
| **Gate D** | Overall Accuracy | Not statistically inferior to C0 reference ($92.00\%$, paired McNemar $p \ge 0.05$) |
| **Gate E** | Hard-Stratum Generalization | Meaningful recovery in S2 ($\ge 85\%$) and S4 ($\ge 60\%$) |
| **Gate F** | Parameter Stability | Relative standard deviation of parameters across 5 folds $\le 25\%$ |

If **ANY** gate fails, the candidate is **REJECTED**, the blind holdout remains **SEALED**, and the scientific interpretation is declared as `REPRESENTATION/TASK-MISMATCH` or `MIXED`.
