(function(){
'use strict';
/* V5.3 LIVING CREWS & ORGANIZATIONS */
var $=function(s){return document.querySelector(s)},$$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var GAME_RELEASE='V5.3 Living Crews & Organizations',game=null,slot=1,mode='destiny',majorOnly=false,timelineExpanded=false,backupMode='export',P='opl-v05-';
var ORIG=['East Blue','North Blue','West Blue','South Blue'],REG=ORIG.concat(['Grand Line','New World']);
var ST=['Force','Vitesse','Agilité','Endurance','Résistance','Réflexes','Discipline','Volonté'];
var SK=['Combat','Sabre','Tir','Navigation','Médecine','Commandement','Discrétion','Science'];
var TRAINING_PROFILES={
 Grandir:{keys:['Endurance','Réflexes'],desc:'Développement naturel : Endurance & Réflexes'},
 Études:{keys:['Discipline','Science'],desc:'Discipline & Science'},
 Entraînement:{keys:['Force','Combat'],desc:'Force & Combat'},
 Renforcement:{keys:['Force','Résistance'],desc:'Force & Résistance'},
 Mobilité:{keys:['Vitesse','Agilité'],desc:'Vitesse & Agilité'},
 'Condition physique':{keys:['Endurance','Réflexes'],desc:'Endurance & Réflexes'},
 Mental:{keys:['Volonté','Discipline'],desc:'Volonté & Discipline'},
 Navigation:{keys:['Navigation','Endurance'],desc:'Navigation & Endurance'},
 Sabre:{keys:['Sabre','Réflexes'],desc:'Sabre & Réflexes'},
 Tir:{keys:['Tir','Réflexes'],desc:'Tir & Réflexes'},
 Médecine:{keys:['Médecine','Discipline'],desc:'Médecine & Discipline'},
 Commandement:{keys:['Commandement','Volonté'],desc:'Commandement & Volonté'},
 Discrétion:{keys:['Discrétion','Agilité'],desc:'Discrétion & Agilité'},
 Science:{keys:['Science','Discipline'],desc:'Science & Discipline'},
 'Formation Marine':{keys:['Discipline','Combat'],desc:'Discipline & Combat'},
 'Formation Pirates':{keys:['Combat','Navigation'],desc:'Combat & Navigation'},
 'Formation Révolutionnaires':{keys:['Discrétion','Commandement'],desc:'Discrétion & Commandement'},
 'Formation Gouvernement':{keys:['Discipline','Discrétion'],desc:'Discipline & Discrétion'}
};

var SIMPLE_FOCUS={
 'Auto':{label:'Auto',desc:'Le moteur choisit automatiquement la meilleure priorité selon ton état, ta carrière, ton style et tes pouvoirs.'},
 'Équilibre':{label:'Équilibre',desc:'Le moteur corrige automatiquement tes points faibles sans micro-gestion.'},
 'Combat':{label:'Combat',desc:'Travaille automatiquement ton style de combat et les qualités physiques qui lui correspondent.'},
 'Forme':{label:'Forme',desc:'Renforce automatiquement tes qualités physiques les moins développées.'},
 'Carrière':{label:'Carrière',desc:'Développe les compétences réellement utiles à ta spécialisation et à ta progression professionnelle.'},
 'Pouvoirs':{label:'Pouvoirs',desc:'Concentre la période sur le Haki, le Fruit du démon et la volonté.'}
};
var LEGACY_FOCUS={
 'Études':'Carrière','Entraînement':'Combat','Renforcement':'Forme','Mobilité':'Forme','Condition physique':'Forme','Mental':'Équilibre','Sabre':'Combat','Tir':'Combat','Médecine':'Carrière','Commandement':'Carrière','Discrétion':'Carrière','Science':'Carrière',
 'Formation Marine':'Carrière','Formation Pirates':'Carrière','Formation Révolutionnaires':'Carrière','Formation Gouvernement':'Carrière','Haki Observation':'Pouvoirs','Haki Armement':'Pouvoirs','Haki Conquérant':'Pouvoirs','Maîtrise du Fruit':'Pouvoirs'
};
function keyValue(k){var p=game.player;return p.stats&&p.stats[k]!=null?p.stats[k]:p.skills&&p.skills[k]!=null?p.skills[k]:0}
function keyCap(k){return Math.max(1,game.player.caps&&game.player.caps[k]||100)}
function weakestOf(keys,count){return keys.slice().sort(function(a,b){return keyValue(a)/keyCap(a)-keyValue(b)/keyCap(b)}).slice(0,count||1)}
function styleTrainingPlan(){
 var p=game.player;if(p.style==='Corps-à-corps')return[{key:'Combat',weight:1},{key:'Force',weight:.65},{key:'Endurance',weight:.35}];if(p.style==='Sabreur')return[{key:'Sabre',weight:1.1},{key:'Combat',weight:.45},{key:'Réflexes',weight:.45}];if(p.style==='Tireur')return[{key:'Tir',weight:.95},{key:'Réflexes',weight:.6},{key:'Discipline',weight:.45}];if(p.style==='Mobile / esquive')return[{key:'Combat',weight:.85},{key:'Agilité',weight:.85},{key:'Vitesse',weight:.3}];return[{key:'Combat',weight:1.1},{key:'Réflexes',weight:.55},{key:'Discipline',weight:.35}]
}
function styleFocusKeys(){return styleTrainingPlan().map(function(x){return x.key})}

function careerFocusKeys(){
 var p=game.player,profile=specProfile(p.specialization);if(profile)return weakestOf(profile.keys,2);
 var factionMap={Marine:['Discipline','Combat'],Pirates:['Combat','Navigation'],'Chasseur de primes':['Réflexes','Discrétion'],Révolutionnaires:['Discrétion','Commandement'],Gouvernement:['Discipline','Discrétion'],Civil:['Discipline','Science']};
 return factionMap[p.faction]||['Discipline','Science']
}
function simpleFocusKeys(a){
 var p=game.player;
 if(a==='Équilibre'){
  if(p.ambition==='Explorer le monde')return[weakestOf(['Endurance','Réflexes','Agilité'],1)[0],'Navigation'];
  if(p.ambition==='Entrer dans l’histoire')return['Volonté','Commandement'];
  if(p.ambition==='Survivre')return[weakestOf(['Endurance','Résistance','Réflexes'],1)[0],weakestOf(SK,1)[0]];
  return[weakestOf(ST,1)[0],weakestOf(SK,1)[0]]
 }
 if(a==='Combat')return styleFocusKeys();
 if(a==='Forme')return weakestOf(['Force','Vitesse','Agilité','Endurance','Résistance','Réflexes'],2);
 if(a==='Carrière')return careerFocusKeys();
 return[]
}
function hasPowerFocus(){
 var p=game.player;if(p.fruit)return true;if(Object.keys(p.haki||{}).some(function(k){return p.haki[k]>0}))return true;
 return p.ageMonths>=144&&Math.max(p.latent.Observation||0,p.latent.Armement||0,p.latent.Conquérant||0)>55
}
function focusOptions(){
 var p=game.player;if(p.ageMonths<72)return['Grandir'];var out=['Auto','Combat','Forme'];if(p.ageMonths>=180||p.career!=='Aucune')out.push('Carrière');if(hasPowerFocus())out.push('Pouvoirs');return out
}
function recommendedFocus(){
 var p=game.player;if(p.ageMonths<72)return'Grandir';if(p.health<72||p.energy<45)return'Forme';
 if(hasPowerFocus()&&(p.fruit&&p.fruitMastery<30||Object.keys(p.haki).some(function(k){return p.haki[k]>0&&p.haki[k]<25})))return'Pouvoirs';
 if(p.ambition==='Devenir puissant')return'Combat';
 if(p.ambition==='Faire fortune'&&p.career!=='Aucune')return'Carrière';
 if(p.ambition==='Survivre'&&(p.stats.Résistance<45||p.stats.Endurance<45))return'Forme';
 if(p.specialization&&careerExpertise(p.specialization)<32)return'Carrière';
 return'Équilibre'
}
function normalizeActivityFocus(p,g){
 if(!p)return;
 var source=p.focus||p.activity,legacy=LEGACY_FOCUS[source]||LEGACY_FOCUS[p.activity];
 if(!p.focus)p.focus=legacy||(SIMPLE_FOCUS[source]?source:p.ageMonths<72?'Grandir':p.career&&p.career!=='Aucune'?'Carrière':'Équilibre');
 if(legacy&&(!p.focus||p.focus==='Grandir'&&p.ageMonths>=72))p.focus=legacy;
 if(p.ageMonths>=72&&p.focus==='Grandir')p.focus='Auto';
 if(p.focus!=='Grandir'&&!SIMPLE_FOCUS[p.focus])p.focus=p.ageMonths<72?'Grandir':p.career&&p.career!=='Aucune'?'Carrière':'Équilibre';
 if(LEGACY_FOCUS[p.activity]||SIMPLE_FOCUS[p.activity]||p.activity==='Navigation'&&!p.travel)p.activity=p.situation==='Carrière'?'Carrière':p.situation==='Formation'?'Formation':p.ageMonths<72?'Grandir':'Routine'
}
function currentFocus(){var p=game.player;if(p.focus==='Auto')return recommendedFocus();if(p.focus&&!(p.focus==='Grandir'&&p.ageMonths>=72))return p.focus;if(LEGACY_FOCUS[p.activity])return LEGACY_FOCUS[p.activity];if(SIMPLE_FOCUS[p.activity]&&p.activity!=='Auto')return p.activity;return p.ageMonths<72?'Grandir':p.career!=='Aucune'?'Carrière':'Équilibre'}

var PL={
'Loguetown':['East Blue',14,['Shells Town','Baratie','Reverse Mountain']],
'Shells Town':['East Blue',8,['Loguetown','Orange Town']],
'Orange Town':['East Blue',9,['Shells Town','Syrup Village']],
'Goa':['East Blue',10,['Shimotsuki','Syrup Village']],
'Shimotsuki':['East Blue',6,['Goa','Baratie']],
'Syrup Village':['East Blue',5,['Orange Town','Goa','Baratie']],
'Baratie':['East Blue',12,['Loguetown','Shimotsuki','Syrup Village']],
'Lvneel':['North Blue',12,['Flevance','Minion Island']],
'Flevance':['North Blue',20,['Lvneel','Minion Island']],
'Minion Island':['North Blue',22,['Flevance','Reverse Mountain']],
'Ohara':['West Blue',8,['Ilusia']],
'Ilusia':['West Blue',14,['Ohara','Reverse Mountain']],
'Baterilla':['South Blue',10,['Torino','Reverse Mountain']],
'Torino':['South Blue',16,['Baterilla']],
'Reverse Mountain':['Grand Line',32,['Loguetown','Minion Island','Ilusia','Baterilla','Twin Cape']],
'Twin Cape':['Grand Line',28,['Reverse Mountain','Whisky Peak']],
'Whisky Peak':['Grand Line',34,['Twin Cape','Little Garden']],
'Little Garden':['Grand Line',39,['Whisky Peak','Drum']],
'Drum':['Grand Line',32,['Little Garden','Alabasta']],
'Alabasta':['Grand Line',37,['Drum','Jaya']],
'Jaya':['Grand Line',43,['Alabasta','Water 7']],
'Water 7':['Grand Line',29,['Jaya','Thriller Bark']],
'Thriller Bark':['Grand Line',48,['Water 7','Sabaody']],
'Sabaody':['Grand Line',45,['Thriller Bark','Fish-Man Island']],
'Fish-Man Island':['Grand Line',44,['Sabaody','Punk Hazard']],
'Punk Hazard':['New World',66,['Fish-Man Island','Dressrosa']],
'Dressrosa':['New World',61,['Punk Hazard','Zou','Whole Cake Island']],
'Zou':['New World',52,['Dressrosa','Wano']],
'Whole Cake Island':['New World',78,['Dressrosa','Wano']],
'Wano':['New World',82,['Zou','Whole Cake Island','Egghead']],
'Egghead':['New World',68,['Wano']]};
var CH=[['Garp','Marine','East Blue',90],['Shanks','Pirates','East Blue',95],['Rayleigh','Pirates','Grand Line',92],['Mihawk','Indépendant','Grand Line',90],['Dragon','Révolutionnaires','Grand Line',98],['Kaido','Pirates','New World',99],['Big Mom','Pirates','New World',99],['Barbe Blanche','Pirates','New World',100]];

var ACTOR_TEMPLATES=[
 {name:'Garp',faction:'Marine',region:'East Blue',base:92,peak:97,growth:1,importance:98,goal:'Former la prochaine génération'},
 {name:'Shanks',faction:'Pirates',region:'East Blue',base:28,peak:96,growth:16,importance:100,goal:'Tracer sa propre route'},
 {name:'Rayleigh',faction:'Pirates',region:'Grand Line',base:95,peak:91,growth:22,importance:94,goal:'Observer la nouvelle ère'},
 {name:'Mihawk',faction:'Indépendant',region:'Grand Line',base:34,peak:94,growth:16,importance:96,goal:'Chercher des adversaires dignes'},
 {name:'Dragon',faction:'Révolutionnaires',region:'Grand Line',base:58,peak:98,growth:14,importance:100,goal:'Étendre le réseau révolutionnaire'},
 {name:'Kaido',faction:'Pirates',region:'New World',base:84,peak:99,growth:10,importance:99,goal:'Accroître sa domination'},
 {name:'Big Mom',faction:'Pirates',region:'New World',base:95,peak:99,growth:8,importance:99,goal:'Étendre son territoire'},
 {name:'Barbe Blanche',faction:'Pirates',region:'New World',base:100,peak:96,growth:22,importance:100,goal:'Protéger sa famille'}
];
var CONTENT=window.OPV1_CONTENT||{locations:{},actors:[],fruits:[],fruitAssignments:[],canonEvents:[],specialTechniques:[],localEvents:[]};
Object.keys(CONTENT.locations||{}).forEach(function(n){PL[n]=CONTENT.locations[n]});
Object.keys(PL).forEach(function(n){var routes=PL[n][2]||[];routes.forEach(function(d){if(PL[d]&&PL[d][2].indexOf(n)<0)PL[d][2].push(n)})});
if(CONTENT.actors&&CONTENT.actors.length)ACTOR_TEMPLATES=CONTENT.actors.slice();
var CANON_EVENTS=(CONTENT.canonEvents||[]).slice();
var SPECIAL_TECHNIQUES=(CONTENT.specialTechniques||[]).slice();
var LOCAL_EVENTS=(CONTENT.localEvents||[]).slice();
var FRUIT_ASSIGNMENTS=(CONTENT.fruitAssignments||[]).slice();
var FRUIT_INFO={};(CONTENT.fruits||[]).forEach(function(x){FRUIT_INFO[x[0]]={type:x[1],rarity:x[2]}});
function fruitMeta(n){return FRUIT_INFO[n]||{type:'Inconnu',rarity:70}}
function pickFruit(list){var total=0,weights=list.map(function(n){var m=fruitMeta(n),w=Math.max(2,108-(m.rarity||70));total+=w;return w}),r=R('fruit')*total;for(var i=0;i<list.length;i++){r-=weights[i];if(r<=0)return list[i]}return list[list.length-1]}
function specialRequirementMet(t,p){var q=t.requires||{};if(q.faction&&p.faction!==q.faction)return false;if(q.race&&p.race!==q.race)return false;if(q.style&&p.style!==q.style)return false;if(q.skill&&(p.skills[q.skill]||0)<(q.skillValue||0))return false;if(q.stat&&(p.stats[q.stat]||0)<(q.statValue||0))return false;return true}
function canonMonth(c){return(c.year||0)*12+(c.month||0)}
function initCanonState(w){
 var previous={};(w.canon||[]).forEach(function(c){if(Array.isArray(c))previous[c[0]]=c[2];else if(c&&c.title)previous[c.title]=c.status});
 var source=CANON_EVENTS.length?CANON_EVENTS:[{id:'roger-execution',year:0,month:0,title:'Exécution de Gol D. Roger',type:'anchor',resistance:100,location:'Loguetown',required:[],factions:['Marine','Pirates'],description:'La Grande Ère de la Piraterie commence.'}];
 w.canon=source.map(function(c){var x=Object.assign({},c);x.required=(c.required||[]).slice();x.factions=(c.factions||[]).slice();x.status=previous[x.title]||x.status||(canonMonth(x)===0?'completed':'future');return x});
 w.canonHistory=w.canonHistory||[];return w
}
function fruitAssignmentMonth(a){return(a.year||0)*12+(a.month||0)}
function syncCanonicalFruits(){
 var w=game.world,now=w.year*12+Math.floor(w.month);
 FRUIT_ASSIGNMENTS.forEach(function(a){
  if(now<fruitAssignmentMonth(a))return;
  var reg=w.fruitRegistry[a.fruit]||(w.fruitRegistry[a.fruit]={status:'available',holder:null}),actor=w.actors.find(function(x){return x.name===a.holder});
  if(actor&&actor.status==='dead'){
   if(reg.holder===a.holder){reg.status='available';reg.holder=null;news('Fruit réapparu',a.fruit+' réapparaît quelque part dans le monde après la mort de '+a.holder+'.','major')}
   return
  }
  if(reg.status==='available'||reg.status==='sold'){
   reg.status='consumed';reg.holder=a.holder;return
  }
  if(reg.holder!==a.holder&&!reg.canonBlocked){
   reg.canonBlocked=true;w.divergence=cl(w.divergence+2.5,0,100);news('Divergence liée à un Fruit',a.holder+' ne peut pas obtenir '+a.fruit+' car son état mondial a déjà changé.','war')
  }
 })
}function fruitMarketTick(){
 var w=game.world;Object.keys(w.fruitRegistry||{}).forEach(function(n){var r=w.fruitRegistry[n];if(r.status!=='sold')return;r.marketMonths=(r.marketMonths||0)+1;if(r.marketMonths>=3||R('fruit')<.16){r.status='available';r.holder=null;r.marketMonths=0}})
}
function releasePlayerFruits(){
 var p=game.player,w=game.world;if(p.fruit){var r=w.fruitRegistry[p.fruit]||(w.fruitRegistry[p.fruit]={status:'available',holder:null});if(r.holder===p.name||r.status==='consumed'){r.status='available';r.holder=null;r.canonBlocked=false;news('Fruit réapparu',p.fruit+' réapparaît quelque part après la mort de '+p.name+'.','major')}}
 if(p.heldFruit){var h=w.fruitRegistry[p.heldFruit]||(w.fruitRegistry[p.heldFruit]={status:'available',holder:null});if(h.holder===p.name||h.status==='held'){h.status='available';h.holder=null;h.canonBlocked=false}}
}

var REGION_LINKS={
 'East Blue':['Grand Line'],'North Blue':['Grand Line'],'West Blue':['Grand Line'],'South Blue':['Grand Line'],
 'Grand Line':['East Blue','North Blue','West Blue','South Blue','New World'],'New World':['Grand Line']
};
var CREW_A=['Crimson','Brume','Tempête','Écume','Cendre','Aube','Foudre','Corail','Marée','Fer','Sillage','Astre'];
var CREW_B=['Mantas','Ravens','Sharks','Drakes','Foxes','Wolves','Blades','Corsairs','Comets','Serpents','Bulls','Vultures'];
var WORLD_FACTIONS=['Civil','Marine','Pirates','Chasseur de primes','Révolutionnaires','Gouvernement'];
function det(g,k){return (H(String(g.seed||1)+':'+k)%100000)/100000}
function pairKey(a,b){return[a,b].sort().join('|')}
function initDiplomacy(){
 var d={};
 function set(a,b,v){d[pairKey(a,b)]=v}
 set('Marine','Gouvernement',78);set('Marine','Pirates',-90);set('Marine','Révolutionnaires',-58);set('Marine','Civil',28);set('Marine','Chasseur de primes',18);
 set('Gouvernement','Pirates',-96);set('Gouvernement','Révolutionnaires',-100);set('Gouvernement','Civil',16);set('Gouvernement','Chasseur de primes',12);
 set('Pirates','Révolutionnaires',4);set('Pirates','Civil',-22);set('Pirates','Chasseur de primes',-62);
 set('Révolutionnaires','Civil',14);set('Révolutionnaires','Chasseur de primes',-6);set('Civil','Chasseur de primes',22);
 return d
}
function territorySeed(g,name){
 var region=infStatic(name).region,r=det(g,'territory:'+name),controller='Civil';
 if(['East Blue','North Blue','West Blue','South Blue'].indexOf(region)>=0)controller=r<.56?'Marine':r<.88?'Civil':'Pirates';
 else if(region==='Grand Line')controller=r<.30?'Marine':r<.58?'Civil':r<.89?'Pirates':'Gouvernement';
 else controller=r<.56?'Pirates':r<.76?'Gouvernement':r<.90?'Civil':'Révolutionnaires';
 return{controller:controller,influence:Math.round(48+det(g,'influence:'+name)*34),stability:Math.round(38+det(g,'stability:'+name)*50),contested:false,lastChange:null}
}
function infStatic(n){var p=PL[n]||['East Blue',10,[]];return{region:p[0],danger:p[1],routes:p[2]}}
function makeWorldCrew(g,i){
 var alignment=det(g,'crew:f:'+i),f=alignment<.72?'Pirates':alignment<.87?'Chasseur de primes':'Révolutionnaires',
 region=REG[Math.floor(det(g,'crew:r:'+i)*REG.length)],name=CREW_A[Math.floor(det(g,'crew:a:'+i)*CREW_A.length)]+' '+CREW_B[Math.floor(det(g,'crew:b:'+i)*CREW_B.length)],
 c={id:'crew-'+i,name:name,faction:f,region:region,power:Math.round(14+det(g,'crew:p:'+i)*54),members:Math.round(4+det(g,'crew:m:'+i)*28),morale:Math.round(42+det(g,'crew:o:'+i)*48),bounty:f==='Pirates'?Math.round((8+det(g,'crew:q:'+i)*90)*1000000):0,status:'active',ageMonths:Math.round(det(g,'crew:age:'+i)*90),victories:0,defeats:0,intention:null,intentionMonths:0,resources:Math.round(35+det(g,'crew:res:'+i)*50),lastIntentOutcome:null};
 seedWorldCrewLife(g,c,i);return c
}
function initLivingWorld(g,w){
 w.factions=w.factions||{};if(w.factions.Civil==null)w.factions.Civil=62;if(w.factions['Chasseur de primes']==null)w.factions['Chasseur de primes']=44;
 w.diplomacy=w.diplomacy||initDiplomacy();w.pressures=w.pressures||{};REG.forEach(function(r){if(!w.pressures[r])w.pressures[r]={Piraterie:20+det(g,'pressure:p:'+r)*25,Marine:30+det(g,'pressure:m:'+r)*35,Criminalité:15+det(g,'pressure:c:'+r)*30,Révolution:5+det(g,'pressure:r:'+r)*20,Prospérité:40+det(g,'pressure:o:'+r)*35,Instabilité:10+det(g,'pressure:i:'+r)*25}});
 w.territories=w.territories||{};Object.keys(PL).forEach(function(n){if(!w.territories[n])w.territories[n]=territorySeed(g,n)});
 var aliases={'Garp':'Monkey D. Garp','Rayleigh':'Silvers Rayleigh','Mihawk':'Dracule Mihawk','Dragon':'Monkey D. Dragon','Big Mom':'Charlotte Linlin','Barbe Blanche':'Edward Newgate'};var existing={};(w.actors||[]).forEach(function(a){existing[aliases[a.name]||a.name]=a});w.actors=ACTOR_TEMPLATES.map(function(a,i){var x=existing[a.name]||{};x.name=a.name;x.faction=a.faction;x.region=x.region||a.region;x.startRegion=a.region;x.base=a.base;x.peak=a.peak;x.growth=a.growth;x.importance=a.importance;x.goal=a.goal;x.birthYear=a.birthYear==null?-20:a.birthYear;x.activeFrom=a.activeFrom==null?0:a.activeFrom;x.status=x.status||(w.year>=x.activeFrom?'active':'inactive');if(x.status==='active'&&w.year<x.activeFrom)x.status='inactive';x.woundMonths=x.woundMonths||0;x.influence=x.influence==null?Math.round(60+det(g,'actor:i:'+i)*35):x.influence;x.actions=x.actions||0;x.momentum=cl(x.momentum||0,-8,12);x.intention=x.intention||null;x.intentionMonths=Math.max(0,x.intentionMonths||0);x.lastIntentOutcome=x.lastIntentOutcome||null;return x});
 w.crews=w.crews||Array.from({length:10},function(_,i){return makeWorldCrew(g,i)});w.crews.forEach(function(c,i){c.intention=c.intention||null;c.intentionMonths=Math.max(0,c.intentionMonths||0);c.resources=cl(c.resources==null?Math.round(35+det(g,'crew:mig:res:'+i)*50):c.resources,0,100);c.lastIntentOutcome=c.lastIntentOutcome||null});
 w.conflicts=w.conflicts||[];w.worldHistory=w.worldHistory||[];w.npcLinks=Array.isArray(w.npcLinks)?w.npcLinks.slice(-25):[];w.simRemainder=w.simRemainder||0;w.nextCrewId=w.nextCrewId||w.crews.length;w.globalTension=w.globalTension==null?34:w.globalTension;
 var fruitNames=(CONTENT.fruits||[]).map(function(x){return x[0]});w.fruits=[].concat(w.fruits||[],fruitNames).filter(function(v,i,a){return a.indexOf(v)===i});w.fruitRegistry=w.fruitRegistry||{};
 w.fruits.forEach(function(n){if(!w.fruitRegistry[n])w.fruitRegistry[n]={status:'available',holder:null}});
 initCanonState(w);migrateWorldFoundations(g,w);return w
}
function migrateWorldFoundations(g,w){
 w.worldState=w.worldState||{version:1,seq:0,actorHistory:[],territoryHistory:[],monthlyChanges:[],actorGoals:{}};
 var ws=w.worldState;ws.version=1;ws.seq=ws.seq||0;ws.actorHistory=Array.isArray(ws.actorHistory)?ws.actorHistory.slice(0,60):[];ws.territoryHistory=Array.isArray(ws.territoryHistory)?ws.territoryHistory.slice(0,55):[];ws.monthlyChanges=Array.isArray(ws.monthlyChanges)?ws.monthlyChanges.slice(0,24):[];ws.actorGoals=ws.actorGoals||{};ws.goalHistory=Array.isArray(ws.goalHistory)?ws.goalHistory.slice(0,40):[];ws.canonCausality=Array.isArray(ws.canonCausality)?ws.canonCausality.slice(0,80):[];ws.canonBranches=Array.isArray(ws.canonBranches)?ws.canonBranches.filter(function(x){return x&&x.status==='active'}).slice(0,50):[];ws.canonBranchHistory=Array.isArray(ws.canonBranchHistory)?ws.canonBranchHistory.slice(0,60):[];ws.playerCanonImpact=Array.isArray(ws.playerCanonImpact)?ws.playerCanonImpact.slice(0,60):[];ws.worldSagas=Array.isArray(ws.worldSagas)?ws.worldSagas.filter(function(x){return x&&x.status==='active'}).slice(0,32):[];ws.sagaCooldowns=ws.sagaCooldowns||{};ws.sagaHistory=Array.isArray(ws.sagaHistory)?ws.sagaHistory.slice(0,45):[];ws.crewGoals=ws.crewGoals||{};var liveCrewGoals={};(w.crews||[]).forEach(function(c){if(ws.crewGoals[c.id])liveCrewGoals[c.id]=ws.crewGoals[c.id]});ws.crewGoals=liveCrewGoals;ws.factionGoals=ws.factionGoals||{};ws.geopoliticalHistory=Array.isArray(ws.geopoliticalHistory)?ws.geopoliticalHistory.slice(0,60):[];ws.crewHistory=Array.isArray(ws.crewHistory)?ws.crewHistory.slice(0,40):[];ws.crewArchive=Array.isArray(ws.crewArchive)?ws.crewArchive.slice(0,6):[];(w.crews||[]).forEach(function(c){normalizeWorldCrew(c,g)});
 (w.actors||[]).forEach(function(a){var goal=ws.actorGoals[a.name]||{};goal.primary=goal.primary||a.goal||'Tracer sa route';goal.progress=cl(goal.progress||0,0,100);goal.stage=goal.stage||'pursuing';delete goal.lastAction;delete goal.lastOutcome;goal.updatedAt=goal.updatedAt||0;ws.actorGoals[a.name]=goal;try{delete a.worldGoal;Object.defineProperty(a,'worldGoal',{value:goal,writable:true,configurable:true,enumerable:false})}catch(x){a.worldGoal=goal}});
 Object.keys(w.territories||{}).forEach(function(n){var t=w.territories[n],key='territory:'+n,snap={controller:t.controller,contested:!!t.contested,stability:Math.round(t.stability||0),influence:Math.round(t.influence||0)};try{delete ws[key];Object.defineProperty(ws,key,{value:snap,writable:true,configurable:true,enumerable:false})}catch(x){ws[key]=snap}});installWorldSerializer(w);return w
}
function nextActorWorldGoal(a,goal){
 var fp=actorRegionalFootprint(a),power=actorPower(a),pool=[];
 if(a.faction==='Pirates'){if(fp.friendly<2)pool.push('Étendre son influence sur les mers');if(power>=65)pool.push('S’imposer face aux grandes puissances');pool.push('Renforcer son équipage et sa réputation')}
 else if(a.faction==='Marine'){if(fp.hostile||fp.contested)pool.push('Rétablir l’ordre dans sa zone');if(power>=68)pool.push('Peser sur l’équilibre mondial');pool.push('Renforcer l’autorité de la Marine')}
 else if(a.faction==='Révolutionnaires'){pool.push('Étendre le réseau révolutionnaire');if(fp.hostile)pool.push('Affaiblir une puissance hostile');if(power>=65)pool.push('Modifier durablement l’équilibre politique')}
 else if(a.faction==='Gouvernement'){pool.push('Consolider l’influence du Gouvernement');if(fp.contested)pool.push('Neutraliser les foyers d’instabilité');if(power>=70)pool.push('Préserver l’ordre mondial')}
 else{pool.push('Dépasser ses limites','Tracer une nouvelle route','Affronter un défi à sa mesure')}
 var previous=goal&&goal.primary||'';pool=pool.filter(function(x){return x!==previous});return pool.length?pool[Math.floor(R('world')*pool.length)]:(a.goal||'Tracer sa route')
}
function completeActorWorldGoal(a,goal){
 var ws=game.world.worldState,old=goal.primary||a.goal||'Tracer sa route';goal.completed=(goal.completed||0)+1;goal.lastCompleted=old;goal.primary=nextActorWorldGoal(a,goal);goal.progress=Math.min(18,4+goal.completed*2);goal.stage='pursuing';goal.updatedAt=game.world.year*12+game.world.month;
 ws.goalHistory=Array.isArray(ws.goalHistory)?ws.goalHistory:[];ws.goalHistory.unshift({seq:++ws.seq,year:game.world.year,month:game.world.month,actor:a.name,faction:a.faction,completed:old,next:goal.primary});ws.goalHistory=ws.goalHistory.slice(0,40);
 if(a.importance>=96)news(a.name+' franchit un cap',old+' devient un jalon de sa trajectoire. Nouvel objectif : '+goal.primary+'.','major')
}
function recordWorldActorAction(a,intent,outcome,impact){
 var ws=game.world.worldState;if(!ws)return;var goal=ws.actorGoals[a.name]||(ws.actorGoals[a.name]={primary:a.goal||'Tracer sa route',progress:0,stage:'pursuing'}),gain=Math.max(0,impact==null?2:impact);
 goal.progress=cl((goal.progress||0)+gain,0,100);goal.stage=goal.progress>=100?'established':goal.progress>=65?'advancing':'pursuing';if(goal.progress>=100)completeActorWorldGoal(a,goal);goal.updatedAt=game.world.year*12+game.world.month;a.worldGoal=goal;
 if(a.faction&&a.faction!=='Indépendant')updateCollectiveGoal(factionWorldGoal(a.faction),gain*.05);
 ws.actorHistory.unshift({seq:++ws.seq,year:game.world.year,month:game.world.month,actor:a.name,faction:a.faction,region:a.region,intent:intent||'',outcome:outcome||'',impact:gain,goalProgress:Math.round(goal.progress)});ws.actorHistory=ws.actorHistory.slice(0,60)
}
function snapshotWorldTerritories(){
 var w=game.world,ws=w.worldState;if(!ws)return;var changed=[];Object.keys(w.territories).forEach(function(n){var t=w.territories[n],key='territory:'+n,prev=ws[key],now={controller:t.controller,contested:!!t.contested,stability:Math.round(t.stability||0),influence:Math.round(t.influence||0)};if(prev&&(prev.controller!==now.controller||prev.contested!==now.contested||Math.abs(prev.stability-now.stability)>=12)){changed.push({name:n,from:prev.controller,to:now.controller,contested:now.contested,stability:now.stability});if(now.stability-prev.stability>=12)updateCollectiveGoal(factionWorldGoal(now.controller),.8);var cause=t.lastWorldCause||'ambient';ws.territoryHistory.unshift({seq:++ws.seq,year:w.year,month:w.month,name:n,from:prev.controller,to:now.controller,contested:now.contested,stability:now.stability,cause:cause});if(prev.controller!==now.controller)recordGeopoliticalShift(n,cause,prev.controller,now.controller);t.lastWorldCause=null}ws[key]=now});
 ws.territoryHistory=ws.territoryHistory.slice(0,55);if(changed.length){ws.monthlyChanges.unshift({year:w.year,month:w.month,type:'territory',items:changed.slice(0,5)});ws.monthlyChanges=ws.monthlyChanges.slice(0,24)}
}
function worldCrewPersonName(g,c,key){
 var first=['Mira','Doran','Seline','Rook','Nessa','Toma','Ari','Noa','Kaï','Lina','Eden','Sora','Maël','Kellan','Yuna','Senn','Iria','Milo','Rin','Vale'],last=['Vane','Rook','Dale','Reef','Crow','Vale','Drake','Stone','Ray','Dawn','Gale','Moor'];
 return first[Math.floor(det(g,'crew-person:'+c.id+':'+key)*first.length)]+' '+last[Math.floor(det(g,'crew-person-last:'+c.id+':'+key)*last.length)]
}
function seedWorldCrewLife(g,c,i){
 if(c.leader)return c;var leader=worldCrewPersonName(g,c,'leader'),second=worldCrewPersonName(g,c,'second'),specs=['Combat','Navigation','Médecine','Discrétion','Commandement'];
 c.generation=c.generation||1;c.parentCrewId=c.parentCrewId||null;c.foundedBy=c.foundedBy||leader;c.leader={name:leader,power:cl(c.power+6+Math.round(det(g,'crew-leader:'+i)*12),10,100),loyalty:78,tenureMonths:c.ageMonths||0,status:'active',role:'Leader'};c.second={name:second,power:cl(c.power-2+Math.round(det(g,'crew-second:'+i)*10),8,96),loyalty:65,tenureMonths:Math.round((c.ageMonths||0)*.7),status:'active',role:'Bras droit'};
 c.notables=[];for(var n=0;n<Math.min(2,Math.max(1,Math.floor((c.members||4)/10)+1));n++)c.notables.push({id:c.id+'-n'+n,name:worldCrewPersonName(g,c,'n'+n),role:specs[Math.floor(det(g,'crew-spec:'+i+':'+n)*specs.length)],power:cl(c.power-8+Math.round(det(g,'crew-np:'+i+':'+n)*14),6,92),loyalty:45+Math.round(det(g,'crew-nl:'+i+':'+n)*40),status:'active'});
 c.cohesion=c.cohesion==null?cl(48+(c.morale-50)*.55,20,92):c.cohesion;c.legacy=c.legacy||{successions:0,splinters:0,recruits:0,departures:0,peakPower:c.power||0,peakMembers:c.members||0};c.history=Array.isArray(c.history)?c.history.slice(0,16):[];c.returnAtMonth=c.returnAtMonth||null;return c
}
function normalizeWorldCrew(c,gOverride){
 if(!c)return c;var g=gOverride||game||{seed:1};if(!c.leader)seedWorldCrewLife(g,c,Math.abs(H(c.id||c.name))%100000);c.generation=c.generation||1;c.notables=Array.isArray(c.notables)?c.notables.slice(0,c.status==='active'?2:0):[];c.cohesion=cl(c.cohesion==null?50:c.cohesion,0,100);c.legacy=c.legacy||{successions:0,splinters:0,recruits:0,departures:0,peakPower:c.power||0,peakMembers:c.members||0};['successions','splinters','recruits','departures'].forEach(function(k){c.legacy[k]=c.legacy[k]||0});c.legacy.peakPower=Math.max(c.legacy.peakPower||0,c.power||0);c.legacy.peakMembers=Math.max(c.legacy.peakMembers||0,c.members||0);c.history=Array.isArray(c.history)?c.history.slice(0,c.status==='active'?3:0):[];if(c.status!=='active'){c.second=null;c.intention=null;c.intentionMonths=0}return c
}
function crewHistory(c,type,text){
 normalizeWorldCrew(c);c.history.unshift({year:game.world.year,month:Math.floor(game.world.month),type:type,text:text});c.history=c.history.slice(0,c.status==='active'?3:0);return c
}
function compactWorldCrewMemory(){
 var w=game.world,ws=w.worldState||(w.worldState={}),active=[],inactive=[];ws.crewArchive=Array.isArray(ws.crewArchive)?ws.crewArchive:[];
 (w.crews||[]).forEach(function(c){normalizeWorldCrew(c);if(c.status==='active')active.push(c);else inactive.push(c)});
 inactive.forEach(function(c){var a={id:c.id,name:c.name,faction:c.faction,region:c.region,status:c.status,generation:c.generation||1,parentCrewId:c.parentCrewId||null,foundedBy:c.foundedBy||null,leaderName:c.leader&&c.leader.name||null,peakPower:Math.round(c.legacy&&c.legacy.peakPower||c.power||0),peakMembers:c.legacy&&c.legacy.peakMembers||c.members||0,successions:c.legacy&&c.legacy.successions||0,splinters:c.legacy&&c.legacy.splinters||0};ws.crewArchive=ws.crewArchive.filter(function(x){return x.id!==a.id});ws.crewArchive.unshift(a)});
 ws.crewArchive=ws.crewArchive.slice(0,10);w.crews=active;return w.crews
}
function worldCrewLeadership(c){
 normalizeWorldCrew(c);var leader=c.leader&&c.leader.status==='active'?c.leader:null,second=c.second&&c.second.status==='active'?c.second:null,bench=(c.notables||[]).filter(function(x){return x.status==='active'}).sort(function(a,b){return(b.power+b.loyalty*.18)-(a.power+a.loyalty*.18)});return leader||second||bench[0]||null
}
function promoteWorldCrewLeader(c,reason){
 normalizeWorldCrew(c);var old=c.leader,choices=[];if(c.second&&c.second.status==='active')choices.push(c.second);(c.notables||[]).filter(function(x){return x.status==='active'}).forEach(function(x){choices.push(x)});if(!choices.length)return false;
 choices.sort(function(a,b){return(b.power+b.loyalty*.22)-(a.power+a.loyalty*.22)});var next=choices[0];if(c.second===next)c.second=null;else c.notables=c.notables.filter(function(x){return x!==next});if(old&&old.status==='active')old.status='left';next.role='Leader';next.tenureMonths=0;c.leader=next;c.generation=(c.generation||1)+1;c.legacy.successions++;c.cohesion=cl(c.cohesion-5+next.loyalty*.05,0,100);crewHistory(c,'succession',(old?old.name:'Un ancien chef')+' cède la direction à '+next.name+(reason?' après '+reason:'')+'.');recordWorldCrewAction(c,'Succession',next.name+' prend la tête de '+c.name+'.',3.2);return true
}
function recruitWorldCrewNotable(c){
 normalizeWorldCrew(c);if(c.notables.length>=2)return null;var idx=(c.legacy.recruits||0)+c.notables.length+1,n={id:c.id+'-r'+idx,name:worldCrewPersonName(game,c,'recruit-'+idx),role:pk(['Combat','Navigation','Médecine','Discrétion','Commandement'],'world'),power:cl(c.power-10+R('world')*18,6,94),loyalty:42+R('world')*42,months:0,status:'active'};c.notables.push(n);c.legacy.recruits++;crewHistory(c,'recruit',n.name+' rejoint les figures importantes du groupe comme '+n.role+'.');return n
}
function spawnCrewSplinter(c){
 normalizeWorldCrew(c);var candidates=(c.notables||[]).filter(function(x){return x.status==='active'&&x.loyalty<58}).sort(function(a,b){return a.loyalty-b.loyalty});if(!candidates.length&&c.second&&c.second.status==='active'&&c.second.loyalty<55)candidates=[c.second];if(!candidates.length)return null;var rebel=candidates[0],id='crew-split-'+c.id+'-'+Math.floor(game.world.year*12+game.world.month),name=rebel.name.split(' ')[0]+' '+CREW_B[Math.floor(R('world')*CREW_B.length)],share=Math.max(2,Math.min(Math.floor((c.members||4)*.35),6+Math.floor(R('world')*5))),nc={id:id,name:name,faction:c.faction,region:c.region,power:cl((c.power||20)-6+R('world')*9,8,92),members:share,morale:cl(45+R('world')*28,20,88),bounty:c.faction==='Pirates'?Math.round((c.bounty||0)*.22):0,status:'active',ageMonths:0,victories:0,defeats:0,intention:null,intentionMonths:0,resources:cl((c.resources||30)*.28,8,55),lastIntentOutcome:'né d’une scission de '+c.name,generation:(c.generation||1)+1,parentCrewId:c.id,foundedBy:rebel.name,leader:{name:rebel.name,power:rebel.power,loyalty:72,tenureMonths:0,status:'active',role:'Leader'},second:null,notables:[],cohesion:54,legacy:{successions:0,splinters:0,recruits:0,departures:0,peakPower:c.power||0,peakMembers:share},history:[]};
 c.members=Math.max(2,(c.members||4)-share);c.cohesion=cl(c.cohesion-12,0,100);c.morale=cl(c.morale-8,0,100);rebel.status='left';c.legacy.splinters++;crewHistory(c,'splinter',rebel.name+' quitte '+c.name+' avec '+share+' membres pour fonder '+name+'.');crewHistory(nc,'founding',name+' naît d’une scission de '+c.name+'.');game.world.crews.push(nc);recordWorldCrewAction(c,'Scission',name+' se sépare de '+c.name+'.',4);rememberCausalMemory('crew',name+' naît de '+c.name,66,{kind:'crew',crewId:nc.id,parentCrewId:c.id,region:c.region},'crew-split:'+nc.id);return nc
}
function worldCrewInternalTick(c){
 normalizeWorldCrew(c);if(c.status!=='active')return;c.cohesion=cl(c.cohesion+(c.morale-50)*.006+(R('world')-.5)*.7,0,100);if(c.leader&&c.leader.status==='active')c.leader.tenureMonths=(c.leader.tenureMonths||0)+1;if(c.second&&c.second.status==='active')c.second.tenureMonths=(c.second.tenureMonths||0)+1;
 (c.notables||[]).forEach(function(n){if(n.status!=='active')return;n.power=cl(n.power+.015+R('world')*.055,1,96);n.loyalty=cl(n.loyalty+(c.cohesion-50)*.005+(R('world')-.5)*.5,0,100)});
 if((c.members||0)>=10&&c.notables.length<Math.min(2,Math.ceil(c.members/10))&&R('world')<.015)recruitWorldCrewNotable(c);
 var activeNotables=(c.notables||[]).filter(function(n){return n.status==='active'});if(activeNotables.length&&c.cohesion<28&&c.morale<34&&R('world')<.012){var gone=activeNotables.sort(function(a,b){return a.loyalty-b.loyalty})[0];gone.status='left';c.members=Math.max(2,(c.members||3)-1);c.legacy.departures++;crewHistory(c,'departure',gone.name+' quitte le groupe après une longue crise interne.')}
 if((c.members||0)>=10&&c.cohesion<22&&c.morale<30&&R('world')<.008)spawnCrewSplinter(c);
 if(c.leader&&c.leader.status==='active'&&c.ageMonths>72&&R('world')<.0015+Math.max(0,35-c.morale)/15000){c.leader.status=R('world')<.35?'dead':'left';var cause=c.leader.status==='dead'?'la disparition du leader':'le départ du leader';if(!promoteWorldCrewLeader(c,cause)){c.status='dissolved';crewHistory(c,'dissolution',c.name+' se dissout faute de succession crédible.')}}
 c.legacy.peakPower=Math.max(c.legacy.peakPower||0,c.power||0);c.legacy.peakMembers=Math.max(c.legacy.peakMembers||0,c.members||0)
}
function crewWorldGoal(c){
 var ws=game.world.worldState,g=ws.crewGoals[c.id];if(g){g.scope='crew';g.owner=c.id;g.faction=c.faction;return g}var primary=c.faction==='Pirates'?'Gagner en réputation et étendre sa zone':c.faction==='Révolutionnaires'?'Étendre son réseau et affaiblir le pouvoir':'Accumuler ressources et contrats';return ws.crewGoals[c.id]={primary:primary,progress:0,stage:'pursuing',completed:0,scope:'crew',owner:c.id,faction:c.faction}
}
function factionWorldGoal(f){
 var ws=game.world.worldState,g=ws.factionGoals[f];if(g){g.scope='faction';g.owner=f;g.faction=f;return g}var labels={Pirates:'Étendre la présence pirate',Marine:'Stabiliser les mers',Révolutionnaires:'Affaiblir le Gouvernement',Gouvernement:'Préserver l’ordre mondial',Civil:'Maintenir prospérité et stabilité','Chasseur de primes':'Profiter des zones à forte criminalité'};return ws.factionGoals[f]={primary:labels[f]||'Étendre son influence',progress:0,stage:'pursuing',completed:0,scope:'faction',owner:f,faction:f}
}
function nextCollectiveGoal(g){
 var pools={Pirates:['Étendre la présence pirate','Contester les grandes routes','Faire émerger de nouvelles puissances pirates'],Marine:['Stabiliser les mers','Réduire les foyers de piraterie','Sécuriser les grandes routes'],Révolutionnaires:['Affaiblir le Gouvernement','Étendre les réseaux révolutionnaires','Déclencher des bascules locales'],Gouvernement:['Préserver l’ordre mondial','Consolider les territoires stratégiques','Neutraliser les réseaux hostiles'],Civil:['Maintenir prospérité et stabilité','Sécuriser les échanges','Reconstruire les zones fragiles'],'Chasseur de primes':['Profiter des zones à forte criminalité','Réduire les équipages recherchés','Étendre les réseaux de chasse']},pool;
 if(g.scope==='crew'){var c=game.world.crews.find(function(x){return x.id===g.owner}),f=c&&c.faction||g.faction;if(f==='Pirates')pool=['Gagner en réputation et étendre sa zone','Accumuler ressources et butin','Recruter et renforcer l’équipage'];else if(f==='Révolutionnaires')pool=['Étendre son réseau et affaiblir le pouvoir','Créer des relais clandestins','Soutenir une zone contestée'];else if(f==='Chasseur de primes')pool=['Accumuler ressources et contrats','Traquer des cibles plus dangereuses','Étendre son réseau de chasse'];else pool=['Accumuler ressources et contrats','Renforcer ses effectifs','Étendre son influence locale']}
 else pool=pools[g.owner]||['Étendre son influence','Consolider ses acquis','Réagir aux nouvelles tensions'];
 var old=g.primary||'',choices=pool.filter(function(x){return x!==old});return choices.length?choices[Math.floor(R('world')*choices.length)]:old
}
function updateCollectiveGoal(g,delta){
 g.progress=cl((g.progress||0)+Math.max(0,delta||0),0,100);g.stage=g.progress>=70?'advancing':'pursuing';if(g.progress>=100){var old=g.primary||'',ws=game.world.worldState;g.completed=(g.completed||0)+1;g.lastCompleted=old;g.primary=nextCollectiveGoal(g);g.progress=8+Math.min(10,g.completed*1.5);g.stage='pursuing';g.updatedAt=game.world.year*12+game.world.month;var label=g.scope==='crew'?((game.world.crews.find(function(x){return x.id===g.owner})||{}).name||g.owner):g.owner;ws.goalHistory=Array.isArray(ws.goalHistory)?ws.goalHistory:[];ws.goalHistory.unshift({seq:++ws.seq,year:game.world.year,month:game.world.month,actor:label,faction:g.faction||g.owner,scope:g.scope||'collective',completed:old,next:g.primary});ws.goalHistory=ws.goalHistory.slice(0,60)}return g
}
function updateFactionWorldGoals(){
 var fs=['Pirates','Marine','Révolutionnaires','Gouvernement','Civil','Chasseur de primes'];fs.forEach(function(f){var g=factionWorldGoal(f);g.progress=cl(g.progress||0,0,100);g.stage=g.progress>=70?'advancing':'pursuing'})
}
function recordGeopoliticalShift(name,cause,from,to){
 var ws=game.world.worldState;if(!ws)return;ws.geopoliticalHistory.unshift({seq:++ws.seq,year:game.world.year,month:game.world.month,name:name,cause:cause||'world',from:from,to:to});ws.geopoliticalHistory=ws.geopoliticalHistory.slice(0,60);
 if(to&&to!==from)updateCollectiveGoal(factionWorldGoal(to),2.5);if(from&&from!==to){var lost=factionWorldGoal(from);lost.progress=cl((lost.progress||0)-1,0,100);lost.stage=lost.progress>=70?'advancing':'pursuing'}
 if(from&&to&&from!==to&&String(cause||'').indexOf('war:')!==0&&String(cause||'')!=='ambient'&&game.world.globalTension>=45&&R('world')<.10)startWorldSaga('power',infStatic(name).region,from,to,'shift:'+name+':'+ws.seq)
}
function recordWorldCrewAction(c,intent,outcome,impact){
 var ws=game.world.worldState;if(!ws)return;var goal=crewWorldGoal(c),affinity=intent==='Revendiquer une zone'?3:intent==='Étendre son réseau'?2.4:intent==='Chercher un affrontement'?1.6:1;updateCollectiveGoal(goal,(impact||1)*affinity);
 var factionAffinity=intent==='Revendiquer une zone'?1.5:intent==='Étendre son réseau'?1.2:intent==='Traquer une cible'?1:.35;updateCollectiveGoal(factionWorldGoal(c.faction),(impact||1)*factionAffinity*.18);
 ws.crewHistory=Array.isArray(ws.crewHistory)?ws.crewHistory:[];ws.crewHistory.unshift({seq:++ws.seq,year:game.world.year,month:game.world.month,crew:c.id,name:c.name,faction:c.faction,region:c.region,intent:intent||'',outcome:outcome||'',impact:impact||1});ws.crewHistory=ws.crewHistory.slice(0,40)
}
function actorRegionalFootprint(a){
 var w=game.world,names=Object.keys(w.territories).filter(function(n){return infStatic(n).region===a.region}),friendly=names.filter(function(n){return w.territories[n].controller===a.faction}),hostile=names.filter(function(n){var t=w.territories[n];return t.controller!==a.faction&&diplomacy(a.faction,t.controller)<-25}),crews=w.crews.filter(function(c){return c.status==='active'&&c.region===a.region&&c.faction===a.faction});
 return{territories:names.length,friendly:friendly.length,hostile:hostile.length,alliedCrews:crews.length,contested:names.filter(function(n){return w.territories[n].contested}).length}
}
function propagateActorWorldImpact(a,intent){
 var w=game.world,fp=actorRegionalFootprint(a),powerFactor=actorPower(a)/100,goal=a.worldGoal||{},impact=1;
 if(intent==='Étendre son influence'){var targets=Object.keys(w.territories).filter(function(n){var t=w.territories[n];return infStatic(n).region===a.region&&t.controller!==a.faction});if(targets.length){var name=targets.sort(function(x,y){return w.territories[x].stability-w.territories[y].stability})[0],t=w.territories[name];t.stability=cl(t.stability-(1.5+powerFactor*2.5),0,100);t.lastWorldCause='actor:'+a.name;t.contested=t.contested||t.stability<35;if(diplomacy(a.faction,t.controller)<-30&&actorPower(a)>=62&&t.stability<34&&R('world')<.18+powerFactor*.16)spawnConflict(name,a.faction,t.controller,32+actorPower(a)*.42,'actor:'+a.name);impact=3+fp.hostile*.25}}
 else if(intent==='Sécuriser sa région'){Object.keys(w.territories).filter(function(n){return infStatic(n).region===a.region&&w.territories[n].controller===a.faction}).slice(0,3).forEach(function(n){var t=w.territories[n];t.stability=cl(t.stability+1+powerFactor*2,0,100);t.lastWorldCause='actor:'+a.name;t.influence=cl(t.influence+.5+powerFactor,0,100)});impact=2+fp.friendly*.18}
 else if(intent==='Consolider ses alliances'){var crews=w.crews.filter(function(c){return c.status==='active'&&c.region===a.region&&c.faction===a.faction});if(crews.length){var c=crews.sort(function(x,y){return y.power-x.power})[0];c.morale=cl(c.morale+2+powerFactor*3,0,100);c.resources=cl(c.resources+1+powerFactor*2,0,100)}impact=2+fp.alliedCrews*.2}
 else if(intent==='Chercher un affrontement')impact=2.5;
 else if(intent==='S’entraîner')impact=1.4;
 else if(intent==='Voyager')impact=1.2;
 if(goal.progress>=65)impact*=1.12;return impact
}
function sagaKey(type,region,a,b){return[type,region||'Monde',[a||'',b||''].sort().join('|')].join(':')}
function startWorldSaga(type,region,a,b,source){
 var w=game.world,ws=w.worldState;if(!ws)return null;ws.worldSagas=ws.worldSagas||[];var key=sagaKey(type,region,a,b),existing=ws.worldSagas.find(function(x){return x.status==='active'&&x.key===key});if(existing){if(source&&existing.lastPressureSource!==source){existing.pressure=cl(existing.pressure+3,0,100);existing.lastPressureSource=source}return existing}
 if(type==='rivalry'){var now=w.year*12+w.month,recent=(ws.sagaHistory||[]).find(function(x){return x.key===key&&now-((x.year||0)*12+(x.month||0))<84});if(recent)return null}
 var titles={war:'Guerre pour '+region,rivalry:'Rivalité de '+region,canon:'Chronologie brisée à '+region,power:'Lutte d’influence à '+region},basePressure=type==='war'?38:type==='canon'?34:type==='rivalry'?30:28,saga={id:'saga-'+(++ws.seq),key:key,type:type,region:region||null,a:a||null,b:b||null,source:source||'world',lastPressureSource:source||'world',title:titles[type]||'Crise de '+region,status:'active',stage:'Tensions',pressure:basePressure,months:0,startedYear:w.year,startedMonth:w.month,events:0};
 ws.worldSagas.unshift(saga);ws.worldSagas=ws.worldSagas.slice(0,32);return saga
}
function strategicWarSaga(war){
 if(!war)return null;return startWorldSaga('war',war.region,war.attacker,war.defender,war.id)
}
function resolveWorldSaga(saga,outcome){
 var w=game.world,ws=w.worldState;saga.status='resolved';saga.outcome=outcome;saga.resolvedYear=w.year;saga.resolvedMonth=w.month;ws.sagaHistory.unshift({seq:++ws.seq,id:saga.id,key:saga.key,title:saga.title,type:saga.type,region:saga.region,outcome:outcome,months:saga.months,year:w.year,month:w.month,playerInvolved:!!saga.playerInvolved,playerFaction:saga.playerFaction||null,playerPeakPower:saga.playerPeakPower||0,playerPresenceMonths:saga.playerPresenceMonths||0,playerRole:saga.playerRole||'present',playerImpact:Math.round((saga.playerImpact||0)*10)/10,playerResponsible:!!saga.playerResponsible,playerCausalMissions:saga.playerCausalMissions||0,playerSources:(saga.playerSources||[]).slice(-8)});ws.sagaHistory=ws.sagaHistory.slice(0,45);if(saga.pressure>=70)news('Fin de saga : '+saga.title,outcome==='rupture'?'La crise redessine durablement les rapports de force.':'Un nouvel équilibre se forme après des mois de confrontation.','major')
}
function discoverWorldSagas(){
 var w=game.world,ws=w.worldState;if(!ws)return;
 (w.wars||[]).filter(function(x){return x.status==='active'}).forEach(function(x){startWorldSaga('war',x.region,x.attacker,x.defender,x.id)});
 (ws.canonBranches||[]).filter(function(x){return x.status==='active'&&x.pressure>=45}).forEach(function(x){var s=startWorldSaga('canon',x.region,(x.factions||[])[0],(x.factions||[])[1],x.id),now=w.year*12+w.month,impact=(ws.playerCanonImpact||[]).find(function(r){return r.eventId===x.source&&now-((r.year||0)*12+(r.month||0))<=24});if(s&&impact){var major=impact.kind==='major';s.playerInvolved=true;s.playerRole=major?'responsible':'participant';s.playerResponsible=major;s.playerImpact=Math.max(s.playerImpact||0,major?60:26);s.playerFaction=impact.faction||s.playerFaction||null;s.playerPeakPower=Math.max(s.playerPeakPower||0,impact.power||0);s.playerSources=Array.isArray(s.playerSources)?s.playerSources:[];var src='canon:'+x.source;if(s.playerSources.indexOf(src)<0)s.playerSources.push(src);s.playerSources=s.playerSources.slice(-8)}});
 REG.forEach(function(region){var cd=ws.sagaCooldowns[region]||0;if(cd>0){ws.sagaCooldowns[region]=cd-1;return}if((ws.worldSagas||[]).some(function(s){return s.status==='active'&&s.region===region&&s.type==='rivalry'}))return;var actors=w.actors.filter(function(a){return a.status==='active'&&a.region===region&&actorPower(a)>=55}).sort(function(a,b){return actorPower(b)-actorPower(a)}).slice(0,4);for(var i=0;i<actors.length;i++)for(var j=i+1;j<actors.length;j++){var hostility=diplomacy(actors[i].faction,actors[j].faction),combined=actorPower(actors[i])+actorPower(actors[j]),elite=actors[i].importance>=96&&actors[j].importance>=96&&w.globalTension>=48,conflict=(w.conflicts||[]).some(function(c){return c.status==='active'&&c.region===region&&((c.attacker===actors[i].faction&&c.defender===actors[j].faction)||(c.attacker===actors[j].faction&&c.defender===actors[i].faction))});if(hostility<=-68&&combined>=150&&(elite||conflict)&&R('world')<.08){var created=startWorldSaga('rivalry',region,actors[i].name,actors[j].name,'actors:'+actors[i].name+':'+actors[j].name);if(created)ws.sagaCooldowns[region]=48+Math.floor(R('world')*37);return}}})
}
function simulateWorldSagas(){
 var w=game.world,ws=w.worldState;if(!ws)return;discoverWorldSagas();(ws.worldSagas||[]).filter(function(x){return x.status==='active'}).forEach(function(s){
  s.months++;var aa=s.type==='rivalry'&&w.actors.find(function(a){return a.name===s.a}),bb=s.type==='rivalry'&&w.actors.find(function(a){return a.name===s.b}),rivalryLive=!!(aa&&bb&&aa.status==='active'&&bb.status==='active'&&aa.region===s.region&&bb.region===s.region&&diplomacy(aa.faction,bb.faction)<=-60);
  var related=(w.conflicts||[]).filter(function(c){if(c.status!=='active'||c.region!==s.region)return false;if(s.type==='rivalry'&&aa&&bb)return(c.attacker===aa.faction&&c.defender===bb.faction)||(c.attacker===bb.faction&&c.defender===aa.faction);if(s.type==='power'&&s.a&&s.b)return(c.attacker===s.a&&c.defender===s.b)||(c.attacker===s.b&&c.defender===s.a);return true}),conflict=related.length;
  var war=s.type==='war'?(w.wars||[]).some(function(x){return x.status==='active'&&x.id===s.source}):(w.wars||[]).some(function(x){return x.status==='active'&&x.region===s.region}),branch=s.type==='canon'?(ws.canonBranches||[]).some(function(x){return x.status==='active'&&x.id===s.source}):(ws.canonBranches||[]).some(function(x){return x.status==='active'&&x.region===s.region}),driver=war||branch||conflict||rivalryLive,now=(w.year||0)*12+(w.month||0),recentPlayerPursuit=(s.playerCausalMissions||0)>0&&sagaPlayerRoleRank(s.playerRole||'present')<3&&now-(s.playerLastCausalMonth==null?-999:s.playerLastCausalMonth)<=14;
  s.pressure=cl(s.pressure+(war?2.1:0)+(branch?1.3:0)+conflict*.9+(rivalryLive?.65:0)-(!driver?2.4:0)+(R('world')-.5)*1.6,0,100);s.stage=s.pressure>=75?'Point culminant':s.pressure>=50?'Escalade':s.pressure>=28?'Confrontation':'Tensions';
  if(driver)s.events++;var pendingPlayerMission=!!(game.mission&&game.mission.sagaId===s.id);
  if(!pendingPlayerMission&&!recentPlayerPursuit){if(s.months>=6&&!driver&&s.pressure<28)resolveWorldSaga(s,'stabilisation');else if(s.months>=12&&s.pressure>=88&&R('world')<.065)resolveWorldSaga(s,'rupture');else if(s.months>=30&&R('world')<.075)resolveWorldSaga(s,s.pressure>=60?'rupture':'nouvel équilibre')}
 });ws.worldSagas=ws.worldSagas.filter(function(x){return x.status==='active'}).slice(0,32)
}
function worldStateSummary(){
 var w=game.world,ws=w.worldState||{},actors=(w.actors||[]).filter(function(a){return a.status==='active'}).sort(function(a,b){return actorPower(b)-actorPower(a)}).slice(0,5);
 return{year:w.year,month:w.month,divergence:Math.round(w.divergence||0),tension:Math.round(w.globalTension||0),leadingActors:actors.map(function(a){var g=ws.actorGoals&&ws.actorGoals[a.name],cp=actorCombatProxy(a);return{name:a.name,faction:a.faction,region:a.region,power:Math.round(actorPower(a)),style:cp.npcCombat.style,goal:g&&g.primary||a.goal,goalProgress:g?Math.round(g.progress||0):0}}),recentActions:(ws.actorHistory||[]).slice(0,5),recentGoalMilestones:(ws.goalHistory||[]).slice(0,5),timelineMode:canonTimelineMode(),recentCanonCausality:(ws.canonCausality||[]).slice(0,5),activeCanonBranches:(ws.canonBranches||[]).filter(function(x){return x.status==='active'}).slice(0,5),recentCanonBranchOutcomes:(ws.canonBranchHistory||[]).slice(0,5),recentPlayerCanonImpact:(ws.playerCanonImpact||[]).slice(0,5),activeWorldSagas:(ws.worldSagas||[]).filter(function(x){return x.status==='active'}).slice(0,5),recentSagaOutcomes:(ws.sagaHistory||[]).slice(0,5),factionGoals:ws.factionGoals||{},recentGeopoliticalShifts:(ws.geopoliticalHistory||[]).slice(0,5),recentCrewActions:(ws.crewHistory||[]).slice(0,5),recentTerritoryChanges:(ws.territoryHistory||[]).slice(0,5)}
}
function diplomacy(a,b){if(a===b)return 100;if(a==='Indépendant'||b==='Indépendant')return 0;return game.world.diplomacy[pairKey(a,b)]||0}
function actorPower(a){var y=game.world.year||0;if(a.status==='inactive')return 0;var start=a.activeFrom||0,t=cl((y-start)/Math.max(1,a.growth||15),0,1),base=a.base+(a.peak-a.base)*t;return cl(base+(a.momentum||0),1,100)}
function actorCombatProxy(a){
 if(!a)return null;var proxy={id:'world-actor-'+a.name,name:a.name,actorName:a.name,canonical:true,npcPower:actorPower(a),npcPotential:a.peak||100,npcSpecialty:'Combat',status:a.status,npcCombat:a.combatProfile||null,npcFruit:a.npcFruit||null};normalizeNpcCombatProfile(game,proxy);a.combatProfile=proxy.npcCombat;return proxy
}
function actorCombatRating(a,b){
 var ar=actorCombatProxy(a),br=actorCombatProxy(b),ac=npcCombatScores(ar),bc=npcCombatScores(br),edge=styleEdge(ac.style,bc.style),learn=npcAdaptationBonus(ar,bc.style,null),core=ac.offense*.58+ac.defense*.34+ac.stamina*.08;return core+edge*.35+learn*.4
}
function recordActorCombatLearning(actor,opponent,won){
 var ar=actorCombatProxy(actor),br=actorCombatProxy(opponent),c=ar.npcCombat,style=br.npcCombat.style,a=c.adaptations[style]||(c.adaptations[style]={fights:0,wins:0,losses:0,level:0,terrain:null});a.fights++;if(won)a.wins++;else a.losses++;var previous=a.level||0;a.level=cl(Math.floor(a.losses/2)+Math.floor(a.fights/6),0,4);c.fights=(c.fights||0)+1;if(won)c.wins=(c.wins||0)+1;else c.losses=(c.losses||0)+1;if(a.level>previous)npcAdaptationKeys(style).forEach(function(k){c.stats[k]=cl((c.stats[k]||0)+.45,0,100)});actor.combatProfile=c;return a
}
function weightedIntent(items,stream){
 var clean=items.filter(function(x){return x&&x.weight>0}),total=clean.reduce(function(sum,x){return sum+x.weight},0);if(!clean.length)return null;var r=R(stream||'world')*total;
 for(var i=0;i<clean.length;i++){r-=clean[i].weight;if(r<=0)return clean[i].id}return clean[clean.length-1].id
}
function weightedPool(pool,bonus,stream){
 var counts={};pool.forEach(function(id){counts[id]=(counts[id]||0)+1});
 Object.keys(bonus||{}).forEach(function(id){if(!counts[id]&&bonus[id]>0)counts[id]=0});
 var items=Object.keys(counts).map(function(id){return{id:id,weight:counts[id]+(bonus&&bonus[id]||0)}});return weightedIntent(items,stream)
}
function actorIntentPool(a){
 var pool=['Voyager','S’entraîner'],goal=String(a.goal||'').toLowerCase();
 if(a.faction==='Pirates')pool.push('Étendre son influence','Étendre son influence','Chercher un affrontement');
 if(a.faction==='Marine'||a.faction==='Gouvernement')pool.push('Sécuriser sa région','Étendre son influence','Consolider ses alliances');
 if(a.faction==='Révolutionnaires')pool.push('Étendre son influence','Consolider ses alliances','Voyager');
 if(a.faction==='Indépendant')pool.push('S’entraîner','Voyager');
 if(/protéger|famille|observer/.test(goal))pool.push('Sécuriser sa région','Consolider ses alliances','Consolider ses alliances');
 if(/adversaire|affront/.test(goal))pool.push('Chercher un affrontement','Chercher un affrontement');
 if(/domination|territoire|étendre|réseau/.test(goal))pool.push('Étendre son influence','Étendre son influence');
 return pool
}
function assignActorIntent(a){
 var goal=String(a.goal||'').toLowerCase(),bonus={};
 if((a.momentum||0)<-2)bonus['S’entraîner']=2.2;
 if(/adversaire|affront/.test(goal))bonus['Chercher un affrontement']=2.5;
 if(/domination|territoire|étendre|réseau/.test(goal))bonus['Étendre son influence']=2.8;
 if(/protéger|famille/.test(goal))bonus['Sécuriser sa région']=2.6;
 if(a.faction==='Pirates'&&(a.momentum||0)>2)bonus['Étendre son influence']=(bonus['Étendre son influence']||0)+1.2;
 if((a.faction==='Marine'||a.faction==='Gouvernement')&&game.world.globalTension>55)bonus['Sécuriser sa région']=(bonus['Sécuriser sa région']||0)+1.6;
 a.intention=weightedPool(actorIntentPool(a),bonus,'world');a.intentionMonths=3+Math.floor(R('world')*7);return a.intention
}
function actorMoveByIntent(a){var links=REGION_LINKS[a.region]||[];if(!links.length)return false;a.region=pk(links,'world');return true}
function resolveActorIntent(a){
 var w=game.world,intent=a.intention||assignActorIntent(a),outcome='';
 if(intent==='S’entraîner'){var inc=.5+R('world')*2;a.momentum=cl((a.momentum||0)+inc,-8,12);outcome='gagne en puissance'}
 else if(intent==='Voyager'){outcome=actorMoveByIntent(a)?'se déplace vers '+a.region:'reste dans '+a.region}
 else if(intent==='Étendre son influence'){
  if(w.factions[a.faction]!=null)w.factions[a.faction]=cl(w.factions[a.faction]+.5+R('world')*1.5,0,100);
  var terrs=Object.keys(w.territories).filter(function(n){return infStatic(n).region===a.region}),name=terrs.length?pk(terrs,'world'):null,t=name&&w.territories[name];
  if(t){if(t.controller===a.faction)t.influence=cl(t.influence+2+R('world')*3,0,100);else{t.stability=cl(t.stability-(1+R('world')*2),0,100);if(diplomacy(a.faction,t.controller)<-30&&R('world')<.28)spawnConflict(name,a.faction,t.controller,38+actorPower(a)*.35,a.name)}}
  outcome='renforce son influence dans '+a.region
 }else if(intent==='Chercher un affrontement'){
  var foes=w.actors.filter(function(x){return x!==a&&x.status==='active'&&x.region===a.region&&diplomacy(a.faction,x.faction)<-35});
  if(foes.length){var b=pk(foes,'world'),pa=actorCombatRating(a,b)+R('world')*18,pb=actorCombatRating(b,a)+R('world')*18,loser=pa>=pb?b:a,winner=loser===a?b:a;recordActorCombatLearning(a,b,winner===a);recordActorCombatLearning(b,a,winner===b);loser.status='wounded';loser.woundMonths=2+Math.floor(R('world')*4);winner.momentum=cl((winner.momentum||0)+.5,-8,12);var wa=actorCombatProxy(winner),la=actorCombatProxy(loser);outcome='affronte '+b.name+' ; '+winner.name+' prend l’avantage ('+wa.npcCombat.style+' contre '+la.npcCombat.style+')';news('Initiative de '+a.name,outcome+' dans '+a.region+'.','major')}
  else outcome='ne trouve aucun adversaire digne dans '+a.region
 }else if(intent==='Sécuriser sa région'){
  Object.keys(w.territories).filter(function(n){return infStatic(n).region===a.region}).slice(0,3).forEach(function(n){var t=w.territories[n];if(t.controller===a.faction||diplomacy(a.faction,t.controller)>20)t.stability=cl(t.stability+1+R('world')*1.5,0,100)});outcome='stabilise ses positions dans '+a.region
 }else if(intent==='Consolider ses alliances'){
  var choices=WORLD_FACTIONS.filter(function(f){return f!==a.faction&&diplomacy(a.faction,f)>-25});if(choices.length){var f=pk(choices,'world'),k=pairKey(a.faction,f);w.diplomacy[k]=cl((w.diplomacy[k]||0)+1+R('world')*3,-100,100);outcome='renforce ses liens avec '+f}else outcome='reste isolé diplomatiquement'
 }
 a.lastIntentOutcome=outcome;var worldImpact=propagateActorWorldImpact(a,intent);recordWorldActorAction(a,intent,outcome,worldImpact);a.intention=null;a.intentionMonths=0;if(a.importance>=98&&R('world')<.35)news(a.name+' poursuit son objectif',outcome+'.','');return outcome
}
function actorIntentTick(a){if(a.status!=='active')return;if(!a.intention)assignActorIntent(a);a.intentionMonths=Math.max(0,(a.intentionMonths||0)-1);a.momentum=cl((a.momentum||0)*.997,-8,12);if(a.intentionMonths<=0)resolveActorIntent(a)}
function crewIntentPool(c){
 if(c.morale<30||c.resources<18)return['Se remettre','Se remettre','Se remettre','S’entraîner'];
 if(c.playerJoined&&c.members<6)return['Recruter','Recruter','S’entraîner','Se remettre'];
 if(c.members<6)return['Recruter','Recruter','Voyager','S’entraîner'];
 var pool=c.playerJoined?['S’entraîner','Se remettre']:['Voyager','S’entraîner'];if((c.playerGrudge||0)>=25)pool.push('Traquer le joueur');if((c.playerGrudge||0)>=55)pool.push('Traquer le joueur','Traquer le joueur');
 if(c.faction==='Pirates')pool.push('Chercher un butin','Chercher un butin','Revendiquer une zone');
 if(c.faction==='Chasseur de primes')pool.push('Traquer une cible','Traquer une cible','Voyager');
 if(c.faction==='Révolutionnaires')pool.push('Étendre son réseau','Revendiquer une zone','Voyager');
 return pool
}
function assignCrewIntent(c){
 var bonus={};
 if(c.resources<30)bonus['Se remettre']=2.5;
 if(c.members<8)bonus['Recruter']=2.4;
 if(c.faction==='Pirates'&&c.resources>45&&c.morale>45)bonus['Chercher un butin']=1.8;
 if(c.faction==='Chasseur de primes'&&c.power>40)bonus['Traquer une cible']=1.5;
 if(c.faction==='Révolutionnaires'&&c.resources>35)bonus['Étendre son réseau']=1.5;
 if((c.playerGrudge||0)>=25)bonus['Traquer le joueur']=1.2+(c.playerGrudge||0)/45;
 c.intention=weightedPool(crewIntentPool(c),bonus,'world');c.intentionMonths=2+Math.floor(R('world')*6);return c.intention
}
function resolveCrewIntent(c){
 var w=game.world,intent=c.intention||assignCrewIntent(c),outcome='';
 if(intent==='Se remettre'){c.morale=cl(c.morale+8+R('world')*10,0,100);c.resources=cl(c.resources+4+R('world')*8,0,100);outcome='reprend des forces'}
 else if(intent==='S’entraîner'){c.power=cl(c.power+1+R('world')*2.4,6,96);c.morale=cl(c.morale+2,0,100);outcome='renforce son niveau'}
 else if(intent==='Voyager'){var links=REGION_LINKS[c.region]||[];if(links.length)c.region=pk(links,'world');outcome='met le cap sur '+c.region}
 else if(intent==='Recruter'){var room=Math.max(0,40-(c.members||0)),gain=Math.min(room,1+Math.floor(R('world')*4));if(gain>0){var cost=4+R('world')*6;c.members=(c.members||0)+gain;c.resources=cl(c.resources-cost,0,100);c.morale=cl(c.morale+1+R('world')*2,0,100);outcome='recrute '+gain+' nouveau'+(gain>1?'x membres':' membre')}else outcome='a déjà atteint sa taille optimale'}
 else if(intent==='Chercher un butin'){var haul=6+R('world')*18;c.resources=cl(c.resources+haul,0,100);c.morale=cl(c.morale+3,0,100);c.bounty+=Math.round((2+R('world')*8)*100000);var rp=w.pressures[c.region];if(rp){rp.Piraterie=cl(rp.Piraterie+1.5,0,100);rp.Criminalité=cl(rp.Criminalité+1,0,100)}outcome='réussit un raid dans '+c.region}
 else if(intent==='Traquer une cible'){c.power=cl(c.power+.4+R('world')*1.2,6,96);c.morale=cl(c.morale+(R('world')<.6?3:-2),0,100);var rp2=w.pressures[c.region];if(rp2)rp2.Criminalité=cl(rp2.Criminalité-1.2,0,100);outcome='mène une chasse dans '+c.region}
 else if(intent==='Étendre son réseau'){if(w.factions[c.faction]!=null)w.factions[c.faction]=cl(w.factions[c.faction]+.5+R('world'),0,100);c.resources=cl(c.resources+3,0,100);outcome='développe son réseau clandestin'}
 else if(intent==='Revendiquer une zone'){var terrs=Object.keys(w.territories).filter(function(n){return infStatic(n).region===c.region}),name=terrs.length?pk(terrs,'world'):null,t=name&&w.territories[name];if(t&&t.controller!==c.faction&&diplomacy(c.faction,t.controller)<-15){spawnConflict(name,c.faction,t.controller,34+c.power*.5,c.id);outcome='conteste '+name}else outcome='cherche une zone vulnérable'}
 else if(intent==='Traquer le joueur'){var target=game.player.region;if(c.region!==target){var links=REGION_LINKS[c.region]||[];if(links.indexOf(target)>=0)c.region=target;else if(links.length)c.region=pk(links,'world');outcome='se rapproche de la trajectoire de '+game.player.name}else{c.morale=cl(c.morale+2,0,100);var rp3=w.pressures[c.region];if(rp3)rp3.Instabilité=cl((rp3.Instabilité||0)+2,0,100);outcome='cherche activement '+game.player.name+' dans '+c.region;registerArcSignal('crew','crew',c.id,c.name,68,{region:c.region});news(c.name+' te cherche',c.name+' transforme sa rancune en véritable chasse.','major')}}
 if(!outcome)outcome='poursuit ses activités dans '+c.region;
 c.lastIntentOutcome=outcome;recordWorldCrewAction(c,intent,outcome,intent==='Revendiquer une zone'?3:intent==='Étendre son réseau'?2.5:1);c.intention=null;c.intentionMonths=0;if(c.power>=65&&R('world')<.22)news(c.name+' agit',outcome+'.','');return outcome
}
function crewIntentTick(c){if(c.status!=='active')return;if(!c.intention)assignCrewIntent(c);c.intentionMonths=Math.max(0,(c.intentionMonths||0)-1);if(c.intentionMonths<=0)resolveCrewIntent(c)}


var PEOPLE_NAMES=['Mira','Doran','Seline','Rook','Nessa','Toma','Ari','Noa','Kaï','Lina','Eden','Sora','Maël','Namiya','Kellan','Yuna','Senn','Iria','Milo','Rin'];
var HOUSING=[
 {name:'Logement modeste',monthly:700,buy:0,asset:0},
 {name:'Appartement confortable',monthly:1400,buy:25000,asset:15000},
 {name:'Maison familiale',monthly:2600,buy:90000,asset:70000},
 {name:'Résidence prestigieuse',monthly:6000,buy:300000,asset:250000}
];
var ACHIEVEMENTS=[
 {id:'voyage',name:'Premier horizon',desc:'Visiter au moins deux lieux.'},
 {id:'grandline',name:'Au-delà de Reverse Mountain',desc:'Atteindre Grand Line.'},
 {id:'newworld',name:'Nouveau Monde',desc:'Atteindre le Nouveau Monde.'},
 {id:'haki',name:'Volonté éveillée',desc:'Éveiller au moins un Haki.'},
 {id:'fruit',name:'Pouvoir interdit',desc:'Consommer un Fruit du démon.'},
 {id:'family',name:'Une autre génération',desc:'Avoir au moins un enfant.'},
 {id:'marriage',name:'Engagement',desc:'Se marier.'},
 {id:'wealth',name:'Millionnaire',desc:'Atteindre 1 000 000 B de patrimoine net.'},
 {id:'veteran',name:'Vétéran',desc:'Remporter 20 combats.'},
 {id:'bounty',name:'Menace mondiale',desc:'Atteindre 100 000 000 B de prime.'},
 {id:'social',name:'Un nom que l’on connaît',desc:'Entretenir huit relations importantes.'},
 {id:'divergence',name:'Faiseur d’histoire',desc:'Faire dépasser 10% de divergence historique.'},
 {id:'longevity',name:'Longue vie',desc:'Atteindre 60 ans.'},
 {id:'legacy',name:'La volonté transmise',desc:'Continuer la partie avec un héritier.'},
 {id:'commander',name:'Sous ton pavillon',desc:'Diriger une organisation avec au moins six membres actifs.'},
 {id:'flagship',name:'Navire de commandement',desc:'Commander une Frégate ou un Galion.'},
 {id:'escape',name:'Les murs ne suffisent pas',desc:'Réussir une évasion de prison.'},
 {id:'hunter',name:'Chasseur confirmé',desc:'Capturer cinq cibles recherchées.'},
 {id:'domain',name:'Mon pavillon ici',desc:'Établir un premier domaine personnel.'},
 {id:'regional-power',name:'Puissance régionale',desc:'Contrôler au moins trois zones.'},
 {id:'fleet',name:'Flotte sous influence',desc:'Rallier trois équipages autonomes.'},
 {id:'emperor',name:'Au sommet des mers',desc:'Être reconnu comme Empereur des mers.'},
 {id:'campaign',name:'Tambours de guerre',desc:'Lancer une première campagne stratégique.'},
 {id:'strategist',name:'Stratège des mers',desc:'Remporter trois guerres auxquelles ton camp a participé.'},
 {id:'merchant',name:'Marchand des mers',desc:'Cumuler 100 000 B de profit commercial.'},
 {id:'smuggler',name:'Sous le nez de la Marine',desc:'Réussir trois passages de contrebande.'},
 {id:'mentor-bond',name:'Sous l’aile d’un maître',desc:'Effectuer cinq entraînements avec un mentor.'},
 {id:'nemesis',name:'Rivalité légendaire',desc:'Disputer cinq duels contre le même rival.'},
 {id:'known-recruit',name:'Plus qu’une connaissance',desc:'Recruter une relation importante dans ton organisation.'},
 {id:'explorer',name:'Grand voyageur',desc:'Visiter au moins dix lieux différents.'},
 {id:'discoverer',name:'Œil d’explorateur',desc:'Enregistrer dix découvertes locales.'},
 {id:'cartographer',name:'Je connais ces mers',desc:'Maîtriser la connaissance de trois îles.'},
 {id:'story-first',name:'Un fil se noue',desc:'Résoudre un premier fil narratif.'},
 {id:'story-weaver',name:'Une vie pleine d’histoires',desc:'Résoudre dix fils narratifs.'},
 {id:'story-decisions',name:'À la croisée des chemins',desc:'Prendre quinze décisions narratives.'}
];
function normalizeRelation(g,r,i){
 r=r||{};var base=H(String(g.seed||1)+':rel:'+String(r.name||i)),p=g.player||{},playerAge=p.ageMonths||0;
 r.id=r.id||('rel-'+i+'-'+(base%100000));r.name=r.name||PEOPLE_NAMES[base%PEOPLE_NAMES.length];r.role=r.role||'connaissance';r.type=r.type||'social';
 r.affection=cl(r.affection==null?35+(base%41):r.affection,0,100);r.respect=cl(r.respect==null?30+((base>>>3)%46):r.respect,0,100);r.trust=cl(r.trust==null?30+((base>>>5)%41):r.trust,0,100);
 r.fear=cl(r.fear||0,0,100);r.loyalty=cl(r.loyalty==null?35+((base>>>7)%36):r.loyalty,0,100);r.rivalry=cl(r.rivalry||0,0,100);r.attraction=cl(r.attraction==null?20+((base>>>9)%61):r.attraction,0,100);
 r.monthsKnown=r.monthsKnown||0;r.relationshipMonths=r.relationshipMonths||0;r.relationshipMilestones=Array.isArray(r.relationshipMilestones)?r.relationshipMilestones.slice(-4):[];r.status=r.status||'active';r.location=r.location||null;r.faction=r.faction||'Civil';
 r.canonical=!!r.canonical;r.actorName=r.actorName||null;r.npcAgeMonths=r.npcAgeMonths==null?Math.max(0,playerAge-48+((base>>>10)%145)):r.npcAgeMonths;if(r.role==='mentor'||r.role==='partenaire'||r.type==='partner')r.npcAgeMonths=Math.max(216,r.npcAgeMonths);
 r.npcPower=cl(r.npcPower==null?12+((base>>>12)%39)+(r.role==='mentor'?18:r.role==='rival'?8:0):r.npcPower,1,100);
 r.npcPotential=cl(r.npcPotential==null?Math.max(r.npcPower+8,58+((base>>>15)%40)):r.npcPotential,r.npcPower,100);
 r.npcSpecialty=r.npcSpecialty||['Combat','Navigation','Médecine','Sabre','Discrétion','Commandement'][(base>>>18)%6];
 r.npcTrajectory=r.npcTrajectory||['Stable','Ascension','Ascension','Instable','Stable'][(base>>>21)%5];
 r.npcAmbition=r.npcAmbition||['Devenir plus fort','Explorer le monde','Faire fortune','Servir sa faction','Protéger ses proches'][(base>>>24)%5];r.npcIntent=r.npcIntent||null;r.npcIntentMonths=Math.max(0,r.npcIntentMonths||0);r.npcWealth=Math.max(0,r.npcWealth||0);r.lastIntentOutcome=r.lastIntentOutcome||null;
 r.careerLevel=cl(r.careerLevel==null?Math.floor(r.npcPower/18):r.careerLevel,0,6);r.npcWins=r.npcWins||0;r.npcLosses=r.npcLosses||0;r.rivalWins=r.rivalWins||0;r.rivalLosses=r.rivalLosses||0;r.rivalMilestones=Array.isArray(r.rivalMilestones)?r.rivalMilestones:[];normalizeNpcCombatProfile(g,r);
 r.mentorSessions=r.mentorSessions||0;r.favorBalance=r.favorBalance||0;r.injuryMonths=r.injuryMonths||0;r.lastDuelAge=r.lastDuelAge==null?-999:r.lastDuelAge;r.lastCanonInteractionAge=r.lastCanonInteractionAge==null?-999:r.lastCanonInteractionAge;r.challengeReady=!!r.challengeReady;r.nemesisRecognized=!!r.nemesisRecognized;r.joinedOrganization=!!r.joinedOrganization;r.peerRecognized=!!r.peerRecognized;r.rivalResolved=!!r.rivalResolved;r.relationshipPhase=r.relationshipPhase||null;r.pathHistory=Array.isArray(r.pathHistory)?r.pathHistory.slice(-6):[];
 r.memories=Array.isArray(r.memories)?r.memories.slice(0,10):[];r.region=r.region||(r.location&&PL[r.location]?PL[r.location][0]:(p.region||p.origin||'East Blue'));return r
}

function npcCanonicalStyle(name){
 var map={'Dracule Mihawk':'Sabreur','Mihawk':'Sabreur','Shanks':'Sabreur','Silvers Rayleigh':'Sabreur','Rayleigh':'Sabreur','Roronoa Zoro':'Sabreur','Monkey D. Garp':'Corps-à-corps','Garp':'Corps-à-corps','Kaido':'Corps-à-corps','Rob Lucci':'Corps-à-corps','Borsalino':'Mobile / esquive','Kuzan':'Équilibré','Sakazuki':'Corps-à-corps','Edward Newgate':'Corps-à-corps','Charlotte Linlin':'Équilibré','Big Mom':'Équilibré','Monkey D. Luffy':'Corps-à-corps','Trafalgar Law':'Sabreur','Eustass Kid':'Équilibré','Boa Hancock':'Corps-à-corps','Sengoku':'Équilibré','Dragon':'Équilibré'};return map[name]||null
}
function npcStyleFor(g,r){
 var fixed=npcCanonicalStyle(r.actorName||r.name);if(fixed)return fixed;
 if(r.npcSpecialty==='Sabre')return'Sabreur';if(r.npcSpecialty==='Discrétion'||r.npcSpecialty==='Navigation')return'Mobile / esquive';if(r.npcSpecialty==='Commandement'||r.npcSpecialty==='Médecine')return'Équilibré';
 var styles=['Équilibré','Corps-à-corps','Mobile / esquive','Corps-à-corps','Équilibré'];return styles[H(String(g.seed||1)+':npc-style:'+String(r.id||r.name))%styles.length]
}
function npcFruitFor(g,r){
 if(r.npcFruit)return r.npcFruit;if(!r.canonical&&!r.actorName)return null;var name=r.actorName||r.name,now=((g.world&&g.world.year)||0)*12+((g.world&&g.world.month)||0),matches=(FRUIT_ASSIGNMENTS||[]).filter(function(x){return x.holder===name&&((x.year||0)*12+(x.month||0))<=now});return matches.length?matches[matches.length-1].fruit:null
}
function npcSeedValue(g,r,key,min,max){
 var h=H(String(g.seed||1)+':npc-combat:'+String(r.id||r.name)+':'+key);return min+(h%10000)/9999*(max-min)
}
function npcStyleMasteryFrom(c){
 var st=c.stats||{},sk=c.skills||{};if(c.style==='Corps-à-corps')return(sk.Combat||0)*.55+(st.Force||0)*.30+(st.Endurance||0)*.15;if(c.style==='Sabreur')return(sk.Sabre||0)*.62+(sk.Combat||0)*.23+(st.Réflexes||0)*.15;if(c.style==='Tireur')return(sk.Tir||0)*.62+(st.Réflexes||0)*.23+(st.Discipline||0)*.15;if(c.style==='Mobile / esquive')return(sk.Combat||0)*.45+(st.Agilité||0)*.33+(st.Vitesse||0)*.22;return(sk.Combat||0)*.62+(st.Discipline||0)*.20+(st.Réflexes||0)*.18
}
function npcTechniqueBudget(c){return c.techniqueTier>=3?19:c.techniqueTier===2?10:c.techniqueTier===1?4:0}
function npcCombatRawPower(c){
 var st=c.stats||{},h=c.haki||{},physical=((st.Force||0)+(st.Vitesse||0)+(st.Agilité||0)+(st.Endurance||0)+(st.Résistance||0)+(st.Réflexes||0))/6,martial=npcStyleMasteryFrom(c),mental=(st.Discipline||0)*.45+(st.Volonté||0)*.55,f=c.fruit?(4+(c.fruitMastery||0)*.08):0;return physical*.36+martial*.30+mental*.08+(h.Observation||0)*.06+(h.Armement||0)*.08+(h.Conquérant||0)*.10+f+npcTechniqueBudget(c)*.30
}
function normalizeNpcCombatProfile(g,r){
 if(!r)return null;var target=cl(r.npcPower==null?20:r.npcPower,1,100),c=r.npcCombat||{},base=cl(target*1.12+8,10,98),style=c.style||npcStyleFor(g,r),keys=['Force','Vitesse','Agilité','Endurance','Résistance','Réflexes','Discipline','Volonté'];c.style=style;c.stats=c.stats||{};keys.forEach(function(k){if(c.stats[k]==null)c.stats[k]=cl(base+npcSeedValue(g,r,k,-9,9),5,100)});
 c.skills=c.skills||{};var primary=style==='Sabreur'?'Sabre':style==='Tireur'?'Tir':'Combat';['Combat','Sabre','Tir'].forEach(function(k){if(c.skills[k]==null)c.skills[k]=cl(base*(k===primary?.96:k==='Combat'?.78:.46)+npcSeedValue(g,r,'skill-'+k,-5,5),2,100)});
 c.haki=c.haki||{};var hakiBase=cl((target-32)*1.15,0,82);if(c.haki.Observation==null)c.haki.Observation=target>=38?cl(hakiBase+npcSeedValue(g,r,'obs',-8,8),0,100):0;if(c.haki.Armement==null)c.haki.Armement=target>=42?cl(hakiBase*.92+npcSeedValue(g,r,'arm',-8,8),0,100):0;
 if(c.haki.Conquérant==null){var known=['Shanks','Silvers Rayleigh','Rayleigh','Kaido','Charlotte Linlin','Big Mom','Edward Newgate','Monkey D. Luffy','Boa Hancock','Eustass Kid','Sengoku'].indexOf(r.actorName||r.name)>=0;c.haki.Conquérant=known?cl((target-45)*1.2,1,95):target>=78&&npcSeedValue(g,r,'conq-roll',0,1)<.08?cl((target-70)*1.5,1,55):0}
 c.fruit=c.fruit||npcFruitFor(g,r);if(c.fruitMastery==null)c.fruitMastery=c.fruit?cl(target*.78+npcSeedValue(g,r,'fruit',-9,9),8,96):0;c.techniqueTier=c.techniqueTier==null?(target>=72?3:target>=50?2:target>=28?1:0):cl(c.techniqueTier,0,3);c.adaptations=c.adaptations||{};c.fights=c.fights||0;c.wins=c.wins||0;c.losses=c.losses||0;c.anchorPower=c.anchorPower==null?target:c.anchorPower;
 if(c.powerOffset==null)c.powerOffset=target-npcCombatRawPower(c);r.npcCombat=c;return c
}
function npcCombatPower(r){
 var c=normalizeNpcCombatProfile(game,r),trajectory=(r.npcPower==null?c.anchorPower:r.npcPower)-c.anchorPower,injury=r.status==='wounded'||(r.injuryMonths||0)>0?Math.min(10,2+(r.injuryMonths||0)*1.2):0;return cl(npcCombatRawPower(c)+(c.powerOffset||0)+trajectory*(r.canonical?1:.72)-injury,1,100)
}
function npcCombatScores(r){
 var c=normalizeNpcCombatProfile(game,r),st=c.stats,h=c.haki,mastery=npcStyleMasteryFrom(c),offMod=c.style==='Corps-à-corps'?2:c.style==='Sabreur'||c.style==='Tireur'?1:c.style==='Mobile / esquive'?-1:0,defMod=c.style==='Mobile / esquive'?3:c.style==='Équilibré'?1:0,tech=npcTechniqueBudget(c),fruit=c.fruit?(c.fruitMastery||0):0;
 var out={style:c.style,offense:st.Force*.15+st.Vitesse*.12+mastery*.34+(c.skills.Combat||0)*.10+(h.Armement||0)*.18+(h.Conquérant||0)*.08+fruit*.12+tech*.35+offMod,defense:st.Résistance*.19+st.Agilité*.17+st.Réflexes*.18+mastery*.10+(c.skills.Combat||0)*.07+(h.Observation||0)*.22+(h.Armement||0)*.08+defMod,stamina:st.Endurance*.65+35};
 var core=out.offense*.58+out.defense*.34+out.stamina*.08,shift=npcCombatPower(r)-core;out.offense=cl(out.offense+shift,1,110);out.defense=cl(out.defense+shift,1,110);out.stamina=cl(out.stamina+shift,1,110);return out
}
function npcAdaptationBonus(r,playerStyle,terrain){
 if(!r||!r.npcCombat)return 0;var a=r.npcCombat.adaptations&&r.npcCombat.adaptations[playerStyle],bonus=a?Math.min(6,(a.level||0)*1.25+(a.fights||0)*.08):0;if(terrain&&a&&a.terrain===terrain)bonus+=.5;return Math.min(6.5,bonus)
}
function npcAdaptationKeys(style){if(style==='Corps-à-corps')return['Résistance','Réflexes'];if(style==='Sabreur')return['Réflexes','Agilité'];if(style==='Tireur')return['Agilité','Réflexes'];if(style==='Mobile / esquive')return['Réflexes','Discipline'];return['Discipline','Réflexes']}
function recordNpcCombatLearning(r,playerWon,terrain){
 if(!r)return;var c=normalizeNpcCombatProfile(game,r),style=game.player.style,a=c.adaptations[style]||(c.adaptations[style]={fights:0,wins:0,losses:0,level:0,terrain:null});a.fights++;if(playerWon)a.losses++;else a.wins++;a.terrain=terrain||a.terrain;var previous=a.level||0;a.level=cl(Math.floor(a.losses/2)+Math.floor(a.fights/5),0,5);c.fights++;if(playerWon)c.losses++;else c.wins++;
 if(a.level>previous){npcAdaptationKeys(style).forEach(function(k){c.stats[k]=cl((c.stats[k]||0)+.6,0,100)});addRelationMemory(r,r.name+' adapte désormais sa préparation à ton style '+style.toLowerCase()+'.','combat-learning');rememberCausalMemory('rivalry',r.name+' apprend à te combattre',68,{kind:'rivalry',relationId:r.id,subjectId:r.id,playerStyle:style,adaptation:a.level,region:npcRegion(r)},'rival-adapt:'+r.id+':'+style+':'+a.level)}
 return a
}
function combatPowerTier(v){return v<20?'Local':v<35?'Combattant régional':v<50?'Grand Line':v<65?'Élite des mers':v<80?'Nouveau Monde':v<92?'Puissance mondiale':v<99.5?'Sommet mondial':'Apex absolu'}
function worldPowerStanding(){
 var pwr=power(),pool=[{name:game.player.name,power:pwr,player:true}];(game.world.actors||[]).filter(function(a){return a.status==='active'}).forEach(function(a){pool.push({name:a.name,power:actorPower(a)})});(game.relations||[]).filter(function(r){return r.status==='active'&&!r.canonical}).forEach(function(r){pool.push({name:r.name,power:npcCombatPower(r)})});pool.sort(function(a,b){return b.power-a.power});var rank=pool.findIndex(function(x){return x.player})+1,percent=Math.max(1,Math.round(rank/pool.length*100));return{rank:rank,total:pool.length,percent:percent,tier:combatPowerTier(pwr)}
}
function combatWorldReaction(r,playerWon){
 if(!r)return;var p=game.player,opp=npcCombatPower(r),importance=cl(opp+(r.canonical?12:0)+(r.nemesisRecognized?10:0),0,100);if(playerWon&&opp>=50)p.reputation=cl(p.reputation+Math.max(1,Math.round((opp-42)/14)),0,100);
 if(r.canonical&&r.actorName){var a=canonActor(r.actorName);if(a)a.momentum=cl((a.momentum||0)+(playerWon?-1.2:.65),-8,12)}
 if(r.npcCrewId){var crew=(game.world.crews||[]).find(function(c){return c.id===r.npcCrewId});if(crew){crew.playerGrudge=cl((crew.playerGrudge||0)+(playerWon?5:2),0,100);crew.morale=cl(crew.morale+(playerWon?-5:4),0,100)}}
 if(importance>=65){rememberCausalMemory('combat','Duel contre '+r.name,importance,{kind:'combat',relationId:r.id,subjectId:r.id,success:playerWon,opponentPower:Math.round(opp),region:p.region},'living-power-duel:'+r.id+':'+Math.floor(p.ageMonths/6));if(importance>=78)news('Duel remarqué',p.name+(playerWon?' prend l’avantage sur ':' est mis en difficulté par ')+r.name+' dans '+p.region+'.','major')}
}

function addRelationMemory(r,text,type){
 if(!r)return;r.memories=r.memories||[];var stamp=game&&game.player?age():'?';if(r.memories[0]&&r.memories[0].text===text)return;r.memories.unshift({text:text,type:type||'social',age:stamp});r.memories=r.memories.slice(0,10)
}
function relationPathShift(r,phase,text){
 if(!r||r.relationshipPhase===phase)return false;r.relationshipPhase=phase;r.pathHistory=Array.isArray(r.pathHistory)?r.pathHistory:[];r.pathHistory.push({age:age(),phase:phase,text:text||phase});r.pathHistory=r.pathHistory.slice(-6);addRelationMemory(r,text||('Votre relation devient '+phase+'.'),'trajectory');rememberCausalMemory('relationship',r.name+' — '+phase,58,{kind:'relationship',relationId:r.id,subjectId:r.id,phase:phase,region:npcRegion(r)},'relationship-phase:'+r.id+':'+phase);return true
}
function updateRelationshipTrajectory(r){
 if(!r||r.status!=='active')return false;var changed=false,total=(r.rivalWins||0)+(r.rivalLosses||0);
 if(r.role==='mentor'&&r.peerRecognized&&r.mentorSessions>=3)changed=relationPathShift(r,'pair reconnu',r.name+' n’est plus seulement un mentor : votre relation ressemble désormais à celle de deux pairs.')||changed;
 if(r.role==='rival'&&total>=3&&(r.respect||0)>=72&&(r.trust||0)>=48)changed=relationPathShift(r,r.nemesisRecognized?'némésis respectée':'rivalité respectueuse','Votre opposition avec '+r.name+' repose désormais autant sur le respect que sur la compétition.')||changed;
 if(r.role!=='rival'&&r.role!=='mentor'&&r.role!=='parent'&&r.role!=='frère / sœur'&&r.id!==game.player.life.partnerId&&(r.monthsKnown||0)>=24&&(r.trust||0)>=78&&(r.respect||0)>=66&&(r.loyalty||0)>=65){if(r.role==='connaissance')r.role='allié';changed=relationPathShift(r,'allié durable',r.name+' devient un allié durable plutôt qu’une simple connaissance.')||changed}
 if(r.joinedOrganization&&(r.loyalty||0)>=82&&(r.trust||0)>=72)changed=relationPathShift(r,'compagnon de route',r.name+' est devenu l’un des compagnons les plus fiables de ton organisation.')||changed;
 return changed
}
function relationForActor(name){return game.relations.find(function(r){return r.actorName===name||(r.canonical&&r.name===name)})||null}
function npcCareerRank(r){
 if((r.npcAgeMonths||0)<144)return'Enfance';if((r.npcAgeMonths||0)<180)return'Formation';if(r.faction==='Indépendant')return r.canonical?'Indépendant reconnu':'Indépendant';
 var cfg=CAREERS[r.faction]||CAREERS.Civil,track=(r.faction==='Gouvernement'?careerTrack('Gouvernement',null):cfg.ranks)||[];if(!track.length)return r.role||'Indépendant';return track[Math.min(track.length-1,Math.max(0,r.careerLevel||0))].n
}
function npcRegion(r){if(r.canonical&&r.actorName){var a=canonActor(r.actorName);if(a)return a.region}return r.region||(r.location&&PL[r.location]?PL[r.location][0]:game.player.region)}
function partnerNearPlayer(r){
 var p=game.player;if(!r||r.status!=='active'||r.longDistance)return false;
 if(p.travel)return!!(p.travel.householdPartnerId===r.id&&p.travel.partnerFollows);
 if(r.canonical)return npcRegion(r)===p.region;
 if(r.location)return r.location===p.island;
 return npcRegion(r)===p.region
}
function npcNearby(r){
 var p=game.player;if(!r||r.status!=='active')return false;if(r.joinedOrganization)return true;if(r.id===p.life.partnerId)return partnerNearPlayer(r);if(p.travel)return false;if(r.canonical)return npcRegion(r)===p.region;if(r.location)return r.location===p.island;return npcRegion(r)===p.region
}
function canonicalFreedom(r){if(!r.canonical)return true;var a=canonActor(r.actorName||r.name),need=a?Math.round((a.importance||90)*.48):48;return game.world.divergence>=need}
function bondCanonicalActor(a,context){
 if(!a)return null;var r=relationForActor(a.name),p=game.player;
 if(!r){var hostile=diplomacy(p.faction,a.faction)<-35,pow=actorPower(a),role=hostile?'rival':'connaissance';r=normalizeRelation(game,{id:'canon-rel-'+H(a.name),name:a.name,role:role,type:'canonical',canonical:true,actorName:a.name,faction:a.faction,region:a.region,location:null,npcAgeMonths:Math.max(0,((game.world.year||0)-(a.birthYear||0))*12+(game.world.month||0)),npcPower:pow,npcPotential:a.peak,respect:hostile?35:55,trust:hostile?20:42,loyalty:35,attraction:10,rivalry:hostile?48:0,npcAmbition:a.goal,mentorPotential:a.faction===p.faction&&pow>power()+18},game.socialSeq++);game.relations.push(r);addRelationMemory(r,'Première rencontre dans '+p.region+'.','canon')}
 else{r.faction=a.faction;r.region=a.region;r.npcAgeMonths=Math.max(0,((game.world.year||0)-(a.birthYear||0))*12+(game.world.month||0));r.npcPower=actorPower(a);r.status=a.status==='dead'?'dead':a.status==='wounded'?'wounded':'active';r.monthsKnown=Math.max(r.monthsKnown,1)}
 if(context){addRelationMemory(r,context,'canon');r.lastCanonInteractionAge=p.ageMonths}return r
}
function relationPower(r){if(!r)return 10;if(r.canonical&&r.actorName){var a=canonActor(r.actorName);if(a){normalizeNpcCombatProfile(game,r);r.npcPower=actorPower(a);return npcCombatPower(r)}}return npcCombatPower(r)}
function relationGrowthRate(r){
 var base=r.npcTrajectory==='Ascension'?.09:r.npcTrajectory==='Instable'?.045:r.npcTrajectory==='Déclin'?.018:.055;if(r.role==='rival')base*=1.18;if(r.role==='mentor')base*=.72;return base
}
function moveNpc(r){
 var cur=npcRegion(r),links=REGION_LINKS[cur]||[];if(!links.length)return;var next=pk(links,'npc'),places=Object.keys(PL).filter(function(n){return PL[n][0]===next});r.region=next;r.location=places.length?pk(places,'npc'):null;addRelationMemory(r,'Part pour '+next+'.','travel');if(next===game.player.region&&r.monthsKnown>=6){r.trust=cl(r.trust+1,0,100);addRelationMemory(r,'Vos routes se croisent à nouveau dans '+next+'.','reunion');tl('Retrouvailles',r.name+' réapparaît dans ta région.','major')}
}
function npcIntentPool(r){
 var pool=['Faire carrière','Voyager'],amb=String(r.npcAmbition||'');
 if(amb==='Devenir plus fort')pool.push('S’entraîner','S’entraîner');
 if(amb==='Explorer le monde')pool.push('Voyager','Voyager');
 if(amb==='Faire fortune')pool.push('S’enrichir','S’enrichir');
 if(amb==='Servir sa faction')pool.push('Faire carrière','Servir sa faction');
 if(amb==='Protéger ses proches')pool.push('Soutenir ses proches','Soutenir ses proches');
 if(r.role==='rival')pool.push('Défier son rival');var canPursueNemesis=r.nemesisRecognized&&!r.challengeReady&&game&&game.player&&game.player.ageMonths-(r.lastDuelAge==null?-999:r.lastDuelAge)>=8;if(canPursueNemesis)pool.push('Poursuivre sa némésis');if(r.role==='mentor')pool.push('Former la relève');var independentReady=!r.joinedOrganization&&!r.canonical&&(r.npcAgeMonths||0)>=240&&(r.npcPower||0)>=48&&(r.careerLevel||0)>=3;if(independentReady&&['Pirates','Révolutionnaires','Chasseur de primes'].indexOf(r.faction)>=0)pool.push('Fonder son groupe');if(independentReady&&r.npcTrajectory==='Instable'&&r.faction!=='Indépendant'&&r.faction!=='Civil')pool.push('Rompre avec sa faction');return pool
}
function assignNpcIntent(r){
 var bonus={},amb=String(r.npcAmbition||'');
 if(amb==='Devenir plus fort')bonus['S’entraîner']=2.5;
 if(amb==='Explorer le monde')bonus['Voyager']=2.5;
 if(amb==='Faire fortune')bonus['S’enrichir']=2.8;
 if(amb==='Servir sa faction')bonus['Faire carrière']=1.8;
 if(amb==='Protéger ses proches')bonus['Soutenir ses proches']=2.5;
 if((r.npcPotential||0)-(r.npcPower||0)>30)bonus['S’entraîner']=(bonus['S’entraîner']||0)+.8;
 if((r.npcWealth||0)<3000)bonus['S’enrichir']=(bonus['S’enrichir']||0)+.7;
 if(r.role==='rival'&&r.challengeReady)bonus['Défier son rival']=1.8;
 var canPursueNemesis=r.nemesisRecognized&&!r.challengeReady&&game&&game.player&&game.player.ageMonths-(r.lastDuelAge==null?-999:r.lastDuelAge)>=8;if(canPursueNemesis)bonus['Poursuivre sa némésis']=2.0;
 if(r.role==='mentor')bonus['Former la relève']=1.3;
 if(!r.joinedOrganization&&!r.canonical&&(r.npcPower||0)>=58&&(r.careerLevel||0)>=4)bonus['Fonder son groupe']=(r.npcAmbition==='Faire fortune'||r.npcAmbition==='Devenir plus fort'?1.65:1.05);
 if(r.npcTrajectory==='Instable'&&(r.careerLevel||0)>=3)bonus['Rompre avec sa faction']=1.15;
 r.npcIntent=weightedPool(npcIntentPool(r),bonus,'npc');r.npcIntentMonths=2+Math.floor(R('npc')*7);return r.npcIntent
}
function npcCareerPromotionChance(r){
 var level=cl(r.careerLevel||0,0,6),trajectory=r.npcTrajectory||'Stable',chance=.16-level*.018;
 if(trajectory==='Ascension')chance+=.12;else if(trajectory==='Stable')chance+=.04;else if(trajectory==='Instable')chance-=.015;else if(trajectory==='Déclin')chance-=.07;
 if(r.npcAmbition==='Servir sa faction')chance+=.10;
 var expected=22+level*9;if((r.npcPower||0)>=expected+12)chance+=.07;else if((r.npcPower||0)<expected)chance-=.06;
 if((r.npcAgeMonths||0)<216)chance*=.72;
 return cl(chance,.035,.42)
}
function tryNpcCareerPromotion(r){
 if((r.npcAgeMonths||0)<180||r.careerLevel>=6)return false;
 if(R('npc')>=npcCareerPromotionChance(r))return false;
 r.careerLevel++;r.respect=cl(r.respect+2,0,100);return true
}
function resolveNpcIntent(r){
 var p=game.player,intent=r.npcIntent||assignNpcIntent(r),outcome='';
 if(intent==='S’entraîner'){var inc=.4+R('npc')*1.6;r.npcPower=cl(r.npcPower+inc,1,r.npcPotential);outcome='progresse grâce à un entraînement ciblé'}
 else if(intent==='Faire carrière'||intent==='Servir sa faction'){if(tryNpcCareerPromotion(r))outcome='progresse dans sa carrière : '+npcCareerRank(r);else outcome='consolide sa position et prépare la prochaine étape'}
 else if(intent==='Voyager'){var before=npcRegion(r);moveNpc(r);outcome=before===npcRegion(r)?'reste dans '+before:'part vers '+npcRegion(r)}
 else if(intent==='S’enrichir'){var gain=1200+Math.round(R('npc')*7000);r.npcWealth=(r.npcWealth||0)+gain;outcome='développe ses ressources personnelles'}
 else if(intent==='Soutenir ses proches'){if(npcNearby(r)){r.trust=cl(r.trust+2,0,100);r.loyalty=cl(r.loyalty+2,0,100);outcome='renforce ses liens dans ta région'}else outcome='reste attentif à ses proches à distance'}
 else if(intent==='Défier son rival'){if(r.role==='rival'&&npcNearby(r)&&p.ageMonths-r.lastDuelAge>=6){r.challengeReady=true;outcome='prépare un nouveau défi contre toi'}else outcome='cherche une occasion de mesurer ses progrès'}
 else if(intent==='Poursuivre sa némésis'){if(npcRegion(r)!==p.region){r.region=p.region;r.location=null;outcome='se rapproche de ta région pour relancer votre rivalité'}else{r.challengeReady=true;r.npcPower=cl(r.npcPower+.25+R('npc')*.65,1,r.npcPotential);outcome='prépare activement votre prochaine confrontation'}registerArcSignal('rival','relation',r.id,r.name,76,{region:p.region})}
 else if(intent==='Former la relève'){r.respect=cl(r.respect+1.5,0,100);outcome='consacre du temps à transmettre son expérience'}
 else if(intent==='Fonder son groupe'){
  var crewId='crew-npc-'+String(r.id)+'-'+Math.floor(p.ageMonths),crewName='Groupe de '+r.name,crew={id:crewId,name:crewName,faction:r.faction,region:npcRegion(r),power:cl(Math.round((r.npcPower||20)*.86),12,92),members:3+Math.floor(R('npc')*10),morale:60+Math.round(R('npc')*24),bounty:r.faction==='Pirates'?Math.round((6+(r.npcPower||20)*.8)*1000000):0,status:'active',ageMonths:0,victories:0,defeats:0,intention:null,intentionMonths:0,resources:38+Math.round(R('npc')*35),lastIntentOutcome:'fondé par '+r.name};
  game.world.crews.push(crew);r.npcCrewId=crewId;r.careerLevel=Math.max(r.careerLevel||0,4);outcome='fonde '+crewName+' et commence à poursuivre ses propres objectifs';recordWorldCrewAction(crew,'Fondation',r.name+' fonde son propre groupe.',4);rememberCausalMemory('npc-agency',r.name+' fonde son groupe',68,{kind:'npc-agency',relationId:r.id,subjectId:r.id,crewId:crewId,region:crew.region},'npc-agency:crew:'+r.id);if(npcNearby(r))tl('Une trajectoire prend son indépendance',r.name+' fonde '+crewName+' dans '+crew.region+'.','major')
 }
 else if(intent==='Rompre avec sa faction'){
  var oldFaction=r.faction;r.faction='Indépendant';r.careerLevel=Math.max(1,(r.careerLevel||0)-1);r.npcTrajectory=r.npcTrajectory==='Déclin'?'Stable':r.npcTrajectory;outcome='rompt avec '+oldFaction+' et poursuit désormais une voie indépendante';rememberCausalMemory('npc-agency',r.name+' quitte '+oldFaction,64,{kind:'npc-agency',relationId:r.id,subjectId:r.id,from:oldFaction,to:'Indépendant',region:npcRegion(r)},'npc-agency:faction:'+r.id);if(npcNearby(r))tl('Changement de trajectoire',r.name+' quitte '+oldFaction+' et devient indépendant.','major')
 }
 r.lastIntentOutcome=outcome;addRelationMemory(r,outcome+'.','intent');r.npcIntent=null;r.npcIntentMonths=0;return outcome
}
function npcIntentTick(r,m){if(r.status!=='active'||r.canonical)return;if(!r.npcIntent)assignNpcIntent(r);r.npcIntentMonths=Math.max(0,(r.npcIntentMonths||0)-m);if(r.npcIntentMonths<=0)resolveNpcIntent(r)}
function npcLinkKey(a,b){return[a,b].sort().join('|')}
function npcLinkBetween(a,b){var k=npcLinkKey(a.id,b.id);return(game.world.npcLinks||[]).find(function(x){return x.key===k})||null}
function ensureNpcLink(a,b){if(!a||!b||a.id===b.id)return null;var links=game.world.npcLinks||(game.world.npcLinks=[]),link=npcLinkBetween(a,b);if(link)return link;var dip=diplomacy(a.faction,b.faction),base=(a.faction===b.faction?22:0)+dip*.18+(R('npc')-.5)*35;link={key:npcLinkKey(a.id,b.id),a:a.id,b:b.id,bond:cl(base,-60,60),type:'neutre',months:0};links.push(link);if(links.length>40)links.splice(0,links.length-40);return link}
function npcSocialTick(m){
 var links=game.world.npcLinks||(game.world.npcLinks=[]),active=game.relations.filter(function(r){return r.status==='active'&&!r.canonical&&!r.joinedOrganization});
 for(var i=0;i<active.length;i++)for(var j=i+1;j<active.length;j++){var a=active[i],b=active[j];if(npcRegion(a)!==npcRegion(b))continue;var link=npcLinkBetween(a,b),dip=diplomacy(a.faction,b.faction),chance=cl(.0025*m,0,.35);if(!link&&R('npc')<chance)link=ensureNpcLink(a,b);if(link){link.months+=m;link.bond=cl(link.bond+(a.faction===b.faction?.08:-.01)*m+dip*.0015*m+(R('npc')-.5)*.3*m,-100,100);var old=link.type;link.type=link.bond>=55?'alliés':link.bond<=-55?'rivaux':'neutre';if(old!==link.type&&link.type!=='neutre'){addRelationMemory(a,'Développe une relation de '+link.type+' avec '+b.name+'.','network');addRelationMemory(b,'Développe une relation de '+link.type+' avec '+a.name+'.','network')}}}
 if(links.length>40)links.splice(0,links.length-40)
}

function npcTick(m){
 var p=game.player;
 npcSocialTick(m);game.relations.forEach(function(r){
  r=normalizeRelation(game,r,0);if(r.status==='dead')return;r.npcAgeMonths+=m;
  if(r.canonical&&r.actorName){var a=canonActor(r.actorName);if(a){var was=r.status;r.faction=a.faction;r.region=a.region;r.npcPower=actorPower(a);r.status=a.status==='dead'?'dead':a.status==='wounded'?'wounded':'active';if(was!=='dead'&&r.status==='dead'){addRelationMemory(r,'Sa trajectoire s’achève dans le monde vivant.','death');if(r.id===p.life.partnerId){p.life.partnerId=null;p.life.relationshipStatus='En deuil';migrateLifeDirector(p).lastRomanceAge=p.ageMonths;tl('Deuil',r.name+' est décédé. Ta vie familiale en est profondément marquée.','major')}}}return}
  if(r.injuryMonths>0){r.injuryMonths-=m;if(r.injuryMonths<=0){r.injuryMonths=0;r.status='active';addRelationMemory(r,'Se remet de ses blessures.','recovery')}return}
  if(r.status!=='active')return;
  npcIntentTick(r,m);
  if(r.id===p.life.partnerId&&!r.longDistance){if(partnerNearPlayer(r)){if(!p.travel){r.region=p.region;r.location=p.island}}else r.longDistance=true}
  if(r.joinedOrganization){var org=p.organization,mem=org&&org.members.find(function(m){return m.linkedRelationId===r.id});if(mem&&mem.status==='active'){r.region=p.region;r.location=p.island;r.npcPower=cl(Math.max(r.npcPower,mem.power),1,100);mem.power=r.npcPower;r.injuryMonths=mem.injuryMonths||0;return}else{r.joinedOrganization=false;if(r.type==='organization')r.type='social';addRelationMemory(r,'N’appartient plus à ton organisation.','organization')}}
  var gap=Math.max(0,r.npcPotential-r.npcPower),ageFactor=r.npcAgeMonths<144?.42:r.npcAgeMonths<180?.68:1,growth=gap/100*relationGrowthRate(r)*m*5*ageFactor;r.npcPower=cl(r.npcPower+growth,1,r.npcPotential);
  if(r.npcTrajectory==='Instable'&&R('npc')<.008*m)r.npcPower=cl(r.npcPower-(1+R('npc')*3),1,r.npcPotential);
  var passiveCareerChance=.0014*m*(r.npcTrajectory==='Ascension'?1.35:r.npcTrajectory==='Déclin'?.55:r.npcTrajectory==='Instable'?.85:1)*(r.npcAmbition==='Servir sa faction'?1.35:1)*cl(1-(r.careerLevel||0)*.10,.35,1);if(r.npcAgeMonths>=180&&r.careerLevel<6&&R('npc')<passiveCareerChance&&tryNpcCareerPromotion(r)){addRelationMemory(r,'Progresse dans sa carrière : '+npcCareerRank(r)+'.','career')}
  var localDanger=35;var localPlaces=Object.keys(PL).filter(function(n){return PL[n][0]===npcRegion(r)});if(localPlaces.length)localDanger=localPlaces.reduce(function(a,n){return a+PL[n][1]},0)/localPlaces.length;var youth=r.npcAgeMonths<180,incidentChance=r.npcAgeMonths<144?0:.004*m*(.7+localDanger/70)*(youth?.45:1);if(R('npc')<incidentChance){var effectiveDanger=youth?localDanger*.55:localDanger,odds=cl(.48+(r.npcPower-effectiveDanger)/130,.12,.9);if(R('npc')<odds){r.npcWins++;r.npcPower=cl(r.npcPower+.3+R('npc')*.8,1,r.npcPotential);addRelationMemory(r,youth?'Se distingue lors d’une épreuve risquée de jeunesse.':'Surmonte un affrontement dangereux pendant son propre voyage.','incident')}else{r.npcLosses++;r.injuryMonths=youth?1:1+Math.floor(R('npc')*4);r.status='wounded';addRelationMemory(r,youth?'Se blesse lors d’une épreuve de jeunesse.':'Est blessé lors d’un incident autonome.','injury');return}}
  if(r.npcAgeMonths>=180&&r.id!==p.life.partnerId&&R('npc')<.003*m)moveNpc(r);
  if(r.role==='rival'&&r.npcAgeMonths>=144&&p.ageMonths>=144&&r.rivalry>=55&&npcNearby(r)&&p.ageMonths-r.lastDuelAge>=6&&R('npc')<.012*m){r.challengeReady=true;addRelationMemory(r,'Te provoque pour mesurer vos progrès.','rival')}
  if(r.role==='mentor'&&power()>r.npcPower+15&&r.mentorSessions>=3&&!r.peerRecognized){r.peerRecognized=true;r.respect=cl(r.respect+8,0,100);addRelationMemory(r,'Te reconnaît désormais comme un pair.','mentor')}
  var years=r.npcAgeMonths/12,dip=(r.faction==='Civil'||r.faction==='Indépendant'||r.faction===p.faction)?0:diplomacy(p.faction,r.faction),protectedBond=r.id===p.life.partnerId||r.type==='family'||r.role==='parent'||r.role==='frère / sœur';
  if(!protectedBond&&dip<=-55){var resilience=.35+.65*(1-r.trust/100);r.trust=cl(r.trust-.045*m*resilience,0,100);r.rivalry=cl(r.rivalry+.06*m*resilience,0,100);if(!r.canonical&&r.role!=='mentor'&&r.role!=='rival'&&r.trust<28&&r.rivalry>=62){r.role='rival';addRelationMemory(r,'Les tensions entre vos factions finissent par rendre votre opposition personnelle.','rival')}}
  else if(dip>=55&&npcNearby(r)){r.trust=cl(r.trust+.025*m,0,100);r.respect=cl(r.respect+.02*m,0,100)}
  updateRelationshipTrajectory(r);
  if((r.favorBalance||0)<-2){r.trust=cl(r.trust-.12*m*Math.abs(r.favorBalance),0,100);r.loyalty=cl(r.loyalty-.08*m*Math.abs(r.favorBalance),0,100)}if(years>72&&R('npc')<Math.pow((years-70)/38,2)*.002*m){r.status='dead';if(r.joinedOrganization&&p.organization){var dm=p.organization.members.find(function(mem){return mem.linkedRelationId===r.id&&mem.status==='active'});if(dm)dm.status='dead'}r.joinedOrganization=false;addRelationMemory(r,'Décède après une longue vie.','death');if(r.id===p.life.partnerId){p.life.partnerId=null;p.life.relationshipStatus='En deuil';migrateLifeDirector(p).lastRomanceAge=p.ageMonths;tl('Deuil',r.name+' est décédé. Ta vie familiale en est profondément marquée.','major')}else tl('Une relation disparaît',r.name+' est décédé.','major')}
 })
}
function askMentorship(id){
 var p=game.player,r=relationById(id);if(!r||!npcNearby(r)||r.status!=='active')return toast('Cette personne n’est pas disponible dans ta région.');if(r.role==='mentor')return toast(r.name+' est déjà ton mentor.');if(relationPower(r)<power()+8)return toast('Cette personne n’a pas assez d’avance sur toi pour devenir un mentor crédible.');if(r.respect<55||r.trust<38)return toast('Il faut davantage de respect et de confiance.');if(!canonicalFreedom(r))return toast('Sa trajectoire canonique reste encore trop contrainte par le monde.');if(!useSocialAction())return;
 var chance=cl(.35+r.respect/220+r.trust/300,.25,.9);if(R('npc')<chance){r.role='mentor';r.rivalry=cl(r.rivalry-10,0,100);r.respect=cl(r.respect+5,0,100);addRelationMemory(r,'Accepte de devenir ton mentor.','mentor');tl('Mentorat',r.name+' accepte de guider ta progression.','major')}else{r.respect=cl(r.respect-2,0,100);addRelationMemory(r,'Refuse pour l’instant de devenir ton mentor.','mentor')}save();render()
}
function trainWithMentor(id){
 var p=game.player,r=relationById(id);if(!r||r.role!=='mentor'||!npcNearby(r)||r.status!=='active')return toast('Ton mentor doit être actif dans ta région.');if(!useSocialAction())return;
 var skill=r.npcSpecialty||'Combat',before=p.skills[skill]||0,peer=!!r.peerRecognized,gained=gain(skill,(peer?.65:1.4)+Math.max(0,relationPower(r)-power())*(peer?.006:.018)+R('npc')*(peer?.35:.8));r.mentorSessions++;r.respect=cl(r.respect+(peer?.5:1.5),0,100);r.trust=cl(r.trust+1,0,100);
 var cap=p.caps[skill]||90,abs=p.absoluteCaps&&p.absoluteCaps[skill]!=null?p.absoluteCaps[skill]:100;if(!peer&&before>=cap-.8&&cap>=abs-.05&&abs<100&&r.respect>=82&&r.trust>=68&&relationPower(r)>=Math.max(78,power()+6)){attemptApexBreakthrough('mentor',82,[skill]);cap=p.caps[skill]||cap;abs=p.absoluteCaps&&p.absoluteCaps[skill]!=null?p.absoluteCaps[skill]:abs}if(!peer&&before>=cap-.8&&cap<abs&&r.respect>=72&&r.trust>=55&&R('npc')<.18){var oldCap=cap;p.caps[skill]=cl(cap+1+Math.floor(R('npc')*2),cap,abs);migrateProgression(game,p).breakthroughs.push({age:age(),key:skill,from:oldCap,to:p.caps[skill],context:'mentor'});migrateProgression(game,p).breakthroughs=migrateProgression(game,p).breakthroughs.slice(-20);addRelationMemory(r,'T’aide à dépasser une limite en '+skill+'.','breakthrough');tl('Percée avec un mentor',r.name+' t’aide à repousser ton plafond en '+skill+'.','major')}else if(peer){addRelationMemory(r,'Vous vous entraînez désormais comme deux pairs en '+skill+'.','peer');tl('Entraînement entre pairs','Avec '+r.name+', la relation de maître à élève a laissé place à un échange plus équilibré.')}else{addRelationMemory(r,'Séance de '+skill+' partagée.','mentor');tl('Entraînement avec '+r.name,'Ta maîtrise de '+skill+' progresse de '+gained.toFixed(1)+'.')}
 save();render()
}
function declareRivalry(id){
 var r=relationById(id);if(!r||r.id===game.player.life.partnerId||r.status!=='active')return;if(!npcNearby(r))return toast('Cette personne n’est pas dans ta région.');if(r.canonical&&!canonicalFreedom(r))return toast('Le canon résiste encore à une rivalité personnelle aussi importante.');if(!useSocialAction())return;r.role='rival';r.rivalry=Math.max(r.rivalry,50);r.respect=cl(r.respect+3,0,100);addRelationMemory(r,'Votre relation devient une rivalité assumée.','rival');tl('Nouvelle rivalité',r.name+' devient un rival récurrent.','major');save();render()
}
function rivalStage(r){
 var total=(r.rivalWins||0)+(r.rivalLosses||0);if(r.role!=='rival')return'';if(total>=5&&r.rivalry>=78)return'Némésis';if(total>=2)return'Rival confirmé';return'Rivalité naissante'
}
function syncRivalryMilestone(r,previousStage){
 r.rivalMilestones=Array.isArray(r.rivalMilestones)?r.rivalMilestones:[];var stage=rivalStage(r),changed=stage!==previousStage&&r.rivalMilestones.indexOf(stage)<0,total=(r.rivalWins||0)+(r.rivalLosses||0);
 if(changed){r.rivalMilestones.push(stage);
  if(stage==='Rival confirmé'){tl('Rivalité confirmée',r.name+' devient un adversaire récurrent de ta trajectoire.','major');recordSignatureMoment('Rivalité — '+r.name,'Votre opposition devient une rivalité confirmée.','rivalry',64);signalPersonalChapter('rivalry','Rivalité avec '+r.name,14,'rival-confirmed:'+r.id,r.id);scheduleConsequence('rivalry','Rivalité — '+r.name,'Votre opposition cherche une nouvelle occasion de refaire surface.',6+R('memory')*8,{relationId:r.id||null,relationName:r.name,stage:stage},72,'rival:'+(r.id||r.name)+':confirmed')}
  else if(stage==='Némésis'){r.nemesisRecognized=true;registerArcSignal('rival','relation',r.id,r.name,92,{region:npcRegion(r)});r.rivalry=cl(Math.max(r.rivalry,82),0,100);addRelationMemory(r,'Votre rivalité est désormais connue comme une véritable némésis.','nemesis');tl('Némésis',r.name+' devient ton adversaire personnel le plus marquant.','major');recordSignatureMoment('Némésis — '+r.name,'Cette rivalité devient l’un des fils majeurs de ta carrière.','rivalry',92);signalPersonalChapter('rivalry','Rivalité avec '+r.name,26,'nemesis:'+r.id,r.id);scheduleConsequence('rivalry','Némésis — '+r.name,'Une véritable némésis ne disparaît pas simplement parce que quelques mois passent.',4+R('memory')*7,{relationId:r.id||null,relationName:r.name,stage:stage},92,'rival:'+(r.id||r.name)+':nemesis')}
 }
 if(stage==='Rival confirmé'&&total>=4&&r.rivalMilestones.indexOf('Rivalité durable')<0){r.rivalMilestones.push('Rivalité durable');addRelationMemory(r,'Votre rivalité a survécu à plusieurs confrontations.','rival');signalPersonalChapter('rivalry','Rivalité avec '+r.name,12,'rival-durable:'+r.id,r.id)}
 return stage
}
function reconcileRival(id){
 var r=relationById(id);if(!r||r.role!=='rival'||!npcNearby(r)||r.status!=='active')return toast('Ce rival n’est pas disponible ici.');var total=(r.rivalWins||0)+(r.rivalLosses||0);if(total<3||r.respect<65||r.trust<40||r.affection<40)return toast('Votre rivalité n’a pas encore assez mûri pour devenir autre chose.');if(!useSocialAction())return;
 r.role='ami';r.rivalResolved=true;r.rivalry=cl(r.rivalry-45,0,100);r.affection=cl(r.affection+8,0,100);r.trust=cl(r.trust+6,0,100);addRelationMemory(r,'Après plusieurs duels, votre rivalité se transforme en respect durable.','reconciliation');tl('Rivalité apaisée',r.name+' n’est plus seulement un adversaire : un respect véritable s’installe.','major');save();render()
}
function challengeRival(id){
 var p=game.player,r=relationById(id);if(!r||r.role!=='rival'||r.status!=='active'||!npcNearby(r))return toast('Ce rival n’est pas disponible ici.');if(p.ageMonths<144||r.npcAgeMonths<144)return toast('Cette rivalité est encore trop jeune pour devenir un véritable duel.');if(r.canonical&&!canonicalFreedom(r))return toast('Sa trajectoire canonique ne permet pas encore un duel personnel de cette importance.');if(p.health<45)return toast('Ta santé est trop basse pour provoquer un rival.');if(p.ageMonths-r.lastDuelAge<3)return toast('Votre dernier duel est encore trop récent.');if(!useSocialAction())return;
 var previousStage=rivalStage(r),danger=cl(relationPower(r),12,98),ok=fight(danger,'Duel contre '+r.name,r);r.lastDuelAge=p.ageMonths;r.challengeReady=false;r.rivalry=cl(r.rivalry+2,0,100);recordNpcCombatLearning(r,ok,game.lastCombat&&game.lastCombat.terrain);combatWorldReaction(r,ok);
 if(!game.alive)return;if(ok){r.rivalLosses++;r.respect=cl(r.respect+6,0,100);r.affection=cl(r.affection+1,0,100);addRelationMemory(r,'Tu remportes un duel contre lui/elle.','rival')}else{r.rivalWins++;r.respect=cl(r.respect+3,0,100);addRelationMemory(r,'Remporte un duel contre toi.','rival')}
 if(r.rivalLosses>=3&&r.rivalLosses>=r.rivalWins+2){r.npcTrajectory='Ascension';r.npcPotential=cl(Math.max(r.npcPotential,r.npcPower+8),0,100)}syncRivalryMilestone(r,previousStage)
 save();render()
}
function relationOrgRole(r){
 var roles=(ORG_CONFIG[game.player.faction]||ORG_CONFIG.Civil).roles,s=r.npcSpecialty;if(s==='Navigation')return roles.find(function(x){return /Navig/i.test(x)})||roles[0];if(s==='Médecine')return roles.find(function(x){return /Médec/i.test(x)})||roles[0];if(s==='Discrétion')return roles.find(function(x){return /Infil|Renseig|Investig/i.test(x)})||roles[0];if(s==='Commandement')return roles.find(function(x){return /Quartier|Logist|Associ/i.test(x)})||roles[0];return roles.find(function(x){return /Combat|Combatt|Duell|Agent/i.test(x)})||roles[0]
}
function recruitKnownRelation(id){
 var p=game.player,r=relationById(id),o=ensureOrganization();if(!r||!o)return;if(r.npcAgeMonths<180)return toast('Cette relation est encore trop jeune pour rejoindre une organisation professionnelle.');if(r.canonical)return toast('Les personnages canoniques restent autonomes dans cette version.');if(r.joinedOrganization)return toast(r.name+' appartient déjà à ton organisation.');if(o.authority!=='leader')return toast('Il faut diriger ton organisation.');if(!npcNearby(r))return toast(r.name+' n’est pas dans ta région.');if(r.faction!==p.faction&&r.faction!=='Civil')return toast('Sa faction est incompatible avec ton organisation.');if(r.trust<58||r.loyalty<52||r.respect<42)return toast('Le lien n’est pas assez solide pour un recrutement.');if(o.members.filter(function(m){return m.status==='active'}).length>=organizationCapacity())return toast('Ton organisation a atteint sa capacité.');if(!useOrganizationAction())return;
 var role=relationOrgRole(r),member={id:'orgm-rel-'+r.id,name:r.name,role:role,power:relationPower(r),loyalty:r.loyalty,morale:cl((r.affection+r.trust)/2,35,95),months:0,injuryMonths:r.injuryMonths||0,status:'active',origin:r.region,linkedRelationId:r.id};o.members.push(member);r.joinedOrganization=true;r.faction=p.faction;r.type='organization';r.location=p.island;r.region=p.region;r.loyalty=cl(r.loyalty+8,0,100);addRelationMemory(r,'Rejoint '+o.name+' comme '+role+'.','organization');tl('Recrutement relationnel',r.name+' rejoint '+o.name+' comme '+role+'.','major');save();render()
}

function favorLabel(r){var v=r.favorBalance||0;return v>0?'te doit '+v+' service'+(v>1?'s':''):v<0?'tu lui dois '+Math.abs(v)+' service'+(v<-1?'s':''):'aucune dette'}
function helpRelation(id){
 var p=game.player,r=relationById(id);if(!r||r.status!=='active'||!npcNearby(r))return toast('Cette personne n’est pas disponible ici.');if(!useSocialAction())return;var cost=p.ageMonths>=180?Math.round(500+relationPower(r)*22):0;if(p.money<cost){p.life.socialActions++;return toast('Il te manque des Berry pour l’aider concrètement.')}p.money-=cost;r.favorBalance=cl((r.favorBalance||0)+1,-5,5);r.trust=cl(r.trust+4,0,100);r.loyalty=cl(r.loyalty+3,0,100);r.affection=cl(r.affection+2,0,100);addRelationMemory(r,'Tu l’aides lorsqu’il/elle en avait besoin.','favor');tl('Service rendu','Tu aides '+r.name+' et renforces votre confiance.');save();render()
}
function askRelationFavor(id){
 var p=game.player,r=relationById(id);if(!r||r.status!=='active'||!npcNearby(r))return toast('Cette personne n’est pas disponible ici.');if(r.trust<48)return toast('La confiance est insuffisante pour demander un service.');var balance=r.favorBalance||0;if(balance<=-4)return toast('Tu lui dois déjà trop de services. Rends-lui la pareille avant de demander davantage.');if(!useSocialAction())return;var ch=cl(.40+r.trust/260+r.loyalty/360+Math.max(0,balance)*.09+Math.min(0,balance)*.08,.12,.95);
 if(R('npc')>=ch){r.trust=cl(r.trust-3,0,100);addRelationMemory(r,'Refuse une demande de service trop lourde.','favor');tl('Service refusé',r.name+' ne peut pas t’aider cette fois. Aucune dette nouvelle n’est créée.');save();render();return}
 r.favorBalance=cl(balance-1,-5,5);r.loyalty=cl(r.loyalty+1,0,100);var spec=r.npcSpecialty||'Combat',msg='';
 if(r.npcAgeMonths<180){p.energy=cl(p.energy+5,0,100);msg='t’aide dans une petite tâche du quotidien'}
 else if(spec==='Médecine'){p.health=cl(p.health+16,0,100);if(p.conditions.length&&R('npc')<.55)p.conditions.shift();msg='t’aide à récupérer physiquement'}
 else if(spec==='Discrétion'){var j=migrateJustice(p);j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)-12,0,100);msg='fait jouer ses contacts pour diminuer la pression locale'}
 else if(spec==='Navigation'){p.energy=cl(p.energy+18,0,100);msg='t’aide à préparer ta prochaine traversée'}
 else if(spec==='Commandement'){p.reputation=cl(p.reputation+3,0,100);msg='met sa réputation au service de ton réseau'}
 else{var support=700+Math.round(relationPower(r)*18);p.money+=support;msg='te fournit '+support.toLocaleString('fr-FR')+' B de soutien'}
 addRelationMemory(r,'Accepte de te rendre un service : '+msg+'.','favor');tl('Service de '+r.name,r.name+' '+msg+'.','major');save();render()
}
function approachCanonicalActor(name){
 var p=game.player,a=canonActor(name);if(p.travel)return toast('Impossible d’organiser cette rencontre pendant une traversée.');if(!a||a.status!=='active'||a.region!==p.region)return toast('Cet acteur n’est pas disponible dans ta région.');var existing=relationForActor(name);if(existing&&p.ageMonths-existing.lastCanonInteractionAge<2)return toast('Cette rencontre est trop récente pour provoquer un nouvel échange important.');if(existing){if(!useSocialAction())return;existing.lastCanonInteractionAge=p.ageMonths;existing.respect=cl(existing.respect+1+R('npc')*3,0,100);existing.trust=cl(existing.trust+R('npc')*2,0,100);addRelationMemory(existing,'Nouvelle rencontre dans '+p.region+'.','canon');tl('Retrouvailles',name+' te reconnaît désormais plus facilement.');save();render();return}
 if(!useSocialAction())return;var hostile=diplomacy(p.faction,a.faction)<-35,gate=.20+p.reputation/260+influenceMetrics().score/420+(a.faction===p.faction?.18:0)-(a.importance||80)/620-(hostile?.10:0),chance=cl(gate,.05,.82);
 if(R('npc')<chance){var r=bondCanonicalActor(a,'Tu prends l’initiative de l’aborder dans '+p.region+'.');r.lastCanonInteractionAge=p.ageMonths;r.respect=cl(r.respect+4,0,100);r.trust=cl(r.trust+2,0,100);tl('Rencontre marquante',name+' accepte un véritable échange avec toi.','canon')}
 else{tl('Occasion manquée',name+' ne t’accorde qu’un instant avant de poursuivre sa route.');if(hostile&&actorPower(a)>power()+35&&R('npc')<.12)registerCrime('Incident lors d’une rencontre avec '+name,2,true)}
 save();render()
}
function seekMentor(){
 var p=game.player;if(p.ageMonths<144)return toast('Tu es encore trop jeune pour rechercher un mentor structuré.');var current=game.relations.filter(function(r){return r.status==='active'&&r.role==='mentor'});if(current.length>=2)return toast('Tu as déjà suffisamment de mentors actifs. Approfondis ces liens.');if(!useSocialAction())return;var existing=game.relations.filter(function(r){return r.status==='active'&&npcNearby(r)&&relationPower(r)>power()+10&&!r.canonical});if(existing.length){var r=pk(existing,'npc');r.respect=cl(r.respect+4,0,100);r.trust=cl(r.trust+3,0,100);addRelationMemory(r,'Tu sollicites ses conseils.','mentor');tl('Piste de mentorat',r.name+' semble disposé à observer ta progression.');save();render();return}
 var r=createRelation('mentor');r.region=p.region;r.location=p.island;r.npcPower=cl(power()+14+R('npc')*16,20,94);r.npcPotential=cl(Math.max(r.npcPower+5,72+R('npc')*24),r.npcPower,100);r.respect=Math.max(r.respect,64);r.trust=Math.max(r.trust,48);addRelationMemory(r,'Rencontré en recherchant un guide expérimenté.','mentor');tl('Mentor potentiel',r.name+' accepte de suivre tes progrès.','major');save();render()
}

function defaultLife(){return{relationshipStatus:'Célibataire',partnerId:null,housingLevel:0,assets:{property:0,business:0,ship:0,treasure:0},livingCostsPaid:0,debt:0,debtPeak:0,debtInterestPaid:0,netWorthPeak:0,socialActions:2,lastExpense:0,totalBusinessIncome:0}}
function defaultLifeDirector(){return{lastMobilityAge:-999,lastRomanceAge:-999,lastFamilyAge:-999,lastCareerTurnAge:-999,lastConvergenceAge:-999,familyDeferredUntil:0,familyDeferrals:0,familyAutoPaused:false,familyPausedRelationId:null,journeyOffers:0,acceptedMoves:0,romanceOffers:0,familyOffers:0,careerTurns:0,convergenceSeq:0,legacyChoice:null,legendEvidencePeak:0,legendDistinctivePeak:false,history:[],causalMemory:[],convergenceHistory:[],chapterSeq:0,activeChapters:[],chapterHistory:[]}}
function migrateLifeDirector(p){p.lifeDirector=p.lifeDirector||defaultLifeDirector();var d=p.lifeDirector;['lastMobilityAge','lastRomanceAge','lastFamilyAge','lastCareerTurnAge','lastConvergenceAge'].forEach(function(k){if(d[k]==null)d[k]=-999});['journeyOffers','acceptedMoves','romanceOffers','familyOffers','careerTurns','convergenceSeq','chapterSeq','familyDeferredUntil','familyDeferrals'].forEach(function(k){d[k]=d[k]||0});if(d.familyAutoPaused==null)d.familyAutoPaused=false;if(d.familyPausedRelationId===undefined)d.familyPausedRelationId=null;if(d.legacyChoice===undefined)d.legacyChoice=null;if(d.legendEvidencePeak==null||!Number.isFinite(Number(d.legendEvidencePeak)))d.legendEvidencePeak=0;else d.legendEvidencePeak=Math.max(0,Number(d.legendEvidencePeak));if(d.legendDistinctivePeak==null)d.legendDistinctivePeak=false;else d.legendDistinctivePeak=!!d.legendDistinctivePeak;d.history=Array.isArray(d.history)?d.history.slice(-30):[];d.causalMemory=Array.isArray(d.causalMemory)?d.causalMemory.slice(-36):[];d.convergenceHistory=Array.isArray(d.convergenceHistory)?d.convergenceHistory.slice(-20):[];d.activeChapters=Array.isArray(d.activeChapters)?d.activeChapters.slice(-3):[];d.chapterHistory=Array.isArray(d.chapterHistory)?d.chapterHistory.slice(0,20):[];return d}
function recordLifeDirector(kind,text,data){var d=migrateLifeDirector(game.player),item={age:age(),kind:kind,text:text||'',data:data||null};d.history.push(item);d.history=d.history.slice(-30);return item}
function rememberCausalMemory(kind,title,weight,data,key){
 if(!game||!game.player)return null;var d=migrateLifeDirector(game.player),now=game.player.ageMonths,stable=key||kind+':'+String(title||'memory'),existing=d.causalMemory.find(function(x){return x.key===stable});
 if(existing){existing.weight=cl(Math.max(existing.weight||0,weight||0)+Math.min(8,(weight||0)*.08),0,100);existing.lastAge=now;existing.echoes=(existing.echoes||0)+1;existing.data=Object.assign({},existing.data||{},data||{});return existing}
 var item={id:'memory-'+(++d.convergenceSeq),key:stable,kind:kind||'life',title:title||'Souvenir marquant',weight:cl(weight||45,0,100),createdAge:now,lastAge:now,echoes:0,data:data||{}};d.causalMemory.push(item);d.causalMemory=d.causalMemory.slice(-36);return item
}
function causalMemoryPressure(kind,subject){
 var d=migrateLifeDirector(game.player),now=game.player.ageMonths;return(d.causalMemory||[]).reduce(function(best,x){var data=x.data||{},match=!kind||x.kind===kind||data.kind===kind,subjectMatch=!subject||String(data.subjectId||data.sourceId||data.sagaId||data.relationId||'')===String(subject)||String(x.key||'').indexOf(String(subject))>=0;if(!match||!subjectMatch)return best;var age=Math.max(0,now-(x.lastAge==null?now:x.lastAge)),fresh=cl(1-age/120,.18,1),score=(x.weight||0)*fresh+Math.min(12,(x.echoes||0)*2);return Math.max(best,score)},0)
}
function narrativeConnections(fronts){
 if(!game||!game.player)return[];fronts=fronts||narrativeFronts(6);var p=game.player,w=game.world||{},out=[],seen={};
 function push(kind,title,summary,score,a,b,data){var key=kind+':'+String((a&&a.id)||'')+':'+String((b&&b.id)||'');if(seen[key])return;seen[key]=1;out.push({id:key,kind:kind,title:title,summary:summary,score:Math.round(cl(score||0,0,120)*10)/10,a:a||null,b:b||null,data:data||{}})}
 var mission=fronts.find(function(f){return f.kind==='mission'}),saga=fronts.find(function(f){return f.kind==='saga'}),rival=fronts.find(function(f){return f.kind==='rivalry'}),relation=fronts.find(function(f){return f.kind==='relationship'}),story=fronts.find(function(f){return f.kind==='story'});
 if(mission&&saga&&mission.sourceId===saga.sourceId)push('mission-saga','Mission dans la saga','Ta mission agit directement sur '+saga.title+'.',102,mission,saga,{sagaId:saga.sourceId});
 if(rival&&saga&&rival.region===saga.region){var rr=relationById(rival.sourceId),near=rr&&npcNearby(rr);if(near)push('rival-saga','Rivalité dans la tempête','Ta rivalité avec '+rr.name+' se déroule au cœur de '+saga.title+'.',86+(rr.rivalry||0)*.12,rival,saga,{sagaId:saga.sourceId,relationId:rr.id})}
 if(relation&&saga){var pr=relationById(relation.sourceId);if(pr&&(npcRegion(pr)===saga.region||partnerNearPlayer(pr)))push('family-saga','Vie privée sous pression',pr.name+' est directement exposé aux bouleversements de '+saga.title+'.',74+(pr.trust||0)*.08,relation,saga,{sagaId:saga.sourceId,relationId:pr.id})}
 if(story&&saga&&story.region===saga.region)push('story-saga','Deux histoires se rencontrent',story.title+' évolue dans le même espace que '+saga.title+'.',68+(story.score||0)*.16,story,saga,{sagaId:saga.sourceId,storyId:story.sourceId});
 var localSaga=((w.worldState||{}).worldSagas||[]).filter(function(x){return x.status==='active'&&x.region===p.region}).sort(function(a,b){return(b.pressure||0)-(a.pressure||0)})[0];
 if(localSaga&&p.career!=='Aucune'&&!careerRecord().retired&&(localSaga.a===p.faction||localSaga.b===p.faction)){var careerFront={id:'career:'+p.faction,kind:'career',title:p.rank+' • '+p.faction,region:p.region,sourceId:p.faction};push('career-saga','Carrière au premier plan','Ton rang de '+p.rank+' rend '+localSaga.title+' professionnellement difficile à ignorer.',66+(localSaga.pressure||0)*.24+rankIndex()*3,careerFront,{id:'saga:'+localSaga.id,kind:'saga',title:localSaga.title,region:localSaga.region,sourceId:localSaga.id},{sagaId:localSaga.id})}
 if(localSaga&&p.organization){var org=p.organization,orgFront={id:'org:'+String(org.id||org.name),kind:'organization',title:org.name||'Ton organisation',region:p.region,sourceId:org.id||org.name};push('organization-saga','Ton groupe est concerné',(org.name||'Ton organisation')+' doit composer avec '+localSaga.title+'.',58+(org.renown||0)*.16+(localSaga.pressure||0)*.20,orgFront,{id:'saga:'+localSaga.id,kind:'saga',title:localSaga.title,region:localSaga.region,sourceId:localSaga.id},{sagaId:localSaga.id,organization:true})}
 var hotMemory=(migrateLifeDirector(p).causalMemory||[]).slice().sort(function(a,b){return(b.weight||0)-(a.weight||0)})[0];if(hotMemory&&p.ageMonths-(hotMemory.lastAge||0)<=72&&fronts.length){var f=fronts[0],memScore=(hotMemory.weight||0)*.62+Math.min(18,(hotMemory.echoes||0)*3);if(memScore>=42)push('memory-echo','Écho du passé',hotMemory.title+' recommence à peser sur '+f.title+'.',memScore,{id:'memory:'+hotMemory.id,kind:'memory',title:hotMemory.title,sourceId:hotMemory.id},f,{memoryId:hotMemory.id})}
 out.sort(function(a,b){return b.score-a.score||a.title.localeCompare(b.title)});return out
}
function convergenceCandidate(){
 var d=migrateLifeDirector(game.player),links=narrativeConnections(narrativeFronts(6)),now=game.player.ageMonths;if(!links.length||now-(d.lastConvergenceAge==null?-999:d.lastConvergenceAge)<16)return null;var top=links[0];if((top.score||0)<64)return null;var recent=(d.convergenceHistory||[]).slice(-6);if(recent.some(function(x){return x.key===top.id&&now-(x.ageMonths||0)<72}))return null;return top
}
function personalChapterArchiveTitle(ch){
 var title=ch.title||'Chapitre de vie',sources=ch.sources||[],values=[];
 function collect(prefix){values=[];sources.forEach(function(s){if(typeof s==='string'&&s.indexOf(prefix)===0){var v=s.slice(prefix.length);if(v&&values.indexOf(v)<0)values.push(v)}});return values}
 function route(v){var parts=String(v||'').split('>');return parts.length===2&&parts[0]&&parts[1]?{from:parts[0],to:parts[1]}:null}
 if(ch.kind==='journey'){
  collect('journey:');sources.forEach(function(s){if(typeof s==='string'&&s.indexOf('relocation:')===0){var v=s.slice(11);if(v&&values.indexOf(v)<0)values.push(v)}});
  if(values.length===1){var one=route(values[0]);return one?'Traversée de '+one.from+' à '+one.to:'Traversée vers '+values[0]}
  if(values.length>1){var first=route(values[0]),last=route(values[values.length-1]),from=first?first.from:values[0],to=last?last.to:values[values.length-1];return'Route de '+from+' à '+to}
 }
 if(ch.kind==='career'){var promos=collect('promotion:');if(promos.length)return'Ascension jusqu’à '+promos[promos.length-1];var turns=[];sources.forEach(function(s){if(typeof s==='string'&&s.indexOf('career-turn:')===0){var v=s.slice(12);if(v&&turns.indexOf(v)<0)turns.push(v)}});if(turns.length)return'Réorientation vers '+turns[turns.length-1]}
 if(ch.kind==='family'&&title.indexOf('Foyer avec ')===0){
  var partner=title.slice(11),married=sources.some(function(s){return typeof s==='string'&&(s.indexOf('marriage:')===0||s.indexOf('manual-marriage:')===0)}),childIds=[];
  sources.forEach(function(s){if(typeof s!=='string')return;var prefix=s.indexOf('manual-child:')===0?'manual-child:':s.indexOf('child:')===0?'child:':null;if(prefix){var id=s.slice(prefix.length);if(id&&childIds.indexOf(id)<0)childIds.push(id)}});
  var childNames=childIds.map(function(id){var c=(game.player.children||[]).find(function(x){return x.id===id});return c&&c.name||''}).filter(Boolean);
  if(married&&childIds.length)return'Foyer fondé avec '+partner;
  if(married)return'Mariage avec '+partner;
  if(childIds.length===1&&childNames.length===1)return'Naissance de '+childNames[0];
  if(childIds.length>1)return'Famille agrandie avec '+partner;
  if(childIds.length)return'Famille avec '+partner
 }
 return title
}
function closePersonalChapter(ch,reason){
 var p=game.player,d=migrateLifeDirector(p),i=d.activeChapters.findIndex(function(x){return x.id===ch.id});if(i>=0)d.activeChapters.splice(i,1);if((ch.beats||0)<2&&(ch.score||0)<24)return null;
 var h={id:ch.id,key:ch.key,kind:ch.kind,title:personalChapterArchiveTitle(ch),score:Math.round((ch.score||0)*10)/10,beats:ch.beats||0,startedAge:ch.startedAge,lastAge:ch.lastAge,duration:Math.max(0,p.ageMonths-(ch.startedAge==null?p.ageMonths:ch.startedAge)),reason:reason||'transition',sources:(ch.sources||[]).slice(-8)};d.chapterHistory.unshift(h);d.chapterHistory=d.chapterHistory.slice(0,20);
 if(h.score>=36&&h.beats>=2)recordSignatureMoment('Chapitre — '+h.title,h.beats+' moments liés finissent par former un vrai chapitre de ta vie.','life-chapter',cl(62+h.score*.5,62,92));
 return h
}
function signalPersonalChapter(kind,title,weight,source,subject){
 var p=game.player,d=migrateLifeDirector(p),key=kind+':'+String(subject||title||'life'),ch=d.activeChapters.find(function(x){return x.key===key});
 if(!ch){if(d.activeChapters.length>=3)closePersonalChapter(d.activeChapters.slice().sort(function(a,b){return(a.lastAge||0)-(b.lastAge||0)})[0],'nouveau chapitre');ch={id:'life-chapter-'+(++d.chapterSeq),key:key,kind:kind,title:title||'Chapitre de vie',score:0,beats:0,startedAge:p.ageMonths,lastAge:p.ageMonths,sources:[]};d.activeChapters.push(ch)}
 ch.title=title||ch.title;ch.score=cl((ch.score||0)+Math.max(0,weight||1),0,100);ch.beats=(ch.beats||0)+1;ch.lastAge=p.ageMonths;if(source){ch.sources.push(source);ch.sources=ch.sources.slice(-8)}return ch
}
function personalChapterTick(m){
 var p=game.player,d=migrateLifeDirector(p);d.activeChapters.slice().forEach(function(ch){var idle=p.ageMonths-(ch.lastAge||p.ageMonths),span=p.ageMonths-(ch.startedAge||p.ageMonths);if((ch.score>=70&&ch.beats>=5)||idle>=30||span>=60)closePersonalChapter(ch,ch.score>=70?'accomplissement':span>=60?'fin de période':'transition')})
}
function visiblePersonalChapter(){
 var d=migrateLifeDirector(game.player);return(d.activeChapters||[]).filter(function(ch){return(ch.beats||0)>=2&&(ch.score||0)>=20}).sort(function(a,b){return(b.score||0)-(a.score||0)})[0]||null
}

function narrativeFronts(limit){
 if(!game||!game.player)return[];var p=game.player,w=game.world||{},d=migrateLifeDirector(p),fronts=[],seen={};
 function add(x){if(!x||!x.id||seen[x.id])return;seen[x.id]=1;x.score=Math.round(cl(x.score||0,0,120)*10)/10;fronts.push(x)}
 if(game.mission){var ms=missionSagaTarget(game.mission);add({id:'mission:'+(game.mission.title||'active'),kind:'mission',title:game.mission.title||'Mission en cours',detail:(game.mission.stakes||missionStakes(game.mission))+' • '+Math.max(0,game.mission.remaining||0).toFixed(1)+' mois restants',score:96+(game.mission.signature?6:0),region:p.region,sourceType:game.mission.sourceType||'mission',sourceId:ms?ms.id:(game.mission.sourceId||null)})}
 activeStories().forEach(function(s){add({id:'story:'+s.id,kind:'story',title:s.title,detail:s.awaiting?'Décision importante à prendre':(s.summary||'Fil narratif en cours'),score:(s.awaiting?94:66)+Math.min(12,s.stage*4),region:s.region||p.region,sourceType:'story',sourceId:s.id})});
 var sagas=((w.worldState||{}).worldSagas||[]).filter(function(s){return s.status==='active'&&s.region===p.region}).sort(function(a,b){return((b.pressure||0)+(b.playerImpact||0)*.55+(b.playerCausalMissions||0)*8)-((a.pressure||0)+(a.playerImpact||0)*.55+(a.playerCausalMissions||0)*8)});sagas.slice(0,2).forEach(function(s){var role=sagaPlayerRoleRank(s.playerRole||'present'),stage=s.stage||'Tensions';add({id:'saga:'+s.id,kind:'saga',title:s.title,detail:stage+' • pression '+Math.round(s.pressure||0)+(role>0?' • ton rôle devient causal':''),score:48+(s.pressure||0)*.35+(s.playerImpact||0)*.22+role*8+(s.playerCausalMissions||0)*5,region:s.region,sourceType:'saga',sourceId:s.id})});
 var rivals=(game.relations||[]).filter(function(r){return r.status==='active'&&(r.role==='rival'||(r.rivalry||0)>=55)}).sort(function(a,b){return((b.rivalry||0)+(npcNearby(b)?15:0))-((a.rivalry||0)+(npcNearby(a)?15:0))});if(rivals.length){var r=rivals[0];add({id:'rival:'+r.id,kind:'rivalry',title:'Rivalité avec '+r.name,detail:(npcNearby(r)?'Dans ta zone':'Éloigné')+' • '+rivalStage(r),score:42+(r.rivalry||0)*.42+(npcNearby(r)?10:0),region:npcRegion(r),sourceType:'relation',sourceId:r.id})} var wr=migrateWorldReactions(p),lastReaction=wr.history&&wr.history[0];if(lastReaction&&p.ageMonths-(lastReaction.ageMonths||p.ageMonths)<=18)add({id:'reaction:'+lastReaction.id,kind:'reaction',title:worldReactionTypeLabel(lastReaction.type)+' — '+lastReaction.sourceName,detail:lastReaction.outcome+' • attention '+Math.round(lastReaction.attention||0),score:44+Math.min(34,(lastReaction.impact||0)*4),region:p.region,sourceType:'world-reaction',sourceId:lastReaction.sourceId||lastReaction.sourceFaction});
 (d.activeChapters||[]).filter(function(ch){return(ch.beats||0)>=2&&(ch.score||0)>=20}).forEach(function(ch){add({id:'chapter:'+ch.id,kind:'chapter',title:ch.title,detail:'Chapitre personnel • '+(ch.beats||0)+' moments liés',score:34+(ch.score||0)*.48,region:p.region,sourceType:'chapter',sourceId:ch.id})});
 var partner=partnerRelation();if(partner&&(partner.longDistance||p.life.relationshipStatus==='Marié'))add({id:'relationship:'+partner.id,kind:'relationship',title:p.life.relationshipStatus==='Marié'?'Foyer avec '+partner.name:'Lien avec '+partner.name,detail:partner.longDistance?'La distance pèse sur votre trajectoire':'Un lien durable accompagne ta trajectoire',score:partner.longDistance?58:44,region:npcRegion(partner),sourceType:'relation',sourceId:partner.id});
 fronts.sort(function(a,b){return b.score-a.score||a.title.localeCompare(b.title)});return fronts.slice(0,limit==null?2:Math.max(0,limit))
}
function narrativeConvergence(){
 var fronts=narrativeFronts(6),links=narrativeConnections(fronts),top=links[0]||null,level=top&&(top.score||0)>=88?'Convergence forte':top?'Convergence émergente':fronts.length>=2?'Deux fronts actifs':fronts.length?'Un fil dominant':'Vie ouverte';
 var summary=top?top.summary:fronts.length>=2?'Deux fils importants évoluent en parallèle. Le moteur surveille maintenant leurs interactions causales, pas seulement leur coexistence.':fronts.length?'Ce fil domine actuellement ta trajectoire sans forcer d’interruption supplémentaire.':'Aucun arc ne domine : le monde peut encore faire émerger le prochain tournant.';
 var selected=[];if(top){if(top.a&&top.a.kind!=='memory')selected.push(top.a);if(top.b&&top.b.kind!=='memory'&&!selected.some(function(x){return x.id===top.b.id}))selected.push(top.b)}fronts.forEach(function(f){if(selected.length<2&&!selected.some(function(x){return x.id===f.id}))selected.push(f)});
 return{level:level,summary:summary,fronts:selected.slice(0,2),connections:links.slice(0,3)}
}
function narrativeMissionBoost(m){
 if(!game||!m)return 0;var boost=0,fronts=narrativeFronts(4),saga=m.worldGenerated?missionSagaTarget(m):null;
 var entry=m.sourceType==='saga'&&m.variantKey==='entry',softContinuity=!!(saga&&saga.playerDirectorEntry&&m.sourceType==='saga'&&!entry&&(saga.playerCausalMissions||0)<2);
 if(saga&&fronts.some(function(f){return f.kind==='saga'&&f.sourceId===saga.id}))boost+=entry?.06:softContinuity?.07:.28;
 if(m.sourceType==='saga')boost+=entry?.04:softContinuity?.04:.12;
 var rival=fronts.find(function(f){return f.kind==='rivalry'});if(rival&&(m.sourceId===rival.sourceId||m.sourceName===rival.title.replace('Rivalité avec ','')))boost+=.14;
 var ch=visiblePersonalChapter();if(ch&&ch.kind==='career'&&!m.worldGenerated)boost+=.05;
 return Math.min(.45,boost)
}
function renderNarrativeDirector(){
 var badge=$('#narrativeDirectorBadge'),list=$('#narrativeFronts'),summary=$('#narrativeDirectorSummary');if(!badge||!list||!summary||!game)return;var x=narrativeConvergence();badge.textContent=x.level;summary.textContent=x.summary;
 list.innerHTML=x.fronts.length?x.fronts.map(function(f){var label=f.kind==='saga'?'Monde':f.kind==='rivalry'?'Rivalité':f.kind==='mission'?'Mission':f.kind==='relationship'?'Vie privée':f.kind==='story'?'Décision':f.kind==='reaction'?'Réaction du monde':'Chapitre';return'<div class="narrative-front '+e(f.kind)+'"><div class="narrative-front-head"><strong>'+e(f.title)+'</strong><span>'+e(label)+'</span></div><small>'+e(f.detail||'Fil actif')+'</small></div>'}).join(''):'<div class="narrative-empty">Aucun fil prioritaire. Le prochain tournant peut venir de n’importe où.</div>'
}

function metaKey(){return slotMetaKey(slot)}
function loadMeta(){try{return JSON.parse(localStorage.getItem(metaKey())||'null')}catch(x){return null}}
function saveMeta(){if(!game)return;localStorage.setItem(metaKey(),JSON.stringify({codex:game.codex,achievements:game.achievements,dynasty:game.dynasty}))}
function applyMeta(g){var m=loadMeta();if(!m)return g;if(m.codex){['people','places','factions','fruits','events','techniques'].forEach(function(k){g.codex[k]=[].concat(g.codex[k]||[],m.codex[k]||[]).filter(function(v,i,a){return a.indexOf(v)===i})})}if(m.achievements)g.achievements=m.achievements;return g}
var FACTION_KEYS=['Civil','Marine','Pirates','Chasseur de primes','Révolutionnaires','Gouvernement'];
var CAREERS={
Civil:{label:'Civil',salary:2800,specs:['Marchand','Médecin','Navigateur','Scientifique','Artisan','Cuisinier'],ranks:[
 {n:'Apprenti',xp:0,rep:-100,pow:0},{n:'Professionnel',xp:35,rep:5,pow:12},{n:'Confirmé',xp:95,rep:18,pow:20},{n:'Expert',xp:190,rep:35,pow:28},{n:'Maître',xp:330,rep:55,pow:38}]},
Marine:{label:'Marine',salary:4200,specs:['Combat','Navigation','Renseignement','Médecine'],ranks:[
 {n:'Recrue',xp:0,rep:-100,pow:0},{n:'Matelot',xp:28,rep:5,pow:15},{n:'Sous-officier',xp:82,rep:15,pow:24},{n:'Enseigne',xp:155,rep:28,pow:31},{n:'Lieutenant',xp:245,rep:42,pow:39},{n:'Commandant',xp:365,rep:58,pow:48},{n:'Capitaine',xp:520,rep:72,pow:58},{n:'Contre-amiral',xp:710,rep:84,pow:67},{n:'Vice-amiral',xp:950,rep:92,pow:76}]},
Pirates:{label:'Pirates',salary:0,specs:['Combattant','Navigateur','Tireur','Médecin','Quartier-maître'],ranks:[
 {n:'Novice',xp:0,rep:-100,pow:0},{n:'Membre',xp:25,rep:5,pow:16},{n:'Combattant',xp:78,rep:16,pow:25},{n:'Officier',xp:150,rep:30,pow:34},{n:'Bras droit',xp:255,rep:48,pow:44},{n:'Capitaine',xp:390,rep:65,pow:53},{n:'Capitaine renommé',xp:590,rep:82,pow:64}]},
'Chasseur de primes':{label:'Chasseur de primes',salary:0,specs:['Traqueur','Duelliste','Tireur','Investigateur'],ranks:[
 {n:'Indépendant',xp:0,rep:-100,pow:0},{n:'Chasseur licencié',xp:38,rep:6,pow:18},{n:'Chasseur réputé',xp:110,rep:22,pow:29},{n:'Chasseur d’élite',xp:225,rep:42,pow:43},{n:'Maître chasseur',xp:420,rep:66,pow:58}]},
Révolutionnaires:{label:'Révolutionnaires',salary:1200,specs:['Combat','Infiltration','Renseignement','Logistique'],ranks:[
 {n:'Sympathisant',xp:0,rep:-100,pow:0},{n:'Agent',xp:34,rep:6,pow:17},{n:'Officier',xp:100,rep:20,pow:27},{n:'Chef de cellule',xp:205,rep:38,pow:39},{n:'Commandant régional',xp:380,rep:62,pow:53},{n:'Cadre révolutionnaire',xp:620,rep:80,pow:65}]},
Gouvernement:{label:'Gouvernement Mondial',salary:5200,specs:['Administration','Renseignement','Cipher Pol'],ranks:[
 {n:'Agent junior',xp:0,rep:-100,pow:0},{n:'Agent',xp:36,rep:8,pow:16},{n:'Agent senior',xp:105,rep:24,pow:26},{n:'Inspecteur',xp:210,rep:42,pow:36},{n:'Directeur',xp:390,rep:65,pow:48}]}
};
var CP_RANKS=[
 {n:'Agent junior',xp:0,rep:-100,pow:0},{n:'Agent',xp:36,rep:8,pow:16},{n:'Stagiaire Cipher Pol',xp:105,rep:25,pow:28},
 {n:'CP7',xp:230,rep:45,pow:40},{n:'CP9',xp:430,rep:68,pow:56},{n:'Candidat CP0',xp:720,rep:88,pow:70}
];
var MISSIONS={
Civil:[
 {title:'Livraison côtière',danger:16,reward:6500,xp:10,tier:0},{title:'Escorte commerciale',danger:28,reward:12000,xp:16,tier:1},
 {title:'Ouvrir une route commerciale',danger:32,reward:19000,xp:23,tier:2,spec:'Marchand'},{title:'Soigner un équipage blessé',danger:20,reward:15000,xp:22,tier:1,spec:'Médecin'},
 {title:'Cartographier une route dangereuse',danger:35,reward:18000,xp:24,tier:2,spec:'Navigateur'},{title:'Étudier un phénomène rare',danger:30,reward:17000,xp:24,tier:2,spec:'Scientifique'}],
Marine:[
 {title:'Patrouille portuaire',danger:20,reward:9000,xp:12,tier:0},{title:'Escorte navale',danger:31,reward:14000,xp:18,tier:1},
 {title:'Démanteler des contrebandiers',danger:39,reward:19000,xp:25,tier:2},{title:'Intercepter un équipage pirate',danger:52,reward:29000,xp:34,tier:3},
 {title:'Sécuriser un royaume allié',danger:64,reward:42000,xp:46,tier:5},{title:'Opération de renseignement',danger:37,reward:21000,xp:28,tier:2,spec:'Renseignement'}],
Pirates:[
 {title:'Chasse au trésor',danger:25,reward:15000,xp:13,tier:0},{title:'Piller un convoi',danger:40,reward:24000,xp:21,tier:1},
 {title:'Affronter un équipage rival',danger:53,reward:36000,xp:31,tier:2},{title:'Raid contre une base Marine',danger:68,reward:54000,xp:45,tier:4},
 {title:'Prendre le contrôle d’une route',danger:77,reward:72000,xp:56,tier:5},{title:'Voler des cartes marines',danger:43,reward:30000,xp:29,tier:2,spec:'Navigateur'}],
'Chasseur de primes':[
 {title:'Traquer un hors-la-loi',danger:31,reward:18000,xp:15,tier:0},{title:'Capturer un capitaine',danger:48,reward:32000,xp:27,tier:2},
 {title:'Contrat sur une cible dangereuse',danger:62,reward:52000,xp:41,tier:3},{title:'Traque longue distance',danger:45,reward:36000,xp:31,tier:2,spec:'Traqueur'}],
Révolutionnaires:[
 {title:'Acheminer des renseignements',danger:28,reward:2000,xp:15,tier:0},{title:'Évacuer des civils',danger:35,reward:3000,xp:22,tier:1},
 {title:'Saboter une installation',danger:55,reward:5000,xp:34,tier:2},{title:'Libérer une cellule capturée',danger:67,reward:7000,xp:46,tier:4},
 {title:'Infiltrer un poste gouvernemental',danger:49,reward:4000,xp:33,tier:2,spec:'Infiltration'}],
Gouvernement:[
 {title:'Surveillance discrète',danger:24,reward:10000,xp:13,tier:0},{title:'Sécuriser un dignitaire',danger:34,reward:16000,xp:20,tier:1},
 {title:'Récupérer des renseignements sensibles',danger:45,reward:25000,xp:29,tier:2},{title:'Opération classifiée',danger:59,reward:39000,xp:40,tier:3},
 {title:'Mission Cipher Pol',danger:68,reward:48000,xp:49,tier:3,spec:'Cipher Pol'}]
};

var SPEC_PROFILES={
 Combat:{keys:['Combat','Force','Réflexes'],combatWeight:.82,label:'Combat'},Combattant:{keys:['Combat','Force','Endurance'],combatWeight:.88,label:'Combat rapproché'},Duelliste:{keys:['Combat','Agilité','Réflexes'],combatWeight:.78,label:'Duel'},
 Navigation:{keys:['Navigation','Discipline','Réflexes'],combatWeight:.18,label:'Navigation'},Navigateur:{keys:['Navigation','Discipline','Réflexes'],combatWeight:.18,label:'Navigation'},Tireur:{keys:['Tir','Réflexes','Discipline'],combatWeight:.58,label:'Tir'},
 Médecine:{keys:['Médecine','Science','Discipline'],combatWeight:.08,label:'Médecine'},Médecin:{keys:['Médecine','Science','Discipline'],combatWeight:.08,label:'Médecine'},Renseignement:{keys:['Discrétion','Discipline','Agilité'],combatWeight:.20,label:'Renseignement'},
 Infiltration:{keys:['Discrétion','Agilité','Réflexes'],combatWeight:.28,label:'Infiltration'},Investigateur:{keys:['Discrétion','Science','Discipline'],combatWeight:.16,label:'Investigation'},Scientifique:{keys:['Science','Discipline','Navigation'],combatWeight:.04,label:'Science'},
 Administration:{keys:['Discipline','Commandement','Science'],combatWeight:.04,label:'Administration'},Logistique:{keys:['Commandement','Navigation','Discipline'],combatWeight:.08,label:'Logistique'},'Quartier-maître':{keys:['Commandement','Navigation','Discipline'],combatWeight:.12,label:'Logistique'},
 Marchand:{keys:['Commandement','Navigation','Discipline'],combatWeight:.04,label:'Commerce'},Artisan:{keys:['Science','Discipline','Commandement'],combatWeight:.04,label:'Artisanat'},Cuisinier:{keys:['Discipline','Médecine','Commandement'],combatWeight:.04,label:'Cuisine'},
 Traqueur:{keys:['Réflexes','Discrétion','Navigation'],combatWeight:.30,label:'Traque'},'Cipher Pol':{keys:['Discrétion','Combat','Réflexes'],combatWeight:.72,label:'Cipher Pol'}
};
var MISSION_TITLE_PROFILES={
 'Livraison côtière':'navigation','Escorte commerciale':'command','Ouvrir une route commerciale':'trade','Soigner un équipage blessé':'medicine','Cartographier une route dangereuse':'navigation','Étudier un phénomène rare':'science',
 'Patrouille portuaire':'command','Escorte navale':'navigation','Démanteler des contrebandiers':'hunt','Intercepter un équipage pirate':'combat','Sécuriser un royaume allié':'command','Opération de renseignement':'stealth',
 'Chasse au trésor':'exploration','Piller un convoi':'combat','Affronter un équipage rival':'combat','Raid contre une base Marine':'combat','Prendre le contrôle d’une route':'command','Voler des cartes marines':'stealth',
 'Traquer un hors-la-loi':'hunt','Capturer un capitaine':'hunt','Contrat sur une cible dangereuse':'combat','Traque longue distance':'hunt',
 'Acheminer des renseignements':'stealth','Évacuer des civils':'rescue','Saboter une installation':'stealth','Libérer une cellule capturée':'mixed','Infiltrer un poste gouvernemental':'stealth',
 'Surveillance discrète':'stealth','Sécuriser un dignitaire':'command','Récupérer des renseignements sensibles':'stealth','Opération classifiée':'mixed','Mission Cipher Pol':'mixed'
};
var MISSION_PROFILE_CONFIG={
 combat:{label:'Combat',keys:['Combat','Force','Réflexes'],combat:true},navigation:{label:'Navigation',keys:['Navigation','Discipline','Réflexes','Endurance']},medicine:{label:'Médecine',keys:['Médecine','Science','Discipline','Réflexes']},
 science:{label:'Science',keys:['Science','Discipline','Navigation','Commandement']},stealth:{label:'Infiltration',keys:['Discrétion','Agilité','Réflexes','Discipline']},command:{label:'Commandement',keys:['Commandement','Volonté','Discipline','Combat']},
 trade:{label:'Commerce',keys:['Commandement','Navigation','Discipline','Science']},hunt:{label:'Traque',keys:['Réflexes','Discrétion','Navigation','Combat']},exploration:{label:'Exploration',keys:['Navigation','Discipline','Réflexes','Science']},
 rescue:{label:'Sauvetage',keys:['Médecine','Commandement','Endurance','Navigation']},mixed:{label:'Opération mixte',keys:['Combat','Discrétion','Commandement','Réflexes'],mixed:true}
};
function valueForKey(k){var p=game.player;if(p.stats&&p.stats[k]!=null)return p.stats[k];if(p.skills&&p.skills[k]!=null)return p.skills[k];return 0}
function specProfile(sp){return SPEC_PROFILES[sp]||null}
function careerExpertise(sp){var p=game.player,profile=specProfile(sp||p.specialization);if(!profile)return((p.stats.Discipline||0)+(p.skills.Commandement||0)+(p.skills.Combat||0))/3;return profile.keys.reduce(function(a,k){return a+valueForKey(k)},0)/profile.keys.length}
function careerQualification(){var p=game.player,profile=specProfile(p.specialization),expertise=careerExpertise(p.specialization),cw=profile?profile.combatWeight:.45;return expertise*(1-cw)+power()*cw}
function careerRequirementLabel(){var p=game.player,profile=specProfile(p.specialization);return profile&&profile.combatWeight<.45?'Expertise métier':'Qualification'}
function missionProfile(m){var id=(m&&m.profile)||MISSION_TITLE_PROFILES[m&&m.title]||'mixed';return{id:id,config:MISSION_PROFILE_CONFIG[id]||MISSION_PROFILE_CONFIG.mixed}}
function missionScore(m){var p=game.player,mp=missionProfile(m),keys=mp.config.keys,score=keys.reduce(function(a,k){return a+valueForKey(k)},0)/Math.max(1,keys.length);if(mp.id==='combat')score=power();else if(mp.id==='mixed')score=score*.55+power()*.45;if(p.specialization&&m.spec===p.specialization)score+=5;var sp=specProfile(p.specialization);if(sp&&keys.some(function(k){return sp.keys.indexOf(k)>=0}))score+=2.5;return score}
function missionChance(m){var effective=organizationMissionDanger(m),mp=missionProfile(m),score=missionScore(m),support=Math.max(0,m.danger-effective)*.35,ch=.52+(score-effective)/82+support/100;if(mp.id==='medicine'||mp.id==='science'||mp.id==='navigation'||mp.id==='trade')ch+=.04;return cl(ch,.08,.94)}
function missionRiskLabel(m){var c=missionChance(m);return c>=.8?'Favorable':c>=.62?'Maîtrisé':c>=.45?'Incertain':c>=.28?'Dangereux':'Extrême'}

var TECH={
'Équilibré':[{id:'garde',name:'Garde adaptative',req:12,skill:'Combat',bonus:4},{id:'contre',name:'Contre opportuniste',req:30,skill:'Combat',bonus:6},{id:'enchaînement',name:'Enchaînement complet',req:55,skill:'Combat',bonus:9}],
'Corps-à-corps':[{id:'impact',name:'Impact direct',req:12,skill:'Combat',bonus:4},{id:'rafale',name:'Rafale rapprochée',req:32,skill:'Combat',bonus:6},{id:'briseur',name:'Briseur de garde',req:58,skill:'Combat',bonus:9}],
'Sabreur':[{id:'coupe',name:'Coupe précise',req:12,skill:'Sabre',bonus:4},{id:'iai',name:'Iai rapide',req:34,skill:'Sabre',bonus:6},{id:'lame-distance',name:'Lame à distance',req:62,skill:'Sabre',bonus:9}],
'Tireur':[{id:'tir-vise',name:'Tir visé',req:12,skill:'Tir',bonus:4},{id:'tir-mobile',name:'Tir en mouvement',req:34,skill:'Tir',bonus:6},{id:'tir-longue',name:'Tir longue portée',req:62,skill:'Tir',bonus:9}],
'Mobile / esquive':[{id:'pas-lateral',name:'Pas latéral',req:12,skill:'Combat',bonus:4},{id:'feinte',name:'Feinte éclair',req:34,skill:'Combat',bonus:6},{id:'angle-mort',name:'Angle mort',req:62,skill:'Combat',bonus:9}]
};
var MATCH={'Corps-à-corps':{'Tireur':6},'Tireur':{'Sabreur':5},'Sabreur':{'Équilibré':4},'Mobile / esquive':{'Sabreur':5},'Équilibré':{'Mobile / esquive':3}};
var HAKI_APPS={
Observation:[[1,'Présence'],[25,'Perception étendue'],[55,'Anticipation'],[80,'Vision du futur naissante']],
Armement:[[1,'Renforcement'],[25,'Revêtement'],[55,'Projection'],[80,'Destruction interne']],
Conquérant:[[1,'Intimidation'],[35,'Décharge ciblée'],[70,'Infusion du Conquérant']]
};
function e(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]})}
function cl(n,a,b){return Math.max(a,Math.min(b,n))}
function H(s){var x=2166136261>>>0;String(s).split('').forEach(function(c){x=Math.imul(x^c.charCodeAt(0),16777619)});return x>>>0}
function R(k){k=k||'m';var c=game?(game.rng[k]||0):0,s=(game?game.seed:1)^H(k+':'+c);if(game)game.rng[k]=c+1;var t=s+0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
function pk(a,k){return a[Math.floor(R(k)*a.length)]}
function inf(n){var p=PL[n||game.player.island]||[game.player.region,10,[]];return{region:p[0],danger:p[1],routes:p[2]}}
function age(){var m=game.player.ageMonths,y=Math.floor(m/12),o=Math.floor(m%12);return y?(y+' an'+(y>1?'s':'')+(o?' et '+o+' mois':'')):(o+' mois')}
function key(){return P+slot}
function slotKey(i){return P+i}
function slotMetaKey(i){return P+'meta-'+i}
function pendingIsExecutable(p){
 return!!(p&&Array.isArray(p.choices)&&p.choices.length&&p.choices.every(function(c){return Array.isArray(c)&&typeof c[2]==='function'}))
}
function save(){if(game){var persisted=game;if(game.pending){persisted=Object.assign({},game,{pending:null})}localStorage.setItem(key(),JSON.stringify(persisted));saveMeta()}}

function defaultProgression(p){
 return{gains:{},snapshots:[],breakthroughs:[],apex:{unlocked:false,score:0,breakthroughs:0,maxedKeys:[],lastAttemptAge:-999,lastBreakthroughAge:-999},combatIdentity:{fights:0,wins:0,upsets:0,cleanWins:0,styles:{},terrains:{},traits:[],signatureTechnique:null},lastSnapshotAge:p&&p.ageMonths||0}
}
function migrateProgression(g,p){
 p.progression=p.progression||defaultProgression(p);p.progression.gains=p.progression.gains||{};p.progression.snapshots=Array.isArray(p.progression.snapshots)?p.progression.snapshots.slice(-30):[];p.progression.breakthroughs=Array.isArray(p.progression.breakthroughs)?p.progression.breakthroughs.slice(-20):[];p.progression.lastSnapshotAge=p.progression.lastSnapshotAge==null?(p.ageMonths||0):p.progression.lastSnapshotAge;
 p.progression.apex=p.progression.apex||{unlocked:false,score:0,breakthroughs:0,maxedKeys:[],lastAttemptAge:-999,lastBreakthroughAge:-999};var ap=p.progression.apex;ap.unlocked=!!ap.unlocked;ap.score=cl(ap.score||0,0,100);ap.breakthroughs=ap.breakthroughs||0;ap.maxedKeys=Array.isArray(ap.maxedKeys)?ap.maxedKeys.filter(function(k){return ST.concat(SK).indexOf(k)>=0}):[];ap.lastAttemptAge=ap.lastAttemptAge==null?-999:ap.lastAttemptAge;ap.lastBreakthroughAge=ap.lastBreakthroughAge==null?-999:ap.lastBreakthroughAge;
 p.progression.combatIdentity=p.progression.combatIdentity||{fights:0,wins:0,upsets:0,cleanWins:0,styles:{},terrains:{},traits:[],signatureTechnique:null};var ci=p.progression.combatIdentity;ci.fights=ci.fights||0;ci.wins=ci.wins||0;ci.upsets=ci.upsets||0;ci.cleanWins=ci.cleanWins||0;ci.styles=ci.styles||{};ci.terrains=ci.terrains||{};ci.traits=Array.isArray(ci.traits)?ci.traits.slice(0,5):[];ci.signatureTechnique=ci.signatureTechnique||null;
 p.naturalCaps=p.naturalCaps||{};p.absoluteCaps=p.absoluteCaps||{};var caps=p.caps||{};
 ST.concat(SK).forEach(function(k){var c=caps[k]||90;if(p.naturalCaps[k]==null)p.naturalCaps[k]=c;if(p.absoluteCaps[k]==null){var extra=5+(H(String(g.seed||1)+':absolute:'+k)%8);p.absoluteCaps[k]=cl(c+extra,c,100)}else p.absoluteCaps[k]=cl(p.absoluteCaps[k],c,100)});
 return p.progression
}
function developmentFactor(k){
 var p=game.player,y=(p.ageMonths||0)/12,isSkill=p.skills&&p.skills[k]!=null;
 if(y<2)return isSkill?.08:.18;if(y<6)return isSkill?.18:.34;if(y<12)return isSkill?.45:.68;if(y<15)return isSkill?.72:.88;if(y<40)return 1;if(y<55)return .9;if(y<70)return .72;return .52
}
function trackProgressGain(k,n){
 if(!n||n<=0)return;var pr=migrateProgression(game,game.player);pr.gains[k]=(pr.gains[k]||0)+n
}
function combatIdentityTraits(){
 var ci=migrateProgression(game,game.player).combatIdentity,traits=[];if(ci.upsets>=3)traits.push({id:'upset',label:'Briseur de pronostics',desc:'Tes victoires contre plus fort rendent les combats défavorables moins écrasants.'});if(ci.cleanWins>=5&&ci.fights>=8)traits.push({id:'clean',label:'Combattant clinique',desc:'Tu as appris à conclure sans absorber inutilement les dégâts.'});
 Object.keys(ci.styles||{}).forEach(function(k){var x=ci.styles[k];if((x.fights||0)>=6&&(x.wins||0)/Math.max(1,x.fights)>=.67)traits.push({id:'style:'+k,label:'Prédateur de '+k.toLowerCase(),desc:'Ton expérience répétée contre ce style crée un avantage réel.'})});
 Object.keys(ci.terrains||{}).forEach(function(k){var x=ci.terrains[k];if((x.fights||0)>=5&&(x.wins||0)/Math.max(1,x.fights)>=.65)traits.push({id:'terrain:'+k,label:'Maîtrise : '+k,desc:'Ce terrain est devenu un environnement familier en combat.'})});
 if(ci.fights>=20)traits.push({id:'veteran',label:'Vétéran du combat',desc:'L’accumulation d’affrontements améliore ta lecture des échanges.'});ci.traits=traits.slice(0,5);return ci.traits
}
function signatureTechniqueTemplates(style){
 var map={'Équilibré':['Convergence parfaite','Riposte des marées','Cycle souverain'],'Corps-à-corps':['Impact du titan','Rafale du conquérant','Poing des tempêtes'],'Sabreur':['Lame du sillage','Croissant des abysses','Iai de l’horizon'],'Tireur':['Ligne parfaite','Étoile balistique','Dernier horizon'],'Mobile / esquive':['Pas fantôme','Angle impossible','Danse du cyclone']};return map[style]||map['Équilibré']
}
function signatureTechniqueBonus(){
 var pr=game&&game.player&&game.player.progression,ci=pr&&pr.combatIdentity,s=ci&&ci.signatureTechnique;if(!s)return 0;return (s.bonus||0)*(.35+.65*cl(s.mastery||1,0,100)/100)
}
function maybeDevelopSignatureTechnique(){
 var p=game.player,ci=migrateProgression(game,p).combatIdentity;if(ci.signatureTechnique||ci.fights<12||ci.wins<7||styleMastery()<50)return ci.signatureTechnique;
 var names=signatureTechniqueTemplates(p.style),idx=H(String(game.seed||1)+':signature:'+p.style+':'+Math.round(p.ageMonths))%names.length,traits=combatIdentityTraits(),theme=traits.length?traits[0].label:'expérience accumulée',bonus=cl(3.2+Math.min(2.8,ci.upsets*.35+ci.cleanWins*.12),3.2,6);
 ci.signatureTechnique={name:names[idx],style:p.style,createdAge:p.ageMonths,mastery:8,uses:0,wins:0,bonus:+bonus.toFixed(2),theme:theme};tl('TECHNIQUE SIGNATURE',ci.signatureTechnique.name+' naît de ta manière de combattre.','major');recordSignatureMoment('Technique signature — '+ci.signatureTechnique.name,'Une technique propre à ton parcours émerge après '+ci.fights+' combats.','progression',82);rememberCausalMemory('combat','Technique signature — '+ci.signatureTechnique.name,82,{kind:'combat',subjectId:'signature-technique',style:p.style,region:p.region},'signature-technique:'+p.style);return ci.signatureTechnique
}
function trainSignatureTechnique(ok,importance){
 var ci=migrateProgression(game,game.player).combatIdentity,s=ci.signatureTechnique;if(!s){s=maybeDevelopSignatureTechnique();if(!s)return null}s.uses++;if(ok)s.wins++;var gain=(ok?1.15:.42)+(importance||0)/220;s.mastery=cl((s.mastery||1)+gain,0,100);return s
}
function combatIdentityBonus(enemyStyle,terrain,danger){
 var ci=migrateProgression(game,game.player).combatIdentity,traits=combatIdentityTraits(),bonus=0;if(traits.some(function(x){return x.id==='style:'+enemyStyle}))bonus+=3;if(traits.some(function(x){return x.id==='terrain:'+terrain}))bonus+=2.5;if(traits.some(function(x){return x.id==='veteran'}))bonus+=1.5;if(traits.some(function(x){return x.id==='upset'})&&(danger||0)>power()+8)bonus+=2;if(traits.some(function(x){return x.id==='clean'}))bonus+=.8;return Math.min(7,bonus)
}
function recordCombatIdentity(enemyStyle,terrain,ok,upset,damage){
 var ci=migrateProgression(game,game.player).combatIdentity;ci.fights++;if(ok)ci.wins++;if(upset)ci.upsets++;if(ok&&(damage||0)<=4)ci.cleanWins++;var st=ci.styles[enemyStyle]||(ci.styles[enemyStyle]={fights:0,wins:0});st.fights++;if(ok)st.wins++;var tr=ci.terrains[terrain]||(ci.terrains[terrain]={fights:0,wins:0});tr.fights++;if(ok)tr.wins++;var before=(ci.traits||[]).map(function(x){return x.id}),after=combatIdentityTraits(),newTrait=after.find(function(x){return before.indexOf(x.id)<0});if(newTrait){tl('SIGNATURE DE COMBAT',newTrait.label+' devient une caractéristique durable de ton style.','major');recordSignatureMoment('Signature — '+newTrait.label,newTrait.desc,'progression',70)}return after
}
function progressionSnapshot(){
 var p=game.player;var pr=migrateProgression(game,p);return{ageMonths:p.ageMonths,power:+power().toFixed(2),stats:Object.assign({},p.stats),skills:Object.assign({},p.skills),haki:Object.assign({},p.haki),fruit:+(p.fruitMastery||0).toFixed(2),apex:+(pr.apex&&pr.apex.score||0).toFixed(1),apexBreakthroughs:pr.apex&&pr.apex.breakthroughs||0}
}
function recordProgressSnapshot(force){
 var p=game.player,pr=migrateProgression(game,p),ageNow=p.ageMonths||0;if(!force&&ageNow-(pr.lastSnapshotAge||0)<6)return false;var snap=progressionSnapshot();pr=migrateProgression(game,p);pr.snapshots.push(snap);pr.snapshots=pr.snapshots.slice(-30);pr.lastSnapshotAge=ageNow;return true
}
function progressionDelta(){
 var pr=migrateProgression(game,game.player),ss=pr.snapshots;if(ss.length<2)return{power:0,months:0};var a=ss[ss.length-2],b=ss[ss.length-1];return{power:b.power-a.power,months:b.ageMonths-a.ageMonths}
}
function currentCapStatus(k){
 var p=game.player,b=p.stats[k]!=null?p.stats:p.skills,v=b[k]||0,c=p.caps[k]||90;if(v>=99.95&&c>=99.95)return'Maximum absolu';if(v>=c-.05)return'Plafond actuel';if(c-v<=5)return'Proche du plafond';return'Progression ouverte'
}
function apexProgressScore(){
 var p=game.player,pr=migrateProgression(game,p),rec=p.career!=='Aucune'?careerRecord():null,ci=pr.combatIdentity||{},recognition=p.ageMonths>=240?playerWorldRecognition():null,careerEvidence=rec?Math.min(18,(rec.distinctions||0)*1.5)+Math.min(10,(rec.legendDistinctions||0)*1.7):0,combatEvidence=Math.min(16,(p.wins||0)*.35)+Math.min(12,(p.combatXP||0)*.10)+Math.min(8,(ci.upsets||0)*1.6),worldEvidence=recognition?Math.min(12,(recognition.score||0)*.12):0;
 var score=cl(powerRaw()*.48+careerEvidence+combatEvidence+worldEvidence,0,100);pr.apex.score=Math.max(pr.apex.score||0,score);if(!pr.apex.unlocked&&p.ageMonths>=216&&pr.apex.score>=68)pr.apex.unlocked=true;return pr.apex.score
}
function apexProgressLabel(){
 var s=apexProgressScore();return s>=92?'Apex mondial':s>=82?'Apex avancé':s>=68?'Apex éveillé':s>=55?'Aux portes de l’Apex':'Potentiel en construction'
}
function qualitativePotential(k){
 var p=game.player,c=p.caps[k]||90,a=p.absoluteCaps&&p.absoluteCaps[k]!=null?p.absoluteCaps[k]:c,room=a-c;if(a>=99.95&&c>=99.95)return'Maximum absolu';if(c>=a-.05&&a<100&&p.ageMonths>=216&&apexProgressScore()>=68)return'Apex accessible';if(room>=10)return'Réserve exceptionnelle';if(room>=6)return'Réserve prometteuse';if(room>=3)return'Marge limitée';return'Quasi stabilisé'
}
function attemptApexBreakthrough(context,intensity,keys){
 var p=game.player,pr=migrateProgression(game,p),ap=pr.apex,score=apexProgressScore(),pool=Array.isArray(keys)&&keys.length?keys:ST.concat(SK);if(p.ageMonths<216||score<68)return false;
 var candidates=pool.filter(function(k){var b=p.stats[k]!=null?p.stats:p.skills;if(!b||b[k]==null)return false;var cap=p.caps[k]||90,abs=p.absoluteCaps[k]||cap;return b[k]>=cap-.35&&cap>=abs-.05&&abs<99.95});
 if(!candidates.length)return false;var now=p.ageMonths||0;if(now-(ap.lastAttemptAge||-999)<.45)return false;ap.lastAttemptAge=now;
 var hard=Math.max(0,(intensity||0)-58),base=context==='combat'?.014:context==='mentor'?.018:context==='mission'?.013:.008,chance=cl(base+hard*.00065+Math.max(0,score-68)*.00045,.006,.048);if(R('apex')>=chance)return false;
 var k=pk(candidates,'apex'),oldAbs=p.absoluteCaps[k]||p.caps[k]||90,inc=Math.min(100-oldAbs,1+(R('apex')<.24?1:0));if(inc<=0)return false;p.absoluteCaps[k]=cl(oldAbs+inc,oldAbs,100);p.caps[k]=Math.max(p.caps[k]||oldAbs,p.absoluteCaps[k]);ap.unlocked=true;ap.breakthroughs++;ap.lastBreakthroughAge=now;if(p.absoluteCaps[k]>=99.95&&ap.maxedKeys.indexOf(k)<0)ap.maxedKeys.push(k);
 pr.breakthroughs.push({age:age(),key:k,from:oldAbs,to:p.absoluteCaps[k],context:'apex-'+context,apex:true});pr.breakthroughs=pr.breakthroughs.slice(-20);tl('PERCÉE APEX',k+' dépasse son potentiel supposé : '+Math.round(oldAbs)+' → '+Math.round(p.absoluteCaps[k])+'.','major');recordSignatureMoment('Apex — '+k,'Un exploit exceptionnel repousse le potentiel absolu de '+k+'.','breakthrough',88);return true
}

function attemptBreakthrough(context,intensity,keys){
 var p=game.player,pr=migrateProgression(game,p),pool=Array.isArray(keys)&&keys.length?keys:ST.concat(SK),candidates=pool.filter(function(k){var b=p.stats[k]!=null?p.stats:p.skills;if(!b||b[k]==null)return false;var cap=p.caps[k]||90,abs=p.absoluteCaps[k]||cap;return b[k]>=cap-.35&&cap<abs-.05});
 if(!candidates.length)return attemptApexBreakthrough(context,intensity,keys);var hard=Math.max(0,(intensity||0)-45),chance=context==='combat'?cl(.012+Math.max(0,(intensity||0)-55)*.0008,.012,.05):cl(.012+hard*.0011,.012,.065);if(R('breakthrough')>=chance)return false;
 var k=pk(candidates,'breakthrough'),old=p.caps[k],abs=p.absoluteCaps[k]||100,inc=Math.min(abs-old,1+Math.floor(R('breakthrough')*2));if(inc<=0)return false;p.caps[k]=cl(old+inc,old,abs);var item={age:age(),key:k,from:old,to:p.caps[k],context:context};pr.breakthroughs.push(item);pr.breakthroughs=pr.breakthroughs.slice(-20);tl('BREAKTHROUGH',k+' repousse son plafond : '+Math.round(old)+' → '+Math.round(p.caps[k])+'.','major');recordSignatureMoment('Breakthrough — '+k,'Un exploit en '+context+' repousse durablement ton plafond naturel.','breakthrough',68);return true
}


function defaultLifeLoop(){return{advanceCount:0,quietAdvances:0,momentSeq:0,majorSeq:0,lastAdvance:null,recentKinds:[],recentEvents:[],recentMissions:[],worldSeq:0,recentWorld:[],signatureSeq:0,signatureMoments:[],consequenceSeq:0,consequenceResultSeq:0,consequences:[],consequenceHistory:[],arcSeq:0,arcResultSeq:0,arcs:[],arcHistory:[],foundingMemories:[]}}
function migrateLifeLoop(g){
 g.loop=g.loop||defaultLifeLoop();var l=g.loop;l.advanceCount=l.advanceCount||0;l.quietAdvances=l.quietAdvances||0;l.momentSeq=l.momentSeq||0;l.majorSeq=l.majorSeq||0;l.lastAdvance=l.lastAdvance||null;l.recentKinds=Array.isArray(l.recentKinds)?l.recentKinds.slice(0,6):[];l.recentEvents=Array.isArray(l.recentEvents)?l.recentEvents.slice(0,8):[];l.recentMissions=Array.isArray(l.recentMissions)?l.recentMissions.slice(0,6):[];l.worldSeq=l.worldSeq||0;l.recentWorld=Array.isArray(l.recentWorld)?l.recentWorld.slice(0,12):[];l.signatureSeq=l.signatureSeq||0;l.signatureMoments=Array.isArray(l.signatureMoments)?l.signatureMoments.slice(0,24):[];l.consequenceSeq=l.consequenceSeq||0;l.consequenceResultSeq=l.consequenceResultSeq||0;l.consequences=Array.isArray(l.consequences)?l.consequences.filter(function(x){return x&&!x.resolved}).slice(0,18):[];l.consequenceHistory=Array.isArray(l.consequenceHistory)?l.consequenceHistory.slice(0,24):[];l.arcSeq=l.arcSeq||0;l.arcResultSeq=l.arcResultSeq||0;l.arcs=Array.isArray(l.arcs)?l.arcs.filter(function(x){return x&&x.status!=='resolved'&&x.status!=='expired'}).slice(0,4):[];l.arcHistory=Array.isArray(l.arcHistory)?l.arcHistory.slice(0,16):[];l.foundingMemories=Array.isArray(l.foundingMemories)?l.foundingMemories.slice(0,10):[];return l
}
function scheduleConsequence(kind,title,desc,delay,payload,weight,sourceKey){
 var l=migrateLifeLoop(game),key=sourceKey||'',existing=key&&l.consequences.find(function(x){return x.sourceKey===key});if(existing)return existing;
 var d=Math.max(0,delay==null?6+R('memory')*8:delay),item={id:++l.consequenceSeq,kind:kind||'life',title:title||'Un souvenir revient',desc:desc||'',createdAge:game.player.ageMonths,dueAge:game.player.ageMonths+d,weight:weight==null?60:weight,sourceKey:key,payload:payload||{},resolved:false};
 l.consequences.push(item);l.consequences.sort(function(a,b){return a.dueAge-b.dueAge||b.weight-a.weight});l.consequences=l.consequences.slice(0,18);return item
}
function consequenceRelation(data){
 data=data||{};var id=data.relationId||data.participantId||null,name=data.relationName||data.participantName||null;if(id){var byId=relationById(id);if(byId)return byId}return name?game.relations.find(function(r){return r.name===name})||null:null
}
function arcStageFor(a){var h=a.hits||0,p=a.pressure||0;if(h>=8||p>=90)return 4;if(h>=6||p>=72)return 3;if(h>=4||p>=52)return 2;if(h>=2||p>=28)return 1;return 0}
function arcStageLabel(n){return['Graine','En cours','Escalade','Tournant','Héritage'][cl(n||0,0,4)]}
function arcPressureFor(sourceType,sourceId){if(!sourceId)return 0;var l=migrateLifeLoop(game),a=l.arcs.find(function(x){return x.status!=='resolved'&&x.status!=='expired'&&x.sourceType===sourceType&&String(x.sourceId)===String(sourceId)});return a?a.pressure||0:0}
function rememberFoundingMoment(title,text,kind,key){var l=migrateLifeLoop(game),same=l.foundingMemories.find(function(x){return key&&x.key===key});if(same)return same;var item={age:age(),title:title,text:text||'',kind:kind||'arc',key:key||'',weight:90};l.foundingMemories.unshift(item);l.foundingMemories=l.foundingMemories.slice(0,10);return item}
function closeArc(a,status,text){var l=migrateLifeLoop(game);if(!a||a.status==='resolved'||a.status==='expired')return false;a.status=status||'resolved';a.resolvedAge=game.player.ageMonths;a.summary=text||a.summary||'';l.arcs=l.arcs.filter(function(x){return x.id!==a.id});var h={seq:++l.arcResultSeq,id:a.id,key:a.key,title:a.title,stage:'Résolution',text:a.summary,age:age(),status:a.status,weight:a.pressure||60};l.arcHistory.unshift(h);l.arcHistory=l.arcHistory.slice(0,16);if((a.maxStage||a.stage||0)>=3)rememberFoundingMoment(a.title,a.summary,a.type,a.key);return h}
function registerArcSignal(type,sourceType,sourceId,sourceName,weight,meta){
 var l=migrateLifeLoop(game);if(!sourceId&&!sourceName)return null;var sid=String(sourceId||sourceName),key=(type||'life')+':'+(sourceType||'source')+':'+sid,a=l.arcs.find(function(x){return x.key===key}),now=game.player.ageMonths;
 if(!a){a={id:++l.arcSeq,key:key,type:type||'life',sourceType:sourceType||'source',sourceId:sid,sourceName:sourceName||sid,title:(type==='rival'?'Rivalité — ':type==='crew'?'Conflit avec ':type==='conflict'?'Conflit — ':type==='mentor'?'Transmission — ':'Fil — ')+(sourceName||sid),status:'forming',stage:0,maxStage:0,hits:0,pressure:0,createdAge:now,lastAge:now,region:meta&&meta.region||game.player.region,location:meta&&meta.location||game.player.island,summary:''};l.arcs.push(a)}
 var old=a.stage||0;a.hits=(a.hits||0)+1;a.pressure=cl((a.pressure||0)+Math.max(4,(weight||55)*.13),0,100);a.lastAge=now;a.region=meta&&meta.region||a.region;a.location=meta&&meta.location||a.location;a.stage=arcStageFor(a);a.maxStage=Math.max(a.maxStage||0,a.stage);a.status=a.stage>=1?'active':'forming';
 if(a.stage>old){var text=(a.stage===1?'Des événements séparés commencent à former une même histoire.':a.stage===2?'Ce fil revient assez souvent pour influencer tes opportunités.':a.stage===3?'Plusieurs trajectoires convergent maintenant autour de ce conflit.':'Ce fil est devenu l’un des éléments fondateurs de ta vie.'),h={seq:++l.arcResultSeq,id:a.id,key:a.key,title:a.title,stage:arcStageLabel(a.stage),text:text,age:age(),status:a.status,weight:a.pressure};l.arcHistory.unshift(h);l.arcHistory=l.arcHistory.slice(0,16);tl('ARC — '+a.title,arcStageLabel(a.stage)+' : '+text,a.stage>=3?'major':'story');if(a.stage>=4)rememberFoundingMoment(a.title,text,a.type,a.key)}
 l.arcs.sort(function(x,y){return(y.pressure||0)-(x.pressure||0)||(y.hits||0)-(x.hits||0)});while(l.arcs.length>4){var drop=l.arcs.pop();closeArc(drop,'expired','Ce fil s’éloigne progressivement de ta trajectoire.')}
 return a
}
function signalArcFromConsequence(c){var d=c&&c.payload||{},r=null;if(!c)return null;if(c.kind==='mission'&&d.sourceType&&d.sourceId)return registerArcSignal(d.sourceType==='crew'?'crew':d.sourceType==='conflict'?'conflict':'world',d.sourceType,d.sourceId,d.sourceName||d.sourceId,c.weight||60,d);if(c.kind==='rivalry'){r=consequenceRelation(d);return r?registerArcSignal('rival','relation',r.id,r.name,c.weight||75,d):null}if(c.kind==='story'){r=consequenceRelation(d);if(r)return registerArcSignal(d.storyType==='rival-challenge'?'rival':d.storyType==='mentor-lesson'?'mentor':'relation','relation',r.id,r.name,c.weight||58,d);if(d.storyType==='crew-pressure'&&d.crewId)return registerArcSignal('crew','crew',d.crewId,d.crewName||d.crewId,c.weight||58,d)}return null}
function arcTick(m){var l=migrateLifeLoop(game),now=game.player.ageMonths;l.arcs.slice().forEach(function(a){var missing=false;if(a.sourceType==='crew')missing=!game.world.crews.some(function(c){return String(c.id)===String(a.sourceId)&&c.status==='active'});else if(a.sourceType==='relation')missing=!game.relations.some(function(r){return String(r.id)===String(a.sourceId)&&r.status==='active'});else if(a.sourceType==='conflict')missing=!game.world.conflicts.some(function(c){return String(c.id)===String(a.sourceId)&&c.status==='active'});if(missing)return closeArc(a,'resolved','La source de ce conflit disparaît du monde vivant.');if(now-(a.lastAge||a.createdAge||now)>72)return closeArc(a,'expired','Après plusieurs années sans nouvel événement, ce fil cesse d’être actif.');a.pressure=cl((a.pressure||0)-.025*m,0,100)})}
function resolveConsequence(c){
 if(!c||c.resolved||!game.alive)return false;var p=game.player,d=c.payload||{},text='',tone=(c.weight||0)>=72?'major':'story',r=null;
 if(c.kind==='story'){
  r=consequenceRelation(d);
  if(r&&r.status==='active'){
   if(d.storyType==='rival-challenge'){
    r.rivalry=cl(r.rivalry+(d.closure==='resolved'?4:2),0,100);r.respect=cl(r.respect+(d.closure==='resolved'?2:-1),0,100);r.challengeReady=d.closure==='resolved'||r.challengeReady;addRelationMemory(r,'Votre ancien duel nourrit encore la rivalité.','callback');text='Le souvenir de votre ancien duel ravive la rivalité avec '+r.name+'.'
   }
   else if(d.storyType==='mentor-lesson'){
    if(d.closure==='resolved'){r.respect=cl(r.respect+3,0,100);r.trust=cl(r.trust+1,0,100)}else r.trust=cl(r.trust-2,0,100);addRelationMemory(r,d.closure==='resolved'?'Une ancienne leçon continue de porter ses fruits.':'Une leçon inachevée laisse un goût d’occasion manquée.','callback');text=d.closure==='resolved'?r.name+' constate que son ancienne leçon a laissé une trace durable.':r.name+' se souvient encore de cette leçon restée inachevée.'
   }
   else if(d.storyType==='social-favor'){
    if(d.closure==='resolved'){r.trust=cl(r.trust+3,0,100);r.loyalty=cl(r.loyalty+2,0,100);r.respect=cl(r.respect+2,0,100)}else{r.trust=cl(r.trust-3,0,100);r.affection=cl(r.affection-1,0,100)}addRelationMemory(r,d.closure==='resolved'?'Ton aide passée reste un souvenir important.':'Ton refus passé n’est pas totalement oublié.','callback');text=d.closure==='resolved'?r.name+' se souvient encore de l’aide que tu lui as apportée.':r.name+' n’a pas complètement oublié ton refus.'
   }
   else if(d.storyType==='youth-promise'){
    if(d.closure==='resolved'){r.trust=cl(r.trust+2,0,100);r.affection=cl(r.affection+2,0,100)}else r.trust=cl(r.trust-2,0,100);addRelationMemory(r,d.closure==='resolved'?'Votre ancienne promesse reste un repère commun.':'Une promesse de jeunesse restée inachevée refait surface.','callback');text=d.closure==='resolved'?'La promesse tenue avec '+r.name+' reste un repère dans votre histoire.':'Une ancienne promesse avec '+r.name+' refait surface sans avoir été vraiment refermée.'
   }
   else if(d.closure==='resolved'){r.trust=cl(r.trust+2,0,100);r.loyalty=cl(r.loyalty+1,0,100);addRelationMemory(r,'Une ancienne histoire entre vous refait surface et renforce le souvenir du lien.','callback');text=r.name+' se souvient de ce que vous avez vécu. Cette ancienne décision renforce encore légèrement votre lien.'}
   else{r.trust=cl(r.trust-2,0,100);r.affection=cl(r.affection-1,0,100);addRelationMemory(r,'Une ancienne histoire mal terminée refait surface.','callback');text=r.name+' n’a pas complètement oublié la manière dont cette histoire s’est terminée.'}
  }else{text='Cette ancienne histoire continue d’influencer la façon dont ton parcours est perçu, même si ses protagonistes ont changé de route.';p.reputation=Math.max(0,p.reputation+(d.closure==='resolved'?1:0))}
 }
 else if(c.kind==='mission'){
  if(d.sourceType==='crew'){
   var crew=game.world.crews.find(function(x){return x.id===d.sourceId&&x.status==='active'});
   if(crew){crew.playerGrudge=cl((crew.playerGrudge||0)+(d.success?10:4),0,100);if(d.success)crew.intention=crew.faction==='Chasseur de primes'?'Traquer une cible':'S’entraîner';else crew.intention=crew.faction==='Pirates'?'Chercher un butin':crew.faction==='Chasseur de primes'?'Traquer une cible':crew.faction==='Révolutionnaires'?'Étendre son réseau':'Recruter';crew.intentionMonths=1+Math.floor(R('memory')*3);if(!d.success)crew.morale=cl((crew.morale==null?50:crew.morale)+3,0,100);text=d.success?crew.name+' n’a pas oublié ta victoire. L’équipage cherche désormais à se renforcer avant une prochaine confrontation.':crew.name+' transforme son succès contre toi en nouvel élan et poursuit des objectifs plus ambitieux.';news('Une ancienne mission laisse des traces',crew.name+' réagit encore à l’intervention de '+p.name+'.','')}
  }
  else if(d.sourceType==='actor'){
   var a=game.world.actors.find(function(x){return x.name===d.sourceId&&x.status==='active'});if(a){a.momentum=cl((a.momentum||0)+(d.success?-.4:.4),-8,12);text=a.name+' ajuste encore sa trajectoire après votre ancienne confrontation.'}
  }
  else if(d.sourceType==='conflict'){
   var cf=game.world.conflicts.find(function(x){return x.id===d.sourceId&&x.status==='active'});if(cf){cf.intensity=cl(cf.intensity+(d.success?-2:2),0,100);text='Le conflit autour de '+cf.location+' porte encore les conséquences de ton ancienne mission.'}
  }
  if(!text){p.reputation+=d.success?1:0;text='Les répercussions de cette mission continuent de circuler dans ton réseau et nourrissent ta réputation.'}
 }
 else if(c.kind==='rivalry'){
  r=consequenceRelation(d);
  if(r&&r.status==='active'&&r.role==='rival'){r.challengeReady=true;r.rivalry=cl(r.rivalry+(d.stage==='Némésis'?6:4),0,100);r.npcIntent='Défier son rival';r.npcIntentMonths=1;if(d.stage==='Némésis')r.npcPower=cl((r.npcPower||1)+.5+R('memory')*1.2,1,r.npcPotential||100);addRelationMemory(r,'La rivalité reprend de l’intensité après une période de silence.','callback');text=r.name+' revient dans ton horizon. Votre rivalité n’était pas terminée, seulement en sommeil.'}
  else{text='Le souvenir de cette rivalité continue d’alimenter ta réputation auprès de ceux qui connaissent ton parcours.';p.reputation+=1}
 }
 else if(c.kind==='combat'){p.reputation+=c.weight>=82?2:1;text='Le récit de cet affrontement circule encore. Ce combat devient une référence durable lorsqu’on parle de ton parcours.';if(c.weight>=82)news('Un combat que l’on raconte encore',c.title+' continue d’être cité dans les récits qui circulent.','')}
 else{text=c.desc||'Un ancien événement produit enfin une conséquence visible dans ta trajectoire.'}
 c.resolved=true;c.resolvedAge=p.ageMonths;var l=migrateLifeLoop(game);l.consequences=l.consequences.filter(function(x){return x.id!==c.id});var h={seq:++l.consequenceResultSeq,id:c.id,kind:c.kind,title:c.title,text:text,age:age(),weight:c.weight||60,sourceKey:c.sourceKey||''};l.consequenceHistory.unshift(h);l.consequenceHistory=l.consequenceHistory.slice(0,24);tl('Écho du passé — '+c.title,text,tone);signalArcFromConsequence(c);return h
}
function processConsequences(){
 var l=migrateLifeLoop(game),due=l.consequences.filter(function(x){return !x.resolved&&x.dueAge<=game.player.ageMonths}).sort(function(a,b){return b.weight-a.weight||a.dueAge-b.dueAge});return due.length?resolveConsequence(due[0]):false
}
function advancePlan(){
 var p=game.player,j=migrateJustice(p),danger=inf().danger||0,severe=p.health<45||(p.conditions||[]).some(function(c){return(c.severity||1)>=2});
 if(game.pending)return{key:'decision',label:'Décision en attente',tone:'urgent',min:0,max:0,reason:'Une décision importante interrompt automatiquement le temps.'};var storyWait=awaitingStory();if(storyWait)return{key:'story-decision',label:'Fil narratif à décider',tone:'urgent',min:0,max:0,reason:storyWait.title+' attend ta décision avant que le temps continue.'};
 if(j.detained&&j.prison){var prisonCritical=p.health<50||(j.prison.security||0)>=82;return{key:'detention',label:'Détention',tone:prisonCritical?'urgent':'active',min:prisonCritical?1:2,max:prisonCritical?2:4,limit:j.prison.remaining,reason:prisonCritical?'La détention reste suivie de près car ton état ou le niveau de sécurité exige davantage de vigilance.':'Les semaines ordinaires de détention sont regroupées ; seuls les incidents, décisions et la libération méritent une interruption.'}};
 if(game.mission)return{key:'mission',label:'Mission en cours',tone:'active',min:Math.min(1.25,game.mission.remaining),max:Math.min(3,game.mission.remaining),limit:game.mission.remaining,reason:'Le temps avance jusqu’à une étape significative de la mission.'};
 if(p.travel){if(p.travel.source==='career-transfer')return{key:'travel-director',label:'Mutation en cours',tone:'active',min:Math.min(6,p.travel.remaining),max:Math.min(6,p.travel.remaining),limit:p.travel.remaining,reason:'Le Life Director regroupe cette mutation en une traversée compacte et ne t’interrompt que pour un événement réellement majeur.'};return{key:'travel',label:'Navigation',tone:'active',min:Math.min(1,p.travel.remaining),max:Math.min(2.5,p.travel.remaining),limit:p.travel.remaining,reason:'La traversée avance jusqu’à un incident utile ou l’arrivée.'}};
 if(severe)return{key:'recovery',label:'Récupération',tone:'urgent',min:.5,max:1.5,reason:'Blessures ou santé fragile : la simulation surveille de près ton état.'};
 if(p.ageMonths<24)return{key:'infancy',label:'Petite enfance',tone:'calm',min:6,max:9,reason:'Les mois passent vite tant qu’aucun événement important ne survient.'};
 if(p.ageMonths<72)return{key:'childhood',label:'Enfance',tone:'calm',min:4,max:7,reason:'Le temps avance encore rapidement, avec interruption automatique en cas d’événement.'};
 if(p.ageMonths<180)return{key:'formation',label:'Formation',tone:'active',min:3.5,max:5.5,reason:'La progression reste suivie, mais les périodes ordinaires sont davantage compressées.'};
 if(danger>=58||currentHeat()>55){var pirateVeteran=p.faction==='Pirates'&&p.ageMonths>=240&&power()>=48&&!severe,heat=currentHeat();if(pirateVeteran&&heat<82)return{key:'high-risk',label:'Mer dangereuse maîtrisée',tone:'active',min:2,max:4,reason:'Ton expérience pirate absorbe désormais les incidents mineurs ; seuls les vrais tournants interrompent la période.'};if(pirateVeteran&&heat<94)return{key:'high-risk',label:'Traque soutenue',tone:'active',min:1.25,max:2.75,reason:'La pression reste forte, mais ton expérience permet de regrouper les incidents secondaires en périodes plus longues.'};return{key:'high-risk',label:'Contexte tendu',tone:'urgent',min:.5,max:1.5,reason:'Danger local ou pression judiciaire extrême : les périodes restent courtes.'}};
 if(p.activity==='Explorer')return{key:'exploration',label:'Exploration',tone:'active',min:1.5,max:3,reason:'L’exploration avance par blocs jusqu’à une découverte ou un incident notable.'};
 if(p.career!=='Aucune'&&careerRecord().retired)return{key:'veteran-life',label:'Vie de vétéran',tone:'calm',min:5.5,max:7.5,reason:'Le service actif est derrière toi ; le temps se compresse davantage, sauf lorsqu’une mission, une relation ou un événement mondial mérite ton attention.'};
 if(p.career!=='Aucune')return{key:'active-life',label:'Vie active',tone:'active',min:4,max:6,reason:'La V5.0 compresse la vie professionnelle ordinaire ; missions, voyages et vrais tournants interrompent toujours immédiatement cette période.'};
 return{key:'calm-life',label:'Période calme',tone:'calm',min:5.5,max:7.5,reason:'La V5.0 compresse les périodes adultes réellement calmes ; le moteur vérifie toujours mois par mois si un événement mérite ton attention.'}
}
function chooseAdvanceDuration(plan){
 if(!plan||plan.max<=0)return 0;var m=plan.min+(plan.max-plan.min)*R('time');if(plan.limit!=null)m=Math.min(m,Math.max(.25,plan.limit));return Math.max(.25,Math.round(m*4)/4)
}
function durationText(m){
 if(m<=.3)return'environ une semaine';if(m<=.6)return'environ deux semaines';if(m<1)return'environ trois semaines';var q=Math.round(m*4)/4,whole=Math.floor(q),frac=Math.round((q-whole)*4),suffix=frac===1?'¼':frac===2?'½':frac===3?'¾':'',label=(whole?whole:'')+suffix;if(!label)label='1';return label+' mois'
}
function planWindowText(plan){
 if(!plan||plan.max<=0)return'Décision';var a=durationText(plan.min),b=durationText(plan.max);return plan.min===plan.max?a:a+' à '+b
}
function totalTrackedGain(){
 var p=game.player,pr=migrateProgression(game,p);return Object.keys(pr.gains||{}).reduce(function(a,k){return a+(pr.gains[k]||0)},0)
}
function totalAbilityProgress(){
 var p=game.player,haki=(p.haki.Observation||0)+(p.haki.Armement||0)+(p.haki.Conquérant||0),tech=Object.keys(p.techniqueMastery||{}).reduce(function(a,k){return a+(p.techniqueMastery[k]||0)},0);return totalTrackedGain()+haki+(p.fruitMastery||0)+tech
}
function captureAdvanceState(){
 var p=game.player,l=migrateLifeLoop(game),values={};ST.concat(SK).forEach(function(k){values[k]=keyValue(k)});Object.keys(p.haki||{}).forEach(function(k){values['Haki '+k]=p.haki[k]||0});values['Fruit']=p.fruitMastery||0;return{age:p.ageMonths,money:p.money,health:p.health,energy:p.energy,power:power(),powerRank:powerRank(),gain:totalAbilityProgress(),values:values,momentSeq:l.momentSeq,majorSeq:l.majorSeq,worldSeq:l.worldSeq||0,signatureSeq:l.signatureSeq||0,consequenceResultSeq:l.consequenceResultSeq||0,arcResultSeq:l.arcResultSeq||0,achievementIds:Object.keys(game.achievements&&game.achievements.unlocked||{}),worldActorSeq:game.world.worldState&&game.world.worldState.seq||0}
}
function worldPulseSince(seq){
 var ws=game.world.worldState||{},items=[];
 (ws.actorHistory||[]).filter(function(x){return x.seq>seq&&x.impact>=2.5}).slice(0,2).forEach(function(x){items.push({kind:'actor',title:x.actor+' : '+x.outcome,importance:x.impact})});
 (ws.territoryHistory||[]).filter(function(x){return x.seq>seq}).slice(0,2).forEach(function(x){items.push({kind:'territory',title:x.name+' : '+(x.from!==x.to?x.from+' → '+x.to:(x.contested?'territoire contesté':'stabilité '+x.stability)),importance:x.from!==x.to?5:3})});
 (ws.crewHistory||[]).filter(function(x){return x.seq>seq&&x.impact>=2.5}).slice(0,1).forEach(function(x){items.push({kind:'crew',title:x.name+' : '+x.outcome,importance:x.impact})});
 (ws.canonBranchHistory||[]).filter(function(x){return x.seq>seq}).slice(0,2).forEach(function(x){items.push({kind:'canon',title:x.title+' : '+(x.outcome==='escalation'?'escalade':x.outcome==='new-balance'?'nouvel équilibre':'résolution'),importance:x.outcome==='escalation'?6:4.5})});
 (ws.playerCanonImpact||[]).filter(function(x){return x.seq>seq}).slice(0,1).forEach(function(x){items.push({kind:'canon-player',title:'Tu influences '+x.eventTitle,importance:x.kind==='major'?7:5})});
 (ws.sagaHistory||[]).filter(function(x){return x.seq>seq}).slice(0,1).forEach(function(x){items.push({kind:'saga',title:'Saga : '+x.title+' → '+x.outcome,importance:6})});
 return items.sort(function(a,b){return b.importance-a.importance}).slice(0,3)
}
function finalizeAdvanceReport(before,m,plan){
 var p=game.player,l=migrateLifeLoop(game),rankNow=powerRank();if(before.powerRank&&before.powerRank!==rankNow)tl('PALIER DE PUISSANCE','Ta progression te fait passer de '+before.powerRank+' à '+rankNow+'.','major');var moments=Math.max(0,l.momentSeq-before.momentSeq),major=Math.max(0,l.majorSeq-before.majorSeq),powerDelta=power()-before.power,gainDelta=totalAbilityProgress()-before.gain,moneyDelta=p.money-before.money;if(game.pending){moments=Math.max(1,moments);major=Math.max(1,major)}
 l.advanceCount++;l.quietAdvances=moments?0:l.quietAdvances+1;l.recentKinds.unshift(plan&&plan.key||'unknown');l.recentKinds=l.recentKinds.slice(0,6);
 var details=[];Object.keys(before.values||{}).forEach(function(k){var now=k==='Fruit'?(p.fruitMastery||0):k.indexOf('Haki ')===0?(p.haki[k.slice(5)]||0):keyValue(k),d=now-before.values[k];if(d>.04)details.push([k,d])});details.sort(function(a,b){return b[1]-a[1]});details=details.slice(0,3);var worldHighlights=(l.recentWorld||[]).filter(function(x){return x.seq>(before.worldSeq||0)}).slice(0,3),signatureHighlights=(l.signatureMoments||[]).filter(function(x){return x.id>(before.signatureSeq||0)&&x.kind!=='achievement'}).slice(0,2),causalHighlights=(l.consequenceHistory||[]).filter(function(x){return x.seq>(before.consequenceResultSeq||0)}).slice(0,2),arcHighlights=(l.arcHistory||[]).filter(function(x){return x.seq>(before.arcResultSeq||0)}).slice(0,2),beforeAchievements=before.achievementIds||[],achievementHighlights=Object.keys(game.achievements&&game.achievements.unlocked||{}).filter(function(id){return beforeAchievements.indexOf(id)<0}).map(function(id){var a=ACHIEVEMENTS.find(function(x){return x.id===id});return a?a.name:id}).slice(0,3);l.lastAdvance={months:m,kind:plan&&plan.key||'',label:plan&&plan.label||'',moments:moments,major:major,powerDelta:powerDelta,gainDelta:gainDelta,moneyDelta:moneyDelta,healthDelta:p.health-before.health,energyDelta:p.energy-before.energy,activity:p.activity,focus:currentFocus(),details:details,worldHighlights:worldHighlights,signatureHighlights:signatureHighlights,causalHighlights:causalHighlights,arcHighlights:arcHighlights,achievementHighlights:achievementHighlights,worldPulseHighlights:worldPulseSince(before.worldActorSeq||0),ageFrom:before.age,ageTo:p.ageMonths};
 return l.lastAdvance
}
function eventNoveltyWeight(id){
 var recent=migrateLifeLoop(game).recentEvents||[],i=recent.indexOf(id);return i<0?1:i===0?.22:i===1?.38:i===2?.55:i<=4?.72:.86
}
function weightedEventPick(items){
 var l=migrateLifeLoop(game),total=0,weighted=items.map(function(x){var weight=Math.max(.01,x.weight*eventNoveltyWeight(x.id));total+=weight;return{x:x,w:weight}}),r=R('e')*total;
 for(var i=0;i<weighted.length;i++){r-=weighted[i].w;if(r<=0){l.recentEvents.unshift(weighted[i].x.id);l.recentEvents=l.recentEvents.slice(0,8);return weighted[i].x}}return weighted.length?weighted[weighted.length-1].x:null
}
function eventChance(m){
 var l=migrateLifeLoop(game),w=game.world,d=inf().danger||0,base=.09+Math.min(.18,m*.025)+Math.min(.11,d/650)+Math.min(.10,(w.globalTension||0)/650)+Math.min(.22,l.quietAdvances*.09),p=game.player;if(p.ageMonths>=180&&p.career==='Aucune'&&d<58)base*=.88;if(p.faction==='Pirates'&&p.ageMonths>=240&&power()>=48&&currentHeat()<82)base*=.82;
 return cl(base,.08,.68)
}
function renderAdvanceLoop(){
 var l=migrateLifeLoop(game),plan=advancePlan(),badge=$('#advanceWindowBadge'),chapter=visiblePersonalChapter();$('#advanceRhythm').textContent=plan.label;badge.textContent=planWindowText(plan);badge.className='badge '+(plan.tone==='urgent'?'rhythm-urgent':plan.tone==='active'?'rhythm-active':'rhythm-calm');$('#advancePreview').textContent=plan.reason+' Focus : '+(game.player.focus==='Auto'?'Auto → '+currentFocus():currentFocus())+'.'+(chapter?' Chapitre actuel : '+chapter.title+'.':'');
 var report=l.lastAdvance,box=$('#advanceReport');if(!report){box.classList.add('hidden')}else{box.classList.remove('hidden');$('#advanceReportDuration').textContent=durationText(report.months);$('#advanceReportStats').innerHTML='<div><span>Progression</span><strong>'+(report.gainDelta>0?'+'+report.gainDelta.toFixed(1):'Stable')+'</strong></div><div><span>Puissance</span><strong>'+(report.powerDelta>=0?'+':'')+report.powerDelta.toFixed(1)+'</strong></div><div><span>Berry</span><strong>'+(report.moneyDelta>=0?'+':'')+Math.round(report.moneyDelta).toLocaleString('fr-FR')+'</strong></div><div><span>Moments</span><strong>'+report.moments+'</strong></div>';var progressText=report.details&&report.details.length?' Focus '+(report.focus||currentFocus())+' : '+report.details.map(function(x){return x[0]+' +'+x[1].toFixed(1)}).join(' • ')+'.':'';var txt=report.moments?'Cette période a produit '+report.moments+' moment'+(report.moments>1?'s':'')+' notable'+(report.moments>1?'s':'')+(report.major?' dont '+report.major+' majeur'+(report.major>1?'s':''):'')+'.'+progressText:report.gainDelta>.05?'Période calme, progression automatique maintenue.'+progressText:'Période réellement calme. Le directeur d’événements augmente désormais la probabilité d’une interruption significative.';if(report.signatureHighlights&&report.signatureHighlights.length)txt+=' Moment fort : '+report.signatureHighlights.map(function(x){return x.title}).join(' • ')+'.';if(report.causalHighlights&&report.causalHighlights.length)txt+=' Conséquence : '+report.causalHighlights.map(function(x){return x.title}).join(' • ')+'.';if(report.arcHighlights&&report.arcHighlights.length)txt+=' Arc : '+report.arcHighlights.map(function(x){return x.title+' ('+x.stage+')'}).join(' • ')+'.';if(report.achievementHighlights&&report.achievementHighlights.length)txt+=' Accomplissement : '+report.achievementHighlights.join(' • ')+'.';if(report.worldHighlights&&report.worldHighlights.length)txt+=' Autour de toi : '+report.worldHighlights.map(function(x){return x.title}).join(' • ')+'.';if(report.worldPulseHighlights&&report.worldPulseHighlights.length)txt+=' Monde vivant : '+report.worldPulseHighlights.map(function(x){return x.title}).join(' • ')+'.';$('#advanceReportText').textContent=txt}
 var storyWait=awaitingStory();$('#advanceBtn').disabled=!game.alive;$('#advanceHint').textContent=game.pending?'Décision à prendre — appuie pour l’ouvrir':storyWait?'Fil narratif à décider — appuie pour l’ouvrir':plan.max>0?planWindowText(plan)+' • '+plan.label:'Décision en attente'
}


var EXPLORATION_REGION_FLAVOR={
 'East Blue':{identity:'Mers accessibles, villages côtiers et petites puissances locales.',tags:['Côtes','Villages','Routes marchandes'],themes:['port caché','histoire locale','atelier artisanal','réseau de contrebandiers']},
 'North Blue':{identity:'Royaumes froids, tensions politiques et réseaux clandestins.',tags:['Politique','Froid','Réseaux'],themes:['archives oubliées','laboratoire abandonné','passage clandestin','ancienne fortification']},
 'West Blue':{identity:'Îles de savoir, criminalité organisée et vieilles histoires.',tags:['Culture','Histoire','Criminalité'],themes:['ruines savantes','bibliothèque privée','marché discret','vestige historique']},
 'South Blue':{identity:'Faune étrange, routes lointaines et communautés isolées.',tags:['Nature','Isolement','Faune'],themes:['sanctuaire naturel','route oubliée','plante rare','campement isolé']},
 'Grand Line':{identity:'Climats impossibles, îles uniques et routes imprévisibles.',tags:['Climat extrême','Aventure','Mystères'],themes:['phénomène climatique','ruine ancienne','raccourci maritime','trésor oublié']},
 'New World':{identity:'Territoires dominés par des puissances majeures et mers hostiles.',tags:['Puissances','Danger','Ressources rares'],themes:['avant-poste secret','ressource stratégique','route dangereuse','vestige d’une grande puissance']}
};
var ISLAND_SPECIAL={
 'Loguetown':{identity:'Ville de l’exécution de Roger, carrefour de la Grande Ère de la Piraterie.',tags:['Histoire','Marine','Commerce'],themes:['place de l’exécution','archives de la Marine','rumeur de pirate','marché historique']},
 'Water 7':{identity:'Métropole maritime bâtie autour des canaux et de la construction navale.',tags:['Chantiers navals','Canaux','Commerce'],themes:['atelier de charpentier','canal secondaire','plan naval ancien','contact de chantier']},
 'Sabaody':{identity:'Archipel de mangroves, carrefour du monde et porte du Nouveau Monde.',tags:['Mangroves','Sous-monde','Carrefour'],themes:['revendeur clandestin','bulle de mangrove','route de contrebande','information du Nouveau Monde']},
 'Alabasta':{identity:'Grand royaume désertique dont les villes dépendent de routes vitales.',tags:['Désert','Royaume','Ruines'],themes:['ruine du désert','source cachée','ancienne route caravanière','rumeur royale']},
 'Little Garden':{identity:'Île préhistorique où le temps semble s’être arrêté.',tags:['Préhistoire','Faune','Survie'],themes:['trace de géant','nid préhistorique','plante ancienne','passage sauvage']},
 'Drum':{identity:'Île hivernale connue pour sa médecine et ses reliefs vertigineux.',tags:['Neige','Médecine','Montagnes'],themes:['herbe médicinale','refuge de montagne','ancien cabinet','passage enneigé']},
 'Jaya':{identity:'Île agitée où aventuriers, criminels et rêves impossibles se croisent.',tags:['Pirates','Rumeurs','Aventure'],themes:['rumeur céleste','cache pirate','carte incomplète','contact douteux']},
 'Fish-Man Island':{identity:'Royaume sous-marin au carrefour des routes vers le Nouveau Monde.',tags:['Sous-marin','Hommes-poissons','Courants'],themes:['courant secret','sanctuaire marin','artisan local','rumeur des profondeurs']},
 'Punk Hazard':{identity:'Île ravagée par des expériences et des climats artificiellement extrêmes.',tags:['Science','Danger','Climat'],themes:['laboratoire détruit','échantillon rare','installation secrète','archive scientifique']},
 'Dressrosa':{identity:'Royaume méditerranéen vivant sous une forte influence politique et criminelle.',tags:['Royaume','Commerce','Sous-monde'],themes:['atelier local','passage souterrain','contact criminel','archive royale']},
 'Zou':{identity:'Civilisation mouvante installée sur le dos d’un éléphant gigantesque.',tags:['Minks','Mobile','Ancien'],themes:['chemin de la forêt','tradition Mink','poste d’observation','trace historique']},
 'Whole Cake Island':{identity:'Territoire extrêmement surveillé organisé autour d’une puissance pirate dominante.',tags:['Empire pirate','Surveillance','Cuisine'],themes:['atelier culinaire','route surveillée','réseau local','stock rare']},
 'Wano':{identity:'Pays fermé de samouraïs, d’artisans et de ressources stratégiques.',tags:['Samouraïs','Kairouseki','Fermé'],themes:['forge ancienne','gisement discret','dojo isolé','passage de montagne']},
 'Egghead':{identity:'Île-laboratoire concentrant une technologie très en avance sur son époque.',tags:['Science','Technologie','Gouvernement'],themes:['prototype abandonné','archive scientifique','atelier robotique','système expérimental']},
 'Ohara':{identity:'Île associée au savoir, aux recherches historiques et à leurs conséquences politiques.',tags:['Savoir','Histoire','Archéologie'],themes:['fragment d’archive','site d’étude','inscription ancienne','rumeur interdite']}
};
var SEA_CONDITIONS=[
 {id:'calm',name:'Mer calme',speed:.90,incident:.08},
 {id:'current',name:'Courants portants',speed:.82,incident:.11},
 {id:'rough',name:'Mer agitée',speed:1.08,incident:.19},
 {id:'fog',name:'Brouillard dense',speed:1.12,incident:.20},
 {id:'storm',name:'Tempête',speed:1.28,incident:.30}
];
function defaultExploration(){
 return{sites:{},totalDiscoveries:0,treasures:0,treasureValue:0,rumors:0,journeys:0,seaIncidents:0}
}
function migrateExploration(p){
 p.exploration=p.exploration||defaultExploration();var x=p.exploration;x.sites=x.sites||{};['totalDiscoveries','treasures','treasureValue','rumors','journeys','seaIncidents'].forEach(function(k){x[k]=x[k]||0});return x
}
function explorationSite(name){
 var p=game.player,x=migrateExploration(p),n=name||p.island;if(!x.sites[n])x.sites[n]={familiarity:0,attempts:0,visits:0,discoveries:[],rumors:[],lastExploreAge:null};var s=x.sites[n];s.discoveries=s.discoveries||[];s.rumors=s.rumors||[];s.familiarity=cl(s.familiarity||0,0,100);return s
}
function islandProfile(name){
 var q=infStatic(name),reg=EXPLORATION_REGION_FLAVOR[q.region]||EXPLORATION_REGION_FLAVOR['East Blue'],sp=ISLAND_SPECIAL[name]||{},themes=(sp.themes||reg.themes).slice(),tags=(sp.tags||reg.tags).slice(),seed=H(name+':profile');
 return{name:name,region:q.region,danger:q.danger,identity:sp.identity||reg.identity,tags:tags,themes:themes,signature:themes[seed%themes.length]}
}
function explorationLevel(v){return v<15?'Inconnue':v<35?'Reconnue':v<60?'Connue':v<85?'Bien connue':'Maîtrisée'}
function discoveryPool(name){
 var p=islandProfile(name),types=['Lieu notable','Histoire','Ressource','Contact'],out=[];
 p.themes.forEach(function(t,i){out.push({id:name+'-'+i,name:(i===0?'Repère : ':i===1?'Indice : ':i===2?'Ressource : ':'Contact : ')+t,type:types[i%types.length],desc:i===0?'Un élément marquant de la géographie locale.':i===1?'Une information qui éclaire l’histoire ou les forces de l’île.':i===2?'Une ressource ou opportunité propre à la zone.':'Une piste sociale ou professionnelle utile sur place.',threshold:[12,30,52,76][i]||80})});
 out.push({id:name+'-secret',name:'Secret de '+name,type:'Secret',desc:'Une découverte rare qui n’apparaît qu’après une exploration approfondie.',threshold:90});
 return out
}
function registerDiscovery(name,d){
 var p=game.player,site=explorationSite(name),x=migrateExploration(p);if(site.discoveries.indexOf(d.id)>=0)return false;site.discoveries.push(d.id);x.totalDiscoveries++;game.codex.discoveries=game.codex.discoveries||[];if(!game.codex.discoveries.some(function(z){return z.id===d.id}))game.codex.discoveries.push({id:d.id,place:name,name:d.name,type:d.type,desc:d.desc});tl('Découverte — '+name,d.name+' : '+d.desc,d.type==='Secret'?'major':'');return true
}
function discoverByKnowledge(name){
 var site=explorationSite(name),pool=discoveryPool(name).filter(function(d){return site.familiarity>=d.threshold&&site.discoveries.indexOf(d.id)<0});if(!pool.length)return false;pool.sort(function(a,b){return a.threshold-b.threshold});return registerDiscovery(name,pool[0])
}
function currentRumor(name){
 var p=game.player,w=game.world,region=infStatic(name).region,parts=[],conf=w.conflicts.find(function(c){return c.location===name||c.region===region}),actor=w.actors.filter(function(a){return a.region===region&&a.status==='active'}).sort(function(a,b){return b.importance-a.importance})[0],crew=w.crews.filter(function(c){return c.region===region&&c.status==='active'}).sort(function(a,b){return b.power-a.power})[0],market=w.markets&&w.markets[name],routes=PL[name]&&PL[name][2]||[];
 if(conf)parts.push('On parle d’un affrontement entre '+conf.attacker+' et '+conf.defender+' autour de '+conf.location+'.');
 if(actor)parts.push(actor.name+' aurait récemment été aperçu dans '+region+'.');
 if(crew)parts.push('L’équipage '+crew.name+' serait actif dans '+region+'.');
 if(market){var scarce=TRADE_GOODS.map(function(g){return{g:g,x:market.goods[g.id]}}).filter(function(z){return z.x}).sort(function(a,b){return(a.x.stock-a.x.demand)-(b.x.stock-b.x.demand)})[0];if(scarce&&scarce.x.stock<scarce.x.demand)parts.push('Les '+scarce.g.name.toLowerCase()+' deviennent difficiles à trouver à '+name+'.')}
 if(routes.length)parts.push('Les navigateurs discutent beaucoup de la route vers '+routes[H(name+':rumor:'+Math.floor(p.ageMonths/6))%routes.length]+'.');
 return parts.length?parts[H(String(game.seed)+':rumor:'+name+':'+Math.floor(p.ageMonths/3))%parts.length]:'Les habitants évoquent des mouvements inhabituels autour de '+name+'.'
}
function learnLocalRumor(name){
 var site=explorationSite(name),text=currentRumor(name);if(site.rumors.some(function(r){return r.text===text}))return false;site.rumors.unshift({text:text,age:age()});site.rumors=site.rumors.slice(0,6);migrateExploration(game.player).rumors++;tl('Rumeur locale',text);return true
}
function explorationTick(m){
 var p=game.player;if(p.travel||p.activity!=='Explorer')return false;var site=explorationSite(p.island),before=site.familiarity,nav=p.skills.Navigation||0,disc=p.stats.Discipline||0,obs=p.haki.Observation||0,rate=(1.35+nav*.018+disc*.009+obs*.006)*m*cl(1-site.familiarity/125,.25,1);site.familiarity=cl(site.familiarity+rate,0,100);site.attempts++;site.lastExploreAge=p.ageMonths;var found=discoverByKnowledge(p.island);
 if(!found&&R('explore')<cl(.06*m+site.familiarity/900,.03,.22))learnLocalRumor(p.island);
 if(site.familiarity>=70&&R('explore')<.012*m){var v=1500+Math.round(R('explore')*(8000+inf().danger*220));p.money+=v;p.life.assets.treasure=(p.life.assets.treasure||0)+v;migrateExploration(p).treasures++;migrateExploration(p).treasureValue+=v;attemptBreakthrough('exploration',55+inf().danger*.35,['Navigation','Discipline','Réflexes','Science']);tl('Trouvaille', 'Ton exploration de '+p.island+' révèle un butin estimé à '+v.toLocaleString('fr-FR')+' B.','major')}
 return site.familiarity>before
}
function chooseSeaCondition(from,to){
 var danger=infStatic(to).danger,r=R('sea'),storm=cl(.04+danger/500,.04,.22),rough=.22+danger/600,fog=.12;
 if(r<storm)return SEA_CONDITIONS[4];if(r<storm+rough)return SEA_CONDITIONS[2];if(r<storm+rough+fog)return SEA_CONDITIONS[3];if(r>.82)return SEA_CONDITIONS[1];return SEA_CONDITIONS[0]
}
function routeEstimate(from,to){
 var p=game.player,z=infStatic(to).danger,base=.6+z/35+R('t')*.8,o=p.organization,cond=chooseSeaCondition(from,to);if(o&&o.ship){var st=SHIP_TIERS[o.ship.tier||0]||SHIP_TIERS[0];base*=1-st.speed;if(o.ship.condition<40)base*=1.18}var load=cargoUsed()/Math.max(1,cargoCapacity());base*=1+cl(load,0,1)*.08;base*=cond.speed;return{months:Math.max(.5,Math.round(base*10)/10),condition:cond,load:load}
}
function addJourneyLog(t,text){var p=game.player;if(!p.travel)return;p.travel.logs=p.travel.logs||[];p.travel.logs.unshift({title:t,text:text});p.travel.logs=p.travel.logs.slice(0,5)}
function seaJourneyTick(m){
 var p=game.player,t=p.travel,o=p.organization;if(!t)return false;var cond=SEA_CONDITIONS.find(function(c){return c.id===t.condition})||SEA_CONDITIONS[0],nav=p.skills.Navigation||0,chance=cl(cond.incident+t.danger/700-nav/1100,.04,.42)*Math.min(1,m+.3);if(R('sea')>chance)return false;
 migrateExploration(p).seaIncidents++;t.incidents=(t.incidents||0)+1;var roll=R('sea');
 if(roll<.28){var g=gain('Navigation',.18+.35*R('sea'));if(t.danger>=45)attemptBreakthrough('navigation',t.danger,['Navigation','Réflexes','Discipline']);t.remaining=Math.max(0,t.remaining-(.05+.12*R('sea')));addJourneyLog('Lecture des courants','Tu exploites les conditions et gagnes du temps sur la route.');tl('Navigation maîtrisée','Tu lis correctement les courants en route vers '+t.destination+(g?' • Navigation +'+g.toFixed(1):'')+'.')}
 else if(roll<.52){var loss=5+Math.round(R('sea')*11);p.energy=cl(p.energy-loss,0,100);if(o&&o.ship&&R('sea')<.55)o.ship.condition=cl(o.ship.condition-(2+R('sea')*6),0,100);addJourneyLog(cond.name,'La traversée fatigue l’équipage'+(o&&o.ship?' et sollicite le navire':'')+'.');tl('Conditions difficiles',cond.name+' ralentit et fatigue la traversée.')}
 else if(roll<.72){if(o)o.supplies=cl(o.supplies-(3+R('sea')*8),0,100);addJourneyLog('Logistique en mer','Une partie des provisions est consommée ou perdue.');tl('Ravitaillement entamé','La traversée consomme davantage de provisions que prévu.')}
 else if(roll<.9){addJourneyLog('Rencontre maritime','Une présence hostile coupe momentanément ta route.');resolveAmbientDanger('Rencontre en mer',t.danger*.72+8)}
 else{addJourneyLog('Découverte maritime','Tu repères un détail utile sur cette route.');learnLocalRumor(t.destination);gain('Navigation',.15+.2*R('sea'))}
 return true
}
function setExplorationActivity(){var p=game.player;if(p.travel)return toast('Impossible de modifier l’exploration pendant une traversée.');if(p.ageMonths<72)return toast('Tu es encore trop jeune pour explorer seul cette île.');if(p.activity==='Explorer'){p.activity=p.career!=='Aucune'?'Carrière':'Routine';save();renderWorld();toast('Routine reprise • focus '+currentFocus());return}p.activity='Explorer';save();renderWorld();toast('Exploration active • focus '+currentFocus()+' conservé')}
function renderExploration(){
 var p=game.player,focus=p.travel?p.travel.destination:p.island,profile=islandProfile(focus),site=explorationSite(focus),pool=discoveryPool(focus),known=pool.filter(function(d){return site.discoveries.indexOf(d.id)>=0}),next=pool.filter(function(d){return site.discoveries.indexOf(d.id)<0}).sort(function(a,b){return a.threshold-b.threshold})[0],x=migrateExploration(p);
 $('#islandIdentity').textContent=p.travel?'Destination : '+focus:focus;$('#explorationBadge').textContent=explorationLevel(site.familiarity);$('#explorationMeterFill').style.width=Math.round(site.familiarity)+'%';
 $('#explorationSummary').innerHTML='<div><span>Connaissance</span><strong>'+Math.round(site.familiarity)+'%</strong></div><div><span>Découvertes</span><strong>'+known.length+'/'+pool.length+'</strong></div><div><span>Visites</span><strong>'+(site.visits||0)+'</strong></div><div><span>Total monde</span><strong>'+x.totalDiscoveries+'</strong></div>';
 $('#explorationFlavor').textContent=profile.identity+(next?' • Prochain palier de découverte vers '+next.threshold+'%.':' • Cette zone ne cache presque plus rien à tes yeux.');
 $('#localDiscoveries').innerHTML=known.length?known.slice(-4).reverse().map(function(d){return'<div class="discovery-item"><strong>'+e(d.name)+'</strong><small>'+e(d.type)+'</small></div>'}).join(''):'<div class="discovery-item"><small>Aucune découverte importante enregistrée.</small></div>';
 $('#localRumors').innerHTML=site.rumors.length?site.rumors.slice(0,4).map(function(r){return'<div class="discovery-item"><strong>Rumeur</strong><small>'+e(r.text)+'</small></div>'}).join(''):'<div class="discovery-item"><small>Aucune rumeur locale fiable pour le moment.</small></div>';
 if(p.travel)$('#explorationActions').innerHTML='<div class="career-card"><p>Termine la traversée avant d’explorer localement.</p></div>';
 else if(p.ageMonths<72)$('#explorationActions').innerHTML='<div class="career-card"><p>Tu découvres surtout ton environnement proche. L’exploration autonome se débloque à partir de 6 ans.</p></div>';
 else $('#explorationActions').innerHTML='<button id="exploreIslandBtn" class="action-card '+(p.activity==='Explorer'?'active':'')+'"><strong>'+(p.activity==='Explorer'?'Reprendre sa routine':'Explorer cette île')+'</strong><small>'+(p.activity==='Explorer'?'Arrêter l’exploration sans changer ton focus '+e(currentFocus())+'.':'AVANCER fera progresser la connaissance locale. Ton focus reste '+e(currentFocus())+'.')+'</small></button><button id="seekRumorBtn" class="action-card"><strong>Écouter les rumeurs</strong><small>Obtenir une information locale sans faire avancer le temps.</small></button>';
 var eb=$('#exploreIslandBtn');if(eb)eb.onclick=setExplorationActivity;var rb=$('#seekRumorBtn');if(rb)rb.onclick=function(){if(learnLocalRumor(p.island)){save();renderWorld()}else toast('Aucune nouvelle rumeur crédible pour le moment.')}
}
function renderJourney(){
 var p=game.player,card=$('#seaJourneyCard');if(!p.travel){card.classList.add('hidden');return}var t=p.travel,cond=SEA_CONDITIONS.find(function(c){return c.id===t.condition})||SEA_CONDITIONS[0],total=Math.max(.01,t.total||t.remaining||1),done=cl(1-t.remaining/total,0,1);card.classList.remove('hidden');$('#journeyRoute').textContent=t.from+' → '+t.destination;$('#journeyCondition').textContent=cond.name;$('#journeyMeterFill').style.width=Math.round(done*100)+'%';$('#journeySummary').innerHTML='<div><span>Progression</span><strong>'+Math.round(done*100)+'%</strong></div><div><span>Temps restant</span><strong>'+Math.max(0,t.remaining).toFixed(1)+' mois</strong></div><div><span>Danger</span><strong>'+Math.round(t.danger)+'/100</strong></div><div><span>Incidents</span><strong>'+(t.incidents||0)+'</strong></div>';$('#journeyLog').innerHTML=(t.logs||[]).length?t.logs.map(function(x){return'<div class="journey-log-item"><strong>'+e(x.title)+'</strong><br>'+e(x.text)+'</div>'}).join(''):'<div class="journey-log-item">Aucun incident notable depuis le départ.</div>'
}
function renderCodexExploration(){
 var p=game.player,x=migrateExploration(p),disc=game.codex.discoveries||[],sites=Object.keys(x.sites),mastered=sites.filter(function(n){return x.sites[n].familiarity>=85}).length;$('#codexProgressBadge').textContent=disc.length+' découverte'+(disc.length>1?'s':'');$('#codexSummary').innerHTML='<div><span>Îles connues</span><strong>'+p.visited.length+'</strong></div><div><span>Îles maîtrisées</span><strong>'+mastered+'</strong></div><div><span>Découvertes</span><strong>'+disc.length+'</strong></div><div><span>Trésors</span><strong>'+x.treasures+'</strong></div>';$('#codexDiscoveries').innerHTML=disc.length?disc.slice(-8).reverse().map(function(d){return'<div class="codex-entry"><strong>'+e(d.name)+'</strong><small>'+e(d.place)+' • '+e(d.type)+'</small></div>'}).join(''):'<div class="codex-entry"><small>Explore le monde pour enrichir le Codex.</small></div>'
}


function defaultStoryEngine(){
 return{seq:0,active:[],history:[],recentTypes:[],stats:{started:0,resolved:0,failed:0,abandoned:0,interrupted:0,choices:0},lastStartAge:-999}
}
function migrateStoryEngine(g){
 g.story=g.story||defaultStoryEngine();var st=g.story;st.seq=st.seq||0;st.active=Array.isArray(st.active)?st.active:[];st.history=Array.isArray(st.history)?st.history.slice(0,30):[];st.stats=st.stats||{};
 if(st.stats.abandoned==null){var oldAbandoned=st.history.filter(function(h){return /distance gardée|piste abandonnée|aide refusée|duel reporté/i.test(h.outcome||'')}).length;st.stats.abandoned=oldAbandoned;st.stats.resolved=Math.max(0,(st.stats.resolved||0)-oldAbandoned)}
 if(st.stats.interrupted==null){var oldInterrupted=st.history.filter(function(h){return /interrompu|occasion perdue|duel impossible|groupe disparu|laissée derrière/i.test(h.outcome||'')}).length;st.stats.interrupted=oldInterrupted;st.stats.failed=Math.max(0,(st.stats.failed||0)-oldInterrupted)}
 ['started','resolved','failed','abandoned','interrupted','choices'].forEach(function(k){st.stats[k]=st.stats[k]||0});st.lastStartAge=st.lastStartAge==null?-999:st.lastStartAge;st.recentTypes=Array.isArray(st.recentTypes)?st.recentTypes.slice(0,6):[];
 st.active=st.active.filter(function(x){return x&&x.id&&x.type}).map(function(x){x.status=x.status||'active';x.stage=x.stage||0;x.awaiting=!!x.awaiting;x.createdAge=x.createdAge==null?(g.player&&g.player.ageMonths||0):x.createdAge;x.nextAge=x.nextAge==null?x.createdAge+1:x.nextAge;x.deadlineAge=x.deadlineAge==null?x.createdAge+10:x.deadlineAge;x.data=x.data||{};return x});
 return st
}
function activeStories(){return migrateStoryEngine(game).active.filter(function(s){return s.status==='active'})}
function awaitingStory(){return activeStories().find(function(s){return s.awaiting})||null}
function storyRelation(story){return story&&story.participantId?relationById(story.participantId):null}
function storyNoveltyWeight(id){var recent=migrateStoryEngine(game).recentTypes||[],i=recent.indexOf(id);return i<0?1:i===0?.2:i===1?.4:i===2?.62:i<=4?.78:.9}
function directorMobilityWording(){
 var f=game.player.faction;
 if(f==='Pirates')return{noun:'nouveau cap',verb:'prendre un nouveau cap',accept:'Prendre ce cap',decline:'Garder le cap actuel',journey:'Nouveau cap'};
 if(f==='Révolutionnaires')return{noun:'nouvelle mission de réseau',verb:'rejoindre un nouveau front',accept:'Rejoindre ce front',decline:'Rester sur ce réseau',journey:'Déplacement révolutionnaire'};
 if(f==='Marine')return{noun:'nouvelle affectation',verb:'accepter une nouvelle affectation',accept:'Accepter l’affectation',decline:'Rester ici',journey:'Mutation en mer'};
 if(f==='Gouvernement')return{noun:'nouvelle affectation',verb:'accepter une nouvelle affectation',accept:'Accepter l’affectation',decline:'Rester ici',journey:'Mission officielle'};
 if(f==='Chasseur de primes')return{noun:'nouvelle piste de contrats',verb:'suivre une nouvelle piste',accept:'Suivre cette piste',decline:'Rester sur cette zone',journey:'Nouvelle zone de chasse'};
 return{noun:'nouvelle opportunité',verb:'saisir une nouvelle opportunité',accept:'Accepter cette opportunité',decline:'Rester ici',journey:'Nouveau départ'}
}
function directorTravelContext(name){
 var p=game.player,w=game.world,d=migrateLifeDirector(p),info=infStatic(name),t=w.territories[name]||{controller:'Civil',stability:55,contested:false},stability=t.stability==null?55:t.stability,rp=w.pressures[info.region]||{},fresh=p.visited.indexOf(name)<0,sp=p.specialization||'',recentMoves=(d.history||[]).filter(function(h){return h.kind==='mobility'&&h.data&&h.data.destination}).slice(-5).map(function(h){return h.data.destination}),recentIndex=recentMoves.lastIndexOf(name),backtrackPenalty=recentIndex<0?0:Math.max(3,9-(recentMoves.length-1-recentIndex)*2),score=(fresh?10:0)+(info.region!==p.region?5:0)-info.danger*.02-backtrackPenalty,reason='une opportunité cohérente avec ta carrière';
 if(p.faction==='Marine'){score+=(t.controller==='Pirates'?18:t.controller==='Révolutionnaires'?14:t.contested?6:0)+(100-stability)*.045;reason=(t.controller==='Pirates'||t.controller==='Révolutionnaires')?'renforcer une zone sous pression de '+t.controller:'stabiliser une zone stratégique'}
 else if(p.faction==='Pirates'){score+=((t.controller==='Marine'||t.controller==='Gouvernement')?16:t.controller==='Civil'?3:0)+(rp.Piraterie||0)*.035+info.danger*.025;reason=(t.controller==='Marine'||t.controller==='Gouvernement')?'ouvrir une nouvelle zone d’influence face à '+t.controller:'chercher de nouvelles opportunités sur une route active'}
 else if(p.faction==='Révolutionnaires'){score+=(t.controller==='Gouvernement'?19:t.controller==='Marine'?14:t.contested?5:0)+(rp.Révolution||0)*.04;reason=(t.controller==='Gouvernement'||t.controller==='Marine')?'soutenir un réseau sous contrôle de '+t.controller:'renforcer un relais révolutionnaire'}
 else if(p.faction==='Gouvernement'){score+=((t.controller==='Pirates'||t.controller==='Révolutionnaires')?17:t.contested?6:0)+(100-stability)*.04;reason=(t.controller==='Pirates'||t.controller==='Révolutionnaires')?'rétablir l’ordre face à '+t.controller:'consolider une zone sensible'}
 else if(p.faction==='Chasseur de primes'){score+=(t.controller==='Pirates'?18:0)+(rp.Criminalité||0)*.06+info.danger*.025;reason=t.controller==='Pirates'?'suivre une forte activité pirate':'chercher des contrats dans une zone criminelle'}
 else{score+=stability*.025+(rp.Prospérité||0)*.035;if(sp==='Navigateur'){reason='ouvrir un itinéraire utile à ton activité'}else if(sp==='Scientifique'){reason='étudier un territoire encore peu connu'}else reason='développer ton activité dans une zone prometteuse'}
 if(fresh&&(sp==='Navigateur'||sp==='Navigation'))score+=8+(p.faction==='Pirates'?4:0);
 else if(fresh&&(sp==='Traqueur'||sp==='Investigateur'))score+=6;
 else if(fresh&&sp==='Scientifique')score+=2;
 if(p.ambition==='Explorer le monde'&&fresh){score+=10;reason='ouvrir une nouvelle étape de ton voyage'}
 else if(p.ambition==='Faire fortune'){score+=(rp.Prospérité||0)*.025;if((rp.Prospérité||0)>=55)reason='saisir une opportunité économique dans une zone prospère'}
 else if(p.ambition==='Entrer dans l’histoire'&&(t.contested||(w.worldState&&w.worldState.worldSagas||[]).some(function(s){return s.status==='active'&&s.region===info.region}))){score+=5;reason='te rapprocher d’un foyer historique majeur'}
 return{score:score,reason:reason,controller:t.controller,stability:stability,region:info.region,danger:info.danger,fresh:fresh,backtrackPenalty:backtrackPenalty}
}
function directorMobilityTiming(){
 var p=game.player,floor=27,overdue=54,sp=p.specialization||'',navigator=(sp==='Navigateur'||sp==='Navigation'),hunterRoute=(sp==='Traqueur'||sp==='Investigateur'),deepExplorer=false;
 if(navigator){floor-=4;overdue-=8}
 if(hunterRoute){floor-=2;overdue-=4}
 if(p.faction==='Pirates'){floor-=3;overdue-=5}
 else if(p.faction==='Chasseur de primes'||p.faction==='Révolutionnaires'){floor-=1;overdue-=3}
 else if(p.faction==='Gouvernement'&&sp==='Administration'){floor+=3;overdue+=6}
 if(p.ambition==='Explorer le monde'){floor-=3;overdue-=6}
 else if(p.ambition==='Faire fortune'&&sp==='Marchand'){floor-=1;overdue-=2}
 if(p.faction==='Civil'&&sp==='Scientifique'){floor+=2;overdue+=4}
 deepExplorer=p.faction==='Pirates'&&navigator&&p.ambition==='Explorer le monde';
 if(deepExplorer){floor-=2;overdue-=3}
 return{floor:cl(floor,deepExplorer?16:18,34),overdue:cl(overdue,deepExplorer?32:34,60)}
}
function directorMobilityPriority(){
 var p=game.player,d=migrateLifeDirector(p),timing=directorMobilityTiming(),elapsed=p.ageMonths-(d.lastMobilityAge||-999),sp=p.specialization||'';
 if(elapsed<timing.floor)return 0;
 var span=Math.max(1,timing.overdue-timing.floor),progress=cl((elapsed-timing.floor)/span,0,1),bonus=0;
 if(sp==='Navigateur'||sp==='Navigation')bonus+=.16;
 if(sp==='Traqueur'||sp==='Investigateur')bonus+=.08;
 if(p.faction==='Pirates')bonus+=.10;
 else if(p.faction==='Chasseur de primes'||p.faction==='Révolutionnaires')bonus+=.04;
 if(p.ambition==='Explorer le monde')bonus+=.16;
 if(p.faction==='Gouvernement'&&sp==='Administration')bonus-=.08;
 if(p.faction==='Civil'&&sp==='Scientifique')bonus-=.06;
 return cl(.18+progress*.42+bonus,.08,.86)
}
function directorTravelCandidate(){
 var p=game.player,d=migrateLifeDirector(p),timing=directorMobilityTiming(),partner=partnerRelation(),routes=(PL[p.island]&&PL[p.island][2]||[]).filter(function(n){return req(n)[0]});
 if(careerRecord().retired||!routes.length||p.travel||p.ageMonths-d.lastMobilityAge<timing.floor)return null;
 if(partner&&p.life.relationshipStatus==='En couple'&&(partner.relationshipMonths||0)<12)return null;
 var pool=routes.filter(function(n){return n!==p.island});
 if(!pool.length)return null;
 pool.sort(function(a,b){return directorTravelContext(b).score-directorTravelContext(a).score});
 return pool[0]
}
function directorRomanceCandidate(){
 var p=game.player,d=migrateLifeDirector(p);if(p.ageMonths<216||p.career==='Aucune'||p.life.partnerId||p.ageMonths-d.lastRomanceAge<18)return null;
 return game.relations.filter(function(r){var reunion=!r.canonical&&r.monthsKnown>=12&&npcRegion(r)===p.region;return r.status==='active'&&r.npcAgeMonths>=216&&(npcNearby(r)||reunion)&&r.role!=='rival'&&r.role!=='mentor'&&r.role!=='parent'&&r.role!=='frère / sœur'}).sort(function(a,b){var as=(a.affection||0)+(a.trust||0)+(a.attraction||0)*1.2,bs=(b.affection||0)+(b.trust||0)+(b.attraction||0)*1.2;return bs-as}).filter(function(r){return(r.affection||0)>=48&&(r.trust||0)>=44&&((r.attraction||0)>=28||(r.affection||0)>=65)})[0]||null
}
function directorFamilyOpportunity(){
 var p=game.player,d=migrateLifeDirector(p),r=partnerRelation(),kids=(p.children||[]).filter(function(c){return c.status==='active'}).length,cooldown=p.life.relationshipStatus==='Marié'&&kids===0?12:24;if(d.familyAutoPaused&&r&&d.familyPausedRelationId&&d.familyPausedRelationId!==r.id){d.familyAutoPaused=false;d.familyPausedRelationId=null;d.familyDeferrals=0;d.familyDeferredUntil=0}if(!r||!npcNearby(r)||p.ageMonths<216||p.career==='Aucune'||p.ageMonths-d.lastFamilyAge<cooldown||p.ageMonths<(d.familyDeferredUntil||0)||(d.familyAutoPaused&&d.familyPausedRelationId===r.id))return null;
 if(p.life.relationshipStatus==='En couple'&&(r.relationshipMonths||0)>=12&&r.trust>=62&&r.affection>=65)return'marriage';
 if(p.life.relationshipStatus==='Marié'&&kids<3&&r.relationshipMonths>=18&&r.trust>=58&&r.affection>=60)return'child';
 return null
}
function directorLegacyOpportunity(){
 var p=game.player,d=migrateLifeDirector(p),a=latestDynastyLegacy();if(!a||d.legacyChoice||p.ageMonths<180||p.ageMonths>480)return null;
 var lg=a.legacy||{},score=lg.recognitionScore||0,chapterPool=[].concat(lg.chapters||[],lg.activeChapters||[]),strong=chapterPool.filter(function(x){return(x.score||0)>=45&&(x.beats||0)>=2}).length,legend=/Légende|Puissance|Pilier|Symbole|Autorité|Icône/.test(lg.worldRole||'');
 if(score<52&&strong<1&&!legend)return null;
 return{ancestor:a,legacy:lg,weight:Math.min(2,1+(score-50)/60+strong*.18+(legend?.25:0))}
}
function careerSunsetWording(){
 var f=game.player.faction;
 if(f==='Marine')return{title:'La fin du service actif',summary:'Après des décennies de service, tu peux rester en première ligne ou passer dans un rôle de vétéran.',keep:'Rester en service actif',step:'Passer dans la réserve',chapter:'Fin de service actif'};
 if(f==='Gouvernement')return{title:'Quitter les opérations actives ?',summary:'Ton expérience peut désormais peser sans exiger une présence constante sur le terrain.',keep:'Rester opérationnel',step:'Passer en retrait',chapter:'Retrait des opérations'};
 if(f==='Révolutionnaires')return{title:'Passer le relais ?',summary:'Le réseau peut continuer sans que tu sois présent sur chaque front.',keep:'Rester sur le terrain',step:'Passer le relais',chapter:'Passage de relais'};
 if(f==='Pirates')return{title:'Toujours en première ligne ?',summary:'Ton nom peut continuer à peser sur les mers même si tu choisis de moins mener chaque aventure toi-même.',keep:'Rester au premier rang',step:'Prendre du recul',chapter:'Vétéran des mers'};
 if(f==='Chasseur de primes')return{title:'Ralentir les contrats ?',summary:'Après une longue carrière, tu peux continuer les traques régulières ou ne sortir que pour les affaires qui comptent vraiment.',keep:'Continuer les contrats',step:'Ralentir les traques',chapter:'Vétéran des primes'};
 return{title:'Lever le pied ?',summary:'Ta carrière est assez longue pour que tu choisisses entre continuer au même rythme ou passer à une vie professionnelle plus calme.',keep:'Continuer pleinement',step:'Passer en retrait',chapter:'Fin de carrière'}
}
function careerSunsetOpportunity(){
 var p=game.player,rec=careerRecord();if(p.career==='Aucune'||rec.retired||rec.retirementChoice||p.ageMonths<660||rec.months<300||p.travel||game.mission)return null;
 var senior=rankIndex()>=2||(rec.distinctions||0)>=4;if(!senior)return null;
 return{career:p.faction,rank:p.rank,serviceMonths:Math.floor(rec.months),ageMonths:p.ageMonths,distinctions:rec.distinctions||0}
}
function retirementIncomePerMonth(){var rec=careerRecord();if(!rec.retired)return 0;var salary=salaryPerMonth();return salary>0?Math.round(salary*.45):0}
function careerSpecializationFit(sp){
 var p=game.player,w=game.world,profile=specProfile(sp),score=careerExpertise(sp),rp=w.pressures[p.region]||{},o=p.organization;
 if(!profile)return score;
 if(p.ambition==='Explorer le monde'&&(sp==='Navigation'||sp==='Navigateur'||sp==='Traqueur'))score+=8;
 if(p.ambition==='Devenir puissant'&&profile.combatWeight>=.55)score+=6;
 if(p.ambition==='Faire fortune'&&sp==='Marchand')score+=9;
 if(p.ambition==='Entrer dans l’histoire'&&(sp==='Renseignement'||sp==='Infiltration'||sp==='Cipher Pol'||profile.combatWeight>=.7))score+=4;
 var criminal=rp.Criminalité||0,instability=rp.Instabilité||0,prosperity=rp.Prospérité||0;
 if(sp==='Renseignement'||sp==='Infiltration'||sp==='Investigateur'||sp==='Cipher Pol')score+=criminal/18+instability/28;
 if(sp==='Traqueur')score+=criminal/16;
 if(profile.combatWeight>=.7)score+=instability/24;
 if(sp==='Marchand')score+=prosperity/18;
 if(sp==='Scientifique'||sp==='Administration')score+=prosperity/32;
 if((sp==='Logistique'||sp==='Quartier-maître')&&o)score+=Math.max(0,55-(o.supplies||0))*.13+Math.max(0,65-(o.morale||0))*.06;
 if((sp==='Médecine'||sp==='Médecin')&&p.health<75)score+=(75-p.health)*.08;
 return score
}
function careerTurnCandidate(){
 var p=game.player,d=migrateLifeDirector(p),cfg=CAREERS[p.faction]||CAREERS.Civil,rec=careerRecord();
 if(rec.retired||p.ageMonths<240||p.career==='Aucune'||!p.specialization||p.travel||game.mission||rec.months<24||p.ageMonths-d.lastCareerTurnAge<48)return null;
 var current=p.specialization,currentFit=careerSpecializationFit(current),choices=(cfg.specs||[]).filter(function(sp){return sp!==current&&specEligibility(sp)[0]}).map(function(sp){return{sp:sp,fit:careerSpecializationFit(sp)}}).sort(function(a,b){return b.fit-a.fit});
 if(!choices.length)return null;var best=choices[0],margin=best.fit-currentFit;if(margin<8)return null;
 var reason=margin>=16?'tes aptitudes et le contexte de ta carrière pointent nettement vers '+best.sp:margin>=11?'ton évolution récente correspond davantage à '+best.sp:'une nouvelle spécialité correspond mieux à la direction prise par ta carrière';
 return{from:current,to:best.sp,currentFit:currentFit,newFit:best.fit,margin:margin,reason:reason}
}
function storyEligibleTypes(){
 var p=game.player,types=[],active=activeStories(),used=active.map(function(s){return s.type}),rels=game.relations.filter(function(r){return r.status==='active'&&(r.location===p.island||r.region===p.region)}),rivals=rels.filter(function(r){return r.role==='rival'}),mentors=rels.filter(function(r){return r.role==='mentor'}),partner=partnerRelation(),hostileCrews=game.world.crews.filter(function(c){return c.status==='active'&&c.region===p.region&&diplomacy(p.faction,c.faction)<-20}),site=explorationSite(p.island),j=migrateJustice(p);
 function add(id,w){if(used.indexOf(id)<0&&w>0)types.push({id:id,weight:w*storyNoveltyWeight(id)})}
 if(p.ageMonths>=72&&p.ageMonths<180&&rels.length)add('youth-promise',1.6);
 if(p.ageMonths>=144&&!p.travel&&site.familiarity>=20)add('island-secret',1.35+(p.activity==='Explorer'?.55:0));
 if(p.ageMonths>=180&&rels.length)add('social-favor',1.05);
 if(p.ageMonths>=180&&p.career!=='Aucune'&&!careerRecord().retired)add('career-crossroads',1.1);
 if(p.ageMonths>=180&&((j.regionalHeat[p.region]||0)>=25||p.bounty>0))add('justice-shadow',.8+(j.regionalHeat[p.region]||0)/100);
 if(p.ageMonths>=180&&rivals.length){var hotRival=rivals.slice().sort(function(a,b){return ((b.nemesisRecognized?30:0)+(b.rivalry||0)+arcPressureFor('relation',b.id))-((a.nemesisRecognized?30:0)+(a.rivalry||0)+arcPressureFor('relation',a.id))})[0];add('rival-challenge',.85+(hotRival&&hotRival.nemesisRecognized?.6:0)+(hotRival?arcPressureFor('relation',hotRival.id)/170:0))}
 if(p.ageMonths>=180&&p.organization&&!careerRecord().retired&&(p.organization.morale<72||p.organization.supplies<30))add('organization-crisis',1.05);
 if(p.ageMonths>=144&&mentors.length)add('mentor-lesson',.95);
 if(p.ageMonths>=180&&hostileCrews.length){var hotCrew=hostileCrews.slice().sort(function(a,b){return ((b.playerGrudge||0)+arcPressureFor('crew',b.id))-((a.playerGrudge||0)+arcPressureFor('crew',a.id))})[0];add('crew-pressure',.9+Math.min(.5,hotCrew.power/140)+Math.min(.65,(hotCrew.playerGrudge||0)/85)+arcPressureFor('crew',hotCrew.id)/170)}
 if(p.ageMonths>=216&&(partner||(p.children||[]).some(function(c){return c.status==='active'})))add('family-crossroads',.82);
 var convergence=convergenceCandidate();if(convergence)add('convergence-crossroads',1.55+Math.min(.75,(convergence.score||0)/140));
 var romanceCandidate=directorRomanceCandidate();if(romanceCandidate)add('relationship-opening',1.02);
 var familyFuture=directorFamilyOpportunity();if(familyFuture)add('family-future',familyFuture==='child'?1.55:1.28);
 var legacyFuture=directorLegacyOpportunity();if(legacyFuture)add('legacy-crossroads',legacyFuture.weight);
 var careerTurn=careerTurnCandidate();if(careerTurn)add('career-turn',1.30);
 var careerSunset=careerSunsetOpportunity();if(careerSunset)add('career-sunset',1.18);
 var transfer=directorTravelCandidate();if(p.ageMonths>=216&&p.career!=='Aucune'&&transfer)add('career-transfer',p.ambition==='Explorer le monde'?1.85:p.faction==='Pirates'?1.55:1.25);
 if(p.ageMonths>=180&&!p.travel&&site.familiarity>=30)add('horizon-call',.78+(p.activity==='Explorer'?.35:0));
 return types
}
function pickStoryType(types){
 var total=types.reduce(function(a,x){return a+x.weight},0),r=R('story')*total;for(var i=0;i<types.length;i++){r-=types[i].weight;if(r<=0)return types[i].id}return types.length?types[types.length-1].id:null
}
function storyBase(type){
 var p=game.player,rels=game.relations.filter(function(r){return r.status==='active'&&(r.location===p.island||r.region===p.region)}),rivals=rels.filter(function(r){return r.role==='rival'}),site=explorationSite(p.island),profile=islandProfile(p.island),o=p.organization,j=migrateJustice(p),partner=partnerRelation(),r=null,title='',summary='',data={};
 if(type==='youth-promise'){r=pk(rels,'story');title='Une promesse avec '+r.name;summary='Un lien de jeunesse commence à devenir plus important qu’une simple rencontre.';data.focus=pk(['Discipline','Réflexes','Combat'],'story')}
 else if(type==='island-secret'){title='Une piste à '+p.island;summary='Un détail revient dans plusieurs indices locaux : '+profile.signature+'.';data.familiarity=site.familiarity;data.signature=profile.signature}
 else if(type==='social-favor'){r=pk(rels,'story');title=r.name+' a besoin de toi';summary='Une relation importante te demande une aide qui pourrait laisser une trace durable.';data.cost=Math.min(Math.max(500,Math.round(800+R('story')*4500)),Math.max(500,Math.round(p.money*.18)))}
 else if(type==='career-crossroads'){title='Un choix dans ta carrière';summary='Une opportunité plus risquée que ton travail habituel se présente dans '+p.region+'.';data.danger=cl(inf().danger+15+R('story')*25,20,95)}
 else if(type==='justice-shadow'){title='La pression se rapproche';summary='Des signes indiquent que les autorités s’intéressent davantage à tes mouvements.';data.heat=j.regionalHeat[p.region]||0}
 else if(type==='rival-challenge'){r=pk(rivals,'story');title='Le défi de '+r.name;summary='Ta rivalité avec '+r.name+' réclame une réponse concrète.';data.rivalPower=relationPower(r)}
 else if(type==='organization-crisis'){title='Tensions dans '+o.name;summary=o.supplies<30?'Les provisions deviennent un problème sérieux pour le groupe.':'Le moral du groupe commence à se fissurer.';data.cost=5000+Math.round(R('story')*10000)}
 else if(type==='mentor-lesson'){var mentors=rels.filter(function(x){return x.role==='mentor'});r=pk(mentors,'story');title='La leçon de '+r.name;summary=r.name+' estime que tu es prêt pour une étape plus exigeante de ton apprentissage.';data.focus=pk(activityGrowthKeys('Combat'),'story')}
 else if(type==='crew-pressure'){var hostile=game.world.crews.filter(function(c){return c.status==='active'&&c.region===p.region&&diplomacy(p.faction,c.faction)<-20});var cr=pk(hostile,'story');title=cr.name+' se rapproche';summary='Les mouvements de '+cr.name+' commencent à peser sur '+p.region+'.';data.crewId=cr.id;data.crewName=cr.name;data.crewPower=cr.power;data.region=p.region}
 else if(type==='family-crossroads'){r=partner||null;title='Ce que tu protèges';summary='Ta vie d’aventure entre en tension avec les personnes qui comptent le plus pour toi.';data.hasPartner=!!partner}
 else if(type==='relationship-opening'){r=directorRomanceCandidate();if(!r)return{title:'',summary:'',participant:null,data:{}};if(!npcNearby(r)&&!r.canonical){r.location=p.island;r.region=p.region;addRelationMemory(r,'Vos routes se recroisent à '+p.island+' après une période à distance.','reunion')}title='Un lien change avec '+r.name;summary='Votre relation commence à ressembler à autre chose qu’une simple proximité.';data.director=true}
 else if(type==='family-future'){r=partner;var future=directorFamilyOpportunity();if(!r||!future)return{title:'',summary:'',participant:null,data:{}};data.future=future;title=future==='marriage'?'Construire une vie avec '+r.name:'La famille peut s’agrandir';summary=future==='marriage'?'Votre relation est assez solide pour envisager un engagement durable.':'Votre couple arrive à un moment où une nouvelle génération devient une vraie possibilité.'}
 else if(type==='legacy-crossroads'){var lf=directorLegacyOpportunity();if(!lf)return{title:'',summary:'',participant:null,data:{}};var anc=lf.ancestor,lg=lf.legacy;title='Le nom de '+anc.name+' te précède';summary=(lg.chronicle||anc.name+' a laissé une trace durable dans le monde.')+' À toi de décider ce que cet héritage signifie pour ta propre vie.';data.ancestorName=anc.name;data.ancestorGeneration=anc.generation||Math.max(1,game.dynasty.generation-1);data.worldRole=lg.worldRole||anc.rank||anc.career;data.recognitionScore=lg.recognitionScore||0}
 else if(type==='career-sunset'){var sunset=careerSunsetOpportunity();if(!sunset)return{title:'',summary:'',participant:null,data:{}};var sunsetWords=careerSunsetWording();title=sunsetWords.title;summary=sunsetWords.summary;data.sunset=sunset;data.director=true}
 else if(type==='career-turn'){var turn=careerTurnCandidate();if(!turn)return{title:'',summary:'',participant:null,data:{}};title='Un tournant dans ta carrière';summary=turn.reason+'.';data.turn=turn;data.director=true}
 else if(type==='career-transfer'){var destination=directorTravelCandidate();if(!destination)return{title:'',summary:'',participant:null,data:{}};var travelContext=directorTravelContext(destination),mobility=directorMobilityWording();title=mobility.noun.charAt(0).toUpperCase()+mobility.noun.slice(1)+' : '+destination;summary=(CAREERS[p.faction]?CAREERS[p.faction].label:p.faction)+' t’offre une occasion de '+travelContext.reason+' à '+destination+'.';data.destination=destination;data.from=p.island;data.reason=travelContext.reason;data.director=true}
 else if(type==='convergence-crossroads'){var cx=convergenceCandidate();if(!cx)return{title:'',summary:'',participant:null,data:{}};r=cx.data&&cx.data.relationId?relationById(cx.data.relationId):null;title=cx.title;summary=cx.summary;data={director:true,connectionId:cx.id,connectionKind:cx.kind,connectionScore:cx.score||65,sagaId:cx.data&&cx.data.sagaId||null,relationId:cx.data&&cx.data.relationId||null,memoryId:cx.data&&cx.data.memoryId||null,organization:!!(cx.data&&cx.data.organization),phase:1}}
 else if(type==='horizon-call'){title='Une route hors des habitudes';summary='Une rumeur crédible évoque une opportunité que peu de voyageurs semblent avoir remarquée.';data.danger=inf().danger;data.signature=profile.signature}
 return{title:title,summary:summary,participant:r,data:data}
}
function startStory(type){
 var p=game.player,eng=migrateStoryEngine(game),base=storyBase(type);if(!base.title)return null;var id='story-'+(++eng.seq)+'-'+Math.floor(R('story')*99999),story={id:id,type:type,title:base.title,summary:base.summary,status:'active',stage:0,awaiting:false,createdAge:p.ageMonths,nextAge:p.ageMonths+1+R('story')*2,deadlineAge:p.ageMonths+8+R('story')*6,location:p.island,region:p.region,participantId:base.participant?base.participant.id:null,participantName:base.participant?base.participant.name:null,data:base.data||{},choice:null,lastBeat:'Ouverture'};
 eng.active.push(story);eng.stats.started++;eng.lastStartAge=p.ageMonths;eng.recentTypes.unshift(type);eng.recentTypes=eng.recentTypes.slice(0,6);tl('Nouveau fil — '+story.title,story.summary,'story');return story
}
function maybeStartStory(m){
 var p=game.player,eng=migrateStoryEngine(game),active=activeStories();if(p.ageMonths<72||p.travel||game.mission||active.length>=2||p.ageMonths-eng.lastStartAge<4)return false;var types=storyEligibleTypes();if(!types.length)return false;var chance=cl(.025+.035*m+(active.length?0:.025),.03,.18);if(R('story')>chance)return false;
 var family=types.find(function(x){return x.id==='family-future'}),romance=types.find(function(x){return x.id==='relationship-opening'}),legacy=types.find(function(x){return x.id==='legacy-crossroads'}),sunset=types.find(function(x){return x.id==='career-sunset'}),transfer=types.find(function(x){return x.id==='career-transfer'}),turn=types.find(function(x){return x.id==='career-turn'}),director=migrateLifeDirector(p),mobilityTiming=directorMobilityTiming(),mobilityPriority=transfer?directorMobilityPriority():0,overdueTransfer=!!(transfer&&p.ageMonths-(director.lastMobilityAge||-999)>=mobilityTiming.overdue),earlyMobileTransfer=!!(transfer&&!overdueTransfer&&mobilityTiming.floor<27&&mobilityPriority>=.5),overdueTurn=!!(turn&&p.ageMonths-(director.lastCareerTurnAge||-999)>=72),chosen=null;
 if(legacy&&p.ageMonths>=216&&R('story')<.72)chosen='legacy-crossroads';
 else if(family&&R('story')<.68)chosen='family-future';
 else if(sunset&&p.ageMonths>=720&&R('story')<.80)chosen='career-sunset';
 else if(overdueTurn&&R('story')<.82)chosen='career-turn';
 else if(overdueTransfer&&R('story')<.76)chosen='career-transfer';
 else if(earlyMobileTransfer&&R('story')<mobilityPriority)chosen='career-transfer';
 else if(romance&&R('story')<.68)chosen='relationship-opening';
 else chosen=pickStoryType(types);
 return!!startStory(chosen)
}
function storyPrompt(story){
 if(story.type==='youth-promise')return story.participantName+' te propose de vous fixer un objectif commun pour les mois qui viennent.';
 if(story.type==='island-secret')return'Les indices autour de "'+story.data.signature+'" deviennent assez précis pour justifier une vraie recherche.';
 if(story.type==='social-favor')return story.participantName+' te demande une aide concrète. Cela pourrait te coûter environ '+Math.round(story.data.cost||0).toLocaleString('fr-FR')+' B.';
 if(story.type==='career-crossroads')return'Ta hiérarchie ou ton réseau te propose une voie plus risquée, mais potentiellement plus profitable.';
 if(story.type==='justice-shadow')return'La pression des autorités augmente. Tu dois choisir comment réagir avant qu’elles ne décident pour toi.';
 if(story.type==='rival-challenge')return story.participantName+' veut régler une partie de votre rivalité face à face.';
 if(story.type==='organization-crisis')return'Ton groupe attend une réponse avant que la situation ne se détériore.';
 if(story.type==='mentor-lesson')return story.participantName+' te propose soit un entraînement brutal, soit une leçon plus patiente centrée sur la compréhension.';
 if(story.type==='crew-pressure')return story.data.crewName+' devient assez proche pour que tu choisisses entre confrontation directe et observation prudente.';
 if(story.type==='family-crossroads')return'Tu dois décider si cette période sera consacrée à tes proches ou à ton ambition personnelle.';
 if(story.type==='relationship-opening')return story.participantName+' laisse clairement entendre que votre lien pourrait devenir plus intime. Tu peux choisir de l’explorer ou de préserver votre relation actuelle.';
 if(story.type==='family-future')return story.data.future==='marriage'?'Votre relation est assez solide pour envisager le mariage, sans que cela soit une obligation.':'Vous pouvez choisir d’accueillir un enfant ou de laisser cette possibilité pour plus tard.';
 if(story.type==='legacy-crossroads')return story.data.ancestorName+' a laissé un nom que le monde reconnaît encore. Tu peux t’appuyer sur cet héritage ou affirmer que ta trajectoire devra être jugée pour elle-même.';
 if(story.type==='career-sunset')return careerSunsetWording().summary;
 if(story.type==='career-turn')return story.data.turn.reason+'. Tu peux te réorienter vers '+story.data.turn.to+' ou poursuivre comme '+story.data.turn.from+'.';
 if(story.type==='career-transfer'){var mw=directorMobilityWording();return mw.noun.charAt(0).toUpperCase()+mw.noun.slice(1)+' vers '+story.data.destination+'. Tu peux '+mw.verb+' ou conserver ta trajectoire actuelle.'}
 if(story.type==='convergence-crossroads')return story.data.phase===2?'Ta première décision a déplacé l’équilibre. La situation revient maintenant avec des conséquences concrètes : tu peux aller jusqu’au bout ou limiter ton engagement.':'Deux parties de ta vie viennent de se heurter. Tu peux t’impliquer pleinement ou protéger d’abord ce que tu as déjà construit.';
 if(story.type==='horizon-call')return'La piste semble exploitable maintenant. Tu peux la suivre toi-même ou monnayer l’information.';
 return story.summary
}
function storyChoices(story){
 if(story.type==='youth-promise')return[{id:'commit',label:'Faire la promesse',desc:'T’investir et voir où ce lien vous mène.'},{id:'distance',label:'Garder tes distances',desc:'Ne pas transformer ce lien en engagement.'}];
 if(story.type==='island-secret')return[{id:'investigate',label:'Suivre la piste',desc:'Consacrer du temps et prendre le risque de te tromper.'},{id:'leave',label:'Laisser tomber',desc:'Ne pas poursuivre cette histoire.'}];
 if(story.type==='social-favor')return[{id:'help',label:'L’aider',desc:'Dépenser des ressources et renforcer potentiellement votre lien.'},{id:'refuse',label:'Refuser',desc:'Préserver tes ressources mais assumer la réaction.'}];
 if(story.type==='career-crossroads')return[{id:'bold',label:'Prendre le risque',desc:'Plus de potentiel, mais une vraie possibilité d’échec.'},{id:'steady',label:'Rester méthodique',desc:'Récompense plus modeste mais risque limité.'}];
 if(story.type==='justice-shadow')return[{id:'hide',label:'Disparaître quelque temps',desc:'Miser sur la discrétion pour faire retomber la pression.'},{id:'defy',label:'Ne rien céder',desc:'Assumer publiquement la pression et renforcer ta réputation.'}];
 if(story.type==='rival-challenge')return[{id:'accept',label:'Accepter le duel',desc:'Mettre votre progression à l’épreuve.'},{id:'decline',label:'Refuser cette fois',desc:'Reporter la confrontation, avec un coût relationnel.'}];
 if(story.type==='organization-crisis')return[{id:'fund',label:'Financer une solution',desc:'Utiliser tes Berry pour stabiliser rapidement la situation.'},{id:'rally',label:'Rallier le groupe',desc:'Miser sur ton Commandement plutôt que sur l’argent.'}];
 if(story.type==='mentor-lesson')return[{id:'intense',label:'Forcer le rythme',desc:'Chercher une progression plus forte au prix de fatigue et de risque.'},{id:'observe',label:'Comprendre avant de forcer',desc:'Progression plus modeste mais relation et maîtrise plus stables.'}];
 if(story.type==='crew-pressure')return[{id:'confront',label:'Les confronter',desc:'Prendre le risque d’un combat pour réduire leur influence locale.'},{id:'observe',label:'Les observer',desc:'Miser sur la discrétion et récolter des informations.'}];
 if(story.type==='family-crossroads')return[{id:'presence',label:'Être présent',desc:'Donner du temps à tes proches et renforcer les liens.'},{id:'ambition',label:'Prioriser ton ambition',desc:'Accélérer ta trajectoire personnelle avec un coût relationnel possible.'}];
 if(story.type==='relationship-opening')return[{id:'explore',label:'Explorer ce lien',desc:'Laisser cette relation devenir une vraie possibilité sentimentale.'},{id:'friendship',label:'Rester proches',desc:'Préserver le lien sans changer sa nature.'}];
 if(story.type==='family-future')return story.data.future==='marriage'?[{id:'commit',label:'Se marier',desc:'Faire de cette relation un engagement durable.'},{id:'wait',label:'Pas maintenant',desc:'Continuer ensemble sans précipiter cette étape.'}]:[{id:'child',label:'Accueillir un enfant',desc:'Faire une place à une nouvelle génération.'},{id:'wait',label:'Pas maintenant',desc:'Conserver votre équilibre actuel.'}];
 if(story.type==='legacy-crossroads')return[{id:'embrace-legacy',label:'Assumer cet héritage',desc:'Accepter que ce nom t’ouvre certaines portes et crée aussi des attentes.'},{id:'own-path',label:'Tracer ma propre voie',desc:'Respecter cette histoire sans vivre dans son ombre.'}];
 if(story.type==='career-sunset'){var sunsetWords=careerSunsetWording();return[{id:'continue-career',label:sunsetWords.keep,desc:'Conserver ton rythme actuel et rester pleinement actif.'},{id:'step-back',label:sunsetWords.step,desc:'Quitter la progression automatique et passer à un rythme de vétéran. Les missions ponctuelles restent possibles.'}]}
 if(story.type==='career-turn')return[{id:'pivot-career',label:'Se réorienter vers '+story.data.turn.to,desc:'Changer de spécialisation en conservant ta faction et ton parcours.'},{id:'stay-career',label:'Rester '+story.data.turn.from,desc:'Conserver ta spécialisation actuelle.'}];
 if(story.type==='career-transfer'){var mw=directorMobilityWording();return[{id:'accept-transfer',label:mw.accept,desc:'Prendre la mer vers '+story.data.destination+' et poursuivre ta trajectoire ailleurs.'},{id:'decline-transfer',label:mw.decline,desc:'Refuser cette opportunité sans changer de voie.'}]}
 if(story.type==='convergence-crossroads')return story.data.phase===2?[{id:'escalate',label:'Aller jusqu’au bout',desc:'Assumer que cette collision entre tes histoires peut modifier durablement ta trajectoire.'},{id:'limit',label:'Limiter l’engagement',desc:'Préserver l’essentiel sans laisser cette situation absorber toute ta vie.'}]:[{id:'engage',label:'M’impliquer',desc:'Accepter que ces deux fils deviennent une seule histoire.'},{id:'protect',label:'Protéger mes priorités',desc:'Intervenir avec prudence pour limiter les dégâts collatéraux.'}];
 if(story.type==='horizon-call')return[{id:'pursue',label:'Suivre la piste',desc:'Miser sur Navigation, Discipline et connaissance locale.'},{id:'sell',label:'Vendre l’information',desc:'Prendre un gain immédiat sans poursuivre l’aventure.'}];
 return[]
}
function setStoryAwaiting(story){
 story.awaiting=true;story.lastBeat='Décision';story.summary=storyPrompt(story);tl('Décision — '+story.title,story.summary,'major')
}
function closeStory(story,outcome,text,failed,closure){
 var eng=migrateStoryEngine(game);closure=closure||(failed?'failed':'resolved');story.status=closure;story.awaiting=false;story.outcome=outcome;story.result=text;story.closure=closure;story.resolvedAge=game.player.ageMonths;eng.active=eng.active.filter(function(s){return s.id!==story.id});eng.history.unshift({id:story.id,type:story.type,title:story.title,outcome:outcome,result:text,closure:closure,resolvedAge:story.resolvedAge,generation:game.dynasty?game.dynasty.generation:1});eng.history=eng.history.slice(0,30);if(closure==='failed')eng.stats.failed++;else if(closure==='abandoned')eng.stats.abandoned++;else if(closure==='interrupted')eng.stats.interrupted++;else eng.stats.resolved++;game.codex.events=game.codex.events||[];var label='Fil narratif : '+story.title;if(game.codex.events.indexOf(label)<0)game.codex.events.push(label);var prefix=closure==='resolved'?'Fil abouti — ':closure==='abandoned'?'Fil abandonné — ':closure==='interrupted'?'Fil interrompu — ':'Fil échoué — ';tl(prefix+story.title,text,closure==='resolved'?'major':'danger');if(closure!=='interrupted'&&game.alive){rememberCausalMemory('story',story.title,closure==='resolved'?62:54,{kind:story.type,relationId:story.participantId||null,subjectId:story.participantId||story.type,outcome:outcome,closure:closure,region:story.region},'story-memory:'+story.type+':'+String(story.participantId||story.location||story.id));scheduleConsequence('story',story.title,text,4+R('memory')*9,{storyType:story.type,closure:closure,outcome:outcome,participantId:story.participantId||null,participantName:story.participantName||null,crewId:story.data&&story.data.crewId||null,crewName:story.data&&story.data.crewName||null,location:story.location,region:story.region},closure==='resolved'?66:58,'story:'+story.id)}
}
function storyResolve(story){
 var p=game.player,r=storyRelation(story),site=explorationSite(story.location),success=false,text='',rec=null,o=p.organization,j=migrateJustice(p);
 if(story.type==='convergence-crossroads'){
  var d=migrateLifeDirector(p),kind=story.data.connectionKind||'convergence',sagaId=story.data.sagaId||null,rel=story.data.relationId?relationById(story.data.relationId):r,weight=cl(story.data.connectionScore||65,45,100);
  if(story.data.phase===1){
   story.data.firstChoice=story.choice;d.lastConvergenceAge=p.ageMonths;
   if(rel&&rel.status==='active'){if(story.choice==='engage'){rel.respect=cl(rel.respect+3,0,100);rel.trust=cl(rel.trust+2,0,100)}else{rel.trust=cl(rel.trust+3,0,100);rel.affection=cl(rel.affection+2,0,100)}}
   if(o&&story.data.organization){o.cohesion=cl((o.cohesion==null?50:o.cohesion)+(story.choice==='engage'?2:4),0,100)}
   if(sagaId&&story.choice==='engage')registerPlayerSagaImpact('indirect','convergence:'+story.id,3+weight*.035,sagaId);
   rememberCausalMemory('convergence',story.title,weight*.72,{kind:kind,sagaId:sagaId,relationId:story.data.relationId||null,subjectId:story.data.relationId||sagaId||kind,choice:story.choice},'convergence:'+story.data.connectionId);
   story.data.phase=2;story.stage=0;story.awaiting=false;story.nextAge=p.ageMonths+1+R('story')*3;story.deadlineAge=Math.max(story.deadlineAge,story.nextAge+6);story.lastBeat='Complication';story.summary='Ta première décision change la situation. Les autres acteurs réagissent et le conflit revient sous une forme plus personnelle.';tl('La situation évolue — '+story.title,story.summary,'story');return true
  }
  var commit=story.choice==='escalate',first=story.data.firstChoice||'protect',challenge=42+weight*.42,score=power()*.42+(p.stats.Discipline||0)*.22+(p.skills.Commandement||0)*.20+(p.stats.Volonté||0)*.16+(first==='engage'?5:2),ok=!commit||R('story')<cl(.46+(score-challenge)/115,.18,.9);
  if(commit&&ok){
   if(sagaId)registerPlayerSagaImpact('participant','convergence:'+story.id,7+weight*.07,sagaId);p.reputation+=2+Math.round(weight/35);if(rel&&rel.status==='active'){rel.respect=cl(rel.respect+6,0,100);rel.trust=cl(rel.trust+3,0,100);addRelationMemory(rel,'Vous traversez ensemble un tournant où plusieurs parties de votre vie se sont heurtées.','convergence')}if(o&&story.data.organization){o.morale=cl((o.morale==null?50:o.morale)+5,0,100);o.cohesion=cl((o.cohesion==null?50:o.cohesion)+4,0,100)}signalPersonalChapter(kind.indexOf('saga')>=0?'world':'relationship',story.title,18,'convergence:'+story.id,story.data.relationId||sagaId||kind);rememberCausalMemory('convergence',story.title,Math.min(100,weight+10),{kind:kind,sagaId:sagaId,relationId:story.data.relationId||null,subjectId:story.data.relationId||sagaId||kind,outcome:'resolved'},'convergence:'+story.data.connectionId);d.convergenceHistory.push({key:story.data.connectionId,age:age(),ageMonths:p.ageMonths,outcome:'resolved'});d.convergenceHistory=d.convergenceHistory.slice(-20);return closeStory(story,'convergence maîtrisée','Tu assumes les conséquences de cette collision et transformes deux fils séparés en un véritable chapitre de ta vie.',false)
  }
  if(commit&&!ok){p.energy=cl(p.energy-8,0,100);p.health=cl(p.health-(2+R('story')*7),1,100);if(rel&&rel.status==='active'){rel.trust=cl(rel.trust-2,0,100);rel.rivalry=cl(rel.rivalry+(kind==='rival-saga'?4:0),0,100)}rememberCausalMemory('convergence',story.title,Math.min(100,weight+6),{kind:kind,sagaId:sagaId,relationId:story.data.relationId||null,subjectId:story.data.relationId||sagaId||kind,outcome:'failed'},'convergence:'+story.data.connectionId);d.convergenceHistory.push({key:story.data.connectionId,age:age(),ageMonths:p.ageMonths,outcome:'failed'});d.convergenceHistory=d.convergenceHistory.slice(-20);return closeStory(story,'convergence subie','Tu vas trop loin et la situation te rappelle que deux problèmes réunis n’en deviennent pas miraculeusement plus simples.',true)}
  if(sagaId)registerPlayerSagaImpact('indirect','convergence:'+story.id,2+weight*.025,sagaId);if(rel&&rel.status==='active'){rel.trust=cl(rel.trust+2,0,100);rel.affection=cl(rel.affection+(first==='protect'?2:0),0,100)}rememberCausalMemory('convergence',story.title,weight*.82,{kind:kind,sagaId:sagaId,relationId:story.data.relationId||null,subjectId:story.data.relationId||sagaId||kind,outcome:'limited'},'convergence:'+story.data.connectionId);d.convergenceHistory.push({key:story.data.connectionId,age:age(),ageMonths:p.ageMonths,outcome:'limited'});d.convergenceHistory=d.convergenceHistory.slice(-20);return closeStory(story,'engagement limité','Tu empêches la situation d’engloutir toute ta trajectoire, mais ce choix restera dans la mémoire des personnes concernées.',false)
 }
 if(story.type==='youth-promise'){
  if(!r||r.status!=='active')return closeStory(story,'interrompu','Le lien disparaît avant que votre promesse puisse réellement prendre forme.',true,'interrupted');
  var g=gain(story.data.focus||'Discipline',.4+.5*R('story'));r.trust=cl(r.trust+6,0,100);r.respect=cl(r.respect+4,0,100);r.affection=cl(r.affection+4,0,100);addRelationMemory(r,'Vous avez tenu une promesse de jeunesse ensemble.','story');text='Votre engagement tient. '+r.name+' devient un souvenir structurant de ta jeunesse'+(g?' • '+story.data.focus+' +'+g.toFixed(1):'')+'.';return closeStory(story,'promesse tenue',text,false)
 }
 if(story.type==='island-secret'){
  if(p.island!==story.location)return closeStory(story,'piste perdue','Tu quittes '+story.location+' avant d’avoir pu aller au bout de la piste.',true);
  var score=(p.skills.Navigation||0)*.35+(p.stats.Discipline||0)*.25+(p.haki.Observation||0)*.15+site.familiarity*.35,target=35+infStatic(story.location).danger*.35,ok=R('story')<cl(.35+(score-target)/120,.12,.9);if(ok){site.familiarity=cl(site.familiarity+8,0,100);var found=discoverByKnowledge(story.location),value=1200+Math.round(R('story')*(3000+infStatic(story.location).danger*100));p.money+=value;text='La piste mène quelque part. '+(found?'Une nouvelle découverte entre dans ton Codex. ':'Tu confirmes un détail que peu de gens connaissent. ')+'Tu récupères aussi '+value.toLocaleString('fr-FR')+' B.';return closeStory(story,'secret éclairci',text,false)}p.energy=cl(p.energy-8,0,100);return closeStory(story,'fausse piste','La piste s’effondre après plusieurs recherches. Tu en ressors surtout plus prudent.',true)
 }
 if(story.type==='social-favor'){
  if(!r||r.status!=='active')return closeStory(story,'occasion perdue','La situation change avant que tu puisses réellement aider '+story.participantName+'.',true,'interrupted');
  var need=Math.max(1,story.data.cost||1),paid=Math.max(0,story.data.paid||0),support=paid/need+(p.skills.Commandement||0)/160+(p.stats.Volonté||0)/260;
  if(story.choice==='help'&&support<.28){r.trust=cl(r.trust-1,0,100);return closeStory(story,'aide insuffisante','Tu essaies d’aider, mais tes ressources et ton influence ne suffisent pas à résoudre le problème.',true)}
  r.trust=cl(r.trust+7,0,100);r.loyalty=cl(r.loyalty+5,0,100);r.affection=cl(r.affection+3,0,100);r.favorBalance=cl((r.favorBalance||0)+1,-5,5);addRelationMemory(r,'Tu réponds présent dans une période difficile.','story');return closeStory(story,'lien renforcé',story.participantName+' n’oublie pas ton aide. Votre relation gagne en confiance et une dette sociale apparaît.',false)
 }
 if(story.type==='career-crossroads'){
  rec=careerRecord();var bold=story.choice==='bold',careerScore=power()+(p.stats.Discipline||0)*.35+(rec.xp||0)*.02,danger=story.data.danger||50;success=!bold||R('story')<cl(.38+(careerScore-danger)/100,.16,.88);if(success){var xp=bold?12+Math.round(R('story')*16):6+Math.round(R('story')*7);rec.xp+=xp;p.reputation+=bold?4:2;text='Tu transformes ce choix en progression concrète : +'+xp+' XP carrière.';return closeStory(story,bold?'pari réussi':'progression sûre',text,false)}p.reputation=Math.max(0,p.reputation-2);p.health=cl(p.health-(3+R('story')*8),1,100);return closeStory(story,'pari manqué','L’opportunité se retourne contre toi. Tu conserves ton poste, mais l’échec laisse des traces.',true)
 }
 if(story.type==='justice-shadow'){
  var heat=j.regionalHeat[p.region]||0;if(story.choice==='hide'){var hideScore=(p.skills.Discrétion||0)*.8+(p.stats.Discipline||0)*.2,okHide=R('story')<cl(.35+(hideScore-heat)/110,.15,.9);if(okHide){j.regionalHeat[p.region]=cl(heat-18,0,100);j.notoriety=cl(j.notoriety-5,0,100);return closeStory(story,'pression évitée','Tu changes suffisamment tes habitudes pour faire retomber une partie de la pression.',false)}j.regionalHeat[p.region]=cl(heat+9,0,100);return closeStory(story,'repéré','Tes efforts pour disparaître attirent finalement davantage l’attention.',true)}
  p.reputation+=3;j.regionalHeat[p.region]=cl(heat+12,0,100);if(p.faction==='Pirates'||p.faction==='Révolutionnaires')issueBounty(4000+Math.round(heat*220),'Défi aux autorités');return closeStory(story,'défi assumé','Tu refuses de te cacher. Ta réputation augmente, mais les autorités resserrent leur attention.',false)
 }
 if(story.type==='rival-challenge'){
  if(!r||r.status!=='active')return closeStory(story,'duel impossible','Ton rival n’est plus disponible pour cette confrontation.',true,'interrupted');var previousStage=rivalStage(r),rp=relationPower(r),chance=cl(.5+(power()-rp)/85,.12,.88),win=R('story')<chance;if(win){p.wins++;r.rivalLosses=(r.rivalLosses||0)+1;r.rivalry=cl(r.rivalry+5,0,100);r.respect=cl(r.respect+6,0,100);addRelationMemory(r,'Tu remportes un duel important dans votre rivalité.','story');syncRivalryMilestone(r,previousStage);return closeStory(story,'duel remporté','Tu prends l’avantage sur '+r.name+'. La rivalité gagne en respect autant qu’en intensité.',false)}p.losses++;r.rivalWins=(r.rivalWins||0)+1;r.rivalry=cl(r.rivalry+6,0,100);r.respect=cl(r.respect+3,0,100);p.health=cl(p.health-(3+R('story')*7),1,100);addRelationMemory(r,'Te bat lors d’un duel important.','story');syncRivalryMilestone(r,previousStage);return closeStory(story,'duel perdu',r.name+' prend l’avantage cette fois. La rivalité, elle, ne disparaît pas.',false)
 }
 if(story.type==='organization-crisis'){
  if(!o)return closeStory(story,'groupe disparu','Ton organisation n’existe plus lorsque vient le moment de résoudre la crise.',true,'interrupted');if(story.choice==='fund'){o.morale=cl(o.morale+10,0,100);o.supplies=cl(o.supplies+18,0,100);o.cohesion=cl(o.cohesion+4,0,100);return closeStory(story,'crise financée','L’investissement stabilise les ressources et le moral du groupe.',false)}var cmd=p.skills.Commandement||0,okCmd=R('story')<cl(.35+cmd/130,.2,.9);if(okCmd){o.morale=cl(o.morale+12,0,100);o.cohesion=cl(o.cohesion+8,0,100);return closeStory(story,'groupe rallié','Ton autorité suffit à ressouder le groupe sans achat massif.',false)}o.morale=cl(o.morale-7,0,100);o.cohesion=cl(o.cohesion-5,0,100);return closeStory(story,'crise aggravée','Ton discours ne convainc pas assez. La tension interne augmente.',true)
 }
 if(story.type==='mentor-lesson'){
  if(!r||r.status!=='active')return closeStory(story,'leçon interrompue','Ton mentor n’est plus disponible lorsque vient le moment de poursuivre cet apprentissage.',true,'interrupted');var focus=story.data.focus||combatPrimarySkill(),amount=story.choice==='intense'?1.15+R('story')*.75:.55+R('story')*.35,gainMentor=gain(focus,amount);if(story.choice==='intense'){p.energy=cl(p.energy-12,0,100);if(R('story')<.16)p.health=cl(p.health-5-R('story')*7,1,100);r.respect=cl(r.respect+5,0,100)}else{r.trust=cl(r.trust+5,0,100);r.respect=cl(r.respect+2,0,100)}addRelationMemory(r,'Vous franchissez une nouvelle étape de mentorat.','story');return closeStory(story,'leçon intégrée',focus+' progresse de '+gainMentor.toFixed(1)+'. '+r.name+' reconnaît tes efforts.',false)
 }
 if(story.type==='crew-pressure'){
  var crew=game.world.crews.find(function(c){return c.id===story.data.crewId&&c.status==='active'});if(!crew)return closeStory(story,'menace disparue','L’équipage quitte la région avant que la situation n’atteigne son point critique.',false,'interrupted');
  if(story.choice==='confront'){var survived=fight(cl(crew.power*.78,22,82),'Affrontement contre '+crew.name);if(!game.alive)return;if(survived){crew.morale=cl(crew.morale-10,0,100);crew.resources=cl((crew.resources||0)-6,0,100);crew.defeats=(crew.defeats||0)+1;return closeStory(story,'pression repoussée','Ta victoire force '+crew.name+' à réduire ses ambitions dans la région.',false)}crew.morale=cl(crew.morale+4,0,100);crew.victories=(crew.victories||0)+1;return closeStory(story,'confrontation perdue',crew.name+' ressort renforcé de votre affrontement.',true)}
  var scout=(p.skills.Discrétion||0)*.5+(p.haki.Observation||0)*.25+(p.stats.Discipline||0)*.25,okScout=R('story')<cl(.35+(scout-crew.power*.45)/100,.18,.9);if(okScout){crew.morale=cl(crew.morale-2,0,100);learnLocalRumor(p.island);return closeStory(story,'menace comprise','Tu observes '+crew.name+' sans t’exposer et récupères des informations utiles.',false)}return closeStory(story,'repérage manqué','Tu n’obtiens aucune information fiable avant que l’équipage ne change de position.',true)
 }
 if(story.type==='family-crossroads'){
  var partnerNow=partnerRelation(),kids=(p.children||[]).filter(function(c){return c.status==='active'});if(story.choice==='presence'){if(partnerNow){partnerNow.affection=cl(partnerNow.affection+7,0,100);partnerNow.trust=cl(partnerNow.trust+5,0,100)}kids.forEach(function(c){c.bond=cl((c.bond==null?55:c.bond)+5,0,100)});return closeStory(story,'liens consolidés','Tu ralentis suffisamment pour renforcer les liens qui survivront à tes aventures.',false)}
  if(p.career!=='Aucune'){var recFamily=careerRecord();recFamily.xp+=7}else gain('Discipline',.65+R('story')*.35);p.reputation+=2;if(partnerNow)partnerNow.affection=cl(partnerNow.affection-3,0,100);kids.forEach(function(c){c.bond=cl((c.bond==null?55:c.bond)-2,0,100)});return closeStory(story,'ambition prioritaire','Ta trajectoire avance, mais tes proches ressentent ton absence.',false)
 }
 if(story.type==='horizon-call'){
  if(story.choice==='sell'){var sale=1800+Math.round(R('story')*5200);p.money+=sale;return closeStory(story,'information vendue','Tu transformes la rumeur en '+sale.toLocaleString('fr-FR')+' B sans prendre le risque de la poursuivre.',false)}
  var exploreScore=(p.skills.Navigation||0)*.5+(p.stats.Discipline||0)*.25+site.familiarity*.35,target=32+(story.data.danger||0)*.28,okRoute=R('story')<cl(.38+(exploreScore-target)/105,.15,.9);if(okRoute){site.familiarity=cl(site.familiarity+7,0,100);discoverByKnowledge(story.location);var haul=2200+Math.round(R('story')*7200);p.money+=haul;return closeStory(story,'route exploitée','La piste tient ses promesses. Ta connaissance locale progresse et tu récupères '+haul.toLocaleString('fr-FR')+' B.',false)}p.energy=cl(p.energy-7,0,100);return closeStory(story,'piste stérile','Tu consacres du temps à la piste sans obtenir le résultat espéré.',true)
 }
}
function storyChoice(storyId,choiceId){
 var eng=migrateStoryEngine(game),story=eng.active.find(function(s){return s.id===storyId});if(!story||!story.awaiting)return false;story.choice=choiceId;story.awaiting=false;eng.stats.choices++;
 if(story.type==='youth-promise'&&choiceId==='distance'){var yr=storyRelation(story);if(yr)yr.trust=cl(yr.trust-2,0,100);return closeStory(story,'distance gardée','Tu choisis de ne pas transformer ce lien en promesse durable.',false,'abandoned')}
 if(story.type==='island-secret'&&choiceId==='leave')return closeStory(story,'piste abandonnée','Tu décides que cette piste ne mérite pas davantage de temps.',false,'abandoned');
 if(story.type==='social-favor'&&choiceId==='refuse'){var sr=storyRelation(story);if(sr){sr.trust=cl(sr.trust-5,0,100);sr.affection=cl(sr.affection-2,0,100);addRelationMemory(sr,'Tu refuses de l’aider lors d’un moment important.','story')}return closeStory(story,'aide refusée','Tu protèges tes ressources, mais '+story.participantName+' retient ton refus.',false,'abandoned')}
 if(story.type==='social-favor'&&choiceId==='help'){var need=Math.max(0,story.data.cost||0),cost=Math.min(Math.max(0,game.player.money),need);game.player.money-=cost;story.data.paid=cost;story.data.unpaid=Math.max(0,need-cost)}
 if(story.type==='rival-challenge'&&choiceId==='decline'){var rr=storyRelation(story);if(rr){rr.rivalry=cl(rr.rivalry+3,0,100);rr.respect=cl(rr.respect-3,0,100)}return closeStory(story,'duel reporté','Tu refuses cette confrontation. Ton rival ne l’oublie pas.',false,'abandoned')}
 if(story.type==='organization-crisis'&&choiceId==='fund'){var need=story.data.cost||5000;if(game.player.money<need){story.choice='rally'}else game.player.money-=need}
 if(story.type==='career-sunset'){
  var sunsetRec=careerRecord(),sunsetWords=careerSunsetWording();sunsetRec.retirementDecisionAge=game.player.ageMonths;
  if(choiceId==='step-back'){sunsetRec.retired=true;sunsetRec.retirementChoice='retired';sunsetRec.retirementAge=game.player.ageMonths;game.player.situation='Vétéran';game.player.activity='Routine';game.player.focus='Équilibre';recordLifeDirector('career-sunset','Passage en retrait après '+Math.floor(sunsetRec.months/12)+' ans de carrière',{faction:game.player.faction,rank:game.player.rank});signalPersonalChapter('career',sunsetWords.chapter,28,'career-sunset:retired',game.player.faction);return closeStory(story,'passage en retrait','Tu quittes la progression automatique de carrière. Ton rang, ta réputation et ton héritage restent acquis, et tu peux encore accepter ponctuellement des missions.',false)}
  sunsetRec.retired=false;sunsetRec.retirementChoice='active';recordLifeDirector('career-sunset','Maintien en première ligne',{faction:game.player.faction,rank:game.player.rank});signalPersonalChapter('career','Dernière grande période active',16,'career-sunset:active',game.player.faction);return closeStory(story,'service prolongé','Tu choisis de rester pleinement actif. Cette décision ne te sera pas reproposée automatiquement.',false)
 }
 if(story.type==='career-turn'){
  var dc=migrateLifeDirector(game.player),ct=story.data&&story.data.turn;dc.lastCareerTurnAge=game.player.ageMonths;
  if(choiceId==='pivot-career'&&ct){var changed=applyCareerSpecialization(ct.to,'life-director');if(changed){dc.careerTurns++;recordLifeDirector('career-turn','Réorientation de '+ct.from+' vers '+ct.to,{from:ct.from,to:ct.to,margin:Math.round(ct.margin*10)/10});signalPersonalChapter('career','Évolution de carrière',18,'career-turn:'+ct.to,game.player.faction);tl('Tournant de carrière','Tu te réorientes de '+ct.from+' vers '+ct.to+'.','major');return closeStory(story,'réorientation','Ta carrière prend une nouvelle direction vers '+ct.to+'.',false)}}
  recordLifeDirector('career-turn','Spécialisation conservée : '+game.player.specialization,{from:ct&&ct.from||game.player.specialization,to:ct&&ct.to||null,declined:true});return closeStory(story,'cap maintenu','Tu conserves ta spécialisation actuelle malgré cette possibilité de réorientation.',false,'abandoned')
 }
 if(story.type==='legacy-crossroads'){
  var dl=migrateLifeDirector(game.player),ancestor=latestDynastyLegacy();dl.legacyChoice=choiceId==='embrace-legacy'?'embraced':'independent';recordLifeDirector('legacy',choiceId==='embrace-legacy'?'Héritage assumé de '+story.data.ancestorName:'Voie propre face à l’héritage de '+story.data.ancestorName,{ancestor:story.data.ancestorName,choice:dl.legacyChoice});
  if(choiceId==='embrace-legacy'){game.player.reputation+=4;if(ancestor&&ancestor.career===game.player.faction)adjustRep(game.player.faction,4);game.relations.filter(function(r){return r.status==='active'&&r.type==='legacy'}).forEach(function(r){r.respect=cl(r.respect+5,0,100);r.trust=cl(r.trust+2,0,100);addRelationMemory(r,'Tu assumes publiquement l’héritage de '+story.data.ancestorName+'.','legacy')});signalPersonalChapter('legacy','Héritage de '+story.data.ancestorName,24,'legacy-embraced',story.data.ancestorName);return closeStory(story,'héritage assumé','Tu acceptes que le nom de '+story.data.ancestorName+' fasse partie de ta propre histoire. Les anciens liens de la famille te regardent désormais autrement.',false)}
  var gained=gain('Volonté',.6+R('life')*.5);signalPersonalChapter('legacy','Tracer sa propre voie',24,'legacy-independent',story.data.ancestorName);return closeStory(story,'voie propre','Tu reconnais ce qui t’a précédé sans en faire ton identité. Volonté +'+gained.toFixed(1)+'.',false)
 }
 if(story.type==='relationship-opening'){
  var dr=migrateLifeDirector(game.player),rr=storyRelation(story);dr.lastRomanceAge=game.player.ageMonths;dr.romanceOffers++;migrateStoryEngine(game).lastStartAge=game.player.ageMonths+8;
  if(choiceId==='explore'&&rr){dr.familyAutoPaused=false;dr.familyPausedRelationId=null;dr.familyDeferredUntil=0;dr.familyDeferrals=0;game.player.life.partnerId=rr.id;game.player.life.relationshipStatus='En couple';rr.type='partner';rr.role='partenaire';rr.relationshipMonths=0;rr.affection=cl(rr.affection+7,0,100);rr.trust=cl(rr.trust+5,0,100);recordLifeDirector('relationship','Relation commencée avec '+rr.name,{relationId:rr.id});signalPersonalChapter('relationship','Lien avec '+rr.name,18,'relationship:'+rr.id,rr.id);return closeStory(story,'relation commencée','Votre proximité devient une relation. Le moteur continuera à faire évoluer ce lien sans te demander de l’entretenir chaque mois.',false)}
  if(rr)recordLifeDirector('relationship','Amitié préservée avec '+rr.name,{relationId:rr.id,declined:true});return closeStory(story,'lien préservé','Vous restez proches sans transformer cette relation en couple.',false,'abandoned')
 }
 if(story.type==='family-future'){
  var df=migrateLifeDirector(game.player),pr=partnerRelation();df.lastFamilyAge=game.player.ageMonths;df.familyOffers++;migrateStoryEngine(game).lastStartAge=game.player.ageMonths+8;
  if(choiceId==='commit'&&pr){df.familyDeferredUntil=0;df.familyDeferrals=0;df.familyAutoPaused=false;df.familyPausedRelationId=null;game.player.life.relationshipStatus='Marié';pr.role='conjoint';pr.loyalty=cl(pr.loyalty+10,0,100);pr.trust=cl(pr.trust+7,0,100);recordLifeDirector('family','Mariage avec '+pr.name,{relationId:pr.id});signalPersonalChapter('family','Foyer avec '+pr.name,22,'marriage:'+pr.id,pr.id);checkAchievements();return closeStory(story,'mariage','Tu épouses '+pr.name+'. Cette étape devient un chapitre de ta vie plutôt qu’une tâche de menu.',false)}
  if(choiceId==='child'&&pr){df.familyDeferredUntil=0;df.familyDeferrals=0;df.familyAutoPaused=false;df.familyPausedRelationId=null;var i=game.player.children.length,name=familyChildName(),child=normalizeChildProfile({id:'child-'+game.dynasty.generation+'-'+Math.floor(R('family')*999999)+'-'+i,name:name,ageMonths:0,birthplace:game.player.island,birthRegion:game.player.region,race:game.player.race,status:'active',bond:60+R('family')*25});game.player.children.push(child);game.player.money-=Math.min(game.player.money,2500);recordLifeDirector('family','Naissance de '+name,{childId:child.id});signalPersonalChapter('family','Foyer avec '+pr.name,24,'child:'+child.id,pr.id);checkAchievements();return closeStory(story,'nouvelle génération',name+' rejoint ta famille à '+game.player.island+'.',false)}
  var futureKind=story.data&&story.data.future||null;df.familyDeferrals=(df.familyDeferrals||0)+1;var familyDelay=futureKind==='child'?120+Math.min(60,(df.familyDeferrals-1)*24):60+Math.min(36,(df.familyDeferrals-1)*12);df.familyDeferredUntil=game.player.ageMonths+familyDelay;df.familyAutoPaused=true;df.familyPausedRelationId=pr&&pr.id||null;recordLifeDirector('family','Étape familiale repoussée',{future:futureKind,untilAge:df.familyDeferredUntil,deferrals:df.familyDeferrals,autoPaused:true,declined:true});rememberCausalMemory('family','Projet familial repoussé',58+Math.min(18,df.familyDeferrals*4),{kind:'family',subjectId:pr&&pr.id||'family',relationId:pr&&pr.id||null,future:futureKind,deferrals:df.familyDeferrals},'family-deferral:'+String(pr&&pr.id||'family')+':'+String(futureKind));return closeStory(story,'étape reportée','Vous choisissez de ne pas précipiter cette étape. Le moteur respecte ce choix sur plusieurs années au lieu de reposer presque aussitôt la même question.',false,'abandoned')
 }
 if(story.type==='career-transfer'){
  var dm=migrateLifeDirector(game.player);dm.lastMobilityAge=game.player.ageMonths;dm.journeyOffers++;migrateStoryEngine(game).lastStartAge=game.player.ageMonths+8;
  if(choiceId==='accept-transfer'&&beginJourney(story.data.destination,'career-transfer',{reason:story.data.reason||null}))return closeStory(story,'mutation acceptée','Tu acceptes cette nouvelle affectation et prends la mer vers '+story.data.destination+'.',false);
  recordLifeDirector('mobility','Mutation refusée vers '+story.data.destination,{destination:story.data.destination,declined:true});return closeStory(story,'mutation refusée','Tu restes à '+game.player.island+' et poursuis ta trajectoire actuelle.',false,'abandoned')
 }
 story.stage=1;story.nextAge=game.player.ageMonths+1+R('story')*3;story.deadlineAge=Math.max(story.deadlineAge,story.nextAge+4);story.lastBeat='Conséquence en attente';story.summary='Ta décision est prise. Il faut maintenant laisser la situation évoluer.';tl('Choix — '+story.title,storyChoices(story).find(function(x){return x.id===choiceId})?.label||choiceId);return true
}
function maybeStartMobilityStory(){
 var p=game.player,eng=migrateStoryEngine(game),d=migrateLifeDirector(p),active=activeStories();
 if(p.ageMonths<216||p.career==='Aucune'||p.travel||game.mission||awaitingStory()||active.length>=2||p.ageMonths-eng.lastStartAge<4)return false;
 var destination=directorTravelCandidate();if(!destination)return false;
 var timing=directorMobilityTiming(),elapsed=p.ageMonths-(d.lastMobilityAge==null?-999:d.lastMobilityAge),priority=directorMobilityPriority();
 if(elapsed<timing.overdue||priority<.68)return false;
 return!!startStory('career-transfer')
}
function maybeStartCareerTurnStory(){
 var p=game.player,eng=migrateStoryEngine(game),d=migrateLifeDirector(p),active=activeStories();if(p.travel||game.mission||awaitingStory()||active.length>=2||p.ageMonths-eng.lastStartAge<4)return false;
 var turn=careerTurnCandidate();if(!turn)return false;var rec=careerRecord(),sinceTurn=p.ageMonths-(d.lastCareerTurnAge==null?-999:d.lastCareerTurnAge),strong=turn.margin>=8&&rec.months>=24,overdue=sinceTurn>=72;
 if(!strong||!overdue)return false;return!!startStory('career-turn')
}
function maybeStartFamilyStory(){
 var p=game.player,eng=migrateStoryEngine(game),d=migrateLifeDirector(p),active=activeStories();if(p.travel||game.mission||awaitingStory()||active.length>=2||p.ageMonths-eng.lastStartAge<4)return false;
 var future=directorFamilyOpportunity();if(!future)return false;var kids=(p.children||[]).filter(function(c){return c.status==='active'}).length,partner=partnerRelation();if(!partner)return false;
 var milestone=future==='marriage'||(future==='child'&&kids===0);if(!milestone)return false;
 var ready=future==='marriage'?(partner.relationshipMonths||0)>=14:(partner.relationshipMonths||0)>=22&&p.ageMonths-(d.lastFamilyAge==null?-999:d.lastFamilyAge)>=14;
 if(!ready)return false;return!!startStory('family-future')
}
function storyTick(m){
 var p=game.player,eng=migrateStoryEngine(game),list=activeStories().slice();for(var i=0;i<list.length;i++){var story=list[i];if(story.type==='island-secret'&&p.travel&&p.travel.from===story.location){closeStory(story,'piste laissée derrière','Tu prends la mer avant d’avoir résolu ce mystère local.',true,'interrupted');continue}if(story.awaiting)continue;if(p.ageMonths>story.deadlineAge){closeStory(story,'échéance dépassée','La situation se referme avant que tu puisses aller au bout.',true);continue}if(p.ageMonths<story.nextAge)continue;
  if(story.stage===0){setStoryAwaiting(story);continue}
  if(story.stage===1)storyResolve(story)
 }
 if(!awaitingStory()&&!migrateJustice(p).detained&&!maybeStartFamilyStory()&&!maybeStartCareerTurnStory()&&!maybeStartMobilityStory())maybeStartStory(m)
}
function showStoryDecision(id){
 var story=id?activeStories().find(function(s){return s.id===id}):awaitingStory();if(!story||!story.awaiting)return false;var choices=storyChoices(story).map(function(c){return[c.label,c.desc,function(){storyChoice(story.id,c.id)}]});if(!choices.length)return false;decision(story.title,storyPrompt(story),choices);return true
}
function showAttention(){
 if(game&&game.pending)return showDecision();var s=awaitingStory();if(s)return showStoryDecision(s.id)
}
function renderStories(){
 var eng=migrateStoryEngine(game),active=activeStories(),awaiting=awaitingStory();$('#storyEngineBadge').textContent=active.length?active.length+' actif'+(active.length>1?'s':''):'Aucun fil';
 $('#storySummary').innerHTML=active.length?'<div><span>En cours</span><strong>'+active.length+'</strong></div><div><span>Décision</span><strong>'+(awaiting?'À prendre':'Aucune')+'</strong></div>':'';
 $('#activeStories').innerHTML=active.length?active.map(function(s){var wait=s.awaiting,remaining=Math.max(0,s.deadlineAge-game.player.ageMonths);return'<div class="story-thread '+(wait?'awaiting':'')+'"><div class="story-thread-head"><strong>'+e(s.title)+'</strong><span>'+(wait?'Décision':'Étape '+(s.stage+1))+'</span></div><p>'+e(s.summary)+'</p><div class="story-thread-meta"><span>'+e(s.region||'')+'</span><span>'+(remaining<=0?'Échéance immédiate':durationText(remaining)+' avant échéance')+'</span>'+(s.participantName?'<span>'+e(s.participantName)+'</span>':'')+'</div>'+(wait?'<div class="story-thread-actions"><button data-story-decision="'+e(s.id)+'">Voir les choix</button></div>':'')+'</div>'}).join(''):'<p class="helper-text">Aucun fil narratif actif.</p>';
 $$('[data-story-decision]').forEach(function(b){b.onclick=function(){showStoryDecision(b.dataset.storyDecision)}});
 $('#storyHistory').innerHTML=eng.history.length?'<span class="tiny-label">Derniers fils terminés</span>'+eng.history.slice(0,4).map(function(h){var state=h.closure==='resolved'?'Abouti':h.closure==='abandoned'?'Abandonné':h.closure==='interrupted'?'Interrompu':'Échoué';return'<div class="story-history-item"><strong>'+e(h.title)+' • '+state+'</strong>'+e(h.result||h.outcome||'Conséquence enregistrée.')+'</div>'}).join(''):''
}
function migrate(g){
 if(!g)return null;var p=g.player||{},w=g.world||{};
 g.version=28;g.lastCombat=g.lastCombat||null;g.rng=g.rng||{};migrateLifeLoop(g);migrateExploration(p);migrateStoryEngine(g);if(g.pending&&!pendingIsExecutable(g.pending))g.pending=null;
 p.techniques=p.techniques||[];p.techniqueMastery=p.techniqueMastery||{};p.fruitMastery=p.fruitMastery||0;p.fruitAwakened=!!p.fruitAwakened;p.heldFruit=p.heldFruit||null;p.combatXP=p.combatXP||0;p.hakiApplications=p.hakiApplications||{Observation:[],Armement:[],Conquérant:[]};
 p.haki=p.haki||{Observation:0,Armement:0,Conquérant:0};p.latent=p.latent||{Observation:40,Armement:40,Conquérant:0};p.conditions=p.conditions||[];
 normalizeActivityFocus(p);
  p.life=p.life||defaultLife();migrateLifeDirector(p);p.life.assets=p.life.assets||{property:0,business:0,ship:0,treasure:0};p.life.debt=Math.max(0,p.life.debt||0);p.life.debtPeak=Math.max(0,p.life.debtPeak||0);p.life.debtInterestPaid=Math.max(0,p.life.debtInterestPaid||0);if(p.money<0){p.life.debt+=-p.money;p.life.debtPeak=Math.max(p.life.debtPeak,p.life.debt);p.money=0}p.children=p.children||[];p.children=p.children.map(function(c,i){c.id=c.id||('child-'+i+'-'+H(String(g.seed)+':child:'+i));c.name=c.name||PEOPLE_NAMES[H(String(g.seed)+':childname:'+i)%PEOPLE_NAMES.length];c.ageMonths=c.ageMonths||0;c.birthplace=c.birthplace||p.island||'';c.birthRegion=c.birthRegion||p.region||p.origin;c.race=c.race||p.race||'Humain';c.status=c.status||'active';c.bond=cl(c.bond==null?60:c.bond,0,100);return c});
 g.codex=g.codex||{people:[],places:[],factions:['Civil'],fruits:[]};['people','places','factions','fruits','events','techniques','discoveries'].forEach(function(k){g.codex[k]=g.codex[k]||[]});g.relations=(g.relations||[]).map(function(r,i){return normalizeRelation(g,r,i)});g.socialSeq=g.socialSeq||g.relations.length;g.achievements=g.achievements||{unlocked:{}};g.achievements.unlocked=g.achievements.unlocked||{};g.dynasty=g.dynasty||{generation:1,ancestors:[]};g.dynasty.ancestors=Array.isArray(g.dynasty.ancestors)?g.dynasty.ancestors.slice(-20):[];
 p.factionRep=p.factionRep||{Civil:10,Marine:0,Pirates:0,'Chasseur de primes':0,Révolutionnaires:0,Gouvernement:0};
 FACTION_KEYS.forEach(function(k){if(p.factionRep[k]==null)p.factionRep[k]=0});
 p.careerRecords=p.careerRecords||{};p.specialization=p.specialization||null;p.careerHistory=Array.isArray(p.careerHistory)?p.careerHistory.slice(-60):[];p.salaryTotal=p.salaryTotal||0;p.deserterFrom=p.deserterFrom||[];migrateOrganization(g,p);migrateJustice(p);migrateInfluence(p);migrateStrategy(p);migrateTrade(p);migrateProgression(g,p);
 if(p.career&&p.career!=='Aucune'&&!p.careerRecords[p.faction])p.careerRecords[p.faction]={xp:p.careerXP||0,months:p.serviceMonths||0,rank:p.rank||firstRank(p.faction),specialization:p.specialization||null,successes:0,failures:0};
 if(p.careerRecords[p.faction]){p.rank=p.careerRecords[p.faction].rank||p.rank;p.specialization=p.careerRecords[p.faction].specialization||p.specialization}
 if(p.faction==='Pirates'&&p.organization&&p.organization.pirateOrigin==='joined'&&['Capitaine','Capitaine renommé'].indexOf(p.rank)>=0){p.rank='Bras droit';if(p.careerRecords.Pirates)p.careerRecords.Pirates.rank='Bras droit';p.organization.authority='officer';p.organization.playerRole='Bras droit'}
 w.fruits=w.fruits||['Mera Mera no Mi','Ope Ope no Mi','Hie Hie no Mi','Moku Moku no Mi'];w.fruitRegistry=w.fruitRegistry||{};
 w.fruits.forEach(function(n){if(!w.fruitRegistry[n])w.fruitRegistry[n]={status:p.fruit===n?'consumed':'available',holder:p.fruit===n?p.name:null}});
 w=initWorldEconomy(g,initGrandStrategy(initLivingWorld(g,w)));migrateWorldMissionSource(g,w);if(g.mission){g.mission.importance=missionImportance(g.mission,w);g.mission.stakes=missionStakes(g.mission,w);g.mission.signature=g.mission.importance>=58}var dk=String(g.seed),ix=migrateInfluence(p);ix.domains=Object.keys(w.territories).filter(function(n){var pc=w.territories[n].playerControl;return pc&&pc.ownerKey===dk});ix.affiliates=w.crews.filter(function(c){return c.affiliation&&c.affiliation.ownerKey===dk&&c.status==='active'}).map(function(c){return c.id});g.player=p;g.world=installWorldSerializer(w);return g
}
function load(i){try{return migrate(JSON.parse(localStorage.getItem(slotKey(i))||'null'))}catch(x){return null}}
function purgeSaveSlot(i){var existed=!!localStorage.getItem(slotKey(i))||!!localStorage.getItem(slotMetaKey(i));localStorage.removeItem(slotKey(i));localStorage.removeItem(slotMetaKey(i));return existed}
function deleteSaveSlot(i,skipConfirm){var existing=load(i);if(!existing)return false;var label=existing.player&&existing.player.name?existing.player.name:'cette vie';if(!skipConfirm&&typeof window!=='undefined'&&typeof window.confirm==='function'&&!window.confirm('Supprimer définitivement la sauvegarde de '+label+' ? Cette action est irréversible.'))return false;purgeSaveSlot(i);if(slot===i&&!$('#startScreen').classList.contains('active'))game=null;slots();toast('Emplacement '+i+' supprimé.');return true}
function tl(t,d,y){game.timeline.unshift({age:age(),title:t,desc:d,type:y||''});game.timeline=game.timeline.slice(0,80);var l=migrateLifeLoop(game);l.momentSeq++;if(['major','danger','canon'].indexOf(y)>=0)l.majorSeq++}
function recordSignatureMoment(title,desc,kind,weight){var l=migrateLifeLoop(game),item={id:++l.signatureSeq,age:age(),title:title,desc:desc||'',kind:kind||'life',weight:weight==null?60:weight};l.signatureMoments.unshift(item);l.signatureMoments=l.signatureMoments.slice(0,24);if(item.weight>=85)rememberFoundingMoment(title,desc,kind,'signature:'+kind+':'+title);return item}
function news(t,d,type){var l=migrateLifeLoop(game),item={title:t,desc:d,type:type||'',seq:++l.worldSeq};game.news.unshift(item);game.news=game.news.slice(0,25);l.recentWorld.unshift({title:t,desc:d,type:type||'',seq:item.seq});l.recentWorld=l.recentWorld.slice(0,12)}
function press(){var o={};REG.forEach(function(r){o[r]={Piraterie:20+R('w')*25,Marine:30+R('w')*35,Criminalité:15+R('w')*30,Révolution:5+R('w')*20,Prospérité:40+R('w')*35,Instabilité:10+R('w')*25}});return o}
function make(){
 var seed=Number($('#seedInput').value)||Math.floor(Math.random()*2147483647);game={seed:seed,rng:{}};var origin=mode==='custom'?$('#originInput').value:pk(ORIG,'b');
 game={version:28,seed:seed,rng:game.rng,alive:true,pending:null,mission:null,timeline:[],news:[],relations:[],codex:{people:[],places:[],factions:['Civil'],fruits:[],events:[],techniques:[],discoveries:[]},world:{year:0,month:0,divergence:0,pressures:{},factions:{Marine:82,Pirates:79,Révolutionnaires:56,Gouvernement:94},canon:[['Exécution de Gol D. Roger',0,'completed',100],['Nouvelle génération',18,'future',75],['Guerre au sommet',22,'future',95]],fruits:['Mera Mera no Mi','Ope Ope no Mi','Hie Hie no Mi','Moku Moku no Mi']},player:{name:$('#nameInput').value.trim()||'Kael Maren',difficulty:$('#difficultyInput').value,ageMonths:0,race:mode==='custom'?$('#raceInput').value:pk(['Humain','Humain','Humain','Mink','Homme-poisson'],'b'),origin:origin,region:origin,island:'',situation:'Enfance',activity:'Grandir',focus:'Grandir',faction:'Civil',career:'Aucune',rank:'Enfant',money:3000,health:100,energy:100,danger:'Faible',conditions:[],bounty:0,highestBounty:0,reputation:0,ambition:'Survivre',wins:0,losses:0,travel:null,visited:[],style:mode==='custom'?$('#styleInput').value:pk(['Équilibré','Corps-à-corps','Sabreur','Tireur','Mobile / esquive'],'b'),fruit:null,heldFruit:null,fruitMastery:0,fruitAwakened:false,techniques:[],techniqueMastery:{},combatXP:0,hakiApplications:{Observation:[],Armement:[],Conquérant:[]},haki:{Observation:0,Armement:0,Conquérant:0},latent:{Observation:20+R('h')*60,Armement:20+R('h')*60,Conquérant:R('h')<.04?90:0},stats:{},skills:{},caps:{}}};
 game=applyMeta(migrate(game));syncCanonicalFruits();var homes=Object.keys(PL).filter(function(n){return PL[n][0]===origin});game.player.island=pk(homes,'b');game.player.visited=[game.player.island];game.codex.places=[game.player.island];game.world.pressures=press();var birthSite=explorationSite(game.player.island);birthSite.familiarity=22;birthSite.visits=1;
 ST.forEach(function(k){game.player.stats[k]=8+R('b')*12;game.player.caps[k]=68+R('c')*25});SK.forEach(function(k){game.player.skills[k]=2+R('b')*8;game.player.caps[k]=68+R('c')*25});game.player.naturalCaps={};game.player.absoluteCaps={};ST.concat(SK).forEach(function(k){game.player.naturalCaps[k]=game.player.caps[k];game.player.absoluteCaps[k]=cl(game.player.caps[k]+5+(H(String(game.seed)+':absolute:'+k)%8),game.player.caps[k],100)});game.player.progression=defaultProgression(game.player);
 syncPowers();recordProgressSnapshot(true);tl('Naissance','Tu nais à '+game.player.island+', dans '+origin+'.','major');news('Grande Ère de la Piraterie','Le monde entre dans une période de bouleversements.');save();return game}
function diff(){var d=game.player.difficulty;return d==='Casual'?[1.18,.75]:d==='Grand Line'?[.97,1.15]:d==='New World'?[.93,1.35]:d==='Ironman'?[.9,1.55]:[1,1]}
function allTechniqueDefs(){return[].concat.apply([],Object.keys(TECH).map(function(k){return TECH[k]})).concat(SPECIAL_TECHNIQUES)}function techniqueBonus(){var p=game.player,b=0,all=allTechniqueDefs();(p.techniques||[]).forEach(function(id){var t=all.find(function(x){return x.id===id});if(t){var m=cl((p.techniqueMastery&&p.techniqueMastery[id])||1,0,100),factor=.25+.75*(m/100);b+=(t.bonus||0)*factor}});return b}function techniqueEffectiveBonus(id){var p=game.player,t=allTechniqueDefs().find(function(x){return x.id===id});if(!t)return 0;var m=cl((p.techniqueMastery&&p.techniqueMastery[id])||1,0,100);return(t.bonus||0)*(.25+.75*m/100)}
function styleMastery(){var p=game.player;if(p.style==='Corps-à-corps')return(p.skills.Combat||0)*.55+(p.stats.Force||0)*.30+(p.stats.Endurance||0)*.15;if(p.style==='Sabreur')return(p.skills.Sabre||0)*.62+(p.skills.Combat||0)*.23+(p.stats.Réflexes||0)*.15;if(p.style==='Tireur')return(p.skills.Tir||0)*.62+(p.stats.Réflexes||0)*.23+(p.stats.Discipline||0)*.15;if(p.style==='Mobile / esquive')return(p.skills.Combat||0)*.45+(p.stats.Agilité||0)*.33+(p.stats.Vitesse||0)*.22;return(p.skills.Combat||0)*.62+(p.stats.Discipline||0)*.20+(p.stats.Réflexes||0)*.18}
function powerRaw(){var p=game.player,physical=(p.stats.Force+p.stats.Vitesse+p.stats.Agilité+p.stats.Endurance+p.stats.Résistance+p.stats.Réflexes)/6,martial=styleMastery(),mental=p.stats.Discipline*.45+p.stats.Volonté*.55,h=p.haki.Observation*.06+p.haki.Armement*.08+p.haki.Conquérant*.10,f=p.fruit?(4+p.fruitMastery*.08+(p.fruitAwakened?6:0)):0;return physical*.36+martial*.30+mental*.08+h+f+(techniqueBonus()+signatureTechniqueBonus())*.30}function power(){return cl(powerRaw(),0,100)}
function powerRank(){var v=power();return v<20?'Novice':v<35?'Combattant':v<50?'Confirmé':v<65?'Élite':v<80?'Monstrueux':v<92?'Sommet':v<99.5?'Apex':'Maximum'}
function unlockTechnique(t,label){var p=game.player;if(p.techniques.indexOf(t.id)>=0)return;p.techniques.push(t.id);p.techniqueMastery[t.id]=1;if(game.codex&&game.codex.techniques&&game.codex.techniques.indexOf(t.name)<0)game.codex.techniques.push(t.name);tl(label||'Nouvelle technique',t.name+' entre dans ton répertoire.','major')}
function syncPowers(){var p=game.player,prof=TECH[p.style]||TECH['Équilibré'];prof.forEach(function(t){if((p.skills[t.skill]||0)>=t.req)unlockTechnique(t)});SPECIAL_TECHNIQUES.forEach(function(t){if(specialRequirementMet(t,p))unlockTechnique(t,'Technique spéciale')});Object.keys(HAKI_APPS).forEach(function(k){p.hakiApplications[k]=HAKI_APPS[k].filter(function(a){return p.haki[k]>=a[0]}).map(function(a){return a[1]})})}
function trainHaki(k,m){var p=game.player,learn=developmentFactor('Combat');if(!p.haki[k]){if(p.latent[k]>55&&R('h')<.025*m*learn*(p.latent[k]/70)){p.haki[k]=1;tl('Éveil du Haki','Ton Haki de '+k+' s’éveille.','major')}return}p.haki[k]=cl(p.haki[k]+m*learn*(.35+p.latent[k]/160)*cl(1-p.haki[k]/125,.12,1),0,100)}
function trainFruit(m){var p=game.player;if(!p.fruit)return;var learn=developmentFactor('Combat');p.fruitMastery=cl(p.fruitMastery+m*learn*(.55+R('fruit')*.45)*cl(1-p.fruitMastery/120,.15,1),0,100);if(p.fruitMastery>=85&&!p.fruitAwakened&&R('fruit')<.015*m*learn){p.fruitAwakened=true;tl('ÉVEIL DU FRUIT','Ta maîtrise franchit un seuil extraordinaire.','major')}}
function learnMastery(m,focus){
 var p=game.player,defs=allTechniqueDefs(),fs=Array.isArray(focus)?focus:focus?[focus]:[];(p.techniques||[]).forEach(function(id){var def=defs.find(function(x){return x.id===id}),relevant=!fs.length||(def&&def.skill&&fs.indexOf(def.skill)>=0)||(def&&def.requires&&def.requires.skill&&fs.indexOf(def.requires.skill)>=0);if(!relevant)return;var cur=p.techniqueMastery[id]||1;p.techniqueMastery[id]=cl(cur+m*(.28+R('p')*.38)*cl(1-cur/125,.15,1),0,100)});syncPowers()
}
function gain(k,n){var p=game.player,b=p.stats[k]!=null?p.stats:p.skills,z=b[k],cap=p.caps[k]||90;if(z>=cap)return 0;var raw=n*diff()[0]*developmentFactor(k)*cl(1-Math.pow(z/110,1.7),.1,1),next=cl(z+raw,0,cap),g=next-z;b[k]=next;trackProgressGain(k,g);return g}
function activityGrowthKeys(a){if(a==='Explorer')return['Réflexes','Navigation'];if(SIMPLE_FOCUS[a])return simpleFocusKeys(a);var profile=TRAINING_PROFILES[a];return profile?profile.keys.slice():[]}
function train(m){
 var p=game.player,focus=currentFocus();
 if(focus==='Pouvoirs'){
  gain('Volonté',m*(.28+R('p')*.32));gain('Discipline',m*(.18+R('p')*.25));
  if(p.fruit)trainFruit(m*.82);
  var awakened=Object.keys(p.haki).filter(function(k){return p.haki[k]>0});
  if(awakened.length)awakened.forEach(function(k){trainHaki(k,m*.48)});
  else if(p.ageMonths>=144){trainHaki('Observation',m*.32);trainHaki('Armement',m*.28);if((p.latent.Conquérant||0)>0)trainHaki('Conquérant',m*.18)}
  learnMastery(m*.35,['Combat','Sabre','Tir']);if(m>=.8)attemptBreakthrough('training-powers',58+Math.min(34,power()*.30),['Volonté','Discipline'].concat(styleFocusKeys()));return
 }
 var ks=activityGrowthKeys(focus);if(!ks.length)ks=[pk(ST,'p'),pk(SK,'p')];
 var rate=focus==='Équilibre'?.48:focus==='Carrière'?.56:focus==='Combat'?.57:.52;
 if(focus==='Combat'){styleTrainingPlan().forEach(function(x){gain(x.key,m*x.weight*(rate+R('p')*.72))})}
 else ks.forEach(function(k){gain(k,m*(rate+R('p')*.72))});
 if(p.fruit&&R('fruit')<.35)trainFruit(m*.25);if(p.haki.Observation&&R('h')<.25)trainHaki('Observation',m*.18);if(p.haki.Armement&&R('h')<.25)trainHaki('Armement',m*.18);learnMastery(m,ks);if(m>=.8)attemptBreakthrough(focus==='Combat'?'training-combat':focus==='Carrière'?'training-career':'training',52+Math.min(38,careerQualification()*.32),focus==='Combat'?styleFocusKeys():ks)
}

function relationById(id){return game.relations.find(function(r){return r.id===id})||null}
function partnerRelation(){var p=game.player,id=p.life.partnerId,r=id?relationById(id):null;if(r&&r.status==='dead'){p.life.partnerId=null;if(p.life.relationshipStatus!=='Célibataire')p.life.relationshipStatus='En deuil';return null}if(!r&&(p.life.relationshipStatus==='En couple'||p.life.relationshipStatus==='Marié')){r=(game.relations||[]).filter(function(x){return x&&x.status==='active'&&(x.type==='partner'||x.role==='partenaire'||x.role==='conjoint')}).sort(function(a,b){return(b.relationshipMonths||0)-(a.relationshipMonths||0)||(b.trust||0)-(a.trust||0)})[0]||null;if(r)p.life.partnerId=r.id}return r}
function familyChildName(){var p=game.player,used=(p.children||[]).map(function(c){return c&&c.name}).filter(Boolean),partner=partnerRelation();if(p.name)used.push(p.name);if(partner&&partner.name)used.push(partner.name);used=used.filter(function(name,i,a){return a.indexOf(name)===i});var pool=PEOPLE_NAMES.filter(function(name){return used.indexOf(name)<0});return pk(pool.length?pool:PEOPLE_NAMES,'family')}
function normalizeChildProfile(c){
 if(!c)return c;var h=H(String(game.seed||1)+':child-profile:'+String(c.id||c.name||'child')),temperaments=['Audacieux','Curieux','Discipliné','Empathique','Indépendant'],vocations=['Combat','Navigation','Médecine','Science','Commerce','Commandement'],styles=['Équilibré','Corps-à-corps','Sabreur','Tireur','Mobile / esquive'];c.temperament=c.temperament||temperaments[h%temperaments.length];c.vocation=c.vocation||vocations[(h>>>4)%vocations.length];c.preferredStyle=c.preferredStyle||styles[(h>>>8)%styles.length];c.development=cl(c.development==null?0:c.development,0,100);c.legacyAwareness=cl(c.legacyAwareness==null?0:c.legacyAwareness,0,100);c.milestones=Array.isArray(c.milestones)?c.milestones.slice(-6):[];return c
}
function childDevelopmentTick(c,m){
 c=normalizeChildProfile(c);if(!c||c.status!=='active')return c;var years=(c.ageMonths||0)/12,bond=c.bond==null?60:c.bond,environment=cl((bond-45)/90+.45,0,1.2),rate=years<6?.18:years<12?.32:years<18?.48:.26;c.development=cl(c.development+m*rate*environment,0,100);var recognition=playerWorldRecognition().score||0;c.legacyAwareness=cl(c.legacyAwareness+m*(years>=8?.06:0)+recognition*.0007*m,0,100);
 function milestone(id,text){if(c.milestones.indexOf(id)>=0)return;c.milestones.push(id);c.milestones=c.milestones.slice(-6);tl('Nouvelle génération — '+c.name,text,'story')}
 if(years>=6)milestone('temperament',c.name+' affirme un tempérament '+c.temperament.toLowerCase()+'.');
 if(years>=12)milestone('vocation',c.name+' commence à montrer une attirance pour '+c.vocation.toLowerCase()+'.');
 if(years>=15)milestone('style',c.name+' développe naturellement une préférence pour le style '+c.preferredStyle.toLowerCase()+'.');
 if(years>=18)milestone('adult',c.name+' atteint l’âge adulte avec sa propre trajectoire déjà en formation.');
 return c
}

function createRelation(role){
 var p=game.player,i=game.socialSeq++,name=pk(PEOPLE_NAMES,'r'),tries=0,years=p.ageMonths/12,roles=years<6?['proche de la famille','connaissance']:years<12?['ami','rival','connaissance']:years<15?['ami','rival','connaissance','mentor']:['ami','rival','mentor','collègue','connaissance'];
 while(game.relations.some(function(r){return r.name===name})&&tries++<12)name=pk(PEOPLE_NAMES,'r');
 var chosen=role||pk(roles,'r');if(years<6&&(chosen==='rival'||chosen==='mentor'||chosen==='collègue'))chosen='connaissance';else if(years<12&&(chosen==='mentor'||chosen==='collègue'))chosen='connaissance';if(years<15&&chosen==='collègue')chosen='connaissance';
 var faction=years<15&&chosen!=='mentor'?'Civil':pk([p.faction,'Civil','Marine','Pirates'],'r'),r=normalizeRelation(game,{id:'rel-'+i+'-'+Math.floor(R('r')*99999),name:name,role:chosen,faction:faction,location:p.island,monthsKnown:0},i);
 if(years<12&&['ami','rival','connaissance'].indexOf(r.role)>=0)r.npcAgeMonths=cl(p.ageMonths-24+R('r')*48,Math.max(0,p.ageMonths-30),p.ageMonths+30);
 if(r.role==='rival'){var span=years<12?24:48;r.npcAgeMonths=cl(p.ageMonths-span/2+R('r')*span,Math.max(0,p.ageMonths-span),p.ageMonths+span);r.rivalry=45+R('r')*35;r.affection*=.7}
 if(r.role==='mentor'){r.npcAgeMonths=Math.max(216,p.ageMonths+48+R('r')*120);r.respect=Math.max(r.respect,62);r.trust=Math.max(r.trust,50);r.npcPower=Math.max(r.npcPower,cl(power()+10+R('r')*18,20,92));r.npcPotential=Math.max(r.npcPotential,r.npcPower+4)}
 game.relations.push(r);return r
}
function netWorth(){
 var p=game.player,a=p.life.assets||{},debt=Math.max(0,p.life&&p.life.debt||0);return Math.round(Math.max(0,p.money)+(a.property||0)+(a.business||0)+(a.ship||0)+(a.treasure||0)+cargoBookValue()-debt)
}
function livingCostPerMonth(){
 var p=game.player;if(p.ageMonths<180)return 0;var h=HOUSING[p.life.housingLevel||0]||HOUSING[0],dependentChildren=(p.children||[]).filter(function(c){return c.status==='active'&&(c.ageMonths||0)<216}).length,base=h.monthly+dependentChildren*850;
 if(partnerRelation())base+=350;return Math.round(base)
}
function businessIncomePerMonth(){var p=game.player,asset=(p.life.assets||{}).business||0;if(!asset)return 0;var rp=game.world.pressures[p.region]||{},m=game.world.markets&&game.world.markets[p.island],mult=.72+(rp.Prospérité==null?50:rp.Prospérité)/180;if(m&&m.blockade)mult*=.58;return Math.round(asset*.008*mult)}
function chargeMoney(amount){var p=game.player,l=p.life;amount=Math.max(0,amount||0);var paid=Math.min(Math.max(0,p.money),amount);p.money-=paid;var missing=amount-paid;if(missing>0){l.debt=Math.max(0,(l.debt||0)+missing);l.debtPeak=Math.max(l.debtPeak||0,l.debt)}return{paid:paid,debt:missing}}
function serviceDebt(){var p=game.player,l=p.life,debt=Math.max(0,l.debt||0);if(!debt||p.money<=0)return 0;var pay=Math.min(debt,p.money*.22);p.money-=pay;l.debt-=pay;return pay}
function useSocialAction(){
 var l=game.player.life;if((l.socialActions||0)<1){toast('Tu as déjà consacré assez de temps à ta vie sociale pendant cette période.');return false}
 l.socialActions--;return true
}
function spendTime(id){
 var r=relationById(id),p=game.player;if(!r||r.status!=='active')return;if(!npcNearby(r))return toast(r.name+' n’est pas assez proche pour passer du temps ensemble.');if(!useSocialAction())return;
 var cost=p.ageMonths>=180?300+Math.round(R('life')*700):0;if(p.money<cost)return toast('Tu n’as pas assez de Berry pour cette sortie.');
 p.money-=cost;r.affection=cl(r.affection+2+R('life')*5,0,100);r.trust=cl(r.trust+1+R('life')*4,0,100);r.respect=cl(r.respect+R('life')*2,0,100);if(p.ageMonths>=216)r.attraction=cl(r.attraction+R('life')*3,0,100);addRelationMemory(r,'Vous passez du temps ensemble à '+p.island+'.','social');
 tl('Temps partagé','Tu passes du temps avec '+r.name+'.');save();renderRel();renderChar()
}
function pursueRomance(id){
 var p=game.player,r=relationById(id);if(!r||p.ageMonths<216||r.npcAgeMonths<216)return toast('La romance est réservée aux personnages adultes.');if(!npcNearby(r))return toast('Cette personne doit être présente dans ta région pour faire évoluer ce lien.');if(p.life.partnerId)return toast('Tu es déjà engagé dans une relation.');if(!useSocialAction())return;
 migrateLifeDirector(p).lastRomanceAge=p.ageMonths;var score=r.affection*.35+r.trust*.25+r.attraction*.4,ch=cl((score-32)/70,.08,.92);
 if(R('life')<ch){p.life.partnerId=r.id;p.life.relationshipStatus='En couple';r.type='partner';r.role='partenaire';r.relationshipMonths=0;r.affection=cl(r.affection+8,0,100);r.trust=cl(r.trust+6,0,100);signalPersonalChapter('relationship','Lien avec '+r.name,18,'manual-relationship:'+r.id,r.id);tl('Nouvelle relation',r.name+' et toi commencez une relation.','major')}
 else{r.attraction=cl(r.attraction-6,0,100);r.trust=cl(r.trust-2,0,100);tl('Sentiments non partagés',r.name+' ne souhaite pas aller plus loin.')}
 save();render()
}
function marryPartner(){
 var p=game.player,r=partnerRelation();if(!r||p.life.relationshipStatus!=='En couple')return toast('Aucun partenaire avec qui se marier.');if(!npcNearby(r))return toast('Vous devez être réunis pour vous marier.');if(r.relationshipMonths<12||r.trust<62||r.affection<65)return toast('Votre relation n’est pas encore assez solide.');
 if(!useSocialAction())return;var fd=migrateLifeDirector(p);fd.lastFamilyAge=p.ageMonths;fd.familyAutoPaused=false;fd.familyPausedRelationId=null;fd.familyDeferredUntil=0;fd.familyDeferrals=0;p.life.relationshipStatus='Marié';r.role='conjoint';r.loyalty=cl(r.loyalty+10,0,100);r.trust=cl(r.trust+7,0,100);signalPersonalChapter('family','Foyer avec '+r.name,22,'manual-marriage:'+r.id,r.id);tl('Mariage','Tu épouses '+r.name+'.','major');checkAchievements();save();render()
}
function breakup(){
 var p=game.player,r=partnerRelation();if(!r)return;decision('Mettre fin à la relation','Rompre avec '+r.name+' aura des conséquences sur votre relation.',[
  ['Se séparer','Mettre fin au couple.',function(){r.role='ex-partenaire';r.type='social';r.affection=cl(r.affection-22,0,100);r.trust=cl(r.trust-30,0,100);r.rivalry=cl(r.rivalry+8,0,100);p.life.partnerId=null;p.life.relationshipStatus='Célibataire';migrateLifeDirector(p).lastRomanceAge=p.ageMonths;signalPersonalChapter('relationship','Lien avec '+r.name,18,'separation:'+r.id,r.id);tl('Séparation','Ta relation avec '+r.name+' prend fin.','major')}],
  ['Rester ensemble','Ne rien changer.',function(){}]
 ])}
function welcomeChild(){
 var p=game.player,r=partnerRelation();if(!r||p.ageMonths<216)return toast('Il faut être adulte et en couple.');if(!npcNearby(r))return toast('Vous devez être réunis pour accueillir un enfant.');if(r.trust<50||r.affection<55)return toast('Votre relation n’est pas assez stable.');if((p.children||[]).filter(function(c){return c.status==='active'}).length>=5)return toast('Ta famille est déjà très nombreuse.');if(!useSocialAction())return;
 var i=p.children.length,name=familyChildName(),child=normalizeChildProfile({id:'child-'+game.dynasty.generation+'-'+Math.floor(R('family')*999999)+'-'+i,name:name,ageMonths:0,birthplace:p.island,birthRegion:p.region,race:p.race,status:'active',bond:55+R('family')*30});
 p.children.push(child);p.money-=Math.min(p.money,2500);var fd=migrateLifeDirector(p);fd.lastFamilyAge=p.ageMonths;fd.familyAutoPaused=false;fd.familyPausedRelationId=null;fd.familyDeferredUntil=0;fd.familyDeferrals=0;signalPersonalChapter('family','Foyer avec '+r.name,24,'manual-child:'+child.id,r.id);tl('Nouvelle génération',name+' rejoint ta famille à '+p.island+'.','major');checkAchievements();save();render()
}
function upgradeHousing(){
 var p=game.player;if(p.ageMonths<216)return toast('Tu dois être adulte pour acheter un logement.');var l=p.life,n=(l.housingLevel||0)+1;if(n>=HOUSING.length)return toast('Tu possèdes déjà le meilleur logement disponible.');var h=HOUSING[n];if(p.money<h.buy)return toast('Il te faut '+h.buy.toLocaleString('fr-FR')+' B.');
 p.money-=h.buy;l.housingLevel=n;l.assets.property=Math.max(l.assets.property||0,h.asset);tl('Nouveau logement','Tu t’installes dans : '+h.name+'.','major');save();renderChar()
}
function investBusiness(){
 var p=game.player;if(p.ageMonths<216)return toast('Tu dois être adulte pour investir.');var l=p.life,cost=50000;if(p.money<cost)return toast('Il te faut 50 000 B pour investir.');if((l.assets.business||0)>=240000)return toast('Ton activité commerciale est déjà très développée.');
 p.money-=cost;l.assets.business=(l.assets.business||0)+40000;tl('Investissement','Tu investis dans une activité commerciale locale.','major');save();renderChar()
}
function achievementCondition(id){
 var p=game.player,w=game.world,nw=netWorth();
 if(id==='voyage')return p.visited.length>=2;if(id==='grandline')return p.visited.some(function(x){return infStatic(x).region==='Grand Line'});
 if(id==='newworld')return p.visited.some(function(x){return infStatic(x).region==='New World'});if(id==='haki')return Object.keys(p.haki).some(function(k){return p.haki[k]>0});
 if(id==='fruit')return !!p.fruit;if(id==='family')return p.children.length>0;if(id==='marriage')return p.life.relationshipStatus==='Marié';if(id==='wealth')return nw>=1000000;
 if(id==='veteran')return p.wins>=20;if(id==='bounty')return p.highestBounty>=100000000;if(id==='social')return game.relations.length>=8;
 if(id==='divergence')return w.divergence>=10;if(id==='longevity')return p.ageMonths>=720;if(id==='legacy')return game.dynasty.generation>=2;if(id==='commander')return p.organization&&p.organization.authority==='leader'&&p.organization.members.filter(function(m){return m.status==='active'}).length>=6;if(id==='flagship')return p.organization&&p.organization.ship&&(p.organization.ship.tier||0)>=2;if(id==='escape')return p.justice&&p.justice.escapes>=1;if(id==='hunter')return p.justice&&p.justice.captures>=5;if(id==='domain')return p.influence&&p.influence.domains.length>=1;if(id==='regional-power')return p.influence&&p.influence.domains.length>=3;if(id==='fleet')return p.influence&&p.influence.affiliates.length>=3;if(id==='emperor')return p.influence&&p.influence.recognizedTitle==='Empereur des mers';if(id==='campaign')return p.strategy&&p.strategy.campaignsLed>=1;if(id==='strategist')return p.strategy&&p.strategy.warsWon>=3;if(id==='merchant')return p.trade&&p.trade.profit>=100000;if(id==='smuggler')return p.trade&&p.trade.smugglingRuns>=3;if(id==='mentor-bond')return game.relations.some(function(r){return r.mentorSessions>=5});if(id==='nemesis')return game.relations.some(function(r){return (r.rivalWins+r.rivalLosses)>=5});if(id==='known-recruit')return game.relations.some(function(r){return r.joinedOrganization});if(id==='explorer')return p.visited.length>=10;if(id==='discoverer')return p.exploration&&p.exploration.totalDiscoveries>=10;if(id==='cartographer')return p.exploration&&Object.keys(p.exploration.sites||{}).filter(function(n){return p.exploration.sites[n].familiarity>=85}).length>=3;if(id==='story-first')return game.story&&game.story.stats.resolved>=1;if(id==='story-weaver')return game.story&&game.story.stats.resolved>=10;if(id==='story-decisions')return game.story&&game.story.stats.choices>=15;return false
}
function checkAchievements(silent){
 var u=game.achievements.unlocked;ACHIEVEMENTS.forEach(function(a){if(!u[a.id]&&achievementCondition(a.id)){u[a.id]={age:age(),generation:game.dynasty.generation};if(!silent){tl('Achievement : '+a.name,a.desc,'major');recordSignatureMoment('Accomplissement — '+a.name,a.desc,'achievement',['emperor','legacy','nemesis','regional-power','story-weaver'].indexOf(a.id)>=0?90:68)}}});saveMeta()
}
function lifeTick(m){
 var p=game.player,l=p.life;l.socialActions=2;npcTick(m);
 (p.children||[]).forEach(function(c){if(c.status==='active'){c.ageMonths+=m;c.bond=cl((c.bond==null?60:c.bond)+(R('family')-.48)*m*.45,0,100);childDevelopmentTick(c,m)}});
 game.relations.forEach(function(r){if(r.status!=='active')return;r.monthsKnown+=m;if(r.id===l.partnerId){r.relationshipMonths+=m;if(r.relationshipMonths>=12&&r.relationshipMilestones.indexOf('established')<0){r.relationshipMilestones.push('established');addRelationMemory(r,'Votre relation franchit une année et devient un lien durable.','relationship');signalPersonalChapter('relationship','Lien avec '+r.name,12,'relationship-established:'+r.id,r.id)}if(r.longDistance){r.affection=cl(r.affection-m*.10,0,100);r.trust=cl(r.trust-m*.04,0,100);r.loyalty=cl(r.loyalty+(R('life')-.5)*m*.16,0,100)}else{r.affection=cl(r.affection+(R('life')-.42)*m*.9,0,100);r.trust=cl(r.trust+(R('life')-.44)*m*.7,0,100);r.loyalty=cl(r.loyalty+(R('life')-.45)*m*.5,0,100)}}else{var near=!r.location||r.location===p.island;r.affection=cl(r.affection+(near?(R('life')-.49)*m*.35:-m*.08),0,100);r.trust=cl(r.trust+(R('life')-.5)*m*.2,0,100)}});
 if(p.ageMonths>=180){var cost=livingCostPerMonth()*m,income=businessIncomePerMonth()*m;p.money+=income;l.totalBusinessIncome+=income;chargeMoney(cost);serviceDebt();l.livingCostsPaid+=cost;l.lastExpense=cost;if((l.debt||0)>0){var interest=(l.debt||0)*.006*m;l.debt+=interest;l.debtInterestPaid+=interest;l.debtPeak=Math.max(l.debtPeak||0,l.debt);p.energy=cl(p.energy-m*cl(.35+l.debt/180000,.35,2.1),0,100)}}
 var nw=netWorth();l.netWorthPeak=Math.max(l.netWorthPeak||0,nw);
 var partner=partnerRelation();if(partner&&R('life')<.018*m){if(R('life')<.66){partner.affection=cl(partner.affection+4,0,100);partner.trust=cl(partner.trust+3,0,100);tl('Moment important','Ta relation avec '+partner.name+' se renforce.')}else{partner.affection=cl(partner.affection-6,0,100);partner.trust=cl(partner.trust-5,0,100);tl('Tension dans le couple','Un désaccord fragilise ta relation avec '+partner.name+'.')}}if(partner&&partner.affection<12&&partner.trust<12){signalPersonalChapter('relationship','Lien avec '+partner.name,18,'separation:auto:'+partner.id,partner.id);partner.role='ex-partenaire';partner.type='social';l.partnerId=null;l.relationshipStatus='Célibataire';migrateLifeDirector(p).lastRomanceAge=p.ageMonths;tl('Rupture',partner.name+' met fin à votre relation après une longue dégradation.','major')}
 var years=p.ageMonths/12;if(years>55){p.health=cl(p.health-m*(years-55)/70,0,100);if(years>72&&R('life')<Math.pow((years-70)/35,2)*.006*m){die('Décès naturel à '+Math.floor(years)+' ans.');return}}
}
function estateValue(){return Math.max(0,netWorth())}
function lifeChronicle(p){
 p=p||game.player;var d=migrateLifeDirector(p),r=playerWorldRecognition(),partner=partnerRelation(),pastPartner=partner?null:(game.relations||[]).filter(function(x){return x&&x.status==='dead'&&(x.type==='partner'||x.role==='partenaire')&&(x.relationshipMonths||0)>=12}).sort(function(a,b){return(b.relationshipMonths||0)-(a.relationshipMonths||0)||(b.trust||0)-(a.trust||0)})[0]||null,storyPartner=partner||pastPartner,allKids=p.children||[],kids=allKids.filter(function(x){return x.status==='active'}),org=p.organization,orgMembers=org&&Array.isArray(org.members)?org.members.filter(function(x){return x.status==='active'}).length:0,meaningfulOrg=!!(org&&((org.authority==='leader'&&(org.renown||0)>=25)||(org.renown||0)>=40||orgMembers>=6)),orgHistory=(p.organizationHistory||[]).filter(function(x){var months=x.months||0,successes=x.successes||0,renown=x.renown||0,members=x.members||0,leader=x.authority==='leader'||x.role==='Chef';return renown>=30||(months>=60&&successes>=8)||(leader&&months>=36&&successes>=6)||(members>=6&&months>=24)}).map(function(x){return{entry:x,score:(x.renown||0)*1.4+Math.min(120,x.months||0)*.25+(x.successes||0)*1.8+((x.authority==='leader'||x.role==='Chef')?15:0)+(x.members||0)*2}}).sort(function(a,b){return b.score-a.score}),currentOrgScore=meaningfulOrg?((org.renown||0)*1.4+Math.min(120,org.months||0)*.25+(org.successes||0)*1.8+(org.authority==='leader'?15:0)+orgMembers*2):-1,bestArchivedOrg=orgHistory[0]||null,chronicleOrg=bestArchivedOrg&&bestArchivedOrg.score>currentOrgScore?bestArchivedOrg.entry:(meaningfulOrg?org:null),chronicleOrgHistorical=chronicleOrg&&chronicleOrg!==org,chronicleOrgMembers=chronicleOrgHistorical?(chronicleOrg.members||0):orgMembers,chronicleOrgAuthority=chronicleOrgHistorical?(chronicleOrg.authority||((chronicleOrg.role==='Chef')?'leader':'member')):(chronicleOrg&&chronicleOrg.authority||'member'),chapters=[].concat(d.chapterHistory||[],d.activeChapters||[]).filter(function(x){return(x.beats||0)>=2&&(x.score||0)>=20}).sort(function(a,b){return(b.score||0)-(a.score||0)}).slice(0,4),moments=(game.loop&&game.loop.signatureMoments||[]).slice().sort(function(a,b){return(b.importance||b.weight||0)-(a.importance||a.weight||0)}).slice(0,6),ws=game.world&&game.world.worldState||{},sagas=[].concat(ws.sagaHistory||[],ws.worldSagas||[]).filter(function(x){return x.playerInvolved&&sagaPlayerRoleRank(x.playerRole||'present')>=3}).sort(function(a,b){return(sagaPlayerRoleRank(b.playerRole||'present')*100+(b.playerImpact||0))-(sagaPlayerRoleRank(a.playerRole||'present')*100+(a.playerImpact||0))}),rivals=(game.relations||[]).filter(function(x){return x&&(x.nemesisRecognized||x.role==='rival')}).sort(function(a,b){var as=(a.nemesisRecognized?45:0)+(a.rivalry||0)+((a.rivalWins||0)+(a.rivalLosses||0))*4,bs=(b.nemesisRecognized?45:0)+(b.rivalry||0)+((b.rivalWins||0)+(b.rivalLosses||0))*4;return bs-as}),visited=p.visited||[],relocations=(p.careerHistory||[]).filter(function(x){return x.type==='relocation'&&x.to}).map(function(x){return x.to}),journeyCandidates=[],parts=[],highlights=[];
 function addJourney(name){if(name&&journeyCandidates.indexOf(name)<0)journeyCandidates.push(name)}
 function addPart(kind,title,text){if(!text||parts.length>=8)return;parts.push(text);highlights.push({kind:kind,title:title||text})}
 if(visited.length){
  addJourney(visited[0]);relocations.slice(-2).forEach(addJourney);
  var grand=visited.find(function(x){var z=infStatic(x);return z&&z.region==='Grand Line'}),nw=visited.find(function(x){var z=infStatic(x);return z&&z.region==='New World'});addJourney(grand);addJourney(nw);addJourney(visited[visited.length-1])
 }
 if(journeyCandidates.length>4)journeyCandidates=[journeyCandidates[0]].concat(journeyCandidates.slice(-3));
 var careerRecords=p.careerRecords||{},previousCareers=Object.keys(careerRecords).filter(function(f){if(f===p.faction)return false;var cr=careerRecords[f]||{},missions=(cr.successes||0)+(cr.failures||0);return(cr.months||0)>=24||missions>=6||(cr.distinctions||0)>=2}).map(function(f){var cr=careerRecords[f]||{};return{faction:f,label:CAREERS[f]?CAREERS[f].label:f,rank:cr.rank||'',months:cr.months||0,importance:(cr.months||0)+((cr.distinctions||0)*18)+(((cr.successes||0)+(cr.failures||0))*2)}}).sort(function(a,b){return b.importance-a.importance}).slice(0,2);
 var currentCareerRecord=careerRecords[p.faction]||null,careerLabel=p.career==='Aucune'?'Une vie indépendante':(CAREERS[p.faction]?CAREERS[p.faction].label:p.faction)+' au rang de '+(p.rank||'sans rang');
 if(previousCareers.length){var previousText=previousCareers.map(function(x){var years=Math.max(1,Math.round((x.months||0)/12));return x.label+(x.rank?' ('+x.rank+')':'')+' pendant '+years+' an'+(years>1?'s':'')}).join(', puis ');careerLabel='Parcours professionnel : '+previousText+', puis '+careerLabel}
 addPart('career',p.rank||p.career,careerLabel+(p.career!=='Aucune'&&currentCareerRecord&&currentCareerRecord.retired?', devenue une vie de vétéran':'')+', avec une reconnaissance de '+r.role.toLowerCase()+'.');
 if(chronicleOrg){var orgName=chronicleOrg.name||chronicleOrg.kind||'son organisation',orgYears=Math.max(1,Math.round((chronicleOrg.months||0)/12));addPart('organization',orgName,chronicleOrgHistorical?('Organisation marquante : '+orgName+' a compté pendant '+orgYears+' an'+(orgYears>1?'s':'')+' de cette trajectoire.'):((chronicleOrgAuthority==='leader'?'À la tête de ':'Membre marquant de ')+orgName+(chronicleOrgMembers?' avec '+chronicleOrgMembers+' membres actifs':'')+'.'))}
 if(visited.length>1)addPart('journey',journeyCandidates[journeyCandidates.length-1]||'Voyages','Parcours marquant : '+journeyCandidates.join(' → ')+(visited.length>journeyCandidates.length?' ('+visited.length+' lieux au total).':'.'));
 if(storyPartner||allKids.length){var familyText=partner?'Une vie partagée avec '+partner.name+'. ':pastPartner?(pastPartner.name+' a partagé une part importante de cette vie. '):'';if(allKids.length){if(kids.length)familyText+=allKids.length+' enfant'+(allKids.length>1?'s':'')+' laisse'+(allKids.length>1?'nt':'')+' une continuité familiale.';else familyText+=allKids.length+' enfant'+(allKids.length>1?'s ont':' a')+' marqué cette vie.'}addPart('family',storyPartner?storyPartner.name:'Famille',familyText)}
 var rival=rivals[0]||null,rivalScore=rival?((rival.nemesisRecognized?45:0)+(rival.rivalry||0)+((rival.rivalWins||0)+(rival.rivalLosses||0))*4):0;
 if(rival&&rivalScore>=70)addPart('rivalry',rival.name,'Rivalité majeure : '+rival.name+' a marqué durablement cette trajectoire.');
 var saga=sagas[0]||null;if(saga)addPart('saga',saga.title,'Saga mondiale : '+saga.title+' • '+(saga.playerRole==='responsible'?'rôle déterminant':'rôle décisif')+'.');
 var choiceMarks=[],choiceSeen={};(d.history||[]).slice().reverse().forEach(function(x){if(choiceMarks.length>=2||!x||!x.data||!x.data.declined)return;var key=x.kind||'life';if(choiceSeen[key])return;choiceSeen[key]=1;var title=key==='mobility'?'Mutation refusée':key==='relationship'?'Amitié préservée':key==='family'?'Projet familial repoussé':key==='career-turn'?'Cap professionnel maintenu':'Choix assumé';choiceMarks.push({title:title,text:x.text||title})});choiceMarks.forEach(function(x){addPart('choice',x.title,'Choix structurant : '+x.text+'.')});
 if(chapters.length&&!highlights.some(function(h){return h.title===chapters[0].title}))addPart('chapter',chapters[0].title,'Chapitre marquant : '+chapters[0].title+'.');
 var moment=moments.find(function(x){return !highlights.some(function(h){return h.title===x.title||(x.kind==='life-chapter'&&h.kind==='chapter'&&x.title==='Chapitre — '+h.title)||(x.kind==='rivalry'&&h.kind==='rivalry')||(x.kind==='legend'&&h.kind==='career')})});if(moment)addPart(moment.kind||'moment',moment.title,'Souvenir majeur : '+moment.title+'.');
 return{headline:r.role,summary:parts.join(' '),highlights:highlights.slice(0,8),chapters:chapters.map(function(x){return{title:x.title,kind:x.kind||'',score:Math.round(x.score||0),beats:x.beats||0}}),moments:moments.slice(0,3).map(function(x){return{title:x.title,kind:x.kind||'',importance:Math.round(x.importance||x.weight||0)}}),visitedCount:visited.length,partner:partner?partner.name:null,pastPartner:pastPartner?pastPartner.name:null,children:kids.length,childrenTotal:allKids.length,organization:chronicleOrg?{name:chronicleOrg.name||chronicleOrg.kind||'',authority:chronicleOrgAuthority||'',members:chronicleOrgMembers,renown:Math.round(chronicleOrg.renown||0),historical:!!chronicleOrgHistorical}:null,recognitionScore:r.score}
}
function generationLegacySnapshot(p){
 p=p||game.player;var d=migrateLifeDirector(p),recognition=playerWorldRecognition(),chronicle=lifeChronicle(p),signatures=(game.loop&&game.loop.signatureMoments||[]).slice().sort(function(a,b){return(b.importance||b.weight||0)-(a.importance||a.weight||0)||(b.id||0)-(a.id||0)}).slice(0,6).map(function(x){return{title:x.title,kind:x.kind||'',importance:Math.round(x.importance||x.weight||0)}}),chapters=(d.chapterHistory||[]).filter(function(x){return(x.beats||0)>=2&&(x.score||0)>=28}).slice().sort(function(a,b){return(b.score||0)-(a.score||0)||(b.beats||0)-(a.beats||0)||(b.lastAge||0)-(a.lastAge||0)}).slice(0,6).map(function(x){return{title:x.title,kind:x.kind,score:Math.round(x.score||0),beats:x.beats||0}}),active=(d.activeChapters||[]).filter(function(x){return(x.beats||0)>=2&&(x.score||0)>=28}).slice().sort(function(a,b){return(b.score||0)-(a.score||0)||(b.beats||0)-(a.beats||0)||(b.lastAge||0)-(a.lastAge||0)}).slice(0,3).map(function(x){return{title:x.title,kind:x.kind,score:Math.round(x.score||0),beats:x.beats||0}});
 return{worldRole:recognition.role,recognitionScore:recognition.score,chronicle:chronicle.summary,visited:(p.visited||[]).slice(-12),visitedCount:(p.visited||[]).length,chapters:chapters,activeChapters:active,signatureMoments:signatures,organization:chronicle.organization?{name:chronicle.organization.name||'',authority:chronicle.organization.authority||'',renown:Math.round(chronicle.organization.renown||0)}:null,domains:(p.influence&&p.influence.domains||[]).length,children:(p.children||[]).filter(function(x){return x.status==='active'}).length,childrenTotal:(p.children||[]).length}
}
function legacyRelationImportance(r){
 var score=0,mem=(r.memories||[]).length;
 if(r.canonical)score+=70;
 if(r.nemesisRecognized)score+=60;
 if(r.role==='mentor')score+=48;
 if(r.role==='rival')score+=42;
 if(r.peerRecognized)score+=12;
 score+=Math.min(18,mem*3);
 score+=Math.max(r.trust||0,r.loyalty||0)*.18+(r.respect||0)*.10+(r.rivalry||0)*.12+Math.min(10,(r.monthsKnown||0)/24);
 return score
}
function buildHeir(child){
 var old=game.player,partner=partnerRelation(),legacyRelations=game.relations.filter(function(r){return r.status==='active'&&(!partner||r.id!==partner.id)&&(r.canonical||r.role==='mentor'||r.role==='rival'||r.nemesisRecognized||r.trust>=75||r.loyalty>=75)}).slice().sort(function(a,b){return legacyRelationImportance(b)-legacyRelationImportance(a)}).slice(0,10).map(function(r){return JSON.parse(JSON.stringify(r))}),estate=estateValue(),validChildren=(old.children||[]).filter(function(c){return c.status==='active'}),heirs=Math.max(1,validChildren.length+(partner?1:0)),share=Math.round(estate/heirs),legacy=generationLegacySnapshot(old),ancestor={name:old.name,age:age(),career:old.career,rank:old.rank,cause:game.death?game.death.cause:'',estate:estate,bounty:old.highestBounty,generation:game.dynasty.generation,legacy:legacy};
 game.dynasty.ancestors.push(ancestor);game.dynasty.ancestors=game.dynasty.ancestors.slice(-20);game.dynasty.generation++;
 var parentCaps=old.caps||{},p={name:child.name,difficulty:old.difficulty,ageMonths:child.ageMonths,race:child.race||old.race,origin:child.birthRegion||old.origin,region:old.region,island:old.island,situation:child.ageMonths<180?'Enfance':'Nouvelle génération',activity:child.ageMonths<72?'Grandir':'Routine',focus:child.ageMonths<72?'Grandir':'Auto',faction:'Civil',career:'Aucune',rank:child.ageMonths<180?'Enfant':'Sans carrière',money:share,health:100,energy:100,danger:'Faible',conditions:[],bounty:0,highestBounty:0,reputation:Math.round(old.reputation*.12),ambition:child.vocation==='Navigation'?'Explorer le monde':child.vocation==='Commerce'?'Faire fortune':child.vocation==='Commandement'?'Servir sa faction':child.vocation==='Combat'?'Devenir plus fort':'Survivre',wins:0,losses:0,travel:null,visited:[old.island],style:(normalizeChildProfile(child).preferredStyle||pk(['Équilibré','Corps-à-corps','Sabreur','Tireur','Mobile / esquive'],'heir')),fruit:null,heldFruit:null,fruitMastery:0,fruitAwakened:false,techniques:[],techniqueMastery:{},combatXP:0,hakiApplications:{Observation:[],Armement:[],Conquérant:[]},haki:{Observation:0,Armement:0,Conquérant:0},latent:{Observation:20+R('heir')*60,Armement:20+R('heir')*60,Conquérant:R('heir')<.04?90:0},stats:{},skills:{},caps:{},factionRep:{Civil:10,Marine:0,Pirates:0,'Chasseur de primes':0,Révolutionnaires:0,Gouvernement:0},careerRecords:{},specialization:null,careerHistory:[],salaryTotal:0,deserterFrom:[],organization:null,organizationHistory:[],justice:defaultJustice(),influence:defaultInfluence(),strategy:defaultStrategy(),trade:defaultTrade(),exploration:defaultExploration(),life:defaultLife(),children:[]};
 ST.forEach(function(k){var inherited=parentCaps[k]||75,dev=(child.development||0)/100;p.caps[k]=cl(inherited*.55+40+R('heir')*15+dev*2,55,98);p.stats[k]=cl(7+Math.min(25,child.ageMonths/24)+R('heir')*5+dev*2,5,p.caps[k])});
 SK.forEach(function(k){var inherited=parentCaps[k]||75;p.caps[k]=cl(inherited*.5+42+R('heir')*14,55,98);p.skills[k]=cl(2+Math.min(18,child.ageMonths/36)+R('heir')*4,1,p.caps[k])});p.naturalCaps={};p.absoluteCaps={};ST.concat(SK).forEach(function(k){p.naturalCaps[k]=p.caps[k];p.absoluteCaps[k]=cl(p.caps[k]+5+(H(String(game.seed)+':heir:'+game.dynasty.generation+':'+k)%8),p.caps[k],100)});p.progression=defaultProgression(p);
 game.player=p;game.alive=true;game.death=null;game.pending=null;game.mission=null;game.lastCombat=null;game.timeline=[];game.relations=[];game.loop=defaultLifeLoop();game.story=defaultStoryEngine();
 if(partner){var parentLocation=partner.location||old.island,parentRegion=partner.region||(parentLocation&&PL[parentLocation]?PL[parentLocation][0]:old.region);game.relations.push(normalizeRelation(game,{name:partner.name,role:'parent',type:'family',affection:Math.max(65,partner.affection),trust:Math.max(60,partner.trust),respect:Math.max(65,partner.respect||0),loyalty:Math.max(70,partner.loyalty||0),attraction:0,location:parentLocation,region:parentRegion,faction:partner.faction,canonical:!!partner.canonical,actorName:partner.actorName||null,npcAgeMonths:partner.npcAgeMonths,npcPower:partner.npcPower,npcPotential:partner.npcPotential,npcSpecialty:partner.npcSpecialty,npcTrajectory:partner.npcTrajectory,npcAmbition:partner.npcAmbition,npcWealth:partner.npcWealth,careerLevel:partner.careerLevel,npcWins:partner.npcWins,npcLosses:partner.npcLosses,memories:(partner.memories||[]).slice(0,10)},0))}
 validChildren.filter(function(c){return c.id!==child.id}).forEach(function(c,i){game.relations.push(normalizeRelation(game,{name:c.name,role:'frère / sœur',type:'family',affection:55+(c.bond||0)*.3,trust:55,respect:45,loyalty:60,attraction:0,location:old.island,region:old.region,faction:'Civil',npcAgeMonths:c.ageMonths},i+1))});
 legacyRelations.forEach(function(r){if(partner&&r.name===partner.name)return;if(game.relations.some(function(x){return x.name===r.name}))return;var nr=normalizeRelation(game,{name:r.name,role:'relation de la famille',type:r.canonical?'canonical':'legacy',canonical:r.canonical,actorName:r.actorName,faction:r.faction,region:r.region,location:r.location,npcAgeMonths:r.npcAgeMonths,npcPower:r.npcPower,npcPotential:r.npcPotential,npcSpecialty:r.npcSpecialty,npcTrajectory:r.npcTrajectory,npcAmbition:r.npcAmbition,npcWealth:r.npcWealth,careerLevel:r.careerLevel,npcWins:r.npcWins,npcLosses:r.npcLosses,injuryMonths:r.injuryMonths,lastIntentOutcome:r.lastIntentOutcome,affection:cl(r.affection*.45,15,60),trust:cl(r.trust*.55,20,65),respect:cl(r.respect*.75,25,80),loyalty:cl(r.loyalty*.5,20,65),rivalry:r.role==='rival'?cl(r.rivalry*.35,10,45):0,attraction:0,memories:(r.memories||[]).slice(0,6)},game.relations.length);addRelationMemory(nr,'A connu ton parent '+old.name+' et se souvient de cette génération.','legacy');game.relations.push(nr)});
 game.socialSeq=game.relations.length;syncPowers();recordProgressSnapshot(true);tl('HÉRITAGE','Après la mort de '+old.name+', tu poursuis la vie de la famille en tant que '+child.name+'. Patrimoine reçu : '+share.toLocaleString('fr-FR')+' B.','major');checkAchievements();save();return game
}
function heirCandidates(){return(game.player.children||[]).filter(function(c){return c.status==='active'}).sort(function(a,b){return b.ageMonths-a.ageMonths||(b.bond||0)-(a.bond||0)})}
function continueWithHeir(id){if(typeof id!=='string')id=null;var kids=heirCandidates();if(!kids.length)return toast('Aucun héritier disponible.');var child=id?kids.find(function(c){return c.id===id}):kids[0];if(!child)return toast('Héritier indisponible.');buildHeir(child);$('#deathModal').classList.add('hidden');render()}

function decision(t,txt,ch){game.pending={title:t,text:txt,choices:ch};save();render();showDecision()}
function resolveDecisionChoice(i){if(!game.pending||!pendingIsExecutable(game.pending))return false;var pending=game.pending,c=pending.choices[+i];if(!c)return false;game.pending=null;$('#decisionModal').classList.add('hidden');c[2]();save();render();if(game.pending)showDecision();return true}
function showDecision(){if(!game.pending)return;if(!pendingIsExecutable(game.pending)){game.pending=null;save();render();toast('La décision incomplète a été réparée. Tu peux continuer.');return}$('#decisionTitle').textContent=game.pending.title;$('#decisionText').textContent=game.pending.text;$('#decisionChoices').innerHTML=game.pending.choices.map(function(c,i){return '<button class="choice-btn" data-c="'+i+'"><strong>'+e(c[0])+'</strong><small>'+e(c[1])+'</small></button>'}).join('');$$('[data-c]').forEach(function(b){b.onclick=function(){resolveDecisionChoice(+b.dataset.c)}});$('#decisionModal').classList.remove('hidden')}

var ORG_CONFIG={
 Civil:{kind:'Réseau professionnel',roles:['Associé','Médecin','Navigateur','Scientifique','Artisan','Cuisinier']},
 Marine:{kind:'Unité Marine',roles:['Combattant','Navigateur','Tireur','Médecin','Renseignement','Logistique']},
 Pirates:{kind:'Équipage pirate',roles:['Combattant','Navigateur','Tireur','Médecin','Cuisinier','Charpentier','Musicien','Quartier-maître']},
 'Chasseur de primes':{kind:'Groupe de chasse',roles:['Traqueur','Duelliste','Tireur','Investigateur','Médecin']},
 Révolutionnaires:{kind:'Cellule révolutionnaire',roles:['Combattant','Infiltration','Renseignement','Logistique','Médecin']},
 Gouvernement:{kind:'Équipe gouvernementale',roles:['Agent','Combat','Renseignement','Médecin','Logistique','Cipher Pol']}
};
var ORG_PREFIX=['Aube','Tempête','Sillage','Corail','Foudre','Brume','Étoile','Fer','Écume','Cendre','Horizon','Marée'];
var ORG_SUFFIX={Civil:['Atelier','Compagnie','Maison','Collectif'],Marine:['Escadre','Unité','Section','Détachement'],Pirates:['Corsaires','Drakes','Ravens','Mantas','Loups','Serpents'],'Chasseur de primes':['Traqueurs','Lames','Veilleurs','Chasseurs'],Révolutionnaires:['Flamme','Cellule','Front','Réseau'],Gouvernement:['Bureau','Section','Unité','Groupe']};
var SHIP_TIERS=[
 {name:'Sloop',capacity:4,cost:0,speed:0},
 {name:'Brigantin',capacity:8,cost:50000,speed:.07},
 {name:'Frégate',capacity:14,cost:150000,speed:.13},
 {name:'Galion',capacity:24,cost:400000,speed:.18}
];
function orgHash(g,key){return H(String(g.seed||1)+':org:'+key)}
function organizationAuthority(p){
 if(!p||p.career==='Aucune')return'none';var f=p.faction,i=rankIndex(),r=p.rank||'',o=p.organization;
 if(f==='Pirates'){var path=o&&o.pirateOrigin||p.pirateCrewPreference||'joined';if(path==='founded')return'leader';return i>=3?'officer':'member'}
 if(f==='Marine')return i>=5?'leader':i>=3?'officer':'member';
 if(f==='Révolutionnaires')return i>=3?'leader':i>=2?'officer':'member';
 if(f==='Gouvernement')return i>=3?'leader':i>=2?'officer':'member';
 if(f==='Chasseur de primes')return i>=3?'leader':i>=2?'officer':'member';
 if(f==='Civil')return i>=3?'leader':i>=2?'officer':'member';return'member'
}
function authorityLabel(a){return a==='leader'?'Chef':a==='officer'?'Officier':'Membre'}
function crewStandingLabel(v){v=cl(v||0,0,100);return v>=78?'Pilier du pavillon':v>=62?'Très influent':v>=45?'Reconnu':v>=28?'Établi':'Encore à prouver'}
function crewStandingRequirement(rank){return rank==='Officier'?42:rank==='Bras droit'?65:0}
function organizationMemberRelation(m,o){
 if(!m||!o||!game||!game.player)return null;var p=game.player,r=m.linkedRelationId?relationById(m.linkedRelationId):null;
 if(!r)r=(game.relations||[]).find(function(x){return x.status!=='dead'&&x.name===m.name&&x.joinedOrganization});
 if(!r){
  game.socialSeq=game.socialSeq||1;
  r=normalizeRelation(game,{id:'rel-crew-'+(game.socialSeq++)+'-'+(orgHash(game,o.id+':'+m.name)%99999),name:m.name,role:m.role==='Capitaine'?'capitaine de '+o.name:m.role==='Bras droit'?'bras droit de '+o.name:'membre de '+o.name,type:'organization',affection:42,trust:cl((m.loyalty||55)*.72,30,88),respect:cl(35+(m.power||20)*.38,35,88),loyalty:cl(m.loyalty==null?55:m.loyalty,0,100),attraction:10,location:p.island,faction:p.faction,npcPower:m.power||20},game.socialSeq);
  game.relations.push(r)
 }
 crewMemberTemperament(m,o);m.linkedRelationId=r.id;r.joinedOrganization=true;r.type='organization';r.faction=o.faction;r.location=p.island;r.region=p.region;r.npcPower=Math.max(r.npcPower||0,m.power||0);r.loyalty=cl((r.loyalty+(m.loyalty||r.loyalty))/2,0,100);
 if(m.role==='Capitaine')r.role='capitaine de '+o.name;else if(m.role==='Bras droit')r.role='bras droit de '+o.name;else if(String(r.role||'').indexOf(o.name)<0)r.role='membre de '+o.name;
 return r
}
function syncOrganizationMemberRelations(o){if(!o||!o.members)return;o.members.filter(function(m){return m.status==='active'}).forEach(function(m){organizationMemberRelation(m,o)})}
function joinedCrewStanding(o){
 var p=game.player;if(!o||o.faction!=='Pirates'||o.pirateOrigin!=='joined')return 100;var captain=(o.members||[]).find(function(m){return m.status==='active'&&m.role==='Capitaine'}),rel=captain&&captain.linkedRelationId?relationById(captain.linkedRelationId):null;
 var service=cl((o.months||0)/2,0,18),missions=cl((o.successes||0)*2.5-(o.failures||0),0,24),duty=cl((o.dutyCount||0)*2.2,0,18),cohesion=cl(o.cohesion||0,0,100)*.12,renown=cl(o.renown||0,0,100)*.08,rep=cl((p.factionRep.Pirates||0)+25,0,125)*.08,bond=rel?cl((rel.trust+rel.respect)/2,0,100)*.10:5,rankBonus=Math.min(5,rankIndex()*1.25);
 return cl(service+missions+duty+cohesion+renown+rep+bond+rankBonus,0,100)
}
function syncJoinedCrewRoster(o,c){
 if(!o||!c||o.pirateOrigin!=='joined')return o&&o.members||[];normalizeWorldCrew(c);var old=o.members||[],figures=[];
 if(c.leader&&c.leader.status==='active')figures.push({src:c.leader,role:'Capitaine'});
 if(c.second&&c.second.status==='active')figures.push({src:c.second,role:'Bras droit'});
 (c.notables||[]).filter(function(x){return x.status==='active'}).slice(0,2).forEach(function(x){figures.push({src:x,role:x.role||'Membre notable'})});
 var worldMembers=figures.slice(0,3).map(function(x,i){var m=old.find(function(y){return y.worldFigure&&y.name===x.src.name})||{id:'orgm-world-'+c.id+'-'+i,name:x.src.name,injuryMonths:0,status:'active',origin:c.region,worldFigure:true};m.name=x.src.name;m.role=x.role;m.power=cl(x.src.power==null?c.power:x.src.power,1,100);m.loyalty=cl(x.src.loyalty==null?62:x.src.loyalty,0,100);m.morale=cl(c.morale||58,0,100);m.months=x.src.tenureMonths||0;m.status='active';m.origin=c.region;m.worldFigure=true;organizationMemberRelation(m,o);return m});
 var locals=old.filter(function(m){return m.status==='active'&&!m.worldFigure}).slice(0,2);o.members=worldMembers.concat(locals);return o.members
}
function appointPirateFirstMate(id){
 var p=game.player,o=ensureOrganization();if(!o||p.faction!=='Pirates'||o.pirateOrigin!=='founded'||o.authority!=='leader')return toast('Seul le capitaine fondateur peut nommer son bras droit.');var m=o.members.find(function(x){return x.id===id&&x.status==='active'});if(!m)return toast('Ce membre n’est pas disponible.');if(o.firstMateId===id)return toast(m.name+' est déjà ton bras droit.');if(!useOrganizationAction())return;
 var old=o.members.find(function(x){return x.id===o.firstMateId&&x.status==='active'});if(old){old.role=old.preFirstMateRole||'Quartier-maître';delete old.preFirstMateRole}
 m.preFirstMateRole=m.role;m.role='Bras droit';o.firstMateId=m.id;m.loyalty=cl(m.loyalty+6,0,100);o.cohesion=cl(o.cohesion+2,0,100);o.history.push({age:age(),event:'first-mate',member:m.name});o.history=o.history.slice(-30);var r=organizationMemberRelation(m,o);if(r){r.trust=cl(r.trust+5,0,100);r.respect=cl(r.respect+5,0,100);addRelationMemory(r,'Tu le/la nommes bras droit de '+o.name+'.','organization')}
 syncPlayerPirateCrewWorld();tl('Bras droit nommé',m.name+' devient le bras droit de '+o.name+'.','major');save();renderChar()
}
var CREW_TEMPERAMENTS=['Loyaliste','Protecteur','Méthodique','Téméraire','Ambitieux','Indépendant'];
function crewMemberTemperament(m,o){
 if(!m)return'Indépendant';if(m.temperament)return m.temperament;var h=orgHash(game||{seed:1},String(o&&o.id||'crew')+':temperament:'+String(m.id||m.name));m.temperament=CREW_TEMPERAMENTS[h%CREW_TEMPERAMENTS.length];return m.temperament
}
function crewPairKey(a,b){return[a,b].sort().join('|')}
function crewTemperamentAffinity(a,b){
 if(a===b)return a==='Ambitieux'?-9:6;var key=[a,b].sort().join('|'),map={
  'Loyaliste|Protecteur':10,'Loyaliste|Méthodique':8,'Méthodique|Protecteur':7,'Protecteur|Téméraire':5,
  'Ambitieux|Protecteur':2,'Ambitieux|Téméraire':3,'Indépendant|Téméraire':4,
  'Méthodique|Téméraire':-12,'Ambitieux|Méthodique':-6,'Ambitieux|Loyaliste':-5,'Indépendant|Loyaliste':-7,'Indépendant|Méthodique':-4
 };return map[key]||0
}
function crewDynamicsState(o){
 if(!o)return{links:[],history:[],lastEventAge:-999,events:0};o.crewDynamics=o.crewDynamics||{links:[],history:[],lastEventAge:-999,events:0};
 var d=o.crewDynamics;d.links=Array.isArray(d.links)?d.links:[];d.history=Array.isArray(d.history)?d.history.slice(-10):[];d.lastEventAge=d.lastEventAge==null?-999:d.lastEventAge;d.events=d.events||0;
 var active=(o.members||[]).filter(function(m){return m.status==='active'}).slice(0,6),valid={};active.forEach(function(m){crewMemberTemperament(m,o)});
 for(var i=0;i<active.length;i++)for(var j=i+1;j<active.length;j++){var a=active[i],b=active[j],key=crewPairKey(a.id,b.id),old=d.links.find(function(x){return x.key===key}),aff=crewTemperamentAffinity(a.temperament,b.temperament),h=orgHash(game||{seed:1},String(o.id)+':bond:'+key);if(!old)old={key:key,a:a.id,b:b.id,affinity:cl(47+(h%19)-9+aff,10,88),rivalry:cl(12+((h>>>5)%18)-aff*.35,0,65),months:0};old.a=a.id;old.b=b.id;old.affinity=cl(old.affinity==null?50:old.affinity,0,100);old.rivalry=cl(old.rivalry||0,0,100);old.months=old.months||0;valid[key]=old}
 d.links=Object.keys(valid).map(function(k){return valid[k]}).slice(0,15);return d
}
function crewMemberById(o,id){return o&&(o.members||[]).find(function(m){return m.id===id})||null}
function crewChemistry(o){
 var d=crewDynamicsState(o),links=d.links;if(!links.length)return cl((o&&o.cohesion)||50,0,100);var avg=links.reduce(function(sum,x){return sum+x.affinity-x.rivalry*.72},0)/links.length;
 return cl(avg*.68+(o.cohesion||50)*.22+(o.morale||50)*.10,0,100)
}
function crewDynamicsLabel(v){v=cl(v||0,0,100);return v>=78?'Fraternité forte':v>=64?'Soudé':v>=50?'Stable':v>=36?'Fragile':'Sous tension'}
function crewStrongestBond(o){var d=crewDynamicsState(o);return d.links.slice().sort(function(a,b){return(b.affinity-b.rivalry*.35)-(a.affinity-a.rivalry*.35)})[0]||null}
function crewWorstFriction(o){var d=crewDynamicsState(o);return d.links.slice().sort(function(a,b){return(b.rivalry-b.affinity*.20)-(a.rivalry-a.affinity*.20)})[0]||null}
function crewDynamicsRecord(o,type,text,link){
 var d=crewDynamicsState(o),item={age:age(),type:type,text:text,link:link&&link.key||null};d.history.push(item);d.history=d.history.slice(-10);d.lastEventAge=game&&game.player?game.player.ageMonths:d.lastEventAge;d.events=(d.events||0)+1;o.history.push({age:age(),event:'crew-dynamic',type:type,text:text});o.history=o.history.slice(-30);return item
}
function crewMemberPressure(o,id){var d=crewDynamicsState(o),links=d.links.filter(function(x){return x.a===id||x.b===id});if(!links.length)return 0;return cl(links.reduce(function(sum,x){return sum+Math.max(0,x.rivalry-x.affinity*.45)},0)/links.length,0,80)}
function crewDynamicsTick(o,m){
 if(!o)return;var d=crewDynamicsState(o),coh=cl(o.cohesion||50,0,100),mor=cl(o.morale||50,0,100);
 d.links.forEach(function(x){x.months+=m;var a=crewMemberById(o,x.a),b=crewMemberById(o,x.b);if(!a||!b)return;var trait=crewTemperamentAffinity(crewMemberTemperament(a,o),crewMemberTemperament(b,o));x.affinity=cl(x.affinity+((coh-50)*.006+(mor-50)*.003+trait*.012+(R('org')-.5)*.34)*m,0,100);x.rivalry=cl(x.rivalry+((50-coh)*.008-trait*.010+(R('org')-.52)*.28)*m,0,100)});
 var worst=crewWorstFriction(o),best=crewStrongestBond(o),now=game.player.ageMonths;
 if(worst&&worst.rivalry>=68&&now-(d.lastEventAge||-999)>10&&R('org')<.018*m){var a=crewMemberById(o,worst.a),b=crewMemberById(o,worst.b);if(a&&b){o.cohesion=cl(o.cohesion-2.5,0,100);a.morale=cl(a.morale-2,0,100);b.morale=cl(b.morale-2,0,100);crewDynamicsRecord(o,'friction','La tension monte entre '+a.name+' et '+b.name+'.',worst);tl('Tension dans le groupe',a.name+' et '+b.name+' commencent à peser sur la cohésion de '+o.name+'.','danger')}}
 else if(best&&best.affinity>=82&&best.rivalry<18&&now-(d.lastEventAge||-999)>14&&R('org')<.012*m){var ba=crewMemberById(o,best.a),bb=crewMemberById(o,best.b);if(ba&&bb){o.cohesion=cl(o.cohesion+1.5,0,100);crewDynamicsRecord(o,'bond',ba.name+' et '+bb.name+' forment un duo particulièrement soudé.',best);tl('Complicité d’équipage',ba.name+' et '+bb.name+' deviennent un tandem fiable au sein de '+o.name+'.')}}
}
function resolveCrewFriction(o,link,mode){
 if(!o||!link)return false;var a=crewMemberById(o,link.a),b=crewMemberById(o,link.b);if(!a||!b)return false;
 if(mode==='mediate'){var skill=(game.player.skills.Commandement||0),success=R('org')<cl(.45+skill/180+o.cohesion/400,.35,.92);link.rivalry=cl(link.rivalry-(success?18:7),0,100);link.affinity=cl(link.affinity+(success?8:2),0,100);o.cohesion=cl(o.cohesion+(success?3:.5),0,100);[a,b].forEach(function(m){m.loyalty=cl(m.loyalty+(success?2:.5),0,100)});crewDynamicsRecord(o,'mediation',(success?'Tu apaises':'Tu contiens partiellement')+' le conflit entre '+a.name+' et '+b.name+'.',link);tl(success?'Conflit apaisé':'Médiation difficile',(success?'La tension retombe entre ':'Le désaccord persiste entre ')+a.name+' et '+b.name+'.',success?'major':'danger');return success}
 if(mode==='side-a'||mode==='side-b'){var fav=mode==='side-a'?a:b,other=mode==='side-a'?b:a;fav.loyalty=cl(fav.loyalty+5,0,100);other.loyalty=cl(other.loyalty-6,0,100);link.rivalry=cl(link.rivalry+5,0,100);o.cohesion=cl(o.cohesion-2,0,100);var fr=organizationMemberRelation(fav,o),or=organizationMemberRelation(other,o);if(fr){fr.trust=cl(fr.trust+4,0,100);fr.respect=cl(fr.respect+2,0,100)}if(or){or.trust=cl(or.trust-5,0,100)}crewDynamicsRecord(o,'side','Tu prends parti pour '+fav.name+' contre '+other.name+'.',link);tl('Tu prends parti','Tu soutiens '+fav.name+'. '+other.name+' ne l’oublie pas.','major');return true}
 link.rivalry=cl(link.rivalry-3,0,100);crewDynamicsRecord(o,'wait','Tu laisses '+a.name+' et '+b.name+' régler leur désaccord sans intervention.',link);tl('Tension surveillée','Tu laisses le conflit évoluer sans intervenir.');return true
}
function crewDynamicsDecision(){
 var o=ensureOrganization();if(!o)return;var link=crewWorstFriction(o);if(!link||link.rivalry<42)return toast('Aucune tension interne ne justifie une intervention actuellement.');var a=crewMemberById(o,link.a),b=crewMemberById(o,link.b);if(!a||!b)return;
 decision('Tension dans '+o.name,a.name+' et '+b.name+' s’opposent de plus en plus. Intervenir peut améliorer la cohésion, mais prendre parti laissera une trace.',[
  ['Médiation','Tenter de réduire durablement la rivalité grâce à ton commandement.',function(){if(!useOrganizationAction())return;resolveCrewFriction(o,link,'mediate')}],
  ['Soutenir '+a.name,'Renforcer ce lien, au risque d’éloigner '+b.name+'.',function(){if(!useOrganizationAction())return;resolveCrewFriction(o,link,'side-a')}],
  ['Soutenir '+b.name,'Renforcer ce lien, au risque d’éloigner '+a.name+'.',function(){if(!useOrganizationAction())return;resolveCrewFriction(o,link,'side-b')}],
  ['Ne pas intervenir','Laisser le conflit se régler seul.',function(){resolveCrewFriction(o,link,'wait')}]
 ])
}
function orgKind(f,spec){if(f==='Gouvernement'&&spec==='Cipher Pol')return'Cellule Cipher Pol';return(ORG_CONFIG[f]||ORG_CONFIG.Civil).kind}
function organizationName(g,p,f){
 var h=orgHash(g,(p.name||'player')+':'+f),pre=ORG_PREFIX[h%ORG_PREFIX.length],suf=(ORG_SUFFIX[f]||ORG_SUFFIX.Civil)[(h>>>4)%(ORG_SUFFIX[f]||ORG_SUFFIX.Civil).length];
 if(f==='Marine')return suf+' '+(10+(h%90));
 if(f==='Gouvernement')return(p.specialization==='Cipher Pol'?'Cipher Pol ':'')+suf+' '+(1+(h%9));
 if(f==='Révolutionnaires')return pre+' '+suf;
 return pre+' '+suf
}
function seededOrgMember(g,p,f,i){
 var h=orgHash(g,(p.name||'player')+':'+f+':member:'+i),cfg=ORG_CONFIG[f]||ORG_CONFIG.Civil,name=PEOPLE_NAMES[h%PEOPLE_NAMES.length]+' '+String.fromCharCode(65+((h>>>5)%26))+'.',role=cfg.roles[(h>>>7)%cfg.roles.length],base=18+((h>>>9)%29);
 return{id:'orgm-'+i+'-'+(h%100000),name:name,role:role,power:base,loyalty:42+((h>>>3)%38),morale:48+((h>>>11)%34),months:0,injuryMonths:0,status:'active',origin:p.region||p.origin,temperament:CREW_TEMPERAMENTS[(h>>>13)%CREW_TEMPERAMENTS.length]}
}
function buildOrganizationState(g,p,f,options){
 options=options||{};var pirateOrigin=f==='Pirates'?(options.pirateMode||'joined'):null,worldCrew=options.worldCrew||null,authority='member',idx=0;
 try{var track=careerTrack(f,p.specialization),ri=track.findIndex(function(x){return x.n===p.rank});idx=ri<0?0:ri;if(f==='Pirates')authority=pirateOrigin==='founded'?'leader':idx>=3?'officer':'member';else authority=idx>=3?'leader':idx>=2?'officer':'member'}catch(_){authority='member'}
 var count=f==='Pirates'&&pirateOrigin==='founded'?1:(authority==='leader'?3:authority==='officer'?4:5),members=[];for(var i=0;i<count;i++)members.push(seededOrgMember(g,p,f,i));
 if(f==='Pirates'&&pirateOrigin==='joined'&&worldCrew){normalizeWorldCrew(worldCrew);var figures=[];if(worldCrew.leader&&worldCrew.leader.status==='active')figures.push({src:worldCrew.leader,role:'Capitaine'});if(worldCrew.second&&worldCrew.second.status==='active')figures.push({src:worldCrew.second,role:'Bras droit'});(worldCrew.notables||[]).filter(function(x){return x.status==='active'}).slice(0,3).forEach(function(x){figures.push({src:x,role:x.role||'Membre notable'})});members=figures.slice(0,3).map(function(x,i){return{id:'orgm-world-'+worldCrew.id+'-'+i,name:x.src.name,role:x.role,power:cl(x.src.power==null?worldCrew.power:x.src.power,1,100),loyalty:cl(x.src.loyalty==null?62:x.src.loyalty,0,100),morale:cl(worldCrew.morale||58,0,100),months:x.src.tenureMonths||0,injuryMonths:0,status:'active',origin:worldCrew.region,worldFigure:true}})}
 else if(authority!=='leader'&&members.length){members[0].role=f==='Pirates'?'Capitaine':f==='Marine'?'Commandant':f==='Révolutionnaires'?'Chef de cellule':f==='Gouvernement'?'Superviseur':'Chef d’équipe';members[0].power+=12;members[0].loyalty=70}
 if(f==='Pirates'&&pirateOrigin==='founded'&&members.length){members[0].role='Quartier-maître';members[0].loyalty=72;members[0].morale=66}
 var joinedTier=0;if(f==='Pirates'&&pirateOrigin==='joined'&&worldCrew){var targetMembers=Math.max(5,worldCrew.members||5);joinedTier=SHIP_TIERS.findIndex(function(x){return x.capacity>=targetMembers});if(joinedTier<0)joinedTier=SHIP_TIERS.length-1}
 var ship=f==='Pirates'?{name:pirateOrigin==='founded'?'Premier Sillage':worldCrew?('Navire de '+worldCrew.name):'Vent Libre',tier:pirateOrigin==='founded'?0:joinedTier,condition:pirateOrigin==='founded'?74:82,capacity:SHIP_TIERS[pirateOrigin==='founded'?0:joinedTier].capacity}:null;
 return{id:'org-'+(orgHash(g,(p.name||'player')+':'+f+':'+(pirateOrigin||'default'))%1000000),faction:f,name:f==='Pirates'&&pirateOrigin==='joined'&&worldCrew?worldCrew.name:organizationName(g,p,f),kind:orgKind(f,p.specialization),authority:authority,playerRole:f==='Pirates'&&pirateOrigin==='founded'?'Capitaine fondateur':authorityLabel(authority),pirateOrigin:pirateOrigin,pirateDirective:f==='Pirates'&&pirateOrigin==='founded'?'Renommée':null,founder:f==='Pirates'?(pirateOrigin==='founded'?p.name:(worldCrew&&worldCrew.foundedBy||worldCrew&&worldCrew.leader&&worldCrew.leader.name||null)):null,worldCrewId:worldCrew&&worldCrew.id||null,morale:f==='Pirates'&&worldCrew?cl(worldCrew.morale||58,0,100):58,cohesion:f==='Pirates'&&pirateOrigin==='founded'?40:46,renown:f==='Pirates'&&worldCrew?cl((worldCrew.power||20)*.35,0,100):0,treasury:0,supplies:f==='Pirates'&&pirateOrigin==='founded'?28:42,members:members,ship:ship,commandActions:1,months:0,missions:0,successes:0,failures:0,dutyCount:0,crewStandingPeak:0,firstMateId:null,crewDynamics:{links:[],history:[],lastEventAge:-999,events:0},history:[{age:age(),event:f==='Pirates'?(pirateOrigin==='founded'?'founded':'joined'):'created'}]}
}
function migrateOrganization(g,p){
 p.organizationHistory=Array.isArray(p.organizationHistory)?p.organizationHistory.slice(-20):[];if(!p.organization&&p.career&&p.career!=='Aucune')p.organization=buildOrganizationState(g,p,p.faction,p.faction==='Pirates'?{pirateMode:'joined',worldCrew:pirateCrewCandidate(g,p)}:null);
 if(p.organization){var o=p.organization;o.faction=o.faction||p.faction;if(o.faction==='Pirates'){o.pirateOrigin=o.pirateOrigin||((p.rank==='Capitaine'||p.rank==='Capitaine renommé'||o.authority==='leader')?'founded':'joined');p.pirateCrewPreference=p.pirateCrewPreference||o.pirateOrigin;o.founder=o.founder||(o.pirateOrigin==='founded'?p.name:null);o.worldCrewId=o.worldCrewId||null;o.pirateDirective=o.pirateDirective||'Renommée'}o.faction=o.faction||p.faction;o.kind=o.kind||orgKind(o.faction,p.specialization);o.name=o.name||organizationName(g,p,o.faction);o.authority=o.authority||'member';o.playerRole=o.playerRole||authorityLabel(o.authority);o.morale=cl(o.morale==null?58:o.morale,0,100);o.cohesion=cl(o.cohesion==null?46:o.cohesion,0,100);o.renown=o.renown||0;o.treasury=o.treasury||0;o.supplies=o.supplies==null?42:o.supplies;o.commandActions=o.commandActions==null?1:o.commandActions;o.months=o.months||0;o.missions=o.missions||0;o.successes=o.successes||0;o.failures=o.failures||0;o.dutyCount=o.dutyCount||0;o.crewStandingPeak=o.crewStandingPeak||0;o.firstMateId=o.firstMateId||null;o.history=o.history||[];o.members=(o.members||[]).map(function(m,i){m.id=m.id||('orgm-'+i+'-'+orgHash(g,'legacy:'+i));m.role=m.role||'Membre';m.power=cl(m.power==null?25:m.power,1,100);m.loyalty=cl(m.loyalty==null?55:m.loyalty,0,100);m.morale=cl(m.morale==null?55:m.morale,0,100);m.months=m.months||0;m.injuryMonths=m.injuryMonths||0;m.status=m.status||'active';crewMemberTemperament(m,o);return m});crewDynamicsState(o);if(o.faction==='Pirates'&&!o.ship)o.ship={name:'Vent Libre',tier:0,condition:82,capacity:4}}
 return p
}
function pirateCrewCandidates(g,p,limit){
 var w=g.world||{},crews=(w.crews||[]).filter(function(c){return c.status==='active'&&c.faction==='Pirates'&&!c.playerControlled}),target=(game&&game.player===p)?power():(((p.stats&&Object.keys(p.stats).length)?Object.keys(p.stats).reduce(function(a,k){return a+(p.stats[k]||0)},0)/Object.keys(p.stats).length:20)+((p.skills&&p.skills.Combat)||0))*.5,region=p.region;crews.forEach(function(c){normalizeWorldCrew(c,g)});crews.sort(function(a,b){var as=(a.region===region?38:0)-Math.abs((a.power||20)-(target+12))*.42+(a.cohesion||50)*.06+Math.min(8,(a.members||0)*.18),bs=(b.region===region?38:0)-Math.abs((b.power||20)-(target+12))*.42+(b.cohesion||50)*.06+Math.min(8,(b.members||0)*.18);return bs-as||String(a.name).localeCompare(String(b.name))});return crews.slice(0,limit||3)
}
function pirateCrewCandidate(g,p){return pirateCrewCandidates(g,p,1)[0]||null}
function pirateJoinDecision(onChoose){
 var p=game.player,crews=pirateCrewCandidates(game,p,4);if(!crews.length)return toast('Aucun équipage pirate accessible ne cherche actuellement de nouveaux membres.');
 var choices=crews.map(function(c){normalizeWorldCrew(c);var captain=c.leader&&c.leader.name||'Capitaine inconnu';return[c.name,'Capitaine '+captain+' • '+c.region+' • '+(c.members||0)+' membres • puissance '+Math.round(c.power||0)+' • cohésion '+Math.round(c.cohesion||0)+'%',function(){if(onChoose)onChoose(c);else join('Pirates','Novice',{pirateMode:'joined',worldCrew:c})}]});choices.push(['Annuler','Ne rejoindre aucun pavillon pour l’instant.',function(){}]);decision('Choisir un équipage','Chaque équipage existe déjà dans le monde et conservera son capitaine, sa génération et son histoire. En le rejoignant, tu pourras monter jusqu’à Bras droit, mais jamais devenir capitaine.',choices)
}
function pirateOriginLabel(o){return!o||o.faction!=='Pirates'?'':o.pirateOrigin==='founded'?'Équipage fondé':o.pirateOrigin==='joined'?'Équipage rejoint':'Équipage pirate'}
function syncPlayerPirateCrewWorld(){
 var p=game.player,o=p.organization;if(!o||p.faction!=='Pirates')return null;var w=game.world,c=o.worldCrewId&&(w.crews||[]).find(function(x){return x.id===o.worldCrewId});
 if(!c&&o.pirateOrigin==='founded'){c={id:'player-'+o.id,name:o.name,faction:'Pirates',region:p.region,power:organizationPower(),members:o.members.filter(function(m){return m.status==='active'}).length+1,morale:o.morale,bounty:p.bounty||0,status:'active',ageMonths:o.months||0,victories:o.successes||0,defeats:o.failures||0,intention:null,intentionMonths:0,resources:cl(o.supplies,0,100),lastIntentOutcome:'fondé par '+p.name,generation:1,parentCrewId:null,foundedBy:p.name,leader:{name:p.name,power:power(),loyalty:100,tenureMonths:o.months||0,status:'active',role:'Leader'},second:null,notables:[],cohesion:o.cohesion,legacy:{successions:0,splinters:0,recruits:0,departures:0,peakPower:organizationPower(),peakMembers:o.members.length+1},history:[],playerControlled:true};w.crews.push(c);o.worldCrewId=c.id;crewHistory(c,'founding',p.name+' fonde '+o.name+'.')}
 if(!c&&o.pirateOrigin==='joined'){c=pirateCrewCandidate(game,p);if(c)o.worldCrewId=c.id}
 if(!c)return null;normalizeWorldCrew(c);if(o.pirateOrigin==='joined')syncJoinedCrewRoster(o,c);syncOrganizationMemberRelations(o);var active=o.members.filter(function(m){return m.status==='active'}),orgPow=organizationPower(),joined=o.pirateOrigin==='joined';c.region=p.region;c.name=o.name;c.members=joined?Math.max(c.members||0,active.length+1):Math.max(2,active.length+1);var influence=joined?(o.authority==='officer'?.08:.035):.30;c.morale=cl(c.morale+(o.morale-c.morale)*influence,0,100);c.cohesion=cl(c.cohesion+(o.cohesion-c.cohesion)*influence,0,100);c.resources=joined?cl(Math.max(c.resources||0,o.supplies*.35),0,100):cl(Math.max(c.resources||0,o.supplies*.75),0,100);c.power=joined?cl(c.power+(Math.max(c.power,orgPow)-c.power)*.015,6,96):cl(c.power+(orgPow-c.power)*.08,6,96);c.bounty=Math.max(c.bounty||0,p.bounty||0);c.playerJoined=joined;c.playerControlled=o.pirateOrigin==='founded';
 if(c.playerControlled){c.leader={name:p.name,power:power(),loyalty:100,tenureMonths:o.months||0,status:'active',role:'Leader'};var fm=active.find(function(m){return m.id===o.firstMateId&&m.status==='active'});c.second=fm?{name:fm.name,power:fm.power,loyalty:fm.loyalty,tenureMonths:fm.months||0,status:'active',role:'Bras droit'}:null;c.notables=active.filter(function(m){return !fm||m.id!==fm.id}).slice(0,2).map(function(m,i){return{id:c.id+'-player-n'+i,name:m.name,role:m.role,power:m.power,loyalty:m.loyalty,status:'active'}});c.foundedBy=o.founder||c.foundedBy||p.name}
 else if(c.leader&&o.pirateOrigin==='joined'){var captain=o.members.find(function(m){return m.status==='active'&&m.role==='Capitaine'});if(captain){captain.name=c.leader.name;captain.power=cl(Math.max(captain.power||0,c.leader.power||0),1,100)}}
 return c
}
function foundOwnPirateCrew(){
 var p=game.player,o=p.organization;if(p.faction!=='Pirates'||!o||o.pirateOrigin!=='joined')return toast('Tu dois d’abord appartenir à un équipage pirate existant.');if(o.authority==='leader')return toast('Tu diriges déjà cet équipage.');
 var former=o.name;decision('Fonder ton équipage','Tu quitteras '+former+' pour créer ton propre pavillon. Tu deviendras capitaine immédiatement, mais repartiras avec un petit groupe et peu de ressources.',[
 ['Fonder mon équipage','Quitter '+former+' et prendre ton indépendance.',function(){var wc=o.worldCrewId&&game.world.crews.find(function(c){return c.id===o.worldCrewId});if(wc)wc.playerJoined=false;archiveOrganization('Départ pour fonder son propre équipage');p.pirateCrewPreference='founded';p.rank=(p.rank==='Capitaine renommé'?'Capitaine renommé':'Capitaine');var rec=careerRecord('Pirates');rec.rank=p.rank;p.organization=buildOrganizationState(game,p,'Pirates',{pirateMode:'founded'});syncPlayerPirateCrewWorld();p.factionRep.Pirates=cl((p.factionRep.Pirates||0)+2,-100,100);p.careerHistory.push({age:age(),type:'crew-founding',from:former,to:p.organization.name});p.careerHistory=p.careerHistory.slice(-60);signalPersonalChapter('organization','Fondation et vie de '+p.organization.name,18,'crew-founding:'+p.organization.id,p.organization.id);rememberCausalMemory('crew','Fondation de '+p.organization.name,74,{kind:'crew',organizationId:p.organization.id,region:p.region},'player-founded-crew:'+p.organization.id);tl('Nouveau pavillon','Tu quittes '+former+' et fondes '+p.organization.name+'.','major')}],
 ['Rester avec mon équipage','Ne rien changer.',function(){}]
 ])
}
function ensureOrganization(){
 var p=game.player;if(!p.career||p.career==='Aucune')return null;if(!p.organization||p.organization.faction!==p.faction){var pirateMode=p.faction==='Pirates'?(p.pirateCrewPreference||((p.rank==='Capitaine'||p.rank==='Capitaine renommé')?'founded':'joined')):null,opts=p.faction==='Pirates'?{pirateMode:pirateMode,worldCrew:pirateMode==='founded'?null:pirateCrewCandidate(game,p)}:null;p.organization=buildOrganizationState(game,p,p.faction,opts);tl('Nouvelle organisation',p.faction==='Pirates'?(p.organization.pirateOrigin==='founded'?'Tu fondes '+p.organization.name+'.':'Tu rejoins '+p.organization.name+'.'):'Tu intègres '+p.organization.name+' ('+p.organization.kind+').','major')}syncOrganizationRole();return p.organization
}
function syncOrganizationRole(){
 var p=game.player,o=p.organization;if(!o)return;var old=o.authority,a=organizationAuthority(p);o.authority=a;o.kind=orgKind(p.faction,p.specialization);
 if(p.faction==='Pirates'&&o.pirateOrigin==='joined'){o.playerRole=p.rank==='Bras droit'?'Bras droit':a==='officer'?'Officier':'Membre';if(old!==a&&a==='officer'){o.history.push({age:age(),event:'officer'});signalPersonalChapter('organization','Vie dans '+o.name,11,'crew-officer:'+o.id+':'+p.rank,o.id);rememberCausalMemory('crew','Ascension dans '+o.name,62,{kind:'crew',organizationId:o.id,role:p.rank,region:p.region},'crew-officer:'+o.id+':'+p.rank);tl('Ascension dans l’équipage','Tu accèdes au cercle des officiers de '+o.name+'. Le capitanat reste réservé à celui qui porte le pavillon.','major')}return}
 o.playerRole=p.faction==='Pirates'&&o.pirateOrigin==='founded'?'Capitaine fondateur':authorityLabel(a);
 if(old!==a&&a==='leader'){var chief=o.members.find(function(m){return ['Capitaine','Commandant','Chef de cellule','Superviseur','Chef d’équipe'].indexOf(m.role)>=0});if(chief){chief.role=p.faction==='Pirates'?'Quartier-maître':'Conseiller';chief.loyalty=cl(chief.loyalty+8,0,100)}o.history.push({age:age(),event:'command'});signalPersonalChapter('organization','Vie dans '+o.name,13,'org-command:'+o.id,o.id);tl('Prise de commandement','Tu prends la direction de '+o.name+'.','major')}
}
function organizationCapacity(){
 var o=game.player.organization;if(!o)return 0;if(o.faction==='Pirates'&&o.pirateOrigin==='joined')return 40;if(o.faction==='Pirates'&&o.ship)return o.ship.capacity||4;return o.authority==='leader'?12:o.authority==='officer'?8:6
}
function organizationPower(){
 var p=game.player,o=p.organization;if(!o)return 0;var ms=o.members.filter(function(m){return m.status==='active'}),avg=ms.length?ms.reduce(function(a,m){return a+m.power},0)/ms.length:0,coverage=new Set(ms.map(function(m){return m.role})).size;
 return cl(avg*.56+(p.skills.Commandement||0)*.18+o.cohesion*.16+coverage*1.4,0,100)
}
function organizationSupport(m){
 var o=game.player.organization;if(!o||!o.members.length)return 0;var base=organizationPower()*.09+o.cohesion*.035+o.morale*.025,authority=o.authority==='leader'?1.25:o.authority==='officer'?1.1:.9;
 if(m&&m.spec&&o.members.some(function(x){return x.role===m.spec}))base+=2.5;var fm=o.firstMateId&&o.members.find(function(x){return x.id===o.firstMateId&&x.status==='active'});if(fm){var fr=fm.linkedRelationId?relationById(fm.linkedRelationId):null;base+=cl((fm.loyalty+(fr?fr.trust:50))/100,0.5,1.9)}if(o.faction==='Pirates'&&o.pirateOrigin==='joined')base+=joinedCrewStanding(o)*.015;base+=(crewChemistry(o)-50)*.035;return cl(base*authority,0,19)
}
function useOrganizationAction(){
 var o=ensureOrganization();if(!o)return false;if((o.commandActions||0)<1){toast('Tu as déjà utilisé ton action de commandement pour cette période.');return false}o.commandActions--;return true
}
function generateRecruitCandidate(){
 var p=game.player,o=ensureOrganization(),i=(o.members.length+1)+Math.floor(R('org')*999),cfg=ORG_CONFIG[p.faction]||ORG_CONFIG.Civil,role=pk(cfg.roles,'org'),name=pk(PEOPLE_NAMES,'org')+' '+String.fromCharCode(65+Math.floor(R('org')*26))+'.',danger=inf().danger;
 var id='orgm-r-'+Math.floor(R('org')*999999),h=orgHash(game,id+':'+name);return{id:id,name:name,role:role,power:cl(16+danger*.22+R('org')*24,12,72),loyalty:38+R('org')*42,morale:52+R('org')*30,months:0,injuryMonths:0,status:'active',origin:p.region,temperament:CREW_TEMPERAMENTS[h%CREW_TEMPERAMENTS.length]}
}
function recruitOrganizationMember(){
 var p=game.player,o=ensureOrganization();if(!o)return;if(o.authority==='member')return toast('Ton rang ne te permet pas de recruter.');var joinedPirate=p.faction==='Pirates'&&o.pirateOrigin==='joined';var joinedWorld=joinedPirate?syncPlayerPirateCrewWorld():null;if((joinedPirate?(joinedWorld&&joinedWorld.members||0):o.members.filter(function(m){return m.status==='active'}).length)>=organizationCapacity())return toast('Ton organisation a atteint sa capacité actuelle.');if(!useOrganizationAction())return;
 var candidates=[generateRecruitCandidate(),generateRecruitCandidate(),generateRecruitCandidate()],choices=candidates.map(function(c){var cost=p.faction==='Pirates'||p.faction==='Chasseur de primes'?Math.round(3000+c.power*180):0;return[c.name,c.role+' • puissance '+Math.round(c.power)+(cost?' • '+cost.toLocaleString('fr-FR')+' B':''),function(){if(joinedPirate){var captainApproval=cl(.48+o.cohesion/320+(p.rank==='Bras droit'?.18:0),.25,.9);if(R('org')>=captainApproval){tl('Recrutement refusé','Le capitaine refuse ta proposition de recruter '+c.name+'.');return}}if(cost){var available=o.treasury+p.money;if(available<cost){o.commandActions++;return toast('Fonds insuffisants.')}var fromTreasury=Math.min(o.treasury,cost);o.treasury-=fromTreasury;p.money-=cost-fromTreasury}o.members.push(c);if(joinedPirate&&joinedWorld){joinedWorld.members=Math.min(40,(joinedWorld.members||0)+1);joinedWorld.legacy.recruits=(joinedWorld.legacy.recruits||0)+1;crewHistory(joinedWorld,'player-recruit',p.name+' soutient le recrutement de '+c.name+'.')}o.morale=cl(o.morale+2,0,100);o.cohesion=cl(o.cohesion-2,0,100);var rel=normalizeRelation(game,{name:c.name,role:'membre de '+o.name,type:'organization',affection:40,trust:c.loyalty*.65,respect:45,loyalty:c.loyalty,attraction:15,location:p.island,faction:p.faction},game.socialSeq++);game.relations.push(rel);tl(joinedPirate?'Proposition acceptée':'Recrutement',c.name+' rejoint '+o.name+' comme '+c.role+'.','major')} ]});choices.push(['Annuler','Conserver ton action de commandement.',function(){o.commandActions++}]);decision('Recrutement','Sélectionne un candidat. La qualité dépend de la région, de ta réputation et du contexte.',choices)
}
function trainOrganization(){
 var o=ensureOrganization();if(!o||o.authority==='member')return toast('Ton rang ne te permet pas d’organiser un entraînement collectif.');if(!useOrganizationAction())return;if(o.supplies<3){o.commandActions++;return toast('Pas assez de provisions pour organiser la session.')}o.supplies-=3;o.cohesion=cl(o.cohesion+2+R('org')*4,0,100);o.morale=cl(o.morale+1+R('org')*2,0,100);o.members.forEach(function(m){if(m.status==='active'){m.power=cl(m.power+.3+R('org')*.9,1,100);m.loyalty=cl(m.loyalty+R('org')*1.2,0,100)}});tl('Entraînement collectif','Le groupe travaille ses automatismes et sa cohésion.','major');save();renderChar()
}
function fundOrganization(){
 var p=game.player,o=ensureOrganization(),amount=10000;if(p.money<amount)return toast('Il te faut 10 000 B disponibles.');p.money-=amount;o.treasury+=amount;tl('Caisse commune','Tu verses 10 000 B à '+o.name+'.');save();renderChar()
}
function buyOrganizationSupplies(){
 var p=game.player,o=ensureOrganization();if(p.faction==='Pirates'&&o&&o.pirateOrigin==='joined'&&o.authority==='member')return toast('Le ravitaillement du navire relève des officiers.');var m=game.world.markets[p.island],unit=marketPrice(p.island,'provisions',true),qty=5,cost=unit*qty;if(!m||m.goods.provisions.stock<qty)return toast('Le marché local manque de provisions.');if(o.treasury+p.money<cost)return toast('Ravitaillement actuel : '+cost.toLocaleString('fr-FR')+' B.');var t=Math.min(o.treasury,cost);o.treasury-=t;p.money-=cost-t;m.goods.provisions.stock-=qty;m.tradeActivity+=cost;o.supplies=cl(o.supplies+24,0,100);o.morale=cl(o.morale+1,0,100);tl('Ravitaillement','Les provisions de '+o.name+' sont renouvelées pour '+cost.toLocaleString('fr-FR')+' B.');save();render()
}
function supportOrganization(){
 var o=ensureOrganization();if(!o||!useOrganizationAction())return;o.morale=cl(o.morale+2+R('org')*2,0,100);o.cohesion=cl(o.cohesion+1+R('org')*2,0,100);o.members.forEach(function(m){if(m.status==='active')m.loyalty=cl(m.loyalty+.4+R('org')*.8,0,100)});crewDynamicsState(o).links.forEach(function(x){x.affinity=cl(x.affinity+1.2,0,100);x.rivalry=cl(x.rivalry-1.1,0,100)});tl('Vie de groupe','Tu consacres du temps à renforcer '+o.name+'.');save();renderChar()
}
function pirateCrewDuty(){
 var p=game.player,o=ensureOrganization();if(p.faction!=='Pirates'||!o||o.pirateOrigin!=='joined')return toast('Cette action concerne un équipage que tu as rejoint.');if(!useOrganizationAction())return;
 var rec=careerRecord('Pirates'),keys=careerFocusKeys().slice(0,2),xp=2+(o.authority==='officer'?1.5:0)+(p.rank==='Bras droit'?1.5:0);rec.xp+=xp;o.dutyCount=(o.dutyCount||0)+1;keys.forEach(function(k){gain(k,.22+R('org')*.28)});o.morale=cl(o.morale+1.5,0,100);o.cohesion=cl(o.cohesion+1,0,100);var c=syncPlayerPirateCrewWorld();if(c){c.morale=cl(c.morale+.35,0,100);c.cohesion=cl(c.cohesion+.25,0,100);crewHistory(c,'player-duty',p.name+' prend sa part dans la vie quotidienne du pavillon.')}o.crewStandingPeak=Math.max(o.crewStandingPeak||0,joinedCrewStanding(o));syncOrganizationMemberRelations(o);tl('Quart d’équipage','Tu prends ton quart et renforces progressivement ta place dans '+o.name+'.');evaluatePromotion();save();renderChar()
}
function pirateOfficerCouncil(){
 var p=game.player,o=ensureOrganization();if(p.faction!=='Pirates'||!o||o.pirateOrigin!=='joined'||o.authority!=='officer')return toast('Il faut être officier ou bras droit d’un équipage rejoint.');if(!useOrganizationAction())return;
 var c=syncPlayerPirateCrewWorld();if(!c){o.commandActions++;return toast('Le capitaine de cet équipage est momentanément introuvable.')}var options=['Chercher un butin','Recruter','S’entraîner','Se remettre'],choices=options.map(function(intent){return[intent,'Proposer cette priorité au capitaine.',function(){var senior=p.rank==='Bras droit'?1:0,standing=joinedCrewStanding(o),approval=cl(.28+o.cohesion/360+standing/170+senior*.12,.2,.94);if(R('org')<approval){c.intention=intent;c.intentionMonths=1;o.cohesion=cl(o.cohesion+1.2,0,100);crewHistory(c,'player-council',p.name+' convainc le capitaine de privilégier : '+intent+'.');tl('Conseil accepté','Le capitaine retient ta proposition : '+intent+'.','major')}else{crewHistory(c,'player-council',p.name+' propose '+intent+', mais le capitaine choisit une autre voie.');tl('Conseil refusé','Le capitaine écoute ta proposition mais conserve sa propre décision.')}}]});choices.push(['Annuler','Ne rien proposer et conserver ton action.',function(){o.commandActions++}]);decision('Conseil des officiers','Tu peux peser sur la prochaine priorité du pavillon, mais la décision finale appartient toujours au capitaine.',choices)
}
function pirateCaptainDirective(){
 var p=game.player,o=ensureOrganization();if(p.faction!=='Pirates'||!o||o.pirateOrigin!=='founded'||o.authority!=='leader')return toast('Seul le capitaine fondateur fixe la doctrine de son équipage.');if(!useOrganizationAction())return;
 var dirs=[['Butin','Prioriser les gains et la caisse commune.'],['Renommée','Chercher les exploits qui font monter le nom du pavillon.'],['Territoire','Favoriser l’influence et les opérations de contrôle.'],['Cohésion','Privilégier la stabilité interne et la fidélité.']],choices=dirs.map(function(d){return[d[0],d[1],function(){o.pirateDirective=d[0];o.history.push({age:age(),event:'directive',value:d[0]});o.history=o.history.slice(-30);tl('Directive du capitaine','Priorité de '+o.name+' : '+d[0]+'.','major')} ]});choices.push(['Annuler','Conserver la directive actuelle : '+(o.pirateDirective||'Renommée')+'.',function(){o.commandActions++}]);decision('Directive du capitaine','Tu commandes le pavillon. Cette priorité modifiera légèrement les bénéfices des futures missions sans ajouter de nouvelle jauge.',choices)
}

function repairOrganizationShip(){
 var p=game.player,o=ensureOrganization();if(!o||!o.ship)return;if(p.faction==='Pirates'&&o.pirateOrigin==='joined'&&o.authority==='member')return toast('Les réparations du navire sont coordonnées par les officiers.');var missing=100-o.ship.condition;if(missing<5)return toast('Le navire est déjà en bon état.');var cost=Math.round(3000+missing*350);if(o.treasury+p.money<cost)return toast('Réparation : '+cost.toLocaleString('fr-FR')+' B requis.');var t=Math.min(o.treasury,cost);o.treasury-=t;p.money-=cost-t;o.ship.condition=cl(o.ship.condition+35,0,100);tl('Réparations navales',o.ship.name+' est remis en état.','major');save();renderChar()
}
function upgradeOrganizationShip(){
 var p=game.player,o=ensureOrganization();if(!o||!o.ship||o.authority!=='leader')return toast('Seul le capitaine peut engager cette amélioration.');var next=SHIP_TIERS[(o.ship.tier||0)+1];if(!next)return toast('Ton navire est déjà au niveau maximal.');if(o.treasury+p.money<next.cost)return toast('Amélioration : '+next.cost.toLocaleString('fr-FR')+' B requis.');var t=Math.min(o.treasury,next.cost);o.treasury-=t;p.money-=next.cost-t;o.ship.tier++;o.ship.capacity=next.capacity;o.ship.condition=100;o.ship.name=next.name+' '+ORG_PREFIX[Math.floor(R('org')*ORG_PREFIX.length)];tl('Nouveau navire','Ton organisation navigue désormais sur '+o.ship.name+'.','major');save();renderChar()
}
function assignOrganizationRole(id){
 var o=ensureOrganization();if(!o||o.authority==='member')return;if(o.faction==='Pirates'&&o.pirateOrigin==='joined')return toast('Dans un équipage rejoint, seul le capitaine distribue les fonctions.');if(o.firstMateId===id)return toast('Le bras droit garde sa fonction tant qu’il n’est pas remplacé.');var m=o.members.find(function(x){return x.id===id});if(!m)return;var roles=(ORG_CONFIG[o.faction]||ORG_CONFIG.Civil).roles,choices=roles.map(function(role){return[role,'Assigner ce rôle à '+m.name+'.',function(){m.role=role;o.cohesion=cl(o.cohesion+.5,0,100);tl('Répartition des rôles',m.name+' devient '+role+'.')} ]});decision('Rôle de '+m.name,'Une équipe équilibrée améliore le soutien lors des missions.',choices)
}
function dismissOrganizationMember(id){
 var o=ensureOrganization();if(!o||o.authority!=='leader')return;var m=o.members.find(function(x){return x.id===id});if(!m)return;decision('Écarter '+m.name,'Cette décision réduira la cohésion et peut affecter le moral.',[['Confirmer','Faire quitter le groupe à '+m.name+'.',function(){m.status='left';m.loyalty=0;if(o.firstMateId===m.id)o.firstMateId=null;o.cohesion=cl(o.cohesion-5,0,100);o.morale=cl(o.morale-3,0,100);if(m.linkedRelationId){var r=relationById(m.linkedRelationId);if(r){r.joinedOrganization=false;r.type='social';r.loyalty=cl(r.loyalty-18,0,100);r.trust=cl(r.trust-10,0,100);addRelationMemory(r,'Tu l’écartes de '+o.name+'.','organization')}}tl('Départ',m.name+' quitte '+o.name+'.','major')}],['Annuler','Ne rien changer.',function(){}]])
}
function archiveOrganization(reason){
 var p=game.player,o=p.organization;if(!o)return;p.organizationHistory=Array.isArray(p.organizationHistory)?p.organizationHistory:[];var active=(o.members||[]).filter(function(x){return x.status==='active'}).length;p.organizationHistory.push({name:o.name,faction:o.faction,role:o.playerRole,authority:o.authority,months:o.months||0,missions:o.missions||0,successes:o.successes||0,failures:o.failures||0,renown:Math.round(o.renown||0),members:active,reason:reason||'Départ'});p.organizationHistory=p.organizationHistory.slice(-20);p.organization=null
}
function organizationTick(m){
 var p=game.player;if(p.ageMonths<180||p.career==='Aucune')return;var o=ensureOrganization();if(!o)return;o.commandActions=1;o.months+=m;syncOrganizationRole();if(p.faction==='Pirates')syncPlayerPirateCrewWorld();syncOrganizationMemberRelations(o);if(o.faction==='Pirates'&&o.pirateOrigin==='joined')o.crewStandingPeak=Math.max(o.crewStandingPeak||0,joinedCrewStanding(o));
 var active=o.members.filter(function(x){return x.status==='active'}),need=active.length*.42*m+(o.faction==='Pirates'?1.1*m:.3*m);o.supplies-=need;if(o.supplies<0){o.morale=cl(o.morale+o.supplies*.8,0,100);o.cohesion=cl(o.cohesion+o.supplies*.35,0,100);o.supplies=0}
 active.forEach(function(mem){mem.months+=m;if(mem.injuryMonths>0){mem.injuryMonths=Math.max(0,mem.injuryMonths-m);if(mem.linkedRelationId){var ir=relationById(mem.linkedRelationId);if(ir){ir.injuryMonths=mem.injuryMonths;ir.status=mem.injuryMonths>0?'wounded':'active';ir.region=p.region;ir.location=p.island;ir.joinedOrganization=true}}return}mem.power=cl(mem.power+(.08+R('org')*.18)*m,1,100);mem.morale=cl(mem.morale+(o.morale-mem.morale)*.04*m+(R('org')-.5)*1.2*m,0,100);mem.loyalty=cl(mem.loyalty+(o.cohesion-50)*.008*m+(R('org')-.49)*.8*m,0,100);var pressure=crewMemberPressure(o,mem.id);if(pressure>28){mem.morale=cl(mem.morale-(pressure-28)*.006*m,0,100);mem.loyalty=cl(mem.loyalty-(pressure-28)*.003*m,0,100)}if(mem.linkedRelationId){var rr=relationById(mem.linkedRelationId);if(rr){var sharedPower=Math.max(rr.npcPower||0,mem.power||0);rr.npcPower=sharedPower;mem.power=sharedPower;rr.loyalty=cl((rr.loyalty+mem.loyalty)/2,0,100);mem.loyalty=rr.loyalty;rr.region=p.region;rr.location=p.island;rr.joinedOrganization=true;rr.injuryMonths=Math.max(rr.injuryMonths||0,mem.injuryMonths||0);if(rr.injuryMonths>0)rr.status='wounded';else if(rr.status==='wounded')rr.status='active'}}if(mem.loyalty<18&&o.morale<25&&R('org')<.035*m){mem.status='left';if(mem.linkedRelationId){var lr=relationById(mem.linkedRelationId);if(lr){lr.joinedOrganization=false;lr.type='social';lr.trust=cl(lr.trust-12,0,100);addRelationMemory(lr,'Quitte '+o.name+' après une crise de loyauté.','organization')}}o.morale=cl(o.morale-4,0,100);o.cohesion=cl(o.cohesion-4,0,100);tl('Désertion interne',mem.name+' quitte '+o.name+' après une longue dégradation du moral.','danger')}})
 if(o.ship){var decay=(p.travel?1.1:.22)*m;o.ship.condition=cl(o.ship.condition-decay,0,100);if(o.ship.condition<25)o.morale=cl(o.morale-.6*m,0,100)}
 var avg=active.length?active.reduce(function(a,x){return a+x.morale},0)/active.length:o.morale;o.morale=cl(o.morale+(avg-o.morale)*.08+(o.supplies>20?.2:-.25)*m,0,100);
 crewDynamicsTick(o,m);if(o.morale<12&&o.authority==='leader'&&active.length>1&&R('org')<.025*m){var rebel=active.slice().sort(function(a,b){return a.loyalty-b.loyalty})[0];if(rebel){rebel.status='left';var loss=Math.min(o.treasury,Math.round(o.treasury*.15));o.treasury-=loss;tl('Crise de commandement',rebel.name+' quitte le groupe avec '+loss.toLocaleString('fr-FR')+' B de la caisse.','danger')}}
 if(p.faction==='Pirates')syncPlayerPirateCrewWorld()
}
function organizationMissionDanger(m){return Math.max(5,m.danger-organizationSupport(m))}
function organizationMissionResult(ok,m,reward){
 var o=ensureOrganization();if(!o)return reward;o.missions++;if(ok)o.successes++;else o.failures++;if(o.faction==='Pirates'&&o.pirateOrigin==='joined'){syncOrganizationMemberRelations(o);var captain=o.members.find(function(x){return x.status==='active'&&x.role==='Capitaine'}),cr=captain&&captain.linkedRelationId?relationById(captain.linkedRelationId):null;if(cr){cr.respect=cl(cr.respect+(ok?1.8:-.4),0,100);cr.trust=cl(cr.trust+(ok?1.2:-.6),0,100)}o.crewStandingPeak=Math.max(o.crewStandingPeak||0,joinedCrewStanding(o))}if(ok&&[5,15,30].indexOf(o.successes)>=0)signalPersonalChapter('organization','Vie dans '+o.name,10,'org-milestone:'+o.successes,o.id);if(ok&&o.faction==='Pirates'&&o.pirateOrigin==='founded'){var d=o.pirateDirective||'Renommée';if(d==='Butin')o.treasury+=Math.round(reward*.06);else if(d==='Renommée')o.renown=cl(o.renown+1.6,0,100);else if(d==='Territoire'){adjustRep('Pirates',.8);var wc=syncPlayerPirateCrewWorld();if(wc)updateCollectiveGoal(crewWorldGoal(wc),1.2)}else if(d==='Cohésion'){o.cohesion=cl(o.cohesion+1.5,0,100);o.morale=cl(o.morale+1,0,100)}}var share=ok?Math.round(reward*(o.authority==='leader'?.18:o.authority==='officer'?.08:.03)):0;if(share){o.treasury+=share;reward-=share}o.renown=cl(o.renown+(ok?2+(m.tier||0):-.8),0,100);o.morale=cl(o.morale+(ok?2:-4),0,100);o.cohesion=cl(o.cohesion+(ok?1:-2),0,100);var dyn=crewDynamicsState(o);dyn.links.forEach(function(x){x.affinity=cl(x.affinity+(ok?.55:-.25),0,100);x.rivalry=cl(x.rivalry+(ok?-.22:.65),0,100)});if(!ok&&o.members.length&&R('org')<.28){var active=o.members.filter(function(x){return x.status==='active'});if(active.length){var hurt=pk(active,'org');hurt.injuryMonths=1+R('org')*3;hurt.morale=cl(hurt.morale-6,0,100);tl('Blessure dans le groupe',hurt.name+' est blessé pendant la mission.','danger')}}return reward
}


function defaultJustice(){
 var heat={};REG.forEach(function(r){heat[r]=0});
 return{regionalHeat:heat,notoriety:0,crimes:[],detained:false,prison:null,actions:1,captures:0,bountiesClaimed:0,escapes:0,pursuits:0,lastPursuit:null}
}
function migrateJustice(p){
 p.justice=p.justice||defaultJustice();var j=p.justice;j.regionalHeat=j.regionalHeat||{};REG.forEach(function(r){if(j.regionalHeat[r]==null)j.regionalHeat[r]=0});
 j.notoriety=j.notoriety||0;j.crimes=j.crimes||[];j.detained=!!j.detained;j.prison=j.prison||null;j.actions=j.actions==null?1:j.actions;j.captures=j.captures||0;j.bountiesClaimed=j.bountiesClaimed||0;j.escapes=j.escapes||0;j.pursuits=j.pursuits||0;j.lastPursuit=j.lastPursuit||null;return j
}
function currentHeat(){var p=game.player,j=migrateJustice(p);return j.regionalHeat[p.region]||0}
function wantedLevel(){
 var p=game.player,h=currentHeat(),b=p.bounty||0,s=Math.log10(Math.max(1,b+1))*9+h*.42+jNotoriety();
 return b<=0&&h<12?'Aucun avis':s<38?'Surveillé':s<58?'Recherché':s<78?'Priorité Marine':'Menace majeure'
}
function jNotoriety(){return(game&&game.player&&game.player.justice?game.player.justice.notoriety:0)*.16}
function issueBounty(amount,reason){
 var p=game.player;if(amount<=0)return;p.bounty=Math.max(0,Math.round((p.bounty||0)+amount));p.highestBounty=Math.max(p.highestBounty||0,p.bounty);if(reason)news('Nouvel avis de recherche',p.name+' atteint '+p.bounty.toLocaleString('fr-FR')+' B après : '+reason+'.','major')
}
function pirateBountyTarget(m){
 var p=game.player,o=p.organization,x=influenceMetrics(),stage=missionAccessIndex(),tier=m&&m.tier||0,pow=power(),rep=Math.max(0,p.factionRep.Pirates||0),renown=o?o.renown||0:0,domains=(p.influence&&p.influence.domains||[]).length,affiliates=(p.influence&&p.influence.affiliates||[]).length;
 var target=stage*stage*4000000+Math.pow(Math.max(0,pow-20),2)*40000+rep*250000+renown*200000+(x.score||0)*260000+tier*tier*2200000+domains*30000000+affiliates*15000000;
 if(stage>=5&&pow>=80)target*=1.35;if(domains>=3)target+=180000000;if(affiliates>=3)target+=130000000;if(pow>=90&&(x.score||0)>=90)target+=220000000;
 return Math.max(0,Math.round(target/10000)*10000)
}
function updatePirateThreatBounty(m){
 var p=game.player;if(p.faction!=='Pirates')return 0;var target=pirateBountyTarget(m),current=p.bounty||0;if(target<=current)return 0;var major=!!(m&&(m.signature||m.worldGenerated||(m.tier||0)>=3)),share=major?.22:.11,inc=Math.max(250000,Math.round((target-current)*share/10000)*10000);issueBounty(Math.min(inc,target-current),major?'activité pirate majeure':'menace pirate croissante');return inc
}
function registerCrime(name,severity,witnessed){
 var p=game.player,j=migrateJustice(p),sev=cl(severity||1,1,6),rp=game.world.pressures[p.region]||{},territory=game.world.territories[p.island],control=territory?territory.controller:'Civil';
 if(witnessed==null){var watch=(rp.Marine==null?25:rp.Marine)+(control==='Marine'||control==='Gouvernement'?20:0)-(p.skills.Discrétion||0)*.35;witnessed=R('justice')<cl(.28+watch/180,.12,.92)}
 j.crimes.unshift({name:name,severity:sev,region:p.region,place:p.island,year:game.world.year,month:Math.floor(game.world.month),witnessed:!!witnessed});j.crimes=j.crimes.slice(0,30);j.notoriety=cl(j.notoriety+sev*(witnessed?2.4:.6),0,100);
 if(witnessed){j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)+8+sev*8,0,100);var official=p.faction==='Marine'||p.faction==='Gouvernement';if(!official){var base=Math.round((2500*Math.pow(sev,2)+inf().danger*650)*(1+j.notoriety/120));if(p.faction==='Pirates'||p.faction==='Révolutionnaires'||control==='Marine'||control==='Gouvernement')issueBounty(base,name)}}
 tl('Incident judiciaire',name+(witnessed?' est attribué à ton personnage.':' n’est pas clairement relié à toi.'),witnessed?'danger':'');return witnessed
}
function justicePressure(){
 var p=game.player,j=migrateJustice(p),rp=game.world.pressures[p.region]||{},t=game.world.territories[p.island],official=t&&(t.controller==='Marine'||t.controller==='Gouvernement'),b=Math.log10(Math.max(1,(p.bounty||0)+1))*8;
 return cl((j.regionalHeat[p.region]||0)*.48+b+(rp.Marine==null?25:rp.Marine)*.16+(official?12:0),0,100)
}
function justiceEvasionFactor(){
 var p=game.player,stealth=(p.skills.Discrétion||0)+(p.stats.Agilité||0)*.35+(p.haki.Observation||0)*.25,factor=cl(1-stealth/260,.45,1),spec=p.specialization||'';
 if(['Infiltration','Renseignement','Investigateur','Cipher Pol'].indexOf(spec)>=0)factor*=.78;
 else if(['Traqueur','Navigation','Navigateur'].indexOf(spec)>=0)factor*=.88;
 return cl(factor,.35,1)
}
function pursuitEvasionChance(pressure){
 var p=game.player,stealth=(p.skills.Discrétion||0)*.52+(p.stats.Agilité||0)*.22+(p.stats.Réflexes||0)*.14+(p.skills.Navigation||0)*.06+(p.haki.Observation||0)*.16,ch=.08+stealth/145-(pressure||0)/310,spec=p.specialization||'';
 if(['Infiltration','Renseignement','Investigateur','Cipher Pol'].indexOf(spec)>=0)ch+=.12;else if(['Traqueur','Navigation','Navigateur'].indexOf(spec)>=0)ch+=.06;
 return cl(ch,.04,.76)
}
function useJusticeAction(){var j=migrateJustice(game.player);if(j.actions<1){toast('Tu as déjà utilisé ton action de discrétion pour cette période.');return false}j.actions--;return true}
function layLow(){
 var p=game.player,j=migrateJustice(p);if(j.detained)return toast('Difficile de se faire oublier depuis une cellule.');if(!useJusticeAction())return;var cost=Math.min(Math.max(0,p.money),1200),drop=9+R('justice')*13+(p.skills.Discrétion||0)*.08;p.money-=cost;j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)-drop,0,100);gain('Discrétion',.45+R('justice')*.5);tl('Profil bas','Tu te fais discret dans '+p.region+'. Chaleur locale -'+Math.round(drop)+'.');save();renderChar()
}
function surrenderPlayer(){
 var p=game.player,j=migrateJustice(p);if(j.detained)return;if((p.bounty||0)<=0&&currentHeat()<18)return toast('Les autorités ne te recherchent pas activement.');arrestPlayer('Reddition volontaire');if(j.prison)j.prison.remaining=Math.max(1,Math.round(j.prison.remaining*.72));tl('Reddition','Ta coopération réduit légèrement la durée de détention.');save();render()
}
function arrestPlayer(reason){
 var p=game.player,j=migrateJustice(p);if(j.detained)return;var security=cl(inf().danger*.62+(game.world.pressures[p.region].Marine==null?30:game.world.pressures[p.region].Marine)*.38,6,96),months=Math.max(2,Math.round(2+Math.log10(Math.max(10,p.bounty+10))*1.8+currentHeat()/16+R('justice')*4));
 j.detained=true;j.prison={location:p.island,region:p.region,security:security,remaining:months,original:months,reason:reason||'Arrestation',attempts:0};p.situation='Détenu';p.activity='Détention';p.travel=null;game.mission=null;
 if(p.organization){p.organization.morale=cl(p.organization.morale-7,0,100);p.organization.cohesion=cl(p.organization.cohesion-3,0,100)}
 tl('ARRESTATION',p.name+' est capturé. Peine estimée : '+months+' mois.','danger');news('Arrestation de '+p.name,'Les autorités annoncent la capture du recherché.','major')
}
function releaseFromPrison(){
 var p=game.player,j=migrateJustice(p),pr=j.prison,old=p.bounty||0;j.detained=false;j.prison=null;p.situation=p.career==='Aucune'?'Formation':'Carrière';p.activity=p.situation;
 j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)*.35,0,100);p.bounty=Math.round(old*(p.faction==='Pirates'||p.faction==='Révolutionnaires'?.82:.35));tl('Libération','Tu sors de détention. Ta prime active est réévaluée à '+p.bounty.toLocaleString('fr-FR')+' B.','major')
}
function prisonTick(m){
 var p=game.player,j=migrateJustice(p),pr=j.prison;if(!j.detained||!pr)return;pr.remaining-=m;p.energy=cl(p.energy+m*1.2,0,100);p.health=cl(p.health+m*.7,0,100);j.actions=1;
 if(R('justice')<.05*m){var d=8+pr.security*.18+R('justice')*12,ok=power()+R('justice')*20>d;if(ok){p.reputation+=1;tl('Vie en détention','Tu traverses une situation tendue en prison sans blessure grave.')}else{p.health=cl(p.health-(3+R('justice')*8),0,100);tl('Incident en détention','Une altercation te blesse légèrement.','danger')}}
 if(pr.remaining<=0)releaseFromPrison()
}
function attemptEscape(){
 var p=game.player,j=migrateJustice(p),pr=j.prison;if(!j.detained||!pr)return toast('Tu n’es pas détenu.');if(!useJusticeAction())return;pr.attempts++;var skill=(p.skills.Discrétion||0)*.28+(p.stats.Agilité||0)*.23+(p.stats.Réflexes||0)*.18+power()*.12,guard=pr.security*.72+R('justice')*32,ch=cl(.18+(skill-guard)/100,.04,.78);
 if(R('justice')<ch){j.detained=false;j.prison=null;j.escapes++;j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)+28,0,100);issueBounty(25000+Math.round(pr.security*1800),'Évasion');p.situation='Cavale';p.activity='Explorer';tl('ÉVASION','Tu t’échappes de '+pr.location+'. Les autorités renforcent immédiatement les recherches.','major')}
 else{var extra=2+Math.ceil(R('justice')*4),damage=Math.round(3+R('justice')*10);pr.remaining+=extra;p.health=cl(p.health-damage,0,100);j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)+8,0,100);tl('Évasion échouée','La tentative échoue. +'+extra+' mois de détention et '+damage+'% de dégâts.','danger')}
 save();render()
}
function pursuitEncounter(){
 var p=game.player,j=migrateJustice(p);if(j.detained||!game.alive)return;var pressure=justicePressure(),d=cl(inf().danger*.45+pressure*.55+12,18,94);j.pursuits++;j.lastPursuit={year:game.world.year,month:Math.floor(game.world.month),region:p.region};
 var evade=pursuitEvasionChance(pressure);if(R('justice')<evade){j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)-4,0,100);j.lastPursuit.evaded=true;tl('Filature semée','Tu exploites le terrain et ta discrétion pour éviter l’affrontement avec les autorités.','major');return}var ok=fight(d,'Poursuite des autorités');if(!game.alive)return;if(ok){j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)+10,0,100);registerCrime('Résistance à l’arrestation',3,true);tl('Cavale','Tu échappes aux forces lancées à tes trousses.','major')}else arrestPlayer('Capture après poursuite')
}
function justiceTick(m){
 var p=game.player,j=migrateJustice(p);j.actions=1;
 REG.forEach(function(r){var decay=r===p.region?.55:1.15;j.regionalHeat[r]=cl((j.regionalHeat[r]||0)-decay*m,0,100)});
 if(j.detained)return;
 var pressure=justicePressure(),chance=cl((pressure-24)/650,0,.18)*m*justiceEvasionFactor();if((p.bounty>0||currentHeat()>22)&&R('justice')<chance)pursuitEncounter()
}
function bountyTargets(){
 var p=game.player;return game.world.crews.filter(function(c){return c.status==='active'&&c.faction==='Pirates'&&c.bounty>0&&c.region===p.region}).sort(function(a,b){return b.bounty-a.bounty}).slice(0,5)
}
function huntBountyTarget(id){
 var p=game.player,j=migrateJustice(p);if(p.faction!=='Chasseur de primes')return toast('Réservé aux chasseurs de primes.');if(j.detained)return toast('Tu es actuellement détenu.');var target=game.world.crews.find(function(c){return c.id===id&&c.status==='active'});if(!target||target.region!==p.region)return toast('Cette cible n’est plus disponible dans la région.');if(p.health<40)return toast('Ta santé est trop basse pour lancer une traque.');
 var d=cl(target.power+8+target.members*.18,18,96),ok=fight(d,'Traque : '+target.name);if(!game.alive)return;if(ok){target.status='captured';target.defeats=(target.defeats||0)+1;var reward=Math.round(Math.min(target.bounty*.7,50000000));p.money+=reward;j.captures++;j.bountiesClaimed+=reward;adjustRep('Marine',3);adjustRep('Civil',2);var rec=careerRecord();rec.xp+=10+Math.round(target.power/5);p.reputation+=5;tl('Prime encaissée',target.name+' est capturé. Récompense : '+reward.toLocaleString('fr-FR')+' B.','major');news('Capture de '+target.name,p.name+' remet cet équipage aux autorités.','major')}else tl('Cible échappée',target.name+' échappe à ta tentative de capture.','danger');save();render()
}
function pirateMissionCrimeSeverity(m){
 var title=String(m&&m.title||''),tier=m&&m.tier||0;if(/Piller|Raid contre|Voler|Prendre le contrôle/i.test(title))return tier>=4?5:tier>=2?3:2;if(/Affronter/i.test(title))return Math.max(2,Math.min(4,tier+1));if(m&&m.worldGenerated&&(m.sourceType==='conflict'||m.sourceType==='crew'))return Math.max(2,Math.min(4,tier+1));return 0
}
function justiceMissionImpact(ok,m){
 var p=game.player;if(!ok)return;if(p.faction==='Pirates'){var sev=pirateMissionCrimeSeverity(m);if(sev>0)registerCrime(m.title,sev,null);updatePirateThreatBounty(m)}
 else if(p.faction==='Révolutionnaires'&&/(Saboter|Libérer|Infiltrer)/i.test(m.title))registerCrime(m.title,m.tier>=4?5:3,null);
 else if(p.faction==='Chasseur de primes'){var j=migrateJustice(p),mp=missionProfile(m),title=String(m&&m.title||''),isCapture=mp.id==='hunt'||/^(?:Traquer|Capturer)\b|Contrat sur une cible|prime à capturer/i.test(title);j.notoriety=cl(j.notoriety-1,0,100);if(isCapture){j.captures++;j.bountiesClaimed+=Math.max(0,Math.round((m&&m.reward)||0))}}
}


function defaultInfluence(){return{score:0,fame:0,infamy:0,peak:0,titles:[],primaryTitle:'Inconnu des mers',domains:[],affiliates:[],actions:1,totalDomainIncome:0,recognizedTitle:null,history:[]}}
function migrateInfluence(p){p.influence=p.influence||defaultInfluence();var x=p.influence;x.score=x.score||0;x.fame=x.fame||0;x.infamy=x.infamy||0;x.peak=x.peak||0;x.titles=x.titles||[];x.primaryTitle=x.primaryTitle||'Inconnu des mers';x.domains=x.domains||[];x.affiliates=x.affiliates||[];x.actions=x.actions==null?1:x.actions;x.totalDomainIncome=x.totalDomainIncome||0;x.recognizedTitle=x.recognizedTitle||null;x.history=x.history||[];return x}
function dynastyKey(){return String(game.seed)}
function syncInfluenceOwnership(){
 var p=game.player,x=migrateInfluence(p),key=dynastyKey();x.domains=Object.keys(game.world.territories).filter(function(n){var c=game.world.territories[n].playerControl;return c&&c.ownerKey===key});x.affiliates=game.world.crews.filter(function(c){return c.affiliation&&c.affiliation.ownerKey===key&&c.status==='active'}).map(function(c){return c.id});return x
}
function domainLabel(f){return f==='Pirates'?'Territoire sous protection':f==='Marine'?'Zone de commandement':f==='Révolutionnaires'?'Réseau révolutionnaire':f==='Gouvernement'?'District administré':f==='Chasseur de primes'?'Zone de chasse':'Comptoir commercial'}
function publicImage(){
 var x=migrateInfluence(game.player);if(x.infamy>x.fame+18)return'Redouté';if(x.fame>x.infamy+20)return'Admiré';if(x.score>=70)return'Incontournable';if(x.score>=40)return'Connu';return'Discret'
}
function influenceMetrics(){
 var p=game.player,x=syncInfluenceOwnership(),org=p.organization,ach=Object.keys((game.achievements&&game.achievements.unlocked)||{}).length,crime=(p.justice&&p.justice.crimes||[]).reduce(function(a,c){return a+(c.witnessed?c.severity:0)},0);
 var fame=cl((p.reputation||0)*1.15+(p.wins||0)*1.2+(org?org.renown*.42:0)+(p.justice?p.justice.captures*3:0)+ach*1.7+x.domains.length*5,0,100);
 var infamy=cl(Math.log10(Math.max(1,(p.bounty||0)+1))*9+crime*.75+(p.justice?p.justice.escapes*8:0)+x.domains.filter(function(n){var t=game.world.territories[n];return t&&t.playerControl&&t.playerControl.mode==='conquest'}).length*5,0,100);
 var bestRep=Math.max.apply(null,Object.keys(p.factionRep||{}).map(function(k){return p.factionRep[k]||0}).concat([0])),score=cl(power()*.24+fame*.22+(org?org.renown*.16:0)+bestRep*.12+x.domains.length*7+x.affiliates.length*4,0,100);
 x.fame=fame;x.infamy=infamy;x.score=score;x.peak=Math.max(x.peak||0,score);return x
}
function addTitle(t){
 var x=migrateInfluence(game.player);if(x.titles.indexOf(t)>=0)return false;x.titles.push(t);x.primaryTitle=t;x.history.unshift({age:age(),title:t});x.history=x.history.slice(0,30);tl('Nouveau titre',game.player.name+' est désormais connu comme « '+t+' ».','major');news('Un nouveau nom circule',game.player.name+' gagne le titre « '+t+' ».','major');return true
}
function sagaPlayerRoleRank(role){return{present:0,indirect:1,participant:2,decisive:3,responsible:4}[role]||0}
function registerPlayerSagaImpact(kind,source,amount,targetSagaId){
 var p=game.player,ws=game.world.worldState||{},sagas=(ws.worldSagas||[]).filter(function(s){return s.status==='active'&&s.region===p.region&&(!targetSagaId||s.id===targetSagaId)}),minRole=kind||'indirect',gain=Math.max(0,amount==null?4:amount);
 sagas.forEach(function(s){var before=s.playerRole||'present';s.playerPeakPower=Math.max(s.playerPeakPower||0,Math.round(power()));s.playerFaction=p.faction;s.playerImpact=cl((s.playerImpact||0)+gain,0,100);s.playerSources=Array.isArray(s.playerSources)?s.playerSources:[];if(source)s.playerSources.push(source);s.playerSources=s.playerSources.slice(-8);
  var earned=s.playerImpact>=55?'decisive':s.playerImpact>=22?'participant':s.playerImpact>=6?'indirect':'present';if(sagaPlayerRoleRank(minRole)>sagaPlayerRoleRank(earned))earned=minRole;if(sagaPlayerRoleRank(earned)>sagaPlayerRoleRank(before))s.playerRole=earned;else s.playerRole=before;
  if(s.playerRole==='responsible')s.playerResponsible=true;s.playerInvolved=sagaPlayerRoleRank(s.playerRole)>=1;
  if(sagaPlayerRoleRank(s.playerRole)>sagaPlayerRoleRank(before)&&sagaPlayerRoleRank(s.playerRole)>=2)news('Ton rôle grandit dans une saga',p.name+' devient '+(s.playerRole==='responsible'?'l’une des causes déterminantes':s.playerRole==='decisive'?'un acteur décisif':'un participant réel')+' de '+s.title+'.','major')
 });return sagas.length
}
function playerSagaPresence(){
 var p=game.player,ws=game.world.worldState||{},sagas=(ws.worldSagas||[]).filter(function(s){return s.status==='active'&&s.region===p.region});sagas.forEach(function(s){s.playerPresenceMonths=(s.playerPresenceMonths||0)+1;s.playerPeakPower=Math.max(s.playerPeakPower||0,Math.round(power()));s.playerFaction=p.faction;if(!s.playerRole)s.playerRole='present';var aligned=s.a===p.faction||s.b===p.faction;s.playerAlignment=aligned?'aligned':'independent'})
}
function missionSagaTargetFor(m,p,w){
 if(!m||!m.worldGenerated||!p||!w)return null;var ws=w.worldState||{},allSagas=(ws.worldSagas||[]).filter(function(s){return s.status==='active'}),sagas=allSagas.filter(function(s){return s.region===p.region}),source=null;
 if(m.sagaId)return allSagas.find(function(s){return s.id===m.sagaId})||null;
 if(m.sourceType==='saga')return sagas.find(function(s){return s.id===m.sourceId})||null;
 if(m.sourceType==='conflict')source=(w.conflicts||[]).find(function(x){return x.id===m.sourceId});
 else if(m.sourceType==='crew')source=(w.crews||[]).find(function(x){return x.id===m.sourceId});
 else if(m.sourceType==='actor')source=(w.actors||[]).find(function(x){return x.name===m.sourceId});
 if(!source||!sagas.length)return null;
 var ranked=sagas.map(function(s){var score=0;
  if(m.sourceType==='conflict'){if(String(s.source||'')===String(source.warId||source.id||''))score+=8;if(s.a===source.attacker||s.b===source.attacker)score+=3;if(s.a===source.defender||s.b===source.defender)score+=3}
  else if(m.sourceType==='crew'){if(s.a===source.name||s.b===source.name)score+=7;if(s.a===source.faction||s.b===source.faction)score+=3}
  else if(m.sourceType==='actor'){if(s.a===source.name||s.b===source.name)score+=7;if(s.a===source.faction||s.b===source.faction)score+=3}
  return{s:s,score:score+(s.pressure||0)/1000}
 }).filter(function(x){return x.score>=2}).sort(function(a,b){return b.score-a.score});
 return ranked.length?ranked[0].s:null
}
function missionSagaTarget(m){return missionSagaTargetFor(m,game.player,game.world)}
function factionCareerLegacy(){
 var p=game.player,f=p.faction||'Civil',v=0;
 if(f==='Pirates')v=Math.min(18,Math.log10(Math.max(1,(p.bounty||0)+1))*2.1);
 else if(f==='Marine')v=['Vice-amiral','Amiral'].indexOf(p.rank)>=0?18:Math.min(14,rankIndex()*2.5);
 else if(f==='Révolutionnaires')v=['Commandant régional','Bras droit'].indexOf(p.rank)>=0?18:Math.min(14,rankIndex()*2.5);
 else if(f==='Gouvernement')v=p.rank==='CP0'?18:p.rank==='Candidat CP0'?14:Math.min(12,rankIndex()*2);
 else if(f==='Chasseur de primes')v=Math.min(22,((p.justice&&p.justice.captures)||0)*.72+Math.log10(Math.max(1,((p.justice&&p.justice.bountiesClaimed)||0)+1))*1.05);
 else v=Math.min(20,careerExpertise(p.specialization)*.13+Math.log10(Math.max(1,netWorth()+1)));
 return v
}
function careerLifetimeEvidence(){
 var p=game.player,records=p.careerRecords||{},months=0,distinctions=0,legendDistinctions=0,successes=0,failures=0,paths=0;
 Object.keys(records).forEach(function(f){var r=records[f]||{},rm=Math.max(0,r.months||0),rs=Math.max(0,r.successes||0),rf=Math.max(0,r.failures||0),rd=r.distinctions==null?Math.min(20,Math.floor(rs/6)):Math.max(0,r.distinctions||0),rld=r.legendDistinctions==null?rd:Math.max(0,r.legendDistinctions||0);months+=rm;successes+=rs;failures+=rf;distinctions+=rd;legendDistinctions+=rld;if(rm>0||rs+rf>0)paths++});
 return{careerYears:Math.round(months/12*10)/10,distinctions:cl(distinctions,0,30),legendDistinctions:cl(legendDistinctions,0,30),successes:successes,failures:failures,careerPaths:paths}
}
function organicLegendEvidence(){
 var p=game.player,lifetime=careerLifetimeEvidence(),loop=migrateLifeLoop(game),director=migrateLifeDirector(p),ws=game.world.worldState||{},history=(ws.sagaHistory||[]).filter(function(s){return s.playerInvolved}),decisive=history.filter(function(s){return sagaPlayerRoleRank(s.playerRole||'indirect')>=3}).length,canon=(ws.playerCanonImpact||[]).length,strongChapters=[].concat(director.chapterHistory||[],director.activeChapters||[]).filter(function(ch,i,a){return(ch.score||0)>=45&&(ch.beats||0)>=2&&a.findIndex(function(x){return x.id===ch.id})===i}).length,highMoments=(loop.signatureMoments||[]).filter(function(x){return(x.weight||0)>=80}).length,founding=(loop.foundingMemories||[]).length,careerYears=lifetime.careerYears,missionCount=lifetime.successes+lifetime.failures,successRate=missionCount?lifetime.successes/missionCount:0,missionExcellence=careerYears>=20&&missionCount>=28&&successRate>=.75?Math.min(6,Math.max(0,missionCount-24)*.3+Math.max(0,successRate-.75)*8):0,routeSpecialty=['Navigateur','Navigation','Traqueur','Investigateur'].indexOf(p.specialization)>=0,visitedCount=(p.visited||[]).filter(function(x,i,a){return a.indexOf(x)===i}).length,journeyEvidence=careerYears>=20&&routeSpecialty?Math.min(10,Math.max(0,visitedCount-5)*2):0,supportingLegacy=lifetime.legendDistinctions>=2||strongChapters>=2||founding>=2||highMoments>=2||decisive>=1||canon>=1||journeyEvidence>=6,veteranExcellence=careerYears>=30&&missionCount>=32&&successRate>=.8&&supportingLegacy?Math.min(10,4+Math.max(0,careerYears-30)*.3+Math.max(0,missionCount-32)*.12+Math.max(0,successRate-.8)*11):0;
 var rawScore=Math.min(24,lifetime.legendDistinctions*2.5)+Math.min(16,strongChapters*2.7)+Math.min(15,founding*5)+Math.min(12,highMoments*2)+Math.min(15,decisive*5)+Math.min(10,canon*2)+Math.min(8,Math.max(0,careerYears-20)*.4)+journeyEvidence+missionExcellence+veteranExcellence,score=Math.max(rawScore,director.legendEvidencePeak||0),distinctiveCurrent=decisive>=1||canon>=1||journeyEvidence>=6||strongChapters>=3;if(distinctiveCurrent)director.legendDistinctivePeak=true;var distinctiveEvidence=!!director.legendDistinctivePeak;director.legendEvidencePeak=Math.max(director.legendEvidencePeak||0,Math.round(cl(rawScore,0,100)*10)/10);
 var gate=false,f=p.faction||'Civil',ri=rankIndex();
 if(f==='Pirates')gate=ri>=4||(p.bounty||0)>=300000000||decisive>=1;
 else if(f==='Marine')gate=ri>=5||decisive>=1;
 else if(f==='Révolutionnaires')gate=ri>=4||decisive>=1;
 else if(f==='Gouvernement')gate=ri>=4||p.rank==='CP9'||p.rank==='Candidat CP0'||p.rank==='CP0'||decisive>=1;
 else if(f==='Chasseur de primes')gate=((p.justice&&p.justice.captures)||0)>=8||decisive>=1||(p.rank==='Maître chasseur'&&careerYears>=30&&missionCount>=32&&successRate>=.85&&journeyEvidence>=6);
 else gate=careerExpertise(p.specialization)>=70||netWorth()>=2000000;
 var roundedScore=Math.round(cl(score,0,100)),qualificationThreshold=careerYears<25?65:58;
 return{score:roundedScore,rawScore:Math.round(cl(rawScore,0,100)*10)/10,peakScore:Math.round(cl(director.legendEvidencePeak||0,0,100)*10)/10,qualified:roundedScore>=qualificationThreshold&&gate&&distinctiveEvidence,qualificationThreshold:qualificationThreshold,gate:gate,distinctiveEvidence:distinctiveEvidence,distinctiveCurrent:distinctiveCurrent,distinctions:lifetime.distinctions,legendDistinctions:lifetime.legendDistinctions,strongChapters:strongChapters,founding:founding,highMoments:highMoments,decisiveSagas:decisive,canonImpact:canon,careerYears:careerYears,careerPaths:lifetime.careerPaths,missionCount:missionCount,missionSuccessRate:Math.round(successRate*1000)/1000,journeyEvidence:Math.round(journeyEvidence*10)/10,visitedCount:visitedCount,missionExcellence:Math.round(missionExcellence*10)/10,veteranExcellence:Math.round(veteranExcellence*10)/10}
}
function playerWorldRecognition(){
 var p=game.player,x=influenceMetrics(),ws=game.world.worldState||{},active=(ws.worldSagas||[]).filter(function(s){return s.status==='active'&&s.playerInvolved}),history=(ws.sagaHistory||[]).filter(function(s){return s.playerInvolved}),canon=(ws.playerCanonImpact||[]).length,domains=x.domains.length,allies=x.affiliates.length,rep=p.factionRep&&p.factionRep[p.faction]||0;
 var sagaWeight=history.reduce(function(a,s){var r=sagaPlayerRoleRank(s.playerRole||'indirect');return a+(r>=4?4:r===3?3:r===2?1.8:.8)},0)+active.reduce(function(a,s){return a+(sagaPlayerRoleRank(s.playerRole||'indirect')>=2?1:.35)},0),decisive=history.filter(function(s){return sagaPlayerRoleRank(s.playerRole||'indirect')>=3}).length;
 var legacy=factionCareerLegacy(),organicEvidence=organicLegendEvidence(),evidenceBonus=organicEvidence.qualified?Math.min(30,organicEvidence.score*.46):Math.min(8,organicEvidence.score*.10),worldScore=cl(x.score*.52+power()*.22+domains*3.8+allies*2.2+Math.min(14,sagaWeight)+Math.min(10,canon*1.35)+Math.min(9,rep*.09)+legacy+evidenceBonus,0,100),role='Figure régionale',traditionalQualified=false;
 if(p.faction==='Pirates')traditionalQualified=domains>=3||allies>=3;
 else if(p.faction==='Marine')traditionalQualified=rep>=85&&(['Vice-amiral','Amiral'].indexOf(p.rank)>=0||decisive>=2);
 else if(p.faction==='Révolutionnaires')traditionalQualified=rep>=80&&(['Commandant régional','Bras droit'].indexOf(p.rank)>=0||decisive>=2);
 else if(p.faction==='Gouvernement')traditionalQualified=rep>=85&&(p.rank==='CP0'||p.rank==='Candidat CP0'||decisive>=2);
 else if(p.faction==='Chasseur de primes')traditionalQualified=!!(p.justice&&p.justice.captures>=12);
 else traditionalQualified=careerExpertise(p.specialization)>=85||netWorth()>=5000000;
 var legendQualified=traditionalQualified||organicEvidence.qualified,legendThreshold=traditionalQualified?88:84;
 if(worldScore>=legendThreshold&&legendQualified)role=p.faction==='Pirates'?'Puissance pirate mondiale':p.faction==='Marine'?'Pilier de l’ordre mondial':p.faction==='Révolutionnaires'?'Symbole de la Révolution':p.faction==='Gouvernement'?'Autorité mondiale':p.faction==='Chasseur de primes'?'Légende des primes':'Icône des mers';
 else if(worldScore>=72)role='Puissance établie';else if(worldScore>=52)role='Acteur majeur';
 return{score:Math.round(worldScore),role:role,activeSagas:active.length,resolvedSagas:history.length,canonImpact:canon,domains:domains,allies:allies,decisiveSagas:decisive,legendQualified:legendQualified,traditionalLegendQualified:traditionalQualified,organicLegendQualified:organicEvidence.qualified,legendThreshold:legendThreshold,careerLegacy:Math.round(legacy),organicEvidence:organicEvidence}
}
var DESTINY_SPEC={
 Marchand:{title:'Architecte du commerce',profile:'trade',mastery:'Devenir une référence commerciale',service:'Bâtir un réseau de contrats',signature:'Conclure des affaires d’exception',world:'Édifier une fortune qui pèse sur les mers'},
 Médecin:{title:'Médecin de légende',profile:'medicine',mastery:'Maîtriser la médecine au plus haut niveau',service:'Sauver des vies sous pression',signature:'Intervenir dans des crises majeures',world:'Devenir une référence médicale mondiale'},
 Médecine:{title:'Médecin de légende',profile:'medicine',mastery:'Maîtriser la médecine au plus haut niveau',service:'Sauver des vies sous pression',signature:'Intervenir dans des crises majeures',world:'Devenir une référence médicale mondiale'},
 Navigateur:{title:'Maître des routes maritimes',profile:'navigation',mastery:'Maîtriser la navigation',service:'Accumuler les grandes traversées',signature:'Survivre aux routes les plus dangereuses',world:'Connaître les mers comme peu de vivants'},
 Navigation:{title:'Maître des routes maritimes',profile:'navigation',mastery:'Maîtriser la navigation',service:'Accumuler les grandes traversées',signature:'Survivre aux routes les plus dangereuses',world:'Connaître les mers comme peu de vivants'},
 Scientifique:{title:'Esprit qui change une époque',profile:'science',mastery:'Atteindre l’excellence scientifique',service:'Résoudre des problèmes complexes',signature:'Participer à des découvertes majeures',world:'Laisser une trace intellectuelle mondiale'},
 Artisan:{title:'Maître artisan',profile:'science',mastery:'Atteindre une maîtrise exceptionnelle',service:'Produire sous toutes les contraintes',signature:'Créer des œuvres reconnues',world:'Faire de son savoir-faire une référence'},
 Cuisinier:{title:'Maître des cuisines des mers',profile:'medicine',mastery:'Atteindre une maîtrise exceptionnelle',service:'Servir dans les situations les plus exigeantes',signature:'Marquer les équipages et les puissants',world:'Devenir une référence des mers'},
 Combat:{title:'Force qui impose le respect',profile:'combat',mastery:'Atteindre l’élite du combat',service:'Remporter des affrontements majeurs',signature:'Triompher quand l’issue est incertaine',world:'Être reconnu parmi les puissances du monde'},
 Combattant:{title:'Force qui impose le respect',profile:'combat',mastery:'Atteindre l’élite du combat',service:'Remporter des affrontements majeurs',signature:'Triompher quand l’issue est incertaine',world:'Être reconnu parmi les puissances du monde'},
 Duelliste:{title:'Duelliste de légende',profile:'combat',mastery:'Porter son art du duel au sommet',service:'Vaincre des adversaires reconnus',signature:'Remporter des duels impossibles',world:'Être craint ou respecté sur toutes les mers'},
 Tireur:{title:'Tireur d’exception',profile:'hunt',mastery:'Atteindre une précision d’élite',service:'Réussir des opérations sous pression',signature:'Faire la différence dans les missions critiques',world:'Devenir une référence mondiale du tir'},
 Renseignement:{title:'Maître du renseignement',profile:'stealth',mastery:'Maîtriser l’information et la discrétion',service:'Réussir des opérations clandestines',signature:'Peser sur des affaires décisives sans être vu',world:'Devenir une ombre que les puissances doivent considérer'},
 Infiltration:{title:'Fantôme des grandes puissances',profile:'stealth',mastery:'Atteindre une maîtrise exceptionnelle de l’infiltration',service:'Traverser les dispositifs les plus surveillés',signature:'Réussir des opérations classées impossibles',world:'Infléchir le monde depuis l’ombre'},
 Investigateur:{title:'Traqueur de vérités',profile:'stealth',mastery:'Atteindre une expertise d’enquête exceptionnelle',service:'Résoudre des affaires complexes',signature:'Faire tomber des cibles majeures',world:'Devenir une référence des enquêtes'},
 Traqueur:{title:'Chasseur légendaire',profile:'hunt',mastery:'Atteindre une maîtrise exceptionnelle de la traque',service:'Multiplier les captures difficiles',signature:'Faire tomber des cibles d’élite',world:'Devenir le nom que les fugitifs redoutent'},
 Administration:{title:'Architecte du pouvoir',profile:'command',mastery:'Maîtriser les rouages de l’autorité',service:'Diriger des opérations complexes',signature:'Prendre des décisions à portée mondiale',world:'Devenir une autorité impossible à ignorer'},
 Logistique:{title:'Colonne vertébrale d’une armée',profile:'command',mastery:'Maîtriser la logistique stratégique',service:'Maintenir des opérations de grande ampleur',signature:'Sauver des campagnes par l’organisation',world:'Devenir indispensable à une puissance majeure'},
 'Quartier-maître':{title:'Pilier d’un grand équipage',profile:'command',mastery:'Maîtriser la logistique d’équipage',service:'Faire tenir le groupe dans la durée',signature:'Soutenir des opérations majeures',world:'Devenir indispensable à un pavillon historique'},
 'Cipher Pol':{title:'Agent de l’ombre absolue',profile:'mixed',mastery:'Atteindre le niveau des meilleurs agents',service:'Réussir des opérations classifiées',signature:'Accomplir des missions que le monde ne doit jamais connaître',world:'Devenir une autorité secrète du Gouvernement'}
};
function defaultDestiny(){return{phase:0,phasePeak:0,lastPhaseAge:-999,completed:[],history:[],evidence:{profiles:{},missions:0,signatureMissions:0,worldMissions:0,destinyMissions:0,decisiveMissions:0,highRiskSuccesses:0},lastWorldOfferBucket:-1,worldReactions:{history:[],lastAge:-999,lastBucket:-1,accepted:0,refused:0,negotiated:0,hostileWins:0,hostileLosses:0}}}
function migrateDestiny(p){
 p.destiny=p.destiny||defaultDestiny();var d=p.destiny;d.phase=d.phase||0;d.phasePeak=d.phasePeak||d.phase||0;d.lastPhaseAge=d.lastPhaseAge==null?-999:d.lastPhaseAge;d.completed=Array.isArray(d.completed)?d.completed:[];d.history=Array.isArray(d.history)?d.history.slice(-20):[];d.evidence=d.evidence||{};d.evidence.profiles=d.evidence.profiles||{};['missions','signatureMissions','worldMissions','destinyMissions','decisiveMissions','highRiskSuccesses'].forEach(function(k){d.evidence[k]=d.evidence[k]||0});d.lastWorldOfferBucket=d.lastWorldOfferBucket==null?-1:d.lastWorldOfferBucket;d.worldReactions=d.worldReactions||{history:[],lastAge:-999,lastBucket:-1,accepted:0,refused:0,negotiated:0,hostileWins:0,hostileLosses:0};var wr=d.worldReactions;wr.history=Array.isArray(wr.history)?wr.history.slice(0,16):[];wr.lastAge=wr.lastAge==null?-999:wr.lastAge;wr.lastBucket=wr.lastBucket==null?-1:wr.lastBucket;wr.accepted=wr.accepted||0;wr.refused=wr.refused||0;wr.negotiated=wr.negotiated||0;wr.hostileWins=wr.hostileWins||0;wr.hostileLosses=wr.hostileLosses||0;return d
}
function destinyProfile(){
 var p=game.player,sp=p.specialization||'',base=DESTINY_SPEC[sp];if(base)return base;
 if(p.faction==='Pirates')return DESTINY_SPEC.Combattant;if(p.faction==='Marine')return DESTINY_SPEC.Combat;if(p.faction==='Révolutionnaires'||p.faction==='Gouvernement')return DESTINY_SPEC.Renseignement;if(p.faction==='Chasseur de primes')return DESTINY_SPEC.Traqueur;return DESTINY_SPEC.Marchand
}
function lifeImportanceStage(){
 var p=game.player,d=migrateDestiny(p),rec=p.career!=='Aucune'?careerRecord():null,x=p.ageMonths>=180?influenceMetrics():{score:0},track=p.career!=='Aucune'?careerTrack(p.faction,p.specialization):[],ri=p.career!=='Aucune'?rankIndex():0,rankRatio=track.length>1?ri/(track.length-1):0,mastery=p.career==='Aucune'?Math.max(power(),careerExpertise(p.specialization||null)):Math.max(careerExpertise(p.specialization),power()*(specProfile(p.specialization)&&specProfile(p.specialization).combatWeight>=.55?1:.45)),careerYears=rec?Math.min(1,(rec.months||0)/240):0,score=cl(rankRatio*30+mastery*.30+(x.score||0)*.27+careerYears*13,0,100),phase=score>=88?4:score>=70?3:score>=48?2:score>=27?1:0,labels=['Émergence','Établissement','Élite','Puissance mondiale','Légende vivante'];
 if(p.ageMonths<180){phase=0;score=Math.min(score,20)}d.phase=phase;var visible=Math.max(d.phasePeak||0,phase);return{index:visible,label:labels[visible],score:Math.round(score),current:phase,labels:labels}
}
function destinyWorldAttention(){
 var st=lifeImportanceStage(),r=playerWorldRecognition(),p=game.player,o=p.organization,base=st.index*16+(r.score||0)*.42+(o?o.renown*.12:0);return cl(base,0,100)
}
function migrateWorldReactions(p){return migrateDestiny(p||game.player).worldReactions}
function worldReactionAttentionLabel(v){return v>=82?'Le monde te surveille':v>=65?'Très forte':v>=48?'Importante':v>=30?'Croissante':'Faible'}
function worldReactionTypeLabel(type){return type==='alliance'?'Alliance proposée':type==='solicitation'?'Sollicitation':type==='challenge'?'Défi direct':type==='surveillance'?'Surveillance':'Proposition'}
function worldReactionSourceKey(c){return(c.sourceKind||'faction')+':'+String(c.sourceId||c.sourceName||c.sourceFaction||'world')}
function worldReactionCandidate(bucket){
 var p=game.player,stage=lifeImportanceStage(),attention=destinyWorldAttention(),actors=(game.world.actors||[]).filter(function(a){return a.status==='active'&&a.region===p.region}),crews=(game.world.crews||[]).filter(function(c){return c.status==='active'&&c.region===p.region&&(!p.organization||c.id!==p.organization.worldCrewId)}),items=[];
 actors.forEach(function(a){var dip=diplomacy(p.faction,a.faction),pow=actorPower(a),type=dip<=-35?(attention>=62?'challenge':'surveillance'):dip>=25?'alliance':'solicitation',weight=1+Math.min(1.8,pow/70)+(a.faction===p.faction?.8:0)+(type==='challenge'?.45:0);items.push({sourceKind:'actor',sourceId:a.name,sourceName:a.name,sourceFaction:a.faction,sourcePower:pow,type:type,weight:weight})});
 crews.forEach(function(c){var dip=diplomacy(p.faction,c.faction),type=dip<=-35?(attention>=68?'challenge':'surveillance'):dip>=20?'alliance':'solicitation',weight=.8+Math.min(1.5,(c.power||20)/75)+(c.faction===p.faction?.55:0);items.push({sourceKind:'crew',sourceId:c.id,sourceName:c.name,sourceFaction:c.faction,sourcePower:c.power||25,type:type,weight:weight})});
 if(!items.length){var factions=FACTION_KEYS.filter(function(f){return f!==p.faction}),f=factions[(H(String(game.seed)+':reaction-faction:'+bucket)%Math.max(1,factions.length))]||'Civil',dip=diplomacy(p.faction,f),type=dip<=-35?'surveillance':dip>=25?'alliance':'solicitation';items.push({sourceKind:'faction',sourceId:f,sourceName:CAREERS[f]?CAREERS[f].label:f,sourceFaction:f,sourcePower:35+stage.index*8,type:type,weight:1})}
 var total=items.reduce(function(a,x){return a+x.weight},0),r=(H(String(game.seed)+':reaction-pick:'+bucket)%10000)/10000*total,chosen=items[0];for(var i=0;i<items.length;i++){r-=items[i].weight;if(r<=0){chosen=items[i];break}}
 chosen.region=p.region;chosen.bucket=bucket;chosen.attention=Math.round(attention);chosen.stage=stage.index;chosen.id='reaction-'+bucket+'-'+H(worldReactionSourceKey(chosen)+':'+chosen.type);return chosen
}
function worldReactionActor(c){if(!c||c.sourceKind!=='actor')return null;return(game.world.actors||[]).find(function(a){return a.name===c.sourceId})||null}
function worldReactionCrew(c){if(!c||c.sourceKind!=='crew')return null;return(game.world.crews||[]).find(function(x){return x.id===c.sourceId})||null}
function worldReactionRelation(c,context){var a=worldReactionActor(c);return a?bondCanonicalActor(a,context||('Réaction du monde : '+worldReactionTypeLabel(c.type))):null}
function worldReactionChapterTitle(c,outcome){
 var n=c&&c.sourceName||c&&c.sourceFaction||'une puissance',o=String(outcome||'');
 if(o==='accord négocié')return'Accord négocié avec '+n;
 if(o==='coopération acceptée')return'Coopération reconnue par '+n;
 if(o==='négociation refusée')return'Bras de fer diplomatique avec '+n;
 if(o==='refus')return'Indépendance affirmée face à '+n;
 if(o==='défi remporté')return'Victoire de prestige contre '+n;
 if(o==='défi perdu')return'Défi de prestige face à '+n;
 if(o==='tension désamorcée')return'Tension désamorcée avec '+n;
 if(o==='désescalade échouée')return'Pression persistante de '+n;
 if(o==='réaction ignorée')return'Distance imposée à '+n;
 return worldReactionTypeLabel(c&&c.type)+' — '+n
}
function recordWorldReaction(c,outcome,impact){
 var p=game.player,wr=migrateWorldReactions(p),item={id:c.id,age:age(),ageMonths:p.ageMonths,type:c.type,sourceKind:c.sourceKind,sourceId:c.sourceId,sourceName:c.sourceName,sourceFaction:c.sourceFaction,outcome:outcome,impact:impact||0,attention:c.attention||Math.round(destinyWorldAttention())};wr.history.unshift(item);wr.history=wr.history.slice(0,16);wr.lastAge=p.ageMonths;
 rememberCausalMemory('world-reaction',worldReactionTypeLabel(c.type)+' — '+c.sourceName,cl(48+(impact||0)*4,48,88),{kind:'world-reaction',subjectId:c.sourceId||c.sourceFaction,sourceFaction:c.sourceFaction,outcome:outcome,region:p.region},'world-reaction:'+c.id);
 if((impact||0)>=5)signalPersonalChapter('world',worldReactionChapterTitle(c,outcome),10+impact,'world-reaction:'+c.id,c.sourceId||c.sourceFaction);return item
}
function worldReactionPositive(c,mode){
 var p=game.player,wr=migrateWorldReactions(p),r=worldReactionRelation(c,'Une puissance te contacte directement à cause de ta stature.'),org=p.organization,bonus=mode==='negotiate'?2:0;
 p.reputation=cl((p.reputation||0)+2+bonus,0,100);adjustRep(p.faction,1+bonus);if(c.sourceFaction)adjustRep(c.sourceFaction,1+bonus);if(org)org.renown=cl((org.renown||0)+1.5+bonus,0,100);if(r){r.respect=cl(r.respect+4+bonus,0,100);r.trust=cl(r.trust+3+bonus,0,100);addRelationMemory(r,'Tu réponds favorablement à une sollicitation importante.','world-reaction')}
 var crew=worldReactionCrew(c);if(crew){crew.morale=cl((crew.morale||50)+2+bonus,0,100);crew.playerGrudge=cl((crew.playerGrudge||0)-4,0,100)}
 wr.accepted++;if(mode==='negotiate')wr.negotiated++;var payment=mode==='negotiate'?Math.round(8000+destinyWorldAttention()*520+c.stage*9000):0;if(payment){p.money+=payment;tl('Accord avantageux',c.sourceName+' accepte tes conditions. +'+payment.toLocaleString('fr-FR')+' B.','major')}else tl('Influence reconnue',c.sourceName+' choisit désormais de composer directement avec toi.','major');
 recordWorldReaction(c,mode==='negotiate'?'accord négocié':'coopération acceptée',6+bonus);scheduleConsequence('world-reaction',c.sourceName,'Cette coopération peut encore produire des conséquences.',6+R('memory')*8,{success:true,sourceKind:c.sourceKind,sourceId:c.sourceId,sourceFaction:c.sourceFaction},70,'reaction:'+c.id);return true
}
function worldReactionNegotiate(c){
 var p=game.player,command=p.skills.Commandement||0,standing=(p.reputation||0)*.35+command*.45+lifeImportanceStage().index*7,opposition=(c.sourcePower||40)*.55+35,ch=cl(.36+(standing-opposition)/110,.16,.88);
 if(R('reaction')<ch)return worldReactionPositive(c,'negotiate');var r=worldReactionRelation(c,'Une négociation ambitieuse échoue.');if(r){r.trust=cl(r.trust-3,0,100);r.respect=cl(r.respect+1,0,100)}var crew=worldReactionCrew(c);if(crew)crew.playerGrudge=cl((crew.playerGrudge||0)+3,0,100);migrateWorldReactions(p).negotiated++;recordWorldReaction(c,'négociation refusée',2);tl('Négociation refusée',c.sourceName+' refuse tes conditions, mais la discussion reste ouverte.');return false
}
function worldReactionRefuse(c){
 var p=game.player,wr=migrateWorldReactions(p),r=worldReactionRelation(c,'Tu refuses une sollicitation liée à ta stature.');wr.refused++;if(r){r.trust=cl(r.trust-2,0,100);if(c.type==='alliance')r.respect=cl(r.respect-1,0,100)}var crew=worldReactionCrew(c);if(crew)crew.playerGrudge=cl((crew.playerGrudge||0)+(c.type==='alliance'?2:1),0,100);recordWorldReaction(c,'refus',1);tl('Proposition refusée','Tu déclines la proposition de '+c.sourceName+'.');return true
}
function worldReactionConfront(c){
 var p=game.player,wr=migrateWorldReactions(p),r=worldReactionRelation(c,'Tu acceptes un affrontement provoqué par ta nouvelle stature.'),crew=worldReactionCrew(c),difficulty=cl((c.sourcePower||45)+(crew?Math.min(12,(crew.members||0)*.25):0),30,96),ok=fight(difficulty,'Défi de '+c.sourceName,r);
 if(!game.alive)return false;if(ok){wr.hostileWins++;p.reputation=cl((p.reputation||0)+4,0,100);if(p.organization)p.organization.renown=cl((p.organization.renown||0)+3,0,100);if(r){r.rivalry=cl(r.rivalry+8,0,100);r.respect=cl(r.respect+5,0,100);r.fear=cl(r.fear+5,0,100)}if(crew){crew.defeats=(crew.defeats||0)+1;crew.playerGrudge=cl((crew.playerGrudge||0)+8,0,100);crew.morale=cl((crew.morale||50)-4,0,100)}recordWorldReaction(c,'défi remporté',8);news('Une puissance répond à un défi',p.name+' repousse '+c.sourceName+' dans '+p.region+'.','major')}
 else{wr.hostileLosses++;if(r){r.rivalry=cl(r.rivalry+5,0,100);r.respect=cl(r.respect+1,0,100)}if(crew){crew.victories=(crew.victories||0)+1;crew.playerGrudge=cl((crew.playerGrudge||0)+5,0,100)}recordWorldReaction(c,'défi perdu',5)}
 return ok
}
function worldReactionDefuse(c){
 var p=game.player,skill=(p.skills.Commandement||0)*.28+(p.skills.Discrétion||0)*.24+(p.haki.Observation||0)*.14+(p.reputation||0)*.22+power()*.12,pressure=(c.sourcePower||45)*.64+22,ch=cl(.34+(skill-pressure)/105,.12,.86),r=worldReactionRelation(c,'Tu cherches à désamorcer une réaction hostile.'),crew=worldReactionCrew(c);
 if(R('reaction')<ch){if(r){r.rivalry=cl(r.rivalry-5,0,100);r.respect=cl(r.respect+3,0,100)}if(crew)crew.playerGrudge=cl((crew.playerGrudge||0)-4,0,100);var j=migrateJustice(p);j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)-4,0,100);recordWorldReaction(c,'tension désamorcée',6);tl('Rapport de force évité','Tu désamorces la pression de '+c.sourceName+' sans affrontement.','major');return true}
 if(r)r.rivalry=cl(r.rivalry+4,0,100);if(crew)crew.playerGrudge=cl((crew.playerGrudge||0)+4,0,100);recordWorldReaction(c,'désescalade échouée',3);tl('Tension persistante',c.sourceName+' ne se laisse pas impressionner.','danger');return false
}
function worldReactionAvoid(c){
 var p=game.player,wr=migrateWorldReactions(p),r=worldReactionRelation(c,'Tu refuses de répondre à une provocation liée à ta stature.');wr.refused++;if(r){r.rivalry=cl(r.rivalry+2,0,100);r.fear=cl(r.fear-1,0,100)}var crew=worldReactionCrew(c);if(crew)crew.playerGrudge=cl((crew.playerGrudge||0)+2,0,100);if(c.type==='surveillance'){var j=migrateJustice(p),evade=cl(((p.skills.Discrétion||0)+(p.stats.Agilité||0)+(p.haki.Observation||0))/300,0,.7);j.regionalHeat[p.region]=cl((j.regionalHeat[p.region]||0)-(2+evade*5),0,100)}recordWorldReaction(c,'réaction ignorée',1);tl('Tu gardes tes distances','Tu refuses de laisser '+c.sourceName+' dicter ton agenda.');return true
}
function triggerWorldReaction(c){
 var p=game.player,wr=migrateWorldReactions(p);wr.lastAge=p.ageMonths;var label=worldReactionTypeLabel(c.type),txt=c.type==='challenge'?c.sourceName+' te provoque directement. À ton niveau, refuser ou répondre devient aussi un message envoyé au reste du monde.':c.type==='surveillance'?c.sourceName+' commence à suivre tes mouvements de près. Ta réputation attire maintenant des contre-mesures.':c.sourceName+' cherche directement ton soutien. Ce genre de proposition n’aurait jamais existé au début de ta carrière.';
 if(c.type==='challenge'||c.type==='surveillance')decision(label,txt,[['Répondre au défi','Accepter le rapport de force et assumer les conséquences.',function(){worldReactionConfront(c)}],['Désamorcer','Utiliser ton expérience, ta réputation et tes compétences pour éviter l’affrontement.',function(){worldReactionDefuse(c)}],['Ignorer','Refuser de leur laisser contrôler ton agenda.',function(){worldReactionAvoid(c)}]]);
 else decision(label,txt,[['Accepter','Coopérer et renforcer ta place dans les réseaux du monde.',function(){worldReactionPositive(c,'accept')}],['Négocier','Tenter d’obtenir davantage grâce à ton Commandement et ta stature.',function(){worldReactionNegotiate(c)}],['Refuser','Préserver ton indépendance.',function(){worldReactionRefuse(c)}]]);
 return c
}
function worldReactionTick(m){
 var p=game.player;if(!game.alive||p.ageMonths<240||p.career==='Aucune'||game.pending||awaitingStory()||game.mission||p.travel||(p.justice&&p.justice.detained))return false;var stage=lifeImportanceStage();if(stage.index<2)return false;var wr=migrateWorldReactions(p),bucket=Math.floor(p.ageMonths/6);if(bucket===wr.lastBucket)return false;wr.lastBucket=bucket;var attention=destinyWorldAttention(),cooldown=cl(18-stage.index*2-attention/22,7,15);if(p.ageMonths-(wr.lastAge||-999)<cooldown)return false;var chance=cl(8+stage.index*5+attention*.10,12,34),roll=H(String(game.seed)+':world-reaction-roll:'+bucket+':'+p.faction)%100;if(roll>=chance)return false;return!!triggerWorldReaction(worldReactionCandidate(bucket))
}
function destinyTerminalRankReached(){
 var p=game.player;if(p.career==='Aucune')return false;if(p.faction==='Pirates'&&p.organization&&p.organization.pirateOrigin==='joined')return p.rank==='Bras droit';return !nextRank()
}
function careerDestinyMilestones(){
 var p=game.player,d=migrateDestiny(p),ev=d.evidence,prof=destinyProfile(),x=influenceMetrics(),expert=careerExpertise(p.specialization),combatWeighted=specProfile(p.specialization)&&specProfile(p.specialization).combatWeight>=.55,mastery=combatWeighted?Math.max(expert,power()):expert,profileCount=ev.profiles[prof.profile]||0,worldDone=false,worldProgress=0;
 if(p.specialization==='Marchand'){worldProgress=Math.min(100,netWorth()/8000000*100);worldDone=netWorth()>=8000000}
 else if(p.specialization==='Navigateur'||p.specialization==='Navigation'){worldProgress=Math.min(100,(p.visited||[]).length/18*100);worldDone=(p.visited||[]).length>=18}
 else if(p.specialization==='Traqueur'){worldProgress=Math.min(100,((p.justice&&p.justice.captures)||0)/12*100);worldDone=!!(p.justice&&p.justice.captures>=12)}
 else if(['Administration','Logistique','Quartier-maître'].indexOf(p.specialization)>=0){worldProgress=Math.min(100,Math.max(x.score,p.organization?p.organization.renown:0));worldDone=worldProgress>=80}
 else if(combatWeighted){worldProgress=Math.min(100,(power()*.55+x.score*.45));worldDone=power()>=85&&x.score>=72}
 else{worldProgress=Math.min(100,Math.max(x.score,(ev.decisiveMissions||0)*22));worldDone=x.score>=78||(ev.decisiveMissions||0)>=4}
 return[
  {id:'mastery',label:prof.mastery,done:mastery>=90,progress:Math.min(100,Math.round(mastery/90*100))},
  {id:'service',label:prof.service,done:profileCount>=12,progress:Math.min(100,Math.round(profileCount/12*100))},
  {id:'signature',label:prof.signature,done:(ev.signatureMissions||0)>=4||(ev.highRiskSuccesses||0)>=6,progress:Math.min(100,Math.round(Math.max((ev.signatureMissions||0)/4,(ev.highRiskSuccesses||0)/6)*100))},
  {id:'summit',label:'Atteindre le sommet de sa voie',done:destinyTerminalRankReached(),progress:Math.min(100,Math.round((rankIndex()+1)/Math.max(1,careerTrack(p.faction,p.specialization).length)*100))},
  {id:'world',label:prof.world,done:worldDone,progress:Math.round(worldProgress)}
 ]
}
function registerDestinyMissionEvidence(m,result,success){
 var p=game.player,d=migrateDestiny(p),ev=d.evidence,profile=missionProfile(m).id;ev.missions++;if(success){ev.profiles[profile]=(ev.profiles[profile]||0)+1;if(m.signature)ev.signatureMissions++;if(m.worldGenerated)ev.worldMissions++;if(m.destiny)ev.destinyMissions++;var imp=m.importance||missionImportance(m);if(imp>=72)ev.decisiveMissions++;if((result&&result.chance<.58)||(result&&result.effective>=68))ev.highRiskSuccesses++}evaluateDestinyProgress()
}
function completeDestinyMilestone(m){
 var p=game.player,d=migrateDestiny(p);if(d.completed.indexOf(m.id)>=0)return false;d.completed.push(m.id);d.history.unshift({age:age(),type:'milestone',id:m.id,label:m.label});d.history=d.history.slice(0,20);p.reputation=cl((p.reputation||0)+3,0,100);adjustRep(p.faction,2);var o=p.organization;if(o)o.renown=cl((o.renown||0)+2.5,0,100);var rec=careerRecord();rec.distinctions=cl((rec.distinctions||0)+1,0,30);recordSignatureMoment('Destinée — '+m.label,'Un accomplissement majeur confirme la trajectoire singulière de '+p.name+'.','destiny',82);signalPersonalChapter('career',destinyProfile().title,18,'destiny:'+m.id,p.faction);rememberCausalMemory('destiny',m.label,78,{kind:'destiny',subjectId:p.specialization||p.faction,region:p.region},'destiny:'+p.faction+':'+String(p.specialization)+':'+m.id);tl('ACCOMPLISSEMENT DE DESTINÉE',m.label+'.','major');return true
}
function evaluateDestinyProgress(){
 var p=game.player;if(p.ageMonths<180||p.career==='Aucune')return false;var d=migrateDestiny(p),before=d.phasePeak||0,stage=lifeImportanceStage(),changed=false;if(stage.index>before){d.phasePeak=stage.index;d.lastPhaseAge=p.ageMonths;d.history.unshift({age:age(),type:'phase',phase:stage.index,label:stage.label});d.history=d.history.slice(0,20);tl('NOUVEAU STATUT — '+stage.label,'Ta trajectoire change d’échelle. Le monde te traite désormais comme '+stage.label.toLowerCase()+'.','major');recordSignatureMoment('Statut — '+stage.label,'La carrière de '+p.name+' atteint une nouvelle dimension.','destiny-phase',70+stage.index*5);changed=true}
 careerDestinyMilestones().forEach(function(m){if(m.done&&completeDestinyMilestone(m))changed=true});return changed
}
function destinyMissionOpportunity(){
 var p=game.player;if(p.ageMonths<240||p.career==='Aucune'||careerRecord().retired)return null;var stage=lifeImportanceStage(),attention=destinyWorldAttention();if(stage.index<2)return null;var bucket=Math.floor(p.ageMonths/6),roll=H(String(game.seed)+':destiny-offer:'+p.faction+':'+String(p.specialization)+':'+bucket)%100;if(roll>=Math.min(78,24+stage.index*12+attention*.25))return null;
 var prof=destinyProfile(),titles={Civil:'Une puissance étrangère réclame ton expertise',Marine:'Le haut commandement exige ton intervention',Pirates:p.organization&&p.organization.pirateOrigin==='joined'?'Ton capitaine te confie une opération décisive':'Un grand acteur des mers sollicite ton pavillon','Chasseur de primes':'Un contrat réservé à l’élite circule sur ton nom',Révolutionnaires:'Une cellule lointaine réclame ton intervention',Gouvernement:'Une directive classifiée porte ton nom'},danger=cl(38+stage.index*9+inf().danger*.18,38,88),tier=cl(stage.index+1,2,6),reward=Math.round(18000+danger*850+stage.index*16000);
 return{title:titles[p.faction]||'Le monde réclame ton expertise',danger:Math.round(danger),reward:reward,xp:Math.round(28+danger*.55+stage.index*6),tier:tier,spec:p.specialization||null,months:1+Math.ceil(danger/30),profile:prof.profile,sourceType:'destiny',sourceId:p.faction+':'+String(p.specialization),sourceName:prof.title,worldGenerated:true,destiny:true,variantKey:'destiny:'+bucket}
}
function destinyTick(m){if(!game||!game.player||game.player.ageMonths<180)return;evaluateDestinyProgress()}
function endgameMilestones(){
 var p=game.player,x=influenceMetrics(),org=p.organization,goals=[];
 if(p.ageMonths<300)return goals;
 if(p.faction==='Pirates'){
  goals=[
   {id:'newworld',label:'S’imposer dans le Nouveau Monde',done:p.region==='New World'&&power()>=62,progress:Math.round(Math.min(100,(p.region==='New World'?45:0)+power()*.55))},
   {id:'domain',label:'Bâtir un territoire',done:x.domains.length>=3,progress:Math.min(100,Math.round(x.domains.length/3*100))},
   {id:'fleet',label:'Former une flotte',done:x.affiliates.length>=3,progress:Math.min(100,Math.round(x.affiliates.length/3*100))},
   {id:'emperor',label:'Devenir une puissance mondiale',done:x.recognizedTitle==='Empereur des mers',progress:Math.min(100,Math.round(x.score))}
  ]
 }else if(p.faction==='Marine'){
  goals=[{id:'command',label:'Atteindre le haut commandement',done:['Vice-amiral','Amiral'].indexOf(p.rank)>=0,progress:Math.min(100,rankIndex()*18+20)},{id:'legend',label:'Devenir une figure de la Marine',done:x.score>=82&&power()>=80,progress:Math.min(100,Math.round((x.score+power())/2))},{id:'stability',label:'Peser sur l’équilibre des mers',done:(p.factionRep.Marine||0)>=90&&x.domains.length>=2,progress:Math.min(100,Math.round((p.factionRep.Marine||0)*.65+x.domains.length*18))}]
 }else if(p.faction==='Révolutionnaires'){
  goals=[{id:'network',label:'Étendre le réseau révolutionnaire',done:x.domains.length>=3||x.affiliates.length>=3,progress:Math.min(100,Math.round(Math.max(x.domains.length,x.affiliates.length)/3*100))},{id:'command',label:'Devenir un cadre majeur',done:['Commandant régional','Bras droit'].indexOf(p.rank)>=0||x.score>=80,progress:Math.min(100,Math.round(x.score))},{id:'change',label:'Changer durablement l’équilibre du monde',done:game.world.divergence>=35,progress:Math.min(100,Math.round(game.world.divergence/35*100))}]
 }else if(p.faction==='Gouvernement'){
  goals=[{id:'elite',label:'Atteindre les opérations d’élite',done:p.rank==='CP0'||p.rank==='Candidat CP0'||x.score>=82,progress:Math.min(100,Math.round(x.score))},{id:'network',label:'Construire un réseau d’influence',done:x.domains.length>=3,progress:Math.min(100,Math.round(x.domains.length/3*100))},{id:'authority',label:'Devenir une autorité mondiale',done:(p.factionRep.Gouvernement||0)>=92&&power()>=78,progress:Math.min(100,Math.round(((p.factionRep.Gouvernement||0)+power())/2))}]
 }else if(p.faction==='Chasseur de primes'){
  goals=[{id:'hunts',label:'Devenir une légende des primes',done:p.justice&&p.justice.captures>=15,progress:Math.min(100,Math.round(((p.justice&&p.justice.captures)||0)/15*100))},{id:'fortune',label:'Faire fortune par la chasse',done:netWorth()>=5000000,progress:Math.min(100,Math.round(netWorth()/5000000*100))},{id:'legend',label:'Être reconnu sur toutes les mers',done:x.score>=80,progress:Math.min(100,Math.round(x.score))}]
 }else{
  goals=[{id:'mastery',label:'Devenir une référence dans son domaine',done:careerExpertise(p.specialization)>=85,progress:Math.min(100,Math.round(careerExpertise(p.specialization)))},{id:'fortune',label:'Construire une fortune durable',done:netWorth()>=5000000,progress:Math.min(100,Math.round(netWorth()/5000000*100))},{id:'legacy',label:'Laisser une trace dans le monde',done:x.score>=75||game.world.divergence>=25,progress:Math.min(100,Math.round(Math.max(x.score,game.world.divergence*3)))}]
 }
 return goals
}
function endgameStage(){
 var factionGoals=endgameMilestones(),destinyGoals=game.player.ageMonths>=180&&game.player.career!=='Aucune'?careerDestinyMilestones():[],goals=factionGoals.concat(destinyGoals),stage=lifeImportanceStage();if(!goals.length)return null;var done=goals.filter(function(g){return g.done}).length,avg=goals.reduce(function(a,g){return a+(g.progress||0)},0)/goals.length,recognition=playerWorldRecognition(),organic=recognition.score>=(recognition.legendThreshold||88)&&recognition.legendQualified;
 return{label:organic?'Légende accomplie':stage.index>=3?'Puissance mondiale':done>=Math.ceil(goals.length/2)?'Puissance établie':'Ascension majeure',done:done,total:goals.length,progress:Math.round((avg*.50+recognition.score*.30+stage.score*.20)),goals:goals,recognition:recognition,organic:organic,lifeStage:stage,destiny:destinyProfile()}
}
function legendRecognitionTick(){
 var p=game.player;if(p.ageMonths<300)return false;var r=playerWorldRecognition(),threshold=r.legendThreshold||88;if(!r.legendQualified||r.score<threshold)return false;
 var l=migrateLifeLoop(game),title=r.role,already=(l.signatureMoments||[]).some(function(x){return x.kind==='legend'&&x.title==='Légende reconnue — '+title});if(already)return false;
 var added=addTitle(title),desc=p.name+' est désormais reconnu dans le monde comme « '+title+' » après une carrière dont les conséquences dépassent sa seule réputation.';
 if(!added){tl('LÉGENDE — '+title,desc,'major');news('Une légende est reconnue',desc,'major')}
 recordSignatureMoment('Légende reconnue — '+title,desc,'legend',96);return true
}
function evaluateTitles(){
 var p=game.player,x=influenceMetrics(),org=p.organization,ageY=p.ageMonths/12,rank=p.rank||'';if(p.ageMonths<180)return x;
 if(x.fame>=22)addTitle('Nom montant');
 if(x.score>=48)addTitle('Figure des mers');
 if(p.faction==='Pirates'&&ageY<=30&&(p.bounty||0)>=100000000&&p.visited.indexOf('Sabaody')>=0)addTitle('Supernova');
 if(p.faction==='Pirates'&&org&&org.authority==='leader'&&p.region==='New World'&&power()>=58)addTitle('Capitaine du Nouveau Monde');
 if(p.faction==='Pirates'&&x.domains.length>=2&&x.score>=68)addTitle('Seigneur pirate');
 if(p.faction==='Marine'&&['Capitaine','Contre-amiral','Vice-amiral'].indexOf(rank)>=0&&x.fame>=50)addTitle('Officier renommé');
 if(p.faction==='Marine'&&rank==='Vice-amiral'&&power()>=82&&(p.factionRep.Marine||0)>=82&&x.score>=78)addTitle('Candidat au haut commandement');
 if(p.faction==='Révolutionnaires'&&(rank==='Cadre révolutionnaire'||rank==='Commandant régional')&&x.score>=66)addTitle('Cadre de la Révolution');
 if(p.faction==='Gouvernement'&&(rank==='CP9'||rank==='Candidat CP0'||p.specialization==='Cipher Pol')&&power()>=58)addTitle('Agent d’élite');
 if(p.faction==='Chasseur de primes'&&p.justice&&p.justice.captures>=5)addTitle('Chasseur renommé');
 if(p.faction==='Chasseur de primes'&&p.justice&&p.justice.captures>=15&&p.justice.bountiesClaimed>=100000000)addTitle('Légende des primes');
 if(p.faction==='Civil'&&netWorth()>=5000000)addTitle('Magnat des mers');
 if(x.score>=88&&power()>=85&&x.domains.length>=3)addTitle('Puissance du Nouveau Monde');
 return x
}
function useInfluenceAction(){var x=migrateInfluence(game.player);if(x.actions<1){toast('Tu as déjà utilisé ton action d’influence pour cette période.');return false}x.actions--;return true}
function claimEligibility(){
 var p=game.player,x=influenceMetrics(),o=p.organization,t=game.world.territories[p.island];if(p.ageMonths<216)return[false,'Il faut être adulte.'];if(p.justice&&p.justice.detained)return[false,'Impossible depuis une prison.'];if(!o||o.authority!=='leader')return[false,'Il faut diriger ton organisation.'];if(!t)return[false,'Territoire indisponible.'];if(t.playerControl&&t.playerControl.ownerKey===dynastyKey())return[false,'Ta dynastie contrôle déjà cette zone.'];if(x.score<48)return[false,'Influence 48 requise.'];if(organizationPower()<38)return[false,'Puissance d’organisation 38 requise.'];return[true,'']}
function establishDomain(){
 var p=game.player,x=influenceMetrics(),q=claimEligibility();if(!q[0])return toast(q[1]);if(!useInfluenceAction())return;var t=game.world.territories[p.island],friendly=t.controller===p.faction||t.controller==='Civil',mode=friendly?'influence':'conquest';
 function success(){t.playerControl={ownerKey:dynastyKey(),ownerName:p.name,faction:p.faction,label:domainLabel(p.faction),control:Math.round(cl(48+x.score*.28+organizationPower()*.18,45,86)),sinceYear:game.world.year,sinceMonth:Math.floor(game.world.month),mode:mode,income:0};if(mode==='conquest'&&['Pirates','Marine','Révolutionnaires','Gouvernement'].indexOf(p.faction)>=0){var old=t.controller;t.controller=p.faction;t.lastWorldCause='player:domain:'+p.name;t.influence=cl(t.influence-8,38,78);t.stability=cl(t.stability-9,10,100);if((p.faction==='Pirates'||p.faction==='Révolutionnaires')&&(old==='Marine'||old==='Gouvernement'))registerCrime('Prise de contrôle de '+p.island,5,true)}x.domains.push(p.island);x.domains=x.domains.filter(function(v,i,a){return a.indexOf(v)===i});x.score=cl(x.score+5,0,100);if(p.organization)p.organization.renown=cl(p.organization.renown+6,0,100);tl('Domaine établi',domainLabel(p.faction)+' établi à '+p.island+'.','major');news('Nouvelle puissance locale',p.name+' établit son influence à '+p.island+'.','major');registerPlayerSagaImpact(mode==='conquest'?'participant':'indirect','domain:'+p.island,mode==='conquest'?14:6);evaluateTitles();checkAchievements();save();render()}
 if(friendly){success();return}
 var d=cl(inf().danger*.7+t.influence*.36+12,25,95),ok=fight(d,'Prise d’influence à '+p.island);if(!game.alive)return;if(ok)success();else{t.stability=cl(t.stability-3,0,100);tl('Expansion repoussée','Les forces locales empêchent ton implantation.','danger')}save();render()
}
function fortifyDomain(){
 var p=game.player,t=game.world.territories[p.island],x=syncInfluenceOwnership();if(!t||!t.playerControl||t.playerControl.ownerKey!==dynastyKey())return toast('Tu ne contrôles pas cette zone.');if(!useInfluenceAction())return;var cost=15000,org=p.organization;if((org?org.treasury:0)+p.money<cost){x.actions++;return toast('Il faut 15 000 B pour consolider la zone.')}var fromOrg=org?Math.min(org.treasury,cost):0;if(org)org.treasury-=fromOrg;p.money-=cost-fromOrg;t.playerControl.control=cl(t.playerControl.control+10+R('influence')*8,0,100);t.stability=cl(t.stability+5+R('influence')*5,0,100);tl('Consolidation',p.island+' renforce sa fidélité à ton réseau.','major');save();render()
}
function affiliateCandidates(){
 var p=game.player,x=influenceMetrics();if(p.faction!=='Pirates'||!p.organization||p.organization.authority!=='leader'||x.score<62)return[];return game.world.crews.filter(function(c){return c.status==='active'&&c.faction==='Pirates'&&c.region===p.region&&!c.affiliation&&c.power<=power()+18}).sort(function(a,b){return a.power-b.power}).slice(0,5)
}
function recruitAffiliate(id){
 var p=game.player,x=influenceMetrics(),c=game.world.crews.find(function(y){return y.id===id}),o=p.organization;if(!c||c.status!=='active'||c.region!==p.region||c.affiliation)return toast('Cet équipage n’est plus disponible.');if(!o||o.authority!=='leader'||p.faction!=='Pirates')return toast('Réservé aux capitaines pirates.');if(!useInfluenceAction())return;
 var leverage=x.score*.36+(o.renown||0)*.22+power()*.18+(p.bounty?Math.log10(p.bounty+1)*2:0)-c.power*.42,ch=cl(.28+leverage/100,.08,.9);
 if(R('influence')<ch){c.affiliation={ownerKey:dynastyKey(),ownerName:p.name,orgId:o.id,sinceYear:game.world.year};x.affiliates.push(c.id);x.affiliates=x.affiliates.filter(function(v,i,a){return a.indexOf(v)===i});o.renown=cl(o.renown+4,0,100);tl('Alliance pirate',c.name+' reconnaît ton pavillon et rejoint ton réseau.','major');news('Flotte en expansion',c.name+' se place sous l’influence de '+p.name+'.','major');evaluateTitles()}
 else{c.morale=cl(c.morale+2,0,100);tl('Alliance refusée',c.name+' refuse de se placer sous ton influence.')}
 save();render()
}
function domainIncome(t,name,m){
 var p=game.player,rp=game.world.pressures[infStatic(name).region]||{},pc=t.playerControl,market=game.world.markets&&game.world.markets[name];if(!pc)return 0;var trade=market?Math.min(1.45,.75+(market.tradeActivity||0)/50000):1,block=market&&market.blockade?.55:1,base=350+t.stability*12+(rp.Prospérité==null?40:rp.Prospérité)*9+pc.control*8+infStatic(name).danger*4,amount=Math.round(base*trade*block*m);pc.income=(pc.income||0)+amount;return amount
}
function playerDomainDefense(location){
 var p=game.player,t=game.world.territories[location],pc=t&&t.playerControl;if(!pc||pc.ownerKey!==dynastyKey())return 0;var aff=game.world.crews.filter(function(c){return c.status==='active'&&c.affiliation&&c.affiliation.ownerKey===dynastyKey()&&c.region===infStatic(location).region}).reduce(function(a,c){return a+c.power},0),org=p.organization&&p.region===infStatic(location).region?organizationPower():0;return pc.control*.18+aff*.08+org*.1
}
function loseDomain(name,reason){
 var p=game.player,x=migrateInfluence(p),t=game.world.territories[name];if(!t||!t.playerControl||t.playerControl.ownerKey!==dynastyKey())return;delete t.playerControl;x.domains=x.domains.filter(function(n){return n!==name});tl('Domaine perdu',name+' échappe à ton influence'+(reason?' : '+reason:'')+'.','danger');news('Recul territorial',p.name+' perd son emprise sur '+name+'.','war')
}
function realignInfluenceAfterFactionChange(oldF,newF){
 var p=game.player,x=syncInfluenceOwnership();x.domains.slice().forEach(function(name){var t=game.world.territories[name],pc=t&&t.playerControl;if(!pc||pc.ownerKey!==dynastyKey())return;var hostile=diplomacy(oldF,newF)<-20;if(hostile)pc.control=cl(pc.control-35,0,100);if(pc.control<45){loseDomain(name,'changement de faction');return}pc.faction=newF;pc.label=domainLabel(newF);if(['Pirates','Marine','Révolutionnaires','Gouvernement'].indexOf(newF)>=0)t.controller=newF});
 if(newF!=='Pirates'){game.world.crews.forEach(function(c){if(c.affiliation&&c.affiliation.ownerKey===dynastyKey())delete c.affiliation});x.affiliates=[]}
 evaluateTitles()
}
function influenceTick(m){
 var p=game.player,x=syncInfluenceOwnership();x.actions=1;var total=0;
 x.domains.slice().forEach(function(name){var t=game.world.territories[name];if(!t||!t.playerControl||t.playerControl.ownerKey!==dynastyKey())return;total+=domainIncome(t,name,m);t.playerControl.control=cl(t.playerControl.control+(t.stability-45)*.008*m+(R('influence')-.5)*1.1*m,0,100);if(t.playerControl.control<12)loseDomain(name,'autorité locale effondrée');else if(R('influence')<.012*m*(1+game.world.globalTension/90)){var hostile=pk(hostileCandidates(t.controller),'influence');spawnConflict(name,hostile,t.controller,35+R('influence')*35,'domain')}}
 );
 if(total){x.totalDomainIncome+=total;if(p.organization)p.organization.treasury+=total;else p.money+=total}
 x.affiliates=x.affiliates.filter(function(id){var c=game.world.crews.find(function(y){return y.id===id});if(!c||c.status!=='active'||!c.affiliation||c.affiliation.ownerKey!==dynastyKey())return false;if(c.morale<18&&R('influence')<.025*m){delete c.affiliation;tl('Alliance rompue',c.name+' cesse de reconnaître ton réseau.','danger');return false}return true});
 evaluateTitles();
 if(p.faction==='Pirates'&&!x.recognizedTitle&&game.world.year>=20&&game.world.divergence>=18&&x.domains.length>=4&&x.affiliates.length>=3&&(p.bounty||0)>=1000000000&&power()>=90&&x.score>=90&&R('influence')<.035*m){x.recognizedTitle='Empereur des mers';addTitle('Empereur des mers');game.world.divergence=cl(game.world.divergence+3,0,100);news('Nouvel Empereur',p.name+' est désormais reconnu comme l’une des puissances dominantes du Nouveau Monde.','war')}
}
function renderInfluence(){
 var p=game.player,x=influenceMetrics(),img=publicImage(),badge=$('#influenceBadge');badge.textContent=Math.round(x.score)+'/100';badge.className='badge '+(x.score>=75?'influence-critical':x.score>=45?'influence-major':'');
 var reactionState=migrateWorldReactions(p),attention=destinyWorldAttention(),lastReaction=reactionState.history&&reactionState.history[0];$('#publicStanding').innerHTML='<div><span>Influence</span><strong>'+Math.round(x.score)+'</strong></div><div><span>Image publique</span><strong>'+e(img)+'</strong></div><div><span>Renommée</span><strong>'+Math.round(x.fame)+'</strong></div><div><span>Infamie</span><strong>'+Math.round(x.infamy)+'</strong></div><div><span>Attention mondiale</span><strong>'+Math.round(attention)+' • '+e(worldReactionAttentionLabel(attention))+'</strong></div>'+(lastReaction?'<div><span>Dernière réaction</span><strong>'+e(lastReaction.sourceName)+' • '+e(lastReaction.outcome)+'</strong></div>':'');
 $('#titleList').innerHTML=(x.titles.length?x.titles.slice().reverse().map(function(t,i){return '<span class="title-chip '+(i===0?'primary':'')+'">'+e(t)+'</span>'}).join(''):'<span class="title-chip">Aucun titre majeur</span>')+(x.recognizedTitle?'<div class="world-title-banner"><strong>'+e(x.recognizedTitle)+'</strong><span>Reconnaissance mondiale</span></div>':'');
 var q=claimEligibility(),t=game.world.territories[p.island],owned=t&&t.playerControl&&t.playerControl.ownerKey===dynastyKey(),actions='';
 if(owned)actions+='<button id="fortifyDomainBtn" class="action-card"><strong>Consolider '+e(p.island)+'</strong><small>15 000 B • augmente contrôle et stabilité.</small></button>';else if(q[0])actions+='<button id="claimDomainBtn" class="action-card"><strong>Établir ton influence ici</strong><small>'+e(domainLabel(p.faction))+' à '+e(p.island)+'.</small></button>';
 var candidates=affiliateCandidates();if(candidates.length)actions+='<button id="affiliateCrewBtn" class="action-card"><strong>Rallier un équipage</strong><small>'+candidates.length+' force(s) pirate(s) compatible(s) dans la région.</small></button>';
 if(!actions)actions='<div class="career-card"><p>Développe ton rang, ton organisation et ton influence pour exercer un pouvoir direct sur le monde.</p></div>';
 $('#influenceActions').innerHTML=actions;var c=$('#claimDomainBtn');if(c)c.onclick=establishDomain;var f=$('#fortifyDomainBtn');if(f)f.onclick=fortifyDomain;var a=$('#affiliateCrewBtn');if(a)a.onclick=function(){var cs=affiliateCandidates(),choices=cs.map(function(cr){return[cr.name,'Puissance '+Math.round(cr.power)+' • '+Math.round(cr.bounty/1000000)+' M B de prime',function(){recruitAffiliate(cr.id)}]});choices.push(['Annuler','Ne rien proposer.',function(){}]);decision('Étendre ton réseau','Convaincre un équipage autonome de reconnaître ton pavillon.',choices)}
}
function renderDomains(){
 var p=game.player,x=syncInfluenceOwnership(),domains=x.domains.map(function(n){return{name:n,t:game.world.territories[n]}}),aff=x.affiliates.map(function(id){return game.world.crews.find(function(c){return c.id===id})}).filter(Boolean);
 $('#domainBadge').textContent=domains.length+' zone'+(domains.length>1?'s':'');$('#domainSummary').innerHTML='<div><span>Zones sous influence</span><strong>'+domains.length+'</strong></div><div><span>Revenu cumulé</span><strong>'+Math.round(x.totalDomainIncome).toLocaleString('fr-FR')+' B</strong></div><div><span>Forces affiliées</span><strong>'+aff.length+'</strong></div><div><span>Pic d’influence</span><strong>'+Math.round(x.peak)+'</strong></div>';
 $('#domainList').innerHTML=domains.length?domains.map(function(d){var pc=d.t.playerControl,threat=game.world.conflicts.some(function(c){return c.location===d.name&&c.status==='active'});return '<div class="domain-row '+(threat?'domain-threat':'domain-owned')+'"><strong>'+e(d.name)+'</strong><span>'+e(pc.label)+' • contrôle '+Math.round(pc.control)+'%</span><small>'+e(infStatic(d.name).region)+' • stabilité '+Math.round(d.t.stability)+'% • revenus cumulés '+Math.round(pc.income||0).toLocaleString('fr-FR')+' B'+(threat?' • CONFLIT EN COURS':'')+'</small><div class="domain-control-meter"><div style="width:'+cl(pc.control,0,100)+'%"></div></div></div>'}).join(''):'<p class="helper-text">Aucun domaine personnel établi.</p>';
 $('#affiliateBadge').textContent=aff.length+' allié'+(aff.length>1?'s':'');$('#affiliateList').innerHTML=aff.length?aff.map(function(c){return '<div class="affiliate-row"><strong>'+e(c.name)+'</strong><span>'+e(c.region)+' • puissance '+Math.round(c.power)+'</span><small>'+c.members+' membres • prime '+Math.round(c.bounty).toLocaleString('fr-FR')+' B • moral '+Math.round(c.morale)+'%</small></div>'}).join(''):'<p class="helper-text">Aucune force autonome n’a encore reconnu ton réseau.</p>'
}


var TRADE_GOODS=[
 {id:'provisions',name:'Provisions',base:900,weight:1,restricted:false},
 {id:'medicine',name:'Médicaments',base:1900,weight:1,restricted:false},
 {id:'materials',name:'Matériaux',base:1450,weight:2,restricted:false},
 {id:'luxury',name:'Produits de luxe',base:3600,weight:1,restricted:false},
 {id:'weapons',name:'Armes',base:4800,weight:2,restricted:true},
 {id:'dials',name:'Dials',base:5700,weight:1,restricted:false},
 {id:'seastone',name:'Kairouseki',base:9200,weight:1,restricted:true}
];
var TRADE_BIAS={
 'East Blue':{provisions:.86,medicine:1.02,materials:.94,luxury:1.08,weapons:1.15,dials:1.55,seastone:1.70},
 'North Blue':{provisions:1.02,medicine:.92,materials:.90,luxury:1.04,weapons:.82,dials:1.45,seastone:1.58},
 'West Blue':{provisions:.95,medicine:.96,materials:.88,luxury:.83,weapons:1.05,dials:1.42,seastone:1.55},
 'South Blue':{provisions:.88,medicine:1.00,materials:.96,luxury:.96,weapons:1.10,dials:1.48,seastone:1.62},
 'Grand Line':{provisions:1.08,medicine:1.08,materials:1.04,luxury:1.12,weapons:1.00,dials:.72,seastone:1.22},
 'New World':{provisions:1.22,medicine:1.20,materials:1.10,luxury:1.18,weapons:.96,dials:1.12,seastone:.74}
};
function goodById(id){return TRADE_GOODS.find(function(g){return g.id===id})||null}
function defaultTrade(){return{cargo:[],profit:0,volume:0,trades:0,smugglingRuns:0,seizures:0,marketActions:0,bestProfit:0,lastPort:null}}
function migrateTrade(p){p.trade=p.trade||defaultTrade();var t=p.trade;t.cargo=t.cargo||[];t.cargo=t.cargo.filter(function(c){return goodById(c.good)&&c.qty>0}).map(function(c){c.qty=Math.max(0,c.qty||0);c.avgCost=Math.max(0,c.avgCost||0);return c});t.profit=t.profit||0;t.volume=t.volume||0;t.trades=t.trades||0;t.smugglingRuns=t.smugglingRuns||0;t.seizures=t.seizures||0;t.marketActions=t.marketActions||0;t.bestProfit=t.bestProfit||0;t.lastPort=t.lastPort||null;return t}
function compactSaveNumber(v){v=Number(v)||0;return Math.round(v*10)/10}
function encodeMarketData(w){
 var names=Object.keys(PL),goods=TRADE_GOODS;
 return names.map(function(name){
  var m=w.markets&&w.markets[name];if(!m)return null;var row=[];
  goods.forEach(function(g){var x=m.goods&&m.goods[g.id]||{};row.push(compactSaveNumber(x.stock),compactSaveNumber(x.demand))});
  row.push(compactSaveNumber(m.tradeActivity||0));
  if(m.shockState)row.push(m.shockState.good||'',m.shockState.type||'',Math.max(0,Math.round(m.shockState.months||0)));
  return row
 })
}
function decodeMarketData(g,w){
 if(w.markets||!Array.isArray(w.marketData))return w;
 var names=Object.keys(PL),goods=TRADE_GOODS;w.markets={};
 names.forEach(function(name,i){
  var row=w.marketData[i];if(!Array.isArray(row))return;var base=initialMarket(g,name),m={goods:{},tradeActivity:Number(row[goods.length*2])||0,blockade:false,shockState:null};
  goods.forEach(function(good,j){var fallback=base.goods[good.id],stock=row[j*2],demand=row[j*2+1];m.goods[good.id]={stock:stock==null?fallback.stock:Number(stock),demand:demand==null?fallback.demand:Number(demand)}});
  if(row.length>goods.length*2+1&&row[goods.length*2+1])m.shockState={good:row[goods.length*2+1],type:row[goods.length*2+2]||'shortage',months:Math.max(0,Number(row[goods.length*2+3])||0)};
  w.markets[name]=m
 });
 delete w.marketData;return w
}
function compactGoalForStorage(g){
 if(!g)return g;var out={primary:g.primary||'',progress:compactSaveNumber(g.progress||0),stage:g.stage||'pursuing',completed:g.completed||0};
 if(g.lastCompleted)out.lastCompleted=g.lastCompleted;if(g.updatedAt)out.updatedAt=g.updatedAt;return out
}
function compactWorldStateForStorage(ws){
 if(!ws)return ws;var out={};
 Object.keys(ws).forEach(function(k){if(k.indexOf('territory:')===0||k==='toJSON')return;out[k]=ws[k]});
 out.actorHistory=(ws.actorHistory||[]).slice(0,30).map(function(x,i){return i<12?x:{seq:x.seq,actor:x.actor,outcome:x.outcome||'',impact:x.impact||0}});
 out.territoryHistory=(ws.territoryHistory||[]).slice(0,30).map(function(x,i){return i<12?x:{seq:x.seq,name:x.name,from:x.from,to:x.to,contested:!!x.contested,stability:x.stability}});
 out.crewHistory=(ws.crewHistory||[]).slice(0,24).map(function(x,i){return i<10?x:{seq:x.seq,name:x.name,outcome:x.outcome||'',impact:x.impact||0}});
 out.monthlyChanges=(ws.monthlyChanges||[]).slice(0,12);
 out.goalHistory=(ws.goalHistory||[]).slice(0,24);
 out.geopoliticalHistory=(ws.geopoliticalHistory||[]).slice(0,30);
 out.actorGoals={};Object.keys(ws.actorGoals||{}).forEach(function(k){out.actorGoals[k]=compactGoalForStorage(ws.actorGoals[k])});
 out.crewGoals={};Object.keys(ws.crewGoals||{}).forEach(function(k){out.crewGoals[k]=compactGoalForStorage(ws.crewGoals[k])});
 out.factionGoals={};Object.keys(ws.factionGoals||{}).forEach(function(k){out.factionGoals[k]=compactGoalForStorage(ws.factionGoals[k])});
 return out
}
function compactActorForStorage(a){
 var out=Object.assign({},a);['faction','startRegion','base','peak','growth','importance','goal','birthYear','activeFrom','worldGoal'].forEach(function(k){delete out[k]});return out
}
function compactWorldForStorage(w){
 var out={};Object.keys(w||{}).forEach(function(k){
  if(k==='toJSON'||k==='marketData')return;
  if(k==='markets'){out.marketData=encodeMarketData(w);return}
  if(k==='worldState'){out.worldState=compactWorldStateForStorage(w.worldState);return}
  if(k==='actors'){out.actors=(w.actors||[]).map(compactActorForStorage);return}
  out[k]=w[k]
 });
 if(!out.marketData&&w&&w.markets)out.marketData=encodeMarketData(w);return out
}
function installWorldSerializer(w){
 if(!w)return w;try{Object.defineProperty(w,'toJSON',{value:function(){return compactWorldForStorage(this)},writable:true,configurable:true,enumerable:false})}catch(x){}
 if(w.worldState)try{Object.defineProperty(w.worldState,'toJSON',{value:function(){return compactWorldStateForStorage(this)},writable:true,configurable:true,enumerable:false})}catch(x){}
 return w
}
function initialMarket(g,name){
 var region=infStatic(name).region,bias=TRADE_BIAS[region]||{},goods={};
 TRADE_GOODS.forEach(function(x,i){var b=bias[x.id]||1,rare=x.id==='seastone'||x.id==='dials',stock=(rare?9:34)+(1/b)*22+det(g,'market:stock:'+name+':'+x.id)*32,demand=32+b*18+det(g,'market:demand:'+name+':'+x.id)*28;if(name==='Skypiea'&&x.id==='dials')stock+=55;if(name==='Wano'&&x.id==='seastone')stock+=50;goods[x.id]={stock:Math.round(cl(stock,2,120)),demand:Math.round(cl(demand,12,100))}});
 return{goods:goods,tradeActivity:0,blockade:false,shockState:null}
}
function initWorldEconomy(g,w){
 decodeMarketData(g,w);w.markets=w.markets||{};Object.keys(PL).forEach(function(n){if(!w.markets[n])w.markets[n]=initialMarket(g,n);else{var m=w.markets[n];m.goods=m.goods||{};TRADE_GOODS.forEach(function(x){if(!m.goods[x.id])m.goods[x.id]=initialMarket(g,n).goods[x.id];else{delete m.goods[x.id].activity;delete m.goods[x.id].lastPrice}});delete m.shock;delete m.lastShockMonth;if(m.tradeActivity==null)m.tradeActivity=0;if(m.blockade==null)m.blockade=false;if(m.shockState===undefined)m.shockState=null}});
 w.economy=w.economy||{priceIndex:100,tradeVolume:0,monthlyVolume:0,shortages:0,shocks:[],month:0};w.economy.shocks=Array.isArray(w.economy.shocks)?w.economy.shocks.slice(0,24):[];return w
}
function marketBlockade(name){
 var w=game.world;if(w.conflicts.some(function(c){return c.status==='active'&&c.location===name&&c.intensity>=45}))return true;
 return(w.wars||[]).some(function(war){return war.status==='active'&&war.target===name&&war.months>=1})
}
function regionalBias(region,id){var b=TRADE_BIAS[region]||{},raw=b[id]||1;return cl(1+(raw-1)*.65,.78,1.5)}
function marketPrice(name,id,buy,stockOverride){
 var g=goodById(id),m=game.world.markets[name],x=m&&m.goods[id];if(!g||!x)return 0;var region=infStatic(name).region,rp=game.world.pressures[region]||{},terr=game.world.territories[name]||{stability:55},bias=regionalBias(region,id),stock=stockOverride==null?x.stock:stockOverride,scarcity=cl(1+(x.demand-stock)/115,.55,2.15),instability=1+cl((50-(terr.stability==null?50:terr.stability))/220,-.12,.32),blocked=marketBlockade(name),war=blocked?1.32:1,pressure=1;m.blockade=blocked;
 if(id==='provisions'||id==='medicine')pressure*=1+cl((rp.Instabilité==null?20:rp.Instabilité)/380,0,.28);
 if(id==='luxury')pressure*=.83+(rp.Prospérité==null?50:rp.Prospérité)/290;
 if(g.restricted)pressure*=.92+(rp.Criminalité==null?20:rp.Criminalité)/220;
 var price=g.base*bias*scarcity*instability*war*pressure,spread=buy?1.06:.94;return Math.max(50,Math.round(price*spread/10)*10)
}
function commodityQuote(name,id,qty,buy){
 var m=game.world.markets[name],x=m&&m.goods[id],g=goodById(id);qty=Math.max(0,Math.floor(qty||0));if(!x||!g||qty<1)return{total:0,avg:0,qty:0};var virtual=x.stock,total=0,n=0;
 for(var i=0;i<qty;i++){if(buy&&virtual<1)break;var price=marketPrice(name,id,buy,virtual);total+=price;n++;virtual=cl(virtual+(buy?-1:1),0,150)}
 return{total:Math.round(total),avg:n?total/n:0,qty:n}
}
function marketPriceIndex(name){
 var vals=TRADE_GOODS.filter(function(g){return ['provisions','medicine','materials','luxury'].indexOf(g.id)>=0}).map(function(g){return marketPrice(name,g.id,true)/g.base});return Math.round((vals.reduce(function(a,b){return a+b},0)/Math.max(1,vals.length))*100)
}
function cargoItem(id){return migrateTrade(game.player).cargo.find(function(c){return c.good===id})||null}
function cargoUsed(){
 return migrateTrade(game.player).cargo.reduce(function(a,c){var g=goodById(c.good);return a+(g?g.weight*c.qty:0)},0)
}
function cargoCapacity(){
 var p=game.player,o=p.organization;if(o&&o.ship){var tier=o.ship.tier||0;return[10,20,36,60][tier]||10}return 5+Math.floor((p.skills.Navigation||0)/25)
}
function cargoBookValue(){return Math.round(migrateTrade(game.player).cargo.reduce(function(a,c){return a+c.qty*c.avgCost},0))}
function blackMarketAccess(){
 var p=game.player,rp=game.world.pressures[p.region]||{};return p.faction==='Pirates'||p.faction==='Révolutionnaires'||(p.skills.Discrétion||0)>=28||(rp.Criminalité||0)>=38
}
function blackMarketRisk(){
 var p=game.player,rp=game.world.pressures[p.region]||{},t=game.world.territories[p.island],official=t&&(t.controller==='Marine'||t.controller==='Gouvernement'),heat=currentHeat?currentHeat():0;return cl(.08+(rp.Marine==null?25:rp.Marine)/230+(official?.10:0)+heat/400-(p.skills.Discrétion||0)/300,.04,.58)
}
function transactBlackMarketRisk(good,qty){
 if(!good.restricted)return;if(R('trade')<blackMarketRisk()){registerCrime('Transaction clandestine : '+good.name,good.id==='seastone'?3:2,true);if(game.player.faction==='Marine'||game.player.faction==='Gouvernement')adjustRep(game.player.faction,-8)}else gain('Discrétion',.12+qty*.03)
}
function buyCommodity(id,qty,black){
 var p=game.player;if(p.ageMonths<144)return toast('Tu es encore trop jeune pour gérer du commerce maritime.');var t=migrateTrade(p),g=goodById(id),m=game.world.markets[p.island],x=m&&m.goods[id];qty=Math.max(1,Math.floor(qty||1));if(!g||!x)return;if(g.restricted&&!black)return toast('Cette marchandise n’est pas vendue légalement ici.');if(black&&!blackMarketAccess())return toast('Tu n’as pas accès au marché noir local.');var maxByStock=Math.floor(x.stock),maxByCapacity=Math.floor((cargoCapacity()-cargoUsed())/g.weight),price=marketPrice(p.island,id,true),maxByMoney=Math.floor(Math.max(0,p.money)/price),n=Math.min(qty,maxByStock,maxByCapacity,maxByMoney);if(n<1)return toast('Stock, argent ou capacité de cargaison insuffisant.');
 var quote=commodityQuote(p.island,id,n,true);while(n>0&&quote.total>p.money){n--;quote=commodityQuote(p.island,id,n,true)}if(n<1)return toast('Fonds insuffisants après variation du marché.');var cost=quote.total,item=cargoItem(id);p.money-=cost;x.stock-=n;m.tradeActivity+=cost;t.volume+=cost;t.trades++;game.world.economy.tradeVolume+=cost;game.world.economy.monthlyVolume+=cost;if(item){item.avgCost=(item.avgCost*item.qty+cost)/(item.qty+n);item.qty+=n}else t.cargo.push({good:id,qty:n,avgCost:quote.avg});if(black)transactBlackMarketRisk(g,n);tl('Achat commercial',n+' × '+g.name+' pour '+cost.toLocaleString('fr-FR')+' B.');save();render()
}
function sellCommodity(id,qty,black){
 var p=game.player;if(p.ageMonths<144)return toast('Tu es encore trop jeune pour gérer du commerce maritime.');var t=migrateTrade(p),g=goodById(id),m=game.world.markets[p.island],x=m&&m.goods[id],item=cargoItem(id);qty=Math.max(1,Math.floor(qty||1));if(!g||!x||!item||item.qty<1)return;if(g.restricted&&!black)return toast('Cette marchandise exige un acheteur clandestin.');if(black&&!blackMarketAccess())return toast('Aucun intermédiaire clandestin disponible.');var n=Math.min(qty,item.qty),quote=commodityQuote(p.island,id,n,false),price=quote.avg,revenue=quote.total,profit=Math.round(revenue-item.avgCost*n);p.money+=revenue;x.stock=cl(x.stock+n,0,150);m.tradeActivity+=revenue;t.volume+=revenue;t.trades++;game.world.economy.tradeVolume+=revenue;game.world.economy.monthlyVolume+=revenue;t.profit+=profit;t.bestProfit=Math.max(t.bestProfit,profit);item.qty-=n;if(item.qty<=0)t.cargo=t.cargo.filter(function(c){return c!==item});if(black)transactBlackMarketRisk(g,n);if(p.faction==='Civil'&&profit>0){adjustRep('Civil',Math.min(2,profit/30000));careerRecord().xp+=Math.min(3,profit/18000)}tl('Vente commerciale',n+' × '+g.name+' pour '+revenue.toLocaleString('fr-FR')+' B ('+(profit>=0?'+':'')+profit.toLocaleString('fr-FR')+' B).',profit>=10000?'major':'');checkAchievements();save();render()
}
function tradeRouteOpportunities(){
 var p=game.player,routes=inf().routes||[],out=[];routes.forEach(function(dest){TRADE_GOODS.filter(function(g){return !g.restricted}).forEach(function(g){var buy=marketPrice(p.island,g.id,true),sell=marketPrice(dest,g.id,false),margin=buy?((sell-buy)/buy)*100:0;if(margin>4)out.push({dest:dest,good:g,margin:margin,buy:buy,sell:sell})})});return out.sort(function(a,b){return b.margin-a.margin}).slice(0,6)
}
function inspectSmugglingAtArrival(destination){
 var p=game.player,t=migrateTrade(p),restricted=t.cargo.filter(function(c){var g=goodById(c.good);return g&&g.restricted&&c.qty>0});if(!restricted.length)return;var rp=game.world.pressures[infStatic(destination).region]||{},terr=game.world.territories[destination],official=terr&&(terr.controller==='Marine'||terr.controller==='Gouvernement'),chance=cl(.09+(rp.Marine==null?25:rp.Marine)/210+(official?.13:0)+currentHeat()/450-(p.skills.Discrétion||0)/280,.04,.72);
 if(R('trade')<chance){var seized=0,value=0;restricted.forEach(function(c){var g=goodById(c.good);seized+=c.qty;value+=Math.round(c.qty*c.avgCost);c.qty=0});t.cargo=t.cargo.filter(function(c){return c.qty>0});t.seizures++;var fine=Math.min(Math.max(0,p.money),Math.round(value*.22));p.money-=fine;registerCrime('Contrebande maritime',cl(2+Math.floor(seized/4),2,5),true);tl('Contrôle douanier','Les autorités saisissent '+seized+' unité(s) de cargaison interdite et imposent '+fine.toLocaleString('fr-FR')+' B d’amende.','danger')}
 else{t.smugglingRuns++;gain('Discrétion',.35+restricted.length*.08);tl('Passage discret','Ta cargaison clandestine franchit le contrôle de '+destination+'.','major');checkAchievements()}
}
function marketMonthlyTarget(name,id){
 var g=goodById(id),region=infStatic(name).region,rp=game.world.pressures[region]||{},terr=game.world.territories[name]||{stability:50},bias=regionalBias(region,id),target=55/bias;
 if(id==='provisions')target+=((rp.Prospérité==null?50:rp.Prospérité)-40)*.18;if(id==='medicine')target-=((rp.Instabilité==null?20:rp.Instabilité))*0.12;if(g.restricted)target+=((rp.Criminalité==null?20:rp.Criminalité)-25)*.25;if(name==='Skypiea'&&id==='dials')target+=55;if(name==='Wano'&&id==='seastone')target+=50;
 if(marketBlockade(name))target*=.58;target*=.7+(terr.stability==null?50:terr.stability)/165;return cl(target,4,125)
}
function simulateTradeRoutes(){
 var w=game.world,seen={};Object.keys(PL).forEach(function(a){(PL[a][2]||[]).forEach(function(b){if(!w.markets[b])return;var key=[a,b].sort().join('|');if(seen[key])return;seen[key]=1;if(marketBlockade(a)||marketBlockade(b))return;var good=pk(TRADE_GOODS.filter(function(g){return !g.restricted}),'economy'),pa=marketPrice(a,good.id,false),pb=marketPrice(b,good.id,false),from=pa<pb?a:b,to=from===a?b:a,mf=w.markets[from].goods[good.id],mt=w.markets[to].goods[good.id],gap=Math.abs(pa-pb)/Math.max(1,Math.min(pa,pb));if(gap>.12&&mf.stock>10){var qty=Math.min(mf.stock-8,1+Math.floor(R('economy')*4));mf.stock-=qty;mt.stock=cl(mt.stock+qty,0,150);w.economy.monthlyVolume+=Math.round(qty*Math.min(pa,pb))}})})
}
function simulateEconomy(){
 var w=game.world,econ=w.economy;econ.month++;econ.monthlyVolume=0;var indices=[],shortages=0;
 Object.keys(w.markets).forEach(function(name){var m=w.markets[name],terr=w.territories[name]||{stability:50},rp=w.pressures[infStatic(name).region]||{};m.blockade=marketBlockade(name);m.tradeActivity*=.82;m.shockState=m.shockState||null;
  if(m.shockState){m.shockState.months--;if(m.shockState.months<=0){var endedShock=m.shockState;if(endedShock.type==='shortage')updateCollectiveGoal(factionWorldGoal('Civil'),.7);m.shockState=null}}
  TRADE_GOODS.forEach(function(g){var x=m.goods[g.id],target=marketMonthlyTarget(name,g.id),warDemand=m.blockade&&(g.id==='provisions'||g.id==='medicine'||g.id==='materials')?8:0,shock=m.shockState&&m.shockState.good===g.id?m.shockState:null,shockStock=shock?(shock.type==='shortage'?-4:4):0,shockDemand=shock?(shock.type==='shortage'?3:-3):0;x.demand=cl(x.demand+(target-x.demand)*.07+(R('economy')-.5)*2.5+warDemand+shockDemand,8,120);x.stock=cl(x.stock+(target-x.stock)*.08+(rp.Prospérité==null?40:rp.Prospérité)/90+(R('economy')-.5)*3-(m.blockade?2.5:0)+shockStock,0,150);if((shock&&shock.type==='shortage')||(x.stock<8&&x.demand>50))shortages++});
  if(!m.shockState&&R('economy')<.005){var shockGood=pk(TRADE_GOODS,'economy'),sx=m.goods[shockGood.id],short=R('economy')<.62,duration=4+Math.floor(R('economy')*5);if(short){sx.stock=cl(sx.stock-(18+R('economy')*25),0,150);sx.demand=cl(sx.demand+14+R('economy')*18,0,120)}else{sx.stock=cl(sx.stock+20+R('economy')*32,0,150);updateCollectiveGoal(factionWorldGoal('Civil'),.8)}m.shockState={good:shockGood.id,type:short?'shortage':'surplus',months:duration};econ.shocks.unshift({place:name,good:shockGood.id,type:short?'shortage':'surplus',duration:duration,year:w.year,month:w.month});econ.shocks=econ.shocks.slice(0,24);news(short?'Pénurie locale':'Arrivage commercial',name+' connaît '+(short?'une pénurie durable de ':'un afflux durable de ')+shockGood.name+' ('+duration+' mois estimés).',short?'major':'')};
  indices.push(marketPriceIndex(name))
 });
 simulateTradeRoutes();econ.tradeVolume+=econ.monthlyVolume;econ.shortages=shortages;econ.priceIndex=Math.round(indices.reduce(function(a,b){return a+b},0)/Math.max(1,indices.length))
}
function localMarketStatus(){
 var p=game.player,m=game.world.markets[p.island],idx=marketPriceIndex(p.island);if(m.blockade)return'Blocus';if((m.shockState&&m.shockState.type==='shortage')||TRADE_GOODS.some(function(g){var x=m.goods[g.id];return x.stock<8&&x.demand>50}))return'Pénurie';if(idx<88)return'Marché favorable';if(idx>128)return'Prix élevés';return'Stable'
}
function renderCargo(){
 var p=game.player,t=migrateTrade(p),used=cargoUsed(),cap=cargoCapacity(),value=cargoBookValue();$('#cargoBadge').textContent=used+'/'+cap+' capacité';$('#cargoSummary').innerHTML='<div><span>Valeur comptable</span><strong>'+value.toLocaleString('fr-FR')+' B</strong></div><div><span>Profit commercial</span><strong class="'+(t.profit>=0?'trade-profit':'trade-loss')+'">'+(t.profit>=0?'+':'')+Math.round(t.profit).toLocaleString('fr-FR')+' B</strong></div><div><span>Transactions</span><strong>'+t.trades+'</strong></div><div><span>Passages clandestins</span><strong>'+t.smugglingRuns+'</strong></div><div style="grid-column:1/-1"><span>Capacité utilisée</span><div class="cargo-capacity"><div style="width:'+cl(used/Math.max(1,cap)*100,0,100)+'%"></div></div></div>';
 $('#cargoList').innerHTML=t.cargo.length?t.cargo.map(function(c){var g=goodById(c.good),here=marketPrice(p.island,c.good,false),delta=here-c.avgCost;return '<div class="cargo-row"><div class="cargo-head"><strong>'+e(g.name)+'</strong><span>'+c.qty+' unité'+(c.qty>1?'s':'')+'</span></div><div class="cargo-meta">Coût moyen '+Math.round(c.avgCost).toLocaleString('fr-FR')+' B • vente locale '+here.toLocaleString('fr-FR')+' B • <span class="'+(delta>=0?'trade-profit':'trade-loss')+'">'+(delta>=0?'+':'')+Math.round(delta).toLocaleString('fr-FR')+' B/u</span></div></div>'}).join(''):'<p class="helper-text">Aucune marchandise transportée.</p>'
}
function renderMarket(){
 var p=game.player,m=game.world.markets[p.island],status=localMarketStatus(),idx=marketPriceIndex(p.island),rp=game.world.pressures[p.region]||{},used=cargoUsed(),cap=cargoCapacity();$('#marketPlaceName').textContent=p.island;var badge=$('#marketStatusBadge');badge.textContent=status;badge.className='badge '+(status==='Blocus'||status==='Pénurie'?'market-crisis':status==='Marché favorable'?'market-boom':'');
 $('#marketSummary').innerHTML='<div><span>Indice local</span><strong>'+idx+'</strong></div><div><span>Indice mondial</span><strong>'+Math.round(game.world.economy.priceIndex)+'</strong></div><div><span>Prospérité régionale</span><strong>'+Math.round(rp.Prospérité||0)+'%</strong></div><div><span>Pénuries mondiales</span><strong>'+game.world.economy.shortages+'</strong></div><div><span>Activité commerciale</span><strong>'+Math.round(m.tradeActivity).toLocaleString('fr-FR')+' B</strong></div><div><span>Cargaison</span><strong>'+used+'/'+cap+'</strong></div>';
 function cards(restricted){return TRADE_GOODS.filter(function(g){return !!g.restricted===restricted}).map(function(g){var x=m.goods[g.id],buy=marketPrice(p.island,g.id,true),sell=marketPrice(p.island,g.id,false),owned=(cargoItem(g.id)||{qty:0}).qty,scarce=x.stock<10;return '<div class="market-good '+(g.restricted?'restricted ':'')+(scarce?'scarce':'')+'"><div class="market-good-head"><strong>'+e(g.name)+'</strong><span>'+Math.floor(x.stock)+' en stock</span></div><div class="market-good-meta">Acheter '+buy.toLocaleString('fr-FR')+' B • vendre '+sell.toLocaleString('fr-FR')+' B • demande '+Math.round(x.demand)+'/100'+(owned?' • tu en as '+owned:'')+'</div><div class="market-good-actions"><button data-buy-good="'+g.id+'" data-buy-qty="1">Acheter 1</button><button data-buy-good="'+g.id+'" data-buy-qty="5">Acheter 5</button>'+(owned?'<button data-sell-good="'+g.id+'" data-sell-qty="1">Vendre 1</button><button data-sell-good="'+g.id+'" data-sell-qty="5">Vendre 5</button>':'')+'</div></div>'}).join('')}
 $('#marketGoods').innerHTML=cards(false);var access=blackMarketAccess();$('#blackMarketSection').classList.toggle('hidden',!access);if(access){$('#blackMarketBadge').textContent='Risque '+Math.round(blackMarketRisk()*100)+'%';$('#blackMarketGoods').innerHTML=cards(true)}
 var routes=tradeRouteOpportunities();$('#tradeRouteBadge').textContent=routes.length+' piste'+(routes.length>1?'s':'');$('#tradeRoutes').innerHTML=routes.length?routes.map(function(r){return '<div class="trade-route"><div class="trade-route-head"><strong>'+e(r.dest)+'</strong><span>'+Math.round(r.margin)+'% estimé</span></div><div class="trade-route-meta">'+e(r.good.name)+' • achat ici '+r.buy.toLocaleString('fr-FR')+' B • vente actuelle là-bas '+r.sell.toLocaleString('fr-FR')+' B</div></div>'}).join(''):'<p class="helper-text">Aucun écart commercial intéressant sur les routes immédiates.</p>';
 $$('[data-buy-good]').forEach(function(b){b.onclick=function(){buyCommodity(b.dataset.buyGood,+b.dataset.buyQty,goodById(b.dataset.buyGood).restricted)}});$$('[data-sell-good]').forEach(function(b){b.onclick=function(){sellCommodity(b.dataset.sellGood,+b.dataset.sellQty,goodById(b.dataset.sellGood).restricted)}})
}

function careerTrack(f,spec){return f==='Gouvernement'&&spec==='Cipher Pol'?CP_RANKS:(CAREERS[f]?CAREERS[f].ranks:CAREERS.Civil.ranks)}
function firstRank(f){var c=CAREERS[f]||CAREERS.Civil;return c.ranks[0].n}
function careerRecord(f){f=f||game.player.faction;var p=game.player;if(!p.careerRecords[f])p.careerRecords[f]={xp:0,months:0,rank:firstRank(f),specialization:null,successes:0,failures:0,momentum:0,missionStreak:0,distinctions:0,legendDistinctions:0,recentResults:[],retired:false,retirementChoice:null,retirementAge:null,retirementDecisionAge:null,retiredMonths:0};var r=p.careerRecords[f];r.successes=r.successes||0;r.failures=r.failures||0;r.momentum=cl(r.momentum||0,-12,12);r.missionStreak=r.missionStreak||0;var total=r.successes+r.failures;if(!Array.isArray(r.recentResults)){var n=Math.min(8,total),wins=total?Math.round(n*r.successes/total):0;r.recentResults=[];for(var i=0;i<n;i++)r.recentResults.push(i<wins?1:0)}r.recentResults=r.recentResults.slice(-10);if(r.distinctions==null)r.distinctions=Math.min(20,Math.floor(r.successes/6));r.distinctions=cl(r.distinctions||0,0,30);if(r.legendDistinctions==null)r.legendDistinctions=r.distinctions;r.legendDistinctions=cl(r.legendDistinctions||0,0,30);if(r.retired==null)r.retired=false;if(r.retirementChoice===undefined)r.retirementChoice=null;if(r.retirementAge===undefined)r.retirementAge=null;if(r.retirementDecisionAge===undefined)r.retirementDecisionAge=null;r.retiredMonths=r.retiredMonths||0;return r}
function careerMomentumFactor(rec){return cl(1+(rec&&rec.momentum||0)/42,.74,1.28)}
function updateCareerMomentum(rec,success,importance){var push=success?(2.1+Math.min(2.4,(importance||0)/35)):-(2.4+Math.min(2,(importance||0)/45));rec.momentum=cl((rec.momentum||0)+push,-12,12);rec.missionStreak=success?Math.max(1,(rec.missionStreak||0)+1):Math.min(-1,(rec.missionStreak||0)-1);return rec.momentum}
function recordCareerMissionEvidence(rec,success,m,result){
 rec=rec||careerRecord();rec.recentResults=Array.isArray(rec.recentResults)?rec.recentResults:[];rec.recentResults.push(success?1:0);rec.recentResults=rec.recentResults.slice(-10);var delta=0,legendDelta=0,worldImportance=m&&m.worldGenerated?missionImportance(m):0;if(success){if(m&&m.signature){delta+=2;legendDelta+=2}if(worldImportance>=58){delta+=1;legendDelta+=1}if(result&&result.chance<.62){delta+=1;legendDelta+=1}var streak=Math.max(0,rec.missionStreak||0)+1;if(delta===0&&(streak===7||streak===10))delta=1}else if(m&&m.signature){delta-=1;legendDelta-=1}rec.distinctions=cl((rec.distinctions||0)+delta,0,30);rec.legendDistinctions=cl((rec.legendDistinctions||0)+legendDelta,0,30);return delta
}
function careerPerformanceReview(rec,index){
 rec=rec||careerRecord();index=index==null?rankIndex():index;var track=careerTrack(game.player.faction,game.player.specialization),finalStep=index===Math.max(0,track.length-2),total=(rec.successes||0)+(rec.failures||0),rate=total?(rec.successes||0)/total:.5,recent=(rec.recentResults||[]).slice(-8),recentRate=recent.length?recent.reduce(function(a,b){return a+b},0)/recent.length:rate,minMissions=index>=3?6+index:0,minMonths=0,required=index>=3?cl(.62+index*.035,.70,.81):0,recentRequired=index>=3?cl(required+.06,.76,.86):0,neededDistinctions=index>=3?Math.max(2,(index-2)*2):0;if(finalStep&&index>=3){minMissions=Math.max(minMissions,16);minMonths=180;required=Math.max(required,index===3?.92:.90);recentRequired=Math.max(recentRequired,.875);neededDistinctions=Math.max(3,neededDistinctions)}var evidence=(rec.distinctions||0)>=neededDistinctions,tenure=(rec.months||0)>=minMonths,strictShortFinal=finalStep&&index===3,overrideEvidence=(rec.distinctions||0)>=(strictShortFinal?neededDistinctions:Math.max(1,neededDistinctions-1)),streakOverride=index>=3&&tenure&&(rec.momentum||0)>=9&&rate>=required-(strictShortFinal?.02:.04)&&recentRate>=recentRequired-(strictShortFinal?.03:.05)&&overrideEvidence,met=index<3||(tenure&&total>=minMissions&&recent.length>=Math.min(7,minMissions)&&((rate>=required&&recentRate>=recentRequired&&evidence)||streakOverride));
 return{active:index>=3,finalStep:finalStep,total:total,successRate:rate,recentRate:recentRate,minMissions:minMissions,minMonths:minMonths,tenureMet:tenure,required:required,recentRequired:recentRequired,distinctions:rec.distinctions||0,neededDistinctions:neededDistinctions,streakOverride:streakOverride,met:met}
}
function ownRep(){return game.player.factionRep[game.player.faction]||0}
function standingLabel(v){return v<=-40?'Hostile':v<-10?'Méfiant':v<20?'Neutre':v<45?'Reconnu':v<70?'Estimé':'Allié majeur'}
function adjustRep(f,n){var p=game.player;if(p.factionRep[f]==null)p.factionRep[f]=0;p.factionRep[f]=cl(p.factionRep[f]+n,-100,100)}
function rankIndex(){var p=game.player,t=careerTrack(p.faction,p.specialization),i=t.findIndex(function(r){return r.n===p.rank});return i<0?0:i}
function missionAccessIndex(){
 var p=game.player,ri=rankIndex();if(p.faction!=='Pirates'||!p.organization||p.organization.pirateOrigin!=='founded')return ri;
 var rec=careerRecord(),track=careerTrack('Pirates',p.specialization),rep=p.factionRep.Pirates||0,qual=careerQualification(),xpIndex=0,repIndex=0,qualIndex=0;
 track.forEach(function(r,i){if((rec.xp||0)>=r.xp)xpIndex=i;if(rep>=r.rep)repIndex=i;if(qual>=r.pow)qualIndex=i});
 return cl(Math.min(ri,xpIndex,repIndex,qualIndex),0,track.length-1)
}
function missionRewardMultiplier(m){
 var p=game.player,stage=missionAccessIndex(),tier=m&&m.tier||0,mult=1;
 if(p.faction==='Pirates')mult=1.04+stage*.12+tier*.035;
 else if(p.faction==='Chasseur de primes')mult=1.10+stage*.15+tier*.045;
 else if(p.faction==='Civil')mult=1+stage*.055+(p.specialization==='Marchand'?.10:0);
 else if(p.faction==='Révolutionnaires')mult=.92+stage*.035;
 else mult=1+stage*.025;
 return cl(mult,.85,2.15)
}
function joinedPirateRankCap(){var t=careerTrack('Pirates',game.player&&game.player.specialization),i=t.findIndex(function(r){return r.n==='Bras droit'});return i<0?4:i}
function nextRank(){var p=game.player,t=careerTrack(p.faction,p.specialization),i=rankIndex(),piratePath=p.organization&&p.organization.pirateOrigin||p.pirateCrewPreference;if(p.faction==='Pirates'&&piratePath==='joined'&&i>=joinedPirateRankCap())return null;return i<t.length-1?t[i+1]:null}
function activityForFaction(f){return'Carrière'}
function join(f,r,options){var p=game.player,old=p.faction,opts=options||{};if(p.organization&&p.organization.faction!==f)archiveOrganization('Changement de voie');var rec=careerRecord(f);p.faction=f;p.career=f;p.rank=rec.rank||r||firstRank(f);p.specialization=rec.specialization||null;p.situation='Carrière';p.activity='Carrière';p.focus='Carrière';if(f==='Pirates'){p.pirateCrewPreference=opts.pirateMode||'joined';if(p.pirateCrewPreference==='founded'){p.rank=rec.rank==='Capitaine renommé'?'Capitaine renommé':'Capitaine';rec.rank=p.rank}else if(['Capitaine','Capitaine renommé'].indexOf(p.rank)>=0){p.rank='Bras droit';rec.rank='Bras droit'}p.organization=buildOrganizationState(game,p,f,{pirateMode:p.pirateCrewPreference,worldCrew:p.pirateCrewPreference==='founded'?null:(opts.worldCrew||pirateCrewCandidate(game,p))})}if(game.codex.factions.indexOf(f)<0)game.codex.factions.push(f);p.careerHistory.push({age:age(),type:'join',from:old,to:f,rank:p.rank,pirateCrew:f==='Pirates'?p.pirateCrewPreference:null});p.careerHistory=p.careerHistory.slice(-60);var o=ensureOrganization();if(f==='Pirates'){syncPlayerPirateCrewWorld();syncOrganizationMemberRelations(o);tl('Nouvelle carrière',o.pirateOrigin==='founded'?'Tu deviens pirate en fondant '+o.name+'.':'Tu deviens pirate en rejoignant '+o.name+'.','major')}else tl('Nouvelle carrière','Tu rejoins '+(CAREERS[f]?CAREERS[f].label:f)+'.','major');if(p.ageMonths>=180){signalPersonalChapter('career',f==='Pirates'?(o.pirateOrigin==='founded'?'Fondation de '+o.name:'Ascension dans '+o.name):'Ascension au sein de '+(CAREERS[f]?CAREERS[f].label:f),12,'join:'+f,f);signalPersonalChapter('organization','Vie dans '+o.name,10,'org-join:'+o.id,o.id)}}
function career(){var pirateChoices=pirateCrewCandidates(game,game.player,4);decision('Choisir une voie','Ta vie adulte commence. La voie pirate distingue désormais clairement rejoindre un pavillon existant et créer le tien.',[
 ['Marine','Carrière structurée, salaire et promotions.',function(){join('Marine','Recrue')}],
 ['Pirate — rejoindre','Choisir parmi '+pirateChoices.length+' équipage'+(pirateChoices.length>1?'s':'')+' existant'+(pirateChoices.length>1?'s':'')+' et progresser depuis l’intérieur.',function(){pirateJoinDecision()}],
 ['Pirate — fonder','Créer ton propre équipage. Tu deviens capitaine immédiatement, mais pars avec moins de ressources et dois construire ton groupe.',function(){join('Pirates','Capitaine',{pirateMode:'founded'})}],
 ['Chasseur de primes','Contrats indépendants et revenus à la mission.',function(){join('Chasseur de primes','Indépendant')}],
 ['Civil','Médecine, commerce, navigation, science et artisanat.',function(){join('Civil','Apprenti')}],
 ['Révolutionnaires','Réseau clandestin, infiltration et opérations politiques.',function(){join('Révolutionnaires','Sympathisant')}],
 ['Gouvernement Mondial','Administration, renseignement et accès potentiel au Cipher Pol.',function(){join('Gouvernement','Agent junior')}]
 ])}
function specEligibility(sp){var p=game.player;if(sp==='Cipher Pol'){if(p.faction!=='Gouvernement')return[false,'Réservé au Gouvernement'];if((p.skills.Discrétion||0)<18||(p.skills.Combat||0)<18)return[false,'Combat 18 + Discrétion 18'];if((p.factionRep.Gouvernement||0)<15)return[false,'Réputation Gouvernement 15']}return[true,'']}
function applyCareerSpecialization(sp,source){
 var p=game.player,rec=careerRecord(),q=specEligibility(sp),oldSpec=rec.specialization||null,oldRank=p.rank;if(!q[0]||sp===oldSpec)return null;
 if(oldSpec)rec.xp*=.9;rec.specialization=sp;p.specialization=sp;p.careerHistory.push({age:age(),ageMonths:p.ageMonths,type:'specialization',faction:p.faction,from:oldSpec,to:sp,source:source||'manual'});
 if(p.faction==='Gouvernement'&&sp==='Cipher Pol'&&rankIndex()<2&&rec.xp>=105){p.rank='Stagiaire Cipher Pol';rec.rank=p.rank;p.careerHistory.push({age:age(),ageMonths:p.ageMonths,type:'promotion',faction:p.faction,from:oldRank,to:p.rank,source:'specialization'})}
 p.careerHistory=p.careerHistory.slice(-60);return{from:oldSpec,to:sp}
}
function chooseSpecialization(sp){var p=game.player,oldSpec=p.specialization,changed=applyCareerSpecialization(sp,'manual');if(!changed){var q=specEligibility(sp);if(!q[0])return toast(q[1]);return}if(oldSpec)tl('Réorientation','Tu quittes la spécialisation '+oldSpec+' pour '+sp+'. Une partie de ton expérience de carrière est perdue.','major');else tl('Spécialisation','Tu te spécialises en '+sp+'.','major');save();renderChar()}
function specializationDecision(){
 var p=game.player,cfg=CAREERS[p.faction]||CAREERS.Civil,ch=[];
 cfg.specs.forEach(function(sp){var q=specEligibility(sp);if(sp===p.specialization)return;if(q[0])ch.push([sp,p.specialization?'Se réorienter vers '+sp+'.':'Choisir '+sp+'.',function(){chooseSpecialization(sp)}])});
 if(!ch.length)return toast('Aucune autre spécialisation accessible.');ch.push(['Annuler','Ne rien changer.',function(){}]);decision(p.specialization?'Changer de spécialisation':'Choisir une spécialisation','Le jeu adaptera ensuite automatiquement le focus Carrière à ce rôle.',ch)
}
function ambitionDecision(){
 var p=game.player,ch=['Survivre','Devenir puissant','Explorer le monde','Faire fortune','Entrer dans l’histoire'].filter(function(a){return a!==p.ambition}).map(function(a){return[a,'Adopter cette priorité.',function(){p.ambition=a;save();renderChar();renderAb()}]});ch.push(['Annuler','Ne rien changer.',function(){}]);decision('Changer d’ambition','L’ambition guide le mode Auto sans écraser un focus manuel.',ch)
}
function salaryPerMonth(){var p=game.player,c=CAREERS[p.faction]||CAREERS.Civil,i=rankIndex();if(!c.salary)return 0;return Math.round(c.salary*(1+i*.34))}
function specSkill(sp){var m={Combat:'Combat',Combattant:'Combat',Duelliste:'Combat',Navigation:'Navigation',Navigateur:'Navigation',Tireur:'Tir',Médecine:'Médecine',Médecin:'Médecine',Renseignement:'Discrétion',Infiltration:'Discrétion',Investigateur:'Discrétion',Scientifique:'Science',Administration:'Discipline',Logistique:'Commandement','Quartier-maître':'Commandement',Marchand:'Commandement',Artisan:'Science',Cuisinier:'Discipline',Traqueur:'Réflexes','Cipher Pol':'Discrétion'};return m[sp]||null}
function careerActivityFit(){var p=game.player,focus=currentFocus(),keys=activityGrowthKeys(focus),profile=specProfile(p.specialization);if(focus==='Carrière')return 1.35;if(focus==='Équilibre')return .82;if(!profile)return focus==='Combat'?1.0:.68;var hits=profile.keys.filter(function(k){return keys.indexOf(k)>=0}).length;if(hits>=2)return 1.18;if(hits===1)return .95;return .62}
function evaluatePromotion(){var p=game.player,rec=careerRecord(),n=nextRank();if(rec.retired||!n)return false;var rep=p.factionRep[p.faction]||0,qual=careerQualification(),review=careerPerformanceReview(rec,rankIndex());if(rec.xp<n.xp||rep<n.rep||qual<n.pow||!review.met)return false;var o=p.organization,crewReq=p.faction==='Pirates'&&o&&o.pirateOrigin==='joined'?crewStandingRequirement(n.n):0;if(crewReq&&joinedCrewStanding(o)<crewReq)return false;var old=p.rank;p.rank=n.n;rec.rank=n.n;p.careerHistory.push({age:age(),type:'promotion',faction:p.faction,from:old,to:n.n,qualification:Math.round(qual)});p.careerHistory=p.careerHistory.slice(-60);adjustRep(p.faction,3);tl('PROMOTION','Tu accèdes au rang de '+n.n+' au sein de '+(CAREERS[p.faction]?CAREERS[p.faction].label:p.faction)+' grâce à une qualification de '+Math.round(qual)+'.','major');signalPersonalChapter('career','Ascension au sein de '+(CAREERS[p.faction]?CAREERS[p.faction].label:p.faction),9+rankIndex()*1.2,'promotion:'+n.n,p.faction);syncOrganizationRole();return true}
function careerTick(m){var p=game.player;if(p.ageMonths<180||p.career==='Aucune')return;var rec=careerRecord();if(rec.retired){rec.retiredMonths=(rec.retiredMonths||0)+m;rec.momentum*=Math.pow(.97,m);if(Math.abs(rec.momentum)<.05)rec.momentum=0;var pension=retirementIncomePerMonth()*m;if(pension>0){p.money+=pension;p.salaryTotal+=pension}organizationTick(m);return}var fit=careerActivityFit(),momentum=careerMomentumFactor(rec);rec.months+=m;rec.xp+=m*fit*(1+(p.stats.Discipline||0)/260)*momentum;rec.momentum*=Math.pow(.985,m);if(Math.abs(rec.momentum)<.05)rec.momentum=0;var sk=specSkill(p.specialization);if(sk)gain(sk,m*(.10+.05*fit));var sal=salaryPerMonth()*m;if(sal>0){p.money+=sal;p.salaryTotal+=sal}adjustRep(p.faction,m*.08);evaluatePromotion();organizationTick(m)}
function careerEligibility(f){var p=game.player;if(f===p.faction)return[false,'Voie actuelle'];if(p.ageMonths<180)return[false,'Carrière accessible à partir de 15 ans'];if(f==='Marine'&&p.bounty>0)return[false,'Une prime active bloque le recrutement'];if(f==='Gouvernement'){if(p.bounty>0)return[false,'Une prime active bloque le recrutement'];if((p.stats.Discipline||0)<18)return[false,'Discipline 18 requise']}if(f==='Chasseur de primes'&&p.bounty>50000)return[false,'Prime trop élevée'];return[true,'']}
function realignRelationsAfterFactionChange(oldF,newF){
 var p=game.player;game.relations.forEach(function(r){if(r.status!=='active')return;var family=r.type==='family'||r.role==='parent'||r.role==='frère / sœur',partner=r.id===p.life.partnerId||r.type==='partner'||r.role==='partenaire';
  if(r.joinedOrganization){r.joinedOrganization=false;if(r.type==='organization')r.type='social';addRelationMemory(r,'Ton changement de voie vous sépare de votre ancienne organisation.','faction')}
  if(r.faction===newF){r.respect=cl(r.respect+4,0,100);r.trust=cl(r.trust+2,0,100);addRelationMemory(r,'Ton arrivée dans '+newF+' rapproche vos trajectoires.','faction');return}
  var hostile=diplomacy(newF,r.faction)<-35;if(!hostile)return;
  var shield=(family?0.35:partner?0.5:1)*(r.trust>=75?.55:1),trustLoss=8*shield,loyaltyLoss=9*shield,rivalGain=10*shield;
  r.trust=cl(r.trust-trustLoss,0,100);r.loyalty=cl(r.loyalty-loyaltyLoss,0,100);r.rivalry=cl(r.rivalry+rivalGain,0,100);addRelationMemory(r,'Ton changement vers '+newF+' crée une tension avec son appartenance à '+r.faction+'.','faction');
  if(!r.canonical&&!family&&!partner&&r.trust<32&&r.rivalry>=58&&r.role!=='mentor'){r.role='rival';addRelationMemory(r,'Le désaccord politique devient une rivalité personnelle.','rival')}
 })
}
function switchCareer(f,options){var p=game.player,old=p.faction,q=careerEligibility(f);if(!q[0])return toast(q[1]);if(old!=='Civil')adjustRep(old,-16);if((old==='Marine'||old==='Gouvernement')&&(f==='Pirates'||f==='Révolutionnaires')){p.deserterFrom.push(old);issueBounty(80000,'Désertion');tl('Désertion','Ton changement de camp est considéré comme une trahison. Une prime est émise.','danger')}join(f,firstRank(f),options);realignInfluenceAfterFactionChange(old,f);realignRelationsAfterFactionChange(old,f);save();render()}
function careerChangeDecision(){var p=game.player,ch=[];FACTION_KEYS.forEach(function(f){if(f===p.faction)return;var q=careerEligibility(f);if(!q[0])return;if(f==='Pirates'){var pcs=pirateCrewCandidates(game,p,4);ch.push(['Pirates — rejoindre','Choisir parmi '+pcs.length+' équipage'+(pcs.length>1?'s':'')+' vivant'+(pcs.length>1?'s':'')+' comme nouveau membre.',function(){pirateJoinDecision(function(c){switchCareer('Pirates',{pirateMode:'joined',worldCrew:c})})}]);ch.push(['Pirates — fonder','Créer ton propre pavillon et en devenir immédiatement le capitaine.',function(){switchCareer('Pirates',{pirateMode:'founded'})}])}else ch.push([(CAREERS[f]?CAREERS[f].label:f),'Quitter '+(CAREERS[p.faction]?CAREERS[p.faction].label:p.faction)+' pour cette voie.',function(){switchCareer(f)}])});if(!ch.length)return toast('Aucune autre voie n’est accessible actuellement.');ch.push(['Rester','Ne rien changer.',function(){}]);decision('Changer de voie','Un changement de faction peut dégrader tes anciennes relations. Devenir pirate implique aussi de choisir entre rejoindre un équipage ou créer le tien.',ch)}

function styleEdge(a,b){return(MATCH[a]&&MATCH[a][b])||-((MATCH[b]&&MATCH[b][a])||0)}
function injuryName(sev){if(sev>=3)return pk(['Fracture','Traumatisme','Plaie profonde'],'inj');if(sev===2)return pk(['Entorse','Coupure sérieuse','Contusion profonde'],'inj');return pk(['Ecchymoses','Coupure légère','Douleur musculaire'],'inj')}
function combatPrimarySkill(){var p=game.player;return p.style==='Sabreur'?'Sabre':p.style==='Tireur'?'Tir':'Combat'}
function styleCombatExperiencePlan(){
 var p=game.player;if(p.style==='Corps-à-corps')return[{key:'Combat',weight:.62},{key:'Force',weight:.24},{key:'Endurance',weight:.14}];if(p.style==='Sabreur')return[{key:'Sabre',weight:.70},{key:'Combat',weight:.18},{key:'Réflexes',weight:.12}];if(p.style==='Tireur')return[{key:'Tir',weight:.72},{key:'Réflexes',weight:.18},{key:'Discipline',weight:.10}];if(p.style==='Mobile / esquive')return[{key:'Combat',weight:.56},{key:'Agilité',weight:.28},{key:'Vitesse',weight:.16}];return[{key:'Combat',weight:.70},{key:'Réflexes',weight:.18},{key:'Discipline',weight:.12}]
}
function gainCombatExperience(d,factor){
 var base=(1+(d||0)/42)*1.12*(factor==null?1:factor);styleCombatExperiencePlan().forEach(function(x){gain(x.key,base*x.weight)});return base
}
function combatProfile(){var p=game.player,mastery=styleMastery(),inj=p.conditions.reduce(function(a,c){return a+(c.severity||1)*2},0),offMod=p.style==='Corps-à-corps'?2:p.style==='Sabreur'||p.style==='Tireur'?1:p.style==='Mobile / esquive'?-1:0,defMod=p.style==='Mobile / esquive'?3:p.style==='Équilibré'?1:0;return{offense:p.stats.Force*.15+p.stats.Vitesse*.12+mastery*.34+p.skills.Combat*.10+p.haki.Armement*.18+p.haki.Conquérant*.08+(p.fruit?p.fruitMastery*.12:0)+(techniqueBonus()+signatureTechniqueBonus())*.35+offMod,defense:p.stats.Résistance*.19+p.stats.Agilité*.17+p.stats.Réflexes*.18+mastery*.10+p.skills.Combat*.07+p.haki.Observation*.22+p.haki.Armement*.08+defMod-inj,stamina:p.stats.Endurance*.65+p.energy*.22+p.health*.13}}
function combatFatalityMitigation(){
 var p=game.player,escape=Math.max(p.stats.Réflexes||0,p.stats.Agilité||0,(p.skills.Discrétion||0)*.92,(p.skills.Navigation||0)*.72),factor=cl(1-escape/255,.62,1),spec=p.specialization||'';
 if(['Infiltration','Renseignement','Investigateur','Traqueur','Navigation','Navigateur'].indexOf(spec)>=0)factor*=.86;
 var o=p.organization,active=o&&Array.isArray(o.members)?o.members.filter(function(m){return m.status==='active'}).length:0;if(active>=2&&(o.morale||0)>=25)factor*=.84;
 if((p.haki.Observation||0)>=45)factor*=cl(1-(p.haki.Observation-40)/420,.82,1);
 return cl(factor,.42,1)
}
function fight(d,t,opponent){var p=game.player,styles=['Équilibré','Corps-à-corps','Sabreur','Tireur','Mobile / esquive'],terrain=pk(['terrain ouvert','pont de navire','espace étroit','ruelles','terrain accidenté'],'f'),npcScores=opponent?npcCombatScores(opponent):null,enemyStyle=npcScores?npcScores.style:pk(styles,'f'),cp=combatProfile(),edge=styleEdge(p.style,enemyStyle),enemyOff=npcScores?npcScores.offense:d*(.72+R('f')*.46),enemyDef=npcScores?npcScores.defense:d*(.7+R('f')*.44),enemyStamina=npcScores?npcScores.stamina:d,terrainMod=(terrain==='espace étroit'&&p.style==='Tireur')?-4:(terrain==='terrain ouvert'&&p.style==='Tireur')?4:(terrain==='terrain accidenté'&&p.style==='Mobile / esquive')?4:0,identityEdge=combatIdentityBonus(enemyStyle,terrain,d),npcLearning=opponent?npcAdaptationBonus(opponent,p.style,terrain):0,playerScore=cp.offense*.58+cp.defense*.34+cp.stamina*.08+edge+terrainMod+identityEdge+(R('f')-.5)*12,enemyScore=(npcScores?enemyOff*.58+enemyDef*.34+enemyStamina*.08:enemyOff*.6+enemyDef*.4)+(R('f')-.5)*12+Math.max(0,d-35)*(npcScores ? .10 : .16)+npcLearning,adv=playerScore-enemyScore,chance=cl(.5+adv/88,.03,.97),ok=R('f')<chance,margin=Math.abs(adv)+(R('f')*10),damage=0,outcome='';
 p.energy=cl(p.energy-(5+d*.08),0,100);
 if(ok){p.wins++;p.reputation+=4;p.combatXP+=3+d/18;gainCombatExperience(d,1);damage=margin<10?Math.round(2+R('f')*7):Math.round(R('f')*4);p.health=cl(p.health-damage,0,100);outcome=margin>22?'Victoire nette':margin>10?'Victoire':'Victoire difficile';if(p.haki.Armement)trainHaki('Armement',.35);if(p.haki.Observation)trainHaki('Observation',.35);if(p.fruit)trainFruit(.3);if(d>=55)attemptBreakthrough('combat',d);tl(t||'Combat',outcome+'. '+(damage?'Tu subis '+damage+'% de dégâts.':'Tu évites les blessures sérieuses.'),'major')}
 else{p.losses++;damage=Math.round(cl(7+(enemyScore-playerScore)*.28+R('f')*18,5,58)*diff()[1]);p.health=cl(p.health-damage,0,100);outcome=damage>35?'Défaite sévère':damage>18?'Défaite':'Repli forcé';if(damage>12){var sev=damage>35?3:damage>22?2:1,inj={name:injuryName(sev),months:sev*(1.5+R('inj')*2),severity:sev};p.conditions.push(inj)}tl(t||'Combat',outcome+'. Tu subis '+damage+'% de dégâts.','danger');var fatalChance=Math.min(.22,Math.max(0,(enemyScore-playerScore)/270))*combatFatalityMitigation();if(p.ageMonths>=240&&power()>=45)fatalChance*=.72;if(p.health<=0||R('f')<fatalChance)die('Mort lors d’un affrontement.');if(game.alive){p.combatXP+=1+d/40;gainCombatExperience(d,.32)}}
 var matchup=edge+terrainMod+identityEdge,upset=ok&&chance<=.34;recordCombatIdentity(enemyStyle,terrain,ok,upset,damage);var combatImportance=Math.round(cl(d*.72+(String(t||'').indexOf('Duel')>=0?10:0)+(String(t||'').indexOf('Mission')>=0?7:0)+(upset?18:0),0,100)),signatureTechnique=trainSignatureTechnique(ok,combatImportance),signatureFight=combatImportance>=58,opening=matchup>2?'Tu imposes rapidement ton style sur '+terrain+'.':matchup<-2?'Ton adversaire exploite mieux '+terrain+' au début du combat.':'L’ouverture reste équilibrée sur '+terrain+'.',turning=adv>10?'Ta maîtrise crée progressivement un avantage décisif.':adv<-10?'La pression adverse te force à subir une grande partie des échanges.':'Le combat reste indécis jusqu’aux derniers échanges.',ending=ok?(damage?'Tu l’emportes malgré '+damage+'% de dégâts.':'Tu conclus sans blessure sérieuse.'):(damage>35?'La défaite est lourde et laisse des séquelles.':'Tu dois rompre le combat et te replier.');
 if(signatureFight){var combatTitle=upset?'Exploit au combat':(t||'Combat majeur');recordSignatureMoment(combatTitle,upset?'Tu renverses un affrontement où tes chances initiales étaient de '+Math.round(chance*100)+'%.':outcome+' face à une opposition de niveau '+Math.round(d)+'.','combat',combatImportance);if(String(t||'').indexOf('Mission :')!==0)scheduleConsequence('combat',combatTitle,outcome,5+R('memory')*10,{success:ok,upset:upset,importance:combatImportance},Math.max(62,combatImportance),'combat:'+Math.round(p.ageMonths*100)+':'+String(t||'combat'))}
 if(signatureFight)rememberCausalMemory('combat',t||'Combat majeur',combatImportance,{kind:'combat',subjectId:String(t||'combat'),success:ok,upset:upset,terrain:terrain,enemyStyle:enemyStyle,region:p.region},'combat-memory:'+String(t||'combat'));
 game.lastCombat={title:t||'Combat',outcome:outcome,opponentPower:Math.round(opponent?relationPower(opponent):(enemyOff+enemyDef)/2),playerPower:Math.round(power()),opponentName:opponent?opponent.name:null,opponentStyle:enemyStyle,playerStyle:p.style,terrain:terrain,matchup:matchup,chance:Math.round(chance*100),damage:damage,signature:signatureFight,upset:upset,importance:combatImportance,phases:[{label:'Ouverture',text:opening},{label:'Tournant',text:turning},{label:'Conclusion',text:ending}],log:(matchup>2?'Ton style exploite le matchup. ':matchup<-2?'Le matchup te désavantage. ':'Le matchup est relativement neutre. ')+(p.haki.Observation?'Ton Observation aide à lire les attaques. ':'')+(p.haki.Armement?' Ton Armement renforce les échanges.':'')+(identityEdge>0?' Ton expérience personnelle du combat te donne un léger avantage.':'')+(npcLearning>0?' '+(opponent?opponent.name:'Ton adversaire')+' a appris de vos précédents affrontements.':'')};syncPowers();return ok}
function challengeFight(){var p=game.player;if(p.ageMonths<144)return toast('Tu es encore trop jeune pour chercher un vrai défi.');if(p.health<45)return toast('Ta santé est trop basse.');var d=inf().danger+12+R('f')*24,ok=fight(d,'Défi local à '+p.island);if(game.alive&&ok){var t=game.world.territories[p.island];if((p.faction==='Pirates'||p.faction==='Révolutionnaires')&&t&&(t.controller==='Marine'||t.controller==='Gouvernement'))registerCrime('Violence publique à '+p.island,2,null)}save();render();if(!game.alive)deathModal()}
function combatRiskLabel(d){
 var delta=power()-d;if(delta>=24)return'Favorable';if(delta>=8)return'Modéré';if(delta>=-10)return'Incertain';if(delta>=-25)return'Dangereux';return'Extrême'
}
var ADAPTIVE_MISSION_TEMPLATES={
 combat:[['neutralize','Neutraliser une menace',2,1.08],['repel','Repousser un groupe hostile',0,1.03],['ambush','Briser une embuscade',4,1.12],['defend','Défendre une position',-2,1]],
 navigation:[['chart','Cartographier un passage',-3,1],['currents','Relever des courants',-5,.96],['route','Ouvrir un nouvel itinéraire',0,1.08],['convoy','Guider un convoi',2,1.1]],
 medicine:[['wounded','Stabiliser des blessés',-4,1],['evac','Organiser une évacuation sanitaire',0,1.08],['outbreak','Traiter une urgence sanitaire',2,1.12],['clinic','Approvisionner un dispensaire',-5,.96]],
 science:[['anomaly','Analyser une anomalie',-4,1.02],['discovery','Expertiser une découverte',-2,1.05],['readings','Vérifier des relevés inhabituels',0,1.08],['study','Sécuriser une étude de terrain',2,1.1]],
 stealth:[['network','Infiltrer un réseau',2,1.1],['observe','Observer une cible sensible',-3,1],['intel','Extraire un renseignement',0,1.08],['watch','Mettre en place une surveillance',-5,.96]],
 command:[['escort','Coordonner une escorte',-2,1],['defense','Réorganiser une défense locale',0,1.05],['operation','Diriger une opération',3,1.12],['position','Sécuriser une position stratégique',2,1.1]],
 trade:[['deal','Négocier un convoi',-4,1],['exchange','Sécuriser un échange commercial',-2,1.05],['cargo','Évaluer une cargaison sensible',0,1.08],['counter','Ouvrir un comptoir temporaire',-5,.98]],
 hunt:[['trace','Retrouver une cible',0,1.05],['trail','Suivre une piste',-4,.98],['fugitive','Intercepter un fugitif',3,1.12],['hideout','Reconnaître un repaire',-2,1.03]],
 exploration:[['forgotten','Explorer une zone oubliée',-2,1.02],['rumor','Vérifier une rumeur locale',-4,.98],['passage','Rechercher un passage',0,1.05],['ruins','Inspecter des ruines',2,1.1]],
 rescue:[['civilians','Évacuer des civils',-2,1.02],['crew','Secourir un équipage',0,1.06],['rescue','Organiser un sauvetage',2,1.1],['survivors','Extraire des survivants',3,1.12]],
 mixed:[['crisis','Gérer une crise locale',0,1.03],['sensitive','Mener une opération sensible',2,1.08],['objective','Sécuriser un objectif prioritaire',3,1.1],['emergency','Répondre à une urgence',-2,1]]
};
var SPECIALIZATION_MISSION_PROFILE={Scientifique:'science',Médecin:'medicine',Navigateur:'navigation',Marchand:'trade',Renseignement:'stealth',Infiltration:'stealth',Traqueur:'hunt','Cipher Pol':'mixed',Combattant:'combat',Duelliste:'combat',Tireur:'hunt',Administration:'command',Logistique:'command','Quartier-maître':'command',Artisan:'science',Cuisinier:'medicine'};
var FACTION_MISSION_PROFILE={Civil:'navigation',Marine:'command',Pirates:'exploration','Chasseur de primes':'hunt',Révolutionnaires:'stealth',Gouvernement:'stealth'};
function adaptiveMissionOpportunity(){
 var p=game.player,ri=missionAccessIndex(),profile=SPECIALIZATION_MISSION_PROFILE[p.specialization]||FACTION_MISSION_PROFILE[p.faction]||'mixed',templates=ADAPTIVE_MISSION_TEMPLATES[profile]||ADAPTIVE_MISSION_TEMPLATES.mixed;
 var contexts=[['island','à '+p.island],['around','autour de '+p.island],['region','dans '+p.region],['routes','sur les routes de '+p.region],['sea-lanes','près des voies maritimes de '+p.region],['outskirts','aux abords de '+p.island]],recent=migrateLifeLoop(game).recentMissions||[],bucket=Math.floor((p.ageMonths||0)/4),best=null;
 templates.forEach(function(t){contexts.forEach(function(ctx){var variantKey=profile+':'+t[0]+':'+ctx[0]+':'+p.island,key='adaptive:'+variantKey,idx=recent.indexOf(key),novelty=idx<0?1:idx===0?.12:idx===1?.3:idx===2?.5:.72,tie=(H(String(game.seed)+':adaptive:'+bucket+':'+variantKey)%1000)/1000,score=novelty*3+tie;if(!best||score>best.score)best={template:t,context:ctx,variantKey:variantKey,score:score}})});
 if(!best)return null;
 var t=best.template,local=inf().danger,danger=cl(Math.round(13+ri*5.5+local*.28+(t[2]||0)+((H(best.variantKey+':'+bucket)>>>7)%7)-3),7,78);if(profile==='combat')danger=cl(danger-5,7,74);else if(profile==='mixed')danger=cl(danger-2,7,76);var tier=cl(Math.min(ri+1,Math.floor(Math.max(0,danger-8)/16)),0,6),factionPay=p.faction==='Révolutionnaires'?.38:p.faction==='Civil'?.82:1;
 var reward=Math.round((5500+danger*480+ri*2200)*(t[3]||1)*factionPay),xp=Math.round(9+danger*.34+ri*1.8);
 return{title:t[1]+' '+best.context[1],danger:danger,reward:reward,xp:xp,tier:tier,spec:p.specialization||null,months:1+Math.ceil(danger/30),profile:profile,adaptive:true,variantKey:best.variantKey,worldGenerated:false}
}
function sagaFollowupMissionOpportunity(){
 var p=game.player,w=game.world,ws=w.worldState||{},ri=rankIndex(),profile=SPECIALIZATION_MISSION_PROFILE[p.specialization]||FACTION_MISSION_PROFILE[p.faction]||'mixed';
 var sagas=(ws.worldSagas||[]).filter(function(s){var causal=(s.playerCausalMissions||0)>0,entry=!causal&&(s.pressure||0)>=58&&ri>=2&&p.ageMonths>=180;return s.status==='active'&&s.region===p.region&&(causal||entry)&&sagaPlayerRoleRank(s.playerRole||'present')<3}).sort(function(a,b){return((b.playerCausalMissions||0)>0?18:0)+((b.playerImpact||0)+(b.pressure||0)*.18)-(((a.playerCausalMissions||0)>0?18:0)+((a.playerImpact||0)+(a.pressure||0)*.18))});
 if(!sagas.length)return null;
 var s=sagas[0],impact=s.playerImpact||0,causal=(s.playerCausalMissions||0)>0,phase=!causal?'entry':impact<22?'entry':impact<42?'escalation':'culmination',danger=cl(Math.round(18+(s.pressure||0)*.28+Math.min(14,ri*3)),18,76),tier=Math.min(ri+2,Math.max(2,Math.floor(danger/18)));
 return{title:(phase==='entry'?(causal?'Revenir sur ':'Entrer dans '):phase==='escalation'?'Peser davantage sur ':'Tenter de faire basculer ')+s.title,danger:danger,reward:Math.round(11000+danger*500+(s.pressure||0)*110),xp:Math.round(15+danger*.36+(s.pressure||0)*.05),tier:tier,spec:p.specialization||null,months:1+Math.ceil(danger/30),profile:profile,sourceType:'saga',sourceId:s.id,sourceName:s.title,worldGenerated:true,variantKey:phase};
}
function worldMissionOpportunities(){
 var p=game.player,w=game.world,ri=missionAccessIndex(),out=[],region=p.region;
 var sagaFollowup=sagaFollowupMissionOpportunity();if(sagaFollowup)out.push(sagaFollowup);
 var crews=w.crews.filter(function(c){return c.status==='active'&&c.region===region&&(c.faction!==p.faction||p.faction==='Pirates')}).sort(function(a,b){return (b.power+(b.playerGrudge||0)*.28+arcPressureFor('crew',b.id)*.16)-(a.power+(a.playerGrudge||0)*.28+arcPressureFor('crew',a.id)*.16)});
 if(crews.length){var c=crews[0],profile=p.faction==='Marine'||p.faction==='Chasseur de primes'?'hunt':p.faction==='Révolutionnaires'||p.faction==='Gouvernement'?'stealth':'combat',verb=p.faction==='Marine'||p.faction==='Chasseur de primes'?'Intercepter ':p.faction==='Révolutionnaires'||p.faction==='Gouvernement'?'Surveiller ':'Affronter ';out.push({title:verb+c.name,danger:Math.round(cl(c.power*.72+inf().danger*.22,18,86)),reward:Math.round(9000+c.power*620),xp:Math.round(12+c.power*.45),tier:cl(Math.floor(c.power/16),0,6),spec:null,months:1+Math.ceil(c.power/32),profile:profile,sourceType:'crew',sourceId:c.id,sourceName:c.name,worldGenerated:true})}
 var conflicts=w.conflicts.filter(function(c){return c.status==='active'&&(c.region===region||c.location===p.island)}).sort(function(a,b){return b.intensity-a.intensity});if(conflicts.length){var cf=conflicts[0];out.push({title:'Intervenir dans le conflit de '+cf.location,danger:Math.round(cl(cf.intensity*.78+inf().danger*.18,22,90)),reward:Math.round(12000+cf.intensity*520),xp:Math.round(16+cf.intensity*.42),tier:cl(Math.floor(cf.intensity/17),1,6),spec:null,months:1+Math.ceil(cf.intensity/30),profile:'mixed',sourceType:'conflict',sourceId:cf.id,sourceName:cf.location,worldGenerated:true})}
 var actors=w.actors.filter(function(a){return a.status==='active'&&a.region===region&&a.faction!==p.faction&&diplomacy(p.faction,a.faction)<-25&&(a.intention==='Étendre son influence'||a.intention==='Chercher un affrontement')}).sort(function(a,b){return b.importance-a.importance});if(actors.length){var a=actors[0],d=cl(actorPower(a)*.55+inf().danger*.15,20,78);out.push({title:'Renseignement sur '+a.name,danger:Math.round(d),reward:Math.round(10000+d*360),xp:Math.round(15+d*.34),tier:cl(Math.floor(d/18),1,5),spec:null,months:2,profile:'stealth',sourceType:'actor',sourceId:a.name,sourceName:a.name,worldGenerated:true})}
 return out.filter(function(m){return m.tier<=ri+2}).slice(0,2)
}
function missionImportance(m,world){
 var score=(m.danger||0)*.45+(m.tier||0)*5+(m.worldGenerated?10:0),w=world||(game&&game.world)||{crews:[],conflicts:[],actors:[]};
 if(m.sourceType==='crew'){var c=(w.crews||[]).find(function(x){return x.id===m.sourceId});if(c)score+=(c.power||0)*.12+(c.playerGrudge||0)*.15+arcPressureFor('crew',c.id)*.08}
 else if(m.sourceType==='conflict'){var cf=(w.conflicts||[]).find(function(x){return x.id===m.sourceId});if(cf)score+=(cf.intensity||0)*.16}
 else if(m.sourceType==='actor'){var a=(w.actors||[]).find(function(x){return x.name===m.sourceId});if(a)score+=Math.min(18,(a.importance||1)*4)}
 else if(m.sourceType==='destiny')score+=12+lifeImportanceStage().index*3;
 else if(m.sourceType==='saga'){var directSaga=(w.worldState&&w.worldState.worldSagas||[]).find(function(x){return x.id===m.sourceId});if(directSaga)score+=10+(directSaga.pressure||0)*.12+sagaPlayerRoleRank(directSaga.playerRole||'present')*3}
 if(m.worldGenerated&&game&&w===game.world){var saga=missionSagaTarget(m);if(saga){var pressure=saga.pressure||0,months=saga.months||0,urgency=Math.max(0,pressure-60)*.22+Math.max(0,months-12)*.08+(saga.stage==='Point culminant'?3:saga.stage==='Escalade'?1:0);score+=Math.min(10,urgency)}}
 return Math.round(cl(score,0,100))
}
function missionStakes(m,world){var v=missionImportance(m,world);return v>=72?'Décisive':v>=58?'Exceptionnelle':v>=44?'Importante':'Standard'}
function missionNoveltyKey(m){return m.worldGenerated?(m.sourceType==='saga'?'saga:'+(m.sourceId||m.sourceName||m.title)+':'+(m.variantKey||'phase'):(m.sourceType||'world')+':'+(m.sourceId||m.sourceName||m.title)):m.adaptive?'adaptive:'+(m.variantKey||m.title):'static:'+m.title}
function missionNoveltyScore(m){var recent=migrateLifeLoop(game).recentMissions||[],i=recent.indexOf(missionNoveltyKey(m));return i<0?1:i===0?.05:i===1?.34:i===2?.62:.82}
function rememberMission(m){var l=migrateLifeLoop(game),key=missionNoveltyKey(m);l.recentMissions=l.recentMissions.filter(function(x){return x!==key});l.recentMissions.unshift(key);l.recentMissions=l.recentMissions.slice(0,6)}
function missionGuidance(m){var c=m.chance||0;if(c>=.72)return'Sûre';if(c>=.56)return'Adaptée';if(c>=.40)return'Ambitieuse';return m.signature?'Signature extrême':'Extrême'}
function routineMission(){
 var p=game.player,profileBySpec={Scientifique:'science',Médecin:'medicine',Navigateur:'navigation',Marchand:'trade',Renseignement:'stealth',Infiltration:'stealth',Traqueur:'hunt','Cipher Pol':'mixed',Combattant:'combat',Duelliste:'combat',Tireur:'hunt',Administration:'command',Logistique:'command','Quartier-maître':'command',Artisan:'science',Cuisinier:'medicine'},defaultProfile={Civil:'navigation',Marine:'command',Pirates:'exploration','Chasseur de primes':'hunt',Révolutionnaires:'stealth',Gouvernement:'stealth'},titles={Civil:'Mission locale encadrée',Marine:'Patrouille d’entraînement',Pirates:'Repérage côtier','Chasseur de primes':'Filature de routine',Révolutionnaires:'Transmission sécurisée',Gouvernement:'Surveillance locale'},rewards={Civil:4500,Marine:6000,Pirates:7500,'Chasseur de primes':8000,Révolutionnaires:1800,Gouvernement:6500},profile=profileBySpec[p.specialization]||defaultProfile[p.faction]||'mixed',m={title:titles[p.faction]||'Mission de routine',danger:8,reward:rewards[p.faction]||4500,xp:8,tier:0,spec:p.specialization||null,months:1,worldGenerated:false,routine:true,profile:profile};var score=missionScore(m);m.danger=cl(Math.round(score-6),5,24);return m
}
function missionRecommendationScore(m,spec){var fit=m.spec===spec?1:m.spec?-.15:.15,world=m.worldGenerated?.3:0,adaptive=m.adaptive?.04:0,signature=m.signature?.08:0,linked=(m.worldGenerated&&missionSagaTarget(m))?0.18:0,continuity=m.sourceType==='saga'?0.16:0,novel=(m.novelty||1)*.34,safety=(m.chance||0)*1.7,riskPenalty=m.chance<.45?(.45-m.chance)*2.8:0,repeatPenalty=(m.novelty||1)<.10?.48:(m.novelty||1)<.40?.18:0,arc=m.worldGenerated?Math.min(.18,arcPressureFor(m.sourceType,m.sourceId||m.sourceName)/500):0,narrative=m.narrativeBoost==null?narrativeMissionBoost(m):m.narrativeBoost;return safety+fit*.22+world+adaptive+signature+linked+continuity+novel+arc+narrative-riskPenalty-repeatPenalty}
function board(){var p=game.player,a=MISSIONS[p.faction]||MISSIONS.Civil,ri=missionAccessIndex(),spec=p.specialization,adaptive=adaptiveMissionOpportunity();var destinyOffer=destinyMissionOpportunity(),options=a.filter(function(m){return m.tier<=ri+1&&(!m.spec||m.spec===spec)}).map(function(m){var x={title:m.title,danger:Math.round(m.danger+inf().danger*.22),reward:Math.round(m.reward*(1+ri*.1)),xp:m.xp,tier:m.tier,spec:m.spec||null,months:1+Math.ceil(m.danger/28),worldGenerated:false};x.profile=missionProfile(x).id;return x}).concat(adaptive?[adaptive]:[]).concat(destinyOffer?[destinyOffer]:[]).concat(worldMissionOpportunities());options.forEach(function(x){x.reward=Math.round(x.reward*missionRewardMultiplier(x));x.approach=missionProfile(x).config.label;x.chance=missionChance(x);x.novelty=missionNoveltyScore(x);x.importance=missionImportance(x);x.stakes=missionStakes(x);x.signature=x.importance>=58;x.guidance=missionGuidance(x);x.narrativeBoost=narrativeMissionBoost(x);x.narrativePriority=x.destiny||x.narrativeBoost>=.18;x.recommendationScore=missionRecommendationScore(x,spec)+(x.destiny?.20+lifeImportanceStage().index*.035:0)});if(!options.some(function(x){return x.chance>=.45})){var routine=routineMission();routine.reward=Math.round(routine.reward*missionRewardMultiplier(routine));routine.approach=missionProfile(routine).config.label;routine.chance=missionChance(routine);routine.novelty=.7;routine.importance=18;routine.stakes='Routine';routine.signature=false;routine.guidance=missionGuidance(routine);routine.narrativeBoost=narrativeMissionBoost(routine);routine.narrativePriority=false;routine.recommendationScore=missionRecommendationScore(routine,spec)+.15;options.push(routine)}options.sort(function(x,y){return y.recommendationScore-x.recommendationScore||y.chance-x.chance||y.novelty-x.novelty||x.tier-y.tier});var chosen=[],safeOptions=options.filter(function(x){return x.chance>=.45}),topSafe=safeOptions.reduce(function(a,x){return Math.max(a,x.chance||0)},0),safePool=safeOptions.filter(function(x){var linked=x.worldGenerated&&missionSagaTarget(x);return x.chance>=topSafe-(linked?0.14:0.08)&&(x.novelty||1)>.10}),safeBest=(safePool.length?safePool:safeOptions).sort(function(x,y){return y.recommendationScore-x.recommendationScore||y.chance-x.chance})[0]||null,destinyBest=options.find(function(x){return x.destiny}),worldBest=options.find(function(x){return x.worldGenerated&&!x.destiny})||options.find(function(x){return x.worldGenerated}),adaptiveBest=options.find(function(x){return x.adaptive});function addChoice(x){if(x&&chosen.indexOf(x)<0&&chosen.length<3)chosen.push(x)}addChoice(safeBest);addChoice(destinyBest);addChoice(worldBest);addChoice(adaptiveBest);options.forEach(addChoice);chosen.sort(function(x,y){return y.recommendationScore-x.recommendationScore});var safest=chosen.reduce(function(a,x){return Math.max(a,x.chance||0)},0),recommendable=chosen.filter(function(x){var linked=x.worldGenerated&&missionSagaTarget(x);return x.chance>=.45&&x.chance>=safest-(linked?0.14:0.08)}).sort(function(x,y){return y.recommendationScore-x.recommendationScore||y.chance-x.chance})[0]||null;return chosen.map(function(x,i){x.id=i;x.recommended=!!recommendable&&x===recommendable;return x})}
function migrateWorldMissionSource(g,w){
 var m=g&&g.mission;if(!m||!m.worldGenerated)return m;
 if(m.sourceType==='conflict'){var sid=String(m.sourceId||'');if(sid.indexOf('|')<0){}else{var parts=sid.split('|'),matches=(w.conflicts||[]).filter(function(x){return x.status==='active'&&x.location===parts[0]&&x.attacker===parts[1]&&x.defender===parts[2]});m.sourceId=matches.length===1?matches[0].id:null}}
 if(!m.sagaId){var target=missionSagaTargetFor(m,g.player,w);if(target)m.sagaId=target.id}
 return m
}
function applyWorldMissionOutcome(m,success){
 if(!m||!m.worldGenerated)return;var w=game.world;
 if(m.sourceType==='crew'){var c=w.crews.find(function(x){return x.id===m.sourceId});if(c){if(success){c.morale=cl(c.morale-8,0,100);c.resources=cl((c.resources||0)-7,0,100);c.power=cl(c.power-(.4+R('mission')*.8),6,96);c.defeats=(c.defeats||0)+1;c.lastIntentOutcome='subit l’intervention de '+game.player.name;if(c.morale<12&&R('mission')<.22)c.status='destroyed'}else{c.morale=cl(c.morale+3,0,100);c.victories=(c.victories||0)+1}news('Conséquence de mission',success?c.name+' ressort affaibli de ton intervention.':c.name+' renforce sa réputation après ton échec.','')}}
 else if(m.sourceType==='conflict'){var sid=String(m.sourceId||''),cf=w.conflicts.find(function(x){return x.id===sid&&x.status==='active'});if(cf){cf.intensity=cl(cf.intensity+(success?-9:4),0,100);news('Conflit influencé',game.player.name+(success?' réduit':' aggrave')+' la tension autour de '+cf.location+'.','major')}}
 else if(m.sourceType==='actor'){var a=w.actors.find(function(x){return x.name===m.sourceId});if(a){a.momentum=cl((a.momentum||0)+(success?-1.2:.6),-8,12);a.influence=cl((a.influence==null?50:a.influence)+(success?-2:1),0,100);a.lastIntentOutcome=success?'voit son initiative contrariée par '+game.player.name:'échappe à l’intervention de '+game.player.name}}
 else if(m.sourceType==='saga'){var ws=w.worldState||{},s=(ws.worldSagas||[]).find(function(x){return x.status==='active'&&x.id===m.sourceId});if(s){s.playerMissionSuccesses=(s.playerMissionSuccesses||0)+(success?1:0);s.playerMissionFailures=(s.playerMissionFailures||0)+(success?0:1)}}
}
function startMission(i){if(game.mission||game.player.ageMonths<180)return toast('Mission indisponible.');var m=board()[i];if(!m)return toast('Mission introuvable.');rememberMission(m);var p=game.player,sagaTarget=missionSagaTarget(m);game.mission={title:m.title,danger:m.danger,reward:m.reward,xp:m.xp,tier:m.tier,spec:m.spec,profile:m.profile,remaining:m.months,adaptive:!!m.adaptive,variantKey:m.variantKey||null,worldGenerated:!!m.worldGenerated,sourceType:m.sourceType||null,sourceId:m.sourceId||null,sourceName:m.sourceName||null,sagaId:sagaTarget?sagaTarget.id:null,importance:m.importance||missionImportance(m),stakes:m.stakes||missionStakes(m),signature:!!m.signature,destiny:!!m.destiny,variantKey:m.variantKey||null};p.situation='Mission';p.activity='Mission';tl(m.signature?'Mission exceptionnelle acceptée':'Mission acceptée',m.title+' • '+(m.stakes||missionStakes(m))+' • approche principale : '+missionProfile(m).config.label+' • focus '+currentFocus()+' conservé.','major');save();render()}
function missionReputation(success,m){var p=game.player,d=success?(5+m.tier*2):-(3+m.tier);adjustRep(p.faction,d);if(success){if(p.faction==='Marine'){adjustRep('Gouvernement',1);adjustRep('Pirates',-1)}if(p.faction==='Pirates'){adjustRep('Marine',-2);adjustRep('Gouvernement',-1)}if(p.faction==='Révolutionnaires')adjustRep('Gouvernement',-2);if(p.faction==='Gouvernement')adjustRep('Révolutionnaires',-2);if(p.faction==='Chasseur de primes')adjustRep('Civil',1)}}
function playerWorldImpact(success,m){var p=game.player,w=game.world,t=w.territories[p.island];if(!t)return;var f=p.faction,scale=(m.tier||0)+1;if(success){if(w.factions[f]!=null)w.factions[f]=cl(w.factions[f]+scale*.18,0,100);if(f==='Civil'||f==='Chasseur de primes'){t.stability=cl(t.stability+scale*2,0,100)}else if(t.controller===f||(f==='Marine'&&t.controller==='Gouvernement')||(f==='Gouvernement'&&t.controller==='Marine')){t.influence=cl(t.influence+scale*2.4,0,100);t.stability=cl(t.stability+scale,0,100)}else{t.influence=cl(t.influence-scale*2.2,0,100);t.stability=cl(t.stability-scale*2,0,100);t.contested=t.influence<55;if((m.tier||0)>=3&&R('world')<.35)spawnConflict(p.island,f,t.controller,45+scale*6,'player')}if((m.tier||0)>=4){w.divergence=cl(w.divergence+.4*scale,0,100);news('Intervention remarquée',p.name+' influence directement l’équilibre autour de '+p.island+'.','major')}}else{t.stability=cl(t.stability-scale*1.2,0,100);if(w.factions[f]!=null)w.factions[f]=cl(w.factions[f]-.08*scale,0,100)}var linkedSaga=missionSagaTarget(m),sagaWeight=scale*(m.worldGenerated?2.2:1.2)*(success?1:.45),sagaRole='indirect',targetSagaId=null;if(linkedSaga){var missionWeight=m.importance||missionImportance(m),directorEntry=m.sourceType==='saga'&&m.variantKey==='entry'&&(linkedSaga.playerCausalMissions||0)===0;if(directorEntry)linkedSaga.playerDirectorEntry=true;linkedSaga.playerCausalMissions=(linkedSaga.playerCausalMissions||0)+1;linkedSaga.playerLastCausalMonth=(game.world.year||0)*12+(game.world.month||0);sagaWeight+=(success?8:4)+scale*(success?1.8:.9)+Math.min(8,missionWeight*.1)*(success?1:.5)+(m.sourceType==='saga'?(success?6:3):0);if((m.tier||0)>=3||missionWeight>=58)sagaRole='participant';var sustainedSaga=(linkedSaga.playerCausalMissions||0)>=4;if(success&&!sustainedSaga)sagaWeight=Math.min(sagaWeight,Math.max(0,54-(linkedSaga.playerImpact||0)));if(success&&(m.tier||0)>=4&&missionWeight>=72&&m.variantKey!=='entry'&&sustainedSaga)sagaWeight=Math.max(sagaWeight,55-(linkedSaga.playerImpact||0));if(!success&&sagaPlayerRoleRank(linkedSaga.playerRole||'present')<3)sagaWeight=Math.min(sagaWeight,Math.max(0,54-(linkedSaga.playerImpact||0)));targetSagaId=linkedSaga.id;registerPlayerSagaImpact(sagaRole,'mission:'+m.title,sagaWeight,targetSagaId)}}
function missionOutcomeFlavor(m,mp,ok,effective){
 var p=game.player,id=mp.id,keys=mp.config.keys||[],primary=keys[0]||'Discipline',secondary=keys[1]||primary,roll=R('missionFlavor'),detail='',impact=null;
 if(ok){
  var gained=gain(roll<.68?primary:secondary,.42+(m.tier||0)*.16+R('missionFlavor')*.32);
  if(effective>=45)attemptBreakthrough(id,effective,keys);
  if(id==='navigation'){if(roll<.34){p.energy=cl(p.energy+4,0,100);detail='Route optimisée • fatigue économisée'}else if(roll<.68){p.money+=Math.round(800+effective*75);detail='Passage sécurisé • opportunité logistique'}else detail='Navigation précise • '+(roll<.84?primary:secondary)+' consolidé'}
  else if(id==='science'){if(roll<.4){p.reputation+=2;detail='Découverte exploitable • réputation scientifique renforcée'}else if(roll<.75){p.money+=Math.round(1000+effective*90);detail='Résultat valorisable • financement obtenu'}else detail='Analyse décisive • '+secondary+' mobilisé'}
  else if(id==='medicine'){p.health=cl(p.health+3+Math.round(effective*.04),0,100);detail=roll<.55?'Intervention propre • équipe stabilisée':'Diagnostic juste • récupération facilitée'}
  else if(id==='stealth'){detail=roll<.5?'Infiltration invisible • aucune alerte déclenchée':'Renseignement extrait • couverture préservée';if(roll>.72)adjustRep(p.faction,1)}
  else if(id==='command'){p.energy=cl(p.energy+2,0,100);detail=roll<.5?'Ordres efficaces • opération tenue':'Équipe coordonnée • pertes évitées'}
  else if(id==='trade'){var profit=Math.round(1500+effective*115);p.money+=profit;detail='Accord avantageux • +'+profit.toLocaleString('fr-FR')+' B'}
  else if(id==='hunt'){detail=roll<.48?'Piste verrouillée • cible anticipée':'Interception propre • terrain maîtrisé'}
  else if(id==='exploration'){var site=explorationSite(p.island);site.familiarity=cl((site.familiarity||0)+3+effective*.03,0,100);detail=roll<.55?'Découverte utile • connaissance locale accrue':'Passage documenté • exploration consolidée'}
  else if(id==='rescue'){p.reputation+=2;p.health=cl(p.health+2,0,100);detail='Sauvetage maîtrisé • survivants sécurisés'}
  else{detail=mp.config.label+' maîtrisée'}
  if(gained)detail+=' • '+(roll<.68?primary:secondary)+' +'+gained.toFixed(1);
 }else{
  var harm=Math.round(Math.max(0,(effective-missionScore(m))*.07)+R('missionFlavor')*3);
  if(id==='rescue'||id==='navigation'||id==='hunt'||id==='mixed')p.health=cl(p.health-harm,1,100);
  if(id==='navigation'){p.energy=cl(p.energy-4,0,100);detail='Route perdue • détour coûteux'}
  else if(id==='science')detail='Hypothèse invalide • données insuffisantes';
  else if(id==='medicine'){p.energy=cl(p.energy-5,0,100);detail='Intervention sous pression • stabilisation incomplète'}
  else if(id==='stealth')detail='Couverture compromise • repli nécessaire';
  else if(id==='command')detail='Coordination rompue • objectif abandonné';
  else if(id==='trade'){var loss=Math.min(p.money,Math.round(700+effective*55));p.money-=loss;detail='Négociation défavorable • -'+loss.toLocaleString('fr-FR')+' B'}
  else if(id==='hunt')detail='Piste perdue • cible échappée';
  else if(id==='exploration')detail='Recherche infructueuse • progression ralentie';
  else if(id==='rescue')detail='Extraction incomplète • situation aggravée';
  else detail='Échec de '+mp.config.label.toLowerCase();
  if((id==='stealth'||id==='hunt'||id==='mixed')&&effective>=48&&R('missionFlavor')<.22)impact='extraction';
 }
 return{detail:detail,impact:impact}
}
function missionResolution(m){var p=game.player,effective=organizationMissionDanger(m),mp=missionProfile(m),score=missionScore(m),chance=missionChance(m),ok=false,detail='';if(mp.config.combat){ok=fight(effective,'Mission : '+m.title);if(!game.alive)return{ok:false,dead:true,profile:mp.config.label,chance:chance,score:score,effective:effective};detail='Affrontement direct'}else{ok=R('mission')<chance;p.energy=cl(p.energy-(3+effective*.035),0,100);var flavor=missionOutcomeFlavor(m,mp,ok,effective);detail=flavor.detail;if(!ok&&flavor.impact==='extraction'){var survived=fight(Math.max(20,effective*.68),'Extraction compromise');if(!game.alive)return{ok:false,dead:true,profile:mp.config.label,chance:chance,score:score,effective:effective};detail+=' • '+(survived?'extraction réussie':'repli difficile')}}return{ok:ok,dead:false,profile:mp.config.label,chance:chance,score:score,effective:effective,detail:detail}}
function resolveMission(){var m=game.mission,p=game.player,rec=careerRecord(),result=missionResolution(m);if(!game.alive||result.dead)return;var ok=result.ok,signature=!!m.signature,xpGain=signature?Math.round(m.xp*1.2):m.xp,reward=signature?Math.round(m.reward*1.15):m.reward;if(ok){var paid=organizationMissionResult(true,m,reward);p.money+=paid;p.reputation+=signature?8:6;rec.xp+=xpGain;rec.successes++;recordCareerMissionEvidence(rec,true,m,result);updateCareerMomentum(rec,true,m.importance||missionImportance(m));missionReputation(true,m);playerWorldImpact(true,m);justiceMissionImpact(true,m);applyWorldMissionOutcome(m,true);tl(signature?'MISSION SIGNATURE ACCOMPLIE':'Mission accomplie',m.title+' • '+result.profile+' • '+result.detail+'. +'+xpGain+' XP carrière.','major');if(signature){recordSignatureMoment('Mission — '+m.title,'Réussite sur une mission '+(m.stakes||'exceptionnelle').toLowerCase()+' avec '+Math.round(result.chance*100)+'% de chance estimée.','mission',Math.max(65,m.importance||60));if(!m.worldGenerated)signalPersonalChapter('career','Ascension au sein de '+(CAREERS[p.faction]?CAREERS[p.faction].label:p.faction),10+Math.min(8,(m.importance||60)/12),'mission:'+m.title,p.faction)}}else{organizationMissionResult(false,m,0);rec.xp+=Math.round(xpGain*.25);rec.failures++;recordCareerMissionEvidence(rec,false,m,result);updateCareerMomentum(rec,false,m.importance||missionImportance(m));missionReputation(false,m);playerWorldImpact(false,m);justiceMissionImpact(false,m);applyWorldMissionOutcome(m,false);tl(signature?'ÉCHEC SUR MISSION SIGNATURE':'Mission échouée',m.title+' • '+result.profile+' • '+result.detail+'.','danger');if(signature)recordSignatureMoment('Mission — '+m.title,'Échec sur un enjeu '+(m.stakes||'exceptionnel').toLowerCase()+'.','mission',Math.max(60,m.importance||60))}if(m.worldGenerated&&(m.importance||0)>=44){var narrativeSaga=missionSagaTarget(m),worldTitle=narrativeSaga?'Saga — '+narrativeSaga.title:'Enjeu de '+p.region;signalPersonalChapter('world',worldTitle,ok?12+Math.min(10,(m.importance||44)/10):8,'world-mission:'+m.title+':'+(ok?'success':'failure'),narrativeSaga?narrativeSaga.id:(m.sourceId||p.region))}if(signature||m.worldGenerated){var missionSagaMemory=missionSagaTarget(m);rememberCausalMemory('mission',m.title,Math.max(48,m.importance||missionImportance(m)),{kind:m.sourceType||'career',sourceId:m.sourceId||null,sagaId:missionSagaMemory?missionSagaMemory.id:null,subjectId:m.sourceId||(missionSagaMemory&&missionSagaMemory.id)||p.faction,success:ok,region:p.region},'mission-memory:'+String(m.sourceType||'career')+':'+String(m.sourceId||m.title));scheduleConsequence('mission',m.title,ok?'Cette réussite continue de produire des effets.':'Cet échec continue de produire des effets.',5+R('memory')*9,{success:ok,sourceType:m.sourceType||null,sourceId:m.sourceId||null,sourceName:m.sourceName||null,stakes:m.stakes||missionStakes(m),importance:m.importance||missionImportance(m)},signature?Math.max(72,m.importance||72):62,'mission:'+Math.round(p.ageMonths*100)+':'+m.title+':'+(m.sourceId||''))}if(ok){var profKeys=missionProfile(m).config.keys||[];attemptBreakthrough('mission',Math.max(48,m.importance||missionImportance(m),result.effective||0),profKeys)}registerDestinyMissionEvidence(m,result,ok);if(ok&&m.destiny){recordSignatureMoment('Appel du monde — '+m.title,'Ta position attire désormais des missions qui n’auraient jamais été proposées au début de ta carrière.','destiny',88);signalPersonalChapter('career',destinyProfile().title,14,'destiny-mission:'+m.title,p.faction)}game.lastMission={title:m.title,profile:result.profile,score:Math.round(result.score),danger:Math.round(result.effective),chance:Math.round(result.chance*100),success:ok,signature:signature,stakes:m.stakes||missionStakes(m),importance:m.importance||missionImportance(m)};game.mission=null;p.situation='Carrière';p.activity='Carrière';evaluatePromotion()}

function settleCareerNetwork(dest){
 var p=game.player;if(p.career==='Aucune')return null;var local=game.relations.filter(function(r){return r.status==='active'&&!r.canonical&&r.npcAgeMonths>=180&&r.location===dest&&r.role!=='rival'&&r.role!=='mentor'&&r.role!=='parent'&&r.role!=='frère / sœur'});if(local.length>=2)return null;
 var chance=local.length?.45:1;if(R('life')>=chance)return null;var r=createRelation('collègue');r.faction=p.faction;r.location=dest;r.region=infStatic(dest).region;r.npcAgeMonths=Math.max(216,p.ageMonths-36+R('life')*72);r.affection=Math.max(r.affection,48+R('life')*12);r.trust=Math.max(r.trust,46+R('life')*10);r.respect=Math.max(r.respect,44+R('life')*12);addRelationMemory(r,'Vos trajectoires professionnelles se croisent après ton arrivée à '+dest+'.','career');recordLifeDirector('network','Nouveau lien professionnel à '+dest,{relationId:r.id,destination:dest});return r
}
function req(d){var r=inf(d).region,p=game.player;if(r==='Grand Line'&&p.skills.Navigation<18)return[false,'Navigation 18'];if(r==='New World'&&(p.skills.Navigation<35||power()<35))return[false,'Navigation 35 + puissance 35'];return[true,'']}
function beginJourney(d,source,context){var q=req(d);if(!q[0]||game.player.travel)return false;context=context||{};var p=game.player,z=inf(d).danger,est=routeEstimate(p.island,d),mo=est.months,cond=est.condition,isFresh=p.visited.indexOf(d)<0;p.travel={from:p.island,destination:d,remaining:mo,total:mo,danger:z,condition:cond.id,logs:[],startedAge:p.ageMonths,source:source||'manual',reason:context.reason||null};p.situation='Navigation';p.activity='Navigation';migrateExploration(p).journeys++;addJourneyLog('Départ','Cap sur '+d+' sous '+cond.name.toLowerCase()+'.');var mobilityLabel=source==='career-transfer'?directorMobilityWording().journey:'Départ en mer';tl(mobilityLabel,'Cap sur '+d+' • '+cond.name+'.','major');if(source!=='career-transfer'){var manualDirector=migrateLifeDirector(p),manualTiming=directorMobilityTiming(),manualPartner=partnerRelation();manualDirector.lastMobilityAge=Math.max(manualDirector.lastMobilityAge||-999,p.ageMonths-Math.max(0,manualTiming.floor-9));if(manualPartner){p.travel.householdPartnerId=manualPartner.id;p.travel.partnerFollows=false;if(manualPartner.location!==d&&!manualPartner.longDistance){manualPartner.longDistance=true;addRelationMemory(manualPartner,'Ton voyage vers '+d+' vous place temporairement à distance.','family')}}signalPersonalChapter('journey','Voyages à travers les mers',isFresh?16:8,'journey:'+p.island+'>'+d,'manual-journey')} if(source==='career-transfer'){var dr=migrateLifeDirector(p),partner=partnerRelation(),reason=context.reason||directorTravelContext(d).reason;dr.lastMobilityAge=p.ageMonths;p.travel.reason=reason;dr.acceptedMoves++;if(partner){var follows=p.life.relationshipStatus==='Marié'||partner.loyalty>=65||partner.trust>=72;p.travel.householdPartnerId=partner.id;p.travel.partnerFollows=follows;if(!follows){partner.longDistance=true;partner.affection=cl(partner.affection-3,0,100);addRelationMemory(partner,'Ta mutation vers '+d+' vous place temporairement à distance.','family')}}recordLifeDirector('mobility','Déplacement professionnel vers '+d,{destination:d,source:source,reason:reason,partnerFollows:partner?!!p.travel.partnerFollows:null});signalPersonalChapter('journey','Grand voyage professionnel',24,'relocation:'+p.island+'>'+d,p.faction);p.careerHistory.push({age:age(),type:'relocation',faction:p.faction,to:d,source:'life-director',reason:reason});p.careerHistory=p.careerHistory.slice(-60)}return true}
function go(d){var q=req(d);if(!q[0])return toast('Accès verrouillé : '+q[1]);var p=game.player,z=inf(d).danger,est=routeEstimate(p.island,d),mo=est.months,cond=est.condition;decision('Prendre la mer','Voyager vers '+d+' prendra environ '+mo+' mois. Conditions prévues : '+cond.name+'.',[['Partir','Danger '+z+'/100 • cargaison '+Math.round(est.load*100)+'% • '+cond.name,function(){beginJourney(d,'manual')}],['Rester','Annuler.',function(){}]])}
function travel(m){var p=game.player,t=p.travel;if(!t)return;seaJourneyTick(m);if(!game.alive)return;t.remaining-=m;if(t.remaining<=0){var dest=t.destination,site=explorationSite(dest),household=t.householdPartnerId?relationById(t.householdPartnerId):null,careerArrival=t.source==='career-transfer';p.island=dest;p.region=inf(dest).region;p.travel=null;p.situation=careerArrival?'Carrière':'Arrivée';p.activity=careerArrival?'Carrière':'Explorer';if(household&&t.partnerFollows){household.location=dest;household.region=p.region;household.longDistance=false;addRelationMemory(household,'Vous vous installez ensemble à '+dest+' après une mutation.','family')}var reunited=partnerRelation();if(reunited&&reunited.longDistance&&reunited.location===dest){reunited.longDistance=false;addRelationMemory(reunited,'Vous êtes de nouveau réunis à '+dest+'.','family')}if(t.source==='career-transfer')settleCareerNetwork(dest);site.visits=(site.visits||0)+1;site.familiarity=cl(site.familiarity+8+(p.skills.Navigation||0)*.03,0,100);if(p.visited.indexOf(p.island)<0)p.visited.push(p.island);if(game.codex.places.indexOf(p.island)<0)game.codex.places.push(p.island);inspectSmugglingAtArrival(p.island);discoverByKnowledge(p.island);tl('Nouvelle destination','Tu arrives à '+p.island+'. Première impression : '+islandProfile(p.island).identity,'major')}}
function hostileCandidates(defender){
 var map={Marine:['Pirates','Révolutionnaires'],Gouvernement:['Pirates','Révolutionnaires'],Pirates:['Marine','Gouvernement','Chasseur de primes'],Révolutionnaires:['Gouvernement','Marine'],Civil:['Pirates'], 'Chasseur de primes':['Pirates']};
 return map[defender]||['Pirates','Marine']
}

function defaultStrategy(){return{actions:1,campaignsLed:0,warsWon:0,warsLost:0,frontsJoined:0,supportSpent:0,lastWarId:null}}
function migrateStrategy(p){p.strategy=p.strategy||defaultStrategy();var x=p.strategy;x.actions=x.actions==null?1:x.actions;x.campaignsLed=x.campaignsLed||0;x.warsWon=x.warsWon||0;x.warsLost=x.warsLost||0;x.frontsJoined=x.frontsJoined||0;x.supportSpent=x.supportSpent||0;x.lastWarId=x.lastWarId||null;return x}
function initGrandStrategy(w){
 w.wars=w.wars||[];w.treaties=w.treaties||[];w.warHistory=w.warHistory||[];w.nextWarId=w.nextWarId||1;w.nextTreatyId=w.nextTreatyId||1;
 if(!w.treaties.some(function(t){return t.status==='active'&&t.type==='alliance'&&pairKey(t.a,t.b)===pairKey('Marine','Gouvernement')}))w.treaties.push({id:'treaty-foundation',type:'alliance',a:'Marine',b:'Gouvernement',status:'active',monthsLeft:null,sinceYear:w.year||0,reason:'Structure institutionnelle'});
 w.wars.forEach(function(war){war.attackerCoalition=war.attackerCoalition||[war.attacker];war.defenderCoalition=war.defenderCoalition||[war.defender];war.score=war.score||0;war.exhaustionA=war.exhaustionA||0;war.exhaustionD=war.exhaustionD||0;war.months=war.months||0;war.fronts=war.fronts||[];war.history=war.history||[];war.status=war.status||'active';war.goal=war.goal||'Pression stratégique'});
 return w
}
function activeTreaty(a,b,type){
 var k=pairKey(a,b);return game.world.treaties.find(function(t){return t.status==='active'&&pairKey(t.a,t.b)===k&&(!type||t.type===type)})||null
}
function createTreaty(a,b,type,months,reason){
 var w=game.world;if(a===b)return null;var old=activeTreaty(a,b,type);if(old){if(months!=null)old.monthsLeft=Math.max(old.monthsLeft||0,months);return old}
 var t={id:'treaty-'+(w.nextTreatyId++),type:type,a:a,b:b,status:'active',monthsLeft:months==null?null:months,sinceYear:w.year,sinceMonth:Math.floor(w.month),reason:reason||''};w.treaties.push(t);
 if(type==='alliance')w.diplomacy[pairKey(a,b)]=cl(Math.max(w.diplomacy[pairKey(a,b)]||0,62),-100,100);if(type==='truce')w.diplomacy[pairKey(a,b)]=cl(Math.max(w.diplomacy[pairKey(a,b)]||0,-15),-100,100);
 news(type==='alliance'?'Nouvelle alliance':'Accord diplomatique',a+' et '+b+' concluent '+(type==='alliance'?'une alliance':'une trêve')+(months?' pour '+months+' mois':'')+'.','major');return t
}
function alliancePartners(faction){
 return game.world.treaties.filter(function(t){return t.status==='active'&&t.type==='alliance'&&(t.a===faction||t.b===faction)}).map(function(t){return t.a===faction?t.b:t.a})
}
function coalitionFor(faction,opponent){
 var out=[faction];alliancePartners(faction).forEach(function(a){if(a!==opponent&&diplomacy(a,opponent)<25&&out.indexOf(a)<0)out.push(a)});return out
}
function sideContains(war,side,f){return(side==='attacker'?war.attackerCoalition:war.defenderCoalition).indexOf(f)>=0}
function warBetween(a,b){
 return game.world.wars.find(function(w){return w.status==='active'&&((w.attackerCoalition.indexOf(a)>=0&&w.defenderCoalition.indexOf(b)>=0)||(w.attackerCoalition.indexOf(b)>=0&&w.defenderCoalition.indexOf(a)>=0))})||null
}
function warGoalLabel(goal){return goal==='territory'?'Conquête territoriale':goal==='liberation'?'Libération':goal==='suppression'?'Écrasement du réseau':goal==='blockade'?'Blocus':'Pression stratégique'}
function canStartStrategicWar(a,b){
 if(!a||!b||a===b)return false;if(warBetween(a,b))return false;if(activeTreaty(a,b,'truce'))return false;if(activeTreaty(a,b,'alliance'))return false;return diplomacy(a,b)<=-35
}
function pickWarTarget(defender,region){
 var names=Object.keys(game.world.territories).filter(function(n){var t=game.world.territories[n];return t.controller===defender&&(!region||infStatic(n).region===region)});if(!names.length)names=Object.keys(game.world.territories).filter(function(n){return game.world.territories[n].controller===defender});return names.length?pk(names,'strategy'):null
}
function startStrategicWar(attacker,defender,goal,target,source){
 var w=game.world;if(!canStartStrategicWar(attacker,defender))return null;target=target||pickWarTarget(defender,null);if(!target)return null;
 var ac=coalitionFor(attacker,defender),dc=coalitionFor(defender,attacker).filter(function(f){return ac.indexOf(f)<0});var war={id:'war-'+(w.nextWarId++),name:attacker+' vs '+defender,attacker:attacker,defender:defender,attackerCoalition:ac,defenderCoalition:dc,goal:goal||'territory',target:target,region:infStatic(target).region,months:0,score:0,exhaustionA:0,exhaustionD:0,status:'active',source:source||'world',fronts:[],history:[],playerLed:source==='player',playerContribution:0};
 w.wars.push(war);w.globalTension=cl(w.globalTension+8,0,100);war.attackerCoalition.forEach(function(f){war.defenderCoalition.forEach(function(g){w.diplomacy[pairKey(f,g)]=cl((w.diplomacy[pairKey(f,g)]||0)-8,-100,100)})});
 news('GUERRE : '+attacker+' contre '+defender,warGoalLabel(war.goal)+' autour de '+target+'.','war');if(source==='player'){migrateStrategy(game.player).campaignsLed++;migrateStrategy(game.player).lastWarId=war.id;tl('Campagne lancée','Ton organisation ouvre une campagne contre '+defender+' pour '+target+'.','major')}
 spawnConflict(target,attacker,defender,45+R('strategy')*25,source==='player'?'player-campaign':'war',war.id);return war
}
function warSideForPlayer(war){
 var p=game.player,domains=(p.influence&&p.influence.domains)||[],targetOwned=domains.indexOf(war.target)>=0;
 if(p.faction==='Pirates'){if(war.playerLed&&war.source==='player')return'attacker';if(targetOwned){var tt=game.world.territories[war.target];if(tt&&tt.playerControl&&tt.playerControl.ownerKey===dynastyKey())return sideContains(war,'attacker',tt.playerControl.faction)?'attacker':'defender'}return null}
 if(sideContains(war,'attacker',p.faction))return'attacker';if(sideContains(war,'defender',p.faction))return'defender';
 if(targetOwned){var t=game.world.territories[war.target];if(t&&t.playerControl&&sideContains(war,'defender',t.playerControl.faction))return'defender'}return null
}
function recordWarBattle(c,winner){
 if(!c.warId)return;var war=game.world.wars.find(function(w){return w.id===c.warId&&w.status==='active'});if(!war)return;var attackWin=sideContains(war,'attacker',winner),delta=6+c.intensity*.08+(c.location===war.target?5:0);war.score=cl(war.score+(attackWin?delta:-delta),-100,100);if(attackWin)war.exhaustionD=cl(war.exhaustionD+4+c.intensity*.04,0,120);else war.exhaustionA=cl(war.exhaustionA+4+c.intensity*.04,0,120);war.history.unshift({month:war.months,location:c.location,winner:winner,delta:Math.round(delta)});war.history=war.history.slice(0,20)
}
function strategicFrontLocations(war){
 var regions=[war.region],names=Object.keys(game.world.territories).filter(function(n){var t=game.world.territories[n];return regions.indexOf(infStatic(n).region)>=0&&(sideContains(war,'attacker',t.controller)||sideContains(war,'defender',t.controller))});if(war.target&&names.indexOf(war.target)<0)names.unshift(war.target);return names
}
function spawnWarFront(war){
 var locations=strategicFrontLocations(war);if(!locations.length)return null;var loc=pk(locations,'strategy'),t=game.world.territories[loc],def=t.controller,att;
 if(sideContains(war,'defender',def))att=pk(war.attackerCoalition,'strategy');else if(sideContains(war,'attacker',def))att=pk(war.defenderCoalition,'strategy');else{def=war.defender;att=war.attacker}
 var c=spawnConflict(loc,att,def,32+R('strategy')*48,'war-front',war.id);if(c&&war.fronts.indexOf(c.id)<0)war.fronts.push(c.id);return c
}
function resolveWar(war,outcome){
 var w=game.world;if(war.status!=='active')return;var linkedSaga=strategicWarSaga(war);war.status='resolved';war.outcome=outcome;war.endYear=w.year;war.endMonth=Math.floor(w.month);
 var attackerWon=outcome==='attacker',defenderWon=outcome==='defender',target=w.territories[war.target];
 if(attackerWon&&target){var previousController=target.controller;target.controller=war.attacker;if(previousController!==war.attacker)target.lastWorldCause='war:'+war.name;target.influence=cl(Math.max(48,target.influence),0,100);target.stability=cl(target.stability-8,0,100);target.lastChange='Paix, année '+w.year;if(target.playerControl&&target.playerControl.ownerKey===dynastyKey()&&target.playerControl.faction!==war.attacker){target.playerControl.control=cl(target.playerControl.control-45,0,100);if(target.playerControl.control<25)loseDomain(war.target,'conditions de paix')}}
 if(defenderWon&&target&&sideContains(war,'attacker',target.controller)){target.controller=war.defender;target.influence=cl(Math.max(45,target.influence),0,100)}
 createTreaty(war.attacker,war.defender,'truce',12+Math.round(R('strategy')*12),'Fin de guerre');w.globalTension=cl(w.globalTension-8,0,100);
 var text=attackerWon?war.attacker+' impose ses conditions à '+war.defender+'.':defenderWon?war.defender+' repousse '+war.attacker+'.':'Les deux camps acceptent une paix sans victoire décisive.';
 news('Fin de guerre',text,'major');if(attackerWon)updateCollectiveGoal(factionWorldGoal(war.attacker),6);else if(defenderWon)updateCollectiveGoal(factionWorldGoal(war.defender),5);else{updateCollectiveGoal(factionWorldGoal(war.attacker),2);updateCollectiveGoal(factionWorldGoal(war.defender),2)}w.warHistory.unshift({name:war.name,outcome:outcome,months:war.months,target:war.target,score:Math.round(war.score),year:w.year});w.warHistory=w.warHistory.slice(0,30);
 var ps=warSideForPlayer(war),st=migrateStrategy(game.player);if(ps){var won=(ps==='attacker'&&attackerWon)||(ps==='defender'&&defenderWon);if(won)st.warsWon++;else if(outcome!=='negotiated')st.warsLost++;if(war.playerLed||war.playerContribution>=8)registerPlayerSagaImpact(war.playerLed?'responsible':war.playerContribution>=18?'decisive':'participant','war:'+war.id,war.playerLed?24:Math.min(18,6+war.playerContribution*.45),linkedSaga&&linkedSaga.id);if(war.playerLed)tl('Campagne terminée',text,won?'major':'danger')}
}
function simulateTreaties(){
 var w=game.world;w.treaties.forEach(function(t){if(t.status!=='active'||t.monthsLeft==null)return;t.monthsLeft--;if(t.monthsLeft<=0){t.status='expired';news('Fin d’accord',t.a+' et '+t.b+' voient leur '+(t.type==='truce'?'trêve':'accord')+' arriver à terme.','')}});
 var keys=Object.keys(w.diplomacy);if(R('strategy')<.025){var k=pk(keys,'strategy'),parts=k.split('|'),v=w.diplomacy[k];if(v>=72&&!activeTreaty(parts[0],parts[1])&&canStartStrategicWar(parts[0],parts[1])===false&&!activeTreaty(parts[0],parts[1],'truce'))createTreaty(parts[0],parts[1],'alliance',18+Math.round(R('strategy')*24),'Convergence stratégique')}
 w.treaties=w.treaties.filter(function(t){return t.status==='active'||(t.monthsLeft!=null&&t.monthsLeft>-6)})
}
function simulateWars(){
 var w=game.world;w.wars.filter(function(war){return war.status==='active'}).forEach(function(war){
  war.months++;var activeFronts=w.conflicts.filter(function(c){return c.status==='active'&&c.warId===war.id});war.fronts=activeFronts.map(function(c){return c.id});
  var pressure=.8+activeFronts.length*.65+w.globalTension*.006;war.exhaustionA=cl(war.exhaustionA+pressure*(.8+R('strategy')*.7),0,120);war.exhaustionD=cl(war.exhaustionD+pressure*(.8+R('strategy')*.7),0,120);
  if(activeFronts.length<2&&R('strategy')<.48)spawnWarFront(war);
  if(war.score>=72||war.exhaustionD>=100)resolveWar(war,'attacker');else if(war.score<=-72||war.exhaustionA>=100)resolveWar(war,'defender');else if(war.months>=8&&war.exhaustionA+war.exhaustionD>=150&&Math.abs(war.score)<45)resolveWar(war,'negotiated');else if(war.months>=22)resolveWar(war,war.score>18?'attacker':war.score<-18?'defender':'negotiated')
 });
 if(w.wars.filter(function(x){return x.status==='active'}).length<3&&w.globalTension>48&&R('strategy')<.045){var pairs=Object.keys(w.diplomacy).filter(function(k){var p=k.split('|');return w.diplomacy[k]<=-70&&canStartStrategicWar(p[0],p[1])});if(pairs.length){var pair=pk(pairs,'strategy').split('|'),a=pair[0],b=pair[1],target=pickWarTarget(b,null);if(!target){var swap=a;a=b;b=swap;target=pickWarTarget(b,null)}if(target)startStrategicWar(a,b,'territory',target,'world')}}
}
function strategyTick(){
 migrateStrategy(game.player).actions=1;simulateTreaties();simulateWars()
}
function useStrategyAction(){
 var st=migrateStrategy(game.player);if(st.actions<1){toast('Tu as déjà utilisé ton action stratégique pour cette période.');return false}st.actions--;return true
}
function campaignEligibility(){
 var p=game.player,x=influenceMetrics(),o=p.organization,j=migrateJustice(p);if(p.ageMonths<216)return[false,'Il faut être adulte.'];if(j.detained)return[false,'Impossible en détention.'];if(!o||o.authority!=='leader')return[false,'Il faut diriger une organisation.'];if(x.score<68)return[false,'Influence 68 requise.'];if(organizationPower()<52)return[false,'Puissance d’organisation 52 requise.'];if(p.faction==='Civil'||p.faction==='Chasseur de primes')return[false,'Ta faction ne mène pas de guerre territoriale directe.'];return[true,'']
}
function campaignTargets(){
 var p=game.player,q=campaignEligibility();if(!q[0])return[];return Object.keys(game.world.territories).filter(function(n){var t=game.world.territories[n];return infStatic(n).region===p.region&&t.controller!==p.faction&&diplomacy(p.faction,t.controller)<=-35&&!warBetween(p.faction,t.controller)&&!activeTreaty(p.faction,t.controller,'truce')}).sort(function(a,b){return infStatic(a).danger-infStatic(b).danger}).slice(0,8)
}
function launchCampaign(target){
 var p=game.player,o=p.organization,t=game.world.territories[target],q=campaignEligibility();if(!q[0])return toast(q[1]);if(!t)return toast('Cible invalide.');if(!useStrategyAction())return;var cost=30000,supply=12;if(o.treasury+p.money<cost||o.supplies<supply){migrateStrategy(p).actions++;return toast('Campagne : 30 000 B et 12% de provisions requis.')}var from=Math.min(o.treasury,cost);o.treasury-=from;p.money-=cost-from;o.supplies-=supply;migrateStrategy(p).supportSpent+=cost;var war=startStrategicWar(p.faction,t.controller,'territory',target,'player');if(!war){migrateStrategy(p).actions++;o.supplies+=supply;o.treasury+=from;p.money+=cost-from;return toast('Impossible d’ouvrir cette campagne actuellement.')}save();render()
}
function supportStrategicWar(id){
 var p=game.player,war=game.world.wars.find(function(w){return w.id===id&&w.status==='active'}),side=war&&warSideForPlayer(war),o=p.organization;if(!war||!side)return toast('Tu n’es pas engagé dans cette guerre.');if(!useStrategyAction())return;var cost=10000,supply=6;if(!o||o.treasury+p.money<cost||o.supplies<supply){migrateStrategy(p).actions++;return toast('Soutien : organisation, 10 000 B et 6% de provisions requis.')}var from=Math.min(o.treasury,cost);o.treasury-=from;p.money-=cost-from;o.supplies-=supply;var impact=3+organizationPower()*.055+influenceMetrics().score*.025+R('strategy')*5,linkedSaga=strategicWarSaga(war);war.score=cl(war.score+(side==='attacker'?impact:-impact),-100,100);war.playerContribution=(war.playerContribution||0)+impact;registerPlayerSagaImpact('participant','war-support:'+war.id,7+impact*.4,linkedSaga&&linkedSaga.id);migrateStrategy(p).supportSpent+=cost;tl('Soutien stratégique','Ton organisation renforce le camp '+(side==='attacker'?war.attacker:war.defender)+' dans '+war.name+'.','major');save();render()
}
function joinWarFront(id){
 var p=game.player,war=game.world.wars.find(function(w){return w.id===id&&w.status==='active'}),side=war&&warSideForPlayer(war);if(!war||!side)return toast('Tu n’es pas engagé dans cette guerre.');if(p.justice&&p.justice.detained)return toast('Impossible en détention.');var fronts=game.world.conflicts.filter(function(c){return c.status==='active'&&c.warId===war.id&&c.region===p.region});if(!fronts.length)return toast('Aucun front accessible dans ta région.');if(!useStrategyAction())return;var c=pk(fronts,'strategy'),enemy=side==='attacker'?c.defender:c.attacker,d=cl(c.intensity*.72+(game.world.factions[enemy]||45)*.35,20,96),ok=fight(d,'Front de guerre : '+c.location);if(!game.alive)return;var linkedSaga=strategicWarSaga(war);if(ok){var impact=8+power()*.05;war.score=cl(war.score+(side==='attacker'?impact:-impact),-100,100);c.intensity=cl(c.intensity+6,15,100);registerPlayerSagaImpact('decisive','war-front:'+war.id,12+impact*.45,linkedSaga&&linkedSaga.id);migrateStrategy(p).frontsJoined++;tl('Intervention décisive','Ton action influence le front de '+c.location+'.','major')}else{var loss=5+power()*.025;war.score=cl(war.score+(side==='attacker'?-loss:loss),-100,100);registerPlayerSagaImpact('participant','war-front:'+war.id,5,linkedSaga&&linkedSaga.id);tl('Intervention repoussée','Ton camp perd du terrain après ton intervention.','danger')}save();render()
}
function proposeStrategicPeace(id){
 var p=game.player,war=game.world.wars.find(function(w){return w.id===id&&w.status==='active'}),side=war&&warSideForPlayer(war),x=influenceMetrics();if(!war||!side||war.months<3)return toast('Aucune paix crédible à proposer.');if(x.score<76)return toast('Influence 76 requise pour peser sur les négociations.');if(!useStrategyAction())return;var exhaustion=(war.exhaustionA+war.exhaustionD)/2,ch=cl(.18+exhaustion/150+(Math.abs(war.score)<22?.12:0)+x.score/500,.12,.88);if(R('strategy')<ch){resolveWar(war,'negotiated');tl('Négociation réussie','Une trêve met fin à la campagne.','major')}else tl('Négociation rejetée','Les camps refusent encore de mettre fin à la guerre.','danger');save();render()
}
function renderStrategy(){
 var p=game.player,w=game.world,st=migrateStrategy(p),active=w.wars.filter(function(x){return x.status==='active'}),involved=active.filter(function(x){return !!warSideForPlayer(x)}),treaties=w.treaties.filter(function(t){return t.status==='active'});
 $('#warBadge').textContent=active.length+' guerre'+(active.length>1?'s':'');$('#warOverview').innerHTML='<div><span>Guerres actives</span><strong>'+active.length+'</strong></div><div><span>Ton camp impliqué</span><strong>'+involved.length+'</strong></div><div><span>Campagnes menées</span><strong>'+st.campaignsLed+'</strong></div><div><span>Victoires stratégiques</span><strong>'+st.warsWon+'</strong></div>';
 $('#warList').innerHTML=active.length?active.map(function(war){var side=warSideForPlayer(war),aw=cl(Math.max(0,war.score),0,100)/2,dw=cl(Math.max(0,-war.score),0,100)/2,fronts=w.conflicts.filter(function(c){return c.status==='active'&&c.warId===war.id});return '<div class="war-card '+(war.months>=8?'hot ':'')+(side?'player-war':'')+'"><div class="war-head"><strong>'+e(war.name)+'</strong><span>'+e(warGoalLabel(war.goal))+'</span></div><div class="war-meta">'+e(war.attackerCoalition.join(' + '))+' ↔ '+e(war.defenderCoalition.join(' + '))+' • cible '+e(war.target)+' • '+war.months+' mois</div><div class="war-score"><div class="attack" style="width:'+aw+'%"></div><div class="defend" style="width:'+dw+'%"></div></div><div class="war-exhaustion"><span>Attaquant : '+Math.round(war.exhaustionA)+' fatigue</span><span>Score '+Math.round(war.score)+'</span><span>Défenseur : '+Math.round(war.exhaustionD)+' fatigue</span></div><div class="war-fronts">'+(fronts.length?fronts.map(function(c){return '<span>'+e(c.location)+' • '+Math.round(c.intensity)+'</span>'}).join(''):'<span>Aucun front actif</span>')+'</div>'+(side?'<div class="relation-actions-mini"><button data-war-support="'+e(war.id)+'">Soutenir</button><button data-war-front="'+e(war.id)+'">Rejoindre un front</button>'+(war.months>=3?'<button data-war-peace="'+e(war.id)+'">Proposer une paix</button>':'')+'</div>':'')+'</div>'}).join(''):'<p class="helper-text">Aucune guerre stratégique active.</p>';
 $('#treatyBadge').textContent=treaties.length+' actif'+(treaties.length>1?'s':'');$('#treatyList').innerHTML=treaties.length?treaties.map(function(t){return '<div class="treaty-card '+(t.type==='alliance'?'alliance':'')+'"><div class="treaty-head"><strong>'+e(t.a)+' ↔ '+e(t.b)+'</strong><span>'+e(t.type)+'</span></div><div class="treaty-meta">'+e(t.reason||'Accord diplomatique')+(t.monthsLeft!=null?' • '+t.monthsLeft+' mois restants':' • durée indéterminée')+'</div></div>'}).join(''):'<p class="helper-text">Aucun accord actif.</p>';
 var q=campaignEligibility(),targets=campaignTargets(),actions='';if(q[0]&&targets.length)actions+='<button id="launchCampaignBtn" class="action-card strategy-warning"><strong>Lancer une campagne</strong><small>'+targets.length+' cible(s) disponible(s) dans '+e(p.region)+'.</small></button>';if(!actions)actions='<div class="career-card"><p>Dirige une organisation puissante et augmente ton influence pour initier des campagnes. Les guerres auxquelles ta faction participe restent accessibles ci-dessus.</p></div>';
 $('#strategyActionBadge').textContent=st.actions+' action';$('#strategyActions').innerHTML=actions;var lc=$('#launchCampaignBtn');if(lc)lc.onclick=function(){var ts=campaignTargets(),choices=ts.map(function(n){var t=w.territories[n];return[n,e(t.controller)+' • danger '+infStatic(n).danger+' • stabilité '+Math.round(t.stability),function(){launchCampaign(n)}]});choices.push(['Annuler','Ne rien engager.',function(){}]);decision('Ouvrir une campagne','Une guerre mobilise argent, provisions et influence. La paix ne sera pas immédiate.',choices)};
 $$('[data-war-support]').forEach(function(b){b.onclick=function(){supportStrategicWar(b.dataset.warSupport)}});$$('[data-war-front]').forEach(function(b){b.onclick=function(){joinWarFront(b.dataset.warFront)}});$$('[data-war-peace]').forEach(function(b){b.onclick=function(){proposeStrategicPeace(b.dataset.warPeace)}})
}

function spawnConflict(location,attacker,defender,intensity,source,warId){
 var w=game.world;if(!location||attacker===defender)return null;
 var existing=w.conflicts.find(function(c){return c.location===location&&c.status==='active'});
 if(existing){existing.intensity=cl(existing.intensity+8,15,100);if(warId&&!existing.warId)existing.warId=warId;return existing}
 var linked=warId||((warBetween(attacker,defender)||{}).id||null),c={id:'conf-'+w.year+'-'+Math.floor(w.month)+'-'+Math.floor(R('world')*99999),location:location,region:infStatic(location).region,attacker:attacker,defender:defender,intensity:Math.round(intensity||45),months:0,status:'active',source:source||'world',warId:linked};
 w.conflicts.push(c);w.globalTension=cl(w.globalTension+3,0,100);var t=w.territories[location];if(t)t.contested=true;
 news('Conflit à '+location,attacker+' conteste le contrôle de '+defender+'.','war');
 if(game.player.island===location)tl('Conflit territorial',attacker+' et '+defender+' s’affrontent autour de '+location+'.','danger');
 return c
}
function warBattleSidePower(war,side){
 var fs=side==='attacker'?war.attackerCoalition:war.defenderCoalition,primary=side==='attacker'?war.attacker:war.defender,base=game.world.factions[primary]||48,ally=fs.filter(function(f){return f!==primary}).reduce(function(a,f){return a+Math.max(0,(game.world.factions[f]||48)-40)*.10},0),bonus=0,p=game.player;
 if(war.playerLed&&warSideForPlayer(war)===side&&p.organization){bonus+=organizationPower()*.16+(p.organization.supplies||0)*.03;if(p.faction==='Pirates')bonus+=Math.min(8,(p.influence&&p.influence.affiliates?p.influence.affiliates.length:0)*1.5)}
 return base+ally+bonus
}
function resolveConflict(c){
 var w=game.world,t=w.territories[c.location];if(!t)return;var war=c.warId?w.wars.find(function(x){return x.id===c.warId&&x.status==='active'}):null,attackBase=w.factions[c.attacker]||48,defendBase=w.factions[c.defender]||48;
 if(war){var as=sideContains(war,'attacker',c.attacker)?'attacker':'defender',ds=as==='attacker'?'defender':'attacker';attackBase=warBattleSidePower(war,as);defendBase=warBattleSidePower(war,ds)}
 var ap=attackBase+(c.source&&String(c.source).indexOf('crew-')===0?(w.crews.find(function(x){return x.id===c.source})||{power:0}).power*.45:0)+R('world')*24+c.intensity*(war?.28:.12);
 var dp=defendBase+t.influence*(war?.14:.34)+R('world')*24+playerDomainDefense(c.location)*(war?.75:1);
 var winner=ap>dp?c.attacker:c.defender,loser=winner===c.attacker?c.defender:c.attacker,margin=Math.abs(ap-dp),pc=t.playerControl&&t.playerControl.ownerKey===dynastyKey()?t.playerControl:null;
 c.status='resolved';c.winner=winner;c.months=Math.max(1,c.months);
 if(winner!==t.controller){
  var old=t.controller,crewSource=c.source&&String(c.source).indexOf('crew-')===0?w.crews.find(function(x){return x.id===c.source}):null,ambientSource=c.source==='world',majorOccupation=!crewSource&&!ambientSource||!!war||(crewSource&&crewSource.power>=68&&c.intensity>=64&&margin>=14)||(ambientSource&&c.intensity>=72&&margin>=18&&w.globalTension>=58);
  if(majorOccupation){t.controller=winner;t.lastWorldCause=c.source||'conflict';t.influence=Math.round(cl(48+margin*.45,42,76));t.stability=Math.round(cl(t.stability-12-R('world')*16,8,100));t.lastChange='Année '+w.year+', mois '+(Math.floor(w.month)+1);w.divergence=cl(w.divergence+(c.intensity/100)*1.5,0,100);news('Changement de contrôle',winner+' prend le contrôle de '+c.location+' au détriment de '+old+'.','major')}
  else{t.influence=cl(t.influence-(6+margin*.16),20,100);t.stability=cl(t.stability-(4+R('world')*7),8,100);t.contested=true;t.lastWorldCause=c.source||'conflict';news('Zone déstabilisée',winner+' remporte l’affrontement sans parvenir à renverser durablement le contrôle de '+old+' à '+c.location+'.','war')}
 }
 else{t.influence=cl(t.influence+5+margin*.12,0,100);t.stability=cl(t.stability+3-R('world')*4,0,100);updateCollectiveGoal(factionWorldGoal(c.defender),1.1+c.intensity*.008);news('Offensive repoussée',c.defender+' conserve '+c.location+' face à '+c.attacker+'.','war')}
 if(pc){if(winner===pc.faction)pc.control=cl(pc.control+5+margin*.08,0,100);else if(diplomacy(winner,pc.faction)<-20){pc.control=cl(pc.control-(18+margin*.22),0,100);if(pc.control<=20)loseDomain(c.location,'défaite militaire')}}
 t.contested=winner!==t.controller||t.influence<45;w.globalTension=cl(w.globalTension-1,0,100);
 w.worldHistory.unshift({year:w.year,month:Math.floor(w.month),type:'conflict',location:c.location,winner:winner,loser:loser});w.worldHistory=w.worldHistory.slice(0,50);recordWarBattle(c,winner)
}
function simulateConflicts(){
 var w=game.world;
 w.conflicts.filter(function(c){return c.status==='active'}).forEach(function(c){c.months++;c.intensity=cl(c.intensity+(R('world')-.43)*10,15,100);if(c.months>=2&&R('world')<.24+c.months*.08)resolveConflict(c)});
 w.conflicts=w.conflicts.filter(function(c){return c.status==='active'}).slice(-8);
 if(w.conflicts.length<4&&R('world')<.10+w.globalTension/900){var names=Object.keys(w.territories),loc=pk(names,'world'),t=w.territories[loc],att=pk(hostileCandidates(t.controller),'world');spawnConflict(loc,att,t.controller,32+R('world')*42,'world')}
}
function simulateCrews(){
 var w=game.world,active=w.crews.filter(function(c){return c.status==='active'});
 active.forEach(function(c){
  normalizeWorldCrew(c);c.ageMonths++;if(c.playerControlled){c.region=game.player.region;c.morale=cl(c.morale+(R('world')-.5)*.45,8,100);return}worldCrewInternalTick(c);crewIntentTick(c);c.power=cl(c.power+(R('world')-.42)*.55,6,96);c.morale=cl(c.morale+(R('world')-.5)*2.2,8,100);
  if(c.faction==='Pirates')c.bounty=Math.max(0,c.bounty+Math.round((c.power*.12+R('world')*5)*100000));
  if(R('world')<.025){var links=REGION_LINKS[c.region]||[];if(links.length)c.region=pk(links,'world')}
  var terrs=Object.keys(w.territories).filter(function(n){return infStatic(n).region===c.region}),loc=terrs.length?pk(terrs,'world'):null,t=loc&&w.territories[loc];
  if(t&&c.power>42&&c.faction!==t.controller&&diplomacy(c.faction,t.controller)<-20&&R('world')<.015)spawnConflict(loc,c.faction,t.controller,35+c.power*.45,c.id);
  if(!c.playerJoined&&R('world')<.008+Math.max(0,25-c.morale)/2500){c.status='destroyed';c.defeats++;news(c.name+' disparaît',c.name+' est détruit ou dissous dans '+c.region+'.','major')}else if(c.playerJoined&&c.morale<16&&R('world')<.012){c.morale=cl(c.morale+8,0,100);c.cohesion=cl(c.cohesion-4,0,100);crewHistory(c,'crisis','Le pavillon traverse une crise grave, mais sa disparition ne peut pas se produire hors de la trajectoire du joueur.');news(c.name+' vacille',c.name+' traverse une crise interne dans '+c.region+'.','major')}
 });
 if(w.crews.filter(function(c){return c.status==='active'}).length<8){var nc=makeWorldCrew(game,w.nextCrewId++);w.crews.push(nc);news('Nouvel équipage',nc.name+' apparaît dans '+nc.region+'.','')}
 compactWorldCrewMemory()
}
function syncActorAvailability(){
 var w=game.world;w.actors.forEach(function(a){if(a.status==='inactive'&&w.year>=(a.activeFrom||0)){a.status='active';a.region=a.startRegion||a.region;news('Nouvel acteur sur les mers',a.name+' commence à faire parler de lui dans '+a.region+'.',a.importance>=98?'major':'')}})
}
function simulateActors(){
 var w=game.world;syncActorAvailability();
 w.actors.forEach(function(a){
  if(a.status==='dead'||a.status==='inactive')return;if(a.status==='wounded'){a.woundMonths--;if(a.woundMonths<=0){a.status='active';a.woundMonths=0;news(a.name+' réapparaît',a.name+' reprend ses activités dans '+a.region+'.','')}return}
  a.actions++;actorIntentTick(a);if(R('world')<.015){var links=REGION_LINKS[a.region]||[];if(links.length){a.region=pk(links,'world');if(a.importance>=98&&R('world')<.20)news('Déplacement majeur',a.name+' est signalé dans '+a.region+'.','major')}}
  if(w.factions[a.faction]!=null&&R('world')<.30)w.factions[a.faction]=cl(w.factions[a.faction]+(R('world')-.38)*.5,0,100);
  if(a.faction!=='Indépendant'&&R('world')<.10){var ts=Object.keys(w.territories).filter(function(n){return infStatic(n).region===a.region});if(ts.length){var t=w.territories[pk(ts,'world')];if(t.controller===a.faction)t.influence=cl(t.influence+1.4,0,100)}}
 });
 var byRegion={};w.actors.filter(function(a){return a.status==='active'}).forEach(function(a){(byRegion[a.region]||(byRegion[a.region]=[])).push(a)});
 Object.keys(byRegion).forEach(function(r){var a=byRegion[r];if(a.length<2||R('world')>.02)return;var one=pk(a,'world'),opps=a.filter(function(x){return x!==one&&diplomacy(one.faction,x.faction)<-40});if(!opps.length)return;var two=pk(opps,'world'),p1=actorPower(one)+R('world')*16,p2=actorPower(two)+R('world')*16,loser=p1>=p2?two:one,winner=loser===one?two:one,margin=Math.abs(p1-p2);loser.status='wounded';loser.woundMonths=Math.round(2+R('world')*5);news('Affrontement majeur',winner.name+' prend l’avantage sur '+loser.name+' dans '+r+'.','major');var deathChance=(w.divergence/100)*.006*Math.max(.04,1-loser.importance/108);if(margin>20&&R('world')<deathChance){loser.status='dead';loser.woundMonths=0;w.divergence=cl(w.divergence+loser.importance*.18,0,100);news('DIVERGENCE HISTORIQUE',loser.name+' disparaît lors d’un affrontement contre '+winner.name+'.','war')}})
}
function simulateTerritories(){
 var w=game.world,ws=w.worldState;Object.keys(w.territories).forEach(function(n){var t=w.territories[n],fg=factionWorldGoal(t.controller),pressure=(fg.progress||0)/100;t.stability=cl(t.stability+(pressure-.5)*.12,0,100);t.stability=cl(t.stability+(R('world')-.48)*2.8,0,100);if(t.stability<30)t.influence=cl(t.influence-(30-t.stability)*.025,20,100);t.contested=t.contested||t.influence<45});
}
function simulateDiplomacy(){
 var w=game.world;Object.keys(w.diplomacy).forEach(function(k){var v=w.diplomacy[k],parts=k.split('|');if((parts.indexOf('Pirates')>=0&&parts.indexOf('Marine')>=0)||(parts.indexOf('Gouvernement')>=0&&parts.indexOf('Révolutionnaires')>=0))return;w.diplomacy[k]=cl(v+(R('world')-.5)*1.1,-100,100)});
 if(R('world')<.025){var keys=Object.keys(w.diplomacy),k=pk(keys,'world'),old=w.diplomacy[k];w.diplomacy[k]=cl(old+(R('world')<.5?-12:12),-100,100);var p=k.split('|');news('Tension diplomatique',p[0]+' et '+p[1]+' voient leur relation évoluer.','')}
}
function canonActor(name){return game.world.actors.find(function(a){return a.name===name})||null}
function canonEventById(id){return game.world.canon.find(function(x){return x.id===id})}
function canonDependencyState(c){
 var deps=c.dependsOn||[],missing=[],altered=[];deps.forEach(function(id){var x=canonEventById(id);if(!x||x.status==='future'||x.status==='cancelled')missing.push(id);else if(x.status==='modified')altered.push(id)});
 var required=(c.required||[]),missingActors=required.filter(function(n){var a=canonActor(n);return !a||a.status==='dead'||a.status==='inactive'});
 return{ready:missing.length===0&&missingActors.length===0,missingEvents:missing,alteredEvents:altered,missingActors:missingActors}
}
function canonTimelineMode(){
 var d=game.world.divergence||0,h=(game.world.canonHistory||[]),modified=h.filter(function(x){return x.status==='modified'||x.status==='cancelled'}).length;
 return d>=60||modified>=8?'Timeline divergente':d>=25||modified>=3?'Canon flexible':'Canon protégé'
}
function recordCanonCausality(c,state,status){
 var ws=game.world.worldState;if(!ws)return;ws.canonCausality=Array.isArray(ws.canonCausality)?ws.canonCausality:[];ws.canonCausality.unshift({seq:++ws.seq,id:c.id,title:c.title,status:status,year:game.world.year,month:game.world.month,mode:canonTimelineMode(),missingEvents:(state.missingEvents||[]).slice(),alteredEvents:(state.alteredEvents||[]).slice(),missingActors:(state.missingActors||[]).slice()});ws.canonCausality=ws.canonCausality.slice(0,80)
}
function createCanonBranch(c,causal){
 var w=game.world,ws=w.worldState;if(!ws)return null;ws.canonBranches=Array.isArray(ws.canonBranches)?ws.canonBranches:[];
 var causes=[].concat(causal.missingEvents||[],causal.missingActors||[],causal.alteredEvents||[]),region=c.location?infStatic(c.location).region:null;
 var branch={seq:++ws.seq,id:'branch-'+c.id+'-'+ws.seq,source:c.id,title:'Conséquence de '+c.title,year:w.year,month:w.month,location:c.location||null,region:region,factions:(c.factions||[]).slice(),causes:causes.slice(0,6),status:'active',pressure:cl(20+w.divergence*.45+causes.length*7,20,90)};
 ws.canonBranches.unshift(branch);ws.canonBranches=ws.canonBranches.slice(0,50);
 if(c.location&&w.territories[c.location]){var t=w.territories[c.location];t.stability=cl(t.stability-(3+branch.pressure*.05),0,100);if(t.stability<35)t.contested=true}
 return branch
}
function markPlayerCanonImpact(c,kind,detail){
 var w=game.world,ws=w.worldState,p=game.player;if(!ws||!p)return null;ws.playerCanonImpact=Array.isArray(ws.playerCanonImpact)?ws.playerCanonImpact:[];
 var rec={seq:++ws.seq,eventId:c&&c.id||null,eventTitle:c&&c.title||'Chronologie',kind:kind||'intervention',detail:detail||'',year:w.year,month:w.month,age:p.ageMonths,faction:p.faction,region:p.region,island:p.island,power:Math.round(power()*10)/10};
 ws.playerCanonImpact.unshift(rec);ws.playerCanonImpact=ws.playerCanonImpact.slice(0,60);w.divergence=cl(w.divergence+(kind==='major'?4:kind==='direct'?2.5:1),0,100);
 (c&&c.factions||[]).forEach(function(f){var aligned=f===p.faction?1:-1;adjustRep(f,aligned*(kind==='major'?3:1.5))});
 return rec
}
function playerCanonReactions(rec,c){
 if(!rec)return;var p=game.player,actors=game.world.actors.filter(function(a){return a.status==='active'&&(a.region===p.region||(c&&c.required||[]).indexOf(a.name)>=0)}).sort(function(a,b){return b.importance-a.importance}).slice(0,4);
 actors.forEach(function(a){var r=bondCanonicalActor(a,'Ton rôle dans '+(rec.eventTitle||'une divergence historique')+' devient connu.'),hostile=diplomacy(p.faction,a.faction)<-30,delta=rec.kind==='major'?8:4;if(hostile){r.rivalry=cl(r.rivalry+delta,0,100);r.trust=cl(r.trust-delta*.6,0,100)}else{r.respect=cl(r.respect+delta,0,100);r.trust=cl(r.trust+delta*.35,0,100)}})
}
function inferPlayerCanonImpact(c,causal,status){
 var p=game.player;if(!p||!c||status==='completed')return null;var local=p.island===c.location||p.region===infStatic(c.location).region,recent=(migrateLifeLoop(game).signatureMoments||[]).some(function(x){return p.ageMonths-(x.ageMonths||0)<=6}),linked=(causal.missingActors||[]).some(function(n){var r=relationForActor(n);return r&&r.lastCanonInteractionAge!=null&&p.ageMonths-r.lastCanonInteractionAge<=12});
 if(!local&&!linked&&!recent)return null;var kind=status==='cancelled'&&(local||linked)?'major':'direct',rec=markPlayerCanonImpact(c,kind,local?'Présence directe dans la zone canonique':linked?'Interaction récente avec un acteur indispensable':'Action majeure récente susceptible d’avoir influencé la chronologie');playerCanonReactions(rec,c);return rec
}
function canonBranchActors(branch){
 return game.world.actors.filter(function(a){return a.status==='active'&&a.region===branch.region&&(branch.factions||[]).indexOf(a.faction)>=0}).sort(function(a,b){return actorPower(b)-actorPower(a)})
}
function resolveCanonBranch(branch,outcome){
 var w=game.world,ws=w.worldState,t=branch.location&&w.territories[branch.location];branch.status='resolved';branch.outcome=outcome;branch.resolvedYear=w.year;branch.resolvedMonth=w.month;
 if(outcome==='escalation'){var fs=(branch.factions||[]).filter(function(f){return f!=='Civil'}),def=t?t.controller:null,att=fs.find(function(f){return f!==def&&diplomacy(f,def)<-20});if(att&&def){spawnConflict(branch.location,att,def,cl(38+branch.pressure*.45,40,82),'canon:'+branch.source);branch.status='escalated';w.globalTension=cl(w.globalTension+4,0,100)}}
 else if(outcome==='new-balance'){if(t){t.stability=cl(t.stability+8,0,100);t.contested=t.stability<35}w.divergence=cl(w.divergence+1.5,0,100)}
 else{if(t){t.stability=cl(t.stability+12,0,100);t.contested=false}w.divergence=cl(w.divergence-.8,0,100)}
 ws.canonBranchHistory=Array.isArray(ws.canonBranchHistory)?ws.canonBranchHistory:[];ws.canonBranchHistory.unshift({seq:++ws.seq,id:branch.id,source:branch.source,title:branch.title,outcome:outcome,year:w.year,month:w.month,pressure:Math.round(branch.pressure)});ws.canonBranchHistory=ws.canonBranchHistory.slice(0,60);
 news(branch.title,outcome==='escalation'?'La divergence dégénère en confrontation ouverte.':outcome==='new-balance'?'Un nouvel équilibre durable remplace progressivement la trajectoire canonique.':'La perturbation se résorbe sans restaurer totalement la chronologie originale.',outcome==='escalation'?'war':'major')
}
function simulateCanonBranches(){
 var w=game.world,ws=w.worldState;if(!ws||!ws.canonBranches)return;
 ws.canonBranches.filter(function(b){return b.status==='active'}).forEach(function(b){
  b.months=(b.months||0)+1;var t=b.location&&w.territories[b.location],actors=canonBranchActors(b),actorWeight=actors.slice(0,3).reduce(function(n,a){return n+actorPower(a)},0)/120,instability=t?(100-t.stability)/100:.35;
  b.pressure=cl(b.pressure+(instability*2.2)+(actorWeight*.8)+(R('canon')-.56)*4,8,100);
  if(actors.length&&R('canon')<.08){var lead=actors[0];lead.region=b.region;b.leadActor=lead.name;if(lead.importance>=96)news('Divergence : '+lead.name,lead.name+' intervient dans les conséquences de '+b.title+'.','major')}
  if(b.months>=3){var escalation=cl((b.pressure-52)/85+instability*.18,0,.48),settle=cl(.10+b.months*.025+(t&&t.stability>55?.08:0),.10,.42),r=R('canon');if(r<escalation)resolveCanonBranch(b,'escalation');else if(r<escalation+settle)resolveCanonBranch(b,b.pressure>=48?'new-balance':'resolved')}
 });
 ws.canonBranches=ws.canonBranches.filter(function(b){return b.status==='active'}).slice(0,50)
}
function resolveCanonEvent(c){
 var w=game.world,p=game.player,required=c.required||[],causal=canonDependencyState(c),missing=causal.missingActors,terr=w.territories[c.location],instability=terr?100-terr.stability:30,pressure=w.divergence+instability*.08+(terr&&terr.contested?8:0)+causal.alteredEvents.length*6,modified=false;
 if(causal.missingEvents.length||missing.length){c.status='cancelled';w.divergence=cl(w.divergence+Math.max(2,(100-c.resistance)*.16+missing.length*2+causal.missingEvents.length*3),0,100)}
 else{var threshold=c.resistance||75,flex=c.type==='flexible';modified=pressure>=threshold||(flex&&pressure>threshold*.48&&R('canon')<cl((pressure-threshold*.48)/80,.02,.42));c.status=modified?'modified':'completed';if(modified)w.divergence=cl(w.divergence+Math.max(1,(100-threshold)*.08),0,100)}
 if(c.status==='completed'){required.forEach(function(n){var a=canonActor(n);if(a&&c.location){a.region=infStatic(c.location).region;a.status='active'}});if(terr){terr.stability=cl(terr.stability-(c.type==='anchor'?8:4),0,100)}}
 var detail=c.status==='cancelled'?'Événement annulé : '+([].concat(missing,causal.missingEvents).join(', ')||'chaîne causale rompue')+' manque(nt) à la chaîne causale.':c.status==='modified'?'L’événement se produit sous une forme divergente.':c.description;
 news(c.title,detail,c.status==='completed'?'major':'war');if(p.island===c.location||p.region===infStatic(c.location).region)tl(c.title,detail,'canon');
 if(game.codex.events.indexOf(c.title)<0)game.codex.events.push(c.title);var playerImpact=inferPlayerCanonImpact(c,causal,c.status);if(c.status==='cancelled'||c.status==='modified'){var branch=createCanonBranch(c,causal);if(branch&&playerImpact)branch.playerCaused=true}recordCanonCausality(c,causal,c.status);w.canonHistory.push({id:c.id,status:c.status,year:w.year,month:w.month});w.canonHistory=w.canonHistory.slice(-80)
}
function processCanonEvents(){var w=game.world,now=w.year*12+Math.floor(w.month);syncActorAvailability();w.canon.forEach(function(c){if(c.status==='future'&&now>=canonMonth(c))resolveCanonEvent(c)})}
function worldMonthStep(){syncActorAvailability();migrateWorldFoundations(game,game.world);fruitMarketTick();syncCanonicalFruits();processCanonEvents();simulateCanonBranches();simulateTerritories();simulateCrews();simulateActors();simulateConflicts();simulateDiplomacy();strategyTick();simulateWorldSagas();playerSagaPresence();updateFactionWorldGoals();simulateEconomy();snapshotWorldTerritories();var w=game.world,activeWars=(w.wars||[]).filter(function(x){return x.status==='active'}).length,activeConflicts=(w.conflicts||[]).filter(function(x){return x.status==='active'}).length,activeBranches=(w.worldState&&w.worldState.canonBranches||[]).filter(function(x){return x.status==='active'}).length,targetTension=cl(18+activeWars*14+activeConflicts*5+activeBranches*4+(w.divergence||0)*.18,12,82);w.globalTension=cl(w.globalTension+(targetTension-w.globalTension)*.035+(R('world')-.5)*1.6,0,100);REG.forEach(function(r){var rp=w.pressures[r];if(!rp)return;Object.keys(rp).forEach(function(k){rp[k]=cl(rp[k]+(R('world')-.5)*2.2,0,100)})})}
function world(m){var w=game.world;if(!w.v1ClockMigrated){var frac=(w.month||0)%1;w.month=Math.floor(w.month||0);w.simRemainder=(w.simRemainder||0)+frac;w.v1ClockMigrated=true}w.simRemainder=(w.simRemainder||0)+m;while(w.simRemainder>=1){w.simRemainder-=1;w.month++;if(w.month>=12){w.month=0;w.year++;if(R('world')<.55)news('Bilan annuel',pk(['La Marine réorganise plusieurs bases.','De nouveaux équipages se font un nom.','Des réseaux clandestins gagnent du terrain.','Plusieurs routes commerciales changent de mains.'],'world'),'')}worldMonthStep()}}
function runLocalEvent(){var p=game.player,candidates=LOCAL_EVENTS.filter(function(x){return x.regions.indexOf(p.region)>=0});if(!candidates.length)return false;var ev=pk(candidates,'local');if(ev.kind==='economy'){var v=1200+Math.round(R('local')*9000);if(R('local')<.58){p.money-=Math.min(Math.max(0,p.money),v);tl(ev.title,'Une transaction locale te coûte '+v.toLocaleString('fr-FR')+' B.')}else{p.money+=v;tl(ev.title,'Une opportunité commerciale te rapporte '+v.toLocaleString('fr-FR')+' B.')}}else if(ev.kind==='danger'){resolveAmbientDanger(ev.title,inf().danger+8+R('local')*24)}else if(ev.kind==='faction'){adjustRep(p.faction,1+R('local')*2);tl(ev.title,'Tes activités attirent l’attention des organisations présentes dans la zone.')}else if(ev.kind==='world'){news(ev.title,'Une information circule dans '+p.region+' et modifie les rumeurs locales.','');tl(ev.title,'Tu obtiens de nouvelles informations sur les forces locales.')}else if(ev.kind==='discovery'){var site=explorationSite(p.island),gain=3+R('local')*7;site.familiarity=cl(site.familiarity+gain,0,100);var found=discoverByKnowledge(p.island);if(!found)learnLocalRumor(p.island);var value=300+Math.round(R('local')*2200);p.money+=value;tl(ev.title,'Ton exploration enrichit ta connaissance de '+p.island+' et te rapporte '+value.toLocaleString('fr-FR')+' B.')}return true}
function dangerAlternativeScore(){
 var p=game.player,nav=p.skills.Navigation||0,stealth=p.skills['Discrétion']||0,command=p.skills.Commandement||0,ref=p.stats['Réflexes']||0,agi=p.stats['Agilité']||0,will=p.stats['Volonté']||0;
 return Math.max(nav*.58+ref*.22+agi*.20,stealth*.58+agi*.24+ref*.18,command*.55+will*.27+ref*.18)
}
function resolveAmbientDanger(title,danger){
 var p=game.player,alt=dangerAlternativeScore(),combat=power(),avoidChance=cl(.18+(alt-danger)/95,.08,.82);
 if(alt>combat+5&&R('e')<avoidChance){var key=(p.skills['Discrétion']||0)>=Math.max(p.skills.Navigation||0,p.skills.Commandement||0)?'Discrétion':(p.skills.Navigation||0)>=(p.skills.Commandement||0)?'Navigation':'Commandement',g=gain(key,.25+.3*R('e'));p.energy=cl(p.energy-(2+danger*.025),0,100);if(danger>=48)attemptBreakthrough('survie',danger,[key,'Réflexes','Agilité','Volonté']);tl(title||'Danger évité','Tu évites l’affrontement grâce à '+key+(g?' • '+key+' +'+g.toFixed(1):'')+'.','major');return true}
 return fight(danger,title||'Confrontation imprévue')
}
function event(m,force){
 var p=game.player,l=migrateLifeLoop(game),before=l.momentSeq;if(!force&&R('e')>eventChance(m))return false;
 var actors=game.world.actors.filter(function(c){return c.region===p.region&&c.status==='active'}),crews=game.world.crews.filter(function(c){return c.region===p.region&&c.status==='active'}),availableFruits=!p.fruit&&!p.heldFruit?game.world.fruits.filter(function(n){return !game.world.fruitRegistry[n]||game.world.fruitRegistry[n].status==='available'}):[],hakiKeys=['Observation','Armement','Conquérant'].filter(function(k){return p.haki[k]>0||p.latent[k]>55}),activityKeys=activityGrowthKeys(currentFocus()).filter(function(k){var b=p.stats[k]!=null?p.stats:p.skills;return(b[k]||0)<(p.caps[k]||100)-.05});
 var items=[{id:'youth',weight:p.ageMonths<144?2.4:0},{id:'local',weight:p.ageMonths>=144?2.0:0},{id:'activity',weight:p.ageMonths>=72&&activityKeys.length?1.05:0},{id:'relation',weight:p.ageMonths>=72?1.0:0},{id:'danger',weight:p.ageMonths>=144?.55+(inf().danger||0)/70:0},{id:'meet',weight:actors.length?.75:0},{id:'crew',weight:p.ageMonths>=72&&crews.length?.55:0},{id:'life',weight:p.ageMonths>=180?.7:0},{id:'money',weight:p.ageMonths>=180?.5:0},{id:'haki',weight:p.ageMonths>=144&&hakiKeys.length?.14:0},{id:'fruit',weight:p.ageMonths>=144&&availableFruits.length?.055:0}].filter(function(x){return x.weight>0}),pick=weightedEventPick(items);if(!pick)return false;var x=pick.id;
 if(x==='youth'){var y=pk(['discovery','family','challenge','rumor'],'e');if(y==='family'){var yr=createRelation(p.ageMonths<72?'proche de la famille':null);tl('Vie quotidienne',yr.name+' prend une place plus importante dans ton entourage.')}else if(y==='challenge'){var yk=pk(p.ageMonths<72?['Endurance','Réflexes']:['Discipline','Réflexes'],'e'),yg=gain(yk,.18+.28*R('e'));tl('Petit défi','Une expérience de ton âge fait progresser '+yk+(yg>0?' de '+yg.toFixed(1):'')+'.')}else if(y==='rumor'){tl('Rumeurs du large','Des récits de pirates, de Marines et d’îles lointaines nourrissent peu à peu ta vision du monde.')}else{var dk=pk(['Réflexes','Discipline'],'e'),dg=gain(dk,.15+.25*R('e'));tl('Découverte locale','Une expérience nouvelle aiguise '+dk+(dg>0?' de '+dg.toFixed(1):'')+'.')}}
 else if(x==='activity'){var ak=pk(activityKeys,'e'),ag=gain(ak,.2+.35*R('e'));tl('Déclic de progression','Focus '+currentFocus()+' : '+ak+(ag>0?' +'+ag.toFixed(1):' se consolide')+'.')}
 else if(x==='relation'){var r=createRelation();tl('Nouvelle rencontre',r.name+' entre dans ta vie comme '+r.role+'.','major')}
 else if(x==='money'){var z=1000+Math.floor(R('e')*12000);p.money+=z;tl('Bonne affaire','Tu gagnes '+z.toLocaleString('fr-FR')+' B.')}
 else if(x==='danger')resolveAmbientDanger('Confrontation imprévue',inf().danger+10+R('e')*35);
 else if(x==='meet'){var c=pk(actors,'e'),rel=bondCanonicalActor(c,'Vous vous recroisez dans '+p.region+'.');if(game.codex.people.indexOf(c.name)<0)game.codex.people.push(c.name);tl('Rencontre canonique','Tu croises '+c.name+' ('+c.faction+'). '+(rel.role==='rival'?'Une tension personnelle commence à s’installer.':rel.mentorPotential?'Son expérience pourrait un jour influencer ta progression.':'Il/elle fait désormais partie de ton réseau de relations.')+' Sa trajectoire actuelle : '+c.goal+'.','canon')}
 else if(x==='crew'){var cr=pk(crews,'e');tl('Équipage aperçu',cr.name+' est signalé dans '+p.region+' — puissance estimée '+Math.round(cr.power)+'.',diplomacy(p.faction,cr.faction)<-40?'danger':'')}
 else if(x==='local')runLocalEvent();
 else if(x==='life'){if(R('life')<.55){var expense=800+Math.round(R('life')*6500);p.money-=expense;tl('Dépense imprévue','Un imprévu te coûte '+expense.toLocaleString('fr-FR')+' B.')}else{var gainLife=1000+Math.round(R('life')*9000);p.money+=gainLife;tl('Petit coup de chance','Une opportunité te rapporte '+gainLife.toLocaleString('fr-FR')+' B.')}}
 else if(x==='haki'){var k=pk(hakiKeys,'h');if(p.haki[k]===0){p.haki[k]=1;syncPowers();tl('Éveil du Haki','Ton Haki de '+k+' s’éveille.','major')}else{trainHaki(k,.6);syncPowers();tl('Instinct affûté','Ton Haki de '+k+' progresse légèrement.')}}
 else if(x==='fruit'){var fr=pickFruit(availableFruits);decision('Un Fruit du démon','Tu découvres '+fr+'. Rien ne t’oblige à le consommer.',[['Le manger','Obtenir son pouvoir, mais perdre la capacité de nager.',function(){p.fruit=fr;p.fruitMastery=1;game.world.fruitRegistry[fr]={status:'consumed',holder:p.name};if(game.codex.fruits.indexOf(fr)<0)game.codex.fruits.push(fr);tl('Fruit du démon','Tu consommes le '+fr+'.','major')}],['Le conserver','Le garder pour plus tard.',function(){p.heldFruit=fr;game.world.fruitRegistry[fr]={status:'held',holder:p.name};tl('Fruit découvert','Tu conserves le '+fr+'.','major')}],['Le vendre','Transformer cette rareté en Berry.',function(){var val=40000+Math.round(R('fruit')*110000);p.money+=val;game.world.fruitRegistry[fr]={status:'sold',holder:null,marketMonths:0};tl('Vente exceptionnelle','Tu vends le '+fr+' pour '+val.toLocaleString('fr-FR')+' B.','major')}]])}
 return migrateLifeLoop(game).momentSeq>before||!!game.pending
}

function die(c){activeStories().slice().forEach(function(st){closeStory(st,'interrompu par la mort','La mort de '+game.player.name+' met fin à ce fil narratif.',true,'interrupted')});releasePlayerFruits();game.alive=false;game.death={cause:c};game.player.health=0;tl('Mort',c,'danger')}
function advanceSlice(m){
 var p=game.player,j=migrateJustice(p),loop=migrateLifeLoop(game),sliceMoment=loop.momentSeq;p.ageMonths+=m;world(m);arcTick(m);p.conditions.forEach(function(c){c.months-=m});p.conditions=p.conditions.filter(function(c){return c.months>0});
 if(j.detained){lifeTick(m);personalChapterTick(m);influenceTick(m);destinyTick(m);if(!game.alive)return;prisonTick(m);storyTick(m);processConsequences();p.danger='Détenu';return}
 p.health=cl(p.health+m*2,0,100);p.energy=cl(p.energy+m*4,0,100);careerTick(m);lifeTick(m);personalChapterTick(m);if(!game.alive)return;justiceTick(m);influenceTick(m);destinyTick(m);if(!game.alive)return;
 j=migrateJustice(p);if(j.detained){storyTick(m);return}
 if(!game.pending&&!awaitingStory())worldReactionTick(m);if(game.pending)return;
 if(p.travel){travel(m);storyTick(m);processConsequences()}
 else if(game.mission){game.mission.remaining-=m;train(m*.4);if(game.mission.remaining<=0)resolveMission();storyTick(m);processConsequences()}
 else{train(p.activity==='Explorer'?m*.55:m);explorationTick(m);storyTick(m);processConsequences();var alreadyMeaningful=loop.momentSeq>sliceMoment,force=!alreadyMeaningful&&loop.quietAdvances>=2;if(!game.pending&&!awaitingStory()&&(!alreadyMeaningful||R('story')<.22))event(m,force)}
 if(!game.alive)return;
 if(p.ageMonths>=72&&p.situation==='Enfance'){p.situation='Formation';p.activity='Formation';p.focus='Auto';tl('Formation','Tu commences une formation structurée.','major')}
 if(p.ageMonths>=180&&p.career==='Aucune'&&!game.pending&&!awaitingStory())career();
 if(!game.pending&&!awaitingStory())legendRecognitionTick();
 p.danger=p.conditions.length?'Moyen':inf().danger>45?'Élevé':inf().danger>20?'Moyen':'Faible'
}
function advance(){
 if(!game||!game.alive)return;if(game.pending)return showDecision();if(awaitingStory())return showStoryDecision();
 var p=game.player,plan=advancePlan(),target=chooseAdvanceDuration(plan),before=captureAdvanceState(),loop=migrateLifeLoop(game),total=0,startMajor=loop.majorSeq,startMoments=loop.momentSeq,adult=p.ageMonths>=180,hadMission=!!game.mission,hadTravel=!!p.travel;
 if(!adult&&!hadMission&&!hadTravel&&plan.key!=='detention'){advanceSlice(target);total=target}
 else{
  var remaining=target,guard=0;
  while(remaining>.001&&guard++<12&&game.alive){
   var slice=Math.min(1,remaining);advanceSlice(slice);total+=slice;remaining-=slice;
   var missionEnded=hadMission&&!game.mission,travelEnded=hadTravel&&!p.travel,important=loop.majorSeq>startMajor,tooManyMoments=loop.momentSeq-startMoments>=4;
   if(game.pending||awaitingStory()||missionEnded||travelEnded||important||tooManyMoments)break
  }
 }
 if(total<=0)return;
 recordProgressSnapshot(false);checkAchievements();finalizeAdvanceReport(before,total,plan);save();render();if(!game.alive)deathModal()
}

function rep(){var r=game.player.reputation;return r>75?'Célèbre':r>40?'Reconnu':r>15?'Connu':'Inconnu'}
function slots(){var b=$('#saveSlots');b.innerHTML='';for(var i=1;i<=3;i++){(function(i){var saved=load(i),wrap=document.createElement('div'),x=document.createElement('button');wrap.className='save-slot-wrap'+(saved?'':' empty');x.className='save-slot'+(saved?'':' empty');x.innerHTML=saved?'<strong>'+e(saved.player.name)+'</strong><small>'+Math.floor(saved.player.ageMonths/12)+' ans • '+e(saved.player.faction)+'<br>'+e(saved.player.island)+'</small>':'<strong>＋ Nouvelle vie</strong><small>Emplacement '+i+'</small>';x.onclick=function(){slot=i;if(saved){game=saved;syncCanonicalFruits();render()}else $('#creationCard').classList.remove('hidden')};wrap.appendChild(x);if(saved){var del=document.createElement('button');del.className='save-delete';del.type='button';del.setAttribute('aria-label','Supprimer la sauvegarde '+i);del.textContent='Supprimer';del.onclick=function(ev){if(ev&&ev.stopPropagation)ev.stopPropagation();deleteSaveSlot(i,false)};wrap.appendChild(del)}b.appendChild(wrap)})(i)}}
function bar(o){return Object.keys(o).map(function(k){var v=o[k];return '<div class="stat-row"><span>'+e(k)+'</span><div class="stat-bar"><div class="stat-fill" style="width:'+cl(v,0,100)+'%"></div></div><span class="stat-value">'+Math.round(v)+'</span></div>'}).join('')}

var activeTab='life';
var sectionState={character:'profile',abilities:'progress',relations:'close',world:'explore'};
var relationNetworkExpanded=false;
var SECTION_UI={
 character:{nav:'characterSectionTabs',groups:[
  {id:'profile',label:'Profil',markers:['identityGrid','careerCard','careerProgressCard','specializationCard','factionStanding','ambitionCard']},
  {id:'career',label:'Carrière',markers:['specializationOptions','careerActions','missionBoard']},
  {id:'situation',label:'Situation',markers:['wantedPoster','publicStanding','crewSection','economySummary','achievementList','equipmentList','storageStatus']}
 ]},
 abilities:{nav:'abilitiesSectionTabs',groups:[
  {id:'progress',label:'Progresser',markers:['progressionSummary','activityOptions']},
  {id:'powers',label:'Pouvoirs',markers:['hakiList','fruitCard','hakiApplications','fruitMasteryCard']},
  {id:'details',label:'Détails',markers:['statsList','skillsList','techniqueList','combatStyleCard','combatReportSection']}
 ]},
 relations:{nav:'relationsSectionTabs',groups:[
  {id:'close',label:'Proches',markers:['socialSummary','romanceCard','familyList']},
  {id:'network',label:'Réseau',markers:['bondDynamicsSummary','npcNetworkSummary','relationsList']}
 ]},
 world:{nav:'worldSectionTabs',groups:[
  {id:'explore',label:'Explorer',markers:['worldHeadline','placeName','explorationSummary','journeySummary','travelOptions','regionMap']},
  {id:'world',label:'Monde',markers:['marketSummary','worldPulse','localActors','territoryList','domainSummary','conflictList','warOverview','autonomousCrews','diplomacyGrid','factionOverview','pressureBars']},
  {id:'history',label:'Histoire',markers:['worldNews','canonForecast','canonList','codexSummary','codexList']}
 ]}
};
function setupSectionNavigation(){
 Object.keys(SECTION_UI).forEach(function(name){var cfg=SECTION_UI[name],panel=$('#'+name+'Panel'),nav=$('#'+cfg.nav);if(!panel||!nav)return;
  cfg.groups.forEach(function(g){g.markers.forEach(function(id){var marker=$('#'+id);if(!marker||!marker.closest)return;var card=marker.closest('.paper-card');if(card&&card.parentElement===panel)card.dataset.uiGroup=g.id})});
  Array.prototype.forEach.call(panel.children,function(el){if(el.classList&&el.classList.contains('paper-card')&&!el.dataset.uiGroup)el.dataset.uiGroup=cfg.groups[0].id});
  nav.innerHTML=cfg.groups.map(function(g){return'<button class="section-tab '+(sectionState[name]===g.id?'active':'')+'" data-section-owner="'+name+'" data-section-target="'+g.id+'">'+e(g.label)+'</button>'}).join('');
  nav.querySelectorAll('.section-tab').forEach(function(b){b.onclick=function(){sectionState[name]=b.dataset.sectionTarget;renderPanel(name);applySectionGroup(name,b.dataset.sectionTarget,true)}});
  applySectionGroup(name,sectionState[name]||cfg.groups[0].id,false)
 })
}
function applySectionGroup(name,group,scroll){
 var cfg=SECTION_UI[name],panel=$('#'+name+'Panel'),nav=cfg&&$('#'+cfg.nav);if(!cfg||!panel)return;sectionState[name]=group;
 Array.prototype.forEach.call(panel.children,function(el){if(el.classList&&el.classList.contains('paper-card'))el.classList.toggle('ui-section-hidden',!!el.dataset.uiGroup&&el.dataset.uiGroup!==group)});
 if(nav)nav.querySelectorAll('.section-tab').forEach(function(b){b.classList.toggle('active',b.dataset.sectionTarget===group)});
 if(scroll)scrollTo(0,0)
}
function renderPanel(name){
 if(!game)return;if(name==='life')renderTimeline();else if(name==='character')renderChar();else if(name==='abilities')renderAb();else if(name==='relations')renderRel();else if(name==='world')renderWorld();
 if(SECTION_UI[name])applySectionGroup(name,sectionState[name]||SECTION_UI[name].groups[0].id,false)
}
function activateTab(name,scroll){
 activeTab=name||'life';$$('.nav-item').forEach(function(x){x.classList.toggle('active',x.dataset.tab===activeTab)});$$('.tab-panel').forEach(function(x){x.classList.toggle('active',x.dataset.panel===activeTab)});renderPanel(activeTab);if(scroll!==false)scrollTo(0,0)
}
function renderDevOutput(){
 var panel=$('#developerPanel');if(!game||!panel||panel.classList.contains('hidden'))return;$('#devOutput').textContent=JSON.stringify({seed:game.seed,power:power(),player:game.player,world:game.world},null,2)
}

function showGame(){$('#startScreen').classList.remove('active');$('#gameScreen').classList.add('active');$('#bottomNav').classList.remove('hidden');$('#homeBtn').classList.remove('hidden')}
function showStart(){game=null;activeTab='life';$('#gameScreen').classList.remove('active');$('#startScreen').classList.add('active');$('#bottomNav').classList.add('hidden');$('#homeBtn').classList.add('hidden');slots()}
function renderTimeline(){var a=game.timeline.filter(function(x){return !majorOnly||['major','danger','canon'].indexOf(x.type)>=0}),limit=timelineExpanded?45:5;$('#timeline').innerHTML=a.slice(0,limit).map(function(x){return '<div class="timeline-item '+e(x.type)+'"><span class="timeline-dot"></span><span class="timeline-age">'+e(x.age)+'</span><div class="timeline-title">'+e(x.title)+'</div><div class="timeline-desc">'+e(x.desc)+'</div></div>'}).join('')+(a.length>5?'<button id="timelineMoreBtn" class="text-btn">'+(timelineExpanded?'Réduire l’histoire':'Voir toute l’histoire')+'</button>':'');var b=$('#timelineMoreBtn');if(b)b.onclick=function(){timelineExpanded=!timelineExpanded;renderTimeline()}}
function renderJustice(){
 var p=game.player,j=migrateJustice(p),level=wantedLevel(),heat=currentHeat(),pressure=justicePressure(),bounty=p.bounty||0,badge=$('#wantedBadge');
 badge.textContent=level;badge.className='badge '+(level==='Aucun avis'?'wanted-clear':level==='Surveillé'||level==='Recherché'?'wanted-hot':'wanted-critical');
 $('#wantedPoster').innerHTML='<div class="wanted-kicker">'+(bounty>0?'WANTED • DEAD OR ALIVE':'SURVEILLANCE LOCALE')+'</div><div class="wanted-name">'+e(p.name)+'</div><div class="wanted-bounty">'+bounty.toLocaleString('fr-FR')+' B</div><div class="wanted-level">'+e(level)+' • record '+Math.round(p.highestBounty||0).toLocaleString('fr-FR')+' B</div>';
 $('#justiceSummary').innerHTML='<div><span>Chaleur '+e(p.region)+'</span><strong>'+Math.round(heat)+'%</strong><div class="heat-meter"><div style="width:'+cl(heat,0,100)+'%"></div></div></div><div><span>Pression des autorités</span><strong>'+Math.round(pressure)+'%</strong><div class="heat-meter"><div style="width:'+cl(pressure,0,100)+'%"></div></div></div><div><span>Captures effectuées</span><strong>'+j.captures+'</strong></div><div><span>Primes encaissées</span><strong>'+Math.round(j.bountiesClaimed).toLocaleString('fr-FR')+' B</strong></div>';
 var actions='';if(!j.detained){if(heat>2||bounty>0)actions+='<button id="layLowBtn" class="action-card"><strong>Se faire oublier</strong><small>Réduire la chaleur locale. Coûte jusqu’à 1 200 B.</small></button>';if(bounty>0||heat>=18)actions+='<button id="surrenderBtn" class="action-card career-action-warning"><strong>Se rendre</strong><small>Accepter une détention réduite plutôt que risquer une capture violente.</small></button>';if(!actions)actions='<div class="career-card"><p class="justice-note">Aucune recherche active importante. Les crimes observés, les attaques contre les autorités et certaines missions peuvent changer cela.</p></div>'}
 $('#justiceActions').innerHTML=actions;var lb=$('#layLowBtn');if(lb)lb.onclick=layLow;var sb=$('#surrenderBtn');if(sb)sb.onclick=surrenderPlayer;
 $('#prisonSection').classList.toggle('hidden',!j.detained);if(j.detained&&j.prison){var pr=j.prison;$('#prisonTitle').textContent='Détention à '+pr.location;$('#prisonBadge').textContent=pr.remaining.toFixed(1)+' mois';$('#prisonCard').innerHTML='<div class="prison-state"><strong>'+e(pr.reason)+'</strong><span>Sécurité '+Math.round(pr.security)+'/100 • '+pr.attempts+' tentative(s) d’évasion • avance le temps pour purger la peine.</span></div>';$('#prisonActions').innerHTML='<button id="escapeBtn" class="action-card career-action-warning"><strong>Tenter une évasion</strong><small>Discrétion, agilité, réflexes et puissance contre la sécurité de la prison.</small></button>';$('#escapeBtn').onclick=attemptEscape}
 $('#bountyHunterSection').classList.toggle('hidden',p.faction!=='Chasseur de primes'||j.detained);if(p.faction==='Chasseur de primes'&&!j.detained){var targets=bountyTargets();$('#bountyHunterBadge').textContent=targets.length+' cible'+(targets.length>1?'s':'');$('#bountyTargets').innerHTML=targets.length?targets.map(function(t){return '<div class="bounty-target"><strong>'+e(t.name)+'</strong><span>'+e(t.region)+' • puissance '+Math.round(t.power)+' • '+t.members+' membres</span><small>Prime : '+Math.round(t.bounty).toLocaleString('fr-FR')+' B</small><button data-bounty-target="'+e(t.id)+'">Lancer la traque</button></div>'}).join(''):'<p class="justice-note">Aucune cible pirate active dans cette région. Change de région ou laisse le monde évoluer.</p>';$$('[data-bounty-target]').forEach(function(b){b.onclick=function(){huntBountyTarget(b.dataset.bountyTarget)}})}
 $('#crimeHistory').innerHTML=j.crimes.length?j.crimes.slice(0,8).map(function(c){return '<div class="crime-row"><strong>'+e(c.name)+'</strong><span>'+e(c.place)+' • '+e(c.region)+' • gravité '+c.severity+' • '+(c.witnessed?'attribué':'non attribué')+' • année '+c.year+', mois '+(c.month+1)+'</span></div>'}).join(''):'<p class="justice-note">Dossier vierge. Pour le moment.</p>'
}

function renderChar(){var p=game.player,rec=careerRecord(),cfg=CAREERS[p.faction]||CAREERS.Civil,repv=p.factionRep[p.faction]||0,next=nextRank(),ri=rankIndex(),sal=salaryPerMonth(),pension=retirementIncomePerMonth(),group=sectionState.character||'profile';
 if(group==='profile'){
 $('#identityGrid').innerHTML=[['Nom',p.name],['Origine',p.origin],['Race',p.race],['Lieu',p.island],['Faction',cfg.label],['Réputation',rep()]].map(function(x){return '<div class="info-cell"><span>'+e(x[0])+'</span><strong>'+e(x[1])+'</strong></div>'}).join('');
 $('#careerStandingBadge').textContent=rec.retired?'Vétéran':standingLabel(repv);$('#careerCard').innerHTML='<strong>'+e(cfg.label)+' • '+e(p.rank)+(rec.retired?' • Vétéran':'')+'</strong><p>'+(p.specialization?'Spécialisation : '+e(p.specialization)+' • ':'')+'Ancienneté active : '+Math.floor(rec.months)+' mois • Missions : '+rec.successes+' réussies / '+rec.failures+' échouées</p>'+(rec.retired?(pension?'<span class="salary-chip">Pension '+pension.toLocaleString('fr-FR')+' B / mois</span>':'<span class="salary-chip">Retrait du service actif</span>'):(sal?'<span class="salary-chip">'+sal.toLocaleString('fr-FR')+' B / mois</span>':'<span class="salary-chip">Revenus à la mission</span>'));
 if(rec.retired)$('#careerProgressCard').innerHTML='<div class="career-progress-head"><strong>Carrière active terminée</strong><span>Vétéran</span></div><p class="helper-text">Les promotions automatiques sont arrêtées. Tu peux encore accepter ponctuellement des missions et influencer le monde.</p>';else if(next){var xpPct=cl(rec.xp/next.xp*100,0,100),qual=careerQualification(),expertise=careerExpertise(),review=careerPerformanceReview(rec,rankIndex()),reqs=[['XP '+Math.round(rec.xp)+' / '+next.xp,rec.xp>=next.xp],['Réputation '+Math.round(repv)+' / '+next.rep,repv>=next.rep],[careerRequirementLabel()+' '+Math.round(qual)+' / '+next.pow,qual>=next.pow],['Expertise '+Math.round(expertise),true]];if(p.faction==='Pirates'&&p.organization&&p.organization.pirateOrigin==='joined'){var crewReq=crewStandingRequirement(next.n);if(crewReq){var crewNow=joinedCrewStanding(p.organization);reqs.push(['Place équipage '+Math.round(crewNow)+' / '+crewReq,crewNow>=crewReq])}}if(review.active){reqs.push(['Dossier global '+Math.round(review.successRate*100)+'% / '+Math.round(review.required*100)+'%',review.successRate>=review.required]);reqs.push(['Forme récente '+Math.round(review.recentRate*100)+'% / '+Math.round(review.recentRequired*100)+'%',review.recentRate>=review.recentRequired]);reqs.push(['Distinctions '+review.distinctions+' / '+review.neededDistinctions,review.distinctions>=review.neededDistinctions]);reqs.push(['Expérience '+review.total+' / '+review.minMissions+' missions',review.total>=review.minMissions])};$('#careerProgressCard').innerHTML='<div class="career-progress-head"><strong>Prochain rang : '+e(next.n)+'</strong><span>'+Math.round(xpPct)+'%</span></div><div class="career-progress-bar"><div style="width:'+xpPct+'%"></div></div><div class="career-reqs">'+reqs.map(function(r){return '<span class="'+(r[1]?'met':'unmet')+'">'+e(r[0])+'</span>'}).join('')+'</div>'}else if(p.faction==='Pirates'&&p.organization&&p.organization.pirateOrigin==='joined')$('#careerProgressCard').innerHTML='<div class="career-progress-head"><strong>Sommet de la hiérarchie accessible : Bras droit</strong><span>Le capitaine reste le détenteur du pavillon. Pour commander, il faut fonder ton propre équipage.</span></div>';else $('#careerProgressCard').innerHTML='<div class="career-progress-head"><strong>Rang maximal automatique atteint</strong><span>Les postes supérieurs dépendent d’événements du monde.</span></div>';
 $('#specializationBadge').textContent=p.specialization||'À choisir';$('#specializationCard').innerHTML=p.specialization?'<strong>'+e(p.specialization)+'</strong><p>Cette spécialisation influence tes missions et ta progression secondaire.</p>':'<strong>Aucune spécialisation</strong><p>Choisis ton rôle dans l’onglet Carrière.</p>';
 $('#factionStanding').innerHTML=FACTION_KEYS.map(function(f){var v=p.factionRep[f]||0,pos=cl((v+100)/2,0,100);return '<div class="standing-row"><div class="standing-head"><strong>'+e(CAREERS[f]?CAREERS[f].label:f)+'</strong><span>'+standingLabel(v)+' • '+Math.round(v)+'</span></div><div class="standing-meter"><div class="standing-marker" style="left:'+pos+'%"></div></div></div>'}).join('');

 var dst=migrateDestiny(p),lifeStage=lifeImportanceStage(),destinyGoals=p.career!=='Aucune'?careerDestinyMilestones():[],destinyDone=destinyGoals.filter(function(x){return x.done}).length;if(p.career!=='Aucune'){$('#careerProgressCard').innerHTML+='<div class="career-progress-head destiny-head"><strong>Destinée : '+e(destinyProfile().title)+'</strong><span>'+e(lifeStage.label)+' • '+lifeStage.score+'/100</span></div><div class="career-reqs">'+destinyGoals.map(function(x){return'<span class="'+(x.done?'met':'unmet')+'">'+e(x.label)+' • '+Math.round(x.progress)+'%</span>'}).join('')+'</div><p class="helper-text">'+destinyDone+'/'+destinyGoals.length+' accomplissements majeurs. À partir du niveau Élite, le monde commence à venir directement vers toi.</p>'}$('#ambitionCard').innerHTML='<strong>'+e(p.ambition)+'</strong><p>Cette priorité guide les recommandations automatiques.</p>';$('#ambitionOptions').innerHTML='<button id="ambitionChoiceBtn" class="action-card"><strong>Changer d’ambition</strong><small>Une seule décision au lieu de cinq boutons permanents.</small></button>';$('#ambitionChoiceBtn').onclick=ambitionDecision;
 }
 if(group==='career'){
 $('#careerActions').innerHTML='<button id="changeCareerBtn" class="action-card career-action-warning"><strong>Changer de voie</strong><small>Quitter ta faction peut avoir des conséquences durables.</small></button><button id="careerRecordBtn" class="action-card"><strong>Dossier de carrière</strong><small>'+p.careerHistory.length+' changement(s) de voie • '+Math.round(p.salaryTotal).toLocaleString('fr-FR')+' B de salaire cumulés</small></button>';$('#changeCareerBtn').onclick=careerChangeDecision;$('#careerRecordBtn').onclick=function(){toast('XP carrière : '+Math.round(rec.xp)+' • ancienneté : '+Math.floor(rec.months)+' mois')};
 $('#specializationOptions').innerHTML='<button id="specializationChoiceBtn" class="action-card"><strong>'+(p.specialization?'Changer de spécialisation':'Choisir une spécialisation')+'</strong><small>'+(p.specialization?'Rôle actuel : '+e(p.specialization):'Le moteur adaptera ensuite automatiquement ton focus Carrière.')+'</small></button>';$('#specializationChoiceBtn').onclick=specializationDecision;
 $('#missionBoard').innerHTML=game.mission?'<div class="mission-card active-mission"><strong>'+e(game.mission.title)+'</strong><p>'+game.mission.remaining.toFixed(1)+' mois restants • '+e(missionProfile(game.mission).config.label)+' • '+game.mission.xp+' XP carrière'+(game.mission.worldGenerated?' • monde vivant':'')+'</p></div>':board().map(function(m){return '<button class="mission-card '+(m.recommended?'recommended':'')+'" data-m="'+m.id+'"><strong>'+e(m.title)+(m.recommended?' · recommandée':'')+(m.narrativePriority?' · fil prioritaire':'')+'</strong><p>'+e(m.guidance||missionGuidance(m))+' • '+e(m.approach)+' • '+Math.round(m.chance*100)+'% • '+m.reward.toLocaleString('fr-FR')+' B</p>'+'<small>'+(m.signature?'★ '+e(m.stakes)+' • ':'')+(m.worldGenerated?'Origine : '+e(m.sourceName||'monde vivant'):'Mission de carrière')+'</small></button>'}).join('');$$('[data-m]').forEach(function(b){b.onclick=function(){startMission(+b.dataset.m)}});
 }
 if(group==='situation'){
 renderJustice();renderInfluence();
 var org=p.career!=='Aucune'?ensureOrganization():null;$('#crewSection').classList.toggle('hidden',!org);
 if(org){
  var activeMembers=org.members.filter(function(m){return m.status==='active'}),cap=organizationCapacity(),auth=org.authority,orgPow=organizationPower();
  var piratePath=org.faction==='Pirates'?pirateOriginLabel(org):'',crewStanding=org.faction==='Pirates'&&org.pirateOrigin==='joined'?joinedCrewStanding(org):null,chemistry=crewChemistry(org),friction=crewWorstFriction(org),bond=crewStrongestBond(org);$('#organizationEyebrow').textContent=org.kind+(piratePath?' • '+piratePath:'');$('#crewName').textContent=org.name;$('#crewMorale').textContent='Moral '+Math.round(org.morale)+'%';
  $('#organizationSummary').innerHTML='<div><span>Ton rôle</span><strong>'+e(org.playerRole)+'</strong></div>'+(piratePath?'<div><span>Origine</span><strong>'+e(piratePath)+'</strong></div>':'')+(crewStanding!=null?'<div><span>Place dans l’équipage</span><strong>'+Math.round(crewStanding)+' • '+e(crewStandingLabel(crewStanding))+'</strong></div>':'')+'<div><span>Puissance du groupe</span><strong>'+Math.round(orgPow)+'</strong></div><div><span>Dynamique interne</span><strong>'+Math.round(chemistry)+' • '+e(crewDynamicsLabel(chemistry))+'</strong></div><div><span>Cohésion</span><strong>'+Math.round(org.cohesion)+'%</strong></div><div><span>Renommée</span><strong>'+Math.round(org.renown)+'</strong></div>';
  var pirateContext=org.faction==='Pirates'?(org.pirateOrigin==='founded'?'Tu as créé ce pavillon : tu es capitaine, avec accès au recrutement, aux rôles, à la logistique et au navire.':auth==='officer'?'Tu as rejoint cet équipage et atteint son état-major. Tu peux encadrer le groupe, mais le capitaine conserve toujours le pavillon.':'Tu as rejoint un équipage existant comme membre. Tu peux contribuer à la vie du groupe, puis viser Officier et Bras droit, jamais Capitaine.'):'';
  var dynamicText='';if(friction&&friction.rivalry>=42){var fa=crewMemberById(org,friction.a),fb=crewMemberById(org,friction.b);if(fa&&fb)dynamicText=' Tension notable : '+fa.name+' / '+fb.name+'.'}else if(bond&&bond.affinity>=70){var ba=crewMemberById(org,bond.a),bb=crewMemberById(org,bond.b);if(ba&&bb)dynamicText=' Duo solide : '+ba.name+' + '+bb.name+'.'}$('#crewDetails').innerHTML='<strong>'+e(org.playerRole)+' dans '+e(org.kind)+'</strong><p>'+Math.floor(org.months)+' mois dans cette organisation • '+org.successes+' missions réussies / '+org.failures+' échouées. '+(pirateContext||((auth==='member'?'Tu participes aux opérations mais le commandement reste limité.':auth==='officer'?'Tu peux organiser l’entraînement et demander des renforts.':'Tu contrôles le recrutement, la logistique et la composition du groupe.')))+e(dynamicText)+'</p>';
  var joinedWorldCrew=org.faction==='Pirates'&&org.pirateOrigin==='joined'?syncPlayerPirateCrewWorld():null;$('#memberCountBadge').textContent=joinedWorldCrew?(joinedWorldCrew.members+' membres'):activeMembers.length+'/'+cap;
  $('#organizationMembers').innerHTML=activeMembers.length?activeMembers.map(function(m){var lockedCaptain=org.faction==='Pirates'&&org.pirateOrigin==='joined'&&m.role==='Capitaine';return '<div class="org-member '+(m.injuryMonths>0?'injured':'')+'"><div class="org-member-head"><strong>'+e(m.name)+'</strong><span>'+e(m.role)+'</span></div><div class="org-member-meta">Puissance '+Math.round(m.power)+' • loyauté '+Math.round(m.loyalty)+' • moral '+Math.round(m.morale)+' • '+e(crewMemberTemperament(m,org))+(m.injuryMonths>0?' • blessé '+m.injuryMonths.toFixed(1)+' mois':'')+'</div><div class="org-member-bars"><div><div class="org-mini-meter"><div style="width:'+cl(m.loyalty,0,100)+'%"></div></div></div><div><div class="org-mini-meter"><div style="width:'+cl(m.power,0,100)+'%"></div></div></div></div>'+((auth!=='member'&&!(org.faction==='Pirates'&&org.pirateOrigin==='joined')&&!lockedCaptain)?'<div class="relation-actions-mini"><button data-org-role="'+e(m.id)+'">Changer le rôle</button>'+(org.faction==='Pirates'&&org.pirateOrigin==='founded'&&auth==='leader'&&org.firstMateId!==m.id?'<button data-org-firstmate="'+e(m.id)+'">Nommer bras droit</button>':'')+(auth==='leader'?'<button data-org-dismiss="'+e(m.id)+'">Écarter</button>':'')+'</div>':'')+'</div>'}).join(''):'<p class="org-empty">Aucun membre actif. Une organisation sans membres, concept audacieux mais opérationnellement médiocre.</p>';
  $('#organizationResources').innerHTML='<div><span>Caisse</span><strong>'+Math.round(org.treasury).toLocaleString('fr-FR')+' B</strong></div><div><span>Provisions</span><strong>'+Math.round(org.supplies)+'%</strong></div><div><span>Missions</span><strong>'+org.missions+'</strong></div><div><span>Soutien mission</span><strong>-'+Math.round(organizationSupport({}))+' danger</strong></div>';
  $('#shipSection').classList.toggle('hidden',!org.ship);if(org.ship){var st=SHIP_TIERS[org.ship.tier||0]||SHIP_TIERS[0],nextShip=SHIP_TIERS[(org.ship.tier||0)+1];$('#shipName').textContent=org.ship.name;$('#shipCondition').textContent='État '+Math.round(org.ship.condition)+'%';$('#shipCard').innerHTML='<strong>'+e(st.name)+' • capacité '+st.capacity+'</strong><span>Bonus vitesse '+Math.round(st.speed*100)+'%</span><small>État '+Math.round(org.ship.condition)+'%. Un navire dégradé ralentit les traversées et augmente le risque d’incident.</small>'}
  $('#organizationActionBadge').textContent=(org.commandActions||0)+' action';var actions='<button id="orgBondBtn" class="action-card"><strong>Vie de groupe</strong><small>Renforcer moral, cohésion et loyauté.</small></button>',joinedPirate=org.faction==='Pirates'&&org.pirateOrigin==='joined',foundedPirate=org.faction==='Pirates'&&org.pirateOrigin==='founded';
  if(joinedPirate){actions+='<button id="pirateDutyBtn" class="action-card"><strong>Prendre mon quart</strong><small>Faire progresser ta place dans l’équipage sans prendre le commandement.</small></button><button id="foundPirateCrewBtn" class="action-card org-leader"><strong>Fonder mon équipage</strong><small>Quitter ce pavillon pour créer le tien et devenir capitaine.</small></button>';if(auth==='officer')actions+='<button id="pirateCouncilBtn" class="action-card"><strong>Conseil des officiers</strong><small>Proposer une priorité au capitaine, qui garde la décision finale.</small></button><button id="orgRecruitBtn" class="action-card"><strong>Proposer une recrue</strong><small>Le capitaine peut accepter ou refuser ta proposition.</small></button><button id="orgTrainBtn" class="action-card"><strong>Entraînement collectif</strong><small>Encadrer la progression du groupe.</small></button>'}
  else if(auth!=='member')actions+='<button id="orgRecruitBtn" class="action-card"><strong>Recruter</strong><small>Ajouter un membre jusqu’à la capacité actuelle.</small></button><button id="orgTrainBtn" class="action-card"><strong>Entraînement collectif</strong><small>Améliorer la cohésion et la puissance du groupe.</small></button>';
  if(foundedPirate)actions+='<button id="pirateDirectiveBtn" class="action-card org-leader"><strong>Directive du capitaine</strong><small>Priorité actuelle : '+e(org.pirateDirective||'Renommée')+'.</small></button>';if(friction&&friction.rivalry>=42)actions+='<button id="crewDynamicsBtn" class="action-card"><strong>Gérer les tensions</strong><small>Intervenir dans le conflit interne le plus important.</small></button>';
  var currentSupplyCost=marketPrice(p.island,'provisions',true)*5;actions+='<button id="orgFundBtn" class="action-card"><strong>Verser 10 000 B</strong><small>Alimenter la caisse commune.</small></button>';if(!joinedPirate||auth==='officer')actions+='<button id="orgSupplyBtn" class="action-card"><strong>Ravitaillement</strong><small>Environ '+currentSupplyCost.toLocaleString('fr-FR')+' B selon le marché local.</small></button>';
  if(org.ship&&(!joinedPirate||auth==='officer'))actions+='<button id="orgRepairBtn" class="action-card"><strong>Réparer le navire</strong><small>Le coût dépend de son état.</small></button>'+(auth==='leader'&&SHIP_TIERS[(org.ship.tier||0)+1]?'<button id="orgUpgradeBtn" class="action-card org-leader"><strong>Améliorer le navire</strong><small>'+SHIP_TIERS[(org.ship.tier||0)+1].name+' • '+SHIP_TIERS[(org.ship.tier||0)+1].cost.toLocaleString('fr-FR')+' B</small></button>':'');
  $('#organizationActions').innerHTML=actions;$('#orgBondBtn').onclick=supportOrganization;var pdb=$('#pirateDutyBtn');if(pdb)pdb.onclick=pirateCrewDuty;var pcb=$('#pirateCouncilBtn');if(pcb)pcb.onclick=pirateOfficerCouncil;var pdir=$('#pirateDirectiveBtn');if(pdir)pdir.onclick=pirateCaptainDirective;var cdb=$('#crewDynamicsBtn');if(cdb)cdb.onclick=crewDynamicsDecision;var fpb=$('#foundPirateCrewBtn');if(fpb)fpb.onclick=foundOwnPirateCrew;var ob=$('#orgRecruitBtn');if(ob)ob.onclick=recruitOrganizationMember;var ot=$('#orgTrainBtn');if(ot)ot.onclick=trainOrganization;$('#orgFundBtn').onclick=fundOrganization;var os=$('#orgSupplyBtn');if(os)os.onclick=buyOrganizationSupplies;var orp=$('#orgRepairBtn');if(orp)orp.onclick=repairOrganizationShip;var ou=$('#orgUpgradeBtn');if(ou)ou.onclick=upgradeOrganizationShip;
  $$('[data-org-role]').forEach(function(b){b.onclick=function(){assignOrganizationRole(b.dataset.orgRole)}});$$('[data-org-firstmate]').forEach(function(b){b.onclick=function(){appointPirateFirstMate(b.dataset.orgFirstmate)}});$$('[data-org-dismiss]').forEach(function(b){b.onclick=function(){dismissOrganizationMember(b.dataset.orgDismiss)}})
 }
 var nw=netWorth(),h=HOUSING[p.life.housingLevel||0]||HOUSING[0],assets=p.life.assets||{};
 $('#netWorthBadge').textContent=nw.toLocaleString('fr-FR')+' B';
 $('#economySummary').innerHTML='<div><span>Liquidités</span><strong>'+Math.round(p.money).toLocaleString('fr-FR')+' B</strong></div><div><span>Dette</span><strong class="'+((p.life.debt||0)>0?'debt':'')+'">'+Math.round(p.life.debt||0).toLocaleString('fr-FR')+' B</strong></div><div><span>Patrimoine net</span><strong class="'+(nw>=1000000?'wealth':'')+'">'+nw.toLocaleString('fr-FR')+' B</strong></div><div><span>Coût mensuel</span><strong>'+livingCostPerMonth().toLocaleString('fr-FR')+' B</strong></div><div><span>Revenu activité</span><strong>'+businessIncomePerMonth().toLocaleString('fr-FR')+' B/mois</strong></div>';
 $('#housingCard').innerHTML='<strong>'+e(h.name)+'</strong><p>Immobilier : '+Math.round(assets.property||0).toLocaleString('fr-FR')+' B • activité : '+Math.round(assets.business||0).toLocaleString('fr-FR')+' B • trésor : '+Math.round(assets.treasure||0).toLocaleString('fr-FR')+' B</p><div class="mastery-meter"><div style="width:'+((p.life.housingLevel||0)/(HOUSING.length-1)*100)+'%"></div></div>';
 var nextHousing=HOUSING[(p.life.housingLevel||0)+1];$('#economyActions').innerHTML=(nextHousing?'<button id="upgradeHousingBtn" class="action-card"><strong>Améliorer le logement</strong><small>'+nextHousing.name+' • '+nextHousing.buy.toLocaleString('fr-FR')+' B</small></button>':'')+'<button id="investBusinessBtn" class="action-card"><strong>Investir</strong><small>50 000 B → activité productive.</small></button>';
 var uh=$('#upgradeHousingBtn');if(uh)uh.onclick=upgradeHousing;var ib=$('#investBusinessBtn');if(ib)ib.onclick=investBusiness;renderCargo();
 var unlocked=game.achievements&&game.achievements.unlocked?game.achievements.unlocked:{};$('#achievementBadge').textContent=Object.keys(unlocked).length+'/'+ACHIEVEMENTS.length;
 $('#achievementList').innerHTML=ACHIEVEMENTS.map(function(a){var u=unlocked[a.id];return '<div class="achievement-card '+(u?'unlocked':'locked')+'"><strong>'+(u?'✓ ':'○ ')+e(a.name)+'</strong><span>'+e(a.desc)+(u?' • '+e(u.age||''):'')+'</span></div>'}).join('');
 $('#equipmentList').innerHTML=['Tenue de voyage',p.style,p.fruit||'Aucun Fruit'].map(function(x){return '<span class="chip">'+e(x)+'</span>'}).join('');$('#storageStatus').textContent='Autosave local'
 }
}
function specialReqText(t){var q=t.requires||{},a=[];if(q.faction)a.push(q.faction);if(q.race)a.push(q.race);if(q.style)a.push(q.style);if(q.skill)a.push(q.skill+' '+q.skillValue);if(q.stat)a.push(q.stat+' '+q.statValue);return a.join(' • ')}
function renderActivityOptions(){
 var p=game.player;normalizeActivityFocus(p,game);var acts=focusOptions(),recommended=recommendedFocus(),stored=p.focus||'Auto',resolved=currentFocus();
 $('#activityOptions').innerHTML=acts.map(function(a){var keys=a==='Auto'?activityGrowthKeys(recommended):activityGrowthKeys(a),detail=a==='Auto'?'Priorité actuelle : '+recommended:a==='Pouvoirs'?'Haki • Fruit • Volonté':keys.join(' • ');return '<button class="action-card '+(stored===a?'active ':'')+(a!=='Auto'&&recommended===a?'recommended':'')+'" data-act="'+e(a)+'"><strong>'+e(a)+(a==='Auto'?' · '+e(resolved):recommended===a?' · recommandé':'')+'</strong><small>'+e(activityFocusText(a))+'<br>'+e(detail)+'</small></button>'}).join('');
 $$('[data-act]').forEach(function(b){b.onclick=function(){p.focus=b.dataset.act;save();renderAb()}})
}
function activityFocusText(a){if(SIMPLE_FOCUS[a])return SIMPLE_FOCUS[a].desc;if(a==='Grandir')return'Développement naturel pendant la petite enfance.';if(a==='Explorer')return'Exploration locale et progression de Navigation.';var profile=TRAINING_PROFILES[a];return profile?profile.desc:'Le moteur adapte automatiquement la progression.'}

function progressionBar(o){
 var p=game.player;return Object.keys(o).map(function(k){var v=o[k],cap=p.caps[k]||100,pct=cl(v/Math.max(1,cap)*100,0,100),status=currentCapStatus(k);return '<div class="stat-row progression-stat"><span>'+e(k)+'</span><div><div class="stat-bar"><div class="stat-fill" style="width:'+pct+'%"></div></div><small>'+e(status)+'</small></div><span class="stat-value">'+Math.round(v)+'/'+Math.round(cap)+'</span></div>'}).join('')
}
function renderProgressionOverview(){
 var p=game.player,pr=migrateProgression(game,p),d=progressionDelta(),gains=Object.entries(pr.gains||{}).sort(function(a,b){return b[1]-a[1]}).slice(0,3),atCap=ST.concat(SK).filter(function(k){var st=currentCapStatus(k);return st==='Plafond actuel'||st==='Maximum absolu'}),recent=pr.breakthroughs.length?pr.breakthroughs[pr.breakthroughs.length-1]:null,trend=d.power>1.5?'Forte hausse':d.power>.35?'En hausse':d.power<-.2?'En baisse':'Stable';
 $('#progressionTrendBadge').textContent=trend;$('#progressionSummary').innerHTML='<div><span>Puissance</span><strong>'+Math.round(power())+'</strong></div><div><span>Rang</span><strong>'+e(powerRank())+'</strong></div><div><span>Variation récente</span><strong>'+(d.power>=0?'+':'')+d.power.toFixed(1)+'</strong></div><div><span>Plafonds atteints</span><strong>'+atCap.length+'</strong></div>';
 var identity=combatIdentityTraits(),standing=worldPowerStanding(),sig=pr.combatIdentity&&pr.combatIdentity.signatureTechnique,apexScore=apexProgressScore(),apexLabel=apexProgressLabel();$('#progressionFocus').innerHTML='<strong>Progression dominante</strong><p>'+(gains.length?gains.map(function(x){return e(x[0])+' +'+x[1].toFixed(1)}).join(' • '):'Commence à avancer dans le temps pour établir une tendance.')+'</p><small>Échelle connue : '+e(standing.tier)+' • rang '+standing.rank+'/'+standing.total+'</small><small>Potentiel ultime : '+e(apexLabel)+' • '+Math.round(apexScore)+'/100'+(pr.apex&&pr.apex.breakthroughs?' • '+pr.apex.breakthroughs+' percée'+(pr.apex.breakthroughs>1?'s':'')+' Apex':'')+'</small>'+(sig?'<small>Technique signature : '+e(sig.name)+' • maîtrise '+Math.round(sig.mastery||0)+'</small>':'')+(identity.length?'<small>Signature : '+identity.map(function(x){return e(x.label)}).join(' • ')+'</small>':(recent?'<small>Dernière percée : '+e(recent.key)+' '+Math.round(recent.from)+' → '+Math.round(recent.to)+' • '+e(recent.context)+'</small>':'<small>Les plafonds extraordinaires restent cachés. Mentorat, carrière d’exception et exploits peuvent repousser une limite jusqu’à 100.</small>'))
}
function renderAbProgress(){renderProgressionOverview();renderActivityOptions()}
function renderAbPowers(){
 var p=game.player,fm=p.fruit?fruitMeta(p.fruit):p.heldFruit?fruitMeta(p.heldFruit):null;
 $('#hakiList').innerHTML=Object.keys(p.haki).map(function(k){return '<div class="ability-row"><strong>'+e(k)+'</strong><span>'+(p.haki[k]?'Niveau '+Math.round(p.haki[k]):'Non éveillé')+'</span></div>'}).join('');
 $('#fruitCard').innerHTML=p.fruit?'<strong>'+e(p.fruit)+'</strong><small>'+e(fm.type)+' • rareté '+fm.rarity+'/100</small><div class="mastery-meter"><div style="width:'+p.fruitMastery+'%"></div></div><span>Maîtrise '+Math.round(p.fruitMastery)+'%</span>':p.heldFruit?'<strong>'+e(p.heldFruit)+'</strong><small>'+e(fm.type)+' • rareté '+fm.rarity+'/100</small><p>Fruit conservé, non consommé.</p>':'Aucun Fruit consommé.';
 $('#hakiApplications').innerHTML=Object.keys(p.hakiApplications).map(function(k){var a=p.hakiApplications[k];return '<div class="haki-app"><strong>'+e(k)+'</strong><small>'+(a.length?e(a.join(' • ')):'Aucune application connue')+'</small></div>'}).join('');
 $('#fruitMasteryCard').innerHTML=p.fruit?'<strong>'+e(p.fruit)+'</strong><p>'+e(fm.type)+' • rareté '+fm.rarity+'/100</p><div class="mastery-meter"><div style="width:'+p.fruitMastery+'%"></div></div><p>'+Math.round(p.fruitMastery)+'% de maîtrise'+(p.fruitAwakened?' • ÉVEIL':'')+'.</p>':p.heldFruit?'<strong>'+e(p.heldFruit)+'</strong><p>'+e(fm.type)+' • tu le conserves sans l’avoir mangé.</p><button id="eatHeldFruit" class="primary-btn small">Le consommer</button>':'<strong>Aucun pouvoir</strong><p>Les pouvoirs apparaissent lorsque le monde ou ton potentiel les rend pertinents.</p>';
 var eat=$('#eatHeldFruit');if(eat)eat.onclick=function(){var fr=p.heldFruit;p.heldFruit=null;p.fruit=fr;p.fruitMastery=1;game.world.fruitRegistry[fr]={status:'consumed',holder:p.name};if(game.codex.fruits.indexOf(fr)<0)game.codex.fruits.push(fr);tl('Fruit du démon','Tu décides finalement de consommer le '+fr+'.','major');save();renderAbPowers()}
}
function renderAbDetails(){
 var p=game.player;$('#powerEstimate').textContent='Puissance ~'+Math.round(power())+' • '+powerRank();$('#statsList').innerHTML=progressionBar(p.stats);$('#skillsList').innerHTML=progressionBar(p.skills);
 var prof=TECH[p.style]||TECH['Équilibré'],special=SPECIAL_TECHNIQUES.filter(function(t){var q=t.requires||{},known=p.techniques.indexOf(t.id)>=0;return known||(!q.race||q.race===p.race)&&(!q.style||q.style===p.style)&&(!q.faction||q.faction===p.faction)});$('#techniqueCount').textContent=(p.techniques||[]).length+' maîtrisées';
 var baseCards=prof.map(function(t){var ok=p.techniques.indexOf(t.id)>=0,m=p.techniqueMastery[t.id]||0;return '<div class="technique-card '+(ok?'':'locked')+'"><strong>'+e(t.name)+'</strong><span>'+(ok?'Maîtrise '+Math.round(m)+'%':'Requiert '+e(t.skill)+' '+t.req)+'</span><small>Bonus actuel +'+techniqueEffectiveBonus(t.id).toFixed(1)+' • max +'+t.bonus+'</small></div>'}).join('');
 var specialCards=special.map(function(t){var ok=p.techniques.indexOf(t.id)>=0,m=p.techniqueMastery[t.id]||0;return '<div class="technique-card '+(ok?'':'locked')+'"><strong>'+e(t.name)+' <em>'+e(t.group||'Spécial')+'</em></strong><span>'+(ok?'Maîtrise '+Math.round(m)+'%':'Requiert '+e(specialReqText(t)))+'</span><small>Technique spéciale • bonus actuel +'+techniqueEffectiveBonus(t.id).toFixed(1)+' • max +'+t.bonus+'</small></div>'}).join('');
 $('#techniqueList').innerHTML=baseCards+specialCards+(p.fruit&&p.fruitMastery>=20?'<div class="technique-card"><strong>Application du '+e(p.fruit)+'</strong><span>Maîtrise '+Math.round(p.fruitMastery)+'%</span></div>':'');
 $('#combatStyleCard').innerHTML='<strong>'+e(p.style)+'</strong><p>Maîtrise '+Math.round(styleMastery())+' • Combat '+Math.round(p.skills.Combat)+' • Sabre '+Math.round(p.skills.Sabre)+' • Tir '+Math.round(p.skills.Tir)+'</p><span class="power-rank">'+powerRank()+'</span>';$('#combatActions').innerHTML='<button id="challengeBtn" class="action-card"><strong>Défi local</strong><small>Affronter un adversaire cohérent avec la zone.</small></button><button id="martialTrainBtn" class="action-card"><strong>Focus Combat</strong><small>Forcer temporairement une orientation martiale.</small></button>';$('#challengeBtn').onclick=challengeFight;$('#martialTrainBtn').onclick=function(){p.focus='Combat';save();renderAbDetails();toast('Focus : Combat')};
 if(game.lastCombat){$('#combatReportSection').classList.remove('hidden');var c=game.lastCombat,o=$('#combatOutcome');o.textContent=c.outcome;o.className='badge '+(c.outcome.indexOf('Victoire')>=0?'outcome-win':'outcome-loss');$('#combatReport').innerHTML='<div><span>Puissance</span><strong>'+c.playerPower+' vs '+c.opponentPower+'</strong></div><div><span>Styles</span><strong>'+e(c.playerStyle)+' vs '+e(c.opponentStyle)+'</strong></div><div><span>Terrain</span><strong>'+e(c.terrain)+'</strong></div><div><span>Chance estimée</span><strong>'+c.chance+'%</strong></div>'+(c.signature?'<div class="combat-log"><strong>★ Moment signature</strong> '+(c.upset?'Exploit improbable renversé en ta faveur.':'Affrontement majeur de cette carrière.')+'</div>':'')+(c.phases&&c.phases.length?c.phases.map(function(x){return'<div class="combat-log"><strong>'+e(x.label)+'</strong> '+e(x.text)+'</div>'}).join(''):'')+'<div class="combat-log">'+e(c.log)+'</div>'}else $('#combatReportSection').classList.add('hidden')
}
function renderAb(){var group=sectionState.abilities||'progress';if(group==='powers')renderAbPowers();else if(group==='details')renderAbDetails();else renderAbProgress()}
function relationPriority(r){
 var p=game.player,score=(r.id===p.life.partnerId?500:0)+(r.role==='mentor'||r.role==='rival'?220:0)+(r.canonical?160:0)+(npcNearby(r)?90:0)+relationPower(r);return score
}
function relationActionDecision(id){
 var p=game.player,r=relationById(id);if(!r||r.status!=='active')return;var near=npcNearby(r),partner=partnerRelation(),isPartner=r.id===p.life.partnerId,ch=[];
 if(near)ch.push(['Passer du temps','Renforcer affection et confiance.',function(){spendTime(id)}]);
 if(near&&!partner&&p.ageMonths>=216&&r.npcAgeMonths>=216&&r.attraction>=25&&!r.canonical)ch.push(['Approche romantique','Tenter de faire évoluer votre relation.',function(){pursueRomance(id)}]);
 if(near&&r.role!=='mentor'&&relationPower(r)>power()+8)ch.push(['Demander un mentorat','Solliciter son expérience.',function(){askMentorship(id)}]);
 if(near&&r.role!=='rival'&&r.role!=='mentor'&&!isPartner)ch.push(['Déclarer une rivalité','Transformer ce lien en rivalité assumée.',function(){declareRivalry(id)}]);
 if(near&&r.trust>=48)ch.push(['Demander un service','Mobiliser la confiance accumulée.',function(){askRelationFavor(id)}]);
 if(near)ch.push(['Aider','Renforcer le lien en rendant service.',function(){helpRelation(id)}]);
 if(near&&r.npcAgeMonths>=180&&!r.canonical&&!r.joinedOrganization&&p.organization&&p.organization.authority==='leader')ch.push(['Recruter','Proposer de rejoindre ton organisation.',function(){recruitKnownRelation(id)}]);
 if(r.role==='mentor'&&near)ch.push(['S’entraîner','Profiter du mentorat.',function(){trainWithMentor(id)}]);
 if(r.role==='rival'&&near&&p.ageMonths>=144&&r.npcAgeMonths>=144){ch.push(['Duel','Affronter ton rival.',function(){challengeRival(id)}]);if(((r.rivalWins||0)+(r.rivalLosses||0))>=3)ch.push(['Apaiser','Essayer de faire évoluer la rivalité.',function(){reconcileRival(id)}])}
 if(!ch.length)ch.push(['Fermer','Aucune interaction disponible actuellement.',function(){}]);else ch.push(['Fermer','Ne rien faire pour le moment.',function(){}]);
 decision(r.name,e(r.role)+' • '+e(r.faction)+' • '+(near?'dans ta région':'éloigné')+' • confiance '+Math.round(r.trust)+' • respect '+Math.round(r.respect),ch)
}
function latestDynastyLegacy(){var a=game.dynasty&&game.dynasty.ancestors||[];return a.length?a[a.length-1]:null}
function renderRelClose(){
 var p=game.player,l=p.life,partner=partnerRelation(),partnerNear=!!(partner&&npcNearby(partner)),allKids=p.children||[],kids=heirCandidates(),inactiveKids=allKids.filter(function(c){return c.status!=='active'}),active=game.relations.filter(function(r){return r.status==='active'}),ancestor=latestDynastyLegacy();
 $('#socialStatusBadge').textContent=l.relationshipStatus;$('#socialSummary').innerHTML='<div><span>Relations</span><strong>'+active.length+'</strong></div><div><span>Statut</span><strong>'+e(l.relationshipStatus)+'</strong></div><div><span>Enfants</span><strong>'+kids.length+'</strong></div><div><span>Génération</span><strong>'+game.dynasty.generation+'</strong></div>';
 var bereaved=!partner&&l.relationshipStatus==='En deuil';$('#romanceBadge').textContent=partner?Math.round((partner.affection+partner.trust+partner.loyalty)/3)+'%':bereaved?'En deuil':'Célibataire';
 if(partner){$('#romanceCard').innerHTML='<strong>'+e(partner.name)+' • '+e(l.relationshipStatus)+'</strong><p class="romance-state">Affection '+Math.round(partner.affection)+' • confiance '+Math.round(partner.trust)+' • loyauté '+Math.round(partner.loyalty)+(partnerNear?'.':' • à distance.')+'</p>';$('#romanceActions').innerHTML=(partnerNear?'<button id="partnerTimeBtn" class="action-card"><strong>Passer du temps ensemble</strong><small>Renforcer le lien.</small></button>':'')+(l.relationshipStatus==='En couple'&&partnerNear?'<button id="marryBtn" class="action-card"><strong>Se marier</strong><small>Relation solide depuis au moins un an.</small></button>':'')+'<button id="breakupBtn" class="action-card career-action-warning"><strong>Se séparer</strong></button>';var pt=$('#partnerTimeBtn');if(pt)pt.onclick=function(){spendTime(partner.id)};var mb=$('#marryBtn');if(mb)mb.onclick=marryPartner;$('#breakupBtn').onclick=breakup}
 else{$('#romanceCard').innerHTML=bereaved?'<strong>En deuil</strong><p class="romance-state">Une relation importante s’est achevée, mais elle reste dans ton histoire.</p>':'<strong>Célibataire</strong><p class="romance-state">Les relations importantes émergent naturellement.</p>';$('#romanceActions').innerHTML=''}
 $('#familyBadge').textContent=kids.length+' enfant'+(kids.length>1?'s':'')+' actif'+(kids.length>1?'s':'');var legacyCard='';if(ancestor){var lg=ancestor.legacy||{},best=(lg.chapters&&lg.chapters[0])||(lg.activeChapters&&lg.activeChapters[0])||null,role=lg.worldRole||ancestor.rank||ancestor.career||'Vie précédente';legacyCard='<div class="family-card heir-highlight"><strong>Héritage de '+e(ancestor.name)+'</strong><span>Génération '+e(String(ancestor.generation||Math.max(1,game.dynasty.generation-1)))+' • '+e(role)+'</span><small>'+e(lg.chronicle||(best?'Chapitre transmis : '+best.title:'Une génération précédente a laissé sa trace dans le monde.'))+'</small></div>'}var childCards=kids.length?kids.slice(0,4).map(function(c){normalizeChildProfile(c);var years=Math.floor(c.ageMonths/12),identity=years>=15?c.preferredStyle:years>=12?c.vocation:years>=6?c.temperament:'Enfance';return '<div class="family-card"><strong>'+e(c.name)+'</strong><span>'+years+' ans • candidat à la succession • '+e(identity)+'</span><small>Lien '+Math.round(c.bond==null?60:c.bond)+'/100'+(years>=12?' • développement '+Math.round(c.development||0)+'/100':'')+'</small></div>'}).join(''):'<p class="helper-text">Aucun enfant actif pour poursuivre la dynastie.</p>';if(kids.length>4)childCards+='<p class="helper-text">+'+(kids.length-4)+' autre'+(kids.length-4>1?'s':'')+' candidat'+(kids.length-4>1?'s':'')+' actif'+(kids.length-4>1?'s':'')+'.</p>';if(inactiveKids.length)childCards+='<p class="helper-text">'+inactiveKids.length+' enfant'+(inactiveKids.length>1?'s':'')+' hors succession actuelle.</p>';$('#familyList').innerHTML=legacyCard+childCards;
 $('#familyActions').innerHTML=partnerNear&&p.ageMonths>=216?'<button id="welcomeChildBtn" class="action-card"><strong>Accueillir un enfant</strong></button>':'';var wc=$('#welcomeChildBtn');if(wc)wc.onclick=welcomeChild
}
function renderRelNetwork(){
 var p=game.player,l=p.life,active=game.relations.filter(function(r){return r.status==='active'}),rivals=active.filter(function(r){return r.role==='rival'}),mentors=active.filter(function(r){return r.role==='mentor'}),canonBonds=active.filter(function(r){return r.canonical}),nearby=active.filter(function(r){return npcNearby(r)});
 $('#bondDynamicsBadge').textContent=(rivals.length+mentors.length)+' lien'+(rivals.length+mentors.length>1?'s':'');$('#bondDynamicsSummary').innerHTML='<div><span>Mentors</span><strong>'+mentors.length+'</strong></div><div><span>Rivaux</span><strong>'+rivals.length+'</strong></div><div><span>Canoniques</span><strong>'+canonBonds.length+'</strong></div><div><span>Dans ta région</span><strong>'+nearby.length+'</strong></div>';
 $('#bondDynamicsList').innerHTML=mentors.concat(rivals).slice(0,4).map(function(r){return '<div class="npc-dynamic-card '+(r.role==='rival'?'rival':'mentor')+'"><div class="npc-dynamic-head"><strong>'+e(r.name)+'</strong><span>'+e(r.role)+'</span></div><div class="npc-dynamic-meta">'+e(npcCareerRank(r))+' • puissance '+Math.round(relationPower(r))+' • '+e(npcRegion(r))+'</div><div class="npc-actions"><button data-rel-open="'+e(r.id)+'">Interagir</button></div></div>'}).join('')||'<p class="helper-text">Aucune rivalité ou relation de mentorat importante.</p>';
 $('#npcNetworkBadge').textContent=nearby.length+' proche'+(nearby.length>1?'s':'');$('#npcNetworkSummary').innerHTML='<div><span>Relations actives</span><strong>'+active.length+'</strong></div><div><span>Canoniques</span><strong>'+canonBonds.length+'</strong></div><div><span>Recrutées</span><strong>'+active.filter(function(r){return r.joinedOrganization}).length+'</strong></div><div><span>Proches</span><strong>'+nearby.length+'</strong></div>';
 $('#npcOpportunities').innerHTML='<button id="seekMentorBtn" class="action-card"><strong>Chercher un mentor</strong><small>Identifier une personne plus expérimentée dans ta région.</small></button>';$('#seekMentorBtn').onclick=seekMentor;
 var sorted=active.slice().sort(function(a,b){return relationPriority(b)-relationPriority(a)}),shown=relationNetworkExpanded?sorted:sorted.slice(0,6);$('#relationCountBadge').textContent=active.length+' actives';
 $('#relationsList').innerHTML=shown.length?shown.map(function(r){var isPartner=r.id===l.partnerId,pow=Math.round(relationPower(r)),near=npcNearby(r),combat=normalizeNpcCombatProfile(game,r),haki=Math.max(combat.haki.Observation||0,combat.haki.Armement||0,combat.haki.Conquérant||0),tags=(r.canonical?'<span class="npc-tag canon">Canon</span>':'')+(r.role==='mentor'?'<span class="npc-tag mentor">Mentor</span>':'')+(r.role==='rival'?'<span class="npc-tag rival">Rival</span>':'');return '<div class="relation-card"><div class="relation-avatar">'+e(r.name[0])+'</div><div class="relation-copy"><strong>'+e(r.name)+(isPartner?' ♥':'')+'</strong><span>'+e(r.role)+' • '+e(r.faction)+(r.relationshipPhase?' • '+e(r.relationshipPhase):'')+'</span>'+tags+'<div class="npc-state-line">Puissance '+pow+' • '+e(combat.style)+(haki>0?' • Haki '+Math.round(haki):'')+' • '+(near?'dans ta région':'éloigné')+'</div><small>'+e(combatPowerTier(pow))+' • '+e(favorLabel(r))+' • Projet : '+e(r.npcIntent||r.npcAmbition||'Suivre sa route')+'</small><div class="relation-metrics"><span>Aff '+Math.round(r.affection)+'</span><span>Conf '+Math.round(r.trust)+'</span><span>Resp '+Math.round(r.respect)+'</span></div><div class="relation-actions-mini"><button data-rel-open="'+e(r.id)+'">Interagir</button></div></div></div>'}).join(''):'<p class="helper-text">Aucune relation importante.</p>';
 if(!relationNetworkExpanded&&sorted.length>shown.length)$('#relationsList').innerHTML+='<button id="expandRelationsBtn" class="text-btn">Voir tout le réseau ('+sorted.length+')</button>';
 $$('[data-rel-open]').forEach(function(b){b.onclick=function(){relationActionDecision(b.dataset.relOpen)}});var ex=$('#expandRelationsBtn');if(ex)ex.onclick=function(){relationNetworkExpanded=true;renderRelNetwork()}
}
function renderRel(){if((sectionState.relations||'close')==='network')renderRelNetwork();else renderRelClose()}
function diplomacyLabel(v){return v>=60?'Alliance':v>=25?'Coopération':v>-25?'Neutre':v>-60?'Tension':'Hostilité'}
function renderWorldExplore(){
 var p=game.player,w=game.world,q=inf(),terr=w.territories[p.island]||{controller:'Inconnu',influence:0,stability:0,contested:false};
 $('#worldHeadline').textContent='Grande Ère de la Piraterie';$('#worldSubhead').textContent='Année '+w.year+', mois '+(Math.floor(w.month)+1)+'. Le monde continue de vivre sous le capot ; ici tu ne vois que ce qui sert ton prochain déplacement.';
 $('#worldMeta').innerHTML='<span>Divergence '+Math.round(w.divergence)+'%</span><span>Tension '+Math.round(w.globalTension)+'%</span><span>'+p.visited.length+' lieux visités</span>';
 $('#placeName').textContent=p.travel?'En mer → '+p.travel.destination:p.island;$('#placeDanger').textContent='Danger '+q.danger;
 var placeProfile=islandProfile(p.island);$('#placeDescription').textContent=p.travel?'Temps restant : '+Math.max(0,p.travel.remaining).toFixed(1)+' mois vers '+p.travel.destination+'.':'Région : '+p.region+' • contrôle : '+terr.controller+' • stabilité '+Math.round(terr.stability)+'%. '+placeProfile.identity;
 $('#placeTags').innerHTML='<span class="chip">'+e(p.region)+'</span><span class="chip">'+e(terr.controller)+'</span>'+placeProfile.tags.map(function(tg){return'<span class="chip">'+e(tg)+'</span>'}).join('')+(terr.contested?'<span class="chip">Contesté</span>':'');
 $('#travelStatus').textContent=p.travel?'Traversée':p.region;
 $('#travelOptions').innerHTML=p.travel?'<div class="career-card"><p>Utilise AVANCER pour poursuivre jusqu’au prochain incident ou à l’arrivée.</p></div>':q.routes.map(function(d){var z=req(d);return '<button class="action-card '+(z[0]?'':'locked')+'" data-d="'+e(d)+'"><strong>'+e(d)+'</strong><small>'+e(inf(d).region)+' • danger '+inf(d).danger+(z[0]?'':' • '+z[1])+'</small></button>'}).join('');
 $$('[data-d]').forEach(function(b){b.onclick=function(){go(b.dataset.d)}});renderExploration();renderJourney();
 $('#regionMap').innerHTML=REG.map(function(r){var v=p.visited.filter(function(x){return inf(x).region===r}).length,t=Object.keys(PL).filter(function(x){return inf(x).region===r}).length,ctrls={};Object.keys(w.territories).filter(function(n){return infStatic(n).region===r}).forEach(function(n){var c=w.territories[n].controller;ctrls[c]=(ctrls[c]||0)+1});var lead=Object.keys(ctrls).sort(function(a,b){return ctrls[b]-ctrls[a]})[0]||'Inconnu';return '<div class="region-card '+(r===p.region?'active':'')+'"><strong>'+e(r)+'</strong><span>'+v+'/'+t+' lieux visités</span><small>Influence dominante : '+e(lead)+'</small></div>'}).join('')
}
function renderWorldState(){
 var p=game.player,w=game.world,rp=w.pressures[p.region],terr=w.territories[p.island]||{controller:'Inconnu',influence:0,stability:0,contested:false};renderMarket();
 var activeCrews=w.crews.filter(function(c){return c.status==='active'}),activeActors=w.actors.filter(function(a){return a.status==='active'||a.status==='wounded'}),contested=Object.keys(w.territories).filter(function(n){return w.territories[n].contested}).length;
 var ws=w.worldState||{},localSagas=(ws.worldSagas||[]).filter(function(x){return x.status==='active'&&x.region===p.region}).sort(function(a,b){return b.pressure-a.pressure}),topSaga=localSagas[0];$('#worldPulseBadge').textContent=w.globalTension>=70?'Tension critique':w.globalTension>=45?'Tension élevée':w.globalTension>=25?'Instable':'Calme';$('#worldPulse').innerHTML='<div><span>Équipages actifs</span><strong>'+activeCrews.length+'</strong></div><div><span>Conflits actifs</span><strong>'+w.conflicts.length+'</strong></div><div><span>Territoires contestés</span><strong>'+contested+'</strong></div><div><span>Acteurs actifs</span><strong>'+activeActors.length+'</strong></div>'+(topSaga?'<div><span>Saga régionale</span><strong>'+e(topSaga.stage)+'</strong><small>'+e(topSaga.title)+' • pression '+Math.round(topSaga.pressure)+'</small></div>':'');
 var ac=w.actors.filter(function(a){return a.region===p.region&&(a.status==='active'||a.status==='wounded')}).sort(function(a,b){return b.importance-a.importance}).slice(0,5);$('#localActors').innerHTML=ac.length?ac.map(function(a){var rel=relationForActor(a.name),cp=actorCombatProxy(a);return '<div class="actor-row '+(a.status==='wounded'?'inactive':'')+'"><strong>'+e(a.name)+(rel?' • '+e(rel.role):'')+'</strong><div><span>'+e(a.faction)+' • puissance ~'+Math.round(actorPower(a))+' • '+e(cp.npcCombat.style)+'</span><small>'+e(combatPowerTier(actorPower(a)))+' • Intention : '+e(a.intention||'Observation')+'</small>'+(a.status==='active'?'<div class="relation-actions-mini"><button data-actor-bond="'+e(a.name)+'">'+(rel?'Interagir':'Approcher')+'</button></div>':'')+'</div></div>'}).join(''):'<p class="helper-text">Aucun acteur majeur identifié dans cette région.</p>';$$('[data-actor-bond]').forEach(function(b){b.onclick=function(){approachCanonicalActor(b.dataset.actorBond)}});
 var known=p.visited.slice().sort(function(a,b){return (a===p.island?-1:0)-(b===p.island?-1:0)}).slice(0,6);$('#territoryBadge').textContent=terr.controller;$('#territoryList').innerHTML=known.map(function(n){var t=w.territories[n]||{controller:'Inconnu',influence:0,stability:0,contested:false};return '<div class="territory-row '+(t.contested?'contested':'')+'"><div class="territory-head"><strong>'+e(n)+'</strong><span>'+e(t.controller)+'</span></div><div class="territory-meta">'+e(infStatic(n).region)+' • influence '+Math.round(t.influence)+' • stabilité '+Math.round(t.stability)+'</div><div class="territory-meter"><div style="width:'+cl(t.influence,0,100)+'%"></div></div></div>'}).join('')||'<p class="helper-text">Aucun territoire connu.</p>';renderDomains();
 var conflicts=w.conflicts.slice().sort(function(a,b){return (b.region===p.region?1:0)-(a.region===p.region?1:0)||b.intensity-a.intensity}).slice(0,4);$('#conflictBadge').textContent=w.conflicts.length+' actif'+(w.conflicts.length>1?'s':'');$('#conflictList').innerHTML=conflicts.length?conflicts.map(function(c){return '<div class="conflict-card '+(c.intensity>=65?'hot':'')+'"><div class="conflict-head"><strong>'+e(c.location)+'</strong><span>Intensité '+Math.round(c.intensity)+'</span></div><div class="conflict-meta">'+e(c.attacker)+' contre '+e(c.defender)+' • '+e(c.region)+'</div><div class="conflict-meter"><div style="width:'+cl(c.intensity,0,100)+'%"></div></div></div>'}).join(''):'<p class="helper-text">Aucun conflit majeur actuellement enregistré.</p>';renderStrategy();
 var crews=activeCrews.slice().sort(function(a,b){var ar=a.region===p.region?1:0,br=b.region===p.region?1:0;return br-ar||b.power-a.power}).slice(0,5);$('#crewWorldBadge').textContent=activeCrews.length+' actifs';$('#autonomousCrews').innerHTML=crews.length?crews.map(function(c){normalizeWorldCrew(c);var lead=worldCrewLeadership(c);return '<div class="world-crew-card"><div class="crew-head"><strong>'+e(c.name)+'</strong><span class="crew-status">'+e(c.faction)+'</span></div><div class="crew-meta">'+e(c.region)+' • '+c.members+' membres • puissance '+Math.round(c.power)+' • cohésion '+Math.round(c.cohesion)+'</div><small>'+(lead?'Leader : '+e(lead.name)+' • ':'')+'génération '+(c.generation||1)+(c.parentCrewId?' • issu d’une scission':'')+(c.playerControlled?' • ton équipage':'')+'</small><small>Intention : '+e(c.intention||c.lastIntentOutcome||'Se réorganiser')+'</small></div>'}).join(''):'<p class="helper-text">Aucune force émergente active.</p>';
 var dip=Object.keys(w.diplomacy).map(function(k){return{k:k,v:w.diplomacy[k]}}).sort(function(a,b){return Math.abs(b.v)-Math.abs(a.v)}).slice(0,6);$('#diplomacyGrid').innerHTML=dip.map(function(x){var p2=x.k.split('|'),cls=x.v>24?'diplomacy-positive':x.v<-24?'diplomacy-negative':'diplomacy-neutral';return '<div class="diplomacy-card '+cls+'"><strong>'+e(p2[0])+' ↔ '+e(p2[1])+'</strong><span>'+diplomacyLabel(x.v)+' • '+Math.round(x.v)+'</span></div>'}).join('');
 $('#factionOverview').innerHTML=Object.keys(w.factions).sort(function(a,b){return w.factions[b]-w.factions[a]}).slice(0,5).map(function(n){return '<div class="faction-card"><strong>'+e(n)+'</strong><span>Influence '+Math.round(w.factions[n])+'</span><small>'+diplomacyLabel(diplomacy(p.faction,n))+' avec toi</small></div>'}).join('');$('#regionTitle').textContent=p.region;$('#pressureBars').innerHTML=bar(rp)
}
function renderWorldHistory(){
 var w=game.world;$('#worldNews').innerHTML=game.news.slice(0,8).map(function(n){var cls=n.type==='war'?' world-news-war':n.type==='major'?' world-news-major':'';return '<div class="news-item'+cls+'"><strong>'+e(n.title)+'</strong><span>'+e(n.desc)+'</span></div>'}).join('');
 var future=w.canon.filter(function(c){return c.status==='future'}).sort(function(a,b){return canonMonth(a)-canonMonth(b)}),forecast=future.slice(0,3),health=w.divergence<20?'Canon stable':w.divergence<50?'Canon sous tension':w.divergence<75?'Forte divergence':'Chronologie alternative';$('#canonHealthBadge').textContent=health;
 $('#canonForecast').innerHTML=forecast.length?forecast.map(function(c){return '<div class="canon-forecast-item"><span>Année '+c.year+', mois '+(c.month+1)+'</span><strong>'+e(c.title)+'</strong><small>'+e(c.location)+'</small></div>'}).join(''):'<p class="helper-text">Aucun événement canonique futur enregistré.</p>';
 $('#contentStats').innerHTML='<span>'+Object.keys(PL).length+' lieux</span><span>'+w.actors.length+' acteurs</span><span>'+w.fruits.length+' Fruits</span><span>'+w.canon.length+' événements</span>';
 $('#divergenceBadge').textContent='Divergence '+Math.round(w.divergence)+'%';$('#canonList').innerHTML=w.canon.slice().sort(function(a,b){return canonMonth(a)-canonMonth(b)}).slice(-8).map(function(c){return '<div class="canon-item canon-'+e(c.status)+'"><span class="status">'+e(c.status)+'</span><strong>'+e(c.title)+'</strong><span>Année '+c.year+', mois '+(c.month+1)+' • '+e(c.location)+'</span></div>'}).join('');
 renderCodexExploration();var co=[].concat(game.codex.people,game.codex.places,game.codex.factions,game.codex.fruits,game.codex.events||[],game.codex.techniques||[]).filter(function(v,i,a){return a.indexOf(v)===i}).slice(-24);$('#codexList').innerHTML=co.map(function(x){return '<span class="chip">'+e(x)+'</span>'}).join('')
}
function renderWorld(){var group=sectionState.world||'explore';if(group==='world')renderWorldState();else if(group==='history')renderWorldHistory();else renderWorldExplore()}
function render(){if(!game)return;showGame();var p=game.player;$('#ageLabel').textContent=age();$('#locationLabel').textContent=p.travel?'→ '+p.travel.destination:p.island;$('#moneyLabel').textContent=Math.floor(p.money).toLocaleString('fr-FR')+' B';$('#playerName').textContent=p.name;$('#avatarInitial').textContent=p.name.charAt(0).toUpperCase();$('#playerSubtitle').textContent=p.race+' • '+p.region+' • '+p.faction;$('#lifeStatus').textContent=p.situation;$('#repPill').textContent=rep();$('#situationTitle').textContent=p.situation;$('#activityValue').textContent=p.activity+(p.focus&&p.focus!==p.activity?' • '+p.focus:'');$('#factionValue').textContent=p.faction;$('#healthValue').textContent=Math.round(p.health)+'%';$('#energyValue').textContent=Math.round(p.energy)+'%';var d=$('#dangerBadge');d.textContent=p.danger;d.className='danger-badge '+(p.danger==='Élevé'?'high':p.danger==='Moyen'?'medium':'low');$('#conditionChips').innerHTML=p.conditions.length?p.conditions.map(function(c){return '<span class="chip">'+e(c.name)+'</span>'}).join(''):'<span class="chip">Aucune blessure</span>';renderAdvanceLoop();renderNarrativeDirector();var sw=awaitingStory();if(game.pending||sw){$('#attentionCard').classList.remove('hidden');$('#attentionTitle').textContent=game.pending?game.pending.title:sw.title;$('#attentionText').textContent=game.pending?game.pending.text:storyPrompt(sw)}else $('#attentionCard').classList.add('hidden');renderStories();renderPanel(activeTab);renderDevOutput()}
function deathModal(){var p=game.player,estate=estateValue(),partner=partnerRelation(),kids=heirCandidates(),ach=Object.keys(game.achievements.unlocked||{}).length,storyStats=migrateStoryEngine(game).stats,chronicle=lifeChronicle(p);$('#deathTitle').textContent=p.name+', '+age();$('#deathSummary').innerHTML='<div><span>Cause</span><strong>'+e(game.death.cause)+'</strong></div><div><span>Carrière</span><strong>'+e(p.career)+' • '+e(p.rank)+'</strong></div><div><span>Reconnaissance</span><strong>'+e(chronicle.headline)+' • '+chronicle.recognitionScore+'/100</strong></div><div><span>Victoires</span><strong>'+p.wins+'</strong></div><div><span>Lieux</span><strong>'+p.visited.length+'</strong></div><div><span>Histoires</span><strong>'+storyStats.resolved+' résolue'+(storyStats.resolved>1?'s':'')+'</strong></div><div><span>Patrimoine</span><strong>'+estate.toLocaleString('fr-FR')+' B</strong></div><div><span>Achievements</span><strong>'+ach+'/'+ACHIEVEMENTS.length+'</strong></div>';$('#legacyCard').innerHTML='<strong>'+e(chronicle.headline)+' • Génération '+game.dynasty.generation+'</strong><span>'+e(chronicle.summary)+'</span>'+(chronicle.chapters.length?'<small>'+chronicle.chapters.slice(0,3).map(function(x){return e(x.title)}).join(' • ')+'</small>':'');var hb=$('#continueHeirBtn'),hc=$('#heirChoices');hc.innerHTML='';hc.classList.add('hidden');if(kids.length===1){hb.classList.remove('hidden');hb.textContent='Continuer avec '+kids[0].name}else{hb.classList.add('hidden');if(kids.length>1){hc.classList.remove('hidden');hc.innerHTML='<p class="helper-text">Choisis la personne qui portera la prochaine génération.</p>'+kids.map(function(child){normalizeChildProfile(child);return'<button class="choice-btn" data-heir="'+e(child.id)+'"><strong>'+e(child.name)+'</strong><small>'+Math.floor(child.ageMonths/12)+' ans • '+e(child.vocation)+' • '+e(child.preferredStyle)+' • lien '+Math.round(child.bond==null?60:child.bond)+'/100</small></button>'}).join('');document.querySelectorAll('[data-heir]').forEach(function(b){b.onclick=function(){continueWithHeir(b.dataset.heir)}})}}$('#deathModal').classList.remove('hidden')}
function toast(m){var t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.add('hidden')},1600)}
function backup(m){backupMode=m;$('#backupModal').classList.remove('hidden');$('#backupTitle').textContent=m==='export'?'Exporter':'Importer';$('#backupText').value=m==='export'?btoa(unescape(encodeURIComponent(JSON.stringify(game)))):'';$('#backupPrimaryBtn').textContent=m==='export'?'Copier':'Importer'}
function bind(){
 $$('.mode-card').forEach(function(b){b.onclick=function(){mode=b.dataset.mode;$$('.mode-card').forEach(function(x){x.classList.toggle('selected',x===b)});$('#customFields').classList.toggle('hidden',mode!=='custom')}});
 $('#newLifeBtn').onclick=function(){make();$('#creationCard').classList.add('hidden');render()};$('#cancelCreate').onclick=function(){$('#creationCard').classList.add('hidden')};$('#advanceBtn').onclick=function(){if(game)advance()};$('#attentionBtn').onclick=showAttention;$('#homeBtn').onclick=showStart;
 $('#deathHomeBtn').onclick=function(){$('#deathModal').classList.add('hidden');showStart()};$('#continueHeirBtn').onclick=function(){continueWithHeir()};$('#deathNewBtn').onclick=function(){localStorage.removeItem(key());localStorage.removeItem(metaKey());$('#deathModal').classList.add('hidden');showStart();$('#creationCard').classList.remove('hidden')};
 $('#timelineFilter').onclick=function(){majorOnly=!majorOnly;timelineExpanded=false;renderTimeline()};$$('.nav-item').forEach(function(b){b.onclick=function(){activateTab(b.dataset.tab,true)}});
 $('#devToggle').onclick=function(){if(game){$('#developerPanel').classList.remove('hidden');renderDevOutput()}};$('#closeDev').onclick=function(){$('#developerPanel').classList.add('hidden')};$('#exportSaveBtn').onclick=function(){backup('export')};$('#importSaveBtn').onclick=function(){backup('import')};$('#backupCloseBtn').onclick=function(){$('#backupModal').classList.add('hidden')};
 $('#backupPrimaryBtn').onclick=function(){if(backupMode==='export'){if(navigator.clipboard)navigator.clipboard.writeText($('#backupText').value);toast('Sauvegarde copiée ou prête à copier.')}else try{game=migrate(JSON.parse(decodeURIComponent(escape(atob($('#backupText').value.trim())))));syncCanonicalFruits();save();$('#backupModal').classList.add('hidden');render()}catch(x){toast('Sauvegarde invalide.')}};
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')save()});window.addEventListener('pagehide',save)
}
function init(){bind();setupSectionNavigation();if(location.protocol!=='file:')$('#localFileWarning').classList.add('hidden');if(/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches&&location.protocol==='https:')$('#iosInstallCard').classList.remove('hidden');slots();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(function(){})}
init();
})();