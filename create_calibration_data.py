import json
import re
import numpy as np
from scipy.optimize import minimize
import urllib.request

# Load EXP-0025 development dataset
with open("EXP-0025-DEVELOPMENT-DATASET.json", "r", encoding="utf-8") as f:
    dev_data = json.load(f)

# Load curriculum chunks
with open("backend/storage/chunks_meta.json", "r", encoding="utf-8") as f:
    chunks_meta = json.load(f)
chunk_map = {c["id"]: c for c in chunks_meta}

chunk_id_map = {
    ("HTML & CSS Fundamentals", 0): "ea1f3b17-0657-4ee2-b155-c56b775dd25e_chunk_0",
    ("HTML & CSS Fundamentals", 1): "ea1f3b17-0657-4ee2-b155-c56b775dd25e_chunk_1",
    ("HTML & CSS Fundamentals", 2): "ea1f3b17-0657-4ee2-b155-c56b775dd25e_chunk_2",
    ("HTML & CSS Fundamentals", 3): "ea1f3b17-0657-4ee2-b155-c56b775dd25e_chunk_3",
    ("JavaScript ES6+ Deep Dive", 0): "c254cc49-47b8-455f-bc9e-bc834c0276fe_chunk_0",
    ("JavaScript ES6+ Deep Dive", 1): "c254cc49-47b8-455f-bc9e-bc834c0276fe_chunk_1",
    ("JavaScript ES6+ Deep Dive", 2): "c254cc49-47b8-455f-bc9e-bc834c0276fe_chunk_2",
    ("JavaScript ES6+ Deep Dive", 3): "c254cc49-47b8-455f-bc9e-bc834c0276fe_chunk_3",
    ("React Hooks Tutorial", 0): "abc6db98-3d75-40ea-b988-f1e8a7497bba_chunk_0",
    ("React Hooks Tutorial", 1): "abc6db98-3d75-40ea-b988-f1e8a7497bba_chunk_1",
    ("React Hooks Tutorial", 2): "abc6db98-3d75-40ea-b988-f1e8a7497bba_chunk_2",
    ("React Hooks Tutorial", 3): "abc6db98-3d75-40ea-b988-f1e8a7497bba_chunk_3",
    ("React Hooks Tutorial", 4): "abc6db98-3d75-40ea-b988-f1e8a7497bba_chunk_4",
    ("React Hooks Tutorial", 5): "abc6db98-3d75-40ea-b988-f1e8a7497bba_chunk_5",
    ("Node.js & Express REST API Notes", 0): "5d1923d4-d240-4348-8ee3-29c512a8e752_chunk_0",
    ("Node.js & Express REST API Notes", 1): "5d1923d4-d240-4348-8ee3-29c512a8e752_chunk_1",
    ("Node.js & Express REST API Notes", 2): "5d1923d4-d240-4348-8ee3-29c512a8e752_chunk_2",
    ("Node.js & Express REST API Notes", 3): "5d1923d4-d240-4348-8ee3-29c512a8e752_chunk_3",
    ("Node.js & Express REST API Notes", 4): "5d1923d4-d240-4348-8ee3-29c512a8e752_chunk_4",
    ("PostgreSQL Database Design", 0): "d4e9dcd2-3b77-4e67-afa5-2d04001d09d0_chunk_0",
    ("PostgreSQL Database Design", 1): "d4e9dcd2-3b77-4e67-afa5-2d04001d09d0_chunk_1",
    ("PostgreSQL Database Design", 2): "d4e9dcd2-3b77-4e67-afa5-2d04001d09d0_chunk_2",
    ("PostgreSQL Database Design", 3): "d4e9dcd2-3b77-4e67-afa5-2d04001d09d0_chunk_3",
}

RULES = [
    (r'\b(header|nav|main|article|section|footer|semantic\s+html|accessibility|a11y)\b', ("HTML & CSS Fundamentals", 0)),
    (r'\b(box-sizing|box\s+model|content-box|border-box|padding|border|margin)\b', ("HTML & CSS Fundamentals", 1)),
    (r'\b(flexbox|flex-direction|justify-content|align-items|flex-wrap|flex-grow|flex-shrink|flex-basis|main\s+axis|cross\s+axis|display:\s*flex|gap)\b', ("HTML & CSS Fundamentals", 2)),
    (r'\b(grid|grid-template|grid-column|grid-row|minmax|repeat\(\d+,\s*1fr\))\b', ("HTML & CSS Fundamentals", 3)),
    (r'\b(var|let|const|temporal\s+dead\s+zone|tdz|hoist|block\s+scope|function\s+scope|reassignment|object\.freeze|strict\s+mode|undeclared)\b', ("JavaScript ES6+ Deep Dive", 0)),
    (r'\b(arrow\s+function|lexical\s+this|arguments\s+object|constructors?|bind\(this\))\b', ("JavaScript ES6+ Deep Dive", 1)),
    (r'\b(destructuring|spread\s+operator|rest\s+parameter|shallow\s+copy|deep\s+copy)\b', ("JavaScript ES6+ Deep Dive", 2)),
    (r'\b(promise|async/await|event\s+loop|microtask|macrotask|call\s+stack|task\s+queue|settimeout|promise\.all|promise\.race)\b', ("JavaScript ES6+ Deep Dive", 3)),
    (r'\b(rules\s+of\s+hooks|top\s+level|custom\s+hook)\b', ("React Hooks Tutorial", 0)),
    (r'\b(usestate|functional\s+updater|state\s+batching|state\s+immutab|setstate)\b', ("React Hooks Tutorial", 1)),
    (r'\b(useeffect|cleanup\s+function|dependency\s+array|side\s+effect|memory\s+leak|unmount)\b', ("React Hooks Tutorial", 2)),
    (r'\b(usecontext|createcontext|prop\s+drilling|authcontext|context\.provider)\b', ("React Hooks Tutorial", 3)),
    (r'\b(usememo|usecallback|memoiz|expensive\s+calculation|child\s+re-render)\b', ("React Hooks Tutorial", 4)),
    (r'\b(useref|\.current|mutable\s+ref|dom\s+element|inputref|ref\s+object)\b', ("React Hooks Tutorial", 5)),
    (r'\b(node(\.js)?|libuv|worker\s+thread|v8\s+engine|non-blocking\s+i/o)\b', ("Node.js & Express REST API Notes", 0)),
    (r'\b(express\.json|minimalist\s+web\s+framework|express\(\))\b', ("Node.js & Express REST API Notes", 1)),
    (r'\b(middleware|error-handling\s+middleware|req,\s*res,\s*next|err,\s*req,\s*res|next\(\))\b', ("Node.js & Express REST API Notes", 2)),
    (r'\b(rest(ful)?|http\s+method|http\s+verb|idempotent|status\s+code|200\s+ok|201\s+created|400\s+bad|401\s+unauth|403\s+forbidden|404\s+not|500\s+internal)\b', ("Node.js & Express REST API Notes", 3)),
    (r'\b(jwt|json\s+web\s+token|bearer\s+token|header\.payload|jwt\.sign)\b', ("Node.js & Express REST API Notes", 4)),
    (r'\b(relational\s+database|one-to-one|one-to-many|many-to-many|foreign\s+key|junction\s+table|associative\s+table|1:1|1:n|m:n)\b', ("PostgreSQL Database Design", 0)),
    (r'\b(normaliz|1nf|2nf|3nf|first\s+normal|second\s+normal|third\s+normal|transitive\s+dependenc|partial\s+dependenc|atomic\s+value)\b', ("PostgreSQL Database Design", 1)),
    (r'\b(index|b-tree|unique\s+index|composite\s+index|leftmost\s+prefix|gin\s+index|ivfflat|hnsw|pgvector|sequential\s+scan)\b', ("PostgreSQL Database Design", 2)),
    (r'\b(acid|atomic|consisten|isolation|durabilit|transaction|commit|rollback|write-ahead|wal)\b', ("PostgreSQL Database Design", 3)),
]

def find_gold_chunks(query, cat):
    if cat == "OUT_OF_CURRICULUM_UNKNOWN":
        return []
    res = []
    for pat, chunk_key in RULES:
        if re.search(pat, query, re.IGNORECASE):
            cid = chunk_id_map[chunk_key]
            if cid not in res:
                res.append(cid)
    return res

# Select 150 development cases
dev_sample = []
counts = {"SUPPORTED_CURRICULUM": 0, "NOVEL_FALSE_PREMISE": 0, "OUT_OF_CURRICULUM_UNKNOWN": 0, "LEGITIMATE_NEGATION": 0}
target_counts = {"SUPPORTED_CURRICULUM": 50, "NOVEL_FALSE_PREMISE": 50, "OUT_OF_CURRICULUM_UNKNOWN": 30, "LEGITIMATE_NEGATION": 20}

for case in dev_data:
    cat = case.get("category", "")
    if cat in target_counts and counts[cat] < target_counts[cat]:
        g = find_gold_chunks(case["query"], cat)
        if cat == "OUT_OF_CURRICULUM_UNKNOWN" or len(g) > 0:
            dev_sample.append({
                "case_id": case["id"],
                "query": case["query"],
                "category": cat,
                "expected": case["expected"],
                "gold_chunk_ids": g
            })
            counts[cat] += 1

print(f"Sampled {len(dev_sample)} development queries.")

# For each query, fetch raw MiniLM logits against:
# 1. The gold chunk (if any) -> label 1
# 2. Top-2 distractor chunks -> label 0
def get_raw_rerank_scores(query, doc_list):
    req_body = json.dumps({
        "query": query,
        "documents": [{"id": d["id"], "text": d["title"] + "\n\n" + d["content"]} for d in doc_list],
        "top_n": len(doc_list),
        "model": "cross-encoder/ms-marco-MiniLM-L-6-v2"
    }).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8100/rerank", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return {r["id"]: r["score"] for r in res["results"]}

calibration_pairs = []
print("Evaluating candidate pairs with MiniLM on development queries...", flush=True)

for idx, case in enumerate(dev_sample):
    q = case["query"]
    gold_ids = case["gold_chunk_ids"]
    
    # Evaluate gold chunk
    candidates_to_score = []
    for gid in gold_ids:
        if gid in chunk_map:
            candidates_to_score.append((chunk_map[gid], 1))
            
    # Add 2 distractor chunks
    distractor_ids = [cid for cid in chunk_map if cid not in gold_ids]
    # Pick 2 deterministic distractors based on hash
    h = hash(q)
    d1 = distractor_ids[h % len(distractor_ids)]
    d2 = distractor_ids[(h + 7) % len(distractor_ids)]
    candidates_to_score.append((chunk_map[d1], 0))
    candidates_to_score.append((chunk_map[d2], 0))
    
    docs_to_send = [c[0] for c in candidates_to_score]
    scores_dict = get_raw_rerank_scores(q, docs_to_send)
    
    for doc, label in candidates_to_score:
        logit = scores_dict.get(doc["id"], 0.0)
        calibration_pairs.append({
            "case_id": case["case_id"],
            "query": q,
            "document_id": doc["id"],
            "document_title": doc["title"],
            "raw_logit": round(float(logit), 6),
            "is_relevant": label
        })
        
    if (idx + 1) % 30 == 0 or (idx + 1) == len(dev_sample):
        print(f"  Processed {idx + 1}/{len(dev_sample)} cases ({len(calibration_pairs)} pairs)...", flush=True)

print(f"Total calibration pairs: {len(calibration_pairs)}")
relevant_count = sum(1 for p in calibration_pairs if p["is_relevant"] == 1)
non_relevant_count = sum(1 for p in calibration_pairs if p["is_relevant"] == 0)
print(f"Relevant (label=1): {relevant_count}, Non-relevant (label=0): {non_relevant_count}")

with open("EXP-0033-CALIBRATION-DATASET.json", "w", encoding="utf-8") as f:
    json.dump(calibration_pairs, f, indent=2)

print("Saved EXP-0033-CALIBRATION-DATASET.json")
