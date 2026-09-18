(function () {
  'use strict';
  const jobs = new Map(); let serial = 0, previousFocus;
  const $ = id => document.getElementById(id);
  const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 20));
  function draw() {
    const job = [...jobs.values()].at(-1);
    if (!job) return;
    $('loadingTitle').textContent = job.title;
    $('loadingMessage').textContent = job.message;
    $('loadingProgress').value = job.percent;
    $('loadingPercent').textContent = `${Math.round(job.percent)}%`;
  }
  function begin(title = 'Carregando dados', message = 'Preparando leitura da planilha…') {
    if (!jobs.size) {
      previousFocus = document.activeElement;
      document.querySelectorAll('body > header, body > .navigation-bar, body > main').forEach(el => {el.inert = true;});
      $('loadingOverlay').hidden = false; $('loadingOverlay').focus({preventScroll: true});
      document.body.classList.add('is-loading');
    }
    const id = ++serial; jobs.set(id, {title, message, percent: 0}); draw(); return id;
  }
  function progress(id, percent, message) {const job = jobs.get(id); if (job) {job.percent = Math.max(job.percent, Math.min(100, percent)); job.message = message || job.message; draw();}}
  function end(id) {
    jobs.delete(id);
    if (jobs.size) {draw(); return;}
    $('loadingOverlay').hidden = true; document.body.classList.remove('is-loading');
    document.querySelectorAll('body > header, body > .navigation-bar, body > main').forEach(el => {el.inert = false;});
    if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus({preventScroll: true});
  }
  window.LoadingUI = {begin, progress, end, yield: yieldFrame};
  function readBuffer(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = event => {if (event.lengthComputable) onProgress(event.loaded / event.total * 20, 'Lendo os bytes do arquivo…');};
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || Error('Falha ao ler o arquivo.'));
      reader.onabort = () => reject(Error('Leitura cancelada.'));
      reader.readAsArrayBuffer(file);
    });
  }
  async function load(file, kind, onProgress = () => {}) {
    if (file.size > 50 * 1024 * 1024) throw Error('O limite por arquivo é 50 MB.');
    onProgress(0, 'Preparando ' + file.name);
    await yieldFrame();
    const buffer = await readBuffer(file, onProgress);
    onProgress(22, 'Interpretando a planilha. Aguarde…');
    return new Promise((resolve, reject) => {
      let worker, url;
      const close = () => {worker?.terminate(); if (url) URL.revokeObjectURL(url);};
      try {
        url = URL.createObjectURL(new Blob([window.WorkbookWorkerSource], {type: 'text/javascript'}));
        worker = new Worker(url);
        worker.onmessage = event => {
          const m = event.data;
          if (m.type === 'progress') onProgress(m.percent, m.message);
          if (m.type === 'result') {close(); resolve(m.result);}
          if (m.type === 'error') {close(); reject(Error(m.message));}
        };
        worker.onerror = () => {close(); reject(Error('Não foi possível executar o leitor de planilhas. Verifique se o host permite Web Workers com URL blob: e se os arquivos do site estão completos.'));};
        worker.postMessage({buffer, kind}, [buffer]);
      } catch (error) {close(); reject(error);}
    });
  }
  window.WorkbookIO = {load};
})();
