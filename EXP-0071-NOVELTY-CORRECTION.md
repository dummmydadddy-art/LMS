# EXP-0071 Scientific Novelty and Framing Correction

**Experiment ID:** EXP-0071  
**Project:** EduConnect-LMS RAG Research Lineage  
**Date:** 2026-09-26  
**Status:** ADOPTED & BINDING  

---

## 1. Rationale and Scope of Correction

This document formally retracts unsubstantiated novelty claims, hyperbolic terminology, and statistical overstatements present in the initial drafting of the EXP-0071 research reports. 

In accordance with rigorous scientific practice, all assertions of "demonstrated and certified non-inferiority", "first ever", "globally novel", and "state-of-the-art" have been excised and replaced with sober, mathematically precise descriptions.

---

## 2. Specific Language Retractions and Corrections

### Retraction 1: Statistical Non-Inferiority Claims
* **Original Phrasing (Retracted):**
  > *"Policy P1 achieves 91.00% dev accuracy... McNemar's paired test confirms mathematical and empirical non-inferiority (p = 0.3877 >= 0.05)."*
* **Scientific Reality:**
  A non-significant McNemar test ($p \ge 0.05$) only indicates failure to reject the null hypothesis of equal marginal errors. When evaluated under a formal paired non-inferiority test with margin $\Delta = -2.00$ pp, the one-sided 95% Lower Confidence Bound is **$-2.4221$ pp**, with $p = 0.1237$. Non-inferiority was **NOT** established.
* **Corrected Replacement Phrasing:**
  > *"Condition C3 achieved 91.00% development accuracy (364 / 400), trailing the frozen C0 control (92.00%) by 1.00 percentage point. Under a paired non-inferiority test with margin $\Delta = -2.00$ pp, the one-sided 95% lower confidence bound is $-2.4221$ pp ($p = 0.1237$), meaning non-inferiority cannot be statistically certified at the pre-registered threshold."*

---

### Retraction 2: Pre-Mature Certification Claims
* **Original Phrasing (Retracted):**
  > *"All advancement gates passed unconditionally... certified as a validated candidate... ADVANCE_TO_BLIND."*
* **Scientific Reality:**
  Gate E failed because observed FRR ($15.3333\%$) exceeded the pre-registered bound of $\le 15.00\%$. Gate I failed because non-inferiority was not established.
* **Corrected Replacement Phrasing:**
  > *"Condition C3 failed Gate E (FRR = 15.33% > 15.00%) and Gate I (non-inferiority not established). Under strict experimental governance, Condition C3 cannot be certified. The formal decision is REJECT_METHOD, and the blind holdout dataset remains sealed."*

---

### Retraction 3: Spurious Counter-Evidence Recovery Claims
* **Original Phrasing (Retracted):**
  > *"Counter-Evidence Is Essential: Ablating targeted counter-evidence retrieval caused accuracy to collapse from 91.00% to 78.25% (-12.75 pp)... producing 14 refutation recoveries."*
* **Scientific Reality:**
  The reported 78.25% result was an artifact of retraining the routing model with remapped targets, which caused the model to escalate only 1 claim to the LLM. A clean causal ablation (Ablation-A) shows that removing counter-evidence produces **identical accuracy (91.50%)** and **lowers FRR from 14.67% to 12.67%**. Forensic tracing revealed that exactly **1** case was a true recovery, while 4 supported claims were erroneously refuted by counter-evidence.
* **Corrected Replacement Phrasing:**
  > *"Counter-evidence retrieval (Action A2) produced exactly one true causal recovery from an erroneous cheap NLI prediction, while 13 invocations were confirmatory of already-correct predictions. Crucially, on 4 supported claims, counter-evidence retrieval induced false rejections, elevating FRR to 15.33%. Clean causal ablation confirms that counter-evidence retrieval does not improve accuracy over a no-op fallback."*

---

### Retraction 4: Overclaiming Autonomous Online Optimality
* **Original Phrasing (Retracted):**
  > *"The controller autonomously learns what verification action is objectively necessary for any incoming claim."*
* **Scientific Reality:**
  The routing policy was trained using supervised targets derived from whether $C_0$ and $C_1$ were correct on the training split. This is a supervised selective-routing formulation.
* **Corrected Replacement Phrasing:**
  > *"The controller learns a fold-contained routing policy from development-set supervision indicating which available verification pathway produced the correct outcome."*

---

## 3. Official Standardized Abstract and Framing Statement

When describing EXP-0071 in publications, research lineage summaries, or technical documentation, the following standardized description must be used:

> **Official Research Summary:**  
> *"EXP-0071 evaluates a risk-aware adaptive verification architecture that dynamically allocates limited verification effort across cheap cross-encoder inference, targeted counter-evidence retrieval, and expensive generative LLM escalation. Under 5-fold cross-validation on an educational RAG benchmark ($N=400$), the learned controller resolved 81.0% of claims without generative LLM escalation, reducing generative LLM calls by 63.1% and verifier latency by 67.1% while achieving 91.00% development accuracy (versus 92.00% for the frozen control). However, unhedged counter-evidence consensus induced false rejections on supported claims, elevating the False Rejection Rate to 15.33% (failing the safety envelope of $\le 15.00\%$), and paired non-inferiority could not be statistically established (95% LCB = $-2.42$ pp vs margin $-2.00$ pp). The method was consequently rejected prior to blind holdout evaluation."*

---

## 4. Prohibited Terminology

The following terms are strictly prohibited from being applied to EXP-0071 without formal, independent external peer review:
* "Globally novel"
* "First architecture to..."
* "Mathematically guaranteed / certified"
* "State-of-the-art Pareto frontier"
* "Unconditional pass"
