# Dispatch: Explorer Survey 4.3 (R3 Admin Modularization & R4 Startup Script)

- Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3`
- Original Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- Parent: orchestrator_4

## Objective
Investigate Requirement 3 (Admin Dashboard Modularization) and Requirement 4 (One-Command Startup & Showcase Guide).
1. Inspect `frontend/src/pages/admin/AdminDashboard.tsx`: locate all code related to the RAG Pipeline tab (telemetry, health probes, latency breakdown, benchmark scorecard). Determine lines, state variables, imports, and interface for extracting `frontend/src/pages/admin/components/RagPipelineTab.tsx`.
2. Inspect the startup commands and paths for the 4 core services:
   - Ollama daemon on port 11434 (`llama3.2`, `nomic-embed-text`)
   - Python Cross-Encoder on port 8100 (find exact script and virtualenv/python command)
   - FrankenPHP on port 8000 (`bin/frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend`)
   - Vite dev server on port 5173 (`npm run dev` in `frontend/`)
3. Outline requirements for `start-all.ps1` (process management, health check loops, graceful shutdown/verification).
4. Outline structure for `VIVA_PRESENTATION_GUIDE.md` (3-slide architecture outline, 2-minute live demo script highlighting the 5 RAG features).
5. Write your comprehensive report to `analysis.md` and `handoff.md` in your working directory.

## 2026-10-04T07:00:11Z
You are explorer_survey_4_3. Your working directory is `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3`.
Read the authoritative user request at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically `## 2026-10-04T06:55:18Z`) and your dispatch instructions at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3\DISPATCH.md`.

Your objective is to investigate Requirement 3 (Admin Dashboard Modularization) and Requirement 4 (One-Command Startup & Showcase Guide):
1. Inspect `frontend/src/pages/admin/AdminDashboard.tsx`: locate all code related to the RAG Pipeline tab (telemetry, health probes, latency breakdown, benchmark scorecard). Determine lines, state variables, imports, and interface for extracting `frontend/src/pages/admin/components/RagPipelineTab.tsx`.
2. Inspect the startup commands and paths for the 4 core services:
   - Ollama daemon on port 11434 (`llama3.2`, `nomic-embed-text`)
   - Python Cross-Encoder on port 8100 (find exact script and virtualenv/python command)
   - FrankenPHP on port 8000 (`bin/frankenphp.exe php-server --listen 127.0.0.1:8000 --root backend`)
   - Vite dev server on port 5173 (`npm run dev` in `frontend/`)
3. Outline requirements for `start-all.ps1` (process management, health check loops, graceful shutdown/verification).
4. Outline structure for `VIVA_PRESENTATION_GUIDE.md` (3-slide architecture outline, 2-minute live demo script highlighting the 5 RAG features).
5. Produce your findings in `analysis.md` and deliver `handoff.md` in your working directory. Then send a completion message with your report path to parent.
