# Technical Investigation & Architecture Specification: R3 Admin Modularization & R4 Startup Automation

**Explorer**: `explorer_survey_4_3`  
**Date**: 2026-10-04  
**Scope**: Requirement 3 (Admin Dashboard Modularization) & Requirement 4 (One-Command Startup & Showcase Guide)  
**Target Repository**: `EduConnect-LMS-Experimental`  

---

## 1. Executive Summary

This investigation covers two distinct workstreams of Milestone 4:
1. **R3: Admin Dashboard Modularization**: Decoupling the monolithic 2,836-line `frontend/src/pages/admin/AdminDashboard.tsx` by isolating the entire RAG Telemetry and Benchmark visualization system into a standalone component (`frontend/src/pages/admin/components/RagPipelineTab.tsx`). This removes ~570 lines of JSX, 4 state variables, 1 async fetch function, 1 effect hook, and 11 icon imports from `AdminDashboard.tsx`, while maintaining full type safety and zero behavioral regression.
2. **R4: One-Command Startup (`start-all.ps1`) & Showcase Guide (`VIVA_PRESENTATION_GUIDE.md`)**: Designing an automated orchestration script for the 4 core local services (Ollama, Cross-Encoder, FrankenPHP, Vite) with pre-flight checks, health verification loops, colored terminal feedback, and graceful shutdown; accompanied by a comprehensive Viva defense guide featuring a 3-slide architectural blueprint, a 2-minute live demo script showcasing all 5 RAG innovations, and an examiner Q&A defense sheet.

All underlying runtimes (`python 3.11`, `torch 2.11`, `fastapi 0.136`, `bin/frankenphp.exe 1.12.7`, `ollama` with `llama3.2` & `nomic-embed-text`, and `node/vite 8`) have been verified operational on the host system.

---

## 2. Requirement 3: Admin Dashboard Modularization

### 2.1 Codebase Survey of `frontend/src/pages/admin/AdminDashboard.tsx`

`AdminDashboard.tsx` is currently a single monolithic file of **2,836 lines** handling 11 distinct tabs (`summary`, `courses`, `batches`, `teachers`, `students`, `fees`, `timetable`, `certificates`, `notifications`, `reports`, and `rag-pipeline`).

All code related to the RAG Pipeline tab is localized to specific regions:

| Element | Location in `AdminDashboard.tsx` | Description |
|---|---|---|
| **RAG Lucide Icons** | Lines 23–34 | `Cpu`, `Activity`, `Server`, `Zap`, `Database`, `RefreshCw`, `ShieldCheck`, `BarChart2`, `Clock`, `Sparkles`, `AlertTriangle`, `CheckCircle` |
| **RAG State Hooks** | Lines 116–120 | `ragMetrics` (any), `ragLoading` (bool), `ragError` (string \| null), `lastRefreshed` (string) |
| **Telemetry Fetcher** | Lines 122–143 | `fetchRagMetrics()` calling `api.get('/api/rag/metrics', { headers: { 'X-Service-Key': 'lms-n8n-service-key-2026' } })` |
| **Lifecycle Effect** | Lines 285–289 | `useEffect(() => { if (activeTab === 'rag-pipeline') { fetchRagMetrics(); } }, [activeTab])` |
| **Tab Definition** | Lines 797, 811 | Included in tab array `['summary', ..., 'rag-pipeline']` with label formatter `'rag-pipeline' ? 'RAG Pipeline'` |
| **Tab Content JSX** | Lines 2176–2744 (569 lines) | Entire RAG Pipeline UI containing Subsystem Health Cards, KPI Stat Cards, Stage Latency Breakdown, Latency Distribution Histogram, Academic Benchmark Scorecard, and Recent Query Telemetry Table |

### 2.2 Icon Dependency Isolation

A scan across `AdminDashboard.tsx` reveals that:
- **Exclusively used in RAG tab**: `Cpu`, `Activity`, `Server`, `Zap`, `Database`, `RefreshCw`, `ShieldCheck`, `BarChart2`, `Clock`, `Sparkles`, `AlertTriangle`, `CheckCircle`.
- **Shared with other tabs**: `XCircle` is also used at line 2764 in the Revenue Fee Details modal close button.
- **Outcome**: Removing the 11 exclusive icons from `AdminDashboard.tsx` declutters the import block without breaking any other tabs. `XCircle` must remain in `AdminDashboard.tsx` and also be imported in `RagPipelineTab.tsx`.

### 2.3 Proposed Modular Component: `frontend/src/pages/admin/components/RagPipelineTab.tsx`

#### Directory Placement
Create directory `frontend/src/pages/admin/components/` and place `RagPipelineTab.tsx` within it.

#### Component Interface Contract
```typescript
import React from 'react';

export interface RagPipelineTabProps {
  /** Optional initial metrics if preloaded by parent or SSR */
  initialMetrics?: any;
  /** Optional callback invoked when telemetry data is refreshed */
  onMetricsRefreshed?: (metrics: any) => void;
}

export const RagPipelineTab: React.FC<RagPipelineTabProps> = ({ ... }) => { ... };
export default RagPipelineTab;
```

#### Self-Contained Encapsulation
`RagPipelineTab.tsx` will manage its own lifecycle:
1. Holds internal state: `ragMetrics`, `ragLoading`, `ragError`, `lastRefreshed`.
2. Automatically triggers `fetchRagMetrics()` on initial component mount:
   ```typescript
   useEffect(() => {
     fetchRagMetrics();
   }, []);
   ```
3. Exposes an interactive manual "Refresh Telemetry" button with spinning `RefreshCw` icon.
4. Contains the error retry banner, loading pulse skeletons, and all 5 dashboard rows:
   - **Row 1**: Subsystem Health Probes (FrankenPHP :8000, Cross-Encoder :8100, Ollama :11434).
   - **Row 2**: Executive KPI Stat Cards (Total Queries, P50 Latency, Cache Hit Rate, Vector Corpus).
   - **Row 3**: Microsecond Stage Latency Breakdown (6 stages) & Latency Distribution Histogram (6 buckets).
   - **Row 4**: AAAI 2024 RGB & NeurIPS 2024 RAGChecker Academic Benchmark Scorecard (8 metrics with PASS/FAIL badges).
   - **Row 5**: Recent Query Telemetry Feed Table (Last 15 queries with execution latency, cache hit/miss badges, confidence %, and CRAG status).

#### Imports for `RagPipelineTab.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  Cpu,
  Activity,
  Server,
  Zap,
  Database,
  RefreshCw,
  ShieldCheck,
  BarChart2,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
```
*(Notice relative path `../../../services/api` resolves from `frontend/src/pages/admin/components/`).*

### 2.4 Refactoring Impact on `AdminDashboard.tsx`

1. **Imports**:
   ```typescript
   // Add:
   import RagPipelineTab from './components/RagPipelineTab';
   // Clean up unused icons:
   // Remove: Cpu, Activity, Server, Zap, Database, RefreshCw, ShieldCheck, BarChart2, Clock, Sparkles, AlertTriangle, CheckCircle
   ```
2. **State & Functions**:
   Remove lines 116–143 (`ragMetrics`, `ragLoading`, `ragError`, `lastRefreshed`, `fetchRagMetrics`).
3. **Effects**:
   Remove lines 285–289 (`useEffect` checking `activeTab === 'rag-pipeline'`).
4. **JSX Substitution**:
   Replace lines 2176–2744 (569 lines) with:
   ```tsx
   {/* --- 11. RAG PIPELINE TELEMETRY TAB --- */}
   {activeTab === 'rag-pipeline' && <RagPipelineTab />}
   ```
5. **Net File Reduction**: `AdminDashboard.tsx` shrinks from 2,836 lines to ~2,240 lines (-21% size reduction), cleanly isolating domain concerns.

### 2.5 Regression Test Compatibility Note
During Milestone 2, a static stress test was authored at `tests/rag/test_challenger_m2_frontend_stress.py`. It inspects `ADMIN_DASH_PATH.read_text(encoding="utf-8")` looking for literal string fragments of health cards and metric tables.
- **Worker Recommendation**: When Worker M3 executes the modularization, Worker M3 should also ensure that if `test_challenger_m2_frontend_stress.py` is executed, it can either inspect both `AdminDashboard.tsx` and `components/RagPipelineTab.tsx` (e.g. `(ADMIN_DASH_PATH.read_text() + RAG_TAB_PATH.read_text())`), OR Worker M3 re-exports or notes the split so the test suite passes 100%.

---

## 3. Requirement 4: Core Services Inspection

The EduConnect LMS RAG stack consists of 4 tightly coupled local services. All 4 were inspected on the local machine:

### 3.1 Service 1: Ollama Local LLM Gateway
- **Port**: `11434`
- **Host**: `127.0.0.1`
- **Executable**: `$env:LOCALAPPDATA\Programs\Ollama\ollama.exe` (or `ollama` on system PATH)
- **Startup Command**: `ollama serve` (or `Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden`)
- **Active Process**: Verified running on host (PID `17028`).
- **Required Models**:
  - Generator: `llama3.2:latest` (present)
  - Embedder: `nomic-embed-text:latest` (present)
  - Judge / Evaluator: `qwen3:4b` (present)
- **Health Probe Endpoint**: `GET http://127.0.0.1:11434/api/tags`
  - Expected: HTTP 200 with JSON payload containing array of model tags.

### 3.2 Service 2: Python Neural Cross-Encoder Reranker Microservice
- **Port**: `8100`
- **Host**: `127.0.0.1`
- **Script Path**: `backend/services/reranker_service.py`
- **Python Environment**: System Python 3.11 (`Python 3.11.15`), verified with all required packages installed:
  - `fastapi 0.136.3`
  - `uvicorn 0.49.0`
  - `torch 2.11.0`
  - `transformers 5.3.0`
  - `sentence-transformers 5.3.0`
- **Startup Command**:
  ```powershell
  python backend/services/reranker_service.py
  ```
- **Execution Details**:
  - Model: `cross-encoder/ms-marco-MiniLM-L-6-v2` (~90 MB)
  - Device: CPU-only (0 MB VRAM GPU footprint)
  - Environment flags set in script: `KMP_DUPLICATE_LIB_OK=TRUE`, `TOKENIZERS_PARALLELISM=false`
- **Health Probe Endpoint**: `GET http://127.0.0.1:8100/health`
  - Expected: HTTP 200 `{"status":"ok","model":"cross-encoder/ms-marco-MiniLM-L-6-v2","device":"cpu","loaded":true,"vram_mb":0.0}`
- **Functional Probe**: `POST http://127.0.0.1:8100/rerank` with payload `{"query":"test","passages":[{"id":1,"text":"test"}]}`

### 3.3 Service 3: FrankenPHP Application Server
- **Port**: `8000`
- **Host**: `127.0.0.1`
- **Binary Path**: `bin/frankenphp.exe` (Verified: `FrankenPHP 1.12.7, PHP 8.5.11, Caddy v2.11.4`)
- **Native Extension**: `bin/vec0.dll` (sqlite-vec extension for 768-dim vector ANN search)
- **Startup Command**:
  ```powershell
  .\bin\frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend
  ```
- **Fallback Command** (if FrankenPHP binary is missing):
  ```powershell
  php -S 127.0.0.1:8000 -t backend backend/index.php
  ```
- **Health Probe Endpoint**:
  - `GET http://127.0.0.1:8000/api/rag/metrics` with header `X-Service-Key: lms-n8n-service-key-2026` (Returns full telemetry JSON)
  - OR `OPTIONS http://127.0.0.1:8000/api/courses` (Returns HTTP 200/204)

### 3.4 Service 4: React Vite Dev Server
- **Port**: `5173`
- **Host**: `localhost` (`127.0.0.1`)
- **Working Directory**: `frontend/`
- **Toolchain**: React 19, TypeScript 5.9, Tailwind CSS 4, Vite 8
- **Startup Command**:
  ```powershell
  cd frontend
  npm run dev
  ```
- **Health Probe Endpoint**: `GET http://localhost:5173`
  - Expected: HTTP 200 (Returns HTML page containing `<div id="root">`)

### 3.5 Service Verification Matrix

| Service | Port | Binary / Script | Health Endpoint | Verification Criteria |
|---|---|---|---|---|
| **Ollama Daemon** | `11434` | `ollama.exe serve` | `GET http://127.0.0.1:11434/api/tags` | HTTP 200 + `llama3.2` & `nomic-embed-text` in model tags |
| **Cross-Encoder** | `8100` | `python backend/services/reranker_service.py` | `GET http://127.0.0.1:8100/health` | HTTP 200 + `{"status":"ok", "loaded":true}` |
| **FrankenPHP** | `8000` | `bin/frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend` | `GET http://127.0.0.1:8000/api/rag/metrics` | HTTP 200 (with service key) or socket connection |
| **Vite Frontend** | `5173` | `npm run dev` in `frontend/` | `GET http://localhost:5173` | HTTP 200 |

---

## 4. Architecture & Design Specification: `start-all.ps1`

### 4.1 Script Overview & Parameters

Create a root-level script `start-all.ps1` that serves as the single entry point for launching, probing, and managing the entire application ecosystem.

```powershell
[CmdletBinding()]
param(
    [switch]$Headless = $false,       # Run services in hidden/background mode vs titled consoles
    [switch]$NoBrowser = $false,      # Suppress automatic browser launch
    [switch]$Stop = $false,           # Stop all running EduConnect services and exit
    [int]$TimeoutSeconds = 40         # Maximum seconds to wait per service health check
)
```

### 4.2 Pre-Flight Validation Logic
1. **Repository Root Anchoring**: `$RootDir = $PSScriptRoot`. Ensure script executes relative to repository root regardless of current working directory.
2. **Execution Policy / Admin Check**: Inform user if execution policy restricts process spawning.
3. **Port Collision Scanning**:
   - Query `Get-NetTCPConnection` for ports `11434`, `8100`, `8000`, `5173`.
   - If `11434` is bound to Ollama: mark Ollama as already running; skip re-spawning.
   - If `8100`, `8000`, or `5173` are occupied: check if they are orphaned EduConnect processes; offer automatic cleanup or warning.
4. **Binary & Dependency Checks**:
   - Check `bin/frankenphp.exe` (or `php.exe`).
   - Check `python` availability and required packages (`fastapi`, `uvicorn`, `torch`).
   - Check `npm` in `frontend/` and verify `node_modules` exists (prompt `npm install` if missing).

### 4.3 Staged Startup Sequence & Process Management

To prevent race conditions, services must be launched in dependency order:
```
[Stage 1: Foundation Models]      Ollama (:11434)
            ↓
[Stage 2: Neural Inference]       Cross-Encoder (:8100)
            ↓
[Stage 3: Application Server]     FrankenPHP (:8000)
            ↓
[Stage 4: Client Presentation]    Vite Dev Server (:5173)
```

#### Process Tracking Strategy
- When launching in **Interactive Mode** (default):
  Use `Start-Process "cmd.exe"` with title tags so each service has an observable terminal window for real-time debugging:
  ```powershell
  $p1 = Start-Process "cmd.exe" -ArgumentList "/k title EduConnect Reranker (Port 8100) && cd /d `"$RootDir`" && python backend/services/reranker_service.py" -PassThru
  ```
- Store spawned Process IDs in a persistent session file (`.running_services.json`) or script hash table `$Script:SpawnedPids`.
- Enable `-Stop` parameter (`.\start-all.ps1 -Stop`) to read `.running_services.json` or query port holders and cleanly kill all child processes.

### 4.4 Health Check Retry Loops

For each service, implement an exponential/polling health probe with timeout:
```powershell
function Wait-For-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers = @{},
        [int]$MaxSeconds = 30
    )
    Write-Host -NoNewline "  Probing $Name ($Url)... " -ForegroundColor Yellow
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $MaxSeconds) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -Headers $Headers -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                $elapsed = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
                Write-Host "ONLINE (${elapsed}ms) [OK]" -ForegroundColor Green
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 800
        }
    }
    Write-Host "TIMEOUT [FAIL]" -ForegroundColor Red
    return $false
}
```

### 4.5 Consolidated Status Dashboard & Graceful Shutdown

Upon all services becoming healthy, print an ASCII/ANSI formatted summary table:
```
================================================================================
   EDUCONNECT LMS — ALL 4 RAG SERVICES OPERATIONAL
================================================================================
  Service                Port    PID      Status    URL / Endpoint
  --------------------   -----   ------   -------   ----------------------------
  Ollama LLM Engine      11434   17028    ONLINE    http://127.0.0.1:11434/api/tags
  Cross-Encoder Reranker 8100    24102    ONLINE    http://127.0.0.1:8100/health
  FrankenPHP Gateway     8000    19840    ONLINE    http://127.0.0.1:8000/api/rag/metrics
  React Vite Web UI      5173    8312     ONLINE    http://localhost:5173
================================================================================
  Web UI: http://localhost:5173
  Admin Telemetry: http://localhost:5173/admin/rag-pipeline

  Press [Ctrl+C] or 'Q' to terminate all services gracefully.
```
Then launch browser (`Start-Process "http://localhost:5173"`) and listen for keypress or process termination to kill child PIDs cleanly.

---

## 5. Specification for `VIVA_PRESENTATION_GUIDE.md`

### 5.1 Presentation Philosophy & Academic Positioning
The Viva Presentation Guide must equip students/presenters to deliver a compelling, high-scoring final year project defense or conference demo. It bridges the academic research contributions (AAAI 2024 RGB & NeurIPS 2024 RAGChecker benchmarks) with hands-on software engineering on edge consumer hardware (NVIDIA RTX 3050 Laptop GPU, 4 GB VRAM).

### 5.2 3-Slide Architecture Blueprint Outline

#### Slide 1: Hardware-Constrained Educational RAG Architecture
- **Title**: *EduConnect LMS: Production-Grade Educational RAG on Consumer Hardware*
- **Problem Statement**:
  - Educational tutors require high precision, multi-hop reasoning, and strict zero-hallucination guarantees.
  - Naive RAG architectures fail due to noise sensitivity, context dilution, premise bias, and prohibitive GPU memory requirements.
  - Hard constraint: Running fully locally on an NVIDIA RTX 3050 Laptop GPU (4 GB VRAM limit), Intel i5-12450H, 16 GB RAM.
- **Architectural Solution & Memory Budget**:
  - `llama3.2:latest` (Ollama 4-bit quantized, ~2.0 GB VRAM)
  - `nomic-embed-text` (768-dim embeddings, ~274 MB VRAM)
  - Python Cross-Encoder reranker (`ms-marco-MiniLM-L-6-v2`, ~90 MB CPU-only, **0 MB VRAM**)
  - `sqlite-vec` HNSW vector index (**0 MB VRAM**, CPU-only in-process C extension)
  - Remaining VRAM headroom: ~1.7 GB for KV-cache and OS desktop buffer.

#### Slide 2: Five Core Algorithmic Innovations
- **Title**: *Closing the Benchmark Gap: 5-Stage Resilient RAG Pipeline*
- **Visual Diagram**: Complete ASCII/Mermaid flow from User Query → LLM Query Condensation → sqlite-vec ANN + BM25 Fusion → Cross-Encoder Reranker → CRAG Confidence Gate → Hierarchical Parent Assembly → Ollama Token Streaming.
- **The 5 Features**:
  1. **Neural Cross-Encoder Reranker (`/rerank`)**: Replaced 13 fragile regex heuristics with full cross-attention scoring. Sits between RRF fusion and MMR selection.
  2. **`sqlite-vec` Approximate Nearest Neighbor (ANN)**: Replaced O(N) array iteration with 768-dim vector virtual table indexing. Search time dropped from ~120ms to ≤ 15ms across 1,323 chunks.
  3. **Multi-Turn Conversational Memory & Query Condensation**: Per-student session store with rolling 3-turn history. Generates self-contained search queries (`↳ Interpreted as:`).
  4. **Parent-Child Hierarchical Chunking**: Ingests textbooks into ~200-token child chunks for vector precision, bound to ~900-token parent chunks for generator richness with page-exact citations (`p. 42`).
  5. **Corrective RAG (CRAG) Confidence-Gated Fallback**: Intercepts low-confidence queries (< 0.35 threshold) with graceful abstention cards, dropping hallucination rate to < 4%.

#### Slide 3: Empirical Validation & Real-Time Telemetry
- **Title**: *Academic Benchmark Validation & Microsecond Observability*
- **Standardized Evaluation Metrics**:
  - AAAI 2024 RGB Benchmark: **97.2% Composite Score** (Noise Robustness: 98.4%, Negative Rejection: 96.0%, Information Integration: 94.0%, Counterfactual Robustness: 91.5%).
  - NeurIPS 2024 RAGChecker: Claim Precision 88.2% (vs 78.3% baseline), Hallucination Rate 3.8% (vs 11.8% baseline).
- **Production Telemetry**:
  - Microsecond-resolution JSONL pipeline audit logging.
  - Sub-500ms P50 latency via semantic query caching.
  - Real-time Admin Telemetry Portal showing live subsystem health, stage breakdown bars, and dynamic latency histograms.

---

### 5.3 2-Minute Live Demo Script (Second-by-Second)

| Timestamp | Phase | Presenter Action | What Appears on Screen | Verbal Script / Talking Points |
|---|---|---|---|---|
| **0:00 – 0:25** | **Launch & Telemetry** | Run `./start-all.ps1`. Switch to browser at `/admin/rag-pipeline`. | Terminal boots all 4 services with green `[OK]` badges. Admin Dashboard loads live health cards, latency breakdown, and 8-metric benchmark scorecard. | *"Good morning professors. With a single command, EduConnect launches our entire local RAG ecosystem across 4 microservices. Here on the Admin Dashboard, you can see live microsecond telemetry: our sqlite-vec retrieval takes under 15ms, while our academic scorecard validates a 97.2% composite score on AAAI 2024 standards."* |
| **0:25 – 0:50** | **Conversational Memory** | Open AI Tutor modal. Type: *"What is React useState?"*. Once answered, type: *"How does its setter trigger re-renders?"*. | First answer explains `useState`. Second question shows subtitle: `↳ Interpreted as: How does the React useState setter trigger component re-renders?` and answers contextually. | *"Notice our conversational memory in action. The second question contains an ambiguous pronoun—'its setter'. The LLM query condenser automatically reformulates it into a self-contained search query, preserving student context across turns."* |
| **0:50 – 1:15** | **Hierarchical Chunking & Citations** | Click on a source citation badge below the generated answer. | Source preview expands, displaying textbook title and exact page citation (e.g., `p. 142`), displaying the comprehensive parent chunk context. | *"Notice the citation: it cites the exact textbook page. Behind the scenes, we use Parent-Child Hierarchical Chunking. We indexed 200-token child chunks for surgical vector search, but expanded them to 1,000-token parent passages for the LLM to synthesize complete, nuanced answers."* |
| **1:15 – 1:40** | **Neural Cross-Encoder & SSE Streaming** | Ask a multi-concept query: *"Compare CSS Flexbox and CSS Grid layout algorithms"*. | Tokens stream in real-time with a blinking cursor. Responses cite both layout models. | *"Here we see our Server-Sent Events token streaming yielding immediate feedback. Under the hood, candidate chunks were reranked using a neural cross-encoder running purely on CPU with zero GPU VRAM overhead, improving factual claim precision to 88.2%."* |
| **1:40 – 2:00** | **CRAG Safety Abstention** | Ask an out-of-curriculum question: *"What is quantum entanglement in particle physics?"*. | Modal does not generate hallucinations. Instead, renders a distinct amber warning card with graceful abstention. | *"Finally, our Corrective RAG safety gate. When the cross-encoder confidence drops below our 0.35 safety threshold on out-of-domain topics, the system gracefully abstains rather than hallucinating plausible false facts. This reduced hallucination from 11.8% to under 4%."* |

---

### 5.4 Examiner Defense Cheat Sheet (Anticipated Viva Questions)

1. **Q: Why run a separate Python Cross-Encoder instead of letting the LLM do all the ranking?**
   - *Answer*: LLM prompting for ranking is computationally expensive, non-deterministic, and consumes thousands of generation tokens. A specialized 22M-parameter cross-encoder (`ms-marco-MiniLM-L-6-v2`) performs full cross-attention between query and passage in ~15ms on CPU with 0 MB GPU VRAM, allowing the 4 GB GPU to focus entirely on autoregressive token generation.
2. **Q: How does `sqlite-vec` differ from traditional vector databases like Pinecone, Milvus, or Chroma?**
   - *Answer*: `sqlite-vec` runs in-process as a lightweight C extension within our local SQLite database. It requires zero cloud network hops, zero docker containers, zero background daemon overhead, and achieves sub-15ms vector retrieval directly inside PHP's PDO layer.
3. **Q: How does Parent-Child Chunking solve the 'Lost in the Middle' problem?**
   - *Answer*: Standard chunking forces a tradeoff: small chunks lose surrounding context, while large chunks dilute vector similarity scores. Hierarchical chunking decouples search from synthesis: 200-token child chunks maximize embedding sharpness, and their parent 900-token passages provide the LLM with full explanatory context and accurate page numbers.
4. **Q: What is the mathematical basis for the CRAG confidence gate?**
   - *Answer*: The cross-encoder outputs raw classification logits transformed via Sigmoid into normalized probabilities $\sigma(z) \in [0, 1]$. We set an empirical safety threshold $\tau = 0.35$ based on the validation distribution of out-of-domain negative test cases. If $\max_i(s_i) < \tau$, the query is routed to the abstention gate before calling the generator.
5. **Q: How does the system fit within the 4 GB VRAM limit of the RTX 3050 Laptop GPU?**
   - *Answer*: By strictly segregating model architectures across compute backends: `llama3.2` consumes ~2.0 GB VRAM and `nomic-embed` consumes ~274 MB on GPU via Ollama; `sqlite-vec` runs entirely in CPU RAM; and the neural reranker runs on CPU via PyTorch. Total GPU VRAM usage remains stably under 2.5 GB, leaving 1.5 GB safety buffer.

---

## 6. Implementation Guidance for Milestone 4 Workers

### For Worker M3 (Admin Dashboard Modularization):
1. Create `frontend/src/pages/admin/components/RagPipelineTab.tsx`.
2. Move state (`ragMetrics`, `ragLoading`, `ragError`, `lastRefreshed`), fetcher (`fetchRagMetrics`), and lines 2176–2744 JSX into `RagPipelineTab.tsx`.
3. In `frontend/src/pages/admin/AdminDashboard.tsx`:
   - Import `RagPipelineTab from './components/RagPipelineTab'`.
   - Remove unused state, fetcher, and the 11 RAG-exclusive Lucide icon imports.
   - Replace lines 2176–2744 with `{activeTab === 'rag-pipeline' && <RagPipelineTab />}`.
4. Run `npm run build` in `frontend/` to confirm 0 TypeScript errors.

### For Worker M4 (Startup Script & Viva Guide):
1. Author root `start-all.ps1`:
   - Pre-flight port checks (11434, 8100, 8000, 5173).
   - Staged launch of Ollama, Cross-Encoder (`backend/services/reranker_service.py`), FrankenPHP (`bin/frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend`), and Vite (`npm run dev` in `frontend/`).
   - Health check retry loops with colored feedback.
   - Summary status table and browser auto-open.
   - Support `-Stop` parameter and graceful exit.
2. Author root `VIVA_PRESENTATION_GUIDE.md`:
   - Include 3-slide architecture outline with Mermaid diagrams.
   - Include 2-minute live demo script with exact prompts and talking points.
   - Include examiner defense cheat sheet with technical answers.
3. Verify `start-all.ps1` runs without syntax errors.
