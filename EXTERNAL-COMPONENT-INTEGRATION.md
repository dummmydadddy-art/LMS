# External Component Integration Framework Specification (Wave 1 & Wave 2)

**Repository:** `EduConnect-LMS-Experimental`  
**Base Research HEAD (Wave 1):** `fc7e5021a40566f040fbbdaea4d5f04e770a6b40`  
**Production Repository:** `EduConnect-LMS-Production` (Untouched at HEAD `176883227602671b545e061dacf228aedc3271a5`)  
**Status:** WAVE 2 EFFICIENCY INTEGRATION FRAMEWORK READY  

---

## 1. Architectural Principles & Isolation Guarantees

1. **Non-Invasive Research Adapters:** None of the external research frameworks replace the core production application or the frozen research lineage. Every tool is integrated as an isolated Python adapter under `research/` implementing formal base interfaces (`ResearchRetriever`, `DocumentProcessor`, `LocalLLMBackend`).
2. **Frozen Baseline Reference:** The adopted EXP-0040 hierarchical parent-child retriever (`C2_ChonkieSemantic_085` 76 chunks, 36 bounded parents, `BAAI/bge-small-en-v1.5` dense retrieval, MiniLM reranker, M2 score fusion, and Candidate A4 verifier) remains the default control whenever all research feature flags are disabled.
3. **One Improvement Per Experiment:** To prevent conflation of effects, each experiment from EXP-0041 to EXP-0047 (Wave 1) and EXP-0055 to EXP-0062 (Wave 2) isolates exactly one component or technique.
4. **Production Repository Protection:** Production is strictly write-protected and completely uncoupled from these experimental dependencies.
5. **Page-Local Computation & Resource Safety:** Read only what is needed, retrieve only what is needed, OCR only what is needed, compress only what is needed, load only the model that is needed, and run only the computation that is needed.

---

## 2. Integrated External Components (Wave 1 & Wave 2)

### Wave 1: RAG & Retrieval Adapters
| Component | Repository | Model / Artifact | Integration Purpose | Target Experiment |
| :--- | :--- | :--- | :--- | :--- |
| **FlagEmbedding** | `FlagOpen/FlagEmbedding` | `BAAI/bge-m3`<br>`BAAI/bge-reranker-v2-m3` | Dense, sparse lexical, multi-vector, and cross-encoder reranking | EXP-0041 (Reranker)<br>EXP-0042 (Dense)<br>EXP-0043 (Hybrid) |
| **Qdrant** | `qdrant/qdrant` | Local Vector Engine | Local vector database with payload filtering and RRF hybrid retrieval | EXP-0043 (Hybrid) |
| **PyLate** | `lightonai/pylate` | `lightonai/GTE-ModernColBERT-v1` | Isolated late-interaction MaxSim retrieval replacement | EXP-0044 (Late Interaction) |
| **LlamaIndex** | `run-llama/llama_index` | `QueryFusionRetriever` | Multi-query expansion & Reciprocal Rank Fusion over frozen baseline | EXP-0045 (Query Fusion) |
| **Haystack** | `deepset-ai/haystack` | `HierarchicalDocumentSplitter` | Root-parent-child hierarchy construction comparator (`EXP-0040-H`) | EXP-0040-H (Comparator) |
| **CRAG** | `HuskyInSalt/CRAG` | Closed Quality Evaluator | Retrieval quality evaluation & closed-corpus corrective context actions | EXP-0046 (Corrective Retrieval) |
| **LightRAG** | `HKUDS/LightRAG` | Local Ollama / BGE-small | Educational knowledge graph sidecar (naive, local, global, hybrid, mix) | EXP-0047 (Graph Retrieval) |

### Wave 2: Resource-Efficient Document & Local Inference Components
| Component | Repository | Model / Artifact | Integration Purpose | Target Experiment |
| :--- | :--- | :--- | :--- | :--- |
| **Docling.rs** | `docling-project/docling.rs` | Streaming Parser | Low-memory, streaming document ingestion and selective page windows | EXP-0055 |
| **PageIndex** | `VectifyAI/PageIndex` | Structural Tree Index | Structural navigation (root -> chapter -> section -> page window) | EXP-0056 |
| **llama.cpp** | `ggml-org/llama.cpp` | GGUF Quantized Engine | High-efficiency local LLM quantized inference (GGUF, KV-cache, offloading) | EXP-0057 |
| **LLMLingua** | `microsoft/LLMLingua` | `LLMLingua-2` | Context token compression preserving evidence provenance and source IDs | EXP-0058 |
| **Surya** | `VikParuchuri/surya` | Layout & OCR Models | Selective OCR, layout, table, and equation processing for difficult pages | EXP-0059 |
| **Gemma 3n E2B** | `google/gemma-3n-E2B-it` | Lightweight Model | Local query routing, classification, and preliminary helper reasoning | EXP-0060 |
| **BitNet** | `microsoft/BitNet` | `BitNet-b1.58-large` | Ultra-efficient 1-bit / 1.58-bit low-bit local inference research | EXP-0061 |
| **Marker** | `datalab-to/marker` | Document Pipeline | Alternative document processing and EXP-0062 parser comparator | EXP-0062 |

---

## 3. Deliberately Omitted / Prohibited Behaviors

- **NO External Web Search:** Closed educational curriculum benchmark. Neither CRAG, PageIndex, nor any retriever may perform external web queries.
- **NO Cloud PageIndex:** PageIndex operates strictly locally with zero external network transmission.
- **NO Whole-Book Memory Accumulation:** Docling.rs and document processors must stream and process bounded page windows (default <= 5 pages).
- **NO Ground-Truth Leakage:** Document quality and retrieval quality are evaluated purely from structural and evidence properties, never from ground-truth benchmark labels.
- **NO Uncontrolled GPU Residency:** The 4 GB VRAM RTX 3050 cannot maintain simultaneous residency of multiple heavy models. `ResourceManager` enforces exclusive model residency.
- **NO Alteration of Production or Historical Research:** EXP-0037, EXP-0038, EXP-0039, and EXP-0040 artifacts and `EduConnect-LMS-Production` remain permanently frozen.

---

## 4. Hardware Safety Profile & Windows 11 Compatibility

| Component | Windows 11 Support | Runtime Mode | Hardware Policy |
| :--- | :--- | :--- | :--- |
| **Docling.rs** | Native Windows | Streaming Python / Rust binary | Low RAM (< 50 MB peak), streaming iterators |
| **PageIndex** | Native Windows | Pure Python | Zero GPU, instant in-memory tree traversal |
| **llama.cpp** | Native Windows | GGUF CUDA / CPU hybrid | Offload <= 16 layers to 4 GB GPU; CPU fallback |
| **LLMLingua** | Native Windows | PyTorch CPU / GPU | Temporary context memory; target rate 0.55 |
| **Surya** | Native Windows | PyTorch CPU / GPU | Conservative batch <= 2; selective page trigger |
| **Gemma 3n** | Native Windows | Transformers / GGUF | Optional helper; graceful degradation if absent |
| **BitNet** | Native Windows | Official C++ / CPU kernels | CPU-optimized low-bit execution |
| **Marker** | Native Windows | PyTorch / Python | Selective OCR; CPU fallback supported |

---

## 5. Experiment Execution Roadmap

- **Wave 1 (EXP-0041 to EXP-0047):** RAG and retrieval research.
- **Wave 2 (EXP-0055 to EXP-0062):**
  - **EXP-0055:** Docling.rs streaming/page-window ingestion.
  - **EXP-0056:** PageIndex structural navigation.
  - **EXP-0057:** llama.cpp local inference efficiency.
  - **EXP-0058:** LLMLingua context compression.
  - **EXP-0059:** Selective Surya OCR/layout.
  - **EXP-0060:** Gemma 3n E2B lightweight routing/helper inference.
  - **EXP-0061:** BitNet low-bit local inference.
  - **EXP-0062:** Marker vs Docling document-engine comparison (`EXP-0062-PARSER-COMPARATOR`).

---

## 6. Wave 2 Runtime Enablement & Local Windows Verification

Following the fidelity pass, external runtimes were enabled and verified directly on the Windows 11 host environment:

1. **Python Docling vs Docling.rs Identity Separation:**
   - Document conversion in `DoclingRsAdapter` executes via Python Docling (`NativePdfPipeline`, package version `docling==2.128.0`).
   - Native Rust CLI (`docling-project/docling.rs`) requires `cargo` / MSVC compilation from source, which is not present on the host environment.
   - Status: `Docling.rs` is classified as `NOT_READY` (`COMPILE_REQUIRED`), while `Python Docling` is verified as `REAL_RUNTIME` (`INSTALLED_EXECUTABLE`).
2. **PageIndex Real Execution:**
   - Package `pageindex` version 0.2.18 was installed and integrated with `asyncio.run(pageindex.md_to_tree())`.
   - Verified on `tests/research/data/multipage_curriculum.pdf`: generated 6 structural nodes in 234ms with zero external cloud API calls and zero network transmission.
   - Scope distinction: The verified execution path is PageIndex `md_to_tree()` operating on structure/text prepared from PDF, not end-to-end native PDF ingestion.
3. **llama.cpp Real Execution:**
   - Official Windows binary release `b11026` (`llama-cli.exe` and `llama-server.exe`) installed to `%LOCALAPPDATA%\Programs\llama.cpp\` and verified on PATH.
   - Real model `Llama 3.2 3B Instruct Q4_K_M` executed via `llama-cli.exe` with bounded context (512 tokens).
   - Measured speed: **50.6 prompt t/s**, **10.3 generation t/s**, 4.9s latency on 4-thread CPU execution with zero GPU VRAM consumption.
4. **Environment & Uninstalled Components:**
   - `LLMLingua`, `Surya`, and `Marker` packages are installed in Python 3.12, but their multi-gigabyte checkpoints require Hugging Face downloads that stall on unauthenticated network requests. They report `NOT_READY` without simulated behavior.
   - `Gemma 3n E2B` is gated on Hugging Face terms (`MODEL_UNAVAILABLE`); heuristic fallback routing is verified.
   - `BitNet` requires MSVC compilation of `bitnet.cpp` low-bit C++ kernels (`RUNTIME_UNAVAILABLE`).
5. **Test Suite Verification:**
   - `py -3.12 research/run_integration_tests.py` ran 55 tests: **55 passed**, 0 failures, 0 errors, 6 clean skips.

