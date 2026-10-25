<?php
/**
 * EXP-0065: Verifier/NLI Capacity Isolation Benchmark
 * 
 * Replay harness evaluating Tier-2 NLI model capacity (llama3.2:latest vs qwen3:4b vs qwen3:8b)
 * using the frozen A4 verifier (RagAmbiguityGuardVerifier) and frozen retrieval evidence caches.
 * 
 * Usage:
 *   php exp0065_nli_capacity_benchmark.php --dataset=dev --model=llama3.2:latest --output=EXP-0065-DEV-C0.json
 *   php exp0065_nli_capacity_benchmark.php --dataset=dev --model=qwen3:4b --output=EXP-0065-DEV-C1.json
 *   php exp0065_nli_capacity_benchmark.php --dataset=blind --model=... --output=...
 */

$rootDir = dirname(dirname(__DIR__));
require_once $rootDir . '/backend/rag_ambiguity_guard_verifier.php';

@ini_set('memory_limit', '4G');
@set_time_limit(14400);

// Parse CLI options
$options = getopt('', ['dataset:', 'model:', 'output:', 'metrics_output:', 'checkpoint:']);
$datasetType = $options['dataset'] ?? 'dev';
$modelName = $options['model'] ?? 'llama3.2:latest';
$modelSafeName = str_replace([':', '/', '\\'], '_', $modelName);
$outputFile = $options['output'] ?? ($rootDir . "/EXP-0065-{$datasetType}-{$modelSafeName}-predictions.json");
$metricsOutputFile = $options['metrics_output'] ?? ($rootDir . "/EXP-0065-{$datasetType}-{$modelSafeName}-metrics.json");
$checkpointFile = $options['checkpoint'] ?? ($rootDir . "/scratch/exp0065_{$datasetType}_{$modelSafeName}_checkpoint.json");

echo "======================================================================\n";
echo "EXP-0065: NLI CAPACITY ISOLATION BENCHMARK\n";
echo "Dataset: {$datasetType} | Model: {$modelName}\n";
echo "======================================================================\n\n";

// 1. Invariant Integrity Verification
$verifierPath = $rootDir . '/backend/rag_ambiguity_guard_verifier.php';
$expectedVerifierHash = '31c7c31ef6301156bb0318cb35ba5879e5ca3c25acdd6f705cd2f6c0e3b0fc2e';
$actualVerifierHash = hash_file('sha256', $verifierPath);
if (strtolower($actualVerifierHash) !== strtolower($expectedVerifierHash)) {
    die("FATAL INVARIANT VIOLATION: Verifier hash mismatch!\nExpected: {$expectedVerifierHash}\nActual:   {$actualVerifierHash}\n");
}
echo "[Integrity] Verifier hash verified: {$actualVerifierHash}\n";

if ($datasetType === 'dev') {
    $datasetPath = $rootDir . '/EXP-0025-DEVELOPMENT-DATASET.json';
    $expectedDatasetHash = '8ce7313c48fd11086d478952a524f250e4afeab1530fbafba527f44a6203427b';
    $cachePath = $rootDir . '/scratch/exp0056_dev_c1_cache.json';
} elseif ($datasetType === 'blind') {
    $datasetPath = $rootDir . '/EXP-0033-BLIND-DATASET.json';
    $expectedDatasetHash = '3b4fd6c70258982acb9f4b87ded84dbb401ee821f5a853a6547cf982c18a7b08';
    $cachePath = $rootDir . '/scratch/exp0056_blind_c1_cache.json';
} else {
    die("FATAL: Unknown dataset type {$datasetType}\n");
}

$actualDatasetHash = hash_file('sha256', $datasetPath);
if (strtolower($actualDatasetHash) !== strtolower($expectedDatasetHash)) {
    die("FATAL INVARIANT VIOLATION: Dataset hash mismatch!\nExpected: {$expectedDatasetHash}\nActual:   {$actualDatasetHash}\n");
}
echo "[Integrity] Dataset hash verified: {$actualDatasetHash}\n";

if (!file_exists($cachePath)) {
    die("FATAL: Evidence cache not found at {$cachePath}!\n");
}
$evidenceCache = json_decode(file_get_contents($cachePath), true);
echo "[Setup] Loaded evidence cache: " . count($evidenceCache) . " queries from " . basename($cachePath) . "\n";

$dataset = json_decode(file_get_contents($datasetPath), true);
$N = count($dataset);
echo "[Setup] Loaded dataset: {$N} test cases.\n\n";

// Load checkpoint if exists
$checkpointData = file_exists($checkpointFile) ? json_decode(file_get_contents($checkpointFile), true) : [];
$predictions = $checkpointData['predictions'] ?? [];
$latencies = [];

echo "[Execution] Beginning sequential verification loop...\n";
$startTime = microtime(true);
$parseFailures = 0;

foreach ($dataset as $idx => $item) {
    $cid = $item['id'];
    $query = $item['query'];
    $expected = $item['expected'];
    $category = $item['category'] ?? 'UNKNOWN';

    if (isset($predictions[$cid])) {
        $latencies[] = $predictions[$cid]['latency_ms'];
        continue;
    }

    if (!isset($evidenceCache[$cid])) {
        die("FATAL: Missing evidence bundle for case {$cid}\n");
    }
    $rawEntry = $evidenceCache[$cid];
    $chunks = $rawEntry['top5'] ?? (isset($rawEntry[0]) ? $rawEntry : []);

    $t0 = microtime(true);
    // Explicitly call A4 verifier with candidate model
    $res = RagAmbiguityGuardVerifier::verify($query, $chunks, [
        'mode' => 'A4',
        'model' => $modelName
    ]);
    $elapsedMs = round((microtime(true) - $t0) * 1000, 2);
    $latencies[] = $elapsedMs;

    $predictedStatus = $res['status'] ?? 'PARSE_FAILURE';
    if (!in_array($predictedStatus, ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED'], true)) {
        $parseFailures++;
        $predictedStatus = 'PARSE_FAILURE';
    }

    $isCorrect = ($predictedStatus === $expected);

    $record = [
        'case_id' => $cid,
        'query' => $query,
        'category' => $category,
        'expected' => $expected,
        'predicted' => $predictedStatus,
        'correct' => $isCorrect,
        'confidence' => $res['confidence'] ?? 0.0,
        'decision_tier' => $res['decision_tier'] ?? 'UNKNOWN',
        'decision_reason' => $res['decision_reason'] ?? '',
        'latency_ms' => $elapsedMs,
        'ambiguity_guard' => $res['ambiguity_guard_diagnostics'] ?? null,
        'guard_case' => $res['guard_case'] ?? null,
        'guard_evidence_check' => $res['guard_evidence_check'] ?? null
    ];

    $predictions[$cid] = $record;

    if (($idx + 1) % 25 === 0 || ($idx + 1) === $N) {
        $currentAcc = round((sumCorrect($predictions) / count($predictions)) * 100, 2);
        echo sprintf("[%s | %s] Processed %d/%d (Acc: %.2f%%, Mean Latency: %.1f ms)\n",
            $datasetType, $modelName, $idx + 1, $N, $currentAcc, array_sum($latencies) / max(1, count($latencies)));
        
        $checkpointData = [
            'dataset' => $datasetType,
            'model' => $modelName,
            'processed' => count($predictions),
            'predictions' => $predictions
        ];
        file_put_contents($checkpointFile, json_encode($checkpointData, JSON_PRETTY_PRINT));
    }
}

$totalDuration = microtime(true) - $startTime;
echo sprintf("\n[Complete] Finished %d queries in %.2f seconds (%.2f queries/sec)\n", $N, $totalDuration, $N / max(0.001, $totalDuration));

function sumCorrect(array $preds): int {
    $c = 0;
    foreach ($preds as $p) {
        if (!empty($p['correct'])) $c++;
    }
    return $c;
}

// Compute Metrics
$matrix = [
    'SUPPORTED' => ['SUPPORTED' => 0, 'REFUTED' => 0, 'NOT_ESTABLISHED' => 0, 'PARSE_FAILURE' => 0],
    'REFUTED' => ['SUPPORTED' => 0, 'REFUTED' => 0, 'NOT_ESTABLISHED' => 0, 'PARSE_FAILURE' => 0],
    'NOT_ESTABLISHED' => ['SUPPORTED' => 0, 'REFUTED' => 0, 'NOT_ESTABLISHED' => 0, 'PARSE_FAILURE' => 0]
];

$catCounts = [];
$catCorrect = [];
$correctTotal = 0;

foreach ($predictions as $cid => $p) {
    $exp = $p['expected'];
    $act = $p['predicted'];
    $cat = $p['category'];

    if (!isset($catCounts[$cat])) {
        $catCounts[$cat] = 0;
        $catCorrect[$cat] = 0;
    }
    $catCounts[$cat]++;
    if ($p['correct']) {
        $correctTotal++;
        $catCorrect[$cat]++;
    }

    if (isset($matrix[$exp][$act])) {
        $matrix[$exp][$act]++;
    } else {
        $matrix[$exp]['PARSE_FAILURE']++;
    }
}

$accuracy = round(($correctTotal / $N) * 100, 2);

// Precision, Recall, F1 for each class
$classes = ['SUPPORTED', 'REFUTED', 'NOT_ESTABLISHED'];
$classMetrics = [];
$f1Sum = 0;

foreach ($classes as $cls) {
    $tp = $matrix[$cls][$cls];
    $fn = array_sum($matrix[$cls]) - $tp;
    $fp = 0;
    foreach ($classes as $other) {
        if ($other !== $cls) {
            $fp += $matrix[$other][$cls] ?? 0;
        }
    }
    $prec = ($tp + $fp) > 0 ? $tp / ($tp + $fp) : 0.0;
    $rec = ($tp + $fn) > 0 ? $tp / ($tp + $fn) : 0.0;
    $f1 = ($prec + $rec) > 0 ? 2 * ($prec * $rec) / ($prec + $rec) : 0.0;
    $classMetrics[$cls] = [
        'precision' => round($prec * 100, 2),
        'recall' => round($rec * 100, 2),
        'f1' => round($f1 * 100, 2),
        'tp' => $tp,
        'fp' => $fp,
        'fn' => $fn,
        'support' => array_sum($matrix[$cls])
    ];
    $f1Sum += $f1;
}

$macroF1 = round(($f1Sum / count($classes)) * 100, 2);

// Standard FAR: False acceptances (pred = SUPPORTED) when ground truth is REFUTED or NOT_ESTABLISHED
$falseAcceptances = ($matrix['REFUTED']['SUPPORTED'] ?? 0) + ($matrix['NOT_ESTABLISHED']['SUPPORTED'] ?? 0);
$totalNonSupported = array_sum($matrix['REFUTED']) + array_sum($matrix['NOT_ESTABLISHED']);
$far = $totalNonSupported > 0 ? round(($falseAcceptances / $totalNonSupported) * 100, 2) : 0.0;

// FRR: False rejections (pred = REFUTED or NOT_ESTABLISHED) when ground truth is SUPPORTED
$falseRejections = ($matrix['SUPPORTED']['REFUTED'] ?? 0) + ($matrix['SUPPORTED']['NOT_ESTABLISHED'] ?? 0);
$totalSupported = array_sum($matrix['SUPPORTED']);
$frr = $totalSupported > 0 ? round(($falseRejections / $totalSupported) * 100, 2) : 0.0;

// Category breakdown percentages
$categoryMetrics = [];
foreach ($catCounts as $c => $total) {
    $corr = $catCorrect[$c];
    $categoryMetrics[$c] = [
        'total' => $total,
        'correct' => $corr,
        'accuracy' => round(($corr / $total) * 100, 2)
    ];
}

// Latencies
sort($latencies);
$countLat = count($latencies);
$meanLat = round(array_sum($latencies) / max(1, $countLat), 2);
$p50Lat = $latencies[(int)floor($countLat * 0.50)] ?? 0.0;
$p95Lat = $latencies[(int)floor($countLat * 0.95)] ?? 0.0;

$fullMetrics = [
    'experiment_id' => 'EXP-0065',
    'dataset' => $datasetType,
    'model' => $modelName,
    'total_cases' => $N,
    'correct_total' => $correctTotal,
    'accuracy' => $accuracy,
    'macro_f1' => $macroF1,
    'standard_far' => $far,
    'frr' => $frr,
    'supported_recall' => $classMetrics['SUPPORTED']['recall'],
    'refutation_recall' => $classMetrics['REFUTED']['recall'],
    'not_established_recall' => $classMetrics['NOT_ESTABLISHED']['recall'],
    'parse_failures' => $parseFailures,
    'confusion_matrix' => $matrix,
    'class_metrics' => $classMetrics,
    'category_metrics' => $categoryMetrics,
    'latency' => [
        'mean_ms' => $meanLat,
        'p50_ms' => $p50Lat,
        'p95_ms' => $p95Lat,
        'total_duration_sec' => round($totalDuration, 2)
    ],
    'verification_timestamp' => date('c')
];

echo "\n======================================================================\n";
echo "SUMMARY METRICS: {$datasetType} | {$modelName}\n";
echo "======================================================================\n";
echo "Accuracy:            {$accuracy}%\n";
echo "Macro F1:            {$macroF1}%\n";
echo "Standard FAR:        {$far}%\n";
echo "FRR:                 {$frr}%\n";
echo "Refutation Recall:   {$classMetrics['REFUTED']['recall']}%\n";
echo "Supported Recall:    {$classMetrics['SUPPORTED']['recall']}%\n";
echo "NE Recall:           {$classMetrics['NOT_ESTABLISHED']['recall']}%\n";
echo "Parse Failures:      {$parseFailures}\n";
echo "Mean Latency:        {$meanLat} ms (P50: {$p50Lat} ms, P95: {$p95Lat} ms)\n";
echo "======================================================================\n\n";

file_put_contents($outputFile, json_encode($predictions, JSON_PRETTY_PRINT));
file_put_contents($metricsOutputFile, json_encode($fullMetrics, JSON_PRETTY_PRINT));
echo "[Saved] Predictions to {$outputFile}\n";
echo "[Saved] Metrics to {$metricsOutputFile}\n";
