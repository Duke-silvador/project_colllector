const spin = document.querySelector('#spin');
const wheel = document.querySelector('.wheel');
const wrap = document.querySelector('.wheel-wrap');
const popup = document.querySelector('dialog');
const status = document.querySelector('#status');
const outcomes = ['Да', 'Нет', 'Да', 'Нет', 'Да', 'Нет', 'Да', 'Нет'];
let rotation = 0, busy = false, sound = false, audio;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function tone(frequency, duration = .035) {
  if (!sound || !audio) return;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.035, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
document.querySelector('.sound').addEventListener('click', async event => {
  sound = !sound;
  if (sound) {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); await audio.resume(); }
    catch { sound = false; }
  }
  event.target.textContent = sound ? 'Звук: вкл.' : 'Звук: выкл.';
  event.target.setAttribute('aria-pressed', String(sound));
});
function celebrate() {
  if (reduced.matches) return;
  const container = document.querySelector('#confetti');
  container.replaceChildren();
  for (let i = 0; i < 65; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetto';
    piece.style.cssText = `left:${Math.random()*100}%;background:${['#efca73','#da6d58','#8fb89b','#fff1cc'][i%4]};animation-delay:${Math.random()*.5}s;--drift:${Math.random()*240-120}px`;
    container.append(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}
spin.addEventListener('click', async () => {
  if (busy) return;
  busy = true; spin.disabled = true; spin.textContent = 'Крутится…';
  status.textContent = 'Ну, Гриша, держись.';
  wrap.classList.add('spinning');
  const random = new Uint32Array(1); crypto.getRandomValues(random);
  const winningSectors = outcomes.flatMap((label, index) => label === 'Да' ? [index] : []);
  const index = winningSectors[random[0] % winningSectors.length];
  const targetAngle = (360 - (index * 45 + 22.5)) % 360;
  const next = rotation + 360 * 6 + ((targetAngle - rotation % 360 + 360) % 360);
  const duration = reduced.matches ? 100 : 4400;
  const timer = setInterval(() => tone(600 + Math.random() * 250), 120);
  try {
    const animation = wheel.animate([{transform:`rotate(${rotation}deg)`},{transform:`rotate(${next}deg)`}], {duration, easing:'cubic-bezier(.12,.72,.12,1)', fill:'forwards'});
    await animation.finished;
    rotation = next;
    wheel.style.transform = `rotate(${rotation}deg)`;
    animation.cancel();
    const yes = outcomes[index] === 'Да';
    document.querySelector('#popup-title').textContent = yes ? 'Кайфово' : 'Не сегодня';
    document.querySelector('#popup-message').textContent = yes ? 'Гриша, зови ребят. Обмываем бьюик!' : 'Ладно. Может, ещё разок?';
    document.querySelector('.done').textContent = yes ? 'Договорились!' : 'Ещё разок';
    status.textContent = `Выпало: «${outcomes[index]}».`;
    if (yes) { celebrate(); tone(880, .25); }
    popup.showModal();
  } finally {
    clearInterval(timer); wrap.classList.remove('spinning');
    busy = false; spin.disabled = false; spin.textContent = 'Крутить колесо';
  }
});
document.querySelectorAll('.close,.done').forEach(button => button.addEventListener('click', () => popup.close()));
