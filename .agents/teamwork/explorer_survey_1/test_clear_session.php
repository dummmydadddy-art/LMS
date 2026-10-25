<?php
require_once dirname(dirname(dirname(__DIR__))) . '/backend/storage/student_sessions.php';

echo "Before clear:\n";
print_r(StudentSessionStore::getRecentHistory('test_student_abc', 3));

StudentSessionStore::clearSession('test_student_abc');

echo "After clear:\n";
print_r(StudentSessionStore::getRecentHistory('test_student_abc', 3));
