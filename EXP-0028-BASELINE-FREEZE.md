# EXP-0028: Baseline Freeze Specification (EXP-0027 Champion Baseline)

**Experiment:** EXP-0028 (Next-Generation Semantic NLI Premise Verifier)  
**Baseline Experiment:** EXP-0027 (Hybrid Evidence-Grounded Premise Verifier)  
**Baseline Commit SHA:** `dea0027104b6fa138d88e039aa5463fdf7422cdb`  
**Baseline Certified Status:** CONDITIONAL CHAMPION  
**Freeze Date:** 2026-09-15T13:16:26+00:00  
**Primary Baseline Architecture:** Mode `A5` (Two-Tier Hybrid Candidate)  

---

## 1. Frozen Verifier Architecture (Mode A5)

- **Implementation File:** `backend/rag_premise_verifier.php` (950 lines)
- **Tier-1 Fast Path:** 138-pair semantic opposite dictionary (lines 40-360) + 24 predicate negation keywords + entity cross-contamination filters.
- **Tier-2 Semantic NLI:** Local Ollama zero-shot JSON completion with `llama3.2:latest`.
- **NLI Prompt Template (verbatim):**
  ```
  Premise: "{premise}"
  Hypothesis: "{hypothesis}"
  Task: Determine relation strictly from Premise alone (CONTRADICTION, ENTAILMENT, or NEUTRAL). Do not assume unstated facts.
  JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
  ```
- **Inference Parameters:** temperature = 0.0, num_predict = 25, num_thread = 8, format = json, keep_alive = -1.
- **Decision Threshold:** confidence >= 0.70 for CONTRADICTION or ENTAILMENT; below 0.70 resolves to NOT_ESTABLISHED.
- **Retrieval Settings:** K = 4 chunks, search minSimilarity = 0.20, verifier curriculum boundary threshold = 0.28.

---

## 2. Frozen Dataset Checksums & Coverage

| Dataset | Cases | SHA-256 Checksum |
|---|---|---|
| `EXP-0027-BLIND-DATASET.json` | 1000 | `599B018097EAF56E817302B1BA6DCEE0A91CF773FD7E89898BB9FFCDAA87A9DB` |
| `EXP-0027-CROSS-DOMAIN-DATASET.json` | 200 | `55DDFC52D1FA557CBF4E42D3788938E7151BFEC1214B4D3142511228C1437238` |
| `EXP-0027-LEAVEOUT-DATASET.json` | 300 | `7CEDCEFCA1FA7F95B4954A93EEB428B2DA2D93C24EA374CD4DE6151120C0F54A` |
| `EXP-0027-POLARITY-DATASET.json` | 200 | `0FBE22E07FC372B6DEBB1B0C5F12AC5917A996C85D47E2247C749C63004E7B7A` |
| `EXP-0027-PARAPHRASE-DATASET.json` | 300 | `8BEE0785E60E40340961EE88F499DA519776539E77701D36F442F4AAA9E59F63` |
| `EXP-0027-OOD-DATASET.json` | 200 | `9DA525333226F652EDA737E65FA9D11A6E68727536F77646F9BFAE65FADECD48` |

---

## 3. Certified Baseline Performance Metrics (Mode A5)

| Benchmark | Cases | Accuracy | Macro F1 | Refutation Recall | False Acceptance (FAR) | Tier-2 Usage |
|---|---|---|---|---|---|---|
| **BLIND** | 1000 | **66.9%** | 65.8% | 46.67% | 19.67% | 68.7% |
| **CROSS-DOMAIN** | 200 | **54.5%** | 42.28% | 56% | 11% | 84% |
| **LEAVEOUT** | 300 | **50.33%** | 22.32% | 50.33% | 29.33% | 83.67% |
| **POLARITY** | 200 | **74%** | 47.87% | 54% | 28% | 69% |
| **PARAPHRASE** | 300 | **74.67%** | 73.81% | 55% | 8% | 54.67% |
| **OOD** | 200 | **40%** | 27.78% | 10% | 40% | 98% |
| **OVERALL (2,200 cases)** | 2200 | **62.77%** | 62.69% | 46.21% | 23.16% | 72.91% |

### Supplementary Baseline References:
- **A0 (Tier-1 Only Baseline):** Overall Accuracy = 53.23%, Macro F1 = 52.99%, Refutation Recall = 28.11%
- **A4 (Dictionary-Disabled Ablation):** Overall Accuracy = 61.55%, Macro F1 = 59.32%
- **Latency Profile (A5):** Tier-1 median = 4.2 ms; Tier-2 uncached median (p50) = 992.4 ms; Tier-2 p95 = 1973.3 ms; cold first-call = 1264 ms.

---

## 4. Documented Systemic Failure Modes

The EXP-0027 error taxonomy recorded 819 total errors in A5 across 2,200 cases, dominated by three mechanisms:
1. **Semantic Contradiction Misses (n = 236, 28.8% of errors):** Lexical overlap causes the zero-shot model to classify false premises as `ENTAILMENT`.
2. **Zero-Shot Abstention (n = 224, 27.3% of errors):** Over-conservative interpretation of 'Do not assume unstated facts' causes `NEUTRAL` output on genuine contradictions.
3. **Polarity & Paraphrase Inversions (n = 140, 17.1% of errors):** Colloquial double negatives and inverted grammatical phrasing bypass Tier-1 and confuse proposition extraction.

---

## 5. Provenance & Invariant Checklist

- [x] EXP-0027 commit `dea0027104b6fa138d88e039aa5463fdf7422cdb` tagged and committed on `exp-0027`.
- [x] New experiment branch `exp-0028` created from committed baseline.
- [x] All 6 EXP-0027 datasets preserved without alteration.
- [x] `evidence_used: true` strict invariant enforced across all exits.
- [x] S1 security remediation code frozen and intact.
