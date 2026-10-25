<?php
$dbPath = dirname(dirname(dirname(__DIR__))) . '/backend/storage/vectors.sqlite';
$db = new PDO("sqlite:$dbPath");

$stmt = $db->query("SELECT id, title, metadata FROM material_chunks WHERE metadata LIKE '%page%' LIMIT 5");
$chunks = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($chunks as $c) {
    $meta = json_decode($c['metadata'], true);
    $pageStr = null;
    if (!empty($meta['page_citation'])) {
        $pageStr = $meta['page_citation'];
    } elseif (!empty($meta['page_start'])) {
        $pageStr = ($meta['page_start'] === ($meta['page_end'] ?? $meta['page_start']))
            ? 'p. ' . $meta['page_start']
            : 'pp. ' . $meta['page_start'] . '-' . $meta['page_end'];
    }
    echo "ID: " . $c['id'] . " | Title: " . $c['title'] . " | Formatted Page: " . ($pageStr ?? 'none') . "\n";
}
