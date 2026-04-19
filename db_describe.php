<?php
    $host = 'localhost';
    $db_user = 'bffvvmvztl_waldz';
    $db_pass = '@Lgorithm23';
    $db_name = 'bffvvmvztl_lrflixdb';

    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->query("DESCRIBE resources");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt2 = $pdo->query("DESCRIBE users");
        echo "\nUSERS:\n";
        echo json_encode($stmt2->fetchAll(PDO::FETCH_ASSOC));

    } catch (PDOException $e) {
        die("Err: " . $e->getMessage());
    }
?>
