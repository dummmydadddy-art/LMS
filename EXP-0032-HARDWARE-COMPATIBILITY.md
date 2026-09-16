# EXP-0032: Hardware Compatibility Report

**Branch:** `exp-0032`
**Parent Commit:** `01d6220` (EXP-0031)
**Date:** 2026-09-16
**Purpose:** Verify candidate model compatibility with hardware constraints.

---

## 1. Hardware Inventory

| Component | Specification |
|---|---|
| **GPU** | NVIDIA GeForce RTX 3050 Laptop GPU |
| **VRAM** | 4096 MiB (4 GB) |
| **VRAM Free (observed)** | 1642 MiB (during reconnaissance with Ollama idle) |
| **Compute Capability** | 8.6 (Ampere) |
| **Driver** | 610.88 |
| **CUDA** | Available via PyTorch 2.9.1 |
| **CPU** | Intel Core i5-12450H |
| **RAM** | 16 GB |
| **OS** | Windows |

---

## 2. Software Environment

| Component | Version |
|---|---|
| Python | 3.11.15 |
| pip | 26.1.2 |
| PyTorch | 2.9.1 (CUDA enabled) |
| sentence-transformers | 5.5.1 |
| transformers | 5.11.0 |
| Ollama | 0.34.0 |
| PHP | Available (CLI) |

### Installed Ollama Models

| Model | Size | Role |
|---|---|---|
| nomic-embed-text:latest | 274 MB | Embedding (current) |
| llama3.2:latest | 2.0 GB | Chat/Generation |
| llama3:latest | 4.7 GB | Chat (legacy) |

---

## 3. VRAM Budget Analysis

### Current VRAM Utilization (Steady State)

| Consumer | VRAM Est. |
|---|---|
| Windows + display driver | ~400 MB |
| Ollama nomic-embed-text (F16) | ~300 MB |
| Ollama llama3.2 (Q4_0, when loaded) | ~2.0 GB |
| **Total (generation active)** | **~2.7 GB** |
| **Available for new models** | **~1.3 GB** |

### VRAM Budget Without Ollama Embedding (Post-Migration)

If embedding shifts from Ollama to sentence-transformers (freeing nomic-embed-text VRAM):

| Consumer | VRAM Est. |
|---|---|
| Windows + display driver | ~400 MB |
| Ollama llama3.2 (generation) | ~2.0 GB |
| **Total fixed** | **~2.4 GB** |
| **Available for embedding + reranker** | **~1.6 GB** |

---

## 4. Candidate Model VRAM Compatibility

### 4.1 Embedding Models

| Model | Params | Disk | VRAM (BS=1) | Fits? | Margin |
|---|---|---|---|---|---|
| BAAI/bge-small-en-v1.5 | 33.4M | 127 MB | ~450 MB | ✅ YES | ~1.15 GB spare |
| intfloat/e5-small-v2 | 33.4M | 127 MB | ~450 MB | ✅ YES | ~1.15 GB spare |
| nomic-embed-text (current) | 137M | 274 MB | ~300 MB | ✅ YES (baseline) | — |

### 4.2 Reranker Models

| Model | Params | Disk | VRAM (BS=1) | Fits? | Margin |
|---|---|---|---|---|---|
| cross-encoder/ms-marco-MiniLM-L-6-v2 | 22.7M | 87 MB | ~400 MB | ✅ YES | ~1.2 GB spare |
| BAAI/bge-reranker-base | 278M | 1.06 GB | ~1.05 GB (FP16) | ✅ YES | ~0.55 GB spare |

### 4.3 Combined Deployment Scenarios

| Scenario | Embedding | Reranker | Combined VRAM | + Ollama LLM | Total | Fits 4 GB? |
|---|---|---|---|---|---|---|
| **R1** | bge-small (450 MB) | — | 450 MB | 2.0 GB | 2.85 GB | ✅ YES |
| **R2** | e5-small (450 MB) | — | 450 MB | 2.0 GB | 2.85 GB | ✅ YES |
| **R3** | nomic (300 MB) | MiniLM (400 MB) | 700 MB | 2.0 GB | 3.1 GB | ✅ YES |
| **R4** | bge-small (450 MB) | MiniLM (400 MB) | 850 MB | 2.0 GB | 3.25 GB | ✅ YES |
| R4-alt | bge-small (450 MB) | bge-reranker (1.05 GB) | 1.50 GB | 2.0 GB | 3.9 GB | ⚠️ TIGHT |

> **NOTE:** All scenarios assume sequential, non-concurrent inference. During embedding, the LLM may be idle (Ollama auto-unloads after keep-alive timeout). Actual concurrent VRAM usage may be lower.

---

## 5. CPU Fallback Feasibility

For co-existence with Ollama LLM on GPU:

| Model | CPU Latency (per query/pair) | RAM | Viable? |
|---|---|---|---|
| bge-small-en-v1.5 | ~5-15 ms | ~650 MB | ✅ Excellent |
| e5-small-v2 | ~5-15 ms | ~650 MB | ✅ Excellent |
| ms-marco-MiniLM-L-6-v2 | ~2-5 ms per pair | ~500 MB | ✅ Best-in-class |
| bge-reranker-base (FP32) | ~50-120 ms per pair | ~1.3 GB | ⚠️ Moderate |
| bge-reranker-base (INT8 ONNX) | ~25-50 ms per pair | ~800 MB | ✅ Acceptable |

---

## 6. RAM Budget Analysis

| Consumer | RAM Est. |
|---|---|
| Windows OS + services | ~4 GB |
| PHP process (RAG service) | ~200 MB |
| Ollama runtime | ~500 MB |
| sentence-transformers models | ~650 MB - 1.5 GB |
| SQLite corpus (prewarmed) | ~10 MB |
| **Total** | **~5.4 - 6.2 GB** |
| **Available** | **~9.8 - 10.6 GB** |

All scenarios fit comfortably within 16 GB RAM.

---

## 7. Quantization Options

| Model | ONNX FP32 | ONNX INT8 | Reduction | Available Pre-built? |
|---|---|---|---|---|
| bge-small-en-v1.5 | 127 MB | ~33 MB | 74% | Yes (HF repo) |
| e5-small-v2 | 127 MB | 32.5 MB | 74% | Yes (official) |
| ms-marco-MiniLM-L-6-v2 | 87 MB | 22.1 MB | 75% | Yes (official) |
| bge-reranker-base | 1.06 GB | ~280 MB | 74% | Via ONNX Runtime |

---

## 8. Compatibility Verdict

| Criterion | Status |
|---|---|
| All 4 candidate models fit in 4 GB VRAM individually | ✅ PASS |
| Embedding + reranker fit simultaneously with LLM | ✅ PASS (MiniLM); ⚠️ TIGHT (bge-reranker-base) |
| CPU fallback is viable for all models | ✅ PASS |
| sentence-transformers 5.5.1 supports all models | ✅ PASS |
| PyTorch CUDA available | ✅ PASS |
| All models fit in 16 GB RAM | ✅ PASS |
| No model exceeds 2 GB download | ✅ PASS |

**Overall Hardware Compatibility: ✅ ALL CANDIDATES COMPATIBLE**
