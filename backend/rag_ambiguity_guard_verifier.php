<?php
/**
 * RagAmbiguityGuardVerifier - EXP-0037 Controlled Ambiguity Mitigation Verifier
 * 
 * Implements:
 * - A0: Frozen EXP-0036 N7 Baseline (Reference Comparator)
 * - A1: N7 + Stage-2 Deterministic Ambiguity Routing Guard
 * - A2: A1 + Stricter Neutrality Prior (P4_neutral Epistemic Prompt)
 * - A3: A1 + Dynamic Confidence Threshold (0.85 Entail / 0.80 Contra)
 * - A4: A1 + Stricter Neutrality Prior + Dynamic Confidence Threshold (Combined)
 * 
 * Lineage: EXP-0036 (d8c1ed3) -> EXP-0037
 */

require_once __DIR__ . '/rag_structured_nli_verifier.php';

class RagAmbiguityGuardVerifier {

    const TIER_AMBIGUITY_GUARD = 'TIER_2_AMBIGUITY_GUARD';

    /**
     * Stage-2 Deterministic Ambiguity / Subjectivity Detector
     * Evaluates whether a query is subjective, normative, unanchored comparative,
     * or universally quantified without empirical boundaries.
     */
    public static function detectAmbiguity(string $query, string $evidence = ''): array {
        $qNorm = strtolower(trim($query));

        // 1. Normative signals (recommending, prescribing without objective rule)
        $normativeSignals = ['should', 'ought to', 'recommended', 'advisable'];
        $foundNormative = [];
        foreach ($normativeSignals as $sig) {
            if (preg_match('/\b' . preg_quote($sig, '/') . '\b/i', $qNorm)) {
                $foundNormative[] = $sig;
            }
        }

        // 2. Subjective evaluative signals (value judgments, optimality, qualitative preference)
        $subjectiveSignals = [
            'best', 'better', 'superior', 'ideal', 'preferable', 'optimal',
            'easiest', 'cleanest', 'worth', 'appropriate', 'suitable',
            'effective', 'perfect', 'flawless', 'nicer'
        ];
        $foundSubjective = [];
        foreach ($subjectiveSignals as $sig) {
            if (preg_match('/\b' . preg_quote($sig, '/') . '\b/i', $qNorm)) {
                $foundSubjective[] = $sig;
            }
        }

        // 3. Comparative subjective signals (unanchored superiority or preference)
        $comparativeSignals = [
            'strictly better', 'more suitable', 'preferable to', 'superior to',
            'better than', 'vs', 'versus'
        ];
        $foundComparative = [];
        foreach ($comparativeSignals as $sig) {
            if (preg_match('/\b' . preg_quote($sig, '/') . '\b/i', $qNorm)) {
                $foundComparative[] = $sig;
            }
        }

        // 4. Universal quantifiers without empirical boundaries
        $universalSignals = ['always', 'never', 'universally', 'generally'];
        $foundUniversal = [];
        foreach ($universalSignals as $sig) {
            if (preg_match('/\b' . preg_quote($sig, '/') . '\b/i', $qNorm)) {
                $foundUniversal[] = $sig;
            }
        }

        // 5. Query Intent Ambiguity check from EXP-0035 intent classifier
        $isIntentAmbiguous = (bool)preg_match('/\b(best|better|perfect|optimal|always recommended|should you always|superior|ideal|most readable|flawless)\b/i', $qNorm);

        $allSignals = array_unique(array_merge($foundNormative, $foundSubjective, $foundComparative, $foundUniversal));
        $isAmbiguous = !empty($allSignals) || $isIntentAmbiguous;

        $reasons = [];
        if (!empty($foundNormative)) $reasons[] = 'normative_modal (' . implode(', ', $foundNormative) . ')';
        if (!empty($foundSubjective)) $reasons[] = 'subjective_value_judgment (' . implode(', ', $foundSubjective) . ')';
        if (!empty($foundComparative)) $reasons[] = 'comparative_subjective (' . implode(', ', $foundComparative) . ')';
        if (!empty($foundUniversal)) $reasons[] = 'universal_quantifier (' . implode(', ', $foundUniversal) . ')';
        if ($isIntentAmbiguous && empty($reasons)) $reasons[] = 'intent_ambiguity_marker';

        return [
            'ambiguity_detected' => $isAmbiguous,
            'subjectivity_detected' => !empty($foundSubjective),
            'normative_detected' => !empty($foundNormative),
            'comparative_subjective_detected' => !empty($foundComparative),
            'universal_claim_detected' => !empty($foundUniversal),
            'signals' => array_values($allSignals),
            'guard_reason' => !empty($reasons) ? implode('; ', $reasons) : 'none'
        ];
    }

    /**
     * Evaluates retrieved evidence for guarded queries:
     * Case A: Explicit curriculum rule/convention established.
     * Case B: Trade-offs, alternatives, situational preference (not universal rule).
     * Case C: Explicit contradiction (handled via polarity / NLI contradiction).
     */
    public static function evaluateEvidenceForGuardedQuery(string $query, array $retrievedChunks): array {
        $combinedEvidence = '';
        foreach (array_slice($retrievedChunks, 0, 3) as $c) {
            $combinedEvidence .= ' ' . ($c['title'] ?? '') . ': ' . ($c['content'] ?? '');
        }
        $evLower = strtolower($combinedEvidence);

        // Explicit rule markers in curriculum evidence
        $ruleMarkers = [
            'must', 'required', 'mandatory', 'essential', 'rule', 'rules of hooks',
            'convention', 'standard', 'strictly', 'always', 'never', 'forbidden',
            'prohibited', 'principles:'
        ];
        $foundRuleMarkers = [];
        foreach ($ruleMarkers as $rm) {
            if (preg_match('/\b' . preg_quote($rm, '/') . '\b/i', $evLower)) {
                $foundRuleMarkers[] = $rm;
            }
        }

        // Trade-off / contextual markers
        $tradeoffMarkers = [
            'trade-off', 'trade-offs', 'trade off', 'depends on', 'depending on',
            'pros and cons', 'alternatives', 'circumstances', 'situational',
            'context', 'use case', 'preference', 'contrast', 'whereas', 'either'
        ];
        $foundTradeoffs = [];
        foreach ($tradeoffMarkers as $tm) {
            if (preg_match('/\b' . preg_quote($tm, '/') . '\b/i', $evLower)) {
                $foundTradeoffs[] = $tm;
            }
        }

        return [
            'has_explicit_rule' => !empty($foundRuleMarkers),
            'rule_markers' => $foundRuleMarkers,
            'has_tradeoff_context' => !empty($foundTradeoffs),
            'tradeoff_markers' => $foundTradeoffs,
            'top_similarity' => !empty($retrievedChunks) ? (float)($retrievedChunks[0]['similarity'] ?? 0.0) : 0.0
        ];
    }

    /**
     * Unified Verify Entrypoint for EXP-0037
     */
    public static function verify(string $query, array $retrievedChunks, array $runtimeOptions = []): array {
        $mode = $runtimeOptions['mode'] ?? 'A0';

        // A0 is exact frozen N7
        if ($mode === 'A0') {
            return RagStructuredNliVerifier::verify($query, $retrievedChunks, ['mode' => 'N7']);
        }

        $intentData = RagIntentClauseVerifier::classifyIntent($query);
        $intent = $intentData['intent'];
        $features = $intentData['features'];
        $thresh = RagIntentClauseVerifier::getThresholdForIntent($intent, $features);

        $clauses = RagIntentClauseVerifier::detectAndSplitClauses($query);
        $clauseGrounding = RagIntentClauseVerifier::evaluateClauseEvidence($clauses, $retrievedChunks, $thresh);

        if (count($clauses) > 1) {
            $clauseResults = [];
            $hasAnyRefuted = false;
            $hasAnyNotEstablished = false;
            $allSupported = true;
            $refutationReason = null;
            $refutationCitation = null;

            foreach ($clauses as $c) {
                $cText = $c['clause_text'];
                $cRes = self::verifySingleClause($cText, $retrievedChunks, $thresh, $mode, $runtimeOptions);
                $cStatus = $cRes['status'];
                $clauseResults[] = [
                    'clause' => $cText,
                    'status' => $cStatus,
                    'reason' => $cRes['decision_reason'] ?? '',
                    'confidence' => $cRes['confidence'] ?? 0.0
                ];

                if ($cStatus === RagPremiseVerifier::STATUS_REFUTED) {
                    $hasAnyRefuted = true;
                    if ($refutationReason === null) {
                        $refutationReason = $cRes['refutation'] ?? $cRes['decision_reason'];
                        $refutationCitation = $cRes['citation'] ?? null;
                    }
                } elseif ($cStatus === RagPremiseVerifier::STATUS_NOT_ESTABLISHED) {
                    $hasAnyNotEstablished = true;
                    $allSupported = false;
                } elseif ($cStatus !== RagPremiseVerifier::STATUS_SUPPORTED) {
                    $allSupported = false;
                }
            }

            if ($hasAnyRefuted) {
                $finalStatus = RagPremiseVerifier::STATUS_REFUTED;
                $finalReason = "At least one constituent proposition in compound premise was refuted: {$refutationReason}";
                $finalConf = 0.95;
            } elseif ($allSupported && !$hasAnyNotEstablished) {
                $finalStatus = RagPremiseVerifier::STATUS_SUPPORTED;
                $finalReason = 'All constituent propositions in compound premise were verified and supported by curriculum evidence';
                $finalConf = 0.85;
            } else {
                $finalStatus = RagPremiseVerifier::STATUS_NOT_ESTABLISHED;
                $finalReason = 'Compound premise contains unverified or insufficiently established sub-propositions';
                $finalConf = 0.0;
            }

            return [
                'has_presupposition' => true,
                'status' => $finalStatus,
                'confidence' => $finalConf,
                'evidence_used' => true,
                'claim' => $query,
                'refutation' => $hasAnyRefuted ? $refutationReason : null,
                'citation' => $hasAnyRefuted ? $refutationCitation : null,
                'decision_tier' => RagPremiseVerifier::TIER_2_NLI,
                'decision_reason' => $finalReason,
                'intent_diagnostics' => ['intent' => $intent, 'dynamic_threshold' => $thresh],
                'clause_diagnostics' => $clauseGrounding,
                'decomposed_clause_results' => $clauseResults
            ];
        }

        return self::verifySingleClause($query, $retrievedChunks, $thresh, $mode, $runtimeOptions);
    }

    private static function verifySingleClause(string $query, array $retrievedChunks, float $thresh, string $mode, array $runtimeOptions): array {
        $opts = $runtimeOptions;
        $opts['ablation_mode'] = 'E4';
        $opts['evidence_gate_threshold'] = $thresh;

        $topChunk = $retrievedChunks[0] ?? null;
        $evidenceText = '';
        if ($topChunk) {
            $evidenceText = ($topChunk['title'] ?? '') . ': ' . ($topChunk['content'] ?? '');
        }

        // N2 Polarity reasoning
        $polarityInfo = RagStructuredNliVerifier::extractPolarityCues($query, $evidenceText);

        if (($polarityInfo['polarity_mismatch_detected'] ?? false) && !empty($polarityInfo['antonyms'])) {
            foreach ($polarityInfo['antonyms'] as $pair) {
                return [
                    'has_presupposition' => true,
                    'status' => RagPremiseVerifier::STATUS_REFUTED,
                    'confidence' => 0.95,
                    'evidence_used' => true,
                    'claim' => $query,
                    'refutation' => "Direct semantic opposition detected via polarity pre-processing ({$pair})",
                    'citation' => $topChunk['citation'] ?? ($topChunk['title'] ?? 'Curriculum Passage'),
                    'decision_tier' => RagPremiseVerifier::TIER_1,
                    'decision_reason' => "Polarity inversion established: {$pair}",
                    'polarity_diagnostics' => $polarityInfo
                ];
            }
        }

        // Stage-2 Ambiguity Routing Guard
        $guardInfo = self::detectAmbiguity($query, $evidenceText);
        $isGuarded = ($mode !== 'A0') && ($guardInfo['ambiguity_detected'] ?? false);

        // Mode-specific configuration:
        // A1: Routing Guard (P4, 0.70 / 0.70)
        // A2: Routing Guard + Neutrality Prior (P4_neutral, 0.70 / 0.70)
        // A3: Routing Guard + Dynamic Threshold (P4, 0.85 / 0.80)
        // A4: Routing Guard + Neutrality Prior + Dynamic Threshold (P4_neutral, 0.85 / 0.80)
        $promptMode = 'P4';
        $pass1Threshold = 0.70;
        $pass2ContraThreshold = 0.75;

        if ($isGuarded) {
            if (in_array($mode, ['A2', 'A4'], true)) {
                $promptMode = 'P4_neutral';
            }
            if (in_array($mode, ['A3', 'A4'], true)) {
                $pass1Threshold = 0.85;
                $pass2ContraThreshold = 0.80;
            }
        }

        $opts['prompt_mode'] = $promptMode;
        $opts['pass1_threshold'] = $pass1Threshold;
        $opts['pass2_contra_threshold'] = $pass2ContraThreshold;

        // Atomic predicate decomposition for single claims (from N7)
        $preds = RagStructuredNliVerifier::decomposeClaimPredicates($query);
        if (count($preds['raw_predicates']) > 1) {
            $allPredsSupported = true;
            foreach ($preds['raw_predicates'] as $p) {
                $pRes = RagPremiseVerifier::verify($p, $retrievedChunks, $opts);
                if ($pRes['status'] === RagPremiseVerifier::STATUS_REFUTED) {
                    $pRes['ambiguity_guard_diagnostics'] = $guardInfo;
                    return $pRes;
                }
                if ($pRes['status'] !== RagPremiseVerifier::STATUS_SUPPORTED) {
                    $allPredsSupported = false;
                }
            }
            if ($allPredsSupported) {
                return [
                    'has_presupposition' => true,
                    'status' => RagPremiseVerifier::STATUS_SUPPORTED,
                    'confidence' => 0.90,
                    'evidence_used' => true,
                    'claim' => $query,
                    'refutation' => null,
                    'citation' => $topChunk['citation'] ?? null,
                    'decision_tier' => RagPremiseVerifier::TIER_2_NLI,
                    'decision_reason' => 'All decomposed atomic claim predicates independently verified',
                    'predicate_diagnostics' => $preds,
                    'ambiguity_guard_diagnostics' => $guardInfo
                ];
            }
        }

        $res = RagPremiseVerifier::verify($query, $retrievedChunks, $opts);
        $res['polarity_diagnostics'] = $polarityInfo;
        $res['ambiguity_guard_diagnostics'] = $guardInfo;

        // Post-verification Guard Rule: Explicit Evidence > Subjective Inference
        if ($isGuarded) {
            $evCheck = self::evaluateEvidenceForGuardedQuery($query, $retrievedChunks);
            $res['guard_evidence_check'] = $evCheck;

            if ($res['status'] === RagPremiseVerifier::STATUS_REFUTED) {
                // Case C: Contradiction explicitly supported by evidence
                // Verdict remains REFUTED
                $res['guard_case'] = 'CASE_C_CONTRADICTION';
            } elseif ($res['status'] === RagPremiseVerifier::STATUS_SUPPORTED) {
                // Case A vs Case B check
                if ($evCheck['has_explicit_rule'] && !$evCheck['has_tradeoff_context']) {
                    // Case A: Explicit rule / convention established by curriculum evidence
                    $res['guard_case'] = 'CASE_A_EXPLICIT_RULE_SUPPORTED';
                } else {
                    // Case B: Trade-offs, situational context, or lacking explicit mandate
                    // Override forced-choice entailment to NOT_ESTABLISHED
                    $res['status'] = RagPremiseVerifier::STATUS_NOT_ESTABLISHED;
                    $res['confidence'] = 0.35;
                    $res['decision_reason'] = "Ambiguity Routing Guard (Case B): Subjective or normative query lacks explicit universal rule mandate in curriculum evidence ({$guardInfo['guard_reason']})";
                    $res['decision_tier'] = self::TIER_AMBIGUITY_GUARD;
                    $res['guard_case'] = 'CASE_B_TRADEOFF_ABSTENTION';
                }
            } else {
                $res['guard_case'] = 'NEUTRAL_UNESTABLISHED';
            }
        }

        return $res;
    }
}
