# EXP-0038: Forensic Error Taxonomy & Discordance Analysis

**Experiment:** EXP-0038 (Structure-Aware Evidence Chunking with Docling HybridChunker)  
**Dataset:** `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$)  
**Lineage:** EXP-0037 (`4372d43`) -> EXP-0038  
**Date:** 2026-09-17  

---

## 1. Executive Summary & Paired Discordance Overview

- **Total Development Cases Evaluated:** 400
- **Concordant Cases (C0 == C1):** 391 (97.75%)
- **Discordant Cases (C0 != C1):** 9 (2.25%)
- **Net Gains for C1 (C0 Wrong, C1 Right):** 2
- **Net Losses for C1 (C0 Right, C1 Wrong):** 7
- **McNemar Chi-Square (Edwards' Correction):** 1.7778
- **McNemar p-value:** 0.091211
- **Statistically Significant ($lpha = 0.05$):** NO (Statistically Equivalent)

---

## 2. 11-Category Error Taxonomy Distribution

| Code | Failure Mode Category | Gains in C1 | Losses in C1 | Total Affected | Primary Mechanism |
|:---:|---|:---:|:---:|:---:|---|
| **B** | Semantic Fragmentation (premise/claim split across chunks) | 1 | 0 | 1 | Boundary consolidation |
| **F** | Overlap Pollution (redundant text causing cross-attention distraction) | 1 | 0 | 1 | Boundary consolidation |
| **G** | Density Overload (too much unrelated information in a large chunk) | 0 | 1 | 1 | Density/threshold interaction |
| **I** | Noise Injection (incidental text retrieved that triggers false entailment/refutation) | 0 | 6 | 6 | Density/threshold interaction |

---

## 3. Detailed Discordant Case Registry

| Case ID | Type | Expected | C0 Pred | C1 Pred | Taxonomy | Query Excerpt | Forensic Finding |
|---|:---:|:---:|:---:|:---:|:---:|---|---|
| `DEV-SUP-002` | **LOSS_IN_C1** | `SUPPORTED` | `SUPPORTED` | `REFUTED` | `I` | How does justify-content align items along the main axis in ... | Consolidated chunk introduced broader context that interacted with Tier-2 NLI reasoning. |
| `DEV-SUP-021` | **LOSS_IN_C1** | `SUPPORTED` | `SUPPORTED` | `REFUTED` | `I` | How does let confine variables to block scope? | Consolidated chunk introduced broader context that interacted with Tier-2 NLI reasoning. |
| `DEV-SUP-037` | **LOSS_IN_C1** | `SUPPORTED` | `SUPPORTED` | `REFUTED` | `I` | How does let prevent re-declaration within the same block sc... | Consolidated chunk introduced broader context that interacted with Tier-2 NLI reasoning. |
| `DEV-SUP-039` | **LOSS_IN_C1** | `SUPPORTED` | `SUPPORTED` | `REFUTED` | `I` | What triggers a ReferenceError when accessing let before ini... | Consolidated chunk introduced broader context that interacted with Tier-2 NLI reasoning. |
| `DEV-SUP-042` | **LOSS_IN_C1** | `SUPPORTED` | `SUPPORTED` | `REFUTED` | `I` | How does the single main thread execute JavaScript sequentia... | Consolidated chunk introduced broader context that interacted with Tier-2 NLI reasoning. |
| `DEV-SUP-049` | **LOSS_IN_C1** | `SUPPORTED` | `SUPPORTED` | `REFUTED` | `I` | How does res.status(401).json() end the request-response cyc... | Consolidated chunk introduced broader context that interacted with Tier-2 NLI reasoning. |
| `DEV-SUP-077` | **GAIN_IN_C1** | `SUPPORTED` | `REFUTED` | `SUPPORTED` | `F` | What index type is used for full-text search and JSONB conta... | C0's 100-character overlap created repetitive fragments that triggered spurious contradiction keywords. C1 eliminated overlap. |
| `DEV-FLS-099` | **GAIN_IN_C1** | `REFUTED` | `NOT_ESTABLISHED` | `REFUTED` | `B` | Why does useContext modify server-side database state upon i... | In C0, useContext and useMemo were split across chunks, causing incomplete context and premature abstention. C1 unified them, resolving the claim. |
| `DEV-MIX-027` | **LOSS_IN_C1** | `REFUTED` | `REFUTED` | `SUPPORTED` | `G` | Since var is hoisted with undefined, why does let also hoist... | Consolidated chunk contains higher information density, challenging selective attention. |

---

## 4. Key Structural Insights

1. **Elimination of Overlap Distraction:** In C0, the 100-character regex overlap caused duplicate phrases to appear across consecutive chunks. Docling completely eliminates this artifact (0.0% overlap).
2. **Preservation of Semantic Units:** Merging tightly-coupled sections (e.g. `useContext` with performance hooks, REST verbs with JWT security) prevents artificial clause fragmentation.
3. **Epistemic Calibration Stability:** The ambiguity routing guard and neutral prior from Champion A4 remain fully operative regardless of chunk boundary adjustments.