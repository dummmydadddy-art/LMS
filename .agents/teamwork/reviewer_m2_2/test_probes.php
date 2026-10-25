<?php
require_once __DIR__ . '/../../../backend/rag_pipeline_metrics.php';

echo "=== Testing Normal Probes ===\n";
$start = microtime(true);
$services = RagPipelineMetrics::probeServices();
$elapsed = (microtime(true) - $start) * 1000;
echo "Total probe time: " . round($elapsed, 2) . " ms\n";
foreach ($services as $name => $s) {
    echo "  $name: {$s['status']} ({$s['latency_ms']} ms)\n";
}

echo "\n=== Testing Offline/Unreachable Port Probe (<400ms timeout check) ===\n";
// Reflect or test probeUrl with a non-routable or unused port (e.g. 127.0.0.1:19999)
$ref = new ReflectionClass('RagPipelineMetrics');
$probeUrlMethod = $ref->getMethod('probeUrl');
$probeUrlMethod->setAccessible(true);

$start = microtime(true);
$res = $probeUrlMethod->invoke(null, 'http://127.0.0.1:19999/health', 'GET', [], 350);
$elapsed = (microtime(true) - $start) * 1000;
echo "Unreachable port probe took: " . round($elapsed, 2) . " ms (code: {$res['code']}, latency_ms: {$res['latency_ms']})\n";

// Test blackhole/slow IP (e.g. 10.255.255.1) to test timeout enforcement
$start = microtime(true);
$resSlow = $probeUrlMethod->invoke(null, 'http://10.255.255.1:8100/health', 'GET', [], 350);
$elapsedSlow = (microtime(true) - $start) * 1000;
echo "Blackhole IP timeout probe took: " . round($elapsedSlow, 2) . " ms (code: {$resSlow['code']}, latency_ms: {$resSlow['latency_ms']})\n";

echo "\n=== Done ===\n";
