<?php
// Cosmos Digital LMS Configuration

// Enable error reporting for development (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Load deployment variables
$APP_NAME = "Cosmos Digital LMS";
$APP_ENV = "production";

$SUPABASE_URL = "https://ljwjyxzkwxyxksfqsgzm.supabase.co/rest/v1/";
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqd2p5eHprd3h5eGtzZnFzZ3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTExOTcsImV4cCI6MjA5NzI4NzE5N30.XlziLN6kvAMbs4rO2hfxF-APVApP5ODCzIoqhRLII_Q";
$SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqd2p5eHprd3h5eGtzZnFzZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcxMTE5NywiZXhwIjoyMDk3Mjg3MTk3fQ.XqjIlbF3CTIR37fMpI_XrrfXDeMDoZ9BPWUmXWAaaqQ";

// Payment gateway variables
$PAYMENT_GATEWAY_KEY = "rzp_test_T5m6RkOj4IbunF";
$PAYMENT_GATEWAY_SECRET = "68niJL59oas2ddtwA3wqiPeC";

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
