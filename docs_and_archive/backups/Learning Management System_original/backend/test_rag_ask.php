<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/rag_service.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "Testing RagService::ask...\n";
$res = RagService::ask("How does flexbox justify-content differ from align-items?");
echo json_encode($res, JSON_PRETTY_PRINT) . "\n";
