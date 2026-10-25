<?php
// Simulating the index.php auth check for /api/rag/metrics

function testAuthCheck($mockUser) {
    // Exactly replicating lines 1262-1270 of backend/index.php
    $user = null; // simulate no X-Service-Key
    if (!$user) {
        $user = $mockUser; // result of verifyToken() for a STUDENT
    }
    if (!$user) {
        return "401 Unauthorized";
    }
    return "200 Allowed as role: " . ($user['role'] ?? 'unknown');
}

echo testAuthCheck(['id' => 'stud-123', 'role' => 'STUDENT']) . "\n";
echo testAuthCheck(['id' => 'teach-456', 'role' => 'TEACHER']) . "\n";
echo testAuthCheck(null) . "\n";
