# EXP-0019 — REGRESSION REPORT: SIDE EFFECTS & BOUNDARY DEFECTS

**Audit Date**: 2026-09-09  
**Auditor**: Autonomous Independent Scientific Verification  
**Evaluation Subject**: `EXP-0018-CANDIDATE-HARDENED-2026-09-09`  
**Historical Control**: `EXP-0013-CHAMPION-2026-09-09`  

---

## 1. Executive Summary

This report assesses whether the targeted bug fixes and architectural remediations introduced in **EXP-0018** created unintended regressions, performance degradations, or boundary defects compared to the frozen baseline **EXP-0013**.

Three distinct regressions and side-effect behaviors were empirically detected during EXP-0019:
1. **Performance & Architecture Regression**: Deactivation of the in-memory prewarmed vector cache during search.
2. **Latency Inflation on Unrefuted False Premises**: High tail latencies when queries slip past rule-based verifiers.
3. **Conversational Recency Bleed**: Intervening topic chunks polluting top-4 retrieval on cross-topic return.

---

## 2. Detailed Regression Findings

### Regression #1: In-Memory Prewarmed Vector Cache Bypassed (Architectural Regression)
- **Baseline Behavior (EXP-0013)**: In EXP-0013, search candidates were served from `self::$prewarmedCorpus` in RAM, avoiding SQLite disk queries and vector unpacking on every request.
- **Candidate Behavior (EXP-0018)**: In EXP-0018, `$isPrewarmed` evaluates to `false` because line 1265 checks `str_starts_with(self::$experimentMode, 'EXP-0013') || str_starts_with(self::$experimentMode, 'EXP-0016')`, which fails for `'EXP-0018'`.
- **Side Effect**:
  - The engine executes `SELECT ... FROM material_chunks WHERE 1=1` on SQLite for every single search request.
  - Binary vector blobs are unpacked and normalized on every query.
  - While this eliminates in-memory cache desync by reading directly from disk, it introduces unnecessary disk I/O overhead on high-throughput search traffic.

### Regression #2: Latency Inflation Under Natural Language False Premises (Tail Latency Regression)
- **Baseline Behavior (EXP-0013)**: In EXP-0013, false-premise queries were not specifically intercepted by regexes; they proceeded directly to LLM generation or were caught by confidence gating.
- **Candidate Behavior (EXP-0018)**: EXP-0018 claimed instant zero-latency refutation for all false premises.
- **Observed Behavior**: For the **60.3% of false-premise queries** that do not match the 13 hard-coded regexes, the request passes through to Ollama `llama3.2:latest`, incurring 10-15 seconds of CPU/GPU inference latency per query.
- **Impact**: Under bursty false-premise queries, the two Gen workers (8007 & 8008) become saturated, causing queuing and elevated p99 latency.

### Regression #3: Conversational Recency Bleed (Context Pollution Regression)
- **Mechanism**: The conversational query condenser in EXP-0018 was hardened to retain earlier context. However, when combined with hybrid RRF fusion, passing conversational history to `search()` allows tokens from the immediately preceding turns to boost unrelated chunks.
- **Observed Behavior**: In cross-topic sequences ($A \to B \to C \to \text{Return } A$), the top-4 search results retained chunks from Topic B and C in **10 out of 10 cycles** (100% hybrid contamination).
- **Severity**: Low to Medium (Rank 1 was correctly Topic A in 20/30 turns, but top-4 purity was degraded).

---

## 3. Regression Verdict Table

| Metric / Capability | EXP-0013 Champion | EXP-0018 Candidate | Regression Status |
| :--- | :--- | :--- | :--- |
| **In-Memory Cache Active** | Yes (`isPrewarmed: true`) | No (`isPrewarmed: false`) | **REGRESSED (Dead Code)** |
| **Search Path Disk I/O** | 0 disk reads/search | 1 SQLite query/search | **REGRESSED (Disk Bound)** |
| **Cluster Worker Crash Survival** | Failed (Black hole) | 100% HTTP 200 failover | **IMPROVED (Zero Regression)** |
| **Concurrency Slot Leakage** | Leaked on abort | 0 drift after 1000 events | **IMPROVED (Zero Regression)** |
| **Hard-Negative Accuracy** | 82.4% | 94.33% Top@1 | **IMPROVED (Zero Regression)** |
| **Citation Factuality** | 98.2% | 100.0% (0 phantoms) | **IMPROVED (Zero Regression)** |
| **False-Premise FAR** | 88.0% | 60.30% | **IMPROVED vs Control (but Falsified vs Claim)** |

---

## 4. Conclusion
EXP-0018 provides dramatic structural improvements in infrastructure reliability, process supervision, concurrency safety, and citation grounding. However, the regression in in-memory corpus pre-warming and the persistent 60.30% FAR under unseen false premises prevent unqualified promotion.
