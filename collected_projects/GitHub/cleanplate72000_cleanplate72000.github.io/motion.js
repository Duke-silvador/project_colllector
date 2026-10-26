// The App Wire — professional scroll-reveal motion
(function () {
  var items = document.querySelectorAll('.card, article.post, article.page, footer.site .cols > div');
  items.forEach(function (el) { el.classList.add('reveal'); });
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  // reveal-stagger: cards in the same grid reveal in sequence (70ms steps, max 3 steps);
  // the delay is cleared after the reveal so card hover is never delayed.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var el = e.target;
        if (el.classList.contains('card')) {
          var sibs = el.parentNode ? el.parentNode.querySelectorAll('.card') : [];
          var idx = Array.prototype.indexOf.call(sibs, el);
          if (idx > 0) { el.style.transitionDelay = (Math.min(idx, 3) * 70) + 'ms'; }
        }
        el.classList.add('visible'); io.unobserve(el);
        setTimeout(function () { el.style.transitionDelay = ''; }, 900);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
})();

// The App Wire — live search: filter cards on pages that have a search box
(function () {
  document.querySelectorAll('.search-box').forEach(function (box) {
    box.addEventListener('input', function () {
      var q = box.value.trim().toLowerCase();
      var scope = box.closest('main') || document;
      scope.querySelectorAll('.card').forEach(function (c) {
        var t = c.textContent.toLowerCase();
        c.style.display = (!q || t.indexOf(q) !== -1) ? '' : 'none';
      });
    });
  });
})();

// The App Wire — chatbot widget (rule-based, answers from the site's own posts)
(function () {
  var DATA_URL = '/chat-data.json';
  var cache = null, loading = false;
  function loadData(cb) {
    if (cache) { cb(cache); return; }
    if (loading) { setTimeout(function () { loadData(cb); }, 200); return; }
    loading = true;
    fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (d) { cache = d; loading = false; cb(d); }).catch(function () { loading = false; cb([]); });
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function link(p) { return '<a href="/' + p.slug + '">' + esc(p.title) + '</a>'; }
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' '); }
  function appWords(title) {
    return norm(title).replace(/review/g, ' ').split(' ').filter(function (w) { return w.length > 2; });
  }
  var wrap = document.createElement('div');
  wrap.innerHTML = '<button class="chat-fab" aria-label="Open chat">💬</button>' +
    '<div class="chat-panel" role="dialog" aria-label="The App Wire chat">' +
    '<div class="chat-head"><div><b>The App Wire Assistant</b><br><span>Ask about apps, reviews &amp; news</span></div>' +
    '<button class="chat-close" aria-label="Close chat">×</button></div>' +
    '<div class="chat-msgs"></div>' +
    '<div class="chat-chips">' +
    '<button class="chat-chip">Best free apps</button>' +
    '<button class="chat-chip">Latest reviews</button>' +
    '<button class="chat-chip">Top 100 apps</button>' +
    '<button class="chat-chip">Is it safe?</button></div>' +
    '<form class="chat-form"><input class="chat-input" type="text" placeholder="Ask about an app…" aria-label="Type your message" autocomplete="off">' +
    '<button class="chat-send" type="submit">Send</button></form></div>';
  document.body.appendChild(wrap);
  var fab = wrap.querySelector('.chat-fab');
  var panel = wrap.querySelector('.chat-panel');
  var msgs = wrap.querySelector('.chat-msgs');
  var input = wrap.querySelector('.chat-input');
  function addMsg(text, who) {
    var d = document.createElement('div');
    d.className = 'chat-msg ' + who;
    d.innerHTML = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  fab.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !msgs.children.length) {
      addMsg('Hi! 👋 I can help you find apps on The App Wire. Try a chip below, or type an app name — for example, <b>CapCut</b>.', 'bot');
    }
    if (panel.classList.contains('open')) { input.focus(); }
  });
  wrap.querySelector('.chat-close').addEventListener('click', function () { panel.classList.remove('open'); });
  wrap.querySelectorAll('.chat-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      addMsg(esc(chip.textContent), 'user');
      handle(chip.textContent);
    });
  });
  wrap.querySelector('.chat-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) { return; }
    input.value = '';
    addMsg(esc(v), 'user');
    handle(v);
  });
  function handle(q) {
    var n = ' ' + norm(q) + ' ';
    loadData(function (posts) {
      var news = posts.filter(function (p) { return p.kicker === 'Gaming News'; });
      if (n.indexOf(' hello ') !== -1 || n.indexOf(' hi ') !== -1 || n.indexOf(' hey ') !== -1) {
        addMsg('Hello! 👋 Ask me about any app, or try <b>Latest reviews</b> or <b>Top 100 apps</b>.', 'bot'); return;
      }
      if (n.indexOf(' best free ') !== -1 || n.indexOf(' best app ') !== -1) {
        addMsg('Here are our best free app picks: <a href="/posts/best-photo-editing-apps.html">10 Best Free Photo Editing Apps for Android (2026)</a> — and the full ranked list is on the <a href="/top-100.html">Top 100 page</a>.', 'bot'); return;
      }
      if (n.indexOf(' top 100 ') !== -1) {
        addMsg('The <a href="/top-100.html">Top 100 apps page</a> lists every reviewed app, ranked — tap any app to read its full professional review.', 'bot'); return;
      }
      if (n.indexOf(' latest ') !== -1 || n.indexOf(' new ') !== -1 || n.indexOf(' recent ') !== -1) {
        var top3 = posts.slice(0, 3).map(link).join('<br>• ');
        addMsg('Our latest posts:<br>• ' + (top3 || 'No posts yet.'), 'bot'); return;
      }
      if (n.indexOf(' gaming news ') !== -1 || n.indexOf(' news ') !== -1) {
        var n3 = news.slice(0, 3).map(link).join('<br>• ');
        addMsg('Latest gaming news:<br>• ' + (n3 || 'No news posts yet — check back soon.'), 'bot'); return;
      }
      if (n.indexOf(' safe ') !== -1 || n.indexOf(' apk ') !== -1 || n.indexOf(' virus ') !== -1 || n.indexOf(' trust ') !== -1) {
        addMsg('Yes, it is safe ✅ Every download button on this site goes only to the official Google Play Store (or App Store). We never host or link APK files.', 'bot'); return;
      }
      if (n.indexOf(' contact ') !== -1 || n.indexOf(' email ') !== -1 || n.indexOf(' reach ') !== -1) {
        addMsg('You can reach us through the <a href="/contact.html">Contact page</a>.', 'bot'); return;
      }
      if (n.indexOf(' about ') !== -1 || n.indexOf(' what is ') !== -1 || n.indexOf(' who ') !== -1) {
        addMsg('The App Wire is a free app review site. We test trending Android &amp; iPhone apps and publish honest reviews with real Play Store screenshots — downloads only from official stores. More on the <a href="/about.html">About page</a>.', 'bot'); return;
      }
      if (n.indexOf(' search ') !== -1 || n.indexOf(' find ') !== -1 || n.indexOf(' how ') !== -1) {
        addMsg('Use the search bar at the top of the homepage or the Top 100 page — type any app name and the list filters instantly. Or just type the app name here and I will find its review.', 'bot'); return;
      }
      var best = null, bestScore = 0;
      posts.forEach(function (p) {
        var words = appWords(p.title);
        var score = 0;
        words.forEach(function (w) { if (n.indexOf(' ' + w + ' ') !== -1) { score++; } });
        if (score > bestScore) { bestScore = score; best = p; }
      });
      if (best && bestScore >= 1) {
        addMsg('Found it: ' + link(best) + '<br>' + esc(best.desc), 'bot'); return;
      }
      addMsg('I could not find that one on the site yet. Try the <a href="/top-100.html">Top 100 page</a>, use the search bar at the top, or type another app name — new reviews are added every 30 minutes.', 'bot');
    });
  }
})();

// The App Wire — cookie consent: first-visit Accept/Decline, choice stored,
// re-openable from the footer "Cookie settings" link. Accept calls the
// DigitalPlat consent API when it is available; it does not by itself
// switch DigitalPlat from anonymous to identified ("known") visitor mode.
(function () {
  var KEY = 'appwire_cookie_choice';
  var banner = null;
  function setConsentCookie(v) {
    try { document.cookie = 'appwire_consent=' + v + '; max-age=' + (180 * 24 * 60 * 60) + '; path=/; SameSite=Lax'; } catch (err) {}
  }
  function applyConsent(v) {
    try {
      var sdk = window.digitalplatAnalytics;
      if (sdk && typeof sdk.setConsent === 'function') { sdk.setConsent(v === 'accepted' ? 'granted' : 'denied'); }
    } catch (err) {}
  }
  function choose(v) {
    try { localStorage.setItem(KEY, v); } catch (err) {}
    setConsentCookie(v);
    applyConsent(v);
    if (banner) { banner.classList.add('hidden'); }
  }
  function showBanner() {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Cookie consent');
      banner.innerHTML = '<p>We use cookies for anonymous site analytics and, once approved, Google AdSense ads. You can accept cookies or decline them. See our <a href="/privacy-policy.html">Privacy Policy</a>.</p>' +
        '<div class="cookie-actions">' +
        '<button class="cookie-btn cookie-accept" type="button">Accept cookies</button>' +
        '<button class="cookie-btn cookie-decline" type="button">Decline</button></div>';
      banner.querySelector('.cookie-accept').addEventListener('click', function () { choose('accepted'); });
      banner.querySelector('.cookie-decline').addEventListener('click', function () { choose('declined'); });
      document.body.appendChild(banner);
    }
    banner.classList.remove('hidden');
  }
  try {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) {}
    if (saved === 'accepted' || saved === 'declined') { applyConsent(saved); }
    else { showBanner(); }
  } catch (err) { showBanner(); }
  var foot = document.querySelector('footer.site .copyright');
  if (foot && !foot.querySelector('.cookie-settings')) {
    var btn = document.createElement('button');
    btn.className = 'cookie-settings';
    btn.type = 'button';
    btn.textContent = 'Cookie settings';
    btn.addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (err) {}
      setConsentCookie('');
      showBanner();
    });
    foot.appendChild(document.createTextNode(' · '));
    foot.appendChild(btn);
  }
})();

// The App Wire — analytics: track Google Play download clicks as a conversion event.
// Found in the DigitalPlat SDK itself: track() only QUEUES the event — it is sent
// by a 5-second timer or on page close. So merely holding navigation 350ms was not
// enough: the click left before any send happened. This version queues the event,
// then explicitly flushes the queue and waits for the send to finish before leaving.
document.addEventListener('click', function (e) {
  var t = e.target;
  var a = (t && t.closest) ? t.closest('a[href*="play.google.com"]') : null;
  if (!a) { return; }
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
  if (a.target && a.target !== '_self') {
    // New-tab click: this page stays alive, so just track and let the timer send it.
    try {
      if (window.digitalplatAnalytics) {
        window.digitalplatAnalytics.track('google_play_click', { link_domain: 'play.google.com' });
      }
    } catch (err) { /* analytics must never break navigation */ }
    return;
  }
  e.preventDefault();
  var href = a.href;
  var done = false;
  function go() { if (!done) { done = true; window.location.href = href; } }
  setTimeout(go, 2500); // safety: never trap the visitor if the send hangs
  try {
    var sdk = window.digitalplatAnalytics;
    if (!sdk) { go(); return; }
    sdk.track('google_play_click', { link_domain: 'play.google.com' });
    // Defer the flush a beat so the SDK's own click listener (same click)
    // has queued its event too — then one send carries both.
    setTimeout(function () {
      try {
        var p = sdk.flush();
        if (p && p.then) { p.then(go, go); } else { go(); }
      } catch (err) { go(); }
    }, 50);
  } catch (err) { go(); }
});
