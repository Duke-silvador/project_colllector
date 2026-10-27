// The front page: a map of the site's sections, so it's mostly static HTML. The catalog lists
// moved to their hubs (hub.js); this only wires the Repo improvements buttons and old links.

import { REPO_IMPROVEMENT_FORM } from './feedback.js';
import './feedback-picker.js';
import { HUBS } from './catalog.js';

// The buttons open the picker (feedback-picker.js); its default is the form, and feedback.js is
// the one place that link lives. Without JavaScript they lead to the Repo Improvement page, which
// shows the form too.
document.querySelectorAll('a[data-feedback]').forEach((link) => { link.href = REPO_IMPROVEMENT_FORM; });

// Before the hubs, breadcrumbs linked to a filtered front page (?type=checklist#catalog) for a
// day. Those links land on the matching hub instead.
const type = new URLSearchParams(window.location.search).get('type') || '';
const hub = HUBS[type.startsWith('kind:') ? 'checklist' : type];
if (hub) window.location.replace(`${hub.route}/${type.startsWith('kind:') ? `#${type.slice(5)}` : ''}`);
