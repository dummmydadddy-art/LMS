<?php
// Vercel Serverless PHP Entrypoint
// Routes all /api/* requests to the existing backend router

// Change working directory so require_once paths resolve correctly
chdir(__DIR__ . '/../backend');

// The backend routes expect paths like /api/auth/check-user
// Override SCRIPT_NAME so the backend's basePath calculation yields '/'
$_SERVER['SCRIPT_NAME'] = '/index.php';

// Load the existing monolithic backend router
require __DIR__ . '/../backend/index.php';
