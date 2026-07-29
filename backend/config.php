<?php
// LMS Configuration

// Enable error reporting for development (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Load deployment variables
$APP_NAME = "LMS";
$APP_ENV = "production";

$SUPABASE_PROJECT_URL = "https://cjhfnaubbfqhwveuhslh.supabase.co"; // e.g. https://xxxxx.supabase.co
$SUPABASE_URL = "https://cjhfnaubbfqhwveuhslh.supabase.co/rest/v1/"; // e.g. https://xxxxx.supabase.co/rest/v1/
$SUPABASE_ANON_KEY = "sb_publishable_nKnJWB2nMK1c_EORxrhr_w_PPvsvPSJ";
$SUPABASE_SERVICE_ROLE_KEY = getenv("SUPABASE_SERVICE_ROLE_KEY") ?: "";

// Payment gateway variables
$PAYMENT_GATEWAY_KEY = "";
$PAYMENT_GATEWAY_SECRET = "";

// Helper headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, apikey");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
