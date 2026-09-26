# EXP-0071 Experimental Protocol: Adaptive Verification Budget Allocation

**Document ID:** EXP-0071-PROTOCOL  
**Experiment ID:** EXP-0071  
**Project:** EduConnect-LMS RAG Research Lineage  
**Date:** 2026-09-26  
**Status:** FROZEN & PRE-REGISTERED  

---

## 1. Experimental Invariants

Prior to running any benchmark code, the following cryptographic checksums must be strictly validated:

| Artifact | Path | Expected SHA-256 |
| :--- | :--- | :--- |
| **Ambiguity Guard Verifier** | `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| **Premise Verifier** | `backend/rag_premise_verifier.php` | `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179` |
| **Development Dataset** | `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| **Dev Evidence Cache** | `scratch/exp0056_dev_c1_cache.json` | `e4955c0513a96e18f2780e9803b9bc97ee3fe14c0ea21b8bca9b31d0413063f2` |
| **Blind Holdout Dataset** | `EXP-0033-BLIND-DATASET.json` | `3b4fd6c7c00e12ca0584b42475ee46a2a078028ff78479e0004ff2bbf5815ebc` |

*Security Rule:* The blind holdout dataset must NOT be opened or evaluated unless all Advancement Gates (A–I) pass unconditionally.

---

## 2. Experimental Conditions

The benchmark evaluates six primary conditions across the 400 development cases:

1. **`C0` (Frozen Generative LLM Control):** Frozen A4 multi-tier verifier with `llama3.2:latest` handling all non-deterministic semantic claims. (Historical benchmark: $92.00\%$ accuracy, $1196$ ms latency).
2. **`C1` (Fine-Tuned Cross-Encoder Control):** Frozen A4 verifier with fold-specific fine-tuned `cross-encoder/nli-MiniLM2-L6-H768` handling all non-deterministic claims. (Historical benchmark: $82.75\%$ accuracy, $42.4$ ms latency).
3. **`C2` (Fixed-Rule Adaptive Controller P0, $B=3$):** Heuristic routing policy using discrete evidence states and threshold logic to dynamically decide between cheap acceptance, counter-evidence retrieval, and LLM escalation.
4. **`C3` (Learned Adaptive Controller P1, $B=3$):** Cost-sensitive classifier trained strictly out-of-fold using state features $\mathbf{s} \in \mathbb{R}^{22}$ to optimize utility and safety.
5. **`C4` (Ablation: Learned Controller without Counter-Evidence):** Policy P1 with action $A_2$ disabled (budget reallocated strictly between $A_1$ and $A_3$).
6. **`C5` (Ablation: Learned Controller without Evidence Sufficiency):** Policy P1 trained without evidence sufficiency features (relying only on query syntax and raw NLI output).

In addition, budget sensitivity is evaluated for both P0 and P1 across $B \in \{1, 2, 3\}$.

---

## 3. Metrics and Statistical Tests

For each condition, the evaluation computes:
- **Primary Accuracy:** Fraction of predictions matching ground truth ($N=400$).
- **Safety Metrics:**
  - False Acceptance Rate (FAR): $\frac{\text{REFUTED predicted as SUPPORTED}}{N_{\text{REFUTED}}}$
  - False Rejection Rate (FRR): $\frac{\text{SUPPORTED predicted as REFUTED}}{N_{\text{SUPPORTED}}}$
  - Epistemic Recall: Accuracy on NOT_ESTABLISHED claims.
- **Efficiency Metrics:**
  - Expensive LLM Call Rate: Percentage of cases triggering Action $A_3$.
  - Reduction in LLM Calls vs C0: $1 - \frac{\text{Calls}_{A3}}{\text{Calls}_{C0}}$.
  - Latency: Mean, Median, and P95 latency (ms).
- **Stratified Accuracies (S1–S7):**
  - S1: Antonym-assisted refutations ($n=166$)
  - S2: Non-antonym refutations ($n=234$)
  - S3: High-overlap supported claims ($n=100$)
  - S4: Low-overlap paraphrases ($n=50$)
  - S5: Normative / universal claims ($n=81$)
  - S6: Compound multi-clause claims ($n=75$)
  - S7: Out-of-domain unanswerable claims ($n=100$)
- **Statistical Significance:**
  - McNemar's paired test with continuity correction against C0 control.
  - Significance threshold $\alpha = 0.05$.
- **Seed Stability:**
  - Three independent training/evaluation runs with seeds 42, 123, 456.

---

## 4. Advancement Gates (A through I)

- **Gate A:** Invariant hashes verified.
- **Gate B:** Zero data leakage (strict in-fold training).
- **Gate C:** Primary accuracy $\ge 90.00\%$.
- **Gate D:** LLM call reduction $\ge 40.0\%$.
- **Gate E:** FAR $\le 6.00\%$, FRR $\le 15.00\%$.
- **Gate F:** S2 accuracy $\ge 88.00\%$, S6 accuracy $\ge 88.00\%$.
- **Gate G:** Mean latency $\le 60\%$ of C0 latency.
- **Gate H:** Seed stability std dev $< 1.0\%$.
- **Gate I:** McNemar $p \ge 0.05$ vs C0.

Blind holdout execution is strictly contingent upon passing all Gates A through I.
