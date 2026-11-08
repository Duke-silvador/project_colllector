/* BTK Synergyworks — main.js
   Carousel + mobile nav + contact form.
   Submissions are stored in localStorage under "btk_submissions"
   (newest first) until server-side functionality is activated. */
(function () {
  "use strict";

  /* ---------- Mobile nav ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.getElementById("main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Hero carousel ---------- */
  var carousel = document.getElementById("hero-carousel");
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".carousel-slide"));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll(".carousel-dot"));
    var prevBtn = carousel.querySelector(".carousel-prev");
    var nextBtn = carousel.querySelector(".carousel-next");
    var current = 0;
    var timer = null;
    var DELAY_MS = 6000;

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.classList.toggle("is-active", i === current);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === current);
        d.setAttribute("aria-selected", i === current ? "true" : "false");
      });
    }
    function next() { show(current + 1); }
    function prev() { show(current - 1); }
    function startAuto() {
      stopAuto();
      timer = window.setInterval(next, DELAY_MS);
    }
    function stopAuto() {
      if (timer !== null) { window.clearInterval(timer); timer = null; }
    }

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); startAuto(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); startAuto(); });
    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        show(parseInt(d.getAttribute("data-slide"), 10));
        startAuto();
      });
    });
    carousel.addEventListener("mouseenter", stopAuto);
    carousel.addEventListener("mouseleave", startAuto);
    carousel.addEventListener("focusin", stopAuto);
    carousel.addEventListener("focusout", startAuto);
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { next(); startAuto(); }
      if (e.key === "ArrowLeft") { prev(); startAuto(); }
    });
    // Touch swipe
    var touchX = null;
    carousel.addEventListener("touchstart", function (e) {
      touchX = e.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); startAuto(); }
      touchX = null;
    }, { passive: true });

    startAuto();
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contact-form");
  var popup = document.getElementById("submit-popup");
  var popupSummary = document.getElementById("popup-summary");
  var popupClose = document.getElementById("popup-close");
  var STORAGE_KEY = "btk_submissions";

  function setError(inputId, errorId, bad) {
    var input = document.getElementById(inputId);
    var err = document.getElementById(errorId);
    if (!input || !err) return;
    input.setAttribute("aria-invalid", bad ? "true" : "false");
    err.hidden = !bad;
  }

  function loadSubmissions() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function closePopup() {
    if (popup) popup.hidden = true;
    if (form) form.querySelector("button[type=submit]").focus();
  }
  if (popupClose) popupClose.addEventListener("click", closePopup);
  if (popup) {
    popup.addEventListener("click", function (e) {
      if (e.target === popup) closePopup();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && popup && !popup.hidden) closePopup();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("f-name").value.trim();
      var company = document.getElementById("f-company").value.trim();
      var email = document.getElementById("f-email").value.trim();
      var type = document.getElementById("f-type").value;
      var service = document.getElementById("f-service").value;
      var details = document.getElementById("f-details").value.trim();

      var nameBad = name.length === 0;
      var emailBad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      var typeBad = type === "";
      var serviceBad = service === "";
      var detailsBad = details.length === 0;

      setError("f-name", "err-name", nameBad);
      setError("f-email", "err-email", emailBad);
      setError("f-type", "err-type", typeBad);
      setError("f-service", "err-service", serviceBad);
      setError("f-details", "err-details", detailsBad);

      if (nameBad || emailBad || typeBad || serviceBad || detailsBad) {
        var firstBad = document.querySelector("[aria-invalid='true']");
        if (firstBad) firstBad.focus();
        return;
      }

      var submission = {
        id: "sub-" + Date.now().toString(36),
        date: new Date().toISOString(),
        name: name,
        company: company,
        email: email,
        requestType: type,
        service: service,
        details: details,
        status: "new"
      };
      var list = loadSubmissions();
      list.unshift(submission); // newest first
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        /* Storage full/blocked: still show the popup so the visitor
           can copy their request; nothing is emailed anywhere. */
      }

      // Popup above the form showing exactly what was submitted.
      var rows = [
        ["Name", submission.name],
        ["Company", submission.company || "—"],
        ["Email", submission.email],
        ["Request type", submission.requestType],
        ["Service needed", submission.service],
        ["Project details", submission.details],
        ["Submitted", new Date(submission.date).toLocaleString()]
      ];
      popupSummary.innerHTML = "";
      rows.forEach(function (row) {
        var div = document.createElement("div");
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        div.appendChild(dt);
        div.appendChild(dd);
        popupSummary.appendChild(div);
      });
      popup.hidden = false;
      popupClose.focus();
      form.reset();
    });

    // Clear a field's error as the visitor fixes it.
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        el.setAttribute("aria-invalid", "false");
        var errId = "err-" + el.id.replace("f-", "");
        var err = document.getElementById(errId);
        if (err) err.hidden = true;
      });
    });
  }
})();
