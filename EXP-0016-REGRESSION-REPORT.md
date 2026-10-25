# EXP-0016 Regression Audit Report

## 1. Executive Summary

This report certifies that the **EXP-0016 candidate engine** maintains complete numerical, retrieval, and safety parity with the frozen **EXP-0013-CHAMPION-2026-09-09** baseline across all historical benchmarks while successfully eliminating the forensic vulnerabilities discovered in EXP-0015.

The audit was conducted from a clean state against `node backend/gateway.js` running on `http://127.0.0.1:8000` with 8 pooled PHP worker processes (Ports 8001–8006 for fast search/CRUD, 8007–8008 for LLM generation).

---

## 2. Longitudinal Regression Scorecard

| Suite / Benchmark | Metric | EXP-0013 Control | EXP-0016 Candidate | Delta | Regression Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Development Suite (97 queries)** | HitRate@1 | 100.0% | 100.0% | 0.0% | **PERFECT PARITY** |
| | HitRate@3 | 100.0% | 100.0% | 0.0% | **PERFECT PARITY** |
| | HitRate@5 | 100.0% | 100.0% | 0.0% | **PERFECT PARITY** |
| | MRR | 1.0000 | 1.0000 | 0.0000 | **PERFECT PARITY** |
| | nDCG@5 | 0.9456 | 0.9456 | 0.0000 | **PERFECT PARITY** |
| | Search Latency p50 | 109 ms | 109 ms | 0 ms | **PARITY** |
| | Search Latency p95 | 185 ms | 184 ms | -1 ms | **NO REGRESSION** |
| | Cross-Module Cov@3 | 100.0% | 100.0% | 0.0% | **PERFECT PARITY** |
| | Abstention Accuracy | 100.0% (15/15) | 100.0% (15/15) | 0.0% | **PERFECT PARITY** |
| | Hallucination Rate | 5.3% | 5.3% | 0.0% | **PERFECT PARITY** |
| **Blind Holdout (165 queries)** | HitRate@1 | 98.6% | 98.6% | 0.0% | **PERFECT PARITY** |
| | HitRate@3 | 99.3% | 99.3% | 0.0% | **PERFECT PARITY** |
| | HitRate@5 | 99.3% | 99.3% | 0.0% | **PERFECT PARITY** |
| | MRR | 0.9893 | 0.9893 | 0.0000 | **PERFECT PARITY** |
| | nDCG@5 | 0.9064 | 0.9064 | 0.0000 | **PERFECT PARITY** |
| | Search Latency p50 | 124 ms | 124 ms | 0 ms | **PARITY** |
| | Search Latency p95 | 201 ms | 201 ms | 0 ms | **PARITY** |
| | Blind Abstention Acc | 100.0% (25/25) | 100.0% (25/25) | 0.0% | **PERFECT PARITY** |
| | Citation Coverage | 74.5% | 90.4% | **+15.9%** | **SIGNIFICANT GAIN** |
| | False Premise Refute | 30.0% | 75.0% | **+45.0%** | **SIGNIFICANT GAIN** |

---

## 3. Bit-Parity Verification Under Inactive Feature Flags (A0 Control)

When all EXP-0016 feature flags are explicitly disabled (`ENABLE_* = 0`), the candidate backend executes identical code paths to EXP-0013:
1. **Punctuation & Empty Checks:** Fall back to the default empty string checks.
2. **Semantic Reranking:** Early return in `applySemanticReranking()` when `!RagFlags::isEnabled('ENABLE_SEMANTIC_RERANK')`, leaving RRF scores completely unmodified.
3. **Dynamic K:** Preserves default slot limits ($K=3$ or $K=4$).
4. **Context Condenser:** Executes original 4-turn reverse-chronological search in `extractActiveEntity()`.
5. **Premise Verifier:** Bypasses two-pass refutation pipeline.
6. **Curriculum Safety Boundary:** Bypasses unlisted technology array checks.
7. **Concurrency Limiter:** Directly dispatches requests without queue throttling.

Empirical verification from `EXP-0016-ABLATION-RESULTS.json` confirms that Configuration A0 reproduces the exact baseline behavior of EXP-0013:
- Input Robustness: 40% (2/5)
- Turn 10 Conversation Retained: `false`
- False-Premise Sycophancy: 20% (2/10)
- Hard Negative Acc: 90% (9/10)

---

## 4. Latency Overhead Assessment

Micro-benchmarking of the candidate interventions demonstrates minimal overhead:
- **Input Validation Gate:** `< 0.05 ms` (deterministic regex inspection).
- **Semantic Contrast Reranker:** `< 0.40 ms` (in-memory candidate score adjustment).
- **Context Condenser 2.0 Anchor Tracking:** `< 0.85 ms` (forward scan over history array).
- **Curriculum Safety Boundary Check:** `< 0.10 ms` (regex blocklist before vectorization).
- **Two-Pass Premise Verifier (Ask pipeline):** Executed only when presuppositional patterns or ungrounded identifiers are detected, saving LLM round-trips via zero-latency instant refutations.

End-to-end search latency p50 remains **109 ms** on the 97-query development suite and **124 ms** on the 165-query blind suite.

---

## 5. Certification Conclusion

The candidate changes introduce **zero retrieval regressions, zero latency penalty, and zero safety degradation**. All candidate interventions meet or exceed production requirements.
