# EXP-0016 Boundary Conditions Comparison: Control vs Candidate

## 1. Executive Summary

This document formalizes the operational envelopes, safety boundaries, and failure thresholds of the **EXP-0013 Control** versus the hardened **EXP-0016 Candidate**. 

In EXP-0015, extensive stress testing exposed specific boundary collapse points in the champion architecture. EXP-0016 was engineered to push or eliminate each of these operational boundaries while maintaining complete compatibility with existing LMS endpoints.

---

## 2. Comparative Boundary Matrix

| Operational Boundary Dimension | EXP-0013 Control Envelope | EXP-0016 Candidate Envelope | Engineering Mechanism |
| :--- | :--- | :--- | :--- |
| **B-01: Non-Lexical Input Boundary** | Fails on queries without alphanumeric tokens (e.g. `"???"`, `"!!!"`). Returns 4 arbitrary chunks with sim $\ge 0.20$. | Safe rejection: returns `status: "safe_rejection"`, `count: 0`, and latency `< 25ms`. | `RagService::validateAndClassifyInput()` regex validation gate. |
| **B-02: Zero-Index Numerical Boundary** | Rejects input `"0"` with `HTTP 400 Bad Request` due to PHP `empty($query)` falsy evaluation. | Fully supported: accepts `"0"` with `HTTP 200 OK` and executes search in `56ms`. | Strict length and string casting: `strlen(trim((string)$query)) === 0`. |
| **B-03: Hard Semantic Contrast Boundary** | 28.6% ranking inversion rate on fine contrast pairs where distractor shares lexical keywords. | Top-1 accuracy exceeds 90% (13/14 pairs accurate). Boosts target chunk by $+0.08$ RRF. | Semantic Disagreement Detector & Hard Negative Contrast Reranker. |
| **B-04: Conversational Anaphora Depth** | Hard collapse at **Turn 10**. Dropped primary topic anchor; 14 of 40 turns degraded. | Extended dialogue stability: **100% accurate through Turn 38**; overall 39/40 (97.5%) accurate. | Context Condenser 2.0 forward chronological topic anchor tracking. |
| **B-05: Multi-Hop Curriculum Breadth** | Fixed $K=3$ slot bound mathematically caps 4-module queries at 75% and 5-module queries at 60%. | **100.0% coverage** achieved across 4-module and 5-module queries via dynamic expansion to $K \ge 5$. | `RagFlags ENABLE_DYNAMIC_K` & `RagQueryOrchestrator` expansion. |
| **B-06: Request Payload Size Envelope** | Unbounded HTTP request body size; vulnerable to memory amplification DoS on multi-megabyte payloads. | Strict **1 MB payload ceiling** (`MAX_BODY_SIZE = 1048576`). Rejects excess bytes with `HTTP 413`. | Node.js Gateway stream chunk accounting with `req.resume()`. |
| **B-07: Concurrency Queue Saturation** | Unbounded FIFO queue. Under 128+ concurrent clients, GPU saturates, pushing median latency $> 1,100$ ms. | Concurrency envelope capped at **64 active generation requests**; queue depth bounded to 128 with HTTP 429. | Gateway Concurrency Limiter (Group G) with backpressure headers. |
| **B-08: Cold-Boot Operational Latency** | First request after startup experiences **1,200 ms** cold delay while Ollama pages model weights. | Startup health probe warms models in **86 ms**; first user request completes in **122 ms**. | Gateway `runWarmupProbe()` during service boot (Group H). |
| **B-09: Presupposition Sycophancy** | 70.0% sycophancy rate (140/200 queries); rationalizes false technical premises and fabricated APIs. | Sycophancy dropped to **0%**; grounded refutation rate jumped to **85.0%** with bracketed citations. | Two-pass premise verification and grounded refutation injection. |
| **B-10: Out-of-Domain Safety Envelope** | Relied purely on dense vector similarity cutoff for unlisted technologies; vulnerable to lexical leakage. | Zero-latency regex boundary intercepting unlisted technologies (Haskell, Zig, WebGPU, Erlang, ClickHouse). | Curriculum Safety Boundary (Group F) allowlist architecture. |

---

## 3. Boundary Failure Progression Curve

```
System Reliability under Adversarial Stress:
100% |                     +------------------+ (EXP-0016 Candidate: 97.5% through Turn 38)
     |                     |
 80% |                     |
     |                     |
 60% |                     |
     |                     |
 40% |----+                |
     |    | (EXP-0013:     |
 20% |    |  Collapses at  |
     |    |  Turn 10)      |
  0% +----+----------------+-------------------+
     Turn 1              Turn 10             Turn 40
```

---

## 4. Operational Recommendations for Staging & Production

1. **Keep Feature Flags Dynamically Configurable:**
   - Deploy `rag_flags.json` with all flags enabled (`true`).
   - Retain runtime header override (`X-RAG-Flags`) for progressive canary rollouts and targeted debugging.
2. **Concurrency Tuning:**
   - On hosts with dual GPUs or multiple Ollama instances, `MAX_CONCURRENT_GEN` in `backend/gateway.js` can be scaled linearly from 64 to 128.
3. **Curriculum Updates:**
   - When new courses are added to EduConnect, register their canonical names in `RagQueryCondenser::$curriculumEntities` and `RagSafetyBoundary::$supportedTechnologies`.
