#!/usr/bin/env python3
"""
EXP-0032 Smoke Test Suite
Verifies:
  1. Embedding endpoint (/embed): 5 short texts, 384d, normalized vectors.
  2. Reranker endpoint (/rerank): 5 synthetic pairs, CPU execution, score differentiation.
  3. Corpus integrity: 23 chunks, 23 vectors, 0 missing, 0 duplicates.
"""

import urllib.request
import json
import sqlite3
import math

BRIDGE_URL = "http://127.0.0.1:8100"
DB_PATH = "database/rag_materials.sqlite3"

def test_embed():
    print("[Smoke Test 1] Testing /embed endpoint...")
    texts = [
        "JavaScript event loop executes microtasks before macrotasks.",
        "React functional components use hooks for lifecycle behavior.",
        "PostgreSQL indexes utilize B-Trees for range and equality queries.",
        "Express error handling middleware requires four parameters.",
        "CSS Grid supports two-dimensional row and column alignments."
    ]
    req_body = json.dumps({"texts": texts, "normalize": True, "model": "BAAI/bge-small-en-v1.5"}).encode("utf-8")
    req = urllib.request.Request(f"{BRIDGE_URL}/embed", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    assert data["model"] == "BAAI/bge-small-en-v1.5", f"Unexpected model: {data['model']}"
    assert data["dimension"] == 384, f"Unexpected dimension: {data['dimension']}"
    assert len(data["vectors"]) == 5, f"Expected 5 vectors, got {len(data['vectors'])}"

    for idx, vec in enumerate(data["vectors"]):
        assert len(vec) == 384, f"Vector {idx} length {len(vec)} != 384"
        norm = math.sqrt(sum(x * x for x in vec))
        assert abs(norm - 1.0) < 1e-4, f"Vector {idx} not normalized: norm = {norm}"

    print(f"  [PASS] /embed verified: 5 texts, 384-dim, unit-norm vectors, latency = {data.get('latency_ms')} ms")


def test_rerank():
    print("[Smoke Test 2] Testing /rerank endpoint...")
    query = "Explain how Express middleware handles errors"
    documents = [
        {"id": "doc_err", "text": "Express error-handling middleware functions are defined with four arguments: (err, req, res, next)."},
        {"id": "doc_css", "text": "CSS Flexbox aligns elements along the main axis using justify-content."},
        {"id": "doc_sql", "text": "Foreign keys enforce referential integrity across relational database tables."},
        {"id": "doc_react", "text": "React useState returns a state value and a function to update it."},
        {"id": "doc_html", "text": "HTML5 semantic elements like section and article improve document structure."}
    ]
    req_body = json.dumps({
        "query": query,
        "documents": documents,
        "top_n": 5,
        "model": "cross-encoder/ms-marco-MiniLM-L-6-v2"
    }).encode("utf-8")

    req = urllib.request.Request(f"{BRIDGE_URL}/rerank", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    assert data["model"] == "cross-encoder/ms-marco-MiniLM-L-6-v2"
    assert len(data["results"]) == 5

    # Top result MUST be doc_err
    top_doc = data["results"][0]
    assert top_doc["id"] == "doc_err", f"Expected doc_err as top rank, got {top_doc['id']}"
    assert top_doc["rank"] == 1
    assert top_doc["score"] > 0.0, f"Expected positive score for relevant doc, got {top_doc['score']}"

    # Distractor docs should have much lower scores
    for d in data["results"][1:]:
        assert d["score"] < top_doc["score"], f"Distractor score {d['score']} >= top doc {top_doc['score']}"

    print(f"  [PASS] /rerank verified: Top rank = {top_doc['id']} (score: {top_doc['score']:.4f}), latency = {data.get('latency_ms')} ms")


def test_corpus():
    print("[Smoke Test 3] Testing corpus integrity in SQLite...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check baseline table
    cursor.execute("SELECT COUNT(*) FROM material_chunks")
    base_count = cursor.fetchone()[0]
    assert base_count == 23, f"Expected 23 chunks in baseline, found {base_count}"

    # Check EXP-0032 table
    cursor.execute("SELECT embedding_model, COUNT(*), COUNT(DISTINCT id), embedding_dim, LENGTH(embedding) FROM material_chunks_exp0032 GROUP BY embedding_model")
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) >= 1, "No models found in material_chunks_exp0032"

    for r in rows:
        model, count, distinct_ids, dim, blob_len = r
        assert count == 23, f"Expected 23 chunks for {model}, got {count}"
        assert distinct_ids == 23, f"Duplicate IDs detected for {model}: {distinct_ids} distinct out of {count}"
        assert dim == 384, f"Expected 384 dim for {model}, got {dim}"
        assert blob_len == 384 * 4, f"Expected blob length {384 * 4}, got {blob_len}"
        print(f"  [PASS] Model '{model}': 23/23 chunks, 0 duplicates, {dim} dims, {blob_len} bytes")


if __name__ == "__main__":
    print("==================================================")
    print("EXP-0032 SMOKE TEST SUITE")
    print("==================================================")
    test_embed()
    test_rerank()
    test_corpus()
    print("==================================================")
    print("ALL SMOKE TESTS PASSED!")
    print("==================================================")
