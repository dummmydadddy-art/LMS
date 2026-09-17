# EXP-0055: Low-Memory Windowed & Streaming Document Ingestion Specification

**Experiment:** EXP-0055: Low-Memory Windowed & Streaming Document Ingestion with Python Docling  
**Branch:** `research-integration`  
**Parent Commit:** `55aa4ac3c582f632de1946885de1b9daed892417`  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (FROZEN HEAD: `176883227602671b545e061dacf228aedc3271a5`)  
**Adopted Retriever:** EXP-0040 Hierarchical Parent-Child Retriever (76 C2_085 Semantic Leaves -> 36 Bounded Parents)  
**Frozen Verifier:** Candidate A4 (`backend/rag_ambiguity_guard_verifier.php`, SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  
**Development Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`)  
**Date:** September 2026  
**Status:** PRE-REGISTERED & EXPERIMENT AUTHORIZED  

---

## 1. Research Motivation & Core Hypotheses

Monolithic document parsers ingest multi-page academic materials (syllabi, slides, textbooks, code manuals) by converting every page simultaneously and buffering complete object graphs in process memory. On edge and low-resource LMS servers (16 GB RAM, 4 GB VRAM ceiling), processing large documents leads to linear memory growth ($O(N)$ with document page count), causing GC pressure, memory fragmentation, and risk of process termination under concurrent student load.

**EXP-0055** evaluates **Low-Memory Windowed & Streaming Document Ingestion** using **Python Docling** (`docling==2.128.0`, `NativePdfPipeline`).

### Pre-Registered Hypotheses:
1. **Hypothesis $H_1$ (Memory Boundedness / $O(1)$ Scaling):** Bounded page-windowed incremental streaming ingestion ($\text{window} \le 5$ pages, $\text{budget} \le 10$ pages) maintains a strictly flat peak memory overhead ($\le 100$ MB delta RSS above idle) across scaling document lengths (5 to 50 pages), whereas monolithic whole-document batch ingestion scales with an $O(N)$ memory growth slope.
2. **Hypothesis $H_2$ (Content & Structure Preservation):** Incremental windowed streaming extracts 100% of curriculum body text characters, section headings, and code blocks with zero omission, truncation, or reordering compared to monolithic parsing.
3. **Hypothesis $H_3$ (Downstream RAG Non-Inferiority):** Feeding curriculum content extracted via bounded windowed streaming into the frozen EXP-0040 hierarchical parent-child retriever and A4 verifier achieves downstream accuracy ($\ge 71.40\%$) and safety (FAR $\le 17.50\%$) that is non-inferior to the EXP-0040 baseline.

---

## 2. Experimental Conditions

### Control Condition (B0: Monolithic Whole-Document Batch Ingestion)
- **Engine:** Python Docling `NativePdfPipeline`.
- **Execution Mode:** Monolithic whole-document batch (`page_range=None` or full document range `(1, total_pages)`).
- **Memory Profile:** Converts all pages in a single invocation, retaining the full parsed document tree in memory simultaneously.
- **Streaming:** Disabled (`streaming_mode = False`).

### Candidate Condition (C1: Bounded Windowed Streaming Ingestion)
- **Engine:** Python Docling `NativePdfPipeline` (`PythonDoclingAdapter`).
- **Execution Mode:** Windowed incremental streaming (`default_page_window = 5`, `max_page_budget = 10`).
- **Streaming:** Genuine incremental generator streaming via `stream_pages()`: converts page windows sequentially, yields individual `PageArtifact` records to downstream consumers, and invokes `gc.collect()` between windows to prevent memory accumulation.
- **Instrumentation:** Continuous background thread sampling process RSS every 2ms to capture authentic peak memory.

---

## 3. Pre-Registered Invariants & Scope Bounds

1. **Production Isolation:** `EduConnect-LMS-Production` remains untouched at `176883227602671b545e061dacf228aedc3271a5`.
2. **Historical Integrity:** EXP-0025, EXP-0033, EXP-0039, and EXP-0040 datasets and predictions are locked and byte-identical.
3. **Evaluator Immutability:** Neither the scoring criteria, prompt (`P4_neutral`), nor confidence thresholds (0.85/0.80) in `backend/rag_ambiguity_guard_verifier.php` may be altered.
4. **Single-Experiment Authorization:** EXP-0055 ONLY. EXP-0056 through EXP-0062 must not be run.
5. **No Simulation:** All uninstalled/uncompiled runtimes (`docling.rs` native Rust, LLMLingua neural compression, Surya, Marker, Gemma 3n, BitNet) must remain strictly classified as `NOT_READY` or `UNAVAILABLE`. No mock values or simulated outputs are permitted.
6. **Verified PageIndex Distinction:** PageIndex status is strictly preserved as `md_to_tree()` structural parsing over prepared document markdown/text, not native PDF ingestion.
7. **Uniform Versioning:** Python Docling is consistently documented as `2.128.0`.
