<?php
/**
 * 使用者帳號認證 API (登入 / 註冊 / 登出 / 狀態檢查)
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

try {
    $db = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '資料庫連線失敗，請確認 XAMPP MySQL 服務已啟動：' . $e->getMessage()
    ]);
    exit;
}

// 取得 JSON 請求主體 (若以 application/json 送出)
$rawInput = file_get_contents('php://input');
$jsonBody = json_decode($rawInput, true) ?: [];

// 檢查目前登入狀態
if ($action === 'status') {
    if (!empty($_SESSION['user_id'])) {
        $userId = intval($_SESSION['user_id']);
        $stmt = $db->prepare("SELECT id, username, created_at, last_login FROM `users` WHERE id = ?");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        $user = $res->fetch_assoc();
        $stmt->close();

        if ($user) {
            echo json_encode([
                'success' => true,
                'loggedIn' => true,
                'user' => [
                    'id' => intval($user['id']),
                    'username' => $user['username'],
                    'created_at' => $user['created_at'],
                    'last_login' => $user['last_login']
                ]
            ]);
            exit;
        }
    }

    echo json_encode([
        'success' => true,
        'loggedIn' => false,
        'user' => null
    ]);
    exit;
}

// 使用者註冊
if ($action === 'register') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '請使用 POST 方法']);
        exit;
    }

    $username = trim($jsonBody['username'] ?? $_POST['username'] ?? '');
    $password = $jsonBody['password'] ?? $_POST['password'] ?? '';
    $confirmPassword = $jsonBody['confirm_password'] ?? $_POST['confirm_password'] ?? '';

    // 格式檢查
    if (mb_strlen($username) < 3 || mb_strlen($username) > 30) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '帳號長度需介於 3 至 30 個字元！']);
        exit;
    }

    if (!preg_match('/^[a-zA-Z0-9_\x{4e00}-\x{9fa5}]+$/u', $username)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '帳號僅支援中英文字母、數字與底線！']);
        exit;
    }

    if (strlen($password) < 4) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '密碼長度至少需 4 個字元！']);
        exit;
    }

    if ($password !== $confirmPassword) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '兩次輸入的密碼不一致！']);
        exit;
    }

    // 檢查帳號是否已存在
    $stmt = $db->prepare("SELECT id FROM `users` WHERE username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        $stmt->close();
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => '該帳號名稱已被註冊，請更換其他名稱！']);
        exit;
    }
    $stmt->close();

    // 密碼加密
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $now = date('Y-m-d H:i:s');

    $insertStmt = $db->prepare("INSERT INTO `users` (username, password_hash, created_at, last_login) VALUES (?, ?, ?, ?)");
    $insertStmt->bind_param('ssss', $username, $passwordHash, $now, $now);
    
    if (!$insertStmt->execute()) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '註冊失敗，資料庫寫入錯誤：' . $insertStmt->error]);
        exit;
    }

    $newUserId = $insertStmt->insert_id;
    $insertStmt->close();

    // 註冊後自動登入
    $_SESSION['user_id'] = $newUserId;
    $_SESSION['username'] = $username;

    echo json_encode([
        'success' => true,
        'message' => "🎉 恭喜 {$username} 註冊成功！已自動登入，全尺寸地圖已解鎖！",
        'user' => [
            'id' => $newUserId,
            'username' => $username
        ]
    ]);
    exit;
}

// 使用者登入
if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '請使用 POST 方法']);
        exit;
    }

    $username = trim($jsonBody['username'] ?? $_POST['username'] ?? '');
    $password = $jsonBody['password'] ?? $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '請輸入帳號與密碼！']);
        exit;
    }

    $stmt = $db->prepare("SELECT id, username, password_hash FROM `users` WHERE username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => '帳號或密碼錯誤，請重新確認！']);
        exit;
    }

    // 更新最後登入時間
    $now = date('Y-m-d H:i:s');
    $upStmt = $db->prepare("UPDATE `users` SET last_login = ? WHERE id = ?");
    $upStmt->bind_param('si', $now, $user['id']);
    $upStmt->execute();
    $upStmt->close();

    $_SESSION['user_id'] = intval($user['id']);
    $_SESSION['username'] = $user['username'];

    echo json_encode([
        'success' => true,
        'message' => "👋 歡迎回來，{$user['username']}！全尺寸迷宮規格已解鎖！",
        'user' => [
            'id' => intval($user['id']),
            'username' => $user['username']
        ]
    ]);
    exit;
}

// 使用者登出
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();

    echo json_encode([
        'success' => true,
        'message' => '🚪 您已成功登出，已切換回訪客模式 (限制 10×10 含以下規格)。'
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => '未知的操作 (支援 action: status, login, register, logout)']);
