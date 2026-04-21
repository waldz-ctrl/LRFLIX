<?php
    // Migration script to add file_hash column for duplicate detection
    $host = 'localhost';
    $db_user = 'bffvvmvztl_waldz';
    $db_pass = '@Lgorithm23';
    $db_name = 'bffvvmvztl_lrflixdb';

    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "Updating resources table...\n";
        
        // Add file_hash column if it doesn't exist
        $pdo->exec("ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64) DEFAULT NULL AFTER file_path");
        
        // Add index for performance
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_file_hash ON resources(file_hash)");
        
        echo "Migration successful. File hashing logic can now be implemented.\n";

    } catch (PDOException $e) {
        die("Migration failed: " . $e->getMessage());
    }
?>
