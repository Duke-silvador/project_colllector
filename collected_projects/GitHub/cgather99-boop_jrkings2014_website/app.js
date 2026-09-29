// Jr Kings fundraiser: builds the shared header/sidebar/footer and renders each page from data.json.
// Volunteers should only need to edit data.json.

const MAX_EVENTS = 5;
const MAX_DONATIONS = 8;

const DEFAULT_NAV = [
  { label: 'Home', href: 'index.html', icon: 'home' },
  { label: 'Players', href: 'players.html', icon: 'users' },
  { label: 'Schedule', href: 'schedule.html', icon: 'calendar' },
  { label: 'Team Swag', href: 'swag.html', icon: 'shirt' },
];

// Inline SVG icons (24x24 viewBox) so no external icon library is needed.
const ICONS = {
  instagram: { rule: 'evenodd', d: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z' },
  facebook: { d: 'M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1z' },
  tiktok: { d: 'M16.6 2h-3.4v13.3a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.4 6.4 0 1 0 5.4 6.3V8.6a8 8 0 0 0 4.4 1.4V6.6a4.5 4.5 0 0 1-4.4-4.6z' },
  youtube: { rule: 'evenodd', d: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z' },
  x: { d: 'M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z' },
  venmo: { d: 'M19.5 3c.7 1.1 1 2.3 1 3.8 0 4.7-4 10.8-7.3 15.2H5.7L2.7 4.4l6.6-.6 1.6 12.8c1.5-2.4 3.3-6.2 3.3-8.8 0-1.4-.2-2.4-.6-3.2L19.5 3z' },
  paypal: { rule: 'evenodd', d: 'M7 21H3.5L6.3 3h7.2c3.6 0 5.8 1.9 5.3 5.3-.6 3.9-3.3 5.9-7 5.9H9.4L8.3 21H7zm3-9.8h1.7c1.8 0 3-.8 3.3-2.7.2-1.5-.7-2.3-2.3-2.3h-1.7L10 11.2z' },
  zelle: { d: 'M6 4h12v3l-8 10h8v3H6v-3l8-10H6V4z' },
  heart: { d: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 5.4 3.2 1.8-2 3.2-3.2 5.4-3.2 3.7 0 5.7 4 4.2 7.3C19.5 16.4 12 21 12 21z' },
  home: { d: 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z' },
  users: { d: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6v1H2v-1zm15.3-5.9c2.7.3 4.7 2.3 4.7 4.9v2h-4v-1c0-2.3-.2-4.3-.7-5.9z' },
  calendar: { rule: 'evenodd', d: 'M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2zM5 9v11h14V9H5z' },
  shirt: { d: 'M8.5 3 3 5.5 1.5 10.5l3.5 1.3L6 10.5V21h12V10.5l1 1.3 3.5-1.3L21 5.5 15.5 3a3.5 3.5 0 0 1-7 0z' },
  link: { d: 'M10.6 13.4a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0zM8.5 20a4.5 4.5 0 0 1-3.2-7.7l2.5-2.5 1.4 1.4-2.5 2.5a2.5 2.5 0 0 0 3.5 3.5l2.5-2.5 1.4 1.4-2.5 2.5A4.5 4.5 0 0 1 8.5 20zm7.7-5.8-1.4-1.4 2.5-2.5a2.5 2.5 0 0 0-3.5-3.5l-2.5 2.5-1.4-1.4 2.5-2.5a4.5 4.5 0 0 1 6.4 6.4l-2.6 2.4z' },
};
ICONS.twitter = ICONS.x;

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });
const monthYearFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const relFmt = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

const $ = (id) => document.getElementById(id);

// ---------- helpers ----------

// Parse "YYYY-MM-DD" as a local date (new Date("2026-10-11") would be UTC and can shift a day).
function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

// Only allow web and email links from data.json.
function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function externalLink(url, className, text) {
  const a = el('a', className, text);
  a.href = url;
  if (!url.startsWith('mailto:')) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return a;
}

function icon(name) {
  const def = ICONS[String(name).toLowerCase()] || ICONS.heart;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', def.d);
  if (def.rule) path.setAttribute('fill-rule', def.rule);
  svg.appendChild(path);
  return svg;
}

function initials(name) {
  return String(name).replace(/^SAMPLE\s*-\s*/i, '').split(/\s+/).filter(Boolean)
    .slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

function empty(container, message) {
  container.appendChild(el(container.tagName === 'UL' ? 'li' : 'p', 'empty', message));
}

function currentPageFile() {
  const file = location.pathname.split('/').pop();
  return file || 'index.html';
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = el('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const original = button.textContent;
  button.textContent = 'Copied!';
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1600);
}

// mailto only works with a default mail app, so also offer webmail compose links.
function emailLinks(email, { subject, body }) {
  const to = encodeURIComponent(email);
  const su = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return {
    mailto: `mailto:${email}?subject=${su}&body=${b}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${b}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${b}`,
  };
}

// Wires a mailto link plus a hidden "Email didn't open?" row (Gmail / Outlook.com / Copy)
// that appears after the link is clicked. Call set(msg) whenever the message changes.
function emailWithFallback(link, email, copyLabel = 'Copy email') {
  const row = el('div', 'email-alt');
  row.hidden = true;
  const gmail = externalLink('#', 'btn btn-copy', 'Gmail');
  const outlook = externalLink('#', 'btn btn-copy', 'Outlook.com');
  const copy = el('button', 'btn btn-copy', copyLabel);
  copy.type = 'button';
  row.append(el('span', '', 'Email didn’t open? Use:'), gmail, outlook, copy);

  let msg;
  copy.addEventListener('click', () => copyText(`To: ${email}\nSubject: ${msg.subject}\n\n${msg.body}`, copy));
  link.addEventListener('click', (ev) => {
    if (!ev.defaultPrevented) row.hidden = false;
  });

  return {
    row,
    set(message) {
      msg = message;
      const links = emailLinks(email, msg);
      link.href = links.mailto;
      gmail.href = links.gmail;
      outlook.href = links.outlook;
    },
  };
}

// ---------- shared shell (header, sidebar, footer) ----------
// These templates are static markup only; all data is inserted afterwards with textContent.

const HEADER_HTML = `
  <div class="header-inner">
    <a class="brand" href="index.html">
      <img id="team-logo" class="logo" src="Images/crown_logo.png" alt="Team logo">
      <div>
        <p id="team-name" class="team-name">Jr Kings</p>
        <p id="team-tagline" class="tagline"></p>
      </div>
    </a>
    <div class="progress-block">
      <div class="progress-stats">
        <span><strong id="raised">$0</strong> raised of <span id="target">$0</span></span>
        <span class="progress-meta"><strong id="percent">0%</strong> · <span id="days-left"></span></span>
      </div>
      <div id="progress" class="progress-track" role="progressbar" aria-label="Fundraising progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
      <p id="goal-purpose" class="goal-purpose"></p>
    </div>
    <div id="header-social" class="header-social" aria-label="Follow the team"></div>
  </div>`;

const SIDEBAR_HTML = `
  <ul id="nav-list" class="nav-list"></ul>
  <a class="btn btn-gold sidebar-donate" href="index.html#donate">Donate Now</a>`;

const SPONSORS_HTML = `
  <h2 id="sponsors-title">Local Sponsors</h2>
  <div id="sponsors"></div>
  <a id="become-sponsor" class="link-cta" href="#">Become a sponsor →</a>`;

const FOOTER_HTML = `
  <img class="footer-logo" src="Images/crown_logo.png" alt="">
  <p>Questions? Email <a id="contact-email" href="#"></a></p>
  <p id="tax-note" class="tax-note"></p>
  <div id="footer-social" class="footer-social"></div>`;

function buildShell() {
  $('site-header').innerHTML = HEADER_HTML;
  $('sidebar').innerHTML = SIDEBAR_HTML;
  $('sponsors-card').innerHTML = SPONSORS_HTML;
  $('site-footer').innerHTML = FOOTER_HTML;

  // Keep --header-h in sync so the sticky sidebar and anchor scrolling sit below the header.
  const header = $('site-header');
  const setHeight = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  setHeight();
  new ResizeObserver(setHeight).observe(header);
}

function renderNav(nav) {
  const list = $('nav-list');
  const items = Array.isArray(nav) && nav.length ? nav : DEFAULT_NAV;
  const current = currentPageFile();
  list.replaceChildren();

  for (const item of items) {
    const href = item.href || '#';
    const a = el('a', 'nav-link');
    a.href = href;
    a.append(icon(item.icon || 'link'), el('span', '', item.label));
    if (href.split('#')[0] === current) a.setAttribute('aria-current', 'page');
    const li = el('li');
    li.appendChild(a);
    list.appendChild(li);
  }
}

function renderHeader(team = {}) {
  if (team.name) {
    $('team-name').textContent = team.name;
    $('team-logo').alt = `${team.name} logo`;
    const page = document.title.split('·')[0].trim();
    document.title = document.body.dataset.page === 'home' ? `${team.name} Fundraiser` : `${page} · ${team.name}`;
  }
  if (team.logo) $('team-logo').src = team.logo;
  $('team-tagline').textContent = team.tagline || '';

  const email = team.contactEmail || '';
  const emailLink = $('contact-email');
  emailLink.textContent = email;
  emailLink.href = email ? `mailto:${email}` : '#';
  $('tax-note').textContent = team.taxNote || '';

  renderBecomeSponsor(team);
}

function sponsorMessage(teamName) {
  const team = teamName || 'the team';
  return {
    subject: `Sponsorship inquiry: ${team}`,
    body: [
      'Hi Jr Kings,',
      '',
      `We're interested in sponsoring ${team} on their trip to the Quebec International Pee-Wee Hockey Tournament.`,
      '',
      'Business name:',
      'Contact name:',
      'Phone:',
      'Website:',
      'Sponsorship level (Gold / Silver / Bronze / not sure):',
      '',
      'Please send us details on how to get involved.',
      '',
      'Thank you!',
    ].join('\n'),
  };
}

// A web form in team.sponsorContact wins; otherwise the link becomes a pre-filled email to contactEmail.
function renderBecomeSponsor(team) {
  const link = $('become-sponsor');
  if (!link) return;
  const contact = safeUrl(team.sponsorContact);
  if (contact && !contact.startsWith('mailto:')) {
    link.href = contact;
    link.target = '_blank';
    link.rel = 'noopener';
    return;
  }
  const email = team.contactEmail || '';
  if (!email) {
    link.hidden = true;
    return;
  }
  const mail = emailWithFallback(link, email);
  mail.set(sponsorMessage(team.name));
  link.after(mail.row);
}

function renderProgress(goal = {}) {
  const target = Number(goal.target) || 0;
  const raised = Number(goal.raised) || 0;
  const pct = target > 0 ? Math.round((raised / target) * 100) : 0;
  const fillPct = Math.min(pct, 100);

  $('raised').textContent = money.format(raised);
  $('target').textContent = money.format(target);
  $('percent').textContent = `${pct}%`;
  $('goal-purpose').textContent = goal.purpose || '';

  const bar = $('progress');
  bar.setAttribute('aria-valuenow', String(fillPct));
  bar.setAttribute('aria-valuetext', `${money.format(raised)} of ${money.format(target)} raised`);

  if (goal.deadline) {
    const left = daysBetween(today(), parseDate(goal.deadline));
    $('days-left').textContent =
      left > 1 ? `${left} days left` : left === 1 ? '1 day left' : left === 0 ? 'Last day!' : 'Campaign ended';
  }

  // Animate from 0 on the next frame.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('progress-fill').style.width = `${fillPct}%`;
  }));
}

function renderSocial(social = []) {
  const valid = social.filter((s) => safeUrl(s.url));
  for (const s of valid) {
    const url = safeUrl(s.url);
    const label = `${s.platform}${s.handle ? `: ${s.handle}` : ''}`;
    for (const container of [$('header-social'), $('footer-social')]) {
      const a = externalLink(url, '');
      a.setAttribute('aria-label', label);
      a.title = label;
      a.appendChild(icon(s.platform));
      container.appendChild(a);
    }
  }
}

// ---------- home page ----------

function renderTeamPhoto(photo) {
  const figure = $('team-photo');
  if (!figure || !photo?.src) return;
  const img = $('team-photo-img');
  img.src = photo.src;
  img.alt = photo.alt || 'Team photo';
  if (photo.caption) {
    const caption = $('team-photo-caption');
    caption.textContent = photo.caption;
    caption.hidden = false;
  }
  figure.hidden = false;
}

function renderAbout(about) {
  const section = $('about');
  const paragraphs = about?.paragraphs || [];
  if (!section || !about || (!about.title && !paragraphs.length)) return;

  $('about-title').textContent = about.title || '';
  const text = $('about-text');
  for (const p of paragraphs) text.appendChild(el('p', '', p));

  if (about.logo) {
    const logo = $('about-logo');
    logo.src = about.logo;
    logo.alt = about.logoAlt || about.title || '';
    logo.hidden = false;
  }

  const url = safeUrl(about.linkUrl);
  if (url) {
    const link = $('about-link');
    link.href = url;
    link.textContent = about.linkText || 'Learn more';
    link.hidden = false;
  }

  section.hidden = false;
}

function eventItem(e, isPast = false) {
  const date = parseDate(e.date);
  const li = el('li', isPast ? 'event past' : 'event');

  const badge = el('div', 'date-badge');
  badge.append(el('span', 'month', monthFmt.format(date)), el('span', 'day', String(date.getDate())));

  const body = el('div');
  const title = el('p', 'event-title');
  const link = safeUrl(e.link);
  title.appendChild(link ? externalLink(link, '', e.title) : document.createTextNode(e.title || ''));
  if (isPast) title.appendChild(el('span', 'status-chip', 'Completed'));
  const meta = [weekdayFmt.format(date), formatTime(e.time), e.location].filter(Boolean).join(' · ');
  body.append(title, el('p', 'event-meta', meta));

  li.append(badge, body);
  return li;
}

function sortEvents(events) {
  return events
    .filter((e) => e.date)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date) || String(a.time).localeCompare(String(b.time)));
}

function renderEvents(events = []) {
  const list = $('events');
  if (!list) return;
  const now = today();
  const upcoming = sortEvents(events).filter((e) => parseDate(e.date) >= now).slice(0, MAX_EVENTS);
  if (!upcoming.length) return empty(list, 'No upcoming events yet. Check back soon!');
  for (const e of upcoming) list.appendChild(eventItem(e));
}

function renderActivity(donations = []) {
  const list = $('activity');
  if (!list) return;
  const now = today();
  const recent = donations
    .filter((d) => d.date && Number(d.amount) > 0)
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, MAX_DONATIONS);

  if (!recent.length) return empty(list, 'Be the first to donate!');

  recent.forEach((d, i) => {
    const name = d.anonymous ? 'A generous supporter' : d.name;
    const li = el('li', i === 0 ? 'activity-item newest' : 'activity-item');
    li.appendChild(el('div', 'avatar', d.anonymous ? '♥' : initials(d.name)));

    const body = el('div');
    const text = el('p', 'activity-text');
    text.append(el('strong', '', name), ` donated ${money.format(Number(d.amount))} `);
    const ago = daysBetween(now, parseDate(d.date));
    text.appendChild(el('span', 'activity-time', `· ${relFmt.format(ago, 'day')}`));
    body.appendChild(text);
    if (d.message) body.appendChild(el('p', 'activity-message', `“${d.message}”`));

    li.appendChild(body);
    list.appendChild(li);
  });
}

function renderSponsors(sponsors = []) {
  const container = $('sponsors');
  if (!container) return;
  if (!sponsors.length) return empty(container, 'Your business could be here!');

  const order = ['Gold', 'Silver', 'Bronze'];
  const tiers = [...new Set(sponsors.map((s) => s.tier || 'Supporter'))]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

  for (const tier of tiers) {
    const known = order.includes(tier) ? tier.toLowerCase() : 'other';
    const section = el('div', `tier tier-${known}`);
    section.appendChild(el('span', 'tier-chip', tier));

    const grid = el('div', 'sponsor-grid');
    for (const s of sponsors.filter((x) => (x.tier || 'Supporter') === tier)) {
      const url = safeUrl(s.url);
      const card = url ? externalLink(url, 'sponsor') : el('div', 'sponsor');
      if (s.logo) {
        const img = el('img');
        img.src = s.logo;
        img.alt = '';
        card.appendChild(img);
      } else {
        card.appendChild(el('span', 'sponsor-initials', initials(s.name)));
      }
      card.appendChild(el('span', '', s.name));
      grid.appendChild(card);
    }
    section.appendChild(grid);
    container.appendChild(section);
  }
}

function renderDonate(links = []) {
  const container = $('donate-links');
  if (!container) return;
  if (!links.length) return empty(container, 'Donation options coming soon.');

  for (const d of links) {
    const row = el('div', 'donate-row');
    const url = safeUrl(d.url);
    const main = url ? externalLink(url, 'btn btn-primary') : el('div', 'donate-static');
    main.append(icon(d.icon || d.label), el('span', '', d.label));
    if (d.handle) main.appendChild(el('span', 'handle', d.handle));
    row.appendChild(main);

    if (d.handle) {
      const copy = el('button', 'btn btn-copy', 'Copy');
      copy.type = 'button';
      copy.setAttribute('aria-label', `Copy ${d.label} handle ${d.handle}`);
      copy.addEventListener('click', () => copyText(d.handle, copy));
      row.appendChild(copy);
    }
    container.appendChild(row);
  }
}

// ---------- players page ----------

function renderPlayers(players = []) {
  const grid = $('players');
  if (!grid) return;
  if (!players.length) return empty(grid, 'Roster coming soon.');

  const sorted = [...players].sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999));
  for (const p of sorted) {
    const card = el('article', 'player');
    if (p.photo) {
      const img = el('img', 'player-photo');
      img.src = p.photo;
      img.alt = p.name || '';
      card.appendChild(img);
    } else {
      card.appendChild(el('div', 'player-number', p.number != null ? `#${p.number}` : initials(p.name)));
    }
    card.appendChild(el('p', 'player-name', p.name));
    const meta = el('p', 'player-meta');
    if (p.number != null) meta.appendChild(el('strong', '', `#${p.number}`));
    if (p.number != null && p.position) meta.append(' · ');
    if (p.position) meta.append(p.position);
    card.appendChild(meta);
    grid.appendChild(card);
  }
}

// ---------- swag page ----------

function swagOrderMessage(item, size) {
  const label = size ? `${item.name} (${size})` : item.name;
  const body = [
    'Hi Jr Kings,',
    '',
    'I would like to order:',
    `Item: ${item.name}`,
    size ? `Size: ${size}` : null,
    item.price != null ? `Price: ${money.format(Number(item.price))}` : null,
    'Quantity: 1',
    '',
    'My name:',
    'Phone:',
    'Player (if any):',
    '',
    'Thank you!',
  ].filter((line) => line != null).join('\n');
  return { subject: `Swag order: ${label}`, body };
}

function renderSwag(items = [], email = '') {
  const grid = $('swag');
  if (!grid) return;
  if (!items.length) return empty(grid, 'Swag coming soon.');

  items.forEach((item, i) => {
    const card = el('article', 'swag-item');

    if (item.image) {
      const img = el('img', 'swag-image');
      img.src = item.image;
      img.alt = item.name || '';
      card.appendChild(img);
    } else {
      const placeholder = el('div', 'swag-image swag-placeholder');
      placeholder.appendChild(icon('shirt'));
      card.appendChild(placeholder);
    }

    const body = el('div', 'swag-body');
    body.appendChild(el('p', 'swag-name', item.name));
    if (item.price != null) body.appendChild(el('p', 'swag-price', money.format(Number(item.price))));
    if (item.description) body.appendChild(el('p', 'swag-desc', item.description));

    const sizes = Array.isArray(item.sizes) ? item.sizes : [];
    let select = null;
    const note = el('p', 'swag-note', 'Please choose a size.');
    note.hidden = true;

    if (sizes.length) {
      const id = `swag-size-${i}`;
      const label = el('label', 'swag-label', 'Size');
      label.htmlFor = id;
      select = el('select', 'swag-select');
      select.id = id;
      const prompt = el('option', '', 'Choose a size');
      prompt.value = '';
      select.appendChild(prompt);
      for (const s of sizes) {
        const opt = el('option', '', s);
        opt.value = s;
        select.appendChild(opt);
      }
      body.append(label, select);
    }

    if (email) {
      const order = el('a', 'btn btn-gold swag-order', 'Order');
      // Size check runs first so it can cancel the click before the fallback row shows.
      order.addEventListener('click', (ev) => {
        if (select && !select.value) {
          ev.preventDefault();
          note.hidden = false;
          select.focus();
        }
      });
      const mail = emailWithFallback(order, email, 'Copy order');
      const update = () => mail.set(swagOrderMessage(item, select?.value));
      update();
      if (select) {
        select.addEventListener('change', () => {
          update();
          if (select.value) note.hidden = true;
        });
      }
      body.append(note, order, mail.row);
    }

    card.appendChild(body);
    grid.appendChild(card);
  });
}

// ---------- schedule page ----------

function renderSchedule(events = []) {
  const container = $('schedule');
  if (!container) return;
  const now = today();
  const sorted = sortEvents(events);
  const upcoming = sorted.filter((e) => parseDate(e.date) >= now);
  const past = sorted.filter((e) => parseDate(e.date) < now).reverse();

  if (!upcoming.length) empty(container, 'No upcoming events yet. Check back soon!');

  // Group upcoming events by month.
  let currentMonth = '';
  let list = null;
  for (const e of upcoming) {
    const month = monthYearFmt.format(parseDate(e.date));
    if (month !== currentMonth) {
      currentMonth = month;
      container.appendChild(el('h2', 'month-heading', month));
      list = el('ul', 'event-list');
      container.appendChild(list);
    }
    list.appendChild(eventItem(e));
  }

  if (past.length) {
    const details = el('details', 'past-events');
    details.appendChild(el('summary', '', `Past Events (${past.length})`));
    const pastList = el('ul', 'event-list');
    for (const e of past) pastList.appendChild(eventItem(e, true));
    details.appendChild(pastList);
    container.appendChild(details);
  }
}

// ---------- boot ----------

async function init() {
  buildShell();
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderNav(data.nav);
    renderHeader(data.team);
    renderProgress(data.goal);
    renderSocial(data.social);

    renderTeamPhoto(data.teamPhoto);
    renderAbout(data.about);
    renderEvents(data.events);
    renderActivity(data.donations);
    renderSponsors(data.sponsors);
    renderDonate(data.donateLinks);

    renderPlayers(data.players);
    renderSchedule(data.events);
    renderSwag(data.swag, data.team?.contactEmail);
  } catch (err) {
    console.error(err);
    renderNav(DEFAULT_NAV);
    const box = $('error');
    box.textContent = location.protocol === 'file:'
      ? 'This page needs to be served from a web server to load its data. See README.md ("Preview on your computer").'
      : 'Sorry, we could not load the fundraiser details right now. Please try again later. (data.json may have a typo.)';
    box.hidden = false;
  }
}

init();
