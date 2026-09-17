# EXP-0039: Reproducibility Manifest & Protocol

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Repository:** `d:\Collage project\EduConnect-LMS-Experimental`  
**Branch:** `exp-0039`  
**Parent Commit:** `e1cf1503851a5ff2fc1b3a86897556943878cf13` (EXP-0038 audit checkpoint)  
**Date:** September 2026  

---

## 1. Environment & Software Dependencies

All software dependencies are pinned to specific versions to ensure byte-for-byte reproducible outputs:

### 1.1 Python Environment (Python 3.12.7 64-bit)
```
torch==2.5.1+cpu
transformers==4.47.0
sentence-transformers==3.3.1
chonkie==1.7.0
chonkie-core==0.10.2
tokie==0.1.4
numpy==2.2.0
scipy==1.14.1
huggingface-hub==0.27.0
```

### 1.2 System & Runtime Dependencies
- **Operating System:** Windows 11 Home 64-bit
- **PHP CLI:** PHP 8.2.12 (CLI, thread-safe, memory_limit = 4G)
- **SQLite:** 3.45.1 (bundled in PHP and Python)
- **Ollama:** v0.3.12 (`llama3.2:latest`, 3.21 GB)

---

## 2. Dataset Cryptographic Checksums

| Dataset File | Sample Size | Expected SHA-256 Checksum | Protocol Role |
|---|---|---|---|
| `EXP-0025-DEVELOPMENT-DATASET.json` | 400 | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` | Development Benchmark & Tuning |
| `EXP-0033-CALIBRATION-DATASET.json` | 100 | `23d9b047683ca54b3d82e1c944eb2ab3d73507d38361664fb68d6f5451ec9815` | Retrieval Verification |
| `EXP-0033-BLIND-DATASET.json` | 500 | `3b4fd6c7a70a8d672808c1b3f94ee9baefbe6a09074b1bda1b4b1a8f6be4e3f3` | **SEALED — DO NOT TOUCH** |

---

## 3. Step-by-Step Reproduction Procedure

### Step 1: Start Background Service Daemons
```bash
# Terminal 1: Start Retrieval Bridge on port 8100
py -3.12 backend/retrieval_bridge.py --port 8100

# Terminal 2: Start Ollama LLM Daemon
ollama serve
```

### Step 2: Ingest Curriculum Knowledge Base with Chonkie
```bash
# Verifies token safety, builds tables C1_ChonkieRecursive, C2_ChonkieSemantic_075, C2_ChonkieSemantic_080, C2_ChonkieSemantic_085
py -3.12 backend/chonkie_chunker.py
```

### Step 3: Run Content Preservation Verification Gate
```bash
# Audits 100.0% word, character, and heading preservation
py -3.12 scratch/verify_exp0039_content_preservation.py
```

### Step 4: Compute Chunk Statistics & Forensics
```bash
# Produces EXP-0039-CHUNK-STATISTICS.json and EXP-0039-CHUNK-INSPECTION.md
py -3.12 scratch/compute_exp0039_chunk_statistics.py
```

### Step 5: Execute Controlled Retrieval Benchmark (N=400)
```bash
# Runs M2 hybrid retrieval (alpha=0.50, pool=15, top_n=5) across all 5 conditions
py -3.12 scratch/run_exp0039_retrieval_benchmark.py
```

### Step 6: Execute Downstream Verifier Benchmark (N=400)
```bash
# Evaluates frozen Candidate A4 verifier across top-5 chunks for all 5 conditions
php scratch/run_exp0039_dev_benchmark.php
```

---

## 4. Key Artifacts Produced

1. `EXP-0039-DESIGN.md`: Theoretical architecture and experimental design.
2. `EXP-0039-HARDWARE-PLAN.md`: Hardware specifications and daemon configurations.
3. `EXP-0039-STATISTICAL-PLAN.md`: Pre-registered hypotheses and non-inferiority criteria.
4. `EXP-0039-CONFIG-DRAFT.json`: Full configuration parameters and hashes.
5. `EXP-0039-CHUNK-STATISTICS.json`: Granular token and boundary distributions.
6. `EXP-0039-CHUNK-INSPECTION.md`: Forensic inspection of chunk boundaries and context fragmentation.
7. `scratch/exp0039_retrieval_metrics.json`: Comparative retrieval benchmark metrics (Recall@1, Recall@5, MRR, nDCG@5, Latency).
8. `EXP-0039-DEVELOPMENT-RESULTS.json`: Full downstream verifier benchmark results (Accuracy, Macro F1, FAR, FRR, subcategories, McNemar tests, LCB non-inferiority).
9. `EXP-0039-ABLATION-MATRIX.md`: End-to-end multi-metric comparative scorecard.
10. `EXP-0039-ERROR-TAXONOMY.md`: Forensic classification of all discordant cases under the 11-category error taxonomy (A-K).
11. `EXP-0039-DEVELOPMENT-ANALYSIS.md`: Comprehensive analytical synthesis and research conclusions.
12. `EXP-0039-INDEPENDENT-AUDIT.md` & `EXP-0039-INDEPENDENT-AUDIT.json`: Independent procedural and scientific audit checkpoint.
