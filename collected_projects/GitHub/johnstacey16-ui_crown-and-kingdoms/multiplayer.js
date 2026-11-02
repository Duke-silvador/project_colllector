/* Crown & Kingdoms multiplayer.
 * Supabase Realtime currently handles lobby/presence and player markers (5 Hz),
 * not authoritative unit, economy, combat or construction state. Host migration
 * is not implemented; treat host loss as match termination. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://isfzrqtbsbqlaojtpkxr.supabase.co';
  // Publishable client key only. Never put a service-role/secret key here.
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wj7wH708NGPxJscwv77pug_8Lf6XR7u';
  const PROTOCOL_VERSION = 1;
  const CONFIG_VERSION = 4; // Two-human roster lock requires both clients to use the new match handshakes.
  const CHANNEL_PREFIX = 'ck:v1:';
  const MAX_PACKET_BYTES = 1024; // Conservative app-level budget for UTF-8 JSON payload bytes.
  const SEND_INTERVAL_MS = 200; // 5 Hz; coalesce stale positions rather than queueing them.
  // Four is the game's maximum kingdom count; it bounds Broadcast fan-out too.
  const MAX_PLAYERS = 2; // First synchronized-play milestone: one host and one guest.
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const MARKER_COLORS = ['#ff6b6b', '#4dd0e1', '#ffd166', '#c792ea', '#7ee081', '#ff9f43', '#82aaff', '#f48fb1'];
  // Supabase's default client Presence limit is 5 track/untrack calls per 30 seconds.
  const PRESENCE_WINDOW_MS = 30000;
  const PRESENCE_CALL_LIMIT = 5;
  const presenceCallTimes = [];

  function makeSessionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        const b = new Uint8Array(16);
        window.crypto.getRandomValues(b);
        b[6] = (b[6] & 15) | 64;
        b[8] = (b[8] & 63) | 128;
        const h = Array.from(b, n => n.toString(16).padStart(2, '0')).join('');
        return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
      }
    } catch (_) {}
    return 'ck-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  }

  const sessionId = makeSessionId();
  let supabaseClient = null;
  let supabaseLoadPromise = null;
  let lobbyFields = null;
  let selectedRow = 0;
  let drawTime = 0;
  let pendingPayload = null;
  let sendInFlight = false;
  let markerTimer = null;
  let beforeRoomSettings = null;
  let pageUnloadBound = false;

  const state = {
    epoch: 0, active: false, busy: false, connected: false, tracked: false,
    role: null, roomCode: '', nick: 'Player', hostSid: null, config: null,
    lifecycle: 'idle', hostSignature: '', localFailure: '',
    statusText: 'Not connected. Create a room or join using a room code.',
    channel: null, members: new Map(), verified: new Set(), seq: 0,
    startingGame: false, gameStarted: false, roster: null,
    simFrame: 0, checkpointTracker: null, checkpointError: ''
  };

  const remotePlayers = new Map();
  const lastSeqBySid = new Map();

  function cleanNick(value) {
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f]/.test(value)) return '';
    const s = value.trim();
    if (!s) return '';
    return Array.from(s).slice(0, 24).join('');
  }

  function cleanStatusText(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
  }

  function normalizeRoomCode(value) {
    if (typeof value !== 'string') return '';
    return value.toUpperCase().replace(/[\s-]/g, '');
  }

  function validRoomCode(value) {
    return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(value);
  }

  function randomInt24() {
    try {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return (a[0] & 0xffffff) || 1;
    } catch (_) {
      return ((Math.random() * 0x1000000) | 0) || 1;
    }
  }

  function makeRoomCode() {
    let out = '';
    try {
      const bytes = new Uint8Array(6);
      window.crypto.getRandomValues(bytes);
      for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
    } catch (_) {
      for (let i = 0; i < 6; i++) out += ALPHABET[(Math.random() * ALPHABET.length) | 0];
    }
    return out;
  }

  function currentLocalConfig() {
    return {
      schema: CONFIG_VERSION, seed: randomInt24(),
      msz: Number.isInteger(msz) ? msz : 2,
      mt: Number.isInteger(mt) ? mt : 0,
      kingdoms: kingdoms === 2 ? 2 : 4,
      civ: Number.isInteger(civ) ? civ : 0,
      aiCiv: Number.isInteger(aiCiv) ? aiCiv : -1,
      diff: Number.isInteger(diff) ? diff : 1,
      aip: Number.isInteger(aip) ? aip : 0,
      vm: Number.isInteger(vm) ? vm : 0
    };
  }

  function validateConfig(raw) {
    if (!raw || typeof raw !== 'object' || raw.schema !== CONFIG_VERSION) return null;
    if (!Number.isSafeInteger(raw.seed) || raw.seed < 1 || raw.seed > 0xffffff) return null;
    if (!Number.isInteger(raw.msz) || raw.msz < 0 || raw.msz > 3) return null;
    if (!Number.isInteger(raw.mt) || raw.mt < 0 || raw.mt >= MT.length) return null;
    if (raw.kingdoms !== 2 && raw.kingdoms !== 4) return null;
    if (!Number.isInteger(raw.civ) || raw.civ < 0 || raw.civ >= CIV.length) return null;
    if (!Number.isInteger(raw.aiCiv) || raw.aiCiv < -1 || raw.aiCiv >= CIV.length) return null;
    if (!Number.isInteger(raw.diff) || raw.diff < 0 || raw.diff > 2) return null;
    if (!Number.isInteger(raw.aip) || raw.aip < 0 || raw.aip > 6) return null;
    if (!Number.isInteger(raw.vm) || raw.vm < 0 || raw.vm > 3) return null;
    return {
      schema: CONFIG_VERSION, seed: raw.seed, msz: raw.msz, mt: raw.mt,
      kingdoms: raw.kingdoms, civ: raw.civ, aiCiv: raw.aiCiv, diff: raw.diff, aip: raw.aip, vm: raw.vm
    };
  }

  function loadSupabase() {
    if (supabaseClient) return Promise.resolve(supabaseClient);
    if (supabaseLoadPromise) return supabaseLoadPromise;
    supabaseLoadPromise = new Promise((resolve, reject) => {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
          supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            realtime: { params: { eventsPerSecond: 20 } }
          });
          resolve(supabaseClient);
          return;
        } catch (e) { reject(e); return; }
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        try {
          if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            reject(new Error('Supabase client loaded without createClient.'));
            return;
          }
          supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            realtime: { params: { eventsPerSecond: 20 } }
          });
          resolve(supabaseClient);
        } catch (e) { reject(e); }
      };
      script.onerror = () => reject(new Error('Supabase CDN could not be loaded. Single-player remains available.'));
      document.head.appendChild(script);
    }).catch(err => {
      supabaseLoadPromise = null;
      throw err;
    });
    return supabaseLoadPromise;
  }

  function ensureLobbyFields() {
    if (lobbyFields) return lobbyFields;
    const css = document.createElement('style');
    css.textContent =
      '#ck-mp-fields{position:fixed;z-index:20;left:0;top:0;transform:none;width:310px;display:none;gap:10px;flex-direction:column;pointer-events:auto;font:600 18px system-ui,sans-serif}' +
      '#ck-mp-fields input{box-sizing:border-box;width:100%;height:38px;border:2px solid #c9a24a;border-radius:4px;background:#10131c;color:#fff;padding:6px 10px;font:600 18px system-ui,sans-serif;user-select:text;-webkit-user-select:text;touch-action:auto;outline-offset:3px}' +
      '#ck-mp-fields input:focus{outline:3px solid #82aaff;border-color:#fff}' +
      '#ck-mp-fields input::placeholder{color:#b9b9b9}' +
      '@media(max-height:650px){#ck-mp-fields{gap:6px}#ck-mp-fields input{height:32px;font-size:16px}}';
    document.head.appendChild(css);
    const box = document.createElement('div');
    box.id = 'ck-mp-fields';
    const nick = document.createElement('input');
    nick.id = 'ck-mp-nick';
    nick.type = 'text';
    nick.maxLength = 24;
    nick.autocomplete = 'off';
    nick.spellcheck = false;
    nick.setAttribute('aria-label', 'Multiplayer nickname');
    nick.placeholder = 'Nickname (1–24 characters)';
    const code = document.createElement('input');
    code.id = 'ck-mp-code';
    code.type = 'text';
    code.maxLength = 8;
    code.autocomplete = 'off';
    code.spellcheck = false;
    code.setAttribute('aria-label', 'Six-character multiplayer room code');
    code.placeholder = 'Room code (6 characters)';
    code.style.textTransform = 'uppercase';
    box.append(nick, code);
    document.body.appendChild(box);
    nick.value = state.nick;
    lobbyFields = { box, nick, code };
    nick.addEventListener('input', () => { state.nick = nick.value; });
    code.addEventListener('input', () => {
      code.value = code.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6);
    });
    return lobbyFields;
  }

  function showLobbyFields(show) {
    const f = ensureLobbyFields();
    const panelW = Math.min(920, CW - 28);
    const panelH = Math.min(CH - 30, Math.max(440, CH * 0.9));
    const panelX = (CW - panelW) / 2;
    const panelY = (CH - panelH) / 2;
    f.box.style.left = (panelX + 104) + 'px';
    f.box.style.top = (panelY + panelH * 0.16) + 'px';
    f.box.style.width = Math.min(310, panelW * 0.42) + 'px';
    f.nick.disabled = !!state.active;
    f.code.disabled = !!state.active;
    f.box.style.display = show ? 'flex' : 'none';
    if (show) {
      if (!f.nick.value) f.nick.value = state.nick || 'Player';
      if (state.roomCode) f.code.value = state.roomCode;
    } else if (document.activeElement === f.nick || document.activeElement === f.code) {
      try { document.activeElement.blur(); } catch (_) {}
    }
  }

  function setStatus(message) {
    state.statusText = String(message || '');
  }

  function channelStillCurrent(epoch, channel) {
    return state.active && state.epoch === epoch && state.channel === channel;
  }

  function roomTopic(code) {
    return CHANNEL_PREFIX + code;
  }

  function prunePresenceCallTimes(now = Date.now()) {
    while (presenceCallTimes.length && now - presenceCallTimes[0] >= PRESENCE_WINDOW_MS) presenceCallTimes.shift();
  }

  function hasPresenceBudget(required = 1) {
    prunePresenceCallTimes();
    return presenceCallTimes.length + required <= PRESENCE_CALL_LIMIT;
  }

  async function trackPresence(channel, payload) {
    if (!hasPresenceBudget(1)) {
      throw new Error('Presence rate budget reached (5 calls per 30 seconds). Wait for the rate window to clear, then reconnect.');
    }
    presenceCallTimes.push(Date.now());
    return channel.track(payload);
  }

  async function untrackPresence(channel) {
    if (!hasPresenceBudget(1)) return false;
    presenceCallTimes.push(Date.now());
    try { await channel.untrack(); return true; } catch (_) { return false; }
  }

  function presenceEntries(channel) {
    const result = [];
    let ps = {};
    try { ps = channel.presenceState() || {}; } catch (_) {}
    for (const key of Object.keys(ps)) {
      const records = Array.isArray(ps[key]) ? ps[key] : [];
      for (const rec of records) {
        if (!rec || typeof rec !== 'object') continue;
        const sid = typeof rec.sid === 'string' ? rec.sid : key;
        if (!sid || sid.length > 80) continue;
        result.push({ ...rec, sid });
      }
    }
    return result;
  }

  function hostMetadata(lifecycle) {
    return {
      schema: CONFIG_VERSION, sid: sessionId, nick: state.nick,
      role: 'host', hostSid: sessionId, config: state.config,
      lifecycle: lifecycle || state.lifecycle,
      mapSignature: state.hostSignature || '', roster: state.roster, ready: true
    };
  }

  function guestMetadata() {
    return {
      schema: CONFIG_VERSION, sid: sessionId, nick: state.nick,
      role: 'guest', hostSid: state.hostSid, lifecycle: 'lobby', ready: true
    };
  }

  async function trackHost(lifecycle, epoch, channel) {
    if (!channelStillCurrent(epoch, channel) || state.role !== 'host') return;
    state.lifecycle = lifecycle;
    const result = await trackPresence(channel, hostMetadata(lifecycle));
    if (!channelStillCurrent(epoch, channel)) return;
    if (result && result !== 'ok') throw new Error('Presence track returned ' + String(result));
    state.tracked = true;
    state.connected = true;
    setStatus(lifecycle === 'lobby' ? 'Room created. Waiting for another player.' :
      lifecycle === 'starting' ? 'Publishing map configuration and starting…' :
      lifecycle === 'running' ? 'Match running. Markers update at 5 Hz.' : 'Room status: ' + lifecycle);
  }

  let guestTrackPromise = null;
  async function trackGuestOnce(epoch, channel) {
    if (!channelStillCurrent(epoch, channel) || state.role !== 'guest' || !state.hostSid) return false;
    if (state.tracked) return true;
    if (guestTrackPromise) return guestTrackPromise;
    const operation = (async () => {
      try {
        const result = await trackPresence(channel, guestMetadata());
        if (!channelStillCurrent(epoch, channel)) return false;
        if (result && result !== 'ok') throw new Error('Presence track returned ' + String(result));
        state.tracked = true;
        state.connected = true;
        setStatus(state.lifecycle === 'running' && state.gameStarted
          ? 'Reconnected. Marker synchronisation restored.'
          : 'Connected. Waiting for the host to start the marker match.');
        reconcilePresence(epoch, channel);
        return true;
      } catch (e) {
        if (channelStillCurrent(epoch, channel)) {
          state.tracked = false;
          setStatus('Presence could not be established: ' + String(e && e.message || e));
        }
        return false;
      }
    })();
    guestTrackPromise = operation;
    try { return await operation; }
    finally { if (guestTrackPromise === operation) guestTrackPromise = null; }
  }

  function reconcilePresence(epoch, channel) {
    if (!channelStillCurrent(epoch, channel)) return;
    const entries = presenceEntries(channel);
    const members = new Map();
    for (const entry of entries) {
      if (typeof entry.sid !== 'string' || entry.sid.length > 80) continue;
      if (typeof entry.nick !== 'string' || entry.nick.length > 96) continue;
      if (entry.schema !== CONFIG_VERSION || !['host', 'guest'].includes(entry.role)) continue;
      members.set(entry.sid, { ...entry, nick: cleanNick(entry.nick) || 'Player' });
    }
    if (members.size > MAX_PLAYERS) {
      setStatus('Room membership limit reached. Leave and create a smaller room.');
      return;
    }
    // A locked human roster cannot be expanded by room-code discovery.
    // Unknown Presence records are ignored in gameplay, not granted a team.
    // They must not terminate an otherwise valid running match.
    state.members = members;
    if (state.roster && state.gameStarted) {
      const host = members.get(state.roster.slots[0].sid);
      if (state.role === 'guest' && host && host.roster &&
          JSON.stringify(host.roster) !== JSON.stringify(state.roster)) {
        failLocal('The host changed the locked player/team roster. Match stopped safely.');
        return;
      }
    }
    for (const sid of remotePlayers.keys()) {
      if (!members.has(sid) || sid === sessionId || state.roster && window.CK_SIM_SYNC.rosterTeam(state.roster, sid) === null) {
        remotePlayers.delete(sid);
        lastSeqBySid.delete(sid);
        state.verified.delete(sid);
      }
    }

    const hostRecords = Array.from(members.values()).filter(m =>
      m.role === 'host' && m.sid === m.hostSid);
    const hosts = hostRecords.filter(m => validateConfig(m.config));
    if (hostRecords.length > 1) {
      failRoom('More than one host is present for this room code. The match has been stopped safely.', epoch, channel);
      return;
    }
    if (state.role === 'guest' && hostRecords.length === 1 && hosts.length === 0) {
      failLocal('The host advertised an invalid room configuration. Leave and recreate the room.');
      return;
    }

    if (state.role === 'host') {
      if (!members.has(sessionId)) {
        setStatus('Reconnecting to room presence…');
        return;
      }
      if (hostRecords.some(h => h.sid !== sessionId)) {
        failRoom('Host identity conflict detected. The match has been stopped safely.', epoch, channel);
        return;
      }
      const others = Array.from(members.values()).filter(m => m.sid !== sessionId);
      if (state.lifecycle === 'lobby') {
        setStatus(others.length ? 'Room ready. Select Start Marker Match when the other player is ready.' : 'Room created. Share the code and wait for another player.');
      }
      return;
    }

    if (state.role !== 'guest') return;
    const host = hosts[0];
    if (!host) {
      /* A running match has no host migration: end the session if host presence disappears. */
      if (state.gameStarted || state.startingGame || state.lifecycle === 'running') {
        failLocal('Host connection lost. This multiplayer match has ended; host migration is not supported. Return to the title and create a new room to play again.');
        return;
      }
      setStatus('Connected to the room. Waiting for the host configuration…');
      return;
    }
    state.hostSid = host.sid;
    if (state.lifecycle !== 'running') {
      const cfg = validateConfig(host.config);
      if (!cfg) {
        setStatus('Host configuration is invalid. Leave this room and try again.');
        return;
      }
      state.config = cfg;
    }
    if (!state.tracked) void trackGuestOnce(epoch, channel);
    if (host.lifecycle === 'failed') {
      failLocal('The host reported a map/configuration integrity failure.');
      return;
    }
    if (host.lifecycle === 'running' && !state.gameStarted && !state.startingGame) {
      void startGuestGame(host, epoch, channel);
    } else if (host.lifecycle === 'lobby' && !state.gameStarted) {
      setStatus('Connected. Waiting for the host to start the marker match.');
    } else if (host.lifecycle === 'starting' && !state.gameStarted) {
      setStatus('Host is publishing and validating the starting map…');
    }
  }

  async function publishHostFailure(reason, epoch, channel) {
    try {
      state.lifecycle = 'failed';
      state.localFailure = reason;
      await trackPresence(channel, hostMetadata('failed'));
    } catch (_) {}
    try {
      await broadcast('room-failed', { v: 1, sid: sessionId, reason: String(reason).slice(0, 180) }, epoch);
    } catch (_) {}
    if (channelStillCurrent(epoch, channel)) {
      stopMarkerTimer();
      remotePlayers.clear();
      lastSeqBySid.clear();
      mode = 'multiplayer';
      setStatus(reason);
    }
  }

  function failRoom(reason, epoch, channel) {
    if (state.localFailure) return;
    // Guests may stop locally on a conflict, but must never advertise themselves as host.
    if (state.role !== 'host') {
      failLocal(reason);
      return;
    }
    void publishHostFailure(reason, epoch, channel);
  }

  function failLocal(reason) {
    state.localFailure = cleanStatusText(reason) || 'Multiplayer integrity check failed.';
    state.lifecycle = 'failed';
    stopMarkerTimer();
    remotePlayers.clear();
    lastSeqBySid.clear();
    mode = 'multiplayer';
    setStatus(state.localFailure);
  }

  function mapSignature() {
    // Divergence detector only; this is deliberately not an anti-cheat hash.
    const nodes = S.nodes.map(n => [
      String(n.k), +n.x, +n.y, +n.amt || 0, n.fm ? 1 : 0, n.an ? 1 : 0, n.fi ? 1 : 0
    ]).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0].localeCompare(b[0]));
    const units = S.us.map(u => [String(u.k), +u.t, +u.x, +u.y])
      .sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[3] - b[3] || a[0].localeCompare(b[0]));
    const buildings = S.bs.map(b => [String(b.k), +b.t, +b.x, +b.y, +b.s, !!b.done])
      .sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[3] - b[3] || a[0].localeCompare(b[0]));
    const relics = S.rel.map(q => [+q.x, +q.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const canonical = JSON.stringify({
      v: 1, w: W, h: H, wt: Array.from(S.wt), g: Array.from(S.g),
      nodes, units, buildings, relics, civ: Array.from(S.civ), teamN: S.teamN
    });
    let hash = 0x811c9dc5;
    for (let i = 0; i < canonical.length; i++) {
      hash ^= canonical.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    // Map geometry alone is insufficient: different opening economies or RNG
    // states can diverge after the first simulation tick even with identical maps.
    // This is only an initial-state gate, not live-world synchronisation.
    const opening = window.CK_SIM_SYNC.checksum({
      time: S.t, rng: S.r && typeof S.r.state === 'function' ? S.r.state() : null,
      resources: S.res, ages: S.age, technologies: S.tech, civilisations: S.civ,
      unitHealth: S.us.map(u => [u.k, u.t, u.hp]),
      buildingHealth: S.bs.map(b => [b.k, b.t, b.hp, b.done])
    });
    return 'fnv1a32-' + hash.toString(16).padStart(8, '0') + '-' + canonical.length.toString(16) + '-' + opening;
  }

  function saveLocalSettings() {
    if (!beforeRoomSettings) beforeRoomSettings = { msz, mt, kingdoms, civ, aiCiv, diff, aip, vm, seedOv, cmp };
  }

  function restoreLocalSettings() {
    if (!beforeRoomSettings) return;
    try {
      ({ msz, mt, kingdoms, civ, aiCiv, diff, aip, vm, seedOv, cmp } = beforeRoomSettings);
      if (typeof sset === 'function') sset();
    } catch (_) {}
    beforeRoomSettings = null;
  }

  function applyConfig(cfg) {
    msz = cfg.msz; mt = cfg.mt; kingdoms = cfg.kingdoms;
    civ = cfg.civ; aiCiv = cfg.aiCiv; diff = cfg.diff; aip = cfg.aip; vm = cfg.vm;
  }

  function startGameUsingConfig(cfg) {
    saveLocalSettings();
    applyConfig(cfg);
    const priorSeed = seedOv;
    const priorCampaign = cmp;
    seedOv = cfg.seed;
    cmp = null; // Multiplayer starts a skirmish, never a campaign mission.
    try {
      start();
      // Reset the diagnostic clock for this local game. It does not control the
      // real simulation clock or grant the remote client any command authority.
      state.simFrame = 0;
      state.checkpointTracker = window.CK_SIM_SYNC.createCheckpointTracker();
      state.checkpointError = '';
      const sig = mapSignature();
      seedOv = priorSeed;
      return sig;
    } catch (e) {
      seedOv = priorSeed;
      cmp = priorCampaign;
      throw e;
    }
  }

  async function startHostGame(epoch, channel) {
    if (!channelStillCurrent(epoch, channel) || state.busy || state.role !== 'host' || state.lifecycle !== 'lobby') return;
    const others = Array.from(state.members.values()).filter(m => m.sid !== sessionId && m.sid && m.ready !== false);
    if (!state.connected || !state.tracked || !state.config || others.length !== 1 || state.members.size !== 2) {
      setStatus('Start requires a connected host, a valid configuration and at least one other player.');
      return;
    }
    if (!hasPresenceBudget(1)) {
      setStatus('Cannot publish the running-room state yet: Supabase Presence rate window is full. Wait up to 30 seconds and retry.');
      return;
    }
    const cfg = validateConfig(state.config);
    if (!cfg) {
      setStatus('Cannot start: host map configuration is invalid.');
      return;
    }
    const guest = others[0];
    if (guest.role !== 'guest' || guest.hostSid !== sessionId || !window.CK_SIM_SYNC) {
      setStatus('Exactly one verified guest session is required to start.');
      return;
    }
    state.busy = true;
    state.config = cfg;
    state.roster = window.CK_SIM_SYNC.lockRoster(sessionId, guest.sid, cfg.kingdoms);
    try {
      // The validated immutable map config was already published in lobby Presence.
      // Publish the map signature and running lifecycle after deterministic generation.
      state.lifecycle = 'starting';
      state.hostSignature = startGameUsingConfig(cfg);
      state.gameStarted = true;
      state.lifecycle = 'running';
      await trackHost('running', epoch, channel);
      if (!channelStillCurrent(epoch, channel)) return;
      state.gameStarted = true;
      state.startingGame = false;
      setStatus('Marker match running. Waiting for map-signature confirmation.');
      startMarkerTimer(epoch);
      sendMarkerNow(epoch);
    } catch (e) {
      if (channelStillCurrent(epoch, channel)) {
        state.busy = false;
        failRoom('Could not start marker match: ' + String(e && e.message || e), epoch, channel);
      }
      return;
    } finally {
      if (channelStillCurrent(epoch, channel)) state.busy = false;
    }
  }

  async function startGuestGame(host, epoch, channel) {
    if (!channelStillCurrent(epoch, channel) || state.role !== 'guest' || state.startingGame || state.gameStarted) return;
    const cfg = validateConfig(host.config);
    if (!cfg || typeof host.mapSignature !== 'string' || !host.mapSignature) {
      setStatus('Host map configuration/signature is not ready. Waiting…');
      return;
    }
    if (!window.CK_SIM_SYNC || !window.CK_SIM_SYNC.validRoster(host.roster, host.sid, sessionId, cfg.kingdoms)) {
      failLocal('This room does not include your session in its locked two-player roster.');
      return;
    }
    state.startingGame = true;
    state.config = cfg;
    state.roster = host.roster;
    setStatus('Generating and checking the host map…');
    try {
      if (!state.tracked) {
        const tracked = await trackGuestOnce(epoch, channel);
        if (!tracked || !state.tracked) throw new Error('Presence membership has not been established.');
      }
      if (!channelStillCurrent(epoch, channel)) return;
      const sig = startGameUsingConfig(cfg);
      state.gameStarted = true; // A local game now exists even if signatures disagree.
      if (sig !== host.mapSignature) {
        state.startingGame = false;
        await broadcast('map-fail', { v: 1, sid: sessionId, signature: sig, expected: host.mapSignature }, epoch);
        failLocal('Initial map signature mismatch. The marker match was aborted; use the same settings and recreate the room.');
        return;
      }
      state.hostSignature = host.mapSignature;
      state.lifecycle = 'running';
      state.gameStarted = true;
      state.startingGame = false;
      setStatus('Map signature matches host. Marker match running.');
      startMarkerTimer(epoch);
      sendMarkerNow(epoch);
      await broadcast('map-ok', { v: 1, sid: sessionId, signature: sig }, epoch);
    } catch (e) {
      if (channelStillCurrent(epoch, channel)) {
        state.startingGame = false;
        failLocal('Could not generate/verify the shared map: ' + String(e && e.message || e));
      }
    }
  }

  function jsonByteLength(value) {
    const s = JSON.stringify(value);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
    return unescape(encodeURIComponent(s)).length;
  }

  function sendMarkerNow(epoch) {
    if (!state.active || state.lifecycle !== 'running' || epoch !== state.epoch) return;
    let p;
    try {
      const world = s2w(cur.x, cur.y);
      p = {
        v: PROTOCOL_VERSION, sid: sessionId, nick: state.nick,
        x: Math.max(0, Math.min(W - 1, world[0])),
        y: Math.max(0, Math.min(H - 1, world[1])),
        seq: ++state.seq
      };
    } catch (_) { return; }
    if (jsonByteLength(p) > MAX_PACKET_BYTES) return;
    pendingPayload = p;
    if (sendInFlight) return;
    const payload = pendingPayload;
    pendingPayload = null;
    sendInFlight = true;
    void broadcast('marker', payload, epoch)
      .finally(() => { if (epoch === state.epoch) sendInFlight = false; });
  }

  async function broadcast(event, payload, epoch) {
    const ch = state.channel;
    if (!ch || !channelStillCurrent(epoch, ch)) return false;
    try {
      if (jsonByteLength(payload) > MAX_PACKET_BYTES) {
        if (channelStillCurrent(epoch, ch)) setStatus('Network packet rejected: application payload exceeded 1 KB.');
        return false;
      }
      const result = await ch.send({ type: 'broadcast', event, payload });
      if (result && result !== 'ok') {
        if (channelStillCurrent(epoch, ch)) setStatus('Supabase Broadcast reported ' + String(result) + '; local gameplay continues.');
        return false;
      }
      return true;
    } catch (e) {
      if (channelStillCurrent(epoch, ch)) setStatus('Network send interrupted: ' + String(e && e.message || e) + '. Local gameplay continues.');
      return false;
    }
  }

  // These are observational world hashes, NOT synchronized gameplay. The
  // browser still runs its own game and local controls; no remote commands are
  // accepted. Hashes are compared only for identical numbered simulation steps.
  function checkpointResult(outcome) {
    if (outcome.status === 'desync' || outcome.status === 'conflicting') {
      state.checkpointError = 'World checkpoint ' + outcome.status + ' at frame ' + outcome.frame;
      setStatus(state.checkpointError + '. Gameplay is still local (markers only).');
    }
  }

  function onSimulationStep() {
    if (!state.active || !state.gameStarted || state.lifecycle !== 'running' ||
        !state.checkpointTracker || !window.CK_SIM_SYNC) return;
    const frame = ++state.simFrame;
    if (frame % 300 !== 0) return; // One checkpoint per 10 simulated seconds.
    let cp;
    try {
      cp = window.CK_SIM_SYNC.worldCheckpoint(S, frame);
    } catch (_) {
      state.checkpointError = 'Could not generate a local world checkpoint';
      return;
    }
    checkpointResult(state.checkpointTracker.recordLocal(cp));
    if (state.role === 'host' && state.connected && state.verified.size === 1) {
      // Never broadcast the actual world, units, economy or private player data.
      // A matching hash does not authenticate a peer or guarantee lockstep.
      void broadcast('world-checkpoint', {
        v: window.CK_SIM_SYNC.VERSION, sid: sessionId,
        frame: cp.frame, hash: cp.hash
      }, state.epoch);
    }
  }

  function acceptWorldCheckpoint(payload, epoch, channel) {
    if (!channelStillCurrent(epoch, channel) || state.role !== 'guest' ||
        state.lifecycle !== 'running' || !state.gameStarted ||
        !state.roster || !state.checkpointTracker || !window.CK_SIM_SYNC) return;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).length !== 4 || payload.v !== window.CK_SIM_SYNC.VERSION ||
        payload.sid !== state.hostSid || payload.sid !== state.roster.slots[0].sid) return;
    const host = state.members.get(payload.sid);
    // Presence and claimed sender IDs are NOT secure identity authentication.
    // This is only a best-effort diagnostic while the transport remains markers-only.
    if (!host || host.role !== 'host' || host.sid !== host.hostSid ||
        host.lifecycle !== 'running' || host.mapSignature !== state.hostSignature) return;
    checkpointResult(state.checkpointTracker.recordRemote({
      frame: payload.frame, hash: payload.hash
    }));
  }

  function startMarkerTimer(epoch) {
    stopMarkerTimer();
    sendMarkerNow(epoch);
    markerTimer = window.setInterval(() => {
      if (!state.active || state.epoch !== epoch || state.lifecycle !== 'running') {
        stopMarkerTimer();
        return;
      }
      // One latest-position sample per tick. Never build a queue of stale coordinates.
      sendMarkerNow(epoch);
    }, SEND_INTERVAL_MS);
  }

  function stopMarkerTimer() {
    if (markerTimer !== null) window.clearInterval(markerTimer);
    markerTimer = null;
    pendingPayload = null;
    sendInFlight = false;
  }

  function markerColor(sid) {
    let h = 0;
    for (let i = 0; i < sid.length; i++) h = (Math.imul(h, 31) + sid.charCodeAt(i)) >>> 0;
    return MARKER_COLORS[h % MARKER_COLORS.length];
  }

  function acceptMarker(payload, epoch, channel) {
    if (!channelStillCurrent(epoch, channel) || state.lifecycle !== 'running') return;
    if (!payload || typeof payload !== 'object' || payload.v !== PROTOCOL_VERSION) return;
    if (typeof payload.sid !== 'string' || payload.sid.length < 3 || payload.sid.length > 80 || payload.sid === sessionId) return;
    if (!state.members.has(payload.sid) || !state.roster || window.CK_SIM_SYNC.rosterTeam(state.roster, payload.sid) === null) return;
    const nick = cleanNick(payload.nick);
    if (!nick || payload.nick !== nick) return;
    if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return;
    if (payload.x < 0 || payload.y < 0 || payload.x > W - 1 || payload.y > H - 1) return;
    if (!Number.isSafeInteger(payload.seq) || payload.seq < 1) return;
    const previousSeq = lastSeqBySid.get(payload.sid) || 0;
    if (payload.seq <= previousSeq) return;
    const member = state.members.get(payload.sid);
    if (!member || (member.role !== 'host' && member.role !== 'guest')) return;
    if (payload.nick !== member.nick) return;
    lastSeqBySid.set(payload.sid, payload.seq);
    const now = performance.now();
    let marker = remotePlayers.get(payload.sid);
    if (!marker) {
      if (remotePlayers.size >= MAX_PLAYERS - 1) return;
      marker = {
        sid: payload.sid, nick, x: payload.x, y: payload.y,
        tx: payload.x, ty: payload.y, seq: payload.seq,
        color: markerColor(payload.sid), updatedAt: now
      };
      remotePlayers.set(payload.sid, marker);
    } else {
      marker.nick = nick;
      marker.tx = payload.x;
      marker.ty = payload.y;
      marker.seq = payload.seq;
      marker.updatedAt = now;
    }
  }

  function bindChannelEvents(channel, epoch) {
    channel.on('presence', { event: 'sync' }, () => reconcilePresence(epoch, channel));
    channel.on('presence', { event: 'join' }, () => reconcilePresence(epoch, channel));
    channel.on('presence', { event: 'leave' }, () => reconcilePresence(epoch, channel));
    channel.on('broadcast', { event: 'marker' }, ({ payload }) => acceptMarker(payload, epoch, channel));
    channel.on('broadcast', { event: 'world-checkpoint' }, ({ payload }) => acceptWorldCheckpoint(payload, epoch, channel));
    channel.on('broadcast', { event: 'map-ok' }, ({ payload }) => {
      if (!channelStillCurrent(epoch, channel) || state.role !== 'host' || state.lifecycle !== 'running') return;
      if (!payload || payload.v !== PROTOCOL_VERSION || typeof payload.sid !== 'string' || !state.members.has(payload.sid) || payload.sid === sessionId || !state.roster || window.CK_SIM_SYNC.rosterTeam(state.roster, payload.sid) !== 1) return;
      if (payload.signature !== state.hostSignature) {
        failRoom('A joining client reported a different map signature. Match stopped safely.', epoch, channel);
      } else {
        state.verified.add(payload.sid);
        setStatus('Map signature verified for ' + (state.members.get(payload.sid).nick || 'a player') + '.');
      }
    });
    channel.on('broadcast', { event: 'map-fail' }, ({ payload }) => {
      if (!channelStillCurrent(epoch, channel) || state.role !== 'host' || state.lifecycle !== 'running') return;
      if (!payload || payload.v !== PROTOCOL_VERSION || typeof payload.sid !== 'string' || !state.members.has(payload.sid) || payload.sid === sessionId || !state.roster || window.CK_SIM_SYNC.rosterTeam(state.roster, payload.sid) !== 1) return;
      failRoom('Initial map signature mismatch reported by another player. Match stopped safely.', epoch, channel);
    });
    channel.on('broadcast', { event: 'room-failed' }, ({ payload }) => {
      if (!channelStillCurrent(epoch, channel) || !payload || payload.v !== 1 || payload.sid === sessionId) return;
      const sender = typeof payload.sid === 'string' ? state.members.get(payload.sid) : null;
      if (!sender || sender.role !== 'host' || sender.sid !== sender.hostSid ||
          (state.hostSid && payload.sid !== state.hostSid)) return;
      failLocal(cleanStatusText(payload.reason) || 'The host stopped the room after an integrity failure.');
    });
  }

  async function enterRoom(role, code, nick, cfg) {
    if (state.busy || state.active) return;
    if (!hasPresenceBudget(1)) {
      setStatus('Supabase Presence update limit reached. Wait for the 30-second rate window to clear before opening another room.');
      return;
    }
    const clean = cleanNick(nick);
    if (!clean) {
      setStatus('Enter a nickname with 1–24 characters and no control characters.');
      return;
    }
    if (!validRoomCode(code)) {
      setStatus('Room codes must contain six letters/numbers (excluding O, 0, I and 1).');
      return;
    }
    const f = ensureLobbyFields();
    state.nick = clean;
    f.nick.value = clean;
    state.busy = true;
    const epoch = ++state.epoch;
    state.active = true;
    f.nick.disabled = true;
    f.code.disabled = true;
    state.connected = false;
    state.tracked = false;
    guestTrackPromise = null;
    state.role = role;
    state.roomCode = code;
    state.hostSid = role === 'host' ? sessionId : null;
    state.config = role === 'host' ? validateConfig(cfg) : null;
    state.lifecycle = 'lobby';
    state.hostSignature = '';
    state.localFailure = '';
    state.gameStarted = false;
    state.startingGame = false;
    state.roster = null;
    state.simFrame = 0;
    state.checkpointTracker = null;
    state.checkpointError = '';
    state.members = new Map();
    state.verified.clear();
    remotePlayers.clear();
    lastSeqBySid.clear();
    // Keep the per-session sequence monotonic across repeated room entries.
    stopMarkerTimer();
    setStatus('Loading Supabase and connecting to room ' + code + '…');
    try {
      const client = await loadSupabase();
      if (!state.active || state.epoch !== epoch) return;
      if (role === 'host' && !state.config) throw new Error('Host configuration failed validation.');
      const ch = client.channel(roomTopic(code), {
        config: { broadcast: { self: false, ack: false }, presence: { key: sessionId } }
      });
      state.channel = ch;
      bindChannelEvents(ch, epoch);
      ch.subscribe(status => {
        if (!channelStillCurrent(epoch, ch)) return;
        if (status === 'SUBSCRIBED') {
          state.connected = true;
          if (role === 'host') {
            if (!state.tracked) {
              const lifecycle = ['lobby', 'starting', 'running', 'failed'].includes(state.lifecycle) ? state.lifecycle : 'lobby';
              void trackHost(lifecycle, epoch, ch).then(() => {
                reconcilePresence(epoch, ch);
                if (state.lifecycle === 'running' && state.gameStarted) startMarkerTimer(epoch);
              }).catch(e => {
                if (channelStillCurrent(epoch, ch)) setStatus('Presence tracking failed: ' + String(e && e.message || e));
              });
            } else {
              reconcilePresence(epoch, ch);
              if (state.lifecycle === 'running' && state.gameStarted) startMarkerTimer(epoch);
            }
          } else {
            reconcilePresence(epoch, ch);
            if (state.lifecycle === 'running' && state.gameStarted) {
              void trackGuestOnce(epoch, ch).then(ok => {
                if (ok && channelStillCurrent(epoch, ch) && state.lifecycle === 'running' && state.gameStarted) startMarkerTimer(epoch);
              });
            }
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          state.connected = false;
          state.tracked = false; // Presence must be restored after the channel rejoins.
          stopMarkerTimer();
          setStatus('Room connection interrupted (' + status + '). Local gameplay will not be frozen.');
        }
      });
      state.busy = false;
      setStatus(role === 'host' ? 'Connecting as the room host…' : 'Joining room; waiting for the current host configuration…');
      if (!pageUnloadBound) {
        pageUnloadBound = true;
        window.addEventListener('pagehide', () => { void leaveRoom(false, false); });
      }
    } catch (e) {
      if (state.epoch === epoch) {
        state.active = false;
        state.connected = false;
        state.busy = false;
        state.tracked = false;
        state.role = null;
        state.channel = null;
        state.lifecycle = 'idle';
        state.roomCode = '';
        state.config = null;
        setStatus('Multiplayer unavailable: ' + String(e && e.message || e) + ' Single-player is still available.');
      }
    } finally {
      if (state.epoch === epoch) state.busy = false;
    }
  }

  async function leaveRoom(goTitle, restoreSettings, forceRestoreSettings) {
    const ch = state.channel;
    const client = supabaseClient;
    const hadStartedGame = state.gameStarted;
    ++state.epoch;
    stopMarkerTimer();
    state.active = false;
    state.connected = false;
    state.busy = true; // Block room re-entry until asynchronous channel cleanup finishes.
    state.tracked = false;
    state.role = null;
    state.hostSid = null;
    state.roomCode = '';
    state.lifecycle = 'idle';
    state.hostSignature = '';
    state.localFailure = '';
    state.gameStarted = false;
    state.startingGame = false;
    state.roster = null;
    state.simFrame = 0;
    state.checkpointTracker = null;
    state.checkpointError = '';
    state.members.clear();
    state.verified.clear();
    remotePlayers.clear();
    lastSeqBySid.clear();
    state.channel = null;
    pendingPayload = null;
    if (ch) {
      // If the Presence budget is exhausted, removeChannel still causes server-side cleanup.
      await untrackPresence(ch);
      try { if (client) await client.removeChannel(ch); } catch (_) {}
    }
    if (restoreSettings !== false) {
      if (hadStartedGame && !forceRestoreSettings) beforeRoomSettings = null;
      else restoreLocalSettings();
    }
    showLobbyFields(false);
    if (goTitle !== false) mode = 'title';
    state.config = currentLocalConfig();
    state.busy = false;
    setStatus('Not connected. Create a room or join using a room code.');
  }

  function failOpenRoom() {
    window.CK_NET.leaveToSinglePlayer();
  }

  function updateLocalSetting(row, delta) {
    if (state.active) {
      setStatus('Room settings are fixed when the room is created. Leave and create a new room to use a different map.');
      return;
    }
    const cfg = state.config || currentLocalConfig();
    if (row === 4) cfg.msz = (cfg.msz + delta + 4) % 4;
    if (row === 5) cfg.mt = (cfg.mt + delta + MT.length) % MT.length;
    if (row === 6) cfg.kingdoms = cfg.kingdoms === 4 ? 2 : 4;
    state.config = cfg;
    if (!state.active) {
      applyConfig(cfg);
      if (typeof sset === 'function') sset();
    }
    setStatus('Map settings selected. The host publishes final configuration before starting.');
  }

  function actionForRow() {
    const f = ensureLobbyFields();
    if (selectedRow === 0) {
      f.nick.focus();
      setStatus('Nickname focused. Use the browser text-entry keyboard, then return to the controller menu.');
      return;
    }
    if (selectedRow === 1) {
      f.code.focus();
      setStatus('Room-code field focused. Enter six characters, then choose Join Room.');
      return;
    }
    if (selectedRow === 2) {
      if (state.active) return setStatus('Leave the current room before creating another.');
      const nick = cleanNick(f.nick.value);
      const cfg = currentLocalConfig();
      cfg.seed = randomInt24();
      return void enterRoom('host', makeRoomCode(), nick, cfg);
    }
    if (selectedRow === 3) {
      if (state.active) return setStatus('Leave the current room before joining another.');
      const code = normalizeRoomCode(f.code.value);
      if (!validRoomCode(code)) return setStatus('Enter a valid six-character room code first.');
      return void enterRoom('guest', code, cleanNick(f.nick.value), null);
    }
    if (selectedRow >= 4 && selectedRow <= 6) return setStatus('Use Left/Right to change the selected map setting.');
    if (selectedRow === 7) {
      if (!state.active || state.role !== 'host' || !state.channel) return setStatus('Only the room host can start the marker match.');
      if (state.lifecycle !== 'lobby') return setStatus('This room has started or is unavailable. Recreate it to use a different map.');
      return void startHostGame(state.epoch, state.channel);
    }
    if (selectedRow === 8) {
      if (state.active) return setStatus('Leave the marker room before opening authenticated setup.');
      showLobbyFields(false);
      window.CK_AUTH_LOBBY.open(() => { mode = 'multiplayer'; showLobbyFields(true); }, {
        createTransport: () => window.CK_WEBRTC_TRANSPORT.createGuestClient(), peerPreview:true
      });
      return;
    }
    if (selectedRow === 9) return failOpenRoom();
  }

  const rowCount = 10;

  function control(dt) {
    if (window.CK_AUTH_LOBBY && window.CK_AUTH_LOBBY.active()) { window.CK_AUTH_LOBBY.control(dt); return; }
    ensureLobbyFields();
    showLobbyFields(true);
    if (E[12]) selectedRow = (selectedRow + rowCount - 1) % rowCount;
    if (E[13]) selectedRow = (selectedRow + 1) % rowCount;
    if (E[14]) {
      if (selectedRow >= 4 && selectedRow <= 6) updateLocalSetting(selectedRow, -1);
      else if (selectedRow === 9) failOpenRoom();
    }
    if (E[15]) {
      if (selectedRow >= 4 && selectedRow <= 6) updateLocalSetting(selectedRow, 1);
      else if (selectedRow === 9) failOpenRoom();
    }
    if (E[0]) actionForRow();
    if (E[1] || E[9]) failOpenRoom();
  }

  function lobbyRows() {
    const cfg = state.config || (state.role === 'guest' ? null : currentLocalConfig());
    const hostMode = state.role === 'host';
    const running = state.lifecycle === 'running';
    return [
      { label: 'Nickname field', value: state.nick || 'Not set' },
      { label: 'Room-code field', value: state.roomCode || 'Enter code to join' },
      { label: 'Create Room', value: state.active ? 'Leave current room first' : 'Create a new room' },
      { label: 'Join Room', value: state.active ? 'Leave current room first' : 'Join an existing room' },
      { label: 'Map size', value: cfg ? ['Small (72)', 'Medium (96)', 'Large (128)', 'Huge (176)'][cfg.msz] : 'Waiting for host' },
      { label: 'Map type', value: cfg ? (MT[cfg.mt] ? MT[cfg.mt].n : 'Invalid') : 'Waiting for host' },
      { label: 'Kingdom count', value: cfg ? (cfg.kingdoms === 2 ? 'Two kingdoms' : 'Four kingdoms') : 'Waiting for host' },
      { label: 'Start Marker Match', value: !hostMode ? 'Host only' : running ? 'Already running' : 'Requires another player' },
      { label: 'Two-player battlefield preview', value: 'Private room · direct connection' },
      { label: 'Leave Multiplayer', value: state.active ? 'Disconnect and return to title' : 'Return to title' }
    ];
  }

  function displayMemberName(member) {
    const sameName = Array.from(state.members.values()).filter(p => p.nick === member.nick);
    return sameName.length > 1 ? member.nick + ' · ' + member.sid.slice(-4) : member.nick;
  }

  function drawLobby() {
    if (window.CK_AUTH_LOBBY && window.CK_AUTH_LOBBY.active()) return;
    showLobbyFields(true);
    X.save();
    X.setTransform(DPR, 0, 0, DPR, 0, 0);
    X.fillStyle = '#090d16';
    X.fillRect(0, 0, CW, CH);
    const w = Math.min(920, CW - 28);
    const h = Math.min(CH - 30, Math.max(440, CH * 0.9));
    const x = (CW - w) / 2;
    const y = (CH - h) / 2;
    panel(x, y, w, h);
    tx('CROWN & KINGDOMS — MULTIPLAYER', CW / 2, y + 38, Math.min(30, w / 25), '#f2c14e', 'center');
    tx('PHASE 1: SHARED STARTING MAP + MOVING COMMAND MARKERS ONLY', CW / 2, y + 65, 15, '#cbd5e1', 'center');
    tx('Prototype only: room codes are not authentication; browser hosts are not trusted servers.', CW / 2, y + 84, 12, '#fca5a5', 'center');
    tx('Nickname', x + 26, y + h * 0.205, 17, '#fde68a');
    tx('Room code', x + 26, y + h * 0.275, 17, '#fde68a');
    tx('Room: ' + (state.roomCode || 'not connected'), x + 26, y + h * 0.36, 19, '#fff');
    tx('Role: ' + (state.role || 'not assigned') + '   Session: ' + sessionId.slice(-6), x + 26, y + h * 0.395, 15, '#cbd5e1');
    tx('Connection: ' + (state.connected ? 'CONNECTED' : 'NOT CONNECTED'), x + 26, y + h * 0.43, 16, state.connected ? '#9ae6b4' : '#fca5a5');
    const rows = lobbyRows();
    const rowY = y + h * 0.47;
    const rowH = Math.min(32, Math.max(18, (h * 0.43) / rowCount));
    rows.forEach((r, i) => {
      const yy = rowY + i * rowH;
      if (i === selectedRow) {
        X.fillStyle = '#234b8c';
        X.fillRect(x + 14, yy - rowH * 0.8, Math.min(510, w * 0.61), rowH - 2);
      }
      const canChange = i >= 4 && i <= 6 && !state.active;
      tx((i === selectedRow ? '› ' : '  ') + r.label, x + 28, yy, Math.min(17, rowH * 0.72), canChange ? '#fff' : '#e2e8f0');
      tx(r.value, x + Math.min(505, w * 0.6), yy, Math.min(14, rowH * 0.65), '#fde68a');
    });

    const rightX = x + Math.min(550, w * 0.65);
    tx('ROOM MEMBERS', rightX, y + h * 0.19, 17, '#f2c14e');
    const memberList = Array.from(state.members.values()).slice(0, 8);
    if (!memberList.length) tx('Waiting for presence…', rightX, y + h * 0.23, 15, '#cbd5e1');
    memberList.forEach((m, i) => {
      tx((m.role === 'host' ? '★ ' : '• ') + displayMemberName(m), rightX, y + h * 0.23 + i * 25, 15, m.sid === sessionId ? '#9ae6b4' : '#fff');
    });
    const cfg = state.config || (state.role === 'guest' ? null : currentLocalConfig());
    const cy = y + h * 0.23 + Math.max(1, memberList.length) * 25 + 28;
    tx('MAP CONFIGURATION', rightX, cy, 16, '#f2c14e');
    tx('Seed: ' + (cfg && cfg.seed ? cfg.seed.toString(16).padStart(6, '0').toUpperCase() : state.role === 'guest' ? 'waiting for host' : 'set on create'), rightX, cy + 26, 14, '#fff');
    tx('Schema: ' + CONFIG_VERSION + ' · Protocol: ' + PROTOCOL_VERSION, rightX, cy + 50, 14, '#cbd5e1');
    if (state.hostSignature) tx('Map signature: ' + state.hostSignature, rightX, cy + 76, 13, '#9ae6b4');
    if (state.localFailure) {
      tx('INTEGRITY FAILURE', rightX, cy + 112, 17, '#ff8b82');
      tx(state.localFailure.slice(0, 70), rightX, cy + 136, 13, '#ffb4ab');
    }
    tx(state.statusText.slice(0, 145), CW / 2, y + h - 38, 15, state.localFailure ? '#ff8b82' : '#9ae6b4', 'center');
    tx('D-pad Up/Down: select · Left/Right: settings · A: choose/focus · B or Menu: leave', CW / 2, y + h - 15, 13, '#cbd5e1', 'center');
    X.restore();
  }

  function getRenderEntries() {
    const now = performance.now();
    const dt = drawTime ? Math.min(0.1, Math.max(0, (now - drawTime) / 1000)) : 0;
    drawTime = now;
    const alpha = Math.min(1, dt * 14);
    const result = [];
    for (const marker of remotePlayers.values()) {
      marker.x += (marker.tx - marker.x) * alpha;
      marker.y += (marker.ty - marker.y) * alpha;
      result.push(marker);
    }
    return result;
  }

  function drawMarker(marker) {
    if (!marker || !Number.isFinite(marker.x) || !Number.isFinite(marker.y)) return;
    const p = w2s(marker.x, marker.y);
    if (p[0] < -120 || p[0] > CW + 120 || p[1] < -100 || p[1] > CH + 100) return;
    const col = marker.color || '#4dd0e1';
    X.save();
    X.globalAlpha = 0.95;
    X.fillStyle = 'rgba(0,0,0,.42)';
    X.beginPath(); X.ellipse(p[0], p[1] + 2, 13 * zm, 6 * zm, 0, 0, Math.PI * 2); X.fill();
    X.strokeStyle = col; X.lineWidth = 3;
    X.beginPath(); X.ellipse(p[0], p[1], 13 * zm, 7 * zm, 0, 0, Math.PI * 2); X.stroke();
    X.fillStyle = col;
    X.beginPath();
    X.moveTo(p[0], p[1] - 5 * zm);
    X.lineTo(p[0] + 6 * zm, p[1] - 22 * zm);
    X.lineTo(p[0], p[1] - 19 * zm);
    X.lineTo(p[0] - 5 * zm, p[1] - 22 * zm);
    X.closePath(); X.fill();
    const sameName = Array.from(state.members.values()).filter(m => m.nick === marker.nick);
    const label = sameName.length > 1 ? marker.nick + ' · ' + marker.sid.slice(-4) : marker.nick;
    X.font = 'bold 16px system-ui,sans-serif';
    X.textAlign = 'center';
    X.textBaseline = 'bottom';
    X.lineJoin = 'round';
    X.lineWidth = 4;
    X.strokeStyle = '#10131c';
    X.strokeText(label, p[0], p[1] - 25 * zm);
    X.fillStyle = col;
    X.fillText(label, p[0], p[1] - 25 * zm);
    X.restore();
  }

  function isRunning() {
    return !!(state.active && state.connected && state.lifecycle === 'running' && !state.localFailure);
  }

  function drawMatchStatus() {
    if (!state.active || !state.roomCode || !state.gameStarted) return;
    const healthy = state.connected && state.lifecycle === 'running' && !state.localFailure;
    const label = 'ROOM ' + state.roomCode + ' · ' + String(state.role || 'PLAYER').toUpperCase() +
      ' · ' + (state.localFailure ? 'INTEGRITY ERROR' : healthy ? 'CONNECTED' : 'CONNECTION LOST') +
      ' · MARKERS ONLY';
    const width = Math.min(Math.max(260, CW - 20), 430);
    const x = (CW - width) / 2, y = 58;
    X.save();
    X.fillStyle = 'rgba(9,13,22,.86)';
    X.fillRect(x, y, width, 25);
    X.strokeStyle = healthy ? 'rgba(126,224,129,.75)' : 'rgba(255,139,130,.9)';
    X.lineWidth = 1;
    X.strokeRect(x, y, width, 25);
    tx(label, CW / 2, y + 17, 12, healthy ? '#9ae6b4' : '#ffb4ab', 'center');
    X.restore();
  }

  function snapshot() {
    return {
      protocol: PROTOCOL_VERSION, sessionId, roomCode: state.roomCode, role: state.role,
      lifecycle: state.lifecycle, connected: state.connected,
      memberCount: state.members.size, remoteMarkerCount: remotePlayers.size,
      mapSignature: state.hostSignature, status: state.statusText,
      commandProtocol: window.CK_SIM_SYNC ? window.CK_SIM_SYNC.VERSION : null,
      rosterLocked: !!state.roster,
      assignedTeam: state.roster ? window.CK_SIM_SYNC.rosterTeam(state.roster, sessionId) : null,
      diagnosticFrame: state.simFrame,
      checkpointDiagnostics: state.checkpointTracker ? state.checkpointTracker.stats() : null,
      checkpointError: state.checkpointError,
      // Assignment does not yet alter the local game's team-zero input model.
      synchronizedWorld: false // Explicit: marker sessions are not shared RTS matches yet.
    };
  }

  function exposeErrorSafely(message) {
    setStatus('Multiplayer error: ' + String(message || 'Unknown error') + '. Single-player remains available.');
  }

  window.CK_NET = {
    control, drawLobby, getRenderEntries, drawMarker, drawMatchStatus, isRunning, snapshot, onSimulationStep,
    openLobby() {
      state.nick = cleanNick(ensureLobbyFields().nick.value) || state.nick || 'Player';
      if (!state.active && !beforeRoomSettings) saveLocalSettings();
      state.config = state.config || currentLocalConfig();
      showLobbyFields(true);
      mode = 'multiplayer';
      selectedRow = 0;
      setStatus('Not connected. Create a room or join using a room code.');
    },
    leaveToSinglePlayer() {
      const hadStartedGame = state.gameStarted;
      const resume = hadStartedGame && mode !== 'end' && mode !== 'error';
      mode = resume ? 'play' : 'title';
      void leaveRoom(false, true, hadStartedGame && !resume);
    },
    leaveToTitle() {
      mode = 'title';
      void leaveRoom(false, true, true);
    },
    reconcilePresence,
    _acceptMarkerForTest: acceptMarker,
    _validateConfigForTest: validateConfig,
    _mapSignatureForTest: mapSignature,
    _failSafely: exposeErrorSafely
  };

  window.addEventListener('beforeunload', () => {
    // pagehide performs best-effort channel cleanup; avoid a duplicate untrack.
    stopMarkerTimer();
  });
})();

