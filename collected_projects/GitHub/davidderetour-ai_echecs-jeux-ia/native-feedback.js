/* Retour tactile facultatif : utilise un plugin natif Capacitor si présent.
   Sans couche native, les jeux restent pleinement jouables. */
document.addEventListener('pointerup', event => {
  if (!event.target.closest?.('.board .cell')) return;
  try {
    const haptics = window.Capacitor?.Plugins?.Haptics;
    if (haptics?.impact) Promise.resolve(haptics.impact({style:'LIGHT'})).catch(()=>{});
  } catch (_) { /* L'absence du plugin ne bloque jamais le jeu. */ }
}, {passive:true});
