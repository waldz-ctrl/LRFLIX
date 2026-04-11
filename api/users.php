<?php
require_once 'db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if (!isAdmin()) {
    echo json_encode(['success' => false, 'message' => 'Admin only']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $pdo->query("SELECT u.id, u.username, u.role, u.last_name, u.first_name, u.middle_name, u.school, u.position, u.age_range as age, u.subjects_taught as subject, u.grade_level, u.created_at, u.last_login,
                            (SELECT COUNT(*) FROM downloads d WHERE d.user_id = u.id) as downloads_count,
                            (SELECT COUNT(*) FROM visits v WHERE v.user_id = u.id) as visits_count
                            FROM users u");
        $users = $stmt->fetchAll();
        echo json_encode(['success' => true, 'users' => $users]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'delete') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? 0;
        
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'User deleted']);
    }
}
?>
