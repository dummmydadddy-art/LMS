<?php
// EduConnect-LMS Comprehensive System Audit Script
// Validates all subsystems, databases, server runtime, and RAG pipelines

require_once __DIR__ . '/../../backend/config.php';
require_once __DIR__ . '/../../backend/db.php';
require_once __DIR__ . '/../../backend/rag_service.php';
require_once __DIR__ . '/../../backend/rag_premise_verifier.php';
require_once __DIR__ . '/../../backend/rag_safety_boundary.php';
require_once __DIR__ . '/../../backend/rag_pipeline_timer.php';
require_once __DIR__ . '/../../backend/rag_semantic_cache.php';

echo "=========================================================================\n";
echo "   EduConnect-LMS: Comprehensive Subsystem Health Audit\n";
echo "   Date: " . date('Y-m-d H:i:s') . "\n";
echo "=========================================================================\n\n";

$auditResults = [
    'subsystems' => [],
    'all_ok' => true
];

function recordCheck(string $name, bool $passed, string $details = '') {
    global $auditResults;
    $status = $passed ? "[OK]  " : "[FAIL]";
    echo sprintf("%s %-40s %s\n", $status, $name, $details);
    $auditResults['subsystems'][$name] = [
        'passed' => $passed,
        'details' => $details
    ];
    if (!$passed) $auditResults['all_ok'] = false;
}

// -------------------------------------------------------------
// 1. Storage & Database Subsystem
// -------------------------------------------------------------
echo "--- 1. Storage & Vector Database ---\n";
try {
    $db = RagService::getLocalDb();
    recordCheck("SQLite Connection", true, "Connected to vectors.sqlite");
    
    $totalChunks = (int)$db->query("SELECT count(*) FROM material_chunks")->fetchColumn();
    recordCheck("Corpus Scale (Chunks)", $totalChunks >= 1000, "Total: {$totalChunks} chunks");
    
    $dist = $db->query("SELECT material_id, count(*) as cnt FROM material_chunks GROUP BY material_id ORDER BY cnt DESC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($dist as $d) {
        echo sprintf("      - %-35s : %4d chunks\n", $d['material_id'], $d['cnt']);
    }
    
    $sampleChunk = $db->query("SELECT id, title, length(embedding) as emb_len FROM material_chunks LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $hasEmb = ($sampleChunk && $sampleChunk['emb_len'] > 0);
    recordCheck("Vector Embedding Storage", $hasEmb, "Binary BLOB present ({$sampleChunk['emb_len']} bytes)");
} catch (Exception $e) {
    recordCheck("Storage & Database", false, $e->getMessage());
}

// -------------------------------------------------------------
// 2. Ollama Inference & Embedding Gateway
// -------------------------------------------------------------
echo "\n--- 2. Ollama Local LLM Gateway ---\n";
try {
    $ch = curl_init('http://localhost:11434/api/tags');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $tagsRaw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $ollamaUp = ($httpCode === 200 && $tagsRaw);
    recordCheck("Ollama Daemon HTTP", $ollamaUp, "Port 11434 responding");
    
    if ($ollamaUp) {
        $tagsData = json_decode($tagsRaw, true);
        $models = array_column($tagsData['models'] ?? [], 'name');
        $hasNomic = in_array('nomic-embed-text:latest', $models, true);
        $hasLlama = in_array('llama3.2:latest', $models, true);
        $hasQwen = in_array('qwen3:4b', $models, true);
        
        recordCheck("Embedding Model (nomic-embed-text)", $hasNomic, "Present");
        recordCheck("Production Generator (llama3.2)", $hasLlama, "Present");
        recordCheck("Evaluation Judge (qwen3:4b)", $hasQwen, "Present");
        
        // Test single embedding call
        $t0 = microtime(true);
        $emb = RagService::getEmbedding("test query for audit");
        $lat = round((microtime(true) - $t0) * 1000, 1);
        $embValid = (is_array($emb) && count($emb) === 768);
        recordCheck("Embedding Generation", $embValid, "768-dim vector generated in {$lat}ms");
    }
} catch (Exception $e) {
    recordCheck("Ollama Subsystem", false, $e->getMessage());
}

// -------------------------------------------------------------
// 3. Retrieval & Ranking Engine
// -------------------------------------------------------------
echo "\n--- 3. Retrieval & Ranking Engine ---\n";
try {
    $t0 = microtime(true);
    $res = RagService::search("What is the CSS Box Model?", null, null, 4, 0.20);
    $lat = round((microtime(true) - $t0) * 1000, 1);
    
    $results = $res['results'] ?? [];
    $hasResults = count($results) > 0;
    $topSim = $results[0]['similarity'] ?? 0;
    recordCheck("Hybrid Search (Dense + BM25)", $hasResults, "{$lat}ms, top sim: " . round($topSim, 3));
    
    // Check prewarmed cache
    $prewarmed = RagService::isPrewarmedMode();
    recordCheck("Prewarmed Corpus Mode", $prewarmed, "Mode: " . RagService::$experimentMode);
} catch (Exception $e) {
    recordCheck("Retrieval Engine", false, $e->getMessage());
}

// -------------------------------------------------------------
// 4. Safety, Boundary & Presupposition Verification
// -------------------------------------------------------------
echo "\n--- 4. Safety & Verification Subsystem ---\n";
try {
    // 4.1 Boundary test: quantum computing
    $bound1 = RagSafetyBoundary::evaluate("How does quantum superposition work?");
    recordCheck("Out-of-Domain Rejection (Quantum)", $bound1['action'] === 'ABSTAIN', "Action: " . $bound1['action']);
    
    // 4.2 Boundary test: culinary trap
    $bound2 = RagSafetyBoundary::evaluate("How to bake chocolate chip cookies in React?");
    recordCheck("Non-Academic Trap Rejection (Bake)", $bound2['action'] === 'ABSTAIN', "Action: " . $bound2['action']);
    
    // 4.3 Operator syntax trap: ===!
    $chunksFake = RagService::search("Does ===! operator exist in JavaScript?", null, null, 4, 0.20)['results'] ?? [];
    $verFake = RagPremiseVerifier::verify("Does ===! operator exist in JavaScript?", $chunksFake);
    recordCheck("Fabricated Syntax Trap (===!)", $verFake['status'] === 'REFUTED', "Status: " . $verFake['status']);
    
    // 4.4 Valid curriculum query: Box Model
    $chunksValid = RagService::search("Explain the four layers of the CSS Box Model from inside out.", null, null, 4, 0.20)['results'] ?? [];
    $verValid = RagPremiseVerifier::verify("Explain the four layers of the CSS Box Model from inside out.", $chunksValid);
    recordCheck("Valid Query Preservation (Box Model)", $verValid['status'] === 'SUPPORTED', "Status: " . $verValid['status']);
} catch (Exception $e) {
    recordCheck("Verification Subsystem", false, $e->getMessage());
}

// -------------------------------------------------------------
// 5. FrankenPHP Live Gateway
// -------------------------------------------------------------
echo "\n--- 5. Live FrankenPHP HTTP Gateway (127.0.0.1:8000) ---\n";
try {
    $t0 = microtime(true);
    $payload = json_encode([
        'question' => 'Explain the four layers of the CSS Box Model from inside out.',
        'student_id' => 'system_audit_bot'
    ]);
    
    $ch = curl_init('http://127.0.0.1:8000/api/rag/ask');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Service-Key: lms-n8n-service-key-2026'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $httpResp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $lat = round((microtime(true) - $t0) * 1000, 1);
    curl_close($ch);
    
    $apiUp = ($httpCode === 200 && $httpResp);
    $data = json_decode($httpResp, true);
    $hasAnswer = !empty($data['answer']);
    recordCheck("Gateway POST /api/rag/ask", ($apiUp && $hasAnswer), "HTTP {$httpCode} in {$lat}ms, Answer len: " . strlen($data['answer'] ?? ''));
} catch (Exception $e) {
    recordCheck("FrankenPHP Gateway", false, $e->getMessage());
}

// -------------------------------------------------------------
// 6. Semantic Cache & Profiling
// -------------------------------------------------------------
echo "\n--- 6. Semantic Cache & Latency Profiling ---\n";
try {
    $logDir = dirname(__DIR__) . '/../backend/storage/pipeline_logs';
    $logFile = $logDir . '/pipeline_' . date('Y-m-d') . '.jsonl';
    $hasMetrics = file_exists($logFile);
    $metricsSize = $hasMetrics ? filesize($logFile) : 0;
    recordCheck("Pipeline Latency Telemetry (JSONL)", $hasMetrics, "File size: " . number_format($metricsSize) . " bytes (" . basename($logFile) . ")");
    
    $cacheStats = RagSemanticCache::getStats();
    recordCheck("Semantic Query Cache", is_array($cacheStats), "Entries: " . ($cacheStats['total_entries'] ?? 0));
} catch (Exception $e) {
    recordCheck("Cache & Profiling", false, $e->getMessage());
}

echo "\n=========================================================================\n";
if ($auditResults['all_ok']) {
    echo "   SYSTEM AUDIT RESULT: ALL SUBSYSTEMS HEALTHY & OPERATIONAL (100% OK)\n";
} else {
    echo "   SYSTEM AUDIT RESULT: WARNINGS / FAILURES DETECTED\n";
}
echo "=========================================================================\n";
