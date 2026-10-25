<?php
// LMS Auth Middleware

require_once 'config.php';
require_once 'db.php';

function getBearerToken() {
    $headers = getallheaders();
    // Case-insensitive check for Authorization header
    $authHeader = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }

    if (!empty($authHeader)) {
        if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function verifyToken() {
    global $SUPABASE_ANON_KEY;

    $token = getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized: No token provided'
        ]);
        exit();
    }

    // --- TOKEN CACHE OPTIMIZATION ---
    $cacheDir = __DIR__ . '/.token_cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0700, true);
    }
    
    $tokenHash = hash('sha256', $token);
    $cacheFile = $cacheDir . '/' . $tokenHash . '.json';
    $cacheLifetime = 60; // Cache valid for 1 minute (reduced from 5 min for revocation safety)
    
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheLifetime) {
        $cachedData = json_decode(file_get_contents($cacheFile), true);
        if ($cachedData && isset($cachedData['id']) && isset($cachedData['role'])) {
            // P1-7: Ensure revoked/deactivated users cannot remain trusted during cache window
            $userId = $cachedData['id'];
            if (file_exists($cacheDir . '/revoked_' . $userId) || file_exists($cacheDir . '/revoked_all')) {
                @unlink($cacheFile);
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Unauthorized: Token has been revoked']);
                exit();
            }
            if (($cachedData['status'] ?? 'ACTIVE') === 'INACTIVE') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Forbidden: User account is inactive']);
                exit();
            }
            return $cachedData;
        }
    }

    // Call Supabase Auth endpoint to verify JWT
    global $SUPABASE_PROJECT_URL;
    $authUrl = rtrim($SUPABASE_PROJECT_URL, '/') . "/auth/v1/user";
    
    $ch = curl_init($authUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: " . $SUPABASE_ANON_KEY,
        "Authorization: Bearer " . $token
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    if (defined('CURLSSLOPT_NATIVE_CA')) {
        curl_setopt($ch, CURLOPT_SSL_OPTIONS, CURLSSLOPT_NATIVE_CA);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized: Invalid token',
            'detail' => json_decode($response, true) ?: $response
        ]);
        exit();
    }

    $authData = json_decode($response, true);
    if (!isset($authData['id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized: Invalid token payload'
        ]);
        exit();
    }

    $userId = $authData['id'];
    $email = $authData['email'];

    // Retrieve user's role from public.users table joined with roles
    $selectResult = supabaseSelect('users', 'role_id, status, roles(name)', ['id' => $userId], true);
    if (!$selectResult['success'] || empty($selectResult['data'])) {
        // Fallback: If user is not yet in public.users, they might be signing up or the trigger hasn't run.
        $roleId = 3;
        $roleName = 'STUDENT';
        $status = 'ACTIVE';

        if (isset($authData['user_metadata']['role_id'])) {
            $roleId = (int)$authData['user_metadata']['role_id'];
            $roleMap = [1 => 'SUPER_ADMIN', 2 => 'TEACHER', 3 => 'STUDENT'];
            $roleName = $roleMap[$roleId] ?? 'STUDENT';
        }
    } else {
        $userData = $selectResult['data'];
        $roleId = $userData['role_id'];
        $status = $userData['status'] ?? 'ACTIVE';
        $roleName = $userData['roles']['name'] ?? 'STUDENT';
    }

    if ($status === 'INACTIVE') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden: User account is inactive'
        ]);
        exit();
    }

    $fullName = $authData['user_metadata']['full_name'] ?? 'LMS User';

    $verifiedUser = [
        'id' => $userId,
        'email' => $email,
        'role_id' => $roleId,
        'role' => $roleName,
        'status' => $status,
        'full_name' => $fullName,
        'cached_at' => time()
    ];

    // Save to cache
    @file_put_contents($cacheFile, json_encode($verifiedUser));

    return $verifiedUser;
}

function requireRole($allowedRoles) {
    $user = verifyToken();
    if (!in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden: Insufficient permissions. Required: ' . implode(' or ', $allowedRoles)
        ]);
        exit();
    }
    return $user;
}

/**
 * Verify whether the incoming request came through the authoritative Gateway.
 * Compares X-Gateway-Trust request header with LMS_GATEWAY_TRUST_TOKEN.
 */
function verifyGatewayTrust(): bool {
    global $GATEWAY_TRUST_TOKEN;
    $configuredTrust = $GATEWAY_TRUST_TOKEN ?: (getenv('LMS_GATEWAY_TRUST_TOKEN') ?: '');
    if (empty($configuredTrust)) {
        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($remoteAddr === '127.0.0.1' || $remoteAddr === '::1' || empty($remoteAddr)) {
            return true;
        }
        return false;
    }

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $gatewayTrust = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-gateway-trust') {
            $gatewayTrust = $value;
            break;
        }
    }
    if ($gatewayTrust === null && isset($_SERVER['HTTP_X_GATEWAY_TRUST'])) {
        $gatewayTrust = $_SERVER['HTTP_X_GATEWAY_TRUST'];
    }

    if (empty($gatewayTrust)) {
        return false;
    }

    return hash_equals($configuredTrust, $gatewayTrust);
}

/**
 * Verify a service-to-service API key (for n8n, chatbot, external integrations).
 * The caller must send header: X-Service-Key: <key>
 * Returns a synthetic "service" user if valid, or null if no key / invalid key.
 */
function verifyServiceApiKey() {
    global $SERVICE_API_KEY;

    $effectiveKey = $SERVICE_API_KEY ?: (getenv('LMS_SERVICE_API_KEY') ?: 'lms-n8n-service-key-2026');
    if (empty($effectiveKey)) {
        return null; // Feature not configured
    }

    // Workers must not trust client-supplied X-Service-Key directly without Gateway trust
    if (!verifyGatewayTrust()) {
        return null;
    }

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $serviceKey = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-service-key') {
            $serviceKey = $value;
            break;
        }
    }
    if ($serviceKey === null && isset($_SERVER['HTTP_X_SERVICE_KEY'])) {
        $serviceKey = $_SERVER['HTTP_X_SERVICE_KEY'];
    }

    if (!$serviceKey || !hash_equals($effectiveKey, $serviceKey)) {
        return null;
    }

    // Return a synthetic admin-level user for service calls
    return [
        'id' => '4f8d3aaa-afba-499d-ab3a-19b3c9428f93',
        'email' => 'service@lms.internal',
        'role_id' => 1,
        'role' => 'SERVICE',
        'full_name' => 'n8n Service Account'
    ];
}

/**
 * Try service API key first, then fall back to JWT token verification.
 * Use this for routes that need to be accessible by both users and n8n.
 */
function verifyTokenOrApiKey() {
    $serviceUser = verifyServiceApiKey();
    if ($serviceUser !== null) {
        return $serviceUser;
    }
    return verifyToken();
}
