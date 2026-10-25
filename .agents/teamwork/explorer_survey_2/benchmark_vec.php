<?php

$sqliteFile = __DIR__ . '/../../../backend/storage/vectors.sqlite';
$s3 = new SQLite3($sqliteFile);
$s3->loadExtension('vec0.dll');

echo "Loaded vec0 into vectors.sqlite connection.\n";

// Create in-memory table or temp table to test migration & speed without modifying vectors.sqlite yet
$s3->exec("CREATE VIRTUAL TABLE IF NOT EXISTS temp.vec_test_chunks USING vec0(
    chunk_id text,
    embedding float[768] distance_metric=cosine
)");

echo "Populating temp.vec_test_chunks from material_chunks...\n";
$t0 = microtime(true);
$res = $s3->query("SELECT id, embedding FROM material_chunks");
$s3->exec("BEGIN TRANSACTION");
$stmt = $s3->prepare("INSERT INTO temp.vec_test_chunks(chunk_id, embedding) VALUES (?, ?)");
$count = 0;
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    $stmt->bindValue(1, $row['id'], SQLITE3_TEXT);
    $stmt->bindValue(2, $row['embedding'], SQLITE3_BLOB);
    $stmt->execute();
    $count++;
}
$s3->exec("COMMIT");
$tPopulate = (microtime(true) - $t0) * 1000;
echo "Inserted $count chunks in " . round($tPopulate, 2) . "ms\n";

// Grab a sample vector to query
$sampleRow = $s3->querySingle("SELECT embedding FROM material_chunks LIMIT 1", true);
$queryVecBlob = $sampleRow['embedding'];

// Run 10 queries and measure latency
$times = [];
for ($i = 0; $i < 10; $i++) {
    $t1 = microtime(true);
    $qStmt = $s3->prepare("SELECT chunk_id, distance FROM temp.vec_test_chunks WHERE embedding MATCH ? AND k = 20");
    $qStmt->bindValue(1, $queryVecBlob, SQLITE3_BLOB);
    $qRes = $qStmt->execute();
    $matches = [];
    while ($m = $qRes->fetchArray(SQLITE3_ASSOC)) {
        $matches[] = $m;
    }
    $times[] = (microtime(true) - $t1) * 1000;
}

echo "Top match: " . $matches[0]['chunk_id'] . " (distance: " . $matches[0]['distance'] . ")\n";
echo "10 Query times (ms): " . implode(', ', array_map(fn($t) => round($t, 2), $times)) . "\n";
echo "Average query time: " . round(array_sum($times) / count($times), 2) . "ms\n";
