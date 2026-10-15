(function () {
  'use strict';
  // Browser reads only. Server collectors and mutation requests are not controlled here.
  function create({ read, apply, intervalMs = 30000, key = JSON.stringify, onUnchanged = () => {}, onError = () => {}, onReady = () => {}, canPoll = () => true, window: owner = window }) {
    const doc = owner.document;
    let shellActive = true;
    try { if (owner.frameElement?.classList.contains('board-frame')) shellActive = owner.frameElement.classList.contains('active'); } catch {}
    let disposed = false, timer = null, pending = null, epoch = 0, deliveredEpoch = -1;
    let value, signature, hasValue = false, rendered = false, ready = false;
    const active = () => !disposed && shellActive && !doc.hidden;
    function stopTimer() { if (timer !== null) owner.clearTimeout(timer); timer = null; }
    function schedule(delay = typeof intervalMs === 'function' ? intervalMs() : intervalMs) {
      stopTimer();
      if (active()) timer = owner.setTimeout(() => { timer = null; void refresh(); }, delay);
    }
    function paint() {
      if (!active() || !hasValue || deliveredEpoch !== epoch) return;
      const nextKey = key(value);
      if (!rendered || nextKey !== signature) {
        const scrollers = [doc.scrollingElement, ...doc.querySelectorAll('.table-scroll')].filter(Boolean);
        const positions = scrollers.map(element => [element, element.scrollTop, element.scrollLeft]);
        apply(value);
        for (const [element, top, left] of positions) if (element.isConnected) { element.scrollTop = top; element.scrollLeft = left; }
        signature = nextKey;
        rendered = true;
      } else onUnchanged(value);
      if (!ready) { ready = true; onReady(); }
    }
    function refresh({ force = false, afterWrite = false } = {}) {
      if (disposed) return Promise.resolve();
      if (force) epoch += 1;
      if (pending) {
        // A completed write requires a read newer than any already-running poll.
        return force ? pending.then(() => refresh({ afterWrite:true })) : pending;
      }
      if (!active()) return Promise.resolve();
      if (!force && !afterWrite && !canPoll()) { schedule(); return Promise.resolve(); }
      stopTimer();
      const requestEpoch = epoch;
      pending = Promise.resolve().then(read).then(next => {
        if (disposed || requestEpoch !== epoch) return;
        value = next; hasValue = true; deliveredEpoch = requestEpoch;
        paint();
      }).catch(error => { if (requestEpoch !== epoch) return; rendered = false; if (active()) onError(error); }).finally(() => {
        pending = null;
        if (active()) schedule(requestEpoch === epoch ? undefined : 0);
      });
      return pending;
    }
    function resume() {
      if (!active()) { stopTimer(); return; }
      try { paint(); } catch (error) { onError(error); }
      schedule(0);
    }
    function message(event) {
      if (event.source !== owner.parent || event.origin !== owner.location.origin) return;
      if (event.data?.type === 'dashboard-shell-deactivate') { shellActive = false; stopTimer(); }
      if (event.data?.type === 'dashboard-shell-activate') { shellActive = true; resume(); }
    }
    function dispose(event) {
      if (event?.persisted) { stopTimer(); return; }
      disposed = true; epoch += 1; stopTimer(); value = undefined;
      owner.removeEventListener('message', message);
      owner.removeEventListener('pagehide', dispose);
      owner.removeEventListener('pageshow', resume);
      doc.removeEventListener('visibilitychange', resume);
    }
    owner.addEventListener('message', message);
    owner.addEventListener('pagehide', dispose);
    owner.addEventListener('pageshow', resume);
    doc.addEventListener('visibilitychange', resume);
    return { active, refresh, invalidate: () => { epoch += 1; }, start: () => refresh(), dispose };
  }
  window.YunzhanDashboardPageRefresh = Object.freeze({ version: '20261013-page-idle-v1', create });
})();
