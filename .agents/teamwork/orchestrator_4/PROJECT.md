# Project: EduConnect-LMS-Experimental — Finalization & Showcase

## Architecture
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 + TypeScript (`frontend/`)
  - AI Tutor Modal (`frontend/src/components/AiTutorModal.tsx`): Real-time SSE token streaming, live cursor, citation cards with page citations (`p. X`), CRAG fallback warning cards, query condensation indicator.
  - Admin Dashboard (`frontend/src/pages/admin/AdminDashboard.tsx`): Modularized with RAG telemetry extracted to `frontend/src/pages/admin/components/RagPipelineTab.tsx`.
- **Backend**: FrankenPHP (:8000) running PHP 8.3 RAG engine (`backend/`)
  - SSE Streaming endpoint at `POST /api/rag/ask` with `stream: true` / `Accept: text/event-stream`.
  - Telemetry endpoint at `GET /api/rag/metrics` with `X-Service-Key`.
- **Microservices & AI**:
  - Ollama (:11434): `llama3.2:latest`, `nomic-embed-text:latest`, `qwen3:4b`.
  - Python Cross-Encoder (:8100): FastAPI serving `cross-encoder/ms-marco-MiniLM-L-6-v2`.
- **Storage & Archival**:
  - Production database: `backend/storage/vectors.sqlite` with `sqlite-vec`.
  - Archive directory: `archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`.
- **Automation & Presentation**:
  - One-command launcher: `start-all.ps1`
  - Showcase guide: `VIVA_PRESENTATION_GUIDE.md`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SSE Token Streaming | Consume SSE endpoint with `fetch()` + `ReadableStream` | M1 (DONE) | Survey 4.1 |
| 2 | Live Typing Cursor | Blinking pulse cursor during streaming | M1 (DONE) | Survey 4.1 |
| 3 | Metadata Hydration | Preserve citations, page `p. X`, condensation `↳ Interpreted as:`, CRAG amber cards | M1 (DONE) | Survey 4.1 |
| 4 | Stream Buffered Fallback | Seamless fallback to buffered Axios POST on SSE connection failure | M1 (DONE) | Survey 4.1 |
| 5 | Scratch & Snapshot Archival | Move 130 test scripts & 35 snapshots to `archive/experiments/` | M2 (DONE) | Survey 4.2 |
| 6 | Git Repository Hygiene | Preserve .gitignore rules for large PyTorch safetensors (1.66GB) | M2 (DONE) | Survey 4.2 |
| 7 | Admin Dashboard Modularization | Extract `RagPipelineTab.tsx` from `AdminDashboard.tsx` | M3 (DONE) | Survey 4.3 |
| 8 | One-Command Startup Automation | `start-all.ps1` launching Ollama, Reranker, FrankenPHP, Vite with health probes | M4 | Survey 4.3 |
| 9 | Viva Presentation Guide | `VIVA_PRESENTATION_GUIDE.md` with 3-slide viva deck & 2-minute live demo script | M4 | Survey 4.3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | AI Tutor SSE Streaming | `frontend/src/components/AiTutorModal.tsx` | none | DONE |
| M2 | Repository Hygiene & Archival | `scratch/`, `backend/*.exp00*`, `archive/experiments/`, `.gitignore` | none | DONE |
| M3 | Admin Dashboard Modularization | `frontend/src/pages/admin/AdminDashboard.tsx`, `RagPipelineTab.tsx` | none | DONE |
| M4 | Startup Automation & Showcase Guide | `start-all.ps1`, `VIVA_PRESENTATION_GUIDE.md` | none | PLANNED |
| M5 | Final E2E System Verification | System-wide verification (`npm run build`, `system_audit.php`) | M1, M2, M3, M4 | PLANNED |

## Code Layout & File Boundaries
- **M1 Worker Ownership**:
  - `frontend/src/components/AiTutorModal.tsx` (exclusive) - COMPLETED & GATE PASS
- **M2 Worker Ownership**:
  - `scratch/` (files moved) - COMPLETED & GATE PASS
  - `backend/*.exp00*` (files moved) - COMPLETED & GATE PASS
  - `archive/experiments/scratch/` - COMPLETED & GATE PASS
  - `archive/experiments/backend_snapshots/` - COMPLETED & GATE PASS
  - `.gitignore` - COMPLETED & GATE PASS
- **M3 Worker Ownership**:
  - `frontend/src/pages/admin/AdminDashboard.tsx` - COMPLETED & GATE PASS
  - `frontend/src/pages/admin/components/RagPipelineTab.tsx` (new) - COMPLETED & GATE PASS
- **M4 Worker Ownership**:
  - `start-all.ps1` (new)
  - `VIVA_PRESENTATION_GUIDE.md` (new)

## Interface Contracts
### AI Tutor Modal (M1) ↔ Backend RAG Service
- **Endpoint**: `POST http://localhost:8000/api/rag/ask`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: text/event-stream`
  - `X-Service-Key: lms-n8n-service-key-2026`
- **Payload**: `{ "question": string, "stream": true, "student_id": string, "course_id": string, "batch_id": string }`
- **SSE Events**:
  - `event: token` -> `data: {"token": string}`
  - `event: done` -> `data: {"answer": string, "sources": Array<Source>, "query_condensation"?: Condensation, "abstain"?: boolean, "backend"?: string}`

### Admin Dashboard (M3) ↔ RagPipelineTab Component
- **Component**: `<RagPipelineTab />`
- **Props**: None (encapsulates internal state, telemetry fetching via `/api/rag/metrics`, and refresh handlers)
- **Exports**: `export default RagPipelineTab` or named `export const RagPipelineTab`
- **Integration in AdminDashboard.tsx**:
  ```tsx
  import RagPipelineTab from './components/RagPipelineTab';
  // ...
  {activeTab === 'rag-pipeline' && <RagPipelineTab />}
  ```
