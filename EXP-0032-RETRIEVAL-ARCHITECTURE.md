# EXP-0032: Retrieval Architecture Specification

**Experiment ID:** EXP-0032  
**Starting Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Branch:** `exp-0032`  
**Purpose:** Map the current retrieval architecture and provide the technical blueprint for integrating open-source bi-encoders and cross-encoders.

---

## 1. System Context & Overview

The EduConnect LMS retrieval subsystem provides curriculum evidence to both the user-facing RAG assistant (`RagService::ask()`) and the automated claim verifier (`RagPremiseVerifier::verify()`). The verifier is **strictly frozen** in the EXP-0031 E4 configuration. Therefore, the retrieval architecture must maintain a 100% backward-compatible output contract while upgrading its internal scoring, vector representation, and reranking stages.

```
+-----------------------------------------------------------------------------------+
|                               USER / VERIFIER QUERY                               |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STAGE 1: QUERY PREPROCESSING & SPELLING CORRECTION                                |
| - Sanitize control chars                                                          |
| - Domain spelling map (33 technical terms: useEffect, normalization, etc.)        |
| - Conversational query condenser / concept canonicalizer                          |
+-----------------------------------------------------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
+----------------------------------------+ +----------------------------------------+
| STAGE 2A: DENSE VECTOR RETRIEVAL       | | STAGE 2B: LEXICAL BM25 RETRIEVAL       |
| R0/R3: nomic-embed-text (768d, Ollama) | | - Okapi BM25 (k1=1.2, b=0.75, k3=1.2)  |
| R1/R4: bge-small-en-v1.5 (384d, SBERT) | | - Sublinear query TF saturation        |
| R2:    e5-small-v2 (384d, SBERT)       | | - Double title token weighting         |
| Prewarmed in-memory dot-product cosine | | - In-memory pre-tokenized doc maps     |
+----------------------------------------+ +----------------------------------------+
                     |                                         |
                     +--------------------+--------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STAGE 3: RECIPROCAL RANK FUSION (RRF) & CONTRAST FILTERING                        |
| - RRF score: wDense / (60 + rDense) + wBM25 / (60 + rBM25)                        |
| - Adaptive intent weights: Code syntax (0.50 / 0.50) vs Conceptual (0.65 / 0.35) |
| - Dense disagreement penalty for low-cosine keyword stuffing                      |
| - Multi-tier tie-breaking (RRF score -> Cosine -> Chunk ID)                       |
+-----------------------------------------------------------------------------------+
                                          |
                                          v  [Candidate Chunks: Top-N, N = 10 to 20]
+-----------------------------------------------------------------------------------+
| STAGE 4: CROSS-ENCODER RERANKING (Modes R3, R4, R5)                              |
| - Model: ms-marco-MiniLM-L-6-v2 (22.7M params, 6 layers)                         |
| - Alternative: BAAI/bge-reranker-base (278M params, FP16)                         |
| - Input: Pairwise (Query, Chunk Title + Content)                                  |
| - Computes all-to-all cross-attention across full 512-token context window        |
| - Outputs uncalibrated relevance logit -> calibrated probability score            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v  [Final Chunks: Top-k, k = 4 to 5]
+-----------------------------------------------------------------------------------+
| STAGE 5: POST-RETRIEVAL INTEGRATION & VERIFIER HANDOFF                            |
| - Strip internal binary embeddings / vector caches                                |
| - Dynamic-k adjustment for multi-module queries                                   |
| - Output contract: [id, title, content, similarity, metadata]                     |
| - Hand off to FROZEN EXP-0031 E4 Verifier                                         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component-by-Component Specifications

### 2.1 Stage 1: Query Normalization & Preprocessing
- **Function:** `RagService::preprocessQuery($query)`
- **Behavior:**
  - Control character elimination: `preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $query)`.
  - Technical spelling dictionary mapping common typos (`useefect` $\to$ `useEffect`, `normalizaton` $\to$ `normalization`, `transitve` $\to$ `transitive`, `flexboks` $\to$ `flexbox`).
  - Conversational query condensation via `RagQueryCondenser` when conversation history is present.

### 2.2 Stage 2A: Dense Embedding Layer & Bridge
The PHP backend needs to query modern sentence-transformer models. Two bridge architectural patterns are evaluated:

#### Option A: Lightweight Local HTTP Service (Recommended)
- A micro-service running on `http://127.0.0.1:8100` via Python (FastAPI / Uvicorn).
- Endpoints:
  - `POST /embed` $\to$ accepts text or array of texts, returns normalized vector (384d).
  - `POST /rerank` $\to$ accepts query and list of candidate texts, returns reranked scores.
- Memory: Resides in host RAM (~500 MB) or GPU VRAM (~400 MB).
- Latency: ~5–8 ms per query via persistent HTTP connection.

#### Option B: Standalone CLI Invocation (Zero-Daemon Fallback)
- PHP executes a Python script via `shell_exec` with JSON input/output over stdin/stdout.
- Viable for batch evaluation harnesses, but incurs a ~300 ms Python startup tax per call. Not recommended for interactive runtime.

**Selected Architecture for EXP-0032:** Option A (Lightweight Local Python Bridge on dedicated localhost port) with Option B fallback for isolated batch scripts.

### 2.3 Stage 2B: Lexical Retrieval (Okapi BM25)
- **Functions:** `RagService::tokenize()`, `RagService::scoreBM25Precomputed()`
- **Parameters:**
  - $k_1 = 1.2$ (term frequency saturation limit)
  - $b = 0.75$ (document length normalization penalty)
  - $k_3 = 1.2$ (query term frequency saturation: $q_w = \frac{q_{tf} \cdot 2.2}{q_{tf} + 1.2}$)
- **Inverted Index Pre-Warming:**
  - Token counts (`doc_tokens`) and document lengths (`doc_len`) are precomputed and cached in-memory during worker initialization.
  - Title tokens receive double weighting ($2\times$) to boost topical heading relevance.

### 2.4 Stage 3: Fusion Layer (Reciprocal Rank Fusion)
- **Formula:**
  $$\text{RRF}(d) = \frac{w_{\text{dense}}}{60 + r_{\text{dense}}(d)} + \frac{w_{\text{bm25}}}{60 + r_{\text{bm25}}(d)}$$
- **Adaptive Intent Weights:**
  - Code / Structural Queries (containing `<>`, `{}`, `()`, `[]`, `3nf`, `tdz`): $w_{\text{dense}} = 0.50, w_{\text{bm25}} = 0.50$
  - Natural Language Conceptual Queries: $w_{\text{dense}} = 0.65, w_{\text{bm25}} = 0.35$
- **Dense Disagreement Gate:** If top dense similarity $\ge 0.55$, candidates with BM25 score $> 0$ but dense deficit $(s_{\text{top}} - s_d) > 0.12$ suffer a linear penalty up to $95\%$ to suppress lexical keyword stuffing.

### 2.5 Stage 4: Cross-Encoder Reranker
- **Model Candidates:**
  1. `cross-encoder/ms-marco-MiniLM-L-6-v2` (Default for R3, R4)
  2. `BAAI/bge-reranker-base` (Quality challenger)
- **Workflow:**
  1. Stage 3 (RRF) produces a candidate pool of $N = 10$ chunks.
  2. The candidate pool is formatted into pairs: `[(query, candidate_0_text), ..., (query, candidate_N_text)]`.
  3. The cross-encoder performs joint self-attention across the concatenated query and passage:
     $$\text{score}(q, d) = \text{Linear}(\text{BERT}([CLS] \circ q \circ [SEP] \circ d \circ [SEP]))$$
  4. Candidates are sorted descending by the cross-encoder logit/probability.
  5. The top $k$ ($k=4$ standard, $k=5$ multi-module) are returned to the verifier.

### 2.6 Stage 5: Output Contract & Verifier Handoff
Every retrieved chunk passed to `RagPremiseVerifier::verify()` strictly contains:
- `id` (string): Unique chunk identifier (e.g., `ea1f3b17..._chunk_0`).
- `title` (string): Document title.
- `content` (string): Markdown chunk text.
- `similarity` (float): Calibrated relevance score (normalized to $[0.0, 1.0]$).
- `metadata` (string/array): Course and module metadata.

Internal vector representations (`embedding`, `embedding_vec`) are explicitly unset to preserve memory and prevent serialization errors.

---

## 3. Database Schema & Vector Migration Strategy

Currently, `material_chunks` stores 768-dimensional float32 vectors packed as 3072-byte binary blobs.

### Dual-Dimension Storage Architecture
To benchmark 384d models (`bge-small`, `e5-small`) against 768d models (`nomic-embed-text`) without database corruption or data loss:

```sql
-- Existing Schema (preserved for R0/R3)
CREATE TABLE IF NOT EXISTS material_chunks (
    id TEXT PRIMARY KEY,
    material_id TEXT,
    course_id TEXT,
    batch_id TEXT,
    chunk_index INTEGER,
    title TEXT,
    content TEXT,
    metadata TEXT,
    embedding BLOB,       -- 768-dim float32 blob (3072 bytes)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- EXP-0032 Dedicated Benchmark Table (for 384d candidates)
CREATE TABLE IF NOT EXISTS material_chunks_exp0032 (
    id TEXT,
    model_name TEXT,      -- 'bge-small-en-v1.5' or 'e5-small-v2'
    vector_dimension INTEGER, -- 384
    title TEXT,
    content TEXT,
    metadata TEXT,
    embedding BLOB,       -- 384-dim float32 blob (1536 bytes)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, model_name)
);
```

### In-Memory Prewarm Invariant Adaptation
The prewarm routine in `rag_service.php` currently enforces strict 768d assertions:
```php
// Existing Invariant 5 check:
if ($dim !== 768) {
    throw new RuntimeException("Vector dimension mismatch. Expected 768, got {$dim}");
}
```
For EXP-0032, this invariant is generalized to match the active mode's expected dimension:
```php
$expectedDim = self::getActiveModelDimension(); // 768 for R0/R3; 384 for R1/R2/R4
if ($dim !== $expectedDim) {
    throw new RuntimeException("Vector dimension mismatch. Expected {$expectedDim}, got {$dim}");
}
```

---

## 4. Latency & Resource Budget Breakdown

Target latency breakdown for interactive queries on RTX 3050 / i5-12450H:

| Stage | Mode R0 (Baseline) | Mode R1 (BGE-small) | Mode R4 (BGE + MiniLM) | Hardware Device |
| :--- | :--- | :--- | :--- | :--- |
| Preprocessing & Tokenization | ~0.5 ms | ~0.5 ms | ~0.5 ms | CPU (PHP) |
| Query Embedding Generation | ~15–25 ms (Ollama) | ~5–12 ms (SBERT) | ~5–12 ms (SBERT) | GPU (or CPU ONNX) |
| BM25 Precomputed Scoring | ~0.8 ms | ~0.8 ms | ~0.8 ms | CPU (PHP in-memory) |
| Vector Cosine Scoring (23 chunks)| ~0.4 ms (768d) | ~0.2 ms (384d) | ~0.2 ms (384d) | CPU (PHP in-memory) |
| RRF Fusion & Intent Filtering | ~0.3 ms | ~0.3 ms | ~0.3 ms | CPU (PHP) |
| Cross-Encoder Reranking (Top 10)| N/A (0 ms) | N/A (0 ms) | ~15–30 ms | GPU (or ~35 ms CPU) |
| **Total Retrieval Latency** | **~17–27 ms** | **~7–14 ms** | **~22–44 ms** | Comfortable < 50 ms budget |

All modes comfortably satisfy real-time interactive response constraints ($< 100\text{ ms}$).
