# EXP-0071 Method Specification: Adaptive Verification Controller (AVC)

**Experiment ID:** EXP-0071  
**Target Architecture:** Multi-Tier Adaptive Verification System  
**Date:** 2026-09-26  
**Status:** SPECIFICATION COMPLETE  

---

## 1. Architectural Overview

The Adaptive Verification Controller (AVC) manages verification as a sequential decision process under a finite resource budget $B \in \{1, 2, 3\}$. Rather than submitting every claim to an expensive generative LLM or an uncalibrated small model, AVC monitors intermediate verification states and selectively allocates budget to maximize verification accuracy and safety while minimizing latency and inference costs.

```
Incoming Query + Claim
         │
         ▼
[ Stage 0: Guard & Fast-Path ] ───(Match)───► [ Action A0: Fast-Path Verdict ] (Cost = 0)
         │ (No match)
         ▼
[ Stage 1: Evidence State Classifier (E0..E5) ]
         │
         ├─► [ Out-of-Domain / Insufficient (E5) ] ──► [ Action A4: Epistemic Abstention ] (Cost = 0)
         │
         ▼
[ Stage 2: Cheap Semantic NLI (Fine-Tuned MiniLM) ] ──► [ Action A1 ] (Cost = 1)
         │
         ├─── High Confidence & Agreement (E2) ──────► Accept Cheap Verdict (Cost = 1)
         │
         └─── Low Margin / Conflicting (E3, E4) 
                   │
                   ├─── [ Action A2: Counter-Evidence Retrieval ] (Cost = 1) ──► Re-eval
                   └─── [ Action A3: Expensive LLM Escalation ]   (Cost = 2) ──► C0 llama3.2 Verdict
```

---

## 2. Discrete Evidence States ($E_0$ – $E_5$)

The controller categorizes the verification environment into six discrete states:

- **$E_0$ (Ambiguous / Malformed Claim):** Ambiguity guard flags subjective adjectives, value judgments, or missing referents.
- **$E_1$ (Deterministic Match):** Tier-1 deterministic engine detects exact antonym polarity collision or known fabricated API method.
- **$E_2$ (High-Confidence Semantic Match):** Cheap verifier outputs class probability $P(\text{win}) \ge \tau_{\text{high}}$ ($0.85$) with margin $\Delta P \ge 0.50$ and high evidence entity overlap.
- **$E_3$ (Low-Margin / Indeterminate Evidence):** Cheap verifier outputs ambiguous probabilities ($\Delta P < 0.30$) or predicts `NOT_ESTABLISHED` despite high lexical overlap in evidence.
- **$E_4$ (Conflicting Multi-Source Evidence):** Evidence chunks present opposing polarities or query contains universal quantifiers ('all', 'every', 'never') combined with partial evidence negation.
- **$E_5$ (Insufficient / Out-of-Domain Evidence):** Top retrieval similarity score falls below OOD threshold ($\text{Sim} < \theta_{\text{ood}}$) or zero entity matches exist.

---

## 3. Action Set ($A_0$ – $A_5$) and Budget Costs

| Action | Name | Cost | Operations |
| :--- | :--- | :--- | :--- |
| **$A_0$** | `FAST_PATH_DECISION` | $0$ | Returns immediate deterministic verdict from Ambiguity Guard or Tier-1. |
| **$A_1$** | `CHEAP_VERIFICATION` | $1$ | Runs fold-specific fine-tuned MiniLM cross-encoder on retrieved chunks. |
| **$A_2$** | `COUNTER_EVIDENCE_RETRIEVAL` | $1$ | Generates falsification query, searches index, and appends counter-chunks. |
| **$A_3$** | `EXPENSIVE_LLM_ESCALATION` | $2$ | Runs frozen C0 `llama3.2` zero-shot NLI prompt on cumulative evidence. |
| **$A_4$** | `EPISTEMIC_ABSTENTION` | $0$ | Emits `NOT_ESTABLISHED` with epistemic abstention rationale. |
| **$A_5$** | `MULTI_EVIDENCE_CONSENSUS` | $1$ | Fuses cheap NLI outputs across primary and counter-evidence chunks. |

Budget invariant: Total spent cost $\sum \text{Cost}(A_t) \le B$. If an action exceeds the remaining budget, the controller falls back to the best available lower-cost action or epistemic abstention.

---

## 4. Targeted Counter-Evidence Retrieval ($A_2$)

When the state is classified as $E_3$ (low margin) or $E_4$ (conflicting), the controller formulates a counter-query:
1. **Negation Inversion:** If claim is assertive ("X supports Y"), construct query ("X does not support Y" / "X limitations Y").
2. **Alternative Value Substitution:** Extract named entities and numeric attributes; query for contrasting curriculum facts.
3. **Lexical Filtering:** Query the evidence store for chunks containing antonym pairs or negation operators within 50 tokens of claim keywords.
4. **Context Augmentation:** Append top-ranked counter-chunk to the premise context for subsequent verification passes.

---

## 5. Decision Policies

### 5.1 Policy P0: Fixed-Rule Adaptive Controller
- Rule 1: If Ambiguity Guard flags ambiguity $\rightarrow A_0$ (`NOT_ESTABLISHED`).
- Rule 2: If Tier-1 matches $\rightarrow A_0$ (`REFUTED` or `SUPPORTED`).
- Rule 3: If retrieval score $< 0.45 \rightarrow A_4$ (`NOT_ESTABLISHED`).
- Rule 4: Execute $A_1$ (cost 1).
  - If $P(\text{REFUTED}) \ge 0.80 \rightarrow$ Emit `REFUTED`.
  - If $P(\text{SUPPORTED}) \ge 0.85$ and Margin $\ge 0.50 \rightarrow$ Emit `SUPPORTED`.
  - If Claim contains universal quantifiers AND budget $\ge 2 \rightarrow$ Escalate to $A_3$.
  - If $P(\text{NOT_ESTABLISHED}) \ge 0.70$ AND entity overlap $\ge 0.60$ (suspicious false abstention):
    - If budget $\ge 2 \rightarrow$ Escalate to $A_3$.
    - Else if budget $\ge 1 \rightarrow$ Trigger $A_2$ then $A_5$.
  - Default when unsure: If budget $\ge 2 \rightarrow A_3$, else accept $A_1$ argmax.

### 5.2 Policy P1: Learned Adaptive Controller
- Model: Cost-sensitive Gradient Boosted Classifier (or Decision Forest) fitted strictly within the 4 training folds.
- Target: Optimal routing action $y \in \{ \text{Accept\_A1}, \text{Trigger\_A2}, \text{Escalate\_A3}, \text{Abstain\_A4} \}$.
- Ground-truth target derived by comparing C1 vs C0 outcome on training samples:
  - If C1 is correct and confident $\rightarrow \text{Accept\_A1}$ (saving budget).
  - If C1 is wrong and C0 is correct $\rightarrow \text{Escalate\_A3}$ (justifying cost).
  - If evidence is genuinely ungroundable $\rightarrow \text{Abstain\_A4}$.
  - If non-antonym refutation with conflicting signals $\rightarrow \text{Trigger\_A2}$.
- Utility objective: $\max \sum [ \mathbb{I}(\text{Correct}) - \lambda \cdot \text{Cost} - \gamma \cdot \mathbb{I}(\text{False Acceptance}) ]$.

---

## 6. Zero-Leakage Guarantee

All feature scalers, decision trees, and thresholds for Policy P1 are computed strictly within each training fold partition ($4/5$ of dev data) and evaluated on the held-out test fold ($1/5$). The blind dataset (`EXP-0033-BLIND-DATASET.json`) remains completely unread and untouched throughout the entire development and training cycle.
