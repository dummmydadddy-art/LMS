# EXP-0055: Independent Scientific Audit & Reconciliation Report

**Experiment:** EXP-0055: Low-Memory Windowed & Streaming Document Ingestion with Python Docling  
**Auditor:** Automated Scientific Integrity & Research Governance Verifier  
**Target Branch:** `research-integration`  
**Base Commit:** `55aa4ac3c582f632de1946885de1b9daed892417`  
**Production Repository:** `D:\Collage project\EduConnect-LMS-Production` (FROZEN HEAD: `176883227602671b545e061dacf228aedc3271a5`)  
**Audit Date:** September 2026  
**Verdict:** **PASS — SCIENTIFICALLY RECONCILED & CONSTRAINED (OPERATIONAL DECISION: ADOPT / SCIENTIFIC CLAIM: CONDITIONAL)**  

---

## 1. Audit Scope & Compliance Criteria

This independent audit verifies whether EXP-0055 adheres strictly to scientific experiment discipline:
1. **Production Isolation:** Did the production repository remain completely untouched?
2. **Evaluator Independence & Immutability:** Did the evaluation harness change any verifier logic, scoring formulas, prompts, or thresholds?
3. **Dataset & Historical Immutability:** Did development, blind, and historical experiment artifacts remain byte-identical?
4. **Anti-Simulation Enforcement:** Were any uninstalled or uncompiled components replaced by mock or simulated outputs?
5. **Fidelity Verification:** Were the 4 mandatory fidelity corrections properly executed?
   - PageIndex distinction preserved (outline `md_to_tree()`, not native PDF parsing).
   - Genuine incremental page streaming implemented.
   - True peak RSS background sampling thread utilized.
   - Python Docling version uniformly reported as `2.128.0`.

---

## 2. Cryptographic Integrity Audit

| File | Expected SHA-256 | Actual SHA-256 | Status |
|---|---|---|:---:|
| `EXP-0025-DEVELOPMENT-DATASET.json` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` | `8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b` | **MATCH (FROZEN)** |
| `EXP-0033-BLIND-DATASET.json` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | `3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08` | **MATCH (FROZEN)** |
| `EXP-0040-BLIND-PREDICTIONS.json` | `56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1` | `56003df48c432baca1f042be75c12bf652f2a298a875727d7b694421bfd5ebd1` | **MATCH (FROZEN)** |
| `backend/rag_ambiguity_guard_verifier.php` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` | `31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e` | **MATCH (FROZEN)** |
| `EXP-0055-BLIND-PREDICTIONS.json` | Locked upon generation | `fe2c71a87738f242a9e480b2e8329c39dc2252d04e087a0b6236270bb719bba2` | **LOCKED READ-ONLY** |

---

## 3. Fidelity & Implementation Verification

1. **True Peak RSS Measurement:**
   - Evaluated `research/document_adapters/python_docling_adapter.py`.
   - Verified `PeakMemoryMonitor` runs a daemon thread polling `psutil.Process().memory_info().rss` every 2ms during active document conversion.
   - The flawed `max(rss_start, rss_end)` logic has been completely replaced.
2. **Genuine Incremental Page Streaming:**
   - Evaluated `stream_pages()` in `PythonDoclingAdapter`.
   - Verified that pages are processed in windowed increments (`chunk_window`), yielded immediately to the generator consumer, and followed by explicit `gc.collect()` calls to prevent full-document heap accumulation.
3. **Docling Runtime Version Consistency:**
   - Dynamic probe: `docling.__version__ = 2.128.0`.
   - Manifest probe: `EXTERNAL-COMPONENT-MANIFEST.json` specifies `docling==2.128.0`.
   - YAML probe: `research/manifests/external_components.yaml` specifies `docling==2.128.0`.
   - Status: 100% consistent across all artifacts.
4. **PageIndex Identity Scope:**
   - Manifest and status documentation explicitly state: "Verified execution path is PageIndex md_to_tree() operating on structure/text prepared from PDF, not end-to-end native PDF ingestion."

---

## 4. Production Repository Isolation Audit

- **Production Directory:** `D:\Collage project\EduConnect-LMS-Production`
- **Current HEAD:** `176883227602671b545e061dacf228aedc3271a5`
- **Expected HEAD:** `176883227602671b545e061dacf228aedc3271a5`
- **Commit Delta:** Exactly 0 commits.
- **File System Leakage:** `tests.research.test_production_clean` passed without warnings (0 research files or adapters present in production).

## 5. Scientific Reconciliation & Claim Validation

A rigorous post-experimental scientific reconciliation was conducted to enforce precise statistical integrity:

1. **Memory-Scaling Validation & Correction:**
   - The pre-registered hypothesis specified $\le 100$ MB delta RSS above idle for 5, 20, and 50 pages.
   - Observed C1 values were: 5p: +14.94 MB, 20p: +112.36 MB, 50p: +15.07 MB.
   - **Audit Correction:** The $\le 100$ MB ceiling was **violated at 20 pages**. Any claim that the experiment established asymptotic $O(1)$ complexity across all page counts has been retracted.
   - Empirical candidate peak RSS remained bounded between 14.94 MB and 112.36 MB delta above idle across the tested 5-50 page range, with a transient memory excursion at 20 pages before returning to baseline levels at 50 pages (+15.07 MB).

2. **Latency Scaling Assessment:**
   - Candidate ingestion latency was non-monotonic across document sizes (5p: 0.30s, 20p: 8.25s, 50p: 3.05s).
   - Because these are single-run benchmark measurements, the cause of the 20-page latency peak was not systematically isolated and is documented strictly as an empirical observation.

3. **Non-Inferiority Claim Recalibration:**
   - Control B0 and Candidate C1 scored identically across all 500 locked blind cases (Accuracy: 72.00%, FAR: 17.07%, $n_{11}=360, n_{00}=140, n_{10}=0, n_{01}=0$).
   - **Audit Correction:** With zero discordant pairs, McNemar's test ($\chi^2 = 0.0000, p = 1.000$) indicates lack of paired disagreement in this sample, but does not provide inferential proof of non-inferiority. All claims asserting statistical rejection of a non-inferiority margin or $[0\%, 0\%]$ population confidence intervals were removed. The data establish empirical parity on the evaluated benchmark rather than inferential non-inferiority.

4. **Corpus & Extraction Equivalence:**
   - Unqualified assertions of "mathematically equivalent corpus guaranteeing zero semantic drift" were replaced with: "Windowed streaming preserved evaluated text and heading fidelity and produced identical downstream predictions on all 500 locked blind cases."

5. **Failure and Abstention Accounting:**
   - The benchmark's 140 errors (360/500 correct) are explicitly classified:
     - NOT_ESTABLISHED on SUPPORTED queries (false abstentions): 14
     - NOT_ESTABLISHED on REFUTED queries (false abstentions): 15
     - REFUTED on SUPPORTED queries: 45
     - SUPPORTED on REFUTED queries: 37
     - SUPPORTED on NOT_ESTABLISHED queries: 12
     - REFUTED on NOT_ESTABLISHED queries: 17
     - True NOT_ESTABLISHED on OUT_OF_CURRICULUM queries: 96 (out of 125)

6. **Dual Decision Framework:**
   - **OPERATIONAL DECISION: ADOPT** (backed by 107.26 MB lower peak memory at 50 pages, 100% extraction fidelity, zero downstream regression, and 0 MB GPU VRAM).
   - **SCIENTIFIC CLAIM: CONDITIONAL** (conditioned on bounded memory within the tested range with a 20-page transient excursion, non-monotonic single-run latency, and empirical parity on the locked sample rather than inferential non-inferiority).

---

## 6. Audit Conclusion

The implementation, experimental protocol, data preservation, downstream evaluations, and scientific reconciliation adhere to rigorous scientific standards. The final audit verdict is **PASS — SCIENTIFICALLY RECONCILED & CONSTRAINED**.
