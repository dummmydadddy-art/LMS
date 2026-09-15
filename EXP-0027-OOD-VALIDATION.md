# EXP-0027: OOD Dataset Validation & Freeze Summary

**Date:** 2026-09-15  
**Target File:** EXP-0027-OOD-DATASET.json  
**Status:** VALIDATED & FROZEN  

## 1. Initial Audit Findings

An automated scan of the initial EXP-0027-OOD-DATASET.json revealed **35 contaminated cases** (15 SUPPORTED, 20 REFUTED):
- **24 cases** contained terms from the 138-pair $semanticOpposites dictionary (e.g., json, xml, one-dimensional, 	wo-dimensional, in memory, 200 ok, efore, atched, our arguments, 	wo arguments, unauthorized, safe, llow multiple, orbidden, llows duplicate, in the url).
- **16 cases** contained predicate keywords triggering the Tier-1 predicate negation detector (e.g., rguments, speed, ender, e-render, cache, eassigned, duplicate, xml).

## 2. Corrective Remediation

All 35 contaminated cases were systematically replaced with curriculum-grounded questions using novel terminology:
- Preserved exact module balance (DATABASE: 32, HTML_CSS: 34, REST_API: 34, REACT: 32, JAVASCRIPT: 34, NODEJS: 34).
- Preserved exact 50/50 polarity balance (100 SUPPORTED, 100 REFUTED).
- Strictly excluded all 18 forbidden words.
- Strictly excluded all 138 pairs of $semanticOpposites.
- Strictly excluded all 24 predicate keywords ($predKeywords).

## 3. Post-Remediation Verification

Re-audit with pply_ood_replacements.php:
- Total cases: **200**
- Labels: **100 SUPPORTED, 100 REFUTED**
- Dictionary term hits: **0**
- Predicate keyword hits: **0**
- Forbidden word hits: **0**

## 4. Checksum
EXP-0027-OOD-DATASET.json: Frozen for scientific evaluation.
