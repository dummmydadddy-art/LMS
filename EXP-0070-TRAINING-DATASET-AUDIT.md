# EXP-0070 Training Dataset Audit

**Dataset File:** `EXP-0070-TRAINING-DATASET.json`  
**Cross-Validation Splits:** `EXP-0070-CV-SPLITS.json`  
**Date:** 2026-09-26  
**Auditor:** Antigravity Autonomous Agent  
**Lineage:** EXP-0069 -> EXP-0070  

---

## 1. Executive Summary

This audit establishes the data provenance, filtering rules, label integrity, and partition isolation for the domain-specific NLI fine-tuning experiment (EXP-0070). The training dataset is derived exclusively from the 400 cases in `EXP-0025-DEVELOPMENT-DATASET.json` under strict 5-fold stratified case-level partitioning. 

To eliminate label noise caused by partial truth values and epistemic uncertainty, all compound multi-clause queries and ambiguous/subjective queries are strictly excluded from direct training supervision. They remain in the held-out validation partitions to test inductive generalization.

All three NLI target classes comfortably exceed the pre-registered minimum threshold of **75 clean training examples** across the available development pool.

---

## 2. Dataset Construction & Filtering

| Metric | Count | Percentage | Note |
|---|---|---|---|
| **Total Source Development Cases** | 400 | 100.0% | `EXP-0025-DEVELOPMENT-DATASET.json` |
| **Excluded Compound Multi-Clause Cases** | 50 | 12.5% | `MIXED_COMPOUND_PREMISE` (multi-clause, partial refutations) |
| **Excluded Ambiguous Cases** | 4 | 1.0% | Stage-2 Ambiguity Guard triggered (`DEV-SUP-083`, `DEV-SUP-087`, `DEV-NOVEL-038`, `DEV-NOVEL-048`) |
| **Total Training-Eligible Clean Pairs** | **346** | **86.5%** | Approved for cross-encoder supervised fine-tuning |
| **Total Evaluation Cases** | **400** | **100.0%** | Full pipeline evaluation on all 400 held-out cases |

---

## 3. Class Distribution (Clean Eligible Training Pairs)

| Canonical NLI Class | Source Case Label | Count | % of Eligible | Pre-Registered Minimum ($\ge 75$) | Audit Status |
|---|---|---|---|---|---|
| **`ENTAILMENT`** | `SUPPORTED` | 148 | 42.77% | 75 | **PASSED** (+73 margin) |
| **`CONTRADICTION`** | `REFUTED` | 98 | 28.32% | 75 | **PASSED** (+23 margin) |
| **`NEUTRAL`** | `NOT_ESTABLISHED` / `OOD` | 100 | 28.90% | 75 | **PASSED** (+25 margin) |
| **TOTAL** | — | **346** | **100.0%** | — | **DATA SUFFICIENCY CONFIRMED** |

> **Audit Decision:** The condition *"If one class has fewer than 75 clean training examples across the available development pool, STOP before fine-tuning and report the data insufficiency"* was evaluated. All three classes possess $\ge 98$ examples. Training proceeds without label synthesis or external mixing.

---

## 4. 5-Fold Stratified Cross-Validation Partitioning

Partitions are fixed via `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` on case IDs:

| Fold ID | Total In-Fold Cases | Eligible Train Pairs | Train Class Dist (E / C / N) | Held-Out Test Cases | Eligible Test Pairs | Test Class Dist (E / C / N) |
|---|---|---|---|---|---|---|
| **Fold 1** | 320 | 274 | 118 / 76 / 80 | 80 | 72 | 30 / 22 / 20 |
| **Fold 2** | 320 | 277 | 119 / 78 / 80 | 80 | 69 | 29 / 20 / 20 |
| **Fold 3** | 320 | 278 | 118 / 80 / 80 | 80 | 68 | 30 / 18 / 20 |
| **Fold 4** | 320 | 276 | 119 / 77 / 80 | 80 | 70 | 29 / 21 / 20 |
| **Fold 5** | 320 | 279 | 118 / 81 / 80 | 80 | 67 | 30 / 17 / 20 |

---

## 5. Duplicate and Near-Duplicate Analysis

* **Exact Duplicate (Premise, Hypothesis) Pairs:** **0** (0.0%). All 346 eligible pairs possess unique premise-hypothesis pairings.
* **Hypothesis Collisions:** 0 across distinct source queries.
* **Premise Sharing:** Certain curriculum passages serve as premises for multiple distinct queries (e.g. Flexbox layout rules). These pairs test diverse syntactic assertions against the same ground truth facts and do not constitute duplicates.
* **Near-Duplicate Check:** Jaccard token similarity $> 0.85$ across distinct case hypotheses was checked; all flagged pairs represent distinct student queries targeting related aspects of the same topic.

---

## 6. Train / Validation Leakage Verification

* **Case ID Leakage:** Case-level set intersection $\text{Train}_{\text{cases}} \cap \text{Test}_{\text{cases}} = \emptyset$ verified across all 5 folds.
* **Evidence Leakage:** Evidence chunks are frozen in `scratch/exp0056_dev_c1_cache.json`.
* **Zero Feature Leakage:** Validation cases do not inform model weights, learning rates, epochs, or stopping criteria.

---

## 7. Audit Certification

The dataset `EXP-0070-TRAINING-DATASET.json` and split manifest `EXP-0070-CV-SPLITS.json` meet all pre-registered scientific criteria for domain-specific cross-encoder fine-tuning.
