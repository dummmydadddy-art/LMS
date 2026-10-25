# EXP-0024: Evidence-Grounded Premise Verification Architecture

## Executive Summary

The EXP-0023 forensic audit demonstrated that the EXP-0022 candidate suffered from critical architectural flaws:
1. **Closed-World Assumption**: Lack of matching rule resulted in automatic `SUPPORTED` status, driving False Acceptance Rate ($\text{FAR} \ge 55\%$) on novel misconceptions.
2. **Dead Parameter**: The `$retrievedChunks` parameter was ignored entirely in favor of 35 hardcoded regex rules.
3. **Polarity Blindness**: Surface keywords triggered false refutations ($\text{FRR} \ge 15\%$) on legitimate student questions inquiring about negative constraints (e.g. *"Why can't const be reassigned?"*).
4. **Hardcoded Benchmark Coupling**: Rule tables directly matched expected phrases from previous evaluation sets.

EXP-0024 completely replaces this paradigm with a **Dynamic Evidence-Grounded Premise Verification Engine** operating over retrieved curriculum chunks.

---

## 1. Mathematical Formalism & Decision Contract

Given a student query $Q$ and a set of retrieved curriculum passages $C = \{c_1, c_2, \dots, c_k\}$:

### 1.1 Proposition Extraction $\mathcal{P}(Q)$
Query $Q$ is decomposed into a set of atomic propositions:
$$\mathcal{P}(Q) = \{p_1, p_2, \dots, p_m\}$$
where each proposition $p_i = \langle e_i, r_i, o_i, \mu_i, \pi_i \rangle$:
- $e_i$: Target entity or grammatical subject (e.g., `const`, `useEffect`, `B-Tree index`)
- $r_i$: Predicate relation or verb phrase (e.g., `reassign`, `render synchronously`, `trigger re-render`)
- $o_i$: Object or attribute complement
- $\mu_i \in \{\text{ASSERTION}, \text{INQUIRY_CONSTRAINT}, \text{MODAL}\}$: Epistemic modality
- $\pi_i \in \{+1, -1\}$: Logical polarity ($+1$ for positive assertion, $-1$ for explicit negation/restriction)

### 1.2 Evidence Grounding Function $\mathcal{E}(p_i, C)$
Each passage $c \in C$ is decomposed into candidate assertion sentences $S(c) = \{s_1, s_2, \dots, s_n\}$.
For each candidate sentence $s$, we compute:
1. **Entity Salience**: $\text{Sim}_{\text{entity}}(e_i, s) = \mathbb{I}(e_i \sqsubseteq s) \lor \text{Jaccard}(tokens(e_i), tokens(s))$
2. **Predicate Alignment**: $\text{Sim}_{\text{pred}}(r_i, s)$
3. **Polarity Alignment**: $\Delta\pi(p_i, s) = \pi(p_i) \times \pi(s)$
4. **Semantic Contradiction Score**:
   $$\text{Contra}(p_i, s) = \mathbb{I}(\text{Sim}_{\text{entity}} \ge \theta_e \land \text{Sim}_{\text{pred}} \ge \theta_r \land \Delta\pi(p_i, s) = -1)$$
5. **Semantic Support Score**:
   $$\text{Supp}(p_i, s) = \mathbb{I}(\text{Sim}_{\text{entity}} \ge \theta_e \land \text{Sim}_{\text{pred}} \ge \theta_r \land \Delta\pi(p_i, s) = +1)$$

### 1.3 Decision Hierarchy (Strict Three-State Contract)
Let:
$$N_{\text{contra}} = \sum_{c \in C} \sum_{s \in S(c)} \text{Contra}(p_i, s)$$
$$N_{\text{supp}} = \sum_{c \in C} \sum_{s \in S(c)} \text{Supp}(p_i, s)$$

The decision rule for proposition $p_i$ is:
$$\text{Status}(p_i) = \begin{cases}
\text{REFUTED} & \text{if } N_{\text{contra}} > 0 \\
\text{SUPPORTED} & \text{if } N_{\text{contra}} = 0 \land N_{\text{supp}} > 0 \land \max_{c \in C} \text{Sim}(Q, c) \ge \tau_{\text{rel}} \\
\text{NOT\_ESTABLISHED} & \text{otherwise (insufficient evidence or out-of-curriculum)}
\end{cases}$$

For compound queries with multiple propositions $\{p_1, \dots, p_m\}$:
- If ANY $p_i$ is `REFUTED`, overall query status is `REFUTED` (identifying the specific false premise).
- If ALL $p_i$ are `SUPPORTED`, overall status is `SUPPORTED`.
- If NO $p_i$ is `REFUTED`, but at least one is `NOT_ESTABLISHED` (or all are), overall status is `NOT_ESTABLISHED`.

---

## 2. Negation-Aware Semantic Processing

### 2.1 The Negation Ambiguity Problem
A surface string containing `const` and `reassign` can represent either:
1. **False Premise Assertion**: *"Why does const allow reassignment?"* (Asserts $P(+)$ where Curriculum holds $P(-)$ $\to$ `REFUTED`).
2. **Legitimate Invariant Inquiry**: *"Why can't const be reassigned?"* (Asserts $P(-)$ where Curriculum holds $P(-)$ $\to$ `SUPPORTED`).

### 2.2 Syntactic Inquiry Polarity Resolution
The proposition extractor detects inquiry modality:
- Patterns: `why can't`, `why cannot`, `why doesn't`, `why does X not`, `why is X not allowed`, `why does X prevent Y`, `why does X disallow Y`.
- When an inquiry pattern is identified, the student's asserted premise is negative:
  $$\pi(p) = -1$$
- When the retrieved curriculum text states: *"Variables declared with const cannot be reassigned"* ($\pi(s) = -1$), then:
  $$\Delta\pi(p, s) = (-1) \times (-1) = +1 \implies \text{SUPPORTED}$$
- Conversely, for *"Why does const allow reassignment?"*, $\pi(p) = +1$, so:
  $$\Delta\pi(p, s) = (+1) \times (-1) = -1 \implies \text{REFUTED}$$

This eliminates false refutations on legitimate negation without requiring hardcoded per-query rules.

---

## 3. Retrieval Grounding & Diagnostic Invariants

The verifier strictly enforces the following diagnostic invariants:
1. **`evidence_used: true`**: Verification must consume `$retrievedChunks`. If `$retrievedChunks` is empty or bypassed, verification fails or abstains.
2. **Absence of Evidence is Never Contradiction**: Out-of-domain entities (Django, Rust, Kubernetes) yield low relevance and 0 evidence $\to$ `NOT_ESTABLISHED`.
3. **Absence of Rule is Never Supported**: If curriculum evidence does not confirm an asserted premise, it remains `NOT_ESTABLISHED`.
4. **No Benchmark Blacklists**: Zero regex rule tables hardcoded to match specific benchmark queries. All refutations cite the exact sentence from `$retrievedChunks`.

---

## 4. Safe Generation Policy Integration

In `backend/rag_service.php`:
- **`REFUTED`**: Immediate grounded correction using the contradictory sentence and citation from the retrieved chunk. Model generation bypassed to prevent hallucination.
- **`NOT_ESTABLISHED`**: Safe educational refusal:
  > *"I do not have enough evidence in the approved course material to establish that claim."*
- **`SUPPORTED`**: Normal grounded educational answer with full chunk context passed to LLM.
