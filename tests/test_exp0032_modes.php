<?php
require_once __DIR__ . '/backend/exp0032_retrieval.php';

$query = "How does the useEffect cleanup function prevent memory leaks in React?";
echo "======================================================================\n";
echo "EXP-0032: Integration Test Across Retrieval Modes R0–R4\n";
echo "Query: '{$query}'\n";
echo "======================================================================\n\n";

$modes = ['R0', 'R1', 'R2', 'R3', 'R4'];
$expectedKeys = ['id', 'title', 'content', 'similarity', 'rank', 'retrieval_method', 'metadata'];

$allPassed = true;

foreach ($modes as $mode) {
    echo "----------------------------------------------------------------------\n";
    echo "Testing Mode: {$mode}\n";
    echo "----------------------------------------------------------------------\n";

    $t0 = microtime(true);
    $response = Exp0032Retrieval::search($query, $mode, 5);
    $elapsedMs = round((microtime(true) - $t0) * 1000, 2);

    $results = $response['results'] ?? [];
    $count = count($results);

    echo "  Embedding Model : " . ($response['embedding_model'] ?? 'N/A') . "\n";
    echo "  Reranker Model  : " . ($response['reranker_model'] ?? 'N/A') . "\n";
    echo "  Retrieved Count : {$count}\n";
    echo "  Adapter Latency : {$elapsedMs} ms\n\n";

    if ($count === 0) {
        echo "  [FAIL] Zero results returned for mode {$mode}!\n\n";
        $allPassed = false;
        continue;
    }

    // Verify common schema for every item
    $schemaValid = true;
    foreach ($results as $idx => $r) {
        foreach ($expectedKeys as $k) {
            if (!array_key_exists($k, $r)) {
                echo "  [FAIL] Missing key '{$k}' in item {$idx}!\n";
                $schemaValid = false;
                $allPassed = false;
            }
        }
        if (!is_string($r['id']) || empty($r['id'])) $schemaValid = false;
        if (!is_string($r['title']) || empty($r['title'])) $schemaValid = false;
        if (!is_string($r['content']) || empty($r['content'])) $schemaValid = false;
        if (!is_numeric($r['similarity'])) $schemaValid = false;
        if (!is_int($r['rank']) || $r['rank'] !== ($idx + 1)) $schemaValid = false;
        if (!is_string($r['retrieval_method']) || empty($r['retrieval_method'])) $schemaValid = false;
        if (!is_array($r['metadata'])) $schemaValid = false;
    }

    if ($schemaValid) {
        echo "  [SCHEMA VERIFIED] All {$count} items conform 100% to common result contract.\n\n";
    } else {
        echo "  [SCHEMA ERROR] Validation failed for mode {$mode}!\n\n";
    }

    // Print Top 5 Chunks
    echo "  Top Retrieved Chunks:\n";
    foreach ($results as $r) {
        $preview = str_replace(["\r", "\n"], " ", substr($r['content'], 0, 75));
        printf("    Rank %d | Sim: %0.4f | Method: %-10s | Title: %-25s | Content: %s...\n",
            $r['rank'],
            $r['similarity'],
            $r['retrieval_method'],
            substr($r['title'], 0, 25),
            $preview
        );
    }
    echo "\n";
}

echo "======================================================================\n";
if ($allPassed) {
    echo "ALL INTEGRATION TESTS PASSED (Modes R0, R1, R2, R3, R4)\n";
} else {
    echo "SOME INTEGRATION TESTS FAILED\n";
}
echo "======================================================================\n";
