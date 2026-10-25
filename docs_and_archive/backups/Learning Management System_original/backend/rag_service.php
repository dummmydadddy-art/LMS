<?php
// EduConnect LMS - True RAG Engine Service
// Handles chunking, local Ollama embeddings, vector storage, semantic search, and grounded QA.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class RagService {
    private static ?PDO $sqliteDb = null;
    private static string $ollamaBaseUrl = 'http://localhost:11434';
    private static string $embedModel = 'nomic-embed-text';
    private static string $chatModel = 'llama3.2:latest';

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

        // Fallback to /api/embeddings for older Ollama formats
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
     * Intelligent text splitter preserving paragraphs and sentences
     */
    public static function chunkText(string $text, int $chunkSize = 500, int $chunkOverlap = 70): array {
        $text = trim($text);
        if (strlen($text) <= $chunkSize) {
            return [$text];
        }

        $chunks = [];
        // Split by major paragraph breaks
        $paragraphs = preg_split('/(\n\s*\n)/', $text, -1, PREG_SPLIT_NO_EMPTY);
        $currentChunk = '';

        foreach ($paragraphs as $para) {
            $para = trim($para);
            if (empty($para)) continue;

            if (strlen($currentChunk) + strlen($para) <= $chunkSize) {
                $currentChunk .= ($currentChunk ? "\n\n" : "") . $para;
            } else {
                // If currentChunk has enough content, save it
                if (strlen($currentChunk) > 100) {
                    $chunks[] = $currentChunk;
                    // Carry over overlap tail
                    $overlapText = substr($currentChunk, max(0, strlen($currentChunk) - $chunkOverlap));
                    $currentChunk = $overlapText . "\n\n" . $para;
                } else {
                    // Paragraph itself is larger than chunkSize, split by sentences
                    $sentences = preg_split('/(?<=[.!?])\s+/', $para, -1, PREG_SPLIT_NO_EMPTY);
                    foreach ($sentences as $sentence) {
                        if (strlen($currentChunk) + strlen($sentence) <= $chunkSize) {
                            $currentChunk .= ($currentChunk ? " " : "") . $sentence;
                        } else {
                            if (!empty($currentChunk)) {
                                $chunks[] = $currentChunk;
                                $overlapText = substr($currentChunk, max(0, strlen($currentChunk) - $chunkOverlap));
                                $currentChunk = $overlapText . " " . $sentence;
                            } else {
                                $chunks[] = substr($sentence, 0, $chunkSize);
                                $currentChunk = substr($sentence, $chunkSize);
                            }
                        }
                    }
                }
            }
        }

        if (!empty(trim($currentChunk))) {
            $chunks[] = trim($currentChunk);
        }

        return $chunks;
    }

    /**
     * Pack float array to binary blob for fast SQLite storage
     */
    public static function packVector(array $vector): string {
        return pack('f*', ...$vector);
    }

    /**
     * Unpack binary blob to float array
     */
    public static function unpackVector(string $blob): array {
        return array_values(unpack('f*', $blob));
    }

    /**
     * Compute cosine similarity between two float vectors
     */
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
     * Ingest document / note / text into vector store
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

        // Delete existing chunks for this material in local db to allow re-indexing
        $delStmt = $db->prepare("DELETE FROM material_chunks WHERE material_id = :mid");
        $delStmt->execute([':mid' => $materialId]);

        foreach ($chunks as $index => $chunkText) {
            $embedding = self::getEmbedding($chunkText);
            if (!$embedding) {
                // If embedding fails (e.g. Ollama busy), continue with next
                continue;
            }

            $chunkId = sprintf('%s_chunk_%d', $materialId, $index);
            $chunkMeta = array_merge($metadata, [
                'title' => $title,
                'chunk_index' => $index,
                'total_chunks' => count($chunks)
            ]);

            // Save to local SQLite vector store
            $stmt = $db->prepare("
                INSERT INTO material_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding)
                VALUES (:id, :mid, :cid, :bid, :cidx, :title, :content, :meta, :emb)
            ");
            $stmt->execute([
                ':id' => $chunkId,
                ':mid' => $materialId,
                ':cid' => $courseId,
                ':bid' => $batchId,
                ':cidx' => $index,
                ':title' => $title,
                ':content' => $chunkText,
                ':meta' => json_encode($chunkMeta),
                ':emb' => self::packVector($embedding)
            ]);

            // Try saving to Supabase if table exists
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
            } catch (Throwable $e) {
                // Ignore Supabase error if pgvector table is not yet migrated
            }

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

    /**
     * Delete all vector chunks for a specific material
     */
    public static function deleteMaterialChunks(string $materialId): bool {
        try {
            $db = self::getLocalDb();
            $delStmt = $db->prepare("DELETE FROM material_chunks WHERE material_id = :mid");
            $delStmt->execute([':mid' => $materialId]);
            try {
                supabaseDelete('material_chunks', ['material_id' => $materialId]);
            } catch (\Throwable $e) {
                // Ignore Supabase error if table not yet configured
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Search for most relevant material passages
     */
    public static function search(
        string $query,
        ?string $courseId = null,
        ?string $batchId = null,
        int $limit = 4,
        float $threshold = 0.35
    ): array {
        $queryEmbedding = self::getEmbedding($query);
        if (!$queryEmbedding) {
            return [
                'success' => false,
                'error' => 'Could not generate query embedding. Check Ollama nomic-embed-text status.',
                'results' => []
            ];
        }

        // 1. Try Supabase pgvector RPC first
        try {
            $rpcPayload = [
                'query_embedding' => $queryEmbedding,
                'match_threshold' => $threshold,
                'match_count' => $limit,
                'filter_course_id' => $courseId,
                'filter_batch_id' => $batchId
            ];
            $rpcRes = supabaseRequest('POST', 'rpc/match_material_chunks', $rpcPayload);
            if ($rpcRes['success'] && !empty($rpcRes['data'])) {
                return [
                    'success' => true,
                    'backend' => 'supabase_pgvector',
                    'count' => count($rpcRes['data']),
                    'results' => $rpcRes['data']
                ];
            }
        } catch (Throwable $e) {}

        // 2. Fallback to Local SQLite Vector Store
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

        $scored = [];
        foreach ($candidates as $row) {
            $chunkVec = self::unpackVector($row['embedding']);
            $score = self::cosineSimilarity($queryEmbedding, $chunkVec);

            if ($score >= $threshold) {
                $meta = json_decode($row['metadata'] ?? '{}', true) ?: [];
                $scored[] = [
                    'id' => $row['id'],
                    'material_id' => $row['material_id'],
                    'course_id' => $row['course_id'],
                    'batch_id' => $row['batch_id'],
                    'chunk_index' => (int)$row['chunk_index'],
                    'title' => $row['title'],
                    'content' => $row['content'],
                    'metadata' => $meta,
                    'similarity' => round($score, 4)
                ];
            }
        }

        // Sort descending by similarity
        usort($scored, fn($a, $b) => $b['similarity'] <=> $a['similarity']);
        $results = array_slice($scored, 0, $limit);

        return [
            'success' => true,
            'backend' => 'local_sqlite_vector',
            'count' => count($results),
            'results' => $results
        ];
    }

    /**
     * Full grounded RAG Question-Answering
     */
    public static function ask(
        string $question,
        ?string $courseId = null,
        ?string $batchId = null,
        ?string $studentName = null,
        int $limit = 4
    ): array {
        @set_time_limit(180);
        $searchRes = self::search($question, $courseId, $batchId, $limit, 0.30);
        $results = $searchRes['results'] ?? [];

        if (empty($results)) {
            return [
                'success' => true,
                'answer' => "I could not find specific approved course materials covering your question. Please verify with your instructor or check the syllabus.",
                'sources' => [],
                'grounded' => false
            ];
        }

        // Assemble knowledge block
        $contextParts = [];
        $sources = [];
        foreach ($results as $i => $chunk) {
            $sourceLabel = sprintf('%s (Section %d)', $chunk['title'], $chunk['chunk_index'] + 1);
            $contextParts[] = sprintf("--- [Source: %s, Relevance: %.0f%%] ---\n%s", $sourceLabel, $chunk['similarity'] * 100, $chunk['content']);
            $sources[] = [
                'title' => $chunk['title'],
                'chunk_index' => $chunk['chunk_index'],
                'similarity' => $chunk['similarity']
            ];
        }
        $contextBlock = implode("\n\n", $contextParts);

        $systemPrompt = "You are the Senior EduConnect LMS AI Tutor. Answer the student's question using ONLY the provided official course material excerpts below.

CRITICAL RULES:
1. Ground your answer strictly in the provided Course Materials. Do NOT fabricate information not present in the excerpts.
2. If the excerpts do not contain enough information to answer completely, answer what is available and state what is missing.
3. Keep your explanation friendly, clear, and under 250 words.
4. Include code snippets if relevant and present in the material.
5. Reference the source modules at the end of your response.";

        $userPrompt = "STUDENT QUESTION: {$question}

APPROVED COURSE MATERIAL EXCERPTS:
{$contextBlock}

Please provide a clear, accurate explanation based on the material above.";

        // Call Ollama
        $chatUrl = self::$ollamaBaseUrl . '/api/chat';
        $chatPayload = json_encode([
            'model' => self::$chatModel,
            'stream' => false,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt]
            ]
        ]);

        $ch = curl_init($chatUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $chatPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 90);

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
            'backend' => $searchRes['backend'] ?? 'local_sqlite_vector'
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
            'total_chunks' => (int)$count,
            'indexed_materials' => (int)$materials,
            'indexed_courses' => (int)$courses,
            'status' => 'operational'
        ];
    }
}
