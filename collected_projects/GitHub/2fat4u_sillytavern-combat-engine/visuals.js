// Optional visual data. Pure schema/storage helpers; no combat decisions or DOM.
export const IMAGE_LIMITS = Object.freeze({ portrait: { edge: 512, bytes: 160 * 1024 }, background: { edge: 2048, bytes: 1024 * 1024 }, texture:{edge:512,bytes:64*1024} });
function require(ok, message) { if (!ok) throw new Error(message); }
export function imageRef(value) {
    if (value == null || value === '') return null;
    require(typeof value === 'string' && /^img-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value), 'Ungültiger Bildverweis.');
    return value;
}
export function imageFrom(raw) {
    require(raw && typeof raw === 'object' && !Array.isArray(raw), 'Ungültige Bilddaten.');
    const limits = IMAGE_LIMITS[raw.kind];
    require(Boolean(limits), 'Ungültiger Bildtyp.');
    const width = Number(raw.width), height = Number(raw.height);
    require(Number.isInteger(width) && width > 0 && width <= limits.edge && Number.isInteger(height) && height > 0 && height <= limits.edge, 'Ungültige Bildgröße.');
    require(typeof raw.src === 'string' && raw.src.length <= Math.ceil(limits.bytes / 3) * 4 + 32, 'Bild ist nach der Komprimierung zu groß.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw.src);
    require(match && match[2].length % 4 === 0, 'Nur eingebettete PNG-, JPEG- oder WebP-Bilder sind erlaubt.');
    require(match[1] === 'png' ? match[2].startsWith('iVBORw0KGgo') : match[1] === 'jpeg' ? match[2].startsWith('/9j/') : match[2].startsWith('UklGR'), 'Ungültige Bilddaten.');
    return { kind: raw.kind, width, height, src: raw.src };
}
export function imagesFrom(raw = {}) {
    require(raw && typeof raw === 'object' && !Array.isArray(raw), 'Ungültiger Bildspeicher.');
    let bytes = 0;
    const images = Object.fromEntries(Object.entries(raw).map(([id, value]) => { require(Boolean(imageRef(id)), 'Ungültiger Bildverweis.'); const image = imageFrom(value); bytes += image.src.length; return [id, image]; }));
    require(bytes <= 32 * 1024 * 1024, 'Bildspeicher ist voll. Bilder entfernen oder einen neuen Kampf anlegen.');
    return images;
}
export function backgroundFrom(raw) {
    if (raw == null) return null;
    require(raw && typeof raw === 'object' && !Array.isArray(raw), 'Ungültiger Kartenhintergrund.');
    const asset = imageRef(raw.asset);
    require(Boolean(asset), 'Kartenbild fehlt.');
    function number(key, fallback, min, max) { const v = raw[key] ?? fallback; require(typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max, 'Ungültige Kartenbildeinstellung.'); return v; }
    require(raw.enabled === undefined || typeof raw.enabled === 'boolean', 'Ungültige Kartenbildeinstellung.');
    const fit = raw.fit ?? 'contain';
    require(['contain', 'cover'].includes(fit), 'Ungültige Kartenbildeinstellung.');
    return { asset, enabled: raw.enabled ?? true, fit, scale: number('scale', 100, 25, 400), x: number('x', 0, -100, 100), y: number('y', 0, -100, 100), opacity: number('opacity', 90, 0, 100), gridOpacity: number('gridOpacity', 25, 0, 100) };
}
export function imageRefs(state) { return [...new Set([state.board?.background?.asset,...Object.values(state.board?.appearance?.assets??{}), ...state.actors.map(a => a.portrait)].filter(Boolean))]; }
export function selectImages(images, states) {
    const refs = new Set(states.flatMap(imageRefs));
    return Object.fromEntries([...refs].filter(id => Object.hasOwn(images, id)).map(id => [id, images[id]]));
}
export function assertImages(state, images) {
    for (const a of state.actors) if (a.portrait) require(images[a.portrait]?.kind === 'portrait', 'Figurenbild fehlt im Bildspeicher.');
    for(const id of Object.values(state.board?.appearance?.assets??{}))require(images[id]?.kind==='texture','Terrain texture missing from image store');
    if (state.board?.background) require(images[state.board.background.asset]?.kind === 'background', 'Kartenbild fehlt im Bildspeicher.');
}
export function backgroundGeometry(background, image, width, height) {
    const fit = background.fit === 'cover' ? Math.max : Math.min;
    const factor = fit(width / image.width, height / image.height) * background.scale / 100;
    return { width: image.width * factor, height: image.height * factor, left: width * (0.5 + background.x / 100), top: height * (0.5 + background.y / 100) };
}
