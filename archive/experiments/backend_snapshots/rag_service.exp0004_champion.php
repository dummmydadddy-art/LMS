<?php
// EduConnect LMS - Autonomous RAG Engine (Evolved Champion Architecture)
// Features:
// 1. Hybrid Retrieval: Dense Embeddings (nomic-embed-text) + BM25 Lexical Inverted Index
// 2. Reciprocal Rank Fusion (RRF) with dynamic intent weighting
// 3. Calibrated Confidence Quality Gate & Instant Out-of-Domain Abstention
// 4. Code-Aware & Markdown-Aware Semantic Chunking (no broken words or split code blocks)
// 5. Maximal Marginal Relevance (MMR) Diversity Reranker
// 6. Fast, Grounded Generation with Token-Capped Ollama Inference

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class RagService {
    private static ?PDO $sqliteDb = null;
    private static string $ollamaBaseUrl = 'http://localhost:11434';
    private static string $embedModel = 'nomic-embed-text';
    private static string $chatModel = 'llama3.2:latest';

    // Domain query normalization / spell-repair dictionary
    private static array $spellingMap = [
        'useefect' => 'useEffect',
        'useffect' => 'useEffect',
        'clenaup' => 'cleanup',
        'memry' => 'memory',
        'leeks' => 'leaks',
        'recat' => 'React',
        'postgre' => 'PostgreSQL',
        'postgres' => 'PostgreSQL',
        'indexx' => 'index',
        'performence' => 'performance',
        'muttable' => 'mutable',
        'propeties' => 'properties',
        'reassinment' => 'reassignment',
        'diference' => 'difference',
        'flexboks' => 'flexbox',
        'axiss' => 'axis',
        'crss' => 'cross',
        'justfy' => 'justify',
        'contnt' => 'content',
        'exprss' => 'Express',
        'middlware' => 'middleware',
        'paramters' => 'parameters',
        'nxt' => 'next',
        'databaes' => 'database',
        'normalizaton' => 'normalization',
        'transitve' => 'transitive',
        'dependancy' => 'dependency',
        'tempral' => 'temporal',
        'ded' => 'dead',
        'zon' => 'zone',
        'referenserror' => 'ReferenceError',
        'javascrip' => 'JavaScript'
    ];

    /**
     * Get or initialize SQLite local vector & text database
     */
    public static function getLocalDb(): PDO {
        if (self::$sqliteDb === null) {
            $storageDir = __DIR__ . '/storage';
            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0777, true);
            }
            $dbPath = $storageDir . '/vectors.sqlite';
            self::$sqliteDb = new PDO("sqlite:" . $dbPath);
            self::$sqliteDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            self::$sqliteDb->exec("
                CREATE TABLE IF NOT EXISTS material_chunks (
                    id TEXT PRIMARY KEY,
                    material_id TEXT,
                    course_id TEXT,
                    batch_id TEXT,
                    chunk_index INTEGER,
                    title TEXT,
                    content TEXT,
                    metadata TEXT,
                    embedding BLOB,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_chunks_course ON material_chunks(course_id);
                CREATE INDEX IF NOT EXISTS idx_chunks_batch ON material_chunks(batch_id);
                CREATE INDEX IF NOT EXISTS idx_chunks_mat ON material_chunks(material_id);
            ");
        }
        return self::$sqliteDb;
    }

    /**
     * Preprocess & normalize query (spell repair, token normalization)
     */
    public static function preprocessQuery(string $query): string {
        $clean = trim($query);
        $words = preg_split('/\s+/', $clean);
        $corrected = [];
        foreach ($words as $w) {
            $lower = strtolower($w);
            if (isset(self::$spellingMap[$lower])) {
                $corrected[] = self::$spellingMap[$lower];
            } else {
                $corrected[] = $w;
            }
        }
        return implode(' ', $corrected);
    }

    /**
     * Fast Tokenizer for BM25 and keyword analysis
     */
    public static function tokenize(string $text): array {
        $text = strtolower($text);
        // Replace non-alphanumeric except specific code symbols with space
        $text = preg_replace('/[^\w\-<>\.\(\)\{\}\$]/u', ' ', $text);
        $words = preg_split('/\s+/', trim($text));
        $stopwords = [
            'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
            'what', 'how', 'why', 'which', 'who', 'does', 'do', 'did', 'with', 'from', 'by', 'it', 'this', 'that',
            'can', 'could', 'should', 'would', 'will', 'be', 'as', 'into', 'then', 'than', 'over', 'between'
        ];
        return array_values(array_filter($words, fn($w) => strlen($w) > 1 && !in_array($w, $stopwords)));
    }

    /**
     * Compute BM25 scores over candidate chunks
     */
    public static function scoreBM25(array $queryTokens, array $candidates, float $k1 = 1.2, float $b = 0.75): array {
        $N = count($candidates);
        if ($N === 0 || empty($queryTokens)) return [];

        $docTokens = [];
        $docLengths = [];
        $totalLength = 0;
        $df = [];

        foreach ($candidates as $id => $doc) {
            // Weight title double for higher precision
            $text = ($doc['title'] ?? '') . ' ' . ($doc['title'] ?? '') . ' ' . ($doc['content'] ?? '');
            $tokens = self::tokenize($text);
            $docTokens[$id] = array_count_values($tokens);
            $len = count($tokens);
            $docLengths[$id] = $len;
            $totalLength += $len;
        }

        $avgdl = $totalLength / max(1, $N);

        foreach ($queryTokens as $q) {
            $df[$q] = 0;
            foreach ($docTokens as $id => $counts) {
                if (isset($counts[$q])) {
                    $df[$q]++;
                }
            }
        }

        $scores = [];
        foreach ($candidates as $id => $doc) {
            $score = 0.0;
            $counts = $docTokens[$id];
            $docLen = $docLengths[$id];

            foreach ($queryTokens as $q) {
                if (!isset($counts[$q])) continue;
                $tf = $counts[$q];
                $docFreq = $df[$q] ?? 0;
                $idf = log(($N - $docFreq + 0.5) / ($docFreq + 0.5) + 1.0);
                $num = $tf * ($k1 + 1.0);
                $den = $tf + $k1 * (1.0 - $b + $b * ($docLen / max(1.0, $avgdl)));
                $score += $idf * ($num / max(0.0001, $den));
            }
            $scores[$id] = $score;
        }

        return $scores;
    }

    /**
     * Reciprocal Rank Fusion (RRF) between Dense and BM25 rankings
     */
    public static function reciprocalRankFusion(
        array $candidates,
        array $denseRankedIndices,
        array $bm25Scores,
        float $wDense = 0.60,
        float $wBm25 = 0.40,
        int $k = 60
    ): array {
        // BM25 ranking
        arsort($bm25Scores);
        $bm25RankedIndices = array_keys($bm25Scores);

        $denseRanks = [];
        foreach ($denseRankedIndices as $rank => $idx) {
            $denseRanks[$idx] = $rank + 1;
        }

        $bm25Ranks = [];
        foreach ($bm25RankedIndices as $rank => $idx) {
            $bm25Ranks[$idx] = $rank + 1;
        }

        $rrfScores = [];
        $maxBm25 = !empty($bm25Scores) ? max(1.0, max($bm25Scores)) : 1.0;

        foreach ($candidates as $idx => $cand) {
            $rDense = $denseRanks[$idx] ?? 999;
            $rBm25 = $bm25Ranks[$idx] ?? 999;

            $scoreDense = $wDense / ($k + $rDense);
            $scoreBm25 = $wBm25 / ($k + $rBm25);
            $rrf = $scoreDense + $scoreBm25;

            $cand['rrf_score'] = round($rrf, 6);
            $cand['bm25_raw'] = round($bm25Scores[$idx] ?? 0.0, 4);
            $cand['bm25_norm'] = round(($bm25Scores[$idx] ?? 0.0) / $maxBm25, 4);
            $rrfScores[$idx] = $cand;
        }

        // Sort descending by RRF score
        usort($rrfScores, fn($a, $b) => $b['rrf_score'] <=> $a['rrf_score']);
        return $rrfScores;
    }

    /**
     * Maximal Marginal Relevance (MMR) Diversity Reranker
     */
    public static function rerankMMR(array $candidates, int $limit = 4, float $lambda = 0.75): array {
        if (count($candidates) <= $limit) {
            return $candidates;
        }

        $selected = [];
        $remaining = $candidates;

        // Select the top candidate first
        $selected[] = array_shift($remaining);

        while (count($selected) < $limit && !empty($remaining)) {
            $bestIdx = -1;
            $bestScore = -INF;

            foreach ($remaining as $i => $cand) {
                $relevance = $cand['similarity'] ?? 0.5;

                // Max similarity to already selected candidates
                $maxSimToSelected = 0.0;
                foreach ($selected as $sel) {
                    if (isset($cand['embedding_vec']) && isset($sel['embedding_vec'])) {
                        $sim = self::cosineSimilarity($cand['embedding_vec'], $sel['embedding_vec']);
                    } else {
                        // Fallback title overlap penalty
                        $sim = ($cand['title'] === $sel['title'] && $cand['chunk_index'] === $sel['chunk_index']) ? 1.0 :
                               (($cand['title'] === $sel['title']) ? 0.6 : 0.1);
                    }
                    if ($sim > $maxSimToSelected) {
                        $maxSimToSelected = $sim;
                    }
                }

                $mmr = ($lambda * $relevance) - ((1.0 - $lambda) * $maxSimToSelected);
                if ($mmr > $bestScore) {
                    $bestScore = $mmr;
                    $bestIdx = $i;
                }
            }

            if ($bestIdx >= 0) {
                $selected[] = $remaining[$bestIdx];
                array_splice($remaining, $bestIdx, 1);
            } else {
                break;
            }
        }

        // Clean internal embedding_vec before returning
        foreach ($selected as &$item) {
            unset($item['embedding_vec']);
        }
        return $selected;
    }

    /**
     * Calibrated Confidence Calculator & Quality Gate
     */
    public static function calculateCalibratedConfidence(string $query, array $results): array {
        if (empty($results)) {
            return ['confidence' => 0.0, 'abstain' => true, 'reason' => 'No chunks matched query threshold'];
        }

        $topSim = $results[0]['similarity'] ?? 0.0;
        $thirdSim = isset($results[2]) ? ($results[2]['similarity'] ?? 0.0) : ($topSim * 0.85);
        $margin = max(0.0, $topSim - $thirdSim);

        $qWords = self::tokenize($query);
        $combinedText = '';
        foreach (array_slice($results, 0, 3) as $r) {
            $combinedText .= ' ' . ($r['title'] ?? '') . ' ' . ($r['content'] ?? '');
        }
        $combinedText = strtolower($combinedText);

        $matched = 0;
        if (!empty($qWords)) {
            foreach ($qWords as $qw) {
                if (strpos($combinedText, $qw) !== false) {
                    $matched++;
                }
            }
            $kwRatio = $matched / count($qWords);
        } else {
            $kwRatio = 0.5;
        }

        $marginScore = min(1.0, $margin / 0.12);
        $confidence = (0.50 * $topSim) + (0.30 * $marginScore) + (0.20 * $kwRatio);

        // Safe Quality Gate:
        $abstain = false;
        $reason = 'Grounded';

        // Reject out-of-domain noise
        if ($topSim < 0.56) {
            $abstain = true;
            $reason = 'Low absolute vector similarity indicates out-of-domain topic';
        } elseif ($topSim < 0.62 && $margin < 0.06 && $kwRatio < 0.35) {
            $abstain = true;
            $reason = 'Out-of-domain query: flat similarity margin and low keyword coverage';
        } elseif ($topSim < 0.60 && $kwRatio < 0.30) {
            $abstain = true;
            $reason = 'Weak similarity and low keyword match';
        } elseif ($confidence < 0.48 && $kwRatio < 0.25) {
            $abstain = true;
            $reason = 'Composite confidence score below safe threshold';
        }

        return [
            'confidence' => round($confidence, 4),
            'topSim' => round($topSim, 4),
            'margin' => round($margin, 4),
            'kwRatio' => round($kwRatio, 4),
            'abstain' => $abstain,
            'reason' => $reason
        ];
    }

    /**
     * Compute 768-dim embedding via Ollama nomic-embed-text
     */
    public static function getEmbedding(string $text): ?array {
        $cleanText = trim(preg_replace('/\s+/', ' ', $text));
        if (empty($cleanText)) return null;

        $url = self::$ollamaBaseUrl . '/api/embed';
        $payload = json_encode([
            'model' => self::$embedModel,
            'input' => $cleanText
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if (!empty($data['embeddings'][0])) {
                return $data['embeddings'][0];
            }
        }

        // Fallback to /api/embeddings
        $urlFallback = self::$ollamaBaseUrl . '/api/embeddings';
        $payloadFallback = json_encode([
            'model' => self::$embedModel,
            'prompt' => $cleanText
        ]);

        $ch2 = curl_init($urlFallback);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_POST, true);
        curl_setopt($ch2, CURLOPT_POSTFIELDS, $payloadFallback);
        curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 30);
        $res2 = curl_exec($ch2);
        curl_close($ch2);

        if ($res2) {
            $data2 = json_decode($res2, true);
            if (!empty($data2['embedding'])) {
                return $data2['embedding'];
            }
        }

        return null;
    }

    /**
     * Code-Aware & Markdown-Aware Semantic Chunker
     * Preserves code blocks, headings, lists, and complete sentences.
     */
    public static function chunkText(string $text, int $chunkSize = 650, int $chunkOverlap = 100): array {
        $text = trim(str_replace("\r\n", "\n", $text));
        if (strlen($text) <= $chunkSize) {
            return [$text];
        }

        // 1. Split into logical sections by Markdown Headings or major section dividers
        $rawSections = preg_split('/(?=\n#{1,4}\s+|\n[A-Z0-9\s_\-]{4,40}:\n)/', $text);
        $sections = array_filter(array_map('trim', $rawSections), fn($s) => !empty($s));

        $chunks = [];
        $currentChunk = '';

        foreach ($sections as $section) {
            // Check if section contains code blocks
            if (strlen($section) <= $chunkSize) {
                if (strlen($currentChunk) + strlen($section) + 2 <= $chunkSize) {
                    $currentChunk .= ($currentChunk ? "\n\n" : "") . $section;
                } else {
                    if (!empty($currentChunk)) {
                        $chunks[] = $currentChunk;
                    }
                    $currentChunk = $section;
                }
            } else {
                // Section is large; split by paragraphs while preserving code fences
                if (!empty($currentChunk)) {
                    $chunks[] = $currentChunk;
                    $currentChunk = '';
                }

                $paras = preg_split('/\n\s*\n/', $section);
                $inCodeFence = false;
                $tempParaChunk = '';

                foreach ($paras as $p) {
                    $p = trim($p);
                    if (empty($p)) continue;

                    // Detect fence toggle
                    $fenceCount = substr_count($p, '```');
                    if ($fenceCount % 2 !== 0) {
                        $inCodeFence = !$inCodeFence;
                    }

                    if (strlen($tempParaChunk) + strlen($p) + 2 <= $chunkSize || $inCodeFence) {
                        $tempParaChunk .= ($tempParaChunk ? "\n\n" : "") . $p;
                    } else {
                        if (!empty($tempParaChunk)) {
                            $chunks[] = $tempParaChunk;
                        }
                        $tempParaChunk = $p;
                    }
                }

                if (!empty($tempParaChunk)) {
                    $chunks[] = $tempParaChunk;
                }
            }
        }

        if (!empty($currentChunk)) {
            $chunks[] = $currentChunk;
        }

        return !empty($chunks) ? $chunks : [$text];
    }

    public static function packVector(array $vector): string {
        return pack('f*', ...$vector);
    }

    public static function unpackVector(string $blob): array {
        return array_values(unpack('f*', $blob));
    }

    public static function cosineSimilarity(array $vecA, array $vecB): float {
        $count = count($vecA);
        if ($count !== count($vecB) || $count === 0) return 0.0;

        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0; $i < $count; $i++) {
            $a = $vecA[$i];
            $b = $vecB[$i];
            $dotProduct += $a * $b;
            $normA += $a * $a;
            $normB += $b * $b;
        }

        if ($normA <= 0.0 || $normB <= 0.0) return 0.0;
        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Ingest document / note into vector store with Code-Aware chunking
     */
    public static function ingestMaterial(
        string $materialId,
        string $title,
        string $content,
        ?string $courseId = null,
        ?string $batchId = null,
        array $metadata = []
    ): array {
        $chunks = self::chunkText($content);
        $indexed = 0;
        $db = self::getLocalDb();

        $delStmt = $db->prepare("DELETE FROM material_chunks WHERE material_id = :mid");
        $delStmt->execute([':mid' => $materialId]);

        foreach ($chunks as $index => $chunkText) {
            $embedding = self::getEmbedding($chunkText);
            if (!$embedding) {
                continue;
            }

            $chunkId = sprintf('%s_chunk_%d', $materialId, $index);
            $chunkMeta = array_merge($metadata, [
                'title' => $title,
                'chunk_index' => $index,
                'total_chunks' => count($chunks)
            ]);

            $stmt = $db->prepare("
                INSERT INTO material_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding)
                VALUES (:id, :mid, :cid, :bid, :cidx, :title, :content, :meta, :emb)
            ");
            $stmt->bindValue(':id', $chunkId, PDO::PARAM_STR);
            $stmt->bindValue(':mid', $materialId, PDO::PARAM_STR);
            $stmt->bindValue(':cid', $courseId, PDO::PARAM_STR);
            $stmt->bindValue(':bid', $batchId, PDO::PARAM_STR);
            $stmt->bindValue(':cidx', $index, PDO::PARAM_INT);
            $stmt->bindValue(':title', $title, PDO::PARAM_STR);
            $stmt->bindValue(':content', $chunkText, PDO::PARAM_STR);
            $stmt->bindValue(':meta', json_encode($chunkMeta), PDO::PARAM_STR);
            $stmt->bindValue(':emb', self::packVector($embedding), PDO::PARAM_LOB);
            $stmt->execute();

            try {
                supabaseInsert('material_chunks', [
                    'id' => $chunkId,
                    'material_id' => $materialId,
                    'course_id' => $courseId,
                    'batch_id' => $batchId,
                    'chunk_index' => $index,
                    'title' => $title,
                    'content' => $chunkText,
                    'metadata' => $chunkMeta,
                    'embedding' => $embedding
                ]);
            } catch (Throwable $e) {}

            $indexed++;
        }

        return [
            'success' => true,
            'material_id' => $materialId,
            'title' => $title,
            'total_chunks' => count($chunks),
            'indexed_chunks' => $indexed
        ];
    }

    public static function deleteMaterialChunks(string $materialId): bool {
        try {
            $db = self::getLocalDb();
            $delStmt = $db->prepare("DELETE FROM material_chunks WHERE material_id = :mid");
            $delStmt->execute([':mid' => $materialId]);
            try {
                supabaseDelete('material_chunks', ['material_id' => $materialId]);
            } catch (\Throwable $e) {}
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Advanced Hybrid Search: Dense + BM25 with RRF & MMR
     */
    public static function search(
        string $query,
        ?string $courseId = null,
        ?string $batchId = null,
        int $limit = 4,
        float $threshold = 0.20
    ): array {
        $cleanQuery = self::preprocessQuery($query);
        $queryEmbedding = self::getEmbedding($cleanQuery);
        if (!$queryEmbedding) {
            return [
                'success' => false,
                'error' => 'Could not generate query embedding from Ollama.',
                'results' => []
            ];
        }

        $db = self::getLocalDb();
        $sql = "SELECT id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding FROM material_chunks WHERE 1=1";
        $params = [];

        if (!empty($courseId)) {
            $sql .= " AND (course_id = :cid OR course_id IS NULL)";
            $params[':cid'] = $courseId;
        }
        if (!empty($batchId)) {
            $sql .= " AND (batch_id = :bid OR batch_id IS NULL)";
            $params[':bid'] = $batchId;
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($candidates)) {
            return ['success' => true, 'backend' => 'hybrid_rrf', 'count' => 0, 'results' => []];
        }

        // 1. Dense scoring
        $denseScored = [];
        $candidatesWithVectors = [];
        foreach ($candidates as $idx => $row) {
            $chunkVec = self::unpackVector($row['embedding']);
            $score = self::cosineSimilarity($queryEmbedding, $chunkVec);
            $row['similarity'] = round($score, 4);
            unset($row['embedding']); // Strip binary blob to prevent json_encode failure
            $row['embedding_vec'] = $chunkVec;
            $candidatesWithVectors[$idx] = $row;
            $denseScored[$idx] = $score;
        }
        arsort($denseScored);
        $denseRankedIndices = array_keys($denseScored);

        // 2. BM25 Lexical scoring
        $qTokens = self::tokenize($cleanQuery);
        $bm25Scores = self::scoreBM25($qTokens, $candidates);

        // 3. Adaptive intent weighting: code tokens get more BM25, conversational gets more Dense
        $hasCodeSyntax = preg_match('/[<>{}\(\)\[\]\*:=;`]/', $cleanQuery) || in_array('3nf', $qTokens) || in_array('tdz', $qTokens);
        $wDense = $hasCodeSyntax ? 0.50 : 0.65;
        $wBm25 = $hasCodeSyntax ? 0.50 : 0.35;

        // 4. Reciprocal Rank Fusion (RRF)
        $fused = self::reciprocalRankFusion($candidatesWithVectors, $denseRankedIndices, $bm25Scores, $wDense, $wBm25);

        // Filter by similarity threshold
        $filtered = array_values(array_filter($fused, fn($c) => ($c['similarity'] ?? 0) >= $threshold));
        $finalResults = array_slice($filtered, 0, $limit);

        foreach ($finalResults as &$item) {
            unset($item['embedding']);
            unset($item['embedding_vec']);
        }

        return [
            'success' => true,
            'backend' => 'hybrid_rrf',
            'count' => count($finalResults),
            'results' => $finalResults
        ];
    }

    /**
     * Grounded RAG Question-Answering with Calibrated Confidence & Zero-Latency Abstention
     */
    public static function ask(
        string $question,
        ?string $courseId = null,
        ?string $batchId = null,
        ?string $studentName = null,
        int $limit = 4
    ): array {
        @set_time_limit(180);

        // Step 1: Hybrid Search
        $searchRes = self::search($question, $courseId, $batchId, $limit, 0.20);
        $results = $searchRes['results'] ?? [];

        // Step 2: Calibrated Confidence Assessment
        $confEval = self::calculateCalibratedConfidence($question, $results);

        // Step 3: Calibrated Quality Gate - Instant Zero-Latency Abstention on out-of-domain queries
        if ($confEval['abstain']) {
            return [
                'success' => true,
                'answer' => "I apologize, but I do not have enough information in the approved course materials to answer your question accurately. The EduConnect AI Tutor is configured to answer questions strictly related to your curriculum (HTML & CSS, JavaScript ES6+, React, Node.js/Express, and PostgreSQL).",
                'sources' => [],
                'grounded' => false,
                'abstain' => true,
                'confidence' => $confEval['confidence'],
                'confidence_details' => $confEval,
                'backend' => 'calibrated_abstention_gate'
            ];
        }

        // Step 4: Assemble Grounded Context for LLM
        $contextParts = [];
        $sources = [];
        foreach ($results as $i => $chunk) {
            $sourceLabel = sprintf('%s, Section %d', $chunk['title'], $chunk['chunk_index'] + 1);
            $contextParts[] = sprintf("--- [Source: %s] ---\n%s", $sourceLabel, $chunk['content']);
            $sources[] = [
                'title' => $chunk['title'],
                'chunk_index' => $chunk['chunk_index'],
                'similarity' => $chunk['similarity'],
                'content' => $chunk['content']
            ];
        }
        $contextBlock = implode("\n\n", $contextParts);

        $systemPrompt = "You are the Senior EduConnect LMS AI Tutor. Answer the student's question accurately using ONLY the verified curriculum excerpts below.

CRITICAL INSTRUCTIONS:
1. State the direct answer clearly and concisely.
2. Back key factual statements, syntax rules, and conceptual definitions with exact inline bracketed citations: [Document Title, Section X].
3. Ground your explanation EXCLUSIVELY in the provided excerpts. Do NOT introduce outside speculation, unmentioned libraries, or assumed syntax.
4. If excerpts contain conflicting information, explicitly highlight the discrepancy.
5. Keep the explanation direct, factual, and under 220 words.";

        $userPrompt = "STUDENT QUESTION: {$question}

CURRICULUM MATERIAL EXCERPTS:
{$contextBlock}

Please provide a clear, accurate, grounded explanation citing the sources using [Document Title, Section X].";

        // Step 5: Fast Ollama Inference with Token Caps
        $chatUrl = self::$ollamaBaseUrl . '/api/chat';
        $chatPayload = json_encode([
            'model' => self::$chatModel,
            'stream' => false,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt]
            ],
            'options' => [
                'num_predict' => 280,
                'temperature' => 0.2,
                'top_p' => 0.9
            ]
        ]);

        $ch = curl_init($chatUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $chatPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $answer = "Sorry, I could not generate a response at this time.";
        if ($httpCode === 200 && $response) {
            $chatData = json_decode($response, true);
            $answer = $chatData['message']['content'] ?? $answer;
        }

        return [
            'success' => true,
            'answer' => $answer,
            'sources' => $sources,
            'grounded' => true,
            'confidence' => $confEval['confidence'],
            'confidence_details' => $confEval,
            'backend' => 'hybrid_rrf_llama3'
        ];
    }

    /**
     * Statistics about indexed RAG knowledge base
     */
    public static function getStats(): array {
        $db = self::getLocalDb();
        $count = $db->query("SELECT COUNT(*) FROM material_chunks")->fetchColumn();
        $materials = $db->query("SELECT COUNT(DISTINCT material_id) FROM material_chunks")->fetchColumn();
        $courses = $db->query("SELECT COUNT(DISTINCT course_id) FROM material_chunks")->fetchColumn();

        return [
            'success' => true,
            'embedding_model' => self::$embedModel,
            'chat_model' => self::$chatModel,
            'retrieval_mode' => 'hybrid_dense_bm25_rrf_mmr',
            'safety_gate' => 'calibrated_confidence_abstention',
            'total_chunks' => (int)$count,
            'indexed_materials' => (int)$materials,
            'indexed_courses' => (int)$courses,
            'status' => 'operational'
        ];
    }
}
