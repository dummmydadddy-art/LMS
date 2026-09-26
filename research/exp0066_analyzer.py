#!/usr/bin/env python3
"""
EXP-0066 Diagnostic Analyzer: Dev-Blind Generalization & Error Attribution Analysis.
Pre-registered diagnostic pipeline comparing EXP-0025 (Dev, N=400) and EXP-0033 (Blind, N=500).
Produces EXP-0066-DATASET-COMPARISON.json and EXP-0066-ERROR-STRATIFICATION.json.
"""

import json
import math
import os
import re
from collections import Counter, defaultdict

# ---------------------------------------------------------
# 1. Statistical Functions (Standard Library Pure Python)
# ---------------------------------------------------------

def norm_cdf(x):
    """Standard normal cumulative distribution function."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def get_stats(vals):
    """Compute summary statistics for continuous distribution."""
    if not vals:
        return {'mean': 0.0, 'median': 0.0, 'p95': 0.0, 'std': 0.0, 'min': 0.0, 'max': 0.0}
    s = sorted(vals)
    n = len(s)
    mean = sum(s) / n
    variance = sum((x - mean) ** 2 for x in s) / max(1, n - 1)
    std = math.sqrt(variance)
    median = s[n // 2] if n % 2 != 0 else (s[n // 2 - 1] + s[n // 2]) / 2.0
    p95 = s[min(int(0.95 * n), n - 1)]
    return {
        'mean': round(mean, 4),
        'median': round(median, 4),
        'p95': round(p95, 4),
        'std': round(std, 4),
        'min': round(s[0], 4),
        'max': round(s[-1], 4)
    }

def mann_whitney_u(x, y):
    """
    Two-sided Mann-Whitney U test with normal approximation for large sample sizes.
    Returns U, z-score, two-sided p-value, and Cliff's delta effect size.
    """
    n1, n2 = len(x), len(y)
    if n1 == 0 or n2 == 0:
        return {'u1': 0.0, 'u2': 0.0, 'z': 0.0, 'p_value': 1.0, 'cliffs_delta': 0.0}
    
    ranked = sorted([(val, 1, i) for i, val in enumerate(x)] + [(val, 2, i) for i, val in enumerate(y)])
    ranks = [0.0] * (n1 + n2)
    i = 0
    while i < len(ranked):
        j = i
        while j < len(ranked) and ranked[j][0] == ranked[i][0]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            ranks[k] = avg_rank
        i = j
        
    r1 = sum(ranks[k] for k in range(len(ranked)) if ranked[k][1] == 1)
    u1 = r1 - n1 * (n1 + 1) / 2.0
    u2 = n1 * n2 - u1
    
    mu = n1 * n2 / 2.0
    sigma = math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12.0)
    z = (u1 - mu) / sigma if sigma > 0 else 0.0
    p_val = 2.0 * (1.0 - norm_cdf(abs(z)))
    cliffs_delta = (2.0 * u1) / (n1 * n2) - 1.0
    
    return {
        'u1': float(u1),
        'u2': float(u2),
        'z': round(float(z), 4),
        'p_value': float(p_val),
        'cliffs_delta': round(float(cliffs_delta), 4)
    }

def chi2_cdf(x, df):
    """Chi-square CDF approximation using Wilson-Hilferty transformation."""
    if x <= 0:
        return 0.0
    if df == 1:
        return 2.0 * (1.0 - norm_cdf(math.sqrt(x)))
    term1 = (x / df) ** (1.0 / 3.0)
    term2 = 1.0 - 2.0 / (9.0 * df)
    denom = math.sqrt(2.0 / (9.0 * df))
    z_score = (term1 - term2) / denom
    return 1.0 - norm_cdf(z_score)

def chi2_test_2x2(a, b, c, d):
    """
    Pearson's chi-square test on 2x2 contingency table:
    [ [a, b],
      [c, d] ]
    """
    n = a + b + c + d
    row1 = a + b
    row2 = c + d
    col1 = a + c
    col2 = b + d
    if row1 == 0 or row2 == 0 or col1 == 0 or col2 == 0:
        return {'chi2': 0.0, 'p_value': 1.0}
    e_a = row1 * col1 / n
    e_b = row1 * col2 / n
    e_c = row2 * col1 / n
    e_d = row2 * col2 / n
    chi2 = (a - e_a)**2 / e_a + (b - e_b)**2 / e_b + (c - e_c)**2 / e_c + (d - e_d)**2 / e_d
    p_val = chi2_cdf(chi2, 1)
    return {'chi2': round(float(chi2), 4), 'p_value': float(p_val)}

def benjamini_hochberg(p_values):
    """
    Applies Benjamini-Hochberg procedure to control False Discovery Rate (FDR).
    Returns list of adjusted p-values matching original order.
    """
    m = len(p_values)
    if m == 0:
        return []
    sorted_pairs = sorted(enumerate(p_values), key=lambda x: x[1])
    adjusted = [0.0] * m
    min_adj = 1.0
    for rank_idx in range(m - 1, -1, -1):
        orig_idx, p = sorted_pairs[rank_idx]
        rank = rank_idx + 1
        adj = (m / rank) * p
        min_adj = min(min_adj, adj)
        adjusted[orig_idx] = min(1.0, min_adj)
    return adjusted

# ---------------------------------------------------------
# 2. Main Analyzer Engine
# ---------------------------------------------------------

class Exp0066Analyzer:
    def __init__(self, repo_root='.'):
        self.repo_root = repo_root
        self.load_data()
        self.load_antonyms()

    def load_data(self):
        with open(os.path.join(self.repo_root, 'EXP-0025-DEVELOPMENT-DATASET.json'), 'r', encoding='utf-8') as f:
            self.dev_data = json.load(f)
        with open(os.path.join(self.repo_root, 'EXP-0033-BLIND-DATASET.json'), 'r', encoding='utf-8') as f:
            self.blind_data = json.load(f)
        with open(os.path.join(self.repo_root, 'EXP-0065-DEVELOPMENT-PREDICTIONS.json'), 'r', encoding='utf-8') as f:
            self.dev_preds = json.load(f)['C0']
        with open(os.path.join(self.repo_root, 'EXP-0061-BLIND-PREDICTIONS.json'), 'r', encoding='utf-8') as f:
            self.blind_preds = json.load(f)['predictions']
        with open(os.path.join(self.repo_root, 'scratch/exp0056_dev_c1_cache.json'), 'r', encoding='utf-8') as f:
            self.dev_cache = json.load(f)
        with open(os.path.join(self.repo_root, 'scratch/exp0056_blind_c1_cache.json'), 'r', encoding='utf-8') as f:
            self.blind_cache = json.load(f)

    def load_antonyms(self):
        with open(os.path.join(self.repo_root, 'backend/rag_premise_verifier.php'), 'r', encoding='utf-8') as f:
            code = f.read()
        start = code.find('public static array $semanticOpposites = [')
        end = code.find('];', start)
        opp_str = code[start:end+2]
        self.antonym_pairs = re.findall(r"\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]", opp_str)

    def extract_features(self, query_str, top5_evidence):
        q = query_str.strip()
        words = re.findall(r'\b\w+\b', q.lower())
        chars = len(q)
        word_count = len(words)
        unique_words = len(set(words))
        unique_ratio = unique_words / max(1, word_count)
        
        # Evidence text
        ev_text = " ".join([e.get('content', '') + " " + e.get('title', '') + " " + e.get('heading', '') for e in top5_evidence]).lower()
        ev_words = set(re.findall(r'\b\w+\b', ev_text))
        
        # Overlap
        q_words_set = set(words)
        intersection = q_words_set.intersection(ev_words)
        union = q_words_set.union(ev_words)
        jaccard = len(intersection) / max(1, len(union))
        overlap_ratio = len(intersection) / max(1, len(q_words_set))
        
        # Linguistic markers
        negation = any(w in words for w in ['not', 'never', 'cannot', 'no', 'neither', 'nor', 'without', 'lacks', 'cant', "can't", "doesn't", "don't"])
        
        # Antonym marker match
        q_lower = q.lower()
        antonym_match = any((w1.lower() in q_lower or w2.lower() in q_lower) for w1, w2 in self.antonym_pairs)
        
        # Comparative
        comparative = any(w in words for w in ['more', 'less', 'better', 'worse', 'faster', 'slower', 'higher', 'lower', 'cleaner', 'superior']) or any(w.endswith('er') and len(w) > 4 for w in words)
        
        # Universal
        universal = any(w in words for w in ['always', 'all', 'every', 'never', 'none', 'only', 'must', 'universally', 'entirely', 'completely'])
        
        # Normative / Subjective
        normative = any(w in words for w in ['best', 'good', 'bad', 'should', 'recommend', 'optimal', 'prefer', 'preferable', 'acceptable', 'proper', 'cleaner'])
        
        # Conditional
        conditional = any(w in words for w in ['if', 'unless', 'when', 'suppose', 'assuming', 'provided'])
        
        # Causal
        causal = any(w in words for w in ['because', 'causes', 'due', 'results', 'leads']) or 'due to' in q_lower or 'leads to' in q_lower or 'results in' in q_lower
        
        # Question type
        first_word = words[0] if words else ''
        if first_word in ['how', 'why', 'what', 'does', 'can', 'is', 'should', 'do', 'are', 'which']:
            q_type = first_word
        else:
            q_type = 'other'
            
        # Clauses (approximate by punctuation and subordinating conjunctions)
        clauses = len(re.split(r'[,;]|\b(?:while|whereas|although|because|since|if|but|after|before)\b', q_lower))
        
        # Evidence token count & top similarity
        ev_tokens = sum(e.get('token_count', 0) for e in top5_evidence)
        top_sim = top5_evidence[0].get('similarity', 0.0) if top5_evidence else 0.0
        
        return {
            'chars': chars,
            'words': word_count,
            'unique_ratio': unique_ratio,
            'jaccard': jaccard,
            'overlap_ratio': overlap_ratio,
            'negation': negation,
            'antonym_match': antonym_match,
            'comparative': comparative,
            'universal': universal,
            'normative': normative,
            'conditional': conditional,
            'causal': causal,
            'q_type': q_type,
            'clauses': clauses,
            'ev_tokens': ev_tokens,
            'top_sim': top_sim
        }

    def run_dataset_comparison(self):
        dev_feats = [self.extract_features(q['query'], self.dev_cache.get(q['id'], {}).get('top5', [])) for q in self.dev_data]
        blind_feats = [self.extract_features(q['query'], self.blind_cache.get(q['id'], {}).get('top5', [])) for q in self.blind_data]

        continuous_keys = ['chars', 'words', 'unique_ratio', 'jaccard', 'overlap_ratio', 'clauses', 'ev_tokens', 'top_sim']
        binary_keys = ['negation', 'antonym_match', 'comparative', 'universal', 'normative', 'conditional', 'causal']
        
        raw_p_values = []
        feature_test_records = []

        # 1. Continuous Features
        cont_results = {}
        for k in continuous_keys:
            d_vals = [f[k] for f in dev_feats]
            b_vals = [f[k] for f in blind_feats]
            d_st = get_stats(d_vals)
            b_st = get_stats(b_vals)
            mwu = mann_whitney_u(d_vals, b_vals)
            cont_results[k] = {
                'development': d_st,
                'blind': b_st,
                'mann_whitney_u': mwu['u1'],
                'z_score': mwu['z'],
                'cliffs_delta': mwu['cliffs_delta'],
                'raw_p_value': mwu['p_value']
            }
            raw_p_values.append(mwu['p_value'])
            feature_test_records.append(('cont', k))

        # 2. Binary Features
        bin_results = {}
        for k in binary_keys:
            d_c = sum(1 for f in dev_feats if f[k])
            b_c = sum(1 for f in blind_feats if f[k])
            ch = chi2_test_2x2(d_c, len(self.dev_data) - d_c, b_c, len(self.blind_data) - b_c)
            bin_results[k] = {
                'development_count': d_c,
                'development_pct': round(d_c / len(self.dev_data) * 100, 2),
                'blind_count': b_c,
                'blind_pct': round(b_c / len(self.blind_data) * 100, 2),
                'chi2_stat': ch['chi2'],
                'raw_p_value': ch['p_value']
            }
            raw_p_values.append(ch['p_value'])
            feature_test_records.append(('bin', k))

        # 3. Apply Benjamini-Hochberg FDR
        adj_p_values = benjamini_hochberg(raw_p_values)
        for idx, (t, k) in enumerate(feature_test_records):
            if t == 'cont':
                cont_results[k]['fdr_adjusted_p_value'] = adj_p_values[idx]
                cont_results[k]['significant_fdr_05'] = bool(adj_p_values[idx] < 0.05)
            else:
                bin_results[k]['fdr_adjusted_p_value'] = adj_p_values[idx]
                bin_results[k]['significant_fdr_05'] = bool(adj_p_values[idx] < 0.05)

        # 4. Question Types Distribution
        d_qtypes = Counter(f['q_type'] for f in dev_feats)
        b_qtypes = Counter(f['q_type'] for f in blind_feats)
        all_qt = sorted(set(list(d_qtypes.keys()) + list(b_qtypes.keys())))
        qtype_results = {}
        for qt in all_qt:
            qtype_results[qt] = {
                'development_count': d_qtypes[qt],
                'development_pct': round(d_qtypes[qt] / len(self.dev_data) * 100, 2),
                'blind_count': b_qtypes[qt],
                'blind_pct': round(b_qtypes[qt] / len(self.blind_data) * 100, 2)
            }

        # 5. Label and Category Distributions
        dev_labels = Counter(q['expected'] for q in self.dev_data)
        blind_labels = Counter(q['expected'] for q in self.blind_data)
        dev_cats = Counter(q.get('category', 'UNKNOWN') for q in self.dev_data)
        blind_cats = Counter(q.get('category', 'UNKNOWN') for q in self.blind_data)

        # 6. Template Repetition Analysis
        def get_templates(ds):
            t_list = []
            for item in ds:
                w = re.findall(r'\b\w+\b', item['query'].lower())
                if len(w) >= 3:
                    t_list.append(" ".join(w[:3]))
            return t_list

        d_tpl = get_templates(self.dev_data)
        b_tpl = get_templates(self.blind_data)
        d_top5_pct = sum(cnt for _, cnt in Counter(d_tpl).most_common(5)) / len(self.dev_data) * 100
        b_top5_pct = sum(cnt for _, cnt in Counter(b_tpl).most_common(5)) / len(self.blind_data) * 100

        comparison_data = {
            'metadata': {
                'experiment_id': 'EXP-0066',
                'phase': 'Dev-Blind Generalization Diagnostic Study',
                'development_dataset': {
                    'filename': 'EXP-0025-DEVELOPMENT-DATASET.json',
                    'sample_size': len(self.dev_data),
                    'sha256': '8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b'
                },
                'blind_dataset': {
                    'filename': 'EXP-0033-BLIND-DATASET.json',
                    'sample_size': len(self.blind_data),
                    'sha256': '3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08'
                }
            },
            'label_distribution': {
                'development': dict(dev_labels),
                'blind': dict(blind_labels)
            },
            'category_distribution': {
                'development': dict(dev_cats),
                'blind': dict(blind_cats)
            },
            'template_regularity': {
                'dev_top5_prefix_concentration_pct': round(d_top5_pct, 2),
                'blind_top5_prefix_concentration_pct': round(b_top5_pct, 2),
                'dev_top_prefixes': Counter(d_tpl).most_common(5),
                'blind_top_prefixes': Counter(b_tpl).most_common(5)
            },
            'continuous_features': cont_results,
            'binary_linguistic_features': bin_results,
            'question_type_distribution': qtype_results
        }
        return comparison_data

    def run_error_stratification(self):
        labels = ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED']

        # 1. Confusion Matrices
        dev_corr = sum(1 for v in self.dev_preds.values() if v['predicted'] == v['expected'])
        dev_acc = dev_corr / len(self.dev_preds)
        dev_cm = Counter((v['expected'], v['predicted']) for v in self.dev_preds.values())

        blind_corr_b0 = sum(1 for v in self.blind_preds.values() if v['b0']['predicted'] == v['expected'])
        blind_acc_b0 = blind_corr_b0 / len(self.blind_preds)
        blind_cm_b0 = Counter((v['expected'], v['b0']['predicted']) for v in self.blind_preds.values())

        blind_corr_b1 = sum(1 for v in self.blind_preds.values() if v['b1']['predicted'] == v['expected'])
        blind_acc_b1 = blind_corr_b1 / len(self.blind_preds)
        blind_cm_b1 = Counter((v['expected'], v['b1']['predicted']) for v in self.blind_preds.values())

        # 2. Category Level Breakdown
        dev_cat_stats = defaultdict(lambda: {'n': 0, 'correct': 0, 'errors': Counter()})
        for v in self.dev_preds.values():
            cat = v['category']
            dev_cat_stats[cat]['n'] += 1
            if v['predicted'] == v['expected']:
                dev_cat_stats[cat]['correct'] += 1
            else:
                dev_cat_stats[cat]['errors'][f"{v['expected']}->{v['predicted']}"] += 1

        blind_cat_stats = defaultdict(lambda: {'n': 0, 'correct_b0': 0, 'correct_b1': 0, 'errors_b0': Counter()})
        for v in self.blind_preds.values():
            cat = v['category']
            blind_cat_stats[cat]['n'] += 1
            if v['b0']['predicted'] == v['expected']:
                blind_cat_stats[cat]['correct_b0'] += 1
            else:
                blind_cat_stats[cat]['errors_b0'][f"{v['expected']}->{v['b0']['predicted']}"] += 1
            if v['b1']['predicted'] == v['expected']:
                blind_cat_stats[cat]['correct_b1'] += 1

        # 3. Length Tercile Stratification (Short < 11 words, Med 11-15, Long > 15)
        def get_length_bin(words_count):
            if words_count < 11:
                return 'SHORT (<11 words)'
            elif words_count <= 15:
                return 'MEDIUM (11-15 words)'
            else:
                return 'LONG (>15 words)'

        dev_len_stats = defaultdict(lambda: {'n': 0, 'correct': 0})
        for v in self.dev_preds.values():
            wc = len(re.findall(r'\b\w+\b', v['query']))
            lb = get_length_bin(wc)
            dev_len_stats[lb]['n'] += 1
            if v['predicted'] == v['expected']:
                dev_len_stats[lb]['correct'] += 1

        blind_len_stats = defaultdict(lambda: {'n': 0, 'correct_b0': 0})
        for v in self.blind_preds.values():
            wc = len(re.findall(r'\b\w+\b', v['query']))
            lb = get_length_bin(wc)
            blind_len_stats[lb]['n'] += 1
            if v['b0']['predicted'] == v['expected']:
                blind_len_stats[lb]['correct_b0'] += 1

        # 4. False-Premise Generalization Breakdown
        dev_fp = [v for v in self.dev_preds.values() if v['expected'] == 'REFUTED']
        blind_fp = [v for v in self.blind_preds.values() if v['expected'] == 'REFUTED']

        def has_antonym(q_str):
            ql = q_str.lower()
            return any((w1.lower() in ql or w2.lower() in ql) for w1, w2 in self.antonym_pairs)

        dev_fp_ant = [v for v in dev_fp if has_antonym(v['query'])]
        dev_fp_no_ant = [v for v in dev_fp if not has_antonym(v['query'])]
        blind_fp_ant = [v for v in blind_fp if has_antonym(v['query'])]
        blind_fp_no_ant = [v for v in blind_fp if not has_antonym(v['query'])]

        fp_breakdown = {
            'development': {
                'total_refuted': len(dev_fp),
                'antonym_cue_present': {
                    'count': len(dev_fp_ant),
                    'pct': round(len(dev_fp_ant) / len(dev_fp) * 100, 2),
                    'correct': sum(1 for v in dev_fp_ant if v['predicted'] == 'REFUTED'),
                    'accuracy': round(sum(1 for v in dev_fp_ant if v['predicted'] == 'REFUTED') / len(dev_fp_ant), 4),
                    'false_acceptance_to_sup': sum(1 for v in dev_fp_ant if v['predicted'] == 'SUPPORTED'),
                    'abstention_to_ne': sum(1 for v in dev_fp_ant if v['predicted'] == 'NOT_ESTABLISHED')
                },
                'antonym_cue_absent': {
                    'count': len(dev_fp_no_ant),
                    'pct': round(len(dev_fp_no_ant) / len(dev_fp) * 100, 2),
                    'correct': sum(1 for v in dev_fp_no_ant if v['predicted'] == 'REFUTED'),
                    'accuracy': round(sum(1 for v in dev_fp_no_ant if v['predicted'] == 'REFUTED') / len(dev_fp_no_ant), 4),
                    'false_acceptance_to_sup': sum(1 for v in dev_fp_no_ant if v['predicted'] == 'SUPPORTED'),
                    'abstention_to_ne': sum(1 for v in dev_fp_no_ant if v['predicted'] == 'NOT_ESTABLISHED')
                }
            },
            'blind': {
                'total_refuted': len(blind_fp),
                'antonym_cue_present': {
                    'count': len(blind_fp_ant),
                    'pct': round(len(blind_fp_ant) / len(blind_fp) * 100, 2),
                    'correct': sum(1 for v in blind_fp_ant if v['b0']['predicted'] == 'REFUTED'),
                    'accuracy': round(sum(1 for v in blind_fp_ant if v['b0']['predicted'] == 'REFUTED') / len(blind_fp_ant), 4),
                    'false_acceptance_to_sup': sum(1 for v in blind_fp_ant if v['b0']['predicted'] == 'SUPPORTED'),
                    'abstention_to_ne': sum(1 for v in blind_fp_ant if v['b0']['predicted'] == 'NOT_ESTABLISHED')
                },
                'antonym_cue_absent': {
                    'count': len(blind_fp_no_ant),
                    'pct': round(len(blind_fp_no_ant) / len(blind_fp) * 100, 2),
                    'correct': sum(1 for v in blind_fp_no_ant if v['b0']['predicted'] == 'REFUTED'),
                    'accuracy': round(sum(1 for v in blind_fp_no_ant if v['b0']['predicted'] == 'REFUTED') / len(blind_fp_no_ant), 4),
                    'false_acceptance_to_sup': sum(1 for v in blind_fp_no_ant if v['b0']['predicted'] == 'SUPPORTED'),
                    'abstention_to_ne': sum(1 for v in blind_fp_no_ant if v['b0']['predicted'] == 'NOT_ESTABLISHED')
                }
            }
        }

        # 5. Error Attribution Taxonomy (Blind N=136 errors)
        blind_errors = [v for v in self.blind_preds.values() if v['b0']['predicted'] != v['expected']]
        attribution_counts = defaultdict(int)
        attribution_cases = defaultdict(list)

        for err in blind_errors:
            cid = err['case_id']
            cat = err['category']
            exp = err['expected']
            pred = err['b0']['predicted']
            tier = err['b0'].get('decision_tier', '')
            reason = err['b0'].get('decision_reason', '')
            cache_entry = self.blind_cache.get(cid, {})
            top5 = cache_entry.get('top5', [])
            top_sim = top5[0]['similarity'] if top5 else 0.0

            # Rule A/B: Retrieval
            if top_sim < 0.26 or 'maxSim < 0.26' in reason or 'Zero or insufficient evidence available in approved curriculum' in reason:
                code = 'B_RETRIEVAL_DEFICIENT'
                conf = 'High'
                desc = f'Evidence absent from top-5 (maxSim={top_sim:.3f})'
            # Rule D: Ambiguity Guard failure / misrouting
            elif cat == 'AMBIGUOUS' and exp == 'NOT_ESTABLISHED' and pred in ['SUPPORTED', 'REFUTED']:
                code = 'D_AMBIGUITY_GUARD_MISROUTING'
                conf = 'High'
                desc = f'Ambiguity Guard failed on in-curriculum ambiguous query; passed to {tier}'
            elif tier == 'TIER_2_AMBIGUITY_GUARD' and exp == 'SUPPORTED':
                code = 'D_AMBIGUITY_GUARD_FALSE_ALARM'
                conf = 'High'
                desc = 'Ambiguity Guard falsely triggered on factual supported query'
            # Rule C: Verifier wrong despite evidence present
            elif tier == 'TIER_1_DETERMINISTIC':
                code = 'C1_VERIFIER_TIER1_COLLISION'
                conf = 'High'
                desc = f'Tier-1 fast path collision on evidence terms ({reason[:45]})'
            elif tier == 'TIER_2_SEMANTIC_NLI':
                if exp == 'REFUTED' and pred == 'SUPPORTED':
                    code = 'C2_VERIFIER_TIER2_FALSE_ACCEPTANCE'
                    conf = 'High'
                    desc = 'Tier-2 NLI affirmed false premise (sycophancy / subtle contradiction failure)'
                elif exp == 'SUPPORTED' and pred == 'REFUTED':
                    code = 'C3_VERIFIER_TIER2_FALSE_REJECTION'
                    conf = 'High'
                    desc = 'Tier-2 NLI over-rejected valid claim (semantic hyper-skepticism)'
                else:
                    code = 'C5_VERIFIER_TIER2_OTHER'
                    conf = 'Medium'
                    desc = f'Tier-2 NLI classification error ({exp}->{pred})'
            elif tier == 'TIER_2_ABSTENTION':
                code = 'C4_VERIFIER_TIER2_ABSTENTION'
                conf = 'High'
                desc = f'Tier-2 NLI epistemic abstention on {exp}'
            else:
                code = 'E_UNKNOWN'
                conf = 'Low'
                desc = 'Unclassified borderline error'

            attribution_counts[code] += 1
            attribution_cases[code].append({
                'case_id': cid,
                'query': err['query'],
                'category': cat,
                'expected': exp,
                'predicted': pred,
                'tier': tier,
                'confidence': conf,
                'description': desc
            })

        stratification_data = {
            'metadata': {
                'experiment_id': 'EXP-0066',
                'phase': 'Error Stratification & Attribution Diagnostic',
                'reference_models': {
                    'development': 'C0 (llama3.2:latest, frozen A4)',
                    'blind_b0': 'B0 (un-gated frozen A4 reference)',
                    'blind_b1': 'B1 (structural coherence gated A4)'
                }
            },
            'overall_accuracies': {
                'development_c0': round(dev_acc, 4),
                'blind_b0': round(blind_acc_b0, 4),
                'blind_b1': round(blind_acc_b1, 4),
                'dev_blind_gap': round(dev_acc - blind_acc_b0, 4)
            },
            'confusion_matrices': {
                'development_c0': {
                    f"{exp}->{pred}": dev_cm.get((exp, pred), 0)
                    for exp in labels for pred in labels
                },
                'blind_b0': {
                    f"{exp}->{pred}": blind_cm_b0.get((exp, pred), 0)
                    for exp in labels for pred in labels
                },
                'blind_b1': {
                    f"{exp}->{pred}": blind_cm_b1.get((exp, pred), 0)
                    for exp in labels for pred in labels
                }
            },
            'category_stratification': {
                'development': {
                    cat: {
                        'n': s['n'],
                        'accuracy': round(s['correct'] / s['n'], 4),
                        'errors': dict(s['errors'])
                    } for cat, s in dev_cat_stats.items()
                },
                'blind': {
                    cat: {
                        'n': s['n'],
                        'accuracy_b0': round(s['correct_b0'] / s['n'], 4),
                        'accuracy_b1': round(s['correct_b1'] / s['n'], 4),
                        'errors_b0': dict(s['errors_b0'])
                    } for cat, s in blind_cat_stats.items()
                }
            },
            'length_stratification': {
                'development': {
                    lb: {'n': s['n'], 'accuracy': round(s['correct'] / s['n'], 4)}
                    for lb, s in dev_len_stats.items()
                },
                'blind': {
                    lb: {'n': s['n'], 'accuracy': round(s['correct_b0'] / s['n'], 4)}
                    for lb, s in blind_len_stats.items()
                }
            },
            'false_premise_antonym_stratification': fp_breakdown,
            'error_attribution_taxonomy': {
                'total_blind_errors': len(blind_errors),
                'summary_counts': {
                    code: {
                        'count': count,
                        'pct_of_errors': round(count / len(blind_errors) * 100, 2),
                        'pct_of_all_blind': round(count / len(self.blind_preds) * 100, 2)
                    } for code, count in sorted(attribution_counts.items(), key=lambda x: -x[1])
                },
                'high_level_attribution': {
                    'A_retrieval_supported_total': len(self.blind_preds) - attribution_counts.get('B_RETRIEVAL_DEFICIENT', 0),
                    'B_retrieval_deficient': attribution_counts.get('B_RETRIEVAL_DEFICIENT', 0),
                    'C_verifier_wrong_evidence_present': (
                        attribution_counts.get('C1_VERIFIER_TIER1_COLLISION', 0) +
                        attribution_counts.get('C2_VERIFIER_TIER2_FALSE_ACCEPTANCE', 0) +
                        attribution_counts.get('C3_VERIFIER_TIER2_FALSE_REJECTION', 0) +
                        attribution_counts.get('C4_VERIFIER_TIER2_ABSTENTION', 0) +
                        attribution_counts.get('C5_VERIFIER_TIER2_OTHER', 0)
                    ),
                    'D_ambiguity_guard_error': (
                        attribution_counts.get('D_AMBIGUITY_GUARD_MISROUTING', 0) +
                        attribution_counts.get('D_AMBIGUITY_GUARD_FALSE_ALARM', 0)
                    ),
                    'E_unknown': attribution_counts.get('E_UNKNOWN', 0)
                },
                'sample_cases': {
                    code: cases[:5] for code, cases in attribution_cases.items()
                }
            }
        }
        return stratification_data

    def generate_artifacts(self):
        print("Running dataset comparison analysis...")
        ds_comp = self.run_dataset_comparison()
        ds_comp_path = os.path.join(self.repo_root, 'EXP-0066-DATASET-COMPARISON.json')
        with open(ds_comp_path, 'w', encoding='utf-8') as f:
            json.dump(ds_comp, f, indent=2)
        print(f"Saved {ds_comp_path}")

        print("Running error stratification & attribution analysis...")
        err_strat = self.run_error_stratification()
        err_strat_path = os.path.join(self.repo_root, 'EXP-0066-ERROR-STRATIFICATION.json')
        with open(err_strat_path, 'w', encoding='utf-8') as f:
            json.dump(err_strat, f, indent=2)
        print(f"Saved {err_strat_path}")

        return ds_comp, err_strat

if __name__ == '__main__':
    analyzer = Exp0066Analyzer()
    analyzer.generate_artifacts()
    print("EXP-0066 diagnostic analysis complete.")
