/* Pièces figurines SVG originales, dessinées pour Échecs & Jeux IA.
   Aucun modèle ou graphisme commercial n'est recopié. */
const PALETTE={
 white:['#ffffff','#f8eee0','#b9a999'], black:['#7e899c','#344058','#11182a'],
 red:['#ffb5a7','#e4464c','#871a32'], blue:['#b7d5ff','#2b7bd0','#173873'],
 yellow:['#fff3a3','#f0b82c','#a57515'], green:['#a1ffcd','#19a36d','#085536']
};
const base=(g)=>`
 <ellipse cx="50" cy="108" rx="32" ry="7" fill="${g.shadow}" opacity=".28"/>
 <path d="M18 99 Q18 91 29 91 H71 Q82 91 82 99 L77 107 Q50 115 23 107Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.4"/>
 <path d="M24 93 Q50 87 76 93 L73 97 Q50 94 27 97Z" fill="${g.light}" opacity=".73"/>
 <path d="M31 90 Q30 85 35 81 L65 81 Q70 86 69 90Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="1.6"/>`;
const silhouettes={
 P:g=>`${base(g)}<path d="M35 82 Q37 64 44 57 Q44 53 44 48 H56 Q56 53 56 57 Q63 66 65 82Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2"/><ellipse cx="50" cy="48" rx="15" ry="5" fill="url(#${g.id})"/><circle cx="50" cy="31" r="14" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2"/><ellipse cx="45" cy="25" rx="6" ry="4" fill="${g.light}" opacity=".6"/>`,
 R:g=>`${base(g)}<path d="M34 81 L34 38 L66 38 L67 81Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.2"/><path d="M29 30 V18 H38 V26 H46 V18 H55 V26 H63 V18 H72 V30 L68 39 H32Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.2"/><path d="M44 45 H56 V71 H44Z" fill="${g.shadow}" opacity=".25"/><path d="M30 33 H70" stroke="${g.light}" stroke-width="2.5" opacity=".65"/>`,
 N:g=>`${base(g)}<path d="M34 83 L30 68 Q33 57 30 47 L36 31 L32 22 L45 30 Q56 22 67 31 L78 43 L76 55 L65 59 L59 53 L51 53 Q49 71 64 83Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.6" stroke-linejoin="round"/><path d="M37 33 L45 37 L38 49 L43 63" fill="none" stroke="${g.shadow}" stroke-width="5" opacity=".55" stroke-linecap="round"/><ellipse cx="64" cy="41" rx="3" ry="3.4" fill="${g.shadow}"/><path d="M74 49 L68 50" stroke="${g.light}" stroke-width="2.2"/>`,
 B:g=>`${base(g)}<path d="M34 82 Q33 70 41 60 Q35 51 39 43 Q40 30 50 23 Q60 30 61 43 Q65 51 59 60 Q67 70 66 82Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.2"/><path d="M57 36 L45 55" stroke="${g.shadow}" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="20" r="4" fill="${g.light}" stroke="${g.edge}" stroke-width="1"/><ellipse cx="50" cy="82" rx="19" ry="4" fill="${g.light}" opacity=".4"/>`,
 Q:g=>`${base(g)}<path d="M32 81 L23 37 L39 51 L48 30 L55 51 L72 35 L68 81Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.2"/><circle cx="23" cy="34" r="5" fill="${g.light}" stroke="${g.edge}" stroke-width="1.5"/><circle cx="48" cy="26" r="5" fill="${g.light}" stroke="${g.edge}" stroke-width="1.5"/><circle cx="73" cy="32" r="5" fill="${g.light}" stroke="${g.edge}" stroke-width="1.5"/><path d="M34 66 Q50 61 66 66" stroke="${g.light}" stroke-width="4" fill="none" opacity=".8"/>`,
 K:g=>`${base(g)}<path d="M32 81 Q34 59 41 51 L59 51 Q66 61 68 81Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2.4"/><path d="M31 52 Q29 43 37 37 H63 Q71 43 69 52 Q62 58 50 58 Q38 58 31 52Z" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="2"/><rect x="46" y="12" width="8" height="27" rx="2" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="1.6"/><rect x="38" y="19" width="24" height="8" rx="2" fill="url(#${g.id})" stroke="${g.edge}" stroke-width="1.6"/>`
};
export function renderFigure(piece,id){
 const [light,mid,shadow]=PALETTE[piece.color]||PALETTE.black;
 const g={id:`fig-${id}`,light,mid,shadow,edge:shadow};
 const shape=(silhouettes[piece.t]||silhouettes.P)(g);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118" preserveAspectRatio="xMidYMid meet" role="presentation" aria-hidden="true"><defs><linearGradient id="${g.id}" x1="0%" y1="0%" x2="95%" y2="15%"><stop offset="0" stop-color="${light}"/><stop offset=".35" stop-color="${mid}"/><stop offset=".8" stop-color="${shadow}"/><stop offset="1" stop-color="${mid}"/></linearGradient></defs>${shape}</svg>`;
}
