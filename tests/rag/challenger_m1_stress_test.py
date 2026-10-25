"""
Empirical Adversarial Stress Test Suite for Milestone 1 (R1)
Targeting FrankenPHP on port 8000:
1. Multi-turn conversation memory & query condensation rewrite
2. Session clearing via /api/rag/clear & state reset verification
3. CRAG fallback & out-of-domain abstention gates
4. Source page citation extraction across textbook corpora
5. Boundary conditions, authentication, and malformed payload injection
"""

import sys
import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://127.0.0.1:8000"
SERVICE_KEY = "lms-n8n-service-key-2026"

def post_json(endpoint: str, payload: dict, headers: dict = None, expected_status: int = 200):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY
    }
    if headers:
        req_headers.update(headers)
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=req_headers, method="POST")
    
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            elapsed = time.time() - t0
            status = resp.getcode()
            body = resp.read().decode("utf-8")
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            return {"status": status, "data": parsed, "elapsed": elapsed, "raw": body}
    except urllib.error.HTTPError as e:
        elapsed = time.time() - t0
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return {"status": e.code, "data": parsed, "elapsed": elapsed, "raw": err_body}
    except Exception as e:
        elapsed = time.time() - t0
        return {"status": 0, "error": str(e), "elapsed": elapsed}

def run_tests():
    results = {"passed": 0, "failed": 0, "details": []}
    
    def record(name: str, passed: bool, notes: str):
        print(f"[{'PASS' if passed else 'FAIL'}] {name}")
        if notes:
            print(f"       -> {notes}")
        results["details"].append({"name": name, "passed": passed, "notes": notes})
        if passed:
            results["passed"] += 1
        else:
            results["failed"] += 1

    print("=" * 75)
    print("  EMPIRICAL CHALLENGER: MILESTONE 1 ADVERSARIAL STRESS TEST SUITE")
    print("=" * 75)
    
    test_student = "challenger_student_adv_999"

    # -------------------------------------------------------------
    # SUITE 1: Multi-turn Conversation Memory & Query Condensation
    # -------------------------------------------------------------
    print("\n--- SUITE 1: Multi-Turn Conversation Memory & Query Rewrite ---")
    
    # 1.0 Clean initial state
    res_clear = post_json("/api/rag/clear", {"student_id": test_student})
    record("Initial Session Clear", res_clear.get("status") == 200, f"Status: {res_clear.get('status')}")

    # 1.1 Turn 1: Primary anchor question
    t1_q = "What is useState in React and what does it return?"
    res_t1 = post_json("/api/rag/ask", {
        "question": t1_q,
        "student_id": test_student
    })
    t1_data = res_t1.get("data", {})
    t1_qc = t1_data.get("query_condensation")
    t1_passed = (res_t1.get("status") == 200 and 
                 bool(t1_data.get("answer")) and 
                 t1_qc is None)
    record("Turn 1 (Anchor Question): No condensation on turn 1", t1_passed, 
           f"Answer length: {len(t1_data.get('answer', ''))}, QC: {t1_qc}")

    # 1.2 Turn 2: Anaphoric follow-up question ("its setter")
    t2_q = "How does its setter work?"
    res_t2 = post_json("/api/rag/ask", {
        "question": t2_q,
        "student_id": test_student
    })
    t2_data = res_t2.get("data", {})
    t2_qc = t2_data.get("query_condensation") or {}
    t2_rewritten = t2_qc.get("rewritten") is True
    t2_condensed = t2_qc.get("condensed_query", "")
    t2_has_context = any(w in t2_condensed.lower() for w in ["usestate", "state", "react"])
    t2_passed = (res_t2.get("status") == 200 and t2_rewritten and t2_has_context)
    record("Turn 2 (Anaphoric Follow-Up): Query condensation rewrite", t2_passed,
           f"Rewritten: {t2_rewritten}, Condensed: '{t2_condensed}' (latency: {t2_qc.get('latency_ms')}ms)")

    # 1.3 Turn 3: Second follow-up question
    t3_q = "Can you pass an updater function to it?"
    res_t3 = post_json("/api/rag/ask", {
        "question": t3_q,
        "student_id": test_student
    })
    t3_data = res_t3.get("data", {})
    t3_qc = t3_data.get("query_condensation") or {}
    t3_rewritten = t3_qc.get("rewritten") is True
    t3_condensed = t3_qc.get("condensed_query", "")
    t3_passed = (res_t3.get("status") == 200 and t3_rewritten and bool(t3_condensed))
    record("Turn 3 (Chained Follow-Up): Multi-turn contextual continuity", t3_passed,
           f"Rewritten: {t3_rewritten}, Condensed: '{t3_condensed}'")

    # -------------------------------------------------------------
    # SUITE 2: Session Clearing via /api/rag/clear
    # -------------------------------------------------------------
    print("\n--- SUITE 2: Session Clearing via /api/rag/clear ---")
    
    # 2.1 Call clear
    res_clear2 = post_json("/api/rag/clear", {"student_id": test_student})
    clear2_success = (res_clear2.get("status") == 200 and 
                      res_clear2.get("data", {}).get("success") is True)
    record("Session Clear Endpoint Returns Success", clear2_success,
           f"Body: {res_clear2.get('data')}")

    # 2.2 Repeat Turn 2 follow-up - query condensation MUST NOT fire because history was erased
    res_post_clear = post_json("/api/rag/ask", {
        "question": "How does its setter work?",
        "student_id": test_student
    })
    pc_data = res_post_clear.get("data", {})
    pc_qc = pc_data.get("query_condensation")
    pc_passed = (res_post_clear.get("status") == 200 and 
                 (pc_qc is None or pc_qc.get("rewritten") is False))
    record("Post-Clear Query Isolation: No memory leakage after clear", pc_passed,
           f"QC after clear: {pc_qc}")

    # -------------------------------------------------------------
    # SUITE 3: Out-of-Domain Abstention & CRAG Fallback Gates
    # -------------------------------------------------------------
    print("\n--- SUITE 3: Out-of-Domain Abstention & CRAG Fallback ---")
    
    # 3.1 Quantum physics out-of-domain query
    res_ood1 = post_json("/api/rag/ask", {"question": "What is quantum physics and wave-particle duality?"})
    ood1_data = res_ood1.get("data", {})
    is_abstained_1 = (ood1_data.get("abstain") is True or 
                      ood1_data.get("abstained") is True or 
                      ood1_data.get("backend") in ["safety_boundary_gate", "crag_fallback_gate", "calibrated_abstention_gate"])
    record("Out-of-Domain 1 (Quantum Physics): Abstention triggered", is_abstained_1,
           f"Abstain: {ood1_data.get('abstain')}, Backend: {ood1_data.get('backend')}")

    # 3.2 Non-academic recipe query
    res_ood2 = post_json("/api/rag/ask", {"question": "How do I bake a chocolate cake with fudge frosting?"})
    ood2_data = res_ood2.get("data", {})
    is_abstained_2 = (ood2_data.get("abstain") is True or 
                      ood2_data.get("abstained") is True or 
                      ood2_data.get("backend") in ["safety_boundary_gate", "crag_fallback_gate", "calibrated_abstention_gate"])
    record("Out-of-Domain 2 (Bake Recipe): Abstention triggered", is_abstained_2,
           f"Abstain: {ood2_data.get('abstain')}, Backend: {ood2_data.get('backend')}")

    # 3.3 Out-of-domain car mechanic query
    res_ood3 = post_json("/api/rag/ask", {"question": "How do I replace the alternator in a Toyota Corolla?"})
    ood3_data = res_ood3.get("data", {})
    is_abstained_3 = (ood3_data.get("abstain") is True or 
                      ood3_data.get("abstained") is True or 
                      ood3_data.get("backend") in ["safety_boundary_gate", "crag_fallback_gate", "calibrated_abstention_gate"])
    record("Out-of-Domain 3 (Automotive Repair): Abstention triggered", is_abstained_3,
           f"Abstain: {ood3_data.get('abstain')}, Backend: {ood3_data.get('backend')}")

    # -------------------------------------------------------------
    # SUITE 4: Source Page Citations Verification
    # -------------------------------------------------------------
    print("\n--- SUITE 4: Source Page Citations Verification ---")
    
    # 4.1 JavaScript textbook query
    res_cite_js = post_json("/api/rag/ask", {"question": "What is the difference between let, const, and var in JavaScript?"})
    sources_js = res_cite_js.get("data", {}).get("sources", [])
    pages_js = [s.get("page") for s in sources_js if s.get("page")]
    js_has_pages = len(pages_js) > 0
    record("Page Citations in JavaScript Query (Eloquent JS)", js_has_pages,
           f"Total sources: {len(sources_js)}, Page citations found: {pages_js}")

    # 4.2 Python textbook query
    res_cite_py = post_json("/api/rag/ask", {"question": "How do dictionaries and key-value pairs work in Python?"})
    sources_py = res_cite_py.get("data", {}).get("sources", [])
    pages_py = [s.get("page") for s in sources_py if s.get("page")]
    py_has_pages = len(pages_py) > 0
    record("Page Citations in Python Query (Think Python)", py_has_pages,
           f"Total sources: {len(sources_py)}, Page citations found: {pages_py}")

    # 4.3 Git textbook query
    res_cite_git = post_json("/api/rag/ask", {"question": "How does git rebase work compared to git merge?"})
    sources_git = res_cite_git.get("data", {}).get("sources", [])
    pages_git = [s.get("page") for s in sources_git if s.get("page")]
    git_has_pages = len(pages_git) > 0
    record("Page Citations in Git Query (Pro Git)", git_has_pages,
           f"Total sources: {len(sources_git)}, Page citations found: {pages_git}")

    # Verify citation formats (e.g. "p. 26", "pp. 12-14")
    all_pages = pages_js + pages_py + pages_git
    import re
    page_format_regex = re.compile(r"^pp?\. \d+(-\d+)?$")
    valid_format = all(page_format_regex.match(str(p)) for p in all_pages) if all_pages else False
    record("Page Citation Formatting Syntax ('p. X' or 'pp. X-Y')", valid_format,
           f"Sample citations verified: {all_pages[:5]}")

    # -------------------------------------------------------------
    # SUITE 5: Boundary Conditions, Auth, & Robustness
    # -------------------------------------------------------------
    print("\n--- SUITE 5: Boundary Conditions, Auth, & Malformed Payloads ---")
    
    # 5.1 /api/rag/clear with missing student_id
    res_clear_missing = post_json("/api/rag/clear", {})
    record("/api/rag/clear missing student_id returns 400 Bad Request", 
           res_clear_missing.get("status") == 400,
           f"Status: {res_clear_missing.get('status')}, Data: {res_clear_missing.get('data')}")

    # 5.2 /api/rag/clear with empty student_id string
    res_clear_empty = post_json("/api/rag/clear", {"student_id": ""})
    record("/api/rag/clear empty student_id returns 400 Bad Request",
           res_clear_empty.get("status") == 400,
           f"Status: {res_clear_empty.get('status')}")

    # 5.3 /api/rag/clear without auth headers
    url_clear = f"{BASE_URL}/api/rag/clear"
    req_no_auth = urllib.request.Request(
        url_clear, 
        data=json.dumps({"student_id": "anon"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_no_auth, timeout=10) as resp:
            status_no_auth = resp.getcode()
    except urllib.error.HTTPError as e:
        status_no_auth = e.code
    except Exception as e:
        status_no_auth = 0
    record("/api/rag/clear without X-Service-Key/Auth header is rejected (401)",
           status_no_auth == 401,
           f"Status: {status_no_auth}")

    # 5.4 /api/rag/ask with empty question string
    res_ask_empty = post_json("/api/rag/ask", {"question": ""})
    # Empty question should not cause a 500 fatal crash
    record("/api/rag/ask with empty question handles gracefully (no 500 crash)",
           res_ask_empty.get("status") in [200, 400],
           f"Status: {res_ask_empty.get('status')}")

    # 5.5 /api/rag/ask with XSS payload and unicode emojis
    xss_q = "What is a React portal? <script>alert('xss')</script> 🚀✨"
    res_xss = post_json("/api/rag/ask", {"question": xss_q})
    record("/api/rag/ask with HTML/XSS & emoji payload handles safely",
           res_xss.get("status") == 200 and bool(res_xss.get("data", {}).get("answer")),
           f"Status: {res_xss.get('status')}, Answer length: {len(res_xss.get('data', {}).get('answer', ''))}")

    # 5.6 /api/rag/ask with null student_id
    res_null_student = post_json("/api/rag/ask", {"question": "What is flexbox in CSS?", "student_id": None})
    record("/api/rag/ask with null student_id succeeds without crash",
           res_null_student.get("status") == 200,
           f"Status: {res_null_student.get('status')}")

    print("\n" + "=" * 75)
    print(f"STRESS TEST SUMMARY: {results['passed']} PASSED, {results['failed']} FAILED")
    print("=" * 75)

    return results

if __name__ == "__main__":
    res = run_tests()
    if res["failed"] > 0:
        sys.exit(1)
    sys.exit(0)
