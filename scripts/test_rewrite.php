<?php
$payload = json_encode([
    'model' => 'llama3.2:latest',
    'stream' => false,
    'messages' => [
        [
            'role' => 'system',
            'content' => 'Rewrite the student question into a self-contained search query resolving all pronouns based on conversation history. Output ONLY the standalone search query without preamble or quotes.'
        ],
        [
            'role' => 'user',
            'content' => "History:\nStudent: What is a hash table?\nAssistant: A hash table is a data structure storing key-value pairs.\n\nLatest Question: What about its time complexity?"
        ]
    ],
    'options' => [
        'num_ctx' => 2048,
        'num_predict' => 40,
        'temperature' => 0.0
    ]
]);
$ch = curl_init('http://localhost:11434/api/chat');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$t0 = microtime(true);
$res = curl_exec($ch);
$ms = round((microtime(true) - $t0) * 1000, 1);
$data = json_decode($res, true);
echo "Rewritten query in {$ms}ms: " . trim($data['message']['content'] ?? '') . PHP_EOL;
