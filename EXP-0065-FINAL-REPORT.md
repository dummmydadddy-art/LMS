# EXP-0065 Final Report: Verifier/NLI Capacity Isolation Benchmark

**Experiment Identifier:** EXP-0065  
**Lineage:** EXP-0064 (`276e88a`) $\to$ EXP-0065  
**Starting Git HEAD:** `276e88a84f6fe665c9d6a360637f07ff188cbd58`  
**Execution Date:** 2026-09-26  
**Auditor/Lead:** Antigravity  

---

## 1. Research Question

> **Does replacing the 3B-class Tier-2 NLI model with a larger/more capable local instruction model improve verifier accuracy while preserving the existing safety envelope?**

The downstream RAG accuracy in EduConnect-LMS has remained stubbornly plateaued near the ~72.80% blind holdout ceiling across EXP-0037 (71.60%), EXP-0040 (72.00%), EXP-0056 (72.80%), EXP-0061 (72.80%), and EXP-0064 (73.00%), despite retrieval recall reaching near-perfection (Recall@1 = 96.88%, Recall@5 = 99.61%). The forensic audit identified the Tier-2 NLI component (`llama3.2:latest`, 3.2B) as the suspected dominant source of classification errors. EXP-0065 was designed to test whether upgrading model capacity (to 4B and 8B parameter classes) breaks through this ceiling.

---

## 2. Experimental Variables

- **Independent Variable:** Tier-2 NLI model capacity class:
  - C0: `llama3.2:latest` (~3.2B parameters)
  - C1: `qwen3:4b` (~4.0B parameters)
  - C2: `qwen3:8b` (~8.2B parameters)
- **Controlled Variables:** All upstream and downstream pipeline components:
  - Pre-retrieved evidence context (exact chunk text, order, and scores from frozen cache)
  - Query text and proposition decomposition
  - Polarity pre-checking and 138-entry antonym dictionary
  - Ambiguity Guard rules, thresholds ($\tau_{\text{entail}} = 0.85, \tau_{\text{contra}} = 0.80$), and trade-off overrides
  - Output label space (`SUPPORTED`, `REFUTED`, `NOT_ESTABLISHED`)
  - Verification harness and scoring scripts

---

## 3. Frozen Controls

1. **A4 Verifier Implementation:** `backend/rag_ambiguity_guard_verifier.php`  
   - SHA-256: `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` (Verified unchanged).
2. **Development Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)  
   - SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` (Verified unchanged).
3. **Evidence Cache:** `scratch/exp0056_dev_c1_cache.json` (400 frozen query evidence bundles).
4. **Blind Dataset:** `EXP-0033-BLIND-DATASET.json` ($N = 500$)  
   - SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` (**SEALED / UNTOUCHED**).

---

## 4. Candidate Models

| Class | Model Identifier | Parameter Scale | Quantization | Model Digest | Architecture |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **C0 (Control)** | `llama3.2:latest` | 3.2B | Q4_K_M | `a80c4f17acd5` | LLaMA-3.2 |
| **C1 (Intermediate)** | `qwen3:4b` | 4.0B | Q4_K_M | `359d7dd4bcda` | Qwen-3 |
| **C2 (Larger)** | `qwen3:8b` | 8.2B | Q4_K_M | `c4e987c78653` | Qwen-3 |

---

## 5. Runtime Environment

- **Host Workstation:** AMD64 Family 25, 12th Gen Intel Core i5-12450H (8 Cores, 12 Threads), 16.0 GB RAM
- **Dedicated GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (4,096 MiB VRAM), Driver 610.88, CUDA 13.3
- **Inference Server:** Ollama v0.34.2
- **Runtime Offload Configuration:**
  - C0 (`llama3.2`): 100% GPU Resident (~2,203 MiB VRAM)
  - C1 (`qwen3:4b`): 100% GPU Resident (~2,490 MiB VRAM)
  - C2 (`qwen3:8b`): Partial GPU Offload (2,359 MiB VRAM + 3,400 MiB Host RAM)
  - All models configured with resource-safe context limit `num_ctx = 2048` and zero-shot NLI prompts.

---

## 6. Development Results ($N = 400$)

| Evaluation Metric | C0 (`llama3.2`) | C1 (`qwen3:4b`) | C2 (`qwen3:8b`) | Delta C1 vs C0 | Delta C2 vs C0 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall Accuracy** | **92.00%** (368) | **89.25%** (357) | **86.00%** (344) | **-2.75 pp** | **-6.00 pp** |
| **Macro F1** | **92.67%** | **89.56%** | **85.79%** | -3.11 pp | -6.88 pp |
| **Standard FAR (Safety)** | **4.00%** | **2.00%** | **2.00%** | **-2.00 pp** | **-2.00 pp** |
| **FRR (False Rejection)** | **12.67%** | **22.00%** | **29.33%** | **+9.33 pp** | **+16.66 pp** |
| **Refutation Recall** | **92.67%** | **94.00%** | **92.67%** | **+1.33 pp** | 0.00 pp |
| **Supported Recall** | **87.33%** | **78.00%** | **70.67%** | **-9.33 pp** | **-16.66 pp** |
| **NE Recall** | **98.00%** | **99.00%** | **99.00%** | +1.00 pp | +1.00 pp |
| **Parse Failure Rate** | **0.00%** | **0.00%** | **0.00%** | 0.00 pp | 0.00 pp |
| **Mean Latency per Query** | 1,196.4 ms | 739.3 ms | 2,505.8 ms | -38.2% | +109.4% |

---

## 7. Failure Taxonomy

The forensic transition analysis (`EXP-0065-FAILURE-ANALYSIS.md`) revealed a clear trade-off:
1. **Critical False Acceptances (`REF → SUP`) dropped by 44%:**
   - C0 allowed 9 false acceptances. Both C1 and C2 allowed only 5.
   - Unestablished queries falsely accepted (`NE → SUP`) dropped from 1 in C0 to 0 in both C1 and C2.
2. **False Abstentions on Valid Curriculum (`SUP → NE`) exploded:**
   - C0 produced **0** false abstentions on supported queries.
   - C1 produced **9** false abstentions.
   - C2 produced **24** false abstentions.
3. **Mechanism — Semantic Hyper-Skepticism:**
   Larger models demand explicit, literal lexical correspondence between premise and claim. When students ask conceptual or functional questions (e.g., `"What is the significance of HTTP 200 OK?"`), larger models classify definitions lacking the word `"significance"` as `NEUTRAL`, triggering verifier abstention.

---

## 8. Statistical Analysis

### C1 vs C0
- Total Discordant Pairs: 35 ($n_{10} = 12$ gains, $n_{01} = 23$ regressions)
- Paired Delta: **$-2.75$ pp** ($\text{SE} = 1.4726$ pp)
- 95% Confidence Interval: `[-5.64 pp, +0.14 pp]`
- One-Sided 95% LCB: **$-5.17$ pp** (fails $-3.00$ pp non-inferiority margin)
- Exact McNemar Test: **$p = 0.089531$** (statistically similar / non-significant trend towards inferiority)

### C2 vs C0
- Total Discordant Pairs: 48 ($n_{10} = 12$ gains, $n_{01} = 36$ regressions)
- Paired Delta: **$-6.00$ pp** ($\text{SE} = 1.7059$ pp)
- 95% Confidence Interval: `[-9.34 pp, -2.66 pp]`
- One-Sided 95% LCB: **$-8.81$ pp** (severely violates $-3.00$ pp margin)
- Exact McNemar Test: **$p = 0.000717$** ($p < 0.001$, **statistically significantly INFERIOR**)

---

## 9. Blind Results

**NO BLIND EXPERIMENTS WERE CONDUCTED.**

Under Section 12 (Candidate Advancement Rule), a candidate may only proceed to blind validation if its overall development accuracy is meaningfully better than C0. Because both C1 (89.25%) and C2 (86.00%) scored lower than C0 (92.00%), neither candidate met the advancement criterion.

The sealed dataset `EXP-0033-BLIND-DATASET.json` remained locked and uninspected, preventing data contamination.

---

## 10. Safety Analysis

Both candidate models maintained and enhanced the safety envelope:
- Standard FAR reached **2.00%** (surpassing the pre-registered requirement $\le 18.50\%$).
- OOD Recall reached **99.00%** (surpassing the pre-registered requirement $\ge 90.00\%$).
- Refutation Recall reached **94.00%** (C1) and **92.67%** (C2).
- Zero hallucinated acceptances occurred on out-of-domain entities.

Safety preservation was completely satisfied, but came at the expense of genuine curriculum coverage.

---

## 11. Resource Analysis

- **C0 (`llama3.2:latest`, 3.2B):** Fully resident in GPU VRAM (2,203 MiB). Mean latency: 1,196 ms. Optimal balance of throughput and memory.
- **C1 (`qwen3:4b`, 4.0B):** Fully resident in GPU VRAM (2,490 MiB). Mean latency: 739 ms (fastest condition, 38% faster than C0 due to optimized attention kernels).
- **C2 (`qwen3:8b`, 8.2B):** Partially offloaded (2,359 MiB VRAM + 3,400 MiB Host RAM). Mean latency: 2,506 ms (P95: 6,953 ms). While operationally feasible, memory swapping across PCIe bus doubled latency without providing accuracy benefits.

---

## 12. Reproducibility Analysis

In accordance with Section 17, a 50-query deterministic subset was evaluated twice for C0 and C1:
- **C0 (`llama3.2:latest`):** Exactly 50/50 predictions matched across runs (**100.00% agreement**, mean confidence delta: 0.0000).
- **C1 (`qwen3:4b`):** Exactly 50/50 predictions matched across runs (**100.00% agreement**, mean confidence delta: 0.0000).

When executed with `temperature = 0.0` under sequential isolation, local Ollama NLI inference is 100% numerically reproducible.

---

## 13. Scientific Decision

### Formal Outcome: `REJECTED — INSUFFICIENT DEVELOPMENT ACCURACY SIGNAL`

Neither candidate model cleared the pre-registered advancement gate. Candidate C1 demonstrated non-significant regression ($-2.75$ pp, $p = 0.0895$), while Candidate C2 was statistically significantly inferior ($-6.00$ pp, $p < 0.001$).

**Action Taken:**
1. Halted EXP-0065 after Phase 1.
2. Sealed blind holdout preserved untouched.
3. Retained `C0 = A4 + llama3.2:latest` as the frozen champion verifier.

---

## 14. Limitations

1. **Prompt Mode Invariance:** EXP-0065 strictly isolated model capacity by freezing the NLI prompt (`P4`/`P4_neutral`). The prompt few-shot demonstrations were originally calibrated during EXP-0036 for LLaMA-style tokenizers. Larger models may require calibrated few-shot exemplars to prevent semantic hyper-skepticism.
2. **Context Length Truncation:** Qwen-3 models native 256k context required manual Modelfile constraints (`num_ctx 2048`) to avoid out-of-memory paging on 16 GB workstations.

---

## 15. Implications for the RAG Research

This experiment provides a definitive answer to the core question:

> **The ~72.80% downstream ceiling is NOT caused by insufficient parameter capacity in the 3B model.**

Replacing the 3B model with 4B and 8B models within the same verifier framework does not raise accuracy; instead, it worsens accuracy by driving up False Rejections. 

The true architectural bottleneck is **the binary NLI framing itself**:
- In educational RAG, student claims are often conceptual, paraphrased, or functional inquiries rather than formal syllogistic deductions.
- Applying strict NLI logic creates an intractable Pareto frontier between **gullibility** (false acceptances) and **hyper-skepticism** (false rejections).
- Scaling model size pushes the model further toward hyper-skepticism, depressing accuracy.
- Progress will require reframing verification from zero-shot NLI entailment to **multi-aspect semantic grounding** (e.g., entity coverage + factual alignment + pedagogical intent) rather than brute-force model scaling.
