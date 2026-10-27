// The hub pages: /activities/, /checklists/, and the catalog half of /reference/. Each lists one
// type from data/activities.json under its hubGroup headings, with the "where" and skill filters.
// The page names its type: <body data-hub="checklist">.

import { DOC_TYPES, SETTINGS, SKILL_EMOJI, docType, groupLabel, hubGroup, settingsChips, typeChip, whereMatch, whereSummary } from './catalog.js';
import './feedback-picker.js';
import { REPO_IMPROVEMENT_FORM } from './feedback.js';

const byId = (id) => document.getElementById(id);

// Without JavaScript the Repo improvements button leads to the Repo Improvement page, which shows
// the form too; with it, the button opens the picker (feedback-picker.js).
document.querySelectorAll('a[data-feedback]').forEach((link) => { link.href = REPO_IMPROVEMENT_FORM; });

async function loadHub() {
  const type = document.body.dataset.hub;
  const directory = await fetch('../data/activities.json').then((response) => response.json());
  const entries = directory.filter((entry) => docType(entry) === type);

  const filter = byId('skill-filter');
  const whereBoxes = [...document.querySelectorAll('#where-picker input[type="checkbox"]')];
  const clear = byId('clear-filters');
  const list = byId('activity-list');
  const count = byId('activity-count');
  const skills = [...new Set(entries.flatMap((entry) => entry.skills))].sort();
  skills.forEach((skill) => filter.add(new Option(`${SKILL_EMOJI[skill] || '🛠️'} ${skill}`, skill)));

  // Headings in catalog order, with the catch-all last.
  const groups = [];
  entries.forEach((entry) => {
    const group = hubGroup(entry, directory);
    if (!groups.some((known) => known.id === group.id)) groups.push(group);
  });
  groups.sort((a, b) => Number(!a.named) - Number(!b.named));

  const card = (entry) => {
    // Every card opens the entry's own page — never a direct external link — so the after-activity
    // steps and the Repo Improvement form are never skipped for external activities.
    const action = `<a class="activity-link" href="../${entry.route}/">Open ${DOC_TYPES[docType(entry)].label.toLowerCase()} <span aria-hidden="true">→</span></a>`;
    // The worksheet link lives on the entry's page itself ("Print the worksheet"), not here —
    // one primary action per card.
    const line = [entry.time, whereSummary(entry), entry.contentFile ? '' : 'External instructions ↗'].filter(Boolean).join(' · ');
    const family = entry.family ? `<p class="activity-family">${entry.family}</p>` : '';
    const skillChips = entry.skills.map((skill) => `<span class="chip"><span aria-hidden="true">${SKILL_EMOJI[skill] || '🛠️'}</span>${skill}</span>`).join('');
    const access = entry.access ? `<span class="chip"><span aria-hidden="true">📍</span>${entry.access}</span>` : '';
    const meta = `<div class="activity-meta">${typeChip(entry)}${skillChips}${settingsChips(entry)}${access}<span class="chip"><span aria-hidden="true">👥</span>${groupLabel(entry.group)}</span></div>`;
    return `<details class="activity-card">
      <summary>
        <span class="activity-emoji" aria-hidden="true">${entry.emoji}</span>
        <span class="card-copy"><strong>${entry.title}</strong><small>${line}</small></span>
        <span class="arrow" aria-hidden="true">⌄</span>
      </summary>
      <div class="card-details">
        ${meta}
        ${family}
        <div class="card-actions">${action}</div>
      </div>
    </details>`;
  };

  const show = () => {
    const selectedSkill = filter.value;
    const where = whereBoxes.filter((box) => box.checked).map((box) => box.value);
    const candidates = entries.filter((entry) => selectedSkill === 'all' || entry.skills.includes(selectedSkill));
    // A checked "Where" never hides an entry whose page doesn't say: those go in an "ask first" group.
    const visible = where.length ? candidates.filter((entry) => whereMatch(entry, where) === 'yes') : candidates;
    const askFirst = where.length ? candidates.filter((entry) => whereMatch(entry, where) === 'confirm') : [];
    count.textContent = `${visible.length} ${visible.length === 1 ? 'item' : 'items'}${askFirst.length ? ` · ${askFirst.length} to ask about` : ''}`;
    clear.hidden = !(where.length || selectedSkill !== 'all');
    const said = SETTINGS.filter((setting) => where.includes(setting.key)).map((setting) => setting.short).join(' or ');
    // One heading only means the headings carry no information, so a single group goes bare.
    const shown = groups.map((group) => [group, visible.filter((entry) => hubGroup(entry, directory).id === group.id)])
      .filter(([, members]) => members.length);
    list.innerHTML = shown.map(([group, members]) => (groups.length > 1
      ? `<section class="hub-group" id="${group.id}"><h2 class="section-title">${group.label}</h2><div class="activity-grid">${members.map(card).join('')}</div></section>`
      : `<div class="activity-grid">${members.map(card).join('')}</div>`)).join('')
      + (askFirst.length ? `<h3 class="ask-first">Ask the instructor first <small>these pages don't say whether they can be done ${said}</small></h3><div class="activity-grid">${askFirst.map(card).join('')}</div>` : '');
  };
  [filter, ...whereBoxes].forEach((control) => control.addEventListener('change', show));
  clear.addEventListener('click', () => {
    filter.value = 'all';
    whereBoxes.forEach((box) => { box.checked = false; });
    show();
  });
  show();
  // The headings are drawn after load, so a breadcrumb's #gig has to be scrolled to by hand.
  const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (target) target.scrollIntoView();
}

if (byId('activity-list')) {
  loadHub().catch(() => {
    byId('activity-list').innerHTML = '<p class="error">This list could not be loaded. Please try again.</p>';
  });
}
