<?php
$sqliteFile = __DIR__ . '/../backend/storage/vectors.sqlite';
$s3 = new SQLite3($sqliteFile);
$s3->loadExtension('vec0.dll');

$s3->exec("CREATE VIRTUAL TABLE IF NOT EXISTS material_chunks_vec USING vec0(
    chunk_id text,
    embedding float[768] distance_metric=cosine
)");

$existingCount = (int)$s3->querySingle("SELECT count(*) FROM material_chunks_vec");
echo "Existing material_chunks_vec rows: $existingCount\n";

if ($existingCount < 1323) {
    if ($existingCount > 0) {
        $s3->exec("DELETE FROM material_chunks_vec");
    }
    echo "Migrating 1323 chunks into material_chunks_vec...\n";
    $t0 = microtime(true);
    $res = $s3->query("SELECT id, embedding FROM material_chunks");
    $s3->exec("BEGIN TRANSACTION");
    $stmt = $s3->prepare("INSERT INTO material_chunks_vec(chunk_id, embedding) VALUES (?, ?)");
    $count = 0;
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
        $stmt->bindValue(1, $row['id'], SQLITE3_TEXT);
        $stmt->bindValue(2, $row['embedding'], SQLITE3_BLOB);
        $stmt->execute();
        $count++;
    }
    $s3->exec("COMMIT");
    $ms = round((microtime(true) - $t0) * 1000, 2);
    echo "Successfully migrated $count chunks in {$ms}ms.\n";
}

$finalCount = (int)$s3->querySingle("SELECT count(*) FROM material_chunks_vec");
echo "Final material_chunks_vec count: $finalCount\n";

// Test query
$sample = $s3->querySingle("SELECT embedding FROM material_chunks LIMIT 1", true);
$t1 = microtime(true);
$q = $s3->prepare("SELECT chunk_id, distance FROM material_chunks_vec WHERE embedding MATCH ? AND k = 10 ORDER BY distance");
$q->bindValue(1, $sample['embedding'], SQLITE3_BLOB);
$r = $q->execute();
$results = [];
while ($row = $r->fetchArray(SQLITE3_ASSOC)) {
    $results[] = $row;
}
$queryMs = round((microtime(true) - $t1) * 1000, 2);
echo "Test KNN query completed in {$queryMs}ms. Matches found: " . count($results) . "\n";
echo "Top match: " . $results[0]['chunk_id'] . " (distance: " . $results[0]['distance'] . ")\n";
