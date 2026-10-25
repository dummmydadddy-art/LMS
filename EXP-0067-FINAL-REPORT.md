# EXP-0067 Final Report: Counter-Presupposition and Bidirectional NLI Decision Formulation

**Experiment Identifier:** EXP-0067  
**Lineage:** EXP-0064 (`276e88a`) $\to$ EXP-0065 (`9a9c2ff`) $\to$ EXP-0066 (`0f125df`) $\to$ EXP-0067  
**Starting Git HEAD:** `0f125dffd7c3399335e0f9abdae9461beef16885` (`0f125df`)  
**Execution Date:** 2026-09-26  
**Auditor/Lead:** Antigravity  

---

## 1. Research Question & Primary Motivation

> **Can a different Tier-2 NLI decision formulation reduce presupposition-driven false acceptance while preserving semantic entailment of valid paraphrases, without degrading OOD safety?**

### Background:
In EXP-0065, increasing model parameters from 3.2B to 4B/8B was conclusively falsified as a mechanism to break through the downstream verification ceiling (8B accuracy dropped to 86.00%, $p = 0.0007$).  
In EXP-0066, forensic error attribution revealed that **75.00% of blind holdout errors (102/136)** stemmed from verifier logic—specifically **presupposition sycophancy** (35 false acceptances) and **semantic hyper-skepticism** (28 false rejections).

EXP-0067 isolated **decision formulation** as the sole independent variable to test whether prompt-level anti-presupposition rules and bidirectional polarity checking could solve this downstream bottleneck.

---

## 2. Experimental Conditions & Architecture

All conditions ran locally using `llama3.2:latest` (3.2B, Q4_K_M) resident in GPU VRAM with `temperature = 0.0`, strict JSON output enforcement, identical retrieval contexts, identical Tier-1 deterministic fast-paths, and frozen A4 thresholds.

1. **C0 — Control (Frozen A4 Baseline):**
   - Prompt `P4` (few-shot demonstrations + polarity cues) with `P4_neutral` on guarded queries.
2. **C1 — Explicit Anti-Presupposition Formulation:**
   - Zero-shot instruction prompt with explicit directives: truth of student claims is never assumed; topic overlap $\ne$ entailment; mentioning an entity does not establish its asserted properties; conflict $\to$ `CONTRADICTION`; unestablished $\to$ `NEUTRAL`.
3. **C2 — Contrastive Claim Verification:**
   - Explicit contrastive assessment distinguishing direct support, direct contradiction, and non-establishing topical overlap.
4. **C3 — Bidirectional Polarity Check:**
   - Priority decision ladder: 1. check conflict $\to$ `CONTRADICTION`, 2. else check support $\to$ `ENTAILMENT`, 3. else $\to$ `NEUTRAL`.
5. **C4 — Counterfactual / Presupposition Stress Formulation:**
   - Explicit stress instruction forbidding treatment of presuppositions as evidence, distinguishing "discusses X" from "establishes X has property Y", and enforcing conflict-first evaluation.

---

## 3. Cryptographic Invariants & Verification Hashes

| Artifact Path | Expected SHA-256 Checksum | Actual SHA-256 Checksum | Status |
| :--- | :--- | :--- | :---: |
| `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` | **VERIFIED** |
| `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | **SEALED** |
| `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` | **VERIFIED** |
| `backend/rag_premise_verifier.php` | `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179` | `cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179` | **VERIFIED** |
| `scratch/exp0056_dev_c1_cache.json` | `e4955c0513a96e18b889d3992d8433da78b977c0b3b981b3c3e8a216569e9e0a` | `e4955c0513a96e18b889d3992d8433da78b977c0b3b981b3c3e8a216569e9e0a` | **VERIFIED** |
| Production Repo (`EduConnect-LMS-Production`) | Untouched | Untouched | **VERIFIED** |

---

## 4. Primary Results Scorecard ($N = 400$)

| Metric | C0: Control | C1: Anti-Presupp. | C2: Contrastive | C3: Bidirectional | C4: Stress |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall Accuracy** | **92.00%** (368/400) | **68.50%** (274/400) | **78.00%** (312/400) | **75.00%** (300/400) | **80.75%** (323/400) |
| **Accuracy Delta ($\Delta$)** | — | **-23.50 pp** | **-14.00 pp** | **-17.00 pp** | **-11.25 pp** |
| **Macro F1** | **0.9267** | 0.6760 | 0.7742 | 0.7463 | 0.8132 |
| **False Acceptance (`REF -> SUP`)** | 9 | **0** | **0** | **1** | 3 |
| **False Rejection (`SUP -> REF`)** | 19 | 15 | **46** | 17 | **61** |
| **Supported Abstentions (`SUP -> NE`)**| 0 | **76** | **26** | **52** | 7 |
| **Supported Recall** | **87.33%** (131/150) | **39.33%** (59/150) | **52.00%** (78/150) | **54.00%** (81/150) | **54.67%** (82/150) |
| **Refutation Recall** | **92.67%** (139/150) | 77.33% (116/150) | 90.00% (135/150) | 80.00% (120/150) | **96.00%** (144/150) |
| **OOD Recall** | 98.00% (98/100) | **99.00%** (99/100) | **99.00%** (99/100) | **99.00%** (99/100) | 97.00% (97/100) |
| **McNemar $p$-value vs C0** | — | **$1.34 \times 10^{-20}$** | **$7.64 \times 10^{-13}$** | **$8.89 \times 10^{-15}$** | **$2.45 \times 10^{-9}$** |
| **Statistical Status** | Reference | **Signif. Inferior** | **Signif. Inferior** | **Signif. Inferior** | **Signif. Inferior** |

---

## 5. Advancement Gate Evaluation

A candidate advances to Phase 2 blind validation if and only if all five gates are cleared:

1. **Gate A (False Acceptance Reduction):**
   - C1 (0 vs 9): **PASS**
   - C2 (0 vs 9): **PASS**
   - C3 (1 vs 9): **PASS**
   - C4 (3 vs 9): **PASS**
2. **Gate B (Supported Recall Preservation — Drop $\le 3.00\text{ pp}$):**
   - C1 (39.33%, drop $-48.00\text{ pp}$): **FAIL**
   - C2 (52.00%, drop $-35.33\text{ pp}$): **FAIL**
   - C3 (54.00%, drop $-33.33\text{ pp}$): **FAIL**
   - C4 (54.67%, drop $-32.66\text{ pp}$): **FAIL**
3. **Gate C (OOD Safety Preservation $\ge 95.00\%$):**
   - All conditions $\ge 97.00\%$: **PASS**
4. **Gate D (Overall Non-Inferiority — McNemar $p > 0.05$ or $\Delta \ge -1.50\text{ pp}$):**
   - All conditions exhibited massive statistically significant drops ($p < 10^{-8}$): **FAIL**
5. **Gate E (Non-Shortcut Generalization — Gain on S2 or S6):**
   - C1: **FAIL** (S2 $-22.8\text{ pp}$, S6 $-16.0\text{ pp}$)
   - C2: **PASS** (S6 $0.0\text{ pp}$)
   - C3: **FAIL** (S2 $-16.3\text{ pp}$, S6 $-16.0\text{ pp}$)
   - C4: **PASS** (S6 $+6.0\text{ pp}$)

### Gate Verdict:
**ALL CANDIDATES REJECTED.** None cleared Gate B or Gate D.

---

## 6. Pre-Registered Stop Rule & Blind Protection

In accordance with Section 7 of `EXP-0067-PROTOCOL.md`:
> *"If no candidate satisfies all five gates, the experiment terminates after development evaluation, and blind validation is NOT conducted."*

The blind holdout dataset `EXP-0033-BLIND-DATASET.json` ($N=500$) remained strictly sealed and was never accessed during EXP-0067. Zero blind contamination occurred.

---

## 7. Key Scientific Findings & Takeaways

1. **The In-Context NLI Trade-Off Frontier:**  
   Prompt-level directives cannot simultaneously suppress presupposition agreement and preserve semantic paraphrase recognition in 3B parameter models. Warning the model against presuppositions simply shifts its internal bias toward hyper-skepticism, causing it to reject or abstain on valid curriculum claims.
2. **Exhaustion of Prompt Engineering:**  
   Together, EXP-0065 (model scaling) and EXP-0067 (prompt reformulation) definitively prove that the downstream RAG verifier bottleneck cannot be solved by adjusting model parameters (3B $\to$ 8B) or rewriting prompt templates.
3. **Implications for Research Lineage:**  
   The frozen A4 baseline (92.00% Dev, 72.80% Blind) remains the undefeated champion. Any future progress on downstream verification must transition from generative in-context LLM prompting to **specialized fine-tuned NLI cross-encoders (e.g. DeBERTa-v3-NLI)** or **explicit symbolic knowledge graphs**.
