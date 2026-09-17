# EXP-0056: Independent Scientific & Architectural Audit

**Experiment:** EXP-0056: PageIndex Structural Navigation for Retrieval-Efficient RAG  
**Branch:** `research-integration`  
**Base Commit:** `3af3418d029cc7ab3820cc95b7931ecd7e277bfa`  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (FROZEN HEAD: `176883227602671b545e061dacf228aedc3271a5`)  
**Auditor:** Antigravity Autonomous Research Agent  
**Date:** September 17, 2026  
**Operational Decision:** **ADOPT**  
**Scientific Claim:** **CONDITIONAL**  
**Status:** RECONCILED & AUDITED  

---

## 1. Executive Summary

EXP-0056 evaluated **PageIndex PDF-native indexing** and **PageIndex-derived structural routing** within the frozen EXP-0040 + Candidate A4 RAG architecture. The objective was to determine whether structural routing over a hierarchical PDF document tree could restrict dense retrieval candidate search space and context token consumption while preserving or enhancing downstream verification accuracy and safety.

### Key Audited Findings:
1. **Critical Construct Classification:**
   - **Document Tree Extraction:** Genuine upstream **PageIndex PDF-native indexing** (`pageindex==0.2.18`, engine: `pageindex.page_index_flash`) executed strictly locally with 100.0% page coverage, 0 missing pages, and 0 MB GPU VRAM across all evaluated PDFs.
   - **Query Routing:** Query-to-node routing was performed by **PageIndex-derived deterministic structural routing** (deterministic regular expression and keyword matching logic mapping queries to the structural outline nodes extracted by PageIndex Flash). It did **not** exercise native PageIndex agentic reasoning retrieval (`agent_tools` / LLM-based tree traversal).
   - **Construct Identity:** The experiment validly evaluates **PageIndex-derived structural routing**, not native PageIndex agentic retrieval.
2. **Search Space Reduction (Primary Endpoint 1):**
   - Candidate pages routed before dense retrieval were reduced by **58.13% across all 500 blind queries** (from 23 baseline pages to an average of 9.63 candidate pages) and by **79.85% across routed queries** (from 23 pages to 4.63 pages).
   - Candidate context tokens were reduced by **58.36%** across the blind benchmark.
   - *Note on Scope:* These efficiency measurements are observed on the evaluated curriculum corpus and query benchmark; they are not generalized beyond this setting.
3. **Safe Bounded Fallback (Primary Endpoint 2):**
   - Queries with out-of-curriculum concepts or cross-module ambiguity automatically escalated to full global search at a fallback rate of **27.20% on the blind benchmark** (and **31.00% on development set**), satisfying the $\le 35\%$ pre-registered criterion.
4. **Downstream Accuracy & Safety:**
   - On the locked, pre-registered blind benchmark ($N = 500$, `EXP-0033-BLIND-DATASET.json`):
     - **Accuracy:** Control B0 = **72.00%** [95% Wilson CI: 67.91%, 75.76%]; Candidate C1 = **72.80%** [95% Wilson CI: 68.74%, 76.52%].
     - **Observed Difference:** $+0.80$ percentage points.
     - **False Acceptance Rate (FAR):** Control B0 = **17.07%** (49/287) [95% Wilson CI: 13.16%, 21.85%]; Candidate C1 = **16.03%** (46/287) [95% Wilson CI: 12.24%, 20.72%]. The observed FAR is below the $17.50\%$ safety ceiling.
5. **Statistical Significance & Inferential Scope:**
   - McNemar's paired test on the blind holdout: 358 both correct, 134 both incorrect, 2 regressions, 6 improvements ($n_{10} = 2, n_{01} = 6$).
   - Edwards-corrected $\chi^2 = 1.1250$, exact two-sided binomial $p = 0.2891$.
   - **Inferential Correction:** The paired accuracy difference was not statistically significant by McNemar's test. Formal non-inferiority was not established by McNemar's test alone, as that requires computing a one-sided paired risk-difference confidence bound against the pre-registered non-inferiority margin.

---

## 2. Construct-Fidelity Audit

| Pipeline Stage | Implementation Mechanism | Upstream Module / Function | Construct Classification |
|---|---|---|---|
| **Document Indexing** | Genuine PDF character span clustering & outline extraction | `pageindex.page_index_flash(document_path, summary=False, optimize=False, use_embedded_toc=True)` | **PageIndex PDF-native indexing** (Genuine Upstream) |
| **Document Outline** | Hierarchical Node tree (root module $	o$ section $	o$ page range) | `PageIndexAdapter.build_tree()` in `research/document_navigation/pageindex_adapter.py` | Genuine structural tree |
| **Query Routing** | Deterministic keyword and regex matching against module/section topics | `route_query()` in `scratch/exp0056_retrieval_builder.py` & `search_tree()` in `pageindex_adapter.py` | **PageIndex-derived deterministic structural routing** (Custom Local Logic) |
| **Dense Candidate Restriction** | Filtering candidate pool to routed module's chunks prior to scoring | `build_c1_cache()` | Bounded candidate pool |
| **Bounded Fallback** | Fallback to full 23-page / 76-chunk global search on uncertainty | `route_query()` returning `None` $	o$ `fallback_active = True` | Bounded fallback |
| **Downstream Verifier** | Frozen Candidate A4 Ambiguity Guard Verifier | `RagAmbiguityGuardVerifier::verify()` in `backend/rag_ambiguity_guard_verifier.php` | Candidate A4 (Frozen) |

### Construct Statement:
PageIndex indexing was genuine PDF-native execution via `page_index_flash`. Query routing was PageIndex-derived deterministic structural routing (custom regular expression and keyword matching logic mapping queries to structural outline nodes extracted by PageIndex Flash). Therefore, this experiment should be interpreted as evaluating **PageIndex-derived structural routing** rather than native PageIndex agentic retrieval.

---

## 3. PDF Fidelity Benchmark vs. Retrieval Correctness

Fidelity was verified across 4 real multi-page PDF documents without simulation:

| Document | Total Pages | Extracted Nodes | Depth | Page Coverage | Missing Pages | Latency (sec) | Delta RSS | VRAM | Fidelity Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `multipage_curriculum.pdf` | 5 | 5 | 1 | **100.0%** | 0 | 0.908s | +44.84 MB | 0.0 MB | **PASS** |
| `curriculum_20p.pdf` | 20 | 20 | 1 | **100.0%** | 0 | 0.118s | +6.19 MB | 0.0 MB | **PASS** |
| `curriculum_50p.pdf` | 50 | 53 | 2 | **100.0%** | 0 | 0.349s | +12.80 MB | 0.0 MB | **PASS** |
| `curriculum_full.pdf` | 23 | 50 | 3 | **100.0%** | 0 | 0.315s | +1.84 MB | 0.0 MB | **PASS** |

### Distinction Note:
Page-coverage fidelity establishes that `page_index_flash` accurately maps all PDF pages into the structural tree without missing pages or duplicate spans. Page-coverage fidelity is distinct from retrieval correctness; high structural fidelity is a necessary prerequisite for routing, but does not guarantee downstream verifier accuracy.

---

## 4. Controlled Development Benchmark Evaluation ($N = 400$)

Dataset: `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`).  
Control: Condition B0 (EXP-0040 Global Hierarchy Baseline).  
Candidate: Condition C1 (PageIndex-Derived Structural Routing).  
Verifier: Candidate A4 (`rag_ambiguity_guard_verifier.php`, frozen mode A4).

| Metric | Control B0 | Candidate C1 | Delta | Notes |
|---|---|---|---|---|
| **Accuracy** | 92.75% | 92.00% | $-0.75$ pp | 368 both correct, 29 both incorrect |
| **Macro F1** | 93.39% | 92.67% | $-0.72$ pp | Balanced across classes |
| **False Acceptance Rate (FAR)** | 3.20% | 3.60% | $+0.40$ pp | Safe ($\le 17.50\%$) |
| **False Rejection Rate (FRR)** | 12.67% | 13.33% | $+0.66$ pp | Stable |
| **Supported Recall** | 87.33% | 86.67% | $-0.66$ pp | Stable |
| **Refutation Recall** | 98.00% | 97.00% | $-1.00$ pp | Stable |
| **NOT_ESTABLISHED Recall** | 94.67% | 94.67% | $0.00$ pp | Identical |
| **Mean Page Reduction (All)** | 0.00% | **55.18%** | $+55.18$ pp | Candidate pages before dense retrieval |
| **Mean Page Reduction (Routed)**| 0.00% | **79.98%** | $+79.98$ pp | When structural match is confident |
| **Mean Context Token Reduction**| 0.00% | **55.29%** | $+55.29$ pp | Context tokens in candidate pool |
| **Fallback Frequency** | 0.00% | **31.00%** | $+31.00$ pp | Escalated to global search |

- **Paired Contingency Table ($2 	imes 2$):** $n_{11} = 368, n_{00} = 29, n_{10} = 3, n_{01} = 0$.
- **McNemar Test:** $\chi^2 = 1.3333, p = 0.2500$ (not statistically significant).

---

## 5. Definitive Blind Holdout Benchmark Evaluation ($N = 500$)

Dataset: `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`).  
Predictions: `EXP-0056-BLIND-PREDICTIONS.json` (SHA-256: `175595afa9c71b75bec96b52de9c591190d4d7a751e290190f41d549e1f803a9`, Read-Only Locked).

### Headline Comparative Metrics (Programmatically Verified with Exact Wilson 95% CIs):

| Metric | Baseline B0 (EXP-0040) | Candidate C1 (PageIndex-Derived) | Delta | Pre-Registered Target | Status |
|---|---|---|---|---|---|
| **Overall Accuracy** | 72.00% (360/500) [67.91%, 75.76%] | **72.80% (364/500) [68.74%, 76.52%]** | **+0.80 pp** | $\ge 71.40\%$ | **PASS** |
| **Macro F1** | 72.24% | **73.04%** | **+0.80 pp** | Non-inferior | **PASS** |
| **False Acceptance Rate (FAR)** | 17.07% (49/287) [13.16%, 21.85%] | **16.03% (46/287) [12.24%, 20.72%]** | **-1.04 pp** | $\le 17.50\%$ ceiling | **PASS** |
| **False Rejection Rate (FRR)** | 27.70% (59/213) [22.10%, 34.09%] | **27.23% (58/213) [21.68%, 33.60%]** | **-0.47 pp** | Non-inferior | **PASS** |
| **Supported Recall** | 72.30% (154/213) | **72.77% (155/213)** | **+0.47 pp** | Non-inferior | **PASS** |
| **Refutation Recall** | 67.90% (110/162) | **68.52% (111/162)** | **+0.62 pp** | Non-inferior | **PASS** |
| **NOT_ESTABLISHED Recall** | 76.80% (96/125) | **78.40% (98/125)** | **+1.60 pp** | Non-inferior | **PASS** |
| **Page Reduction (All Queries)** | 0.00% | **58.13%** | **+58.13 pp** | $\ge 50.00\%$ | **PASS** |
| **Page Reduction (Routed)** | 0.00% | **79.85%** | **+79.85 pp** | Substantial | **PASS** |
| **Context Token Reduction** | 0.00% | **58.36%** | **+58.36 pp** | $\ge 50.00\%$ | **PASS** |
| **Fallback Frequency** | 0.00% | **27.20%** | **+27.20 pp** | $\le 35.00\%$ | **PASS** |

### Paired $2 	imes 2$ Contingency Table:
$$egin{array}{c|cc|c}
& 	ext{C1 Correct} & 	ext{C1 Incorrect} & 	ext{Total} \
\hline
	ext{B0 Correct} & 358 & 2 & 360 \
	ext{B0 Incorrect} & 6 & 134 & 140 \
\hline
	ext{Total} & 364 & 136 & 500
\end{array}$$

- **Discordant Pairs:** $n_{10} + n_{01} = 2 + 6 = 8$
- **McNemar Chi-Square (Edwards Corrected):**
  $$\chi^2 = rac{(|6 - 2| - 1)^2}{6 + 2} = rac{9}{8} = 1.1250$$
- **Exact Binomial Two-Sided $p$-value:** $p = 0.2891$
- **Statistical Assessment:** Observed paired accuracy difference was $+0.80$ percentage points, with 6 improvements and 2 regressions; the paired difference was not statistically significant by McNemar's test ($p = 0.2891$). Formal non-inferiority was not established by McNemar alone.

---

## 6. Forensics of Discordant Cases ($N = 8$)

### A. Improvements ($n_{01} = 6$, B0 Incorrect $	o$ C1 Correct):
In the six improvement cases, the recorded routing and retrieval traces indicate that structural restriction removed distractor passages that were present under global retrieval:
1. `EXP33-SUP-0071` (Node.js fs.promises query): Global search in B0 retrieved a JavaScript promise-chaining chunk from ES6 deep dive, causing false abstention. C1 routed directly to `Node.js & Express REST API Notes` $	o$ Correctly supported.
2. `EXP33-SUP-0116` (SQL LEFT JOIN query): B0 retrieved an HTML table formatting chunk, leading to false refutation. C1 routed to `PostgreSQL Database Design` $	o$ Correctly supported.
3. `EXP33-FLS-0027` (JavaScript closure false claim): B0 was confused by a database transaction scope distractor and falsely accepted the claim (`SUPPORTED`). C1 routed to `JavaScript ES6+ Deep Dive` $	o$ Correctly refuted.
4. `EXP33-AMB-0075` (React prop drilling ambiguous query): B0 pulled in an Express routing hierarchy chunk, triggering false acceptance. C1 routed to `React Hooks Tutorial` $	o$ Correctly abstained (`NOT_ESTABLISHED`).
5. `EXP33-OOD-0043` (React Native OOD query): B0 falsely refuted via React web chunks. C1 detected out-of-curriculum boundary and abstained (`NOT_ESTABLISHED`).
6. `EXP33-ADV-0043` (HTTP POST idempotency false claim): B0 suffered cross-module confusion and falsely accepted. C1 routed to `Node.js & Express REST API Notes` $	o$ Correctly refuted.

### B. Regressions ($n_{10} = 2$, B0 Correct $	o$ C1 Incorrect):
1. `EXP33-FLS-0101` (HTTP 301 temporary redirect claim): Expected `REFUTED`. B0 predicted `REFUTED`; C1 predicted `NOT_ESTABLISHED`.
2. `EXP33-ADV-0005` (HTTP DELETE idempotency query): Expected `SUPPORTED`. B0 predicted `SUPPORTED`; C1 predicted `REFUTED`.  
*Assessment:* Both regressions produced `NOT_ESTABLISHED` or `REFUTED` rather than a false acceptance; no increase in FAR was observed in these two cases.

---

## 7. Operational Verdict vs. Scientific Claim

### Operational Decision: ADOPT
PageIndex-derived structural routing is recommended for adoption in the EduConnect-LMS RAG architecture. It achieves a 58.13% candidate search space reduction and 58.36% context token reduction while reducing False Acceptances by 3 cases (FAR $16.03\%$ vs $17.07\%$).

### Scientific Claim: CONDITIONAL
The scientific findings are qualified as follows:
1. PageIndex PDF-native indexing (`page_index_flash`) was successfully executed with 100% page coverage and 0 VRAM.
2. PageIndex-derived structural routing substantially reduced the measured search space.
3. Downstream blind accuracy increased by 0.80 pp in the observed sample.
4. The paired accuracy difference was not statistically significant by McNemar's test ($p = 0.2891$).
5. Formal non-inferiority was not established by McNemar alone.
6. The query routing mechanism was custom deterministic matching rather than native PageIndex agentic retrieval.
