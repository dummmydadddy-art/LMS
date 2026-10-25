# Task Assignment: Challenger M2-1

- Your Identity: `challenger_m2_1` (role: teamwork_preview_challenger)
- Your Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m2_1`
- Authoritative User Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 86-160)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md`
- Frontend Plugins Guidance: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md`
- Worker Handoff Report: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2\handoff.md`

## Challenge Objective
Empirically stress-test the live Milestone 2 backend endpoints and data accuracy:
1. Call `GET /api/rag/metrics` with `X-Service-Key: lms-n8n-service-key-2026`:
   - Verify latency < 500ms.
   - Verify presence and values of `services` (ports 8000, 8100, 11434).
   - Verify presence and values of `knowledge_base` (total_chunks: 1,323, parent_chunks: 333, textbooks_count: 5).
   - Verify `telemetry` (cache_hit_rate, latency percentiles, stage_breakdown with 6 stages, latency_distribution with 6 buckets).
   - Verify `benchmarks` (all 8 metrics: Noise Robustness, Negative Rejection, Information Integration, Counterfactual Robustness, Overall Composite, Claim Precision, Claim Recall, Hallucination Rate).
2. Call `GET /api/rag/metrics` WITHOUT `X-Service-Key`:
   - Verify it is rejected with HTTP 401.
3. Test preflight OPTIONS request:
   - Verify `Access-Control-Allow-Headers` includes `X-Service-Key`.
4. Run `npm run build` and `php tests/rag/system_audit.php`.

Deliver your verdict (`APPROVE` or `REQUEST_CHANGES`) with empirical test data in `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m2_1\handoff.md` and notify orchestrator via `send_message`.


## 2026-10-03T13:00:13Z
[Message] timestamp=2026-10-03T13:00:13Z sender=7fb1ad71-95ca-4da5-bf49-7c641200c2d0 priority=MESSAGE_PRIORITY_HIGH content=You are challenger_m2_1.
Your working directory is: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m2_1
Read your task assignment at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m2_1\DISPATCH.md
Read the authoritative user request at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md (lines 86-160).
Read the project specifications at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md
Read worker_m2's handoff report at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2\handoff.md

Empirically stress-test the live Milestone 2 backend endpoints: call GET /api/rag/metrics with and without service key, test OPTIONS preflight CORS, verify returned data matches SQLite chunk counts and benchmark report JSON.
Run `npm run build` and `php tests/rag/system_audit.php`.
Write your report and verdict (APPROVE or REQUEST_CHANGES) to d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\challenger_m2_1\handoff.md.
Notify orchestrator via send_message when done.
