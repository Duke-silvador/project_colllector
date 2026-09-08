const LINES = [
  '宝宝对不起！我把你的生日忘得一干二净……',
  '我错了！忘记你的生日，先给您鞠一躬！',
  '连宝宝的生日都能忘，我这就把自己打包寄走',
  '对不起宝宝，我的脑子请假了，没带上我',
  '我错了宝宝，请宝宝从重发落（但别不理我）',
  '宝宝消消气，我忏悔，我面壁！',
  '全世界最坏的人就是我，居然忘了宝宝的生日！',
  '这一躬鞠给全世界最好的宝宝，原谅我这一次嘛～',
];

const IMG_STAND = 'Cartoon/apologize1.png';
const IMG_BOW = 'Cartoon/apologize2.png';

const btn = document.getElementById('apologizeBtn');
const img = document.getElementById('apologyImg');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubbleText');
const muteBtn = document.getElementById('muteBtn');

let playing = false;
let lastIndex = -1;
let timers = [];
let muted = localStorage.getItem('apologize-muted') === '1';

new Image().src = IMG_BOW;

function pickLine() {
  let i;
  do {
    i = Math.floor(Math.random() * LINES.length);
  } while (LINES.length > 1 && i === lastIndex);
  lastIndex = i;
  return LINES[i];
}

// 返回是否会真的朗读；不会朗读时由调用方用估算时长兜底
function speakApology(text, onEnd) {
  if (muted || !('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  utterance.pitch = 1.2;
  const voice = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('zh'));
  if (voice) utterance.voice = voice;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  speechSynthesis.speak(utterance);
  return true;
}

function setMuted(value) {
  muted = value;
  localStorage.setItem('apologize-muted', value ? '1' : '0');
  muteBtn.textContent = value ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(value));
  if (value && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    // 部分浏览器 cancel 后不触发 onend，兜底收尾
    if (playing) timers.push(setTimeout(finishApology, 400));
  }
}

function restartAnimation(el, ...classes) {
  el.classList.remove(...classes);
  void el.offsetWidth;
  el.classList.add(...classes);
}

function finishApology() {
  if (!playing) return;
  playing = false;
  img.src = IMG_STAND;
  btn.textContent = '认不认罪？ 🙇';
  btn.hidden = false;
}

function apologize() {
  if (playing) return;
  playing = true;
  timers.forEach(clearTimeout);
  timers = [];

  btn.hidden = true;
  img.src = IMG_BOW;

  const line = pickLine();
  bubbleText.textContent = line;
  bubble.hidden = false;
  restartAnimation(bubble, 'show');

  const speaking = speakApology(line, finishApology);
  if (!speaking) {
    // 静音或不支持语音时，按文案长度估算鞠躬时长
    timers.push(setTimeout(finishApology, Math.max(2000, line.length * 320)));
  }
}

btn.addEventListener('click', apologize);
muteBtn.addEventListener('click', () => setMuted(!muted));

setMuted(muted);
