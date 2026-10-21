// Appearance only: these fields never define walkability, cover or sight.
export const TEXTURE_TYPES=Object.freeze(['ground','wall','cover','pit','height']);
export function appearanceFrom(raw={}) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid terrain appearance');
    const wall=raw.wall??'default',cover=raw.cover??'default',style=raw.style??'natural';
    if(!['default','tree','rock','wall'].includes(wall)||!['default','bush','rock','wall'].includes(cover)||!['natural','stone','wood'].includes(style)||raw.textures!==undefined&&typeof raw.textures!=='boolean')throw Error('Invalid terrain appearance');
    const input=raw.assets??{};
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!TEXTURE_TYPES.includes(k)))throw Error('Invalid terrain textures');
    const assets=Object.fromEntries(Object.entries(input).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>{
        if(typeof v!=='string'||!/^img-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))throw Error('Invalid terrain texture reference');
        return [k,v];
    }));
    return {wall,cover,style,textures:raw.textures??false,assets};
}
export function terrainSymbol(appearance,type,preset) {
    const v=appearance?.[type]??'default';
    return ({tree:'♣',rock:'◆',wall:'▥',bush:'♣'})[v]??(type==='wall'?(preset==='forest'?'♣':'×'):'▰');
}
export function terrainTextureType(board,p) {
    const at=list=>(list??[]).some(v=>v.x===p.x&&v.y===p.y);
    return at(board.blocked)?'wall':at(board.cover)?'cover':at(board.pits)?'pit':at(board.heights)?'height':'ground';
}
