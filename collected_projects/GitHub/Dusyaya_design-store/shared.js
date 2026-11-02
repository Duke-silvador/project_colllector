// Общие функции для всех страниц.
const SITE_ROOT = document.documentElement.dataset.root || "./";
const SITE = window.SITE_CONTENT;
const PROJECTS = window.PORTFOLIO_PROJECTS;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function typography(value) {
  return escapeHtml(value)
    .replace(/(^|[\s(«„])((?:в|во|на|к|ко|с|со|у|о|об|от|до|по|за|из|и|а|но|не|для|при|над|под|без|про|как|что))\s+/giu,
      (_, before, word) => before + word + "&nbsp;")
    .replace(/\s+—\s+/g, "&nbsp;—&nbsp;");
}

function projectUrl(project) {
  return SITE_ROOT + "projects/" + encodeURIComponent(project.id) + "/";
}

function imagePath(path) {
  return SITE_ROOT + path;
}

// Проверяем версию файла в GitHub, чтобы после замены фото не оставалось старого кэша.
async function refreshImage(image, path) {
  try {
    const url = "https://api.github.com/repos/Dusyaya/design-store/contents/" + path;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return;
    const file = await response.json();
    if (!file.sha) return;
    const next = "https://raw.githubusercontent.com/Dusyaya/design-store/main/" +
      path + "?v=" + encodeURIComponent(file.sha);
    if (image.src !== next) image.src = next;
  } catch (_) {
    // При отсутствии сети остаётся обычный адрес файла.
  }
}

function bindImages(root = document) {
  root.querySelectorAll("img[data-file]").forEach(image => {
    const path = image.dataset.file;
    image.addEventListener("load", () => {
      image.style.display = "block";
      const placeholder = image.nextElementSibling;
      if (placeholder?.classList.contains("placeholder")) placeholder.style.display = "none";
    });
    image.addEventListener("error", () => {
      image.style.display = "none";
      const placeholder = image.nextElementSibling;
      if (placeholder?.classList.contains("placeholder")) placeholder.style.display = "flex";
    });
    refreshImage(image, path);
  });
}

// Сообщение для обращения редактируется в content.js.
function contactMessage() {
  return SITE.contacts.message || "";
}

function telegramContactUrl() {
  return SITE.contacts.telegram + "?text=" + encodeURIComponent(contactMessage());
}

function whatsappContactUrl() {
  return SITE.contacts.whatsapp + "?text=" + encodeURIComponent(contactMessage());
}

// Веб-редактор Gmail работает даже без настроенного почтового приложения.
function emailContactUrl() {
  return "https://mail.google.com/mail/?view=cm&fs=1" +
    "&to=" + encodeURIComponent(SITE.contacts.email) +
    "&su=" + encodeURIComponent("Запрос на дизайн-проект") +
    "&body=" + encodeURIComponent(contactMessage());
}

function socialLinks() {
  const links = [
    ["Telegram", telegramContactUrl(), "telegram", "26A5E4"],
    ["Instagram", SITE.contacts.instagram, "instagram", "E4405F"],
    ["WhatsApp", whatsappContactUrl(), "whatsapp", "25D366"]
  ];
  return '<div class="social-links" aria-label="Мои контакты">' +
    links.map(([name, url, icon, color]) =>
      '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
      '<img src="https://cdn.simpleicons.org/' + icon + '/' + color + '" alt="" loading="lazy">' +
      '<span>' + name + '</span></a>'
    ).join("") +
    '<a href="' + escapeHtml(emailContactUrl()) + '" target="_blank" rel="noopener noreferrer">' +
    '<span class="mail-symbol">✉</span><span>Почта</span></a></div>';
}

function renderLayout() {
  const brand = document.querySelector(".brand");
  if (brand) brand.textContent = SITE.header.brand;
  const nav = document.querySelector(".topbar nav");
  if (nav) nav.innerHTML =
    '<a href="' + SITE_ROOT + '#catalog">' + typography(SITE.header.catalog) + '</a>' +
    '<a href="' + SITE_ROOT + '#about">' + typography(SITE.header.about) + '</a>' +
    '<a class="contact" href="' + escapeHtml(telegramContactUrl()) +
    '" target="_blank" rel="noopener noreferrer">' + typography(SITE.header.contact) + ' ↗</a>';
  const footer = document.querySelector("footer");
  if (footer) footer.innerHTML = '<span>' + typography(SITE.footer) + '</span>';
}

const COLORS = {
  pink: "#ef5c99", blue: "#668695", yellow: "#f1d91c",
  red: "#e84057", coral: "#f58ba8", purple: "#8c5be5",
  mint: "#4bc9bd", orange: "#ef903b", silver: "#9ca6b9"
};

function productArtwork(project) {
  const tone = COLORS[project.tone] || COLORS.silver;
  return '<div class="artifact" style="--tone:' + tone + '">' +
    '<span class="small">' + escapeHtml(project.year) + '</span>' +
    '<strong>' + escapeHtml(project.object) + '</strong>' +
    '</div>';
}
