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
    elseif ($action === 'view') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $resId = (int)($_GET['id'] ?? 0);
        $userId = $_SESSION['user_id'];

        if($resId > 0) {
            // Log view
            $pdo->prepare("INSERT INTO views (user_id, resource_id) VALUES (?, ?)")->execute([$userId, $resId]);
            // Increment global view count
            $pdo->prepare("UPDATE resources SET views_count = views_count + 1 WHERE id = ?")->execute([$resId]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid ID']);
        }
        exit;
    }
    elseif ($action === 'related') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $resourceId = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT competencies, grade_level, learning_area FROM resources WHERE id = ?");
        $stmt->execute([$resourceId]);
        $current = $stmt->fetch();

        $related = [];
        if ($current) {
            $compList = array_filter(array_map('trim', explode(',', $current['competencies'] ?? '')));
            $grade = $current['grade_level'] ?? '';
            $subject = $current['learning_area'] ?? '';

            $conditions = [];
            $scoreParams = [];
            
            // Priority 1: Same competencies (Weight 2)
            $compScoreSql = "0";
            if (!empty($compList)) {
                $compConds = [];
                $scoreParts = [];
                foreach ($compList as $comp) {
                    $compConds[] = "FIND_IN_SET(?, competencies)";
                    $scoreParts[] = "CASE WHEN FIND_IN_SET(?, competencies) THEN 2 ELSE 0 END";
                    $scoreParams[] = $comp;
                }
                $conditions[] = "(" . implode(' OR ', $compConds) . ")";
                $compScoreSql = "(" . implode(' + ', $scoreParts) . ")";
            }

            // Priority 2: Same grade level & subject (Weight 1)
            $gradeScoreSql = "0";
            if (!empty($grade) && !empty($subject)) {
                $conditions[] = "(grade_level = ? AND learning_area = ?)";
                $gradeScoreSql = "CASE WHEN (grade_level = ? AND learning_area = ?) THEN 1 ELSE 0 END";
                $scoreParams[] = $grade;
                $scoreParams[] = $subject;
            }

            if (!empty($conditions)) {
                // Building params for the whole query
                // Order: user_liked_param, id_param, cond_params..., score_params...
                
                $condParams = [];
                foreach($compList as $comp) $condParams[] = $comp;
                if(!empty($grade)) { $condParams[] = $grade; $condParams[] = $subject; }

                $finalParams = array_merge([$_SESSION['user_id'], $resourceId], $condParams, $scoreParams);

                $sql = "SELECT r.*, 
                        (SELECT COUNT(*) FROM likes l WHERE l.resource_id = r.id AND l.user_id = ?) as user_liked 
                        FROM resources r 
                        WHERE id != ? AND (" . implode(' OR ', $conditions) . ") 
                        ORDER BY ($compScoreSql + $gradeScoreSql) DESC, created_at DESC 
                        LIMIT 15";

                $stmt = $pdo->prepare($sql);
                $stmt->execute($finalParams);
                $related = $stmt->fetchAll();
            }
        }
        echo json_encode(['success' => true, 'related' => $related]);
        exit;
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

    elseif ($action === 'unique_values') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }

        $getDistinct = function($col) use ($pdo) {
            $stmt = $pdo->prepare("SELECT DISTINCT `$col` FROM resources WHERE `$col` IS NOT NULL AND `$col` != '' AND `$col` != 'Select...' ORDER BY `$col` ASC");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        };

        echo json_encode(['success' => true, 'data' => [
            'categories' => $getDistinct('category'),
            'resource_types' => $getDistinct('resource_type'),
            'curriculums' => $getDistinct('curriculum'),
            'school_levels' => $getDistinct('school_level'),
            'grades' => $getDistinct('grade_level'),
            'subjects' => $getDistinct('learning_area')
        ]]);
        exit;
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
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
        $quarter = $_POST['quarter'] ?? null;
        $term = $_POST['term'] ?? null;
        $week = $_POST['week'] ?? null;
        $content_standards = $_POST['content_standards'] ?? '';
        $performance_standards = $_POST['performance_standards'] ?? '';
        $competencies = $_POST['competencies'] ?? '';
        $description = $_POST['description'] ?? '';
        $learning_area = $_POST['learning_area'] ?? '';
        $resource_type = $_POST['resource_type'] ?? '';
        $year_published = $_POST['year_published'] ?? '';

        $curriculum = $_POST['curriculum'] ?? '';
        $school_level = $_POST['school_level'] ?? '';
        $key_stage = $_POST['key_stage'] ?? '';
        $camp_type = $_POST['camp_type'] ?? '';
        $material_type = $_POST['material_type'] ?? '';
        $component = $_POST['component'] ?? '';
        $module_no = $_POST['module_no'] ?? '';
        $code = $_POST['code'] ?? '';

        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0777, true);

        if (isset($_FILES['file'])) {
            $fileInfo = pathinfo($_FILES['file']['name']);
            $tempPath = $_FILES['file']['tmp_name'];
            $fileHash = hash_file('sha256', $tempPath);

            // Duplicate Check
            $checkStmt = $pdo->prepare("SELECT title FROM resources WHERE file_hash = ? LIMIT 1");
            $checkStmt->execute([$fileHash]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                echo json_encode([
                    'success' => false, 
                    'message' => "Duplicate Detected: This exact file has already been uploaded as '" . $existing['title'] . "'."
                ]);
                exit;
            }

            $fileName = uniqid() . '.' . $fileInfo['extension'];
            $filePath = $uploadDir . $fileName;
            $dbFilePath = 'uploads/' . $fileName;

            move_uploaded_file($_FILES['file']['tmp_name'], $filePath);

            $stmt = $pdo->prepare("INSERT INTO resources (category, title, authors, language, grade_level, quarter, term, week, content_standards, performance_standards, competencies, description, learning_area, resource_type, year_published, curriculum, school_level, key_stage, camp_type, material_type, component, module_no, code, file_path, file_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$category, $title, $authors, $language, $grade_level, $quarter, $term, $week, $content_standards, $performance_standards, $competencies, $description, $learning_area, $resource_type, $year_published, $curriculum, $school_level, $key_stage, $camp_type, $material_type, $component, $module_no, $code, $dbFilePath, $fileHash]);
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
        $quarter = $_POST['quarter'] ?? null;
        $term = $_POST['term'] ?? null;
        $week = $_POST['week'] ?? null;
        $content_standards = $_POST['content_standards'] ?? '';
        $performance_standards = $_POST['performance_standards'] ?? '';
        $competencies = $_POST['competencies'] ?? '';
        $description = $_POST['description'] ?? '';
        $learning_area = $_POST['learning_area'] ?? '';
        $resource_type = $_POST['resource_type'] ?? '';
        $year_published = $_POST['year_published'] ?? '';

        $curriculum = $_POST['curriculum'] ?? '';
        $school_level = $_POST['school_level'] ?? '';
        $key_stage = $_POST['key_stage'] ?? '';
        $camp_type = $_POST['camp_type'] ?? '';
        $material_type = $_POST['material_type'] ?? '';
        $component = $_POST['component'] ?? '';
        $module_no = $_POST['module_no'] ?? '';
        $code = $_POST['code'] ?? '';

        $sql = "UPDATE resources SET category=?, title=?, authors=?, language=?, grade_level=?, quarter=?, term=?, week=?, content_standards=?, performance_standards=?, competencies=?, description=?, learning_area=?, resource_type=?, year_published=?, curriculum=?, school_level=?, key_stage=?, camp_type=?, material_type=?, component=?, module_no=?, code=? WHERE id=?";
        $params = [$category, $title, $authors, $language, $grade_level, $quarter, $term, $week, $content_standards, $performance_standards, $competencies, $description, $learning_area, $resource_type, $year_published, $curriculum, $school_level, $key_stage, $camp_type, $material_type, $component, $module_no, $code, $id];

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

            $sql = "UPDATE resources SET category=?, title=?, authors=?, language=?, grade_level=?, quarter=?, term=?, week=?, content_standards=?, performance_standards=?, competencies=?, description=?, learning_area=?, resource_type=?, year_published=?, curriculum=?, school_level=?, key_stage=?, camp_type=?, material_type=?, component=?, module_no=?, code=?, file_path=? WHERE id=?";
            $params = [$category, $title, $authors, $language, $grade_level, $quarter, $term, $week, $content_standards, $performance_standards, $competencies, $description, $learning_area, $resource_type, $year_published, $curriculum, $school_level, $key_stage, $camp_type, $material_type, $component, $module_no, $code, $dbFilePath, $id];
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
    elseif ($action === 'batch_delete') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $ids = $data['ids'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            echo json_encode(['success' => false, 'message' => 'No resources selected']);
            exit;
        }

        $placeholders = str_repeat('?,', count($ids) - 1) . '?';
        $stmt = $pdo->prepare("SELECT file_path FROM resources WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $files = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($files as $file) {
            if (!empty($file)) {
                @unlink('../' . $file);
            }
        }

        $stmt = $pdo->prepare("DELETE FROM resources WHERE id IN ($placeholders)");
        $stmt->execute($ids);

        echo json_encode(['success' => true, 'message' => count($ids) . ' resources deleted']);
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
    elseif ($action === 'related') {
        $id = (int)($_GET['id'] ?? 0);
        
        $stmt = $pdo->prepare("SELECT grade_level, learning_area, competencies, category FROM resources WHERE id = ?");
        $stmt->execute([$id]);
        $current = $stmt->fetch();
        
        if (!$current) {
            echo json_encode(['success' => false, 'message' => 'Resource not found']);
            exit;
        }

        $grade = $current['grade_level'];
        $area = $current['learning_area'];
        $comp = $current['competencies'];
        $cat = $current['category'];

        // Prioritize: Same Competency > Same Grade & Subject > Same Category
        // Fetch up to 10
        // Simplest approximation using ORDER BY logic:
        $sql = "
            SELECT *, 
            (CASE 
                WHEN competencies = ? THEN 3 
                WHEN grade_level = ? AND learning_area = ? THEN 2 
                WHEN category = ? THEN 1 
                ELSE 0 END) as relevance
            FROM resources 
            WHERE id != ?
            ORDER BY relevance DESC, created_at DESC 
            LIMIT 10
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$comp, $grade, $area, $cat, $id]);
        $related = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'related' => $related]);
    }
    elseif ($action === 'comment') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
        $resId = $_POST['resource_id'] ?? 0;
        $comment = $_POST['comment'] ?? '';
        $userId = $_SESSION['user_id'];
        
        if (empty($comment)) {
            echo json_encode(['success' => false, 'message' => 'Comment empty']);
            exit;
        }
        
        // Let's reuse the feedback table or create a specialized comment logging strategy
        // Feedback table accepts user_id and suggestion. I'll prepend "Comment on Resource $resId: "
        $suggestion = "Resource $resId Comment: " . $comment;
        $stmt = $pdo->prepare("INSERT INTO feedback (user_id, suggestion) VALUES (?, ?)");
        $stmt->execute([$userId, $suggestion]);
        echo json_encode(['success' => true]);
    }
    elseif ($action === 'delete_feedback') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM feedback WHERE id = ?");
        if ($stmt->execute([$id])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete']);
        }
        exit;
    }
    elseif ($action === 'delete_comment') {
        if (!isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Admin only']);
            exit;
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM lr_comments WHERE id = ?");
        if ($stmt->execute([$id])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete comment']);
        }
        exit;
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
    elseif ($action === 'package_download') {

        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        // Ensure package_id column exists (one-time migration)
        try {
            $pdo->exec("ALTER TABLE downloads ADD COLUMN IF NOT EXISTS package_id VARCHAR(36) NULL DEFAULT NULL");
        } catch (Exception $e) { /* already exists */ }

        $data    = json_decode(file_get_contents("php://input"), true);
        $userId  = $_SESSION['user_id'];
        $CAP     = 30;

        // Generate UUID for this package event
        $packageId = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0,0xffff), mt_rand(0,0xffff),
            mt_rand(0,0xffff),
            mt_rand(0,0x0fff)|0x4000,
            mt_rand(0,0x3fff)|0x8000,
            mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff)
        );

        // Resolve resources from IDs (frontend always sends IDs)
        $ids = array_map('intval', array_slice($data['ids'] ?? [], 0, $CAP));
        if (empty($ids)) {
            echo json_encode(['success' => false, 'message' => 'No resources selected']);
            exit;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT id, title, file_path FROM resources WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $resources = $stmt->fetchAll();

        if (empty($resources)) {
            echo json_encode(['success' => false, 'message' => 'No matching resources found']);
            exit;
        }

        // Log download count per LR (same logic as single download, just looped)
        $dlStmt    = $pdo->prepare("INSERT INTO downloads (user_id, resource_id, package_id) VALUES (?, ?, ?)");
        $countStmt = $pdo->prepare("UPDATE resources SET downloads_count = downloads_count + 1 WHERE id = ?");
        foreach ($resources as $res) {
            $dlStmt->execute([$userId, $res['id'], $packageId]);
            $countStmt->execute([$res['id']]);
        }

        // Build ZIP
        set_time_limit(300);
        if (!class_exists('ZipArchive')) {
            echo json_encode(['success' => false, 'message' => 'ZIP extension not available on this server']);
            exit;
        }

        $zip    = new ZipArchive();
        $tmpZip = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'lrflix_pkg_' . $packageId . '.zip';

        if ($zip->open($tmpZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            echo json_encode(['success' => false, 'message' => 'Could not create ZIP package']);
            exit;
        }

        $baseDir = dirname(__DIR__) . DIRECTORY_SEPARATOR;
        foreach ($resources as $res) {
            $filePath = $baseDir . str_replace('/', DIRECTORY_SEPARATOR, $res['file_path']);
            if (file_exists($filePath)) {
                $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $res['title']);
                $safe = preg_replace('/_+/', '_', $safe);
                $zip->addFile($filePath, $safe . '.pdf');
            }
        }
        $zip->close();

        // Build auto filename from hints passed by frontend
        $hints  = $data['filename_hints'] ?? [];
        $parts  = [];
        foreach (['category','grade_level','learning_area','resource_type','quarter'] as $key) {
            if (!empty($hints[$key])) {
                $parts[] = preg_replace('/[^a-zA-Z0-9]/', '_', $hints[$key]);
            }
        }
        if (empty($parts)) $parts[] = 'LRFLIX_Package';
        $parts[]     = date('Ymd');
        $zipFilename = preg_replace('/_+/', '_', implode('_', $parts)) . '.zip';

        // Stream ZIP to browser (overrides the application/json header set at top)
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
        header('Content-Length: ' . filesize($tmpZip));
        header('Pragma: no-cache');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        readfile($tmpZip);
        @unlink($tmpZip);
        exit;
    }
}
?>
