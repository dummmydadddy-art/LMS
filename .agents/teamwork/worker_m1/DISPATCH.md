# Task Assignment: Worker M1 (AI Tutor Chat Modal Upgrades)

- Your Identity: `worker_m1` (role: teamwork_preview_worker)
- Your Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1`
- Authoritative User Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 86-160)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md`
- Frontend Plugins Guidance: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md`
- Survey Explorer Report: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Owned Files (Exclusively Yours)
- `frontend/src/components/AiTutorModal.tsx`
- `frontend/src/pages/student/StudentDashboard.tsx`
- `frontend/src/services/api.ts`
- `backend/rag_service.php`
- `backend/index.php`

## Implementation Checklist
1. **AiTutorModalProps & Types (`frontend/src/components/AiTutorModal.tsx`)**:
   - Add `studentId?: string;` to `AiTutorModalProps`.
   - Update `ChatMessage`: add `interpretedQuery?: string; isAbstained?: boolean; backend?: string;`.
   - Update `SourceCitation`: add `page?: string | number; page_citation?: string; page_number?: number;`.
2. **API Request (`frontend/src/components/AiTutorModal.tsx` & `api.ts`)**:
   - Send `student_id: studentId` in POST body to `/api/rag/ask`.
   - Send header `X-Service-Key: lms-n8n-service-key-2026`.
   - In `api.ts`, intercept `/api/rag/` requests to automatically attach `X-Service-Key` header if present.
3. **Response Handling (`frontend/src/components/AiTutorModal.tsx`)**:
   - When `res.data?.query_condensation?.rewritten === true && res.data?.query_condensation?.condensed_query`, attach `interpretedQuery` to the user's message.
   - Detect abstention / CRAG fallback: `res.data?.abstain || res.data?.abstained || res.data?.backend === 'crag_fallback_gate' || res.data?.backend === 'safety_boundary_gate'`.
   - Mark assistant message with `isAbstained: true`.
4. **Rendering Upgrades**:
   - **Query Rewrite Indicator**: Render "↳ Interpreted as: \"{m.interpretedQuery}\"" below the user message.
   - **CRAG Fallback Abstention**: Render with visually distinct amber/warning card (`bg-amber-50 border border-amber-300 text-amber-900`) with alert icon.
   - **Page Citations**: Show page numbers in source citation pills: `(Sec {s.chunk_index + 1} • {pageDisplay}) • {s.similarity}%`.
   - **New Conversation Button**: Add button in modal header with refresh icon (`RotateCcw`). When clicked, clear local messages and call `POST /api/rag/clear` with `student_id`.
5. **Modern Web Standards (`modern-web-guidance-plugin`)**:
   - Smooth transitions (fade, scale, backdrop blur).
   - Dialog ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-label="AI Course Tutor"`.
   - Focus rings on input and buttons (`focus-visible:ring-2`).
   - Clean scrollbar and auto-scroll with smooth behavior.
   - `text-wrap: balance` / `text-wrap: pretty` where applicable.
6. **Prop Wiring in `StudentDashboard.tsx`**:
   - Replace `window.dispatchEvent(new CustomEvent('open-ai-tutor'))` with local state `const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);`.
   - Wire `studentId` prop directly from line 52 to `<AiTutorModal isOpen={isAiTutorOpen} onClose={() => setIsAiTutorOpen(false)} studentId={studentId} courseId={activeCourse?.id} batchId={activeCourse?.batch_id} courseName={activeCourse?.course_name || 'Full Stack Web Development'} />`.
   - (Also in `frontend/src/components/Layout.tsx`, pass `studentId` if available for the floating modal).
7. **Backend Support**:
   - In `backend/rag_service.php` (around lines 1890 and 2425): extract page citation from chunk metadata and include `'page' => $pageCitation` in each source item.
   - In `backend/index.php`: add `case ($route === '/api/rag/clear' && $method === 'POST'):` to call `StudentSessionStore::clearSession($studentId)`.
8. **Verification Required**:
   - Run `npm run build` in `frontend/` — MUST pass with 0 errors.
   - Run `php tests/rag/system_audit.php` — MUST pass 100% OK.
   - Document commands, outputs, and results in your `handoff.md`.


## 2026-10-03T12:16:14Z
[Message] timestamp=2026-10-03T12:16:14Z sender=7fb1ad71-95ca-4da5-bf49-7c641200c2d0 priority=MESSAGE_PRIORITY_HIGH content=You are worker_m1.
Your working directory is: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1
Read your task assignment at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1\DISPATCH.md
Read the authoritative user request at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md (lines 86-160).
Read the project specifications at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md
Read the frontend plugins guidance at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\FRONTEND_PLUGINS_GUIDANCE.md
Read the survey explorer report at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement all Milestone 1 requirements across your owned files:
- frontend/src/components/AiTutorModal.tsx
- frontend/src/pages/student/StudentDashboard.tsx
- frontend/src/services/api.ts
- backend/rag_service.php
- backend/index.php

Run `npm run build` in frontend/ and `php tests/rag/system_audit.php` to verify your changes.
Write your detailed report to d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m1\handoff.md.
When finished, notify the orchestrator via send_message.
