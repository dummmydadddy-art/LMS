<?php
// Diagnostic script to check the Vercel PHP environment
header('Content-Type: application/json');

$diagnostics = [
    'php_version' => phpversion(),
    'extensions' => get_loaded_extensions(),
    'curl_available' => extension_loaded('curl'),
    'json_available' => extension_loaded('json'),
    'current_dir' => __DIR__,
    'parent_dir_exists' => is_dir(__DIR__ . '/..'),
    'parent_contents' => @scandir(__DIR__ . '/..') ?: 'FAILED',
    'backend_dir_exists' => is_dir(__DIR__ . '/../backend'),
    'backend_contents' => @scandir(__DIR__ . '/../backend') ?: 'NOT_FOUND',
    'server_vars' => [
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'not set',
        'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'not set',
        'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? 'not set',
    ],
    'env_service_key_set' => !empty(getenv('SUPABASE_SERVICE_ROLE_KEY')),
];

echo json_encode($diagnostics, JSON_PRETTY_PRINT);
