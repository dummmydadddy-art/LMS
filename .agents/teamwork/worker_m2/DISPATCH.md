# Task Assignment: Worker M2 (RAG Pipeline Metrics Dashboard)

- Your Identity: `worker_m2` (role: teamwork_preview_worker)
- Your Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2`
- Authoritative User Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 86-160)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md`
- Frontend Plugins Guidance: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md`
- Survey Explorer Report: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_2\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Owned Files (Exclusively Yours)
- `backend/config.php`
- `backend/rag_pipeline_metrics.php` (new service)
- `backend/index.php`
- `frontend/src/pages/admin/AdminDashboard.tsx`
- `frontend/src/components/Layout.tsx`

## Implementation Checklist
1. **CORS Headers (`backend/config.php`)**:
   - Add `X-Service-Key` to `Access-Control-Allow-Headers` in line 38 so browser preflight OPTIONS requests do not fail.
2. **Backend Telemetry & Metrics Service (`backend/rag_pipeline_metrics.php`)**:
   - Implement `RagPipelineMetrics::getMetrics()`:
     - **Service Health Probes**: Fast (<400ms timeout) non-blocking curl probes for FrankenPHP (:8000), Reranker (:8100 `/health`), and Ollama (:11434 `/api/tags`). Return status (`online`/`offline`), latency_ms, and details.
     - **JSONL Pipeline Logs Parsing**: Read all `.jsonl` files in `backend/storage/pipeline_logs/`. Compute: total queries, cache hits, cache misses, cache hit rate %, latency percentiles (min, max, avg, P50, P90, P95), latency distribution buckets (<100ms, 100-500ms, 500ms-2s, 2s-5s, 5s-10s, >10s), per-stage breakdown averages and P50s (`cache_lookup`, `retrieval`, `confidence_gate`, `context_compression`, `llm_generation`, `total_pipeline`), and recent queries list.
     - **Knowledge Base Statistics**: Query `backend/storage/vectors.sqlite` for `material_chunks` count (1,323), `parent_chunks` count (333), and textbook count (5).
     - **Academic Benchmark Report**: Read `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json` and return the 8 metrics with categories, thresholds, and scores (Noise Robustness: 96%, Negative Rejection: 100%, Information Integration: 93%, Counterfactual Robustness: 100%, Overall RGB Composite: 97.25%, Claim Precision: 92.59%, Claim Recall: 94.66%, Hallucination Rate: 7.41%).
3. **Backend API Route (`backend/index.php`)**:
   - Add `require_once 'rag_pipeline_metrics.php';`
   - Add `case ($route === '/api/rag/metrics' && $method === 'GET'):`
   - Protect with `verifyServiceApiKey()` (matching `X-Service-Key: lms-n8n-service-key-2026`) with fallback to `verifyToken(['ADMIN', 'SUPER_ADMIN'])`.
   - Return `{ "success": true, "metrics": RagPipelineMetrics::getMetrics() }`.
4. **Admin Dashboard UI (`frontend/src/pages/admin/AdminDashboard.tsx`)**:
   - Add `'rag-pipeline'` tab button to the tabs array.
   - Fetch metrics from `/api/rag/metrics` on mount / tab switch using `api.get('/api/rag/metrics', { headers: { 'X-Service-Key': 'lms-n8n-service-key-2026' } })`. Provide refresh button and loading/error states.
   - Render the comprehensive RAG Pipeline Dashboard applying `building-data-apps` standards:
     - **Subsystem Health Cards**: FrankenPHP, Reranker, Ollama status cards with pulsing green/red indicators and model/latency details.
     - **KPI Stat Cards**: Total Queries, P50 Latency, Cache Hit Rate (with visual meter), and Knowledge Base Chunks (1,323 chunks / 333 parents).
     - **Latency & Stage Breakdown**: Visual horizontal progress bars showing duration and % of pipeline per stage (`cache_lookup`, `retrieval`, `confidence_gate`, `context_compression`, `llm_generation`).
     - **Latency Distribution Histogram**: Visual bar chart for latency buckets.
     - **Academic Benchmark Scorecard**: Table/card with the 8 AAAI RGB & NeurIPS RAGChecker metrics, thresholds, and PASS badges.
     - **Recent Activity Telemetry Feed**: Table showing recent queries with query ID, time, total ms, cache hit, and confidence.
5. **Sidebar Navigation (`frontend/src/components/Layout.tsx`)**:
   - Add `{ name: 'RAG Pipeline', path: '/admin/rag-pipeline', icon: Cpu }` to `getNavigation()` for `SUPER_ADMIN`.
6. **Verification Required**:
   - Run `npm run build` in `frontend/` — MUST pass with 0 errors.
   - Run `php tests/rag/system_audit.php` — MUST pass 100% OK.
   - Test `GET /api/rag/metrics` via curl/python with and without `X-Service-Key`.
   - Document commands, outputs, and results in your `handoff.md`.
## 2026-10-03T12:40:49Z
[Message] sender=7fb1ad71-95ca-4da5-bf49-7c641200c2d0
You are worker_m2.
Implement all Milestone 2 requirements across your owned files:
- backend/config.php (CORS headers)
- backend/rag_pipeline_metrics.php (telemetry aggregator class)
- backend/index.php (GET /api/rag/metrics route)
- frontend/src/pages/admin/AdminDashboard.tsx (RAG Pipeline tab)
- frontend/src/components/Layout.tsx (sidebar link)
