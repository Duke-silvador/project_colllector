// Breadcrumbs: the trail at the top of every page below the front page (MUS 248 › Activities ›
// Salmon Gig Checklist › Worksheet), ending in the Repo improvements button. Pages hand over their
// trail; this file decides how it looks, so the hierarchy can change in one place. Section pages with a masthead (Lectures, Quiz, Study,
// Worksheets) already read as "MUS 248 · Section" and don't use it.
//
// Every href is a path from the site root ('' is the front page). The root comes from this file's
// own URL, so the same links work on the live site, a branch preview, and localhost.

import { REPO_IMPROVEMENT_FORM } from './feedback.js';
import './feedback-picker.js';
import { HUBS, docType, hubGroup } from './catalog.js';

const ROOT = new URL('./', import.meta.url).href;

const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The middle steps for anything in the activity catalog: its hub, then the heading it sits under
// there (Checklists › Gig checklists), unless that heading is the hub's catch-all.
export function catalogCrumbs(entry, directory = []) {
  const hub = HUBS[docType(entry || {})];
  const group = hubGroup(entry || {}, directory);
  return [[hub.title, `${hub.route}/`], ...(group.named ? [[group.label, `${hub.route}/#${group.id}`]] : [])];
}

// trail: [label, href] pairs after "MUS 248". The last one is the page itself and needs no href.
export function crumbs(trail) {
  addStyles();
  const steps = [['MUS 248', ''], ...trail];
  const items = steps.map(([label, href], index) => (index === steps.length - 1
    ? `<li aria-current="page">${escape(label)}</li>`
    : `<li><a href="${escape(ROOT + href)}">${escape(label)}</a></li>`)).join('');
  return `<nav class="crumbs no-print" aria-label="Breadcrumb"><ol>${items}</ol>`
    + `<a class="crumbs-feedback" href="${escape(REPO_IMPROVEMENT_FORM)}" target="_blank" rel="noopener" data-feedback>`
    + '<span aria-hidden="true">🛠️</span> Repo improvements</a></nav>';
}

// One small stylesheet for every page that shows a trail, whichever section stylesheet it loads.
// The colors fall back for pages whose stylesheet doesn't define the shared variables.
function addStyles() {
  if (typeof document === 'undefined' || document.getElementById('crumbs-style')) return;
  const style = document.createElement('style');
  style.id = 'crumbs-style';
  style.textContent = `
.crumbs { display:flex; align-items:flex-start; gap:.75rem; margin:0 0 1rem; font-size:.88rem; line-height:1.4; }
.crumbs ol { display:flex; flex:1 1 auto; flex-wrap:wrap; row-gap:.15rem; min-width:0; margin:0; padding:0; list-style:none; color:var(--muted, #6e6e73); }
.crumbs li { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.crumbs li:not(:first-child):not(:last-child) { max-width:min(100%, 15em); }
.crumbs li + li::before { content:"›"; margin:0 .4rem; color:var(--muted, #6e6e73); }
.crumbs a { color:var(--muted, #6e6e73); text-decoration:none; }
.crumbs a:hover { color:var(--ink, #1d1d1f); text-decoration:underline; }
.crumbs a:focus-visible { outline:3px solid var(--accent, #0071e3); outline-offset:2px; border-radius:.15rem; }
.crumbs [aria-current] { color:var(--ink, #1d1d1f); font-weight:600; }
.crumbs .crumbs-feedback { flex:none; color:var(--accent, #0071e3); font-weight:650; }
@media (max-width:520px) { .crumbs { font-size:.82rem; gap:.5rem; } }
@media print { .crumbs { display:none; } }`;
  document.head.append(style);
}
