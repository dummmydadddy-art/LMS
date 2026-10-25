## 2026-10-03T12:02:29Z
You are the Project Orchestrator (orchestrator_2) for EduConnect-LMS-Experimental.

Your working directory is: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2
Project root: d:\Collage project\EduConnect-LMS-Experimental
Authoritative user request: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md (see the latest request under ## 2026-10-03T12:00:28Z)
Sentinel conversation ID: 6569de9b-b1b1-40e1-8ba6-9f7e53b57597

Task:
Implement the requested presentation layer upgrades for EduConnect-LMS-Experimental:
1. R1: Upgrade AI Tutor Chat Modal (frontend/src/components/AiTutorModal.tsx and frontend/src/pages/student/StudentDashboard.tsx) to pass student_id, X-Service-Key header, page numbers in source citations, styled CRAG fallback abstentions, query rewrite indicators, New Conversation button, and clean prop wiring.
2. R2: RAG Pipeline Metrics Dashboard (new PHP backend endpoint GET /api/rag/metrics in backend/index.php, and new RAG Pipeline tab in frontend/src/pages/admin/AdminDashboard.tsx) visualizing pipeline health, latency distributions, per-stage breakdowns, cache hit rate, knowledge base statistics, and the 8 RGB/RAGChecker benchmark metrics from tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json.
3. R3: Rewrite README.md to showcase the full system with Mermaid architecture diagram, 8-metric benchmark scorecard table, full tech stack, quick-start instructions, and the 5 RAG features.

Ensure:
- frontend passes `npm run build` with zero TypeScript or build errors
- `php tests/rag/system_audit.php` continues to pass 100%
- Maintain your plan.md, progress.md, and BRIEFING.md in your working directory.
- When all requirements and acceptance criteria are completed and verified, report completion to the Sentinel.


## 2026-10-03T12:08:51Z
User Directive: Apply installed Antigravity frontend plugins and skills to the presentation layer tasks.

Refer to `FRONTEND_PLUGINS_GUIDANCE.md` in your working directory.
- For M1 (`AiTutorModal.tsx`): Apply `modern-web-guidance-plugin` (Google Chrome: smooth transitions, ARIA dialog accessibility, modern focus states, text wrapping).
- For M2 (`RagMetricsDashboard.tsx`): Apply `building-data-apps` (modern KPI metric cards, stage latency breakdown bars, benchmark scorecard layout).
- For Milestone Reviews: Apply the 6-pillar UI review checklist (`gsd-ui-review`: visual hierarchy, intentional design, typography & spacing, responsive layout, motion & interaction, accessibility).

Incorporate these requirements directly into the Worker dispatch prompts and Reviewer/Challenger checklists.


## 2026-10-03T12:09:26Z
User Directive: Apply installed Antigravity frontend plugins and skills to the active presentation layer tasks.

Refer to the guidance file created at:
`d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md`

Key standards to incorporate:
1. `modern-web-guidance-plugin` (smooth transitions, view states, accessible inputs, ARIA standards) for AiTutorModal.tsx.
2. `building-data-apps` (KPI stat cards, latency stage breakdown visualization, benchmark scorecard) for RagMetricsDashboard.tsx.
3. `gsd-ui-review` (6-pillar visual and accessibility audit) for Reviewer and Challenger evaluation rubrics.

Please ensure you inject these standards into the M1 & M2 worker dispatch prompts and reviewer evaluation criteria.
