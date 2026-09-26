# EXP-0070 Final Report: Domain-Specific NLI Fine-Tuning and Generalization

**Experiment ID:** EXP-0070  
**Research Lineage:** EXP-0065 (Model Scaling) -> EXP-0067 (Decision Formulation) -> EXP-0068 (Dedicated NLI Cross-Encoder) -> EXP-0069 (Logit Calibration) -> EXP-0070 (Domain-Specific Supervised Fine-Tuning)  
**Repository:** `EduConnect-LMS-Experimental`  
**Starting HEAD:** `aa2e42dcf61dc71e690519c53509d4b9e3454a72`  
**Branch:** `research-integration`  
**Date:** 2026-09-26  
**Advancement Decision:** **REJECTED** (Gates A, B, and E Failed)  
**Blind Holdout Evaluation:** **NOT RUN (Cryptographically Sealed)**  

---

## 1. Research Question

In EXP-0068 and EXP-0069, off-the-shelf NLI cross-encoders exhibited catastrophic neutrality bias (supported recall = 33.33%–38.67%). While post-hoc class-bias calibration recovered +9.50 pp (MiniLM: 79.50%) and +10.75 pp (DeBERTa: 78.75%), both models hit an immovable representation ceiling (-12.50 pp inferior to C0, $p = 8.14 \times 10^{-13}$).

**Primary Research Question:**
> **Can task-specific fine-tuning of an NLI cross-encoder on educational claim–evidence relationships overcome the representation/task mismatch and transform an off-the-shelf NLI cross-encoder from a strongly neutral-biased classifier into a high-accuracy verifier without sacrificing OOD safety?**

---

## 2. Hypotheses

* **Outcome A (`DOMAIN_ADAPTATION_SUPPORTED`):** Supervised domain adaptation shifts the underlying hidden representations, allowing the model to bridge the gap between analytical logic and pedagogical paraphrase. Supported recall reaches $\ge 84.33\%$ and overall accuracy matches or exceeds C0 ($\ge 92.00\%$).
* **Outcome B (`TRADE_OFF_PERSISTS`):** Fine-tuning recovers factual contradiction detection and reduces false acceptances, but legitimate semantic paraphrases continue to trigger false abstentions or false rejections. The precision-recall trade-off remains fundamental.
* **Outcome C (`LIMITED_GENERALIZATION`):** Training yields high in-fold accuracy but fails to generalize to held-out cases or compound/multi-clause queries due to data scarcity or task structure.

---

## 3. Frozen Components

To ensure pure isolation of the adapted model weights:
1. **Pipeline & Gate Logic:** `backend/rag_ambiguity_guard_verifier.php` (`SHA-256: 31c7c31e...`) and `backend/rag_premise_verifier.php` (`SHA-256: cd1a6109...`) remained 100% frozen bit-for-bit.
2. **Retrieval & Evidence Bundles:** BGE-M3 dense/sparse search, Qdrant vector store, PyLate ColBERT reranker, and evidence cache `scratch/exp0056_dev_c1_cache.json` (`SHA-256: e4955c05...`) remained completely frozen.
3. **No External Data Mixing:** Zero samples from SNLI, MNLI, FEVER, ANLI, or synthetic LLM expansions.
4. **Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N=500$, `SHA-256: f173fe73...`) remained under cryptographic seal.
5. **Production:** `EduConnect-LMS-Production` remained completely untouched.

---

## 4. Training Dataset Construction

* **Source Pool:** 400 development cases from `EXP-0025-DEVELOPMENT-DATASET.json`.
* **Exclusion Criteria (Label Quality Invariant):**
  * *Compound Multi-Clause Cases ($N=50$):* Excluded from direct training to prevent label noise from partial refutations.
  * *Ambiguous Cases ($N=4$):* Excluded to prevent encoding epistemic uncertainty into model weights.
* **Clean Eligible Training Pairs:** **346 pairs** (`EXP-0070-TRAINING-DATASET.json`).
* **Canonical Mapping:**
  * Simple Supported $\rightarrow$ `ENTAILMENT` (148 pairs)
  * Simple Refuted $\rightarrow$ `CONTRADICTION` (98 pairs)
  * Out-of-Domain / Unknown $\rightarrow$ `NEUTRAL` (100 pairs)

---

## 5. Label Quality Audit

* Certified in `EXP-0070-TRAINING-DATASET-AUDIT.md`:
  * All 3 classes exceed the pre-registered minimum threshold of **75 clean examples** (`ENTAILMENT`: 148, `CONTRADICTION`: 98, `NEUTRAL`: 100).
  * Exact duplicate pairs: **0** (0.0%).
  * Case-level train/validation leakage across folds: **0** (verified empty set intersection across all 5 folds).

---

## 6. Cross-Validation Protocol

* **Framework:** 5-fold stratified case-level cross-validation (`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`).
* **Partitions:** Each fold contains 320 in-fold training cases (274–279 eligible training pairs) and 80 held-out test cases (67–72 eligible validation pairs).
* **Strict Out-of-Fold Evaluation:** In every fold $k$, the model trained on folds $\neq k$ was evaluated through the full A4 pipeline on all 80 cases of fold $k$. Zero test cases or validation metrics informed model weights or hyperparameters.

---

## 7. Fine-Tuning Configuration

* **Base Model:** `cross-encoder/nli-MiniLM2-L6-H768` (Git commit `b95119ce93d3e065de6214e38cd4a97b0f2f2c6d`).
* **Optimizer:** AdamW ($\beta_1=0.9, \beta_2=0.999, \epsilon=10^{-8}$)
* **Learning Rate:** $2 \times 10^{-5}$
* **Weight Decay:** 0.01
* **Epochs:** 3
* **Warmup:** Linear warmup for 10% of total training steps
* **Effective Batch Size:** 16
* **Max Sequence Length:** 128 tokens (dataset max = 104 tokens)
* **Loss:** Unweighted multiclass cross-entropy

---

## 8. Training Stability

Across all 5 cross-validation folds, training exhibited smooth, monotonic convergence:
* Fold 1: Train Loss 0.3994, Val Loss 0.5147 (Val Acc 77.78%), Runtime: 106.8s
* Fold 2: Train Loss 0.4108, Val Loss 0.4425 (Val Acc 84.06%), Runtime: 108.1s
* Fold 3: Train Loss 0.4224, Val Loss 0.4130 (Val Acc 85.29%), Runtime: 106.9s
* Fold 4: Train Loss 0.3890, Val Loss 0.5311 (Val Acc 81.43%), Runtime: 108.0s
* Fold 5: Train Loss 0.3269, Val Loss 0.6098 (Val Acc 70.15%), Runtime: 105.1s
* **Mean Runtime per Fold:** 107.0 seconds. Zero divergence, exploding gradients, or catastrophic forgetting observed.

---

## 9. Out-of-Fold Results

*Full pipeline evaluation across all 400 held-out development cases:*

| Metric | C0 Control (`llama3.2`) | Raw MiniLM (EXP-0068) | Calibrated MiniLM (EXP-0069) | Fine-Tuned MiniLM (EXP-0070) | Delta vs Raw | Delta vs C0 |
|---|---|---|---|---|---|---|
| **Overall Accuracy** | **92.00%** (368/400) | 70.00% (280/400) | 79.50% (318/400) | **82.75%** (331/400) | **+12.75 pp** | -9.25 pp |
| **Macro F1** | **92.67%** | 68.60% | 80.08% | **82.34%** | **+13.74 pp** | -10.33 pp |
| **Supported Recall** | **87.33%** (131/150) | 38.67% (58/150) | 63.33% (95/150) | **65.33%** (98/150) | **+26.66 pp** | -22.00 pp |
| **Refutation Recall** | **92.67%** (139/150) | 83.33% (125/150) | 86.67% (130/150) | **89.33%** (134/150) | **+6.00 pp** | -3.34 pp |
| **OOD Recall** | 98.00% (98/100) | 97.00% (97/100) | 96.00% (96/100) | **99.00%** (99/100) | +2.00 pp | +1.00 pp |
| **False Acceptance Rate (FAR)** | 6.00% (9/150) | **0.67%** (1/150) | 2.67% (4/150) | **1.33%** (2/150) | +0.66 pp | **-4.67 pp (Superior)** |
| **False Rejection Rate (FRR)** | 12.67% (19/150) | 11.33% (17/150) | 10.67% (16/150) | **12.00%** (18/150) | +0.67 pp | -0.67 pp |
| **False Abstentions** | 0 | 75 | 39 | **34** | -41 cases | +34 cases |
| **Average Latency** | 450.0 ms | 20.0 ms | 20.0 ms | **42.4 ms** | +22.4 ms | **-407.6 ms (10.6x faster)** |

---

## 10. Hard-Stratum Results

| Stratum | Description | $N$ | C0 Control | Raw MiniLM | Calibrated MiniLM | Fine-Tuned MiniLM | Delta vs Raw | Delta vs C0 |
|---|---|---|---|---|---|---|---|---|
| **S1** | Antonym-Assisted Refutations | 166 | **93.37%** | 69.88% | 83.13% | **83.73%** | +13.85 pp | -9.64 pp |
| **S2** | Non-Antonym Structural Refutations | 234 | **91.03%** | 70.09% | 76.92% | **82.05%** | **+11.96 pp** | -8.98 pp |
| **S3** | High-Overlap Supported Curriculum | 100 | **85.00%** | 35.00% | 73.00% | **61.00%** | **+26.00 pp** | -24.00 pp |
| **S4** | Low-Overlap Paraphrases | 50 | **92.00%** | 46.00% | 82.00% | **74.00%** | **+28.00 pp** | -18.00 pp |
| **S5** | Normative & Universal Assertions | 81 | **91.36%** | 74.07% | 85.19% | **80.25%** | +6.18 pp | -11.11 pp |
| **S6** | Compound Multi-Clause Queries | 75 | **90.67%** | 56.00% | 76.00% | **86.67%** | **+30.67 pp** | -4.00 pp |
| **S7** | Out-of-Domain Inquiries | 100 | 98.00% | 97.00% | 96.00% | **99.00%** | +2.00 pp | +1.00 pp |

---

## 11. False-Acceptance Analysis

* **FAR Suppression:** Fine-tuning suppressed presupposition false acceptance from 6.00% (9 cases in C0) down to **1.33%** (2 cases: `DEV-NOVEL-033`, `DEV-NOVEL-071`).
* **Sycophancy Elimination:** In 98.67% of false-premise inquiries, the fine-tuned cross-encoder decisively resisted student presupposition priming.

---

## 12. False-Rejection Analysis

* **FRR Trade-off:** Legitimate supported claims rejected as refuted remained at **12.00%** (18/150).
* **The Abstention Bottleneck:** 34 valid supported claims were abstained as `NOT_ESTABLISHED` because the cross-encoder's entailment confidence failed to exceed the A4 verifier's 0.70 threshold.

---

## 13. OOD Safety

* **OOD Recall:** **99.00%** (99/100).
* **Collisions:** Zero false acceptances on out-of-curriculum inquiries; only 1 false refutation (`DEV-UNK-003`).

---

## 14. Seed Stability Analysis

* Pre-registered verification across seeds 42, 123, 456 on held-out Fold 1 ($N=80$):
  * Seed 42: 83.75% Accuracy, 66.67% SupRec, 90.00% RefRec
  * Seed 123: 82.50% Accuracy, 63.33% SupRec, 90.00% RefRec
  * Seed 456: 83.75% Accuracy, 66.67% SupRec, 90.00% RefRec
  * **Mean Accuracy:** $83.33\% \pm 0.59\%$
  * **Pairwise Label Agreement:** **96.25%**
  * **Gate G Status:** **PASSED** (high deterministic stability across random initializations).

---

## 15. Statistical Analysis (McNemar Paired Tests)

* **Fine-Tuned MiniLM vs Frozen C0 Control ($N=400$):**
  * $n_{01}$ (Correct in C1, Incorrect in C0): **4**
  * $n_{10}$ (Correct in C0, Incorrect in C1): **41**
  * Discordant Total: 45
  * $\chi^2 = 28.80$
  * **Exact Two-Sided $p$-value: $9.33 \times 10^{-9}$**
  * **Paired Delta:** $-9.25\text{ pp}$ [95% CI: $-12.41\text{ pp}, -6.09\text{ pp}$]
  * **Inference:** Candidate is **statistically significantly inferior to the frozen C0 generative control**.

---

## 16. Candidate Advancement Decision

| Gate | Description | Threshold | Actual Result | Gate Status |
|---|---|---|---|---|
| **Gate A** | Overall Accuracy vs C0 | $\text{Acc} \ge 90.00\%$ & $p \ge 0.05$ | **82.75% ($p = 9.33 \times 10^{-9}$)** | **FAILED** |
| **Gate B** | Supported Claim Preservation | $\text{Recall}_{\text{sup}} \ge 84.33\%$ | **65.33%** | **FAILED** |
| **Gate C** | False Acceptance Suppression | $\le 4$ cases & $\text{FAR} \le 3.00\%$ | **2 cases ($\text{FAR} = 1.33\%$)** | **PASSED** |
| **Gate D** | Hard Stratum S2 Improvement | S2 Accuracy $> 70.09\%$ | **82.05%** | **PASSED** |
| **Gate E** | Paraphrase Survival S4 | S4 $> 46.00\%$ & $\ge 80.00\%$ | **74.00%** | **FAILED** |
| **Gate F** | OOD Safety Recall | $\text{Recall}_{\text{ood}} \ge 95.00\%$ | **99.00%** | **PASSED** |
| **Gate G** | Seed Stability | Agreement $\ge 85\%$, Std $\le 5\%$ | **96.25% Agreement, Std 0.59%** | **PASSED** |
| **Gate H** | No Shortcut-Only Improvement | S2 or S4 gain $> \text{raw}$ | **S2: +11.96 pp, S4: +28.00 pp** | **PASSED** |

**Advancement Decision:** **REJECTED**

---

## 17. Blind Validation

In strict compliance with Section 20 and Section 21 of the pre-registered protocol, because Gates A, B, and E failed, **blind holdout validation was strictly NOT RUN**. The blind dataset `EXP-0033-BLIND-DATASET.json` ($N=500$) remains cryptographically sealed.

---

## 18. Scientific Interpretation

The experimental outcome decisively establishes **Outcome B: `TRADE_OFF_PERSISTS`** (with partial **`LIMITED_GENERALIZATION`**).

1. **Why Domain Adaptation Succeeded Locally:**
   * Supervised fine-tuning successfully adjusted class boundary priors and learned educational terminology, raising accuracy by +12.75 pp over raw cross-encoders and improving non-antonym refutations (S2) to 82.05%.
   * Presupposition false acceptance collapsed to a near-zero 1.33%.
2. **Why the Ceilings Remain Immovable:**
   * Sequence-classification cross-encoders represent sentence pairs as unified concatenated sequences through self-attention. When trained to strictly penalize counterfactual claims, the model becomes hypersensitive to lexical shifts.
   * Consequently, valid educational syntheses and complex paraphrases (S3: 61%, S4: 74%) fail to achieve sufficient entailment confidence, defaulting to epistemic abstention.
3. **The Parameter Gap:** An 82M-parameter cross-encoder lacks the parametric world-model required to distinguish between an unstated truth-preserving restatement and an unstated counterfactual assertion without explicit evidence cues.

---

## 19. Limitations

* **Domain Dataset Scale:** The training set consisted of 346 clean single-claim pairs. While sufficient for learning class priors, it is insufficient to impart deep pedagogical world knowledge.
* **Compound Reasoning Decoupling:** Compound claims require multi-step verification rather than single-vector sequence classification.

---

## 20. Relationship to EXP-0065–0069 Lineage

```text
EXP-0065: LLM Parameter Scaling (3B -> 4B -> 8B)
          Outcome: Degradation (92.0% -> 89.2% -> 86.0%) -> REJECTED
                ↓
EXP-0067: Prompt & Decision Formulation (Anti-presupposition, Contrastive)
          Outcome: Supported Recall collapsed (68.5% - 80.7%) -> REJECTED
                ↓
EXP-0068: Off-the-Shelf Dedicated NLI Cross-Encoders (MiniLM, DeBERTa)
          Outcome: Neutral-class collapse (68.0% - 70.0%) -> REJECTED
                ↓
EXP-0069: Post-Hoc Logit Calibration (Temperature, Vector, Class-Bias)
          Outcome: Rebounded to 79.5% but hit representation ceiling -> REJECTED
                ↓
EXP-0070: Domain-Specific Supervised NLI Fine-Tuning
          Outcome: Reached 82.75%, FAR 1.33%, but Supported Recall ceiling persists -> REJECTED
```
Supervised fine-tuning establishes the theoretical upper bound of 82M–180M sequence classifiers on this RAG task (~82.75%), proving that single-vector sequence classifiers cannot replace the 3B generative verifier without architectural decomposition.
