<?php
/**
 * EXP-0069: NLI Probability Calibration and Decision-Boundary Benchmark
 * 
 * Replay harness evaluating calibrated sequence-classification NLI cross-encoders (MiniLM, DeBERTa)
 * vs raw cross-encoders and frozen generative LLM control (C0) with frozen A4 verifier,
 * frozen retrieval caches, and identical Tier-1 deterministic fast-paths.
 * 
 * Usage:
 *   php research/benchmarks/exp0069_benchmark.php --condition=ALL
 *   php research/benchmarks/exp0069_benchmark.php --condition=MINILM_BIAS
 */

$rootDir = dirname(dirname(__DIR__));
require_once $rootDir . '/backend/rag_ambiguity_guard_verifier.php';

@ini_set('memory_limit', '4G');
@set_time_limit(28800);

// Parse CLI options
$options = getopt('', ['condition:', 'output:']);
$condArg = strtoupper($options['condition'] ?? 'ALL');

echo "======================================================================\n";
echo "EXP-0069: NLI CALIBRATION & DECISION-BOUNDARY BENCHMARK\n";
echo "Condition: {$condArg}\n";
echo "======================================================================\n\n";

// 1. Invariant Integrity Verification
$verifierPath = $rootDir . '/backend/rag_ambiguity_guard_verifier.php';
$expectedVerifierHash = '31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e';
$actualVerifierHash = hash_file('sha256', $verifierPath);
if (strtolower($actualVerifierHash) !== strtolower($expectedVerifierHash)) {
    die("FATAL INVARIANT VIOLATION: Verifier hash mismatch!\nExpected: {$expectedVerifierHash}\nActual:   {$actualVerifierHash}\n");
}

$premiseVerifierPath = $rootDir . '/backend/rag_premise_verifier.php';
$expectedPremiseVerifierHash = 'cd1a610918ed3daf5aa418ab306894fd39653d9d000d4c729ea2f9e5fa5dd179';
$actualPremiseVerifierHash = hash_file('sha256', $premiseVerifierPath);
if (strtolower($actualPremiseVerifierHash) !== strtolower($expectedPremiseVerifierHash)) {
    die("FATAL INVARIANT VIOLATION: Premise Verifier hash mismatch!\nExpected: {$expectedPremiseVerifierHash}\nActual:   {$actualPremiseVerifierHash}\n");
}
echo "[Integrity] Verifier backend hashes verified 100% bit-for-bit.\n";

$datasetPath = $rootDir . '/EXP-0025-DEVELOPMENT-DATASET.json';
$expectedDatasetHash = '8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b';
$cachePath = $rootDir . '/scratch/exp0056_dev_c1_cache.json';

$actualDatasetHash = hash_file('sha256', $datasetPath);
if (strtolower($actualDatasetHash) !== strtolower($expectedDatasetHash)) {
    die("FATAL INVARIANT VIOLATION: Dataset hash mismatch!\nExpected: {$expectedDatasetHash}\nActual:   {$actualDatasetHash}\n");
}
echo "[Integrity] Dataset hash verified: {$actualDatasetHash}\n";

if (!file_exists($cachePath)) {
    die("FATAL: Evidence cache not found at {$cachePath}!\n");
}
$evidenceCache = json_decode(file_get_contents($cachePath), true);
$dataset = json_decode(file_get_contents($datasetPath), true);
$N = count($dataset);
echo "[Setup] Loaded {$N} test cases and evidence cache.\n\n";

// Set environment for proxy
putenv('http_proxy=http://127.0.0.1:9998');
putenv('no_proxy=');

// Test proxy connection
$testCh = curl_init('http://127.0.0.1:11434/api/version');
curl_setopt($testCh, CURLOPT_RETURNTRANSFER, true);
curl_setopt($testCh, CURLOPT_TIMEOUT, 5);
$testRes = curl_exec($testCh);
if (!$testRes) {
    die("FATAL: Proxy connection to http://127.0.0.1:9998 failed! " . curl_error($testCh) . "\nMake sure research/benchmarks/exp0069_adapter.py is running.\n");
}
curl_close($testCh);
echo "[Setup] Proxy operational: {$testRes}\n\n";

$condFile = $rootDir . '/scratch/exp0069_active_condition.txt';
$activeCaseFile = $rootDir . '/scratch/exp0069_active_case.txt';

$allConditions = [
    'C0',
    'MINILM_RAW',
    'MINILM_TEMP',
    'MINILM_BIAS',
    'MINILM_VEC',
    'DEBERTA_RAW',
    'DEBERTA_TEMP',
    'DEBERTA_BIAS',
    'DEBERTA_VEC'
];

$conditionsToRun = ($condArg === 'ALL') ? $allConditions : [$condArg];

$allConditionPredictions = [];
$masterPredPath = $rootDir . '/EXP-0069-DEVELOPMENT-PREDICTIONS.json';
if (file_exists($masterPredPath)) {
    $allConditionPredictions = json_decode(file_get_contents($masterPredPath), true) ?: [];
}

foreach ($conditionsToRun as $cond) {
    echo "======================================================================\n";
    echo "EXECUTING CONDITION {$cond}\n";
    echo "======================================================================\n";

    file_put_contents($condFile, $cond);
    $checkpointFile = $rootDir . "/scratch/exp0069_dev_{$cond}_checkpoint.json";

    $predictions = [];
    if (file_exists($checkpointFile)) {
        $cp = json_decode(file_get_contents($checkpointFile), true);
        $predictions = $cp['predictions'] ?? [];
        if (count($predictions) === $N) {
            echo "[Resume] Complete checkpoint found with {$N} cases for {$cond}. Loading directly.\n";
            $allConditionPredictions[$cond] = $predictions;
            continue;
        }
    }

    // Populate C0 from certified baseline if not completed
    if ($cond === 'C0' && count($predictions) < $N && file_exists($rootDir . '/EXP-0065-DEVELOPMENT-PREDICTIONS.json')) {
        $exp65 = json_decode(file_get_contents($rootDir . '/EXP-0065-DEVELOPMENT-PREDICTIONS.json'), true);
        if (isset($exp65['C0']) && count($exp65['C0']) === $N) {
            echo "[Optimization] Populating C0 control predictions from certified EXP-0065 baseline ({$N} cases)...\n";
            $predictions = $exp65['C0'];
            file_put_contents($checkpointFile, json_encode([
                'condition' => 'C0',
                'predictions' => $predictions
            ], JSON_PRETTY_PRINT));
            $allConditionPredictions[$cond] = $predictions;
            continue;
        }
    }

    $startTime = microtime(true);
    $latencies = [];

    foreach ($dataset as $idx => $item) {
        $cid = $item['id'];
        $query = $item['query'];
        $expected = $item['expected'];
        $category = $item['category'] ?? 'UNKNOWN';

        if (isset($predictions[$cid])) {
            $latencies[] = $predictions[$cid]['latency_ms'];
            continue;
        }

        file_put_contents($activeCaseFile, $cid);

        $rawEntry = $evidenceCache[$cid];
        $chunks = $rawEntry['top5'] ?? (isset($rawEntry[0]) ? $rawEntry : []);

        RagPremiseVerifier::clearNliCache();

        $t0 = microtime(true);
        $res = RagAmbiguityGuardVerifier::verify($query, $chunks, [
            'mode' => 'A4',
            'model' => 'llama3.2:latest'
        ]);
        $elapsedMs = round((microtime(true) - $t0) * 1000, 2);
        $latencies[] = $elapsedMs;

        $predictedStatus = $res['status'] ?? 'PARSE_FAILURE';
        if (!in_array($predictedStatus, ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED'], true)) {
            $predictedStatus = 'PARSE_FAILURE';
        }

        $record = [
            'case_id' => $cid,
            'query' => $query,
            'category' => $category,
            'expected' => $expected,
            'predicted' => $predictedStatus,
            'correct' => ($predictedStatus === $expected),
            'confidence' => round((float)($res['confidence'] ?? 0.0), 4),
            'decision_tier' => $res['decision_tier'] ?? 'UNKNOWN',
            'decision_reason' => $res['decision_reason'] ?? '',
            'latency_ms' => $elapsedMs,
            'ambiguity_guard' => $res['ambiguity_guard_diagnostics'] ?? null,
            'guard_case' => $res['guard_case'] ?? null
        ];

        $predictions[$cid] = $record;

        if (($idx + 1) % 100 === 0 || ($idx + 1) === $N) {
            $currCorrect = count(array_filter($predictions, fn($p) => $p['correct']));
            $currentAcc = round(($currCorrect / count($predictions)) * 100, 2);
            $meanLat = array_sum($latencies) / max(1, count($latencies));
            echo sprintf("[%s] Processed %d/%d (Acc: %.2f%%, Mean Lat: %.1f ms)\n",
                $cond, count($predictions), $N, $currentAcc, $meanLat);

            file_put_contents($checkpointFile, json_encode([
                'condition' => $cond,
                'processed' => count($predictions),
                'predictions' => $predictions
            ], JSON_PRETTY_PRINT));
        }
    }

    $allConditionPredictions[$cond] = $predictions;
    file_put_contents($masterPredPath, json_encode($allConditionPredictions, JSON_PRETTY_PRINT));

    $correctTotal = count(array_filter($predictions, fn($p) => $p['correct']));
    $acc = round(($correctTotal / $N) * 100, 2);
    echo sprintf("\n[Condition %s Complete] Accuracy: %d/%d (%.2f%%) in %.1f seconds.\n\n",
        $cond, $correctTotal, $N, $acc, microtime(true) - $startTime);
}

echo "All conditions completed successfully!\n";
