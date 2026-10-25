# Analysis: Requirement 2 — Repository Hygiene & Archival

**Date:** 2026-10-04  
**Author:** Explorer Survey Agent (`explorer_survey_4_2`)  
**Scope:** Comprehensive Survey of `scratch/`, `backend/` snapshots, archive target paths, `tests/rag/` dependencies, and `git status` for Requirement 2.

---

## 1. Executive Summary

Requirement 2 mandates moving obsolete experimental test scripts (`scratch/test_*.php/py/js`) and legacy champion/candidate snapshot files in `backend/*.exp00XX*` into an organized archive folder (`archive/experiments/scratch/` and `archive/experiments/backend_snapshots/`) while keeping production test suites in `tests/rag/` intact and achieving a clean, professional `git status`.

Our exhaustive read-only investigation reveals:
1. **`scratch/` Directory**: Contains **766 files** totaling **~2.72 GB** across the root and 5 subdirectories. Among them are **130 executable test scripts** matching `scratch/test_*.php/py/js` (57 PHP, 60 Python, 13 JS). Only **56 files** in `scratch/` are currently tracked in Git; the remaining **710 files are untracked**. Crucially, `scratch/exp0070_models/` holds **1.66 GB of binary safetensor model weights** which must NOT be committed into Git history.
2. **`backend/` Snapshots**: Contains exactly **35 legacy champion/candidate/baseline snapshot files** totaling **902,467 bytes (~881 KB)**. Only **1 file** (`backend/exp0032_retrieval.php`) is tracked in Git; the other **34 files are untracked**. Exactly **35 active production files** remain in `backend/` and are verified completely decoupled from these snapshots.
3. **Archive Targets**: Neither `archive/experiments/scratch/` nor `archive/experiments/backend_snapshots/` exists. The entire `archive/` top-level directory does not exist yet and must be created.
4. **Test Independence in `tests/rag/`**: The production test suite (`tests/rag/system_audit.php` and `tests/rag/benchmarks/rgb_ragchecker_suite.py`) and all auxiliary unit/adversarial suites in `tests/rag/` have **zero dependencies** on `scratch/` or any backend snapshot. Archiving these files will not break any production test.
5. **Git Nuance & Migration Strategy**: Using `git mv` indiscriminately will fail on untracked files with `fatal: not under version control`. The migration command must explicitly separate git-tracked items (`git mv`) from untracked items (filesystem moves). Furthermore, `.gitignore` must be updated to prevent committing 1.66 GB of model weights.

---

## 2. Exhaustive Survey of `scratch/`

### 2.1 Inventory & Extension Distribution
A complete filesystem traversal of `scratch/` identified **766 files** and **5 subdirectories**:

| Extension | File Count | Purpose / Category |
|---|---|---|
| `.json` | 313 | Benchmark traces, ablation results, metadata sidecars |
| `.py` | 193 | Evaluation scripts, data generators, verifiers |
| `.php` | 138 | Harnesses, retrieval ablations, verifiers |
| `.js` | 58 | Concurrency runners, evaluator benchmarks |
| `.txt` | 26 | Prompt variants, debug logs |
| `.jsonl` | 13 | Feasibility traces, detailed test records |
| `.pdf` | 6 | Curriculum test documents |
| `.safetensors` | 5 | PyTorch model fold weights (1.66 GB total) |
| `.pyc` | 5 | Compiled Python bytecode |
| `.md` | 2 | Scratch documentation / notes |
| `.tsx` | 1 | Legacy transient UI modal copy (`AiTutorModal.tsx`) |
| `.qwen3_4b` / `.8b` | 2 | Ollama Modelfile drafts |
| `.sql` / `.png` / other | 4 | Database / chart artifacts |
| **Total** | **766** | **2,721,507,761 bytes (~2.72 GB)** |

### 2.2 Survey of `scratch/test_*.php/py/js` Scripts
The prompt specifically targets `scratch/test_*.php/py/js`:
- **`test_*.php`**: **57 files** (e.g., `test_smart_fusion.php`, `test_conversational_rag.php`, `test_rules_matching.php`, `test_targeted_secondary.php`, `test_word_boundary.php`, `test_raw_nli.php`)
- **`test_*.py`**: **60 files** (e.g., `test_bge_m3_init.py`, `test_chonkie_both.py`, `test_colsmol_model.py`, `test_judge.py`, `test_stateful_gating.py`, `test_rules_semantic.py`)
- **`test_*.js`**: **13 files** (e.g., `test_concurrency_32.js`, `test_embedding_coordinator.js`, `test_streaming_ttft.js`, `test_supabase.js`, `test_claim_evaluator_unit.js`)
- **Total `test_*.php/py/js` test scripts**: **130 executable scripts**

In addition, there are **59 other `test_*` artifacts**:
- `test_*.json`: 54 files (mostly `.metadata.json` sidecars like `test_smart_fusion.php.metadata.json`)
- `test_*.pdf`: 1 file (`test_20p.pdf`)
- `test_*.png`: 1 file (`test_page_1.png`)
- `test_*.txt`: 1 file (`test_b64.txt`)
- `test_*.pyc`: 2 files
- **Total all `test_*` files**: **189 files**

### 2.3 Subdirectories in `scratch/`
The 5 subdirectories in `scratch/` are:

| Subdirectory | File Count | Size | Contents |
|---|---|---|---|
| `scratch/exp0070_models/` | 20 files | **1,660,279,195 bytes (1.66 GB)** | 5 MiniLM cross-encoder folds (`c1_ft_minilm_fold_1` to `fold_5`), each containing `model.safetensors` (328 MB), `tokenizer.json` (3.5 MB), `config.json` |
| `scratch/pageindex_store/` | 7 files | 42,320 bytes | PageIndex hierarchical tree caches (`tree.json`, `pages.json`, `doc.json`) |
| `scratch/data_benchmarks/` | 3 files | 106,583 bytes | Sample curriculum PDFs (`curriculum_20p.pdf`, `curriculum_50p.pdf`, `curriculum_full.pdf`) |
| `scratch/__pycache__/` | 5 files | 54,967 bytes | Python bytecode cache files |
| `scratch/exp0023/` | 0 files | 0 bytes | Empty directory |

### 2.4 Git Tracking Status of `scratch/`
- **Tracked in Git**: Exactly **56 files** (all at root level of `scratch/`). These are benchmark results and runners added in earlier experiment cycles (EXP-0031, EXP-0033, EXP-0039, EXP-0059 to EXP-0064).
  - *List of 56 tracked files*:
    `blind_retrieval_cache_300.json`, `blind_retrieval_cache_400.json`, `compute_exp0039_chunk_statistics.py`, `compute_exp0059_metrics.py`, `compute_exp0060_metrics.py`, `compute_exp0061_blind_metrics.py`, `compute_exp0061_metrics.py`, `compute_exp0062_metrics.py`, `compute_exp0064_blind_metrics.py`, `compute_exp0064_metrics.py`, `evaluate_exp0059_a4.php`, `evaluate_exp0060_a4.php`, `evaluate_exp0061_a4.php`, `evaluate_exp0061_blind_a4.php`, `evaluate_exp0062_a4.php`, `evaluate_exp0064_a4.php`, `evaluate_exp0064_blind_a4.php`, `exp0031_blind_retrieval_cache.json`, `exp0031_challenge_retrieval_cache.json`, `exp0031_nli_cache.json`, `exp0033_nli_cache.json`, `exp0033_predictions.json`, `exp0033_retrieval_cache.json`, `exp0037_nli_cache.json`, `exp0039_content_preservation_report.json`, `exp0039_dev_predictions.json`, `exp0039_retrieval_metrics.json`, `exp0062_feasibility_metrics.json`, `exp0062_feasibility_predictions.json`, `exp0062_feasibility_traces.jsonl`, `exp0064_blind_gate_metrics.json`, `exp0064_blind_gate_predictions.json`, `exp0064_blind_gate_traces.jsonl`, `exp0064_blind_traces.jsonl`, `exp0064_feasibility_metrics.json`, `exp0064_feasibility_predictions.json`, `exp0064_feasibility_traces.jsonl`, `generate_c4_reconciliation.py`, `reconcile_c1.py`, `run_exp0033_benchmark.php`, `run_exp0039_dev_benchmark.php`, `run_exp0039_retrieval_benchmark.py`, `run_exp0059_benchmark.py`, `run_exp0060_benchmark.py`, `run_exp0061_benchmark.py`, `run_exp0061_blind_benchmark.py`, `run_exp0062_benchmark.py`, `run_exp0064_benchmark.py`, `run_exp0064_blind_benchmark.py`, `tier1_46_classified.json`, `tier1_46_detailed_traces.json`, `tier1_46_forensic_records.json`, `verify_exp0039_content_preservation.py`, `verify_exp0062_feasibility.py`, `verify_exp0064_blind_gate.py`, `verify_exp0064_feasibility.py`.
- **Untracked in Git**: **710 files** (675 directly in `scratch/`, 35 in subdirectories).

---

## 3. Exhaustive Survey of `backend/` Snapshot Files

### 3.1 Inventory of Legacy Snapshots
A scan of `backend/` identified exactly **35 snapshot files** matching `*.exp00XX*`, `*.champion.*`, `*.candidate.*`, `*.baseline.*`, or `*.challenger.*`:

| Snapshot Filename | Size (Bytes) | Git Status | Base File Relational Mapping |
|---|---|---|---|
| `embedding_coordinator.exp0013_champion.js` | 6,782 | Untracked | `backend/embedding_coordinator.js` |
| `embedding_coordinator.exp0016_candidate` | 6,782 | Untracked | `backend/embedding_coordinator.js` |
| `embedding_coordinator.exp0016_candidate.js` | 6,782 | Untracked | `backend/embedding_coordinator.js` |
| `exp0032_retrieval.php` | 14,861 | **Tracked** | Autonomous retrieval module from EXP-0032 |
| `gateway.exp0011_champion.js` | 4,746 | Untracked | `backend/gateway.js` |
| `gateway.exp0012_champion.js` | 4,995 | Untracked | `backend/gateway.js` |
| `gateway.exp0013_champion.js` | 6,766 | Untracked | `backend/gateway.js` |
| `gateway.exp0016_candidate` | 11,057 | Untracked | `backend/gateway.js` |
| `gateway.exp0016_candidate.js` | 11,057 | Untracked | `backend/gateway.js` |
| `index.exp0013_champion.php` | 118,665 | Untracked | `backend/index.php` |
| `rag_premise_verifier.exp0016_candidate` | 9,993 | Untracked | `backend/rag_premise_verifier.php` |
| `rag_premise_verifier.exp0016_candidate.php` | 9,993 | Untracked | `backend/rag_premise_verifier.php` |
| `rag_premise_verifier.exp0026_baseline.php` | 40,160 | Untracked | `backend/rag_premise_verifier.php` |
| `rag_query_condenser.exp0013_champion.php` | 15,069 | Untracked | `backend/rag_query_condenser.php` |
| `rag_query_condenser.exp0016_candidate` | 16,517 | Untracked | `backend/rag_query_condenser.php` |
| `rag_query_condenser.exp0016_candidate.php` | 16,517 | Untracked | `backend/rag_query_condenser.php` |
| `rag_query_orchestrator.exp0011_champion.php` | 13,539 | Untracked | `backend/rag_query_orchestrator.php` |
| `rag_query_orchestrator.exp0013_champion.php` | 13,539 | Untracked | `backend/rag_query_orchestrator.php` |
| `rag_safety_boundary.exp0013_champion.php` | 12,161 | Untracked | `backend/rag_safety_boundary.php` |
| `rag_safety_boundary.exp0016_candidate` | 12,520 | Untracked | `backend/rag_safety_boundary.php` |
| `rag_safety_boundary.exp0016_candidate.php` | 12,520 | Untracked | `backend/rag_safety_boundary.php` |
| `rag_semantic_mapper.exp0010_champion.php` | 25,041 | Untracked | `backend/rag_semantic_mapper.php` |
| `rag_semantic_mapper.exp0013_champion.php` | 25,041 | Untracked | `backend/rag_semantic_mapper.php` |
| `rag_service.exp0004_champion.php` | 29,761 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0006_champion.php` | 45,015 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0007_challenger.php` | 46,996 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0008_champion.php` | 46,996 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0009_champion.php` | 51,531 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0010_champion.php` | 56,359 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0011_champion.php` | 63,991 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0012_champion.php` | 71,707 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0013_champion.php` | 72,952 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0016_candidate` | 85,312 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0016_candidate.php` | 85,312 | Untracked | `backend/rag_service.php` |
| `rag_service.exp0022_champion.php` | 102,115 | Untracked | `backend/rag_service.php` |
| **Total (35 files)** | **902,467 B** | **1 Tracked, 34 Untracked** | |

### 3.2 Inventory of Active Production Files in `backend/`
To ensure zero accidental archiving of production code, here is the complete inventory of the **35 active production files** in `backend/` that **MUST REMAIN IN PLACE**:
- Core PHP Router & DB: `index.php`, `db.php`, `config.php`, `config.example.php`, `payment.php`, `auth_middleware.php`, `.htaccess`
- RAG Pipeline Core: `rag_service.php`, `rag_query_condenser.php`, `rag_premise_verifier.php`, `rag_safety_boundary.php`, `rag_query_orchestrator.php`, `rag_semantic_cache.php`, `rag_semantic_mapper.php`, `rag_pipeline_timer.php`, `rag_pipeline_metrics.php`, `rag_pipeline_analytics.php`, `rag_page_tracker.php`, `rag_structured_nli_verifier.php`, `rag_ambiguity_guard_verifier.php`, `rag_intent_clause_verifier.php`, `rag_flags.php`, `rag_flags.json`
- Ingestion & Microservices: `chonkie_chunker.py`, `docling_chunker.py`, `retrieval_bridge.py`, `seed_rag_knowledge.php`, `seed_rag_knowledge_with_pages.php`
- Gateway & Coordinators: `gateway.js`, `embedding_coordinator.js`
- Configuration & Diagnostics: `settings.json`, `start-backend.ps1`, `test_api.php`, `test_rag_ask.php`
- Subdirectories: `backend/services/`, `backend/storage/`

---

## 4. Archive Target Directories Survey

- **`archive/` Existence**: Does NOT exist (`Test-Path "archive"` returns `False`).
- **`archive/experiments/scratch/`**: Target directory does not exist.
- **`archive/experiments/backend_snapshots/`**: Target directory does not exist.
- **Creation Command**: Must create both directories before running migration commands:
  ```powershell
  New-Item -ItemType Directory -Force -Path "archive/experiments/scratch"
  New-Item -ItemType Directory -Force -Path "archive/experiments/backend_snapshots"
  ```

---

## 5. Production Test Suite Inspection (`tests/rag/`)

An automated regex scan across every `.php`, `.py`, `.js`, and `.json` file in `tests/rag/` was conducted to verify whether any test suite depends on `scratch/` or `backend/*.exp00*`.

### 5.1 Verification of `tests/rag/system_audit.php`
- **Line 5-11**: Directly requires:
  `backend/config.php`, `backend/db.php`, `backend/rag_service.php`, `backend/rag_premise_verifier.php`, `backend/rag_safety_boundary.php`, `backend/rag_pipeline_timer.php`, `backend/rag_semantic_cache.php`.
- **References to `scratch/`**: **0**
- **References to `backend/*.exp00*` snapshots**: **0**
- **Audit Execution Result**: Subsystem 1 (Storage/Vectors), Subsystem 2 (Ollama LLM Gateway), Subsystem 3 (Retrieval & Ranking), Subsystem 4 (Safety & Presupposition Verification) all passed with `[OK]`. (Subsystems 5 & 6 require live daemon servers running on port 8000/8100).
- **Independence Assessment**: 100% independent.

### 5.2 Verification of `tests/rag/benchmarks/rgb_ragchecker_suite.py`
- **Dependencies**: Uses `tests/rag/benchmarks/benchmark_dataset.json`, calls HTTP gateway `http://127.0.0.1:8000/api/rag/ask`, and calls Ollama judge `http://localhost:11434`.
- **References to `scratch/`**: **0**
- **References to `backend/*.exp00*` snapshots**: **0**
- **Independence Assessment**: 100% independent.

### 5.3 Inspection of All Other `tests/rag/` Suites
The following active test suites were verified:
- `tests/rag/runners/benchmark_runner.js`: 0 references to `scratch/`
- `tests/rag/runners/blind_benchmark_runner.js`: 0 references to `scratch/`
- `tests/rag/test_adversarial_challenger_m1_2.py`: 0 references to `scratch/`
- `tests/rag/test_adversarial_deep_dive.py`: 0 references to `scratch/`
- `tests/rag/test_challenger_m2_empirical.php`: 0 references to `scratch/`
- `tests/rag/test_challenger_m2_frontend_stress.py`: 0 references to `scratch/`
- `tests/rag/test_live_outage_fallback.php`: 0 references to `scratch/`
- `tests/rag/test_m1_frontend_challenge.py`: 0 references to `scratch/`
- `tests/rag/test_metrics.php`: 0 references to `scratch/`
- `tests/rag/test_milestones_2_to_5.py`: 0 references to `scratch/`
- `tests/rag/test_php_reranker_unit.php`: 0 references to `scratch/`
- `tests/rag/test_reranker_adversarial_suite.py`: 0 references to `scratch/`
- `tests/rag/test_reranker_resilience.php`: 0 references to `scratch/`
- `tests/rag/challenger_m1_stress_test.py`: 0 references to `scratch/`

### 5.4 Residual References in `tests/`
The only references to `scratch` found in `tests/` were in historical experiment records:
1. `tests/rag/cert_exp0014/run_suite_23_regression.js:25`: A historical EXP-0014 suite from experimental cycle 14 that called `scratch/cert_embedding_parity_50.js`.
2. `tests/rag/BENCHMARK_REPORT.md:1107`: Documentation text referencing a historical stress test log.
3. `tests/rag/reports/EXP-0018-FAILURE-REPRODUCTIONS.json`: Historical bug fix ledger listing old reproduction commands.
4. `tests/research/test_baseline_reproduction.py:20`: Skips automatically if `scratch/exp0040_dev_p1_cache.json` is missing (`self.skipTest(...)`).

**Conclusion:** Zero production test suites depend on `scratch/` or `backend/` snapshots. Archiving them will cause zero test regressions.

---

## 6. Git Status Analysis & Safe Migration Plan

### 6.1 Pitfalls Identified
1. **`git mv` on Untracked Files**:
   Attempting `git mv backend/rag_service.exp0016_candidate ...` triggers:
   `fatal: not under version control`.
   Because 34 of the 35 backend snapshots and 710 of the 766 scratch files are untracked, `git mv` cannot be called on them.
2. **Repository Bloat (1.66 GB Safetensors in `exp0070_models`)**:
   `scratch/exp0070_models/` holds 1.66 GB of binary model checkpoints. If moved into `archive/experiments/scratch/` and staged to Git, the repository size will explode from ~25 MB to over 1.7 GB!
   **Action Required:** Add `archive/experiments/scratch/exp0070_models/` and `*.safetensors` to `.gitignore`.

### 6.2 Proposed Safe Migration Procedure

#### Phase 1: Directory Setup & .gitignore Hardening
```powershell
# 1. Create target archive directories
New-Item -ItemType Directory -Force -Path "archive\experiments\scratch"
New-Item -ItemType Directory -Force -Path "archive\experiments\backend_snapshots"

# 2. Append large binary model weights to .gitignore to prevent repo bloat
Add-Content -Path ".gitignore" -Value "`n# Archived model weights (large binaries)`narchive/experiments/scratch/exp0070_models/`n*.safetensors`n"
```

#### Phase 2: Migrate Backend Snapshots (35 Files)
```powershell
# 1. Move the 1 tracked snapshot via git mv
git mv "backend/exp0032_retrieval.php" "archive/experiments/backend_snapshots/exp0032_retrieval.php"

# 2. Move the 34 untracked snapshot files via filesystem move
$snapshots = @(
  "embedding_coordinator.exp0013_champion.js",
  "embedding_coordinator.exp0016_candidate",
  "embedding_coordinator.exp0016_candidate.js",
  "gateway.exp0011_champion.js",
  "gateway.exp0012_champion.js",
  "gateway.exp0013_champion.js",
  "gateway.exp0016_candidate",
  "gateway.exp0016_candidate.js",
  "index.exp0013_champion.php",
  "rag_premise_verifier.exp0016_candidate",
  "rag_premise_verifier.exp0016_candidate.php",
  "rag_premise_verifier.exp0026_baseline.php",
  "rag_query_condenser.exp0013_champion.php",
  "rag_query_condenser.exp0016_candidate",
  "rag_query_condenser.exp0016_candidate.php",
  "rag_query_orchestrator.exp0011_champion.php",
  "rag_query_orchestrator.exp0013_champion.php",
  "rag_safety_boundary.exp0013_champion.php",
  "rag_safety_boundary.exp0016_candidate",
  "rag_safety_boundary.exp0016_candidate.php",
  "rag_semantic_mapper.exp0010_champion.php",
  "rag_semantic_mapper.exp0013_champion.php",
  "rag_service.exp0004_champion.php",
  "rag_service.exp0006_champion.php",
  "rag_service.exp0007_challenger.php",
  "rag_service.exp0008_champion.php",
  "rag_service.exp0009_champion.php",
  "rag_service.exp0010_champion.php",
  "rag_service.exp0011_champion.php",
  "rag_service.exp0012_champion.php",
  "rag_service.exp0013_champion.php",
  "rag_service.exp0016_candidate",
  "rag_service.exp0016_candidate.php",
  "rag_service.exp0022_champion.php"
)

foreach ($f in $snapshots) {
    if (Test-Path "backend\$f") {
        Move-Item -Path "backend\$f" -Destination "archive\experiments\backend_snapshots\$f"
    }
}
```

#### Phase 3: Migrate Scratch Files (766 Files & Subdirectories)
To ensure complete repository hygiene, migrate the entire transient `scratch/` content into `archive/experiments/scratch/`:

```powershell
# 1. Move the 56 tracked files via git mv
$trackedScratch = git ls-files scratch
foreach ($f in $trackedScratch) {
    $dest = $f.Replace("scratch/", "archive/experiments/scratch/")
    git mv "$f" "$dest"
}

# 2. Move all remaining untracked items (files and subdirectories) into archive/experiments/scratch
Get-ChildItem -Path "scratch" -Force | ForEach-Object {
    Move-Item -Path $_.FullName -Destination "archive\experiments\scratch\" -Force
}

# 3. Remove now-empty scratch/ directory
if ((Get-ChildItem -Path "scratch" -Force).Count -eq 0) {
    Remove-Item -Path "scratch" -Force
}
```

#### Phase 4: Post-Migration Validation
```powershell
# 1. Confirm system audit passes
php tests/rag/system_audit.php

# 2. Check git status
git status --short
```
After migration, `git status` will show:
- Renamed tracked files: `R  scratch/... -> archive/experiments/scratch/...` and `R  backend/exp0032_retrieval.php -> archive/experiments/backend_snapshots/exp0032_retrieval.php`
- Clean `backend/` root: 0 untracked snapshot files remaining.
- Clean `scratch/` root: directory removed or empty.
- Zero broken imports across all RAG services.
