<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>10×10 3D 迷宮模擬與自訂牆壁規劃器</title>
    <link rel="stylesheet" href="assets/css/style.css?v=<?= time() ?>">
</head>
<body>

    <!-- 頂部標題與規格導航列 -->
    <header>
        <div class="header-title-box">
            <div class="logo-text">
                <span>🧭</span> <span id="headerTitleText">3D 迷宮模擬與自訂規格牆壁規劃系統</span>
            </div>
            <div class="specs-tags">
                <span class="tag highlight" id="headerTagGrid">規格：10×10 格</span>
                <span class="tag" id="headerTagCell">每格：30×30 cm</span>
                <span class="tag" id="headerTagWall">牆高：15 cm</span>
                <span class="tag" id="headerTagTotal">總長寬：300×300 cm</span>
            </div>
        </div>
        <div class="header-actions">
            <!-- 賽事模式切換 (練習賽 / 排位賽) -->
            <div class="game-mode-switch" id="gameModeSwitch">
                <button class="mode-tab-btn active" id="btnModePractice" title="自由練習賽：自由規劃增刪牆壁、無限制探索">
                    <span>🛠️</span> 練習賽
                </button>
                <button class="mode-tab-btn ranked-mode" id="btnModeRanked" title="官方排位賽：遮蔽2D地圖、統一官方地圖、倒數挑戰天梯排名！">
                    <span>🏆</span> 排位賽
                </button>
            </div>

            <button class="tool-btn btn-leaderboard" id="btnOpenLeaderboard" title="查看全服排位賽天梯排行榜">
                <span>🏆</span> 排行榜
            </button>

            <!-- 帳號管理與權限狀態 -->
            <div class="user-auth-bar" id="userAuthBar">
                <span class="auth-status-badge guest" id="authBadge">
                    <span class="badge-icon">👤</span>
                    <span class="badge-text" id="authBadgeText">訪客模式 (限 10×10)</span>
                </span>
                <button class="tool-btn btn-auth-action" id="btnOpenAuthModal" title="登入或註冊以解鎖 11×11 至 30×30 大型地圖">
                    <span>🔑</span> 登入 / 註冊
                </button>
                <button class="tool-btn btn-auth-logout" id="btnLogout" style="display: none;" title="登出目前帳號">
                    <span>🚪</span> 登出
                </button>
            </div>

            <span class="ranked-no-save-pill" id="rankedNoSavePill" style="display: none;" title="排位賽採用官方統一地圖盲測競技，禁止覆蓋或存入個人資料庫">
                <span>🔒</span> 官方排位賽地圖（禁止儲存至資料庫）
            </span>
            <button class="tool-btn btn-save" id="btnSave" title="將目前迷宮儲存至您的個人雲端資料庫 (最多 5 張)">
                <span>💾</span> 儲存迷宮設定 (PHP)
            </button>
            <button class="tool-btn btn-action" id="btnMapLibrary" title="開啟我的迷宮圖庫 (管理與載入已存地圖，最多 5 張)">
                <span>📁</span> 我的地圖庫 <span class="map-count-pill" id="headerMapCountBadge">(0/5)</span>
            </button>
        </div>
    </header>

    <!-- 主操作區域：左側 2D 編輯器，右側 3D 模擬視窗 -->
    <div class="app-container">
        
        <!-- 左側：2D 迷宮規劃編輯器 -->
        <section class="editor-panel">
            <div class="panel-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="panel-title">✏️ 2D 迷宮規劃</div>
                    <button class="map-size-toggle-btn" id="btnToggleMapSize" title="切換 2D 版面大小（一半版面設計 ↔ 遙控模式）">
                        <span id="mapSizeIcon">🌓</span> <span id="mapSizeText">一半版面設計</span>
                    </button>
                </div>
                <div id="toolTip" style="font-size: 0.8rem; color: #38bdf8;">目前工具：點擊格線增刪牆壁</div>
            </div>

            <!-- 練習賽：迷宮規格調整列 (自訂格數) -->
            <div class="grid-spec-bar" id="practiceSpecBar">
                <div class="spec-inputs-row">
                    <span class="spec-title">📐 迷宮規格：</span>
                    <div class="spec-input-item">
                        <label for="inputCols">寬 (X)：</label>
                        <input type="number" id="inputCols" min="2" max="30" value="10" class="spec-input">
                        <span>格</span>
                    </div>
                    <span class="spec-times">×</span>
                    <div class="spec-input-item">
                        <label for="inputRows">高 (Y)：</label>
                        <input type="number" id="inputRows" min="2" max="30" value="10" class="spec-input">
                        <span>格</span>
                    </div>
                    <button class="tool-btn btn-spec-apply" id="btnApplyGridSize" title="套用輸入的迷宮規格">
                        ⚡ 套用規格
                    </button>
                </div>
                <div class="spec-presets-row">
                    <span class="spec-preset-label">快速規格：</span>
                    <button class="spec-preset-btn" data-cols="5" data-rows="5">5×5</button>
                    <button class="spec-preset-btn" data-cols="8" data-rows="8">8×8</button>
                    <button class="spec-preset-btn active" data-cols="10" data-rows="10">10×10</button>
                    <button class="spec-preset-btn" data-cols="12" data-rows="12">12×12</button>
                    <button class="spec-preset-btn" data-cols="16" data-rows="16">16×16</button>
                    <span class="spec-cm-info" id="specDimensionsCm">300 × 300 cm</span>
                </div>
            </div>

            <!-- 排位賽：官方規格級別選擇列 (僅 10x10, 15x15, 20x20, 25x25) -->
            <div class="ranked-spec-bar" id="rankedSpecBar" style="display: none;">
                <div class="ranked-spec-title">
                    <span>⚔️ 官方排位賽級別 (點選自動抽選官方地圖)：</span>
                </div>
                <div class="ranked-spec-presets">
                    <button type="button" class="ranked-tier-btn active" data-size="10x10" title="10×10 級別 (限時 1分鐘)">
                        <span class="tier-icon">🥉</span>
                        <span class="tier-name">10×10 菁英級</span>
                        <span class="tier-time">⏳ 1分鐘</span>
                    </button>
                    <button type="button" class="ranked-tier-btn" data-size="15x15" title="15×15 級別 (限時 3分鐘)">
                        <span class="tier-icon">🥈</span>
                        <span class="tier-name">15×15 戰將級</span>
                        <span class="tier-time">⏳ 3分鐘</span>
                    </button>
                    <button type="button" class="ranked-tier-btn" data-size="20x20" title="20×20 級別 (限時 20分鐘)">
                        <span class="tier-icon">🥇</span>
                        <span class="tier-name">20×20 大師級</span>
                        <span class="tier-time">⏳ 20分鐘</span>
                    </button>
                    <button type="button" class="ranked-tier-btn" data-size="25x25" title="25×25 級別 (限時 30分鐘)">
                        <span class="tier-icon">👑</span>
                        <span class="tier-name">25×25 宗師級</span>
                        <span class="tier-time">⏳ 30分鐘</span>
                    </button>
                </div>
                <div class="ranked-current-info" id="rankedCurrentInfo">
                    <span>地圖：<strong id="rankedMapName">10×10 官方排位賽地圖 #1</strong> | 限時：<strong id="rankedLimitText">1 分鐘</strong></span>
                    <button type="button" class="btn-repick-map" id="btnRepickMap" title="重新抽選同一級別的另一張官方地圖">
                        🎲 隨機換圖
                    </button>
                    <button type="button" class="btn-repick-map" id="btnOpenRankedGallery" title="瀏覽所有官方排位賽地圖的簡易預覽">
                        📚 地圖總覽
                    </button>
                </div>
            </div>

            <!-- 工具列 -->
            <div class="tools-toolbar" id="practiceToolsToolbar">
                <button class="tool-btn active" id="toolWall" data-tool="wall">
                    🧱 設置/切換牆壁
                </button>
                <button class="tool-btn" id="toolStart" data-tool="start">
                    🟢 設定起點 (S)
                </button>
                <button class="tool-btn" id="toolGoal" data-tool="goal">
                    🏁 設定終點 (G)
                </button>
                <button class="tool-btn" id="toolPan" data-tool="pan" title="拖曳平移地圖視圖 (也可按住右鍵或空白鍵拖曳)">
                    ✋ 拖曳平移
                </button>
                
                <span style="border-right: 1px solid #475569; margin: 0 4px;"></span>

                <button class="tool-btn btn-action" id="btnOuterWalls" title="一鍵切換四周圍牆 (全開 / 全關)">
                    🔲 四周圍牆開關
                </button>
                <button class="tool-btn btn-action" id="btnClearInner" title="清空內部牆壁，保留四周圍牆">
                    🧹 清空內牆
                </button>
                <button class="tool-btn btn-action" id="btnClearAll" title="清空所有牆壁 (包含四周圍牆)">
                    🗑️ 全部清空
                </button>
                <button class="tool-btn btn-action" id="btnRandom" title="一鍵隨機產生 10x10 合法迷宮">
                    🎲 隨機迷宮
                </button>

                <span style="border-right: 1px solid #475569; margin: 0 4px;"></span>

                <button class="tool-btn btn-export" id="btnExportPNG" title="匯出高解析度 2D 迷宮圖片 (PNG)">
                    🖼️ 匯出 2D 地圖 (PNG)
                </button>
                <button class="tool-btn btn-action" id="btnExportJSON" title="匯出迷宮設定資料檔 (JSON)">
                    📄 匯出 JSON
                </button>
                <button class="tool-btn btn-action" id="btnImportJSON" title="從電腦載入先前匯出的 JSON 地圖檔">
                    📥 匯入 JSON
                </button>
                <input type="file" id="fileInputJSON" accept=".json" style="display: none;">

                <span style="border-right: 1px solid #475569; margin: 0 4px;"></span>

                <button class="tool-btn btn-publish-ranked" id="btnPublishToRanked" title="將目前練習賽設計好的迷宮，一鍵發布至官方排位賽圖庫">
                    <span>📤</span> 發布至排位賽圖庫
                </button>
            </div>

            <!-- 排位賽鎖定提示列 -->
            <div class="ranked-tools-banner" id="rankedToolsBanner" style="display: none; padding: 8px 16px; background: rgba(217, 119, 6, 0.15); border-bottom: 1px solid #d97706; font-size: 0.8rem; color: #fbbf24; align-items: center; justify-content: space-between;">
                <span>🔒 排位賽地圖為官方統一版本，已鎖定編輯功能以維護公平性。</span>
                <span>★ 盲測競技模式 ★</span>
            </div>

            <!-- 2D 地圖縮放與檢視控制列 -->
            <div class="map-zoom-bar" id="practiceZoomBar">
                <div class="zoom-group">
                    <span class="zoom-title">🔍 地圖縮放：</span>
                    <button type="button" class="zoom-btn" id="btnZoomOut" title="縮小 (滾輪向下 或 Ctrl -)">➖</button>
                    <span class="zoom-value" id="zoomPercentDisplay" title="目前縮放比例 (點擊重設 100%)">100%</span>
                    <button type="button" class="zoom-btn" id="btnZoomIn" title="放大 (滾輪向上 或 Ctrl +)">➕</button>
                    <button type="button" class="zoom-btn" id="btnZoomReset" title="重設縮放為 100%">⟲ 100%</button>
                    <button type="button" class="zoom-btn" id="btnZoomFit" title="適配視窗大小">📐 適配全圖</button>
                </div>
                <div class="zoom-tips">
                    <span>💡 支援滾輪縮放、按住右鍵/空白鍵拖曳平移</span>
                </div>
            </div>

            <!-- 2D 畫布底圖容器 -->
            <div class="map-canvas-container">
                <div class="map-viewport" id="mapViewport">
                    <div class="grid-wrapper" id="gridWrapper" style="background-image: url('map_10x10.jpg?v=<?= time() ?>');">
                        <!-- SVG 覆蓋層：負責處理格線熱區、牆壁繪製與起終點顯示 -->
                        <svg id="mazeSvg" class="grid-svg" viewBox="0 0 560 560"></svg>
                    </div>

                    <!-- 排位賽 2D 地圖屏蔽遮罩 (盲測機制) -->
                    <div class="ranked-blind-overlay" id="rankedBlindOverlay" style="display: none;">
                        <div class="blind-card">
                            <div class="blind-icon">🔒</div>
                            <h3 class="blind-title">2D 地圖雷達已全面屏蔽</h3>
                            <div class="blind-badge">★ 排位賽公平天梯盲測機制 ★</div>
                            <p class="blind-desc">
                                為維護排位賽公正性與競技挑戰，選手無法於 2D 平面查看迷宮路徑！<br>
                                比賽開始前可自由切換 <strong>3D 俯瞰視角</strong> 觀察地形；按下【開始遙控】啟動比賽後，將鎖定為 <strong>車子視角</strong> 全力衝刺！
                            </p>
                            <div class="blind-match-info">
                                <div>級別：<span id="blindTierLabel" class="tier-tag">10×10 菁英級</span></div>
                                <div>地圖：<span id="blindMapIdLabel">官方隨機</span></div>
                                <div>限時：<span id="blindTimeLimitLabel" class="time-tag">1 分鐘 (60秒)</span></div>
                            </div>
                            <div class="blind-prompt">
                                👉 請點擊右上方「<strong>▶ 開始遙控</strong>」啟動倒數並開始遙控行駛！
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 鍵盤操控與操作指引 (挪至 2D 地圖下方) -->
                <div class="sim-instructions" id="simInstructions">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div id="driveStatusBadge" class="drive-status-tag inactive">
                            <span id="driveStatusDot">⚪</span> <span id="driveStatusText">鍵盤操控功能：已停止</span>
                        </div>
                        <div id="subTimerBadge" style="font-size: 0.82rem; font-weight: 700; color: #38bdf8; font-family: 'Courier New', monospace;">
                            ⏱️ 00:00.0 (完賽計時)
                        </div>
                    </div>
                    <div id="simWalkControlTitle"><strong>🎮 行走控制 (俯瞰與車子視角皆可使用)：</strong></div>
                    <div style="margin-top: 4px;">
                        <kbd>W</kbd> 前進 &nbsp; <kbd>S</kbd> 後退 &nbsp; <kbd>A</kbd> 左轉 &nbsp; <kbd>D</kbd> 右轉
                    </div>
                    <div id="driveTipText" style="font-size: 0.75rem; color: #64748b; margin-top: 5px;">
                        * 請點擊右上方「<strong>▶ 開始操控</strong>」按鈕以啟用鍵盤功能
                    </div>
                </div>
            </div>

            <!-- 狀態列 -->
            <div class="editor-status-bar">
                <div>起點: <strong id="statStart">(0, 9)</strong> | 終點: <strong id="statGoal">(9, 0)</strong></div>
                <div>牆壁段數: <strong id="statWallCount">0</strong> 段 (15cm 高)</div>
            </div>
        </section>

        <!-- 右側：3D 即時模擬視窗 -->
        <section class="simulator-panel">
            
            <!-- 3D 視圖懸浮主控儀表板 (整齊雙層結構 HUD Deck) -->
            <div class="sim-hud-deck" id="simHudDeck">
                <!-- 第一層：視角切換 / 牆面外觀風格 / 計時模式與時限 -->
                <div class="sim-hud-row aux-row">
                    <!-- 視角切換 -->
                    <div class="hud-subgroup">
                        <span class="hud-subgroup-label">視角</span>
                        <div class="hud-btn-group">
                            <button class="hud-pill-btn active" id="btnModeOrbit" title="3D 自由俯瞰視角">
                                🌐 俯瞰
                            </button>
                            <button class="hud-pill-btn" id="btnModeDriver" title="車子第一人稱探險視角">
                                🚗 車載
                            </button>
                            <button class="hud-pill-btn icon-only" id="btnResetCam" title="重設視角至標準角度">
                                🎯
                            </button>
                        </div>
                    </div>

                    <!-- 牆面外觀風格 -->
                    <div class="hud-subgroup">
                        <span class="hud-subgroup-label">外觀</span>
                        <div class="hud-btn-group">
                            <button class="hud-pill-btn active" id="btnThemeWood" data-theme="wood">木板</button>
                            <button class="hud-pill-btn" id="btnThemeWhite" data-theme="white">白板</button>
                            <button class="hud-pill-btn" id="btnThemeCyber" data-theme="cyber">科幻</button>
                        </div>
                    </div>

                    <!-- 計時模式與時限選單 -->
                    <div class="hud-subgroup timer-mode-subgroup">
                        <span class="hud-subgroup-label">計時模式</span>
                        <div class="hud-btn-group">
                            <button class="hud-pill-btn active" id="btnTimerCountUp" title="完賽計時：記錄跑完全程花費時間">
                                ⏱️ 完賽
                            </button>
                            <button class="hud-pill-btn" id="btnTimerCountDown" title="限時倒數計時挑戰">
                                ⏳ <span id="countdownBtnLabel">1分挑戰</span>
                            </button>
                        </div>
                        <select class="sim-timer-select" id="selectCountdownDuration" title="選擇挑戰時間">
                            <option value="1" selected>1 分鐘</option>
                            <option value="3">3 分鐘</option>
                            <option value="5">5 分鐘</option>
                            <option value="8">8 分鐘</option>
                            <option value="10">10 分鐘</option>
                            <option value="15">15 分鐘</option>
                            <option value="custom">✏️ 自訂...</option>
                        </select>
                        <!-- 自訂時間輸入區 (選取自訂時間時展開) -->
                        <div class="custom-timer-group" id="customTimerGroup" style="display: none;">
                            <input type="number" id="customMinInput" class="custom-timer-input" min="0" max="180" value="2" title="設定分鐘數 (0 ~ 180)">
                            <span class="custom-timer-unit">分</span>
                            <input type="number" id="customSecInput" class="custom-timer-input" min="0" max="59" value="0" title="設定秒數 (0 ~ 59)">
                            <span class="custom-timer-unit">秒</span>
                            <button type="button" class="custom-timer-btn" id="btnApplyCustomTimer" title="套用自訂挑戰時間">套用</button>
                        </div>
                    </div>
                </div>

                <!-- 第二層：核心遙控行駛操作與碼表 HUD (整齊對稱排列) -->
                <div class="sim-hud-row main-row">
                    <!-- 遙控核心操作三按鈕 -->
                    <div class="hud-subgroup drive-actions-group">
                        <button class="sim-btn btn-start-drive" id="btnStartDrive">
                            <span>▶</span> 開始遙控 (啟用鍵盤)
                        </button>
                        <button class="sim-btn btn-stop-drive" id="btnStopDrive" disabled>
                            <span>⏹</span> 停止
                        </button>
                        <button class="sim-btn btn-reset-drive" id="btnResetCar" title="自走車重回起點">
                            <span>🔄</span> 回到起點
                        </button>
                    </div>

                    <!-- 醒目碼表計時鐘 -->
                    <div class="timer-display" id="timerDisplay">
                        <span id="timerIcon">⏱️</span>
                        <span id="timerDigits">00:00.0</span>
                    </div>
                </div>
            </div>

            <!-- Three.js 渲染畫布容器 -->
            <div class="threejs-canvas-wrapper" id="canvasContainer"></div>

            <!-- 即時座標 HUD -->
            <div class="sim-pos-hud" id="posHud">
                座標：<span id="posCm">X: 15 cm, Y: 285 cm</span> (<span id="posCell">格 0, 9</span>)
            </div>

            <!-- 到達終點獲勝視窗 -->
            <div class="victory-modal" id="victoryModal">
                <h2>🎉 恭喜順利抵達終點！</h2>
                <div class="victory-time-box">
                    <div class="victory-time-label" id="victoryTimeLabel">🏁 完賽成績</div>
                    <div class="victory-time-value" id="victoryTimeValue">00:00.0</div>
                    <div class="victory-time-sub" id="victoryTimeSub">總共耗時：0.0 秒</div>
                </div>
                <p id="victoryMsg">已成功走出 10×10 迷宮！</p>
                <button class="victory-btn" id="btnVictoryRestart">🔄 重新挑戰 (回到起點)</button>
            </div>

            <!-- 時間到超時視窗 (倒數挑戰模式) -->
            <div class="victory-modal timeout-modal" id="timeoutModal">
                <h2 style="color: #ef4444;">⏰ 時間到！挑戰超時</h2>
                <div class="victory-time-box" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.12);">
                    <div class="victory-time-label" style="color: #f87171;">挑戰結果</div>
                    <div class="victory-time-value" id="timeoutTimeValue" style="color: #f87171;">60.0 秒 時間用盡</div>
                    <div class="victory-time-sub" id="timeoutTimeSub" style="color: #cbd5e1;">未能於 1 分鐘內抵達終點</div>
                </div>
                <p>別氣餒！調整行駛路線再試一次！</p>
                <button class="victory-btn timeout-btn" id="btnTimeoutRestart">🔄 重新挑戰 (回到起點)</button>
            </div>

            <!-- 排位賽過關結算彈窗 -->
            <div class="victory-modal ranked-victory-modal" id="rankedVictoryModal" style="display: none; border-color: #f59e0b; box-shadow: 0 0 35px rgba(245, 158, 11, 0.5);">
                <div style="font-size: 2.2rem; margin-bottom: 4px;">🏆</div>
                <h2 style="color: #fbbf24; margin-bottom: 8px;">排位賽挑戰成功！</h2>
                <div class="victory-time-box" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.12);">
                    <div class="victory-time-label" style="color: #fde68a;">成績已登錄排位賽天梯榜</div>
                    <div class="victory-time-value" id="rankedVictoryTimeValue" style="color: #fbbf24;">00:00.0</div>
                    <div class="victory-time-sub" id="rankedVictoryTimeSub" style="color: #4ade80;">耗時：0.0 秒 | 剩餘：0.0 秒</div>
                </div>
                <div class="ranked-rank-badge" id="rankedVictoryRankBadge">
                    🏆 當前全服排名：第 <strong id="rankedVictoryRankNum">1</strong> 名
                </div>
                <p id="rankedVictoryMsg" style="margin: 12px 0 16px 0; color: #cbd5e1;">太強了！在 2D 地圖全面屏蔽下順利突圍走出迷宮！</p>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="victory-btn" id="btnRankedNextMatch" style="background: #d97706;">🎲 隨機換圖再戰</button>
                    <button type="button" class="victory-btn" id="btnRankedViewLeaderboard" style="background: #0284c7;">🏆 查看排行榜</button>
                    <button type="button" class="victory-btn" id="btnRankedBackToPractice" style="background: #334155;">🛠️ 回到練習賽</button>
                </div>
            </div>

            <!-- 排位賽超時彈窗 -->
            <div class="victory-modal timeout-modal ranked-timeout-modal" id="rankedTimeoutModal" style="display: none;">
                <div style="font-size: 2.2rem; margin-bottom: 4px;">⏰</div>
                <h2 style="color: #ef4444; margin-bottom: 8px;">排位賽挑戰超時！</h2>
                <div class="victory-time-box" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.12);">
                    <div class="victory-time-label" style="color: #fca5a5;">挑戰結果</div>
                    <div class="victory-time-value" id="rankedTimeoutValue" style="color: #f87171;">時間用盡</div>
                    <div class="victory-time-sub" id="rankedTimeoutSub" style="color: #cbd5e1;">未能於限時內抵達終點</div>
                </div>
                <p style="margin: 12px 0 16px 0; color: #cbd5e1;">別灰心！排位賽盲測極具挑戰性，調整駕駛視角與路線策略再次出戰！</p>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="victory-btn timeout-btn" id="btnRankedTimeoutRetry">🔄 重新挑戰 (回到起點)</button>
                    <button type="button" class="victory-btn" id="btnRankedTimeoutNewMap" style="background: #d97706;">🎲 換新地圖再戰</button>
                    <button type="button" class="victory-btn" id="btnRankedTimeoutLeaderboard" style="background: #0284c7;">🏆 查看排行榜</button>
                    <button type="button" class="victory-btn" id="btnRankedTimeoutBackPractice" style="background: #334155;">🛠️ 回到練習賽</button>
                </div>
            </div>
        </section>

    </div>

    <!-- 儲存成功提示 Toast -->
    <div class="toast" id="toastMsg">迷宮配置已儲存！</div>

    <!-- 帳號登入 / 註冊彈跳視窗 -->
    <div class="auth-modal-backdrop" id="authModalBackdrop">
        <div class="auth-modal-card">
            <button class="auth-modal-close" id="btnCloseAuthModal" title="關閉視窗">&times;</button>
            
            <div class="auth-modal-header">
                <div class="auth-modal-icon">🔐</div>
                <h3 class="auth-modal-title">帳號管理中心</h3>
                <p class="auth-modal-subtitle">未登入訪客僅限使用 10×10 (含) 以下地圖<br>登入或註冊後立即解鎖 11×11 至 30×30 大型地圖與雲端存檔！</p>
            </div>

            <!-- 頁籤切換：[登入] / [註冊] -->
            <div class="auth-tabs">
                <button class="auth-tab-btn active" id="tabBtnLogin" data-target="formLogin">
                    <span>🔑</span> 帳號登入
                </button>
                <button class="auth-tab-btn" id="tabBtnRegister" data-target="formRegister">
                    <span>📝</span> 註冊新帳號
                </button>
            </div>

            <!-- 提示與錯誤訊息列 -->
            <div class="auth-alert" id="authAlert" style="display: none;"></div>

            <!-- 1. 登入表單 -->
            <form id="formLogin" class="auth-form" onsubmit="return false;">
                <div class="auth-field">
                    <label for="loginUsername">帳號名稱：</label>
                    <div class="auth-input-wrap">
                        <span class="auth-input-icon">👤</span>
                        <input type="text" id="loginUsername" placeholder="請輸入帳號名稱" required autocomplete="username">
                    </div>
                </div>
                <div class="auth-field">
                    <label for="loginPassword">登入密碼：</label>
                    <div class="auth-input-wrap">
                        <span class="auth-input-icon">🔒</span>
                        <input type="password" id="loginPassword" placeholder="請輸入密碼" required autocomplete="current-password">
                    </div>
                </div>
                <button type="submit" class="auth-submit-btn" id="btnSubmitLogin">
                    <span>🚀</span> 立即登入 (解鎖全規格)
                </button>
                <div class="auth-form-footer">
                    還沒有帳號？ <a href="javascript:void(0)" id="linkToRegister">點此免費註冊 ➔</a>
                </div>
            </form>

            <!-- 2. 註冊表單 -->
            <form id="formRegister" class="auth-form" style="display: none;" onsubmit="return false;">
                <div class="auth-field">
                    <label for="regUsername">設定帳號：</label>
                    <div class="auth-input-wrap">
                        <span class="auth-input-icon">👤</span>
                        <input type="text" id="regUsername" placeholder="3~30 字元 (中英數底線)" required autocomplete="username">
                    </div>
                </div>
                <div class="auth-field">
                    <label for="regPassword">設定密碼：</label>
                    <div class="auth-input-wrap">
                        <span class="auth-input-icon">🔒</span>
                        <input type="password" id="regPassword" placeholder="至少 4 個字元" required autocomplete="new-password">
                    </div>
                </div>
                <div class="auth-field">
                    <label for="regConfirmPassword">確認密碼：</label>
                    <div class="auth-input-wrap">
                        <span class="auth-input-icon">🛡️</span>
                        <input type="password" id="regConfirmPassword" placeholder="再次輸入相同的密碼" required autocomplete="new-password">
                    </div>
                </div>
                <button type="submit" class="auth-submit-btn register" id="btnSubmitRegister">
                    <span>✨</span> 註冊並自動登入
                </button>
                <div class="auth-form-footer">
                    已有帳號？ <a href="javascript:void(0)" id="linkToLogin">返回登入 ➔</a>
                </div>
            </form>

            <!-- 權限規則說明 -->
            <div class="auth-rule-box">
                <div class="rule-item">
                    <span class="rule-badge guest">👤 訪客模式</span>
                    <span>僅限使用 <strong>10×10 (含) 以下</strong> 地圖規格</span>
                </div>
                <div class="rule-item">
                    <span class="rule-badge member">👑 會員登入</span>
                    <span><strong>永久解鎖 11×11 ~ 30×30</strong> 所有自訂迷宮與 MySQL 雲端儲存</span>
                </div>
            </div>
        </div>
    </div>

    <!-- 天梯排行榜彈跳視窗 -->
    <div class="auth-modal-backdrop leaderboard-backdrop" id="leaderboardModalBackdrop">
        <div class="auth-modal-card leaderboard-card">
            <button class="auth-modal-close" id="btnCloseLeaderboardModal" title="關閉視窗">&times;</button>
            
            <div class="auth-modal-header">
                <div class="auth-modal-icon">🏆</div>
                <h3 class="auth-modal-title">排位賽全服天梯排行榜</h3>
                <p class="auth-modal-subtitle">官方統一地圖盲測挑戰 • 僅保留個人最佳成績 (不重複帳號)</p>
            </div>

            <!-- 級別切換頁籤 -->
            <div class="leaderboard-tabs" id="leaderboardTabs">
                <button type="button" class="leaderboard-tab-btn active" data-size="10x10">
                    <span>🥉</span> 10×10 (1分鐘)
                </button>
                <button type="button" class="leaderboard-tab-btn" data-size="15x15">
                    <span>🥈</span> 15×15 (3分鐘)
                </button>
                <button type="button" class="leaderboard-tab-btn" data-size="20x20">
                    <span>🥇</span> 20×20 (20分鐘)
                </button>
                <button type="button" class="leaderboard-tab-btn" data-size="25x25">
                    <span>👑</span> 25×25 (30分鐘)
                </button>
            </div>

            <!-- 個人最佳成績橫條 -->
            <div class="user-best-banner" id="userBestBanner">
                <span>👤 我的最佳成績：<strong>尚未有紀錄</strong></span>
                <span id="userBestRankText">登入並完成排位賽以登錄天梯</span>
            </div>

            <!-- 排行榜表格容器 -->
            <div class="leaderboard-table-wrap">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th style="width: 68px;">名次</th>
                            <th>選手帳號</th>
                            <th>完賽耗時</th>
                            <th>剩餘時間</th>
                            <th>挑戰地圖</th>
                            <th>完賽時間</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboardTableBody">
                        <tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">載入中...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="leaderboard-footer">
                <span class="leaderboard-tip">💡 排名依【完賽耗時】最短者優先排序；盲測排位挑戰公平客觀。</span>
                <button type="button" class="tool-btn btn-action" id="btnRefreshLeaderboard"><span>🔄</span> 重新整理</button>
            </div>
        </div>
    </div>

    <!-- 排位賽地圖總覽彈窗 -->
    <div class="auth-modal-backdrop" id="rankedGalleryBackdrop">
        <div class="auth-modal-card leaderboard-card">
            <button class="auth-modal-close" id="btnCloseRankedGallery" title="關閉視窗">&times;</button>

            <div class="auth-modal-header">
                <div class="auth-modal-icon">📚</div>
                <h3 class="auth-modal-title">排位賽地圖總覽</h3>
                <p class="auth-modal-subtitle">官方排位圖庫所有地圖 • 橘框為本場地圖</p>
            </div>

            <div class="ranked-gallery" id="rankedGalleryList"></div>
        </div>
    </div>

    <!-- 發布至官方排位賽圖庫確認彈窗 -->
    <div class="auth-modal-backdrop" id="publishModalBackdrop">
        <div class="auth-modal-card publish-modal-card">
            <button class="auth-modal-close" id="btnClosePublishModal" title="關閉視窗">&times;</button>
            
            <div class="auth-modal-header">
                <div class="auth-modal-icon">📤</div>
                <h3 class="auth-modal-title">發布迷宮至官方排位賽圖庫</h3>
                <p class="auth-modal-subtitle">發布後此地圖將納入全服官方排位賽盲測抽籤圖庫，所有選手於排位賽皆可能隨機抽中！</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                <div class="publish-check-item">
                    <span>📐 迷宮規格：</span>
                    <span id="publishModalSpec" class="publish-spec-badge">10×10 菁英級</span>
                </div>
                <div class="publish-check-item">
                    <span>🧭 起終點路徑檢驗：</span>
                    <span id="publishModalPathCheck" class="status-pass">✅ 通路正常 (保證可解)</span>
                </div>
                <div class="publish-check-item">
                    <span>🧱 牆壁段數 / 尺寸：</span>
                    <span id="publishModalStats" style="color: #38bdf8; font-weight: 600;">0 段 (300×300 cm)</span>
                </div>
                <div class="publish-check-item">
                    <span>👤 發布選手：</span>
                    <span id="publishModalAuthor" style="color: #fbbf24; font-weight: 700;">-</span>
                </div>
            </div>

            <div class="auth-field" style="margin-bottom: 16px;">
                <label for="publishCustomName">設定地圖別名 (選填)：</label>
                <div class="auth-input-wrap">
                    <span class="auth-input-icon">🏷️</span>
                    <input type="text" id="publishCustomName" placeholder="例如：死亡迴轉之谷、九曲迷蹤" maxlength="30">
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="tool-btn btn-action" id="btnCancelPublish" style="padding: 10px 18px;">取消</button>
                <button type="button" class="auth-submit-btn" id="btnConfirmPublish" style="padding: 10px 20px; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); border-color: #f59e0b;">
                    <span>🚀</span> 確認發布至官方排位圖庫
                </button>
            </div>
        </div>
    </div>

    <!-- 儲存迷宮彈窗 (支援最多 5 張地圖：新增或覆蓋現有) -->
    <div class="auth-modal-backdrop" id="saveMapModalBackdrop">
        <div class="auth-modal-card save-map-modal-card">
            <button class="auth-modal-close" id="btnCloseSaveMapModal" title="關閉視窗">&times;</button>
            
            <div class="auth-modal-header">
                <div class="auth-modal-icon">💾</div>
                <h3 class="auth-modal-title">儲存迷宮至個人雲端資料庫</h3>
                <p class="auth-modal-subtitle">每位會員帳號最多可獨立儲存 5 張自訂迷宮地圖</p>
            </div>

            <!-- 儲存配額狀態橫條 -->
            <div class="map-quota-banner" id="saveQuotaBanner">
                <div class="quota-info">
                    <span class="quota-title">📦 個人雲端配額：</span>
                    <span class="quota-count" id="saveQuotaCount">已存 0 / 5 張</span>
                </div>
                <div class="quota-progress-bar">
                    <div class="quota-progress-fill" id="saveQuotaProgressFill" style="width: 0%;"></div>
                </div>
            </div>

            <!-- 目前地圖資訊 -->
            <div class="save-map-info-box">
                <div class="save-info-row">
                    <span>📐 目前迷宮規格：</span>
                    <strong id="saveCurrentSpec" style="color: #38bdf8;">10×10 格 (300×300 cm)</strong>
                </div>
                <div class="save-info-row">
                    <span>🧱 牆壁總段數：</span>
                    <strong id="saveCurrentWalls" style="color: #4ade80;">0 段</strong>
                </div>
            </div>

            <!-- 地圖名稱自訂 -->
            <div class="auth-field" style="margin-bottom: 14px;">
                <label for="saveMapNameInput">自訂地圖名稱：</label>
                <div class="auth-input-wrap">
                    <span class="auth-input-icon">🏷️</span>
                    <input type="text" id="saveMapNameInput" placeholder="例如：雙龍出海、迴旋迷宮A" maxlength="30">
                </div>
            </div>

            <!-- 儲存槽選項 (存為全新 或 覆蓋現有) -->
            <div class="save-slot-selection">
                <div class="save-slot-title">選擇儲存方式：</div>
                
                <!-- 新增槽位選項 (滿 5 張時自動停用) -->
                <label class="save-slot-option" id="slotOptionNewWrapper">
                    <input type="radio" name="saveTargetMode" id="radioSaveNew" value="new" checked>
                    <div class="slot-option-content">
                        <span class="slot-option-label">➕ 存為全新地圖</span>
                        <span class="slot-option-desc" id="slotNewDesc">使用新的儲存槽</span>
                    </div>
                </label>

                <!-- 滿 5 張時的滿額提示 -->
                <div class="map-full-warning" id="mapFullWarning" style="display: none;">
                    ⚠️ 您已儲存滿 5 張地圖！請選擇下方其中一張進行【覆蓋更新】，或前往【我的地圖庫】刪除不需要的地圖。
                </div>

                <!-- 覆蓋現有地圖列表 -->
                <div class="save-overwrite-group" id="saveOverwriteGroup">
                    <div class="overwrite-header">
                        <span>🔄 或選擇覆蓋現有地圖：</span>
                    </div>
                    <div class="save-existing-list" id="saveExistingMapsList">
                        <!-- 動態生成現有地圖選項 -->
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="tool-btn btn-action" id="btnCancelSaveMap" style="padding: 10px 18px;">取消</button>
                <button type="button" class="auth-submit-btn" id="btnConfirmSaveMap" style="padding: 10px 22px;">
                    <span>💾</span> 確認儲存至雲端
                </button>
            </div>
        </div>
    </div>

    <!-- 我的個人地圖庫彈窗 (查看已存的最多 5 張地圖、載入、刪除) -->
    <div class="auth-modal-backdrop" id="mapLibraryModalBackdrop">
        <div class="auth-modal-card map-library-modal-card">
            <button class="auth-modal-close" id="btnCloseMapLibraryModal" title="關閉視窗">&times;</button>
            
            <div class="auth-modal-header">
                <div class="auth-modal-icon">📁</div>
                <h3 class="auth-modal-title">我的個人迷宮圖庫</h3>
                <p class="auth-modal-subtitle">管理您的雲端儲存迷宮 (每隻帳號上限 5 張，可隨時載入編輯或釋出儲存槽)</p>
            </div>

            <!-- 容量進度橫條 -->
            <div class="map-quota-banner" id="libraryQuotaBanner">
                <div class="quota-info">
                    <span class="quota-title">📦 雲端容量使用率：</span>
                    <span class="quota-count" id="libraryQuotaCount">已存 0 / 5 張 (尚餘 5 個儲存槽)</span>
                </div>
                <div class="quota-progress-bar">
                    <div class="quota-progress-fill" id="libraryQuotaProgressFill" style="width: 0%;"></div>
                </div>
            </div>

            <!-- 地圖卡片清單列表 -->
            <div class="map-library-list" id="mapLibraryList">
                <div style="text-align: center; color: #64748b; padding: 32px;">⏳ 讀取個人地圖庫中...</div>
            </div>

            <div class="map-library-footer">
                <span class="library-tip">💡 提示：在【練習賽】完成規劃後，點擊「💾 儲存迷宮設定」即可將新地圖存入此圖庫。</span>
                <button type="button" class="tool-btn btn-action" id="btnRefreshMapLibrary"><span>🔄</span> 重新整理</button>
            </div>
        </div>
    </div>

    <!-- 腳本引入 -->
    <script src="assets/js/three.min.js"></script>
    <script src="assets/js/OrbitControls.js"></script>
    <script src="assets/js/maze-editor.js?v=<?= time() ?>"></script>
    <script src="assets/js/maze-3d.js?v=<?= time() ?>"></script>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const svgElement = document.getElementById('mazeSvg');
            const canvasContainer = document.getElementById('canvasContainer');

            // Toast 訊息提示
            function showToast(msg, isError = false) {
                const toast = document.getElementById('toastMsg');
                if (!toast) return;
                toast.textContent = msg;
                toast.style.background = isError ? '#ef4444' : '#10b981';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2800);
            }

            const btnStartDrive = document.getElementById('btnStartDrive');
            const btnStopDrive = document.getElementById('btnStopDrive');
            const btnResetCar = document.getElementById('btnResetCar');
            const btnModeOrbit = document.getElementById('btnModeOrbit');
            const btnModeDriver = document.getElementById('btnModeDriver');
            const btnResetCam = document.getElementById('btnResetCam');
            const driveStatusBadge = document.getElementById('driveStatusBadge');
            const driveStatusText = document.getElementById('driveStatusText');
            const driveStatusDot = document.getElementById('driveStatusDot');
            const driveTipText = document.getElementById('driveTipText');

            // 賽事模式：'practice' (練習賽) | 'ranked' (排位賽)
            let currentGameMode = 'practice';
            let currentRankedSize = '10x10'; // 10x10, 15x15, 20x20, 25x25
            let currentRankedMapId = 'map_1';
            let currentRankedLimitMs = 90 * 1000;

            // ============================================
            // 計時系統 (完賽計時 / 倒數挑戰模式)
            // ============================================
            let currentTimerMode = 'up'; // 'up' (正數完賽計時) 或 'down' (限時挑戰倒數)
            let timerRunning = false;
            let timerElapsedMs = 0;
            let timerStartTimestamp = 0;
            let timerIntervalId = null;
            let countdownLimitMs = 60 * 1000;
            let countdownLabel = '1分鐘挑戰';
            let countdownDesc = '1 分鐘';

            const timerDigits = document.getElementById('timerDigits');
            const timerIcon = document.getElementById('timerIcon');
            const timerDisplay = document.getElementById('timerDisplay');
            const subTimerBadge = document.getElementById('subTimerBadge');
            const btnTimerCountUp = document.getElementById('btnTimerCountUp');
            const btnTimerCountDown = document.getElementById('btnTimerCountDown');
            const countdownBtnLabel = document.getElementById('countdownBtnLabel');
            const selectCountdownDuration = document.getElementById('selectCountdownDuration');
            const customTimerGroup = document.getElementById('customTimerGroup');
            const customMinInput = document.getElementById('customMinInput');
            const customSecInput = document.getElementById('customSecInput');
            const btnApplyCustomTimer = document.getElementById('btnApplyCustomTimer');

            function formatTimeDisplay(ms) {
                const totalTenths = Math.floor(ms / 100);
                const tenths = totalTenths % 10;
                const totalSec = Math.floor(totalTenths / 10);
                const sec = totalSec % 60;
                const min = Math.floor(totalSec / 60);
                return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${tenths}`;
            }

            function updateTimerUI() {
                let displayMs = 0;
                let isDanger = false;

                if (currentTimerMode === 'up') {
                    displayMs = timerElapsedMs;
                    if (timerIcon) timerIcon.textContent = '⏱️';
                    if (timerDisplay) timerDisplay.className = 'timer-display';
                } else {
                    const remainMs = Math.max(0, countdownLimitMs - timerElapsedMs);
                    displayMs = remainMs;
                    if (timerIcon) timerIcon.textContent = '⏳';
                    if (remainMs <= 10000 && timerRunning) {
                        if (timerDisplay) timerDisplay.className = 'timer-display countdown danger';
                        isDanger = true;
                    } else {
                        if (timerDisplay) timerDisplay.className = 'timer-display countdown';
                    }
                }

                const timeStr = formatTimeDisplay(displayMs);
                if (timerDigits) timerDigits.textContent = timeStr;

                if (subTimerBadge) {
                    const modeText = currentTimerMode === 'up' ? '完賽計時' : countdownLabel;
                    subTimerBadge.textContent = `${currentTimerMode === 'up' ? '⏱️' : '⏳'} ${timeStr} (${modeText})`;
                    subTimerBadge.style.color = isDanger ? '#ef4444' : (currentTimerMode === 'up' ? '#38bdf8' : '#fbbf24');
                }
            }

            function startTimer(reset = true) {
                if (reset) {
                    timerElapsedMs = 0;
                }
                timerStartTimestamp = performance.now();
                timerRunning = true;

                if (timerIntervalId) clearInterval(timerIntervalId);
                timerIntervalId = setInterval(() => {
                    const now = performance.now();
                    const delta = now - timerStartTimestamp;
                    timerStartTimestamp = now;
                    timerElapsedMs += delta;

                    // 倒數挑戰結束判定
                    if (currentTimerMode === 'down' && timerElapsedMs >= countdownLimitMs) {
                        timerElapsedMs = countdownLimitMs;
                        updateTimerUI();
                        pauseTimer();
                        maze3D.stopDriving();

                        if (currentGameMode === 'ranked') {
                            const rankedTimeoutModal = document.getElementById('rankedTimeoutModal');
                            const rankedTimeoutValue = document.getElementById('rankedTimeoutValue');
                            const rankedTimeoutSub = document.getElementById('rankedTimeoutSub');

                            if (rankedTimeoutValue) rankedTimeoutValue.textContent = `${(countdownLimitMs / 1000).toFixed(0)} 秒 時間用盡`;
                            if (rankedTimeoutSub) rankedTimeoutSub.textContent = `在 ${currentRankedSize} 盲測排位中未能於限時內抵達終點`;
                            if (rankedTimeoutModal) rankedTimeoutModal.style.display = 'block';
                        } else {
                            const timeoutModal = document.getElementById('timeoutModal');
                            const timeoutTimeValue = document.getElementById('timeoutTimeValue');
                            const timeoutTimeSub = document.getElementById('timeoutTimeSub');
                            const btnTimeoutRestart = document.getElementById('btnTimeoutRestart');

                            if (timeoutTimeValue) timeoutTimeValue.textContent = `${(countdownLimitMs / 1000).toFixed(0)} 秒 時間用盡`;
                            if (timeoutTimeSub) timeoutTimeSub.textContent = `未能於 ${countdownDesc} 內抵達終點`;
                            if (btnTimeoutRestart) btnTimeoutRestart.textContent = `🔄 重新挑戰 (${countdownDesc})`;

                            if (timeoutModal) timeoutModal.style.display = 'block';
                        }
                        return;
                    }

                    updateTimerUI();
                }, 33);

                updateTimerUI();
            }

            function pauseTimer() {
                timerRunning = false;
                if (timerIntervalId) {
                    clearInterval(timerIntervalId);
                    timerIntervalId = null;
                }
                if (timerDisplay) {
                    timerDisplay.classList.remove('danger');
                }
            }

            function resetTimer() {
                pauseTimer();
                timerElapsedMs = 0;
                updateTimerUI();
            }

            // 切換計時模式按鈕
            btnTimerCountUp.addEventListener('click', () => {
                if (currentGameMode === 'ranked') {
                    showToast('⚠️ 官方排位賽強制使用限時倒數規則！', true);
                    return;
                }
                if (currentTimerMode === 'up') return;
                currentTimerMode = 'up';
                btnTimerCountUp.classList.add('active');
                btnTimerCountDown.classList.remove('active');
                maze3D.stopDriving();
                resetTimer();
                showToast('已切換為【完賽計時】模式 (從0開始記錄跑完時間)');
            });

            btnTimerCountDown.addEventListener('click', () => {
                if (currentTimerMode === 'down') return;
                currentTimerMode = 'down';
                btnTimerCountDown.classList.add('active');
                btnTimerCountUp.classList.remove('active');
                maze3D.stopDriving();
                resetTimer();
                showToast(`已切換為【${countdownLabel}】模式 (限時倒數)`);
            });

            // 倒數時限下拉選單切換
            if (selectCountdownDuration) {
                selectCountdownDuration.addEventListener('change', () => {
                    if (currentGameMode === 'ranked') {
                        showToast('⚠️ 排位賽挑戰限時由官方級別統一規定！', true);
                        return;
                    }
                    const val = selectCountdownDuration.value;
                    if (val === 'custom') {
                        // 展開自訂時間輸入區
                        if (customTimerGroup) customTimerGroup.style.display = 'inline-flex';
                        if (customMinInput) customMinInput.focus();
                        return;
                    }

                    // 選擇預設時限
                    if (customTimerGroup) customTimerGroup.style.display = 'none';
                    const chosenMin = parseInt(val, 10) || 1;
                    countdownLimitMs = chosenMin * 60 * 1000;
                    countdownLabel = `${chosenMin}分鐘挑戰`;
                    countdownDesc = `${chosenMin} 分鐘`;

                    if (countdownBtnLabel) {
                        countdownBtnLabel.textContent = countdownLabel;
                    }
                    if (currentTimerMode !== 'down') {
                        currentTimerMode = 'down';
                        btnTimerCountDown.classList.add('active');
                        btnTimerCountUp.classList.remove('active');
                    }
                    if (timerRunning) {
                        maze3D.stopDriving();
                    }
                    resetTimer();
                    showToast(`⏳ 已設定為【${countdownLabel}】模式！`);
                });
            }

            // 套用自訂時間邏輯
            function applyCustomDuration() {
                const min = Math.max(0, parseInt(customMinInput ? customMinInput.value : 0, 10) || 0);
                const sec = Math.max(0, Math.min(59, parseInt(customSecInput ? customSecInput.value : 0, 10) || 0));
                const totalSec = min * 60 + sec;

                if (totalSec <= 0) {
                    showToast('自訂挑戰時間必須大於 0 秒！', true);
                    return;
                }

                countdownLimitMs = totalSec * 1000;

                if (sec === 0) {
                    countdownLabel = `${min}分鐘挑戰`;
                    countdownDesc = `${min} 分鐘`;
                } else if (min === 0) {
                    countdownLabel = `${sec}秒挑戰`;
                    countdownDesc = `${sec} 秒`;
                } else {
                    countdownLabel = `${min}分${sec}秒挑戰`;
                    countdownDesc = `${min} 分 ${sec} 秒`;
                }

                if (countdownBtnLabel) countdownBtnLabel.textContent = countdownLabel;

                // 更新下拉選單中的自訂選項文字
                const customOpt = selectCountdownDuration ? selectCountdownDuration.querySelector('option[value="custom"]') : null;
                if (customOpt) {
                    customOpt.textContent = `✏️ 自訂 (${countdownDesc})`;
                }

                if (currentTimerMode !== 'down') {
                    currentTimerMode = 'down';
                    btnTimerCountDown.classList.add('active');
                    btnTimerCountUp.classList.remove('active');
                }
                if (timerRunning) {
                    maze3D.stopDriving();
                }
                resetTimer();
                showToast(`⏳ 已套用自訂挑戰時間：${countdownDesc}！`);
            }

            if (btnApplyCustomTimer) {
                btnApplyCustomTimer.addEventListener('click', applyCustomDuration);
            }

            [customMinInput, customSecInput].forEach(inp => {
                if (inp) {
                    inp.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            applyCustomDuration();
                        }
                    });
                }
            });

            function updateDrivingUI(isDriving) {
                if (isDriving) {
                    btnStartDrive.disabled = true;
                    btnStartDrive.classList.add('driving-active');
                    btnStopDrive.disabled = false;

                    driveStatusBadge.className = 'drive-status-tag active';
                    driveStatusDot.textContent = '🟢';
                    driveStatusText.textContent = '鍵盤操控功能：運行中';

                    if (currentGameMode === 'ranked') {
                        // 排位賽模式：按下開始後強制切換並鎖定車子視角
                        if (maze3D && maze3D.currentMode !== 'driver') {
                            maze3D.setMode('driver');
                        }
                        if (btnModeDriver) btnModeDriver.classList.add('active');
                        if (btnModeOrbit) {
                            btnModeOrbit.classList.remove('active');
                            btnModeOrbit.disabled = true;
                            btnModeOrbit.title = '排位賽進行中只能使用車子視角';
                        }
                        if (btnResetCam) {
                            btnResetCam.disabled = true;
                            btnResetCam.title = '排位賽進行中已鎖定車子視角';
                        }
                        if (driveTipText) {
                            driveTipText.innerHTML = '* 🏁 排位賽競技中已鎖定<strong>車子視角</strong>！請使用 WASD 或方向鍵操控小車全力衝向終點';
                        }
                    } else {
                        if (btnModeOrbit) {
                            btnModeOrbit.disabled = false;
                            btnModeOrbit.title = '3D 自由俯瞰視角';
                        }
                        if (btnResetCam) {
                            btnResetCam.disabled = false;
                            btnResetCam.title = '重設視角至標準角度';
                        }
                        if (driveTipText) {
                            driveTipText.innerHTML = '* 鍵盤已接管自走車！不論處於<strong>俯瞰</strong>或<strong>車子視角</strong>均可使用 WASD 或方向鍵操控小車';
                        }
                    }
                } else {
                    btnStartDrive.disabled = false;
                    btnStartDrive.classList.remove('driving-active');
                    btnStopDrive.disabled = true;

                    driveStatusBadge.className = 'drive-status-tag inactive';
                    driveStatusDot.textContent = '⚪';
                    driveStatusText.textContent = '鍵盤操控功能：已停止';

                    // 比賽開始前或停止遙控後：解除視角鎖定，允許自由切換俯瞰/車載視角
                    if (btnModeOrbit) {
                        btnModeOrbit.disabled = false;
                        btnModeOrbit.title = '3D 自由俯瞰視角';
                    }
                    if (btnResetCam) {
                        btnResetCam.disabled = false;
                        btnResetCam.title = '重設視角至標準角度';
                    }

                    if (driveTipText) {
                        if (currentGameMode === 'ranked') {
                            driveTipText.innerHTML = '* 💡 排位賽開始前可切換<strong>俯瞰/車載視角</strong>觀察地圖；按下【▶ 開始遙控】後將鎖定為車子視角';
                        } else {
                            driveTipText.innerHTML = '* 請點擊右上方「<strong>▶ 開始操控</strong>」按鈕以啟用鍵盤功能';
                        }
                    }

                    if (timerRunning) {
                        pauseTimer();
                    }
                }
            }

            // 2D 編輯器實例 (預先宣告供 3D 即時回報同步)
            // 快取經常用到的 HUD DOM 節點，避免每幀重複檢索
            const posCmEl = document.getElementById('posCm');
            const posCellEl = document.getElementById('posCell');

            // 1. 初始化 3D 模擬場景
            const maze3D = new Maze3D(canvasContainer, {
                onGoalReached: () => {
                    pauseTimer();
                    maze3D.stopDriving();

                    if (currentGameMode === 'ranked') {
                        // 排位賽成績結算
                        const totalSec = (timerElapsedMs / 1000).toFixed(2);
                        const timeUsedMs = Math.round(timerElapsedMs);
                        const timeRemainMs = Math.max(0, Math.round(countdownLimitMs - timerElapsedMs));
                        const remainSec = (timeRemainMs / 1000).toFixed(2);

                        const rankedModal = document.getElementById('rankedVictoryModal');
                        const timeValEl = document.getElementById('rankedVictoryTimeValue');
                        const timeSubEl = document.getElementById('rankedVictoryTimeSub');
                        const rankNumEl = document.getElementById('rankedVictoryRankNum');
                        const victoryMsgEl = document.getElementById('rankedVictoryMsg');

                        if (timeValEl) timeValEl.textContent = `${totalSec} 秒`;
                        if (timeSubEl) timeSubEl.innerHTML = `完賽耗時：<strong>${totalSec} 秒</strong> | 剩餘時間：<strong>${remainSec} 秒</strong>`;
                        if (rankNumEl) rankNumEl.textContent = '結算中...';
                        if (victoryMsgEl) victoryMsgEl.textContent = '正在驗證並登錄全服排位天梯排行榜...';

                        if (rankedModal) rankedModal.style.display = 'block';

                        fetch('ranked_api.php?action=submit_score', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                size: currentRankedSize,
                                map_id: currentRankedMapId,
                                time_used_ms: timeUsedMs,
                                time_remain_ms: timeRemainMs
                            })
                        })
                        .then(res => res.json())
                        .then(res => {
                            if (res.success) {
                                if (rankNumEl) rankNumEl.textContent = res.rank ? res.rank : '1';
                                if (victoryMsgEl) {
                                    if (res.isBest) {
                                        victoryMsgEl.innerHTML = `🔥 <strong>恭喜刷新個人最佳紀錄！</strong>目前榮登全服天梯 <strong>第 ${res.rank} 名</strong>！`;
                                        showToast(`🏆 刷新個人最佳！天梯榮登第 ${res.rank} 名！`);
                                    } else {
                                        const bestSec = res.bestTimeMs ? (res.bestTimeMs / 1000).toFixed(2) : '-';
                                        victoryMsgEl.innerHTML = `完賽！本次耗時 <strong>${totalSec} 秒</strong>（歷史最佳：<strong>${bestSec} 秒</strong>）。天梯榜已保留您的最佳紀錄，名列全服 <strong>第 ${res.rank} 名</strong>！`;
                                        showToast(`🏁 完賽！天梯已保留個人最佳成績 (第 ${res.rank} 名)`);
                                    }
                                }
                            } else {
                                if (rankNumEl) rankNumEl.textContent = '-';
                                if (victoryMsgEl) victoryMsgEl.textContent = res.message || '結算完成';
                            }
                        })
                        .catch(err => {
                            console.error('排位成績提交失敗:', err);
                            if (rankNumEl) rankNumEl.textContent = '-';
                            if (victoryMsgEl) victoryMsgEl.textContent = '無法連接伺服器登錄成績';
                        });

                        return;
                    }

                    // 練習賽結算
                    const modal = document.getElementById('victoryModal');
                    const timeLabel = document.getElementById('victoryTimeLabel');
                    const timeValue = document.getElementById('victoryTimeValue');
                    const timeSub = document.getElementById('victoryTimeSub');
                    const victoryMsg = document.getElementById('victoryMsg');

                    const totalSec = (timerElapsedMs / 1000).toFixed(1);
                    const formatted = formatTimeDisplay(timerElapsedMs);

                    const cols = (editor && editor.cols) || 10;
                    const rows = (editor && editor.rows) || 10;

                    if (currentTimerMode === 'up') {
                        timeLabel.textContent = '🏁 完賽成績';
                        timeValue.textContent = formatted;
                        timeSub.innerHTML = `總共花費：<strong>${totalSec} 秒</strong> 順利走出迷宮！`;
                        victoryMsg.textContent = `🎉 恭喜順利抵達終點！已成功走出 ${cols}×${rows} 迷宮！`;
                    } else {
                        const remainSec = Math.max(0, (countdownLimitMs - timerElapsedMs) / 1000).toFixed(1);
                        timeLabel.textContent = `🏆 ${countdownLabel}成功！`;
                        timeValue.textContent = formatted;
                        timeSub.innerHTML = `耗時：<strong>${totalSec} 秒</strong> | 剩餘時間：<strong>${remainSec} 秒</strong>`;
                        victoryMsg.textContent = `太厲害了！成功在 ${countdownDesc} 限時內走出 ${cols}×${rows} 迷宮！`;
                    }

                    modal.style.display = 'block';
                },
                onPositionUpdate: (pos) => {
                    if (posCmEl) posCmEl.textContent = `X: ${pos.xCm} cm, Y: ${pos.zCm} cm`;
                    if (posCellEl) posCellEl.textContent = `格 (${pos.cellX}, ${pos.cellY})`;
                    if (editor) {
                        editor.updateCarPosition(pos);
                    }
                },
                onDrivingChange: (isDriving) => {
                    updateDrivingUI(isDriving);
                }
            });

            // 2. 初始化 2D 編輯器 (設計時預設為較大尺寸 560px)
            editor = new MazeEditor(svgElement, {
                baseSize: 560,
                onUpdate: (data) => {
                    // 同步到 3D
                    maze3D.buildMaze3D(data);

                    if (timerRunning) {
                        maze3D.stopDriving();
                        resetTimer();
                    }

                    const cols = data.gridSize ? data.gridSize.cols : 10;
                    const rows = data.gridSize ? data.gridSize.rows : 10;

                    // 更新規格 Tags 與輸入框
                    const tagGrid = document.getElementById('headerTagGrid');
                    const tagTotal = document.getElementById('headerTagTotal');
                    const specDim = document.getElementById('specDimensionsCm');
                    if (tagGrid) tagGrid.textContent = `規格：${cols}×${rows} 格`;
                    if (tagTotal) tagTotal.textContent = `總長寬：${cols * 30}×${rows * 30} cm`;
                    if (specDim) specDim.textContent = `${cols * 30} × ${rows * 30} cm`;

                    const inputCols = document.getElementById('inputCols');
                    const inputRows = document.getElementById('inputRows');
                    if (inputCols) inputCols.value = cols;
                    if (inputRows) inputRows.value = rows;

                    // 更新預設按鈕的高亮
                    document.querySelectorAll('.spec-preset-btn').forEach(btn => {
                        const bc = parseInt(btn.getAttribute('data-cols'), 10);
                        const br = parseInt(btn.getAttribute('data-rows'), 10);
                        if (bc === cols && br === rows) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });

                    // 更新 UI 狀態
                    document.getElementById('statStart').textContent = `(${data.start.x}, ${data.start.y})`;
                    document.getElementById('statGoal').textContent = `(${data.goal.x}, ${data.goal.y})`;

                    // 計算牆壁數量
                    let hCount = 0;
                    data.hWalls.forEach(row => row.forEach(val => { if (val) hCount++; }));
                    let vCount = 0;
                    data.vWalls.forEach(row => row.forEach(val => { if (val) vCount++; }));
                    document.getElementById('statWallCount').textContent = (hCount + vCount);
                }
            });

            // 2-0. 初始化 2D 地圖縮放 (Zoom) 與拖曳平移 (Pan) 系統
            const mapViewport = document.getElementById('mapViewport');
            if (mapViewport && editor.initZoomAndPan) {
                editor.initZoomAndPan(mapViewport);
            }

            // 綁定地圖縮放控制列按鈕
            const btnZoomIn = document.getElementById('btnZoomIn');
            const btnZoomOut = document.getElementById('btnZoomOut');
            const btnZoomReset = document.getElementById('btnZoomReset');
            const btnZoomFit = document.getElementById('btnZoomFit');
            const zoomPercentDisplay = document.getElementById('zoomPercentDisplay');

            if (btnZoomIn) btnZoomIn.addEventListener('click', () => editor.zoomIn());
            if (btnZoomOut) btnZoomOut.addEventListener('click', () => editor.zoomOut());
            if (btnZoomReset) btnZoomReset.addEventListener('click', () => editor.resetZoom());
            if (btnZoomFit) btnZoomFit.addEventListener('click', () => editor.fitZoom());
            if (zoomPercentDisplay) zoomPercentDisplay.addEventListener('click', () => editor.resetZoom());

            // 2-0-1. 2D 地圖與版面切換控制 (設計時用一半版面 50%，遙控時恢復正常大小 480px)
            const editorPanel = document.querySelector('.editor-panel');
            const btnToggleMapSize = document.getElementById('btnToggleMapSize');
            const mapSizeIcon = document.getElementById('mapSizeIcon');
            const mapSizeText = document.getElementById('mapSizeText');
            let currentMapMode = 'large'; // 'large' (設計時 50% 一半版面) 或 'compact' (遙控時恢復正常大小)

            function getOptimalDesignCanvasSize() {
                // 設計時 50% 版面下的最佳畫布像素尺寸 (兼顧寬度與高度)
                const panelWidth = editorPanel ? editorPanel.clientWidth : (window.innerWidth * 0.5);
                const maxW = Math.floor(panelWidth - 64);
                const maxH = Math.floor(window.innerHeight - 270);
                return Math.max(480, Math.min(620, maxW > 0 ? maxW : 560, maxH > 400 ? maxH : 560));
            }

            function set2DMapMode(mode, showNotification = false) {
                if (!editor) return;
                currentMapMode = mode;
                if (mode === 'compact') {
                    // 遙控時：恢復正常大小 (420px)，左側收納至 480px，右側 3D 享有寬敞視野
                    editorPanel.classList.add('mode-compact');
                    editor.setCanvasBaseSize(400);
                    if (mapSizeIcon) mapSizeIcon.textContent = '🚗';
                    if (mapSizeText) mapSizeText.textContent = '遙控模式';
                    if (btnToggleMapSize) {
                        btnToggleMapSize.classList.add('compact');
                        btnToggleMapSize.title = '點擊切換為一半版面設計模式 (50% 寬度)';
                    }
                    if (showNotification) showToast('🚗 已切換為遙控模式！');
                } else {
                    // 設計時：使用一半版面 (50%)，畫布自適應大圖，方便精準規劃與點選牆壁
                    editorPanel.classList.remove('mode-compact');
                    const designSize = getOptimalDesignCanvasSize();
                    editor.setCanvasBaseSize(designSize);
                    if (mapSizeIcon) mapSizeIcon.textContent = '🌓';
                    if (mapSizeText) mapSizeText.textContent = '一半版面設計';
                    if (btnToggleMapSize) {
                        btnToggleMapSize.classList.remove('compact');
                        btnToggleMapSize.title = '點擊切換為遙控模式 (480px 寬度)';
                    }
                    if (showNotification) showToast('🌓 已切換為一半版面設計模式！');
                }
                editor.resetZoom(true);

                // 配合 CSS 0.35s 寬度過渡，更新 3D 視角
                if (window.maze3D) {
                    maze3D.onWindowResize();
                    setTimeout(() => maze3D.onWindowResize(), 150);
                    setTimeout(() => maze3D.onWindowResize(), 360);
                }
            }

            // 手動點選切換按鈕
            if (btnToggleMapSize) {
                btnToggleMapSize.addEventListener('click', () => {
                    set2DMapMode(currentMapMode === 'large' ? 'compact' : 'large', true);
                });
            }

            // 監聽 3D 畫布容器大小改變，確保平滑過渡
            if (window.ResizeObserver && canvasContainer) {
                const ro = new ResizeObserver(() => {
                    if (maze3D) maze3D.onWindowResize();
                });
                ro.observe(canvasContainer);
            }

            // 視窗縮放時自適應設計大圖
            window.addEventListener('resize', () => {
                if (currentMapMode === 'large' && editor) {
                    editor.setCanvasBaseSize(getOptimalDesignCanvasSize());
                }
            });

            // 2-1. 規格調整與登入權限檢查 (未登入僅限使用 10×10 含以下地圖)
            function applyGridSizeDirect(c, r) {
                if (timerRunning) {
                    maze3D.stopDriving();
                    resetTimer();
                }
                if (currentMapMode === 'compact') {
                    set2DMapMode('large', false);
                }
                editor.setGridSize(c, r);
                maze3D.resetOrbitCamera();
                showToast(`📐 已成功切換規格為 ${c}×${r} 格！`);
            }

            function requestApplyGridSize(c, r) {
                if (isNaN(c) || c < 2 || c > 30 || isNaN(r) || r < 2 || r > 30) {
                    showToast('規格數值請輸入 2 ~ 30 之間的整數！', true);
                    return false;
                }

                // 檢查未登入限制：沒有登入只能使用 10*10 含以下地圖
                if (!currentUser && (c > 10 || r > 10)) {
                    pendingTargetGrid = { cols: c, rows: r };
                    showToast(`🔒 訪客限制：未登入僅限使用 10×10 (含) 以下地圖！您欲使用 ${c}×${r} 格，請先登入！`, true);
                    openAuthModal(
                        `🔒 規格權限提示：\n您選擇了 ${c}×${r} 格大型地圖。\n未登入訪客僅限使用 10×10 (含) 以下規格！\n\n請先登入或註冊帳號，完成後將自動為您解鎖套用！`,
                        'login'
                    );
                    return false;
                }

                applyGridSizeDirect(c, r);
                return true;
            }

            const btnApplyGridSize = document.getElementById('btnApplyGridSize');
            if (btnApplyGridSize) {
                btnApplyGridSize.addEventListener('click', () => {
                    const c = parseInt(document.getElementById('inputCols').value, 10);
                    const r = parseInt(document.getElementById('inputRows').value, 10);
                    requestApplyGridSize(c, r);
                });
            }

            document.querySelectorAll('.spec-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const c = parseInt(btn.getAttribute('data-cols'), 10);
                    const r = parseInt(btn.getAttribute('data-rows'), 10);
                    if (c && r) {
                        requestApplyGridSize(c, r);
                    }
                });
            });

            // 3. 工具切換 (設置牆壁 / 設定起點 / 設定終點 / 拖曳平移)
            const toolButtons = [
                { id: 'toolWall', tool: 'wall', tip: '目前工具：點擊格線增刪 15cm 牆壁 (支援滾輪縮放)' },
                { id: 'toolStart', tool: 'start', tip: '目前工具：點擊任一格設定為【起點】' },
                { id: 'toolGoal', tool: 'goal', tip: '目前工具：點擊任一格設定為【終點】' },
                { id: 'toolPan', tool: 'pan', tip: '目前工具：按住滑鼠左鍵即可拖曳平移 2D 地圖 (亦可滾輪縮放)' }
            ];

            toolButtons.forEach(btnObj => {
                const el = document.getElementById(btnObj.id);
                el.addEventListener('click', () => {
                    toolButtons.forEach(b => document.getElementById(b.id).classList.remove('active'));
                    el.classList.add('active');
                    editor.setTool(btnObj.tool);
                    document.getElementById('toolTip').textContent = btnObj.tip;
                    if (currentMapMode === 'compact') {
                        set2DMapMode('large', false);
                    }
                });
            });

            // 4. 輔助操作與匯出入按鈕
            document.getElementById('btnOuterWalls').addEventListener('click', () => {
                if (currentMapMode === 'compact') set2DMapMode('large', false);
                const state = editor.toggleOuterWalls();
                showToast(state ? '🔲 已開啟四周圍牆' : '🔲 已關閉四周圍牆');
            });
            document.getElementById('btnClearInner').addEventListener('click', () => {
                if (currentMapMode === 'compact') set2DMapMode('large', false);
                editor.clearInnerWalls();
                showToast('🧹 已清空內部牆壁 (保留四周圍牆)');
            });
            document.getElementById('btnClearAll').addEventListener('click', () => {
                if (currentMapMode === 'compact') set2DMapMode('large', false);
                editor.clearAllWalls();
                showToast('🗑️ 已清空所有牆壁 (包含四周圍牆)');
            });
            document.getElementById('btnRandom').addEventListener('click', () => {
                if (currentMapMode === 'compact') set2DMapMode('large', false);
                editor.generateRandomMaze();
                showToast('🎲 已隨機生成迷宮！');
            });

            // 匯出 2D 地圖 (高解析 PNG 圖片)
            document.getElementById('btnExportPNG').addEventListener('click', () => {
                editor.exportPNG(
                    () => showToast('🖼️ 2D 迷宮圖片已成功匯出下載！'),
                    (errMsg) => showToast(errMsg, true)
                );
            });

            // 匯出 JSON 資料
            document.getElementById('btnExportJSON').addEventListener('click', () => {
                editor.exportJSON(() => showToast('📄 迷宮設定 JSON 已成功匯出！'));
            });

            // 匯入 JSON 資料
            const fileInputJSON = document.getElementById('fileInputJSON');
            document.getElementById('btnImportJSON').addEventListener('click', () => {
                fileInputJSON.value = '';
                fileInputJSON.click();
            });

            fileInputJSON.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    editor.importJSON(
                        file,
                        () => showToast('📥 已成功載入迷宮設定！'),
                        (errMsg) => showToast(errMsg, true)
                    );
                }
            });

            // 5. 3D 視角切換 (俯瞰 / 車子視角)
            btnModeOrbit.addEventListener('click', () => {
                if (currentGameMode === 'ranked' && maze3D.isDriving) {
                    showToast('🔒 排位賽進行中只能使用車子視角！', true);
                    return;
                }
                btnModeOrbit.classList.add('active');
                btnModeDriver.classList.remove('active');
                maze3D.setMode('orbit');
            });

            btnModeDriver.addEventListener('click', () => {
                btnModeDriver.classList.add('active');
                btnModeOrbit.classList.remove('active');
                maze3D.setMode('driver');
            });

            // 6. 開始 / 停止 / 回起點 操作
            btnStartDrive.addEventListener('click', () => {
                document.getElementById('victoryModal').style.display = 'none';
                document.getElementById('timeoutModal').style.display = 'none';
                document.getElementById('rankedVictoryModal').style.display = 'none';
                document.getElementById('rankedTimeoutModal').style.display = 'none';
                btnStartDrive.classList.remove('pulse-prompt');
                if (editor) editor.clearCarTrail();
                maze3D.startDriving(true);
                startTimer(true);
                // 遙控時：若是練習賽自動切換為正常大小，方便在 2D 與 3D 觀察小車位置
                if (currentGameMode === 'practice') {
                    set2DMapMode('compact', true);
                }
                showToast(currentTimerMode === 'up' ? '已自動定位起點，完賽計時開始！' : `已自動定位起點，${countdownLabel}開始！`);
            });

            btnStopDrive.addEventListener('click', () => {
                maze3D.stopDriving();
                pauseTimer();
                btnStartDrive.classList.remove('pulse-prompt');
                // 停止遙控後：若是練習賽自動恢復為大圖設計模式
                if (currentGameMode === 'practice') {
                    set2DMapMode('large', true);
                }
            });

            btnResetCar.addEventListener('click', () => {
                document.getElementById('rankedVictoryModal').style.display = 'none';
                document.getElementById('rankedTimeoutModal').style.display = 'none';
                maze3D.stopDriving();
                maze3D.placePlayerAtStart();
                resetTimer();
                if (editor) editor.clearCarTrail();
                btnStartDrive.classList.add('pulse-prompt');
                // 回起點後：若是練習賽恢復為大圖設計模式
                if (currentGameMode === 'practice') {
                    set2DMapMode('large', false);
                }
                showToast('自走車已回到起點，請點擊【▶ 開始遙控】開始計時！');
            });

            btnResetCam.addEventListener('click', () => {
                if (currentGameMode === 'ranked' && maze3D.isDriving) {
                    showToast('🔒 排位賽進行中視角已鎖定於自走車！', true);
                    return;
                }
                if (maze3D.currentMode === 'orbit') {
                    maze3D.resetOrbitCamera();
                } else {
                    maze3D.placePlayerAtStart();
                }
            });

            // 6-1. 牆壁材質切換
            ['Wood', 'White', 'Cyber'].forEach(theme => {
                const btn = document.getElementById('btnTheme' + theme);
                btn.addEventListener('click', () => {
                    ['Wood', 'White', 'Cyber'].forEach(t => document.getElementById('btnTheme' + t).classList.remove('active'));
                    btn.classList.add('active');
                    maze3D.setTheme(theme.toLowerCase());
                });
            });

            // 7. 過關與超時視窗重設 (重設回起點並重設計時，需點擊「開始遙控」才開始計時)
            document.getElementById('btnVictoryRestart').addEventListener('click', () => {
                document.getElementById('victoryModal').style.display = 'none';
                maze3D.stopDriving();
                maze3D.placePlayerAtStart();
                resetTimer();
                if (editor) editor.clearCarTrail();
                btnStartDrive.classList.add('pulse-prompt');
                set2DMapMode('large', false);
                showToast('自走車已重設回起點，請點擊【▶ 開始遙控】開始計時！');
            });

            document.getElementById('btnTimeoutRestart').addEventListener('click', () => {
                document.getElementById('timeoutModal').style.display = 'none';
                maze3D.stopDriving();
                maze3D.placePlayerAtStart();
                resetTimer();
                if (editor) editor.clearCarTrail();
                btnStartDrive.classList.add('pulse-prompt');
                set2DMapMode('large', false);
                showToast('自走車已重設回起點，請點擊【▶ 開始遙控】開始計時！');
            });

            // ============================================
            // 8. 帳號認證與權限管理系統 (Auth & Permission System)
            // ============================================
            let currentUser = null; // null: 訪客 (限 10x10), { id, username }: 已登入會員 (解鎖至 30x30)
            let pendingTargetGrid = null; // 暫存使用者嘗試套用但受限的規格 { cols, rows }

            const authBadge = document.getElementById('authBadge');
            const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
            const btnLogout = document.getElementById('btnLogout');
            const authModalBackdrop = document.getElementById('authModalBackdrop');
            const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
            const tabBtnLogin = document.getElementById('tabBtnLogin');
            const tabBtnRegister = document.getElementById('tabBtnRegister');
            const formLogin = document.getElementById('formLogin');
            const formRegister = document.getElementById('formRegister');
            const authAlert = document.getElementById('authAlert');
            const linkToRegister = document.getElementById('linkToRegister');
            const linkToLogin = document.getElementById('linkToLogin');

            function showAuthAlert(msg, type = 'error') {
                if (!authAlert) return;
                authAlert.textContent = msg;
                authAlert.className = `auth-alert ${type}`;
                authAlert.style.display = 'block';
            }

            function clearAuthAlert() {
                if (!authAlert) return;
                authAlert.textContent = '';
                authAlert.className = 'auth-alert';
                authAlert.style.display = 'none';
            }

            function escapeHtml(str) {
                if (!str) return '';
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            // 開啟 / 關閉帳號視窗
            function openAuthModal(customMsg = '', defaultTab = 'login') {
                if (!authModalBackdrop) return;
                switchAuthTab(defaultTab);
                if (customMsg) {
                    showAuthAlert(customMsg, 'warning');
                } else {
                    clearAuthAlert();
                }
                authModalBackdrop.classList.add('show');
                setTimeout(() => {
                    if (defaultTab === 'login') {
                        document.getElementById('loginUsername')?.focus();
                    } else {
                        document.getElementById('regUsername')?.focus();
                    }
                }, 100);
            }

            function closeAuthModal() {
                if (!authModalBackdrop) return;
                authModalBackdrop.classList.remove('show');
                clearAuthAlert();
                const lp = document.getElementById('loginPassword');
                const rp = document.getElementById('regPassword');
                const rcp = document.getElementById('regConfirmPassword');
                if (lp) lp.value = '';
                if (rp) rp.value = '';
                if (rcp) rcp.value = '';
            }

            // 切換 登入 / 註冊 頁籤
            function switchAuthTab(tab) {
                clearAuthAlert();
                if (tab === 'register') {
                    tabBtnRegister.classList.add('active');
                    tabBtnLogin.classList.remove('active');
                    formRegister.style.display = 'flex';
                    formLogin.style.display = 'none';
                } else {
                    tabBtnLogin.classList.add('active');
                    tabBtnRegister.classList.remove('active');
                    formLogin.style.display = 'flex';
                    formRegister.style.display = 'none';
                }
            }

            tabBtnLogin?.addEventListener('click', () => switchAuthTab('login'));
            tabBtnRegister?.addEventListener('click', () => switchAuthTab('register'));
            linkToRegister?.addEventListener('click', () => switchAuthTab('register'));
            linkToLogin?.addEventListener('click', () => switchAuthTab('login'));
            btnCloseAuthModal?.addEventListener('click', closeAuthModal);
            authModalBackdrop?.addEventListener('click', (e) => {
                if (e.target === authModalBackdrop) closeAuthModal();
            });

            // 重新整理 Header 上的個人地圖庫數量徽章
            function refreshMapLibraryBadge() {
                const headerMapCountBadge = document.getElementById('headerMapCountBadge');
                if (!headerMapCountBadge) return;
                if (!currentUser) {
                    headerMapCountBadge.textContent = '(需登入)';
                    return;
                }
                fetch('api.php?action=list')
                    .then(res => res.json())
                    .then(res => {
                        if (res.success) {
                            headerMapCountBadge.textContent = `(${res.count || 0}/${res.max || 5})`;
                        }
                    })
                    .catch(() => {});
            }

            // 更新使用者狀態與規格鎖定 UI
            function updateAuthUI(user) {
                currentUser = user;
                const presetButtons = document.querySelectorAll('.spec-preset-btn');
                const btnSave = document.getElementById('btnSave');
                const btnMapLibrary = document.getElementById('btnMapLibrary');
                const headerMapCountBadge = document.getElementById('headerMapCountBadge');
                const btnPublishToRanked = document.getElementById('btnPublishToRanked');
                
                if (user) {
                    // 已登入
                    authBadge.className = 'auth-status-badge logged-in';
                    authBadge.innerHTML = `<span class="badge-icon">👑</span><span class="badge-text">${escapeHtml(user.username)} (全規格解鎖)</span>`;
                    btnOpenAuthModal.style.display = 'none';
                    btnLogout.style.display = 'inline-flex';

                    // 解除所有預設按鈕鎖定
                    presetButtons.forEach(btn => {
                        const cols = parseInt(btn.getAttribute('data-cols'), 10);
                        const rows = parseInt(btn.getAttribute('data-rows'), 10);
                        btn.classList.remove('locked');
                        btn.textContent = `${cols}×${rows}`;
                        btn.title = `套用 ${cols}×${rows} 規格`;
                    });

                    const inputCols = document.getElementById('inputCols');
                    const inputRows = document.getElementById('inputRows');
                    if (inputCols) inputCols.title = '會員特權：已解鎖支援 2 ~ 30 格';
                    if (inputRows) inputRows.title = '會員特權：已解鎖支援 2 ~ 30 格';

                    // 會員解鎖儲存、個人地圖庫與發布按鈕
                    if (btnSave) {
                        btnSave.classList.remove('guest-locked');
                        btnSave.innerHTML = '<span>💾</span> 儲存迷宮設定 (PHP)';
                        btnSave.title = '將目前迷宮儲存至您的個人雲端資料庫 (最多 5 張)';
                    }
                    if (btnMapLibrary) {
                        btnMapLibrary.classList.remove('guest-locked');
                        btnMapLibrary.title = '開啟我的迷宮圖庫 (管理與載入已存地圖，最多 5 張)';
                    }
                    if (btnPublishToRanked) {
                        btnPublishToRanked.classList.remove('guest-locked');
                        btnPublishToRanked.innerHTML = '<span>📤</span> 發布至排位賽圖庫';
                        btnPublishToRanked.title = '將目前練習賽設計好的迷宮，一鍵發布至官方排位賽圖庫';
                    }
                    refreshMapLibraryBadge();
                } else {
                    // 訪客 (未登入)
                    authBadge.className = 'auth-status-badge guest';
                    authBadge.innerHTML = `<span class="badge-icon">👤</span><span class="badge-text">訪客模式 (限 10×10)</span>`;
                    btnOpenAuthModal.style.display = 'inline-flex';
                    btnLogout.style.display = 'none';

                    // 鎖定大於 10x10 的預設按鈕
                    presetButtons.forEach(btn => {
                        const cols = parseInt(btn.getAttribute('data-cols'), 10);
                        const rows = parseInt(btn.getAttribute('data-rows'), 10);
                        if (cols > 10 || rows > 10) {
                            btn.classList.add('locked');
                            btn.textContent = `🔒 ${cols}×${rows}`;
                            btn.title = `🔒 未登入已鎖定：登入帳號即可解鎖 ${cols}×${rows} 規格！`;
                        } else {
                            btn.classList.remove('locked');
                            btn.textContent = `${cols}×${rows}`;
                            btn.title = `套用 ${cols}×${rows} 規格`;
                        }
                    });

                    const inputCols = document.getElementById('inputCols');
                    const inputRows = document.getElementById('inputRows');
                    if (inputCols) inputCols.title = '訪客限制：最高 10 格 (登入可解鎖至 30 格)';
                    if (inputRows) inputRows.title = '訪客限制：最高 10 格 (登入可解鎖至 30 格)';

                    // 訪客限制：儲存、個人地圖庫與發布按鈕顯示鎖定狀態
                    if (btnSave) {
                        btnSave.classList.add('guest-locked');
                        btnSave.innerHTML = '<span>🔒</span> 儲存迷宮設定 (需登入)';
                        btnSave.title = '🔒 訪客限制：儲存個人迷宮至雲端資料庫需登入會員帳號！';
                    }
                    if (btnMapLibrary) {
                        btnMapLibrary.classList.add('guest-locked');
                        btnMapLibrary.title = '🔒 訪客限制：個人地圖庫功能需登入會員帳號！';
                    }
                    if (headerMapCountBadge) {
                        headerMapCountBadge.textContent = '(需登入)';
                    }
                    if (btnPublishToRanked) {
                        btnPublishToRanked.classList.add('guest-locked');
                        btnPublishToRanked.innerHTML = '<span>🔒</span> 發布至排位賽圖庫 (需登入)';
                        btnPublishToRanked.title = '🔒 訪客限制：發布自訂迷宮至官方排位賽圖庫需登入會員帳號！';
                    }
                }
            }

            // 檢查伺服器 Session 狀態
            function checkAuthStatus() {
                return fetch('auth.php?action=status')
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && res.loggedIn && res.user) {
                            updateAuthUI(res.user);
                        } else {
                            updateAuthUI(null);
                        }
                    })
                    .catch(err => {
                        console.warn('檢查登入狀態失敗:', err);
                        updateAuthUI(null);
                    });
            }

            // 登入送出
            document.getElementById('btnSubmitLogin')?.addEventListener('click', () => {
                const username = document.getElementById('loginUsername').value.trim();
                const password = document.getElementById('loginPassword').value;

                if (!username || !password) {
                    showAuthAlert('請輸入帳號與密碼！', 'error');
                    return;
                }

                showAuthAlert('⏳ 驗證登入中，請稍候...', 'warning');

                fetch('auth.php?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        updateAuthUI(res.user);
                        closeAuthModal();
                        showToast(res.message);

                        // 登入後載入該使用者的個人迷宮存檔
                        loadMazeConfig();

                        // 若之前有嘗試套用受限規格，登入後自動執行！
                        if (pendingTargetGrid) {
                            const { cols, rows } = pendingTargetGrid;
                            pendingTargetGrid = null;
                            setTimeout(() => {
                                applyGridSizeDirect(cols, rows);
                                showToast(`🎉 歡迎登入！已自動為您解鎖並套用 ${cols}×${rows} 大型迷宮！`);
                            }, 300);
                        }
                    } else {
                        showAuthAlert(res.message || '登入失敗，請確認帳號密碼！', 'error');
                    }
                })
                .catch(err => {
                    showAuthAlert('無法連接認證伺服器，請確認 XAMPP Apache 與 MySQL 服務已啟動。', 'error');
                });
            });

            // 註冊送出
            document.getElementById('btnSubmitRegister')?.addEventListener('click', () => {
                const username = document.getElementById('regUsername').value.trim();
                const password = document.getElementById('regPassword').value;
                const confirmPassword = document.getElementById('regConfirmPassword').value;

                if (!username || !password || !confirmPassword) {
                    showAuthAlert('請填寫完整註冊資訊！', 'error');
                    return;
                }
                if (username.length < 3) {
                    showAuthAlert('帳號名稱長度至少需 3 個字元！', 'error');
                    return;
                }
                if (password.length < 4) {
                    showAuthAlert('密碼長度至少需 4 個字元！', 'error');
                    return;
                }
                if (password !== confirmPassword) {
                    showAuthAlert('兩次輸入的密碼不一致！', 'error');
                    return;
                }

                showAuthAlert('⏳ 帳號建立中，請稍候...', 'warning');

                fetch('auth.php?action=register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password,
                        confirm_password: confirmPassword
                    })
                })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        updateAuthUI(res.user);
                        closeAuthModal();
                        showToast(res.message);

                        // 註冊成功後重新載入
                        loadMazeConfig();

                        if (pendingTargetGrid) {
                            const { cols, rows } = pendingTargetGrid;
                            pendingTargetGrid = null;
                            setTimeout(() => {
                                applyGridSizeDirect(cols, rows);
                                showToast(`🎉 恭喜註冊！已自動為您解鎖並套用 ${cols}×${rows} 大型迷宮！`);
                            }, 300);
                        }
                    } else {
                        showAuthAlert(res.message || '註冊失敗！', 'error');
                    }
                })
                .catch(err => {
                    showAuthAlert('無法連接認證伺服器，請確認 XAMPP Apache 與 MySQL 服務已啟動。', 'error');
                });
            });

            // 登出
            btnLogout?.addEventListener('click', () => {
                fetch('auth.php?action=logout', { method: 'POST' })
                    .then(res => res.json())
                    .then(res => {
                        updateAuthUI(null);
                        showToast(res.message || '您已成功登出！');

                        if (currentGameMode === 'ranked') {
                            switchGameMode('practice');
                        } else if (editor.cols > 10 || editor.rows > 10) {
                            applyGridSizeDirect(10, 10);
                            showToast('🚪 已切換回訪客模式，迷宮規格已自動重設為 10×10！');
                        }
                    })
                    .catch(err => {
                        showToast('登出失敗，請稍後再試', true);
                    });
            });

            btnOpenAuthModal?.addEventListener('click', () => {
                openAuthModal('', 'login');
            });

            // ============================================
            // 9. 儲存與讀取 (PHP + MySQL API - 支援每位使用者儲存最多 5 張迷宮)
            // ============================================

            const loadMazeConfig = () => {
                fetch('api.php')
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && res.data) {
                            // 若未登入且取到的資料大於 10x10，自動限制
                            if (!currentUser && (
                                (res.data.gridSize?.rows > 10) ||
                                (res.data.gridSize?.cols > 10)
                            )) {
                                showToast('🔒 訪客模式：已自動限縮為 10×10 迷宮地圖', true);
                                editor.setGridSize(10, 10);
                                return;
                            }
                            editor.loadData(res.data);
                            if (res.count !== undefined && res.max) {
                                const headerMapCountBadge = document.getElementById('headerMapCountBadge');
                                if (headerMapCountBadge && currentUser) {
                                    headerMapCountBadge.textContent = `(${res.count}/${res.max})`;
                                }
                            }
                        }
                    })
                    .catch(err => {
                        console.error('載入失敗:', err);
                        // 若無伺服器連線仍可正常使用預設配置
                        editor.notifyUpdate();
                    });
            };

            // 儲存迷宮彈窗相關 DOM 節點
            const saveMapModalBackdrop = document.getElementById('saveMapModalBackdrop');
            const btnCloseSaveMapModal = document.getElementById('btnCloseSaveMapModal');
            const btnCancelSaveMap = document.getElementById('btnCancelSaveMap');
            const btnConfirmSaveMap = document.getElementById('btnConfirmSaveMap');
            const saveQuotaCount = document.getElementById('saveQuotaCount');
            const saveQuotaProgressFill = document.getElementById('saveQuotaProgressFill');
            const saveCurrentSpec = document.getElementById('saveCurrentSpec');
            const saveCurrentWalls = document.getElementById('saveCurrentWalls');
            const saveMapNameInput = document.getElementById('saveMapNameInput');
            const slotOptionNewWrapper = document.getElementById('slotOptionNewWrapper');
            const radioSaveNew = document.getElementById('radioSaveNew');
            const slotNewDesc = document.getElementById('slotNewDesc');
            const mapFullWarning = document.getElementById('mapFullWarning');
            const saveExistingMapsList = document.getElementById('saveExistingMapsList');
            const saveOverwriteGroup = document.getElementById('saveOverwriteGroup');

            let userSavedMapsCache = [];

            function openSaveMapModal() {
                if (!currentUser) {
                    openAuthModal('🔒 訪客限制：【儲存迷宮設定至雲端資料庫】僅限會員使用！請先登入或免費註冊帳號。', 'login');
                    return;
                }
                if (currentGameMode === 'ranked') {
                    showToast('🔒 排位賽官方地圖禁止儲存至個人資料庫！請切換至【練習賽】進行迷宮儲存。', true);
                    return;
                }

                // 填入目前地圖資訊
                const cols = editor.cols;
                const rows = editor.rows;
                if (saveCurrentSpec) saveCurrentSpec.textContent = `${cols}×${rows} 格 (${cols * 30}×${rows * 30} cm)`;

                let wallCount = 0;
                const currentData = editor.getData();
                if (currentData.hWalls) {
                    currentData.hWalls.forEach(r => r.forEach(v => { if (v) wallCount++; }));
                }
                if (currentData.vWalls) {
                    currentData.vWalls.forEach(r => r.forEach(v => { if (v) wallCount++; }));
                }
                if (saveCurrentWalls) saveCurrentWalls.textContent = `${wallCount} 段`;

                if (saveMapNameInput) {
                    saveMapNameInput.value = `我的迷宮 (${cols}×${rows})`;
                }

                saveMapModalBackdrop?.classList.add('show');

                // 讀取當前地圖庫狀態
                fetch('api.php?action=list')
                    .then(res => res.json())
                    .then(res => {
                        if (!res.success) {
                            showToast(res.message || '讀取地圖庫失敗', true);
                            return;
                        }

                        userSavedMapsCache = res.list || [];
                        const count = res.count || 0;
                        const max = res.max || 5;
                        const remaining = res.remaining !== undefined ? res.remaining : Math.max(0, max - count);

                        // 更新配額進度條
                        if (saveQuotaCount) {
                            saveQuotaCount.textContent = `已存 ${count} / ${max} 張 (剩餘 ${remaining} 格可用)`;
                        }
                        if (saveQuotaProgressFill) {
                            const pct = Math.min(100, (count / max) * 100);
                            saveQuotaProgressFill.style.width = `${pct}%`;
                            saveQuotaProgressFill.className = 'quota-progress-fill' + (count >= max ? ' danger' : (count >= 4 ? ' warn' : ''));
                        }

                        const headerMapCountBadge = document.getElementById('headerMapCountBadge');
                        if (headerMapCountBadge) headerMapCountBadge.textContent = `(${count}/${max})`;

                        // 判斷是否已滿 5 張
                        if (count >= max) {
                            // 滿額：禁用存為全新地圖
                            if (slotOptionNewWrapper) {
                                slotOptionNewWrapper.style.opacity = '0.4';
                                slotOptionNewWrapper.style.pointerEvents = 'none';
                                slotOptionNewWrapper.classList.remove('active');
                            }
                            if (radioSaveNew) radioSaveNew.checked = false;
                            if (mapFullWarning) mapFullWarning.style.display = 'block';
                        } else {
                            if (slotOptionNewWrapper) {
                                slotOptionNewWrapper.style.opacity = '1';
                                slotOptionNewWrapper.style.pointerEvents = 'auto';
                                slotOptionNewWrapper.classList.add('active');
                            }
                            if (radioSaveNew) radioSaveNew.checked = true;
                            if (slotNewDesc) slotNewDesc.textContent = `使用第 ${count + 1} / ${max} 個儲存槽 (尚餘 ${remaining} 個名額)`;
                            if (mapFullWarning) mapFullWarning.style.display = 'none';
                        }

                        // 渲染現有地圖列表供覆蓋
                        if (userSavedMapsCache.length === 0) {
                            if (saveOverwriteGroup) saveOverwriteGroup.style.display = 'none';
                            if (saveExistingMapsList) saveExistingMapsList.innerHTML = '';
                        } else {
                            if (saveOverwriteGroup) saveOverwriteGroup.style.display = 'flex';
                            let html = '';
                            userSavedMapsCache.forEach((m, idx) => {
                                const isChecked = (count >= max && idx === 0) ? 'checked' : '';
                                html += `
                                    <label class="existing-map-slot-label ${isChecked ? 'selected' : ''}">
                                        <input type="radio" name="saveTargetMode" value="${m.id}" ${isChecked}>
                                        <div class="existing-slot-info">
                                            <span class="existing-slot-name">🗺️ ${escapeHtml(m.name)}</span>
                                            <div class="existing-slot-meta">
                                                <span class="library-spec-badge">${m.spec}</span>
                                                <span>🕒 ${m.updatedAt ? m.updatedAt.substring(0, 16) : ''}</span>
                                            </div>
                                        </div>
                                    </label>
                                `;
                            });
                            if (saveExistingMapsList) saveExistingMapsList.innerHTML = html;

                            // 綁定點選反白狀態
                            saveExistingMapsList.querySelectorAll('input[type="radio"]').forEach(radio => {
                                radio.addEventListener('change', () => {
                                    if (radio.checked) {
                                        slotOptionNewWrapper?.classList.remove('active');
                                        saveExistingMapsList.querySelectorAll('.existing-map-slot-label').forEach(lbl => lbl.classList.remove('selected'));
                                        radio.closest('.existing-map-slot-label')?.classList.add('selected');

                                        // 自動將選中的地圖名稱帶入輸入框
                                        const selectedMap = userSavedMapsCache.find(x => x.id === parseInt(radio.value, 10));
                                        if (selectedMap && saveMapNameInput) {
                                            saveMapNameInput.value = selectedMap.name;
                                        }
                                    }
                                });
                            });
                        }
                    })
                    .catch(err => {
                        console.error('查詢地圖庫錯誤:', err);
                    });
            }

            function closeSaveMapModal() {
                saveMapModalBackdrop?.classList.remove('show');
            }

            btnCloseSaveMapModal?.addEventListener('click', closeSaveMapModal);
            btnCancelSaveMap?.addEventListener('click', closeSaveMapModal);
            saveMapModalBackdrop?.addEventListener('click', (e) => {
                if (e.target === saveMapModalBackdrop) closeSaveMapModal();
            });

            radioSaveNew?.addEventListener('change', () => {
                if (radioSaveNew.checked) {
                    slotOptionNewWrapper?.classList.add('active');
                    saveExistingMapsList?.querySelectorAll('.existing-map-slot-label').forEach(lbl => lbl.classList.remove('selected'));
                    const cols = editor.cols;
                    const rows = editor.rows;
                    if (saveMapNameInput) saveMapNameInput.value = `我的迷宮 (${cols}×${rows})`;
                }
            });

            slotOptionNewWrapper?.addEventListener('click', () => {
                if (radioSaveNew && !radioSaveNew.disabled && radioSaveNew.offsetParent !== null) {
                    radioSaveNew.checked = true;
                    radioSaveNew.dispatchEvent(new Event('change'));
                }
            });

            btnConfirmSaveMap?.addEventListener('click', () => {
                if (!currentUser) {
                    closeSaveMapModal();
                    openAuthModal('🔒 請先登入會員帳號！', 'login');
                    return;
                }

                const selectedRadio = document.querySelector('input[name="saveTargetMode"]:checked');
                if (!selectedRadio) {
                    showToast('請選擇儲存槽位 (新增或覆蓋現有地圖)！', true);
                    return;
                }

                let targetMapId = 0;
                if (selectedRadio.value !== 'new') {
                    targetMapId = parseInt(selectedRadio.value, 10) || 0;
                }

                const customName = saveMapNameInput ? saveMapNameInput.value.trim() : '';
                const currentData = editor.getData();
                currentData.isRanked = false;
                currentData.name = customName;
                currentData.targetMapId = targetMapId;

                btnConfirmSaveMap.disabled = true;
                btnConfirmSaveMap.innerHTML = '<span>⏳</span> 雲端儲存中...';

                fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentData)
                })
                .then(res => res.json())
                .then(res => {
                    btnConfirmSaveMap.disabled = false;
                    btnConfirmSaveMap.innerHTML = '<span>💾</span> 確認儲存至雲端';

                    if (res.success) {
                        closeSaveMapModal();
                        showToast(res.message || '💾 迷宮已成功儲存至個人雲端資料庫！');
                        refreshMapLibraryBadge();
                    } else {
                        showToast(res.message || '儲存失敗', true);
                        if (res.requireLogin) {
                            closeSaveMapModal();
                            openAuthModal(res.message, 'login');
                        }
                    }
                })
                .catch(err => {
                    btnConfirmSaveMap.disabled = false;
                    btnConfirmSaveMap.innerHTML = '<span>💾</span> 確認儲存至雲端';
                    showToast('無法連接伺服器進行儲存', true);
                });
            });

            // 儲存按鈕點擊
            document.getElementById('btnSave').addEventListener('click', () => {
                if (currentGameMode === 'ranked') {
                    showToast('🔒 排位賽官方地圖禁止儲存至個人資料庫！請切換至【練習賽】進行迷宮儲存。', true);
                    return;
                }
                if (!currentUser) {
                    openAuthModal('🔒 訪客限制：【儲存迷宮設定至雲端資料庫】僅限會員使用！請先登入或免費註冊帳號。', 'login');
                    return;
                }
                openSaveMapModal();
            });

            // 地圖庫彈窗相關 DOM 節點
            const mapLibraryModalBackdrop = document.getElementById('mapLibraryModalBackdrop');
            const btnCloseMapLibraryModal = document.getElementById('btnCloseMapLibraryModal');
            const btnRefreshMapLibrary = document.getElementById('btnRefreshMapLibrary');
            const libraryQuotaCount = document.getElementById('libraryQuotaCount');
            const libraryQuotaProgressFill = document.getElementById('libraryQuotaProgressFill');
            const mapLibraryList = document.getElementById('mapLibraryList');

            function openMapLibraryModal() {
                if (!currentUser) {
                    openAuthModal('🔒 訪客限制：【我的個人地圖庫】僅限會員使用！請先登入或免費註冊帳號。', 'login');
                    return;
                }
                if (currentGameMode === 'ranked') {
                    showToast('排位賽中無法開啟個人圖庫，請切換至【練習賽】', true);
                    return;
                }

                mapLibraryModalBackdrop?.classList.add('show');
                loadMapLibraryList();
            }

            function closeMapLibraryModal() {
                mapLibraryModalBackdrop?.classList.remove('show');
            }

            btnCloseMapLibraryModal?.addEventListener('click', closeMapLibraryModal);
            mapLibraryModalBackdrop?.addEventListener('click', (e) => {
                if (e.target === mapLibraryModalBackdrop) closeMapLibraryModal();
            });
            btnRefreshMapLibrary?.addEventListener('click', loadMapLibraryList);

            function loadMapLibraryList() {
                if (!mapLibraryList) return;
                mapLibraryList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 32px;">⏳ 讀取個人地圖庫中...</div>';

                fetch('api.php?action=list')
                    .then(res => res.json())
                    .then(res => {
                        if (!res.success) {
                            mapLibraryList.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 24px;">無法載入地圖庫：${escapeHtml(res.message || '未知錯誤')}</div>`;
                            return;
                        }

                        const list = res.list || [];
                        const count = res.count || 0;
                        const max = res.max || 5;
                        const remaining = res.remaining !== undefined ? res.remaining : Math.max(0, max - count);

                        // 更新容量進度條
                        if (libraryQuotaCount) {
                            libraryQuotaCount.textContent = `已存 ${count} / ${max} 張 (尚餘 ${remaining} 個儲存槽)`;
                        }
                        if (libraryQuotaProgressFill) {
                            const pct = Math.min(100, (count / max) * 100);
                            libraryQuotaProgressFill.style.width = `${pct}%`;
                            libraryQuotaProgressFill.className = 'quota-progress-fill' + (count >= max ? ' danger' : (count >= 4 ? ' warn' : ''));
                        }

                        const headerMapCountBadge = document.getElementById('headerMapCountBadge');
                        if (headerMapCountBadge) headerMapCountBadge.textContent = `(${count}/${max})`;

                        if (list.length === 0) {
                            mapLibraryList.innerHTML = `
                                <div class="library-empty-box">
                                    <div class="library-empty-icon">📂</div>
                                    <div class="library-empty-text">您的個人地圖庫目前空空如也</div>
                                    <div class="library-empty-sub">每隻帳號可儲存最多 5 張迷宮！請在 2D 編輯器設計後點擊「💾 儲存迷宮設定」存入。</div>
                                </div>
                            `;
                            return;
                        }

                        let html = '';
                        list.forEach((m, idx) => {
                            html += `
                                <div class="map-library-item">
                                    <div class="library-item-main">
                                        <div class="library-item-title">#${idx + 1} 🗺️ ${escapeHtml(m.name)}</div>
                                        <div class="library-item-meta">
                                            <span class="library-spec-badge">${m.spec} 格</span>
                                            <span class="library-date">🕒 更新於 ${m.updatedAt || m.createdAt || '-'}</span>
                                        </div>
                                    </div>
                                    <div class="library-item-actions">
                                        <button type="button" class="tool-btn btn-map-load" data-id="${m.id}" data-name="${escapeHtml(m.name)}">
                                            📥 載入地圖
                                        </button>
                                        <button type="button" class="tool-btn btn-map-delete" data-id="${m.id}" data-name="${escapeHtml(m.name)}">
                                            🗑️ 刪除
                                        </button>
                                    </div>
                                </div>
                            `;
                        });
                        mapLibraryList.innerHTML = html;

                        // 綁定載入按鈕
                        mapLibraryList.querySelectorAll('.btn-map-load').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const id = btn.getAttribute('data-id');
                                const name = btn.getAttribute('data-name');
                                loadUserMapById(id, name);
                            });
                        });

                        // 綁定刪除按鈕
                        mapLibraryList.querySelectorAll('.btn-map-delete').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const id = btn.getAttribute('data-id');
                                const name = btn.getAttribute('data-name');
                                deleteUserMapById(id, name);
                            });
                        });
                    })
                    .catch(err => {
                        mapLibraryList.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 24px;">伺服器連線失敗</div>';
                    });
            }

            function loadUserMapById(id, name) {
                fetch(`api.php?action=load&id=${id}`)
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && res.data) {
                            editor.loadData(res.data);
                            maze3D.resetOrbitCamera();
                            closeMapLibraryModal();
                            showToast(`🎉 已成功載入個人迷宮【${name || res.name}】！`);
                        } else {
                            showToast(res.message || '載入迷宮失敗', true);
                        }
                    })
                    .catch(err => {
                        showToast('無法連接伺服器載入地圖', true);
                    });
            }

            function deleteUserMapById(id, name) {
                if (!confirm(`確定要刪除迷宮【${name}】嗎？\n刪除後將釋放 1 個雲端儲存槽位，此動作無法復原！`)) {
                    return;
                }

                fetch(`api.php?action=delete&id=${id}`, { method: 'POST' })
                    .then(res => res.json())
                    .then(res => {
                        if (res.success) {
                            showToast(res.message || '地圖已刪除');
                            loadMapLibraryList();
                            refreshMapLibraryBadge();
                        } else {
                            showToast(res.message || '刪除失敗', true);
                        }
                    })
                    .catch(err => {
                        showToast('無法連接伺服器刪除地圖', true);
                    });
            }

            // 我的地圖庫按鈕點擊
            document.getElementById('btnMapLibrary')?.addEventListener('click', () => {
                if (currentGameMode === 'ranked') {
                    showToast('🔒 排位賽官方盲測模式禁止存取個人圖庫！請切換至【練習賽】進行管理。', true);
                    return;
                }
                if (!currentUser) {
                    openAuthModal('🔒 訪客限制：【我的個人地圖庫】功能僅限會員使用！請先登入或免費註冊帳號。', 'login');
                    return;
                }
                openMapLibraryModal();
            });

            // ============================================
            // 10. 排位賽與天梯排行榜系統 (Ranked Match & Leaderboard)
            // ============================================
            const btnModePractice = document.getElementById('btnModePractice');
            const btnModeRanked = document.getElementById('btnModeRanked');
            const btnOpenLeaderboard = document.getElementById('btnOpenLeaderboard');
            const practiceSpecBar = document.getElementById('practiceSpecBar');
            const rankedSpecBar = document.getElementById('rankedSpecBar');
            const practiceToolsToolbar = document.getElementById('practiceToolsToolbar');
            const rankedToolsBanner = document.getElementById('rankedToolsBanner');
            const practiceZoomBar = document.getElementById('practiceZoomBar');
            const rankedBlindOverlay = document.getElementById('rankedBlindOverlay');
            const gridWrapper = document.getElementById('gridWrapper');
            const leaderboardModalBackdrop = document.getElementById('leaderboardModalBackdrop');
            const btnCloseLeaderboardModal = document.getElementById('btnCloseLeaderboardModal');
            const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');
            const leaderboardTableBody = document.getElementById('leaderboardTableBody');
            const userBestBanner = document.getElementById('userBestBanner');

            let currentLeaderboardTab = '10x10';

            function switchGameMode(mode) {
                if (mode === 'ranked') {
                    if (!currentUser) {
                        openAuthModal('🔒 排位賽天梯功能需登入帳號以記錄全服排行榜積分！請先登入或註冊帳號。', 'login');
                        return;
                    }
                    currentGameMode = 'ranked';

                    btnModeRanked.classList.add('active');
                    btnModePractice.classList.remove('active');

                    practiceSpecBar.style.display = 'none';
                    rankedSpecBar.style.display = 'flex';
                    practiceToolsToolbar.style.display = 'none';
                    rankedToolsBanner.style.display = 'flex';
                    practiceZoomBar.style.display = 'none';
                    rankedBlindOverlay.style.display = 'flex';
                    gridWrapper.style.visibility = 'hidden';

                    // 排位賽時完全隱藏儲存與我的地圖庫按鈕，並顯示禁止儲存提示標籤
                    const btnSaveEl = document.getElementById('btnSave');
                    const btnMapLibraryEl = document.getElementById('btnMapLibrary');
                    const rankedNoSavePill = document.getElementById('rankedNoSavePill');
                    if (btnSaveEl) btnSaveEl.style.display = 'none';
                    if (btnMapLibraryEl) btnMapLibraryEl.style.display = 'none';
                    if (rankedNoSavePill) rankedNoSavePill.style.display = 'inline-flex';

                    if (btnToggleMapSize) btnToggleMapSize.style.display = 'none';
                    set2DMapMode('compact', false);

                    document.getElementById('headerTitleText').textContent = '3D 迷宮全服天梯排位賽 (盲測競技模式)';

                    // 排位賽：比賽開始前可以自由調整視角，確保視角切換功能啟用
                    if (btnModeOrbit) {
                        btnModeOrbit.disabled = false;
                        btnModeOrbit.title = '3D 自由俯瞰視角';
                    }
                    if (btnResetCam) {
                        btnResetCam.disabled = false;
                        btnResetCam.title = '重設視角至標準角度';
                    }
                    const walkTitleRanked = document.getElementById('simWalkControlTitle');
                    if (walkTitleRanked) walkTitleRanked.innerHTML = '<strong>🎮 行走控制 (排位賽啟動後強制車子視角)：</strong>';

                    // 關閉一般賽事彈窗
                    document.getElementById('victoryModal').style.display = 'none';
                    document.getElementById('timeoutModal').style.display = 'none';

                    loadRankedMatch(currentRankedSize);
                } else {
                    currentGameMode = 'practice';

                    btnModePractice.classList.add('active');
                    btnModeRanked.classList.remove('active');

                    practiceSpecBar.style.display = 'flex';
                    rankedSpecBar.style.display = 'none';
                    practiceToolsToolbar.style.display = 'flex';
                    rankedToolsBanner.style.display = 'none';
                    practiceZoomBar.style.display = 'flex';
                    rankedBlindOverlay.style.display = 'none';
                    gridWrapper.style.visibility = 'visible';

                    // 練習賽恢復顯示儲存與我的地圖庫按鈕
                    const btnSaveEl = document.getElementById('btnSave');
                    const btnMapLibraryEl = document.getElementById('btnMapLibrary');
                    const rankedNoSavePill = document.getElementById('rankedNoSavePill');
                    if (btnSaveEl) btnSaveEl.style.display = 'inline-flex';
                    if (btnMapLibraryEl) btnMapLibraryEl.style.display = 'inline-flex';
                    if (rankedNoSavePill) rankedNoSavePill.style.display = 'none';
                    updateAuthUI(currentUser);

                    if (btnModeOrbit) {
                        btnModeOrbit.disabled = false;
                        btnModeOrbit.title = '3D 自由俯瞰視角';
                    }
                    if (btnResetCam) {
                        btnResetCam.disabled = false;
                        btnResetCam.title = '重設視角至標準角度';
                    }
                    const walkTitlePractice = document.getElementById('simWalkControlTitle');
                    if (walkTitlePractice) walkTitlePractice.innerHTML = '<strong>🎮 行走控制 (俯瞰與車子視角皆可使用)：</strong>';

                    if (btnToggleMapSize) btnToggleMapSize.style.display = 'inline-flex';
                    document.getElementById('headerTitleText').textContent = '3D 迷宮模擬與自訂規格牆壁規劃系統';

                    // 關閉排位賽彈窗
                    document.getElementById('rankedVictoryModal').style.display = 'none';
                    document.getElementById('rankedTimeoutModal').style.display = 'none';

                    maze3D.stopDriving();
                    resetTimer();

                    // 重新載入練習賽迷宮
                    loadMazeConfig();
                    showToast('🛠️ 已切換為【練習賽】模式！');
                }
            }

            btnModePractice?.addEventListener('click', () => switchGameMode('practice'));
            btnModeRanked?.addEventListener('click', () => switchGameMode('ranked'));

            function loadRankedMatch(size = '10x10') {
                if (!['10x10', '15x15', '20x20', '25x25'].includes(size)) {
                    size = '10x10';
                }
                currentRankedSize = size;

                maze3D.stopDriving();
                resetTimer();
                if (editor) editor.clearCarTrail();

                document.getElementById('rankedVictoryModal').style.display = 'none';
                document.getElementById('rankedTimeoutModal').style.display = 'none';

                fetch('ranked_api.php?action=get_map&size=' + encodeURIComponent(size))
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && res.mapData) {
                            currentRankedSize = res.size;
                            currentRankedMapId = res.mapId;
                            countdownLimitMs = res.timeLimitMs;
                            countdownDesc = res.timeLimitDesc;
                            countdownLabel = `${res.size}排位賽`;

                            // 設定倒數計時模式
                            currentTimerMode = 'down';
                            btnTimerCountDown.classList.add('active');
                            btnTimerCountUp.classList.remove('active');
                            if (countdownBtnLabel) countdownBtnLabel.textContent = `${countdownDesc}倒數`;

                            // 載入地圖至 3D
                            maze3D.buildMaze3D(res.mapData);
                            maze3D.placePlayerAtStart();
                            if (maze3D.currentMode === 'orbit') {
                                maze3D.resetOrbitCamera();
                            }
                            resetTimer();

                            // 排位賽開始前：允許自由切換調整視角
                            if (btnModeOrbit) {
                                btnModeOrbit.disabled = false;
                                btnModeOrbit.title = '3D 自由俯瞰視角';
                            }
                            if (btnResetCam) {
                                btnResetCam.disabled = false;
                                btnResetCam.title = '重設視角至標準角度';
                            }

                            // 更新排位賽提示資訊
                            const tierNames = {
                                '10x10': '10×10 菁英級',
                                '15x15': '15×15 戰將級',
                                '20x20': '20×20 大師級',
                                '25x25': '25×25 宗師級'
                            };

                            const tierTitle = tierNames[size] || size;
                            const mapNameEl = document.getElementById('rankedMapName');
                            const limitTextEl = document.getElementById('rankedLimitText');
                            const blindTier = document.getElementById('blindTierLabel');
                            const blindMap = document.getElementById('blindMapIdLabel');
                            const blindLimit = document.getElementById('blindTimeLimitLabel');

                            if (mapNameEl) mapNameEl.textContent = `${res.mapName} (${res.mapId})`;
                            if (limitTextEl) limitTextEl.textContent = res.timeLimitDesc;
                            if (blindTier) blindTier.textContent = tierTitle;
                            if (blindMap) blindMap.textContent = `官方隨機 (${res.mapId})`;
                            if (blindLimit) blindLimit.textContent = res.timeLimitDesc;

                            // 更新級別按鈕 active
                            document.querySelectorAll('.ranked-tier-btn').forEach(btn => {
                                if (btn.getAttribute('data-size') === size) {
                                    btn.classList.add('active');
                                } else {
                                    btn.classList.remove('active');
                                }
                            });

                            // 更新 header 標籤
                            const tagGrid = document.getElementById('headerTagGrid');
                            const tagTotal = document.getElementById('headerTagTotal');
                            const dim = res.mapData.gridSize?.cols || parseInt(size, 10);
                            if (tagGrid) tagGrid.textContent = `排位規格：${size}`;
                            if (tagTotal) tagTotal.textContent = `總長寬：${dim * 30}×${dim * 30} cm`;

                            btnStartDrive.classList.add('pulse-prompt');
                            showToast(`🎲 已隨機載入 ${tierTitle} 官方盲測迷宮！點擊【▶ 開始遙控】即刻啟動挑戰！`);
                        } else {
                            if (res.requireLogin) {
                                openAuthModal(res.message, 'login');
                            } else {
                                showToast(res.message || '載入排位賽地圖失敗', true);
                            }
                        }
                    })
                    .catch(err => {
                        console.error('載入排位賽失敗:', err);
                        showToast('無法連接排位伺服器', true);
                    });
            }

            // 排位賽級別選擇按鈕事件
            document.querySelectorAll('.ranked-tier-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const size = btn.getAttribute('data-size');
                    if (size) {
                        loadRankedMatch(size);
                    }
                });
            });

            // 隨機換圖按鈕
            document.getElementById('btnRepickMap')?.addEventListener('click', () => {
                loadRankedMatch(currentRankedSize);
            });

            // 排位賽通關彈窗按鈕事件
            document.getElementById('btnRankedNextMatch')?.addEventListener('click', () => {
                document.getElementById('rankedVictoryModal').style.display = 'none';
                loadRankedMatch(currentRankedSize);
            });

            document.getElementById('btnRankedViewLeaderboard')?.addEventListener('click', () => {
                document.getElementById('rankedVictoryModal').style.display = 'none';
                openLeaderboardModal(currentRankedSize);
            });

            document.getElementById('btnRankedBackToPractice')?.addEventListener('click', () => {
                document.getElementById('rankedVictoryModal').style.display = 'none';
                switchGameMode('practice');
            });

            // 排位賽超時彈窗按鈕事件
            document.getElementById('btnRankedTimeoutRetry')?.addEventListener('click', () => {
                document.getElementById('rankedTimeoutModal').style.display = 'none';
                maze3D.stopDriving();
                maze3D.placePlayerAtStart();
                resetTimer();
                if (editor) editor.clearCarTrail();
                btnStartDrive.classList.add('pulse-prompt');
                showToast('已回到起點，請點擊【▶ 開始遙控】重新挑戰！');
            });

            document.getElementById('btnRankedTimeoutNewMap')?.addEventListener('click', () => {
                document.getElementById('rankedTimeoutModal').style.display = 'none';
                loadRankedMatch(currentRankedSize);
            });

            document.getElementById('btnRankedTimeoutLeaderboard')?.addEventListener('click', () => {
                document.getElementById('rankedTimeoutModal').style.display = 'none';
                openLeaderboardModal(currentRankedSize);
            });

            document.getElementById('btnRankedTimeoutBackPractice')?.addEventListener('click', () => {
                document.getElementById('rankedTimeoutModal').style.display = 'none';
                switchGameMode('practice');
            });

            // 排行榜 Modal 操作
            function openLeaderboardModal(size = '10x10') {
                if (!leaderboardModalBackdrop) return;
                currentLeaderboardTab = size;
                leaderboardModalBackdrop.classList.add('show');

                // 切換頁籤 active
                document.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
                    if (btn.getAttribute('data-size') === size) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                loadLeaderboardData(size);
            }

            function closeLeaderboardModal() {
                if (!leaderboardModalBackdrop) return;
                leaderboardModalBackdrop.classList.remove('show');
            }

            function loadLeaderboardData(size) {
                if (!leaderboardTableBody) return;
                leaderboardTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">⏳ 天梯榜更新中...</td></tr>';

                fetch('ranked_api.php?action=leaderboard&size=' + encodeURIComponent(size))
                    .then(res => res.json())
                    .then(res => {
                        if (res.success) {
                            renderLeaderboard(res);
                        } else {
                            leaderboardTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 24px;">無法載入排行榜：${escapeHtml(res.message || '未知錯誤')}</td></tr>`;
                        }
                    })
                    .catch(err => {
                        leaderboardTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 24px;">伺服器連線失敗</td></tr>';
                    });
            }

            function renderLeaderboard(data) {
                const list = data.list || [];
                const userBest = data.userBest;

                // 更新個人最佳資訊
                if (userBestBanner) {
                    if (userBest) {
                        const bestSec = (userBest.bestMs / 1000).toFixed(2);
                        userBestBanner.innerHTML = `
                            <span>👤 我的最佳成績：<strong>${bestSec} 秒</strong></span>
                            <span id="userBestRankText">全服天梯排名：第 <strong>${userBest.rank}</strong> 名</span>
                        `;
                    } else {
                        userBestBanner.innerHTML = `
                            <span>👤 我的最佳成績：<strong>尚未有紀錄</strong></span>
                            <span id="userBestRankText">${currentUser ? '完成此級別排位賽即登錄天梯！' : '請先登入帳號以登錄天梯'}</span>
                        `;
                    }
                    if (data.myMapCount) {
                        userBestBanner.innerHTML += `<span>🗺️ 我建立的排位地圖：本級別 <strong>${data.myMapCount.size}</strong> 張 / 共 <strong>${data.myMapCount.total}</strong> 張</span>`;
                    }
                }

                if (list.length === 0) {
                    leaderboardTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 32px;">目前尚無選手登錄此級別紀錄，快來搶下全服首位！</td></tr>';
                    return;
                }

                let html = '';
                list.forEach(row => {
                    const isMe = currentUser && (currentUser.id === row.userId || currentUser.username === row.username);
                    let rankBadge = `#${row.rank}`;
                    if (row.rank === 1) rankBadge = '<span class="rank-badge-icon">🥇</span> <strong>1</strong>';
                    else if (row.rank === 2) rankBadge = '<span class="rank-badge-icon">🥈</span> <strong>2</strong>';
                    else if (row.rank === 3) rankBadge = '<span class="rank-badge-icon">🥉</span> <strong>3</strong>';

                    const usedSec = (row.timeUsedMs / 1000).toFixed(2) + ' 秒';
                    const remainSec = (row.timeRemainMs / 1000).toFixed(2) + ' 秒';
                    const mapBadge = `<span style="font-family: monospace; color: #94a3b8;">${escapeHtml(row.mapId)}</span>`;
                    const dateStr = row.createdAt ? row.createdAt.substring(0, 16) : '-';

                    html += `
                        <tr class="${isMe ? 'is-me' : ''}">
                            <td style="text-align: center;">${rankBadge}</td>
                            <td>${escapeHtml(row.username)}${isMe ? ' <span style="font-size:0.75rem; color:#f59e0b;">(我)</span>' : ''}</td>
                            <td style="color: #38bdf8; font-weight: 700; font-family: monospace;">${usedSec}</td>
                            <td style="color: #4ade80; font-family: monospace;">${remainSec}</td>
                            <td>${mapBadge}</td>
                            <td style="color: #64748b; font-size: 0.78rem;">${dateStr}</td>
                        </tr>
                    `;
                });

                leaderboardTableBody.innerHTML = html;
            }

            btnOpenLeaderboard?.addEventListener('click', () => {
                openLeaderboardModal(currentRankedSize);
            });

            btnCloseLeaderboardModal?.addEventListener('click', closeLeaderboardModal);
            leaderboardModalBackdrop?.addEventListener('click', (e) => {
                if (e.target === leaderboardModalBackdrop) closeLeaderboardModal();
            });

            document.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const size = btn.getAttribute('data-size');
                    if (size) {
                        currentLeaderboardTab = size;
                        document.querySelectorAll('.leaderboard-tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        loadLeaderboardData(size);
                    }
                });
            });

            btnRefreshLeaderboard?.addEventListener('click', () => {
                loadLeaderboardData(currentLeaderboardTab);
            });

            // 排位賽地圖總覽 Modal
            const rankedGalleryBackdrop = document.getElementById('rankedGalleryBackdrop');
            const rankedGalleryList = document.getElementById('rankedGalleryList');

            // 用 SVG 畫出迷宮簡易預覽 (座標一律轉成數字，避免地圖檔內容被當成 HTML)
            function mazePreviewSvg(m) {
                const rows = Number(m.gridSize?.rows) || 10;
                const cols = Number(m.gridSize?.cols) || 10;
                let d = '';
                (m.hWalls || []).forEach((row, r) => row.forEach((w, c) => { if (w) d += `M${c} ${r}h1`; }));
                (m.vWalls || []).forEach((row, r) => row.forEach((w, c) => { if (w) d += `M${c} ${r}v1`; }));
                const cell = (p, color) => p ? `<rect x="${Number(p.x) + 0.15}" y="${Number(p.y) + 0.15}" width="0.7" height="0.7" fill="${color}"/>` : '';
                return `<svg viewBox="-0.2 -0.2 ${cols + 0.4} ${rows + 0.4}">${cell(m.start, '#22c55e')}${cell(m.goal, '#ef4444')}<path d="${d}" stroke="#e2e8f0" stroke-width="0.12" stroke-linecap="square" fill="none"/></svg>`;
            }

            function openRankedGallery() {
                if (maze3D.isDriving) {
                    showToast('排位賽進行中無法查看地圖總覽', true);
                    return;
                }
                rankedGalleryBackdrop.classList.add('show');
                rankedGalleryList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 32px;">⏳ 讀取排位圖庫中...</div>';

                fetch('ranked_api.php?action=list_maps')
                    .then(res => res.json())
                    .then(res => {
                        if (!res.success) {
                            rankedGalleryList.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 24px;">無法載入地圖總覽：${escapeHtml(res.message || '未知錯誤')}</div>`;
                            return;
                        }
                        let html = '';
                        Object.entries(res.maps).forEach(([size, maps]) => {
                            html += `<h4 class="ranked-gallery-tier">${size.replace('x', '×')}（${maps.length} 張）</h4><div class="ranked-gallery-grid">`;
                            maps.forEach(m => {
                                const isCurrent = size === currentRankedSize && m.mapId === currentRankedMapId;
                                html += `
                                    <div class="ranked-gallery-item${isCurrent ? ' is-current' : ''}" title="${escapeHtml(String(m.name || m.mapId))}">
                                        ${mazePreviewSvg(m)}
                                        <div class="ranked-gallery-name">${escapeHtml(String(m.mapId))}${isCurrent ? '（本場）' : ''}</div>
                                        <div>👤 ${escapeHtml(String(m.author || '官方'))}</div>
                                    </div>
                                `;
                            });
                            html += '</div>';
                        });
                        rankedGalleryList.innerHTML = html;
                    })
                    .catch(() => {
                        rankedGalleryList.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 24px;">伺服器連線失敗</div>';
                    });
            }

            document.getElementById('btnOpenRankedGallery')?.addEventListener('click', openRankedGallery);
            document.getElementById('btnCloseRankedGallery')?.addEventListener('click', () => rankedGalleryBackdrop.classList.remove('show'));
            rankedGalleryBackdrop?.addEventListener('click', (e) => {
                if (e.target === rankedGalleryBackdrop) rankedGalleryBackdrop.classList.remove('show');
            });

            // ============================================
            // 11. 練習賽一鍵發布至官方排位賽圖庫
            // ============================================
            function isMazeSolvable(data) {
                if (!data) return false;
                const cols = data.gridSize?.cols || (data.hWalls ? data.hWalls[0].length : 10);
                const rows = data.gridSize?.rows || (data.hWalls ? data.hWalls.length - 1 : 10);
                const start = data.start || { x: 0, y: rows - 1 };
                const goal = data.goal || { x: cols - 1, y: 0 };
                const hWalls = data.hWalls;
                const vWalls = data.vWalls;

                if (!hWalls || !vWalls) return false;
                if (start.x === goal.x && start.y === goal.y) return true;

                const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
                const queue = [{ x: intval(start.x), y: intval(start.y) }];
                visited[start.y][start.x] = true;

                function intval(v) { return parseInt(v, 10) || 0; }

                while (queue.length > 0) {
                    const curr = queue.shift();
                    if (curr.x === intval(goal.x) && curr.y === intval(goal.y)) return true;

                    const cx = curr.x;
                    const cy = curr.y;

                    // 上 (y - 1)
                    if (cy > 0 && !visited[cy - 1][cx] && !hWalls[cy][cx]) {
                        visited[cy - 1][cx] = true;
                        queue.push({ x: cx, y: cy - 1 });
                    }
                    // 下 (y + 1)
                    if (cy < rows - 1 && !visited[cy + 1][cx] && !hWalls[cy + 1][cx]) {
                        visited[cy + 1][cx] = true;
                        queue.push({ x: cx, y: cy + 1 });
                    }
                    // 左 (x - 1)
                    if (cx > 0 && !visited[cy][cx - 1] && !vWalls[cy][cx]) {
                        visited[cy][cx - 1] = true;
                        queue.push({ x: cx - 1, y: cy });
                    }
                    // 右 (x + 1)
                    if (cx < cols - 1 && !visited[cy][cx + 1] && !vWalls[cy][cx + 1]) {
                        visited[cy][cx + 1] = true;
                        queue.push({ x: cx + 1, y: cy });
                    }
                }
                return false;
            }

            const btnPublishToRanked = document.getElementById('btnPublishToRanked');
            const publishModalBackdrop = document.getElementById('publishModalBackdrop');
            const btnClosePublishModal = document.getElementById('btnClosePublishModal');
            const btnCancelPublish = document.getElementById('btnCancelPublish');
            const btnConfirmPublish = document.getElementById('btnConfirmPublish');
            const publishModalSpec = document.getElementById('publishModalSpec');
            const publishModalPathCheck = document.getElementById('publishModalPathCheck');
            const publishModalStats = document.getElementById('publishModalStats');
            const publishModalAuthor = document.getElementById('publishModalAuthor');
            const publishCustomName = document.getElementById('publishCustomName');

            let pendingPublishData = null;

            function openPublishModal() {
                if (!currentUser) {
                    openAuthModal('🔒 訪客限制：【發布至官方排位賽圖庫】需要登入會員帳號！請先登入或免費註冊。', 'login');
                    return;
                }

                const currentData = editor.getData();
                const cols = editor.cols;
                const rows = editor.rows;
                const size = `${cols}x${rows}`;
                const allowed = ['10x10', '15x15', '20x20', '25x25'];

                if (!allowed.includes(size)) {
                    showToast(`⚠️ 規格不符：排位賽僅支援 10×10、15×15、20×20、25×25！目前為 ${cols}×${rows}。`, true);
                    return;
                }

                // 檢查連通性
                const solvable = isMazeSolvable(currentData);
                if (!solvable) {
                    showToast('❌ 發布失敗：經路徑運算驗證，此迷宮無法從起點到達終點！請修改內部牆壁確保有通行路徑。', true);
                    return;
                }

                pendingPublishData = currentData;

                const tierLabels = {
                    '10x10': '10×10 菁英級',
                    '15x15': '15×15 戰將級',
                    '20x20': '20×20 大師級',
                    '25x25': '25×25 宗師級'
                };

                if (publishModalSpec) publishModalSpec.textContent = tierLabels[size] || size;
                if (publishModalPathCheck) publishModalPathCheck.innerHTML = '<span class="status-pass">✅ 通路已驗證 (保證起點可通達終點)</span>';

                // 計算牆壁數量
                let hCount = 0;
                currentData.hWalls.forEach(r => r.forEach(v => { if (v) hCount++; }));
                let vCount = 0;
                currentData.vWalls.forEach(r => r.forEach(v => { if (v) vCount++; }));
                const wallTotal = hCount + vCount;

                if (publishModalStats) publishModalStats.textContent = `${wallTotal} 段牆壁 (${cols * 30}×${rows * 30} cm)`;
                if (publishModalAuthor) publishModalAuthor.textContent = currentUser ? currentUser.username : '訪客';
                if (publishCustomName) publishCustomName.value = '';

                publishModalBackdrop.classList.add('show');
            }

            function closePublishModal() {
                publishModalBackdrop.classList.remove('show');
                pendingPublishData = null;
            }

            btnPublishToRanked?.addEventListener('click', openPublishModal);
            btnClosePublishModal?.addEventListener('click', closePublishModal);
            btnCancelPublish?.addEventListener('click', closePublishModal);
            publishModalBackdrop?.addEventListener('click', (e) => {
                if (e.target === publishModalBackdrop) closePublishModal();
            });

            btnConfirmPublish?.addEventListener('click', () => {
                if (!pendingPublishData) return;
                const customName = publishCustomName ? publishCustomName.value.trim() : '';

                btnConfirmPublish.disabled = true;
                btnConfirmPublish.innerHTML = '<span>⏳</span> 發布上傳中...';

                fetch('ranked_api.php?action=publish_map', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mapData: pendingPublishData,
                        name: customName
                    })
                })
                .then(res => res.json())
                .then(res => {
                    btnConfirmPublish.disabled = false;
                    btnConfirmPublish.innerHTML = '<span>🚀</span> 確認發布至官方排位圖庫';

                    if (res.success) {
                        closePublishModal();
                        showToast(res.message);
                    } else {
                        showToast(res.message || '發布失敗', true);
                    }
                })
                .catch(err => {
                    btnConfirmPublish.disabled = false;
                    btnConfirmPublish.innerHTML = '<span>🚀</span> 確認發布至官方排位圖庫';
                    showToast('無法連接排位賽伺服器進行發布', true);
                });
            });

            // 頁面初次載入：預設訪客模式，先檢查登入狀態與權限，再載入迷宮配置
            updateAuthUI(null);
            checkAuthStatus().then(() => {
                loadMazeConfig();
            });
        });
    </script>
</body>
</html>
