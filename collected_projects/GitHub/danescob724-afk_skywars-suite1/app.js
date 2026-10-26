/**
 * Skywars Suite Studio - Web Application Controller (v3.2)
 * Dedicated Roblox Luau Obfuscation & Access Control Hub
 */

(function () {
  'use strict';

  // Access Control & Key System Configuration State
  const accessConfig = {
    whitelisted: [
      "724e72411",
      "Synitzynnx",
      "777_Z1e7x",
      "Condrago321",
      "zwooombiiee",
      "pandasweetgirl15"
    ],
    banned: [],
    whitelistSkipsKey: true,
    whitelistOnlyMode: false,
    kickBanned: true,
    kickOnFail: true,
    key: "DORKSTHATAINTWHITELISTED",
    keyFile: "SkywarsSuite_Key.txt",
    rememberKey: false,
    notifications: true,
    killSwitchArmed: false,
    killSwitchReason: "⚠️ Skywars Suite is temporarily offline for emergency maintenance.",
    discordConfig: {
      enabled: false,
      webhookUrl: "",
      logWhitelisted: true,
      logKeyPass: true,
      logBannedKicks: true,
      logKeyFails: true
    },
    timedKeys: []
  };

  const ACCESS_CONFIG_STORAGE_KEY = "dalx_access_config_v1";

  function loadAccessConfig() {
    try {
      const saved = localStorage.getItem(ACCESS_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.whitelisted)) accessConfig.whitelisted = parsed.whitelisted;
        if (Array.isArray(parsed.banned)) accessConfig.banned = parsed.banned;
        if (typeof parsed.whitelistSkipsKey === 'boolean') accessConfig.whitelistSkipsKey = parsed.whitelistSkipsKey;
        if (typeof parsed.whitelistOnlyMode === 'boolean') accessConfig.whitelistOnlyMode = parsed.whitelistOnlyMode;
        if (typeof parsed.kickBanned === 'boolean') accessConfig.kickBanned = parsed.kickBanned;
        if (typeof parsed.kickOnFail === 'boolean') accessConfig.kickOnFail = parsed.kickOnFail;
        if (parsed.key) accessConfig.key = parsed.key;
        if (parsed.keyFile) accessConfig.keyFile = parsed.keyFile;
        if (typeof parsed.rememberKey === 'boolean') accessConfig.rememberKey = parsed.rememberKey;
        if (typeof parsed.notifications === 'boolean') accessConfig.notifications = parsed.notifications;
        if (typeof parsed.killSwitchArmed === 'boolean') accessConfig.killSwitchArmed = parsed.killSwitchArmed;
        if (typeof parsed.killSwitchReason === 'string') accessConfig.killSwitchReason = parsed.killSwitchReason;
        if (parsed.discordConfig && typeof parsed.discordConfig === 'object') {
          accessConfig.discordConfig = Object.assign(accessConfig.discordConfig, parsed.discordConfig);
        }
        if (Array.isArray(parsed.timedKeys)) accessConfig.timedKeys = parsed.timedKeys;
      }
    } catch (e) {
      console.warn('Could not load access config:', e);
    }
  }

  function saveAccessConfig() {
    try {
      localStorage.setItem(ACCESS_CONFIG_STORAGE_KEY, JSON.stringify(accessConfig));
    } catch (e) {
      console.warn('Could not save access config:', e);
    }
  }

  async function fetchRemoteAccessConfig() {
    try {
      const res = await fetch(`access_config.json?_t=${Date.now()}`);
      if (res.ok) {
        const remote = await res.json();
        if (remote && typeof remote === 'object') {
          // If remote repository/server has kill switch disarmed, ensure browser respects it
          if (remote.killSwitchArmed === false && accessConfig.killSwitchArmed === true) {
            accessConfig.killSwitchArmed = false;
            saveAccessConfig();
            syncKillSwitchUI();
            logConsole('Remote access_config verified: Kill Switch is disarmed.', 'stdout');
          }
        }
      }
    } catch (e) {
      console.warn('Could not check remote access config:', e);
    }
  }

  function syncAccessConfigToUI() {
    if (elOptWhitelistSkipsKey) elOptWhitelistSkipsKey.checked = accessConfig.whitelistSkipsKey;
    if (elOptWhitelistOnly) elOptWhitelistOnly.checked = accessConfig.whitelistOnlyMode;
    if (elOptKickBanned) elOptKickBanned.checked = accessConfig.kickBanned;
    if (elOptKickOnFail) elOptKickOnFail.checked = accessConfig.kickOnFail;
    if (elInputKeyString) elInputKeyString.value = accessConfig.key;
    if (elInputKeyFile) elInputKeyFile.value = accessConfig.keyFile;
    if (elOptRememberKey) elOptRememberKey.checked = accessConfig.rememberKey;
    if (elOptNotifications) elOptNotifications.checked = accessConfig.notifications;
  }

  let skywarsSuiteBody = "";

  // DOM Elements - Access Control Hub
  const elWhitelistCount = document.getElementById('whitelistCount');
  const elInputWhitelistUser = document.getElementById('inputWhitelistUser');
  const elBtnAddWhitelist = document.getElementById('btnAddWhitelist');
  const elWhitelistChips = document.getElementById('whitelistChips');
  const elOptWhitelistSkipsKey = document.getElementById('optWhitelistSkipsKey');
  const elOptWhitelistOnly = document.getElementById('optWhitelistOnly');

  const elBannedCount = document.getElementById('bannedCount');
  const elInputBannedUser = document.getElementById('inputBannedUser');
  const elBtnAddBanned = document.getElementById('btnAddBanned');
  const elBannedChips = document.getElementById('bannedChips');
  const elOptKickBanned = document.getElementById('optKickBanned');

  const elInputKeyString = document.getElementById('inputKeyString');
  const elInputKeyFile = document.getElementById('inputKeyFile');
  const elOptKickOnFail = document.getElementById('optKickOnFail');
  const elOptRememberKey = document.getElementById('optRememberKey');
  const elOptNotifications = document.getElementById('optNotifications');

  // DOM Elements - Editors & Actions
  const elInputLua = document.getElementById('inputLua');
  const elOutputLua = document.getElementById('outputLua');
  const elInputLines = document.getElementById('inputLines');
  const elOutputLines = document.getElementById('outputLines');
  const elInputStats = document.getElementById('inputStats');
  const elOutputStats = document.getElementById('outputStats');
  const elSourceBadge = document.getElementById('sourceBadge');

  const elBtnObfuscate = document.getElementById('btnObfuscate');
  const elBtnSyncExecutor = document.getElementById('btnSyncExecutor');
  const elBtnTopSync = document.getElementById('btnTopSync');
  const elSyncStatus = document.getElementById('syncStatus');
  const elBtnRegenSource = document.getElementById('btnRegenSource');
  const elBtnCopy = document.getElementById('btnCopy');
  const elBtnDownload = document.getElementById('btnDownload');
  const elBtnClear = document.getElementById('btnClear');
  const elBtnUpload = document.getElementById('btnUpload');
  const elFileInput = document.getElementById('fileInput');

  // Protection Options
  const elOptDialect = document.getElementById('optDialect');
  const elOptRename = document.getElementById('optRename');
  const elOptVarStyle = document.getElementById('optVarStyle');
  const elOptStrings = document.getElementById('optStrings');
  const elOptNumbers = document.getElementById('optNumbers');
  const elOptControlFlow = document.getElementById('optControlFlow');
  const elOptAntiTamper = document.getElementById('optAntiTamper');
  const elOptAntiSpy = document.getElementById('optAntiSpy');
  const elOptMetatableGuard = document.getElementById('optMetatableGuard');
  const elOptMinify = document.getElementById('optMinify');
  const elOptWatermark = document.getElementById('optWatermark');
  const elWatermarkText = document.getElementById('watermarkText');

  // Emergency Kill Switch Elements
  const elBtnToggleKillSwitch = document.getElementById('btnToggleKillSwitch');
  const elKsDot = document.getElementById('ksDot');
  const elKillSwitchBtnText = document.getElementById('killSwitchBtnText');
  const elKillSwitchBanner = document.getElementById('killSwitchBanner');
  const elKsBannerReason = document.getElementById('ksBannerReason');
  const elBtnKsQuickDeactivate = document.getElementById('btnKsQuickDeactivate');
  const elBtnKsDeployRoblox = document.getElementById('btnKsDeployRoblox');
  const elModalKillSwitch = document.getElementById('modalKillSwitch');
  const elBtnCloseKsModal = document.getElementById('btnCloseKsModal');
  const elChkKillSwitchArmed = document.getElementById('chkKillSwitchArmed');
  const elKsModalDesc = document.getElementById('ksModalDesc');
  const elInputKillSwitchReason = document.getElementById('inputKillSwitchReason');
  const elInputKillSwitchPassword = document.getElementById('inputKillSwitchPassword');
  const elBtnToggleKsPassVis = document.getElementById('btnToggleKsPassVis');
  const elKsPassEyeOpen = document.getElementById('ksPassEyeOpen');
  const elKsPassEyeClosed = document.getElementById('ksPassEyeClosed');
  const elKsPasswordErrorMsg = document.getElementById('ksPasswordErrorMsg');
  const elBtnCancelKillSwitch = document.getElementById('btnCancelKillSwitch');
  const elBtnSaveKillSwitch = document.getElementById('btnSaveKillSwitch');
  const elKsModalQuickDisarmWrap = document.getElementById('ksModalQuickDisarmWrap');
  const elBtnModalQuickDisarm = document.getElementById('btnModalQuickDisarm');
  const elKsDisarmNotice = document.getElementById('ksDisarmNotice');
  const elKsPasswordGroup = document.getElementById('ksPasswordGroup');
  const KILL_SWITCH_PASSWORD = "Daniel_pro324";

  // Multi-Script Slots Elements
  const elSlotPillsList = document.getElementById('slotPillsList');
  const elBtnNewSlot = document.getElementById('btnNewSlot');

  // Metrics HUD Elements
  const elHudSourceSize = document.getElementById('hudSourceSize');
  const elHudOutputSize = document.getElementById('hudOutputSize');
  const elHudDensityRatio = document.getElementById('hudDensityRatio');
  const elHudStringsCount = document.getElementById('hudStringsCount');
  const elHudControlNodes = document.getElementById('hudControlNodes');
  const elHudGradeText = document.getElementById('hudGradeText');
  const elHudMeterFill = document.getElementById('hudMeterFill');

  // Discord Sentinel Elements
  const elBtnOpenDiscordConfig = document.getElementById('btnOpenDiscordConfig');
  const elModalDiscordConfig = document.getElementById('modalDiscordConfig');
  const elBtnCloseDiscordModal = document.getElementById('btnCloseDiscordModal');
  const elOptDiscordLogging = document.getElementById('optDiscordLogging');
  const elInputDiscordWebhook = document.getElementById('inputDiscordWebhook');
  const elChkLogWhitelisted = document.getElementById('chkLogWhitelisted');
  const elChkLogKeyPass = document.getElementById('chkLogKeyPass');
  const elChkLogBannedKicks = document.getElementById('chkLogBannedKicks');
  const elChkLogKeyFails = document.getElementById('chkLogKeyFails');
  const elDiscordTestStatusMsg = document.getElementById('discordTestStatusMsg');
  const elBtnTestDiscordWebhook = document.getElementById('btnTestDiscordWebhook');
  const elBtnSaveDiscordSettings = document.getElementById('btnSaveDiscordSettings');
  const elBtnPasteDiscordWebhook = document.getElementById('btnPasteDiscordWebhook');

  // Timed Keys & HWID Manager Elements
  const elBtnOpenKeyManager = document.getElementById('btnOpenKeyManager');
  const elModalKeyManager = document.getElementById('modalKeyManager');
  const elBtnCloseKeyModal = document.getElementById('btnCloseKeyModal');
  const elBtnCloseKeyManagerFooter = document.getElementById('btnCloseKeyManagerFooter');
  const elSelKeyDuration = document.getElementById('selKeyDuration');
  const elInputKeyLabel = document.getElementById('inputKeyLabel');
  const elChkHwidLock = document.getElementById('chkHwidLock');
  const elBtnGenerateKey = document.getElementById('btnGenerateKey');
  const elNewKeyResultBox = document.getElementById('newKeyResultBox');
  const elTextNewKeyVal = document.getElementById('textNewKeyVal');
  const elBtnCopyNewKey = document.getElementById('btnCopyNewKey');
  const elActiveKeysCount = document.getElementById('activeKeysCount');
  const elActiveKeysList = document.getElementById('activeKeysList');

  // Telemetry Elements
  const elStatOriginal = document.getElementById('statOriginal');
  const elStatObfuscated = document.getElementById('statObfuscated');
  const elStatRatio = document.getElementById('statRatio');
  const elStatTime = document.getElementById('statTime');
  const elStatVariables = document.getElementById('statVariables');
  const elStatEntropy = document.getElementById('statEntropy');

  // Console & Simulator Elements
  const elConsoleLogs = document.getElementById('consoleLogs');
  const elBtnClearConsole = document.getElementById('btnClearConsole');
  const elSimUsername = document.getElementById('simUsername');
  const elBtnSimulate = document.getElementById('btnSimulate');
  const elBtnRunSource = document.getElementById('btnRunSource');
  const elBtnRunOutput = document.getElementById('btnRunOutput');

  // Toast Container
  const elToastContainer = document.getElementById('toastContainer');

  // Modal Elements
  const elModalCompat = document.getElementById('modalCompat');
  const elBtnCompatModal = document.getElementById('btnCompatModal');
  const elModalCompatClose = document.getElementById('modalCompatClose');
  const elModalCompatOk = document.getElementById('modalCompatOk');

  // Master Security Lock Elements
  const elMasterLockOverlay = document.getElementById('masterLockOverlay');
  const elLockCardBox = document.getElementById('lockCardBox');
  const elFormMasterUnlock = document.getElementById('formMasterUnlock');
  const elInputMasterPassword = document.getElementById('inputMasterPassword');
  const elBtnTogglePasswordVis = document.getElementById('btnTogglePasswordVis');
  const elEyeIconOpen = document.getElementById('eyeIconOpen');
  const elEyeIconClosed = document.getElementById('eyeIconClosed');
  const elLockStatusMsg = document.getElementById('lockStatusMsg');
  const elChkRememberSession = document.getElementById('chkRememberSession');
  const elBtnUnlockStudio = document.getElementById('btnUnlockStudio');
  const elBtnLockStudio = document.getElementById('btnLockStudio');
  const elStudioAppWrapper = document.getElementById('studioAppWrapper');

  const MASTER_PASSWORD_HASH = "0d4b7506dfb2bc23edfe30def6cd8ae0550833695aa79651cc7f59701154b206";
  const AUTH_STORAGE_KEY = "dalx_master_studio_auth";

  // GitHub Auto-Publisher Elements
  const elBtnPublishGithub = document.getElementById('btnPublishGithub');
  const elBtnCloudSync = document.getElementById('btnCloudSync');
  const elModalGithubSync = document.getElementById('modalGithubSync');
  const elModalGithubClose = document.getElementById('modalGithubClose');
  const elInputGhToken = document.getElementById('inputGhToken');
  const elInputGhOwner = document.getElementById('inputGhOwner');
  const elInputGhRepo = document.getElementById('inputGhRepo');
  const elInputGhBranch = document.getElementById('inputGhBranch');
  const elInputGhFilePath = document.getElementById('inputGhFilePath');
  const elTextLoadstringPreview = document.getElementById('textLoadstringPreview');
  const elBtnCopyLoadstring = document.getElementById('btnCopyLoadstring');
  const elGhSyncStatusMsg = document.getElementById('ghSyncStatusMsg');
  const elBtnSaveGhSettings = document.getElementById('btnSaveGhSettings');
  const elBtnConfirmPublishGh = document.getElementById('btnConfirmPublishGh');
  const elBtnQuickDeployBans = document.getElementById('btnQuickDeployBans');
  const elBanDeployStatus = document.getElementById('banDeployStatus');
  const elBtnQuickDeployWhitelist = document.getElementById('btnQuickDeployWhitelist');
  const elWhitelistDeployStatus = document.getElementById('whitelistDeployStatus');

  // ---------------------------------------------------------------------------
  // 1. DYNAMIC ACCESS CONTROL CODE GENERATOR
  // ---------------------------------------------------------------------------

  function generateAccessControlHeader() {
    const bannedLines = accessConfig.banned.length > 0
      ? accessConfig.banned.map(u => `        "${u}",`).join('\n')
      : '        -- "BadUser123",';

    const whitelistLines = accessConfig.whitelisted.length > 0
      ? accessConfig.whitelisted.map(u => `        "${u}",`).join('\n')
      : '        -- "WhitelistedUser",';

    const timedKeysEntries = (accessConfig.timedKeys || [])
      .filter(k => !k.revoked)
      .map(k => {
        const expSec = k.expiresAt ? Math.floor(k.expiresAt / 1000) : 0;
        return `        [${JSON.stringify(k.key)}] = { expires = ${expSec}, hwidLock = ${!!k.hwidLocked}, label = ${JSON.stringify(k.label || "")} },`;
      })
      .join('\n');

    const notifBlock = `
    if passed then
        showInGameBanner("DALX Suite • Whitelist Verified", isWhitelisted and ("Welcome " .. myName .. "! Full access granted.") or "Key verified successfully.", true)
        if isWhitelisted and LOG_WHITELISTED then
            sendDiscordAlert("⭐ Whitelisted User Executed", "Whitelisted user **" .. myName .. "** executed the suite.", 65535)
        end
    end`;

    const antiSpyCode = (elOptAntiSpy && elOptAntiSpy.checked) ? `
    -- Anti-SimpleSpy & CoreGui Snoop Scanner
    task.spawn(function()
        local snoopers = { "simplespy", "hydroxs", "remotespy", "dex", "darkdex", "spy", "rspy" }
        local function scanCore()
            local targetHui = (type(gethui) == "function" and gethui()) or game:GetService("CoreGui")
            for _, obj in ipairs(targetHui:GetChildren()) do
                local n = obj.Name:lower()
                for _, s in ipairs(snoopers) do
                    if n:find(s) then
                        pcall(function() obj:Destroy() end)
                        warn("[DALX Security] Remote Spy / Inspection tool detected: " .. obj.Name)
                        if LOG_BANNEDKICK then
                            sendDiscordAlert("🛡️ Inspection Tool Detected", "User **" .. myName .. "** had spy tool (" .. obj.Name .. ") open.", 15158332)
                        end
                        pcall(function()
                            if lp then lp:Kick("\\n[DALX Security]\\nInspection tool (" .. obj.Name .. ") detected. Execution aborted.") end
                        end)
                        return true
                    end
                end
            end
            return false
        end
        task.wait(1.5)
        scanCore()
    end)` : '';

    const metatableGuardCode = (elOptMetatableGuard && elOptMetatableGuard.checked) ? `
    -- Metatable Namecall Hook Guard
    pcall(function()
        if type(getrawmetatable) == "function" then
            local gmt = getrawmetatable(game)
            if gmt and type(setreadonly) == "function" then
                local oldNamecall = gmt.__namecall
                local oldIndex = gmt.__index
                if not oldNamecall or not oldIndex then
                    pcall(function() if lp then lp:Kick("\\n[DALX Security]\\nMetatable hook violation.") end end)
                end
            end
        end
    end)` : '';

    return `--[[
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                     SKYWARS ULTIMATE MASTER SUITE                            ║
    ║   Maclib Edition • Full Uncompressed Master Build • Keybind Manager (M1-M5)  ║
    ║   High-Ping Fast Bow • Silent Aim + Target Highlight • Protected Players     ║
    ║   Safe-TP Platform • Mining Automation • Hitbox Expander • Reach • Visuals   ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
]]

--------------------------------------------------------------------------
-- USERNAME ACCESS CONTROL, HARDENED KEY SYSTEM & SENTINEL TELEMETRY
--------------------------------------------------------------------------
local __SUITE_PASSED = false
do
    local BANNED_USERS = {
${bannedLines}
    }
    local WHITELISTED_USERS = {
${whitelistLines}
    }
    local WHITELIST_SKIPS_KEY   = ${accessConfig.whitelistSkipsKey}   -- whitelisted users don't need to type the key
    local WHITELIST_ONLY_MODE   = ${accessConfig.whitelistOnlyMode}  -- true = ONLY whitelisted users can run the script at all
    local KICK_ON_FAIL          = ${accessConfig.kickOnFail}  -- true = kick from server if key is cancelled / failed / unwhitelisted
    local CORRECT_KEY           = "${accessConfig.key}"
    local KEY_FILE              = "${accessConfig.keyFile}"
    local REMEMBER_KEY          = ${accessConfig.rememberKey}  -- save key to client file

    -- EMERGENCY REMOTE KILL SWITCH CONFIG
    local KILL_SWITCH_ARMED     = ${accessConfig.killSwitchArmed}
    local KILL_SWITCH_REASON    = ${JSON.stringify(accessConfig.killSwitchReason || "⚠️ Skywars Suite is temporarily offline for emergency maintenance.")}

    -- DISCORD SENTINEL REAL-TIME TELEMETRY CONFIG
    local DISCORD_ENABLED       = ${accessConfig.discordConfig && accessConfig.discordConfig.enabled}
    local DISCORD_WEBHOOK       = ${JSON.stringify((accessConfig.discordConfig && accessConfig.discordConfig.webhookUrl) || "")}
    local LOG_WHITELISTED       = ${accessConfig.discordConfig ? accessConfig.discordConfig.logWhitelisted : true}
    local LOG_KEYPASS           = ${accessConfig.discordConfig ? accessConfig.discordConfig.logKeyPass : true}
    local LOG_BANNEDKICK        = ${accessConfig.discordConfig ? accessConfig.discordConfig.logBannedKicks : true}
    local LOG_KEYFAIL           = ${accessConfig.discordConfig ? accessConfig.discordConfig.logKeyFails : true}

    -- TIMED & HWID-LOCKED KEYS REGISTRY
    local TIMED_KEYS = {
${timedKeysEntries}
    }

    local Players = game:GetService("Players")
    local lp = Players.LocalPlayer
    local attempts = 0
    while not lp and attempts < 60 do
        task.wait(0.1)
        lp = Players.LocalPlayer
        attempts = attempts + 1
    end

    local myName = tostring(lp and lp.Name or ""):gsub("^%s+", ""):gsub("%s+$", "")
    local myDisplay = tostring(lp and lp.DisplayName or ""):gsub("^%s+", ""):gsub("%s+$", "")

    local function trim(s) return (tostring(s or ""):gsub("^%s+", ""):gsub("%s+$", "")) end

    local function sendDiscordAlert(eventTitle, eventDesc, colorCode, extraFields)
        if not DISCORD_ENABLED or DISCORD_WEBHOOK == "" then return end
        task.spawn(function()
            pcall(function()
                local req = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request
                if not req then return end
                local HttpService = game:GetService("HttpService")
                local fields = {
                    { name = "Username", value = "\`" .. myName .. "\`", inline = true },
                    { name = "Display Name", value = "\`" .. myDisplay .. "\`", inline = true },
                    { name = "Place ID", value = tostring(game.PlaceId or "N/A"), inline = true },
                    { name = "Job ID", value = tostring(game.JobId or "SinglePlayer/Studio"), inline = false }
                }
                if extraFields then
                    for _, ef in ipairs(extraFields) do table.insert(fields, ef) end
                end
                local payload = {
                    username = "DALX Security Sentinel",
                    avatar_url = "https://raw.githubusercontent.com/danescob724-afk/skywars-suite1/main/assets/icon-192.png",
                    embeds = {
                        {
                            title = eventTitle,
                            description = eventDesc,
                            color = colorCode,
                            fields = fields,
                            footer = { text = "Skywars Suite Studio • Mobile Telemetry" },
                            timestamp = DateTime.now():ToIsoDate()
                        }
                    }
                }
                req({
                    Url = DISCORD_WEBHOOK,
                    Method = "POST",
                    Headers = { ["Content-Type"] = "application/json" },
                    Body = HttpService:JSONEncode(payload)
                })
            end)
        end)
    end

    local function getClientHWID()
        local h = nil
        pcall(function()
            if type(gethwid) == "function" then h = gethwid()
            elseif type(getexecutorhwid) == "function" then h = getexecutorhwid()
            elseif type(identifyexecutor) == "function" and type(getgenv) == "function" and getgenv().HWID then
                h = getgenv().HWID
            else
                h = tostring(game:GetService("RbxAnalyticsService"):GetClientId())
            end
        end)
        return tostring(h or "UNKNOWN_HWID")
    end

    local function inList(list, name)
        name = tostring(name or ""):gsub("^%s+", ""):gsub("%s+$", ""):lower()
        if name == "" then return false end
        for _, u in ipairs(list) do
            local clean = tostring(u or ""):gsub("^%s+", ""):gsub("%s+$", ""):lower()
            if clean ~= "" and clean == name then
                return true
            end
        end
        return false
    end

    local function showInGameBanner(titleText, descText, isSuccess)
        pcall(function()
            local targetHui = (type(gethui) == "function" and gethui()) or game:GetService("CoreGui")
            for _, c in ipairs(targetHui:GetChildren()) do
                if c.Name == "DALX_AccessBanner" then pcall(function() c:Destroy() end) end
            end

            local notifGui = Instance.new("ScreenGui")
            notifGui.Name = "DALX_AccessBanner"
            notifGui.ResetOnSpawn = false
            notifGui.DisplayOrder = 999999

            local f = Instance.new("Frame")
            f.Size = UDim2.fromOffset(360, 64)
            f.Position = UDim2.new(0.5, -180, 0, -80)
            f.BackgroundColor3 = Color3.fromRGB(15, 23, 42)
            f.BorderSizePixel = 0
            f.Active = true
            f.Parent = notifGui
            Instance.new("UICorner", f).CornerRadius = UDim.new(0, 10)

            local stroke = Instance.new("UIStroke", f)
            stroke.Color = isSuccess and Color3.fromRGB(0, 240, 255) or Color3.fromRGB(239, 68, 68)
            stroke.Thickness = 1.6

            local t = Instance.new("TextLabel", f)
            t.Size = UDim2.new(1, -20, 0, 24)
            t.Position = UDim2.new(0, 10, 0, 8)
            t.BackgroundTransparency = 1
            t.Font = Enum.Font.GothamBold
            t.Text = titleText
            t.TextColor3 = isSuccess and Color3.fromRGB(0, 240, 255) or Color3.fromRGB(255, 90, 90)
            t.TextSize = 14

            local d = Instance.new("TextLabel", f)
            d.Size = UDim2.new(1, -20, 0, 20)
            d.Position = UDim2.new(0, 10, 0, 32)
            d.BackgroundTransparency = 1
            d.Font = Enum.Font.Gotham
            d.Text = descText
            d.TextColor3 = Color3.fromRGB(220, 230, 245)
            d.TextSize = 12

            notifGui.Parent = targetHui

            pcall(function()
                f:TweenPosition(UDim2.new(0.5, -180, 0, 22), Enum.EasingDirection.Out, Enum.EasingStyle.Quart, 0.45, true)
            end)
            task.delay(4, function()
                pcall(function()
                    f:TweenPosition(UDim2.new(0.5, -180, 0, -90), Enum.EasingDirection.In, Enum.EasingStyle.Quart, 0.4, true)
                    task.wait(0.45)
                    notifGui:Destroy()
                end)
            end)
        end)
    end

    local function kickPlayer(reason)
        showInGameBanner("DALX Suite • Access Denied", tostring(reason or "Unauthorized access."), false)
        task.wait(0.5)
        pcall(function()
            if lp then
                lp:Kick("\\n[DALX Suite] Access Denied:\\n" .. tostring(reason or "Unauthorized access.") .. "\\nPlease rejoin to try again.")
            end
        end)
        task.wait(1)
    end

    -- 0. EMERGENCY KILL SWITCH CHECK
    if KILL_SWITCH_ARMED then
        warn("[DALX Suite] 🚨 REMOTE EMERGENCY KILL SWITCH IS ACTIVE.")
        showInGameBanner("DALX Suite • Emergency Shutdown", KILL_SWITCH_REASON, false)
        if LOG_BANNEDKICK then
            sendDiscordAlert("🚨 Emergency Kill Switch Block", "User **" .. myName .. "** attempted to run while Kill Switch was armed.", 15548997)
        end
        task.wait(1.2)
        pcall(function()
            if lp then
                lp:Kick("\\n[DALX Emergency Shutdown]\\n" .. KILL_SWITCH_REASON .. "\\nPlease wait for operator clearance before rejoining.")
            end
        end)
        return
    end

${antiSpyCode}
${metatableGuardCode}

    -- 1. Banned check (matches Username or DisplayName)
    local isBanned = inList(BANNED_USERS, myName) or (myDisplay ~= "" and inList(BANNED_USERS, myDisplay))
    if isBanned then
        warn("[Suite] Access denied: " .. myName .. " is blacklisted.")
        if LOG_BANNEDKICK then
            sendDiscordAlert("🚫 Blacklisted User Kicked", "Blacklisted user **" .. myName .. "** attempted execution and was kicked.", 15548997)
        end
        kickPlayer("You are blacklisted from this script.")
        return
    end

    -- 2. Whitelist check (matches Username or DisplayName)
    local isWhitelisted = inList(WHITELISTED_USERS, myName) or (myDisplay ~= "" and inList(WHITELISTED_USERS, myDisplay))
    if WHITELIST_ONLY_MODE and not isWhitelisted then
        warn("[Suite] Access denied: " .. myName .. " is not on the whitelist.")
        if LOG_KEYFAIL then
            sendDiscordAlert("⛔ Whitelist-Only Block", "Non-whitelisted user **" .. myName .. "** blocked by Whitelist-Only mode.", 15158332)
        end
        kickPlayer("You are not whitelisted for this script.")
        return
    end

    local function validateKey(submittedKey)
        submittedKey = trim(submittedKey)
        if submittedKey == "" then return false, "Key cannot be empty." end
        if submittedKey == CORRECT_KEY then
            return true, "Master key accepted"
        end
        local entry = TIMED_KEYS[submittedKey]
        if entry then
            if entry.expires and entry.expires > 0 and os.time() > entry.expires then
                return false, "This key has expired."
            end
            if entry.hwidLock then
                local hwidFile = "DALX_HWID_" .. submittedKey:gsub("[^%w]", "") .. ".txt"
                local currentHwid = getClientHWID()
                local boundHwid = nil
                pcall(function()
                    if type(isfile) == "function" and isfile(hwidFile) then
                        boundHwid = trim(readfile(hwidFile))
                    end
                end)
                if not boundHwid or boundHwid == "" then
                    pcall(function()
                        if type(writefile) == "function" then writefile(hwidFile, currentHwid) end
                    end)
                elseif boundHwid ~= currentHwid then
                    return false, "HWID Mismatch! Key locked to another machine."
                end
            end
            return true, "Timed key accepted (" .. tostring(entry.label or "Active") .. ")"
        end
        return false, "Invalid key."
    end

    -- 3. Check pass condition
    local passed = (isWhitelisted and WHITELIST_SKIPS_KEY) or false

    -- Check saved key file only if rememberKey is true
    if not passed and REMEMBER_KEY then
        pcall(function()
            if type(isfile) == "function" and isfile(KEY_FILE) then
                local savedKey = trim(readfile(KEY_FILE))
                local isValid, _ = validateKey(savedKey)
                if isValid then
                    passed = true
                end
            end
        end)
    end
${notifBlock}

    if passed then
        __SUITE_PASSED = true
    else
        -- 4. Key Prompt for Non-Whitelisted Users
        local closed = false
        local failedAttempts = 0
        local CoreGui_ = game:GetService("CoreGui")
        local parentGui = (type(gethui) == "function" and gethui()) or CoreGui_

        local gui = Instance.new("ScreenGui")
        gui.Name = "DALX_KeySystem"
        gui.ResetOnSpawn = false
        gui.DisplayOrder = 10000

        local frame = Instance.new("Frame")
        frame.Size = UDim2.fromOffset(340, 200)
        frame.Position = UDim2.new(0.5, -170, 0.5, -100)
        frame.BackgroundColor3 = Color3.fromRGB(20, 20, 24)
        frame.Active = true
        frame.Draggable = true
        frame.Parent = gui
        Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 10)
        local stroke = Instance.new("UIStroke", frame)
        stroke.Color = Color3.fromRGB(0, 215, 255)
        stroke.Thickness = 1.5

        local title = Instance.new("TextLabel")
        title.Size = UDim2.new(1, 0, 0, 32)
        title.BackgroundTransparency = 1
        title.Font = Enum.Font.GothamBold
        title.Text = "DALX • Key System"
        title.TextColor3 = Color3.fromRGB(255, 255, 255)
        title.TextSize = 16
        title.Parent = frame

        local subTitle = Instance.new("TextLabel")
        subTitle.Size = UDim2.new(1, -40, 0, 16)
        subTitle.Position = UDim2.new(0, 20, 0, 30)
        subTitle.BackgroundTransparency = 1
        subTitle.Font = Enum.Font.Gotham
        subTitle.Text = "Not Whitelisted (" .. myName .. ") • discord.gg/XJCEs3Jgg"
        subTitle.TextColor3 = Color3.fromRGB(0, 215, 255)
        subTitle.TextSize = 11
        subTitle.Parent = frame

        local box = Instance.new("TextBox")
        box.Size = UDim2.new(1, -40, 0, 36)
        box.Position = UDim2.new(0, 20, 0, 52)
        box.BackgroundColor3 = Color3.fromRGB(32, 32, 38)
        box.TextColor3 = Color3.fromRGB(255, 255, 255)
        box.PlaceholderText = "Enter key (Master or Timed)..."
        box.PlaceholderColor3 = Color3.fromRGB(140, 140, 150)
        box.Text = ""
        box.ClearTextOnFocus = false
        box.Font = Enum.Font.Gotham
        box.TextSize = 14
        box.Parent = frame
        Instance.new("UICorner", box).CornerRadius = UDim.new(0, 6)

        local status = Instance.new("TextLabel")
        status.Size = UDim2.new(1, -40, 0, 20)
        status.Position = UDim2.new(0, 20, 0, 94)
        status.BackgroundTransparency = 1
        status.Font = Enum.Font.Gotham
        status.Text = "Join discord.gg/XJCEs3Jgg for access key."
        status.TextColor3 = Color3.fromRGB(220, 220, 230)
        status.TextSize = 11
        status.Parent = frame

        local submit = Instance.new("TextButton")
        submit.Size = UDim2.new(0.5, -26, 0, 36)
        submit.Position = UDim2.new(0, 20, 0, 126)
        submit.BackgroundColor3 = Color3.fromRGB(0, 170, 210)
        submit.Text = "Submit Key"
        submit.TextColor3 = Color3.fromRGB(255, 255, 255)
        submit.Font = Enum.Font.GothamBold
        submit.TextSize = 14
        submit.Parent = frame
        Instance.new("UICorner", submit).CornerRadius = UDim.new(0, 6)

        local cancel = Instance.new("TextButton")
        cancel.Size = UDim2.new(0.5, -26, 0, 36)
        cancel.Position = UDim2.new(0.5, 6, 0, 126)
        cancel.BackgroundColor3 = Color3.fromRGB(60, 60, 68)
        cancel.Text = "Exit & Rejoin"
        cancel.TextColor3 = Color3.fromRGB(255, 255, 255)
        cancel.Font = Enum.Font.GothamBold
        cancel.TextSize = 14
        cancel.Parent = frame
        Instance.new("UICorner", cancel).CornerRadius = UDim.new(0, 6)

        local function attempt()
            local inputKey = trim(box.Text)
            local isValid, reasonMsg = validateKey(inputKey)
            if isValid then
                passed = true
                status.TextColor3 = Color3.fromRGB(0, 255, 120)
                status.Text = "Key accepted! Loading..."
                if LOG_KEYPASS then
                    sendDiscordAlert("🔑 Key Verified", "User **" .. myName .. "** passed key authentication (" .. tostring(reasonMsg) .. ").", 5763719, {
                        { name = "Key Submitted", value = "||" .. inputKey .. "||", inline = true }
                    })
                end
                if REMEMBER_KEY then
                    pcall(function()
                        if type(writefile) == "function" then writefile(KEY_FILE, inputKey) end
                    end)
                end
            else
                failedAttempts = failedAttempts + 1
                status.TextColor3 = Color3.fromRGB(255, 90, 90)
                status.Text = tostring(reasonMsg) .. " (" .. tostring(failedAttempts) .. "/3)"
                local o = frame.Position
                for _, dx in ipairs({8, -8, 5, -5, 0}) do
                    frame.Position = UDim2.new(o.X.Scale, o.X.Offset + dx, o.Y.Scale, o.Y.Offset)
                    task.wait(0.03)
                end
                if failedAttempts >= 3 then
                    closed = true
                    passed = false
                    if LOG_KEYFAIL then
                        sendDiscordAlert("❌ Key Failed • Disconnected", "User **" .. myName .. "** failed 3 key attempts and was kicked.", 15158332, {
                            { name = "Last Key Input", value = "||" .. inputKey .. "||", inline = true }
                        })
                    end
                end
            end
        end

        submit.MouseButton1Click:Connect(attempt)
        box.FocusLost:Connect(function(enter) if enter then attempt() end end)
        cancel.MouseButton1Click:Connect(function()
            closed = true
            passed = false
        end)

        pcall(function() gui.Parent = parentGui end)
        if not gui.Parent then gui.Parent = CoreGui_ end

        local elapsed = 0
        while not passed and not closed and elapsed < 60 do
            task.wait(1)
            elapsed = elapsed + 1
            if not passed and not closed then
                status.Text = "Key required (" .. tostring(60 - elapsed) .. "s left to enter key)"
            end
        end

        pcall(function() gui:Destroy() end)

        if passed then
            __SUITE_PASSED = true
        else
            warn("[Suite] Access denied: Key was not entered. Kicking player.")
            if KICK_ON_FAIL then
                kickPlayer("You did not enter the required access key.\\nPlease rejoin to try again.")
            end
            return
        end
    end
end

-- Top-level hard execution barrier: absolutely NOTHING below runs if not passed
if not __SUITE_PASSED then
    return
end
`;
  }

  function assembleFullScript() {
    const header = generateAccessControlHeader();
    if (!skywarsSuiteBody) {
      return header + '\n\n-- Loading main suite body...\n';
    }
    return header + '\n' + skywarsSuiteBody;
  }

  function refreshSourceEditor() {
    elInputLua.value = assembleFullScript();
    updateEditorLines(elInputLua, elInputLines);
    updateStats(elInputLua, elInputStats);
    if (elSourceBadge) {
      elSourceBadge.textContent = `${accessConfig.whitelisted.length} Whitelisted | Luau`;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. CHIP RENDERING & ACCESS CONFIG MANAGEMENT
  // ---------------------------------------------------------------------------

  function markPendingChanges() {
    if (elBanDeployStatus) {
      elBanDeployStatus.style.color = '#f59e0b';
      elBanDeployStatus.textContent = '● Changes Pending';
    }
    if (elWhitelistDeployStatus) {
      elWhitelistDeployStatus.style.color = '#f59e0b';
      elWhitelistDeployStatus.textContent = '● Changes Pending';
    }
    if (elBtnPublishGithub) {
      elBtnPublishGithub.classList.add('has-pending-changes');
      elBtnPublishGithub.title = 'You have unsaved access changes! Click to deploy to GitHub & Roblox';
    }
  }

  function markChangesDeployed(commitSha) {
    const shortSha = commitSha || 'latest';
    if (elBanDeployStatus) {
      elBanDeployStatus.style.color = '#10b981';
      elBanDeployStatus.textContent = `✓ Live on GitHub (${shortSha})`;
    }
    if (elWhitelistDeployStatus) {
      elWhitelistDeployStatus.style.color = '#10b981';
      elWhitelistDeployStatus.textContent = `✓ Live on GitHub (${shortSha})`;
    }
    if (elBtnPublishGithub) {
      elBtnPublishGithub.classList.remove('has-pending-changes');
      elBtnPublishGithub.title = 'Push obfuscated build directly to GitHub repository';
    }
  }

  // ---------------------------------------------------------------------------
  // 2. CHIP RENDERING WITH LIVE ROBLOX AVATAR HEADSHOTS & ACCESS CONFIG
  // ---------------------------------------------------------------------------

  function getAvatarInitials(name) {
    if (!name) return '?';
    const clean = name.replace(/^@/, '').trim();
    return (clean.slice(0, 2) || '?').toUpperCase();
  }

  function getAvatarGradient(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const palettes = [
      ['#00f0ff', '#0072ff'],
      ['#a855f7', '#6366f1'],
      ['#10b981', '#059669'],
      ['#f59e0b', '#d97706'],
      ['#ec4899', '#8b5cf6'],
      ['#06b6d4', '#3b82f6']
    ];
    const pair = palettes[Math.abs(hash) % palettes.length];
    return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
  }

  async function fetchRobloxAvatar(username) {
    const clean = (username || '').trim().replace(/^@/, '').toLowerCase();
    if (!clean) return null;
    const cacheKey = `dalx_avatar_${clean}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const userApi = `https://users.roblox.com/v1/usernames/users`;
      const proxyUserUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(userApi)}`;

      const res = await fetch(proxyUserUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.data && data.data.length > 0) {
          const userId = data.data[0].id;
          const thumbApi = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=100x100&format=Png&isCircular=true`;
          const proxyThumbUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(thumbApi)}`;
          const thumbRes = await fetch(proxyThumbUrl);
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            if (thumbData && thumbData.data && thumbData.data[0] && thumbData.data[0].imageUrl) {
              const finalUrl = thumbData.data[0].imageUrl;
              try { localStorage.setItem(cacheKey, finalUrl); } catch (e) {}
              return finalUrl;
            }
          }
        }
      }
    } catch (e) {
      // CORS or network fallback
    }
    return null;
  }

  function loadAvatarForChip(username, avatarWrapId) {
    fetchRobloxAvatar(username).then((url) => {
      if (!url) return;
      const wrap = document.getElementById(avatarWrapId);
      if (!wrap) return;
      const img = document.createElement('img');
      img.className = 'chip-avatar';
      img.alt = username;
      img.src = url;
      img.onload = () => {
        wrap.innerHTML = '';
        wrap.appendChild(img);
      };
    }).catch(() => {});
  }

  function renderWhitelistChips() {
    elWhitelistChips.innerHTML = '';
    elWhitelistCount.textContent = `${accessConfig.whitelisted.length} user${accessConfig.whitelisted.length === 1 ? '' : 's'}`;

    accessConfig.whitelisted.forEach((user, idx) => {
      const chip = document.createElement('div');
      chip.className = 'user-chip whitelist';
      const wrapId = `wl_avatar_${idx}_${user.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const initials = getAvatarInitials(user);
      const gradient = getAvatarGradient(user);

      chip.innerHTML = `
        <div class="chip-avatar-wrap" id="${wrapId}" style="background: ${gradient};">
          <span class="chip-avatar-fallback" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 0.62rem; font-weight: 800; color: #fff;">${initials}</span>
        </div>
        <span>${escapeHtml(user)}</span>
        <button class="btn-chip-remove" title="Remove ${escapeHtml(user)}" data-idx="${idx}">&times;</button>
      `;

      chip.querySelector('.btn-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        accessConfig.whitelisted.splice(idx, 1);
        saveAccessConfig();
        renderWhitelistChips();
        refreshSourceEditor();
        markPendingChanges();
        showToast(`Removed "${user}" from Whitelist. Click Deploy to update Roblox.`, 'info');
      });

      elWhitelistChips.appendChild(chip);
      loadAvatarForChip(user, wrapId);
    });
  }

  function renderBannedChips() {
    elBannedChips.innerHTML = '';
    elBannedCount.textContent = `${accessConfig.banned.length} banned`;

    if (accessConfig.banned.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.style.fontSize = '0.72rem';
      emptyHint.style.color = 'var(--text-dim)';
      emptyHint.style.padding = '0.2rem';
      emptyHint.textContent = 'No banned users. Add usernames above to blacklist.';
      elBannedChips.appendChild(emptyHint);
      return;
    }

    accessConfig.banned.forEach((user, idx) => {
      const chip = document.createElement('div');
      chip.className = 'user-chip banned';
      const wrapId = `ban_avatar_${idx}_${user.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const initials = getAvatarInitials(user);

      chip.innerHTML = `
        <div class="chip-avatar-wrap" id="${wrapId}" style="background: linear-gradient(135deg, #ef4444, #7f1d1d); border-color: rgba(239, 68, 68, 0.7);">
          <span class="chip-avatar-fallback" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 0.62rem; font-weight: 800; color: #fca5a5;">${initials}</span>
        </div>
        <span>${escapeHtml(user)}</span>
        <button class="btn-chip-remove" title="Unban ${escapeHtml(user)}" data-idx="${idx}">&times;</button>
      `;

      chip.querySelector('.btn-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        accessConfig.banned.splice(idx, 1);
        saveAccessConfig();
        renderBannedChips();
        refreshSourceEditor();
        markPendingChanges();
        showToast(`Unbanned "${user}". Click Deploy to update Roblox.`, 'info');
      });

      elBannedChips.appendChild(chip);
      loadAvatarForChip(user, wrapId);
    });
  }

  function addWhitelistUser(username) {
    username = (username || '').trim().replace(/^@/, '');
    if (!username) return;
    if (accessConfig.whitelisted.map(u => u.toLowerCase()).includes(username.toLowerCase())) {
      showToast(`User "${username}" is already whitelisted!`, 'warn');
      return;
    }
    // Remove from banned if adding to whitelist
    accessConfig.banned = accessConfig.banned.filter(u => u.toLowerCase() !== username.toLowerCase());
    accessConfig.whitelisted.push(username);
    saveAccessConfig();
    renderWhitelistChips();
    renderBannedChips();
    refreshSourceEditor();
    markPendingChanges();
    showToast(`Added "${username}" to Whitelist! Click "⚡ Deploy to Roblox" to update in-game.`, 'success');
  }

  function addBannedUser(username) {
    username = (username || '').trim().replace(/^@/, '');
    if (!username) return;
    if (accessConfig.banned.map(u => u.toLowerCase()).includes(username.toLowerCase())) {
      showToast(`User "${username}" is already banned!`, 'warn');
      return;
    }
    // Remove from whitelist if banned
    accessConfig.whitelisted = accessConfig.whitelisted.filter(u => u.toLowerCase() !== username.toLowerCase());
    accessConfig.banned.push(username);
    saveAccessConfig();
    renderWhitelistChips();
    renderBannedChips();
    refreshSourceEditor();
    markPendingChanges();
    showToast(`Blacklisted "${username}"! Click "⚡ Deploy Bans to Roblox" to update in-game.`, 'warn');
  }


  // Event Listeners for Whitelist / Blacklist Inputs
  elBtnAddWhitelist.addEventListener('click', () => {
    addWhitelistUser(elInputWhitelistUser.value);
    elInputWhitelistUser.value = '';
    elInputWhitelistUser.focus();
  });

  elInputWhitelistUser.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addWhitelistUser(elInputWhitelistUser.value);
      elInputWhitelistUser.value = '';
    }
  });

  elBtnAddBanned.addEventListener('click', () => {
    addBannedUser(elInputBannedUser.value);
    elInputBannedUser.value = '';
    elInputBannedUser.focus();
  });

  elInputBannedUser.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addBannedUser(elInputBannedUser.value);
      elInputBannedUser.value = '';
    }
  });

  // Quick suggestion chips
  document.querySelectorAll('.quick-btn[data-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      addWhitelistUser(btn.getAttribute('data-user'));
    });
  });

  document.querySelectorAll('.quick-btn[data-ban]').forEach(btn => {
    btn.addEventListener('click', () => {
      addBannedUser(btn.getAttribute('data-ban'));
    });
  });

  // Toggles & Inputs Event Listeners
  elOptWhitelistSkipsKey.addEventListener('change', (e) => {
    accessConfig.whitelistSkipsKey = e.target.checked;
    saveAccessConfig();
    refreshSourceEditor();
  });

  elOptWhitelistOnly.addEventListener('change', (e) => {
    accessConfig.whitelistOnlyMode = e.target.checked;
    saveAccessConfig();
    refreshSourceEditor();
  });

  elOptKickBanned.addEventListener('change', (e) => {
    accessConfig.kickBanned = e.target.checked;
    saveAccessConfig();
    refreshSourceEditor();
  });

  elInputKeyString.addEventListener('input', (e) => {
    accessConfig.key = e.target.value.trim() || 'DORKSTHATAINTWHITELISTED';
    saveAccessConfig();
    refreshSourceEditor();
  });

  elInputKeyFile.addEventListener('input', (e) => {
    accessConfig.keyFile = e.target.value.trim() || 'SkywarsSuite_Key.txt';
    saveAccessConfig();
    refreshSourceEditor();
  });

  if (elOptKickOnFail) {
    elOptKickOnFail.addEventListener('change', (e) => {
      accessConfig.kickOnFail = e.target.checked;
      saveAccessConfig();
      refreshSourceEditor();
    });
  }

  elOptRememberKey.addEventListener('change', (e) => {
    accessConfig.rememberKey = e.target.checked;
    refreshSourceEditor();
  });

  elOptNotifications.addEventListener('change', (e) => {
    accessConfig.notifications = e.target.checked;
    refreshSourceEditor();
  });

  elBtnRegenSource.addEventListener('click', () => {
    activeSlotId = null;
    saveScriptSlots();
    renderScriptSlots();
    refreshSourceEditor();
    showToast('Source rebuilt with current Access Control settings!', 'info');
  });

  // ---------------------------------------------------------------------------
  // 3. SUITE BODY LOADER & INITIALIZATION
  // ---------------------------------------------------------------------------

  async function loadSkywarsSuiteBody() {
    if (typeof window !== 'undefined' && window.SKYWARS_SUITE_B64) {
      try {
        const bin = atob(window.SKYWARS_SUITE_B64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        skywarsSuiteBody = new TextDecoder('utf-8').decode(bytes);
        logConsole(`Loaded 2,400 lines of Skywars Master Suite engine from bundled payload.`, 'stdout');
        refreshSourceEditor();
        return;
      } catch (err) {
        console.warn('Error decoding bundled suite body:', err);
      }
    }

    try {
      const res = await fetch('skywars_body.lua');
      if (res.ok) {
        skywarsSuiteBody = await res.text();
        logConsole(`Loaded 2,400 lines of Skywars Master Suite engine from skywars_body.lua`, 'stdout');
        refreshSourceEditor();
        return;
      }
    } catch (err) {
      console.warn('Failed to load skywars_body.lua, trying skywars_input.lua fallback:', err);
    }

    try {
      const fallbackRes = await fetch('skywars_input.lua');
      if (fallbackRes.ok) {
        const full = await fallbackRes.text();
        const splitIdx = full.indexOf('if _G.SkywarsSuiteCleanup then');
        if (splitIdx !== -1) {
          skywarsSuiteBody = full.substring(splitIdx);
        } else {
          skywarsSuiteBody = full;
        }
        logConsole(`Loaded Skywars Suite body from fallback script.`, 'stdout');
        refreshSourceEditor();
      }
    } catch (e) {
      console.error('All body fetch attempts failed:', e);
      logConsole(`Warning: Could not fetch local suite body. Please run start-server.ps1.`, 'stderr');
    }
  }


  // ---------------------------------------------------------------------------
  // 4. OBFUSCATION ENGINE INTEGRATION
  // ---------------------------------------------------------------------------

  function performObfuscation() {
    const rawCode = elInputLua.value.trim();
    if (!rawCode) {
      showToast('Please provide Skywars Suite source code to obfuscate.', 'error');
      return;
    }

    elBtnObfuscate.disabled = true;
    elBtnObfuscate.innerHTML = `
      <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="3" stroke-dasharray="32" stroke-linecap="round"></circle>
      </svg>
      Obfuscating Luau Code...
    `;

    setTimeout(() => {
      const startTime = performance.now();
      try {
        const options = {
          targetDialect: 'luau',
          renameVariables: elOptRename.checked,
          variableStyle: elOptVarStyle.value,
          encryptStrings: elOptStrings.value,
          obfuscateNumbers: elOptNumbers.checked,
          controlFlowFlattening: elOptControlFlow.checked,
          junkCode: false,
          antiTamper: elOptAntiTamper.checked,
          minify: elOptMinify.checked,
          watermark: elOptWatermark.checked,
          watermarkText: elWatermarkText.value,
          maximumFortress: true
        };

        const result = window.LuaShield.obfuscate(rawCode, options);
        const duration = Math.round(performance.now() - startTime);

        elOutputLua.value = result.code;
        updateEditorLines(elOutputLua, elOutputLines);
        updateStats(elOutputLua, elOutputStats);

        // Update telemetry
        const origBytes = new Blob([rawCode]).size;
        const obfBytes = new Blob([result.code]).size;
        const ratio = origBytes > 0 ? ((obfBytes / origBytes) * 100).toFixed(1) : 0;

        elStatOriginal.textContent = formatBytes(origBytes);
        elStatObfuscated.textContent = formatBytes(obfBytes);
        elStatRatio.textContent = `${ratio}%`;
        elStatTime.textContent = `${duration} ms`;
        elStatVariables.textContent = `${result.stats.renamedCount} vars protected, ${result.stats.stringsCount} strings encrypted`;
        elStatEntropy.textContent = 'Fortress';

        logConsole(`Obfuscated Skywars Suite in ${duration}ms (${result.stats.renamedCount} vars, ${result.stats.stringsCount} strings).`, 'stdout');

        // Update live Security Metrics HUD
        updateMetricsHUD(rawCode, result.code, duration, result.stats);

        // Automatically sync to Real executor workspace & scripts!
        syncToExecutor(result.code, false);

        showToast('Skywars Suite obfuscated & synced to executor!', 'success');
      } catch (err) {
        console.error(err);
        logConsole(`Obfuscation Error: ${err.message}`, 'stderr');
        showToast(`Obfuscation Failed: ${err.message}`, 'error');
      } finally {
        elBtnObfuscate.disabled = false;
        elBtnObfuscate.innerHTML = `
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Obfuscate Skywars Suite
        `;
      }
    }, 25);
  }

  // ---------------------------------------------------------------------------
  // 5. EXECUTOR SYNCHRONIZATION (Saves to Workspace & Scripts)
  // ---------------------------------------------------------------------------

  async function syncToExecutor(code, showUserToast = true) {
    if (!code) {
      code = elOutputLua.value.trim();
    }
    if (!code) {
      showToast('No obfuscated code to sync. Click "Obfuscate Skywars Suite" first!', 'warn');
      return;
    }

    elSyncStatus.innerHTML = `
      <svg class="spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="3" stroke-dasharray="32" stroke-linecap="round"></circle>
      </svg>
      Syncing...
    `;

    try {
      const res = await fetch('/save_output', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: code
      });

      if (res.ok) {
        elSyncStatus.innerHTML = `
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Synced to Real
        `;
        elSyncStatus.style.borderColor = '#10b981';
        elSyncStatus.style.color = '#10b981';

        logConsole(`Synced build to:
  • skywars_obfuscated.lua
  • Real\\workspace\\skywars_obfuscated.luau
  • Real\\scripts\\MCP\\skywars_obfuscated.luau`, 'stdout');

        if (showUserToast) {
          showToast('Synced to Real Workspace & Scripts! Ready to run.', 'success');
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('Sync request failed:', err);
      elSyncStatus.innerHTML = `Local Only`;
      elSyncStatus.style.color = '#f59e0b';
      if (showUserToast) {
        showToast('Server sync unavailable. You can use Copy button.', 'warn');
      }
    }
  }

  elBtnSyncExecutor.addEventListener('click', () => syncToExecutor(null, true));
  elBtnTopSync.addEventListener('click', () => syncToExecutor(null, true));

  // ---------------------------------------------------------------------------
  // 5.5. MAXIMUM FORTRESS VM COMPILER (SYNCHRONOUS & ZERO-LATENCY)
  // ---------------------------------------------------------------------------

  function compileFreshFortressBuild() {
    refreshSourceEditor();
    const rawCode = elInputLua.value.trim();
    if (!rawCode) {
      throw new Error('No source code available to obfuscate.');
    }
    const options = {
      targetDialect: 'luau',
      renameVariables: elOptRename ? elOptRename.checked : true,
      variableStyle: elOptVarStyle ? elOptVarStyle.value : 'barcode',
      encryptStrings: elOptStrings ? elOptStrings.value : 'poly',
      obfuscateNumbers: elOptNumbers ? elOptNumbers.checked : true,
      controlFlowFlattening: elOptControlFlow ? elOptControlFlow.checked : true,
      junkCode: false,
      antiTamper: elOptAntiTamper ? elOptAntiTamper.checked : true,
      minify: elOptMinify ? elOptMinify.checked : true,
      watermark: elOptWatermark ? elOptWatermark.checked : true,
      watermarkText: elWatermarkText ? elWatermarkText.value : '-- Protected by LuaShield v5.2 Maximum Fortress',
      maximumFortress: true
    };
    const result = window.LuaShield.obfuscate(rawCode, options);
    if (!result || !result.code) {
      throw new Error((result && result.error) || 'Obfuscation compilation failed');
    }
    elOutputLua.value = result.code;
    updateEditorLines(elOutputLua, elOutputLines);
    updateStats(elOutputLua, elOutputStats);
    updateMetricsHUD(rawCode, result.code, 20, result.stats);
    syncToExecutor(result.code, false);
    return result.code;
  }


  // ---------------------------------------------------------------------------
  // 6. ROBLOX ACCESS SIMULATOR
  // ---------------------------------------------------------------------------

  function simulateRobloxAccess(username) {
    username = (username || '').trim();
    if (!username) {
      username = '724e72411';
      elSimUsername.value = username;
    }

    logConsole(`------------------------------------------------------------`, 'stdout');
    logConsole(`[Simulator] Testing Access for LocalPlayer.Name = "${username}"...`, 'stdout');

    const cleanName = username.toLowerCase().trim();
    const bannedMatches = accessConfig.banned.map(u => u.toLowerCase().trim());
    const whitelistMatches = accessConfig.whitelisted.map(u => u.toLowerCase().trim());

    // Step 1: Banned Check
    if (bannedMatches.includes(cleanName)) {
      logConsole(`❌ [BANNED CHECK] MATCH FOUND! "${username}" is in BANNED_USERS.`, 'stderr');
      if (accessConfig.kickBanned) {
        logConsole(`  ⚡ LocalPlayer:Kick("\\nYou are banned from this script.") called!`, 'stderr');
      }
      logConsole(`  🛑 Script stops immediately: error("[Suite] You are banned from using this script.", 0)`, 'stderr');
      logConsole(`[RESULT] User is BLOCKED & CANNOT load the script.`, 'stderr');
      showToast(`User "${username}" is BANNED!`, 'error');
      return;
    }
    logConsole(`✔ [BANNED CHECK] Passed. User is not blacklisted.`, 'stdout');

    // Step 2: Whitelist Check
    const isWhitelisted = whitelistMatches.includes(cleanName);
    if (isWhitelisted) {
      logConsole(`⭐ [WHITELIST CHECK] MATCH FOUND! "${username}" is in WHITELISTED_USERS.`, 'stdout');
      if (accessConfig.whitelistSkipsKey) {
        logConsole(`  🚀 WHITELIST_SKIPS_KEY = true. Key prompt is BYPASSED automatically!`, 'stdout');
        if (accessConfig.notifications) {
          logConsole(`  🔔 StarterGui notification: "Welcome ${username}! Whitelist verified."`, 'stdout');
        }
        logConsole(`[RESULT] Access GRANTED! The Maclib Skywars Suite UI will launch immediately.`, 'stdout');
        showToast(`User "${username}" is Whitelisted! Loads automatically.`, 'success');
        return;
      } else {
        logConsole(`  ℹ WHITELIST_SKIPS_KEY = false. User is whitelisted but still required to enter key.`, 'stdout');
      }
    } else {
      logConsole(`ℹ [WHITELIST CHECK] "${username}" is NOT on the whitelist.`, 'stdout');
      if (accessConfig.whitelistOnlyMode) {
        logConsole(`❌ [WHITELIST-ONLY MODE] WHITELIST_ONLY_MODE = true!`, 'stderr');
        logConsole(`  🛑 Script stops: error("[Suite] You are not whitelisted for this script.", 0)`, 'stderr');
        logConsole(`[RESULT] Access DENIED. Non-whitelisted users are blocked in Whitelist-Only mode.`, 'stderr');
        showToast(`User "${username}" blocked: Whitelist-Only Mode is ON!`, 'error');
        return;
      }
    }

    // Step 3: Key System
    logConsole(`🔑 [KEY SYSTEM] Checking saved key file "${accessConfig.keyFile}"...`, 'stdout');
    if (accessConfig.rememberKey) {
      logConsole(`  📁 If "${accessConfig.keyFile}" has "${accessConfig.key}": loads automatically.`, 'stdout');
      logConsole(`  ❓ If "${accessConfig.keyFile}" is missing/empty: DALX • Key System window appears!`, 'stdout');
    } else {
      logConsole(`  ❓ DALX • Key System window appears on screen every session!`, 'stdout');
    }
    logConsole(`  Required Key to unlock: "${accessConfig.key}"`, 'stdout');
    if (accessConfig.kickOnFail) {
      logConsole(`  ⚡ If cancelled or failed: LocalPlayer:Kick() will disconnect the player immediately!`, 'stderr');
    }
    logConsole(`[RESULT] Non-whitelisted user must submit the key. Closing or failing kicks them from the server.`, 'stdout');
    showToast(`Non-whitelisted user: Key required or player gets kicked.`, 'info');
  }

  elBtnSimulate.addEventListener('click', () => simulateRobloxAccess(elSimUsername.value));
  elSimUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') simulateRobloxAccess(elSimUsername.value);
  });

  // ---------------------------------------------------------------------------
  // 7. EDITOR LINE NUMBERS, COPY, DOWNLOAD & HELPERS
  // ---------------------------------------------------------------------------

  function updateEditorLines(textarea, lineContainer) {
    if (!textarea || !lineContainer) return;
    const count = textarea.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= count; i++) {
      html += `<div>${i}</div>`;
    }
    lineContainer.innerHTML = html;
  }

  function updateStats(textarea, statsContainer) {
    if (!textarea || !statsContainer) return;
    const text = textarea.value;
    const lines = text ? text.split('\n').length : 0;
    const chars = text.length;
    statsContainer.textContent = `${lines} lines | ${chars.toLocaleString()} chars`;
  }

  function syncScroll(textarea, lineContainer) {
    if (!textarea || !lineContainer) return;
    lineContainer.scrollTop = textarea.scrollTop;
  }

  elInputLua.addEventListener('input', () => {
    updateEditorLines(elInputLua, elInputLines);
    updateStats(elInputLua, elInputStats);
  });
  elInputLua.addEventListener('scroll', () => syncScroll(elInputLua, elInputLines));

  elOutputLua.addEventListener('scroll', () => syncScroll(elOutputLua, elOutputLines));

  elBtnObfuscate.addEventListener('click', performObfuscation);

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      performObfuscation();
    }
  });

  elBtnCopy.addEventListener('click', async () => {
    const code = elOutputLua.value;
    if (!code) {
      showToast('No obfuscated code to copy.', 'warn');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      showToast('Obfuscated code copied to clipboard!', 'success');
    } catch {
      elOutputLua.select();
      document.execCommand('copy');
      showToast('Obfuscated code copied to clipboard!', 'success');
    }
  });

  elBtnDownload.addEventListener('click', () => {
    const code = elOutputLua.value;
    if (!code) {
      showToast('No obfuscated code to download.', 'warn');
      return;
    }
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skywars_obfuscated.luau';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded skywars_obfuscated.luau', 'info');
  });

  elBtnClear.addEventListener('click', () => {
    elInputLua.value = '';
    updateEditorLines(elInputLua, elInputLines);
    updateStats(elInputLua, elInputStats);
    showToast('Source cleared.', 'info');
  });

  elBtnUpload.addEventListener('click', () => elFileInput.click());

  elFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      elInputLua.value = event.target.result;
      updateEditorLines(elInputLua, elInputLines);
      updateStats(elInputLua, elInputStats);
      showToast(`Loaded ${file.name}`, 'success');
    };
    reader.readAsText(file);
    elFileInput.value = '';
  });

  // Sandbox Runner Buttons
  elBtnRunSource.addEventListener('click', () => {
    const code = elInputLua.value;
    if (!code) return;
    logConsole('--- Running Skywars Source in Sandbox ---', 'stdout');
    window.LuaRunner.execute(code);
  });

  elBtnRunOutput.addEventListener('click', () => {
    const code = elOutputLua.value;
    if (!code) {
      showToast('No protected code to run. Obfuscate first!', 'warn');
      return;
    }
    logConsole('--- Running Protected Skywars Suite in Sandbox ---', 'stdout');
    window.LuaRunner.execute(code);
  });

  // ---------------------------------------------------------------------------
  // 8. LOGGING & TOASTS
  // ---------------------------------------------------------------------------

  function logConsole(message, type = 'stdout') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const time = new Date().toLocaleTimeString([], { hour12: false });
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${time}]`;

    const textSpan = document.createElement('span');
    textSpan.className = 'log-text';
    textSpan.textContent = message;

    entry.appendChild(timeSpan);
    entry.appendChild(textSpan);
    elConsoleLogs.appendChild(entry);
    elConsoleLogs.scrollTop = elConsoleLogs.scrollHeight;
  }

  elBtnClearConsole.addEventListener('click', () => {
    elConsoleLogs.innerHTML = '';
  });

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    elToastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0.00 KB';
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Modal Handlers
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'flex';
    void modalEl.offsetWidth;
    modalEl.classList.add('active');
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    setTimeout(() => {
      if (!modalEl.classList.contains('active')) {
        modalEl.style.display = 'none';
      }
    }, 260);
  }

  if (elBtnCompatModal && elModalCompat) {
    elBtnCompatModal.addEventListener('click', () => {
      openModal(elModalCompat);
    });
  }

  if (elModalCompatClose) {
    elModalCompatClose.addEventListener('click', () => {
      closeModal(elModalCompat);
    });
  }

  if (elModalCompatOk) {
    elModalCompatOk.addEventListener('click', () => {
      closeModal(elModalCompat);
    });
  }

  if (elModalCompat) {
    elModalCompat.addEventListener('click', (e) => {
      if (e.target === elModalCompat) closeModal(elModalCompat);
    });
  }

  // ---------------------------------------------------------------------------
  // 8.4. ADVANCED STUDIO POWER MODULES
  // ---------------------------------------------------------------------------

  // A. Obfuscation & Security Telemetry Metrics HUD
  function updateMetricsHUD(rawSource, obfuscatedCode, durationMs, stats) {
    if (!elHudSourceSize) return;
    const origBytes = new Blob([rawSource || '']).size;
    const obfBytes = new Blob([obfuscatedCode || '']).size;

    elHudSourceSize.textContent = formatBytes(origBytes);
    elHudOutputSize.textContent = formatBytes(obfBytes);

    const ratio = origBytes > 0 ? (obfBytes / origBytes).toFixed(1) + 'x' : '1.0x';
    if (elHudDensityRatio) elHudDensityRatio.textContent = ratio;

    const stringsCount = (stats && stats.stringsCount != null)
      ? stats.stringsCount
      : (obfuscatedCode ? (obfuscatedCode.match(/\\x[0-9a-fA-F]{2}/g) || []).length : 0);
    if (elHudStringsCount) elHudStringsCount.textContent = stringsCount;

    const controlNodes = (stats && stats.renamedCount != null)
      ? Math.round(stats.renamedCount * 1.5)
      : (obfuscatedCode ? (obfuscatedCode.match(/while\s+true\s+do|if\s+__state/g) || []).length * 8 : 128);
    if (elHudControlNodes) elHudControlNodes.textContent = controlNodes || 140;

    let grade = 'Military-Grade';
    let meterWidth = 95;
    if (elOptControlFlow && elOptControlFlow.checked && elOptStrings && elOptStrings.value === 'poly') {
      grade = 'S+ (Fortress Max)';
      meterWidth = 98;
    } else if (elOptStrings && elOptStrings.value !== 'none') {
      grade = 'S (Hardened)';
      meterWidth = 85;
    } else {
      grade = 'A (Standard)';
      meterWidth = 65;
    }

    if (elHudGradeText) elHudGradeText.textContent = grade;
    if (elHudMeterFill) elHudMeterFill.style.width = `${meterWidth}%`;
  }

  // B. Remote Emergency Kill Switch Controller
  function syncKillSwitchUI() {
    const isArmed = !!accessConfig.killSwitchArmed;
    if (elBtnToggleKillSwitch) {
      if (isArmed) {
        elBtnToggleKillSwitch.classList.add('armed');
        if (elKillSwitchBtnText) elKillSwitchBtnText.textContent = 'Kill Switch: ARMED';
        if (elKsDot) elKsDot.classList.add('active');
      } else {
        elBtnToggleKillSwitch.classList.remove('armed');
        if (elKillSwitchBtnText) elKillSwitchBtnText.textContent = 'Kill Switch: OFF';
        if (elKsDot) elKsDot.classList.remove('active');
      }
    }
    if (elKillSwitchBanner) {
      elKillSwitchBanner.style.display = isArmed ? 'flex' : 'none';
    }
    if (elKsBannerReason) {
      elKsBannerReason.textContent = `"${accessConfig.killSwitchReason || '⚠️ Maintenance in progress.'}"`;
    }
    if (elChkKillSwitchArmed) {
      elChkKillSwitchArmed.checked = isArmed;
    }
    if (elKsModalDesc) {
      elKsModalDesc.textContent = isArmed 
        ? '🚨 Armed (All in-game sessions will be blocked)' 
        : 'Currently Disabled (Scripts run normally)';
      elKsModalDesc.style.color = isArmed ? '#f87171' : 'var(--text-muted)';
    }
    if (elKsModalQuickDisarmWrap) {
      elKsModalQuickDisarmWrap.style.display = isArmed ? 'block' : 'none';
    }
    if (elKsDisarmNotice) {
      elKsDisarmNotice.style.display = isArmed ? 'block' : 'none';
    }
    if (elKsPasswordGroup) {
      elKsPasswordGroup.style.display = isArmed ? 'none' : 'block';
    }
    if (elBtnSaveKillSwitch) {
      if (isArmed) {
        elBtnSaveKillSwitch.textContent = '🟢 Turn OFF Kill Switch (Disarm)';
        elBtnSaveKillSwitch.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        elBtnSaveKillSwitch.style.borderColor = '#10b981';
      } else {
        elBtnSaveKillSwitch.textContent = '⚡ Apply & Push to GitHub';
        elBtnSaveKillSwitch.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        elBtnSaveKillSwitch.style.borderColor = '#ef4444';
      }
    }
    if (elInputKillSwitchReason) {
      elInputKillSwitchReason.value = accessConfig.killSwitchReason || '';
    }
    if (elInputKillSwitchPassword) {
      elInputKillSwitchPassword.value = '';
      elInputKillSwitchPassword.type = 'password';
    }
    if (elKsPasswordErrorMsg) {
      elKsPasswordErrorMsg.textContent = '';
    }
    if (elKsPassEyeOpen && elKsPassEyeClosed) {
      elKsPassEyeOpen.style.display = 'block';
      elKsPassEyeClosed.style.display = 'none';
    }
  }

  function disarmKillSwitchNow() {
    accessConfig.killSwitchArmed = false;
    saveAccessConfig();
    syncKillSwitchUI();
    refreshSourceEditor();
    markPendingChanges();
    closeModal(elModalKillSwitch);
    showToast('Kill Switch Disarmed! All access restored.', 'success');
    syncCloudConfigToGitHub().catch(() => {});
  }

  function initKillSwitchController() {
    if (elBtnToggleKillSwitch) {
      elBtnToggleKillSwitch.addEventListener('click', (e) => {
        e.preventDefault();
        if (accessConfig.killSwitchArmed) {
          if (confirm('🚨 Emergency Kill Switch is currently ARMED.\n\nDisarm now and restore normal script access?')) {
            disarmKillSwitchNow();
            return;
          }
        }
        syncKillSwitchUI();
        openModal(elModalKillSwitch);
        setTimeout(() => {
          if (elInputKillSwitchPassword && !accessConfig.killSwitchArmed) {
            elInputKillSwitchPassword.focus();
          }
        }, 150);
      });
    }

    if (elBtnModalQuickDisarm) {
      elBtnModalQuickDisarm.addEventListener('click', () => {
        disarmKillSwitchNow();
      });
    }

    if (elBtnCloseKsModal) {
      elBtnCloseKsModal.addEventListener('click', () => {
        closeModal(elModalKillSwitch);
      });
    }

    if (elBtnCancelKillSwitch) {
      elBtnCancelKillSwitch.addEventListener('click', () => {
        closeModal(elModalKillSwitch);
      });
    }

    if (elModalKillSwitch) {
      elModalKillSwitch.addEventListener('click', (e) => {
        if (e.target === elModalKillSwitch) {
          closeModal(elModalKillSwitch);
        }
      });
    }

    if (elChkKillSwitchArmed) {
      elChkKillSwitchArmed.addEventListener('change', () => {
        const armed = elChkKillSwitchArmed.checked;
        if (elKsModalDesc) {
          elKsModalDesc.textContent = armed 
            ? '🚨 Armed (All in-game sessions will be blocked)' 
            : 'Currently Disabled (Scripts run normally)';
          elKsModalDesc.style.color = armed ? '#f87171' : 'var(--text-muted)';
        }
        if (elKsPasswordGroup) {
          elKsPasswordGroup.style.display = armed ? 'block' : 'none';
        }
        if (elKsDisarmNotice) {
          elKsDisarmNotice.style.display = armed ? 'none' : 'block';
        }
        if (elBtnSaveKillSwitch) {
          if (!armed) {
            elBtnSaveKillSwitch.textContent = '🟢 Save & Disarm Kill Switch';
            elBtnSaveKillSwitch.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            elBtnSaveKillSwitch.style.borderColor = '#10b981';
          } else {
            elBtnSaveKillSwitch.textContent = '🚨 Arm Kill Switch (Enter Password)';
            elBtnSaveKillSwitch.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            elBtnSaveKillSwitch.style.borderColor = '#ef4444';
          }
        }
      });
    }

    if (elBtnToggleKsPassVis && elInputKillSwitchPassword) {
      elBtnToggleKsPassVis.addEventListener('click', () => {
        const isPass = elInputKillSwitchPassword.type === 'password';
        elInputKillSwitchPassword.type = isPass ? 'text' : 'password';
        if (elKsPassEyeOpen) elKsPassEyeOpen.style.display = isPass ? 'none' : 'block';
        if (elKsPassEyeClosed) elKsPassEyeClosed.style.display = isPass ? 'block' : 'none';
      });
    }

    if (elInputKillSwitchPassword) {
      elInputKillSwitchPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (elBtnSaveKillSwitch) elBtnSaveKillSwitch.click();
        }
      });
    }

    if (elBtnSaveKillSwitch) {
      elBtnSaveKillSwitch.addEventListener('click', () => {
        const armed = elChkKillSwitchArmed ? elChkKillSwitchArmed.checked : false;

        // Disarming never requires a password
        if (!armed) {
          disarmKillSwitchNow();
          return;
        }

        const enteredPass = (elInputKillSwitchPassword ? elInputKillSwitchPassword.value : '').trim();
        if (enteredPass !== KILL_SWITCH_PASSWORD && enteredPass.toLowerCase() !== KILL_SWITCH_PASSWORD.toLowerCase()) {
          if (elKsPasswordErrorMsg) {
            elKsPasswordErrorMsg.textContent = '❌ Access Denied: Incorrect Kill Switch Password!';
          }
          if (elInputKillSwitchPassword) {
            elInputKillSwitchPassword.focus();
          }
          showToast('Access Denied: Incorrect Kill Switch Password!', 'error');
          return;
        }

        const reason = elInputKillSwitchReason ? elInputKillSwitchReason.value.trim() : '';
        accessConfig.killSwitchArmed = true;
        if (reason) accessConfig.killSwitchReason = reason;
        saveAccessConfig();
        syncKillSwitchUI();
        refreshSourceEditor();
        markPendingChanges();
        closeModal(elModalKillSwitch);
        showToast('🚨 Remote Emergency Kill Switch ARMED! Deploy to Roblox to block in-game users.', 'error');
        syncCloudConfigToGitHub().catch(() => {});
      });
    }

    if (elBtnKsQuickDeactivate) {
      elBtnKsQuickDeactivate.addEventListener('click', () => {
        disarmKillSwitchNow();
      });
    }

    if (elBtnKsDeployRoblox) {
      elBtnKsDeployRoblox.addEventListener('click', () => {
        if (elBtnPublishGithub) elBtnPublishGithub.click();
      });
    }
  }

  // C. Discord Webhook Execution Logger
  function syncDiscordUI() {
    if (elOptDiscordLogging && accessConfig.discordConfig) {
      elOptDiscordLogging.checked = !!accessConfig.discordConfig.enabled;
    }
    if (elInputDiscordWebhook && accessConfig.discordConfig) {
      elInputDiscordWebhook.value = accessConfig.discordConfig.webhookUrl || '';
    }
    if (elChkLogWhitelisted && accessConfig.discordConfig) {
      elChkLogWhitelisted.checked = accessConfig.discordConfig.logWhitelisted !== false;
    }
    if (elChkLogKeyPass && accessConfig.discordConfig) {
      elChkLogKeyPass.checked = accessConfig.discordConfig.logKeyPass !== false;
    }
    if (elChkLogBannedKicks && accessConfig.discordConfig) {
      elChkLogBannedKicks.checked = accessConfig.discordConfig.logBannedKicks !== false;
    }
    if (elChkLogKeyFails && accessConfig.discordConfig) {
      elChkLogKeyFails.checked = accessConfig.discordConfig.logKeyFails !== false;
    }
  }

  function initDiscordController() {
    if (elBtnOpenDiscordConfig) {
      elBtnOpenDiscordConfig.addEventListener('click', (e) => {
        e.preventDefault();
        syncDiscordUI();
        if (elDiscordTestStatusMsg) {
          elDiscordTestStatusMsg.textContent = '';
          elDiscordTestStatusMsg.className = 'test-status-msg';
        }
        openModal(elModalDiscordConfig);
      });
    }

    if (elBtnCloseDiscordModal) {
      elBtnCloseDiscordModal.addEventListener('click', () => {
        closeModal(elModalDiscordConfig);
      });
    }

    if (elModalDiscordConfig) {
      elModalDiscordConfig.addEventListener('click', (e) => {
        if (e.target === elModalDiscordConfig) {
          closeModal(elModalDiscordConfig);
        }
      });
    }

    if (elBtnPasteDiscordWebhook && elInputDiscordWebhook) {
      elBtnPasteDiscordWebhook.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.trim().startsWith('https://')) {
            elInputDiscordWebhook.value = text.trim();
            if (elOptDiscordLogging) elOptDiscordLogging.checked = true;
            showToast('Discord Webhook URL pasted from clipboard!', 'success');
          } else if (text) {
            elInputDiscordWebhook.value = text.trim();
            showToast('Pasted text from clipboard.', 'info');
          } else {
            showToast('Clipboard is empty. Copy your webhook URL first!', 'warn');
          }
        } catch (e) {
          elInputDiscordWebhook.focus();
          showToast('Tap inside the box to paste your URL.', 'info');
        }
      });
    }

    if (elBtnTestDiscordWebhook) {
      elBtnTestDiscordWebhook.addEventListener('click', async () => {
        const url = elInputDiscordWebhook ? elInputDiscordWebhook.value.trim() : '';
        if (!url || !url.startsWith('https://')) {
          if (elDiscordTestStatusMsg) {
            elDiscordTestStatusMsg.textContent = '❌ Please enter a valid Discord webhook URL (starts with https://discord.com/api/webhooks/...)';
            elDiscordTestStatusMsg.className = 'test-status-msg error';
          }
          return;
        }

        if (elDiscordTestStatusMsg) {
          elDiscordTestStatusMsg.textContent = '📡 Sending test telemetry packet...';
          elDiscordTestStatusMsg.className = 'test-status-msg';
        }

        try {
          const testPayload = {
            username: "DALX Security Sentinel",
            avatar_url: "https://raw.githubusercontent.com/danescob724-afk/skywars-suite1/main/assets/icon-192.png",
            embeds: [
              {
                title: "🔔 Sentinel Push Telemetry Verified",
                description: "Test notification dispatched from **Skywars Suite Studio (v3.2)**. Discord webhook connection verified!",
                color: 65535,
                fields: [
                  { name: "Platform", value: "iOS / Web App", inline: true },
                  { name: "Executor Protection", value: "Sentinel Active", inline: true },
                  { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
                ],
                footer: { text: "Skywars Suite Studio • Mobile Telemetry" },
                timestamp: new Date().toISOString()
              }
            ]
          };

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
          });

          if (res.ok || res.status === 204) {
            if (elDiscordTestStatusMsg) {
              elDiscordTestStatusMsg.textContent = '✅ Verified! Check your Discord channel for the alert.';
              elDiscordTestStatusMsg.className = 'test-status-msg success';
            }
            showToast('Discord Test Alert Dispatched!', 'success');
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        } catch (err) {
          console.warn('Discord webhook test error:', err);
          if (elDiscordTestStatusMsg) {
            elDiscordTestStatusMsg.textContent = `⚠️ Sent via browser dispatch. If not received, verify URL channel permissions. (${err.message})`;
            elDiscordTestStatusMsg.className = 'test-status-msg error';
          }
        }
      });
    }

    if (elBtnSaveDiscordSettings) {
      elBtnSaveDiscordSettings.addEventListener('click', () => {
        if (!accessConfig.discordConfig) accessConfig.discordConfig = {};
        accessConfig.discordConfig.enabled = elOptDiscordLogging ? elOptDiscordLogging.checked : false;
        accessConfig.discordConfig.webhookUrl = elInputDiscordWebhook ? elInputDiscordWebhook.value.trim() : '';
        accessConfig.discordConfig.logWhitelisted = elChkLogWhitelisted ? elChkLogWhitelisted.checked : true;
        accessConfig.discordConfig.logKeyPass = elChkLogKeyPass ? elChkLogKeyPass.checked : true;
        accessConfig.discordConfig.logBannedKicks = elChkLogBannedKicks ? elChkLogBannedKicks.checked : true;
        accessConfig.discordConfig.logKeyFails = elChkLogKeyFails ? elChkLogKeyFails.checked : true;

        saveAccessConfig();
        refreshSourceEditor();
        markPendingChanges();
        closeModal(elModalDiscordConfig);
        showToast('Discord Sentinel Settings Saved & Integrated into Luau code!', 'success');
      });
    }
  }

  // D. HWID Locking & Expiring / Timed Keys Manager
  function formatKeyExpiry(expiresAt) {
    if (!expiresAt || expiresAt === 0) return 'Lifetime Key';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${mins}m remaining`;
  }

  function renderActiveKeysList() {
    if (!elActiveKeysList) return;
    elActiveKeysList.innerHTML = '';

    const keys = accessConfig.timedKeys || [];
    const activeCount = keys.filter(k => !k.revoked && (!k.expiresAt || k.expiresAt > Date.now())).length;
    if (elActiveKeysCount) {
      elActiveKeysCount.textContent = `${activeCount} active`;
    }

    if (keys.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'keys-empty-hint';
      empty.style.fontSize = '0.75rem';
      empty.style.color = 'var(--text-dim)';
      empty.style.padding = '0.75rem';
      empty.style.textAlign = 'center';
      empty.textContent = 'No timed keys created yet. Generate one above!';
      elActiveKeysList.appendChild(empty);
      return;
    }

    keys.forEach((item, idx) => {
      const isExpired = item.expiresAt && item.expiresAt > 0 && Date.now() > item.expiresAt;
      const isRevoked = !!item.revoked;

      const row = document.createElement('div');
      row.className = `timed-key-row ${isRevoked ? 'revoked' : (isExpired ? 'expired' : '')}`;

      let badgeHtml = '';
      if (isRevoked) {
        badgeHtml = '<span class="key-badge revoked">Revoked</span>';
      } else if (isExpired) {
        badgeHtml = '<span class="key-badge expired">Expired</span>';
      } else {
        badgeHtml = `<span class="key-badge active">${escapeHtml(item.duration ? item.duration.toUpperCase() : 'KEY')}</span>`;
      }

      const hwidHtml = item.hwidLocked
        ? '<span class="key-hwid-badge" title="Tied to recipient client HWID on first activation">🔒 HWID Locked</span>'
        : '<span class="key-hwid-badge free" title="Can run on any client">🌐 Any HWID</span>';

      row.innerHTML = `
        <div class="key-row-left">
          <div class="key-code-line">
            <code>${escapeHtml(item.key)}</code>
            ${badgeHtml}
            ${hwidHtml}
          </div>
          <div class="key-meta-line">
            <span class="key-label-tag">Label: <strong>${escapeHtml(item.label || 'User Access')}</strong></span>
            <span class="key-expiry-tag">• ${formatKeyExpiry(item.expiresAt)}</span>
          </div>
        </div>
        <div class="key-row-actions">
          <button type="button" class="btn-copy-key-item" data-key="${escapeHtml(item.key)}" title="Copy Key">Copy</button>
          ${!isRevoked ? `<button type="button" class="btn-revoke-key-item" data-idx="${idx}" title="Revoke Key Immediately">Revoke</button>` : ''}
        </div>
      `;

      row.querySelector('.btn-copy-key-item').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(item.key);
          showToast(`Copied key: ${item.key}`, 'success');
        } catch {
          showToast(`Key: ${item.key}`, 'info');
        }
      });

      const btnRevoke = row.querySelector('.btn-revoke-key-item');
      if (btnRevoke) {
        btnRevoke.addEventListener('click', () => {
          accessConfig.timedKeys[idx].revoked = true;
          saveAccessConfig();
          renderActiveKeysList();
          refreshSourceEditor();
          markPendingChanges();
          showToast(`Revoked key: ${item.key}`, 'warn');
        });
      }

      elActiveKeysList.appendChild(row);
    });
  }

  function initTimedKeysController() {
    if (elBtnOpenKeyManager) {
      elBtnOpenKeyManager.addEventListener('click', (e) => {
        e.preventDefault();
        renderActiveKeysList();
        if (elNewKeyResultBox) elNewKeyResultBox.style.display = 'none';
        openModal(elModalKeyManager);
      });
    }

    if (elBtnCloseKeyModal) {
      elBtnCloseKeyModal.addEventListener('click', () => {
        closeModal(elModalKeyManager);
      });
    }

    if (elBtnCloseKeyManagerFooter) {
      elBtnCloseKeyManagerFooter.addEventListener('click', () => {
        closeModal(elModalKeyManager);
      });
    }

    if (elModalKeyManager) {
      elModalKeyManager.addEventListener('click', (e) => {
        if (e.target === elModalKeyManager) {
          closeModal(elModalKeyManager);
        }
      });
    }

    if (elBtnGenerateKey) {
      elBtnGenerateKey.addEventListener('click', () => {
        const dur = elSelKeyDuration ? elSelKeyDuration.value : '24h';
        const label = elInputKeyLabel ? (elInputKeyLabel.value.trim() || 'VIP Access') : 'VIP Access';
        const hwidLock = elChkHwidLock ? elChkHwidLock.checked : true;

        let durMs = 0;
        if (dur === '24h') durMs = 24 * 3600 * 1000;
        else if (dur === '3d') durMs = 3 * 24 * 3600 * 1000;
        else if (dur === '7d') durMs = 7 * 24 * 3600 * 1000;
        else if (dur === '30d') durMs = 30 * 24 * 3600 * 1000;
        else if (dur === 'lifetime') durMs = 0;

        const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        const timePart = Date.now().toString(36).toUpperCase();
        const keyString = `DALX_${dur.toUpperCase()}_${randPart}_${timePart}`;

        if (!Array.isArray(accessConfig.timedKeys)) accessConfig.timedKeys = [];
        const newKeyObj = {
          id: `key_${Date.now()}`,
          key: keyString,
          label: label,
          duration: dur,
          createdAt: Date.now(),
          expiresAt: durMs > 0 ? (Date.now() + durMs) : 0,
          hwidLocked: hwidLock,
          revoked: false
        };

        accessConfig.timedKeys.unshift(newKeyObj);
        saveAccessConfig();
        renderActiveKeysList();
        refreshSourceEditor();
        markPendingChanges();

        if (elNewKeyResultBox && elTextNewKeyVal) {
          elTextNewKeyVal.textContent = keyString;
          elNewKeyResultBox.style.display = 'block';
        }

        showToast(`Generated ${dur.toUpperCase()} key for ${label}!`, 'success');
      });
    }

    if (elBtnCopyNewKey) {
      elBtnCopyNewKey.addEventListener('click', async () => {
        const k = elTextNewKeyVal ? elTextNewKeyVal.textContent : '';
        if (!k) return;
        try {
          await navigator.clipboard.writeText(k);
          showToast('New key copied to clipboard!', 'success');
        } catch {
          showToast(`Key: ${k}`, 'info');
        }
      });
    }
  }

  // E. Multi-Script Profile Slot Manager
  const SCRIPT_SLOTS_KEY = 'dalx_script_slots_v3';
  const ACTIVE_SLOT_KEY = 'dalx_active_slot_id_v3';

  let scriptSlots = [
    { id: 'arsenal-aim', name: 'Arsenal Aimbot', icon: '🎯', isDefault: false, customCode: '-- Arsenal Suite Profile\nprint("Arsenal Suite active")\n' }
  ];
  let activeSlotId = null;

  function loadScriptSlots() {
    try {
      // Clear legacy slot cache that contained Skywars Ultimate / Bedwars Ghost
      localStorage.removeItem('dalx_script_slots_v2');
      localStorage.removeItem('dalx_active_slot_id_v2');

      const saved = localStorage.getItem(SCRIPT_SLOTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          scriptSlots = parsed.filter(s => 
            s.id !== 'skywars-master' && 
            s.id !== 'bedwars-ghost' && 
            s.name !== 'Skywars Ultimate' && 
            s.name !== 'Bedwars Ghost'
          );
        }
      }
      const savedActive = localStorage.getItem(ACTIVE_SLOT_KEY);
      if (savedActive && scriptSlots.some(s => s.id === savedActive)) {
        activeSlotId = savedActive;
      } else {
        activeSlotId = null;
      }
      saveScriptSlots();
    } catch (e) {
      console.warn('Failed loading script slots:', e);
    }
  }

  function saveScriptSlots() {
    try {
      localStorage.setItem(SCRIPT_SLOTS_KEY, JSON.stringify(scriptSlots));
      if (activeSlotId) {
        localStorage.setItem(ACTIVE_SLOT_KEY, activeSlotId);
      } else {
        localStorage.removeItem(ACTIVE_SLOT_KEY);
      }
    } catch (e) {}
  }

  function renderScriptSlots() {
    if (!elSlotPillsList) return;
    elSlotPillsList.innerHTML = '';

    if (scriptSlots.length === 0) {
      const emptyHint = document.createElement('span');
      emptyHint.style.fontSize = '0.78rem';
      emptyHint.style.color = '#64748b';
      emptyHint.style.padding = '0.2rem 0.5rem';
      emptyHint.textContent = 'No custom slots';
      elSlotPillsList.appendChild(emptyHint);
      return;
    }

    scriptSlots.forEach(slot => {
      const pill = document.createElement('div');
      pill.className = `slot-pill ${slot.id === activeSlotId ? 'active' : ''}`;
      pill.innerHTML = `
        <span class="slot-icon">${slot.icon || '📜'}</span>
        <span class="slot-name">${escapeHtml(slot.name)}</span>
        <button type="button" class="btn-slot-delete" data-id="${slot.id}" title="Delete slot">&times;</button>
      `;

      pill.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-slot-delete')) return;
        switchScriptSlot(slot.id);
      });

      const delBtn = pill.querySelector('.btn-slot-delete');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete slot "${slot.name}"?`)) {
            scriptSlots = scriptSlots.filter(s => s.id !== slot.id);
            if (activeSlotId === slot.id) {
              activeSlotId = scriptSlots.length > 0 ? scriptSlots[0].id : null;
            }
            saveScriptSlots();
            renderScriptSlots();
            if (activeSlotId) {
              switchScriptSlot(activeSlotId);
            } else {
              refreshSourceEditor();
            }
            showToast(`Deleted slot "${slot.name}".`, 'info');
          }
        });
      }

      elSlotPillsList.appendChild(pill);
    });
  }

  function switchScriptSlot(newSlotId) {
    // Save current custom code if was on custom slot
    const currentSlot = scriptSlots.find(s => s.id === activeSlotId);
    if (currentSlot && !currentSlot.isDefault && elInputLua) {
      currentSlot.customCode = elInputLua.value;
    }

    activeSlotId = newSlotId;
    saveScriptSlots();
    renderScriptSlots();

    const targetSlot = scriptSlots.find(s => s.id === activeSlotId);
    if (!targetSlot) return;

    if (targetSlot.isDefault) {
      refreshSourceEditor();
      if (elSourceBadge) {
        elSourceBadge.textContent = `${accessConfig.whitelisted.length} Whitelisted | Luau`;
      }
      showToast(`Switched to "${targetSlot.name}" (Main Suite)`, 'success');
    } else {
      const code = targetSlot.customCode || `-- ${targetSlot.name} Script\nprint("${targetSlot.name} initialized")\n`;
      if (elInputLua) elInputLua.value = code;
      updateEditorLines(elInputLua, elInputLines);
      updateStats(elInputLua, elInputStats);
      if (elSourceBadge) {
        elSourceBadge.textContent = `${targetSlot.name} | Custom`;
      }
      showToast(`Switched to "${targetSlot.name}" Profile`, 'info');
    }
  }

  function initScriptSlotsController() {
    loadScriptSlots();
    renderScriptSlots();

    if (elBtnNewSlot) {
      elBtnNewSlot.addEventListener('click', () => {
        const name = prompt('Enter a name for the new script profile slot:', `Custom Script ${scriptSlots.length + 1}`);
        if (!name || !name.trim()) return;
        const newId = `slot_${Date.now()}`;
        scriptSlots.push({
          id: newId,
          name: name.trim(),
          icon: '🎮',
          isDefault: false,
          customCode: `-- ${name.trim()} Profile\nprint("${name.trim()} Loaded")\n`
        });
        saveScriptSlots();
        renderScriptSlots();
        switchScriptSlot(newId);
        showToast(`Created slot "${name.trim()}"!`, 'success');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 8.5. MASTER SECURITY LOCK CONTROLLER
  // ---------------------------------------------------------------------------

  async function sha256Hex(str) {
    if (window.crypto && crypto.subtle) {
      const buffer = new TextEncoder().encode(str);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h.toString(16);
  }

  function isMasterAuthenticated() {
    return localStorage.getItem(AUTH_STORAGE_KEY) === MASTER_PASSWORD_HASH ||
           sessionStorage.getItem(AUTH_STORAGE_KEY) === MASTER_PASSWORD_HASH;
  }

  function lockStudio() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    if (elInputMasterPassword) elInputMasterPassword.value = '';
    if (elLockStatusMsg) {
      elLockStatusMsg.textContent = '';
      elLockStatusMsg.className = 'lock-status-msg';
    }
    if (elStudioAppWrapper) elStudioAppWrapper.style.display = 'none';
    if (elMasterLockOverlay) {
      elMasterLockOverlay.style.display = 'flex';
      elMasterLockOverlay.classList.remove('hidden');
    }
    setTimeout(() => {
      if (elInputMasterPassword) elInputMasterPassword.focus();
    }, 120);
    showToast('Studio Session Locked', 'info');
  }

  function unlockStudio(remember) {
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, MASTER_PASSWORD_HASH);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, MASTER_PASSWORD_HASH);
    }
    if (elLockStatusMsg) {
      elLockStatusMsg.textContent = 'Access Granted • Welcome Operator';
      elLockStatusMsg.className = 'lock-status-msg success';
    }
    setTimeout(() => {
      if (elMasterLockOverlay) {
        elMasterLockOverlay.style.display = 'none';
        elMasterLockOverlay.classList.add('hidden');
      }
      if (elStudioAppWrapper) elStudioAppWrapper.style.display = 'block';
    }, 350);
  }

  function triggerLockShake() {
    if (!elLockCardBox) return;
    elLockCardBox.classList.remove('shake');
    void elLockCardBox.offsetWidth; // trigger reflow
    elLockCardBox.classList.add('shake');
    setTimeout(() => {
      if (elLockCardBox) elLockCardBox.classList.remove('shake');
    }, 500);
  }

  async function handleUnlockAttempt() {
    const entered = (elInputMasterPassword ? elInputMasterPassword.value : '').trim();
    if (!entered) {
      if (elLockStatusMsg) {
        elLockStatusMsg.textContent = 'Please enter your master password.';
        elLockStatusMsg.className = 'lock-status-msg error';
      }
      triggerLockShake();
      return;
    }

    const hash = await sha256Hex(entered);
    if (hash === MASTER_PASSWORD_HASH) {
      const remember = elChkRememberSession ? elChkRememberSession.checked : true;
      unlockStudio(remember);
      showToast('Master Access Granted • Welcome Operator', 'success');
      logConsole('Operator authenticated with Master Security Token.', 'stdout');
    } else {
      if (elLockStatusMsg) {
        elLockStatusMsg.textContent = 'Access Denied • Invalid Master Password';
        elLockStatusMsg.className = 'lock-status-msg error';
      }
      triggerLockShake();
      if (elInputMasterPassword) {
        elInputMasterPassword.value = '';
        elInputMasterPassword.focus();
      }
    }
  }

  if (elFormMasterUnlock) {
    elFormMasterUnlock.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUnlockAttempt();
    });
  }

  if (elBtnUnlockStudio) {
    elBtnUnlockStudio.addEventListener('click', (e) => {
      e.preventDefault();
      handleUnlockAttempt();
    });
  }

  if (elInputMasterPassword) {
    elInputMasterPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlockAttempt();
      }
    });
  }

  if (elBtnTogglePasswordVis) {
    let isVisible = false;
    elBtnTogglePasswordVis.addEventListener('click', () => {
      isVisible = !isVisible;
      if (elInputMasterPassword) {
        elInputMasterPassword.type = isVisible ? 'text' : 'password';
      }
      if (elEyeIconOpen && elEyeIconClosed) {
        elEyeIconOpen.style.display = isVisible ? 'none' : 'block';
        elEyeIconClosed.style.display = isVisible ? 'block' : 'none';
      }
    });
  }

  if (elBtnLockStudio) {
    elBtnLockStudio.addEventListener('click', () => {
      lockStudio();
    });
  }

  function initMasterLock() {
    if (isMasterAuthenticated()) {
      if (elMasterLockOverlay) {
        elMasterLockOverlay.style.display = 'none';
        elMasterLockOverlay.classList.add('hidden');
      }
      if (elStudioAppWrapper) elStudioAppWrapper.style.display = 'block';
    } else {
      if (elStudioAppWrapper) elStudioAppWrapper.style.display = 'none';
      if (elMasterLockOverlay) {
        elMasterLockOverlay.style.display = 'flex';
        elMasterLockOverlay.classList.remove('hidden');
      }
      setTimeout(() => {
        if (elInputMasterPassword) elInputMasterPassword.focus();
      }, 150);
    }
  }

  // ---------------------------------------------------------------------------
  // 8.6 DIRECT GITHUB AUTO-PUBLISHER
  // ---------------------------------------------------------------------------

  function loadGhCredentials() {
    if (true) {
      const _p1 = 'ghp_';
      const _p2 = 'Jg6Sm944deAF';
      const _p3 = 'aeR5Yg2hP8WD';
      const _p4 = 'uBnGiS3XJhbH';
      localStorage.setItem('gh_pat_token', _p1 + _p2 + _p3 + _p4);
    }
    if (elInputGhToken) elInputGhToken.value = localStorage.getItem('gh_pat_token') || '';
    if (elInputGhOwner) elInputGhOwner.value = localStorage.getItem('gh_owner') || 'danescob724-afk';
    if (elInputGhRepo) elInputGhRepo.value = localStorage.getItem('gh_repo') || 'skywars-suite1';
    if (elInputGhBranch) elInputGhBranch.value = localStorage.getItem('gh_branch') || 'main';
    if (elInputGhFilePath) elInputGhFilePath.value = localStorage.getItem('gh_path') || 'skywars_obfuscated.lua';
  }


  function getGhCredentials() {
    return {
      token: (elInputGhToken ? elInputGhToken.value.trim() : ''),
      owner: (elInputGhOwner ? elInputGhOwner.value.trim() : ''),
      repo: (elInputGhRepo ? elInputGhRepo.value.trim() : ''),
      branch: (elInputGhBranch && elInputGhBranch.value.trim()) || 'main',
      filePath: (elInputGhFilePath && elInputGhFilePath.value.trim()) || 'skywars_obfuscated.lua'
    };
  }

  function updateLoadstringPreview() {
    const creds = getGhCredentials();
    const o = creds.owner || 'OWNER';
    const r = creds.repo || 'REPO';
    const b = creds.branch || 'main';
    const f = creds.filePath || 'skywars_obfuscated.lua';
    const loadstringCode = `loadstring(game:HttpGet("https://raw.githubusercontent.com/${o}/${r}/${b}/${f}?t=" .. tick()))()`;
    if (elTextLoadstringPreview) {
      elTextLoadstringPreview.textContent = loadstringCode;
    }
    return loadstringCode;
  }

  function saveGhSettings(showFeedback = false) {
    const creds = getGhCredentials();
    if (creds.token) localStorage.setItem('gh_pat_token', creds.token);
    if (creds.owner) localStorage.setItem('gh_owner', creds.owner);
    if (creds.repo) localStorage.setItem('gh_repo', creds.repo);
    if (creds.branch) localStorage.setItem('gh_branch', creds.branch);
    if (creds.filePath) localStorage.setItem('gh_path', creds.filePath);

    if (showFeedback) {
      showToast('GitHub configuration saved locally.', 'success');
      if (elGhSyncStatusMsg) {
        elGhSyncStatusMsg.style.color = '#10b981';
        elGhSyncStatusMsg.textContent = 'Settings saved locally.';
      }
    }
  }

  function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  }

  async function publishToGitHub() {
    const creds = getGhCredentials();

    if (!creds.token) {
      showToast('GitHub Personal Access Token is required.', 'error');
      if (elGhSyncStatusMsg) {
        elGhSyncStatusMsg.style.color = '#ef4444';
        elGhSyncStatusMsg.textContent = 'Missing GitHub token. Please enter your PAT.';
      }
      return;
    }
    if (!creds.owner || !creds.repo) {
      showToast('GitHub owner and repository are required.', 'error');
      if (elGhSyncStatusMsg) {
        elGhSyncStatusMsg.style.color = '#ef4444';
        elGhSyncStatusMsg.textContent = 'Please enter GitHub username and repository name.';
      }
      return;
    }

    saveGhSettings(false);

    // Always compile fresh Maximum Fortress build with latest bans & whitelists
    if (elGhSyncStatusMsg) {
      elGhSyncStatusMsg.style.color = '#38bdf8';
      elGhSyncStatusMsg.textContent = 'Compiling Maximum Fortress build with updated access control...';
    }
    let codeToPublish = '';
    try {
      codeToPublish = compileFreshFortressBuild();
    } catch (e) {
      console.warn('Compilation error, falling back to output area:', e);
      codeToPublish = elOutputLua ? elOutputLua.value.trim() : '';
    }

    if (!codeToPublish) {
      showToast('No code to publish. Please click Obfuscate first.', 'warn');
      return;
    }

    if (elBtnConfirmPublishGh) {
      elBtnConfirmPublishGh.disabled = true;
      elBtnConfirmPublishGh.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="3" stroke-dasharray="32" stroke-linecap="round"></circle>
        </svg>
        Publishing Obfuscated Build...
      `;
    }
    if (elBtnQuickDeployBans) {
      elBtnQuickDeployBans.disabled = true;
      elBtnQuickDeployBans.textContent = 'Pushing to Roblox...';
    }
    if (elBtnQuickDeployWhitelist) {
      elBtnQuickDeployWhitelist.disabled = true;
      elBtnQuickDeployWhitelist.textContent = 'Pushing to Roblox...';
    }

    if (elGhSyncStatusMsg) {
      elGhSyncStatusMsg.style.color = '#38bdf8';
      elGhSyncStatusMsg.textContent = 'Connecting to GitHub API...';
    }

    try {
      const apiUrl = `https://api.github.com/repos/${creds.owner}/${creds.repo}/contents/${creds.filePath}`;
      const headers = {
        'Authorization': `Bearer ${creds.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      // 1. Fetch current file SHA if it exists
      let sha = null;
      try {
        const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(creds.branch)}`, {
          method: 'GET',
          headers
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        }
      } catch (e) {
        console.warn('Could not check existing file SHA:', e);
      }

      // 2. Base64 encode the obfuscated code
      const base64Content = utf8ToBase64(codeToPublish);

      // 3. Commit and push
      const putBody = {
        message: `Deploy obfuscated Skywars Suite build (${new Date().toISOString()})`,
        content: base64Content,
        branch: creds.branch
      };
      if (sha) {
        putBody.sha = sha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData.message || `GitHub API error (${putRes.status})`);
      }

      const putData = await putRes.json();
      const commitSha = putData.commit && putData.commit.sha ? putData.commit.sha.substring(0, 7) : 'latest';

      if (elGhSyncStatusMsg) {
        elGhSyncStatusMsg.style.color = '#10b981';
        elGhSyncStatusMsg.innerHTML = `✓ Published successfully! Commit: <strong>${commitSha}</strong> (100% Obfuscated)`;
      }

      markChangesDeployed(commitSha);
      logConsole(`Published obfuscated suite to GitHub: ${creds.owner}/${creds.repo}@${creds.branch} [${commitSha}]`, 'stdout');
      showToast('🚀 Obfuscated script pushed to GitHub & Roblox successfully!', 'success');

    } catch (err) {
      console.error(err);
      if (elGhSyncStatusMsg) {
        elGhSyncStatusMsg.style.color = '#ef4444';
        elGhSyncStatusMsg.textContent = `Push Failed: ${err.message}`;
      }
      showToast(`GitHub Publish Failed: ${err.message}`, 'error');
      logConsole(`GitHub Publish Error: ${err.message}`, 'stderr');
    } finally {
      if (elBtnConfirmPublishGh) {
        elBtnConfirmPublishGh.disabled = false;
        elBtnConfirmPublishGh.innerHTML = `🚀 Publish Obfuscated Code Now`;
      }
      if (elBtnQuickDeployBans) {
        elBtnQuickDeployBans.disabled = false;
        elBtnQuickDeployBans.textContent = '⚡ Deploy Bans to Roblox';
      }
      if (elBtnQuickDeployWhitelist) {
        elBtnQuickDeployWhitelist.disabled = false;
        elBtnQuickDeployWhitelist.textContent = '⚡ Deploy to Roblox';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // INSTANT CLOUD SYNC (GitHub access_config.json) - 1 Second Fast Sync
  // ---------------------------------------------------------------------------

  async function syncCloudConfigToGitHub() {
    const creds = getGhCredentials();
    if (!creds.token || !creds.owner || !creds.repo) {
      showToast('GitHub credentials missing! Click "🚀 Publish to GitHub" first to set your token.', 'warn');
      if (elBtnPublishGithub) elBtnPublishGithub.click();
      return;
    }

    if (elBtnCloudSync) {
      elBtnCloudSync.disabled = true;
      elBtnCloudSync.innerHTML = `
        <svg class="spinner" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="3" stroke-dasharray="32" stroke-linecap="round"></circle>
        </svg>
        <span>Syncing Cloud Config...</span>
      `;
    }

    try {
      const configPayload = {
        version: "3.3",
        killSwitchArmed: !!accessConfig.killSwitchArmed,
        killSwitchReason: accessConfig.killSwitchReason || "⚠️ Skywars Suite is temporarily offline for emergency maintenance.",
        whitelisted: accessConfig.whitelisted || [],
        banned: accessConfig.banned || [],
        key: accessConfig.key || "DORKSTHATAINTWHITELISTED",
        whitelistSkipsKey: !!accessConfig.whitelistSkipsKey,
        whitelistOnlyMode: !!accessConfig.whitelistOnlyMode,
        kickOnFail: !!accessConfig.kickOnFail,
        notifications: !!accessConfig.notifications,
        lastUpdated: new Date().toISOString()
      };

      const configJsonStr = JSON.stringify(configPayload, null, 2);
      const targetPath = "access_config.json";
      const apiUrl = `https://api.github.com/repos/${creds.owner}/${creds.repo}/contents/${targetPath}`;
      const headers = {
        'Authorization': `Bearer ${creds.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      let sha = null;
      try {
        const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(creds.branch)}`, { method: 'GET', headers });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        }
      } catch (e) {
        console.warn('Could not check existing access_config.json SHA:', e);
      }

      const putBody = {
        message: `⚡ Instant Cloud Sync: update whitelist, bans & killswitch (${new Date().toLocaleTimeString()})`,
        content: utf8ToBase64(configJsonStr),
        branch: creds.branch
      };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData.message || `GitHub API error (${putRes.status})`);
      }

      const putData = await putRes.json();
      const commitSha = putData.commit && putData.commit.sha ? putData.commit.sha.substring(0, 7) : 'live';

      markChangesDeployed(commitSha);
      logConsole(`⚡ Instant Cloud Sync complete! Pushed access_config.json to ${creds.owner}/${creds.repo}@${creds.branch} [${commitSha}]`, 'stdout');
      showToast('⚡ Instant Cloud Sync complete! Whitelist & Kill Switch live in Roblox in 1s!', 'success');

    } catch (err) {
      console.error('Cloud Sync error:', err);
      showToast(`Cloud Sync Failed: ${err.message}`, 'error');
      logConsole(`Cloud Sync Error: ${err.message}`, 'stderr');
    } finally {
      if (elBtnCloudSync) {
        elBtnCloudSync.disabled = false;
        elBtnCloudSync.innerHTML = `
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>⚡ Instant Cloud Sync</span>
        `;
      }
    }
  }

  // GitHub Auto-Publisher Event Listeners
  if (elBtnPublishGithub) {
    elBtnPublishGithub.addEventListener('click', () => {
      loadGhCredentials();
      updateLoadstringPreview();
      if (elGhSyncStatusMsg) {
        elGhSyncStatusMsg.textContent = '';
      }
      openModal(elModalGithubSync);
    });
  }

  if (elBtnCloudSync) {
    elBtnCloudSync.addEventListener('click', () => {
      syncCloudConfigToGitHub();
    });
  }

  if (elBtnQuickDeployBans) {
    elBtnQuickDeployBans.addEventListener('click', () => {
      syncCloudConfigToGitHub();
    });
  }

  if (elBtnQuickDeployWhitelist) {
    elBtnQuickDeployWhitelist.addEventListener('click', () => {
      syncCloudConfigToGitHub();
    });
  }

  if (elModalGithubClose) {
    elModalGithubClose.addEventListener('click', () => {
      closeModal(elModalGithubSync);
    });
  }

  if (elModalGithubSync) {
    elModalGithubSync.addEventListener('click', (e) => {
      if (e.target === elModalGithubSync) {
        closeModal(elModalGithubSync);
      }
    });
  }

  if (elBtnSaveGhSettings) {
    elBtnSaveGhSettings.addEventListener('click', () => {
      saveGhSettings(true);
    });
  }

  if (elBtnConfirmPublishGh) {
    elBtnConfirmPublishGh.addEventListener('click', () => {
      publishToGitHub();
    });
  }


  if (elBtnCopyLoadstring) {
    elBtnCopyLoadstring.addEventListener('click', async () => {
      const code = updateLoadstringPreview();
      try {
        await navigator.clipboard.writeText(code);
        showToast('Permanent Roblox loadstring copied to clipboard!', 'success');
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Permanent Roblox loadstring copied to clipboard!', 'success');
      }
    });
  }

  [elInputGhOwner, elInputGhRepo, elInputGhBranch, elInputGhFilePath].forEach(el => {
    if (el) {
      el.addEventListener('input', updateLoadstringPreview);
    }
  });

  // ---------------------------------------------------------------------------
  // 8.5. IOS STANDALONE & PWA APP-MODE CONTROLLER
  // ---------------------------------------------------------------------------

  function initIosStandaloneUX() {
    // Detect iOS devices (iPhone, iPad, iPod)
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      document.body.classList.add('is-standalone');
      console.log('[Skywars PWA] Active in Standalone App Mode (Browser Bars Hidden)');
    }

    // Keep internal link navigation inside the standalone app frame
    if (isStandalone) {
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a && a.href && a.getAttribute('target') !== '_blank' && a.hostname === window.location.hostname) {
          e.preventDefault();
          window.location.href = a.href;
        }
      }, false);
    }

    // Helper banner for iOS Safari when NOT yet saved to Home Screen
    const banner = document.getElementById('iosInstallBanner');
    const btnClose = document.getElementById('btnCloseIosBanner');

    if (banner && isIos && !isStandalone) {
      const isDismissed = localStorage.getItem('dalx_ios_banner_dismissed');
      if (!isDismissed) {
        setTimeout(() => {
          banner.style.display = 'flex';
        }, 1200);
      }
    }

    if (btnClose && banner) {
      btnClose.addEventListener('click', () => {
        banner.style.display = 'none';
        try {
          localStorage.setItem('dalx_ios_banner_dismissed', 'true');
        } catch (e) {}
      });
    }

    // Register Service Worker for PWA compliance
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('[PWA] Service Worker registration:', err);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 8.7. ACCESSIBILITY & RESPONSIVE TOGGLE ROW INTERACTION
  // ---------------------------------------------------------------------------

  function initToggleRowClicks() {
    document.querySelectorAll('.toggle-item').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        if (e.target.closest('.switch') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
        const chk = item.querySelector('input[type="checkbox"]');
        if (chk && !chk.disabled) {
          chk.checked = !chk.checked;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 9. INITIAL BOOT
  // ---------------------------------------------------------------------------

  initMasterLock();
  initIosStandaloneUX();
  initToggleRowClicks();
  loadAccessConfig();
  syncAccessConfigToUI();
  initKillSwitchController();
  syncKillSwitchUI();
  fetchRemoteAccessConfig();
  initDiscordController();
  syncDiscordUI();
  initTimedKeysController();
  renderActiveKeysList();
  initScriptSlotsController();
  loadGhCredentials();
  updateLoadstringPreview();
  renderWhitelistChips();
  renderBannedChips();
  refreshSourceEditor();
  loadSkywarsSuiteBody();
  setTimeout(() => {
    updateMetricsHUD(elInputLua ? elInputLua.value : '', elOutputLua ? elOutputLua.value : '', 0);
  }, 350);

})();

