<?php
require_once 'db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'check_username') {
        $data = json_decode(file_get_contents("php://input"), true);
        $username = $data['username'] ?? '';
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
        $stmt->execute([$username]);
        echo json_encode(['exists' => $stmt->fetchColumn() > 0]);
        exit;
    }
    elseif ($action === 'get_secret_question') {
        $data = json_decode(file_get_contents("php://input"), true);
        $username = $data['username'] ?? '';
        $stmt = $pdo->prepare("SELECT secret_question FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if ($user && !empty($user['secret_question'])) {
            echo json_encode(['success' => true, 'question' => $user['secret_question']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found or no secret question set.']);
        }
        exit;
    }
    elseif ($action === 'reset_password') {
        $data = json_decode(file_get_contents("php://input"), true);
        $username = $data['username'] ?? '';
        $answer = $data['answer'] ?? '';
        $new_password = $data['new_password'] ?? '';

        if (strlen($new_password) < 6) {
             echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
             exit;
        }

        $stmt = $pdo->prepare("SELECT id, secret_answer FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && strtolower(trim($user['secret_answer'])) === strtolower(trim($answer))) {
            $hash = password_hash($new_password, PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hash, $user['id']]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Incorrect secret answer.']);
        }
        exit;
    }
    elseif ($action === 'login') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $userData = $user;
            unset($userData['password']); // Safety
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['first_name'] = $user['first_name'];
            $_SESSION['role'] = $user['role'];
            // Update last login
            $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

            echo json_encode([
                'success' => true,
                'user' => $userData,
                'message' => 'Login successful'
            ]);

        }
        else {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }

    }
    elseif ($action === 'register') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        $last_name = $_POST['last_name'] ?? '';
        $first_name = $_POST['first_name'] ?? '';
        $middle_name = $_POST['middle_name'] ?? '';
        $position = $_POST['position'] ?? '';
        $school = $_POST['school'] ?? '';
        $major = $_POST['major'] ?? '';
        $years_in_service = $_POST['years_in_service'] ?? '';
        $age_range = $_POST['age_range'] ?? '';
        $subjects_taught = $_POST['subjects_taught'] ?? '';
        $grade_level = $_POST['grade_level'] ?? '';

        $user_role_type = $_POST['user_role_type'] ?? 'teacher';
        $deped_email = $_POST['deped_email'] ?? ($_POST['email'] ?? '');
        $secret_question = $_POST['secret_question'] ?? '';
        $secret_answer = $_POST['secret_answer'] ?? '';

        if (strlen($username) < 3 || strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Invalid username or password length']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        try {
            // First check if columns exist in runtime (graceful migration)
            $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            $hasDeped = in_array('deped_email', $cols);
            $hasRoleType = in_array('user_role_type', $cols);
            $hasSecret = in_array('secret_question', $cols);

            $sql = "INSERT INTO users (username, password, last_name, first_name, middle_name, position, school, major, years_in_service, age_range, subjects_taught, grade_level" . 
                ($hasDeped ? ", deped_email" : "") . 
                ($hasRoleType ? ", user_role_type" : "") . 
                ($hasSecret ? ", secret_question, secret_answer" : "") . 
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?" . 
                ($hasDeped ? ", ?" : "") . 
                ($hasRoleType ? ", ?" : "") . 
                ($hasSecret ? ", ?, ?" : "") . 
                ")";

            $params = [$username, $hash, $last_name, $first_name, $middle_name, $position, $school, $major, $years_in_service, $age_range, $subjects_taught, $grade_level];
            if ($hasDeped) $params[] = $deped_email;
            if ($hasRoleType) $params[] = $user_role_type;
            if ($hasSecret) {
                $params[] = $secret_question;
                $params[] = $secret_answer;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'message' => 'Registration successful']);
        }
        catch (PDOException $e) {
            error_log($e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
        }

    }
    elseif ($action === 'update_profile') {
        if (!isLoggedIn()) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }

        $userId = $_SESSION['user_id'];
        $password = $_POST['new_password'] ?? '';

        $fields = ['last_name', 'first_name', 'middle_name', 'position', 'school', 'major', 'years_in_service', 'age_range', 'subjects_taught', 'grade_level'];
        $updates = [];
        $params = [];

        foreach ($fields as $f) {
            if (isset($_POST[$f])) {
                $updates[] = "$f = ?";
                $params[] = $_POST[$f];
            }
        }

        if (!empty($password)) {
            if (strlen($password) < 6) {
                echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
                exit;
            }
            $updates[] = "password = ?";
            $params[] = password_hash($password, PASSWORD_BCRYPT);
        }

        if (empty($updates)) {
            echo json_encode(['success' => true, 'message' => 'No changes made']);
            exit;
        }

        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
        $params[] = $userId;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    }

}
elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'check') {
        if (isLoggedIn()) {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $userData = $stmt->fetch();
            unset($userData['password']);
            echo json_encode([
                'logged_in' => true,
                'user' => $userData
            ]);

        }
        else {
            echo json_encode(['logged_in' => false]);
        }

    }
    elseif ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
    }
}
?>
