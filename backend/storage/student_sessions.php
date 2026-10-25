<?php
// EduConnect LMS - Student Conversational Session Store (R3)
// Stores recent conversation turns per student for multi-turn RAG memory

class StudentSessionStore {
    private static ?SQLite3 $db = null;

    private static function getDb(): SQLite3 {
        if (self::$db === null) {
            $dbPath = __DIR__ . '/student_sessions.sqlite';
            self::$db = new SQLite3($dbPath);
            self::$db->busyTimeout(5000);
            self::$db->exec("PRAGMA journal_mode=WAL;");
            self::$db->exec("
                CREATE TABLE IF NOT EXISTS conversation_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_student_created ON conversation_turns(student_id, created_at);
            ");
        }
        return self::$db;
    }

    public static function addMessage(string $studentId, string $role, string $message): void {
        if (trim($studentId) === '' || trim($message) === '') return;
        try {
            $db = self::getDb();
            $stmt = $db->prepare("INSERT INTO conversation_turns (student_id, role, message) VALUES (?, ?, ?)");
            $stmt->bindValue(1, $studentId, SQLITE3_TEXT);
            $stmt->bindValue(2, $role, SQLITE3_TEXT);
            $stmt->bindValue(3, $message, SQLITE3_TEXT);
            $stmt->execute();
        } catch (\Throwable $e) {
            error_log("[StudentSessionStore] Error adding message: " . $e->getMessage());
        }
    }

    public static function getRecentHistory(string $studentId, int $maxTurns = 3): array {
        if (trim($studentId) === '') return [];
        try {
            $db = self::getDb();
            // Each turn has user + assistant messages, so maxTurns * 2 messages
            $limit = $maxTurns * 2;
            $stmt = $db->prepare("
                SELECT role, message, created_at 
                FROM conversation_turns 
                WHERE student_id = ? 
                ORDER BY id DESC 
                LIMIT ?
            ");
            $stmt->bindValue(1, $studentId, SQLITE3_TEXT);
            $stmt->bindValue(2, $limit, SQLITE3_INTEGER);
            $res = $stmt->execute();
            $rows = [];
            while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
                $rows[] = [
                    'role' => $row['role'],
                    'content' => $row['message'],
                    'message' => $row['message'],
                    'created_at' => $row['created_at']
                ];
            }
            // Return in chronological order
            return array_reverse($rows);
        } catch (\Throwable $e) {
            error_log("[StudentSessionStore] Error getting history: " . $e->getMessage());
            return [];
        }
    }

    public static function clearSession(string $studentId): void {
        if (trim($studentId) === '') return;
        try {
            $db = self::getDb();
            $stmt = $db->prepare("DELETE FROM conversation_turns WHERE student_id = ?");
            $stmt->bindValue(1, $studentId, SQLITE3_TEXT);
            $stmt->execute();
        } catch (\Throwable $e) {
            error_log("[StudentSessionStore] Error clearing session: " . $e->getMessage());
        }
    }
}
