<?php
require_once 'api/db.php';
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $count = $stmt->fetchColumn();
    echo json_encode(['success' => true, 'message' => 'Database connection successful!', 'user_count' => $count]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
}
?>
