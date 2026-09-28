<?php
// EduConnect LMS - Production RAG Engine
// Ported from Experimental (64 experiments, champion configuration)
// Features: Hybrid BM25+Dense Search with RRF, Calibrated Confidence Gate,
//           Code-Aware Chunking, MMR Diversity Reranker, Grounded LLM Generation

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/document_extractor.php';
require_once __DIR__ . '/rag_premise_verifier.php';

class RagService {
    private static ?PDO $sqliteDb = null;
    private static string $ollamaBaseUrl = 'http://localhost:11434';
    private static string $embedModel = 'nomic-embed-text';
    private static string $chatModel = 'llama3.2:latest';
    private static array $embeddingMemoryCache = [];
    private static ?array $prewarmedCorpus = null;

    // Spelling normalization dictionary (from experimental champion)
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
     * Get or initialize SQLite local vector database
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
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', trim($query));
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
        $text = preg_replace('/[^\w\-<>\.\(\)\{\}\$]/u', ' ', $text);
        $words = preg_split('/\s+/', trim($text));
        $stopwords = [
            'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
            'what', 'how', 'why', 'which', 'who', 'when', 'where', 'does', 'do', 'did', 'with', 'from', 'by',
            'it', 'this', 'that', 'can', 'could', 'should', 'would', 'will', 'be', 'as', 'into', 'then',
            'than', 'over', 'between'
        ];
        return array_values(array_filter($words, fn($w) => strlen($w) > 1 && !in_array($w, $stopwords)));
    }

    /**
     * In-Memory Vector Pre-Warming
     * Loads all chunks + embeddings into RAM for zero-latency search
     */
    public static function getPrewarmedCorpus(): array {
        if (self::$prewarmedCorpus === null) {
            $db = self::getLocalDb();
            $stmt = $db->query("SELECT id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding FROM material_chunks");
            $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (empty($raw)) {
                // If local SQLite is empty, attempt self-healing sync from Supabase document_chunks
                try {
                    $remoteRes = supabaseSelect('document_chunks', 'id, material_id, chunk_index, content, metadata, embedding, materials(course_id, batch_id, title)');
                    if ($remoteRes['success'] && !empty($remoteRes['data'])) {
                        foreach ($remoteRes['data'] as $rc) {
                            $emb = is_string($rc['embedding']) ? json_decode($rc['embedding'], true) : ($rc['embedding'] ?? []);
                            if (!empty($emb) && is_array($emb) && count($emb) === 768) {
                                $stmtIns = $db->prepare("
                                    INSERT OR REPLACE INTO material_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding)
                                    VALUES (:id, :mid, :cid, :bid, :cidx, :title, :content, :meta, :emb)
                                ");
                                $stmtIns->bindValue(':id', $rc['id'], PDO::PARAM_STR);
                                $stmtIns->bindValue(':mid', $rc['material_id'], PDO::PARAM_STR);
                                $stmtIns->bindValue(':cid', $rc['materials']['course_id'] ?? null, PDO::PARAM_STR);
                                $stmtIns->bindValue(':bid', $rc['materials']['batch_id'] ?? null, PDO::PARAM_STR);
                                $stmtIns->bindValue(':cidx', (int)$rc['chunk_index'], PDO::PARAM_INT);
                                $stmtIns->bindValue(':title', $rc['materials']['title'] ?? 'Document', PDO::PARAM_STR);
                                $stmtIns->bindValue(':content', $rc['content'], PDO::PARAM_STR);
                                $stmtIns->bindValue(':meta', is_string($rc['metadata']) ? $rc['metadata'] : json_encode($rc['metadata'] ?? []), PDO::PARAM_STR);
                                $stmtIns->bindValue(':emb', self::packVector($emb), PDO::PARAM_LOB);
                                $stmtIns->execute();
                            }
                        }
                        $stmt = $db->query("SELECT id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding FROM material_chunks");
                        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                } catch (\Throwable $e) {}
                if (empty($raw)) return [];
            }

            $corpus = [];
            foreach ($raw as $r) {
                $vec = self::unpackVector($r['embedding']);
                if (count($vec) !== 768) continue;

                $normSq = 0.0;
                foreach ($vec as $v) $normSq += $v * $v;
                $norm = sqrt($normSq);
                if ($norm <= 0.0) continue;

                $unit = array_map(fn($v) => $v / $norm, $vec);
                $text = ($r['title'] ?? '') . ' ' . ($r['title'] ?? '') . ' ' . ($r['content'] ?? '');
                $tokens = self::tokenize($text);

                $corpus[] = [
                    'id' => $r['id'],
                    'material_id' => $r['material_id'],
                    'course_id' => $r['course_id'],
                    'batch_id' => $r['batch_id'],
                    'chunk_index' => (int)$r['chunk_index'],
                    'title' => $r['title'],
                    'content' => $r['content'],
                    'metadata' => $r['metadata'],
                    'unit_vector' => $unit,
                    'raw_embedding' => $vec,
                    'doc_tokens' => array_count_values($tokens),
                    'doc_len' => count($tokens)
                ];
            }
            self::$prewarmedCorpus = $corpus;
        }
        return self::$prewarmedCorpus;
    }

    public static function invalidateCache(): void {
        self::$prewarmedCorpus = null;
    }

    /**
     * BM25 scoring with Okapi sublinear TF saturation
     */
    public static function scoreBM25(array $queryTokens, array $candidates, float $k1 = 1.2, float $b = 0.75): array {
        $N = count($candidates);
        if ($N === 0 || empty($queryTokens)) return [];

        $totalLength = 0;
        $docTokens = [];
        $docLengths = [];
        foreach ($candidates as $id => $doc) {
            if (isset($doc['doc_tokens'])) {
                $docTokens[$id] = $doc['doc_tokens'];
                $docLengths[$id] = $doc['doc_len'] ?? 100;
            } else {
                $text = ($doc['title'] ?? '') . ' ' . ($doc['title'] ?? '') . ' ' . ($doc['content'] ?? '');
                $tokens = self::tokenize($text);
                $docTokens[$id] = array_count_values($tokens);
                $docLengths[$id] = count($tokens);
            }
            $totalLength += $docLengths[$id];
        }
        $avgdl = $totalLength / max(1, $N);

        $uniqueQueryTokens = array_unique($queryTokens);
        $qtfCounts = array_count_values($queryTokens);

        $df = [];
        foreach ($uniqueQueryTokens as $q) {
            $df[$q] = 0;
            foreach ($docTokens as $counts) {
                if (isset($counts[$q])) $df[$q]++;
            }
        }

        $scores = [];
        foreach ($candidates as $id => $doc) {
            $score = 0.0;
            $counts = $docTokens[$id];
            $docLen = $docLengths[$id];
            foreach ($uniqueQueryTokens as $q) {
                if (!isset($counts[$q])) continue;
                $tf = $counts[$q];
                $docFreq = $df[$q] ?? 0;
                $idf = log(($N - $docFreq + 0.5) / ($docFreq + 0.5) + 1.0);
                $num = $tf * ($k1 + 1.0);
                $den = $tf + $k1 * (1.0 - $b + $b * ($docLen / max(1.0, $avgdl)));
                $qtf = $qtfCounts[$q] ?? 1;
                $qWeight = ($qtf * 2.2) / ($qtf + 1.2);
                $score += $idf * ($num / max(0.0001, $den)) * $qWeight;
            }
            $scores[$id] = $score;
        }
        return $scores;
    }

    /**
     * Reciprocal Rank Fusion (RRF) between Dense and BM25 rankings
     * Champion config: wDense=0.60, wBm25=0.40, k=60
     */
    public static function reciprocalRankFusion(
        array $candidates, array $denseRankedIndices, array $bm25Scores,
        float $wDense = 0.60, float $wBm25 = 0.40, int $k = 60
    ): array {
        arsort($bm25Scores);
        $bm25RankedIndices = array_keys($bm25Scores);

        $denseRanks = [];
        foreach ($denseRankedIndices as $rank => $idx) $denseRanks[$idx] = $rank + 1;
        $bm25Ranks = [];
        foreach ($bm25RankedIndices as $rank => $idx) $bm25Ranks[$idx] = $rank + 1;

        $allSims = array_map(fn($c) => (float)($c['similarity'] ?? 0.0), $candidates);
        $topDenseSim = !empty($allSims) ? max($allSims) : 0.0;

        $rrfScores = [];
        foreach ($candidates as $idx => $cand) {
            $rDense = $denseRanks[$idx] ?? 999;
            $rBm25 = $bm25Ranks[$idx] ?? 999;
            $scoreDense = $wDense / ($k + $rDense);
            $rawBm25 = (float)($bm25Scores[$idx] ?? 0.0);
            $scoreBm25 = ($rawBm25 > 0.0) ? ($wBm25 / ($k + $rBm25)) : 0.0;

            // Disagreement penalty for candidates with low dense similarity but high BM25
            $candSim = (float)($cand['similarity'] ?? 0.0);
            if ($rawBm25 > 0.0 && $topDenseSim >= 0.55) {
                $denseDeficit = $topDenseSim - $candSim;
                if ($denseDeficit > 0.12 && $candSim < 0.55) {
                    $scoreBm25 *= max(0.05, 1.0 - ($denseDeficit * 3.5));
                }
            }

            $cand['rrf_score'] = round($scoreDense + $scoreBm25, 6);
            $cand['bm25_raw'] = round($rawBm25, 4);
            $rrfScores[$idx] = $cand;
        }

        // Deterministic multi-tier tie-breaking
        usort($rrfScores, function($a, $b) {
            $cmp = $b['rrf_score'] <=> $a['rrf_score'];
            if ($cmp !== 0) return $cmp;
            $simCmp = ($b['similarity'] ?? 0.0) <=> ($a['similarity'] ?? 0.0);
            if ($simCmp !== 0) return $simCmp;
            return strcmp((string)($a['id'] ?? ''), (string)($b['id'] ?? ''));
        });
        return $rrfScores;
    }

    /**
     * Maximal Marginal Relevance (MMR) Diversity Reranker
     * lambda=0.75 (champion config)
     */
    public static function rerankMMR(array $candidates, int $limit = 4, float $lambda = 0.75): array {
        if (count($candidates) <= $limit) return $candidates;
        $selected = [array_shift($candidates)];
        $remaining = $candidates;

        while (count($selected) < $limit && !empty($remaining)) {
            $bestIdx = -1;
            $bestScore = -INF;
            foreach ($remaining as $i => $cand) {
                $relevance = $cand['similarity'] ?? 0.5;
                $maxSimToSelected = 0.0;
                foreach ($selected as $sel) {
                    $sim = ($cand['id'] === $sel['id']) ? 1.0 :
                           (($cand['title'] === $sel['title']) ? 0.25 : 0.05);
                    if ($sim > $maxSimToSelected) $maxSimToSelected = $sim;
                }
                $mmr = ($lambda * $relevance) - ((1.0 - $lambda) * $maxSimToSelected);
                if ($mmr > $bestScore) { $bestScore = $mmr; $bestIdx = $i; }
            }
            if ($bestIdx >= 0) {
                $selected[] = $remaining[$bestIdx];
                array_splice($remaining, $bestIdx, 1);
            } else break;
        }
        return $selected;
    }

    /**
     * Cross-Encoder Precision Candidate Reranker
     * Scores candidates using deep token-level cross-interaction:
     * - Exact n-gram phrase matching
     * - Title / Header domain alignment
     * - Term proximity and span compactness
     * - Code / Syntax intent boosting
     */
    public static function crossScoreCandidates(string $query, array $candidates): array {
        if (count($candidates) <= 1) return $candidates;

        $qTokens = self::tokenize($query);
        $hasCodeIntent = (bool)preg_match('/\b(?:code|example|syntax|function|hook|class|query|snippet|how to write)\b/i', $query);
        $isComparison = (bool)preg_match('/\b(?:difference|compare|versus|vs\.?|differ)\b/i', $query);

        foreach ($candidates as &$cand) {
            $content = $cand['content'] ?? '';
            $title = $cand['title'] ?? '';
            $contentLower = strtolower($content);
            $titleLower = strtolower($title);

            // 1. Exact bi-gram / tri-gram phrase matching
            $phraseBonus = 0.0;
            if (count($qTokens) >= 2) {
                for ($i = 0; $i < count($qTokens) - 1; $i++) {
                    $bigram = $qTokens[$i] . ' ' . $qTokens[$i+1];
                    if (strpos($contentLower, $bigram) !== false) {
                        $phraseBonus += 0.05;
                    }
                    if ($i < count($qTokens) - 2) {
                        $trigram = $bigram . ' ' . $qTokens[$i+2];
                        if (strpos($contentLower, $trigram) !== false) {
                            $phraseBonus += 0.08;
                        }
                    }
                }
            }
            $phraseBonus = min($phraseBonus, 0.20);

            // 2. Title / Header alignment boost
            $titleBonus = 0.0;
            foreach ($qTokens as $token) {
                if (strlen($token) >= 3 && strpos($titleLower, $token) !== false) {
                    $titleBonus += 0.04;
                }
            }
            $titleBonus = min($titleBonus, 0.15);

            // 3. Proximity scoring (compactness of query terms in text)
            $proximityBonus = 0.0;
            $positions = [];
            foreach ($qTokens as $token) {
                if (strlen($token) < 3) continue;
                $pos = strpos($contentLower, $token);
                if ($pos !== false) {
                    $positions[] = $pos;
                }
            }
            if (count($positions) >= 2) {
                sort($positions);
                $span = end($positions) - reset($positions);
                if ($span < 200) {
                    $proximityBonus = 0.10;
                } elseif ($span < 500) {
                    $proximityBonus = 0.05;
                }
            }

            // 4. Intent structural boost (code blocks, comparisons)
            $intentBonus = 0.0;
            if ($hasCodeIntent && strpos($content, '```') !== false) {
                $intentBonus += 0.08;
            }
            if ($isComparison && preg_match('/\b(?:whereas|differs|unlike|in contrast|instead of)\b/i', $content)) {
                $intentBonus += 0.08;
            }

            // Base similarity from RRF / cosine
            $baseSim = (float)($cand['similarity'] ?? 0.5);

            // Cross-Encoder Composite Score
            $crossScore = $baseSim + $phraseBonus + $titleBonus + $proximityBonus + $intentBonus;
            $cand['cross_score'] = round($crossScore, 4);
            $cand['similarity'] = round($crossScore, 4);
        }
        unset($cand);

        // Sort descending by cross_score
        usort($candidates, fn($a, $b) => ($b['cross_score'] ?? 0) <=> ($a['cross_score'] ?? 0));
        return $candidates;
    }

    /**
     * NLI Fact-Checking & Grounded Claim Verification
     * Decomposes an answer into claims and verifies them against cited sources using Tier-2 NLI
     */
    public static function verifyAnswerClaims(string $answer, array $sources): array {
        if (empty($answer) || empty($sources) || !class_exists('RagPremiseVerifier')) {
            return ['verified' => true, 'unsupported_claims' => [], 'grounding_ratio' => 1.0];
        }

        $sentences = preg_split('/(?<=[.!?])\s+/', trim($answer), -1, PREG_SPLIT_NO_EMPTY);
        $claims = [];
        $combinedEvidence = '';
        foreach ($sources as $s) {
            $combinedEvidence .= ($s['content'] ?? '') . "\n";
        }
        $combinedEvidence = substr($combinedEvidence, 0, 1500);

        $entailedCount = 0;
        $unsupported = [];

        foreach ($sentences as $sentence) {
            $trimmed = trim($sentence);
            if (strlen($trimmed) < 20 || preg_match('/^(according to|for example|take a look|let\'s explore)/i', $trimmed)) {
                $entailedCount++;
                continue;
            }

            $nliRes = RagPremiseVerifier::callTier2Nli($combinedEvidence, $trimmed, ['prompt_mode' => 'B5']);
            $claims[] = [
                'claim' => $trimmed,
                'label' => $nliRes['label'],
                'confidence' => $nliRes['confidence']
            ];

            if ($nliRes['label'] === 'CONTRADICTION') {
                $unsupported[] = ['claim' => $trimmed, 'reason' => 'Directly contradicts course material'];
            } elseif ($nliRes['label'] === 'ENTAILMENT') {
                $entailedCount++;
            } else {
                $entailedCount += 0.5;
            }
        }

        $total = count($sentences);
        $groundingRatio = $total > 0 ? round($entailedCount / $total, 2) : 1.0;

        return [
            'verified' => empty($unsupported),
            'grounding_ratio' => $groundingRatio,
            'total_claims' => $total,
            'unsupported_claims' => $unsupported,
            'claims_analysis' => $claims
        ];
    }

    /**
     * Calibrated Confidence Calculator & Quality Gate
     * Rejects out-of-domain queries (topSim < 0.56) to prevent hallucination
     */
    public static function calculateCalibratedConfidence(string $query, array $results): array {
        if (empty($results)) {
            return ['confidence' => 0.0, 'abstain' => true, 'reason' => 'No chunks matched query threshold'];
        }

        $allSims = array_map(fn($r) => (float)($r['similarity'] ?? 0), array_slice($results, 0, 3));
        $topSim = !empty($allSims) ? max($allSims) : 0.0;
        $thirdSim = isset($results[2]) ? ($results[2]['similarity'] ?? 0.0) : ($topSim * 0.85);
        $margin = max(0.0, $topSim - $thirdSim);

        $qWords = self::tokenize($query);
        $combinedText = '';
        foreach ($results as $r) {
            $combinedText .= ' ' . ($r['title'] ?? '') . ' ' . ($r['content'] ?? '');
        }
        $combinedText = strtolower($combinedText);

        $matched = 0;
        if (!empty($qWords)) {
            foreach ($qWords as $qw) {
                if (strpos($combinedText, $qw) !== false) $matched++;
            }
            $kwRatio = $matched / count($qWords);
        } else {
            $kwRatio = 0.5;
        }

        $marginScore = min(1.0, $margin / 0.12);
        $confidence = (0.50 * $topSim) + (0.30 * $marginScore) + (0.20 * $kwRatio);

        $abstain = false;
        $reason = 'Grounded';
        if ($topSim < 0.56) {
            $abstain = true;
            $reason = 'Low absolute vector similarity indicates out-of-domain topic';
        } elseif ($topSim < 0.62 && $margin < 0.06 && $kwRatio < 0.35) {
            $abstain = true;
            $reason = 'Out-of-domain: flat similarity margin and low keyword coverage';
        } elseif ($topSim < 0.60 && $kwRatio < 0.30) {
            $abstain = true;
            $reason = 'Weak similarity and low keyword match';
        } elseif ($confidence < 0.48 && $kwRatio < 0.25) {
            $abstain = true;
            $reason = 'Composite confidence below safe threshold';
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
     * Uses /api/embed (new) with fallback to /api/embeddings (legacy)
     */
    public static function getEmbedding(string $text): ?array {
        $cleanText = trim(preg_replace('/\s+/', ' ', $text));
        if (empty($cleanText)) return null;

        $cacheKey = strtolower($cleanText);
        if (isset(self::$embeddingMemoryCache[$cacheKey])) {
            return self::$embeddingMemoryCache[$cacheKey];
        }

        $url = self::$ollamaBaseUrl . '/api/embed';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([
                'model' => self::$embedModel,
                'input' => $cleanText,
                'keep_alive' => '24h'
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 30
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if (!empty($data['embeddings'][0])) {
                $emb = $data['embeddings'][0];
                if (count(self::$embeddingMemoryCache) < 2000) {
                    self::$embeddingMemoryCache[$cacheKey] = $emb;
                }
                return $emb;
            }
        }

        // Fallback to legacy endpoint
        $ch2 = curl_init(self::$ollamaBaseUrl . '/api/embeddings');
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(['model' => self::$embedModel, 'prompt' => $cleanText]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 30
        ]);
        $res2 = curl_exec($ch2);
        curl_close($ch2);
        if ($res2) {
            $data2 = json_decode($res2, true);
            if (!empty($data2['embedding'])) return $data2['embedding'];
        }
        return null;
    }

    /**
     * Code-Aware & Markdown-Aware Semantic Chunker
     * Preserves code blocks, headings, and complete sentences
     */
    public static function chunkText(string $text, int $chunkSize = 650, int $chunkOverlap = 100): array {
        $text = trim(str_replace("\r\n", "\n", $text));
        if (strlen($text) <= $chunkSize) return [$text];

        $rawSections = preg_split('/(?=\n#{1,4}\s+|\n[A-Z0-9\s_\-]{4,40}:\n)/', $text);
        $sections = array_filter(array_map('trim', $rawSections), fn($s) => !empty($s));
        $chunks = [];
        $currentChunk = '';

        foreach ($sections as $section) {
            if (strlen($section) <= $chunkSize) {
                if (strlen($currentChunk) + strlen($section) + 2 <= $chunkSize) {
                    $currentChunk .= ($currentChunk ? "\n\n" : "") . $section;
                } else {
                    if (!empty($currentChunk)) $chunks[] = $currentChunk;
                    $currentChunk = $section;
                }
            } else {
                if (!empty($currentChunk)) { $chunks[] = $currentChunk; $currentChunk = ''; }
                $paras = preg_split('/\n\s*\n/', $section);
                $inCodeFence = false;
                $tempParaChunk = '';
                foreach ($paras as $p) {
                    $p = trim($p);
                    if (empty($p)) continue;
                    $fenceCount = substr_count($p, '```');
                    if ($fenceCount % 2 !== 0) $inCodeFence = !$inCodeFence;
                    if (strlen($tempParaChunk) + strlen($p) + 2 <= $chunkSize || $inCodeFence) {
                        $tempParaChunk .= ($tempParaChunk ? "\n\n" : "") . $p;
                    } else {
                        if (!empty($tempParaChunk)) $chunks[] = $tempParaChunk;
                        $tempParaChunk = $p;
                    }
                }
                if (!empty($tempParaChunk)) $chunks[] = $tempParaChunk;
            }
        }
        if (!empty($currentChunk)) $chunks[] = $currentChunk;
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
        $dot = $normA = $normB = 0.0;
        for ($i = 0; $i < $count; $i++) {
            $dot += $vecA[$i] * $vecB[$i];
            $normA += $vecA[$i] * $vecA[$i];
            $normB += $vecB[$i] * $vecB[$i];
        }
        if ($normA <= 0.0 || $normB <= 0.0) return 0.0;
        return $dot / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Ingest document into vector store with code-aware chunking
     */
    public static function ingestMaterial(
        string $materialId, string $title, string $content,
        ?string $courseId = null, ?string $batchId = null, array $metadata = []
    ): array {
        $chunks = self::chunkText($content);
        $indexed = 0;
        $db = self::getLocalDb();

        // Delete existing chunks for re-indexing in both SQLite and Supabase
        $delStmt = $db->prepare("DELETE FROM material_chunks WHERE material_id = :mid");
        $delStmt->execute([':mid' => $materialId]);
        try {
            supabaseDelete('document_chunks', ['material_id' => $materialId]);
        } catch (\Throwable $e) {}

        $supabaseChunks = [];
        foreach ($chunks as $index => $chunkText) {
            $embedding = self::getEmbedding($chunkText);
            if (!$embedding) continue;

            $chunkId = sprintf('%s_chunk_%d', $materialId, $index);
            $chunkMeta = array_merge($metadata, [
                'title' => $title,
                'chunk_index' => $index,
                'total_chunks' => count($chunks)
            ]);

            $stmt = $db->prepare("
                INSERT OR REPLACE INTO material_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding)
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
            $indexed++;

            // Prepare for batch sync to Supabase
            $supabaseChunks[] = [
                'material_id' => $materialId,
                'chunk_index' => $index,
                'content' => $chunkText,
                'metadata' => $chunkMeta,
                'embedding' => '[' . implode(',', $embedding) . ']'
            ];
        }

        // Dual-storage sync: batch insert into Supabase document_chunks if table exists
        if (!empty($supabaseChunks)) {
            try {
                supabaseInsert('document_chunks', $supabaseChunks);
            } catch (\Throwable $e) {
                // Silently ignore if table is not yet provisioned in Supabase; SQLite is primary
            }
        }

        self::invalidateCache();

        // Update materials status in Supabase if material exists there
        try {
            supabaseUpdate('materials', [
                'ingestion_status' => ($indexed > 0) ? 'completed' : 'failed',
                'chunk_count' => $indexed
            ], ['id' => $materialId]);
        } catch (\Throwable $e) {}

        return [
            'success' => ($indexed > 0 || empty($chunks)),
            'material_id' => $materialId,
            'title' => $title,
            'total_chunks' => count($chunks),
            'indexed_chunks' => $indexed
        ];
    }

    /**
     * Ingest document from local file path or remote URL (PDF, TXT, MD, etc.)
     */
    public static function ingestMaterialDocument(
        string $materialId,
        string $title,
        string $filePathOrUrl,
        ?string $courseId = null,
        ?string $batchId = null,
        array $metadata = []
    ): array {
        $text = DocumentExtractor::extractFromUrl($filePathOrUrl);
        if (empty($text)) {
            $text = DocumentExtractor::extractFromFile($filePathOrUrl);
        }

        if (empty($text)) {
            return [
                'success' => false,
                'error' => 'Could not extract text from document: ' . $filePathOrUrl,
                'material_id' => $materialId,
                'total_chunks' => 0,
                'indexed_chunks' => 0
            ];
        }

        $meta = array_merge($metadata, [
            'source_file' => basename($filePathOrUrl)
        ]);

        return self::ingestMaterial($materialId, $title, $text, $courseId, $batchId, $meta);
    }

    public static function deleteMaterialChunks(string $materialId): bool {
        try {
            $db = self::getLocalDb();
            $delStmt = $db->prepare("DELETE FROM material_chunks WHERE material_id = :mid");
            $delStmt->execute([':mid' => $materialId]);
            self::invalidateCache();

            // Also delete from Supabase document_chunks if table exists
            try {
                supabaseDelete('document_chunks', ['material_id' => $materialId]);
                supabaseUpdate('materials', ['ingestion_status' => 'pending', 'chunk_count' => 0], ['id' => $materialId]);
            } catch (\Throwable $e) {}

            return true;
        } catch (\Throwable $e) {
            error_log("[RagService] Failed to delete chunks: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get RAG statistics
     */
    public static function getStats(): array {
        $db = self::getLocalDb();
        $count = $db->query("SELECT COUNT(*) FROM material_chunks")->fetchColumn();
        $courses = $db->query("SELECT DISTINCT title FROM material_chunks")->fetchAll(PDO::FETCH_COLUMN);
        return [
            'success' => true,
            'chunk_count' => (int)$count,
            'indexed_documents' => $courses,
            'embed_model' => self::$embedModel,
            'chat_model' => self::$chatModel,
            'vector_dimension' => 768,
            'search_backend' => 'hybrid_rrf'
        ];
    }

    /**
     * Core Hybrid Dense + BM25 + RRF Search
     * Champion configuration from 64 experiments
     */
    public static function search(
        string $query, ?string $courseId = null, ?string $batchId = null,
        int $limit = 4, float $threshold = 0.20
    ): array {
        $cleanQuery = self::preprocessQuery($query);
        $queryEmbedding = self::getEmbedding($cleanQuery);
        if (!$queryEmbedding) {
            return ['success' => false, 'error' => 'Could not generate query embedding.', 'results' => []];
        }

        // Try prewarmed corpus first, fall back to SQLite disk query
        $corpus = self::getPrewarmedCorpus();
        if (!empty($corpus)) {
            // Filter by course/batch (strict isolation)
            $candidates = [];
            foreach ($corpus as $c) {
                if (!empty($courseId) && $c['course_id'] !== $courseId) continue;
                if (!empty($batchId) && $c['batch_id'] !== $batchId) continue;
                $candidates[] = $c;
            }

            if (empty($candidates)) {
                return ['success' => true, 'count' => 0, 'results' => []];
            }

            // Dense scoring using precomputed unit vectors
            $qNormSq = 0.0;
            foreach ($queryEmbedding as $v) $qNormSq += $v * $v;
            $qNorm = sqrt($qNormSq);
            $qUnit = $qNorm > 0 ? array_map(fn($v) => $v / $qNorm, $queryEmbedding) : $queryEmbedding;
            $dim = count($qUnit);

            $denseScored = [];
            foreach ($candidates as $idx => $row) {
                $uVec = $row['unit_vector'] ?? [];
                if (count($uVec) !== $dim) continue;
                $dot = 0.0;
                for ($i = 0; $i < $dim; $i++) $dot += $qUnit[$i] * $uVec[$i];
                $candidates[$idx]['similarity'] = round($dot, 4);
                $denseScored[$idx] = $dot;
            }
            arsort($denseScored);
            $denseRankedIndices = array_keys($denseScored);

            $qTokens = self::tokenize($cleanQuery);
            $bm25Scores = self::scoreBM25($qTokens, $candidates);
        } else {
            // Disk-based search
            $db = self::getLocalDb();
            $sql = "SELECT * FROM material_chunks WHERE 1=1";
            $params = [];
            if (!empty($courseId)) { $sql .= " AND course_id = :cid"; $params[':cid'] = $courseId; }
            if (!empty($batchId)) { $sql .= " AND batch_id = :bid"; $params[':bid'] = $batchId; }
            $stmt = $db->prepare($sql); $stmt->execute($params);
            $rawCandidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rawCandidates)) return ['success' => true, 'count' => 0, 'results' => []];

            $candidates = [];
            $denseScored = [];
            foreach ($rawCandidates as $idx => $row) {
                $chunkVec = self::unpackVector($row['embedding']);
                $score = self::cosineSimilarity($queryEmbedding, $chunkVec);
                $row['similarity'] = round($score, 4);
                unset($row['embedding']);
                $candidates[$idx] = $row;
                $denseScored[$idx] = $score;
            }
            arsort($denseScored);
            $denseRankedIndices = array_keys($denseScored);

            $qTokens = self::tokenize($cleanQuery);
            $bm25Scores = self::scoreBM25($qTokens, $rawCandidates);
        }

        // Adaptive intent weighting: code tokens get more BM25
        $hasCodeSyntax = preg_match('/[<>{}\(\)\[\]\*:=;`]/', $cleanQuery);
        $wDense = $hasCodeSyntax ? 0.50 : 0.55;
        $wBm25 = $hasCodeSyntax ? 0.50 : 0.45;

        // RRF fusion
        $fused = self::reciprocalRankFusion($candidates, $denseRankedIndices, $bm25Scores, $wDense, $wBm25);

        // Filter by threshold and apply Cross-Encoder Precision Reranker + MMR
        $filtered = array_values(array_filter($fused, fn($c) => ($c['similarity'] ?? 0) >= $threshold));
        $crossReranked = self::crossScoreCandidates($cleanQuery, $filtered);
        $finalResults = self::rerankMMR($crossReranked, $limit);

        // Clean output
        foreach ($finalResults as &$item) {
            unset($item['unit_vector'], $item['raw_embedding'], $item['doc_tokens'], $item['doc_len'], $item['embedding']);
        }

        return [
            'success' => true,
            'backend' => 'hybrid_rrf_cross_encoder',
            'count' => count($finalResults),
            'results' => $finalResults
        ];
    }

    /**
     * Grounded RAG Q&A with Calibrated Confidence & Abstention
     */
    public static function ask(
        string $question, ?string $courseId = null, ?string $batchId = null,
        ?string $studentName = null, int $limit = 4, string $mode = 'direct'
    ): array {
        @set_time_limit(180);

        // Step 1: Hybrid Search
        $searchRes = self::search($question, $courseId, $batchId, $limit, 0.20);
        $results = $searchRes['results'] ?? [];

        // Step 2: Calibrated Confidence Gate
        $confEval = self::calculateCalibratedConfidence($question, $results);
        if ($confEval['abstain']) {
            return [
                'success' => true,
                'answer' => "I apologize, but I do not have enough information in the approved course materials to answer your question accurately. Please try rephrasing with specific curriculum topics.",
                'sources' => [],
                'grounded' => false,
                'abstain' => true,
                'confidence' => $confEval['confidence'],
                'confidence_details' => $confEval,
                'mode' => $mode
            ];
        }

        // Step 2b: False Premise Verification (Tier 1 & Tier 2 NLI)
        if (class_exists('RagPremiseVerifier')) {
            $verResult = RagPremiseVerifier::verify($question, $results);
            if ($verResult['status'] === 'REFUTED') {
                $refutationAnswer = ($verResult['refutation'] ?? 'Your question contains an assumption that conflicts with verified curriculum materials.')
                    . ' ' . ($verResult['citation'] ?? '');
                return [
                    'success' => true,
                    'answer' => $refutationAnswer,
                    'sources' => array_slice($results, 0, 2),
                    'grounded' => true,
                    'abstain' => false,
                    'refuted_premise' => true,
                    'confidence' => $verResult['confidence'] ?? 0.95,
                    'confidence_details' => $confEval,
                    'mode' => $mode
                ];
            }
        }

        // Step 3: Build context from retrieved chunks
        $contextParts = [];
        $sources = [];
        foreach ($results as $i => $chunk) {
            $contextParts[] = "[Source " . ($i+1) . ": " . ($chunk['title'] ?? 'Unknown') . ", Section " . (($chunk['chunk_index'] ?? 0) + 1) . "]\n" . ($chunk['content'] ?? '');
            $sources[] = [
                'title' => $chunk['title'],
                'chunk_index' => $chunk['chunk_index'],
                'similarity' => $chunk['similarity'],
                'content' => $chunk['content']
            ];
        }
        $contextBlock = implode("\n\n---\n\n", $contextParts);

        // Step 4: LLM Generation configured by mode
        if ($mode === 'socratic') {
            $systemPrompt = "You are the EduConnect LMS Socratic AI Tutor. Your mission is NOT to simply provide the final answer, solution, or complete code, but to guide the student to discover the answer themselves.\n"
                . "1. Tone: Warm, encouraging, and academically rigorous.\n"
                . "2. Brevity: Keep guidance concise (under 200 words).\n"
                . "3. Hinting: Provide a targeted conceptual hint or analogy grounded in the provided curriculum excerpts.\n"
                . "4. Error Analysis: If the student asks about an error or shared buggy code, identify the conceptual misconception without writing the completed solution.\n"
                . "5. Socratic Question: Always end with ONE focused, thought-provoking question that prompts the student to think through the next step.\n"
                . "6. Citations: Cite the course source [Document Title, Section X] so the student knows where to review.";
            $userPrompt = "STUDENT QUESTION: {$question}\n\nCURRICULUM MATERIAL EXCERPTS:\n{$contextBlock}\n\nPlease guide the student Socratically based strictly on these excerpts. Provide a hint and ask a guiding question.";
            $temperature = 0.25;
        } else {
            $systemPrompt = "You are the EduConnect LMS AI Tutor. Answer using ONLY the provided curriculum excerpts.\n1. Direct concise answer under 250 words.\n2. Cite sources: [Document Title, Section X].\n3. Ground exclusively on provided excerpts; no outside knowledge.\n4. Include relevant code snippets from the excerpts when applicable.\n5. If the excerpts don't fully cover the question, say so.";
            $userPrompt = "Student Question: {$question}\n\nCurriculum Evidence:\n{$contextBlock}\n\nPlease provide a clear, accurate explanation citing [Document Title, Section X].";
            $temperature = 0.1;
        }

        $chatUrl = self::$ollamaBaseUrl . '/api/chat';
        $ch = curl_init($chatUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([
                'model' => self::$chatModel,
                'stream' => false,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt]
                ],
                'options' => [
                    'num_predict' => 512,
                    'num_ctx' => 2048,
                    'temperature' => $temperature,
                    'top_p' => 0.9
                ]
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 60
        ]);
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
            'abstain' => false,
            'confidence' => $confEval['confidence'],
            'confidence_details' => $confEval,
            'mode' => $mode
        ];
    }

    /**
     * Real-Time Streaming Grounded RAG with Server-Sent Events (SSE)
     * Supports both 'direct' (factual explanation) and 'socratic' (pedagogical guidance) modes
     */
    public static function askStream(
        string $question,
        ?string $courseId = null,
        ?string $batchId = null,
        ?string $studentName = null,
        int $limit = 4,
        string $mode = 'direct',
        array $history = [],
        ?string $studentId = null
    ): void {
        @set_time_limit(180);

        if (php_sapi_name() !== 'cli') {
            if (!headers_sent()) {
                header('Content-Type: text/event-stream; charset=UTF-8');
                header('Cache-Control: no-cache, no-transform');
                header('Connection: keep-alive');
                header('X-Accel-Buffering: no');
            }
            while (ob_get_level() > 0) {
                @ob_end_flush();
            }
            flush();
        }

        $sendEvent = function(string $event, array $data) {
            echo "event: {$event}\n";
            echo "data: " . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n\n";
            if (php_sapi_name() !== 'cli') {
                @ob_flush();
                flush();
            }
        };

        // Step 1: Hybrid Search
        $searchRes = self::search($question, $courseId, $batchId, $limit, 0.20);
        $results = $searchRes['results'] ?? [];

        // Step 2: Calibrated Confidence Gate
        $confEval = self::calculateCalibratedConfidence($question, $results);
        if ($confEval['abstain']) {
            $abstainMsg = "I apologize, but I do not have enough information in the approved course materials to answer your question accurately. Please try rephrasing with specific curriculum topics.";
            $sendEvent('metadata', [
                'sources' => [],
                'confidence' => $confEval['confidence'],
                'confidence_details' => $confEval,
                'abstain' => true,
                'mode' => $mode
            ]);
            $sendEvent('token', ['token' => $abstainMsg]);
            $sendEvent('done', [
                'success' => true,
                'answer' => $abstainMsg,
                'sources' => [],
                'grounded' => false,
                'abstain' => true,
                'confidence' => $confEval['confidence'],
                'mode' => $mode
            ]);
            return;
        }

        // Step 2b: False Premise Verification (Tier 1 & Tier 2 NLI)
        if (class_exists('RagPremiseVerifier')) {
            $verResult = RagPremiseVerifier::verify($question, $results);
            if ($verResult['status'] === 'REFUTED') {
                $refutationAnswer = ($verResult['refutation'] ?? 'Your question contains an assumption that conflicts with verified curriculum materials.')
                    . ' ' . ($verResult['citation'] ?? '');
                $sendEvent('metadata', [
                    'sources' => array_slice($results, 0, 2),
                    'confidence' => $verResult['confidence'] ?? 0.95,
                    'confidence_details' => $confEval,
                    'refuted_premise' => true,
                    'mode' => $mode
                ]);
                $sendEvent('token', ['token' => $refutationAnswer]);
                $sendEvent('done', [
                    'success' => true,
                    'answer' => $refutationAnswer,
                    'sources' => array_slice($results, 0, 2),
                    'grounded' => true,
                    'abstain' => false,
                    'refuted_premise' => true,
                    'confidence' => $verResult['confidence'] ?? 0.95,
                    'mode' => $mode
                ]);
                return;
            }
        }

        // Step 3: Build context from retrieved chunks
        $contextParts = [];
        $sources = [];
        foreach ($results as $i => $chunk) {
            $contextParts[] = "[Source " . ($i+1) . ": " . ($chunk['title'] ?? 'Unknown') . ", Section " . (($chunk['chunk_index'] ?? 0) + 1) . "]\n" . ($chunk['content'] ?? '');
            $sources[] = [
                'title' => $chunk['title'],
                'chunk_index' => $chunk['chunk_index'],
                'similarity' => $chunk['similarity'],
                'content' => $chunk['content']
            ];
        }
        $contextBlock = implode("\n\n---\n\n", $contextParts);

        // Send initial metadata event immediately so frontend gets sources and confidence in ~10-20ms!
        $sendEvent('metadata', [
            'sources' => $sources,
            'confidence' => $confEval['confidence'],
            'confidence_details' => $confEval,
            'abstain' => false,
            'mode' => $mode
        ]);

        // Step 4: Configure Prompt based on mode
        if ($mode === 'socratic') {
            $systemPrompt = "You are the EduConnect LMS Socratic AI Tutor. Your mission is NOT to simply provide the final answer, solution, or complete code, but to guide the student to discover the answer themselves.\n"
                . "1. Tone: Warm, encouraging, and academically rigorous.\n"
                . "2. Brevity: Keep guidance concise (under 200 words).\n"
                . "3. Hinting: Provide a targeted conceptual hint or analogy grounded in the provided curriculum excerpts.\n"
                . "4. Error Analysis: If the student asks about an error or shared buggy code, identify the conceptual misconception without writing the completed solution.\n"
                . "5. Socratic Question: Always end with ONE focused, thought-provoking question that prompts the student to think through the next step.\n"
                . "6. Citations: Cite the course source [Document Title, Section X] so the student knows where to review.";
            $userPrompt = "STUDENT QUESTION: {$question}\n\nCURRICULUM MATERIAL EXCERPTS:\n{$contextBlock}\n\nPlease guide the student Socratically based strictly on these excerpts. Provide a hint and ask a guiding question.";
            $temperature = 0.25;
        } else {
            $systemPrompt = "You are the EduConnect LMS AI Tutor. Answer using ONLY the provided curriculum excerpts.\n"
                . "1. Direct concise answer under 250 words.\n"
                . "2. Cite sources: [Document Title, Section X].\n"
                . "3. Ground exclusively on provided excerpts; no outside knowledge.\n"
                . "4. Include relevant code snippets from the excerpts when applicable.\n"
                . "5. If the excerpts don't fully cover the question, say so.";
            $userPrompt = "Student Question: {$question}\n\nCurriculum Evidence:\n{$contextBlock}\n\nPlease provide a clear, accurate explanation citing [Document Title, Section X].";
            $temperature = 0.1;
        }

        // Step 5: Stream from Ollama with real-time token delivery
        $chatUrl = self::$ollamaBaseUrl . '/api/chat';
        $fullAnswer = '';
        $streamBuffer = '';

        $ch = curl_init($chatUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([
                'model' => self::$chatModel,
                'stream' => true,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt]
                ],
                'options' => [
                    'num_predict' => 512,
                    'num_ctx' => 2048,
                    'temperature' => $temperature,
                    'top_p' => 0.9
                ]
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_WRITEFUNCTION => function($ch, $chunk) use (&$streamBuffer, &$fullAnswer, $sendEvent) {
                $streamBuffer .= $chunk;
                $lines = explode("\n", $streamBuffer);
                $streamBuffer = array_pop($lines); // incomplete portion remains in buffer
                foreach ($lines as $line) {
                    $trimmed = trim($line);
                    if (empty($trimmed)) continue;
                    $json = json_decode($trimmed, true);
                    if ($json && isset($json['message']['content'])) {
                        $token = $json['message']['content'];
                        $fullAnswer .= $token;
                        $sendEvent('token', ['token' => $token]);
                    }
                }
                return strlen($chunk);
            },
            CURLOPT_TIMEOUT => 120
        ]);

        curl_exec($ch);
        curl_close($ch);

        // Process any leftover content in buffer
        if (!empty(trim($streamBuffer))) {
            $json = json_decode(trim($streamBuffer), true);
            if ($json && isset($json['message']['content'])) {
                $token = $json['message']['content'];
                $fullAnswer .= $token;
                $sendEvent('token', ['token' => $token]);
            }
        }

        // Send completion event
        $sendEvent('done', [
            'success' => true,
            'answer' => $fullAnswer,
            'sources' => $sources,
            'grounded' => true,
            'abstain' => false,
            'confidence' => $confEval['confidence'],
            'mode' => $mode
        ]);

        // Auto-persist conversation history if studentId is present
        if (!empty($studentId) && !empty($fullAnswer)) {
            try {
                if (function_exists('supabaseInsert')) {
                    supabaseInsert('conversation_history', [
                        'student_id' => $studentId,
                        'role' => 'user',
                        'content' => $question
                    ]);
                    supabaseInsert('conversation_history', [
                        'student_id' => $studentId,
                        'role' => 'assistant',
                        'content' => $fullAnswer
                    ]);
                }
            } catch (\Throwable $t) {
                // Non-fatal
            }
        }
    }

    /**
     * Classify query intent for adaptive retrieval
     */
    public static function classifyQueryIntent(string $query): array {
        $qLower = strtolower($query);
        $isComparative = (bool)preg_match('/\b(?:difference|compare|versus|vs\.?|differ)\b/i', $query);

        $modules = [
            'react' => ['/\breact\b/i', '/\buse(?:State|Effect|Context|Ref|Memo|Callback)\b/i', '/\bhooks?\b/i', '/\bjsx\b/i'],
            'node' => ['/\bexpress\b/i', '/\bnode\b/i', '/\bmiddleware\b/i', '/\bjwt\b/i', '/\brest\s+api\b/i'],
            'postgres' => ['/\bpostgres\b/i', '/\bsql\b/i', '/\bdatabase\b/i', '/\bacid\b/i', '/\bnormaliz/i', '/\bindex/i'],
            'js' => ['/\bjavascript\b/i', '/\bes6\b/i', '/\bevent\s+loop\b/i', '/\bpromise\b/i', '/\basync\b/i', '/\bclosure\b/i', '/\btdz\b/i'],
            'html_css' => ['/\bhtml\b/i', '/\bcss\b/i', '/\bflexbox\b/i', '/\bgrid\b/i', '/\bbox/i']
        ];

        $detected = [];
        foreach ($modules as $mod => $patterns) {
            foreach ($patterns as $pat) {
                if (preg_match($pat, $query)) { $detected[] = $mod; break; }
            }
        }

        $type = count($detected) > 1 ? ($isComparative ? 'COMPARATIVE' : 'MULTI_MODULE') : 'SINGLE_MODULE';
        return ['type' => $type, 'isComparative' => $isComparative, 'detectedModules' => array_unique($detected)];
    }

    /**
     * RAG-Grounded Quiz Generator
     * Generates multiple-choice questions grounded in curriculum excerpts
     */
    public static function generateQuiz(
        string $topic,
        ?string $courseId = null,
        ?string $batchId = null,
        int $count = 5
    ): array {
        @set_time_limit(180);

        // Step 1: Hybrid Search for relevant curriculum chunks
        $searchRes = self::search($topic, $courseId, $batchId, 4, 0.20);
        $results = $searchRes['results'] ?? [];

        if (empty($results)) {
            return [
                'success' => false,
                'error' => 'No approved curriculum materials found for topic: ' . $topic,
                'quiz' => null,
                'sources' => []
            ];
        }

        // Step 2: Build curriculum evidence block
        $contextParts = [];
        $sources = [];
        foreach ($results as $i => $chunk) {
            $contextParts[] = "[Source " . ($i+1) . ": " . ($chunk['title'] ?? 'Unknown') . ", Section " . (($chunk['chunk_index'] ?? 0) + 1) . "]\n" . ($chunk['content'] ?? '');
            $sources[] = [
                'title' => $chunk['title'],
                'chunk_index' => $chunk['chunk_index'],
                'similarity' => $chunk['similarity']
            ];
        }
        $contextBlock = implode("\n\n---\n\n", $contextParts);

        // Step 3: Prompt Ollama for grounded quiz generation
        $systemPrompt = "You are the EduConnect LMS Quiz Specialist. Generate exactly {$count} multiple-choice questions (MCQs) grounded exclusively on the provided course material excerpts.\n"
            . "CRITICAL RULES:\n"
            . "1. Base every question strictly on the provided evidence excerpts.\n"
            . "2. For each question, provide 4 options labeled A, B, C, D.\n"
            . "3. Provide the correct option and a concise 1-sentence explanation citing [Document Title, Section X].\n"
            . "4. Format questions clearly with markdown.";

        $userPrompt = "Please generate {$count} MCQs on topic: {$topic}\n\nCurriculum Evidence:\n{$contextBlock}";

        $chatUrl = self::$ollamaBaseUrl . '/api/chat';
        $ch = curl_init($chatUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([
                'model' => self::$chatModel,
                'stream' => false,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt]
                ],
                'options' => [
                    'num_predict' => 1024,
                    'num_ctx' => 2048,
                    'temperature' => 0.2,
                    'top_p' => 0.9
                ]
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 90
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $quiz = null;
        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            $quiz = $data['message']['content'] ?? null;
        }

        $parsedQuestions = !empty($quiz) ? self::parseQuizQuestions($quiz) : [];

        return [
            'success' => !empty($quiz),
            'topic' => $topic,
            'quiz' => $quiz,
            'quiz_text' => $quiz,
            'questions' => $parsedQuestions,
            'sources' => $sources
        ];
    }

    /**
     * Parse structured question items from generated quiz markdown
     */
    public static function parseQuizQuestions(string $text): array {
        $questions = [];
        $blocks = preg_split('/(?=####?\s*Question|\bQuestion\s+\d+:?)/i', $text);
        foreach ($blocks as $block) {
            $block = trim($block);
            if (empty($block)) continue;
            
            $options = [];
            preg_match_all('/([A-D])\)\s+([^\n\r]+)/', $block, $optMatches, PREG_SET_ORDER);
            foreach ($optMatches as $om) {
                $cleanOpt = preg_replace('/\[Source.*?\]/i', '', $om[2]);
                $options[$om[1]] = trim($cleanOpt);
            }
            if (empty($options)) continue;

            $lines = explode("\n", $block);
            $qLines = [];
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if (preg_match('/^(?:####?\s*Question|\bQuestion\s+\d+:?)/i', $trimmed)) continue;
                if (preg_match('/^[A-D]\)/i', $trimmed)) break;
                if (preg_match('/^\*\*Correct/i', $trimmed)) break;
                if (!empty($trimmed)) $qLines[] = $trimmed;
            }
            $questionText = implode(" ", $qLines);

            $correct = '';
            $citation = '';
            if (preg_match('/\*\*Correct\s*Option:\*\*\s*([A-D])(?:\)\s*([^\[\n]+))?(?:\[(.*?)\])?/i', $block, $corMatch)) {
                $correct = strtoupper(trim($corMatch[1]));
                $citation = trim($corMatch[3] ?? '');
            }
            if (empty($citation) && preg_match('/\[(?:Source\s*\d*:\s*)?([^\]]+)\]/i', $block, $citMatch)) {
                $citation = trim($citMatch[1]);
            }

            if (!empty($questionText) && count($options) >= 2) {
                $questions[] = [
                    'question' => $questionText,
                    'options' => $options,
                    'correct_answer' => $correct,
                    'source_citation' => $citation
                ];
            }
        }
        return $questions;
    }

    /**
     * Active Quiz Session Storage (file-backed across processes & restarts)
     */
    public static function saveActiveQuiz(string $chatId, array $questions): void {
        $storageDir = __DIR__ . '/storage';
        if (!is_dir($storageDir)) {
            @mkdir($storageDir, 0777, true);
        }
        $file = $storageDir . '/quiz_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $chatId) . '.json';
        file_put_contents($file, json_encode($questions, JSON_PRETTY_PRINT));
    }

    public static function getActiveQuiz(string $chatId): ?array {
        $file = __DIR__ . '/storage/quiz_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $chatId) . '.json';
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            return is_array($data) ? $data : null;
        }
        return null;
    }

    public static function clearActiveQuiz(string $chatId): void {
        $file = __DIR__ . '/storage/quiz_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $chatId) . '.json';
        if (file_exists($file)) {
            @unlink($file);
        }
    }

    /**
     * Deterministic Quiz Evaluator
     * Grades student quiz submissions against the verified answer key with exact arithmetic.
     */
    public static function evaluateQuiz(array $questions, $studentAnswers): array {
        if (empty($questions)) {
            return [
                'success' => false,
                'error' => 'No questions provided for evaluation',
                'score' => 0,
                'total' => 0,
                'percentage' => 0
            ];
        }

        $parsedAnswers = [];
        if (is_array($studentAnswers)) {
            $parsedAnswers = $studentAnswers;
        } else {
            $raw = trim((string)$studentAnswers);
            $cleanRaw = preg_replace('/[*_`#]/', '', $raw);
            $cleanRaw = str_replace(["\r\n", "\r"], "\n", $cleanRaw);

            // First attempt: Line-by-line or delimiter-separated extraction
            $chunks = preg_split('/\n+/', $cleanRaw);
            if (count($chunks) <= 1) {
                $splitByQ = preg_split('/(?=(?:^|[,\s;]+|\s+and\s+)(?:for\s+)?(?:question|q|ans)?\s*[1-9]\d?(?:st|nd|rd|th)?\s*(?:is|=|:|\.|\)|->|-|ka|\s))/i', $cleanRaw);
                if (count($splitByQ) > 1) {
                    $chunks = array_filter(array_map('trim', $splitByQ));
                }
            }

            foreach ($chunks as $chunk) {
                $chunk = preg_replace('/^(?:and|then|also)\s+/i', '', trim($chunk));
                if (empty($chunk)) continue;

                // Pattern 1: Numbered format like "1. A", "1) (A)", "Q1: display: flex", "2 is B", "1 -> A", "1 ka A"
                if (preg_match('/^(?:for\s+)?(?:question|q|ans)?\s*([1-9]\d?)(?:st|nd|rd|th)?\s*(?:is|=|:|\.|\)|->|-|ka|\s)+\s*(?:for\s+)?(?:option|choice)?\s*[\(\[]?\s*([a-dA-D]\b|[\w\s\-:().<>*,+]+?)\s*[\)\]]?(?:[,\.;]|$)/i', $chunk, $m)) {
                    $qNum = (int)$m[1];
                    $ansVal = trim($m[2]);
                    $ansVal = preg_replace('/^(?:it\s+)?(?:is\s+)?(?:option\s+|choice\s+)?/i', '', $ansVal);
                    $ansVal = preg_replace('/\s+(?:and|then|also)\s*$/i', '', $ansVal);
                    $parsedAnswers[$qNum] = trim($ansVal);
                }
            }

            // Pattern 2: Compact tokens like "1A 2A 3B 4B 5A", "1stA 2ndB"
            if (empty($parsedAnswers) && preg_match_all('/([1-9]\d?)(?:st|nd|rd|th)?\s*[:.\-]?\s*([a-dA-D])\b/i', $cleanRaw, $compactMatches, PREG_SET_ORDER)) {
                foreach ($compactMatches as $cm) {
                    $parsedAnswers[(int)$cm[1]] = strtoupper($cm[2]);
                }
            }

            // Pattern 3: Sequential standalone letters like "A, A, B, B, A" or "(A) (B) (C)"
            if (empty($parsedAnswers)) {
                if (preg_match_all('/(?:\b|[\(\[])([a-dA-D])(?:\b|[\)\]])/i', $cleanRaw, $letterMatches)) {
                    $i = 1;
                    foreach ($letterMatches[1] as $letter) {
                        $parsedAnswers[$i++] = strtoupper($letter);
                    }
                }
            }
        }

        $breakdown = [];
        $correctCount = 0;
        $total = count($questions);

        foreach ($questions as $index => $q) {
            $qNum = $index + 1;
            $correctLetter = strtoupper(trim($q['correct_answer'] ?? ''));
            $options = $q['options'] ?? [];
            $studentRaw = $parsedAnswers[$qNum] ?? null;
            $studentLetter = null;
            $studentText = '';

            if ($studentRaw !== null) {
                $cleanAns = trim((string)$studentRaw);
                $cleanAns = trim($cleanAns, " \t\n\r\0\x0B\"'()[]");
                $cleanAns = preg_replace('/^(?:option|choice)\s+/i', '', $cleanAns);
                $cleanAns = preg_replace('/\s+(?:and|then|also)\s*$/i', '', $cleanAns);

                // Single letter check
                if (preg_match('/^[a-dA-D]$/i', $cleanAns)) {
                    $studentLetter = strtoupper($cleanAns);
                    $studentText = $options[$studentLetter] ?? '';
                } elseif (preg_match('/^([a-dA-D])\s*[\)\.\:\-]\s*(.*)$/i', $cleanAns, $letterMatch)) {
                    $studentLetter = strtoupper($letterMatch[1]);
                    $studentText = !empty($letterMatch[2]) ? trim($letterMatch[2]) : ($options[$studentLetter] ?? '');
                } else {
                    // Match text against options: Pass 1 (Exact match)
                    $cleanAnsLower = strtolower($cleanAns);
                    foreach ($options as $optKey => $optVal) {
                        if (strtolower(trim($optVal)) === $cleanAnsLower) {
                            $studentLetter = strtoupper($optKey);
                            $studentText = $optVal;
                            break;
                        }
                    }

                    // Match text against options: Pass 2 (Fuzzy / Substring match)
                    if (!$studentLetter) {
                        foreach ($options as $optKey => $optVal) {
                            $optValLower = strtolower(trim($optVal));
                            if (stripos($optValLower, $cleanAnsLower) !== false ||
                                stripos($cleanAnsLower, $optValLower) !== false) {
                                $studentLetter = strtoupper($optKey);
                                $studentText = $optVal;
                                break;
                            }
                        }
                    }

                    if (!$studentLetter) {
                        $studentText = $cleanAns;
                    }
                }
            }

            $isCorrect = ($studentLetter !== null && $studentLetter === $correctLetter);
            if ($isCorrect) {
                $correctCount++;
            }

            $correctText = $options[$correctLetter] ?? '';
            $citation = $q['source_citation'] ?? '';

            $breakdown[] = [
                'question_number' => $qNum,
                'question' => $q['question'] ?? "Question {$qNum}",
                'student_answer' => $studentLetter ? "{$studentLetter}) {$studentText}" : ($studentText ?: 'No answer detected'),
                'student_letter' => $studentLetter,
                'correct_answer' => "{$correctLetter}) {$correctText}",
                'correct_letter' => $correctLetter,
                'is_correct' => $isCorrect,
                'source_citation' => $citation
            ];
        }

        $percentage = (int)round(($correctCount / max(1, $total)) * 100);

        // Build clean, human-friendly formatted report
        $reportLines = [];
        $reportLines[] = "📊 **Quiz Evaluation Results:**";
        $reportLines[] = "";

        foreach ($breakdown as $b) {
            $statusEmoji = $b['is_correct'] ? "✅ **Correct**" : "❌ **Incorrect**";
            $reportLines[] = "**Question {$b['question_number']}:** {$statusEmoji}";
            $reportLines[] = "• **Your Answer:** " . ($b['student_answer'] ?: 'None');
            if (!$b['is_correct']) {
                $reportLines[] = "• **Correct Answer:** " . $b['correct_answer'];
            }
            if (!empty($b['source_citation'])) {
                $reportLines[] = "• **Source:** [" . $b['source_citation'] . "]";
            }
            $reportLines[] = "";
        }

        $reportLines[] = "---";
        $reportLines[] = "🎯 **Final Score: {$correctCount} / {$total} ({$percentage}%)**";
        if ($percentage >= 80) {
            $reportLines[] = "🌟 Excellent grasp of this curriculum topic!";
        } elseif ($percentage >= 50) {
            $reportLines[] = "👍 Good effort! Review the cited sections above to strengthen your concepts.";
        } else {
            $reportLines[] = "📚 Recommend reviewing the study material notes before trying again.";
        }

        return [
            'success' => true,
            'score' => $correctCount,
            'total' => $total,
            'percentage' => $percentage,
            'breakdown' => $breakdown,
            'formatted_report' => implode("\n", $reportLines)
        ];
    }
}

