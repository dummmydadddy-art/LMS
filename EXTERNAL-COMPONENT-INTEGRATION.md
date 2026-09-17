# External Component Integration Framework Specification

**Repository:** `EduConnect-LMS-Experimental`  
**Base Research HEAD:** `63d961ee9a94d69c911f785a8b6a7d25cabd18f9` (EXP-0040 Blind Evaluation HEAD)  
**Production Repository:** `EduConnect-LMS-Production` (Untouched at HEAD `176883227602671b545e061dacf228aedc3271a5`)  
**Status:** INTEGRATION FRAMEWORK READY  

---

## 1. Architectural Principles & Isolation Guarantees

1. **Non-Invasive Research Adapters:** None of the external research frameworks replace the core production application or the frozen research lineage. Every tool is integrated as an isolated Python adapter under `research/retrieval_adapters/` implementing `ResearchRetriever`.
2. **Frozen Baseline Reference:** The adopted EXP-0040 hierarchical parent-child retriever (`C2_ChonkieSemantic_085` 76 chunks, 36 bounded parents, `BAAI/bge-small-en-v1.5` dense retrieval, MiniLM reranker, M2 score fusion, and Candidate A4 verifier) remains the default control whenever all research feature flags are disabled.
3. **One Improvement Per Experiment:** To prevent conflation of effects, each experiment from EXP-0041 to EXP-0047 isolates exactly one component or technique.
4. **Production Repository Protection:** Production is strictly write-protected and completely uncoupled from these experimental dependencies.

---

## 2. Integrated External Components

| Component | Repository | Model / Artifact | Integration Purpose | Target Experiment |
| :--- | :--- | :--- | :--- | :--- |
| **FlagEmbedding** | `FlagOpen/FlagEmbedding` | `BAAI/bge-m3`<br>`BAAI/bge-reranker-v2-m3` | Dense, sparse lexical, multi-vector, and cross-encoder reranking | EXP-0041 (Reranker)<br>EXP-0042 (Dense)<br>EXP-0043 (Hybrid) |
| **Qdrant** | `qdrant/qdrant` | Local Vector Engine | Local vector database with payload filtering and RRF hybrid retrieval | EXP-0043 (Hybrid) |
| **PyLate** | `lightonai/pylate` | `lightonai/GTE-ModernColBERT-v1` | Isolated late-interaction MaxSim retrieval replacement | EXP-0044 (Late Interaction) |
| **LlamaIndex** | `run-llama/llama_index` | `QueryFusionRetriever` | Multi-query expansion & Reciprocal Rank Fusion over frozen baseline | EXP-0045 (Query Fusion) |
| **Haystack** | `deepset-ai/haystack` | `HierarchicalDocumentSplitter` | Root-parent-child hierarchy construction comparator (`EXP-0040-H`) | EXP-0040-H (Comparator) |
| **CRAG** | `HuskyInSalt/CRAG` | Closed Quality Evaluator | Retrieval quality evaluation & closed-corpus corrective context actions | EXP-0046 (Corrective Retrieval) |
| **LightRAG** | `HKUDS/LightRAG` | Local Ollama / BGE-small | Educational knowledge graph sidecar (naive, local, global, hybrid, mix) | EXP-0047 (Graph Retrieval) |

---

## 3. Deliberately Omitted / Prohibited Behaviors

The following capabilities are **STRICTLY PROHIBITED** and deliberately omitted from all research adapters:
- **NO External Web Search:** This is a closed educational curriculum benchmark. The CRAG adapter uses purely internal curriculum reformulation and context expansion. External web queries are completely disabled.
- **NO Ground-Truth Leakage:** Neither CRAG, LlamaIndex, nor any retriever can access benchmark ground truth or blind labels. Retrieval quality is evaluated strictly from evidence properties and confidence scores.
- **NO Uncontrolled GPU Memory Concurrency:** Simultaneous GPU residency of multiple large neural models (e.g. BGE-M3 + PyLate ColBERT + MiniLM + Ollama) is prohibited due to the 4 GB VRAM ceiling.
- **NO Production Framework Replacement:** Neither LlamaIndex, Haystack, nor Qdrant replaces the production LMS API (`EduConnect-LMS-Production`).

---

## 4. Hardware Safety Profile (RTX 3050 Laptop / 4 GB VRAM)

- **Sequential Residency:** When switching between heavy models, the prior model is unreferenced, garbage collected, and `torch.cuda.empty_cache()` is called.
- **Lazy Loading:** Models are loaded into memory only on first inference execution, not upon Python module import.
- **Automatic CPU Fallback:** If GPU VRAM headroom is below 2.0 GB, adapters automatically execute inference on CPU.

---

## 5. Experiment Execution Roadmap

- **EXP-0041:** BGE Reranker Replacement (`BAAI/bge-reranker-v2-m3` vs frozen MiniLM control).
- **EXP-0042:** BGE-M3 Dense Embedding Only (1024-dim dense retrieval vs 384-dim BGE-small control).
- **EXP-0043:** Dense + Sparse Hybrid Retrieval with Qdrant and RRF fusion.
- **EXP-0044:** PyLate ColBERT Late Interaction Retrieval.
- **EXP-0045:** LlamaIndex Multi-Query Fusion Expansion vs Single Query Baseline.
- **EXP-0046:** CRAG Corrective Retrieval Layer (Closed Educational Corpus).
- **EXP-0047:** LightRAG Educational Knowledge Graph Sidecar Retrieval.
- **EXP-0040-H:** Haystack Document Hierarchy Structural Comparator.
