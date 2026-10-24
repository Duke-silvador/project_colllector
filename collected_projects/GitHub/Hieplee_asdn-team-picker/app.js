import members from './members.json' with { type: 'json' };
import skills from './skills.json' with { type: 'json' };
import { firebaseConfig, organizerUids, adminUid } from './cloud-config.js';

const STORAGE_KEY = 'asdn-team-picker-v1';
const $ = (selector) => document.querySelector(selector);
const MODES = ['cqb', 'outdoor'];
const CRITERIA = [['attack', 'Tấn công'], ['team', 'Phối hợp'], ['exp', 'Kinh nghiệm'], ['defense', 'Phòng thủ'], ['solo', 'Solo'], ['stamina', 'Thể lực']];
const STYLES = { push: 'Đẩy mục tiêu', hold: 'Giữ vị trí', mobile: 'Cơ động' };
const initial = { selected: [], guests: [], teamCount: 2, mode: 'cqb', assignments: {}, ratings: { cqb: {}, outdoor: {} }, styles: { cqb: {}, outdoor: {} }, stats: {} };
const cloudEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
let state = cloudEnabled ? structuredClone(initial) : loadState();
let canEdit = !cloudEnabled;
let cloudReady = !cloudEnabled;
let cloudAuth, cloudSignIn, cloudSignOut, cloudProvider, cloudSession, cloudAttributes, cloudDb, cloudFs;
const auditBase = { session: null, attributes: null };
const ready = { session: false, attributes: false };
const writeQueue = { session: Promise.resolve(), attributes: Promise.resolve() };
const pendingWrites = { session: 0, attributes: 0 };
let authBusy = false;
let search = '';
let toastTimer;

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch { return structuredClone(initial); }
}

function normalizeState(saved) {
  try {
    const guests = Array.isArray(saved.guests) ? saved.guests.filter(g => typeof g?.id === 'string' && typeof g?.name === 'string') : [];
    const ids = new Set([...members, ...guests].map(m => m.id));
    const selected = Array.isArray(saved.selected) ? [...new Set(saved.selected.filter(id => ids.has(id)))] : [];
    const teamCount = Number.isInteger(saved.teamCount) && saved.teamCount >= 2 && saved.teamCount <= 6 ? saved.teamCount : 2;
    const assignments = {};
    if (saved.assignments && typeof saved.assignments === 'object') {
      for (const id of selected) {
        const team = saved.assignments[id];
        if (Number.isInteger(team) && team >= 0 && team < teamCount) assignments[id] = team;
      }
    }
    const mode = MODES.includes(saved.mode) ? saved.mode : 'cqb';
    const ratings = { cqb: {}, outdoor: {} }, styles = { cqb: {}, outdoor: {} };
    for (const currentMode of MODES) {
      const sourceRatings = saved.ratings?.[currentMode] || (currentMode === 'cqb' ? saved.ratings : {});
      if (sourceRatings && typeof sourceRatings === 'object') {
        for (const [id, value] of Object.entries(sourceRatings)) {
          if (ids.has(id) && Number.isInteger(value) && value >= 1 && value <= 5) ratings[currentMode][id] = value;
        }
      }
      const sourceStyles = saved.styles?.[currentMode];
      if (sourceStyles && typeof sourceStyles === 'object') {
        for (const [id, value] of Object.entries(sourceStyles)) {
          if (ids.has(id) && STYLES[value]) styles[currentMode][id] = value;
        }
      }
    }
    const stats = {};
    if (saved.stats && typeof saved.stats === 'object') {
      for (const [id, detail] of Object.entries(saved.stats)) {
        if (!ids.has(id) || !detail || typeof detail !== 'object') continue;
        const clean = {};
        for (const [key] of CRITERIA) if (Number.isInteger(detail[key]) && detail[key] >= 1 && detail[key] <= 5) clean[key] = detail[key];
        if (Object.keys(clean).length) stats[id] = clean;
      }
    }
    return { selected, guests, teamCount, mode, assignments, ratings, styles, stats };
  } catch { return structuredClone(initial); }
}

function setSyncStatus(message, error = false) {
  const status = $('#sync-status');
  status.textContent = message;
  status.classList.toggle('sync-error', error);
}

function snapshotFlat(kind, snap) {
  const flat = {};
  if (kind === 'attributes') {
    for (const mode of MODES) {
      for (const [id, value] of Object.entries(snap.ratings?.[mode] || {})) flat[`ratings/${mode}/${id}`] = value;
      for (const [id, value] of Object.entries(snap.styles?.[mode] || {})) flat[`styles/${mode}/${id}`] = value;
    }
    for (const [id, value] of Object.entries(snap.stats || {})) flat[`stats/${id}`] = JSON.stringify(value);
  } else {
    snap.selected.forEach(id => { flat[`selected/${id}`] = true; });
    snap.guests.forEach(guest => { flat[`guests/${guest.id}`] = guest.name; });
    flat.teamCount = snap.teamCount;
    flat.mode = snap.mode;
    for (const [id, value] of Object.entries(snap.assignments || {})) flat[`assignments/${id}`] = value;
  }
  return flat;
}
function diffChanges(before, after) {
  if (!before) return [];
  const changes = [];
  for (const path of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[path] !== after[path]) changes.push({ path, before: before[path] ?? null, after: after[path] ?? null });
  }
  return changes;
}

function save(kind = 'session') {
  if (!cloudEnabled) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return; }
  if (!cloudReady || !canEdit) return;
  const snapshot = kind === 'attributes'
    ? { ratings: structuredClone(state.ratings), styles: structuredClone(state.styles), stats: structuredClone(state.stats) }
    : { selected: [...state.selected], guests: structuredClone(state.guests), teamCount: state.teamCount, mode: state.mode, assignments: structuredClone(state.assignments) };
  pendingWrites[kind]++;
  setSyncStatus('Đang lưu…');
  const changes = diffChanges(auditBase[kind], snapshotFlat(kind, snapshot));
  auditBase[kind] = snapshotFlat(kind, snapshot);
  writeQueue[kind] = writeQueue[kind].catch(() => {}).then(() => {
    const { doc, writeBatch, collection, serverTimestamp } = cloudFs;
    const batch = writeBatch(cloudDb);
    batch.set(kind === 'attributes' ? cloudAttributes : cloudSession, snapshot);
    if (changes.length) {
      const user = cloudAuth.currentUser;
      batch.set(doc(collection(cloudDb, 'auditLog')), { uid: user.uid, email: user.email || '', doc: kind === 'attributes' ? 'attributes' : 'current', changes: changes.slice(0, 300), at: serverTimestamp() });
    }
    return batch.commit();
  });
  writeQueue[kind].then(() => {
    pendingWrites[kind]--;
    if (!pendingWrites.session && !pendingWrites.attributes) setSyncStatus('Đã đồng bộ');
  }).catch(error => {
    pendingWrites[kind]--;
    setSyncStatus('Lưu thất bại', true);
    showToast(`Không lưu được: ${error.message}`);
  });
}

async function initCloud() {
  if (!cloudEnabled) {
    setSyncStatus('Bản demo trên thiết bị này');
    $('#auth-button').hidden = true;
    return;
  }
  try {
    const [{ initializeApp }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }, { initializeFirestore, doc, onSnapshot, writeBatch, collection, serverTimestamp, query, orderBy, limit, getDocs }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    cloudAuth = getAuth(app);
    cloudSignIn = signInWithPopup;
    cloudSignOut = signOut;
    cloudProvider = new GoogleAuthProvider();
    const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    cloudDb = db;
    cloudFs = { doc, writeBatch, collection, serverTimestamp, query, orderBy, limit, getDocs };
    cloudSession = doc(db, 'public', 'current');
    cloudAttributes = doc(db, 'public', 'attributes');
    onAuthStateChanged(cloudAuth, user => {
      canEdit = Boolean(user && organizerUids.includes(user.uid));
      const button = $('#auth-button');
      button.hidden = false;
      button.textContent = user ? (canEdit ? 'Tổ chức · Đăng xuất' : 'Đổi tài khoản') : 'Đăng nhập tổ chức';
      button.title = user?.uid || '';
      const isAdmin = Boolean(user && user.uid === adminUid);
      $('#audit-button').hidden = !isAdmin;
      if (!isAdmin) $('#audit-panel').hidden = true;
      render();
    });
    const loadTimer = setTimeout(() => {
      if (!cloudReady) setSyncStatus('Chưa kết nối được dữ liệu chung, đang thử lại…', true);
    }, 8000);
    const handleSnapshot = (kind, snapshot) => {
      ready[kind] = true;
      if (!pendingWrites[kind]) {
        const data = snapshot.exists() ? snapshot.data() : {};
        state = normalizeState({ ...state, ...data });
        const key = kind === 'attributes' ? 'attributes' : 'session';
        auditBase[key] = snapshotFlat(key, key === 'attributes' ? { ratings: state.ratings, styles: state.styles, stats: state.stats } : state);
      }
      cloudReady = ready.session && ready.attributes;
      if (cloudReady) clearTimeout(loadTimer);
      render();
      setSyncStatus(pendingWrites.session || pendingWrites.attributes ? 'Đang lưu…' : 'Đã đồng bộ');
    };
    const handleError = error => {
      clearTimeout(loadTimer);
      cloudReady = false;
      setSyncStatus('Không tải được dữ liệu chung', true);
      showToast(error.message);
    };
    onSnapshot(cloudSession, snapshot => handleSnapshot('session', snapshot), handleError);
    onSnapshot(cloudAttributes, snapshot => handleSnapshot('attributes', snapshot), handleError);
  } catch (error) {
    setSyncStatus('Không kết nối được dữ liệu chung', true);
    showToast(error.message);
  }
}
function allMembers() { return [...members, ...state.guests]; }
function findMember(id) { return allMembers().find(m => m.id === id); }
function initials(name) { return [...name.trim()][0]?.toUpperCase() || '?'; }
function styleFor(id) { return state.styles[state.mode][id]; }
function statsFor(id) { return state.stats[id] || skills[id]; }
function detailTotal(id) {
  const detail = statsFor(id);
  if (!detail) return undefined;
  const values = CRITERIA.map(([key]) => detail[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}
function skill(id) { return detailTotal(id) ?? 3; }
function hasSkill(id) { return detailTotal(id) !== undefined; }
function skillText(id) { return hasSkill(id) ? skill(id).toFixed(1) : '—'; }
const ROLE_LABELS = { admin: 'Ban Quản Trị', elder: 'Người Già', newbie: 'NewBie' };
function makeRoleIcons(member, withLabel = false) {
  const wrap = document.createElement('span'); wrap.className = 'role-icons';
  (member.roles || []).forEach((role) => { if (!ROLE_LABELS[role]) return; const img = document.createElement('img'); img.src = `icons/role-${role}.png`; img.alt = ROLE_LABELS[role]; img.title = ROLE_LABELS[role]; if (!withLabel) { wrap.append(img); return; } const chip = document.createElement('span'); chip.className = 'role-chip'; chip.append(img, ROLE_LABELS[role]); wrap.append(chip); });
  return wrap;
}
function makeAvatar(member, className) {
  if (!member.avatar) {
    const avatar = document.createElement('span');
    avatar.className = `${className} guest-avatar`;
    avatar.textContent = initials(member.name);
    return avatar;
  }
  const avatar = document.createElement('img');
  avatar.className = className;
  avatar.src = member.avatar;
  avatar.alt = '';
  avatar.loading = 'lazy';
  return avatar;
}

const expandedCards = new Set();
let rosterTouched = false;
const mobileQuery = window.matchMedia('(max-width: 700px)');
function applyRosterOpen() {
  const viewer = cloudEnabled && !canEdit;
  const open = rosterTouched ? !$('.roster-panel').classList.contains('roster-collapsed') : !(viewer && mobileQuery.matches);
  $('.roster-panel').classList.toggle('roster-collapsed', !open);
  const toggle = $('#roster-toggle');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'THU GỌN DANH SÁCH ▴' : 'MỞ DANH SÁCH ▾';
}

function renderRoster() {
  const container = $('#roster');
  container.replaceChildren();
  const normalized = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');
  const filtered = allMembers().filter(m => m.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').includes(normalized));
  for (const member of filtered) {
    const selected = state.selected.includes(member.id);
    const card = document.createElement('article');
    card.className = `member-card${selected ? ' selected' : ''}`;
    const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'card-pick';
    pick.disabled = !cloudReady || !canEdit;
    pick.setAttribute('aria-pressed', String(selected));
    pick.setAttribute('aria-label', `${selected ? 'Bỏ chọn' : 'Chọn'} ${member.name}`);
    const portrait = document.createElement('span'); portrait.className = 'card-portrait';
    portrait.append(makeAvatar(member, 'member-avatar'));
    const number = document.createElement('span'); number.className = 'card-number'; number.textContent = member.id.startsWith('guest-') ? 'GUEST' : `#${member.id}`;
    const check = document.createElement('span'); check.className = 'member-check'; check.setAttribute('aria-hidden', 'true'); check.textContent = selected ? '✓' : '+';
    const skillBadge = document.createElement('span'); skillBadge.className = 'card-skill'; skillBadge.textContent = skillText(member.id);
    const skillCaption = document.createElement('span'); skillCaption.textContent = 'SKILL'; skillBadge.append(skillCaption);
    portrait.append(number, check); pick.append(portrait);
    const info = document.createElement('span');
    info.className = 'member-info';
    const name = document.createElement('span'); name.className = 'member-name'; name.textContent = member.name; name.title = member.name;
    const id = document.createElement('span'); id.className = 'member-id'; id.textContent = member.tag || '';
    if (member.tag) id.classList.add('has-tag');
    if (member.roles && member.roles.length) id.prepend(makeRoleIcons(member, true));
    info.append(name, id, skillBadge); pick.append(info);
    pick.addEventListener('click', () => toggleMember(member.id));
    const styleRow = document.createElement('div'); styleRow.className = 'card-footer style-footer';
    const styleLabel = document.createElement('label'); styleLabel.textContent = 'LỐI CHƠI'; styleLabel.htmlFor = `style-${member.id}`;
    const styleSelect = document.createElement('select'); styleSelect.id = `style-${member.id}`; styleSelect.className = 'style-select';
    styleSelect.setAttribute('aria-label', `Lối chơi của ${member.name}`);
    styleSelect.add(new Option('— Chưa chọn', ''));
    for (const [value, label] of Object.entries(STYLES)) styleSelect.add(new Option(label, value));
    styleSelect.value = styleFor(member.id) || '';
    styleSelect.disabled = !canEdit || !cloudReady;
    styleSelect.addEventListener('change', () => {
      if (styleSelect.value) state.styles[state.mode][member.id] = styleSelect.value; else delete state.styles[state.mode][member.id];
      save('attributes'); renderTeams();
    });
    styleRow.append(styleLabel, styleSelect);
    {
      const chart = document.createElement('div'); chart.className = 'card-radar';
      chart.append(radarChart(statsFor(member.id), `Biểu đồ kỹ năng của ${member.name}`));
      const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'card-expand';
      const open = expandedCards.has(member.id);
      card.classList.toggle('expanded', open);
      expand.setAttribute('aria-expanded', String(open));
      expand.innerHTML = '<b></b><span></span>'; expand.firstChild.textContent = skillText(member.id); expand.lastChild.textContent = open ? 'ẨN BIỂU ĐỒ ▴' : 'XEM BIỂU ĐỒ ▾';
      expand.addEventListener('click', () => {
        const next = !expandedCards.has(member.id);
        if (next) expandedCards.add(member.id); else expandedCards.delete(member.id);
        card.classList.toggle('expanded', next);
        expand.setAttribute('aria-expanded', String(next));
        expand.lastChild.textContent = next ? 'ẨN BIỂU ĐỒ ▴' : 'XEM BIỂU ĐỒ ▾';
      });
      if (canEdit && cloudReady) chart.append(statsEditor(member));
      card.append(pick, expand, chart, styleRow);
    }
    if (member.id.startsWith('guest-') && canEdit && cloudReady) {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'guest-remove';
      remove.textContent = '✕'; remove.setAttribute('aria-label', `Xóa khách mời ${member.name}`); remove.title = 'Xóa khách mời';
      let armed = null;
      remove.addEventListener('click', () => {
        if (armed) { clearTimeout(armed); removeGuest(member.id); return; }
        remove.textContent = 'XÓA?'; remove.classList.add('armed');
        armed = setTimeout(() => { armed = null; remove.textContent = '✕'; remove.classList.remove('armed'); }, 3000);
      });
      card.append(remove);
    }
    container.append(card);
  }
  $('#empty-search').hidden = filtered.length > 0;
}

function statsEditor(member) {
  const wrap = document.createElement('div'); wrap.className = 'stats-edit';
  const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'stats-edit-button'; edit.textContent = '✎ SỬA CHỈ SỐ';
  edit.setAttribute('aria-label', `Sửa chỉ số của ${member.name}`);
  edit.addEventListener('click', () => {
    const form = document.createElement('form'); form.className = 'stats-form';
    const current = statsFor(member.id) || {};
    const inputs = CRITERIA.map(([key, name]) => {
      const label = document.createElement('label'); label.textContent = name;
      const select = document.createElement('select');
      select.add(new Option('—', ''));
      for (let n = 1; n <= 5; n++) select.add(new Option(String(n), String(n)));
      select.value = Number.isFinite(current[key]) ? String(current[key]) : '';
      label.append(select); form.append(label);
      return [key, select];
    });
    const save_ = document.createElement('button'); save_.type = 'submit'; save_.textContent = 'LƯU';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'HỦY';
    cancel.addEventListener('click', () => wrap.replaceChildren(edit));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const next = {};
      for (const [key, select] of inputs) if (select.value) next[key] = Number(select.value);
      if (Object.keys(next).length) state.stats[member.id] = next; else delete state.stats[member.id];
      save('attributes'); render();
    });
    form.append(save_, cancel); wrap.replaceChildren(form);
  });
  wrap.append(edit);
  return wrap;
}

function removeGuest(id) {
  const guest = state.guests.find(g => g.id === id);
  state.guests = state.guests.filter(g => g.id !== id);
  state.selected = state.selected.filter(value => value !== id);
  delete state.assignments[id];
  for (const mode of ['cqb', 'outdoor']) { delete state.ratings[mode][id]; delete state.styles[mode][id]; }
  delete state.stats[id];
  save(); save('attributes'); render();
  if (guest) showToast(`Đã xóa ${guest.name}.`);
}

function toggleMember(id) {
  if (state.selected.includes(id)) {
    state.selected = state.selected.filter(value => value !== id);
    delete state.assignments[id];
  } else {
    state.selected.push(id);
    if (Object.keys(state.assignments).length) state.assignments[id] = smallestTeam();
  }
  save(); render();
}

function smallestTeam() {
  const counts = Array(state.teamCount).fill(0);
  Object.values(state.assignments).forEach(index => { if (index < counts.length) counts[index]++; });
  return counts.indexOf(Math.min(...counts));
}

// Các cặp không được ở chung đội (thêm cặp mới bằng cách thêm [idA, idB]).
const SEPARATE_PAIRS = [
  // ['005', '007'], // ví dụ: Hoàng Nguyễn - Hoàng Trung (đang tắt)
];
const SEPARATE_PENALTY = 1000;
// Khi số người các đội lệch nhau (hơn kém 1), đội ít người hơn được bù thêm tổng kỹ năng
// bằng SIZE_GAP_BONUS điểm skill (thang 1-5).
const SIZE_GAP_BONUS = 0.5;

// Cân bằng Thể lực / Kinh nghiệm: rải đều người yếu (điểm <= *_LOW_MAX) và người giỏi (>= *_HIGH_MIN)
// giữa các đội; người chưa chấm điểm bị bỏ qua. Trọng số tương đương lối chơi (0.65).
const LOW_STAMINA_MAX = 2;
const LOW_EXP_MAX = 2;
const HIGH_EXP_MIN = 4;
const STAMINA_WEIGHT = 0.65;
const STAMINA_AVG_WEIGHT = 0.15;
const EXP_LOW_WEIGHT = 0.65;
const EXP_HIGH_WEIGHT = 0.4;

function rated(id, key) {
  const value = statsFor(id)?.[key];
  return Number.isFinite(value) ? value : undefined;
}

function brokenPairs(assignments) {
  return SEPARATE_PAIRS.filter(([a, b]) => Number.isInteger(assignments[a]) && assignments[a] === assignments[b]);
}

function shuffle(ids) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const j = values[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function scoreLayout(assignments, ids, teamCount) {
  const totals = Array(teamCount).fill(0), counts = Array(teamCount).fill(0);
  const styleCounts = Array.from({ length: teamCount }, () => ({ push: 0, hold: 0, mobile: 0 }));
  const styleTotals = { push: 0, hold: 0, mobile: 0 };
  for (const id of ids) {
    const team = assignments[id]; totals[team] += skill(id); counts[team]++;
    const style = styleFor(id);
    if (style) { styleCounts[team][style]++; styleTotals[style]++; }
  }
  // Phạt chênh lệch số người "yếu/giỏi" giữa các đội so với kỳ vọng theo quân số.
  const flags = [
    ['stamina', v => v <= LOW_STAMINA_MAX, STAMINA_WEIGHT],
    ['exp', v => v <= LOW_EXP_MAX, EXP_LOW_WEIGHT],
    ['exp', v => v >= HIGH_EXP_MIN, EXP_HIGH_WEIGHT],
  ];
  let attrPenalty = 0;
  for (const [key, test, weight] of flags) {
    const per = Array(teamCount).fill(0); let all = 0;
    for (const id of ids) { const v = rated(id, key); if (v !== undefined && test(v)) { per[assignments[id]]++; all++; } }
    if (all) attrPenalty += weight * per.reduce((sum, c, i) => sum + (c - all * counts[i] / ids.length) ** 2, 0);
  }
  const stam = Array(teamCount).fill(0), stamN = Array(teamCount).fill(0);
  for (const id of ids) { const v = rated(id, 'stamina'); if (v !== undefined) { stam[assignments[id]] += v; stamN[assignments[id]]++; } }
  const stamAll = stamN.reduce((a, b) => a + b, 0);
  if (stamAll) {
    const mean = stam.reduce((a, b) => a + b, 0) / stamAll;
    attrPenalty += STAMINA_AVG_WEIGHT * stam.reduce((sum, t, i) => sum + (stamN[i] ? (t / stamN[i] - mean) ** 2 : 0), 0);
  }
  const sumSkill = totals.reduce((a, b) => a + b, 0);
  const bonus = SIZE_GAP_BONUS ?? sumSkill / ids.length;
  const maxCount = Math.max(...counts);
  const deficits = counts.map(count => maxCount - count);
  const avgDeficit = deficits.reduce((a, b) => a + b, 0) / teamCount;
  // Tổng kỹ năng mục tiêu của mỗi đội: đội ít người hơn cao hơn đội đông người một khoảng bonus.
  const skillPenalty = totals.reduce((sum, total, index) => {
    const target = sumSkill / teamCount + (deficits[index] - avgDeficit) * bonus;
    return sum + ((total - target) / counts[index]) ** 2;
  }, 0);
  const stylePenalty = styleCounts.reduce((sum, team, index) => {
    for (const style of Object.keys(STYLES)) {
      const expected = styleTotals[style] * counts[index] / ids.length;
      sum += (team[style] - expected) ** 2;
    }
    return sum;
  }, 0);
  return skillPenalty + stylePenalty * 0.65 + attrPenalty + brokenPairs(assignments).length * SEPARATE_PENALTY;
}

// Khóa đội hình không phụ thuộc thứ tự đội: mỗi đội là tập thành viên đã sắp xếp.
function layoutKey(assignments, ids, teamCount) {
  const teams = Array.from({ length: teamCount }, () => []);
  ids.forEach(id => teams[assignments[id]].push(id));
  return teams.map(team => team.sort().join(',')).sort().join('|');
}

function randomIndex(length) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

// Số lần chia gần nhất được nhớ để không lặp lại, và độ lệch điểm tối đa so với phương án tốt nhất
// mà một đội hình vẫn được coi là "cân bằng đủ tốt" để chọn ngẫu nhiên.
const RECENT_LAYOUTS = 6;
const NEAR_BEST_TOLERANCE = 0.35;
const recentLayouts = [];

function addCandidate(candidates, assignments, ids, teamCount, score) {
  const key = layoutKey(assignments, ids, teamCount);
  if (!candidates.has(key)) candidates.set(key, { assignments: { ...assignments }, score, key });
}

function balancedAssignments(ids, teamCount, avoid = []) {
  const candidates = new Map();
  for (let attempt = 0; attempt < 64; attempt++) {
    const assignments = {};
    shuffle(ids).forEach((id, index) => { assignments[id] = index % teamCount; });
    let current = scoreLayout(assignments, ids, teamCount);
    for (let pass = 0; pass < 12; pass++) {
      let improved = false;
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        const first = ids[a], second = ids[b];
        if (assignments[first] === assignments[second]) continue;
        [assignments[first], assignments[second]] = [assignments[second], assignments[first]];
        const next = scoreLayout(assignments, ids, teamCount);
        if (next + 1e-9 < current) { current = next; improved = true; }
        else [assignments[first], assignments[second]] = [assignments[second], assignments[first]];
      }
      if (!improved) break;
    }
    addCandidate(candidates, assignments, ids, teamCount, current);
    // Các đội hình lân cận (đổi chỗ 1 cặp) của phương án cục bộ tốt cũng là ứng viên "gần tốt nhất".
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const first = ids[a], second = ids[b];
      if (assignments[first] === assignments[second]) continue;
      [assignments[first], assignments[second]] = [assignments[second], assignments[first]];
      addCandidate(candidates, { ...assignments }, ids, teamCount, scoreLayout(assignments, ids, teamCount));
      [assignments[first], assignments[second]] = [assignments[second], assignments[first]];
    }
  }
  const ranked = [...candidates.values()].sort((x, y) => x.score - y.score);
  const fresh = ranked.filter(c => !avoid.includes(c.key));
  const pool = fresh.length ? fresh : ranked;
  const limit = pool[0].score + Math.max(NEAR_BEST_TOLERANCE, pool[0].score * 0.25);
  const nearBest = pool.filter(c => c.score <= limit);
  const pick = nearBest[randomIndex(nearBest.length)];
  return { assignments: pick.assignments, key: pick.key };
}

function warnSeparatePairs() {
  const broken = brokenPairs(state.assignments);
  if (broken.length) showToast(`Cảnh báo: ${broken.map(pair => pair.map(id => findMember(id)?.name || id).join(' & ')).join(', ')} không nên chung đội.`);
}

function splitTeams() {
  if (state.selected.length < state.teamCount) { showToast(`Cần ít nhất ${state.teamCount} người cho ${state.teamCount} đội.`); return; }
  const currentKey = state.selected.every(id => Number.isInteger(state.assignments[id]))
    ? layoutKey(state.assignments, state.selected, state.teamCount) : null;
  const avoid = [...recentLayouts, currentKey].filter(Boolean);
  const { assignments, key } = balancedAssignments(state.selected, state.teamCount, avoid);
  state.assignments = assignments;
  recentLayouts.push(key);
  if (recentLayouts.length > RECENT_LAYOUTS) recentLayouts.shift();
  save(); render();
  warnSeparatePairs();
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTeams() {
  const hasResult = state.selected.length > 0 && state.selected.every(id => Number.isInteger(state.assignments[id]));
  $('#results').hidden = !hasResult;
  if (!hasResult) return;
  const teams = Array.from({ length: state.teamCount }, () => []);
  for (const id of state.selected) {
    const member = findMember(id);
    if (member && state.assignments[id] < teams.length) teams[state.assignments[id]].push(member);
  }
  const container = $('#teams'); container.replaceChildren();
  const series = [];
  container.classList.toggle('many', state.teamCount > 2);
  teams.forEach((people, index) => {
    const card = document.createElement('article'); card.className = 'team-card';
    const head = document.createElement('div'); head.className = 'team-head';
    const title = document.createElement('h3'); title.textContent = `Đội ${String(index + 1).padStart(2, '0')}`;
    const count = document.createElement('span'); count.textContent = `${people.length} NGƯỜI · TB ${(people.reduce((sum, person) => sum + skill(person.id), 0) / (people.length || 1)).toFixed(1)} SKILL`;
    head.append(title, count);
    const list = document.createElement('div'); list.className = 'team-list';
    if (!people.length) { const empty = document.createElement('p'); empty.className = 'team-empty'; empty.textContent = 'Chưa có thành viên.'; list.append(empty); }
    people.forEach(member => {
      const row = document.createElement('div'); row.className = 'team-person';
      row.append(makeAvatar(member, 'team-avatar'));
      const text = document.createElement('div'); text.className = 'team-person-text';
      const name = document.createElement('span'); name.className = 'team-person-name'; name.textContent = member.name; name.title = member.name; text.append(name);
      if (member.roles && member.roles.length) { const roleLine = document.createElement('span'); roleLine.className = 'team-tag'; roleLine.append(makeRoleIcons(member, true)); if (member.tag) roleLine.append(member.tag); text.append(roleLine); }
      else if (member.tag) { const tag = document.createElement('span'); tag.className = 'team-tag'; tag.textContent = member.tag; text.append(tag); }
      row.append(text);
      const style = document.createElement('span'); style.className = 'team-style'; style.textContent = styleFor(member.id) ? STYLES[styleFor(member.id)] : '—'; style.title = styleFor(member.id) ? 'Lối chơi' : 'Chưa chọn lối chơi'; row.append(style);
      const badge = document.createElement('span'); badge.className = 'team-skill'; badge.textContent = `★ ${skillText(member.id)}`; badge.title = hasSkill(member.id) ? 'Điểm tổng' : 'Chưa đánh giá, tính tạm là 3'; row.append(badge);
      const select = document.createElement('select'); select.setAttribute('aria-label', `Đổi đội cho ${member.name}`);
      teams.forEach((_, teamIndex) => { const option = new Option(`Đội ${teamIndex + 1}`, String(teamIndex)); select.add(option); });
      select.value = String(index);
      select.disabled = !cloudReady || !canEdit;
      select.hidden = !canEdit;
      select.addEventListener('change', () => { state.assignments[member.id] = Number(select.value); save(); renderTeams(); warnSeparatePairs(); });
      row.append(select); list.append(row);
    });
    const color = TEAM_COLORS[index % TEAM_COLORS.length];
    card.style.borderTop = `3px solid ${color}`;
    title.prepend(Object.assign(document.createElement('i'), { className: 'team-dot' }));
    title.firstChild.style.background = color;
    const average = teamAverage(people);
    if (Object.keys(average).length) series.push({ values: average, color, name: `Đội ${index + 1}` });
    card.append(head, list);
    container.append(card);
  });
  let compare = $('#team-compare');
  if (!compare) { compare = document.createElement('div'); compare.id = 'team-compare'; compare.className = 'team-compare'; container.before(compare); }
  compare.replaceChildren();
  compare.hidden = series.length === 0;
  if (series.length) {
    const legend = document.createElement('div'); legend.className = 'compare-legend';
    series.forEach(({ name, color }) => { const item = document.createElement('span'); const dot = document.createElement('i'); dot.className = 'team-dot'; dot.style.background = color; item.append(dot, name); legend.append(item); });
    compare.append(radarChart({}, 'Biểu đồ so sánh các đội', series), legend);
  }
  $('#result-summary').textContent = `${state.mode === 'cqb' ? 'CQB' : 'Sân ngoài trời'} · ${state.selected.length} người · ${state.teamCount} đội · ${state.selected.filter(hasSkill).length} người đã có skill`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function gradeOf(value) { return value >= 4.8 ? 'S' : value >= 4.2 ? 'A' : value >= 3.5 ? 'B' : value >= 2.5 ? 'C' : 'D'; }
const GRADE_COLORS = { S: '#f4d35e', A: '#c8f36b', B: '#6fd3ff', C: '#7be0a0', D: '#f4a45f' };
const TEAM_COLORS = ['#c8f36b', '#f4a45f', '#6fd3ff', '#f472b6', '#a78bfa', '#f4d35e'];
function radarChart(values = {}, label, series = null) {
  const cx = 130, cy = 140, radius = 72, step = (Math.PI * 2) / CRITERIA.length;
  const point = (index, scale, extra = 0) => {
    const angle = -Math.PI / 2 + index * step, length = radius * scale + extra;
    return [cx + length * Math.cos(angle), cy + length * Math.sin(angle)];
  };
  const polygon = scale => CRITERIA.map((_, index) => point(index, scale).map(n => n.toFixed(1)).join(',')).join(' ');
  const svg = svgEl('svg', { viewBox: '-40 0 340 275', class: 'skill-radar', role: 'img', 'aria-label': label });
  svg.append(svgEl('rect', { x: -40, y: 0, width: 340, height: 275, rx: 14, class: 'radar-bg' }));
  for (let level = 5; level >= 1; level--) svg.append(svgEl('polygon', { points: polygon(level / 5), class: level === 5 ? 'radar-ring outer' : 'radar-ring' }));
  CRITERIA.forEach((_, index) => { const [x, y] = point(index, 1); svg.append(svgEl('line', { x1: cx, y1: cy, x2: x.toFixed(1), y2: y.toFixed(1), class: 'radar-axis' })); });
  const shape = CRITERIA.map(([key], index) => point(index, Math.max(values[key] ?? 0, 0.3) / 5).map(n => n.toFixed(1)).join(',')).join(' ');
  const hasValues = !series && CRITERIA.some(([key]) => Number.isFinite(values[key]));
  if (hasValues) svg.append(svgEl('polygon', { points: shape, class: 'radar-shape' }));
  for (const { values: teamValues, color } of series || []) {
    const pts = CRITERIA.map(([key], index) => point(index, Math.max(teamValues[key] ?? 0, 0.3) / 5));
    svg.append(svgEl('polygon', { points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), fill: color, 'fill-opacity': 0.18, stroke: color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
    pts.forEach(([x, y]) => svg.append(svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3, fill: color })));
  }
  CRITERIA.forEach(([key, name], index) => {
    const value = values[key];
    const [px, py] = point(index, Math.max(value ?? 0, 0.3) / 5);
    if (hasValues) svg.append(svgEl('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 2.6, class: 'radar-dot' }));
    const [lx, ly] = point(index, 1, 30);
    const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
    const dx = anchor === 'start' ? -8 : anchor === 'end' ? 8 : 0;
    svg.append(svgEl('text', { x: (lx + dx).toFixed(1), y: (ly + (index === 0 ? -10 : 18)).toFixed(1), 'text-anchor': anchor, class: 'radar-label' }, name));
    if (!series && Number.isFinite(value)) {
      const grade = gradeOf(value), color = GRADE_COLORS[grade];
      const [gx, gy] = point(index, 1, 15);
      svg.append(svgEl('circle', { cx: gx.toFixed(1), cy: gy.toFixed(1), r: 9, fill: '#101714', stroke: color, 'stroke-width': 1.6 }));
      svg.append(svgEl('text', { x: gx.toFixed(1), y: (gy + 3.6).toFixed(1), 'text-anchor': 'middle', class: 'radar-grade', fill: color }, grade));
    }
  });
  return svg;
}
function teamAverage(people) {
  const result = {};
  for (const [key] of CRITERIA) {
    const values = people.map(person => statsFor(person.id)?.[key]).filter(Number.isFinite);
    if (values.length) result[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return result;
}
function render() {
  document.querySelectorAll('.mode-button, .team-count, #select-all, #clear-all, #guest-name, #guest-form button, #reshuffle').forEach(control => { control.disabled = !cloudReady || !canEdit; });
  $('#roster-total').textContent = allMembers().length;
  $('#selected-total').textContent = state.selected.length;
  $('#selected-count').textContent = state.selected.length;
  $('#team-total').textContent = state.teamCount;
  document.querySelectorAll('.team-count').forEach(button => {
    const active = Number(button.dataset.count) === state.teamCount;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.mode-button').forEach(button => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  const ready = state.selected.length >= state.teamCount;
  $('#split-button').disabled = !ready || !cloudReady || !canEdit;
  $('#setup-message').textContent = !cloudReady ? 'Đang tải dữ liệu chung…' : !canEdit ? 'Chỉ người tổ chức được chọn người và chia đội. Bạn đang ở chế độ xem.' : ready ? `${state.selected.length} người sẽ được chia vào ${state.teamCount} đội.` : `Chọn ít nhất ${state.teamCount} người để tạo ${state.teamCount} đội.`;
  const viewer = cloudEnabled && !canEdit;
  document.body.classList.toggle('viewer', viewer);
  $('#viewer-empty').hidden = !viewer || !cloudReady || state.selected.length > 0 && state.selected.every(id => Number.isInteger(state.assignments[id]));
  $('#mobile-bar').hidden = viewer;
  $('#bar-count').textContent = state.selected.length;
  $('#bar-teams').textContent = state.teamCount;
  $('#bar-split').disabled = !ready || !cloudReady || !canEdit;
  applyRosterOpen();
  renderRoster(); renderTeams();
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

$('#search').addEventListener('input', event => { search = event.target.value; renderRoster(); });
$('#select-all').addEventListener('click', () => {
  const ids = allMembers().map(m => m.id);
  for (const id of ids) if (!state.selected.includes(id)) { state.selected.push(id); if (Object.keys(state.assignments).length) state.assignments[id] = smallestTeam(); }
  save(); render();
});
$('#clear-all').addEventListener('click', () => { state.selected = []; state.assignments = {}; save(); render(); });
$('#guest-form').addEventListener('submit', event => {
  event.preventDefault(); const input = $('#guest-name'); const name = input.value.trim();
  if (!name) return;
  const id = `guest-${crypto.randomUUID()}`;
  state.guests.push({ id, name }); state.selected.push(id);
  if (Object.keys(state.assignments).length) state.assignments[id] = smallestTeam();
  input.value = ''; save(); render(); showToast(`Đã thêm ${name}.`);
});
document.querySelectorAll('.team-count').forEach(button => button.addEventListener('click', () => {
  state.teamCount = Number(button.dataset.count); state.assignments = {}; save(); render();
}));
document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode === state.mode) return;
  state.mode = button.dataset.mode; state.assignments = {}; save(); render();
}));
$('#roster-toggle').addEventListener('click', () => {
  rosterTouched = true;
  const panel = $('.roster-panel');
  panel.classList.toggle('roster-collapsed', !panel.classList.contains('roster-collapsed'));
  applyRosterOpen();
});
mobileQuery.addEventListener('change', () => { if (!rosterTouched) render(); });
$('#split-button').addEventListener('click', splitTeams);
$('#bar-split').addEventListener('click', splitTeams);
$('#reshuffle').addEventListener('click', splitTeams);
$('#copy-result').addEventListener('click', async () => {
  const lines = [`ASDN · ${state.mode === 'cqb' ? 'CQB' : 'SÂN NGOÀI TRỜI'} · ĐỘI HÌNH (${state.selected.length} người)`];
  for (let i = 0; i < state.teamCount; i++) {
    const names = state.selected.filter(id => state.assignments[id] === i).map(id => findMember(id)?.name).filter(Boolean);
    lines.push('', `ĐỘI ${i + 1} (${names.length} người)`, ...names.map((name, index) => `${index + 1}. ${name}`));
  }
  try { await navigator.clipboard.writeText(lines.join('\n')); showToast('Đã sao chép đội hình.'); }
  catch { showToast('Không sao chép được. Hãy dùng HTTPS hoặc localhost.'); }
});

$('#auth-button').addEventListener('click', async () => {
  if (!cloudAuth || authBusy) return;
  authBusy = true;
  $('#auth-button').disabled = true;
  try {
    if (canEdit) {
      await cloudSignOut(cloudAuth);
      showToast('Đã đăng xuất tài khoản tổ chức.');
    } else {
      if (cloudAuth.currentUser) await cloudSignOut(cloudAuth);
      await cloudSignIn(cloudAuth, cloudProvider);
    }
  } catch (error) {
    showToast(`Đăng nhập thất bại: ${error.message}`);
  } finally {
    authBusy = false;
    $('#auth-button').disabled = false;
  }
});

render();
initCloud();

const PATH_LABELS = { selected: 'Điểm danh', guests: 'Khách mời', teamCount: 'Số đội', mode: 'Chế độ', assignments: 'Đội', ratings: 'Điểm đánh giá', styles: 'Lối chơi', stats: 'Chỉ số' };
function describeChange({ path, before, after }) {
  const [group, a, b] = path.split('/');
  const modeIndex = group === 'ratings' || group === 'styles';
  const id = modeIndex ? b : a;
  const name = findMember(id)?.name || (group === 'guests' ? after ?? before : id);
  const label = PATH_LABELS[group] || group;
  const where = modeIndex ? ` (${a})` : '';
  const show = value => value === null ? '—' : group === 'stats' ? Object.entries(JSON.parse(value)).map(([k, v]) => `${k}:${v}`).join(' ') : String(value);
  if (group === 'selected') return `${label}: ${name} ${after ? 'tham gia' : 'bỏ chọn'}`;
  if (group === 'guests') return `${label}: ${after ? 'thêm' : 'xóa'} ${name}`;
  if (group === 'teamCount' || group === 'mode') return `${label}: ${show(before)} → ${show(after)}`;
  if (group === 'assignments') return `${label}: ${name} ${before === null ? '' : `Đội ${before + 1} `}→ ${after === null ? '—' : `Đội ${after + 1}`}`;
  return `${label}${where}: ${name} ${show(before)} → ${show(after)}`;
}
let auditLoading = false, auditLoaded = false;
async function loadAudit() {
  if (auditLoading) return;
  auditLoading = true;
  const list = $('#audit-list'); list.textContent = 'Đang tải…';
  try {
    const { query, collection, orderBy, limit, getDocs } = cloudFs;
    const snap = await getDocs(query(collection(cloudDb, 'auditLog'), orderBy('at', 'desc'), limit(100)));
    list.replaceChildren();
    auditLoaded = true;
    if (snap.empty) list.textContent = 'Chưa có lịch sử.';
    snap.forEach(entry => {
      const data = entry.data();
      const item = document.createElement('li');
      const head = document.createElement('strong');
      head.textContent = `${data.at?.toDate().toLocaleString('vi-VN') || '…'} · ${data.email || data.uid}`;
      const body = document.createElement('div');
      body.textContent = data.changes.map(describeChange).join('; ');
      item.append(head, body);
      list.append(item);
    });
  } catch (error) { list.textContent = `Không tải được lịch sử: ${error.message}. Bấm "Tải lại" để thử lại.`; }
  finally { auditLoading = false; }
}
$('#audit-button').addEventListener('click', () => {
  const panel = $('#audit-panel'); panel.hidden = !panel.hidden;
  if (!panel.hidden) { if (!auditLoaded) loadAudit(); panel.scrollIntoView({ behavior: 'smooth' }); }
});
$('#audit-refresh').addEventListener('click', loadAudit);
