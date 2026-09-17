# EXP-0038: Reproducibility Manifest & Verification Protocol

**Experiment:** EXP-0038 (Structure-Aware Evidence Chunking with Docling HybridChunker)  
**Parent Lineage:** `4372d43` (EXP-0037 Completed Blind-Evaluation Commit)  
**Active Branch:** `exp-0038`  
**Date:** 2026-09-17  
**Status:** FROZEN DEVELOPMENT BASELINE  

---

## 1. System & Environment Specifications

### Software & Runtimes
| Component | Specification / Version | Integrity / Verification Method |
|---|---|---|
| **OS** | Windows 11 Home (x86_64, Build 26100) | `cmd /c ver` |
| **PHP** | 8.2.12 (cli) (Zend: 4.2.12) | `php -v` |
| **Python** | 3.12.7 (tags/v3.12.7:0b05ead) | `py -3.12 --version` |
| **PyTorch** | 2.5.1+cpu | `py -3.12 -c "import torch; print(torch.__version__)"` |
| **Transformers** | 4.47.0 | `py -3.12 -c "import transformers; print(transformers.__version__)"` |
| **Sentence-Transformers** | 3.3.1 | `py -3.12 -c "import sentence_transformers; print(sentence_transformers.__version__)"` |
| **Docling-Core** | 2.97.0 (with chunking extra) | `py -3.12 -c "import docling_core; print(docling_core.__version__)"` |
| **Semchunk** | 3.2.5 | `py -3.12 -c "import semchunk; print(semchunk.__version__)"` |
| **Ollama** | 0.34.1 (`llama3.2:latest`, 2.0 GB) | `curl http://127.0.0.1:11434/api/version` |
| **SQLite3** | 3.45.1 | `database/rag_materials.sqlite3` |

### Models & Weights
| Model Role | Identifier / HuggingFace ID | Dimensions / Parameters | Execution Device |
|---|---|---|---|
| **Dense Bi-Encoder** | `BAAI/bge-small-en-v1.5` | 384-dim, 33M params | CPU (Torch float32) |
| **Cross-Encoder Reranker**| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 22.7M params | CPU (Torch float32) |
| **Tokenizer** | `BertTokenizer` (`BAAI/bge-small-en-v1.5`) | `max_tokens = 512` | CPU |
| **Semantic Verifier** | `llama3.2:latest` | 3.21B params (4-bit Q4_K_M) | GPU (CUDA, RTX 3050 Laptop) |

---

## 2. Dataset Cryptographic Fingerprints

| Dataset Role | File Path | Records ($N$) | Expected SHA-256 Hash |
|---|---|:---:|---|
| **Development Benchmark** | `EXP-0025-DEVELOPMENT-DATASET.json` | 400 | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| **Calibration Dataset** | `EXP-0033-CALIBRATION-DATASET.json` | 150 | `1543884be5ae43714b6791696dfc17f7d1ef518eb3d9c72fc9a1e3b6e8386341` |
| **Blind Dataset (PROTECTED)**| `EXP-0033-BLIND-DATASET.json` | 500 | `3b4fd6c72e2cf59196b0ee1b65e940f58caab4ea6c9d2f21ea8dc7537b0ddb05` |

> [!CAUTION]
> The blind dataset `EXP-0033-BLIND-DATASET.json` has NOT been opened, parsed, or executed. Its hash was verified solely via external hash computation.

---

## 3. End-to-End Reproduction Workflow

To replicate the EXP-0038 results from scratch:

```bash
# 1. Verify Git lineage
git checkout exp-0038
git log -n 1 --oneline
# Expected: 4372d43 (EXP-0037 blind evaluation commit)

# 2. Verify dependencies
py -3.12 -c "import docling_core, semchunk, transformers, torch; print('Dependencies OK')"

# 3. Ingest curriculum documents and generate C1 chunks
py -3.12 backend/docling_chunker.py

# 4. Verify 100.0% content preservation gate
py -3.12 scratch/verify_exp0038_content_preservation.py

# 5. Compute chunk statistics and inspect boundaries
py -3.12 scratch/compute_chunk_statistics.py

# 6. Populate isolated C1 table in database
py -3.12 scratch/populate_c1_chunks.py

# 7. Start Retrieval Bridge (port 8100) and Ollama daemon (port 11434)
# In background terminals:
py -3.12 backend/retrieval_bridge.py --port 8100
ollama serve

# 8. Run Retrieval Benchmark over 400 dev cases for C0 and C1
py -3.12 scratch/run_exp0038_retrieval_benchmark.py

# 9. Run Downstream A4 Premise Verifier Benchmark on C0 and C1
php scratch/run_exp0038_dev_benchmark.php
```

---

## 4. Key Artifact Outputs & Hashes

| Artifact Description | File Path |
|---|---|
| **Chunk Statistics JSON** | `EXP-0038-CHUNK-STATISTICS.json` |
| **Chunk Inspection Document** | `EXP-0038-CHUNK-INSPECTION.md` |
| **Preservation Report** | `scratch/exp0038_preservation_report.json` |
| **Retrieval Comparison Metrics**| `scratch/exp0038_retrieval_metrics.json` |
| **C0 Retrieval Cache (N=400)** | `scratch/exp0038_dev_c0_cache.json` |
| **C1 Retrieval Cache (N=400)** | `scratch/exp0038_dev_c1_cache.json` |
| **Development Results JSON** | `EXP-0038-DEVELOPMENT-RESULTS.json` |
| **Development Predictions JSON**| `scratch/exp0038_dev_predictions.json` |
| **Error Taxonomy & Analysis** | `EXP-0038-ERROR-TAXONOMY.md` |
| **Development Analysis Report** | `EXP-0038-DEVELOPMENT-ANALYSIS.md` |
