# EXP-0070 Pre-Registered Protocol: Domain-Specific NLI Fine-Tuning and Generalization

**Experiment ID:** EXP-0070  
**Repository:** `EduConnect-LMS-Experimental`  
**Starting HEAD:** `aa2e42dcf61dc71e690519c53509d4b9e3454a72`  
**Branch:** `research-integration`  
**Date:** 2026-09-26  
**Status:** ACTIVE  

---

## 1. Scientific Context & Purpose

In EXP-0068, dedicated cross-encoders (`cross-encoder/nli-MiniLM2-L6-H768` and `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`) demonstrated exceptional safety against false acceptance ($\text{FAR} \le 1.33\%$), but collapsed on supported claims (Supported Recall = 33.33%–38.67%) due to severe out-of-domain neutrality bias. In EXP-0069, post-hoc logit calibration recovered +9.50 pp (MiniLM: 79.50%) and +10.75 pp (DeBERTa: 78.75%), but was blocked by an immovable representation ceiling (-12.50 pp inferior to C0, $p = 8.14 \times 10^{-13}$).

**EXP-0070 tests whether supervised domain adaptation of cross-encoder weights on clean educational claim–evidence relationships resolves this underlying representation/task mismatch.**

---

## 2. Scientific Hypotheses & Potential Outcomes

* **Outcome A (`DOMAIN_ADAPTATION_SUPPORTED`):** Task-specific fine-tuning shifts the geometric representation manifold, enabling the cross-encoder to recognize pedagogical semantic entailment while preserving contradiction detection. Supported Recall reaches $\ge 84.33\%$ and overall accuracy matches or exceeds C0 ($\ge 92.00\%$).
* **Outcome B (`TRADE_OFF_PERSISTS`):** Fine-tuning improves supported claim recognition, but simultaneously inflates false acceptance on subtle false premises, or vice versa, demonstrating that sentence-pair cross-encoders face an intrinsic precision-recall Pareto boundary on curriculum assertions.
* **Outcome C (`LIMITED_GENERALIZATION`):** Models achieve high in-fold training accuracy but fail to generalize to out-of-fold validation cases, compound queries (S6), or non-antonym refutations (S2), indicating that small-sample educational adaptation suffers from severe inductive overfitting.

---

## 3. Frozen System Invariants

1. **Pipeline Logic Frozen:**
   * Ambiguity Guard Verifier: `backend/rag_ambiguity_guard_verifier.php` (`SHA-256: 31c7c31e679237ee46d03cfdb9ffbeaf5ff1ffbb1cf26fc0c9b0e25867a507a2`)
   * Premise Verifier: `backend/rag_premise_verifier.php` (`SHA-256: cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179`)
2. **Datasets Frozen:**
   * Development Set: `EXP-0025-DEVELOPMENT-DATASET.json` ($N=400$, `SHA-256: 8ce7313c...`)
   * Evidence Cache: `scratch/exp0056_dev_c1_cache.json` ($N=400$, `SHA-256: e4955c05...`)
   * Blind Holdout: `EXP-0033-BLIND-DATASET.json` ($N=500$, `SHA-256: f173fe73...`). Strictly sealed.
3. **No External Data Mixing:** Strictly zero inclusion of SNLI, MNLI, FEVER, ANLI, or synthetic LLM expansions.
4. **Production Isolation:** `EduConnect-LMS-Production` remains untouched.

---

## 4. Evaluated Conditions

* **`C0_CONTROL`:** Frozen A4 + `llama3.2:latest` (certified 92.00% dev accuracy).
* **`C1_FT_MINILM`:** Base `cross-encoder/nli-MiniLM2-L6-H768` fine-tuned across 5 cross-validation folds.
* **`C2_FT_DEBERTA`:** Base `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` fine-tuned across 5 cross-validation folds.

---

## 5. Fixed Training Recipe

* **Base Model Revisions:**
  * MiniLM: Git commit `b95119ce93d3e065de6214e38cd4a97b0f2f2c6d`
  * DeBERTa: Snapshot `6f5cf0a2b59cabb106aca4c287eed12e357e90eb`
* **Optimizer:** AdamW ($\beta_1=0.9, \beta_2=0.999, \epsilon=10^{-8}$)
* **Learning Rate:** $2 \times 10^{-5}$
* **Epochs:** 3
* **Weight Decay:** 0.01
* **Warmup Ratio:** 0.10 with linear schedule
* **Loss Function:** Standard multiclass cross-entropy:
  $$\mathcal{L} = -\frac{1}{N} \sum_{i=1}^N \log \left( \frac{\exp(z_{y_i})}{\sum_{c} \exp(z_c)} \right)$$
* **Sequence Length:** Truncation/padding to max 128 tokens (dataset max is 104 tokens, 99th percentile is 94 tokens).
* **Effective Batch Size:** 16 (MiniLM: batch size 16; DeBERTa: batch size 4 with gradient accumulation 4).
* **Random Seed:** 42

---

## 6. Pre-Registered Advancement Gates

A fine-tuned candidate advances to blind evaluation if and only if **ALL** conditions are satisfied:

* **Gate A (Overall Performance):** Out-of-fold pooled accuracy is not materially worse than C0 (Accuracy $\ge 90.00\%$, paired McNemar $p \ge 0.05$).
* **Gate B (Supported Preservation):** Supported Recall does not drop by $>3$ pp relative to C0 ($\text{Recall}_{\text{sup}} \ge 84.33\%$).
* **Gate C (False Acceptance):** False acceptance ($\text{REFUTED} \rightarrow \text{SUPPORTED}$) decreases materially ($\le 4$ cases vs C0 9 cases; $\text{FAR} \le 3.00\%$).
* **Gate D (Hard-Stratum Improvement):** S2 non-antonym performance improves relative to the raw cross-encoder baseline (S2 Accuracy $> 70.09\%$).
* **Gate E (Paraphrase Survival):** S4 low-overlap paraphrase performance improves relative to raw cross-encoder ($> 46.00\%$) and does not collapse relative to C0 ($\ge 80.00\%$).
* **Gate F (OOD Safety):** Out-of-Domain Recall remains $\ge 95.00\%$.
* **Gate G (Stability):** Effect direction is preserved across seeds 123 and 456 on a representative subset.
* **Gate H (No Shortcut-Only):** Accuracy gains are not restricted to antonym-assisted S1 cases.

If any gate fails, **blind evaluation is permanently blocked**.
