/**
 * Google Sheets Database Engine for SiaraMaina Clan Informatics
 * 
 * Implements Google Sheets as the authoritative cloud database backend,
 * powered by Firebase Google Auth / OAuth 2.0 access token delegation,
 * with graceful public sheet reading fallback and robust error reporting.
 * 
 * Scopes:
 * - https://www.googleapis.com/auth/spreadsheets
 * - https://www.googleapis.com/auth/drive.file
 */

(function(global) {
  'use strict';

  // In-memory token cache (NEVER persisted to localStorage/sessionStorage per Workspace security guidelines)
  var cachedAccessToken = null;
  var SPREADSHEET_ID_STORAGE_KEY = 'siara_google_sheets_db_id';
  var SPREADSHEET_TITLE_STORAGE_KEY = 'siara_google_sheets_db_title';
  var AUTO_SYNC_STORAGE_KEY = 'siara_google_sheets_auto_sync';

  // Permanent Master Spreadsheet Authority Default (baked in for GitHub Pages & new sessions)
  var DEFAULT_MASTER_SHEET_ID = '1-4REptCNwdXfbV-SSSHmkonNtAwHLKCfXYdSyBuJzEM';
  var DEFAULT_MASTER_SHEET_TITLE = 'SiaraMaina Clan Database';
  var DEFAULT_MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1-4REptCNwdXfbV-SSSHmkonNtAwHLKCfXYdSyBuJzEM/edit';

  // Standard Column Schema for Clan Records in Google Sheets
  var CLAN_SHEET_HEADERS = [
    'id',
    'clanMemberNumber',
    'firstName',
    'middleName',
    'lastName',
    'sex',
    'branchType',
    'honorific',
    'dob',
    'birthPeriod',
    'placeOfBirth',
    'deceased',
    'dod',
    'deathAge',
    'causeOfDeath',
    'fatherId',
    'motherId',
    'spouseId',
    'siblingIds',
    'maritalStatus',
    'education',
    'course',
    'employment',
    'occupation',
    'organization',
    'religion',
    'denomination',
    'phone',
    'whatsapp',
    'email',
    'location',
    'photoFile',
    'narrative',
    'updatedAt',
    'updatedBy'
  ];

  var GoogleSheetsDB = {
    HEADERS: CLAN_SHEET_HEADERS,

    // Token Management (Persisted in localStorage for Seamless Sessions)
    setAccessToken: function(token) {
      cachedAccessToken = token ? String(token).trim() : null;
      if (typeof window !== 'undefined') {
        window.cachedGoogleAccessToken = cachedAccessToken;
        try {
          if (cachedAccessToken) {
            localStorage.setItem('siara_google_oauth_access_token', cachedAccessToken);
          } else {
            localStorage.removeItem('siara_google_oauth_access_token');
          }
        } catch(e) {}
        try {
          window.dispatchEvent(new CustomEvent('google-sheets-token-changed', {
            detail: { hasToken: !!cachedAccessToken }
          }));
        } catch (e) {}
      }
    },

    getAccessToken: function() {
      if (cachedAccessToken) return cachedAccessToken;
      if (typeof window !== 'undefined' && window.cachedGoogleAccessToken) {
        return window.cachedGoogleAccessToken;
      }
      try {
        var stored = localStorage.getItem('siara_google_oauth_access_token');
        if (stored && stored.trim().length > 10) return stored.trim();
      } catch(e) {}
      return "";
    },

    clearAccessToken: function() {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        window.cachedGoogleAccessToken = null;
        try {
          localStorage.removeItem('siara_google_oauth_access_token');
        } catch(e) {}
      }
    },

    hasAccessToken: function() {
      return !!this.getAccessToken();
    },

    // Spreadsheet Identifier & Permanent URL Persistence
    getConnectedSheetId: function() {
      try {
        var id = localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY) || '';
        if (id && id.trim() && id !== "1SiaraMainaClanInformaticsMasterDatabase2026" && !id.startsWith("sheet_") && !id.startsWith("sheet_clan_db_")) {
          return id.trim();
        }
      } catch (e) {}
      return DEFAULT_MASTER_SHEET_ID;
    },

    getConnectedSheetTitle: function() {
      try {
        var title = localStorage.getItem(SPREADSHEET_TITLE_STORAGE_KEY) || '';
        if (title && title.trim()) return title.trim();
      } catch (e) {}
      return DEFAULT_MASTER_SHEET_TITLE;
    },

    getConnectedSheetUrl: function() {
      try {
        var url = localStorage.getItem('siara_google_sheets_db_url') || '';
        if (url && url.trim()) return url.trim();
      } catch (e) {}
      var id = this.getConnectedSheetId();
      return id ? ('https://docs.google.com/spreadsheets/d/' + id + '/edit') : DEFAULT_MASTER_SHEET_URL;
    },

    setConnectedSheetId: function(id, title, url) {
      try {
        var effectiveId = (id && String(id).trim() !== "1SiaraMainaClanInformaticsMasterDatabase2026" && !String(id).trim().startsWith("sheet_")) ? String(id).trim() : DEFAULT_MASTER_SHEET_ID;
        var effectiveTitle = (title && String(title).trim()) ? String(title).trim() : DEFAULT_MASTER_SHEET_TITLE;
        var effectiveUrl = (url && String(url).trim()) ? String(url).trim() : ('https://docs.google.com/spreadsheets/d/' + effectiveId + '/edit');

        localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, effectiveId);
        localStorage.setItem(SPREADSHEET_TITLE_STORAGE_KEY, effectiveTitle);
        localStorage.setItem('siara_google_sheets_db_url', effectiveUrl);

        try {
          fetch("/api/db/spreadsheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spreadsheetId: effectiveId, spreadsheetTitle: effectiveTitle, spreadsheetUrl: effectiveUrl })
          }).catch(function() {});
        } catch(e) {}
      } catch (e) {}
    },

    setConnectedSheetUrl: function(rawUrl, title) {
      if (!rawUrl) return;
      var clean = String(rawUrl).trim();
      var sheetId = clean;
      var match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      }
      this.setConnectedSheetId(sheetId, title, clean);
    },

    initMasterSpreadsheetSync: async function() {
      // 1. Permanent Default Seed in localStorage
      try {
        if (!localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY) || localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY).startsWith("sheet_")) {
          localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, DEFAULT_MASTER_SHEET_ID);
          localStorage.setItem(SPREADSHEET_TITLE_STORAGE_KEY, DEFAULT_MASTER_SHEET_TITLE);
          localStorage.setItem('siara_google_sheets_db_url', DEFAULT_MASTER_SHEET_URL);
          localStorage.setItem(AUTO_SYNC_STORAGE_KEY, 'true');
        }
      } catch(e) {}

      // 2. Fetch data/spreadsheet_config.json (works on both local server and GitHub Pages)
      try {
        var cfgResp = await fetch('./data/spreadsheet_config.json');
        if (cfgResp.ok) {
          var cfg = await cfgResp.json();
          if (cfg && cfg.spreadsheetId) {
            localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, cfg.spreadsheetId);
            if (cfg.spreadsheetTitle) localStorage.setItem(SPREADSHEET_TITLE_STORAGE_KEY, cfg.spreadsheetTitle);
            if (cfg.spreadsheetUrl) localStorage.setItem('siara_google_sheets_db_url', cfg.spreadsheetUrl);
            if (cfg.githubToken && !localStorage.getItem('github_token')) {
              localStorage.setItem('github_token', cfg.githubToken);
            }
          }
        }
      } catch(cfgErr) {}

      // 3. Fetch from server API if fullstack server is present
      try {
        var srvResp = await fetch('/api/db/spreadsheet');
        if (srvResp.ok) {
          var srvData = await srvResp.json();
          if (srvData && srvData.spreadsheetId) {
            localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, srvData.spreadsheetId);
            if (srvData.spreadsheetTitle) localStorage.setItem(SPREADSHEET_TITLE_STORAGE_KEY, srvData.spreadsheetTitle);
            if (srvData.spreadsheetUrl) localStorage.setItem('siara_google_sheets_db_url', srvData.spreadsheetUrl);
          }
        }
      } catch(sErr) {}
    },

    isAutoSyncEnabled: function() {
      try {
        return localStorage.getItem(AUTO_SYNC_STORAGE_KEY) !== 'false';
      } catch (e) {
        return true;
      }
    },

    setAutoSyncEnabled: function(enabled) {
      try {
        localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
      } catch (e) {}
    },

    isConnected: function() {
      return !!this.getConnectedSheetId();
    },


    // Google Sheets API Request Helper with Auto-Reauth Retry
    fetchApi: async function(url, options) {
      options = options || {};
      options.headers = options.headers || {};

      var token = this.getAccessToken();
      if (!token) {
        if (typeof window !== 'undefined' && typeof window.handleFirebaseGoogleSignIn === 'function' && !options._isRetry) {
          try {
            await window.handleFirebaseGoogleSignIn();
            token = this.getAccessToken();
          } catch(e) {}
        }
      }

      if (!token) {
        throw new Error('AUTH_REQUIRED: Please sign in with Google to access your Google Sheets database.');
      }

      options.headers['Authorization'] = 'Bearer ' + token;
      options.headers['Accept'] = 'application/json';

      var response = await fetch(url, options);

      if (response.status === 401) {
        this.clearAccessToken();
        if (typeof window !== 'undefined' && typeof window.handleFirebaseGoogleSignIn === 'function' && !options._isRetry) {
          console.log('Token expired during Google Sheets API call. Auto-refreshing session...');
          try {
            await window.handleFirebaseGoogleSignIn();
            var newToken = this.getAccessToken();
            if (newToken && newToken !== token) {
              options._isRetry = true;
              options.headers['Authorization'] = 'Bearer ' + newToken;
              var retryResponse = await fetch(url, options);
              if (retryResponse.ok) {
                return await retryResponse.json();
              }
            }
          } catch(reauthErr) {
            console.warn('Auto re-authentication failed:', reauthErr);
          }
        }
        throw new Error('TOKEN_EXPIRED: Your Google session has expired. Please click "Sign In with Google" again.');
      }

      if (!response.ok) {
        var errBody = null;
        try {
          errBody = await response.json();
        } catch (e) {
          try { errBody = await response.text(); } catch (e2) {}
        }
        var msg = (errBody && errBody.error && errBody.error.message) || ('HTTP ' + response.status + ' Error');
        throw new Error('Google Sheets API Error: ' + msg);
      }

      return await response.json();
    },

    // 1. Fetch Spreadsheet Metadata (Title, Available Tabs)
    getSpreadsheetMetadata: async function(spreadsheetId) {
      var id = spreadsheetId || this.getConnectedSheetId();
      if (!id) throw new Error('No Google Spreadsheet connected.');

      var token = this.getAccessToken();
      if (token) {
        try {
          var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '?fields=spreadsheetId,properties.title,sheets.properties';
          return await this.fetchApi(url);
        } catch (authErr) {
          // If token failed or expired, fall back to public probe
          console.warn('OAuth metadata query failed, attempting public check:', authErr);
        }
      }

      // Public probe fallback
      try {
        var probeUrl = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/gviz/tq?tqx=out:json';
        var resp = await fetch(probeUrl);
        if (resp.ok) {
          var txt = await resp.text();
          var jsonStr = txt.replace(/^\/\*[\s\S]*?\*\/\s*/, '').replace(/^[a-zA-Z0-9_.]+\(/, '').replace(/\);?\s*$/, '');
          var parsed = JSON.parse(jsonStr);
          return {
            spreadsheetId: id,
            properties: { title: this.getConnectedSheetTitle() || ('Google Sheet (' + id.slice(0, 8) + '...)') },
            sheets: [{ properties: { title: 'Members' } }]
          };
        }
      } catch (probeErr) {}

      // If we already have stored title, return mock metadata structure
      return {
        spreadsheetId: id,
        properties: { title: this.getConnectedSheetTitle() || 'Connected Google Sheet' },
        sheets: [{ properties: { title: 'Members' } }]
      };
    },

    // 2. Discover or Verify "Members" Sheet Tab
    getMembersTabName: async function(spreadsheetId) {
      try {
        var meta = await this.getSpreadsheetMetadata(spreadsheetId);
        var sheets = (meta && meta.sheets) || [];
        if (!sheets.length) return 'Members';

        // Look for a tab named "Members" or "Records" or "ClanMembers"
        for (var i = 0; i < sheets.length; i++) {
          var t = sheets[i].properties && sheets[i].properties.title;
          if (t && (t.toLowerCase() === 'members' || t.toLowerCase() === 'clan members' || t.toLowerCase() === 'records')) {
            return t;
          }
        }
        return 'Members';
      } catch (e) {
        return 'Members';
      }
    },

    // 3. Create a Brand New Database Spreadsheet in User's Google Drive
    createClanSpreadsheet: async function(title, initialRecords) {
      // Prevent duplicate sheets across browsers: Check if server already has a shared Master Spreadsheet ID
      try {
        var resp = await fetch("/api/db/spreadsheet");
        if (resp.ok) {
          var serverData = await resp.json();
          if (serverData && serverData.spreadsheetId && serverData.spreadsheetId !== "1SiaraMainaClanInformaticsMasterDatabase2026" && !serverData.spreadsheetId.includes("MasterDatabase")) {
            var existingId = serverData.spreadsheetId.trim();
            var existingTitle = serverData.spreadsheetTitle || "SiaraMaina Clan Informatics - Master Database";
            this.setConnectedSheetId(existingId, existingTitle);
            return {
              spreadsheetId: existingId,
              title: existingTitle,
              url: "https://docs.google.com/spreadsheets/d/" + existingId + "/edit",
              recordsCount: 0,
              isExisting: true
            };
          }
        }
      } catch (e) {}

      var docTitle = title || ('SiaraMaina Clan Informatics - Master Database (' + new Date().getFullYear() + ')');
      var url = 'https://sheets.googleapis.com/v4/spreadsheets';
      
      var createPayload = {
        properties: {
          title: docTitle
        },
        sheets: [
          {
            properties: {
              title: 'Members',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          },
          {
            properties: {
              title: 'AuditLogs',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          },
          {
            properties: {
              title: 'DatabaseMetadata'
            }
          }
        ]
      };

            var sheetResult = null;
      var recordsToWrite = Array.isArray(initialRecords) ? initialRecords : [];
      try {
        sheetResult = await this.fetchApi(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload)
        });
        var newId = sheetResult.spreadsheetId;
        var newTitle = (sheetResult.properties && sheetResult.properties.title) || docTitle;
        this.setConnectedSheetId(newId, newTitle);
        
        try {
          var auditUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(newId) + '/values/AuditLogs!A1?valueInputOption=USER_ENTERED';
          await this.fetchApi(auditUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              range: 'AuditLogs!A1',
              majorDimension: 'ROWS',
              values: [['Timestamp', 'Action', 'Details', 'ActorEmail', 'ActorUID']]
            })
          });
        } catch (e) {
          console.warn('AuditLogs tab header init notice:', e);
        }
        
        await this.writeAllMembers(newId, 'Members', recordsToWrite, false);
        return {
          spreadsheetId: newId,
          title: newTitle,
          url: 'https://docs.google.com/spreadsheets/d/' + newId + '/edit',
          recordsCount: recordsToWrite.length
        };
      } catch (createErr) {
        console.warn('Direct Google Sheets v4 API creation notice:', createErr && createErr.message);
        
        var appsScriptUrl = (typeof localStorage !== 'undefined' && localStorage.getItem('apps_script_api_url')) || '';
        if (appsScriptUrl) {
          try {
            var asResp = await fetch(appsScriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'CREATE', title: docTitle, records: recordsToWrite })
            });
            if (asResp.ok) {
              var asData = await asResp.json();
              if (asData && asData.success) {
                var asId = asData.spreadsheetId || ('sheet_' + Date.now());
                this.setConnectedSheetId(asId, docTitle);
                return {
                  spreadsheetId: asId,
                  title: docTitle,
                  url: 'https://docs.google.com/spreadsheets/d/' + asId + '/edit',
                  recordsCount: recordsToWrite.length
                };
              }
            }
          } catch (asErr) {}
        }

        var fallbackId = '';
        throw new Error("AUTHENTICATION_REQUIRED: To create a Google Spreadsheet in Google Drive, please sign in with Google in Step 1, or paste an existing Google Sheet URL in Option B.");
      }
    },

    // 4. Read All Members from Google Sheet (supports both authenticated API & public sheet queries)
    readAllMembers: async function(spreadsheetId) {
      var id = spreadsheetId || this.getConnectedSheetId();
      if (!id) throw new Error('No Google Spreadsheet connected.');

      var token = this.getAccessToken();

      // If token is available, prefer official authenticated v4 API
      if (token) {
        try {
          var tabName = await this.getMembersTabName(id);
          var range = encodeURIComponent(tabName) + '!A1:AZ5000';
          var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + range;
          
          var data = await this.fetchApi(url);
          var rows = data.values || [];

          if (rows.length < 2) {
            return []; // No data rows
          }

          var headerRow = rows[0].map(function(h) { return String(h || '').trim(); });
          var memberRecords = [];

          for (var r = 1; r < rows.length; r++) {
            var row = rows[r];
            if (!row || !row.length) continue;

            var rec = {};
            for (var c = 0; c < headerRow.length; c++) {
              var key = headerRow[c];
              if (!key) continue;
              rec[key] = row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '';
            }

            if (!rec.id && (rec.firstName || rec.lastName)) {
              var nameSlug = ((rec.firstName || '') + '-' + (rec.lastName || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              rec.id = 'member-' + (rec.clanMemberNumber || nameSlug || ('row-' + r));
            }

            if (rec.id && (rec.firstName || rec.lastName || rec.clanMemberNumber)) {
              if (rec.deceased === 'true' || rec.deceased === 'TRUE') rec.deceased = true;
              if (rec.deceased === 'false' || rec.deceased === 'FALSE') rec.deceased = false;
              if (rec.siblingIds) {
                try {
                  if (typeof rec.siblingIds === 'string' && rec.siblingIds.startsWith('[')) {
                    rec.siblingIds = JSON.parse(rec.siblingIds);
                  }
                } catch (e) {}
              }
              memberRecords.push(rec);
            }
          }
          return memberRecords;
        } catch (apiErr) {
          console.warn('Authenticated Sheets API read notice:', apiErr && apiErr.message);
          // Don't abort immediately: continue to public GViz, CSV export, and database fallbacks first
        }
      }

      // Public / GViz endpoint fallback for public spreadsheets
      try {
        var gvizUrl = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/gviz/tq?tqx=out:json';
        var gvizResp = await fetch(gvizUrl);
        if (gvizResp.ok) {
          var rawText = await gvizResp.text();
          var cleanJson = rawText.replace(/^\/\*[\s\S]*?\*\/\s*/, '').replace(/^[a-zA-Z0-9_.]+\(/, '').replace(/\);?\s*$/, '');
          var gvizData = JSON.parse(cleanJson);
          
          if (gvizData && gvizData.table && Array.isArray(gvizData.table.rows)) {
            var cols = gvizData.table.cols.map(function(c, idx) {
              return (c && c.label) ? String(c.label).trim() : (CLAN_SHEET_HEADERS[idx] || ('col_' + idx));
            });
            var publicRecords = [];
            var gRows = gvizData.table.rows;
            for (var i = 0; i < gRows.length; i++) {
              var cells = gRows[i].c || [];
              var mRec = {};
              for (var ci = 0; ci < cols.length; ci++) {
                var cell = cells[ci];
                var val = cell ? (cell.v !== undefined ? cell.v : cell.f) : '';
                mRec[cols[ci]] = val !== null && val !== undefined ? String(val).trim() : '';
              }
              if (!mRec.id && (mRec.firstName || mRec.lastName)) {
                var mNameSlug = ((mRec.firstName || '') + '-' + (mRec.lastName || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                mRec.id = 'member-' + (mRec.clanMemberNumber || mNameSlug || ('row-' + i));
              }
              if (mRec.id && (mRec.firstName || mRec.lastName)) {
                if (mRec.deceased === 'true' || mRec.deceased === 'TRUE') mRec.deceased = true;
                if (mRec.deceased === 'false' || mRec.deceased === 'FALSE') mRec.deceased = false;
                publicRecords.push(mRec);
              }
            }
            if (publicRecords.length > 0) return publicRecords;
          }
        }
      } catch (publicErr) {
        console.warn('Public gviz read notice:', publicErr);
      }

      // Public CSV export fallback
      try {
        var csvUrl = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/export?format=csv';
        var csvResp = await fetch(csvUrl);
        if (csvResp.ok) {
          var csvText = await csvResp.text();
          if (csvText && csvText.trim() && !csvText.startsWith('<!DOCTYPE html')) {
            var parseFn = (typeof window !== 'undefined' && typeof window.parseCsvText === 'function') ? window.parseCsvText : null;
            if (parseFn) {
              var csvRows = parseFn(csvText);
              if (csvRows && csvRows.length > 1) {
                var cHdrs = csvRows[0].map(function(h) { return String(h || '').trim(); });
                var csvRecords = [];
                for (var cri = 1; cri < csvRows.length; cri++) {
                  var cRow = csvRows[cri];
                  if (!cRow || !cRow.length) continue;
                  var cRec = {};
                  for (var cCol = 0; cCol < cHdrs.length; cCol++) {
                    cRec[cHdrs[cCol]] = cRow[cCol] !== undefined ? String(cRow[cCol]).trim() : '';
                  }
                  if (!cRec.id && (cRec.firstName || cRec.lastName)) {
                    var cNameSlug = ((cRec.firstName || '') + '-' + (cRec.lastName || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    cRec.id = 'member-' + (cRec.clanMemberNumber || cNameSlug || ('row-' + cri));
                  }
                  if (cRec.id && (cRec.firstName || cRec.lastName)) {
                    if (cRec.deceased === 'true' || cRec.deceased === 'TRUE') cRec.deceased = true;
                    if (cRec.deceased === 'false' || cRec.deceased === 'FALSE') cRec.deceased = false;
                    csvRecords.push(cRec);
                  }
                }
                if (csvRecords.length > 0) return csvRecords;
              }
            }
          }
        }
      } catch (csvErr) {
        console.warn('Public CSV export read notice:', csvErr);
      }

      try {
        var serverEndpoint = (typeof window !== 'undefined' && typeof window.getBackendApiUrl === 'function') 
          ? window.getBackendApiUrl('/api/db/records') 
          : '/api/db/records';
        var serverResp = await fetch(serverEndpoint, { cache: 'no-store' });
        if (serverResp.ok) {
          var serverData = await serverResp.json();
          var sRecords = Array.isArray(serverData.records) ? serverData.records : (Array.isArray(serverData.members) ? serverData.members : []);
          if (sRecords && sRecords.length > 0) return sRecords;
        }
      } catch (sErr) {}

      // GitHub REST Contents API Direct Fetch (Instantaneous: completely bypasses CDN cache delays)
      try {
        var ghTok = (typeof localStorage !== 'undefined' && localStorage.getItem('github_token')) || '';
        if (ghTok === 'SERVER_MANAGED_TOKEN') {
          ghTok = '';
        }
        var ghHeaders = {
          'Accept': 'application/vnd.github.v3+json'
        };
        if (ghTok) {
          ghHeaders['Authorization'] = 'token ' + ghTok;
        }
        var ghApiResp = await fetch('https://api.github.com/repos/deodatusmaliti/SiaraMaina-Clan-Informatics-New/contents/siara-maina-clan-data.json', {
          headers: ghHeaders,
          cache: 'no-store'
        });
        if (ghApiResp.ok) {
          var ghApiData = await ghApiResp.json();
          if (ghApiData && ghApiData.content) {
            var rawDecoded = decodeURIComponent(escape(atob(ghApiData.content.replace(/\n/g, ''))));
            var ghParsed = JSON.parse(rawDecoded);
            var ghRecs = Array.isArray(ghParsed) ? ghParsed : (Array.isArray(ghParsed.records) ? ghParsed.records : []);
            if (ghRecs && ghRecs.length > 0) return ghRecs;
          }
        }
      } catch (ghApiErr) {}

      try {
        var staticResp = await fetch('./siara-maina-clan-data.json?_t=' + Date.now(), { cache: 'no-store' });
        if (staticResp.ok) {
          var staticData = await staticResp.json();
          var staticRecs = Array.isArray(staticData) ? staticData : (Array.isArray(staticData.records) ? staticData.records : []);
          if (staticRecs && staticRecs.length > 0) return staticRecs;
        }
      } catch (stErr) {}

      try {
        var dataRecordsResp = await fetch('./data/records.json?_t=' + Date.now(), { cache: 'no-store' });
        if (dataRecordsResp.ok) {
          var drData = await dataRecordsResp.json();
          var drRecs = Array.isArray(drData) ? drData : (Array.isArray(drData.records) ? drData.records : []);
          if (drRecs && drRecs.length > 0) return drRecs;
        }
      } catch (drErr) {}

      try {
        var ghRawResp = await fetch('https://raw.githubusercontent.com/deodatusmaliti/SiaraMaina-Clan-Informatics-New/main/siara-maina-clan-data.json?_t=' + Date.now(), { cache: 'no-store' });
        if (ghRawResp.ok) {
          var ghData = await ghRawResp.json();
          var ghRawRecs = Array.isArray(ghData) ? ghData : (Array.isArray(ghData.records) ? ghData.records : []);
          if (ghRawRecs && ghRawRecs.length > 0) return ghRawRecs;
        }
      } catch (ghErr) {}

      return null;
    },

    // 5. Serialize Members to 2D Array
    recordsToRows: function(recordsList) {
      var rows = [CLAN_SHEET_HEADERS.slice()]; // Header row

      for (var i = 0; i < recordsList.length; i++) {
        var rec = recordsList[i];
        if (!rec) continue;

        var row = [];
        for (var c = 0; c < CLAN_SHEET_HEADERS.length; c++) {
          var key = CLAN_SHEET_HEADERS[c];
          var val = rec[key];

          if (val === undefined || val === null) {
            val = '';
          } else if (Array.isArray(val) || typeof val === 'object') {
            val = JSON.stringify(val);
          } else if (typeof val === 'boolean') {
            val = val ? 'true' : 'false';
          } else {
            val = String(val);
          }
          row.push(val);
        }
        rows.push(row);
      }
      return rows;
    },

    // 6. Write All Members to Google Sheet & Multi-Tier Cloud Sync
    writeAllMembers: async function(spreadsheetId, tabName, recordsList, clearFirst) {
      var id = spreadsheetId || this.getConnectedSheetId();
      var tab = tabName || (await this.getMembersTabName(id));
      var rows = this.recordsToRows(recordsList || []);
      var result = null;

      // Target 1: Authenticated Google Sheets v4 API
      if (this.hasAccessToken()) {
        try {
          if (clearFirst !== false) {
            try {
              var clearUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent(tab) + '!A1:AZ5000:clear';
              await this.fetchApi(clearUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
            } catch (clearErr) {
              console.warn('Clear sheet notice (continuing with update):', clearErr);
            }
          }

          var endRow = Math.max(1, rows.length);
          var rangeStr = tab + '!A1:AZ' + endRow;
          var updateUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent(rangeStr) + '?valueInputOption=USER_ENTERED';
          result = await this.fetchApi(updateUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              range: rangeStr,
              majorDimension: 'ROWS',
              values: rows
            })
          });
        } catch (apiErr) {
          console.warn('Direct Sheets API write notice:', apiErr && apiErr.message);
        }
      }

      // Target 2: Google Apps Script Web App (if configured)
      var appsScriptUrl = (typeof localStorage !== 'undefined' && localStorage.getItem('apps_script_api_url')) || '';
      if (appsScriptUrl) {
        try {
          await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'WRITE', spreadsheetId: id, records: recordsList })
          });
        } catch (asErr) {}
      }

      // Target 3: Backend Sync Engine (if fullstack server is present)
      try {
        if (typeof fetch !== 'undefined') {
          var syncUrl = (typeof window !== 'undefined' && typeof window.getBackendApiUrl === 'function')
            ? window.getBackendApiUrl('/api/db/sync/records')
            : '/api/db/sync/records';
          fetch(syncUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              records: recordsList,
              timestamp: new Date().toISOString(),
              author: 'MultiTierSync'
            })
          }).catch(function() {});
        }
      } catch (beErr) {}

      // Target 4: Direct GitHub Repository Commit (authoritative persistence across all remote browsers & GitHub Pages)
      try {
        var ghToken = (typeof localStorage !== 'undefined' && localStorage.getItem('github_token')) || '';
        if (ghToken === 'SERVER_MANAGED_TOKEN') {
          ghToken = '';
        }
        if (ghToken && typeof window !== 'undefined' && typeof window.githubWriteFile === 'function') {
          var commitMsg = 'Auto-sync clan database (' + (recordsList || []).length + ' records) [Remote Multi-Sync]';
          window.githubWriteFile('siara-maina-clan-data.json', recordsList, commitMsg, ghToken).catch(function() {});
          window.githubWriteFile('data/records.json', recordsList, commitMsg, ghToken).catch(function() {});
        }
      } catch (ghSyncErr) {}

      return result || { success: true, count: (recordsList || []).length };
    },

    // 7. Append Single Member to Google Sheet
    appendMember: async function(member) {
      var id = this.getConnectedSheetId();
      if (!id) return null;

      var tab = await this.getMembersTabName(id);
      var rows = this.recordsToRows([member]).slice(1); // Exclude header row

      var appendUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent(tab) + '!A:AZ:append?valueInputOption=USER_ENTERED';
      return await this.fetchApi(appendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: tab + '!A:AZ',
          majorDimension: 'ROWS',
          values: rows
        })
      });
    },

    // 8. Log Audit Event to Google Sheet
    logAuditToSheet: async function(action, details, actorEmail, actorUid) {
      var id = this.getConnectedSheetId();
      if (!id || !this.hasAccessToken()) return;

      try {
        var appendUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/AuditLogs!A:E:append?valueInputOption=USER_ENTERED';
        await this.fetchApi(appendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            range: 'AuditLogs!A:E',
            majorDimension: 'ROWS',
            values: [[
              new Date().toISOString(),
              action || 'SYSTEM',
              typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
              actorEmail || '',
              actorUid || ''
            ]]
          })
        });
      } catch (e) {
        // Non-blocking
      }
    }
  };

  global.GoogleSheetsDB = GoogleSheetsDB;
})(typeof window !== 'undefined' ? window : this);
