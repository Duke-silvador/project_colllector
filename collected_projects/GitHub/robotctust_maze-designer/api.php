<?php
/**
 * 迷宮配置儲存與讀取 API (支援每位使用者獨立儲存最多 5 張地圖)
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

$dataFile = __DIR__ . '/data/maze_config.json';
const MAX_USER_MAPS = 5;

// 預設 10x10 迷宮配置
function getDefaultConfig() {
    $rows = 10;
    $cols = 10;

    $hWalls = [];
    for ($r = 0; $r <= $rows; $r++) {
        $hWalls[$r] = [];
        for ($c = 0; $c < $cols; $c++) {
            $hWalls[$r][$c] = ($r === 0 || $r === $rows) ? 1 : 0;
        }
    }

    $vWalls = [];
    for ($r = 0; $r < $rows; $r++) {
        $vWalls[$r] = [];
        for ($c = 0; $c <= $cols; $c++) {
            $vWalls[$r][$c] = ($c === 0 || $c === $cols) ? 1 : 0;
        }
    }

    $hWalls[2][1] = 1; $hWalls[2][2] = 1; $hWalls[2][3] = 1;
    $vWalls[3][4] = 1; $vWalls[4][4] = 1; $vWalls[5][4] = 1;
    $hWalls[6][6] = 1; $hWalls[6][7] = 1; $hWalls[6][8] = 1;

    return [
        'gridSize' => ['rows' => 10, 'cols' => 10],
        'cellSizeCm' => 30,
        'wallHeightCm' => 15,
        'start' => ['x' => 0, 'y' => 9],
        'goal' => ['x' => 9, 'y' => 0],
        'hWalls' => $hWalls,
        'vWalls' => $vWalls,
        'lastUpdated' => date('Y-m-d H:i:s')
    ];
}

// 驗證迷宮維度與陣列結構是否完整且合法
function isValidMazeData($data) {
    if (!isset($data['hWalls']) || !isset($data['vWalls']) || !is_array($data['hWalls']) || !is_array($data['vWalls'])) {
        return false;
    }
    $rows = isset($data['gridSize']['rows']) ? intval($data['gridSize']['rows']) : (count($data['hWalls']) - 1);
    $cols = isset($data['gridSize']['cols']) ? intval($data['gridSize']['cols']) : count($data['hWalls'][0]);
    if ($rows < 2 || $cols < 2 || $rows > 30 || $cols > 30) return false;
    if (count($data['hWalls']) !== ($rows + 1)) return false;
    if (count($data['vWalls']) !== $rows) return false;
    if (!isset($data['hWalls'][0]) || count($data['hWalls'][0]) !== $cols) return false;
    if (!isset($data['vWalls'][0]) || count($data['vWalls'][0]) !== ($cols + 1)) return false;
    return true;
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$isLoggedIn = !empty($_SESSION['user_id']);
$userId = $isLoggedIn ? intval($_SESSION['user_id']) : 0;

// ============================================================
// 1. 查詢使用者個人地圖庫清單 (最多 5 張)
// ============================================================
if ($action === 'list') {
    if (!$isLoggedIn) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'requireLogin' => true,
            'message' => '🔒 訪客限制：請先登入帳號以查看個人地圖庫！'
        ]);
        exit;
    }

    try {
        $db = getDbConnection();
        $stmt = $db->prepare("SELECT id, maze_name, grid_rows, grid_cols, created_at, updated_at FROM `user_mazes` WHERE user_id = ? ORDER BY updated_at DESC");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        $list = [];
        while ($row = $res->fetch_assoc()) {
            $list[] = [
                'id' => intval($row['id']),
                'name' => $row['maze_name'] ?: '未命名迷宮',
                'rows' => intval($row['grid_rows']),
                'cols' => intval($row['grid_cols']),
                'spec' => "{$row['grid_cols']}×{$row['grid_rows']}",
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
        }
        $stmt->close();

        echo json_encode([
            'success' => true,
            'list' => $list,
            'count' => count($list),
            'max' => MAX_USER_MAPS,
            'remaining' => max(0, MAX_USER_MAPS - count($list))
        ]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '查詢地圖庫失敗：' . $e->getMessage()]);
        exit;
    }
}

// ============================================================
// 2. 載入特定編號的地圖
// ============================================================
if ($action === 'load') {
    if (!$isLoggedIn) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'requireLogin' => true,
            'message' => '🔒 請先登入帳號以載入個人地圖！'
        ]);
        exit;
    }

    $mapId = intval($_GET['id'] ?? 0);
    if ($mapId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '請指定有效的地圖編號']);
        exit;
    }

    try {
        $db = getDbConnection();
        $stmt = $db->prepare("SELECT id, maze_name, grid_rows, grid_cols, maze_data, updated_at FROM `user_mazes` WHERE id = ? AND user_id = ? LIMIT 1");
        $stmt->bind_param('ii', $mapId, $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $userMaze = json_decode($row['maze_data'], true);
            $stmt->close();
            if ($userMaze && isValidMazeData($userMaze)) {
                echo json_encode([
                    'success' => true,
                    'id' => intval($row['id']),
                    'name' => $row['maze_name'],
                    'data' => $userMaze,
                    'updatedAt' => $row['updated_at']
                ]);
                exit;
            }
        }
        $stmt->close();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => '找不到指定的迷宮地圖或無存取權限']);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '載入失敗：' . $e->getMessage()]);
        exit;
    }
}

// ============================================================
// 3. 刪除特定地圖 (釋放儲存名額)
// ============================================================
if ($action === 'delete') {
    if (!$isLoggedIn) {
        http_response_code(401);
        echo json_encode(['success' => false, 'requireLogin' => true, 'message' => '請先登入帳號']);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    $mapId = intval($_GET['id'] ?? ($payload['id'] ?? 0));

    if ($mapId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '請指定有效的地圖編號']);
        exit;
    }

    try {
        $db = getDbConnection();
        $stmt = $db->prepare("DELETE FROM `user_mazes` WHERE id = ? AND user_id = ?");
        $stmt->bind_param('ii', $mapId, $userId);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected <= 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '找不到該地圖或已被刪除']);
            exit;
        }

        // 重新統計現存數量
        $cntStmt = $db->prepare("SELECT COUNT(*) AS c FROM `user_mazes` WHERE user_id = ?");
        $cntStmt->bind_param('i', $userId);
        $cntStmt->execute();
        $cnt = intval($cntStmt->get_result()->fetch_assoc()['c'] ?? 0);
        $cntStmt->close();

        echo json_encode([
            'success' => true,
            'message' => '🗑️ 地圖已成功刪除，已釋出儲存名額！',
            'count' => $cnt,
            'max' => MAX_USER_MAPS,
            'remaining' => max(0, MAX_USER_MAPS - $cnt)
        ]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '刪除失敗：' . $e->getMessage()]);
        exit;
    }
}

// ============================================================
// 4. GET 預設讀取 (頁面初始載入或重新載入最新地圖)
// ============================================================
if ($method === 'GET') {
    if ($isLoggedIn) {
        try {
            $db = getDbConnection();
            $stmt = $db->prepare("SELECT id, maze_name, maze_data FROM `user_mazes` WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1");
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($row = $res->fetch_assoc()) {
                $userMaze = json_decode($row['maze_data'], true);
                if ($userMaze && isValidMazeData($userMaze)) {
                    $stmt->close();

                    // 取得目前總數
                    $cntStmt = $db->prepare("SELECT COUNT(*) AS c FROM `user_mazes` WHERE user_id = ?");
                    $cntStmt->bind_param('i', $userId);
                    $cntStmt->execute();
                    $cnt = intval($cntStmt->get_result()->fetch_assoc()['c'] ?? 1);
                    $cntStmt->close();

                    echo json_encode([
                        'success' => true,
                        'id' => intval($row['id']),
                        'name' => $row['maze_name'],
                        'data' => $userMaze,
                        'count' => $cnt,
                        'max' => MAX_USER_MAPS,
                        'source' => 'database'
                    ]);
                    exit;
                }
            }
            $stmt->close();
        } catch (Exception $e) {
            // DB 失敗時降級讀取本地 JSON
        }
    }

    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        $data = json_decode($content, true);
        if ($data && isValidMazeData($data)) {
            if (!$isLoggedIn && (
                ($data['gridSize']['rows'] ?? 10) > 10 || 
                ($data['gridSize']['cols'] ?? 10) > 10
            )) {
                $default = getDefaultConfig();
                echo json_encode(['success' => true, 'data' => $default, 'source' => 'default_restricted']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $data, 'source' => 'file']);
            exit;
        }
    }

    $default = getDefaultConfig();
    @file_put_contents($dataFile, json_encode($default, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true, 'data' => $default, 'source' => 'default']);
    exit;
}

// ============================================================
// 5. POST 儲存迷宮 (每隻帳號上限 5 張，支援新增與覆蓋現有地圖)
// ============================================================
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!$payload || !isset($payload['hWalls']) || !isset($payload['vWalls'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '缺少必要的地圖數據 (hWalls 或 vWalls)']);
        exit;
    }

    // 檢查排位賽限制：排位賽官方地圖禁止儲存到資料庫
    if (!empty($payload['isRanked']) || !empty($payload['is_ranked']) || ($payload['mode'] ?? '') === 'ranked' || !empty($payload['mapId']) || (isset($payload['name']) && str_contains($payload['name'], '排位賽'))) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => '🔒 官方排位賽地圖禁止儲存至個人資料庫！請切換至【練習賽】進行迷宮規劃儲存。'
        ]);
        exit;
    }

    // 檢查未登入限制
    if (!$isLoggedIn) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'requireLogin' => true,
            'message' => '🔒 訪客限制：儲存迷宮設定至雲端資料庫僅限會員使用！請先登入或註冊會員帳號。'
        ]);
        exit;
    }

    $rows = isset($payload['gridSize']['rows']) ? intval($payload['gridSize']['rows']) : (count($payload['hWalls']) - 1);
    $cols = isset($payload['gridSize']['cols']) ? intval($payload['gridSize']['cols']) : count($payload['hWalls'][0]);

    if (!isValidMazeData($payload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '迷宮格線資料格式不完整或維度不符！']);
        exit;
    }

    $saveData = [
        'gridSize' => ['rows' => $rows, 'cols' => $cols],
        'cellSizeCm' => 30,
        'wallHeightCm' => 15,
        'start' => isset($payload['start']) ? $payload['start'] : ['x' => 0, 'y' => 9],
        'goal' => isset($payload['goal']) ? $payload['goal'] : ['x' => 9, 'y' => 0],
        'hWalls' => $payload['hWalls'],
        'vWalls' => $payload['vWalls'],
        'lastUpdated' => date('Y-m-d H:i:s')
    ];

    $mazeJson = json_encode($saveData, JSON_UNESCAPED_UNICODE);
    $customName = trim($payload['name'] ?? '');
    $targetMapId = intval($payload['targetMapId'] ?? ($payload['overwriteId'] ?? 0));

    try {
        $db = getDbConnection();

        // 檢查使用者當前已存地圖數量
        $cntStmt = $db->prepare("SELECT COUNT(*) AS c FROM `user_mazes` WHERE user_id = ?");
        $cntStmt->bind_param('i', $userId);
        $cntStmt->execute();
        $currentCount = intval($cntStmt->get_result()->fetch_assoc()['c'] ?? 0);
        $cntStmt->close();

        $savedMapId = 0;
        $isOverwrite = false;

        if ($targetMapId > 0) {
            // 模式 A：覆蓋指定現有地圖
            $chkOwner = $db->prepare("SELECT id, maze_name FROM `user_mazes` WHERE id = ? AND user_id = ? LIMIT 1");
            $chkOwner->bind_param('ii', $targetMapId, $userId);
            $chkOwner->execute();
            $existRow = $chkOwner->get_result()->fetch_assoc();
            $chkOwner->close();

            if (!$existRow) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => '欲覆蓋的地圖不存在或不屬於您的帳號！']);
                exit;
            }

            $finalName = !empty($customName) ? $customName : $existRow['maze_name'];
            $upStmt = $db->prepare("UPDATE `user_mazes` SET maze_name = ?, grid_rows = ?, grid_cols = ?, maze_data = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
            $upStmt->bind_param('siisii', $finalName, $rows, $cols, $mazeJson, $targetMapId, $userId);
            $upStmt->execute();
            $upStmt->close();

            $savedMapId = $targetMapId;
            $isOverwrite = true;
        } else {
            // 模式 B：存為全新地圖 (檢查 5 張地圖上限)
            if ($currentCount >= MAX_USER_MAPS) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'isFull' => true,
                    'message' => "🔒 每隻帳號最多儲存 " . MAX_USER_MAPS . " 張地圖！您已存滿 {$currentCount} 張，請選擇覆蓋現有地圖或刪除不需要的地圖。",
                    'count' => $currentCount,
                    'max' => MAX_USER_MAPS
                ]);
                exit;
            }

            $nextSlotNum = $currentCount + 1;
            $finalName = !empty($customName) ? $customName : "我的迷宮 #{$nextSlotNum} ({$cols}×{$rows})";

            $inStmt = $db->prepare("INSERT INTO `user_mazes` (user_id, maze_name, grid_rows, grid_cols, maze_data) VALUES (?, ?, ?, ?, ?)");
            $inStmt->bind_param('isiis', $userId, $finalName, $rows, $cols, $mazeJson);
            $inStmt->execute();
            $savedMapId = $inStmt->insert_id;
            $inStmt->close();

            $currentCount++;
        }

        // 同步寫入本機備份
        if (!is_dir(dirname($dataFile))) {
            @mkdir(dirname($dataFile), 0777, true);
        }
        @file_put_contents($dataFile, json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $actionText = $isOverwrite ? "覆蓋更新" : "新建儲存";
        $msg = "💾 迷宮【{$finalName}】已成功{$actionText}至個人雲端資料庫 (目前已存 {$currentCount}/" . MAX_USER_MAPS . " 張)！";

        echo json_encode([
            'success' => true,
            'message' => $msg,
            'mapId' => $savedMapId,
            'mapName' => $finalName,
            'count' => $currentCount,
            'max' => MAX_USER_MAPS,
            'remaining' => max(0, MAX_USER_MAPS - $currentCount),
            'isOverwrite' => $isOverwrite
        ]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '儲存至資料庫錯誤：' . $e->getMessage()]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => '不支援的請求方法']);
