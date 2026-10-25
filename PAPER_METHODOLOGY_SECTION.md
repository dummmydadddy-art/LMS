# METHODOLOGY: ARCHITECTURE AND EVALUATION FRAMEWORK

**Experiment Identifier:** `EXP-0013-CHAMPION-2026-09-09`  
**System Under Test:** `EduConnect-LMS-Experimental`  
**Document Scope:** Formal mathematical formulation and architectural specification of the EduConnect Retrieval-Augmented Generation (RAG) system and its empirical benchmark framework.

---

## 1. Corpus Construction and Chunking Strategy

### 1.1 Curriculum Knowledge Base
The knowledge corpus represents an undergraduate-level full-stack software engineering curriculum spanning five modular courses:
1. **Course 1: Modern Web Development Fundamentals** (HTML5 semantic tags, CSS Box Model, Flexbox, Grid, Responsive Design).
2. **Course 2: JavaScript ES6+ Deep Dive** (Lexical scoping, Closures, Event Loop, Libuv, Promises, Async/Await, Prototypes).
3. **Course 3: Backend Engineering with Node.js & Express** (Middleware chains, REST routing, JWT authentication, error handling).
4. **Course 4: Relational Database Design & PostgreSQL** (Normalization 1NF–3NF, ACID transactions, Foreign Keys, B-Tree indexes).
5. **Course 5: React Fundamentals & Component State** (Virtual DOM, Reconciliation, Hooks: `useState`, `useEffect`, `useContext`, `useReducer`, `useRef`).

### 1.2 Structural Chunking and Metadata Schema
Documents are partitioned using semantic structural boundaries (section headings, code blocks, and topic shifts) rather than fixed sliding token windows.
* **Corpus Volume:** 5 courses, 23 discrete chapters/sections, 105 semantic chunks, totaling ~48,200 words (~64,500 tokens).
* **Chunk Sizing:** Chunks average 450 words (~600 tokens; $\min=180$, $\max=720$ words), preserving functional integrity of code listings and conceptual definitions.
* **Metadata Schema:** Each chunk $c_i$ is stored as a tuple:
  $$c_i = \langle \text{id}, \text{course}, \text{module}, \text{title}, \text{section}, \text{content}, \mathbf{u}_i, \mathbf{t}_i \rangle$$
  where $\mathbf{u}_i \in \mathbb{R}^{768}$ is the pre-normalized unit dense vector and $\mathbf{t}_i$ is the pre-computed lexical term frequency vector.

---

## 2. Neural and Lexical Representation

### 2.1 Dense Semantic Embeddings
Dense vectors are generated via the `nomic-embed-text` transformer embedding model. For an input passage or query string $x$, the raw embedding $\mathbf{v}(x) \in \mathbb{R}^{768}$ is L2-normalized:
$$\hat{\mathbf{v}}(x) = \frac{\mathbf{v}(x)}{\|\mathbf{v}(x)\|_2} = \frac{\mathbf{v}(x)}{\sqrt{\sum_{j=1}^{768} v_j^2}}$$
Semantic similarity between query $q$ and document chunk $d$ is evaluated via dot-product cosine similarity:
$$\text{sim}_{\text{dense}}(q, d) = \hat{\mathbf{v}}(q) \cdot \hat{\mathbf{u}}(d) = \sum_{j=1}^{768} \hat{v}_j(q) \cdot \hat{u}_j(d)$$

### 2.2 In-Memory Vector Pre-Warming
To eliminate database disk reads during request servicing, all 105 unit vectors $\hat{\mathbf{u}}_i$ are pre-normalized and held in 64-bit float arrays in process memory upon PHP worker boot. Total resident memory for all 105 vectors is **0.76 MB per worker process** (6.08 MB across 8 workers).

### 2.3 Lexical Representation (BM25)
Lexical ranking employs the Robertson-Spärck Jones Okapi BM25 probabilistic model:
$$\text{score}_{\text{BM25}}(q, d) = \sum_{t \in q \cap d} \text{IDF}(t) \cdot \frac{f(t, d) \cdot (k_1 + 1)}{f(t, d) + k_1 \cdot \left(1 - b + b \cdot \frac{|d|}{\text{avgdl}}\right)}$$
where:
* $f(t, d)$ is the frequency of term $t$ in chunk $d$,
* $|d|$ is the token length of chunk $d$, and $\text{avgdl} \approx 450$ is the average chunk length,
* $k_1 = 1.2$ controls non-linear term frequency saturation,
* $b = 0.75$ controls document length normalization,
* Inverse Document Frequency is computed as:
  $$\text{IDF}(t) = \ln \left( \frac{N - n(t) + 0.5}{n(t) + 0.5} + 1 \right)$$
  with total chunk count $N = 105$ and document frequency $n(t)$.

---

## 3. Hybrid Rank Fusion and Orchestration

### 3.1 Reciprocal Rank Fusion (RRF)
Dense and lexical rank positions are combined using weighted Reciprocal Rank Fusion:
$$\text{RRF}(d) = w_d \cdot \frac{1}{k_{\text{rrf}} + \text{rank}_{\text{dense}}(d)} + w_l \cdot \frac{1}{k_{\text{rrf}} + \text{rank}_{\text{lexical}}(d)}$$
where $k_{\text{rrf}} = 60$, dense weight $w_d = 0.65$, and lexical weight $w_l = 0.35$.

### 3.2 Semantic Concept Mapping (`RagSemanticMapper`)
Beginner students frequently formulate queries using intuitive mental models rather than formal technical terminology. The `RagSemanticMapper` applies deterministic canonicalization:
$$q' = \mathcal{M}_{\text{canon}}(q)$$
* Translates informal phrasing to formal terms (e.g. *"box sizing hack"* $\to$ *"CSS box-sizing border-box"*).
* Decomposes comparative queries into balanced sub-aspects (e.g. *"React useState vs useReducer"* $\to$ sub-queries for both concepts).
* Mean execution latency: **0.12 ms**.

### 3.3 Conversational Query Condensation (`RagQueryCondenser`)
In multi-turn student dialogues, follow-up queries frequently contain unresolved pronouns (*"how do I use it"*, *"why does that happen"*). The `RagQueryCondenser` applies rule-based grammatical parsing to restore omitted entities from dialogue history:
$$q_{\text{condensed}} = \mathcal{C}(q_{\text{turn}}, \mathcal{H}_{1:t-1})$$
* Mean execution latency: **0.17 ms** (compared to 350–500 ms for neural rewriting).

### 3.4 Multi-Hop Query Orchestration (`RagQueryOrchestrator`)
For compound queries spanning multiple course domains, the orchestrator classifies query complexity:
$$\mathcal{O}(q) \in \{\text{SINGLE\_DOMAIN}, \text{TWO\_MODULE}, \text{MULTI\_MODULE}\}$$
* Dynamically expands retrieval budget from standard $k=4$ up to $k=8$.
* Applies round-robin domain interleaving to ensure all constituent courses (e.g. React + Node + PostgreSQL) achieve top-rank representation.
* Mean execution latency: **0.078 ms**.

---

## 4. Safety Boundary and Confidence Calibration

### 4.1 Dual-Threshold Calibrated Confidence Gate
To prevent hallucinating answers on out-of-domain or unanswerable queries, the safety boundary evaluates:
1. **Absolute Score Threshold:** The top-ranked RRF score must satisfy $s_{\text{top}} \ge \tau = 0.65$.
2. **Logistic Score Margin:** The margin between top and second-ranked chunks must satisfy:
   $$\Delta s = s_{\text{top}} - s_{\text{second}} \ge 0.12$$
3. **Semantic Boundary Classifier:** Inspects input tokens against non-curriculum domains (e.g. medical, political, culinary).
If any condition fails, the system executes an immediate safe abstention:
$$\text{Action}(q) = \begin{cases} \text{RETRIEVE}, & \text{if } s_{\text{top}} \ge \tau \land \Delta s \ge 0.12 \land \text{Boundary}(q) = \text{VALID} \\ \text{ABSTAIN}, & \text{otherwise} \end{cases}$$

### 4.2 Salient Evidence Compression and Anti-Sycophancy
Retrieved chunks are passed through a sentence-level salience filter that extracts relevant claim sentences while stripping boilerplate. When false-premise framing is detected, the prompt injects an explicit refutation directive:
> *"The student's question contains a false technical premise. Directly refute the false premise using evidence from the retrieved course materials before explaining the correct mechanism."*

---

## 5. Gateway Concurrency and Embedding Coordinator

### 5.1 Asymmetric Worker Pool Architecture
Incoming HTTP traffic is processed by an asymmetric Node.js gateway (Port 8000) backed by 8 dedicated PHP CLI worker processes:
* **Ports 8001–8006 (6 Fast Workers):** Dedicated exclusively to sub-50 ms vector search, scoring, and safety gating.
* **Ports 8007–8008 (2 Gen Workers):** Dedicated to long-running streaming LLM token generation (3–5 seconds).
This segregation guarantees that slow generation requests never induce head-of-line blocking on search traffic.

### 5.2 Dynamic Micro-Batching (GEMM Packing)
The gateway's `EmbeddingCoordinator` collects incoming embedding requests within an adaptive $2\text{ ms}$ sliding window:
$$\mathcal{B} = \{ q_1, q_2, \dots, q_b \} \quad \text{where } b \le b_{\max} = 8$$
When $b = b_{\max}$ or the 2 ms window expires, $\mathcal{B}$ is dispatched to Ollama's array endpoint:
$$\mathbf{E} = \text{OllamaBatch}(\mathcal{B}) \in \mathbb{R}^{b \times 768}$$
This packs individual General Matrix-Vector (GEMV) operations into a compute-dense General Matrix-Matrix Multiplication (GEMM) kernel on the GPU tensor cores, yielding a **2.78x forward pass speedup**.

### 5.3 In-Flight Request Coalescing
If a query $q$ arrives while an identical query $q$ is currently executing on the GPU, the coordinator binds the second request to the pending JavaScript Promise without dispatching a redundant forward pass.

### 5.4 Deterministic LRU Query Cache
A 5,000-entry Least-Recently-Used (LRU) cache stores L2-normalized float32 vectors in gateway memory, keyed by canonicalized query text:
$$\text{key}(q) = \text{SHA256}(\text{normalize}(q))$$
* Cache lookup time: **0.01 ms**.
* Memory footprint: ~15 MB RAM for 5,000 entries.

---

## 6. Mathematical Definitions of Evaluation Metrics

All metrics are formally defined with fixed, explicit denominators:

### 6.1 Retrieval Metrics
* **Hit@k (Top-k Recall):**
  $$\text{Hit@k} = \frac{1}{N_{\text{ans}}} \sum_{i=1}^{N_{\text{ans}}} \mathbb{I}(1 \le \text{rank}(q_i) \le k)$$
  where $N_{\text{ans}}$ is the total number of answerable queries in the evaluation suite.
* **Mean Reciprocal Rank (MRR):**
  $$\text{MRR} = \frac{1}{N_{\text{ans}}} \sum_{i=1}^{N_{\text{ans}}} \frac{1}{\text{rank}(q_i)}, \quad \text{where } \frac{1}{\text{rank}(q_i)} = 0 \text{ if } \text{rank}(q_i) > 4$$
* **Normalized Discounted Cumulative Gain (nDCG@k):**
  $$\text{nDCG@k} = \frac{1}{N_{\text{ans}}} \sum_{i=1}^{N_{\text{ans}}} \frac{\text{DCG@k}(q_i)}{\text{IDCG@k}(q_i)}, \quad \text{DCG@k} = \sum_{j=1}^{\min(k, |R|)} \frac{rel_j}{\log_2(j + 1)}$$

### 6.2 Safety and Grounding Metrics
* **Out-of-Domain Abstention Rate:**
  $$\text{OOD Abstention} = \frac{1}{N_{\text{unans}}} \sum_{i=1}^{N_{\text{unans}}} \mathbb{I}(\text{Abstained}(u_i) = \text{true})$$
* **False-Premise Refutation Rate:**
  $$\text{FP Refutation} = \frac{1}{N_{\text{fp}}} \sum_{i=1}^{N_{\text{fp}}} \mathbb{I}(\text{ConflictDetected}(f_i) = \text{true} \lor \text{Refuted}(f_i) = \text{true})$$
* **Claim Support Ratio:**
  $$\text{Claim Support} = \frac{|\{ c \in \text{Claims}(A) : \text{EntailedBy}(c, \mathcal{K}) = \text{true} \}|}{|\text{Claims}(A)|}$$
* **Citation Precision:**
  $$\text{Citation Precision} = \frac{|\{ \text{cite} \in \text{Citations}(A) : \text{ValidAttribution}(\text{cite}, \mathcal{K}) = \text{true} \}|}{|\text{Citations}(A)|}$$

### 6.3 Operational Metrics
* **Throughput (Requests Per Second, RPS):**
  $$\text{RPS} = \frac{N_{\text{completed}}}{\Delta T_{\text{total}}}$$
* **Percentile Latency ($p50, p95, p99$):**
  $$p_k = \inf \{ t \in \mathbb{R} : F_T(t) \ge k / 100 \}$$
  evaluated over all recorded end-to-end request latencies.
