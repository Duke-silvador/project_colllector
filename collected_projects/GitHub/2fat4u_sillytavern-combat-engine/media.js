// Browser-only file processing, kept separate from rules and visual state.
import { IMAGE_LIMITS, imageFrom } from './visuals.js?v=2.0.0-beta.2-hotfix.2';

export function prepareImage(file, kind, environment = {}) {
    return compressImage(file, kind, environment);
}
async function compressImage(file, kind, environment) {
    const limits = IMAGE_LIMITS[kind];
    if (!limits) throw new Error('Ungültiger Bildtyp.');
    if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Bitte ein PNG-, JPEG-, WebP- oder GIF-Bild auswählen.');
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 20 * 1024 * 1024) throw new Error('Die Bilddatei darf höchstens 20 MB groß sein.');
    const ImageClass = environment.Image ?? globalThis.Image;
    const urls = environment.URL ?? globalThis.URL;
    const createCanvas = environment.canvas ?? (() => document.createElement('canvas'));
    const url = urls.createObjectURL(file);
    let image;
    try {
        image = new ImageClass();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.')); image.src = url; });
        const w = image.naturalWidth, h = image.naturalHeight;
        if (!w || !h || w * h > 40 * 1024 * 1024 || Math.max(w, h) > 16384) throw new Error('Das Bild hat zu viele Pixel. Bitte vorher verkleinern.');
        let factor = Math.min(1, limits.edge / Math.max(w, h));
        const canvas = createCanvas(), context = canvas.getContext('2d');
        if (!context) throw new Error('Bildverarbeitung ist in diesem Browser nicht verfügbar.');
        for (let attempt = 0; attempt < 8; attempt++) {
            canvas.width = Math.max(1, Math.round(w * factor)); canvas.height = Math.max(1, Math.round(h * factor));
            context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const src = canvas.toDataURL('image/webp', Math.max(0.55, 0.85 - attempt * 0.05));
            if (src.length <= Math.ceil(limits.bytes / 3) * 4 + 32) return imageFrom({ kind, src, width: canvas.width, height: canvas.height });
            factor *= 0.8;
        }
        throw new Error('Bild ist nach der Komprimierung zu groß.');
    } finally { if (image) image.onload = image.onerror = null; urls.revokeObjectURL(url); }
}
