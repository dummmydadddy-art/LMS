<?php
// Unit & Integration Test for RagPipelineMetrics service
require_once __DIR__ . '/../../backend/rag_pipeline_metrics.php';

echo "Running RagPipelineMetrics Test Suite...\n";

$metrics = RagPipelineMetrics::getMetrics();

// 1. Verify Structure
assert(!empty($metrics['services']), "Services array must not be empty");
assert(isset($metrics['services']['frankenphp']), "frankenphp service must exist");
assert(isset($metrics['services']['reranker']), "reranker service must exist");
assert(isset($metrics['services']['ollama']), "ollama service must exist");

// 2. Verify Knowledge Base Stats
assert(!empty($metrics['knowledge_base']), "knowledge_base must not be empty");
assert($metrics['knowledge_base']['total_chunks'] === 1323, "Total chunks must be 1323, got: " . $metrics['knowledge_base']['total_chunks']);
assert($metrics['knowledge_base']['parent_chunks'] === 333, "Parent chunks must be 333, got: " . $metrics['knowledge_base']['parent_chunks']);
assert($metrics['knowledge_base']['textbooks_count'] === 5, "Textbooks count must be 5, got: " . $metrics['knowledge_base']['textbooks_count']);

// 3. Verify Telemetry
assert(!empty($metrics['telemetry']), "telemetry must not be empty");
assert($metrics['telemetry']['total_queries'] > 0, "total_queries must be > 0");
assert($metrics['telemetry']['cache_hit_rate'] >= 0 && $metrics['telemetry']['cache_hit_rate'] <= 100, "cache_hit_rate must be 0-100%");
assert(isset($metrics['telemetry']['latency_summary']['p50_ms']), "p50_ms must exist");
assert(count($metrics['telemetry']['latency_distribution']) === 6, "Must have 6 latency distribution buckets");
assert(isset($metrics['telemetry']['stage_breakdown']['llm_generation']), "llm_generation stage must exist");

// 4. Verify Academic Benchmarks
assert(!empty($metrics['benchmarks']), "benchmarks must not be empty");
assert($metrics['benchmarks']['overall_status'] === 'PASSED', "overall_status must be PASSED");
assert(count($metrics['benchmarks']['metrics']) === 8, "Must contain exactly 8 benchmark metrics");

echo "[PASS] All RagPipelineMetrics assertions passed successfully!\n";
exit(0);
