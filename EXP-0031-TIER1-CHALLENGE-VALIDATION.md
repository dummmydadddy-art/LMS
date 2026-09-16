# EXP-0031: Targeted Tier-1 Challenge Dataset Validation Report

**Dataset File:** `EXP-0031-TIER1-CHALLENGE-DATASET.json`  
**SHA-256:** `88844632ee4420fb706dd89e91f9d17af9536ad9a9cdb57018e1831cb37acff9`  
**Total Cases:** 150  
**Unique Queries:** 150  
**Date:** 2026-09-16  

---

## 1. Challenge Subcategory Distribution

| Subcategory | Target Requirement | Actual Cases | SUPPORTED | REFUTED |
|---|:---:|:---:|:---:|:---:|
| **NEGATION_SCOPE** | 30 | 30 | 18 | 12 |
| **COMPOUND_CLAUSES** | 30 | 30 | 18 | 12 |
| **DISJUNCTIONS** | 25 | 25 | 15 | 10 |
| **CONDITIONALS** | 20 | 20 | 12 | 8 |
| **PREDICATE_MISMATCH** | 15 | 15 | 10 | 5 |
| **ENTITY_MISMATCH** | 15 | 15 | 10 | 5 |
| **LEXICAL_COLLISION** | 15 | 15 | 10 | 5 |
| **TOTAL** | **150** | **150** | **93** | **57** |

---

## 2. Structural & Diagnostic Validation

1. **Exact Subcategory Distribution:** 30 Negation Scope, 30 Compound Clauses, 25 Disjunctions, 20 Conditionals, 15 Predicate Mismatch, 15 Entity Mismatch, 15 Lexical Collision. Exactly 150 cases.
2. **Target Balance:** 98 SUPPORTED and 52 REFUTED cases. Both classes are represented across every subcategory to verify that improvements in precision do not compromise true refutation detection.
3. **Domain Grounding:** All 150 cases evaluate standard web development curriculum concepts (HTML/CSS, ES6+, React, Node.js, REST, PostgreSQL) present in `database/rag_materials.sqlite3`.
