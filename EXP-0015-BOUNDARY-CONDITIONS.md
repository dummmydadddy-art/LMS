# EXP-0015 — EMPIRICAL SYSTEM BOUNDARY CONDITIONS

**Evaluated Candidate**: `EXP-0013-CHAMPION-2026-09-09` (Frozen Control)  
**Verification Environment**: Local Dual-Model Architecture on Windows 11 (Intel Core i5-12450H, 16 GB DDR4, RTX 3050 4GB Laptop GPU)  
**Standard**: Every boundary statement in this document is supported by direct empirical data generated in EXP-0015.

---

## 1. CONCURRENCY & THROUGHPUT BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 1**:  
> The system is sustainable up to **64 concurrent clients** under local dual-model GPU execution, achieving a peak throughput of **78.34 RPS** with a median latency of **484 ms** and 0.0% error rate.  
> The saturation knee begins at **128 concurrent clients**, where throughput plateaus at ~76 RPS while median latency doubles to **915–1,127 ms**.  
> At **512 concurrent clients**, the system enters heavy queue backlog with p50 latency reaching **4,568 ms** and p99 latency reaching **8,605 ms**, though 0% of requests are dropped due to Node.js asynchronous buffering.

* **Supporting Evidence**: `results_suite_10_scalability_and_soak.json` and EXP-0014 Suite 18.
* **Production Guardrail**: Deploy gateway rate limiting with a hard cap of **64 active concurrent requests** and a backlog queue timeout of 5 seconds.

---

## 2. CONVERSATIONAL ANAPHORA & TURN DEPTH BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 2**:  
> The system begins conversational retrieval degradation at **Turn 10** when student queries rely strictly on anaphoric pronouns (`"it"`, `"they"`, `"them"`, `"that"`, `"this issue"`) without repeating framework entity nouns.  
> While Turns 1–9 maintain **100% retrieval accuracy**, Turns 10–22 experience a **61.5% retrieval failure rate** (8 of 13 turns displaced to wrong courses like JavaScript ES6 or Node.js) because the deterministic condenser drops the primary topic anchor.  
> Re-anchoring is immediate (**100% recovery**) as soon as the user explicitly introduces a new named technical entity (e.g. Turn 16 `"useRef"` or Turn 23 `"useCallback"`).

* **Supporting Evidence**: `results_suite_04_conversation_breakpoint.json` (40-turn trace).
* **Production Guardrail**: Implement a session memory re-anchoring policy: automatically inject persistent topic headers if dialogue turn count exceeds 8 without explicit framework nouns.

---

## 3. SEMANTIC CONTRAST & HARD-NEGATIVE DISCRIMINATION BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 3**:  
> The system achieves accurate semantic separation on **64.29%** of hard contrast pairs sharing identical keywords within the same module, but suffers from **ranking inversion on 28.57%** and **target displacement on 7.14%** of cases.  
> The system specifically struggles to distinguish:
> 1. Libuv 4-thread pool operations (crypto/zlib/fs) from OS Kernel Epoll network socket I/O in Node.js (inversion).
> 2. Express standard middleware `next('route')` bypass from `next(err)` error propagation (inversion).
> 3. PostgreSQL sequential scan cost trade-offs from B-tree index definitions (inversion).
> 4. PostgreSQL 3NF transitive dependency elimination from general normalization definitions (inversion).
> 5. JavaScript `Object.freeze` immutability from `Object.seal` property modification (displacement).

* **Supporting Evidence**: `results_suite_02_semantic_adversarial.json` (14 contrast pairs).
* **Root Cause**: BM25 keyword overlap dominates the RRF reciprocal score ($k=60$), placing the confuser chunk at Rank 1 despite dense embedding preferences.

---

## 4. FALSE-PREMISE & SYCOPHANCY BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 4**:  
> Across a diverse 200-query adversarial distribution, the system's false-premise resistance is **19.00% Refutation**, with a **70.00% Sycophancy Rate** (false acceptance and rationalization) and **11.00% Defensive Abstention**.  
> Sycophancy varies heavily by query formulation:
> - Direct fabricated APIs (`useEffect.cancel()`): **40.0% Refutation**, 35.0% Sycophancy, 25.0% Abstention.
> - Fabricated function names (`express_verify_jwt_native()`): **25.0% Refutation**, **65.0% Sycophancy**.
> - Presupposition questions ("Why does [false claim] happen?"): **80.0% Sycophancy** (16/20 cases).
> - Mixed true/false assertions: **80.0% Sycophancy** (16/20 cases).

* **Supporting Evidence**: `results_suite_03_false_premise_200.json` (200 cases across 10 categories, 95% CI: [63.3%, 75.9%]).
* **Root Cause**: The 3B model is conditioned to provide helpful answers and assumes user premises in "Why does..." questions are true unless contradicted by explicit chunk text.

---

## 5. DISTRACTOR CONTAMINATION BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 5**:  
> The system is resilient to corpus distractor contamination up to **40%**, maintaining clean target chunk retrieval with distractor intrusion rates $\le 15\%$.  
> Above **50% distractor contamination**, the system experiences a degradation cliff: distractor intrusion jumps to **66.7%**, regularly occupying Rank 1 or Rank 2.  
> However, across all contamination levels from 10% to 90%, the target chunk is never completely lost, achieving **100% Target Hit@3**.

* **Supporting Evidence**: `results_suite_06_context_and_distractor.json` (Contamination sweep from 10% to 90%).

---

## 6. MULTI-HOP MODULE COVERAGE BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 6**:  
> Top-3 retrieval ($K=3$) achieves **100% module coverage** for queries requiring synthesis across 1, 2, or 3 distinct curriculum modules.  
> For complex queries requiring synthesis across 4 modules, Top-3 coverage drops to **75.0%**.  
> For queries requiring synthesis across all 5 modules, Top-3 coverage drops to **60.0%**.  
> Expanding the candidate retrieval window to **$K=5$ restores module coverage to 100%** across all 4-module and 5-module synthesis queries.

* **Supporting Evidence**: `results_suite_05_multihop_breakpoint.json` (16 multi-hop tiers).

---

## 7. CONTEXT WINDOW EVIDENCE DENSITY BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 7**:  
> The optimal evidence window is **3 to 5 chunks** (totaling 350–650 tokens).  
> Expanding context to **$K \ge 8$ chunks** increases search latency by 20% and introduces peripheral, marginally relevant text sections that dilute generation prompt tokens without improving answer accuracy.

* **Supporting Evidence**: `results_suite_06_context_and_distractor.json` (K=1 to 15 scaling).

---

## 8. CORPUS LIFECYCLE & MUTATION BOUNDARY

> **EMPIRICAL BOUNDARY STATEMENT 8**:  
> Corpus document additions, updates, and deletions propagate with a latency of **$< 5\text{ ms}$** into the local SQLite store and are immediately visible to subsequent queries.  
> Deletions leave **0% ghost residue** in SQLite; however, non-lexical or random string queries can match existing corpus vectors if cosine similarity exceeds the global threshold cutoff of 0.20.

* **Supporting Evidence**: `results_suite_08_lifecycle_and_cache.json` and EXP-0014 Suite 15.
