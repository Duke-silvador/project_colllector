/* Sticky TOC + expand/collapse analysis details + people/calendar progressive disclosure */
(function () {
  const toc = document.getElementById("toc");
  if (toc) {
    const links = Array.from(toc.querySelectorAll('a[href^="#"]'));
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    function setActive(id) {
      links.forEach((a) => {
        a.classList.toggle("active", a.getAttribute("href") === "#" + id);
      });
    }

    if ("IntersectionObserver" in window && sections.length) {
      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible[0] && visible[0].target.id) setActive(visible[0].target.id);
        },
        { rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] }
      );
      sections.forEach((s) => io.observe(s));
    }

    links.forEach((a) => {
      a.addEventListener("click", () => {
        const id = a.getAttribute("href").slice(1);
        setActive(id);
      });
    });
  }

  function allDetails(root) {
    return Array.from((root || document).querySelectorAll("details.analysis-details"));
  }

  document.querySelectorAll("[data-expand-all]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const scope = btn.getAttribute("data-expand-all");
      const root = scope ? document.querySelector(scope) : document;
      allDetails(root).forEach((d) => { d.open = true; });
    });
  });
  document.querySelectorAll("[data-collapse-all]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const scope = btn.getAttribute("data-collapse-all");
      const root = scope ? document.querySelector(scope) : document;
      allDetails(root).forEach((d) => { d.open = false; });
    });
  });

  /* Progressive disclosure: tap/click toggle for people chips & calendar rows (esp. touch) */
  function closeOthers(selector, current) {
    document.querySelectorAll(selector + ".is-open").forEach((el) => {
      if (el !== current) el.classList.remove("is-open");
    });
  }

  document.querySelectorAll(".person").forEach((el) => {
    el.addEventListener("click", (e) => {
      // Allow links inside tip to work without toggling closed immediately
      if (e.target.closest("a")) return;
      const open = el.classList.contains("is-open");
      closeOthers(".person", el);
      el.classList.toggle("is-open", !open);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") el.classList.remove("is-open");
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const open = el.classList.contains("is-open");
        closeOthers(".person", el);
        el.classList.toggle("is-open", !open);
      }
    });
  });

  document.querySelectorAll(".cal-hover").forEach((el) => {
    el.addEventListener("click", () => {
      const open = el.classList.contains("is-open");
      closeOthers(".cal-hover", el);
      el.classList.toggle("is-open", !open);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") el.classList.remove("is-open");
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const open = el.classList.contains("is-open");
        closeOthers(".cal-hover", el);
        el.classList.toggle("is-open", !open);
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".person") && !e.target.closest(".cal-hover")) {
      document.querySelectorAll(".person.is-open, .cal-hover.is-open").forEach((el) => {
        el.classList.remove("is-open");
      });
    }
  });
})();
