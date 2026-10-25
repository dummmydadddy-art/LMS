# Step 2: Concurrency & Worker Scaling Report

**Experiment ID:** `STEP2-CONCURRENCY-FRANKENPHP`  
**Date:** October 2, 2026  
**Server Engine:** FrankenPHP v1.12.7 (PHP 8.5.11 ZTS, Caddy v2.11.4 Go Web Server)  
**Port:** `127.0.0.1:8000` (Production LMS RAG Gateway)  
**Worker Configuration:** 24 native concurrent worker threads (`num_threads: 24, max_threads: 24`)  
**Extensions Active:** `curl`, `pdo_sqlite`, `sqlite3`, `openssl`, `mbstring`, `sockets`, `Zend OPcache`  

---

## 1. Executive Summary

In Step 2 of the Evolutionary Scaling Roadmap, we eliminated the single-threaded server concurrency bottleneck that plagued the development setup (`php -S`).

### The Problem in `php -S`
- **Single-Threaded Head-of-Line Blocking:** PHP's built-in web server runs on a single event loop. On Windows, `PHP_CLI_SERVER_WORKERS` is not supported because Windows lacks POSIX `fork()`.
- When Student A ran an inference query (taking 30–45s on `llama3.2`), Student B's query (even a 70ms semantic cache hit or a 4ms stats check) was trapped in the OS socket backlog for up to 45 seconds.

### The Solution: FrankenPHP Adoption
We deployed **FrankenPHP 1.12.7** with embedded PHP 8.5.11 and Caddy v2.11.4 as the primary application server on port 8000.
- FrankenPHP runs Go-managed concurrent worker threads natively on Windows.
- It boots a pool of **24 concurrent worker threads**.
- Incoming HTTP requests are handled concurrently by Goroutines and dispatched to available worker threads without any head-of-line blocking.

---

## 2. Benchmark & Head-to-Head Comparison

We benchmarked single-threaded `php -S` against `FrankenPHP` across two rigorous stress tests using [`tests/rag/runners/test_concurrency.js`](file:///d:/Collage%20project/EduConnect-LMS-Experimental/tests/rag/runners/test_concurrency.js):

| Test Metric | Baseline `php -S` (Port 8000) | FrankenPHP (Port 8000) | Impact / Speedup |
| :--- | :--- | :--- | :--- |
| **Worker Threads** | 1 (Single-threaded) | **24 (Concurrent threads)** | **24x Thread Capacity** |
| **Head-of-Line Blocking** | **BLOCKED** (Fast request waited 317 ms behind search) | **ZERO BLOCKING** (Fast request completed in **4 ms**) | **79x Faster Interleaved Response** |
| **Parallel Burst (10 Requests)**| 2,622 ms total elapsed | **625 ms total elapsed** | **4.2x Faster Burst Completion** |
| **Burst Throughput (10 Reqs)** | 3.81 req/sec | **16.00 req/sec** | **+320% Throughput** |
| **Heavy Burst (20 Reqs)** | ~5,200 ms (estimated) | **1,123 ms total elapsed** | **17.81 req/sec sustained** |
| **Failure Rate / Dropped Reqs**| 0% (but high latency queuing) | **0% (20/20 HTTP 200 OK)** | **100% Reliability** |

---

## 3. Architectural Verification

### Test 1: Interleaving / Non-Blocking Verification
```
Student 1: POST /api/rag/search (Heavy vector computation) ──────────────► [Thread 1] ──► 229 ms
Student 2 (50ms later): GET /api/rag/stats (Health check) ──────────────► [Thread 2] ──► 4 ms!
```
- In `php -S`, Student 2 was blocked until Thread 1 completed.
- In `FrankenPHP`, Student 2 completed in **4 ms**, completely independent of Student 1.

### Test 2: Multi-Student 20-Request Parallel Burst
```
All 20 requests dispatched simultaneously via Promise.all:
  -> Min Latency: 400 ms
  -> Max Latency: 1,119 ms
  -> Average Latency: 849.9 ms
  -> Total Wall-Clock Time: 1,123 ms
  -> Throughput: 17.81 requests / second
```

---

## 4. Production Configuration & State

- **Binary Location:** `EduConnect-LMS-Experimental/bin/frankenphp.exe`
- **Configuration:** `EduConnect-LMS-Experimental/bin/php.ini`
- **Listener:** `127.0.0.1:8000`
- **Status:** Background daemon task active, serving `/api/rag/ask`, `/api/rag/search`, `/api/rag/stats`, `/api/rag/flags`.

---

## 5. Transition to Step 3

With **Step 1 (Scaled Knowledge Base)** and **Step 2 (Concurrent Worker Scaling via FrankenPHP)** fully complete:
- Knowledge base: 1,323 chunks, 100% HitRate@3, 133ms vector retrieval.
- Web server: 24 concurrent worker threads, 0 head-of-line blocking, 17.81 req/sec.
- **Next Step:** Proceed to **Step 3 (External CI/CD Harness: DeepEval / RAGAS with External Judge Model)** for unbiased automated RAG evaluation.
