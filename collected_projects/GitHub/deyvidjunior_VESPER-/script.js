/* ================= DADOS (EXCLUSIVO CELI) ================= */
const USER = { names: ['celi', 'celina'], display: 'Celi', avatar: '🌻' };

const MSGS = [
  ["Celi, você é aquela pessoa rara que transforma a vida dos outros apenas com sua presença. Sua luz ilumina até os caminhos mais escuros.", "Continue sendo essa força da natureza! Seu impacto no mundo é maior do que você imagina! 💛✨"],
  ["Sua amizade é como um girassol: sempre busca a luz e, ao fazer isso, ilumina todos ao redor.", "Você é um presente para todos que têm a sorte de te conhecer! Continue brilhando! 🌻"],
  ["Celi, sua força e determinação são verdadeiramente inspiradoras. Você enfrenta desafios com coragem admirável.", "Continue acreditando no seu potencial infinito! Você é capaz de conquistar tudo! ✨"],
  ["Cada risada sua é contagiante e transforma dias comuns em momentos especiais.", "Seu sorriso é medicina para a alma! Nunca perca essa essência! 😊💛"],
  ["Você tem um coração enorme e uma alma linda que brilha mais que o sol.", "O mundo precisa de mais pessoas como você! Continue sendo essa bênção! 💫"],
  ["Celi, sua energia positiva transforma qualquer ambiente em um lugar melhor.", "Continue sendo essa fonte inesgotável de inspiração! 🌟💛"],
  ["Sua amizade é um tesouro raro que guardo com muito carinho e gratidão.", "Pessoas como você fazem a vida valer a pena! Obrigado por existir! 💛✨"],
  ["Você é prova viva de que a bondade e a alegria podem mudar o mundo.", "Continue espalhando amor e luz! Você faz diferença real! 🌻💫"],
  ["Celi, sua resiliência é admirável. Você supera desafios com graça e força de guerreira.", "Cada desafio superado te torna mais forte! Você é imparável! 💪✨"],
  ["Sua criatividade e inteligência são impressionantes. Você brilha em tudo que faz.", "Continue explorando seus talentos! O céu é o limite! 🚀💛"],
  ["Você tem o dom raro de fazer todos se sentirem especiais e acolhidos.", "Seu coração generoso é um presente para todos nós! 💛"],
  ["Celi, sua autenticidade é sua maior força e seu maior tesouro.", "O mundo precisa da sua luz única! Nunca apague seu brilho! ✨💫"],
  ["Sua alegria é contagiante e transforma qualquer dia em uma celebração.", "Continue espalhando felicidade! Você é uma bênção! 🎉💛"],
  ["Você é aquela amiga que todos gostariam de ter: leal, carinhosa e incrível.", "Sua amizade é um tesouro que guardo com carinho! 💛✨"],
  ["Celi, sua determinação e garra são inspiradoras. Você é verdadeiramente imparável.", "Continue perseguindo seus sonhos! Você merece o mundo! 🌟💪"],
  ["Sua presença traz paz e alegria. Você é um porto seguro em meio às tempestades.", "Você é um raio de sol em dias nublados! ☀️"],
  ["Celi, você é mais forte do que imagina e mais amada do que pensa.", "Acredite no seu potencial! Você é capaz de conquistar tudo! 💪✨"],
  ["Sua bondade e generosidade fazem do mundo um lugar infinitamente melhor.", "Continue espalhando amor! Você é extraordinária! 💛"],
  ["Você tem uma luz interior tão poderosa que ilumina até os dias mais escuros.", "Sua energia é mágica! Continue brilhando e inspirando! ✨"],
  ["Celi, você é uma pessoa rara e verdadeiramente especial, com luz única.", "O mundo é melhor porque você existe! Continue sendo incrível! 🌻💛✨"]
];

const POEMS = [
  { id: 1, t: "Força Interior", c: 0, v: "Mesmo nas tempestades mais frias,\nsua raiz é feita de sol e luz.\nO vento pode até vergar o caule,\nmas jamais apagará a grandeza\nque floresce em seu peito.\n\nVocê não precisa ser forte o tempo todo;\nhá beleza também nas pausas e no silêncio.\nRespire a doçura deste novo dia,\npois cada pétala que você solta ao mundo\ntorna a vida de quem te ama mais dourada." },
  { id: 2, t: "Você é Suficiente", c: 5, v: "Quando o espelho não reflete sua beleza,\ne a voz interna diz que não é o bastante,\nlembre-se: você é perfeita do seu jeito,\núnica, especial, radiante e brilhante.\n\nNão precisa ser como os outros,\nnem seguir nenhum padrão.\nSua essência é seu maior tesouro,\nseu coração é sua maior canção.\n\nVocê é suficiente exatamente como é." },
  { id: 3, t: "Novo Amanhecer", c: 10, v: "Todo fim é um novo começo,\ntoda noite precede um amanhecer.\nMesmo nos dias mais escuros,\no sol vai voltar a aparecer.\n\nNão tema as mudanças da vida,\nelas vêm para te fazer crescer.\nCada ciclo que se encerra\ntraz algo novo para você.\n\nRespire, confie, entregue:\no universo conspira a seu favor." },
  { id: 4, t: "Coragem de Ser", c: 15, v: "Tenha coragem de ser quem você é,\nmesmo que o mundo tente te moldar.\nSua autenticidade é sua força,\nsua verdade é seu lugar.\n\nNão se diminua para caber,\nnão apague sua luz para brilhar.\nO mundo precisa da sua essência,\nda sua voz, do seu jeito de amar.\n\nSeja corajosa, seja você." },
  { id: 5, t: "Jardim Interior", c: 20, v: "Dentro de você existe um jardim,\nonde florescem sonhos e esperança.\nRegue-o com amor e paciência,\ne colha a paz que nunca cansa.\n\nNos dias de tempestade,\nproteja seu jardim interior.\nLembre-se: após a chuva,\nsempre vem o sol com seu calor.\n\nCuide de si com carinho:\nvocê merece todo amor do mundo." },
  { id: 6, t: "Mulher Guerreira", c: 25, v: "Mulher, você é feita de aço e de flor,\nde lágrimas e risos, de dor e amor.\nCarrega o mundo nos ombros com graça,\ne ainda cura a ferida que passa.\n\nVocê é mãe, amiga, guerreira e sonhadora,\nforça da natureza, luz que não vai embora.\nMesmo quando o cansaço bater na porta,\nlembre-se: você é a mulher forte que suporta.\n\nLevanta a cabeça, guerreira:\nseu caminho é de glória e luz." },
  { id: 7, t: "Tempo de Florescer", c: 30, v: "Tudo tem seu tempo, minha querida,\nnem tudo acontece na hora que a gente quer.\nMas confie no processo da vida:\ncada etapa tem algo pra te oferecer.\n\nA semente precisa da terra escura\npra depois romper e buscar a luz.\nAssim também é a sua jornada,\ncarregando sonhos que o tempo conduz.\n\nTenha paciência com você mesma:\nflorescer leva tempo e dedicação." },
  { id: 8, t: "Você Não Está Só", c: 35, v: "Quando a noite parecer longa demais,\ne o silêncio pesar no coração,\nlembre-se: você nunca está só.\nExiste alguém torcendo pela sua mão.\n\nExiste um universo inteiro\nque vibra junto com você,\nestrelas que brilham pra te guiar,\ne um amanhã pra renascer.\n\nVocê é amada mais do que imagina,\ne sua luz é infinita." },
  { id: 9, t: "Renascer", c: 40, v: "Assim como a fênix renasce das cinzas,\nvocê também pode se reinventar.\nDeixe pra trás o que não serve mais\ne construa algo novo pra conquistar.\n\nNão tenha medo de recomeçar:\ncada fim é uma porta que se abre.\nNovas possibilidades te esperam,\nnovos sonhos, novos saberes, novas fases.\n\nVocê é capaz de se transformar\nquantas vezes quiser." },
  { id: 10, t: "Sua Luz Única", c: 50, v: "Você tem uma luz que ninguém tem,\numa cor que só você pode pintar,\numa melodia que só você canta,\num jeito único de amar.\n\nNão se compare com ninguém:\nsua jornada é só sua.\nCada passo que você dá\né um traço na sua pintura.\n\nVocê é rara, você é especial:\numa obra de arte em construção." }
];

const QUIZ = [
  { q: "Qual é o significado mais profundo e especial por trás do gesto de presentear com flores amarelas no dia 21 de setembro?", o: ["Apenas marcar a chegada do final de ano e início das festas.", "Desejar luz, amizade sincera, novos começos e espalhar afeto genuíno.", "Indicar que a pessoa deve renovar suas plantas de jardim.", "Cumprir uma obrigação casual sem significado sentimental."], c: 1 },
  { q: "O que as flores amarelas simbolizam nesta tradição de afeto?", o: ["Tristeza e despedida.", "Raiva e indiferença.", "Alegria, amizade e boas energias.", "Silêncio e distância."], c: 2 },
  { q: "Qual novela argentina ajudou a popularizar o gesto das flores amarelas?", o: ["Floricienta", "Rebelde", "Chiquititas", "Carrusel"], c: 0 },
  { q: "No hemisfério sul, o dia 21 de setembro marca a chegada de qual estação?", o: ["Inverno", "Outono", "Primavera", "Verão"], c: 2 },
  { q: "Qual destas é uma qualidade que a Celi carrega dentro de si?", o: ["Ser incrível do seu jeito", "Ser comum", "Ser invisível", "Nenhuma das anteriores"], c: 0 },
  { q: "O que uma amizade verdadeira faz nos dias difíceis?", o: ["Julga e critica", "Apoia, acolhe e permanece", "Ignora e se afasta", "Fofoca pelos cantos"], c: 1 },
  { q: "Qual é a melhor forma de atravessar um dia cansativo?", o: ["Desistir de tudo", "Respirar fundo, pausar e seguir com carinho", "Reclamar sem parar", "Fugir dos sentimentos"], c: 1 },
  { q: "O que a Celi merece receber hoje e sempre?", o: ["Nada", "Só o básico", "Tudo de bom, com afeto e leveza", "Só obrigações"], c: 2 }
];

const THEMES = {
  solar: ["#f59e0b", "#ec4899", "#7c3aed"],
  sunset: ["#f97316", "#ec4899", "#4c1d95"],
  night: ["#312e81", "#6d28d9", "#0f172a"]
};

/* ================= ESTADO ================= */
let S = null, entered = false, curPoem = null, quizSt = null, gameSt = null;
let shSt = { ratio: '916', theme: 'solar' };
let hist = [];

const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function load() {
  const d = lsGet('fa_celi');
  const def = { coins: 0, hearts: 0, unlocked: [1], saved: [], read: [], lastBonus: '', lastSave: '' };
  S = d ? Object.assign(def, JSON.parse(d)) : def;
}

function save() { lsSet('fa_celi', JSON.stringify(S)); hud(); }

function hud() {
  document.getElementById('coinView').textContent = S ? S.coins : 0;
  document.getElementById('heartView').textContent = S ? S.hearts : 0;
  document.getElementById('gardenIcon').textContent = entered ? USER.avatar : '🌻';
  document.getElementById('gardenName').textContent = entered ? 'Jardim da ' + USER.display : 'Visitante';
}

function cur() {
  const s = document.querySelector('.screen.on');
  return s ? s.id.replace('s-', '') : 'profile';
}

function go(id) {
  if (cur() === 'game' && id !== 'game') stopGame();
  hist.push(cur());
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById('s-' + id).classList.add('on');
  document.getElementById('backBtn').style.display = id === 'profile' ? 'none' : 'flex';
  window.scrollTo(0, 0);
}

function goBack() {
  if (cur() === 'game') stopGame();
  const p = hist.pop() || 'profile';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById('s-' + p).classList.add('on');
  document.getElementById('backBtn').style.display = p === 'profile' ? 'none' : 'flex';
}

function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2600);
}

function confetti() {
  const c = ['#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];
  for (let i = 0; i < 35; i++) {
    setTimeout(() => {
      const e = document.createElement('div');
      e.className = 'confetti';
      e.style.left = Math.random() * 100 + 'vw';
      e.style.background = c[i % 5];
      e.style.borderRadius = Math.random() > .5 ? '50%' : '0';
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 3200);
    }, i * 40);
  }
}

/* ================= ENTRADA ================= */
function renderProfile() {
  const st = lsGet('fa_celi');
  const d = st ? JSON.parse(st) : null;
  const box = document.getElementById('profileCards');
  box.innerHTML =
    '<div class="profile-card"><div class="profile-head"><div class="avatar">🌻</div><div><span class="badge-tag">Jardim da Celi</span><b>Celi</b></div></div>' +
    '<p class="profile-line">🟢 ' + (d && d.lastBonus === today() ? 'Visitou hoje' : 'Seu cantinho está te esperando') + '</p>' +
    '<p class="profile-line">💗 ' + (d ? d.unlocked.length : 1) + ' poesias no cantinho</p>' +
    '<button class="btn gold" onclick="enter()">Entrar como Celi ✨</button></div>';
}

function enter() {
  entered = true;
  load();
  hist = [];
  go('message');
  renderMessage();
  confetti();
  toast('Bem-vinda ao seu cantinho, Celi! 🌻');
}

function enterByName() {
  const v = document.getElementById('nameInput').value.toLowerCase().trim();
  if (USER.names.includes(v)) { enter(); return; }
  toast('Este jardim é exclusivo da Celi 💛');
}

/* ================= MENSAGEM DO DIA ================= */
function dayOfYear() {
  const n = new Date();
  return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5);
}

function renderMessage() {
  document.getElementById('msgTitle').textContent = 'Sua Mensagem Especial de Hoje, Celi ✨';
  const idx = Math.floor((dayOfYear() - 1) / 18.25) % 20;
  const m = MSGS[idx];
  document.getElementById('msgQuote').textContent = '"' + m[0] + '"';
  document.getElementById('msgReflect').textContent = m[1];
  document.getElementById('msgEd').textContent = 'Edição #' + dayOfYear();
  const pill = document.getElementById('bonusPill');
  if (S.lastBonus !== today()) {
    S.hearts += 3;
    S.lastBonus = today();
    save();
    pill.textContent = '💛 Bônus Diário: Você conquistou +3 Corações de Afeto! ✨';
  } else {
    pill.textContent = '💛 Bônus diário já coletado hoje. Volte amanhã! ✨';
  }
}

function saveHeart() {
  if (S.lastSave === today()) { toast('Você já salvou a mensagem hoje! 💛'); return; }
  S.lastSave = today();
  S.hearts += 1;
  save();
  toast('Salvo no coração! +1 💛');
  confetti();
}

/* ================= QUIZ ================= */
function goQuiz() {
  quizSt = { i: 0, ok: 0, sel: null };
  go('quiz');
  renderQuiz();
}

function renderQuiz() {
  const q = QUIZ[quizSt.i];
  document.getElementById('quizProg').textContent = 'Pergunta ' + (quizSt.i + 1) + ' de 5';
  document.getElementById('quizBar').style.width = (((quizSt.i + 1) / 5) * 100) + '%';
  const box = document.getElementById('quizCard');
  box.innerHTML =
    '<p style="text-align:left;color:#8a3c1a;font-weight:800;font-size:1.15rem;margin-bottom:12px">🌻 REFLEXÃO FLORAL<br>' + q.q + '</p>' +
    q.o.map((o, i) =>
      '<button class="opt" id="op' + i + '" aria-pressed="false" onclick="selOpt(' + i + ')"><span class="letter">' + 'ABCD'[i] + '</span><span>' + o + '</span></button>'
    ).join('') +
    '<div class="reflect" style="background:#fdf3d8"><span style="font-size:1.3rem">💡</span><div><b>Inspiração do Dia</b><span>As flores amarelas representam raios de sol compartilhados. Cada resposta certa é uma semente que floresce no coração!</span></div></div>' +
    '<button class="btn purple" onclick="confirmQuiz()">Confirmar Resposta ✨</button>' +
    '<button class="btn ghost" onclick="skipQuiz()">Pular Pergunta</button>';
  quizSt.sel = null;
}

function selOpt(i) {
  quizSt.sel = i;
  document.querySelectorAll('.opt').forEach((e, j) => {
    e.classList.toggle('sel', j === i);
    e.setAttribute('aria-pressed', j === i ? 'true' : 'false');
  });
}

function confirmQuiz() {
  if (quizSt.sel === null) { toast('Escolha uma opção primeiro! 🌸'); return; }
  const q = QUIZ[quizSt.i];
  const ok = quizSt.sel === q.c;
  if (ok) { quizSt.ok++; S.coins += 5; S.hearts += 2; save(); }
  document.querySelectorAll('.opt').forEach((e, j) => {
    e.onclick = null;
    if (j === q.c) e.classList.add('correct');
    if (j === quizSt.sel && !ok) e.classList.add('wrong');
  });
  const msg = ok
    ? 'Sua sensibilidade ilumina tudo ao redor, Celi! Com essas moedas, você está cada vez mais perto de desbloquear novas poesias exclusivas.'
    : 'Cada tentativa é uma semente de sabedoria. Continue florescendo no seu ritmo!';
  setTimeout(() => {
    document.getElementById('quizCard').innerHTML =
      '<div class="logo" style="width:70px;height:70px;font-size:2rem">🌻</div>' +
      '<span class="badge-tag">' + (ok ? '🎉 Resposta Exata! Parabéns, Celi! ✨' : '🌸 Quase! O carinho continua!') + '</span>' +
      '<h2>' + (ok ? 'Você acertou em cheio!' : 'Que bom tentar!') + '</h2>' +
      '<div class="stats"><div class="stat" style="background:#fdf3d8">+' + (ok ? 5 : 0) + ' 🪙<b>Moedas de Ouro</b></div><div class="stat" style="background:#fff">+' + (ok ? 2 : 0) + ' 💛<b>Afetos</b></div></div>' +
      '<div class="reflect" style="background:#fdf3d8"><span>💛</span><div><b>Mensagem para Celi</b><span>' + msg + '</span></div></div>' +
      '<button class="btn purple" onclick="nextQuiz()">' + (quizSt.i < 4 ? 'Próxima Pergunta (' + (quizSt.i + 2) + ' de 5) →' : 'Ver Resultado Final 🌻') + '</button>' +
      '<button class="btn gold" onclick="openPoems(\'locked\')">Desbloquear Poesias com Moedas 📖✨</button>';
    if (ok) confetti();
  }, 600);
}

function skipQuiz() { nextQuiz(); }

function nextQuiz() {
  if (quizSt.i < 4) {
    quizSt.i++;
    renderQuiz();
  } else {
    document.getElementById('quizCard').innerHTML =
      '<h2>🎯 Quiz Finalizado!</h2>' +
      '<p class="sub">Você acertou ' + quizSt.ok + ' de 5 perguntas!</p>' +
      '<p style="font-size:1.3rem;font-weight:800;color:#e8930c;margin:10px 0">+' + (quizSt.ok * 5) + ' moedas 🪙</p>' +
      '<button class="btn gold" onclick="openPoems(\'locked\')">Ir para o Jardim de Poesias 💝</button>' +
      '<button class="btn ghost" onclick="go(\'message\')">Voltar ao início</button>';
    confetti();
  }
}

/* ================= MINI-GAME ================= */
function startGame() {
  stopGame();
  gameSt = { score: 0, t: 30, paused: false, spawn: null, tick: null };
  document.getElementById('gameArea').innerHTML = '<div id="basket">CESTA DE AFETO</div>';
  document.getElementById('pauseBtn').innerHTML = '⏸ Pausar Jogo';
  gameSt.tick = setInterval(() => {
    if (gameSt.paused) return;
    gameSt.t--;
    updGame();
    if (gameSt.t <= 0) endGame();
  }, 1000);
  gameSt.spawn = setInterval(() => {
    if (!gameSt.paused) spawnFlower();
  }, 700);
  updGame();
}

function spawnFlower() {
  const a = document.getElementById('gameArea');
  const f = document.createElement('div');
  f.className = 'fall';
  f.textContent = ['🌻', '🌼', '🌸', '💛'][Math.floor(Math.random() * 4)];
  f.style.left = Math.random() * (a.offsetWidth - 50) + 'px';
  const dur = Math.random() * 2 + 2.5;
  f.style.animationDuration = dur + 's';
  f.onclick = () => {
    gameSt.score++;
    S.hearts += 1;
    save();
    const p = document.createElement('div');
    p.className = 'pop';
    p.textContent = '+1 💛';
    p.style.left = f.style.left;
    p.style.top = '40%';
    a.appendChild(p);
    setTimeout(() => p.remove(), 800);
    f.remove();
    updGame();
  };
  a.appendChild(f);
  setTimeout(() => f.remove(), dur * 1000);
}

function updGame() {
  if (!gameSt) return;
  document.getElementById('gScore').textContent = gameSt.score + ' / 15';
  document.getElementById('gTime').textContent = '00:' + String(Math.max(0, gameSt.t)).padStart(2, '0');
  const pct = Math.min(100, Math.round(gameSt.score / 15 * 100));
  document.getElementById('gBar').style.width = pct + '%';
  document.getElementById('gPct').textContent = pct + '% concluído';
  document.getElementById('stTime').textContent = Math.max(0, gameSt.t) + 's';
  document.getElementById('stGain').textContent = '+' + gameSt.score + ' 💛';
}

function togglePause() {
  if (!gameSt) return;
  gameSt.paused = !gameSt.paused;
  document.getElementById('pauseBtn').innerHTML = gameSt.paused ? '▶ Continuar' : '⏸ Pausar Jogo';
}

function stopGame() {
  if (gameSt) {
    clearInterval(gameSt.spawn);
    clearInterval(gameSt.tick);
    gameSt = null;
  }
}

function endGame() {
  const sc = gameSt.score;
  stopGame();
  const a = document.getElementById('gameArea');
  if (sc >= 15) {
    S.coins += 10;
    save();
    a.innerHTML = '<div style="padding:60px 20px"><h2>🎉 META ALCANÇADA!</h2><p class="sub">' + sc + ' flores coletadas! +10 🪙 e muito afeto, Celi!</p><button class="btn gold" onclick="startGame()">Jogar de Novo ↺</button></div>';
    confetti();
  } else {
    a.innerHTML = '<div style="padding:60px 20px"><h2>🌸 Quase lá!</h2><p class="sub">' + sc + ' flores. A meta era 15. Respire e tente de novo com carinho!</p><button class="btn gold" onclick="startGame()">Reiniciar ↺</button></div>';
  }
}

/* ================= POESIAS ================= */
function openPoems(f) {
  f = f || 'all';
  go('poems');
  document.getElementById('f-all').classList.toggle('on', f === 'all');
  document.getElementById('f-unlocked').classList.toggle('on', f === 'unlocked');
  document.getElementById('f-locked').classList.toggle('on', f === 'locked');
  document.getElementById('poemCount').textContent = S.unlocked.length + '/10';
  document.getElementById('poemBar').style.width = (S.unlocked.length * 10) + '%';
  const list = document.getElementById('poemList');
  list.innerHTML = '';
  POEMS.forEach(p => {
    const un = S.unlocked.includes(p.id);
    if (f === 'unlocked' && !un) return;
    if (f === 'locked' && un) return;
    const d = document.createElement('div');
    d.className = 'poem-item' + (un ? '' : ' locked');
    d.innerHTML =
      '<span class="badge-tag ' + (un ? 'pink' : '') + '" style="font-size:.72rem">' + (un ? '🌸 Desbloqueada' : '🔒 ' + p.c + ' 🪙') + '</span><br><b>' + p.t + '</b><p>"' + p.v.split('\n')[0] + '..."</p>' +
      (un
        ? '<button class="btn pink" onclick="openPoem(' + p.id + ')">Ler Poesia ♡</button>'
        : (S.coins >= p.c
          ? '<button class="btn gold" onclick="unlockPoem(' + p.id + ')">Desbloquear por ' + p.c + ' 🪙</button>'
          : '<button class="btn ghost" disabled>🔒 Requer ' + p.c + ' Moedas</button>'));
    list.appendChild(d);
  });
}

function unlockPoem(id) {
  const p = POEMS.find(x => x.id === id);
  if (S.coins < p.c) { toast('Moedas insuficientes! Jogue o Quiz 🪙'); return; }
  S.coins -= p.c;
  S.unlocked.push(id);
  save();
  confetti();
  openPoem(id);
}

function openPoem(id) {
  curPoem = POEMS.find(x => x.id === id);
  go('poem');
  document.getElementById('pvTitle').textContent = curPoem.t;
  document.getElementById('pvDed').textContent = 'Dedicado com carinho ao Cantinho da Celi 💛';
  document.getElementById('pvVerse').textContent = '"' + curPoem.v + '"';
  document.getElementById('pvNum').textContent = '🌸 Poesia ' + curPoem.id + ' de 10 cultivada';
  if (!S.read.includes(id)) {
    S.read.push(id);
    S.hearts += 2;
    save();
    toast('+2 Corações de carinho ganhos 💛');
  }
}

function savePoem() {
  if (S.saved.includes(curPoem.id)) { toast('Já guardada no seu coração! 💛'); return; }
  S.saved.push(curPoem.id);
  S.hearts += 1;
  save();
  toast('Guardada no seu coração! 💛');
}

function hearPoem() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(curPoem.v);
    u.lang = 'pt-BR';
    u.rate = .85;
    speechSynthesis.speak(u);
    toast('🎵 Ouvindo versos com carinho...');
  } else {
    toast('Seu navegador não suporta áudio 🎵');
  }
}

function poemText() {
  return '🌻 ' + curPoem.t + '\n\n' + curPoem.v + '\n\nPara ' + document.getElementById('dedInput').value + '\n"' + document.getElementById('sigInput').value + '"\n\n— Jardim da Celi • Flores Amarelas • 21 de Setembro';
}

function shareWhatsApp() {
  window.open('https://wa.me/?text=' + encodeURIComponent(poemText()), '_blank');
}

function copyPoem() {
  navigator.clipboard.writeText(poemText())
    .then(() => toast('Poesia copiada! 📋'))
    .catch(() => toast('Não foi possível copiar 😔'));
}

/* ================= COMPARTILHAR ================= */
function openShare() {
  document.getElementById('shareModal').classList.add('on');
  renderPreview();
  document.getElementById('shClose').focus();
}

function closeShare() {
  document.getElementById('shareModal').classList.remove('on');
}

function setRatio(r) {
  shSt.ratio = r;
  document.getElementById('r916').classList.toggle('on', r === '916');
  document.getElementById('r11').classList.toggle('on', r === '11');
  document.getElementById('shTitle').textContent = r === '916' ? 'Prévia para Stories 📸' : 'Prévia para Feed / Post 🖼️';
  document.getElementById('shShareBtn').innerHTML = r === '916' ? '📲 Compartilhar nos Stories' : '📲 Compartilhar no Feed / WhatsApp';
  renderPreview();
}

function setTheme(t) {
  shSt.theme = t;
  ['solar', 'sunset', 'night'].forEach(x => document.getElementById('t-' + x).classList.toggle('on', x === t));
  renderPreview();
}

function renderPreview() {
  const th = THEMES[shSt.theme];
  const p = document.getElementById('preview');
  p.className = shSt.ratio === '11' ? 'ratio11' : '';
  p.style.background = 'linear-gradient(160deg,' + th[0] + ',' + th[1] + ' 55%,' + th[2] + ')';
  p.innerHTML =
    '<div class="p-head">✨ Jardim da Celi • 21 de Setembro</div>' +
    '<div style="font-size:2.2rem">🌻</div>' +
    '<div class="p-card"><div class="p-title">🌻 ' + (curPoem ? curPoem.t : 'Força Interior') + '</div>' +
    '<div class="p-verse">"' + (curPoem ? curPoem.v : POEMS[0].v).split('\n').slice(0, 4).join(' ') + '..."</div>' +
    '<div style="margin-top:10px;font-weight:800;color:#fde68a">Para ' + document.getElementById('dedInput').value + ' 💛</div>' +
    '<div style="font-size:.8rem;font-style:italic">"' + document.getElementById('sigInput').value + '"</div></div>' +
    '<div style="font-size:1.2rem">🌻  ✨ 🌸</div>' +
    '<div class="p-foot">JARDIM-DA-CELI.AFETO</div>';
}

function downloadHD() {
  const w = 1080, h = shSt.ratio === '916' ? 1920 : 1080;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  const th = THEMES[shSt.theme];
  const g = x.createLinearGradient(0, 0, w * .4, h);
  g.addColorStop(0, th[0]);
  g.addColorStop(.55, th[1]);
  g.addColorStop(1, th[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.textAlign = 'center';
  x.fillStyle = '#fff';
  x.font = 'bold 52px Segoe UI';
  x.fillText('✨ Jardim da Celi • 21 de Setembro', w / 2, 180);
  x.font = '120px Segoe UI';
  x.fillText('🌻', w / 2, 340);
  x.font = 'bold 76px Segoe UI';
  x.fillStyle = '#fde68a';
  x.fillText(curPoem ? curPoem.t : 'Força Interior', w / 2, 500);
  x.font = 'italic 44px Segoe UI';
  x.fillStyle = '#fff';
  const lines = (curPoem ? curPoem.v : POEMS[0].v).split('\n');
  let y = 620;
  lines.forEach(l => {
    if (y < h - 320) { x.fillText(l, w / 2, y); y += 64; }
  });
  x.font = 'bold 52px Segoe UI';
  x.fillStyle = '#fde68a';
  x.fillText('Para ' + document.getElementById('dedInput').value + ' 💛', w / 2, h - 260);
  x.font = 'italic 40px Segoe UI';
  x.fillStyle = '#fff';
  x.fillText('"' + document.getElementById('sigInput').value + '"', w / 2, h - 190);
  x.font = '32px Segoe UI';
  x.fillText('JARDIM-DA-CELI.AFETO', w / 2, h - 90);
  const a = document.createElement('a');
  a.download = 'jardim-da-celi-' + (shSt.ratio === '916' ? 'stories' : 'feed') + '.png';
  a.href = cv.toDataURL('image/png');
  a.click();
  toast('Imagem HD baixada! 📥');
}

/* ================= INICIALIZAÇÃO ================= */
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeShare(); });
document.getElementById('nameInput').addEventListener('keypress', e => { if (e.key === 'Enter') enterByName(); });
renderProfile();
hud();