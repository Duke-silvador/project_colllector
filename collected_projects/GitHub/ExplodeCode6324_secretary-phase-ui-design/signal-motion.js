/* Source geometry is immutable. The visible image is masked and reassembled. */
(function (root) {
  const NS = "http://www.w3.org/2000/svg";
  let serial = 0;
  function plan(shape, size, scheme = -1, random = Math.random) {
    const fixed = scheme >= 0;
    const kind = fixed ? Math.min(3, scheme) : Math.floor(random() * 3);
    const variation = fixed ? 0.5 : random();
    const direction = fixed ? 1 : random() < 0.5 ? -1 : 1;
    const small = size <= 18;
    const region =
      shape.regions[fixed ? 0 : Math.floor(random() * shape.regions.length)];
    const bands = {
      attention: 12,
      search: 10,
      tasks: 11,
      send: 11,
      chat: 10,
      memory: 12,
      file: 10,
      settings: 8,
      plus: 10,
      check: 12,
      arrow: 11,
      motion: 10,
      close: 10,
    };
    return {
      kind,
      duration: small ? 140 : [160, 180, 200, 0][kind],
      band: {
        x: -4,
        y:
          (bands[shape.name] || 11) +
          (fixed ? 0 : Math.floor(variation * 3) - 1),
        width: 32,
        height: small ? 3 : 4,
      },
      dx: (direction * (small ? 1 : 2.4) * 24) / Math.max(size, 1),
      dropout: {
        d: shape.body[region[0]],
        start: region[1],
        length: small ? 10 : 12 + Math.round(variation * 6),
      },
      residueWidth: fixed ? 1 : variation < 0.5 ? 0.7 : 1.8,
    };
  }
  function el(document, tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, String(value));
    return node;
  }
  // The only full source image is hidden by the caller. All visible copies are clipped/masked.
  function mountFaultFrame(
    document,
    layer,
    paths,
    sample,
    bounds,
    animate,
    residue = false,
    strokeWidth = 1.5,
  ) {
    const id = `phase-${++serial}`;
    const defs = el(document, "defs");
    layer.append(defs);
    const maskAttrs = {
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse",
      x: -8,
      y: -8,
      width: bounds.width + 16,
      height: bounds.height + 16,
      style: "mask-type:luminance",
    };
    const makeMask = (suffix) => {
      const m = el(document, "mask", { ...maskAttrs, id: id + suffix });
      m.append(
        el(document, "rect", {
          x: -8,
          y: -8,
          width: bounds.width + 16,
          height: bounds.height + 16,
          fill: "white",
          stroke: "none",
        }),
      );
      defs.append(m);
      return m;
    };
    const baseMask = makeMask("-base");
    const hasSlice = sample.kind === 0 || sample.kind === 2;
    const hasDropout = sample.kind === 1 || sample.kind === 2;
    const draw = (parent) =>
      paths.forEach((d) =>
        parent.append(
          el(document, "path", {
            d,
            fill: sample.fill || "none",
            stroke: "currentColor",
            "stroke-width": strokeWidth,
            "stroke-linejoin": "round",
            "stroke-linecap": "round",
          }),
        ),
      );
    const addDropout = (mask) => {
      const hole = el(document, "path", {
        d: sample.dropout.d,
        fill: "none",
        stroke: "black",
        "stroke-width": strokeWidth + 1.5,
        pathLength: 100,
        "stroke-dasharray": `0 ${sample.dropout.start} ${sample.dropout.length} 100`,
        "stroke-linecap": "butt",
        class: "dropout-hole",
      });
      mask.append(hole);
      animate(
        hole,
        [
          { opacity: 1, offset: 0 },
          { opacity: 0, offset: 0.45 },
          { opacity: 1, offset: 0.6 },
          { opacity: 0, offset: 1 },
        ],
        sample.duration,
      );
    };
    if (hasDropout) addDropout(baseMask);
    const base = el(document, "g", {
      mask: `url(#${id}-base)`,
      class: "rendered-base",
    });
    draw(base);
    layer.append(base);
    if (hasSlice) {
      const cut = el(document, "rect", {
        ...sample.band,
        fill: "black",
        stroke: "none",
        class: "source-gap",
      });
      baseMask.append(cut);
      const clip = el(document, "clipPath", {
        id: id + "-slice",
        clipPathUnits: "userSpaceOnUse",
      });
      clip.append(el(document, "rect", { ...sample.band }));
      defs.append(clip);
      const moved = el(document, "g", { class: "displaced-slice" });
      const cropped = el(document, "g", { "clip-path": `url(#${id}-slice)` });
      if (hasDropout) {
        const dropMask = makeMask("-drop");
        addDropout(dropMask);
        cropped.setAttribute("mask", `url(#${id}-drop)`);
      }
      draw(cropped);
      moved.append(cropped);
      layer.append(moved);
      const dx = sample.dx,
        dy = sample.dy || 0;
      const frames = [
        { transform: `translate(${dx}px,${dy}px)`, offset: 0 },
        { transform: "translate(0px,0px)", offset: 0.48 },
        { transform: `translate(${dx * 0.5}px,${dy}px)`, offset: 0.64 },
        { transform: "translate(0px,0px)", offset: 1 },
      ];
      animate(moved, frames, sample.duration);
      if (residue) {
        const echo = el(document, "g", {
          "clip-path": `url(#${id}-slice)`,
          class: "signal-residue",
          color: "var(--light-blue)",
        });
        paths.forEach((d) =>
          echo.append(
            el(document, "path", {
              d,
              fill: "none",
              stroke: "currentColor",
              "stroke-width": sample.residueWidth,
            }),
          ),
        );
        layer.append(echo);
        animate(
          echo,
          [
            {
              opacity: 0.45,
              transform: `translate(${-dx / 2}px,0px)`,
              offset: 0,
            },
            { opacity: 0, transform: "translate(0px,0px)", offset: 0.5 },
            { opacity: 0, offset: 1 },
          ],
          sample.duration,
        );
      }
    }
  }
  function secondFrame(sample, bounds) {
    return {
      ...sample,
      band: sample.secondBand || {
        ...sample.band,
        y: Math.min(
          bounds.height - sample.band.height - 1,
          sample.band.y + sample.band.height + 2,
        ),
      },
      dx: -sample.dx * 0.75,
      dy: -(sample.dy || 0),
      dropout: sample.dropout
        ? {
            ...sample.dropout,
            start: (sample.dropout.start + 29) % (100 - sample.dropout.length),
          }
        : undefined,
    };
  }
  function thirdFrame(sample, bounds) {
    return {
      ...sample,
      band: sample.thirdBand || {
        ...sample.band,
        y: Math.max(0, sample.band.y - sample.band.height - 2),
        height: Math.max(2, sample.band.height * 0.7),
      },
      dx: sample.dx * 0.5,
      dy: 0,
      dropout: sample.dropout
        ? {
            ...sample.dropout,
            start: (sample.dropout.start + 57) % (100 - sample.dropout.length),
          }
        : undefined,
    };
  }
  function mountFault(
    document,
    layer,
    paths,
    sample,
    bounds,
    animate,
    residue = false,
    strokeWidth = 1.5,
  ) {
    const samples = [sample, secondFrame(sample, bounds)];
    if (sample.frameCount !== 2) samples.push(thirdFrame(sample, bounds));
    const step = 0.8 / samples.length;
    samples.forEach((frame, index) => {
      const group = el(document, "g", {
        "data-phase-frame": index + 1,
        class: "fault-frame",
      });
      group.style.opacity = index === 0 ? "1" : "0";
      layer.append(group);
      // Each logical frame is a different static reconstruction, not an eased return of frame one.
      mountFaultFrame(
        document,
        group,
        paths,
        frame,
        bounds,
        (node, frames) => {
          for (const [key, value] of Object.entries(frames[0]))
            if (key !== "offset") node.style[key] = String(value);
        },
        residue,
        strokeWidth,
      );
      animate(
        group,
        [
          { opacity: index === 0 ? 1 : 0, offset: 0 },
          ...(index ? [{ opacity: 1, offset: index * step }] : []),
          { opacity: 0, offset: (index + 1) * step },
          { opacity: 0, offset: 1 },
        ],
        sample.duration,
      );
    });
    const resolved = el(document, "g", { class: "resolved-display" });
    resolved.style.opacity = "0";
    paths.forEach((d) =>
      resolved.append(
        el(document, "path", {
          d,
          fill: sample.fill || "none",
          stroke: "currentColor",
          "stroke-width": strokeWidth,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      ),
    );
    layer.append(resolved);
    animate(
      resolved,
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.8 },
        { opacity: 1, offset: 1 },
      ],
      sample.duration,
    );
  }
  function createController({
    document,
    window,
    geometry,
    onSample = () => {},
  }) {
    const active = new Map();
    let contacts = new WeakMap(),
      fixedScheme = -1,
      monochrome = false,
      freeze = false,
      freezeFrame = 0,
      frameCount = 3;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function enabled(c) {
      return (
        c.isConnected &&
        !c.matches(':disabled,[aria-disabled="true"]') &&
        !c.closest(".static-sample") &&
        !reduced.matches &&
        !document.body.matches(
          ".plain-surface,.motion-off,.motion-reduced,.wireframe",
        )
      );
    }
    function clear(c) {
      const effect = active.get(c);
      if (!effect) return;
      active.delete(c);
      effect.animations.forEach((a) => a.cancel());
      if (effect.timer !== undefined) window.clearTimeout(effect.timer);
      effect.cleanup.forEach((fn) => fn());
      c.classList.remove(
        "is-simulating",
        "commit-pulse",
        "boundary-fault",
        "submit-fault",
        "surface-fault",
      );
      c.removeAttribute("data-fault-kind");
    }
    function clearAll() {
      for (const c of [...active.keys()]) clear(c);
      contacts = new WeakMap();
    }
    function begin(c, duration, held = false) {
      clear(c);
      if (!enabled(c)) return null;
      const effect = { animations: [], cleanup: [] };
      active.set(c, effect);
      c.classList.add("is-simulating");
      effect.animate = (node, frames, span, easing = "steps(1,end)") => {
        const discrete = easing === "steps(1,end)";
        const a = node.animate(
          discrete ? frames.map((frame) => ({ ...frame, easing })) : frames,
          {
            duration: span,
            easing: discrete ? "linear" : easing,
            fill: "both",
          },
        );
        a.finished.catch(() => {});
        effect.animations.push(a);
        if (held) {
          a.pause();
          a.currentTime = span * (((freezeFrame + 0.5) * 0.8) / frameCount);
        }
      };
      if (!held)
        effect.timer = window.setTimeout(() => {
          if (active.get(c) === effect) clear(c);
        }, duration + 20);
      return effect;
    }
    function boundary(c, navigation = false) {
      const duration = 140;
      const effect = begin(c, duration);
      if (!effect) return;
      const rect = c.getBoundingClientRect(),
        w = rect.width,
        h = rect.height;
      c.classList.add("boundary-fault");
      if (!navigation) c.classList.add("submit-fault");
      const svg = el(document, "svg", {
        viewBox: `0 0 ${w} ${h}`,
        width: w,
        height: h,
        "aria-hidden": "true",
        focusable: "false",
        class: "boundary-display",
      });
      c.append(svg);
      effect.cleanup.push(() => svg.remove());
      // Replace the genuine CSS border, not a colored layer on top of it.
      const selected = c.getAttribute("aria-current") === "page";
      const paths = navigation
        ? selected
          ? [`M0 .5H${w} M0 ${h - 0.5}H${w}`]
          : [`M${w - 0.5} 0V${h}`]
        : [`M.5 .5H${w - 0.5}V${h - 0.5}H.5Z`];
      const sample = {
        frameCount,
        kind: 0,
        duration,
        band: navigation
          ? selected
            ? { x: w * 0.2, y: -2, width: Math.min(38, w * 0.3), height: 5 }
            : { x: w - 3, y: h * 0.35, width: 6, height: 8 }
          : { x: w - 3, y: h * 0.3, width: 6, height: 16 },
        secondBand:
          navigation && selected
            ? { x: w * 0.55, y: -2, width: Math.min(30, w * 0.25), height: 5 }
            : { x: w - 3, y: h * 0.6, width: 6, height: navigation ? 8 : 16 },
        dx: navigation ? 2 : -1.5,
        dy: navigation ? 1 : 0,
      };
      mountFault(
        document,
        svg,
        paths,
        sample,
        { width: w, height: h },
        effect.animate,
        false,
        1,
      );
    }
    function sendEffect(c) {
      const effect = begin(
        c,
        420,
        freeze && c.classList.contains("study-trigger"),
      );
      if (!effect) return;
      const { width: w, height: h } = c.getBoundingClientRect();
      const svg = el(document, "svg", {
        viewBox: `0 0 ${w} ${h}`,
        class: "send-surface",
        "aria-hidden": "true",
        focusable: "false",
      });
      c.classList.add("surface-fault");
      c.append(svg);
      effect.cleanup.push(() => svg.remove());
      mountFault(
        document,
        svg,
        [`M.5 .5H${w - 0.5}V${h - 0.5}H.5Z`],
        {
          frameCount,
          kind: 0,
          duration: 160,
          band: { x: -4, y: h * 0.28, width: w + 8, height: 5 },
          secondBand: { x: -4, y: h * 0.62, width: w + 8, height: 4 },
          dx: 2,
          fill: "currentColor",
        },
        { width: w, height: h },
        effect.animate,
        false,
        1,
      );
      const glyph = c.querySelector(".glyph");
      const body = glyph?.querySelector(".icon-body");
      if (body && body.children.length >= 2) {
        effect.animate(
          body.children[0],
          [
            { transform: "scaleX(1)", opacity: 1, offset: 0 },
            { transform: "scaleX(1.4)", stroke: "var(--blue)", offset: 0.3 },
            { transform: "scaleX(.4)", opacity: 0.2, offset: 0.55 },
            { transform: "scaleX(.8)", offset: 0.75 },
            { transform: "scaleX(1)", opacity: 1, offset: 1 },
          ],
          420,
          "ease",
        );
        effect.animate(
          body.children[1],
          [
            { transform: "translateX(0)", opacity: 1, offset: 0 },
            {
              transform: "translateX(11px)",
              stroke: "var(--blue)",
              opacity: 1,
              offset: 0.35,
            },
            { transform: "translateX(16px)", opacity: 0, offset: 0.5 },
            { transform: "translateX(-8px)", opacity: 0, offset: 0.51 },
            { transform: "translateX(2px)", opacity: 1, offset: 0.75 },
            { transform: "translateX(0)", opacity: 1, offset: 1 },
          ],
          420,
          "ease",
        );
        const layer = glyph.querySelector(".signal-layer");
        const trail = el(document, "path", {
          d: "M2 8h6 M2 16h6",
          class: "send-trail",
          stroke: "var(--light-blue)",
          "stroke-width": 1,
          fill: "none",
        });
        layer.append(trail);
        effect.cleanup.push(() => layer.replaceChildren());
        effect.animate(
          trail,
          [
            { opacity: 0, transform: "translateX(0)", offset: 0 },
            { opacity: 0.7, transform: "translateX(5px)", offset: 0.3 },
            { opacity: 0, transform: "translateX(12px)", offset: 0.6 },
            { opacity: 0, transform: "translateX(0)", offset: 1 },
          ],
          420,
          "ease",
        );
      }
      onSample({
        kind: "send",
        duration: 160,
        monochrome: false,
        held: freeze && c.classList.contains("study-trigger"),
        frame: freezeFrame + 1,
      });
    }
    function identity(c) {
      const source = c.querySelector(".phase-source");
      if (!source) return;
      const effect = begin(
        c,
        180,
        freeze && c.classList.contains("study-trigger"),
      );
      if (!effect) return;
      const layer = document.createElement("span");
      layer.className = "identity-phase";
      layer.setAttribute("aria-hidden", "true");
      c.append(layer);
      source.style.visibility = "hidden";
      effect.cleanup.push(() => {
        source.style.visibility = "";
        layer.remove();
      });
      const positions = [27, 57, 12];
      const direction = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < frameCount; i++) {
        const group = document.createElement("span");
        group.className = "identity-frame";
        group.setAttribute("data-identity-frame", i + 1);
        const y = positions[i],
          height = i === 2 ? 8 : 13;
        for (const part of ["base", "slice", "echo"]) {
          const copy = document.createElement("span");
          copy.className = `identity-copy identity-${part}`;
          copy.textContent = source.textContent;
          if (part === "base") {
            copy.style.maskImage = `linear-gradient(to bottom,#000 0%,#000 ${y}%,transparent ${y}%,transparent ${y + height}%,#000 ${y + height}%,#000 100%)`;
          } else {
            copy.style.clipPath = `inset(${y}% 0 ${100 - y - height}% 0)`;
            copy.style.transform = `translateX(${direction * [1.8, -1.4, 0.8][i] * (part === "echo" ? -0.5 : 1)}px)`;
          }
          group.append(copy);
        }
        layer.append(group);
        effect.animate(
          group,
          [
            { opacity: i === 0 ? 1 : 0, offset: 0 },
            ...(i ? [{ opacity: 1, offset: (i * 0.8) / frameCount }] : []),
            { opacity: 0, offset: ((i + 1) * 0.8) / frameCount },
            { opacity: 0, offset: 1 },
          ],
          180,
        );
      }
      // Restore the original for the final 20%, without an empty frame.
      effect.animate(
        source,
        [
          { visibility: "hidden", offset: 0 },
          { visibility: "visible", offset: 0.8 },
          { visibility: "visible", offset: 1 },
        ],
        180,
      );
    }
    let dividerBox = null,
      dividerTarget = null,
      lastProbe = 0;
    const dividerCooldown = new WeakMap();
    function divider(c, edge, box, color) {
      if (!enabled(c) || fixedScheme === 3 || active.has(c)) return;
      const now = Date.now();
      if (now - (dividerCooldown.get(c) || 0) < 700) return;
      if (dividerTarget) clear(dividerTarget);
      dividerTarget = c;
      dividerBox = box;
      dividerCooldown.set(c, now);
      const effect = begin(
        c,
        150,
        freeze && c.classList.contains("divider-study"),
      );
      if (!effect) return;
      const horizontal = box.width >= box.height;
      const length = horizontal ? box.width : box.height;
      const start = length * (0.2 + Math.random() * 0.55);
      const segment = Math.min(18, length * 0.14);
      const svg = el(document, "svg", {
        viewBox: `0 0 ${box.width} ${box.height}`,
        class: "divider-phase",
        "aria-hidden": "true",
        focusable: "false",
      });
      Object.assign(svg.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        color,
      });
      document.body.append(svg);
      const prop =
        edge === "background" ? "background-color" : `border-${edge}-color`;
      const old = c.style.getPropertyValue(prop),
        priority = c.style.getPropertyPriority(prop);
      if (edge === "pseudo") c.classList.add("divider-pseudo-hidden");
      else c.style.setProperty(prop, "transparent", "important");
      effect.cleanup.push(() => {
        svg.remove();
        c.classList.remove("divider-pseudo-hidden");
        if (edge !== "pseudo") {
          if (old) c.style.setProperty(prop, old, priority);
          else c.style.removeProperty(prop);
        }
        if (dividerTarget === c) {
          dividerTarget = null;
          dividerBox = null;
        }
      });
      const band = horizontal
        ? { x: start, y: -3, width: segment, height: 7 }
        : { x: -3, y: start, width: 7, height: segment };
      const dx = (Math.random() < 0.5 ? -1 : 1) * (horizontal ? 0.5 : 1.1);
      let linePath = horizontal ? `M0 .5H${box.width}` : `M.5 0V${box.height}`;
      const selected =
        c.classList.contains("sidebar") &&
        c.querySelector('[aria-current="page"]');
      if (!horizontal && selected) {
        const r = selected.getBoundingClientRect();
        linePath = `M.5 0V${Math.max(0, r.top - box.top)} M.5 ${Math.min(box.height, r.bottom - box.top)}V${box.height}`;
      }
      mountFault(
        document,
        svg,
        [linePath],
        {
          kind: 0,
          frameCount,
          duration: 150,
          band,
          secondBand: {
            ...band,
            [horizontal ? "x" : "y"]: Math.max(0, start - segment * 1.4),
          },
          thirdBand: {
            ...band,
            [horizontal ? "x" : "y"]: Math.min(
              length - segment,
              start + segment,
            ),
          },
          dx,
          dy: horizontal ? 1 : 0,
          residueWidth: 0.7,
        },
        { width: box.width, height: box.height },
        effect.animate,
        true,
        1,
      );
    }
    function probeDivider(e) {
      if (Date.now() - lastProbe < 50) return;
      lastProbe = Date.now();
      if (dividerTarget && dividerBox) {
        const b = dividerBox;
        if (
          e.clientX >= b.left - 7 &&
          e.clientX <= b.left + b.width + 7 &&
          e.clientY >= b.top - 7 &&
          e.clientY <= b.top + b.height + 7
        )
          return;
        clear(dividerTarget);
      }
      const nav = e.target.closest?.("nav");
      if (nav)
        for (const line of nav.querySelectorAll(".nav-separator")) {
          const r = line.getBoundingClientRect();
          if (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            Math.abs(e.clientY - r.top) < 8
          ) {
            divider(
              line,
              "background",
              { left: r.left, top: r.top, width: r.width, height: 1 },
              "var(--line)",
            );
            return;
          }
        }
      let c = e.target;
      for (
        let depth = 0;
        c && c !== document.body && depth < 9;
        depth++, c = c.parentElement
      ) {
        if (c.closest?.(".glyph,.identity-phase,.divider-phase")) continue;
        const r = c.getBoundingClientRect();
        if (r.width < 40 && r.height < 40) continue;
        if (
          !c.classList.contains("nav-separator") &&
          !c.classList.contains("conversation-title") &&
          Math.min(
            Math.abs(e.clientX - r.left),
            Math.abs(e.clientX - r.right),
            Math.abs(e.clientY - r.top),
            Math.abs(e.clientY - r.bottom),
          ) > 7
        )
          continue;
        const style = window.getComputedStyle(c);
        if (c.classList.contains("nav-separator")) {
          divider(
            c,
            "background",
            { left: r.left, top: r.top, width: r.width, height: 1 },
            style.backgroundColor,
          );
          return;
        }
        if (c.classList.contains("conversation-title")) {
          const width = parseFloat(window.getComputedStyle(c, "::after").width);
          if (
            width > 0 &&
            e.clientX >= r.right - width &&
            Math.abs(e.clientY - (r.top + r.height / 2)) < 8
          ) {
            divider(
              c,
              "pseudo",
              {
                left: r.right - width,
                top: r.top + r.height / 2,
                width,
                height: 1,
              },
              "var(--line)",
            );
            return;
          }
        }
        // Actual structural borders only; controls keep their own feedback.
        if (c.matches("button,input,textarea,a,.avatar")) continue;
        for (const side of ["top", "bottom", "left", "right"]) {
          const size = parseFloat(
            style.getPropertyValue(`border-${side}-width`),
          );
          const color = style.getPropertyValue(`border-${side}-color`);
          if (
            !size ||
            size > 2 ||
            color === "transparent" ||
            color === "rgba(0, 0, 0, 0)"
          )
            continue;
          const horizontal = side === "top" || side === "bottom";
          const axis =
            side === "bottom"
              ? r.bottom - 1
              : side === "right"
                ? r.right - 1
                : side === "top"
                  ? r.top
                  : r.left;
          if (Math.abs((horizontal ? e.clientY : e.clientX) - axis) > 7)
            continue;
          divider(
            c,
            side,
            {
              left: horizontal ? r.left : axis,
              top: horizontal ? axis : r.top,
              width: horizontal ? r.width : 1,
              height: horizontal ? 1 : r.height,
            },
            color,
          );
          return;
        }
      }
      if (dividerTarget) clear(dividerTarget);
    }
    function play(c, activation = false) {
      clear(c);
      if (!enabled(c) || fixedScheme === 3) return;
      if (c.getAttribute("data-phase-type") === "identity") {
        identity(c);
        return;
      }
      // The approved v0.3 arrow is an explicit exception, owned by this same cancellable effect.
      if (c.classList.contains("send-launch")) {
        sendEffect(c);
        return;
      }
      if (
        c.closest("nav") &&
        activation &&
        c.getAttribute("aria-current") === "page"
      ) {
        boundary(c, true);
        return;
      }
      const glyph = c.querySelector(".glyph");
      if (!glyph) return;
      const name = glyph.dataset.glyph;
      const shape = { ...(geometry[name] || geometry.file), name };
      const sample = plan(
        shape,
        glyph.getBoundingClientRect().width,
        fixedScheme,
      );
      sample.frameCount = frameCount;
      const held = freeze && c.classList.contains("study-trigger");
      const effect = begin(c, sample.duration, held);
      if (!effect) return;
      c.dataset.faultKind = ["slice", "dropout", "combined"][sample.kind];
      const body = glyph.querySelector(".icon-body"),
        layer = glyph.querySelector(".signal-layer");
      body.setAttribute("visibility", "hidden");
      effect.cleanup.push(() => {
        body.removeAttribute("visibility");
        layer.replaceChildren();
      });
      mountFault(
        document,
        layer,
        shape.body,
        sample,
        { width: 24, height: 24 },
        effect.animate,
        sample.kind === 2 && !monochrome,
      );
      onSample({
        kind: sample.kind,
        duration: sample.duration,
        monochrome: monochrome || sample.kind !== 2,
        held,
        frame: freezeFrame + 1,
      });
    }
    const target = (e) => e.target.closest?.("button,a,[data-phase-type]");
    function contact(c) {
      if (!contacts.has(c)) contacts.set(c, { hover: false, focus: false });
      return contacts.get(c);
    }
    const listeners = [];
    function listen(host, type, fn, options) {
      host.addEventListener(type, fn, options);
      listeners.push(() => host.removeEventListener(type, fn, options));
    }
    listen(document, "pointerover", (e) => {
      const c = target(e);
      if (!c || c.contains(e.relatedTarget)) return;
      const s = contact(c),
        old = s.hover || s.focus;
      s.hover = true;
      if (!old) play(c);
    });
    listen(document, "focusin", (e) => {
      const c = target(e);
      if (!c || c.contains(e.relatedTarget)) return;
      const s = contact(c),
        old = s.hover || s.focus;
      s.focus = true;
      if (!old) play(c);
    });
    for (const type of ["pointerout", "focusout"])
      listen(document, type, (e) => {
        const c = target(e);
        if (c && !c.contains(e.relatedTarget)) {
          contacts.delete(c);
          clear(c);
        }
      });
    function press(e) {
      const c = target(e);
      if (!c) return;
      clear(c);
      if (c.closest("nav")) boundary(c, true);
      else play(c, true);
      contact(c).pressed = true;
    }
    listen(document, "pointerdown", press);
    listen(document, "keydown", (e) => {
      if (e.key === " " || e.key === "Enter") press(e);
    });
    listen(
      document,
      "click",
      (e) => {
        const c = target(e);
        if (c) {
          const state = contact(c);
          const continuingPress = state.pressed && active.has(c);
          state.pressed = false;
          if (!continuingPress) play(c, true);
        }
      },
      true,
    );
    for (const type of ["pointerout", "focusout"])
      listen(document, type, (e) => {
        const box = e.target.closest?.(".composer-box");
        if (box && !box.contains(e.relatedTarget)) {
          clear(box);
          if (type === "focusout") box.classList.remove("submitted-focus");
        }
      });
    listen(document, "pointermove", probeDivider);
    listen(document, "pointerleave", clearAll);
    listen(window, "resize", clearAll);
    listen(document, "scroll", clearAll, true);
    listen(document, "pointercancel", clearAll);
    listen(window, "blur", clearAll);
    listen(document, "visibilitychange", () => {
      if (document.hidden) clearAll();
    });
    listen(reduced, "change", clearAll);
    const observer = new window.MutationObserver(() => {
      for (const c of [...active.keys()]) if (!enabled(c)) clear(c);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "class"],
    });
    return {
      clearAll,
      feedback(c) {
        if (c) play(c, true);
      },
      submit(c) {
        if (c) {
          boundary(c);
          const send = c.querySelector(".send-launch");
          if (send) sendEffect(send);
        }
      },
      setFrameCount(value) {
        clearAll();
        frameCount = value === 2 ? 2 : 3;
        freezeFrame = 0;
      },
      setFreezeFrame(value) {
        clearAll();
        freezeFrame = value;
      },
      navigation(c) {
        if (c) boundary(c, true);
      },
      setScheme(v) {
        clearAll();
        fixedScheme = v;
      },
      setMonochrome(v) {
        clearAll();
        monochrome = v;
      },
      setFreeze(v) {
        clearAll();
        freeze = v;
      },
      destroy() {
        clearAll();
        observer.disconnect();
        listeners.forEach((fn) => fn());
      },
    };
  }
  const api = { plan, secondFrame, thirdFrame, mountFault, createController };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhaseSignalMotion = api;
})(typeof window !== "undefined" ? window : globalThis);
