import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const profileRef = doc(db, "settings", "profile");
const projectsRef = collection(db, "projects");
const projectsQuery = query(projectsRef, limit(100));
let projects = [];
let currentFilter = "All";

function updateContactLinks(profile) {
  document.querySelectorAll("[data-profile]").forEach((element) => {
    const value = profile[element.dataset.profile];
    if (value !== undefined && value !== null) element.textContent = value;
  });
  document.querySelectorAll("[data-profile-image]").forEach((element) => {
    const imageUrl = profile[element.dataset.profileImage];
    if (imageUrl) {
      element.src = imageUrl;
      element.removeAttribute("srcset");
    }
    const altKey = element.dataset.profileAlt;
    const alt = altKey ? profile[altKey] : null;
    if (alt !== undefined && alt !== null) element.alt = alt;
  });
  document.querySelectorAll("[data-contact='email']").forEach((element) => {
    element.textContent = profile.email;
    element.href = `mailto:${profile.email}`;
  });
  document.querySelectorAll("[data-contact='phone']").forEach((element) => {
    element.textContent = profile.phone;
    element.href = `tel:${profile.phone.replace(/[^\d+]/g, "")}`;
  });
  document.querySelectorAll("[data-contact='location']").forEach((element) => {
    element.textContent = profile.location;
  });
  document.querySelectorAll("[data-contact='instagram']").forEach((element) => {
    const username = String(profile.instagram ?? "").trim().replace(/^@/, "");
    const validUsername = /^[A-Za-z0-9._]{1,30}$/.test(username);
    element.closest("[data-contact-group]").hidden = !validUsername;
    if (validUsername) {
      element.href = `https://www.instagram.com/${encodeURIComponent(username)}/`;
      element.textContent = `@${username} ↗`;
    }
  });
  document.querySelectorAll("[data-contact='whatsapp']").forEach((element) => {
    const number = String(profile.whatsapp ?? "").replace(/\D/g, "");
    const validNumber = /^\d{7,15}$/.test(number);
    element.closest("[data-contact-group]").hidden = !validNumber;
    if (validNumber) element.href = `https://wa.me/${number}`;
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderProjects(filter = currentFilter) {
  const grid = document.querySelector("#project-grid");
  if (!grid) return;
  const visibleProjects = filter === "All"
    ? projects
    : projects.filter((project) => project.category === filter);
  if (!visibleProjects.length) {
    grid.innerHTML = '<p class="empty-work">No projects in this collection just yet.</p>';
    return;
  }
  grid.innerHTML = visibleProjects.map((project) => `
    <article class="project-card">
      <button class="project-image" type="button" data-project-id="${escapeHtml(project.id)}" aria-label="View ${escapeHtml(project.title)}">
        <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)} project" loading="lazy" decoding="async" />
        <span class="project-type">${escapeHtml(project.category)}</span>
        <span class="play-button" aria-hidden="true">${project.video ? "▶" : "↗"}</span>
      </button>
      <div class="project-info">
        <div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p></div>
        <span class="project-year">${escapeHtml(project.year)}</span>
      </div>
    </article>
  `).join("");
}

function renderLoadError() {
  const grid = document.querySelector("#project-grid");
  if (grid) grid.innerHTML = '<p class="empty-work">Portfolio content could not be loaded. Please try again later.</p>';
}

async function loadProfile() {
  const profileSnapshot = await getDoc(profileRef);
  if (profileSnapshot.exists()) updateContactLinks(profileSnapshot.data());
}

function listenForProjects() {
  return onSnapshot(projectsQuery, (projectsSnapshot) => {
    projects = projectsSnapshot.docs
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const count = String(projects.length).padStart(2, "0");
    const countLabel = document.querySelector("#work-count");
    const countSup = document.querySelector("#work-count-sup");
    const allFilterCount = document.querySelector("#all-work-count");
    const heroCount = document.querySelector("#hero-project-count");
    if (countLabel) countLabel.textContent = count;
    if (countSup) countSup.textContent = count;
    if (allFilterCount) allFilterCount.textContent = count;
    if (heroCount) heroCount.textContent = count;
    renderProjects();
  }, (error) => {
    console.error("Could not listen for project updates from Firestore:", error);
    renderLoadError();
  });
}

document.querySelector("#current-year").textContent = new Date().getFullYear();

document.querySelector(".filter-row")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  document.querySelectorAll(".filter-button").forEach((item) => {
    item.classList.toggle("is-active", item === button);
  });
  renderProjects();
});

function openProject(project) {
  const dialog = document.querySelector("#project-dialog");
  const content = document.querySelector("#dialog-content");
  if (!dialog || !content) return;
  const youtubeId = getYoutubeVideoId(project.video);
  const media = youtubeId
    ? `<iframe class="dialog-video-embed" src="https://www.youtube.com/embed/${youtubeId}" title="${escapeHtml(project.title)} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
    : project.video
      ? `<video src="${escapeHtml(project.video)}" poster="${escapeHtml(project.image)}" controls autoplay playsinline></video>`
      : `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)} project" />`;
  content.innerHTML = `${media}<div class="dialog-copy"><span>${escapeHtml(project.category)} · ${escapeHtml(project.year)}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.description)}</p></div>`;
  dialog.showModal();
}

function getYoutubeVideoId(videoUrl) {
  if (!videoUrl) return null;

  try {
    const url = new URL(videoUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = null;
    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0];
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        videoId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null;
      }
    } else {
      return null;
    }

    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch (error) {
    console.warn("Could not parse project video URL:", error);
    return null;
  }
}

document.querySelector("#project-grid")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-id]");
  if (!button) return;
  const project = projects.find((item) => item.id === button.dataset.projectId);
  if (project) openProject(project);
});

const dialog = document.querySelector("#project-dialog");
document.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog?.addEventListener("close", () => {
  const video = dialog.querySelector("video");
  if (video) video.pause();
  dialog.querySelector("iframe")?.remove();
});

const menuToggle = document.querySelector(".menu-toggle");
menuToggle?.addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  nav.classList.toggle("is-open", !expanded);
});
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector(".main-nav").classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

loadProfile().catch((error) => {
  console.error("Could not load profile content from Firestore:", error);
});
listenForProjects();
