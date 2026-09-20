# EXP-0064: Visual Model Provenance & Environment Record

**Experiment Identifier:** EXP-0064  
**Date:** 2026-09-20  
**Status:** VERIFIED RUNTIME ARTIFACT  

---

## 1. Primary Visual Model Identification

- **Model Identifier:** `vidore/colsmol-256m`
- **Upstream Repository:** `vidore-benchmark/colpali` & `HuggingFaceTB/SmolVLM`
- **Model Revision:** `ColSmolVLM-Instruct-256M-base`
- **Model Architecture:** `ColIdefics3` (Vision-Language Multi-Vector Retriever)
  - Vision Backbone: `Idefics3VisionTransformer` (Patch: 16x16, Embed dim: 768, Layers: 12)
  - Connector: `Idefics3SimpleMLP` (Projection: 12288 -> 576)
  - Language Backbone: `LlamaModel` (Layers: 30, Hidden dim: 576, Vocab: 49280) with LoRA adapters
  - Multi-Vector Projection: `Linear(576, 128)` producing 128-dimensional ColBERT token embeddings
- **Parameter Count:** ~256 Million parameters
- **Processor Class:** `ColIdefics3Processor`
- **Scoring Function:** Token-level late interaction MaxSim:
  $$\text{Score}(Q, D) = \sum_{i=1}^{|Q|} \max_{j=1}^{|D|} \left( \mathbf{q}_i \cdot \mathbf{d}_j^\top \right)$$
- **Local Cache Location:** `C:\Users\Mukul\.cache\huggingface\hub\models--vidore--ColSmolVLM-Instruct-256M-base`

---

## 2. Software & Package Provenance

- **Python Version:** `3.12.9`
- **Operating System:** Windows 11 Home (x86_64)
- **PyTorch Version:** `2.11.0+cpu`
- **TorchVision Version:** `0.26.0+cpu`
- **colpali-engine Version:** `0.3.18`
- **peft Version:** `0.20.0`
- **transformers Version:** `5.3.0`
- **huggingface-hub Version:** `1.18.0`
- **PDF Renderer:** `PyMuPDF (fitz)` Version `1.27.2.3`

---

## 3. Hardware Profile & Runtime Placement

- **CPU:** Intel Core i5-12450H (8 cores / 12 threads)
- **Host RAM:** 16 GB DDR4
- **Target GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)
- **Active Runtime Device:** `CPU` (hardware-aware placement; model and tensor operations executed on CPU via PyTorch float32)
- **Classification:** `READY` (model successfully instantiated and executed on CPU without VRAM limitations)

---

## 4. Document Corpus & Visual Index Provenance

- **Source PDF:** `scratch/data_benchmarks/curriculum_full.pdf`
- **Source PDF SHA-256:** `4c0e8608518e24469c63dcd6eaf054807494631d36156965816ec000400eeb0f`
- **Page Count:** 23 pages
- **Rendered Images:** 23 PNG files in `research/data/colsmol/rendered_pages/`
- **Rendering Specifications:** 150 DPI, RGB, $1240 \times 1755$ resolution
- **Rendered Manifest:** `research/data/colsmol/rendered_pages_manifest.json`
  - Manifest SHA-256: `b23cc63cd4bc1aad05f0c8bd2606e591ddf6eed4d73e380659daa3d3e4af4ef2`
- **Visual Index File:** `research/data/colsmol/index/page_embeddings.pt`
  - Tensor Shape: `torch.Size([23, 875, 128])` (23 pages, 875 patch multi-vectors per page, 128 dimensions)
  - Index SHA-256: `359792c7adcf11cd24c49d9e8c030143b6f1568613dfba20d8bfdb5792851510`
- **Index Metadata:** `research/data/colsmol/index/index_metadata.json`
- **Indexing Latency:** 267.34 seconds (~11.6 seconds per page)
