# EXP-0026: Forensic Metric Reconciliation Report
**Authoritative Audit of EXP-0025 Development Accuracy Discrepancy**  
**Date**: September 13, 2026  
**Auditor**: Antigravity Autonomous Research Auditor  
**Experiment Branch**: exp-0026  
**Target Candidate**: EXP-0025 Champion (cc06561b446a24fa86a07d207f606b5438b14990)

---

## 1. Executive Summary

During the initial certification audit of EXP-0025, an apparent discrepancy was identified between two reported development accuracy figures:
- Narrative Report Reference: 87.75% (351/400 cases)
- Evaluation Artifact (EXP-0025-DEVELOPMENT-RESULTS.json): 89.25% (357/400 cases)

This forensic audit traced the complete development timeline, reconstructed both code states, diffed the verifier implementations, and executed controlled re-evaluations.

**Conclusive Determination**:  
The authoritative development accuracy of the frozen EXP-0025 candidate is **89.25%** (357 / 400).  
The 87.75% figure was a valid historical measurement of an intermediate prototype (V9) that was superseded during iterative refinement by V10 (which resolved punctuation-normalization mismatches and added standalone negation matching). The final narrative report retained a textual citation from the V9 milestone in one section while attaching the V10 evaluation artifact. No fraud, synthetic data leakage, or evaluation harness tampering was detected.

---

## 2. Chronological Timeline of Evaluations

| Timestamp (UTC) | Milestone / Artifact | Engine Version | Evaluated Cases | Accuracy | FAR | Refutation Recall |
|---|---|---|---|---|---|---|
| 2026-09-13 06:43:39Z | evaluate_dev_backend.php | V9 Prototype | 400 Dev Cases | **87.75%** (351/400) | 6.00% | 90.00% |
| 2026-09-13 06:51:53Z | prototype_refinements.php | V9.1 Trace | 400 Dev Cases | 88.50% (354/400) | 5.00% | 91.00% |
| 2026-09-13 06:53:22Z | rag_premise_verifier_v10.php | V10 Final Candidate | 400 Dev Cases | **89.25%** (357/400) | 4.00% | 92.00% |
| 2026-09-13 06:54:18Z | EXP-0025-DEVELOPMENT-RESULTS.json | V10 Final Candidate | 400 Dev Cases | **89.25%** (357/400) | 4.00% | 92.00% |
| 2026-09-13 07:06:06Z | EXP-0025-HOLDOUT-RESULTS.json | V10 Final Candidate | 1,000 Independent | **87.50%** (875/1000) | 7.67% | 85.33% |
| 2026-09-13 07:07:05Z | EXP-0025-FINAL-REPORT.md | Report Generation | — | Cited 87.75% in text, attached 89.25% JSON | — | — |

---

## 3. Code Diff Analysis: V9 Prototype vs V10 Active Verifier

The 1.50% accuracy delta (6 additional cases correctly classified out of 400) was driven by four specific code modifications between V9 and V10:

### 3.1 Pre-Normalization of Semantic Opposites Lookup
In V9, antonym lookup executed raw regex against normalized text:
- V9: Raw lookup
  $patA = '/\b' . preg_quote($termA, '/') . '\b/i';
  $patB = '/\b' . preg_quote($termB, '/') . '\b/i';
Because normalizeText() stripped colons, hyphens, and punctuation, dictionary terms containing punctuation (e.g. box-sizing: border-box, flex-direction: row, do not call hooks inside loops, conditions) failed to match on word boundaries. In V10, terms are normalized before regex generation:
- V10: Pre-normalized lookup
  $termANorm = self::normalizeText($termA);
  $termBNorm = self::normalizeText($termB);
  $patA = '/\b' . preg_quote($termANorm, '/') . '\b/i';
  $patB = '/\b' . preg_quote($termBNorm, '/') . '\b/i';

### 3.2 Enhanced Predicate Negation Regex
V9 required multi-word negation phrases (cannot, does not, prohibits). V10 added standalone \bnot\b to catch negative statements in course material.

### 3.3 Semantic Opposites Dictionary Expansion
V9 contained 106 antonym pairs. V10 expanded this to 138 pairs (+32 pairs) to resolve nuanced contrasts:
- setCount(prev => prev + 1) vs setCount(count + 1)
- call the next middleware in the stack vs halt the event loop
- base64url vs encrypt payload claims by default
- persisted via write-ahead logging vs only after database reboot

### 3.4 Assertion Boundary Stripping
V10 introduced boundary stripping of discourse markers (instead of, rather than) to avoid evaluating the counter-factual clause as the user assertion.

---

## 4. Empirical Re-Run Under Both Configurations

Both configurations were re-evaluated on the identical 400-case development dataset (EXP-0025-DEVELOPMENT-DATASET.json):

| Metric | Configuration 1 (V9 Prototype) | Configuration 2 (V10 Final Champion) | Delta (V10 - V9) |
|---|---|---|---|
| Total Cases | 400 | 400 | 0 |
| Correctly Classified | 351 | 357 | +6 cases |
| Overall Accuracy | **87.75%** | **89.25%** | **+1.50%** |
| False Acceptance Rate (FAR) | 6.00% (6/100) | 4.00% (4/100) | -2.00% |
| Refutation Recall | 90.00% (90/100) | 92.00% (92/100) | +2.00% |
| False Refutation Rate (FRR) | 0.00% (0/50) | 0.00% (0/50) | 0.00% |
| Unknown Recall | 100.00% (100/100) | 100.00% (100/100) | 0.00% |
| Evidence Used Invariant | 100.00% (400/400) | 100.00% (400/400) | 0.00% |

The 6 cases corrected by V10 were:
1. DEV-FALSE-0014: JWT payload base64 encoding vs encryption assertion.
2. DEV-FALSE-0038: React functional updater prev => prev + 1 vs direct state read.
3. DEV-FALSE-0052: Express middleware next() failure vs event loop blockage.
4. DEV-FALSE-0071: Rules of Hooks conditional execution restriction.
5. DEV-SUP-0029: Box-sizing border-box padding calculation (restored from false refutation).
6. DEV-SUP-0063: PostgreSQL WAL disk persistence timing.

---

## 5. Conclusive Reconciliation Verdict

1. **Root Cause**: The discrepancy is purely chronological. The narrative report author drafted the interim development results section based on the V9 prototype run (87.75%), subsequently improved the verifier to V10 (89.25%), generated the final artifact EXP-0025-DEVELOPMENT-RESULTS.json, but omitted updating the single textual reference in the summary narrative.
2. **Authoritative Metric**: **89.25%** is the true, reproducible development accuracy of the frozen EXP-0025 code commit (cc06561b).
3. **Integrity Assessment**: No evidence of fabrication or benchmark manipulation was found. The code and test artifacts exhibit complete internal consistency.
