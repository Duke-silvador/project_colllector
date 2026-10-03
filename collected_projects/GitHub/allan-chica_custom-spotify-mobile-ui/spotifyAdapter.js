/* Spotify Mobile Prototype — spotifyAdapter.js
 *
 * Centralized abstraction over the REAL Spotify Web Player DOM.
 * The rest of the extension must NOT query Spotify's DOM directly.
 * Only this file knows about data-testid / aria-label / structure.
 *
 * Design rules:
 *  - Prefer semantic anchors: data-testid, aria-label, role, DOM hierarchy.
 *  - Never rely on obfuscated CSS class names.
 *  - The persistent player is found by hierarchy (footer / now-playing-bar),
 *    NOT by a global [aria-label="Play"] query (many unrelated Play buttons exist).
 *  - Every lookup re-resolves from the live DOM (React replaces nodes often).
 *  - MutationObserver (debounced) notifies subscribers; only a very light
 *    fallback interval is used, and it backs off when the player is found.
 */

(function () {
  "use strict";

  // Build marker: bump on every shipped change. Reported in inspectLyrics()
  // and the mount log so a paste instantly shows whether the tab runs the
  // latest code — content scripts only refresh on extension reload + full
  // tab reload, so a stale tab otherwise debugs like a ghost.
  var BUILD = "lx20";

  var TESTIDS = {
    playerBar: "now-playing-bar",
    widget: "now-playing-widget",
    controls: "player-controls",
    playpause: "control-button-playpause",
    prev: "control-button-skip-back",
    next: "control-button-skip-forward",
    shuffle: "control-button-shuffle",
    repeat: "control-button-repeat",
    npv: "control-button-npv",
    npvPanel: "NPV_Panel_OpenDiv",
    coverArt: "cover-art-image",
    progressBar: "playback-progressbar",
    progressPosition: "playback-position",
    progressDuration: "playback-duration",
    volumeBar: "volume-bar",
    contextLink: "context-item-link",
  };

  // Substrings (lowercase) matching aria-labels across a few common locales.
  // English is primary; others are best-effort fallbacks.
  var LABELS = {
    prev: ["previous", "prev", "anterior", "précédent", "precedent", "zurück", "indietro", "vorige"],
    next: ["next", "siguiente", "suivant", "weiter", "successivo", "volgende", "próxima", "prossimo"],
    shuffle: ["shuffle", "aleatorio", "aléatoire", "zufällig", "zufallig", "casuale", "aleatoria"],
    repeat: ["repeat", "repetir", "répéter", "repeter", "wiederholen", "ripeti", "herhalen"],
    likeAdd: ["add to liked", "add to your liked", "save to your liked", "like", "me gusta", "enregistrer"],
    likeRemove: ["remove from liked", "remove from your liked", "unlike", "unlike this", "added to liked", "added to your liked", "saved to liked", "saved to your liked"],
    lyrics: ["lyrics", "letra", "paroles", "songtext", "testo"],
    queue: ["queue", "cola", "file d'attente", "warteschlange", "coda"],
    device: ["connect to a device", "devices", "dispositivos", "appareils", "geräte", "gerate"],
    mute: ["mute", "silenciar", "muet", "stumm", "silenzia"],
    unmute: ["unmute", "activar sonido", "rétablir le son", "ton einschalten"],
    volume: ["volume", "volumen"],
    seek: ["seek", "progress", "progreso", "position"],
  };

  // Device picker (Spotify Connect). Verified against the shipped
  // web-player bundle rather than guessed — see the devices section below.
  var DEVICE = {
    row: "device-picker-row-sidepanel",
    rowTitle: "list-row-title",
    mainIcon: "main-icon",
    currentIcon: "device-icon",
    listPrefix: "devices-list-",
    emptyHeading: "device-picker-section-heading",
    emptyList: "device-picker-troubleshooting-list",
    panelId: "Desktop_PanelContainer_Id",
    panelClose: "PanelHeader_CloseButton",
    currentKey: "device-picker-header",
    castPlaceholder: "cast-placeholder",
  };

  var subscribers = new Set();
  var lastSnapshotKey = "";
  var observer = null;
  var observerStarted = false;
  var fallbackTimer = null;
  var cachedPlayerRoot = null;

  function norm(s) {
    return (s || "").toLowerCase().trim();
  }

  function includesAny(haystack, needles) {
    var h = norm(haystack);
    if (!h) return false;
    for (var i = 0; i < needles.length; i++) {
      if (h.indexOf(needles[i]) !== -1) return true;
    }
    return false;
  }

  function byTestId(id, scope) {
    try {
      var root = scope || document;
      return root.querySelector('[data-testid="' + id + '"]');
    } catch (e) {
      return null;
    }
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    // getClientRects is 0 for display:none
    if (!el.getClientRects || el.getClientRects().length === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /* ---------- Player root discovery ---------- */

  function rootFromPlayPauseAncestor() {
    var btn = null;
    try {
      btn = document.querySelector('button[data-testid="' + TESTIDS.playpause + '"]');
    } catch (e) {
      btn = null;
    }
    if (!btn) return null;
    // Walk up: prefer footer, else an element that also contains skip buttons.
    var el = btn;
    for (var depth = 0; depth < 8 && el && el !== document.body; depth++) {
      el = el.parentElement;
      if (!el) break;
      if (el.tagName === "FOOTER") return el;
      if (el.querySelector) {
        var hasNext =
          el.querySelector('button[data-testid="' + TESTIDS.next + '"]') ||
          el.querySelector('button[aria-label*="Next"]');
        var hasPrev =
          el.querySelector('button[data-testid="' + TESTIDS.prev + '"]') ||
          el.querySelector('button[aria-label*="Previous"]');
        if (hasNext && hasPrev) return el;
      }
    }
    return btn.closest ? btn.closest("footer") || btn.parentElement : null;
  }

  // Bottom-position heuristic: among all Play/Pause toggle buttons, the
  // persistent player one lives near the viewport bottom AND near Next/Prev.
  function rootByPositionHeuristic() {
    var candidates = [];
    try {
      candidates = Array.prototype.slice.call(document.querySelectorAll("button"));
    } catch (e) {
      return null;
    }
    var vh = window.innerHeight || 800;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < candidates.length; i++) {
      var b = candidates[i];
      var label = norm(b.getAttribute("aria-label"));
      var isToggle =
        label === "play" ||
        label === "pause" ||
        /paus/.test(label) ||
        label.indexOf("play") !== -1 ||
        label.indexOf("reproduc") !== -1 ||
        label.indexOf("lecture") !== -1;
      if (!isToggle) continue;
      if (!isVisible(b)) continue;
      var r = b.getBoundingClientRect();
      // Must be in lower half of viewport.
      if (r.top < vh * 0.55) continue;
      // Score: lower on screen + near other transport buttons.
      var scope = b.parentElement && b.parentElement.parentElement
        ? b.parentElement.parentElement
        : b.parentElement;
      var siblingText = scope ? (scope.textContent || "") : "";
      var hasTransportHint =
        scope &&
        scope.querySelector &&
        (scope.querySelector('button[aria-label]') !== null);
      var score = r.top;
      if (hasTransportHint) score += 5000;
      if (/0:\d\d/.test(siblingText)) score += 2000; // time display nearby
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (!best) return null;
    var node = best;
    for (var d = 0; d < 6 && node && node !== document.body; d++) {
      node = node.parentElement;
      if (!node) break;
      if (node.tagName === "FOOTER") return node;
    }
    return best.closest ? best.closest("footer") || best.parentElement : null;
  }

  function findPlayer() {
    // Fast path first: the player root barely moves. If the cached node is
    // still connected and still hosts the play/pause toggle, skip the whole
    // discovery chain (testids, footers, button scans) — this runs ~10x per
    // snapshot, so the saving matters on phone CPUs.
    try {
      if (
        cachedPlayerRoot &&
        document.contains(cachedPlayerRoot) &&
        cachedPlayerRoot.querySelector &&
        cachedPlayerRoot.querySelector('button[data-testid="' + TESTIDS.playpause + '"]')
      ) {
        return cachedPlayerRoot;
      }
    } catch (e) {}
    // 1. Stable semantic anchor (best).
    var bar = byTestId(TESTIDS.playerBar);
    if (bar && isVisible(bar)) {
      cachedPlayerRoot = bar;
      return bar;
    }
    // data-testid may exist but hidden during login/ads — still usable as scope.
    if (bar) {
      cachedPlayerRoot = bar;
      return bar;
    }
    // 2. Footer element (Spotify renders the player as <footer>).
    var footers = [];
    try {
      footers = document.querySelectorAll("footer");
    } catch (e) {
      footers = [];
    }
    for (var i = 0; i < footers.length; i++) {
      // Prefer a footer that contains the play/pause control.
      var f = footers[i];
      if (f.querySelector && f.querySelector('button[data-testid="' + TESTIDS.playpause + '"]')) {
        cachedPlayerRoot = f;
        return f;
      }
    }
    // A lone <footer> is NOT necessarily the player: logged-out pages have
    // a site footer (About / Jobs / … links). Only accept a footer that
    // hosts a Play/Pause toggle, otherwise keep looking (or return null).
    for (var k = 0; k < footers.length; k++) {
      var fb = footers[k];
      if (fb.querySelectorAll) {
        var fbtns = [];
        try {
          fbtns = fb.querySelectorAll("button");
        } catch (e) {
          fbtns = [];
        }
        for (var b = 0; b < fbtns.length; b++) {
          var bl = norm(fbtns[b].getAttribute("aria-label"));
          if (bl === "play" || bl === "pause" || /paus/.test(bl)) {
            cachedPlayerRoot = fb;
            return fb;
          }
        }
      }
    }
    // 3. Ancestor of the known play/pause button.
    var viaBtn = rootFromPlayPauseAncestor();
    if (viaBtn) {
      cachedPlayerRoot = viaBtn;
      return viaBtn;
    }
    // 4. Position heuristic (last resort).
    var viaPos = rootByPositionHeuristic();
    if (viaPos) {
      cachedPlayerRoot = viaPos;
      return viaPos;
    }
    return cachedPlayerRoot && document.contains(cachedPlayerRoot) ? cachedPlayerRoot : null;
  }

  function scopedQuery(selector) {
    var root = findPlayer();
    var el = null;
    if (root && root.querySelector) {
      try {
        el = root.querySelector(selector);
      } catch (e) {
        el = null;
      }
      if (el) return el;
    }
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function scopedAll(selector) {
    var out = [];
    var root = findPlayer();
    if (root && root.querySelectorAll) {
      try {
        out = Array.prototype.slice.call(root.querySelectorAll(selector));
      } catch (e) {
        out = [];
      }
      if (out.length) return out;
    }
    try {
      return Array.prototype.slice.call(document.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  /* ---------- Button discovery (scoped to player) ---------- */

  function findToggleButton() {
    // Canonical: single button whose aria-label flips Play <-> Pause.
    var btn = scopedQuery('button[data-testid="' + TESTIDS.playpause + '"]');
    if (btn) return btn;
    var buttons = scopedAll("button");
    // Prefer buttons inside the player-controls region.
    var controls = byTestId(TESTIDS.controls, findPlayer());
    var ordered = [];
    if (controls) {
      try {
        ordered = Array.prototype.slice.call(controls.querySelectorAll("button"));
      } catch (e) {
        ordered = [];
      }
    }
    var pool = ordered.length ? ordered : buttons;
    // First pass: exact Play/Pause labels in player scope.
    for (var i = 0; i < pool.length; i++) {
      var label = norm(pool[i].getAttribute("aria-label"));
      if (label === "play" || label === "pause") return pool[i];
    }
    // Second pass: localized toggle labels near bottom.
    var vh = window.innerHeight || 800;
    for (var j = 0; j < pool.length; j++) {
      var b = pool[j];
      var l = norm(b.getAttribute("aria-label"));
      if (!l) continue;
      var looksToggle =
        /paus/.test(l) ||
        l.indexOf("play") !== -1 ||
        l.indexOf("reproduc") !== -1 ||
        l.indexOf("lecture") !== -1 ||
        l.indexOf("wiedergabe") !== -1;
      if (!looksToggle) continue;
      if (!isVisible(b)) continue;
      var r = b.getBoundingClientRect();
      if (r.top > vh * 0.4) return b;
    }
    return null;
  }

  function findPlayerButton(kind) {
    var testidMap = {
      previous: TESTIDS.prev,
      next: TESTIDS.next,
      shuffle: TESTIDS.shuffle,
      repeat: TESTIDS.repeat,
    };
    if (kind === "play") return findToggleButton();
    var tid = testidMap[kind];
    if (tid) {
      var direct = scopedQuery('button[data-testid="' + tid + '"]');
      if (direct) return direct;
    }
    var keywords = LABELS[kind] || [];
    var buttons = scopedAll("button");
    // Scoped exact-ish match first.
    for (var i = 0; i < buttons.length; i++) {
      var label = buttons[i].getAttribute("aria-label") || "";
      if (includesAny(label, keywords)) return buttons[i];
    }
    // Structural fallback for prev/next: neighbours of the toggle button.
    if (kind === "previous" || kind === "next") {
      var toggle = findToggleButton();
      if (toggle && toggle.parentElement) {
        var siblings = Array.prototype.slice.call(
          toggle.parentElement.querySelectorAll("button")
        );
        var idx = siblings.indexOf(toggle);
        if (idx !== -1) {
          if (kind === "previous" && siblings[idx - 1]) return siblings[idx - 1];
          if (kind === "next" && siblings[idx + 1]) return siblings[idx + 1];
        }
      }
    }
    return null;
  }

  function findLikeButton() {
    // Search the widget first, then the whole player bar: the toggle lives
    // in the widget in current builds, but a sibling placement must not
    // silently kill Likes. Scoped tightly on purpose — a document-wide
    // first match could be some unrelated button.
    var scopes = [];
    var likeWidget = findWidget();
    if (likeWidget) scopes.push(likeWidget);
    var likePlayer = findPlayer();
    if (likePlayer && likePlayer !== likeWidget) scopes.push(likePlayer);
    function labelOf(btn) {
      var label = "";
      var title = "";
      try {
        label = btn.getAttribute("aria-label") || "";
        title = btn.getAttribute("title") || "";
      } catch (e) {}
      return norm(label + " " + title);
    }
    // Dedicated testid first (Spotify's like toggle in the widget).
    for (var s = 0; s < scopes.length; s++) {
      var scopeRoot = scopes[s];
      if (scopeRoot.querySelector) {
        var byTid = null;
        try {
          byTid = scopeRoot.querySelector('button[data-testid="add-button"]');
        } catch (e) {
          byTid = null;
        }
        if (byTid) return byTid;
      }
    }
    // Otherwise any button in those scopes mentioning like.
    // Strong phrases first, then a bare "like" (never "dislike": podcast
    // thumbs-down contains "like" but means the opposite).
    var strong = LABELS.likeAdd.concat(LABELS.likeRemove);
    for (var a = 0; a < scopes.length; a++) {
      var btns = [];
      try {
        btns = Array.prototype.slice.call(scopes[a].querySelectorAll("button"));
      } catch (e) {
        btns = [];
      }
      for (var i = 0; i < btns.length; i++) {
        if (includesAny(labelOf(btns[i]), strong)) return btns[i];
      }
    }
    for (var b = 0; b < scopes.length; b++) {
      var btns2 = [];
      try {
        btns2 = Array.prototype.slice.call(scopes[b].querySelectorAll("button"));
      } catch (e2) {
        btns2 = [];
      }
      for (var j = 0; j < btns2.length; j++) {
        var lj = labelOf(btns2[j]);
        if (lj && lj.indexOf("like") !== -1 && lj.indexOf("dislike") === -1) {
          return btns2[j];
        }
      }
    }
    return null;
  }

  function findSideButton(kind) {
    // Lyrics / Queue / Device live on the right side of the player bar.
    var root = findPlayer();
    var keywords = LABELS[kind] || [];
    var btns = scopedAll("button");
    for (var i = 0; i < btns.length; i++) {
      var label = btns[i].getAttribute("aria-label") || "";
      var title = btns[i].getAttribute("title") || "";
      if (includesAny(label, keywords) || includesAny(title, keywords)) {
        // Avoid matching track-list buttons: side buttons live inside player root.
        if (!root || root.contains(btns[i])) return btns[i];
      }
    }
    // data-testid fallbacks observed in the wild.
    var tidGuesses =
      kind === "queue"
        ? ["control-button-queue", "queue-button"]
        : kind === "lyrics"
          ? ["control-button-lyrics", "lyrics-button"]
          : ["control-button-connect", "connect-button", "control-button-npv"];
    for (var t = 0; t < tidGuesses.length; t++) {
      var el = scopedQuery('button[data-testid="' + tidGuesses[t] + '"]');
      if (el) return el;
    }
    if (kind === "device" && root) {
      var npv = root.querySelector('button[data-testid="' + TESTIDS.npv + '"]');
      if (npv) return npv;
    }
    return null;
  }

  function findWidget() {
    return (
      byTestId(TESTIDS.widget) ||
      (function () {
        var root = findPlayer();
        if (root && root.querySelector) {
          var img = root.querySelector('img[data-testid="' + TESTIDS.coverArt + '"]');
          if (img && img.closest) {
            // Widget is the left cluster containing artwork + title.
            var c = img;
            for (var d = 0; d < 5 && c && c !== root; d++) {
              c = c.parentElement;
              if (c && c.querySelector && c.querySelector("a")) return c;
            }
          }
        }
        return null;
      })()
    );
  }

  /* ---------- Track / artwork ---------- */

  function findTrackElement() {
    var widget = findWidget() || findPlayer();
    if (!widget || !widget.querySelector) return null;
    // Never fall back to a bare <a>: on pages without a loaded track that
    // happily matches site-chrome links (About, Jobs, …). Only track-like
    // targets count (songs + podcast episodes).
    return (
      widget.querySelector('[data-testid="' + TESTIDS.contextLink + '"]') ||
      widget.querySelector('a[href*="/track/"], a[href*="/episode/"]')
    );
  }

  function findArtistElement() {
    var widget = findWidget() || findPlayer();
    if (!widget || !widget.querySelectorAll) return null;
    // Artists link to /artist/, podcasts to their /show/. Anything else
    // (bare links, stray spans) is site chrome, not the performer.
    var artistLink = widget.querySelector('a[href*="/artist/"], a[href*="/show/"]');
    if (!artistLink) return null;
    var trackEl = findTrackElement();
    var p = artistLink.parentElement;
    // Parent usually holds the full "Artist1, Artist2" text — unless it is
    // the widget itself or also wraps the track title (then it is a blob).
    if (p && p !== widget && !(trackEl && p.contains && p.contains(trackEl))) {
      return p;
    }
    return artistLink;
  }

  /* ---------- Artwork: multi-source, best-quality ----------
   *
   * Spotify exposes the current track's artwork in several places at
   * different resolutions:
   *  1. navigator.mediaSession.metadata.artwork — sized entries
   *     (usually 64 / 300 / 640). Authoritative for the current track,
   *     no DOM scraping needed. This is what feeds OS/Chrome media hubs.
   *  2. The persistent player bar widget (img[data-testid="cover-art-image"],
   *     typically rendered ~64px, often a low-res file).
   *  3. The "Now Playing View" cover (img[data-testid="cover-art-image"]
   *     inside NPV_Panel_OpenDiv) — rendered much larger.
   *  4. Any other i.scdn.co/image/ <img> in the document (entity headers,
   *     cards…). These are NOT trusted unless their URL matches an image
   *     already confirmed as the current track's (same file = same pixels).
   *
   * Rules: never rewrite/fabricate image URLs (i.scdn.co URLs carry no size
   * parameter, so guessing variants would be upscaling by another name).
   * Only rank URLs Spotify actually provided. Prefer srcset's largest entry.
   *
   * STABILITY (learned the hard way): the NPV panel also contains big
   * ARTIST photos ("About the artist"). Those must never become candidates,
   * so the panel contributes ONLY cover-art-testid images — never a generic
   * <img> fallback. Selection pins the FIRST cover per track: during the
   * first seconds (page still loading, mediaSession/NPV arriving late) a
   * better source may still win; afterwards the pin freezes so a late,
   * larger artist variant can never steal the slot mid-track.
   */

  var FULL_SWEEP_TTL_MS = 15000;
  var ART_UPGRADE_WINDOW_MS = 10000;
  var lastArtKey = "";
  var lastFullSweepAt = 0;
  var lastQuickSig = "";
  var artPin = { key: "", url: "", pinnedAt: 0 };

  function parseSizesWidth(s) {
    var m = String(s || "").match(/(\d+)\s*[x\u00d7]\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // "url640 640w, url320 320w" -> { url, width } of the largest entry.
  function parseSrcsetBest(srcset) {
    var best = { url: "", width: 0 };
    if (!srcset) return best;
    var parts = String(srcset).split(",");
    for (var i = 0; i < parts.length; i++) {
      var tokens = parts[i].trim().split(/\s+/);
      if (!tokens[0]) continue;
      var url = tokens[0];
      var w = 0;
      for (var t = 1; t < tokens.length; t++) {
        var wm = tokens[t].match(/^(\d+)w$/);
        if (wm) w = Math.max(w, parseInt(wm[1], 10));
      }
      if (w > best.width) best = { url: url, width: w };
      else if (!best.url) best = { url: url, width: w };
    }
    return best;
  }

  function ancestorSummary(el, depth) {
    var chain = [];
    var node = el;
    for (var d = 0; d < (depth || 4) && node && node.tagName; d++) {
      var desc = node.tagName.toLowerCase();
      try {
        var tid = node.getAttribute && node.getAttribute("data-testid");
        var aria = node.getAttribute && node.getAttribute("aria-label");
        if (tid) desc += '[data-testid="' + tid + '"]';
        else if (aria) desc += '[aria-label="' + String(aria).slice(0, 40) + '"]';
      } catch (e) {}
      chain.push(desc);
      node = node.parentElement;
    }
    return chain.join(" < ");
  }

  function mediaSessionCandidates() {
    var out = [];
    try {
      var nav = window.navigator || navigator;
      if (!nav || !nav.mediaSession || !nav.mediaSession.metadata) return out;
      var art = nav.mediaSession.metadata.artwork || [];
      for (var i = 0; i < art.length; i++) {
        if (!art[i] || !art[i].src) continue;
        out.push({
          source: "mediaSession:" + (art[i].sizes || "?"),
          src: art[i].src,
          sizesW: parseSizesWidth(art[i].sizes),
          naturalWidth: 0,
          confirmed: true,
        });
      }
    } catch (e) {}
    return out;
  }

  function imgRecord(img, source, withRect) {
    var src = "";
    var srcset = "";
    var alt = "";
    try {
      src = img.currentSrc || img.src || "";
      srcset = img.getAttribute ? img.getAttribute("srcset") || "" : "";
      alt = img.getAttribute ? img.getAttribute("alt") || "" : "";
    } catch (e) {}
    var best = parseSrcsetBest(srcset);
    var rec = {
      source: source,
      src: best.url || src,
      rawSrc: src,
      srcset: srcset,
      srcsetBest: best.width,
      naturalWidth: 0,
      naturalHeight: 0,
      renderedWidth: 0,
      renderedHeight: 0,
      alt: alt,
      ancestors: "",
      confirmed: source !== "elsewhere",
    };
    try {
      rec.naturalWidth = img.naturalWidth || 0;
      rec.naturalHeight = img.naturalHeight || 0;
    } catch (e) {}
    if (withRect) {
      try {
        var r = img.getBoundingClientRect();
        rec.renderedWidth = Math.round(r.width);
        rec.renderedHeight = Math.round(r.height);
        rec.ancestors = ancestorSummary(img, 5);
      } catch (e) {}
    }
    return rec;
  }

  function queryAllCapped(root, selector, cap) {
    try {
      if (!root || !root.querySelectorAll) return [];
      return Array.prototype.slice.call(root.querySelectorAll(selector), 0, cap || 60);
    } catch (e) {
      return [];
    }
  }

  // Cover-art images under a root. The player bar is track-specific (no
  // artist photos live there), so a generic <img> fallback is safe for it.
  // The NPV panel is NOT: it embeds artist photography, so it contributes
  // strictly cover-art-testid images or nothing at all.
  function coverImgs(root, cap, allowFallback) {
    var byTestid = queryAllCapped(
      root,
      'img[data-testid="' + TESTIDS.coverArt + '"]',
      cap
    );
    if (byTestid.length || !allowFallback) return byTestid;
    return queryAllCapped(root, "img", cap);
  }

  // Quick sweep: cheap scoped lookups, safe to run on every snapshot.
  function quickArtworkRecords() {
    var recs = mediaSessionCandidates();
    var root = findPlayer();
    if (root) {
      var imgs = coverImgs(root, 10, true);
      for (var i = 0; i < imgs.length; i++) {
        recs.push(imgRecord(imgs[i], "now-playing-bar", false));
      }
    }
    var panel = findNowPlayingPanel();
    if (panel && panel !== root) {
      var pimgs = coverImgs(panel, 10, false);
      for (var j = 0; j < pimgs.length; j++) {
        recs.push(imgRecord(pimgs[j], "now-playing-view", false));
      }
    }
    return recs;
  }

  function findNowPlayingPanel() {
    var panel = null;
    try {
      panel = document.querySelector('[data-testid="' + TESTIDS.npvPanel + '"]');
    } catch (e) {
      panel = null;
    }
    if (panel) return panel;
    // Fallback: aside/section labelled "Now playing" (desktop sidebar).
    try {
      var labelled = document.querySelectorAll(
        'aside[aria-label], section[aria-label], div[aria-label]'
      );
      for (var i = 0; i < labelled.length; i++) {
        var label = norm(labelled[i].getAttribute("aria-label"));
        if (label.indexOf("now playing") !== -1) {
          if (labelled[i].querySelector && labelled[i].querySelector("img")) {
            return labelled[i];
          }
        }
      }
    } catch (e) {}
    return null;
  }

  // Full sweep: quick sweep + document-wide i.scdn.co images. Only trusted
  // when the URL matches an already-confirmed current-track image.
  function fullArtworkRecords() {
    var recs = quickArtworkRecords();
    var confirmedUrls = {};
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].src) confirmedUrls[recs[i].src] = true;
      if (recs[i].rawSrc) confirmedUrls[recs[i].rawSrc] = true;
    }
    var all = [];
    try {
      all = queryAllCapped(document, 'img[src*="i.scdn.co/image/"]', 60);
    } catch (e) {
      all = [];
    }
    for (var j = 0; j < all.length; j++) {
      var rec = imgRecord(all[j], "elsewhere", false);
      var url = rec.src || rec.rawSrc;
      if (!url || confirmedUrls[url]) continue; // already covered above
      rec.confirmed = false;
      recs.push(rec);
    }
    return recs;
  }

  function artworkRank(rec) {
    // Real decoded pixels first, srcset/sizes claims second.
    if (rec.naturalWidth > 0) return rec.naturalWidth;
    if (rec.srcsetBest > 0) return Math.round(rec.srcsetBest * 0.9);
    if (rec.sizesW > 0) return Math.round(rec.sizesW * 0.9);
    return 0;
  }

  function sourcePriority(rec) {
    // mediaSession is authoritative track art with a DOM-churn-proof URL.
    if (rec.source.indexOf("mediaSession") === 0) return 4;
    if (rec.source.indexOf("now-playing") === 0) return 3;
    if (!rec.confirmed) return 0;
    return 1;
  }

  function rankArtwork(recs) {
    var scored = [];
    for (var i = 0; i < recs.length; i++) {
      var url = recs[i].src || recs[i].rawSrc;
      if (!url) continue;
      if (!recs[i].confirmed) continue; // diagnostics may show them; never select
      scored.push({ rec: recs[i], url: url, rank: artworkRank(recs[i]), pri: sourcePriority(recs[i]) });
    }
    scored.sort(function (a, b) {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return b.pri - a.pri;
    });
    return scored;
  }

  function currentTrackKey() {
    var t = "";
    var a = "";
    try {
      var tel = findTrackElement();
      var ael = findArtistElement();
      t = tel ? (tel.textContent || "").trim() : "";
      a = ael ? (ael.textContent || "").trim() : "";
    } catch (e) {}
    return t + " | " + a;
  }

  function selectBestArtwork() {
    var key = currentTrackKey();
    var hasTrack = key !== " | ";
    var now = Date.now();
    var quick = quickArtworkRecords();
    var sig = "";
    for (var i = 0; i < quick.length; i++) {
      sig += (quick[i].src || quick[i].rawSrc || "") + "#" + (quick[i].naturalWidth || 0) + ";";
    }
    var needFull =
      key !== lastArtKey ||
      sig !== lastQuickSig ||
      now - lastFullSweepAt > FULL_SWEEP_TTL_MS;
    var recs = quick;
    if (needFull) {
      recs = fullArtworkRecords();
      lastFullSweepAt = now;
      if (hasTrack) lastArtKey = key;
    }
    lastQuickSig = sig;
    var ranked = rankArtwork(recs);
    if (!ranked.length) {
      // Transient DOM gap: keep showing the pin rather than blanking.
      return { url: artPin.url || "", recs: recs };
    }
    // Empty/transient key (React mid-swap): never (re)pin, keep the pin.
    if (!hasTrack) {
      return { url: artPin.url || ranked[0].url, recs: recs };
    }
    // First sighting of this track: pin the best available right away.
    if (artPin.key !== key) {
      artPin = { key: key, url: ranked[0].url, pinnedAt: now };
      return { url: ranked[0].url, recs: recs };
    }
    // Same track, page still loading (mediaSession/NPV arrive late):
    // a better source may still win — but only a CLEARLY better one.
    // Ranks wobble while images decode (naturalWidth 0 -> real), so freely
    // re-pinning flip-flops between equivalent same-pixel URLs and the
    // cover blinks in card AND mini simultaneously. Hysteresis: dethrone
    // the pin only at 1.5x rank (a genuine resolution upgrade).
    if (now - artPin.pinnedAt < ART_UPGRADE_WINDOW_MS) {
      var pinRank = -1;
      for (var pj = 0; pj < ranked.length; pj++) {
        if (ranked[pj].url === artPin.url) {
          pinRank = ranked[pj].rank;
          break;
        }
      }
      if (pinRank < 0 || ranked[0].rank >= pinRank * 1.5) {
        artPin.url = ranked[0].url;
      }
      return { url: artPin.url, recs: recs };
    }
    for (var j = 0; j < ranked.length; j++) {
      if (ranked[j].url === artPin.url) {
        return { url: artPin.url, recs: recs };
      }
    }
    // Pinned URL vanished entirely (rare): re-pin the fresh best.
    artPin.url = ranked[0].url;
    return { url: ranked[0].url, recs: recs };
  }

  /**
   * Diagnostic: all discovered artwork sources for the current track,
   * sorted best-first, with resolutions. Unconfirmed lookalikes from
   * elsewhere in the page are included with confirmed:false (never
   * auto-selected) to aid debugging.
   */
  function getArtworkCandidates() {
    var recs = fullArtworkRecords();
    // Attach rendered dims + ancestor info for the shortlist only, so this
    // stays cheap even on huge pages. Re-resolve live elements by URL.
    var ranked = rankArtwork(recs);
    var out = [];
    var seen = {};
    function push(rec, confirmed) {
      var url = rec.src || rec.rawSrc;
      if (!url || seen[url]) return;
      seen[url] = true;
      out.push({
        source: rec.source,
        url: url,
        srcset: rec.srcset || "",
        naturalWidth: rec.naturalWidth || 0,
        naturalHeight: rec.naturalHeight || 0,
        renderedWidth: rec.renderedWidth || 0,
        renderedHeight: rec.renderedHeight || 0,
        alt: rec.alt || "",
        ancestors: rec.ancestors || "",
        rank: artworkRank(rec),
        confirmed: !!confirmed,
      });
    }
    // Confirmed first (ranked), then unconfirmed lookalikes for context.
    for (var i = 0; i < ranked.length; i++) push(ranked[i].rec, true);
    for (var j = 0; j < recs.length; j++) {
      if (!recs[j].confirmed) push(recs[j], false);
    }
    // Fill rendered dims for the top confirmed candidates via live lookup.
    try {
      var live = queryAllCapped(document, 'img[src*="i.scdn.co/image/"]', 60);
      var byUrl = {};
      for (var k = 0; k < live.length; k++) {
        var u = "";
        try {
          u = live[k].currentSrc || live[k].src || "";
        } catch (e) {}
        if (u && !byUrl[u]) byUrl[u] = live[k];
      }
      for (var m = 0; m < out.length && m < 12; m++) {
        var el = byUrl[out[m].url];
        if (!el) continue;
        try {
          var r = el.getBoundingClientRect();
          out[m].renderedWidth = Math.round(r.width);
          out[m].renderedHeight = Math.round(r.height);
          out[m].ancestors = ancestorSummary(el, 5);
          if (!out[m].naturalWidth) {
            out[m].naturalWidth = el.naturalWidth || 0;
            out[m].naturalHeight = el.naturalHeight || 0;
            out[m].rank = artworkRank(out[m]);
          }
        } catch (e) {}
      }
      out.sort(function (a, b) {
        if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
        return b.rank - a.rank;
      });
    } catch (e) {}
    return out;
  }

  function findArtworkElement() {
    // Legacy single-element lookup (kept for compatibility). New code
    // should use getArtwork()/getArtworkCandidates() instead.
    var root = findPlayer();
    var img =
      (root && root.querySelector
        ? root.querySelector('img[data-testid="' + TESTIDS.coverArt + '"]')
        : null) ||
      scopedQuery('img[data-testid="' + TESTIDS.coverArt + '"]');
    if (img) return img;
    var widget = findWidget();
    if (widget && widget.querySelector) {
      var anyImg = widget.querySelector("img");
      if (anyImg) return anyImg;
    }
    return null;
  }

  /* ---------- Sliders (progress / volume) ---------- */

  function findProgressSlider() {
    var root = findPlayer();
    var bar =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.progressBar + '"]')
        : null) || byTestId(TESTIDS.progressBar);
    if (bar) {
      var input = bar.querySelector ? bar.querySelector('input[type="range"]') : null;
      if (input) return input;
      var slider = bar.querySelector ? bar.querySelector('[role="slider"]') : null;
      if (slider) return slider;
    }
    // Fallback: slider near time displays inside player.
    if (root && root.querySelectorAll) {
      var ranges = root.querySelectorAll('input[type="range"]');
      for (var i = 0; i < ranges.length; i++) {
        var aria = norm(ranges[i].getAttribute("aria-label"));
        if (!includesAny(aria, LABELS.volume)) return ranges[i];
      }
      if (ranges.length) return ranges[0];
      var roles = root.querySelectorAll('[role="slider"]');
      for (var j = 0; j < roles.length; j++) {
        var ra = norm(roles[j].getAttribute("aria-label"));
        if (!includesAny(ra, LABELS.volume)) return roles[j];
      }
    }
    return null;
  }

  function findVolumeSlider() {
    var root = findPlayer();
    var bar =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.volumeBar + '"]')
        : null) || byTestId(TESTIDS.volumeBar);
    if (bar && bar.querySelector) {
      var input = bar.querySelector('input[type="range"]') || bar.querySelector('[role="slider"]');
      if (input) return input;
    }
    if (root && root.querySelectorAll) {
      var ranges = root.querySelectorAll('input[type="range"]');
      for (var i = 0; i < ranges.length; i++) {
        var aria = norm(ranges[i].getAttribute("aria-label"));
        if (includesAny(aria, LABELS.volume) || includesAny(aria, LABELS.mute)) return ranges[i];
      }
      // Convention: volume is the LAST range slider in the player bar.
      if (ranges.length > 1) return ranges[ranges.length - 1];
    }
    return null;
  }

  function findMuteButton() {
    var root = findPlayer();
    var btns = scopedAll("button");
    for (var i = 0; i < btns.length; i++) {
      var label = norm(btns[i].getAttribute("aria-label"));
      if (includesAny(label, LABELS.mute) || includesAny(label, LABELS.unmute)) {
        // Must be near the volume slider to avoid false positives.
        if (!root || root.contains(btns[i])) return btns[i];
      }
    }
    return null;
  }

  function sliderNumbers(el) {
    if (!el) return null;
    var now = el.getAttribute("aria-valuenow");
    var max = el.getAttribute("aria-valuemax");
    var text = el.getAttribute("aria-valuetext");
    if (now !== null || max !== null) {
      return { now: parseFloat(now), max: parseFloat(max), text: text };
    }
    if (el.tagName === "INPUT") {
      return {
        now: parseFloat(el.value),
        max: parseFloat(el.max || el.getAttribute("max")),
        text: null,
      };
    }
    return null;
  }

  function parseTimeString(s) {
    if (!s) return NaN;
    var m = String(s).match(/(\d+):(\d{2})(?::(\d{2}))?/);
    if (!m) return NaN;
    if (m[3] !== undefined) {
      return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    }
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function findTimeTexts() {
    var root = findPlayer();
    var posEl =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.progressPosition + '"]')
        : null) || byTestId(TESTIDS.progressPosition);
    var durEl =
      (root && root.querySelector
        ? root.querySelector('[data-testid="' + TESTIDS.progressDuration + '"]')
        : null) || byTestId(TESTIDS.progressDuration);
    if (posEl || durEl) return { posEl: posEl, durEl: durEl };
    // Fallback: collect time-like texts inside the player.
    if (root && root.querySelectorAll) {
      var all = root.querySelectorAll("span, div");
      var times = [];
      for (var i = 0; i < all.length; i++) {
        var t = (all[i].textContent || "").trim();
        if (/^-?\d+:\d{2}$/.test(t) && (all[i].childElementCount === 0)) {
          times.push(all[i]);
        }
      }
      if (times.length >= 2) return { posEl: times[0], durEl: times[times.length - 1] };
      if (times.length === 1) return { posEl: times[0], durEl: null };
    }
    return { posEl: null, durEl: null };
  }

  /* ---------- Read state ---------- */

  function getDuration() {
    var slider = findProgressSlider();
    var nums = sliderNumbers(slider);
    if (nums && isFinite(nums.max) && nums.max > 0) {
      // Spotify progress uses milliseconds.
      if (nums.max > 1000) return Math.round(nums.max / 1000);
      return Math.round(nums.max);
    }
    var texts = findTimeTexts();
    if (texts.durEl) {
      var d = parseTimeString(texts.durEl.textContent);
      if (isFinite(d)) return d;
    }
    // Slider text fallback: "0:42 of 3:21".
    if (nums && nums.text) {
      var parts = String(nums.text).match(/(\d+:\d{2}).*?(\d+:\d{2})/);
      if (parts) {
        var dd = parseTimeString(parts[2]);
        if (isFinite(dd)) return dd;
      }
    }
    return 0;
  }

  function getCurrentTime() {
    var slider = findProgressSlider();
    var nums = sliderNumbers(slider);
    var dur = getDuration();
    if (nums && isFinite(nums.now)) {
      if (nums.max > 1000) return Math.min(Math.round(nums.now / 1000), dur || 1e9);
      // Volume-like 0..1 sliders are never returned here, but guard anyway.
      if (nums.max <= 2 && dur > 10) return Math.round(nums.now * dur);
      return Math.round(nums.now);
    }
    var texts = findTimeTexts();
    if (texts.posEl) {
      var t = parseTimeString(texts.posEl.textContent);
      if (isFinite(t)) return t;
    }
    return 0;
  }

  // Last confident play-state. The toggle button can vanish for a frame while
  // React re-renders around it (e.g. right after a Like/menu open), and a
  // single missing/unreadable read must not flap halos, ticker and icons off
  // and back on — the reported "blobs start when I press the heart".
  var lastPlaying = false;
  var lastPlayingSet = false;
  function isPlaying() {
    var btn = null;
    try {
      btn = findToggleButton();
    } catch (e) {
      btn = null;
    }
    // Transient DOM gap (player re-rendering around an unrelated action):
    // hold the last confident value instead of inventing a pause.
    if (!btn) return lastPlayingSet ? lastPlaying : false;
    var label = "";
    try {
      label = norm(btn.getAttribute("aria-label"));
    } catch (e) {
      label = "";
    }
    if (/paus/.test(label)) {
      lastPlaying = true;
      lastPlayingSet = true;
      return true; // Pause/Pausa/Pausar/... => currently playing
    }
    if (
      label === "play" ||
      label.indexOf("play") !== -1 ||
      label.indexOf("reproduc") !== -1 ||
      label.indexOf("reproduz") !== -1 ||
      label.indexOf("lecture") !== -1 ||
      label.indexOf("abspielen") !== -1 ||
      label.indexOf("wiedergabe") !== -1
    ) {
      lastPlaying = false;
      lastPlayingSet = true;
      return false;
    }
    // Unknown label/locale (or empty during a swap): do not invent a flip —
    // hold the last confident value; unknown-before-ever-known stays paused.
    return lastPlayingSet ? lastPlaying : false;
  }

  /* ---------- Direct play-state mirror ----------
   *
   * The snapshot pipeline (MutationObserver -> 150ms debounce -> full
   * getSnapshot -> render) is the wrong channel for the play/pause icon: it
   * lags the real flip, and every intermediate snapshot (optimistic paint,
   * stale paused read, confirmed playing) becomes a visible flap —
   * play -> pause -> play in quick succession. The icon must mirror
   * Spotify's OWN toggle button instead: one dedicated observer watches just
   * that button's aria-label and reports flips immediately, with none of the
   * invented middle states (optimistic guesses, sticky holds, debounce merges).
   * A flip is only ever delivered when the live button actually flipped.
   *
   * - readToggleState(): 'playing' | 'paused' | 'unknown'. Unknown means the
   *   button is missing/unreadable right now — callers must HOLD, never guess.
   * - getPlayState(): true | false | null (null = unknown).
   * - watchPlayState(cb): cb(true/false) on every real flip, instantly.
   *   React replaces the button node across renders, so the watched reference
   *   is re-resolved whenever the subtree changes. Returns an unwatch fn.
   */
  function readToggleState() {
    var btn = null;
    try {
      btn = findToggleButton();
    } catch (e) {
      btn = null;
    }
    if (!btn) return "unknown";
    var label = "";
    try {
      label = norm(btn.getAttribute("aria-label"));
    } catch (e) {
      label = "";
    }
    if (/paus/.test(label)) return "playing";
    if (
      label === "play" ||
      label.indexOf("play") !== -1 ||
      label.indexOf("reproduc") !== -1 ||
      label.indexOf("reproduz") !== -1 ||
      label.indexOf("lecture") !== -1 ||
      label.indexOf("abspielen") !== -1 ||
      label.indexOf("wiedergabe") !== -1
    ) {
      return "paused";
    }
    return "unknown";
  }

  function getPlayState() {
    var s = null;
    try {
      s = readToggleState();
    } catch (e) {
      s = "unknown";
    }
    return s === "playing" ? true : s === "paused" ? false : null;
  }

  var playSubs = [];
  var playObserver = null;
  var playObserverStarted = false;
  var watchedToggleBtn = null;
  var lastDeliveredPlay = null; // true | false | null (nothing delivered yet)

  function deliverPlayState() {
    var s = null;
    try {
      s = getPlayState();
    } catch (e) {
      s = null;
    }
    // Unknown (button mid-swap): hold the last delivered state. Delivering
    // anything here would invent exactly the flap this watcher exists to kill.
    if (s === null) return;
    try {
      watchedToggleBtn = findToggleButton();
    } catch (e2) {}
    if (lastDeliveredPlay !== null && s === lastDeliveredPlay) return;
    lastDeliveredPlay = s;
    for (var i = 0; i < playSubs.length; i++) {
      try {
        playSubs[i](s);
      } catch (e3) {
        reportSubscriberError(e3);
      }
    }
  }

  function playBatch(mutations) {
    var maybeFlip = false;
    var structureChanged = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (
        m.type === "attributes" &&
        m.attributeName === "aria-label" &&
        m.target === watchedToggleBtn
      ) {
        maybeFlip = true;
        break;
      }
      if (m.type === "childList") structureChanged = true;
    }
    // Node replacement: re-resolve only when the watched node is actually
    // gone (identity + containment checks are cheap; findToggleButton is not
    // run on every batch).
    if (structureChanged && (!watchedToggleBtn || !document.contains(watchedToggleBtn))) {
      try {
        watchedToggleBtn = findToggleButton();
      } catch (e) {
        watchedToggleBtn = null;
      }
    }
    if (maybeFlip || structureChanged) deliverPlayState();
  }

  function startPlayObserver() {
    if (playObserverStarted) return;
    playObserverStarted = true;
    try {
      watchedToggleBtn = findToggleButton();
    } catch (e) {
      watchedToggleBtn = null;
    }
    try {
      var s0 = getPlayState();
      if (s0 !== null) lastDeliveredPlay = s0;
    } catch (e2) {}
    try {
      playObserver = new MutationObserver(playBatch);
      playObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["aria-label"],
        childList: true,
        subtree: true,
      });
    } catch (e3) {
      playObserver = null;
    }
  }

  function watchPlayState(cb) {
    if (typeof cb !== "function") return function () {};
    startPlayObserver();
    // Resolve now too: the button may already exist (or appear between our
    // resolve and the observer's first batch), so seed delivery is instant.
    try {
      watchedToggleBtn = findToggleButton();
    } catch (e) {}
    playSubs.push(cb);
    // No synchronous seed delivery: the UI seeds via getPlayState() and the
    // observer delivers every later flip. (Delivering here as well would just
    // repaint the same state twice.)
    return function () {
      for (var i = playSubs.length - 1; i >= 0; i--) {
        if (playSubs[i] === cb) playSubs.splice(i, 1);
      }
    };
  }

  function isShuffleEnabled() {
    var btn = findPlayerButton("shuffle");
    if (!btn) return false;
    var checked = btn.getAttribute("aria-checked");
    if (checked !== null) return checked === "true";
    var active = btn.getAttribute("data-active");
    if (active !== null) return active === "true";
    var label = norm(btn.getAttribute("aria-label"));
    // When shuffle is ON, Spotify offers to disable it.
    if (label.indexOf("disable") !== -1 || label.indexOf("desactivar") !== -1 ||
        label.indexOf("désactiver") !== -1 || label.indexOf("deaktivieren") !== -1) {
      return true;
    }
    return false;
  }

  function getRepeatMode() {
    var btn = findPlayerButton("repeat");
    if (!btn) return "off";
    var checked = btn.getAttribute("aria-checked");
    // Some builds: aria-checked false=off, true=context, mixed=track.
    if (checked === "mixed") return "track";
    if (checked === "true") return "context";
    var label = norm(btn.getAttribute("aria-label"));
    if (label.indexOf("disable") !== -1 || label.indexOf("desactivar") !== -1 ||
        label.indexOf("désactiver") !== -1 || label.indexOf("deaktivieren") !== -1) {
      return "track";
    }
    if (label.indexOf("one") !== -1 || label.indexOf("uno") !== -1 || label.indexOf("un seul") !== -1) {
      return "context"; // offers "repeat one" => currently repeating context
    }
    if (checked !== null) return checked === "true" ? "context" : "off";
    return "off";
  }

  // Reads the + button's icon itself: unsaved shows plus strokes (paths
  // with horizontal AND vertical segments, e.g. "M12 5v14M5 12h14"), saved
  // shows a lone check angle ("M20 6L9 17l-5-5", polyline) or a filled
  // glyph. Only a last resort — attributes and labels decide first.
  function iconShape(btn) {
    try {
      var svg = btn && btn.querySelector ? btn.querySelector("svg") : null;
      if (!svg) return "none";
      var rootFill = "";
      try {
        rootFill = svg.getAttribute ? svg.getAttribute("fill") || "" : "";
      } catch (e) {}
      var mark = "";
      try {
        mark = String(svg.outerHTML || svg.innerHTML || "").toLowerCase();
      } catch (e) {}
      if (!mark) return "unknown";
      var hasH = /h\s*-?\d/i.test(mark);
      var hasV = /v\s*-?\d/i.test(mark);
      if (hasH && hasV) return "plus";
      if (rootFill && rootFill.toLowerCase() !== "none") return "filled";
      if (mark.indexOf("polyline") !== -1) return "check";
      if (/[lL]\s*-?\d/.test(mark) && !/[cqsta]\s*-?\d/i.test(mark)) return "check";
      return "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  function isLiked() {
    // Authoritative first: the bottom-bar curation button's own tristate
    // (aria-checked false = "Add to Liked Songs", true = saved).
    try {
      var cur = curationLikedState();
      if (cur !== null) return cur;
    } catch (e) {}
    var btn = findLikeButton();
    if (!btn) return false;
    // Whatever tristate attribute Spotify uses wins over label guessing.
    var checked = btn.getAttribute("aria-checked");
    if (checked !== null) return checked === "true";
    var pressed = btn.getAttribute("aria-pressed");
    if (pressed !== null) return pressed === "true";
    var active = btn.getAttribute("data-active");
    if (active !== null) return active === "true";
    var label = norm(btn.getAttribute("aria-label"));
    if (includesAny(label, LABELS.likeRemove)) return true;
    if (includesAny(label, LABELS.likeAdd)) return false;
    // Last resort on an already-identified like button: labels promising
    // removal ("unsave", "retirer", "saved", "added", …) mean it is saved.
    if (/\b(remove|removed|unsave|unsaved|saved|added|retirer|quitar|entfernen|rimuovi|remover)\b/.test(label)) {
      return true;
    }
    // Final fallback: mimic the + icon's own visual state.
    var shape = iconShape(btn);
    if (shape === "plus") return false;
    if (shape === "check" || shape === "filled") return true;
    return false;
  }

  /**
   * Diagnostic for like-state mismatches: reports the exact button the
   * adapter selected (or null), what it claims, and every like-mentioning
   * button in scope. Paste the output when the heart disagrees with Spotify.
   */
  function getLikeInfo() {
    function describe(btn) {
      var out = {
        tag: null,
        testid: null,
        label: null,
        title: null,
        checked: null,
        pressed: null,
        active: null,
        ancestors: "",
        html: "",
      };
      if (!btn) return null;
      try {
        out.tag = btn.tagName || null;
        out.testid = btn.getAttribute ? btn.getAttribute("data-testid") : null;
        out.label = btn.getAttribute ? btn.getAttribute("aria-label") : null;
        out.title = btn.getAttribute ? btn.getAttribute("title") : null;
        out.checked = btn.getAttribute ? btn.getAttribute("aria-checked") : null;
        out.pressed = btn.getAttribute ? btn.getAttribute("aria-pressed") : null;
        out.active = btn.getAttribute ? btn.getAttribute("data-active") : null;
        out.ancestors = ancestorSummary(btn, 4);
        out.html = String(btn.outerHTML || "").slice(0, 300);
      } catch (e) {}
      return out;
    }
    var selected = null;
    try {
      selected = findLikeButton();
    } catch (e) {
      selected = null;
    }
    var cands = [];
    try {
      var scopes = [];
      var w = findWidget();
      if (w) scopes.push(w);
      var p = findPlayer();
      if (p && p !== w) scopes.push(p);
      for (var s = 0; s < scopes.length && cands.length < 6; s++) {
        var btns = scopes[s].querySelectorAll ? scopes[s].querySelectorAll("button") : [];
        for (var i = 0; i < btns.length && cands.length < 6; i++) {
          var l =
            norm(btns[i].getAttribute("aria-label")) +
            " " +
            norm(btns[i].getAttribute("title"));
          if (
            l.indexOf("like") !== -1 ||
            l.indexOf("gusta") !== -1 ||
            l.indexOf("save") !== -1 ||
            l.indexOf("enregistrer") !== -1
          ) {
            cands.push(describe(btns[i]));
          }
        }
      }
    } catch (e) {}
    var liked = null;
    try {
      liked = isLiked();
    } catch (e) {}
    var icon = "unknown";
    try {
      icon = iconShape(selected);
    } catch (e) {}
    var context = { text: "", source: "" };
    try {
      context = getPlaybackContext();
    } catch (e) {}
    return { selected: describe(selected), liked: liked, icon: icon, context: context, candidates: cands };
  }

  function getVolume() {
    var slider = findVolumeSlider();
    var nums = sliderNumbers(slider);
    if (nums && isFinite(nums.now) && isFinite(nums.max) && nums.max > 0) {
      var v = nums.now / nums.max;
      if (nums.max <= 1.01 && nums.now <= 1.01) v = nums.now; // 0..1 slider
      return Math.max(0, Math.min(1, v));
    }
    return 1;
  }

  function getSnapshot() {
    var trackEl = findTrackElement();
    var artistEl = findArtistElement();
    var track = trackEl ? (trackEl.textContent || "").trim() : "";
    var artist = artistEl ? (artistEl.textContent || "").trim() : "";
    var artwork = "";
    try {
      artwork = selectBestArtwork().url || "";
    } catch (e) {
      var artEl = findArtworkElement();
      artwork = artEl ? artEl.currentSrc || artEl.src || "" : "";
    }
    var duration = getDuration();
    var currentTime = getCurrentTime();
    if (duration && currentTime > duration) currentTime = duration;
    var context = "";
    var contextHref = "";
    try {
      var ctx = getPlaybackContext() || {};
      context = ctx.text || "";
      contextHref = ctx.href || "";
    } catch (e) {
      context = "";
      contextHref = "";
    }
    return {
      playerReady: !!findPlayer() && !!findToggleButton(),
      track: track,
      artist: artist,
      artwork: artwork,
      context: context,
      contextHref: contextHref,
      currentTime: currentTime,
      duration: duration,
      isPlaying: isPlaying(),
      shuffle: isShuffleEnabled(),
      repeat: getRepeatMode(),
      liked: isLiked(),
      volume: getVolume(),
      muted: getVolume() <= 0.001,
    };
  }

  /* ---------- Playback context (playlist / mix / album / …) ----------
   *
   * Spotify names the source of the current song in the Now Playing view
   * header as a LINK wrapping a heading — no "Playing from" text exists:
   *   <a href="/playlist/37i9dQZF1EQnqst5TRi17F?uid=…&uri=…">
   *     <h1>Mix hip hop</h1>
   *   </a>
   * That structure IS the signal (href kind + heading descendant), so it is
   * tried first. Classes and testids are ignored — only the href shape and
   * the heading matter. The Queue's "Next from: …" phrasing stays as a
   * fallback with strict anti-speech rules (short text, leading phrase, so
   * lyrics can't spoof it). Cached per track; "" (+ no href) when unknown.
   */

  var ctxCache = { key: "", value: { text: "", href: "", source: "" } };

  function findContextRegions() {
    var regions = [];
    function push(el) {
      if (el && regions.indexOf(el) === -1 && regions.length < 6) regions.push(el);
    }
    try {
      push(findNowPlayingPanel());
      push(findPlayer());
      var sides = document.querySelectorAll("aside, section, [role='complementary']");
      for (var i = 0; i < sides.length; i++) push(sides[i]);
    } catch (e) {}
    return regions;
  }

  function parseContextText(text) {
    var t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t || t.length > 140) return "";
    var m = t.match(/^(?:.{0,4}?)(playing(?:\s+out\s+of|\s+from)|next\s+from|up\s+next\s+from)\s*[:\u2013\u2014-]?\s*(.+)$/i);
    if (!m) return "";
    var name = m[2].split("\u00b7")[0].trim();
    if (name.length < 2 || name.length > 70) return "";
    return name;
  }

  function scanRegionForContext(region) {
    if (!region || !region.querySelectorAll) return { text: "", source: "" };
    var els = [];
    try {
      els = Array.prototype.slice.call(
        region.querySelectorAll("span, div, p, a, h1, h2, h3"),
        0,
        150
      );
    } catch (e) {
      return { text: "", source: "" };
    }
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var txt = "";
      try {
        txt = el.textContent || "";
      } catch (e) {
        continue;
      }
      var name = parseContextText(txt);
      if (!name) continue;
      // A wrapped link's text is the clean context name.
      try {
        var link = el.tagName === "A" ? el : el.querySelector ? el.querySelector("a") : null;
        if (link && link.textContent && link.textContent.trim()) {
          var lt = link.textContent.trim();
          if (lt.length >= 2 && lt.length <= 70) {
            return { text: lt, source: "link" };
          }
        }
      } catch (e) {}
      return { text: name, source: "text" };
    }
    return { text: "", source: "" };
  }

  // Side regions only (Now Playing panel + asides) — never the player bar
  // itself, whose /artist/ widget links are songs' performers, not context.
  // The Now Playing VIEW sidebar leads: it hosts the playing-from header as
  // its first link, while the "Now playing bar" aside is the player footer
  // (cover/album/artist links) and must never win on DOM order.
  function findSideRegions() {
    var regions = [];
    function push(el) {
      if (el && regions.indexOf(el) === -1 && regions.length < 6) regions.push(el);
    }
    try {
      push(findNowPlayingPanel());
      var sides = document.querySelectorAll("aside, [role='complementary']");
      var viewFirst = [];
      var rest = [];
      for (var i = 0; i < sides.length; i++) {
        var label = "";
        try {
          label = norm(sides[i].getAttribute("aria-label"));
        } catch (e) {}
        if (label === "now playing view") viewFirst.push(sides[i]);
        else rest.push(sides[i]);
      }
      for (var v = 0; v < viewFirst.length; v++) push(viewFirst[v]);
      for (var r = 0; r < rest.length; r++) push(rest[r]);
    } catch (e) {}
    return regions;
  }

  // Widget scope: the player widget's own links (song-titled album link,
  // performer links) describe the track, never the playing-from source.
  // Verified live: the widget contains exactly those links and never the
  // view header — so containment here is structural, not a label guess.
  function inPlayerScope(el) {
    if (!el) return false;
    try {
      var w = findWidget();
      if (w && w.contains && w.contains(el)) return true;
    } catch (e) {}
    try {
      var root = findPlayer();
      if (root && root.contains && root.contains(el)) return true;
    } catch (e2) {}
    return false;
  }

  // "/playlist/37i9dQ…?uid=…&uri=…" (or absolute URLs) -> "/playlist/37i9dQ…".
  function contextHrefInfo(href) {
    var m = String(href || "").match(/\/(playlist|album|artist|show|collection)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    return { kind: m[1], href: "/" + m[1] + "/" + m[2] };
  }

  // The header context link: the playing-from anchor in the Now Playing
  // view. It binds its context to the current track
  // (/playlist/<id>?uid=…&uri=spotify:track:…); the track's own album/artist
  // cards nearby never carry that binding. Track/episode links are songs,
  // never context, and are skipped. Every context-kind anchor in the side
  // regions, in DOM order. Kept as live elements so openContext() can click
  // Spotify's own link.
  function collectContextLinks() {
    var out = [];
    try {
      var regions = findSideRegions();
      for (var r = 0; r < regions.length; r++) {
        var links = [];
        try {
          links = regions[r].querySelectorAll(
            'a[href*="/playlist/"], a[href*="/album/"], a[href*="/artist/"], a[href*="/show/"], a[href*="/collection/"]'
          );
        } catch (e) {
          continue;
        }
        for (var i = 0; i < links.length; i++) {
          var a = links[i];
          // Player-widget links describe the track itself (song-titled album
          // link, performer links) — never the playing-from source. Skipped
          // here; the widget only contributes via widgetAlbumFallback below.
          try {
            if (inPlayerScope(a)) continue;
          } catch (eScope) {}
          var rawHref = "";
          try {
            rawHref = a.getAttribute("href") || "";
          } catch (e0) {}
          var info = null;
          try {
            info = contextHrefInfo(rawHref);
          } catch (e) {
            continue;
          }
          if (!info) continue;
          var txt = "";
          try {
            txt = (a.textContent || "").replace(/\s+/g, " ").trim();
          } catch (e) {
            continue;
          }
          if (txt.length < 2 || txt.length > 70) continue;
          var headed = false;
          try {
            var head = a.querySelector("h1, h2, h3");
            if (head) {
              headed = true;
              var ht = (head.textContent || "").replace(/\s+/g, " ").trim();
              if (ht.length >= 2 && ht.length <= 70) txt = ht;
            }
          } catch (e) {}
          var bound = false;
          try {
            bound = /[?&]uri=/i.test(rawHref);
          } catch (e2) {}
          out.push({ el: a, text: txt, href: info.href, headed: headed, bound: bound });
        }
      }
    } catch (e) {}
    return out;
  }

  // Last resort when the Now Playing view is gone (sidebar closed): the
  // widget's song-titled link still carries the current track's album URL,
  // and mediaSession names that album. Text and href are each taken from
  // their own authoritative source — never the song title as a label.
  // Returns null (honest unknown) when either half is missing.
  function widgetAlbumFallback() {
    try {
      var t = findTrackElement();
      if (!t) return null;
      var href = "";
      try {
        href = t.getAttribute ? t.getAttribute("href") || "" : "";
      } catch (e0) {}
      var info = contextHrefInfo(href);
      if (!info || info.kind !== "album") return null;
      var album = "";
      try {
        var md = (window.navigator || navigator).mediaSession &&
          (window.navigator || navigator).mediaSession.metadata;
        album = md && md.album ? String(md.album).trim() : "";
      } catch (e1) {}
      if (!album) return null;
      return { el: t, text: album, href: info.href, fallback: true };
    } catch (e) {
      return null;
    }
  }

  // The track-bound header first (structural: it holds across locales and
  // regardless of region order), then heading-bearing links (older builds),
  // then any other context-kind link in the side regions, then the widget
  // album fallback (sidebar closed).
  function pickContextLink() {
    try {
      var links = collectContextLinks();
      for (var pass = 0; pass < 3; pass++) {
        for (var i = 0; i < links.length; i++) {
          if (pass === 0 && !links[i].bound) continue;
          if (pass === 1 && !links[i].headed) continue;
          return links[i];
        }
      }
      var fb = null;
      try {
        fb = widgetAlbumFallback();
      } catch (eFb) {
        fb = null;
      }
      if (fb) return fb;
    } catch (e) {}
    return null;
  }

  function findContextLink() {
    var pick = null;
    try {
      pick = pickContextLink();
    } catch (e) {}
    if (!pick) return { text: "", href: "", source: "" };
    return {
      text: pick.text,
      href: pick.href,
      source: pick.fallback ? "widget-album" : "npv-link",
    };
  }

  function getPlaybackContext() {
    var none = { text: "", href: "", source: "" };
    try {
      var key = "";
      try {
        key = currentTrackKey();
      } catch (e) {}
      if (key && key !== " | " && key === ctxCache.key) return ctxCache.value;
      var hit = findContextLink();
      if (!hit.text) {
        var regions = findContextRegions();
        for (var i = 0; i < regions.length; i++) {
          hit = scanRegionForContext(regions[i]);
          if (hit.text) break;
        }
      }
      if (!hit.text) {
        var labelled = [];
        try {
          labelled = document.querySelectorAll("[aria-label]");
        } catch (e) {}
        for (var j = 0; j < labelled.length && j < 400; j++) {
          var nm = "";
          try {
            nm = parseContextText(labelled[j].getAttribute("aria-label"));
          } catch (e) {}
          if (nm) {
            hit = { text: nm, source: "aria" };
            break;
          }
        }
      }
      if (key && key !== " | ") ctxCache = { key: key, value: hit };
      return hit;
    } catch (e) {
      return none;
    }
  }

  /* ---------- Write actions ---------- */

  function click(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  // A full tap, not just `click`.
  //
  // element.click() dispatches a single `click`. A real tap is
  // pointerdown -> mousedown -> pointerup -> mouseup -> click, and popper
  // libraries (tippy under Spotify's sheet) commonly open on the pointer/mouse
  // DOWN rather than on click. On desktop the bare click happened to be enough;
  // on Android the sheet simply never opened, so there was nothing to read and
  // the read silently degraded to the Your Library scrape — which is exactly the
  // "shortened playlist list" symptom.
  //
  // Android/desktop-site notes (observed on-device):
  // - The bottom-bar curation button can be outside the *visual* viewport
  //   (wide layout viewport scaled down to the glass). A synthetic click on an
  //   off-screen target is ignored, so scroll it into view + focus first.
  // - Some builds only mount the popper on hover/focus before click, so fire
  //   the over/enter sequence too. Touch + mouse variants are both fired: the
  //   desktop-mode page may listen for either, and firing both is harmless.
  //
  // Nothing here is trusted or invented: Spotify's own handler still runs, we
  // just present the same event sequence a finger would.
  function userClick(el) {
    if (!el) return false;
    var fired = false;
    try {
      try {
        if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (e0) {}
      try {
        if (el.focus) el.focus({ preventScroll: true });
      } catch (e0b) {
        try { el.focus(); } catch (e0c) {}
      }
      var r = el.getBoundingClientRect();
      var x = Math.round(r.left + r.width / 2);
      var y = Math.round(r.top + r.height / 2);
      var mouseBase = { bubbles: true, cancelable: true, composed: true,
        clientX: x, clientY: y, button: 0 };
      // One press, not two: firing both touch AND mouse pointerdowns creates
      // two tippy poppers (the lazy-popper fixture counts opens), leaving a
      // leaked duplicate behind. Touch first (the Android path), mouse as the
      // fallback only when PointerEvent is unavailable.
      var ptrBase = { bubbles: true, cancelable: true, composed: true,
        pointerId: 1, pointerType: "touch", isPrimary: true, button: 0,
        clientX: x, clientY: y };
      function fire(type, Ctor, base, extra) {
        try {
          var opts = Object.assign({}, base, extra || {});
          el.dispatchEvent(new Ctor(type, opts));
          fired = true;
        } catch (e) {}
      }
      // Hover/focus prelude: some builds mount the tippy on enter, not click.
      fire("pointerover", window.PointerEvent ? PointerEvent : MouseEvent, ptrBase, { buttons: 0 });
      try {
        el.dispatchEvent(new MouseEvent("mouseover", Object.assign({ buttons: 0 }, mouseBase)));
        fired = true;
      } catch (eH) {}
      if (window.PointerEvent) {
        fire("pointerdown", PointerEvent, ptrBase, { buttons: 1 });
      }
      fire("mousedown", MouseEvent, mouseBase, { buttons: 1 });
      if (window.PointerEvent) {
        try {
          el.dispatchEvent(new PointerEvent("pointerup",
            Object.assign({ buttons: 0 }, ptrBase)));
        } catch (e3) {}
      }
      try {
        el.dispatchEvent(new MouseEvent("mouseup",
          Object.assign({ buttons: 0 }, mouseBase)));
      } catch (e4) {}
      el.click();
      return true;
    } catch (e) {
      try {
        el.click();
        return fired || true;
      } catch (e2) {
        return false;
      }
    }
  }

  // Cheap "did anything happen at all?" probe: popper roots and playlist lists
  // present right now. Used to tell "the click landed" from "the click did
  // nothing", so the open can be retried instead of silently falling back.
  function curationSurfaceCount() {
    var n = 0;
    try {
      n += document.querySelectorAll('div[data-tippy-root]').length;
    } catch (e) {}
    try {
      n += document.querySelectorAll("#curation-sheet-list").length;
    } catch (e2) {}
    return n;
  }

  function setNativeRangeValue(input, value) {
    if (!input) return false;
    try {
      var proto = window.HTMLInputElement && window.HTMLInputElement.prototype;
      var desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
      if (input.tagName === "INPUT" && desc && desc.set) {
        desc.set.call(input, String(value));
      } else {
        input.value = String(value);
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      try {
        input.value = String(value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function seekBySlider(seconds, slider) {
    if (!slider || !isFinite(seconds)) return false;
    var nums = sliderNumbers(slider);
    var max = nums && isFinite(nums.max) ? nums.max : NaN;
    var target;
    if (isFinite(max) && max > 1000) {
      target = Math.round(seconds * 1000); // ms scale
      target = Math.max(0, Math.min(max, target));
    } else if (isFinite(max) && max > 2) {
      target = Math.max(0, Math.min(max, Math.round(seconds)));
    } else {
      return false;
    }
    if (slider.tagName === "INPUT") {
      return setNativeRangeValue(slider, target);
    }
    // role="slider" fallback: keyboard interaction.
    try {
      slider.focus();
    } catch (e) {}
    var dur = getDuration() || 1;
    var cur = getCurrentTime();
    var ratio = Math.max(0, Math.min(1, seconds / dur));
    // Arrow keys move in small steps — only useful for small jumps.
    var diff = ratio - (dur ? cur / dur : 0);
    var presses = Math.min(40, Math.round(Math.abs(diff) * 40));
    var key = diff >= 0 ? "ArrowRight" : "ArrowLeft";
    for (var i = 0; i < presses; i++) {
      slider.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
      slider.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true }));
    }
    return presses > 0;
  }

  /* ---------- Environment / viewport diagnostics ----------
   *
   * Why this exists: on phones (e.g. Quetta Android) Spotify serves its
   * DESKTOP layout inside a wide layout viewport that the browser then
   * scales down to fit the glass. Our player must know the real numbers:
   *
   *  window.innerWidth / innerHeight ..... layout viewport (CSS px, wide!)
   *  documentElement.clientWidth/Height ... same, minus scrollbars
   *  visualViewport.width/height/scale ... what's actually visible
   *  screen.width/height ................. the physical glass (CSS px)
   *  devicePixelRatio .................... physical px per CSS px
   *
   * Typical desktop: layout ~= visual ~= window, zoom = 1 (no-op).
   * Typical phone w/ desktop site: layout ~980-1280, visual/screen ~360-430,
   *   so zoom = layout/visible ~ 2.5-3.5 compensates exactly, with no
   *   hardcoded phone resolution anywhere.
   */

  function getViewportInfo() {
    var docEl = document.documentElement;
    var innerW = window.innerWidth || 0;
    var innerH = window.innerHeight || 0;
    var clientW = (docEl && docEl.clientWidth) || 0;
    var clientH = (docEl && docEl.clientHeight) || 0;
    var vv = null;
    try {
      vv = window.visualViewport || null;
    } catch (e) {
      vv = null;
    }
    var visualW = (vv && vv.width) || innerW;
    var visualH = (vv && vv.height) || innerH;
    var visualScale = (vv && vv.scale) || 1;
    var dpr = window.devicePixelRatio || 1;
    var screenW = 0;
    var screenH = 0;
    try {
      if (window.screen) {
        screenW = window.screen.width || 0;
        screenH = window.screen.height || 0;
      }
    } catch (e) {}
    var layoutW = clientW || innerW;
    var layoutH = clientH || innerH;
    // Two independent estimators of "layout px per visible px":
    //  est1 catches pinch-zoom / overview-scale (visual shrinks vs layout),
    //  est2 catches desktop-site-fit (layout wider than the glass itself).
    var est1 = visualW > 0 ? layoutW / visualW : 1;
    var est2 = screenW > 0 ? layoutW / screenW : 1;
    var raw = Math.max(1, est1, est2);
    var zoomActive = raw > 1.12;
    // Upper clamp is overflow protection, not a device preset: anything
    // above 4x would push a 380px card past any real layout viewport.
    var zoom = zoomActive ? Math.min(4, raw) : 1;
    var sheetW = visualW || innerW || screenW || layoutW;
    var sheetH = visualH || innerH || screenH || layoutH;
    // Sheet mode follows the GLASS when we are compensating (the visual
    // viewport may report the wide layout width/height in overview mode),
    // else the visible size (covers desktop narrow windows + pinch-zoom).
    // NOTE: the clamped basis must feed BOTH the flag and the dimensions —
    // returning the raw visual size here once produced 980px-wide sheet
    // cards on phones (blank cutout of an oversized card).
    var sheetBasisW = zoomActive && screenW > 0 ? Math.min(sheetW, screenW) : sheetW;
    var sheetBasisH = zoomActive && screenH > 0 ? Math.min(sheetH, screenH) : sheetH;
    var reason = "none (layout ~= visible)";
    if (zoomActive) {
      reason =
        (est1 >= est2
          ? "visualViewport narrower than layout (pinch/overview scale)"
          : "layout viewport wider than screen glass (desktop-site fit)") +
        (raw > 4 ? " [zoom clamped 4x]" : "");
    }
    function round2(n) {
      return Math.round(n * 100) / 100;
    }
    return {
      innerWidth: innerW,
      innerHeight: innerH,
      clientWidth: clientW,
      clientHeight: clientH,
      visualWidth: Math.round(visualW),
      visualHeight: Math.round(visualH),
      visualScale: round2(visualScale),
      devicePixelRatio: round2(dpr),
      screenWidth: screenW,
      screenHeight: screenH,
      layoutWidth: layoutW,
      layoutHeight: layoutH,
      estimatorVisual: round2(est1),
      estimatorScreen: round2(est2),
      zoom: round2(zoom),
      zoomActive: zoomActive,
      sheet: sheetBasisW > 0 && sheetBasisW < 640,
      sheetWidth: Math.round(sheetBasisW),
      sheetHeight: Math.round(sheetBasisH),
      reason: reason,
    };
  }

  /* ---------- Devices (Spotify Connect) ----------
   *
   * The device list is REAL Spotify Connect state. Spotify keeps it in a
   * panel/popover it renders on demand, so the adapter opens that picker
   * only to read it (and to click a row), and keeps it hidden the whole
   * time so the user never sees a desktop popover behind our own sheet.
   *
   * Markup contract (taken from Spotify's own web-player bundle, not
   * guessed; generated class names are never used):
   *   row:      [data-testid="device-picker-row-sidepanel"]
   *             role="group" aria-labelledby="listrow-title-<deviceId>"
   *   title:    [data-testid="list-row-title"] id="listrow-title-<deviceId>"
   *   subtitle: id="listrow-subtitle-<deviceId>"   (real status text, may be empty)
   *   icon:     [data-testid="main-icon"]          (one icon per device type)
   *             [data-testid="device-icon"]        (current-device row)
   *   list:     [data-testid^="devices-list-"]
   *   current:  the row whose aria-labelledby ends in "device-picker-header";
   *             the list below it contains only NON-active devices.
   *   click:    the transfer handler lives on the <li role="listitem"> that
   *             wraps the row (the row's own onClick is a no-op), so a click
   *             dispatched on the row bubbles into Spotify's real transfer.
   *   empty:    [data-testid="device-picker-section-heading"] ("No other
   *             devices found") + [data-testid="device-picker-troubleshooting-list"]
   *   panel:    <aside id="Desktop_PanelContainer_Id"> with a
   *             [data-testid="PanelHeader_CloseButton"] close button.
   */

  var deviceCache = { devices: [], at: 0, ok: false, reason: "", empty: false };
  var deviceBusy = null;
  // How long a device transfer is given to hand off before the UI is told the
  // outcome is unresolved (a sleeping speaker can take well over ten seconds
  // to answer: wake + handshake + picker refresh all serialize). A row Spotify
  // already flags with a status line gets much less rope.
  var TRANSFER_WAIT_MS = 10000;
  var TRANSFER_FLAGGED_WAIT_MS = 3000;
  var deviceHidden = null; // { el, prev, prevPriority } while the picker is kept invisible

  function waitFor(fn, timeoutMs, intervalMs) {
    return new Promise(function (resolve) {
      var limit = timeoutMs || 1500;
      var every = intervalMs || 45;
      var t0 = Date.now();
      function poll() {
        var v = null;
        try {
          v = fn();
        } catch (e) {
          v = null;
        }
        if (v) {
          resolve(v);
          return;
        }
        if (Date.now() - t0 >= limit) {
          resolve(null);
          return;
        }
        setTimeout(poll, every);
      }
      poll();
    });
  }

  function deviceRows() {
    var out = [];
    try {
      out = Array.prototype.slice.call(
        document.querySelectorAll('[data-testid="' + DEVICE.row + '"]')
      );
    } catch (e) {
      out = [];
    }
    return out;
  }

  // Laid out / rendered. Deliberately ignores `visibility` — the adapter hides
  // the picker exactly that way while it works, and it must still count as
  // "showing" so the open/close bookkeeping stays honest.
  function isShown(el) {
    if (!el || !el.getClientRects) return false;
    try {
      if (!el.getClientRects().length) return false;
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (cs && cs.display === "none") return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  // Every picker row carries the device id in its aria-labelledby/title id.
  function rowKey(row) {
    if (!row) return "";
    try {
      var label = row.getAttribute("aria-labelledby") || "";
      var m = label.match(/listrow-title-(.+)$/);
      if (m) return m[1].trim();
      var title = row.querySelector('[data-testid="' + DEVICE.rowTitle + '"]');
      if (title && title.id && title.id.indexOf("listrow-title-") === 0) {
        return title.id.slice("listrow-title-".length);
      }
    } catch (e) {}
    return "";
  }

  function rowText(row, key, kind) {
    if (!row) return "";
    try {
      if (kind === "title") {
        var t = row.querySelector('[data-testid="' + DEVICE.rowTitle + '"]');
        if (t) return (t.textContent || "").trim();
      }
      var el =
        (key ? row.querySelector('[id="listrow-' + kind + '-' + key + '"]') : null) ||
        row.querySelector('[id^="listrow-' + kind + '-"]');
      if (el) return (el.textContent || "").trim();
    } catch (e) {}
    return "";
  }

  function safeSvg(svg) {
    if (!svg || svg.tagName.toLowerCase() !== "svg") return "";
    try {
      var clone = svg.cloneNode(true);
      var nodes = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var attrs = Array.prototype.slice.call(node.attributes || []);
        for (var a = 0; a < attrs.length; a++) {
          var name = attrs[a].name || "";
          if (name === "class" || name === "style" || name.indexOf("on") === 0) {
            node.removeAttribute(attrs[a].name);
          }
        }
      }
      var markup = clone.outerHTML || "";
      if (/<script/i.test(markup)) return "";
      return markup.length > 4000 ? "" : markup;
    } catch (e) {
      return "";
    }
  }

  function rowIcon(row, isCurrent) {
    if (!row) return "";
    try {
      var tid = isCurrent ? DEVICE.currentIcon : DEVICE.mainIcon;
      var host = row.querySelector('[data-testid="' + tid + '"]');
      var svg =
        (host && (host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg"))) ||
        row.querySelector("svg");
      return safeSvg(svg);
    } catch (e) {
      return "";
    }
  }

  function parseDeviceRow(row) {
    var key = rowKey(row);
    var isCurrent = key === DEVICE.currentKey || /-device-picker-header$/.test(key);
    var name = rowText(row, key, "title");
    var subtitle = rowText(row, key, "subtitle");
    return {
      // The current-device row has no real device id (its key is the panel
      // header id); the others expose the Connect device id.
      id: isCurrent ? "" : key,
      key: key,
      name: name,
      subtitle: subtitle,
      type: "",
      isActive: isCurrent,
      icon: rowIcon(row, isCurrent),
    };
  }

  function deviceListScope() {
    var scopes = [];
    try {
      scopes = Array.prototype.slice.call(
        document.querySelectorAll('[data-testid^="' + DEVICE.listPrefix + '"]')
      );
    } catch (e) {
      scopes = [];
    }
    return scopes;
  }

  // Normalized read of whatever Spotify has rendered right now. Never opens
  // anything: callers decide whether the picker needs to be opened first.
  function readDevices() {
    var rows = deviceRows();
    var lists = deviceListScope();
    var current = null;
    var rest = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var key = rowKey(row);
      if (!key || key === DEVICE.castPlaceholder) continue;
      if (lists.length) {
        // Ignore look-alike rows outside the picker's own list containers.
        var inList = false;
        for (var l = 0; l < lists.length; l++) {
          if (lists[l].contains(row)) {
            inList = true;
            break;
          }
        }
        if (!inList && key !== DEVICE.currentKey && !/-device-picker-header$/.test(key)) continue;
      }
      var device = parseDeviceRow(row);
      if (!device.name && !device.id) continue;
      if (device.isActive) {
        if (!current) current = device;
        continue;
      }
      rest.push(device);
    }
    // Spotify mounts the "No other devices found" heading only when the list
    // is empty, so a rendered heading is the real empty state.
    var empty = false;
    try {
      empty = isShown(document.querySelector('[data-testid="' + DEVICE.emptyHeading + '"]'));
    } catch (e) {
      empty = false;
    }
    return { devices: current ? [current].concat(rest) : rest, current: current, empty: empty };
  }

  // Is Spotify's picker actually rendered right now? (Rows only exist while
  // it is mounted, and a leftover container that is display:none is not open.)
  function pickerIsOpen() {
    var rows = deviceRows();
    if (!rows.length) return false;
    var root = devicePickerRoot(rows);
    if (!root) return true;
    return isShown(root);
  }

  function devicePickerRoot(rows) {
    try {
      var panel = document.getElementById(DEVICE.panelId);
      var all = rows && rows.length ? rows : deviceRows();
      if (panel && all.length) {
        var inside = true;
        for (var i = 0; i < all.length; i++) {
          if (!panel.contains(all[i])) {
            inside = false;
            break;
          }
        }
        if (inside) return panel;
      }
      for (var r = 0; r < all.length; r++) {
        var el = all[r].parentElement;
        while (el && el !== document.body) {
          var tagged =
            (el.querySelector &&
              (el.querySelector('[data-testid^="' + DEVICE.listPrefix + '"]') ||
                el.querySelector('[data-testid="' + DEVICE.emptyHeading + '"]'))) ||
            false;
          if (tagged) return el;
          el = el.parentElement;
        }
      }
    } catch (e) {}
    return null;
  }

  function hidePicker(root) {
    if (!root || deviceHidden) return;
    try {
      deviceHidden = {
        el: root,
        prev: root.style.getPropertyValue("visibility"),
        prevPriority: root.style.getPropertyPriority("visibility"),
      };
      root.style.setProperty("visibility", "hidden", "important");
    } catch (e) {
      deviceHidden = null;
    }
  }

  // While we open Spotify's picker ourselves, a temporary stylesheet rule keeps
  // the whole panel invisible from its very first paint. The inline hide above
  // only lands after the open is detected (a 60ms poll), which is a visible
  // frame too late; the veil closes that gap. It is removed as soon as the
  // inline hide is in place, and again (safety net) whenever the picker is
  // shown or closed — so it can never outlive our own open cycle and start
  // hiding a picker the user opens themselves later.
  var deviceVeil = null;

  function veilStart() {
    if (deviceVeil) return;
    try {
      var style = document.createElement("style");
      style.setAttribute("data-spm", "device-veil");
      style.textContent = "#" + DEVICE.panelId + "{visibility:hidden !important}";
      (document.head || document.documentElement).appendChild(style);
      deviceVeil = style;
    } catch (e) {
      deviceVeil = null;
    }
  }

  function veilStop() {
    if (!deviceVeil) return;
    try {
      if (deviceVeil.parentNode) deviceVeil.parentNode.removeChild(deviceVeil);
    } catch (e) {}
    deviceVeil = null;
  }

  function showPicker() {
    veilStop();
    if (!deviceHidden) return;
    try {
      var el = deviceHidden.el;
      if (deviceHidden.prev) {
        el.style.setProperty("visibility", deviceHidden.prev, deviceHidden.prevPriority || "");
      } else {
        el.style.removeProperty("visibility");
      }
    } catch (e) {}
    deviceHidden = null;
  }

  function openNativePicker() {
    if (pickerIsOpen()) {
      hidePicker(devicePickerRoot(null));
      veilStop();
      return Promise.resolve({ ok: true, opened: false });
    }
    var btn = findSideButton("device");
    if (!btn) return Promise.resolve({ ok: false, opened: false });
    veilStart();
    userClick(btn);
    return waitFor(function () {
      return pickerIsOpen() ? true : null;
    }, 1800, 60).then(function (found) {
      if (!found) {
        // Gone before first paint, or never showed: drop the veil so a real
        // picker the user opens later is never held invisible.
        veilStop();
        return { ok: false, opened: true };
      }
      hidePicker(devicePickerRoot(null));
      veilStop();
      return { ok: true, opened: true };
    });
  }

  function closeNativePicker() {
    if (!pickerIsOpen()) {
      showPicker();
      return Promise.resolve(true);
    }
    var btn = findSideButton("device");
    if (btn) click(btn); // the connect button toggles Spotify's own picker
    return waitFor(function () {
      return pickerIsOpen() ? null : true;
    }, 1400, 60).then(function (closed) {
      if (closed) {
        showPicker();
        return true;
      }
      var fallback = null;
      try {
        fallback = document.querySelector('[data-testid="' + DEVICE.panelClose + '"]');
      } catch (e) {
        fallback = null;
      }
      if (!fallback) {
        showPicker();
        return false;
      }
      userClick(fallback);
      return waitFor(function () {
        return pickerIsOpen() ? null : true;
      }, 900, 60).then(function (closed2) {
        showPicker();
        return !!closed2;
      });
    });
  }

  function readDevicesFresh() {
    var wasOpen = pickerIsOpen();
    return openNativePicker()
      .then(function (state) {
        if (!state.ok) {
          deviceCache.ok = false;
          deviceCache.reason = "picker-unavailable";
          return null;
        }
        var read = readDevices();
        // The picker can close under us — Spotify itself closes it the moment a
        // transfer completes. A zero-row read then means "the panel is gone",
        // not "there are no devices", so it must never clobber a good list
        // (that used to flash the sheet's empty state right after a switch).
        if (!read.devices.length && deviceCache.devices.length && !pickerIsOpen()) {
          // Keep the last good list, but refresh its timestamp so it counts as
          // current rather than expiring into a retry storm.
          deviceCache.at = Date.now();
          deviceCache.ok = true;
          deviceCache.reason = "";
          deviceCache.empty = false;
        } else {
          deviceCache = {
            devices: read.devices,
            at: Date.now(),
            ok: true,
            reason: "",
            empty: read.empty || read.devices.length === 0,
          };
        }
        // Only close what we opened: a picker the user opened themselves stays.
        return (wasOpen || !state.opened ? Promise.resolve(true) : closeNativePicker()).then(function () {
          return deviceCache.devices;
        });
      })
      .catch(function () {
        deviceCache.ok = false;
        deviceCache.reason = "read-failed";
        return null;
      });
  }

  function getDevices(opts) {
    opts = opts || {};
    var maxAge = typeof opts.maxAge === "number" ? opts.maxAge : 2500;
    if (opts.cached || (!opts.fresh && deviceCache.at && Date.now() - deviceCache.at < maxAge)) {
      return Promise.resolve(deviceCache.devices);
    }
    if (deviceBusy) return deviceBusy;
    deviceBusy = readDevicesFresh().then(function (list) {
      deviceBusy = null;
      return list || deviceCache.devices;
    });
    return deviceBusy;
  }

  function getDevicesState() {
    return {
      devices: deviceCache.devices,
      ok: deviceCache.ok,
      reason: deviceCache.reason,
      empty: deviceCache.empty,
      updatedAt: deviceCache.at,
      pickerOpen: pickerIsOpen(),
    };
  }

  function getActiveDevice() {
    return getDevices().then(function (list) {
      for (var i = 0; i < (list || []).length; i++) {
        if (list[i].isActive) return list[i];
      }
      return null;
    });
  }

  function transferRow(row) {
    if (!row) return false;
    var target = row;
    try {
      var li = row.closest ? row.closest('li[role="listitem"]') : null;
      if (li) target = li;
    } catch (e) {}
    try {
      target.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 })
      );
    } catch (e) {}
    return userClick(target);
  }

  function rowGone(key, name) {
    var rows = deviceRows();
    for (var i = 0; i < rows.length; i++) {
      var rowKeyNow = rowKey(rows[i]);
      var isCurrent =
        rowKeyNow === DEVICE.currentKey || /-device-picker-header$/.test(rowKeyNow);
      if (isCurrent) continue;
      if ((key && rowKeyNow === key) || (!key && name && rowText(rows[i], rowKeyNow, "title") === name)) {
        return false;
      }
    }
    return true;
  }

  // Real switch: click Spotify's own row (its <li> carries the transfer
  // handler) and only report success once Spotify's picker actually shows
  // that device as the current one. Nothing is faked locally.
  function selectDevice(device) {
    var id = typeof device === "string" ? device : device && device.id;
    var name = device && device.name ? device.name : "";
    var key = device && device.key ? device.key : id;
    return openNativePicker().then(function (state) {
      if (!state.ok) return { ok: false, reason: "picker-unavailable" };
      var rows = deviceRows();
      var target = null;
      var targetName = name;
      for (var i = 0; i < rows.length; i++) {
        var k = rowKey(rows[i]);
        var isCurrent = k === DEVICE.currentKey || /-device-picker-header$/.test(k);
        if (isCurrent) continue;
        if ((key && k === key) || (!key && name && rowText(rows[i], k, "title") === name)) {
          target = rows[i];
          targetName = rowText(rows[i], k, "title") || name;
          break;
        }
      }
      if (!target) {
        return closeNativePicker().then(function () {
          return { ok: false, reason: "device-gone" };
        });
      }
      var clickedKey = rowKey(target);
      // Spotify already flags devices it considers unreachable with a status
      // line ("Unavailable", …). A row without one looks ready to answer, so a
      // silent handshake on it deserves a long wait; a flagged row does not.
      var flagged = !!rowText(target, clickedKey, "subtitle");
      transferRow(target);
      // A real Connect handshake is not instant: a sleeping speaker or phone
      // can take well over ten seconds to answer (wake + handshake + picker
      // refresh serialize). The row leaving the list (Spotify keeps only
      // non-active devices there) is the success signal. Do NOT close the
      // panel while it is in flight — closing it mid-handshake is exactly
      // how that race used to start.
      return waitFor(function () {
        return rowGone(clickedKey, targetName) ? true : null;
      }, flagged ? TRANSFER_FLAGGED_WAIT_MS : TRANSFER_WAIT_MS, 120)
        .then(function (confirmed) {
          // Only close what we opened, and only once the handshake settled;
          // on a timeout the panel is left as Spotify's own state already has
          // it and the next refresh resolves the outcome.
          var settled = confirmed ? closeNativePicker() : Promise.resolve(true);
          return settled
            .then(function () {
              return getDevices({ fresh: true });
            })
            .then(function (list) {
              return { confirmed: !!confirmed, list: list || [] };
            });
        })
        .then(function (res) {
          var list = res.list;
          var active = null;
          for (var i = 0; i < list.length; i++) {
            if (list[i].isActive) active = list[i];
          }
          var ok = !!(
            active &&
            ((clickedKey && active.key === clickedKey) ||
              (targetName && active.name === targetName))
          );
          if (ok) return { ok: true, device: active, devices: list, reason: "" };
          // The row leaving the list is Spotify's own success signal for the
          // transfer it just accepted — so a follow-up read that still shows
          // the old header is backend lag, not a failure. Reporting
          // "rejected" here is exactly the false "Couldn't switch to …"
          // while the music already moved: a taken row is never a hard
          // failure, only an unconfirmed one, and the sheet's refresh beats
          // settle the real outcome within seconds. Only a row Spotify never
          // took (still listed) on top of an unreachable flag is rejected
          // fast, so the UI can say so at once rather than spinning.
          var unresolved = res.confirmed || !flagged;
          return {
            ok: false,
            device: null,
            devices: list,
            reason: unresolved ? "unconfirmed" : "rejected",
          };
        });
    });
  }

  // Diagnostics for the picker layer: run it on a live Spotify tab to see
  // exactly what the adapter can see (used when Spotify ships a new build).
  // `SpotMobile.spotify.inspectDevices()`
  function getDeviceDiagnostics() {
    var btn = null;
    try {
      btn = findSideButton("device");
    } catch (e) {
      btn = null;
    }
    var rows = deviceRows();
    return {
      connectButton: btn
        ? {
            testid: btn.getAttribute("data-testid"),
            label: btn.getAttribute("aria-label"),
            text: (btn.textContent || "").trim().slice(0, 60),
          }
        : null,
      pickerOpen: pickerIsOpen(),
      panel: !!document.getElementById(DEVICE.panelId),
      lists: deviceListScope().map(function (el) {
        return el.getAttribute("data-testid");
      }),
      emptyHeading: isShown(document.querySelector('[data-testid="' + DEVICE.emptyHeading + '"]')),
      rows: rows.map(function (row) {
        var key = rowKey(row);
        return {
          key: key,
          title: rowText(row, key, "title"),
          subtitle: rowText(row, key, "subtitle"),
          inList: !!(row.closest && row.closest('[data-testid^="' + DEVICE.listPrefix + '"]')),
          hasIcon: !!row.querySelector('[data-testid="' + DEVICE.mainIcon + '"]'),
        };
      }),
      cached: getDevicesState(),
    };
  }

  /* ---------- Save / Add to Playlist ----------
   *
   * REVERSE-ENGINEERING NOTES (shipped web-player bundle + LIVE DOM observed
   * on open.spotify.com — never guessed):
   *
   * - The ONLY Add-to-playlist UI is the track context-menu path:
   *   menuAction:"add-to-playlist", focusTransferKey:"ADD_TO_PLAYLIST_SUBMENU".
   * - The song menu holds the trigger:
   *   button[role="menuitem"][aria-expanded] with a span "Add to playlist"
   *   (+ caret icon). Hovering/clicking it mounts the playlist submenu.
   * - The playlist submenu lives in a tippy popover:
   *   div[data-tippy-root] > ul[role="menu"][data-depth="1"] containing, in
   *   order: a search row (input[role="searchbox" aria-label="Find a
   *   playlist" placeholder="Find a playlist"], locale key
   *   "contextmenu.find-playlist"), a "New playlist" row (locale key
   *   "...contextmenu.new-playlist"), a divider, then one
   *   li[role="presentation"] > button[role="menuitem"] per playlist with
   *   span[data-encore-id="text"] holding the name.
   * - FOLDERS are rows too, distinguished ONLY by aria-expanded="false" on
   *   the button (+ caret); the trigger uses aria-expanded="true". LEAF
   *   playlist rows carry NO aria-expanded attribute at all. Parser skips
   *   every button with aria-expanded — folders never appear as playlists.
   * - NO row carries aria-checked or any check glyph (verified on the live
   *   submenu: bare name buttons throughout): the submenu ALWAYS ADDS
   *   (playlists allow duplicates), it never toggles. There is no checkbox
   *   dialog with membership anywhere. The depth-0 song menu ("Save to your
   *   Liked Songs", "Add to queue", "Go to song radio", …) is a different
   *   menu and is NEVER parsed as playlists (that confusion was a real bug,
   *   fixed by anchoring discovery on the Find-a-playlist searchbox, which
   *   only the depth-1 submenu contains).
   * - Removal is a SEPARATE menuAction:"delete" item ("contextmenu.
   *   remove-from-playlist", DELETE shortcut) that only appears when the
   *   track's menu is opened from inside an editable playlist context.
   *
   * Consequences (honest, load-bearing):
   * - The playlist LIST comes from Spotify's real Your-Library sidebar
   *   (same source the submenu itself is built from): links to /playlist/
   *   with real names + artwork — cross-checked against the anchored
   *   submenu's leaf rows (the addable set). No list is ever invented.
   * - Membership (containsTrack) is ONLY reported when Spotify itself says
   *   so: Liked Songs via isLiked(); the playlist the track is currently
   *   playing from (playback context href); an aria-checked row IF Spotify
   *   ever ships one (future-proof); or a track we REALLY just added through
   *   the submenu in this session (a cache of a real action, cleared on
   *   track change — never a fake database). Anything else shows as ○,
   *   exactly like Spotify's own submenu (which also offers Add even when
   *   the track is already there).
   * - addToPlaylist() clicks the REAL leaf row in the anchored submenu (a
   *   genuine Spotify add).
   * - removeFromPlaylist() clicks the REAL toggle-off / Remove item when
   *   Spotify offers one; otherwise it returns {ok:false,
   *   reason:"remove-unavailable"} so the UI shows an honest error instead
   *   of faking a removal. This mirrors Spotify's own capabilities: the web
   *   build simply does not offer remove-from-arbitrary-playlist.
   *
   * Selectors: semantic only — Your-Library region by aria-label/heading
   * text, playlists by a[href*="/playlist/"] links, the submenu by
   * role="menu" + the Find-a-playlist searchbox, rows by
   * li > button[role="menuitem"] without aria-expanded and
   * span[data-encore-id="text"] for the name. Generated class names
   * (fmmygDM45MTS7I35OyLh etc.) are never used.
   */

  var PLAYLIST = {
    addLabels: [
      "add to playlist",
      "add to another playlist",
      "add playlist to",
    ],
    newLabels: ["new playlist", "create playlist", "new-playlist"],
    findLabels: ["find a playlist", "find playlist", "search playlist"],
    removeLabels: ["remove from this playlist", "remove from playlist"],
    likedLabels: ["liked songs"],
    collectionHref: "/collection/tracks",
  };

  var playlistCache = { list: [], at: 0, ok: false, reason: "", trackKey: "" };
  var playlistBusy = null;
  var playlistSession = { trackKey: "", added: {} }; // playlistKey -> true (real adds only)
  var playlistVeil = null;

  function trackKeyNow() {
    try {
      return currentTrackKey();
    } catch (e) {
      return "";
    }
  }

  function getCurrentTrackUri() {
    try {
      var t = findTrackElement();
      if (!t) return { uri: "", id: "", kind: "" };
      var href = t.getAttribute ? t.getAttribute("href") || "" : "";
      var m = href.match(/\/(track|episode)\/([A-Za-z0-9]+)/);
      if (!m) return { uri: "", id: "", kind: "" };
      return {
        uri: "spotify:" + m[1] + ":" + m[2],
        id: m[2],
        kind: m[1],
        href: "/" + m[1] + "/" + m[2],
      };
    } catch (e) {
      return { uri: "", id: "", kind: "" };
    }
  }

  function playlistKeyOf(p) {
    if (!p) return "";
    return p.id ? "id:" + p.id : "name:" + norm(p.name);
  }

  function sessionMarks(keyNow) {
    if (!keyNow || playlistSession.trackKey !== keyNow) return {};
    return playlistSession.added || {};
  }

  function sessionMarkAdded(plKey) {
    var k = trackKeyNow();
    if (!k) return;
    if (playlistSession.trackKey !== k) {
      playlistSession = { trackKey: k, added: {} };
    }
    playlistSession.added[plKey] = true;
  }

  function sessionUnmark(plKey) {
    var k = trackKeyNow();
    if (!k || playlistSession.trackKey !== k) return;
    try {
      delete playlistSession.added[plKey];
    } catch (e) {}
  }

  // Your-Library region: aria-label first ("Your Library" + locales), then a
  // heading with that text, then any aside/nav/section holding /playlist/ links.
  function findLibraryRegion() {
    var cands = [];
    try {
      cands = Array.prototype.slice.call(
        document.querySelectorAll('aside[aria-label], nav[aria-label], section[aria-label], div[aria-label]')
      );
    } catch (e) {
      cands = [];
    }
    for (var i = 0; i < cands.length; i++) {
      var label = norm(cands[i].getAttribute("aria-label"));
      if (label.indexOf("your library") !== -1 || label.indexOf("tu biblioteca") !== -1 ||
          label.indexOf("biblioth") !== -1 || label.indexOf("bibliothek") !== -1) {
        return cands[i];
      }
    }
    try {
      var heads = document.querySelectorAll("h1, h2, h3, span, div, button");
      for (var h = 0; h < heads.length && h < 800; h++) {
        var txt = norm(heads[h].textContent);
        if (txt === "your library" || txt === "tu biblioteca") {
          var scope = heads[h].closest
            ? heads[h].closest("aside, nav, section, div")
            : heads[h].parentElement;
          if (scope) return scope;
          break;
        }
      }
    } catch (e) {}
    // Last resort: the document itself (deduped by playlist id below).
    return document;
  }

  function parsePlaylistHref(href) {
    // Real Spotify ids are base62, but be tolerant (tests use hyphens).
    var m = String(href || "").match(/\/playlist\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : "";
  }

  // Sync, non-disruptive read of the real library. No menus are opened here.
  function readLibraryPlaylists() {
    var out = [];
    var seen = {};
    try {
      var region = findLibraryRegion();
      if (!region || !region.querySelectorAll) return out;
      var links = region.querySelectorAll('a[href*="/playlist/"]');
      for (var i = 0; i < links.length && out.length < 200; i++) {
        var a = links[i];
        var href = "";
        try {
          href = a.getAttribute("href") || "";
        } catch (e) {}
        var id = parsePlaylistHref(href);
        if (!id || seen[id]) continue;
        var name = "";
        var sub = "";
        try {
          var raw = (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim();
          // Library rows read "Name • Playlist • N songs". Keep only the name
          // part: a full row string can never be matched against the
          // curation/submenu rows, so the merge emitted every playlist twice
          // (once with an id, once without). U+2022 BULLET is the separator;
          // U+00B7 MIDDLE DOT is legal inside playlist names, so it is not split.
          var parts = raw.split("•");
          if (parts.length > 1) {
            var first = parts[0].replace(/\s+/g, " ").trim();
            if (first) {
              sub = raw;
              raw = first;
            }
          }
          name = raw;
        } catch (e) {}
        if (name.length > 80) name = name.slice(0, 80);
        if (!name || name.length < 1) continue;
        // Skip look-alikes that are clearly not user playlists (length guard only;
        // never invent: if unsure, keep it — the addable check filters later).
        var row = a.closest ? (a.closest('li[role="listitem"], div[role="listitem"], li, div') || a.parentElement) : a.parentElement;
        var art = "";
        try {
          var img = row && row.querySelector ? row.querySelector("img") : a.querySelector("img");
          if (img) art = img.currentSrc || img.src || "";
        } catch (e) {}
        if (!sub) {
          try {
            if (row && row.textContent) {
              var full = row.textContent.replace(/\s+/g, " ").trim();
              if (full.length > name.length && full.length < 160) sub = full;
            }
          } catch (e) {}
        }
        seen[id] = true;
        out.push({
          id: id,
          uri: "spotify:playlist:" + id,
          href: "/playlist/" + id,
          name: name,
          subtitle: sub && sub !== name ? sub : "",
          artwork: art || "",
        });
      }
    } catch (e) {}
    return out;
  }

  function visibleMenus() {
    var out = [];
    try {
      var els = document.querySelectorAll('[role="menu"]');
      for (var i = 0; i < els.length; i++) {
        if (isVisible(els[i]) && !isInOurRoot(els[i])) out.push(els[i]);
      }
    } catch (e) {}
    return out;
  }

  function isInOurRoot(el) {
    try {
      if (!el) return false;
      if (el.id === "spm-root") return true;
      return !!(el.closest && el.closest("#spm-root"));
    } catch (e) {
      return false;
    }
  }

  function menuHasAddItem(menu) {
    try {
      var txt = norm(menu.textContent);
      for (var i = 0; i < PLAYLIST.addLabels.length; i++) {
        if (txt.indexOf(PLAYLIST.addLabels[i]) !== -1) return true;
      }
    } catch (e) {}
    return false;
  }

  // The REAL playlist submenu, observed live (tippy popover):
  //   div[data-tippy-root] > ul[role="menu"][data-depth="1"] containing
  //   li > (search row with input[role="searchbox" aria-label="Find a playlist"])
  //   + li > button "New playlist" + divider + li > button per playlist with
  //   span[data-encore-id="text"] holding the name.
  // The searchbox is the anchor: the depth-0 song menu ("Save to your Liked
  // Songs", "Add to queue", "Go to song radio", …) never contains one, so
  // anchoring on it makes confusing the two menus impossible. Generated
  // class names are ignored; only role/structure/labels matter.
  function submenuSearchBox(menu) {
    if (!menu || !menu.querySelectorAll) return null;
    var inputs = [];
    try {
      inputs = Array.prototype.slice.call(menu.querySelectorAll("input"));
    } catch (e) {
      inputs = [];
    }
    for (var i = 0; i < inputs.length; i++) {
      var label = "";
      var ph = "";
      try {
        label = inputs[i].getAttribute("aria-label") || "";
        ph = inputs[i].getAttribute("placeholder") || "";
        var role = inputs[i].getAttribute("role") || inputs[i].type || "";
        if (role !== "searchbox" && inputs[i].type !== "search" && !label && !ph) continue;
      } catch (e) {
        continue;
      }
      var hay = norm(label + " " + ph);
      for (var f = 0; f < PLAYLIST.findLabels.length; f++) {
        if (hay.indexOf(PLAYLIST.findLabels[f]) !== -1) return inputs[i];
      }
    }
    return null;
  }

  function isPlaylistSubmenu(menu) {
    if (!menu || isInOurRoot(menu)) return false;
    return !!submenuSearchBox(menu);
  }

  function findPlaylistSubmenu() {
    var menus = visibleMenus();
    for (var i = 0; i < menus.length; i++) {
      if (isPlaylistSubmenu(menus[i])) return menus[i];
    }
    // Fallback: an explicitly depth-1 submenu holding a search field of any
    // kind (locale-proofing if Spotify ever rewords the placeholder).
    for (var j = 0; j < menus.length; j++) {
      try {
        if (menus[j].getAttribute("data-depth") === "1" && menus[j].querySelector("input")) {
          return menus[j];
        }
      } catch (e) {}
    }
    return null;
  }

  // Visible menus that are NOT the playlist submenu — i.e. the depth-0 song
  // menu, home of the "Add to playlist" trigger and "Remove from playlist".
  function songMenus() {
    var out = [];
    var sub = null;
    try {
      sub = findPlaylistSubmenu();
    } catch (e) {
      sub = null;
    }
    var menus = visibleMenus();
    for (var i = 0; i < menus.length; i++) {
      if (menus[i] !== sub) out.push(menus[i]);
    }
    return out;
  }

  function findAddMenuItem(scope) {
    var root = scope || document;
    var items = [];
    try {
      items = Array.prototype.slice.call(
        root.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"], [role="option"], button')
      );
    } catch (e) {
      items = [];
    }
    // Strong: an item whose own text STARTS with "add to playlist" (not a
    // playlist that happens to contain those words deeper in a long label).
    // Callers scope this to the song menus, never the playlist submenu.
    for (var i = 0; i < items.length; i++) {
      if (isInOurRoot(items[i])) continue;
      var t = "";
      try {
        t = norm(items[i].textContent).slice(0, 60);
      } catch (e) {}
      for (var a = 0; a < PLAYLIST.addLabels.length; a++) {
        if (t.indexOf(PLAYLIST.addLabels[a]) === 0) return items[i];
      }
    }
    return null;
  }

  function findTriggerInSongMenus() {
    var menus = songMenus();
    for (var m = 0; m < menus.length; m++) {
      var hit = findAddMenuItem(menus[m]);
      if (hit) return hit;
    }
    return null;
  }

  function findRemoveMenuItem(scope) {
    // Scoped to the song menus (never the playlist submenu): a playlist that
    // happens to be named e.g. "Remove Me" must never match here.
    var scopes = null;
    if (scope && scope !== document) {
      scopes = [scope];
    } else {
      try {
        scopes = songMenus();
      } catch (e) {
        scopes = [document];
      }
      if (!scopes.length) scopes = [document];
    }
    for (var s = 0; s < scopes.length; s++) {
      var items = [];
      try {
        items = Array.prototype.slice.call(
          scopes[s].querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"], button')
        );
      } catch (e) {
        items = [];
      }
      for (var i = 0; i < items.length; i++) {
        if (isInOurRoot(items[i])) continue;
        var t = "";
        try {
          t = norm(items[i].textContent).slice(0, 80);
        } catch (e) {}
        for (var r = 0; r < PLAYLIST.removeLabels.length; r++) {
          if (t.indexOf(PLAYLIST.removeLabels[r]) !== -1) return items[i];
        }
      }
    }
    return null;
  }

  // Leaf playlist rows of the anchored depth-1 submenu ONLY. The song menu
  // is never consulted here (that was the sheet-shows-menu-actions bug).
  // Observed live structure per row:
  //   li[role="presentation"] > button[role="menuitem"]
  //     > span[data-encore-id="text"]PLAYLIST NAME</span>
  // Skipped, by observation (not by class):
  // - the search row (a menuitem div holding the searchbox input),
  // - "New playlist" (plus icon + that text),
  // - FOLDERS: any button carrying aria-expanded (observed: the "Add to
  //   playlist" trigger uses aria-expanded="true", a folder row uses
  //   aria-expanded="false"); leaf playlists carry NO aria-expanded at all.
  // - the trigger echo, if it ever appears inside the submenu.
  // Membership marks: the live rows carry NO aria-checked and NO check
  // glyph — Spotify's submenu is add-only. checked stays null unless a
  // future build marks rows (code below already honors aria-checked,
  // aria-selected, and check glyphs if they ever appear).
  function readAddSubmenuRows() {
    var rows = [];
    var menu = null;
    try {
      menu = findPlaylistSubmenu();
    } catch (e) {
      menu = null;
    }
    if (!menu) return rows;
    var items = [];
    try {
      items = Array.prototype.slice.call(
        menu.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"], [role="option"]')
      );
    } catch (e) {
      return rows;
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (isInOurRoot(it)) continue;
      // Folders/submenu triggers carry aria-expanded; leaf playlists don't.
      try {
        if (it.getAttribute && it.getAttribute("aria-expanded") !== null) continue;
      } catch (e) {}
      // The search row wraps the searchbox input.
      try {
        if (it.querySelector && it.querySelector("input")) continue;
      } catch (e) {}
      var txt = "";
      try {
        var nameEl = it.querySelector
          ? it.querySelector('span[data-encore-id="text"]')
          : null;
        txt = ((nameEl && nameEl.textContent) || it.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
      } catch (e) {}
      if (!txt || txt.length > 120) continue;
      var low = norm(txt);
      var isNew = false;
      for (var n = 0; n < PLAYLIST.newLabels.length; n++) {
        if (low.indexOf(PLAYLIST.newLabels[n]) !== -1 && txt.length < 40) {
          isNew = true;
          break;
        }
      }
      if (isNew) continue;
      var isAddHeader = false;
      for (var a = 0; a < PLAYLIST.addLabels.length; a++) {
        if (low.indexOf(PLAYLIST.addLabels[a]) === 0 && txt.length < 60) {
          isAddHeader = true;
          break;
        }
      }
      if (isAddHeader) continue;
      if (low.indexOf("find") === 0 && txt.length < 40) continue; // search row echo
      // Membership marks (future-proof; the live build sets none).
      var checked = null;
      try {
        var ac = it.getAttribute("aria-checked");
        if (ac !== null) checked = ac === "true";
        var sel = it.getAttribute("aria-selected");
        if (checked === null && sel !== null) checked = sel === "true";
      } catch (e) {}
      var hasCheck = false;
      try {
        var html = (it.innerHTML || "").toLowerCase();
        if (html.indexOf("polyline") !== -1 && txt.length < 80) {
          // A polyline glyph inside a short menu row is Spotify's check.
          hasCheck = true;
        }
      } catch (e) {}
      if (checked === null && hasCheck) checked = true;
      rows.push({ el: it, name: txt, checked: checked });
    }
    return rows;
  }

  function playlistVeilStart() {
    if (playlistVeil) return;
    try {
      var style = document.createElement("style");
      style.setAttribute("data-spm", "playlist-veil");
      // The goal is "the user must not see Spotify's menus while we drive
      // them". `visibility: hidden` also stops a popper from LAYING OUT, which
      // is fatal here: the curation sheet lives in a tippy root, and if that
      // never lays out its rows never mount, the sweep finds nothing and the
      // read silently degrades to the Your Library scrape (the wrong list).
      //
      // So: things we do NOT drive are hidden outright; the tippy roots and
      // the curation list are kept laid out and merely taken off-screen with
      // `opacity: 0` (still measurable by getClientRects, still clickable
      // programmatically). `visibility` is inherited, so re-declaring it on
      // the list wins over its hidden <form>/portal ancestors.
      style.textContent =
        'div[role="menu"], div[role="dialog"], form { visibility: hidden !important; }' +
        'div[data-tippy-root] { visibility: visible !important; opacity: 0 !important; }' +
        '#curation-sheet-list, #curation-sheet-list * { visibility: visible !important; opacity: 0 !important; }' +
        // Our own UI is inside #spm-root and must never be dimmed or hidden.
        '#spm-root, #spm-root * { visibility: visible !important; opacity: 1 !important; }';
      (document.head || document.documentElement).appendChild(style);
      playlistVeil = style;
    } catch (e) {
      playlistVeil = null;
    }
  }

  function playlistVeilStop() {
    if (!playlistVeil) return;
    try {
      if (playlistVeil.parentNode) playlistVeil.parentNode.removeChild(playlistVeil);
    } catch (e) {}
    playlistVeil = null;
  }

  function closeAllMenus() {
    // Synthetic Escape dismisses Spotify's own menus. It is marked so our
    // own sheets (document-level Escape-to-close) never treat it as the user
    // asking to close: without the mark, every playlist read would instantly
    // shut the Save sheet that triggered it.
    function synth(type) {
      var ev = null;
      try {
        ev = new KeyboardEvent(type, { key: "Escape", bubbles: true });
        ev.__spmSynthetic = true;
      } catch (e) {
        ev = null;
      }
      if (ev) {
        try {
          document.dispatchEvent(ev);
        } catch (e2) {}
      }
    }
    synth("keydown");
    synth("keyup");
    return waitFor(function () {
      return visibleMenus().length ? null : true;
    }, 600, 60);
  }

  function hover(el) {
    if (!el) return;
    try {
      var r = el.getBoundingClientRect();
      var x = r.left + Math.min(20, r.width / 2);
      var y = r.top + r.height / 2;
      ["pointerover", "mouseover", "mousemove"].forEach(function (type) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
      });
      el.focus && el.focus();
    } catch (e) {}
  }

  // Opens the track's context menu (hidden) and hovers the "Add to
  // playlist" trigger so the depth-1 tippy submenu mounts. Resolves
  // { rows, addItem } or { reason }. An EMPTY rows array is a VALID result
  // (user with no playlists) as long as the anchored submenu mounted.
  // ALWAYS closes menus + veil before resolving (success or fail), unless
  // leaveOpen is set — add/remove keep the menus up to click a row, then
  // close them via finishMenuOp themselves.
  function openAddSubmenuHidden(leaveOpen) {
    var anchor = null;
    try {
      anchor = findTrackElement() || findWidget();
    } catch (e) {
      anchor = null;
    }
    if (!anchor) return Promise.resolve({ reason: "no-track" });
    var prevFocus = null;
    try {
      prevFocus = document.activeElement;
    } catch (e) {}
    // The context menu and its "Add to playlist" submenu are tippy poppers too.
    // Veil now (nothing may flash) — safe because the veil dims poppers rather
    // than hiding them, and waitVeiled below drops the veil entirely if some
    // build still refuses to mount a dimmed one.
    playlistVeilStart();
    try {
      var r = anchor.getBoundingClientRect();
      var cx = r.left + 8;
      var cy = r.top + 8;
      anchor.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 2 })
      );
    } catch (e) {
      playlistVeilStop();
      return Promise.resolve({ reason: "menu-failed" });
    }
    function doneClose(reason) {
      if (leaveOpen) return Promise.resolve({ reason: reason, prevFocus: prevFocus });
      return closeAllMenus().then(function () {
        playlistVeilStop();
        try {
          prevFocus && prevFocus.focus && prevFocus.focus();
        } catch (e) {}
        return { reason: reason };
      });
    }
    // Same safety net as ensureCurationSheet: if the menu will not appear
    // while veiled, drop the veil and look once more. A visible menu beats a
    // wrong playlist list.
    function waitVeiled(fn, ms) {
      return waitFor(fn, ms, 80).then(function (v) {
        if (v) return v;
        if (!playlistVeil) return null;
        playlistVeilStop();
        return waitFor(fn, ms, 80).then(function (v2) {
          if (!v2) playlistVeilStart();
          return v2;
        });
      });
    }
    return waitVeiled(function () {
      var menus = songMenus();
      for (var i = 0; i < menus.length; i++) {
        if (menuHasAddItem(menus[i])) return menus;
      }
      return null;
    }, 1600).then(function (menus) {
      if (!menus) {
        return doneClose("menu-unavailable");
      }
      var addItem = findTriggerInSongMenus();
      if (!addItem) {
        return doneClose("menu-unavailable");
      }
      hover(addItem);
      return waitVeiled(function () {
        var sub = null;
        try {
          sub = findPlaylistSubmenu();
        } catch (e) {
          sub = null;
        }
        return sub ? sub : null;
      }, 1600).then(function (sub) {
        if (!sub) {
          // Hover alone didn't mount it (focus-driven builds): click the
          // trigger as a fallback, then wait once more.
          try {
            addItem.click();
          } catch (e) {}
          return waitVeiled(function () {
            var s2 = null;
            try {
              s2 = findPlaylistSubmenu();
            } catch (e2) {
              s2 = null;
            }
            return s2 ? s2 : null;
          }, 1200).then(function (sub2) {
            if (!sub2) return doneClose("submenu-unavailable");
            var rows = readAddSubmenuRows();
            if (leaveOpen) return { rows: rows, addItem: addItem, prevFocus: prevFocus };
            return closeAllMenus().then(function () {
              playlistVeilStop();
              try {
                prevFocus && prevFocus.focus && prevFocus.focus();
              } catch (e) {}
              return { rows: rows, addItem: addItem };
            });
          });
        }
        var rows = readAddSubmenuRows();
        if (leaveOpen) return { rows: rows, addItem: addItem, prevFocus: prevFocus };
        return closeAllMenus().then(function () {
          playlistVeilStop();
          try {
            prevFocus && prevFocus.focus && prevFocus.focus();
          } catch (e) {}
          return { rows: rows, addItem: addItem };
        });
      });
    });
  }

  function finishMenuOp(prevFocus) {
    return closeAllMenus().then(function () {
      playlistVeilStop();
      try {
        prevFocus && prevFocus.focus && prevFocus.focus();
      } catch (e) {}
    });
  }

  /* ---------- Curation sheet (the REAL checkbox UI) ----------
   *
   * Live-observed on open.spotify.com (plus bundle: CurationSheet with
   * initiallySelectedUris / isSelected / saveChanges — no stable globals to
   * call; the bundle is webpack closures and content scripts run in an
   * isolated world anyway, so clicking Spotify's REAL button is the
   * equivalent: their handler runs, nothing is reimplemented).
   *
   * Trigger: bottom-bar
   *   button[data-encore-id="buttonTertiary"][aria-checked]
   *   unsaved: aria-checked="false", aria-label="Add to Liked Songs" (+ icon)
   *   saved:   aria-checked="true",  aria-label="Add to playlist"   (check icon)
   * Click unsaved -> adds to Liked Songs (NO sheet). Click saved -> opens the
   * sheet (NO toggle). The button NEVER unlikes directly.
   *
   * Sheet: form > [title "Add to playlist"]
   *   + [role=search]input[role=searchbox][aria-label="Find a playlist"]
   *   + ul#curation-sheet-list[aria-label="Add to playlist menu"]
   *     > li > button[role=menuitemcheckbox][aria-checked]
   *       > div[data-encore-id=listRow][role=group]
   *           aria-labelledby="listrow-title-<spotify:collection:tracks|
   *                                 spotify:playlist:<id>|new-playlist>"
   *         + p[data-encore-id=listRowTitle] id="listrow-title-<same>"
   *           + img[data-testid=entity-image]
   *   + Cancel button. List is VIRTUALIZED (sentinels) — reads sweep it.
   *
   * NOTE: listrow-title-<uri> hangs off the inner listRow div, NOT the
   * button — rows must be keyed by that, never by button attributes.
   *
   * aria-checked on the rows IS the membership truth (Liked row included),
   * and clicking a row REALLY toggles it — add AND remove from one control,
   * verified by polling the flip (not by menu-close heuristics).
   *
   * Transient-like dance (unsaved tracks only): opening the sheet costs one
   * real Like (click#1) + open (click#2). Before closing, the sheet's own
   * Liked row is toggled back off (verified), so the net state change is
   * exactly zero — Spotify toasts may flash, but no state leaks. The
   * returned list always reports Liked=false for a transient session.
   */

  var CURATION = {
    listId: "curation-sheet-list",
    listLabel: "add to playlist menu",
    // The raw, untranslated aria-label for the selector. Spotify localises the
    // visible label, so matching on it alone would break in other languages.
    listLabelRaw: "Add to playlist menu",
    likedUri: "spotify:collection:tracks",
    newRow: "new-playlist",
  };

  // Every curation button on the page, best-first. There can be more than one
  // (the bottom-bar heart AND a track-row heart, each rendering its own tippy
  // popper). Picking only the first meant that if that particular instance was
  // unusable we never tried the one the user actually sees working.
  //
  // Ordering (best first): saved-state (aria-checked=true) before unsaved —
  // a saved press OPENS the sheet directly while an unsaved press only Likes
  // (requiring the transient dance, which is the fragile path on Android);
  // in-player (bottom bar) before document-wide track rows (which may belong
  // to a different track); visible before hidden.
  function curationButtonLabelOk(label, inPlayer) {
    var l = norm(label);
    if (!l) return !!inPlayer; // player-scoped Tertiary+checked is the curation toggle even if relabelled
    if (l === "add to liked songs" || l === "add to playlist") return true;
    if (l.indexOf("liked songs") !== -1) return true;
    // Localized / future-proof: "add to ..." + playlist/liked mentions.
    if (l.indexOf("add to") !== -1 && (l.indexOf("playlist") !== -1 || l.indexOf("liked") !== -1)) return true;
    if (l.indexOf("añadir") !== -1 || l.indexOf("ajouter") !== -1 || l.indexOf("hinzufügen") !== -1) return true;
    if (l.indexOf("aggiungi") !== -1 || l.indexOf("toevoegen") !== -1) return !!inPlayer;
    return !!inPlayer && l.length < 40;
  }

  function findCurationButtons() {
    var out = [];
    var scopes = [];
    try {
      var w = findWidget();
      if (w) scopes.push(w);
      var p = findPlayer();
      if (p && p !== w) scopes.push(p);
    } catch (e) {}
    var seen = [];
    for (var pass = 0; pass < 2; pass++) {
      // pass 0: in-scope buttons. pass 1: anywhere on the page, as a last
      // resort (a track-row heart lives outside the player bar).
      var roots = pass === 0 ? scopes : [document.documentElement];
      for (var s = 0; s < roots.length; s++) {
        var root = roots[s];
        if (!root || !root.querySelectorAll) continue;
        var btns = [];
        try {
          btns = Array.prototype.slice.call(
            root.querySelectorAll('button[data-encore-id="buttonTertiary"]')
          );
        } catch (e) {
          btns = [];
        }
        for (var i = 0; i < btns.length; i++) {
          var b = btns[i];
          if (seen.indexOf(b) !== -1) continue;
          var checked = null;
          var label = "";
          try {
            checked = b.getAttribute("aria-checked");
            label = b.getAttribute("aria-label") || "";
          } catch (e2) {}
          if (checked === null) continue;
          var inPlayer = pass === 0;
          // Track-row hearts outside the player can share the exact same
          // label/shape but belong to a DIFFERENT track. They stay as a last
          // resort only; the bottom-bar button is authoritative.
          if (!curationButtonLabelOk(label, inPlayer)) continue;
          seen.push(b);
          var vis = false;
          try {
            vis = isVisible(b);
          } catch (e3) { vis = false; }
          var saved = checked === "true";
          var inFooter = false;
          try {
            inFooter = !!(b.closest && (b.closest("footer") || b.closest('[data-testid="now-playing-bar"]')));
          } catch (e4) {}
          out.push({ el: b, visible: vis, saved: saved, inFooter: inFooter, inPlayer: inPlayer });
        }
      }
    }
    out.sort(function (a, b) {
      if (!!a.saved !== !!b.saved) return a.saved ? -1 : 1;
      if (!!a.inPlayer !== !!b.inPlayer) return a.inPlayer ? -1 : 1;
      if (!!a.inFooter !== !!b.inFooter) return a.inFooter ? -1 : 1;
      if (!!a.visible !== !!b.visible) return a.visible ? -1 : 1;
      return 0;
    });
    return out;
  }

  function findCurationButton() {
    var all = findCurationButtons();
    return all.length ? all[0].el : null;
  }

  // Hot-read cache for the curation button. isLiked() runs on EVERY snapshot
  // (every mutation batch + every fallback tick), and an uncached read is a
  // document-wide buttonTertiary scan plus a getClientRects/getBoundingClientRect
  // + closest() walk per candidate — O(page size) with forced layout reads,
  // several times a second, on a page with hundreds of track-row hearts.
  // The bottom-bar button barely moves, so memoize it: re-resolve only when
  // it leaves the DOM or the entry goes stale (30s). Track-row lookalikes are
  // never cached (they belong to other tracks); the candidate enumeration
  // used by ensureCurationSheet stays fully live.
  var cachedCurationBtn = null;
  var cachedCurationAt = 0;
  var CURATION_CACHE_MS = 30000;

  function curationLikedState() {
    var now = 0;
    try {
      now = Date.now();
    } catch (e) {}
    var btn = null;
    try {
      if (
        cachedCurationBtn &&
        document.contains(cachedCurationBtn) &&
        now - cachedCurationAt < CURATION_CACHE_MS
      ) {
        btn = cachedCurationBtn;
      } else {
        btn = findCurationButton();
        var inPlayer = false;
        try {
          var w = findWidget();
          var p = findPlayer();
          inPlayer = !!((w && w.contains(btn)) || (p && p.contains(btn)));
        } catch (e2) {}
        if (btn && inPlayer) {
          cachedCurationBtn = btn;
          cachedCurationAt = now;
        } else {
          cachedCurationBtn = null;
        }
      }
    } catch (e) {
      btn = null;
    }
    if (!btn) return null;
    try {
      var c = btn.getAttribute("aria-checked");
      if (c !== null) return c === "true";
    } catch (e3) {}
    return null;
  }

  // Tippy keeps every popper it has EVER created in the DOM (one
  // div[data-tippy-root] per instance — the page accumulates several over a
  // session, e.g. tippy-36 from the bottom-bar heart and tippy-37 from a track
  // row), and each one carries its own #curation-sheet-list plus its own
  // "Find a playlist" input with whatever query was last typed into it.
  //
  // document.getElementById() returns the FIRST match regardless of which
  // popper is live, so this could pick a dead popper (making the whole read
  // fail -> library fallback) or a stale one still holding an old, FILTERED
  // list. That is the "randomly filtered and incomplete" symptom.
  //
  // Enumerate every candidate and take the LIVE one instead.
  function curationCandidates() {
    var out = [];
    var nodes = [];
    try {
      nodes = Array.prototype.slice.call(document.querySelectorAll(
        "#" + CSS_ESC(CURATION.listId) + ', ul[aria-label="' + CURATION.listLabelRaw + '"]'
      ));
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      if (isInOurRoot(nodes[i])) continue;
      out.push(nodes[i]);
    }
    if (out.length) return out;
    // Fallback (locale-proof / id-change-proof): any menu whose rows carry the
    // curation identity (listrow-title-spotify:… on a menuitemcheckbox). The
    // tippy "Add to playlist" submenu uses plain menuitem rows without that
    // identity, so it can never match here.
    try {
      var menus = document.querySelectorAll('ul[role="menu"]');
      for (var m = 0; m < menus.length; m++) {
        if (isInOurRoot(menus[m])) continue;
        var btns = null;
        try {
          btns = menus[m].querySelectorAll('button[role="menuitemcheckbox"]');
        } catch (e) { btns = null; }
        if (!btns || !btns.length) continue;
        var hit = false;
        for (var b = 0; b < btns.length && b < 8; b++) {
          try {
            if (curationRowUri(btns[b])) { hit = true; break; }
          } catch (e2) {}
        }
        if (hit) out.push(menus[m]);
      }
    } catch (e3) {}
    return out;
  }

  function findCurationList() {
    var cands = curationCandidates();
    if (!cands.length) return null;
    // Newest first: tippy appends new popper roots to the end of <body>, so the
    // most recently opened one is last in document order. That is the LIVE
    // popper; older ones are stale leftovers (possibly filtered, possibly for
    // a previous track) and must never win over the live one — even if the
    // live one is still mounting its rows (the sweep waits for rows).
    for (var pass = cands.length - 1; pass >= 0; pass--) {
      var ul = cands[pass];
      try {
        if (!isVisible(ul)) continue;
        var hasId = false;
        try { hasId = ul.id === CURATION.listId; } catch (eid) {}
        var label = norm(ul.getAttribute("aria-label"));
        // The id is stable across locales; the English aria-label is not.
        // Only enforce the label check for non-id matches (locale-proofing).
        if (!hasId && label && label.indexOf(CURATION.listLabel) === -1) continue;
        return ul;
      } catch (e) {}
    }
    return null;
  }

  // Minimal CSS identifier escape: only used to build a selector from our own
  // constant (never from Spotify's markup), so this just guards odd chars.
  function CSS_ESC(v) {
    return String(v).replace(/["\\\]\[]/g, "\\$&");
  }

  function curationFormOf(ul) {
    try {
      if (!ul) return null;
      if (ul.tagName === "FORM") return ul;
      return ul.closest ? ul.closest("form") : null;
    } catch (e) {
      return null;
    }
  }

  // The row's identity lives in `listrow-title-<uri>`, but it is NOT always on
  // the <button>: current builds put aria-labelledby on the inner
  // div[data-encore-id="listRow"][role="group"] and leave the button bare.
  // Same dual shape as the device rows (rowKey), so resolve the same way:
  // own aria-labelledby -> nested one -> the title element's own id.
  function curationRowUri(btn) {
    // Ids are base62 on open.spotify.com, but never truncate on a narrower class:
  // `-`/`_` appear in playlist ids surfaced by other surfaces (and would
  // silently yield a wrong id + href). Matches parsePlaylistHref's class.
  var re = /listrow-title-(spotify:(?:collection:tracks|playlist:[A-Za-z0-9_-]+)|new-playlist)/;
    if (!btn || !btn.getAttribute) return "";
    try {
      var m = (btn.getAttribute("aria-labelledby") || "").match(re);
      if (m) return m[1];
      if (btn.querySelectorAll) {
        var nested = btn.querySelectorAll("[aria-labelledby]");
        for (var i = 0; i < nested.length; i++) {
          var m2 = (nested[i].getAttribute("aria-labelledby") || "").match(re);
          if (m2) return m2[1];
        }
      }
      var title = btn.querySelector('p[data-encore-id="listRowTitle"]');
      if (title && title.id && title.id.indexOf("listrow-title-") === 0) {
        var m3 = title.id.match(re);
        if (m3) return m3[1];
      }
    } catch (e) {}
    return "";
  }

  function parseCurationRow(btn) {
    var uri = curationRowUri(btn);
    if (!uri || uri === CURATION.newRow) return null;
    var isLiked = uri === CURATION.likedUri;
    var id = "";
    if (!isLiked) {
      var m = uri.match(/spotify:playlist:([A-Za-z0-9_-]+)/);
      id = m ? m[1] : uri;
    } else {
      id = "__liked__";
    }
    var name = "";
    try {
      var title = btn.querySelector('p[data-encore-id="listRowTitle"]');
      var span = title && title.querySelector ? title.querySelector("span") : null;
      name = ((span && span.textContent) || (title && title.textContent) || btn.textContent || "")
        .replace(/\s+/g, " ").trim();
    } catch (e) {}
    if (!name) return null;
    var art = "";
    try {
      var img = btn.querySelector('img[data-testid="entity-image"]');
      if (img) {
        var best = "";
        try {
          var ss = img.getAttribute("srcset") || "";
          var parts = String(ss).split(",");
          var bw = 0;
          for (var i = 0; i < parts.length; i++) {
            var tok = parts[i].trim().split(/\s+/);
            var wm = tok.length > 1 ? tok[1].match(/^(\d+)w$/) : null;
            var w = wm ? parseInt(wm[1], 10) : 0;
            if (tok[0] && w >= bw) {
              bw = w;
              best = tok[0];
            }
          }
        } catch (e2) {}
        art = best || img.currentSrc || img.src || "";
      }
    } catch (e) {}
    var checked = false;
    try {
      checked = btn.getAttribute("aria-checked") === "true";
    } catch (e) {}
    return {
      el: btn,
      uri: uri,
      id: id,
      href: isLiked ? PLAYLIST.collectionHref : "/playlist/" + id,
      name: name,
      subtitle: isLiked ? "Liked Songs" : "Playlist",
      artwork: art || "",
      containsTrack: !!checked,
      addable: true,
      isLikedSongs: isLiked,
    };
  }

  function curationLeafRows() {
    var out = [];
    var ul = null;
    try {
      ul = findCurationList();
    } catch (e) {
      ul = null;
    }
    if (!ul) return out;
    var btns = [];
    try {
      btns = Array.prototype.slice.call(ul.querySelectorAll('button[role="menuitemcheckbox"]'));
    } catch (e) {
      btns = [];
    }
    for (var i = 0; i < btns.length; i++) {
      if (isInOurRoot(btns[i])) continue;
      // Folders would carry aria-expanded (as in the tippy submenu); the
      // curation sheet is flat, but guard anyway.
      try {
        if (btns[i].getAttribute("aria-expanded") !== null) continue;
      } catch (e) {}
      var row = null;
      try {
        row = parseCurationRow(btns[i]);
      } catch (e) {
        row = null;
      }
      if (row) out.push(row);
    }
    return out;
  }

  function setNativeInputValue(input, value) {
    if (!input) return false;
    try {
      var proto = window.HTMLInputElement && window.HTMLInputElement.prototype;
      var desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) desc.set.call(input, String(value));
      else input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Spotify's sheet keeps its "Find a playlist" query in component state and
  // the tippy popper can be reused across opens, so a leftover query filters
  // the list. A read that inherits it returns a partial, FILTERED result —
  // which surfaces as a randomly short playlist list on a phone (anything that
  // seeded the box first, e.g. an earlier write via ensureVisible, decides
  // whether the next open is filtered or not). Clear it before collecting
  // anything, and give the list a beat to re-render unfiltered.
  function clearCurationSearch(form) {
    var box = null;
    try {
      box = form && form.querySelector ? form.querySelector('input[role="searchbox"]') : null;
    } catch (e) {
      box = null;
    }
    if (!box) return Promise.resolve(false);
    var cur = "";
    try {
      cur = box.value || "";
    } catch (e) {}
    if (!cur) return Promise.resolve(false);
    try {
      setNativeInputValue(box, "");
    } catch (e) {}
    return waitFor(function () {
      try {
        return (box.value || "") === "";
      } catch (e) {
        return true;
      }
    }, 600, 50).then(function () {
      return true;
    });
  }

  // Virtualized sweep: collect rows by URI across scroll positions until the
  // setsize count is reached, or the scroller is provably at the end and two
  // consecutive passes add nothing.
  //
  // The old bail-out was "scrollTop stopped moving for 3 steps". That is not a
  // reliable end-of-list signal: on a short phone viewport the list mounts rows
  // lazily, so the scroller can sit still while more rows are still pending —
  // which is how the read came back incomplete. Prefer aria-setsize; fall back
  // to actually reaching the bottom, confirmed twice.
  //
  // Android/desktop-site hardening:
  // - Start from the TOP (scrollTop=0 + settle) so the pinned Liked Songs row
  //   is always collected first. A sweep that starts mid-list after a
  //   clear-search re-render could scroll down and never see the top again —
  //   which is how Liked Songs went missing from an otherwise "complete" read.
  // - Wait for the first rows to MOUNT (up to ~2s) instead of returning []
  //   instantly when the popper is still inflating. An instant [] degrades to
  //   the Your-Library scrape — the wrong, short list.
  // - Re-resolve the list + viewport every pass (React replaces nodes; the
  //   popper itself can be swapped on retry).
  // - Completeness requires the Liked Songs row: every account has one, so a
  //   list without it is provably partial and must expire immediately.
  function sweepCurationRows() {
    var byUri = {};
    var maxSetsize = 0;
    function liveList() {
      try { return findCurationList(); } catch (e) { return null; }
    }
    function liveViewport(ul) {
      try {
        var form = curationFormOf(ul);
        return (
          (form && form.querySelector("[data-overlayscrollbars-viewport]")) ||
          (ul && ul.parentElement) ||
          null
        );
      } catch (e) { return null; }
    }
    function count() {
      var n = 0;
      for (var k in byUri) {
        if (Object.prototype.hasOwnProperty.call(byUri, k)) n++;
      }
      return n;
    }
    // Returns how many NEW uris this pass added.
    function collect() {
      var rows = [];
      try {
        rows = curationLeafRows();
      } catch (e) {
        rows = [];
      }
      var added = 0;
      for (var i = 0; i < rows.length; i++) {
        try {
          var ss = rows[i].el ? rows[i].el.getAttribute("aria-setsize") : null;
          if (ss) maxSetsize = Math.max(maxSetsize, parseInt(ss, 10) || 0);
        } catch (e) {}
        if (!byUri[rows[i].uri]) {
          byUri[rows[i].uri] = rows[i];
          added++;
        } else if (rows[i].containsTrack && !byUri[rows[i].uri].containsTrack) {
          // Same row re-rendered with a fresher checked state wins.
          byUri[rows[i].uri] = rows[i];
        }
      }
      return added;
    }
    function toList() {
      var out = [];
      for (var k in byUri) {
        if (Object.prototype.hasOwnProperty.call(byUri, k)) out.push(byUri[k]);
      }
      return out;
    }
    function hasLiked() {
      return !!byUri[CURATION.likedUri];
    }
    function viewportAtBottom(vp) {
      try {
        var total = vp.scrollHeight || 0;
        if (!total) return false;
        var top = vp.scrollTop || 0;
        var h = vp.clientHeight || 0;
        if (!h) return false;
        return top + h >= total - 4;
      } catch (e) {
        return false;
      }
    }
    var ul0 = liveList();
    if (!ul0) return Promise.resolve([]);
    var form0 = curationFormOf(ul0);
    var vp0 = liveViewport(ul0);
    // Settle at the top BEFORE clearing: the clear triggers a re-render and
    // the first collect must see the unfiltered top (Liked Songs) — not a
    // mid-list viewport left over from a previous sweep.
    try {
      if (vp0) vp0.scrollTop = 0;
    } catch (e) {}
    return waitFor(function () {
      try {
        return curationLeafRows().length ? true : null;
      } catch (e) { return null; }
    }, 2000, 60).then(function () {
      var form = null;
      try { form = curationFormOf(liveList()) || form0; } catch (e) { form = form0; }
      return clearCurationSearch(form).then(function (cleared) {
        sweepLog.clearedSearch = !!cleared;
        // The clear re-renders: give it a beat, re-pin to the top, then collect.
        return waitFor(function () {
          try { return curationLeafRows().length ? true : null; } catch (e) { return null; }
        }, 1200, 60).then(function () {
          var vpStart = liveViewport(liveList());
          try { if (vpStart) vpStart.scrollTop = 0; } catch (e) {}
          collect();
          var viewport = liveViewport(liveList());
          if (!viewport || !viewport.scrollTo) {
            // No scroller (short list fully mounted): completeness = setsize
            // reached (tolerating the New-playlist row) AND Liked present.
            var list0 = toList();
            var target0 = maxSetsize ? Math.max(0, maxSetsize - 1) : 0;
            var ok0 = (!maxSetsize || list0.length >= target0) && hasLiked();
            sweepLog.noViewport = true;
            sweepLog.complete = !!ok0;
            sweepLog.target = target0;
            sweepLog.maxSetsize = maxSetsize;
            sweepLog.rows = list0.length;
            sweepLog.hasLiked = hasLiked();
            return list0;
          }
          return new Promise(function (resolve) {
            var steps = 0;
            var bottomRounds = 0;
            var t0 = nowMsMs();
            // Re-pin to the top once more: the clear-search re-render above can
            // leave the viewport mid-list on virtualized builds.
            try { viewport.scrollTop = 0; } catch (e) {}
            (function step() {
              // Re-resolve every pass: React swaps nodes mid-sweep.
              var vp = liveViewport(liveList()) || viewport;
              viewport = vp;
              var target = maxSetsize ? Math.max(0, maxSetsize - 1) : 0;
              // Definitely whole: setsize count reached AND Liked seen.
              if (maxSetsize && count() >= maxSetsize && hasLiked()) return finish(true);
              // Whole under the New-playlist-counted build: setsize-1 + Liked.
              if (maxSetsize && count() >= target && hasLiked() && bottomRounds >= 1) return finish(true);
              if (steps >= 60) return finish(false);
              steps++;
              var added = collect();
              // Refresh target after this pass (a later row may carry setsize
              // when the first pass saw none).
              target = maxSetsize ? Math.max(0, maxSetsize - 1) : 0;
              if (maxSetsize && count() >= maxSetsize && hasLiked()) return finish(true);
              var bottom = vp ? viewportAtBottom(vp) : false;
              if (bottom && added === 0) {
                bottomRounds++;
                // Two confirming passes at the very end, then trust it —
                // but only with Liked present (else provably partial).
                if (bottomRounds >= 2 && steps > 3) return finish(hasLiked());
              } else if (!bottom) {
                bottomRounds = 0;
              }
              var top = 0;
              try {
                top = vp.scrollTop || 0;
              } catch (e) {}
              // Advance by a screen-ish step, but never past the end.
              var h = 0;
              try {
                h = vp.clientHeight || 400;
              } catch (e) {}
              try {
                vp.scrollTop = Math.min(top + Math.max(240, h * 0.85), (vp.scrollHeight || 0));
                // Overlayscrollbars + virtualized lists only mount on scroll
                // events; a programmatic scrollTop without one can leave rows
                // unmounted on some builds.
                vp.dispatchEvent(new Event("scroll", { bubbles: true }));
              } catch (e) {}
              setTimeout(step, 70);
            })();
            // complete=true only when we PROVED we saw everything: the
            // setsize count was reached (tolerating the New row) AND the
            // pinned Liked Songs row was seen, or the scroller reached the
            // end and stayed quiet with Liked present. Anything else is a
            // possibly-short list and must not be cached as if it were whole.
            function finish(complete) {
              try {
                var vpf = liveViewport(liveList()) || viewport;
                if (vpf) {
                  vpf.scrollTop = 0;
                  try { vpf.dispatchEvent(new Event("scroll", { bubbles: true })); } catch (e2) {}
                }
              } catch (e) {}
              // Last chance for a virtualized-away Liked: re-pin top + one
              // more collect before giving up on it.
              if (!hasLiked()) {
                try { collect(); } catch (e) {}
              }
              var out = toList();
              var targetF = maxSetsize ? Math.max(0, maxSetsize - 1) : 0;
              var whole = !!complete && (!maxSetsize || out.length >= targetF) && hasLiked();
              sweepLog.steps = steps;
              sweepLog.target = targetF;
              sweepLog.maxSetsize = maxSetsize;
              sweepLog.rows = out.length;
              sweepLog.bottomRounds = bottomRounds;
              sweepLog.hasLiked = hasLiked();
              sweepLog.complete = !!whole;
              sweepLog.ms = Math.round(nowMsMs() - t0);
              resolve(out);
            }
          });
        });
      });
    });
  }

  var sweepLog = {};

  function nowMsMs() {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }

  function curationCancel(form) {
    var btns = [];
    try {
      var scope = form || document;
      btns = Array.prototype.slice.call(scope.querySelectorAll("button"));
    } catch (e) {
      btns = [];
    }
    for (var i = 0; i < btns.length; i++) {
      if (isInOurRoot(btns[i])) continue;
      var t = "";
      try {
        t = norm(btns[i].textContent);
      } catch (e) {}
      if (t === "cancel") return btns[i];
    }
    return null;
  }

  // Cancel path: discards staged checks (reads and noops). Done path below
  // commits them — the two must never be confused.
  function cancelCurationSheet() {
    var form = null;
    try {
      var ul = findCurationList();
      form = curationFormOf(ul) || (ul && ul.parentElement) || null;
    } catch (e) {
      form = null;
    }
    var cancel = null;
    try {
      cancel = curationCancel(form);
    } catch (e) {
      cancel = null;
    }
    if (cancel) userClick(cancel);
    else {
      try {
        var ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
        ev.__spmSynthetic = true;
        document.dispatchEvent(ev);
      } catch (e) {}
    }
    return waitFor(function () {
      try {
        if (findCurationList()) return null;
      } catch (e) {}
      return true;
    }, 1200, 80).then(function () {
      playlistVeilStop();
    });
  }

  // Opens the curation sheet, running the transient-like dance for unsaved
  // tracks (documented above). Resolves { transient, prevFocus } or
  // { reason }. ALWAYS veils; on failure the veil is lifted before resolving.
  // Done path: commits staged checks (Spotify's saveChanges). Resolves
  // { closed, usedDone }. If no Done button exists, falls back to Cancel
  // (usedDone:false) — callers then fresh-verify instead of trusting.
  function saveCurationSheet() {
    var form = null;
    try {
      var ul = findCurationList();
      form = curationFormOf(ul) || (ul && ul.parentElement) || null;
    } catch (e) {
      form = null;
    }
    var done = null;
    try {
      var btns = (form || document).querySelectorAll
        ? Array.prototype.slice.call((form || document).querySelectorAll("button"))
        : [];
      for (var i = 0; i < btns.length; i++) {
        if (isInOurRoot(btns[i])) continue;
        var t = "";
        try {
          t = norm(btns[i].textContent);
        } catch (e) {}
        if (t === "done") {
          done = btns[i];
          break;
        }
      }
    } catch (e) {
      done = null;
    }
    if (!done) {
      return cancelCurationSheet().then(function () {
        return { closed: true, usedDone: false };
      });
    }
    userClick(done);
    return waitFor(function () {
      try {
        if (findCurationList()) return null;
      } catch (e) {}
      return true;
    }, 1500, 80).then(function (gone) {
      if (gone) {
        playlistVeilStop();
        return { closed: true, usedDone: true };
      }
      return cancelCurationSheet().then(function () {
        return { closed: true, usedDone: false };
      });
    });
  }

  // The popper (form) a row lives in. Spotify keeps every tippy popper it has
  // ever opened in the DOM, so a document-wide search for "the row with this
  // uri" can land on a DIFFERENT popper's row — which is how a flip could be
  // verified against an untouched duplicate and reported as a failure. Scope
  // every row-level operation to the popper the row actually came from.
  function curationScopeOf(el) {
    try {
      if (!el) return null;
      var f = el.closest ? el.closest("form") : null;
      if (f) return f;
      var root = el.closest ? el.closest('div[data-tippy-root]') : null;
      return root || el.parentElement || null;
    } catch (e) {
      return null;
    }
  }

  // Stages one row click (checkbox visual flip). Resolves true when the
  // row's aria-checked visibly flips (staging, not yet committed).
  // Re-resolved by URI, never by the raw aria-labelledby string: the row is a
  // fresh node after React re-renders, and the attribute lives on different
  // elements across builds (see curationRowUri). The search is scoped to the
  // SAME popper so a duplicate row in another popper cannot be mistaken for it.
  function stageRowClick(rowEl, wantState) {
    try {
      rowEl.click();
    } catch (e) {
      return Promise.resolve(false);
    }
    var wantUri = "";
    var scope = null;
    try {
      wantUri = curationRowUri(rowEl);
      scope = curationScopeOf(rowEl);
    } catch (e) {}
    if (!wantUri) return Promise.resolve(false);
    var searchIn = (scope && scope.querySelectorAll)
      ? scope
      : (document.querySelectorAll ? document : null);
    if (!searchIn) return Promise.resolve(false);
    return waitFor(function () {
      var cur = null;
      try {
        var all = Array.prototype.slice.call(
          searchIn.querySelectorAll('button[role="menuitemcheckbox"]')
        );
        for (var i = 0; i < all.length; i++) {
          if (isInOurRoot(all[i])) continue;
          if (curationRowUri(all[i]) === wantUri) {
            cur = all[i];
            break;
          }
        }
      } catch (e) {
        cur = null;
      }
      if (!cur) return null;
      try {
        return (cur.getAttribute("aria-checked") === "true") === !!wantState ? true : null;
      } catch (e) {
        return null;
      }
    }, 2000, 100);
  }

  function ensureCurationSheet() {
    // There can be several curation buttons on the page (bottom-bar heart and
    // a track-row heart), each with its own tippy popper. Try them in turn until
    // one actually opens a sheet, instead of betting the whole read on whichever
    // happens to be first in the DOM.
    var cands = [];
    try {
      cands = findCurationButtons();
    } catch (e) {
      cands = [];
    }
    if (!cands.length) return Promise.resolve({ reason: "no-curation-button" });
    var prevFocus = null;
    try {
      prevFocus = document.activeElement;
    } catch (e) {}
    // Veil up front so no Spotify menu can flash. Safe only because the veil
    // keeps tippy roots laid out and merely dims them (see
    // playlistVeilStart): a popper that could not lay out would never mount
    // its rows and the read would degrade to the library scrape.
    playlistVeilStart();

    var idx = 0;
    function cur() {
      return cands[idx] && cands[idx].el ? cands[idx].el : null;
    }
    function buttonChecked() {
      var b = cur();
      if (!b) return null;
      try {
        var c = b.getAttribute("aria-checked");
        return c === null ? null : c === "true";
      } catch (e) {
        return null;
      }
    }
    function clickButton() {
      var b = cur();
      return b ? userClick(b) : false;
    }
    function nextCandidate() {
      idx++;
      return idx < cands.length;
    }
    function waitSheet(timeout) {
      return waitFor(function () {
        try {
          return findCurationList() ? true : null;
        } catch (e) {
          return null;
        }
      }, timeout || 2000, 50);
    }
    // The container alone is not enough: tippy mounts the popper first and the
    // virtualized rows a beat later (slower on phone CPUs). A sweep that starts
    // on an empty container returns [] and degrades to the wrong library list.
    function waitSheetRows(timeout) {
      return waitFor(function () {
        try {
          var ul = findCurationList();
          if (!ul) return null;
          var rows = ul.querySelectorAll
            ? ul.querySelectorAll('button[role="menuitemcheckbox"]')
            : [];
          return rows && rows.length ? true : null;
        } catch (e) {
          return null;
        }
      }, timeout || 2500, 60);
    }
    // Safety net: if the sheet will not appear while veiled, drop the veil and
    // look once more. A visible sheet beats a wrong list.
    function retryUnveiled() {
      if (!playlistVeil) return waitSheet(2500);
      playlistVeilStop();
      return waitSheet(2500).then(function (found2) {
        if (!found2) playlistVeilStart();
        return found2;
      });
    }
    function fail(reason) {
      playlistVeilStop();
      try {
        prevFocus && prevFocus.focus && prevFocus.focus();
      } catch (e) {}
      return { reason: reason };
    }
    // A stale popper still holding a leftover "Find a playlist" query renders
    // ONLY its filtered subset (and no Liked Songs row) — yet it is visible,
    // so "a list with rows" is not enough to call the open a success. Detect
    // it: a non-empty searchbox, or a mounted list whose setsize promises more
    // rows than are rendered and whose Liked row is absent. The stale DOM can
    // never grow the missing rows (they were never rendered), so clear-and-wait
    // once and then move on to the next candidate button, whose own popper is
    // the live one.
    function sheetSearchValue() {
      try {
        var ul = findCurationList();
        var form = curationFormOf(ul);
        var box = form && form.querySelector ? form.querySelector('input[role="searchbox"]') : null;
        return box ? (box.value || "") : "";
      } catch (e) { return ""; }
    }
    function sheetLooksStale() {
      try {
        var rows = curationLeafRows();
        if (!rows.length) return false;
        var hasLiked = false;
        var maxSs = 0;
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].isLikedSongs) hasLiked = true;
          try {
            var ss = rows[i].el ? parseInt(rows[i].el.getAttribute("aria-setsize"), 10) : 0;
            if (ss > maxSs) maxSs = ss;
          } catch (e) {}
        }
        var q = "";
        try { q = sheetSearchValue() || ""; } catch (e2) {}
        // Leftover query filtering the list.
        if (q && q.trim()) return true;
        // setsize promises ≥2 more rows than rendered and Liked is absent:
        // a filtered/virtualized-away top, not a genuine short list.
        if (maxSs && rows.length + 1 < maxSs && !hasLiked) return true;
        return false;
      } catch (e) { return false; }
    }
    function closeStaleSheet() {
      var ul = null;
      var form = null;
      try {
        ul = findCurationList();
        form = curationFormOf(ul);
      } catch (e) {}
      var cancel = null;
      try { cancel = form ? curationCancel(form) : null; } catch (e2) {}
      if (cancel) {
        try { userClick(cancel); } catch (e3) {}
      } else {
        try {
          var ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
          ev.__spmSynthetic = true;
          document.dispatchEvent(ev);
        } catch (e4) {}
      }
      return waitFor(function () {
        try { return sheetLooksStale() ? null : true; } catch (e) { return true; }
      }, 800, 80).then(function () { return true; });
    }
    // Saved state: ONE tap opens the sheet. Three ways this can go wrong, handled
    // in order of how likely they are:
    //   1. the tap produced NO change at all in the popper/list surface — the
    //      handler never ran (Android refusing a bare synthetic click), so tap
    //      again (with hover prelude + full touch+mouse sequence);
    //   2. something appeared but no visible list/rows — wait for rows, then
    //      drop the veil and wait again (a popper that will not lay out while
    //      dimmed);
    //   3. the list that appeared is a STALE filtered popper (leftover query) —
    //      close it and move on to the next candidate button, whose popper is live;
    //   4. still nothing — move on to the next candidate button.
    function openFromSaved(attempt) {
      var tries = attempt || 0;
      var before = curationSurfaceCount();
      clickButton();
      return waitSheet().then(function (found) {
        if (found) {
          // Container is up — but rows may still be mounting. Require rows
          // before calling it open, else the sweep races an empty list.
          return waitSheetRows(2500).then(function (rows) {
            if (!rows) {
              // Rows never mounted under this veil: drop it and look again.
              return retryUnveiled().then(function (found2) {
                if (!found2) {
                  if (nextCandidate()) return openFromSaved(0);
                  return false;
                }
                return waitSheetRows(2500).then(function (rows2) {
                  if (!rows2) {
                    if (nextCandidate()) return openFromSaved(0);
                    return false;
                  }
                  if (sheetLooksStale()) {
                    return closeStaleSheet().then(function () {
                      if (nextCandidate()) return openFromSaved(0);
                      return false;
                    });
                  }
                  return true;
                });
              });
            }
            if (sheetLooksStale()) {
              // Try to rescue by clearing the leftover query first: a live
              // popper re-renders unfiltered, a truly stale one cannot.
              var cleared = false;
              try {
                var ulS = findCurationList();
                var formS = curationFormOf(ulS);
                var boxS = formS && formS.querySelector ? formS.querySelector('input[role="searchbox"]') : null;
                if (boxS && (boxS.value || "")) {
                  setNativeInputValue(boxS, "");
                  cleared = true;
                }
              } catch (e) {}
              if (cleared) {
                return waitFor(function () {
                  try { return sheetLooksStale() ? null : true; } catch (e) { return true; }
                }, 900, 80).then(function () {
                  if (!sheetLooksStale()) return true;
                  return closeStaleSheet().then(function () {
                    if (nextCandidate()) return openFromSaved(0);
                    return true; // last resort: sweep what we have (marks partial)
                  });
                });
              }
              return closeStaleSheet().then(function () {
                if (nextCandidate()) return openFromSaved(0);
                return true; // no more candidates: sweep what we have (marks partial)
              });
            }
            return true;
          });
        }
        var after = curationSurfaceCount();
        if (after === before && tries < 2) {
          // Nothing whatsoever happened: the tap did not land. Try again —
          // the second attempt re-scrolls into view + refocuses inside userClick.
          return openFromSaved(tries + 1);
        }
        return retryUnveiled().then(function (found2) {
          if (found2) {
            return waitSheetRows(2500).then(function (r2) {
              if (!r2) {
                if (nextCandidate()) return openFromSaved(0);
                return false;
              }
              if (sheetLooksStale()) {
                return closeStaleSheet().then(function () {
                  if (nextCandidate()) return openFromSaved(0);
                  return true;
                });
              }
              return true;
            });
          }
          if (nextCandidate()) return openFromSaved(0);
          return false;
        });
      });
    }

    var first = buttonChecked();
    if (first === null) return Promise.resolve(fail("no-curation-button"));

    if (first === true) {
      return openFromSaved().then(function (ok) {
        if (!ok) return fail("sheet-unavailable");
        return { transient: false, prevFocus: prevFocus };
      });
    }

    // Unsaved: click#1 really Likes (transient). The track is now saved, so any
    // candidate should open on a single click from here.
    clickButton();
    return waitFor(function () {
      return buttonChecked() === true ? true : null;
    }, 2000, 60).then(function (liked) {
      if (!liked) return fail("like-failed");
      return openFromSaved().then(function (ok) {
        if (ok) return { transient: true, prevFocus: prevFocus };
        // Sheet didn't open with a transient Like outstanding: take it back via
        // the symmetric toggle if there is one, else report the leak
        // explicitly (never silently keep it).
        return restoreTransientLike().then(function (restored) {
          if (restored) return fail("sheet-unavailable");
          return fail("sheet-unavailable-transient");
        });
      });
    });
  }

  // Takes back a transient Like using the symmetric toggle when available.
  // Resolves true when the curation button reads unchecked afterwards.
  // Never clicks the curation button here: in saved state it opens the
  // sheet instead of unliking.
  function restoreTransientLike() {
    var sym = null;
    try {
      sym = findLikeButton();
    } catch (e) {
      sym = null;
    }
    if (sym) userClick(sym);
    return waitFor(function () {
      var c = null;
      try {
        c = curationLikedState();
      } catch (e) {}
      return c === false ? true : null;
    }, 1500, 80);
  }

  // Restores a transient Like from INSIDE the open sheet via its own Liked
  // row (the reliable path — the button itself can't unlike while saved).
  // Stages the transient-Like restore INSIDE the open sheet (flips the
  // Liked row visual off). Committing happens once via Done by the caller.
  // Resolves { staged } — never closes anything.
  function restoreTransientInSheet() {
    var rows = [];
    try {
      rows = curationLeafRows();
    } catch (e) {
      rows = [];
    }
    var liked = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].isLikedSongs) {
        liked = rows[i];
        break;
      }
    }
    if (!liked) return Promise.resolve({ staged: false });
    if (!liked.containsTrack) return Promise.resolve({ staged: true });
    return stageRowClick(liked.el, false).then(function (staged) {
      return { staged: !!staged };
    });
  }

  // Cancel-close (discards staging): for reads and noops.
  function finishCurationOp(prevFocus) {
    return cancelCurationSheet().then(function () {
      try {
        prevFocus && prevFocus.focus && prevFocus.focus();
      } catch (e) {}
    });
  }

  // Done-commit close: for staged changes. Resolves { closed, usedDone }.
  function finishCurationSave(prevFocus) {
    return saveCurationSheet().then(function (res) {
      try {
        prevFocus && prevFocus.focus && prevFocus.focus();
      } catch (e) {}
      return res;
    });
  }

  // Full read: open (dance if needed) -> sweep -> restore transient via
  // Done-commit -> return. Resolves { list } or { reason }. Reads stage
  // nothing, so the non-transient path Cancel-closes (nothing to discard).
  function curationRead() {
    return ensureCurationSheet().then(function (opened) {
      if (!opened || opened.reason) return opened;
      var transient = !!opened.transient;
      var prevFocus = opened.prevFocus;
      return sweepCurationRows().then(function (rows) {
        var list = [];
        for (var i = 0; i < (rows || []).length; i++) {
          var r = rows[i];
          list.push({
            id: r.id,
            uri: r.uri,
            href: r.href,
            name: r.name,
            subtitle: r.subtitle,
            artwork: r.artwork,
            containsTrack: transient && r.isLikedSongs ? false : !!r.containsTrack,
            addable: true,
            isLikedSongs: !!r.isLikedSongs,
          });
        }
        // Liked Songs first (pinned in Spotify's sheet too).
        list.sort(function (a, b) {
          if (!!a.isLikedSongs === !!b.isLikedSongs) return 0;
          return a.isLikedSongs ? -1 : 1;
        });
        if (!transient) {
          return finishCurationOp(prevFocus).then(function () {
            return { list: list, complete: !!sweepLog.complete };
          });
        }
        // Commit the transient restore through Done (Cancel would discard
        // the unlike and leak a Like).
        return restoreTransientInSheet().then(function (staged) {
          if (!staged || !staged.staged) {
            return restoreTransientLike().then(function () {
              return finishCurationOp(prevFocus).then(function () {
                return { list: list, complete: !!sweepLog.complete };
              });
            });
          }
          return finishCurationSave(prevFocus).then(function (commit) {
            if (commit && commit.usedDone) return { list: list, complete: !!sweepLog.complete };
            // No Done: Cancel already closed; verify the unlike stuck.
            return restoreTransientLike().then(function () {
              return { list: list, complete: !!sweepLog.complete };
            });
          });
        });
      });
    });
  }

  // Full toggle for one playlist: open -> find the row (via the sheet's own
  // searchbox when virtualized away) -> ensure it ends at `want`
  // (true=add, false=remove, undefined=flip) -> verify -> restore transient
  // -> close. Resolves { ok, reason?, flippedTo? }.
  function curationToggle(target, want) {
    var uri = target && target.uri ? target.uri : "";
    var name = target && target.name ? target.name : "";
    if (!uri && !name) return Promise.resolve({ ok: false, reason: "no-playlist" });
    return ensureCurationSheet().then(function (opened) {
      if (!opened || opened.reason) {
        return { ok: false, reason: (opened && opened.reason) || "sheet-unavailable" };
      }
      var transient = !!opened.transient;
      var prevFocus = opened.prevFocus;
      // Transient Like that IS the desired end state (liking via the sheet):
      // keep it — restoring would undo exactly what was asked for.
      var keepTransient =
        transient && !!target.isLikedSongs && want === true;
      // finishWith(payload, staged): staged=true means a row visual was
      // flipped and must be COMMITTED via Done (Cancel would discard it).
      // Transient restores fold into the same single commit.
      function finishWith(payload, staged) {
        if (!staged) {
          return finishCurationOp(prevFocus).then(function () {
            return payload;
          });
        }
        function commitAndReport() {
          return finishCurationSave(prevFocus).then(function (commit) {
            if (commit && commit.usedDone) {
              try {
                var c = findPlaylistInCache({ id: payload.rowId });
                if (c) c.containsTrack = payload.flippedTo;
              } catch (e) {}
              if (payload.flippedTo) sessionMarkAdded(playlistKeyOf({ id: payload.rowId }));
              else sessionUnmark(playlistKeyOf({ id: payload.rowId }));
              return { ok: true, flippedTo: payload.flippedTo };
            }
            // No Done button: Cancel already closed; fresh-verify whether the
            // staged click applied immediately (some builds) or was lost.
            return verifyRowState(payload.uri, payload.flippedTo);
          });
        }
        if (!transient || keepTransient) return commitAndReport();
        return restoreTransientInSheet().then(function (stagedRestore) {
          if (stagedRestore && stagedRestore.staged) return commitAndReport();
          // Restore couldn't even stage: commit ours, then best-effort the
          // transient back via the symmetric toggle (never silently keep it).
          return finishCurationSave(prevFocus).then(function () {
            return restoreTransientLike().then(function () {
              try {
                var c2 = findPlaylistInCache({ id: payload.rowId });
                if (c2) c2.containsTrack = payload.flippedTo;
              } catch (e2) {}
              return { ok: true, flippedTo: payload.flippedTo };
            });
          });
        });
      }
      // Fresh-verify one row's state (no-Done fallback only): reopen, read,
      // compare, close. Resolves { ok, flippedTo? } or { ok:false, reason }.
      function verifyRowState(uri, wantState) {
        return curationRead().then(function (res) {
          if (!res || !res.list) return { ok: false, reason: "unconfirmed" };
          for (var i = 0; i < res.list.length; i++) {
            if (res.list[i].uri === uri) {
              if (!!res.list[i].containsTrack === !!wantState) {
                try {
                  var c = findPlaylistInCache({ id: res.list[i].id });
                  if (c) c.containsTrack = wantState;
                } catch (e) {}
                return { ok: true, flippedTo: wantState };
              }
              return { ok: false, reason: "unconfirmed" };
            }
          }
          return { ok: false, reason: "not-addable" };
        });
      }
      function findRow() {
        var rows = [];
        try {
          rows = curationLeafRows();
        } catch (e) {
          rows = [];
        }
        for (var i = 0; i < rows.length; i++) {
          if (uri && rows[i].uri === uri) return rows[i];
          if (!uri && norm(rows[i].name) === norm(name)) return rows[i];
        }
        return null;
      }
      function clickRow(r) {
        var before = !!r.containsTrack;
        var wantState = want === undefined ? !before : !!want;
        // Already at the desired state (stale cache race): no click needed.
        if (wantState === before) {
          return finishWith({ ok: true, flippedTo: before, noop: true }, false);
        }
        return stageRowClick(r.el, wantState).then(function (staged) {
          if (!staged) {
            return finishWith({ ok: false, reason: "click-failed" }, false);
          }
          r.el = null;
          return finishWith({ rowId: r.id, uri: r.uri, flippedTo: wantState }, true);
        });
      }
      var row = findRow();
      if (row) return clickRow(row);
      // Virtualized away: filter with the sheet's own search, then match.
      var ul = null;
      try {
        ul = findCurationList();
      } catch (e) {
        ul = null;
      }
      var form = curationFormOf(ul);
      var box = null;
      try {
        box = form && form.querySelector ? form.querySelector('input[role="searchbox"]') : null;
      } catch (e) {
        box = null;
      }
      if (!box || !name) return finishWith({ ok: false, reason: "not-addable" }, false);
      setNativeInputValue(box, name);
      return waitFor(function () {
        var r = findRow();
        return r ? r : null;
      }, 2000, 100).then(function (found) {
        try {
          setNativeInputValue(box, "");
        } catch (e) {}
        if (!found) return finishWith({ ok: false, reason: "not-addable" }, false);
        return clickRow(found);
      });
    });
  }

  // Batch draft save (mirrors Spotify's Done): opens once, stages one
  // click per changed row, commits once via Done, closes. targets =
  // [{ uri, id, name, isLikedSongs, want }]. Resolves
  // { ok, failed:[names], list? } — ok only when every change committed.
  function savePlaylistDraft(targets) {
    if (!targets || !targets.length) return Promise.resolve({ ok: true, failed: [] });
    return ensureCurationSheet().then(function (opened) {
      if (!opened || opened.reason) {
        return { ok: false, reason: (opened && opened.reason) || "sheet-unavailable", failed: targets.map(function (t) { return t.name; }) };
      }
      var transient = !!opened.transient;
      var prevFocus = opened.prevFocus;
      var likedTarget = null;
      for (var li = 0; li < targets.length; li++) {
        if (targets[li].isLikedSongs) {
          likedTarget = targets[li];
          break;
        }
      }
      // The transient Like is only the price of OPENING Spotify's sheet. Keep
      // it solely when this draft actually asks for Liked Songs; otherwise it
      // must be handed back before the commit, exactly like curationToggle.
      // (Keeping it for a plain playlist draft silently liked the track.)
      var keepTransient = transient && !!likedTarget && likedTarget.want === true;
      function findRowFor(t) {
        var rows = [];
        try {
          rows = curationLeafRows();
        } catch (e) {
          rows = [];
        }
        for (var i = 0; i < rows.length; i++) {
          if (t.uri && rows[i].uri === t.uri) return rows[i];
          if (!t.uri && norm(rows[i].name) === norm(t.name)) return rows[i];
        }
        return null;
      }
      function ensureVisible(t) {
        var r = findRowFor(t);
        if (r) return Promise.resolve(r);
        var ul = null;
        try {
          ul = findCurationList();
        } catch (e) {
          ul = null;
        }
        var form = curationFormOf(ul);
        var box = null;
        try {
          box = form && form.querySelector ? form.querySelector('input[role="searchbox"]') : null;
        } catch (e) {
          box = null;
        }
        if (!box || !t.name) return Promise.resolve(null);
        setNativeInputValue(box, t.name);
        return waitFor(function () {
          return findRowFor(t);
        }, 2000, 100).then(function (found) {
          try {
            setNativeInputValue(box, "");
          } catch (e) {}
          return found;
        });
      }
      var queue = targets.slice();
      var failed = [];
      var stagedUris = [];
      function next() {
        if (!queue.length) return commitAll();
        var t = queue.shift();
        return ensureVisible(t).then(function (row) {
          if (!row) {
            failed.push(t.name);
            return next();
          }
          if (!!row.containsTrack === !!t.want) return next(); // noop
          return stageRowClick(row.el, !!t.want).then(function (staged) {
            if (staged) stagedUris.push(t.uri || t.name);
            else failed.push(t.name);
            return next();
          });
        });
      }
      function commitAll() {
        function reportCommitted(usedDone) {
          void usedDone;
          var failedNames = failed.slice();
          try {
            var list = playlistCache.list || [];
            for (var i = 0; i < list.length; i++) {
              for (var s = 0; s < stagedUris.length; s++) {
                var su = stagedUris[s];
                if (list[i].uri === su || list[i].name === su) {
                  // Refresh from the draft intent (verified via commit).
                  for (var q = 0; q < targets.length; q++) {
                    if (targets[q].uri === list[i].uri || targets[q].name === list[i].name) {
                      list[i].containsTrack = !!targets[q].want;
                      if (targets[q].want) sessionMarkAdded(playlistKeyOf({ id: list[i].id }));
                      else sessionUnmark(playlistKeyOf({ id: list[i].id }));
                    }
                  }
                }
              }
            }
          } catch (e) {}
          return getPlaylists({ fresh: false }).then(function (list) {
            return { ok: failedNames.length === 0, failed: failedNames, list: list };
          });
        }
        function commitNow() {
          return finishCurationSave(prevFocus).then(function (commit) {
            if (commit && commit.usedDone) return reportCommitted(true);
            // No Done: Cancel already closed; fresh-verify every staged row.
            return verifyStaged();
          });
        }
        function verifyStaged() {
          return curationRead().then(function (res) {
            var stillBad = failed.slice();
            if (res && res.list) {
              for (var i = 0; i < stagedUris.length; i++) {
                var su = stagedUris[i];
                var want = null;
                for (var q = 0; q < targets.length; q++) {
                  if (targets[q].uri === su || targets[q].name === su) want = !!targets[q].want;
                }
                var seen = null;
                for (var j = 0; j < res.list.length; j++) {
                  if (res.list[j].uri === su || res.list[j].name === su) {
                    seen = res.list[j];
                    break;
                  }
                }
                var okRow = seen && !!seen.containsTrack === (want === null ? true : want);
                var nm = seen ? seen.name : su;
                if (okRow) {
                  try {
                    var c = findPlaylistInCache({ id: seen.id });
                    if (c) c.containsTrack = !!seen.containsTrack;
                  } catch (e) {}
                } else if (stillBad.indexOf(nm) === -1) {
                  stillBad.push(nm);
                }
              }
            } else {
              for (var k = 0; k < stagedUris.length; k++) {
                if (stillBad.indexOf(stagedUris[k]) === -1) stillBad.push(stagedUris[k]);
              }
            }
            return getPlaylists({ fresh: false }).then(function (list) {
              return { ok: stillBad.length === 0, failed: stillBad, list: list };
            });
          });
        }
        if (!transient || keepTransient) return commitNow();
        // Fold the transient restore into the same commit. If it can't even
        // stage, commit ours and then hand the Like back via the symmetric
        // toggle — never silently keep it.
        return restoreTransientInSheet().then(function (staged) {
          if (staged && staged.staged) return commitNow();
          return commitNow().then(function () {
            return restoreTransientLike();
          }).then(function () {
            return getPlaylists({ fresh: false });
          }).then(function (list) {
            return { ok: failed.length === 0, failed: failed.slice(), list: list };
          });
        });
      }
      return next();
    });
  }

  // Curation-backed fresh read for the cache. Resolves the list, or null
  // when the sheet path is unavailable (caller falls back to tippy).
  function readCurationFresh() {
    var keyNow = trackKeyNow();
    return curationRead().then(function (res) {
      if (!res || !res.list) return null;
      playlistCache = {
        list: res.list,
        at: Date.now(),
        ok: true,
        reason: "",
        trackKey: keyNow,
        empty: res.list.length <= 1,
        viaCuration: true,
        // Did the sweep actually see the whole list? A partial sweep must not be
        // cached as if it were the real thing, or a short list sticks for the
        // whole TTL and every open shows it.
        complete: res.complete !== false,
        sweep: sweepLog,
      };
      if (!playlistCache.complete) {
        playlistCache.reason = "partial-sweep";
      }
      return playlistCache.list;
    }).catch(function () {
      return null;
    });
  }

  // Async Like toggle for controls that can't use the sync path: symmetric
  // button when present, else the curation sheet's own Liked row (verified).
  // Resolves { ok, reason? }.
  function toggleLikeAsync(desire) {
    var want = desire === undefined ? undefined : !!desire;
    var actualNow = null;
    try {
      actualNow = isLiked();
    } catch (e) {}
    if (want !== undefined && actualNow === want) {
      return Promise.resolve({ ok: true, noop: true });
    }
    var sym = null;
    try {
      sym = findLikeButton();
    } catch (e) {
      sym = null;
    }
    if (sym) {
      var clicked = false;
      try {
        clicked = userClick(sym);
      } catch (e) {
        clicked = false;
      }
      if (!clicked) return Promise.resolve({ ok: false, reason: "like-unavailable" });
      var expect = want === undefined ? !actualNow : want;
      return waitFor(function () {
        var cur = null;
        try {
          cur = isLiked();
        } catch (e) {}
        return cur === expect ? true : null;
      }, 2000, 100).then(function (flipped) {
        return flipped ? { ok: true } : { ok: false, reason: "unconfirmed" };
      });
    }
    // No symmetric toggle: drive the curation sheet's Liked row. Decide from
    // the BUTTON's pre-dance truth (the sheet row may carry a transient).
    var actualBtn = null;
    try {
      actualBtn = curationLikedState();
    } catch (e) {}
    var wantState = want === undefined ? (actualBtn === null ? undefined : !actualBtn) : want;
    if (want !== undefined && actualBtn === want) {
      return Promise.resolve({ ok: true, noop: true });
    }
    return curationToggle(
      { uri: CURATION.likedUri, id: "__liked__", name: "Liked Songs", isLikedSongs: true },
      wantState
    ).then(function (res) {
      if (res && res.ok) return { ok: true };
      return { ok: false, reason: (res && res.reason) || "like-unavailable" };
    });
  }

  function mergePlaylistState(lib, submenuRows, likedNow, contextHref, submenuOk) {
    var marks = sessionMarks(trackKeyNow());
    var addableByName = {};
    var checkedByName = {};
    // submenuOk: the anchored depth-1 submenu mounted (even with zero rows —
    // a genuine zero-playlist user). Only then is "not listed" meaningful.
    var submenuSeen = !!submenuOk;
    if (submenuRows && submenuRows.length) {
      submenuSeen = true;
      for (var s = 0; s < submenuRows.length; s++) {
        var nm = norm(submenuRows[s].name);
        addableByName[nm] = true;
        if (submenuRows[s].checked === true) checkedByName[nm] = true;
      }
    }
    var contextId = parsePlaylistHref(contextHref || "");
    var out = [];
    for (var i = 0; i < lib.length; i++) {
      var p = lib[i];
      var nm2 = norm(p.name);
      var contains = false;
      if (checkedByName[nm2]) contains = true;
      else if (contextId && p.id === contextId) contains = true;
      else if (marks[playlistKeyOf(p)]) contains = true;
      out.push({
        id: p.id,
        uri: p.uri,
        href: p.href,
        name: p.name,
        subtitle: p.subtitle || "Playlist",
        artwork: p.artwork || "",
        containsTrack: !!contains,
        addable: submenuSeen ? !!addableByName[nm2] : true,
        isLikedSongs: false,
      });
    }
    // Playlists visible ONLY in the submenu (e.g. library virtualized and not
    // yet rendered) are still real — append them without artwork.
    if (submenuSeen) {
      for (var j = 0; j < submenuRows.length; j++) {
        var rn = submenuRows[j].name;
        var found = false;
        for (var k = 0; k < out.length; k++) {
          if (norm(out[k].name) === norm(rn)) {
            found = true;
            break;
          }
        }
        if (!found) {
          out.push({
            id: "",
            uri: "",
            href: "",
            name: rn,
            subtitle: "Playlist",
            artwork: "",
            containsTrack: submenuRows[j].checked === true,
            addable: true,
            isLikedSongs: false,
          });
        }
      }
    }
    // Liked Songs is always first: special, heart-synced, never invented.
    out.unshift({
      id: "__liked__",
      uri: "spotify:collection:tracks",
      href: PLAYLIST.collectionHref,
      name: "Liked Songs",
      subtitle: "Playlist • Liked",
      artwork: "",
      containsTrack: !!likedNow,
      addable: true,
      isLikedSongs: true,
    });
    return out;
  }

  function readPlaylistsFresh() {
    var keyNow = trackKeyNow();
    var lib = [];
    try {
      lib = readLibraryPlaylists();
    } catch (e) {
      lib = [];
    }
    var likedNow = false;
    try {
      likedNow = isLiked();
    } catch (e) {}
    var ctxHref = "";
    try {
      var ctx = getPlaybackContext() || {};
      ctxHref = ctx.href || "";
    } catch (e) {}
    // No library rows: either a genuine zero-playlist user (still show the
    // Liked row — it is independently readable) or a broken/logged-out page
    // (no track, no like button, no submenu either — report failure so the
    // UI can show its retry state instead of a misleading single row).
    if (!lib.length) {
      return openAddSubmenuHidden().then(function (res) {
        var rows = res && res.rows ? res.rows : null;
        var submenuOk = !!(res && !res.reason);
        return finishMenuOp(null).then(function () {
          var hasTrack = false;
          var hasLike = false;
          try {
            hasTrack = !!findTrackElement();
          } catch (e) {}
          try {
            hasLike = !!findLikeButton();
          } catch (e) {}
          if (!rows && !submenuOk && !hasTrack && !hasLike) {
            playlistCache = {
              list: [],
              at: Date.now(),
              ok: false,
              reason: (res && res.reason) || "library-empty",
              trackKey: keyNow,
              empty: true,
              viaCuration: false,
            };
            return playlistCache.list;
          }
          var merged = mergePlaylistState(lib, rows, likedNow, ctxHref, submenuOk);
          playlistCache = {
            list: merged,
            at: Date.now(),
            ok: true,
            reason: submenuOk ? "" : (res && res.reason) || "library-empty",
            trackKey: keyNow,
            empty: merged.length <= 1,
            viaCuration: false,
          };
          return playlistCache.list;
        });
      });
    }
    // Fast path: library already gives a real list. Confirm addable/checked
    // with ONE hidden submenu open (like Devices' hidden picker read).
    return openAddSubmenuHidden().then(function (res) {
      var rows = res && res.rows ? res.rows : null;
      var submenuOk = !!(res && !res.reason);
      var reason = res && res.reason ? res.reason : "";
      return finishMenuOp(null).then(function () {
        var merged = mergePlaylistState(lib, rows, likedNow, ctxHref, submenuOk);
        playlistCache = {
          list: merged,
          at: Date.now(),
          ok: true,
          reason: reason,
          trackKey: keyNow,
          empty: merged.length <= 1,
          viaCuration: false,
        };
        return playlistCache.list;
      });
    }).catch(function () {
      var merged2 = mergePlaylistState(lib, null, likedNow, ctxHref);
      playlistCache = {
        list: merged2,
        at: Date.now(),
        ok: true,
          reason: "submenu-unavailable",
          trackKey: keyNow,
          empty: merged2.length <= 1,
          viaCuration: false,
      };
      try {
        playlistVeilStop();
      } catch (e) {}
      return playlistCache.list;
    });
  }

  function getPlaylists(opts) {
    opts = opts || {};
    var keyNow = trackKeyNow();
    // A curation-backed list came straight out of Spotify's own sheet, so it is
    // server truth — and re-reading it means driving that sheet again (open,
    // sweep, close), which is the slowest thing we do. Hold it noticeably
    // longer. Our own writes update this cache in place, so a longer TTL cannot
    // show a stale membership. The library-scraped fallback keeps the short one.
    //
    // A sweep that could not prove it saw every row expires almost immediately
    // instead: serving a possibly-short list for 25s is exactly the "randomly
    // missing playlists" symptom, so the next open retries.
    var maxAge = typeof opts.maxAge === "number"
      ? opts.maxAge
      : playlistCache.complete === false
        ? 1200
        : playlistCache.viaCuration
          ? 25000
          : 8000;
    var sameTrack = playlistCache.trackKey === keyNow;
    if (opts.cached || (!opts.fresh && sameTrack && playlistCache.at && Date.now() - playlistCache.at < maxAge)) {
      // Re-stamp without reopening anything: the list shape is cached, but
      // Liked can flip anytime via the heart. Curation-backed lists are
      // server truth — only the Liked row is re-stamped, never session
      // marks; tippy-backed lists keep the old merge behavior.
      try {
        var likedNow = isLiked();
        var list = playlistCache.list || [];
        if (playlistCache.viaCuration) {
          for (var ci = 0; ci < list.length; ci++) {
            if (list[ci].isLikedSongs) list[ci].containsTrack = !!likedNow;
          }
        } else {
          var marks = sessionMarks(keyNow);
          var ctxHref = "";
          try {
            ctxHref = (getPlaybackContext() || {}).href || "";
          } catch (e) {}
          var contextId = parsePlaylistHref(ctxHref);
          for (var i = 0; i < list.length; i++) {
            if (list[i].isLikedSongs) list[i].containsTrack = !!likedNow;
            else if (contextId && list[i].id === contextId) list[i].containsTrack = true;
            else if (marks[playlistKeyOf(list[i])]) list[i].containsTrack = true;
          }
        }
      } catch (e) {}
      return Promise.resolve(playlistCache.list);
    }
    if (playlistBusy) return playlistBusy;
    // Track changed: drop session adds for the old track (never show Track
    // A's membership for Track B).
    if (playlistSession.trackKey !== keyNow) {
      playlistSession = { trackKey: keyNow, added: {} };
    }
    // Curation sheet first (exact URIs, artwork, verified checks); the
    // tippy context-menu path stays as the fallback for builds without it.
    playlistBusy = readCurationFresh().then(function (list) {
      if (list && list.length) {
        playlistBusy = null;
        return list;
      }
      return readPlaylistsFresh().then(function (list2) {
        playlistBusy = null;
        return list2 || playlistCache.list;
      });
    });
    return playlistBusy;
  }

  function getPlaylistsState() {
    return {
      list: (playlistCache.list || []).slice(),
      ok: playlistCache.ok,
      reason: playlistCache.reason,
      empty: !!playlistCache.empty,
      updatedAt: playlistCache.at,
      trackKey: playlistCache.trackKey,
// Which source produced this list. "curation" = Spotify's own
      // Add-to-playlist sheet (the correct list). Anything else means the
      // fallback (Your Library scrape) — i.e. the wrong list.
      viaCuration: !!playlistCache.viaCuration,
      // False when the sweep could not prove it read every row: the list may be
      // short, and it is cached only briefly so the next open retries.
      complete: playlistCache.complete !== false,
      sweep: playlistCache.sweep || null,
    };
  }

  function findPlaylistInCache(playlist) {
    var list = playlistCache.list || [];
    var wantId = playlist && playlist.id;
    var wantName = norm(playlist && playlist.name);
    for (var i = 0; i < list.length; i++) {
      if (wantId && list[i].id === wantId) return list[i];
      if (!wantId && wantName && norm(list[i].name) === wantName) return list[i];
    }
    return null;
  }

  // Tippy-fallback add (context-menu submenu, add-only rows): kept for builds
  // without the curation sheet. Callers prefer curationToggle.
  function tippyAddToPlaylist(playlist) {
    if (!playlist) return Promise.resolve({ ok: false, reason: "no-playlist" });
    var targetName = norm(playlist.name);
    return openAddSubmenuHidden(true).then(function (res) {
      if (!res || !res.rows) {
        return finishMenuOp(res && res.prevFocus).then(function () {
          return { ok: false, reason: (res && res.reason) || "menu-unavailable" };
        });
      }
      var rows = res.rows;
      var prevFocus = res.prevFocus;
      if (!rows.length) {
        return finishMenuOp(prevFocus).then(function () {
          return { ok: false, reason: "submenu-empty" };
        });
      }
      var hit = null;
      for (var i = 0; i < rows.length; i++) {
        if (norm(rows[i].name) === targetName) {
          hit = rows[i];
          break;
        }
      }
      if (!hit) {
        return finishMenuOp(prevFocus).then(function () {
          return { ok: false, reason: "not-addable" };
        });
      }
        var before = visibleMenus().length;
        var clicked = false;
        try {
          hit.el.click();
          clicked = true;
        } catch (e) {
          clicked = false;
        }
        return waitFor(function () {
          return visibleMenus().length < before ? true : null;
        }, 900, 60).then(function (closed) {
          return finishMenuOp(prevFocus).then(function () {
            if (clicked && closed) {
              sessionMarkAdded(playlistKeyOf(playlist));
              try {
                var c = findPlaylistInCache(playlist);
                if (c) c.containsTrack = true;
              } catch (e) {}
              return getPlaylists({ fresh: false }).then(function (list) {
                return { ok: true, list: list };
              });
            }
            // Folders are excluded from rows, so an unconfirmed click means
            // Spotify didn't consume it — never claim success.
            return { ok: false, reason: clicked ? "unconfirmed" : "click-failed" };
          });
        });
    });
  }

  // Tippy-fallback remove: checked-row toggle or song-menu Remove item.
  // Callers prefer curationToggle.
  function tippyRemoveFromPlaylist(playlist) {
    if (!playlist) return Promise.resolve({ ok: false, reason: "no-playlist" });
    var targetName = norm(playlist.name);
    return openAddSubmenuHidden(true).then(function (res) {
      var prevFocus = res && res.prevFocus;
      function settledOk() {
        sessionUnmark(playlistKeyOf(playlist));
        try {
          var c = findPlaylistInCache(playlist);
          if (c) c.containsTrack = false;
        } catch (e) {}
        return getPlaylists({ fresh: false }).then(function (list) {
          return { ok: true, list: list };
        });
      }
      function tryRemoveItem() {
        var rm = findRemoveMenuItem(document);
        if (!rm) {
          return finishMenuOp(prevFocus).then(function () {
            return { ok: false, reason: "remove-unavailable" };
          });
        }
        var before = visibleMenus().length;
        var clicked = false;
        try {
          rm.click();
          clicked = true;
        } catch (e) {
          clicked = false;
        }
        return waitFor(function () {
          return visibleMenus().length < before ? true : null;
        }, 900, 60).then(function (closed) {
          return finishMenuOp(prevFocus).then(function () {
            if (clicked && closed) return settledOk();
            return { ok: false, reason: "remove-unavailable" };
          });
        });
      }
      if (!res || res.reason) {
        // Submenu never mounted and menus are already closed: nothing to
        // click. Report honestly; the UI keeps the ✓ and says so.
        return Promise.resolve({ ok: false, reason: (res && res.reason) || "remove-unavailable" });
      }
      var rows = res.rows || [];
      for (var i = 0; i < rows.length; i++) {
        if (norm(rows[i].name) === targetName && rows[i].checked === true) {
          var before = visibleMenus().length;
          var clicked = false;
          try {
            rows[i].el.click();
            clicked = true;
          } catch (e) {}
          return waitFor(function () {
            return visibleMenus().length < before ? true : null;
          }, 900, 60).then(function (closed) {
            return finishMenuOp(prevFocus).then(function () {
              if (clicked && closed) return settledOk();
              return { ok: false, reason: "remove-unavailable" };
            });
          });
        }
      }
      // No checked leaf for this playlist: fall back to the Remove item in
      // the (still open) song menu.
      return tryRemoveItem();
    });
  }

  // Public add/remove: curation sheet first (verified toggle), tippy
  // context-menu path as fallback. Liked Songs goes through the async
  // Like toggle (symmetric button when present, else the sheet's own row).
  function addToPlaylist(playlist) {
    if (!playlist) return Promise.resolve({ ok: false, reason: "no-playlist" });
    if (playlist.isLikedSongs || playlist.id === "__liked__") {
      return toggleLikeAsync(true).then(function (res) {
        if (res && res.ok) {
          return getPlaylists({ fresh: false }).then(function (list) {
            return { ok: true, list: list };
          });
        }
        return res;
      });
    }
    return curationToggle(playlist, true).then(function (res) {
      if (res && res.ok) {
        return getPlaylists({ fresh: false }).then(function (list) {
          return { ok: true, list: list };
        });
      }
      if (res && (res.reason === "no-curation-button" || res.reason === "sheet-unavailable")) {
        return tippyAddToPlaylist(playlist);
      }
      return res;
    });
  }

  function removeFromPlaylist(playlist) {
    if (!playlist) return Promise.resolve({ ok: false, reason: "no-playlist" });
    if (playlist.isLikedSongs || playlist.id === "__liked__") {
      return toggleLikeAsync(false).then(function (res) {
        if (res && res.ok) {
          return getPlaylists({ fresh: false }).then(function (list) {
            return { ok: true, list: list };
          });
        }
        return res;
      });
    }
    return curationToggle(playlist, false).then(function (res) {
      if (res && res.ok) {
        return getPlaylists({ fresh: false }).then(function (list) {
          return { ok: true, list: list };
        });
      }
      if (res && (res.reason === "no-curation-button" || res.reason === "sheet-unavailable")) {
        return tippyRemoveFromPlaylist(playlist);
      }
      return res;
    });
  }

  function togglePlaylist(playlist) {
    if (!playlist) return Promise.resolve({ ok: false, reason: "no-playlist" });
    var cached = findPlaylistInCache(playlist);
    var contains = cached ? !!cached.containsTrack : !!playlist.containsTrack;
    if (playlist.isLikedSongs || playlist.id === "__liked__") {
      return toggleLikeAsync(!contains).then(function (res) {
        if (res && res.ok) return { ok: true, pending: !(res && res.noop) };
        return res;
      });
    }
    return (contains ? removeFromPlaylist(playlist) : addToPlaylist(playlist));
  }

  // Diagnostics: run on a live Spotify tab when the sheet disagrees.
  // `SpotMobile.spotify.inspectPlaylists()`
  function inspectPlaylists() {
    var lib = [];
    try {
      lib = readLibraryPlaylists();
    } catch (e) {}
    var menus = [];
    try {
      menus = visibleMenus().map(function (m) {
        var items = [];
        try {
          items = Array.prototype.slice.call(
            m.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]'),
            0,
            12
          ).map(function (it) {
            var ac = null;
            try {
              ac = it.getAttribute("aria-checked");
            } catch (e) {}
            return { text: (it.textContent || "").slice(0, 80), checked: ac };
          });
        } catch (e) {}
        return { items: items };
      });
    } catch (e) {}
    var rows = [];
    try {
      rows = readAddSubmenuRows().map(function (r) {
        return { name: r.name, checked: r.checked };
      });
    } catch (e) {}
    var curationBtn = null;
    try {
      var cb = findCurationButton();
      if (cb) {
        curationBtn = {
          label: cb.getAttribute("aria-label"),
          checked: cb.getAttribute("aria-checked"),
        };
      }
    } catch (e) {}
    var curationRows = [];
    try {
      curationRows = curationLeafRows().map(function (r) {
        return { uri: r.uri, name: r.name, checked: r.containsTrack, artwork: !!r.artwork };
      });
    } catch (e) {}
    return {
      track: getCurrentTrackUri(),
      trackKey: trackKeyNow(),
      curationButton: curationBtn,
      curationOpen: (function () {
        try {
          return !!findCurationList();
        } catch (e) {
          return false;
        }
      })(),
      curationRows: curationRows,
      library: lib.map(function (p) {
        return { id: p.id, name: p.name, artwork: !!p.artwork };
      }),
      menus: menus,
      submenuRows: rows,
      cached: getPlaylistsState(),
      session: playlistSession,
    };
  }

  /* ---------- Lyrics (preview + fullscreen mirror) ----------
   *
   * LIVE-OBSERVED on open.spotify.com (structure + testids from the shipped
   * page — never guessed; obfuscated class names are never used):
   *
   * - Preview: div[data-testid="lyrics-npv-section"] carrying the palette as
   *   custom properties (--lyrics-color-active / -inactive / -passed /
   *   -background), a "Lyrics preview" heading, a snippet of
   *   div[data-testid="lyrics-line"] rows (each row's text lives in its own
   *   inner div; empty rows are instrumental gaps, not missing data), and a
   *   "Show more" button that opens the fullscreen view with ALL lines.
   * - Fullscreen: a page-level overlay holding its own copies of the same
   *   lyrics-line rows. Detected by role + line count (below), never by class.
   *
   * Active-line tracking, in priority order (first hit wins):
   *   1. Explicit markup: aria-current / data-active / aria-selected on a row.
   *   2. Freshness: the most recently mutated row in the watcher batch (when
   *      the active line advances, Spotify touches the old + new rows — the
   *      newest touch is the incoming line).
   *   3. Brightness: a row whose computed color matches --lyrics-color-active.
   *      (Weak on its own: passed lines can share the bright color, so this
   *      only ever confirms, and only when exactly one row is bright.)
   *   4. None (-1): an honest "unknown" beats a wrong highlight.
   *
   * Our fullscreen veils Spotify's (inline visibility, layout kept) and paints
   * opaque above it, so any z-index Spotify uses is irrelevant. Closing ours
   * always closes Spotify's too (its own close button, else synthetic Escape).
   */

  var LYRICS = {
    section: "lyrics-npv-section",
    line: "lyrics-line",
    showMore: [
      "show more",
      "mostrar m\u00e1s",
      "afficher plus",
      "mehr anzeigen",
      "mostra di pi\u00f9",
      "meer weergeven",
    ],
    showLess: [
      "show less",
      "mostrar menos",
      "afficher moins",
      "weniger anzeigen",
      "mostra di meno",
      "minder weergeven",
    ],
    closeLabels: [
      "close",
      "dismiss",
      "back",
      "cerrar",
      "fermer",
      "schlie\u00dfen",
      "chiudi",
      "sluiten",
    ],
  };

  var LYRICS_COLOR_DEFAULTS = {
    active: "rgba(255, 255, 255, 1)",
    inactive: "rgba(255, 255, 255, 0.5)",
    passed: "rgba(255, 255, 255, 0.65)",
    background: "rgba(18, 18, 18, 1)",
  };

  function findLyricsSection() {
    var nodes = [];
    try {
      nodes = Array.prototype.slice.call(
        document.querySelectorAll('[data-testid="' + LYRICS.section + '"]')
      );
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      if (isInOurRoot(nodes[i])) continue;
      if (isHiddenAttr(nodes[i])) continue;
      return nodes[i];
    }
    return null;
  }

  // hidden attribute / display:none only — deliberately NOT visibility (the
  // veil hides Spotify's fullscreen that way while it stays "open").
  function isHiddenAttr(el) {
    try {
      if (!el) return true;
      if (el.hidden) return true;
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (cs && cs.display === "none") return true;
    } catch (e) {}
    return false;
  }

  function readLyricsColors(section) {
    var out = {
      active: LYRICS_COLOR_DEFAULTS.active,
      inactive: LYRICS_COLOR_DEFAULTS.inactive,
      passed: LYRICS_COLOR_DEFAULTS.passed,
      background: LYRICS_COLOR_DEFAULTS.background,
    };
    if (!section) return out;
    try {
      var cs = window.getComputedStyle ? window.getComputedStyle(section) : null;
      if (!cs) return out;
      var names = ["active", "inactive", "passed", "background"];
      for (var i = 0; i < names.length; i++) {
        var v = "";
        try {
          v = cs.getPropertyValue("--lyrics-color-" + names[i]) || "";
        } catch (e) {}
        v = String(v || "").trim();
        if (v) out[names[i]] = v;
      }
    } catch (e) {}
    return out;
  }

  function lyricsLineText(lineEl) {
    if (!lineEl) return "";
    try {
      // Text lives in the row's own inner div; the row itself carries no
      // other prose, so its trimmed text is the lyric ("" = gap).
      return ((lineEl.textContent || "").replace(/\s+/g, " ")).trim();
    } catch (e) {
      return "";
    }
  }

  function lyricsLineIndex(el, lines) {
    for (var i = 0; i < lines.length; i++) {
      if (lines[i] === el) return i;
    }
    return -1;
  }

  function parseRgb(s) {
    var m = String(s || "").match(/rgba?\s*\(\s*([^)]+)\)/i);
    if (!m) return null;
    var parts = m[1].split(",");
    if (parts.length < 3) return null;
    var n = [];
    for (var i = 0; i < 3; i++) {
      var v = parseFloat(parts[i]);
      if (!isFinite(v)) return null;
      n.push(Math.round(v));
    }
    var a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    if (!isFinite(a)) a = 1;
    return { r: n[0], g: n[1], b: n[2], a: a };
  }

  function sameColor(a, b) {
    var pa = parseRgb(a);
    var pb = parseRgb(b);
    if (!pa || !pb) return false;
    return (
      pa.r === pb.r && pa.g === pb.g && pa.b === pb.b && Math.abs(pa.a - pb.a) < 0.05
    );
  }

  // Rows of one scope (preview section or fullscreen root), DOM order.
  // Never touches our own root.
  function readLyricsLines(scope) {
    var out = [];
    if (!scope || !scope.querySelectorAll) return out;
    var nodes = [];
    try {
      nodes = Array.prototype.slice.call(
        scope.querySelectorAll('[data-testid="' + LYRICS.line + '"]')
      );
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      if (isInOurRoot(nodes[i])) continue;
      out.push(nodes[i]);
    }
    return out;
  }

  function lyricsExplicitActive(lineEls) {
    for (var i = 0; i < lineEls.length; i++) {
      var b = lineEls[i];
      try {
        if (b.getAttribute("aria-current") !== null) return i;
        var da = b.getAttribute("data-active");
        if (da !== null && da !== "false") return i;
        if (b.getAttribute("aria-selected") === "true") return i;
      } catch (e) {}
    }
    return -1;
  }

  // Fullscreen root: prefer a dialog holding lyric rows; else the deepest
  // non-body container holding strictly MORE rows than the preview snippet
  // (the fullscreen view carries ALL lines; the preview a handful). Never our
  // root, never the preview section itself.
  function findLyricsFullscreen(previewCount) {
    var dialogs = [];
    try {
      dialogs = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"]'));
    } catch (e) {
      dialogs = [];
    }
    for (var d = 0; d < dialogs.length; d++) {
      if (isInOurRoot(dialogs[d])) continue;
      if (isHiddenAttr(dialogs[d])) continue;
      var rows = [];
      try {
        rows = dialogs[d].querySelectorAll('[data-testid="' + LYRICS.line + '"]');
      } catch (e2) {}
      if (rows && rows.length) return dialogs[d];
    }
    var lines = [];
    try {
      lines = Array.prototype.slice.call(
        document.querySelectorAll('[data-testid="' + LYRICS.line + '"]')
      ).filter(function (el) {
        if (isInOurRoot(el)) return false;
        if (isHiddenAttr(el)) return false;
        try {
          // Rows orphaned inside a hidden container (a closed fullscreen
          // whose rows were never cleared) are not an open view.
          if (el.closest && el.closest("[hidden]")) return false;
          if (el.closest && el.closest('[data-testid="' + LYRICS.section + '"]')) return false;
        } catch (e3) {}
        return true;
      });
    } catch (e4) {
      lines = [];
    }
    if (!lines.length) return null;
    if (previewCount && lines.length <= previewCount) return null;
    // Deepest common container that is not the document body itself.
    var scope = lines[0];
    try {
      while (scope && scope.parentElement) {
        var parent = scope.parentElement;
        if (!parent || parent === document.body || parent === document.documentElement) break;
        var allInside = true;
        for (var i = 1; i < lines.length; i++) {
          if (!parent.contains(lines[i])) {
            allInside = false;
            break;
          }
        }
        if (!allInside) break;
        scope = parent;
      }
    } catch (e5) {}
    if (!scope || scope === document.body || scope === document.documentElement) return null;
    if (isInOurRoot(scope)) return null;
    return scope;
  }

  // The button usually lives inside the section footer, but on some builds it
  // renders as a sibling (panel footer outside the section node), so the
  // search covers the section subtree first, then the section's parent
  // subtree. Hidden/disabled controls are never returned: clicking one is a
  // guaranteed no-op that would only burn a 3s open timeout.
  function findLyricsShowMore(section) {
    var scopes = [];
    if (section) scopes.push(section);
    try {
      if (section && section.parentElement) scopes.push(section.parentElement);
    } catch (e0) {}
    for (var s = 0; s < scopes.length; s++) {
      var scope = scopes[s];
      if (!scope || !scope.querySelectorAll) continue;
      var btns = [];
      try {
        btns = Array.prototype.slice.call(scope.querySelectorAll("button"));
      } catch (e) {
        btns = [];
      }
      for (var i = 0; i < btns.length; i++) {
        if (isInOurRoot(btns[i])) continue;
        var t = "";
        var lab = "";
        var dis = false;
        try {
          t = norm(btns[i].textContent).slice(0, 40);
          lab = norm(btns[i].getAttribute("label") || "");
          dis = btns[i].disabled || btns[i].getAttribute("aria-disabled") === "true";
        } catch (e2) {}
        if (dis) continue;
        var match = false;
        for (var m = 0; m < LYRICS.showMore.length; m++) {
          if (t.indexOf(LYRICS.showMore[m]) !== -1 || (lab && lab.indexOf(LYRICS.showMore[m]) !== -1)) {
            match = true;
            break;
          }
        }
        if (!match) continue;
        try {
          if (isHiddenAttr(btns[i]) || !isVisible(btns[i])) continue;
        } catch (e3) {}
        return btns[i];
      }
    }
    return null;
  }

  function findLyricsClose(scope) {
    if (!scope || !scope.querySelectorAll) return null;
    var btns = [];
    try {
      btns = Array.prototype.slice.call(scope.querySelectorAll("button"));
    } catch (e) {
      btns = [];
    }
    for (var i = 0; i < btns.length; i++) {
      if (isInOurRoot(btns[i])) continue;
      var label = "";
      var tid = "";
      try {
        label = norm(btns[i].getAttribute("aria-label") || "");
        tid = norm(btns[i].getAttribute("data-testid") || "");
      } catch (e2) {}
      if (tid.indexOf("close") !== -1) return btns[i];
      for (var c = 0; c < LYRICS.closeLabels.length; c++) {
        if (label && label.indexOf(LYRICS.closeLabels[c]) !== -1) return btns[i];
      }
    }
    return null;
  }

  function isLyricsFullscreenOpen() {
    try {
      var section = findLyricsSection();
      var previewCount = 0;
      try {
        previewCount = readLyricsLines(section).length;
      } catch (e) {}
      return !!findLyricsFullscreen(previewCount);
    } catch (e2) {
      return false;
    }
  }

  var lyricsVeilTarget = null;

  // Visible-only Show less (the collapse half of an inline expansion).
  // Same scoping as Show more; hidden controls are never returned.
  function findLyricsShowLess(section) {
    var scopes = [];
    if (section) scopes.push(section);
    try {
      if (section && section.parentElement) scopes.push(section.parentElement);
    } catch (e0) {}
    for (var s = 0; s < scopes.length; s++) {
      var scope = scopes[s];
      if (!scope || !scope.querySelectorAll) continue;
      var btns = [];
      try {
        btns = Array.prototype.slice.call(scope.querySelectorAll("button"));
      } catch (e) {
        btns = [];
      }
      for (var i = 0; i < btns.length; i++) {
        if (isInOurRoot(btns[i])) continue;
        var t = "";
        try {
          t = norm(btns[i].textContent).slice(0, 40);
        } catch (e2) {}
        var match = false;
        for (var m = 0; m < LYRICS.showLess.length; m++) {
          if (t.indexOf(LYRICS.showLess[m]) !== -1) {
            match = true;
            break;
          }
        }
        if (!match) continue;
        try {
          if (isHiddenAttr(btns[i]) || !isVisible(btns[i])) continue;
        } catch (e3) {}
        return btns[i];
      }
    }
    return null;
  }

  // Best-effort collapse of an inline expansion back to the snippet.
  // Currently UNUSED by any flow (kept for diagnostics/manual use): flips
  // only flow while Spotify's live view exists, so auto-collapsing on close
  // would silence the very feed our UI mirrors. Do not rewire it into close
  // paths without re-reading that tradeoff.
  function collapseLyricsInline() {
    var section = null;
    try {
      section = findLyricsSection();
    } catch (e) {
      section = null;
    }
    var less = null;
    try {
      less = findLyricsShowLess(section);
    } catch (e2) {
      less = null;
    }
    if (!less) return Promise.resolve(false);
    var preCount = 0;
    try {
      preCount = readLyricsLines(section).length;
    } catch (e3) {}
    userClick(less);
    return waitFor(function () {
      try {
        var s2 = findLyricsSection();
        if (!s2) return true; // whole section went away: collapsed enough
        if (findLyricsShowMore(s2)) return true;
        return readLyricsLines(s2).length < preCount ? true : null;
      } catch (e4) {
        return null;
      }
    }, 2000, 80).then(function (collapsed) {
      return !!collapsed;
    });
  }

  function lyricsVeilOn() {
    try {
      var section = findLyricsSection();
      var previewCount = 0;
      try {
        previewCount = readLyricsLines(section).length;
      } catch (e) {}
      var root = findLyricsFullscreen(previewCount);
      if (root && root.style) {
        lyricsVeilTarget = root;
        root.style.setProperty("visibility", "hidden", "important");
      }
    } catch (e2) {}
  }

  function lyricsVeilOff() {
    try {
      if (lyricsVeilTarget && lyricsVeilTarget.style) {
        lyricsVeilTarget.style.removeProperty("visibility");
      }
    } catch (e) {}
    lyricsVeilTarget = null;
  }

  // Lyrics warmup: if the song is PLAYING but the collapsed snippet never
  // resolves an active line (engine not primed — flips only start flowing
  // after Spotify's view opens once), open + close it once per track to
  // prime it, then leave it open: closing again would silence the feed just
  // started. A resolved-but-frozen
  // line gets a longer leash (long verses sit still legitimately); an
  // unresolvable one warms sooner. Skipped while paused (nothing advances
  // anyway), while any sheet read is in flight, while a fullscreen is
  // already open, and once warmed. Runs from the existing fallback tick.
  // Forced freshness pass, called on player track changes (see ui.js render
  // hook). Lyrics mutations alone cannot announce a new song: if Spotify
  // does not touch its lyrics DOM on the switch, no watcher batch ever fires
  // and both views would strand the old song forever. This re-baselines the
  // warm window for the new key, forces one sync re-read (catching remounts
  // the observer may have missed), and lets the normal warmup path prime a
  // cold section from there. Cheap and idempotent.
  function refreshLyrics() {
    var key = "";
    try {
      key = trackKeyNow();
    } catch (e) {
      key = "";
    }
    if (!key || key === " | ") return;
    if (lyricsWarm.key !== key) {
      lyricsWarm = { key: key, since: Date.now(), seenAt: Date.now(), active: null };
    }
    try {
      deliverLyrics();
    } catch (e2) {}
    try {
      lyricsWarmCheck();
    } catch (e3) {}
    // Live-observed (Oct 2026): after Next, Spotify tears the lyrics section
    // down for ~3s before mounting the new song's rows. A single sync
    // re-read during that window delivers unavailable, and if the rebuild
    // batch is ever missed the mirror strands the old song until the next
    // context change. Re-read twice more on a short fuse, guarded by key so
    // a further skip never paints stale rows. deliverLyrics is sig-deduped,
    // so quiet re-reads notify nobody.
    try {
      if (refreshLyricsTimers.length) {
        for (var rt = 0; rt < refreshLyricsTimers.length; rt++) {
          window.clearTimeout(refreshLyricsTimers[rt]);
        }
      }
      refreshLyricsTimers = [1500, 4000].map(function (ms) {
        return window.setTimeout(function () {
          try {
            var kNow = trackKeyNow();
            if (kNow !== key) return;
            deliverLyrics();
            lyricsWarmCheck();
          } catch (eRT) {}
        }, ms);
      });
    } catch (e4) {}
  }

  function lyricsWarmCheck() {
    try {
      if (typeof document.hidden === "boolean" && document.hidden) return;
      if (isLyricsFullscreenOpen()) return;
      if (deviceBusy || playlistBusy) return;
      var playing = false;
      try {
        playing = isPlaying();
      } catch (e0) {}
      if (!playing) return;
      var section = null;
      try {
        section = findLyricsSection();
      } catch (e1) {}
      if (!section) return;
      var more = null;
      try {
        more = findLyricsShowMore(section);
      } catch (e2) {}
      if (!more) return; // already expanded (or none): nothing to prime
      var key = "";
      try {
        key = trackKeyNow();
      } catch (e3) {}
      if (!key || key === " | ") return;
      var now = Date.now();
      if (lyricsWarm.key !== key) {
        // No baseline yet (frozen from the first second — no deliveries to
        // seed from). Start the window now rather than deadlocking.
        lyricsWarm = { key: key, since: now, seenAt: now, active: null };
      }
      if (lyricsWarmedKeys.indexOf(key) !== -1) return;
      var cur = null;
      try {
        cur = getLyricsState();
      } catch (eC) {
        return;
      }
      if (!cur || !cur.available) return;
      var curActive = cur.active;
      var needsWarm = false;
      if (curActive === -1) {
        // Nothing ever resolved: warm past a grace period (intros are -1
        // legitimately for a few seconds).
        needsWarm = now - lyricsWarm.since > 10000;
      } else {
        // Resolved but never moves: only after a long quiet stretch, so a
        // long verse doesn't trigger it.
        needsWarm = now - lyricsWarm.seenAt > 20000;
      }
      if (!needsWarm) return;
      lyricsWarmedKeys.push(key);
      if (lyricsWarmedKeys.length > 30) lyricsWarmedKeys.shift();
      lyricsLogEvent("warm-start", key);
      openLyricsFullscreen().then(function (res) {
        lyricsLogEvent("warm-opened", res && res.ok ? "ok-left-open" : (res && res.reason) || "fail");
        lyricsLogEvent("warm-done", key);
      }).catch(function () {});
    } catch (e4) {}
  }

  function openLyricsFullscreen() {
    var section = null;
    try {
      section = findLyricsSection();
    } catch (e) {
      section = null;
    }
    if (!section) {
      // NPV panel closed: open it the Spotify way, then look again.
      try {
        if (findSideButton("lyrics")) userClick(findSideButton("lyrics"));
      } catch (e2) {}
      return waitFor(function () {
        try {
          return findLyricsSection() ? true : null;
        } catch (e3) {
          return null;
        }
      }, 2500, 80).then(function (found) {
        if (!found) {
          lyricsLogEvent("open-fail", "lyrics-unavailable");
          return { ok: false, reason: "lyrics-unavailable" };
        }
        return openLyricsFullscreen();
      });
    }
    if (isLyricsFullscreenOpen()) {
      lyricsVeilOn();
      lyricsLogEvent("open-ok", "already-open");
      return Promise.resolve({ ok: true, opened: false });
    }
    var more = null;
    try {
      more = findLyricsShowMore(section);
    } catch (e4) {
      more = null;
    }
    if (!more) {
      // No trigger — but the snippet itself may already hold the full list:
      // a previous open can leave it expanded (all lines, Show more gone),
      // and short lyrics never grow one at all. Nothing to drive then.
      var preCount = 0;
      try {
        preCount = readLyricsLines(section).length;
      } catch (e6) {}
      if (preCount > 0) {
        lyricsLogEvent("open-ok", "section-expanded");
        return Promise.resolve({ ok: true, opened: false });
      }
      lyricsLogEvent("open-fail", "lyrics-unavailable");
      return Promise.resolve({ ok: false, reason: "lyrics-unavailable" });
    }
    var preClickCount = 0;
    try {
      preClickCount = readLyricsLines(section).length;
    } catch (e7) {}
    userClick(more);
    // Either an overlay appears (dialog path) or the snippet grows in place
    // (inline path) — whichever lands first wins, so inline opens resolve in
    // ~one poll instead of eating the whole overlay timeout. Inline counts
    // only once the trigger itself is gone (a bare row-count wobble from lazy
    // loading must not pass as an expansion).
    var grew = false;
    return waitFor(function () {
      try {
        if (isLyricsFullscreenOpen()) return "overlay";
      } catch (e5) {}
      try {
        var sNow = findLyricsSection();
        if (sNow && readLyricsLines(sNow).length > preClickCount && !findLyricsShowMore(sNow)) {
          grew = true;
          return "inline";
        }
      } catch (e9) {}
      return null;
    }, 3000, 80).then(function (how) {
      if (how === "overlay") {
        lyricsVeilOn();
        lyricsLogEvent("open-ok", "opened:true");
        return { ok: true, opened: true };
      }
      if (how === "inline" || grew) {
        // The click expanded the section in place: the grown snippet IS the
        // full source by another route. It stays expanded — flips only flow
        // while Spotify's live view exists (proven by device trace), so
        // collapsing here would silence the feed our UI mirrors.
        lyricsLogEvent("open-ok", "section-expanded-inline");
        return { ok: true, opened: false };
      }
      lyricsLogEvent("open-fail", "lyrics-fullscreen-unavailable");
      return { ok: false, reason: "lyrics-fullscreen-unavailable" };
    });
  }

  function closeLyricsFullscreen() {
    // No overlay open: nothing to close. An inline expansion is deliberately
    // LEFT in place — flips only flow while Spotify's live view exists, so
    // collapsing it would silence the feed (and the minified preview with
    // it). See collapseLyricsInline before rewiring this.
    if (!isLyricsFullscreenOpen()) {
      lyricsVeilOff();
      return Promise.resolve({ ok: true, noop: true });
    }
    var closer = null;
    try {
      var section = findLyricsSection();
      var previewCount = 0;
      try {
        previewCount = readLyricsLines(section).length;
      } catch (e) {}
      closer = findLyricsClose(findLyricsFullscreen(previewCount));
    } catch (e2) {
      closer = null;
    }
    if (closer) userClick(closer);
    else {
      // No identifiable close control: synthetic Escape. Marked so our own
      // sheets (document-level Escape-to-close) never treat it as the user.
      try {
        var ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
        ev.__spmSynthetic = true;
        document.dispatchEvent(ev);
      } catch (e3) {}
    }
    return waitFor(function () {
      try {
        return isLyricsFullscreenOpen() ? null : true;
      } catch (e4) {
        return null;
      }
    }, 2000, 80).then(function (closed) {
      lyricsVeilOff();
      if (closed) {
        lyricsLogEvent("close-ok", closer ? "button" : "escape");
        return { ok: true };
      }
      lyricsLogEvent("close-fail", "lyrics-close-unconfirmed");
      return { ok: false, reason: "lyrics-close-unconfirmed" };
    });
  }

  // Freshness hint: the most recently mutated lyric row (the watcher records
  // it per batch). When the active line advances, Spotify touches the old +
  // new rows — the newest touch is the incoming line. Only ever a fallback
  // behind explicit markup, and only inside the lines it was taken from.
  var lyricsHint = { el: null, at: 0 };

  // Freshness per lyrics scope: last mutation timestamp for section vs
  // overlay rows. When both copies are alive but disagree (stale snippet vs
  // live overlay after a track change, or vice versa), the most recently
  // touched one wins for BOTH views — mini and fullscreen can then never
  // show different songs. Updated for every line-touching mutation, not just
  // delivered flips.
  var lyricsFresh = { section: 0, overlay: 0 };

  function lyricsScopeOf(el) {
    try {
      if (el && el.closest && el.closest('[data-testid="' + LYRICS.section + '"]')) {
        return "section";
      }
    } catch (e) {}
    return "overlay";
  }

  function linesAgree(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if ((a[i] && a[i].text) !== (b[i] && b[i].text)) return false;
    }
    return true;
  }

  function readLyricsScope(scope, colors) {
    var els = readLyricsLines(scope);
    var lines = [];
    for (var i = 0; i < els.length; i++) {
      lines.push({ text: lyricsLineText(els[i]), active: false });
    }
    var active = lyricsExplicitActive(els);
    if (active === -1 && lyricsHint.el) {
      try {
        if (document.contains(lyricsHint.el)) {
          var hi = lyricsLineIndex(lyricsHint.el, els);
          if (hi !== -1) active = hi;
        }
      } catch (e) {}
    }
    if (active === -1 && colors) {
      // Brightness confirmation only: exactly one bright row may claim it.
      // Live-observed (open.spotify.com, Oct 2026): the active line advances
      // by NODE REPLACEMENT (old rows removed, new rows mounted with the new
      // roles), never by an aria/class mutation on the existing rows — so the
      // freshness hint below is often stale and brightness is the real signal.
      // Passed rows are DIMMED (opacity ~0.5) while active/upcoming are opaque
      // (~1.0), and passed rows can share the bright color itself — so when
      // several rows are bright, only a uniquely-bright OPAQUE row may claim
      // it. Opacity comes from computed style (never class names).
      var bright = -1;
      var brightCount = 0;
      var opaqueBright = -1;
      var opaqueBrightCount = 0;
      for (var b = 0; b < els.length; b++) {
        var col = "";
        var op = 1;
        try {
          if (window.getComputedStyle) {
            var csb = window.getComputedStyle(els[b]);
            col = csb.color || "";
            var opRaw = csb.opacity;
            if (opRaw !== "" && opRaw !== null && opRaw !== undefined) {
              var opNum = parseFloat(opRaw);
              if (isFinite(opNum)) op = opNum;
            }
          }
        } catch (e2) {}
        if (col && sameColor(col, colors.active)) {
          bright = b;
          brightCount++;
          if (op > 0.75) {
            opaqueBright = b;
            opaqueBrightCount++;
          }
        }
      }
      if (brightCount === 1) active = bright;
      else if (opaqueBrightCount === 1) active = opaqueBright;
    }
    if (active !== -1 && lines[active]) lines[active].active = true;
    return { els: els, lines: lines, active: active };
  }

  function getLyricsState() {
    var none = {
      available: false,
      trackKey: "",
      preview: [],
      full: [],
      active: -1,
      colors: Object.assign({}, LYRICS_COLOR_DEFAULTS),
      fullscreenOpen: false,
      hasMore: false,
    };
    var keyNow = "";
    try {
      keyNow = trackKeyNow();
    } catch (e) {}
    var section = null;
    try {
      section = findLyricsSection();
    } catch (e2) {
      section = null;
    }
    var previewCount = 0;
    var colors = Object.assign({}, LYRICS_COLOR_DEFAULTS);
    var preview = { els: [], lines: [], active: -1 };
    if (section) {
      colors = readLyricsColors(section);
      preview = readLyricsScope(section, colors);
      previewCount = preview.els.length;
    }
    var fsRoot = null;
    try {
      fsRoot = findLyricsFullscreen(previewCount);
    } catch (e3) {
      fsRoot = null;
    }
    // Spotify may tear down (or hide) the preview section once its own
    // fullscreen opens — the fullscreen copy is then the ONLY source. A
    // missing section with an open fullscreen is still fully available.
    if (!section && !fsRoot) {
      none.trackKey = keyNow;
      return none;
    }
    var full = { els: [], lines: [], active: -1 };
    if (fsRoot) {
      try {
        full = readLyricsScope(fsRoot, colors);
      } catch (e4) {}
    }
    var hasMore = false;
    try {
      hasMore = !!findLyricsShowMore(section);
    } catch (e5) {}
    // Single source of truth: when both copies are alive they can still
    // disagree (stale snippet vs live overlay after a track change, or vice
    // versa) — and serving one view from each is exactly how the mini freezes
    // while fullscreen tracks. The most recently mutated copy wins for BOTH
    // views. Ties (and the all-agree common case) keep today's behavior:
    // overlay when open, else the section.
    var sectionOk = preview.lines.length > 0;
    var overlayOk = !!(fsRoot && full.lines.length > 0);
    var useOverlay = false;
    if (overlayOk && sectionOk) {
      useOverlay = linesAgree(preview.lines, full.lines)
        ? true
        : lyricsFresh.overlay >= lyricsFresh.section;
    } else {
      useOverlay = overlayOk;
    }
    var chosen = useOverlay ? full : preview;
    return {
      available: true,
      trackKey: keyNow,
      preview: chosen.lines,
      full: useOverlay ? chosen.lines : [],
      active: chosen.active,
      colors: colors,
      fullscreenOpen: !!fsRoot,
      hasMore: hasMore,
      scope: useOverlay ? "overlay" : (section ? "section" : "none"),
    };
  }

  var lyricsSubs = [];
  var lyricsObserver = null;
  var lyricsObserverStarted = false;
  var lastLyricsSig = "";

  // Flight recorder: last 40 lyrics transitions (deliveries + open/close
  // outcomes). When the fullscreen blanks on-device, a paste of
  // inspectLyrics() right after shows the exact sequence instead of a guess.
  var lyricsLog = [];
  function lyricsLogEvent(ev, info) {
    try {
      lyricsLog.push({ t: Date.now(), ev: ev, info: info || "" });
      if (lyricsLog.length > 40) lyricsLog.splice(0, lyricsLog.length - 40);
      // Opt-in live trace: localStorage.spm-debug-lyrics === "1" (same
      // storage both worlds see, so it toggles from any console without a
      // reload). Off by default: zero cost, zero console spam.
      var dbg = false;
      try {
        dbg = window.localStorage && window.localStorage.getItem("spm-debug-lyrics") === "1";
      } catch (eDbg) {}
      if (dbg) {
        try {
          console.info("[spm][lyrics]", ev, info || "");
        } catch (eLog) {}
      }
    } catch (e) {}
  }

  // Warmup bookkeeping: per-track first-seen, last-delivery, and last
  // resolved active line. A frozen active that merely re-resolves is NOT
  // liveness — only transitions and fresh deliveries count.
  var lyricsWarm = { key: "", since: 0, seenAt: 0, active: null };
  var lyricsWarmedKeys = [];
  // Pending delayed re-reads scheduled by refreshLyrics (cleared on reschedule).
  var refreshLyricsTimers = [];

  function lyricsSig(st) {
    var n = 0;
    var lens = 0;
    var list = (st.full && st.full.length ? st.full : st.preview) || [];
    for (var i = 0; i < list.length; i++) {
      n++;
      lens += (list[i].text || "").length;
    }
    return (st.trackKey || "") + "|" + (st.fullscreenOpen ? "F" : "P") + "|" +
      st.active + "|" + n + "|" + lens;
  }

  function deliverLyrics() {
    var st = null;
    try {
      st = getLyricsState();
    } catch (e) {
      return;
    }
    var sig = lyricsSig(st);
    if (sig === lastLyricsSig) return;
    lastLyricsSig = sig;
    lyricsLogEvent("deliver", sig);
    // Liveness accounting for the warmup below: new track resets the
    // window; every delivery refreshes it; only a resolved active line is
    // remembered (a frozen one re-resolving proves nothing).
    try {
      var wk = st.trackKey || "";
      var nowW = Date.now();
      if (lyricsWarm.key !== wk) {
        lyricsWarm = { key: wk, since: nowW, seenAt: nowW, active: null };
      } else {
        lyricsWarm.seenAt = nowW;
      }
      if (st.active >= 0) lyricsWarm.active = st.active;
    } catch (eW) {}
    for (var i = 0; i < lyricsSubs.length; i++) {
      try {
        lyricsSubs[i](st);
      } catch (e2) {
        reportSubscriberError(e2);
      }
    }
  }

  function lyricsBatch(mutations) {
    // Cheap pre-filter FIRST: this observer sees every class/childList change
    // on the page, and a full lyrics read per storm would repeat the exact
    // overhead pattern the snapshot observer was just fixed for. Bail unless
    // a mutation plausibly touches lyric rows.
    // Live-observed (Oct 2026): active advances arrive as NODE REPLACEMENTS
    // (container target, new row nodes in addedNodes), and around a track
    // change the page is busy — so the scan covers the WHOLE batch (batches
    // are small; the old 50-cap could bury the lyrics mutations behind player
    // churn and strand the old song).
    var plausible = false;
    var scan = mutations.length;
    for (var s = 0; s < scan; s++) {
      var sm = mutations[s];
      var st = sm.target;
      if (st) {
        try {
          if (st.getAttribute && st.getAttribute("data-testid") === LYRICS.line) {
            plausible = true;
            break;
          }
          if (st.getAttribute && st.getAttribute("data-testid") === LYRICS.section) {
            plausible = true;
            break;
          }
          if (st.closest && st.closest('[data-testid="' + LYRICS.line + '"],[data-testid="' + LYRICS.section + '"]')) {
            plausible = true;
            break;
          }
        } catch (e0) {}
      }
      // Row (re)mounts target the container — the rows arrive as added (or
      // leave as removed) nodes instead. Wrappers mount whole (the added node
      // is the snippet container, not a row), so also peek one level down.
      if (sm.type === "childList") {
        var lists = [sm.addedNodes, sm.removedNodes];
        for (var l = 0; l < 2 && !plausible; l++) {
          var nl = lists[l];
          if (!nl) continue;
          for (var n = 0; n < Math.min(nl.length, 5); n++) {
            var nd = nl[n];
            try {
              if (!nd || !nd.getAttribute) continue;
              if (nd.getAttribute("data-testid") === LYRICS.line) {
                plausible = true;
                break;
              }
              if (nd.querySelector && nd.querySelector(
                '[data-testid="' + LYRICS.line + '"],[data-testid="' + LYRICS.section + '"]'
              )) {
                plausible = true;
                break;
              }
            } catch (e1) {}
          }
        }
        if (plausible) break;
      }
    }
    if (!plausible) return;
    var touched = null;
    var addedLines = [];
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type !== "attributes" && m.type !== "childList") continue;
      var t = m.target;
      if (!t) continue;
      // Line flip (class/aria swap on a row) or snippet (re)mount. Scope is
      // stamped per touch (not just the newest) so the scope choice below
      // sees every live copy, even ones the hint itself doesn't name.
      var line = null;
      try {
        if (t.getAttribute && t.getAttribute("data-testid") === LYRICS.line) line = t;
        else if (t.closest) line = t.closest('[data-testid="' + LYRICS.line + '"]');
      } catch (e2) {}
      if (line && !isInOurRoot(line)) {
        touched = line; // newest touch in the batch wins the hint
        try {
          lyricsFresh[lyricsScopeOf(line)] = Date.now();
        } catch (eS) {}
        continue;
      }
      // Mounts whose rows arrive as added nodes (target is the container).
      if (m.type === "childList" && m.addedNodes) {
        try {
          for (var a = 0; a < Math.min(m.addedNodes.length, 5); a++) {
            var an = m.addedNodes[a];
            if (!an || !an.getAttribute) continue;
            var isLine = an.getAttribute("data-testid") === LYRICS.line;
            var hasLines = !isLine && an.querySelector &&
              an.querySelector('[data-testid="' + LYRICS.line + '"]');
            if (!(isLine || hasLines) || isInOurRoot(an)) continue;
            // The node itself may sit inside the section (snippet mounts) or
            // outside it (overlay mounts) — classify by position, not guess.
            var mountScope = "overlay";
            try {
              if (an.closest && an.closest('[data-testid="' + LYRICS.section + '"]')) {
                mountScope = "section";
              }
            } catch (eS2) {}
            try {
              lyricsFresh[mountScope] = Date.now();
            } catch (eS3) {}
            // Remember directly-added rows for the hint below (bounded:
            // remounts can add dozens; the bright check after the loop caps
            // its own reads too).
            if (isLine && addedLines.length < 10) addedLines.push(an);
            break;
          }
        } catch (e5) {}
      }
    }
    // Replacement-driven advance with no in-place touch (live pattern):
    // resolve the hint from the newly-mounted rows themselves. Exactly one
    // newly-mounted bright row identifies the incoming active line; zero
    // (intro) or several (bulk remount resolving ambiguously) leave the hint
    // alone and brightness at read time decides.
    var addedBright = [];
    if (!touched && addedLines.length) {
      var hintColors = null;
      try {
        hintColors = readLyricsColors(findLyricsSection());
      } catch (eHC) {
        hintColors = null;
      }
      if (hintColors) {
        for (var hb = 0; hb < addedLines.length && addedBright.length < 2; hb++) {
          try {
            var hcol = window.getComputedStyle ? window.getComputedStyle(addedLines[hb]).color : "";
            if (hcol && sameColor(hcol, hintColors.active)) addedBright.push(addedLines[hb]);
          } catch (eHB) {}
        }
      }
    }
    if (touched) {
      lyricsHint = { el: touched, at: Date.now() };
    } else if (addedBright.length === 1) {
      // Replacement-driven advance (live pattern: container target, new rows
      // in addedNodes): the single newly-mounted bright row is the incoming
      // active line. Seeding the hint from it keeps tracking alive even when
      // brightness at read time is ever ambiguous.
      lyricsHint = { el: addedBright[0], at: Date.now() };
    }
    // Re-assert the veil: React may replace the veiled node mid-session.
    try {
      if (lyricsVeilTarget) {
        if (!document.contains(lyricsVeilTarget)) {
          lyricsVeilTarget = null;
          lyricsVeilOn();
        } else if (lyricsVeilTarget.style.getPropertyValue("visibility") !== "hidden") {
          lyricsVeilTarget.style.setProperty("visibility", "hidden", "important");
        }
      }
    } catch (e4) {}
    deliverLyrics();
  }

  function startLyricsObserver() {
    if (lyricsObserverStarted) return;
    lyricsObserverStarted = true;
    try {
      lyricsObserver = new MutationObserver(lyricsBatch);
      lyricsObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "aria-current", "aria-selected", "data-active", "style"],
        childList: true,
        subtree: true,
      });
    } catch (e) {
      lyricsObserver = null;
    }
  }

  function watchLyrics(cb) {
    if (typeof cb !== "function") return function () {};
    startLyricsObserver();
    lyricsSubs.push(cb);
    return function () {
      for (var i = lyricsSubs.length - 1; i >= 0; i--) {
        if (lyricsSubs[i] === cb) lyricsSubs.splice(i, 1);
      }
    };
  }

  // Console diagnostic for the live tab: which anchors exist, what the active
  // signal looks like, and which source our UI would use. Paste
  // `SpotMobile.spotify.inspectLyrics()` on open.spotify.com and send the output.
  function inspectLyrics() {
    var section = null;
    try {
      section = findLyricsSection();
    } catch (e) {}
    var colors = readLyricsColors(section);
    var previewEls = readLyricsLines(section);
    var fsRoot = null;
    try {
      fsRoot = findLyricsFullscreen(previewEls.length);
    } catch (e2) {}
    var fullEls = fsRoot ? readLyricsLines(fsRoot) : [];
    function describe(els) {
      return els.slice(0, 12).map(function (b) {
        var attrs = {};
        try {
          attrs["aria-current"] = b.getAttribute("aria-current");
          attrs["data-active"] = b.getAttribute("data-active");
          attrs["aria-selected"] = b.getAttribute("aria-selected");
          attrs.class = String(b.getAttribute("class") || "").slice(0, 80);
          attrs.color = window.getComputedStyle ? window.getComputedStyle(b).color : "";
        } catch (e3) {}
        return { text: lyricsLineText(b).slice(0, 60), attrs: attrs };
      });
    }
    var more = null;
    try {
      var mb = findLyricsShowMore(section);
      if (mb) {
        more = {
          text: (mb.textContent || "").trim().slice(0, 40),
          label: mb.getAttribute("label"),
          encore: mb.getAttribute("data-encore-id"),
        };
      }
    } catch (e4) {}
    // Every button in + around the section: identifies the real trigger when
    // the matcher above comes back empty (wrong scope, hidden, reworded).
    var nearbyButtons = [];
    try {
      var bscope = section && section.parentElement ? section.parentElement : section;
      if (bscope && bscope.querySelectorAll) {
        var allb = Array.prototype.slice.call(bscope.querySelectorAll("button"), 0, 20);
        for (var bi = 0; bi < allb.length; bi++) {
          if (isInOurRoot(allb[bi])) continue;
          var bvis = "";
          try {
            bvis = "hiddenAttr=" + !!allb[bi].hidden + " display=" +
              (window.getComputedStyle ? window.getComputedStyle(allb[bi]).display : "?");
          } catch (e6) {}
          nearbyButtons.push({
            text: ((allb[bi].textContent || "").replace(/\s+/g, " ").trim()).slice(0, 40),
            label: allb[bi].getAttribute("label"),
            encore: allb[bi].getAttribute("data-encore-id"),
            aria: allb[bi].getAttribute("aria-label"),
            vis: bvis,
          });
        }
      }
    } catch (e7) {}
    var closer = null;
    try {
      var cb = fsRoot ? findLyricsClose(fsRoot) : null;
      if (cb) {
        closer = {
          label: cb.getAttribute("aria-label"),
          testid: cb.getAttribute("data-testid"),
          text: (cb.textContent || "").trim().slice(0, 40),
        };
      }
    } catch (e5) {}
    return {
      trackKey: (function () { try { return trackKeyNow(); } catch (e) { return ""; } })(),
      build: BUILD,
      section: !!section,
      colors: colors,
      explicitActive: lyricsExplicitActive(previewEls),
      hintActive: (function () {
        try {
          if (lyricsHint.el && document.contains(lyricsHint.el)) {
            return lyricsLineIndex(lyricsHint.el, previewEls);
          }
        } catch (e) {}
        return -1;
      })(),
      previewRows: previewEls.length,
      preview: describe(previewEls),
      fullscreen: !!fsRoot,
      fullscreenRows: fullEls.length,
      fullscreenSample: describe(fullEls),
      showMore: more,
      nearbyButtons: nearbyButtons,
      closer: closer,
      scopeFreshMsAgo: (function () {
        try {
          var now = Date.now();
          return {
            section: lyricsFresh.section ? now - lyricsFresh.section : -1,
            overlay: lyricsFresh.overlay ? now - lyricsFresh.overlay : -1,
          };
        } catch (e) {
          return {};
        }
      })(),
      log: lyricsLog.slice(),
      uiLog: (function () {
        try {
          var arr = window.SpotMobile && window.SpotMobile.lyricsUiLog;
          return arr ? arr.slice(-30) : [];
        } catch (e) {
          return [];
        }
      })(),
      state: getLyricsState(),
    };
  }

  /* ---------- Change notification ---------- */

  function snapshotKey(s) {
    return [s.track, s.artist, s.artwork, s.context, s.isPlaying, s.shuffle, s.repeat, s.liked, s.duration, s.playerReady].join("|");
  }

  function emit(manual) {
    var snap;
    try {
      snap = getSnapshot();
    } catch (e) {
      return;
    }
    var key = snapshotKey(snap);
    // Time/volume change every second — notify on a 1s cadence too so the
    // progress bar stays fresh even without DOM mutations.
    if (key !== lastSnapshotKey || manual === true) {
      lastSnapshotKey = key;
      subscribers.forEach(function (cb) {
        try {
          cb(snap);
        } catch (e) {
          reportSubscriberError(e);
        }
      });
    } else {
      subscribers.forEach(function (cb) {
        try {
          cb(snap, true);
        } catch (e) {
          reportSubscriberError(e);
        }
      });
    }
  }

  // A throwing subscriber is isolated so it cannot break the others, but it
  // must NOT vanish silently: a UI fault inside render() otherwise looks
  // exactly like "the button does nothing", which is how the sheet's dead
  // close button and a bad helper name both hid for so long. Deduped, because
  // a persistent fault would otherwise log on every single snapshot.
  var reportedSubscriberErrors = {};
  function reportSubscriberError(e) {
    try {
      var msg = (e && (e.message || e.name)) || String(e);
      var where = (e && e.stack ? String(e.stack).split("\n")[1] || "" : "").trim();
      var sig = msg + "|" + where;
      if (reportedSubscriberErrors[sig]) return;
      reportedSubscriberErrors[sig] = true;
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[SpotMobile] snapshot subscriber threw: " + msg + where);
      }
    } catch (x) {}
  }

  var emitDebounced = (function () {
    var t = null;
    return function () {
      if (t) return;
      t = setTimeout(function () {
        t = null;
        emit(false);
      }, 150);
    };
  })();

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    try {
      observer = new MutationObserver(function (mutations) {
        // Scoped relevance: snapshots only read the player bar, the Now
        // Playing panel, and (for artwork) media — so mutations anywhere else
        // (sidebar renders, feed updates, lazy images across the page, and our
        // own #spm-root churn like the 1Hz progress ARIA writes) must not each
        // trigger a full getSnapshot. Previously ANY childList/aria change
        // anywhere did, i.e. effectively continuous full snapshots while
        // browsing. Track changes always mutate the player subtree itself
        // (track link text, artwork src, toggle labels), so nothing real is
        // missed; login/logout (player appearing/vanishing) is caught by the
        // containment check below.
        var relevant = false;
        var playerScope = null;
        var npvScope = null;
        var scopesResolved = false;
        function scopes() {
          if (!scopesResolved) {
            scopesResolved = true;
            try {
              playerScope = findPlayer();
            } catch (e) {
              playerScope = null;
            }
            try {
              npvScope = document.querySelector('[data-testid="NPV_Panel_OpenDiv"]');
            } catch (e2) {
              npvScope = null;
            }
          }
          return !!(playerScope || npvScope);
        }
        function inScope(el) {
          if (!el || !el.tagName) return false;
          try {
            if (playerScope && (playerScope === el || playerScope.contains(el))) return true;
            if (npvScope && (npvScope === el || npvScope.contains(el))) return true;
          } catch (e) {}
          return false;
        }
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === "attributes") {
            if (
              m.attributeName === "aria-label" ||
              m.attributeName === "aria-checked" ||
              m.attributeName === "aria-valuenow" ||
              m.attributeName === "aria-valuetext" ||
              m.attributeName === "src" ||
              m.attributeName === "data-active" ||
              m.attributeName === "disabled"
            ) {
              scopes();
              // No player/panel on the page (logged out): keep the old
              // catch-all behaviour so state transitions are still noticed.
              if (!playerScope && !npvScope) {
                relevant = true;
                break;
              }
              if (inScope(m.target)) {
                relevant = true;
                break;
              }
            }
          } else if (m.type === "childList") {
            scopes();
            if (!playerScope && !npvScope) {
              relevant = true;
              break;
            }
            // Added/removed nodes inside our scopes matter; anything else is
            // Spotify repainting content we never read. A vanished player root
            // also matters (logout/navigation) — caught by containment below.
            if (
              inScope(m.target) ||
              (playerScope && !document.contains(playerScope))
            ) {
              relevant = true;
              break;
            }
          }
        }
        if (relevant) emitDebounced();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "aria-label",
          "aria-checked",
          "aria-valuenow",
          "aria-valuetext",
          "src",
          "data-active",
          "disabled",
        ],
      });
    } catch (e) {
      observer = null;
    }
    // Light fallback: re-check while the player is missing or tracks change.
    // Backs off to 5s once stable — and to 15s while paused with nothing in
    // flight, so a paused background tab stops burning CPU/battery (heat =>
    // throttling => everything feels slower). Paused changes that arrive via
    // our own clicks still surface instantly through the observer above, so
    // the slow tick only delays genuinely external paused changes.
    var stableTicks = 0;
    function tick() {
      try {
        if (typeof document.hidden === "boolean" && document.hidden) {
          fallbackTimer = setTimeout(tick, 5000);
          return;
        }
        var root = findPlayer();
        if (!root) {
          stableTicks = 0;
          emitDebounced();
          fallbackTimer = setTimeout(tick, 2000);
          return;
        }
        stableTicks++;
        emit(false);
        var busy = !!(deviceBusy || playlistBusy);
        // Piggyback the lyrics warmup on this existing tick (no new timers).
        // All gating (playing? busy? fullscreen open?) lives inside the check.
        if (!busy) {
          try {
            lyricsWarmCheck();
          } catch (e3) {}
        }
        var paused = false;
        try {
          paused = !isPlaying();
        } catch (e2) {}
        var nextMs;
        if (busy) {
          nextMs = 2000;
        } else if (paused) {
          nextMs = 15000;
        } else {
          nextMs = stableTicks > 10 ? 5000 : 2000;
        }
        fallbackTimer = setTimeout(tick, nextMs);
      } catch (e) {
        fallbackTimer = setTimeout(tick, 2000);
      }
    }
    fallbackTimer = setTimeout(tick, 1500);
  }

  /* ---------- Public API ---------- */

  var spotify = {
    // Lifecycle
    findPlayer: findPlayer,
    isReady: function () {
      return !!findPlayer() && !!findToggleButton();
    },
    waitForPlayer: function (timeoutMs) {
      var timeout = timeoutMs || 30000;
      return new Promise(function (resolve) {
        if (spotify.isReady()) {
          resolve(true);
          return;
        }
        var done = false;
        var to = setTimeout(function () {
          if (!done) {
            done = true;
            if (obs) obs.disconnect();
            resolve(spotify.isReady());
          }
        }, timeout);
        var obs = null;
        try {
          obs = new MutationObserver(function () {
            if (spotify.isReady() && !done) {
              done = true;
              clearTimeout(to);
              obs.disconnect();
              resolve(true);
            }
          });
          obs.observe(document.documentElement, { childList: true, subtree: true });
        } catch (e) {
          clearTimeout(to);
          resolve(spotify.isReady());
        }
      });
    },
    subscribe: function (cb) {
      subscribers.add(cb);
      try {
        cb(getSnapshot(), false);
      } catch (e) {}
      return function () {
        subscribers.delete(cb);
      };
    },

    // Transport (full taps, not bare clicks: on Android/desktop-site a bare
    // synthetic click can be ignored, which read as "needs a harder tap").
    // userClick ends with el.click() anyway, so desktop behaviour is unchanged.
    play: function () {
      if (isPlaying()) return true;
      return userClick(findToggleButton());
    },
    pause: function () {
      if (!isPlaying()) return true;
      return userClick(findToggleButton());
    },
    togglePlay: function () {
      return userClick(findToggleButton());
    },
    next: function () {
      return userClick(findPlayerButton("next"));
    },
    previous: function () {
      return userClick(findPlayerButton("previous"));
    },

    // Modes
    toggleShuffle: function () {
      return userClick(findPlayerButton("shuffle"));
    },
    toggleRepeat: function () {
      return userClick(findPlayerButton("repeat"));
    },
    toggleLike: function () {
      return userClick(findLikeButton());
    },

    // Side panel shortcuts. Return false when Spotify has no such control
    // (e.g. logged out) so the UI can hide/disable the button.
    openLyrics: function () {
      return userClick(findSideButton("lyrics"));
    },
    openQueue: function () {
      return userClick(findSideButton("queue"));
    },
    // Spotify's own picker. Kept for compatibility/diagnostics — the custom
    // sheet uses the device API below, which drives the same picker for real.
    openDevices: function () {
      return userClick(findSideButton("device"));
    },
    closeDevices: function () {
      return closeNativePicker();
    },
    isDevicePickerOpen: pickerIsOpen,

    // Devices: real Spotify Connect state, normalized for the UI.
    getDevices: getDevices,
    getCachedDevices: function () {
      return deviceCache.devices.slice();
    },
    getDevicesState: getDevicesState,
    getActiveDevice: getActiveDevice,
    selectDevice: selectDevice,
    refreshDevices: function () {
      return getDevices({ fresh: true });
    },
    inspectDevices: getDeviceDiagnostics,

    // Save / Add to Playlist: real Spotify state, normalized. Primary source
    // is the bottom-bar curation sheet (exact URIs, artwork, verified
    // checkbox toggles); the tippy context-menu path is the fallback.
    // remove returns {ok:false, reason:"remove-unavailable"} when Spotify
    // offers no removal instead of faking it.
    getPlaylists: getPlaylists,
    getCachedPlaylists: function () {
      return (playlistCache.list || []).slice();
    },
    getPlaylistsState: getPlaylistsState,
    getPlaylistMembership: function (opts) {
      return getPlaylists(opts).then(function (list) {
        return (list || []).map(function (p) {
          return {
            id: p.id,
            uri: p.uri,
            name: p.name,
            containsTrack: !!p.containsTrack,
            isLikedSongs: !!p.isLikedSongs,
          };
        });
      });
    },
    refreshPlaylists: function () {
      return getPlaylists({ fresh: true });
    },
    addToPlaylist: addToPlaylist,
    removeFromPlaylist: removeFromPlaylist,
    togglePlaylist: togglePlaylist,
    toggleLikeAsync: toggleLikeAsync,
    savePlaylistDraft: savePlaylistDraft,
    inspectPlaylists: inspectPlaylists,
    getCurrentTrackUri: getCurrentTrackUri,

    // Lyrics: preview snippet + fullscreen mirror with synced tracking.
    // getLyricsState is a sync read; watchLyrics pushes updates; the open
    // call drives Spotify's own fullscreen (veiled) and close always takes
    // Spotify's fullscreen down with ours.
    getLyricsState: getLyricsState,
    watchLyrics: watchLyrics,
    openLyricsFullscreen: openLyricsFullscreen,
    closeLyricsFullscreen: closeLyricsFullscreen,
    isLyricsFullscreenOpen: isLyricsFullscreenOpen,
    inspectLyrics: inspectLyrics,

    // Opens the playing-from context the Spotify way: by clicking Spotify's
    // own header link (inside its React tree), so its router handles it as
    // in-app navigation. Clicking a copy of the URL from our overlay sits
    // outside that tree and forces a full page load instead.
    openContext: function () {
      var pick = null;
      try {
        pick = pickContextLink();
      } catch (e) {
        pick = null;
      }
      if (!pick || !pick.el) return false;
      return click(pick.el);
    },

    // Same mechanism for the artist name: click Spotify's own artist link
    // (a[data-testid="context-item-info-artist"] in the widget), so the
    // artist page opens as in-app navigation.
    openArtist: function () {
      try {
        var widget = findWidget() || findPlayer();
        if (widget && widget.querySelector) {
          var link =
            widget.querySelector('a[data-testid="context-item-info-artist"]') ||
            widget.querySelector('a[href*="/artist/"], a[href*="/show/"]');
          if (link) return click(link);
        }
      } catch (e) {}
      return false;
    },

    // Volume
    setVolume: function (value01) {
      var v = Math.max(0, Math.min(1, Number(value01)));
      if (!isFinite(v)) return false;
      var slider = findVolumeSlider();
      if (!slider) return false;
      if (slider.tagName === "INPUT") {
        var nums = sliderNumbers(slider);
        var max = nums && isFinite(nums.max) ? nums.max : 1;
        var target;
        if (max > 1.01) target = Math.round(v * max);
        else if (max > 0) target = v * max;
        else target = v;
        return setNativeRangeValue(slider, target);
      }
      return false;
    },
    toggleMute: function () {
      var muteBtn = findMuteButton();
      if (muteBtn) return click(muteBtn);
      // Fallback: stash + zero the volume slider.
      var slider = findVolumeSlider();
      if (!slider) return false;
      var nums = sliderNumbers(slider);
      if (nums && nums.now > 0) {
        try {
          slider.dataset.spmPrev = String(nums.now);
        } catch (e) {}
        return setNativeRangeValue(slider, 0);
      }
      var prev = slider.dataset ? parseFloat(slider.dataset.spmPrev) : NaN;
      var max = nums && isFinite(nums.max) ? nums.max : 1;
      return setNativeRangeValue(slider, isFinite(prev) && prev > 0 ? prev : max);
    },

    // Seeking
    seek: function (seconds) {
      var s = Number(seconds);
      if (!isFinite(s) || s < 0) return false;
      var slider = findProgressSlider();
      if (slider) {
        if (seekBySlider(s, slider)) return true;
      }
      // Last resort: click at ratio on the progress bar container.
      var bar = byTestId(TESTIDS.progressBar) || (slider && slider.parentElement);
      if (bar) {
        var dur = getDuration();
        if (!dur) return false;
        var r = bar.getBoundingClientRect();
        if (r.width <= 0) return false;
        var x = r.left + (s / dur) * r.width;
        var y = r.top + r.height / 2;
        function fire(type) {
          bar.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              clientX: x,
              clientY: y,
              pointerId: 1,
            })
          );
          bar.dispatchEvent(
            new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
          );
        }
        try {
          fire("pointerdown");
          fire("mousedown");
          fire("pointerup");
          fire("mouseup");
          fire("click");
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    },

    // Getters (used by the UI + progress loop)
    getCurrentTrack: function () {
      var el = findTrackElement();
      return el ? (el.textContent || "").trim() : "";
    },
    getCurrentArtist: function () {
      var el = findArtistElement();
      return el ? (el.textContent || "").trim() : "";
    },
    getArtwork: function () {
      try {
        return selectBestArtwork().url || "";
      } catch (e) {
        var el = findArtworkElement();
        return el ? el.currentSrc || el.src || "" : "";
      }
    },
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    isPlaying: isPlaying,
    // Build marker (see top of file).
    build: BUILD,
    // Direct toggle-button mirror (instant, no snapshot debounce). The play
    // icons + halos prefer this; snapshots keep driving progress/status.
    getPlayState: getPlayState,
    watchPlayState: watchPlayState,
    // Forced lyrics freshness pass for player track changes (see above).
    refreshLyrics: refreshLyrics,
    isShuffleEnabled: isShuffleEnabled,
    getRepeatMode: getRepeatMode,
    isLiked: isLiked,
    getVolume: getVolume,
    isMuted: function () {
      return getVolume() <= 0.001;
    },
    getSnapshot: getSnapshot,
    getArtworkCandidates: getArtworkCandidates,
    getViewportInfo: getViewportInfo,
    getLikeInfo: getLikeInfo,
    getPlaybackContext: getPlaybackContext,

    // Internal discovery helpers (kept public for diagnostics/tests only).
    _findPlayerButton: findPlayerButton,
    _findProgressSlider: findProgressSlider,
    _findVolumeSlider: findVolumeSlider,
  };

  // Auto-start observation as soon as the DOM is usable.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  // Page-context diagnostics bridge. Content scripts run in an isolated JS
  // world, so the page console cannot see window.SpotMobile ("SpotMobile is
  // not defined" with the default "top" context — the console's context
  // dropdown must be switched to the extension instead). This bridge works
  // from the page context with no switching: paste the two lines below into
  // ANY open.spotify.com console and the report is logged there.
  //
  //   addEventListener("message", function handler(e) {
  //     if (e.data && e.data.__spm === "spm-inspect-lyrics" && ("data" in e.data)) {
  //       removeEventListener("message", handler);
  //       console.log(e.data.data);
  //     }
  //   });
  //   postMessage({ __spm: "spm-inspect-lyrics" }, "*");
  //
  // Requests carry no "data" key; responses do — so our own response post
  // can never re-trigger this listener.
  window.addEventListener("message", function (e) {
    try {
      if (!e || !e.data || e.data.__spm !== "spm-inspect-lyrics") return;
      if ("data" in e.data) return;
      var out = null;
      try {
        out = inspectLyrics();
      } catch (err) {
        out = { error: String((err && err.message) || err) };
      }
      window.postMessage({ __spm: "spm-inspect-lyrics", data: out }, "*");
    } catch (err2) {}
  });

  window.SpotMobile = window.SpotMobile || {};
  window.SpotMobile.spotify = spotify;
})();
