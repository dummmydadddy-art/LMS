# REPRODUCIBILITY APPENDIX: ARTIFACT MANIFEST AND BENCHMARK SPECIFICATIONS

**Experiment Identifier:** `EXP-0013-CHAMPION-2026-09-09`  
**Target Architecture:** `EduConnect-LMS-Experimental`  
**Document Scope:** Complete cryptographic verification manifests, environment configurations, dataset inventories, and execution scripts for third-party replication.

---

## 1. Cryptographic Artifact Manifest

All 33 core source files, evaluation runners, evaluators, and benchmark datasets are cryptographically frozen. Any modification to these files will invalidate certification.

| Relative File Path | Byte Size | SHA-256 Checksum | Subsystem Category |
| :--- | :---: | :--- | :--- |
| `backend/embedding_coordinator.exp0013_champion.js` | 6,782 B | `221d86ede96ebe2938d6bd9a39b56ed718bee9586af0b5dcc70ba40f39854859` | Gateway Coordinator |
| `backend/embedding_coordinator.js` | 6,782 B | `221d86ede96ebe2938d6bd9a39b56ed718bee9586af0b5dcc70ba40f39854859` | Gateway Coordinator |
| `backend/gateway.exp0012_champion.js` | 4,995 B | `692b5e314b1a14a13cb674341be8f9bc5caa1d0bfab953f9c00b807c4717d798` | Control Gateway |
| `backend/gateway.exp0013_champion.js` | 6,766 B | `f20feb370466ead92d25037781cb14904060a7156b3e712f81cffc2c1ace5fe6` | Champion Gateway |
| `backend/gateway.js` | 6,766 B | `f20feb370466ead92d25037781cb14904060a7156b3e712f81cffc2c1ace5fe6` | Champion Gateway |
| `backend/index.php` | 118,755 B | `8a1c91a4284659546f77865db31c02c18645d88a3bed16001225935e3a0dfaa8` | LMS Router & API |
| `backend/rag_query_condenser.php` | 15,069 B | `401e50cf6dd88dc226d6ba0394ec93b023ffeb6f4e696c7c223a79fcbda0d559` | Conversational Condenser |
| `backend/rag_query_orchestrator.php` | 13,539 B | `644f466c88c1107ff5605e0dc60f0dc11b238b0842b6901ba571d955a21e82cc` | Multi-Hop Orchestrator |
| `backend/rag_safety_boundary.php` | 12,161 B | `8d4ed3fd87f5a86bfe9cb01d11fe4fb26de728d241cee823975d55ac7dc695c8` | Calibrated Safety Gate |
| `backend/rag_semantic_mapper.php` | 25,041 B | `a1314dc897e5c1dc9ccb0eadf24f3d78060627a3cf9063aa5fb96d4cd353318c` | Semantic Concept Mapper |
| `backend/rag_service.exp0012_champion.php` | 71,707 B | `616ad66f0ca6930f7428ed2c8a5f683f51739b7189cfa359c211acb87e6c373c` | Control RAG Service |
| `backend/rag_service.exp0013_champion.php` | 72,952 B | `78106272e60b58dbe05744fef599e3545f62ea3735433f2cac78f84b4b8b4d39` | Champion RAG Service |
| `backend/rag_service.php` | 72,952 B | `78106272e60b58dbe05744fef599e3545f62ea3735433f2cac78f84b4b8b4d39` | Champion RAG Service |
| `tests/rag/datasets/adversarial/lms_adversarial_v1.json` | 8,118 B | `b4a75ccb3abd5bde15c90596c88a24e2d9ee007b5daf73b78896a1fa6007b441` | Dev Adversarial Suite (20) |
| `tests/rag/datasets/blind_holdout/blind_holdout_v1.json` | 52,478 B | `c51ece5567ceaae21d7036df69b77428aad2ef186861c2458c65e8c0f25454de` | Blind Holdout Suite (165) |
| `tests/rag/datasets/conversational/conversational_holdout_v1.json` | 5,931 B | `de18861222c9721e1d67683dfa206bdee2e57918933f4e1e147acf72083f0449` | Conversational Suite v1 (31) |
| `tests/rag/datasets/conversational/conversational_holdout_v2.json` | 18,813 B | `df33a4007c8d7a44d8f2d793b1def797fecea29eb6c82727a0c1e7955c4b95b3` | Conversational Suite v2 (68) |
| `tests/rag/datasets/cross_module/lms_cross_module_v1.json` | 10,450 B | `10838031308d8a8a2c228a5ec234bf36f74f9ce60b0422563037b80a8aa29326` | Cross-Module Suite v1 (22) |
| `tests/rag/datasets/cross_module/lms_cross_module_v2.json` | 10,151 B | `09115818c8c6d23eae3ac4739d64fc21a2b1115ef98604fab2f1316988700efe` | Cross-Module Suite v2 (22) |
| `tests/rag/datasets/false_premise/blind_false_premise_v2.json` | 7,993 B | `342985599d457641d310a7e9e63858978d4f69b5a5dc5289de90d5a308daddcf` | Blind False-Premise (20) |
| `tests/rag/datasets/false_premise/false_premise_holdout_v1.json` | 5,873 B | `c7d838437b5405046ef1b353c6b411c8db39733b32286fb2cd87e623d3c1efd7` | Dev False-Premise (10) |
| `tests/rag/datasets/golden/lms_golden_v1.json` | 23,763 B | `d6b1f0e9464af4e254dc2885f7f764b416b171015e039f11d6ca0eec5f542469` | Dev Golden Suite (40) |
| `tests/rag/datasets/multi_hop/multi_hop_holdout_v1.json` | 56,502 B | `833ea1a2c8bcbfc96a4e6e06c15612f8d5923443cad2b237977fb2d33577b006` | Multi-Hop Suite (100) |
| `tests/rag/datasets/semantic/semantic_holdout_v1.json` | 41,721 B | `5ddf9ec0764f8c03557a0465c3b8f37ccfd271ef752b672f828ff90254113d9c` | Semantic Holdout Suite (100) |
| `tests/rag/datasets/unanswerable/blind_unanswerable_v1.json` | 4,588 B | `f801fe34ce811f22eb7888c5bebf3f08ada4aa88add9e85c758fdbe81c1214a1` | Blind Unanswerable v1 (25) |
| `tests/rag/datasets/unanswerable/blind_unanswerable_v2.json` | 15,999 B | `9e7e873f90f9162158b9a2c4c743ba76e23e6458220cbbe5b0078da7e20b503d` | Blind Unanswerable v2 (50) |
| `tests/rag/datasets/unanswerable/lms_unanswerable_v1.json` | 4,437 B | `b88316dcea3bf2ce6a8d09a1978aacdd72e04b84c9d1bc31c96c998cf71974a4` | Dev Unanswerable Suite (15) |
| `tests/rag/evaluators/claim_grounding_engine.js` | 9,669 B | `efa5230fe560c138ad7ab56ec6399330c614680f13de02cf759a41db575daf8a` | Grounding Evaluator |
| `tests/rag/evaluators/generation_metrics.js` | 3,504 B | `06f84a1f1d45e9de0e0d5de108c469b434d1599b2450f1f99f8bcb27748f7f58` | Generation Metrics |
| `tests/rag/evaluators/ir_metrics.js` | 3,475 B | `7defcc79875376b9e1dc1346cbf63414aaa91f229ee723c6e8086087af311213` | IR Evaluator |
| `tests/rag/evaluators/retrieval_integrity_test.js` | 2,610 B | `4c90b519a5467dd794c7f336d33322017a9926b81b41835d6b540866aa6ba7df` | Integrity Test Harness |
| `tests/rag/runners/benchmark_runner.js` | 14,327 B | `8a3f908d1a9662cb3e0886eb0a84c68f89572f938250767e5d72ccda8c3cde4b` | Dev Benchmark Runner |
| `tests/rag/runners/blind_benchmark_runner.js` | 13,351 B | `8af30ca4d806fa012d1e733e8483ecc3c3b4f788fb2b4d4d516ff9416ff33f5c` | Blind Benchmark Runner |

---

## 2. Environment Variables and Port Allocations

The following environment variables and network ports must be configured:
* `PORT=8000`: Node.js Asymmetric Gateway HTTP listen port.
* `WORKER_BASE_PORT=8001`: Starting port for background PHP CLI workers.
* `NUM_WORKERS=8`: Number of spawned PHP CLI workers (6 Fast Search, 2 LLM Gen).
* `OLLAMA_URL=http://localhost:11434`: Local neural inference service endpoint.
* `OLLAMA_KEEP_ALIVE=24h`: Instructs Ollama to keep models pinned in GPU memory.

---

## 3. Step-by-Step Reproduction Script

### Step 3.1: Manifest Integrity Verification
Run the following script to verify SHA-256 integrity:

```powershell
# Windows PowerShell SHA-256 Verification
$manifest = Get-Content "EXP0013_ARTIFACT_MANIFEST.txt" | Where-Object { $_ -match '^[a-f0-9]{64}' }
$allMatch = $true
foreach ($line in $manifest) {
    $parts = -split $line
    $hash = $parts[0]
    $file = $parts[3]
    $actual = (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLower()
    if ($actual -ne $hash) {
        Write-Host "MISMATCH: $file" -ForegroundColor Red
        $allMatch = $false
    }
}
if ($allMatch) { Write-Host "ALL ARTIFACTS VERIFIED IDENTICAL" -ForegroundColor Green }
```

### Step 3.2: System Launch
```bash
# In Terminal 1: Launch Gateway & Workers
node backend/gateway.js
```

### Step 3.3: Benchmark Battery Execution
```bash
# In Terminal 2: Execute Evaluations Sequentially
# 1. 50-Query Parity Check
node scratch/cert_embedding_parity_50.js

# 2. 97-Query Development Benchmark
node tests/rag/runners/benchmark_runner.js

# 3. 165-Query Blind Holdout Benchmark
node tests/rag/runners/blind_benchmark_runner.js

# 4. External Baselines Comparative Evaluation
node scratch/eval_external_baselines.js

# 5. Concurrency Benchmark (Profiles A, B, C)
node scratch/cert_concurrency_bench.js
```

---

## 4. Expected Quantitative Outputs and Tolerance Bounds

| Evaluation Benchmark | Nominal Measured Metric | Permissible Tolerance Range |
| :--- | :---: | :---: |
| **Dev Suite Hit@3 Recall** | 100.0% | $\pm 0.0\%$ (Strict Invariance) |
| **Dev Suite MRR** | 1.0000 | $\ge 0.9900$ |
| **Blind Holdout Hit@3 Recall** | 99.3% | $\pm 1.0\%$ ($98.5\% - 100.0\%$) |
| **Blind Holdout MRR** | 0.9893 | $\ge 0.9800$ |
| **Out-of-Domain Abstention Rate** | 100.0% (90/90) | $\pm 0.0\%$ (Zero Leakage Allowed) |
| **False-Premise Refutation Rate** | 70.0% (14/20) | $\pm 5.0\%$ ($65.0\% - 75.0\%$) |
| **Cosine Embedding Parity** | 1.00000000 | Exactly 1.00000000 (Bit-for-Bit) |
| **Warm Search p50 Latency** | 1.2 ms | $< 5.0\text{ ms}$ |
| **Cold Search p50 Latency** | 43.0 ms | $35.0\text{ to }65.0\text{ ms}$ |
| **Throughput @ 32 Clients (Profile B)** | 66.5 RPS | $60.0\text{ to }72.0\text{ RPS}$ |
| **Throughput @ 64 Clients (Profile B)** | 60.7 RPS | $55.0\text{ to }66.0\text{ RPS}$ |

*Scientific Candidate Declaration:*  
**"EXP-0013 is the frozen production candidate and represents the best measured configuration within the evaluated EduConnect experimental environment and benchmark suite."**
