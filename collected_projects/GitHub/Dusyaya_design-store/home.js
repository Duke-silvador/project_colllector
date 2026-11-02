// Главная страница: весь редактируемый текст берётся из content.js.
renderLayout();

const hero = SITE.hero;
document.querySelector(".hero-heading h1").textContent = hero.title;
document.querySelector(".hero-heading-meta").innerHTML =
  "<span>" + typography(hero.name) + "</span><span>" + escapeHtml(hero.year) + "</span>";
document.querySelector(".intro-panel .panel-kicker").textContent = hero.role;
document.querySelector(".intro-panel h2").textContent = hero.greeting;
document.querySelector(".intro-panel p").innerHTML = typography(hero.description);
document.querySelector(".intro-panel a").textContent = hero.button;
document.querySelector(".skills-panel").innerHTML =
  '<span class="panel-kicker">' + typography(hero.skillsTitle) + '</span>' +
  hero.skills.map(skill => "<div>✳ " + typography(skill) + "</div>").join("");
document.querySelector(".hero-note").textContent = hero.hint;

const catalog = SITE.catalog;
document.querySelector("#catalog .section-head span:first-child").textContent = catalog.heading;
document.querySelector("#catalog .section-head span:last-child").textContent =
  PROJECTS.length + " ПРОЕКТОВ";
document.querySelector(".machine-label").textContent = catalog.machine;
document.querySelector(".machine-bottom")?.remove();

document.querySelector("#about .section-head").textContent = SITE.about.heading;
document.querySelector("#about h2").textContent = SITE.about.title;
document.querySelector("#about .about-text").innerHTML =
  SITE.about.paragraphs.map(text => "<p>" + typography(text) + "</p>").join("");
document.querySelector("#about .next").textContent = SITE.about.button;
document.querySelector("#about .next").href = telegramContactUrl();
document.querySelector("#about .contact-links").innerHTML = socialLinks();

let activeFilter = "Все";
const shelf = document.querySelector("#shelf");
const filters = document.querySelector("#filters");

function renderCatalog() {
  const visible = activeFilter === "Все"
    ? PROJECTS
    : PROJECTS.filter(project => project.category === activeFilter);
  shelf.innerHTML = visible.map(project => {
    const index = PROJECTS.indexOf(project) + 1;
    return '<a class="product" href="' + projectUrl(project) + '">' +
      '<div class="display" style="--glow:' + (COLORS[project.tone] || COLORS.silver) + '77">' +
      '<span class="sku">№ ' + String(index).padStart(2, "0") + '</span>' +
      productArtwork(project) + '</div>' +
      '<div class="product-info"><h3>' + typography(project.name) + ' ↗</h3>' +
      '<p>' + typography(project.short) + '</p>' +
      '<div class="tags">' + project.tags.map(tag =>
        '<span class="tag">' + escapeHtml(tag) + '</span>').join("") +
      '</div></div></a>';
  }).join("");
}

filters.innerHTML = catalog.filters.map(name =>
  '<button type="button" data-filter="' + escapeHtml(name) + '">' +
  escapeHtml(name) + '</button>').join("");
filters.addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  renderCatalog();
  updateFilters();
});
function updateFilters() {
  filters.querySelectorAll("button").forEach(button => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
renderCatalog();
updateFilters();
bindImages();
