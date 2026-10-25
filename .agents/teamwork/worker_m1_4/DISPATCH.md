# Dispatch: Worker M1 (AiTutorModal SSE Streaming)

- Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1_4`
- Original Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4\PROJECT.md`
- Survey Findings: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_1\analysis.md` & `handoff.md`
- Exclusively Owned Files: `frontend/src/components/AiTutorModal.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Requirement 1: Real-Time Token Streaming in AI Tutor Modal (`frontend/src/components/AiTutorModal.tsx`).

### Detailed Specifications
1. **Streaming Endpoint Consumption**:
   - In `AiTutorModal.tsx`, replace the buffered Axios POST with a browser-native streaming fetch using `ReadableStream` (`getReader()`).
   - Endpoint: `POST /api/rag/ask` with JSON body:
     ```json
     {
       "question": q,
       "stream": true,
       "student_id": targetStudentId || undefined,
       "course_id": courseId,
       "batch_id": batchId
     }
     ```
   - Headers:
     - `Content-Type: application/json`
     - `Accept: text/event-stream`
     - `X-Service-Key: lms-n8n-service-key-2026`
2. **SSE Parsing & Live Typing Cursor**:
   - Read UTF-8 stream chunks, split by SSE event boundaries (`\n\n` or `\r\n\r\n`).
   - Parse `event: token` with payload `data: {"token": "..."}` and append tokens progressively to the active assistant message in real-time.
   - Display a live blinking cursor (e.g. `<span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-indigo-600 dark:bg-indigo-400 animate-pulse" />` or similar) while streaming is active.
3. **Metadata & Citation Hydration**:
   - Parse `event: done` with payload `data: {...}`.
   - On completion, hydrate all metadata:
     - Full answer text
     - `sources` array with citation badges and page numbers (`p. X` or `pp. X-Y`)
     - Query condensation subtitle (`query_condensation.rewritten === true` -> `↳ Interpreted as: {condensed_query}`)
     - CRAG fallback handling (`backend === 'crag_fallback_gate'` or `abstained === true` / `abstain === true`) rendered with distinct amber warning card styling.
4. **Resilient Buffered Fallback**:
   - If the streaming fetch fails (e.g., network error, proxy disconnect, non-200 status, or stream abort before receiving tokens), automatically catch the error and execute the buffered request (`api.post('/api/rag/ask')` with service key) so the user never receives an unexplained broken experience.
5. **Build & Test Verification**:
   - Run `npm run build` in `frontend/` and ensure 0 TypeScript or build errors.
   - Report verification commands and results in `handoff.md`.

## 2026-10-04T07:13:18Z
You are worker_m1_4. Your working directory is `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1_4`.

Read the authoritative user request at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`) and your dispatch instructions at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1_4\DISPATCH.md`.
Also review the technical survey report and blueprint at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_1\analysis.md` and `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned File:
`frontend/src/components/AiTutorModal.tsx`

Objective:
Implement Requirement 1: Real-Time Token Streaming in AI Tutor Modal:
1. Consume the SSE streaming endpoint `POST /api/rag/ask` with `"stream": true` and `Accept: text/event-stream`.
2. Parse `event: token` to stream tokens progressively in real-time, displaying a blinking cursor (`animate-pulse`).
3. Parse `event: done` to hydrate all metadata: full answer, citations with page numbers (`p. X`), query condensation subtitle `↳ Interpreted as:`, and CRAG amber warning cards.
4. Provide automatic fallback to buffered Axios POST mode if the streaming connection fails or disconnects before tokens arrive.
5. Run `npm run build` in `frontend/` to verify zero errors.
6. Write a summary of your changes to `changes.md` and deliver a formal 5-component `handoff.md` in your working directory. Then send a completion message with your report path to parent.
