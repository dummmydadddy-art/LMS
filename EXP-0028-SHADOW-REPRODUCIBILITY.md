# EXP-0028: Shadow Evaluation Reproducibility Specification

**Experiment:** EXP-0028 Shadow Evaluation  
**Date:** 2026-09-16  
**Repository:** `EduConnect-LMS-Experimental` (branch: `exp-0028`, commit: `2cfc95a`)  
**Production Isolation:** `EduConnect-LMS-Production` (Untouched, commit: `1768832`)  

---

## 1. Hardware & Runtime Environment

- **Operating System:** Windows 11 Enterprise (Build 26100)
- **CPU:** Intel Core i5-12450HX (8 cores, 12 threads)
- **RAM:** 16.0 GB DDR5
- **PHP CLI:** PHP 8.3.28 (`PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe`)
- **LLM Inference Engine:** Ollama v0.5.x
- **Model Identifier:** `llama3.2:latest` (Digest: `a80c4f17acd5`, Parameter Size: 3.2B, Quantization: Q4_K_M, Size: 2.02 GB)
- **Ollama Configuration:**
  - Endpoint: `http://127.0.0.1:11434/api/generate`
  - Temperature: 0.0 (strictly deterministic)
  - Max Tokens: 25 (`num_predict`)
  - Threads: 8 (`num_thread`)
  - Keep-Alive: -1 (persistent memory)
  - Format: `json`

---

## 2. Cryptographic Checksums (SHA-256)

| Asset Name | Relative Path | SHA-256 Checksum |
|---|---|---|
| **Shadow Dataset** | `EXP-0028-SHADOW-DATASET.json` | `54586d27794d9539bff8ec89ba8b7f8de1b274ea392fec55053c217679dc1272` |
| **Shadow Results** | `EXP-0028-SHADOW-RESULTS.json` | `c5403534c347652fd6d0642f9e9c5db219aaea268c8578ca52baabf5211eea70` |
| **Premise Verifier** | `backend/rag_premise_verifier.php` | `bd800f2eaa3e10398e4abd328e6b699b7621e83bc2ae42682cf9192c965543aa` |
| **Feature Flags** | `backend/rag_flags.php` | `d7265bc58000f08ecbbefeaaebe57c79318b76ce65fb4f971844fa92ea407c08` |
| **Retrieval Cache** | `scratch/shadow_retrieval_cache_500.json` | `54ebcb464fb8ea85cfa69c1e7a022513903112d7c00eb3bb6226c117d91cb793` |
| **Evaluation Checkpoint** | `scratch/exp0028_shadow_checkpoint.json` | Generated during run |

---

## 3. Step-by-Step Reproduction Procedure

### Step 1: Verify Prerequisites
Ensure Ollama is running and `llama3.2:latest` is loaded:
```powershell
curl.exe -s http://127.0.0.1:11434/api/tags
curl.exe -s http://127.0.0.1:11434/api/generate -d '{"model": "llama3.2:latest", "prompt": "test", "stream": false}'
```

### Step 2: Verify Production Repository Isolation
Confirm zero modifications in Production:
```powershell
git -C "d:/Collage project/EduConnect-LMS-Production" status --porcelain
```

### Step 3: Run Full Shadow Evaluation
Execute the unbuffered evaluation runner across all 500 cases for both A5 and B5, plus multi-turn simulation:
```powershell
& "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" `
  "C:\Users\Mukul\.gemini\antigravity\brain8c22c50-cad0-43ae-871f-10ded3240804\scratchun_shadow_full_eval.php"
```

### Step 4: Run Statistical Analysis & Metric Verification
```powershell
& "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" `
  "C:\Users\Mukul\.gemini\antigravity\brain8c22c50-cad0-43ae-871f-10ded3240804\scratchun_shadow_analysis.php"
```

### Step 5: Run Security Regression Checks
```powershell
& "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" `
  "C:\Users\Mukul\.gemini\antigravity\brain8c22c50-cad0-43ae-871f-10ded3240804\scratchun_security_regression_check.php"
```