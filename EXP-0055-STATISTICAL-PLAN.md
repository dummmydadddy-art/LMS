# EXP-0055: Pre-Registered Statistical Analysis Plan

**Experiment:** EXP-0055: Low-Memory Windowed & Streaming Document Ingestion with Python Docling  
**Date:** September 2026  
**Status:** PRE-REGISTERED  

---

## 1. Primary & Secondary Endpoints

### 1.1 Document Ingestion Performance (System Metrics)
- **Primary Endpoint 1 (Peak Memory Overhead):** Peak process RSS (MB) measured via continuous background sampling (2ms polling) during parsing.
  - *Criterion:* Candidate C1 must maintain $\Delta \text{Peak RSS} \le 100$ MB above baseline idle across all document lengths (5, 20, 50 pages).
- **Primary Endpoint 2 (Memory Scaling Slope):** Slope of Peak RSS as a function of document page count ($N$).
  - *Criterion:* Candidate C1 must demonstrate $O(1)$ flat scaling ($\text{slope} \approx 0$ MB/page) compared to Control B0 ($O(N)$ positive linear slope).
- **Secondary Endpoint 1 (Processing Latency):** Total parsing latency (seconds) and per-page throughput (ms/page).
- **Secondary Endpoint 2 (Content & Structural Fidelity):** Character extraction recall and section heading retention rate relative to source text ($100.0\%$ required).

### 1.2 Downstream RAG Verification (Downstream Metrics)
- **Primary Accuracy Endpoint:** Overall 3-class verification accuracy on `EXP-0025-DEVELOPMENT-DATASET.json` ($N = 400$) and `EXP-0033-BLIND-DATASET.json` ($N = 500$).
  - *Non-Inferiority Margin:* $\delta = 1.00$ percentage points relative to frozen EXP-0040 baseline ($72.00\%$ blind).
- **Primary Safety Endpoint:** Standard False Acceptance Rate ($\text{FAR} \le 17.50\%$).
- **Secondary Verifier Endpoints:** Macro F1, False Rejection Rate (FRR), Supported Recall, Refutation Recall, NOT_ESTABLISHED Recall, OOD Recall.

---

## 2. Statistical Testing Methodology

### 2.1 Paired Binary Classification (Accuracy & Safety)
- For downstream verification predictions on identical benchmark queries, evaluate paired $2 \times 2$ contingency matrices:
  - $n_{11}$: Both B0 and C1 correct
  - $n_{00}$: Both B0 and C1 incorrect
  - $n_{10}$: B0 correct, C1 incorrect
  - $n_{01}$: B0 incorrect, C1 correct
- **McNemar's Test:**
  $$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
  evaluated with 1 degree of freedom (two-sided, $\alpha = 0.05$).
- **Non-Inferiority Test:**
  Lower bound of 95% confidence interval for difference $\Delta = p_{\text{C1}} - p_{\text{B0}}$ must exceed $-\delta = -0.0100$.

### 2.2 Confidence Intervals
- For all proportions (Accuracy, Macro F1, FAR, FRR, Category Recalls), compute 95% two-sided **Wilson Score Confidence Intervals**:
  $$\text{CI}_{95\%} = \frac{\hat{p} + \frac{z^2}{2N} \pm z \sqrt{\frac{\hat{p}(1-\hat{p})}{N} + \frac{z^2}{4N^2}}}{1 + \frac{z^2}{N}}$$
  with $z = 1.95996$.
- For latency and memory metrics, report mean, standard deviation, median, p95, and 95% Student's t confidence intervals.

---

## 3. Decision Matrix & Thresholds

| Decision | Memory & Ingestion Criteria | Downstream RAG Criteria |
|---|---|---|
| **ADOPT** | $\Delta \text{Peak RSS} \le 100$ MB across all page counts, $O(1)$ memory scaling, 100% text fidelity | Blind Accuracy $\ge 71.40\%$, FAR $\le 17.50\%$, Non-inferiority demonstrated |
| **CONDITIONAL** | Memory bounded ($\le 120$ MB), 100% text fidelity | Blind Accuracy $\ge 70.00\%$, FAR $\le 18.50\%$ with operational constraints |
| **REJECT** | Memory unbounded ($O(N)$ scaling), text truncation/loss | Blind Accuracy $< 70.00\%$ or FAR $> 18.50\%$ (safety violation) |
| **PROMISING** | Ingestion verified with bounded memory, but downstream requires further tuning | Downstream verification inconclusive |

---

## 4. Evaluator Integrity & Blinding Protocol

- The blind evaluation on `EXP-0033-BLIND-DATASET.json` ($N = 500$) must be executed strictly once under locked configuration.
- Blind labels remain isolated from model tuning.
- All predictions must be saved to `EXP-0055-BLIND-PREDICTIONS.json` and locked read-only.
