// Shared Markdown rendering for the activity pages and the worksheet generator.
// One parser, so a worksheet can never drift from the page it was generated from.

export const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

// Image paths in an activity file are written relative to the Markdown, but the
// page that renders it lives at a different URL, so the caller passes the base
// to resolve them against. Absolute and rooted paths are left alone.
const resolveAsset = (src, assetBase) => (/^(https?:)?\/\//.test(src) || src.startsWith('/') || !assetBase
  ? src
  : assetBase + src);

// Links resolve the same way, so `[Salmon Gig Checklist](../../salmon-gig-checklist/)` written
// relative to the Markdown file lands on the right page from the activity page, from the root
// site and from a branch preview alike. Anchors and mailto: links are left alone.
const resolveLink = (href, assetBase) => (/^(#|mailto:)/.test(href) ? href : resolveAsset(href, assetBase));

// Code spans are set aside first and put back last, so `**bold**` inside backticks shows its
// asterisks instead of turning bold — a page that teaches Markdown has to be able to show it.
//
// ==term== marks a follow-along blank in a lecture. The page and slides show it as plain text
// (instructor view highlights it: blanks: 'mark'); the printed follow-along notes print a blank in
// its place (blanks: 'blank'), and their key fills it in. ==answer|also okay== lists answers the
// online refresher also accepts; only the first is ever shown.
const BLANK_TERM = /==([^=\n]+?)==/g;
export const blankTerms = (value) => [...value.matchAll(BLANK_TERM)].map((match) => match[1].trim());
export const blankShown = (term) => term.split('|')[0].trim();
const blankHtml = (text, mode) => {
  const shown = blankShown(text);
  if (mode === 'blank') return `<span class="note-blank" style="--chars:${Math.max(4, shown.length)}"></span>`;
  return mode === 'mark' ? `<mark class="key-term">${shown}</mark>` : shown;
};

export const inline = (value, { assetBase = '', blanks = 'plain' } = {}) => {
  const code = [];
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, (match, text) => `\u0000${code.push(text) - 1}\u0000`)
    .replace(BLANK_TERM, (match, text) => blankHtml(text, blanks))
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, src) => `<img src="${resolveAsset(src, assetBase)}" alt="${alt}" loading="lazy" decoding="async">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text, href) => `<a href="${resolveLink(href, assetBase)}">${text}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Single-asterisk emphasis, after bold has consumed its pairs. Without this a
    // source file's *emphasis* reached the page with the asterisks still in it.
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/\u0000(\d+)\u0000/g, (match, index) => `<code>${code[index]}</code>`);
};

// Answer-key markers. Correct answers live in the activity Markdown so the key
// generates from the same file, and both student renders strip them out:
//   - ✅ c) 9 dB            marks the correct multiple-choice option
//   ✅ **Answer.** 17 cm    gives the answer to a question with no option list
export const OPTION = /^[-*]\s+(✅\s*)?([a-zA-Z])[).]\s+(.+)$/;
export const ANSWER_LINE = /^✅\s*\*\*Answers?[.:]?\*\*\s*(.*)$/i;

export const isAnswerLine = (line) => ANSWER_LINE.test(line.trim());
export const stripAnswerMark = (line) => line.replace(OPTION, (match, mark) => (mark ? match.replace(mark, '') : match));

export const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\s*/;

// A hard-wrapped paragraph is still one paragraph, and a wrapped bullet is still
// one bullet. Without this, a source file that wraps at 100 characters renders as
// a stack of one-line paragraphs — and the worksheet generator reads a checkpoint
// as just its first line.
const STARTS_BLOCK = /^(\s*([-*+]|\d+\.)\s|#{1,6}\s|>|\||```|\s*$)/;
const OPAQUE = /^(\||```|#{1,6}\s)/;

// A ``` fence opens or closes a code block, whose lines are kept exactly as written.
export const isFence = (line) => line.trim().startsWith('```');

export function joinWrappedLines(markdown) {
  const joined = [];
  let fenced = false;
  markdown.split('\n').forEach((line) => {
    if (isFence(line)) { fenced = !fenced; joined.push(line); return; }
    if (fenced) { joined.push(line); return; }
    const previous = joined[joined.length - 1];
    const append = (text) => { joined[joined.length - 1] = `${previous.replace(/\s+$/, '')} ${text}`; };
    const carries = previous !== undefined && Boolean(previous.trim()) && !OPAQUE.test(previous.trim());
    if (!line.trim()) { joined.push(line); return; }
    if (line.trimStart().startsWith('>')) {
      if (carries && previous.trimStart().startsWith('>')) append(line.trim().replace(/^>\s?/, ''));
      else joined.push(line);
      return;
    }
    if (!STARTS_BLOCK.test(line) && carries) { append(line.trim()); return; }
    joined.push(line);
  });
  return joined.join('\n');
}

// Checklist step numbers, so a step can be said out loud: "I'm on 3.4." Every ## section that holds
// list items gets the next section number; its items count 1, 2, 3… beneath it (### subheadings
// don't restart the count). Numbers come from position, so they move when steps are added — the
// page's `revised` date says which version a number belongs to. Keyed by line index in the
// frontmatter-stripped, wrap-joined lines that the page renderer and the worksheet parser both use.
const UNNUMBERED_SECTIONS = ['what this is', 'key terms', 'practice first', 'technical verification', 'ai use disclosure', 'core skill area'];
const LIST_ITEM = /^(?:[-*]|\d+\.)\s+/;

export function stepNumbers(lines) {
  const numbers = new Map();
  const words = (heading) => heading.replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase();
  const sections = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (isFence(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) sections.push({ index, skip: UNNUMBERED_SECTIONS.includes(words(h2[1])), items: [] });
    else if (sections.length && LIST_ITEM.test(line) && !OPTION.test(line.trim())) sections[sections.length - 1].items.push(index);
  });
  let section = 0;
  sections.filter((entry) => !entry.skip && entry.items.length).forEach((entry) => {
    section += 1;
    numbers.set(entry.index, String(section));
    entry.items.forEach((index, item) => numbers.set(index, `${section}.${item + 1}`));
  });
  return numbers;
}

// Two kinds of blockquote get their own shape. "> 🌀 **Title.** text" is a portal: a collapsed
// sneak peek of a later lecture (or a later idea) that opens on a tap. "> 🧑‍🏫 text" is an
// instructor note — only instructor view ever leaves one in (lectures/view.js); this just marks it
// so it looks different.
export const PORTAL = /^🌀\s*(?:\*\*([^*]+)\*\*)?\s*(.*)$/u;
function renderQuote(text, options) {
  const portal = text.match(PORTAL);
  if (portal) {
    const title = (portal[1] || 'Portal').replace(/[.:]\s*$/, '');
    return `<details class="portal"><summary><span class="portal-icon" aria-hidden="true">🌀</span> ${inline(title, options)}</summary>`
      + `<p>${inline(portal[2], options)}</p></details>`;
  }
  if (/^🧑‍🏫/u.test(text)) return `<aside class="instructor-note">${inline(text, options)}</aside>`;
  return `<aside>${inline(text, options)}</aside>`;
}

export function renderMarkdown(markdown, options = {}) {
  const lines = joinWrappedLines(markdown.replace(FRONTMATTER, '')).split('\n');
  const numbers = options.numbered ? stepNumbers(lines) : new Map();
  const stepId = (index) => (numbers.has(index) ? `<span class="step-id">${numbers.get(index)}</span> ` : '');
  const output = [];
  let list = null;
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
  const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  const isDivider = (line) => line.includes('|') && /^\|?[\s:|-]*-[\s:|-]*\|?$/.test(line.trim());
  const row = (values, tag) => `<tr>${values.map((value) => `<${tag}>${inline(value, options)}</${tag}>`).join('')}</tr>`;

  for (let index = 0; index < lines.length; index += 1) {
    if (isFence(lines[index])) {
      closeList();
      const code = [];
      index += 1;
      while (index < lines.length && !isFence(lines[index])) { code.push(lines[index]); index += 1; }
      output.push(`<pre class="code-block"><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    const line = stripAnswerMark(lines[index]);
    if (isAnswerLine(line)) continue;
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    const quote = line.match(/^>\s?(.+)$/);

    if (line.trim().startsWith('|') && isDivider(lines[index + 1] || '')) {
      closeList();
      const head = cells(line);
      const body = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith('|')) { body.push(cells(lines[index])); index += 1; }
      index -= 1;
      output.push(`<div class="table-scroll"><table><thead>${row(head, 'th')}</thead><tbody>${body.map((values) => row(values, 'td')).join('')}</tbody></table></div>`);
    }
    else if (heading) { closeList(); output.push(`<h${heading[1].length}>${stepId(index)}${inline(heading[2], options)}</h${heading[1].length}>`); }
    else if (bullet) {
      if (list !== 'ul') { closeList(); list = 'ul'; output.push('<ul>'); }
      const task = bullet[1].match(/^\[([ xX])\]\s+(.+)$/);
      output.push(task
        ? `<li class="task"><span aria-hidden="true">${task[1] === ' ' ? '☐' : '☑'}</span> ${stepId(index)}${inline(task[2], options)}</li>`
        : `<li>${stepId(index)}${inline(bullet[1], options)}</li>`);
    }
    else if (numbered) { if (list !== 'ol') { closeList(); list = 'ol'; output.push('<ol>'); } output.push(`<li>${stepId(index)}${inline(numbered[1], options)}</li>`); }
    else if (quote) { closeList(); output.push(renderQuote(quote[1], options)); }
    else if (!line.trim()) { closeList(); }
    else {
      closeList();
      const html = inline(line, options);
      const lone = line.trim().match(/^!\[([^\]]*)\]\([^)\s]+\)$/);
      output.push(lone
        ? `<figure>${html}${lone[1] ? `<figcaption>${inline(lone[1], options)}</figcaption>` : ''}</figure>`
        : `<p>${html}</p>`);
    }
  }
  closeList();
  return output.join('');
}
