# WAVE 2 RUNTIME STATUS AND VERIFICATION REPORT

**Repository:** `EduConnect-LMS-Experimental`  
**Research Branch:** `research-integration`  
**Execution Timestamp:** 2026-09-17  
**Host Environment:** Windows 11 Pro, x86_64, Python 3.12.10, PyTorch 2.11.0+cpu, Torchvision 0.26.0+cpu  
**Hardware Profile:** Intel Core i7, NVIDIA RTX 3050 Laptop GPU (4 GB VRAM ceiling, strictly protected), 16 GB System RAM  

---

## 1. Executive Summary

In this Wave 2 Runtime Enablement pass, external adapters were transitioned from simulated stubs to verified genuine local Windows execution. Zero cloud APIs and zero fabricated benchmarks were used. Components requiring source compilation without installed compilers (Rust `cargo` or MSVC CMake) or gated Hugging Face licensing acceptance are accurately reported as `NOT_READY` / `COMPILE_REQUIRED` or `MODEL_UNAVAILABLE`, with explicit clean skips in the automated test suite.

### Runtime Enablement Matrix

| Component | Repository | Package / Binary Version | Runtime Status | Actual Execution Verified | Execution Mode & Measured Metrics |
|---|---|---|---|---|---|
| **Python Docling** | `DS4SD/docling` | `2.128.0` | `INSTALLED_EXECUTABLE` | **YES** | `NativePdfPipeline` (426.13 MB RSS peak, bounded window, 2 pages extracted in 0.69s) |
| **Docling.rs** | `docling-project/docling.rs` | Uncompiled source | `NOT_READY` (`COMPILE_REQUIRED`) | **NO** | Native Rust CLI requires `cargo`/MSVC compilation from source. Not present on host. |
| **PageIndex** | `VectifyAI/PageIndex` | `0.2.18` | `INSTALLED_EXECUTABLE` | **YES** | Real `asyncio` `md_to_tree` hierarchy extraction (6 structural nodes derived from PDF in 234ms, 0 cloud calls) |
| **llama.cpp** | `ggml-org/llama.cpp` | `b11026` (`llama-cli.exe`) | `INSTALLED_EXECUTABLE` | **YES** | `Llama 3.2 3B Instruct Q4_K_M` (50.6 prompt t/s, 10.3 gen t/s, 4.9s latency, bounded context 512) |
| **LLMLingua** | `microsoft/LLMLingua` | `0.2.2` | `PACKAGE_INSTALLED_WEIGHTS_UNAVAILABLE` | **NO** | Package installed; Hugging Face model weights (`meetingbank` 709MB) throttled on unauthenticated connection. |
| **Surya** | `VikParuchuri/surya` | `0.22.1` | `PACKAGE_INSTALLED_WEIGHTS_UNAVAILABLE` | **NO** | Package installed; recognition/detection checkpoint weights require Hugging Face download. |
| **Marker** | `datalab-to/marker` | `2.0.0` | `PACKAGE_INSTALLED_WEIGHTS_UNAVAILABLE` | **NO** | Package installed; OCR/layout pipeline weights require Hugging Face download. |
| **Gemma 3n E2B** | `google/gemma-3n-E2B-it` | Adapter scaffold | `MODEL_UNAVAILABLE` | **NO** | Gated model requires Hugging Face license acceptance; heuristic fallback verified (`heuristic_fallback`). |
| **BitNet** | `microsoft/BitNet` | Adapter scaffold | `RUNTIME_UNAVAILABLE` | **NO** | Requires CMake/MSVC compilation of `bitnet.cpp` C++ kernels and 1.58-bit model weights. |

---

## 2. Component-by-Component Verification Details

### 2.1 Python Docling vs Docling.rs Identity Separation
- **Disentanglement:** The previous pass verified document extraction using `docling.document_converter.DocumentConverter` with `NativePdfPipeline`. That is pure **Python Docling** (`pip install docling`), not the native Rust implementation `docling-project/docling.rs`.
- **Docling.rs Status:** The host environment lacks `cargo` (Rust toolchain) and MSVC compiler. No prebuilt standalone Windows binary exists on GitHub for `docling.rs`. Its status is officially classified as `NOT_READY` (`COMPILE_REQUIRED`).
- **Python Docling Status:** `PythonDoclingAdapter` is verified `REAL_RUNTIME`. It executes on `tests/research/data/multipage_curriculum.pdf`, extracts target window pages 2–3 without touching unrequested pages 1, 4, or 5, and operates within bounded memory (<500 MB peak RSS).

### 2.2 PageIndex (VectifyAI/PageIndex)
- **Installation:** Package `pageindex` version 0.2.18 installed along with `litellm` and `aiohttp`.
- **Execution Mechanism:** Integrated via `asyncio.run(pageindex.md_to_tree(tmp_path))` over document structure derived from PyMuPDF. Zero reliance on external cloud APIs or stochastic LLM formatting failures.
- **Verification:** Ran real structural extraction on `multipage_curriculum.pdf`. Produced 6 structural nodes (`Curriculum Overview`, `CSS Flexbox Layout`, `JavaScript Scope and TDZ`, `React Reconciliation`, `Relational Database Models`) with SHA-256 tree hash `dcadcd7e158f...` in 234ms.
- **Fidelity Scope Note:** The verified execution path is PageIndex `md_to_tree()` operating on structure/text prepared from the PDF, not end-to-end native PDF ingestion. This distinction is strictly preserved across all experiments.

### 2.3 llama.cpp (ggml-org/llama.cpp)
- **Installation:** Official Windows binary release `b11026` (`llama-cli.exe` and `llama-server.exe`, version `0.4.1-dev`, Clang 20.1.8) installed to `C:\Users\Mukul\AppData\Local\Programs\llama.cpp\` and verified on system PATH.
- **Model:** Verified local GGUF model `Llama 3.2 3B Instruct Q4_K_M` located at `C:\Users\Mukul\.ollama\models\blobs\sha256-dde5aa3fc5ffc17176b5e8bdc82f587b24b2678c6c66101bf7da77af9f7ccdff`.
- **Measured Metrics:**
  - Prompt Processing Speed: **50.6 tokens/sec**
  - Generation Speed: **10.3 tokens/sec**
  - Latency: **4.90 seconds**
  - Context Size: **512 tokens** (bounded allocation prevents CPU memory bloat)
  - Memory: **2048 MB** (CPU execution, 0 GPU layers offloaded, protecting 4 GB VRAM ceiling)

### 2.4 LLMLingua (microsoft/LLMLingua)
- **Status:** Package `llmlingua==0.2.2` is installed in Python 3.12.
- **Constraint:** Neural compression mode (`LLMLingua-2`) requires downloading `microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank` (709 MB). Unauthenticated network requests to Hugging Face are throttled/stalled on the local network.
- **Enforcement:** `LLMLinguaAdapter` checks for local model presence in cache. When missing, it reports `NOT_READY` and cleanly raises `RuntimeError("... not installed in local cache ...")` without hanging. Pass-through mode (`disabled`) remains fully operational.

### 2.5 Surya (VikParuchuri/surya) & Marker (datalab-to/marker)
- **Status:** Packages `surya-ocr==0.22.1` and `marker-pdf==2.0.0` installed in Python 3.12 along with `torchvision-0.26.0+cpu`.
- **Constraint:** Model weights for SegFormer detection, recognition, layout, and TeXify pipelines require downloading multi-gigabyte checkpoints from Hugging Face Hub.
- **Enforcement:** Both adapters verify checkpoint presence. When uninstalled, they report `NOT_READY` with zero simulated output and allow test suites to skip cleanly.

### 2.6 Gemma 3n E2B (google/gemma-3n-E2B-it)
- **Status:** Gated model requiring Hugging Face account authorization and license agreement.
- **Enforcement:** Reports `MODEL_UNAVAILABLE` while preserving the verified deterministic `heuristic_fallback` query routing.

### 2.7 BitNet (microsoft/BitNet)
- **Status:** Requires native C++ compilation of `bitnet.cpp` low-bit matrix kernels (CMake/MSVC) and official 1.58-bit model weights (`BitNet-b1.58-2B-4T`).
- **Enforcement:** Reports `RUNTIME_UNAVAILABLE` with null metrics and clean test skipping.

---

## 3. Test Suite Execution Summary

Full test suite execution via `py -3.12 research/run_integration_tests.py`:
- **Total Tests Executed:** 55
- **Successes:** 55
- **Failures:** 0
- **Errors:** 0
- **Clean Skips:** 6 (uninstalled/uncompiled components: BitNet, Docling.rs, Gemma 3n, LLMLingua neural, Marker, Surya)
- **Execution Time:** 72.46 seconds
- **Simulation Count:** 0
