# Known Limitations & Hardware Constraints

**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Host Environment:** Windows 11 / Python 3.12 (`py -3.12`)  
**Hardware Profile:** Intel Core i7 / 16 GB System RAM / NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)

---

## 1. Hardware & Memory Constraints

### 1.1 4 GB VRAM Physical Ceiling
* **Physical Hardware:** NVIDIA GeForce RTX 3050 Laptop GPU with 4096 MB VRAM.
* **OS Overhead:** The Windows Desktop Window Manager (DWM) and display driver consume 600–800 MB VRAM continuously.
* **Available VRAM:** $\le 3.25\text{ GB}$ usable for neural network execution.
* **Enforced Policy:**
  * Only **one** large neural model may reside in GPU memory at a time (`ResourceManager.acquire_residency()`).
  * Models requiring $> 2.5\text{ GB}$ free VRAM (e.g. BGE-M3 in full multi-vector mode) automatically fall back to CPU execution.
  * ColSmol-500M and ColQwen are restricted due to VRAM overflow; ColSmol-256M is the preferred baseline.

### 1.2 System RAM (16 GB)
* Intensive multi-page document parsing (e.g. Marker, Docling) must use streaming page windows (`NativePdfPipeline`) to maintain bounded RSS memory ($< 150\text{ MB}$) and avoid memory exhaustion.

---

## 2. Operating System & Binary Limitations (Windows 11)

### 2.1 Native Rust / C++ Compilation
* **Docling Rust (`docling.rs`):** The native Rust binary `docling.rs` requires a complete Rust toolchain (`cargo`, `rustc`) with Microsoft Visual C++ (MSVC) build tools. In the current Windows environment, the binary is not compiled. The adapter strictly reports `NOT_READY` and does not invent fake outputs.
* **llama.cpp Binary (`llama-cli`):** `llama-cli.exe` 0.4.1-dev is installed on the system `PATH`. However, the local GGUF model file in `research/model_cache/qwen2.5-0.5b-instruct-q4_k_m.gguf` is incomplete/corrupted (17 MB; tensor 'output.weight' out-of-bounds error on load). The adapter reports `NOT_READY` with this exact failure reason.
* **BitNet Engine (`bitnet.cpp`):** The C++ runtime for 1-bit / 1.58-bit ternary quantization is not compiled on this machine. The adapter reports `NOT_READY`.

---

## 3. Package & Model Statuses

Per the strict **No Simulations Policy**, missing packages and models are reported honestly:

1. **RAGLite (`raglite`):**
   * Package not installed in `py -3.12`.
   * Status: `NOT_READY`.
   * Reversible by running `py -3.12 -m pip install raglite`.
2. **ColSmol / ColPali (`colpali-engine`):**
   * Package not installed in `py -3.12`.
   * Status: `NOT_READY`.
   * Reversible by running `py -3.12 -m pip install colpali-engine`.
3. **Neo4j (`neo4j`):**
   * Python client not installed; local Neo4j database service offline.
   * Status: `NOT_READY`.
   * Reversible by installing `neo4j` and running a local Neo4j Docker container or service.
4. **LLMLingua (`microsoft/LLMLingua`):**
   * `llmlingua` 0.2.2 installed. Model `microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank` is cached locally.
   * Status: `READY`. Real prompt compression verified (29 tokens -> 15 tokens, 1.9x ratio).
5. **Marker (`marker-pdf`) & Surya (`surya-ocr`):**
   * Packages installed (`marker-pdf` 2.0.0, `surya-ocr` 0.22.1).
   * Status: `READY_WITH_LIMITATIONS` (model weights require download on first invocation).
6. **Gemma 3n (`google/gemma-3n-E2B-it`):**
   * Model is gated on Hugging Face. Requires Hugging Face user authentication and license acceptance.
   * Status: `NOT_READY`.

---

## 4. Scientific & Experimental Limitations

### 4.1 PageIndex Native Agentic Retrieval
* In EXP-0057, native tool-mediated agentic PageIndex retrieval was evaluated on $N=400$ development queries and achieved 62.75% accuracy (substantially below the EXP-0056 structural control of 92.00%, $\Delta = -29.25\text{ pp}$).
* **Limitation:** Native local agentic PageIndex retrieval MUST remain experimental. It is **NOT** the default retriever and must not replace structural navigation.

### 4.2 Closed-Corpus CRAG Policy
* The CRAG adapter operates **strictly offline within the local educational curriculum**.
* **Limitation:** External web search is permanently disabled. Query reformulation and corrective retries operate exclusively over the local curriculum chunks.
