'use strict';
const $=i=>document.getElementById(i),C='#00FFCC',P='#FF2A85',M='#827B8A',L='#2A1B38';
const sg=(x,d=4)=>x==null||isNaN(x)?'—':(x>0?'+':'')+(+x).toFixed(d),cl=x=>x>0?'pos':x<0?'neg':'mu',pc=x=>x==null?'—':Math.round(x*100)+'%';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D=null,shown=null,seenRC=new Set(),seenLog=new Set(),seenAlert=0,logQ=[],first=true;
/* ---------- mode démo (fictif, étiqueté) ---------- */
function demo(){const n=Date.now()/1e3,ws=[],id=i=>'Ex'+(i*7919%9000+1000).toString(36).slice(0,2)+'…'+(i*104729%46656).toString(36).padStart(3,'0');
for(let i=0;i<90;i++)ws.push({id:id(i),state:i<4?'suivi':i==5?'banc':'candidat',score:Math.random(),act30:i%7==0?3:0,bot:i%5==0});
const eq=g=>{let e=10,s=[];for(let i=0;i<30;i++){e+=(Math.random()-.5)*.04;s.push([n-(30-i)*1800,+e.toFixed(4)])}return s};
const closes=[...Array(10)].map((_,i)=>({ts:n-i*900,t:'--:--',grp:'A',sym:'EXEMPLE'+i,pnl:(Math.random()-.5)*.06,pct:0,reason:i%3?'miroir':'stop-loss',trader:ws[i%4].id}));
return{demo:true,updated:'exemple',updated_ts:n,balance:10,pnl_total:0,pnl_total_pct:0,groups:Object.fromEntries('ABCDE'.split('').map(g=>[g,{equity:10,pnl:0,pnl_pct:0,closed:0,winrate:null,followed:0,sentinel:'OK'}])),
equity:Object.fromEntries('ABCE'.split('').map(g=>[g,eq(g)])),trades:[],closes,token_pnl_A:[{sym:'EXEMPLE',n:2,wins:1,pnl:0}],wallets:ws,followed_ids:ws.slice(0,4).map(w=>w.id),eligible:4,activity:[],
alerts:[{ts:n-60,t:'--:--',kind:'bench',w:ws[5].id,msg:'exemple'}],logs:[{ts:n,t:'--:--:--',lvl:'INFO',msg:'DONNÉES EXEMPLE'}],agents:{SCOUT:{state:'actif',info:'exemple'},PROBE:{state:'actif',info:'exemple'},RELAY:{state:'actif',info:'exemple'},SENTINEL:{state:'actif',info:'exemple'},STRAT:{state:'actif',info:'exemple'}}}}
/* ---------- compteur : transition vers la VRAIE valeur ---------- */
function tween(el,to,fmt){const from=+(el.dataset.v??to);el.dataset.v=to;const t0=performance.now();
 (function s(t){const k=Math.min(1,(t-t0)/900),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(s);else el.textContent=fmt(to)})(t0)}
/* ---------- canvas helpers ---------- */
function cv(id){const c=$(id),r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return[x,r.width,r.height]}
function line(id,series,opt={}){const[x,w,h]=cv(id);x.clearRect(0,0,w,h);const all=series.flatMap(s=>s.pts);if(all.length<2){x.fillStyle=M;x.fillText('PAS ENCORE DE DONNÉES',10,20);return}
 const t0=Math.min(...all.map(p=>p[0])),t1=Math.max(...all.map(p=>p[0])),v=all.map(p=>p[1]);let lo=Math.min(...v,opt.base??Infinity),hi=Math.max(...v,opt.base??-Infinity);if(hi-lo<1e-6){hi+=.01;lo-=.01}
 const X=t=>36+(w-44)*(t-t0)/((t1-t0)||1),Y=y=>8+(h-24)*(1-(y-lo)/(hi-lo));
 x.strokeStyle=L;x.lineWidth=1;x.fillStyle=M;x.font='9px JBM,monospace';for(let i=0;i<=4;i++){const y=lo+(hi-lo)*i/4;x.beginPath();x.moveTo(36,Y(y));x.lineTo(w-8,Y(y));x.stroke();x.fillText((opt.fmt||(a=>a.toFixed(2)))(y),0,Y(y)+3)}
 if(opt.base!=null){x.setLineDash([3,3]);x.strokeStyle=M;x.beginPath();x.moveTo(36,Y(opt.base));x.lineTo(w-8,Y(opt.base));x.stroke();x.setLineDash([])}
 for(const s of series){if(s.pts.length<2)continue;x.lineWidth=s.w||1.6;
  for(let i=1;i<s.pts.length;i++){const a=s.pts[i-1],b=s.pts[i];x.strokeStyle=s.col||(b[1]>=(opt.base??0)?C:P);x.shadowColor=x.strokeStyle;x.shadowBlur=6;x.beginPath();x.moveTo(X(a[0]),Y(a[1]));x.lineTo(X(b[0]),Y(b[1]));x.stroke()}
  x.shadowBlur=0;if(s.label){const p=s.pts.at(-1);x.fillStyle=s.col||C;x.fillText(s.label,Math.min(X(p[0])+3,w-30),Y(p[1])-3)}}}
function bars(id,vals,labels){const[x,w,h]=cv(id);x.clearRect(0,0,w,h);if(!vals.length){x.fillStyle=M;x.fillText('AUCUN TRADE CLOS',8,16);return}
 const mx=Math.max(...vals.map(Math.abs),1e-6),bw=(w-4)/vals.length,mid=h/2;x.strokeStyle=L;x.beginPath();x.moveTo(0,mid);x.lineTo(w,mid);x.stroke();
 vals.forEach((v,i)=>{const bh=(mid-10)*Math.abs(v)/mx;x.fillStyle=v>=0?C:P;x.shadowColor=x.fillStyle;x.shadowBlur=4;x.fillRect(2+i*bw+1,v>=0?mid-bh:mid,Math.max(1,bw-2),bh);x.shadowBlur=0;
  if(labels){x.fillStyle=M;x.font='9px JBM,monospace';x.fillText(labels[i],2+i*bw+bw/2-3,v>=0?mid+10:mid-3)}})}
/* ---------- rendu ---------- */
function render(d){D=d;$('demo').style.display=d.demo?'block':'none';const A=d.groups?.A||{},G=d.groups||{};
 const ws=d.wallets||[],fol=d.followed_ids||[],up=d.started_ts?Math.max(0,d.updated_ts-d.started_ts):null;
 const hk=[];if(d.sol_price)hk.push(['SOL','$'+(+d.sol_price).toFixed(2)]);hk.push(['WALLETS',fol.length+'/'+ws.length],['PAPER TRADES',A.closed??0],['WIN',A.winrate==null?'—':pc(A.winrate)]);
 if(up!=null)hk.push(['UPTIME',Math.floor(up/3600)+'h'+String(Math.floor(up%3600/60)).padStart(2,'0')]);if(d.lat_median_s)hk.push(['LAT',d.lat_median_s+'s']);
 $('hkv').innerHTML=hk.map(([k,v])=>`<span>${k}<b>${esc(v)}</b></span>`).join('');$('live').textContent=d.bot_online===false?'OFFLINE':'LIVE';
 const pe=$('pnl');pe.className='big '+cl(A.pnl);tween(pe,A.pnl||0,v=>sg(v,4)+' SOL');$('pnlpct').textContent=sg(A.pnl_pct,2)+' % · SOLDE '+(+(A.equity??d.balance)).toFixed(4)+' SOL';
 const n=A.closed||0;$('pfstats').innerHTML=[['COPIES',n],['WIN RATE',A.winrate==null?'—':pc(A.winrate)],['MOY./TRADE',n?sg(A.pnl/n,4):'—'],['PNL JOUR',sg(d.pnl_today,4)]].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 const top=(ws.filter(w=>w.state==='suivi').sort((a,b)=>b.score-a.score)[0]||{}).id||fol[0]||'—';$('copying').innerHTML=`COPYING <span class="pos">${esc(top)}</span> <em>· EQUITY A (SOL)</em>`;
 line('eq',[{pts:d.equity?.A||[]}],{base:10});
 $('tok').innerHTML='<tr><th>TOKEN</th><th>WIN %</th><th>PNL</th></tr>'+((d.token_pnl_A||[]).slice(0,8).map(t=>`<tr><td>${esc(t.sym)}</td><td>${Math.round(t.wins/t.n*100)}%</td><td class="${cl(t.pnl)}">${sg(t.pnl,4)}</td></tr>`).join('')||'<tr><td colspan=3 class="mu">aucun trade clos</td></tr>');
 const eqv=+(A.equity??10),mult=eqv/10;tween($('mult'),mult,v=>'×'+v.toFixed(4));$('mult').style.color=mult>=1?C:P;
 const cA=(d.closes||[]).filter(c=>c.grp==='A'),l3=cA.slice(-3),fire=l3.length===3&&l3.every(c=>c.pnl>0);$('fire').innerHTML=fire?'<span class="fire">🔥 ON FIRE · 3 GAINS DE SUITE</span>':'';
 const vol=(d.trades||[]).filter(t=>t.grp==='A'&&t.kind==='entry').reduce((s,t)=>s+(t.sol||0),0);
 $('st').innerHTML=[['PNL',sg(A.pnl,4)+' SOL'],['ROI',sg(A.pnl_pct,2)+' %'],['VOL (25 DERNIERS ÉVÉN.)',vol.toFixed(3)+' SOL'],['OUVERTES',A.open??0]].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 $('nodes').textContent=`nodes: ${ws.length} | eligible: ${d.eligible??'—'}`;
 const gc={A:C,B:'#7ad7ff',C:P,D:M,E:'#ffcc00'};line('roi',Object.keys(d.equity||{}).map(g=>({pts:(d.equity[g]||[]).map(p=>[p[0],(p[1]-10)*10]),col:gc[g],label:g,w:g==='A'?2:1.2})),{base:0,fmt:a=>a.toFixed(1)+'%'});
 const rc=(d.closes||[]).slice().reverse().slice(0,10);$('rc').innerHTML='<tr><th>#</th><th>TOKEN</th><th>WALLET</th><th>GRP</th><th>PNL</th><th></th><th>TIME</th></tr>'+(rc.map((c,i)=>{const k=c.ts+c.grp+c.sym,nw=!first&&!seenRC.has(k);seenRC.add(k);
  return`<tr class="${nw?'n':''}"><td class="mu">${(d.closes.length-i)}</td><td>${esc(c.sym)}</td><td class="mu">${esc(c.trader)}</td><td>${c.grp}</td><td class="${cl(c.pnl)}">${sg(c.pnl,4)}</td><td><span class="tag ${c.pnl>0?'w':'l'}">${c.pnl>0?'WIN':'LOS'}</span></td><td class="mu">${c.t}</td></tr>`}).join('')||'<tr><td colspan=7 class="mu">aucune copie close</td></tr>');
 bars('h1',cA.slice(-30).map(c=>c.pnl));const gs=Object.keys(G).sort();bars('h2',gs.map(g=>G[g].pnl||0),gs);
 $('groups').innerHTML=['A','B','C','D','E'].map(g=>{const v=G[g]||{},nm={A:'BOT COMPLET',B:'TRADERS FIGÉS',C:'HASARD',D:'CASH',E:'STRAT MOMENTUM'}[g];
  return`<div class="chip ${v.sentinel&&v.sentinel!=='OK'&&v.sentinel!=='—'?'off':'on'}"><h4>${g} · ${nm}</h4><b class="${cl(v.pnl)}">${sg(v.pnl_pct,2)} %</b><small>${v.closed??0} clos · WR ${v.winrate==null?'—':pc(v.winrate)}${v.reason?' · '+esc(v.reason):''}</small></div>`}).join('');
 $('agents').innerHTML=Object.entries(d.agents||{}).map(([k,v])=>`<div class="chip ${v.state==='actif'?'on':'off'}"><h4><i class="dot"></i>${k}</h4><b>${esc(v.state).toUpperCase()}</b><small>${esc(v.info)}</small></div>`).join('');
 $('upd').textContent=d.updated;$('wn').textContent='WALLETS '+ws.length;$('an').textContent='ALERTS '+(d.alerts_24h??(d.alerts||[]).length);
 feedLog(d);graphData(d);first=false}
/* ---------- terminal : vrais événements ---------- */
function feedLog(d){const ev=[];
 (d.activity||[]).forEach(a=>ev.push([a.ts,'k-ping','PING WHALE',`${a.w} ${a.side==='buy'?'achète':'vend'}`]));
 (d.trades||[]).forEach(t=>{if(t.kind==='entry')ev.push([t.ts,'k-buy','BUY',`[${t.grp}] ${t.sym} ${(t.sol||0).toFixed(3)} SOL ← ${t.trader}`]);
  else{const st=/stop/i.test(t.reason||'');ev.push([t.ts,st?'k-stop':'k-sell',st?'STOP':'SELL',`[${t.grp}] ${t.sym||''} ${sg(t.pnl,4)} SOL (${sg(t.pct,1)}%) · ${t.reason||''}`])}});
 (d.alerts||[]).forEach(a=>ev.push([a.ts,a.kind==='probe'?'k-rej':a.kind==='sentinel'?'k-sen':'k-cut',a.kind==='probe'?'PROBE REJECT':a.kind==='sentinel'?'SENTINEL':a.kind==='bench'?'BENCH':a.kind==='ws_mute'?'CUT':'EXIT FAIL',`${a.w||('['+(a.grp||'')+']')} ${a.msg}`]));
 const LG=d.logs||[],strat=LG.filter(l=>/^STRAT/.test(l.msg)).slice(-3);LG.filter(l=>!/^STRAT/.test(l.msg)||strat.includes(l)).forEach(l=>{const m=l.msg;let k='k-info',w=l.lvl==='WARNING'?'WARN':'INFO';if(/^STRAT/.test(m)){k='k-ping';w='STRAT'}else if(/SENTINEL/.test(m)){k='k-sen';w='SENTINEL'}else if(/coupé|banc/.test(m)){k='k-cut';w='ALERT'}else if(/reclassement|graines/.test(m)){k='k-ping';w='SCOUT'}ev.push([l.ts,k,w,m])});
 ev.sort((a,b)=>a[0]-b[0]);const fresh=ev.filter(e=>{const key=e.join('|');if(seenLog.has(key))return false;seenLog.add(key);return true});
 logQ.push(...(first?fresh.slice(-40):fresh))}
function hms(ts){return ts?new Date(ts*1e3).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris'}):'--:--:--'}
setInterval(()=>{if(!logQ.length)return;const e=logQ.shift(),t=$('term'),div=document.createElement('div');
 div.innerHTML=`<span class="ts">${hms(e[0])}</span> <span class="${e[1]}">${e[2]}</span> ${esc(e[3])}`;t.appendChild(div);while(t.children.length>60)t.firstChild.remove()},first?250:400);
/* ---------- graphe réseau (canvas) ---------- */
const ZONES=['JUPITER','RAYDIUM','PUMP POOL','ORCA','MEME'];let nodes=[],pings=[],flashes=[],ret={x:0,y:0,fx:0,fy:0,tx:0,ty:0,t:1,lab:'',i:0};
const hsh=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h};
function graphData(d){const old=Object.fromEntries(nodes.map(n=>[n.id,n]));
 nodes=(d.wallets||[]).map(w=>{const o=old[w.id],h=hsh(w.id);return Object.assign(o||{x:Math.random(),y:Math.random(),ph:Math.random()*6.28},{id:w.id,st:w.state,z:h%5,
  r:w.state==='suivi'?5:w.state==='banc'?4:1.6+2*Math.min(1,w.score||0),col:w.state==='suivi'?C:w.state==='banc'||w.bot||(w.copy_ret!=null&&w.copy_ret<0)?P:'#00ffcc99',act:w.act30||0,ox:(h%1000)/1000,oy:((h>>10)%1000)/1000})});
 const now=d.updated_ts;(d.alerts||[]).forEach(a=>{if(a.ts>seenAlert&&(first?now-a.ts<3600:true)&&a.kind!=='probe'||(!first&&a.ts>seenAlert)){const n=nodes.find(n=>n.id===a.w);flashes.push({n,txt:(a.kind==='probe'?'PROBE REJECT ':a.kind==='bench'?'BENCHED ':a.kind==='ws_mute'?'CUT ':'SENTINEL ')+(a.w||a.grp||''),t:0})}});
 seenAlert=Math.max(seenAlert,...(d.alerts||[]).map(a=>a.ts),0);
 $('legend').innerHTML=`<div><i style="background:${C}"></i>SUIVI (${nodes.filter(n=>n.st==='suivi').length})</div><div><i style="background:#00ffcc99"></i>CANDIDAT</div><div><i style="background:${P}"></i>BOT / BANC / NÉGATIF</div><div><i style="border:1px solid #fff"></i>RÉTICULE = WALLET SUIVI</div><div class="mu">ping = swap réel (30 min)</div><div class="mu">zones = décoratives</div>`}
function layout(w,h){const cx=[[.18,.3],[.42,.22],[.66,.32],[.3,.72],[.62,.72]];nodes.forEach(n=>{const c=cx[n.z];n.hx=(c[0]+(n.ox-.5)*.22)*w;n.hy=(c[1]+(n.oy-.5)*.32)*h;if(n.st==='suivi'){n.hx=w*(.4+.08*(n.ox-.5));n.hy=h*(.47+.15*(n.oy-.5))}});return cx}
let lastT=0;function frame(t){const dt=Math.min(.05,(t-lastT)/1e3);lastT=t;const c=$('graph');if(!c){return}
 const r=c.getBoundingClientRect(),dp=devicePixelRatio||1;if(c.width!==Math.round(r.width*dp)){c.width=r.width*dp;c.height=r.height*dp}const x=c.getContext('2d'),w=r.width,h=r.height;x.setTransform(dp,0,0,dp,0,0);
 x.fillStyle='rgba(8,4,10,.35)';x.fillRect(0,0,w,h);x.clearRect(0,0,w,h);const cx=layout(w,h);
 x.font='10px JBM,monospace';x.textAlign='center';cx.forEach((c,i)=>{x.strokeStyle='#2A1B3899';x.setLineDash([2,4]);x.beginPath();x.ellipse(c[0]*w,c[1]*h,w*.13,h*.19,0,0,6.28);x.stroke();x.setLineDash([]);x.fillStyle=M;x.fillText(ZONES[i],c[0]*w,c[1]*h-h*.19-4)});
 // radar
 const rx=w*.4,ry=h*.47,a=t/1600;x.strokeStyle='#00ffcc22';for(let k=1;k<4;k++){x.beginPath();x.arc(rx,ry,k*h*.12,0,6.28);x.stroke()}
 const g=x.createConicGradient?x.createConicGradient(a,rx,ry):null;if(g){g.addColorStop(0,'rgba(0,255,204,.18)');g.addColorStop(.12,'rgba(0,255,204,0)');g.addColorStop(1,'rgba(0,255,204,0)');x.fillStyle=g;x.beginPath();x.arc(rx,ry,h*.36,0,6.28);x.fill()}
 nodes.forEach(n=>{n.ph+=dt*.6;n.x=n.hx+Math.sin(n.ph)*3;n.y=n.hy+Math.cos(n.ph*.8)*3});
 const fol=nodes.filter(n=>n.st==='suivi');x.lineWidth=.5;
 nodes.forEach((n,i)=>{const m=nodes[(i*7+3)%nodes.length];if(m&&m.z===n.z){x.strokeStyle='#00ffcc18';x.beginPath();x.moveTo(n.x,n.y);x.lineTo(m.x,m.y);x.stroke()}
  if(n.st!=='suivi'&&fol.length&&i%4===0){const f=fol[i%fol.length];x.strokeStyle='#ff2a8514';x.beginPath();x.moveTo(n.x,n.y);x.lineTo(f.x,f.y);x.stroke()}});
 fol.forEach((f,i)=>{const g2=fol[(i+1)%fol.length];x.strokeStyle='#00ffcc55';x.beginPath();x.moveTo(f.x,f.y);x.lineTo(g2.x,g2.y);x.stroke()});
 // particules le long des liens suivis
 fol.forEach((f,i)=>{const g2=fol[(i+1)%fol.length],k=(t/2000+i*.27)%1;x.fillStyle=C;x.fillRect(f.x+(g2.x-f.x)*k-1,f.y+(g2.y-f.y)*k-1,2,2)});
 nodes.forEach(n=>{x.fillStyle=n.col;x.shadowColor=n.col;x.shadowBlur=n.st==='suivi'?10:3;x.beginPath();x.arc(n.x,n.y,n.r,0,6.28);x.fill()});x.shadowBlur=0;
 // pings : uniquement wallets avec swaps réels sur 30 min
 if(Math.random()<dt*1.5){const act=nodes.filter(n=>n.act>0);if(act.length)pings.push({n:act[Math.floor(Math.random()*act.length)],t:0})}
 pings=pings.filter(p=>(p.t+=dt)<1.6);pings.forEach(p=>{x.strokeStyle=`rgba(0,255,204,${1-p.t/1.6})`;x.lineWidth=1;x.beginPath();x.arc(p.n.x,p.n.y,4+p.t*22,0,6.28);x.stroke()});
 // réticule ease-in-out entre wallets suivis
 if(fol.length){ret.t+=dt/1.4;if(ret.t>=2.6){ret.i=(ret.i+1)%fol.length;ret.fx=ret.x;ret.fy=ret.y;ret.t=0}const tg=fol[ret.i%fol.length],k=Math.min(1,ret.t),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
  ret.x=ret.fx+(tg.x-ret.fx)*e;ret.y=ret.fy+(tg.y-ret.fy)*e;x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();x.arc(ret.x,ret.y,12,0,6.28);x.moveTo(ret.x-20,ret.y);x.lineTo(ret.x-6,ret.y);x.moveTo(ret.x+6,ret.y);x.lineTo(ret.x+20,ret.y);x.moveTo(ret.x,ret.y-20);x.lineTo(ret.x,ret.y-6);x.moveTo(ret.x,ret.y+6);x.lineTo(ret.x,ret.y+20);x.stroke();
  x.textAlign='left';x.fillStyle='#fff';x.fillText('WHALE: '+tg.id,ret.x+16,ret.y-14)}
 // alertes flash
 flashes=flashes.filter(f=>(f.t+=dt)<3);flashes.forEach(f=>{const al=1-f.t/3,px=f.n?f.n.x:w/2,py=f.n?f.n.y:h/2;x.strokeStyle=`rgba(255,42,133,${al})`;x.lineWidth=2;x.beginPath();x.arc(px,py,8+f.t*30,0,6.28);x.stroke();
  x.fillStyle=`rgba(255,42,133,${al*.12})`;x.fillRect(0,0,w,h);x.textAlign='center';x.fillStyle=`rgba(255,42,133,${al})`;x.font='bold 12px JBM,monospace';x.fillText('⚠ '+f.txt,px,py-18);x.font='10px JBM,monospace'});
 x.textAlign='left';requestAnimationFrame(frame)}
requestAnimationFrame(frame);
/* ---------- chargement ---------- */
async function load(){try{const r=await fetch('data.json?'+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;render(await r.json())}catch(e){if(!D||D.demo)render(demo())}}
load();setInterval(load,20000);addEventListener('resize',()=>D&&render(D));
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
