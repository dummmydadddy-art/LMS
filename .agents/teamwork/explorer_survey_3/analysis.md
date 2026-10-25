# Comprehensive Survey Analysis: README, RAG Architecture & Verification Baseline

**Agent:** `explorer_survey_3`  
**Date:** 2026-10-03  
**Status:** Completed  
**Working Directory:** `d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_3`

---

## 1. Executive Summary

This survey report provides the exhaustive baseline verification and architectural investigation for Requirement 3 (README Rewrite) and the end-to-end RAG verification baseline of the EduConnect-LMS-Experimental platform.

Key findings:
1. **Frontend Baseline Verification (`npm run build`):** Fully operational and passes cleanly with exit code 0 (`tsc -b && vite build` built in 7.84s, 1,873 modules transformed, 0 TypeScript errors).
2. **Backend System Health Audit (`php tests/rag/system_audit.php`):** Passes 100% OK across all 6 subsystems (Storage & SQLite, Ollama Gateway, Retrieval & Ranking Engine, Safety & Verification Subsystem, Live FrankenPHP Gateway, Semantic Cache & Telemetry).
3. **Feature Test Suite (`tests/rag/test_milestones_2_to_5.py` & `tests/rag/test_php_reranker_unit.php`):** 100% passing (completed in 2.8s) covering all 5 core RAG features and multi-student session isolation.
4. **README.md Gap Analysis:** Current root `README.md` (78 lines) is completely obsolete; it contains no mention of the RAG engine, FrankenPHP, Ollama, vector search, cross-encoder rerankers, architecture diagrams, or the academic benchmark scorecard.
5. **Academic Benchmark Dataset:** `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json` establishes the 8 state-of-the-art metrics (4 RGB dimensions + Overall Composite 97.2% + 3 RAGChecker metrics) evaluated over 20 curriculum test cases.

---

## 2. Baseline Verification Audit

### 2.1 Frontend Build Baseline (`frontend/`)
- **Command:** `npm run build` executed in `d:\Collage project\EduConnect-LMS-Experimental\frontend`
- **Result:** Exit code `0` (Success)
- **Duration:** 7.84 seconds
- **Output Artifacts:**
  - `dist/index.html` (0.51 kB, gzip: 0.31 kB)
  - `dist/assets/index-XrZ72NSr.css` (68.92 kB, gzip: 11.18 kB)
  - `dist/assets/index-CSxNPZhb.js` (734.96 kB, gzip: 188.49 kB)
- **Dependency Inventory (`frontend/package.json`):**
  - `react`: `^19.2.6`, `react-dom`: `^19.2.6`
  - `react-router-dom`: `^7.18.0`
  - `lucide-react`: `^1.20.0`
  - `axios`: `^1.18.0`
  - `@supabase/supabase-js`: `^2.108.2`
  - `tailwindcss`: `^4.3.1`, `@tailwindcss/postcss`: `^4.3.1`, `postcss`: `^8.5.15`
  - `vite`: `^8.0.12`, `typescript`: `~6.0.2`

### 2.2 Backend System Audit Baseline (`tests/rag/system_audit.php`)
- **Command:** `php tests/rag/system_audit.php` executed from project root
- **Result:** Exit code `0` (`ALL SUBSYSTEMS HEALTHY & OPERATIONAL (100% OK)`)
- **Detailed Subsystem Audit Results:**
  1. **Storage & Vector Database:**
     - SQLite connection: Connected to `backend/storage/vectors.sqlite`
     - Corpus Scale: 1,323 chunks across 5 textbooks (`mat_postgresql_16`: 360, `mat_eloquent_js`: 260, `mat_pro_git`: 260, `mat_data_science`: 210, `mat_think_python`: 210, plus syllabus documents)
     - Vector Embedding Storage: Binary BLOBs present (3,072 bytes per chunk for 768-dim float vectors)
  2. **Ollama Local LLM Gateway (Port 11434):**
     - HTTP Daemon: Responding on `http://localhost:11434`
     - Embedding Model: `nomic-embed-text:latest` (Present)
     - Production Generator: `llama3.2:latest` (Present)
     - Evaluation Judge: `qwen3:4b` (Present)
     - Single Embedding Generation: 768-dim vector generated in 78.8 ms
  3. **Retrieval & Ranking Engine:**
     - Hybrid Search (Dense + BM25): 1220.6 ms, top similarity: 0.814
     - Prewarmed Corpus Mode: `EXP-0023` active
  4. **Safety, Boundary & Presupposition Verification:**
     - Out-of-Domain Rejection (Quantum computing): `ABSTAIN`
     - Non-Academic Trap Rejection (Baking cookies in React): `ABSTAIN`
     - Fabricated Syntax Trap (`===!` operator): `REFUTED`
     - Valid Query Preservation (CSS Box Model): `SUPPORTED`
  5. **Live FrankenPHP HTTP Gateway (127.0.0.1:8000):**
     - Route: `POST /api/rag/ask` with header `X-Service-Key: lms-n8n-service-key-2026`
     - Status: HTTP 200 in 121.6 ms (Answer length: 570 characters)
  6. **Semantic Cache & Latency Profiling:**
     - Pipeline Latency Telemetry: `backend/storage/pipeline_logs/pipeline_2026-10-03.jsonl` (60,775+ bytes)
     - Semantic Query Cache: 23 entries active

### 2.3 RAG Milestones Automated Test Suite (`tests/rag/test_milestones_2_to_5.py`)
- **Execution Time:** 2.80 seconds (100% Passed)
- **Verifications Confirmed:**
  - `R2`: `material_chunks` (1,323 rows) == `material_chunks_vec` (1,323 rows), live search in 291.3 ms.
  - `R3`: Multi-Turn Conversational Memory rewritten via `llama3.2:latest` (`strategy: 'llm_rewrite'`) in 572 ms and 217 ms; 6 messages (3 Q + 3 A) persisted to `student_sessions.sqlite`.
  - `R4`: Parent chunks count: 333, average length 3,346.2 chars (~837 tokens), 1,323/1,323 children linked via `parent_chunk_id`.
  - `R5`: Out-of-domain query ("boiling point of liquid nitrogen") returns `abstain=True`, `backend='crag_fallback_gate'`.
  - Interleaved Multi-Student Isolation: Zero cross-talk between student Alice (React useState) and student Bob (PostgreSQL B-Tree).

---

## 3. The 5 RAG Features Architecture & Implementation

### Feature 1: Neural Cross-Encoder Reranker Microservice
- **Service Implementation:** `backend/services/reranker_service.py`
- **Port:** `8100` (`http://127.0.0.1:8100/rerank`, `/health`)
- **Technology:** Python 3, FastAPI, Uvicorn, PyTorch, HuggingFace Transformers
- **Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2` executed on CPU (0 MB GPU VRAM overhead)
- **Integration in PHP:** `backend/rag_service.php` (`applySemanticReranking()` lines 237–310)
- **Pipeline Mechanics:**
  - Takes the top 15 candidates returned by the hybrid Reciprocal Rank Fusion (RRF $k=60$).
  - Issues HTTP POST to `http://127.0.0.1:8100/rerank` with 2000 ms timeout.
  - Scores cross-attention logits with sigmoid transformation into relevance probabilities $[0, 1]$.
  - Reorders candidates descending by neural score, gracefully falling back to RRF order if the microservice is unreachable.

### Feature 2: Approximate Nearest Neighbor (ANN) Vector Index via `sqlite-vec`
- **Extension & DLL:** `sqlite-vec` (`scripts/vec0.dll` / `bin/ext/vec0.dll`)
- **Database File:** `backend/storage/vectors.sqlite`
- **Virtual Table:** `material_chunks_vec` (`chunk_id`, `embedding [768]`)
- **Integration in PHP:** `backend/rag_service.php` (`getVectorDb()` lines 79–115, `searchCore()` lines 1451–1495)
- **Query Pattern:**
  ```sql
  SELECT chunk_id, distance 
  FROM material_chunks_vec 
  WHERE embedding MATCH :vec AND k = 60 
  ORDER BY distance;
  ```
- **Pipeline Mechanics:**
  - Binds 768-dim vector binary BLOB using PHP `SQLite3::loadExtension('vec0.dll')`.
  - Computes cosine distance in native C code, converting distance to similarity ($1.0 - \text{distance}$).
  - Combines with Okapi BM25 keyword search via RRF ($k=60$). Falls back to in-memory cosine dot-product if extension loading fails.

### Feature 3: Multi-Turn Conversational Memory & Query Condensation
- **Session Store:** `backend/storage/student_sessions.php` backed by `backend/storage/student_sessions.sqlite`
- **Table Schema:**
  ```sql
  CREATE TABLE conversation_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_student_created ON conversation_turns(student_id, created_at);
  ```
  Configured with `PRAGMA journal_mode=WAL;` and 5000 ms busy timeout for concurrent multi-student access.
- **Query Condenser:** `backend/rag_query_condenser.php` (`RagQueryCondenser::condense()`, `rewriteWithLLM()`)
- **Pipeline Mechanics:**
  - Evaluates if query contains anaphoric pronouns (`it`, `this`, `that`, `its`, "the latter", etc.).
  - If self-contained, passes through immediately without LLM overhead.
  - If ambiguous/anaphoric, issues a fast prompt to Ollama `llama3.2:latest` (`temperature: 0.0`, `num_ctx: 2048`, `num_predict: 40`, timeout 8s) to rewrite into a self-contained query.
  - Resolves pronouns accurately (e.g., "How does its setter function update state?" $\to$ "How does the setter function in React's useState Hook update state?").
  - Response metadata includes `query_condensation: { rewritten: true, condensed_query: "...", strategy: "llm_rewrite" }`.

### Feature 4: Parent-Child Hierarchical Chunking
- **Database Tables:** `parent_chunks` (333 rows) and `material_chunks` (1,323 rows) in `backend/storage/vectors.sqlite`
- **Chunk Granularity:**
  - **Child chunks (`material_chunks`):** ~200 tokens each, used for fine-grained semantic embedding and BM25 index matching.
  - **Parent chunks (`parent_chunks`):** ~800–1000 tokens (average 3,346 characters), preserving complete section context, surrounding explanations, and code blocks.
- **Linkage:** Foreign key column `material_chunks.parent_chunk_id` referencing `parent_chunks.id` (100% of the 1,323 chunks are linked).
- **Integration in PHP:** `backend/rag_service.php` (lines 1859–1881)
- **Pipeline Mechanics:**
  - Retrieval searches child chunks for highest similarity.
  - Top candidate `parent_chunk_id` values are gathered and bulk-fetched from `parent_chunks`.
  - Parent contents replace child contents in the context assembly window passed to the LLM generator, preventing truncation of code or conceptual definitions.

### Feature 5: Corrective RAG (CRAG) Confidence-Gated Fallback
- **Safety Gate:** `backend/rag_service.php` (`Step 2.1`, lines 1758–1784 and 2342–2355)
- **Flag & Threshold:** `ENABLE_CRAG_FALLBACK` enabled, `CRAG_CONFIDENCE_THRESHOLD = 0.35`
- **Pipeline Mechanics:**
  - Checks top reranker score (`$topRerankScore`) from cross-encoder output.
  - If candidates are empty OR `$topRerankScore < 0.35`:
    - Deterministically aborts LLM generation to prevent hallucinations.
    - Sets `abstain = true`, `backend = 'crag_fallback_gate'`, `confidence = round($topRerankScore, 4)`.
    - Returns standardized curriculum boundary refusal:
      > *"I apologize, but this topic is outside the curriculum scope and not in the approved curriculum, so I cannot answer accurately. The EduConnect AI Tutor is configured to answer questions strictly related to your curriculum (HTML & CSS, JavaScript ES6+, React, Node.js/Express, and PostgreSQL)."*
    - Automatically records query and abstention into `StudentSessionStore` for context continuity.

---

## 4. Benchmark Metric Specifications (`RGB_RAGCHECKER_BENCHMARK_REPORT.json`)

The state-of-the-art academic benchmark evaluates the EduConnect-LMS RAG engine against AAAI 2024 (RGB) and NeurIPS 2024 (RAGChecker) standards across 20 rigorous test queries.

### 4.1 The 8 Benchmark Metrics

| Benchmark Standard | Metric Name | Score | Target Threshold | Status | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RGB (AAAI 2024)** | **Noise Robustness** | **96.0%** (0.9600) | $\ge 80.0\%$ | **PASS** | Ability to filter out distracting, semantically adjacent passages across 1,323 textbook chunks. |
| **RGB (AAAI 2024)** | **Negative Rejection** | **100.0%** (1.0000) | $\ge 80.0\%$ | **PASS** | Deterministic refusal to fabricate answers for out-of-domain queries (Vue, Angular, Django, Quantum CSS). |
| **RGB (AAAI 2024)** | **Information Integration** | **93.0%** (0.9300) | $\ge 75.0\%$ | **PASS** | Synthesizing knowledge scattered across multiple textbook sections (e.g., let/const TDZ hoisting, useRef vs useState). |
| **RGB (AAAI 2024)** | **Counterfactual Robustness** | **100.0%** (1.0000) | $\ge 80.0\%$ | **PASS** | Refuting questions containing false presuppositions (e.g., requiring five `<main>` tags, flex-direction row being vertical). |
| **RGB Summary** | **Overall RGB Composite** | **97.2%** (0.9725) | $\ge 80.0\%$ | **PASS** | Unweighted composite academic benchmark across all four RGB dimensions. |
| **RAGChecker (NeurIPS)** | **Claim Precision** | **92.6%** (0.9259) | $\ge 80.0\%$ | **PASS** | Proportion of generated assertions that are fully supported by the retrieved course materials. |
| **RAGChecker (NeurIPS)** | **Claim Recall** | **94.7%** (0.9466) | $\ge 75.0\%$ | **PASS** | Proportion of gold standard curriculum concepts successfully captured in the generated response. |
| **RAGChecker (NeurIPS)** | **Hallucination Rate** | **7.4%** (0.0741) | $\le 15.0\%$ | **PASS** | Percentage of claims not directly grounded in textbook citations (well below the 15% threshold). |

### 4.2 Latency Profile
- **Mean End-to-End Latency:** `4,563.6 ms`
- **Median Latency (P50):** `100.4 ms` (leveraging prewarmed semantic cache)
- **90th Percentile Latency (P90):** `35,691.3 ms` (full cold LLM generation with premise verification)
- **Fastest Response:** `34.6 ms` (negative rejection cache / safety gate)
- **Slowest Response:** `38,027.2 ms` (complex multi-hop counterfactual refutation)

---

## 5. README.md Gap Analysis & Structural Proposal

### 5.1 Current README.md Deficiencies
The existing `README.md` (78 lines) was written as an initial web app outline and exhibits major gaps:
1. **Title & Branding:** Simply `# LMS`. Does not reflect the project name `EduConnect-LMS-Experimental` or its college project presentation status.
2. **Missing AI/RAG Engine:** 0% coverage of the RAG architecture, vector search, cross-encoder, or Ollama local models.
3. **Outdated Tech Stack:** Claims `React 18` and `php -S localhost:8000`. In reality, the project uses `React 19`, `Vite 8`, `Tailwind 4`, `FrankenPHP 1.x` with worker concurrency, `sqlite-vec`, and a Python FastAPI microservice.
4. **No Visual Diagrams:** Completely lacks architecture and data-flow diagrams.
5. **No Academic Benchmark Scorecard:** Omits the 97.2% RGB/RAGChecker benchmark scorecard.
6. **Incomplete Quick Start:** Does not instruct users how to launch Ollama, pull models, launch the reranker microservice, or start FrankenPHP.

### 5.2 Required README Structure
The rewritten `README.md` must be organized as follows:
1. **Header & Badges:** Project Title, College Presentation Banner, Academic Benchmark Score Badge (`97.2% RGB`), License, Tech Stack Badges.
2. **Architecture Flowchart (Mermaid):** Valid GitHub-compatible Mermaid diagram showing end-to-end data flow:
   ```mermaid
   flowchart TD
       Student[👨‍🎓 Student Chat Modal] -->|POST /api/rag/ask + student_id| Gateway[⚡ FrankenPHP Concurrent Gateway :8000]
       Gateway -->|Check Semantic Cache| Cache[(⚡ Semantic Query Cache)]
       Gateway -->|Multi-Turn Anaphora| Condenser[🧠 Query Condenser / llama3.2 :11434]
       Condenser -->|Condensed Query| Hybrid[🔍 Hybrid Retrieval Engine]
       Hybrid -->|Dense ANN Search| VecDB[(sqlite-vec Virtual Table : k=60)]
       Hybrid -->|Lexical Search| BM25[In-Memory Okapi BM25 Index]
       VecDB & BM25 -->|RRF Fusion k=60| Candidates[Top 15 Candidate Chunks]
       Candidates -->|POST /rerank| Reranker[🚀 Cross-Encoder Microservice :8100\nms-marco-MiniLM-L-6-v2]
       Reranker -->|Relevance Probs| CRAG{🛡️ CRAG Confidence Gate\nScore >= 0.35?}
       CRAG -->|No / Out-of-Domain| Abstain[⚠️ Calibrated Abstention Card]
       CRAG -->|Yes / In-Domain| Assembly[📚 Hierarchical Context Assembly\nParent Chunks ~800-1000t]
       Assembly -->|Grounded Prompt| Generator[🦙 Ollama LLM :11434\nllama3.2:latest]
       Generator -->|Answer + Page Citations| Stream[📤 Student UI Response]
       Stream -->|Persist Turn| SessionStore[(💾 student_sessions.sqlite WAL)]
   ```
3. **Academic Benchmark Scorecard Table:** Exact 8 metrics table with AAAI/NeurIPS citations.
4. **The 5 Advanced RAG Pipeline Features:** Detailed breakdown of each feature.
5. **Full Technology Stack:** Multi-tier categorized list (Frontend, Backend Gateway, AI/Vector Engine, Microservices, Relational DB).
6. **Quick-Start Guide:** Step-by-step instructions for:
   - Step 1: Start Ollama daemon & pull models (`llama3.2`, `nomic-embed-text`, `qwen3:4b`).
   - Step 2: Start Python Cross-Encoder Microservice on `:8100`.
   - Step 3: Start FrankenPHP server on `:8000`.
   - Step 4: Start Frontend Vite dev server on `:5173`.
   - Step 5: Verification audit command (`php tests/rag/system_audit.php`).
7. **LMS Platform Portals:** Retain concise overviews of Super Admin, Teacher, and Student portals.

---

## 6. Implementation Guidance for Downstream Agents

### 6.1 Guidance for R1 (`AiTutorModal.tsx` & `StudentDashboard.tsx`)
1. **Prop Wiring:**
   - In `StudentDashboard.tsx`, replace the custom event `window.dispatchEvent(new CustomEvent('open-ai-tutor'))` with state `isAiTutorOpen` and pass `studentId={studentId}` directly as a prop to `<AiTutorModal />`.
   - In `AiTutorModal.tsx`, declare `studentId?: string` in `AiTutorModalProps`.
2. **API Request Headers & Payload:**
   - Always send `student_id: studentId` in the request body.
   - Always include the header `'X-Service-Key': 'lms-n8n-service-key-2026'` on calls to `/api/rag/ask`.
3. **Citation Page Badges:**
   - In `SourceCitation` interface, add `page_start?: number; page_end?: number; page_citation?: string; pages?: number[]`.
   - Render page badge: `{s.page_citation ? ` • ${s.page_citation}` : (s.page_start ? ` • p. ${s.page_start}` : '')}`.
4. **CRAG Abstention Card Styling:**
   - When `m.sender === 'assistant'` and (`m.backend === 'crag_fallback_gate'` or `m.abstained === true`), style with an amber/warning card (`bg-amber-500/10 border border-amber-500/30 text-amber-200`) with an `AlertTriangle` icon.
5. **Query Rewrite Subtitle:**
   - When response has `query_condensation?.rewritten === true`, show a subtitle below user message: `"↳ Interpreted as: " + m.condensed_query`.
6. **New Conversation Button:**
   - Add a button in the modal header to reset local message history and call `POST /api/rag/session/clear` (or clear local state).

### 6.2 Guidance for R2 (`GET /api/rag/metrics` & `AdminDashboard.tsx`)
1. **Backend Route (`GET /api/rag/metrics`):**
   - Add route in `backend/index.php`.
   - Protect with `verifyGatewayTrust()` or check header `X-Service-Key: lms-n8n-service-key-2026`.
   - Read and parse recent JSONL logs from `backend/storage/pipeline_logs/pipeline_*.jsonl`.
   - Read benchmark scores from `tests/rag/reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json`.
   - Check health of ports: `:8000` (self), `:8100` (`http://127.0.0.1:8100/health`), `:11434` (`http://localhost:11434/api/tags`).
   - Query chunk counts from `vectors.sqlite`: `SELECT count(*) FROM material_chunks` and `SELECT count(*) FROM parent_chunks`.
2. **Frontend Admin Tab:**
   - In `frontend/src/pages/admin/AdminDashboard.tsx`, add `'rag_pipeline'` to the tab list.
   - Render metrics widgets:
     - Health Status indicators (FrankenPHP, Reranker, Ollama).
     - Latency Distribution (P50, Mean, P90, Min, Max).
     - Per-Stage Latency Breakdown (Cache lookup, Retrieval, Reranking, Generation).
     - Cache Hit Rate & Knowledge Base Counts (1,323 chunks, 333 parents).
     - Benchmark Scorecard Table with the 8 metrics.

---

## 7. Artifacts Generated
- `analysis.md` — This comprehensive baseline analysis.
- `handoff.md` — 5-component handoff report.
- `progress.md` — Updated liveness heartbeat.
- `BRIEFING.md` — Updated agent memory.
