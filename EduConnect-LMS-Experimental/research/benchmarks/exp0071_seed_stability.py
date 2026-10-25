"""
EXP-0071 Repeated-Seed Stability Evaluation
Evaluates Policy P1 across Seeds 42, 123, and 456 under 5-fold cross-validation.
Computes accuracy variance, pairwise prediction agreement, and Cohen's kappa.
Emits EXP-0071-STABILITY-ANALYSIS.json.
"""

import os
import sys
import json
import numpy as np
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import cohen_kappa_score

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from research.benchmarks.exp0071_state import extract_state_features
DEV_DATASET_FILE = os.path.join(ROOT_DIR, 'EXP-0025-DEVELOPMENT-DATASET.json')
SPLITS_FILE = os.path.join(ROOT_DIR, 'EXP-0071-CV-SPLITS.json')
CACHE_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0056_dev_c1_cache.json')
EXP70_PREDS_FILE = os.path.join(ROOT_DIR, 'EXP-0070-OFFFOLD-PREDICTIONS.json')
RECORDS_FILE = os.path.join(ROOT_DIR, 'scratch', 'exp0070_runtime_records.jsonl')
STABILITY_OUT = os.path.join(ROOT_DIR, 'EXP-0071-STABILITY-ANALYSIS.json')

def run_stability():
    print("[EXP-0071 Stability] Loading datasets and features...")
    with open(DEV_DATASET_FILE, 'r', encoding='utf-8') as f:
        dev_dataset = {item['id']: item for item in json.load(f)}

    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        dev_cache = json.load(f)

    with open(EXP70_PREDS_FILE, 'r', encoding='utf-8') as f:
        exp70_preds = json.load(f)

    with open(SPLITS_FILE, 'r', encoding='utf-8') as f:
        splits = json.load(f)

    records = []
    if os.path.exists(RECORDS_FILE):
        with open(RECORDS_FILE, 'r', encoding='utf-8') as f:
            records = [json.loads(line) for line in f]
    c1_records = {r['case_id']: r for r in records if r.get('condition') == 'C1'}
    c0_p = exp70_preds.get('C0', {})
    c1_p = exp70_preds.get('C1', {})

    case_order = sorted(dev_dataset.keys())
    X_matrix = []
    y_target = []

    for cid in case_order:
        c_rec = c1_records.get(cid)
        t1_rec = {
            'ambiguity_detected': (c1_p.get(cid, {}).get('decision_tier') == 'TIER_1_DETERMINISTIC' and c1_p.get(cid, {}).get('predicted') == 'NOT_ESTABLISHED'),
            'tier1_match': (c1_p.get(cid, {}).get('decision_tier') == 'TIER_1_DETERMINISTIC' and c1_p.get(cid, {}).get('predicted') != 'NOT_ESTABLISHED')
        }
        fd, fvec = extract_state_features(cid, dev_dataset[cid]['query'], dev_dataset[cid]['category'], dev_cache.get(cid, {}).get('top5', []), c_rec, t1_rec)
        X_matrix.append(fvec)

        if c1_p.get(cid, {}).get('decision_tier') == 'TIER_1_DETERMINISTIC':
            act = 0
        elif dev_dataset[cid]['category'] == 'OUT_OF_DOMAIN':
            act = 3
        elif not c1_p.get(cid, {}).get('correct') and c0_p.get(cid, {}).get('correct'):
            act = 2
        elif c1_p.get(cid, {}).get('correct') and dev_dataset[cid]['expected'] == 'REFUTED' and fd['state_code'] in [3, 4]:
            act = 1
        elif c1_p.get(cid, {}).get('correct'):
            act = 0
        else:
            act = 2
        y_target.append(act)

    X_all = np.array(X_matrix, dtype=np.float32)
    y_all = np.array(y_target, dtype=np.int64)

    seeds = [42, 123, 456]
    seed_results = {}
    seed_predictions = {}

    for seed in seeds:
        preds = {}
        c0_calls = 0
        for fold_k, finfo in splits['folds'].items():
            tr_mask = [cid in set(finfo['train_case_ids']) for cid in case_order]
            te_mask = [cid in set(finfo['test_case_ids']) for cid in case_order]
            
            clf = ExtraTreesClassifier(n_estimators=150, max_depth=8, class_weight='balanced', random_state=seed)
            clf.fit(X_all[tr_mask], y_all[tr_mask])
            pred_acts = clf.predict(X_all[te_mask])
            te_cids = [cid for cid in case_order if cid in set(finfo['test_case_ids'])]
            
            for cid, act in zip(te_cids, pred_acts):
                if c1_p.get(cid, {}).get('decision_tier') == 'TIER_1_DETERMINISTIC':
                    final_p = c1_p[cid]['predicted']
                elif act == 2:
                    final_p = c0_p[cid]['predicted']
                    c0_calls += 1
                elif act == 3:
                    final_p = 'NOT_ESTABLISHED'
                else:
                    final_p = c1_p[cid]['predicted']
                preds[cid] = final_p
                
        correct = sum(1 for cid in case_order if preds[cid] == dev_dataset[cid]['expected'])
        acc = round((correct / len(case_order)) * 100, 2)
        
        # FAR and FRR
        ref_cases = [cid for cid in case_order if dev_dataset[cid]['expected'] == 'REFUTED']
        sup_cases = [cid for cid in case_order if dev_dataset[cid]['expected'] == 'SUPPORTED']
        far = round(sum(1 for cid in ref_cases if preds[cid] == 'SUPPORTED') / len(ref_cases) * 100, 2)
        frr = round(sum(1 for cid in sup_cases if preds[cid] == 'REFUTED') / len(sup_cases) * 100, 2)
        
        seed_results[seed] = {
            'accuracy': acc,
            'correct': correct,
            'c0_calls': c0_calls,
            'llm_reduction_pct': round((1.0 - c0_calls / 206) * 100, 2),
            'far': far,
            'frr': frr
        }
        seed_predictions[seed] = preds
        print(f"Seed {seed:3d}: Acc = {acc:5.2f}% ({correct}/400) | FAR = {far:4.2f}% | FRR = {frr:4.2f}% | C0 calls = {c0_calls}/206 (-{seed_results[seed]['llm_reduction_pct']}%)")

    # Pairwise agreement and Cohen's kappa
    agreements = {}
    kappas = {}
    pair_keys = [(42, 123), (42, 456), (123, 456)]
    for s_a, s_b in pair_keys:
        p_a = [seed_predictions[s_a][cid] for cid in case_order]
        p_b = [seed_predictions[s_b][cid] for cid in case_order]
        agree = round(sum(1 for a, b in zip(p_a, p_b) if a == b) / len(case_order) * 100, 2)
        kappa = round(float(cohen_kappa_score(p_a, p_b)), 4)
        pair_str = f"seed{s_a}_vs_seed{s_b}"
        agreements[pair_str] = agree
        kappas[pair_str] = kappa
        print(f"Pairwise Agreement ({pair_str}): {agree}% | Cohen's Kappa: {kappa}")

    acc_list = [seed_results[s]['accuracy'] for s in seeds]
    mean_acc = round(float(np.mean(acc_list)), 2)
    std_acc = round(float(np.std(acc_list)), 2)

    stability_payload = {
        'experiment_id': 'EXP-0071',
        'model_architecture': 'ExtraTreesClassifier(n_estimators=150, max_depth=8)',
        'seeds_evaluated': seeds,
        'seed_metrics': seed_results,
        'mean_accuracy': mean_acc,
        'std_dev_accuracy': std_acc,
        'min_accuracy': min(acc_list),
        'max_accuracy': max(acc_list),
        'pairwise_agreements': agreements,
        'cohen_kappas': kappas,
        'gate_h_threshold': 1.0,
        'gate_h_status': 'PASS' if std_acc < 1.0 else 'FAIL'
    }

    with open(STABILITY_OUT, 'w', encoding='utf-8') as f:
        json.dump(stability_payload, f, indent=2)

    print(f"\n[EXP-0071 Stability] Summary: Mean Acc = {mean_acc}% ± {std_acc}% (StdDev < 1.0%: {stability_payload['gate_h_status']})")
    print(f"Saved: {STABILITY_OUT}")

if __name__ == '__main__':
    run_stability()
