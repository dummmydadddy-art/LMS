# Dispatch: Project Orchestrator (orchestrator_4)

- **Your Identity**: `orchestrator_4` (role: Project Orchestrator)
- **Your Working Directory**: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4`
- **Project Root**: `d:\Collage project\EduConnect-LMS-Experimental`
- **Authoritative User Request**: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- **Parent Sentinel Conversation ID**: `133b61b0-89dd-4d45-add7-34e8cb040bab`

## Mission & Requirements

You are the top-level Project Orchestrator for EduConnect-LMS-Experimental. You must plan, coordinate, and execute the following 4 requirements according to the user specifications:

### R1. Real-Time Token Streaming in AI Tutor Modal
Upgrade `frontend/src/components/AiTutorModal.tsx` to consume the existing Server-Sent Events streaming endpoint (`POST /api/rag/ask` with `"stream": true`).
- Instead of buffering the entire answer, stream incoming tokens in real-time as they are yielded from Ollama, displaying a live typing cursor.
- Ensure all metadata (`sources`, page numbers, query condensation rewrite subtitle `↳ Interpreted as:`, and CRAG amber warning cards) are preserved and displayed when the stream completes.
- Provide automatic fallback to buffered mode if the stream connection fails.

### R2. Repository Hygiene & Archival
Move obsolete experimental test scripts (`scratch/test_*.php/py/js`) and legacy champion/candidate snapshot files in `backend/*.exp00XX*` into an organized archive folder (`archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`).
- Keep production test suites in `tests/rag/` intact.
- Ensure `git status` is clean, professional, and free of untracked scratch files.

### R3. Admin Dashboard Modularization
Refactor `frontend/src/pages/admin/AdminDashboard.tsx` by extracting the RAG telemetry and benchmark visualization tab into a clean, standalone component: `frontend/src/pages/admin/components/RagPipelineTab.tsx`.
- Ensure all state, telemetry fetches, and benchmark scorecards work seamlessly within the modular component.

### R4. One-Command Startup Automation & Showcase Guide
Create a unified PowerShell launch script (`start-all.ps1`) that checks and launches all required services:
- Ollama daemon with required models
- Python Cross-Encoder on port 8100
- FrankenPHP on port 8000
- Vite dev server on port 5173
- Include health check verification.
Create `VIVA_PRESENTATION_GUIDE.md` containing a 3-slide viva architecture outline and a 2-minute live demo script.

## Acceptance Criteria
- [ ] Submitting a question in `AiTutorModal.tsx` streams tokens progressively to the UI with a blinking cursor
- [ ] Citation badges, page numbers (`p. X`), and query condensation subtitles render correctly on stream completion
- [ ] CRAG fallback abstentions continue to render as distinct amber warning cards
- [ ] `npm run build` in `frontend/` compiles with 0 errors
- [ ] Root `backend/` and `scratch/` are cleaned of transient experiment test files; files are preserved in `archive/experiments/`
- [ ] `php tests/rag/system_audit.php` passes with 100% OK
- [ ] Regression benchmark suite runs without missing file errors
- [ ] `RagPipelineTab.tsx` is extracted into its own component and imported cleanly into `AdminDashboard.tsx`
- [ ] The "RAG Pipeline" tab continues to display live telemetry, health probes, latency breakdown bars, and benchmark scorecard
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] `start-all.ps1` successfully verifies/starts all 4 services and confirms port availability
- [ ] `VIVA_PRESENTATION_GUIDE.md` provides clear talking points for the 5 RAG features and a step-by-step demo script

## Protocols & Coordination
1. Create and maintain `plan.md`, `progress.md`, and `BRIEFING.md` in your working directory (`d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4`).
2. Update `progress.md` frequently with timestamps so Sentinel liveness checks succeed.
3. Coordinate specialists (workers, reviewers, challengers) as needed to perform development and verification.
4. When all requirements and acceptance criteria are satisfied, report completion to the Sentinel via `send_message` to `133b61b0-89dd-4d45-add7-34e8cb040bab` so independent Victory Audit can be executed.


## 2026-10-04T06:57:48Z

You are orchestrator_4, the Project Orchestrator for EduConnect-LMS-Experimental.
Your working directory is: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4`
Your parent Sentinel conversation ID is: `133b61b0-89dd-4d45-add7-34e8cb040bab`

Read your dispatch instructions at:
`d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4\DISPATCH.md`
and the authoritative user request at:
`d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`).

You have 4 primary requirements:
1. R1: Real-Time Token Streaming in AI Tutor Modal (`frontend/src/components/AiTutorModal.tsx`)
2. R2: Repository Hygiene & Archival (`archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`)
3. R3: Admin Dashboard Modularization (`frontend/src/pages/admin/components/RagPipelineTab.tsx` extracted from `AdminDashboard.tsx`)
4. R4: One-Command Startup Automation (`start-all.ps1`) and Presentation Guide (`VIVA_PRESENTATION_GUIDE.md`)

Coordinate worker and reviewer agents, maintain your plan.md, progress.md, and BRIEFING.md, ensure all verification checks pass (`npm run build`, `php tests/rag/system_audit.php`), and send a completion message to the Sentinel when done so Victory Audit can begin.
