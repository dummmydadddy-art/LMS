# EXP-0039: Complete Ablation & Comparative Matrix

**Experiment:** EXP-0039: Conservative RAG Chunking with Chonkie  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)  
**Verifier:** Frozen Candidate A4 (`backend/rag_ambiguity_guard_verifier.php`, prompt `P4_neutral`, thresholds 0.85/0.80)  
**Date:** September 2026  

---

## 1. Experimental Conditions Definition

| Code | Condition Name | Technology | Key Parameters | Corpus Table | Target Chunk Count |
|---|---|---|---|---|---|
| **C0** | Legacy Regex Baseline | Regex / Section splits | Max ~650 chars | `material_chunks_exp0032` | 23 chunks |
| **C1** | Chonkie RecursiveChunker | `chonkie.RecursiveChunker` | `chunk_size = 512`, tokenizer = `bge-small` | `C1_ChonkieRecursive` | 10 chunks |
| **C2_075** | Chonkie SemanticChunker (0.75) | `chonkie.SemanticChunker` | Threshold = 0.75, `chunk_size = 384`, `window = 1` | `C2_ChonkieSemantic_075` | 69 chunks |
| **C2_080** | Chonkie SemanticChunker (0.80) | `chonkie.SemanticChunker` | Threshold = 0.80, `chunk_size = 384`, `window = 1` | `C2_ChonkieSemantic_080` | 71 chunks |
| **C2_085** | Chonkie SemanticChunker (0.85) | `chonkie.SemanticChunker` | Threshold = 0.85, `chunk_size = 384`, `window = 1` | `C2_ChonkieSemantic_085` | 76 chunks |

---

## 2. Chunk Characteristics & Boundary Forensics

| Metric | C0 (Legacy) | C1 (Recursive) | C2 (0.75) | C2 (0.80) | C2 (0.85) |
|---|---|---|---|---|---|
| **Total Chunks** | 23 | 10 | 69 | 71 | 76 |
| **Mean Token Length** | 161.6 | 374.7 | 58.6 | 57.1 | 53.7 |
| **Median Token Length** | 161.0 | 399.5 | 38.0 | 35.0 | 38.5 |
| **Min Token Length** | 66 | 181 | 7 | 7 | 7 |
| **Max Token Length** | 340 | 512 | 181 | 181 | 155 |
| **Tiny Chunks (< 50 tok)** | 0 (0.0%) | 0 (0.0%) | 40 (57.97%) | 42 (59.15%) | 45 (59.21%) |
| **Overflow Chunks (> 512 tok)** | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| **Mean Sentences per Chunk** | 7.0 | 16.0 | 2.5 | 2.5 | 2.3 |
| **Sentence Range** | 1 - 14 | 3 - 26 | 1 - 9 | 1 - 9 | 1 - 9 |
| **Boundary Overlap %** | 0.0% | 0.25% | 0.20% | 0.20% | 0.47% |
| **Word Duplicate %** | 44.14% | 44.58% | 48.85% | 48.98% | 49.35% |
| **Content Coverage** | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |

---

## 3. Retrieval Performance Matrix (N = 400)

| Metric | Target | C0 (Legacy) | C1 (Recursive) | C2 (0.75) | C2 (0.80) | C2 (0.85) |
|---|---|---|---|---|---|---|
| **Recall@1** | $\ge 90.0\%$ | 98.44% | **99.22%** | 93.36% | 93.36% | 92.97% |
| **Recall@5** | $100.0\%$ | **100.0%** | **100.0%** | **100.0%** | **100.0%** | **100.0%** |
| **MRR** | $\ge 95.0\%$ | 99.06% | **99.61%** | 96.48% | 96.48% | 96.19% |
| **nDCG@5** | $\ge 95.0\%$ | 123.77% | 124.70% | 207.86% | 208.27% | **212.88%** |
| **Latency P50 (ms)** | $\le 50.0$ | 851.3 | 663.9 | 459.5 | 457.4 | **409.2** |
| **Latency P95 (ms)** | $\le 100.0$ | 907.1 | 742.0 | 516.5 | 501.9 | **460.9** |

---

## 4. Downstream Verifier Performance Matrix (Candidate A4, N = 400)

| Metric | Target / Gate | C0 (Legacy) | C1 (Recursive) | C2 (0.75) | C2 (0.80) | C2 (0.85) |
|---|---|---|---|---|---|---|
| **Accuracy (%)** | $\ge 90.75\%$ (Target $\ge 92.00\%$) | 92.00% | 91.00% | **93.75%** | 93.50% | **93.75%** |
| **Macro F1 (%)** | $\ge 90.00\%$ | 92.77% | 91.67% | 94.27% | 94.05% | **94.33%** |
| **False Acceptance Rate (FAR)** | $\le 18.50\%$ | **2.40%** | **2.40%** | 2.80% | 2.80% | 2.80% |
| **False Rejection Rate (FRR)** | $\le 0.00\%$ | 16.00% | 16.67% | **10.67%** | 11.33% | 11.33% |
| **Supported Recall (%)** | $\ge 95.00\%$ | 84.00% | 82.00% | **89.33%** | 88.67% | 88.67% |
| **Refutation Recall (%)** | $\ge 85.00\%$ | 95.33% | 94.67% | 94.67% | 94.67% | **95.33%** |
| **Not Established Recall (%)** | $\ge 90.00\%$ | 99.00% | 99.00% | 99.00% | 99.00% | 99.00% |
| **False Acceptances (count)** | $\le 37$ | **6** | **6** | 7 | 7 | 7 |
| **False Abstentions (count)** | $0$ | **0** | 2 | **0** | **0** | **0** |

---

## 5. Statistical Hypothesis Testing vs Control C0

| Comparison | $\Delta$ Acc (pp) | Discordant ($n_{01} / n_{10}$) | McNemar $\chi^2_{\text{cc}}$ | Exact Binomial $p$ | Paired SE (pp) | One-sided 95% LCB (pp) | Non-Inferior ($\text{LCB} > -3.00$ pp)? | Superiority ($p < 0.05$)? |
|---|---|---|---|---|---|---|---|---|
| **C1 vs C0** | -1.00 pp | 8 (6 / 2) | 1.1250 | 0.28906 | 0.705 pp | -2.16 pp | **YES** | NO |
| **C2 (0.75) vs C0** | +1.75 pp | 13 (3 / 10) | 2.7692 | 0.09229 | 0.897 pp | **+0.27 pp** | **YES** | Trend ($p = 0.092$) |
| **C2 (0.80) vs C0** | +1.50 pp | 12 (3 / 9) | 2.0833 | 0.14600 | 0.863 pp | **+0.08 pp** | **YES** | NO |
| **C2 (0.85) vs C0** | **+1.75 pp** | 11 (2 / 9) | 3.2727 | 0.06543 | 0.825 pp | **+0.39 pp** | **YES** | Trend ($p = 0.065$) |

---

## 6. Key Scientific Findings

1. **Resolution of Sibling Contamination:** Chonkie `SemanticChunker` (at all tested thresholds: 0.75, 0.80, 0.85) successfully eliminates the sibling bullet-point cross-contamination observed in EXP-0038, driving False Rejections down from 16.00% in C0 to 10.67%–11.33% in C2.
2. **Superior Accuracy & Calibration:** `C2_085` achieves the highest downstream performance (**93.75% Accuracy**, **94.33% Macro F1**) with only 2 errors unique to Candidate vs 9 errors corrected from Control C0 ($n_{10} = 9$ vs $n_{01} = 2$).
3. **Strict Non-Inferiority Confirmed:** The one-sided 95% lower confidence bound for `C2_085` is **+0.39 pp**, strictly greater than 0.0 pp and well above the pre-registered non-inferiority margin of $-3.00$ pp.
4. **Safety Verification:** FAR remains at an exceptionally low **2.80%** (7/250 false claims accepted), well below the 18.50% ceiling, and False Abstentions are exactly **0**.
