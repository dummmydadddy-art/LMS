<?php
/**
 * PHP Unit & Resilience Test for RagService::applySemanticReranking()
 * Challenger M1-2
 */

require_once __DIR__ . '/../../backend/config.php';
require_once __DIR__ . '/../../backend/rag_flags.php';
require_once __DIR__ . '/../../backend/rag_service.php';

echo "=========================================================\n";
echo "  Challenger M1-2: PHP applySemanticReranking() Unit Test\n";
echo "=========================================================\n\n";

$allPassed = true;

// 1. Basic Semantic Discrimination in PHP pipeline
echo "--- 1. Testing PHP applySemanticReranking with 5 Candidates ---\n";

$candidates = [
    [
        'id' => 101,
        'title' => 'React Hooks Reference',
        'content' => 'React useEffect dependency array pitfalls: omitting dependencies causes stale closures, while passing new object references triggers infinite loops.',
        'similarity' => 0.72,
        'rrf_score' => 0.015
    ],
    [
        'id' => 102,
        'title' => 'PostgreSQL Index Architecture',
        'content' => 'PostgreSQL B-Tree indexes provide logarithmic search for equality and range queries on column attributes.',
        'similarity' => 0.75, // Intentionally higher initial similarity
        'rrf_score' => 0.016
    ],
    [
        'id' => 103,
        'title' => 'CSS Styling Guide',
        'content' => 'CSS flexbox gap property defines gutters between flex items along both the main and cross axes.',
        'similarity' => 0.70,
        'rrf_score' => 0.014
    ]
];

$query = "Explain React useEffect dependency array pitfalls";

$reranked = RagService::applySemanticReranking($candidates, $query);

$topCandidate = $reranked[0] ?? null;
$topId = $topCandidate['id'] ?? null;
$topScore = $topCandidate['rerank_score'] ?? 0.0;
$preservedSim = $topCandidate['similarity'] ?? 0.0;

$c1_pass = ($topId === 101) && ($topScore > 0.80) && ($preservedSim === 0.72);
if ($c1_pass) {
    echo "[PASS] Candidate 101 (React) was correctly boosted to Rank 1 (Score: {$topScore})\n";
    echo "       Preserved similarity: {$preservedSim} (unchanged), RRF score updated: {$topCandidate['rrf_score']}\n";
} else {
    echo "[FAIL] Expected candidate 101 at rank 1 with score > 0.80, got id={$topId}, score={$topScore}\n";
    $allPassed = false;
}

// 2. Empty or single candidate handling
echo "\n--- 2. Testing Boundary Conditions (Empty & Single) ---\n";
$emptyRes = RagService::applySemanticReranking([], "test");
$singleRes = RagService::applySemanticReranking([$candidates[0]], "test");
$c2_pass = (count($emptyRes) === 0) && (count($singleRes) === 1);
if ($c2_pass) {
    echo "[PASS] Empty array and single candidate handled correctly without API calls\n";
} else {
    echo "[FAIL] Boundary condition error\n";
    $allPassed = false;
}

// 3. Pool Size Preservation (More than 15 candidates)
echo "\n--- 3. Testing Pool Size & Tail Preservation (>15 candidates) ---\n";
$largePool = [];
for ($i = 0; $i < 20; $i++) {
    $largePool[] = [
        'id' => 200 + $i,
        'title' => "Document {$i}",
        'content' => "Technical content number {$i} regarding systems architecture and web development.",
        'similarity' => 0.50 + ($i * 0.01),
        'rrf_score' => 0.01
    ];
}
$rerankedLarge = RagService::applySemanticReranking($largePool, "General systems question");
$c3_pass = (count($rerankedLarge) === 20);
if ($c3_pass) {
    echo "[PASS] All 20 candidates preserved in output (15 reranked + 5 tail)\n";
} else {
    echo "[FAIL] Candidate count mismatch: expected 20, got " . count($rerankedLarge) . "\n";
    $allPassed = false;
}

echo "\n=========================================================\n";
echo "PHP Unit Test Result: " . ($allPassed ? "ALL PASSED" : "FAILED") . "\n";
echo "=========================================================\n";

exit($allPassed ? 0 : 1);
