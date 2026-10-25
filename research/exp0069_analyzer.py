"""
EXP-0069 Comprehensive Analysis and Reporting Engine
Computes full classification metrics, calibration metrics, strata metrics S1-S7,
paired McNemar tests, error transitions, gate evaluations, and generates all required JSON artifacts.
"""

import json
import math
import os
import numpy as np
from scipy.stats import binom

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEV_DATASET_PATH = os.path.join(ROOT_DIR, 'EXP-0025-DEVELOPMENT-DATASET.json')
FOLDS_PATH = os.path.join(ROOT_DIR, 'scratch', 'exp0069_folds.json')
FITS_PATH = os.path.join(ROOT_DIR, 'EXP-0069-CALIBRATION-FITS.json')
PREDS_PATH = os.path.join(ROOT_DIR, 'EXP-0069-DEVELOPMENT-PREDICTIONS.json')
RUNTIME_LOG_PATH = os.path.join(ROOT_DIR, 'scratch', 'exp0069_runtime_records.jsonl')

METRICS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-DEVELOPMENT-METRICS.json')
CALIB_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-CALIBRATION-ANALYSIS.json')
STRATIFIED_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-STRATIFIED-ANALYSIS.json')
TRANSITIONS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-ERROR-TRANSITIONS.json')

# Antonym vocabulary for S1 vs S2
antonym_words = [
    'flex-start', 'flex-end', 'row', 'row-reverse', 'column', 'column-reverse',
    'block', 'inline', 'inline-block', 'none', 'visible', 'hidden', 'collapse',
    'static', 'relative', 'absolute', 'fixed', 'sticky',
    'get', 'post', 'put', 'delete', 'patch',
    'var', 'let', 'const', 'undefined', 'null',
    'true', 'false', 'synchronous', 'asynchronous',
    'req', 'res', 'request', 'response'
]

def load_data():
    with open(DEV_DATASET_PATH, 'r', encoding='utf-8') as f:
        dev = json.load(f)
    dev_map = {d['id']: d for d in dev}
    
    with open(PREDS_PATH, 'r', encoding='utf-8') as f:
        all_preds = json.load(f)
        
    with open(FITS_PATH, 'r', encoding='utf-8') as f:
        fits = json.load(f)
        
    # Build strata
    s1, s2, s3, s4, s5, s6, s7 = [], [], [], [], [], [], []
    for d in dev:
        cid = d['id']
        q = d['query'].lower()
        cat = d.get('category', '')
        
        # S1 vs S2
        if any(w in q for w in antonym_words):
            s1.append(cid)
        else:
            s2.append(cid)
            
        # S3: High overlap support
        if cat == 'SUPPORTED_CURRICULUM':
            s3.append(cid)
            
        # S4: Low overlap paraphrase
        if cat == 'LEGITIMATE_NEGATION':
            s4.append(cid)
            
        # S5: Normative / universal
        if any(w in q for w in ['always', 'never', 'must', 'best', 'only', 'superior', 'recommended', 'should', 'all']):
            s5.append(cid)
            
        # S6: Compound multi-clause
        if cat == 'MIXED_COMPOUND_PREMISE' or ' and ' in q or ' but ' in q or ' whereas ' in q:
            s6.append(cid)
            
        # S7: OOD
        if cat == 'OUT_OF_CURRICULUM_UNKNOWN':
            s7.append(cid)
            
    strata = {
        'S1_antonym_assisted': s1,
        'S2_non_antonym': s2,
        'S3_high_overlap_support': s3,
        'S4_low_overlap_paraphrase': s4,
        'S5_normative_universal': s5,
        'S6_compound_multi_clause': s6,
        'S7_ood': s7
    }
    
    # Load runtime logs
    runtime_records = []
    if os.path.exists(RUNTIME_LOG_PATH):
        with open(RUNTIME_LOG_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                runtime_records.append(json.loads(line))
                
    return dev, dev_map, all_preds, fits, strata, runtime_records

def compute_condition_metrics(preds, dev_map, strata):
    n = len(dev_map)
    cids = list(dev_map.keys())
    
    correct_count = sum(1 for cid in cids if preds.get(cid, {}).get('predicted') == dev_map[cid]['expected'])
    acc = (correct_count / n) * 100.0
    
    cm = {
        'SUPPORTED': {'SUPPORTED': 0, 'REFUTED': 0, 'NOT_ESTABLISHED': 0, 'PARSE_FAILURE': 0},
        'REFUTED': {'SUPPORTED': 0, 'REFUTED': 0, 'NOT_ESTABLISHED': 0, 'PARSE_FAILURE': 0},
        'NOT_ESTABLISHED': {'SUPPORTED': 0, 'REFUTED': 0, 'NOT_ESTABLISHED': 0, 'PARSE_FAILURE': 0}
    }
    
    for cid in cids:
        exp = dev_map[cid]['expected']
        pred = preds.get(cid, {}).get('predicted', 'PARSE_FAILURE')
        if pred not in ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED']:
            pred = 'PARSE_FAILURE'
        cm[exp][pred] += 1
        
    class_metrics = {}
    f1_sum = 0.0
    for cls in ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED']:
        tp = cm[cls][cls]
        fn = sum(cm[cls][other] for other in ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED', 'PARSE_FAILURE'] if other != cls)
        fp = sum(cm[other][cls] for other in ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED'] if other != cls)
        prec = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else 0.0
        rec = (tp / (tp + fn) * 100.0) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        f1_sum += f1
        class_metrics[cls] = {
            'tp': tp,
            'fn': fn,
            'fp': fp,
            'precision': round(prec, 2),
            'recall': round(rec, 2),
            'f1': round(f1, 2)
        }
        
    macro_f1 = f1_sum / 3.0
    
    # Specific rates
    # FAR: False premises accepted as supported / total false premise claims (150 claims)
    fp_claims_total = 150 # 100 NOVEL_FALSE_PREMISE + 50 MIXED_COMPOUND_PREMISE
    fp_accepted = cm['REFUTED']['SUPPORTED']
    far = (fp_accepted / fp_claims_total * 100.0) if fp_claims_total > 0 else 0.0
    
    # FRR: Supported claims rejected as refuted / total supported claims (150 claims)
    sup_claims_total = 150 # 100 SUPPORTED_CURRICULUM + 50 LEGITIMATE_NEGATION
    sup_rejected = cm['SUPPORTED']['REFUTED']
    frr = (sup_rejected / sup_claims_total * 100.0) if sup_claims_total > 0 else 0.0
    
    # Strata breakdown
    strata_res = {}
    for s_name, s_cids in strata.items():
        s_corr = sum(1 for cid in s_cids if preds.get(cid, {}).get('predicted') == dev_map[cid]['expected'])
        s_n = len(s_cids)
        strata_res[s_name] = {
            'n': s_n,
            'correct': s_corr,
            'accuracy': round((s_corr / s_n) * 100.0, 2) if s_n > 0 else 0.0
        }
        
    # Latencies
    lats = [preds[cid]['latency_ms'] for cid in cids if 'latency_ms' in preds.get(cid, {})]
    mean_lat = float(np.mean(lats)) if lats else 0.0
    
    return {
        'total': n,
        'correct': correct_count,
        'accuracy': round(acc, 2),
        'macro_f1': round(macro_f1, 2),
        'far': round(far, 2),
        'frr': round(frr, 2),
        'supported_recall': class_metrics['SUPPORTED']['recall'],
        'refutation_recall': class_metrics['REFUTED']['recall'],
        'ood_recall': class_metrics['NOT_ESTABLISHED']['recall'],
        'false_abstention_count': cm['SUPPORTED']['NOT_ESTABLISHED'],
        'false_acceptance_count': fp_accepted,
        'false_rejection_count': sup_rejected,
        'confusion_matrix': cm,
        'class_metrics': class_metrics,
        'strata_metrics': strata_res,
        'mean_latency_ms': round(mean_lat, 2)
    }

def mcnemar(corr1, corr2):
    n00 = n01 = n10 = n11 = 0
    for r1, r2 in zip(corr1, corr2):
        if r1 and r2:
            n11 += 1
        elif r1 and not r2:
            n10 += 1  # 1 correct, 2 wrong
        elif not r1 and r2:
            n01 += 1  # 1 wrong, 2 correct
        else:
            n00 += 1
            
    disc = n01 + n10
    if disc == 0:
        p_val = 1.0
    else:
        k = min(n01, n10)
        p_val = 2.0 * float(binom.cdf(k, disc, 0.5))
        p_val = min(1.0, p_val)
        
    n = len(corr1)
    delta = (sum(corr2) - sum(corr1)) / n * 100.0
    var = (n01 + n10 - ((n01 - n10) ** 2) / n)
    se = (math.sqrt(max(0, var)) / n) * 100.0 if n > 0 else 0.0
    ci_lower = delta - 1.96 * se
    ci_upper = delta + 1.96 * se
    
    return {
        'n00': n00,
        'n01': n01,
        'n10': n10,
        'n11': n11,
        'discordant_pairs': disc,
        'p_value': p_val,
        'delta_pp': round(delta, 2),
        'ci_95': [round(ci_lower, 2), round(ci_upper, 2)],
        'statistically_significant': bool(p_val < 0.05)
    }

def compute_calibration_diagnostics(cond_name, runtime_records, dev_map):
    # Filter records for this condition
    records = [r for r in runtime_records if r.get('condition') == cond_name]
    if not records:
        return None
        
    # Map each case to its primary record
    case_primary = {}
    for r in records:
        cid = r.get('case_id')
        if cid and cid not in case_primary:
            case_primary[cid] = r
            
    # Compute multiclass NLL, Brier, ECE, entropy, margin on Tier-2 cases
    STATUS_TO_IDX = {'REFUTED': 0, 'SUPPORTED': 1, 'NOT_ESTABLISHED': 2}
    labels_order = ['CONTRADICTION', 'ENTAILMENT', 'NEUTRAL']
    
    probs_list = []
    targets_list = []
    
    for cid, r in case_primary.items():
        if cid in dev_map:
            target_status = dev_map[cid]['expected']
            target_idx = STATUS_TO_IDX[target_status]
            c_probs = r['calibrated_probs']
            p_vec = [c_probs[lbl] for lbl in labels_order]
            probs_list.append(p_vec)
            targets_list.append(target_idx)
            
    if not probs_list:
        return None
        
    probs = np.array(probs_list)
    targets = np.array(targets_list)
    n = len(targets)
    eps = 1e-12
    
    nll = float(-np.mean([np.log(max(probs[i, targets[i]], eps)) for i in range(n)]))
    
    one_hot = np.zeros_like(probs)
    for i, t in enumerate(targets):
        one_hot[i, t] = 1.0
    brier = float(np.mean(np.sum((probs - one_hot) ** 2, axis=1)))
    
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = (predictions == targets).astype(float)
    
    bin_edges = np.linspace(0.0, 1.0, 11)
    ece = 0.0
    mce = 0.0
    bins_data = []
    
    for m in range(10):
        low, high = bin_edges[m], bin_edges[m+1]
        in_bin = (confidences > low) & (confidences <= high) if m > 0 else (confidences >= low) & (confidences <= high)
        bin_count = int(np.sum(in_bin))
        if bin_count > 0:
            bin_acc = float(np.mean(accuracies[in_bin]))
            bin_conf = float(np.mean(confidences[in_bin]))
            bin_diff = abs(bin_acc - bin_conf)
            ece += (bin_count / n) * bin_diff
            if bin_diff > mce:
                mce = bin_diff
            bins_data.append({
                'bin': m + 1,
                'range': [round(low, 2), round(high, 2)],
                'count': bin_count,
                'accuracy': round(bin_acc * 100, 2),
                'confidence': round(bin_conf * 100, 2),
                'error': round(bin_diff * 100, 2)
            })
        else:
            bins_data.append({
                'bin': m + 1,
                'range': [round(low, 2), round(high, 2)],
                'count': 0,
                'accuracy': 0.0,
                'confidence': 0.0,
                'error': 0.0
            })
            
    entropy = float(-np.mean(np.sum(probs * np.log(np.maximum(probs, eps)), axis=1)))
    sorted_p = np.sort(probs, axis=1)
    margins = sorted_p[:, -1] - sorted_p[:, -2]
    mean_margin = float(np.mean(margins))
    mean_conf = float(np.mean(confidences))
    
    return {
        'n': n,
        'nll': round(nll, 4),
        'brier_score': round(brier, 4),
        'ece': round(ece * 100, 2),
        'mce': round(mce * 100, 2),
        'mean_entropy': round(entropy, 4),
        'mean_margin': round(mean_margin, 4),
        'mean_confidence': round(mean_conf * 100, 2),
        'reliability_bins': bins_data
    }

def main():
    print("Loading data...")
    dev, dev_map, all_preds, fits, strata, runtime_records = load_data()
    cids = list(dev_map.keys())
    
    # 1. Classification Metrics
    metrics_data = {'metrics': {}}
    for cond, preds in all_preds.items():
        metrics_data['metrics'][cond] = compute_condition_metrics(preds, dev_map, strata)
        print(f"[{cond}] Accuracy: {metrics_data['metrics'][cond]['accuracy']}% | SupRec: {metrics_data['metrics'][cond]['supported_recall']}% | FAR: {metrics_data['metrics'][cond]['far']}%")
        
    # 2. Paired McNemar Tests vs C0 and vs Raw
    mcnemar_data = {}
    c0_corr = [all_preds['C0'][cid]['predicted'] == dev_map[cid]['expected'] for cid in cids]
    
    for cond in all_preds:
        if cond == 'C0':
            continue
        cand_corr = [all_preds[cond][cid]['predicted'] == dev_map[cid]['expected'] for cid in cids]
        mcnemar_data[f"{cond}_vs_C0"] = mcnemar(c0_corr, cand_corr)
        
    # Also vs Raw
    minilm_raw_corr = [all_preds['MINILM_RAW'][cid]['predicted'] == dev_map[cid]['expected'] for cid in cids]
    for m in ['MINILM_TEMP', 'MINILM_BIAS', 'MINILM_VEC']:
        cand_corr = [all_preds[m][cid]['predicted'] == dev_map[cid]['expected'] for cid in cids]
        mcnemar_data[f"{m}_vs_MINILM_RAW"] = mcnemar(minilm_raw_corr, cand_corr)
        
    deberta_raw_corr = [all_preds['DEBERTA_RAW'][cid]['predicted'] == dev_map[cid]['expected'] for cid in cids]
    for m in ['DEBERTA_TEMP', 'DEBERTA_BIAS', 'DEBERTA_VEC']:
        cand_corr = [all_preds[m][cid]['predicted'] == dev_map[cid]['expected'] for cid in cids]
        mcnemar_data[f"{m}_vs_DEBERTA_RAW"] = mcnemar(deberta_raw_corr, cand_corr)
        
    metrics_data['statistical_tests'] = mcnemar_data
    
    with open(METRICS_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Saved {METRICS_OUT_PATH}")
    
    # 3. Calibration Analysis
    calib_analysis = {
        'conditions': {},
        'parameter_stability': fits.get('models', {})
    }
    for cond in all_preds:
        if cond == 'C0':
            continue
        diag = compute_calibration_diagnostics(cond, runtime_records, dev_map)
        if diag:
            calib_analysis['conditions'][cond] = diag
            print(f"[{cond} Calib] NLL: {diag['nll']} | Brier: {diag['brier_score']} | ECE: {diag['ece']}%")
            
    with open(CALIB_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(calib_analysis, f, indent=2)
    print(f"Saved {CALIB_OUT_PATH}")
    
    # 4. Stratified Analysis
    stratified_data = {'strata': {}}
    for s_name in strata:
        stratified_data['strata'][s_name] = {}
        for cond in all_preds:
            stratified_data['strata'][s_name][cond] = metrics_data['metrics'][cond]['strata_metrics'][s_name]
            
    with open(STRATIFIED_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(stratified_data, f, indent=2)
    print(f"Saved {STRATIFIED_OUT_PATH}")
    
    # 5. Error Transitions
    transitions_data = {}
    for base_cond, cand_list in [('MINILM_RAW', ['MINILM_TEMP', 'MINILM_BIAS', 'MINILM_VEC']),
                                  ('DEBERTA_RAW', ['DEBERTA_TEMP', 'DEBERTA_BIAS', 'DEBERTA_VEC']),
                                  ('C0', ['MINILM_BIAS', 'DEBERTA_BIAS'])]:
        base_preds = all_preds[base_cond]
        for cand in cand_list:
            cand_preds = all_preds[cand]
            
            recovered = []
            regressed = []
            transition_counts = {
                'REFUTED_to_SUPPORTED': 0,
                'SUPPORTED_to_REFUTED': 0,
                'SUPPORTED_to_NOT_ESTABLISHED': 0,
                'REFUTED_to_NOT_ESTABLISHED': 0,
                'NOT_ESTABLISHED_to_SUPPORTED': 0,
                'NOT_ESTABLISHED_to_REFUTED': 0
            }
            
            for cid in cids:
                exp = dev_map[cid]['expected']
                p_base = base_preds[cid]['predicted']
                p_cand = cand_preds[cid]['predicted']
                
                c_base = (p_base == exp)
                c_cand = (p_cand == exp)
                
                if not c_base and c_cand:
                    recovered.append({
                        'case_id': cid,
                        'query': dev_map[cid]['query'],
                        'category': dev_map[cid].get('category'),
                        'expected': exp,
                        'base_predicted': p_base,
                        'cand_predicted': p_cand
                    })
                elif c_base and not c_cand:
                    regressed.append({
                        'case_id': cid,
                        'query': dev_map[cid]['query'],
                        'category': dev_map[cid].get('category'),
                        'expected': exp,
                        'base_predicted': p_base,
                        'cand_predicted': p_cand
                    })
                    
                if p_base != p_cand:
                    key = f"{p_base}_to_{p_cand}"
                    if key in transition_counts:
                        transition_counts[key] += 1
                        
            pair_key = f"{cand}_vs_{base_cond}"
            transitions_data[pair_key] = {
                'candidate': cand,
                'base': base_cond,
                'recovered_count': len(recovered),
                'regressed_count': len(regressed),
                'net_recovery': len(recovered) - len(regressed),
                'transitions': transition_counts,
                'recovered_cases': recovered[:20],
                'regressed_cases': regressed[:20]
            }
            
    with open(TRANSITIONS_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(transitions_data, f, indent=2)
    print(f"Saved {TRANSITIONS_OUT_PATH}")
    
    # 6. Advancement Gates Evaluation
    print("\n=======================================================")
    print("EVALUATING ADVANCEMENT GATES A-F")
    print("=======================================================")
    
    gates_summary = {}
    
    # Best candidate is MINILM_BIAS
    best_cand = 'MINILM_BIAS'
    m_best = metrics_data['metrics'][best_cand]
    m_c0 = metrics_data['metrics']['C0']
    m_raw = metrics_data['metrics']['MINILM_RAW']
    p_vs_c0 = metrics_data['statistical_tests']['MINILM_BIAS_vs_C0']['p_value']
    
    gate_a = bool(m_best['supported_recall'] >= 60.00 and m_best['supported_recall'] > m_raw['supported_recall'] + 10.0)
    gate_b = bool(m_best['far'] <= 6.00)
    gate_c = bool(m_best['ood_recall'] >= 95.00)
    gate_d = bool(p_vs_c0 >= 0.05 and m_best['accuracy'] >= m_c0['accuracy'] - 2.0)
    gate_e = bool(m_best['strata_metrics']['S2_non_antonym']['accuracy'] >= 85.00 and m_best['strata_metrics']['S4_low_overlap_paraphrase']['accuracy'] >= 60.00)
    
    # Gate F: Parameter stability across 5 folds
    minilm_stability = fits['models']['MINILM']['stability_analysis']['BIAS']
    max_rel_std = max(
        minilm_stability['b_contradiction']['rel_std_pct'],
        minilm_stability['b_entailment']['rel_std_pct'],
        minilm_stability['b_neutral']['rel_std_pct']
    )
    gate_f = bool(max_rel_std <= 25.0)
    
    all_gates_passed = gate_a and gate_b and gate_c and gate_d and gate_e and gate_f
    
    gates_summary[best_cand] = {
        'Gate_A_Supported_Recall': {'criterion': '>= 60.00%', 'value': f"{m_best['supported_recall']}%", 'passed': gate_a},
        'Gate_B_FAR_Safety': {'criterion': '<= 6.00%', 'value': f"{m_best['far']}%", 'passed': gate_b},
        'Gate_C_OOD_Recall': {'criterion': '>= 95.00%', 'value': f"{m_best['ood_recall']}%", 'passed': gate_c},
        'Gate_D_Overall_Accuracy_vs_C0': {'criterion': 'not inferior (p >= 0.05)', 'value': f"{m_best['accuracy']}% vs C0 {m_c0['accuracy']}%, p={p_vs_c0:.2e}", 'passed': gate_d},
        'Gate_E_Hard_Strata': {'criterion': 'S2 >= 85% & S4 >= 60%', 'value': f"S2={m_best['strata_metrics']['S2_non_antonym']['accuracy']}%, S4={m_best['strata_metrics']['S4_low_overlap_paraphrase']['accuracy']}%", 'passed': gate_e},
        'Gate_F_Parameter_Stability': {'criterion': 'rel_std <= 25%', 'value': f"max rel_std={max_rel_std}%", 'passed': gate_f},
        'all_gates_passed': all_gates_passed,
        'advancement_decision': 'ADVANCE' if all_gates_passed else 'REJECT',
        'blind_holdout_status': 'SEALED'
    }
    
    for g_k, g_v in gates_summary[best_cand].items():
        if isinstance(g_v, dict):
            status_str = "PASS" if g_v['passed'] else "FAIL"
            print(f"  {g_k}: {status_str} (Criterion: {g_v['criterion']}, Actual: {g_v['value']})")
            
    print(f"\nFinal Advancement Decision: {gates_summary[best_cand]['advancement_decision']}")
    print(f"Blind Holdout: {gates_summary[best_cand]['blind_holdout_status']}")
    
    decision = 'REPRESENTATION/TASK-MISMATCH' if not gate_d or not gate_b else 'CALIBRATION-LIMITATION'
    print(f"Scientific Decision: {decision}")

if __name__ == '__main__':
    main()
