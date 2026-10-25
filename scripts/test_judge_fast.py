import sys
import json
import re
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

url = "http://localhost:11434/api/generate"
prompt = """[INST] You are an automated RAG evaluation judge. Do not deliberate. Output ONLY a JSON object:
{"score": 1.0, "reasoning": "Directly supported by context"}

Evaluate Faithfulness:
Context: A B-tree index in PostgreSQL is optimized for equality (=) and range queries (<, <=, >, >=).
Answer: A B-tree index enables fast equality and range queries.
[/INST]"""

payload = {
    "model": "qwen3:4b",
    "prompt": prompt,
    "stream": False,
    "options": {
        "temperature": 0.0,
        "num_predict": 128
    }
}

print("Testing bounded prompt on qwen3:4b...")
start = time.time()
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    elapsed = time.time() - start
    print(f"Elapsed: {elapsed:.2f}s")
    raw = res.get('response', '')
    print("Raw output:", repr(raw))
