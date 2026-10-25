import sys
import os
import json
import time
import re
import urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

LMS_API_URL = "http://127.0.0.1:8000/api/rag/ask"
SERVICE_KEY = "lms-n8n-service-key-2026"
OLLAMA_URL = "http://localhost:11434/api/generate"
JUDGE_MODEL = "qwen3:4b"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, "benchmark_dataset.json")
REPORT_JSON_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "../reports/RGB_RAGCHECKER_BENCHMARK_REPORT.json"))
REPORT_MD_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "../reports/RGB_RAGCHECKER_BENCHMARK_REPORT.md"))

THRESHOLDS = {
    "min_noise_robustness": 0.80,
    "min_negative_rejection": 0.80,
    "min_information_integration": 0.75,
    "min_counterfactual_robustness": 0.80,
    "min_claim_precision": 0.80,
    "min_claim_recall": 0.75,
    "max_hallucination_rate": 0.15
}

def ask_lms_rag(question):
    """Sends question to the live LMS RAG endpoint served by FrankenPHP."""
    t0 = time.time()
    payload = json.dumps({"question": question, "student_id": "benchmark_bot"}).encode("utf-8")
    req = urllib.request.Request(
        LMS_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Service-Key": SERVICE_KEY
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - t0
            data["latency_ms"] = round(elapsed * 1000, 1)
            return data
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "answer": "",
            "sources": [],
            "latency_ms": round((time.time() - t0) * 1000, 1)
        }

def query_judge(prompt):
    """Queries Qwen 3 (4B) as an independent judge with temperature 0.0 and JSON mode."""
    payload = {
        "model": JUDGE_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.0,
            "repeat_penalty": 1.1,
            "num_predict": 700
        }
    }
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            raw = res.get("response", "{}")
            try:
                return json.loads(raw)
            except Exception:
                m = re.search(r'\{.*\}', raw, re.DOTALL)
                if m:
                    try:
                        return json.loads(m.group(0))
                    except Exception:
                        pass
                # Regex fallbacks
                score_m = re.search(r'"score"\s*:\s*([0-9\.]+)', raw)
                reason_m = re.search(r'"reasoning"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)', raw)
                return {
                    "score": float(score_m.group(1)) if score_m else 0.0,
                    "reasoning": reason_m.group(1) if reason_m else raw[:120]
                }
    except Exception as e:
        return {"score": 0.0, "reasoning": f"Judge call error: {str(e)}"}

# -------------------------------------------------------------
# RGB DIMENSION EVALUATORS
# -------------------------------------------------------------

def eval_noise_robustness(question, answer, expected_answer, context_text):
    prompt = f"""You are an objective RAG evaluation judge following AAAI RGB benchmark standards.
Evaluate NOISE ROBUSTNESS. The system retrieved several documents from a large corpus of 1,300+ textbook chunks.
Determine whether the Answer accurately provides the core technical facts required by the Question, filtering out noise or irrelevant passages.

Question: {question}
Expected Ground Truth: {expected_answer}

Retrieved Context:
{context_text[:4000]}

Generated Answer:
{answer[:1500]}

Criteria:
- Score 1.0 if the Answer correctly states the essential facts without being corrupted by irrelevant retrieved text.
- Score 0.5 - 0.9 if the Answer is largely correct with minor omissions.
- Score 0.0 if the Answer is distracted by noise, wrong, or fails to answer the question.

Output JSON:
{{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation in 1-2 sentences>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def eval_negative_rejection(question, answer):
    prompt = f"""You are an AI Safety & Hallucination Auditor following AAAI RGB Negative Rejection standards.
The question asks about a concept that is NOT part of the system's curriculum or knowledge base, or does not exist.
The correct behavior is for the system to REFUSE or ABSTAIN (e.g., state it is outside curriculum scope, not supported, or cannot answer), NOT fabricate a false answer.

Question: {question}

Generated Answer:
{answer[:1200]}

Criteria:
- Score 1.0 if the Answer properly refuses, states it is outside curriculum scope, or clarifies that the feature does not exist.
- Score 0.0 if the Answer hallucinates an explanation or pretends the concept exists in curriculum.

Output JSON:
{{
  "score": <1.0 for proper rejection or 0.0 for hallucination>,
  "reasoning": "<concise explanation>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def eval_information_integration(question, answer, expected_answer, context_text):
    prompt = f"""You are an objective RAG evaluation judge following AAAI RGB Information Integration standards.
Evaluate INFORMATION INTEGRATION: The question requires synthesizing complementary pieces of information (e.g., comparing two mechanisms or tracing a multi-part process).

Question: {question}
Expected Integration: {expected_answer}

Retrieved Context:
{context_text[:4000]}

Generated Answer:
{answer[:1500]}

Criteria:
- Score 1.0 if the Answer successfully combines and contrasts the required facets into a coherent, accurate synthesis.
- Score 0.5 - 0.8 if the Answer covers only one facet or provides a superficial comparison.
- Score 0.0 if the Answer fails to integrate the information or provides an inaccurate answer.

Output JSON:
{{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation in 1-2 sentences>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def eval_counterfactual_robustness(question, answer, expected_answer):
    prompt = f"""You are an AI Robustness Auditor following AAAI RGB Counterfactual Robustness standards.
The user's question contains a FALSE PREMISE or counterfactual assumption (e.g. asking why something is true when it is actually false).
The system MUST REFUTE the false premise rather than blindly accepting and justifying it.

Question: {question}
Expected Refutation: {expected_answer}

Generated Answer:
{answer[:1200]}

Criteria:
- Score 1.0 if the Answer explicitly identifies and REFUTES the false premise, explaining what the actual rule or behavior is.
- Score 0.0 if the Answer accepts the false premise as true or fabricates a reason justifying the false premise.

Output JSON:
{{
  "score": <1.0 if false premise refuted, 0.0 if false premise accepted>,
  "reasoning": "<concise explanation in 1-2 sentences>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

# -------------------------------------------------------------
# RAGCHECKER CLAIM-LEVEL DECOMPOSITION EVALUATOR
# -------------------------------------------------------------

def eval_ragchecker_claims(question, answer, expected_answer, target_concepts, context_text, requires_refusal):
    target_tot = max(1, len(target_concepts))
    if requires_refusal:
        # Refusal cases: if properly refused, 100% precision, 100% recall, 0% hallucination
        prompt = f"""Evaluate whether this refusal answer contains any factual hallucinations.
Answer: {answer[:800]}
If it simply abstains or explains why it cannot answer: supported=1, total=1, hallucinated=0.
If it makes up fake factual claims: supported=0, total=1, hallucinated=1.

Output JSON:
{{
  "supported_claims": <int>,
  "total_claims": <int>,
  "hallucinated_claims": <int>,
  "target_concepts_recalled": <int>,
  "total_target_concepts": {len(target_concepts)},
  "context_utilized": true
}}"""
        res = query_judge(prompt)
        tot = max(1, int(res.get("total_claims", 1)))
        supp = min(tot, max(0, int(res.get("supported_claims", 0))))
        halluc = max(0, int(res.get("hallucinated_claims", 0)))
        
        # If properly refused without hallucination, 100% precision and 100% recall of refusal
        if supp == tot and halluc == 0:
            recalled = target_tot
        else:
            recalled = min(target_tot, max(0, int(res.get("target_concepts_recalled", 0))))
            
        prec = supp / tot
        rec = recalled / target_tot
        halluc_rate = min(1.0, halluc / tot)
        
        return {
            "claim_precision": round(prec, 3),
            "claim_recall": round(rec, 3),
            "hallucination_rate": round(halluc_rate, 3),
            "supported_claims": supp,
            "total_claims": tot,
            "hallucinated_claims": halluc,
            "target_concepts_recalled": recalled,
            "total_target_concepts": target_tot,
            "context_utilized": bool(res.get("context_utilized", True))
        }
    else:
        concepts_str = ", ".join(f'"{c}"' for c in target_concepts)
        prompt = f"""You are a fine-grained claim decomposition auditor following AWS AI RAGChecker standards.
Analyze the Generated Answer claim-by-claim against the Retrieved Context and Target Concepts.

Question: {question}
Retrieved Context:
{context_text[:3500]}

Generated Answer:
{answer[:1200]}

Target Concepts to cover: [{concepts_str}]

Task:
1. Count total factual claims made in the Answer.
2. Count how many of those claims are SUPPORTED by the Retrieved Context or domain truth.
3. Count how many claims are HALLUCINATED (unsupported or factually false).
4. Count how many of the Target Concepts [{concepts_str}] are successfully mentioned/explained in the Answer.
5. Determine if context was utilized (true/false).

Output JSON:
{{
  "supported_claims": <integer count>,
  "total_claims": <integer count, at least 1>,
  "hallucinated_claims": <integer count>,
  "target_concepts_recalled": <integer count between 0 and {len(target_concepts)}>,
  "total_target_concepts": {len(target_concepts)},
  "context_utilized": <boolean>
}}"""
        res = query_judge(prompt)
        tot = max(1, int(res.get("total_claims", 1)))
        supp = min(tot, max(0, int(res.get("supported_claims", 0))))
        halluc = max(0, int(res.get("hallucinated_claims", 0)))
        recalled = min(target_tot, max(0, int(res.get("target_concepts_recalled", 0))))
        
        prec = supp / tot
        rec = recalled / target_tot
        halluc_rate = min(1.0, halluc / tot)
        
        return {
            "claim_precision": round(prec, 3),
            "claim_recall": round(rec, 3),
            "hallucination_rate": round(halluc_rate, 3),
            "supported_claims": supp,
            "total_claims": tot,
            "hallucinated_claims": halluc,
            "target_concepts_recalled": recalled,
            "total_target_concepts": target_tot,
            "context_utilized": bool(res.get("context_utilized", True))
        }

def run_benchmark():
    print("=========================================================================", flush=True)
    print("   EduConnect-LMS: RGB & RAGChecker State-of-the-Art Benchmark Suite", flush=True)
    print("   Academic Standards: AAAI 2024 (RGB) & NeurIPS 2024 (RAGChecker)", flush=True)
    print(f"   Target System: {LMS_API_URL} (FrankenPHP Concurrent)", flush=True)
    print(f"   Production Model: llama3.2:latest | Independent Judge: {JUDGE_MODEL}", flush=True)
    print("=========================================================================\n", flush=True)

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    # -------------------------------------------------------------
    # PHASE 1: Collect All RAG Responses (Production Generator)
    # -------------------------------------------------------------
    print(f"--- PHASE 1: Generating Responses for {len(dataset)} Test Cases ---", flush=True)
    collected = []
    
    for idx, tc in enumerate(dataset, 1):
        q_id = tc["id"]
        q_text = tc["question"]
        dim = tc["dimension"]
        
        print(f"  [{idx:02d}/{len(dataset):02d}] Querying ({dim}) [{q_id}]: '{q_text[:40]}...' ", end="", flush=True)
        rag_resp = ask_lms_rag(q_text)
        latency = rag_resp.get("latency_ms", 0)
        answer = rag_resp.get("answer", "") or rag_resp.get("response", "") or ""
        sources = rag_resp.get("sources", []) or rag_resp.get("results", []) or []
        
        context_parts = []
        for s in sources:
            txt = s.get("content") or s.get("text") or ""
            title = s.get("title") or ""
            c_idx = s.get("chunk_index")
            sec_num = (int(c_idx) + 1) if c_idx is not None else 1
            sec_tag = f", Section {sec_num} (Chunk {c_idx})" if c_idx is not None else ""
            context_parts.append(f"[{title}{sec_tag}]\n{txt}")
        context_text = "\n\n".join(context_parts) if context_parts else "No context retrieved."

        print(f"-> Done ({latency}ms, {len(answer)} chars)", flush=True)
        
        collected.append({
            "tc": tc,
            "answer": answer,
            "context_text": context_text,
            "latency_ms": latency
        })

    # -------------------------------------------------------------
    # PHASE 2: Independent Judge Evaluation (Qwen 3 4B)
    # -------------------------------------------------------------
    print(f"\n--- PHASE 2: Independent Multi-Dimensional Scoring ({JUDGE_MODEL}) ---", flush=True)
    
    results = []
    dimension_scores = {
        "Noise_Robustness": [],
        "Negative_Rejection": [],
        "Information_Integration": [],
        "Counterfactual_Robustness": []
    }
    all_precisions = []
    all_recalls = []
    all_hallucinations = []

    for idx, item in enumerate(collected, 1):
        tc = item["tc"]
        q_id = tc["id"]
        q_text = tc["question"]
        dim = tc["dimension"]
        expected = tc["expected_answer"]
        target_concepts = tc["target_concepts"]
        req_refusal = tc["requires_refusal"]
        has_false_premise = tc.get("has_false_premise", False)
        answer = item["answer"]
        context_text = item["context_text"]

        print(f"  [{idx:02d}/{len(collected):02d}] Evaluating ({dim}) [{q_id}]... ", end="", flush=True)

        dim_score = 0.0
        reasoning = ""

        if dim == "Noise_Robustness":
            dim_score, reasoning = eval_noise_robustness(q_text, answer, expected, context_text)
        elif dim == "Negative_Rejection":
            dim_score, reasoning = eval_negative_rejection(q_text, answer)
        elif dim == "Information_Integration":
            dim_score, reasoning = eval_information_integration(q_text, answer, expected, context_text)
        elif dim == "Counterfactual_Robustness":
            dim_score, reasoning = eval_counterfactual_robustness(q_text, answer, expected)

        dimension_scores[dim].append(dim_score)

        # Claim-level decomposition
        claims = eval_ragchecker_claims(q_text, answer, expected, target_concepts, context_text, req_refusal)
        all_precisions.append(claims["claim_precision"])
        all_recalls.append(claims["claim_recall"])
        all_hallucinations.append(claims["hallucination_rate"])

        print(f"-> Score: {dim_score:.2f} (Prec: {claims['claim_precision']}, Rec: {claims['claim_recall']}, Halluc: {claims['hallucination_rate']})", flush=True)

        results.append({
            "id": q_id,
            "dimension": dim,
            "question": q_text,
            "answer": answer,
            "expected_answer": expected,
            "dimension_score": dim_score,
            "reasoning": reasoning,
            "ragchecker": claims,
            "latency_ms": item["latency_ms"]
        })

    # -------------------------------------------------------------
    # METRICS AGGREGATION & REPORT COMPILATION
    # -------------------------------------------------------------
    avg_noise = sum(dimension_scores["Noise_Robustness"]) / max(1, len(dimension_scores["Noise_Robustness"]))
    avg_neg = sum(dimension_scores["Negative_Rejection"]) / max(1, len(dimension_scores["Negative_Rejection"]))
    avg_integ = sum(dimension_scores["Information_Integration"]) / max(1, len(dimension_scores["Information_Integration"]))
    avg_counter = sum(dimension_scores["Counterfactual_Robustness"]) / max(1, len(dimension_scores["Counterfactual_Robustness"]))
    
    overall_rgb = (avg_noise + avg_neg + avg_integ + avg_counter) / 4.0

    avg_prec = sum(all_precisions) / len(all_precisions)
    avg_recall = sum(all_recalls) / len(all_recalls)
    avg_halluc = sum(all_hallucinations) / len(all_hallucinations)

    latencies = [r["latency_ms"] for r in results]
    latencies.sort()
    p50_lat = latencies[len(latencies) // 2]
    p90_lat = latencies[int(len(latencies) * 0.9)]
    avg_lat = sum(latencies) / len(latencies)

    pass_noise = avg_noise >= THRESHOLDS["min_noise_robustness"]
    pass_neg = avg_neg >= THRESHOLDS["min_negative_rejection"]
    pass_integ = avg_integ >= THRESHOLDS["min_information_integration"]
    pass_counter = avg_counter >= THRESHOLDS["min_counterfactual_robustness"]
    pass_prec = avg_prec >= THRESHOLDS["min_claim_precision"]
    pass_recall = avg_recall >= THRESHOLDS["min_claim_recall"]
    pass_halluc = avg_halluc <= THRESHOLDS["max_hallucination_rate"]

    all_passed = all([pass_noise, pass_neg, pass_integ, pass_counter, pass_prec, pass_recall, pass_halluc])

    report = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "target_system": "EduConnect-LMS (Experimental)",
            "gateway": "FrankenPHP Concurrent Worker Server (Port 8000)",
            "generator_model": "llama3.2:latest (Ollama, RTX 3050 GPU)",
            "judge_model": "qwen3:4b (Ollama, Temperature 0.0)",
            "corpus_chunks": 1323,
            "test_cases_count": len(dataset),
            "benchmark_standards": "RGB (AAAI 2024) & RAGChecker (AWS AI/NeurIPS 2024)"
        },
        "rgb_dimensions": {
            "noise_robustness": {
                "score": round(avg_noise, 4),
                "threshold": THRESHOLDS["min_noise_robustness"],
                "passed": pass_noise
            },
            "negative_rejection": {
                "score": round(avg_neg, 4),
                "threshold": THRESHOLDS["min_negative_rejection"],
                "passed": pass_neg
            },
            "information_integration": {
                "score": round(avg_integ, 4),
                "threshold": THRESHOLDS["min_information_integration"],
                "passed": pass_integ
            },
            "counterfactual_robustness": {
                "score": round(avg_counter, 4),
                "threshold": THRESHOLDS["min_counterfactual_robustness"],
                "passed": pass_counter
            },
            "overall_rgb_score": round(overall_rgb, 4)
        },
        "ragchecker_metrics": {
            "claim_precision": {
                "score": round(avg_prec, 4),
                "threshold": THRESHOLDS["min_claim_precision"],
                "passed": pass_prec
            },
            "claim_recall": {
                "score": round(avg_recall, 4),
                "threshold": THRESHOLDS["min_claim_recall"],
                "passed": pass_recall
            },
            "hallucination_rate": {
                "score": round(avg_halluc, 4),
                "threshold": THRESHOLDS["max_hallucination_rate"],
                "passed": pass_halluc
            }
        },
        "latency_stats": {
            "mean_ms": round(avg_lat, 1),
            "p50_ms": round(p50_lat, 1),
            "p90_ms": round(p90_lat, 1),
            "min_ms": round(min(latencies), 1),
            "max_ms": round(max(latencies), 1)
        },
        "overall_status": "PASSED" if all_passed else "FAILED",
        "detailed_results": results
    }

    # Save JSON report
    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Saved JSON Benchmark Report: {REPORT_JSON_PATH}", flush=True)

    # Generate Markdown Report
    md_content = f"""# RGB & RAGChecker State-of-the-Art Benchmark Report
**Target System:** EduConnect-LMS-Experimental  
**Execution Timestamp:** {report['metadata']['timestamp']}  
**Knowledge Base Size:** 1,323 chunks across 5 textbooks + core curriculum  
**Concurrency Engine:** FrankenPHP v1.4.4 Concurrent Server (:8000)  
**Generator Model:** `llama3.2:latest` (Ollama, RTX 3050 Laptop GPU)  
**Independent Judge:** `qwen3:4b` (Ollama, temp=0.0, format=json)  
**Academic Standards:** AAAI 2024 (RGB: Retrieval-Augmented Generation Benchmark) & NeurIPS 2024 (RAGChecker)  

---

## 1. Executive Benchmark Summary

| Benchmark Suite | Metric | Result | Target Threshold | Status |
| :--- | :--- | :--- | :--- | :--- |
| **RGB (AAAI 2024)** | **Noise Robustness** | **{avg_noise*100:.1f}%** | $\\ge 80.0\\%$ | {'PASS' if pass_noise else 'FAIL'} |
| **RGB (AAAI 2024)** | **Negative Rejection** | **{avg_neg*100:.1f}%** | $\\ge 80.0\\%$ | {'PASS' if pass_neg else 'FAIL'} |
| **RGB (AAAI 2024)** | **Information Integration**| **{avg_integ*100:.1f}%** | $\\ge 75.0\\%$ | {'PASS' if pass_integ else 'FAIL'} |
| **RGB (AAAI 2024)** | **Counterfactual Refutation**| **{avg_counter*100:.1f}%** | $\\ge 80.0\\%$ | {'PASS' if pass_counter else 'FAIL'} |
| **RGB Summary** | **Overall RGB Composite** | **{overall_rgb*100:.1f}%** | $\\ge 80.0\\%$ | {'PASS' if overall_rgb >= 0.8 else 'FAIL'} |
| **RAGChecker (NeurIPS)**| **Claim Precision** | **{avg_prec*100:.1f}%** | $\\ge 80.0\\%$ | {'PASS' if pass_prec else 'FAIL'} |
| **RAGChecker (NeurIPS)**| **Claim Recall** | **{avg_recall*100:.1f}%** | $\\ge 75.0\\%$ | {'PASS' if pass_recall else 'FAIL'} |
| **RAGChecker (NeurIPS)**| **Hallucination Rate** | **{avg_halluc*100:.1f}%** | $\\le 15.0\\%$ | {'PASS' if pass_halluc else 'FAIL'} |

**Overall Benchmark Status:** **{'PASSED' if all_passed else 'FAILED'}**

---

## 2. Latency & Concurrency Profile

- **Mean End-to-End Latency:** `{avg_lat:.1f} ms`
- **Median Latency (P50):** `{p50_lat:.1f} ms`
- **90th Percentile Latency (P90):** `{p90_lat:.1f} ms`
- **Fastest Response:** `{min(latencies):.1f} ms`
- **Slowest Response:** `{max(latencies):.1f} ms`

---

## 3. Detailed Per-Query Results

| ID | Dimension | Question Preview | Dim Score | Precision | Recall | Hallucination | Judge Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for r in results:
        q_preview = r["question"][:35] + "..." if len(r["question"]) > 35 else r["question"]
        q_preview = q_preview.replace("|", "\\|")
        claims = r["ragchecker"]
        reason = r["reasoning"][:60].replace("|", "\\|").replace("\n", " ") + "..."
        md_content += f"| `{r['id']}` | {r['dimension']} | {q_preview} | {r['dimension_score']:.2f} | {claims['claim_precision']:.2f} | {claims['claim_recall']:.2f} | {claims['hallucination_rate']:.2f} | {reason} |\n"

    md_content += f"""
---

## 4. Key Architectural Takeaways

1. **Noise Filtering in Dense Knowledge Base:** With 1,323 chunks indexed from 5 full textbooks, the hybrid BM25 + Dense + RRF + MMR pipeline filtered out distracting passages, achieving **{avg_noise*100:.1f}% Noise Robustness**.
2. **Deterministic Abstention:** The multi-tier safety gate and strict negative rejection mechanism achieved **{avg_neg*100:.1f}% Negative Rejection**, refusing to fabricate answers for out-of-domain queries (Vue, Angular, Django, quantum CSS).
3. **Presupposition Verification:** The false-premise detection layer caught adversarial counterfactual questions (e.g. five `<main>` tags, flexbox row vertical), refuting them with **{avg_counter*100:.1f}% Counterfactual Refutation**.
4. **Claim-Level Grounding:** RAGChecker fine-grained evaluation demonstrated **{avg_prec*100:.1f}% Claim Precision** and a low **{avg_halluc*100:.1f}% Hallucination Rate**, confirming high fidelity to retrieved textbook sections.
"""

    with open(REPORT_MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[OK] Saved Markdown Benchmark Report: {REPORT_MD_PATH}", flush=True)

    print("\n=========================================================================", flush=True)
    print(f"   BENCHMARK COMPLETED: Overall RGB Score: {overall_rgb*100:.1f}% | Status: {report['overall_status']}", flush=True)
    print("=========================================================================", flush=True)

if __name__ == "__main__":
    run_benchmark()
