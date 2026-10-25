# Dispatch: Worker M2 (Repository Hygiene & Archival)

- Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_4`
- Original Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- Project Scope: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4\PROJECT.md`
- Survey Findings: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2\analysis.md` & `handoff.md`
- Exclusively Owned Areas:
  - `archive/experiments/scratch/`
  - `archive/experiments/backend_snapshots/`
  - `scratch/`
  - `backend/*.exp00*` (and snapshot patterns)
  - `.gitignore`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Requirement 2: Repository Hygiene & Archival.

### Detailed Specifications
1. **Target Directories Creation**:
   - Ensure `archive/experiments/scratch/` and `archive/experiments/backend_snapshots/` are created.
2. **Gitignore Protection**:
   - In `.gitignore`, ensure `archive/experiments/scratch/exp0070_models/` and `*.safetensors` are ignored so the 1.66 GB model weights do not bloat the git repository.
3. **Move Backend Snapshots**:
   - Identify all 35 legacy snapshot files matching `*.exp00*`, `*champion*`, `*candidate*`, `*baseline*`, `*challenger*` in `backend/`.
   - Use `git mv` for tracked files (`backend/exp0032_retrieval.php`).
   - Move all untracked snapshot files into `archive/experiments/backend_snapshots/`.
   - Verify that all 35 active production files in `backend/` (`rag_service.php`, `index.php`, `rag_query_condenser.php`, `config.php`, `db.php`, `gateway.js`, etc.) remain in place and untouched.
4. **Move Scratch Test Scripts & Artifacts**:
   - For all tracked files in `scratch/` (56 files), use `git mv` to move them to `archive/experiments/scratch/`.
   - Move all untracked files and subdirectories (`exp0070_models`, `pageindex_store`, etc.) from `scratch/` to `archive/experiments/scratch/`.
   - Clean up transient root files if present (`test_probe_out.txt`, `test_py.txt`).
5. **Verification**:
   - Run `php tests/rag/system_audit.php` to verify subsystems pass with 100% OK.
   - Run `git status` to verify clean state without untracked scratch files in `backend/` or `scratch/`.
   - Document commands, moves, and verification results in `changes.md` and deliver `handoff.md`. Then send completion message to parent.

## 2026-10-04T07:33:31Z
You are worker_m2_4. Your working directory is `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_4`.

Read the authoritative user request at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`) and your dispatch instructions at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m2_4\DISPATCH.md`.
Review the detailed survey report at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2\analysis.md` and `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned Areas:
- `archive/experiments/scratch/`
- `archive/experiments/backend_snapshots/`
- `scratch/`
- `backend/*.exp00*`
- `.gitignore`

Objective:
Implement Requirement 2: Repository Hygiene & Archival:
1. Create `archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`.
2. Update `.gitignore` with `archive/experiments/scratch/exp0070_models/` and `*.safetensors`.
3. Move all 35 snapshot files from `backend/` into `archive/experiments/backend_snapshots/` (use `git mv` for `backend/exp0032_retrieval.php`, filesystem move for untracked). Keep all 35 production files in `backend/` intact.
4. Move all files from `scratch/` into `archive/experiments/scratch/` (use `git mv` for the 56 tracked files, filesystem move for untracked). Remove transient root files (`test_probe_out.txt`, `test_py.txt`) if present.
5. Run verification:
   - `php tests/rag/system_audit.php` (must pass 100% OK)
   - `git status` (verify clean and properly tracked/ignored)
6. Write a summary of your changes to `changes.md` and deliver a formal 5-component `handoff.md` in your working directory. Then send a completion message to parent.

