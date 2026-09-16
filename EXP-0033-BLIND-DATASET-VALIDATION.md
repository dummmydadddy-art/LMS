# EXP-0033: Blind Evaluation Dataset Validation Report

**Dataset File:** `EXP-0033-BLIND-DATASET.json`  
**Sample Size (N):** 500  
**SHA-256:** `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08`  
**Created:** 2026-09-16  
**Status:** VERIFIED & FROZEN  

---

## 1. Executive Summary

`EXP-0033-BLIND-DATASET.json` contains exactly 500 unseen, high-rigor test cases designed to evaluate whether cross-encoder score calibration (Platt scaling, temperature scaling, min-max) and evidence-gate adaptation recover downstream verifier accuracy and eliminate false abstentions without compromising false acceptance rate or out-of-curriculum rejection.

The dataset strictly complies with all experimental design constraints:
- Exactly 500 cases with 100% unique IDs and 100% unique queries.
- **Zero historical collision:** 0 collisions against all 3,600 prior queries across historical blind and development datasets.
- **Balanced ground-truth target labels:** 213 SUPPORTED (42.60%), 162 REFUTED (32.40%), 125 NOT_ESTABLISHED (25.00%).
- **Balanced curriculum module coverage:** HTML/CSS, JavaScript, React, Node.js, REST APIs, PostgreSQL Databases, and External Technologies.

---

## 2. Category Distribution

| Category | Count | Expected Target Label | Subcategories & Composition |
| :--- | :--- | :--- | :--- |
| **SUPPORTED** | 125 | SUPPORTED | In-curriculum core technical assertions across all 6 curriculum modules |
| **FALSE_PREMISE** | 125 | REFUTED | In-curriculum false premises, reversed behaviors, and invalid default values |
| **AMBIGUOUS** | 75 | NOT_ESTABLISHED | Underspecified, subjective, context-dependent engineering queries |
| **OOD** | 50 | NOT_ESTABLISHED | 25 KNOWN_OOD (Stage 1 regex match) + 25 NOVEL_OOD (Kafka, Elixir, K8s, Swift, etc.) |
| **PARAPHRASE** | 50 | SUPPORTED | Indirect, colloquial, multi-clause paraphrases of curriculum facts |
| **ADVERSARIAL** | 75 | 38 SUP / 37 REF | 38 SUPPORTED_ADVERSARIAL, 37 REFUTED_ADVERSARIAL |
| **TOTAL** | **500** | **213 SUP / 162 REF / 125 NE** | - |

---

## 3. Target Label Breakdown

| Target Label | Count | Percentage | Constituent Categories |
| :--- | :--- | :--- | :--- |
| `SUPPORTED` | 213 | 42.60% | 125 SUPPORTED + 50 PARAPHRASE + 38 ADVERSARIAL |
| `REFUTED` | 162 | 32.40% | 125 FALSE_PREMISE + 37 ADVERSARIAL |
| `NOT_ESTABLISHED` | 125 | 25.00% | 75 AMBIGUOUS + 50 OOD (25 Known + 25 Novel) |
| **TOTAL** | **500** | **100.00%** | - |

---

## 4. Module Distribution

| Module | Count | Percentage | Focus Areas |
| :--- | :--- | :--- | :--- |
| `HTML_CSS` | 74 | 14.80% | Flexbox, Grid, Box-sizing, Specificity, Semantic tags, Positioning |
| `JAVASCRIPT` | 79 | 15.80% | Event loop, Closures, Promises, Scoping, Prototypes, Strict equality |
| `REACT` | 77 | 15.40% | Hooks (state, effect, ref, memo, callback), Re-renders, Reconciliation |
| `NODEJS` | 73 | 14.60% | Event loop phases, Middleware pipeline, Streams, Cluster, Buffers |
| `REST_API` | 76 | 15.20% | HTTP verbs, Idempotency, Status codes, JWT auth, Headers |
| `DATABASE` | 71 | 14.20% | ACID transactions, Indexes, Normalization, Joins, MVCC |
| `BACKEND_EXTERNAL` | 31 | 6.20% | Django, Spring Boot, Rust, Go, Kafka, K8s, Elixir |
| `FRONTEND_EXTERNAL` | 11 | 2.20% | Flutter, Dart, SwiftUI, Svelte, WebAssembly |
| `DATABASE_EXTERNAL` | 8 | 1.60% | Redis, Cassandra, Neo4j, DynamoDB, Elasticsearch |
| **TOTAL** | **500** | **100.00%** | - |

---

## 5. Verification & Integrity Checklist

- [x] Total sample count is exactly 500.
- [x] All 500 identifiers are unique.
- [x] All 500 queries are unique.
- [x] Query texts verified for zero overlap against prior blind and development benchmarks.
- [x] Ground-truth labels validated against curriculum source materials.
- [x] SHA-256 computed and frozen prior to evaluation.
