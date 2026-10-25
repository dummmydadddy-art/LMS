<?php
// Simulates the exact loop inside RagPipelineMetrics::getTelemetryStats

$entries = [
    [], // empty
    ['metadata' => []], // empty metadata
    ['metadata' => ['cache_hit' => false], 'total_ms' => 0], // zero latency
    ['metadata' => ['cache_hit' => true], 'stages' => ['cache_lookup' => 5]], // missing total_ms
    ['metadata' => null, 'stages' => null, 'total_ms' => null],
    ['metadata' => ['cache_hit' => true], 'stages' => ['total_pipeline' => 500, 'llm_generation' => 450]],
];

$totalQueries = count($entries);
$cacheHits = 0;
$cacheMisses = 0;
$totalLatencies = [];
$stageData = [
    'cache_lookup' => [],
    'retrieval' => [],
    'confidence_gate' => [],
    'context_compression' => [],
    'llm_generation' => [],
    'total_pipeline' => []
];

$buckets = [
    '< 100ms' => 0,
    '100ms - 500ms' => 0,
    '500ms - 2s' => 0,
    '2s - 5s' => 0,
    '5s - 10s' => 0,
    '> 10s' => 0
];

foreach ($entries as $entry) {
    $isHit = !empty($entry['metadata']['cache_hit']);
    if ($isHit) {
        $cacheHits++;
    } else {
        $cacheMisses++;
    }

    $totalMs = isset($entry['total_ms']) ? (float)$entry['total_ms'] : (float)($entry['stages']['total_pipeline'] ?? 0);
    $totalLatencies[] = $totalMs;

    // Categorize in bucket
    if ($totalMs < 100) {
        $buckets['< 100ms']++;
    } elseif ($totalMs < 500) {
        $buckets['100ms - 500ms']++;
    } elseif ($totalMs < 2000) {
        $buckets['500ms - 2s']++;
    } elseif ($totalMs < 5000) {
        $buckets['2s - 5s']++;
    } elseif ($totalMs < 10000) {
        $buckets['5s - 10s']++;
    } else {
        $buckets['> 10s']++;
    }

    if (!empty($entry['stages']) && is_array($entry['stages'])) {
        foreach ($entry['stages'] as $stage => $ms) {
            if (isset($stageData[$stage])) {
                $stageData[$stage][] = (float)$ms;
            }
        }
    }
}

$cacheHitRate = $totalQueries > 0 ? round(($cacheHits / $totalQueries) * 100, 1) : 0.0;

sort($totalLatencies);
$latencySummary = [
    'min_ms' => round(min($totalLatencies), 2),
    'max_ms' => round(max($totalLatencies), 2),
    'avg_ms' => round(array_sum($totalLatencies) / count($totalLatencies), 2),
];

echo "Success! Cache hit rate: $cacheHitRate%\n";
print_r($latencySummary);
echo "Distribution buckets:\n";
print_r($buckets);
