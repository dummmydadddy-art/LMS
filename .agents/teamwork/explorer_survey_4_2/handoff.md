# Handoff Report: Requirement 2 — Repository Hygiene & Archival

**Sender:** `explorer_survey_4_2`  
**Recipient:** `parent` (`orchestrator_4` / `7d098cfd-b54b-47ac-998d-3089d4134ae1`)  
**Working Directory:** `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2`  
**Handoff Type:** Hard (Survey Task Complete)  
**Primary Reference:** `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2\analysis.md`

---

## 1. Observation

1. **`scratch/` Directory Survey**:
   - Traversal via Python scanner revealed **766 total files** totaling **2,721,507,761 bytes (~2.72 GB)**.
   - Script breakdown matching `scratch/test_*.php/py/js`:
     - `test_*.py`: 60 files (e.g., `test_bge_m3_init.py`, `test_chonkie_both.py`, `test_judge.py`)
     - `test_*.php`: 57 files (e.g., `test_smart_fusion.php`, `test_conversational_rag.php`, `test_targeted_secondary.php`)
     - `test_*.js`: 13 files (e.g., `test_concurrency_32.js`, `test_streaming_ttft.js`, `test_supabase.js`)
     - Total `test_*.php/py/js`: **130 executable scripts**.
   - Other `test_*` artifacts: 54 `.json` (primarily `.metadata.json`), 1 `.pdf` (`test_20p.pdf`), 1 `.png` (`test_page_1.png`), 1 `.txt` (`test_b64.txt`), 2 `.pyc`. Total all `test_*`: **189 files**.
   - Subdirectories in `scratch/`:
     - `scratch/exp0070_models/`: 20 files, **1,660,279,195 bytes (1.66 GB)** of PyTorch safetensor model fold weights (`c1_ft_minilm_fold_1` to `fold_5`).
     - `scratch/pageindex_store/`: 7 files, 42,320 bytes (`tree.json`, `pages.json`, `doc.json`).
     - `scratch/data_benchmarks/`: 3 files, 106,583 bytes (`curriculum_20p.pdf`, `curriculum_50p.pdf`, `curriculum_full.pdf`).
     - `scratch/__pycache__/`: 5 files, 54,967 bytes.
     - `scratch/exp0023/`: 0 files, 0 bytes.
   - Git tracking status in `scratch/`:
     - `git ls-files scratch` yielded exactly **56 files** (all at root of `scratch/`).
     - Remaining **710 files are untracked**.

2. **`backend/` Snapshot Survey**:
   - Pattern match for `*exp00*`, `*champion*`, `*candidate*`, `*baseline*`, `*challenger*` returned exactly **35 files** totaling **902,467 bytes (~881 KB)**:
     - 13 `rag_service` snapshots: `rag_service.exp0004_champion.php`, `.exp0006_champion.php`, `.exp0007_challenger.php`, `.exp0008_champion.php`, `.exp0009_champion.php`, `.exp0010_champion.php`, `.exp0011_champion.php`, `.exp0012_champion.php`, `.exp0013_champion.php`, `.exp0016_candidate`, `.exp0016_candidate.php`, `.exp0022_champion.php`.
     - 5 `gateway` snapshots: `gateway.exp0011_champion.js`, `.exp0012_champion.js`, `.exp0013_champion.js`, `.exp0016_candidate`, `.exp0016_candidate.js`.
     - 3 `embedding_coordinator` snapshots: `embedding_coordinator.exp0013_champion.js`, `.exp0016_candidate`, `.exp0016_candidate.js`.
     - 3 `rag_premise_verifier` snapshots: `rag_premise_verifier.exp0016_candidate`, `.exp0016_candidate.php`, `.exp0026_baseline.php`.
     - 3 `rag_query_condenser` snapshots: `rag_query_condenser.exp0013_champion.php`, `.exp0016_candidate`, `.exp0016_candidate.php`.
     - 3 `rag_safety_boundary` snapshots: `rag_safety_boundary.exp0013_champion.php`, `.exp0016_candidate`, `.exp0016_candidate.php`.
     - 2 `rag_query_orchestrator` snapshots: `rag_query_orchestrator.exp0011_champion.php`, `.exp0013_champion.php`.
     - 2 `rag_semantic_mapper` snapshots: `rag_semantic_mapper.exp0010_champion.php`, `.exp0013_champion.php`.
     - 1 `index` snapshot: `index.exp0013_champion.php`.
     - 1 retrieval file: `exp0032_retrieval.php`.
   - Git tracking status in `backend/` snapshots:
     - Exactly **1 file is tracked**: `backend/exp0032_retrieval.php`.
     - Exactly **34 files are untracked**.
   - Exactly **35 active production files** remain in `backend/` (e.g., `rag_service.php`, `rag_query_condenser.php`, `gateway.js`, `index.php`).

3. **Target Archive Directories**:
   - `Test-Path "archive"` returns `False`. Neither `archive/experiments/scratch/` nor `archive/experiments/backend_snapshots/` exists.

4. **`tests/rag/` Dependency Inspection**:
   - `tests/rag/system_audit.php` (lines 5-11): Requires only active backend files (`config.php`, `db.php`, `rag_service.php`, `rag_premise_verifier.php`, `rag_safety_boundary.php`, `rag_pipeline_timer.php`, `rag_semantic_cache.php`). Zero references to `scratch/` or `backend/*.exp00*`.
   - `tests/rag/benchmarks/rgb_ragchecker_suite.py`: Zero references to `scratch/` or snapshots.
   - Ripgrep for `scratch` in `tests/rag/*.py` and `tests/rag/*.php`: **0 matches**.
   - Residual references found in non-core docs:
     - `tests/rag/cert_exp0014/run_suite_23_regression.js:25`: Legacy suite from cycle 14 referencing `scratch/cert_embedding_parity_50.js`.
     - `tests/rag/BENCHMARK_REPORT.md:1107`: Markdown documentation string.
     - `tests/rag/reports/EXP-0018-FAILURE-REPRODUCTIONS.json`: Historical bug ledger.

5. **`git status` Behavior**:
   - Running `git mv` on untracked files outputs: `fatal: not under version control`.
   - `scratch/exp0070_models/` holds 1.66 GB of binary weights not covered by `.gitignore`.

---

## 2. Logic Chain

1. **Premise 1 (Snapshot Isolation)**: From Observation 2, `backend/` contains 70 total files: 35 active production files and 35 legacy snapshots. Grep scans across `backend/` showed that active production files only reference snapshots as static strings (e.g., `'backend' => 'hybrid_rrf_llama3_exp0023'`), never via `require`, `include`, or function imports.
2. **Premise 2 (Production Test Independence)**: From Observation 4, `tests/rag/system_audit.php` and `tests/rag/benchmarks/rgb_ragchecker_suite.py` do not load or query any file in `scratch/` or any backend snapshot.
3. **Inference 1 (Safety of Moving Files)**: Moving all 35 snapshots from `backend/` and all transient test scripts from `scratch/` will have **zero functional impact** on runtime backend execution or production test execution.
4. **Premise 3 (Git Tracking Bifurcation)**: From Observation 1 and 2, out of 35 backend snapshots, only 1 is tracked; out of 766 scratch files, only 56 are tracked.
5. **Inference 2 (Migration Execution Command Design)**: A naive `git mv *` command will abort with `fatal: not under version control`. The migration command must execute `git mv` exclusively on the 1 tracked snapshot (`backend/exp0032_retrieval.php`) and the 56 tracked scratch files, while using filesystem moves (`Move-Item` / Python `shutil.move`) on all untracked files.
6. **Premise 4 (Git Repository Bloat Danger)**: From Observation 1, `scratch/exp0070_models/` contains 1.66 GB of PyTorch `.safetensors` files.
7. **Inference 3 (Gitignore Hardening)**: Staging `archive/experiments/scratch/` into git without adding `archive/experiments/scratch/exp0070_models/` and `*.safetensors` to `.gitignore` will permanently inflate the git repository size from ~25 MB to over 1.7 GB. Therefore, `.gitignore` must be updated prior to staging.

---

## 3. Caveats

1. **`tests/rag/cert_exp0014/run_suite_23_regression.js`**:
   This historical test script from experimental cycle 14 explicitly spawns `node scratch/cert_embedding_parity_50.js`. It is not part of the active production test suite (`system_audit.php` or `rgb_ragchecker_suite.py`). If the developer ever intends to run `run_suite_23_regression.js`, its internal path would need updating to `archive/experiments/scratch/cert_embedding_parity_50.js`.
2. **`research/` Artifacts**:
   A few evaluation scripts in `research/benchmarks/` and `tests/research/test_baseline_reproduction.py` reference legacy caches in `scratch/` (e.g., `scratch/exp0040_dev_p1_cache.json`). These scripts are outside `tests/rag/` and include fallback guards (`self.skipTest(...)`), but will not find files in `scratch/` once archived unless updated or run against the archive directory.
3. **Transient Files in Root**:
   There are 2 empty/trivial temporary test files in the repository root (`test_probe_out.txt`, `test_py.txt`) that appear in `git status`. While not inside `backend/` or `scratch/`, they can be safely deleted during repo cleanup.

---

## 4. Conclusion

1. Requirement 2 is fully ready for safe implementation.
2. The exact migration targets are:
   - **Target 1**: `archive/experiments/backend_snapshots/` for the 35 backend snapshot files (1 via `git mv`, 34 via filesystem move).
   - **Target 2**: `archive/experiments/scratch/` for the 766 scratch files and subdirectories (56 via `git mv`, 710 via filesystem move).
3. The production test suites in `tests/rag/` (`system_audit.php` and `rgb_ragchecker_suite.py`) will remain 100% operational and undamaged.
4. `.gitignore` must be amended with `archive/experiments/scratch/exp0070_models/` and `*.safetensors` to prevent 1.66 GB of model weights from bloating git.

---

## 5. Verification Method

To independently verify the survey findings and validate the migration once implemented:

1. **Verify Backend Decoupling**:
   ```powershell
   # Confirm no active backend file requires snapshots
   python -c "import os, re; b=r'd:\Collage project\EduConnect-LMS-Experimental\backend'; p=re.compile(r'exp00\d\d|_champion|_candidate|_challenger', re.I); print([(f, idx, l.strip()) for f in os.listdir(b) if os.path.isfile(os.path.join(b, f)) and not any(k in f for k in ['exp00', 'champion', 'candidate', 'challenger']) for idx, l in enumerate(open(os.path.join(b, f), 'r', encoding='utf-8', errors='ignore'), 1) if p.search(l)])"
   ```
   *Expected output*: Only static backend mode strings in `rag_service.php:2027` and `:2524`.

2. **Verify Production Test Independence**:
   ```powershell
   # Confirm system audit passes without scratch or snapshots
   php tests/rag/system_audit.php
   ```
   *Expected output*: Subsystems 1 through 4 pass with `[OK]` (Subsystem 5 & 6 require live daemon servers).

3. **Verify Git Tracking Counts**:
   ```powershell
   git ls-files scratch | Measure-Object -Line # Should output 56
   git ls-files backend | Select-String "exp00" # Should output 1: backend/exp0032_retrieval.php
   ```

4. **Verify Clean Git Status Post-Migration**:
   ```powershell
   git status --short backend scratch
   ```
   *Expected output*: 0 untracked snapshot files in `backend/`, and `scratch/` directory empty/removed.
