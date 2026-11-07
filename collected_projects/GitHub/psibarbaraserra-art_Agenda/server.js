'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const QRCode = require('qrcode');

const store = require('./lib/store');
const { SERVICES, MATERIALS } = require('./lib/content');
const { DIMENSIONS, allItems, publicQuestionnaire } = require('./lib/questionnaire');
const { buildReport } = require('./lib/report');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

const db = store.load();
// Modo demonstração: carrega uma empresa de exemplo quando o banco está vazio
if (process.env.DEMO && db.companies.length === 0) require('./scripts/seed-demo')();
const save = store.save;
const SESSION_DAYS = 14;

/* ----------------------------- Autenticação ----------------------------- */
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}
function checkPassword(pw, user) {
  const { hash } = hashPassword(pw, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}
function currentUser(req) {
  const sid = parseCookies(req).mc_sid;
  if (!sid) return null;
  const s = db.sessions.find(x => x.id === sid && new Date(x.expires) > new Date());
  return s ? db.users.find(u => u.id === s.userId) : null;
}
function setSession(res, userId) {
  const sid = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.sessions = db.sessions.filter(s => new Date(s.expires) > new Date());
  db.sessions.push({ id: sid, userId, expires: expires.toISOString() });
  save();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.set('Set-Cookie', `mc_sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}${secure}`);
}
const publicUser = u => u && ({ id: u.id, name: u.name, email: u.email, crp: u.crp, phone: u.phone, signature: u.signature });

function auth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Não autenticado' });
  req.user = u;
  next();
}

app.get('/api/session', (req, res) => {
  res.json({ needsSetup: db.users.length === 0, user: publicUser(currentUser(req)) });
});

app.post('/api/setup', (req, res) => {
  if (db.users.length) return res.status(400).json({ error: 'Configuração inicial já realizada' });
  const { name, email, password, crp } = req.body || {};
  if (!name || !email || !password || String(password).length < 8) return res.status(400).json({ error: 'Informe nome, e-mail e senha (mínimo 8 caracteres)' });
  const { salt, hash } = hashPassword(password);
  const user = { id: store.id(), name, email: String(email).toLowerCase().trim(), crp: crp || '', salt, hash };
  db.users.push(user);
  save();
  setSession(res, user.id);
  res.json({ user: publicUser(user) });
});

const loginAttempts = new Map();
app.post('/api/login', (req, res) => {
  const ip = req.ip;
  const a = loginAttempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
  const { email, password } = req.body || {};
  const user = db.users.find(u => u.email === String(email || '').toLowerCase().trim());
  if (!user || !checkPassword(password || '', user)) {
    a.n++; loginAttempts.set(ip, a);
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }
  loginAttempts.delete(ip);
  setSession(res, user.id);
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  const sid = parseCookies(req).mc_sid;
  db.sessions = db.sessions.filter(s => s.id !== sid);
  save();
  res.set('Set-Cookie', 'mc_sid=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.put('/api/me', auth, (req, res) => {
  const { name, email, crp, phone, signature, password } = req.body || {};
  Object.assign(req.user, {
    name: name ?? req.user.name, email: email ? String(email).toLowerCase().trim() : req.user.email,
    crp: crp ?? req.user.crp, phone: phone ?? req.user.phone, signature: signature ?? req.user.signature
  });
  if (password) {
    if (String(password).length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
    Object.assign(req.user, hashPassword(password));
  }
  save();
  res.json({ user: publicUser(req.user) });
});

/* ------------------------------ Catálogo ------------------------------- */
app.get('/api/catalog', auth, (req, res) => {
  res.json({
    services: SERVICES,
    dimensions: DIMENSIONS.map(d => ({ id: d.id, name: d.name, severity: d.severity, hazard: d.hazard, harms: d.harms, actions: d.actions, itemCount: d.items.length })),
    questionnaire: publicQuestionnaire()
  });
});

/* ------------------------------ Helpers -------------------------------- */
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
const findOr404 = (coll, id, res) => {
  const x = db[coll].find(i => i.id === id);
  if (!x) res.status(404).json({ error: 'Não encontrado' });
  return x;
};
const allMaterials = () => [...MATERIALS, ...db.materials];

/* ------------------------------ Empresas ------------------------------- */
const COMPANY_FIELDS = ['name', 'cnpj', 'segment', 'employees', 'contactName', 'contactRole', 'email', 'phone', 'address', 'notes', 'sectors', 'publishedMaterials', 'supportChannels', 'status', 'contractStart'];

function normalizeCompany(c) {
  c.sectors = (Array.isArray(c.sectors) ? c.sectors : []).filter(s => s && s.name).map(s => ({ name: String(s.name).trim(), headcount: Number(s.headcount) || 0 }));
  c.publishedMaterials = Array.isArray(c.publishedMaterials) ? c.publishedMaterials : [];
  return c;
}
function companySummary(c) {
  return {
    ...c,
    stats: {
      deliveries: db.deliveries.filter(d => d.companyId === c.id).length,
      deliveriesDone: db.deliveries.filter(d => d.companyId === c.id && d.status === 'realizado').length,
      campaigns: db.campaigns.filter(x => x.companyId === c.id).length,
      responses: db.responses.filter(r => db.campaigns.some(x => x.id === r.campaignId && x.companyId === c.id)).length
    }
  };
}

app.get('/api/companies', auth, (req, res) => res.json(db.companies.map(companySummary)));
app.get('/api/companies/:id', auth, (req, res) => {
  const c = findOr404('companies', req.params.id, res); if (!c) return;
  res.json(companySummary(c));
});
app.post('/api/companies', auth, (req, res) => {
  if (!req.body?.name) return res.status(400).json({ error: 'Informe o nome da empresa' });
  const c = normalizeCompany({ id: store.id(), portalToken: store.token(), status: 'ativa', createdAt: new Date().toISOString(), publishedMaterials: ['mat-nr1', 'mat-estresse', 'mat-respiracao'], ...pick(req.body, COMPANY_FIELDS) });
  db.companies.push(c); save();
  res.json(c);
});
app.put('/api/companies/:id', auth, (req, res) => {
  const c = findOr404('companies', req.params.id, res); if (!c) return;
  Object.assign(c, pick(req.body, COMPANY_FIELDS)); normalizeCompany(c); save();
  res.json(c);
});
app.post('/api/companies/:id/regenerate-link', auth, (req, res) => {
  const c = findOr404('companies', req.params.id, res); if (!c) return;
  c.portalToken = store.token(); save();
  res.json(c);
});
app.delete('/api/companies/:id', auth, (req, res) => {
  const c = findOr404('companies', req.params.id, res); if (!c) return;
  const campIds = db.campaigns.filter(x => x.companyId === c.id).map(x => x.id);
  const delIds = db.deliveries.filter(x => x.companyId === c.id).map(x => x.id);
  db.responses = db.responses.filter(r => !campIds.includes(r.campaignId));
  db.feedback = db.feedback.filter(f => !delIds.includes(f.deliveryId));
  db.campaigns = db.campaigns.filter(x => x.companyId !== c.id);
  db.deliveries = db.deliveries.filter(x => x.companyId !== c.id);
  db.companies = db.companies.filter(x => x.id !== c.id);
  save();
  res.json({ ok: true });
});

/* --------------------------- Serviços/Agenda --------------------------- */
const DELIVERY_FIELDS = ['companyId', 'serviceId', 'title', 'date', 'time', 'duration', 'location', 'modality', 'status', 'participants', 'audience', 'notes', 'materialIds', 'feedbackOpen', 'price'];
function deliverySummary(d) {
  const fb = db.feedback.filter(f => f.deliveryId === d.id);
  const avg = fb.length ? Math.round((fb.reduce((s, f) => s + f.rating, 0) / fb.length) * 10) / 10 : null;
  return { ...d, feedbackCount: fb.length, feedbackAvg: avg };
}
app.get('/api/deliveries', auth, (req, res) => {
  let list = db.deliveries;
  if (req.query.companyId) list = list.filter(d => d.companyId === req.query.companyId);
  res.json(list.map(deliverySummary).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
});
app.post('/api/deliveries', auth, (req, res) => {
  const b = req.body || {};
  if (!db.companies.some(c => c.id === b.companyId)) return res.status(400).json({ error: 'Selecione a empresa' });
  const d = { id: store.id(), feedbackToken: store.token(), status: 'planejado', feedbackOpen: true, materialIds: [], createdAt: new Date().toISOString(), ...pick(b, DELIVERY_FIELDS) };
  db.deliveries.push(d); save();
  res.json(d);
});
app.put('/api/deliveries/:id', auth, (req, res) => {
  const d = findOr404('deliveries', req.params.id, res); if (!d) return;
  Object.assign(d, pick(req.body, DELIVERY_FIELDS)); save();
  res.json(deliverySummary(d));
});
app.delete('/api/deliveries/:id', auth, (req, res) => {
  db.deliveries = db.deliveries.filter(x => x.id !== req.params.id);
  db.feedback = db.feedback.filter(f => f.deliveryId !== req.params.id);
  save(); res.json({ ok: true });
});
app.get('/api/deliveries/:id/feedback', auth, (req, res) => {
  res.json(db.feedback.filter(f => f.deliveryId === req.params.id).map(f => ({ rating: f.rating, useful: f.useful, comment: f.comment, date: f.date })));
});

/* ------------------------------ Materiais ------------------------------ */
const MATERIAL_FIELDS = ['title', 'category', 'audience', 'summary', 'body', 'videoUrl'];
app.get('/api/materials', auth, (req, res) => res.json(allMaterials()));
app.post('/api/materials', auth, (req, res) => {
  if (!req.body?.title) return res.status(400).json({ error: 'Informe o título' });
  const m = { id: store.id(), builtin: false, createdAt: new Date().toISOString(), ...pick(req.body, MATERIAL_FIELDS) };
  db.materials.push(m); save();
  res.json(m);
});
app.put('/api/materials/:id', auth, (req, res) => {
  const m = db.materials.find(x => x.id === req.params.id);
  if (!m) return res.status(400).json({ error: 'Materiais padrão não podem ser editados. Use "Duplicar" para criar uma versão própria.' });
  Object.assign(m, pick(req.body, MATERIAL_FIELDS)); save();
  res.json(m);
});
app.delete('/api/materials/:id', auth, (req, res) => {
  db.materials = db.materials.filter(x => x.id !== req.params.id);
  db.companies.forEach(c => { c.publishedMaterials = (c.publishedMaterials || []).filter(id => id !== req.params.id); });
  save(); res.json({ ok: true });
});

/* ------------------------------ Avaliações ----------------------------- */
const CAMPAIGN_FIELDS = ['title', 'startDate', 'endDate', 'status', 'sectors', 'minGroup', 'severity', 'conclusions', 'actionPlan', 'methodNotes', 'otherSources'];
function campaignSummary(c) {
  const n = db.responses.filter(r => r.campaignId === c.id).length;
  const company = db.companies.find(x => x.id === c.companyId);
  return { ...c, responses: n, companyName: company?.name };
}
app.get('/api/campaigns', auth, (req, res) => {
  let list = db.campaigns;
  if (req.query.companyId) list = list.filter(c => c.companyId === req.query.companyId);
  res.json(list.map(campaignSummary));
});
app.get('/api/campaigns/:id', auth, (req, res) => {
  const c = findOr404('campaigns', req.params.id, res); if (!c) return;
  res.json(campaignSummary(c));
});
app.post('/api/campaigns', auth, (req, res) => {
  const b = req.body || {};
  const company = db.companies.find(c => c.id === b.companyId);
  if (!company) return res.status(400).json({ error: 'Selecione a empresa' });
  const c = {
    id: store.id(), companyId: company.id, token: store.token(), status: 'aberta', minGroup: 5,
    sectors: company.sectors.map(s => s.name), severity: {}, actionPlan: [], conclusions: '',
    createdAt: new Date().toISOString(), title: `Avaliação de riscos psicossociais ${new Date().getFullYear()}`,
    ...pick(b, CAMPAIGN_FIELDS)
  };
  db.campaigns.push(c); save();
  res.json(campaignSummary(c));
});
app.put('/api/campaigns/:id', auth, (req, res) => {
  const c = findOr404('campaigns', req.params.id, res); if (!c) return;
  Object.assign(c, pick(req.body, CAMPAIGN_FIELDS)); save();
  res.json(campaignSummary(c));
});
app.delete('/api/campaigns/:id', auth, (req, res) => {
  db.campaigns = db.campaigns.filter(x => x.id !== req.params.id);
  db.responses = db.responses.filter(r => r.campaignId !== req.params.id);
  save(); res.json({ ok: true });
});
app.get('/api/campaigns/:id/report', auth, (req, res) => {
  const c = findOr404('campaigns', req.params.id, res); if (!c) return;
  const company = db.companies.find(x => x.id === c.companyId);
  const report = buildReport(c, company, db.responses.filter(r => r.campaignId === c.id));
  const deliveries = db.deliveries.filter(d => d.companyId === c.companyId).map(deliverySummary);
  res.json({ ...report, campaignData: campaignSummary(c), companyData: company, deliveries, consultant: publicUser(req.user) });
});

/* ------------------------------ Dashboard ------------------------------ */
app.get('/api/dashboard', auth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    companies: db.companies.length,
    activeCampaigns: db.campaigns.filter(c => c.status === 'aberta').map(campaignSummary),
    upcoming: db.deliveries.filter(d => d.status === 'planejado' && (d.date || '') >= today).sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 8)
      .map(d => ({ ...d, companyName: db.companies.find(c => c.id === d.companyId)?.name })),
    deliveriesDone: db.deliveries.filter(d => d.status === 'realizado').length,
    responses: db.responses.length,
    feedback: db.feedback.length,
    feedbackAvg: db.feedback.length ? Math.round(db.feedback.reduce((s, f) => s + f.rating, 0) / db.feedback.length * 10) / 10 : null
  });
});

/* -------------------------------- QR Code ------------------------------ */
app.get('/api/qr', auth, async (req, res) => {
  const text = String(req.query.text || '').slice(0, 500);
  if (!text) return res.status(400).end();
  const svg = await QRCode.toString(text, { type: 'svg', margin: 1, color: { dark: '#0D2B45', light: '#FFFFFF' } });
  res.type('image/svg+xml').send(svg);
});

/* ======================= Rotas públicas (colaborador) =================== */
const recent = new Map(); // limitação simples de envios por IP (não armazenado)
function throttle(req, res, max = 30) {
  const k = req.ip; const now = Date.now();
  const arr = (recent.get(k) || []).filter(t => now - t < 3600e3);
  if (arr.length >= max) { res.status(429).json({ error: 'Muitos envios. Tente mais tarde.' }); return false; }
  arr.push(now); recent.set(k, arr); return true;
}
const dateOnly = () => new Date().toISOString().slice(0, 10);

app.get('/api/public/portal/:token', (req, res) => {
  const c = db.companies.find(x => x.portalToken === req.params.token && x.status !== 'inativa');
  if (!c) return res.status(404).json({ error: 'Portal não encontrado' });
  const mats = allMaterials();
  res.json({
    company: { name: c.name, supportChannels: c.supportChannels || '' },
    materials: (c.publishedMaterials || []).map(id => mats.find(m => m.id === id)).filter(Boolean).map(m => pick(m, ['id', 'title', 'category', 'audience', 'summary'])),
    campaigns: db.campaigns.filter(x => x.companyId === c.id && x.status === 'aberta').map(x => ({ token: x.token, title: x.title, endDate: x.endDate })),
    events: db.deliveries.filter(d => d.companyId === c.id && d.status !== 'cancelado' && (d.status === 'planejado' ? (d.date || '') >= dateOnly() : d.feedbackOpen))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(d => ({ title: d.title || SERVICES.find(s => s.id === d.serviceId)?.name, date: d.date, time: d.time, location: d.location, modality: d.modality, status: d.status, feedbackToken: d.status === 'realizado' && d.feedbackOpen ? d.feedbackToken : null }))
  });
});

app.get('/api/public/portal/:token/materials/:id', (req, res) => {
  const c = db.companies.find(x => x.portalToken === req.params.token && x.status !== 'inativa');
  if (!c || !(c.publishedMaterials || []).includes(req.params.id)) return res.status(404).json({ error: 'Material não encontrado' });
  const m = allMaterials().find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Material não encontrado' });
  res.json({ ...pick(m, ['id', 'title', 'category', 'audience', 'summary', 'body', 'videoUrl']), companyName: c.name });
});

app.get('/api/public/survey/:token', (req, res) => {
  const c = db.campaigns.find(x => x.token === req.params.token);
  if (!c) return res.status(404).json({ error: 'Pesquisa não encontrada' });
  const company = db.companies.find(x => x.id === c.companyId);
  res.json({ title: c.title, open: c.status === 'aberta', companyName: company?.name, sectors: c.sectors || [], supportChannels: company?.supportChannels || '', questionnaire: publicQuestionnaire() });
});

app.post('/api/public/survey/:token', (req, res) => {
  const c = db.campaigns.find(x => x.token === req.params.token);
  if (!c) return res.status(404).json({ error: 'Pesquisa não encontrada' });
  if (c.status !== 'aberta') return res.status(400).json({ error: 'Esta pesquisa está encerrada' });
  if (!throttle(req, res)) return;
  const b = req.body || {};
  if (!b.consent) return res.status(400).json({ error: 'É necessário concordar com o termo para participar' });
  const answers = {};
  for (const item of allItems()) {
    const v = parseInt(b.answers?.[item.id], 10);
    if (v >= 1 && v <= 5) answers[item.id] = v;
  }
  if (Object.keys(answers).length < allItems().length * 0.8) return res.status(400).json({ error: 'Responda a todas as perguntas, por favor' });
  const sector = (c.sectors || []).includes(b.sector) ? b.sector : 'Não informado';
  // Nenhum dado identificável é armazenado (sem IP, sem horário exato).
  db.responses.push({ id: store.id(), campaignId: c.id, sector, answers, comment: String(b.comment || '').slice(0, 1500), date: dateOnly() });
  save();
  res.json({ ok: true });
});

app.get('/api/public/feedback/:token', (req, res) => {
  const d = db.deliveries.find(x => x.feedbackToken === req.params.token);
  if (!d) return res.status(404).json({ error: 'Avaliação não encontrada' });
  const company = db.companies.find(x => x.id === d.companyId);
  res.json({ title: d.title || SERVICES.find(s => s.id === d.serviceId)?.name, date: d.date, companyName: company?.name, open: !!d.feedbackOpen });
});

app.post('/api/public/feedback/:token', (req, res) => {
  const d = db.deliveries.find(x => x.feedbackToken === req.params.token);
  if (!d) return res.status(404).json({ error: 'Avaliação não encontrada' });
  if (!d.feedbackOpen) return res.status(400).json({ error: 'Avaliação encerrada' });
  if (!throttle(req, res)) return;
  const rating = parseInt(req.body?.rating, 10);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Escolha uma nota de 1 a 5' });
  const useful = parseInt(req.body?.useful, 10);
  db.feedback.push({ id: store.id(), deliveryId: d.id, rating, useful: useful >= 1 && useful <= 5 ? useful : null, comment: String(req.body?.comment || '').slice(0, 1000), date: dateOnly() });
  save();
  res.json({ ok: true });
});

/* ------------------------------ Estáticos ------------------------------ */
const PUB = path.join(__dirname, 'public');
app.use(express.static(PUB, { index: false }));
['/p/:token', '/p/:token/*', '/pesquisa/:token', '/feedback/:token'].forEach(r => app.get(r, (req, res) => res.sendFile(path.join(PUB, 'portal.html'))));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Não encontrado' });
  res.sendFile(path.join(PUB, 'index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`MindCorp rodando em http://localhost:${PORT}`));
}

module.exports = app;
