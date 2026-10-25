<?php
$dbPath = dirname(dirname(dirname(__DIR__))) . '/backend/storage/vectors.sqlite';
if (!file_exists($dbPath)) {
    echo "vectors.sqlite does not exist at $dbPath\n";
    exit(1);
}
$db = new PDO("sqlite:$dbPath");
$rows = $db->query("SELECT id, title, metadata, parent_chunk_id FROM material_chunks LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "ID: " . $r['id'] . "\n";
    echo "Title: " . $r['title'] . "\n";
    echo "Parent ID: " . ($r['parent_chunk_id'] ?? 'null') . "\n";
    echo "Metadata: " . $r['metadata'] . "\n\n";
}

$parentRows = $db->query("SELECT id, title, metadata FROM parent_chunks LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
echo "Parent Chunks Count: " . count($parentRows) . "\n";
foreach ($parentRows as $pr) {
    echo "Parent ID: " . $pr['id'] . " | Title: " . $pr['title'] . " | Metadata: " . ($pr['metadata'] ?? 'null') . "\n";
}

$pageRows = $db->query("SELECT id, title, metadata FROM material_chunks WHERE metadata LIKE '%page%' LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
echo "Chunks with page in metadata: " . count($pageRows) . "\n";
foreach ($pageRows as $pr) {
    echo "Chunk ID: " . $pr['id'] . " | Metadata: " . $pr['metadata'] . "\n";
}
