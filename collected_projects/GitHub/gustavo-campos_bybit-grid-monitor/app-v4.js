const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('pt-PT',{maximumFractionDigits:4});
const finite = v => v !== null && v !== '' && Number.isFinite(Number(v));
const money = v => finite(v) ? nf.format(Number(v)) : '—';
const pct = v => finite(v) ? `${nf.format(Number(v)*100)}%` : '—';
const cls = v => Number(v)>0 ? 'pos' : Number(v)<0 ? 'neg' : '';
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const esc = v => String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const sum = (rows,key) => rows.reduce((a,x)=>a+Number(x?.[key]||0),0);
let lastData=null;
let selectedEnv=((new URLSearchParams(location.search).get('env')||localStorage.getItem('trading-monitor-env')||'demo').toLowerCase()==='live')?'live':'demo';

function setText(id,value,klass=''){const el=$(id);if(!el)return;el.textContent=value;el.className=klass}
function mini(label,value,extra=''){return `<div class="mini"><span>${label}</span><strong class="${extra}">${value}</strong></div>`}
function detail(label,value,extra=''){return `<div class="detail"><span>${label}</span><strong class="${extra}">${value}</strong></div>`}
function statusInfo(code){const m={OPEN:['ABERTO','open'],READY:['PRONTO','ready'],WAITING_REGIME:['AGUARDANDO REGIME','waiting'],BLOCKED_CLUSTER:['AGUARDANDO CAPITAL','blocked'],NO_DATA:['SEM DADOS','waiting']};return m[code]||[String(code||'—'),'waiting']}

function environmentData(data,env){
  const groups=data.system?.groups?.[env]||{};
  const spot=groups.spot||{}, futures=groups.futures||{};
  const strategies=(data.system?.strategies||[]).filter(x=>(x.mode||'demo')===env);
  const trades=(data.system?.trades_today||[]).filter(x=>(x.mode||'demo')===env).sort((a,b)=>new Date(a.closed_at||0)-new Date(b.closed_at||0));
  const open=(data.system?.open_positions||[]).filter(x=>(x.mode||'demo')===env);
  const active=strategies.filter(x=>x.cron_enabled);
  const account=data.accounts?.[env]||(env==='demo'?data.account:{});
  return {env,groups,spot,futures,strategies,trades,open,account,summary:{operations_today:Number(spot.operations_today||0)+Number(futures.operations_today||0),wins_today:Number(spot.wins_today||0)+Number(futures.wins_today||0),losses_today:Number(spot.losses_today||0)+Number(futures.losses_today||0),gross_profit_usdt:Number(spot.gross_profit_usdt||0)+Number(futures.gross_profit_usdt||0),gross_loss_usdt:Number(spot.gross_loss_usdt||0)+Number(futures.gross_loss_usdt||0),net_pnl_usdt:Number(spot.net_pnl_usdt||0)+Number(futures.net_pnl_usdt||0),open_positions:open.length,active_strategies:active.length,healthy_strategies:active.filter(x=>x.health==='healthy').length}}
}
function strategyRow(s){
  const st=s.stats||{}, quarantined=!s.cron_enabled||/quarentena/i.test(s.label||'');
  const symbolChips=(s.symbols||[]).map(x=>`<span class="strategy-chip">${esc(String(x).replace('USDT',''))}</span>`).join('');
  const badgeChips=(s.badges||[]).map(x=>`<span class="strategy-chip">${esc(x)}</span>`).join('');
  return `<div class="strategy-row"><div class="strategy-main"><div class="strategy-name">${esc(s.label)}</div><div class="strategy-meta"><span class="health-dot ${esc(s.health)}"></span><span class="strategy-chip">${esc((s.execution||'').toUpperCase())}</span>${symbolChips}${badgeChips}${quarantined?'<span class="strategy-chip quarantine">QUARENTENA</span>':''}</div></div><div class="strategy-stat"><span>Ops</span><strong>${st.operations_today??0}</strong></div><div class="strategy-stat"><span>W / L</span><strong>${st.wins_today??0} / ${st.losses_today??0}</strong></div><div class="strategy-stat"><span>PnL</span><strong class="${cls(st.net_pnl_usdt)}">${money(st.net_pnl_usdt)}</strong></div></div>`
}
function renderMarket(kind,group,strategies){
  const prefix=kind==='spot'?'spot':'futures';
  setText(`${prefix}Pnl`,`${money(group.net_pnl_usdt||0)} USDT`,cls(group.net_pnl_usdt));
  $(`${prefix}Stats`).innerHTML=[mini('Operações',group.operations_today??0),mini('Wins',group.wins_today??0,'pos'),mini('Losses',group.losses_today??0,group.losses_today?'neg':''),mini('Abertas',group.open_positions??0)].join('');
  const rows=strategies.filter(x=>x.market===kind).sort((a,b)=>Number(b.cron_enabled)-Number(a.cron_enabled)||String(a.label).localeCompare(String(b.label)));
  $(`${prefix}Strategies`).innerHTML=rows.length?rows.map(strategyRow).join(''):'<div class="empty-state">Nenhuma estratégia configurada neste mercado.</div>';
}
function renderSummary(ctx){
  const s=ctx.summary, account=ctx.account||{};
  setText('equity',money(account.equity_usdt));
  setText('pnlToday',money(s.net_pnl_usdt),cls(s.net_pnl_usdt));
  setText('opsToday',String(s.operations_today));
  setText('wlToday',`${s.wins_today} wins • ${s.losses_today} losses`);
  const n=s.wins_today+s.losses_today;setText('winRate',n?`${nf.format(s.wins_today/n*100)}%`:'—');
  setText('grossProfit',money(s.gross_profit_usdt),'pos');
  setText('grossLoss',s.gross_loss_usdt?`-${money(s.gross_loss_usdt)}`:'0',s.gross_loss_usdt?'neg':'');
  setText('openCount',String(s.open_positions));
  const spot=ctx.open.filter(x=>x.market==='spot').length,fut=ctx.open.filter(x=>x.market==='futures').length;setText('openMarketHint',`${spot} Spot • ${fut} Futures`);
  setText('strategyCount',String(s.active_strategies));setText('healthyCount',`${s.healthy_strategies} saudáveis`);
}
function renderOpenPositions(ctx,labels){
  setText('openPositionsCount',`${ctx.open.length} posiç${ctx.open.length===1?'ão':'ões'}`);
  const box=$('openPositions');if(!ctx.open.length){box.innerHTML='<div class="empty-state">Nenhuma posição aberta neste ambiente.</div>';return}
  box.innerHTML=ctx.open.map(p=>`<article class="position-card"><div class="position-top"><div><div class="position-symbol">${esc(p.symbol)}</div><div class="position-strategy">${esc(labels[p.strategy]||p.strategy)}</div></div><span class="pill">${esc((p.market||'').toUpperCase())} · ${esc(p.side||'')}</span></div><div class="position-grid">${mini('Entrada',money(p.entry))}${mini('Atual',money(p.mark))}${mini('Alvo',finite(p.target)?money(p.target):'—')}${mini('PnL flutuante',`${money(p.unrealized_pnl_usdt)} USDT`,cls(p.unrealized_pnl_usdt))}</div></article>`).join('')
}
function renderGrid(prefix,d){
  const [label,klass]=statusInfo(d.status),status=$(`${prefix}Status`);if(!status)return;status.textContent=label;status.className=`status ${klass}`;
  setText(`${prefix}Price`,money(d.price));const leg=d.legs?.[0]||null;setText(`${prefix}Target`,leg?money(leg.target):'—');
  let progress=0,distance='—',progressText='Sem perna aberta';
  if(leg&&finite(d.price)&&finite(leg.entry)&&finite(leg.target)&&Number(leg.target)!==Number(leg.entry)){progress=clamp((Number(d.price)-Number(leg.entry))/(Number(leg.target)-Number(leg.entry)),0,1);const dist=(Number(leg.target)-Number(d.price))/Number(d.price);distance=`${dist>0?'Falta ':'Alvo cruzado '}${pct(Math.abs(dist))}`;progressText=`${nf.format(progress*100)}% do caminho`}
  $(`${prefix}Progress`).style.width=`${progress*100}%`;setText(`${prefix}ProgressText`,progressText);setText(`${prefix}Distance`,distance);
  const r=d.regime||{},g=d.grid||{};let html='';html+=detail('Pernas abertas',d.open_legs??0);html+=detail('PnL flutuante',`${money(d.unrealized_pnl_usdt)} USDT`,cls(d.unrealized_pnl_usdt));html+=detail('PnL realizado',`${money(d.realized_pnl_usdt)} USDT`,cls(d.realized_pnl_usdt));html+=detail('Exposição',`${money(d.inventory_usdt)} USDT`);html+=detail('ADX 4h',money(r.adx4h));html+=detail('Filtro ADX',r.adx_limit!=null?`< ${money(r.adx_limit)}`:'—');html+=detail('Grid mínimo',money(g.low));html+=detail('Grid máximo',money(g.high));html+=detail('Passo do grid',pct(g.step_pct));html+=detail('Cluster rápido',d.cluster_owner||'livre');if(leg){html+=detail('Entrada',money(leg.entry));html+=detail('Capital da perna',`${money(leg.cost_usdt)} USDT`)}$(`${prefix}Details`).innerHTML=html
}
function setupCanvas(id){const canvas=$(id);if(!canvas)return null;const dpr=window.devicePixelRatio||1,w=Math.max(260,canvas.clientWidth||320),h=210;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{canvas,ctx,w,h}}
function emptyChart(c,text='Sem dados neste ambiente'){if(!c)return;c.ctx.fillStyle=css('--muted');c.ctx.font='12px system-ui';c.ctx.textAlign='center';c.ctx.fillText(text,c.w/2,c.h/2)}
function deriveCharts(ctx){
  let cumulative=0;const pnl_curve=ctx.trades.map(x=>{cumulative+=Number(x.pnl_usdt||0);return{time:x.closed_at?new Date(x.closed_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):'—',pnl_usdt:cumulative}});
  const by={};ctx.trades.forEach(x=>{const k=x.strategy||'Não atribuído';by[k]=(by[k]||0)+Number(x.pnl_usdt||0)});const pnl_by_strategy=Object.entries(by).map(([strategy,pnl_usdt])=>({strategy,pnl_usdt})).sort((a,b)=>Math.abs(b.pnl_usdt)-Math.abs(a.pnl_usdt));
  return{pnl_curve,pnl_by_strategy,wins_losses:{wins:ctx.summary.wins_today,losses:ctx.summary.losses_today}}
}
function drawPnlCurve(rows){const c=setupCanvas('pnlCurve');if(!c)return;if(!rows.length)return emptyChart(c);const {ctx,w,h}=c,pad={l:42,r:12,t:16,b:28},vals=rows.map(x=>Number(x.pnl_usdt));let min=Math.min(0,...vals),max=Math.max(0,...vals);if(max===min){max+=.1;min-=.1}const x=i=>pad.l+(rows.length===1?(w-pad.l-pad.r)/2:i*(w-pad.l-pad.r)/(rows.length-1)),y=v=>pad.t+(max-v)*(h-pad.t-pad.b)/(max-min);ctx.strokeStyle=css('--border');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y(0));ctx.lineTo(w-pad.r,y(0));ctx.stroke();ctx.strokeStyle=vals.at(-1)>=0?css('--good'):css('--bad');ctx.lineWidth=2.3;ctx.beginPath();rows.forEach((r,i)=>{i?ctx.lineTo(x(i),y(Number(r.pnl_usdt))):ctx.moveTo(x(i),y(Number(r.pnl_usdt)))});ctx.stroke();rows.forEach((r,i)=>{ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(x(i),y(Number(r.pnl_usdt)),3,0,Math.PI*2);ctx.fill()});ctx.fillStyle=css('--muted');ctx.font='10px system-ui';ctx.textAlign='center';rows.forEach((r,i)=>{if(i===0||i===rows.length-1||rows.length<=5)ctx.fillText(r.time,x(i),h-8)});ctx.textAlign='right';ctx.fillText(nf.format(max),pad.l-5,pad.t+4);ctx.fillText(nf.format(min),pad.l-5,h-pad.b)}
function drawWinLoss(v){const c=setupCanvas('winLossChart');if(!c)return;const wins=Number(v?.wins||0),losses=Number(v?.losses||0),total=wins+losses;if(!total)return emptyChart(c);const {ctx,w,h}=c,cx=w/2,cy=90,r=56,th=17;let a=-Math.PI/2;[[wins,css('--good')],[losses,css('--bad')]].forEach(([n,color])=>{const end=a+n/total*Math.PI*2;ctx.strokeStyle=color;ctx.lineWidth=th;ctx.beginPath();ctx.arc(cx,cy,r,a,end);ctx.stroke();a=end});ctx.fillStyle=css('--text');ctx.textAlign='center';ctx.font='700 25px system-ui';ctx.fillText(`${nf.format(wins/total*100)}%`,cx,cy+4);ctx.font='10px system-ui';ctx.fillStyle=css('--muted');ctx.fillText('win rate',cx,cy+21);ctx.textAlign='left';ctx.fillStyle=css('--good');ctx.fillText(`● ${wins} wins`,16,h-13);ctx.textAlign='right';ctx.fillStyle=css('--bad');ctx.fillText(`${losses} losses ●`,w-16,h-13)}
function drawStrategyPnl(rows,labels){const c=setupCanvas('strategyPnlChart');if(!c)return;if(!rows.length)return emptyChart(c);const {ctx,w,h}=c,data=rows.slice(0,6),max=Math.max(.01,...data.map(x=>Math.abs(Number(x.pnl_usdt)))),left=104,right=18,top=12,rowH=(h-top-14)/data.length,zero=left+(w-left-right)/2,half=(w-left-right)/2;ctx.strokeStyle=css('--border');ctx.beginPath();ctx.moveTo(zero,top);ctx.lineTo(zero,h-8);ctx.stroke();ctx.font='9px system-ui';data.forEach((d,i)=>{const y=top+i*rowH+rowH*.2,bh=rowH*.45,val=Number(d.pnl_usdt),bw=Math.abs(val)/max*half*.88;ctx.fillStyle=val>=0?css('--good'):css('--bad');ctx.fillRect(val>=0?zero:zero-bw,y,bw,bh);ctx.fillStyle=css('--muted');ctx.textAlign='right';let name=labels[d.strategy]||d.strategy;if(name.length>17)name=name.slice(0,16)+'…';ctx.fillText(name,left-6,y+bh*.75);ctx.fillStyle=css('--text');ctx.textAlign=val>=0?'left':'right';ctx.fillText(nf.format(val),val>=0?zero+bw+4:zero-bw-4,y+bh*.75)})}
function renderTrades(ctx,labels){const body=$('historyBody');setText('historyCount',`${ctx.trades.length} operaç${ctx.trades.length===1?'ão':'ões'}`);if(!ctx.trades.length){body.innerHTML='<tr><td colspan="8" class="empty-state">Nenhuma operação fechada hoje neste ambiente.</td></tr>';return}body.innerHTML=[...ctx.trades].reverse().map(x=>{const when=x.closed_at?new Date(x.closed_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):'—',win=Number(x.pnl_usdt)>0;return `<tr><td>${when}</td><td>${esc((x.market||'').toUpperCase())}</td><td>${esc(labels[x.strategy]||x.strategy)}</td><td>${esc(x.symbol)}</td><td>${money(x.entry)}</td><td>${money(x.exit)}</td><td><span class="result-badge ${win?'win':'loss'}">${win?'WIN':'LOSS'}</span></td><td class="${cls(x.pnl_usdt)}">${money(x.pnl_usdt)} USDT</td></tr>`}).join('')}
function renderEnvironmentNotice(ctx,data){const box=$('environmentNotice');if(ctx.env==='live'&&!data.system?.live_enabled){box.hidden=false;box.innerHTML='<strong>Ambiente LIVE desativado</strong><p>Nenhuma estratégia LIVE está autorizada. A seleção LIVE permanece separada e não exibe métricas DEMO.</p>'}else if(!ctx.strategies.length){box.hidden=false;box.innerHTML=`<strong>Sem dados para ${ctx.env.toUpperCase()}</strong><p>Nenhuma estratégia ou atividade foi publicada para este ambiente.</p>`}else{box.hidden=true;box.innerHTML=''}}
function updateEnvironmentChrome(env){document.querySelectorAll('.env-tab').forEach(b=>b.classList.toggle('active',b.dataset.env===env));const i=$('envIndicator');i.className=`env-indicator ${env}`;setText('environmentName',env.toUpperCase());setText('marketSectionNote',`Ambiente ${env.toUpperCase()}`);localStorage.setItem('trading-monitor-env',env);const u=new URL(location.href);u.searchParams.set('env',env);history.replaceState({},'',u)}
function render(data){
  lastData=data;const ctx=environmentData(data,selectedEnv),labels=Object.fromEntries((data.system?.strategies||[]).map(x=>[x.id,x.label]));updateEnvironmentChrome(selectedEnv);renderEnvironmentNotice(ctx,data);renderSummary(ctx);renderMarket('spot',ctx.spot,ctx.strategies);renderMarket('futures',ctx.futures,ctx.strategies);renderOpenPositions(ctx,labels);renderTrades(ctx,labels);
  const charts=deriveCharts(ctx);drawPnlCurve(charts.pnl_curve);drawWinLoss(charts.wins_losses);drawStrategyPnl(charts.pnl_by_strategy,labels);const last=charts.pnl_curve.at(-1);setText('curveHint',last?`${money(last.pnl_usdt)} USDT`:'sem fechamentos',last?cls(last.pnl_usdt):'');
  const showGrids=selectedEnv==='demo'&&data.grids&&Object.keys(data.grids).length>0;$('gridSection').hidden=!showGrids;if(showGrids){renderGrid('eth',data.grids?.ETHUSDT||{});renderGrid('btc',data.grids?.BTCUSDT||{})}
  const ts=data.updated_at?new Date(data.updated_at):null;setText('updatedAt',ts&&!Number.isNaN(ts.getTime())?ts.toLocaleString('pt-PT'):'—');const age=ts?(Date.now()-ts.getTime())/60000:Infinity,h=$('health');if(age<=3){h.textContent='● Dados recentes';h.className='health good'}else if(age<=15){h.textContent=`● ${Math.round(age)} min sem atualização`;h.className='health warn'}else{h.textContent='● Dados desatualizados';h.className='health bad'}
}
async function refresh(){try{const r=await fetch(`data/grid-status.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);render(await r.json());$('errorBox').hidden=true}catch(e){$('errorBox').textContent=`Não foi possível carregar os dados: ${e.message}`;$('errorBox').hidden=false}}
document.querySelectorAll('.env-tab').forEach(btn=>btn.addEventListener('click',()=>{selectedEnv=btn.dataset.env;updateEnvironmentChrome(selectedEnv);if(lastData)render(lastData)}));
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(lastData)render(lastData)},120)});
updateEnvironmentChrome(selectedEnv);refresh();setInterval(refresh,30000);
