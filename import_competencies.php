<?php
// import_competencies.php

// 1. CONFIGURATION: Details for the Learning Competencies Database
$hosting_db_host = 'localhost'; 
$hosting_db_user = 'bffvvmvztl_waldz';
$hosting_db_pass = '@Lgorithm23';
$hosting_db_name = 'bffvvmvztl_LC';

$csv_filename = 'LC DATABASE CSV.csv';

// Performance limits for the 5.2MB file
set_time_limit(1800); // 30 minutes
ini_set('memory_limit', '512M');

try {
    $dsn = "mysql:host=$hosting_db_host;dbname=$hosting_db_name;charset=utf8mb4";
    $pdo = new PDO($dsn, $hosting_db_user, $hosting_db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "<h3>Initializing Compentency Import for: $hosting_db_name</h3>";

    // Create table if it doesn't exist (using descriptive text types for mixed data)
    $pdo->exec("CREATE TABLE IF NOT EXISTS learning_competencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        curriculum VARCHAR(100),
        grade_level VARCHAR(100),
        subject VARCHAR(150),
        quarter_term VARCHAR(100),
        content_std TEXT,
        performance_std TEXT,
        melc TEXT,
        week VARCHAR(100),
        code VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    if (!file_exists($csv_filename)) {
        die("<div style='color:red;'>Error: $csv_filename not found in the root directory.</div>");
    }

    $handle = fopen($csv_filename, "r");
    fgetcsv($handle); // Skip header

    // Prepared statements for duplicate check and insertion
    $check_stmt = $pdo->prepare("SELECT id FROM learning_competencies 
        WHERE curriculum = ? AND subject = ? AND melc = ? AND grade_level = ? LIMIT 1");
    
    $insert_stmt = $pdo->prepare("INSERT INTO learning_competencies 
        (curriculum, grade_level, subject, quarter_term, content_std, performance_std, melc, week, code) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $new_rows = 0;
    $skipped_rows = 0;
    
    $pdo->beginTransaction();

    while (($row = fgetcsv($handle)) !== FALSE) {
        // Trim and handle empty columns
        $data = array_map(function($v) { return trim($v) === "" ? null : trim($v); }, $row);
        $data = array_pad($data, 9, null);

        // Check for duplicates before inserting (Strict additive logic)
        $check_params = [$data[0], $data[2], $data[6], $data[1]];
        if (in_array(null, $check_params, true)) {
           // If essential columns are null, we can't accurately check duplicates, so we proceed or check differently
           // For this script, we'll assume melc/subject are necessary.
        }

        $check_stmt->execute([$data[0], $data[2], $data[6], $data[1]]);
        
        if ($check_stmt->fetch()) {
            $skipped_rows++;
        } else {
            $insert_stmt->execute($data);
            $new_rows++;
        }

        // Periodic commit
        if (($new_rows + $skipped_rows) % 500 === 0) {
            $pdo->commit();
            $pdo->beginTransaction();
            echo "Processed " . ($new_rows + $skipped_rows) . " rows... (Added: $new_rows, Existing: $skipped_rows)<br>";
            flush();
        }
    }

    $pdo->commit();
    fclose($handle);

    echo "<div style='color:green; font-weight:bold; margin-top:20px; padding:20px; border:2px solid green; background:#f9fff9;'>";
    echo "✅ SUCCESSFUL IMPORT<br><hr>";
    echo "• Database: $hosting_db_name<br>";
    echo "• New Competencies added: $new_rows<br>";
    echo "• Existing rows skipped: $skipped_rows<br>";
    echo "• Total CSV rows analyzed: " . ($new_rows + $skipped_rows) . "</div>";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    echo "<div style='color:red; padding:20px; border:2px solid red;'>❌ ERROR: " . $e->getMessage() . "</div>";
}
?>
