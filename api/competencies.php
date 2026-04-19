<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Check secure session
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

if (!isAdmin()) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$hosting_db_host = 'localhost'; 
$hosting_db_user = 'bffvvmvztl_waldz';
$hosting_db_pass = '@Lgorithm23';
$hosting_db_name = 'bffvvmvztl_LC';

try {
    $dsn = "mysql:host=$hosting_db_host;dbname=$hosting_db_name;charset=utf8mb4";
    $pdo = new PDO($dsn, $hosting_db_user, $hosting_db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
}

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    $search = $_GET['search'] ?? '';

    $grade = $_GET['grade'] ?? '';
    $subject = $_GET['subject'] ?? '';
    $quarter = $_GET['quarter'] ?? '';
    $week = $_GET['week'] ?? '';

    try {
        $params = [];
        $query = "SELECT * FROM learning_competencies WHERE 1=1";
        
        if (!empty($search)) {
            $query .= " AND (melc LIKE ? OR code LIKE ? OR subject LIKE ? OR grade_level LIKE ?)";
            $searchParam = "%$search%";
            array_push($params, $searchParam, $searchParam, $searchParam, $searchParam);
        }
        if (!empty($grade)) { $query .= " AND grade_level = ?"; $params[] = $grade; }
        if (!empty($subject)) { $query .= " AND subject = ?"; $params[] = $subject; }
        if (!empty($quarter)) { $query .= " AND quarter_term = ?"; $params[] = $quarter; }
        if (!empty($week)) { $query .= " AND week = ?"; $params[] = $week; }

        $countQuery = str_replace("SELECT *", "SELECT COUNT(*) as total", $query);
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'] ?? 0;

        $query .= " ORDER BY id DESC LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $competencies = $stmt->fetchAll();

        echo json_encode([
            'success' => true, 
            'competencies' => $competencies, 
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

if ($action === 'unique_values') {
    $subject = $_GET['subject'] ?? '';
    $grade = $_GET['grade'] ?? '';
    $quarter = $_GET['quarter'] ?? '';
    $week = $_GET['week'] ?? '';
    $school_level = $_GET['school_level'] ?? '';

    try {
        $where = ["1=1"];
        $params = [];

        if (!empty($subject)) { $where[] = "subject = ?"; $params[] = $subject; }
        if (!empty($grade)) { $where[] = "grade_level = ?"; $params[] = $grade; }
        if (!empty($quarter)) { $where[] = "quarter_term = ?"; $params[] = $quarter; }
        if (!empty($week)) { $where[] = "week = ?"; $params[] = $week; }
        if (!empty($school_level)) { $where[] = "school_level = ?"; $params[] = $school_level; }

        $whereClause = implode(" AND ", $where);

        $getDistinct = function($col) use ($pdo, $whereClause, $params) {
            $stmt = $pdo->prepare("SELECT DISTINCT `$col` FROM learning_competencies WHERE $whereClause AND `$col` IS NOT NULL AND `$col` != '' ORDER BY `$col` ASC");
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        };

        $competencies = [];
        if (!empty($subject) && !empty($grade)) {
            $stmt = $pdo->prepare("SELECT id, melc, content_std, performance_std, code FROM learning_competencies WHERE $whereClause ORDER BY melc ASC");
            $stmt->execute($params);
            $competencies = $stmt->fetchAll();
        }

        echo json_encode(['success' => true, 'data' => [
            'subjects' => $getDistinct('subject'),
            'grades' => $getDistinct('grade_level'),
            'quarters' => $getDistinct('quarter_term'),
            'weeks' => $getDistinct('week'),
            'competencies' => $competencies
        ]]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

if ($action === 'import') {
    if (!isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        exit;
    }

    try {
        $handle = fopen($_FILES['file']['tmp_name'], "r");
        $header = fgetcsv($handle); // Read header row
        
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO learning_competencies 
            (curriculum, school_level, grade_level, subject, quarter_term, week, melc, content_std, performance_std, code) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        while (($row = fgetcsv($handle)) !== FALSE) {
            $stmt->execute([
                $row[0] ?? null, // curriculum
                $row[1] ?? null, // school_level
                $row[2] ?? null, // grade_level
                $row[3] ?? null, // subject
                $row[4] ?? null, // quarter_term
                $row[8] ?? null, // week
                $row[7] ?? null, // melc
                $row[5] ?? null, // content_std
                $row[6] ?? null, // performance_std
                $row[9] ?? null  // code
            ]);
        }
        
        $pdo->commit();
        fclose($handle);
        echo json_encode(['success' => true, 'message' => 'Import successful']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'truncate') {
    try {
        $pdo->exec("TRUNCATE TABLE learning_competencies");
        echo json_encode(['success' => true, 'message' => 'All competency data cleared']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'add' || $action === 'edit') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true) ?: $_POST;
    
    $id = (int)($data['id'] ?? 0);
    $fields = ['curriculum', 'school_level', 'grade_level', 'subject', 'quarter_term', 'content_std', 'performance_std', 'melc', 'week', 'code'];
    $vals = [];
    foreach ($fields as $f) $vals[] = $data[$f] ?? null;

    try {
        if ($action === 'edit' && $id > 0) {
            $vals[] = $id;
            $pdo->prepare("UPDATE learning_competencies SET curriculum=?, school_level=?, grade_level=?, subject=?, quarter_term=?, content_std=?, performance_std=?, melc=?, week=?, code=? WHERE id=?")->execute($vals);
            echo json_encode(['success' => true, 'message' => 'Competency updated']);
        } else {
            $pdo->prepare("INSERT INTO learning_competencies (curriculum, school_level, grade_level, subject, quarter_term, content_std, performance_std, melc, week, code) VALUES (?,?,?,?,?,?,?,?,?,?)")->execute($vals);
            echo json_encode(['success' => true, 'message' => 'Competency added']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? 0;
    if ($id > 0) {
        try {
            $pdo->prepare("DELETE FROM learning_competencies WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Competency deleted']);
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
    } else { echo json_encode(['success' => false, 'message' => 'Invalid ID']); }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
