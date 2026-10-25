"""
EXP-0070 Domain-Specific NLI Cross-Encoder Trainer
Implements strict 5-fold stratified cross-validation fine-tuning for:
- C1: cross-encoder/nli-MiniLM2-L6-H768
- C2: MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli
"""

import os
import sys
import json
import time
import math
import hashlib
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_PATH = os.path.join(ROOT_DIR, 'EXP-0070-TRAINING-DATASET.json')
SPLITS_PATH = os.path.join(ROOT_DIR, 'EXP-0070-CV-SPLITS.json')
MODELS_DIR = os.path.join(ROOT_DIR, 'scratch', 'exp0070_models')
TRAINING_LOG_PATH = os.path.join(ROOT_DIR, 'EXP-0070-TRAINING-LOG.json')

os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_CONFIGS = {
    'C1_FT_MINILM': {
        'model_id': 'cross-encoder/nli-MiniLM2-L6-H768',
        'batch_size': 16,
        'grad_accum': 1,
        'lr': 2e-5,
        'epochs': 3,
        'weight_decay': 0.01,
        'max_len': 128,
        # Native mapping: 0=contradiction, 1=entailment, 2=neutral
        'label_map': {'CONTRADICTION': 0, 'ENTAILMENT': 1, 'NEUTRAL': 2}
    },
    'C2_FT_DEBERTA': {
        'model_id': os.path.expanduser('~/.cache/huggingface/hub/models--MoritzLaurer--DeBERTa-v3-base-mnli-fever-anli/snapshots/6f5cf0a2b59cabb106aca4c287eed12e357e90eb'),
        'batch_size': 16,
        'grad_accum': 1,
        'lr': 2e-5,
        'epochs': 3,
        'weight_decay': 0.01,
        'max_len': 128,
        # Native mapping: 0=entailment, 1=neutral, 2=contradiction
        'label_map': {'ENTAILMENT': 0, 'NEUTRAL': 1, 'CONTRADICTION': 2}
    }
}

class EducationalNliDataset(Dataset):
    def __init__(self, pairs, label_map):
        self.pairs = pairs
        self.label_map = label_map
        
    def __len__(self):
        return len(self.pairs)
        
    def __getitem__(self, idx):
        item = self.pairs[idx]
        return item['premise'], item['hypothesis'], self.label_map[item['gold_nli_label']]

def make_collate_fn(tokenizer, max_len):
    def collate_fn(batch):
        premises = [b[0] for b in batch]
        hypotheses = [b[1] for b in batch]
        labels = torch.tensor([b[2] for b in batch], dtype=torch.long)
        enc = tokenizer(premises, hypotheses, max_length=max_len, padding=True, truncation=True, return_tensors='pt')
        enc['labels'] = labels
        return enc
    return collate_fn

def compute_file_sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(8192 * 1024):
            h.update(chunk)
    return h.hexdigest()

def train_model_fold(model_key, fold_num, seed=42):
    cfg = MODEL_CONFIGS[model_key]
    torch.manual_seed(seed)
    
    print(f"\n=======================================================")
    print(f"TRAINING {model_key} | FOLD {fold_num} | SEED {seed}")
    print(f"=======================================================")
    
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        all_pairs = json.load(f)
        
    train_pairs = [p for p in all_pairs if p['training_eligible'] and p['fold'] != fold_num]
    val_pairs = [p for p in all_pairs if p['training_eligible'] and p['fold'] == fold_num]
    
    print(f"Dataset: {len(train_pairs)} training pairs, {len(val_pairs)} held-out validation pairs.")
    
    tok = AutoTokenizer.from_pretrained(cfg['model_id'])
    collate = make_collate_fn(tok, cfg['max_len'])
    
    train_loader = DataLoader(
        EducationalNliDataset(train_pairs, cfg['label_map']),
        batch_size=cfg['batch_size'],
        shuffle=True,
        collate_fn=collate
    )
    val_loader = DataLoader(
        EducationalNliDataset(val_pairs, cfg['label_map']),
        batch_size=cfg['batch_size'],
        shuffle=False,
        collate_fn=collate
    )
    
    model = AutoModelForSequenceClassification.from_pretrained(cfg['model_id'])
    model.train()
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg['lr'], weight_decay=cfg['weight_decay'])
    total_steps = len(train_loader) * cfg['epochs']
    warmup_steps = int(total_steps * 0.10)
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=warmup_steps, num_training_steps=total_steps)
    
    fold_dir = os.path.join(MODELS_DIR, f"{model_key.lower()}_fold_{fold_num}")
    os.makedirs(fold_dir, exist_ok=True)
    
    epoch_logs = []
    best_val_loss = float('inf')
    best_epoch = 1
    t0 = time.time()
    
    for epoch in range(1, cfg['epochs'] + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for step, batch in enumerate(train_loader, 1):
            optimizer.zero_grad()
            out = model(**batch)
            loss = out.loss
            loss.backward()
            optimizer.step()
            scheduler.step()
            
            n = len(batch['labels'])
            train_loss += loss.item() * n
            preds = out.logits.argmax(dim=-1)
            train_correct += (preds == batch['labels']).sum().item()
            train_total += n
            
        train_loss /= train_total
        train_acc = train_correct / train_total
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for batch in val_loader:
                out = model(**batch)
                n = len(batch['labels'])
                val_loss += out.loss.item() * n
                preds = out.logits.argmax(dim=-1)
                val_correct += (preds == batch['labels']).sum().item()
                val_total += n
                
        val_loss /= val_total
        val_acc = val_correct / val_total
        
        epoch_info = {
            'epoch': epoch,
            'train_loss': round(train_loss, 4),
            'train_accuracy': round(train_acc * 100, 2),
            'val_loss': round(val_loss, 4),
            'val_accuracy': round(val_acc * 100, 2)
        }
        epoch_logs.append(epoch_info)
        print(f"Epoch {epoch}/{cfg['epochs']}: Train Loss {train_loss:.4f} Acc {train_acc*100:.2f}% | Val Loss {val_loss:.4f} Acc {val_acc*100:.2f}%")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            # Save checkpoint
            model.save_pretrained(fold_dir)
            tok.save_pretrained(fold_dir)
            
    total_time = round(time.time() - t0, 2)
    print(f"[Done] {model_key} Fold {fold_num} completed in {total_time}s. Best epoch: {best_epoch} (Val Loss {best_val_loss:.4f})")
    
    # Check weights hash
    weights_path = os.path.join(fold_dir, 'model.safetensors')
    if not os.path.exists(weights_path):
        weights_path = os.path.join(fold_dir, 'pytorch_model.bin')
    weights_sha = compute_file_sha256(weights_path) if os.path.exists(weights_path) else 'UNKNOWN'
    
    return {
        'model': model_key,
        'fold': fold_num,
        'seed': seed,
        'best_epoch': best_epoch,
        'best_val_loss': round(best_val_loss, 4),
        'epochs': epoch_logs,
        'runtime_seconds': total_time,
        'checkpoint_dir': fold_dir,
        'weights_sha256': weights_sha
    }

if __name__ == '__main__':
    target_model = sys.argv[1] if len(sys.argv) > 1 else 'C1_FT_MINILM'
    target_fold = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    
    folds_to_run = [target_fold] if target_fold in range(1, 6) else range(1, 6)
    
    # Load or init training log
    training_log = {}
    if os.path.exists(TRAINING_LOG_PATH):
        try:
            with open(TRAINING_LOG_PATH, 'r', encoding='utf-8') as f:
                training_log = json.load(f)
        except Exception:
            training_log = {}
            
    if target_model not in training_log:
        training_log[target_model] = {}
        
    for f in folds_to_run:
        res = train_model_fold(target_model, f)
        training_log[target_model][f"fold_{f}"] = res
        
        with open(TRAINING_LOG_PATH, 'w', encoding='utf-8') as f_out:
            json.dump(training_log, f_out, indent=2)
            
    print(f"\nAll requested folds for {target_model} successfully trained and logged to {TRAINING_LOG_PATH}.")
