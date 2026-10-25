# EXP-0036: Reproducibility Guide & Verification Manifest

**Experiment:** EXP-0036 Structured Tier-2 NLI Verification  
**Commit Target:** `exp-0036`  
**Parent Commit:** `2bcccca`  
**Status:** COMPLETE & AUDITABLE  
**Date:** 2026-09-16  

---

## 1. Environment & Hardware Specifications

* **Operating System:** Windows 11 Home (x86_64)
* **Processor:** 12th Gen Intel Core i5-12450H (8 cores / 12 threads)
* **System RAM:** 16.0 GB physical memory
* **GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (4.0 GB dedicated VRAM)
* **PHP Runtime:** PHP 8.2.12 (cli) with cURL, JSON, and SQLite3 extensions
* **Python Runtime:** Python 3.12.10 (AMD64)
* **Local LLM Engine:** Ollama version 0.34.0 (running `llama3.2:latest`, 3B parameters)
* **Retrieval Daemon:** `backend/retrieval_bridge.py` on `http://127.0.0.1:8100` (CPU inference for BGE-small & MiniLM)

---

## 2. Cryptographic Checksums & Artifact Hashes

| Target File | Expected Size (Bytes) | SHA-256 Checksum |
|---|---|---|
| `EXP-0025-DEVELOPMENT-DATASET.json` | 79,861 | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| `EXP-0033-BLIND-DATASET.json` | 118,526 | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| `database/curriculum_corpus.sqlite` | 2,838,528 | `7dd32951cd70cea34d4d69484a3f594757702d1373377aee2bb91d57c6d866e1` |
| `scratch/exp0034_dev_cache.json` | 7,278,669 | `991e8c126ab657d15ca6bcb57e024eee47439aca02e6e4bfe4b220b5a6325c18` |
| Prompt P4 (`EXP-0036-NLI-PROMPTS.md`) | - | `4f715d6195b135c2aca9290d2bc9203adefb33daaeccafdc97d952784a2f9112` |

---

## 3. Step-by-Step Reproduction Procedure

### Step 1: Confirm Background Daemons
```powershell
# Verify bridge status (port 8100)
curl http://127.0.0.1:8100/health

# Verify Ollama status (port 11434)
curl http://127.0.0.1:11434/api/version
```

### Step 2: Run Development Evaluation
```powershell
php scratch/exp0036_dev_benchmark.php
```

### Step 3: Verify Output Integrity
Compare generated metrics in `EXP-0036-DEVELOPMENT-RESULTS.json` against the certified table.
