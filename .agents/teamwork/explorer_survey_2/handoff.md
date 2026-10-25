# Handoff Report: R2 RAG Pipeline Metrics Dashboard & Backend Telemetry

**Agent:** `explorer_survey_2`  
**Date:** 2026-10-03  
**Target:** Orchestrator & Implementer Agents  
**Scope:** Investigation and Architectural Blueprint for R2 (Backend Metrics Endpoint `GET /api/rag/metrics` and Admin Portal Dashboard Tab)

---

## 1. Observation

### 1.1 Backend Routing & Authentication (`backend/index.php`, `backend/config.php`, `backend/auth_middleware.php`)
- **Routing Engine (`backend/index.php:120-146`):**
  ```php
  $requestUri = $_SERVER['REQUEST_URI'];
  $requestPath = parse_url($requestUri, PHP_URL_PATH);
  $method = $_SERVER['REQUEST_METHOD'];
  $scriptName = $_SERVER['SCRIPT_NAME'];
  $basePath = dirname($scriptName);
  $route = substr($requestPath, strlen($basePath));
  $route = '/' . ltrim($route, '/');
  ```
  Routing operates on a `switch (true)` matching `$route === '...' && $method === '...'`.
- **Existing RAG Endpoint (`backend/index.php:1193`):**
  `case ($route === '/api/rag/ask' && $method === 'POST'):`
  Secured via:
  ```php
  $user = verifyTokenOrApiKey();
  ```
- **Service API Key Verification (`backend/auth_middleware.php:210-247`):**
  ```php
  function verifyServiceApiKey() {
      global $SERVICE_API_KEY;
      $effectiveKey = $SERVICE_API_KEY ?: (getenv('LMS_SERVICE_API_KEY') ?: 'lms-n8n-service-key-2026');
      if (empty($effectiveKey)) return null;
      if (!verifyGatewayTrust()) return null;
      $headers = function_exists('getallheaders') ? getallheaders() : [];
      $serviceKey = null;
      foreach ($headers as $key => $value) {
          if (strtolower($key) === 'x-service-key') { $serviceKey = $value; break; }
      }
      if ($serviceKey === null && isset($_SERVER['HTTP_X_SERVICE_KEY'])) {
          $serviceKey = $_SERVER['HTTP_X_SERVICE_KEY'];
      }
      if (!$serviceKey || !hash_equals($effectiveKey, $serviceKey)) return null;
      return [
          'id' => '4f8d3aaa-afba-499d-ab3a-19b3c9428f93',
          'email' => 'service@lms.internal',
          'role_id' => 1,
          'role' => 'SERVICE',
          'full_name' => 'n8n Service Account'
      ];
  }
  ```
- **Gateway Trust Logic (`backend/auth_middleware.php:175-184`):**
  When `$GATEWAY_TRUST_TOKEN` is not set in env (standard dev setup), requests from `127.0.0.1`, `::1`, or empty `REMOTE_ADDR` are automatically trusted.
- **CORS Header Gotcha (`backend/config.php:38`):**
  ```php
  header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, apikey");
  ```
  `X-Service-Key` is currently NOT in `Access-Control-Allow-Headers`. If the frontend browser makes preflight `OPTIONS` requests sending `X-Service-Key`, it will fail CORS unless `X-Service-Key` is appended.

### 1.2 Pipeline Log Telemetry (`backend/storage/pipeline_logs/`)
- Directory contains: `pipeline_2026-10-02.jsonl` (75 lines) and `pipeline_2026-10-03.jsonl` (244 lines). Total entries: **319**.
- Schema for Cache Hit entries:
  ```json
  {
    "query_id": "q_58eb7fc7a1c9",
    "timestamp": "2026-10-03T07:18:38+00:00",
    "total_ms": 71.65,
    "stages": {
      "cache_lookup": 70.91,
      "total_pipeline": 71.38
    },
    "metadata": {
      "cache_hit": true,
      "query_length": 61
    }
  }
  ```
- Schema for Full Pipeline Generation entries:
  ```json
  {
    "query_id": "q_bfc361229fa5",
    "timestamp": "2026-10-03T07:45:35+00:00",
    "total_ms": 6971.76,
    "stages": {
      "cache_lookup": 948.44,
      "retrieval": 889.67,
      "confidence_gate": 0.1,
      "context_compression": 1.1,
      "llm_generation": 5086.02,
      "total_pipeline": 6969.92
    },
    "metadata": {
      "chunks_scored": 4,
      "chunks_returned": 4,
      "confidence": 0.9737,
      "abstained": false,
      "query_length": 84,
      "cache_hit": false,
      "experiment_mode": "EXP-0023"
    }
  }
  ```
- Computed aggregate values across all 319 records:
  - Cache hits: **200 / 319 (62.7%)**
  - Cache misses: **119 / 319 (37.3%)**
  - Latencies: Min `15.9ms`, P50 `245.8ms`, P90 `6065.6ms`, P95 `45196.2ms`, Avg `4397.5ms`, Max `56597.9ms`.
  - Stage averages:
    - `cache_lookup`: 186.3ms (P50: 44.0ms)
    - `retrieval`: 663.8ms (P50: 715.1ms)
    - `confidence_gate`: 0.84ms (P50: 0.04ms)
    - `context_compression`: 0.49ms (P50: 0.13ms)
    - `llm_generation`: 3,815.8ms (P50: 2,441.5ms) — primary bottleneck (~85% of generation time)
  - Latency distribution breakdown:
    - `< 100ms`: 138 (43.3%)
    - `100ms - 500ms`: 27 (8.5%)
    - `500ms - 2s`: 40 (12.5%)
    - `2s - 5s`: 71 (22.3%)
    - `5s - 10s`: 21 (6.6%)
    - `> 10s`: 21 (6.6%)

### 1.3 Academic Benchmark Data (`tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json` & `.md`)
- File exists and contains the full benchmark run:
  - Metadata: 20 test cases, 1,323 corpus chunks, generator `llama3.2:latest`, judge `qwen3:4b`.
  - The 8 metrics:
    1. **Noise Robustness:** `0.96` (96.0%, threshold $\ge 80.0\%$, PASS)
    2. **Negative Rejection:** `1.00` (100.0%, threshold $\ge 80.0\%$, PASS)
    3. **Information Integration:** `0.93` (93.0%, threshold $\ge 75.0\%$, PASS)
    4. **Counterfactual Robustness:** `1.00` (100.0%, threshold $\ge 80.0\%$, PASS)
    5. **Overall RGB Composite:** `0.9725` (97.25%, threshold $\ge 80.0\%$, PASS)
    6. **Claim Precision:** `0.9259` (92.59%, threshold $\ge 80.0\%$, PASS)
    7. **Claim Recall:** `0.9466` (94.66%, threshold $\ge 75.0\%$, PASS)
    8. **Hallucination Rate:** `0.0741` (7.41%, threshold $\le 15.0\%$, PASS)
  - Overall status: `"PASSED"`

### 1.4 Vector Knowledge Base Statistics (`backend/storage/vectors.sqlite`)
- Tables verified via SQLite query:
  - `material_chunks`: 1,323 chunks.
  - `parent_chunks`: 333 hierarchical parent chunks.
  - `material_chunks.parent_chunk_id`: 1,323 / 1,323 (100% mapped).
  - Materials: 10 distinct IDs (5 full textbooks: PostgreSQL 16, Eloquent JS 4th Ed, Pro Git 2nd Ed, Think Python 3rd Ed, Data Science Handbook + 5 core modules).
  - Vector dimensionality: 768 float32.
  - ANN table: `material_chunks_vec` (sqlite-vec virtual table).

### 1.5 Subsystem Health Probing (Ports 8000, 8100, 11434)
Live test executed via Python/curl:
- **Port 8000 (FrankenPHP):** Responding (HTTP 200 on RAG endpoint).
- **Port 8100 (Reranker FastAPI):** Responding (`GET /health` returns HTTP 200, `{"status": "ok", "model": "cross-encoder/ms-marco-MiniLM-L-6-v2", "device": "cpu", "loaded": true, "vram_mb": 0.0}`).
- **Port 11434 (Ollama):** Responding (`GET /api/tags` returns HTTP 200, models include `llama3.2:latest`, `nomic-embed-text:latest`, `qwen3:4b`).
- Subsystem health can be probed in PHP using `curl_init` with a strict 400ms timeout so the metrics endpoint always returns in $< 500$ms.

### 1.6 Frontend Architecture & UI Patterns
- **Build status:** `npm run build` in `frontend/` succeeds with 0 errors.
- **Dependencies (`frontend/package.json`):**
  - React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.1, Lucide React 1.20.0, Axios 1.18.0.
  - **No charting library is installed** (neither Chart.js nor Recharts).
- **Styling (`frontend/src/index.css`):**
  - Custom utilities: `glass-card`, `glass-input`, `btn-primary`, `btn-secondary`.
  - Card pattern: `bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6`.
  - Visual metrics pattern: CSS percentage width bars (`w-[X%]`, `h-2 bg-slate-800 rounded-full overflow-hidden`, `bg-primary-500`).
- **Tab Layout:**
  - `AdminDashboard.tsx:751` has tab array: `['summary', 'courses', 'batches', 'teachers', 'students', 'fees', 'timetable', 'certificates', 'notifications', 'reports']`.
  - Adding `'rag-pipeline'` cleanly extends this list.
  - `frontend/src/components/Layout.tsx:200-212` has sidebar links for `SUPER_ADMIN`. Adding `{ name: 'RAG Pipeline', path: '/admin/rag-pipeline', icon: Cpu }` connects the sidebar navigation.
  - `frontend/src/App.tsx:92-93` uses `<Route path="/:tab" element={<AdminDashboard />} />`, automatically routing `/admin/rag-pipeline`.

---

## 2. Logic Chain

1. **Routing and Authentication:**
   - From Obs 1.1, `backend/index.php` handles routes using `switch (true)`. Adding `case ($route === '/api/rag/metrics' && $method === 'GET'):` integrates directly with the existing routing convention.
   - Using `verifyServiceApiKey()` allows automated test calls and external integrations with `X-Service-Key: lms-n8n-service-key-2026`. Adding a fallback to `verifyToken(['ADMIN', 'SUPER_ADMIN'])` ensures authenticated admin users in the browser can view the dashboard even if the key header is omitted, while still accepting the key header if provided.
   - In `backend/config.php:38`, `Access-Control-Allow-Headers` must include `X-Service-Key` to avoid CORS preflight rejection when the browser sends the header.

2. **Data Aggregation Architecture:**
   - The backend already has `backend/rag_pipeline_analytics.php` with basic percentile calculation, but it lacks cache hit rate, overall query latency distribution buckets, health status probing, and benchmark report reading.
   - Creating a helper class `RagPipelineMetrics` (or extending `RagPipelineAnalytics`) that gathers data from:
     - `backend/storage/pipeline_logs/` $\to$ computes total queries, cache hit rate, latency percentiles (min, avg, p50, p90, p95, max), latency distribution buckets, per-stage stats, and recent query logs.
     - `backend/storage/vectors.sqlite` $\to$ queries chunk counts (`material_chunks` and `parent_chunks`).
     - `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json` $\to$ decodes the 8 benchmark metrics and overall composite.
     - Ports 8000, 8100, 11434 $\to$ performs non-blocking fast health probes ($\le 400$ms timeout).
   - This keeps `index.php` concise and isolates telemetry calculation.

3. **Frontend Implementation:**
   - From Obs 1.6, because external charting packages are not present in `package.json`, installing one could cause peer dependency conflicts with React 19.
   - The idiomatic approach in this LMS is using clean, professional Tailwind components:
     - Service Health status pills with pulsing indicator dots (`bg-emerald-500 animate-pulse`).
     - Metric cards for Cache Hit Rate, P50 latency, Total Chunks, and Academic Benchmark Score.
     - Stage breakdown horizontal bars comparing relative stage durations.
     - Histogram distribution bars for latency intervals.
     - Academic scorecard table showing the 8 metrics with PASS badges.
     - Live queries table with status, duration, and confidence.
   - This guarantees that `npm run build` will compile with zero errors and matches the aesthetic of the rest of `AdminDashboard.tsx`.

---

## 3. Caveats

1. **Service Downtime Handling:**
   If Ollama (11434) or Reranker (8100) is temporarily stopped, health probes must not cause `GET /api/rag/metrics` to hang or return 500. Probes must use short timeouts (e.g., 400ms) with `try...catch` / error handling and return `status: "offline"`.
2. **Empty Log State:**
   If the pipeline logs directory has no entries (e.g. on fresh deployment), the endpoint must return sensible default zeros rather than divide-by-zero errors.
3. **Admin Role Consistency:**
   Supabase user profiles in this LMS use `SUPER_ADMIN` in `App.tsx` and `ADMIN` in various backend tables. The auth check should accept both `ADMIN` and `SUPER_ADMIN`, as well as `SERVICE`.

---

## 4. Conclusion & Concrete Implementation Blueprint

### 4.1 Endpoint Contract: `GET /api/rag/metrics`
- **Request:**
  `GET /api/rag/metrics`  
  Headers: `X-Service-Key: lms-n8n-service-key-2026` (or `Authorization: Bearer <token>`)
- **Response Structure (200 OK):**
  ```json
  {
    "success": true,
    "timestamp": "2026-10-03T12:10:00Z",
    "services": {
      "frankenphp": { "status": "online", "port": 8000, "latency_ms": 0.5, "details": "FrankenPHP Worker Server" },
      "reranker": { "status": "online", "port": 8100, "latency_ms": 2.1, "model": "cross-encoder/ms-marco-MiniLM-L-6-v2", "device": "cpu", "vram_mb": 0.0 },
      "ollama": { "status": "online", "port": 11434, "latency_ms": 5.4, "models": ["llama3.2:latest", "nomic-embed-text:latest", "qwen3:4b"] }
    },
    "knowledge_base": {
      "total_chunks": 1323,
      "parent_chunks": 333,
      "textbooks_count": 5,
      "embedding_dim": 768,
      "index_type": "sqlite-vec (vec0 virtual table, cosine distance)"
    },
    "telemetry": {
      "total_queries": 319,
      "cache_hits": 200,
      "cache_misses": 119,
      "cache_hit_rate": 62.7,
      "bottleneck_stage": "llm_generation",
      "latency_summary": {
        "min_ms": 15.93,
        "max_ms": 56597.86,
        "avg_ms": 4397.54,
        "p50_ms": 245.77,
        "p90_ms": 6065.63,
        "p95_ms": 45196.16
      },
      "latency_distribution": [
        { "range": "< 100ms", "label": "Instant / Cache", "count": 138, "percentage": 43.3 },
        { "range": "100ms - 500ms", "label": "Fast Cache", "count": 27, "percentage": 8.5 },
        { "range": "500ms - 2s", "label": "Quick Synthesis", "count": 40, "percentage": 12.5 },
        { "range": "2s - 5s", "label": "Standard Generation", "count": 71, "percentage": 22.3 },
        { "range": "5s - 10s", "label": "Complex Generation", "count": 21, "percentage": 6.6 },
        { "range": "> 10s", "label": "Deep / Cold Run", "count": 21, "percentage": 6.6 }
      ],
      "stage_breakdown": {
        "cache_lookup": { "avg_ms": 186.28, "p50_ms": 43.99, "count": 319 },
        "retrieval": { "avg_ms": 663.77, "p50_ms": 715.14, "count": 119 },
        "confidence_gate": { "avg_ms": 0.84, "p50_ms": 0.04, "count": 119 },
        "context_compression": { "avg_ms": 0.49, "p50_ms": 0.13, "count": 119 },
        "llm_generation": { "avg_ms": 3815.76, "p50_ms": 2441.50, "count": 119 },
        "total_pipeline": { "avg_ms": 4397.21, "p50_ms": 245.51, "count": 319 }
      },
      "recent_queries": [ ... ]
    },
    "benchmarks": {
      "metadata": { ... },
      "overall_status": "PASSED",
      "overall_score": 0.9725,
      "metrics": [
        { "key": "noise_robustness", "name": "Noise Robustness", "category": "RGB (AAAI 2024)", "score": 96.0, "threshold": 80.0, "passed": true },
        { "key": "negative_rejection", "name": "Negative Rejection", "category": "RGB (AAAI 2024)", "score": 100.0, "threshold": 80.0, "passed": true },
        { "key": "information_integration", "name": "Information Integration", "category": "RGB (AAAI 2024)", "score": 93.0, "threshold": 75.0, "passed": true },
        { "key": "counterfactual_robustness", "name": "Counterfactual Robustness", "category": "RGB (AAAI 2024)", "score": 100.0, "threshold": 80.0, "passed": true },
        { "key": "overall_rgb_score", "name": "Overall RGB Composite", "category": "RGB Summary", "score": 97.25, "threshold": 80.0, "passed": true },
        { "key": "claim_precision", "name": "Claim Precision", "category": "RAGChecker (NeurIPS 2024)", "score": 92.59, "threshold": 80.0, "passed": true },
        { "key": "claim_recall", "name": "Claim Recall", "category": "RAGChecker (NeurIPS 2024)", "score": 94.66, "threshold": 75.0, "passed": true },
        { "key": "hallucination_rate", "name": "Hallucination Rate", "category": "RAGChecker (NeurIPS 2024)", "score": 7.41, "threshold": 15.0, "passed": true, "inverted": true }
      ]
    }
  }
  ```

### 4.2 Exact Code Modifications Plan
1. **`backend/config.php`:**
   In line 38, update:
   ```php
   header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, apikey, X-Service-Key");
   ```
2. **`backend/rag_pipeline_metrics.php` (New File):**
   Implement `RagPipelineMetrics::getMetrics()` reading JSONL logs, querying SQLite for chunk stats, reading benchmark JSON, and probing services.
3. **`backend/index.php`:**
   Add `require_once 'rag_pipeline_metrics.php';` and:
   ```php
   case ($route === '/api/rag/metrics' && $method === 'GET'):
       $serviceUser = verifyServiceApiKey();
       if ($serviceUser === null) {
           $user = verifyToken();
           if (!in_array($user['role'] ?? '', ['ADMIN', 'SUPER_ADMIN', 'SERVICE'])) {
               http_response_code(403);
               echo json_encode(['success' => false, 'error' => 'Forbidden: ADMIN or Service Key required']);
               break;
           }
       }
       $metrics = RagPipelineMetrics::getMetrics();
       echo json_encode(['success' => true, 'metrics' => $metrics]);
       break;
   ```
4. **`frontend/src/components/Layout.tsx`:**
   Add `{ name: 'RAG Pipeline', path: '/admin/rag-pipeline', icon: Cpu }` to `getNavigation()` for `SUPER_ADMIN`.
5. **`frontend/src/pages/admin/AdminDashboard.tsx`:**
   - Add `'rag-pipeline'` to the tab buttons array.
   - Implement telemetry fetching with `api.get('/api/rag/metrics', { headers: { 'X-Service-Key': 'lms-n8n-service-key-2026' } })`.
   - Render tab content with the 6 visual sections (Health cards, KPI cards, Stage breakdown progress bars, Latency distribution histogram, Benchmark scorecard table, and Recent activity log).

---

## 5. Verification Method

### 5.1 Backend Verification Commands
1. Verify endpoint with service key:
   ```powershell
   curl.exe -s http://127.0.0.1:8000/api/rag/metrics -H "X-Service-Key: lms-n8n-service-key-2026"
   ```
   *Expected:* HTTP 200 with JSON containing `services`, `knowledge_base`, `telemetry`, and `benchmarks`.
2. Verify unauthorized request is rejected:
   ```powershell
   curl.exe -s -o nul -w "%{http_code}" http://127.0.0.1:8000/api/rag/metrics
   ```
   *Expected:* HTTP 401 or 403.
3. Verify system audit continues to pass 100%:
   ```powershell
   php tests/rag/system_audit.php
   ```
   *Expected:* `SYSTEM AUDIT RESULT: ALL SUBSYSTEMS HEALTHY & OPERATIONAL (100% OK)`.

### 5.2 Frontend Verification Commands
1. Verify TypeScript and Vite production build:
   ```powershell
   cd frontend
   npm run build
   ```
   *Expected:* Exit code 0, 0 errors, production bundle generated.
2. Verify UI tab navigation:
   Navigate to `http://localhost:5173/admin/rag-pipeline` in browser, verify all 6 telemetry cards and tables render smoothly without console errors.

### 5.3 Invalidation Conditions
- If `GET /api/rag/metrics` takes $> 1000$ms to respond, health probe timeouts must be lowered.
- If any stage in JSONL is missing or null, calculations must use null-safe defaults (`?? 0`).
- If `npm run build` fails on unused imports or type mismatches, TypeScript types must be strictly defined.
