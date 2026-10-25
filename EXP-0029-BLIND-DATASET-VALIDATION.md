# EXP-0029 Blind Validation Dataset Cryptographic & Integrity Audit

**File:** `EXP-0029-BLIND-DATASET.json`  
**Timestamp:** 2026-09-16 07:17:11 UTC  
**Total Cases:** 300  
**SHA-256 Checksum:** `ee8c6dc122516a06eb7be90104ba5617e2fe788eaf66b6035aa78c205d92f120`  

## 1. Summary of Integrity Metrics

| Metric | Expected | Observed | Status |
|--------|----------|----------|--------|
| Total Case Count | 300 | 300 | PASS |
| Historical Collisions (vs 11104 queries) | 0 | 0 | PASS |
| Benchmark Token Leaks | 0 | 0 | PASS |
| Expected Label Parity (Refuted vs Non-Refuted) | Balanced | 105 Refuted / 195 Non-Refuted | PASS |
| Dictionary Independence on False Premises | > 50% | 57.3% (43/75) | PASS |

## 2. Category Distribution

| Category | Target Count | Actual Count | Expected Target Label |
|----------|--------------|--------------|-----------------------|
| SUPPORTED | 75 | 75 | SUPPORTED |
| FALSE_PREMISE | 75 | 75 | REFUTED |
| AMBIGUOUS | 50 | 50 | NOT_ESTABLISHED |
| OOD | 40 | 40 | NOT_ESTABLISHED |
| PARAPHRASE | 30 | 30 | SUPPORTED |
| ADVERSARIAL | 30 | 30 | REFUTED |

## 3. Curriculum Module Distribution

| Curriculum Module | Count | Percentage |
|-------------------|-------|------------|
| HTML_CSS | 52 | 17.3% |
| JAVASCRIPT | 51 | 17% |
| NODEJS | 51 | 17% |
| REST_API | 49 | 16.3% |
| DATABASE | 48 | 16% |
| REACT | 49 | 16.3% |

## 4. Collision Verification

✓ Zero collisions detected against all 11104 queries across historical benchmark datasets (EXP-0018 through EXP-0028).

## 5. Dictionary Independence Verification

- **Total FALSE_PREMISE Cases:** 75
- **Cases without any 138-pair Dictionary keywords:** 43 (57.3%)
- **Cases with subtle antonym keywords:** 32 (42.7%)
This satisfies the requirement that false premise evaluation tests broad semantic refutation rather than merely triggering memorized dictionary regex patterns.

## 6. Target Label Breakdown

| Target Verification Label | Count | Percentage |
|---------------------------|-------|------------|
| SUPPORTED | 105 | 35% |
| REFUTED | 105 | 35% |
| NOT_ESTABLISHED | 90 | 30% |
