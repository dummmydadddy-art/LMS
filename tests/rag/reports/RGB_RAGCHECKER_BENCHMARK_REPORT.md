# RGB & RAGChecker State-of-the-Art Benchmark Report
**Target System:** EduConnect-LMS-Experimental  
**Execution Timestamp:** 2026-10-03T15:53:26.978357  
**Knowledge Base Size:** 1,323 chunks across 5 textbooks + core curriculum  
**Concurrency Engine:** FrankenPHP v1.4.4 Concurrent Server (:8000)  
**Generator Model:** `llama3.2:latest` (Ollama, RTX 3050 Laptop GPU)  
**Independent Judge:** `qwen3:4b` (Ollama, temp=0.0, format=json)  
**Academic Standards:** AAAI 2024 (RGB: Retrieval-Augmented Generation Benchmark) & NeurIPS 2024 (RAGChecker)  

---

## 1. Executive Benchmark Summary

| Benchmark Suite | Metric | Result | Target Threshold | Status |
| :--- | :--- | :--- | :--- | :--- |
| **RGB (AAAI 2024)** | **Noise Robustness** | **96.0%** | $\ge 80.0\%$ | PASS |
| **RGB (AAAI 2024)** | **Negative Rejection** | **100.0%** | $\ge 80.0\%$ | PASS |
| **RGB (AAAI 2024)** | **Information Integration**| **93.0%** | $\ge 75.0\%$ | PASS |
| **RGB (AAAI 2024)** | **Counterfactual Refutation**| **100.0%** | $\ge 80.0\%$ | PASS |
| **RGB Summary** | **Overall RGB Composite** | **97.2%** | $\ge 80.0\%$ | PASS |
| **RAGChecker (NeurIPS)**| **Claim Precision** | **92.6%** | $\ge 80.0\%$ | PASS |
| **RAGChecker (NeurIPS)**| **Claim Recall** | **94.7%** | $\ge 75.0\%$ | PASS |
| **RAGChecker (NeurIPS)**| **Hallucination Rate** | **7.4%** | $\le 15.0\%$ | PASS |

**Overall Benchmark Status:** **PASSED**

---

## 2. Latency & Concurrency Profile

- **Mean End-to-End Latency:** `4563.6 ms`
- **Median Latency (P50):** `100.4 ms`
- **90th Percentile Latency (P90):** `35691.3 ms`
- **Fastest Response:** `34.6 ms`
- **Slowest Response:** `38027.2 ms`

---

## 3. Detailed Per-Query Results

| ID | Dimension | Question Preview | Dim Score | Precision | Recall | Hallucination | Judge Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `rgb_noise_01` | Noise_Robustness | Explain the four layers of the CSS ... | 1.00 | 0.83 | 1.00 | 0.17 | The Answer accurately describes the four layers of the CSS B... |
| `rgb_noise_02` | Noise_Robustness | What is the mandatory four-paramete... | 1.00 | 1.00 | 1.00 | 0.00 | The Answer correctly identifies the mandatory four-parameter... |
| `rgb_noise_03` | Noise_Robustness | What are the requirements for Third... | 1.00 | 1.00 | 1.00 | 0.00 | The Answer accurately states that 3NF requires meeting 2NF a... |
| `rgb_noise_04` | Noise_Robustness | What is a B-tree index in PostgreSQ... | 0.90 | 0.67 | 0.75 | 0.33 | The Answer correctly identifies that B-tree indexes optimize... |
| `rgb_noise_05` | Noise_Robustness | How does Git represent file revisio... | 0.90 | 0.75 | 0.80 | 0.25 | The Answer correctly identifies blobs as storing file conten... |
| `rgb_neg_01` | Negative_Rejection | How do Vue 3 Composition API reacti... | 1.00 | 1.00 | 1.00 | 0.00 | The generated answer correctly states it is outside curricul... |
| `rgb_neg_02` | Negative_Rejection | Explain how Angular 17 signals inte... | 1.00 | 1.00 | 1.00 | 0.00 | The question asks about Angular 17 signals and RxJS change d... |
| `rgb_neg_03` | Negative_Rejection | How do you configure Django setting... | 1.00 | 1.00 | 1.00 | 0.00 | The generated answer correctly states that it is outside the... |
| `rgb_neg_04` | Negative_Rejection | What is the syntax for the SQL INVE... | 1.00 | 1.00 | 1.00 | 0.00 | The question asks about an SQL statement that does not exist... |
| `rgb_neg_05` | Negative_Rejection | How do you configure quantum telepo... | 1.00 | 1.00 | 1.00 | 0.00 | The question asks about quantum teleportation entanglement i... |
| `rgb_integ_01` | Information_Integration | How does Temporal Dead Zone (TDZ) h... | 0.90 | 0.80 | 0.80 | 0.20 | The generated answer accurately synthesizes the key differen... |
| `rgb_integ_02` | Information_Integration | How does useRef differ from useStat... | 1.00 | 0.80 | 0.83 | 0.20 | The generated answer accurately synthesizes the key differen... |
| `rgb_integ_03` | Information_Integration | How does useEffect cleanup function... | 1.00 | 1.00 | 1.00 | 0.00 | The generated answer accurately synthesizes the cleanup func... |
| `rgb_integ_04` | Information_Integration | How do dictionaries achieve average... | 0.80 | 0.67 | 0.75 | 0.33 | The generated answer correctly identifies the use of hash ta... |
| `rgb_integ_05` | Information_Integration | In relational database design, why ... | 0.95 | 1.00 | 1.00 | 0.00 | The answer accurately synthesizes the required facets by exp... |
| `rgb_counter_01` | Counterfactual_Robustness | Why does HTML5 require every docume... | 1.00 | 1.00 | 1.00 | 0.00 | The question contains a false premise that HTML5 requires at... |
| `rgb_counter_02` | Counterfactual_Robustness | Why is flex-direction: row oriented... | 1.00 | 1.00 | 1.00 | 0.00 | The question contains a false premise that flex-direction: r... |
| `rgb_counter_03` | Counterfactual_Robustness | When using var in JavaScript, why d... | 1.00 | 1.00 | 1.00 | 0.00 | The premise is false because var is hoisted and initialized ... |
| `rgb_counter_04` | Counterfactual_Robustness | Why can an arrow function be used a... | 1.00 | 1.00 | 1.00 | 0.00 | The question contains a false premise that arrow functions c... |
| `rgb_counter_05` | Counterfactual_Robustness | Why does useEffect execute synchron... | 1.00 | 1.00 | 1.00 | 0.00 | The premise is false; useEffect executes asynchronously afte... |

---

## 4. Key Architectural Takeaways

1. **Noise Filtering in Dense Knowledge Base:** With 1,323 chunks indexed from 5 full textbooks, the hybrid BM25 + Dense + RRF + MMR pipeline filtered out distracting passages, achieving **96.0% Noise Robustness**.
2. **Deterministic Abstention:** The multi-tier safety gate and strict negative rejection mechanism achieved **100.0% Negative Rejection**, refusing to fabricate answers for out-of-domain queries (Vue, Angular, Django, quantum CSS).
3. **Presupposition Verification:** The false-premise detection layer caught adversarial counterfactual questions (e.g. five `<main>` tags, flexbox row vertical), refuting them with **100.0% Counterfactual Refutation**.
4. **Claim-Level Grounding:** RAGChecker fine-grained evaluation demonstrated **92.6% Claim Precision** and a low **7.4% Hallucination Rate**, confirming high fidelity to retrieved textbook sections.
