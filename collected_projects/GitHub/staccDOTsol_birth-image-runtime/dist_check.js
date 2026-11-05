
const $=(id)=>document.getElementById(id);
const MEMO=new Set(['MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr','Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo']);
const PROXY=(u)=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u);
const S={agents:[],rows:[],memos:[],stats:null};
let SHOW_DOWN=false;
async function getJson(url,ms=8000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(r.ok)return await r.json();}catch{}finally{clearTimeout(t);}try{const r=await fetch(PROXY(url),{cache:'no-store'});if(r.ok)return await r.json();}catch{}return null;}
async function rpc(m,p){const b=JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p});for(const u of ['https://solana-rpc.publicnode.com','https://api.mainnet-beta.solana.com']){try{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:b});const j=await r.json();if(j.result)return j.result;}catch{}}return null;}
const BEACON='beacon.json';
async function loadEndpoints(){
  S.agents=[]; S.rows=[];
  let bc=null;
  for(const p of ['beacon.json','docs/beacon.json']){try{const r=await fetch(p+'?ts='+Date.now(),{cache:'no-store'}); if(r.ok){bc=await r.json();break;}}catch{}}

  if(bc&&bc.stats) S.stats=bc.stats;
  for(const a of (bc&&bc.agents)||[]){
    const st=a.status||null;
    if(!st && !a.live) S.down=(S.down||0)+1;
    S.agents.push({endpoint:a.endpoint,wallet:st&&st.solana,live:!!a.live});
    S.rows.push({a:{endpoint:a.endpoint,wallet:st&&st.solana,gen:a.gen,kids:a.kids},st,live:!!(a.live||st&&st.phase)});
  }
}
function ago(t){try{let v=Number(t);if(v>1e12)v=v/1000;const d=Math.max(0,Math.floor(Date.now()/1000-v));if(!isFinite(d))return '—';const h=Math.floor(d/3600),m=Math.floor(d%3600/60);return h?h+'h '+m+'m':m+'m';}catch{return '—';}}
function renderFleet(){
  const q=(document.getElementById('q')?.value||'').toLowerCase();
  const sortBy=document.getElementById('sortby')?.value||'gen';
  let rows=(SHOW_DOWN?S.rows:S.rows.filter(r=>r.live||r.st));
  if(q) rows=rows.filter(r=>String(r.a.endpoint||'').toLowerCase().includes(q)||String((r.st&&r.st.solana)||'').toLowerCase().includes(q));
  rows=rows.slice().sort((x,y)=>{
    if(sortBy==='gen') return (Number(y.a.gen||0)-Number(x.a.gen||0))||(Number(y.live)-Number(x.live));
    if(sortBy==='up') return (Number((x.st&&x.st.t0)||0)-Number((y.st&&y.st.t0)||0));
    return String((x.st&&x.st.solana)||'').localeCompare(String((y.st&&y.st.solana)||''));
  });
  const rowsAll=rows.length?rows:S.rows;
  const body=rowsAll.map(({a,st})=>{
    const core=st&&st.image?(st.image.match?'match':'drift'):'—';
    const cls=(st&&st.phase)?'ok':'bad';
    const ep=String(a.endpoint).replace(/^https?:\/\//,'').slice(0,34);
    const w=String((st&&st.solana)||'').slice(0,7);
    const bid=st&&st.birth_id?String(st.birth_id).slice(0,8):'—';
    const gen=Number(a.gen||0)||1; const kids=Number(a.kids||0);
    return `<tr><td>${ep}</td><td>${w}</td><td><span class="pill ${gen>1?'ok':''}">gen${gen}</span></td><td>${kids}</td><td><span class="pill ${cls}">${(st&&st.phase)||'down'}</span></td><td>${bid}</td><td>${core}</td><td>${st&&st.t0?ago(st.t0):'—'}</td></tr>`;
  });
  try{$('fleet-body').innerHTML=body.length?body.join(''):'<tr><td colspan="6" class="empty">beacon has no agents yet</td></tr>';}catch(e){$('fleet-body').innerHTML='<tr><td colspan="6">render err: '+e.message+'</td></tr>';}
  const up=S.rows.filter(r=>r.live).length;
  $('stamp').textContent=`${up} live / ${S.rows.length} seen · ${new Date().toLocaleTimeString()}`;
  const cb=$('showdown'); const qEl=$('q'); if(qEl&&!qEl.oninput){qEl.oninput=()=>renderFleet();} const sEl=$('sortby'); if(sEl&&!sEl.onchange){sEl.onchange=()=>renderFleet();} if(cb){cb.checked=SHOW_DOWN;cb.onchange=()=>{SHOW_DOWN=cb.checked;renderFleet();};}
}
async function loadMemos(){const ws=[...new Set(S.agents.map(a=>{const r=S.rows.find(x=>x.a===a);return (r&&r.st&&r.st.solana)||a.wallet;}).filter(Boolean))].slice(0,10);const f=[];await Promise.all(ws.map(async(w)=>{const sigs=await rpc('getSignaturesForAddress',[w,{limit:10}]);if(!Array.isArray(sigs))return;await Promise.all(sigs.slice(0,6).map(async(s)=>{const tx=await rpc('getTransaction',[s.signature,{encoding:'jsonParsed',maxSupportedTransactionVersion:0}]);for(const ix of ((tx&&tx.transaction&&tx.transaction.message&&tx.transaction.message.instructions)||[])){if(!MEMO.has(ix.programId))continue;let t='';try{t=new TextDecoder().decode(Uint8Array.from(atob(ix.data||''),c=>c.charCodeAt(0)));}catch{}if(t)f.push({at:s.blockTime||0,from:w.slice(0,6),sig:s.signature,text:t});}}));}));f.sort((x,y)=>y.at-x.at);S.memos=f.slice(0,50);}
function channelOf(t){if(/^<<[0-9a-f]{8}>>/.test(t))return 'obfuscated';if(t.startsWith('swm2.'))return 'sealed';if(/^\[pub\]/.test(t))return 'public';return 'plain';}
function renderComms(){const now=Math.floor(Date.now()/1000);const sealed=S.memos.filter(m=>channelOf(m.text)==='sealed').length;const cs=(S.stats&&S.stats.comms)||{};const bItems0=cs.items||[];
  const msgs=S.memos.length||Number(cs.messages||0);
  $('c-big').innerHTML=`${msgs}<small>messages</small>`;
  $('c-hour').textContent=S.memos.length?S.memos.filter(m=>now-m.at<3600).length:bItems0.length;
  $('c-peers').textContent=S.memos.length?new Set(S.memos.map(m=>m.from)).size:Number(cs.agents||0);
  $('c-split').textContent=S.memos.length?`${sealed} / ${S.memos.length-sealed}`:`${bItems0.filter(t=>String(t).includes('swm:')).length} sealed / ${bItems0.filter(t=>!String(t).includes('swm:')).length} plain`;$('comms-note').textContent=S.memos.length?`newest ${ago(S.memos[0].at)} ago · [pub] public · <<hash>> obfuscated · swm2.* sealed`:'no memos on chain yet — the agents have not spoken';const bItems=(S.stats&&S.stats.comms&&S.stats.comms.items)||[];

  $('comms-feed').innerHTML=S.memos.length?S.memos.map(m=>{const ch=channelOf(m.text);const cls=ch==='sealed'?'ok':ch==='obfuscated'?'warn':'';return `<div class="msg"><div class="meta"><span>${m.from}</span><span>${ago(m.at)} ago</span><span class="pill ${cls}">${ch}</span><a href="https://solscan.io/tx/${m.sig}" target="_blank" rel="noopener">tx</a></div><div class="body">${m.text.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div></div>`;}).join(''):(()=>{const bi=(S.stats&&S.stats.comms&&S.stats.comms.items)||[];if(!bi.length)return '<div class="empty">nothing on the wire yet</div>';$('c-big').innerHTML=bi.length+'<small>messages</small>';$('comms-note').textContent='live from the agent tick log · '+bi.length+' lines';return bi.map(t=>{const p=String(t).split('|');const who=(p.shift()||'').slice(0,8);return '<div class="msg"><div class="meta"><span>'+who+'</span><span class="pill ok">live</span></div><div class="body">'+p.join(' ').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))+'</div></div>';}).join('');})();}
function renderEcon(){
  if(S.val){const val=S.val;const et=document.getElementById('econ-total');if(et)et.textContent='$'+Number(val.total_usd).toFixed(2);}const st=S.rows.map(r=>r.st).filter(Boolean);const es=(S.stats&&S.stats.economics)||{};
  const pos=st.flatMap(x=>x.positions||[]);
  const l=Number(es.launches||0)||st.reduce((s,x)=>s+((x.launches||[]).length),0);
  const v=Number(es.value_sol||0)||pos.reduce((s,p)=>s+(Number(p.value_sol)||0),0);
  const ex=Number(es.sweeps||0)||st.reduce((s,x)=>s+(Number(x.exits)||0),0);
  const posN=Number(es.positions||0)||pos.length;$('e-big').innerHTML=`${l}<small>launches</small>`;$('e-pos').textContent=posN;$('e-val').textContent=v?v.toFixed(4)+' SOL':'—';$('e-exit').textContent=ex;$('e-agents').innerHTML=st.filter(x=>(x.launches||[]).length).map(x=>`<div class="row"><span>${(x.solana||'').slice(0,7)}</span><b>${x.launches.length}</b></div>`).join('')||'<div class="row"><span>none reported</span><b>0</b></div>';$('e-positions').innerHTML=pos.length?pos.map(p=>`<div class="row"><span>${String(p.mint||'').slice(0,8)}</span><b>${(Number(p.value_sol)||0).toFixed(4)} SOL</b></div>`).join(''):(posN?`<div class="row"><span>${posN} positions in the book</span><b>${v.toFixed(4)} SOL</b></div><div class="row"><span class="sub">per-mint detail loads when a guest reports its book</span><b>—</b></div>`:'<div class="row"><span>no open positions</span><b>—</b></div>');}
function renderInvention(){const st=S.rows.map(r=>r.st).filter(Boolean);let sc=st.flatMap(x=>x.inventions||[]);
  const bi=(S.stats&&S.stats.invention&&S.stats.invention.items)||[];
  if(!sc.length&&bi.length) sc=bi.map(n=>({name:n,at:0}));$('i-big').innerHTML=`${(S.stats&&S.stats.invention&&S.stats.invention.scripts)||sc.length}<small>scripts</small>`;$('i-last').textContent=(()=>{const la=Number(S.stats&&S.stats.invention&&S.stats.invention.last_at)||0;if(la>1e9)return ago(la);const ts=sc.map(x=>Number(x.at)||0).filter(v=>v>1e9);return ts.length?ago(Math.max(...ts)):'—';})();$('i-trade').textContent=sc.filter(s=>/pump|curve|swap|buy|sell|price|trade/i.test(String(s.name||s))).length;$('i-list').innerHTML=sc.length?sc.slice(0,20).map(s=>{const at=Number(s.at)||0;return `<div class="row"><span>${String(s.name||s).slice(0,44)}</span><b>${at>1e9?ago(at):''}</b></div>`;}).join(''):'<div class="row"><span>nothing invented yet</span><b>—</b></div>';}
function showTab(n){for(const t of ['fleet','comms','economics','invention'])$(t).hidden=t!==n;document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===n)));}
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)showTab(b.dataset.tab);});
async function refresh(){try{await loadEndpoints();renderFleet();await loadMemos();try{const v=await getJson('valuation.json?ts='+Date.now(),9000);if(v&&v.totals)S.val=v.totals;}catch{}
  renderComms();renderEcon();renderInvention();}catch(e){document.getElementById("stamp").textContent="render error: "+e.message;}}
refresh();setInterval(refresh,60000);
