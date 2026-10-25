# Component Registry

**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Purpose:** Catalog of all integrated research components, upstream repositories, and interface adapters.

---

## 1. Retrieval & Representation Components

### 1.1 EXP-0040 Frozen Baseline Adapter
* **Component ID:** `exp0040_baseline`
* **Upstream:** In-house frozen reference (BGE-small + MiniLM + C2_085 Chonkie Semantic)
* **Adapter File:** `research/retrieval_adapters/baseline_adapter.py`
* **Role:** Adopted control baseline providing small-to-big hierarchical parent-child retrieval.
* **Interface:** `ResearchRetriever`
* **Status:** `READY`

### 1.2 FlagEmbedding / BGE-M3 Adapter
* **Component ID:** `bge_flag`
* **Upstream Repository:** `FlagOpen/FlagEmbedding`
* **Adapter File:** `research/retrieval_adapters/bge_flag_adapter.py`
* **Role:** Multi-modal text retrieval supporting dense, sparse lexical weights, and ColBERT multi-vector scoring.
* **Modes:** `dense`, `sparse`, `multi_vector`, `reranker`, `hybrid`
* **Interface:** `ResearchRetriever`
* **Status:** `READY`

### 1.3 Qdrant Vector Database Adapter
* **Component ID:** `qdrant_hybrid`
* **Upstream Repository:** `qdrant/qdrant` (`qdrant-client`)
* **Adapter File:** `research/retrieval_adapters/qdrant_adapter.py`
* **Role:** In-memory or on-disk vector database supporting dense, sparse, and payload-filtered hybrid search with RRF.
* **Interface:** `ResearchRetriever`
* **Status:** `READY`

### 1.4 PyLate ColBERT Adapter
* **Component ID:** `pylate_colbert`
* **Upstream Repository:** `lightonai/pylate`
* **Model:** `lightonai/GTE-ModernColBERT-v1`
* **Adapter File:** `research/retrieval_adapters/pylate_adapter.py`
* **Role:** Token-level late-interaction MaxSim retrieval and candidate pool reranking.
* **Interface:** `ResearchRetriever`
* **Status:** `READY`

### 1.5 RAGLite Adapter
* **Component ID:** `raglite_composite`
* **Upstream Repository:** `raglite / raglite-dev`
* **Adapter File:** `research/retrieval_adapters/raglite_adapter.py`
* **Role:** Optional composite retrieval path exposing hybrid search, late chunking, adaptive retrieval, and reranking.
* **Storage Isolation:** Dedicated path `research/data/raglite_storage/`.
* **Interface:** `ResearchRetriever`
* **Status:** `NOT_READY` (package not installed; no simulation permitted)

### 1.6 ColSmol Visual Document Retrieval Adapter
* **Component ID:** `colsmol_visual`
* **Upstream Repository:** `vidore-benchmark/colpali`
* **Models:** `vidore/colsmol-256m`, `vidore/colsmol-500m`
* **Adapter File:** `research/retrieval_adapters/colsmol_adapter.py`
* **Role:** Multi-vector visual document retrieval over rendered PDF page images.
* **Evidence Provenance:** `TEXT`, `VISUAL`, `FUSED`
* **Interface:** `ResearchRetriever`
* **Status:** `NOT_READY` (package not installed; no simulation permitted)

### 1.7 Neo4j GraphRAG Adapter
* **Component ID:** `neo4j_graphrag`
* **Upstream Repository:** `neo4j / neo4j-graphrag`
* **Adapter File:** `research/retrieval_adapters/neo4j_graphrag_adapter.py`
* **Role:** Graph retrieval, graph traversal, and hybrid vector+graph retrieval.
* **Interface:** `ResearchRetriever`
* **Status:** `NOT_READY` (neo4j driver not installed / server unreachable; no simulation permitted)

### 1.8 CRAG Corrective Retrieval Adapter
* **Component ID:** `crag_closed_corpus`
* **Upstream Repository:** `HuskyInSalt/CRAG`
* **Adapter File:** `research/retrieval_adapters/crag_adapter.py`
* **Role:** Closed-corpus corrective retrieval with confidence evaluation and query reformulation (zero web search).
* **Interface:** `ResearchRetriever`
* **Status:** `READY`

### 1.9 BGE-M3 + Qdrant Pipeline
* **Component ID:** `bge_qdrant_pipeline`
* **Upstream Repositories:** `FlagOpen/FlagEmbedding` & `qdrant/qdrant` & `lightonai/pylate`
* **Adapter File:** `research/retrieval_adapters/bge_qdrant_pipeline.py`
* **Role:** End-to-end dual-vector indexing and retrieval supporting dense, sparse lexical weights, RRF hybrid, and PyLate ColBERT late-interaction cascade.
* **Modes:** `MODE_DENSE`, `MODE_SPARSE`, `MODE_HYBRID_RRF`, `MODE_HYBRID_THEN_LATE_INTERACTION`
* **Candidate Pool Contract:** Configurable `dense_k`, `sparse_k`, `hybrid_k`, `late_interaction_k`
* **Storage Isolation:** `research/data/qdrant/`, `research/data/bge_m3_dense/`, `research/data/bge_m3_sparse/`, `research/data/bge_m3_hybrid/`, `research/data/pylate/`
* **Interface:** `ResearchRetriever`
* **Status:** `READY`

---

## 2. Document Navigation & Ingestion Components

### 2.1 PageIndex Structural Navigator
* **Component ID:** `pageindex_structural`
* **Upstream Repository:** `VectifyAI/PageIndex`
* **Adapter File:** `research/document_navigation/pageindex_adapter.py`
* **Role:** Deterministic hierarchy outline navigator providing bounded page ranges from PDF structure.
* **Engine:** `pageindex.page_index_flash`
* **Status:** `READY`

### 2.2 PageIndex Native Agentic Retriever
* **Component ID:** `pageindex_agentic`
* **Upstream Repository:** `VectifyAI/PageIndex`
* **Adapter File:** `research/document_navigation/pageindex_agentic_adapter.py`
* **Role:** Multi-turn tool-mediated agentic retrieval using native PageIndex tools and Ollama orchestration (EXP-0057).
* **Status:** `READY`

### 2.3 Python Docling Adapter
* **Component ID:** `python_docling`
* **Upstream Repository:** `DS4SD/docling`
* **Adapter File:** `research/document_adapters/python_docling_adapter.py`
* **Role:** Low-memory document parser using `NativePdfPipeline` with high-frequency RSS monitoring.
* **Interface:** `DocumentProcessor`
* **Status:** `READY`

### 2.4 Docling Rust Adapter
* **Component ID:** `docling_rs`
* **Upstream Repository:** `docling-project/docling.rs`
* **Adapter File:** `research/document_adapters/docling_rs_adapter.py`
* **Role:** Native Rust document converter for high-throughput streaming.
* **Status:** `NOT_READY` (requires native Rust MSVC compilation from source)

### 2.5 Marker Document Adapter
* **Component ID:** `marker_pdf`
* **Upstream Repository:** `datalab-to/marker`
* **Adapter File:** `research/document_adapters/marker_adapter.py`
* **Role:** Alternative document converter and markdown extractor.
* **Status:** `READY_WITH_LIMITATIONS` (package installed; model weights require download/caching)

### 2.6 Surya OCR & Layout Adapter
* **Component ID:** `surya_ocr`
* **Upstream Repository:** `VikParuchuri/surya`
* **Adapter File:** `research/document_adapters/surya_adapter.py`
* **Role:** Selective OCR, layout analysis, table extraction, and equation processing.
* **Status:** `READY_WITH_LIMITATIONS` (package installed; model weights require download/caching)

---

## 3. Local Inference Components

### 3.1 Ollama Local Service Adapter
* **Component ID:** `ollama_backend`
* **Upstream Repository:** `ollama/ollama`
* **Adapter File:** `research/local_inference/ollama_adapter.py`
* **Role:** Local LLM execution daemon (`llama3.2:latest`) via REST API.
* **Interface:** `LocalLLMBackend`
* **Status:** `READY`

### 3.2 llama.cpp Local GGUF Adapter
* **Component ID:** `llama_cpp_backend`
* **Upstream Repository:** `ggml-org/llama.cpp`
* **Adapter File:** `research/local_inference/llama_cpp_adapter.py`
* **Role:** GGUF quantized model execution with GPU layer offloading bounded to 4 GB VRAM.
* **Status:** `NOT_READY` (`llama-cli.exe` installed, but local GGUF model `qwen2.5-0.5b-instruct-q4_k_m.gguf` is corrupted/incomplete with out-of-bounds tensor data)

### 3.3 Gemma 3n Adapter
* **Component ID:** `gemma3n_backend`
* **Upstream Repository:** `google/gemma-3n-E2B-it`
* **Adapter File:** `research/local_inference/gemma3n_adapter.py`
* **Role:** Lightweight local model for query routing and intent classification.
* **Status:** `NOT_READY` (gated model requires Hugging Face license acceptance)

### 3.4 BitNet 1.58-Bit Adapter
* **Component ID:** `bitnet_backend`
* **Upstream Repository:** `microsoft/BitNet`
* **Adapter File:** `research/local_inference/bitnet_adapter.py`
* **Role:** Ultra-low-power 1.58-bit ternary quantized local inference.
* **Status:** `NOT_READY` (bitnet.cpp binary not installed)

---

## 4. Context Processing, Fusion & Runtime Governance

### 4.1 LLMLingua Context Compressor
* **Component ID:** `llmlingua_compressor`
* **Upstream Repository:** `microsoft/LLMLingua`
* **Adapter File:** `research/context_processing/llmlingua_adapter.py`
* **Role:** Prompt and context token pruning prior to verifier evaluation.
* **Status:** `READY` (verified real prompt compression with cached `microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank`)

### 4.2 Fusion Layer
* **Component ID:** `fusion_layer`
* **Adapter File:** `research/orchestration/fusion.py`
* **Role:** Framework-independent RRF, weighted rank fusion, score normalization, and hierarchical grouping.
* **Status:** `READY`

### 4.3 Unified Resource Policy
* **Component ID:** `resource_policy`
* **File:** `research/runtime/resource_policy.py`
* **Role:** Enforcing strict bounds on pages, chunks, candidates, tokens, timeouts, and memory.
* **Status:** `READY`

### 4.4 Observability Tracker
* **Component ID:** `observability_tracker`
* **File:** `research/runtime/observability.py`
* **Role:** Recording 19 execution trace dimensions across all experimental runs.
* **Status:** `READY`
