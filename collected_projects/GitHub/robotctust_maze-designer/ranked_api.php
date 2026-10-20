<?php
/**
 * 排位賽 API (取得隨機官方地圖 / 提交成績 / 排行榜查詢)
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

$allowedSizes = [
    '10x10' => ['dim' => 10, 'limitMs' => 60 * 1000, 'desc' => '1 分鐘 (60秒)'],
    '15x15' => ['dim' => 15, 'limitMs' => 180 * 1000, 'desc' => '3 分鐘 (180秒)'],
    '20x20' => ['dim' => 20, 'limitMs' => 20 * 60 * 1000, 'desc' => '20 分鐘 (1200秒)'],
    '25x25' => ['dim' => 25, 'limitMs' => 30 * 60 * 1000, 'desc' => '30 分鐘 (1800秒)']
];

try {
    $db = getDbConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '資料庫連線失敗：' . $e->getMessage()]);
    exit;
}

// 1. 取得隨機排位賽地圖
if ($action === 'get_map') {
    $size = $_GET['size'] ?? '10x10';
    if (!isset($allowedSizes[$size])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '無效的排位賽規格，僅支援 10x10, 15x15, 20x20, 25x25']);
        exit;
    }

    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'requireLogin' => true,
            'message' => '🔒 排位賽需要登入帳號方可出戰與記錄天梯排名！'
        ]);
        exit;
    }

    $mapDir = __DIR__ . "/data/ranked_maps/{$size}";
    $mapFiles = glob("{$mapDir}/map_*.json");

    if (empty($mapFiles)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "找不到 {$size} 的官方排位賽地圖"]);
        exit;
    }

    // 隨機抽選一張地圖
    $chosenFile = $mapFiles[array_rand($mapFiles)];
    $mapContent = file_get_contents($chosenFile);
    $mapData = json_decode($mapContent, true);

    if (!$mapData) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '解析地圖資料失敗']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'size' => $size,
        'mapId' => $mapData['mapId'] ?? basename($chosenFile, '.json'),
        'mapName' => $mapData['name'] ?? "{$size} 官方排位賽地圖",
        'timeLimitMs' => $allowedSizes[$size]['limitMs'],
        'timeLimitDesc' => $allowedSizes[$size]['desc'],
        'mapData' => $mapData
    ]);
    exit;
}

// 2. 提交完賽成績
if ($action === 'submit_score') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '請使用 POST 方法']);
        exit;
    }

    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'requireLogin' => true, 'message' => '請先登入帳號！']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true) ?: [];

    $size = $payload['size'] ?? $payload['grid_size'] ?? '';
    $mapId = trim($payload['map_id'] ?? $payload['mapId'] ?? 'map_1');
    $timeUsedMs = intval($payload['time_used_ms'] ?? 0);
    $timeRemainMs = intval($payload['time_remain_ms'] ?? 0);

    if (!isset($allowedSizes[$size]) || $timeUsedMs <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '無效的成績資料']);
        exit;
    }

    $userId = intval($_SESSION['user_id']);

    // 檢查目前此用戶在該規格是否已有紀錄 (每個帳號只保留一筆個人最佳成績)
    $chkStmt = $db->prepare("SELECT id, time_used_ms, time_remain_ms FROM `rankings` WHERE user_id = ? AND grid_size = ? LIMIT 1");
    $chkStmt->bind_param('is', $userId, $size);
    $chkStmt->execute();
    $chkRes = $chkStmt->get_result();
    $existing = $chkRes->fetch_assoc();
    $chkStmt->close();

    $isBest = false;
    $recordId = null;
    $message = '';

    if ($existing) {
        $existingTime = intval($existing['time_used_ms']);
        if ($timeUsedMs < $existingTime) {
            // 打破歷史最佳紀錄！更新為全新最佳成績
            $upStmt = $db->prepare("UPDATE `rankings` SET map_id = ?, time_used_ms = ?, time_remain_ms = ?, created_at = NOW() WHERE id = ?");
            $upStmt->bind_param('siii', $mapId, $timeUsedMs, $timeRemainMs, $existing['id']);
            $upStmt->execute();
            $upStmt->close();

            $isBest = true;
            $recordId = intval($existing['id']);
            $bestTimeMs = $timeUsedMs;
            $diffSec = number_format(($existingTime - $timeUsedMs) / 1000, 2);
            $message = "🔥 太強了！成功刷新個人最佳紀錄（進步 {$diffSec} 秒）！已更新至天梯排行榜！";
        } else {
            // 未能打破歷史最佳紀錄，天梯榜保留原最佳成績，不重複覆蓋
            $isBest = false;
            $recordId = intval($existing['id']);
            $bestTimeMs = $existingTime;
            $diffSec = number_format(($timeUsedMs - $existingTime) / 1000, 2);
            $message = "完賽！本次耗時未超過您的歷史最佳紀錄 (+{$diffSec} 秒)，天梯排行榜保留您的最佳成績！";
        }
    } else {
        // 首次登錄該規格成績
        $inStmt = $db->prepare("INSERT INTO `rankings` (user_id, grid_size, map_id, time_used_ms, time_remain_ms, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $inStmt->bind_param('issii', $userId, $size, $mapId, $timeUsedMs, $timeRemainMs);
        if (!$inStmt->execute()) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '寫入成績失敗：' . $inStmt->error]);
            exit;
        }
        $recordId = $inStmt->insert_id;
        $inStmt->close();

        $isBest = true;
        $bestTimeMs = $timeUsedMs;
        $message = "🎉 恭喜！排位賽成績已成功登錄天梯排行榜！";
    }

    // 計算當前該使用者的個人最佳成績在全服中的即時天梯排名 (每位選手只佔一位，無重複帳號)
    $rankStmt = $db->prepare("SELECT COUNT(*) + 1 AS rank FROM `rankings` WHERE grid_size = ? AND time_used_ms < ?");
    $rankStmt->bind_param('si', $size, $bestTimeMs);
    $rankStmt->execute();
    $rankRes = $rankStmt->get_result();
    $rankRow = $rankRes->fetch_assoc();
    $currentRank = intval($rankRow['rank'] ?? 1);
    $rankStmt->close();

    // 取得該級別天梯總選手人數 (不重複人數)
    $totalStmt = $db->prepare("SELECT COUNT(*) AS total FROM `rankings` WHERE grid_size = ?");
    $totalStmt->bind_param('s', $size);
    $totalStmt->execute();
    $totalRes = $totalStmt->get_result();
    $totalRow = $totalRes->fetch_assoc();
    $totalPlayers = intval($totalRow['total'] ?? 1);
    $totalStmt->close();

    echo json_encode([
        'success' => true,
        'message' => $message,
        'rank' => $currentRank,
        'totalPlayers' => $totalPlayers,
        'isBest' => $isBest,
        'bestTimeMs' => $bestTimeMs,
        'thisTimeMs' => $timeUsedMs,
        'recordId' => $recordId
    ]);
    exit;
}

// 3. 查詢天梯排行榜 (每位選手僅保留個人最佳成績，不重複帳號)
if ($action === 'leaderboard') {
    $size = $_GET['size'] ?? '10x10';
    if (!isset($allowedSizes[$size])) {
        $size = '10x10';
    }

    $stmt = $db->prepare("
        SELECT r.id, r.user_id, u.username, r.grid_size, r.map_id, r.time_used_ms, r.time_remain_ms, r.created_at
        FROM `rankings` r
        JOIN `users` u ON r.user_id = u.id
        WHERE r.grid_size = ?
        ORDER BY r.time_used_ms ASC, r.created_at ASC
        LIMIT 50
    ");
    $stmt->bind_param('s', $size);
    $stmt->execute();
    $res = $stmt->get_result();

    $list = [];
    $rank = 1;
    while ($row = $res->fetch_assoc()) {
        $list[] = [
            'rank' => $rank++,
            'userId' => intval($row['user_id']),
            'username' => $row['username'],
            'gridSize' => $row['grid_size'],
            'mapId' => $row['map_id'],
            'timeUsedMs' => intval($row['time_used_ms']),
            'timeRemainMs' => intval($row['time_remain_ms']),
            'createdAt' => $row['created_at']
        ];
    }
    $stmt->close();

    // 若有登入，查詢該用戶的個人最佳成績與最高排名
    $userBest = null;
    if (!empty($_SESSION['user_id'])) {
        $userId = intval($_SESSION['user_id']);
        $uStmt = $db->prepare("SELECT time_used_ms, time_remain_ms, map_id, created_at FROM `rankings` WHERE user_id = ? AND grid_size = ? LIMIT 1");
        $uStmt->bind_param('is', $userId, $size);
        $uStmt->execute();
        $uRes = $uStmt->get_result();
        if ($uRow = $uRes->fetch_assoc()) {
            $bestMs = intval($uRow['time_used_ms']);
            $rStmt = $db->prepare("SELECT COUNT(*) + 1 AS user_rank FROM `rankings` WHERE grid_size = ? AND time_used_ms < ?");
            $rStmt->bind_param('si', $size, $bestMs);
            $rStmt->execute();
            $rRes = $rStmt->get_result();
            $rRow = $rRes->fetch_assoc();
            $rStmt->close();

            $userBest = [
                'bestMs' => $bestMs,
                'remainMs' => intval($uRow['time_remain_ms']),
                'rank' => intval($rRow['user_rank'] ?? 1),
                'mapId' => $uRow['map_id'],
                'createdAt' => $uRow['created_at']
            ];
        }
        $uStmt->close();
    }

    // 若有登入，統計該用戶發布至排位圖庫的地圖數量 (全部 / 本級別)
    $myMapCount = null;
    if (!empty($_SESSION['user_id'])) {
        $myMapCount = ['total' => 0, 'size' => 0];
        foreach (glob(__DIR__ . '/data/ranked_maps/*/map_*.json') as $f) {
            $m = json_decode(file_get_contents($f), true);
            if (intval($m['authorId'] ?? 0) === intval($_SESSION['user_id'])) {
                $myMapCount['total']++;
                if (basename(dirname($f)) === $size) $myMapCount['size']++;
            }
        }
    }

    echo json_encode([
        'success' => true,
        'size' => $size,
        'allowedSizes' => array_keys($allowedSizes),
        'list' => $list,
        'userBest' => $userBest,
        'myMapCount' => $myMapCount
    ]);
    exit;
}

// 4. 發布練習賽迷宮至官方排位賽圖庫
if ($action === 'publish_map') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '請使用 POST 方法']);
        exit;
    }

    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'requireLogin' => true, 'message' => '🔒 發布排位賽地圖需要登入帳號！請先登入。']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true) ?: [];

    $mapData = $payload['mapData'] ?? $payload;
    $rows = intval($mapData['gridSize']['rows'] ?? (isset($mapData['hWalls']) ? count($mapData['hWalls']) - 1 : 0));
    $cols = intval($mapData['gridSize']['cols'] ?? (isset($mapData['hWalls'][0]) ? count($mapData['hWalls'][0]) : 0));
    $size = "{$cols}x{$rows}";

    if (!isset($allowedSizes[$size])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "⚠️ 規格不符：官方排位賽僅支援 10×10、15×15、20×20、25×25 四種規格！目前為 {$size}。"
        ]);
        exit;
    }

    $hWalls = $mapData['hWalls'] ?? null;
    $vWalls = $mapData['vWalls'] ?? null;
    $start = $mapData['start'] ?? ['x' => 0, 'y' => $rows - 1];
    $goal = $mapData['goal'] ?? ['x' => $cols - 1, 'y' => 0];

    if (!$hWalls || !$vWalls) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '地圖資料格式不正確，缺少牆壁數據。']);
        exit;
    }

    // 後端嚴格執行 BFS 檢驗起點到終點的可解性
    $visited = array_fill(0, $rows, array_fill(0, $cols, false));
    $queue = [ ['x' => intval($start['x']), 'y' => intval($start['y'])] ];
    $visited[intval($start['y'])][intval($start['x'])] = true;
    $solvable = false;

    while (!empty($queue)) {
        $curr = array_shift($queue);
        if ($curr['x'] === intval($goal['x']) && $curr['y'] === intval($goal['y'])) {
            $solvable = true;
            break;
        }
        $cx = $curr['x'];
        $cy = $curr['y'];

        // 上 (y - 1)
        if ($cy > 0 && !$visited[$cy - 1][$cx] && empty($hWalls[$cy][$cx])) {
            $visited[$cy - 1][$cx] = true;
            $queue[] = ['x' => $cx, 'y' => $cy - 1];
        }
        // 下 (y + 1)
        if ($cy < $rows - 1 && !$visited[$cy + 1][$cx] && empty($hWalls[$cy + 1][$cx])) {
            $visited[$cy + 1][$cx] = true;
            $queue[] = ['x' => $cx, 'y' => $cy + 1];
        }
        // 左 (x - 1)
        if ($cx > 0 && !$visited[$cy][$cx - 1] && empty($vWalls[$cy][$cx])) {
            $visited[$cy][$cx - 1] = true;
            $queue[] = ['x' => $cx - 1, 'y' => $cy];
        }
        // 右 (x + 1)
        if ($cx < $cols - 1 && !$visited[$cy][$cx + 1] && empty($vWalls[$cy][$cx + 1])) {
            $visited[$cy][$cx + 1] = true;
            $queue[] = ['x' => $cx + 1, 'y' => $cy];
        }
    }

    if (!$solvable) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => '❌ 發布失敗：伺服器路徑運算檢驗此迷宮無法從起點到達終點！請修改內部牆壁確保有通行路徑。'
        ]);
        exit;
    }

    // 確定存放資料夾
    $mapDir = __DIR__ . "/data/ranked_maps/{$size}";
    if (!is_dir($mapDir)) {
        mkdir($mapDir, 0777, true);
    }

    // 計算下一個檔案編號
    $existingFiles = glob("{$mapDir}/map_*.json");
    $maxIndex = 0;
    foreach ($existingFiles as $f) {
        $base = basename($f, '.json');
        if (preg_match('/map_(\d+)/', $base, $matches)) {
            $num = intval($matches[1]);
            if ($num > $maxIndex) $maxIndex = $num;
        }
    }
    $nextIndex = $maxIndex + 1;
    $newMapId = "map_{$nextIndex}";

    $customName = trim($payload['name'] ?? '');
    $finalName = !empty($customName) 
        ? "{$size} 官方排位賽地圖 #{$nextIndex} ({$customName})" 
        : "{$size} 官方排位賽地圖 #{$nextIndex} (由 {$_SESSION['username']} 發布)";

    $fileData = [
        'mapId' => $newMapId,
        'name' => $finalName,
        'author' => $_SESSION['username'] ?? 'Anonymous',
        'authorId' => $_SESSION['user_id'] ?? null,
        'gridSize' => ['rows' => $rows, 'cols' => $cols],
        'cellSizeCm' => 30,
        'wallHeightCm' => 15,
        'start' => $start,
        'goal' => $goal,
        'hWalls' => $hWalls,
        'vWalls' => $vWalls,
        'createdAt' => date('Y-m-d H:i:s')
    ];

    $filePath = "{$mapDir}/{$newMapId}.json";
    $saved = file_put_contents($filePath, json_encode($fileData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if (!$saved) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '儲存地圖檔案至排位圖庫失敗，請確認檔案寫入權限。']);
        exit;
    }

    $totalMaps = count(glob("{$mapDir}/map_*.json"));

    echo json_encode([
        'success' => true,
        'message' => "🎉 成功發布！迷宮已正式加入 {$size} 官方排位賽地圖庫（地圖 #{$nextIndex}）！",
        'mapId' => $newMapId,
        'size' => $size,
        'totalMaps' => $totalMaps
    ]);
    exit;
}

// 5. 列出所有排位賽地圖 (供地圖總覽預覽)
if ($action === 'list_maps') {
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'requireLogin' => true, 'message' => '🔒 查看排位賽地圖總覽需要登入帳號！']);
        exit;
    }

    $maps = [];
    foreach (array_keys($allowedSizes) as $size) {
        $maps[$size] = [];
        $files = glob(__DIR__ . "/data/ranked_maps/{$size}/map_*.json");
        natsort($files);
        foreach ($files as $f) {
            $m = json_decode(file_get_contents($f), true);
            if ($m) $maps[$size][] = $m + ['mapId' => basename($f, '.json')];
        }
    }

    echo json_encode(['success' => true, 'maps' => $maps]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => '未知的操作 (支援 action: get_map, submit_score, leaderboard, publish_map, list_maps)']);

