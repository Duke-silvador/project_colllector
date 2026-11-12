// ==========================================================================
// BINAURAL LABS PRO - SOFTWARE PORTFOLIO DEMO (FRONT-END ONLY)
// Web Audio API DSP + Shaders WebGL OGL + Cache Offline IndexedDB
// ==========================================================================

// --------------------------------------------------------------------------
// 📱 DETECÇÃO DE AMBIENTE: ANDROID APK (FULLSCREEN) VS WEB (CONTAINER BOX)
// --------------------------------------------------------------------------
(function() {
  const isAndroidApk = !!window.AndroidBridge ||
                       (window.location.protocol === 'https:' && window.location.host === 'appassets.androidplatform.net') ||
                       (navigator.userAgent && navigator.userAgent.includes('BinauralProApp')) ||
                       (window.location.protocol === 'file:' && window.location.pathname.includes('/android_asset/'));
  window.isAndroidApk = isAndroidApk;
  if (isAndroidApk) {
    document.documentElement.classList.add('android-apk');
    if (document.body) {
      document.body.classList.add('android-apk');
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.classList.add('android-apk'));
    }
  } else {
    document.documentElement.classList.add('web-env');
    if (document.body) {
      document.body.classList.add('web-env');
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.classList.add('web-env'));
    }
  }
})();

// --------------------------------------------------------------------------
// 🚀 GALAXY HARDWARE ENGINE & BACKGROUND ZERO-GLITCH AUDIO OPTIMIZER
// Suspende completamente renderizações pesadas, DOM e timers ao entrar em segundo plano
// --------------------------------------------------------------------------
(function() {
  let _isVisualsSuspended = false;

  window.isVisualsSuspended = function() {
    return _isVisualsSuspended;
  };

  window._binauralSuspendHandler = function(suspend) {
    _isVisualsSuspended = !!suspend;

    if (_isVisualsSuspended) {
      // 1. Pausa timers de rotação de backgrounds e vídeos
      if (typeof window.pauseBackgroundEngine === 'function') {
        window.pauseBackgroundEngine();
      }
      // 2. Notifica o otimizador do visualizador para interromper o render loop imediatamente
      if (window.binauralOptimizer && typeof window.binauralOptimizer.setPowerSave === 'function') {
        window.binauralOptimizer.setPowerSave(true);
      }
    } else {
      // 1. Reativa timers de imagem/vídeo
      if (typeof window.resumeBackgroundEngine === 'function') {
        window.resumeBackgroundEngine();
      }
      // 2. Notifica o otimizador do visualizador para retomar o render loop
      if (window.binauralOptimizer && typeof window.binauralOptimizer.setPowerSave === 'function') {
        window.binauralOptimizer.setPowerSave(false);
      }
    }
  };

  window.suspendBinauralVisuals = function(suspend) {
    window._binauralSuspendHandler(suspend);
  };
})();

// --------------------------------------------------------------------------
// 0. CATÁLOGO LOCAL DE FAIXAS (AUDIOS HQ 320 KBPS & DEMO EDITION)
// --------------------------------------------------------------------------
const DEFAULT_TRACKS = [
  {
    id: "alpha-flow",
    title: "Alpha Flow Wave (10 Hz)",
    desc: "Ondas Alpha Estéreo 320 kbps • Foco Criativo, Estado de Flow & Clareza Mental",
    size: "6.9 MB",
    file: "audios/alpha-flow.mp3",
    order: 1
  },
  {
    id: "theta-meditation",
    title: "Theta Deep State (6 Hz)",
    desc: "Ondas Theta de Alta Fidelidade • Meditação Profunda, Relaxamento & Intuição",
    size: "6.9 MB",
    file: "audios/theta-meditation.mp3",
    order: 2
  },
  {
    id: "delta-sleep",
    title: "Delta Restorative (2.5 Hz)",
    desc: "Ondas Delta Puras • Sono Reparador, Relaxamento Neural & Repouso Profundo",
    size: "6.9 MB",
    file: "audios/delta-sleep.mp3",
    order: 3
  },
  {
    id: "gamma-focus",
    title: "Gamma Hyper-Focus (40 Hz)",
    desc: "Frequência Gamma 40Hz • Máxima Atenção, Processamento Cognitivo e Retenção",
    size: "6.9 MB",
    file: "audios/gamma-focus.mp3",
    order: 4
  },
  {
    id: "solfeggio-528hz",
    title: "Solfeggio Frequency (528 Hz)",
    desc: "Frequência dos Milagres & Transformação • Ressonância Harmônica Natural",
    size: "6.9 MB",
    file: "audios/solfeggio-528hz.mp3",
    order: 5
  },
  {
    id: "schumann-resonance",
    title: "Schumann Resonance (7.83 Hz)",
    desc: "Pulso Geoeletromagnético Terrestre • Sincronização Hemisférica & Equilíbrio",
    size: "6.9 MB",
    file: "audios/schumann-resonance.mp3",
    order: 6
  }
];

// --------------------------------------------------------------------------
// 2. GALERIAS DE BACKGROUNDS ESTÁTICAS E SHADERS WEBGL (DEMO EDITION)
// --------------------------------------------------------------------------
const GALLERIES = {
  soft: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80"
  ],
  red: [
    "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80"
  ],
  nature: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80"
  ],
  space: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=80"
  ]
};

const CINEMATIC_VIDEOS = [];

const GALLERIES_POOL = [
  "soft", "red", "nature", "space", "galaxybits", "softaurora", "particles", "ghostfibers", "plasmawave", "strands", "siderays", "beams", "floatinglines", "silk", "radar", "ripplegrid", "pixelblast", "magicrings", "gridscan", "liquidchrome", "linewaves", "ferrofluid", "dither", "darkveil", "webthreads", "topography", "balatro", "faultyterminal", "morphslider", "antigravity", "aurora", "letterglitch", "plasma", "liquidether", "orb", "prism", "prismaticburst", "lightning", "evileye", "lighttunnel", "ancidsquares", "moltenmetal"
];

const webglTypes = [
  "softaurora", "particles", "ghostfibers", "plasmawave", "strands", "siderays", "beams", "floatinglines", "silk", "radar", "ripplegrid", "pixelblast", "magicrings", "gridscan", "liquidchrome", "linewaves", "ferrofluid", "dither", "darkveil", "webthreads", "topography", "balatro", "faultyterminal", "morphslider", "antigravity", "aurora", "letterglitch", "plasma", "liquidether", "orb", "prism", "prismaticburst", "lightning", "evileye", "lighttunnel", "ancidsquares", "moltenmetal"
];

const VALID_BG_CATEGORIES = new Set(["random", "galaxybits", ...Object.keys(GALLERIES), ...webglTypes]);

function getRandomGalleryFromPool() {
  return GALLERIES_POOL[Math.floor(Math.random() * GALLERIES_POOL.length)];
}

// --------------------------------------------------------------------------
// 3. ESTADO GLOBAL DO SISTEMA
// --------------------------------------------------------------------------
let isUnlocked = false;
let wallpaperCategory = localStorage.getItem('binaural_wallpaper_category') || 'random';
if (wallpaperCategory === 'acidsquares') {
  wallpaperCategory = 'ancidsquares';
  try { localStorage.setItem('binaural_wallpaper_category', 'ancidsquares'); } catch(e) {}
} else if (!VALID_BG_CATEGORIES.has(wallpaperCategory)) {
  wallpaperCategory = 'random';
  try { localStorage.setItem('binaural_wallpaper_category', 'random'); } catch(e) {}
}
let currentBgIndex = 0;
let bgInterval = null;
let bgSpeed = parseInt(localStorage.getItem('binaural_speed')) || 10000;
let tracksData = [];

// Web Audio API State
let audioCtx = null;
let masterCompressorNode = null;
let masterGainNode = null;
let masterBoostNode = null;
let analyserNode = null;
let masterVolume = parseFloat(localStorage.getItem('binaural_master_volume'));
if (isNaN(masterVolume) || masterVolume < 0 || masterVolume > 1) masterVolume = 1.0;
let preMuteVolume = masterVolume > 0 ? masterVolume : 1.0;
let masterDuckFactor = 1.0;
let masterBoost = parseFloat(localStorage.getItem('binaural_master_boost'));
if (isNaN(masterBoost) || masterBoost < 1.0 || masterBoost > 4.0) masterBoost = 1.0;
let isMasterBoostEnabled = localStorage.getItem('binaural_master_boost_enabled') === 'true';
const audioSourcesMap = new Map();       // audioElement -> MediaElementAudioSourceNode
const trackVolumeNodesMap = new Map();   // trackId -> GainNode (Volume 0.0 - 1.0)
const trackBoostNodesMap = new Map();    // trackId -> GainNode (Booster 1.0 - 4.0)
const pendingBlobUrls = new Map();       // trackId -> cached blob URL aguardando pausa

// Fila de Downloads Locais / IndexedDB
let downloadQueue = [];
let isDownloadingQueue = false;

// Configuração do Limitador Master Anti-Distorção (Studio Brickwall Limiter)
// Preserva a pureza de ondas senoidais graves (40-120Hz) sem intermodulação ou chiado
const compressorConfig = {
  threshold: -0.1, // dB (Transparência acústica total para tons binaurais puros)
  knee: 4,         // dB (Curva linear de alta fidelidade)
  ratio: 12,       // Brickwall limiter para contenção de picos caso o booster seja acionado
  attack: 0.003,   // 3ms: Supressão instantânea sem ondulação cíclica
  release: 0.350   // 350ms: Recuperação transparente sem ruído de bombeamento
};

// Elementos do DOM estáticos
const loginScreen = document.getElementById('login-screen');
const appMain = document.getElementById('app-main');
const bgSlideshow = document.getElementById('bg-slideshow');
const bgLayerActive = document.getElementById('bg-layer-active');
const bgLayerNext = document.getElementById('bg-layer-next');

const statusTag = document.getElementById('status-tag');
const badgePlayingCount = document.getElementById('badge-playing-count');

const btnPlayAll = document.getElementById('btn-play-all');
const btnPauseAll = document.getElementById('btn-pause-all');

// ==============================================================================
// 🧠 SISTEMA DE MEMÓRIA DE REPRODUÇÃO BINAURAL (WEB & MOBILE APK)
// ==============================================================================
const PLAYBACK_MEMORY_KEY = 'binaural_playback_memory_v1';
const trackDesiredPlaying = new Map();   // trackId -> boolean (estado pretendido pelo usuário/sistema)
const trackPlayTokens = new Map();       // trackId -> contador monotônico por faixa
let globalStopEpoch = 0;
let batchResumeTokenCounter = 0;
let activeResumeBatchToken = 0;
let desiredAudioCtxRunning = false;
let audioCtxQueue = Promise.resolve();
let lastBridgeState = { playing: null, title: null, posSec: -1, durSec: null };

const PlaybackMemorySystem = {
  _tracks: [],

  init() {
    try {
      const stored = localStorage.getItem(PLAYBACK_MEMORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (tracksData && tracksData.length > 0) {
            this._tracks = parsed.filter(id => tracksData.some(t => t.id === id));
          } else {
            this._tracks = parsed;
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ [PlaybackMemory] Erro ao carregar memória:", e);
    }

    if ((!this._tracks || this._tracks.length === 0) && tracksData && tracksData.length > 0) {
      this._tracks = [tracksData[0].id];
    }
    this.updateUI();
  },

  getActiveTracks() {
    if (this._tracks && this._tracks.length > 0) {
      if (tracksData && tracksData.length > 0) {
        const valid = this._tracks.filter(id => tracksData.some(t => t.id === id));
        if (valid.length > 0) return [...valid];
      } else {
        return [...this._tracks];
      }
    }
    return (tracksData && tracksData.length > 0) ? [tracksData[0].id] : [];
  },

  saveActiveTracks(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    
    // Filtra IDs válidos existentes em tracksData se disponível
    const validIds = (tracksData && tracksData.length > 0)
      ? ids.filter(id => tracksData.some(t => t.id === id))
      : ids;
    if (validIds.length === 0) return;

    // Lista única preservando ordem
    const uniqueIds = Array.from(new Set(validIds));
    
    const hasChanged = uniqueIds.length !== this._tracks.length || 
      uniqueIds.some((id, idx) => id !== this._tracks[idx]);

    this._tracks = [...uniqueIds];

    try {
      localStorage.setItem(PLAYBACK_MEMORY_KEY, JSON.stringify(this._tracks));
    } catch (e) {
      console.warn("⚠️ [PlaybackMemory] Erro ao persistir memória:", e);
    }

    if (hasChanged) {
      console.log("🧠 [PlaybackMemory] Faixas ativas gravadas na memória:", this._tracks);
    }
    this.updateUI();
  },

  updateUI() {
    const memoryBadge = document.getElementById('badge-memory-count');
    const resumeBtn = document.getElementById('btn-play-all');
    const count = this.getActiveTracks().length;

    if (memoryBadge) {
      if (count > 0) {
        memoryBadge.style.display = 'inline-flex';
        memoryBadge.innerHTML = `<i class="fa-solid fa-brain" style="font-size: 10px; margin-right: 4px;"></i> Memória: ${count}`;
      } else {
        memoryBadge.style.display = 'none';
      }
    }

    if (resumeBtn) {
      resumeBtn.setAttribute('title', count > 0 
        ? `Retomar ${count} faixa(s) em memória (Resume)` 
        : 'Retomar Reprodução (Resume)');
    }
  }
};

const canvas = document.getElementById('master-visualizer');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

// --------------------------------------------------------------------------
// 4. CACHE OFFLINE INDEXEDDB (BinauralLabsOfflineDB)
// --------------------------------------------------------------------------
const DB_NAME = "BinauralLabsOfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "audio_blobs";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getCachedAudio(trackId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(trackId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function saveCachedAudio(trackId, blob) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, trackId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return false;
  }
}

// --------------------------------------------------------------------------
// 5. RENDERIZAÇÃO DAS FAIXAS ULTRA GLASSMORPHISM
// --------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTracks(tracks) {
  const container = document.getElementById('tracks-list');
  if (!container) return;
  container.innerHTML = "";
  
  // Ordenar determinísticamente pelo campo order
  const sortedTracks = [...tracks].sort((a, b) => (a.order || 99) - (b.order || 99));

  sortedTracks.forEach((track, index) => {
    const safeId = escapeHtml(String(track.id || '').replace(/[^a-zA-Z0-9_-]/g, ''));
    const safeTitle = escapeHtml(track.title);
    const safeDesc = escapeHtml(track.desc || track.description);
    const safeSize = escapeHtml(track.size || 'HQ');
    const safeFile = escapeHtml(track.file);

    const card = document.createElement('div');
    const isFeatured = track.order === 1;
    card.className = isFeatured ? "track-card glass-panel master-highlight-card" : "track-card glass-panel";
    card.id = `card-${safeId}`;
    card.setAttribute('data-track-id', safeId);
    card.style.setProperty('--card-idx', index);
    
    card.innerHTML = `
      <div class="track-main-info">
        <div class="track-visual-indicator">
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
          <div class="wave-bar"></div>
        </div>
        <div class="track-meta">
          <div class="track-title-wrapper">
            <h4>${safeTitle}</h4>
            ${isFeatured ? '<span class="badge-master-author"><i class="fa-solid fa-wand-magic-sparkles"></i> Demo Highlight</span>' : ''}
          </div>
          <p>${safeDesc}</p>
        </div>
        <button id="btn-toggle-${safeId}" class="btn-play-track" data-action="play" title="Reproduzir / Pausar">
          <i class="fa-solid fa-play"></i>
        </button>
      </div>
      <div class="track-controls">
        <!-- Controle de Volume -->
        <div class="control-row">
          <span class="label"><i class="fa-solid fa-volume-low"></i> Volume: <strong id="volume-val-${safeId}">100%</strong></span>
          <input type="range" id="volume-slider-${safeId}" min="0.0" max="1.0" step="0.05" value="1.0" class="styled-slider track-volume-slider">
        </div>

        <!-- Controle de Velocidade -->
        <div class="control-row">
          <span class="label"><i class="fa-solid fa-gauge-high"></i> Velocidade: <strong id="speed-val-${safeId}">1.0x</strong></span>
          <input type="range" id="speed-slider-${safeId}" min="0.5" max="5.0" step="0.1" value="1.0" class="styled-slider track-speed-slider">
        </div>
        
        <!-- Amplificador de Ganho Individual -->
        <div class="track-amplifier-circuit">
          <div class="track-amp-info">
            <div class="track-amp-label">
              <i class="fa-solid fa-bolt track-amp-icon"></i>
              <span>Amplificar Som Natural</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="btn-toggle-boost-${safeId}" class="track-boost-toggle">
              <span class="slider-round"></span>
            </label>
          </div>
          <div class="track-amp-slider-container disabled" id="amp-slider-wrapper-${safeId}">
            <span class="slider-label">Ganho Extra: <strong id="boost-val-${safeId}">1.0x</strong></span>
            <input type="range" id="boost-slider-${safeId}" min="1.0" max="4.0" step="0.1" value="1.0" class="styled-slider track-boost-slider" disabled>
          </div>
        </div>

        <!-- Caching e Download Direto no IndexedDB -->
        <div class="track-download-row">
          <button id="btn-download-${safeId}" class="btn-download-track">
            <i class="fa-solid fa-cloud-arrow-down"></i> <span id="download-text-${safeId}">Salvar Offline (${safeSize})</span>
          </button>
          <div class="download-progress-bar" id="download-progress-wrapper-${safeId}">
            <div class="download-progress-fill" id="download-progress-fill-${safeId}"></div>
          </div>
        </div>

        <div class="control-row-bottom">
          <label class="loop-toggle">
            <input type="checkbox" id="loop-${safeId}" checked>
            <span>Repetir faixa</span>
          </label>
          <div class="quick-speed-buttons">
            <button class="btn-quick-speed" data-target="speed-slider-${safeId}" data-value="1.0">1x</button>
            <button class="btn-quick-speed" data-target="speed-slider-${safeId}" data-value="2.0">2x</button>
            <button class="btn-quick-speed" data-target="speed-slider-${safeId}" data-value="3.0">3x</button>
            <button class="btn-quick-speed" data-target="speed-slider-${safeId}" data-value="5.0">5x</button>
          </div>
        </div>
      </div>
      <audio id="audio-${safeId}" src="${safeFile}" loop preload="metadata" crossorigin="anonymous"></audio>
    `;
    
    container.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// 6. MOTOR DE ÁUDIO WEB AUDIO API (VOLUME, BOOSTER E LIMITER)
// --------------------------------------------------------------------------
function nextTrackToken(trackId) {
  const next = (trackPlayTokens.get(trackId) || 0) + 1;
  trackPlayTokens.set(trackId, next);
  return next;
}

function syncAudioContextState(shouldRun) {
  desiredAudioCtxRunning = !!shouldRun;
  if (!audioCtx || audioCtx.state === 'closed') return audioCtxQueue;

  audioCtxQueue = audioCtxQueue.then(async () => {
    if (!audioCtx || audioCtx.state === 'closed') return;
    try {
      if (desiredAudioCtxRunning) {
        if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
          await audioCtx.resume();
        }
      } else {
        if (audioCtx.state === 'running') {
          await audioCtx.suspend();
        }
      }
    } catch (e) {
      console.warn("AudioContext state sync warning:", e);
    }
  });
  return audioCtxQueue;
}

function hasAnyActiveOrDesiredTracks() {
  for (const track of tracksData) {
    if (trackDesiredPlaying.get(track.id)) return true;
    const audio = document.getElementById(`audio-${track.id}`);
    if (audio && !audio.paused && !audio.ended) return true;
  }
  return false;
}

function applyPendingCachedSrcIfIdle(trackId, audio) {
  if (!audio || !audio.paused) return false;
  const queuedUrl = pendingBlobUrls.get(trackId);
  if (!queuedUrl) return false;
  pendingBlobUrls.delete(trackId);
  if (audio.src !== queuedUrl) {
    const prevTime = audio.currentTime || 0;
    const oldSrc = audio.src;
    audio.src = queuedUrl;
    if (oldSrc && oldSrc.startsWith('blob:')) {
      try { URL.revokeObjectURL(oldSrc); } catch (e) {}
    }
    if (prevTime > 0) {
      audio.addEventListener('loadedmetadata', () => {
        try {
          if (audio.duration && prevTime < audio.duration) {
            audio.currentTime = prevTime;
          }
        } catch (e) {}
      }, { once: true });
    }
  }
  return true;
}

function setOrQueueCachedAudioSrc(trackId, audio, blob) {
  if (!audio || !blob) return;
  const localBlobUrl = URL.createObjectURL(blob);
  if (!audio.paused || trackDesiredPlaying.get(trackId)) {
    const oldPending = pendingBlobUrls.get(trackId);
    if (oldPending && oldPending.startsWith('blob:')) {
      try { URL.revokeObjectURL(oldPending); } catch (e) {}
    }
    pendingBlobUrls.set(trackId, localBlobUrl);
  } else {
    const prevTime = audio.currentTime || 0;
    const oldSrc = audio.src;
    audio.src = localBlobUrl;
    if (oldSrc && oldSrc.startsWith('blob:')) {
      try { URL.revokeObjectURL(oldSrc); } catch (e) {}
    }
    if (prevTime > 0) {
      audio.addEventListener('loadedmetadata', () => {
        try {
          if (audio.duration && prevTime < audio.duration) {
            audio.currentTime = prevTime;
          }
        } catch (e) {}
      }, { once: true });
    }
  }
}

function initAudioEngine(shouldResume = false) {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    // LatencyHint 'playback' ativa buffer estendido de alta imunidade a throttling de CPU/Doze mode
    audioCtx = new AudioContextClass({
      latencyHint: 'playback',
      sampleRate: 48000
    });
    
    masterCompressorNode = audioCtx.createDynamicsCompressor();
    masterCompressorNode.threshold.setValueAtTime(compressorConfig.threshold, audioCtx.currentTime);
    masterCompressorNode.knee.setValueAtTime(compressorConfig.knee, audioCtx.currentTime);
    masterCompressorNode.ratio.setValueAtTime(compressorConfig.ratio, audioCtx.currentTime);
    masterCompressorNode.attack.setValueAtTime(compressorConfig.attack, audioCtx.currentTime);
    masterCompressorNode.release.setValueAtTime(compressorConfig.release, audioCtx.currentTime);
    
    // Circuito de Ganho Coletivo (Booster Master)
    masterBoostNode = audioCtx.createGain();
    const initialMasterBoost = isMasterBoostEnabled ? masterBoost : 1.0;
    masterBoostNode.gain.setValueAtTime(initialMasterBoost, audioCtx.currentTime);

    // Controle Geral de Saída de Áudio (Volume Master)
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(masterVolume * masterDuckFactor, audioCtx.currentTime);

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;
    
    // Roteamento direto de áudio (Audio Output direta, sem passar o sinal útil serialmente no analyser)
    masterBoostNode.connect(masterCompressorNode);
    masterCompressorNode.connect(masterGainNode);
    masterGainNode.connect(audioCtx.destination);
    masterGainNode.connect(analyserNode);

    // AnalyserNode mantido permanentemente conectado como tap passivo de alta impedância
    // Zero CPU quando getByteFrequencyData não é chamado (render loop pausado)
    window.disconnectAudioAnalyser = function() {};
    window.reconnectAudioAnalyser = function() {};
    
    drawVisualizer();
  }
  
  if (shouldResume) {
    syncAudioContextState(true);
  }
}

function connectTrackToWebAudio(trackId, audioElement) {
  initAudioEngine(false);
  
  if (!audioSourcesMap.has(audioElement)) {
    try {
      const sourceNode = audioCtx.createMediaElementSource(audioElement);
      const volumeNode = audioCtx.createGain();
      const boostNode = audioCtx.createGain();
      
      const volSlider = document.getElementById(`volume-slider-${trackId}`);
      const boostSlider = document.getElementById(`boost-slider-${trackId}`);
      const boostToggle = document.getElementById(`btn-toggle-boost-${trackId}`);

      const initialVol = volSlider ? parseFloat(volSlider.value) : 1.0;
      const initialBoost = (boostToggle && boostToggle.checked && boostSlider) ? parseFloat(boostSlider.value) : 1.0;

      volumeNode.gain.setValueAtTime(initialVol, audioCtx.currentTime);
      boostNode.gain.setValueAtTime(initialBoost, audioCtx.currentTime);
      
      sourceNode.connect(volumeNode);
      volumeNode.connect(boostNode);
      boostNode.connect(masterBoostNode);
      
      audioSourcesMap.set(audioElement, sourceNode);
      trackVolumeNodesMap.set(trackId, volumeNode);
      trackBoostNodesMap.set(trackId, boostNode);
    } catch (e) {
      console.warn("Web Audio API routing:", e);
    }
  }
}

function handleTrackStoppedState(trackId, playBtn, card) {
  trackDesiredPlaying.set(trackId, false);
  const volNode = trackVolumeNodesMap.get(trackId);
  if (volNode && audioCtx) {
    volNode.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  if (playBtn) {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playBtn.setAttribute('data-action', 'play');
  }
  if (card) card.classList.remove('playing');
  if (!hasAnyActiveOrDesiredTracks()) {
    syncAudioContextState(false);
  }
  if (activeResumeBatchToken === 0) {
    updateOverallStatus(true);
  }
}

function setupTrackEventListeners() {
  tracksData.forEach(track => {
    const trackId = track.id;
    const card = document.getElementById(`card-${trackId}`);
    const audio = document.getElementById(`audio-${trackId}`);
    const playBtn = document.getElementById(`btn-toggle-${trackId}`);
    const volumeSlider = document.getElementById(`volume-slider-${trackId}`);
    const volumeVal = document.getElementById(`volume-val-${trackId}`);
    const speedSlider = document.getElementById(`speed-slider-${trackId}`);
    const speedVal = document.getElementById(`speed-val-${trackId}`);
    const boostToggle = document.getElementById(`btn-toggle-boost-${trackId}`);
    const boostSlider = document.getElementById(`boost-slider-${trackId}`);
    const boostVal = document.getElementById(`boost-val-${trackId}`);
    const ampSliderWrapper = document.getElementById(`amp-slider-wrapper-${trackId}`);
    const loopToggle = document.getElementById(`loop-${trackId}`);
    const downloadBtn = document.getElementById(`btn-download-${trackId}`);

    if (playBtn && audio) {
      playBtn.addEventListener('click', () => {
        const isActiveOrPending = !audio.paused || !!trackDesiredPlaying.get(trackId);

        if (!isActiveOrPending) {
          connectTrackToWebAudio(trackId, audio);
          applyPendingCachedSrcIfIdle(trackId, audio);

          trackDesiredPlaying.set(trackId, true);
          const trackToken = nextTrackToken(trackId);
          syncAudioContextState(true);

          // Restaura volume individual no Web Audio
          const volSlider = document.getElementById(`volume-slider-${trackId}`);
          const trackVol = volSlider ? parseFloat(volSlider.value) : 1.0;
          const volNode = trackVolumeNodesMap.get(trackId);
          if (volNode && audioCtx) {
            volNode.gain.setValueAtTime(trackVol, audioCtx.currentTime);
          }

          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          playBtn.setAttribute('data-action', 'pause');
          if (card) card.classList.add('playing');

          audio.play().then(() => {
            if (!trackDesiredPlaying.get(trackId)) {
              try { audio.pause(); } catch (e) {}
              if (volNode && audioCtx) volNode.gain.setValueAtTime(0, audioCtx.currentTime);
              playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
              playBtn.setAttribute('data-action', 'play');
              if (card) card.classList.remove('playing');
              if (!hasAnyActiveOrDesiredTracks()) {
                syncAudioContextState(false);
              }
              return;
            }
            if (trackPlayTokens.get(trackId) !== trackToken) {
              return;
            }
            if (activeResumeBatchToken === 0) {
              updateOverallStatus(true);
            }
          }).catch(e => {
            console.error("Play error:", e);
            if (trackPlayTokens.get(trackId) === trackToken) {
              handleTrackStoppedState(trackId, playBtn, card);
            }
          });
        } else {
          // 🛑 PAUSA IMEDIATA E DETERMINÍSTICA DO TRACK
          trackDesiredPlaying.set(trackId, false);
          nextTrackToken(trackId);

          try { audio.pause(); } catch (e) {}

          const volNode = trackVolumeNodesMap.get(trackId);
          if (volNode && audioCtx) {
            volNode.gain.setValueAtTime(0, audioCtx.currentTime);
          }

          playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          playBtn.setAttribute('data-action', 'play');
          if (card) card.classList.remove('playing');

          if (!hasAnyActiveOrDesiredTracks()) {
            syncAudioContextState(false);
          }

          if (activeResumeBatchToken === 0) {
            updateOverallStatus(true);
          }
        }
      });
    }

    if (audio) {
      audio.addEventListener('play', () => {
        if (!trackDesiredPlaying.get(trackId)) {
          // Evento 'play' atrasado de uma promessa abortada após pause
          try { audio.pause(); } catch (e) {}
          const volNode = trackVolumeNodesMap.get(trackId);
          if (volNode && audioCtx) {
            volNode.gain.setValueAtTime(0, audioCtx.currentTime);
          }
          if (playBtn) {
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            playBtn.setAttribute('data-action', 'play');
          }
          if (card) card.classList.remove('playing');
          if (!hasAnyActiveOrDesiredTracks()) {
            syncAudioContextState(false);
          }
          return;
        }
        if (playBtn) {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          playBtn.setAttribute('data-action', 'pause');
        }
        if (card) card.classList.add('playing');
        if (activeResumeBatchToken === 0) updateOverallStatus(true);
      });
      audio.addEventListener('pause', () => {
        if (!audio.paused) return;
        handleTrackStoppedState(trackId, playBtn, card);
      });
      audio.addEventListener('ended', () => {
        handleTrackStoppedState(trackId, playBtn, card);
      });
      audio.addEventListener('error', () => {
        console.warn(`Audio error on ${trackId}`);
        nextTrackToken(trackId);
        handleTrackStoppedState(trackId, playBtn, card);
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (volumeVal) volumeVal.textContent = `${Math.round(val * 100)}%`;
        const volNode = trackVolumeNodesMap.get(trackId);
        if (volNode && audioCtx) {
          volNode.gain.setValueAtTime(val, audioCtx.currentTime);
        } else if (audio) {
          audio.volume = val * masterVolume;
        }
      });
    }

    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (speedVal) speedVal.textContent = `${val.toFixed(1)}x`;
        if (audio) audio.playbackRate = val;
        updateQuickSpeedButtons(trackId, val);
      });
    }

    if (boostToggle) {
      boostToggle.addEventListener('change', (e) => {
        connectTrackToWebAudio(trackId, audio);
        const isEnabled = e.target.checked;
        if (ampSliderWrapper) {
          if (isEnabled) {
            ampSliderWrapper.classList.remove('disabled');
            if (boostSlider) boostSlider.disabled = false;
          } else {
            ampSliderWrapper.classList.add('disabled');
            if (boostSlider) boostSlider.disabled = true;
          }
        }
        const boostNode = trackBoostNodesMap.get(trackId);
        if (boostNode && audioCtx) {
          const targetGain = isEnabled && boostSlider ? parseFloat(boostSlider.value) : 1.0;
          boostNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
        }
      });
    }

    if (boostSlider) {
      boostSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (boostVal) boostVal.textContent = `${val.toFixed(1)}x`;
        const boostNode = trackBoostNodesMap.get(trackId);
        if (boostNode && audioCtx && boostToggle && boostToggle.checked) {
          boostNode.gain.setValueAtTime(val, audioCtx.currentTime);
        }
      });
    }

    if (loopToggle && audio) {
      loopToggle.addEventListener('change', (e) => {
        audio.loop = e.target.checked;
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (!downloadBtn.classList.contains('cached') && !downloadBtn.classList.contains('downloading')) {
          queueSingleTrackDownload(track);
        }
      });
    }
  });

  // Botões de velocidade rápida
  document.querySelectorAll('.btn-quick-speed').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetSliderId = e.target.getAttribute('data-target');
      const targetVal = parseFloat(e.target.getAttribute('data-value'));
      const slider = document.getElementById(targetSliderId);
      if (slider) {
        slider.value = targetVal;
        slider.dispatchEvent(new Event('input'));
      }
    });
  });

  // Controles Master Unificados e Integrados ao Sistema de Memória & Barra Musical Android / Lockscreen
  window.pauseAllTracks = function(options = {}) {
    const silent = !!(options && options.silent);
    const preserveMemory = !(options && options.preserveMemory === false);

    // 0. Cancela qualquer lote em andamento e invalida promessas em voo
    activeResumeBatchToken = 0;
    globalStopEpoch++;

    // 1. Identificar todas as faixas ativas (ou em intenção de play) antes do pause para guardar na memória
    const activeBeforePause = [];
    tracksData.forEach(track => {
      const audio = document.getElementById(`audio-${track.id}`);
      if ((audio && !audio.paused && !audio.ended) || trackDesiredPlaying.get(track.id)) {
        activeBeforePause.push(track.id);
      }
      trackDesiredPlaying.set(track.id, false);
      nextTrackToken(track.id);
    });

    // 2. Se havia faixas ativas, salva o conjunto completo na memória
    if (preserveMemory && activeBeforePause.length > 0) {
      PlaybackMemorySystem.saveActiveTracks(activeBeforePause);
    }

    // 3. Silenciar imediatamente todos os nós de ganho do Web Audio API (corte de sinal instantâneo)
    trackVolumeNodesMap.forEach((volNode) => {
      try {
        if (volNode && audioCtx) {
          volNode.gain.setValueAtTime(0, audioCtx.currentTime);
        }
      } catch(e) {}
    });

    // 4. Pausar INCONDICIONALMENTE TODOS os elementos <audio> no documento
    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => {
      try {
        audio.pause();
      } catch (e) {
        console.warn("Audio pause error:", e);
      }
    });

    // 5. Resetar o estado visual dos cards e botões
    tracksData.forEach(track => {
      const playBtn = document.getElementById(`btn-toggle-${track.id}`);
      const card = document.getElementById(`card-${track.id}`);
      if (playBtn) {
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playBtn.setAttribute('data-action', 'play');
      }
      if (card) {
        card.classList.remove('playing');
      }
    });

    // 6. Suspender o AudioContext de forma serializada para cessar saída física de áudio
    syncAudioContextState(false);

    // 7. Atualizar telemetria e AndroidBridge (allowMemorySave = false preserva a lista salva)
    if (!silent) {
      updateOverallStatus(false);
      PlaybackMemorySystem.updateUI();
    }
  };

  window.resumeTracks = function(specificTrackIds = null) {
    const stopEpochAtStart = globalStopEpoch;
    const batchToken = ++batchResumeTokenCounter;
    activeResumeBatchToken = batchToken;

    initAudioEngine(false);
    syncAudioContextState(true);

    const toPlay = (specificTrackIds && specificTrackIds.length > 0)
      ? [...specificTrackIds]
      : PlaybackMemorySystem.getActiveTracks();

    console.log("▶️ [Binaural Pro] Retomando faixas da memória (Resume):", toPlay);

    if (!toPlay || toPlay.length === 0) {
      if (activeResumeBatchToken === batchToken) {
        activeResumeBatchToken = 0;
      }
      if (!hasAnyActiveOrDesiredTracks()) {
        syncAudioContextState(false);
      }
      updateOverallStatus(false);
      return;
    }

    // Preservar o lote alvo completo na memória
    PlaybackMemorySystem.saveActiveTracks(toPlay);

    const playPromises = [];

    toPlay.forEach(trackId => {
      const track = tracksData.find(t => t.id === trackId);
      if (!track) return;
      const audio = document.getElementById(`audio-${track.id}`);
      const playBtn = document.getElementById(`btn-toggle-${track.id}`);
      const card = document.getElementById(`card-${track.id}`);
      if (audio) {
        connectTrackToWebAudio(track.id, audio);
        applyPendingCachedSrcIfIdle(track.id, audio);

        trackDesiredPlaying.set(track.id, true);
        const trackToken = nextTrackToken(track.id);

        // Restaura volume individual no Web Audio
        const volSlider = document.getElementById(`volume-slider-${track.id}`);
        const trackVol = volSlider ? parseFloat(volSlider.value) : 1.0;
        const volNode = trackVolumeNodesMap.get(track.id);
        if (volNode && audioCtx) {
          volNode.gain.setValueAtTime(trackVol, audioCtx.currentTime);
        }

        if (playBtn) {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          playBtn.setAttribute('data-action', 'pause');
        }
        if (card) card.classList.add('playing');

        if (audio.paused) {
          const p = audio.play().then(() => {
            if (!trackDesiredPlaying.get(track.id)) {
              try { audio.pause(); } catch (e) {}
              if (volNode && audioCtx) volNode.gain.setValueAtTime(0, audioCtx.currentTime);
              if (playBtn) {
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                playBtn.setAttribute('data-action', 'play');
              }
              if (card) card.classList.remove('playing');
              return;
            }
            if (trackPlayTokens.get(track.id) !== trackToken) {
              return;
            }
          }).catch(e => {
            console.warn(`Play track error for ${track.id}:`, e);
            if (trackPlayTokens.get(track.id) === trackToken) {
              trackDesiredPlaying.set(track.id, false);
              if (playBtn) {
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                playBtn.setAttribute('data-action', 'play');
              }
              if (card) card.classList.remove('playing');
            }
          });
          playPromises.push(p);
        }
      }
    });

    Promise.allSettled(playPromises).finally(() => {
      if (activeResumeBatchToken === batchToken) {
        activeResumeBatchToken = 0;
      }
      if (!hasAnyActiveOrDesiredTracks()) {
        syncAudioContextState(false);
      }
      updateOverallStatus(globalStopEpoch === stopEpochAtStart);
      PlaybackMemorySystem.updateUI();
    });
  };

  // Alias para retrocompatibilidade
  window.playAllTracks = window.resumeTracks;

  window.handleMediaAction = function(action) {
    console.log("🎵 [Binaural Pro] Ação de Mídia recebida da Barra/Lockscreen:", action);

    if (action === 'duck_on') {
      masterDuckFactor = 0.25;
      if (masterGainNode && audioCtx) {
        const target = masterVolume * masterDuckFactor;
        if (audioCtx.state === 'suspended') {
          masterGainNode.gain.setValueAtTime(target, audioCtx.currentTime);
        } else {
          masterGainNode.gain.setTargetAtTime(target, audioCtx.currentTime, 0.02);
        }
      }
      return;
    }

    if (action === 'duck_off') {
      masterDuckFactor = 1.0;
      if (masterGainNode && audioCtx) {
        const target = masterVolume * masterDuckFactor;
        if (audioCtx.state === 'suspended') {
          masterGainNode.gain.setValueAtTime(target, audioCtx.currentTime);
        } else {
          masterGainNode.gain.setTargetAtTime(target, audioCtx.currentTime, 0.03);
        }
      }
      return;
    }

    // Força ressincronização de confirmação com o serviço nativo (ex.: libera WakeLock de pause)
    lastBridgeState.playing = null;

    let activeCount = 0;
    let activeTrackIndex = -1;
    tracksData.forEach((track, idx) => {
      const audio = document.getElementById(`audio-${track.id}`);
      if ((audio && !audio.paused && !audio.ended) || trackDesiredPlaying.get(track.id)) {
        activeCount++;
        if (activeTrackIndex === -1) activeTrackIndex = idx;
      }
    });

    if (action === 'pause' || action === 'stop') {
      window.pauseAllTracks();
    } else if (action === 'play') {
      window.resumeTracks();
    } else if (action === 'play_pause') {
      if (activeCount > 0) {
        window.pauseAllTracks();
      } else {
        window.resumeTracks();
      }
    } else if (action === 'next' && tracksData.length > 0) {
      if (activeTrackIndex === -1) {
        const mem = PlaybackMemorySystem.getActiveTracks();
        if (mem.length > 0) activeTrackIndex = tracksData.findIndex(t => t.id === mem[0]);
      }
      const nextIdx = (activeTrackIndex >= 0 ? activeTrackIndex + 1 : 0) % tracksData.length;
      window.pauseAllTracks({ silent: true, preserveMemory: false });
      window.resumeTracks([tracksData[nextIdx].id]);
    } else if (action === 'prev' && tracksData.length > 0) {
      if (activeTrackIndex === -1) {
        const mem = PlaybackMemorySystem.getActiveTracks();
        if (mem.length > 0) activeTrackIndex = tracksData.findIndex(t => t.id === mem[0]);
      }
      const prevIdx = activeTrackIndex > 0 ? activeTrackIndex - 1 : tracksData.length - 1;
      window.pauseAllTracks({ silent: true, preserveMemory: false });
      window.resumeTracks([tracksData[prevIdx].id]);
    }
  };

  window.killAllAudio = function() {
    activeResumeBatchToken = 0;
    globalStopEpoch++;
    try {
      tracksData.forEach(track => {
        trackDesiredPlaying.set(track.id, false);
        nextTrackToken(track.id);
      });
      trackVolumeNodesMap.forEach((volNode) => {
        try {
          if (volNode && audioCtx) volNode.gain.setValueAtTime(0, audioCtx.currentTime);
        } catch(e){}
      });
      document.querySelectorAll('audio').forEach(a => {
        try { a.pause(); a.currentTime = 0; } catch(e){}
      });
      syncAudioContextState(false);
      tracksData.forEach(track => {
        const playBtn = document.getElementById(`btn-toggle-${track.id}`);
        const card = document.getElementById(`card-${track.id}`);
        if (playBtn) {
          playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          playBtn.setAttribute('data-action', 'play');
        }
        if (card) card.classList.remove('playing');
      });
    } finally {
      updateOverallStatus(false, true);
      PlaybackMemorySystem.updateUI();
    }
  };

  window.handleMediaSeek = function(seconds) {
    console.log("🎵 [Binaural Pro] Busca na linha do tempo:", seconds);
    tracksData.forEach(track => {
      const audio = document.getElementById(`audio-${track.id}`);
      if (audio && !audio.paused) {
        try {
          if (!isNaN(seconds) && seconds >= 0) {
            audio.currentTime = Math.min(seconds, audio.duration || seconds);
          }
        } catch(e) {}
      }
    });
    updateOverallStatus(true, true);
  };

  if (btnPlayAll) {
    btnPlayAll.onclick = () => {
      window.resumeTracks();
    };
  }

  if (btnPauseAll) {
    btnPauseAll.onclick = () => {
      window.pauseAllTracks();
    };
  }
}

function updateQuickSpeedButtons(trackId, currentVal) {
  const quickBtns = document.querySelectorAll(`.btn-quick-speed[data-target="speed-slider-${trackId}"]`);
  quickBtns.forEach(btn => {
    const val = parseFloat(btn.getAttribute('data-value'));
    if (Math.abs(val - currentVal) < 0.05) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateOverallStatus(allowMemorySave = true, forceBridgeSync = false) {
  let activeCount = 0;
  let firstActiveTrack = null;
  let activeAudioEl = null;
  const currentActiveIds = [];

  tracksData.forEach(track => {
    const audio = document.getElementById(`audio-${track.id}`);
    if (audio && !audio.paused && !audio.ended) {
      activeCount++;
      currentActiveIds.push(track.id);
      if (!firstActiveTrack) {
        firstActiveTrack = track.title;
        activeAudioEl = audio;
      }
    }
  });

  // APENAS salva faixas ativas se NÃO estiver no meio de uma transição em lote
  if (allowMemorySave && activeResumeBatchToken === 0 && currentActiveIds.length > 0) {
    PlaybackMemorySystem.saveActiveTracks(currentActiveIds);
  }
  
  if (badgePlayingCount) badgePlayingCount.textContent = `${activeCount} Ativos`;
  if (statusTag) {
    if (activeCount > 0) {
      statusTag.textContent = "Sintonizando";
      statusTag.className = "status-tag playing";
    } else {
      statusTag.textContent = "Pronto";
      statusTag.className = "status-tag idle";
    }
  }

  // Atualiza indicador de memória na interface
  PlaybackMemorySystem.updateUI();

  // Sincronização deduplicada com MediaSession e Barra Musical Nativa do Android
  if (window.AndroidBridge) {
    try {
      const isPlaying = activeCount > 0;
      const memoryCount = PlaybackMemorySystem.getActiveTracks().length;
      const title = isPlaying
        ? (activeCount === 1 ? firstActiveTrack : `${activeCount} Frequências Ativas`)
        : (memoryCount > 0 ? `Binaural Pro (Pausado - ${memoryCount} em Memória)` : "Binaural Pro (Pausado)");
      
      const curTime = (activeAudioEl && !isNaN(activeAudioEl.currentTime)) ? activeAudioEl.currentTime : 0;
      const dur = (activeAudioEl && !isNaN(activeAudioEl.duration) && activeAudioEl.duration > 0) ? activeAudioEl.duration : -1;
      const posSec = Math.floor(curTime);

      const unchanged = !forceBridgeSync
        && lastBridgeState.playing === isPlaying
        && lastBridgeState.title === title
        && lastBridgeState.durSec === dur
        && lastBridgeState.posSec === posSec;

      if (!unchanged) {
        lastBridgeState = { playing: isPlaying, title, posSec, durSec: dur };
        if (typeof window.AndroidBridge.onPlaybackStateProgress === 'function') {
          window.AndroidBridge.onPlaybackStateProgress(isPlaying, title, curTime, dur);
        } else if (typeof window.AndroidBridge.onPlaybackStateChanged === 'function') {
          window.AndroidBridge.onPlaybackStateChanged(isPlaying, title);
        }
      }
    } catch(bridgeErr) {
      console.warn("AndroidBridge sync warning:", bridgeErr);
    }
  }
}

// --------------------------------------------------------------------------
// 6.1 CONTROLE COLETIVO MASTER DE SAÍDA DE ÁUDIO (ALTA PRECISÃO DSP)
// --------------------------------------------------------------------------
function calculateDecibels(linearVal) {
  if (linearVal <= 0.0001) return "-∞ dB";
  const db = 20 * Math.log10(linearVal);
  return `${db.toFixed(1)} dB`;
}

function setMasterVolume(val, updateSlider = true) {
  // Garantir limites estritos [0.0, 1.0] com alta precisão
  const clampedVal = Math.max(0.0, Math.min(1.0, parseFloat(val) || 0.0));
  masterVolume = clampedVal;
  
  // Salvar no localStorage para persistência de sessão
  try {
    localStorage.setItem('binaural_master_volume', clampedVal.toString());
  } catch(e){}

  // Atualizar nó de ganho Web Audio API com de-zippering suave de 15ms (elimina cliques digitais)
  if (masterGainNode && audioCtx) {
    const targetGain = clampedVal * masterDuckFactor;
    if (audioCtx.state === 'suspended') {
      masterGainNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    } else {
      masterGainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.015);
    }
  }

  // Fallback para elementos de áudio HTML5 caso não conectados diretamente ao Web Audio
  tracksData.forEach(track => {
    const audio = document.getElementById(`audio-${track.id}`);
    const trackVolSlider = document.getElementById(`volume-slider-${track.id}`);
    if (audio && !audioSourcesMap.has(audio)) {
      const trackVol = trackVolSlider ? parseFloat(trackVolSlider.value) : 1.0;
      audio.volume = trackVol * clampedVal * masterDuckFactor;
    }
  });

  // Atualizar elementos da interface Master
  const masterSlider = document.getElementById('master-volume-slider');
  const masterFill = document.getElementById('master-slider-fill');
  const masterValDisplay = document.getElementById('master-volume-val');
  const masterDbDisplay = document.getElementById('master-db-display');
  const muteBtn = document.getElementById('btn-master-mute');
  const muteIcon = document.getElementById('master-volume-icon');

  if (updateSlider && masterSlider) {
    masterSlider.value = clampedVal;
  }

  const percent = Math.round(clampedVal * 100);
  if (masterValDisplay) masterValDisplay.textContent = `${percent}%`;
  if (masterDbDisplay) masterDbDisplay.textContent = calculateDecibels(clampedVal);
  if (masterFill) masterFill.style.width = `${percent}%`;

  // Atualizar ícone de volume e estado de mute
  if (muteIcon && muteBtn) {
    if (clampedVal === 0) {
      muteIcon.className = "fa-solid fa-volume-xmark";
      muteBtn.classList.add('muted');
      muteBtn.setAttribute('title', 'Desmutar Saída Geral');
    } else if (clampedVal < 0.5) {
      muteIcon.className = "fa-solid fa-volume-low";
      muteBtn.classList.remove('muted');
      muteBtn.setAttribute('title', 'Mutar Saída Geral');
    } else {
      muteIcon.className = "fa-solid fa-volume-high";
      muteBtn.classList.remove('muted');
      muteBtn.setAttribute('title', 'Mutar Saída Geral');
    }
  }

  // Atualizar estado ativo dos botões de preset
  const presetBtns = document.querySelectorAll('.btn-preset-vol');
  presetBtns.forEach(btn => {
    const presetVal = parseFloat(btn.getAttribute('data-vol'));
    if (Math.abs(presetVal - clampedVal) < 0.02) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function toggleMasterMute() {
  if (masterVolume > 0) {
    preMuteVolume = masterVolume;
    setMasterVolume(0.0);
  } else {
    setMasterVolume(preMuteVolume > 0 ? preMuteVolume : 1.0);
  }
}

let _masterVolBound = false;
function setupMasterVolumeControls() {
  if (_masterVolBound) {
    setMasterVolume(masterVolume);
    return;
  }
  _masterVolBound = true;

  const masterSlider = document.getElementById('master-volume-slider');
  const muteBtn = document.getElementById('btn-master-mute');
  const decBtn = document.getElementById('btn-master-dec');
  const incBtn = document.getElementById('btn-master-inc');
  const presetBtns = document.querySelectorAll('.btn-preset-vol');

  if (masterSlider) {
    masterSlider.addEventListener('input', (e) => {
      initAudioEngine();
      setMasterVolume(parseFloat(e.target.value), false);
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      initAudioEngine();
      toggleMasterMute();
    });
  }

  if (decBtn) {
    decBtn.addEventListener('click', () => {
      initAudioEngine();
      // Aumento e perda de volume rigorosamente de 5 em 5%
      const nextVal = Math.max(0.0, Math.round((masterVolume - 0.05) * 100) / 100);
      setMasterVolume(nextVal);
    });
  }

  if (incBtn) {
    incBtn.addEventListener('click', () => {
      initAudioEngine();
      // Aumento e perda de volume rigorosamente de 5 em 5%
      const nextVal = Math.min(1.0, Math.round((masterVolume + 0.05) * 100) / 100);
      setMasterVolume(nextVal);
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioEngine();
      const pVal = parseFloat(btn.getAttribute('data-vol'));
      setMasterVolume(pVal);
    });
  });

  const masterValBadge = document.getElementById('master-volume-val');
  if (masterValBadge) {
    masterValBadge.addEventListener('click', () => {
      initAudioEngine();
      const presets = [1.0, 0.75, 0.50, 0.25, 0.0];
      const cur = Math.round(masterVolume * 100) / 100;
      let nextIdx = presets.findIndex(p => Math.abs(p - cur) < 0.05) + 1;
      if (nextIdx >= presets.length || nextIdx < 0) nextIdx = 0;
      setMasterVolume(presets[nextIdx]);
    });
  }

  // Inicializar estado visual
  setMasterVolume(masterVolume);
}

// --------------------------------------------------------------------------
// 6.2 CIRCUITO DE GANHO COLETIVO MASTER (BOOSTER DSP COLETIVO)
// --------------------------------------------------------------------------
function setMasterBoost(val, updateSlider = true) {
  const clampedVal = Math.max(1.0, Math.min(4.0, parseFloat(val) || 1.0));
  masterBoost = clampedVal;

  try {
    localStorage.setItem('binaural_master_boost', clampedVal.toString());
  } catch(e){}

  if (masterBoostNode && audioCtx) {
    const targetGain = isMasterBoostEnabled ? clampedVal : 1.0;
    if (audioCtx.state === 'suspended') {
      masterBoostNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    } else {
      masterBoostNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.015);
    }
  }

  const slider = document.getElementById('master-boost-slider');
  const fill = document.getElementById('master-gain-fill');
  const valDisplay = document.getElementById('master-gain-val');

  if (updateSlider && slider) {
    slider.value = clampedVal;
  }

  if (valDisplay) valDisplay.textContent = `${clampedVal.toFixed(1)}x`;
  
  const statusDisplay = document.getElementById('master-gain-status');
  if (statusDisplay) {
    statusDisplay.textContent = isMasterBoostEnabled ? `Booster ${clampedVal.toFixed(1)}x` : 'Booster Off';
  }

  if (fill) {
    // Escala de 1.0x a 4.0x -> 0% a 100% de largura
    const percent = Math.max(0, Math.min(100, ((clampedVal - 1.0) / 3.0) * 100));
    fill.style.width = `${percent}%`;
  }

  // Atualizar presets de ganho
  const presetBtns = document.querySelectorAll('.btn-preset-gain');
  presetBtns.forEach(btn => {
    const pGain = parseFloat(btn.getAttribute('data-gain'));
    if (Math.abs(pGain - clampedVal) < 0.05) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function toggleMasterBoost(enabled) {
  isMasterBoostEnabled = enabled;

  try {
    localStorage.setItem('binaural_master_boost_enabled', enabled ? 'true' : 'false');
  } catch(e){}

  const toggle = document.getElementById('btn-toggle-master-boost');
  const wrapper = document.getElementById('master-gain-slider-wrapper');
  const slider = document.getElementById('master-boost-slider');
  const circuit = document.getElementById('master-gain-circuit');
  const statusDisplay = document.getElementById('master-gain-status');

  if (statusDisplay) {
    statusDisplay.textContent = enabled ? `Booster ${masterBoost.toFixed(1)}x` : 'Booster Off';
  }

  if (toggle && toggle.checked !== enabled) {
    toggle.checked = enabled;
  }

  if (wrapper) {
    if (enabled) {
      wrapper.classList.remove('disabled');
      if (slider) slider.disabled = false;
      if (circuit) circuit.classList.add('boost-active');
    } else {
      wrapper.classList.add('disabled');
      if (slider) slider.disabled = true;
      if (circuit) circuit.classList.remove('boost-active');
    }
  }

  if (masterBoostNode && audioCtx) {
    const targetGain = enabled ? masterBoost : 1.0;
    if (audioCtx.state === 'suspended') {
      masterBoostNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    } else {
      masterBoostNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.015);
    }
  }
}

let _masterBoostBound = false;
function setupMasterBoostControls() {
  if (_masterBoostBound) {
    setMasterBoost(masterBoost);
    toggleMasterBoost(isMasterBoostEnabled);
    return;
  }
  _masterBoostBound = true;

  const toggle = document.getElementById('btn-toggle-master-boost');
  const slider = document.getElementById('master-boost-slider');
  const decBtn = document.getElementById('btn-gain-dec');
  const incBtn = document.getElementById('btn-gain-inc');
  const presetBtns = document.querySelectorAll('.btn-preset-gain');

  if (toggle) {
    toggle.checked = isMasterBoostEnabled;
    toggle.addEventListener('change', (e) => {
      initAudioEngine();
      toggleMasterBoost(e.target.checked);
    });
  }

  if (slider) {
    slider.addEventListener('input', (e) => {
      initAudioEngine();
      setMasterBoost(parseFloat(e.target.value), false);
    });
  }

  if (decBtn) {
    decBtn.addEventListener('click', () => {
      initAudioEngine();
      const nextVal = Math.max(1.0, Math.round((masterBoost - 0.1) * 10) / 10);
      setMasterBoost(nextVal);
    });
  }

  if (incBtn) {
    incBtn.addEventListener('click', () => {
      initAudioEngine();
      const nextVal = Math.min(4.0, Math.round((masterBoost + 0.1) * 10) / 10);
      setMasterBoost(nextVal);
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudioEngine();
      const pGain = parseFloat(btn.getAttribute('data-gain'));
      setMasterBoost(pGain);
    });
  });

  const masterGainBadge = document.getElementById('master-gain-val');
  if (masterGainBadge) {
    masterGainBadge.addEventListener('click', () => {
      initAudioEngine();
      if (!isMasterBoostEnabled) {
        toggleMasterBoost(true);
      }
      const presets = [1.0, 1.5, 2.0, 3.0, 4.0];
      const cur = Math.round(masterBoost * 10) / 10;
      let nextIdx = presets.findIndex(p => Math.abs(p - cur) < 0.1) + 1;
      if (nextIdx >= presets.length || nextIdx < 0) nextIdx = 0;
      setMasterBoost(presets[nextIdx]);
    });
  }

  // Inicializar estado visual
  setMasterBoost(masterBoost);
  toggleMasterBoost(isMasterBoostEnabled);
}

// --------------------------------------------------------------------------
// 6.3 SOUND MASTER WIDGET (EXPANSÃO TÁTIL, DESENHO DE SOM & COMPACTO)
// --------------------------------------------------------------------------
// 6.3 SOUND MASTER WIDGET (CONTROLES DIRETOS, DESENHO DE SOM & COMPACTO)
// --------------------------------------------------------------------------
function setupSoundMasterWidget() {
  // Inicialização visual imediata do Sound Widget
  setMasterVolume(masterVolume);
  setMasterBoost(masterBoost);
  toggleMasterBoost(isMasterBoostEnabled);
}

// --------------------------------------------------------------------------
// 7. DOWNLOAD IMEDIATO E CACHE EM INDEXEDDB
// --------------------------------------------------------------------------
async function checkAllCachesAndStartDownloads() {
  for (const track of tracksData) {
    const cachedBlob = await getCachedAudio(track.id);
    const downloadBtn = document.getElementById(`btn-download-${track.id}`);
    const downloadText = document.getElementById(`download-text-${track.id}`);
    const audio = document.getElementById(`audio-${track.id}`);
    
    if (cachedBlob) {
      if (downloadBtn) {
        downloadBtn.classList.add('cached');
        if (downloadText) downloadText.innerHTML = '<i class="fa-solid fa-circle-check"></i> Salvo Offline';
      }
      if (audio) {
        setOrQueueCachedAudioSrc(track.id, audio, cachedBlob);
      }
    } else {
      downloadQueue.push(track);
    }
  }
  
  if (downloadQueue.length > 0) {
    processDownloadQueue();
  }
}

function queueSingleTrackDownload(track) {
  if (!downloadQueue.find(t => t.id === track.id)) {
    downloadQueue.unshift(track);
    processDownloadQueue();
  }
}

async function processDownloadQueue() {
  if (isDownloadingQueue || downloadQueue.length === 0) return;
  isDownloadingQueue = true;
  
  const track = downloadQueue.shift();
  const trackId = track.id;
  const downloadBtn = document.getElementById(`btn-download-${trackId}`);
  const downloadText = document.getElementById(`download-text-${trackId}`);
  const progressWrapper = document.getElementById(`download-progress-wrapper-${trackId}`);
  const progressFill = document.getElementById(`download-progress-fill-${trackId}`);
  const audio = document.getElementById(`audio-${trackId}`);
  
  if (downloadBtn) downloadBtn.classList.add('downloading');
  if (progressWrapper) progressWrapper.classList.add('active');
  if (downloadText) downloadText.textContent = "Baixando...";
  
  try {
    const targetUrl = track.file;
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao baixar áudio`);
    }
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10) || 0;
    
    let blob;
    if (response.body && typeof response.body.getReader === 'function') {
      let loaded = 0;
      const reader = response.body.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        
        if (total && progressFill) {
          const pct = Math.min(100, Math.round((loaded / total) * 100));
          progressFill.style.width = `${pct}%`;
          if (downloadText) downloadText.textContent = `Baixando ${pct}%...`;
        }
      }
      const isWav = targetUrl.toLowerCase().endsWith('.wav');
      blob = new Blob(chunks, { type: isWav ? 'audio/wav' : 'audio/mp3' });
    } else {
      blob = await response.blob();
    }

    if (!blob || blob.size === 0) {
      throw new Error('Blob de áudio vazio');
    }
    await saveCachedAudio(trackId, blob);
    
    if (audio) {
      setOrQueueCachedAudioSrc(trackId, audio, blob);
    }
    
    if (downloadBtn) {
      downloadBtn.classList.remove('downloading');
      downloadBtn.classList.add('cached');
    }
    if (downloadText) downloadText.innerHTML = '<i class="fa-solid fa-circle-check"></i> Salvo Offline';
    if (progressWrapper) progressWrapper.classList.remove('active');
  } catch (err) {
    if (downloadBtn) downloadBtn.classList.remove('downloading');
    if (downloadText) downloadText.textContent = `Salvar Offline (${track.size || 'HQ'})`;
    if (progressWrapper) progressWrapper.classList.remove('active');
  }
  
  isDownloadingQueue = false;
  if (downloadQueue.length > 0) {
    setTimeout(processDownloadQueue, 150);
  }
}

// --------------------------------------------------------------------------
// 8. MOTOR DE BACKGROUNDS DINÂMICOS (FOTOS, SHADERS E VÍDEOS)
// --------------------------------------------------------------------------
function initBackground() {
  const video1 = document.getElementById("bg-video-1");
  const video2 = document.getElementById("bg-video-2");
  const webglContainer = document.getElementById("bg-webgl-container");
  const layer1 = document.getElementById("bg-layer-active");
  const layer2 = document.getElementById("bg-layer-next");
  const indicator = document.getElementById("current-bg-indicator");

  let activeSlide = layer1;
  let activeVidEl = video1;
  let nextVidEl = video2;
  let currentVidIdx = 0;
  let isVideoLoopRunning = false;
  let galaxyBitsIndex = 0;
  let currentEffectiveCategory = wallpaperCategory;

  function updateIndicator(text) {
    if (indicator) indicator.textContent = text;
    const topBtn = document.getElementById('btn-open-settings');
    if (topBtn) {
      topBtn.title = `Configurar Fundo Dinâmico (${text})`;
    }
  }

  if (video1) {
    video1.disablePictureInPicture = true;
    video1.playsInline = true;
    video1.muted = true;
  }
  if (video2) {
    video2.disablePictureInPicture = true;
    video2.playsInline = true;
    video2.muted = true;
  }

  function loadVideoSource(vidEl, url) {
    if (vidEl) {
      vidEl.disablePictureInPicture = true;
      vidEl.playsInline = true;
      vidEl.muted = true;
      if (vidEl.src !== url) {
        vidEl.src = url;
        vidEl.load();
      }
    }
  }

  function playNextVideoTrack() {
    if (wallpaperCategory !== "video") return;
    if (!video1 || !video2 || !CINEMATIC_VIDEOS || CINEMATIC_VIDEOS.length === 0) return;

    video1.style.display = "block";
    video2.style.display = "block";

    const currentUrl = CINEMATIC_VIDEOS[currentVidIdx];
    const nextIdx = (currentVidIdx + 1) % CINEMATIC_VIDEOS.length;
    const nextUrl = CINEMATIC_VIDEOS[nextIdx];

    loadVideoSource(activeVidEl, currentUrl);
    activeVidEl.classList.add("active");
    nextVidEl.classList.remove("active");

    activeVidEl.play().catch(e => console.log("Video Play:", e));
    loadVideoSource(nextVidEl, nextUrl);

    const onEnded = () => {
      activeVidEl.removeEventListener("ended", onEnded);
      nextVidEl.play().catch(e => console.log("Next Video Play:", e));
      nextVidEl.classList.add("active");
      activeVidEl.classList.remove("active");

      setTimeout(() => {
        try { activeVidEl.pause(); } catch(e){}
        currentVidIdx = nextIdx;
        const temp = activeVidEl;
        activeVidEl = nextVidEl;
        nextVidEl = temp;
        playNextVideoTrack();
      }, 1500);
    };

    activeVidEl.addEventListener("ended", onEnded, { once: true });
  }

  function getNextBgUrl(category) {
    if (category === 'dynamic' || category === 'api') {
      const randomId = Math.floor(Math.random() * 1000);
      return `https://picsum.photos/1920/1080?random=${randomId}`;
    } else {
      const list = GALLERIES[category] || GALLERIES.soft;
      if (!list || list.length === 0) return GALLERIES.soft[0];
      const img = list[currentBgIndex % list.length];
      currentBgIndex = (currentBgIndex + 1) % list.length;
      return img;
    }
  }

  function changeBackground() {
    let effectiveCategory = wallpaperCategory;
    if (wallpaperCategory === "random") {
      effectiveCategory = getRandomGalleryFromPool();
    }
    currentEffectiveCategory = effectiveCategory;

    const labels = {
      random: "🎲 Aleatório Dinâmico",
      soft: "💿 Minimal Dark Glass",
      red: "🔴 Crimson Cyber",
      nature: "🌿 Zen Nature",
      space: "🌌 Deep Cosmos",
      galaxybits: "✨ Shaders Rotativos"
    };
    updateIndicator(labels[effectiveCategory] || `✨ ${effectiveCategory.toUpperCase()}`);

    // Rotação de GalaxyBits (todos os shaders)
    if (effectiveCategory === "galaxybits") {
      isVideoLoopRunning = false;
      if (video1) video1.style.display = "none";
      if (video2) video2.style.display = "none";
      if (layer1) layer1.style.display = "none";
      if (layer2) layer2.style.display = "none";
      if (webglContainer) webglContainer.style.display = "block";

      if (typeof window.renderWebGLBackground === "function") {
        window.renderWebGLBackground(webglTypes[galaxyBitsIndex]);
        galaxyBitsIndex = (galaxyBitsIndex + 1) % webglTypes.length;
      }
      return;
    }

    // Shader WebGL Individual
    if (webglTypes.includes(effectiveCategory)) {
      isVideoLoopRunning = false;
      if (video1) video1.style.display = "none";
      if (video2) video2.style.display = "none";
      if (layer1) layer1.style.display = "none";
      if (layer2) layer2.style.display = "none";
      if (webglContainer) webglContainer.style.display = "block";
      if (typeof window.renderWebGLBackground === "function") {
        window.renderWebGLBackground(effectiveCategory);
      }
      return;
    } else if (effectiveCategory !== "galaxybits") {
      if (typeof window.stopWebGLBackground === "function") {
        window.stopWebGLBackground();
      }
      if (webglContainer) webglContainer.style.display = "none";
    }

    // Vídeo Cinematográfico
    if (effectiveCategory === "video") {
      if (layer1) layer1.style.display = "none";
      if (layer2) layer2.style.display = "none";
      if (!isVideoLoopRunning) {
        isVideoLoopRunning = true;
        playNextVideoTrack();
      }
      return;
    }

    // Imagens Normais
    isVideoLoopRunning = false;
    if (video1) video1.style.display = "none";
    if (video2) video2.style.display = "none";
    if (layer1) layer1.style.display = "block";
    if (layer2) layer2.style.display = "block";

    const nextUrl = getNextBgUrl(effectiveCategory);
    const nextLayer = (activeSlide === layer1) ? layer2 : layer1;
    
    if (nextLayer) {
      const img = new Image();
      img.src = nextUrl;
      img.onload = () => {
        nextLayer.style.backgroundImage = `url("${nextUrl}")`;
        nextLayer.classList.add('active');
        if (activeSlide) activeSlide.classList.remove('active');
        activeSlide = nextLayer;
      };
    }
  }

  changeBackground();

  function startBgInterval() {
    if (bgInterval) {
      clearInterval(bgInterval);
      bgInterval = null;
    }
    // Para shaders WebGL individuais fixos, mantém contínuo sem re-execuções desnecessárias
    if (webglTypes.includes(wallpaperCategory)) {
      return;
    }
    bgInterval = setInterval(changeBackground, bgSpeed);
  }

  startBgInterval();

  window.pauseBackgroundEngine = function() {
    if (bgInterval) {
      clearInterval(bgInterval);
      bgInterval = null;
    }
    if (video1 && !video1.paused) {
      try { video1.pause(); } catch(e) {}
    }
    if (video2 && !video2.paused) {
      try { video2.pause(); } catch(e) {}
    }
    // Pausa WebGL preservando os frames renderizados e visibilidade do canvas
    if (typeof window.pauseWebGLBackground === "function") {
      try { window.pauseWebGLBackground(); } catch(e) {}
    }
  };

  window.resumeBackgroundEngine = function() {
    startBgInterval();
    const effective = currentEffectiveCategory || wallpaperCategory;
    if (effective === "video") {
      if (video1 && video1.paused) try { video1.play(); } catch(e) {}
      if (video2 && video2.paused) try { video2.play(); } catch(e) {}
    } else if (webglTypes.includes(effective) || effective === "galaxybits") {
      if (webglContainer) webglContainer.style.display = "block";
      if (typeof window.resumeWebGLBackground === "function") {
        window.resumeWebGLBackground();
      } else if (typeof window.renderWebGLBackground === "function") {
        window.renderWebGLBackground(effective === "galaxybits" ? (webglTypes[galaxyBitsIndex] || webglTypes[0]) : effective);
      }
    }
  };

  window.cycleBgNow = () => {
    changeBackground();
    startBgInterval();
  };
}

function setupWallpaperControls() {
  const btnOpenSettingsList = document.querySelectorAll('#btn-open-settings, #btn-open-settings-footer, .btn-open-settings, .btn-bg-control, .btn-bg-header');
  const settingsModal = document.getElementById('settings-modal');
  const settingsClose = document.getElementById('settings-close');
  const settingsBackdrop = document.getElementById('settings-backdrop');
  const gallerySelect = document.getElementById('gallery-select');
  const speedSlider = document.getElementById('custom-speed-slider');
  const speedDisplay = document.getElementById('speed-val-display');
  const randomizeBtn = document.getElementById('randomize-bg-btn');

  const openSettings = () => {
    if (settingsModal) settingsModal.classList.add('active');
  };
  const closeSettings = () => {
    if (settingsModal) settingsModal.classList.remove('active');
  };

  btnOpenSettingsList.forEach(btn => {
    btn.addEventListener('click', openSettings);
  });
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);
  if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettings);

  if (gallerySelect) {
    gallerySelect.value = wallpaperCategory;
    gallerySelect.addEventListener('change', (e) => {
      wallpaperCategory = e.target.value;
      localStorage.setItem('binaural_wallpaper_category', e.target.value);
      if (typeof window.cycleBgNow === 'function') window.cycleBgNow();
    });
  }

  if (speedSlider && speedDisplay) {
    const sec = Math.round(bgSpeed / 1000);
    speedSlider.value = sec;
    speedDisplay.textContent = sec;

    speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      speedDisplay.textContent = val;
      bgSpeed = val * 1000;
      localStorage.setItem('binaural_speed', bgSpeed);
      if (typeof window.cycleBgNow === 'function') window.cycleBgNow();
    });
  }

  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', () => {
      wallpaperCategory = getRandomGalleryFromPool();
      if (gallerySelect) gallerySelect.value = wallpaperCategory;
      if (typeof window.cycleBgNow === 'function') window.cycleBgNow();
    });
  }
}

// --------------------------------------------------------------------------
// 9. VISUALIZADOR DE ÁUDIO NO CANVAS MASTER (ONDA ABSTRATA)
// --------------------------------------------------------------------------
function drawVisualizer() {
  if (!canvasCtx || !canvas) return;
  
  function resizeCanvas() {
    if (canvas && canvas.parentElement) {
      canvas.width = canvas.parentElement.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.offsetHeight * window.devicePixelRatio;
    }
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  let isPowerSavingActive = false;
  window.binauralOptimizer = {
    setPowerSave: function(enable) {
      const prev = isPowerSavingActive;
      isPowerSavingActive = !!enable;
      if (prev && !isPowerSavingActive) {
        requestAnimationFrame(render);
      }
    },
    onScreenOff: function() {
      isPowerSavingActive = true;
      if (window.suspendBinauralVisuals) window.suspendBinauralVisuals(true);
    },
    onScreenOn: function() {
      isPowerSavingActive = false;
      if (window.suspendBinauralVisuals) window.suspendBinauralVisuals(false);
      requestAnimationFrame(render);
    }
  };

  function render() {
    if (isPowerSavingActive || document.hidden || (window.isVisualsSuspended && window.isVisualsSuspended())) {
      return;
    }
    requestAnimationFrame(render);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    let isPlaying = false;
    tracksData.forEach(track => {
      const audio = document.getElementById(`audio-${track.id}`);
      if (audio && !audio.paused) isPlaying = true;
    });

    // Animação reativa do "desenho de som" no Sound Widget
    const soundBars = document.querySelectorAll('#widget-sound-drawing .sound-bar');
    const soundDrawing = document.getElementById('widget-sound-drawing');
    if (soundDrawing) {
      if (isPlaying) {
        soundDrawing.classList.add('active');
        if (analyserNode && soundBars.length === 5) {
          const freqData = new Uint8Array(16);
          analyserNode.getByteFrequencyData(freqData);
          const indices = [1, 3, 5, 8, 12];
          soundBars.forEach((bar, idx) => {
            const val = freqData[indices[idx]] || 0;
            const h = Math.max(5, Math.min(22, 5 + (val / 255) * 17));
            bar.style.height = `${h}px`;
          });
        }
      } else {
        soundDrawing.classList.remove('active');
        if (soundBars.length === 5) {
          soundBars[0].style.height = '6px';
          soundBars[1].style.height = '14px';
          soundBars[2].style.height = '9px';
          soundBars[3].style.height = '16px';
          soundBars[4].style.height = '7px';
        }
      }
    }
    
    if (!isPlaying || !analyserNode) {
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = "rgba(255, 30, 39, 0.2)";
      canvasCtx.lineWidth = 1.5 * window.devicePixelRatio;
      const cy = canvas.height / 2;
      canvasCtx.moveTo(0, cy);
      canvasCtx.lineTo(canvas.width, cy);
      canvasCtx.stroke();
      return;
    }
    
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteTimeDomainData(dataArray);
    
    canvasCtx.lineWidth = 2.5 * window.devicePixelRatio;
    const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#FF1E27");
    gradient.addColorStop(0.5, "#FF8000");
    gradient.addColorStop(1, "#FF1E27");
    
    canvasCtx.strokeStyle = gradient;
    canvasCtx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  
  render();
}

// --------------------------------------------------------------------------
// 10. FLUXO DE INICIALIZAÇÃO DA DEMO
// --------------------------------------------------------------------------
function unlockAppWithTracks(tracks) {
  isUnlocked = true;
  tracksData = (tracks && tracks.length > 0) ? [...tracks] : [...DEFAULT_TRACKS];
  
  if (appMain) appMain.classList.remove('authenticated-hidden');
  if (bgSlideshow) bgSlideshow.classList.remove('authenticated-hidden');
  
  renderTracks(tracksData);
  setupTrackEventListeners();
  PlaybackMemorySystem.init();
  setupMasterVolumeControls();
  setupMasterBoostControls();
  setupSoundMasterWidget();
  setupWallpaperControls();
  initBackground();
  
  // Inicialização do controlador de showcase demo
  DemoShowcase.init();
  
  // Download imediato em background de todos os áudios no IndexedDB
  checkAllCachesAndStartDownloads();
}

// --------------------------------------------------------------------------
// 12. DEMO SHOWCASE CONTROLLER & ANIMAÇÃO SUAVE DE ENTRADA
// --------------------------------------------------------------------------
const DemoShowcase = {
  isTransitioned: false,
  timer: null,
  progressInterval: null,
  hideTimeout: null,
  _keyBound: false,

  init() {
    const splash = document.getElementById('demo-splash-screen');
    const enterBtn = document.getElementById('btn-enter-demo');
    const progressFill = document.getElementById('demo-progress-fill');
    const progressText = document.getElementById('demo-loader-text');
    const progressPct = document.getElementById('demo-loader-pct');
    const replayBtn = document.getElementById('btn-replay-demo-intro');

    if (!splash) return;

    if (this.progressInterval) clearInterval(this.progressInterval);
    let currentPct = 0;
    this.progressInterval = setInterval(() => {
      currentPct += Math.floor(Math.random() * 15) + 12;
      if (currentPct > 100) currentPct = 100;

      if (progressFill) progressFill.style.width = `${currentPct}%`;
      if (progressPct) progressPct.textContent = `${currentPct}%`;

      if (currentPct >= 30 && currentPct < 70 && progressText) {
        progressText.innerHTML = '<i class="fa-solid fa-compact-disc fa-spin"></i> Sincronizando canais binaurais 320 kbps...';
      } else if (currentPct >= 70 && currentPct < 100 && progressText) {
        progressText.innerHTML = '<i class="fa-solid fa-sliders"></i> Calibrando Web Audio DSP & Limitadores...';
      } else if (currentPct >= 100 && progressText) {
        progressText.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #30D158;"></i> Sistema pronto para audição!';
        clearInterval(this.progressInterval);
      }
    }, 110);

    // Transição automática suave em 1.5s
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.triggerEntrance();
    }, 1500);

    if (enterBtn && !enterBtn._demoBound) {
      enterBtn._demoBound = true;
      enterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearTimeout(this.timer);
        this.triggerEntrance();
      });
    }

    if (replayBtn && !replayBtn._demoBound) {
      replayBtn._demoBound = true;
      replayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.replay();
      });
    }

    if (!this._keyBound) {
      this._keyBound = true;
      window.addEventListener('keydown', (e) => {
        if (!this.isTransitioned && (e.code === 'Space' || e.code === 'Enter')) {
          clearTimeout(this.timer);
          this.triggerEntrance();
        }
      });
    }
  },

  triggerEntrance() {
    if (this.isTransitioned) return;
    this.isTransitioned = true;
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    const splash = document.getElementById('demo-splash-screen');
    const appMain = document.getElementById('app-main');

    if (splash) {
      splash.classList.add('dismissing');
      this.hideTimeout = setTimeout(() => {
        splash.style.display = 'none';
      }, 750);
    }

    if (appMain) {
      appMain.classList.remove('demo-hidden');
      void appMain.offsetWidth;
      appMain.classList.add('demo-animated-entrance');

      const cards = document.querySelectorAll('.track-card');
      cards.forEach((card, idx) => {
        card.style.setProperty('--card-idx', idx);
      });
    }
  },

  replay() {
    this.isTransitioned = false;
    clearTimeout(this.timer);
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    if (this.progressInterval) clearInterval(this.progressInterval);

    const splash = document.getElementById('demo-splash-screen');
    const appMain = document.getElementById('app-main');
    if (splash && appMain) {
      splash.style.display = 'flex';
      splash.classList.remove('dismissing');
      appMain.classList.remove('demo-animated-entrance');
      appMain.classList.add('demo-hidden');

      const progressFill = document.getElementById('demo-progress-fill');
      const progressPct = document.getElementById('demo-loader-pct');
      const progressText = document.getElementById('demo-loader-text');
      if (progressFill) progressFill.style.width = '0%';
      if (progressPct) progressPct.textContent = '0%';
      if (progressText) progressText.innerHTML = '<i class="fa-solid fa-bolt"></i> Reiniciando demonstração...';

      this.init();
    }
  }
};

// --------------------------------------------------------------------------
// 11. INICIALIZAÇÃO NO DOM READY
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 📱 Na versão Web (mobile e desktop), remover fisicamente os botões exclusivos do APK nativo
  if (!window.isAndroidApk) {
    const topBgBtn = document.getElementById('btn-open-settings');
    const floatingBtn = document.getElementById('btn-floating-bubble');
    if (topBgBtn) topBgBtn.remove();
    if (floatingBtn) floatingBtn.remove();
    document.querySelectorAll('.apk-only, .apk-only-btn').forEach(el => el.remove());
  }

  // Acesso direto sem solicitação de senha dentro do APK
  unlockAppWithTracks(DEFAULT_TRACKS);

  const btnFloatingBubble = document.getElementById('btn-floating-bubble');
  function updateFloatingBubbleButtonUI(active) {
    if (!btnFloatingBubble) return;
    if (active) {
      btnFloatingBubble.classList.add('active');
      btnFloatingBubble.title = "Desativar Tela Sempre Ligada (Ícone Flutuante)";
    } else {
      btnFloatingBubble.classList.remove('active');
      btnFloatingBubble.title = "Ativar Tela Sempre Ligada (Ícone Flutuante)";
    }
  }

  window.onFloatingBubbleStateChanged = function(active) {
    updateFloatingBubbleButtonUI(active);
  };

  // Ativar lógica e listeners do botão flutuante exclusivamente no ambiente nativo APK
  if (btnFloatingBubble && window.isAndroidApk) {
    btnFloatingBubble.addEventListener('click', () => {
      if (window.AndroidBridge) {
        if (typeof window.AndroidBridge.canDrawOverlays === 'function' && !window.AndroidBridge.canDrawOverlays()) {
          window.AndroidBridge.requestOverlayPermission();
          return;
        }
        if (typeof window.AndroidBridge.toggleFloatingBubble === 'function') {
          const newState = window.AndroidBridge.toggleFloatingBubble();
          updateFloatingBubbleButtonUI(newState);
          if (typeof window.AndroidBridge.showToast === 'function') {
            window.AndroidBridge.showToast(newState ? "✨ Tela Sempre Ligada Ativada (Ícone Flutuante Ativo)" : "Tela Sempre Ligada Desativada");
          }
        }
      }
    });

    if (window.AndroidBridge && typeof window.AndroidBridge.isFloatingBubbleActive === 'function') {
      updateFloatingBubbleButtonUI(window.AndroidBridge.isFloatingBubbleActive());
    }
  }

  // Handlers para comandos da barra musical nativa do Android / Samsung One UI
  window.triggerNativePlay = function() {
    if (typeof window.handleMediaAction === 'function') {
      window.handleMediaAction('play');
    } else if (typeof window.resumeTracks === 'function') {
      window.resumeTracks();
    }
  };

  window.triggerNativePause = function() {
    if (typeof window.handleMediaAction === 'function') {
      window.handleMediaAction('pause');
    } else if (typeof window.pauseAllTracks === 'function') {
      window.pauseAllTracks();
    }
  };

  window.triggerNativePlayPause = function() {
    if (typeof window.handleMediaAction === 'function') {
      window.handleMediaAction('play_pause');
      return;
    }
    let anyPlaying = false;
    tracksData.forEach(track => {
      const a = document.getElementById(`audio-${track.id}`);
      if (a && !a.paused && !a.ended) anyPlaying = true;
    });
    if (anyPlaying) {
      if (typeof window.pauseAllTracks === 'function') window.pauseAllTracks();
    } else {
      if (typeof window.resumeTracks === 'function') window.resumeTracks();
    }
  };

  window.triggerNativeNext = function() {
    if (typeof window.handleMediaAction === 'function') {
      window.handleMediaAction('next');
    }
  };

  window.triggerNativePrev = function() {
    if (typeof window.handleMediaAction === 'function') {
      window.handleMediaAction('prev');
    }
  };
});
