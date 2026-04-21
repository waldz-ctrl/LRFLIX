<?php
$host = 'localhost';
$db_user = 'bffvvmvztl_waldz';
$db_pass = '@Lgorithm23';
$db_name = 'bffvvmvztl_lrflixdb';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $columns = [
        'curriculum' => "VARCHAR(100) DEFAULT ''",
        'school_level' => "VARCHAR(100) DEFAULT ''",
        'camp_type' => "VARCHAR(100) DEFAULT ''",
        'material_type' => "VARCHAR(100) DEFAULT ''",
        'component' => "VARCHAR(255) DEFAULT ''",
        'module_no' => "VARCHAR(100) DEFAULT ''",
        'code' => "VARCHAR(100) DEFAULT ''",
        'authors' => "TEXT",
        'language' => "VARCHAR(50) DEFAULT ''",
        'quarter' => "INT DEFAULT NULL",
        'week' => "INT DEFAULT NULL",
        'content_standards' => "TEXT",
        'performance_standards' => "TEXT",
        'competencies' => "TEXT",
        'description' => "TEXT",
        'learning_area' => "VARCHAR(100) DEFAULT ''",
        'resource_type' => "VARCHAR(100) DEFAULT ''",
        'year_published' => "VARCHAR(50) DEFAULT ''"
    ];

    foreach ($columns as $col => $definition) {
        $check = $pdo->query("SHOW COLUMNS FROM resources LIKE '$col'");
        if ($check->rowCount() == 0) {
            $pdo->exec("ALTER TABLE resources ADD COLUMN `$col` $definition");
            echo "Added column: $col\n";
        } else {
            echo "Column exists: $col\n";
        }
    }

    echo "Database schema update complete.";

} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}
?>
