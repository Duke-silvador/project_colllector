// Fabrique une appli HTML autonome par contenu.
//   node build.js              → toutes les apps de contenus/ vers dist/
//   node build.js soudeur      → seulement contenus/soudeur.js (ou le dossier contenus/soudeur/)
// Un contenu est soit un fichier contenus/xxx.js, soit un dossier contenus/xxx/ dont les .js
// sont mis bout à bout dans l'ordre alphabétique (00-app.js, 10-bases.js, …).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const DIR = path.join(ROOT, 'contenus');
const template = fs.readFileSync(path.join(ROOT, 'moteur/template.html'), 'utf8');
const only = process.argv[2];
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });

let errors = 0;
for (const f of fs.readdirSync(DIR).sort()) {
  const full = path.join(DIR, f), isDir = fs.statSync(full).isDirectory();
  if (!isDir && !f.endsWith('.js')) continue;
  const slug = f.replace(/\.js$/, '');
  if (only && only !== slug) continue;
  const src = isDir
    ? fs.readdirSync(full).filter(x => x.endsWith('.js')).sort().map(x => `/* ---- ${x} ---- */\n` + fs.readFileSync(path.join(full, x), 'utf8')).join('\n')
    : fs.readFileSync(full, 'utf8');

  // Charge le contenu pour le vérifier avant de fabriquer l'appli
  let C;
  try { C = vm.runInNewContext(src + '\n;C'); } catch (e) { console.error(`✗ ${f} : erreur — ${e.message}`); errors++; continue; }
  let pb;
  try { pb = check(C); } catch (e) { pb = ['contrôle impossible : ' + e.message]; }
  if (pb.length) { console.error(`✗ ${f} :\n  - ` + pb.join('\n  - ')); errors++; continue; }

  const html = template.replace('/*__TITRE__*/', C.app).replace('/*__CONTENU__*/', () => src);
  fs.writeFileSync(path.join(ROOT, 'dist', slug + '.html'), html);
  const n = (k, mot) => C[k] ? `, ${C[k].length} ${mot}` : '';
  console.log(`✓ dist/${slug}.html — ${C.modules.length} modules, ${C.lexique.length} mots, ${C.quiz.length} QCM, ${C.vf.length} V/F, ${C.ordre.length} ordres`
    + n('diag', 'dépannages') + n('cablage', 'câblages') + n('tri', 'classements') + n('symboles', 'symboles') + n('atelier', 'thèmes de calcul') + n('appareils', 'fiches appareils')
    + ` (${Math.round(html.length / 1024)} Ko)`);
}
process.exit(errors ? 1 : 0);

// Contrôles de cohérence du contenu
function check(C) {
  const pb = [];
  for (const k of ['id', 'app', 'icon', 'modules', 'lexique', 'quiz', 'vf', 'ordre']) if (!C[k]) pb.push(`champ manquant : ${k}`);
  if (pb.length) return pb;
  const dbl = (l, quoi) => { const d = l.filter((x, i, a) => a.indexOf(x) !== i); if (d.length) pb.push(`${quoi} en double : ` + [...new Set(d)].join(', ')); };
  const mods = new Set(C.modules.map(m => m.id));
  dbl(C.modules.map(m => m.id), 'modules');
  const mots = new Set(C.lexique.map(w => w[0]));
  C.modules.forEach(m => m.k.forEach(k => { if (!mots.has(k)) pb.push(`mot-clé « ${k} » (module ${m.id}) absent du lexique`); }));
  if (C.niveaux) C.modules.forEach(m => { if (!(m.n >= 1 && m.n <= C.niveaux.length)) pb.push(`module ${m.id} : niveau n invalide (${m.n})`); });
  C.quiz.forEach((q, i) => {
    if (!mods.has(q[0])) pb.push(`quiz #${i + 1} : module inconnu « ${q[0]} »`);
    if (!Array.isArray(q[2]) || q[2].length < 2 || q[3] >= q[2].length) pb.push(`quiz #${i + 1} : réponses invalides`);
    else dbl(q[2], `quiz « ${q[1].slice(0, 40)} » : réponses`);
    if (!q[4]) pb.push(`quiz #${i + 1} : explication manquante`);
  });
  dbl(C.quiz.map(q => q[1]), 'questions de quiz');
  C.vf.forEach((q, i) => { if (typeof q[1] !== 'boolean') pb.push(`vrai/faux #${i + 1} : la réponse doit être true ou false`); });
  dbl(C.vf.map(q => q[0]), 'vrai/faux');
  if (C.lexique.length < 5) pb.push('il faut au moins 5 mots dans le lexique (jeu Associer)');
  if (C.quiz.length < 10) pb.push('il faut au moins 10 questions de quiz');
  if (C.vf.length < 10) pb.push('il faut au moins 10 vrai/faux');
  dbl(C.ordre.map(o => o.t), 'procédures « dans l\'ordre »');
  const FIGS = ['cycle', 'flux', 'barres', 'chiffres', 'svg', 'inter', 'etapes'];
  const checkFig = (f, w) => {
    if (!f) return;
    if (!FIGS.includes(f.type)) return pb.push(`${w} : schéma de type inconnu « ${f.type} »`);
    if (f.type === 'inter') {
      if (typeof f.f !== 'function' || !Array.isArray(f.inters)) return pb.push(`${w} : schéma interactif sans f(s) ou sans inters`);
      const s = {}; f.inters.forEach(([k]) => s[k] = 0);
      if (!Array.isArray(f.f(s))) pb.push(`${w} : f(s) doit renvoyer une liste`);
    }
    if (f.type === 'etapes' && !(f.vues && f.vues.length)) pb.push(`${w} : schéma pas à pas sans vues`);
  };
  C.modules.forEach(m => m.s.forEach((s, i) => checkFig(s.fig, `module ${m.id}, partie ${i + 1}`)));
  for (const [id, F] of Object.entries(C.fiches || {})) {
    const m = C.modules.find(x => x.id === id);
    if (!m) { pb.push(`fiches : module inconnu « ${id} »`); continue; }
    if ((F.s || []).length > m.s.length) pb.push(`fiches.${id} : ${F.s.length} parties pour ${m.s.length} dans le module`);
    (F.s || []).forEach((s, i) => {
      const w = `fiches.${id}, partie ${i + 1}`;
      if (s.q && (!Array.isArray(s.q[1]) || s.q[1].length < 2 || s.q[2] >= s.q[1].length || !s.q[3])) pb.push(`${w} : mini-question invalide (format : [question,[réponses],0,explication])`);
      checkFig(s.fig, w);
    });
  }
  dbl(C.lexique.map(w => w[0]), 'mots du lexique');

  // Dépannages
  if (C.diag) {
    dbl(C.diag.map(d => d.id), 'dépannages (id)');
    C.diag.forEach(d => {
      const w = `dépannage ${d.id}`;
      if (!d.t || !d.bon || !d.bon.pb || !d.bon.lieu || !d.fin) pb.push(`${w} : titre, bon.lieu, bon.pb et fin obligatoires`);
      (d.etapes || []).forEach((e, i) => {
        if (!e.q || !Array.isArray(e.o) || e.o.length < 2) return pb.push(`${w}, étape ${i + 1} : question ou choix manquants`);
        const bons = e.o.filter(o => o[1] === true).length;
        if (bons !== 1) pb.push(`${w}, étape ${i + 1} : il faut exactement 1 bonne réponse (${bons})`);
        e.o.forEach((o, j) => { if (!o[2]) pb.push(`${w}, étape ${i + 1}, choix ${j + 1} : explication manquante`); });
        checkFig(e.fig, `${w}, étape ${i + 1}`);
      });
      if (!(d.etapes || []).length) pb.push(`${w} : aucune étape`);
    });
  }
  // Câblages
  if (C.cablage) {
    dbl(C.cablage.map(c => c.id), 'câblages (id)');
    C.cablage.forEach(c => {
      const w = `câblage ${c.id}`, bornes = new Set();
      c.app.forEach(a => a.b.forEach(b => bornes.add(a.id + '.' + b[0])));
      const vu = new Set();
      c.sol.forEach((n, i) => {
        if (!['P', 'N', 'T', 'X', 'B'].includes(n[0])) pb.push(`${w}, réseau ${i + 1} : type inconnu « ${n[0]} »`);
        if (n.length < 3) pb.push(`${w}, réseau ${i + 1} : il faut au moins 2 bornes`);
        n.slice(1).forEach(b => { if (!bornes.has(b)) pb.push(`${w} : borne inconnue « ${b} »`); if (vu.has(b)) pb.push(`${w} : borne « ${b} » dans deux réseaux`); vu.add(b); });
      });
      (c.perm || []).flat().forEach(b => { if (!bornes.has(b)) pb.push(`${w}, perm : borne inconnue « ${b} »`); });
      (c.lum || []).forEach(a => { if (!c.app.some(x => x.id === a)) pb.push(`${w}, lum : appareil inconnu « ${a} »`); });
      if (!c.d || !c.aide || !c.fin) pb.push(`${w} : consigne (d), aide et fin obligatoires`);
      c.app.forEach(a => { if (a.x < 0 || a.x + a.w > 360 || a.y < 0 || a.y + a.h > (c.h || 400)) pb.push(`${w} : l'appareil ${a.id} sort du plan`); });
    });
  }
  // Classements
  (C.tri || []).forEach(t => {
    t.items.forEach(it => { if (!t.cats.includes(it[1])) pb.push(`classement « ${t.t} » : catégorie inconnue « ${it[1]} » pour « ${it[0]} »`); });
    dbl(t.items.map(it => it[0]), `classement « ${t.t} » : éléments`);
  });
  // Symboles et appareils
  if (C.symboles) { dbl(C.symboles.map(s => s[0]), 'symboles'); if (C.symboles.length < 4) pb.push('il faut au moins 4 symboles'); }
  if (C.appareils) {
    dbl(C.appareils.map(a => a.n), 'appareils');
    C.appareils.forEach(a => {
      if (!a.n || !a.f) pb.push(`appareil ${a.n || '?'} : nom (n) et fonction (f) obligatoires`);
      if (a.sym && !(C.symboles || []).some(s => s[0] === a.sym)) pb.push(`appareil ${a.n} : symbole inconnu « ${a.sym} »`);
      if (a.f && a.f.toLowerCase().includes(a.n.toLowerCase())) pb.push(`appareil ${a.n} : la fonction donne la réponse du jeu « Qui suis-je ? »`);
    });
  }
  // Atelier de calcul : chaque générateur est lancé 200 fois
  const R = { r: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a, pick: a => a[Math.floor(Math.random() * a.length)], f: (x, d = 2) => String(+(+x).toFixed(d)) };
  (C.atelier || []).forEach(a => {
    for (let i = 0; i < 200; i++) {
      const x = a.gen(R);
      if (!x || typeof x.q !== 'string' || typeof x.ex !== 'string' || !isFinite(x.r)) { pb.push(`atelier « ${a.t} » : exercice invalide (${JSON.stringify(x)})`); break; }
    }
  });
  return pb;
}
