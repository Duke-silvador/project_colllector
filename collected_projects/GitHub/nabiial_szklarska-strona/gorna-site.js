(() => {
  "use strict";

  const lang = ["pl", "en", "de"].includes(document.documentElement.lang)
    ? document.documentElement.lang : "pl";
  const ui = {
    pl: {
      previous: "Poprzednie zdjęcie", next: "Następne zdjęcie",
      close: "Zamknij zdjęcie", placeholder: "Miejsce na zdjęcie", photo: "Zdjęcie",
      formNotConfigured: "Formularz jest przygotowany, ale wysyłka nie została jeszcze podłączona. Wiadomość nie została wysłana.",
      formSending: "Wysyłanie wiadomości…", formSuccess: "Dziękujemy. Twoja wiadomość została wysłana.",
      formError: "Nie udało się wysłać wiadomości. Spróbuj ponownie później."
    },
    en: {
      previous: "Previous photo", next: "Next photo",
      close: "Close photo", placeholder: "Photo placeholder", photo: "Photo",
      formNotConfigured: "The form is ready, but email delivery has not been connected yet. Your message has not been sent.",
      formSending: "Sending your message…", formSuccess: "Thank you. Your message has been sent.",
      formError: "Your message could not be sent. Please try again later."
    },
    de: {
      previous: "Vorheriges Foto", next: "Nächstes Foto",
      close: "Foto schließen", placeholder: "Platzhalter für Foto", photo: "Foto",
      formNotConfigured: "Das Formular ist vorbereitet, aber der E-Mail-Versand ist noch nicht eingerichtet. Ihre Nachricht wurde nicht gesendet.",
      formSending: "Nachricht wird gesendet…", formSuccess: "Vielen Dank. Ihre Nachricht wurde gesendet.",
      formError: "Ihre Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut."
    }
  }[lang];



  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;
    const status = form.querySelector("[data-contact-status]");
    const submit = form.querySelector('button[type="submit"]');
    if (!status || !submit) return;
    const endpoint = (form.getAttribute("data-endpoint") || "").trim();

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!endpoint) {
        status.textContent = ui.formNotConfigured;
        status.hidden = false;
        return;
      }
      submit.disabled = true;
      status.textContent = ui.formSending;
      status.hidden = false;
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Contact form request failed: " + response.status);
        form.reset();
        status.textContent = ui.formSuccess;
      } catch (error) {
        console.error("[Gorna 22] Contact form submission failed.", error);
        status.textContent = ui.formError;
      } finally {
        submit.disabled = false;
      }
    });
  }

  initContactForm();

  function initLanguageSwitcher() {
    const root = document.querySelector("[data-language-switch]");
    if (!root) return;
    const trigger = root.querySelector(".gorna-language-trigger");
    const panel = root.querySelector(".gorna-language-panel");
    if (!trigger || !panel) return;
    const links = Array.from(panel.querySelectorAll("a"));
    const isOpen = () => trigger.getAttribute("aria-expanded") === "true";

    function open(focusFirst) {
      root.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      panel.removeAttribute("inert");
      if (focusFirst && links[0]) links[0].focus();
    }

    function close(restoreFocus) {
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("inert", "");
      if (restoreFocus) trigger.focus();
    }

    trigger.addEventListener("click", () => {
      if (isOpen()) close(false);
      else open(false);
    });
    trigger.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); open(true); }
    });
    panel.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); close(true); return; }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const current = links.indexOf(document.activeElement);
      const next = (current + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      if (links[next]) links[next].focus();
    });
    document.addEventListener("pointerdown", event => {
      if (isOpen() && !root.contains(event.target)) close(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && isOpen()) close(true);
    });
  }

  initLanguageSwitcher();

  function makePlaceholder(item, index) {
    const el = document.createElement("div");
    el.className = "gorna-slide-placeholder";
    const title = document.createElement("strong");
    title.textContent = item.alt?.[lang] || (ui.photo + " " + String(index + 1).padStart(2, "0"));
    const note = document.createElement("span");
    note.textContent = ui.placeholder;
    const path = document.createElement("code");
    path.textContent = String(item.src || "").replace(/^\//, "");
    el.append(title, note, path);
    return el;
  }

  function createLightbox(slides) {
    const dialog = document.createElement("div");
    dialog.className = "gorna-image-lightbox";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", ui.photo);
    dialog.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.className = "gorna-image-lightbox__image";
    image.alt = "";

    const close = document.createElement("button");
    close.className = "gorna-image-lightbox__button gorna-image-lightbox__close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", ui.close);

    const previous = document.createElement("button");
    previous.className = "gorna-image-lightbox__button gorna-image-lightbox__previous";
    previous.type = "button";
    previous.textContent = "‹";
    previous.setAttribute("aria-label", ui.previous);

    const next = document.createElement("button");
    next.className = "gorna-image-lightbox__button gorna-image-lightbox__next";
    next.type = "button";
    next.textContent = "›";
    next.setAttribute("aria-label", ui.next);

    const counter = document.createElement("span");
    counter.className = "gorna-image-lightbox__counter";

    dialog.append(image, close, previous, next, counter);
    document.body.appendChild(dialog);

    let active = 0;
    let returnFocus = null;
    let oldOverflow = "";

    function render() {
      active = (active + slides.length) % slides.length;
      const item = slides[active];
      image.src = item.src;
      image.alt = item.alt?.[lang] || (ui.photo + " " + (active + 1));
      counter.textContent = (active + 1) + " / " + slides.length;
    }

    function open(index, trigger) {
      returnFocus = trigger || document.activeElement;
      oldOverflow = document.body.style.overflow;
      active = index;
      render();
      dialog.classList.add("is-open");
      dialog.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      close.focus();
    }

    function shut() {
      dialog.classList.remove("is-open");
      dialog.setAttribute("aria-hidden", "true");
      image.removeAttribute("src");
      document.body.style.overflow = oldOverflow;
      if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
    }

    close.addEventListener("click", shut);
    previous.addEventListener("click", () => { active--; render(); });
    next.addEventListener("click", () => { active++; render(); });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) shut();
    });
    document.addEventListener("keydown", event => {
      if (!dialog.classList.contains("is-open")) return;
      if (event.key === "Escape") { event.preventDefault(); shut(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); active--; render(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); active++; render(); }
    });

    return { open };
  }

  function initGallery(config) {
    const root = document.querySelector("[data-gorna-gallery]");
    if (!root) return;

    const track = root.querySelector(".gorna-carousel-track");
    const counter = root.querySelector(".gorna-carousel-counter");
    const previous = root.querySelector(".gorna-carousel-prev");
    const next = root.querySelector(".gorna-carousel-next");
    const slides = Array.isArray(config.residenceGallery) ? config.residenceGallery.filter(x => x && x.src) : [];
    if (!track || !previous || !next || !slides.length) return;

    previous.setAttribute("aria-label", ui.previous);
    next.setAttribute("aria-label", ui.next);
    track.replaceChildren();

    const lightbox = createLightbox(slides);
    slides.forEach((item, index) => {
      const slide = document.createElement("div");
      slide.className = "gorna-carousel-slide";

      const image = document.createElement("img");
      image.loading = "eager";
      image.decoding = "async";
      image.alt = item.alt?.[lang] || (ui.photo + " " + (index + 1));
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-label", image.alt + " — " + ui.photo);
      image.addEventListener("error", () => {
        slide.replaceChildren(makePlaceholder(item, index));
      }, { once: true });
      image.addEventListener("click", () => lightbox.open(index, image));
      image.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          lightbox.open(index, image);
        }
      });
      image.src = item.src;
      slide.appendChild(image);
      track.appendChild(slide);
    });

    let current = 0;
    const render = () => {
      track.style.transform = "translate3d(-" + (current * 100) + "%,0,0)";
      if (counter) counter.textContent = (current + 1) + " / " + slides.length;
      previous.disabled = current === 0;
      next.disabled = current === slides.length - 1;
    };

    previous.addEventListener("click", () => { current = Math.max(0, current - 1); render(); });
    next.addEventListener("click", () => { current = Math.min(slides.length - 1, current + 1); render(); });
    render();
  }

  function initMap(config) {
    const mapImage = document.getElementById("gorna-kieg-map");
    const mapOverlay = document.getElementById("gorna-parcel-overlay");
    const mapShapes = document.getElementById("gorna-parcel-shapes");
    const mapLoading = document.getElementById("gorna-kieg-map-loading");
    const mapFallback = document.getElementById("gorna-kieg-map-fallback");

    if (mapImage && mapOverlay && mapShapes && mapLoading && mapFallback) {
      const MAP_WIDTH = 1200;
      const MAP_HEIGHT = 720;
      const NS = "http://www.w3.org/2000/svg";

      function showMapError(error) {
        console.error("[Gorna 22] Could not load the cadastral parcel map.", error);
        mapImage.hidden = true;
        mapOverlay.hidden = true;
        mapLoading.hidden = true;
        mapFallback.hidden = false;
      }

      function drawParcelGeometry(data) {
        if (!data || !Array.isArray(data.polygons) || !data.polygons.length || !Array.isArray(data.bbox)) {
          throw new Error("The cadastral service returned no parcel geometry.");
        }
        const [minX, minY, maxX, maxY] = data.bbox.map(Number);
        if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) {
          throw new Error("The parcel extent is invalid.");
        }

        const parcelWidth = maxX - minX;
        const parcelHeight = maxY - minY;
        const targetWidth = Math.max(parcelWidth * 1.5, parcelHeight * (MAP_WIDTH / MAP_HEIGHT) * 1.5, 160);
        const targetHeight = targetWidth * MAP_HEIGHT / MAP_WIDTH;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const view = {
          minX: centerX - targetWidth / 2,
          minY: centerY - targetHeight / 2,
          maxX: centerX + targetWidth / 2,
          maxY: centerY + targetHeight / 2
        };

        const pathFromRings = rings => rings.map(ring => {
          if (!Array.isArray(ring) || ring.length < 3) return "";
          return ring.map((point, index) => {
            const x = ((Number(point[0]) - view.minX) / targetWidth) * MAP_WIDTH;
            const y = ((view.maxY - Number(point[1])) / targetHeight) * MAP_HEIGHT;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
            return (index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
          }).join(" ") + " Z";
        }).join(" ");

        mapShapes.replaceChildren();
        data.polygons.forEach(polygon => {
          const path = document.createElementNS(NS, "path");
          path.setAttribute("d", pathFromRings(polygon));
          path.setAttribute("fill-rule", "evenodd");
          path.setAttribute("aria-label", "Granica działki 020604_1.0002.236/13");
          mapShapes.appendChild(path);
        });

        const params = new URLSearchParams({
          SERVICE: "WMS",
          REQUEST: "GetMap",
          VERSION: "1.1.1",
          LAYERS: "dzialki,numery_dzialek,budynki",
          STYLES: "",
          SRS: "EPSG:2180",
          BBOX: [view.minX, view.minY, view.maxX, view.maxY].map(value => value.toFixed(2)).join(","),
          WIDTH: String(MAP_WIDTH),
          HEIGHT: String(MAP_HEIGHT),
          FORMAT: "image/png",
          TRANSPARENT: "FALSE"
        });
        const wmsUrl = "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?" + params.toString();

        mapImage.onload = () => {
          mapLoading.hidden = true;
          mapFallback.hidden = true;
          mapImage.hidden = false;
          mapOverlay.hidden = false;
        };
        mapImage.onerror = () => showMapError(new Error("The KIEG WMS map image could not be loaded."));
        mapImage.src = wmsUrl;
      }

      fetch("/api/parcel", { headers: { "Accept": "application/json" }, cache: "no-store" })
        .then(response => {
          if (!response.ok) throw new Error("Parcel API returned HTTP " + response.status);
          return response.json();
        })
        .then(drawParcelGeometry)
        .catch(showMapError);
    }

    document.querySelectorAll("[data-gorna-link]").forEach(link => {
      const key = link.getAttribute("data-gorna-link");
      if (typeof config[key] === "string" && config[key]) link.href = config[key];
    });
  }

  function fallbackGallery() {
    const track = document.querySelector("[data-gorna-gallery] .gorna-carousel-track");
    if (!track) return;
    const slides = Array.from(track.querySelectorAll("img")).map(img => ({
      src: img.getAttribute("src"),
      alt: {
        pl: img.getAttribute("alt") || "",
        en: img.getAttribute("data-alt-en") || img.getAttribute("alt") || "",
        de: img.getAttribute("data-alt-de") || img.getAttribute("alt") || ""
      }
    })).filter(item => item.src);
    if (slides.length) initGallery({ residenceGallery: slides });
  }

  fetch("/data/site-config.json?v=20261025d", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Config unavailable: HTTP " + response.status);
      return response.json();
    })
    .then(config => { initGallery(config); initMap(config); })
    .catch(error => {
      console.error("[Gorna 22] Could not load site configuration.", error);
      fallbackGallery();
      initMap({});
    });
})();
