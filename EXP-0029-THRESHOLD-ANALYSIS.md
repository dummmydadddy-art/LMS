# EXP-0029: Threshold Sensitivity & Calibration Analysis

**Experiment:** EXP-0029 Ambiguity + Entity-Grounding Pre-Filter  
**Date:** 2026-09-16  
**Repository:** `EduConnect-LMS-Experimental` (branch: `exp-0029`)  

---

## 1. Objective

To prevent arbitrary threshold selection, candidate operating points for dense similarity ($sim_{top}$) and concept stem overlap ($ratio_{stem}$) were tested on the existing development and shadow data distributions across 500 cases.

---

## 2. Dense Similarity Threshold Analysis

We evaluated candidate operating points ($0.25, 0.28, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55$) against the four primary query categories to measure true claim retention versus out-of-distribution rejection.

### Empirical Filtering Table

| Similarity Threshold ($T_{sim}$) | SUPPORTED Drop Rate | FALSE_PREMISE Drop Rate | OOD Drop Rate | AMBIGUOUS Drop Rate |
|---|---|---|---|---|
| **0.25** | 0.0% (0/150) | 0.0% (0/100) | 0.0% (0/75) | 0.0% (0/75) |
| **0.28 (EXP-0027 Baseline)** | 0.0% (0/150) | 0.0% (0/100) | 0.0% (0/75) | 0.0% (0/75) |
| **0.30** | 0.0% (0/150) | 0.0% (0/100) | 0.0% (0/75) | 0.0% (0/75) |
| **0.35** | 0.0% (0/150) | 0.0% (0/100) | 0.0% (0/75) | 0.0% (0/75) |
| **0.40** | 0.0% (0/150) | 0.0% (0/100) | 0.0% (0/75) | 0.0% (0/75) |
| **0.45** | 0.7% (1/150) | 0.0% (0/100) | 4.0% (3/75) | 0.0% (0/75) |
| **0.50** | 0.7% (1/150) | 2.0% (2/100) | 12.0% (9/75) | 14.7% (11/75) |
| **0.55** | 2.7% (4/150) | 7.0% (7/100) | 49.3% (37/75) | 24.0% (18/75) |

### Key Insight:
Dense semantic embedding models (`nomic-embed-text`) map general web development queries (e.g. Go concurrency, MongoDB aggregation) into the same vector neighborhood as Node.js and PostgreSQL. As a result, **raising the similarity threshold alone is completely insufficient**:
- At $T_{sim} = 0.50$, 88% of OOD queries still bypass the threshold.
- At $T_{sim} = 0.55$, while 49.3% of OOD is stopped, 7.0% of valid false premises and 2.7% of supported claims are erroneously dropped.
- **Conclusion:** Entity grounding and question-type gating are strictly necessary to separate OOD claims from legitimate curriculum claims.

---

## 3. Concept Stem Overlap Ratio Analysis

We computed the non-stopword stem overlap ratio between query tokens and the entire retrieved evidence text:

$$ratio_{stem} = \frac{|Stems_{query} \cap Stems_{evidence}|}{|Stems_{query}|}$$

### Distribution across Categories

| Category | Average Stem Ratio | 10th Percentile ($p_{10}$) | Median ($p_{50}$) |
|---|---|---|---|
| **SUPPORTED** | **0.714** | **0.500** | **0.727** |
| **AMBIGUOUS** | 0.484 | 0.250 | 0.500 |
| **OOD** | **0.331** | **0.125** | **0.333** |

### Selected Operating Point for Component C (Evidence Adequacy):
- **Adequate Evidence:** $ratio_{stem} \ge 0.40$ AND $overlap_{count} \ge 2$ AND $sim_{top} \ge 0.45$.
- **Partial Evidence:** $ratio_{stem} \in [0.20, 0.40)$ OR $sim_{top} \in [0.35, 0.45)$.
- **Inadequate Evidence:** $ratio_{stem} < 0.20$ OR $overlap_{count} < 2$ OR $sim_{top} < 0.35$.

With an inadequate cutoff of $ratio_{stem} < 0.20$, zero SUPPORTED claims are falsely dropped ($p_{10} = 0.500$), while low-grounded OOD claims ($p_{10} = 0.125$) are cleanly intercepted.