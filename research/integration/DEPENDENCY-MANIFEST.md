# Dependency Manifest

**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Host Environment:** Windows 11 / Python 3.12 (`py -3.12`)  
**Hardware Profile:** Intel Core i7 / 16 GB System RAM / NVIDIA RTX 3050 Laptop GPU (4 GB VRAM)

---

## 1. Core Installed Dependencies (Python 3.12)

| Package | Installed Version | Primary Role in Research Architecture |
| :--- | :--- | :--- |
| `torch` | `2.11.0` | Tensor computation, neural network inference |
| `torchvision` | `0.26.0+cpu` | Image transformation for vision components |
| `transformers` | `5.3.0` | Hugging Face model loading and tokenization |
| `sentence-transformers` | `5.3.0` | Dense embeddings and cross-encoder rerankers |
| `FlagEmbedding` | `1.4.2` | BGE-M3 multi-modal and BGE-reranker-v2-m3 execution |
| `qdrant-client` | `1.19.1` | Embedded / on-disk Qdrant vector database engine |
| `pylate` | `1.6.0` | Token-level late-interaction ColBERT retrieval |
| `pageindex` | `0.2.18` | PDF-native tree extraction and agentic tool provider |
| `docling` | `2.128.0` | High-fidelity document parsing (`NativePdfPipeline`) |
| `docling-core` | `2.97.0` | Core document representations and schemas |
| `docling-parse` | `7.20.0` | Low-level PDF parser |
| `llmlingua` | `0.2.2` | Context and prompt compression engine |
| `marker-pdf` | `2.0.0` | Alternative PDF conversion pipeline |
| `surya-ocr` | `0.22.1` | Document OCR, layout analysis, and table recognition |
| `psutil` | `7.1.3` | Process memory (RSS) and system telemetry monitoring |
| `PyYAML` | `6.0.3` | Configuration loading and validation |
| `numpy` | `1.26.4` | Numerical operations, vector math, and array manipulation |
| `scipy` | `1.16.3` | Scientific computing and statistical tests |

---

## 2. External Services & Runtimes

| Runtime / Service | Version | Status | Endpoint / Access |
| :--- | :--- | :--- | :--- |
| **Ollama Service** | `0.34.2` | **ACTIVE** | `http://127.0.0.1:11434` (model: `llama3.2:latest`) |
| **PHP Runtime** | `8.2+` | **ACTIVE** | CLI execution for frozen A4 verifier (`backend/rag_ambiguity_guard_verifier.php`) |
| **SQLite Engine** | `3.39+` | **ACTIVE** | `database/rag_materials.sqlite3` (`C2_ChonkieSemantic_085`) |
| **Neo4j DBMS** | N/A | **OFFLINE** | Missing local service instance (`bolt://localhost:7687`) |

---

## 3. Uninstalled / Optional Packages (No Simulations)

The following components are optional and not installed in the current environment. Per governance rules, no simulations are created:

| Component | Missing Package / Binary | Installation Requirement | Reversible? |
| :--- | :--- | :--- | :--- |
| **RAGLite** | `raglite` | `pip install raglite` | Yes (pure Python) |
| **ColSmol** | `colpali-engine` | `pip install colpali-engine` | Yes (PyTorch vision) |
| **Neo4j GraphRAG** | `neo4j` | `pip install neo4j` + Neo4j Server | Yes (DBMS required) |
| **Docling Rust** | `docling.rs` CLI | Rust toolchain (`cargo build --release`) | Yes (MSVC required) |
| **llama.cpp** | `llama-cpp-python` / `llama-cli` | Prebuilt wheels with CUDA / OpenCL | Yes |
| **Gemma 3n** | `google/gemma-3n-E2B-it` | Hugging Face gated repo acceptance | Yes |
| **BitNet** | `bitnet` / `bitnet.cpp` | C++ compilation of BitNet engine | Yes |

---

## 4. Hardware Safety & VRAM Ceiling Policy

* **VRAM Ceiling:** 4.0 GB physical limit on NVIDIA GeForce RTX 3050 Laptop GPU.
* **Safety Margin:** 0.75 GB reserved for OS display and graphics compositor.
* **Effective VRAM Budget:** $\le 3.25\text{ GB}$.
* **Sequential Residency:** Only ONE heavy neural model may reside in GPU memory at any given time (`ResourceManager.acquire_residency()`).
* **Automatic CPU Fallback:** When GPU free memory is $< 2.5\text{ GB}$, large models (e.g. BGE-M3, PyLate) automatically initialize on CPU to prevent CUDA Out-Of-Memory (OOM) crashes.
* **Explicit Garbage Collection:** `gc.collect()` and `torch.cuda.empty_cache()` are invoked after batch processing and model transitions.
