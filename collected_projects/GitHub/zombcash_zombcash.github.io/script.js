/* Render the public aggregate traffic dashboard from the first-party API. */
(() => {
  if (new URLSearchParams(window.location.search).get('arcadeSnake') === '1') return;
  const root = document.getElementById('campaign-dashboard');
  if (!root) return;
  const endpoint = 'https://zombcash-bot.fadehost.app/api/track';
  const byId = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString();
  const safe = s => String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const renderList = (node, entries, empty) => {
    if (!node) return;
    const rows = Object.entries(entries || {}).sort((a,b) => Number(b[1])-Number(a[1])).slice(0,8);
    if (!rows.length) { node.innerHTML = '<span>' + empty + '</span>'; return; }
    const max = Math.max(1, ...rows.map(x => Number(x[1]) || 0));
    node.innerHTML = rows.map(([label,value]) => {
      const n = Number(value) || 0;
      const pct = Math.max(2, Math.round(n / max * 100));
      return '<div class="campaign-row"><span>' + safe(label) + '</span><div class="campaign-bar"><i style="width:' + pct + '%"></i></div><b class="campaign-count">' + fmt(n) + '</b></div>';
    }).join('');
  };
  const load = async () => {
    try {
      const response = await fetch(endpoint, {cache:'no-store'});
      if (!response.ok) throw new Error('Analytics endpoint returned ' + response.status);
      const data = await response.json();
      const events = data.events || {};
      const sum = names => names.reduce((n,key) => n + (Number(events[key]) || 0), 0);
      byId('campaign-pageviews').textContent = fmt(events.page_view || 0);
      byId('campaign-outbound').textContent = fmt(events.outbound_click || 0);
      byId('campaign-community').textContent = fmt(sum(['telegram_open','radar_open']));
      byId('campaign-conversions').textContent = fmt(sum(['ca_copy','game_start','game_share','maker_share','cta_click','token_info_open']));
      renderList(byId('campaign-sources'), data.sources, 'No campaign traffic recorded yet.');
      renderList(byId('campaign-days'), data.daily, 'No daily events recorded yet.');
      byId('campaign-updated').textContent = 'UPDATED ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + ' · ' + (data.retentionDays || 60) + ' DAY RETENTION';
    } catch (_) {
      byId('campaign-updated').textContent = 'ANALYTICS TEMPORARILY UNAVAILABLE · CHECK API DEPLOYMENT';
      byId('campaign-sources').innerHTML = '<span>Analytics API is not responding yet.</span>';
      byId('campaign-days').innerHTML = '<span>Try again after the API deployment completes.</span>';
    }
  };
  load();
  setInterval(load, 60000);
})();

/* ZombieCash first-party campaign tracking. Aggregate-only; no IP or wallet addresses stored. */
(() => {
  if (new URLSearchParams(window.location.search).get('arcadeSnake') === '1') return;
  if (window.__zombcashCampaignTrackingLoaded) return;
  window.__zombcashCampaignTrackingLoaded = true;
  const endpoint = 'https://zombcash-bot.fadehost.app/api/track';
  const params = new URLSearchParams(window.location.search);
  const clean = (value, fallback) => String(value || fallback).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60) || fallback;
  const source = clean(params.get('utm_source') || params.get('source') || document.referrer && new URL(document.referrer).hostname.split('.')[0] || 'direct', 'direct');
  const medium = clean(params.get('utm_medium') || 'unknown', 'unknown');
  const campaign = clean(params.get('utm_campaign') || 'none', 'none');
  const page = (window.location.pathname || '/').replace(/[^a-zA-Z0-9_./-]/g, '').slice(0, 120) || '/';
  const send = (event, target = 'none') => {
    try {
      const body = JSON.stringify({event, source, medium, campaign, page, target: clean(target, 'none')});
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], {type:'application/json'}));
      } else {
        fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body, keepalive:true}).catch(() => {});
      }
    } catch (_) {}
  };
  send('page_view');
  document.addEventListener('click', event => {
    const el = event.target && event.target.closest ? event.target.closest('a,button') : null;
    if (!el) return;
    const id = String(el.id || '').toLowerCase();
    const label = String(el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase();
    const href = el.href || '';
    if (id === 'copy-ca' || id === 'footer-copy-ca' || /copy contract|copy ca/.test(label)) send('ca_copy', 'token');
    if (id === 'start-game' || id === 'game-action' || /start game|play now|play again/.test(label)) send('game_start', 'zombie_lab');
    if (/zombie-maker\.html/.test(href) || /make your zombie/.test(label)) send('cta_click', 'zombie_maker');
    if (/t\.me\/zombiecashmemeradarbot/i.test(href)) send('radar_open', 'meme_radar');
    if (/t\.me\/zombcash\/?(?:\?|$)/i.test(href)) send('telegram_open', 'telegram_channel');
    if (/pump\.fun\/coin|dexscreener\.com\/solana/i.test(href)) send('token_info_open', 'token_market');
    if (href && /^https?:/i.test(href) && new URL(href, window.location.href).origin !== window.location.origin) {
      send('outbound_click', new URL(href).hostname.split('.')[0]);
    }
  }, {capture:true});
})();

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.topbar nav');
menu?.addEventListener('click', () => nav.classList.toggle('open'));
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// Demo-only outbreak indicator. Clearly labelled as simulated, not live market data.
const chaos = 68;
const chaosValue = document.getElementById('chaos-value');
const meterFill = document.getElementById('meter-fill');
if (chaosValue) chaosValue.textContent = `${chaos}%`;
if (meterFill) meterFill.style.width = `${chaos}%`;
const phases = [
  ['THE DEAD ARE WALKING', 'The city is quiet. Your next move doesn’t have to be.'],
  ['SIGNAL IN THE STATIC', 'A new transmission is somewhere out there. Stay curious.'],
  ['OUTBREAK LEVEL: UNDEAD', 'The apocalypse is a mood. Keep your head on straight.']
];
let phase = 0;
const outbreakStatus = document.getElementById('outbreak-status');
const outbreakMessage = document.getElementById('outbreak-message');
if (outbreakStatus && outbreakMessage) {
  setInterval(() => {
    phase = (phase + 1) % phases.length;
    outbreakStatus.textContent = phases[phase][0];
    outbreakMessage.textContent = phases[phase][1];
  }, 6500);
}

const ca = '6cCBF9gtyp3c6VmyxUWzETk3yFmxhjvPm15cxicfpump';
async function copyContractAddress(button, feedback) {
  let copied = false;
  try {
    await navigator.clipboard.writeText(ca);
    copied = true;
  } catch (_) {
    const input = document.createElement('textarea');
    input.value = ca;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try { copied = document.execCommand('copy'); } catch (_) {}
    input.remove();
  }
  if (feedback) {
    feedback.textContent = copied ? 'CONTRACT COPIED TO CLIPBOARD.' : 'COPY FAILED — SELECT THE CONTRACT ADDRESS AND COPY IT MANUALLY.';
  }
  if (button) {
    const original = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = original;
    button.textContent = copied ? 'COPIED ✓' : 'COPY FAILED';
    if (copied) setTimeout(() => { button.textContent = original; }, 1800);
  }
  return copied;
}
document.getElementById('copy-ca')?.addEventListener('click', async () => {
  await copyContractAddress(document.getElementById('copy-ca'), document.getElementById('copy-feedback'));
});
document.getElementById('footer-copy-ca')?.addEventListener('click', async () => {
  const button = document.getElementById('footer-copy-ca');
  const feedback = document.getElementById('footer-copy-feedback');
  await copyContractAddress(button, feedback);
});

// Zombie Snake: classic keyboard-controlled snake with a ZombieCash twist.
const start = document.getElementById('start-game');
const action = document.getElementById('game-action');
const gameMessage = document.getElementById('game-message');
const gameState = document.getElementById('game-state');
const scoreEl = document.getElementById('game-score');
const screen = document.getElementById('game-screen');
const gameCanvas = document.getElementById('zombie-canvas');
const gameCtx = gameCanvas?.getContext('2d');
const CELL = 20;
const BASE_STEP_MS = 125;
const BOOST_MULTIPLIER = 0.62;
const MAX_BRAINS = 4;
let gameFrame = 0, lastStep = 0, gameActive = false, gameFinished = false;
let gamePoints = 0, snake = [], brains = [], direction = {x: 1, y: 0}, nextDirection = {x: 1, y: 0};
let gameWidth = 0, gameHeight = 0, cols = 0, rows = 0, stepMs = BASE_STEP_MS;
const heldMoveKeys = new Set();
let snakeSurvivalReceiptPromise = null;
let snakeSurvivalReceiptUsed = false;
function snakeSurvivorToken(){try{return localStorage.getItem('zombcash-survivor-token')||''}catch(_){return ''}}
async function beginSnakeSurvivalSession(){
  snakeSurvivalReceiptUsed=false;
  const token=snakeSurvivorToken();
  if(!token){snakeSurvivalReceiptPromise=null;return}
  snakeSurvivalReceiptPromise=fetch('https://zombcash-bot.fadehost.app/api/survival/game-start',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({game:'snake'}),cache:'no-store'})
    .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Session unavailable');return data.receipt||null})
    .catch(()=>null);
}
async function completeSnakeSurvivalSession(points){
  if(snakeSurvivalReceiptUsed)return;
  snakeSurvivalReceiptUsed=true;
  const score=Math.max(0,Math.min(100000,Number(points)||0));
  const token=snakeSurvivorToken(), pending=snakeSurvivalReceiptPromise;
  if(!token||!pending){if(window.parent!==window)window.parent.postMessage({type:'zombcash-arcade-snake-result',points:score,accountSaved:false},location.origin);return}
  const receipt=await pending;
  if(!receipt){if(window.parent!==window)window.parent.postMessage({type:'zombcash-arcade-snake-result',points:score,accountSaved:false,error:'Could not verify this game session.'},location.origin);return}
  try{
    const response=await fetch('https://zombcash-bot.fadehost.app/api/survival/game-complete',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({receipt,points:score}),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(window.parent!==window)window.parent.postMessage({type:'zombcash-arcade-snake-result',points:score,accountSaved:response.ok,arcadeScore:data.arcadeScore||null,error:response.ok?'':(data.error||'Could not save to profile.')},location.origin);
  }catch(_){if(window.parent!==window)window.parent.postMessage({type:'zombcash-arcade-snake-result',points:score,accountSaved:false,error:'Network error while saving score.'},location.origin)}
}
let lastBonusBrainAt = 0;

function resizeGameCanvas() {
  if (!gameCanvas || !screen || !gameCtx) return;
  const rect = screen.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  gameWidth = rect.width; gameHeight = rect.height;
  gameCanvas.width = Math.round(gameWidth * dpr);
  gameCanvas.height = Math.round(gameHeight * dpr);
  gameCanvas.style.width = gameWidth + 'px';
  gameCanvas.style.height = gameHeight + 'px';
  gameCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const oldCols = cols, oldRows = rows;
  cols = Math.max(8, Math.floor(gameWidth / CELL));
  rows = Math.max(8, Math.floor(gameHeight / CELL));
  if (!gameActive && snake.length && (oldCols !== cols || oldRows !== rows)) {
    snake = snake.map(p => ({x: Math.min(cols - 1, p.x), y: Math.min(rows - 1, p.y)}));
    brains = brains.map(p => ({x: Math.min(cols - 1, p.x), y: Math.min(rows - 1, p.y)}));
  }
  drawGame();
}
function isOccupied(point, includeSnake = true) {
  return (includeSnake && snake.some(p => p.x === point.x && p.y === point.y)) ||
    brains.some(p => p.x === point.x && p.y === point.y);
}
function randomFreeCell() {
  const freeCount = cols * rows - snake.length - brains.length;
  if (freeCount <= 0) return null;
  for (let attempts = 0; attempts < 600; attempts++) {
    const point = {x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows)};
    if (!isOccupied(point)) return point;
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const point = {x, y};
      if (!isOccupied(point)) return point;
    }
  }
  return null;
}
function placeBrain() {
  if (brains.length >= MAX_BRAINS) return false;
  const point = randomFreeCell();
  if (!point) return false;
  brains.push(point);
  return true;
}
function resetBrains() {
  brains = [];
  placeBrain();
  placeBrain();
  if (brains.length > 1 && Math.random() < 0.6) brains.pop();
  lastBonusBrainAt = performance.now();
}
function drawGame() {
  if (!gameCtx) return;
  gameCtx.clearRect(0, 0, gameWidth, gameHeight);
  gameCtx.fillStyle = '#08120d';
  gameCtx.fillRect(0, 0, gameWidth, gameHeight);
  gameCtx.strokeStyle = 'rgba(119,255,139,.09)';
  gameCtx.lineWidth = 1;
  for (let x = 0; x <= gameWidth; x += CELL) { gameCtx.beginPath(); gameCtx.moveTo(x,0); gameCtx.lineTo(x,gameHeight); gameCtx.stroke(); }
  for (let y = 0; y <= gameHeight; y += CELL) { gameCtx.beginPath(); gameCtx.moveTo(0,y); gameCtx.lineTo(gameWidth,y); gameCtx.stroke(); }
  if (snake.length) {
    snake.forEach((p, i) => {
      const inset = 2;
      gameCtx.save();
      gameCtx.shadowColor = '#9bff45';
      gameCtx.shadowBlur = i === 0 ? 13 : 5;
      gameCtx.fillStyle = i === 0 ? '#d4ff8a' : '#5ce54f';
      gameCtx.fillRect(p.x * CELL + inset, p.y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
      if (i === 0) {
        gameCtx.shadowBlur = 0;
        gameCtx.fillStyle = '#101810';
        gameCtx.font = 'bold 13px sans-serif';
        gameCtx.textAlign = 'center'; gameCtx.textBaseline = 'middle';
        gameCtx.fillText('☠', p.x * CELL + CELL/2, p.y * CELL + CELL/2 + 1);
      }
      gameCtx.restore();
    });
    brains.forEach(brain => {
      gameCtx.save();
      gameCtx.font = '17px sans-serif';
      gameCtx.textAlign = 'center'; gameCtx.textBaseline = 'middle';
      gameCtx.shadowColor = '#9bff45'; gameCtx.shadowBlur = 12;
      gameCtx.fillText('🧠', brain.x * CELL + CELL/2, brain.y * CELL + CELL/2);
      gameCtx.restore();
    });
  }
  if (gameActive) {
    gameCtx.fillStyle = '#9bff45';
    gameCtx.font = '700 10px Orbitron,sans-serif';
    gameCtx.textAlign = 'left';
    gameCtx.fillText('ARROWS / WASD TO MOVE · HOLD TO BOOST', 12, 17);
    gameCtx.textAlign = 'right';
    gameCtx.fillText('BRAINS: ' + brains.length, gameWidth - 12, 17);
  }
}
function stopGame(won, reason) {
  gameActive = false;
  completeSnakeSurvivalSession(gamePoints);
  gameFinished = true;
  heldMoveKeys.clear();
  screen?.classList.remove('snake-playing');
  cancelAnimationFrame(gameFrame);
  action.disabled = false;
  action.style.opacity = '1';
  action.textContent = 'PLAY AGAIN';
  const submit = document.getElementById('submit-survival-score');
  if (submit) submit.disabled = gamePoints < 10;
  gameState.textContent = won ? 'SURVIVED' : 'GAME OVER';
  gameMessage.textContent = won ? 'OUTBREAK SURVIVED! NICE SNAKE WORK.' : (reason || 'THE HORDE COLLAPSED. TRY AGAIN!');
  gameMessage.style.display = '';
  gameMessage.style.color = won ? '#9bff45' : '#ff7777';
  screen.style.background = '';
  window.lastSurvivalPoints = gamePoints;
  const status = document.getElementById('score-submit-status');
  if (status) status.textContent = 'Final score: ' + gamePoints + ' points. Save your record to the community board.';
  drawGame();
}
function resetGame() {
  // The shared script is loaded on pages without the Snake game; do not touch absent game UI.
  if (!scoreEl || !gameState || !gameMessage || !action || !screen) return;
  cancelAnimationFrame(gameFrame);
  gameFrame = 0;
  gameActive = false;
  gameFinished = false;
  heldMoveKeys.clear();
  screen?.classList.remove('snake-playing');
  gamePoints = 0;
  const midX = Math.floor(cols / 2), midY = Math.floor(rows / 2);
  snake = [{x: midX, y: midY}, {x: midX - 1, y: midY}, {x: midX - 2, y: midY}];
  direction = {x: 1, y: 0}; nextDirection = {x: 1, y: 0};
  lastStep = 0; stepMs = BASE_STEP_MS;
  window.lastSurvivalPoints = null;
  const submit = document.getElementById('submit-survival-score');
  if (submit) submit.disabled = true;
  scoreEl.textContent = '000';
  gameState.textContent = 'READY';
  gameMessage.style.display = '';
  gameMessage.style.color = '';
  gameMessage.textContent = 'PRESS SPACE OR ENTER TO START · ARROWS / WASD TO MOVE';
  action.textContent = 'START SNAKE';
  action.disabled = false;
  action.style.opacity = '1';
  screen.style.background = '';
  resetBrains();
  drawGame();
}
function beginGame() {
  if (gameActive) return;
  // Use an explicit finished flag instead of UI text, which can be changed by
  // animation/state updates. Always build a fresh round after a collision.
  if (gameFinished || gameState?.textContent === 'GAME OVER' || gameState?.textContent === 'SURVIVED') {
    resetGame();
  }
  resizeGameCanvas();
  if (!snake.length) resetGame();
  beginSnakeSurvivalSession();
  gameActive = true;
  screen?.classList.add('snake-playing');
  lastStep = performance.now();
  action.disabled = true;
  action.style.opacity = '.35';
  action.textContent = 'SNAKE ACTIVE';
  gameMessage.style.display = 'none';
  gameState.textContent = 'SURVIVE';
  screen.style.background = '#08120d';
  gameFrame = requestAnimationFrame(tickGame);
}
function tickGame(now) {
  if (!gameActive) return;
  gameState.textContent = 'SURVIVE';
  const boostHeld = heldMoveKeys.size > 0;
  const effectiveStepMs = Math.max(48, stepMs * (boostHeld ? BOOST_MULTIPLIER : 1));
  if (now - lastStep >= effectiveStepMs) {
    lastStep = now;
    direction = nextDirection;
    const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
    const brainIndex = brains.findIndex(brain => head.x === brain.x && head.y === brain.y);
    const eating = brainIndex >= 0;
    const body = eating ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || body.some(p => p.x === head.x && p.y === head.y)) {
      stopGame(false, 'CRASHED! PRESS PLAY AGAIN TO RESTART.');
      return;
    }
    snake.unshift(head);
    if (eating) {
      brains.splice(brainIndex, 1);
      gamePoints += 10;
      scoreEl.textContent = String(gamePoints).padStart(3, '0');
      gameMessage.textContent = 'BRAIN CONSUMED! +10';
      gameMessage.style.color = '#9bff45';
      gameMessage.style.display = 'none';
      if (!brains.length) placeBrain();
      if (brains.length < MAX_BRAINS && Math.random() < 0.35) placeBrain();
      // Every 100 points increases the base snake speed by 10%, stacking by milestone.
      // Keep a 48 ms floor so the game remains playable at high scores.
      const speedLevel = Math.floor(gamePoints / 100);
      stepMs = Math.max(48, BASE_STEP_MS / Math.pow(1.10, speedLevel));
    } else {
      snake.pop();
    }
    // Bonus brains occasionally join the hunt, so the board can hold several at once.
    if (brains.length < MAX_BRAINS && now - lastBonusBrainAt > 6500 && Math.random() < 0.018) {
      if (placeBrain()) lastBonusBrainAt = now;
    }
    drawGame();
  }
  if (gameActive) gameFrame = requestAnimationFrame(tickGame);
}
function setSnakeDirection(x, y) {
  if (!gameActive) return;
  if (x === -direction.x && y === -direction.y) return;
  nextDirection = {x, y};
}
const snakeDirectionKeys = {
  arrowup: [0,-1], w: [0,-1],
  arrowdown: [0,1], s: [0,1],
  arrowleft: [-1,0], a: [-1,0],
  arrowright: [1,0], d: [1,0]
};
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const modalOpen = Boolean(snakeModal?.open);
  if (modalOpen && !gameActive && (key === ' ' || key === 'enter')) {
    event.preventDefault();
    beginGame();
    return;
  }
  if (snakeDirectionKeys[key] && modalOpen) {
    event.preventDefault();
    heldMoveKeys.add(key);
    if (gameActive) setSnakeDirection(snakeDirectionKeys[key][0], snakeDirectionKeys[key][1]);
  }
});
window.addEventListener('keyup', event => {
  heldMoveKeys.delete(event.key.toLowerCase());
});
window.addEventListener('blur', () => heldMoveKeys.clear());
action?.addEventListener('click', () => { if (!gameActive) beginGame(); });
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || !event.data?.type?.startsWith('zombcash-arcade-snake-')) return;
  const message = event.data;
  if (message.type === 'zombcash-arcade-snake-start') {
    resetGame();
    requestAnimationFrame(() => { resizeGameCanvas(); beginGame(); });
    return;
  }
  if (message.type === 'zombcash-arcade-snake-fullscreen') {
    document.documentElement.classList.toggle('arcade-snake-fullscreen', !!message.active);
    requestAnimationFrame(() => { resizeGameCanvas(); drawGame(); });
    return;
  }
  if (message.type === 'zombcash-arcade-snake-clear-keys') { heldMoveKeys.clear(); return; }
  if (message.type === 'zombcash-arcade-snake-key') {
    const key = String(message.key || '').toLowerCase();
    const directions = {arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
    if (message.down) {
      if (directions[key]) setSnakeDirection(directions[key][0], directions[key][1]);
      if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)) heldMoveKeys.add(key);
    } else heldMoveKeys.delete(key);
  }
});
const snakeModal = document.getElementById('snake-modal');
const snakeClose = document.getElementById('snake-close');
start?.addEventListener('click', () => {
  if (snakeModal && !snakeModal.open) snakeModal.showModal();
  requestAnimationFrame(() => {
    resizeGameCanvas();
    resetGame();
  });
});
snakeClose?.addEventListener('click', () => {
  if (gameActive) stopGame(false, 'RUN PAUSED. OPEN THE ARCADE TO PLAY AGAIN.');
  snakeModal?.close();
});
snakeModal?.addEventListener('click', event => {
  if (event.target === snakeModal) {
    if (gameActive) stopGame(false, 'RUN PAUSED. OPEN THE ARCADE TO PLAY AGAIN.');
    snakeModal.close();
  }
});
snakeModal?.addEventListener('close', () => {
  heldMoveKeys.clear();
  if (gameActive) stopGame(false, 'RUN PAUSED. OPEN THE ARCADE TO PLAY AGAIN.');
});
window.addEventListener('resize', resizeGameCanvas);
resizeGameCanvas();
resetGame();

// Open the existing Snake modal when launched from the dedicated Arcade page.
if (new URLSearchParams(window.location.search).get('arcadeSnake') === '1' && snakeModal) {
  requestAnimationFrame(() => {
    if (!snakeModal.open) snakeModal.showModal();
    resizeGameCanvas();
    resetGame();
  });
}

// Fullscreen mode for Zombie Snake.
const fullscreenButton = document.getElementById('game-fullscreen');
const gameBox = document.querySelector('.game-box');
async function toggleSnakeFullscreen() {
  if (!gameBox) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (gameBox.requestFullscreen) {
      await gameBox.requestFullscreen();
    } else {
      gameBox.classList.toggle('snake-expanded');
    }
  } catch (error) {
    gameBox.classList.toggle('snake-expanded');
  }
}
fullscreenButton?.addEventListener('click', toggleSnakeFullscreen);
document.addEventListener('fullscreenchange', () => {
  if (fullscreenButton) fullscreenButton.textContent = document.fullscreenElement ? '⤢ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
  resizeGameCanvas();
  drawGame();
});

// Live Solana Radar: public DexScreener API, no API key required.
const radarJapaneseUI = document.documentElement.lang === 'ja';
const radarRows = document.getElementById('radar-rows');
const radarStatus = document.getElementById('radar-status');
const radarUpdated = document.getElementById('radar-updated');
const radarSearch = document.getElementById('radar-search');
const radarRefresh = document.getElementById('radar-refresh');
const radarFilters = [...document.querySelectorAll('.radar-filter')];
let radarTokens = [];
let radarMode = 'hot';
let radarBusy = false;
let lastRadarSuccess = 0;

const money = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};
const price = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1) return '$' + n.toLocaleString('en-US', {maximumFractionDigits: 3});
  if (n >= 0.01) return '$' + n.toFixed(4);
  if (n >= 0.0001) return '$' + n.toFixed(6);
  return '$' + n.toPrecision(3);
};
const pct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '<span>—</span>';
  const cls = n > 0 ? 'change-up' : n < 0 ? 'change-down' : '';
  return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(2) + '%</span>';
};
function renderRadar() {
  const query = (radarSearch?.value || '').trim().toLowerCase();
  let list = radarTokens.filter(t => {
    const name = (t.baseToken?.name || '').toLowerCase();
    const symbol = (t.baseToken?.symbol || '').toLowerCase();
    const address = (t.baseToken?.address || '').toLowerCase();
    return !query || name.includes(query) || symbol.includes(query) || address.includes(query);
  });
  if (radarMode === 'volume') list.sort((a,b) => Number(b.volume?.h24 || 0) - Number(a.volume?.h24 || 0));
  else if (radarMode === 'gainers') list.sort((a,b) => Number(b.priceChange?.h1 || 0) - Number(a.priceChange?.h1 || 0));
  else list.sort((a,b) => (Number(b.boosts?.active || 0) * 1e12 + Number(b.volume?.h24 || 0) + Number(b.liquidity?.usd || 0)) - (Number(a.boosts?.active || 0) * 1e12 + Number(a.volume?.h24 || 0) + Number(a.liquidity?.usd || 0)));
  if (!list.length) {
    radarRows.innerHTML = '<tr><td colspan="6" class="radar-message">' + (radarTokens.length ? 'No tokens match that search.' : 'No live token data available right now. Try refreshing in a moment.') + '</td></tr>';
    return;
  }
  radarRows.innerHTML = list.slice(0,12).map(t => {
    const icon = t.info?.imageUrl || '';
    const name = t.baseToken?.name || 'Unknown token';
    const symbol = t.baseToken?.symbol || '—';
    const tokenAddress = t.baseToken?.address || '';
    const safeIcon = /^https:\/\//i.test(icon) ? icon : '';
    const fallback = '☣';
    const img = safeIcon ? '<span class="token-icon token-fallback" style="display:none">' + fallback + '</span><img class="token-icon" loading="lazy" src="' + safeIcon.replace(/"/g, '&quot;') + '" alt="" onerror="this.style.display=\'none\';if(this.previousElementSibling)this.previousElementSibling.style.display=\'inline-flex\'">' : '<span class="token-icon token-fallback">' + fallback + '</span>';
    return '<tr><td><div class="token-cell">' + img + '<div><span class="token-name" title="' + name.replace(/"/g,'&quot;') + '">' + name.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</span><span class="token-symbol">' + symbol.replace(/</g,'&lt;').replace(/>/g,'&gt;') + (t.boosts?.isBoosted ? ' · ⚡ ' + (radarJapaneseUI ? 'ブースト済み' : 'BOOSTED') : '') + '</span></div></div></td><td class="token-price">' + price(t.priceUsd) + '</td><td>' + pct(t.priceChange?.h1) + '</td><td>' + money(t.volume?.h24) + '</td><td>' + money(t.liquidity?.usd) + '</td><td><a class="pair-link" href="' + (t.url || 'https://dexscreener.com/solana') + '" target="_blank" rel="noopener noreferrer">' + (radarJapaneseUI ? '表示 ↗' : 'VIEW ↗') + '</a></td></tr>';
  }).join('');
}
async function loadRadar(force = false) {
  if (radarBusy) return;
  if (!force && lastRadarSuccess && Date.now() - lastRadarSuccess < 55000) return;
  radarBusy = true;
  if (radarStatus) radarStatus.textContent = radarJapaneseUI ? 'Solanaをスキャン中' : 'SCANNING SOLANA';
  if (radarRefresh) { radarRefresh.disabled = true; radarRefresh.textContent = radarJapaneseUI ? '↻ スキャン中' : '↻ SCANNING'; }
  try {
    const response = await fetch('https://zombcash-bot.fadehost.app/api/radar', {cache:'no-store'});
    if (!response.ok) throw new Error('Radar API returned HTTP ' + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.pairs)) throw new Error(payload.error || 'Radar API returned an invalid response');
    radarTokens = payload.pairs;
    if (!radarTokens.length) throw new Error('No detailed Solana pairs returned');
    lastRadarSuccess = Date.now();
    renderRadar();
    const sourceUpdatedAt = Number(payload.updatedAt || 0) * 1000;
    const sourceTime = sourceUpdatedAt ? new Date(sourceUpdatedAt).toLocaleTimeString(radarJapaneseUI ? 'ja-JP' : 'en-US', {hour:'2-digit',minute:'2-digit'}) : (radarJapaneseUI ? '不明' : 'UNKNOWN');
    if (payload.stale) {
      if (radarStatus) radarStatus.textContent = radarJapaneseUI ? '古いデータ — 再試行中' : 'STALE DATA — RETRYING';
      if (radarUpdated) radarUpdated.textContent = (radarJapaneseUI ? '最終ソース更新 ' : 'LAST SOURCE UPDATE ') + sourceTime;
    } else {
      if (radarStatus) radarStatus.textContent = radarJapaneseUI ? 'レーダー稼働中' : 'RADAR ONLINE';
      if (radarUpdated) radarUpdated.textContent = (radarJapaneseUI ? 'ソース更新 ' : 'SOURCE UPDATED ') + sourceTime;
    }
  } catch (error) {
    console.warn('ZombieCash Radar update failed:', error);
    if (!radarTokens.length && radarRows) radarRows.innerHTML = '<tr><td colspan="6" class="radar-message">' + (radarJapaneseUI ? 'レーダー信号を利用できません。接続を確認するか、しばらくして更新してください。<br><small>データはDexScreenerから提供されます。一時的なAPI制限やブラウザーの制限で停止することがあります。</small>' : 'RADAR SIGNAL UNAVAILABLE. Check your connection or refresh shortly. <br><small>Data is supplied by DexScreener; temporary API limits or browser restrictions can interrupt the feed.</small>') + '</td></tr>';
    if (radarStatus) radarStatus.textContent = radarTokens.length ? (radarJapaneseUI ? '前回のシグナルを表示中' : 'SHOWING LAST SIGNAL') : (radarJapaneseUI ? 'シグナルが中断されました' : 'SIGNAL INTERRUPTED');
    if (radarUpdated && !lastRadarSuccess) radarUpdated.textContent = radarJapaneseUI ? '再試行できます' : 'RETRY AVAILABLE';
  } finally {
    radarBusy = false;
    if (radarRefresh) { radarRefresh.disabled = false; radarRefresh.textContent = radarJapaneseUI ? '↻ 更新' : '↻ REFRESH'; }
  }
}
radarFilters.forEach(button => button.addEventListener('click', () => {
  radarMode = button.dataset.filter || 'hot';
  radarFilters.forEach(item => item.classList.toggle('active', item === button));
  renderRadar();
}));
radarSearch?.addEventListener('input', renderRadar);
radarRefresh?.addEventListener('click', () => loadRadar(true));
if (radarRows) {
  loadRadar(true);
  setInterval(() => loadRadar(true), 45000);
}


// ZombieCash project token market card, served by the shared FadeHost API.
const zomMarket = document.getElementById('zombcash-market');
if (zomMarket) {
  const zomPrice = document.getElementById('zombcash-price');
  const zomChange = document.getElementById('zombcash-change');
  const zomVolume = document.getElementById('zombcash-volume');
  const zomLiquidity = document.getElementById('zombcash-liquidity');
  const zomCap = document.getElementById('zombcash-cap');
  const zomStatus = document.getElementById('zombcash-market-status');
  const zomUpdated = document.getElementById('zombcash-market-updated');
  const zomRefresh = document.getElementById('zombcash-market-refresh');
  let zomBusy = false;
  const zomMoney = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
  };
  const zomPriceText = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n >= 1) return '$' + n.toLocaleString('en-US', {maximumFractionDigits: 5});
    if (n >= .01) return '$' + n.toFixed(5);
    if (n >= .0001) return '$' + n.toFixed(7);
    return '$' + n.toPrecision(4);
  };
  async function loadZomMarket() {
    if (zomBusy) return;
    zomBusy = true;
    if (zomStatus) zomStatus.textContent = 'SCANNING TOKEN…';
    if (zomRefresh) zomRefresh.disabled = true;
    try {
      const response = await fetch('https://zombcash-bot.fadehost.app/api/zombcash', {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      zomPrice.textContent = zomPriceText(data.priceUsd);
      const changeValue = data.priceChange?.h24;
      const change = changeValue == null ? NaN : Number(changeValue);
      zomChange.textContent = Number.isFinite(change) ? (change > 0 ? '+' : '') + change.toFixed(2) + '%' : '—';
      zomChange.className = Number.isFinite(change) && change > 0 ? 'change-up' : Number.isFinite(change) && change < 0 ? 'change-down' : '';
      zomVolume.textContent = data.volume?.h24 == null ? '—' : zomMoney(data.volume.h24);
      zomLiquidity.textContent = zomMoney(data.liquidity?.usd);
      zomCap.textContent = zomMoney(data.marketCap || data.fdv);
      const sourceTime = Number(data.updatedAt || 0) * 1000;
      if (zomStatus) zomStatus.textContent = data.stale ? 'LAST KNOWN DATA' : (data.activityAvailable === false ? 'PRICE AVAILABLE · ACTIVITY UNAVAILABLE' : 'TOKEN FEED ONLINE');
      if (zomUpdated) zomUpdated.textContent = (data.stale ? 'LAST SOURCE UPDATE ' : 'SOURCE UPDATED ') + (sourceTime ? new Date(sourceTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : 'UNKNOWN');
    } catch (error) {
      console.warn('ZombieCash token market update failed:', error);
      if (zomStatus) zomStatus.textContent = 'SIGNAL UNAVAILABLE';
      if (zomUpdated) zomUpdated.textContent = 'TRY REFRESHING SHORTLY';
    } finally {
      zomBusy = false;
      if (zomRefresh) zomRefresh.disabled = false;
    }
  }
  zomRefresh?.addEventListener('click', loadZomMarket);
  loadZomMarket();
  setInterval(loadZomMarket, 45000);
}


// Living World: shared RSS news, live token alarms, daily missions and community events.
(() => {
  const missionJapaneseUI = document.documentElement.lang === 'ja';
  const apiBase = 'https://zombcash-bot.fadehost.app';
  const newsList = document.getElementById('world-news-list');
  const newsStatus = document.getElementById('world-news-status');
  const newsUpdated = document.getElementById('world-news-updated');
  const alertList = document.getElementById('world-alert-list');
  const alertStatus = document.getElementById('world-alarm-status');
  const missionList = document.getElementById('world-missions');
  const missionCount = document.getElementById('world-mission-count');
  const missionDate = document.getElementById('world-mission-date');
  if (!missionList) return;

  const safeDate = value => {
    const parsed = Date.parse(value || '');
    if (!Number.isFinite(parsed)) return 'LATEST';
    const age = Math.max(0, Date.now() - parsed);
    if (age < 3600000) return Math.max(1, Math.round(age / 60000)) + ' MIN AGO';
    if (age < 86400000) return Math.round(age / 3600000) + ' H AGO';
    return new Date(parsed).toLocaleDateString('en-US', {month:'short',day:'numeric'});
  };
  const makeNode = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  if (!document.getElementById('zombcash-enriched-news-styles')) {
    const style = document.createElement('style');
    style.id = 'zombcash-enriched-news-styles';
    style.textContent = `
      .world-news-item.is-enriched{display:flex;flex-direction:column;gap:9px}
      .world-news-image{display:block;width:100%;max-height:210px;object-fit:cover;border:1px solid #344b2d;background:#080d0a}
      .world-news-kind{display:inline-flex;align-self:flex-start;border:1px solid #567d36;padding:4px 7px;color:#a4ff43;font:700 8px Orbitron,sans-serif;letter-spacing:1px}
      .world-news-commentary{display:block;margin:2px 0 0;padding:10px 12px;border-left:2px solid #9bff45;background:linear-gradient(90deg,#9bff450d,transparent);color:#c9d7c2;font:500 13px/1.55 Rajdhani,sans-serif}
      .world-news-commentary b{display:block;margin-bottom:5px;color:#a4ff43;font:700 8px Orbitron,sans-serif;letter-spacing:1px}
      .world-news-telegram{display:inline-block;margin-top:2px;color:#9bff45;font:700 8px Orbitron,sans-serif;letter-spacing:.7px}
    `;
    document.head.append(style);
  }

  async function loadWorldNews() {
    if (newsStatus) newsStatus.textContent = 'SYNCING RSS';
    try {
      const response = await fetch(apiBase + '/api/news', {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const articles = Array.isArray(data.articles) ? data.articles : [];
      if (!articles.length) throw new Error('No articles in RSS response');
      newsList.replaceChildren();
      articles.slice(0, 7).forEach(article => {
        const link = document.createElement('a');
        link.className = 'world-news-item' + (article.enriched ? ' is-enriched' : '');
        link.href = /^https?:\/\//i.test(article.link || '') ? article.link : '#living-world';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        if (article.enriched && article.imageUrl) {
          const image = makeNode('img', 'world-news-image');
          image.src = /^https?:\/\//i.test(article.imageUrl) ? article.imageUrl : apiBase + article.imageUrl;
          image.alt = 'ZombieCash editorial illustration for ' + (article.title || 'news');
          image.loading = 'lazy';
          image.referrerPolicy = 'no-referrer';
          link.append(image);
        }
        if (article.enriched) link.append(makeNode('span', 'world-news-kind', '☣ ZOMBIECASH ORIGINAL'));
        const meta = makeNode('span', 'world-news-meta');
        meta.append(makeNode('span', '', article.enriched ? 'ZOMBIECASH NEWS' : (article.source || 'RSS TRANSMISSION')));
        meta.append(makeNode('time', '', safeDate(article.published)));
        link.append(meta, makeNode('strong', 'world-news-title', article.title || 'Untitled transmission'));
        if (article.summary) link.append(makeNode('p', 'world-news-summary', article.summary));
        if (article.commentary) {
          const commentary = makeNode('div', 'world-news-commentary');
          commentary.append(makeNode('b', '', '🧟 ZOMBIE COMMENTARY'));
          commentary.append(makeNode('span', '', article.commentary));
          link.append(commentary);
        }
        newsList.append(link);
      });
      if (newsStatus) newsStatus.textContent = data.stale ? 'LAST KNOWN FEED' : (Number(data.enrichedCount || 0) > 0 ? 'ZOMBIECASH NEWS ONLINE' : 'RSS FEED ONLINE');
      if (newsUpdated) newsUpdated.textContent = 'UPDATED ' + new Date(Number(data.updatedAt || Date.now()/1000)*1000).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    } catch (error) {
      console.warn('Living World RSS unavailable:', error);
      if (newsStatus) newsStatus.textContent = 'SIGNAL INTERRUPTED';
      if (!newsList.querySelector('.world-news-item')) {
        newsList.replaceChildren(makeNode('p', 'world-empty', 'The RSS frequencies are quiet right now. The feed will retry automatically.'));
      }
      if (newsUpdated) newsUpdated.textContent = 'RETRYING AUTOMATICALLY';
    }
  }

  function renderAlarms(market, error) {
    if (!alertList) return;
    const alerts = [];
    if (error || !market) {
      alerts.push({level:'warn', icon:'⚠', title:'MARKET CONNECTION', message:'Could not confirm the latest $ZOMBCASH snapshot. The API will retry.', badge:'RETRYING'});
    } else {
      const change = Number(market.priceChange?.h24);
      const volume = Number(market.volume?.h24);
      if (market.stale) alerts.push({level:'warn', icon:'⚠', title:'STALE MARKET SNAPSHOT', message:'The source could not refresh; showing the last known data.', badge:'STALE'});
      if (Number.isFinite(change) && change >= 10) alerts.push({level:'warn', icon:'↗', title:'PRICE SURGE WATCH', message:'$ZOMBCASH is up ' + change.toFixed(2) + '% over 24h. Check liquidity and volatility before acting.', badge:'VOLATILE'});
      else if (Number.isFinite(change) && change <= -10) alerts.push({level:'danger', icon:'↘', title:'DOWNSIDE ALERT', message:'$ZOMBCASH is down ' + Math.abs(change).toFixed(2) + '% over 24h. Review market conditions carefully.', badge:'HIGH VOLATILITY'});
      if (Number.isFinite(volume) && volume >= 10000) alerts.push({level:'', icon:'◉', title:'VOLUME ACTIVITY', message:'24h trading volume has reached ' + '$' + volume.toLocaleString('en-US',{maximumFractionDigits:0}) + '.', badge:'OBSERVE'});
      if (!alerts.length) alerts.push({level:'', icon:'◉', title:'NO CRITICAL PRICE ALERTS', message:'No ±10% 24h move detected in the latest snapshot. Stay curious, not careless.', badge:'MONITORING'});
      alerts.push({level:'', icon:'⌁', title:'SOLANA RADAR', message:'Use the live radar to inspect other boosted tokens and compare liquidity.', badge:'LIVE'});
    }
    alertList.replaceChildren();
    alerts.forEach(alert => {
      const row = makeNode('div', 'world-alert' + (alert.level ? ' alert-' + alert.level : ''));
      row.append(makeNode('span', 'alert-icon', alert.icon));
      const body = makeNode('div', '');
      body.append(makeNode('strong', '', alert.title), makeNode('p', '', alert.message));
      row.append(body, makeNode('span', 'alert-level', alert.badge));
      alertList.append(row);
    });
    if (alertStatus) alertStatus.textContent = error ? 'CONNECTION ISSUE' : (market?.stale ? 'STALE DATA' : 'MONITORING');
  }

  async function loadMarketAlarms() {
    try {
      const response = await fetch(apiBase + '/api/zombcash', {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      renderAlarms(await response.json(), false);
    } catch (error) {
      console.warn('Living World market alarms unavailable:', error);
      renderAlarms(null, true);
    }
  }

  const missionSets = [
    [
      [missionJapaneseUI ? '感染状況をスキャン' : 'Scan the outbreak', missionJapaneseUI ? 'Solanaのライブレーダーを開き、トークンを1つ確認する。' : 'Open the live Solana radar and inspect one token.', '#living-world', missionJapaneseUI ? 'レーダーを開く ↗' : 'OPEN RADAR ↗'],
      [missionJapaneseUI ? 'シグナルを確認' : 'Check the signal', missionJapaneseUI ? '$ZOMBCASHの値動きと市場活動を確認する。' : 'Review $ZOMBCASH movement and market activity.', '#community-console', missionJapaneseUI ? '市場を確認 ↗' : 'CHECK MARKET ↗'],
      [missionJapaneseUI ? 'クルーに報告' : 'Report to the crew', missionJapaneseUI ? 'Telegramコミュニティを訪れ、有益な考えを共有する。' : 'Visit the Telegram community and share one useful thought.', 'https://t.me/ZombieCashCTO', missionJapaneseUI ? 'クルーに参加 ↗' : 'JOIN THE CREW ↗']
    ],
    [
      [missionJapaneseUI ? '通信を読む' : 'Read a transmission', missionJapaneseUI ? 'ライブニュースフィードの記事を1件開く。' : 'Open one story in the live news feed.', '#living-world', missionJapaneseUI ? 'ニュースを読む ↗' : 'READ NEWS ↗'],
      [missionJapaneseUI ? 'トークンを比較' : 'Compare survivors', missionJapaneseUI ? 'レーダーにある2つのトークンの取引量と流動性を比較する。' : 'Compare volume and liquidity for two radar tokens.', '#living-world', missionJapaneseUI ? 'トークンを比較 ↗' : 'COMPARE TOKENS ↗'],
      [missionJapaneseUI ? 'コミュニティに参加' : 'Join the resistance', missionJapaneseUI ? 'Telegramでプロジェクトの最新の議論を確認する。' : 'Check the latest project discussion in Telegram.', 'https://t.me/ZombieCashCTO', missionJapaneseUI ? 'コミュニティを開く ↗' : 'OPEN COMMUNITY ↗']
    ],
    [
      [missionJapaneseUI ? '市場を調査' : 'Inspect the market', missionJapaneseUI ? '$ZOMBCASHの最新市場スナップショットを確認する。' : 'Review the latest $ZOMBCASH market snapshot.', '#community-console', missionJapaneseUI ? '市場を見る ↗' : 'VIEW MARKET ↗'],
      [missionJapaneseUI ? '新しいシグナルを探す' : 'Find a new signal', missionJapaneseUI ? 'まだ見たことのないトークンをレーダーで探す。' : 'Explore the radar for a token you have not seen before.', '#living-world', missionJapaneseUI ? 'レーダーを探索 ↗' : 'EXPLORE RADAR ↗'],
      [missionJapaneseUI ? 'シグナルを広める' : 'Spread the signal', missionJapaneseUI ? 'ZombieCashのホームページを仲間に共有する。' : 'Share the ZombieCash homepage with another survivor.', 'https://t.me/ZOMBCASH', missionJapaneseUI ? 'チャンネルを開く ↗' : 'OPEN CHANNEL ↗']
    ]
  ];
  const dayKey = new Date().toISOString().slice(0,10);
  const missions = missionSets[Math.floor(Date.now()/86400000) % missionSets.length];
  const storageKey = 'zombcash-world-missions-' + dayKey;
  let done = [];
  try { done = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (_) { done = []; }
  if (!Array.isArray(done)) done = [];

  function renderMissions() {
    missionList.replaceChildren();
    missions.forEach((mission, index) => {
      const label = makeNode('label', 'world-mission' + (done.includes(index) ? ' done' : ''));
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = done.includes(index);
      checkbox.addEventListener('change', () => {
        done = checkbox.checked ? [...new Set([...done, index])] : done.filter(item => item !== index);
        try { localStorage.setItem(storageKey, JSON.stringify(done)); } catch (_) {}
        renderMissions();
      });
      const copy = makeNode('span', 'world-mission-copy');
      copy.append(makeNode('strong', '', mission[0]), makeNode('p', '', mission[1]));
      if (mission[2]) {
        const action = makeNode('a', 'world-mission-action', mission[3] || 'OPEN ↗');
        action.href = mission[2];
        if (/^https:\/\//i.test(mission[2])) { action.target = '_blank'; action.rel = 'noopener noreferrer'; }
        action.addEventListener('click', event => event.stopPropagation());
        copy.append(action);
      }
      label.append(checkbox, copy);
      missionList.append(label);
    });
    if (missionCount) missionCount.textContent = Math.min(done.length, missions.length) + ' / ' + missions.length + ' DONE';
    if (missionDate) missionDate.textContent = 'DAILY RESET · ' + dayKey;
  }
  document.getElementById('world-reset-missions')?.addEventListener('click', () => {
    done = [];
    try { localStorage.removeItem(storageKey); } catch (_) {}
    renderMissions();
  });

  renderMissions();
  loadWorldNews();
  setInterval(loadWorldNews, 300000);
})();


// Community features: DexScreener trade counts, shared daily voting and survival leaderboard.
(() => {
  const activityJapaneseUI = document.documentElement.lang === 'ja';
  const apiBase = 'https://zombcash-bot.fadehost.app';
  const getEl = (id) => document.getElementById(id);
  const activityStatus = getEl('activity-status');
  const activityBuys = getEl('activity-buys');
  const activitySells = getEl('activity-sells');
  const activityRatio = getEl('activity-ratio');
  const activityBar = getEl('activity-buy-bar');
  const activityNote = getEl('activity-note');
  const voteOptionsEl = getEl('daily-vote-options');
  const voteStatus = getEl('vote-status');
  const voteTotal = getEl('vote-total');
  const voteDate = getEl('vote-date');
  const leaderboardEl = getEl('survival-leaderboard');
  const leaderboardStatus = getEl('leaderboard-status');
  const submitScoreButton = getEl('submit-survival-score');
  const submitScoreStatus = getEl('score-submit-status');
  let activityData = null;
  let activityPeriod = 'h1';
  let voteData = null;
  let chosenVote = null;
  let voteBusy = false;

  let voterId = '';
  try {
    voterId = localStorage.getItem('zombcash-community-id') || '';
    if (!/^[a-f0-9-]{16,80}$/.test(voterId)) {
      voterId = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(16) + '-' + Math.random().toString(16).slice(2) + '-' + Math.random().toString(16).slice(2))).toLowerCase();
      localStorage.setItem('zombcash-community-id', voterId);
    }
  } catch (_) {
    voterId = (Date.now().toString(16) + '-' + Math.random().toString(16).slice(2) + '-' + Math.random().toString(16).slice(2)).toLowerCase();
  }

  const prettyCount = (n) => Number(n || 0).toLocaleString('en-US');
  function renderActivity() {
    if (!activityData) return;
    const buys = Number(activityData.buys?.[activityPeriod] || 0);
    const sells = Number(activityData.sells?.[activityPeriod] || 0);
    const total = buys + sells;
    if (activityBuys) activityBuys.textContent = prettyCount(buys);
    if (activitySells) activitySells.textContent = prettyCount(sells);
    if (activityRatio) activityRatio.textContent = sells ? (buys / sells).toFixed(2) + '×' : (buys ? '∞' : '—');
    if (activityBar) activityBar.style.width = (total ? Math.round(buys / total * 100) : 0) + '%';
    if (activityNote) activityNote.textContent = total
      ? 'DexScreener reports ' + prettyCount(total) + ' transactions in this period. Counts are transactions, not unique buyers or wallets.'
      : 'No transactions reported for this period in the latest DexScreener snapshot.';
  }
  async function loadActivity() {
    try {
      const response = await fetch(apiBase + '/api/activity', {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      activityData = await response.json();
      renderActivity();
      if (activityStatus) activityStatus.textContent = 'DEXSCREENER LIVE';
    } catch (error) {
      if (activityStatus) activityStatus.textContent = 'SIGNAL OFFLINE';
      if (activityNote) activityNote.textContent = 'Live trade counts are temporarily unavailable. They will retry automatically.';
    }
  }
  document.querySelectorAll('.activity-tab').forEach(button => button.addEventListener('click', () => {
    activityPeriod = button.dataset.period || 'h1';
    document.querySelectorAll('.activity-tab').forEach(tab => tab.classList.toggle('active', tab === button));
    renderActivity();
  }));

  const pollLabels = {
    meme: 'More ZombieCash memes',
    raid: 'Community raid mission',
    game: 'New survival game challenge'
  };
  function renderVote(data, alreadyVoted = false) {
    voteData = data;
    if (!voteOptionsEl || !data) return;
    const total = Number(data.total || 0);
    const previousVote = chosenVote || data.yourVote || null;
    voteOptionsEl.replaceChildren();
    Object.entries(pollLabels).forEach(([key, label]) => {
      const count = Number(data.votes?.[key] || 0);
      const percent = total ? Math.round(count / total * 100) : 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'daily-vote-option' + (previousVote === key ? ' selected' : '');
      button.disabled = alreadyVoted || voteBusy;
      const bar = document.createElement('span');
      bar.className = 'vote-result-bar';
      bar.style.width = percent + '%';
      const radio = document.createElement('span');
      radio.className = 'vote-radio';
      const title = document.createElement('span');
      title.className = 'vote-option-label';
      title.textContent = label;
      const result = document.createElement('span');
      result.className = 'vote-percent';
      result.textContent = total ? percent + '% · ' + count : 'VOTE';
      button.append(bar, radio, title, result);
      button.addEventListener('click', () => castVote(key));
      voteOptionsEl.append(button);
    });
    if (voteTotal) voteTotal.textContent = prettyCount(total) + (total === 1 ? ' VOTE' : ' VOTES');
    if (voteDate) voteDate.textContent = 'UTC · ' + (data.date || new Date().toISOString().slice(0,10));
    if (voteStatus) voteStatus.textContent = alreadyVoted ? 'VOTE RECORDED' : 'OPEN POLL';
  }
  async function loadVote() {
    try {
      const response = await fetch(apiBase + '/api/vote', {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      let alreadyVoted = false;
      try { alreadyVoted = localStorage.getItem('zombcash-voted-' + data.date) === 'yes'; } catch (_) {}
      renderVote(data, alreadyVoted);
    } catch (error) {
      if (voteStatus) voteStatus.textContent = 'POLL OFFLINE';
      if (voteOptionsEl) voteOptionsEl.innerHTML = '<p class="crew-note">The community poll is temporarily unavailable. Please try again shortly.</p>';
    }
  }
  async function castVote(option) {
    if (voteBusy) return;
    voteBusy = true;
    chosenVote = option;
    if (voteStatus) voteStatus.textContent = 'SENDING VOTE…';
    try {
      const response = await fetch(apiBase + '/api/vote', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({option, voter:voterId})
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.error || 'Vote failed');
      if (data.date) {
        try { localStorage.setItem('zombcash-voted-' + data.date, 'yes'); } catch (_) {}
      }
      renderVote(data, true);
      if (voteStatus && response.status === 409) voteStatus.textContent = 'ALREADY VOTED';
    } catch (error) {
      if (voteStatus) voteStatus.textContent = 'VOTE FAILED';
      if (voteOptionsEl) {
        const notice = document.createElement('p');
        notice.className = 'crew-note';
        notice.textContent = 'Could not save your vote: ' + error.message;
        voteOptionsEl.append(notice);
      }
    } finally { voteBusy = false; }
  }

  function renderLeaderboard(data) {
    if (!leaderboardEl) return;
    leaderboardEl.replaceChildren();
    const scores=Array.isArray(data.scores)?data.scores:[];
    if(!scores.length){const empty=document.createElement('p');empty.className='crew-note';empty.textContent='No records yet. Defend the base and claim the first spot.';leaderboardEl.append(empty);}
    else scores.slice(0,10).forEach((item,index)=>{const row=document.createElement('div');row.className='survivor-row';const rank=document.createElement('span');rank.className='survivor-rank';rank.textContent='#'+(index+1);const name=document.createElement('span');name.className='survivor-name';name.textContent=item.name||'Survivor';const date=document.createElement('small');date.className='survivor-date';date.textContent=item.date?'RECORD · '+item.date:'COMMUNITY RECORD';name.append(date);const points=document.createElement('strong');points.className='survivor-time';points.textContent=Number(item.points||0).toLocaleString('en-US')+' PTS';row.append(rank,name,points);leaderboardEl.append(row);});
    if(leaderboardStatus)leaderboardStatus.textContent='TOP 10';
  }
  async function loadLeaderboard(){try{const response=await fetch(apiBase+'/api/survival-scores',{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);renderLeaderboard(await response.json());}catch(_){if(leaderboardStatus)leaderboardStatus.textContent='OFFLINE';if(leaderboardEl)leaderboardEl.innerHTML='<p class="crew-note">Leaderboard is temporarily unavailable.</p>';}}
  submitScoreButton?.addEventListener('click',async()=>{const points=Number(window.lastSurvivalPoints);if(!Number.isFinite(points)||points<10||points>100000){if(submitScoreStatus)submitScoreStatus.textContent='Score at least 10 points before saving.';return;}submitScoreButton.disabled=true;if(submitScoreStatus)submitScoreStatus.textContent='Submitting your record…';try{const response=await fetch(apiBase+'/api/survival-scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:getEl('survivor-name')?.value||'Survivor',points,voter:voterId})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save record');if(submitScoreStatus)submitScoreStatus.textContent='Record saved! Survival leaderboard updated.';renderLeaderboard(data);}catch(error){if(submitScoreStatus)submitScoreStatus.textContent=error.message;submitScoreButton.disabled=false;}});



  const chartEl = document.getElementById('activity-price-chart');
  const chartStatus = document.getElementById('activity-chart-status');
  const chartCurrent = document.getElementById('activity-chart-current');
  const chartStart = document.getElementById('activity-chart-start');
  const chartEnd = document.getElementById('activity-chart-end');
  const tradesEl = document.getElementById('recent-trades-list');
  let chartPeriod = '24h';
  function money(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n < 0.000001) return '$' + n.toExponential(2);
    if (n < 0.001) return '$' + n.toFixed(10);
    if (n < 1) return '$' + n.toFixed(8);
    if (n < 1000) return '$' + n.toFixed(6);
    return '$' + n.toLocaleString('en-US', {maximumFractionDigits: 4});
  }
  function chartMessage(message) {
    if (!chartEl) return;
    chartEl.replaceChildren();
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    node.setAttribute('x','360'); node.setAttribute('y','95');
    node.setAttribute('text-anchor','middle'); node.setAttribute('fill','#91a18d');
    node.setAttribute('font-size','12'); node.textContent = message; chartEl.append(node);
  }
  function renderPriceChart(data) {
    if (!chartEl) return;
    const points = Array.isArray(data && data.points) ? data.points.filter(p => Number(p.time)>0 && Number(p.price)>0) : [];
    chartEl.replaceChildren();
    if (points.length < 2) {
      if (chartStatus) chartStatus.textContent = activityJapaneseUI ? '価格履歴を利用できません' : 'PRICE HISTORY UNAVAILABLE';
      chartMessage(activityJapaneseUI ? '価格履歴は一時的に利用できません' : 'Price history is temporarily unavailable'); return;
    }
    const W=720,H=190,pad=12, vals=points.map(p=>Number(p.price));
    const min=Math.min(...vals), max=Math.max(...vals), span=(max-min)||Math.max(max*.02,1e-12);
    const pts=points.map((p,i)=>({x:pad+i*(W-pad*2)/(points.length-1),y:H-pad-((Number(p.price)-min)/span)*(H-pad*2)}));
    for(let k=1;k<=3;k++){const g=document.createElementNS('http://www.w3.org/2000/svg','line');g.setAttribute('x1','0');g.setAttribute('x2',String(W));g.setAttribute('y1',String(k*H/4));g.setAttribute('y2',String(k*H/4));g.setAttribute('stroke','#9bff45');g.setAttribute('stroke-opacity','.12');chartEl.append(g);}
    const area=document.createElementNS('http://www.w3.org/2000/svg','path');
    area.setAttribute('d','M '+pts[0].x+' '+H+' L '+pts.map(p=>p.x+' '+p.y).join(' L ')+' L '+pts[pts.length-1].x+' '+H+' Z');
    area.setAttribute('fill','#9bff45');area.setAttribute('fill-opacity','.09');chartEl.append(area);
    const line=document.createElementNS('http://www.w3.org/2000/svg','path');
    line.setAttribute('d',pts.map((p,i)=>(i?'L':'M')+' '+p.x+' '+p.y).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#9bff45');line.setAttribute('stroke-width','2.5');line.setAttribute('stroke-linejoin','round');chartEl.append(line);
    const last=pts[pts.length-1],dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',String(last.x));dot.setAttribute('cy',String(last.y));dot.setAttribute('r','4');dot.setAttribute('fill','#d9ffb0');dot.setAttribute('stroke','#9bff45');dot.setAttribute('stroke-width','2');chartEl.append(dot);
    if(chartStatus)chartStatus.textContent=(data.source||(activityJapaneseUI?'価格データ':'PRICE FEED'))+(data.stale?(activityJapaneseUI?' · キャッシュ':' · CACHED'):'')+' · '+points.length+(activityJapaneseUI?'ポイント':' POINTS');
    if(chartCurrent)chartCurrent.textContent=money(points[points.length-1].price);
    const fmt=t=>new Date(Number(t)*1000).toLocaleDateString(activityJapaneseUI?'ja-JP':'en-US',{month:'short',day:'numeric',hour:chartPeriod==='24h'?'2-digit':undefined,minute:chartPeriod==='24h'?'2-digit':undefined});
    if(chartStart)chartStart.textContent=fmt(points[0].time);if(chartEnd)chartEnd.textContent=fmt(points[points.length-1].time);
  }
  async function loadPriceChart() {
    if(!chartEl)return;if(chartStatus)chartStatus.textContent=activityJapaneseUI?'価格履歴を読み込み中…':'LOADING PRICE HISTORY…';
    try {const response=await fetch(apiBase+'/api/price-history?period='+encodeURIComponent(chartPeriod),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('HTTP '+response.status);renderPriceChart(await response.json());}
    catch(error){chartMessage(activityJapaneseUI?'価格履歴の取得に失敗しました':'Price history request failed');if(chartStatus)chartStatus.textContent=(activityJapaneseUI?'APIエラー · ':'API ERROR · ')+String(error&&error.message||'REQUEST FAILED').slice(0,45);}
  }
  document.querySelectorAll('.activity-chart-tab').forEach(button=>button.addEventListener('click',()=>{chartPeriod=button.dataset.chartPeriod||'24h';document.querySelectorAll('.activity-chart-tab').forEach(tab=>tab.classList.toggle('active',tab===button));loadPriceChart();}));
  async function loadRecentTrades() {
    if(!tradesEl)return;
    try {
      const response=await fetch(apiBase+'/api/recent-trades',{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json(), trades=Array.isArray(data.trades)?data.trades:[];
      tradesEl.replaceChildren();
      if(!trades.length){const empty=document.createElement('p');empty.className='recent-trade-empty';empty.textContent=activityJapaneseUI?'現在、最近の取引データはありません。':'No recent transactions are available right now.';tradesEl.append(empty);return;}
      trades.slice(0,8).forEach(trade=>{
        const row=document.createElement('div');row.className='recent-trade-row';
        const type=String(trade.type||'trade').toLowerCase(),side=document.createElement('span');
        side.className='recent-trade-side '+(type==='buy'?'buy':type==='sell'?'sell':'');side.textContent=type==='buy'?(activityJapaneseUI?'買い':'BUY'):type==='sell'?(activityJapaneseUI?'売り':'SELL'):(activityJapaneseUI?'取引':'TRADE');
        const main=document.createElement('div');main.className='recent-trade-main';const hash=String(trade.txHash||'');
        const link=document.createElement('a');link.href='https://solscan.io/tx/'+encodeURIComponent(hash);link.target='_blank';link.rel='noopener noreferrer';link.textContent=hash?hash.slice(0,7)+'…'+hash.slice(-6):'Transaction';
        const meta=document.createElement('small'),when=Number(trade.timestamp||0),wallet=String(trade.wallet||'');
        meta.textContent=(when?new Date(when*1000).toLocaleString(activityJapaneseUI?'ja-JP':undefined):(activityJapaneseUI?'時刻不明':'Time unavailable'))+(wallet?' · '+wallet.slice(0,4)+'…'+wallet.slice(-4):'');main.append(link,meta);
        const value=document.createElement('strong');value.className='recent-trade-value';value.textContent=money(trade.usd);row.append(side,main,value);tradesEl.append(row);
      });
    } catch(error){const notice=document.createElement('p');notice.className='recent-trade-empty';notice.textContent=(activityJapaneseUI?'取引APIエラー：':'Transaction API error: ')+String(error&&error.message||'request failed').slice(0,70);tradesEl.replaceChildren(notice);}
  }

  loadActivity();
  loadPriceChart();
  loadRecentTrades();
  loadVote();
  loadLeaderboard();
  setInterval(loadActivity, 60000);
  setInterval(loadPriceChart, 120000);
  setInterval(loadRecentTrades, 60000);
  setInterval(loadVote, 60000);
  setInterval(loadLeaderboard, 60000);
})();


/* Four-game community leaderboard dialog */
(() => {
 const api='https://zombcash-bot.fadehost.app';
 const dialog=document.getElementById('all-leaderboards-dialog');
 const open=document.getElementById('open-all-leaderboards');
 const close=document.getElementById('close-all-leaderboards');
 const list=document.getElementById('all-leaderboards-list');
 const caption=document.getElementById('all-leaderboards-caption');
 if(!dialog||!open||!close||!list)return;
 const labels={snake:'Zombie Snake',breaker:'Zombie Breaker',maze:'Zombie Maze',wall:'Undead Wall'};
 const esc=(value)=>String(value??'Survivor').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 async function load(game){
  document.querySelectorAll('[data-leaderboard-game]').forEach(b=>{const active=b.dataset.leaderboardGame===game;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
  caption.textContent=labels[game]+' · Top 10 records';list.textContent='Loading records…';
  try{
   const url=game==='snake'?api+'/api/survival-scores':api+'/api/arcade-scores?game='+encodeURIComponent(game);
   const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);
   const data=await response.json();const scores=Array.isArray(data.scores)?data.scores:[];list.replaceChildren();
   if(!scores.length){list.textContent='No records yet. Play '+labels[game]+' and claim the first spot.';return;}
   scores.slice(0,10).forEach((item,i)=>{const row=document.createElement('div');row.className='survivor-row';const rank=document.createElement('span');rank.className='survivor-rank';rank.textContent='#'+(i+1);const name=document.createElement('span');name.className='survivor-name';name.textContent=item.name||'Survivor';const date=document.createElement('small');date.className='survivor-date';date.textContent=item.date?'RECORD · '+item.date:'COMMUNITY RECORD';name.append(date);const points=document.createElement('strong');points.className='survivor-points';points.textContent=Number(item.points||0).toLocaleString('en-US')+' PTS';row.append(rank,name,points);list.append(row);});
  }catch(e){list.textContent='Records are temporarily unavailable. Please try again shortly.';}
 }
 open.addEventListener('click',()=>{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');load('snake');});
 close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 document.querySelectorAll('[data-leaderboard-game]').forEach(b=>b.addEventListener('click',()=>load(b.dataset.leaderboardGame)));
})();

/* Anonymous visitor statistics display.
   shared-nav.js owns the site-wide visitor heartbeat; this widget is read-only. */
(() => {
  if (new URLSearchParams(window.location.search).get('arcadeSnake') === '1') return;
  const apiBase = 'https://zombcash-bot.fadehost.app';
  const totalEl = document.getElementById('visits-total');
  const todayEl = document.getElementById('visits-today');
  const onlineEl = document.getElementById('visits-online');
  const updatedEl = document.getElementById('visits-updated');
  if (!totalEl || !todayEl || !updatedEl) return;

  const render = data => {
    if (Number.isFinite(Number(data.total))) totalEl.textContent = Number(data.total).toLocaleString();
    if (Number.isFinite(Number(data.today))) todayEl.textContent = Number(data.today).toLocaleString();
    if (onlineEl && Number.isFinite(Number(data.online))) onlineEl.textContent = Number(data.online).toLocaleString();
    updatedEl.textContent = 'UTC DAY · UPDATED ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  };
  const refreshVisits = async () => {
    try {
      const response = await fetch(apiBase + '/api/visits', {cache:'no-store'});
      if (!response.ok) throw new Error('Visit counter unavailable');
      render(await response.json());
    } catch (_) {
      updatedEl.textContent = 'VISITOR STATS TEMPORARILY OFFLINE';
    }
  };
  refreshVisits();
  setInterval(refreshVisits, 15000);
})();



// Dedicated swap help dialog: keep instructions out of the main layout until requested.
(() => {
  const dialog = document.getElementById('swap-help-dialog');
  const openButton = document.getElementById('swap-help-open');
  const closeButton = document.getElementById('swap-help-close');
  if (!dialog || !openButton) return;
  openButton.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  closeButton?.addEventListener('click', () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog && typeof dialog.close === 'function') dialog.close();
  });
})();

/* Live system status: use real API responses and never display fabricated market data. */
(() => {
  if (new URLSearchParams(window.location.search).get('arcadeSnake') === '1') return;
  const apiBase = 'https://zombcash-bot.fadehost.app';
  const byId = id => document.getElementById(id);
  const setService = (name, state) => {
    const label = byId('service-' + name);
    const dot = byId('service-' + name + '-dot');
    if (label) label.textContent = state;
    if (dot) {
      dot.className = state === 'ONLINE' ? 'is-online' : state === 'OFFLINE' ? 'is-offline' : 'is-unknown';
      dot.setAttribute('aria-label', state);
    }
  };
  const compact = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
  };
  const setText = (id, value) => {
    const node = byId(id);
    if (node) node.textContent = value;
  };
  async function refreshStatus() {
    const checks = await Promise.allSettled([
      fetch(apiBase + '/health', {cache:'no-store'}).then(r => {
        if (!r.ok) throw new Error('Health HTTP ' + r.status);
        return r.json();
      }),
      fetch(apiBase + '/api/zombcash', {cache:'no-store'}).then(r => {
        if (!r.ok) throw new Error('Market HTTP ' + r.status);
        return r.json();
      }),
      fetch(apiBase + '/api/activity', {cache:'no-store'}).then(r => {
        if (!r.ok) throw new Error('Activity HTTP ' + r.status);
        return r.json();
      }),
      fetch(apiBase + '/api/visits', {cache:'no-store'}).then(r => {
        if (!r.ok) throw new Error('Visits HTTP ' + r.status);
        return r.json();
      })
    ]);
    const apiOk = checks[0].status === 'fulfilled' && checks[0].value && checks[0].value.ok !== false;
    const marketOk = checks[1].status === 'fulfilled' && Number(checks[1].value?.priceUsd) > 0;
    const activityOk = checks[2].status === 'fulfilled';
    const visitsOk = checks[3].status === 'fulfilled';
    setService('api', apiOk ? 'ONLINE' : 'OFFLINE');
    setService('market', marketOk ? 'ONLINE' : 'OFFLINE');
    setService('community', activityOk || visitsOk ? 'ONLINE' : 'OFFLINE');

    if (marketOk) {
      const data = checks[1].value;
      const change = Number(data.priceChange?.h24);
      const swing = Number.isFinite(change) ? Math.min(100, Math.abs(change)) : null;
      setText('chaos-value', swing === null ? '—' : (change > 0 ? '+' : '') + change.toFixed(2) + '%');
      const fill = byId('meter-fill');
      if (fill) fill.style.width = (swing === null ? 0 : swing) + '%';
      const meter = fill?.closest('.meter');
      if (meter) meter.setAttribute('aria-valuenow', String(swing === null ? 0 : Math.round(swing)));
      setText('outbreak-volume', compact(data.volume?.h24));
      setText('status-meter-note', data.stale ? 'LAST KNOWN MARKET DATA' : 'LIVE DEXSCREENER MARKET DATA');
    } else {
      setText('chaos-value', '—');
      setText('outbreak-volume', '—');
      setText('status-meter-note', 'MARKET DATA TEMPORARILY UNAVAILABLE');
      const fill = byId('meter-fill');
      if (fill) fill.style.width = '0%';
    }
    if (visitsOk) {
      const visits = checks[3].value || {};
      const today = visits.today ?? visits.todayVisitors ?? visits.uniqueToday ?? visits.visitsToday;
      setText('outbreak-visits-today', Number.isFinite(Number(today)) ? Number(today).toLocaleString('en-US') : '—');
    } else setText('outbreak-visits-today', '—');

    if (apiOk && marketOk) {
      setText('outbreak-status', 'SYSTEMS OPERATIONAL');
      setText('outbreak-message', 'Market data is responding. Community services are checked independently below.');
    } else if (apiOk) {
      setText('outbreak-status', 'PARTIAL SIGNAL');
      setText('outbreak-message', 'The API is reachable, but market data is temporarily unavailable.');
    } else {
      setText('outbreak-status', 'SIGNAL INTERRUPTED');
      setText('outbreak-message', 'Live status could not be verified. The page will retry automatically.');
    }
  }
  refreshStatus();
  setInterval(refreshStatus, 60000);
})();


/* Zombie Radar Picks: consume the existing shared /api/radar feed.
   Time controls mirror bot-supported periods m5, h1 and h24. */
(() => {
  const japaneseUI = document.documentElement.lang === 'ja';
  const apiBase = 'https://zombcash-bot.fadehost.app';
  const panel = document.querySelector('.zombie-radar-ai-panel');
  const list = document.getElementById('zombie-radar-ai-list');
  const state = document.getElementById('zombie-radar-ai-state');
  const updated = document.getElementById('zombie-radar-ai-updated');
  const periodNote = document.getElementById('zombie-radar-ai-period-note');
  const refreshButton = document.getElementById('zombie-radar-ai-refresh');
  if (!panel || !list || !state || !refreshButton) return;

  const periods = {
    m5: {label:japaneseUI ? '直近5分' : 'last 5 minutes'},
    h1: {label:japaneseUI ? '直近1時間' : 'last hour'},
    h24: {label:japaneseUI ? '直近24時間' : 'last 24 hours'}
  };
  let activePeriod = 'm5';
  let requestId = 0;
  let lastPayload = null;
  let lastSuccessAt = 0;

  const setText = (node, value) => { if (node) node.textContent = value; };
  const number = value => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const compactMoney = value => {
    const n = number(value);
    return n === null ? '—' : '$' + n.toLocaleString('en-US', {notation:'compact', maximumFractionDigits:1});
  };
  const percent = value => {
    const n = number(value);
    return n === null ? '—' : (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  };
  const safeHttpUrl = value => {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  };
  const shortAddress = value => value ? value.slice(0, 5) + '…' + value.slice(-5) : '';
  const setState = (label, mode) => {
    setText(state, label);
    state.dataset.state = mode || 'neutral';
  };
  function setMessage(message, kind) {
    list.replaceChildren();
    const box = document.createElement('div');
    box.className = 'zrai-message' + (kind ? ' is-' + kind : '');
    box.textContent = message;
    list.append(box);
  }
  function createMetric(label, value, mood) {
    const item = document.createElement('span');
    item.className = 'zrai-metric' + (mood ? ' ' + mood : '');
    const key = document.createElement('small');
    key.textContent = label;
    const val = document.createElement('strong');
    val.textContent = value;
    item.append(key, val);
    return item;
  }
  function tokenMetrics(pair) {
    const changes = pair.priceChange || {};
    const volumes = pair.volume || {};
    const transactions = pair.txns || {};
    const change = number(changes[activePeriod]);
    const volume = number(volumes[activePeriod]);
    const flow = transactions[activePeriod] || {};
    const buys = number(flow.buys);
    const sells = number(flow.sells);
    const trades = (buys === null ? 0 : buys) + (sells === null ? 0 : sells);
    const liquidity = number(pair.liquidity && pair.liquidity.usd);
    const hasTrades = buys !== null || sells !== null;
    const buyRatio = trades ? (buys || 0) / trades : 0.5;
    const momentum = change === null ? 0 : (Math.max(-50, Math.min(change, 100)) + 50) / 150;
    // Transparent signal score from actual API fields; not a private Gemini result.
    const score = Math.max(0, Math.min(100,
      42 * Math.min(1, Math.log10(Math.max(volume || 0, 1)) / 6) +
      28 * Math.min(1, Math.log10(Math.max(liquidity || 0, 1)) / 6) +
      20 * momentum + 10 * buyRatio
    ));
    return {change, volume, buys, sells, trades, liquidity, hasTrades, score};
  }
  function rankPairs(payload) {
    const bestByAddress = new Map();
    (Array.isArray(payload.pairs) ? payload.pairs : []).forEach(pair => {
      if (!pair || pair.chainId !== 'solana') return;
      const address = String((pair.baseToken || {}).address || '').trim();
      if (!address) return;
      const liquidity = Number((pair.liquidity || {}).usd || 0);
      const previous = bestByAddress.get(address);
      if (!previous || liquidity > Number((previous.liquidity || {}).usd || 0)) bestByAddress.set(address, pair);
    });
    return Array.from(bestByAddress.values())
      .map(pair => ({pair, metrics:tokenMetrics(pair)}))
      .filter(({pair, metrics}) => {
        const price = number(pair.priceUsd);
        return price !== null && price > 0 && metrics.change !== null &&
          (metrics.volume !== null || metrics.hasTrades);
      })
      .sort((a, b) => b.metrics.score - a.metrics.score ||
        (b.metrics.volume || 0) - (a.metrics.volume || 0) ||
        b.metrics.trades - a.metrics.trades)
      .slice(0, 5);
  }
  function render(payload) {
    const ranked = rankPairs(payload).slice(0, 5);
    list.replaceChildren();
    if (!ranked.length) {
      setMessage('No tokens with enough market data for this period. Refresh or try another horizon.', 'empty');
      setState('NO PICKS', 'empty');
      return;
    }
    ranked.forEach(({pair, metrics}, index) => {
      const base = pair.baseToken || {};
      const address = String(base.address || '');
      const symbol = String(base.symbol || 'TOKEN').slice(0, 24);
      const name = String(base.name || symbol).slice(0, 64);
      const dexUrl = safeHttpUrl(pair.url) || 'https://dexscreener.com/solana/' + encodeURIComponent(address);
      const card = document.createElement('article');
      card.className = 'zrai-pick';
      const rank = document.createElement('span');
      rank.className = 'zrai-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const body = document.createElement('div');
      body.className = 'zrai-pick-body';
      const heading = document.createElement('div');
      heading.className = 'zrai-pick-heading';
      const identity = document.createElement('div');
      identity.className = 'zrai-token-identity';
      const logo = document.createElement('span');
      logo.className = 'zrai-coin-icon';
      logo.setAttribute('aria-hidden', 'true');
      logo.textContent = symbol.replace(/^\$+/, '').slice(0, 2).toUpperCase();
      const imageUrl = safeHttpUrl(base.imageUrl || base.icon || pair.info && pair.info.imageUrl);
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => { img.remove(); logo.classList.remove('has-image'); };
        logo.textContent = '';
        logo.classList.add('has-image');
        logo.append(img);
      }
      const nameWrap = document.createElement('div');
      nameWrap.className = 'zrai-token-name';
      const tokenSymbol = document.createElement('strong');
      tokenSymbol.textContent = '$' + symbol.replace(/^\$+/, '');
      const tokenName = document.createElement('span');
      tokenName.textContent = name;
      tokenName.title = name;
      nameWrap.append(tokenSymbol, tokenName);
      identity.append(logo, nameWrap);
      const score = document.createElement('span');
      score.className = 'zrai-score';
      score.textContent = Math.round(metrics.score) + ' SIGNAL';
      heading.append(identity, score);

      const metricsLine = document.createElement('div');
      metricsLine.className = 'zrai-metrics';
      metricsLine.append(
        createMetric(japaneseUI ? '変動' : 'CHANGE', percent(metrics.change), metrics.change > 0 ? 'positive' : metrics.change < 0 ? 'negative' : ''),
        createMetric(japaneseUI ? '取引量' : 'VOLUME', compactMoney(metrics.volume)),
        createMetric(japaneseUI ? '流動性' : 'LIQUIDITY', compactMoney(metrics.liquidity))
      );
      const signal = document.createElement('div');
      signal.className = 'zrai-signal-line';
      signal.textContent = metrics.hasTrades
        ? (japaneseUI ? '買い ' : 'BUY ') + (metrics.buys === null ? '—' : metrics.buys.toLocaleString()) +
          (japaneseUI ? ' · 売り ' : ' · SELL ') + (metrics.sells === null ? '—' : metrics.sells.toLocaleString()) +
          ' · ' + (metrics.trades ? (japaneseUI ? '取引 ' : 'TRADES ') + metrics.trades.toLocaleString() : (japaneseUI ? '取引なし' : 'NO TRADES'))
        : (japaneseUI ? '取引フローのシグナルを利用できません' : 'TRADE-FLOW SIGNAL UNAVAILABLE');
      const addressLink = document.createElement('a');
      addressLink.className = 'zrai-address';
      addressLink.href = 'https://solscan.io/token/' + encodeURIComponent(address);
      addressLink.target = '_blank';
      addressLink.rel = 'noopener noreferrer';
      addressLink.textContent = shortAddress(address) + ' ↗';
      addressLink.title = address;
      body.append(heading, metricsLine, signal, addressLink);

      const view = document.createElement('a');
      view.className = 'zrai-open';
      view.href = dexUrl;
      view.target = '_blank';
      view.rel = 'noopener noreferrer';
      view.textContent = japaneseUI ? '表示' : 'VIEW';
      view.setAttribute('aria-label', 'View ' + symbol + ' on DexScreener');
      card.append(rank, body, view);
      list.append(card);
    });
    if (ranked.length < 5) {
      const filler = document.createElement('div');
      filler.className = 'zrai-radar-note';
      const icon = document.createElement('span');
      icon.className = 'zrai-radar-note-icon';
      icon.textContent = '✳';
      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = ranked.length + (japaneseUI ? '件の確認済み候補' : ' VERIFIED PICKS');
      const detail = document.createElement('span');
      detail.textContent = japaneseUI ? 'レーダーには選択した期間の実データがあるトークンのみ表示されます。別の期間を選ぶか更新してください。' : 'Radar only shows tokens with real data for this time horizon. Try another interval or refresh to discover more.';
      copy.append(title, detail);
      filler.append(icon, copy);
      list.append(filler);
    }
    setState(payload.stale ? (japaneseUI ? '古いデータ' : 'STALE FEED') : (japaneseUI ? 'レーダー稼働中' : 'RADAR ONLINE'), payload.stale ? 'stale' : 'online');
  }
  async function load(showLoading) {
    const currentRequest = ++requestId;
    refreshButton.disabled = true;
    refreshButton.classList.add('is-loading');
    setText(refreshButton, japaneseUI ? '↻ スキャン中' : '↻ SCANNING');
    setState(japaneseUI ? 'スキャン中' : 'SCANNING', 'loading');
    if (!lastPayload || showLoading) setMessage(japaneseUI ? '共有Zombie Radarフィードを取得中…' : 'Fetching the shared Zombie Radar feed…', 'loading');
    try {
      const response = await fetch(apiBase + '/api/radar', {
        cache: 'no-store',
        signal: AbortSignal.timeout(18000)
      });
      if (!response.ok) throw new Error('Radar API HTTP ' + response.status);
      const payload = await response.json();
      if (currentRequest !== requestId) return;
      if (!Array.isArray(payload.pairs) || payload.error) throw new Error(payload.error || 'Invalid radar response');
      lastPayload = payload;
      lastSuccessAt = Date.now();
      render(payload);
      const timestamp = number(payload.updatedAt);
      setText(updated, (japaneseUI ? 'ソース更新 ' : 'SOURCE UPDATED ') + (timestamp ? new Date(timestamp * 1000).toLocaleTimeString(japaneseUI ? 'ja-JP' : 'en-US',{hour:'2-digit',minute:'2-digit'}) : (japaneseUI ? '時刻不明' : 'TIME UNKNOWN')));
      if (payload.stale) setText(updated, japaneseUI ? 'ソースデータが古くなっています' : 'SOURCE SNAPSHOT IS STALE');
    } catch (error) {
      if (currentRequest !== requestId) return;
      console.warn('Zombie Radar feed request failed:', error);
      setState(lastPayload ? (japaneseUI ? '古いデータ' : 'STALE FEED') : (japaneseUI ? 'APIエラー' : 'API ERROR'), lastPayload ? 'stale' : 'error');
      if (!lastPayload) setMessage(japaneseUI ? 'レーダーフィードを利用できません。現在おすすめを表示していません。しばらくして再試行してください。' : 'Radar feed is unavailable. No recommendations are being shown; retry shortly.', 'error');
      else setMessage(japaneseUI ? '更新に失敗しました。以前のデータを保持し、古いデータとして表示しています。' : 'Refresh failed. Previous radar data is retained and marked stale.', 'error');
      setText(updated, lastPayload
        ? (japaneseUI ? '最終成功 ' : 'LAST SUCCESS ') + new Date(lastSuccessAt).toLocaleTimeString(japaneseUI ? 'ja-JP' : 'en-US',{hour:'2-digit',minute:'2-digit'})
        : (japaneseUI ? '取得成功なし' : 'NO SUCCESSFUL FETCH'));
    } finally {
      if (currentRequest === requestId) {
        refreshButton.disabled = false;
        refreshButton.classList.remove('is-loading');
        setText(refreshButton, japaneseUI ? '↻ 更新' : '↻ REFRESH');
      }
    }
  }
  document.querySelectorAll('[data-radar-period]').forEach(button => {
    button.addEventListener('click', () => {
      const period = button.dataset.radarPeriod;
      if (!periods[period] || period === activePeriod) return;
      activePeriod = period;
      document.querySelectorAll('[data-radar-period]').forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-pressed', String(active));
      });
      setText(periodNote, 'Momentum and activity · ' + periods[period].label);
      if (lastPayload) {
        render(lastPayload);
        if (lastPayload.stale) setState('STALE FEED', 'stale');
      } else load(true);
    });
  });
  refreshButton.addEventListener('click', () => load(true));
  load(false);
  setInterval(() => load(false), 60000);
})();
