// Tłumaczenia PL / EN.
//  - w HTML: data-i18n="klucz" (tekst), data-i18n-placeholder, data-i18n-aria, data-i18n-alt
//  - w JS:   I18N.t("klucz"), I18N.t("klucz", { zmienna: 1 }), I18N.plural(n, "day")
// Żeby dodać / zmienić napis, edytujesz tylko ten plik (sekcje pl i en poniżej).
// Wybór języka zapisuje się w przeglądarce i jest wspólny dla wszystkich podstron.
(function () {
  "use strict";

  const KEY = "lang_v1";

  const DICT = {
    pl: {
      // --- wspólne ---
      "title.index": "Janek",
      "title.timer": "Timer – Janek",
      "nav.start": "start",
      "nav.timer": "timer",
      "lang.aria": "język",
      "lang.pl": "pol",
      "lang.en": "ang",
      "clock.label": "czas w warszawie",
      "h.start": "START",
      "h.timer": "TIMER",
      "fs.exit": "Zamknij pełny ekran",
      "btn.add": "Dodaj",

      // --- strona startowa ---
      "photo.alt": "Jasna kamienna rzeźba w kształcie łuku, na której siedzi ptak, na tle zachodu słońca nad parkiem",

      // --- timer ---
      "timer.ready": "gotowy",
      "timer.nodesc": "bez opisu",
      "timer.paused": "pauza",
      "timer.alldone": "wszystko gotowe – kliknij Reset, żeby zacząć od nowa",
      "btn.start": "Start",
      "btn.pause": "Pauza",
      "btn.resume": "Wznów",
      "btn.skip": "Pomiń",
      "btn.reset": "Reset",
      "btn.fullscreen": "Pełny ekran",
      "timer.add.h": "dodaj timer",
      "timer.min": "min",
      "timer.sec": "sekundy (1–10)",
      "timer.desc": "opis (opcjonalnie)",
      "timer.desc.ph": "np. nauka, przerwa",
      "timer.err.range": "Ustaw czas od 1 do 10 sekund.",
      "presets.h": "gotowe zestawy",
      "preset.ex": "+ ćwiczenia 10 s i przerwa 1 s",
      "preset.s25": "+ nauka 10 s i przerwa 5 s",
      "preset.s50": "+ nauka 8 s i przerwa 2 s",
      "desc.exercise": "ćwiczenia",
      "desc.study": "nauka",
      "desc.rest": "przerwa",
      "queue.h": "kolejka",
      "queue.empty": "Brak timerów. Dodaj pierwszy powyżej.",
      "queue.clear": "Wyczyść listę",
      "queue.clear.confirm": "Usunąć wszystkie timery z listy?",
      "queue.remove": "Usuń timer",
      "sound.h": "dźwięk sygnału",
      "sound.select": "dźwięk (po wybraniu gra od razu)",
      "sound.length": "długość",
      "sound.volume": "głośność",
      "sound.muted": "wyciszone",
      "sound.mute": "Wycisz",
      "sound.unmute": "Włącz dźwięk",
      "sound.play": "Odtwórz",
      "sound.stop": "Stop",
      "s.pip": "Pip",
      "s.bell": "Dzwonek",
      "s.gong": "Gong",
      "s.alarm": "Budzik",
      "s.sonar": "Sonar",
      "s.chime": "Kurant",
      "history.title": "Historia czasu",
      "history.note": "Zapisują się tylko timery, które dobiegły końca. Pominięte i zresetowane odliczania nie są liczone.",
      "history.total": "Łącznie zapisano",
      "history.recent": "Ostatnio ukończone",
      "history.empty": "Historia jest pusta. Ukończ timer, aby zacząć zbierać czas.",
      "history.clear": "Wyczyść historię",
      "history.clear.confirm": "Usunąć całą historię ukończonych timerów?",      "timer.note": "Timery uruchamiają się jeden po drugim, a po każdym gra wybrany sygnał. Zostaw kartę ze stroną otwartą (może być w tle) – po zamknięciu karty lub uśpieniu telefonu odliczanie się zatrzyma. Lista i ustawienia dźwięku zapisują się w przeglądarce.",
    },

    en: {
      // --- common ---
      "title.index": "Janek",
      "title.timer": "Timer – Janek",
      "nav.start": "start",
      "nav.timer": "timer",
      "lang.aria": "language",
      "lang.pl": "pol",
      "lang.en": "eng",
      "clock.label": "time in warsaw",
      "h.start": "START",
      "h.timer": "TIMER",
      "fs.exit": "Exit full screen",
      "btn.add": "Add",

      // --- start page ---
      "photo.alt": "A pale stone arch sculpture with a bird perched on top, against a sunset over the park",

      // --- timer ---
      "timer.ready": "ready",
      "timer.nodesc": "no description",
      "timer.paused": "paused",
      "timer.alldone": "all done – press Reset to start over",
      "btn.start": "Start",
      "btn.pause": "Pause",
      "btn.resume": "Resume",
      "btn.skip": "Skip",
      "btn.reset": "Reset",
      "btn.fullscreen": "Full screen",
      "timer.add.h": "add a timer",
      "timer.min": "min",
      "timer.sec": "seconds (1–10)",
      "timer.desc": "description (optional)",
      "timer.desc.ph": "e.g. study, break",
      "timer.err.range": "Choose a duration from 1 to 10 seconds.",
      "presets.h": "quick sets",
      "preset.ex": "+ exercise 10 s and break 1 s",
      "preset.s25": "+ study 10 s and break 5 s",
      "preset.s50": "+ study 8 s and break 2 s",
      "desc.exercise": "exercise",
      "desc.study": "study",
      "desc.rest": "break",
      "queue.h": "queue",
      "queue.empty": "No timers yet. Add the first one above.",
      "queue.clear": "Clear list",
      "queue.clear.confirm": "Remove all timers from the list?",
      "queue.remove": "Remove timer",
      "sound.h": "signal sound",
      "sound.select": "sound (plays as soon as you pick it)",
      "sound.length": "length",
      "sound.volume": "volume",
      "sound.muted": "muted",
      "sound.mute": "Mute",
      "sound.unmute": "Unmute",
      "sound.play": "Play",
      "sound.stop": "Stop",
      "s.pip": "Pip",
      "s.bell": "Bell",
      "s.gong": "Gong",
      "s.alarm": "Alarm clock",
      "s.sonar": "Sonar",
      "s.chime": "Chime",
      "history.title": "Time history",
      "history.note": "Only timers that reach zero are recorded. Skipped and reset timers are not counted.",
      "history.total": "Total recorded",
      "history.recent": "Recently completed",
      "history.empty": "The history is empty. Complete a timer to start tracking time.",
      "history.clear": "Clear history",
      "history.clear.confirm": "Delete all completed timer history?",
      "timer.note": "Timers run one after another, and the chosen sound plays after each one. Keep the tab open (it can be in the background) – closing it or letting your phone sleep stops the countdown. The list and sound settings are saved in your browser.",
    },
  };

  let lang = "pl";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "pl" || saved === "en") lang = saved;
  } catch (e) { /* zostaje polski */ }

  function t(key, vars) {
    let s = DICT[lang][key];
    if (s === undefined) s = DICT.pl[key];
    if (s === undefined) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return s;
  }

  // 1 → "dzień" / "day", reszta → "dni" / "days"
  function plural(n, base) {
    return t(base + (n === 1 ? ".one" : ".many"));
  }

  function apply() {
    document.documentElement.lang = lang;

    const titleKey = document.documentElement.dataset.title;
    if (titleKey) document.title = t(titleKey);

    document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((e) => { e.placeholder = t(e.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-aria]").forEach((e) => { e.setAttribute("aria-label", t(e.dataset.i18nAria)); });
    document.querySelectorAll("[data-i18n-alt]").forEach((e) => { e.setAttribute("alt", t(e.dataset.i18nAlt)); });
    document.querySelectorAll("button[data-lang]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
  }

  function set(next) {
    if (next !== "pl" && next !== "en") return;
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* trudno */ }
    apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (b) set(b.dataset.lang);
  });

  apply();

  window.I18N = { t, plural, set, get lang() { return lang; } };
})();




