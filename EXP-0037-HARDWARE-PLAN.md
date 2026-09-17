# EXP-0037: Hardware Configuration & Inference Resource Plan

**Experiment:** EXP-0037 (Controlled Ambiguity Mitigation Experiment)  
**Host Architecture:** Windows 11 Home (x86_64)  
**Physical Memory:** 16.0 GB DDR4 System RAM  
**GPU Hardware:** NVIDIA GeForce RTX 3050 Laptop GPU (4,096 MiB VRAM)  
**Date:** 2026-09-17  
**Lineage:** EXP-0036 (`d8c1ed3`) -> EXP-0037  

---

## 1. Workload Distribution and Resource Budget

EXP-0037 operates a hybrid dual-service pipeline:
1. **Dense Retrieval & Neural Reranking Bridge (`http://127.0.0.1:8100`):**
   - Runtime: Python 3.12 (HTTP daemon)
   - Dense Embedding Model: `BAAI/bge-small-en-v1.5` (33M params, 384-dim)
   - Cross-Encoder Reranking Model: `cross-encoder/ms-marco-MiniLM-L-6-v2` (22.7M params)
   - Execution Device: System RAM / CPU (Torch float32)
   - Peak Memory: ~780 MiB RAM
   - Concurrency: Serialized query pipeline with pre-computed candidate pools

2. **Semantic NLI Verifier Engine (`http://127.0.0.1:11434`):**
   - Runtime: Local Ollama daemon (`ollama serve`)
   - Model Identifier: `llama3.2:latest` (3.21B parameters, 4-bit quantization, size: ~2.0 GiB)
   - Execution Device: CUDA (RTX 3050 Laptop GPU)
   - Allocated GPU VRAM: 2,315 MiB / 4,096 MiB (56.5% GPU utilization)
   - Context Length Policy: `OLLAMA_CONTEXT_LENGTH: 0` (clean CLI daemon mode, preventing 262k context OOM)
   - Generation Parameters:
     - `temperature`: 0.0 (greedy deterministic decoding)
     - `max_tokens`: 25 (`num_predict`)
     - `num_threads`: 8
     - `timeout`: 45 seconds
     - `format`: json
   - Target Latency: P50 ~620 ms, P95 ~850 ms per NLI verification pass

3. **Stage-2 Ambiguity Routing Guard (`backend/rag_ambiguity_guard_verifier.php`):**
   - Runtime: PHP 8.2 CLI
   - Execution: Pure deterministic linguistic parsing (zero GPU, zero network)
   - Latency: < 0.5 ms per query
   - Memory Overhead: Negligible (< 10 MiB)

---

## 2. Hardware Stability & OOM Mitigation Protocols

1. **VRAM Headroom Guarantee:**
   - Total GPU VRAM: 4,096 MiB
   - Active Ollama Allocation: 2,315 MiB
   - Safety Margin: 1,781 MiB (43.5% free buffer)
   - Windows Desktop Compositor overhead remains strictly below 600 MiB, preventing any cudaMalloc failures.

2. **In-Memory & Persistent Caching:**
   - In-memory PHP hash table indexed by MD5 of premise, hypothesis, model, and prompt mode.
   - Persistent cache written to disk (`scratch/exp0037_nli_cache.json`) to guarantee 100% reproducibility and prevent redundant GPU compute.
