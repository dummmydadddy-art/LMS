# EXP-0039: Conservative RAG Chunking with Chonkie - Experimental Design

**Experiment ID:** EXP-0039  
**Branch:** `exp-0039`  
**Parent Lineage:** EXP-0038 completed audit checkpoint (`e1cf1503851a5ff2fc1b3a86897556943878cf13`)  
**Frozen Research Champion Comparator:** EXP-0037 (Accuracy 90.75%, Macro F1 90.70%, FAR 18.50%, FRR 0.00%, Recall@5 100.0%)  
**Verifier Configuration:** Frozen Candidate A4 (`backend/rag_ambiguity_guard_verifier.php`, prompt `P4_neutral`, thresholds 0.85/0.80)  
**Date:** September 2026  
**Status:** In Development / Benchmarking  

---

## 1. Research Motivation & Theoretical Framework

In **EXP-0038**, structure-aware chunking using IBM Docling's `HybridChunker` was systematically evaluated against the legacy regex/heuristic chunker (C0). While Docling improved structural semantic coherence, forensic error analysis revealed three persistent failure modes:
1. **Cross-Topic Contamination (Sibling Bleeding):** Aggregating adjacent bullet items into 512-token compound chunks caused cross-contamination between distinct technical subtopics (e.g., mixing `justify-content` with `align-items`, or `var` scoping with `let/const` temporal dead zones).
2. **Token Bloat & Density Overload:** Chunks were aggressively filled up to the 512-token ceiling, increasing token density and introducing extraneous premise clauses that distracted the downstream NLI verifier.
3. **Downstream Verifier Friction:** The A4 verifier experienced degraded accuracy on subtle false premise inquiries when evidence chunks contained mixed polarities across multiple sub-concepts.

**EXP-0039** investigates whether **conservative proposition-preserving chunking** using **Chonkie** can resolve these failure modes. Chonkie provides lightweight, fast chunking algorithms designed to preserve natural grammatical and propositional boundaries:
- **Chonkie RecursiveChunker (C1):** Splits recursively along natural linguistic boundaries (paragraphs, newlines, sentences, clauses), strictly preserving local bullet points and technical definitions without arbitrary document transformations.
- **Chonkie SemanticChunker (C2):** Groups sentences dynamically based on embedding cosine similarity transitions using Savitzky-Golay peak detection, ensuring topically unified evidence units without aggressive over-merging.

### Core Research Questions
1. Does conservative proposition chunking via Chonkie maintain 100% retrieval coverage (Recall@5 = 100.0%) while eliminating sibling bullet-point contamination?
2. Does Chonkie SemanticChunker (at thresholds 0.75, 0.80, or 0.85) achieve non-inferior downstream verifier accuracy ($\text{Accuracy} \ge 90.75\%$, target $\ge 92.00\%$) and preserve safety ($\text{FAR} \le 18.50\%$)?
3. Does Chonkie's fine-grained segmentation create context fragmentation (chunks < 50 tokens), and does hierarchical context preservation mitigate this risk?

---

## 2. Experimental Conditions (Ablation Grid)

The benchmark systematically evaluates five pre-registered conditions over $N = 400$ development queries:

| Condition | Chunker Architecture | Key Parameters | Corpus Table | Target Chunk Count |
|---|---|---|---|---|
| **Control C0** | Legacy Regex Chunker | Section-level regex splits, max ~650 chars | `material_chunks_exp0032` | 23 chunks |
| **Intervention C1** | Chonkie `RecursiveChunker` | Tokenizer: `BAAI/bge-small-en-v1.5`, `chunk_size = 512` | `C1_ChonkieRecursive` | 10 chunks |
| **Intervention C2 (0.75)** | Chonkie `SemanticChunker` | Threshold: `0.75`, `chunk_size = 384`, `similarity_window = 1`, `min_sentences = 1` | `C2_ChonkieSemantic_075` | 69 chunks |
| **Intervention C2 (0.80)** | Chonkie `SemanticChunker` | Threshold: `0.80`, `chunk_size = 384`, `similarity_window = 1`, `min_sentences = 1` | `C2_ChonkieSemantic_080` | 71 chunks |
| **Intervention C2 (0.85)** | Chonkie `SemanticChunker` | Threshold: `0.85`, `chunk_size = 384`, `similarity_window = 1`, `min_sentences = 1` | `C2_ChonkieSemantic_085` | 76 chunks |

### Technical Note on Chonkie 1.7.0 `mode` Compatibility
The experimental protocol specifies: `mode = window, similarity_window = 1, max chunk size = 384 tokens, minimum sentence requirement = 1`.  
In Chonkie 1.7.0, windowed similarity computation with Savitzky-Golay filtering is the intrinsic default algorithm of `SemanticChunker` (implemented in the Rust core via `chonkie_core.windowed_cross_similarity`). There is no separate `mode` enum parameter in `SemanticChunker.__init__`, but `**kwargs` accepts `mode="window"` seamlessly without exception. The window size is directly governed by `similarity_window=1`. This parameter mapping is documented here as an audited implementation property rather than a deviation.

---

## 3. Mandatory Safety & Verification Gates

### 3.1 Token Safety Pre-Verification (Section 5)
Before passing sentences or splits to the embedding model:
- Token length is measured against `BAAI/bge-small-en-v1.5` tokenizer (`BertTokenizer`).
- Any sentence exceeding 512 tokens is recursively split deterministically without discarding text.
- **Audit Finding:** In the authentic curriculum corpus, the longest sentence contains 196 tokens (well below the 512-token ceiling). Zero tokenizer overflow events occurred.

### 3.2 Content Preservation Verification Gate (Section 6)
Before database persistence, all generated chunk sets must demonstrate **100.0% word and character coverage** against the authentic C0 curriculum sources:
- HTML & CSS Fundamentals (Doc ID 1, 491 unique words)
- Advanced JavaScript Concepts (Doc ID 2, 404 unique words)
- React.js Fundamentals (Doc ID 3, 339 unique words)
- Backend Development with Node.js & Express (Doc ID 4, 381 unique words)
- Database Management with PostgreSQL (Doc ID 5, 408 unique words)
- **Gate Result:** Verified 100.0% coverage (1320/1320 unique words preserved, 0 missing words) across C1, C2_0.75, C2_0.80, and C2_0.85. **PASS.**

### 3.3 Hierarchical Context Preservation (Section 7)
Each chunk record retains document title and section heading context:
- `title`: Authentic curriculum document title (e.g., `HTML & CSS Fundamentals`).
- `heading`: Primary active section header (e.g., `CSS BOX MODEL`).
- `headings`: JSON array of all hierarchical headings spanned by the chunk.
- `content`: Chunk text prepended with `[Section Heading]` or `Section Heading:` whenever the raw chunk does not already begin with the header, guaranteeing that retrieval and downstream verifiers retain full topical grounding.

---

## 4. Frozen Downstream Pipeline

To ensure absolute comparability, downstream components are strictly frozen:
- **Retrieval Pipeline:** Bi-encoder `BAAI/bge-small-en-v1.5` dense similarity (pool=15), Cross-encoder `cross-encoder/ms-marco-MiniLM-L-6-v2` reranking with Platt scaling ($P = 1 / (1 + e^{-(0.6236 \cdot \text{logit} + 3.2801)})$), M2 score fusion ($\alpha = 0.50$), Top 5 chunks selected.
- **Downstream Verifier:** Candidate A4 (`rag_ambiguity_guard_verifier.php`, prompt `P4_neutral`, thresholds 0.85/0.80, Ollama `llama3.2:latest`, temperature 0.0).
- **Protected Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256 `3b4fd6c7...`) remains completely sealed and uninspected.
