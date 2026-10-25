"""
EXP-0069: NLI Probability Calibration and Decision-Boundary Engine
Implements 5-fold cross-fitting, multiclass cross-entropy calibration fitting (Temperature, Class-Bias, Vector Scaling),
out-of-fold inference, ECE/Brier/NLL calibration metrics, S1-S7 stratified analysis, exact McNemar tests,
error transition analysis, and advancement gate checks.
"""

import json
import math
import os
import sys
import numpy as np
from scipy.optimize import minimize
from scipy.stats import binom

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Paths
DEV_DATASET_PATH = os.path.join(ROOT_DIR, 'EXP-0025-DEVELOPMENT-DATASET.json')
FOLDS_PATH = os.path.join(ROOT_DIR, 'scratch', 'exp0069_folds.json')
CASE_LOGITS_PATH = os.path.join(ROOT_DIR, 'scratch', 'exp0069_case_logits_trace.jsonl')
TRACER_RESULTS_PATH = os.path.join(ROOT_DIR, 'scratch', 'exp0069_tracer_results.json')
EXP0065_PREDS_PATH = os.path.join(ROOT_DIR, 'EXP-0065-DEVELOPMENT-PREDICTIONS.json')
EXP0068_PREDS_PATH = os.path.join(ROOT_DIR, 'EXP-0068-DEVELOPMENT-PREDICTIONS.json')

# Output artifact paths
FITS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-CALIBRATION-FITS.json')
PREDS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-DEVELOPMENT-PREDICTIONS.json')
METRICS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-DEVELOPMENT-METRICS.json')
CALIB_ANALYSIS_PATH = os.path.join(ROOT_DIR, 'EXP-0069-CALIBRATION-ANALYSIS.json')
STRATIFIED_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-STRATIFIED-ANALYSIS.json')
TRANSITIONS_OUT_PATH = os.path.join(ROOT_DIR, 'EXP-0069-ERROR-TRANSITIONS.json')

# Canonical Classes:
# 0: CONTRADICTION -> REFUTED
# 1: ENTAILMENT    -> SUPPORTED
# 2: NEUTRAL       -> NOT_ESTABLISHED
CLASS_NAMES = ['CONTRADICTION', 'ENTAILMENT', 'NEUTRAL']
STATUS_NAMES = ['REFUTED', 'SUPPORTED', 'NOT_ESTABLISHED']
STATUS_TO_IDX = {'REFUTED': 0, 'SUPPORTED': 1, 'NOT_ESTABLISHED': 2}
IDX_TO_STATUS = {0: 'REFUTED', 1: 'SUPPORTED', 2: 'NOT_ESTABLISHED'}

def softmax(z):
    z = np.array(z, dtype=np.float64)
    # Numerical stability
    shiftz = z - np.max(z, axis=-1, keepdims=True)
    exps = np.exp(shiftz)
    return exps / np.sum(exps, axis=-1, keepdims=True)

def nll_loss_temperature(T, logits, targets, lambda_reg=1e-3):
    T_val = T[0]
    scaled_z = logits / T_val
    probs = softmax(scaled_z)
    eps = 1e-12
    n = len(targets)
    loss = -np.mean([np.log(max(probs[i, targets[i]], eps)) for i in range(n)])
    reg = lambda_reg * ((T_val - 1.0) ** 2)
    return loss + reg

def nll_loss_bias(b, logits, targets, lambda_reg=1e-2):
    b = np.array(b)
    scaled_z = logits + b
    probs = softmax(scaled_z)
    eps = 1e-12
    n = len(targets)
    loss = -np.mean([np.log(max(probs[i, targets[i]], eps)) for i in range(n)])
    reg = lambda_reg * np.sum(b ** 2)
    return loss + reg

def nll_loss_vector(params, logits, targets, lambda_a=5e-2, lambda_b=1e-2):
    a = np.array(params[:3])
    b = np.array(params[3:])
    scaled_z = a * logits + b
    probs = softmax(scaled_z)
    eps = 1e-12
    n = len(targets)
    loss = -np.mean([np.log(max(probs[i, targets[i]], eps)) for i in range(n)])
    reg = lambda_a * np.sum((a - 1.0) ** 2) + lambda_b * np.sum(b ** 2)
    return loss + reg

def compute_calibration_metrics(probs, targets):
    n = len(targets)
    eps = 1e-12
    # 1. NLL
    nll = float(-np.mean([np.log(max(probs[i, targets[i]], eps)) for i in range(n)]))
    
    # 2. Brier Score
    one_hot = np.zeros_like(probs)
    for i, t in enumerate(targets):
        one_hot[i, t] = 1.0
    brier = float(np.mean(np.sum((probs - one_hot) ** 2, axis=1)))
    
    # 3. ECE & MCE (10 equal-width confidence bins)
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = (predictions == np.array(targets)).astype(float)
    
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
            
    # 4. Entropy
    entropy = float(-np.mean(np.sum(probs * np.log(np.maximum(probs, eps)), axis=1)))
    
    # 5. Margin (top 1 - top 2)
    sorted_p = np.sort(probs, axis=1)
    margins = sorted_p[:, -1] - sorted_p[:, -2]
    mean_margin = float(np.mean(margins))
    mean_conf = float(np.mean(confidences))
    
    return {
        'nll': round(nll, 4),
        'brier_score': round(brier, 4),
        'ece': round(ece * 100, 2),
        'mce': round(mce * 100, 2),
        'mean_entropy': round(entropy, 4),
        'mean_margin': round(mean_margin, 4),
        'mean_confidence': round(mean_conf * 100, 2),
        'reliability_bins': bins_data
    }

def mcnemar_test(corr_ref, corr_cand):
    n00 = n01 = n10 = n11 = 0
    for r, c in zip(corr_ref, corr_cand):
        if r and c:
            n11 += 1
        elif r and not c:
            n10 += 1  # ref correct, cand wrong
        elif not r and c:
            n01 += 1  # ref wrong, cand correct
        else:
            n00 += 1
            
    disc = n01 + n10
    if disc == 0:
        p_val = 1.0
    else:
        k = min(n01, n10)
        p_val = 2.0 * float(binom.cdf(k, disc, 0.5))
        p_val = min(1.0, p_val)
        
    n = len(corr_ref)
    delta = (sum(corr_cand) - sum(corr_ref)) / n * 100.0
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

def calculate_classification_metrics(predictions_list, ground_truth_list):
    n = len(predictions_list)
    correct_count = sum(1 for p, g in zip(predictions_list, ground_truth_list) if p == g)
    accuracy = (correct_count / n) * 100.0 if n > 0 else 0.0
    
    # Confusion matrix: expected -> predicted
    cm = {
        'SUPPORTED': {'SUPPORTED': 0, 'REFUTED': 0, 'NOT_ESTABLISHED': 0},
        'REFUTED': {'SUPPORTED': 0, 'REFUTED': 0, 'NOT_ESTABLISHED': 0},
        'NOT_ESTABLISHED': {'SUPPORTED': 0, 'REFUTED': 0, 'NOT_ESTABLISHED': 0}
    }
    for p, g in zip(predictions_list, ground_truth_list):
        if g in cm and p in cm[g]:
            cm[g][p] += 1
            
    # Class metrics
    class_metrics = {}
    f1_sum = 0.0
    for cls in ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED']:
        tp = cm[cls][cls]
        fn = sum(cm[cls][other] for other in ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED'] if other != cls)
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
    # FAR: Refuted or Not-Established claims accepted as Supported / Total Refuted + Not-Established
    total_neg = (sum(cm['REFUTED'].values()) + sum(cm['NOT_ESTABLISHED'].values()))
    false_accepts = cm['REFUTED']['SUPPORTED'] + cm['NOT_ESTABLISHED']['SUPPORTED']
    far = (false_accepts / total_neg * 100.0) if total_neg > 0 else 0.0
    
    # FRR: Supported claims rejected as Refuted / Total Supported claims
    total_sup = sum(cm['SUPPORTED'].values())
    false_rejects = cm['SUPPORTED']['REFUTED']
    frr = (false_rejects / total_sup * 100.0) if total_sup > 0 else 0.0
    
    # False abstentions: Supported claims labeled NOT_ESTABLISHED
    false_abstentions = cm['SUPPORTED']['NOT_ESTABLISHED']
    
    sup_recall = class_metrics['SUPPORTED']['recall']
    ref_recall = class_metrics['REFUTED']['recall']
    ood_recall = class_metrics['NOT_ESTABLISHED']['recall']
    
    return {
        'total': n,
        'correct': correct_count,
        'accuracy': round(accuracy, 2),
        'macro_f1': round(macro_f1, 2),
        'supported_recall': round(sup_recall, 2),
        'refutation_recall': round(ref_recall, 2),
        'ood_recall': round(ood_recall, 2),
        'far': round(far, 2),
        'frr': round(frr, 2),
        'false_abstention_count': false_abstentions,
        'false_acceptance_count': false_accepts,
        'false_rejection_count': false_rejects,
        'confusion_matrix': cm,
        'class_metrics': class_metrics
    }

print("Calibration engine module loaded successfully.")
