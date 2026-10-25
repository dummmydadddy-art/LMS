<?php
// EduConnect LMS - Pipeline Latency Profiler
// Per-stage microsecond-resolution timing for the RAG pipeline
// Logs to JSONL for analysis and dashboarding

class RagPipelineTimer {
    private array $stages = [];
    private array $activeStages = [];
    private array $markers = [];
    private float $pipelineStart;
    private string $queryId;
    private string $logDir;
    private array $metadata = [];
    
    public function __construct(?string $queryId = null) {
        $this->pipelineStart = microtime(true);
        $this->queryId = $queryId ?? ('q_' . bin2hex(random_bytes(6)));
        $this->logDir = __DIR__ . '/storage/pipeline_logs';
        if (!is_dir($this->logDir)) {
            @mkdir($this->logDir, 0777, true);
        }
    }
    
    public function start(string $stage): void {
        $this->activeStages[$stage] = microtime(true);
    }
    
    public function stop(string $stage): float {
        $endTime = microtime(true);
        if (!isset($this->activeStages[$stage])) {
            return 0.0;
        }
        $startTime = $this->activeStages[$stage];
        $elapsedMs = ($endTime - $startTime) * 1000;
        
        if (!isset($this->stages[$stage])) {
            $this->stages[$stage] = 0.0;
        }
        $this->stages[$stage] += $elapsedMs;
        
        unset($this->activeStages[$stage]);
        return $elapsedMs;
    }
    
    public function mark(string $label): void {
        $this->markers[$label] = microtime(true);
    }
    
    public function getTimings(): array {
        $timings = $this->stages;
        $now = microtime(true);
        foreach ($this->activeStages as $stage => $startTime) {
            $elapsedMs = ($now - $startTime) * 1000;
            $timings[$stage] = ($timings[$stage] ?? 0.0) + $elapsedMs;
        }
        return $timings;
    }
    
    public function getTotalMs(): float {
        return (microtime(true) - $this->pipelineStart) * 1000;
    }
    
    public function addMetadata(array $data): void {
        $this->metadata = array_merge($this->metadata, $data);
    }
    
    public function addMeta(string $key, mixed $value): void {
        $this->metadata[$key] = $value;
    }
    
    public function toArray(): array {
        return [
            'query_id' => $this->queryId,
            'timestamp' => date('c'),
            'total_ms' => round($this->getTotalMs(), 2),
            'stages' => array_map(function($ms) { return round($ms, 2); }, $this->getTimings()),
            'metadata' => $this->metadata
        ];
    }
    
    public function flush(): void {
        try {
            $logFile = $this->logDir . '/pipeline_' . date('Y-m-d') . '.jsonl';
            $json = json_encode($this->toArray()) . "\n";
            @file_put_contents($logFile, $json, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $e) {
            // Fail silently
            error_log("RagPipelineTimer flush failed: " . $e->getMessage());
        }
    }
}
