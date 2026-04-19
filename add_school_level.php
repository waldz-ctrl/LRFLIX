<?php
$hosting_db_host = 'localhost'; 
$hosting_db_user = 'bffvvmvztl_waldz';
$hosting_db_pass = '@Lgorithm23';
$hosting_db_name = 'bffvvmvztl_LC';

try {
    $dsn = "mysql:host=$hosting_db_host;dbname=$hosting_db_name;charset=utf8mb4";
    $pdo = new PDO($dsn, $hosting_db_user, $hosting_db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Check if column exists first
    $check = $pdo->query("SHOW COLUMNS FROM learning_competencies LIKE 'school_level'");
    if($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE learning_competencies ADD COLUMN school_level VARCHAR(50) AFTER curriculum");
        echo "Column 'school_level' added successfully!";
    } else {
        echo "Column 'school_level' already exists.";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
