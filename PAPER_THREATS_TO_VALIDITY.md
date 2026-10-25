# THREATS TO VALIDITY

**Experiment Identifier:** `EXP-0013-CHAMPION-2026-09-09`  
**System Evaluated:** `EduConnect-LMS-Experimental`  
**Document Scope:** Methodical examination of threats to the internal, external, construct, and reproducibility validity of the empirical findings.

---

## 1. Internal Validity

### 1.1 Confounding System Transients and Timer Resolution
* **Threat:** Initial cold-start execution (e.g. JIT compilation in Node.js, process initialization in PHP CLI, model memory paging in Ollama) introduces non-deterministic latency spikes that could distort p50 and p95 calculations.
* **Mitigation:** A dedicated warm-up query was executed prior to recording evaluation metrics. Repeated 3-run evaluations were performed for reproducibility, and latency percentiles were reported separately for cold (initial execution) and warm (steady-state) conditions. High-resolution timestamps (`performance.now()` in JavaScript and `microtime(true)` in PHP) were utilized.

### 1.2 Worker CPU Affinity and Operating System Scheduling Jitter
* **Threat:** The test platform utilizes a hybrid architecture Intel processor (4 Performance cores + 4 Efficient cores). Windows thread scheduling across P-cores and E-cores could introduce run-to-run variance in worker latency.
* **Mitigation:** Standard deviation across consecutive evaluation passes was strictly tracked ($59.5 \pm 0.7\text{ ms}$ on warm p50), confirming that scheduling variance remained below 1.5% in steady-state.

---

## 2. External Validity

### 2.1 Corpus Scale and Generalization
* **Threat:** The knowledge base comprises 105 semantic chunks spanning 5 computer science courses (~48,200 words). While typical for modular semester-long syllabi, this does not represent the scale of enterprise search engines containing millions of documents.
* **Mitigation:** We explicitly constrain our claims to course-scale knowledge bases ($N \le 1,000$ chunks) and disclose that scaling to massive corpora will require transitioning from flat in-memory scans to graph-based vector indices (e.g. HNSW).

### 2.2 Model and Domain Transferability
* **Threat:** The retrieval and generation models (`nomic-embed-text` and `llama3.2`) and rule-based components (`RagSemanticMapper`, `RagQueryCondenser`) were evaluated on technical computer science topics.
* **Mitigation:** Core architectural mechanisms—such as gateway micro-batching, in-memory vector pre-warming, and dual-margin confidence gating—are model-agnostic and mathematical in nature. However, semantic canonicalization dictionaries must be adapted when transferring to non-technical domains.

---

## 3. Construct Validity

### 3.1 Relevance Criteria and Metric Alignment
* **Threat:** Information retrieval metrics (Hit@k, MRR, nDCG) depend heavily on the definition of a "relevant" chunk. In the isolated baseline IR evaluator, relevance was defined strictly as an exact match to the primary document title (`expected_doc`). In multi-course settings, queries often relate to multiple documents.
* **Mitigation:** We report both the isolated strict document-level baseline metrics (73.2% Hit@1) and the calibrated section-level LMS benchmark metrics (100.0% Dev Hit@3, 99.3% Blind Hit@3), explicitly documenting the evaluation harness and denominator for each.

### 3.2 Factual Grounding vs Semantic Fluency
* **Threat:** High retrieval accuracy does not guarantee that the downstream generative model will produce factually grounded answers without hallucination.
* **Mitigation:** We deployed an independent automated grounding engine (`claim_grounding_engine.js`) that decomposes generated answers into atomic factual claims and verifies entailment against retrieved chunks, achieving a measured claim support ratio of 76.9% and citation precision of 88.5%.

---

## 4. Benchmark Contamination and Overfitting Risks

### 4.1 Development Overfitting vs Blind Holdout Isolation
* **Threat:** Iterative system refinement (across EXP-0001 to EXP-0013) risks inadvertently overfitting thresholds ($\tau = 0.65, \Delta \ge 0.12$) and retrieval weights to the 97-query development suite.
* **Mitigation:** The system was evaluated against a strictly isolated 165-query Blind Holdout suite (`blind_holdout_v1.json`). At no point during the 13 experimental cycles were system parameters tuned against the blind suite. The candidate retained a **99.3% Hit@3** and **100.0% OOD abstention** on the blind holdout, demonstrating strong out-of-distribution generalizability.

---

## 5. Ground-Truth Ambiguities in Legacy Benchmarks

### 5.1 Multi-Document Cross-Relevance (`blind_js_14`)
* **Case:** *"How do setTimeout and the Node.js event loop handle macrotasks?"*
* **Ambiguity:** Ground-truth labels list `JavaScript ES6+ Deep Dive`, but the system retrieves `Node.js & Express REST API Notes` at Rank 1. Both documents contain authentic relevant content.
* **Resolution:** In adherence to strict freeze protocols, ground-truth annotations were not altered. The query was retained and recorded as an IR rank miss ($MRR = 0.50$), transparently documented in the limitations section.

### 5.2 Legacy String Labeling (`blind_fp_19`)
* **Case:** *"Why does React useContext automatically write user authentication data directly into the PostgreSQL database without any backend server?"*
* **Ambiguity:** Ground-truth `expected_doc` was historically annotated with the string `"Cross-Module"` rather than a document list.
* **Resolution:** Evaluated via the specialized multi-hop harness, which confirmed 100% grounded representation across all 3 constituent modules (React, Express, PostgreSQL).

---

## 6. Hardware-Specific Optimization Effects

### 6.1 GPU Architecture and Thermal Limits
* **Platform Characteristics:** The NVIDIA GeForce RTX 3050 Laptop GPU operates with a 50W Total Graphics Power (TGP) budget over an 8-lane mobile PCIe interface.
* **Impact:** 
  1. Micro-batching acceleration (2.78x speedup) directly leverages GPU tensor core GEMM packing; systems lacking dedicated tensor cores (CPU-only) will observe lower batching speedups.
  2. Sustained 64-client stress runs induce thermal throttling after 10 minutes, lowering clock frequencies by 8–12%. Production deployment on datacenter hardware (e.g. NVIDIA L4) will exhibit greater tail-latency stability.

---

## 7. Summary Statement

All identified threats were either systematically mitigated through rigorous controls or transparently documented with explicit boundary disclosures.

*Scientific Candidate Declaration:*  
**"EXP-0013 is the frozen production candidate and represents the best measured configuration within the evaluated EduConnect experimental environment and benchmark suite."**
