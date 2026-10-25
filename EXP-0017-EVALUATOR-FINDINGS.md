# EXP-0017: Evaluator & Test Suite Defect Audit

**Experiment ID:** EXP-0017-EVALUATOR-FORENSIC  
**Date:** 2026-09-09  
**Status:** COMPLETE (Evaluator Blind Spots Documented)  
**Evaluator:** Antigravity Adversarial Red Team  

---

## 1. Executive Summary

A critical objective of EXP-0017 was to falsify the evaluation benchmarks themselves and discover evaluator defects, overfit test suites, and blind spots.

**Key Findings:**
1. **False Sense of Security from EXP-0016 Hardening**: The EXP-0016 test suite reported 100% false-premise refutation only because it tested the exact 8 queries hardcoded into `rag_premise_verifier.php`.
2. **Evaluator Citation Verification Defect**: The baseline evaluator treated any response containing square brackets `[Course: ...]` as validly grounded, failing to verify whether the cited chunk actually substantiated the claim.
3. **Sequential Concurrency Test Invalidation**: Concurrency test suites in earlier experiments used `Promise.all()` with synthetic delay wrappers that allowed Worker 8001 to service requests sequentially, masking the single-worker starvation defect (W-26).

---
**Attestation:** Evaluator defects documented without suppression.
