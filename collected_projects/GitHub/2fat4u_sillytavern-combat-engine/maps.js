import { emptyState, validateState, clone, uid } from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { imageFrom } from './visuals.js?v=2.0.0-beta.2-hotfix.2';
const require = (ok, message) => { if (!ok) throw new Error(message); };
export function mapFrom(raw) {
    require(raw && raw.kind === 'combat-map' && raw.version === 1, 'Keine gültige Kartenvorlage.');
    require(raw.board && typeof raw.board === 'object' && !Array.isArray(raw.board), 'Keine gültige Kartenvorlage.');
    const name = String(raw.name ?? '').trim(); require(name.length > 0 && name.length <= 100, 'Kartenname fehlt oder ist zu lang.');
    const board = validateState({ ...emptyState(), board: raw.board }).board;
    const backgroundImage = raw.backgroundImage == null ? null : imageFrom(raw.backgroundImage);
    require(!backgroundImage || backgroundImage.kind === 'background', 'Ungültiger Bildtyp.');
    require(!board.background || backgroundImage, 'Kartenbild fehlt im Bildspeicher.');
    const rawTextures=raw.textureImages??{};require(rawTextures&&typeof rawTextures==='object'&&!Array.isArray(rawTextures),'Invalid terrain textures');
    const textureImages=Object.fromEntries(Object.entries(board.appearance.assets).map(([type])=>{const image=imageFrom(rawTextures[type]);require(image.kind==='texture','Invalid terrain texture');return [type,image];}));
    return { textureImages,kind: 'combat-map', version: 1, id: String(raw.id ?? uid()).slice(0, 100), name, board, backgroundImage: board.background ? backgroundImage : null };
}
export function mapsFrom(raw = []) {
    require(Array.isArray(raw) && raw.length <= 50, 'Kartenbibliothek: höchstens 50 Karten.');
    const maps = raw.map(mapFrom);
    require(maps.every(v => v.id) && new Set(maps.map(v => v.id)).size === maps.length, 'Doppelte Karten-ID.');
    require(JSON.stringify(maps).length <= 32 * 1024 * 1024, 'Kartenbibliothek ist voll. Karten entfernen.');
    return maps;
}
export function captureMap(s, name, image, id = uid(), textureImage=()=>null) {
    return mapFrom({ kind: 'combat-map', version: 1, id, name, board: clone(s.board), textureImages:Object.fromEntries(Object.entries(s.board.appearance?.assets??{}).map(([type,id])=>[type,textureImage(id)])), backgroundImage: image });
}
export function mapFilename(name) {
    // Preserve the place name while keeping the download portable across systems.
    let filename = String(name ?? '').trim().replace(/\.json$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[.\s]+$/u, '').trim();
    if (!filename) filename = 'combat-map';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(filename)) filename = '_' + filename;
    return filename + '.json';
}
