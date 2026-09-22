const { app, BrowserWindow, ipcMain, screen, shell, dialog } = require('electron')
const path = require('path')
const disks = require('./lib/disks')
const scanner = require('./lib/scanner')
const cleaner = require('./lib/cleaner')
const apps = require('./lib/apps')
const bigfiles = require('./lib/bigfiles')
const startup = require('./lib/startup')
const store = require('./lib/store')
const { check } = require('./lib/safety')

let win = null
let elevated = null

const ELEVATED_FLAG = '--omen-elevated'

// Токены отмены: сканирование и поиск больших файлов идут в основном процессе
// и должны прерываться по кнопке, а не молча дорабатывать до конца.
let scanToken = 0
let scanCancelled = false
let bigToken = 0
let bigCancelled = false

async function acquireLock() {
  for (let i = 0; i < 40; i++) {
    if (app.requestSingleInstanceLock()) return true
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

;(async () => {
  const locked = await acquireLock()
  if (!locked) {
    app.quit()
  } else {
    app.on('second-instance', (_e, argv) => {
      if (argv.includes(ELEVATED_FLAG)) {
        app.quit()
        return
      }
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })
    app.whenReady().then(() => {
      store.init(path.join(app.getPath('userData'), 'data'))
      createWindow()
    })
  }
})()

app.on('window-all-closed', () => app.quit())

const PREFERRED = { width: 1220, height: 820 }
const FLOOR = { width: 940, height: 600 }

/**
 * Окно фиксированного размера, поэтому оно обязано помещаться на экран: на
 * ноутбуке 1366x768 предпочтительная высота не влезает, а изменить размер
 * пользователь не может. Прижимаем к рабочей области, нижние границы не дают
 * окну схлопнуться на совсем маленьких экранах.
 */
function windowSize() {
  const { workAreaSize } = screen.getPrimaryDisplay()
  return {
    width: Math.max(FLOOR.width, Math.min(PREFERRED.width, workAreaSize.width - 40)),
    height: Math.max(FLOOR.height, Math.min(PREFERRED.height, workAreaSize.height - 40))
  }
}

function createWindow() {
  const { width, height } = windowSize()
  win = new BrowserWindow({
    width,
    height,
    // Фиксированный размер намеренно: вёрстка рассчитана на это окно, а в
    // развёрнутом и полноэкранном виде появлялись артефакты отрисовки.
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    backgroundColor: '#06070b',
    show: false,
    // В собранном приложении иконка берётся из exe; в разработке указываем
    // build/, чтобы в панели задач был настоящий знак, а не логотип Electron.
    ...(app.isPackaged ? {} : { icon: path.join(__dirname, 'build', 'icon.ico') }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.loadFile(path.join(__dirname, 'src', 'index.html'))
  win.once('ready-to-show', () => win.show())

  // Стили окна уже убрали кнопку разворота и рамку изменения размера, так что
  // жестом сюда не попасть. Но сторонние утилиты (PowerToys FancyZones,
  // фирменные игровые панели) умеют навязать состояние через Win32 API.
  win.on('maximize', () => win.unmaximize())
  win.on('enter-full-screen', () => win.setFullScreen(false))
}

const send = (channel, data) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data)
}

/* ------------------------------------------------------------------ диски */

ipcMain.handle('disks', () => disks.listDisks())

ipcMain.handle('elevated', async () => {
  if (elevated === null) elevated = await disks.isElevated()
  return elevated
})

ipcMain.handle('restart-elevated', async () => {
  const target = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
  const devArgs = app.isPackaged ? '' : process.argv.slice(1).join(' ')
  app.releaseSingleInstanceLock()
  const ok = await disks.startElevated(target, devArgs, ELEVATED_FLAG)
  if (ok) {
    setTimeout(() => app.quit(), 900)
  } else {
    app.requestSingleInstanceLock()
  }
  return ok
})

/* ---------------------------------------------------------- сканирование */

ipcMain.on('scan:cancel', () => { scanCancelled = true })

ipcMain.handle('scan', async (e, { drive, mode }) => {
  const letter = String(drive || '').charAt(0).toUpperCase()
  if (!/^[A-Z]$/.test(letter)) throw new Error('bad drive')
  const modes = ['safe', 'balanced', 'aggressive']
  if (!modes.includes(mode)) mode = 'safe'

  scanCancelled = false
  const myToken = ++scanToken
  const shouldStop = () => scanCancelled || myToken !== scanToken

  const emit = (data) => send('scan:progress', data)
  emit({ type: 'start', drive: letter, mode })
  try {
    const result = await scanner.scanDrive(letter, mode, emit, shouldStop)
    store.setSettings({ lastDrive: letter, lastMode: mode })
    emit({ type: 'complete', totalSize: result.totalSize, cancelled: result.cancelled })
    return result
  } catch (err) {
    emit({ type: 'error', message: String(err.message || err) })
    throw err
  }
})

/* -------------------------------------------------------------- очистка */

ipcMain.handle('clean', async (e, { categories, drive, mode }) => {
  const emit = (data) => send('clean:progress', data)
  const list = Array.isArray(categories) ? categories : []
  return cleaner.clean(list, emit, { drive, mode })
})

ipcMain.handle('clean-leftovers', async (e, { paths }) => {
  const emit = (data) => send('clean:progress', data)
  const entries = (paths || [])
    .filter((p) => typeof p === 'string')
    .map((p) => ({ path: p, dir: true, size: 0 }))
  return cleaner.clean([{ id: 'leftovers', entries, recycle: null }], emit, { mode: 'leftovers' })
})

/* ------------------------------------------------------------- программы */

ipcMain.handle('apps', () => apps.listApps())

ipcMain.handle('uninstall', async (e, { list, silent }) => {
  const emit = (data) => send('uninstall:progress', data)
  emit({ type: 'begin', count: list.length })
  const results = await apps.uninstallApps(list, !!silent, emit)
  emit({ type: 'done' })
  return results
})

ipcMain.handle('leftovers', async (e, { list }) => apps.findLeftovers(list || []))

/* --------------------------------------------------------- большие файлы */

ipcMain.on('big:cancel', () => { bigCancelled = true })

ipcMain.handle('big-files', async (e, { drive, minSize }) => {
  const letter = String(drive || '').charAt(0).toUpperCase()
  if (!/^[A-Z]$/.test(letter)) throw new Error('bad drive')

  bigCancelled = false
  const myToken = ++bigToken
  const shouldStop = () => bigCancelled || myToken !== bigToken

  return bigfiles.scanBigFiles(letter, {
    minSize: Math.max(1024 * 1024, Number(minSize) || 100 * 1024 * 1024),
    limit: 300,
    onTick: (p, n) => send('big:progress', { path: p, count: n }),
    shouldStop
  })
})

ipcMain.handle('delete-files', async (e, { paths }) => {
  const emit = (data) => send('clean:progress', data)
  const entries = (paths || [])
    .filter((p) => typeof p === 'string')
    .map((p) => ({ path: p, dir: false, size: 0 }))
  // Категория 'junk' — значит, уходит в Корзину при гибридном режиме.
  return cleaner.clean([{ id: 'junk', entries, recycle: null }], emit, { mode: 'bigfiles' })
})

/* ---------------------------------------------------------- автозагрузка */

ipcMain.handle('startup-list', () => startup.listStartup())

ipcMain.handle('startup-toggle', async (e, { item, enable }) => {
  if (!item || typeof item !== 'object') return { ok: false, error: 'bad item' }
  return startup.setStartupEnabled(item, !!enable)
})

/* -------------------------------------------------- настройки и история */

ipcMain.handle('settings-get', () => ({ ...store.getSettings(), stats: store.stats() }))

ipcMain.handle('settings-set', (e, patch) => {
  const allowed = ['lang', 'motion', 'deleteMode']
  const clean = {}
  for (const k of allowed) if (k in (patch || {})) clean[k] = patch[k]
  return store.setSettings(clean)
})

ipcMain.handle('exclusions-get', () => store.getExclusions())

ipcMain.handle('exclusions-add', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Папка, которую никогда не трогать'
  })
  if (res.canceled || !res.filePaths.length) return store.getExclusions()
  return store.addExclusion(res.filePaths[0])
})

ipcMain.handle('exclusions-add-path', (e, { path: p }) => {
  if (typeof p !== 'string') return store.getExclusions()
  return store.addExclusion(p)
})

ipcMain.handle('exclusions-remove', (e, { path: p }) => store.removeExclusion(p))

ipcMain.handle('history-get', () => ({ history: store.getHistory(), stats: store.stats() }))
ipcMain.handle('history-clear', () => store.clearHistory())
ipcMain.handle('deleted-log', () => store.getDeletedLog(300))

/* ------------------------------------------------------------- прочее */

ipcMain.handle('reveal', (e, { path: p }) => {
  if (typeof p !== 'string' || !/^[a-zA-Z]:\\/.test(p)) return false
  shell.showItemInFolder(p)
  return true
})

/** Отдаёт вердикт защиты — интерфейс показывает, почему путь не будет удалён. */
ipcMain.handle('safety-check', (e, { path: p, isDir }) =>
  check(p, { isDir: !!isDir, exclusions: store.getExclusions() })
)

ipcMain.on('win:min', () => win && win.minimize())
ipcMain.on('win:close', () => win && win.close())
