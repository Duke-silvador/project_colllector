// Daftar for Windows. The window shows the live site, so the app inside is
// always the newest one; this shell adds what a browser tab can't: a place
// next to the clock, starting with Windows, and deadline notifications while
// the window is closed. The shell itself updates from GitHub releases.
const { app, BrowserWindow, Tray, Menu, Notification, shell, ipcMain, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SITE = process.env.DAFTAR_URL || 'https://due-next.onrender.com';
const ORIGIN = new URL(SITE).origin;
const ICON = path.join(__dirname, 'build', 'icon.png');
const HIDE_NEXT = () => path.join(app.getPath('userData'), 'start-hidden');

let win = null;
let tray = null;
let quitting = false;
let updateReady = false;
const notes = new Set(); // keeps notifications alive until they're clicked or closed

if (!app.requestSingleInstanceLock()) app.exit(0);
app.setAppUserModelId('app.daftar.desktop');

const sameSite = (url) => {
  try { return new URL(url, SITE).origin === ORIGIN; } catch { return false; }
};

function show() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function openPage(url) {
  if (!win || !sameSite(url)) return;
  win.loadURL(new URL(url, SITE).href);
  show();
}

function createWindow({ hidden }) {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 520,
    show: false,
    title: 'Daftar',
    icon: ICON,
    backgroundColor: '#f6f5f1',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false, // reminders keep checking while the window is closed
      spellcheck: true,
    },
  });
  win.removeMenu();
  win.loadURL(`${SITE}/?app`);
  win.once('ready-to-show', () => { if (!hidden) win.show(); });

  // No internet on the very first start: a small page that tries again.
  win.webContents.on('did-fail-load', (event, code, description, url, isMain) => {
    if (isMain && code !== -3) win.loadFile(path.join(__dirname, 'offline.html'), { query: { site: `${SITE}/?app` } });
  });

  // Daftar's own pages (files, shared notes) open in another Daftar window,
  // so they keep the sign-in. Anything else goes to the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (sameSite(url)) return { action: 'allow', overrideBrowserWindowOptions: { icon: ICON, autoHideMenuBar: true } };
    if (/^https?:|^mailto:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (sameSite(url) || url.startsWith('file:')) return;
    event.preventDefault();
    if (/^https?:|^mailto:/.test(url)) shell.openExternal(url);
  });

  // The mouse's back button and Alt+Left go back a page, like in a browser.
  const goBack = () => { if (win.webContents.navigationHistory.canGoBack()) win.webContents.navigationHistory.goBack(); };
  win.on('app-command', (event, command) => { if (command === 'browser-backward') goBack(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.alt && input.key === 'ArrowLeft') {
      event.preventDefault();
      goBack();
    }
  });

  // Closing the window keeps Daftar running next to the clock.
  win.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    win.hide();
    const told = path.join(app.getPath('userData'), 'told-about-tray');
    if (!fs.existsSync(told)) {
      fs.writeFileSync(told, '1');
      notify({ title: 'Daftar is still here', body: 'It keeps running next to the clock so reminders can reach you. Right-click its icon to quit.' });
    }
    if (updateReady) installUpdate({ hidden: true });
  });
}

function notify({ title, body, url }) {
  if (process.env.DAFTAR_NOTIFY_LOG) fs.appendFileSync(process.env.DAFTAR_NOTIFY_LOG, `${JSON.stringify({ title, body, url })}\n`); // tests only
  if (!Notification.isSupported()) return;
  const note = new Notification({ title, body, icon: ICON, silent: false });
  notes.add(note);
  note.on('click', () => { notes.delete(note); url ? openPage(url) : show(); });
  note.on('close', () => notes.delete(note));
  note.show();
}

// The page asks for notifications through the preload; only Daftar's own
// pages may, and only with plain short text.
ipcMain.on('daftar:notify', (event, payload) => {
  if (!sameSite(event.senderFrame?.url || '')) return;
  const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const url = text(payload?.url, 300);
  notify({ title: text(payload?.title, 120) || 'Daftar', body: text(payload?.body, 300), url: url && sameSite(url) ? url : '' });
});

ipcMain.handle('daftar:autostart', (event, on) => {
  if (!sameSite(event.senderFrame?.url || '')) return false;
  if (typeof on === 'boolean') setStartsWithWindows(on);
  return startsWithWindows();
});

function startsWithWindows() {
  return app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin;
}
function setStartsWithWindows(on) {
  app.setLoginItemSettings({ openAtLogin: on, args: ['--hidden'] });
}

function buildTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'build', 'tray.png')));
  tray.setToolTip('Daftar');
  const menu = () => Menu.buildFromTemplate([
    { label: 'Open Daftar', click: show },
    { type: 'separator' },
    { label: 'Start with Windows', type: 'checkbox', checked: startsWithWindows(), click: (item) => setStartsWithWindows(item.checked) },
    updateReady
      ? { label: 'Restart to update', click: () => installUpdate({ hidden: false }) }
      : { label: 'Check for updates', click: () => checkUpdates(true) },
    { type: 'separator' },
    { label: 'Quit Daftar', click: () => { quitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu());
  tray.on('click', show);
  tray.on('right-click', () => tray.setContextMenu(menu()));
}

/* Updates to this shell. New versions are GitHub releases on
   HaruFromSpace/daftar-desktop; they download quietly and install the next
   time the window is closed, or straight away from the tray menu. */
let updater = null;
function checkUpdates(asked) {
  if (!updater || !app.isPackaged) return;
  updater.checkForUpdates().then((result) => {
    if (asked && !result?.isUpdateAvailable) notify({ title: 'Daftar is up to date', body: `You have version ${app.getVersion()}.` });
  }).catch((err) => {
    console.error('Update check failed', err?.message);
    if (asked) notify({ title: "Couldn't check for updates", body: 'Check your internet connection and try again later.' });
  });
}
function installUpdate({ hidden }) {
  if (hidden) fs.writeFileSync(HIDE_NEXT(), '1');
  quitting = true;
  updater.quitAndInstall(true, true);
}

app.on('second-instance', show);
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', (event) => event.preventDefault());

app.whenReady().then(() => {
  let hidden = process.argv.includes('--hidden');
  if (fs.existsSync(HIDE_NEXT())) {
    hidden = true;
    fs.rmSync(HIDE_NEXT(), { force: true });
  }
  // Reminders only arrive while Daftar runs, so it starts with Windows unless
  // the student turns that off in the tray menu.
  const asked = path.join(app.getPath('userData'), 'start-with-windows-set');
  if (app.isPackaged && !fs.existsSync(asked)) {
    setStartsWithWindows(true);
    fs.writeFileSync(asked, '1');
  }
  createWindow({ hidden });
  buildTray();

  try {
    ({ autoUpdater: updater } = require('electron-updater'));
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('update-downloaded', () => {
      updateReady = true;
      if (win && !win.isVisible()) installUpdate({ hidden: true });
    });
    updater.on('error', (err) => console.error('Update failed', err?.message));
    checkUpdates(false);
    setInterval(() => checkUpdates(false), 6 * 3600_000);
  } catch (err) {
    console.error('Updates are off', err?.message);
  }
});
