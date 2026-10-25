# EXP-0030: Dynamic Curriculum Vocabulary Audit

**File:** `EXP-0030-CURRICULUM-VOCABULARY.json`  
**SHA-256:** `493ef48325ee5d1565e913189f03e97f1494831f34bad62d81e4cfea22958167`  
**Source Database:** `database/rag_materials.sqlite3` (`material_chunks` table)  
**Total Source Chunks:** 23 chunks across 5 curriculum modules  
**Total Vocabulary Terms:** 106 distinct curriculum concepts  
**Date:** 2026-09-16  

---

## 1. Objective & Design Rationale

During the EXP-0029 audit, Component A of the pre-filter was identified as an explicit threat to external validity: it relied on a hardcoded list of 27 external entities (`go`, `mongodb`, `svelte`, `webpack`, etc.). If an out-of-curriculum question mentioned an unlisted framework (e.g., `htmx`, `lit`, `clojure`, `elixir`, `deno`, `bun`), Component A could not fire.

EXP-0030 replaces this static blocklist with a **Dynamic Curriculum Boundary Detector** grounded in `EXP-0030-CURRICULUM-VOCABULARY.json`. The vocabulary is extracted deterministically from the approved curriculum passages in `material_chunks` and models the legitimate domain boundary of the LMS platform.

---

## 2. Curriculum Coverage Breakdown

| Category | Terms Count | Representative Concepts |
|:---|:---:|:---|
| **Core Languages & Runtimes** | 14 | HTML, CSS, JavaScript, ES6, Node.js, V8 Engine, Libuv, Express, React, PostgreSQL, REST, HTTP, JSON, JWT |
| **CSS Layout & Box Model** | 22 | flexbox, CSS Grid, display: flex, display: grid, box-sizing, content-box, border-box, margin, border, padding, flex-direction, justify-content, align-items, flex-wrap, gap, grid-template-columns |
| **HTML Semantic Elements** | 6 | `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>` |
| **JavaScript ES6+ & Asynchrony** | 25 | const, let, var, temporal dead zone, lexical this, arrow functions, destructuring, spread operator, rest parameter, Promise, async/await, microtask, macrotask, event loop, call stack, setTimeout |
| **Node.js & Express Architecture** | 13 | middleware, express.json(), express.Router(), app.use(), req, res, next(), next(err), worker threads, non-blocking I/O |
| **REST & HTTP Protocols** | 14 | GET, POST, PUT, PATCH, DELETE, idempotency, 200 OK, 201 Created, 204 No Content, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error |
| **React Hooks & Components** | 11 | useState, useEffect, useContext, useRef, useMemo, useCallback, dependency array, cleanup function, re-render, Context Provider |
| **PostgreSQL & Database Design** | 21 | ACID, Atomicity, Consistency, Isolation, Durability, primary key, foreign key, 1NF, 2NF, 3NF, B-tree index, composite index, unique index, INNER JOIN, LEFT JOIN, transactions, isolation levels |

---

## 3. Dynamic Decision Rule

For any incoming user query $Q$ with retrieved curriculum evidence passages $E$:
1. Candidate technical entities $\{e_1, e_2, \dots, e_k\}$ in $Q$ are identified via entity pattern extraction (frameworks, databases, libraries, tools, protocols).
2. For each candidate $e_i$:
   - If $e_i \in \text{CurriculumVocabulary}$, then $e_i$ is **KNOWN_CURRICULUM**.
   - If $e_i \notin \text{CurriculumVocabulary}$:
     - Check if $e_i$ appears in the retrieved evidence text $E$.
     - If $e_i \notin E$, then $e_i$ is flagged as **EXTERNAL_UNGROUNDED**.
3. If any candidate entity is **EXTERNAL_UNGROUNDED**:
   $$\text{entity\_status} = \text{'MISMATCH'} \implies \text{pass2\_gate} = \text{'ABSTAIN'}$$
   This suppresses Pass-1 parametric hallucination and blocks Pass-2 contradiction probing, yielding `NOT_ESTABLISHED`.

---

## 4. Integrity & Contamination Verification
- **0 Benchmark Case IDs** referenced.
- **0 Ground-Truth Labels** embedded.
- **0 Specific Test Query Strings** stored.
- Extraction was executed strictly via deterministic lexical and syntactic parsing of `material_chunks` without any LLM in the loop.
