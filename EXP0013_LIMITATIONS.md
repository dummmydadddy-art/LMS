# EXP-0013: KNOWN LIMITATIONS & SCIENTIFIC BOUNDARY DISCLOSURE

**Experiment ID:** `EXP-0013-CHAMPION-2026-09-09`  
**System:** `EduConnect-LMS-Experimental`  
**Purpose:** Comprehensive, transparent disclosure of all known technical, empirical, architectural, and hardware limitations of the frozen production candidate.

---

## 1. Ground-Truth Ambiguities & Evaluator Discrepancies

### 1.1 `blind_js_14` Multi-Document Ground-Truth Overlap
- **Query:** *"How do setTimeout and the Node.js event loop handle macrotasks?"*
- **Ground-Truth Label:** Labeled exclusively as `JavaScript ES6+ Deep Dive` in the frozen blind holdout benchmark.
- **Observed Retrieval Behavior:** Rank 1 retrieves `Node.js & Express REST API Notes` (Section 1: Event loop & Libuv thread pool), while Rank 2 retrieves `JavaScript ES6+ Deep Dive` (Section 4: Asynchronous JavaScript & Macrotasks).
- **Limitation Analysis:** Because the query explicitly references both `Node.js` and `setTimeout`, retrieving the dedicated Node.js event loop module at Rank 1 is semantically authentic and grounded. However, because the frozen evaluator expects a single document title match, it registers as an IR rank penalty ($MRR = 0.50$ instead of $1.00$). In accordance with strict benchmark freeze protocols, ground-truth labels were **not retroactively altered** to game the evaluator.

### 1.2 `blind_fp_19` Historical Evaluator Labeling Issue
- **Query:** *"Why does React useContext automatically write user authentication data directly into the PostgreSQL database without any backend server?"*
- **Ground-Truth Label:** Historically labeled with the literal string `"Cross-Module"` as `expected_doc` in the blind holdout suite, rather than providing an array of expected curriculum modules.
- **Observed Behavior:** The dynamic query orchestrator correctly classifies the query as `MULTI_MODULE` ($N=3$), dynamically expands retrieval budget to $k=6$, and retrieves balanced chunks across React Hooks, Express REST API, and PostgreSQL Database Design. In the multi-hop evaluation harness, `blind_fp_19` achieves **100% grounded cross-module representation**. However, in the legacy blind evaluator looking for a chunk titled `"Cross-Module"`, it registers as a miss.

---

## 2. Model & Safety Generalization Boundaries

### 2.1 Blind False-Premise Refutation Capped Below 100% (70.0%)
- While Out-of-Domain (OOD) abstention is **100.0%** (125/125 test queries defended), false-premise refutation on unseen blind holdout queries achieves **70.0% (14/20)**.
- In 6 out of 20 edge cases, the 3-billion-parameter Llama 3.2 generator exhibits mild prompt sycophancy when false premises are framed using authoritative technical jargon (e.g. presupposing that React allows hook calls inside conditional statements or that SQL primary keys accept NULL values).
- Eliminating the remaining 30% sycophancy requires either fine-tuned preference alignment (DPO/RLHF) or an explicit two-pass verification chain, which exceeds the latency budget of single-pass student chat.

### 2.2 Answerable False Abstention vs Extreme Caution
- The calibrated confidence threshold ($\tau = 0.65$, logistic margin $\ge 0.12$) is strictly optimized to avoid hallucinating incorrect course answers. Under extreme query truncation (e.g. 1-word ambiguous queries like *"effects"*), the system appropriately demands clarification rather than guessing, which conservative users might perceive as over-cautious.

---

## 3. Hardware & Compute Constraints

### 3.1 Laptop Form-Factor GPU & Thermal Throttling
- **Platform:** NVIDIA GeForce RTX 3050 Laptop GPU (50W TGP, mobile PCIe interface).
- **Thermal Limits:** Under continuous sustained stress (e.g. 64 concurrent clients for > 10 minutes), thermal throttling can degrade peak tensor throughput by 8–12%, causing tail latency (p99) to fluctuate from 1,080 ms to 1,300 ms. Production deployment warrants enterprise-grade datacenter GPUs (e.g. NVIDIA L4 or A10G) with active thermal headroom.

### 3.2 Strict 4 GB VRAM Boundary
- `nomic-embed-text` (308 MB VRAM) and `llama3.2:latest` (2,210 MB VRAM) together consume **2,518.5 MB (~2.46 GB)** of VRAM.
- While this leaves ~1.58 GB of free safety buffer on a 4 GB GPU, it strictly precludes:
  1. Loading larger 7B or 8B parameter models (e.g. Llama-3.1-8B requires ~5.5 GB VRAM in 4-bit quantization).
  2. Loading multi-lingual heavy embedding models like BGE-M3 (~2.2 GB VRAM).
  3. Increasing the batch size beyond $b=16$ without risking CUDA out-of-memory (OOM) during concurrent generation.

---

## 4. Empirical Scope & Workload Dependencies

### 4.1 Benchmark & Corpus Scope Specificity
- The empirical evaluations and performance guarantees documented in EXP-0013 apply specifically to the **EduConnect Computer Science Curriculum Corpus** (5 modules, 105 semantic chunks, 23 document sections).
- Performance across vastly larger corpora (e.g. > 100,000 chunks) will encounter logarithmic vector index degradation and will necessitate transitioning from flat in-memory dot-products to Hierarchical Navigable Small World (HNSW) graph indexing or inverted file vector indices (IVF-PQ).

### 4.2 Query Cache Benefits Depend Strictly on Workload Repetition
- The 99.8 RPS peak throughput and 0.01 ms latency resolution of the LRU cache are contingent upon student query locality.
- As demonstrated in Phase 9 sensitivity analysis:
  - At **0% repetition (100% unique queries)**, cache hit rate is **0.0%**, and throughput is sustained at **55.5–60.8 RPS** purely via micro-batching.
  - At **50% repetition**, throughput reaches **133.9 RPS**.
  - At **75% repetition**, throughput reaches **268.8 RPS**.
- In operational environments where student queries are completely disjoint and unique, system performance reflects Profile A (55.5 RPS), not Profile C (68.4+ RPS).

### 4.3 Micro-Batching Benefits Depend on Concurrent Request Density
- Dynamic micro-batching operates with a **2 ms sliding collection window**.
- Under single-user sequential traffic (1 client), requests arrive individually; hence, batch size is $b=1$, and micro-batching provides **zero speedup** over baseline inference.
- Micro-batching acceleration only engages when concurrent query arrival rate exceeds $\ge 2$ requests per 2 ms window ($\ge 500$ queries/sec burst arrival or $\ge 8$ concurrent client connections).

### 4.4 50-Query Parity Scope: Empirical Sample Parity, Not Universal Equivalence
- The 50-query embedding parity verification proved exact bit-level equivalence (minimum cosine similarity **1.00000000**, maximum difference **0.0000000000000000**, 100% downstream rank agreement).
- This result formally constitutes **empirical sample parity** across the audited curriculum domain and query distributions.
- It does **not** assert universal mathematical equivalence across arbitrary unconstrained unicode strings, malformed token sequences, or infinite input lengths outside the evaluated distribution.

---

## 5. Architectural Trade-Offs Summary

```
+-----------------------------------------------------------------------------------+
| KNOWN ARCHITECTURAL TRADEOFFS IN EXP-0013                                         |
+------------------------------------+----------------------------------------------+
| BENEFIT GAINED                     | INHERENT TRADEOFF / LIMITATION               |
+------------------------------------+----------------------------------------------+
| 2.78x GPU forward pass speedup     | Requires 2 ms batch buffering window         |
| Sub-millisecond warm query cache   | Memory bound to 5,000 entries (~15 MB RAM)   |
| Zero redundant GPU kernel launches | Coalescing requires async promise retention  |
| 100% out-of-domain safety refusal  | 30% sycophancy remains on false premises     |
| 100% multi-module synthesis        | Multi-module K expansion increases prompt ctx|
+------------------------------------+----------------------------------------------+
```
