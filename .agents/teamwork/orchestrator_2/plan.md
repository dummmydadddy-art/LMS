# Execution Plan — Presentation Layer Upgrades (orchestrator_2)

## Goal
Implement and verify presentation layer upgrades for EduConnect-LMS-Experimental across three major areas:
1. R1: Upgrade AI Tutor Chat Modal (`frontend/src/components/AiTutorModal.tsx` and `frontend/src/pages/student/StudentDashboard.tsx`)
2. R2: RAG Pipeline Metrics Dashboard (PHP endpoint `GET /api/rag/metrics` in `backend/index.php` and RAG Pipeline tab in `frontend/src/pages/admin/AdminDashboard.tsx`)
3. R3: Project README Rewrite with Mermaid architecture diagram, 8-metric benchmark scorecard, full tech stack, quick-start instructions, and 5 RAG features

## Phases

### Phase 0: Survey & Scope Mapping
- Dispatch 3 parallel Explorers:
  - `explorer_survey_1`: AI Tutor Modal, StudentDashboard, and RAG API request/response structure
  - `explorer_survey_2`: Backend metrics endpoint, JSONL pipeline logs, benchmark reports, and AdminDashboard
  - `explorer_survey_3`: README, system architecture, tech stack, benchmark scorecard, and build/audit baseline
- Synthesize findings into `PROJECT.md` Feature Inventory & Interface Contracts.

### Phase 1 (Milestone 1): AI Tutor Chat Modal Upgrades
- Explorer recommendations review
- Worker dispatch: Update `AiTutorModal.tsx` and `StudentDashboard.tsx`
  - Send `student_id` in request body
  - Add `X-Service-Key: lms-n8n-service-key-2026` header
  - Render page numbers in citations
  - Styled CRAG fallback warning cards
  - Query rewrite "↳ Interpreted as:" indicator
  - "New Conversation" button
  - Wire `studentId` prop directly from `StudentDashboard.tsx`
- 2 Reviewers + 2 Challengers + Forensic Auditor + Gate Check

### Phase 2 (Milestone 2): RAG Pipeline Metrics Dashboard
- Worker dispatch:
  - Backend: Add `GET /api/rag/metrics` in `backend/index.php` reading JSONL logs and benchmark report JSON with service key protection
  - Frontend: Add RAG Pipeline tab in `AdminDashboard.tsx` visualizing pipeline health, latency, stages, cache hits, KB stats, and 8 benchmark metrics
- 2 Reviewers + 2 Challengers + Forensic Auditor + Gate Check

### Phase 3 (Milestone 3): README Showcase & Documentation
- Worker dispatch:
  - Rewrite `README.md` with Mermaid diagram, 8-metric scorecard, tech stack, quick-start, and 5 RAG features
- 2 Reviewers + 2 Challengers + Forensic Auditor + Gate Check

### Phase 4: Final E2E Verification & Reporting
- Verify `npm run build` succeeds with zero errors
- Verify `php tests/rag/system_audit.php` passes 100%
- Sentinel handoff report
