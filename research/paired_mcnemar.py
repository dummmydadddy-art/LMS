"""
Paired McNemar exact test and score confidence interval calculator for EXP-0065.
"""

import sys
import json
import math
from math import comb

def exact_binom_cdf(k, n, p=0.5):
    """Cumulative distribution function for Binomial(n, p)"""
    return sum(comb(n, i) * (p ** i) * ((1 - p) ** (n - i)) for i in range(k + 1))

def compute_paired_stats(preds_a_file, preds_b_file, gold_file):
    """
    preds_a: baseline/control (e.g. C0)
    preds_b: candidate (e.g. C1)
    """
    with open(preds_a_file, 'r', encoding='utf-8') as f:
        preds_a = json.load(f)
    with open(preds_b_file, 'r', encoding='utf-8') as f:
        preds_b = json.load(f)
    with open(gold_file, 'r', encoding='utf-8') as f:
        gold_data = json.load(f)

    if isinstance(gold_data, list):
        gold = {x['id']: x['expected'] for x in gold_data}
        categories = {x['id']: x.get('category', 'UNKNOWN') for x in gold_data}
    else:
        gold = {k: v['expected'] for k, v in gold_data.items()}
        categories = {k: v.get('category', 'UNKNOWN') for k, v in gold_data.items()}

    n11 = 0 # both correct
    n00 = 0 # both wrong
    n10 = 0 # candidate (B) correct, control (A) wrong (gains)
    n01 = 0 # candidate (B) wrong, control (A) correct (regressions)

    category_contingency = {}

    for cid, exp in gold.items():
        cat = categories.get(cid, 'UNKNOWN')
        if cat not in category_contingency:
            category_contingency[cat] = {'n11': 0, 'n00': 0, 'n10': 0, 'n01': 0, 'total': 0}
        category_contingency[cat]['total'] += 1

        p_a = preds_a.get(cid, {}).get('predicted')
        p_b = preds_b.get(cid, {}).get('predicted')

        corr_a = (p_a == exp)
        corr_b = (p_b == exp)

        if corr_a and corr_b:
            n11 += 1
            category_contingency[cat]['n11'] += 1
        elif not corr_a and not corr_b:
            n00 += 1
            category_contingency[cat]['n00'] += 1
        elif corr_b and not corr_a:
            n10 += 1 # B correct, A wrong
            category_contingency[cat]['n10'] += 1
        elif corr_a and not corr_b:
            n01 += 1 # A correct, B wrong
            category_contingency[cat]['n01'] += 1

    N = len(gold)
    b = n10 # gains
    c = n01 # regressions
    discordant = b + c

    # Exact two-sided binomial test
    if discordant == 0:
        p_val = 1.0
    else:
        k = min(b, c)
        p_val = min(1.0, 2.0 * exact_binom_cdf(k, discordant, 0.5))

    delta_pct = ((b - c) / N) * 100.0

    # Wald / Score standard error for paired difference
    # SE = sqrt( (b + c) - (b - c)^2 / N ) / N
    variance = ((b + c) - ((b - c) ** 2) / N)
    se = math.sqrt(max(0.0, variance)) / N
    se_pct = se * 100.0
    z95 = 1.959964
    ci_lower = delta_pct - z95 * se_pct
    ci_upper = delta_pct + z95 * se_pct

    # One-sided 95% lower confidence bound (for non-inferiority against -3.00 pp)
    z90 = 1.644853
    lcb_95 = delta_pct - z90 * se_pct

    result = {
        'N': N,
        'both_correct_n11': n11,
        'both_wrong_n00': n00,
        'candidate_correct_control_wrong_n10': b,
        'candidate_wrong_control_correct_n01': c,
        'total_discordant': discordant,
        'mcnemar_exact_p_value': round(p_val, 6),
        'paired_accuracy_delta_pp': round(delta_pct, 2),
        'standard_error_pp': round(se_pct, 4),
        'ci_95': [round(ci_lower, 2), round(ci_upper, 2)],
        'one_sided_95_lcb_pp': round(lcb_95, 2),
        'non_inferior_to_minus_3pp': lcb_95 > -3.00,
        'category_breakdown': category_contingency
    }
    return result

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python paired_mcnemar.py <preds_control.json> <preds_candidate.json> <gold.json>")
        sys.exit(1)
    res = compute_paired_stats(sys.argv[1], sys.argv[2], sys.argv[3])
    print(json.dumps(res, indent=2))
