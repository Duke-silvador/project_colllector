// script.js — the conductor.
// Loads data, imports each component, and fills the empty containers in
// index.html. This file wires things together; it doesn't define what a
// card or button LOOKS like — that's each component's own job.
//
// It also owns two small pieces of cross-cutting state that every section
// depends on: the active language (en/fi) and the active theme
// (dark/light, though the theme's actual styling lives entirely in
// style.css — this file only flips the <html data-theme> attribute).

import { renderNav } from "./components/nav.js";
import { renderButton } from "./components/button.js";
import { renderDishCarousel } from "./components/dishCarousel.js";
import { renderMenuItem } from "./components/menuItem.js";
import { renderGalleryTile } from "./components/galleryTile.js";
import { renderFooter } from "./components/footer.js";
import { renderLangSwitch, setActiveLang } from "./components/langSwitch.js";
import { renderThemeToggle } from "./components/themeToggle.js";
import { renderEventModal, openEventModal } from "./components/eventModal.js";
import { renderFab } from "./components/fab.js";
import { renderMobileNav } from "./components/mobileNav.js";
import { renderMap } from "./components/map.js";
import { renderMenuPhoto } from "./components/menuPhoto.js";
import { brandLogoHTML } from "./components/logo.js";

const LANG_STORAGE_KEY = "klandestina-lang";
const THEME_STORAGE_KEY = "klandestina-theme";
const SUPPORTED_LANGS = ["en", "fi"];

let i18n = {};
let menu = null;
let site = null;
let currentLanguage = "en";
let activeCategoryId = null;
let menuPhoto = null;

async function init() {
  const [menuData, siteData, en, fi] = await Promise.all([
    fetch("data/menu.json").then((r) => r.json()),
    fetch("data/site.json").then((r) => r.json()),
    fetch("data/i18n/en.json").then((r) => r.json()),
    fetch("data/i18n/fi.json").then((r) => r.json())
  ]);

  menu = menuData;
  site = siteData;
  i18n = { en, fi };
  currentLanguage = getStoredLanguage();

  // Nav
  renderNav(document.getElementById("shortcut-nav"));
  document.getElementById("brand-mark").innerHTML = brandLogoHTML(site);
  document.getElementById("mobile-topbar-brand").innerHTML = brandLogoHTML(site);

  // Language switcher + theme toggle — rendered twice (desktop utility-bar,
  // mobile topbar) since they sit in different fixed-position contexts;
  // setLanguage() below keeps both lang-switch instances' active state in
  // sync, and the theme toggle's icon swap is pure CSS (data-theme
  // attribute-driven), so any number of instances stay in sync for free.
  renderLangSwitch(document.getElementById("lang-switch"), currentLanguage, setLanguage);
  renderThemeToggle(document.getElementById("theme-toggle"), toggleTheme);
  renderLangSwitch(document.getElementById("mobile-lang-switch"), currentLanguage, setLanguage);
  renderThemeToggle(document.getElementById("mobile-theme-toggle"), toggleTheme);
  renderMobileNav(document.getElementById("mobile-nav-toggle"), document.getElementById("mobile-nav-overlay-mount"), site);

  initMobileTopbarAutoHide();

  // Hero buttons
  const heroButtons = document.getElementById("hero-buttons");
  heroButtons.appendChild(
    renderButton({ label: t("hero.reserve"), href: site.reservationUrl, style: "primary", newTab: true, i18nKey: "hero.reserve" })
  );
  heroButtons.appendChild(
    renderButton({ label: t("hero.seeMenu"), href: "#menu", style: "ghost", i18nKey: "hero.seeMenu" })
  );

  // Visit section is just a CTA — address/hours live in the footer only.
  // Special Events or Inquiry is the primary action here (filled accent
  // button, listed first); Reserve a Table is secondary (ghost button).
  // The modal it opens builds a mailto: link (no backend), with a
  // plain-text email fallback under the buttons in case the visitor's
  // device has no mail client configured.
  const visitButtons = document.getElementById("visit-buttons");

  const eventButton = document.createElement("button");
  eventButton.type = "button";
  eventButton.className = "btn btn-primary";
  eventButton.textContent = t("eventModal.triggerLabel");
  eventButton.dataset.i18n = "eventModal.triggerLabel";
  eventButton.addEventListener("click", openEventModal);
  visitButtons.appendChild(eventButton);

  visitButtons.appendChild(
    renderButton({ label: t("hero.reserve"), href: site.reservationUrl, style: "ghost", newTab: true, i18nKey: "hero.reserve" })
  );

  const emailFallback = document.getElementById("visit-email-fallback");
  emailFallback.href = `mailto:${site.email}`;
  emailFallback.textContent = site.email;

  // Leaflet loads from a CDN (index.html) — an ad blocker, privacy
  // extension, or a transient CDN hiccup could leave the global L
  // undefined. That should cost the page a map, not everything after
  // it (footer, menu tabs, gallery, translations all still run below).
  try {
    renderMap(document.getElementById("visit-map-mount"), { ...site.coordinates, label: `${site.name} — ${site.address}` });
  } catch (e) {
    console.error("Map failed to load:", e);
  }
  document.getElementById("visit-directions").href =
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address)}`;

  renderEventModal(document.getElementById("event-modal-mount"), { email: site.email });

  // Floating action button — same trigger as the button above, just always
  // on screen (fixed bottom-right) so the inquiry path isn't only reachable
  // by scrolling all the way to Visit.
  renderFab(document.getElementById("fab-mount"), openEventModal);

  // Gallery (photos and their filenames don't depend on language)
  const galleryGrid = document.getElementById("gallery-grid");
  menu.gallery.forEach((photo) => galleryGrid.appendChild(renderGalleryTile(photo)));

  // Footer
  renderFooter(document.getElementById("footer-mount"), site);

  // Menu section's image column — a rotating ambient image set per
  // category, swapped by renderMenuCategory() below on every tab click
  // (and, harmlessly, on every language switch too, since that also
  // re-renders the active category).
  menuPhoto = renderMenuPhoto(document.getElementById("menu-photo-mount"));

  // Signature dishes + full menu, both language-dependent
  renderSignatureDishes();
  initMenuTabs();

  applyTranslations();
}

// ---------- i18n ----------

function getStoredLanguage() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (e) {
    /* localStorage unavailable (private mode, etc.) — fall through to default */
  }
  return "en";
}

function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === currentLanguage) return;
  currentLanguage = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (e) {
    /* ignore — language just won't persist across visits */
  }

  setActiveLang(document.getElementById("lang-switch"), lang);
  setActiveLang(document.getElementById("mobile-lang-switch"), lang);
  renderSignatureDishes();
  renderMenuCategory(activeCategoryId);
  applyTranslations();
}

// Looks up a dot-path in the active language's dict, falling back to
// English if that key is missing there too.
function t(path) {
  return resolveKey(i18n[currentLanguage], path) ?? resolveKey(i18n.en, path) ?? path;
}

function resolveKey(dict, path) {
  return path.split(".").reduce((node, key) => (node && typeof node === "object" ? node[key] : undefined), dict);
}

// Resolves a menu.json field that may be a plain string (price, tag, name)
// or a { en, fi } object (description) into the active language's text.
function pickLang(field) {
  if (field && typeof field === "object") return field[currentLanguage] || field.en || "";
  return field;
}

// Single pass over every element tagged data-i18n="some.path" (textContent),
// data-i18n-placeholder="some.path" (the placeholder attribute, for form
// inputs), or data-i18n-aria-label="some.path" (the aria-label attribute,
// for icon-only controls like the FAB) — covers static markup in
// index.html plus the hooks nav.js, footer.js, button.js, eventModal.js and
// fab.js leave on the elements they render.
function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
}

// ---------- mobile topbar ----------

// Hides the mobile topbar when the visitor scrolls down past it, and brings
// it back as soon as they scroll up — a small threshold avoids it flickering
// on the sub-pixel scroll jitter some trackpads/phones report.
//
// mobileNav.js's link clicks set document.body.dataset.navJump = "true"
// for the duration of their own scrollIntoView() jump — without that, this
// handler sees the jump's own downward motion as "the visitor scrolled
// down" and hides the topbar mid-jump, right when the visitor just tapped
// a link specifically to land next to it (leaving the scroll-margin-top
// clearance reserved for it looking like unexplained empty space instead).
function initMobileTopbarAutoHide() {
  const topbar = document.getElementById("mobile-topbar");
  if (!topbar) return;

  const SCROLL_THRESHOLD = 8;
  let lastScrollY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      if (document.body.dataset.navJump === "true") {
        lastScrollY = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;

      const scrollingDown = delta > 0;
      topbar.classList.toggle("topbar--hidden", scrollingDown && currentScrollY > topbar.offsetHeight);
      lastScrollY = currentScrollY;
    },
    { passive: true }
  );
}

// ---------- theme ----------

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
  if (next === "light") html.setAttribute("data-theme", "light");
  else html.removeAttribute("data-theme");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch (e) {
    /* ignore — theme just won't persist across visits */
  }
}

// ---------- language-dependent rendering ----------

function renderSignatureDishes() {
  const dishes = menu.signatureDishes.map((dish) => ({ ...dish, description: pickLang(dish.description) }));
  renderDishCarousel(document.getElementById("dish-grid"), dishes, { prev: t("dishCarousel.prev"), next: t("dishCarousel.next") });
}

// Wires the category pills above the full menu: renders one tab per entry in
// menu.categories, and swaps menu-list's contents to match whichever tab is
// active (starting on the first category).
function initMenuTabs() {
  const tabsContainer = document.getElementById("menu-tabs");
  tabsContainer.innerHTML = "";

  menu.categories.forEach((category, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.dataset.category = category.id;
    tab.dataset.i18n = `menu.categories.${category.id}`;
    tab.textContent = category.label;
    if (index === 0) tab.classList.add("active");

    tab.addEventListener("click", () => {
      if (tab.classList.contains("active")) return;
      tabsContainer.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));
      tab.classList.add("active");
      activeCategoryId = category.id;
      renderMenuCategory(category.id);
    });

    tabsContainer.appendChild(tab);
  });

  activeCategoryId = menu.categories[0].id;
  renderMenuCategory(activeCategoryId);
}

// Most tabs map straight to one array in menu.json (categoryId === the data
// key). The "drinks" tab instead lists several arrays (menu.categories'
// "groups" field) as labeled sub-sections in one panel, so Soft Drinks/
// Beer/Cocktails/Wine don't each need their own tab.
function renderMenuCategory(categoryId) {
  const menuList = document.getElementById("menu-list");
  menuList.innerHTML = "";
  menuPhoto.setCategory(categoryId);

  const category = menu.categories.find((c) => c.id === categoryId);
  const groups = (category && category.groups) || [categoryId];
  let renderedAny = false;

  groups.forEach((groupId) => {
    const items = menu[groupId] || [];
    if (items.length === 0) return;
    renderedAny = true;

    if (groups.length > 1) {
      const heading = document.createElement("h4");
      heading.className = "menu-group-heading";
      heading.dataset.i18n = `menu.categories.${groupId}`;
      heading.textContent = t(`menu.categories.${groupId}`);
      menuList.appendChild(heading);
    }

    appendGroupNote(menuList, groupId);

    items.forEach((item) => {
      menuList.appendChild(renderMenuItem({ ...item, description: pickLang(item.description) }));
    });
  });

  if (!renderedAny) {
    const empty = document.createElement("p");
    empty.className = "menu-empty";
    empty.dataset.i18n = "menu.comingSoon";
    empty.textContent = t("menu.comingSoon");
    menuList.appendChild(empty);
  }
}

// A few groups carry a short standing note above their items — the Lunch
// tab's fixed price/schedule, the Cocktails group's tequila/mezcal note.
// Only rendered when that key actually exists in the EN dict, so most
// groups render nothing extra.
function appendGroupNote(menuList, groupId) {
  const noteKey = `menu.notes.${groupId}`;
  if (resolveKey(i18n.en, noteKey) == null) return;

  const note = document.createElement("p");
  note.className = "menu-note";
  note.dataset.i18n = noteKey;
  note.textContent = t(noteKey);
  menuList.appendChild(note);
}

init();
