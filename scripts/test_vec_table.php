<?php
$sqliteFile = __DIR__ . '/../backend/storage/vectors.sqlite';
$s3 = new SQLite3($sqliteFile);
$s3->loadExtension('vec0.dll');

$s3->exec("CREATE VIRTUAL TABLE IF NOT EXISTS material_chunks_vec USING vec0(
    chunk_id text,
    embedding float[768] distance_metric=cosine
)");

$count = $s3->querySingle("SELECT count(*) FROM material_chunks_vec");
echo "Current material_chunks_vec row count: " . $count . PHP_EOL;
