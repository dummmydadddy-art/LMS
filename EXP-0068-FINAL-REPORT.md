# EXP-0068 Final Report: Dedicated NLI Cross-Encoder Architecture Benchmark

**Experiment ID:** EXP-0068  
**Date:** 2026-09-26  
**Status:** Complete Research Report (Negative Result / Stop Rule Executed)  
**Repository:** `EduConnect-LMS-Experimental`  
**Branch:** `research-integration`  
**Starting HEAD:** `d217d456218213184f4c88d79d0281e4053156a3` (`d217d45`)  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (Untouched)  

---

## Research Question

Can a dedicated premise–hypothesis Natural Language Inference (NLI) cross-encoder sequence-classification model classify claim–evidence relations more reliably than a generative instruction LLM (`llama3.2:latest`) used as zero-shot NLI, reducing presupposition-driven false acceptances while avoiding semantic hyper-skepticism?

---

## Hypotheses

- **H1 (Architectural Superiority):** A task-specialized premise–hypothesis cross-encoder sequence-classification model will achieve higher NLI classification accuracy on claim–evidence verification than a generative instruction LLM (`llama3.2:latest`) operating zero-shot via JSON prompting.  
  *(FALSIFIED: C1 achieved 70.00% and C2 achieved 68.00% vs C0 92.00% dev accuracy, both $p < 10^{-23}$).*
- **H2 (Presupposition Resistance):** A dedicated cross-encoder will significantly reduce presupposition-driven false acceptances (`REFUTED -> SUPPORTED`) by evaluating the explicit premise–hypothesis entailment relation directly rather than generating conversational continuations.  
  *(CONFIRMED: False Acceptance Rate dropped from 6.00% in C0 to 0.67% in C1 and 1.33% in C2).*
- **H3 (Paraphrase Robustness):** A dedicated cross-encoder will reduce semantic hyper-skepticism / false rejections (`SUPPORTED -> REFUTED`) by learning dense cross-attention representations of semantic entailment that tolerate lexical variation.  
  *(FALSIFIED: Supported Recall collapsed from 87.33% in C0 to 38.67% in C1 and 33.33% in C2; models traded false acceptance for massive false abstention, classifying 75–83 supported claims as `NOT_ESTABLISHED`).*

---

## Frozen Components

To guarantee 100.0% attribution of experimental deltas to the Tier-2 NLI model architecture:
1. **Retrieval Pipeline:** BGE-M3 dense/sparse retrieval + Qdrant vector store + PyLate ColBERT reranking (Recall@1 = 96.88%, Recall@5 = 99.61%) strictly frozen.
2. **Document Representation:** Chunking, token boundaries, and parent–child hierarchies frozen.
3. **Tier-1 Deterministic Checks:** Antonym dictionary (`$semanticOpposites`), fast-path regex rules, and entity alignment checks frozen. Exactly 192 cases resolved by Tier-1 in all conditions.
4. **Verifier Logic:** Intent classification, clause decomposition, polarity pre-processing, ambiguity detection, predicate decomposition, post-verification guards, and clause aggregation frozen.
5. **Generator:** Generation is excluded.
6. **Datasets:** Development set (`EXP-0025-DEVELOPMENT-DATASET.json`, $N=400$, SHA-256: `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b`) and blind holdout (`EXP-0033-BLIND-DATASET.json`, $N=500$, SHA-256: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`, SEALED) strictly preserved.
7. **Production:** `EduConnect-LMS-Production` untouched.

---

## Candidate Models

- **C0 (Frozen Control Baseline):** `llama3.2:latest` (~3.2B parameters, GGUF Q4_K_M) via Ollama, evaluating prompt P4/P4_neutral with frozen thresholds ($\tau_{\text{entail}}=0.85, \tau_{\text{contra}}=0.80$).
- **C1 (NLI MiniLM2):** `cross-encoder/nli-MiniLM2-L6-H768` (82,120,707 parameters), native 3-class argmax sequence classifier.
- **C2 (DeBERTa NLI):** `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` (184,424,451 parameters), native 3-class argmax sequence classifier.

---

## Model Provenance

### C1 — NLI MiniLM2
- **Hugging Face Model ID:** `cross-encoder/nli-MiniLM2-L6-H768`
- **Git Commit / Revision:** `b95119ce93d3e065de6214e38cd4a97b0f2f2c6d`
- **Architecture:** `RobertaForSequenceClassification` / MiniLM2 (6 layers, 768 hidden, 12 attention heads)
- **Parameter Count:** 82,120,707
- **Model File Size:** 328,499,560 bytes (`model.safetensors`, SHA-256: `afb027fa57b44a3a499e49e88ea14e45d613378c377d3bfb8c029ff448bddba1`)
- **Training Datasets:** SNLI + MultiNLI
- **Class Mapping (`id2label`):** 0: `contradiction` $\to$ `REFUTED`, 1: `entailment` $\to$ `SUPPORTED`, 2: `neutral` $\to$ `NOT_ESTABLISHED`.

### C2 — DeBERTa NLI
- **Hugging Face Model ID:** `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`
- **Git Commit / Revision:** `6f5cf0a2b59cabb106aca4c287eed12e357e90eb`
- **Architecture:** `DebertaV2ForSequenceClassification` (DeBERTa-v3-base)
- **Parameter Count:** 184,424,451
- **Model File Size:** 368,877,646 bytes (`model.safetensors`, SHA-256: `226900ab5e6b409d814f3974c22f883ed961d3d1889cc117c9eeb2fdf461b0c0`)
- **Training Datasets:** MultiNLI + FEVER-NLI + ANLI (Adversarial NLI Rounds 1–3)
- **Class Mapping (`id2label`):** 0: `entailment` $\to$ `SUPPORTED`, 1: `neutral` $\to$ `NOT_ESTABLISHED`, 2: `contradiction` $\to$ `REFUTED`.

---

## Development Results

| Metric | C0 Control (`llama3.2`) | C1 (`nli-MiniLM2`) | C2 (`DeBERTa-v3`) |
| :--- | :---: | :---: | :---: |
| **Accuracy** | **92.00%** (368/400) | **70.00%** (280/400) | **68.00%** (272/400) |
| **Macro F1** | **92.67%** | **68.60%** | **66.18%** |
| **FAR (False Acceptance Rate)** | 6.00% (9/150) | **0.67%** (1/150) | **1.33%** (2/150) |
| **FRR (False Rejection Rate)** | 12.67% (19/150) | **11.33%** (17/150) | **11.33%** (17/150) |
| **Supported Recall** | **87.33%** (131/150) | **38.67%** (58/150) | **33.33%** (50/150) |
| **Refutation Recall** | **92.67%** (139/150) | **83.33%** (125/150) | **82.00%** (123/150) |
| **OOD Recall (Safety)** | 98.00% (98/100) | 97.00% (97/100) | **99.00%** (99/100) |

---

## Hard-Stratum Results

| Stratum | Description | $N$ | C0 Accuracy | C1 Accuracy | C2 Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **S1** | Antonym-Assisted | 81 | **77.78%** | 64.20% | 61.73% |
| **S2** | Non-Antonym | 319 | **95.61%** | 71.47% | 69.59% |
| **S3** | High-Overlap Support | 100 | **85.00%** | 30.00% | 29.00% |
| **S4** | Low-Overlap Paraphrase | 50 | **92.00%** | 56.00% | 42.00% |
| **S5** | Normative / Universal | 81 | **91.36%** | 59.26% | 61.73% |
| **S6** | Compound Multi-Clause | 75 | **90.67%** | 76.00% | 76.00% |
| **S7** | Out-of-Curriculum OOD | 100 | 98.00% | 97.00% | **99.00%** |

---

## False-Acceptance Analysis

False acceptances (`REFUTED -> SUPPORTED`) were successfully suppressed:
- C0: 9 cases (FAR = 6.00%)
- C1: 1 case (FAR = 0.67%, -88.9% reduction)
- C2: 2 cases (FAR = 1.33%, -77.8% reduction)

Because dedicated cross-encoders evaluate the premise-hypothesis token pairs directly through dense cross-attention rather than auto-regressively completing conversational turns, they do not suffer from generative presupposition alignment. However, this gain was achieved by routing claims into `NEUTRAL`, rather than correctly identifying technical contradictions (24 cases in C1 and 25 in C2 were classified as `NOT_ESTABLISHED` instead of `REFUTED`).

---

## False-Rejection Analysis

False rejections of valid supported claims (`SUPPORTED -> REFUTED`) were largely governed by Tier-1 fast-paths:
- C0: 19 cases (FRR = 12.67%)
- C1: 17 cases (FRR = 11.33%)
- C2: 17 cases (FRR = 11.33%)

In both C1 and C2, 17 of the 19 false rejections were triggered inside PHP by Tier-1 deterministic patterns before the cross-encoders were ever invoked.

However, the real pathology was **False Abstention (`SUPPORTED -> NOT_ESTABLISHED`)**:
- C0: 0 cases
- C1: **75 cases**
- C2: **83 cases**

Over half of all valid curriculum-supported claims were discarded as unverified (`NOT_ESTABLISHED`) by both cross-encoders.

---

## Probability Analysis

From 764 raw probability calibrations recorded across all inferences:
- **C1 Probabilities:** Mean $P(\text{CONTRADICTION}) = 0.2332$, Mean $P(\text{ENTAILMENT}) = 0.2784$, Mean $P(\text{NEUTRAL}) = 0.4884$.
- **C2 Probabilities:** Mean $P(\text{CONTRADICTION}) = 0.1184$, Mean $P(\text{ENTAILMENT}) = 0.2410$, Mean $P(\text{NEUTRAL}) = 0.6405$.
- In C2, **69.90% (267/382)** of all inferences had `NEUTRAL` as the top-1 argmax class.
- The separation between correct predictions (mean confidence ~0.89–0.91) and incorrect predictions (mean confidence ~0.36) indicates that the cross-encoders exhibited high certainty when predicting entailment, but defaulted to neutral on queries with procedural or interrogative phrasing.

---

## Resource Analysis

| Metric | C0 Control (`llama3.2`) | C1 (`nli-MiniLM2`) | C2 (`DeBERTa-v3`) |
| :--- | :---: | :---: | :---: |
| **Model Size on Disk** | 1,925.5 MB (GGUF) | 313.3 MB (Safetensors) | 362.4 MB (Safetensors) |
| **Load Time** | 0.8 s | 1.2 s | 2.8 s |
| **Peak RAM** | 2,400 MB | 550 MB | 850 MB |
| **Mean Latency (Tier-2)** | 2,266.9 ms | **26.7 ms** | 846.5 ms |
| **P50 Latency (Tier-2)** | 1,790.7 ms | **26.4 ms** | 815.2 ms |
| **P95 Latency (Tier-2)** | 3,587.5 ms | **37.3 ms** | 1,113.2 ms |
| **Throughput** | 0.44 QPS | **37.51 QPS** (85x faster) | 1.18 QPS (2.7x faster) |

C1 demonstrated extreme computational efficiency (26.7 ms latency, 37.5 QPS, 550 MB RAM), but this efficiency cannot compensate for catastrophic verifier inaccuracy.

---

## Reproducibility

50 fixed development cases evaluated across repeated runs confirmed **100.00% deterministic label and probability stability** for both C1 and C2 in PyTorch inference mode.

---

## Statistical Analysis

- **C1 vs C0:** $\Delta = -22.00\text{ pp}$ ($n_{01} = 90, n_{10} = 2$), McNemar $p = 4.82 \times 10^{-24}$ (Statistically inferior to control).
- **C2 vs C0:** $\Delta = -24.00\text{ pp}$ ($n_{01} = 98, n_{10} = 2$), McNemar $p = 4.04 \times 10^{-27}$ (Statistically inferior to control).
- **Recovered vs Regressed:** Across both models, only 2 cases were recovered (`DEV-SUP-031` and `DEV-UNK-010`), while 90–98 cases regressed.

---

## Candidate Advancement Decision

| Pre-Registered Gate | Requirement | C1 Status | C2 Status | Gate Verdict |
| :--- | :--- | :---: | :---: | :---: |
| **Gate A** | $\text{FAR} \le \text{FAR}_{\text{C0}}$ (False acceptance decreases) | 0.67% vs 6.00% | 1.33% vs 6.00% | **PASS** |
| **Gate B** | $\text{Drop} \le 3.00\text{ pp}$ (Supported recall preserved $\ge 84.33\%$) | 38.67% (-48.66 pp) | 33.33% (-54.00 pp) | **FAIL (Catastrophic)** |
| **Gate C** | $\text{OOD Recall} \ge 95.00\%$ (OOD safety preserved) | 97.00% | 99.00% | **PASS** |
| **Gate D** | $\Delta \ge -1.50\text{ pp}$ or McNemar $p > 0.05$ (Non-inferiority) | -22.00 pp ($p < 10^{-23}$) | -24.00 pp ($p < 10^{-26}$) | **FAIL** |
| **Gate E** | Performance survives on S2 and S4 | S2: -24.14 pp, S4: -36.00 pp | S2: -26.02 pp, S4: -50.00 pp | **FAIL** |
| **Gate F** | Peak RAM $\le 8\text{ GB}$, latency viable | 550 MB RAM, 26 ms | 850 MB RAM, 846 ms | **PASS** |

**ADVANCEMENT DECISION:** **REJECTED.** Neither candidate cleared the pre-registered advancement gates.

---

## Blind Validation

**NOT RUN.**  
In accordance with pre-registered protocol Section 6 and Section 19, because neither C1 nor C2 satisfied Gate B, Gate D, or Gate E, blind validation was halted. `EXP-0033-BLIND-DATASET.json` ($N=500$) remains strictly sealed.

---

## Scientific Interpretation

EXP-0068 establishes a definitive scientific negative result regarding the application of standard sequence-classification NLI models to domain-specific RAG verification:

1. **The Pragmatic Gap:** Off-the-shelf NLI models fine-tuned on benchmark sentence pairs (MNLI/SNLI/FEVER) are optimized for declarative proposition pairs. Real-world user queries in educational and technical RAG systems are interrogative, procedural, or mechanistic clauses. Because standard cross-encoders lack instruction-following capabilities, they cannot bridge this pragmatic formulation difference and systematically classify valid curriculum-supported claims as `NEUTRAL`.
2. **The Conservatism Trap:** Training against adversarial NLI datasets (ANLI, FEVER) induces an overwhelming prior toward `NEUTRAL` whenever lexical overlap is incomplete or syntax is non-declarative. This effectively eliminates false acceptance of false premises, but at the unacceptable cost of destroying recall on legitimate user queries (supported recall collapsed to 33–38%).
3. **Generative LLM vs Cross-Encoder Tradeoff:** An instruction-tuned generative LLM (`llama3.2:latest`) achieves 92.00% dev accuracy because its instruction-following architecture allows it to evaluate whether a query's asserted predicate is supported by curriculum evidence despite pragmatic variations in syntax. Its primary vulnerability is presupposition sycophancy (false acceptance), which cannot be solved by swapping it for an off-the-shelf cross-encoder without domain-specific adaptation or calibration.

---

## Limitations

1. **Zero-Shot Evaluation:** Cross-encoders were evaluated purely off-the-shelf without domain-specific fine-tuning on technical educational claim pairs.
2. **Native Argmax Decision Rule:** EXP-0068 strictly utilized native three-class argmax without threshold calibration, as pre-registered.
3. **Curriculum Domain:** Evaluated exclusively on web development and programming pedagogy curriculum contexts.
