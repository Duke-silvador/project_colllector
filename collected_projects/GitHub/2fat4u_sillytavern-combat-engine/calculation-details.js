import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
export function calculationDetails(r,language='de'){
 const l=(de,en)=>language==='en'?en:de,signed=n=>n>=0?'+'+n:String(n),format=(values,labels)=>Object.entries(values??{}).filter(([k,v])=>v!==0||['actor','weapon','base','profile','check'].includes(k)).map(([k,v])=>(labels[k]??k)+' '+signed(v)).join(', ');
 const labels={actor:l('Figur','Actor'),weapon:l('Waffe','Weapon'),height:l('Höhe','Height'),stance:l('Haltung','Stance'),aim:l('Zielen','Aim'),support:l('Unterstützung','Support'),distract:l('Ablenkung','Distract'),poison:l('Gift','Poison'),shotRisk:'Friendly Fire',base:l('Basis','Base'),shield:l('Schild','Shield'),profile:l('Fähigkeit','Ability'),check:l('Eigene Probe','Own check')};
 if(r.type==='attack'&&r.attackModifiers)return '\n'+l('Trefferrechnung: ','Hit calculation: ')+r.natural+' + '+r.ability+' ('+(statLabels(language)[r.stat]??r.stat)+'), '+format(r.attackModifiers,labels)+' = '+r.total+'.\n'+l('Zielabwehr: ','Target defense: ')+format(r.defenseModifiers,labels)+' = '+r.dc+'.';
 if(r.bonusSources)return '\n'+l('Zusatzbonus: ','Additional bonus: ')+format(r.bonusSources,labels)+' = '+r.bonus+'.';
 return '';
}
