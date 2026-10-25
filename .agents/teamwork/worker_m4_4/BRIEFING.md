# BRIEFING — 2026-10-04T08:16:30Z

## Mission
Implement Requirement 4: One-Command Startup Automation (`start-all.ps1`) and Presentation Guide (`VIVA_PRESENTATION_GUIDE.md`) for EduConnect-LMS-Experimental.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\worker_m4_4
- Original parent: 7d098cfd-b54b-47ac-998d-3089d4134ae1
- Milestone: milestone_4

## 🔒 Key Constraints
- Exclusively owned files: `start-all.ps1`, `VIVA_PRESENTATION_GUIDE.md`
- Do not modify files outside scope
- Mandatory Integrity: No cheating, no hardcoded fake results, real orchestration and comprehensive guide
- PowerShell script must support `-Stop`, health checks, colored indicators, browser auto-launch, port collision handling
- System tests must pass cleanly (`npm run build`, `php tests/rag/system_audit.php`)

## Current Parent
- Conversation ID: 7d098cfd-b54b-47ac-998d-3089d4134ae1
- Updated: not yet

## Task Summary
- **What to build**:
  1. `start-all.ps1` at project root orchestrating Ollama (:11434), Python Cross-Encoder (:8100), FrankenPHP (:8000), and Vite dev server (:5173).
  2. `VIVA_PRESENTATION_GUIDE.md` at project root featuring 3-slide viva architecture outline, 2-minute live demo script, and examiner defense Q&A.
- **Success criteria**:
  - `start-all.ps1` parses with 0 errors via PowerShell AST/parser, correctly handles startup and `-Stop`.
  - `VIVA_PRESENTATION_GUIDE.md` is complete, rigorous, and covers hardware budget, 5 RAG features, 8-metric benchmark scorecard, live demo script, and defense answers.
  - Regression tests pass (`npm run build`, `php tests/rag/system_audit.php`).
- **Interface contracts**: `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\orchestrator_4\PROJECT.md`
- **Code layout**: Root-level files: `start-all.ps1`, `VIVA_PRESENTATION_GUIDE.md`.

## Key Decisions Made
- Design `start-all.ps1` with clean parameter handling (`-Stop`, `-NoBrowser`, `-Headless`, `-TimeoutSeconds`), PID tracking via persistent file `.running_services.json`, netstat/Get-NetTCPConnection checks, and ANSI colored status output.
- Comprehensive `VIVA_PRESENTATION_GUIDE.md` structured with Markdown tables, Mermaid diagrams, explicit prompt-by-prompt demo steps, and defense explanations grounded in real project metrics and code.

## Artifact Index
- `start-all.ps1` — One-command startup and shutdown automation script
- `VIVA_PRESENTATION_GUIDE.md` — Complete Viva presentation outline, live demo script, and Q&A defense
- `progress.md` — Liveness and progress tracker
- `changes.md` — Record of changes made
- `handoff.md` — 5-component handoff report

## Change Tracker
- **Files modified**: none yet
- **Build status**: untracked
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending verification
- **Lint status**: clean
- **Tests added/modified**: validation script checks

## Loaded Skills
- None required (standard PowerShell and Markdown implementation).
