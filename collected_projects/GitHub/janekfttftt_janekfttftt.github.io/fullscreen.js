// Wspólna obsługa trybu pełnoekranowego (używana przez timer i nawyki).
//  - najpierw prosi przeglądarkę o prawdziwy pełny ekran,
//  - gdy się nie da (np. iPhone), nakładka i tak zasłania całe okno (tryb zapasowy w CSS),
//  - przyciski pojawiają się po ruchu myszą / dotknięciu i po 3 s znikają,
//  - blokuje wygaszanie ekranu, gdy przeglądarka na to pozwala.
// Użycie: Fullscreen.open(element, onClose), Fullscreen.close(), Fullscreen.isOpen().
(function () {
  "use strict";

  const UI_HIDE_MS = 3000;
  const UI_EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown"];

  let active = null; // { overlay, onClose }
  let wakeLock = null;
  let uiTimer = null;
  const wired = new WeakSet();

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

  function showUi() {
    if (!active) return;
    active.overlay.classList.add("fs-ui");
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => {
      if (active) active.overlay.classList.remove("fs-ui");
    }, UI_HIDE_MS);
  }

  async function lockScreen() {
    if (!navigator.wakeLock || wakeLock) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (!active) {
        lock.release();
        return;
      }
      wakeLock = lock;
      lock.addEventListener("release", () => { if (wakeLock === lock) wakeLock = null; });
    } catch (e) { /* niedostępne – ekran może się wygasić */ }
  }

  function unlockScreen() {
    if (wakeLock) {
      try { wakeLock.release(); } catch (e) { /* ok */ }
      wakeLock = null;
    }
  }

  function open(overlay, onClose) {
    if (active) close();
    active = { overlay, onClose };

    if (!wired.has(overlay)) {
      wired.add(overlay);
      overlay.addEventListener("click", (e) => {
        if (e.target.closest(".fs-exit")) close();
      });
    }

    overlay.hidden = false;
    document.body.classList.add("fs-open");
    UI_EVENTS.forEach((n) => document.addEventListener(n, showUi));
    showUi();

    const req = overlay.requestFullscreen || overlay.webkitRequestFullscreen;
    if (req) {
      try {
        const p = req.call(overlay);
        if (p && p.catch) p.catch(() => { /* zostaje tryb zapasowy (CSS) */ });
      } catch (e) { /* j.w. */ }
    }
    lockScreen();
  }

  function close() {
    if (!active) return;
    const { overlay, onClose } = active;
    active = null;

    clearTimeout(uiTimer);
    UI_EVENTS.forEach((n) => document.removeEventListener(n, showUi));
    overlay.classList.remove("fs-ui");
    overlay.hidden = true;
    document.body.classList.remove("fs-open");

    if (fsElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try {
        const p = exit.call(document);
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ok */ }
    }
    unlockScreen();
    if (onClose) onClose();
  }

  // Użytkownik wyszedł z pełnego ekranu przeglądarki (np. klawiszem Esc) – zamykamy nakładkę.
  function onFsChange() {
    if (active && !fsElement()) close();
  }
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  // Esc zamyka też tryb zapasowy (bez prawdziwego pełnego ekranu).
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && active) close();
  });

  // Blokada wygaszania jest zwalniana, gdy karta znika z widoku – odnawiamy ją po powrocie.
  document.addEventListener("visibilitychange", () => {
    if (active && document.visibilityState === "visible") lockScreen();
  });

  window.Fullscreen = { open, close, isOpen: () => !!active };
})();
