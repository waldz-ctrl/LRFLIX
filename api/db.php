<?php
// Secure session settings - MUST come before session_start()
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();

$host = 'localhost';
$db_user = 'bffvvmvztl_waldz'; // Updated user
$db_pass = '@Lgorithm23';   // Updated password
$db_name = 'bffvvmvztl_lrflixdb';

date_default_timezone_set('Asia/Manila');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("SET time_zone = '+08:00'");
}
catch (PDOException $e) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
}

// Ensure required tables exist (Auto-migration)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        resource_id INT,
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("ALTER TABLE downloads ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

    $pdo->exec("CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        suggestion TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS lr_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        resource_id INT,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(128) NOT NULL,
        user_id INT NULL,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("ALTER TABLE visits ADD COLUMN IF NOT EXISTS visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    $pdo->exec("ALTER TABLE visits ADD COLUMN IF NOT EXISTS session_id VARCHAR(128) NOT NULL");
    $pdo->exec("ALTER TABLE visits ADD COLUMN IF NOT EXISTS user_id INT NULL");

    // Ensure all biographical columns exist for users
    $cols_to_add = [
        'middle_name' => 'VARCHAR(100)',
        'major' => 'VARCHAR(100)',
        'years_in_service' => 'VARCHAR(50)',
        'age_range' => 'VARCHAR(50)',
        'subjects_taught' => 'TEXT',
        'grade_level' => 'TEXT',
        'user_role_type' => 'VARCHAR(50) DEFAULT "teacher"', // Important for mode-logic
        'deped_email' => 'VARCHAR(150)',
        'last_login' => 'TIMESTAMP NULL'
    ];

    foreach ($cols_to_add as $col => $type) {
        $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS $col $type");
    }

    // Ensure all resource columns exist for dynamic uploads
    $res_cols = [
        'curriculum' => 'VARCHAR(100)',
        'school_level' => 'VARCHAR(50)',
        'code' => 'VARCHAR(100)',
        'component' => 'VARCHAR(100)',
        'module_no' => 'VARCHAR(50)',
        'camp_type' => 'VARCHAR(100)',
        'material_type' => 'VARCHAR(100)',
        'key_stage' => 'VARCHAR(50)',
        'term' => 'VARCHAR(50)'
    ];
    
    foreach ($res_cols as $col => $type) {
        $pdo->exec("ALTER TABLE resources ADD COLUMN IF NOT EXISTS $col $type");
    }

    // New: Views tracking
    $pdo->exec("CREATE TABLE IF NOT EXISTS views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        resource_id INT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("ALTER TABLE resources ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0");


}
catch (Exception $e) {
// Silently continue
}

function isLoggedIn()
{
    return isset($_SESSION['user_id']);
}

function isAdmin()
{
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}
?>
