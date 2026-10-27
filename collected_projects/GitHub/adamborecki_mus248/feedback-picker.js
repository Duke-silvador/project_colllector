// The "Repo improvements" button. Any link marked data-feedback opens a small dialog with the two
// ways to send feedback: the Google Form (the default, no account) or a GitHub issue (account
// required). The link's own href is the form, so without JavaScript it still goes there.

import { REPO_IMPROVEMENT_FORM, issueLink } from './feedback.js';

let dialog;

function picker() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'feedback-picker';
  dialog.setAttribute('aria-labelledby', 'feedback-picker-title');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="feedback-picker-title"><span aria-hidden="true">🛠️</span> Repo improvements</h2>
      <p>Finished an activity, or spotted something to fix? Tell us what worked and what didn't.</p>
      <a class="feedback-choice feedback-default" href="${REPO_IMPROVEMENT_FORM}" target="_blank" rel="noopener" autofocus>
        <span class="feedback-emoji" aria-hidden="true">📥</span>
        <span><strong>Google Form <small class="feedback-badge">Default</small></strong><small>No account needed. Dictating is fine.</small></span>
        <span aria-hidden="true">↗</span></a>
      <a class="feedback-choice feedback-issue" href="#" target="_blank" rel="noopener">
        <span class="feedback-emoji" aria-hidden="true">🐙</span>
        <span><strong>GitHub issue</strong><small>GitHub account required. Opens with this page's link filled in.</small></span>
        <span aria-hidden="true">↗</span></a>
      <button class="feedback-close" value="close">Cancel</button>
    </form>`;
  // Picking either one closes the dialog behind the new tab.
  dialog.querySelectorAll('.feedback-choice').forEach((link) => link.addEventListener('click', () => dialog.close()));
  // A tap on the dimmed backdrop closes it too.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  addStyles();
  document.body.append(dialog);
  return dialog;
}

function open() {
  const box = picker();
  const title = document.title.replace(/ · MUS 248$/, '') || 'MUS 248';
  box.querySelector('.feedback-issue').href = issueLink(title, window.location.href);
  box.showModal();
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[data-feedback]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || typeof HTMLDialogElement !== 'function') return;
    event.preventDefault();
    open();
  });
}

function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
.feedback-picker { width:min(100% - 2rem, 26rem); padding:1.25rem; border:1px solid var(--line, #d2d2d7); border-radius:.75rem; background:var(--surface, #fff); color:var(--ink, #1d1d1f); font:inherit; }
.feedback-picker::backdrop { background:rgb(0 0 0 / .45); }
.feedback-picker h2 { margin:0 0 .35rem; font-size:1.2rem; letter-spacing:-.02em; }
.feedback-picker p { margin:0 0 1rem; color:var(--muted, #6e6e73); font-size:.92rem; }
.feedback-choice { display:flex; gap:.75rem; align-items:center; margin:0 0 .6rem; padding:.85rem .9rem; border:1px solid var(--line, #d2d2d7); border-radius:.55rem; color:inherit; text-decoration:none; }
.feedback-choice:hover { border-color:var(--accent, #0071e3); }
.feedback-choice:focus-visible { outline:3px solid var(--accent, #0071e3); outline-offset:2px; }
.feedback-choice > span:nth-child(2) { display:grid; flex:1; gap:.1rem; }
.feedback-choice small { color:var(--muted, #6e6e73); font-size:.82rem; font-weight:400; }
.feedback-choice > span:last-child { color:var(--accent, #0071e3); }
.feedback-default { border-color:var(--accent, #0071e3); box-shadow:inset 4px 0 0 var(--accent, #0071e3); }
.feedback-emoji { font-size:1.5rem; }
.feedback-badge { margin-left:.35rem; padding:.05rem .45rem; border-radius:999px; background:var(--tag, #f5f5f7); font-size:.68rem !important; font-weight:700 !important; letter-spacing:.03em; text-transform:uppercase; vertical-align:.12em; }
.feedback-close { display:block; margin:.4rem 0 0 auto; padding:.45rem .9rem; border:0; border-radius:.45rem; background:var(--tag, #f5f5f7); color:var(--ink, #1d1d1f); font:inherit; font-weight:600; cursor:pointer; }`;
  document.head.append(style);
}
