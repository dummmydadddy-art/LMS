# Task Assignment: Explorer Survey 1 (AI Tutor Modal & StudentDashboard)

- Your Identity: `explorer_survey_1` (role: teamwork_preview_explorer)
- Your Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1`
- Authoritative User Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (read lines 86 to 160 carefully)

## Objective
Thoroughly explore the existing implementation for R1:
1. Examine `frontend/src/components/AiTutorModal.tsx` completely (props, state, API call, message rendering, citations, query rewrite, reset).
2. Examine `frontend/src/pages/student/StudentDashboard.tsx` around line 52 (`studentId`), line 737 (modal trigger / CustomEvent / prop wiring), and how `AiTutorModal` is mounted and rendered.
3. Check `frontend/src/services/api.ts` to see how axios / API requests are configured, baseURL, headers, and if any RAG helper functions exist.
4. Check `backend/rag_service.php` and `backend/index.php` to verify exact request payload expected by `POST /api/rag/ask`, how `student_id` is parsed, how `X-Service-Key` is validated, and exact response payload fields (especially citations format with page numbers, `crag_fallback_gate` / `abstained`, and `query_condensation.rewritten` / `condensed_query`).
5. Write your complete analysis and recommendations to `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1\handoff.md`.
6. Use `send_message` to notify the orchestrator when finished.


## 2026-10-03T12:04:04Z
You are explorer_survey_1.
Your working directory is: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1
Read your task assignment at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1\DISPATCH.md
Read the authoritative user request at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md (lines 86-160).

Thoroughly explore R1 requirements:
- frontend/src/components/AiTutorModal.tsx
- frontend/src/pages/student/StudentDashboard.tsx (around lines 52 and 737)
- frontend/src/services/api.ts
- backend/rag_service.php and backend/index.php for /api/rag/ask endpoint specs (headers, student_id, citations with page numbers, crag_fallback_gate/abstained styling, query_condensation.rewritten indicator, new conversation).

Write your comprehensive findings and recommendations to d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1\handoff.md.
When finished, send a message to the orchestrator notifying completion.
