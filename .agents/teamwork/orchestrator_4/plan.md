# Plan: EduConnect-LMS-Experimental Finalization

## Objectives
Execute the 4 primary requirements defined in DISPATCH.md and ORIGINAL_REQUEST.md:
1. R1: Real-Time SSE Token Streaming in `frontend/src/components/AiTutorModal.tsx`
2. R2: Repository Hygiene & Archival (`archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`)
3. R3: Admin Dashboard Modularization (`frontend/src/pages/admin/components/RagPipelineTab.tsx` extracted from `AdminDashboard.tsx`)
4. R4: One-Command Startup Automation (`start-all.ps1`) and Presentation Guide (`VIVA_PRESENTATION_GUIDE.md`)

## Phases
1. **Phase 0: Survey**
   - Spawn 3 parallel Explorers:
     - Explorer 1: Inspect `frontend/src/components/AiTutorModal.tsx`, `backend/rag_service.php`, SSE endpoint streaming response format, headers, event types, error handling, state management.
     - Explorer 2: Inspect `scratch/` directory and `backend/*.exp00XX*` snapshot files, test suites in `tests/rag/`, git status to plan exact file moves without affecting test runners.
     - Explorer 3: Inspect `frontend/src/pages/admin/AdminDashboard.tsx`, identify all RAG Pipeline tab JSX, state hooks, telemetry fetch logic, and define clean component interface for `RagPipelineTab.tsx`. Also check required service launch paths for `start-all.ps1`.
2. **Phase 1: Synthesis & PROJECT.md**
   - Aggregate findings from all 3 explorers into `PROJECT.md`.
   - Define exact interface contracts, file ownership boundaries, and verification criteria.
3. **Phase 2: Milestone Execution (Iteration Loops)**
   - **M1: R1 SSE Token Streaming**: Worker implementation -> 2 Reviewers + 2 Challengers + Forensic Auditor -> Gate.
   - **M2: R2 Repo Hygiene & Archival**: Worker moves & git hygiene -> Reviewer + Challenger + Forensic Auditor -> Gate.
   - **M3: R3 Admin Dashboard Modularization**: Worker refactor -> 2 Reviewers + 2 Challengers + Forensic Auditor -> Gate.
   - **M4: R4 Startup Script & Presentation Guide**: Worker implementation -> Reviewer + Challenger + Forensic Auditor -> Gate.
4. **Phase 3: Final System-Wide Verification**
   - Run `npm run build` in `frontend/` (0 errors).
   - Run `php tests/rag/system_audit.php` (100% OK).
   - Verify all acceptance criteria.
5. **Phase 4: Handoff to Sentinel**
   - Send completion message to Sentinel (`133b61b0-89dd-4d45-add7-34e8cb040bab`) for Victory Audit.
