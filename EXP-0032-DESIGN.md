# EXP-0032: Hardware-Constrained Open-Source RAG Benchmark — Experimental Design

**Experiment ID:** EXP-0032  
**Starting Baseline:** EXP-0031 E4 (commit `01d6220`)  
**Branch:** `exp-0032`  
**Status:** Reconnaissance & Architectural Design (Phase 1)  
**Hardware Environment:**  
- **GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)  
- **VRAM Observed:** 4096 MiB total (~1642 MiB free baseline)  
- **CPU:** Intel Core i5-12450H  
- **Host RAM:** 16 GB DDR4/DDR5  
- **OS:** Windows (PowerShell shell environment)  

---

## 1. Executive Summary & Objective

In prior experiments (EXP-0025 through EXP-0031), the project focused on the **verification tier**: developing a hybrid deterministic and zero-shot NLI verifier (`backend/rag_premise_verifier.php`) that reduced False Acceptance Rate (FAR) from 39.44% down to 21.60%. Throughout those verifier iterations, the underlying retrieval pipeline remained static: a 768-dimensional `nomic-embed-text` bi-encoder served via Ollama combined with an in-memory Okapi BM25 lexical scorer and Reciprocal Rank Fusion (RRF, $k=60$).

**EXP-0032 marks the start of a systematic retrieval benchmark** to evaluate mature, open-source retrieval components from Hugging Face and the open-source NLP ecosystem to upgrade the retrieval stage itself.

### Key Hypothesis
Modern lightweight bi-encoders (e.g., `BAAI/bge-small-en-v1.5`, 33.4M parameters, 384d) and ultra-compact cross-encoders (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`, 22.7M parameters) will:
1. Improve retrieval precision and context relevance over the generic 768d `nomic-embed-text` baseline.
2. Reduce retrieval footprint from 768d to 384d (a 50% reduction in vector size, memory consumption, and dot-product compute).
3. Directly enhance downstream premise verification accuracy and refutation recall without requiring any modifications to the verifier logic itself.

---

## 2. Scientific & Operational Constraints

### 2.1 Frozen Verifier Constraint
> [!IMPORTANT]
> The verifier (`backend/rag_premise_verifier.php`) in configuration **EXP-0031 E4** is **strictly frozen**.
>
> Prohibited modifications:
> - NO changes to Tier-1 deterministic fast path or dictionary lookup.
> - NO changes to Tier-1 structural validation gates (polarity, scope, sibling alignment).
> - NO changes to Tier-2 NLI prompt or Ollama zero-shot inference pipeline.
> - NO changes to Pass-2 asymmetric decision thresholds (0.70 entailment / 0.75 contradiction).
> - NO changes to ambiguity gates, curriculum relevance pre-filters, or evidence adequacy gates.
> - NO modifications to EXP-0031 blind datasets, challenge datasets, or archived results.

The sole experimental variable in EXP-0032 is **Retrieval Quality ($R_k$)**. Downstream verification performance will serve as a frozen evaluator measuring real end-to-end task utility.

### 2.2 Strict Hardware Ceiling
All proposed architectures and candidate models must operate reliably within:
```text
GPU: NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)
System RAM: 16 GB
CPU: Intel Core i5-12450H (8 cores / 12 threads)
```
- Total VRAM allocated across active models (embedding + reranker + generative LLM if co-located) must never exceed 3.5 GB to prevent CUDA out-of-memory (OOM) or thrashing.
- Local/offline execution is mandatory; zero external cloud API dependencies.
- Models must execute with sub-second retrieval latency on the local hardware.

### 2.3 Storage Constraint
- SQLite database (`backend/storage/vectors.sqlite` / `database/rag_materials.sqlite3`) remains the vector and document repository for this benchmark.
- Vector database migration (e.g., Qdrant, FAISS, Milvus) is deferred until after retrieval quality benefits are empirically quantified.

---

## 3. Retrieval Modes Matrix (R0 – R5)

EXP-0032 defines six structured retrieval configurations to decouple the performance contributions of embedding model replacement vs. cross-encoder reranking.

| Mode | Dense Embedding | Lexical Retriever | Fusion Mechanism | Cross-Encoder Reranker | Primary Evaluation Goal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R0** | `nomic-embed-text` (768d, Ollama) | Okapi BM25 ($k_1=1.2, b=0.75$) | RRF ($k=60$, dynamic weighting) | None (MMR diversity only) | Frozen baseline for comparison |
| **R1** | `BAAI/bge-small-en-v1.5` (384d) | Okapi BM25 ($k_1=1.2, b=0.75$) | RRF ($k=60$, dynamic weighting) | None | Dense replacement impact (BGE) |
| **R2** | `intfloat/e5-small-v2` (384d) | Okapi BM25 ($k_1=1.2, b=0.75$) | RRF ($k=60$, dynamic weighting) | None | Dense replacement impact (E5) |
| **R3** | `nomic-embed-text` (768d, Ollama) | Okapi BM25 ($k_1=1.2, b=0.75$) | RRF ($k=60$, dynamic weighting) | `ms-marco-MiniLM-L-6-v2` | Reranker impact on baseline |
| **R4** | `BAAI/bge-small-en-v1.5` (384d) | Okapi BM25 ($k_1=1.2, b=0.75$) | RRF ($k=60$, dynamic weighting) | `ms-marco-MiniLM-L-6-v2` | Combined lightweight SOTA |
| **R5** | Winner of R1/R2 + Reranker | Tuned BM25 / RRF | Optimized Fusion / Top-$k$ | Winner of MiniLM / BGE-Reranker | Champion candidate deployment |

---

## 4. Candidate Model Profiles & Trade-Off Analysis

### 4.1 Dense Bi-Encoders

#### Candidate A: `BAAI/bge-small-en-v1.5`
- **Parameters:** 33.4M (BERT architecture, 12 layers, 384 hidden dimension)
- **Disk Size:** ~127 MB safetensors
- **VRAM (BS=1):** ~450 MB (FP16/FP32 PyTorch context)
- **Strengths:** 
  - MTEB Retrieval benchmark NDCG@10 score of **51.68** (substantially higher than older MiniLM/BERT embeddings).
  - Compact 384-dimensional representation cuts RAM and dot-product operations in half compared to 768d `nomic-embed-text`.
  - Permissive MIT license.
  - Native support in `sentence-transformers` 5.5.1 already installed in the environment.
- **Caveats:** Input text truncated to 512 tokens (ample for the 650-character curriculum chunks).

#### Candidate B: `intfloat/e5-small-v2`
- **Parameters:** 33.4M (BERT architecture, 12 layers, 384 hidden dimension)
- **Disk Size:** ~127 MB safetensors
- **VRAM (BS=1):** ~450 MB
- **Strengths:**
  - Highly robust MTEB score (**49.04** NDCG@10).
  - Clean pre-quantized INT8 ONNX binaries available (~32 MB).
- **Caveats:** Strict requirement for asymmetric task prefixes (`query: ` vs. `passage: `), increasing pipeline orchestration complexity.

### 4.2 Cross-Encoder Rerankers

#### Candidate C: `cross-encoder/ms-marco-MiniLM-L-6-v2` (Primary Reranker)
- **Parameters:** 22.7M (Distilled 6-layer MiniLM, 384 hidden dimension)
- **Disk Size:** ~87 MB safetensors (22 MB INT8)
- **VRAM (BS=1):** ~350–400 MB
- **Strengths:**
  - MS MARCO MRR@10 of **39.01** and BEIR NDCG@10 of **74.3**.
  - Extremely fast CPU execution (~2–5 ms per query-candidate pair).
  - Reranking top-10 candidates takes under 40 ms total on the i5-12450H CPU without consuming GPU VRAM.
  - Apache 2.0 license.

#### Candidate D: `BAAI/bge-reranker-base` (Quality Challenger)
- **Parameters:** 278M (XLM-RoBERTa architecture, 12 layers, 768 hidden dimension)
- **Disk Size:** ~1.06 GB
- **VRAM (BS=1):** ~1.05 GB in FP16
- **Strengths:** SOTA ranking quality across complex multi-hop queries (BEIR NDCG@10: ~56.8).
- **Caveats:** Larger memory footprint. If loaded alongside Ollama `llama3.2` (2.0 GB), total VRAM reaches ~3.5–3.9 GB, leaving minimal headroom on the 4 GB GPU. Best suited for high-accuracy evaluation or CPU execution via INT8 ONNX.

---

## 5. Evaluation Methodology & Metrics

The benchmark will evaluate retrieval quality across three distinct levels:

### Level 1: Pure Retrieval Metrics (Top-$k$ Evaluation)
For test queries with known gold curriculum chunks:
- **Recall@k ($k=1, 3, 5$):** Fraction of relevant chunks retrieved in top-$k$.
- **Precision@k ($k=1, 3, 5$):** Fraction of top-$k$ retrieved chunks that are relevant.
- **MRR (Mean Reciprocal Rank):** Average reciprocal rank of the first relevant chunk.
- **NDCG@k:** Normalized Discounted Cumulative Gain accounting for position.

### Level 2: Downstream Verification Task Utility (Frozen E4 Verifier)
Evaluated over the standardized EXP-0031 blind dataset ($N=500$):
- **Verifier Accuracy:** Percentage of correct verifications (SUPPORTED / REFUTED / NOT_ESTABLISHED).
- **False Acceptance Rate (FAR):** Target $\le 21.60\%$ (baseline EXP-0031 E4 level).
- **Refutation Recall:** Target $\ge 45.68\%$ (must recover the recall lost in EXP-0031 by retrieving better premise-contradicting evidence).
- **Macro F1 Score.**

### Level 3: Computational & Operational Efficiency
- **P50 and P95 Retrieval Latency (ms):** End-to-end time from query string to ranked context chunks.
- **Peak VRAM Consumption (MB):** Measured via `nvidia-smi` during batch retrieval.
- **Peak Host RAM Consumption (MB):** Process resident set size.

---

## 6. Phased Implementation Roadmap

```
[Phase 1: Reconnaissance & Design] (CURRENT)
  ├── Environment audit (GPU, CPU, RAM, Python, PyTorch)
  ├── Current retrieval pipeline audit (rag_service.php)
  ├── Candidate model evaluation & sizing
  └── Design specifications published
         │
[Phase 2: Adapter & Interface Architecture]
  ├── Python retrieval micro-service / bridge (FastAPI / local CLI script)
  ├── Embedding table migration schema for 384d vectors
  └── Corpus re-indexing scripts for candidate models
         │
[Phase 3: Controlled Benchmark Harness]
  ├── Evaluation dataset formatting & query-passage ground truth mapping
  ├── Automated execution harness for modes R0–R4
  └── Retrieval metric calculation (Recall@k, MRR, Latency)
         │
[Phase 4: Downstream Verification & Statistical Analysis]
  ├── Frozen EXP-0031 E4 verifier run over R0–R4 retrieved contexts
  ├── McNemar statistical significance testing
  ├── Error forensic analysis (false refutations vs. false acceptances)
  └── EXP-0032 Final Research Report & Synthesis
```

---

## 7. Success Criteria & Decision Thresholds

1. **Safety/Invariant Gate:** R1–R4 must produce valid formatted context arrays that conform 100% to the verifier input contract (`content`, `title`, `similarity`, `metadata`).
2. **Hardware Stability:** Zero CUDA OOM errors; peak VRAM must remain $\le 3.5\text{ GB}$ throughout all tests.
3. **Retrieval Superiority:** The champion configuration (e.g., R4) must demonstrate:
   - $\ge +5.0\text{ pp}$ improvement in Recall@3 over R0.
   - Reduction or parity in retrieval latency compared to R0.
   - Statistically significant improvement in downstream verifier accuracy ($p < 0.05$ via McNemar test) OR significant recovery of refutation recall ($\ge +5.0\text{ pp}$) with FAR remaining $\le 22.0\%$.
