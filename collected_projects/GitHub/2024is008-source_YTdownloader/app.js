'use strict';

const $ = id => document.getElementById(id);
const pageMode = document.body.dataset.page;
const mode = ['video', 'audio', 'shorts'].includes(pageMode) ? pageMode : 'video';
let output = mode === 'audio' ? 'mp3' : 'mp4';
const resumeKey = `yt-active-${mode}`;
let video = null;
let selected = 0;
let expanded = false;
let resolving = false;
let currentJob = null;
let metadataController = null;
let pollingController = null;
let toastTimer;
let revision = 0;

function timeoutSignal(ms, parentSignal) {
  if (typeof AbortSignal.any === 'function' && typeof AbortSignal.timeout === 'function' && parentSignal) {
    return AbortSignal.any([parentSignal, AbortSignal.timeout(ms)]);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms);
  const onAbort = () => { clearTimeout(timer); controller.abort(parentSignal.reason); };
  if (parentSignal) {
    if (parentSignal.aborted) onAbort();
    else parentSignal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

function notify(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}

function clearError() {
  $('urlError').hidden = true;
  $('ytUrlInput').removeAttribute('aria-invalid');
}

function showError(message) {
  $('urlError').textContent = message;
  $('urlError').hidden = false;
  $('ytUrlInput').setAttribute('aria-invalid', 'true');
  $('ytUrlInput').focus();
}

function parseYouTubeId(raw) {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    let id;
    if (url.hostname === 'youtu.be' && parts.length === 1) id = parts[0];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : parts.length === 2 && ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null;
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}

async function api(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(path, {
    method, credentials: 'same-origin', signal,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('The service returned an invalid response. Please try again.'); }
  if (!response.ok || !data.success) throw new Error(data.error?.message || 'The service is unavailable. Please try again.');
  return data;
}

function qualities() { return video?.formats?.[output] || []; }
function formatDuration(seconds) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
function sizeLabel(bytes) { return bytes == null ? '' : `${(bytes / 1024 ** 2).toFixed(1)} MB`; }

function setBusy(busy) {
  $('downloadBtn').disabled = busy || !qualities().length;
  $('formatSelect').disabled = busy;
  $('ytUrlInput').disabled = busy;
  $('pasteUrlBtn').disabled = busy;
  $('downloadForm').querySelector('[type=submit]').disabled = busy || resolving;
  $('moreQuality').disabled = busy;
  document.querySelectorAll('[name=quality]').forEach(input => { input.disabled = busy; });
}

function syncFormatLabels() {
  $('downloadLabel').textContent = `Download ${output.toUpperCase()}`;
  $('outputFormat').textContent = output === 'mp3' ? 'MP3 audio' : 'MP4 video';
  $('downloadNote').textContent = output === 'mp3' ? 'MP3 bitrate is an output setting; it cannot improve the source audio quality.' : 'Available qualities depend on the source video.';
}

function updateSelection() {
  const choice = qualities()[selected];
  $('selectionText').textContent = choice ? `${choice.quality} · ${output.toUpperCase()}` : 'No available format';
  $('downloadBtn').disabled = !choice || !!currentJob;
}

function renderQualities() {
  const list = qualities();
  $('qualityRowsContainer').replaceChildren();
  list.forEach((item, index) => {
    if (!expanded && index >= 3) return;
    const row = document.createElement('label');
    row.className = 'quality-row';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'quality'; input.value = item.quality; input.checked = selected === index;
    input.addEventListener('change', () => { selected = index; updateSelection(); });
    const copy = document.createElement('span'); copy.className = 'quality-copy'; copy.textContent = item.quality;
    const note = document.createElement('small');
    note.textContent = output === 'mp3' ? 'MP3 output bitrate' : item.requiresMerge ? 'Video with audio' : 'MP4 with audio';
    copy.append(note);
    const type = document.createElement('span'); type.className = 'quality-type';
    type.textContent = item.estimatedSize ? `≈ ${sizeLabel(item.estimatedSize)}` : output.toUpperCase();
    row.append(input, copy, type);
    $('qualityRowsContainer').append(row);
  });
  $('moreQuality').hidden = list.length <= 3;
  $('moreQuality').textContent = expanded ? 'Show fewer qualities' : `Show all ${list.length} qualities`;
  $('moreQuality').setAttribute('aria-expanded', String(expanded));
  updateSelection();
}

function showVideo(info) {
  video = info; selected = 0; expanded = false;
  $('resultWorkspace').hidden = false;
  $('mediaTitleText').textContent = info.title;
  $('mediaDescription').textContent = `${info.channel} · ${formatDuration(info.duration)}`;
  $('mediaThumbImg').hidden = false;
  const thumb = typeof info.thumbnail === 'string' && info.thumbnail.startsWith('https://i.ytimg.com/')
    ? info.thumbnail
    : `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`;
  $('mediaThumbImg').src = thumb;
  $('mediaThumbImg').alt = `Video thumbnail: ${info.title}`;
  $('coverHint').textContent = 'Video image unavailable';
  $('coverLabel').textContent = formatDuration(info.duration);
  $('coverLabel').hidden = false;
  $('previewBadge').textContent = 'Ready';
  $('availableQuality').textContent = info.formats.mp4.length ? `Up to ${info.formats.mp4[0].quality}` : 'Audio only';
  $('watchLink').href = `https://www.youtube.com/watch?v=${info.id}`;
  $('watchLink').hidden = false;
  $('downloadFeedback').hidden = true;
  $('jobProgress').hidden = true;
  $('saveFileLink').hidden = true;
  syncFormatLabels();
  renderQualities();
  if (!qualities().length) {
    $('downloadFeedback').hidden = false;
    $('downloadStatus').textContent = `No ${output.toUpperCase()} formats are available for this source.`;
  }
}

async function resolveVideo(event) {
  event?.preventDefault();
  if (resolving || currentJob) return;
  const raw = $('ytUrlInput').value.trim();
  const id = parseYouTubeId(raw);
  if (!id) { showError('Paste a valid YouTube video or Shorts link.'); return; }
  clearError(); metadataController?.abort();
  const controller = new AbortController(); metadataController = controller;
  const version = ++revision;
  resolving = true;
  const submit = $('downloadForm').querySelector('[type=submit]');
  submit.disabled = true;
  $('downloadForm').setAttribute('aria-busy', 'true');
  $('urlHint').textContent = 'Retrieving video details…';
  const timeout = setTimeout(() => controller.abort(), 65000);
  try {
    const data = await api('/api/video/info', { method: 'POST', body: { url: raw }, signal: controller.signal });
    if (version !== revision) return;
    showVideo(data.video);
    $('urlHint').textContent = 'Video details loaded. Choose an available quality below.';
  } catch (error) {
    if (version === revision) showError(error.name === 'AbortError' ? 'Retrieving video details timed out. Please try again.' : error.message);
  } finally {
    clearTimeout(timeout);
    if (version === revision) { resolving = false; submit.disabled = false; $('downloadForm').removeAttribute('aria-busy'); }
  }
}

function saveResume(value) {
  try { if (value) sessionStorage.setItem(resumeKey, JSON.stringify(value)); else sessionStorage.removeItem(resumeKey); } catch {}
}

const statuses = { queued: 'Waiting for a worker', fetching: 'Retrieving source formats', downloading: 'Downloading media', merging: 'Combining video and audio', converting: 'Encoding media', finalizing: 'Verifying the file', completed: 'Your file is ready', failed: 'Download failed', cancelled: 'Download cancelled', expired: 'This download has expired' };

function showJob(job) {
  $('downloadFeedback').hidden = false;
  const metrics = [];
  if (job.downloadedBytes != null) metrics.push(sizeLabel(job.downloadedBytes));
  if (job.totalBytes != null) metrics.push(`of ${sizeLabel(job.totalBytes)}`);
  if (job.speed != null) metrics.push(`${sizeLabel(job.speed)}/s`);
  if (job.etaSeconds != null && job.status === 'downloading') metrics.push(`${Math.ceil(job.etaSeconds)}s remaining`);
  $('downloadStatus').textContent = [statuses[job.status] || 'Processing', metrics.join(' ')].filter(Boolean).join(' · ');
  $('jobProgress').hidden = ['completed', 'failed', 'cancelled', 'expired'].includes(job.status);
  if (typeof job.progress === 'number') $('jobProgress').value = job.progress;
  else $('jobProgress').removeAttribute('value');
  $('cancelJobBtn').hidden = ['completed', 'failed', 'cancelled', 'expired'].includes(job.status);
}

async function pollJob(jobId) {
  pollingController?.abort();
  const controller = new AbortController(); pollingController = controller;
  let failures = 0;
  while (!controller.signal.aborted) {
    try {
      const job = await api(`/api/jobs/${encodeURIComponent(jobId)}`, { signal: timeoutSignal(15000, controller.signal) });
      failures = 0; showJob(job);
      if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
        currentJob = null; saveResume(null); setBusy(false);
        if (job.status === 'completed') {
          const link = $('saveFileLink');
          link.href = job.downloadUrl || `/api/files/${encodeURIComponent(jobId)}`;
          link.hidden = false; link.download = ''; link.click();
        } else if (job.status === 'failed') $('downloadStatus').textContent = job.error?.message || 'The download failed. Please try again.';
        return;
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      failures++;
      $('downloadStatus').textContent = failures < 5 ? 'Connection interrupted. Reconnecting to your download…' : 'Unable to check this download. Refresh to reconnect, or cancel and try again.';
    }
    await new Promise(resolve => {
      const done = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', done); resolve(); };
      const timer = setTimeout(done, Math.min(2000 * Math.max(1, failures), 15000));
      controller.signal.addEventListener('abort', done, { once: true });
    });
  }
}

async function startDownload() {
  if (currentJob || !video || !qualities()[selected]) return;
  currentJob = 'creating'; setBusy(true);
  $('downloadFeedback').hidden = false;
  $('downloadStatus').textContent = 'Adding your download to the queue…';
  $('saveFileLink').hidden = true;
  try {
    const job = await api('/api/download', { method: 'POST', body: { url: `https://www.youtube.com/watch?v=${video.id}`, format: output, quality: qualities()[selected].quality }, signal: timeoutSignal(65000) });
    currentJob = job.jobId;
    saveResume({ jobId: job.jobId, video, output });
    await pollJob(job.jobId);
  } catch (error) {
    currentJob = null; setBusy(false);
    $('downloadStatus').textContent = error.name === 'TimeoutError' ? 'The request timed out. Try the same download again to reconnect safely.' : error.message;
  }
}

async function cancelDownload() {
  if (!currentJob || currentJob === 'creating') return !currentJob;
  try {
    await api(`/api/jobs/${encodeURIComponent(currentJob)}`, { method: 'DELETE', signal: timeoutSignal(15000) });
    pollingController?.abort(); currentJob = null; saveResume(null); setBusy(false);
    showJob({ status: 'cancelled' }); return true;
  } catch (error) { notify(error.message); return false; }
}

function resetPreview() {
  revision++; metadataController?.abort(); resolving = false;
  video = null; $('ytUrlInput').value = '';
  $('resultWorkspace').hidden = true; $('clearUrlBtn').hidden = true;
  $('previewBadge').textContent = 'No link added';
  $('mediaThumbImg').hidden = true;
  $('coverLabel').hidden = true;
  $('watchLink').hidden = true;
  $('downloadForm').removeAttribute('aria-busy');
  $('urlHint').textContent = mode === 'audio' ? 'YouTube audio in MP3. Choose a bitrate up to 320 kbps.' : mode === 'shorts' ? 'YouTube Shorts. Video quality up to 1080p.' : 'YouTube videos and Shorts. Video quality up to 1080p.';
  clearError(); setBusy(false); $('ytUrlInput').focus();
}

$('downloadForm').addEventListener('submit', resolveVideo);
$('ytUrlInput').addEventListener('input', () => {
  revision++; metadataController?.abort(); resolving = false; video = null;
  $('resultWorkspace').hidden = true; $('clearUrlBtn').hidden = !$('ytUrlInput').value;
  $('downloadForm').querySelector('[type=submit]').disabled = false;
  $('downloadForm').removeAttribute('aria-busy'); clearError();
});
$('pasteUrlBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) { notify('Your clipboard is empty. Copy a YouTube link first.'); return; }
    $('ytUrlInput').value = text; $('ytUrlInput').dispatchEvent(new Event('input'));
    await resolveVideo();
  } catch { notify('Paste using Ctrl+V or your device’s paste command.'); $('ytUrlInput').focus(); }
});
$('mediaThumbImg').addEventListener('error', () => { $('mediaThumbImg').hidden = true; });
for (const id of ['resetSearchBtn', 'clearUrlBtn']) $(id).addEventListener('click', async () => { if (await cancelDownload()) resetPreview(); });
$('moreQuality').addEventListener('click', () => { expanded = !expanded; if (!expanded && selected >= 3) selected = 0; renderQualities(); });
$('downloadBtn').addEventListener('click', startDownload);
$('cancelJobBtn').addEventListener('click', cancelDownload);
$('formatSelect').addEventListener('change', () => {
  if (currentJob) return;
  output = $('formatSelect').value === 'audio' ? 'mp3' : 'mp4';
  selected = 0;
  expanded = false;
  syncFormatLabels();
  if (video) {
    renderQualities();
    if (!qualities().length) {
      $('downloadFeedback').hidden = false;
      $('downloadStatus').textContent = `No ${output.toUpperCase()} formats are available for this source.`;
    } else {
      $('downloadFeedback').hidden = true;
    }
  }
});
document.querySelectorAll('.header-nav a[data-mode]').forEach(link => {
  link.addEventListener('click', () => {
    try { if (video && !currentJob) sessionStorage.setItem('yt-next-url', `https://www.youtube.com/watch?v=${video.id}`); } catch {}
  });
});
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  $('themeToggleBtn').setAttribute('aria-pressed', String(dark));
  $('themeToggleBtn').setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme');
}
$('themeToggleBtn').addEventListener('click', () => {
  const dark = !document.documentElement.classList.contains('dark'); applyTheme(dark);
  try { localStorage.setItem('yt-theme', dark ? 'dark' : 'light'); } catch {}
});
try { applyTheme(localStorage.getItem('yt-theme') === 'dark'); } catch {}
$('formatSelect').value = mode === 'audio' ? 'audio' : 'video';
syncFormatLabels();
setBusy(false);
try {
  const resumed = JSON.parse(sessionStorage.getItem(resumeKey) || 'null');
  if (resumed?.jobId && resumed.video) {
    if (resumed.output === 'mp3' || resumed.output === 'mp4') {
      output = resumed.output;
      $('formatSelect').value = output === 'mp3' ? 'audio' : 'video';
    }
    showVideo(resumed.video); $('ytUrlInput').value = `https://www.youtube.com/watch?v=${resumed.video.id}`;
    currentJob = resumed.jobId; setBusy(true); pollJob(currentJob);
  } else {
    const next = sessionStorage.getItem('yt-next-url');
    sessionStorage.removeItem('yt-next-url');
    if (next) { $('ytUrlInput').value = next; resolveVideo(); }
  }
} catch {}
