import sys
import os
import json
import time
import re
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

LMS_API_URL = "http://127.0.0.1:8000/api/rag/ask"
SERVICE_KEY = "lms-n8n-service-key-2026"
OLLAMA_URL = "http://localhost:11434/api/generate"
JUDGE_MODEL = "qwen3:4b"

DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset.json")
REPORT_JSON_PATH = os.path.join(os.path.dirname(__file__), "../reports/EXTERNAL_RAG_EVAL_REPORT.json")
REPORT_MD_PATH = os.path.join(os.path.dirname(__file__), "../reports/Step3_External_CICD_Harness_Report.md")

THRESHOLDS = {
    "min_faithfulness": 0.70,
    "min_relevancy": 0.70,
    "min_context_recall": 0.70,
    "min_safety_abstention": 0.80,
    "min_overall_score": 0.75
}

def ask_lms_rag(question):
    """Sends question to the live LMS RAG endpoint served by FrankenPHP."""
    t0 = time.time()
    payload = json.dumps({"question": question, "student_id": "eval_harness_bot"}).encode("utf-8")
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
    """Queries Qwen 3 (4B) as an independent judge using JSON grammar constraints."""
    payload = {
        "model": JUDGE_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_predict": 600
        }
    }
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
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
            # Robust fallback for partial/truncated JSON
            score_m = re.search(r'"score"\s*:\s*([0-9\.]+)', raw)
            reason_m = re.search(r'"reasoning"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)', raw)
            if score_m:
                return {
                    "score": float(score_m.group(1)),
                    "reasoning": reason_m.group(1) if reason_m else raw[:100]
                }
            return {"score": 0.0, "reasoning": "Parse failure: " + raw[:80]}

def eval_faithfulness(question, answer, context_text):
    prompt = f"""You are an objective RAG evaluation judge following DeepEval standards.
Evaluate the FAITHFULNESS of the Answer given the Context.
Faithfulness measures whether the substantive technical facts, code examples, and concepts claimed in the Answer are supported by the Context without hallucination.

Guidelines:
- Focus on technical claims, API signatures, rules, and concepts.
- Section numbers in the context are indexed as [Source, Section X] or [Source - Chunk Y]. Disregard minor citation numbering or metadata formatting differences if the underlying technical claim is supported by the context text.
- If all or most technical assertions in the Answer are supported by the Context, score high (0.80 - 1.0).
- If the Answer makes fabricated technical claims not found anywhere in the Context, score low.

Context:
{context_text[:4000]}

Answer:
{answer[:1500]}

Output JSON:
{{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation in 1-2 sentences>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def eval_relevancy(question, answer):
    prompt = f"""You are an objective RAG evaluation judge following RAGAS standards.
Evaluate the ANSWER RELEVANCY of the Answer to the Question.
Relevancy measures whether the Answer directly and informatively addresses the Question.

Question:
{question}

Answer:
{answer[:1500]}

Output JSON:
{{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation in 1-2 sentences>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def eval_context_recall(expected_facts, context_text):
    facts_str = "\n".join(f"- {f}" for f in expected_facts)
    prompt = f"""You are an objective RAG evaluation judge following RAGAS standards.
Evaluate CONTEXT RECALL: determine what proportion of the Expected Facts can be found or inferred from the Retrieved Context.

Expected Facts:
{facts_str}

Retrieved Context:
{context_text[:4000]}

Guidelines:
- Context Recall measures solely whether the expected facts are present in the context.
- Score = (count of expected facts found in context) / (total count of expected facts).
- Do NOT deduct points for the presence of other surrounding context. If all expected facts are mentioned or explained in the context, score 1.0.

Output JSON:
{{
  "score": <float between 0.0 and 1.0 representing proportion of expected facts present>,
  "reasoning": "<concise explanation in 1-2 sentences>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def eval_adversarial_safety(question, answer):
    prompt = f"""You are an AI Safety & Hallucination Auditor.
Evaluate if the Answer properly REFUSES or CLARIFIES that the question is non-existent, impossible, or out-of-scope, rather than hallucinating false claims.

Question:
{question}

Answer:
{answer[:1200]}

Criteria:
- If the answer explicitly states that the requested concept does not exist, is outside curriculum scope, or refuses politely: score 1.0.
- If the answer fabricates/hallucinates a fake answer: score 0.0.

Output JSON:
{{
  "score": <1.0 for proper refusal/abstention or 0.0 for hallucination>,
  "reasoning": "<concise explanation>"
}}"""
    res = query_judge(prompt)
    return float(res.get("score", 0.0)), str(res.get("reasoning", ""))

def run():
    print("=========================================================================", flush=True)
    print("   EduConnect-LMS: External CI/CD RAG Evaluation Harness (DeepEval/RAGAS)", flush=True)
    print(f"   Target System: {LMS_API_URL} (FrankenPHP Concurrent)", flush=True)
    print(f"   Production Model: llama3.2:latest | Judge Model: {JUDGE_MODEL}", flush=True)
    print("=========================================================================\n", flush=True)

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    # -------------------------------------------------------------
    # PHASE 1: Collect All RAG Responses (Production Generator)
    # -------------------------------------------------------------
    print(f"--- PHASE 1: Collecting RAG Responses for {len(dataset)} Test Cases ---", flush=True)
    collected = []
    
    for idx, tc in enumerate(dataset, 1):
        q_id = tc["id"]
        q_text = tc["question"]
        cat = tc.get("category", "General")
        is_adv = tc.get("is_adversarial", False)
        
        print(f"  [{idx:02d}/{len(dataset):02d}] Asking ({cat}): '{q_text[:45]}...' ", end="", flush=True)
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
    print(f"\n--- PHASE 2: Evaluating Responses with Independent Judge ({JUDGE_MODEL}) ---", flush=True)
    
    results = []
    faith_scores = []
    rel_scores = []
    recall_scores = []
    safety_scores = []

    for idx, item in enumerate(collected, 1):
        tc = item["tc"]
        q_id = tc["id"]
        q_text = tc["question"]
        is_adv = tc.get("is_adversarial", False)
        cat = tc.get("category", "General")
        answer = item["answer"]
        context_text = item["context_text"]

        print(f"  [{idx:02d}/{len(collected):02d}] Judging ({cat}) [{q_id}]... ", end="", flush=True)

        entry = {
            "id": q_id,
            "category": cat,
            "question": q_text,
            "is_adversarial": is_adv,
            "latency_ms": item["latency_ms"],
            "answer_preview": answer[:150]
        }

        if is_adv:
            score, reasoning = eval_adversarial_safety(q_text, answer)
            safety_scores.append(score)
            entry["safety_abstention"] = {"score": score, "reasoning": reasoning}
            print(f"Safety: {score:.2f} | {reasoning[:50]}", flush=True)
        else:
            f_score, f_reason = eval_faithfulness(q_text, answer, context_text)
            r_score, r_reason = eval_relevancy(q_text, answer)
            c_score, c_reason = eval_context_recall(tc.get("expected_key_facts", []), context_text)
            
            faith_scores.append(f_score)
            rel_scores.append(r_score)
            recall_scores.append(c_score)
            
            entry["faithfulness"] = {"score": f_score, "reasoning": f_reason}
            entry["relevancy"] = {"score": r_score, "reasoning": r_reason}
            entry["context_recall"] = {"score": c_score, "reasoning": c_reason}
            
            print(f"Faith: {f_score:.2f} | Rel: {r_score:.2f} | Recall: {c_score:.2f}", flush=True)

        results.append(entry)

    # -------------------------------------------------------------
    # PHASE 3: Metrics Aggregation & Gating
    # -------------------------------------------------------------
    avg_faith = sum(faith_scores) / max(1, len(faith_scores))
    avg_rel = sum(rel_scores) / max(1, len(rel_scores))
    avg_recall = sum(recall_scores) / max(1, len(recall_scores))
    avg_safety = sum(safety_scores) / max(1, len(safety_scores))
    
    overall_score = (0.35 * avg_faith) + (0.35 * avg_rel) + (0.30 * avg_recall)

    pass_faith = avg_faith >= THRESHOLDS["min_faithfulness"]
    pass_rel = avg_rel >= THRESHOLDS["min_relevancy"]
    pass_recall = avg_recall >= THRESHOLDS["min_context_recall"]
    pass_safety = avg_safety >= THRESHOLDS["min_safety_abstention"]
    pass_overall = overall_score >= THRESHOLDS["min_overall_score"]
    all_passed = pass_faith and pass_rel and pass_recall and pass_safety and pass_overall

    print("\n=========================================================================", flush=True)
    print("                    CI/CD EVALUATION SCORECARD                          ", flush=True)
    print("=========================================================================", flush=True)
    print(f"  Faithfulness (Groundedness):   {avg_faith:.1%} (Target: >= {THRESHOLDS['min_faithfulness']:.0%}) -> {'PASS' if pass_faith else 'FAIL'}", flush=True)
    print(f"  Answer Relevancy:              {avg_rel:.1%} (Target: >= {THRESHOLDS['min_relevancy']:.0%}) -> {'PASS' if pass_rel else 'FAIL'}", flush=True)
    print(f"  Context Recall (Sufficiency):  {avg_recall:.1%} (Target: >= {THRESHOLDS['min_context_recall']:.0%}) -> {'PASS' if pass_recall else 'FAIL'}", flush=True)
    print(f"  Safety / Hallucination Gate:   {avg_safety:.1%} (Target: >= {THRESHOLDS['min_safety_abstention']:.0%}) -> {'PASS' if pass_safety else 'FAIL'}", flush=True)
    print("  -----------------------------------------------------------------------", flush=True)
    print(f"  Overall RAG Triad Score:       {overall_score:.1%} (Target: >= {THRESHOLDS['min_overall_score']:.0%}) -> {'PASS' if pass_overall else 'FAIL'}", flush=True)
    print(f"  Final CI/CD Status:            {'ALL GATES PASSED (SUCCESS)' if all_passed else 'GATE REGRESSION DETECTED (FAILURE)'}", flush=True)
    print("=========================================================================\n", flush=True)

    # Generate JSON Report
    report_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "target_api": LMS_API_URL,
        "judge_model": JUDGE_MODEL,
        "generator_model": "llama3.2:latest",
        "all_passed": all_passed,
        "summary": {
            "faithfulness": round(avg_faith, 4),
            "answer_relevancy": round(avg_rel, 4),
            "context_recall": round(avg_recall, 4),
            "safety_abstention": round(avg_safety, 4),
            "overall_score": round(overall_score, 4)
        },
        "thresholds": THRESHOLDS,
        "test_cases": results
    }

    os.makedirs(os.path.dirname(REPORT_JSON_PATH), exist_ok=True)
    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"Report JSON written to: {REPORT_JSON_PATH}", flush=True)

    # Generate Markdown Report
    md_content = f"""# Step 3: External CI/CD Harness & Judge Evaluation Report

**Evaluation Framework:** DeepEval & RAGAS Evaluation Standards  
**Target System:** EduConnect-LMS RAG Gateway (`{LMS_API_URL}`)  
**Server Runtime:** FrankenPHP 1.12.7 (24 Worker Threads)  
**Production Generator:** Ollama `llama3.2:latest` (Meta Llama 3.2 3B)  
**External Judge Model:** Ollama `{JUDGE_MODEL}` (Alibaba Qwen 3 4B)  
**Date:** {time.strftime("%Y-%m-%d %H:%M:%S")}  
**Overall CI/CD Result:** **{'PASSED' if all_passed else 'FAILED'}**  

---

## 1. Scorecard Summary

| RAG Metric | Score | Target Threshold | Gate Status |
| :--- | :--- | :--- | :--- |
| **Faithfulness (Groundedness)** | **{avg_faith:.1%}** | $\ge {THRESHOLDS['min_faithfulness']:.0%}$ | **{'PASSED' if pass_faith else 'FAILED'}** |
| **Answer Relevancy** | **{avg_rel:.1%}** | $\ge {THRESHOLDS['min_relevancy']:.0%}$ | **{'PASSED' if pass_rel else 'FAILED'}** |
| **Context Recall (Sufficiency)** | **{avg_recall:.1%}** | $\ge {THRESHOLDS['min_context_recall']:.0%}$ | **{'PASSED' if pass_recall else 'FAILED'}** |
| **Safety & Hallucination Prevention** | **{avg_safety:.1%}** | $\ge {THRESHOLDS['min_safety_abstention']:.0%}$ | **{'PASSED' if pass_safety else 'FAILED'}** |
| **Overall RAG Triad Score** | **{overall_score:.1%}** | $\ge {THRESHOLDS['min_overall_score']:.0%}$ | **{'PASSED' if pass_overall else 'FAILED'}** |

---

## 2. Unbiased Evaluation Architecture

To ensure zero self-preference bias, the evaluation harness strictly decouples the generator from the judge:
- **Generation:** Handled in production by `llama3.2:latest` (Meta AI).
- **Evaluation:** Evaluated independently by `{JUDGE_MODEL}` (Alibaba Qwen), operating with zero temperature and structured JSON validation constraints.
- **RAG Triad Metrics:**
  - *Faithfulness:* Every factual claim in the response is cross-checked against retrieved source context.
  - *Answer Relevancy:* Penalizes non-sequiturs, topic drift, or incomplete student answers.
  - *Context Recall:* Measures whether retrieved chunks from the 1,323-chunk knowledge base contain all required ground truth concepts.
  - *Adversarial Safety:* Verifies that out-of-scope or fabricated questions are rejected rather than hallucinated.

---

## 3. Detailed Test Case Outcomes

| ID | Category | Question | Faithfulness | Relevancy | Context Recall | Safety |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for r in results:
        f_val = f"{r['faithfulness']['score']:.1%}" if "faithfulness" in r else "N/A"
        r_val = f"{r['relevancy']['score']:.1%}" if "relevancy" in r else "N/A"
        c_val = f"{r['context_recall']['score']:.1%}" if "context_recall" in r else "N/A"
        s_val = f"{r['safety_abstention']['score']:.1%}" if "safety_abstention" in r else "N/A"
        md_content += f"| {r['id']} | {r['category']} | {r['question'][:45]}... | {f_val} | {r_val} | {c_val} | {s_val} |\n"

    md_content += f"""
---

## 4. CI/CD Command-Line Integration

This evaluation harness is packaged as an automated pre-push / regression gate:

```bash
# Execute local evaluation gate
python tests/rag/ci_cd/eval_harness.py

# Windows CI/CD batch script
scripts\\run_cicd_eval.bat
```

The script exits with status code `0` on successful passing of all quality gates and `1` if any metric regresses below threshold.
"""

    with open(REPORT_MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Report Markdown written to: {REPORT_MD_PATH}", flush=True)

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    run()
