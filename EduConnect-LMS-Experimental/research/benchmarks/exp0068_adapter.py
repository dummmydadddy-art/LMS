"""
EXP-0068 NLI Cross-Encoder Interception Adapter
Intercepts Ollama requests from RagPremiseVerifier and applies dedicated sequence-classification cross-encoders (C1, C2)
or forwards to Ollama (C0).
"""
import http.server
import socketserver
import urllib.request
import json
import re
import sys
import os
import time
import math
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

PORT = 9998
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONDITION_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0068_active_condition.txt')
CALIBRATION_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0068_calibration_records.jsonl')

MODELS = {
    'C1': {
        'id': 'cross-encoder/nli-MiniLM2-L6-H768',
        'tokenizer': None,
        'model': None,
        'id2label': None,
        'norm_map': None
    },
    'C2': {
        'id': os.path.expanduser('~/.cache/huggingface/hub/models--MoritzLaurer--DeBERTa-v3-base-mnli-fever-anli/snapshots/6f5cf0a2b59cabb106aca4c287eed12e357e90eb'),
        'tokenizer': None,
        'model': None,
        'id2label': None,
        'norm_map': None
    }
}

def get_active_condition():
    if os.path.exists(CONDITION_FILE):
        try:
            with open(CONDITION_FILE, 'r') as f:
                c = f.read().strip().upper()
                if c in ['C0', 'C1', 'C2']:
                    return c
        except Exception:
            pass
    return 'C0'

def load_candidate_model(cond):
    info = MODELS.get(cond)
    if not info or info['model'] is not None:
        return
    model_path = info['id']
    print(f"[Adapter] Loading {cond} model from: {model_path}...")
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(model_path)
    mod = AutoModelForSequenceClassification.from_pretrained(model_path)
    mod.eval()
    
    id2label = mod.config.id2label
    norm_map = {}
    for idx, lbl in id2label.items():
        lbl_upper = str(lbl).upper()
        if 'ENTAIL' in lbl_upper:
            norm_map[int(idx)] = 'ENTAILMENT'
        elif 'CONTRADIC' in lbl_upper:
            norm_map[int(idx)] = 'CONTRADICTION'
        elif 'NEUTR' in lbl_upper:
            norm_map[int(idx)] = 'NEUTRAL'
        else:
            norm_map[int(idx)] = lbl_upper
            
    info['tokenizer'] = tok
    info['model'] = mod
    info['id2label'] = id2label
    info['norm_map'] = norm_map
    elapsed = time.time() - t0
    params = sum(p.numel() for p in mod.parameters())
    print(f"[Adapter] {cond} loaded successfully in {elapsed:.2f}s! ({params:,} params)")
    print(f"[Adapter] {cond} id2label: {id2label} -> norm_map: {norm_map}")

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

class NliProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress noisy standard HTTP logs
        return

    def do_GET(self):
        clean_path = self.path
        if '://' in clean_path:
            parts = clean_path.split('://', 1)[1].split('/', 1)
            clean_path = '/' + parts[1] if len(parts) > 1 else '/'

        if clean_path in ['/api/version', '/version']:
            resp = json.dumps({'version': 'EXP-0068-CrossEncoderProxy-1.0'}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
            return
        elif clean_path in ['/api/health', '/health']:
            cond = get_active_condition()
            resp = json.dumps({'status': 'OK', 'active_condition': cond}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
            return

        # Fallback forward to Ollama
        try:
            req = urllib.request.Request(self.path if self.path.startswith('http') else f'http://127.0.0.1:11434{clean_path}')
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except Exception as e:
            self.send_response(502)
            self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        
        clean_path = self.path
        if '://' in clean_path:
            parts = clean_path.split('://', 1)[1].split('/', 1)
            clean_path = '/' + parts[1] if len(parts) > 1 else '/'
            
        try:
            req_data = json.loads(body)
        except Exception:
            self.send_response(400)
            self.end_headers()
            return
            
        condition = get_active_condition()
        
        if condition == 'C0':
            # Forward directly to Ollama
            ollama_req = urllib.request.Request(
                'http://127.0.0.1:11434' + clean_path,
                data=body,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            try:
                with urllib.request.urlopen(ollama_req, timeout=45) as resp:
                    resp_body = resp.read()
                    self.send_response(resp.status)
                    for k, v in resp.headers.items():
                        if k.lower() not in ['content-length', 'transfer-encoding']:
                            self.send_header(k, v)
                    self.send_header('Content-Length', str(len(resp_body)))
                    self.end_headers()
                    self.wfile.write(resp_body)
                    return
            except Exception as e:
                err_resp = json.dumps({'error': str(e)}).encode()
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_resp)))
                self.end_headers()
                self.wfile.write(err_resp)
                return

        # C1 or C2 Cross-Encoder execution
        prompt = req_data.get('prompt', '')
        premise, hypothesis = extract_premise_hypothesis(prompt)
        
        if not premise or not hypothesis:
            print(f"[Adapter WARNING] Could not extract premise/hypothesis from prompt: {prompt[:100]}...")
            fallback = json.dumps({
                'model': condition,
                'response': json.dumps({'label': 'NEUTRAL', 'confidence': 0.35, 'rationale': 'Extraction failed'})
            }).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(fallback)))
            self.end_headers()
            self.wfile.write(fallback)
            return

        load_candidate_model(condition)
        info = MODELS[condition]
        tok = info['tokenizer']
        mod = info['model']
        norm_map = info['norm_map']

        t0 = time.perf_counter()
        inputs = tok(premise, hypothesis, return_tensors='pt', truncation=True, max_length=512)
        with torch.no_grad():
            outputs = mod(**inputs)
            logits = outputs.logits[0]
            probs = torch.softmax(logits, dim=-1)
            pred_idx = torch.argmax(probs).item()
            pred_label = norm_map.get(pred_idx, 'NEUTRAL')
            conf = probs[pred_idx].item()
        latency_ms = (time.perf_counter() - t0) * 1000

        # Probabilities breakdown
        class_probs = {}
        for idx_i, prob_i in enumerate(probs):
            name = norm_map.get(idx_i, str(idx_i))
            class_probs[name] = float(prob_i.item())

        sorted_probs = sorted(class_probs.values(), reverse=True)
        margin = (sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else sorted_probs[0]
        entropy = -sum(p * math.log(max(p, 1e-12)) for p in sorted_probs)

        # Log calibration record
        cal_record = {
            'timestamp': time.time(),
            'condition': condition,
            'premise': premise,
            'hypothesis': hypothesis,
            'predicted_label': pred_label,
            'confidence': conf,
            'margin': margin,
            'entropy': entropy,
            'probabilities': class_probs,
            'logits': [float(x.item()) for x in logits],
            'latency_ms': latency_ms
        }
        with open(CALIBRATION_FILE, 'a', encoding='utf-8') as cf:
            cf.write(json.dumps(cal_record) + '\n')

        # Send response to PHP RagPremiseVerifier
        inner_resp = {
            'label': pred_label,
            'confidence': round(conf, 4),
            'rationale': f"{condition} cross-encoder argmax decision"
        }
        outer_resp = {
            'model': condition,
            'response': json.dumps(inner_resp)
        }
        resp_bytes = json.dumps(outer_resp).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resp_bytes)))
        self.end_headers()
        self.wfile.write(resp_bytes)

def run_server():
    server = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), NliProxyHandler)
    server.allow_reuse_address = True
    print(f"[EXP-0068 Adapter] Listening on http://127.0.0.1:{PORT} (Proxy mode enabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[EXP-0068 Adapter] Stopping server.")
        server.server_close()

if __name__ == '__main__':
    run_server()
