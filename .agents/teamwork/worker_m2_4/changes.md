# Changes Summary: Requirement 2 — Repository Hygiene & Archival

**Worker**: `worker_m2_4`  
**Milestone**: M2 (Repository Hygiene & Archival)  
**Date**: 2026-10-04  

---

## 1. Directory Structure Setup
- Created target directory `archive/experiments/scratch/`.
- Created target directory `archive/experiments/backend_snapshots/`.

---

## 2. Gitignore Hardening
- Modified `.gitignore` to append rules protecting against repository bloat:
  ```gitignore
  # Archived model weights (large binaries)
  archive/experiments/scratch/exp0070_models/
  *.safetensors
  ```
- Verified via `git check-ignore` that the 1.66 GB PyTorch weights (`c1_ft_minilm_fold_1` to `fold_5` model safetensors) in `archive/experiments/scratch/exp0070_models/` are ignored by Git.

---

## 3. Backend Snapshots Archival (35 Files)
Archived all 35 legacy champion, candidate, baseline, and challenger snapshot files from `backend/` to `archive/experiments/backend_snapshots/`:
- **Tracked in Git (1 file, moved via `git mv`)**:
  - `backend/exp0032_retrieval.php` -> `archive/experiments/backend_snapshots/exp0032_retrieval.php`
- **Untracked in Git (34 files, moved via filesystem move)**:
  - `embedding_coordinator.exp0013_champion.js`
  - `embedding_coordinator.exp0016_candidate`
  - `embedding_coordinator.exp0016_candidate.js`
  - `gateway.exp0011_champion.js`
  - `gateway.exp0012_champion.js`
  - `gateway.exp0013_champion.js`
  - `gateway.exp0016_candidate`
  - `gateway.exp0016_candidate.js`
  - `index.exp0013_champion.php`
  - `rag_premise_verifier.exp0016_candidate`
  - `rag_premise_verifier.exp0016_candidate.php`
  - `rag_premise_verifier.exp0026_baseline.php`
  - `rag_query_condenser.exp0013_champion.php`
  - `rag_query_condenser.exp0016_candidate`
  - `rag_query_condenser.exp0016_candidate.php`
  - `rag_query_orchestrator.exp0011_champion.php`
  - `rag_query_orchestrator.exp0013_champion.php`
  - `rag_safety_boundary.exp0013_champion.php`
  - `rag_safety_boundary.exp0016_candidate`
  - `rag_safety_boundary.exp0016_candidate.php`
  - `rag_semantic_mapper.exp0010_champion.php`
  - `rag_semantic_mapper.exp0013_champion.php`
  - `rag_service.exp0004_champion.php`
  - `rag_service.exp0006_champion.php`
  - `rag_service.exp0007_challenger.php`
  - `rag_service.exp0008_champion.php`
  - `rag_service.exp0009_champion.php`
  - `rag_service.exp0010_champion.php`
  - `rag_service.exp0011_champion.php`
  - `rag_service.exp0012_champion.php`
  - `rag_service.exp0013_champion.php`
  - `rag_service.exp0016_candidate`
  - `rag_service.exp0016_candidate.php`
  - `rag_service.exp0022_champion.php`

- **Preserved in `backend/`**: Exactly 35 active production files remain untouched:
  `.htaccess`, `auth_middleware.php`, `chonkie_chunker.py`, `config.example.php`, `config.php`, `db.php`, `docling_chunker.py`, `embedding_coordinator.js`, `gateway.js`, `index.php`, `payment.php`, `rag_ambiguity_guard_verifier.php`, `rag_flags.json`, `rag_flags.php`, `rag_intent_clause_verifier.php`, `rag_page_tracker.php`, `rag_pipeline_analytics.php`, `rag_pipeline_metrics.php`, `rag_pipeline_timer.php`, `rag_premise_verifier.php`, `rag_query_condenser.php`, `rag_query_orchestrator.php`, `rag_safety_boundary.php`, `rag_semantic_cache.php`, `rag_semantic_mapper.php`, `rag_service.php`, `rag_structured_nli_verifier.php`, `retrieval_bridge.py`, `security_events.log`, `seed_rag_knowledge.php`, `seed_rag_knowledge_with_pages.php`, `settings.json`, `start-backend.ps1`, `test_api.php`, `test_rag_ask.php`.

---

## 4. Scratch Files Archival (766 Files & Subdirectories)
Archived all 766 files and subdirectories from `scratch/` to `archive/experiments/scratch/`:
- **Tracked in Git (56 files, moved via `git mv`)**:
  - `blind_retrieval_cache_300.json`, `blind_retrieval_cache_400.json`, `compute_exp0039_chunk_statistics.py`, `compute_exp0059_metrics.py`, `compute_exp0060_metrics.py`, `compute_exp0061_blind_metrics.py`, `compute_exp0061_metrics.py`, `compute_exp0062_metrics.py`, `compute_exp0064_blind_metrics.py`, `compute_exp0064_metrics.py`, `evaluate_exp0059_a4.php`, `evaluate_exp0060_a4.php`, `evaluate_exp0061_a4.php`, `evaluate_exp0061_blind_a4.php`, `evaluate_exp0062_a4.php`, `evaluate_exp0064_a4.php`, `evaluate_exp0064_blind_a4.php`, `exp0031_blind_retrieval_cache.json`, `exp0031_challenge_retrieval_cache.json`, `exp0031_nli_cache.json`, `exp0033_nli_cache.json`, `exp0033_predictions.json`, `exp0033_retrieval_cache.json`, `exp0037_nli_cache.json`, `exp0039_content_preservation_report.json`, `exp0039_dev_predictions.json`, `exp0039_retrieval_metrics.json`, `exp0062_feasibility_metrics.json`, `exp0062_feasibility_predictions.json`, `exp0062_feasibility_traces.jsonl`, `exp0064_blind_gate_metrics.json`, `exp0064_blind_gate_predictions.json`, `exp0064_blind_gate_traces.jsonl`, `exp0064_blind_traces.jsonl`, `exp0064_feasibility_metrics.json`, `exp0064_feasibility_predictions.json`, `exp0064_feasibility_traces.jsonl`, `generate_c4_reconciliation.py`, `reconcile_c1.py`, `run_exp0033_benchmark.php`, `run_exp0039_dev_benchmark.php`, `run_exp0039_retrieval_benchmark.py`, `run_exp0059_benchmark.py`, `run_exp0060_benchmark.py`, `run_exp0061_benchmark.py`, `run_exp0061_blind_benchmark.py`, `run_exp0062_benchmark.py`, `run_exp0064_benchmark.py`, `run_exp0064_blind_benchmark.py`, `tier1_46_classified.json`, `tier1_46_detailed_traces.json`, `tier1_46_forensic_records.json`, `verify_exp0039_content_preservation.py`, `verify_exp0062_feasibility.py`, `verify_exp0064_blind_gate.py`, `verify_exp0064_feasibility.py`.
- **Untracked in Git (710 files & subdirectories, moved via filesystem move)**:
  - All 130 executable experiment test scripts (`scratch/test_*.php/py/js`).
  - Subdirectories `exp0070_models/`, `pageindex_store/`, `data_benchmarks/`, `__pycache__/`, `exp0023/`.
  - All sidecars and metadata files.
- **Directory Cleanup**:
  - Removed the empty `scratch/` directory.

---

## 5. Transient Root Files Cleanup
- Removed temporary test probe files from repository root:
  - `test_probe_out.txt`
  - `test_py.txt`

---

## 6. Verification Results
1. **System Health Audit (`php tests/rag/system_audit.php`)**:
   - Subsystem 1: Storage & Vector Database -> `[OK]` (1,323 chunks, vectors.sqlite)
   - Subsystem 2: Ollama Local LLM Gateway -> `[OK]` (nomic-embed-text, llama3.2, qwen3:4b)
   - Subsystem 3: Retrieval & Ranking Engine -> `[OK]` (Hybrid Search Dense+BM25, top sim 0.814)
   - Subsystem 4: Safety & Verification Subsystem -> `[OK]` (Quantum/Bake ABSTAIN, ===! REFUTED, Box Model SUPPORTED)
   - Subsystem 5: Live FrankenPHP HTTP Gateway -> `[OK]` (HTTP 200 in 197.9ms, Answer len: 570)
   - Subsystem 6: Semantic Cache & Latency Profiling -> `[OK]` (Pipeline Latency Telemetry JSONL 190 bytes, Cache entries 33)
   - **Audit Result**: `ALL SUBSYSTEMS HEALTHY & OPERATIONAL (100% OK)`
2. **Git Status**:
   - `backend/`: 0 untracked snapshots remaining; exactly 35 production files intact.
   - `scratch/`: Removed; 0 untracked files in root or `scratch/`.
   - `archive/experiments/scratch/exp0070_models/` & `*.safetensors`: Properly ignored by `.gitignore`.
