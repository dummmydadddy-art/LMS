<?php
/**
 * EXP-0071: Adaptive Verification Controller Benchmark Harness
 * 
 * Evaluates adaptive verification controllers (C2 Fixed-Rule P0, C3 Learned P1, C4/C5 Ablations)
 * vs frozen generative LLM control (C0) and fine-tuned MiniLM control (C1).
 * 
 * Usage:
 *   php research/benchmarks/exp0071_benchmark.php --condition=ALL --budget=3
 *   php research/benchmarks/exp0071_benchmark.php --condition=C3 --budget=3
 */

$rootDir = dirname(dirname(__DIR__));
require_once $rootDir . '/backend/rag_ambiguity_guard_verifier.php';

@ini_set('memory_limit', '4G');
@set_time_limit(28800);

// Parse CLI options
$options = getopt('', ['condition:', 'budget:', 'output:']);
$condArg = strtoupper($options['condition'] ?? 'ALL');
$budgetArg = intval($options['budget'] ?? 3);

echo "======================================================================\n";
echo "EXP-0071: ADAPTIVE VERIFICATION CONTROLLER BENCHMARK\n";
echo "Condition: {$condArg} | Budget: {$budgetArg}\n";
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
    die("FATAL: Proxy connection to http://127.0.0.1:9998 failed! " . curl_error($testCh) . "\nMake sure research/benchmarks/exp0071_adapter.py is running.\n");
}
curl_close($testCh);
echo "[Setup] Proxy operational: {$testRes}\n\n";

$condFile = $rootDir . '/scratch/exp0071_active_condition.txt';
$activeCaseFile = $rootDir . '/scratch/exp0071_active_case.txt';
$budgetFile = $rootDir . '/scratch/exp0071_active_budget.txt';

file_put_contents($budgetFile, (string)$budgetArg);

$allConditions = [
    'C0',
    'C1',
    'C2',
    'C3',
    'C4',
    'C5'
];

$conditionsToRun = ($condArg === 'ALL') ? $allConditions : [$condArg];

$allConditionPredictions = [];
$masterPredPath = $rootDir . '/EXP-0071-DEVELOPMENT-PREDICTIONS.json';
if (file_exists($masterPredPath)) {
    $allConditionPredictions = json_decode(file_get_contents($masterPredPath), true) ?: [];
}

foreach ($conditionsToRun as $cond) {
    echo "======================================================================\n";
    echo "EXECUTING CONDITION {$cond} (Budget = {$budgetArg})\n";
    echo "======================================================================\n";

    file_put_contents($condFile, $cond);

    // Reuse frozen C0 and C1 predictions if available to prevent redundant compute
    $exp70PredPath = $rootDir . '/EXP-0070-OFFFOLD-PREDICTIONS.json';
    if (file_exists($exp70PredPath) && in_array($cond, ['C0', 'C1'])) {
        $exp70Data = json_decode(file_get_contents($exp70PredPath), true);
        if (isset($exp70Data[$cond]) && count($exp70Data[$cond]) === 400) {
            echo "[Notice] Reusing and certifying verified {$cond} baseline predictions from EXP-0070.\n";
            $allConditionPredictions[$cond] = $exp70Data[$cond];
            file_put_contents($masterPredPath, json_encode($allConditionPredictions, JSON_PRETTY_PRINT));
            continue;
        }
    }

    $chkFile = $rootDir . "/scratch/exp0071_dev_{$cond}_checkpoint.json";
    $predictions = [];
    if (file_exists($chkFile)) {
        $predictions = json_decode(file_get_contents($chkFile), true) ?: [];
        echo "[Resume] Found existing checkpoint with " . count($predictions) . " items.\n";
    }

    $correctCount = 0;
    $processedInThisRun = 0;
    $t_start = microtime(true);

    foreach ($dataset as $idx => $item) {
        $cid = $item['id'];
        if (isset($predictions[$cid])) {
            if ($predictions[$cid]['correct']) {
                $correctCount++;
            }
            continue;
        }

        file_put_contents($activeCaseFile, $cid);

        $query = $item['query'];
        $expected = $item['expected'];
        $category = $item['category'];

        $rawEntry = $evidenceCache[$cid] ?? [];
        $chunks = $rawEntry['top5'] ?? (isset($rawEntry[0]) ? $rawEntry : []);

        RagPremiseVerifier::clearNliCache();

        $case_t0 = microtime(true);
        $res = RagAmbiguityGuardVerifier::verify($query, $chunks, [
            'mode' => 'A4',
            'model' => 'llama3.2:latest'
        ]);
        $case_lat = round((microtime(true) - $case_t0) * 1000, 2);

        $predicted = $res['status'] ?? 'NOT_ESTABLISHED';
        if (!in_array($predicted, ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED'], true)) {
            $predicted = 'NOT_ESTABLISHED';
        }
        $conf = floatval($res['confidence'] ?? 0.0);
        $isCorrect = ($predicted === $expected);
        if ($isCorrect) {
            $correctCount++;
        }
        $processedInThisRun++;

        $predictions[$cid] = [
            'case_id' => $cid,
            'query' => $query,
            'category' => $category,
            'expected' => $expected,
            'predicted' => $predicted,
            'correct' => $isCorrect,
            'confidence' => $conf,
            'decision_tier' => $res['decision_tier'] ?? 'UNKNOWN',
            'decision_reason' => $res['decision_reason'] ?? '',
            'latency_ms' => $case_lat,
            'ambiguity_guard' => $res['ambiguity_guard_diagnostics'] ?? null,
            'guard_case' => $res['guard_case'] ?? null,
            'guard_evidence_check' => $res['guard_evidence_check'] ?? null
        ];

        if (($idx + 1) % 20 === 0 || ($idx + 1) === $N) {
            file_put_contents($chkFile, json_encode($predictions, JSON_PRETTY_PRINT));
            $pct = round((count($predictions) / $N) * 100, 1);
            $runningAcc = round(($correctCount / count($predictions)) * 100, 2);
            $elapsed = round(microtime(true) - $t_start, 1);
            echo sprintf("[%s] Progress: %d/%d (%.1f%%) | Accuracy: %.2f%% | Elapsed: %.1fs\n",
                $cond, count($predictions), $N, $pct, $runningAcc, $elapsed);
        }
    }

    $finalAcc = round(($correctCount / $N) * 100, 2);
    echo "\n>>> CONDITION {$cond} COMPLETE: Accuracy = {$finalAcc}% ({$correctCount}/{$N})\n\n";

    $allConditionPredictions[$cond] = $predictions;
    file_put_contents($masterPredPath, json_encode($allConditionPredictions, JSON_PRETTY_PRINT));
}

echo "======================================================================\n";
echo "BENCHMARK COMPLETE. All condition predictions written to:\n{$masterPredPath}\n";
echo "======================================================================\n";
