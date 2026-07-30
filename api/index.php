<?php
// Vercel Serverless PHP Entrypoint
// Routes all /api/* requests to the existing backend router

// Enable error reporting for debugging (overrides config.php)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    // Verify backend directory exists
    $backendDir = __DIR__ . '/../backend';
    if (!is_dir($backendDir)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Backend directory not found',
            'looked_at' => $backendDir,
            'dir_contents' => scandir(__DIR__ . '/..')
        ]);
        exit;
    }

    // Change working directory so require_once paths resolve correctly
    chdir($backendDir);

    // The backend routes expect paths like /api/auth/check-user
    // Override SCRIPT_NAME so the backend's basePath calculation yields '/'
    $_SERVER['SCRIPT_NAME'] = '/index.php';

    // Load the existing monolithic backend router
    require $backendDir . '/index.php';
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
