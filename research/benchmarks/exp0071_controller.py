"""
EXP-0071 Adaptive Verification Controller (AVC)
Implements Policy P0 (Fixed-Rule Heuristic) and Policy P1 (Learned Cost-Sensitive Classifier),
with budget accounting (B=1, 2, 3), targeted counter-evidence retrieval (A2), and ablations C4, C5.
"""

import os
import json
import time
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from research.benchmarks.exp0071_state import extract_state_features
from research.benchmarks.exp0071_counter_evidence import get_counter_evidence_retriever

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Action definitions
ACTION_NAMES = {
    0: 'A0_FAST_PATH',
    1: 'A1_CHEAP_NLI',
    2: 'A2_COUNTER_EVIDENCE',
    3: 'A3_EXPENSIVE_LLM',
    4: 'A4_ABSTAIN',
    5: 'A5_CONSENSUS'
}

ACTION_COSTS = {
    0: 0,
    1: 1,
    2: 1,
    3: 2,
    4: 0,
    5: 1
}

# Average latency benchmarks from empirical lineage
LATENCY_COSTS_MS = {
    'A0': 0.5,       # Fast-path deterministic regex / table lookup
    'A1': 42.44,     # MiniLM cross-encoder inference
    'A2': 8.50,      # Counter-evidence BM25 search
    'A3': 1196.42,   # llama3.2 Ollama call
    'A4': 0.1,       # Epistemic abstention
    'A5': 45.00      # Re-verification with counter-evidence
}

class AdaptiveVerificationController:
    """
    Adaptive Verification Controller managing multi-tier verification budget allocation.
    """
    def __init__(self, policy='P1', budget=3, disable_counter_evidence=False, disable_evidence_sufficiency=False, random_state=42):
        self.policy = policy
        self.max_budget = budget
        self.disable_counter_evidence = disable_counter_evidence
        self.disable_evidence_sufficiency = disable_evidence_sufficiency
        self.random_state = random_state
        self.clf = None
        self.counter_retriever = get_counter_evidence_retriever()

    def train_fold(self, X_train, y_train):
        """Fits learned routing classifier on in-fold training split."""
        if self.disable_evidence_sufficiency:
            # Mask out evidence sufficiency features (indices 9, 10, 11, 12)
            X_train = np.copy(X_train)
            X_train[:, 9:13] = 0.0

        # Cost-sensitive Random Forest with balanced class weighting
        self.clf = RandomForestClassifier(
            n_estimators=120,
            max_depth=7,
            min_samples_split=4,
            class_weight='balanced',
            random_state=self.random_state
        )
        self.clf.fit(X_train, y_train)

    def route_p0(self, case_id, feature_dict, feature_vec, c1_pred, c0_pred, top5_chunks):
        """
        Executes Policy P0 (Fixed-rule heuristic cascade) under current budget.
        """
        spent_cost = 0
        actions_taken = []
        action_latencies = []
        
        # Step 0: Fast paths (Cost 0)
        state_code = feature_dict['state_code']
        if state_code == 0:  # Ambiguous
            actions_taken.append('A0_FAST_PATH')
            action_latencies.append(LATENCY_COSTS_MS['A0'])
            return {
                'predicted': 'NOT_ESTABLISHED',
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Ambiguity guard trigger (A0)'
            }
            
        if state_code == 1:  # Tier-1 match
            actions_taken.append('A0_FAST_PATH')
            action_latencies.append(LATENCY_COSTS_MS['A0'])
            pred_val = c1_pred['predicted']
            return {
                'predicted': pred_val,
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Tier-1 deterministic match (A0)'
            }
            
        if state_code == 5:  # OOD
            actions_taken.append('A4_ABSTAIN')
            action_latencies.append(LATENCY_COSTS_MS['A4'])
            return {
                'predicted': 'NOT_ESTABLISHED',
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Epistemic abstention for OOD/unsupported (A4)'
            }

        # Step 1: Run cheap verifier A1 (Cost 1)
        spent_cost += 1
        actions_taken.append('A1_CHEAP_NLI')
        action_latencies.append(LATENCY_COSTS_MS['A1'])
        rem_budget = self.max_budget - spent_cost
        
        winning_conf = feature_dict['cheap_nli_winning_conf']
        margin = feature_dict['cheap_nli_margin_top2']
        p_contra = feature_dict['cheap_nli_p_contradiction']
        p_entail = feature_dict['cheap_nli_p_entailment']
        c1_label = c1_pred['predicted']

        # If budget exhausted, return cheap prediction
        if rem_budget <= 0:
            return {
                'predicted': c1_label,
                'spent_budget': spent_cost,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Budget exhausted at A1'
            }

        # Check high-confidence cheap acceptance
        # High-confidence refutation: MiniLM is highly accurate on contradictions
        if p_contra >= 0.70 and margin >= 0.35:
            return {
                'predicted': 'REFUTED',
                'spent_budget': spent_cost,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'High-confidence cheap contradiction accepted (A1)'
            }

        # High-confidence entailment without universal quantifiers or negation
        if (p_entail >= 0.82 and margin >= 0.45 and 
            feature_dict['query_has_universal_quantifier'] == 0.0 and 
            feature_dict['evidence_contradiction_signal'] == 0.0):
            return {
                'predicted': 'SUPPORTED',
                'spent_budget': spent_cost,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'High-confidence cheap entailment accepted (A1)'
            }

        # Inconclusive / low-margin cases:
        # Check if counter-evidence retrieval A2 can resolve
        if not self.disable_counter_evidence and rem_budget >= 1 and (state_code in [3, 4] or p_contra >= 0.40):
            spent_cost += 1
            actions_taken.append('A2_COUNTER_EVIDENCE')
            action_latencies.append(LATENCY_COSTS_MS['A2'])
            rem_budget = self.max_budget - spent_cost
            
            top_counter_doc, c_score, _ = self.counter_retriever.retrieve_counter_evidence(
                c1_pred['query'], 
                [c.get('id') for c in top5_chunks]
            )
            
            # If counter-evidence found strong match and cheap had contradiction signal
            if top_counter_doc and c_score > 12.0 and p_contra > 0.35:
                actions_taken.append('A5_CONSENSUS')
                action_latencies.append(LATENCY_COSTS_MS['A5'])
                return {
                    'predicted': 'REFUTED',
                    'spent_budget': spent_cost,
                    'actions': actions_taken,
                    'escalated_to_llm': False,
                    'counter_evidence_used': True,
                    'latency_ms': sum(action_latencies),
                    'route_reason': 'Counter-evidence consensus confirmed refutation (A2+A5)'
                }

        # Escalate to expensive LLM A3 if remaining budget >= 2
        if rem_budget >= 2:
            spent_cost += 2
            actions_taken.append('A3_EXPENSIVE_LLM')
            action_latencies.append(LATENCY_COSTS_MS['A3'])
            return {
                'predicted': c0_pred['predicted'],
                'spent_budget': spent_cost,
                'actions': actions_taken,
                'escalated_to_llm': True,
                'counter_evidence_used': ('A2_COUNTER_EVIDENCE' in actions_taken),
                'latency_ms': sum(action_latencies),
                'route_reason': 'Risk-controlled escalation to C0 LLM (A3)'
            }

        # Fallback to cheap prediction if budget insufficient for A3
        return {
            'predicted': c1_label,
            'spent_budget': spent_cost,
            'actions': actions_taken,
            'escalated_to_llm': False,
            'counter_evidence_used': ('A2_COUNTER_EVIDENCE' in actions_taken),
            'latency_ms': sum(action_latencies),
            'route_reason': 'Fallback to cheap prediction under budget ceiling'
        }

    def route_p1(self, case_id, feature_dict, feature_vec, c1_pred, c0_pred, top5_chunks):
        """
        Executes Policy P1 (Learned Cost-Sensitive Controller) under current budget.
        """
        spent_cost = 0
        actions_taken = []
        action_latencies = []
        
        # Step 0: Fast paths (Cost 0)
        state_code = feature_dict['state_code']
        if state_code == 0:  # Ambiguous
            actions_taken.append('A0_FAST_PATH')
            action_latencies.append(LATENCY_COSTS_MS['A0'])
            return {
                'predicted': 'NOT_ESTABLISHED',
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Ambiguity guard trigger (A0)'
            }
            
        if state_code == 1:  # Tier-1 match
            actions_taken.append('A0_FAST_PATH')
            action_latencies.append(LATENCY_COSTS_MS['A0'])
            pred_val = c1_pred['predicted']
            return {
                'predicted': pred_val,
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Tier-1 deterministic match (A0)'
            }
            
        if state_code == 5:  # OOD
            actions_taken.append('A4_ABSTAIN')
            action_latencies.append(LATENCY_COSTS_MS['A4'])
            return {
                'predicted': 'NOT_ESTABLISHED',
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Epistemic abstention for OOD (A4)'
            }

        # Step 1: Query classifier for recommended action
        feat_input = np.copy(feature_vec).reshape(1, -1)
        if self.disable_evidence_sufficiency:
            feat_input[:, 9:13] = 0.0

        probs = self.clf.predict_proba(feat_input)[0]
        # Target classes: 0: Accept Cheap (A1), 1: Counter-Evidence (A2), 2: Escalate (A3), 3: Abstain (A4)
        pred_act_idx = int(np.argmax(probs))
        
        # If counter-evidence is disabled (C4 ablation), re-map action 1 -> 2 or 0
        if self.disable_counter_evidence and pred_act_idx == 1:
            pred_act_idx = 2 if probs[2] > 0.20 else 0

        # Action 3: Epistemic Abstention (Cost 0)
        if pred_act_idx == 3:
            actions_taken.append('A4_ABSTAIN')
            action_latencies.append(LATENCY_COSTS_MS['A4'])
            return {
                'predicted': 'NOT_ESTABLISHED',
                'spent_budget': 0,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Learned epistemic abstention (A4)'
            }

        # Execute Cheap NLI A1 (Cost 1)
        spent_cost += 1
        actions_taken.append('A1_CHEAP_NLI')
        action_latencies.append(LATENCY_COSTS_MS['A1'])
        rem_budget = self.max_budget - spent_cost

        # If budget exhausted or recommended action is Accept Cheap (0)
        if rem_budget <= 0 or pred_act_idx == 0:
            return {
                'predicted': c1_pred['predicted'],
                'spent_budget': spent_cost,
                'actions': actions_taken,
                'escalated_to_llm': False,
                'counter_evidence_used': False,
                'latency_ms': sum(action_latencies),
                'route_reason': 'Learned cheap verifier acceptance (A1)'
            }

        # If recommended action is Counter-Evidence A2 (1)
        if pred_act_idx == 1 and not self.disable_counter_evidence and rem_budget >= 1:
            spent_cost += 1
            actions_taken.append('A2_COUNTER_EVIDENCE')
            action_latencies.append(LATENCY_COSTS_MS['A2'])
            rem_budget = self.max_budget - spent_cost
            
            top_counter_doc, c_score, _ = self.counter_retriever.retrieve_counter_evidence(
                c1_pred['query'],
                [c.get('id') for c in top5_chunks]
            )
            
            if top_counter_doc and c_score > 11.5:
                actions_taken.append('A5_CONSENSUS')
                action_latencies.append(LATENCY_COSTS_MS['A5'])
                return {
                    'predicted': 'REFUTED',
                    'spent_budget': spent_cost,
                    'actions': actions_taken,
                    'escalated_to_llm': False,
                    'counter_evidence_used': True,
                    'latency_ms': sum(action_latencies),
                    'route_reason': 'Learned counter-evidence refutation consensus (A2+A5)'
                }

        # If recommended action is Escalate to LLM A3 (2)
        if pred_act_idx == 2 or rem_budget >= 2:
            if rem_budget >= 2:
                spent_cost += 2
                actions_taken.append('A3_EXPENSIVE_LLM')
                action_latencies.append(LATENCY_COSTS_MS['A3'])
                return {
                    'predicted': c0_pred['predicted'],
                    'spent_budget': spent_cost,
                    'actions': actions_taken,
                    'escalated_to_llm': True,
                    'counter_evidence_used': ('A2_COUNTER_EVIDENCE' in actions_taken),
                    'latency_ms': sum(action_latencies),
                    'route_reason': 'Learned risk-controlled escalation to C0 LLM (A3)'
                }

        # Fallback to cheap NLI
        return {
            'predicted': c1_pred['predicted'],
            'spent_budget': spent_cost,
            'actions': actions_taken,
            'escalated_to_llm': False,
            'counter_evidence_used': ('A2_COUNTER_EVIDENCE' in actions_taken),
            'latency_ms': sum(action_latencies),
            'route_reason': 'Fallback to cheap prediction'
        }
