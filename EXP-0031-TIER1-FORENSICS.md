# EXP-0031: Tier-1 False Refutation Forensic Baseline & Error Taxonomy

**Experiment:** EXP-0031 Tier-1 Semantic/Syntactic Decoupling & Clause-Grounded Polarity Disambiguation  
**Baseline Target:** EXP-0030 Mode D3 / EXP-0029 Mode C7 False Refutations on Supported Claims  
**Dataset Source:** `EXP-0030-BLIND-DATASET.json` ($N = 400$)  
**Total Supported Claims Falsely Refuted:** 46 cases ($FAR = 27.88\%$)  
**Date:** 2026-09-16  

---

## 1. Executive Forensic Discovery

In EXP-0029, the error analysis hypothesized that elevated False Alarm Rate ($FAR = 27.88\%$) was caused by over-aggressive second-pass NLI contradiction probing (`B4_probe`).

However, exhaustive forensic tracing of all 46 false refutations across the 165 supported claims in the EXP-0030 blind dataset reveals a starkly different reality:

- **Tier-1 Deterministic Fast Path:** **35 cases (76.09%)**
- **Tier-2 Semantic NLI (Pass 2 Probe):** **10 cases (21.74%)**
- **Tier-2 Semantic NLI (Pass 1 Main):** **1 case (2.17%)**

> [!IMPORTANT]
> **Root Cause Confirmation:** Over three-quarters of false alarms never reached Pass-2 or LLM threshold evaluation. They were prematurely and incorrectly marked as `REFUTED` by Stage 5 deterministic fast-path keyword and antonym matching. This explains why EXP-0030's Pass-2 threshold calibration ($T_{contra} = 0.75$) produced zero change in FAR.

---

## 2. Error Taxonomy Distribution (All 46 Cases)

| Taxonomy Category | Description | All Cases ($N=46$) | Tier-1 Only ($N=35$) | Primary Mechanism |
|---|---|:---:|:---:|---|
| **NEGATION_SCOPE** | Negation/prevention polarity scope inverted (`without`, `avoid`, `prevent`, `cannot`) | 13 (28.3%) | 13 (37.1%) | Stage 5 Fast Path |
| **OTHER** | Tier-2 Semantic NLI over-refutation during Pass-1 or Pass-2 probing | 11 (23.9%) | 0 ( 0.0%) | Stage 5 Fast Path |
| **LEXICAL_COLLISION** | Contextual antonym hit across unrelated proposition contexts | 8 (17.4%) | 8 (22.9%) | Stage 5 Fast Path |
| **SUBJECT_MISMATCH** | Sibling concepts within same topic cross-contaminating (401 vs 403, COMMIT vs ROLLBACK) | 5 (10.9%) | 5 (14.3%) | Stage 5 Fast Path |
| **PREDICATE_MISMATCH** | Antonym applies to distinct grammatical arguments (column atomicity vs transaction atomicity) | 4 ( 8.7%) | 4 (11.4%) | Stage 5 Fast Path |
| **CLAUSE_SCOPE** | Opposite terms located in separate clauses of a qualified technical statement | 2 ( 4.3%) | 2 ( 5.7%) | Stage 5 Fast Path |
| **DISJUNCTION** | Alternative disjunctive claim (`either... or...`) matched against single requirement | 1 ( 2.2%) | 1 ( 2.9%) | Stage 5 Fast Path |
| **ENTITY_MISMATCH** | Cross-entity technical collision (e.g. React batching vs Node.js runtime) | 1 ( 2.2%) | 1 ( 2.9%) | Stage 5 Fast Path |
| **CONDITIONAL** | Opposition inside subordinate conditional clause (`even if...`) | 1 ( 2.2%) | 1 ( 2.9%) | Stage 5 Fast Path |

---

## 3. Comprehensive Per-Case Forensic Audit (All 46 Cases)

| Case ID | Category | Tier | Taxonomy | Matched Trigger / Mechanism | Query Summary | Forensic Root Cause |
|---|:---:|:---:|:---:|---|---|---|
| `EXP30-SUP-0017` | SUPPORTED | Tier 1 | `LEXICAL_COLLISION` | `immutable &lt;=&gt; mutable` | *Does const create an immutable variable identifier binding i...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-SUP-0019` | SUPPORTED | Tier 1 | `LEXICAL_COLLISION` | `block scope &lt;=&gt; function-scoped` | *Does the temporal dead zone exist from entering block scope ...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-SUP-0021` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `arguments` | *Do arrow functions omit the special arguments identifier fro...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0024` | SUPPORTED | Tier 1 | `LEXICAL_COLLISION` | `macrotask &lt;=&gt; microtask` | *Does the JavaScript engine drain all queued microtasks befor...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-SUP-0029` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `arguments` | *Does the spread operator expand iterable collections into in...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0031` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does async function execution always return a Promise resolv...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0036` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `render` | *Does useEffect execute its effect callback after the DOM has...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0040` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `render` | *Does useRef maintain a persistent mutable ref object whose c...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0041` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `render` | *Does updating the current property of a ref object avoid tri...* | Query contains legitimate negation/prevention (&#039;without&#039;, &#039;avoid&#039;, &#039;prevented&#039;) that was misaligned with predicate negation or antonym rule |
| `EXP30-SUP-0042` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `render` | *Does useMemo cache the calculated result of an expensive com...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0043` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `render` | *Does useCallback return a memoized callback function referen...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0045` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `render` | *Does React batch multiple state updates occurring within eve...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0051` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does Node.js rely on the single-threaded V8 engine to execut...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0052` | SUPPORTED | Tier 1 | `LEXICAL_COLLISION` | `asynchronous &lt;=&gt; synchronous` | *Does the libuv library manage the event loop and asynchronou...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-SUP-0055` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Can express.json() parse incoming HTTP request bodies format...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0069` | SUPPORTED | Tier 1 | `LEXICAL_COLLISION` | `idempotent &lt;=&gt; create a new resource` | *Is HTTP PUT considered idempotent because sending identical ...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-SUP-0073` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does status code 201 Created indicate that a new resource ha...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0074` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does status code 400 Bad Request indicate client error due t...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0075` | SUPPORTED | Tier 1 | `SUBJECT_MISMATCH` | `unauthorized &lt;=&gt; forbidden` | *Does status code 401 Unauthorized mean the request lacks val...* | Sibling subject cross-contamination within same topic (e.g. 401 vs 403, COMMIT vs ROLLBACK in same transaction chunk) |
| `EXP30-SUP-0076` | SUPPORTED | Tier 1 | `SUBJECT_MISMATCH` | `forbidden &lt;=&gt; unauthorized` | *Does status code 403 Forbidden indicate that the server refu...* | Sibling subject cross-contamination within same topic (e.g. 401 vs 403, COMMIT vs ROLLBACK in same transaction chunk) |
| `EXP30-SUP-0077` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does status code 404 Not Found indicate that the requested r...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0079` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does a JSON Web Token consist of three base64url segments: h...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-SUP-0082` | SUPPORTED | Tier 1 | `PREDICATE_MISMATCH` | `partial &lt;=&gt; atomic` | *Is HTTP PATCH typically utilized to apply partial modificati...* | Predicate applies to different concepts (table column atomicity in 1NF vs transaction atomicity vs HTTP PATCH partial modification) |
| `EXP30-SUP-0089` | SUPPORTED | Tier 1 | `PREDICATE_MISMATCH` | `atomic &lt;=&gt; partial` | *Does First Normal Form (1NF) require table columns to contai...* | Predicate applies to different concepts (table column atomicity in 1NF vs transaction atomicity vs HTTP PATCH partial modification) |
| `EXP30-SUP-0090` | SUPPORTED | Tier 1 | `PREDICATE_MISMATCH` | `partial &lt;=&gt; atomic` | *Does Second Normal Form (2NF) require removing partial depen...* | Predicate applies to different concepts (table column atomicity in 1NF vs transaction atomicity vs HTTP PATCH partial modification) |
| `EXP30-SUP-0091` | SUPPORTED | Tier 1 | `NEGATION_SCOPE` | `transitive` | *Does Third Normal Form (3NF) mandate eliminating transitive ...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-SUP-0095` | SUPPORTED | Tier 1 | `SUBJECT_MISMATCH` | `commit &lt;=&gt; rollback` | *Does COMMIT finalize all pending database changes made insid...* | Sibling subject cross-contamination within same topic (e.g. 401 vs 403, COMMIT vs ROLLBACK in same transaction chunk) |
| `EXP30-SUP-0096` | SUPPORTED | Tier 1 | `SUBJECT_MISMATCH` | `rollback &lt;=&gt; commit` | *Does ROLLBACK cancel uncommitted modifications made during t...* | Sibling subject cross-contamination within same topic (e.g. 401 vs 403, COMMIT vs ROLLBACK in same transaction chunk) |
| `EXP30-SUP-0099` | SUPPORTED | Tier 2 | `OTHER` | `N/A` | *Does a LEFT JOIN return all rows from the left table alongsi...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-PAR-0003` | PARAPHRASE | Tier 1 | `LEXICAL_COLLISION` | `left to right &lt;=&gt; top to bottom` | *Are flex container descendants naturally lined up from left ...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-PAR-0005` | PARAPHRASE | Tier 2 | `OTHER` | `N/A` | *Does the align-items rule govern positioning along the trans...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-PAR-0008` | PARAPHRASE | Tier 1 | `NEGATION_SCOPE` | `reassign` | *In modern ECMAScript, is variable binding reassignment preve...* | Query contains legitimate negation/prevention (&#039;without&#039;, &#039;avoid&#039;, &#039;prevented&#039;) that was misaligned with predicate negation or antonym rule |
| `EXP30-PAR-0012` | PARAPHRASE | Tier 1 | `LEXICAL_COLLISION` | `macrotask &lt;=&gt; microtask` | *Does the runtime event scheduler exhaust all pending microta...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-PAR-0018` | PARAPHRASE | Tier 1 | `CLAUSE_SCOPE` | `mutable &lt;=&gt; immutable` | *Does assigning new values to a mutable reference object avoi...* | Opposition spans distinct clauses (const identifier binding vs object properties; or ref container vs state) |
| `EXP30-PAR-0020` | PARAPHRASE | Tier 1 | `NEGATION_SCOPE` | `render` | *Are multiple state updates scheduled within event listeners ...* | Predicate negation keyword polarity scope was misattributed |
| `EXP30-PAR-0031` | PARAPHRASE | Tier 2 | `OTHER` | `N/A` | *Does response status code 201 confirm that a requested entit...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-PAR-0035` | PARAPHRASE | Tier 1 | `DISJUNCTION` | `partial &lt;=&gt; atomic` | *Does transaction atomicity guarantee that an entire sequence...* | Query asserts a disjunctive possibility or alternative that collided with a single requirement |
| `EXP30-PAR-0037` | PARAPHRASE | Tier 1 | `PREDICATE_MISMATCH` | `atomic &lt;=&gt; partial` | *Does First Normal Form dictate that each column in a relatio...* | Predicate applies to different concepts (table column atomicity in 1NF vs transaction atomicity vs HTTP PATCH partial modification) |
| `EXP30-PAR-0040` | PARAPHRASE | Tier 1 | `SUBJECT_MISMATCH` | `rollback &lt;=&gt; commit` | *Does issuing a ROLLBACK command restore the database state t...* | Sibling subject cross-contamination within same topic (e.g. 401 vs 403, COMMIT vs ROLLBACK in same transaction chunk) |
| `EXP30-ADV-0007` | ADVERSARIAL | Tier 1 | `NEGATION_SCOPE` | `dynamic this &lt;=&gt; lexical this` | *Can arrow functions be passed as method callbacks without cr...* | Query contains legitimate negation/prevention (&#039;without&#039;, &#039;avoid&#039;, &#039;prevented&#039;) that was misaligned with predicate negation or antonym rule |
| `EXP30-ADV-0011` | ADVERSARIAL | Tier 1 | `CLAUSE_SCOPE` | `mutable &lt;=&gt; immutable` | *Can a functional React component use a ref to store mutable ...* | Opposition spans distinct clauses (const identifier binding vs object properties; or ref container vs state) |
| `EXP30-ADV-0013` | ADVERSARIAL | Tier 1 | `ENTITY_MISMATCH` | `synchronous &lt;=&gt; asynchronous` | *Why does React batch multiple synchronous state setters insi...* | Cross-entity collision: React batching query matched Node.js runtime description, or opposite entity |
| `EXP30-ADV-0015` | ADVERSARIAL | Tier 1 | `LEXICAL_COLLISION` | `asynchronous &lt;=&gt; synchronous` | *Can Node.js process asynchronous file reads via libuv backgr...* | Surface lexical opposition without proposition-level contradiction |
| `EXP30-ADV-0017` | ADVERSARIAL | Tier 2 | `OTHER` | `N/A` | *Does express.json() parse the incoming body stream without e...* | Tier-2 Pass-2 LLM over-refutation on compound or non-literal supported claim |
| `EXP30-ADV-0019` | ADVERSARIAL | Tier 1 | `CONDITIONAL` | `idempotent &lt;=&gt; create a new resource` | *Why is HTTP PUT considered idempotent even if the server upd...* | Opposition occurred inside a conditional subordinate clause (&#039;even if&#039;, &#039;if&#039;, &#039;when&#039;) |
| `EXP30-ADV-0024` | ADVERSARIAL | Tier 1 | `NEGATION_SCOPE` | `transitive` | *Can a table satisfy Second Normal Form without satisfying Th...* | Query contains legitimate negation/prevention (&#039;without&#039;, &#039;avoid&#039;, &#039;prevented&#039;) that was misaligned with predicate negation or antonym rule |

---

## 4. Architectural Requirements for EXP-0031

To eliminate these 35 Tier-1 false refutations while preserving valid refutation recall, the verifier must require:

1. **Entity Compatibility:** The matched evidence unit must share the exact technical focal subject as the query clause, preventing sibling bullet collisions (`commit` vs `rollback`, `401` vs `403`, `align-items` vs `justify-content`).
2. **Predicate Alignment:** Antonym pairs must modify the exact same technical target (e.g. `atomic` applied to table columns in 1NF must not oppose `partial` in database transactions or HTTP PATCH).
3. **Negation Scope Disambiguation:** When a query uses negative polarity (`without`, `avoid`, `prevents`, `cannot be reassigned`), Tier-1 must not treat the presence of an asserted positive capability as an antonym contradiction.
4. **Conditional & Disjunctive Scope:** Propositions containing `even if`, `unless`, `when`, or `or` must evaluate the subordinate clause within its qualified scope.
5. **Conservative Fall-Through:** If structural validation fails or is ambiguous, Tier-1 must emit `NO_DETERMINISTIC_REFUTATION` and allow the query to fall through to pre-filter and Tier-2 NLI rather than issuing a deterministic `REFUTED` verdict.
