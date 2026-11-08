import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const defaultSite = {
  profile: {
    name: "Alex Morgan",
    email: "hello@frameform.studio",
    phone: "+1 (212) 555-0148",
    location: "Brooklyn, NY · Working everywhere",
    instagram: "",
    whatsapp: "",
    heroImage: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=85",
    aboutEyebrow: "A little about me",
    aboutTitleFirst: "Good stories",
    aboutTitleSecond: "make you",
    aboutTitleAccent: "feel.",
    bio: "I’m a freelance video editor and photographer who loves the small details: the light just before sunset, a cut that lands perfectly, and the honest moments in between. I partner with people and brands to make thoughtful films and images with a point of view.",
    aboutService1: "Video editing",
    aboutService2: "Photography",
    aboutService3: "Creative direction",
    aboutImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=85",
    aboutImageAlt: "A camera ready for a photo shoot",
    aboutCaption: "Behind the scenes, always.",
  },
  projects: [
    { id: "after-the-light", title: "After the Light", category: "Film", year: "2025", description: "An intimate portrait of artists finding their way home.", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
    { id: "saltwater-days", title: "Saltwater Days", category: "Photography", year: "2025", description: "A summer spent slowing down along the coast.", image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85", video: "" },
    { id: "objects-of-ritual", title: "Objects of Ritual", category: "Campaign", year: "2024", description: "A tactile campaign for things made to last.", image: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1200&q=85", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
    { id: "the-long-way", title: "The Long Way", category: "Film", year: "2024", description: "A short film about taking the scenic route.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
    { id: "soft-geometry", title: "Soft Geometry", category: "Photography", year: "2024", description: "Shapes, shadows and still life in natural light.", image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85", video: "" },
    { id: "open-country", title: "Open Country", category: "Campaign", year: "2023", description: "An open-road campaign for a more considered pace.", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85", video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  ],
};

const projectsRef = collection(db, "projects");
const profileRef = doc(db, "settings", "profile");
const initializationRef = doc(db, "settings", "initialized");
let site = { profile: {}, projects: [] };
let toastTimeout;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderProjects() {
  const list = document.querySelector("#admin-project-list");
  const count = String(site.projects.length).padStart(2, "0");
  document.querySelector("#project-count").textContent = count;
  document.querySelector("#heading-count").textContent = count;
  document.querySelector("#projects-empty").hidden = site.projects.length > 0;
  list.innerHTML = site.projects.map((project) => `
    <article class="project-row">
      <img class="project-thumb" src="${escapeHtml(project.image)}" alt="" loading="lazy" />
      <div>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <span class="row-tag">${escapeHtml(project.category)} · ${escapeHtml(project.year)}</span>
      </div>
      <div class="row-actions">
        <button type="button" data-edit="${escapeHtml(project.id)}">Edit</button>
        <button class="delete-project" type="button" data-delete="${escapeHtml(project.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function fillProfileForm(profile) {
  const form = document.querySelector("#profile-form");
  for (const [key, value] of Object.entries(profile)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value ?? "";
  }
}

async function initializeFirebaseData() {
  await runTransaction(db, async (transaction) => {
    const initialized = await transaction.get(initializationRef);
    if (initialized.exists()) return;

    transaction.set(initializationRef, { initializedAt: Date.now() });
    transaction.set(profileRef, defaultSite.profile);
    defaultSite.projects.forEach(({ id, ...project }, index) => {
      transaction.set(doc(projectsRef, id), {
        ...project,
        order: index,
        timestamp: serverTimestamp(),
      });
    });
  });
}

async function loadSite() {
  await initializeFirebaseData();
  const [profileSnapshot, projectsSnapshot] = await Promise.all([
    getDoc(profileRef),
    getDocs(projectsRef),
  ]);
  site.profile = {
    ...defaultSite.profile,
    ...(profileSnapshot.exists() ? profileSnapshot.data() : {}),
  };
  site.projects = projectsSnapshot.docs
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  fillProfileForm(site.profile);
  renderProjects();
}

const profileForm = document.querySelector("#profile-form");
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const saveButton = profileForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  try {
    site.profile = Object.fromEntries(new FormData(profileForm).entries());
    await setDoc(profileRef, site.profile);
    document.querySelector("#profile-saved").textContent = "SAVED JUST NOW";
    showToast("Profile and contact details saved.");
  } catch (error) {
    console.error("Could not save profile to Firestore:", error);
    showToast("Could not save profile. Check your Firebase connection and rules.");
  } finally {
    saveButton.disabled = false;
  }
});

const editor = document.querySelector("#project-editor");
const projectForm = document.querySelector("#project-form");

function editProject(project) {
  projectForm.reset();
  document.querySelector("#editor-title").textContent = project ? "Edit project" : "Add a project";
  projectForm.elements.namedItem("id").value = project?.id ?? "";
  for (const key of ["title", "category", "year", "description", "image", "video"]) {
    const field = projectForm.elements.namedItem(key);
    if (field && project) field.value = project[key] ?? "";
  }
  editor.showModal();
}

document.querySelector("#add-project").addEventListener("click", () => editProject());
document.querySelector("#admin-project-list").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const project = site.projects.find((item) => item.id === editButton.dataset.edit);
    if (project) editProject(project);
  } else if (deleteButton) {
    const project = site.projects.find((item) => item.id === deleteButton.dataset.delete);
    if (!project || !window.confirm(`Delete “${project.title}” from the portfolio?`)) return;
    deleteButton.disabled = true;
    try {
      await deleteDoc(doc(projectsRef, project.id));
      site.projects = site.projects.filter((item) => item.id !== project.id);
      renderProjects();
      showToast("Project deleted.");
    } catch (error) {
      console.error("Could not delete project from Firestore:", error);
      showToast("Could not delete project. Check your Firebase connection and rules.");
      deleteButton.disabled = false;
    }
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(projectForm).entries());

  const existingProject = site.projects.find((item) => item.id === values.id);
  const id = values.id || `${values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
  const saveButton = projectForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;

  try {
    const project = {
      id,
      title: values.title,
      category: values.category,
      year: values.year,
      description: values.description,
      image: values.image,
      video: values.video,
      order: existingProject?.order ?? Math.min(0, ...site.projects.map((item) => item.order ?? 0)) - 1,
      timestamp: serverTimestamp(),
    };
    await setDoc(doc(projectsRef, id), project);
    site.projects = [
      project,
      ...site.projects.filter((item) => item.id !== id),
    ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderProjects();
    editor.close();
    showToast(existingProject ? "Project updated." : "Project added.");
  } catch (error) {
    console.error("Could not save project to Firebase:", error);
    showToast("Could not save project. Check your Firebase connection and rules.");
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelectorAll(".close-editor").forEach((button) => {
  button.addEventListener("click", () => editor.close());
});
editor.addEventListener("click", (event) => {
  if (event.target === editor) editor.close();
});

document.querySelector("#reset-site").addEventListener("click", async () => {
  if (!window.confirm("Restore the original demo projects and profile in Firebase? This replaces the current content for every visitor.")) return;
  const resetButton = document.querySelector("#reset-site");
  resetButton.disabled = true;
  try {
    const currentProjects = await getDocs(projectsRef);
    const batch = writeBatch(db);
    currentProjects.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    batch.set(profileRef, defaultSite.profile);
    defaultSite.projects.forEach(({ id, ...project }, index) => {
      batch.set(doc(projectsRef, id), {
        ...project,
        order: index,
        timestamp: serverTimestamp(),
      });
    });
    await batch.commit();
    site = {
      profile: { ...defaultSite.profile },
      projects: defaultSite.projects.map((project, order) => ({ ...project, order })),
    };
    fillProfileForm(site.profile);
    renderProjects();
    showToast("Demo content restored in Firebase.");
  } catch (error) {
    console.error("Could not restore demo content in Firebase:", error);
    showToast("Could not restore demo content. Check your Firebase connection and rules.");
  } finally {
    resetButton.disabled = false;
  }
});

const loginOverlay = document.querySelector("#login-overlay");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const adminDashboard = document.querySelector("#admin-dashboard");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const signInButton = loginForm.querySelector('button[type="submit"]');
  const { email, password } = Object.fromEntries(new FormData(loginForm).entries());
  signInButton.disabled = true;
  loginError.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Could not sign in to the admin panel:", error);
    loginError.textContent = error.code === "auth/too-many-requests"
      ? "Too many sign-in attempts. Please wait and try again."
      : "Sign-in failed. Check your email and password, then try again.";
    loginError.hidden = false;
  } finally {
    signInButton.disabled = false;
  }
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Could not sign out of the admin panel:", error);
    showToast("Could not sign out. Please try again.");
  }
});

onAuthStateChanged(auth, async (user) => {
  adminDashboard.hidden = !user;
  loginOverlay.hidden = Boolean(user);
  loginError.hidden = true;
  if (!user) return;

  loginForm.reset();
  try {
    await loadSite();
  } catch (error) {
    console.error("Could not load portfolio data from Firebase:", error);
    showToast("Could not load Firebase data. Verify Firestore is enabled and its rules allow access.");
  }
}, (error) => {
  console.error("Could not verify Firebase Authentication state:", error);
  adminDashboard.hidden = true;
  loginOverlay.hidden = false;
  loginError.textContent = "Could not verify your sign-in. Refresh the page and try again.";
  loginError.hidden = false;
});
