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

// Auto-migration for new schema
try { $pdo->exec("ALTER TABLE learning_competencies ADD COLUMN key_stage VARCHAR(50)"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE learning_competencies ADD COLUMN quarter VARCHAR(50)"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE learning_competencies ADD COLUMN term VARCHAR(50)"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE learning_competencies DROP COLUMN quarter_term"); } catch (Exception $e) {}

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    $search = $_GET['search'] ?? '';

    $grade = $_GET['grade'] ?? '';
    $subject = $_GET['subject'] ?? '';
    $quarter = $_GET['quarter'] ?? '';
    $term = $_GET['term'] ?? '';
    $week = $_GET['week'] ?? '';
    $curriculum = $_GET['curriculum'] ?? '';
    $school_level = $_GET['school_level'] ?? '';
    $key_stage = $_GET['key_stage'] ?? '';

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
        if (!empty($quarter)) { $query .= " AND quarter = ?"; $params[] = $quarter; }
        if (!empty($term)) { $query .= " AND term = ?"; $params[] = $term; }
        if (!empty($week)) { $query .= " AND week = ?"; $params[] = $week; }
        if (!empty($curriculum)) { $query .= " AND curriculum = ?"; $params[] = $curriculum; }
        if (!empty($school_level)) { $query .= " AND school_level = ?"; $params[] = $school_level; }
        if (!empty($key_stage)) { $query .= " AND key_stage = ?"; $params[] = $key_stage; }

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

if ($action === 'get_by_code') {
    $code = $_GET['code'] ?? '';
    if (empty($code)) {
        echo json_encode(['success' => false, 'message' => 'Code is required']);
        exit;
    }
    try {
        // Return ALL matches so the front-end can show a picker when duplicates exist
        $stmt = $pdo->prepare("SELECT * FROM learning_competencies WHERE code = ? ORDER BY id ASC");
        $stmt->execute([$code]);
        $rows = $stmt->fetchAll();
        if (count($rows) === 1) {
            echo json_encode(['success' => true, 'data' => $rows[0], 'multiple' => false]);
        } elseif (count($rows) > 1) {
            echo json_encode(['success' => true, 'data' => $rows, 'multiple' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No competency found for this code']);
        }
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

if ($action === 'unique_values') {
    $subject = $_GET['subject'] ?? '';
    $grade = $_GET['grade'] ?? '';
    $quarter = $_GET['quarter'] ?? '';
    $term = $_GET['term'] ?? '';
    $week = $_GET['week'] ?? '';
    $school_level = $_GET['school_level'] ?? '';
    $curriculum = $_GET['curriculum'] ?? '';
    $key_stage = $_GET['key_stage'] ?? '';

    try {
        $where = ["1=1"];
        $params = [];

        if (!empty($subject)) { $where[] = "subject = ?"; $params[] = $subject; }
        if (!empty($grade)) { $where[] = "grade_level = ?"; $params[] = $grade; }
        if (!empty($quarter)) { $where[] = "quarter = ?"; $params[] = $quarter; }
        if (!empty($term)) { $where[] = "term = ?"; $params[] = $term; }
        if (!empty($week)) { $where[] = "week = ?"; $params[] = $week; }
        if (!empty($school_level)) { $where[] = "school_level = ?"; $params[] = $school_level; }
        if (!empty($curriculum)) { $where[] = "curriculum = ?"; $params[] = $curriculum; }
        if (!empty($key_stage)) { $where[] = "key_stage = ?"; $params[] = $key_stage; }

        $whereClause = implode(" AND ", $where);

        $getDistinct = function($col) use ($pdo, $whereClause, $params) {
            $stmt = $pdo->prepare("SELECT DISTINCT `$col` FROM learning_competencies WHERE $whereClause AND `$col` IS NOT NULL AND `$col` != '' AND `$col` != '#N/A' AND `$col` != 'N/A' AND TRIM(`$col`) != '' ORDER BY `$col` ASC");
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if ($col === 'week' || $col === 'quarter' || $col === 'term' || $col === 'grade_level' || $col === 'key_stage') {
                usort($results, function($a, $b) {
                    $numA = (int) preg_replace('/\D/', '', $a);
                    $numB = (int) preg_replace('/\D/', '', $b);
                    if ($numA == 0 && $numB == 0) return strcmp($a, $b);
                    if ($numA == $numB) return strcmp($a, $b);
                    return $numA - $numB;
                });
            }
            return $results;
        };

        // Fetch competencies
        $competencies = [];
        if (!empty($subject) && !empty($grade) && (!empty($quarter) || !empty($term))) {
            // First try with the exact filters (which might include week)
            $stmt = $pdo->prepare("SELECT id, melc, content_std, performance_std, code, week FROM learning_competencies WHERE $whereClause ORDER BY melc ASC");
            $stmt->execute($params);
            $competencies = $stmt->fetchAll();

            // If a week was requested but returned no results, fallback to returning ALL competencies for that quarter/term
            if (empty($competencies) && !empty($week)) {
                $fallbackWhere = ["1=1"];
                $fallbackParams = [];
                if (!empty($subject))      { $fallbackWhere[] = "subject = ?";      $fallbackParams[] = $subject; }
                if (!empty($grade))        { $fallbackWhere[] = "grade_level = ?";  $fallbackParams[] = $grade; }
                if (!empty($quarter))      { $fallbackWhere[] = "quarter = ?";      $fallbackParams[] = $quarter; }
                if (!empty($term))         { $fallbackWhere[] = "term = ?";         $fallbackParams[] = $term; }
                if (!empty($school_level)) { $fallbackWhere[] = "school_level = ?"; $fallbackParams[] = $school_level; }
                if (!empty($curriculum))   { $fallbackWhere[] = "curriculum = ?";   $fallbackParams[] = $curriculum; }
                if (!empty($key_stage))    { $fallbackWhere[] = "key_stage = ?";    $fallbackParams[] = $key_stage; }
                
                $fallbackClause = implode(" AND ", $fallbackWhere);
                $fbStmt = $pdo->prepare("SELECT id, melc, content_std, performance_std, code, week FROM learning_competencies WHERE $fallbackClause ORDER BY melc ASC");
                $fbStmt->execute($fallbackParams);
                $competencies = $fbStmt->fetchAll();
            }
        }

        echo json_encode(['success' => true, 'data' => [
            'subjects' => $getDistinct('subject'),
            'grades' => $getDistinct('grade_level'),
            'quarters' => $getDistinct('quarter'),
            'terms' => $getDistinct('term'),
            'weeks' => $getDistinct('week'),
            'school_levels' => $getDistinct('school_level'),
            'curriculums' => $getDistinct('curriculum'),
            'key_stages' => $getDistinct('key_stage'),
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
            (curriculum, school_level, key_stage, grade_level, subject, quarter, term, content_std, performance_std, melc, week, code) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        while (($row = fgetcsv($handle)) !== FALSE) {
            $stmt->execute([
                $row[0] ?? null, // curriculum
                $row[1] ?? null, // school_level
                $row[2] ?? null, // key_stage
                $row[3] ?? null, // grade_level
                $row[4] ?? null, // subject
                $row[5] ?? null, // quarter
                $row[6] ?? null, // term
                $row[7] ?? null, // content_std
                $row[8] ?? null, // performance_std
                $row[9] ?? null, // melc
                $row[10] ?? null, // week
                $row[11] ?? null  // code
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
    $fields = ['curriculum', 'school_level', 'key_stage', 'grade_level', 'subject', 'quarter', 'term', 'content_std', 'performance_std', 'melc', 'week', 'code'];
    $vals = [];
    foreach ($fields as $f) $vals[] = $data[$f] ?? null;

    try {
        if ($action === 'edit' && $id > 0) {
            $vals[] = $id;
            $pdo->prepare("UPDATE learning_competencies SET curriculum=?, school_level=?, key_stage=?, grade_level=?, subject=?, quarter=?, term=?, content_std=?, performance_std=?, melc=?, week=?, code=? WHERE id=?")->execute($vals);
            echo json_encode(['success' => true, 'message' => 'Competency updated']);
        } else {
            $pdo->prepare("INSERT INTO learning_competencies (curriculum, school_level, key_stage, grade_level, subject, quarter, term, content_std, performance_std, melc, week, code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")->execute($vals);
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

