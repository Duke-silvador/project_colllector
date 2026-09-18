(function () {
  'use strict';
  const providers = new Map();
  let database, timer, restoring = true, queue = Promise.resolve();
  const badge = () => document.getElementById('storageStatus');
  function message(text, error = false) {if (badge()) {badge().textContent = text; badge().classList.toggle('storage-error', error);}}
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('setasc-local-data', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('sessions');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('Feche outras abas antigas do sistema e tente novamente.'));
    });
    return database;
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', mode), request = action(tx.objectStore('sessions'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onabort = tx.onerror = () => reject(tx.error || request?.error || Error('Falha no armazenamento local.'));
    });
  }
  function saveNow() {
    clearTimeout(timer);
    if (restoring) return Promise.resolve();
    const snapshot = {version: 1, savedAt: Date.now(), sections: {}};
    for (const [key, provider] of providers) snapshot.sections[key] = provider.capture();
    message('Salvando neste navegador…');
    queue = queue.catch(() => {}).then(() => transaction('readwrite', store => store.put(snapshot, 'current'))).then(() => message('Dados salvos neste navegador')).catch(error => {
      message('Não foi possível salvar. Mantenha a página aberta e os arquivos originais.', true);
      console.warn('Armazenamento local:', error.message);
    });
    return queue;
  }
  function schedule() {if (!restoring) {clearTimeout(timer); timer = setTimeout(saveNow, 250);}}
  async function clear() {
    clearTimeout(timer); restoring = true;
    const job = window.LoadingUI.begin('Limpando dados', 'Removendo os dados salvos neste navegador…');
    try {
      await queue.catch(() => {});
      await transaction('readwrite', store => store.delete('current'));
      for (const provider of [...providers.values()].sort((a, b) => a.order - b.order)) await provider.clear();
      message('Dados locais removidos. Importe uma planilha para começar.');
    } catch (error) {message('Não foi possível limpar os dados salvos: ' + error.message, true);}
    finally {restoring = false; window.LoadingUI.end(job);}
  }
  const controls = ids => Object.fromEntries(ids.map(id => {const el = document.getElementById(id); return [id, el.type === 'checkbox' ? el.checked : el.value];}));
  const restoreControls = values => {for (const [id, value] of Object.entries(values || {})) {const el = document.getElementById(id); if (el) {if (el.type === 'checkbox') el.checked = value; else el.value = value;}}};
  window.LocalSession = {register: (key, provider) => providers.set(key, provider), schedule, saveNow, clear, controls, restoreControls};
  document.addEventListener('DOMContentLoaded', async () => {
    const job = window.LoadingUI.begin('Restaurando seus dados', 'Verificando os arquivos salvos neste navegador…');
    try {
      const saved = await transaction('readonly', store => store.get('current'));
      if (saved?.version === 1) {
        const entries = [...providers.entries()].sort((a, b) => a[1].order - b[1].order);
        for (let i = 0; i < entries.length; i++) {
          const [key, provider] = entries[i];
          if (saved.sections[key]) await provider.restore(saved.sections[key]);
          window.LoadingUI.progress(job, 20 + (i + 1) / entries.length * 75, 'Restaurando arquivos, filtros e resultados…');
          await window.LoadingUI.yield();
        }
        message('Dados restaurados · salvos neste navegador');
      } else message('Os dados serão salvos neste navegador');
    } catch (error) {message('Armazenamento local indisponível. Os dados desta sessão não serão preservados.', true); console.warn(error.message);}
    finally {restoring = false; window.LoadingUI.end(job); document.documentElement.dataset.sessionReady = 'true';}
    document.addEventListener('input', event => {if (event.target.type !== 'file') schedule();});
    document.addEventListener('change', event => {if (event.target.type !== 'file') schedule();});
    document.addEventListener('click', event => {if (event.target.closest('button') && !event.target.closest('[data-clear-session]')) schedule();});
    document.querySelectorAll('[data-clear-session]').forEach(button => button.addEventListener('click', clear));
    document.addEventListener('visibilitychange', () => {if (document.hidden) saveNow();});
  });
})();
