<?php
require_once 'db.php';
header('Content-Type: application/json');

if (!isAdmin()) {
    echo json_encode(['success' => false, 'message' => 'Admin only']);
    exit;
}

$period = $_GET['period'] ?? 'day';
$target_date = $_GET['date'] ?? null;

// Detect timestamp column
try {
    $cols = $pdo->query("SHOW COLUMNS FROM downloads LIKE 'downloaded_at'")->fetchAll();
    $tsCol = count($cols) > 0 ? 'downloaded_at' : 'created_at';
}
catch (Exception $e) {
    $tsCol = 'created_at';
}

$timeData = [];
$labels = [];
$dataset = [];
$label_text = "";

$now = new DateTime();

switch ($period) {
    case 'day':
        $label_text = $target_date ? "Daily Analytics ($target_date)" : "Daily Analytics (24 Hours)";
        // Generate all 24 hours
        for ($i = 0; $i < 24; $i++) {
            $h = str_pad($i, 2, '0', STR_PAD_LEFT) . ':00';
            $labels[] = $h;
            $dataset[$h] = 0;
        }
        $dateCond = $target_date ? "DATE($tsCol) = :target_date" : "DATE($tsCol) = CURDATE()";
        $sql = "SELECT DATE_FORMAT($tsCol, '%H:00') as label, COUNT(*) as total
                FROM downloads
                WHERE $dateCond
                GROUP BY label";
        break;

    case 'week':
        $label_text = "Weekly Analytics (Sun-Sat)";
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        foreach ($days as $d) {
            $labels[] = $d;
            $dataset[$d] = 0;
        }
        // Group by Day Name
        $sql = "SELECT DAYNAME($tsCol) as label, COUNT(*) as total
                FROM downloads
                WHERE $tsCol >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                GROUP BY label";
        break;

    case 'year':
        $label_text = "Yearly Analytics (Jan-Dec)";
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        foreach ($months as $m) {
            $labels[] = $m;
            $dataset[$m] = 0;
        }
        $sql = "SELECT DATE_FORMAT($tsCol, '%b') as label, COUNT(*) as total
                FROM downloads
                WHERE YEAR($tsCol) = YEAR(CURDATE())
                GROUP BY label";
        break;

    default: // month
        $label_text = "Monthly Analytics (1-31)";
        $daysInMonth = (int)$now->format('t');
        for ($i = 1; $i <= $daysInMonth; $i++) {
            $labels[] = (string)$i;
            $dataset[(string)$i] = 0;
        }
        $sql = "SELECT DAY($tsCol) as label, COUNT(*) as total
                FROM downloads
                WHERE MONTH($tsCol) = MONTH(CURDATE()) AND YEAR($tsCol) = YEAR(CURDATE())
                GROUP BY label";
        break;
}

// Execute and fill dataset
if ($period === 'day' && $target_date) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['target_date' => $target_date]);
} else {
    $stmt = $pdo->query($sql);
}

while ($row = $stmt->fetch()) {
    $dataset[(string)$row['label']] = (int)$row['total'];
}

// Format for JS
$finalTimeData = [];
foreach ($labels as $l) {
    $finalTimeData[] = ['period_label' => $l, 'total' => $dataset[$l]];
}

// Category and Summary data
$categoryData = $pdo->query("SELECT r.category, COUNT(d.id) as total FROM downloads d JOIN resources r ON r.id = d.resource_id GROUP BY r.category ORDER BY total DESC")->fetchAll();
$resourcesPerCategory = $pdo->query("SELECT category, COUNT(id) as total FROM resources GROUP BY category ORDER BY total DESC")->fetchAll();
$totalUsers = $pdo->query("SELECT COUNT(*) FROM users WHERE role != 'admin'")->fetchColumn();
$totalResources = $pdo->query("SELECT COUNT(*) FROM resources")->fetchColumn();
$totalDownloads = $pdo->query("SELECT SUM(downloads_count) FROM resources")->fetchColumn() ?? 0;
$totalLikes = $pdo->query("SELECT SUM(likes_count) FROM resources")->fetchColumn() ?? 0;

echo json_encode([
    'success' => true,
    'label' => $label_text,
    'time_data' => $finalTimeData,
    'category_data' => $categoryData,
    'resources_per_category' => $resourcesPerCategory,
    'top_resources' => $pdo->query("SELECT title, category, downloads_count, likes_count FROM resources ORDER BY downloads_count DESC LIMIT 5")->fetchAll(),
    'totals' => ['users' => $totalUsers, 'resources' => $totalResources, 'downloads' => $totalDownloads, 'likes' => $totalLikes]
]);
