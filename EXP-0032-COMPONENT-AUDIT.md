# EXP-0032: Component Audit

**Branch:** `exp-0032`
**Parent Commit:** `01d6220` (EXP-0031)
**Date:** 2026-09-16
**Purpose:** Inventory all retrieval-pipeline components before open-source replacement evaluation.

---

## 1. Current Embedding Model

| Property | Value |
|---|---|
| Model | `nomic-embed-text` (Nomic AI) |
| Architecture | `nomic-bert` |
| Parameters | 137M |
| Quantization | F16 (Ollama) |
| Embedding Dimension | **768** |
| Max Context Length | 2048 tokens (config: 8192) |
| Disk Size (Ollama) | 274 MB |
| License | Apache 2.0 |
| Serving | Ollama HTTP API (`/api/embed`, fallback `/api/embeddings`) |
| Keep-Alive | 24h |
| In-Memory Cache | Up to 2000 embeddings (case-insensitive key) |

**Integration Points:**
- `getEmbedding()` (L755-L818) — Calls Ollama `/api/embed` with `nomic-embed-text`, caches results
- `$embedModel` (L61) — Static class property `'nomic-embed-text'`
- Hardcoded dimension check: `count($precomputedEmbedding) === 768` at L1381
- Prewarm invariant: `$dim !== 768` assertion at L397

---

## 2. Dense Retrieval Pipeline

### 2.1 Query Preprocessing
- `preprocessQuery()` (L316-L330): Strips control chars, applies spelling correction dictionary (33 entries)
- Conversational query condensation via `RagQueryCondenser::condense()`
- Semantic concept mapping via `RagSemanticMapper::canonicalize()`

### 2.2 Vector Storage
- **Database:** SQLite at `backend/storage/vectors.sqlite` (and `database/rag_materials.sqlite3` — identical schema)
- **Schema:** `material_chunks` table with `embedding BLOB` column
- **Encoding:** `pack('f*', ...)` — native PHP float32 array → binary blob (3072 bytes per 768-dim vector)
- **Utility functions:** `packVector()` (L892), `unpackVector()` (L896)

### 2.3 Cosine Similarity
- `cosineSimilarity()` (L900-L918): Manual dot-product / (norm_A × norm_B) in PHP
- Pre-normalized unit vectors cached during prewarm for O(n) dot-product scoring

### 2.4 In-Memory Pre-Warming (EXP-0012)
- `getPrewarmedCorpus()` (L357-L452): Loads all chunks into RAM with:
  - Pre-computed unit vectors (L2-normalized)
  - Pre-tokenized BM25 token maps (`doc_tokens`, `doc_len`)
  - 7 strict invariants (dimension, norm, non-empty, etc.)
  - Version-gated cache invalidation via `rag_corpus_version.txt`

---

## 3. BM25 Lexical Retrieval

### 3.1 Tokenizer
- `tokenize()` (L335-L346):
  - Lowercase
  - Preserve code symbols: `< > . ( ) { } $`
  - 50-word stopword list
  - Min token length: 2 chars

### 3.2 BM25 Scoring
- **Algorithm:** Okapi BM25 with query-term frequency saturation
- **Parameters:** k1=1.2, b=0.75, k3=1.2 (query TF saturation)
- **IDF formula:** `log((N - df + 0.5) / (df + 0.5) + 1.0)` (Robertson/Spärck Jones)
- **Title weighting:** Title text is concatenated twice for double-weighting in BM25
- Two implementations:
  - `scoreBM25()` (L506-L561): From-scratch tokenization (non-prewarmed path)
  - `scoreBM25Precomputed()` (L457-L501): Uses pre-tokenized doc maps (prewarmed path)

---

## 4. Reciprocal Rank Fusion (RRF)

- `reciprocalRankFusion()` (L566-L629)
- **k parameter:** 60 (standard RRF smoothing constant)
- **Adaptive intent weighting:**
  - Code-syntax queries: wDense=0.50, wBM25=0.50
  - Natural language queries: wDense=0.65, wBM25=0.35
- **Query-Level Disagreement Detection (W-07, W-22):**
  - Applies penalty to BM25-boosted candidates with dense deficit > 0.12 and cosine < 0.55
- **Deterministic tie-breaking:** RRF score → cosine similarity → chunk ID (lexicographic)

---

## 5. Post-Retrieval Processing

### 5.1 Semantic Reranking (EXP-0016 Group B)
- `applySemanticReranking()` (L166-L315): Rule-based contrast reranker with domain-specific penalty/boost rules
- Gated by `ENABLE_SEMANTIC_RERANK` flag

### 5.2 MMR Diversity Reranker
- `rerankMMR()` (L634-L696): λ=0.75 (relevance-dominant)
- Uses chunk embedding vectors for inter-document similarity

### 5.3 Coverage-Aware Fusion (EXP-0006)
- `applyCoverageAwareFusion()`: Module-aware interleaving for multi-module queries
- Dynamic k adjustment for comparative/multi-module queries

### 5.4 Multi-Module Orchestration (EXP-0011+)
- `RagQueryOrchestrator::analyze()`: Classifies query complexity
- Targeted secondary retrieval for missing modules
- Evidence graph construction

---

## 6. Chunking Strategy

- `chunkText()` (L824-L890)
- **Target chunk size:** 650 characters
- **Overlap:** 100 characters (parameter; actual implementation uses section-boundary splitting)
- **Strategy:** Code-aware & markdown-aware semantic chunking:
  1. Split by markdown headings and section dividers
  2. Merge small sections up to chunk size limit
  3. Large sections split by paragraphs, preserving code fence integrity

---

## 7. Corpus Statistics

| Metric | Value |
|---|---|
| Total chunks | 23 |
| Distinct documents | 5 |
| Avg content length | 622 chars |
| Min content length | 268 chars |
| Max content length | 1152 chars |
| Vector dimension | 768 (float32) |
| Blob size per vector | 3072 bytes |
| Database file size | 0.15 MB |

### Document Inventory

| Title | Domain |
|---|---|
| HTML & CSS Fundamentals | `html_css` |
| JavaScript ES6+ Deep Dive | `js` |
| React Hooks Tutorial | `react` |
| Node.js & Express REST API Notes | `node` |
| PostgreSQL Database Design | `postgres` |

---

## 8. Verifier Integration Points

The verifier (`rag_premise_verifier.php`) consumes retrieval output:
- Receives `results[]` array from `searchCore()` / `search()`
- Uses `content`, `title`, `similarity`, `metadata` fields
- Does NOT use embedding vectors (stripped before return at L1512-L1514)
- Verifier is **frozen** (EXP-0031 E4) — retrieval changes flow through the same output interface

---

## 9. Dimension-Change Impact Analysis

Replacing `nomic-embed-text` (768d) with a 384d model requires changes at:

| Location | Current | Required Change |
|---|---|---|
| `searchCore()` L1381 | `count() === 768` | Update to new dim |
| `getPrewarmedCorpus()` L397 | `$dim !== 768` | Update to new dim |
| `getPrewarmedCorpus()` L415 | `count($unit) !== 768` | Update to new dim |
| Return metadata L1524 | `'vector_dimension' => 768` | Update to new dim |
| All stored embedding BLOBs | 3072 bytes (768×4) | Must **re-embed** all 23 chunks |

> **IMPORTANT:** Switching embedding models requires a full re-ingestion of all 23 corpus chunks with the new model. The existing SQLite embeddings are incompatible with any non-nomic model.
