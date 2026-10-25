# EXP-0057: Native PageIndex Tool-Mediated Agentic Retrieval — Development Benchmark Analysis ($N=400$)

**Experiment:** EXP-0057: Native PageIndex Agentic Retrieval  
**Branch:** `research-integration`  
**Starting Commit:** `fffbe4e29e0c63025b3c7358d7ca2c5ffc85d311`  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (FROZEN HEAD: `176883227602671b545e061dacf228aedc3271a5`)  
**Date:** September 19, 2026  
**Status:** **DEVELOPMENT BENCHMARK COMPLETE — BLIND EVALUATION NOT STARTED**  

---

## 1. Executive Summary

EXP-0057 evaluates **Native PageIndex tool-mediated agentic retrieval using custom local orchestration** against the established Control C1 (**EXP-0056 PageIndex-derived deterministic structural routing**) across the frozen 400-case development dataset (`EXP-0025-DEVELOPMENT-DATASET.json`).

The core scientific inquiry is:
> *"Does native PageIndex tool-mediated agentic tree retrieval improve downstream retrieval/verification performance and/or retrieval efficiency relative to deterministic PageIndex-derived structural routing, while preserving the frozen A4 verifier and safety constraints?"*

### Key Audited Development Findings ($N=400$):
1. **Downstream Verification Performance (Primary Endpoint):**
   - **Control C1 (EXP-0056 Deterministic Routing):** **92.00%** [95% Wilson CI: 88.92%, 94.28%] (368/400 correct).
   - **Candidate NPI-1 (Native PageIndex Agentic):** **62.75%** [95% Wilson CI: 57.91%, 67.35%] (251/400 correct).
   - **Observed Delta:** **$-29.25$ percentage points** (McNemar exact two-sided $p < 10^{-6}$, highly statistically significant degradation).
   - **Contingency Breakdown:** $n_{11} = 241$ (both correct), $n_{00} = 22$ (both incorrect), $n_{10} = 127$ (C1 correct, NPI-1 wrong), $n_{01} = 10$ (C1 wrong, NPI-1 correct).
2. **Retrieval Efficiency (Secondary Endpoint):**
   - **Mean Pages Read:** **3.26 pages/query**, corresponding to an observed **85.83% reduction** in pages read relative to the 23-page full-document baseline.
   - **Median Pages Read:** **2.0 pages** (P95: 6.05 pages).
   - **Mean Context Tokens:** **521.7 tokens/query** (Median: 418.0 tokens, P95: 1,136.3 tokens).
   - **Tool Calling Mechanics:** Mean **2.99 tool calls/query**; 97.32% valid on first attempt; 2.68% malformed (all recovered via stateful retry); 0 parallel calls executed; 0 cloud calls.
   - **Retrieval Latency:** Mean **11,578.4 ms** (~11.58 s/query), Median **11,022.95 ms** (~11.02 s/query), P95 **13,832.83 ms** (~13.83 s/query).
3. **Core Failure Mode:**
   - The 3B local LLM (`llama3.2:latest`) successfully executes tool-calling mechanics (100% structured tool completion, 0 execution crashes), but exhibits substantial semantic mapping errors when choosing page arguments from the 50-node document structure. It frequently selects adjacent or completely incorrect document chapters for fine-grained technical concepts, starving the downstream frozen A4 verifier of the authentic curriculum evidence needed to verify claims.

---

## 2. Construct & Architectural Specification

### Construct Terminology
> [!IMPORTANT]
> **Canonical Construct Terminology:**  
> **"Native PageIndex tool-mediated agentic retrieval using custom local orchestration."**  
> *The experiment does not evaluate PageIndex's official `client.chat()` runtime because that local path was not operational with the selected Ollama integration.*

### Architecture Comparison

| Feature | Control C1 (EXP-0056) | Candidate NPI-1 (EXP-0057) |
|---|---|---|
| **Document Indexing** | PageIndex PDF-native Flash (`page_index_flash`) | PageIndex PDF-native Flash (`page_index_flash`) |
| **Index Tree SHA-256** | `9e065536...` (50 nodes, 23 pages) | `9e065536...` (50 nodes, 23 pages) |
| **Routing / Traversal Mechanism** | Deterministic regex/keyword routing to outline nodes | Genuine LLM tool-calling over outline via PageIndex native tools |
| **Tool Execution** | None (Deterministic programmatic selection) | Native `get_document_structure` & `get_page_content` |
| **Orchestration** | Static Python pipeline | 4-State Finite State Machine (Single-tool gated) |
| **Candidate Refinement** | Dense vector search within routed section | Direct authentic page text passed to verifier (No dense search) |
| **Evidence Bridge** | Vector chunks with authentic cosine similarity | Authentic page text with documented non-scoring execution sentinel |
| **Downstream Verifier** | Frozen Candidate A4 Ambiguity Guard Verifier | Frozen Candidate A4 Ambiguity Guard Verifier |

---

## 3. Comprehensive Comparative Scorecard ($N=400$)

Dataset: `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`)

| Metric | Control C1 (EXP-0056) | Candidate NPI-1 (EXP-0057) | Delta | Statistical Significance / Notes |
|---|---|---|---|---|
| **Overall Accuracy** | **92.00%** [88.92%, 94.28%] | **62.75%** [57.91%, 67.35%] | **$-29.25$ pp** | $p < 10^{-6}$ (McNemar exact two-sided) |
| **Macro F1** | **92.67%** | **62.67%** | **$-30.00$ pp** | Severe degradation across classes |
| **False Acceptance Rate (FAR)** | **3.60%** (9/250) [1.91%, 6.70%] | **9.60%** (24/250) [6.54%, 13.89%] | **$+6.00$ pp** | Increased false acceptance |
| **False Rejection Rate (FRR)** | **13.33%** (20/150) [8.80%, 19.70%] | **10.00%** (15/150) [6.15%, 15.84%] | **$-3.33$ pp** | Marginally fewer false rejections |
| **Supported Recall** | **86.67%** (130/150) | **52.00%** (78/150) | **$-34.67$ pp** | Supported claims frequently ungrounded |
| **Refutation Recall** | **93.33%** (140/150) | **50.67%** (76/150) | **$-42.66$ pp** | Polarity evidence missed |
| **NOT_ESTABLISHED Recall** | **98.00%** (98/100) | **97.00%** (97/100) | **$-1.00$ pp** | High preservation of OOD rejection |
| **OOD Recall** | **98.00%** (98/100) | **97.00%** (97/100) | **$-1.00$ pp** | Out-of-curriculum correctly rejected |

### Confusion Matrices

#### Control C1 Confusion Matrix:
| Ground Truth \ Predicted | SUPPORTED | REFUTED | NOT_ESTABLISHED | Total |
|---|---|---|---|---|
| **SUPPORTED** | 130 | 20 | 0 | 150 |
| **REFUTED** | 8 | 140 | 2 | 150 |
| **NOT_ESTABLISHED** | 1 | 1 | 98 | 100 |

#### Candidate NPI-1 Confusion Matrix:
| Ground Truth \ Predicted | SUPPORTED | REFUTED | NOT_ESTABLISHED | Total |
|---|---|---|---|---|
| **SUPPORTED** | 78 | 15 | 57 | 150 |
| **REFUTED** | 24 | 76 | 50 | 150 |
| **NOT_ESTABLISHED** | 0 | 3 | 97 | 100 |

---

## 4. Category-by-Category Breakdown

| Category | Total Cases | Control C1 Accuracy | Candidate NPI-1 Accuracy | Delta | Observed Dynamic |
|---|---|---|---|---|---|
| **OUT_OF_CURRICULUM_UNKNOWN** | 100 | **98.0%** (98/100) | **97.0%** (97/100) | $-1.0$ pp | Agent correctly recognizes topics missing from tree outline |
| **SUPPORTED_CURRICULUM** | 100 | **84.0%** (84/100) | **43.0%** (43/100) | $-41.0$ pp | Model selects wrong section -> Evidence lacks support -> NOT_ESTABLISHED |
| **NOVEL_FALSE_PREMISE** | 100 | **94.0%** (94/100) | **53.0%** (53/100) | $-41.0$ pp | Model misses exact passage -> A4 cannot detect polarity contradiction |
| **LEGITIMATE_NEGATION** | 50 | **92.0%** (46/50) | **70.0%** (35/50) | $-22.0$ pp | Partial section matches allow NLI entailment on negative claims |
| **MIXED_COMPOUND_PREMISE** | 50 | **92.0%** (46/50) | **46.0%** (23/50) | $-46.0$ pp | Compound queries require multiple sections; model retrieves only one |

---

## 5. Retrieval Efficiency & Operational Telemetry

| Metric | Observed Value | Context / Definition |
|---|---|---|
| **Mean Pages Read** | **3.26 pages/query** | **Mean pages read: 3.26/query, corresponding to an observed 85.83% reduction in pages read relative to the 23-page full-document baseline.** |
| **Median Pages Read** | **2.0 pages** | Bounded local reading |
| **P95 Pages Read** | **6.05 pages** | Maximum read per query was 22 pages (rare exhaustive search) |
| **Mean Context Tokens** | **521.7 tokens** | Drastic reduction from 23-page unsegmented baseline (~9,200 tokens) |
| **Median Context Tokens** | **418.0 tokens** | Compact evidence footprint |
| **P95 Context Tokens** | **1,136.3 tokens** | Controlled token consumption |
| **Mean Tool Calls** | **2.99 calls/query** | Typically: Turn 1 (structure) -> Turn 2 (pages) -> Turn 3 (pages/complete) |
| **Median Tool Calls** | **3.0 calls** | Predictable 3-turn agent execution |
| **P95 Tool Calls** | **3.0 calls** | Adheres strictly to state machine |
| **Mean Retrieval Latency** | **11,578.4 ms (11.58 s)** | 3 sequential Ollama calls per query |
| **Median Retrieval Latency** | **11,022.95 ms (11.02 s)** | Highly consistent inference latency |
| **P95 Retrieval Latency** | **13,832.83 ms (13.83 s)** | No runaway loops or hanging requests |
| **Tool-Call Failure Rate** | **0.00%** | Zero unhandled tool execution exceptions |
| **Malformed Call Rate** | **2.68%** | 2.68% prose tool calls caught & recovered via state machine |
| **Parallel Calls Detected** | **1** | Caught by wrapper and retried as single call |
| **Cloud Calls / Telemetry** | **0** | 100% offline local Ollama execution |

---

## 6. Paired Statistical Analysis

### Contingency Table ($2 \times 2$)
```
                     Candidate NPI-1 Correct    Candidate NPI-1 Wrong    Total
Control C1 Correct            241 (n11)                  127 (n10)        368
Control C1 Wrong               10 (n01)                   22 (n00)         32
Total                         251                        149              400
```

### Statistical Test
- **Discordant Pairs:** $b = n_{10} = 127$, $c = n_{01} = 10$. Total discordant = 137.
- **McNemar Exact Two-Sided $p$-value:**
  $$P = 2 \sum_{k=0}^{10} \binom{137}{k} (0.5)^{137} \approx 1.25 \times 10^{-25} \ll 0.001$$
- **Inference:** The performance difference between Control C1 and Candidate NPI-1 is highly statistically significant. Candidate NPI-1 is decisively inferior to Control C1 in downstream verification accuracy under the local `llama3.2:latest` model.

---

## 7. Forensic Analysis of Discordant Predictions

A total of **137 discordant predictions** were recorded. Every discordant case was individually audited and classified using observational evidence from `EXP-0057-DEVELOPMENT-TRACES.jsonl`:

### 1. C1 Correct, NPI-1 Wrong ($n_{10} = 127$ cases)

| Observed Cause Classification | Count | Pct of $n_{10}$ | Description & Observational Pattern |
|---|---|---|---|
| **Wrong Section Selection** | 92 | 72.4% | When presented with the 50-node outline, the model selected an unrelated module (e.g., selecting JavaScript pages 6-7 or Database pages 20-21 when asked about CSS Flexbox properties on pages 3-4). The retrieved text lacked the target concept, causing A4 to default to `NOT_ESTABLISHED` or trigger false contradiction. |
| **Over-Broad or Adjacent Page Selection** | 21 | 16.5% | The model selected pages adjacent to the target (e.g., selecting pages 13-14 for `useEffect` when the exact hook lifecycle definition was on pages 11-12). The partial context lacked sufficient premise support. |
| **A4 Verifier Behavior on Compound Clauses** | 10 | 7.9% | In mixed compound queries (`DEV-MIX-*`), the query spanned two distinct topics (e.g., HTML semantics + React state). The model retrieved pages for only one topic; A4 correctly decomposed the clauses and rejected the compound premise as unestablished. |
| **Insufficient Evidence / No Pages Selected** | 4 | 3.1% | The model prematurely concluded `OUT_OF_CURRICULUM` or returned empty pages for an in-curriculum query, leaving the verifier with 0 evidence chunks. |

#### Representative $n_{10}$ Failure Case:
* **Query ID:** `DEV-SUP-001`
* **Query:** *"How does display: flex initiate flex formatting context?"*
* **Ground Truth:** `SUPPORTED` (Pages 3-4, CSS Flexbox Guide)
* **Control C1:** `SUPPORTED` (Routed via deterministic regex to CSS Flexbox module -> Retrieved pages 3-4 chunks with similarity 0.98 -> A4 verified)
* **Candidate NPI-1:** `REFUTED` (Model inspected outline and called `get_page_content(pages='6, 7, 20, 21')` [JavaScript Scope & Database Normalization] -> A4 evaluated JavaScript text against CSS query -> Tier-2 NLI detected semantic contradiction with unrelated text).

### 2. C1 Wrong, NPI-1 Correct ($n_{01} = 10$ cases)

| Observed Cause Classification | Count | Pct of $n_{01}$ | Description & Observational Pattern |
|---|---|---|---|
| **Better Structural Navigation / OOD Discrimination** | 7 | 70.0% | Deterministic keyword matching in C1 caused a false positive route on an OOD query containing a common keyword (e.g., "object" or "state"), whereas the LLM observed the full outline and correctly judged that the external technology was not in the curriculum. |
| **Better Structural Navigation / Exact Evidence Retrieval** | 3 | 30.0% | The LLM successfully navigated complex multi-topic queries that bypassed C1's single-module router, retrieving exactly the cross-cutting pages needed for A4 verification. |

#### Representative $n_{01}$ Success Case:
* **Query ID:** `DEV-OOD-042`
* **Query:** *"How does Redux Toolkit createSlice automatically generate action creators?"*
* **Ground Truth:** `NOT_ESTABLISHED` (Out of curriculum)
* **Control C1:** `REFUTED` (C1 keyword router matched "action" / "state" to React module -> Retrieved React hooks -> A4 refuted on wrong evidence)
* **Candidate NPI-1:** `NOT_ESTABLISHED` (Model inspected outline, noted absence of Redux Toolkit, and returned 0 pages / concluded OOD -> A4 returned `NOT_ESTABLISHED` with 0 evidence).

---

## 8. Scientific & Architectural Conclusions

1. **Agentic Mechanics are Operationally Sound:**
   The custom local state-machine orchestration layer proved completely reliable: 100% structured tool completion, 0 execution errors, 0 runaway loops, and 0 parallel call corruptions. The stateful gating architecture successfully constrained `llama3.2:latest` into deterministic 3-turn interactions.
2. **Small-Model Reasoning is the Empirical Bottleneck:**
   The failure of NPI-1 is not infrastructural; it is epistemic. `llama3.2:latest` (3B parameters) lacks the semantic granularity to reliably map fine-grained technical queries to the appropriate chapter nodes in a 50-node outline. As a result, it selects the wrong pages in ~37% of in-curriculum queries.
3. **Deterministic Structural Routing (C1) Remains Superior:**
   Deterministic regex/keyword mapping against the PageIndex tree (EXP-0056) achieves **92.00% accuracy** because human-engineered structural boundaries eliminate LLM page-hallucination while still cutting candidate search space by 58.13%.
4. **Protocol Boundary Enforcement:**
   In strict compliance with Section 12 of the authorization:
   - $N=400$ development evaluation is **COMPLETE**.
   - $N=500$ blind evaluation has **NOT BEEN STARTED**.
   - `EXP-0033-BLIND-DATASET.json` remains untouched and locked.
   - `EXP-0057-BLIND-PREDICTIONS.json` has **NOT** been generated.
