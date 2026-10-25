# EXP-0038: Experimental Design — Structure-Aware Evidence Chunking with Docling HybridChunker

**Experiment Identifier:** EXP-0038  
**Target Milestone:** Structure-Aware Evidence Chunking & Downstream Verifier Coupling  
**Parent Lineage:** `4372d43` (EXP-0037 Completed Blind-Evaluation Commit)  
**Ancestor Lineage:**  
- Verifier Champion: `3f6e99c` / `4372d43` (EXP-0037 Candidate A4: Ambiguity Routing Guard + P4_neutral + Dynamic Confidence Thresholds)  
- Structured Semantic NLI: `d8c1ed3` (EXP-0036 N7 Polarity & Predicate Decomposition)  
- Dynamic Gating Champion: `f392b13` / `2bcccca` (EXP-0035 G6 Intent & Clause Verifier)  
- Retrieval Fusion Champion: `b2fb2f2` (EXP-0034 Hybrid Dense M2, pool=15, $\alpha=0.50$, Min-Max [0.40, 0.85])  
**Branch:** `exp-0038`  
**Date:** 2026-09-17  
**Status:** DEVELOPMENT PHASE — STRICT ZERO-LEAKAGE PROTOCOL  

---

## 1. Scientific Motivation & Empirical Problem Statement

In all preceding experiments (EXP-0025 through EXP-0037), the underlying curriculum evidence corpus was segmented using a legacy PHP heuristic regex chunker:
* **Configuration:** `chunkSize = 650` characters, `chunkOverlap = 100` characters.
* **Corpus Yield:** 23 chunks across 5 curriculum modules (14,350 source characters).
* **Limitations of Naive Regex Chunking:**
  1. **Syntactic Boundary Fractures:** Regex chunking splits text strictly by character length windows, potentially severing code blocks, bullet lists, and cohesive technical propositions across artificial boundaries.
  2. **Token Redundancy from Overlap:** A fixed 100-character overlap (15.38% overlap rate across the corpus) causes redundant duplicate phrases to be indexed and repeatedly retrieved into top-$k$ evidence pools.
  3. **Loss of Structural Document Hierarchy:** Standard chunk text strips out hierarchical context (document title, section, subsection), leaving isolated chunks without parent heading semantics during dense vector representation.
  4. **Tokenizer Misalignment:** Fixed character windows ignore underlying transformer token budgets (e.g. 512 tokens for `BAAI/bge-small-en-v1.5`), causing unpredictable token lengths and risk of truncation.

EXP-0038 isolates and evaluates the **evidence chunk construction layer** by introducing **Docling HybridChunker**:
* A structure-aware chunking framework natively coupled to the document tree (`DoclingDocument`), respecting section boundaries, code blocks, lists, and hierarchical metadata.
* Token-aware budgeting strictly calibrated to `BertTokenizer` (`max_tokens = 512`), guaranteeing 0% token truncation.
* Clear architectural separation between `raw_text` (pure evidence passed to downstream verifier) and `embedding_text` (contextualized text with hierarchical headings prepended for dense retrieval).

---

## 2. Research Questions & Formal Hypotheses

### Primary Research Question
Does replacing naive regex chunking (Control C0) with Docling structure-aware `HybridChunker` (Intervention C1) improve retrieval recall and downstream premise verification without introducing regressions or exceeding the safety envelope?

### Formal Hypotheses
* **H1 (Retrieval Recall & Precision):** Intervention C1 maintains or exceeds Control C0 Recall@5 ($\ge 97.00\%$) while improving MRR and nDCG@5 on in-curriculum queries due to contextualized heading enrichment.
* **H2 (Downstream Non-Inferiority):** Downstream verifier A4 accuracy on C1 evidence is non-inferior to C0 on the $N=400$ development dataset ($\Delta \text{Accuracy} \ge -1.0\%$).
* **H3 (Safety Envelope Preservation):** Standard False Acceptance Rate (FAR) remains strictly bounded $\le 18.50\%$, and False Refutation Rate (FRR) remains $\le 12.00\%$.
* **H4 (Structural Chunk Economy):** C1 reduces chunk count (21 coherent chunks vs 23 regex chunks) while eliminating artificial overlap (0.0% overlap vs 15.38%), eliminating duplicate evidence tokens in top-$k$ pools.
* **H5 (100% Content Preservation Gate):** Every substantive word token and technical term from the source curriculum documents is 100% preserved in C1 (0% information loss).

---

## 3. Strict Scope Boundaries & Invariants

To guarantee scientific rigor, strict experimental boundaries are enforced:
1. **Zero Blind Dataset Exposure:** `EXP-0033-BLIND-DATASET.json` ($N=500$, SHA-256 `3b4fd6c7...`) remains completely uninspected, unparsed, and unreferenced. No blind benchmark may be run during development.
2. **Production Repository Protection:** `EduConnect-LMS-Production` must remain 100% untouched. All development takes place in `EduConnect-LMS-Experimental` on branch `exp-0038`.
3. **Frozen Champion Verifier (A4):** The downstream verifier logic in `backend/rag_ambiguity_guard_verifier.php` remains completely frozen:
   - Ambiguity Routing Guard: enabled
   - Few-shot prompt: `P4_neutral` (calibrated neutrality prior)
   - Dynamic confidence thresholds: $\tau_{\text{entail}} = 0.85$, $\tau_{\text{contra}} = 0.80$ for guarded cases
   - No prompt changes, no threshold changes, no model swaps.
4. **Frozen Retrieval Pipeline:**
   - Dense bi-encoder: `BAAI/bge-small-en-v1.5` (384-dimensional, normalized L2 vectors)
   - Cross-encoder reranker: `cross-encoder/ms-marco-MiniLM-L-6-v2` (top 20 candidate reranking)
   - Score calibration: Platt scaling ($a = 0.6236, b = 3.2801$)
   - Score fusion: M2 linear combination ($0.50 \times \text{norm}(dense) + 0.50 \times \text{platt}(cross)$)
   - Candidate pool size: 15; top 5 selected for downstream verifier.

---

## 4. Controlled Experimental Conditions

| Parameter | Control Condition (C0) | Intervention Condition (C1) | Isolation Rationale |
|---|---|---|---|
| **Chunker Algorithm** | Legacy PHP regex chunker | Docling native `HybridChunker` | Direct causal test of chunking methodology |
| **Max Chunk Size** | 650 characters (~163 tokens) | 512 tokens (~2048 characters max) | Aligned with transformer context window |
| **Overlap Policy** | 100 characters (15.38% corpus overlap) | 0 characters (0.0% overlap, structural) | Eliminates duplicate evidence redundancy |
| **Total Chunks** | 23 chunks | 21 chunks | Natural structural semantic boundaries |
| **Document Representation** | Flat string text | `DoclingDocument` hierarchical tree | Structure-aware boundary identification |
| **Embedding Context** | Plain text title + chunk | Hierarchical parent headings + chunk | Semantic enrichment for bi-encoder |
| **Evidence Purity** | Raw chunk text | Raw chunk text (`raw_text`, unpolluted) | Verifier receives exact curriculum facts |
| **Database Table** | `material_chunks_exp0032` | `material_chunks_exp0038_c1` | Completely isolated database storage |
| **Embedding Model** | `BAAI/bge-small-en-v1.5` | `BAAI/bge-small-en-v1.5` | Invariant |
| **Reranker Model** | `ms-marco-MiniLM-L-6-v2` | `ms-marco-MiniLM-L-6-v2` | Invariant |
| **Downstream Verifier** | Frozen Candidate A4 | Frozen Candidate A4 | Invariant |

---

## 5. Ingestion Discipline & Content Preservation Protocol

When ingesting curriculum materials containing markdown syntax, code snippets, and raw HTML tags (e.g. `<header>`, `<nav>`, `<article>`, `<main>`), naive markdown parsers often treat tag-like syntax as unclosed HTML elements and drop them from the parse tree.

To prevent this data loss, `backend/docling_chunker.py` employs a programmatic construction pipeline:
1. Source texts are parsed line-by-line into clean structural nodes (`doc.add_heading`, `doc.add_text`, `doc.add_code`, `doc.add_list_item`).
2. HTML tag descriptions are preserved intact as structured list items and text nodes.
3. Content preservation verification (`scratch/verify_exp0038_content_preservation.py`) compares the word token set of all 5 source documents against the concatenated C1 chunk texts.
4. **Verification Gate Result:** **100.0% word token coverage** (1,320 / 1,320 words matched), 0 missing technical terms. **PASS**.
