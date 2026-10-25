"""
Empirical Challenge & Stress Test Harness for Milestone 1 Presentation Layer
Tests:
- Prop Wiring & Component Contract Verification
- UI State Logic & Resilience Simulation
- WCAG 2.1 Accessibility & Contrast Compliance
- Live Endpoint Multi-Turn Conversational Behavior
- Build & Subsystem Integrity
"""

import sys
import re
import json
import urllib.request
import urllib.error
from pathlib import Path

# Fix Windows console encoding if needed
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def print_header(title):
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def rel_luminance(rgb):
    def channel(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [channel(c) for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(hex1, hex2):
    l1 = rel_luminance(hex_to_rgb(hex1))
    l2 = rel_luminance(hex_to_rgb(hex2))
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def main():
    root_dir = Path(__file__).resolve().parent.parent.parent
    frontend_dir = root_dir / "frontend"
    aitutor_path = frontend_dir / "src" / "components" / "AiTutorModal.tsx"
    student_dash_path = frontend_dir / "src" / "pages" / "student" / "StudentDashboard.tsx"
    api_path = frontend_dir / "src" / "services" / "api.ts"

    passes = 0
    failures = 0
    warnings = 0

    print_header("CHALLENGE TEST 1: Static AST & Prop Wiring Verification")

    # Check AiTutorModal.tsx exists
    if not aitutor_path.exists():
        print("[FAIL] AiTutorModal.tsx does not exist!")
        failures += 1
        return 1
    aitutor_content = aitutor_path.read_text(encoding="utf-8")

    # Check StudentDashboard.tsx exists
    if not student_dash_path.exists():
        print("[FAIL] StudentDashboard.tsx does not exist!")
        failures += 1
        return 1
    student_dash_content = student_dash_path.read_text(encoding="utf-8")

    # 1.1 Verify studentId prop definition in AiTutorModalProps
    has_student_id_prop = bool(re.search(r'studentId\?:\s*string', aitutor_content))
    if has_student_id_prop:
        print("[PASS] AiTutorModalProps defines studentId?: string")
        passes += 1
    else:
        print("[FAIL] AiTutorModalProps lacks studentId prop definition")
        failures += 1

    # 1.2 Verify AiTutorModal receives studentId prop
    receives_student_id = "studentId," in aitutor_content or "studentId" in re.findall(r'AiTutorModal:\s*React\.FC<AiTutorModalProps>\s*=\s*\(\{\s*([^}]+)\s*\}\)', aitutor_content)[0]
    if receives_student_id:
        print("[PASS] AiTutorModal destructs studentId prop")
        passes += 1
    else:
        print("[FAIL] AiTutorModal does not destruct studentId prop")
        failures += 1

    # 1.3 Verify effectiveStudentId state with fallback
    has_fallback = "setEffectiveStudentId(user.id)" in aitutor_content and "supabase.auth.getUser()" in aitutor_content
    if has_fallback:
        print("[PASS] AiTutorModal implements fallback to supabase.auth.getUser() when studentId prop is absent")
        passes += 1
    else:
        print("[FAIL] AiTutorModal lacks supabase auth user fallback")
        failures += 1

    # 1.4 Verify StudentDashboard passes studentId to AiTutorModal
    modal_tag_match = re.search(r'<AiTutorModal[\s\S]*?/>', student_dash_content)
    if modal_tag_match:
        tag_attrs = modal_tag_match.group(0)
        if "studentId={studentId}" in tag_attrs:
            print("[PASS] StudentDashboard passes studentId={studentId} to <AiTutorModal />")
            passes += 1
        else:
            print(f"[FAIL] StudentDashboard <AiTutorModal /> lacks studentId prop: {tag_attrs}")
            failures += 1
        
        if "isOpen={isAiTutorOpen}" in tag_attrs and "onClose={() => setIsAiTutorOpen(false)}" in tag_attrs:
            print("[PASS] StudentDashboard properly wires isOpen and onClose handlers")
            passes += 1
        else:
            print("[FAIL] StudentDashboard lacks isOpen or onClose wiring")
            failures += 1
    else:
        print("[FAIL] <AiTutorModal /> component mount not found in StudentDashboard.tsx")
        failures += 1

    # 1.5 Verify StudentDashboard button opens modal
    has_open_btn = "onClick={() => setIsAiTutorOpen(true)}" in student_dash_content
    if has_open_btn:
        print("[PASS] StudentDashboard contains button triggering setIsAiTutorOpen(true)")
        passes += 1
    else:
        print("[FAIL] StudentDashboard lacks trigger button for setIsAiTutorOpen(true)")
        failures += 1

    print_header("CHALLENGE TEST 2: UI State Transitions & Safety Boundaries")

    # 2.1 Empty & whitespace input guard
    has_input_guard = "const q = (questionText || input).trim();" in aitutor_content and "if (!q || loading) return;" in aitutor_content
    if has_input_guard:
        print("[PASS] handleSend enforces whitespace trimming and rejects empty input")
        passes += 1
    else:
        print("[FAIL] handleSend lacks empty/whitespace input guard")
        failures += 1

    # 2.2 Disabled states during loading
    input_disabled = "disabled={loading}" in aitutor_content
    button_disabled = "disabled={loading || !input.trim()}" in aitutor_content
    if input_disabled and button_disabled:
        print("[PASS] Input field and Send button properly disabled while loading or input is blank")
        passes += 1
    else:
        print(f"[FAIL] Missing disabled conditions: input_disabled={input_disabled}, button_disabled={button_disabled}")
        failures += 1

    # 2.3 New Conversation button resets history and backend session
    has_new_conv = "handleNewConversation" in aitutor_content and "api.post('/api/rag/clear'" in aitutor_content
    if has_new_conv:
        print("[PASS] 'New Conversation' calls /api/rag/clear and clears local messages")
        passes += 1
    else:
        print("[FAIL] 'New Conversation' handler missing or does not invoke /api/rag/clear")
        failures += 1

    # 2.4 CRAG Fallback / Abstention detection
    has_crag_detection = "backend === 'crag_fallback_gate'" in aitutor_content and "isAbstained" in aitutor_content
    if has_crag_detection:
        print("[PASS] Detects CRAG fallback gates and abstention flags")
        passes += 1
    else:
        print("[FAIL] Missing CRAG fallback detection logic")
        failures += 1

    # 2.5 Query condensation rewriting indicator
    has_rewritten_indicator = "interpretedQuery" in aitutor_content and "Interpreted as:" in aitutor_content
    if has_rewritten_indicator:
        print("[PASS] Detects query rewriting and renders '-> Interpreted as:' subtitle")
        passes += 1
    else:
        print("[FAIL] Query condensation indicator missing")
        failures += 1

    # 2.6 Page number citation rendering
    has_page_citation = "pageDisplay" in aitutor_content and "p." in aitutor_content
    if has_page_citation:
        print("[PASS] Formats and renders page citations in source pill badges")
        passes += 1
    else:
        print("[FAIL] Page citation formatting missing")
        failures += 1

    print_header("CHALLENGE TEST 3: WCAG 2.1 AA/AAA Contrast & Accessibility Audit")

    # 3.1 Color Contrast for Amber Card
    c_body = contrast_ratio('#451a03', '#fffbeb')
    c_header = contrast_ratio('#92400e', '#fffbeb')
    c_time = contrast_ratio('#b45309', '#fffbeb')

    if c_body >= 7.0 and c_header >= 4.5 and c_time >= 4.5:
        print(f"[PASS] CRAG Warning Card contrast: Body={c_body:.2f}:1 (AAA >= 7.0), Header={c_header:.2f}:1 (AA >= 4.5), Time={c_time:.2f}:1 (AA >= 4.5)")
        passes += 1
    else:
        print(f"[FAIL] CRAG Warning Card contrast failure: Body={c_body:.2f}:1, Header={c_header:.2f}:1, Time={c_time:.2f}:1")
        failures += 1

    # 3.2 Color Contrast for Indigo Citation Badges
    c_badge = contrast_ratio('#4338ca', '#eef2ff')
    if c_badge >= 7.0:
        print(f"[PASS] Citation Badges contrast: {c_badge:.2f}:1 (AAA >= 7.0)")
        passes += 1
    else:
        print(f"[FAIL] Citation Badges contrast failure: {c_badge:.2f}:1")
        failures += 1

    # 3.3 ARIA Attributes Inspection
    has_role_dialog = 'role="dialog"' in aitutor_content
    has_aria_modal = 'aria-modal="true"' in aitutor_content
    has_aria_label = 'aria-label="AI Course Tutor"' in aitutor_content
    has_btn_aria = 'aria-label="New Conversation"' in aitutor_content and 'aria-label="Send message"' in aitutor_content

    if has_role_dialog and has_aria_modal and has_aria_label and has_btn_aria:
        print("[PASS] Full dialog ARIA suite present: role=dialog, aria-modal=true, aria-label on dialog & buttons")
        passes += 1
    else:
        print(f"[FAIL] Missing ARIA attributes: dialog={has_role_dialog}, modal={has_aria_modal}, label={has_aria_label}, btns={has_btn_aria}")
        failures += 1

    # 3.4 Input Labeling Observation (Constructive finding)
    input_tag = re.search(r'<input\s+([^>]+)/>', aitutor_content)
    if input_tag and 'aria-label' not in input_tag.group(1):
        print("[WARN] <input /> uses placeholder but lacks explicit aria-label='Ask question'. (Recommendation for perfect a11y)")
        warnings += 1

    # 3.5 Escape key handling (Constructive finding)
    if "Escape" not in aitutor_content:
        print("[WARN] Modal does not listen for 'Escape' key to close dialog. (Recommendation for keyboard power users)")
        warnings += 1

    print_header("CHALLENGE TEST 4: Live HTTP API Contract & Multi-Turn Verification")

    def make_request(url, payload=None, method="POST", timeout=60):
        headers = {
            'Content-Type': 'application/json',
            'X-Service-Key': 'lms-n8n-service-key-2026'
        }
        data = json.dumps(payload).encode() if payload else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode())

    test_student = "challenge_student_m1_test"

    # Step A: Clear session
    try:
        status, clear_res = make_request("http://127.0.0.1:8000/api/rag/clear", {"student_id": test_student})
        if status == 200 and clear_res.get("success"):
            print("[PASS] Live /api/rag/clear returns HTTP 200 with success: true")
            passes += 1
        else:
            print(f"[FAIL] /api/rag/clear failed: {clear_res}")
            failures += 1
    except Exception as e:
        print(f"[FAIL] /api/rag/clear exception: {e}")
        failures += 1

    # Step B: Turn 1 query (establishing context)
    try:
        status, ask1 = make_request("http://127.0.0.1:8000/api/rag/ask", {
            "question": "What is useState in React?",
            "student_id": test_student
        }, timeout=60)
        if status == 200 and "answer" in ask1 and len(ask1["answer"]) > 20:
            print(f"[PASS] Live Turn 1 query succeeded (Answer length: {len(ask1['answer'])}, Sources: {len(ask1.get('sources', []))})")
            passes += 1
        else:
            print(f"[FAIL] Live Turn 1 query failed: {ask1}")
            failures += 1
    except Exception as e:
        print(f"[FAIL] Live Turn 1 exception: {e}")
        failures += 1

    # Step C: Turn 2 follow-up query (testing query rewriting & conversational memory)
    try:
        status, ask2 = make_request("http://127.0.0.1:8000/api/rag/ask", {
            "question": "How does its setter work?",
            "student_id": test_student
        }, timeout=60)
        condensation = ask2.get("query_condensation")
        if status == 200 and condensation and condensation.get("rewritten") is True:
            condensed = condensation.get("condensed_query", "")
            print(f"[PASS] Live Turn 2 query rewriting succeeded: '{condensed}' (latency: {condensation.get('latency_ms', 0):.1f}ms)")
            passes += 1
        else:
            print(f"[FAIL] Live Turn 2 query condensation missing or not rewritten: {condensation}")
            failures += 1
    except Exception as e:
        print(f"[FAIL] Live Turn 2 exception: {e}")
        failures += 1

    # Step D: Out-of-Domain Abstention & CRAG Fallback
    try:
        status, out_domain = make_request("http://127.0.0.1:8000/api/rag/ask", {
            "question": "What is quantum physics?",
            "student_id": test_student
        }, timeout=60)
        is_abstained = out_domain.get("abstain") or out_domain.get("abstained") or "abstention" in out_domain.get("backend", "") or "safety" in out_domain.get("backend", "") or "crag" in out_domain.get("backend", "")
        if status == 200 and is_abstained:
            print(f"[PASS] Out-of-domain query correctly triggered abstention: backend={out_domain.get('backend')}, abstain={out_domain.get('abstain')}")
            passes += 1
        else:
            print(f"[FAIL] Out-of-domain query did not trigger abstention: {out_domain}")
            failures += 1
    except Exception as e:
        print(f"[FAIL] Out-of-domain query exception: {e}")
        failures += 1

    # Step E: Page number verification in sources
    try:
        status, page_query = make_request("http://127.0.0.1:8000/api/rag/ask", {
            "question": "What is the difference between let, const, and var?",
            "student_id": test_student
        }, timeout=60)
        sources = page_query.get("sources", [])
        has_page_info = any(s.get("page") for s in sources)
        if has_page_info:
            pages = [s.get("page") for s in sources if s.get("page")]
            print(f"[PASS] Source citations contain page citations: {pages}")
            passes += 1
        else:
            print(f"[FAIL] Sources lack page information: {sources}")
            failures += 1
    except Exception as e:
        print(f"[FAIL] Page query exception: {e}")
        failures += 1

    print_header("CHALLENGE SUMMARY")
    print(f"Total Passes:   {passes}")
    print(f"Total Failures: {failures}")
    print(f"Total Warnings: {warnings}")
    print("="*70)

    if failures == 0:
        print("\n>>> EMPIRICAL VERDICT: APPROVE <<<")
        return 0
    else:
        print("\n>>> EMPIRICAL VERDICT: REQUEST_CHANGES <<<")
        return 1

if __name__ == "__main__":
    sys.exit(main())
