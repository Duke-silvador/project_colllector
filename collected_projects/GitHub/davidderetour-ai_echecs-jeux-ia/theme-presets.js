// Thèmes originaux inspirés des matériaux et traditions des échiquiers.
// Aucun élément graphique téléchargé, aucune ressource protégée recopiée.
export const CHESS_THEMES=Object.freeze([
 {id:'3d',name:'Atelier 3D',subtitle:'Ivoire et bleu · relief',light:'#f9e9ca',dark:'#5b80a4',frame:'#a99470'},
 {id:'classic',name:'Tournoi',subtitle:'Sable et sauge · lisible',light:'#f4eacc',dark:'#80a07d',frame:'#5f665b'},
 {id:'wood',name:'Bois Staunton',subtitle:'Érable et noyer',light:'#e9c999',dark:'#99613a',frame:'#603c22'},
 {id:'marble',name:'Marbre',subtitle:'Blanc et ardoise',light:'#f2f3ed',dark:'#8e9aa5',frame:'#b2b7bc'},
 {id:'royal',name:'Royal médiéval',subtitle:'Parchemin et bordeaux',light:'#f5dfb0',dark:'#9e4052',frame:'#a17a35'},
 {id:'onyx',name:'Noir & or',subtitle:'Luxe sombre et doré',light:'#d7bf87',dark:'#3b3b48',frame:'#bb9851'},
 {id:'neon',name:'Néon futuriste',subtitle:'Bleu nuit et turquoise',light:'#a3cfea',dark:'#234767',frame:'#39e1ce'},
 {id:'junior',name:'Junior coloré',subtitle:'Pastel et gros contrastes',light:'#fff2b1',dark:'#83c8cf',frame:'#f0a75c'},
]);
export const THEME_IDS=Object.freeze(CHESS_THEMES.map(x=>x.id));
export const isTheme=id=>THEME_IDS.includes(id);
export const themeLabel=id=>CHESS_THEMES.find(x=>x.id===id)?.name||'Atelier 3D';
