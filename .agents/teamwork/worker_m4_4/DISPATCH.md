# Dispatch: Worker M4 (Startup Automation & Viva Guide)

- Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m4_4`
- Original Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4\PROJECT.md`
- Survey Findings: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3\analysis.md` & `handoff.md`
- Exclusively Owned Files:
  - `start-all.ps1`
  - `VIVA_PRESENTATION_GUIDE.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Requirement 4: One-Command Startup Automation (`start-all.ps1`) and Presentation Guide (`VIVA_PRESENTATION_GUIDE.md`).

### Detailed Specifications
1. **Create `start-all.ps1` in project root**:
   - PowerShell script orchestrating all 4 services:
     1. Ollama Daemon (port 11434): Check if running; if not, attempt `Start-Process ollama -ArgumentList "serve"`. Verify required models (`llama3.2`, `nomic-embed-text`) via `http://127.0.0.1:11434/api/tags`.
     2. Python Cross-Encoder (port 8100): Start `python backend/services/reranker_service.py` in background job or process. Poll `http://127.0.0.1:8100/health` until HTTP 200 (allow up to 40s for model weights to initialize).
     3. FrankenPHP (port 8000): Start `.\bin\frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend`. Poll `http://127.0.0.1:8000/api/rag/metrics` with `X-Service-Key: lms-n8n-service-key-2026` until HTTP 200.
     4. Vite Dev Server (port 5173): Start `npm run dev` in `frontend/`. Poll `http://localhost:5173`.
   - Feature a `-Stop` switch (`.\start-all.ps1 -Stop`) to gracefully shut down background services matching ports 8100, 8000, 5173.
   - Colorized console status indicators (`[OK]`, `[WAIT]`, `[ERROR]`).
   - Automatically open default browser to `http://localhost:5173` upon complete system readiness.
   - Clean port binding and error handling.
2. **Create `VIVA_PRESENTATION_GUIDE.md` in project root**:
   - **Slide 1**: Hardware Constraints & Resource Optimization (RTX 3050 4GB VRAM budget, CPU Cross-Encoder, memory footprints).
   - **Slide 2**: 5 RAG Pipeline Architectural Breakthroughs (Cross-Encoder reranker, sqlite-vec ANN, Multi-turn conversational memory with Llama 3.2 rewriting, Parent-Child hierarchical chunking, CRAG fallback at 0.35 threshold).
   - **Slide 3**: Academic Benchmark Validation (AAAI 2024 RGB & NeurIPS 2024 RAGChecker 8-metric scorecard: 97.25% Composite, 92.59% Precision, 94.66% Recall, 7.41% Hallucination, 100% Negative Rejection, 96% Noise Robustness, 93% Info Integration).
   - **2-Minute Live Demo Script**: Chronological walkthrough with exact prompts to enter, expected visual signals (typing cursor, page numbers, condensation subtitle, amber card), and admin telemetry tab demo.
   - **Examiner Defense Q&A**: Bulletproof answers to common tough questions (e.g., latency trade-offs, chunking strategy, GPU memory management, hallucination mitigation).
3. **Verification**:
   - Verify `start-all.ps1` syntax: `Get-Command powershell`, test script parsing via `[System.Management.Automation.Language.Parser]::ParseInput(...)` with 0 errors.
   - Verify services health check endpoints and script parameters.
   - Verify `VIVA_PRESENTATION_GUIDE.md` formatting and content completeness.
   - Ensure `npm run build` in `frontend/` and `php tests/rag/system_audit.php` pass without any regression.
4. **Handoff**:
   - Document changes in `changes.md` and deliver `handoff.md`. Then send completion message to parent.


## 2026-10-04T08:16:30Z
You are worker_m4_4. Your working directory is `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m4_4`.

Read the authoritative user request at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`) and your dispatch instructions at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m4_4\DISPATCH.md`.
Review the technical survey report at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3\analysis.md` and `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned Files:
- `start-all.ps1`
- `VIVA_PRESENTATION_GUIDE.md`

Objective:
Implement Requirement 4: One-Command Startup Automation (`start-all.ps1`) and Presentation Guide (`VIVA_PRESENTATION_GUIDE.md`):
1. Create `start-all.ps1` in project root orchestrating Ollama (:11434), Python Cross-Encoder (:8100), FrankenPHP (:8000), and Vite dev server (:5173). Support `-Stop` parameter for graceful shutdown, polling health checks with colorized indicators, and automatic browser launch upon system readiness.
2. Create `VIVA_PRESENTATION_GUIDE.md` in project root with a 3-slide viva architecture outline (Hardware budget, 5 RAG features, 8-metric benchmark scorecard), a 2-minute live demo script (step-by-step query walkthrough), and an examiner defense Q&A section.
3. Verify syntax and execution parameters of `start-all.ps1` and completeness of `VIVA_PRESENTATION_GUIDE.md`. Verify that `npm run build` and `php tests/rag/system_audit.php` pass cleanly.
4. Document your changes in `changes.md` and deliver `handoff.md` in your working directory. Then send a completion message to parent.
