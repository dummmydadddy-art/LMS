import sys
import json
import re
from openai import OpenAI

sys.stdout.reconfigure(encoding='utf-8')

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

prompt = """You are a strict, objective evaluation judge following the DeepEval / RAGAS standard.
Evaluate the Faithfulness of the answer given the context.
Return ONLY a valid JSON object with two fields:
{
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<short concise justification>"
}

Context:
"A B-tree index in PostgreSQL is the default index type. It is optimized for equality (=) and range queries (<, <=, >, >=), as well as sorting."

Answer:
"A B-tree index is PostgreSQL's default index and provides efficient performance for equality comparisons and range scans."
"""

print("Sending evaluation request to judge model qwen3:4b...")
response = client.chat.completions.create(
    model="qwen3:4b",
    messages=[
        {"role": "system", "content": "You are an automated evaluation judge. Always output valid JSON."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.0
)

content = response.choices[0].message.content
print("\nRaw Judge Response:")
print(content)

# Clean up thinking tags if present
clean_json_str = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
# Extract json if wrapped in ```json
match = re.search(r'\{.*\}', clean_json_str, re.DOTALL)
if match:
    parsed = json.loads(match.group(0))
    print("\nParsed JSON:", parsed)
    print("Score:", parsed.get("score"))
    print("Reasoning:", parsed.get("reasoning"))
