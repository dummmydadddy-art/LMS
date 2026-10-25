# Task Assignment: Worker M2 Remediation (Address Reviewer Feedback)

- Your Identity: `worker_m2_remediation` (role: teamwork_preview_worker)
- Your Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_remediation`
- Authoritative User Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 86-160)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_2\PROJECT.md`
- Reviewer Feedback: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\reviewer_m2_2\handoff.md` and `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\reviewer_m2_1\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Remediation Objectives
Apply the targeted fixes identified by `reviewer_m2_2` and `reviewer_m2_1`:

1. **Remove Hardcoded Catch-Block Fallbacks in `backend/rag_pipeline_metrics.php` (around lines 153-163)**:
   In `catch (\Exception $e)` for `getKnowledgeBaseStats()`, return zeros and error details rather than hardcoded 1323/333/5:
   ```php
   return [
       'total_chunks' => 0,
       'parent_chunks' => 0,
       'textbooks_count' => 0,
       'materials_count' => 0,
       'embedding_dim' => 768,
       'index_type' => 'sqlite-vec (unavailable: ' . $e->getMessage() . ')',
       'error' => $e->getMessage()
   ];
   ```

2. **Fix Dynamic Benchmark Verdict & Remove Hardcoded Fallbacks in `frontend/src/pages/admin/AdminDashboard.tsx`**:
   - In benchmark scorecard table (around lines 2619-2624):
     Render PASS or FAIL dynamically based on `m.passed`:
     ```tsx
     {m.passed ? (
       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
         <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> PASS
       </span>
     ) : (
       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
         <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAIL
       </span>
     )}
     ```
   - In KPI cards and latency distributions:
     Replace fallback numbers (`?? 376`, `?? 1323`, `?? 333`, `?? 5`, `|| 4436`, static histogram arrays) with clean `?? 0` or `?? '—'` and handle empty arrays gracefully.

3. **Enforce Role Authorization on Fallback JWT Path in `backend/index.php` (around line 1264)**:
   Explicitly verify that authenticated users have the `ADMIN` or `SUPER_ADMIN` role:
   ```php
   if (!$user) {
       $user = verifyToken();
       if (!$user || !in_array($user['role'] ?? '', ['ADMIN', 'SUPER_ADMIN'])) {
           http_response_code(403);
           echo json_encode(['success' => false, 'error' => 'Forbidden: Admin access required']);
           break;
       }
   }
   ```

4. **Verify**:
   - Run `cd frontend && npm run build` (MUST pass with 0 errors).
   - Run `php tests/rag/system_audit.php` (MUST pass 100% OK).
   - Run `php tests/rag/test_metrics.php`.
   - Write your report to `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_remediation\handoff.md`.


## 2026-10-03T13:09:44Z
You are worker_m2_remediation.
Your working directory is: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_remediation
Read your task assignment at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_remediation\DISPATCH.md
Read the authoritative user request at d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md (lines 86-160).
Read reviewer feedback at:
- d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\reviewer_m2_2\handoff.md
- d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\reviewer_m2_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Apply the 3 targeted remediations:
1. Remove hardcoded 1323/333/5 catch-block defaults in backend/rag_pipeline_metrics.php (return 0 and error message).
2. Fix dynamic PASS/FAIL badge and remove hardcoded fallback numbers in frontend/src/pages/admin/AdminDashboard.tsx.
3. Enforce ADMIN/SUPER_ADMIN role check on JWT fallback in backend/index.php.

Run `npm run build` in frontend/ and `php tests/rag/system_audit.php` to verify your changes.
Write your detailed report to d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_remediation\handoff.md.
When finished, notify the orchestrator via send_message.
