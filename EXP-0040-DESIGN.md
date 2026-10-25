# EXP-0040: Hierarchical Parent-Child Retrieval Specification

**Experiment:** EXP-0040: Hierarchical Parent-Child Retrieval  
**Branch:** `exp-0040`  
**Parent Commit:** `f556585ea166406bbe8961ebeedac8b8950c3f54` (EXP-0039 Reconciliation HEAD)  
**Adopted Leaf Corpus:** `C2_ChonkieSemantic_085` (76 leaf chunks, BGE-small embeddings)  
**Frozen Verifier:** Candidate A4 (`backend/rag_ambiguity_guard_verifier.php`, SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e`)  
**Date:** September 2026  
**Status:** IMPLEMENTED & AUDITED  

---

## 1. Executive Summary & Research Motivation

In EXP-0039, the candidate `C2_085` (Chonkie `SemanticChunker` with threshold 0.85) was adopted as the new standard curriculum chunking architecture. While C2_085 eliminated regex chunking artifacts and reduced false rejection rates, detailed forensic analysis identified candidate regressions where complementary counter-evidence was split across adjacent semantic chunks (e.g. an overarching rule in one chunk and its operational constraint/exception in a sibling chunk). Because small semantic chunks were retrieved independently, the complementary chunk occasionally fell below rank 5, causing downstream verification errors on complex false premise and adversarial queries.

**EXP-0040** investigates the classic **small-to-big hierarchical retrieval pattern**:
- **Child Chunks (Indexed Semantic Unit):** The 76 adopted `C2_085` semantic proposition chunks remain the exact, unmodified indexed retrieval units. They are embedded with `BAAI/bge-small-en-v1.5` and reranked with `cross-encoder/ms-marco-MiniLM-L-6-v2`.
- **Parent Groups (Bounded Context Assembly Unit):** Contiguous child chunks belonging to the same section in the same document are deterministically aggregated into bounded parent groups (maximum 3 adjacent child chunks, <= 512 tokens).
- **Core Hypothesis:** Retrieving small child chunks first and expanding them to deterministic bounded parent context restores local evidence completeness without degrading retrieval precision, introducing cross-document distractor contamination, or violating latency budgets.

---

## 2. Architectural Principles & Invariants

1. **Child Is the Semantic Unit:** Parents are NOT independently embedded or reranked. The dense similarity and reranker scores are computed strictly at the child level.
2. **Deterministic Bounded Parents:**
   - Same source document and same section heading.
   - Strictly sequential within the original document order.
   - Maximum 3 contiguous child chunks per parent group.
   - Absolute token safety ceiling of 512 tokens (observed maximum parent token count is 210 tokens).
   - Zero cross-document merging; zero cross-section merging.
3. **Deterministic Parent Ranking & Aggregation:**
   - If multiple retrieved child candidates belong to the same parent group, their evidence is merged into that parent group.
   - **Primary Parent Score:** Maximum fused score among contributing retrieved children:
     $$s_{\text{parent}} = \max_{c \in \text{contributing}} (s_{\text{fused}}(c))$$
   - **Deterministic Tie-Breakers:**
     1. Number of contributing child hits descending.
     2. Earliest document position (`position_in_document`) ascending.
     3. `parent_id` ascending.
4. **Frozen Downstream Verifier:**
   - Candidate A4 verifier (`backend/rag_ambiguity_guard_verifier.php`) remains completely untouched.
   - Prompts (`P4_neutral`), dynamic confidence thresholds ($0.85$ entailment / $0.80$ contradiction), and ambiguity guard logic remain byte-identical.

---

## 3. Parent-Child Schema Specification

### 3.1 Child Schema
Each of the 76 child chunks in `C2_ChonkieSemantic_085` is mapped to:
- `child_id`: Unique chunk identifier (e.g., `ea1f3b17-0657-4ee2-b155-c56b775dd25e_c2_sem085_11`)
- `parent_id`: Associated parent group identifier
- `source_id`: Source document UUID
- `section_id`: Deterministic section identifier
- `position_in_parent`: 0-indexed position within the parent group (0, 1, or 2)
- `position_in_document`: `chunk_index` in source document (0 to $N-1$)
- `token_count`: BGE-small token length

### 3.2 Parent Schema
Each parent group contains:
- `parent_id`: Unique parent identifier (`PARENT_{{doc_prefix}}_{{sec_num}}_{{p_idx}}`)
- `source_id`: Source document UUID
- `document_title`: Title of the source document
- `section_heading`: Section header text
- `section_id`: Identifier of the enclosing section
- `child_ids`: Ordered list of child chunk IDs
- `parent_content`: Continuous joined text of the constituent chunks in document order without duplicated headings
- `parent_token_count`: Exact token length encoded with `BAAI/bge-small-en-v1.5` tokenizer

---

## 4. Experimental Conditions

- **P0 (Frozen Control):**
  Existing `C2_085` retrieval pipeline from EXP-0039:
  Top-20 BGE-small dense pool $\to$ MiniLM reranker $\to$ Platt scaling $\to$ M2 score fusion ($0.50 \times \text{dense\_norm} + 0.50 \times \text{platt\_prob}$) $\to$ top-5 child chunks returned to A4 verifier.
- **P1 (Hierarchical Candidate):**
  Retrieve top candidate pool using identical child-level ranking $\to$ map children to bounded parent groups $\to$ aggregate parent scores and merge duplicate hits $\to$ return top-5 bounded parent contexts to A4 verifier.
