# Configuration Guide

**Repository:** `EduConnect-LMS-Experimental`  
**Location:** `research/integration_configs/`  
**Purpose:** Guide to the 20 standardized YAML experimental configuration profiles.

---

## 1. Overview of Configuration Profiles

The research architecture provides 20 distinct configuration profiles in `research/integration_configs/`. Each profile configures an isolated experimental condition while keeping all unneeded components strictly disabled.

| Profile Name | Target Component | Category | Status |
| :--- | :--- | :--- | :--- |
| `baseline.yaml` | EXP-0040 Frozen Baseline | Control Reference | **READY** |
| `bge_m3_dense.yaml` | BGE-M3 Dense (1024d) | Text Retrieval | **READY** |
| `bge_m3_sparse.yaml` | BGE-M3 Sparse Weights | Text Retrieval | **READY** |
| `qdrant_hybrid.yaml` | Qdrant Dense+Sparse RRF | Vector Database | **READY** |
| `pylate.yaml` | PyLate ColBERT MaxSim | Late-Interaction | **READY** |
| `raglite.yaml` | RAGLite Composite | Composite Retrieval | **NOT_READY** |
| `pageindex_structural.yaml` | PageIndex Outline Flash | Structural Navigation | **READY** |
| `pageindex_agentic.yaml` | Native PageIndex Agentic | Agentic Retrieval | **READY** |
| `colsmol.yaml` | ColSmol-256M Visual | Visual Retrieval | **NOT_READY** |
| `neo4j_graphrag.yaml` | Neo4j GraphRAG | Graph Retrieval | **NOT_READY** |
| `crag_closed_corpus.yaml` | CRAG Corrective Retrieval | Quality Evaluation | **READY** |
| `llmlingua.yaml` | LLMLingua Compression | Context Processing | **READY_WITH_LIMITATIONS** |
| `docling.yaml` | Python Docling NativePdf | Document Parsing | **READY** |
| `marker.yaml` | Marker PDF Fast | Document Parsing | **READY_WITH_LIMITATIONS** |
| `surya.yaml` | Surya OCR/Layout | Document Parsing | **READY_WITH_LIMITATIONS** |
| `llama_cpp.yaml` | llama.cpp GGUF Q4_K_M | Local Inference | **NOT_READY** |
| `ollama.yaml` | Ollama llama3.2:latest | Local Inference | **READY** |
| `gemma3n.yaml` | Gemma 3n E2B | Local Inference | **NOT_READY** |
| `bitnet.yaml` | BitNet 1.58-Bit | Local Inference | **NOT_READY** |
| `full_stack.yaml` | Unified Integration Stack | Integration Verification | **READY_WITH_LIMITATIONS** |

---

## 2. Default Behavior: `baseline.yaml`

The `baseline.yaml` profile is the **sole default profile** for production and benchmark comparisons. It guarantees:
1. **Frozen Baseline Reproduction:** Executes byte-for-byte identically to the adopted EXP-0040 / C2_085 / A4 baseline.
2. **All Optional Flags Disabled:** Every optional component flag (`ENABLE_BGE_M3`, `ENABLE_QDRANT`, `ENABLE_PYLATE`, etc.) is explicitly set to `false`.
3. **Deterministic Seeds:** Sets `seed: 42` for all stochastic operations.
4. **Blind Evaluation Disabled:** `blind_evaluation.enabled: false` ensures the protected $N=500$ blind holdout is never accessed.

---

## 3. Full-Stack Profile: `full_stack.yaml`

> [!IMPORTANT]
> `full_stack.yaml` is strictly an **integration verification profile**.
> - It is **NOT** the default configuration.
> - It is **NOT** claimed to be superior to the baseline.
> - Its sole purpose is to prove that compatible components across the pipeline (Docling parsing $\rightarrow$ PageIndex structural navigation $\rightarrow$ CRAG corrective retrieval $\rightarrow$ Ollama inference $\rightarrow$ A4 verification) coexist behind unified interfaces.

---

## 4. Configuration Schema & Key Descriptions

```yaml
experiment_id: EXP-0040-BASELINE     # Unique identifier for the experimental condition
description: "..."                  # Human-readable description
feature_flags:                      # Boolean toggles for every optional module
  ENABLE_BGE_M3: false
  ENABLE_QDRANT: false
  ENABLE_PYLATE: false
  # ... (all default to false)
retriever: exp0040                  # Active retriever key
verifier:                           # Downstream NLI verifier
  name: A4
  file: backend/rag_ambiguity_guard_verifier.php
  frozen: true
  prompt: P4_neutral
  thresholds:
    entailment: 0.85
    contradiction: 0.80
dataset:
  dev: EXP-0025-DEVELOPMENT-DATASET.json
  blind: EXP-0033-BLIND-DATASET.json
blind_evaluation:
  enabled: false                    # Must remain false during integration
```

---

## 5. Loading Configurations Programmatically

```python
import yaml

def load_profile(profile_name: str) -> dict:
    config_path = f"research/integration_configs/{profile_name}"
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    return config

# Example: Load baseline
config = load_profile("baseline.yaml")
assert config["feature_flags"]["ENABLE_QDRANT"] is False
```
