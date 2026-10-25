# EXP-0063: CRAG Retrieval Evaluator Identity & Provenance Audit

**Experiment Identifier:** EXP-0063  
**Date:** 2026-09-20  
**Status:** COMPLETED AUDIT — TECHNICAL BLOCKER IDENTIFIED  
**Evaluator Status:** `CRAG_EVALUATOR_STATUS = NOT_READY`  

---

## 1. Audit of Existing Implementation (`crag_adapter.py`)

### 1.1 Evaluator Code Inspection
Inspection of `research/retrieval_adapters/crag_adapter.py` reveals the following implementation of the quality evaluator:

```python
def _evaluate_quality(self, results: List[Dict[str, Any]]) -> Tuple[str, float]:
    """
    Evaluates retrieval quality strictly from internal retrieval confidence.
    NEVER accesses ground-truth labels.
    Returns (decision, confidence_score) where decision is CORRECT, AMBIGUOUS, or INCORRECT.
    """
    if not results:
        return "INCORRECT", 0.0

    top_score = float(results[0].get("similarity", 0.0))
    mean_score = sum(float(r.get("similarity", 0.0)) for r in results[:3]) / max(1, min(3, len(results)))
    confidence = 0.70 * top_score + 0.30 * mean_score

    if confidence >= self.upper_threshold:
        return "CORRECT", confidence
    elif confidence >= self.lower_threshold:
        return "AMBIGUOUS", confidence
    else:
        return "INCORRECT", confidence
```

### 1.2 Structural Limitations of the In-House Heuristic
1. **Score-Space Consumption Only:**  
   The function consumes only the numeric `similarity` float attached to retrieved items. It performs a linear weighting:
   $$\text{confidence} = 0.70 \times \text{top\_score} + 0.30 \times \text{mean\_score}$$
2. **Zero Semantic or Textual Inspection:**  
   The function never accesses the `query` text or the `content` / text of the retrieved passages. It does not perform any textual inference, cross-encoding, or semantic evaluation of whether the evidence actually answers or corroborates the query.
3. **Threshold Incompatibility with Neural Late-Interaction Models:**  
   The hardcoded thresholds ($\text{upper} = 0.65, \text{lower} = 0.40$) were calibrated for bi-encoder cosine similarity scores bounded in $[0, 1]$ (as used in EXP-0040 and EXP-0046). When interfaced with PyLate ColBERT late-interaction scores, which represent unbounded MaxSim token similarities ($\sim 10.0$ to $28.0$), the computed confidence is uniformly $\ge 0.65$ (mean $\approx 16.68$), collapsing the evaluator into a permanent `CORRECT -> KEEP` state.

---

## 2. Official CRAG Architecture vs. Local Implementation

| Dimension | Official CRAG (Yan et al., 2024; `HuskyInSalt/CRAG`) | Existing Local Adapter (`crag_adapter.py`) |
| :--- | :--- | :--- |
| **Evaluator Type** | Fine-tuned lightweight sequence-to-sequence / encoder model | Hardcoded linear score heuristic |
| **Evaluator Backbone** | Fine-tuned T5-large (or similar encoder) | None (pure Python arithmetic) |
| **Evaluator Inputs** | Text sequence: $\text{Query} + \text{Retrieved Passage}$ | Numeric similarity floats: `results[i]['similarity']` |
| **Evaluator Output** | Softmax token probabilities / logits mapped to confidence | Linear combination: $0.70 \times s_1 + 0.30 \times \bar{s}_{1..3}$ |
| **External Corrective Layer** | Public Web Search (Google / Bing APIs) | Strictly Disabled (Closed educational corpus only) |
| **Internal Corrective Layer** | Sentence-level strip / decompose / recompose | Hardcoded section / sibling expansion |
| **Model Weight Residency** | Fine-tuned PyTorch checkpoint (`pytorch_model.bin` / safetensors) | Zero model weights (`requirements-crag.txt`: zero dependencies) |

---

## 3. Local Model Weight Provenance Investigation

To determine whether official CRAG evaluator weights are available locally, a systematic scan was performed:

### 3.1 Repository & Project Asset Scan
- **Repository Search:**
  - Files matching `*crag*`:
    - `research/retrieval_adapters/crag_adapter.py`
    - `requirements-crag.txt` (Contents: `# Internal closed-corpus CRAG implementation, zero extra dependencies`)
    - `research/integration_configs/crag_closed_corpus.yaml`
    - `research/integration_configs/exp0046_crag_corrective.yaml`
  - Checkpoint Search (`*checkpoint*`): Zero CRAG model checkpoints exist in `EduConnect-LMS-Experimental`.
  - Local Model Cache (`research/model_cache/`): Contains only `qwen2.5-0.5b-instruct-q4_k_m.gguf`.

### 3.2 Hugging Face Local Hub Cache Scan
Location: `$env:USERPROFILE\.cache\huggingface\hub`  
Audited Model Directories:
1. `models--answerdotai--ModernBERT-base`
2. `models--BAAI--bge-m3`
3. `models--BAAI--bge-small-en-v1.5`
4. `models--chopratejas--kompress-base`
5. `models--cross-encoder--ms-marco-MiniLM-L-6-v2`
6. `models--cross-encoder--nli-deberta-v3-xsmall`
7. `models--docling-project--docling-layout-heron`
8. `models--intfloat--e5-small-v2`
9. `models--lightonai--GTE-ModernColBERT-v1`
10. `models--microsoft--llmlingua-2-bert-base-multilingual-cased-meetingbank`

**Finding:** No checkpoint or weights from `HuskyInSalt/CRAG` exist in the local cache.

### 3.3 Manifest Audit
- `EXTERNAL-COMPONENT-MANIFEST.json`:
  ```json
  {
    "component": "CRAG",
    "repository": "HuskyInSalt/CRAG",
    "commit_or_version": "main",
    "license": "MIT",
    "package_version": "research-adapter",
    "model": "Closed-corpus rule & retrieval quality evaluator",
    "model_revision": "N/A",
    "model_license": "MIT",
    "hardware_profile": "Zero GPU memory, strictly local closed educational corpus",
    "runtime_status": "INSTALLED_EXECUTABLE",
    "actual_execution_verified": true
  }
  ```
- `research/integration/RUNTIME-CAPABILITY-MATRIX.md`:
  ```
  | CRAG | HuskyInSalt/CRAG | In-house | upstream | Confidence Heuristics | N/A | Python | READY | Yes | No | ~60 MB | N/A | ~12 ms |
  ```

---

## 4. Technical Blocker & Governance Analysis

### 4.1 Technical Blocker
1. **Absence of Official Weights:**  
   The official fine-tuned CRAG retrieval evaluator checkpoint (`HuskyInSalt/CRAG`) is not present in the local repository or local caches.
2. **Prohibition of External Downloads:**  
   Under EXP-0063 Section 6 and Section 7, all external network retrieval, web searches, remote evaluator APIs, and unverified model downloads are strictly forbidden.
3. **Prohibition of Heuristic Substitutes:**  
   Under EXP-0063 Section 2 and Section 6:
   - An unrelated LLM judge (e.g., prompt-engineered Ollama/Llama) cannot be substituted and labeled as CRAG.
   - An arbitrary similarity-score normalization (e.g., min-max scaling of PyLate scores) cannot be invented and labeled as CRAG.

### 4.2 Feasibility Gate Conclusion
Because a genuine CRAG evaluator evaluating $(\text{Query} + \text{Evidence})$ cannot be executed locally without violating the closed-environment and provenance constraints:

$$\mathbf{CRAG\_EVALUATOR\_STATUS = NOT\_READY}$$

In accordance with Section 15 and Section 27 of the EXP-0063 specification, execution **STOPS** after the feasibility investigation. No $N=400$ benchmark is initiated.
