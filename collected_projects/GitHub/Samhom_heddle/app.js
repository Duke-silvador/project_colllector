import {DEFAULT_WARP, DEFAULT_WARP_ALT, DEFAULT_WEFT, DEFAULT_WEFT_ALT, LIMITS, TEXT_LIMIT, balanceNote, clothRepeat, cropToRepeat, draftFromJSON, editCell, floatReport, formatDraft, fullLiftNote, invertShed, loomNotes, looseCells, normalizeColor, parseDraftText, pointedThreading, resize, reverseThreading, reverseTreadling, rollThreading, rollTreadling, straightThreading, stripeColor, stuckShaftNote, tabbyTie, treadleAsDrawn, turnDraft, twillTie, warpFace, warpUp, yarnNote} from './engine.mjs';
import {PRESETS, plainWeave} from './drafts.mjs';
import {recordChange, redoChange, undoChange} from './history.mjs';

const CELL = 15;
const GAP = 3;

const threadingHost = document.querySelector('#threading');
const tieHost = document.querySelector('#tieup');
const treadHost = document.querySelector('#treadling');
const threadShafts = document.querySelector('#thread-shafts');
const threadEnds = document.querySelector('#thread-ends');
const tieShafts = document.querySelector('#tie-shafts');
const tieTreadles = document.querySelector('#tie-treadles');
const pickNumbers = document.querySelector('#pick-numbers');
const treadNumbers = document.querySelector('#tread-numbers');
const cloth = document.querySelector('#cloth');
const face = document.querySelector('#face');
const clothSize = document.querySelector('#cloth-size');
const sizeForm = document.querySelector('#size');
const sizeMsg = document.querySelector('#size-msg');
const loomNote = document.querySelector('#loom');
const warpInput = document.querySelector('#warp');
const weftInput = document.querySelector('#weft');
const warpAltInput = document.querySelector('#warp-alt');
const weftAltInput = document.querySelector('#weft-alt');
const warpBlockInput = document.querySelector('#warp-block');
const weftBlockInput = document.querySelector('#weft-block');
const repeatButton = document.querySelector('#repeat');
const undoButton = document.querySelector('#undo');
const redoButton = document.querySelector('#redo');
const keepButton = document.querySelector('#keep');
const swapButton = document.querySelector('#swap');
const keepMsg = document.querySelector('#keep-msg');
const invertButton = document.querySelector('#invert');
const reverseButton = document.querySelector('#reverse');
const mirrorButton = document.querySelector('#mirror');
const turnButton = document.querySelector('#turn');
const rollThreadButton = document.querySelector('#roll-thread');
const rollTreadButton = document.querySelector('#roll-tread');
const straightButton = document.querySelector('#straight');
const pointedButton = document.querySelector('#pointed');
const asDrawnButton = document.querySelector('#as-drawn');
const tabbyButton = document.querySelector('#tabby-tie');
const twillButton = document.querySelector('#twill-tie');
const cropButton = document.querySelector('#crop');
const scriptBox = document.querySelector('#script');
const scriptMsg = document.querySelector('#script-msg');
const sizeInputs = {
  ends: document.querySelector('#ends'),
  picks: document.querySelector('#picks'),
  shafts: document.querySelector('#shafts'),
  treadles: document.querySelector('#treadles')
};
const ctx = cloth.getContext('2d');
let pointer = null;

const sizeLabels = {ends: '经线', picks: '纬线', shafts: '综片', treadles: '踏板'};
for (const [key, input] of Object.entries(sizeInputs)) {
  input.min = String(LIMITS[key].min);
  input.max = String(LIMITS[key].max);
  input.addEventListener('change', applySize);
}
sizeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  applySize();
});

const presetHost = document.querySelector('#presets');
let draft = plainWeave();
let past = [];
let future = [];
let yarn = {warp: DEFAULT_WARP, weft: DEFAULT_WEFT, warpAlt: DEFAULT_WARP_ALT, weftAlt: DEFAULT_WEFT_ALT, warpBlock: 0, weftBlock: 0};
let repeat = 1;
let pendingFocus = null;
let loadNote = '';
let scriptDirty = false;

const STORAGE_KEY = 'heddle.draft';
const KEPT_KEY = 'heddle.kept';
let kept = null;
let keptNote = '';

function recall() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 20000) return;
    const stored = draftFromJSON(JSON.parse(raw));
    draft = stored.draft;
    yarn = {
      warp: stored.warp,
      weft: stored.weft,
      warpAlt: stored.warpAlt,
      weftAlt: stored.weftAlt,
      warpBlock: stored.warpBlock,
      weftBlock: stored.weftBlock
    };
    repeat = stored.repeat;
  } catch {
    loadNote = '上次的组织图读不出来，先打开平纹';
  }
}

function remember() {
  try {
    const payload = JSON.stringify({
      ends: draft.ends,
      picks: draft.picks,
      shafts: draft.shafts,
      treadles: draft.treadles,
      threading: draft.threading,
      tieUp: draft.tieUp,
      treadling: draft.treadling,
      warp: yarn.warp,
      weft: yarn.weft,
      warpAlt: yarn.warpAlt,
      weftAlt: yarn.weftAlt,
      warpBlock: yarn.warpBlock,
      weftBlock: yarn.weftBlock,
      repeat
    });
    if (payload.length > 20000) return;
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // 无痕窗口或空间满了时，这张图仍然留在页面上。
  }
}

function draftRecord(source) {
  return {
    ends: source.ends,
    picks: source.picks,
    shafts: source.shafts,
    treadles: source.treadles,
    threading: source.threading,
    tieUp: source.tieUp,
    treadling: source.treadling
  };
}

function recallKept() {
  try {
    const raw = localStorage.getItem(KEPT_KEY);
    if (!raw) return;
    if (raw.length > 20000) {
      keptNote = '留底读不出来';
      return;
    }
    kept = draftFromJSON(JSON.parse(raw)).draft;
  } catch {
    kept = null;
    keptNote = '留底读不出来';
  }
}

function storeKept(source) {
  const payload = JSON.stringify(draftRecord(source));
  if (payload.length > 20000) return false;
  localStorage.setItem(KEPT_KEY, payload);
  kept = draftFromJSON(JSON.parse(payload)).draft;
  return true;
}

function syncKept() {
  swapButton.disabled = kept === null;
  if (keptNote === '') return;
  keepMsg.textContent = keptNote;
  keptNote = '';
}

recall();
recallKept();

for (const preset of PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pill';
  button.dataset.preset = preset.id;
  button.textContent = preset.name;
  button.title = preset.title;
  button.addEventListener('click', () => {
    if (!commitDraft(preset.build())) return;
    pendingFocus = null;
    render();
  });
  presetHost.append(button);
}

function readCount(input, label) {
  const token = input.value.trim();
  if (!/^\d{1,3}$/.test(token)) throw new Error(`${label}要是整数`);
  return Number(token);
}

function syncSize() {
  for (const [key, input] of Object.entries(sizeInputs)) input.value = String(draft[key]);
}

function applySize() {
  try {
    const next = resize(draft, {
      ends: readCount(sizeInputs.ends, sizeLabels.ends),
      picks: readCount(sizeInputs.picks, sizeLabels.picks),
      shafts: readCount(sizeInputs.shafts, sizeLabels.shafts),
      treadles: readCount(sizeInputs.treadles, sizeLabels.treadles)
    });
    commitDraft(next);
    sizeMsg.textContent = '';
    pendingFocus = null;
    render();
  } catch (error) {
    sizeMsg.textContent = error instanceof Error ? error.message : '尺寸没有改成';
    syncSize();
  }
}

function shaftAt(row) {
  return draft.shafts - 1 - row;
}

function fillRuler(host, count, textAt) {
  host.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const span = document.createElement('span');
    span.textContent = textAt(index);
    host.append(span);
  }
}

function occasionalNumber(index, count) {
  const number = index + 1;
  if (number === 1 || number === count || number % 4 === 0) return String(number);
  return '';
}

function paintRulers() {
  fillRuler(threadShafts, draft.shafts, (row) => String(shaftAt(row) + 1));
  fillRuler(tieShafts, draft.shafts, (row) => String(shaftAt(row) + 1));
  fillRuler(threadEnds, draft.ends, (index) => occasionalNumber(index, draft.ends));
  fillRuler(tieTreadles, draft.treadles, (index) => String(index + 1));
  fillRuler(pickNumbers, draft.picks, (index) => occasionalNumber(index, draft.picks));
  fillRuler(treadNumbers, draft.treadles, (index) => String(index + 1));
}

function paintGrid(host, kind, rows, cols, labelAt, isOn) {
  host.replaceChildren();
  host.style.gridTemplateColumns = `repeat(${cols}, ${CELL}px)`;
  host.style.gridTemplateRows = `repeat(${rows}, ${CELL}px)`;
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const on = isOn(row, col);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = on ? 'cell on' : 'cell';
      const label = labelAt(row, col);
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      const focused = pendingFocus?.host === host && pendingFocus.row === row && pendingFocus.col === col;
      button.tabIndex = focused || (!pendingFocus && row === 0 && col === 0) ? 0 : -1;
      button.addEventListener('click', () => {
        if (!commitDraft(editCell(draft, {grid: kind, row, col}))) return;
        refreshCell(kind, row, col);
      });
      if (focused) queueMicrotask(() => button.focus());
      fragment.append(button);
    }
  }
  host.append(fragment);
}

function paintCloth() {
  const step = CELL + GAP;
  const copies = repeat === 2 ? 2 : 1;
  const ratio = window.devicePixelRatio || 1;
  const width = draft.ends * copies * step - GAP;
  const height = draft.picks * copies * step - GAP;
  cloth.width = Math.round(width * ratio);
  cloth.height = Math.round(height * ratio);
  cloth.style.width = `${width}px`;
  cloth.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const grid = warpUp(draft);
  const loose = looseCells(draft);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#a6843d';
  for (let copyY = 0; copyY < copies; copyY += 1) {
    for (let copyX = 0; copyX < copies; copyX += 1) {
      for (let pick = 0; pick < draft.picks; pick += 1) {
        for (let end = 0; end < draft.ends; end += 1) {
          const x = (copyX * draft.ends + end) * step;
          const y = (copyY * draft.picks + pick) * step;
          ctx.fillStyle = grid[pick][end]
            ? stripeColor(copyX * draft.ends + end, yarn.warpBlock, yarn.warp, yarn.warpAlt)
            : stripeColor(copyY * draft.picks + pick, yarn.weftBlock, yarn.weft, yarn.weftAlt);
          ctx.fillRect(x, y, CELL, CELL);
          const marked = pointer && (
            (pointer.axis === 'end' && end === pointer.index) ||
            (pointer.axis === 'pick' && pick === pointer.index)
          );
          if (marked) {
            ctx.fillStyle = 'rgba(166, 132, 61, 0.38)';
            ctx.fillRect(x, y, CELL, CELL);
          }
          if (loose.marks[pick][end]) ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        }
      }
    }
  }
}

function compactNumbers(numbers) {
  if (numbers.length === 0) return '';
  const parts = [];
  let start = numbers[0];
  let previous = numbers[0];
  for (const number of numbers.slice(1)) {
    if (number === previous + 1) {
      previous = number;
      continue;
    }
    parts.push(start === previous ? String(start) : `${start}–${previous}`);
    start = number;
    previous = number;
  }
  parts.push(start === previous ? String(start) : `${start}–${previous}`);
  return parts.join('、');
}

function sameDraft(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function commitDraft(next) {
  if (sameDraft(draft, next)) return false;
  const step = recordChange(past, future, draft, next);
  past = step.past;
  future = step.future;
  draft = step.current;
  return true;
}

function syncHistory() {
  undoButton.disabled = past.length === 0;
  redoButton.disabled = future.length === 0;
}

function undo() {
  const step = undoChange(past, future, draft);
  if (!step) return;
  past = step.past;
  future = step.future;
  draft = step.current;
  pendingFocus = null;
  scriptDirty = false;
  render();
}

function redo() {
  const step = redoChange(past, future, draft);
  if (!step) return;
  past = step.past;
  future = step.future;
  draft = step.current;
  pendingFocus = null;
  scriptDirty = false;
  render();
}

function markPresets() {
  for (const button of presetHost.querySelectorAll('button')) {
    const preset = PRESETS.find((item) => item.id === button.dataset.preset);
    button.setAttribute('aria-pressed', preset && sameDraft(draft, preset.build()) ? 'true' : 'false');
  }
}

function buttonAt(host, row, col, columns) {
  return host.children[row * columns + col];
}

function paintPressed(button, on) {
  button.classList.toggle('on', on);
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function refreshCell(kind, row, col) {
  if (kind === 'threading') {
    for (let shaftRow = 0; shaftRow < draft.shafts; shaftRow += 1) {
      paintPressed(buttonAt(threadingHost, shaftRow, col, draft.ends), draft.threading[col] === shaftAt(shaftRow));
    }
  } else if (kind === 'tie') {
    paintPressed(buttonAt(tieHost, row, col, draft.treadles), draft.tieUp[shaftAt(row)][col]);
  } else if (kind === 'treadling') {
    for (let treadle = 0; treadle < draft.treadles; treadle += 1) {
      paintPressed(buttonAt(treadHost, row, treadle, draft.treadles), draft.treadling[row] === treadle);
    }
  }
  if (loadNote === '') sizeMsg.textContent = '';
  showStats();
  syncClothCaption();
  markPresets();
  if (!scriptDirty) scriptBox.value = formatDraft(draft, yarn);
  paintCloth();
  remember();
  syncHistory();
}

function syncClothCaption() {
  const unit = clothRepeat(draft);
  const endsRepeat = unit.ends < draft.ends;
  const picksRepeat = unit.picks < draft.picks;
  let cycle = '';
  if (endsRepeat && picksRepeat) cycle = `，每 ${unit.ends} 经 × ${unit.picks} 纬一循环`;
  else if (endsRepeat) cycle = `，每 ${unit.ends} 经一循环`;
  else if (picksRepeat) cycle = `，每 ${unit.picks} 纬一循环`;
  let where = '';
  if (pointer?.axis === 'end' && pointer.index >= 0 && pointer.index < draft.ends) where = `，第 ${pointer.index + 1} 根经`;
  else if (pointer?.axis === 'pick' && pointer.index >= 0 && pointer.index < draft.picks) where = `，第 ${pointer.index + 1} 梭`;
  clothSize.textContent = `${draft.ends} 经 × ${draft.picks} 纬${repeat === 2 ? '，并了两份' : ''}${cycle}${where}`;
}

function showStats() {
  const ratio = warpFace(draft);
  const floats = floatReport(draft);
  const loose = looseCells(draft);
  const longest = Math.max(floats.warp, floats.weft);
  face.textContent = `经面 ${ratio.percent}% · 经浮 ${floats.warp} · 纬浮 ${floats.weft}`;
  face.classList.toggle('loose', floats.loose);
  const places = [];
  if (loose.warpEnds.length > 0) places.push(`第 ${compactNumbers(loose.warpEnds)} 根经`);
  if (loose.weftPicks.length > 0) places.push(`第 ${compactNumbers(loose.weftPicks)} 梭`);
  face.title = floats.loose
    ? `最长浮长 ${longest}，超过 4 根布容易松，出在${places.join('，')}。布面上用铜色圈出。循环接到下一份时连着的也算。`
    : '经浮是一根经连续压住的纬，纬浮是一梭纬连续压住的经。循环接到下一份时连着的也算。';
  syncLoomNote();
}

function syncLoomNote() {
  loomNote.textContent = [...loomNotes(draft), balanceNote(draft), fullLiftNote(draft), stuckShaftNote(draft), yarnNote(yarn)].filter(Boolean).join('。');
}

function render() {
  pointer = null;
  if (loadNote === '') sizeMsg.textContent = '';
  showStats();
  syncClothCaption();
  syncSize();
  syncYarnInputs();
  syncRepeat();
  if (!scriptDirty) scriptBox.value = formatDraft(draft, yarn);
  remember();
  markPresets();
  paintRulers();
  paintGrid(
    threadingHost,
    'threading',
    draft.shafts,
    draft.ends,
    (row, col) => `第 ${col + 1} 根经，第 ${shaftAt(row) + 1} 片综`,
    (row, col) => draft.threading[col] === shaftAt(row)
  );
  paintGrid(
    tieHost,
    'tie',
    draft.shafts,
    draft.treadles,
    (row, col) => `第 ${shaftAt(row) + 1} 片综，第 ${col + 1} 个踏板`,
    (row, col) => draft.tieUp[shaftAt(row)][col]
  );
  paintGrid(
    treadHost,
    'treadling',
    draft.picks,
    draft.treadles,
    (row, col) => `第 ${row + 1} 梭，第 ${col + 1} 个踏板`,
    (row, col) => draft.treadling[row] === col
  );
  paintCloth();
  pendingFocus = null;
  syncHistory();
  syncKept();
}

function syncYarnInputs() {
  warpInput.value = yarn.warp;
  weftInput.value = yarn.weft;
  warpAltInput.value = yarn.warpAlt;
  weftAltInput.value = yarn.weftAlt;
  warpBlockInput.value = String(yarn.warpBlock);
  weftBlockInput.value = String(yarn.weftBlock);
}

function syncRepeat() {
  repeatButton.textContent = repeat === 1 ? '看两份' : '看一份';
  repeatButton.setAttribute('aria-pressed', repeat === 2 ? 'true' : 'false');
}

function paintView() {
  syncYarnInputs();
  syncRepeat();
  syncClothCaption();
  if (!scriptDirty) scriptBox.value = formatDraft(draft, yarn);
  paintCloth();
  syncLoomNote();
  remember();
}

function setYarn(kind, input, fallback) {
  yarn[kind] = normalizeColor(input.value, fallback);
  paintView();
}

function applyBlock(kind, input) {
  const token = input.value.trim();
  if (!/^[0-8]$/.test(token)) {
    sizeMsg.textContent = '隔色要是 0 到 8';
    input.value = String(yarn[kind]);
    return;
  }
  yarn[kind] = Number(token);
  if (loadNote === '') sizeMsg.textContent = '';
  paintView();
}

warpInput.addEventListener('input', () => setYarn('warp', warpInput, DEFAULT_WARP));
weftInput.addEventListener('input', () => setYarn('weft', weftInput, DEFAULT_WEFT));
warpAltInput.addEventListener('input', () => setYarn('warpAlt', warpAltInput, DEFAULT_WARP_ALT));
weftAltInput.addEventListener('input', () => setYarn('weftAlt', weftAltInput, DEFAULT_WEFT_ALT));
warpBlockInput.addEventListener('change', () => applyBlock('warpBlock', warpBlockInput));
weftBlockInput.addEventListener('change', () => applyBlock('weftBlock', weftBlockInput));
repeatButton.addEventListener('click', () => {
  repeat = repeat === 2 ? 1 : 2;
  paintView();
});
scriptBox.addEventListener('input', () => {
  scriptDirty = true;
});
document.querySelector('#download-script').addEventListener('click', () => {
  const text = formatDraft(draft, yarn);
  scriptDirty = false;
  scriptBox.value = text;
  const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'heddle.txt';
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  scriptMsg.textContent = '已下载 heddle.txt';
});
document.querySelector('#copy-script').addEventListener('click', async () => {
  const text = formatDraft(draft, yarn);
  scriptDirty = false;
  scriptBox.value = text;
  try {
    await navigator.clipboard.writeText(text);
    scriptMsg.textContent = '已复制';
  } catch {
    scriptBox.focus();
    scriptBox.select();
    scriptMsg.textContent = '浏览器没有允许复制，文字已经选中';
  }
});
function useParsed(parsed, message) {
  commitDraft(parsed.draft);
  yarn = {
    warp: parsed.warp,
    weft: parsed.weft,
    warpAlt: parsed.warpAlt,
    weftAlt: parsed.weftAlt,
    warpBlock: parsed.warpBlock,
    weftBlock: parsed.weftBlock
  };
  scriptDirty = false;
  scriptMsg.textContent = message;
  pendingFocus = null;
  render();
}

document.querySelector('#read-script').addEventListener('click', () => {
  try {
    useParsed(parseDraftText(scriptBox.value), '已按这段排好');
  } catch (error) {
    scriptMsg.textContent = error instanceof Error ? error.message : '这段没有排成';
  }
});
const openFile = document.querySelector('#open-file');
document.querySelector('#open-script').addEventListener('click', () => {
  openFile.value = '';
  openFile.click();
});
openFile.addEventListener('change', async () => {
  const file = openFile.files?.[0];
  openFile.value = '';
  if (!file) return;
  if (file.size > TEXT_LIMIT) {
    scriptMsg.textContent = '这份组织图太长';
    return;
  }
  try {
    useParsed(parseDraftText(await file.text()), '已从文件排好');
  } catch (error) {
    scriptMsg.textContent = error instanceof Error ? error.message : '这段没有排成';
  }
});
function isTyping(target) {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

function applyMove(change) {
  if (!commitDraft(change(draft))) return;
  pendingFocus = null;
  render();
}

undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
keepButton.addEventListener('click', () => {
  try {
    if (!storeKept(draft)) {
      keepMsg.textContent = '这张图留不下';
      return;
    }
  } catch {
    keepMsg.textContent = '这张图留不下';
    return;
  }
  keepMsg.textContent = '已留底';
  syncKept();
});
swapButton.addEventListener('click', () => {
  if (!kept) return;
  const incoming = kept;
  try {
    if (!storeKept(draft)) {
      keepMsg.textContent = '这张图留不下';
      return;
    }
  } catch {
    keepMsg.textContent = '这张图留不下';
    return;
  }
  const changed = commitDraft(incoming);
  pendingFocus = null;
  scriptDirty = false;
  keepMsg.textContent = '已换上';
  if (changed) render();
  else syncKept();
});
invertButton.addEventListener('click', () => applyMove(invertShed));
reverseButton.addEventListener('click', () => applyMove(reverseTreadling));
mirrorButton.addEventListener('click', () => applyMove(reverseThreading));
turnButton.addEventListener('click', () => applyMove(turnDraft));
rollThreadButton.addEventListener('click', () => applyMove(rollThreading));
rollTreadButton.addEventListener('click', () => applyMove(rollTreadling));
straightButton.addEventListener('click', () => applyMove(straightThreading));
pointedButton.addEventListener('click', () => applyMove(pointedThreading));
asDrawnButton.addEventListener('click', () => applyMove(treadleAsDrawn));
tabbyButton.addEventListener('click', () => applyMove(tabbyTie));
twillButton.addEventListener('click', () => applyMove(twillTie));
cropButton.addEventListener('click', () => {
  if (!commitDraft(cropToRepeat(draft))) {
    sizeMsg.textContent = '已经是一个循环';
    return;
  }
  pendingFocus = null;
  render();
});

function pointerFrom(host, target) {
  const cell = target instanceof Element ? target.closest('.cell') : null;
  if (!cell || !host.contains(cell)) return null;
  if (host === threadingHost) return {axis: 'end', index: Number(cell.dataset.col)};
  return {axis: 'pick', index: Number(cell.dataset.row)};
}

function setPointer(next) {
  if (pointer?.axis === next?.axis && pointer?.index === next?.index) return;
  pointer = next;
  syncClothCaption();
  paintCloth();
}

function watchPointer(host) {
  const follow = (target) => {
    const next = pointerFrom(host, target);
    if (next) setPointer(next);
  };
  host.addEventListener('pointerover', (event) => follow(event.target));
  host.addEventListener('focusin', (event) => follow(event.target));
  host.addEventListener('pointerout', (event) => {
    if (host.contains(event.relatedTarget)) return;
    const focused = document.activeElement;
    if (focused instanceof Element && host.contains(focused) && focused.classList.contains('cell')) {
      follow(focused);
      return;
    }
    setPointer(null);
  });
  host.addEventListener('focusout', (event) => {
    if (host.contains(event.relatedTarget)) return;
    const hovered = host.querySelector('.cell:hover');
    if (hovered) {
      follow(hovered);
      return;
    }
    setPointer(null);
  });
}
watchPointer(threadingHost);
watchPointer(treadHost);
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !isTyping(event.target)) {
    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (key === 'y') {
      event.preventDefault();
      redo();
      return;
    }
  }
  const button = event.target;
  if (!(button instanceof HTMLButtonElement) || !button.classList.contains('cell')) return;
  const host = button.parentElement;
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const nextRow = row + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0);
    const nextCol = col + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0);
    host.querySelector(`button[data-row="${nextRow}"][data-col="${nextCol}"]`)?.focus();
    return;
  }
  if (!/^[1-8]$/.test(event.key)) return;
  const number = Number(event.key);
  if (host === threadingHost && number <= draft.shafts) {
    event.preventDefault();
    const visualRow = draft.shafts - number;
    if (!commitDraft(editCell(draft, {grid: 'threading', row: visualRow, col}))) return;
    refreshCell('threading', visualRow, col);
    buttonAt(threadingHost, visualRow, col, draft.ends)?.focus();
  } else if (host === treadHost && number <= draft.treadles) {
    event.preventDefault();
    const treadle = number - 1;
    if (!commitDraft(editCell(draft, {grid: 'treadling', row, col: treadle}))) return;
    refreshCell('treadling', row, treadle);
    buttonAt(treadHost, row, treadle, draft.treadles)?.focus();
  }
});

render();
if (loadNote) sizeMsg.textContent = loadNote;
loadNote = '';
