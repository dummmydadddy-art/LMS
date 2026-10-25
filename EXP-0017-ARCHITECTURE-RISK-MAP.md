# EXP-0017: Comprehensive Architectural Risk Map

**Experiment ID:** EXP-0017-RISK-MAP  
**Date:** 2026-09-09  
**Status:** COMPLETE  
**Evaluator:** Antigravity Adversarial Red Team  

---

## 1. Multi-Tier Risk Taxonomy

We classify the 28 discovered weaknesses into Micro, Meso, and Macro architectural tiers:

```
+-----------------------------------------------------------------------------+
|                               MACRO RISKS                                   |
|  - Absence of Cross-Worker Distributed Cache Invalidation (W-17)            |
|  - Single-Point-of-Failure in Unsupervised Process Tree (W-24)              |
|  - Disconnected Query Condensation & Gateway Embedding Pipeline (W-16)      |
+-----------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------+
|                                MESO RISKS                                   |
|  - Concurrency Limiter Counter Leak on Socket Termination (W-25)             |
|  - Hardcoded Pattern Overfitting in Sycophancy Defenses (W-23)              |
|  - Recency Latching in Multi-Turn Conversational Dialogue (W-19)            |
|  - Greedy Worker Starvation (Worker 8001 Saturation) (W-26)                 |
|  - Adversarial BM25 Slot Dilution via Keyword Stuffing (W-22)               |
+-----------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------+
|                               MICRO RISKS                                   |
|  - Abrupt TCP RST on 1MB Payload Cutoff (W-18)                              |
|  - Unhandled Vector Dimension Invariant in PHP Dot Product (W-21)           |
|  - Non-Latin Unicode Numeral Rejection (W-20)                               |
|  - Silent Database Exception Suppression (W-10)                             |
|  - Raw Control Character & Null Byte Passthrough (W-28)                     |
|  - Missing Health & Readiness Telemetry Endpoint (W-27)                     |
+-----------------------------------------------------------------------------+
```

---

## 2. Risk Blast Radius Matrix

| Risk ID | Title | Blast Radius | Likelihood | Impact | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **W-24** | One-Shot Worker Restart Bug | Cluster-wide Search Outage | High | Critical | P0 |
| **W-25** | Concurrency Counter Leak on Destroy | Cluster-wide Generation Lockout | High | Critical | P0 |
| **W-17** | Multi-Worker Cache Desync | Data Inconsistency / Zombie Chunks | High | High | P1 |
| **W-16** | Gateway Embedding Redundancy | 2x Ollama Load on Chat | 100% of chats | High | P1 |
| **W-23** | Rule-Based Sycophancy Overfit | Hallucination on Novel APIs | 30% of false premises | High | P1 |
| **W-26** | Greedy Worker Starvation | 5 Workers Idle / 1 Saturated | 100% sequential | High | P1 |
| **W-21** | Vector Dimension Mismatch Loop | CPU Throttle / Score Corruption | Low | High | P2 |
| **W-18** | Abrupt TCP RST on 1MB | Client-side 500 Connection Reset | High on large bodies | Medium | P2 |

---
**Attestation:** Architecture Risk Map completed.
