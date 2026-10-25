# Step 3: External CI/CD Harness & Judge Evaluation Report

**Evaluation Framework:** DeepEval & RAGAS Evaluation Standards  
**Target System:** EduConnect-LMS RAG Gateway (`http://127.0.0.1:8000/api/rag/ask`)  
**Server Runtime:** FrankenPHP 1.12.7 (24 Worker Threads)  
**Production Generator:** Ollama `llama3.2:latest` (Meta Llama 3.2 3B)  
**External Judge Model:** Ollama `qwen3:4b` (Alibaba Qwen 3 4B)  
**Date:** 2026-10-02 19:18:45  
**Overall CI/CD Result:** **PASSED**  

---

## 1. Scorecard Summary

| RAG Metric | Score | Target Threshold | Gate Status |
| :--- | :--- | :--- | :--- |
| **Faithfulness (Groundedness)** | **91.1%** | $\ge 70%$ | **PASSED** |
| **Answer Relevancy** | **95.6%** | $\ge 70%$ | **PASSED** |
| **Context Recall (Sufficiency)** | **72.2%** | $\ge 70%$ | **PASSED** |
| **Safety & Hallucination Prevention** | **100.0%** | $\ge 80%$ | **PASSED** |
| **Overall RAG Triad Score** | **87.0%** | $\ge 75%$ | **PASSED** |

---

## 2. Unbiased Evaluation Architecture

To ensure zero self-preference bias, the evaluation harness strictly decouples the generator from the judge:
- **Generation:** Handled in production by `llama3.2:latest` (Meta AI).
- **Evaluation:** Evaluated independently by `qwen3:4b` (Alibaba Qwen), operating with zero temperature and structured JSON validation constraints.
- **RAG Triad Metrics:**
  - *Faithfulness:* Every factual claim in the response is cross-checked against retrieved source context.
  - *Answer Relevancy:* Penalizes non-sequiturs, topic drift, or incomplete student answers.
  - *Context Recall:* Measures whether retrieved chunks from the 1,323-chunk knowledge base contain all required ground truth concepts.
  - *Adversarial Safety:* Verifies that out-of-scope or fabricated questions are rejected rather than hallucinated.

---

## 3. Detailed Test Case Outcomes

| ID | Category | Question | Faithfulness | Relevancy | Context Recall | Safety |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| eval_01 | HTML & CSS | Explain the four layers of the CSS Box Model ... | 95.0% | 100.0% | 100.0% | N/A |
| eval_02 | JavaScript ES6+ | What is the Temporal Dead Zone (TDZ) in JavaS... | 85.0% | 80.0% | 100.0% | N/A |
| eval_03 | React Hooks | What are the two fundamental Rules of Hooks i... | 100.0% | 100.0% | 100.0% | N/A |
| eval_04 | React Hooks | How does useRef differ from useState in trigg... | 85.0% | 95.0% | 50.0% | N/A |
| eval_05 | Node.js & Express | What is the mandatory four-parameter signatur... | 95.0% | 100.0% | 50.0% | N/A |
| eval_06 | Database Systems | What are the requirements for Third Normal Fo... | 85.0% | 95.0% | 100.0% | N/A |
| eval_07 | Database Systems | What is a B-tree index in PostgreSQL and what... | 95.0% | 100.0% | 50.0% | N/A |
| eval_08 | Version Control & Git | How does Git represent file revisions and dir... | 95.0% | 95.0% | 50.0% | N/A |
| eval_09 | Python Algorithms | How do dictionaries achieve average constant ... | 85.0% | 95.0% | 50.0% | N/A |
| eval_10 | Adversarial Trap | How do you configure quantum teleportation en... | N/A | N/A | N/A | 100.0% |
| eval_11 | Adversarial Trap | What is the syntax for the SQL INVERT TABLE s... | N/A | N/A | N/A | 100.0% |
| eval_12 | Adversarial Trap | Explain the recipe for making dark chocolate ... | N/A | N/A | N/A | 100.0% |

---

## 4. CI/CD Command-Line Integration

This evaluation harness is packaged as an automated pre-push / regression gate:

```bash
# Execute local evaluation gate
python tests/rag/ci_cd/eval_harness.py

# Windows CI/CD batch script
scripts\run_cicd_eval.bat
```

The script exits with status code `0` on successful passing of all quality gates and `1` if any metric regresses below threshold.
