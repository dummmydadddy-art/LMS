<?php

class RagSemanticCache {
    private static ?PDO $db = null;
    private static float $similarityThreshold = 0.92;
    private static int $ttlSeconds = 86400; // 24 hours default
    private static int $maxCacheSize = 500; // max entries

    public static function getDb(): PDO {
        if (self::$db !== null) {
            return self::$db;
        }

        try {
            $dbPath = __DIR__ . '/storage/semantic_cache.sqlite';
            $dir = dirname($dbPath);
            if (!file_exists($dir)) {
                @mkdir($dir, 0777, true);
            }

            self::$db = new PDO('sqlite:' . $dbPath);
            self::$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Enable WAL mode for concurrency
            self::$db->exec('PRAGMA journal_mode=WAL;');

            self::$db->exec('
                CREATE TABLE IF NOT EXISTS query_cache (
                    id TEXT PRIMARY KEY,
                    query TEXT NOT NULL,
                    query_normalized TEXT NOT NULL,
                    query_embedding BLOB NOT NULL,
                    response_json TEXT NOT NULL,
                    course_id TEXT,
                    hit_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    last_hit_at DATETIME
                );
                CREATE INDEX IF NOT EXISTS idx_cache_course ON query_cache(course_id);
                CREATE INDEX IF NOT EXISTS idx_cache_expires ON query_cache(expires_at);
            ');
        } catch (Exception $e) {
            error_log('[RagSemanticCache] DB Init error: ' . $e->getMessage());
            // Fallback to memory db so it doesn't crash
            self::$db = new PDO('sqlite::memory:');
            self::$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }

        return self::$db;
    }

    private static function normalize(string $query): string {
        return trim(preg_replace('/\s+/', ' ', strtolower($query)));
    }

    public static function lookup(string $query, array $queryEmbedding, ?string $courseId = null): ?array {
        try {
            $db = self::getDb();
            $normalized = self::normalize($query);
            $now = gmdate('Y-m-d H:i:s');
            
            // 1. Exact match check
            $stmt = $db->prepare('SELECT id, response_json FROM query_cache WHERE query_normalized = :q AND expires_at > :now AND (course_id = :c OR course_id IS NULL)');
            $stmt->execute([':q' => $normalized, ':now' => $now, ':c' => $courseId]);
            $exact = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($exact) {
                self::recordHit($exact['id']);
                $resp = json_decode($exact['response_json'], true);
                if (is_array($resp)) {
                    $resp['cache_hit'] = true;
                    $resp['cache_type'] = 'exact';
                    return $resp;
                }
            }
            
            // 2. Semantic match check
            $sql = 'SELECT id, query_embedding, response_json FROM query_cache WHERE expires_at > :now';
            $params = [':now' => $now];
            if ($courseId !== null) {
                $sql .= ' AND (course_id = :c OR course_id IS NULL)';
                $params[':c'] = $courseId;
            }
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $bestMatch = null;
            $bestScore = -1;
            
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $emb = array_values(unpack('f*', $row['query_embedding']));
                $score = self::cosineSimilarity($queryEmbedding, $emb);
                
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestMatch = $row;
                }
            }
            
            if ($bestScore >= self::$similarityThreshold && $bestMatch !== null) {
                self::recordHit($bestMatch['id']);
                $resp = json_decode($bestMatch['response_json'], true);
                if (is_array($resp)) {
                    $resp['cache_hit'] = true;
                    $resp['cache_type'] = 'semantic';
                    $resp['similarity'] = $bestScore;
                    return $resp;
                }
            }
            
            return null;
        } catch (Exception $e) {
            error_log('[RagSemanticCache] Lookup error: ' . $e->getMessage());
            return null;
        }
    }

    private static function recordHit(string $id): void {
        try {
            $db = self::getDb();
            $stmt = $db->prepare('UPDATE query_cache SET hit_count = hit_count + 1, last_hit_at = :now WHERE id = :id');
            $stmt->execute([':now' => gmdate('Y-m-d H:i:s'), ':id' => $id]);
        } catch (Exception $e) {
            // ignore
        }
    }

    public static function store(string $query, array $queryEmbedding, array $response, ?string $courseId = null): bool {
        try {
            $db = self::getDb();
            self::evictLRU();
            
            $normalized = self::normalize($query);
            $id = hash('sha256', $normalized . ($courseId ?? ''));
            $packedEmb = pack('f*', ...$queryEmbedding);
            $responseJson = json_encode($response);
            $expires = gmdate('Y-m-d H:i:s', time() + self::$ttlSeconds);
            
            $stmt = $db->prepare('
                INSERT OR REPLACE INTO query_cache 
                (id, query, query_normalized, query_embedding, response_json, course_id, expires_at) 
                VALUES (:id, :q, :qn, :qe, :rj, :c, :ex)
            ');
            
            return $stmt->execute([
                ':id' => $id,
                ':q' => $query,
                ':qn' => $normalized,
                ':qe' => $packedEmb,
                ':rj' => $responseJson,
                ':c' => $courseId,
                ':ex' => $expires
            ]);
        } catch (Exception $e) {
            error_log('[RagSemanticCache] Store error: ' . $e->getMessage());
            return false;
        }
    }

    public static function invalidateCourse(string $courseId): int {
        try {
            $db = self::getDb();
            $stmt = $db->prepare('DELETE FROM query_cache WHERE course_id = :c');
            $stmt->execute([':c' => $courseId]);
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log('[RagSemanticCache] Invalidate error: ' . $e->getMessage());
            return 0;
        }
    }

    public static function invalidateOnCorpusChange(): int {
        return self::flush();
    }

    public static function purgeExpired(): int {
        try {
            $db = self::getDb();
            $stmt = $db->prepare('DELETE FROM query_cache WHERE expires_at <= :now');
            $stmt->execute([':now' => gmdate('Y-m-d H:i:s')]);
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log('[RagSemanticCache] Purge error: ' . $e->getMessage());
            return 0;
        }
    }

    private static function evictLRU(): void {
        try {
            $db = self::getDb();
            $count = $db->query('SELECT COUNT(*) FROM query_cache')->fetchColumn();
            
            if ($count >= self::$maxCacheSize) {
                $limit = $count - self::$maxCacheSize + 10;
                $db->exec("
                    DELETE FROM query_cache 
                    WHERE id IN (
                        SELECT id FROM query_cache 
                        ORDER BY COALESCE(last_hit_at, created_at) ASC 
                        LIMIT $limit
                    )
                ");
            }
        } catch (Exception $e) {
            // ignore
        }
    }

    public static function getStats(): array {
        try {
            $db = self::getDb();
            $stats = $db->query('
                SELECT 
                    COUNT(*) as total_entries, 
                    SUM(hit_count) as total_hits,
                    MIN(created_at) as oldest_entry,
                    MAX(created_at) as newest_entry
                FROM query_cache
            ')->fetch(PDO::FETCH_ASSOC);
            
            $stats['total_entries'] = (int)$stats['total_entries'];
            $stats['total_hits'] = (int)$stats['total_hits'];
            
            $sizeBytes = 0;
            $dbPath = __DIR__ . '/storage/semantic_cache.sqlite';
            if (file_exists($dbPath)) {
                $sizeBytes = filesize($dbPath);
            }
            
            return [
                'total_entries' => $stats['total_entries'],
                'total_hits' => $stats['total_hits'],
                'hit_rate' => $stats['total_entries'] > 0 ? round($stats['total_hits'] / max(1, $stats['total_entries'] + $stats['total_hits']), 2) : 0,
                'avg_similarity' => null,
                'oldest_entry' => $stats['oldest_entry'],
                'newest_entry' => $stats['newest_entry'],
                'size_bytes' => $sizeBytes
            ];
        } catch (Exception $e) {
            error_log('[RagSemanticCache] Stats error: ' . $e->getMessage());
            return [];
        }
    }

    public static function flush(): int {
        try {
            $db = self::getDb();
            $count = $db->exec('DELETE FROM query_cache');
            return $count !== false ? $count : 0;
        } catch (Exception $e) {
            error_log('[RagSemanticCache] Flush error: ' . $e->getMessage());
            return 0;
        }
    }

    private static function cosineSimilarity(array $vecA, array $vecB): float {
        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;
        
        $count = min(count($vecA), count($vecB));
        for ($i = 0; $i < $count; $i++) {
            $a = $vecA[$i] ?? 0;
            $b = $vecB[$i] ?? 0;
            $dotProduct += $a * $b;
            $normA += $a * $a;
            $normB += $b * $b;
        }
        
        if ($normA == 0 || $normB == 0) return 0.0;
        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }
}
