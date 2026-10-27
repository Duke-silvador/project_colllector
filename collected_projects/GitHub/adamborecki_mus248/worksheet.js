// Generates a printable worksheet from an activity's own Markdown.
//
// The activity page is the textbook: every instruction, table, and troubleshooting
// tree. The worksheet is the workbook: the checkpoints to tick, the terms to
// define, and the questions to answer, on one page a student can hold at a mic
// stand. Both come out of the same file, so the paper can never drift from the
// page — which is what turned the last hand-maintained version into paperwork.
//
// Deliberately NOT carried over: the step-by-step procedure, photos, and
// troubleshooting. Those stay on the phone. Nobody should copy screen to paper.
// What the paper does carry is a pointer, at each spot a section was skipped, naming
// what the QR code leads to.

import { ANSWER_LINE, FRONTMATTER, OPTION, blankTerms, escapeHtml, inline, isFence, joinWrappedLines, stepNumbers } from './markdown.js';
import qrcode from './qrcode-generator.js';
import { groupLabel } from './catalog.js';
import { instructorView, isVisible, lectureView } from './lectures/view.js';
import { FORM_HEADING, FORM_NOTE, REPO_IMPROVEMENT_FORM } from './feedback.js';
import { catalogCrumbs, crumbs } from './crumbs.js';

// Printed worksheets leave the site — the QR has to carry an absolute URL, not a relative one.
const SITE_ORIGIN = 'https://adamborecki.github.io/mus248';

const BLANK = /_{3,}/g;
const QUESTION = /^\*\*Q(\d+)\s*(?:\(([^)]*)\))?\s*[.:]\*\*\s*(.*)$/;
const CHECKPOINT = /^\s*(?:(?:[-*]|\d+\.)\s+)?(?:>\s*)?🚩\s*(.*)$/;
const CHECKPOINT_LABEL = /^\*\*((?:final\s+|last\s+)?checkpoint[^*]*?)\s*\*\*\s*/i;

// Headings carry a leading emoji ("## ✅ Definition of done"); match on the words.
const slug = (heading) => heading.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase();

const unquote = (value) => value.trim()
  .replace(/\s+#\s.*$/, '')
  .replace(/^"(.*)"$/, '$1')
  .replace(/^'(.*)'$/, '$1')
  .trim();

export function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  let key = null;
  match[1].split('\n').forEach((line) => {
    if (!line.trim()) return;
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) {
      key = top[1];
      data[key] = top[2].trim() ? unquote(top[2]) : null;
      return;
    }
    if (!key) return;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(unquote(item[1]));
      return;
    }
    const nested = line.match(/^\s+([A-Za-z][\w-]*):\s*(.*)$/);
    if (nested) {
      if (data[key] === null || typeof data[key] !== 'object' || Array.isArray(data[key])) data[key] = {};
      data[key][nested[1]] = unquote(nested[2]);
    }
  });
  return data;
}

// Checkpoints come in two shapes — "🚩 **Checkpoint.** You should now see…" and a
// blockquoted "> 🚩 You will set the house default twice…". Drop the label, keep
// the sentence; when the label is all there is, the label becomes the sentence.
function checkpointText(raw) {
  const label = raw.match(CHECKPOINT_LABEL);
  if (!label) return raw.trim();
  const rest = raw.replace(CHECKPOINT_LABEL, '').trim();
  return rest || `${label[1].replace(/[.:]$/, '')}.`;
}

function parseQuestion(lines, index, section, order) {
  const match = lines[index].match(QUESTION);
  if (!match) return null;
  const question = {
    number: Number(match[1]),
    type: (match[2] || '').trim().toLowerCase(),
    prompt: match[3].trim(),
    options: [],
    answer: null,
    note: null,
    section,
    order,
  };
  // A prompt may wrap; its options and its ✅ answer follow, separated by at most
  // a blank line. Anything else — a heading, a checkpoint, the next paragraph or
  // the next question — ends the block.
  let mode = 'prompt';
  let scan = index + 1;
  for (; scan < lines.length; scan += 1) {
    const line = lines[scan].trim();
    if (!line) {
      if (mode === 'answer') break;
      if (mode === 'prompt') mode = 'gap';
      else if (mode === 'options') mode = 'gap-after-options';
      continue;
    }
    if (/^(#{1,6}\s|>|\||🚩|🔄|\d+\.\s)/.test(line) || QUESTION.test(line)) break;
    const answer = line.match(ANSWER_LINE);
    if (answer) { question.note = answer[1].trim(); mode = 'answer'; continue; }
    const option = line.match(OPTION);
    if (option) {
      question.options.push({ letter: option[2].toLowerCase(), text: option[3].trim(), correct: Boolean(option[1]) });
      mode = 'options';
      continue;
    }
    if (mode === 'prompt') { question.prompt = `${question.prompt} ${line}`.trim(); continue; }
    if (mode === 'answer') { question.note = `${question.note} ${line}`.trim(); continue; }
    break;
  }
  if (!question.type) question.type = question.options.length ? 'multiple choice' : 'short answer';
  const marked = question.options.find((option) => option.correct);
  question.answer = question.note || (marked ? `${marked.letter}) ${marked.text}` : null);
  question.blanks = (question.prompt.match(BLANK) || []).length;
  // A lecture's fill-in-the-blank question marks its answer in the prompt: ==context window==.
  question.terms = blankTerms(question.prompt);
  question.end = scan;
  return question;
}

// A lecture's numbered questions are for the online refresher, not the slides or the notes: this
// takes them out, using the same block rules that find them.
export function stripQuestions(markdown) {
  const lines = joinWrappedLines(markdown).split('\n');
  const kept = [];
  let fenced = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (isFence(lines[index])) fenced = !fenced;
    const question = fenced ? null : parseQuestion(lines, index, '', index);
    if (question) { index = question.end - 1; continue; }
    kept.push(lines[index]);
  }
  return kept.join('\n');
}

// Sections whose checkpoints and questions get a block of their own on the worksheet, rather than
// being folded into "As you go" — the optional extensions and the pack-up, which a student reaches
// at a different moment than the core procedure and should be able to find at a glance.
const NAMED_BLOCKS = [
  { match: /^explore/, hint: 'only after the core path works — tick what you tried' },
  { match: /^finish/, hint: 'tick each one before you leave the room' },
];
const blockFor = (part) => {
  const named = NAMED_BLOCKS.find((block) => block.match.test(slug(part || '')));
  return named ? { title: part.replace(/^[^\p{L}\p{N}]+/u, '').trim(), hint: named.hint } : null;
};

// Groups whose worksheet content lives under one heading rather than scattered
// through the activity — they enter the flow once, at that heading's position.
const GROUPS = { 'key terms': 'keyTerms', 'practice first': 'practice', 'definition of done': 'done', 'before you leave': 'beforeYouLeave' };

// "## 🕹️ Practice first": one bullet per simulator or page to rehearse on, each starting with its
// link. The page shows the links; the paper can't click, so each one prints as a QR code.
const PRACTICE_LINK = /^\[([^\]]+)\]\(([^)\s]+)\)\s*[:—–-]?\s*(.*)$/;

// Sections that put nothing on the paper still exist on the web page — the worksheet says so at
// the point they were skipped, so a student holding only the printout knows the QR has more
// (troubleshooting above all). Instructor-facing sections are left out of that pointer.
const NOT_FOR_STUDENTS = ['technical verification', 'ai use disclosure', 'core skill area'];

export function parseActivity(markdown) {
  const frontmatter = parseFrontmatter(markdown);
  const lines = joinWrappedLines(markdown.replace(FRONTMATTER, '')).split('\n');
  const numbers = stepNumbers(lines);
  const result = {
    frontmatter, done: [], doneIds: [], keyTerms: [], alsoKnow: [], practice: [], beforeYouLeave: [], checkpoints: [], questions: [], flow: [],
  };
  let section = '';
  let sectionTitle = '';
  let label = '';
  let sectionStart = -1;
  let sectionFlowLength = 0;
  const noteIfSkipped = () => {
    if (sectionStart < 0 || GROUPS[section] || NOT_FOR_STUDENTS.includes(section)) return;
    if (result.flow.length > sectionFlowLength) return;
    // "Safety and handling — read this before you touch anything": the pointer only needs the name.
    const title = sectionTitle.replace(/^[^\p{L}\p{N}]+/u, '').split(' — ')[0].trim();
    result.flow.push({ type: 'skipped', title, order: sectionStart });
  };

  let fenced = false;
  lines.forEach((line, index) => {
    // A code block is something to look at, never a question, checkpoint, or term.
    if (isFence(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      label = heading[2].replace(/^[^\p{L}\p{N}]+/u, '').trim();
      if (heading[1].length === 2) {
        noteIfSkipped();
        sectionStart = index;
        sectionFlowLength = result.flow.length;
        section = slug(heading[2]);
        sectionTitle = heading[2];
        if (GROUPS[section]) result.flow.push({ type: 'group', key: GROUPS[section], order: index });
      }
      return;
    }

    const question = parseQuestion(lines, index, label, index);
    if (question) {
      question.part = sectionTitle;
      result.questions.push(question);
      result.flow.push({ type: 'question', question, order: index });
      return;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const isOption = bullet && OPTION.test(line.trim());

    if (section === 'definition of done') {
      // These are already 🚩-marked in the source; they are the done list, not a
      // second copy of the in-activity checkpoints.
      if (bullet && !isOption && !ANSWER_LINE.test(line.trim())) {
        result.done.push(bullet[1].replace(/^🚩\s*/, '').replace(/^\[[ xX]\]\s*/, '').trim());
        result.doneIds.push(numbers.get(index) || '');
      }
      return;
    }

    if (section === 'key terms') {
      if (!line.trim() || bullet) return;
      line.split('·').map((term) => term.trim()).filter(Boolean).forEach((term) => {
        const primary = term.match(/^\*\*(.+)\*\*$/);
        if (primary) result.keyTerms.push(primary[1].trim());
        else result.alsoKnow.push(term.replace(/\*\*/g, '').trim());
      });
      return;
    }

    if (section === 'practice first') {
      const link = bullet && bullet[1].trim().match(PRACTICE_LINK);
      if (link) result.practice.push({ label: link[1].trim(), url: link[2], note: link[3].trim() });
      return;
    }

    if (section === 'before you leave' && bullet && !isOption) {
      result.beforeYouLeave.push(bullet[1].trim());
      return;
    }

    const checkpoint = line.match(CHECKPOINT);
    if (checkpoint) {
      const entry = { text: checkpointText(checkpoint[1]), section: label, part: sectionTitle, order: index, id: numbers.get(index) || '' };
      result.checkpoints.push(entry);
      result.flow.push({ type: 'checkpoint', checkpoint: entry, order: index });
    }
  });

  noteIfSkipped();
  result.flow.sort((a, b) => a.order - b.order);
  return result;
}

// ---------- rendering ----------

const writable = (text, showAnswers = false) => inline(text, { blanks: showAnswers ? 'mark' : 'blank' }).replace(BLANK, '<span class="blank"></span>');
const rule = (count = 1) => '<span class="rule"></span>'.repeat(count);

// Links a printed worksheet back to its activity page — the phone has the procedure, photos, and
// troubleshooting the paper deliberately leaves out.
export function renderQr(route, title, cue = 'Scan for full instructions') {
  if (!route) return '';
  return qrBlock(`${SITE_ORIGIN}/${route}/`, cue, `QR code linking to the ${title} page`, title);
}

// A QR code with a cue above it and the address under it, for any URL.
export function qrBlock(url, cue, alt, title = cue) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const svg = qr.createSvgTag({
    cellSize: 4,
    margin: 4,
    scalable: true,
    alt,
    title: `${title} — ${url}`,
  });
  // Break opportunities after each slash, so a long URL wraps at path boundaries instead of
  // wherever the browser's default line-breaking happens to land mid-word.
  const displayUrl = escapeHtml(url.replace(/^https?:\/\//, '')).replace(/\//g, '/<wbr>');
  return `<div class="ws-qr"><span class="ws-qr-cue">${escapeHtml(cue)}</span>${svg}<span class="ws-qr-url">${displayUrl}</span></div>`;
}

// The Repo Improvement form at the foot of an activity page or a lecture page: a link and a QR code.
export const formQr = () => qrBlock(REPO_IMPROVEMENT_FORM, 'Scan for the form', 'QR code for the Repo Improvement form');
export function renderFormSection(note = FORM_NOTE) {
  return `
    <section class="completion repo-form">
      <div class="repo-form-row">
        <div><h2><span aria-hidden="true">📝</span> ${FORM_HEADING}</h2>
          <p class="quiet">${note}</p>
          <a class="canvas-link" href="${REPO_IMPROVEMENT_FORM}" target="_blank" rel="noopener">Open the Repo Improvement form <span aria-hidden="true">↗</span></a></div>
        ${formQr()}
      </div>
    </section>`;
}

// The last thing on every student worksheet: the Repo Improvement form, as a code to scan and an
// address to type. (Lecture worksheets and answer keys leave it off.)
export function renderFormBlock(note = FORM_NOTE) {
  const short = REPO_IMPROVEMENT_FORM.replace(/^https?:\/\//, '');
  return `<section class="ws-block ws-form"><div class="ws-form-row"><div><h2>📝 ${escapeHtml(FORM_HEADING)}</h2>`
    + `<p>${escapeHtml(note)} Scan the code, or go to <b>${escapeHtml(short)}</b></p></div>`
    + `${qrBlock(REPO_IMPROVEMENT_FORM, 'Scan for the form', 'QR code for the Repo Improvement form')}</div></section>`;
}

function renderQuestion(question, showAnswers) {
  const number = `<span class="q-number">Q${question.number}</span>`;
  const prompt = `<p class="q-prompt">${number}${writable(question.prompt, showAnswers)}</p>`;
  let body = '';

  if (question.options.length) {
    body = `<ol class="options">${question.options.map((option) => {
      const correct = showAnswers && option.correct ? ' correct' : '';
      return `<li class="option${correct}"><span class="letter" aria-hidden="true">${escapeHtml(option.letter)}</span><span>${inline(option.text)}</span></li>`;
    }).join('')}</ol>`;
  } else if (!question.blanks) {
    body = `<p class="answer-lines">${rule(2)}</p>`;
  }

  const spelledOut = question.note || (question.options.length ? '' : question.answer);
  const unanswered = '<span class="unmarked">no answer marked in the source</span>';
  const key = showAnswers && (spelledOut || !question.answer)
    ? `<p class="key-answer"><span aria-hidden="true">✅</span> ${spelledOut ? inline(spelledOut) : unanswered}</p>`
    : '';
  return `${prompt}${body}${key}`;
}

export function renderWorksheet(activity, options = {}) {
  const { showAnswers = false, directory = {} } = options;
  // Checklists print the same step numbers as their page, so "3.4" means the same line on both.
  const stepId = (id) => (directory.type === 'checklist' && id ? `<b class="step-id">${escapeHtml(id)}</b> ` : '');
  const front = activity.frontmatter || {};
  const title = front.title || directory.title || 'Activity';
  const emoji = front.emoji || directory.emoji || '📄';
  const sizes = front.groupSize || {};
  const range = sizes.minimum && sizes.maximum && String(sizes.minimum) !== String(sizes.maximum)
    ? `${sizes.minimum}–${sizes.maximum}`
    : sizes.ideal;
  const group = range || directory.group || '';
  const time = front.estimatedTime || directory.time || '';
  const revised = front.revised || '';

  // The revision date is what tells a printed copy apart from a newer one once the activity
  // changes — it comes first so it survives even if the rest of the meta line has to wrap away.
  const meta = [directory.when, revised && `🕓 Rev. ${revised}`, time && `⏱ ${time}`, group && `👥 ${groupLabel(group)}`]
    .filter(Boolean).join(' · ');
  // Rounds only get their own box on activities that actually repeat.
  const rounds = String(front.roundsSupported) === 'true' ? `<span>Round ${rule()}</span>` : '';
  const nameLine = showAnswers
    ? '<p class="key-banner">Answer key — instructor copy. Do not hand out.</p>'
    : `<p class="name-line"><span>Name ${rule()}</span><span>Date ${rule()}</span>${rounds}</p>`;

  const block = (heading, hint, inner) => (inner
    ? `<section class="ws-block"><h2>${escapeHtml(heading)}${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</h2>${inner}</section>`
    : '');

  const renderGroup = (key) => {
    if (key === 'done') {
      return block('Definition of done', 'tick each one before you pack up',
        activity.done.length ? `<ul class="ticks">${activity.done.map((item, index) => `<li>${stepId((activity.doneIds || [])[index])}${inline(item)}</li>`).join('')}</ul>` : '');
    }
    if (key === 'keyTerms') {
      return block('Key terms', 'write what each one means',
        activity.keyTerms.length
          ? `<ul class="terms">${activity.keyTerms.map((term) => `<li><b>${inline(term)}</b>${rule()}</li>`).join('')}</ul>${
            activity.alsoKnow.length ? `<p class="also">Also know: ${activity.alsoKnow.map((term) => inline(term)).join(' · ')}</p>` : ''}`
          : '');
    }
    if (key === 'practice') {
      // A relative link is relative to the activity's Markdown in content/activities/.
      const absolute = (url) => new URL(url, `${SITE_ORIGIN}/content/activities/`).href;
      return block('Practice first', 'scan to rehearse before the gig',
        activity.practice.length
          ? `<ul class="ws-practice">${activity.practice.map((item) => `<li>${
            qrBlock(absolute(item.url), item.label, `QR code for ${item.label}`)}<span>${inline(item.note)}</span></li>`).join('')}</ul>`
          : '');
    }
    return block('Before you leave', '',
      activity.beforeYouLeave.length
        ? `<ul class="prompts">${activity.beforeYouLeave.map((item) => `<li>${inline(item)}${rule(2)}</li>`).join('')}</ul>`
        : '');
  };

  // Checkpoints and questions interleave in the order they occur in the source,
  // so the worksheet follows the same path as the real instructions instead of
  // pulling them into two lists disconnected from where they happen. A run
  // breaks — and a fresh "As you go" block opens — whenever a Key terms,
  // Definition of done, or Before you leave block falls between them.
  let flowOpen = false;
  let flowTitle = null;
  let previousWhere = null;
  const parts = [];
  const closeFlow = () => {
    if (flowOpen) parts.push('</ul></section>');
    flowOpen = false;
    flowTitle = null;
    previousWhere = null;
  };

  // Consecutive skipped sections collapse into one pointer, placed where they sat in the source:
  // inside an open "As you go" list, or on its own line between blocks. The key leaves it off.
  let skipped = [];
  const flushSkipped = () => {
    if (!skipped.length) return;
    const text = `📱 Scan QR to see on the web page: ${skipped.map((title) => escapeHtml(title)).join(' · ')}`;
    parts.push(flowOpen ? `<li class="webref">${text}</li>` : `<p class="ws-webref">${text}</p>`);
    skipped = [];
  };

  (activity.flow || []).forEach((entry) => {
    if (entry.type === 'skipped') {
      if (!showAnswers) skipped.push(entry.title);
      return;
    }
    flushSkipped();
    if (entry.type === 'group') {
      closeFlow();
      const rendered = renderGroup(entry.key);
      if (rendered) parts.push(rendered);
      return;
    }
    const item = entry.type === 'checkpoint' ? entry.checkpoint : entry.question;
    const named = blockFor(item.part);
    const title = named ? named.title : 'As you go';
    if (flowOpen && title !== flowTitle) closeFlow();
    if (!flowOpen) {
      const hint = named ? named.hint : 'tick checkpoints, answer questions';
      parts.push(`<section class="ws-block ws-flow-block"><h2>${escapeHtml(title)}`
        + `${showAnswers ? '' : `<small>${escapeHtml(hint)}</small>`}</h2><ul class="flow">`);
      flowOpen = true;
      flowTitle = title;
    }
    // The block heading already names its own section — repeating it as a tag is noise.
    const tag = item.section && item.section !== previousWhere && item.section !== title
      ? `<em class="where">${escapeHtml(item.section)}</em>` : '';
    previousWhere = item.section;
    if (entry.type === 'checkpoint') {
      parts.push(`<li class="tick">${tag}${stepId(item.id)}${inline(item.text)}</li>`);
    } else {
      parts.push(`<li class="question">${tag}${renderQuestion(item, showAnswers)}</li>`);
    }
  });
  flushSkipped();
  closeFlow();

  const route = directory.route || front.id || directory.id || '';

  return `
    <header class="ws-head">
      <div class="ws-headrow">
        <div class="ws-title"><span class="ws-emoji" aria-hidden="true">${escapeHtml(emoji)}</span>
          <div><h1>${escapeHtml(title)} <span class="${showAnswers ? 'key-tag' : 'ws-tag'}">${showAnswers ? 'Answer key' : 'Worksheet'}</span></h1>
          <p class="ws-meta">MUS 248${meta ? ` · ${meta}` : ''}</p></div>
        </div>
        ${renderQr(route, title, directory.qrCue)}
      </div>
      ${nameLine}
    </header>
    ${parts.join('')}
    ${showAnswers || directory.source ? '' : renderFormBlock()}
    <footer class="ws-foot">Generated from <code>${escapeHtml(directory.source || `content/activities/${front.id || directory.id || ''}.md`)}</code> — edit ${directory.source ? 'the lecture' : 'the activity'}, not this page.</footer>
  `;
}

// ---------- page ----------

// Lectures share one worksheet page (lectures/worksheet/?id=…), so every lecture with questions
// has a worksheet without a shell of its own. It's built from the student view of the Markdown:
// hidden slides and instructor notes never reach the paper.
async function lectureEntry(base) {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const lectures = await fetch(`${base}data/lectures.json`).then((response) => response.json());
  const lecture = lectures.find((item) => item.id === id && item.contentFile && (isVisible(item) || instructorView()));
  if (!lecture) throw new Error(`No lecture ${id}`);
  const markdown = await fetch(`${base}content/lectures/${lecture.contentFile}.md`).then((response) => {
    if (!response.ok) throw new Error(`No Markdown for ${id}`);
    return response.text();
  });
  const date = lecture.date
    ? new Date(`${lecture.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const number = lecture.lecture ? `Lecture ${String(lecture.lecture).padStart(2, '0')}` : '';
  return {
    markdown: lectureView(markdown),
    entry: {
      id, title: lecture.title, emoji: lecture.emoji, route: `lectures/${id}`,
      when: [number, date].filter(Boolean).join(' · '), source: `content/lectures/${lecture.contentFile}.md`, qrCue: 'Scan for the slides',
    },
  };
}

async function mount(root) {
  if (document.body.dataset.lecture === 'true') return mountLecture(root);
  const id = document.body.dataset.activityId;
  const base = document.body.dataset.base || '../../';
  const showAnswers = document.body.dataset.worksheetKey === 'true';
  const [directory, markdown] = await Promise.all([
    fetch(`${base}data/activities.json`).then((response) => response.json()),
    fetch(`${base}content/activities/${id}.md`).then((response) => {
      if (!response.ok) throw new Error(`No Markdown for ${id}`);
      return response.text();
    }),
  ]);
  const entry = directory.find((item) => item.id === id) || {};
  const activity = parseActivity(markdown);
  const title = (activity.frontmatter && activity.frontmatter.title) || entry.title || id;
  document.title = `${title} worksheet${showAnswers ? ' — answer key' : ''} · MUS 248`;
  const route = `${entry.route || id}/`;
  root.innerHTML = crumbs([...catalogCrumbs(entry, directory), [title, route],
    ...(showAnswers ? [['Worksheet', `${route}worksheet/`], ['Answer key']] : [['Worksheet']])])
    + renderWorksheet(activity, { showAnswers, directory: entry })
    + '<p class="no-print print-cue"><button type="button" class="print-button">Print this worksheet</button></p>';
  const button = root.querySelector('.print-button');
  if (button) button.addEventListener('click', () => window.print());
}

async function mountLecture(root) {
  const base = document.body.dataset.base || '../../';
  const showAnswers = document.body.dataset.worksheetKey === 'true';
  const { markdown, entry } = await lectureEntry(base);
  document.title = `${entry.title} worksheet${showAnswers ? ' — answer key' : ''} · MUS 248`;
  root.innerHTML = crumbs([['Lectures', 'lectures/'], [entry.title, `${entry.route}/`], [showAnswers ? 'Refresher key' : 'Worksheet']])
    + renderWorksheet(parseActivity(markdown), { showAnswers, directory: entry })
    + '<p class="no-print print-cue"><button type="button" class="print-button">Print this worksheet</button></p>';
  const button = root.querySelector('.print-button');
  if (button) button.addEventListener('click', () => window.print());
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('worksheet');
  if (root) {
    mount(root).catch(() => {
      root.innerHTML = '<p class="error">This worksheet could not be generated. The activity may not have been migrated to Markdown yet.</p>';
    });
  }
}
