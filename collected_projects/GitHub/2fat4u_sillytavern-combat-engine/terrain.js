const key = p => `${p.x},${p.y}`;
const same = (a, b) => a && b && key(a) === key(b);
export function terrainFrom(raw, width, height) {
    const fail = message => { throw new Error(message); };
    const point = p => {
        if (!p || !Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) fail('Ungültiges Höhen- oder Leiterfeld.');
        return { x: p.x, y: p.y };
    };
    const list = (name, limit) => { const value = raw[name] ?? []; if (!Array.isArray(value) || value.length > limit) fail('Ungültige Geländeliste: ' + name); return value; };
    const pits=list('pits',width*height).map(point);if(new Set(pits.map(key)).size!==pits.length)fail('Doppelte Abgrundfelder.');if(pits.some(p=>[...(raw.blocked??[]),...(raw.cover??[])].some(q=>same(p,q))))fail('Abgrund kann keine Mauer oder Deckung sein.');
    let heights = list('heights', width * height).map(point);
    if (new Set(heights.map(key)).size !== heights.length) fail('Doppelte Höhenfelder.');
    if(heights.some(p=>pits.some(q=>same(p,q))))fail('Abgrund kann kein Höhenfeld sein.');
    heights = heights.filter(p=>!(raw.blocked ?? []).some(v=>same(v,p)));
    const high = new Set(heights.map(key)), occupied = new Set([...(raw.blocked ?? []), ...(raw.cover ?? []),...pits].map(key));
    const links = new Set();
    const ladders = list('ladders', width * height * 4).map(v => {
        const from = point(v.from), to = point(v.to), edge = [key(from), key(to)].sort().join('|');
        if (Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y)) !== 1 || high.has(key(from)) === high.has(key(to)) || occupied.has(key(from)) || occupied.has(key(to)) || links.has(edge)) fail('Leiter benötigt zwei freie Nachbarfelder auf unterschiedlichen Höhen; jede Verbindung nur einmal.');
        links.add(edge); return { from, to };
    });
    const coverKeys = new Set((raw.cover ?? []).map(key)), faces = new Set();
    const coverFaces = list('coverFaces', width * height).map(v => {
        const p = point(v);
        if (!coverKeys.has(key(p)) || faces.has(key(p)) || !['north', 'east', 'south', 'west'].includes(v.facing)) fail('Ungültige Deckungsrichtung.');
        faces.add(key(p)); return { ...p, facing: v.facing };
    });
    return { heights, ladders, coverFaces,pits };
}
export function heightAt(s, p) { return s.rules.boardEnabled && s.rules.heightsEnabled && p && (s.board.heights ?? []).some(v => same(v, p)) ? 1 : 0; }
export function ladderBetween(s, a, b) { return (s.board.ladders ?? []).some(v => same(v.from, a) && same(v.to, b) || same(v.to, a) && same(v.from, b)); }
export function heightTransition(s, a, b) { return heightAt(s, a) === heightAt(s, b) || ladderBetween(s, a, b); }
export function heightCorner(s, a, b) {
    if (a.x === b.x || a.y === b.y || ladderBetween(s, a, b)) return true;
    return heightAt(s, a) === heightAt(s, { x: a.x, y: b.y }) && heightAt(s, a) === heightAt(s, { x: b.x, y: a.y });
}
export function shields(s, cover, from, target) {
    if (!from || !target || !(s.board.cover ?? []).some(v => same(v, cover)) || heightAt(s, cover) !== heightAt(s, target)) return false;
    const face = (s.board.coverFaces ?? []).find(v => same(v, cover))?.facing;
    if (!face) return true;
    const axis = face === 'north' || face === 'south' ? 'y' : 'x', sign = face === 'north' || face === 'west' ? -1 : 1;
    return (from[axis] - cover[axis]) * sign > 0 && (target[axis] - cover[axis]) * sign <= 0;
}
export function cleanTerrain(board, patch) {
    const merged = { ...board, ...patch }, inside = p => p.x < merged.width && p.y < merged.height;
    const heights = (merged.heights ?? []).filter(p=>inside(p)&&!(merged.blocked??[]).some(v=>same(v,p))), high = new Set(heights.map(key));
    const solid = new Set([...(merged.blocked ?? []), ...(merged.cover ?? []),...(merged.pits??[])].map(key));
    return { ...patch,pits:(merged.pits??[]).filter(p=>inside(p)&&![...(merged.blocked??[]),...(merged.cover??[]),...heights].some(q=>same(p,q))), heights, coverFaces: (merged.coverFaces ?? []).filter(p => inside(p) && (merged.cover ?? []).some(v => same(v, p))),
        ladders: (merged.ladders ?? []).filter(v => inside(v.from) && inside(v.to) && high.has(key(v.from)) !== high.has(key(v.to)) && !solid.has(key(v.from)) && !solid.has(key(v.to))) };
}
