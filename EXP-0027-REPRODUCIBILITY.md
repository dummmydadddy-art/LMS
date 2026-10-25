# EXP-0027: Complete Reproducibility & Replication Guide

**Repository:** `EduConnect-LMS-Experimental`  
**Commit SHA:** `dea0027104b6fa138d88e039aa5463fdf7422cdb`  
**Evaluation Manifest:** `EXP-0027-EVALUATION-MANIFEST.json`  
**Execution Environment:** Windows 11, PHP 8.3.32, Ollama 0.5.x  

---

## 1. Frozen Artifact Hashes

| Dataset File | Cases | SHA-256 Checksum |
|---|---|---|
| `EXP-0027-BLIND-DATASET.json` | 1000 | `599B018097EAF56E817302B1BA6DCEE0A91CF773FD7E89898BB9FFCDAA87A9DB` |
| `EXP-0027-CROSS-DOMAIN-DATASET.json` | 200 | `55DDFC52D1FA557CBF4E42D3788938E7151BFEC1214B4D3142511228C1437238` |
| `EXP-0027-LEAVEOUT-DATASET.json` | 300 | `7CEDCEFCA1FA7F95B4954A93EEB428B2DA2D93C24EA374CD4DE6151120C0F54A` |
| `EXP-0027-POLARITY-DATASET.json` | 200 | `0FBE22E07FC372B6DEBB1B0C5F12AC5917A996C85D47E2247C749C63004E7B7A` |
| `EXP-0027-PARAPHRASE-DATASET.json` | 300 | `8BEE0785E60E40340961EE88F499DA519776539E77701D36F442F4AAA9E59F63` |
| `EXP-0027-OOD-DATASET.json` | 200 | `9DA525333226F652EDA737E65FA9D11A6E68727536F77646F9BFAE65FADECD48` |

---

## 2. Model & Runtime Specifications

- **Model Identifier:** `llama3.2:latest` (Ollama ID: `a80c4f17acd5`, 2.0 GB)
- **Ollama API:** `POST http://127.0.0.1:11434/api/generate`
- **Temperature:** `0.0`
- **Number of Predict Tokens (`num_predict`):** `25`
- **Inference Threads (`num_thread`):** `8`
- **Output Format:** `json`
- **Keep-Alive:** `-1` (resident in memory)
- **NLI Prompt Template:**
  ```
  Premise: "{premise}"
  Hypothesis: "{hypothesis}"
  Task: Determine relation strictly from Premise alone (CONTRADICTION, ENTAILMENT, or NEUTRAL). Do not assume unstated facts.
  JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
  ```
- **Threshold Policy:**
  - `A5` / `A4`: Threshold = `0.70`
  - `A1`: Threshold = `0.50`
  - Below threshold resolves to `NOT_ESTABLISHED` (abstention)

---

## 3. Retrieval Pre-Fetching & Cache Protocol

To eliminate retrieval variance between ablation modes:
1. Search queries are pre-fetched once using `RagService::search($query, null, null, 4, 0.20)`.
2. Retrieved chunks are stored in `scratch/curriculum_retrieval_cache_2200.json`.
3. Every ablation mode (A0, A5, A1, A4) executes against the **exact same frozen retrieved evidence**.
4. Before beginning each mode evaluation, the in-memory `$nliCache` is completely wiped via PHP Reflection to guarantee honest cold and uncached latency logging.

---

## 4. Step-by-Step Reproduction Command

To reproduce the exact numbers reported in `EXP-0027-EVALUATION-RESULTS.json`:

```powershell
# 1. Ensure Ollama is running with llama3.2:latest
ollama run llama3.2:latest ""

# 2. Set directory
cd "d:\Collage project\EduConnect-LMS-Experimental"

# 3. Execute evaluation harness
php scratch/run_exp0027_full_evaluation.php
```

All predictions are written to `EXP-0027-EVALUATION-RESULTS.json` and error cases to `EXP-0027-ERROR-CASES.json`.
