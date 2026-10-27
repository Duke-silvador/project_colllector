// Labels for the catalog's optional metadata, shared by the front page and the activity page.
//
// Both fields are optional so older entries keep working unchanged:
//   type      "activity" (the default) · "checklist" · "reference"
//   settings  { home, class, outsideClass } — each "yes", "no", or "confirm".
//             A missing key, or any other value, reads as "confirm": where a source doesn't say,
//             the page says to ask rather than guessing at access.

export const DOC_TYPES = {
  activity: { label: 'Activity', plural: 'activities', emoji: '🎯' },
  checklist: { label: 'Checklist', plural: 'checklists', emoji: '☑️' },
  reference: { label: 'Reference', plural: 'references', emoji: '📖' },
};

export const docType = (entry) => (DOC_TYPES[entry.type] ? entry.type : 'activity');

// A finer label inside a type. Reset procedures are checklists, so they keep the checklist type and
// get their own filter option and chip.
export const KINDS = {
  gig: { label: 'Gig checklist', plural: 'Gig checklists', emoji: '🎟️' },
  reset: { label: 'Reset procedure', plural: 'Reset procedures', emoji: '🔁' },
};

export const SKILL_EMOJI = {
  'Audio Capture': '🎙️',
  'Video Capture': '📹',
  'Live Sound': '🔊',
  'Post Production': '💻',
  'Data Management': '💾',
};

// "1–3" → "Solo or groups of 2–3": says plainly whether you can do it alone.
export function groupLabel(group) {
  const text = String(group || '').trim();
  const range = text.match(/^(\d+)\s*[–-]\s*(\d+)$/);
  if (!range) {
    if (text === '1') return 'Solo';
    if (text === '2') return 'Pairs';
    return text ? `Groups of ${text}` : '';
  }
  const [low, high] = [Number(range[1]), Number(range[2])];
  if (low === 1 && high === 2) return 'Solo or pairs';
  if (low === 1) return `Solo or groups of 2–${high}`;
  return `Groups of ${low}–${high}`;
}

// In the order the front page shows them as checkboxes.
export const SETTINGS = [
  { key: 'class', label: 'During class', short: 'during class', tag: 'In class', emoji: '🏫' },
  { key: 'home', label: 'At home', short: 'at home', tag: 'At home', emoji: '🏠' },
  { key: 'outsideClass', label: 'On campus, outside class', short: 'on campus outside class', tag: 'On campus', emoji: '🔑' },
];

// The card's one-line answer to "where can I do this?": "🏫 In class only", "🏫 In class · 🏠 At home".
export function whereSummary(entry) {
  if (!entry.settings) return '';
  const yes = SETTINGS.filter((setting) => settingValue(entry, setting.key) === 'yes');
  if (!yes.length) return '❓ Ask first';
  // "only" just when the other settings are a definite "no", not merely unconfirmed.
  const only = yes.length === 1 && SETTINGS.every((setting) => setting.key === yes[0].key || settingValue(entry, setting.key) === 'no');
  if (only) return `${yes[0].emoji} ${yes[0].tag} only`;
  return yes.map((setting) => `${setting.emoji} ${setting.tag}`).join(' · ');
}

// "yes", "no", or "confirm" for one setting; a missing or unknown value reads as "confirm".
export const settingValue = (entry, key) => {
  const value = entry.settings && entry.settings[key];
  return ['yes', 'no'].includes(value) ? value : 'confirm';
};

// The front page's "Where" checkboxes: an entry matches when any checked setting is "yes", and
// lands in "ask first" when none is "yes" but one is "confirm".
export function whereMatch(entry, keys) {
  const values = keys.map((key) => settingValue(entry, key));
  if (values.includes('yes')) return 'yes';
  return values.includes('confirm') ? 'confirm' : 'no';
}

const chip = (emoji, text, extra = '') => `<span class="chip${extra}"><span aria-hidden="true">${emoji}</span>${text}</span>`;

export const typeChip = (entry) => {
  const type = DOC_TYPES[docType(entry)];
  const kind = KINDS[entry.kind];
  return chip(type.emoji, type.label, ' chip-type') + (kind ? chip(kind.emoji, kind.label, ' chip-type') : '');
};

// No settings at all → nothing shown, exactly as before this field existed.
export function settingsChips(entry) {
  if (!entry.settings) return '';
  const yes = SETTINGS.filter((setting) => settingValue(entry, setting.key) === 'yes');
  const unsure = SETTINGS.filter((setting) => settingValue(entry, setting.key) === 'confirm');
  return yes.map((setting) => chip(setting.emoji, setting.label)).join('')
    + (unsure.length ? chip('❓', `Confirm with instructor: ${unsure.map((setting) => setting.short).join(', ')}`) : '');
}

// Each type has a hub page of its own (/activities/, /checklists/, /reference/), and the hub sorts
// its entries under headings. Breadcrumbs follow the same two levels.
export const HUBS = {
  activity: { route: 'activities', title: 'Activities' },
  checklist: { route: 'checklists', title: 'Checklists' },
  reference: { route: 'reference', title: 'Reference' },
};

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The heading an entry sits under on its hub: checklists by kind; activities by family, but only
// a family with two or more activities gets a heading. Everything else shares a catch-all, which
// the breadcrumb leaves out (`named` is false).
export function hubGroup(entry, directory) {
  const type = docType(entry);
  if (type === 'checklist') {
    return KINDS[entry.kind]
      ? { id: entry.kind, label: KINDS[entry.kind].plural, named: true }
      : { id: 'other', label: 'Other checklists', named: true };
  }
  const family = entry.family && directory.filter((other) => docType(other) === type && other.family === entry.family).length > 1;
  if (family) return { id: slug(entry.family), label: entry.family, named: true };
  return { id: 'more', label: type === 'activity' ? 'More activities' : 'Guides', named: false };
}
