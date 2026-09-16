# EXP-0034: Blind Evaluation Dataset Validation Report

**Dataset File:** `EXP-0033-BLIND-DATASET.json`  
**Sample Size ($N$):** 500  
**SHA-256 Hash:** `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`  
**Status:** 100% UNALTERED & FROZEN  
**Audit Verification Date:** 2026-09-16  

---

## 1. Executive Summary

In accordance with strict experimental integrity rules:
- **No dataset regeneration or modification:** EXP-0034 evaluates models against the exact, frozen blind benchmark established in EXP-0033 (`EXP-0033-BLIND-DATASET.json`).
- **Zero Label Leakage:** The blind labels were never accessed or utilized to tune normalization parameters, select the fusion weight $\alpha$, or choose candidate pool sizes. All selections were frozen in `EXP-0034-CONFIG-FROZEN.json` prior to initiating the blind evaluation.
- **Hash Integrity Confirmed:** The SHA-256 checksum of `EXP-0033-BLIND-DATASET.json` on disk matches the authoritative manifest entry `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` byte-for-byte.

---

## 2. Dataset Composition Breakdown

| Category | Count | Expected Label | Description |
| :--- | :---: | :--- | :--- |
| **SUPPORTED** | 125 | `SUPPORTED` | Core in-curriculum technical assertions (HTML/CSS, JS, React, Node, DB, REST) |
| **FALSE_PREMISE** | 125 | `REFUTED` | Factual misconceptions, incorrect default values, inverted semantics |
| **AMBIGUOUS** | 75 | `NOT_ESTABLISHED` | Context-dependent and underspecified web engineering queries |
| **OOD** | 50 | `NOT_ESTABLISHED` | 25 Known-OOD (regex matched) + 25 Novel-OOD (unseen external technologies) |
| **PARAPHRASE** | 50 | `SUPPORTED` | Multi-clause and colloquial reformulations of curriculum facts |
| **ADVERSARIAL** | 75 | 38 SUP / 37 REF | Challenging boundary cases designed to test verifier robustness |
| **TOTAL** | **500** | **213 SUP / 162 REF / 125 NE** | - |

---

## 3. Ground-Truth Target Label Breakdown

| Label | Count | Percentage |
| :--- | :---: | :---: |
| `SUPPORTED` | 213 | 42.60% |
| `REFUTED` | 162 | 32.40% |
| `NOT_ESTABLISHED` | 125 | 25.00% |
| **TOTAL** | **500** | **100.00%** |

---

## 4. Integrity Checklist

- [x] Dataset file exists at repository root.
- [x] SHA-256 hash verified: `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`.
- [x] Zero case deletions, additions, or modifications.
- [x] Zero historical overlap against development splits.
- [x] Benchmark configuration frozen prior to blind evaluation start.
