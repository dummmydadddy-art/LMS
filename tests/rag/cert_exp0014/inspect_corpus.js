const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const phpScript = `
require_once 'backend/config.php';
require_once 'backend/db.php';
require_once 'backend/rag_service.php';

$corpus = RagService::getPrewarmedCorpus();
$rows = [];
foreach ($corpus as $idx => $c) {
    $rows[] = [
        'idx' => $idx,
        'id' => $c['id'] ?? $idx,
        'title' => $c['title'] ?? '',
        'snippet' => substr(trim($c['content'] ?? ''), 0, 100) . '...'
    ];
}
echo json_encode($rows, JSON_PRETTY_PRINT);
`;

const res = spawnSync('php', ['-r', phpScript], {
    cwd: path.resolve(__dirname, '../../..'),
    encoding: 'utf8'
});

if (res.error) {
    console.error(res.error);
} else {
    console.log(res.stdout);
}
