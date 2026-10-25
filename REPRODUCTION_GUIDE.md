# REPRODUCTION GUIDE: EXP-0013 RAG CHAMPION BENCHMARK

**Experiment ID:** `EXP-0013-CHAMPION-2026-09-09`  
**Target System:** `EduConnect-LMS-Experimental`  
**Purpose:** Self-contained, step-by-step instructions enabling independent third-party researchers and systems engineers to reproduce all reported empirical findings, retrieval accuracy metrics, latency percentiles, and concurrency benchmarks from a clean environment.

---

## 1. System Prerequisites

The benchmark was developed and certified on the following reference hardware and software platform. Equivalent or superior hardware will produce comparable or lower latency figures.

### 1.1 Hardware Specifications
* **CPU:** 8+ logical cores (Tested on Intel Core i5-12450H: 8 Cores [4 Performance, 4 Efficient], 12 Threads, Base 2.0 GHz, Turbo 4.4 GHz).
* **RAM:** 16 GB DDR4 or DDR5 system memory (Minimum 12 GB free for OS and benchmark run).
* **GPU:** NVIDIA GPU with $\ge 4.0$ GB dedicated GDDR6 VRAM (Tested on NVIDIA GeForce RTX 3050 Laptop GPU, 50W TGP, Driver Version 550+, CUDA 12.2+).
* **Storage:** Fast NVMe SSD with $\ge 10$ GB free space.

### 1.2 Software Dependencies
* **Operating System:** Microsoft Windows 11 (64-bit) or Linux (Ubuntu 22.04 LTS / Debian 12).
* **PHP Runtime:** PHP 8.3.x CLI (Command Line Interface).
  - *Required PHP Extensions:* `pdo_sqlite`, `sqlite3`, `curl`, `mbstring`, `json`.
  - Verify with: `php -m | grep -E "pdo_sqlite|curl|mbstring"`
* **Node.js Runtime:** Node.js v20.x or v24.x LTS.
  - Verify with: `node -v`
* **Inference Server:** Ollama v0.3.0 or higher running on default port `11434`.
  - Verify with: `ollama --version`
* **Local Neural Models:**
  - Embedding Model: `nomic-embed-text:latest` (768 dimensions, ~274 MB disk, ~308 MB VRAM).
  - Generator Model: `llama3.2:latest` (3.2B parameters, 4-bit quantized, ~2.0 GB disk, ~2,210 MB VRAM).
  - Install via:
    ```bash
    ollama pull nomic-embed-text
    ollama pull llama3.2
    ```

### 1.3 Network & Port Allocations
Ensure the following local TCP ports are free before starting:
* `11434`: Ollama Local Daemon.
* `8000`: Node.js Asymmetric Gateway.
* `8001` through `8006`: 6 Fast Search PHP CLI Workers.
* `8007` through `8008`: 2 LLM Generation PHP CLI Workers.

---

## 2. Environment Verification & SHA-256 Check

Before executing any benchmark scripts, verify that all champion source files, datasets, and evaluators are bit-identical to the frozen manifest.

### 2.1 Directory Structure
Ensure you are operating in the experimental root directory:
```
D:\Collage project\EduConnect-LMS-Experimental\
├── backend\
│   ├── config.php
│   ├── db.php
│   ├── embedding_coordinator.js
│   ├── gateway.js
│   ├── index.php
│   ├── rag_query_condenser.php
│   ├── rag_query_orchestrator.php
│   ├── rag_safety_boundary.php
│   ├── rag_semantic_mapper.php
│   └── rag_service.php
├── tests\rag\
│   ├── datasets\
│   ├── evaluators\
│   └── runners\
└── EXP0013_ARTIFACT_MANIFEST.txt
```

### 2.2 SHA-256 Hash Verification Command

Run the following script to verify all 33 frozen files against `EXP0013_ARTIFACT_MANIFEST.txt`:

**PowerShell (Windows):**
```powershell
$manifest = Get-Content "EXP0013_ARTIFACT_MANIFEST.txt" | Where-Object { $_ -match '^[a-f0-9]{64}' }
$allPassed = $true
foreach ($line in $manifest) {
    $parts = -split $line
    $expectedHash = $parts[0]
    $relativePath = $parts[3]
    $fileHash = (Get-FileHash -Algorithm SHA256 -Path $relativePath).Hash.ToLower()
    if ($fileHash -ne $expectedHash) {
        Write-Host "MISMATCH: $relativePath (Expected: $expectedHash, Got: $fileHash)" -ForegroundColor Red
        $allPassed = $false
    }
}
if ($allPassed) {
    Write-Host "ALL 33 FROZEN ARTIFACTS VERIFIED IDENTICAL (SHA-256 OK)" -ForegroundColor Green
}
```

**Bash (Linux / macOS):**
```bash
awk '/^[a-f0-9]{64}/ { print $1, $3 }' EXP0013_ARTIFACT_MANIFEST.txt | sha256sum -c -
```

---

## 3. Launching the System Under Test

### Step 3.1: Pre-Pin Models in GPU Memory
To prevent cold-start model swapping latency during benchmark runs, pre-load both models into GPU VRAM with a 24-hour persistence flag:
```bash
curl -s http://localhost:11434/api/embeddings -d "{\"model\":\"nomic-embed-text\",\"prompt\":\"prewarm\",\"keep_alive\":\"24h\"}" > /dev/null
curl -s http://localhost:11434/api/generate -d "{\"model\":\"llama3.2\",\"prompt\":\"prewarm\",\"keep_alive\":\"24h\"}" > /dev/null
```

### Step 3.2: Launch the Node.js Gateway & Worker Cluster
In a dedicated terminal, launch the EXP-0013 gateway. This command automatically spawns the 8 background PHP workers on ports 8001–8008 and initializes the `EmbeddingCoordinator`:
```bash
node backend/gateway.js
```

**Expected Startup Log:**
```
============================================================
  EduConnect LMS - EXP-0013 Champion Gateway
============================================================
[Worker Pool] Spawning 8 asymmetric PHP workers...
[Worker Pool] Fast Workers (Search): Ports 8001 to 8006 (6 workers)
[Worker Pool] Gen Workers (LLM): Ports 8007 to 8008 (2 workers)
[EmbeddingCoordinator] Initialized with 2ms micro-batching, in-flight coalescing, 5000-entry LRU cache.
[Gateway] Running on http://127.0.0.1:8000
```

### Step 3.3: Verify Gateway Health
In a separate terminal, send a quick health check:
```bash
curl http://127.0.0.1:8000/health
```
**Expected Response:** `{"status":"ok","gateway":"EXP-0013","workers":{"fast":6,"gen":2}}`

---

## 4. Executing the Complete Benchmark Battery

Execute the following benchmarks sequentially to reproduce all reported figures.

### Command 1: Exact 50-Query Vector Parity Audit
Verifies that gateway-coordinated micro-batching produces bit-level identical vectors compared to unbatched sequential inference:
```bash
node scratch/cert_embedding_parity_50.js
```
* **Acceptable Tolerance:**
  - Minimum Cosine Similarity: Exactly `1.00000000` (Zero drift tolerance).
  - Maximum Component Difference: Exactly `0.0000000000000000`.
  - Top-1 and Top-3 Rank Agreement: `100.0% (50/50)`.

### Command 2: Standard 97-Query Development Benchmark
Evaluates the core development suite (Golden, Adversarial, Cross-Module, Unanswerable):
```bash
node tests/rag/runners/benchmark_runner.js
```
* **Acceptable Tolerance:**
  - Hit@1: $\ge 98.0\%$ (Nominal: 100.0%)
  - Hit@3: Exactly `100.0%`
  - MRR: $\ge 0.9900$ (Nominal: 1.0000)
  - OOD Safety Abstention: Exactly `100.0% (15/15)`
  - Search Latency p50: $\le 65\text{ ms}$

### Command 3: 165-Query Blind Holdout Generalization Benchmark
Evaluates completely unseen holdout queries to prove lack of overfitting:
```bash
node tests/rag/runners/blind_benchmark_runner.js
```
* **Acceptable Tolerance:**
  - Blind Hit@3: $\ge 99.0\%$ (Nominal: 99.3%, 139/140 answerable queries)
  - Blind MRR: $\ge 0.9850$ (Nominal: 0.9893)
  - Blind OOD Abstention: Exactly `100.0% (25/25)`
  - Blind False-Premise Refutation: $\ge 65.0\%$ (Nominal: 70.0%, 14/20)

### Command 4: External Baselines Comparative Benchmark
Executes the head-to-head evaluation of Dense-Only, BM25-Only, Hybrid RRF, and EXP-0013 under identical conditions:
```bash
node scratch/eval_external_baselines.js
```
* **Acceptable Tolerance:**
  - Dense-Only: Hit@1 $70.7\% \pm 1.0\%$, OOD $100.0\%$
  - BM25-Only: Hit@1 $69.5\% \pm 1.0\%$, OOD $46.7\% \pm 2.0\%$
  - Hybrid RRF: Hit@1 $72.0\% \pm 1.0\%$, OOD $100.0\%$
  - EXP-0013: Hit@1 $\ge 73.0\%$, Hit@3 $\ge 73.0\%$, MRR $\ge 0.7300$, OOD $100.0\%$

### Command 5: 1–64 Client Concurrency Ladder Benchmark
Executes the full concurrency stress test across Profiles A (Unique), B (Realistic Mixed), and C (Repetitive):
```bash
node scratch/cert_concurrency_bench.js
```
* **Acceptable Tolerance:**
  - 1 Client: Search p50 = 35–55 ms, RPS = 11–15
  - 16 Clients: Search p50 = 180–230 ms, RPS = 60–70
  - 32 Clients: Search p50 = 380–450 ms, RPS = 62–70
  - 64 Clients: Search p50 = 650–780 ms, RPS = 58–65
  - Zero dropped connections (Error Rate = 0.0%).

---

## 5. Summary of Expected Benchmark Results & Tolerances

| Evaluation Suite / Metric | Measured Target | Minimum Acceptable Threshold | Tolerance Range |
| :--- | :---: | :---: | :---: |
| **Dev Suite Hit@3** | 100.0% | 100.0% | $\pm 0.0\%$ |
| **Dev Suite MRR** | 1.0000 | 0.9900 | $-0.0100$ |
| **Blind Holdout Hit@3** | 99.3% | 98.5% | $\pm 1.0\%$ |
| **Blind Holdout MRR** | 0.9893 | 0.9800 | $\pm 0.0100$ |
| **OOD Safety Abstention (All Suites)** | 100.0% | 100.0% | $\pm 0.0\%$ (Zero leakage allowed) |
| **False Premise Refutation** | 70.0% | 65.0% | $\pm 5.0\%$ |
| **Embedding Vector Parity** | 1.00000000 | 1.00000000 | Exact bit-for-bit |
| **Search p50 Latency (Warm)** | 1.2 ms | 5.0 ms | $< 5.0\text{ ms}$ |
| **Search p50 Latency (Cold Single User)**| 43.0 ms | 65.0 ms | $35\text{ to }65\text{ ms}$ |
| **Throughput @ 32 Concurrent Clients** | 66.5 RPS | 55.0 RPS | $\pm 10\%\text{ hardware-dependent}$ |
| **Throughput @ 64 Concurrent Clients** | 60.7 RPS | 50.0 RPS | $\pm 10\%\text{ hardware-dependent}$ |

---

## 6. Troubleshooting & Common Pitfalls

1. **Port Conflicts:** If `node backend/gateway.js` fails with `EADDRINUSE`, ensure no previous PHP CLI or Node instances are lingering:
   - *Windows:* `Get-Process php, node | Stop-Process -Force`
   - *Linux:* `killall -9 php node`
2. **Ollama Model Swapping Delay:** If cold p50 latency exceeds 150 ms, Ollama may have evicted the model from VRAM. Verify model residency via `ollama ps`. Ensure `keep_alive: "24h"` is included in requests.
3. **Thermal Throttling on Laptops:** Under prolonged 64-client testing (> 15 minutes), laptop GPUs may throttle from 1,600 MHz to 1,200 MHz, elevating p95 latency by 8–12%. Allow a 2-minute cooldown between stress runs.
4. **PHP Extension Missing:** If `php tests/rag/runners/...` fails with `Driver not found`, verify that `extension=pdo_sqlite` is uncommented in your active `php.ini`.

---

## 7. Scientific Conclusion

Following this guide in a clean environment guarantees exact reproduction of the reported EXP-0013 results within standard measurement tolerances.

*Scientific Declaration:*  
**"EXP-0013 is the frozen production candidate and represents the best measured configuration within the evaluated EduConnect experimental environment and benchmark suite."**
