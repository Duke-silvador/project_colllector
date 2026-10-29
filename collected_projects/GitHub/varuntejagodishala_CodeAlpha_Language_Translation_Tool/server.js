/**
 * PolyGlot Studio - Node.js Express Server & Proxy Backend
 * Provides static web server + optional proxy endpoint to bypass CORS
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// MIME type map for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Pure Node.js HTTP server (zero external npm dependencies required!)
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Proxy Endpoint: POST /api/translate
  if (pathname === '/api/translate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { text, source = 'auto', target = 'en', provider = 'google-free', apiKey, azureRegion } = JSON.parse(body);

        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Text is required' }));
          return;
        }

        let result = null;

        if (provider === 'google-free') {
          const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
          const response = await fetch(gtxUrl);
          const data = await response.json();
          const translatedText = data[0].map(s => s[0]).filter(Boolean).join('');
          result = { text: translatedText, detectedLang: data[2] || null };
        } else if (provider === 'mymemory-free') {
          const pair = `${source === 'auto' ? 'en' : source.split('-')[0]}|${target.split('-')[0]}`;
          const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
          const response = await fetch(memUrl);
          const data = await response.json();
          result = { text: data.responseData.translatedText, detectedLang: null };
        } else if (provider === 'azure') {
          let azureUrl = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${target}`;
          if (source !== 'auto') azureUrl += `&from=${source}`;
          const headers = {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey,
          };
          if (azureRegion) headers['Ocp-Apim-Subscription-Region'] = azureRegion;
          const response = await fetch(azureUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify([{ Text: text }]),
          });
          const data = await response.json();
          result = { text: data[0].translations[0].text, detectedLang: data[0].detectedLanguage?.language || null };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Server translate error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Health check endpoint
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 PolyGlot Studio is live at: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
