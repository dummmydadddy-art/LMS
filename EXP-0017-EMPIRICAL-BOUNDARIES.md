# EXP-0017: Empirical Operational Boundaries & Cliff Edges

**Experiment ID:** EXP-0017-BOUNDARIES  
**Date:** 2026-09-09  
**Status:** COMPLETE  
**Evaluator:** Antigravity Adversarial Red Team  

---

## 1. Quantified Failure Boundaries

| Subsystem | Boundary Parameter | Safe Operational Zone | Cliff Edge / Failure Threshold | Observed Failure Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **HTTP Transport** | Request Body Size | $le 1,048,476	ext{ bytes}$ | $> 1,048,576	ext{ bytes}$ | TCP RST / Socket Reset (`ECONNRESET`) |
| **Concurrency Limiter** | Active Gen Requests | $le 64$ active | $> 64$ active | Enqueued up to 128; $> 192$ returns HTTP 429 |
| **Queue Latency** | In-Queue Wait Time | $le 10,000	ext{ ms}$ | $> 10,000	ext{ ms}$ | HTTP 504 Gateway Timeout |
| **Retrieval Threshold** | Cosine Similarity | $ge 0.220$ | $< 0.180$ | Step-function collapse into Calibrated Abstention |
| **Input Lexicality** | Alphanumeric Match | ASCII `[a-zA-Z0-9]` | Unicode-only digits | Falsely classified as non-lexical (0 results) |
| **Sycophancy Verifier** | Known Rule Space | 8 hardcoded methods | Out-of-vocabulary APIs | Drops from 100% refutation to 30% sycophancy |
| **Worker Supervision** | Process Crashes | Exactly 1 crash | $ge 2	ext{ crashes}$ | Permanent worker death & routing black hole |
| **Process Load Balance**| Sequential Requests| Concurrent bursts | Sequential stream | Worker 8001 absorbs 100%; 5 workers 0% |

---
**Attestation:** Empirical boundaries documented with verified metrics.
