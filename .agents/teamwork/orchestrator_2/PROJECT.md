# Project: EduConnect-LMS-Experimental Presentation Layer Upgrades

## Architecture
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 + TypeScript + Lucide React (`frontend/`)
- **Backend Application Server**: FrankenPHP on port 8000 (`backend/`)
- **RAG Services**:
  - Neural Cross-Encoder Reranker: FastAPI microservice on port 8100 (`backend/services/reranker_service.py`)
  - Local LLM Gateway: Ollama daemon on port 11434 (`llama3.2:latest`, `nomic-embed-text:latest`, `qwen3:4b`)
  - Vector Database: SQLite with `sqlite-vec` extension (`backend/storage/vectors.sqlite`)
  - Conversational Session Store: SQLite (`backend/storage/student_sessions.sqlite`)
  - Telemetry Logger: JSONL microsecond pipeline logs (`backend/storage/pipeline_logs/`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Prop Wiring & Student ID | Pass `studentId` prop directly from `StudentDashboard.tsx` to `AiTutorModal.tsx` and forward `student_id` in POST body | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Service Key Header | Include `X-Service-Key: lms-n8n-service-key-2026` in RAG requests from frontend | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Page Number Citations | Extract chunk metadata page citations in `backend/rag_service.php` and render `(Sec X • p. Y)` in `AiTutorModal.tsx` | M1 | ORIGINAL_REQUEST §R1 |
| 4 | CRAG Fallback Styling | Distinct amber/warning card for abstained answers (`backend === 'crag_fallback_gate'` or `abstained === true`) | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Query Rewrite Indicator | Render "↳ Interpreted as: {condensed_query}" under user message when `query_condensation.rewritten === true` | M1 | ORIGINAL_REQUEST §R1 |
| 6 | New Conversation Button | Header button in `AiTutorModal.tsx` to reset local chat and call `POST /api/rag/clear` | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Modern Web Standards | Smooth animations, accessible dialog ARIA attributes, focus rings, balanced text wrapping (`modern-web-guidance-plugin`) | M1 | Directive / FRONTEND_PLUGINS_GUIDANCE |
| 8 | CORS Header Configuration | Add `X-Service-Key` to `Access-Control-Allow-Headers` in `backend/config.php` | M2 | Survey Explorer 2 |
| 9 | Backend Metrics Endpoint | New route `GET /api/rag/metrics` in `backend/index.php` (via `backend/rag_pipeline_metrics.php`) with service key auth | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Telemetry Aggregation | Parse JSONL pipeline logs for P50/avg latency, distribution buckets, stage breakdown, and cache hit rate | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Knowledge Base Statistics | Query `backend/storage/vectors.sqlite` for chunk counts (1,323 chunks, 333 parent chunks) | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Subsystem Health Probing | Fast (<400ms) non-blocking health check for FrankenPHP (:8000), Reranker (:8100), Ollama (:11434) | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Academic Benchmark Data | Read and structure the 8 RGB / RAGChecker metrics from `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json` | M2 | ORIGINAL_REQUEST §R2 |
| 14 | Admin Dashboard Tab | Add "RAG Pipeline" tab in `AdminDashboard.tsx` with KPI cards, stage breakdown bars, scorecard table, and activity feed | M2 | ORIGINAL_REQUEST §R2 |
| 15 | Building Data Apps Standards | Modern KPI stat cards, stage latency breakdown bars, benchmark scorecard layout (`building-data-apps`) | M2 | Directive / FRONTEND_PLUGINS_GUIDANCE |
| 16 | Mermaid Flowchart | End-to-end pipeline architecture diagram in `README.md` | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Benchmark Scorecard Table | Full table with 8 RGB/RAGChecker metrics, actual scores, and thresholds in `README.md` | M3 | ORIGINAL_REQUEST §R3 |
| 18 | Tech Stack Documentation | Comprehensive enumeration of technologies, models, and runtimes in `README.md` | M3 | ORIGINAL_REQUEST §R3 |
| 19 | Quick-Start Guide | Step-by-step instructions to run Ollama, backend services, and frontend dev server in `README.md` | M3 | ORIGINAL_REQUEST §R3 |
| 20 | 5 RAG Features Showcase | Feature descriptions for Reranker, sqlite-vec, Memory, Hierarchical Chunking, CRAG in `README.md` | M3 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: AI Tutor Chat Modal Upgrades | `frontend/src/components/AiTutorModal.tsx`, `frontend/src/pages/student/StudentDashboard.tsx`, `frontend/src/services/api.ts`, `backend/rag_service.php`, `backend/index.php` | Survey Complete | DONE |
| 2 | M2: RAG Pipeline Metrics Dashboard | `backend/config.php`, `backend/rag_pipeline_metrics.php`, `backend/index.php`, `frontend/src/pages/admin/AdminDashboard.tsx`, `frontend/src/components/Layout.tsx` | M1 Contract Defined | DONE |
| 3 | M3: README Showcase & Documentation | `README.md` | Survey Complete | IN_PROGRESS |

## Code Layout & Boundaries
- **Milestone 1 Owned Files**:
  - `frontend/src/components/AiTutorModal.tsx`
  - `frontend/src/pages/student/StudentDashboard.tsx`
  - `frontend/src/services/api.ts`
  - `backend/rag_service.php` (lines ~1890 & ~2425 for page citations)
  - `backend/index.php` (`/api/rag/clear` endpoint)
- **Milestone 2 Owned Files**:
  - `backend/config.php` (CORS headers)
  - `backend/rag_pipeline_metrics.php` (new service)
  - `backend/index.php` (`/api/rag/metrics` endpoint)
  - `frontend/src/pages/admin/AdminDashboard.tsx`
  - `frontend/src/components/Layout.tsx` (navigation link)
- **Milestone 3 Owned Files**:
  - `README.md`

## Interface Contracts
### AI Tutor Modal ↔ RAG API
- Request: `POST /api/rag/ask`
  - Headers: `X-Service-Key: lms-n8n-service-key-2026`, `Content-Type: application/json`
  - Body: `{ question: string, student_id?: string, course_id?: string, batch_id?: string }`
- Response:
  - `answer`: string
  - `sources`: `Array<{ title: string, chunk_index: number, similarity: number, page?: string }>`
  - `backend`: string (e.g. `'crag_fallback_gate'`, `'safety_boundary_gate'`, `'ollama_llama3.2'`)
  - `abstain` / `abstained`: boolean
  - `query_condensation`: `{ rewritten: boolean, original_query: string, condensed_query: string, latency_ms: number } | null`

### Session Clear API
- Request: `POST /api/rag/clear`
  - Headers: `X-Service-Key: lms-n8n-service-key-2026`, `Content-Type: application/json`
  - Body: `{ student_id: string }`
- Response: `{ success: true, message: string }`

### RAG Metrics API
- Request: `GET /api/rag/metrics`
  - Headers: `X-Service-Key: lms-n8n-service-key-2026` or `Authorization: Bearer <token>`
- Response:
  - `success`: boolean
  - `services`: `{ frankenphp: Status, reranker: Status, ollama: Status }`
  - `knowledge_base`: `{ total_chunks: 1323, parent_chunks: 333, textbooks_count: 5, index_type: string }`
  - `telemetry`: `{ total_queries: number, cache_hits: number, cache_hit_rate: number, latency_summary: Latencies, latency_distribution: Bucket[], stage_breakdown: Stages }`
  - `benchmarks`: `{ overall_status: string, overall_score: number, metrics: Metric[] }`
