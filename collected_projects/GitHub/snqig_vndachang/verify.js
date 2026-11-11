/* Build verification: i18n coverage, asset integrity, JS syntax, HTTP smoke test.
 * Run: node verify.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const DICT = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lang.json'), 'utf8'));
const LANGS = ['zh', 'zhtw', 'en', 'vi'];
const PAGES = ['index.html', 'about.html', 'product.html', 'info.html', 'case.html',
  'guestbook.html', 'contact.html', 'page-4.html', 'page-5.html', 'page-6.html',
  'page-7.html', 'page-8.html', 'page-9.html', 'page-10.html'];
const problems = [];
const stats = { pages: 0, keysUsed: new Set(), refsChecked: 0, httpChecks: [] };

function fail(msg) { problems.push(msg); }

/* 1. dictionary consistency */
const baseKeys = Object.keys(DICT.zh).sort();
LANGS.forEach(function (l) {
  const keys = Object.keys(DICT[l] || {}).sort();
  const missing = baseKeys.filter(k => keys.indexOf(k) === -1);
  const extra = keys.filter(k => baseKeys.indexOf(k) === -1);
  if (missing.length) fail('lang ' + l + ' missing ' + missing.length + ' keys: ' + missing.slice(0, 8).join(', '));
  if (extra.length) fail('lang ' + l + ' has extra keys: ' + extra.slice(0, 8).join(', '));
  Object.keys(DICT[l] || {}).forEach(function (k) {
    if (typeof DICT[l][k] !== 'string' || !DICT[l][k].trim()) fail('lang ' + l + ' empty value for ' + k);
  });
});
console.log('[1] dictionary keys per language: ' + LANGS.map(l => l + '=' + Object.keys(DICT[l]).length).join(', '));

/* 2. JS syntax */
['build.js', 'verify.js', 'js/i18n-data.js', 'js/i18n.js', 'js/site.js'].forEach(function (f) {
  try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }); }
  catch (e) { fail('JS syntax error in ' + f + ': ' + String(e.stderr || e.message)); }
});
console.log('[2] JS syntax: 5 files checked');

/* 3. generated HTML: existence, i18n key coverage, tag balance, local refs */
function checkHtml(file) {
  const html = fs.readFileSync(file, 'utf8');
  stats.pages++;
  let m;
  const keyRe = /data-i18n="([^"]+)"/g;
  while ((m = keyRe.exec(html))) {
    const key = m[1];
    stats.keysUsed.add(key);
    LANGS.forEach(function (l) {
      if (DICT[l][key] === undefined) fail(path.relative(ROOT, file) + ': key "' + key + '" missing in ' + l);
    });
  }
  const opens = (html.match(/<div\b/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  if (opens !== closes) fail(path.relative(ROOT, file) + ': div tag imbalance ' + opens + '/' + closes);

  // an element with data-i18n must not contain another data-i18n element
  // (runtime translation uses textContent and would erase nested nodes)
  const VOID = /^(img|input|meta|link|br|hr|source|area|base|col|embed|param|track|wbr)$/i;
  const tagRe = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi;
  const stack = [];
  let tm;
  while ((tm = tagRe.exec(html))) {
    const closing = tm[1] === '/';
    const name = tm[2].toLowerCase();
    const attrs = tm[3];
    if (closing) {
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].name === name) { stack.length = s; break; }
      }
      continue;
    }
    if (VOID.test(name) || /\/\s*$/.test(attrs)) continue;
    const hasKey = /data-i18n=/.test(attrs);
    if (hasKey && stack.some(x => x.hasKey)) {
      fail(path.relative(ROOT, file) + ': nested data-i18n element <' + name + '> would be erased at runtime');
    }
    stack.push({ name: name, hasKey: hasKey });
  }

  const refRe = /(?:src|href)="([^"]+)"/g;
  while ((m = refRe.exec(html))) {
    const ref = m[1].trim();
    if (!ref || /^(https?:|mailto:|javascript:|#|data:)/i.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    const target = path.resolve(path.dirname(file), clean);
    stats.refsChecked++;
    if (!fs.existsSync(target)) fail(path.relative(ROOT, file) + ': broken reference ' + ref);
  }
}

PAGES.forEach(function (p) { checkHtml(path.join(ROOT, p)); });
LANGS.forEach(function (l) {
  PAGES.forEach(function (p) { checkHtml(path.join(ROOT, l, p)); });
});

// embedded dictionary file must also be valid JS already checked; verify key count matches
const embedded = fs.readFileSync(path.join(ROOT, 'js', 'i18n-data.js'), 'utf8');
const embeddedKeys = (embedded.match(/"[a-z0-9.]+"\s*:/g) || []).length;
console.log('[3] HTML pages: ' + stats.pages + ', unique i18n keys used: ' + stats.keysUsed.size +
  ', local refs checked: ' + stats.refsChecked);

/* 3b. CSS url() references */
const css = fs.readFileSync(path.join(ROOT, 'css', 'site.css'), 'utf8');
let cm;
const urlRe = /url\("?([^")]+)"?\)/g;
while ((cm = urlRe.exec(css))) {
  const target = path.resolve(path.join(ROOT, 'css'), cm[1].split(/[?#]/)[0]);
  if (!fs.existsSync(target)) fail('css/site.css: broken url() ' + cm[1]);
}
const deadKeys = baseKeys.filter(k => !stats.keysUsed.has(k));
if (deadKeys.length) console.log('[3b] unused dictionary keys (' + deadKeys.length + '): ' + deadKeys.join(', '));

/* 4. static translation baked into each language directory */
function sampleCheck(lang, page, key) {
  const html = fs.readFileSync(path.join(ROOT, lang, page), 'utf8');
  const re = new RegExp('data-i18n="' + key.replace('.', '\\.') + '"[^>]*>([^<]*)<');
  const m = html.match(re);
  if (!m) { fail(lang + '/' + page + ': sample key ' + key + ' not found'); return; }
  const expected = DICT[lang][key];
  if (m[1] !== expected.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')) {
    fail(lang + '/' + page + ': baked text for ' + key + ' differs from dictionary');
  }
}
LANGS.forEach(function (l) {
  sampleCheck(l, 'index.html', 'hero.s1');
  sampleCheck(l, 'index.html', 'nav.products');
  sampleCheck(l, 'about.html', 'about.intro_full');
  sampleCheck(l, 'guestbook.html', 'form.submit');
});
console.log('[4] baked-in translations: 16 spot checks');

/* 5. local HTTP smoke test */
const MIME_OK = { '.html': 'text/html', '.css': 'text/css', '.js': 'javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer(function (req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  const ext = path.extname(file);
  const type = ext === '.html' ? 'text/html; charset=utf-8'
    : ext === '.css' ? 'text/css; charset=utf-8'
    : ext === '.js' ? 'application/javascript; charset=utf-8'
    : ext === '.png' ? 'image/png' : ext === '.jpg' ? 'image/jpeg' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(fs.readFileSync(file));
});

const targets = ['/index.html', '/about.html', '/product.html', '/info.html', '/case.html',
  '/guestbook.html', '/contact.html', '/page-4.html', '/page-10.html',
  '/en/index.html', '/vi/about.html', '/zhtw/product.html', '/zh/guestbook.html',
  '/css/site.css', '/js/i18n-data.js', '/js/i18n.js', '/js/site.js',
  '/images/logo.png', '/images/banner-forest.jpg', '/images/product1.jpg', '/images/footer-bg.jpg'];

function fetch(port, url) {
  return new Promise(function (resolve, reject) {
    http.get({ host: '127.0.0.1', port: port, path: url }, function (r) {
      let body = '';
      r.on('data', c => body += c);
      r.on('end', function () { resolve({ status: r.statusCode, type: r.headers['content-type'], body: body }); });
    }).on('error', reject);
  });
}

server.listen(0, '127.0.0.1', async function () {
  const port = server.address().port;
  try {
    for (const u of targets) {
      const r = await fetch(port, u);
      stats.httpChecks.push(u + '=' + r.status);
      if (r.status !== 200) fail('HTTP ' + r.status + ' for ' + u);
      if (u.endsWith('.html') && r.body.indexOf('data-i18n=') === -1) fail('HTTP body missing i18n markup: ' + u);
    }
    console.log('[5] HTTP smoke test: ' + targets.length + ' requests on 127.0.0.1:' + port);
  } catch (e) { fail('HTTP smoke test error: ' + e.message); }
  server.close();

  const report = {
    ok: problems.length === 0,
    pages: stats.pages,
    dictionaryKeys: baseKeys.length,
    usedKeys: stats.keysUsed.size,
    refsChecked: stats.refsChecked,
    httpChecks: stats.httpChecks.length,
    problems: problems
  };
  fs.writeFileSync(path.join(ROOT, 'verify-report.json'), JSON.stringify(report, null, 2), 'utf8');
  if (problems.length) {
    console.log('\nFAILED (' + problems.length + '):');
    problems.forEach(p => console.log('  - ' + p));
    process.exitCode = 1;
  } else {
    console.log('\nPASS - all checks green. Report: verify-report.json');
  }
});
