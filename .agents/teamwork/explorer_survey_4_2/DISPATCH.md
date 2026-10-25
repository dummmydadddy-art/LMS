# Dispatch: Explorer Survey 4.2 (R2 Repo Hygiene & Archival)

- Working Directory: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2`
- Original Request: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (see `## 2026-10-04T06:55:18Z`)
- Parent: orchestrator_4

## Objective
Investigate Requirement 2: Repository Hygiene & Archival.
1. Survey `scratch/` directory: list all test scripts (`scratch/test_*.php/py/js`) and any other scratch artifacts.
2. Survey `backend/` for legacy champion/candidate snapshot files matching `*.exp00XX*` or similar.
3. Check target archive directories: `archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`.
4. Inspect `tests/rag/` to verify that production test suites (`system_audit.php`, benchmark suites, etc.) do not reference or depend on files in `scratch/`.
5. Check `git status` for untracked scratch files and propose safe migration commands (e.g. git mv or directory creation).
6. Write your comprehensive report to `analysis.md` and `handoff.md` in your working directory.


## 2026-10-04T07:00:11Z
You are explorer_survey_4_2. Your working directory is `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2`.
Read the authoritative user request at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically `## 2026-10-04T06:55:18Z`) and your dispatch instructions at `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2\DISPATCH.md`.

Your objective is to investigate Requirement 2: Repository Hygiene & Archival:
1. Survey `scratch/` directory: list all test scripts (`scratch/test_*.php/py/js`) and any other scratch artifacts.
2. Survey `backend/` for legacy champion/candidate snapshot files matching `*.exp00XX*` or similar.
3. Check target archive directories: `archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`.
4. Inspect `tests/rag/` to verify that production test suites (`system_audit.php`, benchmark suites, etc.) do not reference or depend on files in `scratch/`.
5. Check `git status` for untracked scratch files and propose safe migration commands (e.g. git mv or directory creation).
6. Produce your findings in `analysis.md` and deliver `handoff.md` in your working directory. Then send a completion message with your report path to parent.
