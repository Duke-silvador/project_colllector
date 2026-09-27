const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 4 });
const finite = v => v !== null && v !== '' && Number.isFinite(Number(v));
const money = v => finite(v) ? nf.format(Number(v)) : '—';
const pct = v => finite(v) ? `${nf.format(Number(v) * 100)}%` : '—';
const cls = v => Number(v) > 0 ? 'pos' : Number(v) < 0 ? 'neg' : '';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
let lastData = null;

function statusInfo(code) {
  const map = {
    OPEN:['ABERTO','open'], READY:['PRONTO','ready'],
    WAITING_REGIME:['AGUARDANDO REGIME','waiting'],
    BLOCKED_CLUSTER:['AGUARDANDO CAPITAL','blocked'], NO_DATA:['SEM DADOS','waiting']
  };
  return map[code] || [String(code || '—'),'waiting'];
}
function detail(label, value, extra='') {
  return `<div class="detail"><span>${label}</span><strong class="${extra}">${value}</strong></div>`;
}
function mini(label, value, extra='') {
  return `<div class="mini"><span>${label}</span><strong class="${extra}">${value}</strong></div>`;
}
function esc(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function renderSummary(data) {
  const s = data.system?.summary_today || {};
  $('equity').textContent = money(data.account?.equity_usdt);
  $('pnlToday').textContent = money(data.account?.pnl_today_usdt);
  $('pnlToday').className = cls(data.account?.pnl_today_usdt);
  $('opsToday').textContent = String(s.operations_today ?? 0);
  $('wlToday').textContent = `${s.wins_today ?? 0} wins • ${s.losses_today ?? 0} losses`;
  const den = (s.wins_today || 0) + (s.losses_today || 0);
  $('winRate').textContent = den ? `${nf.format((s.wins_today / den) * 100)}%` : '—';
  $('grossProfit').textContent = money(s.gross_profit_usdt);
  $('grossProfit').className = 'pos';
  $('grossLoss').textContent = s.gross_loss_usdt ? `-${money(s.gross_loss_usdt)}` : '0';
  $('grossLoss').className = s.gross_loss_usdt ? 'neg' : '';
  $('openCount').textContent = String(s.open_positions ?? 0);
  const opens = data.system?.open_positions || [];
  const spot = opens.filter(x => x.market === 'spot').length, fut = opens.filter(x => x.market === 'futures').length;
  $('openMarketHint').textContent = `${spot} Spot • ${fut} Futures`;
  const strategies = (data.system?.strategies || []).filter(x => x.cron_enabled);
  const healthy = strategies.filter(x => x.health === 'healthy').length;
  $('strategyCount').textContent = String(strategies.length);
  $('healthyCount').textContent = `${healthy} saudáveis`;
}

function strategyRow(s) {
  const st = s.stats || {};
  const pnlClass = cls(st.net_pnl_usdt);
  return `<div class="strategy-row">
    <div class="strategy-main"><div class="strategy-name">${esc(s.label)}</div><div class="strategy-meta"><span class="health-dot ${esc(s.health)}"></span><span class="exec">${esc((s.execution || '').toUpperCase())}</span><span class="exec">${esc(s.market_label || s.market)}</span></div></div>
    <div class="strategy-stat"><span>Ops</span><strong>${st.operations_today ?? 0}</strong></div>
    <div class="strategy-stat"><span>W / L</span><strong>${st.wins_today ?? 0} / ${st.losses_today ?? 0}</strong></div>
    <div class="strategy-stat"><span>PnL</span><strong class="${pnlClass}">${money(st.net_pnl_usdt)}</strong></div>
  </div>`;
}

function renderEnvironment(prefix, group, strategies) {
  const pnl = $(`${prefix}Pnl`);
  pnl.textContent = `${money(group.net_pnl_usdt)} USDT`;
  pnl.className = cls(group.net_pnl_usdt);
  $(`${prefix}Stats`).innerHTML = [
    mini('Operações', group.operations_today ?? 0),
    mini('Wins', group.wins_today ?? 0, 'pos'),
    mini('Losses', group.losses_today ?? 0, group.losses_today ? 'neg' : ''),
    mini('Abertas', group.open_positions ?? 0),
  ].join('');
  const el = $(`${prefix}Strategies`);
  const active = strategies.filter(x => x.cron_enabled);
  el.innerHTML = active.length ? active.map(strategyRow).join('') : '<div class="empty-state">Nenhuma estratégia ativa.</div>';
}

function renderOpenPositions(data, labels) {
  const rows = data.system?.open_positions || [];
  $('openPositionsCount').textContent = `${rows.length} posiç${rows.length === 1 ? 'ão' : 'ões'}`;
  const box = $('openPositions');
  if (!rows.length) {
    box.innerHTML = '<div class="empty-state card">Nenhuma posição aberta.</div>';
    return;
  }
  box.innerHTML = rows.map(p => {
    const target = finite(p.target) ? money(p.target) : '—';
    const pnl = p.unrealized_pnl_usdt;
    return `<article class="position-card card">
      <div class="position-top"><div><div class="position-symbol">${esc(p.symbol)}</div><div class="position-strategy">${esc(labels[p.strategy] || p.strategy)}</div></div><span class="pill">${esc((p.market || '').toUpperCase())} · ${esc(p.side || '')}</span></div>
      <div class="position-grid">${mini('Entrada', money(p.entry))}${mini('Atual', money(p.mark))}${mini('Alvo', target)}${mini('PnL flutuante', `${money(pnl)} USDT`, cls(pnl))}</div>
    </article>`;
  }).join('');
}

function renderGrid(prefix, d) {
  const [label, klass] = statusInfo(d.status);
  const status = $(`${prefix}Status`); status.textContent = label; status.className = `status ${klass}`;
  $(`${prefix}Price`).textContent = money(d.price);
  const leg = d.legs?.[0] || null;
  $(`${prefix}Target`).textContent = leg ? money(leg.target) : '—';
  let progress = 0, distance = '—', progressText = 'Sem perna aberta';
  if (leg && finite(d.price) && finite(leg.entry) && finite(leg.target) && Number(leg.target) !== Number(leg.entry)) {
    progress = clamp((Number(d.price) - Number(leg.entry)) / (Number(leg.target) - Number(leg.entry)), 0, 1);
    const dist = (Number(leg.target) - Number(d.price)) / Number(d.price);
    distance = `${dist > 0 ? 'Falta ' : 'Alvo cruzado '}${pct(Math.abs(dist))}`;
    progressText = `${nf.format(progress * 100)}% do caminho`;
  }
  $(`${prefix}Progress`).style.width = `${progress * 100}%`;
  $(`${prefix}ProgressText`).textContent = progressText;
  $(`${prefix}Distance`).textContent = distance;
  const r = d.regime || {}, g = d.grid || {};
  const owner = d.cluster_owner || 'livre';
  let html = '';
  html += detail('Pernas abertas', d.open_legs ?? 0);
  html += detail('PnL flutuante', `${money(d.unrealized_pnl_usdt)} USDT`, cls(d.unrealized_pnl_usdt));
  html += detail('PnL realizado', `${money(d.realized_pnl_usdt)} USDT`, cls(d.realized_pnl_usdt));
  html += detail('Exposição', `${money(d.inventory_usdt)} USDT`);
  html += detail('ADX 4h', money(r.adx4h));
  html += detail('Filtro ADX', r.adx_limit != null ? `< ${money(r.adx_limit)}` : '—');
  html += detail('Grid mínimo', money(g.low)); html += detail('Grid máximo', money(g.high));
  html += detail('Passo do grid', pct(g.step_pct)); html += detail('Cluster rápido', owner);
  if (leg) { html += detail('Entrada', money(leg.entry)); html += detail('Capital da perna', `${money(leg.cost_usdt)} USDT`); }
  $(`${prefix}Details`).innerHTML = html;
}

function setupCanvas(id) {
  const canvas = $(id), dpr = window.devicePixelRatio || 1;
  const w = Math.max(260, canvas.clientWidth || 320), h = 190;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  return {canvas,ctx,w,h};
}
function emptyChart(ctx,w,h,text='Sem dados hoje') {
  ctx.fillStyle = css('--muted'); ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(text,w/2,h/2);
}
function drawPnlCurve(rows) {
  const {ctx,w,h} = setupCanvas('pnlCurve');
  if (!rows?.length) return emptyChart(ctx,w,h);
  const pad = {l:42,r:12,t:14,b:28};
  const vals = rows.map(x => Number(x.pnl_usdt)); let min=Math.min(0,...vals), max=Math.max(0,...vals);
  if (max === min) { max += .1; min -= .1; }
  const x = i => pad.l + (rows.length === 1 ? (w-pad.l-pad.r)/2 : i*(w-pad.l-pad.r)/(rows.length-1));
  const y = v => pad.t + (max-v)*(h-pad.t-pad.b)/(max-min);
  ctx.strokeStyle = css('--border'); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.l,y(0)); ctx.lineTo(w-pad.r,y(0)); ctx.stroke();
  ctx.strokeStyle = vals.at(-1) >= 0 ? css('--good') : css('--bad'); ctx.lineWidth=2.4; ctx.beginPath();
  rows.forEach((r,i)=>{const xx=x(i),yy=y(Number(r.pnl_usdt)); i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}); ctx.stroke();
  rows.forEach((r,i)=>{ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(x(i),y(Number(r.pnl_usdt)),3,0,Math.PI*2);ctx.fill()});
  ctx.fillStyle=css('--muted');ctx.font='10px system-ui';ctx.textAlign='center';rows.forEach((r,i)=>{if(i===0||i===rows.length-1||rows.length<=5)ctx.fillText(r.time,x(i),h-8)});
  ctx.textAlign='right';ctx.fillText(nf.format(max),pad.l-5,pad.t+4);ctx.fillText(nf.format(min),pad.l-5,h-pad.b);
}

function drawWinLoss(v) {
  const {ctx,w,h}=setupCanvas('winLossChart'); const wins=Number(v?.wins||0), losses=Number(v?.losses||0), total=wins+losses;
  if (!total) return emptyChart(ctx,w,h);
  const cx=w/2,cy=83,r=55,th=18; let a=-Math.PI/2;
  [[wins,css('--good')],[losses,css('--bad')]].forEach(([n,c])=>{const end=a+(n/total)*Math.PI*2;ctx.strokeStyle=c;ctx.lineWidth=th;ctx.lineCap='butt';ctx.beginPath();ctx.arc(cx,cy,r,a,end);ctx.stroke();a=end});
  ctx.fillStyle=css('--text');ctx.textAlign='center';ctx.font='700 25px system-ui';ctx.fillText(`${nf.format(wins/total*100)}%`,cx,cy+5);ctx.font='10px system-ui';ctx.fillStyle=css('--muted');ctx.fillText('win rate',cx,cy+22);
  ctx.textAlign='left';ctx.fillStyle=css('--good');ctx.fillText(`● ${wins} wins`,18,h-14);ctx.textAlign='right';ctx.fillStyle=css('--bad');ctx.fillText(`${losses} losses ●`,w-18,h-14);
}
function drawStrategyPnl(rows) {
  const {ctx,w,h}=setupCanvas('strategyPnlChart'); if(!rows?.length)return emptyChart(ctx,w,h);
  const data=rows.slice(0,5), max=Math.max(.01,...data.map(x=>Math.abs(Number(x.pnl_usdt))));
  const left=92,right=16,top=15,rowH=(h-top-15)/data.length,zero=left+(w-left-right)/2,half=(w-left-right)/2;
  ctx.strokeStyle=css('--border');ctx.beginPath();ctx.moveTo(zero,top);ctx.lineTo(zero,h-10);ctx.stroke();ctx.font='9px system-ui';
  data.forEach((d,i)=>{const y=top+i*rowH+rowH*.2,bh=rowH*.45,val=Number(d.pnl_usdt);const bw=Math.abs(val)/max*half*.9;ctx.fillStyle=val>=0?css('--good'):css('--bad');ctx.fillRect(val>=0?zero:zero-bw,y,bw,bh);ctx.fillStyle=css('--muted');ctx.textAlign='right';let name=d.strategy.length>16?d.strategy.slice(0,15)+'…':d.strategy;ctx.fillText(name,left-6,y+bh*.75);ctx.fillStyle=css('--text');ctx.textAlign=val>=0?'left':'right';ctx.fillText(nf.format(val),val>=0?zero+bw+4:zero-bw-4,y+bh*.75)});
}

function renderTrades(rows, labels) {
  const body=$('historyBody'); $('historyCount').textContent=`${rows.length} operaç${rows.length===1?'ão':'ões'}`;
  if(!rows.length){body.innerHTML='<tr><td colspan="7" class="empty-state">Nenhuma operação fechada hoje.</td></tr>';return}
  body.innerHTML=rows.map(x=>{const when=x.closed_at?new Date(x.closed_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):'—';return `<tr><td>${when}</td><td>${esc((x.market||'').toUpperCase())}</td><td>${esc(labels[x.strategy]||x.strategy)}</td><td>${esc(x.symbol)}</td><td>${money(x.entry)}</td><td>${money(x.exit)}</td><td class="${cls(x.pnl_usdt)}">${money(x.pnl_usdt)} USDT</td></tr>`}).join('');
}
function render(data) {
  lastData=data; renderSummary(data);
  const strategies=data.system?.strategies||[], labels=Object.fromEntries(strategies.map(x=>[x.id,x.label]));
  const groups=data.system?.groups||{};
  renderEnvironment('demoSpot',groups.demo?.spot||{},strategies.filter(x=>x.mode==='demo'&&x.market==='spot'));
  renderEnvironment('demoFutures',groups.demo?.futures||{},strategies.filter(x=>x.mode==='demo'&&x.market==='futures'));
  renderOpenPositions(data,labels); renderGrid('eth',data.grids?.ETHUSDT||{}); renderGrid('btc',data.grids?.BTCUSDT||{});
  renderTrades(data.system?.trades_today||[],labels);
  const charts=data.system?.charts||{}; drawPnlCurve(charts.pnl_curve||[]); drawWinLoss(charts.wins_losses||{}); drawStrategyPnl(charts.pnl_by_strategy||[]);
  const last=charts.pnl_curve?.at(-1); $('curveHint').textContent=last?`${money(last.pnl_usdt)} USDT`:'sem fechamentos'; $('curveHint').className=cls(last?.pnl_usdt)||'muted';
  const ts=data.updated_at?new Date(data.updated_at):null; $('updatedAt').textContent=ts&&!Number.isNaN(ts.getTime())?ts.toLocaleString('pt-PT'):'—';
  const age=ts?(Date.now()-ts.getTime())/60000:Infinity,h=$('health'); if(age<=3){h.textContent='● Dados recentes';h.className='health good'}else if(age<=15){h.textContent=`● ${Math.round(age)} min sem atualização`;h.className='health warn'}else{h.textContent='● Dados desatualizados';h.className='health bad'}
}
async function refresh(){try{const r=await fetch(`data/grid-status.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);render(await r.json());$('errorBox').hidden=true}catch(e){$('errorBox').textContent=`Não foi possível carregar o snapshot: ${e.message}`;$('errorBox').hidden=false}}
let resizeTimer; window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(lastData)render(lastData)},120)});
refresh(); setInterval(refresh,30000);
