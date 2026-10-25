import sys
import json
import re
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

OLLAMA_URL = "http://localhost:11434/api/generate"
JUDGE_MODEL = "qwen3:4b"

def query_judge(prompt, schema_hint):
    payload = {
        "model": JUDGE_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_predict": 300
        }
    }
    req = urllib.request.Request(OLLAMA_URL, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        raw = res.get("response", "{}")
        try:
            return json.loads(raw)
        except Exception:
            # Fallback regex extraction
            m = re.search(r'\{.*\}', raw, re.DOTALL)
            if m:
                return json.loads(m.group(0))
            return {"score": 0.0, "reasoning": "Failed to parse JSON: " + raw[:100]}

# Test 1: Faithfulness
faith_prompt = """You are an impartial RAG evaluation judge following DeepEval standards.
Evaluate the FAITHFULNESS of the Answer relative to the provided Context.
Faithfulness measures whether all claims in the Answer are directly supported by the Context without hallucination.

Context:
"A B-tree index in PostgreSQL is the default index type. It is optimized for equality (=) and range queries (<, <=, >, >=), as well as sorting."

Answer:
"In PostgreSQL, a B-tree index is the default structure and provides fast lookups for equality comparisons and range-based queries."

Respond in JSON with exact format:
{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation of why the answer is faithful or unfaithful>"
}"""

print("Testing Faithfulness Judge...")
res = query_judge(faith_prompt, "faithfulness")
print("Faithfulness Result:", json.dumps(res, indent=2))

# Test 2: Answer Relevancy
rel_prompt = """You are an impartial RAG evaluation judge following RAGAS standards.
Evaluate the ANSWER RELEVANCY of the Answer to the Question.
Relevancy measures whether the Answer directly and concisely addresses the user's specific Question.

Question:
"What are the four layers of the CSS Box Model?"

Answer:
"The CSS Box Model consists of four distinct layers from inside out: Content (the actual element content), Padding (transparent space around content), Border (a frame surrounding the padding), and Margin (space outside the border separating neighboring elements)."

Respond in JSON with exact format:
{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation>"
}"""

print("\nTesting Answer Relevancy Judge...")
res2 = query_judge(rel_prompt, "relevancy")
print("Relevancy Result:", json.dumps(res2, indent=2))
