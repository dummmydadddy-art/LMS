# EXP-0033: Reproducibility & Protocol Specification

**Experiment ID:** EXP-0033  
**Title:** Cross-Encoder Score Calibration & Evidence-Gate Adaptation  
**Branch:** `exp-0033`  
**Starting Commit:** `79ef335` (EXP-0032)  
**Parent Lineage Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Date:** 2026-09-16  

---

## 1. Hardware & System Configuration

- **GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM, Compute Capability 8.6)
- **CPU:** 12th Gen Intel(R) Core(TM) i5-12450H (8 physical cores / 12 logical threads)
- **RAM:** 16.0 GB System RAM
- **OS:** Microsoft Windows 11 Home (Build 26100)
- **Python:** 3.12.3 64-bit (`py -3.12`)
- **PHP:** 8.2.12 CLI (with `curl`, `pdo_sqlite`, `mbstring`)
- **Ollama:** Local LLM daemon (`http://127.0.0.1:11434`), model: `llama3.2:latest`

---

## 2. Model & Library Inventory

| Component | Identifier | Location | Device | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Dense Embedding Model** | `BAAI/bge-small-en-v1.5` | Hugging Face / Cache | CPU | 384-dimensional query & document embeddings |
| **Cross-Encoder Model** | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Hugging Face / Cache | CPU | Pre-activation logit scoring of candidate pairs |
| **Sparse Lexical Engine** | Okapi BM25 | Pure PHP / In-memory | CPU | BM25 text retrieval scores |
| **Rank Fusion** | Reciprocal Rank Fusion ($k=60$) | Pure PHP | CPU | Merges dense and sparse ranking lists |
| **LLM Inference Engine** | `llama3.2:latest` | Local Ollama | GPU | Tier-2 generic semantic NLI inference |

---

## 3. Calibration Parameters & Datasets

### 3.1 Development Calibration Dataset
- **File:** `EXP-0033-CALIBRATION-DATASET.json`
- **Sample Size:** 432 query-document candidate pairs (132 relevant, 300 non-relevant)
- **SHA-256:** `9C487E065B5158C6365C92B8B530E13FBB816EDA8DBFC7DB3F20E05248916F60`
- **Source:** 150 cases sampled from `EXP-0025-DEVELOPMENT-DATASET.json` (zero blind test leakage)

### 3.2 Fitted Calibration Parameters
- **C1 (Min-Max):** $x_{\min} = -11.4976, \quad x_{\max} = 8.5013$
  $$p_{C1}(x) = \text{clip}\left(\frac{x - (-11.4976)}{8.5013 - (-11.4976)}, 0, 1\right)$$
- **C2 (Standard Sigmoid):** Direct logistic function
  $$p_{C2}(x) = \frac{1}{1 + e^{-x}}$$
- **C3 (Temperature Scaling):** $T = 2.6559$ (fitted via L-BFGS-B, NLL = 0.1920)
  $$p_{C3}(x) = \frac{1}{1 + e^{-x / 2.6559}}$$
- **C4 (Platt Scaling):** $a = 0.6236, \quad b = 3.2801$ (fitted via L-BFGS-B, NLL = 0.1180, Brier = 0.0283, ECE = 0.0107)
  $$p_{C4}(x) = \frac{1}{1 + e^{-(0.6236 \cdot x + 3.2801)}}$$

### 3.3 Adapted Evidence Gate Threshold
- **Evaluated Range:** $\{0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45\}$
- **Frozen Threshold for Mode E6:** $\theta = 0.35$ (selected on development set; provides $0.52$ logit safety margin against distractors with zero additional false abstentions).
- **Frozen Baseline for Modes E0–E5:** $\theta = 0.28$.

### 3.4 Primary Blind Evaluation Dataset
- **File:** `EXP-0033-BLIND-DATASET.json`
- **Sample Size:** Exactly 500 cases
- **SHA-256:** `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`
- **Overlap:** Exactly 0 collisions against all 3,600 prior queries across historical blind and development benchmarks.

---

## 4. Exact Reproduction Commands

### Step 1: Start Retrieval Bridge Daemon
```powershell
py -3.12 backend/retrieval_bridge.py --port 8100
```

### Step 2: Verify Ollama & Bridge Endpoints
```powershell
curl -s http://127.0.0.1:8100/health
curl -s http://127.0.0.1:11434/api/tags
```

### Step 3: Run Calibration Fitting
```powershell
py -3.12 fit_calibration.py
```

### Step 4: Run Evidence Gate Sweep Study
```powershell
py -3.12 -c "import evaluate_gate_sweep; evaluate_gate_sweep.run()"
```

### Step 5: Execute Complete Blind Benchmark
```powershell
php scratch/run_exp0033_benchmark.php
```

---

## 5. Artifact Audit Verification

All generated evaluation outputs can be independently verified by computing SHA-256 sums and checking exact matches with `EXP-0033-MANIFEST.json`.
