<?php
// Setup Parent-Child Hierarchical Chunks (R4)
$sqliteFile = __DIR__ . '/../backend/storage/vectors.sqlite';
$db = new PDO("sqlite:" . $sqliteFile);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Setting up Parent-Child Hierarchical Chunking Schema...\n";

// 1. Add parent_chunk_id column to material_chunks if missing
$cols = $db->query("PRAGMA table_info(material_chunks)")->fetchAll(PDO::FETCH_ASSOC);
$hasParentCol = false;
foreach ($cols as $c) {
    if ($c['name'] === 'parent_chunk_id') {
        $hasParentCol = true;
        break;
    }
}
if (!$hasParentCol) {
    echo "Adding parent_chunk_id column to material_chunks...\n";
    $db->exec("ALTER TABLE material_chunks ADD COLUMN parent_chunk_id TEXT");
}

// 2. Create parent_chunks table
$db->exec("
    CREATE TABLE IF NOT EXISTS parent_chunks (
        id TEXT PRIMARY KEY,
        material_id TEXT,
        course_id TEXT,
        batch_id TEXT,
        chunk_index INTEGER,
        title TEXT,
        content TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_parent_mat ON parent_chunks(material_id);
");

// 3. Clear existing parent chunks to build fresh
$db->exec("DELETE FROM parent_chunks");

// 4. Fetch all material chunks ordered by material_id, chunk_index
$stmt = $db->query("SELECT id, material_id, course_id, batch_id, chunk_index, title, content, metadata FROM material_chunks ORDER BY material_id, chunk_index ASC");
$allChunks = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Group by material_id
$byMat = [];
foreach ($allChunks as $c) {
    $byMat[$c['material_id']][] = $c;
}

$parentInsertStmt = $db->prepare("
    INSERT INTO parent_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
$childUpdateStmt = $db->prepare("
    UPDATE material_chunks SET parent_chunk_id = ? WHERE id = ?
");

$db->beginTransaction();
$totalParents = 0;
$totalChildren = 0;

$GROUP_SIZE = 4; // 4 child chunks (~200 tokens each) -> ~800 tokens parent chunk

foreach ($byMat as $matId => $chunks) {
    $chunkCount = count($chunks);
    $parentIdx = 0;
    for ($i = 0; $i < $chunkCount; $i += $GROUP_SIZE) {
        $group = array_slice($chunks, $i, $GROUP_SIZE);
        $parentId = "parent_{$matId}_{$parentIdx}";
        
        // Assemble parent content from child chunks
        $parentContentParts = [];
        $childIds = [];
        $minPage = 999999;
        $maxPage = 0;
        $title = $group[0]['title'] ?? $matId;
        $courseId = $group[0]['course_id'] ?? null;
        $batchId = $group[0]['batch_id'] ?? null;

        foreach ($group as $c) {
            $childIds[] = $c['id'];
            // Clean page markers if present or keep them
            $rawText = $c['content'];
            $parentContentParts[] = $rawText;

            $meta = json_decode($c['metadata'] ?? '{}', true);
            if (!empty($meta['page_start'])) $minPage = min($minPage, $meta['page_start']);
            if (!empty($meta['page_end'])) $maxPage = max($maxPage, $meta['page_end']);
        }

        $parentContent = implode("\n\n", $parentContentParts);
        $parentMeta = json_encode([
            'parent_chunk_index' => $parentIdx,
            'child_chunk_ids' => $childIds,
            'child_count' => count($group),
            'page_start' => ($minPage < 999999) ? $minPage : null,
            'page_end' => ($maxPage > 0) ? $maxPage : null
        ]);

        $parentInsertStmt->execute([
            $parentId,
            $matId,
            $courseId,
            $batchId,
            $parentIdx,
            $title,
            $parentContent,
            $parentMeta
        ]);
        $totalParents++;

        // Link children to parent
        foreach ($childIds as $cid) {
            $childUpdateStmt->execute([$parentId, $cid]);
            $totalChildren++;
        }

        $parentIdx++;
    }
}

$db->commit();

echo "Hierarchical chunking complete!\n";
echo "Total parent chunks created: {$totalParents}\n";
echo "Total child chunks linked: {$totalChildren}\n";

// Verify average parent chunk length
$pStats = $db->query("SELECT min(length(content)), avg(length(content)), max(length(content)) FROM parent_chunks")->fetch(PDO::FETCH_NUM);
echo "Parent Chunks Character Stats: Min: {$pStats[0]}, Avg: " . round($pStats[1], 1) . ", Max: {$pStats[2]}\n";
$approxTokens = round($pStats[1] / 4);
echo "Approx Average Parent Tokens: ~{$approxTokens} tokens (target: 800-1000 tokens)\n";
