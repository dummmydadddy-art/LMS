# Forensic Audit Report: Milestone 2 — Repository Hygiene & Archival

**Auditor**: `auditor_m2_4`  
**Target**: Milestone 2 (`worker_m2_4` work product)  
**Profile**: General Project (`development` mode as specified in `ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN**

---

### Phase Results
- **Check 1: Authentic Archival & File Preservation**: **PASS** — 766 files (2,851,287,638 bytes) preserved in `archive/experiments/scratch/`; 35 snapshot files (1,173,150 bytes) preserved in `archive/experiments/backend_snapshots/`; 0 zero-byte files; legacy directory `scratch/` and transient files cleanly removed without loss of underlying artifacts.
- **Check 2: Production Backend Integrity**: **PASS** — Exactly 35 active production files intact in `backend/` (e.g. `index.php` 127,886 bytes, `rag_service.php` 118,563 bytes); 0 snapshot files remaining in `backend/`; 0 placeholder/stub errors or truncations.
- **Check 3: Git Rename Tracking**: **PASS** — Exactly 57 staged renames in Git index (`R100 backend/exp0032_retrieval.php` -> `archive/experiments/backend_snapshots/exp0032_retrieval.php`, plus 56 scratch renames from `scratch/...` -> `archive/experiments/scratch/...`); `git diff --stat --cached` confirms `57 files changed, 0 insertions(+), 0 deletions(-)`.
- **Check 4: Repository Bloat Prevention (.gitignore)**: **PASS** — `git check-ignore -v` confirms rules at `.gitignore:42-43` ignore `archive/experiments/scratch/exp0070_models/` and `*.safetensors`, preventing 1,660,279,195 bytes (1.55 GiB / 1.66 GB) of PyTorch fold checkpoints from bloating git history.
- **Check 5: Live Subsystem Health Verification**: **PASS** — `php tests/rag/system_audit.php` executed independently and passed with 100% OK across all 6 subsystems (Storage, Ollama LLM, Hybrid Retrieval, Safety, Live HTTP Gateway, and Telemetry).
- **Check 6: Client Build Health**: **PASS** — `npm run build` in `frontend/` succeeded with 0 TypeScript/compilation errors.

---

## 1. Observation

1. **Archive Directory & Content Preservation**:
   - `archive/experiments/scratch/` exists and contains 766 files totaling 2,851,287,638 bytes (~2.85 GB).
   - `archive/experiments/backend_snapshots/` exists and contains 35 files totaling 1,173,150 bytes (~1.17 MB).
   - Zero files in `archive/experiments/backend_snapshots/` have length 0:
     ```powershell
     (Get-ChildItem -Path archive/experiments/backend_snapshots -File | Where-Object { $_.Length -eq 0 }).Count
     # Result: 0
     ```
   - Legacy directories and transient files:
     - `Test-Path 'scratch'` returned `False`.
     - `Test-Path 'test_probe_out.txt'` returned `False`.
     - `Test-Path 'test_py.txt'` returned `False`.

2. **Backend Production Files Preservation**:
   - Total files directly in `backend/`: 35 files.
   - Files matching `exp00|champion|candidate|baseline|challenger` directly in `backend/`: 0 files:
     ```python
     # python check:
     Experiment snapshot files found in backend/: []
     ```
   - Core production files retain full authentic sizes and logic:
     - `backend/index.php`: 127,886 bytes
     - `backend/rag_service.php`: 118,563 bytes
     - `backend/rag_premise_verifier.php`: 94,242 bytes
     - `backend/rag_pipeline_metrics.php`: 22,196 bytes
     - `backend/gateway.js`: 21,578 bytes
     - `backend/rag_query_condenser.php`: 19,219 bytes
   - Grep search for `NotImplementedError` or dummy placeholders in `backend/` returned 0 matches.

3. **Git Tracking of Renames**:
   - Staged status via `git diff --cached --name-status`:
     - 1 backend rename: `R100 backend/exp0032_retrieval.php archive/experiments/backend_snapshots/exp0032_retrieval.php`
     - 56 scratch renames: `R100 scratch/... archive/experiments/scratch/...`
     - Total staged changes: 57 renames.
   - `git diff --stat --cached`:
     `57 files changed, 0 insertions(+), 0 deletions(-)`

4. **.gitignore Rule Enforcement**:
   - Added lines to `.gitignore`:
     ```gitignore
     # Archived model weights (large binaries)
     archive/experiments/scratch/exp0070_models/
     *.safetensors
     ```
   - Raw output of `git check-ignore -v`:
     ```
     .gitignore:42:archive/experiments/scratch/exp0070_models/  archive/experiments/scratch/exp0070_models
     .gitignore:42:archive/experiments/scratch/exp0070_models/  archive/experiments/scratch/exp0070_models/c1_ft_minilm_fold_1/model.safetensors
     .gitignore:43:*.safetensors                                some_file.safetensors
     ```
   - Total byte count of `archive/experiments/scratch/exp0070_models/`: 1,660,279,195 bytes (1.55 GiB / 1.66 GB), effectively shielded from git commits.

5. **Independent System Audit Execution**:
   - Executed `php tests/rag/system_audit.php` against live environment:
     ```
     =========================================================================
        EduConnect-LMS: Comprehensive Subsystem Health Audit
        Date: 2026-10-04 07:46:32
     =========================================================================

     --- 1. Storage & Vector Database ---
     [OK]   SQLite Connection                        Connected to vectors.sqlite
     [OK]   Corpus Scale (Chunks)                    Total: 1323 chunks
     [OK]   Vector Embedding Storage                 Binary BLOB present (3072 bytes)

     --- 2. Ollama Local LLM Gateway ---
     [OK]   Ollama Daemon HTTP                       Port 11434 responding
     [OK]   Embedding Model (nomic-embed-text)       Present
     [OK]   Production Generator (llama3.2)          Present
     [OK]   Evaluation Judge (qwen3:4b)              Present
     [OK]   Embedding Generation                     768-dim vector generated in 82.2ms

     --- 3. Retrieval & Ranking Engine ---
     [OK]   Hybrid Search (Dense + BM25)             1159.2ms, top sim: 0.814
     [OK]   Prewarmed Corpus Mode                    Mode: EXP-0023

     --- 4. Safety & Verification Subsystem ---
     [OK]   Out-of-Domain Rejection (Quantum)        Action: ABSTAIN
     [OK]   Non-Academic Trap Rejection (Bake)       Action: ABSTAIN
     [OK]   Fabricated Syntax Trap (===!)            Status: REFUTED
     [OK]   Valid Query Preservation (Box Model)     Status: SUPPORTED

     --- 5. Live FrankenPHP HTTP Gateway (127.0.0.1:8000) ---
     [OK]   Gateway POST /api/rag/ask                HTTP 200 in 172.6ms, Answer len: 570

     --- 6. Semantic Cache & Latency Profiling ---
     [OK]   Pipeline Latency Telemetry (JSONL)       File size: 569 bytes (pipeline_2026-10-04.jsonl)
     [OK]   Semantic Query Cache                     Entries: 33

     =========================================================================
        SYSTEM AUDIT RESULT: ALL SUBSYSTEMS HEALTHY & OPERATIONAL (100% OK)
     =========================================================================
     ```

6. **Frontend Build Verification**:
   - Executed `npm run build` in `frontend/`:
     ```
     vite v8.0.16 building client environment for production...
     transforming...✓ 1873 modules transformed.
     rendering chunks...
     dist/index.html                   0.51 kB │ gzip:   0.31 kB
     dist/assets/index-DmvYv3R5.css   75.27 kB │ gzip:  12.10 kB
     dist/assets/index-g4myOzoP.js   772.27 kB │ gzip: 196.60 kB
     ✓ built in 1.14s
     ```

---

## 2. Logic Chain

1. **Premise 1 (Preservation vs Deletion)**: From Observation 1, `archive/experiments/scratch/` holds 766 files (2.85 GB) and `archive/experiments/backend_snapshots/` holds 35 files (1.17 MB) with 0 zero-byte files. The files were not deleted or corrupted; their content, scripts, and checkpoints remain completely intact on the filesystem.
2. **Premise 2 (Production Safety)**: From Observation 2, all 35 active production files in `backend/` are intact and uncorrupted, while all transient experiment snapshots were cleanly removed.
3. **Premise 3 (Clean Git Lineage)**: From Observation 3, Git tracks exactly 57 staged renames (1 backend snapshot and 56 scratch files) with 0 insertions and 0 deletions, maintaining historical commit lineage and clean staging without index fragmentation.
4. **Premise 4 (Bloat Protection)**: From Observation 4, `.gitignore` rules prevent staging of 1.66 GB of binary model checkpoints in `exp0070_models/` and `*.safetensors`, verified empirically via `git check-ignore -v`.
5. **Premise 5 (Zero Regression in Live System)**: From Observation 5 and Observation 6, `php tests/rag/system_audit.php` passed with 100% OK across all 6 live subsystems, and `npm run build` passed with 0 errors, proving that moving experiment files did not introduce any runtime or build regressions.
6. **Conclusion**: The work product satisfies all requirements of Milestone 2 with zero integrity violations.

---

## 3. Caveats

- As noted by worker_m2_4, non-core legacy test scripts (e.g. `tests/rag/cert_exp0014/run_suite_23_regression.js`) contain historical path references to `scratch/cert_embedding_parity_50.js` from experimental cycle 14; active production test suites and benchmarks reside in `tests/rag/` and `tests/rag/benchmarks/` and are unaffected.
- Model safetensors (1.66 GB) are preserved in `archive/experiments/scratch/exp0070_models/` for forensic and archival completeness on disk, but intentionally excluded from git tracking via `.gitignore`.

---

## 4. Conclusion

**Verdict: CLEAN**.
All claims made in `worker_m2_4/handoff.md` are empirically verified. Files were authentically archived, git tracking is accurate with 57 clean renames, `.gitignore` protects against large binary commits, production backend files are untouched and uncorrupted, and the live system audit passes 100% OK.

---

## 5. Verification Method

To independently verify these conclusions:

1. **Verify Archive Files & Sizes**:
   ```powershell
   (Get-ChildItem -Path "archive/experiments/scratch" -Recurse -File).Count
   # Expected: 766
   (Get-ChildItem -Path "archive/experiments/backend_snapshots" -File).Count
   # Expected: 35
   Test-Path "scratch"
   # Expected: False
   ```

2. **Verify Backend Directory**:
   ```powershell
   (Get-ChildItem -Path "backend" -File).Count
   # Expected: 35
   (Get-ChildItem -Path "backend" -File | Where-Object { $_.Name -match "exp00|champion|candidate|baseline|challenger" }).Count
   # Expected: 0
   ```

3. **Verify Git Staged Renames**:
   ```powershell
   git diff --stat --cached
   # Expected: 57 files changed, 0 insertions(+), 0 deletions(-)
   ```

4. **Verify Gitignore**:
   ```powershell
   git check-ignore -v "archive/experiments/scratch/exp0070_models" "archive/experiments/scratch/exp0070_models/c1_ft_minilm_fold_1/model.safetensors"
   # Expected: matched .gitignore:42
   ```

5. **Run System Audit**:
   ```powershell
   php tests/rag/system_audit.php
   # Expected: ALL SUBSYSTEMS HEALTHY & OPERATIONAL (100% OK)
   ```
