// What Daftar's page can ask of the Windows app: show a notification, and
// whether it starts with Windows.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daftarDesktop', {
  notify: (note) => ipcRenderer.send('daftar:notify', {
    title: String(note?.title || ''),
    body: String(note?.body || ''),
    url: String(note?.url || ''),
  }),
  // Starting with Windows, as also set from the tray menu.
  autostart: {
    get: () => ipcRenderer.invoke('daftar:autostart'),
    set: (on) => ipcRenderer.invoke('daftar:autostart', Boolean(on)),
  },
});
