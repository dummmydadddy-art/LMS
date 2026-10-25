# EXP-0034: Precheck & Baseline Reconciliation Report
## Investigation of Novel-OOD Baseline Discrepancy

**Date:** 2026-09-16  
**Investigator:** Lead Experimental Engineer  
**Repository:** `EduConnect-LMS-Experimental`  
**Target:** Reconcile R0 Novel-OOD metric discrepancy between prior EXP-0033 logs (88%) and conversational audit summary (90/100 = 90%).

---

## 1. Issue Description

In the conversational handover from EXP-0033, two different figures appeared for Baseline R0 Novel-OOD accuracy:
1. **EXP-0033 Official Artifacts & Audit File:** `R0 Novel-OOD = 88.00% (22/25)`
2. **Conversational Assistant Handover Message:** `R0 Novel-OOD = 90.00% (90/100)`

This precheck provides a complete forensic investigation of the source code, dataset definitions, prediction records, and historical lineage to determine the authoritative value and establish whether any ambiguity threatens EXP-0034 evaluation.

---

## 2. Forensic Investigation of Data & Prediction Records

### A. Ground-Truth Blind Dataset Structure
Inspection of `EXP-0033-BLIND-DATASET.json` ($N = 500$, SHA-256: `3b4fd6c70258...`) reveals:
- Total Cases: $N = 500$
- Category `OOD`: Exactly 50 cases (`EXP33-OOD-0001` through `EXP33-OOD-0050`).
- Sub-composition of the 50 OOD cases:
  1. **Known-OOD ($N = 25$):** `EXP33-OOD-0001` to `EXP33-OOD-0025`. Queries containing external technologies explicitly covered by Stage 1 deterministic regex patterns (Django, Flutter, Ruby, Redis, Python, Rust, Golang, Spring Boot, Laravel, Dart, C#, ASP.NET, Sidekiq).
  2. **Novel-OOD ($N = 25$):** `EXP33-OOD-0026` to `EXP33-OOD-0050`. Queries containing external technologies NOT present in any historical blocklist or Stage 1 regex (Apache Kafka, Elixir, Kubernetes, SwiftUI, GraphQL, Apache Cassandra, Zig, Haskell, Apache Spark, WebAssembly, Neo4j, RabbitMQ, gRPC, Svelte, Clojure, Docker, Elasticsearch, React Native, Terraform, Nginx, OCaml, DynamoDB, Scala, Prometheus, Envoy).

**Finding:** The denominator for Novel-OOD on the frozen EXP-0033 blind benchmark is **exactly 25**. There is no subset of 100 cases designated as Novel-OOD anywhere in `EXP-0033-BLIND-DATASET.json`.

### B. Raw Prediction Verification
Evaluating the raw prediction file `scratch/exp0033_predictions.json` directly across all 25 Novel-OOD queries (`EXP33-OOD-0026` to `EXP33-OOD-0050`):
- **E0 (Baseline R0):**
  - Correct Predictions (`NOT_ESTABLISHED`): 22 cases.
  - Incorrect Predictions: 3 cases:
    * `EXP33-OOD-0043` (*React Native*): Predicted `SUPPORTED` (False Acceptance).
    * `EXP33-OOD-0045` (*Nginx*): Predicted `REFUTED` (False Contradiction).
    * `EXP33-OOD-0046` (*OCaml*): Predicted `SUPPORTED` (False Acceptance).
  - Accuracy: $\frac{22}{25} = 88.00\%$.
- **E3 (Raw R4):**
  - Correct Predictions: 25 / 25 = 100.00% (driven by pathological over-abstention).
- **E5 (Platt Calibrated R4):**
  - Correct Predictions: 23 / 25 = 92.00% (2 false acceptances: React Native, GraphQL).
- **E6 (Platt + Gate 0.35):**
  - Correct Predictions: 23 / 25 = 92.00%.

### C. Origin of the "90/100 = 90%" String
Tracing historical experiment artifacts:
1. In **EXP-0031** (`EXP-0031-RESEARCH-REPORT.md`, line 34), overall Out-of-Domain accuracy was reported as `90.00%` (45 / 50 total OOD cases).
2. In **EXP-0032** benchmark prompt, the summary stated: `Novel-OOD: R0 = 90.00%, R4 = 96.67%` (evaluated on $N=30$ Novel-OOD cases in EXP-0032).
3. In the final assistant summary message at the conclusion of the EXP-0033 audit, the model synthetically generated an executive table row:
   `| **Novel-OOD Accuracy** | **90.00%** (90/100) | **95.00%** (95/100) | ...`
   This was an LLM formatting artifact that conflated the EXP-0032 prompt text with an assumed denominator of 100.
4. Crucially, the actual committed audit report `EXP-0033-INDEPENDENT-AUDIT.md` (commit `0d1ecc9`, line 221) contains the verified, exact figure:
   `| | Novel-OOD Accuracy | **88.00%** (22/25) | 88.00% | 0.00% | MATCH |`

---

## 3. Authoritative Reconciliation

| Metric Dimension | Erroneous Conversational Text | Authoritative Repository Artifact | Status |
| :--- | :--- | :--- | :--- |
| **Dataset Source** | Unspecified ($N=100$) | `EXP-0033-BLIND-DATASET.json` ($N=500$) | Confirmed |
| **Novel-OOD Sample Size** | 100 | **25** (`EXP33-OOD-0026` to `EXP33-OOD-0050`) | Confirmed |
| **Total OOD Sample Size** | N/A | **50** (25 Known-OOD + 25 Novel-OOD) | Confirmed |
| **R0 Correct Count** | 90 | **22** (22 / 25) | Confirmed |
| **R0 Novel-OOD Accuracy**| 90.00% | **88.00%** | **AUTHORITATIVE** |
| **R0 Total OOD Accuracy** | N/A | **92.00%** (46 / 50) | Authoritative secondary |

### Impact on EXP-0034 Success Criteria
- The authoritative baseline reference for Novel-OOD rejection under R0 on the frozen blind benchmark is **88.00% (22/25)**.
- To maintain maximum rigor and avoid any reliance on an unresolvable assumption:
  - **Primary Target:** Novel-OOD rejection must remain $\ge 88.00\%$ (preserving R0 parity on the 25 unseen novel technologies).
  - **Secondary High-Safety Target:** Novel-OOD rejection target $\ge 90.00\%$ (which requires $\ge 23/25 = 92.00\%$ on the discrete 25-case sample).
  - Mode E5 (Platt-calibrated R4) already achieved $23/25 = 92.00\%$, satisfying both criteria.

---

## 4. Final Authoritative Status

```text
AUTHORITATIVE STATUS: RECONCILED
Authoritative R0 Novel-OOD Rejection: 88.00% (22 / 25)
Authoritative R0 Total-OOD Rejection: 92.00% (46 / 50)
Authoritative R0 Downstream Accuracy: 69.60% (348 / 500)
Authoritative R0 Downstream FAR: 23.00% (49 / 213)
```
