# EXP-0071 Research Question and Core Hypotheses

**Experiment ID:** EXP-0071  
**Project:** EduConnect-LMS RAG Research Lineage  
**Date:** 2026-09-26  
**Status:** PRE-REGISTERED  

---

## 1. Context and Problem Statement

Across prior experiments in this lineage:
- **EXP-0065 & EXP-0066:** Increasing generative instruction model size (from `llama3.2:3b` to `qwen3:4b` and `qwen3:8b`) did not close the blind holdout gap and failed on the dev benchmark ($86.00\%$ vs $92.00\%$). Error attribution showed 102/136 blind errors occurred when curriculum evidence was present but NLI verification failed.
- **EXP-0067:** Prompt engineering and counter-presupposition reformulations collapsed supported-claim recall without improving overall accuracy.
- **EXP-0068 & EXP-0069:** Off-the-shelf NLI cross-encoders suffered from extreme epistemic abstention bias ($70.00\%$ accuracy, Supported Recall $\approx 38\%$), which post-hoc probability calibration only partially mitigated ($79.50\%$).
- **EXP-0070:** Domain-specific fine-tuning of `cross-encoder/nli-MiniLM2-L6-H768` improved accuracy to $82.75\%$ and achieved low false acceptance (FAR = $1.33\%$) with an order-of-magnitude latency speedup ($42.4$ ms vs $1196.4$ ms). However, MiniLM still suffered from lower supported recall ($65.33\%$) and trailed the frozen C0 control (`llama3.2`, $92.00\%$).

A static one-size-fits-all verifier architecture is fundamentally sub-optimal:
1. Running expensive generative LLM calls on every query is computationally wasteful, slow, and prone to generative hallucination.
2. Relying solely on a small cross-encoder leads to under-confidence on complex paraphrases and compound clauses.
3. Neither approach evaluates whether current evidence is sufficient before rendering a verdict or seeks counter-evidence when encountering ambiguous claims.

---

## 2. Primary Research Question

> **Can an Adaptive Verification Controller (AVC)—which dynamically estimates evidence sufficiency and state risk to allocate a finite verification budget ($B \le 3$) among cheap cross-encoder verification, targeted counter-evidence retrieval, and expensive generative LLM escalation—preserve C0 control accuracy ($\ge 90.00\%$) and safety (FAR $\le 6.00\%$, FRR $\le 15.00\%$) while reducing expensive LLM calls by $\ge 40\%$ and cutting verification latency by $\ge 40\%$?**

---

## 3. Pre-Registered Scientific Hypotheses

### Hypothesis 1 (Efficiency-Preserving Adaptation - H1)
An adaptive routing policy conditioned on evidence sufficiency and cross-encoder confidence margins can route $\ge 40\%$ of incoming claims to cheap fast paths or cross-encoder verdicts without escalating to the generative LLM, reducing average verifier latency by $\ge 40\%$ relative to C0 while maintaining dev accuracy within $2.0$ percentage points of C0 ($\ge 90.00\%$).

### Hypothesis 2 (Risk-Controlled Counter-Evidence - H2)
Targeted counter-evidence retrieval ($A_2$) triggered selectively for claims in low-margin states ($E_3$) or conflicting evidence states ($E_4$) reduces false acceptances (FAR $\le 6.00\%$) and boosts refutation recall on hard non-antonym claims (Stratum S2) to $\ge 88.00\%$.

### Hypothesis 3 (Learned vs Fixed-Rule Policy Advantage - H3)
A learned cost-sensitive policy (P1) trained strictly within cross-validation folds outperforms a hand-crafted fixed threshold policy (P0) by discovering non-linear interactions between retrieval similarity margins, query syntactic complexity, and NLI entropy.

### Hypothesis 4 (Budget Sensitivity - H4)
Under strict budget constraints:
- $B=1$ forces immediate acceptance of cheap verifier decisions, yielding high efficiency ($40$ ms latency) but suffering from lower accuracy ($\approx 83\%$).
- $B=2$ allows either counter-evidence retrieval ($A_2$) OR expensive escalation ($A_3$), recovering substantial accuracy ($\approx 88\%$).
- $B=3$ provides the complete Pareto-optimal operating point ($\ge 90.00\%$ accuracy, $\ge 40\%$ C0 call reduction).

---

## 4. Pre-Registered Advancement Criteria (Gates A–I)

Advancement to blind validation (`EXP-0033-BLIND-DATASET.json`) requires passing ALL nine pre-registered gates:
- **Gate A (Invariant Verification):** SHA-256 hashes of verifier backends and datasets match 100%.
- **Gate B (No Data Leakage):** Learned controller P1 trained strictly within 5-fold cross-validation folds.
- **Gate C (Primary Accuracy):** Candidate accuracy $\ge 90.00\%$ on development set ($N=400$).
- **Gate D (LLM Call Reduction):** Generative LLM (`llama3.2`) invocation rate reduced by $\ge 40.0\%$ vs C0.
- **Gate E (Safety Envelope):** False Acceptance Rate $\text{FAR} \le 6.00\%$, False Rejection Rate $\text{FRR} \le 15.00\%$.
- **Gate F (Hard-Stratum Preservation):** Stratum S2 (non-antonym) accuracy $\ge 88.00\%$, Stratum S6 (compound) $\ge 88.00\%$.
- **Gate G (Latency Improvement):** Mean verifier latency $\le 60\%$ of C0 latency.
- **Gate H (Seed Stability):** Accuracy standard deviation across seeds 42, 123, 456 is $< 1.0\%$.
- **Gate I (Statistical Non-inferiority):** McNemar paired test vs C0 has two-sided $p \ge 0.05$.
