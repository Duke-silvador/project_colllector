
'use strict';
const cv=document.getElementById('c'),WORLD_X=cv.getContext('2d'),
  hudCanvas=document.getElementById('ck-hud'),HUD_X=hudCanvas?.getContext('2d')||null;
let X=WORLD_X,CW=0,CH=0,DPR=1,gq=1,ui=1,br=1,mm={x:0,y:0,w:216};
const rs=()=>{const hudDpr=Math.min(window.devicePixelRatio||1,[1,1.25,1.5][gq]);DPR=hudDpr*perfRenderScale;CW=innerWidth/ui|0;CH=innerHeight/ui|0;cv.width=Math.round(CW*DPR);cv.height=Math.round(CH*DPR);cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';cv.style.filter=br===1?'none':'brightness('+br+')';
if(hudCanvas&&HUD_X){
 const sharp=!!perfSharpHud&&perfRenderScale<1;
 hudCanvas.style.display=sharp?'block':'none';
 if(sharp){hudCanvas.width=Math.round(CW*hudDpr);hudCanvas.height=Math.round(CH*hudDpr);hudCanvas.style.width=innerWidth+'px';hudCanvas.style.height=innerHeight+'px';hudCanvas.style.filter=cv.style.filter}
 else{hudCanvas.width=1;hudCanvas.height=1}
}
const m=Math.max(140,Math.min(300,CH*.45|0,CW*.3|0));mm={x:CW-m-14,y:CH-(m>>1)-14,w:m,h:m>>1}};let resizeTimer=0;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(rs,80)});rs();
/* ===== GAME STATE / MAP ===== */
/* ===== GENERATED MAP CONNECTIVITY AUDIT =====
   Terrain semantics: wt=0 land, wt=1 navigable water, wt=2 shallow ford.
   Buildings/resources are intentionally excluded: this audits the generated terrain
   before placement, not temporary gameplay obstructions. */
/* ===== GENERATED MAP CONNECTIVITY AUDIT =====
   Terrain semantics: wt=0 land, wt=1 navigable water, wt=2 shallow ford.
   Buildings/resources are intentionally excluded: this audits generated terrain
   before placement, not temporary gameplay obstructions. */

/* World construction is owned by js/mapgen.js. */
const w2s=(x,y)=>[(x-y)*TW/2-cam.x,(x+y)*TH/2-cam.y];
const s2w=(sx,sy)=>{const u=(sx+cam.x)/(TW/2),v=(sy+cam.y)/(TH/2);return[(u+v)/2,(v-u)/2]};
function clampCam(){const[x,y]=s2w(CW/2,CH/2),cx=cl(x,1,W-1),cy=cl(y,1,H-1);cam.x=(cx-cy)*TW/2-CW/2;cam.y=(cx+cy)*TH/2-CH/2}
const ctr=(x,y)=>{cam.x=(x-y)*TW/2-CW/2;cam.y=(x+y)*TH/2-CH/2;clampCam()};
function start(){if(canvasBenchmark)stopCanvasBenchmark(true);canvasBenchSummary=null;selectedXboxPicturePreset=-1;resetAdaptivePictureSampling();
if(perfRenderScale!==1||perfSharpHud){perfRenderScale=1;perfSharpHud=0;rs()}
perfTestMatch=0;lastAutoSaveAt=-60000;newGame();if(!cmp&&gameMode===1){for(let t=0;t<S.teamN;t++){S.res[t]={f:2000,w:2000,g:2000,s:2000};S.age[t]=3;grp(t,'knight',6);grp(t,'arc',8);grp(t,'ram',2)}}else if(!cmp&&gameMode===2){for(let t=0;t<S.teamN;t++){S.res[t]={f:500,w:500,g:500,s:500};grp(t,'vil',5)}}if(!cmp&&startArmy>0){for(let t=0;t<S.teamN;t++){if(startArmy===1)grp(t,'scout',2);else if(startArmy===2){grp(t,'mil',3);grp(t,'arc',2)}else if(startArmy===3){grp(t,'mil',4);grp(t,'arc',4);grp(t,'ram',1)}}}if(vm===3)for(let t=0;t<S.teamN;t++){const tc=S.bs.find(b=>b.t===t&&b.k==='tc'),p=spawnPos(tc);if(p)addU(t,'king',p[0],p[1])}mode='play';menu=place=null;fx=[];corp=[];rub=[];notes=[];idleI=0;queueWarm();PT.length=0;note('Left stick moves the cursor, A selects, hold RT for the command menu, D-pad quick-selects');note('You lead the '+CIV[S.civ[0]].n+(S.teamN>2?' against '+(S.teamN-1)+' rival kingdoms':' vs the '+CIV[S.civ[1]].n)+': '+CIV[S.civ[0]].d);if(vm===6)note('Sudden Death: protect your starting Town Centre; losing it eliminates your kingdom and extra Town Centres are disabled')}
const vis=e=>e.t===0||S.vs[(e.y|0)*W+(e.x|0)];
const CIV=[{n:'Franks',uu:'axe',d:'Knights +15 HP; Throwing Axemen',fx:t=>hpbF(t,'knight',15),ut:{k:'ut0',n:'Chivalry',cost:{f:300,g:200},t:50,age:2,fx:t=>atkbF(t,'knight',2)}},
{n:'Britons',uu:'lbow',d:'Archers +1 attack; Longbowmen',fx:t=>{atkbF(t,'arc',1);atkbF(t,'xbow',1);atkbF(t,'hcan',1)},ut:{k:'ut1',n:'Yeomen',cost:{f:250,w:200},t:50,age:2,fx:t=>{atkbF(t,'arc',2);atkbF(t,'lbow',2);atkbF(t,'xbow',2)}}},
{n:'Mongols',uu:'mgd',d:'Scouts +30 HP, faster hunting; Mangudai',fx:t=>{hpbF(t,'scout',30);S.tech[t].hunt=1},ut:{k:'ut2',n:'Nomads',cost:{f:250,g:200},t:50,age:2,fx:t=>{hpbF(t,'mgd',30);atkbF(t,'mgd',2)}}},
{n:'Byzantines',uu:'cata',d:'Buildings +15% HP; Cataphracts',fx:t=>{S.tech[t].bz=1},ut:{k:'ut3',n:'Greek Fire',cost:{f:300,g:250},t:50,age:2,fx:t=>{S.tech[t].gf=1}}},
{n:'Persians',uu:'ele',d:'Start +150 food and wood; War Elephants',fx:t=>{S.res[t].f+=150;S.res[t].w+=150},ut:{k:'ut4',n:'Mahouts',cost:{f:300,g:250},t:50,age:2,fx:t=>{hpbF(t,'ele',40);hpbF(t,'eled',30)}}},
{n:'Teutons',uu:'tk',d:'Infantry +1 armour; Teutonic Knights',fx:t=>{S.tech[t].armI=1},ut:{k:'ut5',n:'Crenellations',cost:{f:250,w:250},t:50,age:2,fx:t=>hpbF(t,'tk',30)}},
{n:'Celts',uu:'woad',d:'Siege +30 HP, faster woodcutting; Woad Raiders',fx:t=>{for(const k of['ram','mang','scor','treb','bomb'])hpbF(t,k,30);S.tech[t].wd=1},ut:{k:'ut6',n:'Furor Celtica',cost:{f:300,g:200},t:50,age:2,fx:t=>{for(const k of['ram','mang','scor','treb','bomb'])hpbF(t,k,60)}}},
{n:'Vikings',uu:'bers',d:'Infantry +10 HP; Berserks',fx:t=>{hpbF(t,'mil',10);hpbF(t,'spear',10);hpbF(t,'bers',10)},ut:{k:'ut7',n:'Chieftains',cost:{f:250,g:150},t:50,age:2,fx:t=>{atkbF(t,'mil',2);atkbF(t,'spear',2);atkbF(t,'bers',3)}}},
{n:'Saracens',uu:'mamel',d:'Camels +20 HP, +100 gold; Mamelukes',fx:t=>{hpbF(t,'camel',20);S.res[t].g+=100},ut:{k:'ut8',n:'Zealotry',cost:{f:300,g:250},t:50,age:2,fx:t=>{hpbF(t,'camel',20);hpbF(t,'mamel',20)}}},
{n:'Turks',uu:'jan',d:'Gunpowder units +HP; Janissaries',fx:t=>{hpbF(t,'hcan',9);hpbF(t,'bomb',20);hpbF(t,'jan',11)},ut:{k:'ut9',n:'Sipahi',cost:{f:300,g:250},t:50,age:2,fx:t=>{atkbF(t,'hcan',4);atkbF(t,'jan',4);atkbF(t,'bomb',4)}}},
{n:'Chinese',uu:'chuko',d:'Start +200 food; Chu Ko Nu',fx:t=>{S.res[t].f+=200},ut:{k:'ut10',n:'Great Wall',cost:{f:300,w:300,s:200},t:60,age:2,fx:t=>{S.tech[t].fw=1;for(const x of S.bs)if(x.t===t&&(x.k==='wall'||x.k==='gate'||x.k==='tower')){x.mh=Math.round(x.mh*1.5);x.hp=Math.round(x.hp*1.5)}}}},
{n:'Japanese',uu:'saml',d:'Infantry +1 attack; Samurai',fx:t=>{atkbF(t,'mil',1);atkbF(t,'spear',1);atkbF(t,'saml',1)},ut:{k:'ut11',n:'Yasama',cost:{f:300,w:200,g:150},t:50,age:2,fx:t=>{S.tech[t].ys=1}}},
{n:'Khmer',uu:'ele',d:'Elephants +30 HP; Battle Elephants',fx:t=>hpbF(t,'ele',30),ut:{k:'ut12',n:'Tusk Swords',cost:{f:300,g:200},t:50,age:2,fx:t=>atkbF(t,'ele',3)}},
{n:'Indians',uu:'eled',d:'Villagers +10 HP, +100 food; Elephant Archers',fx:t=>{hpbF(t,'vil',10);S.res[t].f+=100},ut:{k:'ut13',n:'Shatagni',cost:{f:300,g:250},t:50,age:2,fx:t=>{atkbF(t,'hcan',3);atkbF(t,'eled',2)}}},
{n:'Spanish',uu:'conq',d:'Miners +15%, +100 gold; Conquistadors',fx:t=>{S.tech[t].mn=1;S.res[t].g+=100},ut:{k:'ut14',n:'Supremacy',cost:{f:300,g:250},t:50,age:2,fx:t=>{atkbF(t,'vil',6);hpbF(t,'vil',40)}}},
{n:'Italians',uu:'genoa',d:'Archers +10 HP, farms +15%; Genoese Crossbowmen',fx:t=>{hpbF(t,'arc',10);hpbF(t,'xbow',10);S.tech[t].fa=1},ut:{k:'ut15',n:'Pavise',cost:{f:250,g:200},t:50,age:2,fx:t=>{atkbF(t,'genoa',2);hpbF(t,'genoa',15)}}},
{n:'Slavs',uu:'boyar',d:'Farms +15%, +100 wood; Boyars',fx:t=>{S.tech[t].fa=1;S.res[t].w+=100},ut:{k:'ut16',n:'Detinets',cost:{f:300,g:250},t:50,age:2,fx:t=>{hpbF(t,'boyar',40);hpbF(t,'knight',10)}}},
{n:'Huns',uu:'tarkan',d:'Cavalry +10 HP, +100 food; Tarkans',fx:t=>{hpbF(t,'scout',10);hpbF(t,'knight',10);hpbF(t,'camel',10);S.res[t].f+=100},ut:{k:'ut17',n:'Marauders',cost:{f:250,g:200},t:50,age:2,fx:t=>{atkbF(t,'tarkan',3);hpbF(t,'tarkan',20)}}},
{n:'Goths',uu:'huskarl',d:'Infantry +15 HP, +100 food; Huskarls',fx:t=>{hpbF(t,'mil',15);hpbF(t,'spear',15);hpbF(t,'huskarl',15);S.res[t].f+=100},ut:{k:'ut18',n:'Anarchy',cost:{f:250,g:150},t:50,age:2,fx:t=>{hpbF(t,'huskarl',20);atkbF(t,'huskarl',2)}}},
{n:'Aztecs',uu:'jaguar',d:'Villagers carry more, +100 gold; Jaguar Warriors',fx:t=>{S.tech[t].carry=1;S.res[t].g+=100},ut:{k:'ut19',n:'Garland Wars',cost:{f:300,g:200},t:50,age:2,fx:t=>{atkbF(t,'jaguar',3);hpbF(t,'jaguar',15)}}},
{n:'Mayans',uu:'plumed',d:'Archers +15 HP, faster hunting; Plumed Archers',fx:t=>{hpbF(t,'arc',15);hpbF(t,'xbow',10);S.tech[t].hunt=1},ut:{k:'ut20',n:'Hulche Javelins',cost:{f:250,w:200},t:50,age:2,fx:t=>{atkbF(t,'plumed',2);atkbF(t,'skirm',2)}}},
{n:'Incas',uu:'kamayuk',d:'Miners +15%, spearmen +1 attack; Kamayuks',fx:t=>{S.tech[t].mn=1;atkbF(t,'spear',1)},ut:{k:'ut21',n:'Andean Sling',cost:{f:250,g:200},t:50,age:2,fx:t=>{atkbF(t,'kamayuk',3);hpbF(t,'kamayuk',15)}}},
{n:'Ethiopians',uu:'shotel',d:'Start +100 food and gold; Shotel Warriors',fx:t=>{S.res[t].f+=100;S.res[t].g+=100},ut:{k:'ut22',n:'Royal Heirs',cost:{f:300,g:200},t:50,age:2,fx:t=>{atkbF(t,'shotel',3);hpbF(t,'shotel',10)}}},
{n:'Malians',uu:'gbeto',d:'Infantry +1 attack, farms +15%; Gbeto',fx:t=>{atkbF(t,'mil',1);atkbF(t,'spear',1);S.tech[t].fa=1},ut:{k:'ut23',n:'Tigui',cost:{f:250,g:200},t:50,age:2,fx:t=>{atkbF(t,'gbeto',2);hpbF(t,'gbeto',10)}}},
{n:'Koreans',uu:'wagon',d:'Walls and gates +80% HP, siege +20 HP; War Wagons',fx:t=>{S.tech[t].fw=1;hpbF(t,'mang',20);hpbF(t,'ram',20)},ut:{k:'ut24',n:'Shinkichon',cost:{f:300,g:250},t:50,age:2,fx:t=>{atkbF(t,'wagon',3);hpbF(t,'wagon',30)}}},
{n:'Magyars',uu:'huszar',d:'Cavalry +1 attack, +100 wood; Magyar Huszars',fx:t=>{atkbF(t,'scout',1);atkbF(t,'knight',1);S.res[t].w+=100},ut:{k:'ut25',n:'Corvinian Army',cost:{f:300,g:200},t:50,age:2,fx:t=>{atkbF(t,'huszar',2);hpbF(t,'huszar',20)}}}];
CIV.forEach(c=>{TE[c.ut.k]=c.ut});
/* Xbox picture presets and adaptive frame sampling: js/engine-picture.js. */
function setQ(v){gq=v;rs();sset()}
function autoPause(){if(mode==='play'){if(typeof canvasBenchmark!=='undefined'&&canvasBenchmark)stopCanvasBenchmark(true);cancelGameplayGestures();if((typeof perfTestMatch==='undefined'||!perfTestMatch)&&!(window.CK_NET&&window.CK_NET.isRunning()))saveG(true);mode='pause';pm=0}}
/* ===== CONTROLLER INPUT ===== */
const GAR={tc:15,castle:20,tower:5},MT=[{n:'Arabia',l:1,f:1,m:1},{n:'Black Forest',l:.4,f:3,m:.8},{n:'Lakes',l:3,f:.7,m:1},{n:'Open Plains',l:.3,f:.25,m:1.5},{n:'Desert Oasis',l:.5,f:.3,m:1.2,pal:1},{n:'Frozen North',l:1.3,f:1.2,m:1,pal:2},{n:'Coastal',l:.3,f:.6,m:1.2,cs:1},{n:'Mediterranean',l:.2,f:.7,m:1.2,rv:0,sea:1},{n:'Gold Rush',l:.4,f:.5,m:2.6,gd:1,rv:0},{n:'Highland Pass',l:.3,f:.6,m:1.6,rg:1,rv:0,pal:3},{n:'Scattered Lakes',l:.2,f:.7,m:1.5,arch:1,rv:0},{n:'Twin Lakes',l:.6,f:.8,m:1.1,lake:1,rv:0}];
const MA={mil:0,spear:0,knight:2,gal:1,cata:2,ele:3,tk:5,saml:1,eled:2,bers:0,fish:1,trn:2},PRA={mil:1,scout:2,knight:2,skirm:3,ram:50,gal:3,trn:2,camel:0,cata:3,ele:2,tk:2,saml:1,eled:2,fish:2};
/* Blacksmith armour applies by unit class, including unique units; keep these sets explicit because the roster is data-driven. */
const INFARM=new Set(['mil','spear','tk','woad','bers','saml','huskarl','jaguar','kamayuk','shotel','axe','gbeto']);
const ARCHARM=new Set(['arc','xbow','lbow','skirm','genoa','plumed','chuko','jan','hcan','conq','wagon','eled','mgd']);
const CAVARM=new Set(['scout','knight','camel','mamel','cata','ele','mgd','eled','conq','boyar','tarkan']);
Object.assign(MA,{boyar:3,tarkan:2,huskarl:1,kamayuk:1,huszar:1,wagon:1});Object.assign(PRA,{boyar:3,tarkan:2,huskarl:6,kamayuk:2,huszar:2,wagon:3,jaguar:1,gbeto:1});

/* ===== MAIN LOOP (fixed 30Hz step, clamped delta for tab suspension) ===== */
/* Runtime exceptions used to be painted as a thin red strip while the same failing simulation kept running every frame. Halt immediately and expose useful diagnostics instead of repeatedly executing a broken step. */
let CK_ERR=null;
function frame(now){requestAnimationFrame(frame);try{frame2(now)}catch(e){if(mode!=='error'){CK_ERR={message:String(e&&e.message||e),stack:String(e&&e.stack||''),time:typeof S!=='undefined'&&S?S.t:0,units:typeof S!=='undefined'&&S&&S.us?S.us.length:0,buildings:typeof S!=='undefined'&&S&&S.bs?S.bs.length:0,map:typeof W!=='undefined'?W+'x'+H:'unknown',mode};mode='error';acc=0}try{drawError()}catch(_){X.fillStyle='#400';X.fillRect(0,0,CW,CH);X.fillStyle='#fff';X.fillText('Runtime error — simulation stopped',20,40)}}}
let lastAutoSaveAt=-60000;
/* Frame delta spans the *previous* game callback and browser time before this
 * callback. The residual is unattributed (vsync, compositor/GPU, throttling,
 * unrelated tasks); it is NOT proof that the browser sat idle. */
/* Controller-friendly Xbox Edge experiment: median RAF intervals over a
 * fixed scene. Run only in the offline bundled test match, never in multiplayer.
 * Freeze simulation during measurements, not the visual renderer. Save and
 * restore prior game speed; comparison is invalidated if the tab is hidden. */
function frame2(now){
 const timing=!!perfHud,loopStart=timing?performance.now():0,rafMs=Math.max(0,now-last);
 if(timing){perfFrameIntervalMs=rafMs;perfGapMs=outsideGameLoopMs(rafMs,perfLoopMs)}
 else perfLoopMs=0;
 try{
  const dt=Math.min(.25,(now-last)/1000);last=now;
  if(canvasBenchmark)sampleCanvasBenchmark(now,rafMs);
  else sampleAdaptivePicture(now,rafMs);
  const padStart=timing?performance.now():0;
  readPad();
  if(timing)perfPadMs=performance.now()-padStart;
  if(mode==='error'){
   if(E[0]||E[1]){if(window.CK_NET&&window.CK_NET.snapshot().roomCode)window.CK_NET.leaveToTitle();else mode='title';menu=place=null;CK_ERR=null;acc=0}
   drawError();return;
  }
  const controlStart=timing?performance.now():0;
  ctl(dt);
  if(timing)perfControlMs=performance.now()-controlStart;
  const simStart=performance.now();
  if(mode==='play'){
   acc+=dt*gs;
   while(acc>=DT&&mode==='play'){
    step(DT);if(window.CK_NET&&typeof window.CK_NET.onSimulationStep==='function')window.CK_NET.onSimulationStep();acc-=DT;
   }
   if(S&&!perfTestMatch&&!(window.CK_NET&&window.CK_NET.isRunning())&&now-lastAutoSaveAt>=60000){lastAutoSaveAt=now;saveG(true)}
  }
  perfStepMs=performance.now()-simStart;perfStepPeak=Math.max(perfStepPeak,perfStepMs);
  const drawStart=performance.now();
  draw(dt);perfDrawMs=performance.now()-drawStart;perfDrawPeak=Math.max(perfDrawPeak,perfDrawMs);
 }finally{if(timing)perfLoopMs=performance.now()-loopStart}
}
function sset(){try{localStorage.setItem('ck_set',JSON.stringify({ui,br,msz,diff,aiDifficultyVersion:2,vm,scoreLimit,mt,mapLayout,civ,zm,gq,aip,kingdoms,startRes,startArmy,startAge,startVillagers,gameMode,perfHud,vol:VOL,rmb,snd,mus}))}catch(e){}}
try{hs=[0,1,2].some(n=>!!localStorage.getItem(skey(n)))||!!localStorage.getItem('ck_autosave');BM=JSON.parse(localStorage.getItem('ck_map'))||{};const st=JSON.parse(localStorage.getItem('ck_set')||'null');if(st){ui=[.8,1,1.25,1.5].includes(st.ui)?st.ui:1;br=cl(+st.br||1,.6,1.5);msz=cl(st.msz|0,0,3);diff=cl(st.aiDifficultyVersion===2?(st.diff|0):[1,2,4][cl(st.diff|0,0,2)],0,5);vm=cl(st.vm|0,0,6);scoreLimit=SCORE_LIMITS.includes(st.scoreLimit)?st.scoreLimit:1200;mt=cl(st.mt|0,0,MT.length-1);mapLayout=cl(st.mapLayout|0,0,13);if(mapLayout)applyMapLayout();civ=cl(st.civ|0,0,CIV.length-1);zm=cl(+st.zm||1.4,.8,3);TW=64*zm;TH=32*zm;gq=cl(st.gq===undefined?1:st.gq|0,0,2);if(st.vol){const v01=x=>{x=+x;return x>=0&&x<=1?x:1};VOL={m:v01(st.vol.m),mu:v01(st.vol.mu),sf:v01(st.vol.sf),am:v01(st.vol.am)}}aip=cl(st.aip|0,0,6);kingdoms=[2,3,4].includes(st.kingdoms)?st.kingdoms:4;startRes=cl(st.startRes|0,0,5);startArmy=cl(st.startArmy|0,0,3);startAge=cl(st.startAge|0,0,3);startVillagers=st.startVillagers===undefined?1:cl(st.startVillagers|0,0,3);gameMode=cl(st.gameMode|0,0,2);perfHud=st.perfHud?1:0;rmb=st.rmb===0?0:1;snd=st.snd===0?0:1;mus=st.mus===0?0:1;}}catch(e){}
rs();
if(window.CK_STORAGE)window.CK_STORAGE.restoreMissing().then(()=>refreshSlots()).catch(()=>{});
try{if('serviceWorker' in navigator&&window.location&&window.location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{})}catch(e){}
try{const ael=document.getElementById('ck-assets');if(ael&&ael.textContent&&ael.textContent.trim()!=='{}')loadAssetPack(JSON.parse(ael.textContent));if(window.CK_ASSETS)loadAssetPack(window.CK_ASSETS)}catch(e){};fetch('./assets/atlas-manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Asset manifest unavailable');return r.json()}).then(pack=>{if(pack&&typeof pack==='object')loadAssetPack(pack)}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause()});addEventListener('blur',autoPause);
addEventListener('keydown',e=>{if(e.target?.closest?.('.ck-room-overlay'))return;if(e.key&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','Escape','Tab','PageUp','PageDown'].includes(e.key))e.preventDefault()},{passive:false});
addEventListener('contextmenu',e=>{if(!e.target?.closest?.('.ck-room-overlay'))e.preventDefault()});addEventListener('wheel',e=>{if(!e.target?.closest?.('.ck-room-overlay'))e.preventDefault()},{passive:false});
setInterval(aTick,120);
['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,()=>{if(aInit()&&AC.state==='suspended')AC.resume().catch(()=>{})},{passive:true}));
requestAnimationFrame(frame);

