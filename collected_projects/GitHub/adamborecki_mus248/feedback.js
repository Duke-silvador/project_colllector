// The Repo Improvement form: students fill it out whenever they finish an activity or a checklist.
// It replaced the per-activity Canvas discussions (October 2026). This is the one place the link
// lives: activity pages, printed worksheets, and the checker's allowlist all read it from here.
// It's deliberately public (it's on every page); the checker still blocks any other form link.
export const REPO_IMPROVEMENT_FORM = 'https://forms.gle/ee2ypjZo8VbhRVUT9';
export const FORM_HEADING = 'Finished? Fill out the Repo Improvement form';
export const FORM_NOTE = 'Every time you finish an activity or a checklist. It\'s how these pages get better.';
export const LECTURE_FORM_NOTE = 'Finished an activity or a checklist this week, or spotted something to fix in this lecture? It\'s how these pages get better.';

// The other way in, for anyone with a GitHub account: a new issue on this repo. The picker
// (feedback-picker.js) fills in the page it was opened from, so the issue says where to look.
export const REPO_ISSUES = 'https://github.com/adamborecki/mus248/issues/new';
export const issueLink = (title, url) => `${REPO_ISSUES}?title=${encodeURIComponent(`${title}: `)}`
  + `&body=${encodeURIComponent(`Page: ${url}\n\nWhat I tried, what I expected, and what happened:\n\n`)}`;
