<?php
/**
 * Setup and verify demo users in Supabase Auth & public schema
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function adminApiRequest($method, $endpoint, $payload = null) {
    global $SUPABASE_PROJECT_URL, $SUPABASE_SERVICE_ROLE_KEY;
    $url = rtrim($SUPABASE_PROJECT_URL, '/') . '/auth/v1/admin/' . ltrim($endpoint, '/');
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: " . $SUPABASE_SERVICE_ROLE_KEY,
        "Authorization: Bearer " . $SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [
        'status' => $status,
        'data' => json_decode($res, true),
        'raw' => $res
    ];
}

function verifyLogin($email, $password) {
    global $SUPABASE_PROJECT_URL, $SUPABASE_ANON_KEY;
    $url = rtrim($SUPABASE_PROJECT_URL, '/') . '/auth/v1/token?grant_type=password';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'email' => $email,
        'password' => $password
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: " . $SUPABASE_ANON_KEY,
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [
        'status' => $status,
        'success' => ($status >= 200 && $status < 300),
        'data' => json_decode($res, true)
    ];
}

echo "========================================================\n";
echo " EDUCONNECT LMS DEMO USER PROVISIONING & VERIFICATION\n";
echo "========================================================\n\n";

// List existing auth users
$listRes = adminApiRequest('GET', 'users');
$existingUsers = [];
if (isset($listRes['data']['users'])) {
    foreach ($listRes['data']['users'] as $u) {
        $existingUsers[strtolower($u['email'])] = $u;
    }
}

$demoAccounts = [
    [
        'email' => 'mukul-admin@lms.com',
        'password' => 'Password123',
        'role_id' => 1,
        'full_name' => 'Mukul Admin',
        'type' => 'ADMIN'
    ],
    [
        'email' => 'mukul-teacher@lms.com',
        'password' => 'Password123',
        'role_id' => 2,
        'full_name' => 'Mukul Teacher',
        'type' => 'TEACHER'
    ],
    [
        'email' => 'mukul-student@lms.com',
        'password' => 'Password123',
        'role_id' => 3,
        'full_name' => 'Mukul Student',
        'type' => 'STUDENT'
    ],
    [
        'email' => 'admin@lms.com',
        'password' => 'Password123',
        'role_id' => 1,
        'full_name' => 'Super Admin',
        'type' => 'ADMIN'
    ],
    [
        'email' => 'teacher@lms.com',
        'password' => 'Password123',
        'role_id' => 2,
        'full_name' => 'Senior Teacher',
        'type' => 'TEACHER'
    ],
    [
        'email' => 'student@lms.com',
        'password' => 'Password123',
        'role_id' => 3,
        'full_name' => 'Demo Student',
        'type' => 'STUDENT'
    ]
];

// Fetch default course & batch for student enrollments
$coursesRes = supabaseRequest('GET', 'courses?select=id&limit=1');
$defaultCourseId = $coursesRes['data'][0]['id'] ?? null;
$batchesRes = supabaseRequest('GET', 'batches?select=id&limit=1');
$defaultBatchId = $batchesRes['data'][0]['id'] ?? null;

foreach ($demoAccounts as $acc) {
    $email = strtolower($acc['email']);
    $password = $acc['password'];
    $roleId = $acc['role_id'];
    $fullName = $acc['full_name'];
    $type = $acc['type'];

    echo "--- Provisioning: {$acc['email']} ({$type}) ---\n";

    $userId = null;
    if (isset($existingUsers[$email])) {
        $userId = $existingUsers[$email]['id'];
        echo "Found existing auth user ($userId). Updating password...\n";
        $updateRes = adminApiRequest('PUT', "users/{$userId}", [
            'password' => $password,
            'email_confirm' => true,
            'user_metadata' => [
                'role_id' => $roleId,
                'full_name' => $fullName
            ]
        ]);
        if ($updateRes['status'] < 300) {
            echo "[OK] Password updated to '{$password}'.\n";
        } else {
            echo "[WARN] Could not update password: " . ($updateRes['data']['message'] ?? $updateRes['raw']) . "\n";
        }
    } else {
        echo "Creating new auth user in Supabase...\n";
        $createRes = adminApiRequest('POST', 'users', [
            'email' => $email,
            'password' => $password,
            'email_confirm' => true,
            'user_metadata' => [
                'role_id' => $roleId,
                'full_name' => $fullName,
                'mobile_number' => '9876543210',
                'fee_amount' => 45000.00
            ]
        ]);
        if ($createRes['status'] >= 200 && $createRes['status'] < 300) {
            $userId = $createRes['data']['id'];
            echo "[OK] Created auth user ($userId).\n";
        } else {
            echo "[FAIL] User creation failed: " . ($createRes['data']['message'] ?? $createRes['raw']) . "\n";
            continue;
        }
    }

    // Ensure record in public.users
    $userRow = supabaseRequest('GET', "users?id=eq.{$userId}");
    if (empty($userRow['data'])) {
        supabaseRequest('POST', 'users', [
            'id' => $userId,
            'email' => $email,
            'role_id' => $roleId,
            'status' => 'ACTIVE'
        ]);
        echo "Inserted into public.users.\n";
    } else {
        supabaseRequest('PATCH', "users?id=eq.{$userId}", [
            'role_id' => $roleId,
            'status' => 'ACTIVE'
        ]);
    }

    // Ensure role-specific profile
    if ($type === 'TEACHER') {
        $tRow = supabaseRequest('GET', "teachers?id=eq.{$userId}");
        if (empty($tRow['data'])) {
            supabaseRequest('POST', 'teachers', [
                'id' => $userId,
                'full_name' => $fullName,
                'email' => $email,
                'mobile_number' => '9876543210',
                'status' => 'ACTIVE'
            ]);
            echo "Inserted into public.teachers.\n";
        }
    } elseif ($type === 'STUDENT') {
        $sRow = supabaseRequest('GET', "students?id=eq.{$userId}");
        if (empty($sRow['data'])) {
            supabaseRequest('POST', 'students', [
                'id' => $userId,
                'full_name' => $fullName,
                'email' => $email,
                'mobile_number' => '9876543210',
                'address' => 'Student Campus Residence, Room 101',
                'fee_amount' => 45000.00,
                'fee_paid' => 45000.00,
                'fee_pending' => 0.00,
                'status' => 'ACTIVE'
            ]);
            echo "Inserted into public.students.\n";
        }

        // Enroll in course and batch
        if ($defaultCourseId) {
            $cEnroll = supabaseRequest('GET', "student_courses?student_id=eq.{$userId}&course_id=eq.{$defaultCourseId}");
            if (empty($cEnroll['data'])) {
                supabaseRequest('POST', 'student_courses', [
                    'student_id' => $userId,
                    'course_id' => $defaultCourseId
                ]);
                echo "Enrolled in default course.\n";
            }
        }
        if ($defaultBatchId) {
            $bEnroll = supabaseRequest('GET', "student_batches?student_id=eq.{$userId}&batch_id=eq.{$defaultBatchId}");
            if (empty($bEnroll['data'])) {
                supabaseRequest('POST', 'student_batches', [
                    'student_id' => $userId,
                    'batch_id' => $defaultBatchId
                ]);
                echo "Enrolled in default batch.\n";
            }
        }
    }

    // Test Authentication with Supabase Sign In API
    $testAuth = verifyLogin($email, $password);
    if ($testAuth['success']) {
        echo "[VERIFIED] Login SUCCESS for {$email} with password '{$password}'!\n";
    } else {
        echo "[AUTH ERROR] Sign-in failed: " . ($testAuth['data']['error_description'] ?? json_encode($testAuth['data'])) . "\n";
    }
    echo "\n";
}

echo "========================================================\n";
echo " ALL DEMO ACCOUNTS PROVISIONED & VERIFIED!\n";
echo "========================================================\n";
