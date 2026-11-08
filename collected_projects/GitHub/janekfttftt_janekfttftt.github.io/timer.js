// Kolejka timerów: odpalają się jeden po drugim, po każdym gra wybrany sygnał.
// Zawiera też: gotowe zestawy, wybór dźwięku, długość/głośność/wyciszenie i widok pełnoekranowy.
(function () {
  "use strict";

  const tr = I18N.t;

  const KEY = "timers_v1";
  const SOUND_KEY = "timer_sound_v2";
  const HISTORY_KEY = "timer_history_v1";
  const MAX_TOTAL = 10;      // maksymalna długość timera w sekundach
  const MAX_SOUND_LEN = 30;  // sekundy
  const MASTER_MAX = 0.85;   // głośność przy suwaku na 100%
  const DEFAULTS = { sound: "alarm", len: 10, vol: 80, muted: false };
  const PRESET_KEYS = ["exercise", "study", "rest"];

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? h + ":" + pad(m) + ":" + pad(sec) : pad(m) + ":" + pad(sec);
  }

  const startBtn = $("start-btn");
  const skipBtn = $("skip-btn");
  const resetBtn = $("reset-btn");
  const clearBtn = $("clear-btn");
  const queue = $("queue");
  const form = $("add-form");

  const soundSel = $("sound-select");
  const lenRange = $("len-range");
  const lenLabel = $("len-label");
  const volRange = $("vol-range");
  const volLabel = $("vol-label");
  const muteBtn = $("mute-btn");
  const playBtn = $("sound-play");
  const soundFill = $("sound-fill");

  // ---------- Dźwięki (syntezowane w przeglądarce, bez plików) ----------
  // cycle(tone, t): rysuje jeden "obieg" dźwięku od czasu t; obiegi powtarzają się co `period` s,
  // aż do wybranej długości. tone(start, czas, częstotliwość, typ, głośność, [częstotliwość_końcowa]).
  const bell = (tone, t, f, len, vol) => {
    [[1, 1, 1], [2.01, 0.5, 0.65], [2.76, 0.35, 0.45], [5.4, 0.18, 0.25]].forEach((p) => {
      tone(t, len * p[2], f * p[0], "sine", vol * p[1]);
    });
  };

  const SOUNDS = [
    { id: "pip", key: "s.pip", period: 0.5, cycle: (tone, t) => tone(t, 0.18, 880, "sine", 0.35) },
    { id: "bell", key: "s.bell", period: 1.8, cycle: (tone, t) => bell(tone, t, 1046.5, 1.6, 0.3) },
    { id: "gong", key: "s.gong", period: 3.2, cycle: (tone, t) => bell(tone, t, 196, 3.0, 0.45) },
    {
      id: "alarm", key: "s.alarm", period: 1.0,
      cycle: (tone, t) => { for (let i = 0; i < 4; i++) tone(t + i * 0.13, 0.08, 1400, "square", 0.12); },
    },
    { id: "sonar", key: "s.sonar", period: 1.5, cycle: (tone, t) => tone(t, 0.7, 1300, "sine", 0.35, 900) },
    {
      id: "chime", key: "s.chime", period: 2.0,
      cycle: (tone, t) => { [523.25, 659.25, 783.99].forEach((f, i) => tone(t + i * 0.25, 0.6, f, "sine", 0.3)); },
    },
  ];

  // ---------- Ustawienia dźwięku (zapisywane w przeglądarce) ----------
  const settings = loadSettings(); // { sound, len, vol, muted }

  function loadSettings() {
    const s = Object.assign({}, DEFAULTS);
    try {
      const raw = JSON.parse(localStorage.getItem(SOUND_KEY));
      if (raw) {
        if (SOUNDS.some((x) => x.id === raw.sound)) s.sound = raw.sound;
        if (Number.isFinite(raw.len)) s.len = clamp(Math.round(raw.len), 1, MAX_SOUND_LEN);
        if (Number.isFinite(raw.vol)) s.vol = clamp(Math.round(raw.vol), 0, 100);
        if (typeof raw.muted === "boolean") s.muted = raw.muted;
      }
    } catch (e) { /* zostaną domyślne */ }
    return s;
  }

  function saveSettings() {
    try { localStorage.setItem(SOUND_KEY, JSON.stringify(settings)); } catch (e) { /* trudno */ }
  }

  // suwak 0–100% → głośność (kwadrat, żeby regulacja była naturalna dla ucha)
  const gainNow = () => (settings.muted ? 0 : MASTER_MAX * Math.pow(settings.vol / 100, 2));

  let audioCtx = null;
  let playing = null; // { master, nodes, timer, startedAt, lenMs }

  function ensureAudio() {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* brak dźwięku */ }
  }

  function updateSoundUi() {
    lenLabel.textContent = settings.len + " s";
    volLabel.textContent = settings.muted ? tr("sound.muted") : settings.vol + "%";
    muteBtn.textContent = tr(settings.muted ? "sound.unmute" : "sound.mute");
    muteBtn.setAttribute("aria-pressed", String(settings.muted));
    playBtn.textContent = tr(playing ? "sound.stop" : "sound.play");
    if (!playing) soundFill.style.width = "0%";
  }

  function fillSoundOptions() {
    soundSel.textContent = "";
    SOUNDS.forEach((s) => {
      const o = el("option", null, tr(s.key));
      o.value = s.id;
      soundSel.appendChild(o);
    });
    soundSel.value = settings.sound;
  }

  function applyVolume() {
    if (!playing || !audioCtx) return;
    try {
      playing.master.gain.setTargetAtTime(gainNow(), audioCtx.currentTime, 0.02);
    } catch (e) { /* brak dźwięku */ }
  }

  function soundProgress() {
    if (!playing) return;
    const elapsed = performance.now() - playing.startedAt;
    if (elapsed >= playing.lenMs + 150) {
      stopSound();
      return;
    }
    soundFill.style.width = Math.min(100, Math.max(0, (elapsed / playing.lenMs) * 100)) + "%";
  }

  function stopSound() {
    const p = playing;
    playing = null;
    if (p) {
      clearInterval(p.timer);
      try {
        const now = audioCtx.currentTime;
        p.master.gain.cancelScheduledValues(now);
        p.master.gain.setValueAtTime(p.master.gain.value, now);
        p.master.gain.linearRampToValueAtTime(0, now + 0.02);
        p.nodes.forEach((n) => { try { n.stop(now + 0.03); } catch (e) { /* już zakończony */ } });
      } catch (e) { /* brak dźwięku */ }
      setTimeout(() => { try { p.master.disconnect(); } catch (e) { /* ok */ } }, 150);
    }
    updateSoundUi();
  }

  function playSound() {
    ensureAudio();
    if (!audioCtx) return;
    stopSound();
    try {
      const snd = SOUNDS.find((s) => s.id === settings.sound) || SOUNDS[0];
      const seconds = settings.len;
      const t0 = audioCtx.currentTime + 0.03;
      const end = t0 + seconds;
      const master = audioCtx.createGain();
      master.gain.value = gainNow();
      master.connect(audioCtx.destination);
      const nodes = [];

      const tone = (start, dur, freq, type, vol, freqEnd) => {
        dur = Math.min(dur, end - start); // nic nie wychodzi poza wybraną długość
        if (dur < 0.03) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const attack = Math.min(0.01, dur / 3);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(vol, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + dur + 0.02);
        nodes.push(osc);
      };

      for (let t = t0; t < end; t += snd.period) snd.cycle(tone, t);

      playing = { master, nodes, timer: null, startedAt: performance.now() + 30, lenMs: seconds * 1000 };
      playing.timer = setInterval(soundProgress, 100);
      soundProgress();
    } catch (e) {
      playing = null;
    }
    updateSoundUi();
  }

  // ---------- Stan timerów ----------
  // timers: [{ id, desc, key, total (sekundy), status: wait | run | done }]
  // `key` (exercise | study | rest) to opis z gotowego zestawu – tłumaczy się przy zmianie języka.
  let timers = load();
  let currentId = null;
  let running = false;
  let endAt = 0;      // znacznik czasu końca (gdy running)
  let remaining = 0;  // ms do końca (gdy pauza)

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((t) => t && typeof t.total === "number" && t.total > 0)
        .map((t) => ({
          id: newId(),
          desc: typeof t.desc === "string" ? t.desc.slice(0, 80) : "",
          key: PRESET_KEYS.indexOf(t.key) >= 0 ? t.key : "",
          total: clamp(Math.floor(t.total), 1, MAX_TOTAL),
          status: "wait",
        }));
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(timers.map((t) => ({ desc: t.desc, key: t.key || undefined, total: t.total })))
      );
    } catch (e) { /* brak zapisu – trudno */ }
  }

  const cur = () => timers.find((t) => t.id === currentId) || null;
  const label = (t) => (t.key ? tr("desc." + t.key) : t.desc);

  // Historia zapisuje wyłącznie timery ukończone do końca.
  let history = loadHistory();
  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY));
      if (!Array.isArray(raw)) return [];
      return raw.filter((x) => x && Number.isFinite(x.at) && Number.isFinite(x.seconds) && x.seconds > 0)
        .slice(-1000).map((x) => ({ at: x.at, seconds: Math.floor(x.seconds), key: PRESET_KEYS.includes(x.key) ? x.key : "", desc: typeof x.desc === "string" ? x.desc.slice(0, 80) : "" }));
    } catch (e) { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-1000))); } catch (e) { /* brak zapisu */ }
  }
  function historyLabel(item) { return item.key ? tr("desc." + item.key) : item.desc || tr("timer.nodesc"); }
  function recordCompletion(t) {
    history.push({ at: Date.now(), seconds: t.total, key: t.key || "", desc: t.desc || "" });
    history = history.slice(-1000);
    saveHistory();
    renderHistory();
  }
  function renderHistory() {
    const list = $("history-list");
    const chart = $("history-chart");
    if (!list || !chart) return;
    list.textContent = "";
    chart.textContent = "";
    const total = history.reduce((sum, item) => sum + item.seconds, 0);
    $("history-total").textContent = fmt(total * 1000);
    $("history-empty").hidden = history.length > 0;
    const groups = new Map();
    history.forEach((item) => {
      const id = item.key || "desc:" + (item.desc || "");
      const group = groups.get(id) || { label: historyLabel(item), seconds: 0 };
      group.seconds += item.seconds;
      groups.set(id, group);
    });
    const sorted = Array.from(groups.values()).sort((a, b) => b.seconds - a.seconds);
    const max = sorted.length ? sorted[0].seconds : 1;
    sorted.forEach((group) => {
      const row = el("div", "history-bar-row");
      const labelEl = el("span", "history-bar-label", group.label);
      const track = el("div", "history-bar-track");
      const fill = el("div", "history-bar-fill");
      fill.style.width = (group.seconds / max * 100) + "%";
      track.appendChild(fill);
      const value = el("span", "history-bar-value", fmt(group.seconds * 1000));
      row.append(labelEl, track, value);
      chart.appendChild(row);
    });
    history.slice(-30).reverse().forEach((item) => {
      const date = new Intl.DateTimeFormat(I18N.lang === "pl" ? "pl-PL" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.at));
      list.appendChild(el("li", "history-entry", `${date} · ${historyLabel(item)} · ${fmt(item.seconds * 1000)}`));
    });
  }
  const historyClear = $("history-clear");
  if (historyClear) historyClear.addEventListener("click", () => {
    if (!history.length || !window.confirm(tr("history.clear.confirm"))) return;
    history = [];
    saveHistory();
    renderHistory();
  });

  // ---------- Odliczanie ----------
  // Tykanie w Web Workerze, bo zwykłe timery bywają mocno spowalniane w karcie w tle.
  let worker = null;
  let fallbackId = null;

  function startTicker() {
    if (!worker && fallbackId === null) {
      try {
        const src =
          "var id=null;onmessage=function(e){clearInterval(id);id=null;" +
          "if(e.data==='start'){id=setInterval(function(){postMessage(1)},250)}};";
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
        worker.onmessage = () => tick();
      } catch (e) {
        worker = null;
      }
    }
    if (worker) worker.postMessage("start");
    else if (fallbackId === null) fallbackId = setInterval(tick, 250);
  }

  function stopTicker() {
    if (worker) worker.postMessage("stop");
    if (fallbackId !== null) {
      clearInterval(fallbackId);
      fallbackId = null;
    }
  }

  function begin(t) {
    currentId = t.id;
    t.status = "run";
    remaining = t.total * 1000;
    endAt = Date.now() + remaining;
  }

  function advance(withSound) {
    const t = cur();
    if (t) {
      if (withSound) recordCompletion(t);
      t.status = "done";
    }
    const idx = timers.findIndex((x) => x.id === currentId);
    const next = timers.slice(idx + 1).find((x) => x.status === "wait");
    if (next) {
      if (withSound) playSound();
      begin(next);
    } else {
      currentId = null;
      running = false;
      remaining = 0;
      stopTicker();
      if (withSound) playSound();
    }
    renderQueue();
    update();
  }

  function tick() {
    if (!running) return;
    if (endAt - Date.now() <= 0) {
      advance(true);
      return;
    }
    update();
  }

  // ---------- Przyciski ----------
  function onStartPause() {
    ensureAudio();
    if (running) {
      remaining = Math.max(0, endAt - Date.now());
      running = false;
      stopTicker();
      update();
      return;
    }
    if (currentId !== null) {
      endAt = Date.now() + remaining;
      running = true;
      startTicker();
      update();
      return;
    }
    const next = timers.find((x) => x.status === "wait");
    if (!next) return;
    begin(next);
    running = true;
    startTicker();
    renderQueue();
    update();
  }

  function onReset() {
    stopTicker();
    stopSound();
    running = false;
    currentId = null;
    remaining = 0;
    timers.forEach((t) => { t.status = "wait"; });
    renderQueue();
    update();
  }

  startBtn.addEventListener("click", onStartPause);
  skipBtn.addEventListener("click", () => { if (currentId !== null) advance(false); });
  resetBtn.addEventListener("click", onReset);

  clearBtn.addEventListener("click", () => {
    if (!timers.length) return;
    if (!window.confirm(tr("queue.clear.confirm"))) return;
    stopTicker();
    stopSound();
    running = false;
    currentId = null;
    remaining = 0;
    timers = [];
    save();
    renderQueue();
    update();
  });

  let msgTimer = null;
  function flash(text) {
    const m = $("form-msg");
    m.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { m.textContent = ""; }, 2500);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const total = Number($("in-sec").value);
    if (!Number.isInteger(total) || total < 1 || total > MAX_TOTAL) {
      flash(tr("timer.err.range"));
      return;
    }
    timers.push({ id: newId(), desc: $("in-desc").value.trim().slice(0, 80), key: "", total, status: "wait" });
    $("in-desc").value = "";
    save();
    renderQueue();
    update();
  });

  // Gotowe zestawy – każde kliknięcie dodaje kolejną rundę na koniec kolejki.
  // Chcesz własny zestaw? Dodaj przycisk w timer.html i wywołanie addPreset([[opis, sekundy], ...]) poniżej.
  function addPreset(items) {
    items.forEach((it) => {
      timers.push({ id: newId(), desc: "", key: it[0], total: it[1], status: "wait" });
    });
    save();
    renderQueue();
    update();
  }

  $("preset-s25").addEventListener("click", () => addPreset([["study", 10], ["rest", 5]]));
  $("preset-s50").addEventListener("click", () => addPreset([["study", 8], ["rest", 2]]));
  $("preset-ex").addEventListener("click", () => addPreset([["exercise", 10], ["rest", 1]]));

  queue.addEventListener("click", (e) => {
    const btn = e.target.closest(".q-remove");
    if (!btn || btn.disabled) return;
    const id = btn.closest(".q-item").dataset.id;
    if (id === currentId) return;
    timers = timers.filter((t) => t.id !== id);
    save();
    renderQueue();
    update();
  });

  // ---------- Ustawienia dźwięku: obsługa ----------
  fillSoundOptions();
  lenRange.max = String(MAX_SOUND_LEN);
  lenRange.value = String(settings.len);
  volRange.value = String(settings.vol);
  updateSoundUi();

  // po wybraniu dźwięku od razu go odtwarzamy
  soundSel.addEventListener("change", () => {
    settings.sound = soundSel.value;
    saveSettings();
    playSound();
  });

  lenRange.addEventListener("input", () => {
    settings.len = Number(lenRange.value);
    updateSoundUi();
  });
  lenRange.addEventListener("change", saveSettings);

  volRange.addEventListener("input", () => {
    settings.vol = Number(volRange.value);
    if (settings.vol > 0 && settings.muted) settings.muted = false; // ruszenie suwaka włącza dźwięk
    updateSoundUi();
    applyVolume();
  });
  volRange.addEventListener("change", saveSettings);

  muteBtn.addEventListener("click", () => {
    settings.muted = !settings.muted;
    saveSettings();
    updateSoundUi();
    applyVolume();
  });

  playBtn.addEventListener("click", () => {
    if (playing) stopSound();
    else playSound();
  });

  // ---------- Rysowanie ----------
  function renderQueue() {
    queue.textContent = "";
    $("queue-empty").hidden = timers.length > 0;

    timers.forEach((t, i) => {
      const li = el("li", "q-item " + t.status);
      li.dataset.id = t.id;

      const d = label(t);
      const top = el("div", "q-top");
      const desc = el("span", "q-desc" + (d ? "" : " muted"), d || tr("timer.nodesc"));
      const time = el("span", "q-time", t.status === "done" ? "✓" : fmt(t.total * 1000));
      const rm = el("button", "q-remove", "×");
      rm.type = "button";
      rm.setAttribute("aria-label", tr("queue.remove"));
      rm.disabled = t.id === currentId;
      top.append(el("span", "q-idx", String(i + 1)), desc, time, rm);

      const bar = el("div", "bar");
      const fill = el("div", "bar-fill");
      if (t.status === "done") fill.style.width = "100%";
      bar.appendChild(fill);

      li.append(top, bar);
      queue.appendChild(li);
    });
  }

  function update() {
    const t = cur();
    const nextWait = timers.find((x) => x.status === "wait");
    let shown;

    if (t) {
      const left = running ? Math.max(0, endAt - Date.now()) : remaining;
      $("now-label").textContent = (running ? "" : tr("timer.paused") + " · ") + (label(t) || tr("timer.nodesc"));
      shown = fmt(left);
      document.title = shown + " · Timer";

      const li = queue.querySelector('[data-id="' + t.id + '"]');
      if (li) {
        li.querySelector(".q-time").textContent = shown;
        li.querySelector(".bar-fill").style.width =
          Math.min(100, Math.max(0, (1 - left / (t.total * 1000)) * 100)) + "%";
      }
    } else {
      const allDone = timers.length > 0 && !nextWait;
      $("now-label").textContent = tr(allDone ? "timer.alldone" : "timer.ready");
      shown = nextWait ? fmt(nextWait.total * 1000) : "00:00";
      document.title = tr("title.timer");
    }
    $("now-time").textContent = shown;

    startBtn.textContent = tr(running ? "btn.pause" : t ? "btn.resume" : "btn.start");
    startBtn.disabled = !t && !nextWait;
    skipBtn.disabled = !t;
    resetBtn.disabled = !timers.some((x) => x.status !== "wait");

    // widok pełnoekranowy: sam czas (bez opisu)
    $("fs-time").textContent = shown;
    $("fs-time").classList.toggle("long", shown.length > 5);
    $("fs-timer").classList.toggle("paused", !!t && !running);
    $("fs-toggle").textContent = startBtn.textContent;
    $("fs-toggle").disabled = startBtn.disabled;
  }

  // ---------- Pełny ekran: czas + kółko ----------
  // Kółko robi pełny obrót w 1/10 czasu bieżącego timera (np. 40 s → obrót co 4 s).
  const fsOverlay = $("fs-timer");
  const ringRot = $("ring-rot");
  let rafId = null;

  function ringAngle() {
    const t = cur();
    if (!t) return 0;
    const left = running ? Math.max(0, endAt - Date.now()) : remaining;
    const elapsed = t.total * 1000 - left;
    const period = t.total * 100; // 1/10 czasu timera w ms
    return ((elapsed % period) / period) * 360;
  }

  function frame() {
    rafId = null;
    if (!Fullscreen.isOpen()) return;
    ringRot.setAttribute("transform", "rotate(" + ringAngle().toFixed(2) + " 50 50)");
    rafId = requestAnimationFrame(frame);
  }

  $("fs-btn").addEventListener("click", () => {
    ensureAudio(); // kliknięcie to dobry moment na odblokowanie dźwięku
    Fullscreen.open(fsOverlay, () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    });
    update();
    if (rafId === null) rafId = requestAnimationFrame(frame);
  });

  $("fs-toggle").addEventListener("click", onStartPause);

  // ---------- Zmiana języka ----------
  document.addEventListener("langchange", () => {
    fillSoundOptions();
    updateSoundUi();
    renderQueue();
    renderHistory();
    update();
  });

  renderQueue();
  renderHistory();
  update();
})();



