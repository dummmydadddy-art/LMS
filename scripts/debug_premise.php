<?php
require __DIR__ . '/../backend/config.php';
require __DIR__ . '/../backend/rag_service.php';

$q = "How does useRef differ from useState in triggering re-renders?";
$search = RagService::search($q);
$cands = $search['candidates'] ?? $search['results'] ?? [];
echo "Candidates count: " . count($cands) . "\n";
$res = RagPremiseVerifier::verify($q, $cands);
print_r($res);
