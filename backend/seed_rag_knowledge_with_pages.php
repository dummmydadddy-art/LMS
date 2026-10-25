<?php
require_once __DIR__ . '/rag_page_tracker.php';

// Mock material data with page markers
$materials = [
    [
        'title' => 'React Hooks Tutorial',
        'content' => "<!-- PAGE:1 -->
# React Hooks - Introduction
React Hooks are functions that let you use state and other React features without writing a class.

<!-- PAGE:2 -->
## useState Hook
The useState hook returns a pair: the current state value and a function that lets you update it.
Example: const [count, setCount] = useState(0);

<!-- PAGE:3 -->
## useEffect Hook
useEffect lets you perform side effects in function components.
It is similar to componentDidMount and componentDidUpdate."
    ]
];

class MockRagService {
    public static function chunkText($text) {
        $chunks = preg_split("/\n\n+/", $text);
        return array_values(array_filter(array_map('trim', $chunks)));
    }
}

// In a real script we would insert into DB. Let's output logic and insert into sqlite.
$dbDir = __DIR__ . '/../database';
if (!is_dir($dbDir)) mkdir($dbDir, 0777, true);
$dbPath = $dbDir . '/rag_store.sqlite';
$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$db->exec("CREATE TABLE IF NOT EXISTS material_chunks (
    id TEXT PRIMARY KEY,
    material_id TEXT,
    course_id TEXT,
    batch_id TEXT,
    chunk_index INTEGER,
    title TEXT,
    content TEXT,
    metadata TEXT,
    embedding TEXT,
    page_start INTEGER,
    page_end INTEGER
)");

foreach ($materials as $idx => $material) {
    echo "Processing: {$material['title']}\n";
    
    // 1. Parse pages
    $pageTexts = RagPageTracker::parsePageMarkers($material['content']);
    
    // 2. Chunk text
    $cleanText = implode("\n\n", array_column($pageTexts, 'text'));
    $chunks = MockRagService::chunkText($cleanText);
    
    // 3. Map chunks to pages
    $pageMappings = RagPageTracker::mapChunksToPages($pageTexts, $chunks);
    
    // 4. Insert to DB
    foreach ($chunks as $chunkIdx => $chunkText) {
        if (empty(trim($chunkText))) continue;
        
        $metadata = [
            'title' => $material['title'],
            'chunk_index' => $chunkIdx,
            'total_chunks' => count($chunks)
        ];
        
        $pageInfo = $pageMappings[$chunkIdx] ?? [];
        $metadata = RagPageTracker::enrichMetadata($metadata, $pageInfo);
        
        $chunkId = "react_chunk_" . $chunkIdx;
        
        $stmt = $db->prepare("INSERT OR REPLACE INTO material_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata, page_start, page_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $chunkId,
            'mat_1',
            'course_1',
            'batch_1',
            $chunkIdx,
            $material['title'],
            $chunkText,
            json_encode($metadata),
            $metadata['page_start'] ?? null,
            $metadata['page_end'] ?? null
        ]);
        
        echo "Inserted chunk $chunkIdx mapped to " . ($metadata['page_citation'] ?? 'no pages') . "\n";
    }
}
echo "Seeding complete.\n";
