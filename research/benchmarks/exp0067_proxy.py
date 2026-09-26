"""
EXP-0067 NLI Formulation Interception Proxy
Intercepts calls to Ollama from RagPremiseVerifier and applies candidate Tier-2 decision formulations.
"""
import http.server
import socketserver
import urllib.request
import json
import re
import sys
import os

PORT = 9998
CONDITION_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'scratch', 'exp0067_active_condition.txt')

def get_active_condition():
    if os.path.exists(CONDITION_FILE):
        try:
            with open(CONDITION_FILE, 'r') as f:
                c = f.read().strip().upper()
                if c in ['C0', 'C1', 'C2', 'C3', 'C4']:
                    return c
        except Exception:
            pass
    return 'C0'

def extract_premise_hypothesis(prompt):
    patterns = [
        r'EVIDENCE CONTEXT:\s*\n"([\s\S]*?)"\s*\n\s*\nSTUDENT CLAIM:\s*\n"([\s\S]*?)"',
        r'Curriculum Fact:\s*"([\s\S]*?)"\s*\nStudent Claim:\s*"([\s\S]*?)"',
        r'Premise:\s*"([\s\S]*?)"\s*\nHypothesis:\s*"([\s\S]*?)"',
        r'Curriculum Context:\s*"([\s\S]*?)"\s*\nAssertion:\s*"([\s\S]*?)"'
    ]
    for p in patterns:
        m = re.search(p, prompt)
        if m:
            return m.group(1), m.group(2)
    return None, None

def build_candidate_prompt(premise, hypothesis, condition):
    if condition == 'C1':
        return f"""EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Determine whether the STUDENT CLAIM is ENTAILMENT, CONTRADICTION, or NEUTRAL strictly based on the EVIDENCE CONTEXT.

ANTI-PRESUPPOSITION RULES:
1. Never assume the truth of the student claim or its presuppositions.
2. Topic overlap is not evidence of entailment.
3. A sentence discussing an entity does not establish every property asserted about that entity.
4. The evidence must explicitly support the exact predicate and relationship asserted in the claim.
5. If the evidence discusses the topic but does not explicitly establish the claim, classify as NEUTRAL.
6. If the evidence directly conflicts with or contradicts the claim, classify as CONTRADICTION.
7. If the evidence directly confirms and establishes the claim, classify as ENTAILMENT.

JSON ONLY: {{"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}}"""

    elif condition == 'C2':
        return f"""EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Evaluate the relationship between the STUDENT CLAIM and the EVIDENCE CONTEXT using an explicit contrastive assessment:
- Does the evidence directly support and confirm the claim? -> ENTAILMENT
- Does the evidence directly contradict, conflict with, or refute the claim? -> CONTRADICTION
- Or does the evidence merely discuss the topic or entity without establishing either? -> NEUTRAL

ANTI-PRESUPPOSITION RULES:
1. Never assume the truth of the student claim or its presuppositions.
2. Topic overlap is not evidence of entailment.
3. A sentence discussing an entity does not establish every property asserted about that entity.
4. The evidence must explicitly support the exact predicate/relation in the claim.
5. If the evidence discusses the topic but does not establish the claim, classify as NEUTRAL.
6. If the evidence directly conflicts with the claim, classify as CONTRADICTION.
7. If the evidence directly confirms the claim, classify as ENTAILMENT.

JSON ONLY: {{"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}}"""

    elif condition == 'C3':
        return f"""EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Evaluate the relationship between the STUDENT CLAIM and the EVIDENCE CONTEXT using bidirectional polarity checking.
You must apply the following decision order strictly:

DECISION ORDER:
1. CONFLICT CHECK: Does the evidence establish the opposite predicate, conflict with constraints, or show that the claim is false?
   -> If YES, you must return CONTRADICTION.
2. SUPPORT CHECK: Else, does the evidence directly establish the claimed predicate and confirm the claim is true?
   -> If YES, return ENTAILMENT.
3. ABSENCE OF ESTABLISHMENT: Else (the evidence discusses the topic but neither refutes nor explicitly proves the claim):
   -> Return NEUTRAL.

ANTI-PRESUPPOSITION RULES:
- Never assume the claim is true.
- Topic overlap is not entailment.
- Discussing an entity does not establish every property asserted about that entity.

JSON ONLY: {{"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}}"""

    elif condition == 'C4':
        return f"""EVIDENCE CONTEXT:
"{premise}"

STUDENT CLAIM:
"{hypothesis}"

TASK:
Evaluate the relationship between the STUDENT CLAIM and the EVIDENCE CONTEXT under counterfactual and presupposition stress.

CRITICAL INSTRUCTION:
Do not treat the claim's presupposition or phrasing as evidence.
Conceptually distinguish:
- "Evidence discusses X" vs. "Evidence establishes that X has property Y".
For claims asserting technical properties, relationships, comparisons, defaults, causality, or constraints, require explicit evidence confirming that specific relation.

DECISION ORDER:
1. CONFLICT CHECK: Does the evidence establish an opposite property, alternative default, conflicting behavior, or rule incompatible with the claim?
   -> Return CONTRADICTION.
2. SUPPORT CHECK: Else, does the evidence explicitly establish the exact claimed property or relationship?
   -> Return ENTAILMENT.
3. ABSENCE OF ESTABLISHMENT: Else (evidence merely discusses the entity/topic without proving the asserted property):
   -> Return NEUTRAL.

ANTI-PRESUPPOSITION RULES:
- Never assume the claim's truth or premises.
- Co-occurrence of keywords is not entailment.

JSON ONLY: {{"label":"ENTAILMENT"|"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0,"rationale":"concise reasoning"}}"""

    return None

class Exp0067ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        condition = get_active_condition()
        transformed_body = body

        if condition != 'C0':
            try:
                payload = json.loads(body.decode('utf-8'))
                orig_prompt = payload.get('prompt', '')
                premise, hypothesis = extract_premise_hypothesis(orig_prompt)
                if premise and hypothesis:
                    cand_prompt = build_candidate_prompt(premise, hypothesis, condition)
                    if cand_prompt:
                        payload['prompt'] = cand_prompt
                        transformed_body = json.dumps(payload).encode('utf-8')
            except Exception as e:
                print(f"[Proxy Error] Failed to transform prompt: {e}", file=sys.stderr)

        req = urllib.request.Request(
            'http://127.0.0.1:11434/api/generate',
            data=transformed_body,
            headers={'Content-Type': 'application/json'}
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                
                # Normalize response labels if needed
                try:
                    resp_json = json.loads(resp_body.decode('utf-8'))
                    raw_text = resp_json.get('response', '')
                    inner = json.loads(raw_text)
                    if isinstance(inner, dict) and 'label' in inner:
                        lbl = str(inner['label']).upper().strip()
                        label_map = {
                            'SUPPORTED': 'ENTAILMENT',
                            'REFUTED': 'CONTRADICTION',
                            'NOT_ESTABLISHED': 'NEUTRAL'
                        }
                        if lbl in label_map:
                            inner['label'] = label_map[lbl]
                            resp_json['response'] = json.dumps(inner)
                            resp_body = json.dumps(resp_json).encode('utf-8')
                except Exception:
                    pass

                self.send_response(resp.status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except Exception as e:
            err_resp = json.dumps({
                'response': json.dumps({'label': 'NEUTRAL', 'confidence': 0.0, 'rationale': f'Proxy forward error: {e}'})
            }).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(err_resp)))
            self.end_headers()
            self.wfile.write(err_resp)

    def do_GET(self):
        req = urllib.request.Request(self.path if self.path.startswith('http') else f'http://127.0.0.1:11434{self.path}')
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = resp.read()
            self.send_response(resp.status)
            self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
            self.send_header('Content-Length', str(len(resp_body)))
            self.end_headers()
            self.wfile.write(resp_body)

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    with socketserver.TCPServer(('127.0.0.1', PORT), Exp0067ProxyHandler) as httpd:
        print(f"EXP-0067 Proxy listening on port {PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
