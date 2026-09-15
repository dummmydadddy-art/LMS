<?php
// LMS Configuration TEMPLATE
// Copy this file to config.php and fill in the values.
// config.php is gitignored and must NEVER be committed.

// PRODUCTION: Disable error display (prevent stack trace leaks)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Load deployment variables
$APP_NAME = "LMS";
$APP_ENV = "production";

$SUPABASE_PROJECT_URL = getenv("SUPABASE_PROJECT_URL") ?: "https://YOUR_PROJECT.supabase.co";
$SUPABASE_URL = getenv("SUPABASE_URL") ?: "https://YOUR_PROJECT.supabase.co/rest/v1/";
$SUPABASE_ANON_KEY = getenv("SUPABASE_ANON_KEY") ?: "YOUR_ANON_KEY_HERE";

// Service-role key: MUST be set via environment variable. No hardcoded fallback.
$SUPABASE_SERVICE_ROLE_KEY = getenv("SUPABASE_SERVICE_ROLE_KEY") ?: '';

// Payment gateway variables
$PAYMENT_GATEWAY_KEY = getenv("PAYMENT_GATEWAY_KEY") ?: "";
$PAYMENT_GATEWAY_SECRET = getenv("PAYMENT_GATEWAY_SECRET") ?: "";

// Service-to-service API key (for n8n chatbot, external integrations)
// MUST be set via environment variable. No hardcoded fallback.
$SERVICE_API_KEY = getenv("LMS_SERVICE_API_KEY") ?: '';

// Gateway-to-worker trust token: workers reject requests without this header.
// MUST be set via environment variable. No hardcoded fallback.
$GATEWAY_TRUST_TOKEN = getenv("LMS_GATEWAY_TRUST_TOKEN") ?: '';

// CORS: Restrict to trusted frontend origin
$CORS_ORIGIN = getenv("CORS_ALLOWED_ORIGIN") ?: "http://localhost:5173";
header("Access-Control-Allow-Origin: " . $CORS_ORIGIN);
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, apikey");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS preflight request
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
