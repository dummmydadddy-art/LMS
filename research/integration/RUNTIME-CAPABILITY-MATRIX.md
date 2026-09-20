# Runtime Capability Matrix

**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Hardware Environment:** Intel Core i7 / 16 GB System RAM / NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM ceiling)  
**Host OS:** Windows 11  
**Python Environment:** Python 3.12 (`py -3.12`)

---

## Component Capability Matrix

| Component | Repository | Exact Version | Commit/Revision | Model | Model Revision | Runtime | Status | CPU | GPU | Peak RAM | Peak VRAM | Latency | Dataset | Notes | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BGE-M3** | `FlagOpen/FlagEmbedding` | 1.4.2 | `upstream` | `BAAI/bge-m3` | `main` | PyTorch / Transformers | **READY** | Yes | Yes (auto) | ~2.2 GB | ~1.5 GB | ~180 ms | C2_085 dev | Real dense (1024d), sparse, and ColBERT late interaction verified. | GPU VRAM safety limits batch size to 4 on 4GB VRAM. |
| **Qdrant** | `qdrant/qdrant` | 1.19.1 | `upstream` | BGE-M3 / BGE-small | `main` | In-memory / local disk | **READY** | Yes | N/A | ~180 MB | N/A | ~15 ms | C2_085 dev | Dual vector spaces (dense + sparse) and RRF hybrid retrieval. | In-memory and local disk persistence verified. |
| **PyLate** | `lightonai/pylate` | 1.6.0 | `upstream` | `GTE-ModernColBERT-v1` | `main` | PyTorch / Transformers | **READY** | Yes | Yes | ~1.8 GB | ~1.2 GB | ~210 ms | C2_085 dev | Real ColBERT late interaction MaxSim scoring. | Requires safe DLL initialization on Windows. |
| **RAGLite** | `raglite/raglite-dev` | Not Installed | N/A | BGE-small | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | N/A | None | Missing pip package `raglite`. No simulations permitted. | Requires installing `raglite`. |
| **PageIndex Structural** | `VectifyAI/PageIndex` | 0.2.18 | `upstream` | Deterministic PDF Tree | N/A | Python / PyMuPDF | **READY** | Yes | No | ~45 MB | N/A | ~8 ms | C2_085 dev | Purely local structural outline navigation. | Structure-only; no semantic text search. |
| **PageIndex Agentic** | `VectifyAI/PageIndex` | 0.2.18 | `a573361b` | `llama3.2:latest` | `a573361b` | PageIndex + Ollama REST | **READY** | Yes | Yes | ~150 MB | ~2.0 GB | ~1850 ms/turn | C2_085 dev | Multi-turn tool-mediated agentic search (EXP-0057). | High latency; 3B model prone to wrong section selection. |
| **ColSmol** | `vidore-benchmark/colpali` | Not Installed | N/A | `vidore/colsmol-256m` | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | N/A | None | Missing pip package `colpali-engine`. No simulations permitted. | Requires installing `colpali-engine`. |
| **Neo4j GraphRAG** | `neo4j/neo4j-graphrag` | Not Installed | N/A | None (Graph + LLM) | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | N/A | None | Missing pip package `neo4j` and local Neo4j database instance. | Requires local Neo4j server. |
| **CRAG** | `HuskyInSalt/CRAG` | In-house | `upstream` | Confidence Heuristics | N/A | Python | **READY** | Yes | No | ~60 MB | N/A | ~12 ms | C2_085 dev | Closed-corpus offline corrective retrieval. | Web search strictly disabled by closed-corpus rule. |
| **LLMLingua** | `microsoft/LLMLingua` | 0.2.2 | `upstream` | `llmlingua-2-bert-base` | `main` | PyTorch / Transformers | **READY** | Yes | Optional | ~450 MB | N/A | ~85 ms | C2_085 dev | Real prompt compression verified with cached LLMLingua-2 model. | CPU inference latency ~85ms per prompt. |
| **Docling** | `DS4SD/docling` | 2.128.0 | `upstream` | `NativePdfPipeline` | N/A | Python / docling-core | **READY** | Yes | No | ~95 MB | N/A | ~240 ms/page | C2_085 dev | Real streaming page-window parsing with high-frequency RSS monitor. | Python-only execution pipeline. |
| **Docling Rust** | `docling-project/docling.rs` | Not Built | N/A | None | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | N/A | None | Native Rust CLI binary not compiled/installed. | Requires MSVC cargo toolchain to build native binary. |
| **Marker** | `datalab-to/marker` | 2.0.0 | `upstream` | Marker OCR/Layout | N/A | PyTorch / Transformers | **READY_WITH_LIMITATIONS** | Yes | Optional | N/A | N/A | N/A | None | Package installed; requires downloading model weights on first run. | Network access required for weight download. |
| **Surya** | `VikParuchuri/surya` | 0.22.1 | `upstream` | Surya SegFormer/Rec | N/A | PyTorch / Transformers | **READY_WITH_LIMITATIONS** | Yes | Optional | N/A | N/A | N/A | None | Package installed; requires downloading model weights on first run. | Network access required for weight download. |
| **Ollama** | `ollama/ollama` | 0.34.2 | `service` | `llama3.2:latest` | `local` | Ollama local daemon | **READY** | Yes | Yes | ~250 MB | ~2.1 GB | ~32 ms/tok | C2_085 dev | Active local service on port 11434 with llama3.2:latest. | GPU VRAM bound. |
| **llama.cpp** | `ggml-org/llama.cpp` | 0.4.1-dev | `b49650adb` | `qwen2.5-0.5b-q4` | N/A | C++ CLI / GGUF | **NOT_READY** | Yes | N/A | N/A | N/A | N/A | None | Binary `llama-cli.exe` is installed, but local GGUF model file is corrupted. | Model file `qwen2.5-0.5b-instruct-q4_k_m.gguf` has out-of-bounds tensor data. |
| **Gemma 3n** | `google/gemma-3n-E2B-it` | 5.3.0 | N/A | `gemma-3n-E2B-it` | N/A | Transformers | **NOT_READY** | Yes | Yes | N/A | N/A | N/A | None | Gated model requires Hugging Face license acceptance and local cache. | Gated model access required. |
| **BitNet** | `microsoft/BitNet` | Not Installed | N/A | `BitNet-b1.58-large` | N/A | N/A | **NOT_READY** | N/A | N/A | N/A | N/A | N/A | None | bitnet.cpp binary and bitnet package not installed. | Requires native C++ compilation. |

---

## Additional Infrastructure Components

| Component | Repository | Version | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **EXP-0040 Baseline** | In-house | 5.3.0 | **READY** | Adopted frozen baseline control; byte-for-byte reference anchor. |
| **Fusion Layer** | In-house | 1.0.0 | **READY** | Framework-independent RRF, weighted fusion, and score normalization. |

---

## Status Classification Summary

* **READY (9 target components + 2 infra):**
  - BGE-M3 (FlagEmbedding)
  - Qdrant (Dense + Sparse + Hybrid)
  - PyLate (ColBERT Late Interaction)
  - PageIndex Structural Navigator
  - PageIndex Native Agentic Retriever
  - CRAG Closed-Corpus
  - LLMLingua
  - Docling (Python)
  - Ollama Local Service
  - *(Infra: EXP-0040 Baseline, Fusion Layer)*
* **READY_WITH_LIMITATIONS (2 components):**
  - Marker (package installed; requires model weights download)
  - Surya (package installed; requires model weights download)
* **NOT_READY (7 components):**
  - RAGLite (package not installed)
  - ColSmol (package not installed)
  - Neo4j GraphRAG (package not installed / server unreachable)
  - Docling Rust (native Rust binary not compiled)
  - llama.cpp (binary installed, but local GGUF model file is corrupted/incomplete)
  - Gemma 3n (gated model not cached locally)
  - BitNet (binary / package not installed)
* **SIMULATIONS:** 0 (Strictly zero simulations across all components).
