# EXP-0028: Reproducibility Guide & Verification Protocol

**Experiment:** EXP-0028 (Next-Generation Semantic NLI Premise Verifier)  
**Target Branch:** `exp-0028`  
**Base Commit:** `e40be39c80e5db488ac9c26c274d1e5a983fadfa`  
**Certified Status:** CHAMPION (Mode B5)  
**Date Certified:** 2026-09-15  

---

## 1. System Requirements & Hardware Configuration

- **Host Operating System:** Windows 11 Enterprise / Pro (x86_64)
- **Execution Shell:** Windows PowerShell 5.1 / 7.x
- **PHP Runtime:** PHP 8.3.x CLI (with `curl`, `json`, `mbstring`, `sqlite3` extensions enabled)
- **Local LLM Engine:** Ollama v0.3+ running on `http://127.0.0.1:11434`
- **Model Identifier:** `llama3.2:latest`
  - Model Digest: `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`
  - Quantization: Q4_K_M (3.2B parameters)
  - Context Size: 131,072 tokens
  - Inference Settings: `temperature = 0.0`, `num_predict = 25`, `num_thread = 8`, `format = json`, `keep_alive = -1`
- **Memory Requirements:** Minimum 16 GB RAM (Ollama allocates ~2.2 GB VRAM/RAM for `llama3.2:latest`; PHP memory limit set to 2,048 MB for JSON processing).

---

## 2. Dataset Provenance & SHA-256 Checksums

All datasets evaluated in EXP-0028 are immutable, frozen, and verified by cryptographic hashes:

| Dataset File | Case Count | SHA-256 Checksum |
|---|---|---|
| `EXP-0028-FAILURE-DATASET.json` | 600 | `1F05411DB9101F08D450D7115DF420D6AB2876D4D58003CD2F8A7DFA18DAF92B` |
| `EXP-0027-LEAVEOUT-DATASET.json` | 300 | `7CEDCEFCA1FA7F95B4954A93EEB428B2DA2D93C24EA374CD4DE6151120C0F54A` |
| `EXP-0027-CROSS-DOMAIN-DATASET.json` | 200 | `55DDFC52D1FA557CBF4E42D3788938E7151BFEC1214B4D3142511228C1437238` |
| `EXP-0027-OOD-DATASET.json` | 200 | `9DA525333226F652EDA737E65FA9D11A6E68727536F77646F9BFAE65FADECD48` |
| `EXP-0027-PARAPHRASE-DATASET.json` | 300 | `8BEE0785E60E40340961EE88F499DA519776539E77701D36F442F4AAA9E59F63` |
| `backend/rag_premise_verifier.php` | 1073 lines | `BD800F2EAA3E10398E4ABD328E6B699B7621E83BC2AE42682CF9192C965543AA` |

---

## 3. Strict Zero-Dictionary Integrity Audit

EXP-0028 enforced the strict constraint that **zero new handcrafted dictionary pairs or keyword rules** could be added to Tier-1.

To audit code integrity:
```powershell
# Verify that the semantic dictionary in backend/rag_premise_verifier.php remains exactly 138 pairs:
php -r '
require "backend/rag_premise_verifier.php";
$ref = new ReflectionProperty("RagPremiseVerifier", "semanticOpposites");
$ref->setAccessible(true);
$dict = $ref->getValue();
echo "Total Tier-1 Opposite Pairs: " . count($dict) . PHP_EOL;
exit(count($dict) === 138 ? 0 : 1);
'
# Expected output: Total Tier-1 Opposite Pairs: 138
```

---

## 4. Step-by-Step Reproduction Protocol

### Step 1: Environment Setup & Health Checks
Confirm Ollama is running and responding:
```powershell
curl.exe -s http://127.0.0.1:11434/api/tags | findstr "llama3.2:latest"
```

### Step 2: Warm-up Ollama Model
Pre-warm the model into memory to ensure reproducible warm-call latency:
```powershell
php -r '
require "backend/rag_premise_verifier.php";
$res = RagPremiseVerifier::callTier2Nli("HTML5 header element", "Header provides structure");
echo "Warm-up latency: " . $res["latency_ms"] . " ms" . PHP_EOL;
'
```

### Step 3: Run the 50-Case Pilot
Verify mode divergence, two-pass execution, and honest uncached latency:
```powershell
php scratch/run_exp0028_pilot.php
```

### Step 4: Run the Complete 19-Job Evaluation Suite
Execute the full evaluation harness across all benchmarks:
```powershell
php scratch/run_exp0028_full_eval.php
```
*Note: The harness supports automatic idempotent resumption via `scratch/exp0028_eval_checkpoint.json`.*

### Step 5: Generate and Verify Results Manifest
```powershell
php scratch/generate_exp0028_final_artifacts.php
```

---

## 5. Statistical Verification Commands

To recompute McNemar significance tests and confidence intervals directly:
```powershell
php scratch/run_exp0028_analysis.php
```
Expected summary results:
- `LEAVEOUT`: A5 = 49.33%, B5 = 65.33% ($\Delta = +16.00$ pp, $p < 0.001$, Significant)
- `CROSS-DOMAIN`: A5 = 56.50%, B5 = 63.50% ($\Delta = +7.00$ pp, $p = 0.045$, Significant)
- `OOD`: A5 = 41.00%, B5 = 54.50% ($\Delta = +13.50$ pp, $p < 0.001$, Significant)
- `PARAPHRASE`: A5 = 76.67%, B5 = 87.67% ($\Delta = +11.00$ pp, $p < 0.001$, Significant)
- `FAILURE_600`: A5 = 49.17%, B5 = 55.67% ($\Delta = +6.50$ pp, $p = 0.010$, Significant)