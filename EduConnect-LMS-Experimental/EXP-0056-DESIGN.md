# EXP-0056: PageIndex Structural Navigation Specification

**Experiment:** EXP-0056: PageIndex Structural Navigation for Retrieval-Efficient RAG  
**Branch:** 
esearch-integration  
**Parent Commit:** 3af3418d029cc7ab3820cc95b7931ecd7e277bfa  
**Production Repository:** D:\Collage project\EduConnect-LMS-Production (FROZEN HEAD: 176883227602671b545e061dacf228aedc3271a5)  
**Adopted Retriever:** EXP-0040 Hierarchical Parent-Child Retriever (76 C2_085 Semantic Leaves $\to$ 36 Bounded Parents)  
**Frozen Verifier:** Candidate A4 (ackend/rag_ambiguity_guard_verifier.php, SHA-256: 31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e)  
**Development Dataset:** EXP-0025-DEVELOPMENT-DATASET.json ( = 400$, SHA-256: 8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b)  
**Blind Dataset:** EXP-0033-BLIND-DATASET.json ( = 500$, SHA-256: 3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08)  
**Date:** September 2026  
**Status:** PRE-REGISTERED & EXPERIMENT AUTHORIZED  

---

## 1. Research Motivation & Core Hypotheses

In large-scale academic retrieval-augmented generation (RAG), dense vector search typically scores an entire corpus of candidate chunks (e.g. hundreds or thousands of passages) across all available curriculum modules. While effective, unconstrained global search incurs significant computational overhead in cosine similarity computations, cross-encoder reranking latency, and context token bloat.

**EXP-0056** evaluates **PageIndex Hierarchical Structural Navigation** using genuine upstream **PageIndex** (pageindex==0.2.18, page_index_flash). The objective is to determine whether structural navigation over a native PDF document tree can route queries directly to bounded document sections before dense retrieval, reducing search space and context tokens without degrading downstream verification accuracy or safety.

### Pre-Registered Hypotheses:
1. **Hypothesis $ (Search Space & Context Reduction):** PageIndex structural navigation over multi-page curriculum documents restricts dense candidate search to a relevant page/section subset, achieving a measurable reduction in evaluated pages ($\text{page\_reduction} \ge 50\%$) and retrieved context tokens without eliminating gold evidence.
2. **Hypothesis $ (PageIndex PDF-Native Fidelity Gate):** Upstream pageindex.page_index_flash generates a deterministic, fully explainable hierarchical document tree with \%$ page coverage, 0 missing pages, and zero cross-document contamination, operating strictly locally without cloud dependencies.
3. **Hypothesis $ (Downstream Quality & Safety Non-Inferiority):** Restricting dense candidate retrieval to the PageIndex-routed section (with automatic bounded fallback to global EXP-0040 search upon routing uncertainty) maintains downstream accuracy ($\ge 71.40\%$) and safety (FAR $\le 17.50\%$) on the locked blind benchmark ( = 500$).

---

## 2. Experimental Conditions

### Control Condition (B0: Frozen EXP-0040 Baseline)
- **Retriever:** EXP-0040 Hierarchical Parent-Child Retrieval.
- **Search Space:** Unbounded global search across all 76 semantic leaves and 36 bounded parents.
- **Scoring Pipeline:** BGE-small dense embeddings $\to$ MiniLM cross-encoder reranker $\to$ Platt scaling $\to$ M2 score fusion $\to$ top-5 parents returned.
- **Verifier:** Candidate A4 (ackend/rag_ambiguity_guard_verifier.php, prompt P4_neutral, thresholds 0.85/0.80).

### Candidate Condition (C1: PageIndex-Guided Retrieval)
- **Indexing Engine:** Upstream pageindex==0.2.18 native PDF flash indexing (page_index_flash, summary=False, optimize=False, use_embedded_toc=True).
- **Navigation:** Query matches structural outline nodes (modules/sections) to identify bounded candidate regions.
- **Bounded Dense Retrieval:** Dense search and reranking are evaluated within the routed section/module, returning top-5 parent contexts.
- **Bounded Fallback:** If PageIndex structural routing is uncertain or no section matches the query, the retriever automatically falls back to full global EXP-0040 search. Fallback invocations are explicitly tracked.
- **Verifier:** Identical Candidate A4 verifier under frozen settings.

---

## 3. Pre-Registered Invariants & Hard Gates

1. **Genuine Upstream PDF Path:** The experiment must strictly exercise PDF → PageIndex PDF indexing (page_index_flash) → hierarchical tree. No intermediate Markdown surrogates (md_to_tree()) or custom imitation parsers may be used.
2. **Local-Only Execution:** Zero cloud API calls, zero telemetry, zero web search.
3. **Evaluator Immutability:** Candidate A4 verifier code, prompts, and confidence thresholds remain strictly locked.
4. **Historical & Production Isolation:** All historical datasets, benchmark predictions, and the production repository (176883227602671b545e061dacf228aedc3271a5) remain untouched.
5. **No Simulation:** Any unavailable external component remains classified as NOT_READY.
6. **Explicit Fallback Tracking:** All fallback invocations are recorded and reported in primary metrics.
