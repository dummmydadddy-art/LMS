<?php
// EduConnect LMS - Pipeline Analytics
// Analyzes pipeline JSONL logs to compute percentiles and identify bottlenecks

class RagPipelineAnalytics {
    
    private static function calculatePercentile(array $data, float $percentile) {
        if (empty($data)) return 0.0;
        sort($data);
        $index = ($percentile / 100) * (count($data) - 1);
        $floor = floor($index);
        $ceil = ceil($index);
        
        if ($floor == $ceil) {
            return $data[$index];
        }
        
        $lower = $data[$floor];
        $upper = $data[$ceil];
        $fraction = $index - $floor;
        
        return $lower + ($upper - $lower) * $fraction;
    }

    public static function getReport(?string $dateFrom = null, ?string $dateTo = null): array {
        $logDir = __DIR__ . '/storage/pipeline_logs';
        if (!is_dir($logDir)) {
            return [];
        }
        
        $files = glob($logDir . '/pipeline_*.jsonl');
        $entries = [];
        
        $fromTime = $dateFrom ? strtotime($dateFrom) : 0;
        $toTime = $dateTo ? strtotime($dateTo) : PHP_INT_MAX;
        
        foreach ($files as $file) {
            if (preg_match('/pipeline_(\d{4}-\d{2}-\d{2})\.jsonl/', basename($file), $matches)) {
                $fileTime = strtotime($matches[1]);
                if ($fileTime < $fromTime || $fileTime > $toTime) {
                    continue;
                }
            }
            
            $handle = @fopen($file, "r");
            if ($handle) {
                while (($line = fgets($handle)) !== false) {
                    $entry = json_decode($line, true);
                    if ($entry && is_array($entry)) {
                        $entries[] = $entry;
                    }
                }
                fclose($handle);
            }
        }
        
        if (empty($entries)) {
            return [
                'total_queries' => 0,
                'error' => 'No logs found for the given criteria.'
            ];
        }
        
        $totalQueries = count($entries);
        $stageData = [];
        $slowQueries = [];
        $abstentions = 0;
        $queriesPerHour = array_fill(0, 24, 0);
        
        foreach ($entries as $entry) {
            if (($entry['total_ms'] ?? 0) > 3000) {
                $slowQueries[] = $entry;
            }
            
            if (!empty($entry['metadata']['abstained'])) {
                $abstentions++;
            }
            
            if (!empty($entry['timestamp'])) {
                $hour = (int)date('G', strtotime($entry['timestamp']));
                $queriesPerHour[$hour]++;
            }
            
            if (!empty($entry['stages'])) {
                foreach ($entry['stages'] as $stage => $ms) {
                    if (!isset($stageData[$stage])) {
                        $stageData[$stage] = [];
                    }
                    $stageData[$stage][] = $ms;
                }
            }
        }
        
        $perStageStats = [];
        $bottleneckStage = '';
        $maxAvg = 0;
        
        foreach ($stageData as $stage => $times) {
            $avg = array_sum($times) / count($times);
            $p50 = self::calculatePercentile($times, 50);
            $p95 = self::calculatePercentile($times, 95);
            $p99 = self::calculatePercentile($times, 99);
            
            $perStageStats[$stage] = [
                'avg' => round($avg, 2),
                'p50' => round($p50, 2),
                'p95' => round($p95, 2),
                'p99' => round($p99, 2),
                'min' => round(min($times), 2),
                'max' => round(max($times), 2),
                'count' => count($times)
            ];
            
            if ($avg > $maxAvg) {
                $maxAvg = $avg;
                $bottleneckStage = $stage;
            }
        }
        
        usort($slowQueries, function($a, $b) {
            return ($b['total_ms'] ?? 0) <=> ($a['total_ms'] ?? 0);
        });
        
        return [
            'total_queries' => $totalQueries,
            'abstention_rate' => $totalQueries > 0 ? round(($abstentions / $totalQueries) * 100, 2) . '%' : '0%',
            'per_stage_stats' => $perStageStats,
            'bottleneck_stage' => $bottleneckStage,
            'slow_queries' => array_slice($slowQueries, 0, 50),
            'queries_per_hour' => $queriesPerHour
        ];
    }
}
