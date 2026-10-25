<?php
echo "Loaded extensions in FrankenPHP:\n";
$exts = get_loaded_extensions();
sort($exts);
echo implode(", ", $exts) . "\n\n";

echo "cURL: " . (extension_loaded('curl') ? "YES\n" : "NO\n");
echo "PDO SQLite: " . (extension_loaded('pdo_sqlite') ? "YES\n" : "NO\n");
echo "SQLite3: " . (extension_loaded('sqlite3') ? "YES\n" : "NO\n");
