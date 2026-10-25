# EXP-0039: Chunk Statistics and Forensic Inspection

## 1. Executive Summary

This document provides a comparative statistical inspection of chunk boundary distributions across the 5 evaluated conditions in EXP-0039:
- **Control C0 (Legacy Regex Chunker)**: 23 topical section chunks (untouched baseline).
- **Intervention C1 (Chonkie RecursiveChunker)**: 10 chunks, recursive boundary splitting (chunk_size=512).
- **Intervention C2 (Chonkie SemanticChunker 0.75)**: 69 chunks, cosine similarity clustering (threshold=0.75).
- **Intervention C2 (Chonkie SemanticChunker 0.80)**: 71 chunks, cosine similarity clustering (threshold=0.80).
- **Intervention C2 (Chonkie SemanticChunker 0.85)**: 76 chunks, cosine similarity clustering (threshold=0.85).

## 2. Comparative Chunk Distribution Metrics

| Condition | Chunk Count | Mean Tokens | Median Tokens | Min Tokens | Max Tokens | Tiny (<50 tok) | Overflow (>512) | Mean Sents | Boundary Overlap |
|-----------|-------------|-------------|---------------|------------|------------|----------------|-----------------|------------|------------------|
| `C0_LegacyRegex` | 23 | 161.6 | 161.0 | 66 | 340 | 0 (0.0%) | 0 | 7.0 | 0.0% |
| `C1_ChonkieRecursive` | 10 | 374.7 | 399.5 | 181 | 512 | 0 (0.0%) | 0 | 16.0 | 0.2% |
| `C2_ChonkieSemantic_075` | 69 | 58.6 | 38.0 | 7 | 181 | 40 (57.97%) | 0 | 2.5 | 0.2% |
| `C2_ChonkieSemantic_080` | 71 | 57.1 | 35.0 | 7 | 181 | 42 (59.15%) | 0 | 2.5 | 0.2% |
| `C2_ChonkieSemantic_085` | 76 | 53.7 | 38.5 | 7 | 155 | 45 (59.21%) | 0 | 2.3 | 0.5% |

## 3. Forensic Analysis: Proposition Preservation vs Density Overload

### 3.1 Chonkie RecursiveChunker (C1)
- **Chunk Volume**: Exactly 10 chunks across 5 curriculum documents (2 chunks per document).
- **Token Budget Utilization**: Maximum tokens is 519 (due to hierarchical section prefix), with mean tokens of 381.1 and median of 376.5. Zero raw chunks overflow the 512-token boundary.
- **Proposition Boundary Integrity**: Chonkie RecursiveChunker preserves whole sentences and bullet paragraphs without arbitrary mid-word breaks. However, because chunk_size is 512, it aggregates multiple related subsections into single chunks.

### 3.2 Chonkie SemanticChunker (C2 Grid: 0.75, 0.80, 0.85)
- **Chunk Granularity**: As threshold increases from 0.75 to 0.85, chunk count increases monotonically from 69 to 76 chunks.
- **Context Fragmentation Risk (< 50 Tokens)**:
  - At threshold 0.75: 40 chunks (57.97%) have < 50 tokens.
  - At threshold 0.80: 42 chunks (59.15%) have < 50 tokens.
  - At threshold 0.85: 45 chunks (59.21%) have < 50 tokens.
- **Hierarchical Context Mitigation**: Prepending section headings ensures that even granular 1-2 sentence chunks retain full curriculum anchor context during retrieval and NLI premise evaluation.

## 4. Verification Gate Compliance
- **Content Preservation Gate**: 100.0% word, character, and heading coverage verified across all 5 documents.
- **Token Safety Gate**: Zero sentences exceeded the 512-token limit (max sentence token count = 196 tokens).
- **Database Persistence**: All tables verified in `database/rag_materials.sqlite3` with valid 384-dimensional binary embeddings.
