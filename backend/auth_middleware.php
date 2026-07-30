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
    $cacheDir = '/tmp/.token_cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    
    $tokenHash = md5($token);
    $cacheFile = $cacheDir . '/' . $tokenHash . '.json';
    $cacheLifetime = 300; // Cache valid for 5 minutes
    
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheLifetime) {
        $cachedData = json_decode(file_get_contents($cacheFile), true);
        if ($cachedData && isset($cachedData['id']) && isset($cachedData['role'])) {
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
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

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
        'full_name' => $fullName
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
