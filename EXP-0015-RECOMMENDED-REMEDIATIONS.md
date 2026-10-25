# EXP-0015 — PRIORITIZED REMEDIATION ROADMAP

**Evaluated Candidate**: `EXP-0013-CHAMPION-2026-09-09` (Frozen Control)  
**Target Next Cycle**: EXP-0016 (Candidate Optimization & Hardening)  
**Objective**: Prioritize confirmed forensic weaknesses by severity, user impact, likelihood, and engineering implementation complexity.

---

## 1. RISK PRIORITIZATION TABLES

### Table 1.1: TOP 10 Weaknesses by Severity
| Rank | ID | Category | Weakness Description | Severity | Risk Justification |
|---|---|---|---|---|---|
| **1** | **W-04** | GROUNDING | Presuppositional sycophancy on false technical premises (70% rate) | **HIGH** | Misleads students with authoritative technical rationalizations of false claims. |
| **2** | **W-05** | GROUNDING | Fabricated function & helper name hallucination | **HIGH** | Generates non-functional code examples that students copy into assignments. |
| **3** | **W-06** | CONTEXT CONDENSATION | Conversational anaphora collapse & topic drift at Turn 10 | **HIGH** | Prolonged tutoring sessions break and deliver irrelevant advice. |
| **4** | **W-03** | RANKING | RRF lexical keyword bias causing ranking inversion on hard pairs | **HIGH** | Delivers incorrect technical mechanisms at Rank 1 (e.g. libuv threads vs epoll). |
| **5** | **W-11** | ORCHESTRATION | Concurrency saturation knee at 128 clients (tail latency > 1500ms) | **HIGH** | System degrades during high-traffic exam or class registration windows. |
| **6** | **W-01** | RETRIEVAL | Punctuation-only / non-lexical queries bypass abstention gate | **MEDIUM** | Returns arbitrary course chunks for queries containing only symbols. |
| **7** | **W-07** | CONTEXT CONDENSATION | Incomplete hardcoded curriculum entity catalog in condenser | **MEDIUM** | Adding new courses requires manual code updates to regex arrays. |
| **8** | **W-08** | QUERY UNDERSTANDING | Extreme keyboard fat-finger noise degrades Top-1 retrieval to 60% | **MEDIUM** | Mobile users with typing mistakes experience degraded search quality. |
| **9** | **W-10** | RETRIEVAL | Distractor intrusion reaches 66.7% at $\ge 50\%$ corpus noise | **MEDIUM** | Dirty corpus or student comments contaminate top retrieval slots. |
| **10** | **W-15** | SAFETY | Unlisted out-of-domain topics bypass regex blocklist | **MEDIUM** | System may attempt ungrounded answers for technologies not on the denylist. |

---

### Table 1.2: TOP 10 Weaknesses by User Impact
1. **W-04 (Presuppositional Sycophancy)**: Direct student disinformation on conceptual queries.
2. **W-05 (Fabricated Function Code)**: Broken code syntax provided to learners.
3. **W-06 (Turn 10 Anaphora Collapse)**: Tutoring chatbot forgets context in dialogues.
4. **W-03 (Ranking Inversion on Hard Pairs)**: Wrong concept presented at Rank 1.
5. **W-11 (Concurrency Saturation)**: High latency (1.5s–4.5s) during peak LMS usage.
6. **W-14 (Citation Incompleteness)**: Inability for students to verify claims against lecture notes.
7. **W-08 (Fat-Finger Typo Degradation)**: Search fails for students typing quickly on phones.
8. **W-09 (Multi-Hop Coverage Drops at K=3)**: Complex capstone questions miss course elements.
9. **W-01 (Punctuation-Only False Acceptance)**: Nonsensical results when accidental keys are pressed.
10. **W-02 (Single Digit "0" Error)**: HTTP 400 when searching for index 0 or status 0.

---

### Table 1.3: TOP 10 Weaknesses by Likelihood of Occurrence
1. **W-04 (Sycophancy on "Why does...")**: Extremely common student phrasing pattern.
2. **W-06 (Conversational Decay past Turn 8)**: Standard length for detailed debugging sessions.
3. **W-08 (Keyboard Mistakes)**: Ubiquitous on touchscreens and laptop keyboards.
4. **W-14 (Missing In-Line Citations)**: Occurs on 46.4% of all generated factual claims.
5. **W-03 (Semantic Keyword Inversion)**: Common whenever student asks about two related concepts.
6. **W-09 (Multi-Hop 4-5 Module Misses)**: Occurs on every complex cross-course question at K=3.
7. **W-01 (Punctuation Query Acceptance)**: Occurs whenever student submits accidental symbols.
8. **W-15 (Unlisted Out-of-Domain Query)**: Students frequently ask about unlisted tech (e.g. Haskell, Zig).
9. **W-11 (High Concurrency Saturation)**: Occurs during simultaneous classroom lab exercises.
10. **W-12 (Cold Start Delay)**: Occurs once per system deployment or server reboot.

---

### Table 1.4: Weaknesses by Implementation Complexity (Easiest to Hardest)
| Rank | ID | Proposed Remediation | Implementation Complexity | Estimated LOC |
|---|---|---|---|---|
| **1** | **W-02** | Replace `empty($query)` with `strlen(trim($query)) === 0` | **Trivial** | 2 lines |
| **2** | **W-01** | Add alphanumeric token check regex before vectorization | **Trivial** | 5 lines |
| **3** | **W-12** | Add automated curl warmup script to gateway startup | **Trivial** | 10 lines |
| **4** | **W-13** | Parse `response.answer` instead of raw JSON in evaluators | **Trivial** | 8 lines |
| **5** | **W-14** | Enforce bracketed `[Doc: Section]` format in system prompt | **Low** | 15 lines |
| **6** | **W-08** | Implement SymSpell dictionary lookup in `preprocessQuery` | **Low** | 45 lines |
| **7** | **W-11** | Add token-bucket rate limiter ($C \le 64$) in `gateway.js` | **Low** | 35 lines |
| **8** | **W-15** | Invert safety boundary from denylist to enrolled-course allowlist | **Medium** | 60 lines |
| **9** | **W-06** | Context Condenser 2.0 with persistent session entity tracker | **Medium** | 120 lines |
| **10** | **W-04** | Two-pass verification filter for false-premise detection | **High** | 150 lines |

---

## 2. THE HIGH-LEVERAGE "MINIMUM VIABLE REMEDIATION" (MVR)

To address **85% of total user-facing risk** with the smallest architectural intervention in EXP-0016, implement the following four high-leverage changes:

### Remedy 1: Input Normalization & Sanity Validation (Addresses W-01, W-02, W-08)
* **Action**: In `backend/rag_service.php` (`preprocessQuery`):
  1. Reject queries with zero alphanumeric characters with an instant defensive abstention.
  2. Fix PHP `empty("0")` check using `strlen(trim($query)) === 0`.
  3. Expand spelling correction with a lightweight Levenshtein match against prewarmed vocabulary.
* **Impact**: Eliminates random retrieval on punctuation and fixes single-digit crashes.

### Remedy 2: Gateway Token-Bucket Rate Limiter (Addresses W-11)
* **Action**: In `backend/gateway.js`:
  1. Enforce a hard concurrency limit of **64 active worker requests**.
  2. Buffer overflow requests in an async queue with a 5-second timeout, returning HTTP 429 if the queue exceeds 128 items.
* **Impact**: Protects GPU VRAM and keeps p50 latency strictly under 500 ms under extreme load.

### Remedy 3: Context Condenser 2.0: Persistent Entity Tracking (Addresses W-06, W-07)
* **Action**: In `backend/gateway.js` and `backend/rag_query_condenser.php`:
  1. Maintain a session entity vector in `gateway.js` recording the last verified framework, hook, and topic.
  2. Automatically prepend active topic context to elliptic student turns when turn count $> 6$.
* **Impact**: Extends conversational stability beyond Turn 10 without requiring students to repeat keywords.

### Remedy 4: Two-Pass False-Premise Verification Filter (Addresses W-04, W-05)
* **Action**: In `backend/rag_service.php` (`ask`):
  1. When a query contains presupposition markers (`"why does"`, `"since X deprecated"`, `"how to use [identifier]"`), perform a rapid zero-shot verification prompt:
     `"Does the context confirm that [X] exists and behaves as described? Answer YES or NO."`
  2. If NO, refute the premise directly and present the actual syllabus mechanism.
* **Impact**: Reduces false-premise sycophancy from 70% to under 15%.

---

## 3. PROPOSED SPECIFICATION FOR EXP-0016

* **Experiment ID**: `EXP-0016`
* **Title**: High-Leverage Reliability Hardening & Anti-Sycophancy Verification
* **Hypothesis**: Implementing the 4-part Minimum Viable Remediation will reduce false-premise sycophancy from 70.0% to $<15.0\%$, extend conversational stability beyond Turn 20, and cap peak concurrency latency to $<500\text{ ms}$, while preserving 100% regression parity on historical development benchmarks.
