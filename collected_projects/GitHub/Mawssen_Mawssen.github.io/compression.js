(() => {
  'use strict';
  const data = window.COMPRESSION_DATA;
  const slider = document.getElementById('compression-slider');
  const outcome = document.getElementById('compression-outcome');
  if (!data || !slider) return;
  const atlas = new Image();
  const original = document.getElementById('original-canvas');
  const mps = document.getElementById('mps-canvas');
  const maximumBond = Math.max(...data.frames.flatMap(frame => frame.bonds));
  const portraitLabel = document.getElementById('massen-label');
  let ready = false;
  function draw(canvas, col, row) {
    canvas.getContext('2d').drawImage(atlas, col*data.size, row*data.size, data.size, data.size, 0, 0, data.size, data.size);
  }
  function update() {
    if (!ready) return;
    const i = Number(slider.value);
    const frame = data.frames[i];
    draw(original, 0, 0);
    draw(mps, 1, 1+i);
    const ratio = frame.storage.cr.toFixed(frame.storage.cr === 1 ? 0 : 1) + '×';
    portraitLabel.textContent = frame.label;
    document.getElementById('compression-value').textContent = ratio;
    slider.setAttribute('aria-valuetext', frame.label + ', ' + ratio + ' storage compression');
    mps.setAttribute('aria-label', frame.mode === 'reference' ? 'Full-resolution Massen: uncompressed 256 by 256 grayscale headshot' : frame.label + ': Matrix Product State reconstruction at ' + ratio + ' storage compression');
    for (let k=0;k<data.sites-1;k++) {
      document.getElementById('mps-bond-'+k).setAttribute('stroke-width', (0.8 + 10*Math.log2(frame.bonds[k+1]+1)/Math.log2(maximumBond+1)).toFixed(3));
    }
    // Full resolution is the raw 256px reference, not an MPS storage claim.
    // At the strongest truncations, even a rank-1 matrix SVD exceeds the MPS budget.
    outcome.hidden = !frame.svd;
    if (!frame.svd) { outcome.textContent = ''; return; }
    // Every displayed comparison uses exactly equal float64 storage budgets.
    const difference = 100 * (1-frame.mps.relativeError/frame.svd.relativeError);
    if (difference >= 0) {
      outcome.textContent = 'At the same storage compression, MPS has ' + difference.toFixed(1) + '% lower error than Singular Value Decomposition (SVD).';
    } else {
      const svdBenefit = 100 * (1-frame.svd.relativeError/frame.mps.relativeError);
      outcome.textContent = 'At the same storage compression, Singular Value Decomposition (SVD) has ' + svdBenefit.toFixed(1) + '% lower error than MPS.';
    }
  }
  slider.addEventListener('input', update);
  atlas.onload = () => {
    ready = true;
    slider.max = data.frames.length - 1;
    slider.value = data.defaultIndex;
    slider.disabled = false;
    update();
  };
  atlas.onerror = () => { outcome.hidden = false; outcome.textContent = 'The headshot images could not load. Please reload.'; };
  atlas.src = 'compression-atlas.png?v=3';
})();
