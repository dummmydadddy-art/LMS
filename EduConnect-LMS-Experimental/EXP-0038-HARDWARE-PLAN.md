# EXP-0038: Hardware Configuration & Inference Resource Plan

**Experiment:** EXP-0038 (Structure-Aware Evidence Chunking with Docling HybridChunker)  
**Host Architecture:** Windows 11 Home (x86_64)  
**Physical Memory:** 16.0 GB DDR4 System RAM  
**GPU Hardware:** NVIDIA GeForce RTX 3050 Laptop GPU (4,096 MiB VRAM)  
**Date:** 2026-09-17  
**Lineage:** EXP-0037 (`4372d43`) -> EXP-0038  

---

## 1. Workload Distribution and Resource Budget

EXP-0038 operates a multi-stage RAG pipeline spanning document chunking, dual dense/reranking retrieval, and structured NLI verification:

### 1.1 Document Ingestion & Chunking Engine (`backend/docling_chunker.py`)
- **Runtime:** Python 3.12
- **Core Dependencies:** `docling-core[chunking]` (v2.97.0), `semchunk` (v3.2.5), `transformers` (v4.47.0)
- **Tokenizer:** `BAAI/bge-small-en-v1.5` (`BertTokenizer`, `model_max_length = 512`, `max_position_embeddings = 512`)
- **Execution Device:** CPU
- **Inference Footprint:** Peak RAM ~150 MiB, Peak GPU VRAM: 0 MiB
- **Corpus Generation Latency:** ~35 ms for all 5 curriculum documents (14,350 source characters)

### 1.2 Dense Retrieval & Neural Reranking Bridge (`http://127.0.0.1:8100`)
- **Runtime:** Python 3.12 (HTTP Daemon `backend/retrieval_bridge.py`)
- **Dense Embedding Model:** `BAAI/bge-small-en-v1.5` (33M params, 384-dimensional normalized vectors)
- **Cross-Encoder Reranking Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2` (22.7M params)
- **Execution Device:** CPU (PyTorch 2.5.1+cpu float32)
- **Peak Memory:** ~780 MiB RAM
- **GPU VRAM:** 0 MiB
- **Query Latency Profile:**
  - Dense query embedding: ~8-12 ms
  - Cosine dot product (21-23 chunks): < 1 ms
  - MiniLM cross-encoder reranking (top 20 candidate docs): ~140-180 ms
  - Total retrieval latency: P50 ~160 ms, P95 ~210 ms

### 1.3 Semantic NLI Verifier Engine (`http://127.0.0.1:11434`)
- **Runtime:** Local Ollama daemon (`ollama serve`, v0.34.1)
- **Model Identifier:** `llama3.2:latest` (3.21B parameters, 4-bit quantization, size: ~2.0 GiB)
- **Execution Device:** CUDA (NVIDIA GeForce RTX 3050 Laptop GPU)
- **Allocated GPU VRAM:** 2,315 MiB / 4,096 MiB (56.5% GPU utilization)
- **Free VRAM Margin:** 1,781 MiB (43.5% headroom), completely immune to out-of-memory (OOM) faults
- **Generation Parameters:**
  - `temperature`: 0.0 (strictly deterministic greedy decoding)
  - `num_predict`: 25 tokens
  - `num_thread`: 8
  - `timeout`: 45 seconds
  - `format`: json
- **Target Verification Latency:** P50 ~610 ms, P95 ~840 ms per active NLI call

### 1.4 Ambiguity Routing Guard & Decision Aggregation (`backend/rag_ambiguity_guard_verifier.php`)
- **Runtime:** PHP 8.2.12 CLI
- **Execution Device:** Pure deterministic CPU execution
- **Per-Query Overhead:** < 0.5 ms
- **System Memory:** < 25 MiB RAM

---

## 2. Stability, Thermal, and Resource Guardrails

1. **VRAM Concurrency Safety:**
   - ollama serve is the single active process bound to CUDA VRAM.
   - The retrieval bridge operates entirely on CPU, eliminating VRAM contention between embedding/reranking and LLM inference.
2. **Caching & Reproducibility:**
   - Retrieval candidate caches (`scratch/exp0038_dev_c0_cache.json`, `scratch/exp0038_dev_c1_cache.json`) eliminate redundant embedding and reranking computation.
   - Persistent NLI cache (`scratch/exp0038_nli_cache.json`) captures all LLM inferences by `md5(premise || hypothesis || model || prompt_mode)`.
3. **Graceful Degradation:**
   - Bridge health endpoint checks (`/health`) verify model readiness before evaluation scripts proceed.
   - Automatic fallback to neutral abstention if network or timeout limits are exceeded.
