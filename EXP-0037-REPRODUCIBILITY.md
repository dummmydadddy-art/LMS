# EXP-0037: Reproducibility Manifest & Artifact Provenance

**Experiment Identifier:** EXP-0037  
**Commit Lineage:** `d8c1ed3` -> `exp-0037`  
**Date:** 2026-09-17  

---

## 1. Cryptographic File Signatures

| File / Component | Relative Path | Cryptographic SHA-256 Hash |
|---|---|---|
| Development Dataset ($N=400$) | `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` |
| Blind Evaluation Dataset ($N=500$) | `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` |
| Curriculum Corpus Database | `tests/rag/knowledge_corpus.sqlite` | `7dd32951cd70cea34d4d69484a3f594757702d1373377aee2bb91d57c6d866e1` |
| Ambiguity Guard Verifier | `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` |
| Structured NLI Module | `backend/rag_structured_nli_verifier.php` | `f631319f68f1914687fc678389f41cd7ae30d3a1a8399628e9194922e5041444` |
| Premise Verifier Module | `backend/rag_premise_verifier.php` | `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179` |
| Standard Prompt (P4) | Verbatim string template | `facefba375725268cee977771e86da4712e276202e73a105a7545ae698156c48` |
| Guarded Prompt (P4_neutral) | Verbatim string template | `86955e5e3d6744a096fd160335ac18ea3c46a835005851ed9838e36179641b1c` |

---

## 2. Exact Execution Environment

* **OS:** Windows 11 Home 24H2
* **PHP:** 8.2.12 CLI (memory_limit: 4G)
* **Python:** 3.12.7 (PyTorch 2.5.1, sentence-transformers, transformers)
* **Ollama Daemon:** `ollama serve` (CLI service, persistent keepalive: -1)
* **Model:** `llama3.2:latest` (SHA-256 tag: `a80c4f17acd5...`, 3.2B parameters)
* **Retrieval Bridge:** `http://127.0.0.1:8100` (Dense BGE-small + MiniLM cross-encoder reranker)
