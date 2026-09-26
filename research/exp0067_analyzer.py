"""
EXP-0067 Comprehensive Analysis and Metrics Calculator
Computes:
- Overall metrics (Accuracy, Macro F1, FAR, FRR)
- False Acceptance (REFUTED -> SUPPORTED) and False Rejection (SUPPORTED -> REFUTED)
- Stratified analysis across S1-S7
- Paired McNemar exact tests vs C0
- Discordant pair error transitions
- Gates A-E evaluation
"""

import json
import os
import math
from collections import defaultdict

ROOT_DIR = os.path.dirname(os.path.dirname(__file__))

DEV_DATASET_PATH = os.path.join(ROOT_DIR, 'EXP-0025-DEVELOPMENT-DATASET.json')
DEV_PREDS_PATH = os.path.join(ROOT_DIR, 'EXP-0067-DEVELOPMENT-PREDICTIONS.json')
METRICS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0067-DEVELOPMENT-METRICS.json')
STRATIFIED_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0067-STRATIFIED-ANALYSIS.json')
TRANSITIONS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0067-ERROR-TRANSITIONS.json')

# Lexical antonym pairs from $semanticOpposites in backend/rag_premise_verifier.php
ANTONYMS = [
    ('synchronous', 'asynchronous'),
    ('mutable', 'immutable'),
    ('1-dimensional', '2-dimensional'),
    ('one-dimensional', 'two-dimensional'),
    ('border-box', 'content-box'),
    ('commit', 'rollback'),
    ('block', 'inline'),
    ('microtask', 'macrotask'),
    ('single-threaded', 'multi-threaded'),
    ('client-side', 'server-side'),
    ('requires', 'optional'),
    ('permit', 'prohibit'),
    ('primitive', 'reference'),
    ('flex-direction', 'main axis'),
    ('lexical', 'dynamic'),
    ('absolute', 'relative'),
    ('static', 'relative')
]

NORMATIVE_SIGNALS = ['should', 'better', 'best', 'prefer', 'recommend', 'recommended', 'must', 'always', 'never', 'superior']

def classify_strata(item):
    q = item['query'].lower()
    cat = item.get('category', '')
    
    strata = set()
    
    # S1 vs S2: Antonym vs Non-Antonym
    has_ant = any(a in q and b in q or (a in q or b in q) for a, b in ANTONYMS)
    # Check if query matches known antonym list
    if any(a in q or b in q for a, b in [
        ('sync', 'async'), ('mutable', 'immutable'), ('1d', '2d'), ('border-box', 'content-box'),
        ('commit', 'rollback'), ('inline', 'block'), ('microtask', 'macrotask'),
        ('client', 'server'), ('primitive', 'reference')
    ]):
        has_ant = True
    
    if has_ant:
        strata.add('S1_Antonym_Assisted')
    else:
        strata.add('S2_Non_Antonym')
        
    if cat == 'SUPPORTED_CURRICULUM':
        strata.add('S3_High_Overlap_Support')
    elif cat == 'LEGITIMATE_NEGATION':
        strata.add('S4_Low_Overlap_Paraphrase')
    elif cat == 'MIXED_COMPOUND_PREMISE':
        strata.add('S6_Compound_MultiClause')
    elif cat == 'OUT_OF_CURRICULUM_UNKNOWN':
        strata.add('S7_OOD_Technology')
        
    if any(s in q for s in NORMATIVE_SIGNALS):
        strata.add('S5_Normative_Universal')
        
    return strata

def mcnemar_exact(b, c):
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    # Two-sided exact binomial test with p = 0.5
    cum_prob = sum(math.comb(n, i) * (0.5 ** n) for i in range(k + 1))
    p_val = min(1.0, 2.0 * cum_prob)
    return float(p_val)

def compute_metrics(predictions, dataset_dict):
    N = len(predictions)
    correct = sum(1 for p in predictions.values() if p['correct'])
    accuracy = correct / N
    
    # Class breakdown
    labels = ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED']
    cm = {exp: {prd: 0 for prd in labels + ['PARSE_FAILURE']} for exp in labels}
    
    cat_stats = defaultdict(lambda: {'total': 0, 'correct': 0})
    false_acceptances = 0 # REFUTED -> SUPPORTED
    false_rejections = 0   # SUPPORTED -> REFUTED
    ref_abstentions = 0    # REFUTED -> NOT_ESTABLISHED
    sup_abstentions = 0    # SUPPORTED -> NOT_ESTABLISHED
    ood_acceptances = 0    # OOD -> SUPPORTED
    ood_rejections = 0     # OOD -> REFUTED
    
    for cid, p in predictions.items():
        exp = p['expected']
        prd = p['predicted']
        cat = p['category']
        
        cm[exp][prd] = cm[exp].get(prd, 0) + 1
        cat_stats[cat]['total'] += 1
        if p['correct']:
            cat_stats[cat]['correct'] += 1
            
        if exp == 'REFUTED' and prd == 'SUPPORTED':
            false_acceptances += 1
        elif exp == 'SUPPORTED' and prd == 'REFUTED':
            false_rejections += 1
        elif exp == 'REFUTED' and prd == 'NOT_ESTABLISHED':
            ref_abstentions += 1
        elif exp == 'SUPPORTED' and prd == 'NOT_ESTABLISHED':
            sup_abstentions += 1
            
        if cat == 'OUT_OF_CURRICULUM_UNKNOWN':
            if prd == 'SUPPORTED':
                ood_acceptances += 1
            elif prd == 'REFUTED':
                ood_rejections += 1

    # Macro F1
    f1s = []
    for lbl in labels:
        tp = cm[lbl][lbl]
        fp = sum(cm[other][lbl] for other in labels if other != lbl)
        fn = sum(cm[lbl][other] for other in labels if other != lbl)
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        f1s.append(f1)
    macro_f1 = sum(f1s) / len(f1s)
    
    # Specific recalls
    sup_total = sum(cm['SUPPORTED'].values())
    ref_total = sum(cm['REFUTED'].values())
    ood_total = cat_stats['OUT_OF_CURRICULUM_UNKNOWN']['total']
    
    sup_rec = cm['SUPPORTED']['SUPPORTED'] / sup_total if sup_total > 0 else 0.0
    ref_rec = cm['REFUTED']['REFUTED'] / ref_total if ref_total > 0 else 0.0
    ood_rec = cat_stats['OUT_OF_CURRICULUM_UNKNOWN']['correct'] / ood_total if ood_total > 0 else 0.0
    
    far = false_acceptances / ref_total if ref_total > 0 else 0.0
    frr = false_rejections / sup_total if sup_total > 0 else 0.0
    
    latencies = [p['latency_ms'] for p in predictions.values() if 'latency_ms' in p]
    mean_lat = sum(latencies) / len(latencies) if latencies else 0.0
    
    return {
        'total_cases': N,
        'correct': correct,
        'accuracy_pct': round(accuracy * 100, 2),
        'macro_f1': round(macro_f1, 4),
        'confusion_matrix': cm,
        'category_accuracies': {cat: round((s['correct'] / s['total']) * 100, 2) for cat, s in cat_stats.items()},
        'false_acceptance_count': false_acceptances,
        'false_rejection_count': false_rejections,
        'refuted_abstention_count': ref_abstentions,
        'supported_abstention_count': sup_abstentions,
        'ood_false_acceptances': ood_acceptances,
        'ood_false_refutations': ood_rejections,
        'supported_recall_pct': round(sup_rec * 100, 2),
        'refutation_recall_pct': round(ref_rec * 100, 2),
        'ood_recall_pct': round(ood_rec * 100, 2),
        'far_pct': round(far * 100, 2),
        'frr_pct': round(frr * 100, 2),
        'mean_latency_ms': round(mean_lat, 1)
    }

def run_analysis():
    if not os.path.exists(DEV_PREDS_PATH):
        print(f"Predictions not found at {DEV_PREDS_PATH}")
        return
        
    dataset = json.load(open(DEV_DATASET_PATH, encoding='utf-8'))
    dataset_dict = {item['id']: item for item in dataset}
    all_preds = json.load(open(DEV_PREDS_PATH, encoding='utf-8'))
    
    print(f"Loaded predictions for conditions: {list(all_preds.keys())}")
    
    # 1. Condition Metrics
    condition_metrics = {}
    for cond, preds in all_preds.items():
        condition_metrics[cond] = compute_metrics(preds, dataset_dict)
        
    # 2. Stratified Analysis S1 - S7
    case_strata = {item['id']: classify_strata(item) for item in dataset}
    all_strata_names = sorted(list(set(s for strata in case_strata.values() for s in strata)))
    
    stratified_results = {}
    for cond, preds in all_preds.items():
        cond_strata = {}
        for s_name in all_strata_names:
            s_cases = [cid for cid, s_set in case_strata.items() if s_name in s_set]
            s_corr = sum(1 for cid in s_cases if preds[cid]['correct'])
            s_acc = (s_corr / len(s_cases)) * 100 if s_cases else 0.0
            cond_strata[s_name] = {
                'total': len(s_cases),
                'correct': s_corr,
                'accuracy_pct': round(s_acc, 2)
            }
        stratified_results[cond] = cond_strata
        
    # 3. Transitions & McNemar vs C0
    c0_preds = all_preds.get('C0', {})
    transitions_vs_c0 = {}
    
    for cond, preds in all_preds.items():
        if cond == 'C0':
            continue
            
        n00, n11, b, c = 0, 0, 0, 0
        error_transitions = defaultdict(int)
        
        for cid in dataset_dict:
            c0_corr = c0_preds[cid]['correct']
            cand_corr = preds[cid]['correct']
            
            c0_p = c0_preds[cid]['predicted']
            cand_p = preds[cid]['predicted']
            exp = dataset_dict[cid]['expected']
            
            if c0_corr and cand_corr:
                n00 += 1
            elif not c0_corr and not cand_corr:
                n11 += 1
            elif not c0_corr and cand_corr:
                b += 1  # C0 wrong, Candidate fixed
            elif c0_corr and not cand_corr:
                c += 1  # C0 correct, Candidate broke
                
            if c0_p != cand_p:
                error_transitions[f"{exp}: C0({c0_p}) -> {cond}({cand_p})"] += 1
                
        p_val = mcnemar_exact(b, c)
        acc_delta = condition_metrics[cond]['accuracy_pct'] - condition_metrics['C0']['accuracy_pct']
        
        transitions_vs_c0[cond] = {
            'b_fixed': b,
            'c_broken': c,
            'net_gain': b - c,
            'mcnemar_p_value': round(p_val, 6),
            'statistically_significant': bool(p_val < 0.05),
            'accuracy_delta_pp': round(acc_delta, 2),
            'transitions_sample': dict(sorted(error_transitions.items(), key=lambda x: x[1], reverse=True)[:15])
        }
        
    # 4. Advancement Gates Evaluation (Gates A - E)
    gates_eval = {}
    c0_m = condition_metrics['C0']
    
    for cond in ['C1', 'C2', 'C3', 'C4']:
        if cond not in condition_metrics:
            continue
        m = condition_metrics[cond]
        trans = transitions_vs_c0.get(cond, {})
        strata = stratified_results.get(cond, {})
        c0_strata = stratified_results.get('C0', {})
        
        # Gate A: False Acceptance Reduction (REFUTED -> SUPPORTED)
        gate_a = bool(m['false_acceptance_count'] < c0_m['false_acceptance_count'])
        
        # Gate B: Supported Recall Preservation (<= 3.0 pp drop)
        gate_b = bool((c0_m['supported_recall_pct'] - m['supported_recall_pct']) <= 3.0)
        
        # Gate C: OOD Safety Preservation (>= 95.0%)
        gate_c = bool(m['ood_recall_pct'] >= 95.0)
        
        # Gate D: Overall Non-Inferiority (McNemar p > 0.05 or delta >= -1.5 pp)
        gate_d = bool(trans.get('mcnemar_p_value', 1.0) > 0.05 or trans.get('accuracy_delta_pp', 0.0) >= -1.5)
        
        # Gate E: Non-Shortcut Generalization (improvement on S2 or S6)
        s2_gain = strata['S2_Non_Antonym']['accuracy_pct'] - c0_strata['S2_Non_Antonym']['accuracy_pct']
        s6_gain = strata['S6_Compound_MultiClause']['accuracy_pct'] - c0_strata['S6_Compound_MultiClause']['accuracy_pct']
        gate_e = bool(s2_gain >= 0.0 or s6_gain >= 0.0)
        
        cleared_all = gate_a and gate_b and gate_c and gate_d and gate_e
        
        gates_eval[cond] = {
            'Gate_A_False_Acceptance_Reduction': {
                'passed': gate_a,
                'c0_fa': c0_m['false_acceptance_count'],
                'cand_fa': m['false_acceptance_count'],
                'reduction': c0_m['false_acceptance_count'] - m['false_acceptance_count']
            },
            'Gate_B_Supported_Recall_Preservation': {
                'passed': gate_b,
                'c0_sup_rec': c0_m['supported_recall_pct'],
                'cand_sup_rec': m['supported_recall_pct'],
                'drop_pp': round(c0_m['supported_recall_pct'] - m['supported_recall_pct'], 2)
            },
            'Gate_C_OOD_Safety_Preservation': {
                'passed': gate_c,
                'cand_ood_rec': m['ood_recall_pct']
            },
            'Gate_D_Overall_Non_Inferiority': {
                'passed': gate_d,
                'accuracy_delta_pp': trans.get('accuracy_delta_pp', 0.0),
                'mcnemar_p': trans.get('mcnemar_p_value', 1.0)
            },
            'Gate_E_Non_Shortcut_Generalization': {
                'passed': gate_e,
                's2_gain_pp': round(s2_gain, 2),
                's6_gain_pp': round(s6_gain, 2)
            },
            'CLEARED_ALL_GATES': cleared_all
        }
        
    full_metrics = {
        'conditions': condition_metrics,
        'transitions_vs_c0': transitions_vs_c0,
        'gates_evaluation': gates_eval
    }
    
    with open(METRICS_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(full_metrics, f, indent=2)
    with open(STRATIFIED_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(stratified_results, f, indent=2)
    with open(TRANSITIONS_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(transitions_vs_c0, f, indent=2)
        
    print(f"Saved: {METRICS_OUT_PATH}")
    print(f"Saved: {STRATIFIED_OUT_PATH}")
    print(f"Saved: {TRANSITIONS_OUT_PATH}")
    
    # Print summary table
    print("\n" + "=" * 90)
    print(f"{'Condition':<10} | {'Acc (%)':<8} | {'F1':<7} | {'FA':<5} | {'FR':<5} | {'SupRec':<8} | {'RefRec':<8} | {'OODRec':<8} | {'Gates':<6}")
    print("-" * 90)
    for c_id, m in condition_metrics.items():
        g_status = "REF" if c_id == 'C0' else ("PASS" if gates_eval.get(c_id, {}).get('CLEARED_ALL_GATES') else "FAIL")
        print(f"{c_id:<10} | {m['accuracy_pct']:<8.2f} | {m['macro_f1']:<7.4f} | {m['false_acceptance_count']:<5} | {m['false_rejection_count']:<5} | {m['supported_recall_pct']:<8.2f} | {m['refutation_recall_pct']:<8.2f} | {m['ood_recall_pct']:<8.2f} | {g_status:<6}")
    print("=" * 90)

if __name__ == '__main__':
    run_analysis()
