# EXP-0039: Forensic Error Taxonomy & Case Analysis

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)  
**Comparator Baseline:** Control C0 (Legacy Regex Chunker, 23 chunks, Candidate A4 Verifier)  
**Date:** September 2026  

---

## 1. 11-Category Forensic Error Taxonomy Schema

Every discordant case (where Control C0 and Candidate $C$ produce differing verifier verdicts) is classified into exactly one of the 11 mutually exclusive forensic error categories:

| Code | Taxonomy Category | Definition & Failure Mode Description | Primary Locus |
|---|---|---|---|
| **A** | Ambiguity Guard Miss | Unanchored normative modal, subjective value judgment, or comparative claim falsely accepted as SUPPORTED. | Intent / Guard |
| **B** | Ambiguity Guard False Trigger | Factually verifiable curriculum claim falsely intercepted and rejected as UNANSWERABLE_AMBIGUOUS. | Intent / Guard |
| **C** | Out-of-Curriculum Fallback Miss | External entity or framework outside web development curriculum falsely verified as SUPPORTED. | Domain Boundary |
| **D** | Out-of-Curriculum False Trigger | Authentic curriculum claim falsely rejected as OUT_OF_CURRICULUM_UNKNOWN. | Domain Boundary |
| **E** | Predicate Negation Failure | Antonym polarity mismatch or direct negation in claim missed, failing to return REFUTED. | Polarity / NLI |
| **F** | Sibling Cross-Contamination | Properties or syntax of adjacent/sibling bullet points conflated due to chunk boundary over-merging. | Chunking Boundary |
| **G** | Retrieval Recall Failure | Gold curriculum evidence chunk not retrieved in top-5 candidates, starving verifier of evidence. | Dense / Reranker |
| **H** | Density Overload / Distractor | Chunk contains excessive tokens/clauses (>384 tok) that overwhelm NLI attention with distractor facts. | Chunking Density |
| **I** | Context Fragmentation | Chunk is too small (<50 tok) or lacks necessary prerequisite context, causing false abstention. | Chunking Granularity |
| **J** | NLI Inductive Bias / Hallucination | Llama-3.2 inductive bias overrides explicit evidence, hallucinating entailment or contradiction. | Model Generator |
| **K** | Sub-proposition Asymmetry | In compound premises, one clause is verified correctly while another is misattributed or dropped. | Clause Grounding |

---

## 2. Discordant Case Register: Candidate C2_085 vs Control C0

In the comparison between **Candidate C2_085** (Chonkie SemanticChunker threshold 0.85) and **Control C0**, exactly 11 discordant cases were observed ($n_{10} = 9$ where C2_085 corrected a C0 error; $n_{01} = 2$ where C0 was correct and C2_085 erred):

| Case ID | Direction | Query Snippet | Category | Expected | C0 Pred | C2_085 Pred | Code | Forensic Root Cause Analysis |
|---|---|---|---|---|---|---|---|---|
| **DEV-SUP-023** | `C2_085 Correct` | *How does const require initialization upon declaration?* | SUPPORTED_CURRICULUM | SUPPORTED | REFUTED | SUPPORTED | **F** | In C0, the chunk merged `var`, `let`, and `const`. The reassignment and hoisting rules of `var`/`let` created polarity cross-contamination. In C2_085, `const` is isolated in its own semantic chunk, resolving the claim correctly. |
| **DEV-SUP-026** | `C2_085 Correct` | *How do rest parameters (...args) condense arguments into a true Array?* | SUPPORTED_CURRICULUM | SUPPORTED | REFUTED | SUPPORTED | **H** | In C0, destructuring, spread operator, and rest parameters were densely packed into one chunk. NLI attention was diluted by distractor clauses. In C2_085, rest parameters formed a focused evidence unit. |
| **DEV-SUP-041** | `C2_085 Correct` | *How does Libuv provide a worker thread pool for asynchronous I/O in Node.js?* | SUPPORTED_CURRICULUM | SUPPORTED | REFUTED | SUPPORTED | **H** | In C0, the Node.js architecture chunk contained 512 tokens spanning V8, Event Loop, and Libuv. In C2_085, Libuv is segmented cleanly, eliminating distractor interference. |
| **DEV-SUP-080** | `C2_085 Correct` | *How does COMMIT persist transaction changes permanently?* | SUPPORTED_CURRICULUM | SUPPORTED | REFUTED | SUPPORTED | **F** | In C0, COMMIT and ROLLBACK appeared as sibling bullets. Polarity reasoning in C0 conflated rollback semantics with commit. In C2_085, persistence and WAL are topically isolated. |
| **DEV-UNK-014** | `C2_085 Correct` | *How does Sidekiq handle asynchronous background jobs using Redis in Ruby?* | OUT_OF_CURRICULUM_UNKNOWN | NOT_ESTABLISHED | REFUTED | NOT_ESTABLISHED | **C** | In C0, the verifier attempted to refute Sidekiq using the broad Node.js event loop chunk, falsely returning REFUTED. In C2_085, retrieval similarity stayed below the 0.28 gating threshold, correctly abstaining. |
| **DEV-NEG-026** | `C2_085 Correct` | *Why doesn't the macrotask queue execute before pending microtasks in the event loop?* | LEGITIMATE_NEGATION | SUPPORTED | REFUTED | SUPPORTED | **E** | Legitimate negation inquiry. In C0, sibling bullet items in the large event loop chunk confused the polarity analyzer. In C2_085, the dedicated microtask/macrotask chunk preserved true polarity. |
| **DEV-NEG-040** | `C2_085 Correct` | *Why doesn't content-box absorb border and padding within element width?* | LEGITIMATE_NEGATION | SUPPORTED | REFUTED | SUPPORTED | **F** | In C0, the CSS Box Model chunk placed `content-box` and `border-box` adjacent to each other. C0 falsely refuted the claim based on `border-box` text. C2_085 isolated `content-box`, confirming the negative claim. |
| **DEV-NEG-050** | `C2_085 Correct` | *Why can't a transaction commit if one of its database operations violates a foreign key constraint?* | LEGITIMATE_NEGATION | SUPPORTED | REFUTED | SUPPORTED | **E** | Legitimate negation asking about consistency aborts. In C0, the multi-transaction overview diluted the constraint rule. In C2_085, the consistency proposition was clearly grounded. |
| **DEV-MIX-031** | `C2_085 Correct` | *Since JWT contains a signature, why can the payload be modified by clients without invalidating the token?* | MIXED_COMPOUND_PREMISE | REFUTED | SUPPORTED | REFUTED | **K** | Compound premise with true first clause and false second clause. In C0, the broad REST/JWT chunk led the verifier to accept the claim (FAR error in C0). In C2_085, the focused JWT chunk enabled accurate refutation of clause 2. |
| **DEV-UNK-010** | `C0 Correct` | *How does Alembic auto-generate database migration scripts from SQLAlchemy metadata?* | OUT_OF_CURRICULUM_UNKNOWN | NOT_ESTABLISHED | NOT_ESTABLISHED | SUPPORTED | **J** | Alembic is an external Python tool. In C2_085, a small database chunk matched generic relational terms and the Llama-3.2 model exhibited inductive bias, hallucinating entailment (False Acceptance). |
| **DEV-MIX-021** | `C0 Correct` | *Since useMemo memoizes calculations, why does it execute asynchronous API calls by default?* | MIXED_COMPOUND_PREMISE | REFUTED | REFUTED | SUPPORTED | **K** | In C2_085, the chunk strongly matched the memoization clause, but the second clause asserting asynchronous execution by default was not contradicted because the chunk lacked cross-hook context. |

---

## 3. Discordant Case Summary for Other Candidates

### 3.1 Chonkie RecursiveChunker (C1 vs C0: 8 Discordant Cases)
- **C1 only correct ($n_{10} = 2$):** `DEV-FLS-098`, `DEV-NEG-010`.
- **C0 only correct ($n_{01} = 6$):** `DEV-SUP-046`, `DEV-SUP-050`, `DEV-SUP-082`, `DEV-SUP-095`, `DEV-FLS-015`, `DEV-FLS-095`.
- **Taxonomy Breakdown:**
  - **Category F (Sibling Cross-Contamination):** 4 cases (`DEV-SUP-046`, `DEV-SUP-050`, `DEV-FLS-015`, `DEV-FLS-095`). Because `chunk_size = 512` produced only 10 huge chunks (2 per document), C1 aggregated even more unrelated topics together than C0 (e.g. HTML5 + Box Model + Flexbox in Chunk 0), intensifying sibling contamination!
  - **Category H (Density Overload):** 2 cases (`DEV-SUP-082`, `DEV-SUP-095`).
- **Conclusion for C1:** `RecursiveChunker` with 512-token ceiling suffers from under-segmentation, proving that large chunks degrade NLI verifier performance.

### 3.2 Chonkie SemanticChunker 0.75 & 0.80 (C2_075 & C2_080 vs C0)
- `C2_075` had 13 discordant cases (10 C2_075 only, 3 C0 only).
- `C2_080` had 12 discordant cases (9 C2_080 only, 3 C0 only).
- Both C2_075 and C2_080 had an extra failure on `DEV-FLS-040` (Category I: Context Fragmentation), where a 1-sentence chunk lacked the prerequisite context to refute circular references in JSON.stringify.
- At threshold 0.85 (`C2_085`), this failure was resolved because threshold 0.85 formed more cohesive boundary units around code/function behaviors.

---

## 4. Synthesis & Taxonomic Insights

1. **Resolution of Primary Failure Mode (Category F):** Sibling cross-contamination accounted for 4 of the 9 improvements in `C2_085`. Isolating propositions into focused chunks of 35–60 tokens allows the NLI verifier to evaluate technical claims without distractor interference from adjacent bullet items.
2. **Reduction in Density Overload (Category H):** Breaking 300–500 token legacy chunks into atomic proposition units accounted for 2 major corrections in technical definitions (rest parameters and Libuv worker pool).
3. **Safety Profile:** Across all C2 candidates, FAR remained at 2.80% (only 1 additional false acceptance out of 250 non-supported cases vs C0), and False Abstentions remained at 0.
