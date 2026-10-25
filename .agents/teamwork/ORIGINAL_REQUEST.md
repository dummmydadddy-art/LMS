# Original User Request

## 2026-10-03T07:04:13Z

Implement 5 missing RAG pipeline features in EduConnect-LMS-Experimental to close benchmark gaps identified by the AAAI 2024 RGB & NeurIPS 2024 RAGChecker evaluations. The system is a PHP-based educational RAG tutoring platform running locally on an NVIDIA RTX 3050 Laptop GPU (4 GB VRAM), Intel i5-12450H, 16 GB RAM. The production generator is `llama3.2:latest` (Ollama, ~2 GB VRAM), the embedder is `nomic-embed-text` (~274 MB VRAM), and the independent judge is `qwen3:4b`.

**Implement features sequentially in priority order, running the existing benchmark suite (`tests/rag/benchmarks/rgb_ragchecker_suite.py`) after each feature to measure incremental impact.** Do not proceed to the next feature until the current one is integrated and verified.

Working directory: `d:\Collage project\EduConnect-LMS-Experimental`
Integrity mode: development

## Requirements

### R1. Neural Cross-Encoder Reranker Microservice (Priority 1 — CRITICAL)
Replace the 13 hardcoded regex contrast rules in `backend/rag_service.php` method `applySemanticReranking()` (lines 178–268) with a neural cross-encoder model (`cross-encoder/ms-marco-MiniLM-L-6-v2`, ~90 MB VRAM). Expose the reranker as a Python FastAPI or Flask microservice with a `/rerank` HTTP endpoint that accepts a query and list of passages, returning reranked scores. Update the PHP pipeline to call this endpoint instead of the regex rules. The reranker must slot between the existing RRF fusion stage and the MMR diversity selection stage.

**Hardware constraint:** Must fit within ~1.5 GB remaining VRAM alongside the generator and embedder. CPU-only via ONNX Runtime is an acceptable fallback.

### R2. Approximate Nearest Neighbor (ANN) Vector Index via sqlite-vec (Priority 2 — CRITICAL)
Replace the in-memory O(N) linear cosine similarity scan in `getPrewarmedCorpus()` (line 371) with the `sqlite-vec` extension for approximate nearest neighbor search (HNSW indexing). Migrate the existing 1,323 vector chunks from the current `backend/storage/vectors.sqlite` schema into the new sqlite-vec virtual table format. The PHP retrieval code must query the sqlite-vec index instead of iterating the full corpus array.

**Hardware constraint:** Zero VRAM — entirely CPU/RAM bound.

### R3. Multi-Turn Conversational Memory (Priority 3 — HIGH)
Upgrade `backend/rag_query_condenser.php` from its current regex-based curriculum entity matching to LLM-based conversational query rewriting. Before generating the search embedding, pass the user's latest question along with the last 3 Q&A turns (from a per-student session store) to the existing `llama3.2` model with a rewrite prompt that produces a standalone, self-contained search query. Store conversation history keyed by `student_id` (SQLite or filesystem).

**Hardware constraint:** Zero additional VRAM — reuses the existing generator model.

### R4. Parent-Child Hierarchical Chunking (Priority 4 — HIGH)
Modify the ingestion pipeline (`backend/seed_rag_knowledge.php` or equivalent) to create two levels of chunks from the existing 5 textbooks: small "child" chunks (~200 tokens) indexed for vector search precision, and larger "parent" chunks (~800–1000 tokens) stored separately. Add a `parent_chunk_id` foreign key to the vectors table. At retrieval time, after finding the best child chunks, fetch and pass their parent chunks to the generator for richer context.

**Hardware constraint:** Zero VRAM — data layer change only. Marginally more context tokens per generation (verify no OOM on 4 GB GPU).

### R5. Corrective RAG (CRAG) Confidence-Gated Fallback (Priority 5 — NICE-TO-HAVE)
After the cross-encoder reranking step (R1), if the highest reranker confidence score falls below a configurable safety threshold (e.g., 0.35), route the query to a graceful abstention response ("I don't have enough evidence in the course materials to answer that accurately") rather than generating a potentially unfaithful answer. This extends the existing presupposition verification layer.

**Hardware constraint:** Zero VRAM — threshold logic only, no additional model.

## Acceptance Criteria

### Cross-Encoder Reranker (R1)
- [ ] All 13 regex contrast rules in `applySemanticReranking()` are completely replaced by neural cross-encoder scoring
- [ ] The Python reranker microservice starts reliably and responds to `/rerank` within 200ms per batch of 15 passages
- [ ] RGB Benchmark: Claim Precision improves from 78.3% baseline to ≥ 85%
- [ ] RGB Benchmark: Overall RGB score remains ≥ 95%
- [ ] Total VRAM usage stays under 4 GB with all models loaded

### ANN Vector Index (R2)
- [ ] The sqlite-vec virtual table is created and all 1,323 existing chunks are migrated without data loss
- [ ] Vector search query completes in ≤ 15ms for the current corpus (verified via pipeline timer)
- [ ] The `getPrewarmedCorpus()` full-array iteration path is no longer used for similarity search
- [ ] RGB Benchmark: All dimension scores remain at or above their pre-migration baselines

### Conversational Memory (R3)
- [ ] A test sequence of 3 related questions (e.g., "What is a hash table?" → "What about its time complexity?" → "How does Python implement this?") produces correct, contextually-aware answers
- [ ] Session history persists across HTTP requests for the same `student_id`
- [ ] Conversation window is limited to the last 3 turns to prevent context overflow

### Hierarchical Chunking (R4)
- [ ] All 5 textbooks are re-ingested with parent-child relationships
- [ ] Child chunks are ~200 tokens, parent chunks are ~800-1000 tokens
- [ ] RGB Benchmark: Information Integration score improves from 90% baseline to ≥ 93%
- [ ] The generator receives parent context, not just the retrieved child chunk text

### CRAG Fallback (R5)
- [ ] Queries with no relevant knowledge base match trigger graceful abstention instead of hallucinated answers
- [ ] RGB Benchmark: Hallucination Rate drops from 11.8% baseline to ≤ 8%
- [ ] The confidence threshold is configurable via `backend/rag_flags.php`

### Overall System Health
- [ ] FrankenPHP server continues to start and serve requests on port 8000
- [ ] P50 latency remains ≤ 500ms for cached queries
- [ ] The full RGB & RAGChecker benchmark suite runs successfully after all 5 features are integrated

## Verification Resources

The project includes an existing benchmark suite that must be used for verification:
- **Benchmark runner:** `tests/rag/benchmarks/rgb_ragchecker_suite.py` — executes 20 test cases across 4 RGB dimensions with independent judge scoring
- **Benchmark dataset:** `tests/rag/benchmarks/benchmark_dataset.json` — 20 standardized test vectors
- **System audit script:** `tests/rag/system_audit.php` — validates all 6 subsystems
- **FrankenPHP server:** Start via `.\bin\frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend`
- **Ollama models:** `llama3.2:latest`, `nomic-embed-text:latest`, `qwen3:4b` (must be running on port 11434)
- **RAG API endpoint:** `POST http://127.0.0.1:8000/api/rag/ask` with header `X-Service-Key: lms-n8n-service-key-2026`


## 2026-10-03T12:00:28Z

Upgrade the existing EduConnect-LMS-Experimental frontend (React 19 + Vite + Tailwind CSS + TypeScript) to fully showcase 5 recently implemented RAG pipeline features that are currently invisible behind the API, add a live metrics dashboard to the admin portal, and rewrite the project README with architecture diagrams and benchmark results. This is a college project presentation layer — the RAG backend is complete and scoring 97.2% on academic benchmarks; the gap is in the UI and documentation.

Working directory: `d:\Collage project\EduConnect-LMS-Experimental`
Integrity mode: development

## Requirements

### R1. Upgrade the AI Tutor Chat Modal
The existing chat component at `frontend/src/components/AiTutorModal.tsx` (230 lines, React + TypeScript) calls `POST /api/rag/ask` but does not leverage multi-turn conversation memory, page-aware citations, CRAG fallback responses, or query rewriting indicators. Upgrade it to:
- Send `student_id` (available from Supabase auth in the parent `StudentDashboard.tsx` at line 52) with every request so the backend's multi-turn conversational memory activates
- Include the header `X-Service-Key: lms-n8n-service-key-2026` on RAG API requests
- Display page numbers in source citations when the response includes page metadata (from parent-child hierarchical chunking)
- Render CRAG fallback abstention responses (where `backend === 'crag_fallback_gate'` or `abstained === true`) with visually distinct styling (amber/warning card) instead of a normal assistant message
- When the response includes `query_condensation.rewritten === true`, show a subtle indicator below the user's message: "↳ Interpreted as: {condensed_query}"
- Add a "New Conversation" button in the header that clears the local chat history
- Wire `studentId` as a prop from `StudentDashboard.tsx` instead of the current `CustomEvent` dispatch pattern (line 737)

### R2. RAG Pipeline Metrics Dashboard
Build a new admin-only dashboard page that visualizes the RAG pipeline's operational telemetry. The backend already writes microsecond-resolution JSONL logs to `backend/storage/pipeline_logs/pipeline_YYYY-MM-DD.jsonl` with fields: `total_pipeline`, `cache_lookup`, `retrieval`, `confidence_gate`, `context_compression`, `llm_generation`, `cache_hit`, `chunks_scored`, `chunks_returned`, `confidence`, `query_length`. The dashboard should show:
- Pipeline health status (whether FrankenPHP :8000, Reranker :8100, and Ollama :11434 are responding)
- Latency distribution of recent queries
- Per-stage latency breakdown (which pipeline stages are slowest)
- Cache hit rate
- Knowledge base statistics (chunk count, parent chunk count)
- The latest benchmark scores from `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json`

Create a new PHP backend endpoint (`GET /api/rag/metrics`) that reads and aggregates the JSONL telemetry logs and benchmark report JSON, protected by the service key header. Add the dashboard as a new tab in the existing admin portal (`frontend/src/pages/admin/AdminDashboard.tsx`).

### R3. README Rewrite
Rewrite the project `README.md` to showcase the complete system including the RAG engine. Include:
- A Mermaid architecture diagram showing the full pipeline flow (Student UI → FrankenPHP → Hybrid Retrieval → Cross-Encoder Reranker → CRAG Gate → Context Assembly → Ollama LLM → Response)
- A benchmark scorecard table with all 8 RGB/RAGChecker metrics and their scores
- The complete tech stack (React, Vite, Tailwind, PHP, FrankenPHP, SQLite + sqlite-vec, Ollama, FastAPI cross-encoder microservice)
- Quick-start instructions (start Ollama, start backend services, start frontend dev server)
- The 5 RAG features listed with brief descriptions

## Acceptance Criteria

### AI Tutor Chat (R1)
- [ ] `frontend/src/components/AiTutorModal.tsx` sends `student_id` and `X-Service-Key` header with every RAG request
- [ ] Asking a follow-up question (e.g., "What is useState?" then "How does its setter work?") produces a contextually-aware answer that references React useState
- [ ] Source citations display page numbers when available in the response
- [ ] Out-of-domain queries (e.g., "What is quantum physics?") render with visually distinct amber/warning styling, not as a regular assistant message
- [ ] When query rewriting occurs, a "↳ Interpreted as:" subtitle appears below the user's message
- [ ] A "New Conversation" button is visible in the modal header and clears chat history when clicked
- [ ] `npm run build` in the frontend directory completes without TypeScript or build errors

### Metrics Dashboard (R2)
- [ ] `GET /api/rag/metrics` with service key header returns valid JSON containing latency aggregates, cache stats, and benchmark scores
- [ ] The admin portal has a new "RAG Pipeline" or similar tab that renders the metrics dashboard
- [ ] The dashboard displays at least: a latency visualization, cache hit rate, knowledge base chunk count, and the 8 benchmark metric scores
- [ ] `npm run build` completes without errors

### README (R3)
- [ ] `README.md` contains a Mermaid diagram that renders correctly (valid Mermaid syntax)
- [ ] The benchmark scorecard table shows all 8 metrics with their actual scores
- [ ] Quick-start instructions reference Ollama, FrankenPHP, and the frontend dev server
- [ ] The 5 RAG features (Cross-Encoder Reranker, sqlite-vec ANN, Conversational Memory, Hierarchical Chunking, CRAG Fallback) are listed

## Verification Resources

- **Existing frontend:** `frontend/` directory is a complete React 19 + Vite + Tailwind project. Run `npm run dev` to start dev server on port 5173.
- **Existing chat component:** `frontend/src/components/AiTutorModal.tsx` — the component to upgrade
- **Existing student dashboard:** `frontend/src/pages/student/StudentDashboard.tsx` — 1,587 lines, has `studentId` at line 52 and AI tutor button at line 737
- **Existing admin dashboard:** `frontend/src/pages/admin/AdminDashboard.tsx` — add new tab here
- **API service config:** `frontend/src/services/api.ts` — axios instance pointing to `http://localhost:8000`
- **Backend API router:** `backend/index.php` — add new route for metrics endpoint
- **Pipeline telemetry logs:** `backend/storage/pipeline_logs/pipeline_*.jsonl`
- **Benchmark report:** `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json`
- **RAG API endpoint:** `POST http://127.0.0.1:8000/api/rag/ask` with header `X-Service-Key: lms-n8n-service-key-2026`
- **System audit:** `php tests/rag/system_audit.php` — must still pass 100% after changes
- **Build verification:** `cd frontend && npm run build` — must complete without errors


## 2026-10-03T12:08:48Z

User Directive: Apply installed Antigravity frontend plugins and skills to the active presentation layer tasks. 

I have created `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md` synthesizing:
1. `modern-web-guidance-plugin` (Google Chrome: smooth transitions, view states, accessible inputs, ARIA standards) for AiTutorModal.tsx.
2. `building-data-apps` (Data Agent Kit: KPI stat cards, latency stage breakdown visualization, benchmark scorecard) for RagMetricsDashboard.tsx.
3. `gsd-ui-review` (6-pillar visual and accessibility audit) for Reviewer and Challenger evaluation rubrics.

Please ensure orchestrator_2 injects these standards into the M1 & M2 worker dispatch prompts and reviewer evaluation criteria.


## 2026-10-04T06:55:18Z

Implement real-time Server-Sent Events (SSE) token streaming in the AI Tutor chat UI, clean up legacy experiment scratch scripts and snapshots into an organized archive folder, decompose the monolithic AdminDashboard into modular components, and provide a unified one-command launch script and presentation guide for EduConnect-LMS-Experimental.

Working directory: `d:\Collage project\EduConnect-LMS-Experimental`
Integrity mode: development

## Requirements

### R1. Real-Time Token Streaming in AI Tutor Modal
Upgrade `frontend/src/components/AiTutorModal.tsx` to consume the existing Server-Sent Events streaming endpoint (`POST /api/rag/ask` with `"stream": true`). Instead of buffering the entire answer, stream incoming tokens in real-time as they are yielded from Ollama, displaying a live typing cursor. Ensure all metadata (`sources`, page numbers, query condensation rewrite subtitle `↳ Interpreted as:`, and CRAG amber warning cards) are preserved and displayed when the stream completes. Provide automatic fallback to buffered mode if the stream connection fails.

### R2. Repository Hygiene & Archival
Move obsolete experimental test scripts (`scratch/test_*.php/py/js`) and legacy champion/candidate snapshot files in `backend/*.exp00XX*` into an organized archive folder (`archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`). Keep production test suites in `tests/rag/` intact. Ensure `git status` is clean, professional, and free of untracked scratch files.

### R3. Admin Dashboard Modularization
Refactor `frontend/src/pages/admin/AdminDashboard.tsx` by extracting the RAG telemetry and benchmark visualization tab into a clean, standalone component: `frontend/src/pages/admin/components/RagPipelineTab.tsx`. Ensure all state, telemetry fetches, and benchmark scorecards work seamlessly within the modular component.

### R4. One-Command Startup Automation & Showcase Guide
Create a unified PowerShell launch script (`start-all.ps1`) that checks and launches all required services (Ollama daemon with required models, Python Cross-Encoder on port 8100, FrankenPHP on port 8000, and Vite dev server on port 5173) with health check verification. Create `VIVA_PRESENTATION_GUIDE.md` containing a 3-slide viva architecture outline and a 2-minute live demo script.

## Acceptance Criteria

### Streaming AI Tutor (R1)
- [ ] Submitting a question in `AiTutorModal.tsx` streams tokens progressively to the UI with a blinking cursor
- [ ] Citation badges, page numbers (`p. X`), and query condensation subtitles render correctly on stream completion
- [ ] CRAG fallback abstentions continue to render as distinct amber warning cards
- [ ] `npm run build` in `frontend/` compiles with 0 errors

### Repo Hygiene (R2)
- [ ] Root `backend/` and `scratch/` are cleaned of transient experiment test files; files are preserved in `archive/experiments/`
- [ ] `php tests/rag/system_audit.php` passes with 100% OK
- [ ] Regression benchmark suite runs without missing file errors

### Modular Admin Dashboard (R3)
- [ ] `RagPipelineTab.tsx` is extracted into its own component and imported cleanly into `AdminDashboard.tsx`
- [ ] The "RAG Pipeline" tab continues to display live telemetry, health probes, latency breakdown bars, and benchmark scorecard
- [ ] `npm run build` passes with 0 TypeScript errors

### Startup & Presentation (R4)
- [ ] `start-all.ps1` successfully verifies/starts all 4 services and confirms port availability
- [ ] `VIVA_PRESENTATION_GUIDE.md` provides clear talking points for the 5 RAG features and a step-by-step demo script
