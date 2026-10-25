import sys
import json
import time
import urllib.request
import sqlite3

sys.stdout.reconfigure(encoding='utf-8')

LMS_URL = "http://127.0.0.1:8000/api/rag/ask"
SERVICE_KEY = "lms-n8n-service-key-2026"
VECTORS_DB = r"d:\Collage project\EduConnect-LMS-Experimental\backend\storage\vectors.sqlite"
SESSIONS_DB = r"d:\Collage project\EduConnect-LMS-Experimental\backend\storage\student_sessions.sqlite"

def send_rag(question, student_id=None, history=None):
    payload = {"question": question}
    if student_id:
        payload["student_id"] = student_id
    if history:
        payload["history"] = history
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        LMS_URL,
        data=data,
        headers={"Content-Type": "application/json", "X-Service-Key": SERVICE_KEY}
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        res["elapsed_ms"] = round((time.time() - t0) * 1000, 1)
        return res

def test_r2_vector_index():
    print("\n=======================================================")
    print("  TESTING R2: sqlite-vec ANN Vector Index")
    print("=======================================================")
    conn = sqlite3.connect(VECTORS_DB)
    conn.enable_load_extension(True)
    import os
    dll_path = os.path.abspath(r"scripts\vec0.dll")
    conn.load_extension(dll_path)
    cur = conn.cursor()
    
    # 1. Row counts
    cur.execute("SELECT count(*) FROM material_chunks")
    chunk_count = cur.fetchone()[0]
    print(f"material_chunks row count: {chunk_count}")
    assert chunk_count >= 1323, f"Expected >= 1323 chunks, got {chunk_count}"
    
    # 2. Check material_chunks_vec
    cur.execute("SELECT count(*) FROM material_chunks_vec")
    vec_count = cur.fetchone()[0]
    print(f"material_chunks_vec row count: {vec_count}")
    assert vec_count == chunk_count, f"Vector table count {vec_count} != chunk count {chunk_count}"
    
    conn.close()
    
    # 3. Test live search via API
    res = send_rag("What is the CSS Box Model?", student_id="test_r2_bot")
    print(f"Search response received in {res['elapsed_ms']}ms")
    print(f"Sources count: {len(res.get('sources', []))}")
    assert len(res.get("sources", [])) > 0, "No sources returned"
    print("[PASS] R2: sqlite-vec ANN Vector Index verified!")

def test_r3_conversational_memory():
    print("\n=======================================================")
    print("  TESTING R3: Multi-Turn Conversational Memory")
    print("=======================================================")
    student_id = f"test_student_{int(time.time())}"
    
    # Clean previous session for this student
    if sqlite3.connect(SESSIONS_DB):
        c = sqlite3.connect(SESSIONS_DB)
        c.cursor().execute("DELETE FROM conversation_turns WHERE student_id = ?", (student_id,))
        c.commit()
        c.close()

    # Turn 1
    q1 = "What is useState in React?"
    print(f"\nTurn 1: {q1}")
    res1 = send_rag(q1, student_id=student_id)
    print(f"Answer 1 (preview): {res1['answer'][:120]}... ({res1['elapsed_ms']}ms)")
    assert "state" in res1['answer'].lower() or "hook" in res1['answer'].lower(), "Turn 1 answer does not mention state/hook"
    
    # Turn 2
    q2 = "How does its setter function update state?"
    print(f"\nTurn 2: {q2}")
    res2 = send_rag(q2, student_id=student_id)
    print(f"Answer 2 (preview): {res2['answer'][:120]}... ({res2['elapsed_ms']}ms)")
    cond2 = res2.get("query_condensation")
    print(f"Condensation info: {cond2}")
    assert cond2 and cond2.get("rewritten") is True, "Turn 2 query was not rewritten"
    assert cond2.get("strategy") == "llm_rewrite", f"Expected llm_rewrite, got {cond2.get('strategy')}"
    assert "setter" in res2['answer'].lower() or "state" in res2['answer'].lower() or "update" in res2['answer'].lower(), "Turn 2 answer does not resolve context"
    
    # Turn 3
    q3 = "How does it differ from useRef?"
    print(f"\nTurn 3: {q3}")
    res3 = send_rag(q3, student_id=student_id)
    print(f"Answer 3 (preview): {res3['answer'][:120]}... ({res3['elapsed_ms']}ms)")
    cond3 = res3.get("query_condensation")
    print(f"Condensation info: {cond3}")
    assert cond3 and cond3.get("rewritten") is True, "Turn 3 query was not rewritten"
    assert cond3.get("strategy") == "llm_rewrite", f"Expected llm_rewrite, got {cond3.get('strategy')}"
    assert "useref" in res3['answer'].lower() or "ref" in res3['answer'].lower() or "render" in res3['answer'].lower(), "Turn 3 answer does not resolve context"
    
    # Verify session store persistence
    conn = sqlite3.connect(SESSIONS_DB)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM conversation_turns WHERE student_id = ?", (student_id,))
    turns_count = cur.fetchone()[0]
    print(f"\nPersisted session messages in SQLite: {turns_count} (3 Q + 3 A = 6 messages)")
    assert turns_count == 6, f"Expected 6 messages in session store, got {turns_count}"
    conn.close()
    
    print("[PASS] R3: Multi-Turn Conversational Memory verified!")

def test_r4_hierarchical_chunking():
    print("\n=======================================================")
    print("  TESTING R4: Parent-Child Hierarchical Chunking")
    print("=======================================================")
    conn = sqlite3.connect(VECTORS_DB)
    cur = conn.cursor()
    
    # 1. Parent chunks count
    cur.execute("SELECT count(*) FROM parent_chunks")
    p_count = cur.fetchone()[0]
    print(f"Parent chunks in parent_chunks table: {p_count}")
    assert p_count > 300, f"Expected > 300 parent chunks, got {p_count}"
    
    # 2. Check parent chunk token/char length
    cur.execute("SELECT avg(length(content)) FROM parent_chunks")
    avg_len = cur.fetchone()[0]
    approx_tokens = round(avg_len / 4)
    print(f"Average parent chunk character length: {round(avg_len, 1)} (~{approx_tokens} tokens)")
    assert 600 <= approx_tokens <= 1200, f"Expected ~800-1000 tokens, got ~{approx_tokens}"
    
    # 3. Check child foreign key linkage
    cur.execute("SELECT count(*) FROM material_chunks WHERE parent_chunk_id IS NOT NULL")
    linked_children = cur.fetchone()[0]
    print(f"Child chunks linked with parent_chunk_id: {linked_children}/1323")
    assert linked_children == 1323, f"Expected 1323 linked children, got {linked_children}"
    
    conn.close()
    print("[PASS] R4: Parent-Child Hierarchical Chunking verified!")

def test_r5_crag_fallback():
    print("\n=======================================================")
    print("  TESTING R5: Corrective RAG (CRAG) Fallback Routing")
    print("=======================================================")
    # Query with zero relevance to the LMS materials
    out_of_domain_q = "What is the boiling point of liquid nitrogen in Kelvin?"
    print(f"Sending completely out-of-domain query: {out_of_domain_q}")
    res = send_rag(out_of_domain_q, student_id="test_crag_bot")
    print(f"Response: abstain={res.get('abstain')}, backend={res.get('backend')}")
    print(f"Answer: {res.get('answer')}")
    assert res.get("abstain") is True, f"Expected abstain=True, got {res.get('abstain')}"
    assert "apologize" in res.get("answer", "").lower() or "not have enough" in res.get("answer", "").lower(), "Expected graceful abstention answer"
    assert res.get("backend") == "crag_fallback_gate", f"Expected backend=crag_fallback_gate, got {res.get('backend')}"
    print("[PASS] R5: Corrective RAG (CRAG) Fallback verified!")

def test_interleaved_multi_student_sessions():
    print("\n=======================================================")
    print("  TESTING EDGE CASE: Interleaved Multi-Student Isolation")
    print("=======================================================")
    ts = int(time.time())
    student_a = f"student_alice_{ts}"
    student_b = f"student_bob_{ts}"

    # Student A asks about useState in React
    res_a1 = send_rag("What is useState in React?", student_id=student_a)
    assert "state" in res_a1["answer"].lower() or "hook" in res_a1["answer"].lower()

    # Student B asks about PostgreSQL B-tree index
    res_b1 = send_rag("What is a B-tree index in PostgreSQL?", student_id=student_b)
    assert "index" in res_b1["answer"].lower() or "tree" in res_b1["answer"].lower()

    # Student A follows up with ambiguous pronoun "How does its setter work?"
    res_a2 = send_rag("How does its setter function work?", student_id=student_a)
    cond_a2 = res_a2.get("query_condensation")
    print(f"Student A rewrite: {cond_a2.get('condensed_query') if cond_a2 else 'None'}")
    assert "react" in res_a2["answer"].lower() or "state" in res_a2["answer"].lower() or "setter" in res_a2["answer"].lower()
    assert "postgres" not in res_a2["answer"].lower(), "Cross-student contamination: PostgreSQL found in Student A response"

    # Student B follows up with ambiguous pronoun "What types of queries does it optimize?"
    res_b2 = send_rag("What types of queries does it optimize?", student_id=student_b)
    cond_b2 = res_b2.get("query_condensation")
    print(f"Student B rewrite: {cond_b2.get('condensed_query') if cond_b2 else 'None'}")
    assert "query" in res_b2["answer"].lower() or "index" in res_b2["answer"].lower() or "order" in res_b2["answer"].lower()
    assert "react" not in res_b2["answer"].lower(), "Cross-student contamination: React found in Student B response"

    print("[PASS] Interleaved Multi-Student Isolation verified with zero cross-talk!")

if __name__ == "__main__":
    t_start = time.time()
    test_r2_vector_index()
    test_r3_conversational_memory()
    test_r4_hierarchical_chunking()
    test_r5_crag_fallback()
    test_interleaved_multi_student_sessions()
    total_time = round(time.time() - t_start, 2)
    print(f"\n=======================================================")
    print(f"  ALL TESTS + EDGE CASES VERIFIED IN {total_time}s")
    print("=======================================================")
