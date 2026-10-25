# EXP-0015 — ARCHITECTURE RISK & DEPENDENCY MAP

**Evaluated Candidate**: `EXP-0013-CHAMPION-2026-09-09` (Frozen Control)  
**Date**: 2026-09-09  
**Scope**: Complete Static Analysis & Structural Failure Mode Audit across all Gateway, Worker, Engine, and Pipeline Layers.

---

## 1. COMPONENT-BY-COMPONENT DEPENDENCY MAP

```
                                 EDCONNECT RAG ARCHITECTURE PIPELINE
                                 
  [Student / Client]
          │
          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Node.js Gateway Orchestrator (backend/gateway.js : Port 8000)                       │
│    ├─ Port Assignment: Least-load routing (Ports 8001-8006 Fast vs 8007-8008 Gen)      │
│    ├─ Request Buffering: In-memory Buffer.concat()                                     │
│    ├─ Streaming Proxy: Chunked text/event-stream pass-through                           │
│    └─ Process Supervision: child_process.spawn() auto-restart on exit                  │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. In-Memory Embedding Coordinator (backend/embedding_coordinator.js)                   │
│    ├─ LRU Query Cache: 5,000 queries in Map (~15 MB RAM)                               │
│    ├─ In-Flight Coalescing: inFlight Map deduplicating simultaneous identical queries   │
│    └─ Micro-Batching: Dynamic micro-batching (maxBatchSize: 8, window: 2ms)            │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │ Precomputed Vector attached to request payload
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. PHP Worker Pool (8 Asymmetric CLI Workers)                                          │
│    ├─ Tier 1: Fast Search / Stats / Ingest (Ports 8001-8006)                           │
│    └─ Tier 2: Generative LLM Streaming (Ports 8007-8008)                               │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │
       ┌─────────────────────────────┴─────────────────────────────┐
       ▼                                                           ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────────────┐
│ 4. Deterministic Pre-Processors               │ │ 5. Hybrid Retrieval Engine (rag_service.php)  │
│    ├─ Query Condenser (rag_query_condenser.php)│ │    ├─ Dense Cosine Similarity (SQLite BLOBs)   │
│    ├─ Semantic Mapper (rag_semantic_mapper.php)│ │    ├─ Lexical BM25 (Prewarmed In-Memory Index)│
│    ├─ Safety Boundary (rag_safety_boundary.php)│ │    ├─ Reciprocal Rank Fusion (RRF k=60)      │
│    └─ Orchestrator (rag_query_orchestrator.php)│ │    └─ MMR Diversity Reranker (lambda=0.75)   │
└───────────────────────────────────────────────┘ └───────────────────────┬───────────────────────┘
                                                                          │
                                                                          ▼
                                                  ┌───────────────────────────────────────────────┐
                                                  │ 6. Generation & Grounding Boundary            │
                                                  │    ├─ Context Compression (<650 tokens)       │
                                                  │    ├─ Calibrated Confidence Cutoff (0.20/0.35)│
                                                  │    ├─ Grounding & Anti-Sycophancy Verifier    │
                                                  │    └─ Ollama llama3.2:3b Streaming Engine     │
                                                  └───────────────────────────────────────────────┘
```

---

## 2. COMPONENT RISK SPECIFICATIONS

### Component 1: Gateway Orchestrator (`backend/gateway.js`)
* **Input**: HTTP requests from clients on `http://127.0.0.1:8000`.
* **Output**: Reverse-proxied responses from PHP workers with custom headers (`X-Worker-Port`, `X-Embedding-Source`, `X-Gateway-Time-Ms`).
* **Assumptions**: Local PHP binary exists at configured path; ports 8001–8008 are available and unbound.
* **Failure Modes**:
  - Buffer accumulation under slow client uploads.
  - Node event loop blocking if embedding coordinator hangs.
  - Port collision if orphaned PHP workers linger from previous crashes.
* **Timeouts**: No gateway-level request timeout configured (relies on underlying OS TCP keepalive).
* **Fallbacks**: Transparent pass-through of original payload if JSON parsing or embedding coordination throws.
* **Shared State**: `workerLoad` dictionary; active child process PID references.
* **Persistent State**: None (stateless process supervisor).
* **Security Boundary**: Validates `X-Service-Key` header against `SERVICE_KEY`.
* **Resource Dependency**: Node.js V8 heap (~68 MB RAM resident).

---

### Component 2: Embedding Coordinator (`backend/embedding_coordinator.js`)
* **Input**: Raw query string from incoming search/ask request.
* **Output**: 768-dimensional float vector, latency, and source tag (`CACHE`, `COALESCED`, `OLLAMA_BATCH`, `OLLAMA_SINGLE`).
* **Assumptions**: Ollama daemon is reachable on `127.0.0.1:11434` with model `nomic-embed-text` loaded.
* **Failure Modes**:
  - Unbounded queue buildup if Ollama response latency exceeds incoming request arrival rate.
  - Silent fallback: returns `null`, causing PHP worker to fall back to direct curl embedding.
  - Promise leak in `inFlight` map if Ollama socket aborts abnormally without firing error handler.
* **Timeouts**: Native HTTP request timeout relies on Node default.
* **Fallbacks**: Returns `null` on error; caller forwards query un-embedded.
* **Shared State**: `inFlight` Map; `LRUCache` Map (5,000 entries, ~15 MB); batch timer handle.
* **Persistent State**: In-memory LRU cache lost on gateway restart.
* **Security Boundary**: Normalizes whitespace and lowercases string; no input size capping (vulnerable to oversized strings).
* **Resource Dependency**: Minimal Node memory (<20 MB); Ollama GPU VRAM (308.2 MB).

---

### Component 3: Asymmetric PHP Worker Pool (Ports 8001–8008)
* **Input**: HTTP requests forwarded by gateway proxy.
* **Output**: JSON payload or SSE token stream.
* **Assumptions**: Fast workers (8001–8006) never execute LLM generation; Gen workers (8007–8008) handle `/api/rag/ask`.
* **Failure Modes**:
  - SQLite database lock contention (`database is locked`) if multiple Fast workers attempt simultaneous mutations.
  - Worker crash on PHP memory limit (default 128 MB) during large vector array unpacking.
* **Timeouts**: PHP script max_execution_time (default 30s).
* **Fallbacks**: Gateway auto-restarts dead worker process after 1,000 ms.
* **Shared State**: File-level shared SQLite database (`storage/vectors.sqlite`).
* **Persistent State**: SQLite tables (`material_chunks`, `courses`, `users`).
* **Security Boundary**: Enforces service key validation in `auth_middleware.php`.
* **Resource Dependency**: 8 separate PHP CLI processes (~25 MB RSS each $\approx 200$ MB RAM).

---

### Component 4: Deterministic Pre-Processors (`rag_query_condenser.php`, `rag_semantic_mapper.php`, `rag_safety_boundary.php`)
* **Input**: User query string and conversation history array.
* **Output**: Canonicalized, expanded query string, detected curriculum entities, and safety flags.
* **Assumptions**: Curriculum scope is strictly confined to the 5 courses (React, Node, Postgres, JS, CSS).
* **Failure Modes**:
  - **Entity Blindspot**: Unlisted concepts (e.g. Zod, Tailwind, Docker) fail anaphora replacement because they are not in `$curriculumEntities`.
  - **Blocklist Evasion**: Unlisted technologies (e.g. Haskell, Zig, WebGPU) bypass `$unsupportedTechnologies` and enter retrieval pipeline.
  - **Catastrophic Regex Backtracking (ReDoS)**: Complex nested quantifiers could cause CPU spikes on malicious strings (audited in Suite 11, found safe).
* **Timeouts**: Deterministic execution (< 5 ms, no external calls).
* **Fallbacks**: Returns raw query string unchanged if no pattern matches.
* **Shared State**: Static in-memory dictionaries.
* **Persistent State**: Hardcoded PHP arrays.
* **Security Boundary**: First line of defense against out-of-domain queries and prompt injections.
* **Resource Dependency**: Negligible CPU/RAM.

---

### Component 5: Hybrid Retrieval Engine (`backend/rag_service.php`)
* **Input**: Processed query string and optional precomputed 768-dim embedding vector.
* **Output**: Ranked array of semantic chunks with cosine similarity, BM25 score, and fused RRF score.
* **Assumptions**: Prewarmed corpus is synchronized with SQLite database; vector dimension is exactly 768.
* **Failure Modes**:
  - **Keyword Bias**: Overlapping keywords in different topics distort BM25 rankings (demonstrated in Suite 02).
  - **Punctuation Blindspot**: Non-alphanumeric queries project into vector space with cosine score $\ge 0.20$, causing non-empty retrieval instead of abstention (demonstrated in Suite 01).
* **Timeouts**: None internal to search core.
* **Fallbacks**: If dense search produces no results, returns pure BM25; if precomputed embedding is missing, falls back to direct curl to Ollama.
* **Shared State**: In-memory `$prewarmedCorpus` array per PHP process.
* **Persistent State**: SQLite `material_chunks` table.
* **Security Boundary**: Query parameters sanitized via PDO prepared statements.
* **Resource Dependency**: CPU for vector dot-products; RAM for 105 in-memory chunk embeddings (~600 KB per process).

---

### Component 6: Generation & Grounding Boundary (`backend/rag_service.php`)
* **Input**: User question, retrieved chunk context (<650 tokens), conversation history.
* **Output**: Synthesized answer with inline citations or standard abstention statement.
* **Assumptions**: Retrieved chunks contain ground truth facts; Ollama 3B model adheres to negative instructions.
* **Failure Modes**:
  - **Sycophancy**: Model rationalizes false premises introduced with "Why does..." in 70.0% of cases (demonstrated in Suite 03).
  - **Citation Incompleteness**: Model states correct facts but omits inline bracketed citations in 46.4% of claims.
* **Timeouts**: Ollama HTTP connection timeout.
* **Fallbacks**: Returns calibrated confidence abstention if top similarity < 0.20 or composite separation < 0.35.
* **Shared State**: None.
* **Persistent State**: None.
* **Security Boundary**: Wraps context in `<context>...</context>` XML tags to resist indirect injection.
* **Resource Dependency**: GPU VRAM (2,210.4 MB for `llama3.2:3b`).

---

## 3. STATIC CODE VULNERABILITY AUDIT

| Vulnerability / Seam | Inspection Target | Severity | Status | Technical Root Cause & Confirmation |
|---|---|---|---|---|
| **PHP `empty("0")` Falsy Coercion** | `rag_service.php` line 523 | LOW | **CONFIRMED** | `empty($query)` returns true when query is `"0"`, triggering HTTP 400 Bad Request on valid numeric queries. |
| **Non-Alphanumeric Gate Bypass** | `rag_service.php` line 530 | MEDIUM | **CONFIRMED** | Missing alphanumeric regex validation allows punctuation strings (`"???"`, `"!!!"`) to generate embedding vectors and retrieve arbitrary chunks. |
| **Static Blocklist Architecture** | `rag_safety_boundary.php` line 8 | MEDIUM | **CONFIRMED** | Safety boundary uses a denylist of 35 technologies; unlisted technologies (e.g. Zig, Erlang, WebGPU) bypass blocklist and depend entirely on score cutoffs. |
| **Hardcoded Entity Catalog** | `rag_query_condenser.php` line 8 | MEDIUM | **CONFIRMED** | Only 20 hardcoded curriculum concepts exist in `$curriculumEntities`. New course materials cannot resolve pronouns without code edits. |
| **RRF Lexical Over-Weighting** | `rag_service.php` line 250 | HIGH | **CONFIRMED** | Reciprocal Rank Fusion ($k=60$) over-prioritizes chunks sharing multiple common keywords even when dense semantic intent points to a distinct mechanism. |
| **Zero Verification on Presuppositions** | `rag_service.php` line 920 | HIGH | **CONFIRMED** | System prompt instructs model to be helpful, causing 70.0% sycophantic acceptance when queries ask "Why does [false premise] happen?". |
| **Oversized Request Memory Buffering** | `gateway.js` line 95 | MEDIUM | **CONFIRMED** | Gateway buffers entire request body into RAM with `Buffer.concat()` before parsing, creating memory amplification under large payload floods. |
| **Single-GPU Worker Thread Saturation** | `gateway.js` line 14 | HIGH | **CONFIRMED** | At concurrency $\ge 128$, single GPU model inference becomes the system bottleneck, escalating p50 latency from 484 ms to 1,127 ms. |
| **Evaluator Response String Leak** | `blind_benchmark_runner.js` | LOW | **CONFIRMED** | Benchmark evaluator searches raw JSON response string, inadvertently matching `original_query` echo rather than model answer text. |
