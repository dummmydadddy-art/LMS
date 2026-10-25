# EXP-0027: Granular Error Taxonomy & Forensic Failure Analysis

**Experiment:** EXP-0027 Two-Tier Hybrid Verifier  
**Total Failure Cases Recorded:** 3,538 error occurrences across 4 modes  
**Mode A5 Total Errors:** 819 / 2,200 (37.23% error rate)  

---

## 1. Quantitative Error Taxonomy (Mode A5)

| Error Classification | Count | Pct of Errors | Primary Mechanism |
|---|---|---|---|
| **Semantic Contradiction Miss** | 236 | 28.8% | Tier-2 NLI model predicted `ENTAILMENT` or high-confidence match for subtle false premises. |
| **Insufficient Evidence (Abstention)** | 224 | 27.3% | Tier-2 NLI model returned `NEUTRAL` (confidence < 0.70), causing fallback to `NOT_ESTABLISHED`. |
| **Polarity Error (Tier-1)** | 140 | 17.1% | Legitimate negative constraints or syntax negation inverted polarity in Tier-1. |
| **Timeout / Communication Fallback** | 131 | 16.0% | Zero-confidence fallback due to strict threshold or unparseable JSON from model. |
| **NLI Model Error (Structural)** | 45 | 5.5% | Ambiguity in question clause parsing or multiple conflicting proposition clauses. |
| **Semantic False Contradiction** | 31 | 3.8% | Model falsely declared `CONTRADICTION` on valid supported curriculum claims. |
| **Routing Error** | 11 | 1.3% | Erroneous Tier-1 bypass or premature short-circuit. |
| **Insufficient Evidence (Tier-1)** | 2 | 0.2% | Max retrieval similarity < 0.28. |

---

## 2. Top 3 Systemic Failure Modes in EXP-0027

### Failure Mode 1: Zero-Shot NLI Conservatism / Abstention (n = 224, 27.3%)
- **Manifestation:** llama3.2:latest frequently outputs `NEUTRAL` when the premise does not explicitly mention the negated attribute by name, even if it is logically incompatible.
- **Example Case `LEAVEOUT-HTML_CSS-015`:**
  - *Query:* "Why does HTML5 require that <footer> elements be placed exclusively at the top of a page?"
  - *Retrieved Passage:* "HTML & CSS Fundamentals: <footer>: Contains author information, copyright, or footer links."
  - *Model Output:* `{"label": "NEUTRAL", "confidence": 0.55}`
  - *Diagnostic:* The curriculum chunk states what `<footer>` contains, but does not explicitly assert "<footer> is never placed at the top". Because the prompt instructs *"Do not assume unstated facts"*, the model conservatively abstains rather than inferring positional contradiction.

### Failure Mode 2: Semantic Contradiction Misses (n = 236, 28.8%)
- **Manifestation:** When a query embeds a subtle false premise within a structurally complex sentence, the NLI model focuses on lexical overlap with the premise and outputs `ENTAILMENT`.
- **Example Case `OOD-REF-0025`:**
  - *Query:* "Does the HTTP 404 status code indicate that the server experienced an unexpected internal crash?"
  - *Retrieved Passage:* "Node.js & Express: Standard HTTP Status Codes: 404 Not Found: Requested resource does not exist. 500 Internal Server Error: Unhandled server failure."
  - *Model Output:* `{"label": "ENTAILMENT", "confidence": 0.85}`
  - *Diagnostic:* The model saw "HTTP", "status code", "server", and "error" in the retrieved passage and predicted `ENTAILMENT`, failing to distinguish 404 (Not Found) from 500 (Internal Server Error).

### Failure Mode 3: Paraphrase Inversion & Polarity Misalignment (n = 140, 17.1%)
- **Manifestation:** Questions utilizing colloquial double negatives or indirect causal framing confuse Tier-1 proposition extraction before reaching Tier-2.
- **Example Case `POLARITY-LEGIT-045`:**
  - *Query:* "Can you explain why React components don't prevent state updates from batching?"
  - *Result:* Falsely classified as `REFUTED` because the double negation pattern ("don't prevent... from batching") triggered conflicting polarity tokens.

---

## 3. Comparison with Baseline A0 Failures

In Mode A0 (Tier-1 only), failures were dominated by **lexical rule misses (n = 418)** and **insufficient evidence short-circuits (n = 265)**.
Tier-2 NLI eliminated over 60% of these lexical misses, replacing them with semantic evaluations. However, Tier-2 introduced its own failure mode: model abstention and threshold conservatism.
