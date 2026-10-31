const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const RULES_PATH = 'cathy_data/email_rules.json';

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

      // GET /file?path=cathy_data/files/xxx — 代理 GitHub 仓库文件（raw.githubusercontent.com 在部分网络打不开）
      const reqUrl = new URL(request.url);
      if (request.method === 'GET' && reqUrl.pathname === '/file') {
        const path = reqUrl.searchParams.get('path') || '';
        if (!path.startsWith('cathy_data/files/') || path.includes('..')) return new Response('forbidden', { status: 403 });
        const repo = env.GITHUB_REPO || 'frankataix-gif/cathy-fencing';
        const gh = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
          headers: { 'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 'User-Agent': 'cathy-worker', 'Accept': 'application/vnd.github.raw' }
        });
        if (!gh.ok) return new Response('not found', { status: gh.status });
        const ext = (path.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
        const types = { '.pdf': 'application/pdf', '.m4a': 'audio/mp4', '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.heic': 'image/heic', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        return new Response(gh.body, { headers: { 'Content-Type': types[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } });
      }

      if (request.method !== 'POST') return new Response('OK', { headers: CORS_HEADERS });

      let body;
      const ctype = request.headers.get('Content-Type') || '';
      try {
        if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
          body = Object.fromEntries((await request.formData()).entries());
        } else {
          body = await request.json();
        }
      } catch (e) { return json({ error: 'invalid body' }, 400); }

    if (body.action === 'ai' || body.action === 'coach') {
      const prompt = body.action === 'ai' ? buildAiPrompt(body) : buildCoachPrompt(body);
      try {
        const res = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
          messages: [
            { role: 'system', content: '你是一名击剑教练，擅长用中文给出简洁、可执行的训练建议和赛前提醒。' },
            { role: 'user', content: prompt }
          ]
        });
        const text = (res && res.response) ? res.response : '';
        const suggestions = parseSuggestions(text);
        return json({ suggestions, analysis: text });
      } catch (e) {
        return json({ error: e.message || 'ai failed' }, 500);
      }
    }

    if (body.action === 'bio') {
      try {
        const res = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
          messages: [
            { role: 'system', content: '你是资深击剑记者，擅长把运动员的真实数据写成流畅的生涯档案介绍。规则：只用提供的数据，不编造事实；中文叙述、保留英文赛事名/组别名；写给教练看，客观、克制、有信息量。' },
            { role: 'user', content: String(body.prompt || '') }
          ]
        });
        return json({ text: (res && res.response) ? res.response : '' });
      } catch (e) {
        return json({ error: e.message || 'ai failed' }, 500);
      }
    }

    if (body.action === 'read') {
      // 直接读 GitHub API，不走 raw CDN —— 避免 CDN 延迟导致多设备同步拿到旧数据
      const path = body.path || '';
      if (!path.startsWith('cathy_data/') || path.includes('..')) return json({ error: 'forbidden path' }, 403);
      const file = await readGitHubFile(env, path);
      return json({ content: file ? file.content : null });
    }

    if (body.action === 'save') {
      const { path, content, message } = body;
      // 白名单：只允许写数据文件，防止端点被滥用改写页面/工作流
      const SAVE_ALLOWED = ['cathy_data/user_data.json', 'cathy_data/open_data.json', 'cathy_data/vault.json', 'cathy_data/email_rules.json', 'cathy_data/emails.md', 'cathy_data/usaf_dashboard.md'];
      const isFileUpload = typeof path === 'string' && path.startsWith('cathy_data/files/');
      if (typeof path !== 'string' || path.includes('..') || (!SAVE_ALLOWED.includes(path) && !isFileUpload)) {
        return json({ error: 'forbidden path' }, 403);
      }
      const isB64 = body.encoding === 'base64';
      const existing = await readGitHubFile(env, path);
      const result = await writeGitHubFile(env, path, content, message || 'Update via worker', existing?.sha, isB64);
      return json(result);
    }

    if (body.action === 'email_summary') {
      const emails = body.newEmails || [];
      const previous = body.previousSummary || null;
      const prompt = buildEmailSummaryPrompt(body);
      let text = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
            messages: [
              { role: 'system', content: '你只能输出 JSON，不允许解释。' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 3072
          });
          text = (res && res.response) ? res.response : '';
          if (text && text.trim()) break;
        } catch (e) {}
      }
      let parsed = extractJson(text);
      // 近似文本去重：去掉空格/标点后，包含关系或字符重合 ≥60% 视为同一条
      const normTask = s => String(s || '').replace(/[\s\p{P}]/gu, '');
      const similar = (a, b) => {
        const x = normTask(a), y = normTask(b);
        if (!x || !y) return false;
        if (x === y || x.includes(y) || y.includes(x)) return true;
        const sx = new Set(x), sy = new Set(y);
        let inter = 0;
        sx.forEach(c => { if (sy.has(c)) inter++; });
        return inter / (sx.size + sy.size - inter) >= 0.6;
      };
      const upsertBy = (list, item, keyFn) => {
        const k = keyFn(item);
        const idx = list.findIndex(x => keyFn(x) === k || similar(keyFn(x), k));
        if (idx >= 0) list[idx] = item; else list.push(item);
      };
      const categoryMap = { '击剑': 0, 'Cathy&David': 0, '生活旅行': 0, '营销': 0, '待办': 0, '其他': 0 };
      emails.forEach(e => { categoryMap[e.category || '其他'] = (categoryMap[e.category || '其他'] || 0) + 1; });
      if (!parsed) {
        // AI 未返回有效 JSON：按主题归并兜底，同一话题只列一条
        const norm = s => String(s || '').replace(/^\s*(re|fwd?|回复|答复|转发)[:：]\s*/i, '').trim();
        const groups = {};
        emails.forEach(e => {
          const k = norm(e.subject) || '(无主题)';
          (groups[k] = groups[k] || []).push(e);
        });
        const todos = previous && Array.isArray(previous.todos) ? previous.todos.slice() : [];
        const info = previous && Array.isArray(previous.info) ? previous.info.slice() : [];
        Object.entries(groups).forEach(([topic, list]) => {
          const latest = list[list.length - 1];
          const todoItem = list.find(e => e.todo && e.todo !== '无');
          if (todoItem) {
            upsertBy(todos, { task: todoItem.todo, detail: latest.summary || '', deadline: '无', category: latest.category || '其他', source: topic }, x => x.task);
          } else {
            upsertBy(info, { topic, detail: (latest.summary || `${list.length} 封往来邮件`), category: latest.category || '其他' }, x => x.topic);
          }
        });
        parsed = {
          date: body.date || new Date().toISOString().slice(0, 10),
          total: emails.length,
          categories: categoryMap,
          todos,
          info,
          priority: '',
          summary: `共 ${emails.length} 封邮件，已按 ${Object.keys(groups).length} 个话题归并（AI 总结暂不可用）`
        };
      } else {
        let todos = previous && Array.isArray(previous.todos) ? previous.todos.slice() : [];
        let info = previous && Array.isArray(previous.info) ? previous.info.slice() : [];
        if (Array.isArray(parsed.todos)) { const self = []; parsed.todos.forEach(a => upsertBy(self, a, x => x.task)); self.forEach(a => upsertBy(todos, a, x => x.task)); }
        if (Array.isArray(parsed.info)) { const self = []; parsed.info.forEach(a => upsertBy(self, a, x => x.topic)); self.forEach(a => upsertBy(info, a, x => x.topic)); }
        parsed.todos = todos;
        parsed.info = info;
        parsed.categories = parsed.categories || categoryMap;
        parsed.date = parsed.date || body.date || new Date().toISOString().slice(0, 10);
      }
      return json(parsed);
    }

    if (body.action === 'email') {
      const email = body.email || body;
      const subject = email.subject || '(no subject)';
      const from = email.from || email.fromEmail || '';
      const to = email.to || '';
      const date = email.date || new Date().toISOString();
      const rawText = email.body || email.text || email.html || '';
      const classifyText = rawText.slice(0, 1200);
      const storeText = rawText.slice(0, 500);

      const cfg0 = await loadEmailConfig(env);
      const outgoing = isOutgoing(email, cfg0);
      const meta = await classifyEmail(env, { subject, from, text: classifyText, isSent: outgoing }, cfg0);
      const gmailId = email.gmailId || '';
      const entry = `\n## [${meta.category}] ${subject}\n\n**发件人:** ${from}\n**日期:** ${date}\n**摘要:** ${meta.summary}\n**待办:** ${meta.todo}\n${outgoing ? '**方向:** 发出\n' : ''}${meta.kid && meta.kid !== '无' ? `**涉及:** ${meta.kid}\n` : ''}${meta.schedule ? `**日程:** ${JSON.stringify(meta.schedule)}\n` : ''}${gmailId ? `**GmailID:** ${gmailId}\n` : ''}\n${storeText}\n\n---\n`;
      const normDate = (d) => { try { return new Date(d).toISOString(); } catch(e) { return d; } };
      const emailKey = `${subject}|${from}|${normDate(date)}`;
      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const existing = await readGitHubFile(env, 'cathy_data/emails.md');
          if (existing && existing.content) {
            const regex = /##\s*\[[^\]]+\]\s*([\s\S]*?)\n[\s\S]*?\*\*发件人:\*\*\s*(.*?)\n\*\*日期:\*\*\s*(.*?)\n/g;
            let m;
            let duplicate = false;
            while ((m = regex.exec(existing.content)) !== null) {
              const k = `${m[1].trim()}|${m[2].trim()}|${normDate(m[3].trim())}`;
              if (k === emailKey) { duplicate = true; break; }
            }
            if (duplicate) {
              return json({ ok: true, skipped: 'duplicate', meta });
            }
          }
          const newContent = (existing ? existing.content : '# 收件箱 / Emails\n') + entry;
          result = await writeGitHubFile(env, 'cathy_data/emails.md', newContent, 'Append email', existing?.sha);
          if (!result.error) break;
          // sha 冲突时重试
          if (result.error && !String(result.error).toLowerCase().includes('sha')) break;
        } catch (e) {
          result = { error: e.message };
          break;
        }
      }
      return json({ ...result, meta });
    }

    if (body.action === 'email_reclassify') {
      const email = body.email || {};
      const newCat = body.category || '其他';
      const allowed = ['击剑', 'Cathy&David', '生活旅行', '营销', '待办', '其他'];
      if (!allowed.includes(newCat)) return json({ error: 'bad category' }, 400);
      const normDate = (d) => { try { return new Date(d).toISOString(); } catch(e) { return d; } };
      const targetKey = `${email.subject || ''}|${email.from || ''}|${normDate(email.date || '')}`;
      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const existing = await readGitHubFile(env, 'cathy_data/emails.md');
          if (!existing) return json({ error: 'emails.md not found' }, 404);
          const parts = existing.content.split(/\n## /);
          let changed = false;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part.trim().startsWith('[')) continue;
            const lines = part.split('\n');
            const m = (lines[0] || '').match(/^\[([^\]]+)\]\s*(.*)/);
            const subject = (m ? m[2] : '').trim();
            let from = '', date = '';
            for (const line of lines) {
              if (line.startsWith('**发件人:**')) from = line.replace(/^\*\*发件人:\*\*\s*/, '').trim();
              else if (line.startsWith('**日期:**')) date = line.replace(/^\*\*日期:\*\*\s*/, '').trim();
            }
            const key = `${subject}|${from}|${normDate(date)}`;
            if (key === targetKey) {
              parts[i] = `[${newCat}] ${subject}` + '\n' + lines.slice(1).join('\n');
              changed = true;
              break;
            }
          }
          if (!changed) return json({ error: 'email not found' }, 404);
          const newContent = parts.join('\n## ');
          result = await writeGitHubFile(env, 'cathy_data/emails.md', newContent, 'Reclassify email', existing.sha);
          if (!result.error) break;
          if (result.error && !String(result.error).toLowerCase().includes('sha')) break;
        } catch (e) {
          result = { error: e.message };
          break;
        }
      }
      return json(result);
    }

    if (body.action === 'import') {
      const source = body.source || 'manual';
      const content = body.content || '';
      const ts = new Date().toISOString();
      const markdown = `---\nimported: ${ts}\nsource: ${source}\n---\n\n${content}`;
      const existing = await readGitHubFile(env, 'cathy_data/usaf_dashboard.md');
      const result = await writeGitHubFile(env, 'cathy_data/usaf_dashboard.md', markdown, 'Import USAF dashboard', existing?.sha);
      return json(result);
    }

    return json({ error: 'unknown action' }, 400);
    } catch (e) {
      return json({ error: e.message || 'internal error' }, 500);
    }
  }
};

async function readGitHubFile(env, path) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO || 'frankataix-gif/cathy-fencing';
  const branch = env.GITHUB_BRANCH || 'main';
  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(api + '?ref=' + branch, { headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'cathy-worker' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: decodeURIComponent(escape(atob(data.content))) };
}

async function writeGitHubFile(env, path, content, message, sha, isB64) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO || 'frankataix-gif/cathy-fencing';
  const branch = env.GITHUB_BRANCH || 'main';
  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const payload = {
    message,
    content: isB64 ? content.replace(/\s+/g, '') : btoa(unescape(encodeURIComponent(content))),
    branch
  };
  if (sha) payload.sha = sha;
  const res = await fetch(api, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'cathy-worker' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) return { error: data.message || `GitHub ${res.status}` };
  return data;
}

function buildAiPrompt(body) {
  const ctx = body.context || {};
  return `运动员：Cathy He（花剑 Y14，Vancouver）
赛事：${ctx.tournament || '未知'}
项目：${ctx.event || ''}
对手：${ctx.opponent || ''}（${ctx.round || ''}）
比分：${ctx.score || ''}
赛后留言：
${body.summary || ''}

请给出：
1. 问题分析（1-3 条）
2. 针对性训练建议（3 条以内）
3. 下次赛前提醒（1 条）

用中文，简洁，直接给建议。`;
}

function buildCoachPrompt(body) {
  const ctx = body.context || {};
  const themes = ctx.themes ? Object.entries(ctx.themes).map(([k, v]) => `${k}:${v}`).join(', ') : '';
  const recent = ctx.recentReflections ? ctx.recentReflections.map(r => `${r.key}: ${r.summary.slice(0, 300)}`).join('\n') : '';
  const stats = ctx.stats || {};
  return `你是 Cathy He 的击剑训练助手。请基于以下信息给出本周训练计划和下一场赛前提醒。

运动员信息：花剑 Y14，Vancouver。
整体数据：赛事 ${stats.totalEvents || 0} 场，总剑数 ${stats.totalBouts || 0}，胜率 ${stats.winRate || ''}，Pool 胜率 ${stats.poolRate || ''}，平均名次 ${stats.avgPlace || '-'}。
弱点主题：${themes || '无'}。

最近留言：
${recent || '无'}

请输出：
1. 本周训练重点（最多 4 条）
2. 下一场赛前提醒（最多 3 条）
3. 对手档案关注点（如有）

用中文，分点，直接可用。`;
}

function parseSuggestions(text) {
  if (!text) return [];
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.length > 5)
    .slice(0, 20);
}

function senderAddr(from) {
  const m = String(from || '').match(/[\w.+-]+@[\w-]+(?:\.[\w.-]+)+/);
  return m ? m[0].toLowerCase() : '';
}

// 排除名单：该发件人不再自动归入某分类（完整地址精确匹配，或 "@domain.com" 按域名匹配）
function isExcluded(from, category, exclude) {
  if (!exclude || !Array.isArray(exclude[category])) return false;
  const addr = senderAddr(from);
  if (!addr) return false;
  const dom = addr.split('@')[1];
  return exclude[category].some(x => {
    const k = String(x).toLowerCase();
    return k === addr || (k.startsWith('@') && (dom === k.slice(1) || dom.endsWith(k)));
  });
}

function keywordClassify(from, subject, text, rules, exclude) {
  const combined = (from + ' ' + subject + ' ' + text).toLowerCase();
  const entries = rules && typeof rules === 'object' ? Object.entries(rules) : [];
  for (const [category, keywords] of entries) {
    if (!Array.isArray(keywords)) continue;
    if (isExcluded(from, category, exclude)) continue;
    if (keywords.some(k => combined.includes(String(k).toLowerCase()))) return category;
  }
  return null;
}

async function loadEmailConfig(env) {
  try {
    const existing = await readGitHubFile(env, RULES_PATH);
    if (existing && existing.content) {
      const parsed = JSON.parse(existing.content);
      return { rules: parsed.rules || {}, exclude: parsed.exclude || {}, self: parsed.self || [] };
    }
  } catch(e) {}
  return { rules: {}, exclude: {}, self: [] };
}

// 发件人是否自己（发出的邮件）：payload.isSent 或命中 self 列表
function isOutgoing(email, cfg) {
  if (email.isSent === true) return true;
  const addr = senderAddr(email.from);
  const self = Array.isArray(cfg.self) ? cfg.self : [];
  return !!addr && self.some(x => String(x).toLowerCase() === addr);
}

async function classifyEmail(env, email, cfg) {
  const prompt = `你是 Cathy 家庭的邮件助理。请阅读邮件，按以下 JSON 格式输出，不要任何额外文字：
{"分类":"...","摘要":"...","待办":"...","涉及":"...","日程":"..."}

分类只能从这六个中选一个：击剑 / Cathy&David / 生活旅行 / 营销 / 待办 / 其他
分类说明：
- 击剑：与击剑运动相关的邮件（USA Fencing、AskFRED、击剑俱乐部、击剑装备、击剑私教等）
- Cathy&David：与家里两个孩子相关的其他一切邮件。Cathy He (He Yunxi) 是女儿，David He (He Lingwei) 是儿子。学校、校车、饭卡、课程、活动、医疗、申请、其他课外班等都归这里
- 生活旅行：家庭生活和旅行相关——机票、酒店、签证、旅行计划、出行确认、家庭日常事务（与孩子直接相关的归 Cathy&David）
- 营销：促销、广告、优惠券
- 待办：需要家长采取行动但与孩子和旅行无关的邮件（账单、账户验证、法律文件等）
- 其他：以上都不符合
摘要用 1-2 句中文总结邮件核心
待办：这封邮件需要做什么？不需要行动写"无"
涉及：这封邮件涉及哪个孩子？只能选 Cathy / David / 两个 / 不明。与孩子无关的分类（生活旅行/营销/待办/其他）写"无"
日程：如果邮件里有明确日期的比赛/训练营/课程/会议/活动/截止日，输出 {"标题":"...","日期":"YYYY-MM-DD","时间":"HH:MM或空","地点":"..."}（日期推算成完整年月日，只取最主要的一个）；没有写"无"。营销邮件一律写"无"

发件人：${email.from}
主题：${email.subject}
正文：${email.text.slice(0, 3000)}`;

  const cfg0 = cfg || await loadEmailConfig(env);
  const keywordCategory = keywordClassify(email.from, email.subject, email.text, cfg0.rules, cfg0.exclude);

  let rawText = '';
  try {
    const res = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [
        { role: 'system', content: '你只能输出 JSON，不允许解释。' },
        { role: 'user', content: prompt }
      ]
    });
    rawText = res && res.response ? res.response : '';
    let obj = null;
    if (typeof rawText === 'object' && rawText !== null) {
      obj = rawText;
    } else if (typeof rawText === 'string') {
      // 日程是嵌套对象：先贪婪匹配整个 JSON，失败再退回第一个 {...}
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch (e1) { const m2 = rawText.match(/\{[\s\S]*?\}/); if (m2) obj = JSON.parse(m2[0]); } }
    }
    if (obj) {
      let aiCat = obj['分类'] || obj.category || '其他';
      if (isExcluded(email.from, aiCat, cfg0.exclude)) aiCat = '其他';
      const finalCat = keywordCategory || aiCat;
      let schedule = null;
      const s = obj['日程'] || obj.schedule;
      if (s && typeof s === 'object' && finalCat !== '营销' && /^\d{4}-\d{2}-\d{2}$/.test(String(s['日期'] || s.date || ''))) {
        const tm = String(s['时间'] || s.time || '');
        schedule = { title: String(s['标题'] || s.title || email.subject).slice(0, 120), date: String(s['日期'] || s.date), time: /^\d{1,2}:\d{2}$/.test(tm) ? tm : '', location: String(s['地点'] || s.location || '').slice(0, 120) };
      }
      return {
        category: finalCat,
        summary: obj['摘要'] || obj.summary || '',
        todo: obj['待办'] || obj.todo || '无',
        kid: obj['涉及'] || obj.kid || '',
        schedule,
        raw: rawText
      };
    }
  } catch(e) {}
  return { category: keywordCategory || '其他', summary: '', todo: '无', kid: '', raw: rawText };
}

function buildEmailSummaryPrompt(body) {
  const date = body.date || new Date().toISOString().slice(0, 10);
  const previous = body.previousSummary || null;
  const emails = body.newEmails || [];
  const emailLines = emails.slice(0, 30).map(e =>
    `- 收到：${String(e.date || '').slice(0, 10)}，分类：${e.category || '其他'}，发件人：${(e.from || '').slice(0, 50)}，主题：${(e.subject || '').slice(0, 80)}，摘要：${(e.summary || '').slice(0, 150)}，待办：${(e.todo || '无').slice(0, 80)}`
  ).join('\n');
  const previousText = previous ? `之前已有一份归纳集合，现在新增 ${emails.length} 封邮件，请合并进已有归纳（同一话题不要重复列；如果新邮件是已有事项的进展/回复，更新该条目的 detail 而不是新增）。

之前归纳：
- 需要办理：${(previous.todos || []).map(a => a.task).join('；') || '无'}
- 信息通知：${(previous.info || []).map(a => a.topic).join('；') || '无'}
- 一句话总结：${previous.summary || ''}

新增邮件：` : `请把以下邮件按话题归纳整理（覆盖最近30天）。

邮件列表：`;
  return `你是 Cathy 家庭的邮件助理，为家长整理邮件。${previousText}
${emailLines}

要求：
1. 同一话题的往来邮件（主题相同或是 Re:/回复/转发 的来回）必须合并成一条，不要每封邮件都列
2. todos 只列真正需要家长或 Cathy 采取行动的事（要回复、要交材料、要到场、要缴费等），写清楚具体做什么
3. info 列纯通知、无需行动的信息
4. 宁缺毋滥：没有行动就不要硬凑 todos
5. 只输出 JSON，不要任何额外文字

{
  "date": "${date}",
  "summary": "这一天邮件的一句话总结",
  "todos": [{"task": "要做的事（具体可执行）", "detail": "关键细节：时间/地点/方式", "deadline": "YYYY-MM-DD 或 无", "category": "击剑/Cathy&David/其他", "source": "来源邮件主题"}],
  "info": [{"topic": "信息主题", "detail": "一句话说明", "category": "分类"}],
  "priority": "最需要先办的一件事"
}`;
}

function extractJson(text) {
  if (!text) return null;
  if (typeof text === 'object' && text !== null) return text;
  if (typeof text !== 'string') return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch(e) {}
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}
