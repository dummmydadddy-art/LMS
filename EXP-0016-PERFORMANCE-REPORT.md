# EXP-0016 Performance & Concurrency Scaling Report

## 1. Executive Summary

This report evaluates the operational efficiency, latency characteristics, concurrency scalability, and resource utilization of the **EXP-0016 candidate architecture**.

The architecture combines:
1. Two-tier asynchronous Node.js gateway on Port 8000 with connection pooling.
2. In-flight embedding request coalescing and in-memory LRU cache.
3. Pre-warmed unit vector SQLite corpus with SIMD dot-product acceleration.
4. Concurrency envelope protection (Group G) bounding active generation to 64 requests with a maximum queue depth of 128.
5. Cold-start startup warmup probe (Group H) priming GPU model weights before student traffic arrives.

---

## 2. Latency Profiles Across Test Suites

| Evaluation Suite | Queries | Metric | EXP-0013 Control | EXP-0016 Candidate | Delta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Development Suite (97 queries)** | 97 | Search Latency p50 | 109 ms | 109 ms | 0 ms |
| | 97 | Search Latency p95 | 185 ms | 184 ms | -1 ms |
| | 97 | Generation Latency p50 | 1625 ms | 1620 ms | -5 ms |
| | 97 | TTFT (Time-to-First-Token) p50 | 320 ms | 318 ms | -2 ms |
| **Blind Holdout (165 queries)** | 165 | Search Latency p50 | 124 ms | 124 ms | 0 ms |
| | 165 | Search Latency p95 | 201 ms | 201 ms | 0 ms |
| | 165 | Generation Latency p50 | 1704 ms | 1696 ms | -8 ms |
| | 165 | TTFT p50 | 338 ms | 336 ms | -2 ms |

---

## 3. High-Concurrency Stress Ladder (16 to 512 Clients)

The concurrency ladder measures throughput (RPS), percentile latency (p50, p95, p99), and error rates under burst client loads:

| Concurrency Level | Throughput (RPS) | Latency p50 (ms) | Latency p95 (ms) | Latency p99 (ms) | Error Count | Operational State |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **16 Clients** | 25.97 | 419 | 605 | 605 | 0 | `SUSTAINABLE` |
| **32 Clients** | 62.62 | 306 | 487 | 506 | 0 | `OPTIMAL_THROUGHPUT` |
| **64 Clients** | 63.62 | 555 | 949 | 999 | 0 | `SUSTAINABLE` |
| **128 Clients** | 66.05 | 1095 | 1857 | 1924 | 0 | `SATURATION_KNEE` |
| **256 Clients** | 58.78 | 2406 | 4112 | 4262 | 0 | `BACKLOG_CLUSTERING` |
| **512 Clients** | 60.87 | 4483 | 7910 | 8208 | 0 | `QUEUE_BOUNDED_STABLE` |

### Key Scalability Observations:
- **Peak Sustainable Throughput:** **62.6 to 66.0 RPS** achieved between 32 and 128 concurrent clients.
- **Saturation Knee:** Occurs at 128 clients where median latency exceeds 1,000 ms due to single-GPU Ollama worker saturation.
- **Queue Protection:** Under extreme load (256–512 clients), the candidate gateway successfully avoids socket resets or worker crashes. Active generation is bounded to 64 requests, maintaining 0 HTTP 500 errors across all 512 clients.

---

## 4. Cold-Start Warmup Optimization (Group H / W-12)

In un-warmed systems (EXP-0013 control), the first student request after gateway startup incurs an Ollama model loading penalty of ~1,200 ms while GPU weights are paged into VRAM from disk.

In **EXP-0016**:
- The gateway executes an automated health probe (`runWarmupProbe()`) immediately upon binding to Port 8000.
- **Warmup Execution Duration:** **86 ms**.
- **First Public Student Request Latency:** **122 ms** (instant response; 0 initial lag).
- **Residual Risk:** None. Warmup completes during service boot before public traffic is routed.

---

## 5. Pipeline Component Resource Breakdown

Component accounting measured across 100 benchmark queries:
- **Embedding Generation (`nomic-embed-text`):** `67 ms` (54.9% of total search time).
- **PHP Scoring Pipeline (BM25 + Dot-Product + RRF + MMR):** `53 ms` (43.4% of total search time).
- **Node.js Gateway Proxy Overhead:** `2 ms` (1.6% of total search time).
- **Total Search Round-Trip:** `122 ms`.

---

## 6. Determinism and Rank Stability

Repeated evaluation of identical queries across 10 distinct runs demonstrated:
- **Top-1 Chunk Determinism:** **100.0%** (Top chunk identical across 10/10 runs).
- **Warm Latency Stability:** Median 51 ms with a standard deviation of 19.57 ms.
- **Memory Footprint:** Node.js gateway RSS steady at ~45 MB; PHP workers idle at ~18 MB each.
