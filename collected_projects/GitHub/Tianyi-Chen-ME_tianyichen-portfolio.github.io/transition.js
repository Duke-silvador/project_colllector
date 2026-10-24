
/* Smooth White Page Transitions */

// Create white overlay
const fade = document.createElement("div");
fade.className = "page-fade";
document.body.appendChild(fade);

// Fade from white when the page is ready
window.addEventListener("pageshow", () => {
  document.body.classList.remove("page-changing");

  requestAnimationFrame(() => {
    fade.classList.add("fade-complete");
  });
});

// Add transitions to internal page links
document.querySelectorAll('a[href]').forEach(link => {

  link.addEventListener("click", (event) => {

    // Preserve normal browser shortcuts
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    if (link.target === "_blank" ||
        link.hasAttribute("download")) return;

    const destination = new URL(link.href);

    // Only animate links to HTML pages on this site
    if (destination.origin !== location.origin ||
        !destination.pathname.endsWith(".html")) return;

    event.preventDefault();

    if (document.body.classList.contains("page-changing")) {
      return;
    }

    // Fade current page to white
    document.body.classList.add("page-changing");
    fade.classList.remove("fade-complete");

    // Open destination after fade finishes
    setTimeout(() => {
      window.location.href = destination.href;
    }, 600);

  });

});
