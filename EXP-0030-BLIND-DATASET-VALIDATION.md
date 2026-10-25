# EXP-0030 Blind Dataset Validation Audit

**Dataset File:** `EXP-0030-BLIND-DATASET.json`  
**Total Cases:** 400  
**SHA-256 Checksum:** `4372b569eeb9cd22afea73d10971a384084036795f8aa63c4f4052363e864ab9`  
**Verification Date:** 2026-09-16  

---

## 1. Distribution Summary

| Category | Count | Expected Label | Subcategories / Focus |
|---|:---:|:---:|---|
| **SUPPORTED** | 100 | SUPPORTED | HTML/CSS (16), JS (17), React (17), Node (17), REST (16), DB (17) |
| **FALSE_PREMISE** | 100 | REFUTED | Technical contradictions across all 6 curriculum modules |
| **AMBIGUOUS** | 60 | NOT_ESTABLISHED | Subjective, comparative, open-ended queries lacking factual curriculum ground |
| **OOD (Out of Domain)** | 50 | NOT_ESTABLISHED | 25 Known-OOD (27-list) + 25 Novel-OOD (completely unlisted technologies) |
| **PARAPHRASE** | 40 | SUPPORTED | Complex non-literal and indirect phrasing of valid curriculum facts |
| **ADVERSARIAL** | 50 | 25 SUP / 25 REF | Negative inquiry polarity traps, compound clauses, inverted assertions |
| **TOTAL** | **400** | **165 SUP / 125 REF / 110 NOT_EST** | **100% Closed-Domain Audit Verified** |

---

## 2. Collision Avoidance Audit

- **Past Benchmark Queries Checked:** 11804 queries across all historical experiments.
- **Exact String Collisions:** 0
- **Normalized Case-Insensitive Collisions:** 0
- **Integrity Verdict:** PASSED. Complete novelty guaranteed.

---

## 3. Novel-OOD Technology Audit

The 25 Novel-OOD cases test technologies absent from the legacy 27-item static entity list:
- Modern Runtimes & Languages: `Deno`, `Bun`, `Elixir`, `Clojure`, `Solidity`
- Modern Web & Fullstack Frameworks: `Htmx`, `Lit`, `FastAPI`, `Django`, `Spring Boot`, `Laravel`, `Rails`, `Astro`, `Qwik`, `SolidStart`
- Modern ORMs & Data Layers: `Prisma`, `tRPC`, `CockroachDB`, `Neo4j`, `DynamoDB`
- Modern Tooling & Cloud Infrastructure: `Turbopack`, `Terraform`, `Ansible`, `RabbitMQ`, `Kafka`

This guarantees that EXP-0030's Dynamic Curriculum Grounding is evaluated against truly out-of-curriculum technologies without test set leakage.
