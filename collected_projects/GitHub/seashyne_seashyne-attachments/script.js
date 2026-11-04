const languageSelect = document.querySelector("#language-select");
const translatableElements = document.querySelectorAll("[data-th][data-en][data-zh][data-ja]");
const pageLinks = [...document.querySelectorAll(".page-link")];
const navLinks = [...document.querySelectorAll(".nav-link")];
const panels = [...document.querySelectorAll(".page-panel")];
const supportedLanguages = ["th", "en", "zh", "ja"];
const htmlLanguages = { th: "th", en: "en", zh: "zh-Hans", ja: "ja" };
const pageIds = panels.map((panel) => panel.id);

let language = "th";

try {
  const savedLanguage = localStorage.getItem("seashyne-language");
  if (supportedLanguages.includes(savedLanguage)) language = savedLanguage;
} catch {
  // The site still works when browser storage is unavailable.
}

function setLanguage(nextLanguage) {
  if (!supportedLanguages.includes(nextLanguage)) return;

  language = nextLanguage;
  document.documentElement.lang = htmlLanguages[language];
  languageSelect.value = language;

  translatableElements.forEach((element) => {
    element.textContent = element.dataset[language];
  });

  try {
    localStorage.setItem("seashyne-language", language);
  } catch {
    // Language switching does not depend on storage.
  }
}

function showPage(pageId) {
  if (!pageIds.includes(pageId)) pageId = "home";

  panels.forEach((panel) => {
    const isActive = panel.id === pageId;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
    if (isActive) panel.scrollTop = 0;
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${pageId}`;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

languageSelect.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

pageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const pageId = link.getAttribute("href").slice(1);
    showPage(pageId);
    if (window.location.hash !== `#${pageId}`) {
      history.pushState(null, "", `#${pageId}`);
    }
  });
});

window.addEventListener("hashchange", () => {
  showPage(window.location.hash.slice(1) || "home");
});

document.querySelector("#year").textContent = new Date().getFullYear();
setLanguage(language);
showPage(window.location.hash.slice(1) || "home");
