"""
EXP-0069 NLI Cross-Encoder Calibrated Adapter
Serves calibrated NLI predictions to RagAmbiguityGuardVerifier via HTTP proxy on port 9998.
Applies strictly out-of-fold calibration transforms based on the active case's fold.
"""

import http.server
import socketserver
import urllib.request
import json
import re
import os
import time
import math
import numpy as np

PORT = 9998
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CONDITION_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0069_active_condition.txt')
ACTIVE_CASE_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0069_active_case.txt')
FOLDS_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0069_folds.json')
FITS_FILE = os.path.join(ROOT_DIR, 'EXP-0069-CALIBRATION-FITS.json')
TRACE_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0069_case_logits_trace.jsonl')
RUNTIME_LOG_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0069_runtime_records.jsonl')

print("[EXP-0069 Adapter] Initializing...")

# Load fold mappings
with open(FOLDS_FILE, 'r', encoding='utf-8') as f:
    case_to_fold = json.load(f)['case_to_fold']
print(f"[EXP-0069 Adapter] Loaded fold assignments for {len(case_to_fold)} cases.")

# Load calibration fits
with open(FITS_FILE, 'r', encoding='utf-8') as f:
    calibration_fits = json.load(f)
print("[EXP-0069 Adapter] Loaded calibration fits for MINILM and DEBERTA.")

# Load pre-computed raw logits lookup table
raw_logits_cache = {}
if os.path.exists(TRACE_FILE):
    with open(TRACE_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            t = json.loads(line)
            key = (t['premise'], t['hypothesis'])
            raw_logits_cache[key] = {
                'MINILM': t['canonical_minilm_logits'],
                'DEBERTA': t['canonical_deberta_logits']
            }
print(f"[EXP-0069 Adapter] Pre-loaded {len(raw_logits_cache)} raw logits pairs for 0ms lookup.")

# On-demand PyTorch model fallback in case an unseen pair occurs
MODELS = {
    'MINILM': {
        'id': 'cross-encoder/nli-MiniLM2-L6-H768',
        'tok': None,
        'mod': None
    },
    'DEBERTA': {
        'id': os.path.expanduser('~/.cache/huggingface/hub/models--MoritzLaurer--DeBERTa-v3-base-mnli-fever-anli/snapshots/6f5cf0a2b59cabb106aca4c287eed12e357e90eb'),
        'tok': None,
        'mod': None
    }
}

def load_pt_model(m_key):
    info = MODELS[m_key]
    if info['mod'] is None:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        print(f"[EXP-0069 Adapter] Loading fallback PyTorch model {m_key}...")
        info['tok'] = AutoTokenizer.from_pretrained(info['id'])
        info['mod'] = AutoModelForSequenceClassification.from_pretrained(info['id'])
        info['mod'].eval()
        print(f"[EXP-0069 Adapter] Fallback model {m_key} loaded.")

def softmax(z):
    z = np.array(z, dtype=np.float64)
    shiftz = z - np.max(z)
    exps = np.exp(shiftz)
    return exps / np.sum(exps)

def get_active_condition():
    if os.path.exists(CONDITION_FILE):
        try:
            with open(CONDITION_FILE, 'r', encoding='utf-8') as f:
                return f.read().strip().upper()
        except Exception:
            pass
    return 'C0'

def get_active_case():
    if os.path.exists(ACTIVE_CASE_FILE):
        try:
            with open(ACTIVE_CASE_FILE, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception:
            pass
    return 'UNKNOWN'

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

class Exp0069ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        clean_path = self.path
        if '://' in clean_path:
            parts = clean_path.split('://', 1)[1].split('/', 1)
            clean_path = '/' + parts[1] if len(parts) > 1 else '/'

        if clean_path in ['/api/version', '/version']:
            resp = json.dumps({'version': 'EXP-0069-CalibratedAdapter-1.0'}).encode()
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
        except Exception:
            self.send_response(502)
            self.end_headers()

    def do_POST(self):
        clean_path = self.path
        if '://' in clean_path:
            parts = clean_path.split('://', 1)[1].split('/', 1)
            clean_path = '/' + parts[1] if len(parts) > 1 else '/'

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)

        try:
            req_data = json.loads(body)
        except Exception:
            self.send_response(400)
            self.end_headers()
            return

        condition = get_active_condition()

        # If C0, forward directly to Ollama
        if condition == 'C0':
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

        # Parse model and method from condition string
        # e.g. MINILM_RAW, MINILM_TEMP, MINILM_BIAS, MINILM_VEC
        #      DEBERTA_RAW, DEBERTA_TEMP, DEBERTA_BIAS, DEBERTA_VEC
        parts = condition.split('_')
        m_key = 'MINILM' if 'MINILM' in parts[0] else 'DEBERTA'
        method = parts[1] if len(parts) > 1 else 'RAW'

        prompt = req_data.get('prompt', '')
        premise, hypothesis = extract_premise_hypothesis(prompt)

        if not premise or not hypothesis:
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

        active_cid = get_active_case()
        fold_id = case_to_fold.get(active_cid, 1)
        fold_name = f'fold_{fold_id}'

        # Get raw canonical logits [0=CONTRADICTION, 1=ENTAILMENT, 2=NEUTRAL]
        key = (premise, hypothesis)
        if key in raw_logits_cache and m_key in raw_logits_cache[key]:
            z = np.array(raw_logits_cache[key][m_key], dtype=np.float64)
        else:
            # Fallback PyTorch inference
            load_pt_model(m_key)
            info = MODELS[m_key]
            import torch
            inputs = info['tok'](premise, hypothesis, return_tensors='pt', truncation=True, max_length=512)
            with torch.no_grad():
                out = info['mod'](**inputs).logits[0]
                if m_key == 'MINILM':
                    z = np.array([float(out[0].item()), float(out[1].item()), float(out[2].item())])
                else:
                    z = np.array([float(out[2].item()), float(out[0].item()), float(out[1].item())])
            if key not in raw_logits_cache:
                raw_logits_cache[key] = {}
            raw_logits_cache[key][m_key] = [float(x) for x in z]

        # Apply fold-specific calibration transform
        fold_fits = calibration_fits['models'][m_key]['folds'][fold_name]

        if method == 'RAW':
            z_cal = z
        elif method == 'TEMP':
            T_val = fold_fits['TEMP']['temperature']
            z_cal = z / T_val
        elif method == 'BIAS':
            b_val = np.array([
                fold_fits['BIAS']['b_contradiction'],
                fold_fits['BIAS']['b_entailment'],
                fold_fits['BIAS']['b_neutral']
            ])
            z_cal = z + b_val
        elif method == 'VEC':
            a_val = np.array([
                fold_fits['VEC']['a_contradiction'],
                fold_fits['VEC']['a_entailment'],
                fold_fits['VEC']['a_neutral']
            ])
            b_val = np.array([
                fold_fits['VEC']['b_contradiction'],
                fold_fits['VEC']['b_entailment'],
                fold_fits['VEC']['b_neutral']
            ])
            z_cal = a_val * z + b_val
        else:
            z_cal = z

        probs = softmax(z_cal)
        pred_idx = int(np.argmax(z_cal))
        labels = ['CONTRADICTION', 'ENTAILMENT', 'NEUTRAL']
        pred_label = labels[pred_idx]
        conf = float(probs[pred_idx])

        # Log runtime record
        cal_record = {
            'timestamp': time.time(),
            'case_id': active_cid,
            'fold': fold_id,
            'condition': condition,
            'model': m_key,
            'method': method,
            'premise': premise,
            'hypothesis': hypothesis,
            'raw_logits': [float(x) for x in z],
            'calibrated_logits': [float(x) for x in z_cal],
            'calibrated_probs': {labels[i]: float(probs[i]) for i in range(3)},
            'predicted_label': pred_label,
            'confidence': conf
        }
        with open(RUNTIME_LOG_FILE, 'a', encoding='utf-8') as rf:
            rf.write(json.dumps(cal_record) + '\n')

        # Send response to RagPremiseVerifier
        inner_resp = {
            'label': pred_label,
            'confidence': round(conf, 4),
            'rationale': f"{condition} {fold_name} calibrated argmax decision"
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
    server = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Exp0069ProxyHandler)
    server.allow_reuse_address = True
    print(f"[EXP-0069 Adapter] Listening on http://127.0.0.1:{PORT} (Proxy mode enabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

if __name__ == '__main__':
    run_server()
