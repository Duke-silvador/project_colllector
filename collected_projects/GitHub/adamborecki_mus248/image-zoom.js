// Tap-to-enlarge for the photos in rendered Markdown. A figure's photo shows small on the
// page (activity.css caps it); clicking it, or Enter/Space on it, opens it full size in a
// dialog with its caption. Any click or Escape closes it. One dialog per page.

let dialog;

function zoomDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'image-zoom';
  dialog.setAttribute('aria-label', 'Enlarged photo');
  dialog.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><button type="button" class="image-zoom-close" aria-label="Close">✕</button>';
  dialog.addEventListener('click', () => dialog.close());
  document.body.append(dialog);
  return dialog;
}

function open(img) {
  const box = zoomDialog();
  const big = box.querySelector('img');
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;
  const caption = img.closest('figure')?.querySelector('figcaption');
  box.querySelector('figcaption').innerHTML = caption ? caption.innerHTML : '';
  box.showModal();
}

export function enableImageZoom(root) {
  for (const img of root.querySelectorAll('figure img')) {
    img.tabIndex = 0;
    img.title = 'Click to enlarge';
    img.setAttribute('aria-haspopup', 'dialog');
  }
  root.addEventListener('click', (event) => {
    const img = event.target.closest('figure img');
    if (img && root.contains(img)) open(img);
  });
  root.addEventListener('keydown', (event) => {
    const img = event.target.closest?.('figure img');
    if (!img || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    open(img);
  });
}
