# Runtime Capability Matrix

**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Hardware Environment:** Intel Core i7 / 16 GB System RAM / NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM ceiling)  
**Host OS:** Windows 11  
**Python Environment:** Python 3.12 (`py -3.12`)

---

## Component Capability Matrix

| Component | Repository | Version | Commit/Revision | Model | Model Revision | Runtime | Status | CPU | GPU | Peak Memory | Latency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EXP-0040 Baseline** | In-house | 5.3.0 | `63d961ee` | BGE-small / MiniLM-L-6-v2 | `main` | PyTorch / Transformers | **READY** | Yes | Yes (auto) | ~350 MB | ~45 ms | Adopted frozen baseline control; byte-for-byte reference anchor. |
| **BGE-M3** | `FlagOpen/FlagEmbedding` | 1.4.2 | `upstream` | `BAAI/bge-m3` | `main` | PyTorch / Transformers | **READY** | Yes | Yes (auto) | ~2.2 GB | ~180 ms | Dense (1024d), sparse, and multi-vector modes supported. |
| **Qdrant** | `qdrant/qdrant` | 1.19.1 | `upstream` | BGE-small embeddings | `main` | In-memory / local disk | **READY** | Yes | N/A | ~120 MB | ~15 ms | Embedded engine with RRF hybrid search. |
| **PyLate** | `lightonai/pylate` | 1.6.0 | `upstream` | `GTE-ModernColBERT-v1` | `main` | PyTorch / Transformers | **READY** | Yes | Yes | ~1.8 GB | ~210 ms | Token-level late interaction MaxSim scoring. Zero simulations. |
| **RAGLite** | `raglite/raglite-dev` | Not Installed | N/A | BGE-small | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | Missing pip package `raglite`. No simulations permitted. |
| **PageIndex Structural** | `VectifyAI/PageIndex` | 0.2.18 | `upstream` | Deterministic PDF Tree | N/A | Python / PyMuPDF | **READY** | Yes | No | ~45 MB | ~8 ms | Purely local structural outline navigation. |
| **PageIndex Agentic** | `VectifyAI/PageIndex` | 0.2.18 | `a573361b` | `llama3.2:latest` | `a573361b` | PageIndex + Ollama REST | **READY** | Yes | Yes | ~150 MB (host) | ~1850 ms/turn | Multi-turn tool-mediated agentic search (EXP-0057). |
| **ColSmol** | `vidore-benchmark/colpali` | Not Installed | N/A | `vidore/colsmol-256m` | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | Missing pip package `colpali-engine`. No simulations permitted. |
| **Neo4j GraphRAG** | `neo4j/neo4j-graphrag` | Not Installed | N/A | None (Graph + LLM) | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | Missing pip package `neo4j` and local Neo4j database instance. |
| **CRAG** | `HuskyInSalt/CRAG` | In-house | `upstream` | Confidence Heuristics | N/A | Python | **READY** | Yes | No | ~60 MB | ~12 ms | Closed-corpus offline corrective retrieval (zero web search). |
| **LLMLingua** | `microsoft/LLMLingua` | 0.2.2 | `upstream` | `llmlingua-2-bert-base` | `main` | PyTorch / Transformers | **READY_WITH_LIMITATIONS** | Yes | Optional | ~450 MB | ~85 ms | Package installed; requires downloading model weights. `mode=disabled` is READY. |
| **Python Docling** | `DS4SD/docling` | 2.128.0 | `upstream` | `NativePdfPipeline` | N/A | Python / docling-core | **READY** | Yes | No | ~95 MB | ~240 ms/page | Real streaming page-window parsing with high-frequency RSS monitor. |
| **Docling Rust** | `docling-project/docling.rs` | Not Built | N/A | None | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | Native Rust CLI binary not compiled/installed (MSVC cargo required). |
| **Marker** | `datalab-to/marker` | 2.0.0 | `upstream` | Marker OCR/Layout | N/A | PyTorch / Transformers | **READY_WITH_LIMITATIONS** | Yes | Optional | N/A | N/A | Package installed; requires downloading model weights. |
| **Surya** | `VikParuchuri/surya` | 0.22.1 | `upstream` | Surya SegFormer/Rec | N/A | PyTorch / Transformers | **READY_WITH_LIMITATIONS** | Yes | Optional | N/A | N/A | Package installed; requires downloading model weights. |
| **Ollama** | `ollama/ollama` | 0.34.2 | `service` | `llama3.2:latest` | `local` | Ollama local daemon | **READY** | Yes | Yes | ~2.1 GB VRAM | ~32 ms/tok | Active local service on port 11434. |
| **llama.cpp** | `ggml-org/llama.cpp` | Not Installed | N/A | `llama3.2_q4.gguf` | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | Neither llama-cpp-python nor llama-cli binary found in PATH. |
| **Gemma 3n** | `google/gemma-3n-E2B-it` | 5.3.0 | N/A | `gemma-3n-E2B-it` | N/A | Transformers | **NOT_READY** | Yes | Yes | N/A | N/A | Gated model requires Hugging Face license acceptance and local cache. |
| **BitNet** | `microsoft/BitNet` | Not Installed | N/A | `BitNet-b1.58-large` | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | bitnet.cpp binary and bitnet package not installed. |
| **Fusion Layer** | In-house | 1.0.0 | `integration` | None (Mathematical) | N/A | Python | **READY** | Yes | No | ~15 MB | ~1.2 ms | Framework-independent RRF, weighted fusion, and normalization. |

---

## Status Classification Summary

* **READY (10 components):**
  - EXP-0040 Baseline
  - BGE-M3 (FlagEmbedding)
  - Qdrant Hybrid
  - PyLate ColBERT
  - PageIndex Structural Navigator
  - PageIndex Native Agentic Retriever
  - CRAG Closed-Corpus
  - Python Docling
  - Ollama Local Service
  - Fusion Layer
* **READY_WITH_LIMITATIONS (3 components):**
  - LLMLingua (package installed; requires model weights download; `mode=disabled` is fully functional)
  - Marker (package installed; requires model weights download)
  - Surya (package installed; requires model weights download)
* **NOT_READY (7 components):**
  - RAGLite (package not installed)
  - ColSmol (package not installed)
  - Neo4j GraphRAG (package not installed / server unreachable)
  - Docling Rust (native Rust binary not compiled)
  - llama.cpp (binary / python package not installed)
  - Gemma 3n (gated model not cached locally)
  - BitNet (binary / package not installed)
* **SIMULATIONS:** 0 (Strictly zero simulations across all components).
