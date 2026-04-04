<?php
require_once 'db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list_comments') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }
        $stmt = $pdo->query("SELECT c.id, c.comment, c.created_at, u.first_name, u.last_name, u.school, r.title as resource_title 
                             FROM lr_comments c
                             JOIN users u ON c.user_id = u.id
                             JOIN resources r ON c.resource_id = r.id
                             ORDER BY c.created_at DESC");
        echo json_encode(['success' => true, 'comments' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'list') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $userId = $_SESSION['user_id'];
        $stmt = $pdo->prepare("SELECT r.*, 
            (SELECT COUNT(*) FROM likes l WHERE l.resource_id = r.id AND l.user_id = ?) as user_liked 
            FROM resources r ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $resources = $stmt->fetchAll();
        echo json_encode(['success' => true, 'resources' => $resources]);

    }
    elseif ($action === 'related') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $resourceId = $_GET['id'] ?? 0;
        $stmt = $pdo->prepare("SELECT competencies FROM resources WHERE id = ?");
        $stmt->execute([$resourceId]);
        $current = $stmt->fetch();

        $related = [];
        if ($current && !empty($current['competencies'])) {
            $compList = array_map('trim', explode(',', $current['competencies']));
            if (!empty($compList)) {
                $conditions = [];
                $params = [];
                foreach ($compList as $comp) {
                    $conditions[] = "FIND_IN_SET(?, competencies)";
                    $params[] = $comp;
                }

                $sql = "SELECT r.*, 
                        (SELECT COUNT(*) FROM likes l WHERE l.resource_id = r.id AND l.user_id = ?) as user_liked 
                        FROM resources r WHERE id != ? AND (" . implode(' OR ', $conditions) . ") LIMIT 5";

                array_unshift($params, $_SESSION['user_id']); // for user_liked count
                $params[] = $resourceId;

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $related = $stmt->fetchAll();
            }
        }
        echo json_encode(['success' => true, 'related' => $related]);
    }
    elseif ($action === 'user_history') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $type = $_GET['type'] ?? 'liked';
        $userId = $_SESSION['user_id'];

        if ($type === 'liked') {
            $stmt = $pdo->prepare("SELECT r.*, 1 as user_liked 
                                  FROM resources r 
                                  JOIN likes l ON l.resource_id = r.id 
                                  WHERE l.user_id = ? 
                                  ORDER BY l.created_at DESC");
            $stmt->execute([$userId]);
        }
        else {
            // Highly robust query for downloads history using JOIN
            $sql = "SELECT r.*, 
                    (SELECT COUNT(*) FROM likes l2 WHERE l2.resource_id = r.id AND l2.user_id = :u1) as user_liked,
                    dl.max_dl_at as latest_dl
                    FROM resources r 
                    JOIN (
                        SELECT resource_id, MAX(downloaded_at) as max_dl_at
                        FROM downloads
                        WHERE user_id = :u2
                        GROUP BY resource_id
                    ) dl ON dl.resource_id = r.id
                    ORDER BY latest_dl DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['u1' => $userId, 'u2' => $userId]);
        }




        $resources = $stmt->fetchAll();
        echo json_encode(['success' => true, 'resources' => $resources]);
    }

    elseif ($action === 'list_feedback') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }

        $sql = "SELECT f.*, u.first_name, u.last_name, u.school, u.position 
                FROM feedback f 
                LEFT JOIN users u ON f.user_id = u.id 
                ORDER BY f.created_at DESC";
        $feedbacks = $pdo->query($sql)->fetchAll();
        echo json_encode(['success' => true, 'feedbacks' => $feedbacks]);
    }

}
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'comment') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Not logged in']);
            exit;
        }
        $resource_id = $_POST['resource_id'] ?? 0;
        $comment = trim($_POST['comment'] ?? '');
        if(empty($comment)) {
            echo json_encode(['success' => false, 'message' => 'Comment empty']);
            exit;
        }
        $user_id = $_SESSION['user_id'];
        
        $stmt = $pdo->prepare("INSERT INTO lr_comments (user_id, resource_id, comment) VALUES (?, ?, ?)");
        if ($stmt->execute([$user_id, $resource_id, $comment])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Server error']);
        }
        exit;
    }

    if ($action === 'upload') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }

        $category = $_POST['category'] ?? '';
        $title = $_POST['title'] ?? '';
        $authors = $_POST['authors'] ?? '';
        $language = $_POST['language'] ?? '';
        $grade_level = $_POST['grade_level'] ?? '';
        $quarter = (int)$_POST['quarter'] ?? null;
        $week = (int)$_POST['week'] ?? null;
        $content_standards = $_POST['content_standards'] ?? '';
        $performance_standards = $_POST['performance_standards'] ?? '';
        $competencies = $_POST['competencies'] ?? '';
        $description = $_POST['description'] ?? '';
        $learning_area = $_POST['learning_area'] ?? '';
        $resource_type = $_POST['resource_type'] ?? '';
        $year_published = $_POST['year_published'] ?? '';

        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0777, true);

        if (isset($_FILES['file'])) {
            $fileInfo = pathinfo($_FILES['file']['name']);
            $fileName = uniqid() . '.' . $fileInfo['extension'];
            $filePath = $uploadDir . $fileName;
            $dbFilePath = 'uploads/' . $fileName;

            move_uploaded_file($_FILES['file']['tmp_name'], $filePath);

            $stmt = $pdo->prepare("INSERT INTO resources (category, title, authors, language, grade_level, quarter, week, content_standards, performance_standards, competencies, description, learning_area, resource_type, year_published, file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$category, $title, $authors, $language, $grade_level, $quarter, $week, $content_standards, $performance_standards, $competencies, $description, $learning_area, $resource_type, $year_published, $dbFilePath]);
            echo json_encode(['success' => true, 'message' => 'Upload successful']);
        }
        else {
            echo json_encode(['success' => false, 'message' => 'File missing']);
        }

    }
    elseif ($action === 'edit') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }

        $id = $_POST['id'] ?? 0;
        $category = $_POST['category'] ?? '';
        $title = $_POST['title'] ?? '';
        $authors = $_POST['authors'] ?? '';
        $language = $_POST['language'] ?? '';
        $grade_level = $_POST['grade_level'] ?? '';
        $quarter = (int)$_POST['quarter'] ?? null;
        $week = (int)$_POST['week'] ?? null;
        $content_standards = $_POST['content_standards'] ?? '';
        $performance_standards = $_POST['performance_standards'] ?? '';
        $competencies = $_POST['competencies'] ?? '';
        $description = $_POST['description'] ?? '';
        $learning_area = $_POST['learning_area'] ?? '';
        $resource_type = $_POST['resource_type'] ?? '';
        $year_published = $_POST['year_published'] ?? '';

        $sql = "UPDATE resources SET category=?, title=?, authors=?, language=?, grade_level=?, quarter=?, week=?, content_standards=?, performance_standards=?, competencies=?, description=?, learning_area=?, resource_type=?, year_published=? WHERE id=?";
        $params = [$category, $title, $authors, $language, $grade_level, $quarter, $week, $content_standards, $performance_standards, $competencies, $description, $learning_area, $resource_type, $year_published, $id];

        if (isset($_FILES['file']) && $_FILES['file']['size'] > 0) {
            $uploadDir = '../uploads/';
            if (!is_dir($uploadDir))
                mkdir($uploadDir, 0777, true);
            $fileInfo = pathinfo($_FILES['file']['name']);
            $fileName = uniqid() . '.' . $fileInfo['extension'];
            $filePath = $uploadDir . $fileName;
            $dbFilePath = 'uploads/' . $fileName;

            move_uploaded_file($_FILES['file']['tmp_name'], $filePath);

            // Delete old file if exists
            $stmt = $pdo->prepare("SELECT file_path FROM resources WHERE id = ?");
            $stmt->execute([$id]);
            $oldRes = $stmt->fetch();
            if ($oldRes && !empty($oldRes['file_path'])) {
                @unlink('../' . $oldRes['file_path']);
            }

            $sql = "UPDATE resources SET category=?, title=?, authors=?, language=?, grade_level=?, quarter=?, week=?, content_standards=?, performance_standards=?, competencies=?, description=?, learning_area=?, resource_type=?, year_published=?, file_path=? WHERE id=?";
            $params = [$category, $title, $authors, $language, $grade_level, $quarter, $week, $content_standards, $performance_standards, $competencies, $description, $learning_area, $resource_type, $year_published, $dbFilePath, $id];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'message' => 'Update successful']);

    }
    elseif ($action === 'delete') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? 0;

        $stmt = $pdo->prepare("SELECT * FROM resources WHERE id = ?");
        $stmt->execute([$id]);
        $res = $stmt->fetch();

        if ($res) {
            @unlink('../' . $res['file_path']);
            $stmt = $pdo->prepare("DELETE FROM resources WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Deleted']);
        }
        else {
            echo json_encode(['success' => false, 'message' => 'Not found']);
        }

    }
    elseif ($action === 'like') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $resId = $data['id'] ?? 0;
        $userId = $_SESSION['user_id'];

        $stmt = $pdo->prepare("SELECT * FROM likes WHERE user_id = ? AND resource_id = ?");
        $stmt->execute([$userId, $resId]);
        if ($stmt->fetch()) {
            // Unlike
            $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND resource_id = ?")->execute([$userId, $resId]);
            $pdo->prepare("UPDATE resources SET likes_count = likes_count - 1 WHERE id = ?")->execute([$resId]);
            echo json_encode(['success' => true, 'liked' => false]);
        }
        else {
            // Like
            $pdo->prepare("INSERT INTO likes (user_id, resource_id) VALUES (?, ?)")->execute([$userId, $resId]);
            $pdo->prepare("UPDATE resources SET likes_count = likes_count + 1 WHERE id = ?")->execute([$resId]);
            echo json_encode(['success' => true, 'liked' => true]);
        }

    }
    elseif ($action === 'feedback') {

        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $suggestion = $data['suggestion'] ?? '';
        $userId = $_SESSION['user_id'];

        if (empty($suggestion)) {
            echo json_encode(['success' => false, 'message' => 'Suggestion cannot be empty']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO feedback (user_id, suggestion) VALUES (?, ?)");
        $stmt->execute([$userId, $suggestion]);
        echo json_encode(['success' => true, 'message' => 'Thank you for your feedback!']);

    }
    elseif ($action === 'download') {

        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $resId = $data['id'] ?? 0;
        $userId = $_SESSION['user_id'];

        // Log download
        $pdo->prepare("INSERT INTO downloads (user_id, resource_id) VALUES (?, ?)")->execute([$userId, $resId]);
        // Increment global download count
        $pdo->prepare("UPDATE resources SET downloads_count = downloads_count + 1 WHERE id = ?")->execute([$resId]);

        $stmt = $pdo->prepare("SELECT file_path FROM resources WHERE id = ?");
        $stmt->execute([$resId]);
        $fp = $stmt->fetchColumn();

        // Build an absolute URL so the frontend can use it as a direct href
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        // Determine base path (directory of this api/ folder, go up one level)
        $scriptDir = dirname(dirname($_SERVER['SCRIPT_NAME'])); // e.g. /lrflix
        $fileUrl = $protocol . '://' . $host . rtrim($scriptDir, '/') . '/' . $fp;

        echo json_encode(['success' => true, 'file' => $fileUrl]);
    }
}
?>
