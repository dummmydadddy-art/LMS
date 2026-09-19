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
* **llama.cpp Binary (`llama-cli`):** Neither `llama-cpp-python` nor prebuilt `llama-cli.exe` is currently on the system `PATH`. The adapter reports `NOT_READY`.
* **BitNet Engine (`bitnet.cpp`):** The C++ runtime for 1-bit / 1.58-bit ternary quantization is not compiled on this machine. The adapter reports `NOT_READY`.

---

## 3. Missing Python Packages & Models

Per the strict **No Simulations Policy**, missing packages are reported as `NOT_READY` rather than simulated:

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
4. **Gemma 3n (`google/gemma-3n-E2B-it`):**
   * Model is gated on Hugging Face. Requires Hugging Face user authentication and license acceptance.
   * Status: `NOT_READY`.
   * Heuristic keyword routing fallback is available in `Gemma3nAdapter` and explicitly labeled `heuristic_fallback`.

---

## 4. Scientific & Experimental Limitations

### 4.1 PageIndex Native Agentic Retrieval
* In EXP-0057, native tool-mediated agentic PageIndex retrieval was evaluated on $N=400$ development queries and achieved 62.75% accuracy (substantially below the EXP-0056 structural control of 92.00%, $\Delta = -29.25\text{ pp}$).
* **Limitation:** Native local agentic PageIndex retrieval MUST remain experimental. It is **NOT** the default retriever and must not replace structural navigation.

### 4.2 Closed-Corpus CRAG Policy
* The CRAG adapter operates **strictly offline within the local educational curriculum**.
* **Limitation:** External web search is permanently disabled. Query reformulation and corrective retries operate exclusively over the local curriculum chunks.
