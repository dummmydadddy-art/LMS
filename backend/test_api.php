<?php
// Cosmos Digital LMS - Basic Api Diagnostics
header("Content-Type: text/plain");
echo "Cosmos Digital LMS Backend Services: ACTIVE\n";
echo "PHP Version: " . phpversion() . "\n";

require_once 'db.php';

echo "\n--- Database Registry Diagnostics ---\n";
$res = supabaseSelect('roles', '*');
if ($res['success']) {
    echo "Supabase connection: SUCCESS\n";
    echo "Found Roles: " . count($res['data'] ?: []) . " entries.\n";
    foreach ($res['data'] ?: [] as $role) {
        echo "  - Role ID {$role['id']}: {$role['name']}\n";
    }
} else {
    echo "Supabase connection: FAIL\n";
    echo "Error message: " . $res['error'] . "\n";
}

echo "\n--- Users Profiles Registry Diagnostics ---\n";
$res_users = supabaseSelect('users', 'id, email, role_id, status, roles(name)');
if ($res_users['success']) {
    echo "Users Query: SUCCESS\n";
    foreach ($res_users['data'] ?: [] as $u) {
        $roleName = $u['roles']['name'] ?? 'N/A';
        echo "  - Email: {$u['email']}, Role: {$roleName} (Role ID: {$u['role_id']}), Status: {$u['status']}\n";
    }
} else {
    echo "Users Query: FAIL\n";
    echo "Error: " . $res_users['error'] . "\n";
}
