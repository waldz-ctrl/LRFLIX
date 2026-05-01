<?php
require_once 'db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'track_visit') {
    if (empty($_SESSION['visit_logged'])) {
        $sessionId = session_id();
        $userId = $_SESSION['user_id'] ?? null;
        $stmt = $pdo->prepare("INSERT INTO visits (session_id, user_id) VALUES (?, ?)");
        $stmt->execute([$sessionId, $userId]);
        $_SESSION['visit_logged'] = true;
    }

    echo json_encode(['success' => true]);
    exit;
}

if (!isAdmin()) {
    echo json_encode(['success' => false, 'message' => 'Admin only']);
    exit;
}

$period = $_GET['period'] ?? 'day';
$target_date = $_GET['date'] ?? null;

function buildPeriodDataset(PDO $pdo, string $table, string $column, string $period, ?string $target_date = null): array
{
    $now = new DateTime();
    $labels = [];
    $dataset = [];

    switch ($period) {
        case 'day':
            for ($i = 0; $i < 24; $i++) {
                $h = $i % 12;
                if ($h == 0) $h = 12;
                $ampm = $i < 12 ? 'AM' : 'PM';
                $label = "$h $ampm";
                $labels[] = $label;
                $dataset[$label] = 0;
            }
            $dateCond = $target_date ? "DATE($column) = :target_date" : "DATE($column) = CURDATE()";
            $sql = "SELECT DATE_FORMAT($column, '%H') as hour_val, COUNT(*) as total
                    FROM $table
                    WHERE $dateCond
                    GROUP BY hour_val";
            break;

        case 'week':
            $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            foreach ($days as $day) {
                $labels[] = $day;
                $dataset[$day] = 0;
            }
            $sql = "SELECT DAYNAME($column) as label, COUNT(*) as total
                    FROM $table
                    WHERE YEARWEEK($column, 0) = YEARWEEK(CURDATE(), 0)
                    GROUP BY label";
            break;

        case 'year':
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            foreach ($months as $month) {
                $labels[] = $month;
                $dataset[$month] = 0;
            }
            $sql = "SELECT DATE_FORMAT($column, '%b') as label, COUNT(*) as total
                    FROM $table
                    WHERE YEAR($column) = YEAR(CURDATE())
                    GROUP BY label";
            break;

        default:
            $daysInMonth = (int)$now->format('t');
            for ($i = 1; $i <= $daysInMonth; $i++) {
                $label = (string)$i;
                $labels[] = $label;
                $dataset[$label] = 0;
            }
            $sql = "SELECT DAY($column) as label, COUNT(*) as total
                    FROM $table
                    WHERE MONTH($column) = MONTH(CURDATE()) AND YEAR($column) = YEAR(CURDATE())
                    GROUP BY label";
            break;
    }

    if ($period === 'day' && $target_date) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['target_date' => $target_date]);
    } else {
        $stmt = $pdo->query($sql);
    }

    while ($row = $stmt->fetch()) {
        if ($period === 'day') {
            $h_int = (int)$row['hour_val'];
            $h_disp = $h_int % 12;
            if($h_disp == 0) $h_disp = 12;
            $h_ampm = $h_int < 12 ? 'AM' : 'PM';
            $dataset["$h_disp $h_ampm"] = (int)$row['total'];
        } else {
            // For week, month, year labels
            $label = $row['label'];
            if (isset($dataset[$label])) {
                $dataset[$label] = (int)$row['total'];
            }
        }
    }

    $result = [];
    foreach ($labels as $label) {
        $result[] = ['period_label' => $label, 'total' => $dataset[$label]];
    }

    return $result;
}

// Detect timestamp column
try {
    $cols = $pdo->query("SHOW COLUMNS FROM downloads LIKE 'downloaded_at'")->fetchAll();
    $downloadTsCol = count($cols) > 0 ? 'downloaded_at' : 'created_at';
}
catch (Exception $e) {
    $downloadTsCol = 'created_at';
}

$downloadTimeData = buildPeriodDataset($pdo, 'downloads', $downloadTsCol, $period, $target_date);
$visitTimeData = buildPeriodDataset($pdo, 'visits', 'visited_at', $period, $target_date);

$downloadCategoryWhere = '';
$downloadCategoryParams = [];
switch ($period) {
    case 'day':
        $downloadCategoryWhere = $target_date ? "WHERE DATE(d.$downloadTsCol) = :target_date" : "WHERE DATE(d.$downloadTsCol) = CURDATE()";
        if ($target_date) $downloadCategoryParams['target_date'] = $target_date;
        break;
    case 'week':
        $downloadCategoryWhere = "WHERE YEARWEEK(d.$downloadTsCol, 0) = YEARWEEK(CURDATE(), 0)";
        break;
    case 'month':
        $downloadCategoryWhere = "WHERE MONTH(d.$downloadTsCol) = MONTH(CURDATE()) AND YEAR(d.$downloadTsCol) = YEAR(CURDATE())";
        break;
    case 'year':
        $downloadCategoryWhere = "WHERE YEAR(d.$downloadTsCol) = YEAR(CURDATE())";
        break;
}
$categorySql = "SELECT r.category, r.resource_type, COUNT(d.id) as total
                FROM downloads d
                JOIN resources r ON r.id = d.resource_id
                $downloadCategoryWhere
                GROUP BY r.category, r.resource_type
                ORDER BY r.category, total DESC";
if (!empty($downloadCategoryParams)) {
    $categoryStmt = $pdo->prepare($categorySql);
    $categoryStmt->execute($downloadCategoryParams);
    $categoryData = $categoryStmt->fetchAll();
} else {
    $categoryData = $pdo->query($categorySql)->fetchAll();
}
$resourcesPerCategory = $pdo->query("SELECT category, resource_type, COUNT(id) as total FROM resources GROUP BY category, resource_type ORDER BY category, total DESC")->fetchAll();
$totalUsers = $pdo->query("SELECT COUNT(*) FROM users WHERE role != 'admin'")->fetchColumn();
$totalResources = $pdo->query("SELECT COUNT(*) FROM resources")->fetchColumn();
$totalDownloads = $pdo->query("SELECT SUM(downloads_count) FROM resources")->fetchColumn() ?? 0;
$totalLikes = $pdo->query("SELECT SUM(likes_count) FROM resources")->fetchColumn() ?? 0;
$totalVisits = $pdo->query("SELECT COUNT(*) FROM visits")->fetchColumn() ?? 0;

echo json_encode([
    'success' => true,
    'time_data' => $downloadTimeData,
    'visit_time_data' => $visitTimeData,
    'category_data' => $categoryData,
    'resources_per_category' => $resourcesPerCategory,
    'top_resources' => $pdo->query("SELECT title, category, downloads_count, likes_count FROM resources ORDER BY downloads_count DESC LIMIT 5")->fetchAll(),
    'totals' => [
        'users' => $totalUsers,
        'resources' => $totalResources,
        'downloads' => $totalDownloads,
        'likes' => $totalLikes,
        'visits' => $totalVisits,
        'views' => $pdo->query("SELECT SUM(views_count) FROM resources")->fetchColumn() ?? 0
    ]
]);
?>
