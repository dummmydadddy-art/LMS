# Milestone 1 (R1) Implementation Changes: Neural Cross-Encoder Reranker Microservice

## Overview
Replaced all 13 hardcoded regex contrast rules in `backend/rag_service.php` with a local neural cross-encoder (`cross-encoder/ms-marco-MiniLM-L-6-v2`) microservice running on CPU at `http://127.0.0.1:8100`.

---

## 1. Files Added & Modified

### 1.1 `backend/services/reranker_service.py` (New File)
- **Role**: Dedicated FastAPI microservice providing cross-encoder reranking over HTTP.
- **Port & Host**: `127.0.0.1:8100`.
- **Model**: `cross-encoder/ms-marco-MiniLM-L-6-v2` loaded via HuggingFace `transformers` (`AutoTokenizer` + `AutoModelForSequenceClassification`).
- **Device & Resource Constraints**: Pure CPU (`torch.device("cpu")`), consuming **0 MB VRAM**, preserving all GPU resources for Ollama generator (`llama3.2:latest`, ~2 GB) and independent judge (`qwen3:4b`, ~2.5 GB) on the 4 GB NVIDIA RTX 3050 Laptop GPU.
- **Windows Invariants**: Sets `os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"` and `os.environ["TOKENIZERS_PARALLELISM"] = "false"` to prevent OpenMP runtime collision and tokenizer deadlock.
- **Endpoints**:
  - `GET /health`: Returns service health, model identifier, CPU device status, and `vram_mb: 0.0`.
  - `POST /rerank`: Accepts `{"query": string, "passages": [{"id": ..., "text": ...}]}`, computes cross-attention logits, applies sigmoid activation `1.0 / (1.0 + exp(-logit))` to produce normalized probabilities in `[0.0, 1.0]`, and returns candidates sorted descending by score with per-item `id`, `score`, `logit`, and `rank`.
- **Warmup & Latency**: Synchronous warmup on startup. Measured batch latency on 15 passages: **~29.9ms** (far below the 200ms requirement).

### 1.2 `backend/rag_flags.php` & `backend/rag_flags.json` (Modified)
- Registered `ENABLE_CROSS_ENCODER` in `$safetyCriticalFlags` (preventing arbitrary disablement via HTTP requests).
- Added `ENABLE_CROSS_ENCODER => true` to default configuration and `backend/rag_flags.json`.

### 1.3 `backend/rag_service.php` (Modified)
- **Regex Elimination**: Completely removed all 13 hardcoded regex contrast rules (covering `node/express`, `postgres/sql`, `javascript/js`, `react/hooks`, and `css/style`) previously residing in `applySemanticReranking()` (former lines 180–325).
- **Microservice Integration**:
  - Formats top 15 candidate passages from RRF fusion and dispatches them via cURL POST to `http://127.0.0.1:8100/rerank`.
  - Connect timeout: 1000ms; Read timeout: 2000ms.
  - Graceful fallback: If the reranker is unreachable or times out, logs an error and preserves RRF candidate order without interrupting the pipeline.
- **Score Calibration & Preservation**:
  - Cross-encoder scores are mapped to `$cand['rerank_score']` and `$cand['rrf_score']`.
  - Dense cosine similarity is preserved in `$cand['similarity']`, preventing false abstentions in `calculateCalibratedConfidence()` which expects dense cosine similarity thresholds ($\ge 0.56$).
- **Candidate Pool Ordering**:
  - Candidates are sorted descending by `rerank_score`.
  - The reranked pool is concatenated with any remaining candidates (`array_merge($reranked, $tail)`), preserving tail candidates for multi-topic/multi-module queries and coverage-aware fusion (`applyCoverageAwareFusion()`).
- **Search Core Flag Dispatch**:
  - In `searchCore()`, updated gate to check `RagFlags::isEnabled('ENABLE_SEMANTIC_RERANK') || RagFlags::isEnabled('ENABLE_CROSS_ENCODER')`.
