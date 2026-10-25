"""
EXP-0071 State Representation & Discrete Evidence State Classifier
Extracts reproducible 22-dimensional state vector from queries, retrieved evidence, and cheap NLI outputs.
Categorizes claims into discrete evidence states E0..E5.
"""

import re
import math
import numpy as np

# Universal quantifiers and strong modality markers
UNIVERSAL_QUANTIFIERS = {
    'all', 'every', 'always', 'never', 'none', 'any', 'solely', 
    'exclusively', 'entirely', 'must', 'only', 'completely', 'forever'
}

# Negation and contradiction keywords
NEGATION_KEYWORDS = {
    'not', 'no', 'never', 'cannot', "can't", "doesn't", "isn't", 
    'neither', 'nor', 'false', 'incorrect', 'unsupported', 'disallowed',
    'prohibited', 'fails', 'invalid', 'unable'
}

# Subjective / ambiguity keywords
AMBIGUITY_KEYWORDS = {
    'best', 'worst', 'better', 'worse', 'easier', 'harder', 'fastest',
    'simplest', 'superior', 'inferior', 'opinion', 'preferred', 'favorite',
    'should', 'nice', 'cool', 'ugly', 'cleaner'
}

# Common antonym pairs for contradiction signaling
ANTONYM_PAIRS = [
    ('mutable', 'immutable'),
    ('synchronous', 'asynchronous'),
    ('sync', 'async'),
    ('client', 'server'),
    ('frontend', 'backend'),
    ('row', 'column'),
    ('block', 'inline'),
    ('relative', 'absolute'),
    ('get', 'post'),
    ('stateless', 'stateful'),
    ('primary', 'foreign'),
    ('ascending', 'descending'),
    ('asc', 'desc'),
    ('ordered', 'unordered'),
    ('shallow', 'deep'),
    ('static', 'dynamic'),
    ('lossless', 'lossy')
]

def tokenize_words(text):
    return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_\-\.:]+\b', text)]

def compute_jaccard(tokens_a, tokens_b):
    set_a = set(w for w in tokens_a if len(w) > 2)
    set_b = set(w for w in tokens_b if len(w) > 2)
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return float(intersection) / float(union) if union > 0 else 0.0

def compute_entropy(probs):
    ent = 0.0
    for p in probs:
        if p > 1e-9:
            ent -= p * math.log2(p)
    # Normalize by log2(3) so range is [0, 1]
    return ent / math.log2(3.0)

def detect_antonym_contradiction(query_tokens, evidence_text):
    evidence_lower = evidence_text.lower()
    q_set = set(query_tokens)
    for w1, w2 in ANTONYM_PAIRS:
        if w1 in q_set and re.search(r'\b' + re.escape(w2) + r'\b', evidence_lower):
            return 1.0
        if w2 in q_set and re.search(r'\b' + re.escape(w1) + r'\b', evidence_lower):
            return 1.0
    return 0.0

def extract_state_features(case_id, query, category, top5_chunks, cheap_nli_record=None, tier1_record=None):
    """
    Extracts 22 state features from the query, retrieved evidence, and verifier outputs.
    """
    q_words = tokenize_words(query)
    q_len = len(q_words)
    
    # 1. Query features
    is_question = 1.0 if (query.strip().endswith('?') or 
                          (len(q_words) > 0 and q_words[0] in {'what', 'how', 'why', 'when', 'where', 'which', 'who', 'is', 'are', 'can', 'does', 'do'})) else 0.0
    has_universal = 1.0 if any(w in UNIVERSAL_QUANTIFIERS for w in q_words) else 0.0
    
    # Clause count (commas, semicolons, and, but, or)
    clause_delims = len(re.findall(r'[,;]|\b(?:and|but|or|whereas|although|however)\b', query.lower()))
    clause_count = 1 + clause_delims
    
    # 2. Retrieval features
    chunks = top5_chunks or []
    chunk_count = len(chunks)
    top_score = float(chunks[0].get('similarity', 0.0)) if chunk_count > 0 else 0.0
    second_score = float(chunks[1].get('similarity', 0.0)) if chunk_count > 1 else top_score
    margin_top2 = max(0.0, top_score - second_score)
    
    combined_evidence = " ".join([c.get('content', '') for c in chunks])
    avg_chunk_len = (sum(len(c.get('content', '')) for c in chunks) / chunk_count) if chunk_count > 0 else 0.0
    distinct_sources = len(set(c.get('title', '') for c in chunks))
    
    # 3. Evidence sufficiency features
    ev_words = tokenize_words(combined_evidence)
    overlap = compute_jaccard(q_words, ev_words)
    neg_count = sum(1 for w in ev_words if w in NEGATION_KEYWORDS)
    contradiction_signal = detect_antonym_contradiction(q_words, combined_evidence)
    
    # Epistemic coherence: top chunk overlap
    top_chunk_words = tokenize_words(chunks[0].get('content', '')) if chunk_count > 0 else []
    epistemic_coherence = compute_jaccard(q_words, top_chunk_words)
    
    # 4. Cheap NLI features
    cheap_invoked = 1.0 if cheap_nli_record is not None else 0.0
    if cheap_nli_record:
        probs = cheap_nli_record.get('probabilities', {})
        p_contra = float(probs.get('CONTRADICTION', 0.0))
        p_entail = float(probs.get('ENTAILMENT', 0.0))
        p_neut = float(probs.get('NEUTRAL', 0.0))
        prob_list = [p_contra, p_entail, p_neut]
        sorted_probs = sorted(prob_list)
        winning_conf = sorted_probs[-1]
        nli_margin = sorted_probs[-1] - sorted_probs[-2]
        entropy = compute_entropy(prob_list)
        
        lbl = cheap_nli_record.get('predicted_label', 'NEUTRAL')
        pred_code = 0.0 if lbl == 'CONTRADICTION' else (1.0 if lbl == 'ENTAILMENT' else 2.0)
    else:
        p_contra = 0.0
        p_entail = 0.0
        p_neut = 0.0
        winning_conf = 0.0
        nli_margin = 0.0
        entropy = 1.0
        pred_code = -1.0
        
    # 5. Discrete evidence state determination (E0..E5)
    # Check E0 (Ambiguity)
    is_ambiguous = any(w in AMBIGUITY_KEYWORDS for w in q_words)
    if tier1_record and tier1_record.get('ambiguity_detected', False):
        is_ambiguous = True
        
    # Check E1 (Tier-1 deterministic match)
    is_tier1 = False
    if tier1_record and tier1_record.get('tier1_match', False):
        is_tier1 = True
    elif contradiction_signal > 0.5:
        is_tier1 = True
        
    # Check E5 (OOD / Insufficient)
    is_ood = (top_score < 0.45 or category == 'OUT_OF_DOMAIN')
    
    if is_ambiguous:
        discrete_state = 'E0_AMBIGUOUS'
        state_code = 0
    elif is_tier1:
        discrete_state = 'E1_TIER1_MATCH'
        state_code = 1
    elif is_ood:
        discrete_state = 'E5_INSUFFICIENT_OOD'
        state_code = 5
    elif cheap_invoked and (contradiction_signal > 0.0 or (has_universal > 0.0 and p_entail < 0.85)):
        discrete_state = 'E4_CONFLICTING_EVIDENCE'
        state_code = 4
    elif cheap_invoked and (winning_conf >= 0.82 and nli_margin >= 0.40):
        discrete_state = 'E2_HIGH_CONF_CHEAP'
        state_code = 2
    else:
        discrete_state = 'E3_LOW_MARGIN_CHEAP'
        state_code = 3
        
    feature_dict = {
        'case_id': case_id,
        'query_token_count': q_len,
        'query_is_question': is_question,
        'query_has_universal_quantifier': has_universal,
        'query_clause_count': clause_count,
        'retrieval_top_score': round(top_score, 4),
        'retrieval_margin_top2': round(margin_top2, 4),
        'retrieval_chunk_count': chunk_count,
        'retrieval_avg_chunk_length': round(avg_chunk_len, 2),
        'retrieval_distinct_sources': distinct_sources,
        'evidence_entity_overlap': round(overlap, 4),
        'evidence_negation_count': neg_count,
        'evidence_epistemic_coherence': round(epistemic_coherence, 4),
        'evidence_contradiction_signal': contradiction_signal,
        'cheap_nli_invoked': cheap_invoked,
        'cheap_nli_p_contradiction': round(p_contra, 4),
        'cheap_nli_p_entailment': round(p_entail, 4),
        'cheap_nli_p_neutral': round(p_neut, 4),
        'cheap_nli_winning_conf': round(winning_conf, 4),
        'cheap_nli_margin_top2': round(nli_margin, 4),
        'cheap_nli_entropy': round(entropy, 4),
        'cheap_nli_pred_code': pred_code,
        'discrete_evidence_state': discrete_state,
        'state_code': state_code
    }
    
    # Vector for scikit-learn models (excluding metadata strings)
    feature_vector = np.array([
        float(q_len),
        is_question,
        has_universal,
        float(clause_count),
        top_score,
        margin_top2,
        float(chunk_count),
        avg_chunk_len,
        float(distinct_sources),
        overlap,
        float(neg_count),
        epistemic_coherence,
        contradiction_signal,
        cheap_invoked,
        p_contra,
        p_entail,
        p_neut,
        winning_conf,
        nli_margin,
        entropy,
        pred_code,
        float(state_code)
    ], dtype=np.float32)
    
    return feature_dict, feature_vector
