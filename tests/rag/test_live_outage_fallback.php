<?php
/**
 * Empirical Live Outage Test for Semantic Reranker & FrankenPHP RAG Gateway
 * Author: Challenger M1-1
 */

require_once __DIR__ . '/../../backend/rag_flags.php';
require_once __DIR__ . '/../../backend/rag_service.php';

echo "=== 1. Direct applySemanticReranking() during live outage ===\n";
$candidates = [
    [
        'id' => 1,
        'title' => 'Candidate 1 - PostgreSQL 3NF',
        'content' => 'Third normal form requires eliminating transitive functional dependencies.',
        'similarity' => 0.78,
        'rrf_score' => 0.045
    ],
    [
        'id' => 2,
        'title' => 'Candidate 2 - Baking Cookies',
        'content' => 'Baking cookies requires flour, sugar, butter and eggs.',
        'similarity' => 0.75,
        'rrf_score' => 0.035
    ]
];

$t0 = microtime(true);
$result = RagService::applySemanticReranking($candidates, "What is Third Normal Form in relational databases?");
$tElapsed = (microtime(true) - $t0) * 1000;

echo "Elapsed time: " . round($tElapsed, 2) . "ms\n";
echo "Candidates count returned: " . count($result) . "\n";
echo "Top candidate ID: " . $result[0]['id'] . " (Original was 1)\n";
echo "Second candidate ID: " . $result[1]['id'] . " (Original was 2)\n";

if (count($result) === 2 && $result[0]['id'] === 1 && $result[1]['id'] === 2) {
    echo "[SUCCESS] applySemanticReranking() gracefully fell back to RRF candidate order without crash!\n";
} else {
    echo "[FAIL] applySemanticReranking() did not preserve candidates properly!\n";
    exit(1);
}

echo "\n=== 2. Live FrankenPHP Gateway POST /api/rag/ask during outage ===\n";
$ch = curl_init('http://127.0.0.1:8000/api/rag/ask');
$payload = json_encode(['question' => 'What is third normal form in database design?']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Service-Key: lms-n8n-service-key-2026'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$t0 = microtime(true);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);
$tGateway = (microtime(true) - $t0) * 1000;

echo "Gateway HTTP Status: {$httpCode} (Elapsed: " . round($tGateway, 2) . "ms)\n";
if ($httpCode === 200 && $resp) {
    $data = json_decode($resp, true);
    echo "Gateway returned HTTP 200!\n";
    echo "Answer snippet: " . substr($data['answer'] ?? '', 0, 150) . "...\n";
    echo "Sources count: " . count($data['sources'] ?? []) . "\n";
    echo "[SUCCESS] FrankenPHP survived complete reranker microservice outage!\n";
} else {
    echo "[FAIL] Gateway failed during reranker outage: HTTP {$httpCode}, error: {$curlErr}\n";
    echo "Response: {$resp}\n";
    exit(1);
}
