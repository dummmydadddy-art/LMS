# EXP-0064: Experimental Protocol

**Experiment Identifier:** EXP-0064  
**Branch:** `research-integration`  
**Date:** 2026-09-20  
**Status:** FROZEN PROTOCOL (Pre-Execution Specification)  
**Research Question:** *"Can a visual-document retrieval modality recover useful page-level evidence that text retrieval misses, and does text+visual evidence fusion improve the validated EXP-0061 pipeline?"*

---

## 1. Scientific Purpose & Construct Definition

### 1.1 Modality Separation & Motivation
- **EXP-0059 & EXP-0060:** Established that neural dense+sparse hybrid text retrieval (BGE-M3 + PyLate) significantly improves recall over deterministic baselines, but downstream A4 accuracy is degraded by cross-module evidence noise.
- **EXP-0061:** Structural coherence gating restored development-set accuracy (92.25%) to the frozen control (92.00%, McNemar $p = 1.0$), and blind-set accuracy (72.80%) statistically indistinguishable from control (McNemar $p = 1.0$).
- **EXP-0064:** Investigates VISUAL RETRIEVAL as an independent information modality. Rather than evaluating text embeddings, visual retrieval uses rendered high-resolution PDF page images to rank pages based on visual and layout features.
- **Authentic Evidence Bridge:** ColSmol retrieves pages visually; the corresponding authentic page text from `curriculum_full.pdf` is passed to the frozen A4 text verifier. Strictly NO OCR, NO VLM-generated descriptions, and NO text summarization.

### 1.2 Scientific Role Separation & Invariants
1. **NO Model Substitutions:** Primary visual model is strictly `vidore/colsmol-256m`. Zero substitution of ColPali, ColQwen, ColSmol-500M, CLIP, or generic embeddings.
2. **NO External Knowledge or Web Search:** Strictly zero web searches, zero external APIs.
3. **NO Pipeline Changes:** Zero changes to BGE-M3, Qdrant, PyLate, the structural coherence gate, or the frozen A4 verifier (`backend/rag_ambiguity_guard_verifier.php`).
4. **NO Post-Hoc Tuning:** Prespecified result limits ($k=5$) and RRF fusion constant ($k=60$) are frozen prior to execution.
5. **NO Blind Dataset Access:** `EXP-0033-BLIND-DATASET.json` remains strictly locked and sealed.
6. **NO Production Modifications:** `EduConnect-LMS-Production` remains untouched at `176883227602671b545e061dacf228aedc3271a5`.

---

## 2. Experimental Conditions

The benchmark evaluates four conditions over the $N=400$ development queries:

### C0 — FROZEN CONTROL
- **Architecture:** EXP-0056 deterministic structural retrieval over `C2_ChonkieSemantic_085` + frozen A4 verifier.
- **Source:** `scratch/exp0056_dev_predictions.json` (Accuracy: 92.00%, 368/400).
- **Invariance:** Unmodified reference baseline.

### C1 — EXP-0061 REFERENCE TEXT PIPELINE
- **Architecture:** BGE-M3 Dense+Sparse $\to$ Qdrant RRF ($k=60$) $\to$ PyLate ColBERT $\to$ Top-5 evidence $\to$ Structural Coherence Gate $\to$ Frozen A4.
- **Source:** `EXP-0061-DEVELOPMENT-TRACES.jsonl` (Accuracy: 92.25%, 369/400).

### C2 — VISUAL-ONLY (ColSmol-256M)
- **Architecture:**
  1. Text query $\to$ `ColSmol-256M` multi-vector visual retrieval over 23 rendered page images.
  2. Select top $k=5$ pages.
  3. Evidence Bridge: Map retrieved pages to authentic source text from `curriculum_full.pdf`.
  4. Apply exact EXP-0061 structural coherence gate.
  5. Pass retained evidence to frozen A4 verifier with sentinel `similarity = 1.0`.

### C3 — TEXT + VISUAL FUSION
- **Architecture:**
  1. Obtain C1 text retrieval ranking (top-5 candidates).
  2. Separately obtain C2 visual page ranking (top-5 pages).
  3. Fuse C1 and C2 rankings using Reciprocal Rank Fusion ($k=60$, equal weights $0.5/0.5$):
     $$\text{RRF}(d) = \sum_{m \in \{\text{text}, \text{vis}\}} \frac{w_m}{60 + \text{rank}_m(d)}$$
  4. Deduplicate pages and chunks, preserving authentic evidence.
  5. Apply exact EXP-0061 structural coherence gate to top-5 fused candidates.
  6. Pass retained evidence to frozen A4 verifier with sentinel `similarity = 1.0`.

---

## 3. Prespecified Parameters & Budgets

- `text_k`: $5$
- `visual_k`: $5$
- `fusion_k`: $5$
- `rrf_k`: $60$ (frozen standard across repository)
- `rendering_dpi`: $150$
- `image_format`: `PNG`
- `dimensions`: $1240 \times 1755$
- `device`: `cpu` (hardware-aware placement on Intel i5-12450H)

---

## 4. Evaluation Protocol

### 4.1 20-Query Technical Feasibility Gate
Prior to full $N=400$ execution, verify:
1. ColSmol model loads successfully.
2. Every test page has a valid visual index entry.
3. Visual retrieval returns genuine scores.
4. No OCR is used.
5. Visual page IDs map to authentic source pages.
6. C2 page-to-text mapping is deterministic.
7. C3 fusion uses genuine C1 and C2 rankings.
8. No BGE/PyLate ranking is silently substituted for ColSmol.
9. Structural gate remains unchanged.
10. A4 remains unchanged.
11. No synthetic scores.
12. No blind data.
13. No external network knowledge.
14. Output schema is valid.

### 4.2 Full Development Benchmark ($N=400$)
Execute C0, C1, C2, and C3 across all 400 cases in `EXP-0025-DEVELOPMENT-DATASET.json`.
Emit:
- `EXP-0064-DEVELOPMENT-TRACES.jsonl`
- `EXP-0064-DEVELOPMENT-PREDICTIONS.json`
- `EXP-0064-DEVELOPMENT-METRICS.json`
- `EXP-0064-DEVELOPMENT-ANALYSIS.md`
- `EXP-0064-INDEPENDENT-AUDIT.md`
- `EXP-0064-VISUAL-MODEL-PROVENANCE.md`

### 4.3 Statistical Comparisons & Decision Rule
- Primary: C3 vs C1
- Secondary: C2 vs C1, C3 vs C0, C2 vs C0
- McNemar exact two-sided $p$-value, paired accuracy differences with 95% CIs.
- Classify outcomes as `IMPROVES / DEGRADES / SIMILAR / INCONCLUSIVE`.
