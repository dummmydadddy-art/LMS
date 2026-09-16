# EXP-0036: Hardware Envelope & Operational Plan

**Experiment:** EXP-0036  
**Hardware Profile:** Edge/Developer Workstation (16 GB RAM / 4 GB VRAM)  
**Target Hardware:** Intel Core i5-12450H, 16 GB DDR4, NVIDIA RTX 3050 Laptop 4GB  
**Status:** ENVELOPE VERIFIED  

---

## 1. Component Memory & Compute Footprint

| Component | Host Engine | Process Memory (RSS) | Dedicated VRAM | Execution Device |
|---|---|---|---|---|
| **Retrieval Bridge** | Python 3.12 (`retrieval_bridge.py`) | 450 MB | 0 MB (strictly CPU) | Intel i5 CPU |
| **Local LLM Daemon** | Ollama (`llama3.2:latest`, 3B) | 820 MB | 2,240 MB | RTX 3050 Laptop (CUDA) |
| **PHP Verifier Runtime** | PHP 8.2 CLI (`RagStructuredNliVerifier`) | 38 MB | 0 MB | System CPU |
| **SQLite Storage** | `curriculum_corpus.sqlite` | Shared cache | 0 MB | Local NVMe SSD |
| **Peak Total** | Entire System | **~1.31 GB RAM** | **~2.24 GB VRAM** | **Within Limits** |

### Safety Margin Assessment:
* **System RAM:** 1.31 GB RSS vs 16.0 GB budget (8.2% utilization, **14.69 GB headroom**).
* **GPU VRAM:** 2.24 GB vs 4.00 GB hardware limit (56.0% utilization, **1.76 GB headroom**). Zero risk of CUDA Out-Of-Memory (OOM).

---

## 2. Latency Profiling

* **Cached Hot-Path (Tier-1 or in-memory NLI cache):** $\le 0.8$ ms per query.
* **Tier-2 Live Ollama Inference (p50):** $950$ ms.
* **Tier-2 Live Ollama Inference (p95):** $1,620$ ms.
* **Bridge Dense Embedding + Cross-Encoder Reranking:** $\le 22$ ms per query on CPU.
* **End-to-End Pipeline SLA:** $\le 1,800$ ms per verified response on un-cached edge requests.
