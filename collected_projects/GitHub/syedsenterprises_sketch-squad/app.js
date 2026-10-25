// Sketch Squad — real-time Draw & Guess party game.
// Plain vanilla JS + Firebase Realtime Database (modular SDK via importmap).
// No build step. No login: Firebase Anonymous auth runs silently.
//
// RTDB layout (all under /rooms/<CODE>):
//   meta:        { hostId, state: lobby|drawing|reveal|finished, order: [uids], createdAt, notice }
//   players/<uid>:{ name, joinedAt, score, gotIt, online }
//   turn:        { number, drawerId, choices: [{w,c}...], word, pickDeadline, startedAt, endAt }
//   turnEarned/<uid>: points earned this turn (guessers + drawer bonus)
//   strokes/<turnNumber>/<id>: { color, size, erase, points: [[x,y]...] } (coords 0..1000)
//   liveStroke:  { color, size, erase, points } (throttled live preview while drawing)
//   chat/<id>:   { kind: guess|correct|system, text, ts }
//   guessQueue/<id>: { playerId, name, text, ts } (host validates + awards, then removes)
//
// SECURITY NOTE (honest): the secret word lives in turn.word so the drawer and
// the host can use it. Guessers' clients NEVER render it and never use it for
// validation (guesses are validated by the host via guessQueue). A determined
// player could still read it from devtools — for a hardened deployment, add
// RTDB security rules (or a Cloud Function validator) restricting turn/word.
// For a friends-and-family party game this client-side discipline is the norm.

import { initializeApp } from "firebase-app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase-auth";
import {
  getDatabase, ref, set, update, push, get, remove, onValue, onChildAdded,
  onDisconnect, runTransaction
} from "firebase-database";

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O (and no digits: no 0/1 confusion)
const TURN_SECONDS = 60, PICK_SECONDS = 15, REVEAL_SECONDS = 5;
const COLORS = ["#000000", "#e63946", "#ff6b35", "#ffb703", "#2a9d8f", "#1d3557", "#8338ec", "#ff5d8f", "#6a4c93", "#ffffff"];
let brushColor = "#000000", brushSize = 9, erasing = false;

function randomCode() {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
// Deterministic 3 distinct word choices: every client agrees without a write.
function pickChoices(code, turnNumber) {
  const words = window.SKETCH_WORDS;
  const base = hashStr(code + ":" + turnNumber);
  const out = [], used = new Set();
  let k = 0;
  while (out.length < 3 && k < words.length * 2) {
    const idx = (base + k * 37 + Math.floor(k / 3) * 101) % words.length;
    if (!used.has(idx)) { used.add(idx); out.push(words[idx]); }
    k++;
  }
  return out;
}
function showView(id) {
  ["view-home", "view-lobby", "view-game", "view-podium"].forEach((v) => $(v).classList.toggle("hidden", v !== id));
}
function showError(elId, msg) {
  const el = $(elId);
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}
function showNotice(msg) {
  const el = $("notice");
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
  if (msg) setTimeout(() => { if (el.textContent === msg) el.classList.add("hidden"); }, 6000);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- firebase init (placeholder-safe) ----------
const CFG = window.SKETCH_SQUAD_CONFIG || {};
const CONFIGURED = Boolean(CFG.apiKey && CFG.databaseURL);
let app = null, auth = null, db = null;
if (CONFIGURED) {
  try {
    app = initializeApp(CFG);
    auth = getAuth(app);
    db = getDatabase(app);
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
}

// ---------- local state ----------
let uid = null, myName = "", roomCode = null;
let meta = null, players = {}, turn = null, turnEarned = {};
let strokes = [], liveStrokeData = null;
let unsubs = [];
let amHost = false, queueListenerOn = false;
let drawing = false, currentPoints = [], lastLivePush = 0, myGotIt = false;

function roomRef(p) { return ref(db, "rooms/" + roomCode + (p ? "/" + p : "")); }
function isDrawer() { return turn && turn.drawerId === uid; }
function onlinePlayers() { return Object.entries(players).filter(([, p]) => p.online !== false); }
function sortedPlayers() {
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.joinedAt || 0) - (b.joinedAt || 0));
}

// ---------- auth (anonymous, silent) ----------
if (db && auth) {
  onAuthStateChanged(auth, (user) => {
    if (user) { uid = user.uid; }
    else signInAnonymously(auth).catch((e) => console.error("anon auth failed:", e));
  });
  // Connection banner via .info/connected
  onValue(ref(db, ".info/connected"), (snap) => {
    $("conn-banner").classList.toggle("hidden", snap.val() !== false);
  });
} else {
  $("server-warning").classList.remove("hidden");
  $("create-btn").disabled = true;
  $("join-btn").disabled = true;
}

// ---------- home actions ----------
$("name-input").addEventListener("input", () => { myName = $("name-input").value.trim(); });
$("code-input").addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
});

$("create-btn").addEventListener("click", async () => {
  if (!uid) return showError("home-error", "Still signing you in… try again in a second.");
  const name = $("name-input").value.trim();
  if (!name) return showError("home-error", "Pick a display name first.");
  myName = name;
  for (let tries = 0; tries < 5; tries++) {
    const code = randomCode();
    const snap = await get(ref(db, "rooms/" + code + "/meta"));
    if (!snap.exists()) { roomCode = code; break; }
  }
  if (!roomCode) return showError("home-error", "Could not find a free room code — try again.");
  await set(roomRef("meta"), { hostId: uid, state: "lobby", order: [], createdAt: Date.now(), notice: "" });
  await joinRoomAsPlayer();
});

$("join-btn").addEventListener("click", async () => {
  if (!uid) return showError("home-error", "Still signing you in… try again in a second.");
  const name = $("name-input").value.trim();
  if (!name) return showError("home-error", "Pick a display name first.");
  const code = $("code-input").value.trim().toUpperCase();
  if (code.length !== 4) return showError("home-error", "Enter the 4-letter room code.");
  myName = name;
  const snap = await get(ref(db, "rooms/" + code));
  if (!snap.exists()) return showError("home-error", "Room not found — check the code and try again.");
  const data = snap.val() || {};
  const plist = data.players || {};
  const count = Object.keys(plist).length;
  if ((data.meta?.state || "lobby") !== "lobby") {
    return showError("home-error", "That game is already in progress — wait for the next one, then join with the same code.");
  }
  if (count >= 8) return showError("home-error", "That room is full (8 players max).");
  if (plist[uid]) { /* rejoining same room: fine */ }
  roomCode = code;
  await joinRoomAsPlayer();
});

async function joinRoomAsPlayer() {
  showError("home-error", "");
  const me = { name: myName, joinedAt: players[uid]?.joinedAt || Date.now(), score: players[uid]?.score || 0, gotIt: false, online: true };
  await set(roomRef("players/" + uid), me);
  onDisconnect(roomRef("players/" + uid + "/online")).set(false);
  $("room-code-label").textContent = roomCode;
  $("room-chip").classList.remove("hidden");
  attachRoomListeners();
  showView("view-lobby");
  showNotice("Joined room " + roomCode + " as " + myName + ".");
}

$("copy-code-btn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(roomCode); showNotice("Room code copied: " + roomCode); }
  catch (e) { showNotice("Room code: " + roomCode); }
});

// ---------- room listeners ----------
function detachAll() { unsubs.forEach((u) => { try { u(); } catch (e) {} }); unsubs = []; }

function attachRoomListeners() {
  detachAll();
  unsubs.push(onValue(roomRef("meta"), (snap) => {
    meta = snap.val();
    if (!meta) return;
    amHost = meta.hostId === uid;
    if (amHost) attachQueueListener(); else detachQueueListener();
    if (meta.notice) showNotice(meta.notice);
    renderByState();
  }));
  unsubs.push(onValue(roomRef("players"), (snap) => {
    players = snap.val() || {};
    renderLobby(); renderScoreboard(); renderByState();
  }));
  unsubs.push(onValue(roomRef("turn"), (snap) => {
    turn = snap.val();
    renderByState(); renderScoreboard();
  }));
  unsubs.push(onValue(roomRef("turnEarned"), (snap) => {
    turnEarned = snap.val() || {};
    renderReveal();
  }));
  unsubs.push(onValue(roomRef("liveStroke"), (snap) => {
    liveStrokeData = snap.val();
    redrawCanvas();
  }));
  // Chat (append-only, capped in DOM)
  unsubs.push(onChildAdded(roomRef("chat"), (snap) => {
    const m = snap.val();
    if (!m) return;
    const li = document.createElement("li");
    li.className = m.kind === "correct" ? "correct" : m.kind === "system" ? "system" : "";
    li.textContent = m.text;
    const list = $("chat-list");
    list.appendChild(li);
    while (list.children.length > 80) list.removeChild(list.firstChild);
    list.scrollTop = list.scrollHeight;
  }));
  attachStrokeListener();
  // Host tick + migration tick
  setInterval(hostTick, 1000);
  setInterval(migrationTick, 2000);
  // Timer display
  setInterval(renderTimer, 250);
}

let strokeUnsub = null;
function attachStrokeListener() {
  if (strokeUnsub) { try { strokeUnsub(); } catch (e) {} strokeUnsub = null; }
  strokes = [];
  strokeUnsub = onChildAdded(roomRef("strokes"), (snap) => {
    const s = snap.val();
    if (s) { strokes.push(s); redrawCanvas(); }
  });
  // NOTE: strokes are stored flat under strokes/<pushId> with a turnNumber
  // field; on turn change the host clears the node, so this listener always
  // reflects the current turn. redrawCanvas filters by nothing — cleared node
  // means a fresh listener is attached on turn change (see renderByState).
}

// Re-attach stroke listener whenever the turn number changes (host clears
// strokes at each turn start, so a fresh listener keeps the canvas in sync).
let lastTurnNumber = 0;
function watchTurnChange() {
  const n = turn?.number || 0;
  if (n !== lastTurnNumber) {
    lastTurnNumber = n;
    strokes = [];
    if (strokeUnsub) { try { strokeUnsub(); } catch (e) {} strokeUnsub = null; }
    strokeUnsub = onChildAdded(roomRef("strokes"), (snap) => {
      const s = snap.val();
      if (s) { strokes.push(s); redrawCanvas(); }
    });
    redrawCanvas();
  }
}

// ---------- rendering: lobby / scoreboard / state ----------
function renderLobby() {
  $("lobby-count").textContent = onlinePlayers().length;
  const list = $("lobby-players");
  list.innerHTML = "";
  sortedPlayers().forEach((p) => {
    const li = document.createElement("li");
    li.className = p.online === false ? "offline" : "";
    li.innerHTML = "<span>" + esc(p.name) + (p.id === meta?.hostId ? ' <span class="badge">HOST</span>' : "") + "</span><span>" + (p.online === false ? "away" : "") + "</span>";
    list.appendChild(li);
  });
  const canStart = amHost && onlinePlayers().length >= 2;
  $("start-btn").classList.toggle("hidden", !amHost);
  $("start-btn").disabled = !canStart;
  $("start-hint").textContent = amHost
    ? (onlinePlayers().length >= 2 ? "Everyone's here — start when ready!" : "Need at least 2 players to start.")
    : "Waiting for the host to start… (need at least 2 players)";
}

function renderScoreboard() {
  const list = $("scoreboard");
  list.innerHTML = "";
  sortedPlayers().forEach((p) => {
    const li = document.createElement("li");
    li.className = p.online === false ? "offline" : "";
    const tags = (p.id === meta?.hostId ? ' <span class="badge">HOST</span>' : "")
      + (turn && p.id === turn.drawerId ? ' <span class="badge drawer">DRAWING</span>' : "")
      + (p.gotIt ? ' <span class="gotit">✓ got it</span>' : "");
    li.innerHTML = "<span>" + esc(p.name) + tags + "</span><strong>" + (p.score || 0) + " pts</strong>";
    list.appendChild(li);
  });
  myGotIt = Boolean(players[uid]?.gotIt);
  const guessing = meta?.state === "drawing" && turn?.word && !isDrawer() && !myGotIt;
  $("guess-row").classList.toggle("hidden", !guessing);
  $("guess-note").classList.toggle("hidden", !(meta?.state === "drawing" && isDrawer()));
  $("guess-input").disabled = !guessing;
  $("guess-btn").disabled = !guessing;
}

function renderByState() {
  watchTurnChange();
  if (!meta) return;
  const state = meta.state;
  if (state === "lobby") {
    showView("view-lobby");
    renderLobby();
    return;
  }
  if (state === "finished") { renderPodium(); showView("view-podium"); return; }
  // drawing / reveal
  showView("view-game");
  const drawer = turn ? players[turn.drawerId] : null;
  const drawerName = drawer ? drawer.name : "…";
  const banner = $("turn-banner");
  if (state === "drawing") {
    if (!turn?.word) {
      banner.textContent = isDrawer() ? "Pick a word to draw!" : drawerName + " is choosing a word…";
    } else {
      banner.textContent = isDrawer() ? "Your turn to draw! The word is: " + turn.word : drawerName + " is drawing — guess the word!";
    }
    banner.classList.toggle("mine", isDrawer());
  } else if (state === "reveal") {
    banner.textContent = "Time! The word was revealed below.";
    banner.classList.remove("mine");
  }
  // Drawer-only UI: word pick + toolbar (only while drawing, only drawer)
  const picking = state === "drawing" && isDrawer() && !turn?.word;
  $("word-pick").classList.toggle("hidden", !picking);
  if (picking && turn?.choices) {
    const box = $("word-choices");
    if (!box.dataset.builtFor || box.dataset.builtFor !== String(turn.number)) {
      box.dataset.builtFor = String(turn.number);
      box.innerHTML = "";
      turn.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn primary";
        b.textContent = c.w + "  (" + c.c + ")";
        b.addEventListener("click", () => pickWord(c.w));
        box.appendChild(b);
      });
    }
  }
  const canDraw = state === "drawing" && isDrawer() && Boolean(turn?.word);
  $("toolbar").classList.toggle("hidden", !canDraw);
  $("reveal-box").classList.toggle("hidden", state !== "reveal");
  if (state === "reveal") renderReveal();
  renderTimer();
}

function renderReveal() {
  if (!turn) return;
  $("reveal-word").textContent = turn.word
    ? "The word was: " + turn.word
    : "The drawer left — no word this turn.";
  const list = $("reveal-points");
  list.innerHTML = "";
  Object.entries(turnEarned).forEach(([pid, pts]) => {
    const li = document.createElement("li");
    li.textContent = (players[pid]?.name || "Player") + ": +" + pts + " pts";
    list.appendChild(li);
  });
  if (!Object.keys(turnEarned).length) {
    const li = document.createElement("li");
    li.textContent = "Nobody guessed it this time.";
    list.appendChild(li);
  }
}

function renderPodium() {
  const sorted = sortedPlayers();
  const pod = $("podium");
  pod.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉"];
  sorted.slice(0, 3).forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "podium-place" + (i === 0 ? " first" : "");
    d.innerHTML = '<div class="medal">' + medals[i] + '</div><div class="pname">' + esc(p.name) + '</div><div class="pscore">' + (p.score || 0) + " pts</div>";
    pod.appendChild(d);
  });
  const list = $("final-scores");
  list.innerHTML = "";
  sorted.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = "<span>#" + (i + 1) + " " + esc(p.name) + "</span><strong>" + (p.score || 0) + " pts</strong>";
    list.appendChild(li);
  });
  $("play-again-btn").classList.toggle("hidden", !amHost);
  $("play-again-hint").textContent = amHost ? "Start a fresh game with the same room and players." : "Waiting for the host to start a new game…";
}

function renderTimer() {
  const t = $("timer");
  if (!turn?.endAt || meta?.state !== "drawing") { t.textContent = "–"; t.classList.remove("low"); return; }
  const left = Math.max(0, Math.ceil((turn.endAt - Date.now()) / 1000));
  t.textContent = left;
  t.classList.toggle("low", left <= 10);
}

// ---------- host actions ----------
$("start-btn").addEventListener("click", async () => {
  if (!amHost) return;
  const order = onlinePlayers()
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))
    .map(([id]) => id);
  if (order.length < 2) return;
  await update(roomRef("meta"), { state: "drawing", order });
  await push(roomRef("chat"), { kind: "system", text: "Game started! " + (players[order[0]]?.name || "Player 1") + " draws first.", ts: Date.now() });
  await startTurn(1);
});

async function startTurn(n) {
  const order = meta?.order || [];
  // Find the next online drawer at or after position n-1.
  let idx = n - 1, drawerId = null;
  while (idx < order.length) {
    const cand = order[idx];
    if (players[cand]?.online !== false) { drawerId = cand; break; }
    idx++;
  }
  if (!drawerId) { await finishGame(); return; }
  const realTurn = idx + 1;
  // Reset per-turn state.
  await remove(roomRef("strokes"));
  await remove(roomRef("liveStroke"));
  await remove(roomRef("turnEarned"));
  await remove(roomRef("guessQueue"));
  const resets = {};
  Object.keys(players).forEach((pid) => { resets["players/" + pid + "/gotIt"] = false; });
  await update(roomRef(""), resets);
  const choices = pickChoices(roomCode, realTurn);
  await set(roomRef("turn"), {
    number: realTurn, drawerId, choices,
    word: null, pickDeadline: Date.now() + PICK_SECONDS * 1000,
    startedAt: null, endAt: null
  });
  await push(roomRef("chat"), { kind: "system", text: "Turn " + realTurn + ": " + (players[drawerId]?.name || "Someone") + " is drawing!", ts: Date.now() });
  strokes = [];
  redrawCanvas();
}

async function pickWord(word) {
  if (!isDrawer() || turn?.word) return;
  const now = Date.now();
  await update(roomRef("turn"), { word, startedAt: now, endAt: now + TURN_SECONDS * 1000, pickDeadline: null });
}

async function doReveal(reason) {
  const word = turn?.word || null;
  await update(roomRef("meta"), { state: "reveal", revealAt: Date.now() });
  await push(roomRef("chat"), {
    kind: "system",
    text: word ? "Time! The word was: " + word : "Turn ended — the drawer left before picking.",
    ts: Date.now()
  });
  void reason;
}

async function finishGame() {
  await update(roomRef("meta"), { state: "finished" });
  await push(roomRef("chat"), { kind: "system", text: "Game over! Check the podium.", ts: Date.now() });
}

$("play-again-btn").addEventListener("click", async () => {
  if (!amHost) return;
  await remove(roomRef("turn"));
  await remove(roomRef("turnEarned"));
  await remove(roomRef("strokes"));
  await remove(roomRef("liveStroke"));
  await remove(roomRef("guessQueue"));
  await update(roomRef("meta"), { state: "lobby", order: [], revealAt: null, notice: "" });
  const playerResets = {};
  Object.keys(players).forEach((pid) => {
    playerResets["players/" + pid + "/score"] = 0;
    playerResets["players/" + pid + "/gotIt"] = false;
  });
  await update(roomRef(""), playerResets);
  await push(roomRef("chat"), { kind: "system", text: "New game! Waiting in the lobby.", ts: Date.now() });
});

// ---------- host tick: drives ALL state transitions (host only) ----------
async function hostTick() {
  if (!amHost || !meta) return;
  if ((meta.state === "drawing" || meta.state === "reveal") && !turn) return;
  try {
    if (meta.state === "drawing" && turn) {
      const drawer = players[turn.drawerId];
      // Drawer left mid-turn -> reveal immediately.
      if (drawer && drawer.online === false) { await doReveal("drawer-left"); return; }
      // Drawer never picked -> auto-pick the first choice.
      if (!turn.word) {
        if (turn.pickDeadline && Date.now() > turn.pickDeadline) {
          const w = turn.choices?.[0]?.w;
          if (w) {
            const now = Date.now();
            await update(roomRef("turn"), { word: w, startedAt: now, endAt: now + TURN_SECONDS * 1000, pickDeadline: null });
          }
        }
        return;
      }
      // Time up, or every guesser got it -> reveal.
      const guessers = onlinePlayers().filter(([id]) => id !== turn.drawerId);
      const allGot = guessers.length > 0 && guessers.every(([, p]) => p.gotIt);
      if ((turn.endAt && Date.now() >= turn.endAt) || allGot) { await doReveal("done"); return; }
    }
    if (meta.state === "reveal") {
      if (meta.revealAt && Date.now() >= meta.revealAt + REVEAL_SECONDS * 1000) {
        const order = meta.order || [];
        const next = (turn?.number || 0) + 1;
        if (next > order.length) await finishGame();
        else await startTurn(next);
      }
      return;
    }
    // Only one player left mid-game -> back to lobby with a notice.
    if ((meta.state === "drawing" || meta.state === "reveal") && onlinePlayers().length <= 1) {
      await update(roomRef("meta"), { state: "lobby", notice: "Only one player left — back to the lobby. Invite a friend and start again!" });
    }
  } catch (e) { console.error("host tick error:", e); }
}

// ---------- host migration: longest-present online player takes over ----------
async function migrationTick() {
  if (!meta || amHost || !roomCode) return;
  const host = players[meta.hostId];
  if (host && host.online !== false) return; // host alive
  const online = onlinePlayers().sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  if (!online.length || online[0][0] !== uid) return; // not my turn to take over
  try {
    await runTransaction(roomRef("meta/hostId"), (cur) => (cur === meta.hostId ? uid : cur));
  } catch (e) { console.error("host migration error:", e); }
}

// ---------- guess queue: host validates + awards (guessers never see the word) ----------
let queueUnsub = null;
function attachQueueListener() {
  if (queueUnsub) return;
  queueUnsub = onChildAdded(roomRef("guessQueue"), async (snap) => {
    const g = snap.val();
    if (!g || !amHost) return;
    const key = snap.key;
    // Claim the item so a host-migration overlap can't double-award.
    const claimed = await runTransaction(roomRef("guessQueue/" + key + "/claimedBy"), (cur) => (cur ? cur : uid));
    if (!claimed.committed || claimed.snapshot.val() !== uid) return;
    try {
      const t = (await get(roomRef("turn"))).val();
      const p = (await get(roomRef("players/" + g.playerId))).val();
      const valid = t && meta?.state === "drawing" && t.word
        && g.playerId !== t.drawerId && p && !p.gotIt;
      if (valid && g.text.trim().toLowerCase() === t.word.toLowerCase()) {
        const remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
        const pts = 100 + Math.round(100 * (remaining / TURN_SECONDS));
        await runTransaction(roomRef("players/" + g.playerId + "/score"), (cur) => (cur || 0) + pts);
        await runTransaction(roomRef("players/" + t.drawerId + "/score"), (cur) => (cur || 0) + 20);
        await runTransaction(roomRef("turnEarned/" + g.playerId), (cur) => (cur || 0) + pts);
        await runTransaction(roomRef("turnEarned/" + t.drawerId), (cur) => (cur || 0) + 20);
        await update(roomRef("players/" + g.playerId), { gotIt: true });
        await push(roomRef("chat"), { kind: "correct", text: "🎉 " + g.name + " got it!", ts: Date.now() });
      } else if (valid) {
        // Wrong guess: visible to everyone, word never included.
        await push(roomRef("chat"), { kind: "guess", text: g.name + ": " + g.text, ts: Date.now() });
      }
    } catch (e) { console.error("guess processing error:", e); }
    finally { try { await remove(roomRef("guessQueue/" + key)); } catch (e) {} }
  });
  queueListenerOn = true;
}
function detachQueueListener() {
  if (queueUnsub) { try { queueUnsub(); } catch (e) {} queueUnsub = null; }
  queueListenerOn = false;
}

// ---------- guessing (guessers only) ----------
async function submitGuess() {
  const text = $("guess-input").value.trim();
  if (!text) return;
  if (!turn?.word || isDrawer() || myGotIt || meta?.state !== "drawing") return;
  $("guess-input").value = "";
  await push(roomRef("guessQueue"), { playerId: uid, name: myName, text, ts: Date.now() });
}
$("guess-btn").addEventListener("click", submitGuess);
$("guess-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submitGuess(); });

// ---------- canvas ----------
const canvas = $("draw-canvas");
const ctx = canvas.getContext("2d");
const CW = 1000, CH = 600;

function toNorm(e) {
  const r = canvas.getBoundingClientRect();
  return [
    Math.max(0, Math.min(1000, Math.round(((e.clientX - r.left) / r.width) * 1000))),
    Math.max(0, Math.min(1000, Math.round(((e.clientY - r.top) / r.height) * 1000)))
  ];
}
function drawStrokeOn(s, ctx2) {
  if (!s.points || s.points.length < 1) return;
  ctx2.save();
  ctx2.lineCap = "round"; ctx2.lineJoin = "round";
  if (s.erase) { ctx2.globalCompositeOperation = "destination-out"; ctx2.strokeStyle = "rgba(0,0,0,1)"; }
  else { ctx2.strokeStyle = s.color; }
  ctx2.lineWidth = (s.size / 1000) * CW;
  ctx2.beginPath();
  s.points.forEach(([x, y], i) => {
    const px = (x / 1000) * CW, py = (y / 1000) * CH;
    if (i === 0) ctx2.moveTo(px, py); else ctx2.lineTo(px, py);
  });
  if (s.points.length === 1) {
    const [x, y] = s.points[0];
    ctx2.arc((x / 1000) * CW, (y / 1000) * CH, ((s.size / 1000) * CW) / 2, 0, Math.PI * 2);
    ctx2.fillStyle = s.erase ? "rgba(0,0,0,1)" : s.color;
    ctx2.fill();
  } else ctx2.stroke();
  ctx2.restore();
}
function redrawCanvas() {
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, CW, CH);
  strokes.forEach((s) => drawStrokeOn(s, ctx));
  if (liveStrokeData && liveStrokeData.points?.length) drawStrokeOn(liveStrokeData, ctx);
}
redrawCanvas();

canvas.addEventListener("pointerdown", (e) => {
  if (!(meta?.state === "drawing" && isDrawer() && turn?.word)) return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  drawing = true;
  currentPoints = [toNorm(e)];
});
canvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  e.preventDefault();
  currentPoints.push(toNorm(e));
  // Local echo + throttled live preview (~10/sec).
  redrawCanvas();
  const preview = { color: brushColor, size: brushSize, erase: erasing, points: currentPoints };
  drawStrokeOn(preview, ctx);
  const now = Date.now();
  if (now - lastLivePush >= 100) {
    lastLivePush = now;
    set(roomRef("liveStroke"), preview).catch(() => {});
  }
});
async function endStroke(e) {
  if (!drawing) return;
  drawing = false;
  if (currentPoints.length) {
    const stroke = { color: brushColor, size: brushSize, erase: erasing, points: currentPoints };
    try { await push(roomRef("strokes"), stroke); } catch (err) { console.error("stroke push failed:", err); }
    try { await remove(roomRef("liveStroke")); } catch (err) {}
  }
  currentPoints = [];
  redrawCanvas();
}
canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);

// Toolbar: colors, sizes, eraser, clear (drawer only — panel is hidden otherwise).
(function buildPalette() {
  const pal = $("color-palette");
  COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "color-btn" + (c === brushColor ? " active" : "");
    b.style.background = c; b.title = c;
    b.addEventListener("click", () => {
      brushColor = c; erasing = false;
      $("eraser-btn").textContent = "🧽 Eraser";
      pal.querySelectorAll(".color-btn").forEach((x) => x.classList.toggle("active", x === b));
    });
    pal.appendChild(b);
  });
})();
document.querySelectorAll(".size-btn").forEach((b) => {
  b.addEventListener("click", () => {
    brushSize = parseInt(b.dataset.size, 10);
    document.querySelectorAll(".size-btn").forEach((x) => x.classList.toggle("active", x === b));
  });
});
$("eraser-btn").addEventListener("click", () => {
  erasing = !erasing;
  $("eraser-btn").textContent = erasing ? "✏️ Back to brush" : "🧽 Eraser";
});
$("clear-btn").addEventListener("click", async () => {
  if (!isDrawer()) return;
  await remove(roomRef("strokes"));
  await remove(roomRef("liveStroke"));
  strokes = [];
  redrawCanvas();
});
