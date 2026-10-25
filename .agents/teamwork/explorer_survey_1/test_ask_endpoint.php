<?php
$payload = json_encode([
    'question' => 'What is quantum physics?',
    'student_id' => 'test_student_abc'
]);

$ch = curl_init('http://127.0.0.1:8000/api/rag/ask');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Service-Key: lms-n8n-service-key-2026'
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $code\n";
$data = json_decode($res, true);
echo "Backend: " . ($data['backend'] ?? 'none') . "\n";
echo "Abstain: " . (isset($data['abstain']) ? ($data['abstain'] ? 'true' : 'false') : 'not set') . "\n";
echo "Answer:\n" . ($data['answer'] ?? 'none') . "\n";
