# EXP-0035: Reproducibility Protocol & Environment Specifications

**Experiment:** EXP-0035 (Dynamic Intent-Aware Relevance Gating & Compound-Clause NLI Decomposition)  
**Parent Lineage:** EXP-0034 Champion M2 (`b2fb2f2`, Audit `5726c2b`)  
**Branch:** `exp-0035`  
**Date:** 2026-09-16  
**Status:** FROZEN PROTOCOL  

---

## 1. System Requirements & Hardware Profile

| Subsystem | Requirement / Specification | Verified Operational Value |
|---|---|---|
| **CPU** | Intel Core i5-12450H (8 Cores, 12 Threads) | Intel Core i5-12450H |
| **System Memory (RAM)** | 16 GB DDR4 (Minimum 12 GB available) | 15.68 GB addressable (13.26 GB utilized) |
| **GPU Device** | NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM) | RTX 3050 Laptop GPU (4 GB GDDR6) |
| **Operating System** | Windows 11 Home (x64) | Windows 11 Build 22631 |
| **PHP Runtime** | PHP 8.2+ with `curl`, `json`, `sqlite3`, `mbstring` | PHP 8.2.12 (CLI) |
| **Python Runtime** | Python 3.12+ (64-bit) | Python 3.12.3 |
| **PyTorch Device** | CPU multi-threaded (PyTorch 2.4+) | CPU (CUDA 0 MB allocated) |
| **Ollama Service** | Local Ollama HTTP daemon on port 11434 | `llama3.2:latest` (Q4_K_M, 2.02 GB) |

---

## 2. Frozen Repository Dependencies & Model Checksums

* **Dense Embedding Model:** `BAAI/bge-small-en-v1.5` (Embedding Dimension: 384, Max Tokens: 512)
* **Cross-Encoder Reranker:** `cross-encoder/ms-marco-MiniLM-L-6-v2` (Max Tokens: 512)
* **NLI Reasoner Model:** `llama3.2:latest` via local Ollama daemon
  - Format: GGUF
  - Digest: `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`
  - Parameters: 3.2B, Quantization: `Q4_K_M`
* **Development Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)
  - SHA-256: `a937a7183e9bbf04e12e1765c9298e3b5ca9b50bdf60ff72e5058ec06917e85c`
* **Blind Dataset (FROZEN — UNTOUCHED):** `EXP-0033-BLIND-DATASET.json` ($N = 500$)
  - SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`

---

## 3. End-to-End Reproduction Steps

### Step 1: Start the Open-Source Retrieval Bridge
In an independent terminal, start the Python retrieval daemon:
```powershell
py -3.12 backend/retrieval_bridge.py --port 8100
```
Verify health:
```powershell
curl.exe -s http://127.0.0.1:8100/health
# Expected: {"status": "ok", "embedding_loaded": true, "reranker_loaded": true, "device": "cpu"}
```

### Step 2: Verify Ollama Service
Ensure Ollama is serving `llama3.2:latest`:
```powershell
curl.exe -s http://127.0.0.1:11434/api/tags
# Verify that llama3.2:latest appears in the models list
```

### Step 3: Run Development Benchmark & Ablation
Execute the comprehensive development ablation harness across all 400 development cases:
```powershell
php scratch/exp0035_dev_benchmark.php
```

### Step 4: Verify Output Results
Confirm generation of `scratch/exp0035_dev_results.json` and validate reported accuracy and F1 metrics:
```powershell
php -r "
$res = json_decode(file_get_contents('scratch/exp0035_dev_results.json'), true);
echo 'G0 Acc: ' . $res['G0']['accuracy'] . '%\n';
echo 'G3 Acc: ' . $res['G3']['accuracy'] . '%\n';
echo 'G5 Acc: ' . $res['G5']['accuracy'] . '%\n';
echo 'G6 Acc: ' . $res['G6']['accuracy'] . '%\n';
"
```
