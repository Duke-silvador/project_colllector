const { contextBridge, ipcRenderer } = require('electron')

const sub = (channel) => (cb) => {
  const handler = (_e, data) => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('omen', {
  // диски и права
  disks: () => ipcRenderer.invoke('disks'),
  elevated: () => ipcRenderer.invoke('elevated'),
  restartElevated: () => ipcRenderer.invoke('restart-elevated'),

  // сканирование и очистка
  scan: (drive, mode) => ipcRenderer.invoke('scan', { drive, mode }),
  cancelScan: () => ipcRenderer.send('scan:cancel'),
  onScanProgress: sub('scan:progress'),
  clean: (categories, drive, mode) => ipcRenderer.invoke('clean', { categories, drive, mode }),
  onCleanProgress: sub('clean:progress'),

  // программы
  apps: () => ipcRenderer.invoke('apps'),
  uninstall: (list, silent) => ipcRenderer.invoke('uninstall', { list, silent }),
  onUninstallProgress: sub('uninstall:progress'),
  leftovers: (list) => ipcRenderer.invoke('leftovers', { list }),
  cleanLeftovers: (paths) => ipcRenderer.invoke('clean-leftovers', { paths }),

  // большие файлы
  bigFiles: (drive, minSize) => ipcRenderer.invoke('big-files', { drive, minSize }),
  cancelBig: () => ipcRenderer.send('big:cancel'),
  onBigProgress: sub('big:progress'),
  deleteFiles: (paths) => ipcRenderer.invoke('delete-files', { paths }),

  // автозагрузка
  startupList: () => ipcRenderer.invoke('startup-list'),
  startupToggle: (item, enable) => ipcRenderer.invoke('startup-toggle', { item, enable }),

  // настройки, исключения, история
  getSettings: () => ipcRenderer.invoke('settings-get'),
  setSettings: (patch) => ipcRenderer.invoke('settings-set', patch),
  getExclusions: () => ipcRenderer.invoke('exclusions-get'),
  addExclusion: () => ipcRenderer.invoke('exclusions-add'),
  addExclusionPath: (path) => ipcRenderer.invoke('exclusions-add-path', { path }),
  removeExclusion: (path) => ipcRenderer.invoke('exclusions-remove', { path }),
  getHistory: () => ipcRenderer.invoke('history-get'),
  clearHistory: () => ipcRenderer.invoke('history-clear'),
  deletedLog: () => ipcRenderer.invoke('deleted-log'),

  // прочее
  reveal: (path) => ipcRenderer.invoke('reveal', { path }),
  safetyCheck: (path, isDir) => ipcRenderer.invoke('safety-check', { path, isDir }),

  win: {
    minimize: () => ipcRenderer.send('win:min'),
    close: () => ipcRenderer.send('win:close')
  }
})
