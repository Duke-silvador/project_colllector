/* 全球态势感知仪表盘 — 前端逻辑（零依赖） */
(function () {
  'use strict';

  var LV_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
  var LV_COLOR = { low: '#4a6b8a', medium: '#2e9e6b', high: '#e8a33d', critical: '#e5484d' };
  var LV_TEXT = { low: '常规', medium: '中', high: '高', critical: '紧急' };
  var CAT_TEXT = { economy: '💰 经济', military: '🛡 军事', policy: '📜 政策', other: '◻ 其他' };

  var state = {
    cat: 'all', lvl: '', hours: 24, q: '', geo: '', onlyAI: false, onlyDecision: false,
    origin: 'all', srcMeta: null, pinImportant: true,
    items: [], alerts: [], briefs: [], ledger: [], stats: null, ts: null, outlook: null,
    lastItemId: 0, lastAlertId: 0,
    sound: true, seenAlerts: {}, booted: false, connected: false
  };

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function parseT(s) {
    if (!s) return null;
    var d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  }
  function ago(s) {
    var d = parseT(s); if (!d) return '';
    var m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return m + ' 分钟前';
    if (m < 1440) return Math.floor(m / 60) + ' 小时前';
    return Math.floor(m / 1440) + ' 天前';
  }
  function hhmm(s) {
    var d = parseT(s); if (!d) return '--:--';
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ---------------- 声音告警 ---------------- */
  var actx = null;
  function beep(level) {
    if (!state.sound) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var n = level === 'critical' ? 3 : 2;
      for (var i = 0; i < n; i++) {
        var t0 = actx.currentTime + i * 0.22;
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(level === 'critical' ? 880 : 620, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g); g.connect(actx.destination);
        o.start(t0); o.stop(t0 + 0.2);
      }
    } catch (e) { /* 浏览器未授权音频，忽略 */ }
  }

  /* ---------------- 地图 ---------------- */
  var mapBuilt = false;
  function buildMap() {
    var svg = $('map');
    if (!svg || !window.WORLD_MAP || mapBuilt) return;
    var frag = document.createDocumentFragment();
    window.WORLD_MAP.countries.forEach(function (c) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', c.d);
      p.setAttribute('data-name', c.name || '');
      frag.appendChild(p);
    });
    svg.appendChild(frag);
    svg.setAttribute('viewBox', '0 0 ' + window.WORLD_MAP.width + ' ' + window.WORLD_MAP.height);
    mapBuilt = true;
  }

  function renderMap() {
    var svg = $('map');
    if (!svg || !window.WORLD_MAP) return;
    buildMap();
    // 清掉旧标记（保留国家 path）
    Array.prototype.slice.call(svg.querySelectorAll('.mk')).forEach(function (n) { n.remove(); });
    Array.prototype.slice.call(svg.querySelectorAll('path.hit')).forEach(function (n) { n.classList.remove('hit'); });

    var W = window.WORLD_MAP.width, H = window.WORLD_MAP.height;
    var pts = state.items.filter(function (it) { return it.lat != null && it.lon != null; });

    // 邻近聚合，避免标记堆叠
    var grid = {};
    pts.forEach(function (it) {
      var k = (Math.round(it.lat * 2) / 2) + '_' + (Math.round(it.lon * 2) / 2);
      if (!grid[k]) grid[k] = { lat: it.lat, lon: it.lon, items: [], level: 'low', geo: it.geo_name };
      grid[k].items.push(it);
      if (LV_ORDER[it.level] > LV_ORDER[grid[k].level]) {
        grid[k].level = it.level;
        grid[k].geo = it.geo_name || grid[k].geo;
      }
    });

    Object.keys(grid).forEach(function (k) {
      var g = grid[k];
      var x = (g.lon + 180) / 360 * W, y = (90 - g.lat) / 180 * H;
      var r = 3 + Math.min(9, Math.sqrt(g.items.length) * 2.2);
      var grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      grp.setAttribute('class', 'mk');

      if (g.level === 'critical') {
        var halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('cx', x); halo.setAttribute('cy', y);
        halo.setAttribute('r', r + 4); halo.setAttribute('fill', LV_COLOR[g.level]);
        halo.setAttribute('opacity', '0.18');
        grp.appendChild(halo);
      }
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'core');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r);
      c.setAttribute('fill', LV_COLOR[g.level] || LV_COLOR.low);
      c.setAttribute('fill-opacity', '0.85');
      grp.appendChild(c);

      if (g.items.length > 1) {
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x); t.setAttribute('y', y + 2.6);
        t.textContent = g.items.length;
        grp.appendChild(t);
      }

      grp.addEventListener('mousemove', function (ev) {
        var tip = $('mapTip');
        tip.classList.remove('hidden');
        tip.innerHTML = '<b>' + esc(g.geo || '未知地区') + '</b> · ' + g.items.length + ' 条<br>' +
          g.items.slice(0, 4).map(function (i) { return '· ' + esc(i.title.slice(0, 42)); }).join('<br>');
        var host = svg.parentNode.getBoundingClientRect();
        tip.style.left = Math.min(host.width - 290, ev.clientX - host.left + 12) + 'px';
        tip.style.top = Math.max(4, ev.clientY - host.top - 10) + 'px';
      });
      grp.addEventListener('mouseleave', function () { $('mapTip').classList.add('hidden'); });
      grp.addEventListener('click', function () {
        state.geo = (state.geo === g.geo) ? '' : (g.geo || '');
        $('mapHint').textContent = state.geo ? ('已筛选：' + state.geo + '（再次点击取消）') : '点击标记可筛选该地区事件';
        renderFeed();
      });
      svg.appendChild(grp);
    });
  }

  /* ---------------- 信息流 ---------------- */
  var DEC_TEXT = {
    sanctions: '制裁', monetary: '货币', fiscal: '财政', military: '军事',
    judicial: '司法', diplomatic: '外交', corporate: '企业', regulatory: '监管'
  };

  /* 是否为"待译"：后端已识别语言，非中文且还没有中文标题、且不是危重级别 */
  var LANG_CN = {
    zh: '中文', en: '英文', fr: '法文', es: '西班牙文', it: '意大利文', de: '德文',
    pt: '葡萄牙文', nl: '荷兰文', tr: '土耳其文', pl: '波兰文', ru: '俄文',
    ar: '阿拉伯文', fa: '波斯文', he: '希伯来文', ja: '日文', ko: '韩文',
    th: '泰文', el: '希腊文', hi: '印地文', id: '印尼文', vi: '越南文', sv: '瑞典文'
  };
  function isEng(t) {
    if (!t || t.length < 6) return false;
    var letters = 0;
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) letters++;
    }
    return letters >= 8 && letters / t.length > 0.45;
  }
  function isPending(it) {
    if (it.title_zh) return false;
    if (it.level === 'critical' || it.level === 'high') return false;
    if (it.lang) return it.lang !== 'zh';
    return isEng(it.title);
  }

  function itemHTML(it) {
    var url = it.url && /^https?:/.test(it.url) ? it.url : '';
    // 中文优先：英文稿由智能体团队译出 title_zh，原文以小字附在下方
    var zhTitle = it.title_zh || '';
    var mainTitle = zhTitle || it.title;
    var title = url
      ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(mainTitle) + '</a>'
      : esc(mainTitle);
    var origTitle = (zhTitle && it.title && zhTitle !== it.title)
      ? '<div class="it-orig">' + esc(it.title) + '</div>' : '';
    var zhSum = it.summary_zh || '';
    var mainSum = zhSum || it.summary || '';
    var origSum = (zhSum && it.summary) ? '<div class="it-orig">' + esc(String(it.summary).slice(0, 220)) + '</div>' : '';

    var dup = (it.dup_count > 1) ? '<span class="dup">多源x' + it.dup_count + '</span>' : '';
    var llm = it.llm_state === 'done' && it.llm_note
      ? '<span class="llm">AI: ' + esc(String(it.llm_note).slice(0, 40)) + '</span>' : '';
    // 决策标记：已落地的决策比表态/行情更值得看
    var dec = '';
    if (it.is_decision) {
      var dt = DEC_TEXT[it.decision_type] || '决策';
      dec = '<span class="tag dec" title="' + esc(it.decision || it.decision_ev || '') + '">⚖ ' + dt + '决策</span>';
    }
    // 市场影响徽章：不用悬停也能一眼看到加密/股市方向
    var mktb = '';
    if (it.crypto_dir) {
      mktb += '<span class="tag mktb ' + (MKT_CLS[it.crypto_dir] || '') + '" title="' +
        esc(it.mkt_crypto || '') + '">💰 ' + esc(it.crypto_dir) + '</span>';
    }
    if (it.equity_dir) {
      mktb += '<span class="tag mktb ' + (MKT_CLS[it.equity_dir] || '') + '" title="' +
        esc(it.mkt_equity || '') + '">📈 ' + esc(it.equity_dir) + '</span>';
    }

    // 专业研判区块：分析正文 + 置信度 + 影响尺度 + 建议动作
    var ai = '';
    if (it.llm_analysis) {
      var conf = (it.llm_confidence === null || it.llm_confidence === undefined)
        ? null : parseInt(it.llm_confidence, 10);
      var cls = conf === null ? '' : (conf >= 75 ? 'hi' : (conf >= 50 ? 'mid' : 'lo'));
      ai = '<div class="it-ai">' +
        '<div class="ai-head"><span class="ai-tag">🧠 专业研判</span>' +
          (conf !== null ? '<span class="ai-conf ' + cls + '">置信度 ' + conf + '</span>' : '') +
          (it.llm_horizon ? '<span class="ai-hz">影响尺度：' + esc(it.llm_horizon) + '</span>' : '') +
        '</div>' +
        (it.decision ? '<div class="ai-dec">决策内容：' + esc(it.decision) + '</div>' : '') +
        '<div class="ai-body">' + esc(it.llm_analysis) + '</div>' +
        (it.llm_action ? '<div class="ai-act">▸ <b>建议</b>：' + esc(it.llm_action) + '</div>' : '') +
        '</div>';
    }

    // 走向判断区块：经济走向 + 供应链判断 + 验证指标
    var ol = '';
    if (it.econ_outlook || it.sc_outlook) {
      var dirCls = { '转强': 'up', '转弱': 'down', '震荡': 'flat', '分化': 'split' };
      var scCls = { '中断': 'bad', '紧张': 'warn', '缓解': 'good', '正常': 'ok' };
      ol = '<div class="it-ol">' +
        (it.econ_outlook
          ? '<div class="ol-row"><span class="ol-tag econ ' + (dirCls[it.econ_direction] || '') + '">📈 经济走向' +
            (it.econ_direction ? ' · ' + esc(it.econ_direction) : '') + '</span>' + esc(it.econ_outlook) + '</div>'
          : '') +
        (it.sc_outlook
          ? '<div class="ol-row"><span class="ol-tag sc ' + (scCls[it.sc_status] || '') + '">⛓ 供应链' +
            (it.sc_status ? ' · ' + esc(it.sc_status) : '') + '</span>' + esc(it.sc_outlook) + '</div>'
          : '') +
        (it.watch ? '<div class="ol-watch">验证指标：' + esc(it.watch) + '</div>' : '') +
        '</div>';
    }

    // 市场影响区块：虚拟货币 + 全球股市/板块
    var mkt = '';
    if (it.mkt_crypto || it.mkt_equity) {
      var mdir = { '看多': 'up', '看空': 'down', '中性': 'flat', '分化': 'split' };
      mkt = '<div class="it-ol it-mkt">' +
        (it.mkt_crypto
          ? '<div class="ol-row"><span class="ol-tag myth crypto ' + (mdir[it.crypto_dir] || '') + '">💰 虚拟货币' +
            (it.crypto_dir ? ' · ' + esc(it.crypto_dir) : '') + '</span>' + esc(it.mkt_crypto) +
            (it.crypto_targets ? '<div class="ol-watch">标的：' + esc(it.crypto_targets) + '</div>' : '') + '</div>'
          : '') +
        (it.mkt_equity
          ? '<div class="ol-row"><span class="ol-tag myth equity ' + (mdir[it.equity_dir] || '') + '">📈 股市板块' +
            (it.equity_dir ? ' · ' + esc(it.equity_dir) : '') + '</span>' + esc(it.mkt_equity) +
            (it.equity_sectors ? '<div class="ol-watch">板块：' + esc(it.equity_sectors) + '</div>' : '') + '</div>'
          : '') +
        '</div>';
    }

    // 详情统一收进浮层：紧凑列表只留标题/摘要，悬停或点击查看全文
    var hasDetail = !!(ai || ol || mkt || it.reasons);
    var detail = hasDetail
      ? '<div class="it-detail">' + ai + ol + mkt +
        (it.reasons ? '<div class="it-why"><b>判定依据：</b>' + esc(it.reasons) + '</div>' : '') +
        '</div>'
      : '';
    // 触屏设备没有 hover，提示文案改成"点按"
    var _coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var tip = hasDetail ? '<div class="hover-tip">' + (_coarse ? '点按查看' : '悬停查看') +
      ' 专业研判 / 走向判断 / 判定依据</div>' : '';

    // 来源身份：全球源标出区域，权威结构化源标出"权威"；非中英稿再标出原文语言
    var meta = (state.srcMeta || {})[it.source];
    var originTag = '';
    if (meta) {
      originTag = meta.group === 'authority'
        ? '<span class="tag auth">📊 权威</span>'
        : '<span class="tag glob">🌐 ' + esc(meta.region || '全球') + '</span>';
    }
    if (it.lang && it.lang !== 'zh' && it.lang !== 'en') {
      originTag += '<span class="tag lang">' + esc(LANG_CN[it.lang] || it.lang) + '</span>';
    }

    return '' +
      '<div class="item ' + esc(it.level) + '" data-id="' + it.id + '" data-pending="' + (isPending(it) ? '1' : '0') + '">' +
        '<div class="it-top">' +
          '<span class="tag lv-' + esc(it.level) + '">' + (LV_TEXT[it.level] || it.level) + '</span>' +
          '<span class="tag cat-' + esc(it.category) + '">' + (CAT_TEXT[it.category] || it.category) + '</span>' +
          originTag +
          dec +
          mktb +
          (it.geo_name ? '<span class="tag geo">📍' + esc(it.geo_name) + '</span>' : '') +
          '<span>' + esc(it.source_name || it.source) + '</span>' +
          '<span>' + hhmm(it.published_at || it.fetched_at) + ' · ' + ago(it.fetched_at) + '</span>' +
          dup + llm +
          '<span class="score">' + (it.llm_state === 'done'
              ? '规则初筛 ' + (it.score || 0) + ' · AI已复核'
              : '紧急度 ' + (it.score || 0)) + '</span>' +
        '</div>' +
        '<div class="it-title">' + title + '</div>' +
        origTitle +
        (mainSum ? '<div class="it-sum">' + esc(mainSum) + '</div>' : '') +
        origSum +
        detail +
        tip +
      '</div>';
  }

  /* ---------------- 悬停详情浮层 ---------------- */
  var popEl = null, popPinned = false, hoverCard = null, hoverTimer = null;

  function hidePop(force) {
    if (!popEl) return;
    if (popPinned && !force) return;
    popEl.classList.add('hidden');
    popEl.classList.remove('pinned');
    popPinned = false;
  }

  function showPop(card, it) {
    if (!popEl) return;
    var d = card.querySelector('.it-detail');
    if (!d) return;
    var zh = it.title_zh || '';
    var head = '<div class="dp-head">' +
      '<span class="tag lv-' + esc(it.level) + '">' + (LV_TEXT[it.level] || it.level) + '</span>' +
      '<span class="tag cat-' + esc(it.category) + '">' + (CAT_TEXT[it.category] || it.category) + '</span>' +
      (function () {
        var m = (state.srcMeta || {})[it.source];
        if (!m) return '';
        return m.group === 'authority'
          ? '<span class="tag auth">📊 权威</span>'
          : '<span class="tag glob">🌐 ' + esc(m.region || '全球') + '</span>';
      })() +
      (it.is_decision ? '<span class="tag dec">⚖ 决策</span>' : '') +
      (it.geo_name ? '<span class="tag geo">📍' + esc(it.geo_name) + '</span>' : '') +
      '<span>' + esc(it.source_name || '') + '</span>' +
      '<span>' + hhmm(it.published_at || it.fetched_at) + '</span>' +
      '<button class="dp-close" title="关闭" onclick="GD.hideDetail(true)">✕</button>' +
      '</div>';
    popEl.innerHTML = head +
      '<div class="dp-title">' + esc(zh || it.title) + '</div>' +
      (zh && it.title ? '<div class="dp-meta">' + esc(it.title) + '</div>' : '') +
      (function () {
        // 列表里摘要被压成单行，浮层里给完整摘要
        var s = it.summary_zh || it.summary || '';
        var o = (it.summary_zh && it.summary) ? it.summary : '';
        return (s ? '<div class="dp-sum">' + esc(s) + '</div>' : '') +
               (o ? '<div class="dp-meta" style="font-style:italic">' + esc(String(o).slice(0, 300)) + '</div>' : '');
      })() +
      d.innerHTML;

    popEl.classList.remove('hidden');
    var r = card.getBoundingClientRect();
    var w = 540, vw = window.innerWidth, vh = window.innerHeight;
    var left = r.right + 12;
    if (left + w > vw - 8) left = Math.max(8, r.left - w - 12);
    popEl.style.left = left + 'px';
    popEl.style.top = Math.max(8, Math.min(r.top, vh - 160)) + 'px';
    requestAnimationFrame(function () {
      var h = popEl.offsetHeight;
      if (r.top + h > vh - 8) {
        popEl.style.top = Math.max(8, vh - h - 8) + 'px';
      }
    });
  }

  function bindHoverDetail() {
    var feed = $('feed');
    if (!feed) return;
    popEl = $('detailPop');
    function findItem(id) {
      for (var i = 0; i < state.items.length; i++) {
        if (state.items[i].id === id) return state.items[i];
      }
      return null;
    }
    function cardItem(card) {
      var id = parseInt(card.getAttribute('data-id'), 10);
      return isNaN(id) ? null : findItem(id);
    }

    feed.addEventListener('mouseover', function (e) {
      var card = e.target.closest ? e.target.closest('.item') : null;
      if (!card || card === hoverCard) return;
      hoverCard = card;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        var it = cardItem(card);
        if (it) { popPinned = false; showPop(card, it); }
      }, 110);
    });
    feed.addEventListener('mouseleave', function () {
      hoverCard = null;
      clearTimeout(hoverTimer);
      hidePop(false);
    });
    feed.addEventListener('scroll', function () { hidePop(false); });
    // 移动端整页滚动（feed 不再内部滚动），滚页面时收起未固定的浮层
    window.addEventListener('scroll', function () { hidePop(false); }, { passive: true });
    feed.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return;   // 点链接照常跳转
      var card = e.target.closest ? e.target.closest('.item') : null;
      if (!card) return;
      var it = cardItem(card);
      if (!it) return;
      if (popPinned) { hidePop(true); return; }
      popPinned = true;
      showPop(card, it);
      popEl.classList.add('pinned');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hidePop(true);
    });
  }

  // 当前生效的筛选条件（用于筛选状态条与"为什么是空的"说明）
  function activeFilters() {
    var out = [];
    if (state.cat && state.cat !== 'all') out.push('分类 ' + (CAT_TEXT[state.cat] || state.cat));
    if (state.lvl) out.push('级别 ' + (LV_TEXT[state.lvl] || state.lvl));
    if (state.geo) out.push('地区 ' + state.geo);
    if (state.hours && state.hours !== 24) out.push('时间窗 ' + state.hours + 'h');
    if (state.q) out.push('搜索「' + state.q + '」');
    if (state.origin && state.origin !== 'all') out.push(state.origin === 'global' ? '仅全球源' : '仅国内源');
    if (state.onlyAI) out.push('只看有专业研判');
    if (state.onlyDecision) out.push('只看决策');
    return out;
  }

  /* 同场发言聚合（2026-10-18）：同一来源、标题冒号前主体相同、60 分钟内 >=3 条
     （典型：金十「IMF总裁格奥尔基耶娃：…」18 分钟 12 条），折叠成一张卡，
     其余条目放在可展开的 <details> 里。不删数据、不改变级别，只是不再逐条刷屏。 */
  function burstKey(i) {
    var t = i.title_zh || i.title || '';
    var idx = t.indexOf('：');
    if (idx < 4 || idx > 30) return '';
    return (i.source || '') + '|' + t.slice(0, idx);
  }
  function burstTs(i) {
    var t = parseT(i.fetched_at || i.published_at);
    return t ? t.getTime() : 0;
  }
  function groupBursts(list) {
    var units = [], byKey = {};
    list.forEach(function (i) {
      var k = burstKey(i);
      var ts = burstTs(i);
      if (!k || !ts) { units.push({ one: i }); return; }
      var u = byKey[k];
      if (u && Math.abs(ts - u.t0) <= 60 * 60 * 1000) {
        u.items.push(i);
      } else {
        var nu = { key: k, t0: ts, items: [i] };
        byKey[k] = nu;
        units.push(nu);
      }
    });
    var out = [];
    units.forEach(function (u) {
      if (u.items && u.items.length >= 3) { out.push(u); }
      else if (u.items) { u.items.forEach(function (x) { out.push({ one: x }); }); }
      else { out.push(u); }
    });
    return out;
  }
  function renderUnits(units) {
    return units.map(function (u) {
      if (u.one) return itemHTML(u.one);
      var rest = u.items.slice(1);
      var pfx = (u.items[0].title_zh || u.items[0].title || '');
      var i2 = pfx.indexOf('：');
      return itemHTML(u.items[0]) +
        '<details class="burst"><summary>📎 同场发言另有 ' + rest.length + ' 条：' +
        esc(i2 > 0 ? pfx.slice(0, i2) : '') + '（点击展开）</summary>' +
        rest.map(itemHTML).join('') + '</details>';
    }).join('');
  }

  function renderFeed() {
    var host = $('feed');
    var list = state.items;
    // 同事件重复入库的条目折叠：llm_state='duplicate'（同一 thash 的后续发布，
    // 或智能体研判时判定"建议并入 id X"的重复稿）。
    // 不删除、不丢数据，只在信息流里折叠，并在计数条上说明折叠了几条。
    var dupHidden = 0;
    list = list.filter(function (i) {
      if (i.llm_state === 'duplicate') { dupHidden++; return false; }
      return true;
    });
    if (state.cat !== 'all') list = list.filter(function (i) { return i.category === state.cat; });
    if (state.lvl) list = list.filter(function (i) { return LV_ORDER[i.level] >= LV_ORDER[state.lvl]; });
    if (state.geo) list = list.filter(function (i) { return i.geo_name === state.geo; });
    if (state.onlyAI) list = list.filter(function (i) { return !!i.llm_analysis; });
    if (state.onlyDecision) list = list.filter(function (i) { return !!i.is_decision; });
    // 来源筛选：全球源 = 已注册的 wf_*/wi_*；其余视为国内源
    if (state.origin !== 'all') {
      var meta = state.srcMeta || {};
      list = list.filter(function (i) {
        var m = meta[i.source];
        return state.origin === 'global' ? !!m : !m;
      });
    }
    // 注意：先分组再截断。接口会额外返回被时间挤出 400 条窗口的重要条目，
    // 若在分组前截断，这些"置顶"条目又会被切掉（踩过这个坑）。
    // 待译英文（低/中级别）默认隐身：避免翻译轮追上前的英文暴露在界面上
    var pending = 0;
    if (document.body.classList.contains('hide-pending')) {
      pending = list.filter(isPending).length;
    }
    $('feedCount').textContent = '共 ' + list.length + ' 条'
      + (dupHidden ? '（' + dupHidden + ' 条同事件重复已折叠）' : '')
      + (pending ? '（' + pending + ' 条待译已隐藏）' : '');

    // 筛选状态条：让"列表为什么是空的/为什么只剩几条"一眼可见
    var af = activeFilters();
    var fb = $('filterBar');
    if (fb) {
      if (af.length) {
        fb.innerHTML = '<span class="fb-label">筛选</span>' +
          af.map(function (t) { return '<span class="fb-chip">' + esc(t) + '</span>'; }).join('') +
          '<button class="fb-clear" onclick="GD.clearFilters()">清除全部</button>';
        fb.classList.remove('hidden');
      } else {
        fb.innerHTML = '';
        fb.classList.add('hidden');
      }
    }
    var emptyHtml = '<div class="hint">当前筛选条件下暂无情报。' +
      (af.length
        ? '<div class="af-list">已启用筛选：' + af.map(esc).join(' · ') + '</div>' +
          '<button class="btn af-clear" onclick="GD.clearFilters()">清除全部筛选</button>'
        : '') +
      '</div>';

    // 更新时间戳：让"自动刷新"有可见证据（每次渲染都会刷新）
    var fst = $('feedStamp');
    if (fst) {
      var nd = new Date();
      var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
      fst.textContent = '更新 ' + p2(nd.getHours()) + ':' + p2(nd.getMinutes()) + ':' + p2(nd.getSeconds());
    }

    var prevScroll = host.scrollTop;

    // ── 快捷视图：只看市场影响 / 只看重要(score>50)，无上限，按分数排序 ──
    if (state.quick === 'mkt' || state.quick === 'important') {
      var q = list.filter(function (i) {
        if (state.quick === 'mkt') {
          return !!(i.econ_outlook || i.sc_outlook || i.mkt_crypto || i.mkt_equity);
        }
        return (i.score || 0) > 50;
      }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      var qh = state.quick === 'mkt'
        ? '<div class="feed-sec"><span class="fs-tag mkt">💰 市场影响</span><span class="fs-note">' +
          q.length + ' 条 · 有经济/供应链/加密/股市判断，按分数排序（币圈与股市的直接驱动）</span></div>'
        : '<div class="feed-sec"><span class="fs-tag warn">⚠ 重要（分数>50）</span><span class="fs-note">' +
          q.length + ' 条 · 按紧急度排序</span></div>';
      host.innerHTML = q.length ? qh + q.map(itemHTML).join('') : emptyHtml;
      var as0 = $('autoScroll');
      host.scrollTop = (as0 && as0.checked) ? 0 : prevScroll;
      return;
    }

    if (state.pinImportant) {
      // 重要事件置顶：但要限条数，否则几十条高分旧闻会把"最新"压到屏幕外，
      // 看起来就像页面没有自动更新（踩过这个坑）。溢出部分按时间并入实时流。
      var PIN_MAX = (window.innerWidth <= 900) ? 2 : 3;
      var MKT_MAX = (window.innerWidth <= 900) ? 2 : 4;
      // 只置顶"近 6 小时"的重要事件：更早的高分旧闻若一直占着顶部，
      // 会让最新内容永远排在后面，看起来就像页面不再更新。
      var PIN_WINDOW_MS = 6 * 3600 * 1000;
      var nowMs = Date.now();
      function recent(i) {
        var t = parseT(i.fetched_at || i.published_at);
        return t ? (nowMs - t.getTime()) <= PIN_WINDOW_MS : false;
      }
      // ① 市场影响组：有经济/供应链/加密/股市判断的条目（用户最关心）
      var mktAll = list.filter(function (i) {
        return (i.econ_outlook || i.sc_outlook || i.mkt_crypto || i.mkt_equity) && recent(i);
      }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      var mkt = mktAll.slice(0, MKT_MAX);
      var mktIds = {};
      mkt.forEach(function (i) { mktIds[i.id] = 1; });
      // ② 重要事件组：critical/high 或 score>50（用户要求），排除已进市场组
      var pinAll = list.filter(function (i) {
        if (mktIds[i.id]) return false;
        var important = (i.level === 'critical' || i.level === 'high' || (i.score || 0) > 50);
        return important && recent(i);
      }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      var pin = pinAll.slice(0, PIN_MAX);
      var pinIds = {};
      mkt.forEach(function (i) { pinIds[i.id] = 1; });
      pin.forEach(function (i) { pinIds[i.id] = 1; });
      var restAll = list.filter(function (i) { return !pinIds[i.id]; });
      var rest = restAll.slice(0, 400);
      var headM = '<div class="feed-sec"><span class="fs-tag mkt">💰 市场影响</span>' +
        '<span class="fs-note">' + mktAll.length + ' 条 · 共显示 ' + mkt.length +
        ' 条（点下方"💰 市场影响"看全部）</span></div>';
      var head1 = '<div class="feed-sec"><span class="fs-tag warn">⚠ 重要事件</span>' +
        '<span class="fs-note">' + pin.length +
        ' 条 · 近 6 小时 critical/high 或分数>50，按紧急度排序</span></div>';
      var head2 = '<div class="feed-sec"><span class="fs-tag">🕐 实时流</span>' +
        '<span class="fs-note">' + rest.length + ' 条 · 按时间排序</span></div>';
      var htmlOut = (mkt.length ? headM + '<div class="pin-list">' + mkt.map(itemHTML).join('') + '</div>' : '') +
        (pin.length ? head1 + '<div class="pin-list">' + pin.map(itemHTML).join('') + '</div>' : '') +
        (rest.length ? head2 + renderUnits(groupBursts(rest)) : '');
      host.innerHTML = htmlOut || emptyHtml;
    } else {
      list = list.slice(0, 400);
      host.innerHTML = list.length ? renderUnits(groupBursts(list)) : emptyHtml;
    }
    // 轮询刷新会重建列表：保住阅读位置；勾选"新事件自动置顶"则回顶
    var as = $('autoScroll');
    host.scrollTop = (as && as.checked) ? 0 : prevScroll;
  }

  /* ---------------- 告警 ---------------- */
  function alertHTML(a) {
    return '' +
      '<div class="alert ' + esc(a.level) + (a.acked ? ' acked' : '') + '" data-aid="' + a.id + '">' +
        '<div class="al-title">' + esc(a.title) + '</div>' +
        (a.note ? '<div class="al-note">' + esc(a.note) + '</div>' : '') +
        '<div class="al-meta">' +
          '<span>' + (LV_TEXT[a.level] || a.level) + ' · ' + (a.score || 0) + '分</span>' +
          (a.geo_name ? '<span>📍' + esc(a.geo_name) + '</span>' : '') +
          '<span>' + ago(a.created_at) + '</span>' +
          '<button onclick="GD.ack(' + a.id + ')">确认</button>' +
        '</div>' +
      '</div>';
  }

  function renderAlerts() {
    var host = $('alertList');
    var list = state.alerts.slice(0, 60);
    $('alertCount').textContent = list.length ? '(' + list.length + ')' : '';
    host.innerHTML = list.length ? list.map(alertHTML).join('') : '<div class="hint">暂无紧急告警。</div>';
  }

  function showBanner(a) {
    var b = $('alertBanner');
    b.className = 'alert-banner' + (a.level === 'high' ? ' high' : '');
    $('abTitle').textContent = a.title;
    $('abMeta').textContent = '【' + (LV_TEXT[a.level] || a.level) + ' · ' + (a.score || 0) + '分】' +
      (a.geo_name ? ' 📍' + a.geo_name : '') + ' · ' + (a.created_at || '');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(function () { b.classList.add('hidden'); }, 45000);
  }

  /* ---------------- 可视化看板（零依赖，纯 SVG） ---------------- */
  var NS = 'http://www.w3.org/2000/svg';
  var CAT_COLOR = { economy: '#2e9e6b', military: '#e5484d', policy: '#3b82f6', other: '#64748b' };
  var CAT_TEXT2 = { economy: '经济', military: '军事', policy: '政策', other: '其他' };

  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function svgText(x, y, str, anchor, fill, size) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'start', fill: fill || '#8fa3bf' });
    t.setAttribute('font-size', size || 9);
    t.setAttribute('font-family', 'Microsoft YaHei, Segoe UI, sans-serif');
    t.textContent = str;
    return t;
  }
  function clearSvg(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function fit(svg, h) {
    var w = svg.clientWidth || 240;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    clearSvg(svg);
    return w;
  }

  // 堆叠柱：逐小时事件量（按级别着色）
  function renderTrend(series) {
    var svg = $('chartTrend'); if (!svg || !series || !series.length) return;
    var H = 88, w = fit(svg, H);
    var pad = { l: 24, r: 6, t: 6, b: 13 };
    var iw = w - pad.l - pad.r, ih = H - pad.t - pad.b;
    var max = 1;
    series.forEach(function (s) { max = Math.max(max, s.total); });
    var nice = Math.ceil(max / 4) * 4 || 4;
    [0, 0.5, 1].forEach(function (f) {
      var y = pad.t + ih * (1 - f);
      svg.appendChild(svgEl('line', { x1: pad.l, y1: y, x2: w - pad.r, y2: y,
        stroke: '#1d2a3b', 'stroke-width': 1 }));
      svg.appendChild(svgText(pad.l - 3, y + 3, String(Math.round(nice * f)), 'end', '#5f7391', 8));
    });
    var bw = iw / series.length, order = ['low', 'medium', 'high', 'critical'];
    series.forEach(function (s, i) {
      var x = pad.l + i * bw + bw * 0.15, bwid = Math.max(1.5, bw * 0.7), acc = 0;
      order.forEach(function (lv) {
        var v = s[lv] || 0; if (!v) return;
        var hh = ih * v / nice;
        svg.appendChild(svgEl('rect', { x: x, y: pad.t + ih - acc - hh, width: bwid,
          height: Math.max(1, hh), fill: LV_COLOR[lv], rx: 1,
          opacity: lv === 'low' ? 0.5 : 0.95 }));
        acc += hh;
      });
      if (i % Math.max(1, Math.round(series.length / 6)) === 0) {
        svg.appendChild(svgText(x + bwid / 2, H - 3, s.hour.slice(0, 2), 'middle', '#5f7391', 8));
      }
    });
  }

  // 横向条：rows = [{label, value, color}]
  function renderBars(svgId, rows) {
    var svg = $(svgId); if (!svg) return;
    var H = 88, w = fit(svg, H);
    if (!rows || !rows.length) { svg.appendChild(svgText(6, 20, '暂无数据', 'start', '#5f7391', 9)); return; }
    var pad = { l: 40, r: 26, t: 3, b: 1 };
    var max = 1; rows.forEach(function (r) { max = Math.max(max, r.value); });
    var rh = (H - pad.t - pad.b) / rows.length;
    rows.forEach(function (r, i) {
      var y = pad.t + i * rh;
      svg.appendChild(svgText(1, y + rh * 0.72, r.label, 'start', '#8fa3bf', 9));
      var bw = (w - pad.l - pad.r) * r.value / max;
      svg.appendChild(svgEl('rect', { x: pad.l, y: y + rh * 0.2, width: Math.max(1.5, bw),
        height: Math.max(2, rh * 0.58), fill: r.color || '#3b82f6', rx: 2, opacity: 0.9 }));
      svg.appendChild(svgText(w - 1, y + rh * 0.72, String(r.value), 'end', '#dbe6f5', 9));
    });
  }

  function renderViz(ts) {
    if (!ts) return;
    state.ts = ts;
    renderTrend(ts.series);
    var cat = ts.by_category || {};
    renderBars('chartCat', ['economy', 'military', 'policy', 'other']
      .filter(function (k) { return cat[k]; })
      .map(function (k) { return { label: CAT_TEXT2[k], value: cat[k], color: CAT_COLOR[k] }; }));
    var lvl = ts.by_level || {};
    renderBars('chartLvl', ['critical', 'high', 'medium', 'low']
      .filter(function (k) { return lvl[k]; })
      .map(function (k) { return { label: LV_TEXT[k], value: lvl[k], color: LV_COLOR[k] }; }));
    renderBars('chartGeo', (ts.top_geo || []).slice(0, 6).map(function (g) {
      var col = g.mx >= 3 ? LV_COLOR.critical : (g.mx === 2 ? LV_COLOR.high : '#4a6b8a');
      return { label: String(g.geo_name).slice(0, 5), value: g.n, color: col };
    }));
    var tot = (ts.series || []).reduce(function (a, s) { return a + s.total; }, 0);
    var sum = $('vizTrendSum');
    if (sum) sum.textContent = '共 ' + tot + ' 条 · 峰值 ' +
      Math.max.apply(null, (ts.series || [{ total: 0 }]).map(function (s) { return s.total; })) + '/时';
  }

  function loadTimeseries() {
    return fetch('/api/timeseries?hours=24').then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) renderViz(d.ts); }).catch(function () {});
  }

  /* ---------------- 研判简报 ---------------- */
  function briefHTML(b) {
    var lv = b.levels || {};
    var chips = ['critical', 'high', 'medium', 'low'].filter(function (k) { return lv[k]; })
      .map(function (k) { return '<span class="tag lv-' + k + '">' + LV_TEXT[k] + ' ' + lv[k] + '</span>'; })
      .join('');
    var kind = b.kind === 'daily' ? '每日简报' : (b.kind === 'round' ? '轮次简报' : '简报');
    return '<div class="brief ' + (b.kind === 'daily' ? 'daily' : '') + '">' +
      '<div class="brief-head"><span class="kind">' + kind + '</span>' +
        '<span>' + esc(b.created_at || '') + '</span></div>' +
      (b.headline ? '<div class="brief-headline">' + esc(b.headline) + '</div>' : '') +
      (b.body ? '<div class="brief-body">' + esc(b.body) + '</div>' : '') +
      (chips ? '<div class="brief-levels">' + chips + '</div>' : '') +
      '</div>';
  }

  function renderBriefs() {
    var list = state.briefs || [];
    var host = $('briefList');
    if (!host) return;
    $('briefCount').textContent = list.length ? '(' + list.length + ')' : '';
    host.innerHTML = list.length ? list.map(briefHTML).join('')
      : '<div class="hint">还没有简报。每轮研判结束后系统会自动生成一份，每日 08:00 还有一份总览。</div>';
  }

  /* ---------------- 来源元数据（全球源区域标识） ---------------- */
  function loadSources() {
    return fetch('/api/sources').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) return;
      var m = {};
      (d.sources || []).forEach(function (s) { m[s.key] = s; });
      state.srcMeta = m;
      renderFeed();
    }).catch(function () {});
  }

  /* ---------------- 走向判断（经济 + 供应链）汇总条 ---------------- */
  var DIR_CLS = { '转强': 'up', '转弱': 'down', '震荡': 'flat', '分化': 'split' };
  var SC_CLS = { '中断': 'neg', '紧张': 'flat', '缓解': 'pos', '正常': 'neu' };

  function dominant(obj) {
    var best = '', n = -1;
    for (var k in (obj || {})) {
      if (obj[k] > n) { best = k; n = obj[k]; }
    }
    return best ? { key: best, n: n } : null;
  }

  var MKT_CLS = { '看多': 'up', '看空': 'down', '中性': 'flat', '分化': 'split' };

  function renderOutlook(d) {
    var items = (d && d.items) || [];
    var ec = dominant(d && d.econ_tally);
    var sc = dominant(d && d.sc_tally);
    var cr = dominant(d && d.crypto_tally);
    var eq = dominant(d && d.equity_tally);
    var oe = $('olEcon'), os = $('olSc'), on = $('olNote');
    var oc = $('olCrypto'), oq = $('olEquity');
    if (!oe || !os) return;
    if (ec) {
      oe.className = 'ol-chip ' + (DIR_CLS[ec.key] || '');
      oe.textContent = '经济：' + ec.key + '（' + ec.n + ' 条判断）';
    } else {
      oe.className = 'ol-chip';
      oe.textContent = '经济：待研判';
    }
    if (sc) {
      os.className = 'ol-chip ' + (SC_CLS[sc.key] || '');
      os.textContent = '供应链：' + sc.key + '（' + sc.n + ' 条）';
    } else {
      os.className = 'ol-chip';
      os.textContent = '供应链：待研判';
    }
    if (oc) {
      oc.className = 'ol-chip ' + (MKT_CLS[cr.key] || '');
      oc.textContent = '💰 加密：' + cr.key + '（' + cr.n + ' 条）';
    } else {
      oc.className = 'ol-chip';
      oc.textContent = '💰 加密：待研判';
    }
    if (oq) {
      oq.className = 'ol-chip ' + (MKT_CLS[eq.key] || '');
      oq.textContent = '📈 股市：' + eq.key + '（' + eq.n + ' 条）';
    } else {
      oq.className = 'ol-chip';
      oq.textContent = '📈 股市：待研判';
    }
    // 取最新一条判断作为摘要
    var latest = items.length ? items[0] : null;
    var note = '';
    if (latest) {
      var t = latest.title_zh || latest.title || '';
      var txt = latest.sc_outlook || latest.econ_outlook || latest.mkt_equity || '';
      note = t.slice(0, 24) + '：' + txt.slice(0, 86);
    }
    on.textContent = note || '等待智能体团队给出判断…';
    on.title = note;
  }

  function loadOutlook() {
    return fetch('/api/outlook').then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) { state.outlook = d; renderOutlook(d); } })
      .catch(function () {});
  }

  /* 外网地址 + 数据源健康 */
  function loadTunnel() {
    return fetch('/api/tunnel').then(function (r) { return r.json(); }).then(function (d) {
      var el = document.getElementById('tunnelLink');
      if (el && d.ok && d.url) { el.href = d.url; el.style.display = ''; el.title = d.url; }
    }).catch(function () {});
  }
  function loadSrcHealth() {
    return fetch('/api/source_health').then(function (r) { return r.json(); }).then(function (d) {
      var el = document.getElementById('srcHealth');
      if (!el || !d.ok) return;
      var s = d.summary || {};
      var bad = (s.dead || 0) + (s.stale || 0);
      el.textContent = '\u6e90 ' + (s.ok || 0) + '/' + (s.total || 0) + (bad ? ' \u26a0' + bad : '');
      el.className = 'src-health' + (s.dead ? ' bad' : (bad ? ' warn' : ''));
      el.title = (s.worst || []).map(function (w) { return w.name + '\uff1a' + w.reason; }).join('\n')
        || '\u5168\u90e8\u6570\u636e\u6e90\u6b63\u5e38';
    }).catch(function () {});
  }

  function loadBriefs() {
    return fetch('/api/briefs?limit=30').then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) { state.briefs = d.briefs || []; renderBriefs(); }
    }).catch(function () {});
  }

  /* ---------------- 告警日志（紧急/高级别留痕） ---------------- */
  function ledgerHTML(e) {
    if (e.kind === 'review') {
      return '<div class="led rev">' +
        '<div class="led-h"><span class="tag ai-tag-sm">AI 复核</span><span>' + esc(e.ts || '') + '</span></div>' +
        (e.note ? '<div class="led-t">' + esc(e.note) + '</div>' : '') +
        (e.analysis ? '<div class="led-a">' + esc(e.analysis) + '</div>' : '') +
        (e.action ? '<div class="led-act">▸ ' + esc(e.action) + '</div>' : '') +
        ((e.confidence != null || e.horizon)
          ? '<div class="led-m">' + (e.confidence != null ? '置信度 ' + e.confidence : '') +
            (e.horizon ? ' ｜ 影响尺度 ' + esc(e.horizon) : '') + '</div>' : '') +
        '</div>';
    }
    return '<div class="led">' +
      '<div class="led-h"><span class="tag lv-' + esc(e.level || '') + '">' +
        (LV_TEXT[e.level] || e.level) + ' ' + (e.score || '') + '</span>' +
        '<span>' + esc(e.ts || '') + '</span>' +
        (e.geo_name ? '<span class="tag geo">📍' + esc(e.geo_name) + '</span>' : '') + '</div>' +
      '<div class="led-t">' + esc(e.title || '') + '</div>' +
      '<div class="led-m">' + esc(e.source || '') +
        (e.url ? ' · <a href="' + esc(e.url) + '" target="_blank" rel="noopener">原文</a>' : '') +
      '</div></div>';
  }

  function renderLedger() {
    var host = $('ledgerList');
    if (!host) return;
    var list = (state.ledger || []).slice().reverse();   // 最新在上
    if ($('ledgerCount')) $('ledgerCount').textContent = list.length ? '(' + list.length + ')' : '';
    host.innerHTML = list.length ? list.map(ledgerHTML).join('')
      : '<div class="hint">暂无日志。紧急(critical)与高(high)级别事件会自动记录在此，'
        + '并追加到 <code>logs/alert-ledger.md</code>。</div>';
  }

  function loadLedger() {
    return fetch('/api/ledger?limit=200').then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) { state.ledger = d.entries || []; renderLedger(); }
    }).catch(function () {});
  }

  /* ---------------- 数据加载 ---------------- */
  function qs() {
    return '?category=' + encodeURIComponent(state.cat) +
      '&hours=' + state.hours +
      '&limit=400' +
      (state.q ? '&q=' + encodeURIComponent(state.q) : '');
  }

  function loadItems(append) {
    return fetch('/api/items' + qs()).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) return;
      state.items = d.items || [];
      if (state.items.length) state.lastItemId = Math.max(state.lastItemId, state.items[0].id);
      renderMap(); renderFeed(); renderQueue();
    }).catch(function () {});
  }
  function loadAlerts() {
    return fetch('/api/alerts?limit=60').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) return;
      state.alerts = d.alerts || [];
      renderAlerts();
      if (!state.booted && state.alerts.length) {
        // 首屏不弹横幅，只记录已读
        state.alerts.forEach(function (a) { state.seenAlerts[a.id] = 1; });
      }
    }).catch(function () {});
  }
  function loadStats() {
    return fetch('/api/stats').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) return;
      state.stats = d.stats; renderStats(); renderSources(); renderQueue();
    }).catch(function () {});
  }

  function renderStats() {
    var s = state.stats || {};
    $('sTotal').textContent = s.last24h != null ? s.last24h : '-';
    $('sUrgent').textContent = s.urgent24h != null ? s.urgent24h : '-';
    $('sAlerts').textContent = s.alerts24h != null ? s.alerts24h : '-';
    $('sPending').textContent = s.llm_pending != null ? s.llm_pending : '-';
    $('sUpdated').textContent = s.last_item_at ? hhmm(s.last_item_at) : '-';
  }

  function renderSources() {
    var s = state.stats || {};
    var bySrc = s.by_source || {};
    var detail = (s.last_run && s.last_run.detail) ? s.last_run.detail : {};
    var counts = detail.sources || {};
    var errors = (detail.errors || []).join(' ');
    var keys = Object.keys(counts);
    $('srcSum').textContent = keys.length ? ('(' + keys.filter(function (k) { return counts[k] > 0; }).length + '/' + keys.length + ')') : '';
    $('srcList').innerHTML = keys.map(function (k) {
      // 只有"上一轮 0 条 且 24h 也是 0"才算异常；冷源（10 分钟才轮询一次）
      // 在某个快讯轮次里不出数属正常，不应报红
      var bad = counts[k] === 0 && !(bySrc[k] > 0);
      return '<div class="src-row">' +
        '<span class="st' + (bad ? ' bad' : '') + '"></span>' +
        '<span class="nm" title="' + esc(k) + '">' + esc(k) + '</span>' +
        '<span class="ct">' + (bySrc[k] || 0) + '</span></div>';
    }).join('') || '<div class="hint">尚未采集。</div>';
    if (errors) $('srcList').innerHTML += '<div class="hint">部分源异常：' + esc(errors.slice(0, 120)) + '</div>';
  }

  function renderQueue() {
    var pend = state.items.filter(function (i) { return i.llm_state === 'pending'; }).slice(0, 12);
    $('queueList').innerHTML = pend.length ? pend.map(function (i) {
      return '<div class="q-row"><span class="s">' + i.score + '</span><span>' + esc(i.title.slice(0, 52)) + '</span></div>';
    }).join('') : '<div class="hint">队列已清空（或本轮无灰区条目）。</div>';
  }

  /* ---------------- SSE ---------------- */
  function setConn(ok) {
    state.connected = ok;
    var el = $('connState'), dot = $('liveDot');
    el.textContent = ok ? '实时连接' : '轮询模式';
    el.className = 'conn ' + (ok ? 'ok' : 'bad');
    dot.className = 'dot-live' + (ok ? '' : ' off');
  }

  function connect() {
    if (pollTimer) return;          // 已处于轮询模式就不要再建 SSE
    if (!window.EventSource) { setConn(false); poll(); return; }
    var es = new EventSource('/api/stream');
    var gotHello = false;
    // 公网走 Cloudflare 隧道时，SSE 流可能被反代缓冲，hello 永远到不了，
    // 页面就会停在"连接中…"且列表不再更新。8 秒收不到 hello 即降级为轮询。
    setTimeout(function () {
      if (!gotHello) {
        try { es.close(); } catch (e) {}
        setConn(false);
        poll();
      }
    }, 8000);
    es.addEventListener('hello', function () { gotHello = true; setConn(true); });
    es.addEventListener('items', function (ev) {
      var d = JSON.parse(ev.data);
      var fresh = (d.items || []).filter(function (i) { return i.id > state.lastItemId; });
      if (!fresh.length) return;
      state.lastItemId = fresh[fresh.length - 1].id;
      // 符合当前筛选的才插入显示
      var keep = fresh.filter(function (i) {
        if (state.cat !== 'all' && i.category !== state.cat) return false;
        if (state.lvl && LV_ORDER[i.level] < LV_ORDER[state.lvl]) return false;
        if (state.geo && i.geo_name !== state.geo) return false;
        return true;
      });
      if (keep.length) {
        state.items = keep.concat(state.items).slice(0, 600);
        renderMap(); renderFeed();
        if ($('autoScroll').checked) $('feed').scrollTop = 0;
      }
      if (fresh.some(function (i) { return i.level === 'critical'; })) {
        var t = $('feed');
        if (t.firstChild) { t.firstChild.classList.add('flash'); }
      }
    });
    es.addEventListener('alerts', function (ev) {
      var d = JSON.parse(ev.data);
      (d.alerts || []).forEach(function (a) {
        if (state.seenAlerts[a.id]) return;
        state.seenAlerts[a.id] = 1;
        if (state.booted) {
          showBanner(a);
          beep(a.level);
          if (window.Notification && Notification.permission === 'granted') {
            try { new Notification('全球态势警报 · ' + (LV_TEXT[a.level] || ''), { body: a.title }); } catch (e) {}
          }
        }
      });
      loadAlerts();
    });
    es.addEventListener('stats', function (ev) {
      var d = JSON.parse(ev.data);
      state.stats = d.stats; renderStats(); renderSources(); renderQueue();
      loadTimeseries();
    });
    es.onerror = function () {
      setConn(false);
      try { es.close(); } catch (e) {}
      if (pollTimer) return;          // 已降级为轮询，不再重连 SSE
      setTimeout(connect, 5000);
    };
  }

  var pollTimer = null;
  function poll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () { loadItems(); loadAlerts(); loadStats(); }, 15000);
  }

  /* ---------------- 交互 ---------------- */
  function bindChips(hostId, attr, cb) {
    var host = $(hostId);
    if (!host) return;
    host.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      Array.prototype.slice.call(host.querySelectorAll('.chip')).forEach(function (c) { c.classList.remove('active'); });
      b.classList.add('active');
      cb(b.getAttribute(attr));
    });
  }

  /* ---------------- 公开接口 ---------------- */
  window.GD = {
    boot: function () {
      buildMap();
      bindChips('catChips', 'data-cat', function (v) { state.cat = v || 'all'; loadItems(); });
      bindChips('lvlChips', 'data-lvl', function (v) { state.lvl = v; renderFeed(); });
      bindChips('hourChips', 'data-hours', function (v) { state.hours = parseInt(v, 10) || 24; loadItems(); });

      if (window.Notification && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
      }
      // 右侧标签页：告警 / 研判简报（支持 ?tab=briefs 直接打开简报页）
      function activateTab(name) {
        Array.prototype.slice.call(document.querySelectorAll('.tab')).forEach(function (x) {
          x.classList.toggle('active', x.getAttribute('data-tab') === name);
        });
        $('pane-alerts').classList.toggle('hidden', name !== 'alerts');
        $('pane-briefs').classList.toggle('hidden', name !== 'briefs');
        if ($('pane-ledger')) $('pane-ledger').classList.toggle('hidden', name !== 'ledger');
        if (name === 'briefs') loadBriefs();
        if (name === 'ledger') loadLedger();
      }
      Array.prototype.slice.call(document.querySelectorAll('.tab')).forEach(function (t) {
        t.addEventListener('click', function () { activateTab(t.getAttribute('data-tab')); });
      });
      var wantTab = (location.search.match(/[?&]tab=(\w+)/) || [])[1];
      if (wantTab) activateTab(wantTab);

      var oa = $('onlyAI');
      if (oa) oa.addEventListener('change', function () { state.onlyAI = oa.checked; renderFeed(); });
      var od = $('onlyDecision');
      if (od) od.addEventListener('change', function () { state.onlyDecision = od.checked; renderFeed(); });
      // 紧凑模式：默认只显示标题/摘要，详情走悬停浮层；勾选"展开全部详情"则内联展开
      document.body.classList.add('compact');
      var ex = $('expandAll');
      if (ex) ex.addEventListener('change', function () {
        document.body.classList.toggle('compact', !ex.checked);
        hidePop(true);
      });
      // 待译英文默认隐藏（翻译轮追上来自动出现；危重级别始终展示）
      document.body.classList.add('hide-pending');
      var hp = $('hidePending');
      if (hp) hp.addEventListener('change', function () {
        document.body.classList.toggle('hide-pending', hp.checked);
        renderFeed();
      });
      // 重要置顶：之前缺这一处绑定，勾选框点了没有任何反应（死按钮）
      var pi = $('pinImportant');
      if (pi) {
        state.pinImportant = pi.checked;
        pi.addEventListener('change', function () {
          state.pinImportant = pi.checked;
          renderFeed();
        });
      }
      // 新事件自动置顶：勾选时立即回顶，取消时保持当前位置
      var asc = $('autoScroll');
      if (asc) asc.addEventListener('change', function () {
        if (asc.checked) $('feed').scrollTop = 0;
      });
      bindHoverDetail();
      // 布局密度：把纵向空间让给信息流（默认"紧凑"）
      var LAYOUTS = ['dashboard', 'compact2', 'feedonly'];
      function applyLayout(name) {
        if (LAYOUTS.indexOf(name) < 0) name = 'compact2';
        document.body.classList.remove('layout-dashboard', 'layout-compact2', 'layout-feedonly');
        document.body.classList.add('layout-' + name);
        var btns = document.querySelectorAll('.lt');
        Array.prototype.slice.call(btns).forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-layout') === name);
        });
        state.layout = name;
        try { localStorage.setItem('gd_layout', name); } catch (e) {}
        hidePop(true);
      }
      var lts = document.querySelectorAll('.lt');
      Array.prototype.slice.call(lts).forEach(function (b) {
        b.addEventListener('click', function () { applyLayout(b.getAttribute('data-layout')); });
      });
      var savedLayout = null;
      try { savedLayout = localStorage.getItem('gd_layout'); } catch (e) {}
      // 支持 URL 直达：?layout=feedonly 可当书签用
      var urlLayout = null;
      try { urlLayout = new URLSearchParams(location.search).get('layout'); } catch (e) {}
      applyLayout(urlLayout || savedLayout || 'compact2');
      // 来源筛选按钮（全部 / 🌐 全球 / 国内）
      var ofs = document.querySelectorAll('.of');
      Array.prototype.slice.call(ofs).forEach(function (b) {
        b.addEventListener('click', function () {
          Array.prototype.slice.call(ofs).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          state.origin = b.getAttribute('data-origin') || 'all';
          renderFeed();
        });
      });

      // 快捷视图：全部视图 / 市场影响 / 重要>50
      var qfs = document.querySelectorAll('.qf');
      Array.prototype.slice.call(qfs).forEach(function (b) {
        b.addEventListener('click', function () {
          Array.prototype.slice.call(qfs).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          state.quick = b.getAttribute('data-quick') || '';
          renderFeed();
        });
      });
      Promise.all([loadSources(), loadItems(), loadAlerts(), loadStats(), loadBriefs(), loadTimeseries(), loadLedger(), loadOutlook(), loadTunnel(), loadSrcHealth()]).then(function () {
        state.booted = true;
        // 公网走 Cloudflare 隧道时 SSE 会被反代缓冲（经实测始终 0 字节），
        // 因此 https 页面直接走轮询，保证内容会按时自动更新；本地 http 仍用 SSE 实时推送。
        // 想强制走 SSE 可加 ?stream=1；截图/自动化可用 ?nostream=1 关掉长连接。
        var forcePoll = /[?&]nostream=1/.test(location.search) ||
          (location.protocol === 'https:' && !/[?&]stream=1/.test(location.search));
        if (forcePoll) { setConn(false); poll(); }
        else { connect(); }
      });
      setInterval(loadStats, 30000);
      setInterval(loadTimeseries, 60000);
      setInterval(loadBriefs, 60000);
      setInterval(loadLedger, 60000);
      setInterval(loadOutlook, 60000);
      setInterval(loadSrcHealth, 120000);
      var rz;
      window.addEventListener('resize', function () {
        clearTimeout(rz);
        rz = setTimeout(function () { renderViz(state.ts); renderMap(); }, 220);
      });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) { loadItems(); loadAlerts(); loadStats(); loadBriefs(); loadTimeseries(); }
      });
    },
    applyFilters: function () {
      state.q = $('q').value.trim();
      loadItems();
    },
    // 一键清除所有筛选：空列表时提供"为什么会空 + 怎么恢复"的出口
    clearFilters: function () {
      state.cat = 'all'; state.lvl = ''; state.geo = ''; state.hours = 24; state.q = '';
      state.origin = 'all'; state.onlyAI = false; state.onlyDecision = false;
      function setChips(hostId, attr, val) {
        var host = $(hostId);
        if (!host) return;
        Array.prototype.slice.call(host.querySelectorAll('.chip')).forEach(function (c) {
          c.classList.toggle('active', (c.getAttribute(attr) || '') === val);
        });
      }
      setChips('catChips', 'data-cat', 'all');
      setChips('lvlChips', 'data-lvl', '');
      setChips('hourChips', 'data-hours', '24');
      Array.prototype.slice.call(document.querySelectorAll('.of')).forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-origin') === 'all');
      });
      var q = $('q'); if (q) q.value = '';
      ['onlyAI', 'onlyDecision'].forEach(function (id) {
        var el = $(id); if (el) el.checked = false;
      });
      var mh = $('mapHint');
      if (mh) mh.textContent = '点击标记可筛选该地区事件';
      loadItems();
    },
    refreshAll: function () { loadSources(); loadItems(); loadAlerts(); loadStats(); loadBriefs(); loadTimeseries(); loadLedger(); loadOutlook(); },
    toggleSound: function () {
      state.sound = !state.sound;
      var b = $('soundBtn');
      b.textContent = state.sound ? '🔔 声音开' : '🔕 声音关';
      b.className = 'btn' + (state.sound ? ' on' : '');
      if (state.sound) beep('high');
    },
    dismissBanner: function () { $('alertBanner').classList.add('hidden'); },
    hideDetail: function (force) { hidePop(!!force); },
    ack: function (id) {
      fetch('/api/ack', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      }).then(loadAlerts);
    }
  };

  document.addEventListener('DOMContentLoaded', window.GD.boot);
})();