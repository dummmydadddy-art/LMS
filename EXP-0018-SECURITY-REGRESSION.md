# EXP-0018: SECURITY & DEFENSE REGRESSION REPORT

**Experiment ID:** EXP-0018  
**Subject:** EduConnect LMS Hybrid RAG Engine (`EXP-0018 Hardened Candidate`)  
**Date:** September 9, 2026  
**Auditor:** Principal Reliability Engineer & Security Red Team  
**Status:** FULLY REMEDIATED & CERTIFIED  

---

## 1. Executive Summary
This document certifies the security posture of the hardened candidate following targeted remediation of input vulnerabilities (W-20, W-28), payload cutoff mechanics (W-18), and adversarial retrieval manipulation (W-07, W-22).

## 2. Input Sanitization & Boundary Handling (W-20, W-28)
- **Pre-Remediation Vulnerability**: Non-ASCII Unicode numerals (e.g. fullwidth digits `'１'` U+FF11 and Arabic-Indic `'١'` U+0661) were falsely rejected as `NON_LEXICAL` by an ASCII-only regex `/[a-zA-Z0-9]/`. Null bytes (`\x00`) and non-printable control characters (`\x01-\x08`) passed unsanitized into SQLite queries and Ollama prompts.
- **Remediation Implemented**: In `backend/rag_service.php`:
  - Updated lexical validation regex to `/[a-zA-Z0-9\p{N}\p{L}]/u` supporting full Unicode numeral and letter planes.
  - Implemented strict control-character stripping: `$cleanQuery = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $query);`
- **Verification Results**:
  - Fullwidth numeral query `'React １'`: HTTP 200 OK, 4 chunks retrieved.
  - Arabic-Indic numeral query `'React ١'`: HTTP 200 OK, 4 chunks retrieved.
  - Null byte & control code injection `'React\x00\x01\x02useEffect'`: HTTP 200 OK, cleanly sanitized to `'ReactuseEffect'`, 4 chunks retrieved.

## 3. Transport Security & Socket Stream Draining (W-18)
- **Pre-Remediation Vulnerability**: For request payloads exceeding 1MB (up to 8MB), `gateway.js` invoked `req.destroy()`, issuing a TCP RST packet to the client and triggering unhandled client-side `read ECONNRESET`.
- **Remediation Implemented**: Replaced `req.destroy()` with socket stream draining:
  ```javascript
  res.writeHead(413, { 'Content-Type': 'application/json', 'Connection': 'close' });
  res.end(JSON.stringify({ error: 'Payload Too Large', limit_bytes: 1048576 }));
  req.resume(); // Drain residual socket stream
  ```
- **Verification Results**: 20 requests of 1.2MB payload sent; 100% returned HTTP 413 Payload Too Large with zero client-side `ECONNRESET`.

## 4. Adversarial Retrieval & Keyword Stuffing Defense (W-07, W-22)
- **Pre-Remediation Vulnerability**: Linear accumulation of query term frequencies in BM25 allowed adversaries to artificially repeat curriculum terms (e.g. "PostgreSQL B-tree index transaction" repeated 15 times) in a React question, inflating BM25 to 30.2 and displacing legitimate React chunks from Rank 1.
- **Remediation Implemented**:
  1. Okapi BM25 query term frequency sublinear saturation ($k_3 = 1.2$): query term weight saturates sublinearly via $\frac{qtf \cdot 2.2}{qtf + 1.2}$.
  2. Dense deficit disagreement penalty in RRF: when top dense similarity is high ($\ge 0.55$), candidate chunks with significant dense deficit ($> 0.035$) suffer a quadratic BM25 penalty.
- **Verification Results**: Stuffed query (`How does the React useEffect cleanup function prevent memory leaks? postgresql postgresql postgresql b-tree index b-tree index database index scan`) evaluated:
  - Rank 1: `React Hooks Tutorial` (Chunk 2, RRF: 0.0233, Dense: 0.655, BM25: 9.09)
  - Rank 2: `PostgreSQL Database Design` (Chunk 2, RRF: 0.0162, Dense: 0.627, BM25: 17.88)
  - Rank 1 displacement: 0.0% (React preserved at Rank 1).

## 5. Security Verdict
The candidate system exhibits zero security regressions and successfully repels boundary attacks, oversized payloads, and adversarial retrieval manipulation.
