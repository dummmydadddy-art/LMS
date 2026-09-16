<?php
/**
 * EXP-0032: Isolated Hardware-Constrained Open-Source Retrieval Benchmark Adapter
 * 
 * Implements Modes R0–R4 exposing a unified retrieval schema:
 *   - R0: Baseline nomic-embed-text (768d, Ollama) + Okapi BM25 + RRF (k=60) + rule-based reranker
 *   - R1: BAAI/bge-small-en-v1.5 (384d, Bridge) + Okapi BM25 + RRF (k=60)
 *   - R2: intfloat/e5-small-v2 (384d, Bridge, 'query: ' prefix) + Okapi BM25 + RRF (k=60)
 *   - R3: Baseline R0 (pool=10) + ms-marco-MiniLM-L-6-v2 reranker (top 5, CPU)
 *   - R4: Mode R1 (pool=10) + ms-marco-MiniLM-L-6-v2 reranker (top 5, CPU)
 * 
 * Strict Constraint: Frozen EXP-0031 E4 verifier interface must not be modified.
 */

require_once __DIR__ . '/rag_service.php';

class Exp0032Retrieval {
    private static string $bridgeUrl = 'http://127.0.0.1:8100';
    private static ?PDO $dbExp0032 = null;

    /**
     * Get SQLite connection to EXP-0032 benchmark table.
     */
    public static function getExp0032Db(): PDO {
        if (self::$dbExp0032 === null) {
            $dbPath = dirname(__DIR__) . '/database/rag_materials.sqlite3';
            self::$dbExp0032 = new PDO("sqlite:" . $dbPath);
            self::$dbExp0032->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }
        return self::$dbExp0032;
    }

    /**
     * Query Python bridge for embeddings.
     */
    public static function getBridgeEmbedding(string $text, string $model = 'BAAI/bge-small-en-v1.5'): ?array {
        $url = self::$bridgeUrl . '/embed';
        $payload = json_encode([
            'texts' => [$text],
            'normalize' => true,
            'model' => $model
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && $res) {
            $data = json_decode($res, true);
            if (!empty($data['vectors'][0])) {
                return $data['vectors'][0];
            }
        }
        return null;
    }

    /**
     * Query Python bridge for cross-encoder reranking.
     */
    public static function rerankCandidates(string $query, array $candidates, int $topN = 5): array {
        if (empty($candidates)) {
            return [];
        }

        $docs = [];
        foreach ($candidates as $c) {
            $docs[] = [
                'id' => $c['id'],
                'text' => ($c['title'] ?? '') . "\n\n" . ($c['content'] ?? '')
            ];
        }

        $url = self::$bridgeUrl . '/rerank';
        $payload = json_encode([
            'query' => $query,
            'documents' => $docs,
            'top_n' => $topN,
            'model' => 'cross-encoder/ms-marco-MiniLM-L-6-v2'
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && $res) {
            $data = json_decode($res, true);
            if (!empty($data['results'])) {
                // Map reranked order back to candidate objects
                $candMap = [];
                foreach ($candidates as $c) {
                    $candMap[$c['id']] = $c;
                }

                $reranked = [];
                foreach ($data['results'] as $r) {
                    $docId = $r['id'];
                    if (isset($candMap[$docId])) {
                        $cand = $candMap[$docId];
                        // Convert logit score to sigmoid similarity in [0, 1]
                        $logit = (float)$r['score'];
                        $prob = 1.0 / (1.0 + exp(-$logit));
                        $cand['similarity'] = round($prob, 4);
                        $cand['rerank_score'] = $logit;
                        $cand['rank'] = (int)$r['rank'];
                        $cand['retrieval_method'] = 'reranked';
                        $reranked[] = $cand;
                    }
                }
                return $reranked;
            }
        }

        // Fallback: return original candidates if reranking fails
        return array_slice($candidates, 0, $topN);
    }

    /**
     * Execute retrieval for any mode R0–R4.
     *
     * @param string $query Query string
     * @param string $mode 'R0' | 'R1' | 'R2' | 'R3' | 'R4'
     * @param int $limit Output candidate limit (default: 5)
     * @param float $threshold Minimum similarity threshold (default: 0.20)
     * @return array
     */
    public static function search(string $query, string $mode = 'R0', int $limit = 5, float $threshold = 0.20): array {
        $mode = strtoupper(trim($mode));

        switch ($mode) {
            case 'R0':
                return self::searchR0($query, $limit, $threshold);
            case 'R1':
                return self::searchR1($query, $limit, $threshold);
            case 'R2':
                return self::searchR2($query, $limit, $threshold);
            case 'R3':
                return self::searchR3($query, $limit, $threshold);
            case 'R4':
                return self::searchR4($query, $limit, $threshold);
            default:
                throw new InvalidArgumentException("Unknown EXP-0032 retrieval mode: {$mode}. Supported: R0, R1, R2, R3, R4.");
        }
    }

    /**
     * Mode R0: Baseline nomic-embed-text (768d) + BM25 + RRF + rule-based rerank.
     */
    public static function searchR0(string $query, int $limit = 5, float $threshold = 0.20): array {
        $coreRes = RagService::searchCore($query, null, null, $limit, $threshold);
        $results = $coreRes['results'] ?? [];

        $formatted = [];
        foreach ($results as $idx => $item) {
            $formatted[] = [
                'id' => (string)($item['id'] ?? ''),
                'title' => (string)($item['title'] ?? ''),
                'content' => (string)($item['content'] ?? ''),
                'similarity' => (float)($item['similarity'] ?? 0.0),
                'rank' => $idx + 1,
                'retrieval_method' => 'hybrid',
                'metadata' => is_string($item['metadata'] ?? '') ? (json_decode($item['metadata'], true) ?: []) : ($item['metadata'] ?? [])
            ];
        }

        return [
            'mode' => 'R0',
            'query' => $query,
            'embedding_model' => 'nomic-embed-text',
            'reranker_model' => 'none',
            'count' => count($formatted),
            'results' => $formatted
        ];
    }

    /**
     * Mode R1: BAAI/bge-small-en-v1.5 (384d) + BM25 + RRF.
     */
    public static function searchR1(string $query, int $limit = 5, float $threshold = 0.20): array {
        return self::execute384dHybridSearch(
            $query,
            'BAAI/bge-small-en-v1.5',
            $query, // BGE does not require query prefix
            $limit,
            $threshold,
            'R1'
        );
    }

    /**
     * Mode R2: intfloat/e5-small-v2 (384d) + BM25 + RRF.
     */
    public static function searchR2(string $query, int $limit = 5, float $threshold = 0.20): array {
        $cleanQuery = RagService::preprocessQuery($query);
        $e5Query = "query: " . $cleanQuery;

        return self::execute384dHybridSearch(
            $query,
            'intfloat/e5-small-v2',
            $e5Query, // Strict E5 asymmetric query prefix
            $limit,
            $threshold,
            'R2'
        );
    }

    /**
     * Mode R3: Baseline R0 (candidate pool = 10) + MiniLM Reranker (top 5, CPU).
     */
    public static function searchR3(string $query, int $limit = 5, float $threshold = 0.20): array {
        // Step 1: Retrieve candidate pool of 10 from baseline R0
        $poolRes = self::searchR0($query, 10, $threshold);
        $candidates = $poolRes['results'] ?? [];

        // Step 2: Cross-encoder rerank top 10 down to top 5
        $reranked = self::rerankCandidates($query, $candidates, $limit);

        // Format to common schema
        $formatted = [];
        foreach ($reranked as $idx => $item) {
            $formatted[] = [
                'id' => (string)($item['id'] ?? ''),
                'title' => (string)($item['title'] ?? ''),
                'content' => (string)($item['content'] ?? ''),
                'similarity' => (float)($item['similarity'] ?? 0.0),
                'rank' => $idx + 1,
                'retrieval_method' => 'reranked',
                'metadata' => $item['metadata'] ?? []
            ];
        }

        return [
            'mode' => 'R3',
            'query' => $query,
            'embedding_model' => 'nomic-embed-text',
            'reranker_model' => 'cross-encoder/ms-marco-MiniLM-L-6-v2',
            'candidate_pool' => count($candidates),
            'count' => count($formatted),
            'results' => $formatted
        ];
    }

    /**
     * Mode R4: BGE-small R1 (candidate pool = 10) + MiniLM Reranker (top 5, CPU).
     */
    public static function searchR4(string $query, int $limit = 5, float $threshold = 0.20): array {
        // Step 1: Retrieve candidate pool of 10 from R1
        $poolRes = self::searchR1($query, 10, $threshold);
        $candidates = $poolRes['results'] ?? [];

        // Step 2: Cross-encoder rerank top 10 down to top 5
        $reranked = self::rerankCandidates($query, $candidates, $limit);

        // Format to common schema
        $formatted = [];
        foreach ($reranked as $idx => $item) {
            $formatted[] = [
                'id' => (string)($item['id'] ?? ''),
                'title' => (string)($item['title'] ?? ''),
                'content' => (string)($item['content'] ?? ''),
                'similarity' => (float)($item['similarity'] ?? 0.0),
                'rank' => $idx + 1,
                'retrieval_method' => 'reranked',
                'metadata' => $item['metadata'] ?? []
            ];
        }

        return [
            'mode' => 'R4',
            'query' => $query,
            'embedding_model' => 'BAAI/bge-small-en-v1.5',
            'reranker_model' => 'cross-encoder/ms-marco-MiniLM-L-6-v2',
            'candidate_pool' => count($candidates),
            'count' => count($formatted),
            'results' => $formatted
        ];
    }

    /**
     * Core 384-dimensional Hybrid Retrieval Engine (used by R1 and R2).
     */
    private static function execute384dHybridSearch(
        string $rawQuery,
        string $modelName,
        string $embedQuery,
        int $limit,
        float $threshold,
        string $modeLabel
    ): array {
        $cleanQuery = RagService::preprocessQuery($rawQuery);

        // 1. Generate 384-dim query vector via Python Bridge
        $queryEmbedding = self::getBridgeEmbedding($embedQuery, $modelName);
        if (!$queryEmbedding || count($queryEmbedding) !== 384) {
            return [
                'mode' => $modeLabel,
                'query' => $rawQuery,
                'error' => "Could not generate 384-dim embedding from bridge for {$modelName}",
                'count' => 0,
                'results' => []
            ];
        }

        // 2. Fetch candidates from dedicated material_chunks_exp0032 table
        $db = self::getExp0032Db();
        $stmt = $db->prepare("
            SELECT id, material_id, course_id, batch_id, chunk_index, source_document, title, content, embedding, metadata 
            FROM material_chunks_exp0032 
            WHERE embedding_model = :model
        ");
        $stmt->execute([':model' => $modelName]);
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($candidates)) {
            return [
                'mode' => $modeLabel,
                'query' => $rawQuery,
                'count' => 0,
                'results' => []
            ];
        }

        // 3. Dense Scoring (Cosine / Dot product on unit vectors)
        $denseScored = [];
        $candidatesWithVectors = [];
        foreach ($candidates as $idx => $row) {
            $chunkVec = array_values(unpack('f*', $row['embedding']));
            $score = RagService::cosineSimilarity($queryEmbedding, $chunkVec);
            $row['similarity'] = round($score, 4);
            unset($row['embedding']);
            $row['embedding_vec'] = $chunkVec;
            $candidatesWithVectors[$idx] = $row;
            $denseScored[$idx] = $score;
        }
        arsort($denseScored);
        $denseRankedIndices = array_keys($denseScored);

        // 4. Lexical BM25 Scoring (reusing identical Okapi BM25 implementation)
        $qTokens = RagService::tokenize($cleanQuery);
        $bm25Scores = RagService::scoreBM25($qTokens, $candidates);

        // 5. Adaptive Intent Weighting (identical to baseline R0)
        $hasCodeSyntax = preg_match('/[<>{}\(\)\[\]\*:=;`]/', $cleanQuery) || in_array('3nf', $qTokens) || in_array('tdz', $qTokens);
        $wDense = $hasCodeSyntax ? 0.50 : 0.65;
        $wBm25 = $hasCodeSyntax ? 0.50 : 0.35;

        // 6. Reciprocal Rank Fusion (k = 60, identical to baseline R0)
        $fused = RagService::reciprocalRankFusion($candidatesWithVectors, $denseRankedIndices, $bm25Scores, $wDense, $wBm25);

        // 7. Filter by similarity threshold
        $filtered = array_values(array_filter($fused, fn($c) => ($c['similarity'] ?? 0.0) >= $threshold));

        // 8. Slice to limit and format to common schema
        $topChunks = array_slice($filtered, 0, $limit);
        $formatted = [];
        foreach ($topChunks as $idx => $item) {
            $formatted[] = [
                'id' => (string)($item['id'] ?? ''),
                'title' => (string)($item['title'] ?? ''),
                'content' => (string)($item['content'] ?? ''),
                'similarity' => (float)($item['similarity'] ?? 0.0),
                'rank' => $idx + 1,
                'retrieval_method' => 'hybrid',
                'metadata' => is_string($item['metadata'] ?? '') ? (json_decode($item['metadata'], true) ?: []) : ($item['metadata'] ?? [])
            ];
        }

        return [
            'mode' => $modeLabel,
            'query' => $rawQuery,
            'embedding_model' => $modelName,
            'reranker_model' => 'none',
            'count' => count($formatted),
            'results' => $formatted
        ];
    }
}
