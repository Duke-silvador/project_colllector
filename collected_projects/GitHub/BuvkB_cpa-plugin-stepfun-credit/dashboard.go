package main

// dashboardHTML 由 CPA 的 /v0/resource/plugins/<id>/dashboard 提供。
// 复用 CPAMC 主题变量；同源 iframe 会跟随父页面 data-theme。
const dashboardHTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StepFun Credit</title>
<style>
:root{
  --bg-secondary:#faf9f5;--bg-primary:#f0eee8;--bg-tertiary:#e9e6df;--bg-quinary:#f6f4ee;
  --surface:#fffdf9;--border-color:#e3e1db;--border-primary:#d5d2cb;
  --text-primary:#2d2a26;--text-secondary:#6d6760;--text-tertiary:#a29c95;
  --success-color:#10b981;--warning-color:#c65746;--quota-medium-color:#e0aa14;
  --accent:#5b8def;
}
[data-theme='white']{
  --bg-secondary:#fff;--bg-primary:#fff;--bg-tertiary:#f6f6f6;--bg-quinary:#fff;
  --surface:#fff;--border-color:#e5e5e5;--border-primary:#d9d9d9;
}
[data-theme='dark']{
  --bg-secondary:#151412;--bg-primary:#1d1b18;--bg-tertiary:#262320;--bg-quinary:#191714;
  --surface:#2a2723;--border-color:#3a3530;--border-primary:#4a453f;
  --text-primary:#f6f4f1;--text-secondary:#c9c3bb;--text-tertiary:#9c958d;
  --quota-medium-color:#ffd862;--accent:#7aa2f7;
}
*{box-sizing:border-box}
html,body{margin:0}
body{
  background:var(--bg-secondary);color:var(--text-primary);
  font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px;margin:0 auto;padding:20px 18px 48px}
header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px}
h1{font-size:18px;margin:0;font-weight:600;letter-spacing:.2px}
.sub{color:var(--text-tertiary);font-size:12.5px}
.grow{flex:1}
.seg{display:inline-flex;border:1px solid var(--border-color);border-radius:8px;overflow:hidden;background:var(--bg-tertiary)}
.seg button{border:0;border-radius:0;background:transparent;padding:5px 11px;font-size:12.5px;color:var(--text-secondary);border-right:1px solid var(--border-color)}
.seg button:last-child{border-right:0}
.seg button.on{background:var(--accent);color:#fff;font-weight:600}
.seg button:hover:not(.on){background:var(--bg-quinary)}
.charthead{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.pick{display:inline-flex;align-items:center;gap:6px;font-size:12.5px}
.pick select{background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);
  border-radius:8px;padding:5px 9px;font-size:12.5px;font-family:inherit;cursor:pointer;min-width:112px}
.pick select:hover{border-color:var(--border-primary)}
.chartwrap{position:relative}
svg .bar{height:auto;min-width:0;flex:none}
.chart-bar{transition:opacity .12s ease}
.chart-bar:hover{opacity:1 !important}
.tip{position:absolute;pointer-events:none;z-index:5;background:var(--surface);color:var(--text-primary);
  border:1px solid var(--border-primary);border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.6;
  box-shadow:0 6px 18px rgba(0,0,0,.22);white-space:nowrap;transform:translate(-50%,-100%)}
.tip b{font-variant-numeric:tabular-nums}
.tip .tk{color:var(--text-tertiary)}
.charthead h2{margin:0}
#brand{flex:0 0 auto;vertical-align:middle}
pre.snippet{background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;
  padding:10px 12px;margin:10px 0 0;overflow:auto;font-size:12px;line-height:1.6;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--text-secondary)}
.connrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
button{background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);
  border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit}
button:hover{border-color:var(--border-primary);background:var(--bg-quinary)}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));gap:12px;margin:16px 0}
.card{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:14px 16px}
.card .k{color:var(--text-secondary);font-size:12.5px;margin-bottom:6px}
.card .v{font-size:23px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.2px}
.card .d{color:var(--text-tertiary);font-size:12px;margin-top:5px}
.card.hl{border-color:var(--accent)}
.panel{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:14px 16px;margin-bottom:14px}
.panel h2{font-size:14px;margin:0 0 12px;font-weight:600;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.panel h2 .hint{font-weight:400;font-size:12px;color:var(--text-tertiary)}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{text-align:right;padding:7px 8px;border-bottom:1px solid var(--border-color);white-space:nowrap}
th:first-child,td:first-child{text-align:left}
th{color:var(--text-tertiary);font-weight:500;font-size:12px}
tbody tr:hover{background:var(--bg-quinary)}
tfoot td{font-weight:600;border-top:1px solid var(--border-primary);border-bottom:none}
.scroll{max-height:330px;overflow:auto}
.pill{display:inline-block;padding:1px 8px;border-radius:20px;font-size:11.5px;border:1px solid var(--border-color);color:var(--text-secondary)}
.pill.ok{color:var(--success-color)}
.pill.bad{color:var(--warning-color)}
.pill.un{border:none;padding:0;color:var(--text-tertiary)}
.bar{height:8px;border-radius:4px;background:var(--bg-tertiary);overflow:hidden;flex:1;min-width:50px}
.bar i{display:block;height:100%;background:var(--accent)}
.track{height:10px;border-radius:6px;background:var(--bg-tertiary);overflow:hidden;margin:12px 0 8px}
.track i{display:block;height:100%;background:var(--accent);transition:width .35s ease}
.track.warn i{background:var(--quota-medium-color)}
.track.crit i{background:var(--warning-color)}
.qrow{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px}
.qrow .muted{font-size:12.5px}
.note{background:var(--surface);border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;
  color:var(--text-secondary);font-size:12.5px;line-height:1.75}
.err{background:color-mix(in srgb,var(--warning-color) 12%,transparent);
  border:1px solid color-mix(in srgb,var(--warning-color) 40%,transparent);
  color:var(--warning-color);padding:10px 12px;border-radius:8px;margin:10px 0;display:none;white-space:pre-wrap}
.muted{color:var(--text-tertiary)}
svg{display:block;width:100%;height:200px}
dialog{border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);
  border-radius:12px;padding:0;max-width:560px;width:94%;font-family:inherit}
dialog::backdrop{background:rgba(0,0,0,.45)}
.dlg{padding:18px 20px}
.dlg h3{margin:0 0 4px;font-size:15px;font-weight:600}
.dlg p{margin:0 0 14px;color:var(--text-tertiary);font-size:12.5px;line-height:1.6}
.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-bottom:14px}
.subrow{display:grid;grid-template-columns:1.4fr 1fr auto;gap:8px;align-items:center;margin-bottom:7px}
.subrow select,.subrow input{background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-primary);
  border-radius:6px;padding:6px 8px;font-size:13px;font-family:inherit;width:100%}
.subrow .del{background:transparent;border:1px solid var(--border-color);color:var(--warning-color);
  border-radius:6px;padding:5px 10px;font-size:13px;cursor:pointer;line-height:1}
.subrow .del:hover{border-color:var(--warning-color)}
.subhead{display:grid;grid-template-columns:1.4fr 1fr auto;gap:8px;color:var(--text-tertiary);font-size:12px;margin-bottom:5px}
.opt{background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;padding:8px 10px;
  cursor:pointer;font-size:12.5px;text-align:left;color:var(--text-primary)}
.opt:hover{border-color:var(--border-primary)}
.opt b{display:block;font-size:13px;margin-bottom:2px}
.opt span{color:var(--text-tertiary);font-size:11.5px}
.field{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.field label{flex:0 0 92px;color:var(--text-secondary);font-size:13px}
.field input{flex:1;background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-primary);
  border-radius:6px;padding:6px 8px;font-size:13px;font-family:inherit}
.acts{display:flex;gap:8px;align-items:center;margin-top:16px}
@media (prefers-reduced-motion:reduce){.track i{transition:none}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <img id="brand" src="https://platform.stepfun.com/images/title-logo.png" alt="" width="22" height="22" style="border-radius:4px">
    <h1>StepFun Credit</h1>
    <span class="sub" id="sub">加载中…</span>
    <span id="connPill" class="pill" style="display:none"></span>
    <span class="grow"></span>
    <button id="settingsBtn">设置额度</button>
    <button id="refresh">刷新</button>
  </header>
  <div class="err" id="err"></div>

  <div class="cards" id="cards"></div>

  <div class="panel" id="quotaPanel" style="display:none">
    <h2>月池额度 <span class="hint" id="quotaHint"></span></h2>
    <div id="quotaBody"></div>
  </div>

  <div class="panel" id="connPanel" style="display:none">
    <h2>StepFun 接入 <span class="hint" id="connHint"></span></h2>
    <div id="connBody"></div>
  </div>

  <div class="panel">
    <div class="charthead">
      <h2>用量走势</h2>
      <span class="grow"></span>
      <label class="pick">
        <span class="muted">时间范围</span>
        <select id="rangeSel"></select>
      </label>
      <label class="pick">
        <span class="muted">粒度</span>
        <select id="granSel"></select>
      </label>
    </div>
    <div class="chartwrap" id="chartWrap">
      <svg id="chart" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="tip" id="chartTip" hidden></div>
    </div>
    <div class="muted" id="chartHint" style="font-size:12px;margin-top:6px"></div>
  </div>

  <div class="panel">
    <h2>本月按模型明细 <span class="hint" id="rangeHint"></span></h2>
    <div class="scroll"><table id="mt">
      <thead><tr><th>模型</th><th>请求</th><th>失败</th><th>输入</th><th>缓存命中</th><th>输出</th><th>Credit</th><th>≈¥</th></tr></thead>
      <tbody></tbody><tfoot></tfoot></table></div>
  </div>

  <div class="panel">
    <h2>最近请求 <span class="hint" id="reqHint">最新 40 条（本地时间）</span></h2>
    <div class="scroll"><table id="rt">
      <thead><tr><th>时间</th><th>模型</th><th>输入</th><th>缓存命中</th><th>输出</th><th>结果</th><th>Credit</th></tr></thead>
      <tbody></tbody></table></div>
  </div>

  <div class="note">
    <b>数据口径</b>：由 CPA 插件在每次请求完成后实时记账（StepFun 官方未开放月池查询接口，故为 CPA 侧按官方单价精确折算）。<br>
    Credit 折算：1 元 = 1,000,000 Credit。官方单价已内置，可在「设置额度」旁的接口调整。<br>
    <span class="muted">刷新策略：仅在本页可见时每 30 秒刷新一次；切回本页立即刷新；页面隐藏时完全停止。</span>
  </div>
</div>

<dialog id="setDlg"><div class="dlg">
  <h3>月池额度</h3>
  <p>StepFun 不提供月池余额查询接口，按实际订阅填写后即可算出已用 / 剩余 / 占比。<br>
     <span class="muted">多个订阅会累加为总月池；此设置保存在本机浏览器，不写入服务器。</span></p>
  <div id="subList"></div>
  <div class="acts" style="margin-top:4px">
    <button id="addSub">+ 添加订阅</button>
    <span class="grow"></span>
    <span class="muted" id="subTotal" style="font-size:12.5px"></span>
  </div>
  <div class="acts">
    <button id="clearQuota">清除</button>
    <span class="grow"></span>
    <button id="cancelSet">取消</button>
    <button id="saveSet" class="primary">保存</button>
  </div>
</div></dialog>

<script>
(function(){
'use strict';
var RB = '/v0/resource/plugins/stepfun-credit-tracker';
var INTERVAL_MS = 30000;
var timer = null, presets = [], loading = false, QUOTA_KEY = 'stepfun-credit-quota';
var RANGE_KEY = 'stepfun-credit-range', GRAN_KEY = 'stepfun-credit-gran';
var curRange = (function(){ try { return localStorage.getItem(RANGE_KEY) || '24h'; } catch(e){ return '24h'; } })();
var curGran = (function(){ try { return localStorage.getItem(GRAN_KEY) || 'auto'; } catch(e){ return 'auto'; } })();
var timeline = null;

/* ---------- 主题跟随 CPAMC ---------- */
function applyTheme(t){
  var el = document.documentElement;
  if (t === 'dark' || t === 'white') { el.setAttribute('data-theme', t); }
  else { el.removeAttribute('data-theme'); }
}
function detectTheme(){
  var t = 'auto';
  try {
    var p = window.parent;
    if (p && p !== window) {
      var stored = p.localStorage.getItem('cli-proxy-theme');
      if (stored) { t = String(stored).replace(/^"|"$/g, ''); }
      var attr = p.document.documentElement.getAttribute('data-theme');
      if (attr) { t = attr; }
    }
  } catch (e) {}
  if (t === 'auto' || t === '') {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'white';
  }
  applyTheme(t);
}
try {
  if (window.parent && window.parent !== window) {
    new MutationObserver(detectTheme).observe(window.parent.document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    window.parent.addEventListener('storage', detectTheme);
  }
} catch (e) {}
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectTheme); } catch (e) {}
detectTheme();

/* ---------- 工具 ---------- */
function get(p){ return fetch(RB + p, {cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
function normalizeQuota(q){
  if (!q) return {subscriptions: []};
  if (Array.isArray(q.subscriptions)) return q;
  if (q.total_credit > 0) return {subscriptions: [{name: q.plan_name || '订阅 1', credit: q.total_credit}]};
  return {subscriptions: []};
}
function loadQuota(){
  try { return normalizeQuota(JSON.parse(localStorage.getItem(QUOTA_KEY) || 'null')); }
  catch (e) { return {subscriptions: []}; }
}
function quotaTotal(){
  var t = 0, subs = (quota.subscriptions || []);
  for (var i=0;i<subs.length;i++){
    var c = Number(subs[i].credit) || 0;
    var n = Number(subs[i].count) || 1;
    if (n < 1) n = 1;
    t += c * n;
  }
  return t;
}
function saveQuota(q){
  try { localStorage.setItem(QUOTA_KEY, JSON.stringify(q)); } catch (e) {}
}
var quota = loadQuota();
function shortCredit(v){
  v = Number(v||0);
  if (v >= 1e9) return (v/1e9).toFixed(v>=1e10?0:1)+'B';
  if (v >= 1e6) return (v/1e6).toFixed(v>=1e7?0:1)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(v>=1e4?0:1)+'k';
  return String(Math.round(v));
}
function fmt(n){ if(n==null) return '—'; return Number(n).toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function credit(c){ return fmt(Math.round((c||0)*1e6)); }
function yuan(c){ c=c||0; return '¥'+(c>0&&c<0.01?c.toFixed(4):c.toFixed(2)); }
function localTime(iso){ try{ return new Date(iso).toLocaleString('zh-CN',{hour12:false}); }catch(e){ return iso; } }
function showErr(e){ var el=document.getElementById('err'); el.style.display='block'; el.textContent='取数失败：'+e.message; }
function hideErr(){ document.getElementById('err').style.display='none'; }

/* ---------- 渲染 ---------- */
function renderCards(d){
  var m = d.month.totals;
  var total = quotaTotal();
  var used = m.credit * 1e6;
  var remain = total > 0 ? Math.max(total - used, 0) : null;
  var cards = [
    {k:'本月已用', v:credit(m.credit), d:'Credit · ≈ '+yuan(m.credit)+' · '+fmt(m.requests)+' 次请求', hl:false},
    {k:'本月剩余', v:(remain==null?'未设置':fmt(remain)), d:remain==null?'点右上角「设置额度」填写月池总额度':'Credit · 额度 '+fmt(total), hl:remain!=null},
    {k:(d.range_label || '所选范围'), v:credit(d.window.totals.credit), d:'Credit · ≈ '+yuan(d.window.totals.credit)+' · '+fmt(d.window.totals.requests)+' 次', hl:false},
    {k:'距月末重置', v:(d.days_left||0)+' 天', d:'月池月末清零、不结转'}
  ];
  document.getElementById('cards').innerHTML = cards.map(function(c){
    return '<div class="card'+(c.hl?' hl':'')+'"><div class="k">'+c.k+'</div><div class="v">'+c.v+'</div><div class="d">'+c.d+'</div></div>';
  }).join('');
}

function renderQuota(d){
  var panel = document.getElementById('quotaPanel');
  var total = quotaTotal();
  if (total <= 0) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  var m = d.month.totals;
  var used = m.credit * 1e6;
  var pct = Math.min(used / total * 100, 100);
  var cls = pct >= 90 ? 'crit' : (pct >= 70 ? 'warn' : '');
  var subs = quota.subscriptions || [];
  var parts = [];
  for (var si=0; si<subs.length; si++){
    var n = Number(subs[si].count) || 1;
    parts.push(subs[si].name + (n > 1 ? (' ×' + n) : ''));
  }
  var label = parts.length ? (parts.join(' + ') + ' · ') : '';
  document.getElementById('quotaHint').textContent = label + subs.length + ' 个订阅 · 1 元 = 1,000,000 Credit';

  document.getElementById('quotaBody').innerHTML =
    '<div class="track '+cls+'"><i style="width:'+pct.toFixed(2)+'%"></i></div>' +
    '<div class="qrow">' +
      '<span>已用 <b>'+fmt(used)+'</b> / '+fmt(total)+' Credit</span>' +
      '<span>剩余 <b>'+fmt(Math.max(total-used,0))+'</b> Credit</span>' +
      '<span class="muted">已用 '+pct.toFixed(2)+'% · 月末重置剩 '+(d.days_left||0)+' 天</span>' +
    '</div>' +
    '<div class="qrow" style="margin-top:8px"><span class="muted">≈ 已用 '+yuan(m.credit)+' · 剩余约 '+yuan(Math.max(total-used,0)/1e6)+'</span></div>';
}

function renderPickers(d){
  var tl = d.timeline || {};
  var ranges = tl.ranges || [];
  var grans = tl.granularities || [];

  var rsel = document.getElementById('rangeSel');
  if (!rsel.dataset.built) {
    rsel.innerHTML = ranges.map(function(r){
      return '<option value="' + r.key + '">' + r.label + '</option>';
    }).join('');
    rsel.addEventListener('change', function(){
      curRange = rsel.value;
      try { localStorage.setItem(RANGE_KEY, curRange); } catch(e){}
      load();
    });
    rsel.dataset.built = '1';
  }
  if (rsel.value !== curRange) rsel.value = curRange;

  var gsel = document.getElementById('granSel');
  if (!gsel.dataset.built) {
    var items = [{key:'auto', label:'自动'}].concat(grans.map(function(g){ return {key:g.key, label:g.label}; }));
    gsel.innerHTML = items.map(function(g){
      return '<option value="' + g.key + '">' + g.label + '</option>';
    }).join('');
    gsel.addEventListener('change', function(){
      curGran = gsel.value;
      try { localStorage.setItem(GRAN_KEY, curGran); } catch(e){}
      load();
    });
    gsel.dataset.built = '1';
  }
  var gv = curGran || 'auto';
  if (gsel.value !== gv) gsel.value = gv;
}

function renderConn(d){
  var panel = document.getElementById('connPanel');
  var pill = document.getElementById('connPill');
  var disc = d.discovery || {};
  var provs = disc.providers || [];
  panel.style.display = 'block';

  if (provs.length) {
    pill.style.display = 'inline-block';
    pill.className = 'pill ok';
    pill.textContent = '已接入 StepFun';
    document.getElementById('connHint').textContent = '从真实流量自动识别，无需手动指定通道名';
    var rows = provs.map(function(p){
      return '<div class="connrow"><span class="pill ok">已识别</span>' +
        '<b>' + (p.key || '（未知通道）') + '</b>' +
        '<span class="muted">' + (p.base_url || '') + '</span>' +
        '<span class="muted">命中 ' + fmt(p.seen) + ' 次 · 依据 ' + (p.matched || '') + '</span></div>';
    }).join('');
    document.getElementById('connBody').innerHTML = rows +
      '<div class="muted" style="margin-top:8px;font-size:12.5px">凭据与请求都走 CPA 现有的 openai-compatibility 通道，插件只读取用量，不接管转发。</div>';
  } else {
    pill.style.display = 'inline-block';
    pill.className = 'pill bad';
    pill.textContent = '未检测到 StepFun';
    document.getElementById('connHint').textContent = '还没观测到 StepFun 请求';
    var origin = location.origin;
    var snippet = 'openai-compatibility:\n' +
      '  - name: stepfun\n' +
      '    base-url: https://api.stepfun.com/step_plan/v1\n' +
      '    api-key-entries:\n' +
      '      - api-key: <你的 StepFun API Key>\n' +
      '    models:\n' +
      '      - name: step-3.7-flash\n' +
      '      - name: step-5-preview';
    document.getElementById('connBody').innerHTML =
      '<div class="muted" style="font-size:12.5px;margin-bottom:4px">在 CPA 的 <code>config.yaml</code> 里加上这段（<code>base-url</code> 与模型名已按 StepFun 预填，只需填 API Key），重启或热加载后再发一次请求，本页会自动识别：</div>' +
      '<pre class="snippet">' + snippet + '</pre>' +
      '<div class="muted" style="margin-top:8px;font-size:12.5px">API Key 在 <a href="https://platform.stepfun.com/interface-key" target="_blank" rel="noreferrer">StepFun 开放平台 → 接口密钥</a> 获取；走 Step Plan 订阅请用 <code>/step_plan/v1</code> 通道。</div>';
  }
}

function bindChartHover(svg){
  var wrap = document.getElementById('chartWrap');
  var tipEl = document.getElementById('chartTip');
  if (!wrap || !tipEl || wrap.dataset.bound) return;
  wrap.dataset.bound = '1';

  function hide(){ tipEl.hidden = true; }
  function show(ev){
    var target = ev.target;
    if (!target || target.tagName !== 'rect' || !target.classList.contains('chart-bar')) { hide(); return; }
    var idx = Number(target.dataset.i);
    var b = (window.__chartBuckets || [])[idx];
    if (!b) { hide(); return; }
    var wr = wrap.getBoundingClientRect();
    var br = target.getBoundingClientRect();
    tipEl.innerHTML =
      '<div><b>' + (b.label || localTime(b.time)) + '</b></div>' +
      '<div><b>' + credit(b.credit) + '</b> <span class="tk">Credit</span> · ' + yuan(b.credit) + '</div>' +
      '<div class="tk">请求 ' + fmt(b.requests) + (b.failed_requests ? (' · 失败 ' + fmt(b.failed_requests)) : '') + '</div>' +
      '<div class="tk">输入 ' + fmt(b.input_tokens) + ' · 输出 ' + fmt(b.output_tokens) + '</div>';
    tipEl.hidden = false;
    var tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    var barLeft = br.left - wr.left;
    var barTop = br.top - wr.top;
    var barW = br.width;

    // 优先放右侧；右侧不够则放左侧；再不够就贴着顶部居中
    var x, y;
    if (barLeft + barW + 12 + tw <= wr.width) {
      x = barLeft + barW + 12;
    } else if (barLeft - 12 - tw >= 0) {
      x = barLeft - 12 - tw;
    } else {
      x = Math.max(4, Math.min(wr.width - tw - 4, barLeft + barW / 2 - tw / 2));
    }
    y = barTop - 6;
    if (y + th > wr.height) y = Math.max(4, wr.height - th - 4);
    if (y < 0) y = 4;

    tipEl.style.transform = 'none';
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
  }
  wrap.addEventListener('mousemove', show);
  wrap.addEventListener('mouseleave', hide);
}

function renderChart(buckets){
  var granLabel = (window.__curGranLabel || '自动');
  var svg = document.getElementById('chart');
  if(!buckets || !buckets.length){
    svg.innerHTML = '<text x="500" y="100" text-anchor="middle" fill="currentColor" opacity="0.45" font-size="13">所选范围内没有 StepFun 调用</text>';
    var te = document.getElementById('chartTip'); if (te) te.hidden = true;
    document.getElementById('chartHint').textContent=''; return;
  }
  var max = 0, i;
  for(i=0;i<buckets.length;i++){ if(buckets[i].credit > max) max = buckets[i].credit; }
  if(max <= 0) max = 1;

  var L=62, R=8, T=24, B=26;          // 边距
  var W=1000-L-R, H=200-T-B;          // 绘图区
  var n = buckets.length;
  var slot = W / n;
  // 柱宽：按槽位定，但有上限；非零刻度很少时适当加宽，避免细如发丝
  var nonZero = 0;
  for (i=0;i<n;i++){ if (buckets[i].credit > 0) nonZero++; }
  var bwCap = nonZero <= 12 ? 120 : (nonZero <= 40 ? 46 : 18);
  var bw = Math.max(2, Math.min(slot - 1.5, bwCap));
  var parts = [];

  // Y 轴：4 条刻度线 + 数值
  var ticks = 4;
  for (var t=0; t<=ticks; t++) {
    var frac = t/ticks;
    var y = T + H - frac*H;
    var valCredit = max*frac*1e6;   // 元 → Credit
    parts.push('<line x1="'+L+'" y1="'+y.toFixed(1)+'" x2="'+(L+W)+'" y2="'+y.toFixed(1)+
      '" stroke="currentColor" opacity="'+(t===0?0.28:0.10)+'" stroke-width="1"/>');
    parts.push('<text x="'+(L-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" fill="currentColor" opacity="0.5" font-size="11">'+
      shortCredit(valCredit)+'</text>');
  }
  parts.push('<text x="'+(L-6)+'" y="11" text-anchor="end" fill="currentColor" opacity="0.4" font-size="10">Credit</text>');

  // 柱子
  var peakIdx = -1;
  for(i=0;i<n;i++){ if(buckets[i].credit===max){ peakIdx=i; break; } }
  for(i=0;i<n;i++){
    var b = buckets[i];
    var h = b.credit > 0 ? Math.max(2, (b.credit/max)*H) : 0;
    if(h <= 0) continue;
    var cx = L + slot*i + slot/2;
    var x = cx - bw/2;
    parts.push('<rect class="chart-bar" data-i="'+i+'" x="'+x.toFixed(2)+'" y="'+(T+H-h).toFixed(1)+'" width="'+bw.toFixed(2)+'" height="'+h.toFixed(1)+
      '" rx="1.5" fill="var(--accent)"'+(i===peakIdx?' opacity="1"':' opacity="0.85"')+'></rect>');
  }

  // X 轴：等距抽 6 个时间标签
  var labelCount = Math.min(6, n);
  var seen = {};
  for (var k=0; k<labelCount; k++) {
    var idx = labelCount===1 ? 0 : Math.round(k*(n-1)/(labelCount-1));
    if (seen[idx]) continue;
    seen[idx] = 1;
    var lb = buckets[idx].label || localTime(buckets[idx].time);
    var lx = L + slot*idx + slot/2;
    var anchor = 'middle';
    if (lx < L+24) anchor = 'start';
    if (lx > L+W-24) anchor = 'end';
    parts.push('<text x="'+lx.toFixed(1)+'" y="'+(T+H+16)+'" text-anchor="'+anchor+'" fill="currentColor" opacity="0.5" font-size="11">'+lb+'</text>');
  }

  svg.innerHTML = parts.join('');
  window.__chartBuckets = buckets;
  bindChartHover(svg);
  document.getElementById('chartHint').textContent =
    '峰值 ' + credit(max) + ' Credit/刻度 · ' + n + ' 个刻度 · 每个刻度 = ' + granLabel + ' · 悬停查看明细';
}

function renderModels(rows){
  var total = 0, i;
  for(i=0;i<rows.length;i++){ total += rows[i].credit || 0; }
  var tb = '', T = {req:0,fail:0,inp:0,hit:0,out:0,cr:0};
  for(i=0;i<rows.length;i++){
    var r = rows[i];
    var pct = total > 0 ? Math.round((r.credit||0)*100/total) : 0;
    T.req += r.requests; T.fail += r.failed_requests; T.inp += r.input_tokens;
    T.hit += r.cache_read_tokens; T.out += r.output_tokens; T.cr += r.credit||0;
    tb += '<tr><td>'+r.model+'</td><td>'+fmt(r.requests)+'</td>' +
      '<td>'+(r.failed_requests ? '<span class="pill bad">'+fmt(r.failed_requests)+'</span>' : '<span class="pill ok">0</span>')+'</td>' +
      '<td>'+fmt(r.input_tokens)+'</td><td>'+fmt(r.cache_read_tokens)+'</td><td>'+fmt(r.output_tokens)+'</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">' +
      '<span class="bar"><i style="width:'+pct+'%"></i></span>' +
      '<b style="min-width:74px;text-align:right">'+credit(r.credit)+'</b></div></td>' +
      '<td>'+yuan(r.credit)+'</td></tr>';
  }
  document.querySelector('#mt tbody').innerHTML = tb || '<tr><td colspan="8" class="muted">本月还没有记录</td></tr>';
  document.querySelector('#mt tfoot').innerHTML = tb ?
    ('<tr><td>合计</td><td>'+fmt(T.req)+'</td><td>'+fmt(T.fail)+'</td><td>'+fmt(T.inp)+'</td><td>'+fmt(T.hit)+'</td><td>'+fmt(T.out)+'</td><td>'+credit(T.cr)+'</td><td>'+yuan(T.cr)+'</td></tr>') : '';
}

function renderRequests(items){
  var tb = '', i;
  for(i=0;i<items.length;i++){
    var r = items[i];
    tb += '<tr><td>'+localTime(r.at)+'</td><td>'+r.model+'</td><td>'+fmt(r.input_tokens)+'</td><td>'+fmt(r.cache_read_tokens)+'</td><td>'+fmt(r.output_tokens)+'</td>' +
      '<td>'+(r.failed ? '<span class="pill bad">失败</span>' : '<span class="pill ok">成功</span>')+'</td>' +
      '<td>'+(r.priced ? credit(r.credit) : '<span class="muted">未定价</span>')+'</td></tr>';
  }
  document.querySelector('#rt tbody').innerHTML = tb || '<tr><td colspan="7" class="muted">暂无</td></tr>';
}

/* ---------- 刷新 ---------- */
function load(){
  if (loading) return Promise.resolve();
  loading = true;
  var qs = '?range=' + encodeURIComponent(curRange);
  if (curGran && curGran !== 'auto') { qs += '&granularity=' + encodeURIComponent(curGran); }
  return Promise.all([get('/summary' + qs), get('/requests?limit=40')]).then(function(res){
    var d = res[0];
    if (d.plan_presets && d.plan_presets.length) { presets = d.plan_presets; }
    timeline = d.timeline || null;
    renderPickers(d);
    renderCards(d);
    renderQuota(d);
    renderConn(d);
    var gl = (d.granularity && d.granularity.label) || '自动';
    window.__curGranLabel = gl;
    renderChart(d.window.buckets || []);
    renderModels(d.month.models || []);
    renderRequests(res[1].items || []);
    document.getElementById('rangeHint').textContent = '本月 1 日 00:00 (UTC) 至今';
    document.getElementById('sub').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN') + ' · 可见时每 30 秒刷新';
    hideErr();
  }).catch(showErr).then(function(){ loading = false; });
}

/* 只在页面可见时定时刷新，隐藏即停 */
function startTimer(){
  if (timer) return;
  timer = setInterval(function(){ if (!document.hidden) load(); }, INTERVAL_MS);
}
function stopTimer(){
  if (timer) { clearInterval(timer); timer = null; }
}
document.addEventListener('visibilitychange', function(){
  if (document.hidden) { stopTimer(); }
  else { load(); startTimer(); }   // 切回本页立即刷新
});
window.addEventListener('focus', function(){ if (!document.hidden) load(); });
window.addEventListener('pagehide', stopTimer);

/* ---------- 设置对话框 ---------- */
function buildPresets(){
  var box = document.getElementById('presets');
  var html = '';
  for (var i=0;i<presets.length;i++){
    var p = presets[i];
    html += '<button class="opt" data-credit="'+p.credit+'" data-name="'+p.name+'"><b>'+p.name+'</b><span>'+fmt(p.credit)+' Credit</span></button>';
  }
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('.opt'), function(el){
    el.addEventListener('click', function(){
      document.getElementById('totalInput').value = el.dataset.credit;
      document.getElementById('planInput').value = el.dataset.name;
    });
  });
}
function renderSubRows(){
  var box = document.getElementById('subList');
  var subs = quota.subscriptions || [];
  if (!subs.length) subs = [{name:'', credit:''}];
  var html = '<div class="subhead"><span>档位</span><span>单份额度（Credit）</span><span></span></div>';
  for (var i=0;i<subs.length;i++){
    var sub = subs[i];
    var opts = '<option value="">自定义</option>' + presets.map(function(p){
      var sel = (Number(p.credit) === Number(sub.credit)) ? ' selected' : '';
      return '<option value="'+p.credit+'"'+sel+'>'+p.name+' ('+shortCredit(p.credit)+')</option>';
    }).join('');
    html += '<div class="subrow" data-i="'+i+'">'
      + '<select class="sub-plan">'+opts+'</select>'
      + '<input class="sub-credit" inputmode="numeric" value="'+(sub.credit==null||sub.credit===''?'':sub.credit)+'" placeholder="1600000000">'
      + '<button class="del" title="删除这一项">×</button>'
      + '</div>';
  }
  html += '<div class="subhead" style="margin-top:12px"><span>以上每个订阅各有几份</span><span></span><span></span></div>'
    + '<div class="subrow" style="grid-template-columns:1.4fr 1fr auto">'
    + '<input id="subCount" inputmode="numeric" value="'+((subs[0] && subs[0].count) || 1)+'" placeholder="1">'
    + '<span class="muted" style="font-size:12.5px">份（同档位多开时填）</span>'
    + '<span></span></div>';
  box.innerHTML = html;

  Array.prototype.forEach.call(box.querySelectorAll('.subrow[data-i]'), function(row){
    var idx = Number(row.dataset.i);
    var sel = row.querySelector('.sub-plan');
    var inp = row.querySelector('.sub-credit');
    sel.addEventListener('change', function(){ if (sel.value) { inp.value = sel.value; collectSubs(); updateSubTotal(); } });
    inp.addEventListener('input', function(){ collectSubs(); updateSubTotal(); });
    row.querySelector('.del').addEventListener('click', function(){
      collectSubs();
      quota.subscriptions.splice(idx, 1);
      renderSubRows(); updateSubTotal();
    });
  });
  var cntEl = box.querySelector('#subCount');
  if (cntEl) cntEl.addEventListener('input', function(){ collectSubs(); updateSubTotal(); });
}
function collectSubs(){
  var rows = document.querySelectorAll('#subList .subrow[data-i]');
  var subs = [];
  Array.prototype.forEach.call(rows, function(row){
    var c = parseFloat(row.querySelector('.sub-credit').value || '0');
    if (isNaN(c) || c <= 0) return;
    var sel = row.querySelector('.sub-plan');
    var label = sel.value === '' ? '自定义' : sel.options[sel.selectedIndex].text.replace(/\s*\(.*\)$/, '');
    subs.push({ name: label, credit: c });
  });
  var cntEl = document.getElementById('subCount');
  var cnt = parseInt(cntEl ? cntEl.value : '1', 10);
  if (isNaN(cnt) || cnt < 1) cnt = 1;
  if (subs.length) subs[0].count = cnt;
  quota.subscriptions = subs;
  return subs;
}
function updateSubTotal(){
  var el = document.getElementById('subTotal');
  if (!el) return;
  var t = quotaTotal();
  el.textContent = t > 0 ? ('合计 ' + fmt(t) + ' Credit ≈ ' + yuan(t/1e6)) : '未填写额度';
}
function openSettings(){
  quota = loadQuota();
  renderSubRows();
  updateSubTotal();
  document.getElementById('setDlg').showModal();
}
function saveSettings(){
  collectSubs();
  saveQuota(quota);
  document.getElementById('setDlg').close();
  load();
}
document.getElementById('refresh').addEventListener('click', load);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('cancelSet').addEventListener('click', function(){ document.getElementById('setDlg').close(); });
document.getElementById('saveSet').addEventListener('click', saveSettings);
document.getElementById('addSub').addEventListener('click', function(){
  collectSubs();
  quota.subscriptions.push({name:'', credit:''});
  renderSubRows(); updateSubTotal();
});
document.getElementById('clearQuota').addEventListener('click', function(){
  quota = {subscriptions: []};
  renderSubRows(); updateSubTotal();
});

load();
startTimer();
})();
</script>
</body>
</html>`
