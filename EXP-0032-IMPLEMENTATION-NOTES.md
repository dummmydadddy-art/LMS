# EXP-0032: Phase 2 Implementation Notes

**Experiment ID:** EXP-0032  
**Branch:** `exp-0032`  
**Parent Commit:** `01d6220` (EXP-0031 E4)  
**Date:** 2026-09-16  
**Status:** Phase 2 Implementation Complete & Verified  

---

## 1. System Architecture & Components

The EXP-0032 retrieval architecture introduces an isolated, local inference bridge and adapter layer while strictly preserving the frozen **EXP-0031 E4** verifier contract.

### 1.1 Python Inference Bridge (`backend/retrieval_bridge.py`)
- **Runtime:** Python 3.12.10 with standard library `HTTPServer` (zero additional server dependencies).
- **Binding:** `http://127.0.0.1:8100`
- **Supported Endpoints:**
  - `POST /embed` — Batched text embedding generation with L2 normalization.
  - `POST /rerank` — Cross-encoder pairwise query-document scoring.
  - `GET /health` — Telemetry and model loading state.
  - `GET /models` — Model catalog and capability metadata.
- **Lazy Loading:** Cross-encoder reranker remains unloaded until explicitly requested by `/rerank`, preventing idle memory consumption.
- **Windows Runtime Invariant:** Enforces `os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"` and safe import ordering (`pyarrow` before `torch`) to prevent OpenMP runtime collision access violations.

### 1.2 Retrieval Adapter (`backend/exp0032_retrieval.php`)
- Implements class `Exp0032Retrieval` with static method `search($query, $mode, $limit, $threshold)`.
- Implements Modes **R0, R1, R2, R3, R4**.
- Exposes a unified result schema across all modes:
  ```json
  {
    "id": "string",
    "title": "string",
    "content": "string",
    "similarity": 0.0,
    "rank": 1,
    "retrieval_method": "dense|bm25|hybrid|reranked",
    "metadata": {}
  }
  ```
- Strips internal embedding vectors before returning results to preserve verifier memory boundaries.

---

## 2. Models & Model Lock Specification

Refer to [`EXP-0032-MODEL-LOCK.json`](file:///d:/Collage%20project/EduConnect-LMS-Experimental/EXP-0032-MODEL-LOCK.json) for the machine-readable version lock.

| Component | Model Identifier | Hugging Face Git Revision | Parameters | Dimension | Max Seq Length | Device | Dtype |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Embedding** | `BAAI/bge-small-en-v1.5` | `5c38ec7c405ec4b44b94cc5a9bb96e735b38267a` | 33,360,512 | 384 | 512 | CPU | float32 |
| **Secondary Embedding**| `intfloat/e5-small-v2` | `ffb93f3bd4047442299a41ebb6fa998a38507c52` | 33,360,512 | 384 | 512 | CPU | float32 |
| **Baseline Embedding** | `nomic-embed-text:latest`| Ollama local store | 137,000,000 | 768 | 2048 | Ollama | F16 |
| **Primary Reranker** | `cross-encoder/ms-marco-MiniLM-L-6-v2` | `233902d25c440f23af6f7d6e94d2946bac0bee0a` | 22,714,113 | N/A (Scalar) | 512 | CPU | float32 |

### Software Environment
- `torch`: `2.9.1+cpu`
- `transformers`: `5.11.0`
- `sentence-transformers`: `5.5.1`
- `pyarrow`: `24.0.0`
- `huggingface-hub`: `0.29.1`

---

## 3. Dedicated Benchmark Storage (`material_chunks_exp0032`)

- **Database:** `database/rag_materials.sqlite3`
- **Table:** `material_chunks_exp0032`
- **Schema:**
  ```sql
  CREATE TABLE material_chunks_exp0032 (
      id TEXT,
      material_id TEXT,
      course_id TEXT,
      batch_id TEXT,
      chunk_index INTEGER,
      source_document TEXT,
      title TEXT,
      content TEXT,
      embedding_model TEXT,
      embedding_dim INTEGER,
      embedding BLOB,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, embedding_model)
  );
  ```
- **Corpus Integrity Verification:**
  - Total source curriculum chunks: **23** (5 documents: HTML/CSS, JS ES6+, React, Node, PostgreSQL).
  - Stored chunks for `BAAI/bge-small-en-v1.5`: **23/23** (384 dimensions, 1536 bytes/blob, 0 duplicates, 0 missing).
  - Stored chunks for `intfloat/e5-small-v2`: **23/23** (384 dimensions, 1536 bytes/blob, 0 duplicates, 0 missing).
  - Baseline table `material_chunks` and baseline database `backend/storage/vectors.sqlite` are **100% untouched**.

---

## 4. Hardware Telemetry & Measured Resource Consumption

All figures represent **actual empirical measurements** on the target hardware (Intel Core i5-12450H, 16 GB RAM, RTX 3050 Laptop GPU):

| Metric | Measured Value | Assessment |
| :--- | :--- | :--- |
| **BGE-Small Initial Load Time** | 132.7 s (includes HF download/cache verification) | Subsequent loads: < 1.2 s |
| **BGE-Small RAM Delta** | **241.41 MB** | Ultra-compact host memory footprint |
| **BGE-Small Peak Process RAM** | **479.59 MB** | Well within 16 GB RAM (< 3% of host RAM) |
| **BGE-Small Embedding Latency**| **19.09 ms / text** (batch: 31.4 ms for 5 texts) | Real-time capable (< 50 ms) |
| **BGE VRAM Utilization** | **0 MB** (CPU execution) | 100% of 4 GB GPU VRAM preserved for LLM |
| **MiniLM Initial Load Time** | 160.6 s (includes HF download/cache verification) | Subsequent loads: < 0.8 s |
| **MiniLM RAM Delta** | **92.51 MB** | Minimal incremental memory |
| **Combined Total Peak RAM** | **572.10 MB** (both models resident) | Safe for sustained local operation |
| **MiniLM Cold Latency (5 pairs)**| 41.99 ms (8.40 ms / pair) | Sub-100 ms reranking |
| **MiniLM Warm Latency (5 pairs)**| **18.77 ms** (3.75 ms / pair) | Highly responsive |

---

## 5. Mode-by-Mode Retrieval Performance Comparison

From the real integration test query:  
*`"How does the useEffect cleanup function prevent memory leaks in React?"`*

| Mode | Architecture | Retrieved Count | Adapter Latency | Top-1 Chunk Found | Top-1 Score | Schema Conformance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R0** | `nomic-embed-text` (768d) + BM25 + RRF | 5 | 172.65 ms | `USEEFFECT HOOK: Performs side effects...` | 0.7244 | 100% Valid |
| **R1** | `bge-small-en-v1.5` (384d) + BM25 + RRF | 5 | **26.44 ms** | `USEEFFECT HOOK: Performs side effects...` | 0.8014 | 100% Valid |
| **R2** | `e5-small-v2` (384d, prefixed) + BM25 + RRF| 5 | **25.80 ms** | `USEEFFECT HOOK: Performs side effects...` | 0.8924 | 100% Valid |
| **R3** | Baseline R0 (pool=10) + MiniLM Reranker | 5 | 433.00 ms | `USEEFFECT HOOK: Performs side effects...` | **0.9539** | 100% Valid |
| **R4** | BGE-small R1 (pool=10) + MiniLM Reranker | 5 | 409.40 ms | `USEEFFECT HOOK: Performs side effects...` | **0.9539** | 100% Valid |

### Key Observations:
1. **Latency Advantage:** R1 and R2 are **~6.5× faster** than R0 baseline (26 ms vs 173 ms), because the lightweight in-memory 384d dot-product and fast Python bridge bypass Ollama's IPC overhead.
2. **Confidence Calibration:** Cross-encoder reranking (R3, R4) creates dramatic margin separation: Top-1 similarity jumps to **0.9539**, while distractor chunks drop to $< 0.01$, substantially filtering out noise before evidence reaches the verifier.

---

## 6. Verification Checklist

- [x] Python inference bridge implemented at `backend/retrieval_bridge.py`.
- [x] Lazy-loading of reranker verified via `/health`.
- [x] `EXP-0032-MODEL-LOCK.json` generated with exact revisions and hardware telemetry.
- [x] Dedicated benchmark table `material_chunks_exp0032` created in `database/rag_materials.sqlite3`.
- [x] All 23 curriculum chunks re-embedded with BGE-small (384d, normalized).
- [x] All 23 curriculum chunks re-embedded with E5-small (384d, normalized, `passage: ` prefix).
- [x] Baseline tables and `vectors.sqlite` 100% preserved and untouched.
- [x] Retrieval adapter implemented at `backend/exp0032_retrieval.php`.
- [x] Automated smoke test suite created and passing (`tests/smoke_test_exp0032.py`).
- [x] End-to-end integration test passing across all modes R0–R4 (`tests/test_exp0032_modes.php`).
- [x] Zero modifications to EXP-0031 verifier or production code.
