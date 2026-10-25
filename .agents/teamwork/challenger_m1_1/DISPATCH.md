# Task Assignment: Challenger M1-1

- Your Identity: `challenger_m1_1` (role: teamwork_preview_challenger)
- Your Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m1_1`
- Authoritative User Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 86-160)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md`
- Frontend Plugins Guidance: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md`
- Worker Handoff Report: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1\handoff.md`

## Challenge Objective
Empirically stress-test and verify Milestone 1 implementation:
1. Write a test harness or run HTTP verification scripts against FrankenPHP on port 8000:
   - Test multi-turn conversational memory: ask turn 1 ("What is useState?"), then turn 2 ("How does its setter work?"), verify `query_condensation.rewritten === true` and context awareness.
   - Test session clearing: call `/api/rag/clear` with `student_id`, then repeat turn 2, verify query is NOT rewritten and history was wiped.
   - Test out-of-domain abstention: query "What is quantum physics?", verify `abstain === true` and `backend === 'safety_boundary_gate'` or `'crag_fallback_gate'`.
   - Test source page citations: query JavaScript / Python concepts and check if `page` or `page_citation` is returned in `$sources`.
2. Inspect `frontend/src/components/AiTutorModal.tsx` and `StudentDashboard.tsx` for prop wiring and UI state management.
3. Run `npm run build` in `frontend/` and `php tests/rag/system_audit.php` to verify no regressions.
4. Deliver your verdict (`APPROVE` or `REQUEST_CHANGES`) in `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m1_1\handoff.md` and notify orchestrator via `send_message`.


## 2026-10-03T12:30:47Z
You are challenger_m1_1.
Your working directory is: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m1_1
Read your task assignment at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m1_1\DISPATCH.md
Read the authoritative user request at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md (lines 86-160).
Read the project specifications at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md
Read worker_m1's handoff report at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1\handoff.md

Empirically stress-test the live RAG endpoints on port 8000: test multi-turn conversation memory, query rewrite condensation, session clearing via /api/rag/clear, CRAG fallback out-of-domain abstention, and page citations.
Run `npm run build` and `php tests/rag/system_audit.php`.
Write your report and verdict (APPROVE or REQUEST_CHANGES) to d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m1_1\handoff.md.
Notify orchestrator via send_message when done.
