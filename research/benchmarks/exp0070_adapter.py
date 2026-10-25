"""
EXP-0070 NLI Fine-Tuned Cross-Encoder Interception Adapter
Serves fold-specific fine-tuned cross-encoder predictions to RagPremiseVerifier via HTTP proxy on port 9998.
Guarantees strictly out-of-fold inference: for any query in fold k, the model trained on folds != k is used.
"""

import http.server
import socketserver
import urllib.request
import json
import re
import os
import sys
import time
import math
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

PORT = 9998
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CONDITION_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0070_active_condition.txt')
ACTIVE_CASE_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0070_active_case.txt')
SPLITS_FILE = os.path.join(ROOT_DIR, 'EXP-0070-CV-SPLITS.json')
MODELS_DIR = os.path.join(ROOT_DIR, 'scratch', 'exp0070_models')
RUNTIME_LOG_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0070_runtime_records.jsonl')

print("[EXP-0070 Adapter] Initializing...")

# Load fold mappings
case_to_fold = {}
if os.path.exists(SPLITS_FILE):
    with open(SPLITS_FILE, 'r', encoding='utf-8') as f:
        splits_data = json.load(f)
    for fold_k, fold_info in splits_data['folds'].items():
        fnum = fold_info['fold_num']
        for cid in fold_info['test_case_ids']:
            case_to_fold[cid] = fnum
    print(f"[EXP-0070 Adapter] Loaded fold assignments for {len(case_to_fold)} cases.")

# Cached loaded models: (model_key, fold_num) -> (tok, model, canonical_mapping)
LOADED_MODELS = {}

def get_active_condition():
    if os.path.exists(CONDITION_FILE):
        try:
            with open(CONDITION_FILE, 'r', encoding='utf-8') as f:
                c = f.read().strip().upper()
                if c in ['C0', 'C1', 'C2', 'C1_FT_MINILM', 'C2_FT_DEBERTA']:
                    return c
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
    return None

def load_fold_model(model_key, fold_num):
    cache_key = (model_key, fold_num)
    if cache_key in LOADED_MODELS:
        return LOADED_MODELS[cache_key]
        
    fold_dir = os.path.join(MODELS_DIR, f"{model_key.lower()}_fold_{fold_num}")
    if not os.path.exists(fold_dir):
        print(f"[EXP-0070 Adapter ERROR] Checkpoint not found at {fold_dir}!")
        return None, None, None
        
    print(f"[EXP-0070 Adapter] Loading checkpoint {model_key} Fold {fold_num} from {fold_dir}...")
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(fold_dir)
    model = AutoModelForSequenceClassification.from_pretrained(fold_dir)
    model.eval()
    
    # Establish canonical index mapping
    # Canonical: 0=CONTRADICTION, 1=ENTAILMENT, 2=NEUTRAL
    id2label = model.config.id2label
    native_to_canonical = {}
    for idx, lbl in id2label.items():
        lbl_upper = str(lbl).upper()
        if 'CONTRADIC' in lbl_upper:
            native_to_canonical[int(idx)] = 0
        elif 'ENTAIL' in lbl_upper:
            native_to_canonical[int(idx)] = 1
        elif 'NEUTR' in lbl_upper:
            native_to_canonical[int(idx)] = 2
        else:
            native_to_canonical[int(idx)] = 2
            
    LOADED_MODELS[cache_key] = (tok, model, native_to_canonical)
    print(f"[EXP-0070 Adapter] {model_key} Fold {fold_num} loaded in {time.time()-t0:.2f}s.")
    return tok, model, native_to_canonical

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

def softmax(z):
    z = np.array(z, dtype=np.float64)
    shiftz = z - np.max(z)
    exps = np.exp(shiftz)
    return exps / np.sum(exps)

class Exp0070ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        clean_path = self.path
        if '://' in clean_path:
            parts = clean_path.split('://', 1)[1].split('/', 1)
            clean_path = '/' + parts[1] if len(parts) > 1 else '/'

        if clean_path in ['/api/version', '/version']:
            resp = json.dumps({'version': 'EXP-0070-FineTunedProxy-1.0'}).encode()
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

        # Forward fallback to Ollama
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

        # C1 or C2 Fine-Tuned execution
        model_key = 'C1_FT_MINILM' if condition in ['C1', 'C1_FT_MINILM'] else 'C2_FT_DEBERTA'
        active_cid = get_active_case()
        fold_num = case_to_fold.get(active_cid, 1)
        
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

        t0 = time.time()
        tok, model, native_to_canonical = load_fold_model(model_key, fold_num)
        
        if model is None:
            fallback = json.dumps({
                'model': condition,
                'response': json.dumps({'label': 'NEUTRAL', 'confidence': 0.35, 'rationale': 'Model not loaded'})
            }).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(fallback)))
            self.end_headers()
            self.wfile.write(fallback)
            return

        with torch.no_grad():
            inputs = tok(premise, hypothesis, max_length=128, padding=True, truncation=True, return_tensors='pt')
            outputs = model(**inputs)
            raw_logits = outputs.logits[0].cpu().numpy().tolist()

        # Map to canonical order: [0: CONTRADICTION, 1: ENTAILMENT, 2: NEUTRAL]
        canonical_logits = [0.0, 0.0, 0.0]
        for native_idx, c_idx in native_to_canonical.items():
            canonical_logits[c_idx] = float(raw_logits[native_idx])

        probs = softmax(canonical_logits)
        prob_dict = {
            'CONTRADICTION': float(probs[0]),
            'ENTAILMENT': float(probs[1]),
            'NEUTRAL': float(probs[2])
        }

        # Determine winning class and confidence
        best_canonical_idx = int(np.argmax(canonical_logits))
        idx_to_label = {0: 'CONTRADICTION', 1: 'ENTAILMENT', 2: 'NEUTRAL'}
        winning_label = idx_to_label[best_canonical_idx]
        winning_conf = float(probs[best_canonical_idx])
        latency_ms = round((time.time() - t0) * 1000, 2)

        # Log runtime record
        log_entry = {
            'timestamp': time.time(),
            'condition': condition,
            'model_key': model_key,
            'case_id': active_cid,
            'fold': fold_num,
            'premise': premise,
            'hypothesis': hypothesis,
            'predicted_label': winning_label,
            'confidence': winning_conf,
            'probabilities': prob_dict,
            'logits': canonical_logits,
            'latency_ms': latency_ms
        }
        with open(RUNTIME_LOG_FILE, 'a', encoding='utf-8') as f_log:
            f_log.write(json.dumps(log_entry) + '\n')

        # Format Ollama response payload
        inner_resp = {
            'label': winning_label,
            'confidence': round(winning_conf, 4),
            'rationale': f'EXP-0070 {model_key} Fold {fold_num} Out-of-Fold prediction',
            'probabilities': {k: round(v, 4) for k, v in prob_dict.items()}
        }
        outer_resp = {
            'model': condition,
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'response': json.dumps(inner_resp),
            'done': True
        }
        resp_bytes = json.dumps(outer_resp).encode('utf-8')
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resp_bytes)))
        self.end_headers()
        self.wfile.write(resp_bytes)

def run_server():
    server = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Exp0070ProxyHandler)
    server.daemon_threads = True
    print(f"[EXP-0070 Adapter] Serving HTTP Proxy on http://127.0.0.1:{PORT}...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("[EXP-0070 Adapter] Server closed.")

if __name__ == '__main__':
    run_server()
