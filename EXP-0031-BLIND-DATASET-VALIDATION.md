# EXP-0031: Blind Evaluation Dataset Validation Report

**Dataset File:** `EXP-0031-BLIND-DATASET.json`  
**Sample Size (N):** 500  
**SHA-256:** `712f9daea02d0f355ed11413ce0d98226937f59279508340d4ea13ec0e80039d`  
**Created:** 2026-09-16  
**Status:** VERIFIED & FROZEN  

---

## 1. Executive Summary

`EXP-0031-BLIND-DATASET.json` contains exactly 500 unseen test cases designed to evaluate whether Tier-1 semantic/syntactic decoupling eliminates false refutations without regressing refutation recall, out-of-curriculum detection, or ambiguity protection.

The dataset strictly meets all design constraints:
- Exactly 500 cases with 100% unique IDs and 100% unique queries.
- Exactly 0 collisions against all 14,450 historical evaluation queries across EXP-0001 through EXP-0030.
- Exactly 0 collisions against the EXP-0031 Tier-1 Challenge Dataset ($N = 150$).
- Balanced ground-truth target labels: 213 SUPPORTED (42.60%), 162 REFUTED (32.40%), 125 NOT_ESTABLISHED (25.00%).

---

## 2. Category Distribution

| Category | Count | Expected Target Label | Subcategories |
|----------|-------|-----------------------|---------------|
| SUPPORTED | 125 | SUPPORTED | In-curriculum core technical claims |
| FALSE_PREMISE | 125 | REFUTED | In-curriculum false premises / reversed relationships |
| AMBIGUOUS | 75 | NOT_ESTABLISHED | Underspecified, subjective, context-dependent queries |
| OOD | 50 | NOT_ESTABLISHED | 25 KNOWN_OOD (frameworks), 25 NOVEL_OOD (unseen tech) |
| PARAPHRASE | 50 | SUPPORTED | Indirect, colloquial, multi-clause paraphrases |
| ADVERSARIAL | 75 | 38 SUP / 37 REF | 38 SUPPORTED_ADVERSARIAL, 37 REFUTED_ADVERSARIAL |
| **TOTAL** | **500** | **213 SUP / 162 REF / 125 NE** | - |

---

## 3. Target Label Breakdown

| Target Label | Count | Percentage | Constituent Categories |
|--------------|-------|------------|------------------------|
| `SUPPORTED` | 213 | 42.60% | 125 SUPPORTED + 50 PARAPHRASE + 38 ADVERSARIAL |
| `REFUTED` | 162 | 32.40% | 125 FALSE_PREMISE + 37 ADVERSARIAL |
| `NOT_ESTABLISHED` | 125 | 25.00% | 75 AMBIGUOUS + 50 OOD (25 Known + 25 Novel) |
| **TOTAL** | **500** | **100.00%** | - |

---

## 4. Module Distribution

| Module | Count | Percentage |
|--------|-------|------------|
| `HTML_CSS` | 74 | 14.80% |
| `JAVASCRIPT` | 79 | 15.80% |
| `REACT` | 77 | 15.40% |
| `NODEJS` | 73 | 14.60% |
| `REST_API` | 76 | 15.20% |
| `DATABASE` | 71 | 14.20% |
| `BACKEND_EXTERNAL` | 11 | 2.20% |
| `DATABASE_EXTERNAL` | 7 | 1.40% |
| `FRONTEND_EXTERNAL` | 11 | 2.20% |
| `CSS_EXTERNAL` | 1 | 0.20% |
| `TOOLING_EXTERNAL` | 6 | 1.20% |
| `TESTING_EXTERNAL` | 1 | 0.20% |
| `ASYNC_EXTERNAL` | 1 | 0.20% |
| `LINTING_EXTERNAL` | 1 | 0.20% |
| `API_EXTERNAL` | 3 | 0.60% |
| `NETWORK_EXTERNAL` | 1 | 0.20% |
| `AUTH_EXTERNAL` | 1 | 0.20% |
| `ORM_EXTERNAL` | 1 | 0.20% |
| `BLOCKCHAIN_EXTERNAL` | 1 | 0.20% |
| `DEVOPS_EXTERNAL` | 2 | 0.40% |
| `QUEUE_EXTERNAL` | 1 | 0.20% |
| `STREAM_EXTERNAL` | 1 | 0.20% |
| **TOTAL** | **500** | **100.00%** |

---

## 5. Subcategory Breakdown

| Subcategory | Count | Parent Category | Target Label |
|-------------|-------|-----------------|--------------|
| `KNOWN_OOD` | 25 | OOD | NOT_ESTABLISHED |
| `NOVEL_OOD` | 25 | OOD | NOT_ESTABLISHED |
| `SUPPORTED_ADVERSARIAL` | 38 | ADVERSARIAL | SUPPORTED |
| `REFUTED_ADVERSARIAL` | 37 | ADVERSARIAL | REFUTED |

---

## 6. Collision Verification Audit

- Total historical evaluation datasets scanned: 12
- Total historical query instances scanned: 14,450
- Total exact collisions detected: **0**
- Total collisions with EXP-0031 Tier-1 Challenge Dataset ($N = 150$): **0**
- Uniqueness rate: **100.00%** (500 unique normalized queries out of 500 cases)
- ID format verification: 100% match format `EXP31-[A-Z]+-[0-9]{4}`

---

## 7. Integrity Attestation

This dataset is strictly frozen prior to running any EXP-0031 verifier evaluations. No verifier code has been tailored or hardcoded to these test cases.
