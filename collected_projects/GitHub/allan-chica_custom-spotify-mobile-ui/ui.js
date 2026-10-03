/* Spotify Mobile Prototype — ui.js
 *
 * Custom mobile-style player UI (dark adaptation of the "Current Track"
 * concept: header with circular buttons, squircle artwork with a slim seekable progress line beneath, centered titles, minimal controls,
 * lyrics row). This file must ONLY talk to Spotify through
 * window.SpotMobile.spotify (the adapter). No direct document.querySelector
 * calls into Spotify's DOM are allowed here — only queries scoped to our
 * own container (root.querySelector).
 */

(function () {
  "use strict";

  var SVG = {
    play: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="6.4" y="5" width="4.2" height="14" rx="1.6"/><rect x="13.4" y="5" width="4.2" height="14" rx="1.6"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M7 6l8 6-8 6z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17 6l-8 6 8 6z"/></svg>',
    shuffle:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
    repeat:
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    heartFill:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg>',
    volume:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>',
    mute:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    queue:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><line x1="15.5" y1="15.5" x2="20" y2="20"/></svg>',
    playlistRow:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><line x1="7" y1="9.5" x2="17" y2="9.5"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="16.5" x2="13" y2="16.5"/></svg>',
    devices:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6"/><path d="M18 9h3a1 1 0 011 1v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-9a1 1 0 011-1h4z"/></svg>',
    deviceRow:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M6 19h6"/><path d="M18 9h3a1 1 0 011 1v9a1 1 0 01-1 1h-7a1 1 0 01-1-1v-9a1 1 0 011-1h4z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17.5 19 7"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    spinner:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 019 9"/></svg>',
    chevLeft:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 5 8 12 15 19"/></svg>',
    expand:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0"/><path d="M12 17.5V21"/><path d="M9 21h6"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  };



  function formatTime(totalSeconds) {
    var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    var ss = String(sec).padStart(2, "0");
    return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function createMobilePlayer(spotify) {
    var root = el("div", null, null);
    root.id = "spm-root";
    root.innerHTML =
      '<div class="spm-card" role="region" aria-label="Mobile player">' +

      '<div class="spm-glow" aria-hidden="true"></div>' +
      '<header class="spm-top">' +
      '<button class="spm-circle spm-collapse" type="button" aria-label="Minimize player">' +
      SVG.chevLeft +
      "</button>" +
      '<div class="spm-top-title">Current Track</div>' +
      '<button class="spm-circle spm-like" type="button" data-likefx="main" aria-label="Add to Liked Songs" aria-pressed="false">' +
      SVG.heart +
      "</button>" +
      "</header>" +
      '<div class="spm-context" role="note" hidden><button class="spm-context-link" type="button"></button></div>' +
      '<div class="spm-stage">' +
      '<div class="spm-halos" aria-hidden="true"></div>' +
      '<div class="spm-blob">' +
      '<img class="spm-art" alt="Album artwork" draggable="false" />' +
      '<div class="spm-art-fallback" aria-hidden="true">' + SVG.note + "</div>" +
      // In-cover lyrics: lives INSIDE the blob (inset 0, clipped by its
      // overflow + radius), so the lyrics box is pixel-identical to the
      // artwork squircle by construction — never a sibling box to measure.
      '<div class="spm-coverlyr" role="group" aria-label="Lyrics" hidden>' +
      '<div class="spm-coverlyr-list"></div>' +
      '<div class="spm-coverlyr-state" hidden></div>' +
      '<button class="spm-coverlyr-expand" type="button" aria-label="Open lyrics fullscreen">' + SVG.expand + "</button>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="spm-titles"><h2 class="spm-title">Nothing playing</h2>' +
      '<p class="spm-artist"><button class="spm-artist-link" type="button" disabled>Open Spotify and press play</button></p></div>' +
      '<div class="spm-progress">' +
      '<div class="spm-bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
      '<div class="spm-track"><div class="spm-fill"></div></div>' +
      "</div>" +
      '<div class="spm-timerow"><span class="spm-cur">0:00</span><span class="spm-dur">0:00</span></div>' +
      "</div>" +
      '<div class="spm-main">' +
      '<button class="spm-mini spm-repeat" type="button" aria-label="Enable repeat" aria-pressed="false">' + SVG.repeat + '<span class="spm-badge">1</span></button>' +
      '<button class="spm-mini spm-prev" type="button" aria-label="Previous">' + SVG.prev + "</button>" +
      '<button class="spm-play" type="button" aria-label="Play">' + SVG.play + "</button>" +
      '<button class="spm-mini spm-next" type="button" aria-label="Next">' + SVG.next + "</button>" +
      '<button class="spm-mini spm-shuffle" type="button" aria-label="Enable shuffle" aria-pressed="false">' + SVG.shuffle + "</button>" +
      "</div>" +
      '<div class="spm-aux">' +
      '<button class="spm-ghost spm-queue" type="button" aria-label="Queue">' + SVG.queue + "<span>Queue</span></button>" +
      '<button class="spm-ghost spm-devices" type="button" aria-label="Connect to a device">' + SVG.devices + "<span>Devices</span></button>" +
      '<button class="spm-ghost spm-coverlyr-toggle" type="button" aria-label="Show lyrics in album cover" aria-pressed="false">' + SVG.mic + "<span>Lyrics</span></button>" +
      '<button class="spm-ghost spm-volbtn" type="button" aria-label="Volume" aria-expanded="false">' + SVG.volume + "</button>" +
      '<div class="spm-volpop" hidden>' +
      '<button class="spm-voltbtn spm-mute" type="button" aria-label="Mute">' + SVG.volume + "</button>" +
      '<div class="spm-vol-bar" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">' +
      '<div class="spm-vol-track"><div class="spm-vol-fill"></div></div>' +
      "</div>" +
      "</div>" +
      "</div>" +
      '<p class="spm-status" role="status"></p>' +
      "</div>" +
      '<div class="spm-miniplayer" role="region" aria-label="Mini player">' +
      '<div class="spm-mini-progress" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="spm-mini-progress-fill"></div></div>' +
      '<div class="spm-mini-artwrap"><img class="spm-mini-art" alt="" draggable="false" />' +
      '<div class="spm-mini-fallback" aria-hidden="true">' + SVG.note + "</div></div>" +
      '<div class="spm-mini-titles"><div class="spm-mini-title">Nothing playing</div>' +
      '<div class="spm-mini-artist">Open Spotify</div></div>' +
      '<button class="spm-mini-like" type="button" data-likefx="mini" aria-label="Add to Liked Songs" aria-pressed="false">' +
      SVG.heart +
      "</button>" +
      '<button class="spm-mini-prev" type="button" aria-label="Previous">' + SVG.prev + "</button>" +
      '<button class="spm-mini-play" type="button" aria-label="Play">' + SVG.play + "</button>" +
      '<button class="spm-mini-next" type="button" aria-label="Next">' + SVG.next + "</button>" +
      "</div>" +
      // --- custom Devices bottom sheet (our own layer over the player) ---
      '<div class="spm-dbackdrop" hidden></div>' +
      '<section class="spm-dsheet" role="dialog" aria-modal="true" aria-labelledby="spm-dsheet-title" tabindex="-1" hidden>' +
      '<div class="spm-dgrab"><span class="spm-dhandle" aria-hidden="true"></span></div>' +
      // No close button: the sheet closes by swipe-down, backdrop tap, or
      // Escape. The header is title-only, so it centres.
      '<header class="spm-dhead">' +
      '<h3 class="spm-dtitle" id="spm-dsheet-title">Devices</h3>' +
      "</header>" +
      '<div class="spm-dbody">' +
      '<ul class="spm-dlist"></ul>' +
      '<div class="spm-dstate" hidden></div>' +
      "</div>" +
      '<p class="spm-dnotice" role="status" hidden></p>' +
      "</section>" +
      // --- custom Save / Add-to-Playlist bottom sheet (same pattern as Devices) ---
      '<div class="spm-pbackdrop" hidden></div>' +
      '<section class="spm-psheet" role="dialog" aria-modal="true" aria-labelledby="spm-psheet-title" tabindex="-1" hidden>' +
      '<div class="spm-pgrab"><span class="spm-phandle" aria-hidden="true"></span></div>' +
      // No close button: the sheet closes by swipe-down, backdrop tap, or
      // Escape. The header is title-only, so it centres.
      '<header class="spm-phead">' +
      '<h3 class="spm-ptitle" id="spm-psheet-title">Add to playlist</h3>' +
      "</header>" +
      '<div class="spm-psearch" role="search">' +
      '<span class="spm-psearch-icon" aria-hidden="true">' + SVG.search + "</span>" +
      '<input class="spm-psearch-input" type="search" placeholder="Search playlists..." aria-label="Search playlists" autocomplete="off" />' +
      "</div>" +
      '<div class="spm-pbody">' +
      '<ul class="spm-plist"></ul>' +
      '<div class="spm-pstate" hidden></div>' +
      "</div>" +
      '<div class="spm-pfoot">' +
      '<button class="spm-pcancel" type="button">Cancel</button>' +
      '<button class="spm-pdone" type="button">Done</button>' +
      "</div>" +
      '<p class="spm-pnotice" role="status" hidden></p>' +
      "</section>" +
      // --- custom fullscreen Lyrics (mirrors Spotify's own fullscreen) ---
      '<div class="spm-lbackdrop" hidden></div>' +
      '<section class="spm-lsheet" role="dialog" aria-modal="true" aria-label="Lyrics" tabindex="-1" hidden>' +
      '<header class="spm-lhead">' +
      '<button class="spm-lclose" type="button" aria-label="Close lyrics">' + SVG.close + "</button>" +
      "</header>" +
      '<div class="spm-lbody">' +
      '<div class="spm-llist"></div>' +
      '<div class="spm-lstate" hidden></div>' +
      "</div>" +
      "</section>";

    // All queries below are scoped to our own container — never Spotify's DOM.
    var q = function (sel) {
      return root.querySelector(sel);
    };
    var cardEl = q(".spm-card");
    var mini = q(".spm-miniplayer");
    var miniArt = q(".spm-mini-art");
    var miniFallback = q(".spm-mini-fallback");
    var miniTitle = q(".spm-mini-title");
    var miniArtist = q(".spm-mini-artist");
    var miniLike = q(".spm-mini-like");
    var miniPrev = q(".spm-mini-prev");
    var miniPlay = q(".spm-mini-play");
    var miniNext = q(".spm-mini-next");
    var miniProgressFill = q(".spm-mini-progress-fill");
    var miniProgress = q(".spm-mini-progress");
    var art = q(".spm-art");
    var artFallback = q(".spm-art-fallback");
    var titleEl = q(".spm-title");
    var artistEl = q(".spm-artist");
    var artistBtn = q(".spm-artist-link");
    var likeBtn = q(".spm-like");
    // The heart flourish cannot live inside the card: .spm-card sets
    // overflow-x/y, so a radial burst at the top-right corner would be clipped
    // away to nothing. These live directly under #spm-root (which does not
    // clip) and are re-anchored to their heart's centre on every burst.
    // Inserted after the card so the mini bar and both sheets still paint
    // above them.
    var likeFx = { main: null, mini: null };
    ["main", "mini"].forEach(function (which) {
      var layer = document.createElement("div");
      layer.className = "spm-like-fx";
      layer.setAttribute("aria-hidden", "true");
      layer.setAttribute("data-likefx", which);
      if (mini && mini.parentNode) mini.parentNode.insertBefore(layer, mini);
      else root.appendChild(layer);
      likeFx[which] = layer;
    });
    var playBtn = q(".spm-play");
    var prevBtn = q(".spm-prev");
    var nextBtn = q(".spm-next");
    var shuffleBtn = q(".spm-shuffle");
    var repeatBtn = q(".spm-repeat");
    var bar = q(".spm-bar");
    var fill = q(".spm-fill");
    var blob = q(".spm-blob");

    var curEl = q(".spm-cur");
    var durEl = q(".spm-dur");
    var statusEl = q(".spm-status");
    var muteBtn = q(".spm-mute");
    var volBar = q(".spm-vol-bar");
    var volFill = q(".spm-vol-fill");
    var volBtn = q(".spm-volbtn");
    var volPop = q(".spm-volpop");
    var collapseBtn = q(".spm-collapse");
    var contextEl = q(".spm-context");
    var contextLink = q(".spm-context-link");
    var queueBtn = q(".spm-queue");
    var devicesBtn = q(".spm-devices");
    var sheetEl = q(".spm-dsheet");
    var backdropEl = q(".spm-dbackdrop");
    var grabEl = q(".spm-dgrab");
    var sheetList = q(".spm-dlist");
    var sheetState = q(".spm-dstate");
    var sheetHead = q(".spm-dhead");
    var sheetBody = q(".spm-dbody");
    var sheetNotice = q(".spm-dnotice");
    // Save / Add-to-Playlist sheet refs (own layer, same pattern as Devices).
    var psheetEl = q(".spm-psheet");
    var pbackdropEl = q(".spm-pbackdrop");
    var pgrabEl = q(".spm-pgrab");
    var psheetListEl = q(".spm-plist");
    var psheetState = q(".spm-pstate");
    var psheetHead = q(".spm-phead");
    var psheetBody = q(".spm-pbody");
    var psheetNotice = q(".spm-pnotice");
    var psheetSearchInput = q(".spm-psearch-input");
    var psheetCancelBtn = q(".spm-pcancel");
    var psheetDoneBtn = q(".spm-pdone");
    // Fullscreen Lyrics refs (own layer, same pattern as the sheets).
    var lsheetEl = q(".spm-lsheet");
    var lbackdropEl = q(".spm-lbackdrop");
    var lsheetBody = q(".spm-lbody");
    var lsheetListEl = q(".spm-llist");
    var lsheetState = q(".spm-lstate");
    var lsheetCloseBtn = q(".spm-lclose");
    // In-cover Lyrics refs (inside the artwork squircle itself).
    var coverlyrEl = q(".spm-coverlyr");
    var coverlyrList = q(".spm-coverlyr-list");
    var coverlyrState = q(".spm-coverlyr-state");
    var coverlyrExpand = q(".spm-coverlyr-expand");
    var coverlyrToggle = q(".spm-coverlyr-toggle");

    var collapsed = false;
    var seeking = false;
    var seekPreview = 0;
    var lastSnap = null;
    var rafId = 0;
    var currentArtwork = "";
    var envInfo = null;
    var envApplyZoom = 0; // last zoom actually written to CSS
    var envSample = null; // previous reading, for two-sample agreement
    var envSampleAt = 0;
    var envTimer = 0;
    var sheetLoadTimer = 0;
    var transitionTimer = 0;
    var miniDrag = null;
    var miniSuppressClick = false;
    // Skeleton loading: true until the first real track arrives. While set,
    // render() shows shimmer placeholders instead of the "Nothing playing"
    // dummy text (see .spm-loading in style.css).
    var hasEverLoaded = false;
    root.classList.add("spm-loading");
    try {
      root.setAttribute("aria-busy", "true");
    } catch (e) {}

    /* Responsive environment: on phones Spotify renders its desktop layout
     * in a wide layout viewport that is scaled down to fit the glass, which
     * would shrink our player too. We compensate with a MEASURED factor
     * (adapter.getViewportInfo(), never a hardcoded phone size): CSS `zoom`
     * on our root re-magnifies our own box back to true physical size, and
     * the tall sheet layout is driven by the VISIBLE width rather than the
     * layout-viewport media query (which never matches a desktop layout).
     * On desktop the factor is exactly 1 and the vars equal the viewport,
     * so desktop rendering is bit-identical to before. */
    // The environment is a property of the GLASS, not of the moment. Spotify's
    // own Connect panel (which the adapter opens behind the scenes to read the
    // device list) shifts the layout for a frame or two; re-deriving `--spm-zoom`
    // from such a reading is what made the whole UI shrink and grow again while
    // the sheet was connecting. So: debounce resize bursts, never recompute
    // while our sheet is open (it is re-applied on close), and only adopt a new
    // zoom when two consecutive readings agree on it (with hysteresis against
    // small wobbles).
    function scheduleEnvironment() {
      if (envTimer) window.clearTimeout(envTimer);
      envTimer = window.setTimeout(function () {
        envTimer = 0;
        applyEnvironment();
      }, 140);
    }

    function applyEnvironment() {
      // Frozen while either sheet is up (both open Spotify's own UI behind
      // the scenes to read state, which shifts the layout for a frame or two).
      if (typeof sheetOpen !== "undefined" && sheetOpen) return;
      if (typeof psheetOpen !== "undefined" && psheetOpen) return;
      var info = null;
      try {
        info = spotify.getViewportInfo();
      } catch (e) {
        return;
      }
      if (!info) return;
      // Never let a garbage reading (NaN / zero / absurd zoom from a
      // spoofed viewport) blank or blow up the layout: only finite, sane
      // numbers reach CSS, otherwise the stylesheet defaults stand. The
      // sheet flag itself still applies from whatever we got.
      var zoom = Number(info.zoom);
      var vw = Math.round(Number(info.sheetWidth));
      var vh = Math.round(Number(info.sheetHeight));
      var sane =
        isFinite(zoom) && zoom > 0 && zoom <= 8 &&
        isFinite(vw) && vw > 0 && isFinite(vh) && vh > 0;
      envInfo = info;
      if (sane) {
        var now = nowMs();
        var agreed =
          envSample !== null &&
          now - envSampleAt >= 60 &&
          Math.abs(envSample - zoom) < 0.1;
        envSample = zoom;
        envSampleAt = now;
        if (!envApplyZoom) {
          envApplyZoom = zoom; // first reading always applies
        } else if (agreed && Math.abs(zoom - envApplyZoom) >= 0.12) {
          envApplyZoom = zoom; // settled change (rotation): adopt it
        }
        try {
          root.style.setProperty("--spm-zoom", String(envApplyZoom));
          root.style.setProperty("--spm-vw", vw + "px");
          root.style.setProperty("--spm-vh", vh + "px");
        } catch (e) {}
      }
      root.classList.toggle("spm-sheet", !!info.sheet);
    }

    function watchEnvironment() {
      try {
        window.addEventListener("resize", scheduleEnvironment, { passive: true });
        window.addEventListener("orientationchange", scheduleEnvironment, { passive: true });
        if (window.visualViewport && window.visualViewport.addEventListener) {
          window.visualViewport.addEventListener("resize", scheduleEnvironment, { passive: true });
        }
      } catch (e) {}
    }

    function setStatus(text) {
      if (statusEl.textContent !== text) statusEl.textContent = text;
    }

    function setCollapsed(next) {
      collapsed = next;
      root.classList.toggle("spm-collapsed", collapsed);
      collapseBtn.setAttribute("aria-label", collapsed ? "Expand player" : "Minimize player");
      try {
        localStorage.setItem("spm-collapsed", collapsed ? "1" : "0");
      } catch (e) {}
    }

    function prefersReducedMotion() {
      try {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch (e) {
        return false;
      }
    }

    function clearTransitionTimer() {
      if (transitionTimer) {
        try {
          window.clearTimeout(transitionTimer);
        } catch (e) {}
        transitionTimer = 0;
      }
    }

    // Ghost-click guard. Expanding on pointerup reveals .spm-card UNDER the finger,
    // and opening a sheet reveals its backdrop UNDER the finger — and the
    // browser then synthesises its click by hit-testing the NEW layout.
    // So a tap that landed on the mini bar can activate whatever card button
    // happens to sit at that point now (the Devices button, typically), and a
    // tap that opened a sheet on pointerup can immediately close it again via
    // its own backdrop (the "loading then closes on its own" flash). The click
    // is dispatched to the newly revealed element, so neither the mini's own
    // guards nor a `stopPropagation` inside the mini can help: it has to be
    // swallowed before it reaches any target.
    var miniExpandAt = 0;
    var sheetOpenedAt = 0;
    var GHOST_CLICK_WINDOW_MS = 450;
    document.addEventListener(
      "click",
      function (e) {
        // Mini-expand ghost: swallow the trailing click unless it is genuinely
        // inside the mini bar. Consumed either way so a stale flag never eats
        // a deliberate later tap.
        if (miniExpandAt) {
          var dt = nowMs() - miniExpandAt;
          miniExpandAt = 0;
          if (dt <= GHOST_CLICK_WINDOW_MS) {
            try {
              if (e.target && e.target.closest && e.target.closest(".spm-miniplayer")) return;
            } catch (err) {}
            e.stopPropagation();
            e.preventDefault();
            return;
          }
        }
        // Sheet-open ghost: the opening tap's trailing click lands on the
        // just-revealed backdrop (or another card control under the overlay).
        // Swallow the first click after open so the sheet does not instantly
        // toggle/close itself. Clicks genuinely inside the open sheet are
        // allowed through (rows cannot be under the finger this fast anyway —
        // they render later). Consumed either way like the mini guard, so a
        // stale flag never eats a deliberate later tap (e.g. backdrop-close
        // in tests fires within the same window and must go through once the
        // ghost is gone).
        if (sheetOpenedAt) {
          var sdt = nowMs() - sheetOpenedAt;
          sheetOpenedAt = 0;
          if (sdt <= GHOST_CLICK_WINDOW_MS) {
            var inSheet = false;
            try {
              if (e.target && e.target.closest) {
                inSheet = !!(
                  e.target.closest(".spm-dsheet") ||
                  e.target.closest(".spm-psheet") ||
                  e.target.closest(".spm-lsheet")
                );
              }
            } catch (err2) {}
            if (!inSheet) {
              e.stopPropagation();
              e.preventDefault();
            }
            return;
          }
        }
      },
      true
    );

    function armSheetGhost() {
      sheetOpenedAt = nowMs();
      // Expire by time so one tap's several trailing clicks are all covered
      // but a deliberate later tap is never eaten.
      window.setTimeout(function () {
        sheetOpenedAt = 0;
      }, GHOST_CLICK_WINDOW_MS + 50);
    }

    // Animated state flips (mini <-> full feel like one component
    // transforming, not two boxes swapping). Reduced-motion users and
    // first paint get the instant swap instead.
    function expandAnimated(fromPointer) {
      if (!collapsed) return;
      clearTransitionTimer();
      mini.classList.remove("spm-leaving");
      cardEl.classList.remove("spm-leaving-card");
      cardEl.style.transform = "";
      cardEl.style.opacity = "";
      // Arm the ghost-click guard ONLY for the pointer path. When we expand
      // from the click fallback (the click is already being dispatched, and
      // our capture listener has already run for it) arming here would eat
      // the user's NEXT deliberate tap.
      miniExpandAt = fromPointer ? nowMs() : 0;
      setCollapsed(false);
    }

    function collapseAnimated() {
      if (collapsed) return;
      clearTransitionTimer();
      if (prefersReducedMotion()) {
        setCollapsed(true);
        return;
      }
      // Card sinks down and away; the flip lands mid-sink (~60ms) so the
      // blooming mini overlaps it.
      cardEl.classList.add("spm-leaving-card");
      transitionTimer = window.setTimeout(function () {
        transitionTimer = 0;
        cardEl.classList.remove("spm-leaving-card");
        setCollapsed(true);
      }, 60);
    }

    // Drag-release path: the card is already mid-flight under the finger,
    // so glide it the rest of the way out, then swap to the mini-player.
    function finishDragCollapse() {
      clearTransitionTimer();
      cardEl.classList.remove("spm-card-drag");
      var h = cardHeight();
      cardEl.style.transform = "translateY(" + Math.round(h * 1.1) + "px)";
      cardEl.style.opacity = "0";
      if (prefersReducedMotion()) {
        cardEl.style.transform = "";
        cardEl.style.opacity = "";
        setCollapsed(true);
        return;
      }
      transitionTimer = window.setTimeout(function () {
        transitionTimer = 0;
        cardEl.style.transform = "";
        cardEl.style.opacity = "";
        setCollapsed(true);
      }, 120);
    }

    function applyStoredState() {
      var stored = null;
      try {
        stored = localStorage.getItem("spm-collapsed");
      } catch (e) {}
      if (stored === "1") setCollapsed(true);
      else if (stored === "0") setCollapsed(false);
      // Mobile opens on the mini-player by default (first run only —
      // afterwards the remembered choice wins).
      else if (envInfo && envInfo.sheet) setCollapsed(true);
      else setCollapsed(false);
    }

    function pressFeedback(btn) {
      btn.classList.remove("spm-press");
      // Force reflow so rapid taps retrigger the animation.
      void btn.offsetWidth;
      btn.classList.add("spm-press");
      setTimeout(function () {
        btn.classList.remove("spm-press");
      }, 140);
    }

    // --- transport wiring (adapter only) ---
    bindTap(playBtn, sendTogglePlay);

    /* ---------- Unified tap handling ----------
     * `click` alone feels dead on touch: it arrives ~300ms late and is
     * swallowed entirely when the touch drifts into a scroll/pan (the card is
     * a scroller, and card buttons deliberately set touch-action:none).
     * Devices already solved this with a press-release fast path; hearts and
     * transport had no equivalent, which is why they needed "a harder second
     * tap". Every tap target below now shares one contract:
     *   pointerdown -> instant pressFeedback (finger sees it at once),
     *   pointerup   -> act immediately when the press did not travel,
     *   click       -> keyboard/assistive fallback only (ignored when the
     *                  pointerup path already handled this tap).
     * Travel is measured per-press (>12px = scroll/drag, not a tap), mirroring
     * the Devices guard so pans never fire actions.
     */
    var TAP_TRAVEL_PX = 12;
    var TAP_DEDUP_MS = 700;

    function tapState() {
      return { x: 0, y: 0, id: null, handledAt: 0 };
    }

    function tapDown(st, e) {
      if (e.pointerType === "mouse" && e.button !== 0) return false;
      st.id = e.pointerId;
      st.x = e.clientX;
      st.y = e.clientY;
      return true;
    }

    function tapUp(st, e) {
      if (st.id === null || (e && e.pointerId !== undefined && e.pointerId !== st.id)) return "ignore";
      st.id = null;
      if (e.pointerType === "mouse" && e.button !== 0) return "ignore";
      if (Math.abs(e.clientX - st.x) > TAP_TRAVEL_PX || Math.abs(e.clientY - st.y) > TAP_TRAVEL_PX) {
        return "travelled";
      }
      st.handledAt = nowMs();
      return "tap";
    }

    function tapClick(st, e) {
      // Real keyboard/assistive clicks carry no pointer data at all (detail 0
      // AND zero coordinates) — those must always run. Anything with
      // coordinates that arrives right after our own pointerup handling is the
      // same tap twice (including synthetic test taps, which set coordinates
      // but leave detail 0) — swallow it.
      var d = 0;
      var cx = 0;
      var cy = 0;
      try {
        d = e.detail || 0;
        cx = e.clientX || 0;
        cy = e.clientY || 0;
      } catch (err) {}
      if (d === 0 && cx === 0 && cy === 0) return "tap";
      if (nowMs() - st.handledAt < TAP_DEDUP_MS) return "ignore";
      st.handledAt = nowMs();
      return "tap";
    }

    function tapCancel(st) {
      st.id = null;
    }

    /* ---------- Liked flourish ----------
     * Fires on the OFF -> ON transition of the heart, so it covers both a tap
     * and an external Like (Spotify's own UI, keyboard, another tab) — the
     * filled state is the moment, wherever it comes from.
     *
     * A cream/purple bloom (same radial-gradient language as .spm-halos) plus
     * an even angular spread of shards, tinted from the same halo vars so it
     * follows the light theme for free. Shards are throwaway nodes carrying
     * per-particle custom props; JS only picks the numbers, all motion lives in
     * CSS so reduced-motion can switch it off wholesale.
     */
    var LIKE_SHARDS = 14;

    function svgFromMarkup(markup) {
      var box = document.createElement("div");
      box.innerHTML = markup;
      return box.firstChild;
    }

    // Swap only the <svg>, never innerHTML — cheaper and it never disturbs
    // anything else living inside the button.
    function setHeartGlyph(btn, liked) {
      var cur = btn.querySelector("svg");
      if (!cur) {
        btn.innerHTML = liked ? SVG.heartFill : SVG.heart;
        return;
      }
      var next = svgFromMarkup(liked ? SVG.heartFill : SVG.heart);
      if (next && cur.parentNode) cur.parentNode.replaceChild(next, cur);
    }

    // Pre-zoom layout coordinates for an element's centre, relative to
    // #spm-root. Offset* stay in the root's own box, which is what the
    // absolutely positioned FX layer needs — unlike getBoundingClientRect,
    // which returns post-`zoom` visual pixels.
    function anchorLikeFx(btn, layer) {
      var x = 0;
      var y = 0;
      var n = btn;
      while (n && n !== root) {
        x += n.offsetLeft || 0;
        y += n.offsetTop || 0;
        n = n.offsetParent;
      }
      x += (btn.offsetWidth || 0) / 2;
      y += (btn.offsetHeight || 0) / 2;
      layer.style.left = Math.round(x) + "px";
      layer.style.top = Math.round(y) + "px";
    }

    function likeFlourish(btn) {
      if (!btn) return;
      if (prefersReducedMotion()) return;
      // Both hearts follow the same snapshot, so a like would fire BOTH — but
      // only one of them is on screen (the mini bar is display:none unless
      // collapsed). Bursting from a hidden one anchors to a stale/zero rect and
      // throws the effect across the screen.
      if (!btn.offsetParent && btn.offsetWidth === 0) return;
      var layer = likeFx[btn.getAttribute("data-likefx") || "main"];
      if (!layer) return;
      // The heart can move (collapse, relayout) between like and burst.
      anchorLikeFx(btn, layer);
      var fx = layer;
      fx.textContent = "";
      fx.classList.remove("spm-like-fire");
      void fx.offsetWidth;
      fx.classList.add("spm-like-fire");
      var i;
      var shard;
      for (i = 0; i < LIKE_SHARDS; i++) {
        shard = document.createElement("i");
        // Even spread + jitter, so it reads as a burst and not a fan.
        shard.style.setProperty("--a", Math.round((360 / LIKE_SHARDS) * i + (Math.random() * 26 - 13)) + "deg");
        shard.style.setProperty("--d", 24 + Math.round(Math.random() * 30) + "px");
        shard.style.setProperty("--s", 3 + Math.round(Math.random() * 3) + "px");
        shard.style.setProperty("--dur", 540 + Math.round(Math.random() * 340) + "ms");
        shard.style.setProperty("--delay", Math.round(Math.random() * 70) + "ms");
        shard.style.setProperty("--spin", Math.round(Math.random() * 720 - 360) + "deg");
        shard.style.setProperty("--c", i % 3 === 0
          ? "rgba(var(--spm-halo-cover-rgb), 0.95)"
          : "rgba(var(--spm-halo-accent-rgb), 0.95)");
        fx.appendChild(shard);
      }
      window.setTimeout(function () {
        fx.classList.remove("spm-like-fire");
        fx.textContent = "";
      }, 1150);
    }

    // Play / pause is a straight mirror of Spotify's OWN toggle button — no
    // optimistic flips, no spinners, no invented middle states. A tap only
    // sends the command; the icon changes when Spotify's button actually
    // flips (reported instantly by the adapter's watchPlayState, with the
    // debounced snapshot as fallback/seed). That is what keeps it truthful:
    // every painted state was read off the real button.
    // Direct play-state mirror: true | false | null (unknown / not yet read).
    var directPlaying = null;
    var unwatchPlayState = null;

    function paintPlayIcon(playing) {
      playBtn.innerHTML = playing ? SVG.pause : SVG.play;
      playBtn.setAttribute("data-state", playing ? "pause" : "play");
      playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
      miniPlay.innerHTML = playing ? SVG.pause : SVG.play;
      miniPlay.setAttribute("data-state", playing ? "pause" : "play");
      miniPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
      root.classList.toggle("spm-playing", !!playing);
    }

    // Single painter for icons + halos from a resolved play-state. Called by
    // snapshots (fallback/seed) AND the direct button watcher (instant) —
    // one code path means the two sources can never disagree into a flap.
    // Only touches the DOM when the shown state actually differs.
    function paintPlaying(wantPlaying) {
      wantPlaying = !!wantPlaying;
      var showingPause = playBtn.getAttribute("data-state") === "pause";
      if (wantPlaying === showingPause) {
        // Steady state: keep the mini button + halos in sync without
        // rewriting icons (rewrites would restart CSS animations).
        miniPlay.setAttribute("data-state", wantPlaying ? "pause" : "play");
        miniPlay.setAttribute("aria-label", wantPlaying ? "Pause" : "Play");
        root.classList.toggle("spm-playing", wantPlaying);
        return;
      }
      paintPlayIcon(wantPlaying);
    }

    // Direct-watcher callback: Spotify's own button flipped. Instant, and the
    // only writer besides snapshots — both funnel through paintPlaying.
    function onDirectPlay(playing) {
      directPlaying = !!playing;
      try {
        paintPlaying(directPlaying);
      } catch (e) {}
    }

    // The tap only sends the command — painting waits for Spotify's button.
    // The direct watcher reports the flip within a mutation beat, so this
    // stays responsive without ever guessing.
    function sendTogglePlay() {
      try {
        spotify.togglePlay();
      } catch (e) {}
    }

    function bindTap(btn, onTap) {
      var st = tapState();
      btn.addEventListener("pointerdown", function (e) {
        if (tapDown(st, e)) pressFeedback(btn);
      });
      btn.addEventListener("pointerup", function (e) {
        if (tapUp(st, e) === "tap") onTap(true);
      });
      btn.addEventListener("pointercancel", function () {
        tapCancel(st);
      });
      btn.addEventListener("click", function (e) {
        if (tapClick(st, e) === "tap") onTap(false);
      });
      return st;
    }

    // --- transport wiring (adapter only) ---
    bindTap(playBtn, sendTogglePlay);
    bindTap(prevBtn, function () {
      spotify.previous();
    });
    bindTap(nextBtn, function () {
      spotify.next();
    });
    bindTap(shuffleBtn, function () {
      spotify.toggleShuffle();
    });
    bindTap(repeatBtn, function () {
      spotify.toggleRepeat();
    });
    // Heart follows Spotify's own order: unsaved -> tap Likes instantly;
    // saved -> tap opens OUR playlist sheet (never Spotify's menu). The
    // decision reads Spotify's LIVE state (not the last snapshot, which can
    // lag a beat behind external changes); the sheet always loads truth on
    // open, so a wrong branch self-corrects either way.
    // NOTE: no optimistic heart fill here — the Like round trip is async and
    // the snapshot (plus flourish) confirms it. The responsiveness fix is the
    // pointerup fast path itself (bindTap below), not a faked state.
    function heartTap(btn, fromPointer) {
      var liked = false;
      try {
        liked = !!spotify.isLiked();
      } catch (e) {
        liked = !!(lastSnap && lastSnap.liked);
      }
      if (liked) {
        openPSheet(fromPointer);
        return;
      }
      try {
        if (spotify.toggleLikeAsync) spotify.toggleLikeAsync(true);
        else spotify.toggleLike();
      } catch (e) {
        try {
          spotify.toggleLike();
        } catch (e2) {}
      }
    }
    bindTap(likeBtn, function (fromPointer) {
      heartTap(likeBtn, fromPointer);
    });
    contextLink.addEventListener("click", function () {
      // Open it the Spotify way: the adapter clicks Spotify's OWN context
      // link (inside its React tree), so its router handles it as in-app
      // navigation. Clicking a copy of the URL from our overlay bypasses
      // the router and forces a full page load instead.
      var ok = false;
      try {
        ok = spotify.openContext() !== false;
      } catch (e) {
        ok = false;
      }
      if (!ok) {
        setStatus("Playlist is not available right now.");
        return;
      }
      // Minimize so the destination is visible.
      try {
        if (!collapsed) setCollapsed(true);
      } catch (e) {}
    });
    artistBtn.addEventListener("click", function () {
      // Same mechanism as the context link: click Spotify's own artist
      // link so navigation stays in-app.
      var ok = false;
      try {
        ok = spotify.openArtist() !== false;
      } catch (e) {
        ok = false;
      }
      if (!ok) {
        setStatus("Artist page is not available right now.");
        return;
      }
      // Minimize so the destination is visible.
      try {
        if (!collapsed) setCollapsed(true);
      } catch (e) {}
    });
    bindTap(queueBtn, function () {
      if (spotify.openQueue() === false) setStatus("Queue is not available right now.");
    });
    // Devices now opens our own sheet (see the Devices sheet section above).
    bindTap(muteBtn, function () {
      spotify.toggleMute();
    });
    bindTap(collapseBtn, function () {
      collapseAnimated();
    });

    // --- mini-player wiring (same component, compact state) ---
    // Mini buttons stop propagation so the mini-container tap-to-expand never
    // sees them; they share the same pointerup fast path + click fallback.
    function bindTapStop(btn, onTap) {
      var st = tapState();
      btn.addEventListener("pointerdown", function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (tapDown(st, e)) pressFeedback(btn);
      });
      btn.addEventListener("pointerup", function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (tapUp(st, e) === "tap") onTap(true);
      });
      btn.addEventListener("pointercancel", function () {
        tapCancel(st);
      });
      btn.addEventListener("click", function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (tapClick(st, e) === "tap") onTap(false);
      });
    }
    bindTapStop(miniPlay, sendTogglePlay);
    bindTapStop(miniLike, function (fromPointer) {
      heartTap(miniLike, fromPointer);
    });
    bindTapStop(miniPrev, function () {
      spotify.previous();
    });
    bindTapStop(miniNext, function () {
      spotify.next();
    });
    mini.addEventListener("click", function (e) {
      var t = e && e.target;
      if (t && t.closest && (t.closest("button") || t.closest(".spm-mini-progress"))) return; // buttons + hairline act alone
      if (miniSuppressClick) {
        miniSuppressClick = false; // a swipe release may still fire click
        return;
      }
      expandAnimated();
    });

    // Custom volume slider -> adapter (no Spotify DOM access here).
    // Native <input type=range> can't be used: the card pins touch-action
    // so collapse drags are never stolen, which would also pin the native
    // slider. This pointer-driven bar behaves the same (drag + keys).
    var volDragging = false;
    var volDebounce = 0;

    function volRatioFromEvent(e) {
      var r = volBar.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : r.left;
      return Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    }

    function paintVol(vv) {
      vv = Math.max(0, Math.min(100, Math.round(vv)));
      if (volFill) volFill.style.transform = "scaleX(" + vv / 100 + ")";
      volBar.setAttribute("aria-valuemax", "100");
      volBar.setAttribute("aria-valuenow", String(vv));
      volBar.setAttribute("aria-valuetext", vv + " percent volume");
      var wantIcon = vv <= 0 ? SVG.mute : SVG.volume;
      if (muteBtn.innerHTML !== wantIcon) muteBtn.innerHTML = wantIcon;
      muteBtn.setAttribute("aria-label", vv <= 0 ? "Unmute" : "Mute");
      // The aux volume button mirrors the level with the same glyph.
      if (volBtn && volBtn.innerHTML !== wantIcon) volBtn.innerHTML = wantIcon;
    }

    function pushVolume(v) {
      v = Math.max(0, Math.min(1, Number(v) || 0));
      window.clearTimeout(volDebounce);
      volDebounce = window.setTimeout(function () {
        spotify.setVolume(v);
      }, 60);
    }

    volBar.addEventListener("pointerdown", function (e) {
      volDragging = true;
      try {
        volBar.setPointerCapture && volBar.setPointerCapture(e.pointerId);
      } catch (err) {}
      var v = volRatioFromEvent(e) * 100;
      paintVol(v);
      pushVolume(v / 100);
      e.preventDefault();
    });

    volBar.addEventListener("pointermove", function (e) {
      if (!volDragging) return;
      var v = volRatioFromEvent(e) * 100;
      paintVol(v);
      pushVolume(v / 100);
    });

    volBar.addEventListener("pointerup", function () {
      volDragging = false;
    });

    volBar.addEventListener("pointercancel", function () {
      volDragging = false;
    });

    volBar.addEventListener("keydown", function (e) {
      var cur = 0;
      try {
        cur = Number(volBar.getAttribute("aria-valuenow")) || 0;
      } catch (err2) {}
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        paintVol(cur + 5);
        pushVolume((cur + 5) / 100);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        paintVol(cur - 5);
        pushVolume((cur - 5) / 100);
        e.preventDefault();
      } else if (e.key === "Home") {
        paintVol(0);
        pushVolume(0);
        e.preventDefault();
      } else if (e.key === "End") {
        paintVol(100);
        pushVolume(1);
        e.preventDefault();
      }
    });

    // --- volume popup: the aux speaker button opens a small volume panel ---
    // (The old inline slider is gone; its mute + bar live untouched inside
    // the popup, so all of the wiring above keeps working as-is.)
    var volPopOpen = false;

    function setVolPop(open) {
      volPopOpen = !!open;
      if (volPop) volPop.hidden = !volPopOpen;
      if (volBtn) volBtn.setAttribute("aria-expanded", volPopOpen ? "true" : "false");
    }

    if (volBtn) {
      bindTap(volBtn, function () {
        setVolPop(!volPopOpen);
      });
    }
    // A press that starts anywhere outside the popup and its button closes
    // it (capture phase, no interference with the target's own tap).
    document.addEventListener("pointerdown", function (e) {
      if (!volPopOpen) return;
      var t = e && e.target;
      try {
        if (t && t.closest && (t.closest(".spm-volpop") || t.closest(".spm-volbtn"))) return;
      } catch (err) {}
      setVolPop(false);
    }, true);

    // --- linear progress: slim line under the artwork, tap/drag to seek ---
    // Smoothness design: Spotify-DOM reads (~1/sec + snapshots) only rebase
    // an anchor; every animation frame paints the INTERPOLATED position.
    var lastAriaSec = -1;
    var anchorTime = 0;
    var anchorDur = 0;
    var anchorStamp = 0;
    var anchorPlaying = false;
    var lastRebase = 0;

    function nowMs() {
      try {
        return performance.now();
      } catch (e) {
        return Date.now();
      }
    }

    function rebase(time, dur, playing) {
      anchorTime = time || 0;
      anchorDur = dur || 0;
      anchorPlaying = !!playing;
      anchorStamp = nowMs();
    }

    function estimate() {
      var est = anchorTime + (anchorPlaying ? (nowMs() - anchorStamp) / 1000 : 0);
      if (anchorDur && est > anchorDur) est = anchorDur;
      return est < 0 ? 0 : est;
    }

    function renderBar(current, duration) {
      var ratio = duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;
      if (fill) fill.style.transform = "scaleX(" + ratio + ")";
      // Mini top hairline mirrors the same ratio (and is itself a slider).
      if (miniProgressFill) {
        miniProgressFill.style.transform = "scaleX(" + ratio + ")";
      }
      // ARIA churn feeds MutationObservers (and screen readers); 1Hz is
      // plenty, the visuals already move every frame.
      var sec = Math.round(current);
      if (sec !== lastAriaSec) {
        lastAriaSec = sec;
        bar.setAttribute("aria-valuemax", String(Math.round(duration)));
        bar.setAttribute("aria-valuenow", String(sec));
        bar.setAttribute(
          "aria-valuetext",
          formatTime(current) + " of " + formatTime(duration)
        );
        miniProgress.setAttribute("aria-valuemax", String(Math.round(duration)));
        miniProgress.setAttribute("aria-valuenow", String(sec));
        miniProgress.setAttribute(
          "aria-valuetext",
          formatTime(current) + " of " + formatTime(duration)
        );
      }
    }

    function ratioFromEvent(e) {
      var r = bar.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : r.left);
      return Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    }

    bar.addEventListener("pointerdown", function (e) {
      seeking = true;
      try {
        bar.setPointerCapture && bar.setPointerCapture(e.pointerId);
      } catch (err) {}
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      seekPreview = ratioFromEvent(e) * dur;
      renderBar(seekPreview, dur);
      if (curEl) curEl.textContent = formatTime(seekPreview);
      e.preventDefault();
    });

    bar.addEventListener("pointermove", function (e) {
      if (!seeking) return;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      seekPreview = ratioFromEvent(e) * dur;
      renderBar(seekPreview, dur);
      if (curEl) curEl.textContent = formatTime(seekPreview);
    });

    function endSeek(e) {
      if (!seeking) return;
      seeking = false;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var target = e && e.clientX !== undefined ? ratioFromEvent(e) * dur : seekPreview;
      if (dur > 0) {
        spotify.seek(target);
        // Optimistic paint; the adapter snapshot will correct us shortly.
        renderBar(target, dur);
        if (curEl) curEl.textContent = formatTime(target);
      }
    }

    bar.addEventListener("pointerup", endSeek);
    bar.addEventListener("pointercancel", function () {
      seeking = false;
    });

    bar.addEventListener("keydown", function (e) {
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var cur = (lastSnap && lastSnap.currentTime) || spotify.getCurrentTime() || 0;
      if (e.key === "ArrowRight") {
        spotify.seek(Math.min(dur, cur + 5));
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        spotify.seek(Math.max(0, cur - 5));
        e.preventDefault();
      } else if (e.key === "Home") {
        spotify.seek(0);
        e.preventDefault();
      } else if (e.key === "End") {
        spotify.seek(dur);
        e.preventDefault();
      }
    });

    // --- mini hairline seek: the top strip is a real slider too ---
    var miniSeeking = false;
    var miniSeekPreview = 0;

    function miniRatioFromEvent(e) {
      var r = miniProgress.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : r.left;
      return Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    }

    miniProgress.addEventListener("pointerdown", function (e) {
      miniSeeking = true;
      try {
        miniProgress.setPointerCapture && miniProgress.setPointerCapture(e.pointerId);
      } catch (err) {}
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      miniSeekPreview = miniRatioFromEvent(e) * dur;
      renderBar(miniSeekPreview, dur);
      if (curEl) curEl.textContent = formatTime(miniSeekPreview);
      e.preventDefault();
    });

    miniProgress.addEventListener("pointermove", function (e) {
      if (!miniSeeking) return;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      miniSeekPreview = miniRatioFromEvent(e) * dur;
      renderBar(miniSeekPreview, dur);
      if (curEl) curEl.textContent = formatTime(miniSeekPreview);
    });

    function miniEndSeek(e) {
      if (!miniSeeking) return;
      miniSeeking = false;
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var target = e && e.clientX !== undefined ? miniRatioFromEvent(e) * dur : miniSeekPreview;
      if (dur > 0) {
        spotify.seek(target);
        renderBar(target, dur);
        if (curEl) curEl.textContent = formatTime(target);
      }
    }

    miniProgress.addEventListener("pointerup", miniEndSeek);
    miniProgress.addEventListener("pointercancel", function () {
      miniSeeking = false;
    });

    miniProgress.addEventListener("keydown", function (e) {
      var dur = (lastSnap && lastSnap.duration) || spotify.getDuration() || 0;
      var cur = (lastSnap && lastSnap.currentTime) || spotify.getCurrentTime() || 0;
      if (e.key === "ArrowRight") {
        spotify.seek(Math.min(dur, cur + 5));
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        spotify.seek(Math.max(0, cur - 5));
        e.preventDefault();
      } else if (e.key === "Home") {
        spotify.seek(0);
        e.preventDefault();
      } else if (e.key === "End") {
        spotify.seek(dur);
        e.preventDefault();
      }
    });

    // --- art swipe helpers: drag the artwork sideways for prev / next ---
    // The artwork swipe OWNS no pointers itself (deliberately: a second
    // capture here once stole pointerup and glued the art to the cursor).
    // cardEl below is the single gesture owner; it calls these helpers.
    // The art follows the finger live; past the threshold it flies out and
    // the newly arriving cover flies in from the other side. A tap (no
    // real movement) does nothing at all.
    var awaitingArt = null; // { dir, timer } while the new cover travels in

    function blobWidth() {
      try {
        return blob.getBoundingClientRect().width || 200;
      } catch (e) {
        return 200;
      }
    }

    function blobPose(dxPx, opacity) {
      blob.style.transform = "translateX(" + Math.round(dxPx) + "px)";
      blob.style.opacity = String(opacity);
    }

    function blobRest() {
      blob.style.transform = "";
      blob.style.opacity = "";
    }

    function commitSwipe(dir) {
      // dir -1 (swiped left) = next track, +1 (swiped right) = previous.
      // NOTE on Spotify's previous semantics: pressing previous while >~3s
      // into the song RESTARTS it instead of going back. That is not a bug
      // in this UI — but the old code made it feel like one: it parked the
      // art off-screen for up to 3s and swallowed the follow-up swipe, so
      // users had to swipe twice with a long dead gap. The fixes below
      // (fast restart snap-back + non-blocking gestures + 120ms arrival
      // poll) make restart feel instant and the second swipe land.
      var w = blobWidth();
      blobPose(dir * w * 1.25, 0);
      if (awaitingArt && awaitingArt.timer) {
        try {
          window.clearTimeout(awaitingArt.timer);
        } catch (e) {}
      }
      if (dir < 0) spotify.next();
      else spotify.previous();
      var timer = 0;
      var startPos = lastSnap && lastSnap.currentTime ? lastSnap.currentTime : 0;
      var startTrack = lastSnap && lastSnap.track ? lastSnap.track : "";
      var t0 = nowMs();
      awaitingArt = { dir: dir, timer: 0, t0: t0, pos: startPos, track: startTrack };
      watchTrackArrival(); // poll for the new track; observer can lag
      try {
        timer = window.setTimeout(function () {
          // Spotify never delivered a new track (e.g. next at queue end):
          // glide the old art home instead of sitting empty.
          if (awaitingArt && awaitingArt.t0 === t0) {
            awaitingArt = null;
            blobRest();
          }
        }, 2000);
      } catch (e) {}
      awaitingArt.timer = timer;
    }

    function flyIn(dir) {
      var w = blobWidth();
      blob.classList.add("spm-dragging"); // hold the starting pose, no slide
      blobPose(-dir * w * 0.9, 0);
      void blob.offsetWidth; // reflow so the transition below animates
      blob.classList.remove("spm-dragging");
      blobRest(); // CSS transition glides it home
    }

    // Fast track-arrival watch: after prev/next the observer path (React
    // -> DOM mutation -> 150ms debounce -> snapshot) can lag, especially
    // on throttled mobile webviews — leaving the stage empty while Spotify
    // has already moved on. Poll the cheap track title + clock directly
    // (120ms, max ~2s to match the glide-home fallback) and render the
    // moment it flips, which also triggers the fly-in via awaitingArt.
    // The clock check is the previous-restart fast path: a sharp position
    // drop means Spotify restarted the song (not a new track), so snap
    // home at once instead of idling empty.
    function watchTrackArrival() {
      var tries = 0;
      var startTrack = awaitingArt && awaitingArt.track ? awaitingArt.track : "";
      var startPos = awaitingArt && isFinite(awaitingArt.pos) ? awaitingArt.pos : 0;
      var dir = awaitingArt ? awaitingArt.dir : 0;
      try {
        var timer = window.setInterval(function () {
          if (!awaitingArt) {
            window.clearInterval(timer);
            return;
          }
          tries++;
          var fresh = "";
          try {
            fresh = spotify.getCurrentTrack() || "";
          } catch (e) {}
          if (fresh && lastSnap && fresh !== lastSnap.track) {
            window.clearInterval(timer);
            try {
              render(spotify.getSnapshot());
            } catch (e2) {}
            return;
          }
          // Restart fast-path (previous with >~3s elapsed): position falls
          // off a cliff while the title stays identical.
          if (dir > 0 && startPos > 5) {
            var posNow = NaN;
            try {
              posNow = spotify.getCurrentTime();
            } catch (e3) {}
            if (isFinite(posNow) && posNow + 3 < startPos) {
              window.clearInterval(timer);
              try {
                render(spotify.getSnapshot());
              } catch (e4) {}
              // If the snapshot hasn't caught the restart yet, snap home
              // directly so the stage is never stuck empty.
              if (awaitingArt) {
                if (awaitingArt.timer) {
                  try {
                    window.clearTimeout(awaitingArt.timer);
                  } catch (e5) {}
                }
                awaitingArt = null;
                blobRest();
              }
              return;
            }
          }
          if (tries >= 16) window.clearInterval(timer);
        }, 120);
      } catch (e) {}
    }

    // --- cover-tinted glow: sample the artwork's dominant vivid color ---
    // Runs on a SEPARATE, display-independent Image with crossOrigin set,
    // so sampling can never break the visible cover: if the CDN refuses
    // CORS (tainted canvas) or the fetch fails, getImageData throws, we
    // swallow it, and the CSS fallback color stays. One tiny 32px decode
    // per track change — negligible cost. Stale loads (track changed
    // mid-fetch) are discarded via the currentArtwork check.
    var coverSampler = null;
    var coverCanvas = null;
    var samplingFor = "";

    // --- cover-color crossfade: blob hues sweep between tracks ---
    // The sampler below only computes TARGET colors; this loop animates the
    // CSS vars from whatever is currently displayed (mid-flight values
    // included — a new track mid-transition retargets smoothly instead of
    // snapping). eased over 1.4s; instant when reduced-motion is on or rAF
    // is unavailable. Mirrors start at the CSS fallback defaults.
    var coverDisplayed = {
      cover: [148, 120, 255],
      accent: [244, 241, 234],
    };
    var coverAnims = { cover: 0, accent: 0 };

    function transitionCoverVar(name, key, to) {
      var from = (coverDisplayed[key] || to).slice();
      if (coverAnims[key]) {
        try {
          cancelAnimationFrame(coverAnims[key]);
        } catch (e) {}
        coverAnims[key] = 0;
      }
      function snap() {
        coverDisplayed[key] = to.slice();
        try {
          root.style.setProperty(name, to.join(", "));
        } catch (e2) {}
      }
      if (from[0] === to[0] && from[1] === to[1] && from[2] === to[2]) {
        snap();
        return;
      }
      if (prefersReducedMotion()) {
        snap();
        return;
      }
      var dur = 1400;
      var t0 = 0;
      try {
        t0 = performance.now();
      } catch (e3) {
        t0 = Date.now();
      }
      function step(now) {
        var t = Math.max(0, Math.min(1, ((now === undefined ? t0 : now) - t0) / dur));
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var cur = [
          Math.round(from[0] + (to[0] - from[0]) * e),
          Math.round(from[1] + (to[1] - from[1]) * e),
          Math.round(from[2] + (to[2] - from[2]) * e),
        ];
        coverDisplayed[key] = cur;
        try {
          root.style.setProperty(name, cur.join(", "));
        } catch (e4) {}
        if (t < 1) {
          try {
            coverAnims[key] = requestAnimationFrame(step);
          } catch (e5) {
            coverAnims[key] = 0;
            snap();
          }
        } else {
          coverAnims[key] = 0;
        }
      }
      try {
        coverAnims[key] = requestAnimationFrame(step);
      } catch (e6) {
        coverAnims[key] = 0;
        snap();
      }
    }

    function sampleCoverColor(url) {
      if (!url || url === samplingFor) return;
      samplingFor = url;
      try {
        if (!coverSampler) {
          coverSampler = new Image();
          try {
            coverSampler.crossOrigin = "anonymous";
          } catch (e0) {}
        }
        if (!coverCanvas) {
          coverCanvas = document.createElement("canvas");
        }
        var target = url;
        coverSampler.onload = function () {
          try {
            if (target !== currentArtwork) return; // stale: moved on already
            var w = 32;
            var h = 32;
            coverCanvas.width = w;
            coverCanvas.height = h;
            // willReadFrequently: this canvas exists only to be read back
            // (one getImageData per track), so keep it in CPU memory and
            // silence Chrome's multiple-readback performance hint.
            var ctx = coverCanvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(coverSampler, 0, 0, w, h);
            var data = ctx.getImageData(0, 0, w, h).data;
            var r = 0;
            var g = 0;
            var b = 0;
            var n = 0;
            var vr = 0;
            var vg = 0;
            var vb = 0;
            var vn = 0;
            var buckets = {};
            for (var i = 0; i < data.length; i += 4) {
              var pr = data[i];
              var pg = data[i + 1];
              var pb = data[i + 2];
              var pa = data[i + 3];
              if (pa < 128) continue;
              r += pr;
              g += pg;
              b += pb;
              n++;
              var mx = Math.max(pr, pg, pb);
              var mn = Math.min(pr, pg, pb);
              if (mx > 0 && (mx - mn) / mx > 0.25) {
                vr += pr;
                vg += pg;
                vb += pb;
                vn++;
                // Coarse 3-bits/channel bucket for the second-color hunt.
                // Near-blacks never enter: the accent must stay visible in
                // dark mode.
                if (mx >= 35) {
                  var key = (pr >> 5) * 64 + (pg >> 5) * 8 + (pb >> 5);
                  var bk = buckets[key];
                  if (!bk) {
                    bk = buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
                  }
                  bk.r += pr;
                  bk.g += pg;
                  bk.b += pb;
                  bk.n++;
                }
              }
            }
            if (!n) return;
            // Color 1 = the largest visible bucket: a REAL cover hue, never
            // a blend. (A global average of a multicolor cover is a muddy
            // mix of its hues — exactly what we don't want glowing.) Falls
            // back to the vivid-then-overall average only when nothing
            // vivid was sampled at all (monochrome covers), with a floor
            // blending toward cream so the glow is never black-on-black.
            var c1 = null;
            var c1n = 0;
            for (var kk in buckets) {
              if (!Object.prototype.hasOwnProperty.call(buckets, kk)) continue;
              if (buckets[kk].n > c1n) {
                c1n = buckets[kk].n;
                c1 = buckets[kk];
              }
            }
            if (c1 && c1n >= 4) {
              r = Math.round(c1.r / c1n);
              g = Math.round(c1.g / c1n);
              b = Math.round(c1.b / c1n);
            } else {
              // Prefer the vivid bucket when it holds a real share of
              // pixels (plain averages of artwork skew muddy gray);
              // otherwise fall back to the overall average.
              if (vn > n * 0.1) {
                r = vr;
                g = vg;
                b = vb;
                n = vn;
              }
              r = Math.round(r / n);
              g = Math.round(g / n);
              b = Math.round(b / n);
            }
            // Gentle stretch so dark covers still cast visible light, capped
            // so nothing blows out to neon.
            var peak = Math.max(r, g, b);
            if (peak > 0 && peak < 170) {
              var f = Math.min(170 / peak, 1.5);
              r = Math.min(255, Math.round(r * f));
              g = Math.min(255, Math.round(g * f));
              b = Math.min(255, Math.round(b * f));
            }
            if (Math.max(r, g, b) < 50) {
              r = Math.round((r + 244) / 2);
              g = Math.round((g + 241) / 2);
              b = Math.round((b + 234) / 2);
            }
            transitionCoverVar("--spm-halo-cover-rgb", "cover", [r, g, b]);
            // Second color for the accent wisp: the largest bucket far away
            // from color 1 (squared distance > 90^2). Anything else —
            // monochrome cover, nothing vivid, or a runner-up too dark for
            // dark mode — falls back to cream, which always reads.
            var accent = null;
            var best = 0;
            var bestDist = 0;
            var minCount = Math.max(6, vn * 0.05);
            for (var k in buckets) {
              if (!Object.prototype.hasOwnProperty.call(buckets, k)) continue;
              var c = buckets[k];
              if (c.n < minCount) continue;
              var cr = c.r / c.n;
              var cg = c.g / c.n;
              var cb = c.b / c.n;
              var dr = cr - r;
              var dg = cg - g;
              var db = cb - b;
              var dist = dr * dr + dg * dg + db * db;
              if (dist < 8100) continue; // too close to color 1
              if (c.n > best || (c.n === best && dist > bestDist)) {
                best = c.n;
                bestDist = dist;
                accent = [cr, cg, cb];
              }
            }
            var FALLBACK_ACCENT = [244, 241, 234];
            if (accent) {
              var ar = Math.round(accent[0]);
              var ag = Math.round(accent[1]);
              var ab = Math.round(accent[2]);
              var apeak = Math.max(ar, ag, ab);
              if (apeak >= 70) {
                if (apeak < 170) {
                  var af = Math.min(170 / apeak, 1.5);
                  ar = Math.min(255, Math.round(ar * af));
                  ag = Math.min(255, Math.round(ag * af));
                  ab = Math.min(255, Math.round(ab * af));
                }
                transitionCoverVar("--spm-halo-accent-rgb", "accent", [ar, ag, ab]);
              } else {
                transitionCoverVar("--spm-halo-accent-rgb", "accent", FALLBACK_ACCENT);
              }
            } else {
              transitionCoverVar("--spm-halo-accent-rgb", "accent", FALLBACK_ACCENT);
            }
          } catch (e) {
            /* tainted canvas / decode hiccup: keep the fallback color */
          }
        };
        coverSampler.onerror = function () {
          /* keep the fallback color */
        };
        coverSampler.src = target;
      } catch (e) {}
    }

    // --- unified card gestures: ONE owner for art swipe + collapse ---
    // cardEl sees every pointer that starts on the card (the artwork no
    // longer captures to itself — that second capture is what once stole
    // pointerup and glued the art to the cursor). First dominant axis
    // wins, tracked live from 12px so drags feel immediate:
    //   horizontal starting on art -> track swipe (previous / next),
    //   vertical, downward          -> collapse to the mini-player,
    //   anything else               -> ignored (a tap does nothing).
    // So swipe-down works from ANYWHERE, including the cover.
    var gesture = null; // { id, x0, y0, dx, dy, t0, mode, fromBlob }

    function cardHeight() {
      try {
        return cardEl.getBoundingClientRect().height || 400;
      } catch (e) {
        return 400;
      }
    }

    function glideCardHome() {
      // Removing the drag class re-arms the CSS transition; clearing the
      // pose on the next frame lets it glide home instead of jumping.
      cardEl.classList.remove("spm-card-drag");
      try {
        requestAnimationFrame(function () {
          cardEl.style.transform = "";
          cardEl.style.opacity = "";
        });
      } catch (e) {
        cardEl.style.transform = "";
        cardEl.style.opacity = "";
      }
    }

    function abortGesture() {
      if (!gesture) return;
      gesture = null;
      blob.classList.remove("spm-dragging");
      cardEl.classList.remove("spm-card-drag");
      // Never touch the artwork pose while a fly-out is in flight —
      // that pose belongs to commitSwipe until the new cover lands.
      if (!awaitingArt) blobRest();
      glideCardHome();
    }

    cardEl.addEventListener("pointerdown", function (e) {
      if (collapsed || gesture) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      // Controls, links, the seek bar — and the in-cover lyrics scroller —
      // keep their own gestures. (The lyrics layer owns vertical touch via
      // touch-action: pan-y; without this carve-out a read would also drag
      // the whole card. The expand button is covered by `button`.)
      if (t && t.closest && t.closest("button, input, select, textarea, a, [role='slider'], .spm-bar, .spm-coverlyr, .spm-volpop")) {
        return;
      }
      if (cardEl.scrollTop > 4) return; // scrolled: let it scroll
      gesture = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        dx: 0,
        dy: 0,
        t0: nowMs(),
        mode: null,
        fromBlob: !!(t && t.closest && t.closest(".spm-blob")),
      };
      // Single capture, mouse only (touch is implicitly captured to its
      // target and bubbles up through here either way).
      if (e.pointerType === "mouse") {
        try {
          cardEl.setPointerCapture && cardEl.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    });

    function gestureMove(e) {
      if (!gesture || (e && e.pointerId !== undefined && e.pointerId !== gesture.id)) return;
      if (cardEl.scrollTop > 4) {
        abortGesture();
        return;
      }
      var dx = e.clientX - gesture.x0;
      var dy = e.clientY - gesture.y0;
      if (!gesture.mode) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal: only artwork drags become track swipes — anywhere
          // else the gesture belongs to nobody (a tap still works).
          if (!gesture.fromBlob) {
            gesture = null;
            return;
          }
          // A previous swipe may still be waiting for its track (art flown
          // out, timer pending). Swallowing the new drag here is exactly
          // the old "swipe again, nothing happens" bug — cancel the stale
          // wait and let this drag take over; commitSwipe replaces it.
          if (awaitingArt) {
            if (awaitingArt.timer) {
              try {
                window.clearTimeout(awaitingArt.timer);
              } catch (err2) {}
            }
            awaitingArt = null;
          }
          gesture.mode = "art";
          blob.classList.add("spm-dragging"); // follow finger 1:1, no lag
        } else {
          if (dy < 0) {
            gesture = null; // upward on the full card: not a dismiss
            return;
          }
          gesture.mode = "card";
          cardEl.classList.add("spm-card-drag");
        }
      }
      gesture.dx = dx;
      gesture.dy = dy;
      if (gesture.mode === "art") {
        var w = blobWidth();
        var clamped = Math.max(-w * 0.6, Math.min(w * 0.6, dx));
        blobPose(clamped, Math.max(0.25, 1 - Math.abs(clamped) / (w * 1.2)));
      } else {
        var h = cardHeight();
        var cy = Math.max(0, Math.min(h * 1.2, dy));
        cardEl.style.transform = "translateY(" + Math.round(cy) + "px)";
        cardEl.style.opacity = String(Math.max(0.35, 1 - cy / (h * 1.4 || 1)));
      }
    }

    cardEl.addEventListener("pointermove", gestureMove);
    // Window fallback: moves/ups that miss the card still resolve the same
    // gesture, so a lost capture can never glue anything to the cursor.
    window.addEventListener("pointermove", gestureMove, true);

    function gestureEnd(e) {
      if (!gesture || (e && e.pointerId !== undefined && e.pointerId !== gesture.id)) return;
      var g = gesture;
      gesture = null;
      blob.classList.remove("spm-dragging");
      cardEl.classList.remove("spm-card-drag");
      if (!g.mode) return; // tap: art and card stay exactly as they were
      if (g.mode === "art") {
        var dt = Math.max(1, nowMs() - g.t0);
        var vel = Math.abs(g.dx) / dt; // px per ms
        var th = Math.max(48, blobWidth() * 0.28);
        var adx = Math.abs(g.dx);
        // Touch slop, same as the mini: a quick, short slide on the cover
        // is a sloppy tap — snap home instead of skipping tracks. Deliberate
        // drags (slow or long) and mouse flicks are unaffected.
        if (e && e.pointerType === "touch" && dt < 150 && adx < 110) {
          blobRest();
        } else if (adx > th || (adx > th * 0.45 && vel > 0.5)) {
          commitSwipe(g.dx < 0 ? -1 : 1);
        } else {
          blobRest(); // CSS transition springs it home
        }
        return;
      }
      var cdt = Math.max(1, nowMs() - g.t0);
      var cvel = g.dy / cdt; // px per ms, downward positive
      var ch = cardHeight();
      // Willing commit: modest drags count, flings count more. (A tall
      // threshold felt "stuck": normal drags kept snapping back.)
      if (g.dy > Math.max(56, ch * 0.12) || (g.dy > 32 && cvel > 0.45)) {
        finishDragCollapse();
      } else {
        glideCardHome();
      }
    }

    cardEl.addEventListener("pointerup", gestureEnd);
    window.addEventListener("pointerup", gestureEnd, true);
    cardEl.addEventListener("pointercancel", abortGesture);
    window.addEventListener("pointercancel", abortGesture, true);
    cardEl.addEventListener("lostpointercapture", function (e) {
      // Capture released without an up: never leave a live gesture behind.
      // Real releases already cleared it via the window pointerup above,
      // so this only fires for the orphaned case.
      if (gesture && e && e.pointerId === gesture.id) abortGesture();
    });

    mini.addEventListener("pointerdown", function (e) {
      if (!collapsed || miniDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      if (t && t.closest && (t.closest("button") || t.closest(".spm-mini-progress"))) return; // let buttons + hairline work
      miniDrag = {
        id: e.pointerId,
        y0: e.clientY,
        x0: e.clientX,
        dx: 0,
        dy: 0,
        t0: nowMs(),
        locked: null,
      };
      try {
        mini.setPointerCapture && mini.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    mini.addEventListener("pointermove", function (e) {
      if (!miniDrag || e.pointerId !== miniDrag.id) return;
      var dx = e.clientX - miniDrag.x0;
      var dy = e.clientY - miniDrag.y0;
      if (!miniDrag.locked) {
        if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return;
        // First dominant axis wins: up expands, sideways changes tracks.
        miniDrag.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        mini.classList.add("spm-mdrag");
      }
      if (miniDrag.locked === "v") {
        miniDrag.dy = dy;
        // Upward only, resisted — a tactile hint that it lifts away.
        var pull = Math.max(-88, Math.min(0, dy * 0.35));
        mini.style.transform = "translateY(" + Math.round(pull) + "px)";
      } else {
        miniDrag.dx = dx;
        var w = 200;
        try {
          w = mini.getBoundingClientRect().width || 200;
        } catch (err2) {}
        var slide = Math.max(-72, Math.min(72, dx));
        mini.style.transform = "translateX(" + Math.round(slide) + "px)";
        mini.style.opacity = String(Math.max(0.45, 1 - Math.abs(slide) / (w * 0.9)));
      }
    });

    function miniEnd(e) {
      if (!miniDrag || (e && e.pointerId !== miniDrag.id)) return;
      var m = miniDrag;
      miniDrag = null;
      mini.classList.remove("spm-mdrag");
      mini.style.transform = "";
      mini.style.opacity = "";
      // Tap: open INSTANTLY on pointerup instead of waiting for the
      // browser's synthesized click (which touch tap-delay / slop can
      // delay or swallow — the old "sometimes two taps"). The click
      // handler stays as a fallback; it early-returns once expanded.
      if (!m.locked) {
        expandAnimated(true);
        return;
      }
      var dt = Math.max(1, nowMs() - m.t0);
      if (m.locked === "v") {
        var vel = -m.dy / dt; // upward velocity, px per ms
        if (m.dy < -90 || (m.dy < -45 && vel > 0.45)) {
          miniSuppressClick = true; // a swipe release may still fire click
          expandAnimated(true);
        }
        // Otherwise the cleared transform glides home via CSS transition.
      } else {
        // Horizontal drags intentionally do nothing (swipe-to-skip was
        // removed: it kept eating taps via accidental commits). Followed
        // the finger live above; snap back here. Quick, short slides are
        // sloppy taps — open at once; longer drags swallow their release
        // click so letting go doesn't unexpectedly open.
        var hadx = Math.abs(m.dx);
        if (e && e.pointerType === "touch" && dt < 150 && hadx < 110) {
          miniSuppressClick = false;
          expandAnimated(true);
        } else {
          miniSuppressClick = true;
        }
        // Pose was already cleared above; CSS glides it home.
      }
    }

    mini.addEventListener("pointerup", miniEnd);
    mini.addEventListener("pointercancel", function () {
      miniDrag = null;
      mini.classList.remove("spm-mdrag");
      mini.style.transform = "";
      mini.style.opacity = "";
    });

    /* ---------- Custom Devices bottom sheet ----------
     *
     * Presentation layer only: every device fact (names, current device,
     * selection) comes from the adapter, which owns ALL Spotify DOM work.
     * The sheet is a sibling of the card and never touches player state, so
     * closing it leaves the Now Playing screen exactly where it was.
     *
     * The adapter opens Spotify's own picker behind the scenes to read the
     * device list and to click a row for a real transfer; that picker stays
     * hidden for as long as it is needed, so the user only ever sees this
     * sheet.
     */
    var sheetOpen = false;
    var sheetTimer = 0;
    var sheetNoticeTimer = 0;
    var sheetDevices = [];
    var sheetStatus = "loading"; // loading | ready | empty | error
    var sheetPendingKey = "";
    var sheetPendingSince = 0; // >0 once the adapter gave up waiting (still in flight)
    var sheetPendingName = "";
    // A transfer we already reported as failed ("Couldn't switch to X"): kept
    // so a later refresh that shows X as current can take the error back.
    // Slow handshakes routinely land after the verdict — without this the
    // failure sticks even though the music moved.
    var sheetFailedName = "";
    // If a transfer never shows up as current, stop pretending after this long.
    var SHEET_PENDING_MS = 15000;
    var sheetDrag = null;
    var sheetPull = null;
    var sheetLastLoad = 0;
    var sheetEmptyNote = false;
    var sheetListSig = "";

    // Fingerprint of the rendered list. A background refresh that finds the
    // same devices must not rebuild the DOM: that would drop focus and scroll
    // for no reason.
    function deviceListSig(list) {
      var parts = [];
      for (var i = 0; i < list.length; i++) {
        parts.push(
          [list[i].key, list[i].name, list[i].subtitle, list[i].isActive ? 1 : 0].join("~")
        );
      }
      return parts.join("|");
    }

    function deviceKeyOf(device) {
      if (!device) return "";
      return device.key || device.id || device.name || "";
    }

    function sheetHeight() {
      try {
        return sheetEl.getBoundingClientRect().height || 0;
      } catch (e) {
        return 0;
      }
    }

    function setSheetAnim(on) {
      sheetEl.classList.toggle("spm-dsheet-anim", !!on);
      backdropEl.classList.toggle("spm-dsheet-anim", !!on);
    }

    // offset: px the sheet sits below its resting position. dim: backdrop
    // opacity (undefined = back to the stylesheet value).
    function paintSheet(offset, dim) {
      sheetEl.style.transform = offset ? "translateY(" + Math.round(offset) + "px)" : "";
      backdropEl.style.opacity = dim === undefined ? "" : String(Math.max(0, Math.min(1, dim)));
    }

    function setSheetNotice(text) {
      if (!text) {
        if (!sheetNotice.hidden) sheetNotice.hidden = true;
        sheetNotice.textContent = "";
        return;
      }
      sheetNotice.textContent = text;
      sheetNotice.hidden = false;
      window.clearTimeout(sheetNoticeTimer);
      sheetNoticeTimer = window.setTimeout(function () {
        sheetNotice.hidden = true;
        sheetNotice.textContent = "";
      }, 4000);
    }

    function sheetRow(device) {
      var key = deviceKeyOf(device);
      var pending = !!sheetPendingKey && sheetPendingKey === key;
      var li = el("li", "spm-ditem", null);
      var btn = el("button", "spm-drow", null);
      btn.type = "button";
      var icon = el("span", "spm-dicon", null);
      if (device.icon) {
        try {
          icon.innerHTML = device.icon;
        } catch (e) {}
      }
      if (!icon.firstChild) icon.innerHTML = SVG.deviceRow;
      var text = el("span", "spm-dtext", null);
      var nameEl = el("span", "spm-dname", null);
      nameEl.textContent = device.name || "Unknown device";
      text.appendChild(nameEl);
      // Only real Spotify text is ever shown (a status line when Spotify has
      // one, otherwise nothing — device types are not invented).
      var subText = device.subtitle || device.type || "";
      if (subText) {
        var subEl = el("span", "spm-dsub", null);
        subEl.textContent = subText;
        text.appendChild(subEl);
      }
      var tail = el("span", "spm-dtail", null);
      if (pending) tail.innerHTML = SVG.spinner;
      else if (device.isActive) tail.innerHTML = SVG.check;
      btn.appendChild(icon);
      btn.appendChild(text);
      btn.appendChild(tail);
      btn.classList.toggle("spm-dactive", !!device.isActive);
      btn.classList.toggle("spm-dpending", pending);
      if (device.isActive) btn.setAttribute("aria-current", "true");
      btn.setAttribute(
        "aria-label",
        (device.isActive ? "Currently playing on " : "Connect to ") + (device.name || "device")
      );
      if (pending) {
        btn.setAttribute("aria-busy", "true");
        btn.disabled = true;
      }
      btn.addEventListener("click", function () {
        selectSheetDevice(device);
      });
      li.appendChild(btn);
      return li;
    }

    function sheetStatusBlock() {
      var wrap = el("div", "spm-dstatus", null);
      if (sheetStatus === "ready") {
        // Only ever shown under the current-device row, in Spotify's words.
        var none = el("p", "spm-dmsg", null);
        none.textContent = "No other devices found";
        wrap.appendChild(none);
        return wrap;
      }
      if (sheetStatus === "loading") {
        var spin = el("span", "spm-dspin", SVG.spinner);
        wrap.appendChild(spin);
        var loading = el("p", "spm-dmsg", null);
        loading.textContent = "Loading devices…";
        wrap.appendChild(loading);
        return wrap;
      }
      if (sheetStatus === "error") {
        var err = el("p", "spm-dmsg", null);
        err.textContent = "Couldn't load devices";
        wrap.appendChild(err);
        var retry = el("button", "spm-dghost spm-dretry", null);
        retry.type = "button";
        retry.textContent = "Try again";
        retry.addEventListener("click", function () {
          loadSheetDevices(true);
        });
        wrap.appendChild(retry);
        return wrap;
      }
      var empty = el("p", "spm-dmsg", null);
      empty.textContent = "No available devices";
      wrap.appendChild(empty);
      return wrap;
    }

    function renderSheet() {
      while (sheetList.firstChild) sheetList.removeChild(sheetList.firstChild);
      var showList = sheetStatus === "ready" && sheetDevices.length > 0;
      // The list can be one row (the current device) with nothing else around;
      // that reads as "only my device", so the empty line is shown beneath it.
      var showNote = showList && sheetEmptyNote;
      sheetList.hidden = !showList;
      // The status block is for everything that is NOT a plain list: with no
      // list at all (loading / error / no devices) it must be visible, and with
      // a list it only appears for the "no other devices" line underneath it.
      sheetState.hidden = showList && !showNote;
      if (showList) {
        for (var i = 0; i < sheetDevices.length; i++) {
          sheetList.appendChild(sheetRow(sheetDevices[i]));
        }
        if (!showNote) return;
      }
      while (sheetState.firstChild) sheetState.removeChild(sheetState.firstChild);
      sheetState.appendChild(sheetStatusBlock());
    }

    function applyDeviceList(list) {
      var info = null;
      try {
        info = spotify.getDevicesState ? spotify.getDevicesState() : null;
      } catch (e) {
        info = null;
      }
      var wasPending = sheetPendingKey;
      sheetDevices = list || [];
      // A pending transfer is settled by the list itself: the moment Spotify
      // shows that device as current the spinner and the soft notice go away;
      // if it never arrives, admit it instead of spinning forever.
      if (sheetPendingKey) {
        var pendingActive = false;
        for (var p = 0; p < sheetDevices.length; p++) {
          var pd = sheetDevices[p];
          if (!pd || !pd.isActive) continue;
          // The device we switched to comes back as Spotify's current-device
          // row, whose key is the picker header — not the id we clicked — so
          // the name is the reliable second signal.
          if (
            (sheetPendingKey && deviceKeyOf(pd) === sheetPendingKey) ||
            (sheetPendingName && pd.name === sheetPendingName)
          ) {
            pendingActive = true;
          }
        }
        if (pendingActive) {
          sheetPendingKey = "";
          sheetPendingSince = 0;
          sheetFailedName = "";
          setSheetNotice("");
        } else if (sheetPendingSince && nowMs() - sheetPendingSince > SHEET_PENDING_MS) {
          var stuck = sheetPendingName || "that device";
          sheetPendingKey = "";
          sheetPendingSince = 0;
          sheetFailedName = sheetPendingName || "";
          setSheetNotice("Couldn't switch to " + stuck + ".");
        }
      }
      // A failure we already reported is taken back the moment Spotify shows
      // that device as current: the transfer simply landed later than the
      // verdict (slow handshake), and the error must not outlive the success.
      if (sheetFailedName) {
        var failedActive = false;
        for (var f = 0; f < sheetDevices.length; f++) {
          var fd = sheetDevices[f];
          if (fd && fd.isActive && fd.name === sheetFailedName) {
            failedActive = true;
            break;
          }
        }
        if (failedActive) {
          sheetFailedName = "";
          setSheetNotice("");
        }
      }
      var others = 0;
      for (var i = 0; i < sheetDevices.length; i++) {
        if (!sheetDevices[i].isActive) others++;
      }
      var failed = !!(info && info.ok === false);
      var wasStatus = sheetStatus;
      var wasNote = sheetEmptyNote;
      sheetEmptyNote = !failed && !others && sheetDevices.length > 0;
      if (failed && sheetDevices.length) {
        // A stale list still beats an empty sheet, but say so plainly.
        setSheetNotice("Couldn't refresh devices.");
      } else if (sheetNotice.textContent === "Couldn't refresh devices.") {
        setSheetNotice("");
      }
      if (failed && !sheetDevices.length) sheetStatus = "error";
      else sheetStatus = sheetDevices.length ? "ready" : "empty";
      var sig = deviceListSig(sheetDevices);
      var changed = sig !== sheetListSig;
      sheetListSig = sig;
      if (
        changed ||
        wasStatus !== sheetStatus ||
        wasNote !== sheetEmptyNote ||
        wasPending !== sheetPendingKey
      ) {
        renderSheet();
      }
    }

    // Cached list paints instantly; the fresh read follows (opening the hidden
    // native picker once). No polling: this runs on open, on retry, and on a
    // throttled device-relevant snapshot beat while the sheet is visible.
    function loadSheetDevices(force) {
      if (sheetLoadTimer) {
        window.clearTimeout(sheetLoadTimer);
        sheetLoadTimer = 0;
      }
      sheetLastLoad = nowMs();
      var cached = [];
      try {
        cached = spotify.getCachedDevices ? spotify.getCachedDevices() : [];
      } catch (e) {
        cached = [];
      }
      // The cached paint is change-aware: an unchanged background refresh must
      // not rip rows out from under the user's finger (focus/scroll stay put).
      if (cached && cached.length) {
        applyDeviceList(cached);
      } else if (sheetStatus !== "loading") {
        sheetDevices = [];
        sheetStatus = "loading";
        sheetListSig = deviceListSig(sheetDevices);
        renderSheet();
      }
      var promise = null;
      try {
        promise = force && spotify.refreshDevices ? spotify.refreshDevices() : spotify.getDevices();
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        if (!cached.length) {
          sheetStatus = "error";
          renderSheet();
        }
        return;
      }
      promise
        .then(function (list) {
          if (!sheetOpen) return;
          applyDeviceList(list);
        })
        .catch(function () {
          if (!sheetOpen) return;
          if (!sheetDevices.length) {
            sheetStatus = "error";
            renderSheet();
          }
        });
    }

    function selectSheetDevice(device) {
      if (!device || sheetPendingKey) return;
      sheetPendingKey = deviceKeyOf(device);
      sheetPendingSince = 0; // 0 = the adapter is still working on it
      sheetPendingName = device.name || "that device";
      sheetFailedName = ""; // a new attempt supersedes any old failure
      renderSheet();
      var promise = null;
      try {
        promise = spotify.selectDevice(device);
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        sheetPendingKey = "";
        renderSheet();
        setSheetNotice("Couldn't switch devices right now.");
        return;
      }
      promise
        .then(function (res) {
          if (!sheetOpen) {
            sheetPendingKey = "";
            sheetPendingSince = 0;
            return;
          }
          var hadPending = !!sheetPendingKey;
          var list = res && res.devices && res.devices.length ? res.devices : null;
          if (res && res.ok) {
            sheetPendingKey = "";
            sheetPendingSince = 0;
            sheetFailedName = "";
            setSheetNotice("");
          } else if (res && res.reason === "unconfirmed") {
            // Spotify is still handing playback over (a sleeping speaker can
            // take seconds). Keep the row pending and say so plainly — the
            // list itself settles it, so a slow-but-successful switch is never
            // reported as a failure.
            sheetPendingSince = nowMs();
            setSheetNotice("Still connecting to " + (device.name || "that device") + "…");
          } else {
            sheetPendingKey = "";
            sheetPendingSince = 0;
            sheetFailedName = device.name || "";
            setSheetNotice("Couldn't switch to " + (device.name || "that device") + ".");
          }
          if (list) applyDeviceList(list);
          else renderSheet();
          // A definitive rejection ends the pending state right here (the list
          // reconciliation only watches for a device *becoming* current), so
          // repaint the row out of its spinner explicitly.
          if (hadPending && !sheetPendingKey) renderSheet();
        })
        .catch(function () {
          sheetPendingKey = "";
          sheetPendingSince = 0;
          sheetFailedName = device.name || "";
          if (!sheetOpen) return;
          renderSheet();
          setSheetNotice("Couldn't switch to " + (device.name || "that device") + ".");
        });
    }

    function beginSheet() {
      if (sheetOpen) return;
      try {
        if (typeof closePSheet === "function") closePSheet();
      } catch (e) {}
      sheetOpen = true;
      root.classList.add("spm-dsheet-open");
      sheetEl.hidden = false;
      backdropEl.hidden = false;
      try {
        cardEl.setAttribute("aria-hidden", "true");
        mini.setAttribute("aria-hidden", "true");
      } catch (e) {}
      sheetDevices = [];
      sheetStatus = "loading";
      sheetPendingKey = "";
      sheetPendingSince = 0;
      sheetPendingName = "";
      sheetFailedName = "";
      sheetEmptyNote = false;
      sheetListSig = "";
      setSheetNotice("");
      renderSheet();
      // Read AFTER the slide lands: opening Spotify's own panel to read it is
      // main-thread work, and doing it mid-animation made the open stutter. The
      // cached list painted above is already on screen in the meantime.
      // Claim the load slot too, or the first snapshot render sees a stale
      // `sheetLastLoad` and fires the read mid-slide anyway.
      sheetLastLoad = nowMs();
      if (sheetLoadTimer) window.clearTimeout(sheetLoadTimer);
      sheetLoadTimer = window.setTimeout(function () {
        sheetLoadTimer = 0;
        if (sheetOpen) loadSheetDevices(false);
      }, 260);
      // The card may be mid-gesture when the sheet opens: drop it so the two
      // can never fight over the same pointer.
      try {
        abortGesture();
      } catch (e) {}
    }

    function finishSheetOpen() {
      try {
        sheetEl.focus({ preventScroll: true });
      } catch (e) {}
    }

    function glideSheetHome() {
      if (prefersReducedMotion()) {
        setSheetAnim(false);
        paintSheet(0);
        return;
      }
      setSheetAnim(true);
      var raf = window.requestAnimationFrame || function (fn) {
        return window.setTimeout(fn, 16);
      };
      raf(function () {
        paintSheet(0);
      });
    }

    function openSheet(fromPointer) {
      if (sheetOpen) return;
      beginSheet();
      // Arm the ghost guard ONLY for the pointer path (same contract as the
      // mini-expand guard): a click-open has no trailing click to swallow, and
      // arming would eat the next deliberate tap (e.g. backdrop-close).
      if (fromPointer) armSheetGhost();
      if (prefersReducedMotion()) {
        setSheetAnim(false);
        paintSheet(0);
        finishSheetOpen();
        return;
      }
      setSheetAnim(false);
      paintSheet(sheetHeight() || 320, 0);
      void sheetEl.offsetHeight; // land the start pose before animating
      glideSheetHome();
      window.clearTimeout(sheetTimer);
      sheetTimer = window.setTimeout(finishSheetOpen, 300);
    }

    function hideSheetNow() {
      sheetEl.hidden = true;
      backdropEl.hidden = true;
      setSheetAnim(false);
      paintSheet(0);
      try {
        devicesBtn.focus({ preventScroll: true });
      } catch (e) {}
      // The environment was frozen while the sheet was up (see
      // applyEnvironment) — re-read it now that the glass is ours again, from
      // a fresh sample so a stale one can't masquerade as "agreed".
      envSample = null;
      scheduleEnvironment();
    }

    function closeSheet() {
      if (!sheetOpen) return;
      sheetOpen = false;
      sheetDrag = null;
      sheetPull = null;
      root.classList.remove("spm-dsheet-open");
      try {
        cardEl.removeAttribute("aria-hidden");
        mini.removeAttribute("aria-hidden");
      } catch (e) {}
      // If Spotify's picker is somehow still up (e.g. a read was interrupted),
      // take it down so a native popup never lingers behind our UI.
      try {
        if (spotify.isDevicePickerOpen && spotify.isDevicePickerOpen() && spotify.closeDevices) {
          spotify.closeDevices();
        }
      } catch (e) {}
      if (prefersReducedMotion()) {
        hideSheetNow();
        return;
      }
      setSheetAnim(true);
      paintSheet(sheetHeight() || 320, 0);
      window.clearTimeout(sheetTimer);
      sheetTimer = window.setTimeout(hideSheetNow, 280);
    }

    // --- drag: the sheet follows the finger, then commits or snaps back ---
    function sheetDragStart(e) {
      if (!sheetOpen || sheetDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Never hijack a press that started on a control. preventDefault() below
      // suppresses the compatibility mouse events — including the `click` — so
      // dragging from the header would leave the close button inert.
      var tgt = e.target;
      if (tgt && tgt.closest && tgt.closest("button, a, input, select, textarea")) return;
      sheetDrag = {
        id: e.pointerId,
        y0: e.clientY,
        dy: 0,
        t0: nowMs(),
        lastY: e.clientY,
        lastT: nowMs(),
        vel: 0,
      };
      setSheetAnim(false); // direct manipulation: no transition while dragging
      try {
        sheetEl.setPointerCapture && sheetEl.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.cancelable) e.preventDefault();
    }

    function sheetDragMove(e) {
      if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
      var dy = e.clientY - sheetDrag.y0;
      var t = nowMs();
      // Live (per-move) velocity, so a drag that stops before release is not
      // mistaken for a flick.
      sheetDrag.vel = (e.clientY - sheetDrag.lastY) / Math.max(1, t - sheetDrag.lastT);
      sheetDrag.dy = dy;
      sheetDrag.lastY = e.clientY;
      sheetDrag.lastT = t;
      var h = Math.max(160, sheetHeight());
      // Downward tracks the finger 1:1; upward gets a short rubber band (the
      // sheet is already fully open).
      var offset = dy > 0 ? Math.min(dy, h) : Math.max(dy * 0.22, -36);
      paintSheet(offset, Math.max(0.15, 1 - Math.max(0, offset) / h));
      if (e.cancelable) e.preventDefault();
    }

    function sheetDragEnd(e) {
      if (!sheetDrag) return;
      if (e && e.pointerId !== undefined && e.pointerId !== sheetDrag.id) return;
      var d = sheetDrag;
      sheetDrag = null;
      var h = Math.max(160, sheetHeight());
      // Only a flick that was still moving when released counts as velocity.
      var stalled = nowMs() - d.lastT > 140;
      var vel = stalled ? 0 : d.vel; // px per ms, downward positive
      if (d.dy > Math.max(64, h * 0.22) || (d.dy > 36 && vel > 0.6)) {
        closeSheet();
        return;
      }
      glideSheetHome();
    }

    // --- swipe up from the bottom edge of the player to open the sheet ---
    function pullStart(e) {
      if (sheetOpen || sheetPull || collapsed) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      if (
        t &&
        t.closest &&
        t.closest("button, a, input, select, textarea, [role='slider'], .spm-bar, .spm-vol-bar, .spm-blob")
      ) {
        return;
      }
      var vh = window.innerHeight || 0;
      if (vh && e.clientY < vh - 64) return; // only from the bottom edge strip
      sheetPull = {
        id: e.pointerId,
        y0: e.clientY,
        dy: 0,
        t0: nowMs(),
        armed: false,
      };
    }

    function pullMove(e) {
      if (!sheetPull || e.pointerId !== sheetPull.id) return;
      var dy = e.clientY - sheetPull.y0;
      sheetPull.dy = dy;
      if (!sheetPull.armed) {
        if (dy > 14) {
          sheetPull = null; // downward: not a pull, let the card have it
          return;
        }
        if (dy > -16) return;
        sheetPull.armed = true;
        beginSheet();
        setSheetAnim(false);
      }
      var h = Math.max(180, sheetHeight());
      var offset = Math.max(0, Math.min(h, h + dy));
      paintSheet(offset, 1 - offset / h);
      if (e.cancelable) e.preventDefault();
    }

    function pullEnd(e) {
      if (!sheetPull) return;
      if (e && e.pointerId !== undefined && e.pointerId !== sheetPull.id) return;
      var p = sheetPull;
      sheetPull = null;
      if (!p.armed) return;
      var dt = Math.max(1, nowMs() - p.t0);
      var up = -p.dy;
      var vel = up / dt;
      if (up > 64 || (up > 28 && vel > 0.45)) {
        glideSheetHome();
        window.clearTimeout(sheetTimer);
        sheetTimer = window.setTimeout(finishSheetOpen, 300);
      } else {
        closeSheet();
      }
    }

    // Open on the press-release, not on the browser's synthesised click: on
    // touch a tap only reaches `click` when nothing ate it first (touch-action,
    // scroll slop, a cancelled pointer), which is why tapping Devices felt
    // random while holding it worked. The click listener stays for
    // keyboard/assistive input; `openSheet()` is idempotent, so a tap that
    // delivers both never double-toggles.
    //
    // A release that TRAVELLED is not a tap — it is the card scrolling or a
    // drag — so it must not open the sheet. Touch is implicitly captured to the
    // original target, so pointerup fires here even when the finger has moved
    // off the button entirely.
    var devicesPress = null;
    var devicesRejectClick = false;
    devicesBtn.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      devicesPress = { id: e.pointerId, x: e.clientX, y: e.clientY };
      devicesRejectClick = false;
      pressFeedback(devicesBtn);
    });
    devicesBtn.addEventListener("pointerup", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var p = devicesPress;
      devicesPress = null;
      if (p && p.id === e.pointerId) {
        if (Math.abs(e.clientX - p.x) > 12 || Math.abs(e.clientY - p.y) > 12) {
          // Travelled: a scroll or drag, not a tap. The synthesized click must
          // not undo that decision, so flag it.
          devicesRejectClick = true;
          return;
        }
      }
      openSheet(true);
    });
    devicesBtn.addEventListener("pointercancel", function () {
      devicesPress = null;
      devicesRejectClick = true;
    });
    devicesBtn.addEventListener("click", function () {
      if (devicesRejectClick) {
        devicesRejectClick = false;
        return;
      }
      openSheet(false);
    });
    backdropEl.addEventListener("click", function () {
      closeSheet();
    });
    grabEl.addEventListener("pointerdown", sheetDragStart);
    sheetHead.addEventListener("pointerdown", sheetDragStart);
    cardEl.addEventListener("pointerdown", pullStart);
    window.addEventListener("pointermove", pullMove, true);
    window.addEventListener("pointerup", pullEnd, true);
    window.addEventListener("pointercancel", function (e) {
      if (sheetPull && e && e.pointerId === sheetPull.id) sheetPull = null;
    }, true);
    window.addEventListener("pointermove", sheetDragMove, true);
    window.addEventListener("pointerup", sheetDragEnd, true);
    window.addEventListener("pointercancel", function () {
      if (sheetDrag) glideSheetHome();
      sheetDrag = null;
    }, true);
    document.addEventListener("keydown", function (e) {
      // Adapter-synthesized menu dismissals (marked) are not the user.
      if (e && e.__spmSynthetic) return;
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (lsheetOpen || lOpening) {
        e.preventDefault();
        closeLSheet();
        return;
      }
      if (psheetOpen) {
        e.preventDefault();
        closePSheet();
        return;
      }
      if (volPopOpen) {
        e.preventDefault();
        setVolPop(false);
        return;
      }
      if (!sheetOpen) return;
      e.preventDefault();
      closeSheet();
    });

    /* ---------- Custom Save / Add-to-Playlist bottom sheet ----------
     *
     * Presentation layer only: every playlist fact (names, artwork,
     * membership) comes from the adapter, which owns ALL Spotify DOM work
     * (curation sheet first, tippy menus + Your Library as fallback). The
     * sheet never queries Spotify's DOM.
     *
     * Spotify stays the source of truth, and the sheet mimics Spotify's own
     * draft semantics exactly: row taps only STAGE checks locally; Done
     * diffs the draft against the server state loaded at open and applies
     * every change through Spotify's real rows in one commit; Cancel (or
     * backdrop / swipe / Escape) discards the draft untouched.
     *
     * Opens from the hearts (saved tracks only — unsaved hearts Like
     * instead, mirroring Spotify's button order).
     *
     * Refresh is event-driven (open, track change, like change, user action)
     * — deliberately NO timer: opening Spotify's UI steals focus, so
     * background polling would fight the user.
     */
    var psheetOpen = false;
    var psheetTimer = 0;
    var psheetNoticeTimer = 0;
    var psheetLoadTimer = 0;
    var psheetList = [];
    var psheetStatus = "loading"; // loading | ready | empty | error
    var psheetTrackKey = "";
    var psheetSearch = "";
    var psheetListSig = "";
    var psheetDrag = null;
    var psheetLastLoad = 0;
    // Draft staging (mirrors Spotify's Done/Cancel): initial = server truth
    // at open, draft = staged checks by playlist key, dirty = user staged
    // anything, saving = commit in flight.
    var psheetInitial = [];
    var psheetDraft = {};
    var psheetDirty = false;
    var psheetSaving = false;

    function ptrackKeyOf(snap) {
      // Membership is per-TRACK, so the key is the track alone. Including the artist
      // made a late-loading artist line look like a track change: Spotify
      // frequently renders the title before the artist, and each such arrival
      // blanked the open sheet to "Loading…" and threw the user's staged draft
      // away. On a phone that happens often enough to read as random.
      if (!snap) return "";
      return String(snap.track == null ? "" : snap.track).trim();
    }

    function pkeyOf(p) {
      if (!p) return "";
      if (p.id) return "id:" + p.id;
      return "name:" + String(p.name || "").toLowerCase();
    }

    function plistSig(list) {
      var parts = [];
      for (var i = 0; i < list.length; i++) {
        parts.push(
          [pkeyOf(list[i]), list[i].name, list[i].containsTrack ? 1 : 0].join("~")
        );
      }
      return parts.join("|");
    }

    function psheetHeight() {
      try {
        return psheetEl.getBoundingClientRect().height || 0;
      } catch (e) {
        return 0;
      }
    }

    function setPSheetAnim(on) {
      psheetEl.classList.toggle("spm-psheet-anim", !!on);
      pbackdropEl.classList.toggle("spm-psheet-anim", !!on);
    }

    function paintPSheet(offset, dim) {
      psheetEl.style.transform = offset ? "translateY(" + Math.round(offset) + "px)" : "";
      pbackdropEl.style.opacity = dim === undefined ? "" : String(Math.max(0, Math.min(1, dim)));
    }

    function setPSheetNotice(text) {
      if (!text) {
        if (!psheetNotice.hidden) psheetNotice.hidden = true;
        psheetNotice.textContent = "";
        return;
      }
      psheetNotice.textContent = text;
      psheetNotice.hidden = false;
      window.clearTimeout(psheetNoticeTimer);
      psheetNoticeTimer = window.setTimeout(function () {
        psheetNotice.hidden = true;
        psheetNotice.textContent = "";
      }, 4000);
    }

    function psheetFiltered() {
      var s = (psheetSearch || "").toLowerCase().trim();
      if (!s) return psheetList;
      var out = [];
      for (var i = 0; i < psheetList.length; i++) {
        if (String(psheetList[i].name || "").toLowerCase().indexOf(s) !== -1) out.push(psheetList[i]);
      }
      return out;
    }

    // Draft helpers: staged checks by playlist key. Absent key = server
    // value (nothing staged for that row yet).
    function pdraftOf(p) {
      var key = pkeyOf(p);
      if (Object.prototype.hasOwnProperty.call(psheetDraft, key)) {
        return !!psheetDraft[key];
      }
      return !!p.containsTrack;
    }

    function paintPsheetFoot() {
      try {
        psheetDoneBtn.disabled = !!psheetSaving;
        psheetCancelBtn.disabled = !!psheetSaving;
        psheetDoneBtn.classList.toggle("spm-psaving", !!psheetSaving);
        psheetDoneBtn.innerHTML = psheetSaving ? SVG.spinner : "Done";
      } catch (e) {}
    }

    function paintPRow(btn, p, staged) {
      // In-place staged-state paint for a single row: full renderPSheet()
      // rebuilds the whole <ul>, which collapses the scroll container and
      // jumps the list back to the top (plus drops keyboard focus). Staging a
      // check must never rebuild — only fresh list/status arrivals do.
      btn.classList.toggle("spm-pactive", !!staged);
      btn.setAttribute("aria-pressed", staged ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        (p.isLikedSongs
          ? (staged ? "Remove from Liked Songs: " : "Add to Liked Songs: ")
          : (staged ? "Remove from " : "Add to ")) + (p.name || "playlist")
      );
      try {
        var tail = btn.querySelector ? btn.querySelector(".spm-ptail") : null;
        if (tail) tail.innerHTML = staged ? SVG.check : "";
      } catch (e) {}
    }

    function psheetRow(p) {
      var key = pkeyOf(p);
      var staged = pdraftOf(p);
      var li = el("li", "spm-pitem", null);
      if (p.isLikedSongs) li.classList.add("spm-liked-row");
      var btn = el("button", "spm-prow", null);
      btn.type = "button";
      var icon = el("span", "spm-picon", null);
      var artUrl = p.artwork || "";
      if (p.isLikedSongs) {
        icon.innerHTML = SVG.heartFill;
        icon.classList.add("spm-liked-icon");
      } else if (artUrl) {
        var img = document.createElement("img");
        img.className = "spm-part";
        img.alt = "";
        img.draggable = false;
        img.src = artUrl;
        img.addEventListener("error", function () {
          try {
            icon.innerHTML = SVG.playlistRow;
          } catch (e) {}
        });
        icon.appendChild(img);
      } else {
        icon.innerHTML = SVG.playlistRow;
      }
      var text = el("span", "spm-ptext", null);
      var nameEl = el("span", "spm-pname", null);
      nameEl.textContent = p.name || "Unknown playlist";
      text.appendChild(nameEl);
      var subEl = el("span", "spm-psub", null);
      subEl.textContent = p.isLikedSongs ? "Liked Songs" : (p.subtitle || "Playlist");
      text.appendChild(subEl);
      var tail = el("span", "spm-ptail", null);
      if (staged) tail.innerHTML = SVG.check;
      btn.appendChild(icon);
      btn.appendChild(text);
      btn.appendChild(tail);
      btn.classList.toggle("spm-pactive", !!staged);
      if (staged) btn.setAttribute("aria-pressed", "true");
      else btn.setAttribute("aria-pressed", "false");
      btn.setAttribute(
        "aria-label",
        (p.isLikedSongs
          ? (staged ? "Remove from Liked Songs: " : "Add to Liked Songs: ")
          : (staged ? "Remove from " : "Add to ")) + (p.name || "playlist")
      );
      if (psheetSaving) btn.disabled = true;
      btn.addEventListener("click", function () {
        if (psheetSaving) return;
        var next = !pdraftOf(p);
        psheetDraft[key] = next;
        psheetDirty = true;
        // Targeted paint (no rebuild: rebuilding scrolls the list to the top).
        // Keep the list signature in sync so a later identical render still
        // short-circuits instead of rebuilding under the finger.
        paintPRow(btn, p, next);
        psheetListSig = plistSig(psheetFiltered()) + "|" + psheetStatus + "|" + pdraftSig();
      });
      li.appendChild(btn);
      return li;
    }

    function psheetStatusBlock() {
      var wrap = el("div", "spm-pstatus", null);
      if (psheetStatus === "loading") {
        var spin = el("span", "spm-pspin", SVG.spinner);
        wrap.appendChild(spin);
        var loading = el("p", "spm-pmsg", null);
        loading.textContent = "Loading playlists...";
        wrap.appendChild(loading);
        return wrap;
      }
      if (psheetStatus === "error") {
        var err = el("p", "spm-pmsg", null);
        err.textContent = "Couldn't load playlists";
        wrap.appendChild(err);
        var retry = el("button", "spm-pretry", null);
        retry.type = "button";
        retry.textContent = "Try again";
        retry.addEventListener("click", function () {
          loadPSheetPlaylists(true);
        });
        wrap.appendChild(retry);
        return wrap;
      }
      var msg = el("p", "spm-pmsg", null);
      var s = (psheetSearch || "").trim();
      if (psheetStatus === "empty") {
        msg.textContent = "No playlists found.";
      } else if (s) {
        msg.textContent = 'No playlists match "' + s + '".';
      } else {
        msg.textContent = "No playlists found.";
      }
      wrap.appendChild(msg);
      return wrap;
    }

    function renderPSheet() {
      // Rebuilding the <ul> collapses the scroll container for a frame, which
      // resets .spm-pbody to the top and drops keyboard focus. A fresh-data
      // arrival while the user is staged/scrolled mid-list must not yank them
      // (staging taps avoid this entirely via paintPRow, but truth reloads
      // still rebuild). Preserve both across the rebuild.
      var savedTop = 0;
      var savedFocusIndex = -1;
      try {
        savedTop = psheetBody ? psheetBody.scrollTop || 0 : 0;
      } catch (e) {}
      try {
        var ae = document.activeElement;
        if (ae && psheetListEl && psheetListEl.contains(ae)) {
          var btns = psheetListEl.querySelectorAll(".spm-prow");
          for (var fi = 0; fi < btns.length; fi++) {
            if (btns[fi] === ae) {
              savedFocusIndex = fi;
              break;
            }
          }
        }
      } catch (e2) {}
      // Restores scroll + focus saved at the top of renderPSheet.
      function restorePScroll() {
        try {
          if (psheetBody) psheetBody.scrollTop = savedTop;
        } catch (e3) {}
        if (savedFocusIndex >= 0) {
          try {
            var fresh = psheetListEl.querySelectorAll(".spm-prow");
            var tgt = fresh[Math.min(savedFocusIndex, fresh.length - 1)];
            if (tgt && tgt.focus) tgt.focus({ preventScroll: true });
          } catch (e4) {}
        }
      }
      while (psheetListEl.firstChild) psheetListEl.removeChild(psheetListEl.firstChild);
      var rows = psheetFiltered();
      var showList = psheetStatus === "ready" && rows.length > 0;
      psheetListEl.hidden = !showList;
      // Liked-only list reads as "only Liked": show Spotify's empty line
      // beneath it (same pattern as Devices' "No other devices found").
      var s = (psheetSearch || "").trim();
      var likedOnly = showList && !s && rows.length === 1 && rows[0].isLikedSongs;
      psheetState.hidden = showList && !likedOnly ? true : false;
      if (showList) {
        for (var i = 0; i < rows.length; i++) {
          psheetListEl.appendChild(psheetRow(rows[i]));
        }
        if (!likedOnly) {
          restorePScroll();
          return;
        }
      }
      while (psheetState.firstChild) psheetState.removeChild(psheetState.firstChild);
      if (likedOnly) {
        var wrap = el("div", "spm-pstatus", null);
        var none = el("p", "spm-pmsg", null);
        none.textContent = "No other playlists found";
        wrap.appendChild(none);
        psheetState.appendChild(wrap);
        restorePScroll();
        return;
      }
      psheetState.appendChild(psheetStatusBlock());
      restorePScroll();
    }

    function applyPsheetList(list, statusHint, resetDraft) {
      psheetList = list || [];
      if (statusHint) {
        psheetStatus = statusHint;
      } else if (!psheetList.length) {
        psheetStatus = "empty";
      } else {
        psheetStatus = "ready";
      }
      // Fresh server truth normally resets the draft (open, retry, track
      // change). The exception matters: the initial load is DEFERRED so the
      // slide never stutters, so a fast tap can land before it resolves —
      // resetting there silently threw the tap away. When the sheet is already
      // open and dirty, rebase the draft onto the new truth instead: keep
      // every staged intent, drop keys the new list no longer has.
      var keepDraft = !resetDraft && psheetOpen && psheetDirty;
      psheetInitial = psheetList;
      if (keepDraft) {
        var kept = {};
        for (var i = 0; i < psheetList.length; i++) {
          var key = pkeyOf(psheetList[i]);
          if (Object.prototype.hasOwnProperty.call(psheetDraft, key)) kept[key] = psheetDraft[key];
        }
        psheetDraft = kept;
      } else {
        psheetDraft = {};
        psheetDirty = false;
      }
      psheetSaving = false;
      paintPsheetFoot();
      var sig = plistSig(psheetFiltered()) + "|" + psheetStatus + "|" + pdraftSig();
      if (sig !== psheetListSig) {
        psheetListSig = sig;
        renderPSheet();
      }
    }

    function pdraftSig() {
      var keys = [];
      for (var k in psheetDraft) {
        if (Object.prototype.hasOwnProperty.call(psheetDraft, k)) {
          keys.push(k + "=" + (psheetDraft[k] ? 1 : 0));
        }
      }
      keys.sort();
      return keys.join(",");
    }

    // Draft changes vs the server truth loaded at open.
    function pdraftChanges() {
      var out = [];
      for (var i = 0; i < psheetList.length; i++) {
        var p = psheetList[i];
        var key = pkeyOf(p);
        if (!Object.prototype.hasOwnProperty.call(psheetDraft, key)) continue;
        var want = !!psheetDraft[key];
        if (want === !!p.containsTrack) continue;
        out.push({
          uri: p.uri || "",
          id: p.id || "",
          name: p.name || "",
          isLikedSongs: !!p.isLikedSongs,
          want: want,
        });
      }
      return out;
    }

    // Returns the cached list ONLY when it is trustworthy enough to paint before
    // the fresh read lands: it must come from Spotify's own sheet (never the
    // Your Library fallback) and the sweep must have seen every row. A cache
    // from the wrong source is exactly what produced "two different lists,
    // randomly": we would paint it instantly and then visibly flip to the real
    // one a beat later.
    function trustworthyCachedPlaylists() {
      var out = [];
      try {
        var st = spotify.getPlaylistsState ? spotify.getPlaylistsState() : null;
        if (!st || !st.viaCuration || st.complete === false) return out;
        out = (st.list || []).slice();
      } catch (e) {
        out = [];
      }
      return out;
    }

    // Paint what we already know (only if trustworthy), then ALWAYS follow with
    // one FRESH read. The read used to be `getPlaylists()`, which happily
    // returned the very cache we had just painted — so whichever source won last
    // stayed on screen for its whole TTL and a single failed read pinned the
    // wrong list for seconds. Always re-read, and let the cache be a paint-only
    // optimisation.
    function loadPSheetPlaylists(force) {
      if (psheetLoadTimer) {
        window.clearTimeout(psheetLoadTimer);
        psheetLoadTimer = 0;
      }
      psheetLastLoad = nowMs();
      var cached = trustworthyCachedPlaylists();
      if (cached.length && !force) {
        applyPsheetList(cached);
      } else if (psheetStatus !== "loading" || force) {
        if (!cached.length) {
          psheetStatus = "loading";
          renderPSheet();
        }
      }
      var promise = null;
      try {
        // ALWAYS fresh. Caching here is a paint optimisation only; letting the
        // read hit the cache too is what made the previous read's source stick
        // for a whole TTL.
        promise = spotify.refreshPlaylists ? spotify.refreshPlaylists() : spotify.getPlaylists();
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        if (!cached.length) {
          psheetStatus = "error";
          renderPSheet();
        }
        return;
      }
      promise
        .then(function (list) {
          if (!psheetOpen) return;
          // force=true means "start over": retry after a failed save, or a
          // track change under the open sheet. Both want the draft dropped.
          if (list && list.length) {
            applyPsheetList(list, null, !!force);
          } else if (!psheetList.length) {
            var st = null;
            try {
              st = spotify.getPlaylistsState ? spotify.getPlaylistsState() : null;
            } catch (e) {}
            if (st && st.ok === false) {
              psheetStatus = "error";
              renderPSheet();
            } else {
              applyPsheetList([], "empty", !!force);
            }
          }
        })
        .catch(function () {
          if (!psheetOpen) return;
          if (!psheetList.length) {
            psheetStatus = "error";
            renderPSheet();
          } else {
            setPSheetNotice("Couldn't refresh playlists.");
          }
        });
    }

    // Done: diff the draft against server truth and commit every change
    // through Spotify's real rows in one batch (mirrors their Done). Cancel
    // just closes — the draft evaporates.
    function savePsheetDraft() {
      if (!psheetOpen || psheetSaving) return;
      var changes = pdraftChanges();
      if (!changes.length) {
        closePSheet();
        return;
      }
      if (!spotify.savePlaylistDraft) {
        setPSheetNotice("Couldn't update playlists right now.");
        return;
      }
      psheetSaving = true;
      paintPsheetFoot();
      renderPSheet();
      var promise = null;
      try {
        promise = spotify.savePlaylistDraft(changes);
      } catch (e) {
        promise = null;
      }
      if (!promise || !promise.then) {
        psheetSaving = false;
        paintPsheetFoot();
        renderPSheet();
        setPSheetNotice("Couldn't update playlists. Try again.");
        return;
      }
      promise
        .then(function (res) {
          if (!psheetOpen) {
            psheetSaving = false;
            return;
          }
          if (res && res.ok) {
            psheetSaving = false;
            if (res.list) applyPsheetList(res.list);
            closePSheet();
            return;
          }
          // Partial/total failure: stay open on the true state so the user
          // can retry; the heart follows via snapshot either way.
          psheetSaving = false;
          var names = res && res.failed && res.failed.length ? res.failed.join(", ") : "";
          setPSheetNotice(
            names ? "Couldn't update " + names + "." : "Couldn't update playlists. Try again."
          );
          loadPSheetPlaylists(true);
        })
        .catch(function () {
          if (!psheetOpen) {
            psheetSaving = false;
            return;
          }
          psheetSaving = false;
          paintPsheetFoot();
          renderPSheet();
          setPSheetNotice("Couldn't update playlists. Try again.");
        });
    }

    function syncPsheetWithSnap(snap) {
      if (!psheetOpen || !snap) return;
      var key = ptrackKeyOf(snap);
      var hasTrack = !!String(snap.track == null ? "" : snap.track).trim();
      // A snapshot with no track/artist is a transient glitch — Spotify
      // mid-re-render of its own player bar — NOT a track change. Reacting to
      // one wiped the list back to "Loading…" and threw the user's staged
      // draft away, and it fires often enough on a phone to read as random.
      if (!hasTrack) return;
      // Adopt the first real key silently (we may have opened before the first
      // snapshot landed), so the next identical one is not a "change".
      if (!psheetTrackKey) {
        psheetTrackKey = key;
        return;
      }
      // Track changed under the open sheet: never show Track A's membership
      // for Track B — reload fresh for the new track (draft is discarded,
      // keeps the search text).
      if (key !== psheetTrackKey) {
        psheetTrackKey = key;
        psheetDraft = {};
        psheetDirty = false;
        // Keep the rows on screen rather than blanking to a spinner: only the
        // membership values are stale, and an empty flash reads as breakage.
        if (!psheetList.length) {
          psheetStatus = "loading";
          renderPSheet();
        }
        loadPSheetPlaylists(true);
        return;
      }
      // Like flipped externally (heart or Spotify itself): mirror it in the
      // server row; the draft follows only while pristine, so staged checks
      // are never clobbered mid-edit.
      var changed = false;
      for (var i = 0; i < psheetList.length; i++) {
        if (psheetList[i].isLikedSongs && !!psheetList[i].containsTrack !== !!snap.liked) {
          psheetList[i].containsTrack = !!snap.liked;
          if (!psheetDirty) {
            try {
              delete psheetDraft[pkeyOf(psheetList[i])];
            } catch (e) {}
          }
          changed = true;
        }
      }
      if (changed) {
        psheetListSig = "";
        renderPSheet();
      }
    }

    function beginPSheet() {
      if (psheetOpen) return;
      // Only one sheet at a time: Devices yields to Save and vice versa.
      try {
        if (typeof closeSheet === "function") closeSheet();
      } catch (e) {}
      psheetOpen = true;
      root.classList.add("spm-psheet-open");
      psheetEl.hidden = false;
      pbackdropEl.hidden = false;
      try {
        cardEl.setAttribute("aria-hidden", "true");
        mini.setAttribute("aria-hidden", "true");
      } catch (e) {}
      psheetList = [];
      psheetStatus = "loading";
      psheetListSig = "";
      psheetInitial = [];
      psheetDraft = {};
      psheetDirty = false;
      psheetSaving = false;
      paintPsheetFoot();
      psheetSearch = "";
      try {
        if (psheetSearchInput) psheetSearchInput.value = "";
      } catch (e) {}
      try {
        // Seed from the LIVE snapshot, not `lastSnap`: the last render lags the
        // real track (snapshots are mutation- or 2s-cadence driven), so seeding
        // from it made the very next snapshot look like a track change, which
        // blanked the sheet and discarded the draft. getSnapshot() reads
        // Spotify's DOM directly, so it is always current.
        var seed = null;
        try {
          if (spotify && spotify.getSnapshot) seed = spotify.getSnapshot();
        } catch (e1) {}
        if (!seed) seed = lastSnap;
        psheetTrackKey = seed ? ptrackKeyOf(seed) : "";
      } catch (e) {
        psheetTrackKey = "";
      }
      setPSheetNotice("");
      // Paint whatever we already know SYNCHRONOUSLY, before the slide even
      // starts, but ONLY if it is trustworthy (see
      // trustworthyCachedPlaylists). Showing a stale or wrong-source list here
      // and then visibly flipping to the real one is what read as "two
      // different lists, randomly".
      var cachedNow = trustworthyCachedPlaylists();
      if (cachedNow.length) {
        applyPsheetList(cachedNow);
      } else {
        renderPSheet();
      }
      psheetLastLoad = nowMs();
      if (psheetLoadTimer) window.clearTimeout(psheetLoadTimer);
      // Short deferral only: the sheet already has content, so there is no
      // slide to stutter while the truth catches up.
      psheetLoadTimer = window.setTimeout(function () {
        psheetLoadTimer = 0;
        if (psheetOpen) loadPSheetPlaylists(false);
      }, 140);
      try {
        abortGesture();
      } catch (e) {}
    }

    function finishPSheetOpen() {
      try {
        psheetEl.focus({ preventScroll: true });
      } catch (e) {}
    }

    function glidePSheetHome() {
      if (prefersReducedMotion()) {
        setPSheetAnim(false);
        paintPSheet(0);
        return;
      }
      setPSheetAnim(true);
      var raf = window.requestAnimationFrame || function (fn) {
        return window.setTimeout(fn, 16);
      };
      raf(function () {
        paintPSheet(0);
      });
    }

    function openPSheet(fromPointer) {
      if (psheetOpen) return;
      beginPSheet();
      if (fromPointer) armSheetGhost();
      if (prefersReducedMotion()) {
        setPSheetAnim(false);
        paintPSheet(0);
        finishPSheetOpen();
        return;
      }
      setPSheetAnim(false);
      paintPSheet(psheetHeight() || 320, 0);
      void psheetEl.offsetHeight;
      glidePSheetHome();
      window.clearTimeout(psheetTimer);
      psheetTimer = window.setTimeout(finishPSheetOpen, 300);
    }

    function hidePSheetNow() {
      psheetEl.hidden = true;
      pbackdropEl.hidden = true;
      setPSheetAnim(false);
      paintPSheet(0);
      try {
        likeBtn.focus({ preventScroll: true });
      } catch (e) {}
      envSample = null;
      scheduleEnvironment();
    }

    function closePSheet() {
      if (!psheetOpen) return;
      psheetOpen = false;
      psheetDrag = null;
      root.classList.remove("spm-psheet-open");
      try {
        cardEl.removeAttribute("aria-hidden");
        mini.removeAttribute("aria-hidden");
      } catch (e) {}
      if (prefersReducedMotion()) {
        hidePSheetNow();
        return;
      }
      setPSheetAnim(true);
      paintPSheet(psheetHeight() || 320, 0);
      window.clearTimeout(psheetTimer);
      psheetTimer = window.setTimeout(hidePSheetNow, 280);
    }

    function psheetDragStart(e) {
      if (!psheetOpen || psheetDrag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Never hijack a press that started on a control. preventDefault() below
      // suppresses the compatibility mouse events — including the `click`.
      var tgt = e.target;
      if (tgt && tgt.closest && tgt.closest("button, a, input, select, textarea")) return;
      psheetDrag = {
        id: e.pointerId,
        y0: e.clientY,
        dy: 0,
        t0: nowMs(),
        lastY: e.clientY,
        lastT: nowMs(),
        vel: 0,
      };
      setPSheetAnim(false);
      try {
        psheetEl.setPointerCapture && psheetEl.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.cancelable) e.preventDefault();
    }

    function psheetDragMove(e) {
      if (!psheetDrag || e.pointerId !== psheetDrag.id) return;
      var dy = e.clientY - psheetDrag.y0;
      var t = nowMs();
      psheetDrag.vel = (e.clientY - psheetDrag.lastY) / Math.max(1, t - psheetDrag.lastT);
      psheetDrag.dy = dy;
      psheetDrag.lastY = e.clientY;
      psheetDrag.lastT = t;
      var h = Math.max(160, psheetHeight());
      var offset = dy > 0 ? Math.min(dy, h) : Math.max(dy * 0.22, -36);
      paintPSheet(offset, Math.max(0.15, 1 - Math.max(0, offset) / h));
      if (e.cancelable) e.preventDefault();
    }

    function psheetDragEnd(e) {
      if (!psheetDrag) return;
      if (e && e.pointerId !== undefined && e.pointerId !== psheetDrag.id) return;
      var d = psheetDrag;
      psheetDrag = null;
      var h = Math.max(160, psheetHeight());
      var stalled = nowMs() - d.lastT > 140;
      var vel = stalled ? 0 : d.vel;
      if (d.dy > Math.max(64, h * 0.22) || (d.dy > 36 && vel > 0.6)) {
        closePSheet();
        return;
      }
      glidePSheetHome();
    }

    // The sheet opens from the hearts (see heartTap), never from a
    // dedicated button: unsaved hearts Like, saved hearts open the sheet.
    // Spotify parity: Cancel discards the draft, Done commits it.
    if (psheetCancelBtn) {
      psheetCancelBtn.addEventListener("click", function () {
        if (psheetSaving) return;
        closePSheet();
      });
    }
    if (psheetDoneBtn) {
      psheetDoneBtn.addEventListener("click", function () {
        savePsheetDraft();
      });
    }
    pbackdropEl.addEventListener("click", function () {
      closePSheet();
    });
    pgrabEl.addEventListener("pointerdown", psheetDragStart);
    psheetHead.addEventListener("pointerdown", psheetDragStart);
    window.addEventListener("pointermove", psheetDragMove, true);
    window.addEventListener("pointerup", psheetDragEnd, true);
    window.addEventListener("pointercancel", function () {
      if (psheetDrag) glidePSheetHome();
      psheetDrag = null;
    }, true);
    if (psheetSearchInput) {
      psheetSearchInput.addEventListener("input", function () {
        psheetSearch = psheetSearchInput.value || "";
        renderPSheet();
      });
    }

    /* ---------- Fullscreen Lyrics (custom mirror) ----------
     *
     * Presentation layer only: every line, the active index, and the palette
     * come from the adapter, which owns ALL Spotify DOM work (preview
     * section first, Spotify's own fullscreen behind a veil). This layer
     * never queries Spotify's DOM.
     *
     * Flow: tapping our preview opens Spotify's fullscreen (veiled) and
     * paints our own opaque fullscreen above it; the adapter's watcher keeps
     * feeding line/active updates, and the active line auto-scrolls into
     * view. Closing (X, backdrop, Escape) hides ours first, then takes
     * Spotify's fullscreen down too — never one without the other.
     */
    var lsheetOpen = false;
    var lsheetTimer = 0;
    var lTrackKey = "";
    var lActive = -2; // last painted active index (-2 = nothing painted yet)
    var lColors = null;
    var lOpening = false; // Spotify fullscreen open in flight
    var lLastUserScroll = 0;
    var unwatchLyrics = null;
    var lSig = "";
    var lHolding = false; // last push held (transient); render ticks expire it
    var lPaintedCount = 0; // rows currently painted in the open fullscreen
    var lPaintedFull = false; // that paint came from the fullscreen copy
    var lLastGoodAt = 0; // last delivery that carried rows (either copy)

    function llyricsSig(st) {
      var list = (st.full && st.full.length ? st.full : st.preview) || [];
      var lens = 0;
      for (var i = 0; i < list.length; i++) lens += ((list[i] && list[i].text) || "").length;
      return (st.trackKey || "") + "|" + (st.fullscreenOpen ? "F" : "P") + "|" +
        st.active + "|" + list.length + "|" + lens;
    }

    function applyLyricsColors(colors) {
      lColors = colors || null;
      // The blob carries the vars too: the in-cover lyrics layer lives inside
      // it and paints its background + line colors from the same palette.
      var targets = [lsheetEl, blob];
      for (var i = 0; i < targets.length; i++) {
        if (!targets[i] || !targets[i].style) continue;
        try {
          targets[i].style.setProperty("--spm-lyr-active", colors.active);
          targets[i].style.setProperty("--spm-lyr-inactive", colors.inactive);
          targets[i].style.setProperty("--spm-lyr-passed", colors.passed);
          targets[i].style.setProperty("--spm-lyr-bg", colors.background);
        } catch (e) {}
      }
    }

    function lstatusBlock(text) {
      var wrap = el("div", "spm-lstatus", null);
      var msg = el("p", "spm-lmsg", null);
      msg.textContent = text;
      wrap.appendChild(msg);
      return wrap;
    }

    // Track-change timestamp shared by the lyrics holds (cover + fullscreen):
    // Spotify tears its section down for ~3s after a skip before the new
    // song's rows mount.
    var lastLyrTrackChangeAt = 0;

    function renderLSheetList(st) {
      var list = (st.full && st.full.length ? st.full : st.preview) || [];
      while (lsheetListEl.firstChild) lsheetListEl.removeChild(lsheetListEl.firstChild);
      for (var i = 0; i < list.length; i++) {
        var row = list[i] || {};
        var txt = row.text || "";
        var line = el(
          "div",
          "spm-lline" + (txt === "" ? " spm-lgap" : ""),
          null
        );
        line.textContent = txt;
        line.setAttribute("data-li", String(i));
        lsheetListEl.appendChild(line);
      }
      while (lsheetState.firstChild) lsheetState.removeChild(lsheetState.firstChild);
      if (!list.length) {
        lsheetState.hidden = false;
        lsheetState.appendChild(lstatusBlock(
          st.available ? "No lyrics for this track." : "Lyrics aren't available right now."
        ));
      } else {
        lsheetState.hidden = true;
      }
    }

    // Content signature of the MOUNTED rows. Rebuilds happen only when the
    // row set itself changes (mount / remount / track change) — active flips
    // never rebuild, they move one class in place (paintLActive). Rebuilding
    // 26 rows per line flip was both waste and a whole class of freeze races
    // (rebuild vs highlight vs scroll/store ordering).
    var lRowsSig = "";
    function lsheetContentSig(list) {
      var parts = [];
      for (var i = 0; i < list.length; i++) parts.push((list[i] && list[i].text) || "");
      return list.length + "|" + parts.join("\n");
    }

    // Ensures the mounted rows match `list`; returns true when it rebuilt.
    // The active mark is NEVER applied here — paintLActive owns it, always.
    function ensureLSheetRows(st) {
      var list = (st.full && st.full.length ? st.full : st.preview) || [];
      var sig = lsheetContentSig(list);
      if (sig === lRowsSig) return false;
      lRowsSig = sig;
      llog("rebuild", list.length + " rows");
      renderLSheetList(st);
      return true;
    }

    // UI paint log (mirrors the adapter flight recorder): every rebuild,
    // active move, hold and skip, so the next "it froze" paste shows the
    // exact stall point instead of another guess.
    function llog(ev, info) {
      try {
        var arr = window.SpotMobile.lyricsUiLog;
        if (!arr) {
          arr = window.SpotMobile.lyricsUiLog = [];
        }
        arr.push({ t: Date.now(), ev: ev, info: info || "" });
        if (arr.length > 30) arr.splice(0, arr.length - 30);
      } catch (e) {}
    }

    function scrollLActive(force) {
      if (!lsheetOpen) return;
      if (!force && nowMs() - lLastUserScroll < 6000) return; // user is reading
      var activeEl = null;
      try {
        activeEl = lsheetListEl.querySelector(".spm-lline.spm-active");
      } catch (e) {}
      if (!activeEl || !lsheetBody) return;
      try {
        var top = activeEl.offsetTop - lsheetBody.clientHeight / 2 + activeEl.clientHeight / 2;
        lsheetBody.scrollTop = Math.max(0, Math.round(top));
      } catch (e2) {}
    }

    // Marks passed/active across all mounted rows (Spotify parity: rows
    // before the active one dim) with a soft cross-fade. skipScroll lets a
    // track change paint the mark without gliding to a stale line.
    function paintLActive(index, skipScroll) {
      var kids = [];
      try {
        kids = Array.prototype.slice.call(lsheetListEl.children);
      } catch (e) {
        kids = [];
      }
      for (var k = 0; k < kids.length; k++) {
        var ci = -1;
        try {
          ci = parseInt(kids[k].getAttribute("data-li"), 10);
        } catch (e2) {}
        if (!isFinite(ci)) ci = -1;
        kids[k].classList.toggle("spm-active", index >= 0 && ci === index);
        kids[k].classList.toggle("spm-passed", index >= 0 && ci !== -1 && ci < index);
      }
      if (index !== lActive) llog("active", lActive + "->" + index);
      lActive = index;
      if (!skipScroll) scrollLActive(false);
    }

    // A track key with no text on either side is a mid-render glitch, not a
    // track change (Spotify renders title before artist; see ptrackKeyOf).
    // Same class of transient syncPsheetWithSnap already guards against.
    function lyricsKeyEmpty(k) {
      var s = String(k || "").trim();
      return s === "" || s === "|";
    }

    // Single entry for adapter pushes: cover when on, fullscreen when open.
    var lastLyricsState = null;
    function onLyricsState(st) {
      if (!st) return;
      lastLyricsState = st;
      paintCoverLyr(st);
      if (!lsheetOpen) return;
      var sig = llyricsSig(st);
      if (sig === lSig) return;
      var now = nowMs();
      var fullRows = (st.full && st.full.length) ? st.full : null;
      var newRows = fullRows || st.preview || [];
      // Last delivery that carried rows of either copy. Overlay-only
      // tracking used to leave this at 0 forever in inline mode (no overlay
      // copy exists there — live-observed: Show more expands the snippet in
      // place), disabling the 5s lookalike-key guard below for exactly the
      // tracks that need it.
      if (newRows.length) lLastGoodAt = now;
      var trackChanged = st.trackKey !== lTrackKey;
      // Never blank a painted fullscreen on transient states: (a) totally
      // empty updates (Spotify tearing down/rebuilding rows around its
      // fullscreen open), (b) a fullscreen copy we HAD vanishing while the
      // snippet still lives (keep the painted long list, not a short fallback
      // swap — and never treat inline mode, which has no copy at all, as a
      // teardown), (c) empty keys (mid-render text gaps), or (d) a changed
      // key within 5s of a good paint (late artist text forging a
      // lookalike key). All holds keep the old key/sig, so the recovery
      // delivery still differs and repaints. A genuinely lyrics-less track
      // still blanks — at most ~5s late.
      var lostFull = lPaintedFull && !fullRows;
      if (lPaintedCount > 0 && (newRows.length === 0 || lostFull) &&
          (!trackChanged || lyricsKeyEmpty(st.trackKey) || now - lLastGoodAt < 5000)) {
        lHolding = true;
        llog("hold", "active=" + st.active + " n=" + newRows.length);
        return;
      }
      lHolding = false;
      lTrackKey = st.trackKey || "";
      lSig = sig;
      var rebuilt = ensureLSheetRows(st);
      lPaintedCount = newRows.length;
      lPaintedFull = !!fullRows;
      // Fresh songs start at the top. The reset runs on every track change
      // AND every rebuild: the first delivery after a jump still carries the
      // old song's rows+active, and a rebuild otherwise preserves the old
      // scroll offset — while the key has often already flipped, so the
      // change gate alone misses it. Centering that stale line is exactly
      // the "starts at the bottom" bug.
      if (trackChanged || rebuilt) {
        try {
          if (lsheetBody) lsheetBody.scrollTop = 0;
        } catch (e) {}
      }
      // After a rebuild the DOM holds no mark while lActive still names the
      // old index — force the paint so the highlight can never be stranded.
      if (rebuilt) lActive = -2;
      // Never follow-scroll on a track change: the active line at that point
      // is the old song's (or -1), and gliding to it drags the fresh song
      // straight back down. The mark still paints; the next live advance
      // resumes the glide from the top.
      if (st.active !== lActive) paintLActive(st.active, trackChanged);
      else if (!trackChanged) scrollLActive(false);
    }

    function beginLSheet() {
      if (lsheetOpen) return;
      try {
        if (typeof closeSheet === "function") closeSheet();
      } catch (e1) {}
      try {
        if (typeof closePSheet === "function") closePSheet();
      } catch (e2) {}
      lsheetOpen = true;
      lActive = -2;
      lSig = "";
      lHolding = false;
      lRowsSig = "";
      lPaintedCount = 0;
      lPaintedFull = false;
      lLastGoodAt = 0;
      lTrackKey = "";
      lLastUserScroll = 0;
      root.classList.add("spm-lyrics-open");
      lsheetEl.hidden = false;
      lbackdropEl.hidden = false;
      try {
        cardEl.setAttribute("aria-hidden", "true");
        mini.setAttribute("aria-hidden", "true");
      } catch (e3) {}
      while (lsheetListEl.firstChild) lsheetListEl.removeChild(lsheetListEl.firstChild);
      while (lsheetState.firstChild) lsheetState.removeChild(lsheetState.firstChild);
      lsheetState.hidden = false;
      lsheetState.appendChild(lstatusBlock("Loading lyrics…"));
      try {
        abortGesture();
      } catch (e4) {}
    }

    function finishLSheetOpen() {
      try {
        lsheetEl.focus({ preventScroll: true });
      } catch (e) {}
    }

    function openLSheet() {
      if (lsheetOpen || lOpening) return;
      beginLSheet();
      try {
        if (prefersReducedMotion()) lsheetEl.focus({ preventScroll: true });
        else window.setTimeout(finishLSheetOpen, 250);
      } catch (e) {}
      lOpening = true;
      var promise = null;
      try {
        promise = spotify.openLyricsFullscreen ? spotify.openLyricsFullscreen() : null;
      } catch (e2) {
        promise = null;
      }
      if (!promise || !promise.then) {
        lOpening = false;
        onLyricsState({ available: false, trackKey: "", preview: [], full: [], active: -1,
          colors: lColors, fullscreenOpen: false, hasMore: false });
        return;
      }
      promise.then(function (res) {
        lOpening = false;
        if (!lsheetOpen) return;
        if (!res || !res.ok) {
          onLyricsState({ available: false, trackKey: "", preview: [], full: [], active: -1,
            colors: lColors, fullscreenOpen: false, hasMore: false });
          return;
        }
        var st = null;
        try {
          st = spotify.getLyricsState ? spotify.getLyricsState() : null;
        } catch (e3) {}
        if (st) onLyricsState(st);
      }).catch(function () {
        lOpening = false;
        if (!lsheetOpen) return;
        onLyricsState({ available: false, trackKey: "", preview: [], full: [], active: -1,
          colors: lColors, fullscreenOpen: false, hasMore: false });
      });
    }

    function hideLSheetNow() {
      lsheetEl.hidden = true;
      lbackdropEl.hidden = true;
      try {
        likeBtn.focus({ preventScroll: true });
      } catch (e) {}
      envSample = null;
      scheduleEnvironment();
    }

    // Closing ours ALWAYS closes Spotify's too (requirement) — ours hides
    // instantly so the tap feels immediate; Spotify's close resolves after.
    function closeLSheet() {
      if (!lsheetOpen && !lOpening) return;
      lsheetOpen = false;
      lOpening = false;
      root.classList.remove("spm-lyrics-open");
      try {
        cardEl.removeAttribute("aria-hidden");
        mini.removeAttribute("aria-hidden");
      } catch (e) {}
      if (prefersReducedMotion()) {
        hideLSheetNow();
      } else {
        window.clearTimeout(lsheetTimer);
        lsheetTimer = window.setTimeout(hideLSheetNow, 200);
      }
      var promise = null;
      try {
        promise = spotify.closeLyricsFullscreen ? spotify.closeLyricsFullscreen() : null;
      } catch (e2) {
        promise = null;
      }
      if (promise && promise.then) {
        promise.then(function (res) {
          if (res && !res.ok) setStatus("Couldn't close Spotify lyrics.");
        }).catch(function () {});
      }
    }

    if (lsheetCloseBtn) {
      lsheetCloseBtn.addEventListener("click", function () {
        closeLSheet();
      });
    }
    lbackdropEl.addEventListener("click", function () {
      closeLSheet();
    });
    if (lsheetBody) {
      lsheetBody.addEventListener("scroll", function () {
        lLastUserScroll = nowMs();
      }, { passive: true });
    }

    /* ---------- In-cover Lyrics (squircle swap) ----------
     *
     * Presentation layer only, like the fullscreen mirror: every line, the
     * active index and the palette come from the adapter (paintCoverLyr runs
     * off the same onLyricsState push as the preview). The mic button in the
     * aux row swaps the artwork squircle for a lyrics box; the expand button
     * floating top-right opens the fullscreen mirror.
     *
     * Geometry: the layer lives INSIDE .spm-blob at inset 0, clipped by the
     * blob's own overflow + 26% radius — so it is pixel-identical to the
     * artwork box by construction, in card and sheet layouts alike, with no
     * measuring. The artwork stays mounted underneath (opaque lyric bg covers
     * it), so load state and halos are untouched.
     *
     * The list is a real scroller (full lines, wrapped): it owns vertical
     * touch via touch-action + a card-gesture carve-out, so reading never
     * drags the card, and the active line glides into view with a smooth
     * scroll (instant jumps only for fresh content and reduced-motion).
     * Passed lines dim exactly like Spotify (inactive color, reduced
     * opacity); the active line wears the lyric active color with a soft
     * color/opacity transition; the box wears the lyric background.
     */
    var coverLyrOn = false;
    try {
      coverLyrOn = window.localStorage && window.localStorage.getItem("spm-cover-lyrics") === "1";
    } catch (eCoverInit) {}
    var coverLyrSig = ""; // painted content signature (full text)
    var coverLyrKey = ""; // track key the painted rows belong to
    var coverLyrActive = -2; // painted active index (-2 = nothing painted yet)
    var coverLyrHolding = false; // empty-state held (transient); ticks expire it
    var coverLyrUserScrollAt = 0; // last manual scroll (auto-follow yields to it)
    var coverLyrProgAt = 0; // last programmatic follow (never poses as reading)

    function coverLyrListOf(st) {
      return (st.full && st.full.length ? st.full : st.preview) || [];
    }

    function setCoverLyr(on) {
      coverLyrOn = !!on;
      root.classList.toggle("spm-coverlyr-on", coverLyrOn);
      if (coverlyrEl) coverlyrEl.hidden = !coverLyrOn;
      if (coverlyrToggle) {
        coverlyrToggle.classList.toggle("spm-active", coverLyrOn);
        coverlyrToggle.setAttribute("aria-pressed", coverLyrOn ? "true" : "false");
        coverlyrToggle.setAttribute(
          "aria-label",
          coverLyrOn ? "Show album cover" : "Show lyrics in album cover"
        );
      }
      try {
        localStorage.setItem("spm-cover-lyrics", coverLyrOn ? "1" : "0");
      } catch (eCoverStore) {}
      if (coverLyrOn) {
        // Force a full (re)paint onto the revealed box: toggling must never
        // show the previous song's lines under the new one.
        coverLyrSig = "";
        coverLyrKey = "";
        coverLyrActive = -2;
        coverLyrHolding = false;
        var st = lastLyricsState;
        if (!st) {
          try {
            st = spotify.getLyricsState ? spotify.getLyricsState() : null;
          } catch (eCoverSeed) {}
        }
        if (st) paintCoverLyr(st);
        else if (spotify.refreshLyrics) {
          try {
            spotify.refreshLyrics();
          } catch (eCoverRefresh) {}
        }
      }
    }

    function paintCoverLyrActive(index) {
      if (!coverlyrList) return;
      var kids = [];
      try {
        kids = Array.prototype.slice.call(coverlyrList.children);
      } catch (e) {
        kids = [];
      }
      for (var k = 0; k < kids.length; k++) {
        var ci = -1;
        try {
          ci = parseInt(kids[k].getAttribute("data-ci"), 10);
        } catch (e2) {}
        if (!isFinite(ci)) ci = -1;
        kids[k].classList.toggle("spm-active", index >= 0 && ci === index);
        kids[k].classList.toggle("spm-passed", index >= 0 && ci !== -1 && ci < index);
      }
      if (index !== coverLyrActive) llog("coverlyr-active", coverLyrActive + "->" + index);
      coverLyrActive = index;
    }

    function paintCoverLyr(st) {
      if (!coverLyrOn || !coverlyrEl || !coverlyrList || !coverlyrState) return;
      if (st && st.colors) {
        try {
          applyLyricsColors(st.colors);
        } catch (eC) {}
      }
      var list = st && st.available ? coverLyrListOf(st) : [];
      var key = (st && st.trackKey) || "";
      if (!list.length) {
        // Same bounded hold as before removal of the mini preview: don't
        // strand the old song's lines under the new key during Spotify's
        // teardown gap, and don't blank on it either — but never hold
        // forever (render ticks expire it; adapter re-deliveries are
        // sig-deduped so they can't).
        if (coverlyrList.firstChild && nowMs() - lastLyrTrackChangeAt < 4000) {
          coverLyrHolding = true;
          llog("coverlyr-hold", "");
          return;
        }
        coverLyrHolding = false;
        coverLyrSig = "";
        coverLyrActive = -2;
        while (coverlyrList.firstChild) coverlyrList.removeChild(coverlyrList.firstChild);
        while (coverlyrState.firstChild) coverlyrState.removeChild(coverlyrState.firstChild);
        coverlyrState.hidden = false;
        var coverMsg = el("p", "spm-coverlyr-msg", null);
        coverMsg.textContent =
          st && st.available ? "No lyrics for this track." : "Lyrics aren't available right now.";
        coverlyrState.appendChild(coverMsg);
        llog("coverlyr-empty", "");
        return;
      }
      coverlyrState.hidden = true;
      while (coverlyrState.firstChild) coverlyrState.removeChild(coverlyrState.firstChild);
      coverLyrHolding = false;
      var at = st.active >= 0 && st.active < list.length ? st.active : -1;
      // Full-text content signature (never count + length: same-shape
      // replacements — equal row counts and equal totals — collide and would
      // move the mark onto stale rows, like the fullscreen's lsheetContentSig).
      var parts = [];
      for (var n = 0; n < list.length; n++) parts.push((list[n] && list[n].text) || "");
      var sig = key + "|" + list.length + "|" + parts.join("\n");
      // A new key always rebuilds from the top: the first delivery after a
      // jump still carries the OLD song's rows+active, and centering that
      // stale line is exactly the "starts at the bottom" bug. Same-song
      // rebuilds keep following the live line instead.
      var keyChanged = key !== coverLyrKey;
      coverLyrKey = key;
      if (sig !== coverLyrSig || keyChanged) {
        coverLyrSig = sig;
        while (coverlyrList.firstChild) coverlyrList.removeChild(coverlyrList.firstChild);
        for (var i = 0; i < list.length; i++) {
          var row = list[i] || {};
          var txt = row.text || "";
          var line = el("div", "spm-coverlyr-line" + (txt === "" ? " spm-cgap" : ""), null);
          line.textContent = txt;
          line.setAttribute("data-ci", String(i));
          coverlyrList.appendChild(line);
        }
        llog("coverlyr-rebuild", list.length + " rows active=" + at);
        // Fresh nodes hold no mark while coverLyrActive still names the old
        // index — force the paint so the highlight can never be stranded
        // (e.g. dialog close swaps the copy with the same active index).
        coverLyrActive = -2;
        // Fresh songs jump straight to the top with no animation (the mark
        // still paints below); the glide belongs to live advances, not mounts.
        scrollCoverLyrTo(keyChanged ? -1 : at, true);
      }
      if (at !== coverLyrActive) {
        paintCoverLyrActive(at);
        // Same stale rule as the rebuild: never glide to a fresh key.
        if (!keyChanged) scrollCoverLyrTo(at, false);
      }
    }

    // Glides the active line to the middle of the box. Instant for fresh
    // content; smooth for live advances (auto unless reduced-motion). Never
    // yanks while the user is reading (their own scroll wins for 6s).
    function scrollCoverLyrTo(index, instant) {
      if (!coverLyrOn || !coverlyrList) return;
      var anchor = null;
      try {
        anchor = index >= 0
          ? coverlyrList.querySelector('.spm-coverlyr-line[data-ci="' + index + '"]')
          : null;
      } catch (e) {}
      var top = 0;
      if (anchor && coverlyrList) {
        try {
          top = Math.max(0, Math.round(
            anchor.offsetTop - coverlyrList.clientHeight / 2 + anchor.clientHeight / 2
          ));
        } catch (e2) {
          top = 0;
        }
      }
      if (!instant && nowMs() - coverLyrUserScrollAt < 6000) return;
      var smooth = !instant && !prefersReducedMotion();
      try {
        coverLyrProgAt = nowMs();
        if (coverlyrList.scrollTo) {
          coverlyrList.scrollTo({ top: top, behavior: smooth ? "smooth" : "auto" });
        } else {
          coverlyrList.scrollTop = top;
        }
      } catch (e3) {
        try {
          coverlyrList.scrollTop = top;
        } catch (e4) {}
      }
    }

    if (coverlyrList) {
      coverlyrList.addEventListener("scroll", function () {
        // Programmatic follows must never pose as the user reading.
        if (nowMs() - coverLyrProgAt < 600) return;
        coverLyrUserScrollAt = nowMs();
      }, { passive: true });
    }

    if (coverlyrToggle) {
      bindTap(coverlyrToggle, function () {
        setCoverLyr(!coverLyrOn);
      });
    }
    if (coverlyrExpand) {
      bindTap(coverlyrExpand, function () {
        openLSheet();
      });
    }

    // --- snapshot rendering (no full DOM rebuilds) ---
    function render(snap) {
      var prevSnap = lastSnap;
      lastSnap = snap;
      var hasTrack = !!(snap.track || snap.artist);
      if (hasTrack) hasEverLoaded = true;
      // Skeleton until the first real track: shimmer placeholders instead
      // of "Nothing playing" dummy text. After a track has loaded once,
      // fall back to the real empty-state messages.
      var isLoading = !hasTrack && !hasEverLoaded;
      root.classList.toggle("spm-loading", isLoading);
      try {
        if (isLoading) root.setAttribute("aria-busy", "true");
        else root.removeAttribute("aria-busy");
      } catch (e) {}

      if (isLoading) {
        if (titleEl.textContent !== "") {
          titleEl.textContent = "";
          titleEl.title = "";
        }
        if (artistBtn.textContent !== "") {
          artistBtn.textContent = "";
          artistBtn.title = "";
        }
        artistBtn.disabled = true;
        artistBtn.setAttribute("aria-label", "Loading");
        if (miniTitle.textContent !== "") {
          miniTitle.textContent = "";
          miniTitle.title = "";
        }
        if (miniArtist.textContent !== "") miniArtist.textContent = "";
      } else {
        if (snap.track && titleEl.textContent !== snap.track) {
          titleEl.textContent = snap.track;
          titleEl.title = snap.track;
        } else if (!snap.track && titleEl.textContent !== "Nothing playing") {
          titleEl.textContent = "Nothing playing";
          titleEl.title = "";
        }
        var artistText = snap.artist || (snap.playerReady ? "Unknown artist" : "Open Spotify and press play");
        if (artistBtn.textContent !== artistText) artistBtn.textContent = artistText;
        if (artistBtn.title !== artistText) artistBtn.title = artistText;
        // Only a real artist name navigates; placeholders stay inert.
        artistBtn.disabled = !snap.artist;
        artistBtn.setAttribute(
          "aria-label",
          snap.artist ? "Open " + snap.artist + " in Spotify" : "Artist"
        );
      }

      // Playing-from context (playlist / mix name). Hidden when unknown —
      // never placeholder text. The button opens it via the adapter.
      var contextText = snap.context || "";
      if (contextLink.textContent !== contextText) contextLink.textContent = contextText;
      contextLink.setAttribute(
        "aria-label",
        contextText ? "Open " + contextText + " in Spotify" : "Now playing context"
      );
      if (contextText) {
        if (contextEl.hasAttribute("hidden")) contextEl.removeAttribute("hidden");
      } else if (!contextEl.hasAttribute("hidden")) {
        contextEl.setAttribute("hidden", "");
      }

      // Mini mirrors (same component, compact state).
      if (miniTitle.textContent !== titleEl.textContent) {
        miniTitle.textContent = titleEl.textContent;
      }
      if (miniTitle.title !== titleEl.title) miniTitle.title = titleEl.title;
      if (!isLoading) {
        var miniArtistText = snap.artist || (snap.playerReady ? "Unknown artist" : "Open Spotify");
        if (miniArtist.textContent !== miniArtistText) miniArtist.textContent = miniArtistText;
      }

      if (snap.artwork && snap.artwork !== currentArtwork) {
        // A swipe is waiting for the new cover: fly it in from the side it
        // was swiped toward. Same-cover consecutive tracks (identical URL)
        // still count as an arrival via the track change itself.
        var swipeDir = 0;
        if (awaitingArt) {
          var trackWas = prevSnap && prevSnap.track ? prevSnap.track : "";
          var trackNow = snap.track || "";
          var urlIsNew = snap.artwork !== currentArtwork;
          var trackIsNew =
            trackWas !== "" && trackNow !== "" && trackNow !== trackWas;
          if (urlIsNew || trackIsNew) {
            swipeDir = awaitingArt.dir;
            if (awaitingArt.timer) {
              try {
                window.clearTimeout(awaitingArt.timer);
              } catch (e) {}
            }
            awaitingArt = null;
          }
        }
        currentArtwork = snap.artwork;
        art.src = snap.artwork;
        art.classList.remove("spm-loaded");
        sampleCoverColor(snap.artwork);
        miniArt.src = snap.artwork;
        miniArt.style.display = "block";
        if (swipeDir) flyIn(swipeDir);
      } else if (!snap.artwork && currentArtwork) {
        currentArtwork = "";
        art.removeAttribute("src");
        art.classList.remove("spm-loaded");
        miniArt.removeAttribute("src");
        miniArt.style.display = "none";
      } else if (awaitingArt && snap.track && prevSnap && prevSnap.track && snap.track !== prevSnap.track) {
        // Same cover, new track (identical artwork URL): nothing to swap,
        // so just glide the art home instead of waiting out the timer.
        var homeDir = awaitingArt.dir;
        if (awaitingArt.timer) {
          try {
            window.clearTimeout(awaitingArt.timer);
          } catch (e2) {}
        }
        awaitingArt = null;
        flyIn(homeDir);
      }
      if (awaitingArt && snap.track && snap.track === awaitingArt.track) {
        // No track change (yet): previous restarted the current song, or
        // the action did nothing (e.g. next at queue end). Don't sit on
        // an empty stage — glide home as soon as we can tell (restart
        // drops the clock by >3s; a dead-end action resolves on a short
        // 800ms beat instead of the old 1.5s stare).
        var el2 = nowMs() - (awaitingArt.t0 || 0);
        var posNow = snap.currentTime || 0;
        var startPos = awaitingArt.pos || 0;
        var restarted =
          awaitingArt.dir > 0 && startPos > 3 && posNow + 3 < startPos;
        if (restarted || el2 > 800) {
          if (awaitingArt.timer) {
            try {
              window.clearTimeout(awaitingArt.timer);
            } catch (e3) {}
          }
          awaitingArt = null;
          blobRest();
        }
      }
      var artVisible = !!snap.artwork;
      art.style.display = artVisible ? "block" : "none";
      artFallback.style.display = artVisible ? "none" : "flex";
      miniArt.style.display = artVisible ? "block" : "none";
      miniFallback.style.display = artVisible ? "none" : "flex";

      // Halo gate, set synchronously every render from URL presence (never
      // from the img load event — a missed event must not be able to hide
      // the halo forever). No artwork URL (app loading, nothing playing)
      // means no halo, which is also what kills the load-time flash.
      root.classList.toggle("spm-has-art", artVisible);

      // Self-heal a missed img load event: if the element already holds
      // decoded pixels but the class never applied, apply it so neither
      // the cover nor anything depending on it gets stuck hidden.
      try {
        if (artVisible && !art.classList.contains("spm-loaded") && art.complete && art.naturalWidth > 0) {
          art.classList.add("spm-loaded");
        }
      } catch (e) {}

      // Icons + halos mirror Spotify's OWN toggle button (directPlaying) when
      // it has been read; the debounced snapshot is only the fallback/seed.
      // Both sources funnel through paintPlaying, so they can never disagree
      // into a play -> pause -> play flap.
      try {
        paintPlaying(
          directPlaying === null || directPlaying === undefined
            ? !!snap.isPlaying
            : !!directPlaying
        );
      } catch (e) {}

      // Modes.
      shuffleBtn.classList.toggle("spm-active", !!snap.shuffle);
      shuffleBtn.setAttribute("aria-pressed", snap.shuffle ? "true" : "false");
      shuffleBtn.setAttribute(
        "aria-label",
        snap.shuffle ? "Disable shuffle" : "Enable shuffle"
      );
      var rep = snap.repeat || "off";
      repeatBtn.classList.toggle("spm-active", rep !== "off");
      repeatBtn.classList.toggle("spm-repeat-one", rep === "track");
      repeatBtn.setAttribute("aria-pressed", rep !== "off" ? "true" : "false");
      repeatBtn.setAttribute(
        "aria-label",
        rep === "track" ? "Disable repeat" : rep === "context" ? "Enable repeat one" : "Enable repeat"
      );

      // Like. innerHTML is compared via a data flag, not the markup
      // itself: the browser re-serializes SVG on read (e.g. <path/> ->
      // <path></path>), so a string compare would rewrite every render.
      var wantLiked = !!snap.liked;
      var shownLiked = likeBtn.getAttribute("data-liked") === "1";
      likeBtn.classList.toggle("spm-liked", wantLiked);
      likeBtn.setAttribute("aria-pressed", wantLiked ? "true" : "false");
      likeBtn.setAttribute(
        "aria-label",
        wantLiked ? "Remove from Liked Songs" : "Add to Liked Songs"
      );
      if (wantLiked !== shownLiked) {
        setHeartGlyph(likeBtn, wantLiked);
        likeBtn.setAttribute("data-liked", wantLiked ? "1" : "0");
        // Flourish on the way ON only — unliking must not celebrate.
        if (wantLiked) likeFlourish(likeBtn);
      }
      // Mini like mirrors with its own churn guard.
      var miniShownLiked = miniLike.getAttribute("data-liked") === "1";
      miniLike.classList.toggle("spm-liked", wantLiked);
      miniLike.setAttribute("aria-pressed", wantLiked ? "true" : "false");
      miniLike.setAttribute(
        "aria-label",
        wantLiked ? "Remove from Liked Songs" : "Add to Liked Songs"
      );
      if (wantLiked !== miniShownLiked) {
        setHeartGlyph(miniLike, wantLiked);
        miniLike.setAttribute("data-liked", wantLiked ? "1" : "0");
        if (wantLiked) likeFlourish(miniLike);
      }

      // Duration + volume (skip while dragging the volume bar).
      if (!volDragging) {
        paintVol(Math.round((snap.volume !== undefined ? snap.volume : 1) * 100));
      }

      var durText = formatTime(snap.duration || 0);
      if (durEl.textContent !== durText) durEl.textContent = durText;

      if (!snap.playerReady) {
        setStatus("Waiting for the Spotify player…");
      } else if (!hasTrack) {
        setStatus(snap.isPlaying ? "Playing" : "Paused — pick something to play.");
      } else {
        setStatus("");
      }

      // Devices: while the sheet is visible, re-read Spotify's list at most
      // once every 5s — devices come and go with no playback change at all, so
      // this cannot hinge on a track signal. The read is the adapter's cached,
      // single-flight one (it opens/hides Spotify's own picker once), it only
      // runs while the sheet is open, and a refresh that finds the same devices
      // repaints nothing. It is skipped while the adapter is mid-transfer (the
      // list will change on its own) but hurried along once a transfer is
      // waiting to be confirmed, so a late success lands in ~1.5s.
      var transferInFlight = sheetPendingKey && !sheetPendingSince;
      if (
        sheetOpen &&
        !transferInFlight &&
        !sheetDrag &&
        nowMs() - sheetLastLoad > (sheetPendingSince ? 1500 : 5000)
      ) {
        loadSheetDevices(false);
      }

      // Save sheet follows track + Like via the same snapshot (event-driven,
      // no timer — see the sheet header comment for why polling is wrong here).
      try {
        syncPsheetWithSnap(snap);
      } catch (e) {}

      // Lyrics follow track changes even when Spotify's lyrics DOM doesn't
      // mutate (lazy loads, missed batches): a forced sync re-read means a
      // new song can never strand the previous song's lines on screen, and
      // the warmup path primes a cold section from the fresh baseline.
      // Guarded like the clock below: needs a real previous track and a real
      // new one, so mid-render text gaps can't thrash it.
      try {
        var lyrPrevTrack = prevSnap && prevSnap.track ? prevSnap.track : "";
        var lyrNewTrack = snap.track || "";
        if (lyrPrevTrack && lyrNewTrack && lyrNewTrack !== lyrPrevTrack) {
          lastLyrTrackChangeAt = nowMs();
          if (spotify.refreshLyrics) spotify.refreshLyrics();
        }
      } catch (eLyr) {}
      // Bounded lyrics-hold expiry (see paintCoverLyr / onLyricsState):
      // snapshots arrive every few seconds even with no DOM activity, so an
      // expired hold always converges without its own timer. Needed because
      // adapter re-deliveries are sig-deduped — a repeated identical
      // unavailable state notifies nobody, so nothing else would ever
      // re-evaluate a hold.
      try {
        var nowHold = nowMs();
        var needLyrSync = false;
        if (coverLyrOn && coverLyrHolding && nowHold - lastLyrTrackChangeAt > 4000) {
          coverLyrHolding = false;
          needLyrSync = true;
        }
        if (lsheetOpen && lHolding && nowHold - lLastGoodAt > 5000) {
          lHolding = false;
          needLyrSync = true;
        }
        if (needLyrSync && spotify.getLyricsState) {
          onLyricsState(spotify.getLyricsState());
        }
      } catch (eLyrHold) {}

      // Re-anchor the smooth clock. Spotify reports whole seconds, so a
      // hard snap on every snapshot would yank the gliding estimate back
      // to an integer (the visible "jump"). Instead: hard rebase only on
      // track / play-state changes or large drift (seeks, jumps); otherwise
      // leash the anchor halfway toward truth — converges in a beat or two
      // with no visible step.
      var playingNow = !!(snap.isPlaying && snap.playerReady);
      var snapT = snap.currentTime || 0;
      anchorDur = snap.duration || 0;
      var trackChanged = !!(
        hasTrack &&
        prevSnap &&
        prevSnap.track &&
        snap.track !== prevSnap.track
      );
      if (!hasTrack || trackChanged || playingNow !== anchorPlaying) {
        rebase(snapT, anchorDur, playingNow);
      } else {
        var drift = snapT - estimate();
        if (Math.abs(drift) > 1.5) {
          rebase(snapT, anchorDur, playingNow);
        } else {
          anchorTime += drift * 0.5;
        }
      }
      // (Re)start the smooth progress ticker.
      if (snap.isPlaying && !rafId && snap.playerReady) startTicker();
      if ((!snap.isPlaying || !snap.playerReady) && !seeking && !miniSeeking) {
        renderBar(snap.currentTime || 0, snap.duration || 0);
        if (curEl) curEl.textContent = formatTime(snap.currentTime || 0);
      }
    }

    art.addEventListener("load", function () {
      art.classList.add("spm-loaded");
    });

    art.addEventListener("error", function () {
      art.classList.remove("spm-loaded");
    });

    // Smooth progress loop: paints the interpolated estimate EVERY frame
    // (style writes only), rebasing against Spotify ~1/sec to kill drift.
    // Track changes are picked up on the rebase beat. A 500ms interval backs
    // up rAF: throttled webviews and background tabs stall animation frames,
    // which used to leave the clock jumping in multi-second steps — the
    // interval keeps it truthful to the second when frames go quiet.
    var lastPaint = 0;
    var tickInterval = 0;

    function paintOnce() {
      if (!lastSnap || !anchorPlaying || seeking || miniSeeking) return false;
      var est = estimate();
      renderBar(est, anchorDur);
      var t = formatTime(est);
      if (curEl.textContent !== t) curEl.textContent = t;
      lastPaint = nowMs();
      return true;
    }

    function rebaseFromSpotify() {
      var cur = estimate();
      var dur = anchorDur;
      try {
        cur = spotify.getCurrentTime() || 0;
        var d2 = spotify.getDuration() || 0;
        if (d2) dur = d2;
      } catch (e) {}
      if (dur && cur > dur) cur = dur;
      // Same leash as snapshots: Spotify's integer seconds must not
      // yank the fractional estimate.
      anchorDur = dur;
      var drift = cur - estimate();
      if (Math.abs(drift) > 1.5) {
        rebase(cur, dur, true);
      } else {
        anchorTime += drift * 0.5;
      }
    }

    function startTicker() {
      if (rafId) return;
      ensureTickInterval();
      function frame(ts) {
        if (seeking || miniSeeking) {
          // Finger down: the drag handlers paint; keep looping for release.
          rafId = requestAnimationFrame(frame);
          return;
        }
        if (!lastSnap || !anchorPlaying) {
          rafId = 0;
          return;
        }
        paintOnce();
        if (ts - lastRebase > 1000) {
          lastRebase = ts;
          rebaseFromSpotify();
          var freshTrack = "";
          try {
            freshTrack = spotify.getCurrentTrack() || "";
          } catch (e) {}
          if (freshTrack && lastSnap && freshTrack !== lastSnap.track) {
            try {
              render(spotify.getSnapshot());
            } catch (e) {}
          }
          if (!lastSnap || !lastSnap.isPlaying) {
            rafId = 0;
            return;
          }
        }
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    function ensureTickInterval() {
      if (tickInterval) return;
      try {
        tickInterval = window.setInterval(function () {
          // Fires at most after ~700ms of frame silence, so a healthy loop
          // is never double-painted.
          if (lastSnap && anchorPlaying && !seeking && !miniSeeking && nowMs() - lastPaint > 700) {
            if (paintOnce()) {
              try {
                rebaseFromSpotify();
              } catch (e) {}
            }
          }
        }, 500);
      } catch (e) {
        tickInterval = 0;
      }
    }

    function stopTicker() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    var unsubscribe = null;
    function mount(parent) {
      (parent || document.body).appendChild(root);
      applyEnvironment();
      applyStoredState();
      watchEnvironment();
      try {
        console.info(
          "[spm] environment:",
          envInfo
            ? "zoom=" +
              envInfo.zoom +
              " sheet=" +
              envInfo.sheet +
              " (" +
              envInfo.reason +
              ")"
            : "unknown",
          envInfo || ""
        );
      } catch (e) {}
      try {
        // Seed the direct mirror before the first paint so icons never flash
        // from a stale snapshot: the live button wins from frame one.
        try {
          if (spotify.getPlayState) {
            var seedPlay = spotify.getPlayState();
            if (seedPlay !== null && seedPlay !== undefined) directPlaying = !!seedPlay;
          }
        } catch (eSeed) {}
        try {
          if (spotify.watchPlayState) unwatchPlayState = spotify.watchPlayState(onDirectPlay);
        } catch (eWatch) {
          unwatchPlayState = null;
        }
        try {
          if (spotify.watchLyrics) unwatchLyrics = spotify.watchLyrics(onLyricsState);
        } catch (eLyricsWatch) {
          unwatchLyrics = null;
        }
        try {
          if (spotify.getLyricsState) onLyricsState(spotify.getLyricsState());
        } catch (eLyricsSeed) {}
        // Restore the in-cover lyrics choice (paints from the seed above).
        try {
          if (coverLyrOn) setCoverLyr(true);
        } catch (eCoverRestore) {}
        unsubscribe = spotify.subscribe(function (snap) {
          render(snap);
        });
        render(spotify.getSnapshot());
      } catch (e) {
        setStatus("Could not read the Spotify player yet.");
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = 0;
        } else if (lastSnap && lastSnap.isPlaying) {
          // Re-anchor immediately: the estimate went stale while hidden
          // (Spotify kept playing), so don't paint it for a beat.
          try {
            rebase(spotify.getCurrentTime() || 0, spotify.getDuration() || 0, true);
            renderBar(estimate(), anchorDur);
          } catch (e) {}
          startTicker();
        }
      });
    }

    function unmount() {
      stopTicker();
      if (tickInterval) {
        try {
          window.clearInterval(tickInterval);
        } catch (e) {}
        tickInterval = 0;
      }
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      if (unwatchPlayState) {
        try {
          unwatchPlayState();
        } catch (e) {}
        unwatchPlayState = null;
      }
      if (unwatchLyrics) {
        try {
          unwatchLyrics();
        } catch (e2) {}
        unwatchLyrics = null;
      }
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return { root: root, mount: mount, unmount: unmount, render: render };
  }

  window.SpotMobile = window.SpotMobile || {};
  window.SpotMobile.createMobilePlayer = createMobilePlayer;
  window.SpotMobile.formatTime = formatTime;
})();
