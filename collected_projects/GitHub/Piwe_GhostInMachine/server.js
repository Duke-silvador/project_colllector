// Web UI for the ghost story generator. Zero dependencies: node server.js

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateNight } from './src/night.js';
import { activities, activityById } from './src/activities.js';
import { zones, sensors } from './src/sensors.js';
import { parseImportedLog, formatLine, clock } from './src/logs.js';
import { narrate, listModels, defaults } from './src/narrator/index.js';
import { tones } from './src/narrator/prompt.js';
import { tour } from './src/setting.js';
import { scoreNight, summarise } from './src/anomaly/index.js';
import { speak, voiceStatus } from './src/voice.js';

const PORT = Number(process.env.PORT) || 3131;
const PUBLIC = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

// Add the display fields the browser needs, so it never has to reimplement them.
function present(night) {
  return {
    ...night,
    events: night.events.map((ev) => ({ ...ev, clock: clock(ev.t), line: formatLine(ev) })),
  };
}

// The story endpoint receives a night back from the browser; keep only what we expect.
function sanitise(night) {
  return {
    source: night.source === 'imported' ? 'imported' : 'simulated',
    seed: night.seed == null ? null : String(night.seed),
    date: String(night.date ?? ''),
    bedtime: Number(night.bedtime) || null,
    wake: Number(night.wake) || null,
    activities: (night.activities ?? []).filter((a) => activityById[a.id]),
    events: (night.events ?? []).slice(0, 20000).map(({ t, sensor, zone, value, unit, detail, activity }) =>
      ({ t: Number(t), sensor: String(sensor), zone, value, unit, detail: String(detail ?? ''), activity })),
    dawn: (night.dawn ?? []).map(String),
    scores: Array.isArray(night.scores) ? night.scores.map(Number) : null,
  };
}

// A public deployment shouldn't let one visitor burn the model or voice budget.
const LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR) || 60;
const hits = new Map();
function rateLimited(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 5e6) throw new Error('Request too large');
  }
  return body ? JSON.parse(body) : {};
}

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const routes = {
  'GET /api/catalog': (req, res) => send(res, 200, {
    activities: activities.map(({ id, title, kind }) => ({ id, title, kind })),
    tones: Object.keys(tones),
    tour,
    zones,
    sensors,
  }),

  'GET /healthz': (req, res) => send(res, 200, { ok: true }),

  'GET /api/status': async (req, res) => {
    const status = { provider: defaults.provider, model: defaults.model, voices: voiceStatus() };
    try {
      status.models = await listModels();
      status.available = true;
    } catch (err) {
      status.available = false;
      status.error = err.message;
    }
    send(res, 200, status);
  },

  'POST /api/night': async (req, res) => {
    const body = await readJson(req);
    const night = generateNight({
      seed: body.seed || undefined,
      date: body.date || undefined,
      extras: Number(body.extras ?? 7),
      include: Array.isArray(body.include) ? body.include : [],
    });
    send(res, 200, present(night));
  },

  'POST /api/import': async (req, res) => {
    const { text } = await readJson(req);
    send(res, 200, present(parseImportedLog(String(text ?? ''))));
  },

  'POST /api/score': async (req, res) => {
    if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. The ghosts need a rest.' });
    const night = sanitise((await readJson(req)).night ?? {});
    const result = await scoreNight(night);
    if (result.scores && night.source === 'simulated') result.summary = summarise(night, result.scores);
    send(res, 200, result);
  },

  'POST /api/voice': async (req, res) => {
    if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. The ghosts need a rest.' });
    const { text, provider } = await readJson(req);
    const { contentType, audio } = await speak(String(text ?? ''), { provider });
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': audio.length });
    res.end(audio);
  },

  'POST /api/story': async (req, res) => {
    if (rateLimited(req)) return send(res, 429, { error: 'Too many requests. The ghosts need a rest.' });
    const body = await readJson(req);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' });
    const write = (obj) => res.write(JSON.stringify(obj) + '\n');
    try {
      const opts = { tone: body.tone, model: body.model || undefined, offline: !!body.offline, signal: abort.signal };
      for await (const chunk of narrate(sanitise(body.night ?? {}), opts)) {
        write(typeof chunk === 'string' ? { text: chunk } : chunk);
      }
      write({ done: true });
    } catch (err) {
      if (!abort.signal.aborted) write({ error: err.message });
    }
    res.end();
  },
};

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    const route = routes[`${req.method} ${path}`];
    if (route) return await route(req, res);
    if (req.method !== 'GET') return send(res, 404, { error: 'Not found' });

    const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
    if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'Forbidden' });
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    if (res.headersSent) return res.end();
    send(res, err.code === 'ENOENT' ? 404 : 400, { error: err.message });
  }
}).listen(PORT, () => {
  console.log(`👻 Ghost in the Machine is listening on http://localhost:${PORT}`);
  console.log(`   narrator: ${defaults.model} via ${defaults.provider} (falls back to offline templates)`);
});
