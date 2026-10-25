# Project: EduConnect-LMS-Experimental RAG Pipeline Enhancement

## Architecture
- **PHP RAG Core**: FrankenPHP 1.12.7 serving `backend/` on `http://127.0.0.1:8000/api/rag/ask`.
  - `backend/index.php`: API endpoint router, handles request payload (`query`, `student_id`, `temperature`).
  - `backend/rag_service.php`: Main RAG orchestrator: query rewriting -> hybrid retrieval -> RRF fusion -> semantic reranking -> MMR diversity -> context assembly -> LLM generation.
  - `backend/rag_query_condenser.php`: Conversational multi-turn query condenser / rewriter.
  - `backend/rag_flags.php`: Feature flags and tuning thresholds.
- **Reranker Microservice (R1)**: Python FastAPI microservice on `http://127.0.0.1:8100/rerank` using `cross-encoder/ms-marco-MiniLM-L-6-v2` (running CPU-only, ~77ms latency, 0 MB VRAM).
- **Vector Storage (R2 & R4)**: SQLite database at `backend/storage/vectors.sqlite` utilizing `sqlite-vec` (`vec0.dll`) loaded via PHP's `SQLite3` extension for sub-15ms ANN search on 768-dim `nomic-embed-text` vectors.
- **Student Session Store (R3)**: SQLite database at `backend/storage/student_sessions.sqlite` storing the last 3 Q&A turns per `student_id` in WAL mode.
- **Hierarchical Chunks (R4)**: Dual-level chunking: ~200-token child chunks indexed in `vec0` table, linked via `parent_chunk_id` to ~800-1000 token parent chunks in `parent_chunks` table for rich generator context.
- **CRAG Fallback (R5)**: Confidence threshold check (`CRAG_CONFIDENCE_THRESHOLD = 0.35`) against reranker score to trigger graceful abstention.
- **LLM Models**:
  - `llama3.2:latest` (Ollama, ~2 GB VRAM, `num_ctx: 2048`) for generation & query rewriting.
  - `nomic-embed-text:latest` (Ollama, ~274 MB VRAM) for embeddings.
  - `qwen3:4b` (Ollama, ~2.5 GB VRAM) for independent benchmark judging.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Neural Cross-Encoder Reranker Microservice (R1) | FastAPI microservice on port 8100 with `cross-encoder/ms-marco-MiniLM-L-6-v2`. Replace 13 regex rules in `applySemanticReranking()`. | M1 | Survey / ORIGINAL_REQUEST §R1 |
| 2 | Approximate Nearest Neighbor Vector Index (R2) | `sqlite-vec` extension integration via PHP `SQLite3`. Migrate 1,323 chunks to virtual table. Replace `getPrewarmedCorpus()` O(N) scan. | M2 | Survey / ORIGINAL_REQUEST §R2 |
| 3 | Multi-Turn Conversational Memory (R3) | LLM query rewriter in `rag_query_condenser.php` via `llama3.2` with `num_ctx: 2048`. SQLite session store `student_sessions.sqlite` (3 turns). Wire `student_id` in `index.php`. | M3 | Survey / ORIGINAL_REQUEST §R3 |
| 4 | Parent-Child Hierarchical Chunking (R4) | Re-ingest 5 textbooks into ~200-token child chunks and ~800-1000 token parent chunks with `parent_chunk_id`. Return parent context to generator. | M4 | Survey / ORIGINAL_REQUEST §R4 |
| 5 | Corrective RAG (CRAG) Fallback (R5) | Confidence-gated abstention in `backend/rag_service.php` when reranker top score < threshold (default 0.35 in `rag_flags.php`). | M5 | Survey / ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Milestone 1: Cross-Encoder Reranker (R1) | Build Python microservice `backend/services/reranker_service.py` on port 8100, replace regex rules in `rag_service.php`, run benchmarks | none | IN_PROGRESS |
| 2 | Milestone 2: ANN Vector Index (R2) | Setup `vec0.dll` via `SQLite3` in PHP, migrate 1,323 vectors to `vec0` virtual table, replace O(N) scan in `rag_service.php`, run benchmarks | M1 | PLANNED |
| 3 | Milestone 3: Conversational Memory (R3) | Add `student_sessions.sqlite` store, rewrite queries via `llama3.2` with `num_ctx: 2048`, wire `student_id` in `index.php`, run benchmarks | M2 | PLANNED |
| 4 | Milestone 4: Hierarchical Chunking (R4) | Ingest textbooks with parent-child chunks, link via `parent_chunk_id`, fetch parent text during retrieval, run benchmarks | M3 | PLANNED |
| 5 | Milestone 5: CRAG Fallback (R5) | Implement confidence check, graceful abstention response, configure `rag_flags.php`, run full benchmark suite | M4 | PLANNED |

## Interface Contracts
### PHP `RagService` ↔ Python Reranker Microservice (`http://127.0.0.1:8100/rerank`)
- Method: `POST`
- Payload: `{"query": string, "passages": [{"id": int/string, "text": string}]}`
- Response: `{"results": [{"id": int/string, "score": float}]}` where score is sigmoid probability in `[0.0, 1.0]`.
- Timeout: 2.0s with fallback to RRF rankings.

### PHP `RagService` ↔ SQLite `vectors.sqlite`
- Table: `material_chunks_vec` (`using vec0(chunk_id integer primary key, embedding float[768])`)
- Query: `SELECT chunk_id, distance FROM material_chunks_vec WHERE embedding MATCH :query_vec AND k = :limit ORDER BY distance`
- Mapping: Join `material_chunks` on `chunk_id` to retrieve content, metadata, and `parent_chunk_id`.

### PHP `RagQueryCondenser` ↔ Ollama `llama3.2:latest`
- Endpoint: `http://127.0.0.1:11434/api/generate`
- Payload: `{"model": "llama3.2:latest", "prompt": string, "stream": false, "options": {"temperature": 0.0, "num_ctx": 2048}}`
- Storage: `backend/storage/student_sessions.sqlite` schema: `(id INTEGER PRIMARY KEY, student_id TEXT, role TEXT, message TEXT, created_at DATETIME)`

### Retrieval ↔ Generator Context Contract
- Context Assembly: Given top retrieved child chunks, map to unique `parent_chunk_id` in `parent_chunks` table. Assemble parent chunk text as generator context.

## Code Layout
- `backend/services/reranker_service.py`: FastAPI reranker microservice script.
- `backend/rag_service.php`: Core RAG logic, search pipeline, reranking, context assembly, generation.
- `backend/rag_flags.php`: Feature flags and thresholds (`ENABLE_CROSS_ENCODER`, `ENABLE_SQLITE_VEC`, `ENABLE_CRAG_FALLBACK`, `CRAG_CONFIDENCE_THRESHOLD`).
- `backend/rag_query_condenser.php`: LLM-based query rewriter and multi-turn condenser.
- `backend/storage/student_sessions.php`: SQLite session manager.
- `backend/storage/vectors.sqlite`: Vector store with `vec0` index.
- `backend/storage/student_sessions.sqlite`: Student conversation history store.
- `tests/rag/benchmarks/rgb_ragchecker_suite.py`: Official benchmark suite.
