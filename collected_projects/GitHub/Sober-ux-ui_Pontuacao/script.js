// ╔══════════════════════════════════════════════════════════╗
// ║  CONFIGURAÇÃO — ALTERE AQUI PARA CONECTAR AO SHAREPOINT ║
// ╚══════════════════════════════════════════════════════════╝
const CONFIG = {
  // URL do JSON com os dados (gerado pelo Power Automate)
  // Enquanto estiver vazio, usa dados de exemplo
  DATA_URL: 'https://api.github.com/repos/Sober-ux-ui/Pontuacao/contents/dados.json',

  // Logo do Movimento Soberana (URL ou caminho do arquivo, ex.: 'logo.png').
  // Enquanto estiver vazio, aparece um espaço reservado "LOGO".
  LOGO_URL: 'https://raw.githubusercontent.com/Sober-ux-ui/Pontuacao/main/LOGOTIPO.png',

  // Intervalo de atualização em milissegundos (5 minutos)
  REFRESH_INTERVAL: 5 * 60 * 1000,

  // Duração das animações em ms
  ANIM_DURATION: 1500,
  NUMBER_ANIM_DURATION: 1200,

  // ── MODO TV ──
  TV_SCROLL_SPEED: 45,       // velocidade da rolagem em pixels por segundo (menor = mais lento)
  TV_DWELL_TOP_SCROLL: 3000, // ms parado no topo antes de começar a descer (aba com rolagem)
  TV_DWELL_STATIC: 10000,    // ms exibindo a aba quando ela cabe na tela (sem rolagem)
  TV_DWELL_BOTTOM: 2500,     // ms parado no fim antes de subir
  TV_DWELL_END: 1500,        // ms parado no topo depois de subir, antes de trocar de aba
};

// ╔══════════════════════════════════════════════════════════╗
// ║  DADOS DAS EQUIPES                                       ║
// ╚══════════════════════════════════════════════════════════╝
const TEAMS = {
  'ODONTOLOGIA':          { pk:'ODO',  color:'#3B82F6', emoji:'🦷' },
  'FARMÁCIA':             { pk:'FARM', color:'#22C55E', emoji:'💊' },
  'ENFERMAGEM':           { pk:'ENF',  color:'#EC4899', emoji:'🏥' },
  'PSICOLOGIA':           { pk:'PSI',  color:'#A855F7', emoji:'🧠' },
  'TERAPIA OCUPACIONAL':  { pk:'TO',   color:'#F97316', emoji:'🤲' },
  'MEDICINA VETERINÁRIA': { pk:'MEDV', color:'#06B6D4', emoji:'🐾' },
  'BIOMEDICINA':          { pk:'BIO',  color:'#EF4444', emoji:'🔬' },
  'ESTÉTICA E COSMÉTICA': { pk:'EST',  color:'#EAB308', emoji:'✨' },
};

const ACTIVITIES = [
  'CESTA BÁSICA','BRINQUEDOS','DOAÇÃO DE SANGUE','CAMINHADA',
  'BÔNUS PESSOA REGISTRADA','DESFILE DE SCRUB','SOBERANA DANCE',
  'CURTIDAS','COMENTÁRIOS','COMPARTILHAMENTOS','BÔNUS VÍDEO'
];
const ACT_SHORT = ['Cesta','Brinquedos','Doação de Sangue','Caminhada','Bônus Registro','Desfile','Soberana Dance','Curtidas','Comentários','Compartilhamento','Vídeo Bônus'];
const CRITERIA = ['Experiência geral','Criatividade e inovação','Conhecimento técnico','Organização e envolvimento'];
const CRIT_SHORT = ['Experiência','Criatividade','Conhecimento','Organização'];

// ╔══════════════════════════════════════════════════════════╗
// ║  DADOS DE EXEMPLO (substituídos pelo fetch real)         ║
// ╚══════════════════════════════════════════════════════════╝
function getSampleData() {
  return {
    gincana: [
      { CURSO:'ODONTOLOGIA', 'CESTA BÁSICA':1500,'BRINQUEDOS':800,'DOAÇÃO DE SANGUE':600,'CAMINHADA':400,'BÔNUS PESSOA REGISTRADA':300,'DESFILE DE SCRUB':250,'SOBERANA DANCE':200,'CURTIDAS':150,'COMENTÁRIOS':100,'COMPARTILHAMENTOS':80,'BÔNUS VÍDEO':50 },
      { CURSO:'FARMÁCIA', 'CESTA BÁSICA':1200,'BRINQUEDOS':900,'DOAÇÃO DE SANGUE':500,'CAMINHADA':350,'BÔNUS PESSOA REGISTRADA':280,'DESFILE DE SCRUB':300,'SOBERANA DANCE':180,'CURTIDAS':120,'COMENTÁRIOS':90,'COMPARTILHAMENTOS':70,'BÔNUS VÍDEO':40 },
      { CURSO:'ENFERMAGEM', 'CESTA BÁSICA':1800,'BRINQUEDOS':700,'DOAÇÃO DE SANGUE':800,'CAMINHADA':500,'BÔNUS PESSOA REGISTRADA':200,'DESFILE DE SCRUB':350,'SOBERANA DANCE':220,'CURTIDAS':180,'COMENTÁRIOS':130,'COMPARTILHAMENTOS':90,'BÔNUS VÍDEO':60 },
      { CURSO:'PSICOLOGIA', 'CESTA BÁSICA':1100,'BRINQUEDOS':600,'DOAÇÃO DE SANGUE':450,'CAMINHADA':300,'BÔNUS PESSOA REGISTRADA':250,'DESFILE DE SCRUB':200,'SOBERANA DANCE':150,'CURTIDAS':100,'COMENTÁRIOS':80,'COMPARTILHAMENTOS':60,'BÔNUS VÍDEO':30 },
      { CURSO:'TERAPIA OCUPACIONAL', 'CESTA BÁSICA':900,'BRINQUEDOS':500,'DOAÇÃO DE SANGUE':400,'CAMINHADA':280,'BÔNUS PESSOA REGISTRADA':220,'DESFILE DE SCRUB':180,'SOBERANA DANCE':160,'CURTIDAS':90,'COMENTÁRIOS':70,'COMPARTILHAMENTOS':50,'BÔNUS VÍDEO':20 },
      { CURSO:'MEDICINA VETERINÁRIA', 'CESTA BÁSICA':1400,'BRINQUEDOS':850,'DOAÇÃO DE SANGUE':700,'CAMINHADA':420,'BÔNUS PESSOA REGISTRADA':310,'DESFILE DE SCRUB':280,'SOBERANA DANCE':190,'CURTIDAS':140,'COMENTÁRIOS':110,'COMPARTILHAMENTOS':75,'BÔNUS VÍDEO':45 },
      { CURSO:'BIOMEDICINA', 'CESTA BÁSICA':1000,'BRINQUEDOS':550,'DOAÇÃO DE SANGUE':480,'CAMINHADA':320,'BÔNUS PESSOA REGISTRADA':240,'DESFILE DE SCRUB':220,'SOBERANA DANCE':170,'CURTIDAS':110,'COMENTÁRIOS':85,'COMPARTILHAMENTOS':65,'BÔNUS VÍDEO':35 },
      { CURSO:'ESTÉTICA E COSMÉTICA', 'CESTA BÁSICA':800,'BRINQUEDOS':450,'DOAÇÃO DE SANGUE':350,'CAMINHADA':250,'BÔNUS PESSOA REGISTRADA':200,'DESFILE DE SCRUB':160,'SOBERANA DANCE':140,'CURTIDAS':80,'COMENTÁRIOS':60,'COMPARTILHAMENTOS':40,'BÔNUS VÍDEO':25 },
    ],
    workshop: [
      { WORKSHOP:'ODONTOLOGIA', 'Experiência geral':8, 'Criatividade e inovação':7, 'Conhecimento técnico':9, 'Organização e envolvimentoto da equipe':8 },
      { WORKSHOP:'ODONTOLOGIA', 'Experiência geral':9, 'Criatividade e inovação':8, 'Conhecimento técnico':8, 'Organização e envolvimentoto da equipe':9 },
      { WORKSHOP:'FARMÁCIA', 'Experiência geral':7, 'Criatividade e inovação':9, 'Conhecimento técnico':7, 'Organização e envolvimentoto da equipe':8 },
      { WORKSHOP:'ENFERMAGEM', 'Experiência geral':9, 'Criatividade e inovação':8, 'Conhecimento técnico':9, 'Organização e envolvimentoto da equipe':9 },
      { WORKSHOP:'ENFERMAGEM', 'Experiência geral':10, 'Criatividade e inovação':9, 'Conhecimento técnico':10, 'Organização e envolvimentoto da equipe':8 },
      { WORKSHOP:'ENFERMAGEM', 'Experiência geral':8, 'Criatividade e inovação':7, 'Conhecimento técnico':8, 'Organização e envolvimentoto da equipe':9 },
      { WORKSHOP:'MEDICINA VETERINÁRIA', 'Experiência geral':8, 'Criatividade e inovação':8, 'Conhecimento técnico':7, 'Organização e envolvimentoto da equipe':7 },
    ]
  };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  LOGO                                                    ║
// ╚══════════════════════════════════════════════════════════╝
(function initLogo() {
  if (!CONFIG.LOGO_URL) return;
  const img = document.getElementById('logo');
  const ph = document.getElementById('logoPh');
  img.onload = () => { img.classList.add('show'); ph.classList.add('hide'); };
  img.onerror = () => { img.classList.remove('show'); ph.classList.remove('hide'); };
  img.src = CONFIG.LOGO_URL;
})();

// ╔══════════════════════════════════════════════════════════╗
// ║  PROCESSAMENTO DE DADOS                                  ║
// ╚══════════════════════════════════════════════════════════╝
function processData(raw) {
  const teams = [];
  for (const g of raw.gincana) {
    const curso = g.CURSO;
    const meta = TEAMS[curso] || { pk:'?', color:'#999', emoji:'❓' };
    const actValues = ACTIVITIES.map(a => g[a] || 0);
    const gincanaTotal = actValues.reduce((s,v) => s+v, 0);

    // Workshop aggregation
    const wsRows = raw.workshop.filter(w => w.WORKSHOP === curso);
    const wsCount = wsRows.length;
    let wsAvg = [0,0,0,0], wsTotal = 0;
    if (wsCount > 0) {
      CRITERIA.forEach((c,i) => {
        wsAvg[i] = wsRows.reduce((s,r) => s + (r[c]||0), 0) / wsCount;
      });
      // Valores já vêm na escala 0-25 do SharePoint (max 100 = 4 x 25)
      wsTotal = wsAvg.reduce((s,v) => s + v, 0);
    }

    teams.push({
      curso, ...meta, actValues, gincanaTotal,
      wsCount, wsAvg, wsTotal: wsCount > 0 ? wsTotal : null,
      total: gincanaTotal + (wsCount > 0 ? wsTotal : 0),
    });
  }

  // Rankings
  teams.sort((a,b) => b.total - a.total);
  teams.forEach((t,i) => t.rank = i+1);

  // Workshop ranking
  const wsTeams = [...teams].sort((a,b) => (b.wsTotal||0) - (a.wsTotal||0));
  wsTeams.forEach((t,i) => t.wsRank = i+1);

  // Max values for conditional coloring
  const maxAct = ACTIVITIES.map((_,i) => Math.max(...teams.map(t => t.actValues[i])));
  const maxWsAvg = [0,1,2,3].map(i => Math.max(...teams.map(t => t.wsAvg[i])));
  const maxTotal = Math.max(...teams.map(t => t.total));

  return { teams, wsTeams, maxAct, maxWsAvg, maxTotal };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ANIMAÇÃO DE NÚMEROS                                     ║
// ╚══════════════════════════════════════════════════════════╝
function animateNumber(el, target, duration = CONFIG.NUMBER_ANIM_DURATION, decimals = 0) {
  if (!el) return;
  const start = parseFloat(el.dataset.val || '0');
  el.dataset.val = target;
  if (Math.abs(start - target) < 0.01) return;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const current = start + (target - start) * eased;
    el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString('pt-BR');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const fmt = v => Math.round(v).toLocaleString('pt-BR');

// ╔══════════════════════════════════════════════════════════╗
// ║  RENDERIZAÇÃO — TAB 1: CLASSIFICAÇÃO                     ║
// ╚══════════════════════════════════════════════════════════╝
// Guarda os valores da renderização anterior (por curso) para que,
// numa atualização, os números e barras animem a partir do valor antigo.
let prevMap = {};

function renderClassificacao(data) {
  const pane = document.getElementById('pane0');
  const isUpdate = Object.keys(prevMap).length > 0;
  const prev = t => prevMap[t.curso] || { total:0, g:0, w:0, pct:0 };

  // Índices por COLOCAÇÃO: 0 = 1º lugar, 1 = 2º, 2 = 3º
  const medals = ['🥇','🥈','🥉'];
  const heights = [200,150,100];
  const gradients = [
    'linear-gradient(180deg,#FBBF24,rgba(251,191,36,.3))',
    'linear-gradient(180deg,#CBD5E1,rgba(203,213,225,.25))',
    'linear-gradient(180deg,#D97706,rgba(217,119,6,.25))'
  ];
  const scoreColors = ['var(--gold)','var(--silver)','var(--bronze)'];
  // Pódio tradicional: 2º à esquerda, 1º no centro, 3º à direita
  const order = [1,0,2];

  let html = '<div class="podium">';
  order.forEach((pi, flexOrder) => {
    const t = data.teams[pi];
    const p = prev(t);
    html += `<div class="pod-col" style="order:${flexOrder}">
      <div class="pod-info">
        <div class="pod-medal">${medals[pi]}</div>
        <div class="pod-emoji">${t.emoji}</div>
        <div class="pod-name" style="color:${t.color}">${t.curso}</div>
        <div class="pod-score" style="color:${scoreColors[pi]}"><span data-anim="pod${pi}" data-val="${p.total}">${fmt(p.total)}</span></div>
        <div class="pod-label">pontos</div>
        <div class="pod-breakdown">
          <span>Gincana: <b data-anim="podg${pi}" data-val="${p.g}">${fmt(p.g)}</b></span>
          <span>Workshop: <b data-anim="podw${pi}" data-val="${p.w}">${fmt(p.w)}</b></span>
        </div>
      </div>
      <div class="pod-base" style="height:${heights[pi]}px;background:${gradients[pi]}">
        <span class="pod-base-num">${pi+1}°</span>
      </div>
    </div>`;
  });
  html += '</div>';

  // Ranking 4º em diante
  data.teams.slice(3).forEach((t,i) => {
    const p = prev(t);
    html += `<div class="rank-row" data-rank="${t.rank}">
      <div class="rank-pos">${t.rank}°</div>
      <div class="rank-color" style="background:${t.color}"></div>
      <div class="rank-info">
        <div class="rank-name" style="color:${t.color}">${t.emoji} ${t.curso}</div>
        <div class="rank-detail">Gincana: <span data-anim="rkg${i}" data-val="${p.g}">${fmt(p.g)}</span> · Workshop: <span data-anim="rkw${i}" data-val="${p.w}">${fmt(p.w)}</span></div>
      </div>
      <div class="rank-bar-wrap"><div class="rank-bar" data-anim="rkbar${i}" style="width:${p.pct.toFixed(1)}%;background:${t.color}"></div></div>
      <div class="rank-total" style="color:${t.color}"><span data-anim="rkt${i}" data-val="${p.total}">${fmt(p.total)}</span> <small>pts</small></div>
    </div>`;
  });

  pane.innerHTML = html;
  void pane.offsetWidth; // força o layout para a transição das barras funcionar

  requestAnimationFrame(() => {
    [0,1,2].forEach(pi => {
      const t = data.teams[pi];
      animateNumber(pane.querySelector(`[data-anim="pod${pi}"]`), t.total);
      animateNumber(pane.querySelector(`[data-anim="podg${pi}"]`), t.gincanaTotal);
      animateNumber(pane.querySelector(`[data-anim="podw${pi}"]`), t.wsTotal || 0);
    });
    data.teams.slice(3).forEach((t,i) => {
      animateNumber(pane.querySelector(`[data-anim="rkt${i}"]`), t.total);
      animateNumber(pane.querySelector(`[data-anim="rkg${i}"]`), t.gincanaTotal);
      animateNumber(pane.querySelector(`[data-anim="rkw${i}"]`), t.wsTotal || 0);
      pane.querySelector(`[data-anim="rkbar${i}"]`).style.width = (t.total/data.maxTotal*100).toFixed(1)+'%';
    });
    if (isUpdate) {
      pane.querySelectorAll('.pod-col,.rank-row').forEach(el => el.classList.add('flash'));
      setTimeout(() => pane.querySelectorAll('.flash').forEach(el => el.classList.remove('flash')), 1200);
    }
  });

  data.teams.forEach(t => {
    prevMap[t.curso] = { total:t.total, g:t.gincanaTotal, w:t.wsTotal||0, pct:t.total/data.maxTotal*100 };
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  RENDERIZAÇÃO — TAB 2: PONTUAÇÃO (tabelas)               ║
// ╚══════════════════════════════════════════════════════════╝
function cellClass(val, max) {
  if (max <= 0) return 'cell-lo';
  if (val === max && val > 0) return 'cell-hi';
  if (val >= max * 0.5) return 'cell-mid';
  return 'cell-lo';
}

function renderPontuacao(data) {
  const pane = document.getElementById('pane1');
  let html = '';

  // Gincana table
  html += `<div class="section-title">Gincana — Dias 1 e 2 <span class="badge">11 atividades</span></div>`;
  html += `<div class="tbl-wrap"><table class="score-table"><thead><tr><th>Equipe</th>`;
  ACT_SHORT.forEach(a => html += `<th>${a}</th>`);
  html += `<th>TOTAL</th></tr></thead><tbody>`;
  data.teams.forEach(t => {
    html += `<tr><td><div class="team-cell"><span class="team-dot" style="background:${t.color}"></span><span style="color:${t.color}">${t.emoji} ${t.curso}</span></div></td>`;
    t.actValues.forEach((v,i) => {
      html += `<td><span class="cell-val ${cellClass(v,data.maxAct[i])}">${v.toLocaleString('pt-BR')}</span></td>`;
    });
    html += `<td class="cell-total" style="color:${t.color}">${t.gincanaTotal.toLocaleString('pt-BR')}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // Workshop table
  html += `<div class="table-sep"></div>`;
  html += `<div class="section-title">Workshop — Dia 3 <span class="badge">4 critérios</span></div>`;
  html += `<div class="tbl-wrap"><table class="score-table"><thead><tr><th>Equipe</th>`;
  CRIT_SHORT.forEach(c => html += `<th>${c}</th>`);
  html += `<th>Aval.</th><th>TOTAL</th></tr></thead><tbody>`;
  data.wsTeams.forEach(t => {
    const has = t.wsTotal !== null;
    html += `<tr><td><div class="team-cell"><span class="team-dot" style="background:${t.color}"></span><span style="color:${t.color}">${t.emoji} ${t.curso}</span></div></td>`;
    t.wsAvg.forEach((v,i) => {
      html += `<td><span class="cell-val ${has ? cellClass(v, data.maxWsAvg[i]) : 'cell-lo'}">${has ? Math.round(v) : '—'}</span></td>`;
    });
    html += `<td style="color:var(--text-muted)">${has ? t.wsCount : '—'}</td>`;
    html += `<td class="cell-total" style="color:${t.color}">${has ? Math.round(t.wsTotal).toLocaleString('pt-BR') : '—'}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  pane.innerHTML = html;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  RENDERIZAÇÃO — TAB 3: WORKSHOP (cards)                  ║
// ╚══════════════════════════════════════════════════════════╝
let prevWs = {};

function renderWorkshop(data) {
  const pane = document.getElementById('pane2');
  const isUpdate = Object.keys(prevWs).length > 0;

  let html = `<div class="section-title">Workshop — Dia 3 <span class="badge">Avaliação do público</span></div><div class="ws-grid">`;
  data.wsTeams.forEach((t, idx) => {
    const has = t.wsTotal !== null;
    const opac = has ? '1' : '0.4';
    const p = prevWs[t.curso] || { total:0, avg:[0,0,0,0] };
    html += `<div class="ws-card" style="opacity:${opac}" data-ws="${idx}">
      <div class="ws-card-bar" style="background:linear-gradient(90deg,transparent,${t.color},transparent)"></div>
      <div class="ws-header">
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="ws-rank" style="color:${t.color}">${has ? t.wsRank+'°' : '—'}</span>
            <span class="ws-name" style="color:${t.color}">${t.emoji} ${t.curso}</span>
          </div>
          <div class="ws-meta">${t.wsCount} avaliação(ões)</div>
        </div>
        <div class="ws-total-val" style="color:${t.color}" data-anim="wst${idx}" data-val="${p.total}">${fmt(p.total)}</div>
      </div>
      <div class="ws-rows">
        <div class="ws-row-hdr"><span class="ws-row-label"></span><div class="ws-row-bar-wrap" style="visibility:hidden"></div><span class="ws-avg-hdr" style="color:${t.color}">Média</span></div>`;
    CRIT_SHORT.forEach((c,ci) => {
      html += `<div class="ws-row">
        <span class="ws-row-label" style="color:${t.color}">${c}</span>
        <div class="ws-row-bar-wrap"><div class="ws-row-bar" data-anim="wsb${idx}_${ci}" style="width:${(p.avg[ci]/25*100).toFixed(0)}%;background:${t.color}"></div></div>
        <span class="ws-row-val" style="color:${t.color}" data-anim="wsv${idx}_${ci}" data-val="${p.avg[ci]}">${p.avg[ci].toFixed(1)}</span>
      </div>`;
    });
    if (!has) html += `<div class="ws-waiting">Aguardando avaliações</div>`;
    html += `</div></div>`;
  });
  html += '</div>';

  pane.innerHTML = html;
  void pane.offsetWidth; // força o layout para a transição das barras funcionar

  requestAnimationFrame(() => {
    data.wsTeams.forEach((t, idx) => {
      if (t.wsTotal === null) return;
      animateNumber(pane.querySelector(`[data-anim="wst${idx}"]`), Math.round(t.wsTotal));
      t.wsAvg.forEach((v, ci) => {
        animateNumber(pane.querySelector(`[data-anim="wsv${idx}_${ci}"]`), v, CONFIG.NUMBER_ANIM_DURATION, 1);
        pane.querySelector(`[data-anim="wsb${idx}_${ci}"]`).style.width = (v/25*100).toFixed(0)+'%';
      });
      if (isUpdate) pane.querySelector(`[data-ws="${idx}"]`).classList.add('flash');
    });
    if (isUpdate) setTimeout(() => pane.querySelectorAll('.flash').forEach(el => el.classList.remove('flash')), 1200);
  });

  data.wsTeams.forEach(t => {
    prevWs[t.curso] = { total: Math.round(t.wsTotal || 0), avg: [...t.wsAvg] };
  });
}

// ╔══════════════════════════════════════════════════════════╗
// ║  ABAS                                                     ║
// ╚══════════════════════════════════════════════════════════╝
let currentTab = 0;

// auto = true quando a troca vem do Modo TV; false quando o clique é manual
function switchTab(n, auto = false) {
  currentTab = n;
  document.querySelectorAll('.tab').forEach((t,i) => t.className = i===n ? 'tab on' : 'tab');
  document.querySelectorAll('.pane').forEach((p,i) => p.classList.toggle('on', i===n));
  window.scrollTo(0, 0);
  // Se o usuário clicar numa aba com o Modo TV ligado, reinicia o ciclo a partir dela
  if (!auto && tvOn) { tvRun++; tvLoop(tvRun); }
}

// ╔══════════════════════════════════════════════════════════╗
// ║  MODO TV — troca de abas + rolagem lenta                 ║
// ╚══════════════════════════════════════════════════════════╝
let tvOn = false;
let tvRun = 0; // identificador do ciclo atual; mudar o valor cancela o ciclo antigo

function tvWait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Rola a janela até a posição "to" em velocidade constante (px/s), suavizando início e fim
function tvScrollTo(to, id) {
  return new Promise(res => {
    const from = window.scrollY;
    const dist = Math.abs(to - from);
    if (dist < 2) return res();
    const dur = dist / CONFIG.TV_SCROLL_SPEED * 1000;
    const t0 = performance.now();
    function step(now) {
      if (id !== tvRun) return res();
      const p = Math.min((now - t0) / dur, 1);
      const eased = 0.5 - Math.cos(p * Math.PI) / 2; // easeInOutSine
      window.scrollTo(0, from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
}

async function tvLoop(id) {
  while (id === tvRun) {
    window.scrollTo(0, 0);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (maxScroll > 8) {
      // A aba é maior que a tela: espera, desce devagar, espera, sobe devagar
      await tvWait(CONFIG.TV_DWELL_TOP_SCROLL);                  if (id !== tvRun) return;
      await tvScrollTo(document.documentElement.scrollHeight - window.innerHeight, id); if (id !== tvRun) return;
      await tvWait(CONFIG.TV_DWELL_BOTTOM);                      if (id !== tvRun) return;
      await tvScrollTo(0, id);                                   if (id !== tvRun) return;
      await tvWait(CONFIG.TV_DWELL_END);                         if (id !== tvRun) return;
    } else {
      // A aba cabe na tela: só exibe por um tempo
      await tvWait(CONFIG.TV_DWELL_STATIC);                      if (id !== tvRun) return;
    }

    switchTab((currentTab + 1) % 3, true);
  }
}

function toggleTV(force) {
  tvOn = typeof force === 'boolean' ? force : !tvOn;
  tvRun++; // cancela qualquer ciclo em andamento
  const btn = document.getElementById('tvBtn');
  btn.classList.toggle('on', tvOn);
  btn.textContent = tvOn ? '📺 Modo TV: ligado' : '📺 Modo TV';
  if (tvOn) tvLoop(tvRun);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  TIMER — Sincronizado com múltiplos de 5 min no relógio  ║
// ║  Ex: se o evento começa às 08:00, atualiza 08:05, 08:10…║
// ╚══════════════════════════════════════════════════════════╝

function updateTimer() {
  const now = new Date();
  const min = now.getMinutes();
  const sec = now.getSeconds();
  // Quanto já passou dentro do ciclo de 5 min atual
  const elapsed = (min % 5) * 60 + sec;
  // Quanto falta para o próximo :00, :05, :10, :15…
  const remaining = Math.max(0, 5 * 60 - elapsed);
  const remMin = Math.floor(remaining / 60);
  const remSec = remaining % 60;
  const display = (remMin < 10 ? '0' : '') + remMin + ':' + (remSec < 10 ? '0' : '') + remSec;

  const el = document.getElementById('timer');
  el.textContent = display;

  if (remMin >= 3) el.style.color = '#22C55E';         // verde: 5-3 min
  else if (remMin >= 1) el.style.color = '#FBBF24';     // amarelo: 3-1 min
  else el.style.color = '#EF4444';                       // vermelho: <1 min
}
setInterval(updateTimer, 1000);
updateTimer();

// ╔══════════════════════════════════════════════════════════╗
// ║  FETCH & REFRESH                                          ║
// ╚══════════════════════════════════════════════════════════╝
async function fetchData() {
  let raw;
  if (CONFIG.DATA_URL) {
    try {
      const res = await fetch(CONFIG.DATA_URL, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });
      const api = await res.json();
      // API retorna conteúdo em base64; decodifica com suporte a UTF-8
      const bin = atob(api.content.replace(/\n/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      raw = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      return null;
    }
  } else {
    raw = getSampleData();
  }
  return processData(raw);
}

async function refresh() {
  const data = await fetchData();
  if (!data) return;

  renderClassificacao(data);
  renderPontuacao(data);
  renderWorkshop(data);
}

// Carga inicial
refresh();

// Agenda o reload no próximo múltiplo de 5 min do relógio
// Ex: se agora são 08:03, o próximo reload é 08:05, depois 08:10…
function scheduleNextRefresh() {
  const now = new Date();
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const elapsed = (min % 5) * 60 + sec;
  const msUntilNext = (5 * 60 - elapsed) * 1000 + 2000; // +2s de margem
  setTimeout(() => location.reload(), msUntilNext);
}
scheduleNextRefresh();

// Dica: abrir a página com ?tv=1 no endereço já liga o Modo TV (útil na TV)
if (new URLSearchParams(location.search).get('tv') === '1') toggleTV(true);
