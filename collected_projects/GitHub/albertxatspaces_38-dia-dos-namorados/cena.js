// Dia dos Namorados. Cada chave é uma versão publicada no GitHub Pages.
// Molde dos xatspaces de datas comemorativas: uma cena em SVG (1100×680) recortada
// numa forma ondulada, no meio da página, e a estrelinha de sempre no canto.
// Cada tema (temas.js) só informa as cores e desenha a cena com os ajudantes daqui.

const W = 1100, H = 680;

const FORMA = "M 60 250 C 30 200 80 150 150 120 C 230 85 260 60 330 55 C 420 50 480 20 560 22 " +
  "C 650 25 700 55 780 30 C 860 5 960 20 1010 70 C 1060 120 1050 180 1040 240 C 1030 320 1075 380 1065 460 " +
  "C 1055 540 1080 600 1040 640 C 990 670 900 650 820 660 C 700 675 600 655 500 665 C 380 678 260 650 160 668 " +
  "C 90 680 40 650 45 580 C 50 500 90 450 70 380 C 55 330 85 290 60 250 Z";

// sorteio com semente: a cena sai sempre igual
function sorteio(semente) {
  return () => {
    semente = semente + 0x6D2B79F5 | 0;
    let t = Math.imul(semente ^ semente >>> 15, 1 | semente);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const f = n => +n.toFixed(1);
let _id = 0;
const novoId = p => p + (++_id);

function montaCena(tema) {
  const paradas = tema.ceu.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");
  return `<defs>
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">${paradas}</linearGradient>
    <clipPath id="forma"><path d="${FORMA}"/></clipPath>
    <filter id="brilho" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="brilhoForte" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="desfoque"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <g clip-path="url(#forma)"><rect width="${W}" height="${H}" fill="url(#ceu)"/>${tema.cena()}</g>`;
}

/* ---------- céu ---------- */

function estrelas(semente, n, x0, y0, x1, y1, cor = "#fff") {
  const r = sorteio(semente);
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    if (r() < .12) s += brilhinho(x, y, 5 + r() * 5, cor, .9);
    else s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.7 + r() * 1.5)}" fill="${cor}" opacity="${f(.4 + r() * .6)}"/>`;
  }
  return s;
}

// estrelinha de 4 pontas
function brilhinho(x, y, t, cor = "#fff", op = 1) {
  const p = t * .22;
  return `<path d="M${f(x)} ${f(y - t)} Q${f(x + p)} ${f(y - p)} ${f(x + t)} ${f(y)} Q${f(x + p)} ${f(y + p)} ${f(x)} ${f(y + t)} Q${f(x - p)} ${f(y + p)} ${f(x - t)} ${f(y)} Q${f(x - p)} ${f(y - p)} ${f(x)} ${f(y - t)}Z" fill="${cor}" opacity="${op}"/>`;
}

function nuvem(x, y, s, cor, op = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${cor}" opacity="${op}">
    <path d="M-48 0 Q-50 -14 -34 -14 Q-30 -30 -12 -28 Q-2 -44 18 -36 Q34 -32 34 -18 Q50 -18 52 0 Z"/></g>`;
}

function lua(x, y, raio, { cor = "#fbf3c4", sombra = "#e2d68e", halo = "#fff7c8", crateras = true } = {}) {
  const id = novoId("lua");
  let c = "";
  if (crateras) c = [[-.35, -.2, .22], [.25, .3, .16], [.3, -.35, .12], [-.2, .45, .1], [.05, -.02, .09]]
    .map(([a, b, k]) => `<circle cx="${f(x + a * raio)}" cy="${f(y + b * raio)}" r="${f(k * raio)}" fill="${sombra}" opacity=".55"/>`).join("");
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${halo}" stop-opacity=".7"/><stop offset=".35" stop-color="${halo}" stop-opacity=".25"/><stop offset="1" stop-color="${halo}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${x}" cy="${y}" r="${raio * 3.2}" fill="url(#${id})"/>
    <circle cx="${x}" cy="${y}" r="${raio}" fill="${cor}"/>${c}`;
}

/* ---------- árvores ---------- */

// galhos recursivos; devolve o desenho e as pontas (para pôr folhas, corações…)
function arvore(x, y, { tam = 120, larg = 22, nivel = 6, cor = "#1f1233", semente = 1, torto = .35, abre = .5, ang = -Math.PI / 2 } = {}) {
  const r = sorteio(semente);
  const pontas = [];
  let s = "";
  const galho = (x, y, ang, len, w, n) => {
    const curva = (r() - .5) * len * torto;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const mx = (x + x2) / 2 - Math.sin(ang) * curva, my = (y + y2) / 2 + Math.cos(ang) * curva;
    s += `<path d="M${f(x)} ${f(y)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" stroke-width="${f(Math.max(w, 1.2))}"/>`;
    if (n === 0) { pontas.push([x2, y2]); return; }
    const filhos = n >= nivel - 1 ? 2 : (r() < .45 ? 3 : 2);
    for (let i = 0; i < filhos; i++) {
      const lado = filhos === 2 ? (i ? 1 : -1) : i - 1;
      const a = ang + lado * (abre * .55 + r() * abre * .6) + (r() - .5) * .25;
      galho(x2, y2, a, len * (.66 + r() * .14), w * .64, n - 1);
    }
  };
  galho(x, y, ang, tam, larg, nivel);
  const raiz = `<path d="M${f(x - larg * 1.6)} ${y + 2} Q${f(x - larg * .4)} ${y - 4} ${f(x - larg * .45)} ${f(y - tam * .35)} L${f(x + larg * .45)} ${f(y - tam * .35)} Q${f(x + larg * .4)} ${y - 4} ${f(x + larg * 1.7)} ${y + 2} Z" fill="${cor}"/>`;
  return { svg: `<g fill="none" stroke="${cor}" stroke-linecap="round">${s}</g>${raiz}`, pontas };
}

function pinheiro(x, y, h, cor, neve) {
  const tiers = [[0, .55, .34], [.28, .8, .26], [.52, 1, .18]];
  let s = `<rect x="${f(x - h * .04)}" y="${f(y - h * .08)}" width="${f(h * .08)}" height="${f(h * .1)}" fill="${cor}"/>`;
  for (const [b, t, l] of tiers) {
    const yb = y - h * b - h * .05, yt = y - h * t, hw = h * l;
    s += `<path d="M${f(x - hw)} ${f(yb)} Q${f(x)} ${f(yb + hw * .18)} ${f(x + hw)} ${f(yb)} L${f(x)} ${f(yt)} Z" fill="${cor}"/>`;
    if (neve) {
      const k = .42, yk = yt + (yb - yt) * k, wk = hw * k;
      s += `<path d="M${f(x)} ${f(yt)} L${f(x + wk)} ${f(yk)} Q${f(x + wk * .5)} ${f(yk - 5)} ${f(x + wk * .2)} ${f(yk + 3)} Q${f(x - wk * .2)} ${f(yk - 6)} ${f(x - wk * .5)} ${f(yk + 2)} Q${f(x - wk * .8)} ${f(yk - 4)} ${f(x - wk)} ${f(yk)} Z" fill="${neve}"/>`;
    }
  }
  return s;
}

/* ---------- formas ---------- */

function coracao(x, y, s, cor, rot = 0, extra = "") {
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})" d="M0 30 C-40 4 -52 -26 -27 -38 C-12 -45 0 -35 0 -24 C0 -35 12 -45 27 -38 C52 -26 40 4 0 30 Z" fill="${cor}" ${extra}/>`;
}

function morcego(x, y, s, rot = 0, cor = "#1c0f2e") {
  return `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${cor}" d="M0 -6 C2 -10 4 -13 5 -17 L7 -10 C14 -15 25 -21 39 -18 C47 -16 53 -11 55 -6 C47 -9 42 -5 40 -1 C34 -5 28 -3 26 3 C20 -1 14 1 10 7 C6 4 3 8 0 14 C-3 8 -6 4 -10 7 C-14 1 -20 -1 -26 3 C-28 -3 -34 -5 -40 -1 C-42 -5 -47 -9 -55 -6 C-53 -11 -47 -16 -39 -18 C-25 -21 -14 -15 -7 -10 L-5 -17 C-4 -13 -2 -10 0 -6 Z"/>`;
}

function confetes(semente, n, x0, y0, x1, y1, cores) {
  const r = sorteio(semente);
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), c = cores[Math.floor(r() * cores.length)];
    if (r() < .35) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.5 + r() * 3)}" fill="${c}"/>`;
    else s += `<rect x="${f(x)}" y="${f(y)}" width="${f(6 + r() * 7)}" height="${f(3 + r() * 3)}" rx="1" fill="${c}" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})"/>`;
  }
  return s;
}

// fita encaracolada (serpentina): uma linha que anda e dá voltinhas
function serpentina(x0, y0, x1, y1, voltas, raio, cor, larg = 4) {
  const pts = [];
  for (let i = 0; i <= voltas * 24; i++) {
    const t = i / (voltas * 24), a = t * voltas * Math.PI * 2;
    pts.push([x0 + (x1 - x0) * t + Math.cos(a) * raio, y0 + (y1 - y0) * t + Math.sin(a) * raio]);
  }
  return `<polyline points="${pts.map(p => f(p[0]) + "," + f(p[1])).join(" ")}" fill="none" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// fogos: raios saindo do centro, com pontinhas
function fogos(x, y, raio, cor, semente, n = 28) {
  const r = sorteio(semente);
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * .1, k = .75 + r() * .3;
    const a1 = raio * .28, a2 = raio * k;
    const cx = Math.cos(a), cy = Math.sin(a);
    s += `<line x1="${f(x + cx * a1)}" y1="${f(y + cy * a1)}" x2="${f(x + cx * a2)}" y2="${f(y + cy * a2 + raio * .08 * k)}" stroke-width="2.2"/>`;
    s += `<circle cx="${f(x + cx * (a2 + 6))}" cy="${f(y + cy * (a2 + 6) + raio * .1)}" r="2.6" fill="${cor}" stroke="none"/>`;
  }
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    s += `<circle cx="${f(x + Math.cos(a) * raio * .18)}" cy="${f(y + Math.sin(a) * raio * .18)}" r="1.8" fill="#fff" stroke="none"/>`;
  }
  return `<g stroke="${cor}" stroke-linecap="round" filter="url(#brilho)">${s}</g>`;
}

// janela iluminada com arco em cima (x = centro, y = topo)
function janela(x, y, w, h, { arco = true, cruz = true, cor = "#ffb23f", grade = "#24163a" } = {}) {
  const l = x - w / 2, rr = x + w / 2, topo = arco ? `L${f(l)} ${f(y + w / 2)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(rr)} ${f(y + w / 2)}` : `L${f(l)} ${f(y)} L${f(rr)} ${f(y)}`;
  let s = `<path d="M${f(l)} ${f(y + h)} ${topo} L${f(rr)} ${f(y + h)} Z" fill="${cor}" filter="url(#brilho)"/>`;
  if (cruz) s += `<path d="M${f(x)} ${f(y + 2)} V${f(y + h)} M${f(l)} ${f(y + h * .55)} H${f(rr)}" stroke="${grade}" stroke-width="${f(Math.max(2, w * .09))}"/>`;
  return s;
}

// As datas comemorativas. Cada tema: pasta das imagens, cores da página e do céu, e a cena.
// Área da cena: 1100×680 (os ajudantes estão em base.js).

/* ---------- peças de cada tema ---------- */

function casaAssombrada(x, y, s, cor = "#211433") {
  const p = pts => `<polygon points="${pts}" fill="${cor}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${p("-150,0 -148,-80 -92,-82 -92,0")}${p("-168,-74 -124,-128 -82,-80")}
    ${p("94,0 97,-222 139,-226 141,0")}${p("86,-214 120,-310 152,-220")}
    ${p("-96,0 -88,-152 94,-146 97,0")}${p("-118,-140 -4,-218 116,-146")}
    ${p("-72,-150 -62,-262 62,-256 74,-150")}${p("-98,-250 -8,-316 88,-256")}
    ${p("-58,-268 -58,-306 -38,-306 -38,-282")}
    ${p("-42,-300 -36,-372 34,-378 30,-300")}${p("-62,-366 14,-478 56,-372")}
    <path d="M-200 0 V-34 M-185 0 V-38 M-170 0 V-34 M-205 -24 H-150" stroke="${cor}" stroke-width="6"/>
    ${janela(-52, -112, 38, 82)}${janela(32, -112, 38, 82)}
    ${janela(-122, -58, 24, 34, { arco: false })}${janela(118, -168, 20, 30)}
    <circle cx="4" cy="-206" r="17" fill="#ffb23f" filter="url(#brilho)"/><path d="M4 -223 V-189 M-13 -206 H21" stroke="${cor}" stroke-width="3"/>
    ${janela(-32, -236, 24, 30, { arco: false })}
    ${janela(-2, -352, 26, 40)}
  </g>`;
}

function abobora(x, y, s) {
  const id = novoId("ab");
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <defs><radialGradient id="${id}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffe08a"/><stop offset=".6" stop-color="#ffa53a"/><stop offset="1" stop-color="#ff7a1a"/></radialGradient></defs>
    <path d="M-6 -44 C-7 -58 2 -68 13 -70 L15 -63 C7 -60 6 -52 7 -44 Z" fill="#2f1d22"/>
    <g fill="#2a1840" stroke="#402a5e" stroke-width="3">
      <ellipse cx="-28" cy="0" rx="36" ry="44"/><ellipse cx="28" cy="0" rx="36" ry="44"/><ellipse cx="0" cy="0" rx="34" ry="47"/>
    </g>
    <g fill="url(#${id})" filter="url(#brilho)">
      <path d="M-34 -10 L-10 -6 L-24 -26 Z"/><path d="M34 -10 L10 -6 L24 -26 Z"/><path d="M-4 0 L4 0 L0 9 Z"/>
      <path d="M-36 12 Q0 26 36 12 Q30 36 0 38 Q-30 36 -36 12 Z"/>
    </g>
    <path d="M-16 18 v8 h8 v-6 M8 20 v6 h8 v-8" fill="#2a1840"/>
  </g>`;
}

function teia(x, y, s, rot, cor = "#1e1033") {
  const raios = [0, 22.5, 45, 67.5, 90].map(a => a * Math.PI / 180);
  let d = raios.map(a => `M0 0 L${f(Math.cos(a) * 200)} ${f(Math.sin(a) * 200)}`).join(" ");
  for (const R of [36, 66, 98, 132, 168]) for (let i = 0; i < raios.length - 1; i++) {
    const a = raios[i], b = raios[i + 1], m = (a + b) / 2;
    d += ` M${f(Math.cos(a) * R)} ${f(Math.sin(a) * R)} Q${f(Math.cos(m) * R * .8)} ${f(Math.sin(m) * R * .8)} ${f(Math.cos(b) * R)} ${f(Math.sin(b) * R)}`;
  }
  return `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="${d}" fill="none" stroke="${cor}" stroke-width="2.6" stroke-linecap="round"/>`;
}

function lapide(x, y, s, cor) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M-16 0 V-32 A16 16 0 0 1 16 -32 V0 Z" fill="${cor}"/>`;
}

function estrela5(x, y, R, cor, extra = "") {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .45 : R;
    d += (i ? "L" : "M") + f(x + Math.cos(a) * r) + " " + f(y + Math.sin(a) * r);
  }
  return `<path d="${d}Z" fill="${cor}" ${extra}/>`;
}

function arvoreNatal(x, y, h) {
  const r = sorteio(12);
  const cores = ["#ff4d5e", "#ffd34d", "#4dc3ff", "#ff8ad8", "#ffffff", "#ff9a3c"];
  let s = `<rect x="${x - 14}" y="${y - h * .1}" width="28" height="${h * .12}" fill="#5b3420"/>`;
  let enfeites = "";
  for (let i = 0; i < 4; i++) {
    const yb = y - h * .08 - h * i * .2, yt = yb - h * .36, hw = h * (.36 - i * .07);
    s += `<path d="M${f(x - hw)} ${f(yb)} Q${f(x)} ${f(yb + hw * .22)} ${f(x + hw)} ${f(yb)} L${f(x)} ${f(yt)} Z" fill="#1f7a4a"/>`;
    s += `<path d="M${f(x)} ${f(yt)} L${f(x + hw)} ${f(yb)} Q${f(x + hw * .5)} ${f(yb + hw * .16)} ${f(x)} ${f(yb + hw * .22)} Z" fill="#17603a"/>`;
    s += `<path d="M${f(x - hw * .72)} ${f(yb - h * .05)} Q${f(x)} ${f(yb + h * .02)} ${f(x + hw * .62)} ${f(yb - h * .16)}" fill="none" stroke="#ffd66b" stroke-width="3.5" stroke-linecap="round"/>`;
    for (let k = 0; k < 6; k++) {
      const yy = yt + 22 + r() * (yb - yt - 26), lim = hw * (yy - yt) / (yb - yt) * .82;
      enfeites += `<circle cx="${f(x + (r() * 2 - 1) * lim)}" cy="${f(yy)}" r="${f(5 + r() * 3)}" fill="${cores[(i * 6 + k) % cores.length]}" filter="url(#brilho)"/>`;
    }
  }
  return s + enfeites + estrela5(x, y - h * .98, 26, "#ffd84a", `filter="url(#brilhoForte)"`);
}

function bonecoDeNeve(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-30 -120 L-78 -150 M-62 -140 L-70 -160 M30 -120 L76 -146 M60 -136 L72 -154" stroke="#5b3420" stroke-width="5" stroke-linecap="round"/>
    <circle cx="0" cy="-48" r="50" fill="#fbfdff"/><circle cx="0" cy="-122" r="36" fill="#fbfdff"/><circle cx="0" cy="-180" r="27" fill="#fbfdff"/>
    <path d="M18 -86 A50 50 0 0 1 14 -2 A50 50 0 0 0 18 -86 Z M20 -150 A36 36 0 0 1 22 -94 A40 40 0 0 0 20 -150 Z" fill="#dbe6f5"/>
    <path d="M-28 -150 Q0 -138 28 -150 L28 -140 Q0 -128 -28 -140 Z M12 -142 L22 -100 L34 -102 L24 -144 Z" fill="#e8324a"/>
    <rect x="-30" y="-206" width="60" height="7" rx="3" fill="#1d2233"/><rect x="-20" y="-240" width="40" height="36" rx="3" fill="#1d2233"/><rect x="-20" y="-216" width="40" height="7" fill="#e8324a"/>
    <circle cx="-9" cy="-184" r="3.5" fill="#1d2233"/><circle cx="9" cy="-184" r="3.5" fill="#1d2233"/>
    <path d="M0 -178 L26 -172 L0 -170 Z" fill="#ff8a2a"/>
    <circle cx="0" cy="-122" r="4" fill="#1d2233"/><circle cx="0" cy="-104" r="4" fill="#1d2233"/><circle cx="0" cy="-62" r="4.5" fill="#1d2233"/><circle cx="0" cy="-40" r="4.5" fill="#1d2233"/>
  </g>`;
}

function casinhaNeve(x, y, s, parede, telhado) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="22" y="-96" width="14" height="30" fill="${telhado}"/><rect x="20" y="-100" width="18" height="6" rx="3" fill="#fff"/>
    <rect x="-45" y="-58" width="90" height="58" fill="${parede}"/>
    <path d="M-56 -54 L0 -94 L56 -54 Z" fill="${telhado}"/>
    <path d="M-60 -52 Q-58 -60 -50 -60 L0 -98 L50 -60 Q58 -60 60 -52 Q48 -56 40 -50 Q30 -58 20 -52 Q0 -60 -14 -52 Q-30 -60 -40 -52 Q-50 -58 -60 -52 Z" fill="#fff"/>
    <rect x="-34" y="-42" width="22" height="20" fill="#ffc861" filter="url(#brilho)"/><path d="M-23 -42 V-22 M-34 -32 H-12" stroke="${parede}" stroke-width="2.5"/>
    <rect x="10" y="-36" width="22" height="36" rx="2" fill="#6b3b22"/><circle cx="27" cy="-18" r="2" fill="#ffd66b"/>
  </g>`;
}

function presente(x, y, w, h, cor, fita) {
  return `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="3" fill="${cor}"/>
    <rect x="${x - 4}" y="${y - h}" width="8" height="${h}" fill="${fita}"/><rect x="${x - w / 2}" y="${y - h * .62}" width="${w}" height="7" fill="${fita}"/>
    <path d="M${x} ${y - h} C${x - 18} ${y - h - 18} ${x - 22} ${y - h - 2} ${x} ${y - h} C${x + 18} ${y - h - 18} ${x + 22} ${y - h - 2} ${x} ${y - h} Z" fill="none" stroke="${fita}" stroke-width="4"/>`;
}

function taca(x, y, s, rot) {
  const id = novoId("champ");
  const bolhas = [[-4, -128], [5, -116], [-2, -104], [4, -136], [0, -96]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.8" fill="#fff8d8"/>`).join("");
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset="1" stop-color="#f2b33d"/></linearGradient></defs>
    <path d="M-15 -142 L15 -142 C15 -116 11 -98 3 -89 L-3 -89 C-11 -98 -15 -116 -15 -142 Z" fill="url(#${id})" opacity=".95"/>${bolhas}
    <path d="M-17 -175 L17 -175 C17 -122 12 -96 3 -86 L3 -18 L24 -6 Q0 0 -24 -6 L-3 -18 L-3 -86 C-12 -96 -17 -122 -17 -175 Z" fill="#ffffff" fill-opacity=".1" stroke="#ffffff" stroke-opacity=".85" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-11 -168 C-11 -130 -8 -110 -3 -100" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`;
}

function predios(semente, x0, x1, base, cor) {
  const r = sorteio(semente);
  let s = "", luzes = "";
  for (let x = x0; x < x1;) {
    const w = 26 + r() * 34, h = 30 + r() * 95;
    s += `<rect x="${f(x)}" y="${f(base - h)}" width="${f(w + 1)}" height="${f(h + 2)}" fill="${cor}"/>`;
    for (let yy = base - h + 8; yy < base - 6; yy += 10) for (let xx = x + 5; xx < x + w - 6; xx += 8)
      if (r() < .3) luzes += `<rect x="${f(xx)}" y="${f(yy)}" width="3.5" height="4.5" fill="#ffd77a" opacity="${f(.5 + r() * .5)}"/>`;
    x += w;
  }
  return s + luzes;
}

function pena(x, y, L, ang, cor) {
  const w = L * .2;
  return `<g transform="translate(${x} ${y}) rotate(${ang})">
    <path d="M0 0 C${f(w * 1.3)} ${f(-L * .3)} ${f(w * 1.2)} ${f(-L * .78)} 0 ${-L} C${f(-w * 1.2)} ${f(-L * .78)} ${f(-w * 1.3)} ${f(-L * .3)} 0 0 Z" fill="${cor}"/>
    <path d="M0 0 L0 ${f(-L * .95)}" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
  </g>`;
}

function mascara(x, y, s) {
  const id = novoId("masc");
  const brilhos = [-120, -96, -70, 70, 96, 120].map((a, i) => `<circle cx="${a}" cy="${-40 + Math.abs(a) * .12 - 18 + (i % 3) * 2}" r="4" fill="#fff6c2"/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a2be2"/><stop offset=".55" stop-color="#d21f8c"/><stop offset="1" stop-color="#ff4f6a"/></linearGradient></defs>
    <path d="M-118 40 L-170 150" stroke="#ffd166" stroke-width="10" stroke-linecap="round"/>
    ${pena(118, -40, 170, -8, "#2ec4b6")}${pena(124, -36, 150, 20, "#ffbe0b")}${pena(110, -44, 140, -34, "#3a86ff")}${pena(130, -30, 120, 44, "#ff006e")}${pena(100, -46, 110, -56, "#8ac926")}
    <path fill-rule="evenodd" fill="url(#${id})" stroke="#ffd166" stroke-width="6" stroke-linejoin="round"
      d="M-150 -20 C-140 -72 -60 -82 0 -50 C60 -82 140 -72 150 -20 C155 30 110 70 60 60 C30 55 15 35 0 35 C-15 35 -30 55 -60 60 C-110 70 -155 30 -150 -20 Z
         M-106 -12 C-96 -40 -50 -40 -34 -8 C-50 12 -96 12 -106 -12 Z M106 -12 C96 -40 50 -40 34 -8 C50 12 96 12 106 -12 Z"/>
    <path d="M-106 -12 C-96 -40 -50 -40 -34 -8 M106 -12 C96 -40 50 -40 34 -8" fill="none" stroke="#ffd166" stroke-width="4"/>
    ${brilhos}${estrela5(0, -8, 12, "#ffd166")}
  </g>`;
}

function casario(semente, base) {
  const r = sorteio(semente);
  const cores = ["#2ec4b6", "#ff9f1c", "#e71d73", "#8338ec", "#ffbe0b", "#3a86ff", "#06d6a0", "#f15bb5"];
  let s = "", x = -10, i = 0;
  while (x < 1110) {
    const w = 96 + r() * 40, h = 150 + r() * 70, c = cores[(i + 3) % cores.length], topo = base - h;
    s += `<rect x="${f(x)}" y="${f(topo)}" width="${f(w + 1)}" height="${f(h)}" fill="${c}"/>`;
    s += r() < .45
      ? `<path d="M${f(x - 4)} ${f(topo + 2)} L${f(x + w / 2)} ${f(topo - 30)} L${f(x + w + 4)} ${f(topo + 2)} Z" fill="${c}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>`
      : `<rect x="${f(x - 4)}" y="${f(topo - 10)}" width="${f(w + 8)}" height="14" fill="#fff"/>`;
    for (const yy of [topo + 26, topo + 92]) for (const xx of [x + w * .28, x + w * .72]) {
      s += `<rect x="${f(xx - 12)}" y="${f(yy)}" width="24" height="40" rx="12" fill="#2b2d5c" stroke="#fff" stroke-width="4"/>`;
    }
    s += `<path d="M${f(x + 8)} ${f(topo + 70)} H${f(x + w - 8)}" stroke="#fff" stroke-width="4"/>`;
    x += w; i++;
  }
  return s;
}

function ovo(x, y, s, rot, base, enfeite, padrao) {
  const id = novoId("ovo");
  const d = "M0 -50 C28 -50 40 -5 40 15 C40 40 22 52 0 52 C-22 52 -40 40 -40 15 C-40 -5 -28 -50 0 -50 Z";
  let p = "";
  if (padrao === "zigue") p = `<path d="M-45 0 L-35 -12 L-25 0 L-15 -12 L-5 0 L5 -12 L15 0 L25 -12 L35 0 L45 -12 V8 L35 20 L25 8 L15 20 L5 8 L-5 20 L-15 8 L-25 20 L-35 8 L-45 20 Z" fill="${enfeite}"/>`;
  if (padrao === "bolinhas") p = [[-16, -22], [12, -30], [20, 4], [-22, 12], [0, -6], [4, 32], [-12, 34], [28, 26]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="7" fill="${enfeite}"/>`).join("");
  if (padrao === "listras") p = `<path d="M-45 -24 Q0 -14 45 -24 V-14 Q0 -4 -45 -14 Z M-45 10 Q0 20 45 10 V22 Q0 32 -45 22 Z" fill="${enfeite}"/><path d="M-45 -2 H45" stroke="#fff" stroke-width="4" stroke-dasharray="4 7"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
    <path d="${d}" fill="${base}"/><g clip-path="url(#${id})">${p}<ellipse cx="22" cy="10" rx="20" ry="48" fill="#000" opacity=".07"/></g>
    <ellipse cx="-16" cy="-24" rx="7" ry="13" fill="#fff" opacity=".45" transform="rotate(20 -16 -24)"/>
  </g>`;
}

function coelho(x, y, s) {
  const formas = `<ellipse cx="-15" cy="-6" rx="38" ry="10"/><ellipse cx="-15" cy="-45" rx="55" ry="45"/><ellipse cx="15" cy="-62" rx="44" ry="54"/>
    <ellipse cx="22" cy="-188" rx="12" ry="44" transform="rotate(-20 22 -188)"/><ellipse cx="46" cy="-194" rx="13" ry="46" transform="rotate(-4 46 -194)"/>
    <ellipse cx="50" cy="-126" rx="37" ry="33"/><ellipse cx="80" cy="-116" rx="17" ry="15"/><ellipse cx="50" cy="-8" rx="21" ry="9"/><circle cx="-72" cy="-40" r="16"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <g fill="#d9c3ad" stroke="#d9c3ad" stroke-width="7">${formas}</g>
    <g fill="#fffaf3">${formas}</g>
    <ellipse cx="46" cy="-190" rx="6" ry="32" transform="rotate(-4 46 -190)" fill="#f8bfd0"/>
    <path d="M-38 -14 Q-8 -40 -18 -86" fill="none" stroke="#ead8c5" stroke-width="4" stroke-linecap="round"/>
    <circle cx="62" cy="-133" r="5" fill="#3a2a2a"/><circle cx="64" cy="-135" r="1.6" fill="#fff"/>
    <ellipse cx="95" cy="-120" rx="5" ry="4" fill="#f28fae"/><circle cx="68" cy="-112" r="8" fill="#f8bfd0" opacity=".6"/>
  </g>`;
}

function cesta(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-62 -40 C-62 -130 62 -130 62 -40" fill="none" stroke="#b47a43" stroke-width="10"/>
    ${ovo(-30, -52, .55, -15, "#ffcf5c", "#ff7aa8", "zigue")}${ovo(2, -60, .6, 4, "#9ad8ff", "#ffffff", "bolinhas")}${ovo(32, -50, .55, 18, "#c7a6ff", "#ffe066", "listras")}
    <path d="M-72 -42 H72 L60 0 Q0 10 -60 0 Z" fill="#c98b4f"/>
    <path d="M-68 -28 H68 M-64 -14 H64 M-48 -42 L-44 2 M-24 -42 L-22 4 M0 -42 V5 M24 -42 L22 4 M48 -42 L44 2" stroke="#a86f3a" stroke-width="3"/>
    <rect x="-76" y="-48" width="152" height="12" rx="6" fill="#b47a43"/>
  </g>`;
}

function flor(x, y, s, cor) {
  const p = [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-9" rx="6" ry="9" transform="rotate(${a})" fill="${cor}"/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V26" stroke="#4f9e45" stroke-width="3"/>${p}<circle r="5" fill="#ffd23f"/></g>`;
}

function tulipa(x, y, s, cor) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 Q-4 30 0 60" fill="none" stroke="#4f9e45" stroke-width="4"/><path d="M0 50 Q-24 30 -20 14 Q-6 30 0 50 Z" fill="#5fb34f"/>
    <path d="M-14 -22 Q-16 0 0 2 Q16 0 14 -22 L8 -12 L0 -26 L-8 -12 Z" fill="${cor}"/>
  </g>`;
}

function borboleta(x, y, s, cor, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${cor}">
    <ellipse cx="-11" cy="-8" rx="12" ry="9" transform="rotate(-30 -11 -8)"/><ellipse cx="11" cy="-8" rx="12" ry="9" transform="rotate(30 11 -8)"/>
    <ellipse cx="-8" cy="7" rx="8" ry="6" transform="rotate(25 -8 7)"/><ellipse cx="8" cy="7" rx="8" ry="6" transform="rotate(-25 8 7)"/>
    <ellipse rx="2.5" ry="11" fill="#5a3b2a"/>
  </g>`;
}

function banco(x, y, s, cor) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${cor}">
    <rect x="-70" y="-46" width="140" height="8" rx="2"/><rect x="-70" y="-64" width="140" height="7" rx="2"/><rect x="-70" y="-80" width="140" height="7" rx="2"/>
    <rect x="-62" y="-82" width="6" height="82"/><rect x="56" y="-82" width="6" height="82"/><rect x="-40" y="-42" width="5" height="42"/><rect x="35" y="-42" width="5" height="42"/>
  </g>`;
}

function balaoCoracao(x, y, s, cor, ax, ay) {
  return `<path d="M${x} ${y + 30 * s} C${x - 30} ${f((y + ay) / 2)} ${ax + 20} ${f((y + ay) / 2 + 40)} ${ax} ${ay}" fill="none" stroke="#2b0a22" stroke-width="1.6"/>
    ${coracao(x, y, s, cor)}<ellipse cx="${f(x - 18 * s)}" cy="${f(y - 20 * s)}" rx="${f(7 * s)}" ry="${f(11 * s)}" fill="#fff" opacity=".4" transform="rotate(-30 ${f(x - 18 * s)} ${f(y - 20 * s)})"/>`;
}

function varal(ax, ay, bx, by, cair, semente) {
  const r = sorteio(semente);
  const cores = ["#e63946", "#ffd23f", "#3a86ff", "#06d6a0", "#ff8c42", "#f15bb5", "#ffffff"];
  const cx = (ax + bx) / 2, cy = (ay + by) / 2 + cair * 2;
  const P = t => [(1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by];
  const n = Math.round(Math.hypot(bx - ax, by - ay) / 36);
  let s = `<path d="M${ax} ${ay} Q${f(cx)} ${f(cy)} ${bx} ${by}" fill="none" stroke="#f3e6c8" stroke-width="1.8"/>`;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = P((i + .12) / n), [x2, y2] = P((i + .88) / n), c = cores[(i + Math.floor(r() * 2)) % cores.length];
    s += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f((x1 + x2) / 2)} ${f((y1 + y2) / 2 + 34)} Z" fill="${c}"/>`;
    if (r() < .3) s += `<circle cx="${f((x1 + x2) / 2)}" cy="${f((y1 + y2) / 2 + 10)}" r="3" fill="${c === "#ffffff" ? "#e63946" : "#fff"}"/>`;
  }
  return s;
}

function balaoJunino(x, y, s, cores) {
  const id = novoId("bj");
  const d = "M0 -60 C25 -60 40 -30 38 0 C36 25 18 45 8 55 L-8 55 C-18 45 -36 25 -38 0 C-40 -30 -25 -60 0 -60 Z";
  const faixas = cores.map((c, i) => `<rect x="-45" y="${-62 + i * 20}" width="90" height="20" fill="${c}"/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <defs><clipPath id="${id}"><path d="${d}"/></clipPath><radialGradient id="${id}l" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="#fff3c4" stop-opacity=".7"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>
    <g clip-path="url(#${id})">${faixas}<rect x="-45" y="-62" width="90" height="120" fill="url(#${id}l)"/></g>
    <rect x="-9" y="54" width="18" height="5" fill="#6b4a2a"/>
    <path d="M0 62 Q6 70 0 80 Q-6 70 0 62 Z" fill="#ffcf4a" filter="url(#brilho)"/>
  </g>`;
}

function capelinha(x, y, s, cor) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${cor}">
    <rect x="-60" y="-90" width="120" height="90"/><path d="M-72 -86 L0 -140 L72 -86 Z"/>
    <rect x="-22" y="-200" width="44" height="80"/><path d="M-28 -196 L0 -232 L28 -196 Z"/>
    <path d="M0 -232 V-262 M-11 -250 H11" stroke="${cor}" stroke-width="5"/>
    ${janela(0, -186, 18, 26, { cruz: false, grade: cor })}
    <path d="M-16 0 V-40 A16 16 0 0 1 16 -40 V0 Z" fill="#ffb347" filter="url(#brilho)"/>
    <circle cx="0" cy="-110" r="11" fill="#ffd27a" filter="url(#brilho)"/>
    ${janela(-38, -64, 16, 28, { cruz: false, grade: cor })}${janela(38, -64, 16, 28, { cruz: false, grade: cor })}
  </g>`;
}

function milho(x, y, h, cor, semente) {
  const r = sorteio(semente);
  let s = `<path d="M${x} ${y} Q${x + 8} ${y - h * .5} ${x + 4} ${y - h}" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) {
    const sy = y - h * (.15 + i * .14), sx = x + 5, dir = i % 2 ? 1 : -1, L = 70 + r() * 40;
    s += `<path d="M${sx} ${f(sy)} Q${f(sx + dir * L * .5)} ${f(sy - 40)} ${f(sx + dir * L)} ${f(sy + 6)} Q${f(sx + dir * L * .5)} ${f(sy - 24)} ${sx} ${f(sy + 10)} Z" fill="${cor}"/>`;
  }
  s += `<path d="M${x + 4} ${y - h} l-12 -26 M${x + 4} ${y - h} l2 -30 M${x + 4} ${y - h} l14 -24" stroke="${cor}" stroke-width="3" stroke-linecap="round"/>`;
  s += `<ellipse cx="${x + 18}" cy="${f(y - h * .45)}" rx="9" ry="24" fill="#e9b949" transform="rotate(16 ${x + 18} ${f(y - h * .45)})"/>`;
  s += `<path d="M${x + 6} ${f(y - h * .3)} Q${x + 30} ${f(y - h * .38)} ${x + 26} ${f(y - h * .58)} Q${x + 14} ${f(y - h * .4)} ${x + 6} ${f(y - h * .38)} Z" fill="${cor}"/>`;
  return s;
}

function fogueira(x, y) {
  const r = sorteio(77);
  const lingua = (dx, w, h, lean, cor) => {
    const a = x + dx;
    return `<path d="M${f(a - w / 2)} ${y} C${f(a - w / 2)} ${f(y - h * .5)} ${f(a + lean - w * .15)} ${f(y - h * .6)} ${f(a + lean)} ${f(y - h)} C${f(a + lean + w * .2)} ${f(y - h * .55)} ${f(a + w / 2)} ${f(y - h * .45)} ${f(a + w / 2)} ${y} Z" fill="${cor}"/>`;
  };
  const tora = (ang, c = "#6b3a1f") => `<g transform="translate(${x} ${y + 6}) rotate(${ang})"><rect x="-80" y="-10" width="160" height="20" rx="10" fill="${c}"/><circle cx="72" cy="0" r="9" fill="#b0703f"/><circle cx="72" cy="0" r="4" fill="#7a4524"/></g>`;
  let faisca = "";
  for (let i = 0; i < 26; i++) faisca += `<circle cx="${f(x + (r() - .5) * 220)}" cy="${f(y - 120 - r() * 220)}" r="${f(1.2 + r() * 2.2)}" fill="${r() < .5 ? "#ffd166" : "#ff8c42"}" filter="url(#brilho)"/>`;
  return `<ellipse cx="${x}" cy="${y + 4}" rx="320" ry="70" fill="#ff8c3a" opacity=".22" filter="url(#desfoque)"/>
    <circle cx="${x}" cy="${y - 70}" r="150" fill="#ff9a3c" opacity=".22" filter="url(#desfoque)"/>
    ${tora(-18)}${tora(18, "#5e3219")}
    <g filter="url(#brilho)">
      ${lingua(-46, 60, 120, -10, "#e8412c")}${lingua(-10, 80, 190, 6, "#e8412c")}${lingua(36, 64, 140, 12, "#e8412c")}
      ${lingua(-28, 54, 110, -6, "#ff8c2a")}${lingua(4, 66, 150, 4, "#ff8c2a")}${lingua(32, 44, 100, 10, "#ff8c2a")}
      ${lingua(-10, 40, 80, -4, "#ffd54a")}${lingua(12, 40, 100, 6, "#ffd54a")}
    </g>
    ${tora(-6, "#7a4524")}${faisca}`;
}

/* ---------- os temas ---------- */

const fundoPagina = (meio, borda) => `radial-gradient(ellipse 75% 85% at 50% 42%, ${meio} 0%, ${borda} 70%)`;


// Mais duas versões de cada data: outra cena e outras cores, mesmo tema.
// Cada uma vira uma "cor" do modelo no site (cor: nome da imagem, ex.: cemiterio.jpg).

/* ---------- peças novas ---------- */

function fantasma(x, y, s, rot = 0, op = .9) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}">
    <path d="M-30 30 V-10 C-30 -48 30 -48 30 -10 V30 Q22 21 15 30 Q7 39 0 30 Q-8 21 -15 30 Q-22 39 -30 30 Z" fill="#f4f1ff"/>
    <ellipse cx="-10" cy="-10" rx="4.5" ry="6.5" fill="#22303a"/><ellipse cx="10" cy="-10" rx="4.5" ry="6.5" fill="#22303a"/>
    <ellipse cx="0" cy="5" rx="4" ry="5" fill="#22303a"/>
  </g>`;
}

function cruz(x, y, s, cor) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M-5 0 V-30 H-17 V-39 H-5 V-52 H5 V-39 H17 V-30 H5 V0 Z" fill="${cor}"/>`;
}

function grade(x0, x1, y, h, cor) {
  let s = `<path d="M${x0} ${y - h * .25} H${x1} M${x0} ${y - h * .8} H${x1}" stroke="${cor}" stroke-width="3"/>`;
  for (let x = x0; x <= x1; x += 16) s += `<path d="M${x} ${y} V${y - h} M${x - 4} ${y - h + 2} L${x} ${y - h - 9} L${x + 4} ${y - h + 2} Z" stroke="${cor}" stroke-width="3" fill="${cor}"/>`;
  return s;
}

function aboboraLaranja(x, y, s, rosto = true) {
  const id = novoId("abl");
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <defs><radialGradient id="${id}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffb04a"/><stop offset="1" stop-color="#e2620f"/></radialGradient></defs>
    <path d="M-6 -44 C-7 -58 2 -68 13 -70 L15 -63 C7 -60 6 -52 7 -44 Z" fill="#3f6b2a"/>
    <g fill="url(#${id})" stroke="#b84d0c" stroke-width="3">
      <ellipse cx="-28" cy="0" rx="36" ry="44"/><ellipse cx="28" cy="0" rx="36" ry="44"/><ellipse cx="0" cy="0" rx="34" ry="47"/>
    </g>
    ${rosto ? `<g fill="#3a1606"><path d="M-32 -10 L-10 -6 L-22 -26 Z"/><path d="M32 -10 L10 -6 L22 -26 Z"/><path d="M-34 12 Q0 26 34 12 Q28 34 0 36 Q-28 34 -34 12 Z"/></g>` : ""}
  </g>`;
}

function aranha(x, y, fio, cor) {
  return `<path d="M${x} 0 V${y}" stroke="${cor}" stroke-width="1.5"/>
    <g transform="translate(${x} ${y})" stroke="${cor}" stroke-width="2.5" fill="none" stroke-linecap="round">
      <path d="M-6 -2 Q-18 -14 -24 -4 M-6 2 Q-20 -2 -26 8 M-6 5 Q-16 10 -20 20 M6 -2 Q18 -14 24 -4 M6 2 Q20 -2 26 8 M6 5 Q16 10 20 20"/>
    </g>
    <ellipse cx="${x}" cy="${y + 3}" rx="9" ry="11" fill="${cor}"/><circle cx="${x}" cy="${y - 8}" r="6" fill="${cor}"/>`;
}

function floco(x, y, r, cor = "#fff", op = .9) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
    d += `M${f(x)} ${f(y)} L${f(x + c * r)} ${f(y + s * r)} `;
    for (const k of [.45, .7]) {
      const bx = x + c * r * k, by = y + s * r * k, l = r * .28;
      d += `M${f(bx)} ${f(by)} L${f(bx + Math.cos(a + .7) * l)} ${f(by + Math.sin(a + .7) * l)} M${f(bx)} ${f(by)} L${f(bx + Math.cos(a - .7) * l)} ${f(by + Math.sin(a - .7) * l)} `;
    }
  }
  return `<path d="${d}" stroke="${cor}" stroke-width="${f(Math.max(1.4, r * .09))}" stroke-linecap="round" opacity="${op}"/>`;
}

function aurora(cores) {
  return cores.map(([y, amp, c, op], i) => {
    let d = `M-40 ${y}`;
    for (let x = 0; x <= 1140; x += 60) d += ` Q${x + 30} ${f(y + Math.sin(x / 160 + i) * amp - amp)} ${x + 60} ${f(y + Math.sin((x + 60) / 160 + i) * amp)}`;
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="46" stroke-linecap="round" opacity="${op}" filter="url(#desfoque)"/>`;
  }).join("");
}

function palmeira(x, y, h, inclina, cor) {
  const tx = x + inclina, ty = y - h;
  let s = `<path d="M${x - 8} ${y} Q${x + inclina * .2} ${y - h * .5} ${tx - 3} ${ty} L${tx + 3} ${ty} Q${x + inclina * .2 + 10} ${y - h * .5} ${x + 8} ${y} Z" fill="${cor}"/>`;
  for (const a of [-170, -140, -105, -70, -35, -8]) {
    const r = a * Math.PI / 180, L = h * .48;
    const ex = tx + Math.cos(r) * L, ey = ty + Math.sin(r) * L * .5 + L * .35;
    const cx = tx + Math.cos(r) * L * .5, cy = ty + Math.sin(r) * L * .6 - 10;
    s += `<path d="M${f(tx)} ${f(ty)} Q${f(cx)} ${f(cy - 14)} ${f(ex)} ${f(ey)} Q${f(cx)} ${f(cy + 4)} ${f(tx)} ${f(ty + 6)} Z" fill="${cor}"/>`;
  }
  return s;
}

function barquinho(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="#071733">
    <path d="M-22 0 H22 L16 8 H-16 Z"/><path d="M0 0 V-26 M0 -24 L14 -4 H0" stroke="#071733" stroke-width="2"/>
    <circle cx="0" cy="-27" r="2.5" fill="#ffe28a" filter="url(#brilho)"/></g>`;
}

function flor5(x, y, r, cor) {
  return [0, 72, 144, 216, 288].map(a => `<ellipse cx="${f(x + Math.cos(a * Math.PI / 180) * r * .55)}" cy="${f(y + Math.sin(a * Math.PI / 180) * r * .55)}" rx="${f(r * .5)}" ry="${f(r * .32)}" transform="rotate(${a} ${f(x + Math.cos(a * Math.PI / 180) * r * .55)} ${f(y + Math.sin(a * Math.PI / 180) * r * .55)})" fill="${cor}"/>`).join("") +
    `<circle cx="${x}" cy="${y}" r="${f(r * .25)}" fill="#ffd23f"/>`;
}

function balaoFesta(x, y, r, cor, ax, ay) {
  return `<path d="M${x} ${y + r * 1.2} Q${x - 18} ${f((y + ay) / 2)} ${ax} ${ay}" stroke="#e8dcc0" stroke-width="1.3" fill="none" opacity=".7"/>
    <path d="M${x} ${y - r * 1.1} C${f(x + r * 1.05)} ${f(y - r * 1.1)} ${f(x + r)} ${f(y + r * .6)} ${x} ${f(y + r * 1.15)} C${f(x - r)} ${f(y + r * .6)} ${f(x - r * 1.05)} ${f(y - r * 1.1)} ${x} ${f(y - r * 1.1)} Z" fill="${cor}"/>
    <path d="M${x - 4} ${f(y + r * 1.25)} L${x} ${f(y + r * 1.1)} L${x + 4} ${f(y + r * 1.25)} Z" fill="${cor}"/>
    <ellipse cx="${f(x - r * .35)}" cy="${f(y - r * .45)}" rx="${f(r * .18)}" ry="${f(r * .32)}" fill="#fff" opacity=".45" transform="rotate(-25 ${f(x - r * .35)} ${f(y - r * .45)})"/>`;
}

function relogio(x, y, r) {
  let marcas = "";
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, grande = i % 5 === 0, r1 = r * (grande ? .78 : .86);
    marcas += `<line x1="${f(x + Math.sin(a) * r1)}" y1="${f(y - Math.cos(a) * r1)}" x2="${f(x + Math.sin(a) * r * .92)}" y2="${f(y - Math.cos(a) * r * .92)}" stroke="#3a1857" stroke-width="${grande ? 5 : 2}" stroke-linecap="round"/>`;
  }
  const ponteiro = (graus, L, w) => { const a = graus * Math.PI / 180; return `<line x1="${x}" y1="${y}" x2="${f(x + Math.sin(a) * L)}" y2="${f(y - Math.cos(a) * L)}" stroke="#3a1857" stroke-width="${w}" stroke-linecap="round"/>`; };
  return `<circle cx="${x}" cy="${y}" r="${r * 1.35}" fill="#f2c14e" opacity=".25" filter="url(#desfoque)"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#fff6e0" stroke="#e2b84a" stroke-width="14"/>
    <circle cx="${x}" cy="${y}" r="${r - 12}" fill="none" stroke="#f2d48a" stroke-width="2"/>${marcas}
    ${ponteiro(359.5, r * .5, 9)}${ponteiro(354, r * .74, 6)}<circle cx="${x}" cy="${y}" r="8" fill="#e2b84a"/>`;
}

function sombrinha(x, y, r, rot) {
  const cores = ["#e63946", "#ffd23f", "#06d6a0", "#3a86ff", "#ff8c42", "#f15bb5", "#ffffff", "#8338ec"];
  let s = "";
  for (let i = 0; i < 8; i++) {
    const a1 = Math.PI + i * Math.PI / 8, a2 = Math.PI + (i + 1) * Math.PI / 8;
    s += `<path d="M0 0 L${f(Math.cos(a1) * r)} ${f(Math.sin(a1) * r)} Q${f(Math.cos((a1 + a2) / 2) * r * 1.08)} ${f(Math.sin((a1 + a2) / 2) * r * 1.08)} ${f(Math.cos(a2) * r)} ${f(Math.sin(a2) * r)} Z" fill="${cores[i]}"/>`;
  }
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${s}
    <path d="M0 -${r + 8} V${f(r * .95)} q0 10 -9 10" fill="none" stroke="#5a3b2a" stroke-width="3.5" stroke-linecap="round"/></g>`;
}

function casinha(x, y, w, h, cor, telhado = "#c8553d") {
  return `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${w}" height="${h + 30}" fill="${cor}"/>
    <path d="M${f(x - w / 2 - 4)} ${f(y - h)} L${x} ${f(y - h - w * .35)} L${f(x + w / 2 + 4)} ${f(y - h)} Z" fill="${telhado}"/>
    <rect x="${f(x - w * .18)}" y="${f(y - h * .62)}" width="${f(w * .36)}" height="${f(h * .5)}" rx="3" fill="#ffffff" opacity=".85"/>`;
}

function pintinho(x, y, s, vira = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s * vira} ${s})">
    <path d="M-8 0 l-4 8 M-8 0 l2 8 M6 0 l-3 8 M6 0 l3 8" stroke="#ff9a3c" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-22" rx="26" ry="22" fill="#ffe066"/><circle cx="12" cy="-48" r="17" fill="#ffe066"/>
    <ellipse cx="-6" cy="-22" rx="13" ry="9" fill="#ffd23f" transform="rotate(-20 -6 -22)"/>
    <path d="M27 -50 L38 -46 L27 -42 Z" fill="#ff9a3c"/><circle cx="18" cy="-52" r="2.8" fill="#3a2a2a"/>
    <circle cx="12" cy="-42" r="4" fill="#ffb3c1" opacity=".7"/><path d="M8 -64 q4 -8 8 0" stroke="#ffd23f" stroke-width="3" fill="none"/>
  </g>`;
}

function cerquinha(x0, x1, y, h, cor, linha) {
  let s = `<rect x="${x0}" y="${y - h * .7}" width="${x1 - x0}" height="9" fill="${cor}" stroke="${linha}" stroke-width="2"/><rect x="${x0}" y="${y - h * .3}" width="${x1 - x0}" height="9" fill="${cor}" stroke="${linha}" stroke-width="2"/>`;
  for (let x = x0; x < x1; x += 30) s += `<path d="M${x} ${y} V${y - h + 10} L${x + 9} ${y - h} L${x + 18} ${y - h + 10} V${y} Z" fill="${cor}" stroke="${linha}" stroke-width="2"/>`;
  return s;
}

function cenoura(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 -10 Q-12 -34 -8 -46 M0 -10 Q2 -40 10 -50 M0 -10 Q12 -30 22 -36" stroke="#4f9e45" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M-11 -8 Q0 -14 11 -8 L2 22 Q0 26 -2 22 Z" fill="#ff8a2a"/>
  </g>`;
}

function balaoAr(x, y, s, cor, faixa) {
  const id = novoId("bar");
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <defs><clipPath id="${id}"><path d="M0 60 C-80 4 -104 -60 -54 -84 C-24 -98 0 -76 0 -54 C0 -76 24 -98 54 -84 C104 -60 80 4 0 60 Z"/></clipPath></defs>
    <path d="M-34 38 L-14 96 M34 38 L14 96 M0 60 V96" stroke="#5a3b2a" stroke-width="2"/>
    <g clip-path="url(#${id})"><rect x="-110" y="-100" width="220" height="170" fill="${cor}"/>
      <path d="M-40 -100 Q-58 0 -16 70 L-4 70 Q-36 0 -22 -100 Z M40 -100 Q58 0 16 70 L4 70 Q36 0 22 -100 Z" fill="${faixa}"/>
      <ellipse cx="-50" cy="-50" rx="16" ry="26" fill="#fff" opacity=".3" transform="rotate(-30 -50 -50)"/></g>
    <rect x="-16" y="94" width="32" height="24" rx="4" fill="#9a6a3e"/><path d="M-16 102 H16" stroke="#7a4f2a" stroke-width="2"/>
  </g>`;
}

function rosa(x, y, r, cor, escura) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}"/>
    <path d="M${f(x - r * .6)} ${f(y + r * .1)} A${f(r * .6)} ${f(r * .6)} 0 0 1 ${f(x + r * .55)} ${f(y - r * .2)} M${f(x - r * .3)} ${f(y + r * .35)} A${f(r * .4)} ${f(r * .4)} 0 0 0 ${f(x + r * .35)} ${f(y + r * .1)} M${f(x - r * .15)} ${f(y - r * .1)} A${f(r * .2)} ${f(r * .2)} 0 1 1 ${f(x + r * .12)} ${f(y + r * .05)}" fill="none" stroke="${escura}" stroke-width="${f(r * .14)}" stroke-linecap="round"/>`;
}

function folha(x, y, s, rot, cor) {
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${s})" d="M0 0 Q10 -10 22 0 Q10 10 0 0 Z" fill="${cor}"/>`;
}

function rodaGigante(x, y, r) {
  const cores = ["#e63946", "#ffd23f", "#06d6a0", "#3a86ff", "#f15bb5", "#ff8c42"];
  let s = `<path d="M${x - r * .55} ${y + r + 60} L${x} ${y} L${x + r * .55} ${y + r + 60}" stroke="#1a1238" stroke-width="10" fill="none"/>`;
  s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#1a1238" stroke-width="6"/><circle cx="${x}" cy="${y}" r="${r * .8}" fill="none" stroke="#1a1238" stroke-width="3"/>`;
  let luzes = "", cabines = "";
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
    s += `<line x1="${x}" y1="${y}" x2="${f(cx)}" y2="${f(cy)}" stroke="#1a1238" stroke-width="2.5"/>`;
    cabines += `<path d="M${f(cx)} ${f(cy)} v10" stroke="#1a1238" stroke-width="2"/><rect x="${f(cx - 13)}" y="${f(cy + 10)}" width="26" height="20" rx="5" fill="${cores[i % 6]}"/>`;
  }
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2;
    luzes += `<circle cx="${f(x + Math.cos(a) * r)}" cy="${f(y + Math.sin(a) * r)}" r="3" fill="#fff1b8" filter="url(#brilho)"/>`;
  }
  return s + cabines + luzes + `<circle cx="${x}" cy="${y}" r="10" fill="#1a1238"/>`;
}

function barraca(x, y, w, c1, c2) {
  const h = 70, topo = y - h - 40;
  let listras = "";
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = x - w / 2 - 10 + i * (w + 20) / n, b = a + (w + 20) / n;
    const ta = x - w * .25 + i * (w * .5) / n, tb = ta + (w * .5) / n;
    listras += `<path d="M${f(ta)} ${topo} L${f(tb)} ${topo} L${f(b)} ${y - h} L${f(a)} ${y - h} Z" fill="${i % 2 ? c2 : c1}"/>`;
  }
  let babado = "";
  for (let i = 0; i < n; i++) {
    const a = x - w / 2 - 10 + i * (w + 20) / n, b = a + (w + 20) / n;
    babado += `<path d="M${f(a)} ${y - h} Q${f((a + b) / 2)} ${y - h + 20} ${f(b)} ${y - h} Z" fill="${i % 2 ? c2 : c1}"/>`;
  }
  let luz = "";
  for (let i = 0; i < 6; i++) luz += `<circle cx="${f(x - w / 2 + 8 + i * (w - 16) / 5)}" cy="${y - h + 26}" r="3" fill="#fff1b8" filter="url(#brilho)"/>`;
  return `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h + 20}" fill="#2a1a3a"/>
    <rect x="${x - w / 2 + 8}" y="${y - h + 12}" width="${w - 16}" height="${h - 34}" fill="#ffcf7a" opacity=".85" filter="url(#brilho)"/>
    <rect x="${x - w / 2 - 6}" y="${y - 24}" width="${w + 12}" height="12" fill="#6b3b22"/>
    ${listras}${babado}${luz}`;
}

function chapeuPalha(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="48" ry="12" fill="#d9a441"/><path d="M-24 -2 Q-24 -36 0 -38 Q24 -36 24 -2 Z" fill="#e9c46a"/>
    <path d="M-24 -10 Q0 -4 24 -10 L24 -2 Q0 4 -24 -2 Z" fill="#c1121f"/>
    <path d="M-40 -2 Q0 8 40 -2 M-16 -26 Q0 -22 16 -26" stroke="#b5832a" stroke-width="2" fill="none"/>
  </g>`;
}

const morro = (pico, altura, largura, base) => {
  let d = `M-10 680 L-10 ${base}`;
  for (let x = -10; x <= 1110; x += 20) d += ` L${x} ${f(base - altura * Math.exp(-(((x - pico) / largura) ** 2)))}`;
  return { d: d + " L1110 680 Z", y: x => base - altura * Math.exp(-(((x - pico) / largura) ** 2)) };
};

/* ---------- as versões ---------- */


const TEMAS = {
  "original": {
    pasta: "38-dia-dos-namorados", titulo: "Dia dos Namorados",
    selo: { fundo: "#43112f", cor: "#ffd9e2", destaque: "#ff6b8b" },
    pagina: fundoPagina("#43112f", "#1f0716"),
    ceu: [[0, "#5c1f5e"], [.35, "#b8407a"], [.65, "#f07a7c"], [.86, "#ffb48a"], [1, "#ffd9a6"]],
    cena() {
      const r = sorteio(41);
      const sil = "#2b0a22";
      const tr = arvore(810, 546, { tam: 95, larg: 22, nivel: 6, cor: sil, semente: 22, torto: .4, abre: .55 });
      const rosas = ["#ff4d6d", "#ff758f", "#ff8fa3", "#c9184a", "#ffb3c1", "#e5383b"];
      let folhas = "";
      for (const [x, y] of tr.pontas) for (let k = 0; k < 2; k++)
        folhas += coracao(x + (r() - .5) * 26, y + (r() - .5) * 26, .26 + r() * .2, rosas[Math.floor(r() * rosas.length)], (r() - .5) * 40);
      let caindo = "";
      for (let i = 0; i < 10; i++) caindo += coracao(680 + r() * 340, 300 + r() * 260, .12 + r() * .1, rosas[i % rosas.length], (r() - .5) * 60, `opacity=".85"`);
      let flutuando = "";
      for (let i = 0; i < 14; i++) flutuando += coracao(80 + r() * 600, 60 + r() * 360, .1 + r() * .14, "#ffd0dc", (r() - .5) * 40, `opacity="${f(.25 + r() * .35)}"`);
      let luzes = `<path d="M70 70 Q550 210 1040 60" fill="none" stroke="${sil}" stroke-width="1.6"/>`;
      for (let i = 1; i < 22; i++) {
        const t = i / 22, x = (1 - t) ** 2 * 70 + 2 * (1 - t) * t * 550 + t * t * 1040, y = (1 - t) ** 2 * 70 + 2 * (1 - t) * t * 210 + t * t * 60;
        luzes += `<circle cx="${f(x)}" cy="${f(y + 6)}" r="4.5" fill="#fff1c1" filter="url(#brilho)"/>`;
      }
      return [
        `<circle cx="470" cy="560" r="230" fill="#ffd9a6" opacity=".35" filter="url(#desfoque)"/><circle cx="470" cy="560" r="105" fill="#fff0c8"/>`,
        flutuando, luzes,
        `<path d="M0 575 C180 540 320 560 480 556 C640 552 760 530 900 538 C1000 544 1060 550 1100 556 V680 H0Z" fill="#b9587a"/>`,
        `<path d="M0 640 C200 620 420 600 600 590 C720 580 800 546 880 545 C980 544 1050 560 1100 566 V680 H0Z" fill="${sil}"/>`,
        tr.svg, folhas, caindo,
        banco(700, 586, 1, sil),
        balaoCoracao(560, 300, 1.05, "#ff2e63", 670, 540), balaoCoracao(640, 235, .85, "#ff6b8b", 676, 540), balaoCoracao(470, 375, .7, "#e5383b", 664, 540),
      ].join("");
    },
  },
  "baloes": {
    pasta: "38-dia-dos-namorados", cor: "baloes", titulo: "Dia dos Namorados · Balões",
    selo: { fundo: "#4a1a3c", cor: "#ffe3ec", destaque: "#ff8fb1" },
    pagina: fundoPagina("#4a1a3c", "#22091b"),
    ceu: [[0, "#9fb4ff"], [.5, "#f6c1e0"], [1, "#ffe3cf"]],
    cena() {
      let coracoes = "";
      const r = sorteio(161);
      for (let i = 0; i < 12; i++) coracoes += coracao(80 + r() * 940, 60 + r() * 380, .1 + r() * .12, "#ffffff", (r() - .5) * 40, `opacity="${f(.4 + r() * .4)}"`);
      return [
        nuvem(200, 140, 1.4, "#fff", .85), nuvem(820, 110, 1.2, "#fff", .8), nuvem(560, 420, 1.6, "#fff", .6), nuvem(980, 380, .9, "#fff", .7),
        coracoes,
        balaoAr(320, 230, 1.15, "#ff4d6d", "#ffd6e0"), balaoAr(700, 170, .8, "#ff8fb1", "#ffffff"), balaoAr(900, 330, .55, "#c9184a", "#ffb3c1"), balaoAr(530, 360, .45, "#ffb3c1", "#ff4d6d"),
        `<path d="M0 560 C180 520 340 540 520 546 C700 552 860 520 1100 540 V680 H0Z" fill="#f2a7c3"/>`,
        `<path d="M0 610 C220 586 420 600 600 596 C780 592 940 584 1100 592 V680 H0Z" fill="#c9799e"/>`,
        `<path d="M0 650 C300 636 700 650 1100 640 V680 H0Z" fill="#8a3b66"/>`,
      ].join("");
    },
  },
  "rosas": {
    pasta: "38-dia-dos-namorados", cor: "rosas", titulo: "Dia dos Namorados · Rosas",
    selo: { fundo: "#3a0f2a", cor: "#ffe0e8", destaque: "#ff5c8a" },
    pagina: fundoPagina("#3d0f2c", "#1a0513"),
    ceu: [[0, "#2b0f2e"], [.55, "#6a1f4a"], [1, "#c2456e"]],
    cena() {
      const r = sorteio(171);
      let arco = "";
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, a = Math.PI * (1 - t), x = 550 + Math.cos(a) * 200, y = 400 - Math.sin(a) * 200;
        const px = t < .02 || t > .98 ? 0 : 1;
        arco += folha(x + (r() - .5) * 30, y + (r() - .5) * 30, 1 + r(), r() * 360, r() < .5 ? "#2f6b3a" : "#3f8a4a");
        if (px && i % 2 === 0) arco += rosa(f(x + (r() - .5) * 20), f(y + (r() - .5) * 20), 12 + r() * 7, ["#e63962", "#ff6b8b", "#c9184a", "#ff9fb4"][i % 4], "#8a0f30");
      }
      for (const lado of [350, 750]) for (let y = 420; y < 600; y += 22) {
        arco += folha(lado + (r() - .5) * 26, y, 1 + r() * .6, r() * 360, "#2f6b3a");
        if (r() < .55) arco += rosa(f(lado + (r() - .5) * 22), y, 10 + r() * 6, ["#e63962", "#ff6b8b", "#ff9fb4"][Math.floor(r() * 3)], "#8a0f30");
      }
      let vagalumes = "", petalas = "";
      for (let i = 0; i < 26; i++) vagalumes += `<circle cx="${f(r() * 1100)}" cy="${f(200 + r() * 420)}" r="${f(1.6 + r() * 2)}" fill="#ffe9a8" filter="url(#brilho)"/>`;
      for (let i = 0; i < 16; i++) { const x = f(r() * 1100), y = f(80 + r() * 520); petalas += `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.5" fill="#ff8fab" opacity=".85" transform="rotate(${f(r() * 180)} ${x} ${y})"/>`; }
      return [
        estrelas(172, 50, 0, 0, 1100, 300, "#ffe0ec"),
        lua(840, 130, 44, { cor: "#ffe8ee", sombra: "#f6cbd6", halo: "#ffd0dc" }),
        `<path d="M0 600 C200 586 400 596 560 600 C760 604 920 588 1100 596 V680 H0Z" fill="#1f0a1c"/>`,
        `<path d="M500 680 L520 600 L580 600 L600 680 Z" fill="#3a1830"/>`,
        `<path d="M350 600 V420 A200 200 0 0 1 750 420 V600" fill="none" stroke="#2a1426" stroke-width="12"/>`,
        arco,
        coracao(550, 330, .5, "#ff5c8a", 0, `filter="url(#brilho)"`),
        vagalumes,
        [[120, 620], [210, 640], [900, 630], [990, 612]].map(([x, y]) => rosa(x, y, 16, "#e63962", "#8a0f30")).join(""),
        petalas,
      ].join("");
    },
  }
};
