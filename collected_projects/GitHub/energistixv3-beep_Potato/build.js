#!/usr/bin/env node
/* Inlines the whole lab into one self-contained page.
   Output is artifact-ready: no <!doctype>, <html>, <head> or <body> wrapper,
   because the Artifact host supplies those. Browsers open it directly too. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');

// Pull the scripts in the order index.html loads them.
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!scripts.length) throw new Error('no scripts found in index.html');

// Everything between the closing </head> tag's body start and </body>.
const bodyMatch = html.match(/<body>([\s\S]*?)<script src=/);
if (!bodyMatch) throw new Error('could not locate body markup');
const markup = bodyMatch[1].trim();

const fontLink = (html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/) || [''])[0];
const title = (html.match(/<title>([^<]*)<\/title>/) || [, 'Homeostasis Lab'])[1];
const description = (html.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];

const css = read('assets/css/main.css');
const js = scripts.map(s => '/* ' + s + ' */\n' + read(s)).join('\n');

const out = [
  `<title>${title}</title>`,
  description ? `<meta name="description" content="${description}">` : '',
  fontLink,
  `<style>\n${css}\n</style>`,
  markup,
  `<script>\n${js}\nPL.app.start();\n</script>`
].filter(Boolean).join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const target = path.join(root, 'dist', 'homeostasis-lab.html');
fs.writeFileSync(target, out);
console.log('wrote %s  (%d KB, %d scripts inlined)',
  path.relative(root, target), Math.round(out.length / 1024), scripts.length);
