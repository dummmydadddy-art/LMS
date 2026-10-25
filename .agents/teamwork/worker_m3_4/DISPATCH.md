# Dispatch: Worker M3 (Admin Dashboard Modularization)

- Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m3_4`
- Original Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4\PROJECT.md`
- Survey Findings: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3\analysis.md` & `handoff.md`
- Exclusively Owned Files:
  - `frontend/src/pages/admin/AdminDashboard.tsx`
  - `frontend/src/pages/admin/components/RagPipelineTab.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Requirement 3: Admin Dashboard Modularization.

### Detailed Specifications
1. **Create `frontend/src/pages/admin/components/RagPipelineTab.tsx`**:
   - Extract the entire RAG pipeline telemetry and benchmark visualization tab from `AdminDashboard.tsx` (lines 2176–2744).
   - Encapsulate all associated RAG state (`ragMetrics`, `ragLoading`, `ragError`, `lastRefreshed`), the `fetchRagMetrics()` logic calling `api.get('/api/rag/metrics', { headers: { 'X-Service-Key': 'lms-n8n-service-key-2026' } })`, and an initial `useEffect` to load metrics upon mounting.
   - Include all necessary Lucide icon imports inside `RagPipelineTab.tsx`.
   - Preserve all visualizations:
     - Subsystem health cards (FrankenPHP, Reranker, Ollama)
     - 4 KPI stat cards
     - Latency breakdown bars (6 stages)
     - Query latency distribution histogram
     - 8-metric benchmark scorecard table with badges
     - Recent query telemetry feed table
   - Export cleanly: `export default RagPipelineTab;` (or named export).
2. **Refactor `AdminDashboard.tsx`**:
   - Import `RagPipelineTab` from `./components/RagPipelineTab`.
   - Remove the migrated RAG state hooks, fetcher, and unused Lucide icon imports.
   - Replace the 569 lines of RAG JSX with `{activeTab === 'rag-pipeline' && <RagPipelineTab />}`.
   - Verify that all other tabs (`summary`, `courses`, `students`, `teachers`, `fees`, `settings`) in `AdminDashboard.tsx` continue to function without any changes or regressions.
3. **Build & Test Verification**:
   - Run `cd frontend && npm run build` (must complete with 0 errors).
   - Run `npx eslint src/pages/admin/AdminDashboard.tsx src/pages/admin/components/RagPipelineTab.tsx` (clean).
   - Verify `tests/rag/test_challenger_m2_frontend_stress.py` if present to ensure any legacy path checks pass.
4. **Handoff**:
   - Document changes in `changes.md` and deliver `handoff.md`. Then send completion message to parent.


## 2026-10-04T07:50:39Z
You are worker_m3_4. Your working directory is `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m3_4`.

Read the authoritative user request at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`) and your dispatch instructions at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m3_4\DISPATCH.md`.
Review the technical survey report at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_3\analysis.md` and `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned Files:
- `frontend/src/pages/admin/AdminDashboard.tsx`
- `frontend/src/pages/admin/components/RagPipelineTab.tsx`

Objective:
Implement Requirement 3: Admin Dashboard Modularization:
1. Extract the RAG pipeline telemetry and benchmark tab (lines 2176–2744 of `AdminDashboard.tsx`) into `frontend/src/pages/admin/components/RagPipelineTab.tsx`.
2. Encapsulate all associated RAG state (`ragMetrics`, `ragLoading`, `ragError`, `lastRefreshed`), fetch logic (`/api/rag/metrics` with `X-Service-Key`), Lucide icons, and rendering (health cards, 4 KPIs, latency breakdown bars, histogram, 8-metric benchmark scorecard, and telemetry feed).
3. In `AdminDashboard.tsx`, import `RagPipelineTab`, clean up migrated state/fetcher/icons, and render `{activeTab === 'rag-pipeline' && <RagPipelineTab />}`.
4. Verify `npm run build` in `frontend/` succeeds with 0 errors.
5. Verify `tests/rag/test_challenger_m2_frontend_stress.py` passes if applicable.
6. Write your summary to `changes.md` and deliver `handoff.md` in your working directory. Then send a completion message to parent.
