// Cosmic Commando site.
// When the Steam page goes live, put its URL here; every "Wishlist" / Steam link on the page picks it up.
const STEAM_URL = "";

document.querySelectorAll(".steam-link").forEach((link) => {
  if (STEAM_URL) {
    link.href = STEAM_URL;
    link.target = "_blank";
    link.rel = "noopener";
    if (link.dataset.labelLive) link.textContent = link.dataset.labelLive;
  } else if (link.dataset.labelSoon) {
    link.textContent = link.dataset.labelSoon;
    link.classList.add("soon");
    link.addEventListener("click", (e) => e.preventDefault());
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

// Screenshot lightbox
const box = document.querySelector(".lightbox");
const boxImg = box.querySelector("img");
document.querySelectorAll(".gallery a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    boxImg.src = a.href;
    boxImg.alt = a.querySelector("img").alt;
    box.hidden = false;
  });
});
box.addEventListener("click", () => { box.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });
