# EXP-0034: Reproducibility Protocol & Environment Specification

**Experiment ID:** EXP-0034  
**Date:** 2026-09-16  
**Repository:** `EduConnect-LMS-Experimental`  
**Git Branch:** `exp-0034`  
**Author:** Lead Experimental Engineer  

---

## 1. System Requirements & Hardware Baseline

- **CPU:** 12th Gen Intel Core i5-12450H (8 cores, 16 threads, $\ge 2.0$ GHz)
- **Host RAM:** 16 GB DDR4/DDR5
- **GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM) — *Inference executes on CPU; GPU remains unburdened*
- **Operating System:** Windows 11 64-bit
- **PHP:** PHP 8.3.32 (ZTS x64) with extensions: `pdo_sqlite`, `curl`, `json`, `mbstring`
- **Python:** Python 3.12.10 with packages: `torch`, `sentence-transformers`, `numpy`, `scipy`, `psutil`
- **Ollama:** Ollama v0.3+ hosting `llama3.2:latest` on `http://127.0.0.1:11434`

---

## 2. Infrastructure Setup & Services

### Step 1: Start Ollama LLM Daemon
Verify Ollama is running and has the frozen verifier model loaded:
```powershell
ollama run llama3.2:latest "Hello"
# Ensure endpoint responds at http://127.0.0.1:11434/api/generate
```

### Step 2: Start Local Python Retrieval Bridge
The retrieval bridge loads `BAAI/bge-small-en-v1.5` and `cross-encoder/ms-marco-MiniLM-L-6-v2`:
```powershell
py -3.12 backend/retrieval_bridge.py --port 8100
```
Verify health:
```powershell
curl http://127.0.0.1:8100/health
# Expected output: {"status": "ok", "embedding_loaded": true, "reranker_loaded": true, ...}
```

---

## 3. Reproduction Workflow

### Step 1: Verify Baseline & Checksum Integrity
Verify that frozen datasets and verifier files match authoritative hashes:
```powershell
py -3.12 -c "
import hashlib
assert hashlib.sha256(open('EXP-0033-BLIND-DATASET.json', 'rb').read()).hexdigest() == '3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08'
assert hashlib.sha256(open('backend/rag_premise_verifier.php', 'rb').read()).hexdigest() == '68d1a8f4661e7e770eab613c75b75e047ff1b7d994ba3dd5865e0c09ffbea860'
print('Checksums verified successfully.')
"
```

### Step 2: Re-run Development Ablation Grid Search
Executes the candidate-pool and $\alpha$ grid search across $N = 400$ development cases:
```powershell
php scratch/exp0034_dev_ablation.php
# Outputs EXP-0034-DEVELOPMENT-RESULTS.json
```

### Step 3: Re-run Primary Blind Benchmark
Executes the evaluation of Modes M0, M1, M2, and M3 across $N = 500$ blind test cases:
```powershell
php scratch/run_exp0034_benchmark.php
# Outputs EXP-0034-RESULTS.json and scratch/exp0034_predictions.json
```

---

## 4. Verification of Output Artifacts

To verify that re-run outputs match reported headline numbers:
```powershell
py -3.12 -c "
import json
with open('EXP-0034-RESULTS.json') as f:
    res = json.load(f)
m0 = res['downstream_metrics']['M0']
m2 = res['downstream_metrics']['M2']
assert m0['accuracy'] == 69.60, f'M0 accuracy mismatch: {m0[\"accuracy\"]}'
assert m2['accuracy'] == 66.60, f'M2 accuracy mismatch: {m2[\"accuracy\"]}'
assert m2['far'] == 28.64, f'M2 FAR mismatch: {m2[\"far\"]}'
assert m2['false_abstentions_count'] == 31, f'M2 False Abstentions mismatch: {m2[\"false_abstentions_count\"]}'
print('All reproduced numbers match authoritative report 100%.')
"
```
