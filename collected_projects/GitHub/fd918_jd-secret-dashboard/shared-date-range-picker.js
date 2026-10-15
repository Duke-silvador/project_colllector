(function dateRangePickerModule(global) {
  "use strict";
  const QUICK_RANGE_LABELS = { today: "今日", yesterday: "昨日", week: "本周", last7: "近7日", last30: "近30日", last60: "近60天", month: "本月", lastMonth: "上月" };
  const QUICK_RANGES = ["today", "yesterday", "week", "last7", "last30", "month"].map(key => [key, QUICK_RANGE_LABELS[key]]);
  let active = null;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const dateAt = value => new Date(`${value}T12:00:00`);
  const dateKey = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const todayKey = () => dateKey(new Date());
  const moveDay = (value, amount) => { const date = dateAt(value); date.setDate(date.getDate() + amount); return dateKey(date); };
  const monthKey = value => { const date = dateAt(value || todayKey()); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`; };
  const clamp = (value, minimum, maximum) => minimum && value < minimum ? minimum : maximum && value > maximum ? maximum : value;
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

  function layer() {
    const id = active?.layerId || "datePickerLayer";
    let element = document.getElementById(id);
    if (!element) {
      element = document.createElement("div");
      element.id = id;
      element.className = "range-picker-layer";
      element.setAttribute("aria-hidden", "true");
      (active?.container || document.body).append(element);
    }
    const container=active?.container || document.body;
    if(element.parentElement!==container)container.append(element);
    return element;
  }

  function presetRange(key) {
    const base = active.baseDate || active.maxDate || todayKey();
    const baseDate = dateAt(base);
    let start = base;
    let end = base;
    if (key === "yesterday") start = end = moveDay(base, -1);
    if (key === "week") {
      start = moveDay(base, -((baseDate.getDay() + 6) % 7));
      end = base;
    }
    if (key === "last7") start = moveDay(base, -6);
    if (key === "last30") start = moveDay(base, -29);
    if (key === "last60") start = moveDay(base, -59);
    if (key === "month") start = monthKey(base);
    if (key === "lastMonth") {
      end = moveDay(monthKey(base), -1);
      start = monthKey(end);
    }
    start = clamp(start, active.minDate, active.maxDate);
    end = clamp(end, active.minDate, active.maxDate);
    if (start > end) start = end;
    return { start, end };
  }

  function calendarHtml() {
    const month = dateAt(active.month);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const cursor = new Date(year, monthIndex, 1 - offset, 12);
    const weekdays = ["一", "二", "三", "四", "五", "六", "日"].map(day => `<span class="calendar-weekday">${day}</span>`).join("");
    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const value = new Date(cursor);
      value.setDate(cursor.getDate() + index);
      const key = dateKey(value);
      const classes = ["calendar-day"];
      if (value.getMonth() !== monthIndex) classes.push("outside");
      if (key === todayKey()) classes.push("today");
      if (active.start && active.end && key > active.start && key < active.end) classes.push("in-range");
      if (key === active.start) classes.push("range-start");
      if (key === active.end) classes.push("range-end");
      const disabled = (active.minDate && key < active.minDate) || (active.maxDate && key > active.maxDate);
      days.push(`<button class="${classes.join(" ")}" type="button" data-picker-date="${key}" aria-label="${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日" ${disabled ? 'disabled aria-disabled="true"' : ""}>${value.getDate()}</button>`);
    }
    return `<div class="calendar-head"><button class="calendar-nav" type="button" data-month-move="-1" aria-label="上个月">‹</button><span class="calendar-title">${active.monthSelect?`<select data-picker-year aria-label="选择年份">${Array.from({length:201},(_,i)=>1900+i).map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}年</option>`).join('')}</select><select data-picker-month aria-label="选择月份">${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}" ${m===monthIndex+1?'selected':''}>${m}月</option>`).join('')}</select>`:`${year}年${monthIndex + 1}月`}</span><button class="calendar-nav" type="button" data-month-move="1" aria-label="下个月">›</button></div><div class="calendar-grid">${weekdays}${days.join("")}</div>`;
  }

  function position() {
    if (!active) return;
    const panel = layer().querySelector(".range-picker");
    const anchor = active.anchor;
    if (!panel || !anchor || window.innerWidth <= 700) return;
    const rectangle = anchor.getBoundingClientRect();
    const gap = 8;
    const maximumLeft = Math.max(14, window.innerWidth - panel.offsetWidth - 14);
    const left = Math.min(Math.max(14, rectangle.left), maximumLeft);
    let top = rectangle.bottom + gap;
    if (top + panel.offsetHeight > window.innerHeight - 14) top = Math.max(14, rectangle.top - panel.offsetHeight - gap);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function close({ applied = false } = {}) {
    if (!active) return;
    const current = active;
    const target = layer();
    target.classList.remove("open");
    target.setAttribute("aria-hidden", "true");
    target.innerHTML = "";
    current.anchor?.setAttribute("aria-expanded", "false");
    active = null;
    current.onClose?.({ applied });
    if (current.anchor?.isConnected) current.anchor.focus();
  }

  function apply() {
    if (!active?.start || !active?.end) return;
    const payload = { start: active.start, end: active.end, preset: active.preset };
    const callback = active.onApply;
    const onError = active.onError;
    close({ applied: true });
    Promise.resolve(callback?.(payload)).catch(error => onError?.(error));
  }

  function selectDate(key) {
    if (!active) return;
    active.preset = "";
    if (active.mode === "single") {
      active.start = key;
      active.end = key;
      apply();
      return;
    }
    if (active.phase === "start") {
      active.start = key;
      active.end = "";
      active.phase = "end";
      active.month = monthKey(key);
    } else if (!active.start || key < active.start) {
      active.start = key;
      active.end = "";
      active.phase = "end";
    } else {
      active.end = key;
    }
    render();
  }

  function render() {
    if (!active) return;
    const target = layer();
    const single = active.mode === "single";
    const startText = active.start || "请选择";
    const endText = active.end || "请选择";
    target.innerHTML = `<div class="range-picker-backdrop"></div><section class="range-picker ${single ? "single-date" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHtml(active.title)}"><header class="range-picker-head"><div><strong>${escapeHtml(active.title)}</strong><span>${escapeHtml(active.description || (single ? "选择后立即切换到该日期" : "选完开始日期后，会自动进入结束日期选择"))}</span></div><button class="range-picker-close" type="button" aria-label="关闭日期选择">${closeIcon}</button></header>${single ? "" : `<div class="range-picker-steps"><button class="range-step ${active.phase === "start" ? "active" : ""} ${active.start ? "complete" : ""}" type="button" data-picker-phase="start"><small>开始日期</small><strong>${escapeHtml(startText)}</strong></button><button class="range-step ${active.phase === "end" ? "active" : ""} ${active.end ? "complete" : ""}" type="button" data-picker-phase="end"><small>结束日期</small><strong>${escapeHtml(endText)}</strong></button></div>`}<div class="range-picker-body"><nav class="quick-ranges" aria-label="快捷日期范围">${active.quickRanges.map(([key, label]) => `<button class="quick-range ${active.preset === key ? "active" : ""}" type="button" data-quick-range="${key}">${label}</button>`).join("")}</nav><div class="calendar">${calendarHtml()}</div></div>${single ? "" : `<footer class="range-picker-foot"><span>${active.phase === "end" ? "正在选择结束日期" : "请选择开始日期"}</span><div class="range-picker-actions"><button type="button" data-picker-cancel>取消</button><button class="primary" type="button" data-picker-apply ${!active.start || !active.end ? "disabled" : ""}>${escapeHtml(active.applyLabel)}</button></div></footer>`}</section>`;
    target.classList.add("open");
    target.setAttribute("aria-hidden", "false");
    target.querySelector(".range-picker-backdrop").onclick = () => close();
    target.querySelector(".range-picker-close").onclick = () => close();
    target.querySelector("[data-picker-cancel]")?.addEventListener("click", () => close());
    target.querySelector("[data-picker-apply]")?.addEventListener("click", apply);
    target.querySelectorAll("[data-picker-phase]").forEach(button => button.onclick = () => {
      if (button.dataset.pickerPhase === "end" && !active.start) return;
      active.phase = button.dataset.pickerPhase;
      render();
    });
    target.querySelectorAll("[data-month-move]").forEach(button => button.onclick = () => {
      const month = dateAt(active.month);
      month.setMonth(month.getMonth() + Number(button.dataset.monthMove));
      active.month = monthKey(dateKey(month));
      render();
    });
    target.querySelectorAll("[data-picker-year],[data-picker-month]").forEach(select => select.onchange = () => {
      const year=Number(target.querySelector("[data-picker-year]").value);
      const month=Number(target.querySelector("[data-picker-month]").value);
      active.month=`${year}-${String(month).padStart(2,"0")}-01`;render();
    });
    target.querySelectorAll("[data-picker-date]").forEach(button => button.onclick = () => selectDate(button.dataset.pickerDate));
    target.querySelectorAll("[data-quick-range]").forEach(button => button.onclick = () => {
      const range = presetRange(button.dataset.quickRange);
      active.start = range.start;
      active.end = range.end;
      active.preset = button.dataset.quickRange;
      if(active.quickApply) apply(); else render();
    });
    requestAnimationFrame(() => {
      position();
      target.querySelector(".range-picker-close")?.focus();
    });
  }

  function open(anchor, options = {}) {
    if (active) close();
    const baseDate = options.baseDate || options.maxDate || todayKey();
    active = {
      anchor,
      container: options.container || null,
      monthSelect: options.monthSelect === true,
      layerId: options.layerId || "datePickerLayer",
      mode: options.mode || "range",
      title: options.title || "选择日期",
      description: options.description || "",
      applyLabel: options.applyLabel || "应用",
      quickApply: options.quickApply !== false,
      start: options.start || "",
      end: options.end || "",
      phase: options.phase === "end" && options.start ? "end" : "start",
      month: monthKey(options.phase === "end" && options.end ? options.end : options.start || baseDate),
      preset: options.preset || "",
      minDate: options.minDate || "",
      maxDate: options.maxDate || "",
      baseDate,
      quickRanges: (Array.isArray(options.quickRanges) ? options.quickRanges : QUICK_RANGES.map(item => item[0]))
        .filter(key => QUICK_RANGE_LABELS[key])
        .map(key => [key, QUICK_RANGE_LABELS[key]]),
      onApply: options.onApply,
      onClose: options.onClose,
      onError: options.onError,
    };
    anchor?.setAttribute("aria-expanded", "true");
    render();
  }

  document.addEventListener("keydown", event => {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...layer().querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener("resize", position, { passive: true });

  global.YunzhanDateRangePicker = { open, close, position, isOpen: () => Boolean(active), quickRanges: QUICK_RANGES.map(item => [...item]) };
})(window);
