# EXP-0039: Hardware & Execution Plan

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Branch:** `exp-0039`  
**Date:** September 2026  

---

## 1. Execution Hardware Environment

The evaluation harness is designed for offline local execution on consumer-grade developer hardware:

| Component | Specification |
|---|---|
| **CPU** | Intel Core i5-12450H (8 cores: 4 P-cores + 4 E-cores, 16 threads, up to 4.40 GHz) |
| **RAM** | 16 GB DDR4 Dual-Channel |
| **GPU** | NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM) |
| **OS** | Windows 11 Home 64-bit |
| **Python** | Python 3.12.7 64-bit |
| **PHP** | PHP 8.2.12 (CLI, thread-safe) |
| **SQLite** | SQLite 3.45.1 |
| **Ollama** | Ollama v0.3.12 (Model: `llama3.2:latest`, 3.2B parameters) |

---

## 2. Service Daemons & Ports

All neural models run locally in memory via prewarmed daemon processes to ensure deterministic latencies:

1. **Lightweight Python Retrieval Bridge (`backend/retrieval_bridge.py`):**
   - **Port:** `http://127.0.0.1:8100`
   - **Endpoints:**
     - `/embed`: `BAAI/bge-small-en-v1.5` (384-dimensional dense vectors, normalized)
     - `/rerank`: `cross-encoder/ms-marco-MiniLM-L-6-v2` (logit scoring)
     - `/health`: daemon status and device probe
   - **Concurrency:** Single-worker synchronous server, keep-alive connections.

2. **Ollama LLM Daemon (`ollama serve`):**
   - **Port:** `http://127.0.0.1:11434`
   - **Model:** `llama3.2:latest`
   - **Parameters:** `temperature = 0.0`, `num_predict = 25`, `num_thread = 8`, `keep_alive = -1` (persistent in VRAM/RAM).

---

## 3. Windows Runtime Collision & Memory Protections

To avoid OpenMP / MKL / PyTorch dynamic library collisions and access violations on Windows:
```python
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
```

PyArrow is conditionally imported prior to PyTorch to prevent conflicting C-runtime memory allocator faults:
```python
try:
    import pyarrow
    import pyarrow.dataset
except ImportError:
    pass
```

PHP CLI memory limits and execution budgets:
```php
@ini_set('memory_limit', '4G');
@set_time_limit(7200);
```

---

## 4. Compute Budget & Latency Targets

| Stage | Operations | Estimated Duration | Target Latency |
|---|---|---|---|
| **Chunking & Indexing** | Chonkie Recursive & Semantic chunking + BGE embedding (226 total chunks) | ~15 seconds | < 100 ms / chunk |
| **Retrieval Benchmark** | 5 conditions × 400 queries = 2,000 queries (dense + cross-encoder) | ~2.5 - 3 minutes | P50 < 35 ms / query |
| **Verifier Benchmark** | 5 conditions × 400 queries = 2,000 verifier passes (with NLI caching) | ~3 - 4 minutes | P50 < 15 ms / query (cached) |
