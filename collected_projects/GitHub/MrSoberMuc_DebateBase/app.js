/* DebateBase 3 – Oberfläche
 * Übernommen aus Version 2. Geändert wurde vor allem die Datenschicht (Repo):
 * Sie speichert jetzt jeden Datensatz einzeln in IndexedDB (siehe db.js).
 */
(function(){
'use strict';
var APP_VERSION='3.2.0';
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uid=function(p){return p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)};
var DAY=864e5, now=Date.now();
var ICON={
 home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
 book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13"/>',
 scale:'<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7zM19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7z"/>',
 doc:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
 chat:'<path d="M4 5h16v11H9l-5 4z"/>',
 sliders:'<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 moon:'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'
};
function ic(n,s){s=s||20;return '<svg viewBox="0 0 24 24" width="'+s+'" height="'+s+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON[n]+'</svg>'}

var TYPES={definition:'Definition',fakt:'Fakt',statistik:'Statistik',studie:'Studie',behauptung:'Behauptung',argument:'Argument',gegenargument:'Gegenargument',meinung:'Meinung',frage:'Offene Frage'};
var STATUS={neu:'Neu',pruefung:'In Prüfung',belegt:'Belegt',teilweise:'Teilweise belegt',widerlegt:'Widerlegt',umstritten:'Umstritten',veraltet:'Veraltet'};
var TOPICS=['Geschichte','Internationale Beziehungen','Politik','Wissenschaft','Gesellschaft','Wirtschaft'];
var SKINDS=['Primärquelle','Studie','Fachartikel','Statistik','Offizielle Seite','Nachrichten','Buch','Rede oder Interview','Social-Media-Beitrag','Sonstiges'];

/* ---------- Beispieldaten (nur auf Wunsch) ---------- */
function seed(){
 var t=function(d){return now-d*DAY};
 var E=function(id,title,type,topic,status,tags,src,d,desc){return {id:id,title:title,type:type,topic:topic,status:status,tags:tags,sourceIds:src,description:desc,created:t(d),updated:t(d)}};
 return {
  links:[
   {id:'l1',type:'relativiert',fromK:'entries',fromId:'e4',toK:'args',toId:'a1',note:'Beispielverknüpfung',created:t(24)},
   {id:'l2',type:'unterstuetzt',fromK:'entries',fromId:'e6',toK:'args',toId:'a2',note:'Beispielverknüpfung',created:t(19)},
   {id:'l3',type:'ergaenzt',fromK:'entries',fromId:'e7',toK:'entries',toId:'e6',note:'Beispielverknüpfung',created:t(17)},
   {id:'l4',type:'basiert',fromK:'entries',fromId:'e10',toK:'args',toId:'a4',note:'Beispielverknüpfung',created:t(6)},
   {id:'l5',type:'basiert',fromK:'entries',fromId:'e11',toK:'args',toId:'a3',note:'Beispielverknüpfung',created:t(3)}],posts:[],
  sources:[
   {id:'s1',title:'Charta der Vereinten Nationen',publisher:'Vereinte Nationen',year:'1945',kind:'Primärquelle',url:'https://www.un.org/en/about-us/un-charter',note:'Gründungsdokument der UNO.',created:t(35)},
   {id:'s2',title:'Scientific Assessment of Ozone Depletion: 2022',publisher:'WMO / UNEP',year:'2022',kind:'Studie',url:'https://csl.noaa.gov/assessments/ozone/2022/',note:'Vierjähriger Sachstandsbericht.',created:t(18)},
   {id:'s3',title:'Erneuerbare Energien in Zahlen',publisher:'Umweltbundesamt',year:'2024',kind:'Statistik',url:'https://www.umweltbundesamt.de/themen/klima-energie/erneuerbare-energien/erneuerbare-energien-in-zahlen',note:'Jahreswerte werden regelmäßig aktualisiert.',created:t(12)},
   {id:'s4',title:'Quantifying the consensus on anthropogenic global warming in the scientific literature',publisher:'Cook et al., Environmental Research Letters',year:'2013',kind:'Studie',url:'https://doi.org/10.1088/1748-9326/8/2/024024',note:'',created:t(20)},
   {id:'s5',title:'NATO Expansion: What Gorbachev Heard',publisher:'National Security Archive, George Washington University',year:'2017',kind:'Primärquelle',url:'https://nsarchive.gwu.edu',note:'Sammlung freigegebener Gesprächsprotokolle.',created:t(30)},
   {id:'s6',title:'Retraction of Wakefield et al. (1998)',publisher:'The Lancet',year:'2010',kind:'Studie',url:'https://www.thelancet.com',note:'',created:t(8)},
   {id:'s7',title:'Sovereignty, International Relations, and the Westphalian Myth',publisher:'Andreas Osiander, International Organization 55(2)',year:'2001',kind:'Fachartikel',url:'https://doi.org/10.1162/00208180151140577',note:'',created:t(40)},
   {id:'s8',title:'Länder der EU',publisher:'Europäische Union',year:'2024',kind:'Offizielle Seite',url:'https://european-union.europa.eu',note:'',created:t(50)}
  ],
  entries:[
   E('e9','Impfstoffe verursachen Autismus','behauptung','Wissenschaft','widerlegt',['Gesundheit','Desinformation'],['s6'],8,'Die Behauptung geht auf eine Studie von Andrew Wakefield (1998) zurück, die 2010 von The Lancet zurückgezogen wurde. Große Kohortenstudien fanden keinen Zusammenhang zwischen der MMR-Impfung und Autismus.'),
   E('e10','Wirtschaftssanktionen als außenpolitisches Mittel','meinung','Internationale Beziehungen','umstritten',['Sanktionen','Außenpolitik'],[],6,'Position: Sanktionen sind ein wirksames Mittel, um Verhalten zu ändern. Die Forschung zeigt gemischte Ergebnisse; der Erfolg hängt stark von Zielsetzung, Breite und Durchsetzung ab.'),
   E('e11','Reparationen und der Aufstieg der NSDAP','frage','Geschichte','neu',['Weimarer Republik','Zwischenkriegszeit'],[],3,'Wie stark trugen die Reparationsforderungen nach 1919 zum Aufstieg der NSDAP bei, verglichen mit der Weltwirtschaftskrise ab 1929? Literatur zu Young-Plan und Lausanner Konferenz 1932 sichten.'),
   E('e5','Anteil erneuerbarer Energien am Stromverbrauch in Deutschland','statistik','Politik','pruefung',['Energie','Klima'],['s3'],12,'Laut Umweltbundesamt lag der Anteil erneuerbarer Energien am Bruttostromverbrauch 2023 bei rund 52 %. Aktuelle Jahreszahl und Berechnungsgrundlage vor der Verwendung noch einmal prüfen.'),
   E('e12','Peer-Review','definition','Wissenschaft','belegt',['Methodik','Publikationswesen'],[],15,'Begutachtungsverfahren, bei dem unabhängige Fachleute ein Manuskript vor der Veröffentlichung prüfen. Es filtert Fehler, garantiert aber keine Richtigkeit.'),
   E('e7','Ozonschicht und Montrealer Protokoll','studie','Wissenschaft','belegt',['Klima','Umweltpolitik','FCKW'],['s2'],18,'Das Montrealer Protokoll (1987) regelt den Ausstieg aus FCKW. Der UNEP/WMO-Bericht 2022 erwartet, dass sich die Ozonschicht außerhalb der Polargebiete bis etwa 2040 erholt, über der Antarktis bis etwa 2066.'),
   E('e6','Wissenschaftlicher Konsens zum Klimawandel','studie','Wissenschaft','belegt',['Klima','Konsens'],['s4'],20,'Mehrere Auswertungen der Fachliteratur kommen zu dem Ergebnis, dass über 97 % der Studien mit Positionierung den menschlichen Einfluss auf das Klima bestätigen (Cook et al. 2013). Spätere Arbeiten nennen Werte über 99 %.'),
   E('e4','Beinahe-Eskalationen im Kalten Krieg','gegenargument','Internationale Beziehungen','belegt',['Kalter Krieg','Abschreckung','Atomwaffen'],[],25,'Gegen die Annahme einer stabilen nuklearen Abschreckung: In der Kubakrise 1962 und beim Fehlalarm des sowjetischen Frühwarnsystems 1983 (Stanislaw Petrow) stand die Welt nach Einschätzung vieler Historiker knapp vor einer Eskalation.'),
   E('e3','Gab es 1990 ein NATO-Versprechen zur Nichterweiterung?','behauptung','Internationale Beziehungen','umstritten',['NATO','Russland','Deutsche Einheit'],['s5'],30,'Belegt sind mündliche Äußerungen wie James Bakers „not one inch“ (Februar 1990) im Kontext der deutschen Einheit. Ein verbindliches schriftliches Versprechen existiert nicht; im Zwei-plus-Vier-Vertrag findet sich keine solche Zusage. Die Deutung bleibt strittig.'),
   E('e2','Gründung der Vereinten Nationen','fakt','Internationale Beziehungen','belegt',['UNO','1945'],['s1'],35,'Die UN-Charta trat am 24. Oktober 1945 in Kraft. 51 Staaten waren Gründungsmitglieder, heute hat die UNO 193 Mitgliedstaaten.'),
   E('e1','Westfälischer Friede 1648','definition','Geschichte','teilweise',['Frühe Neuzeit','Souveränität','Westfälisches System'],['s7'],40,'Die Verträge von Münster und Osnabrück beendeten 1648 den Dreißigjährigen Krieg. Sie gelten klassisch als Geburtsstunde des modernen Staatensystems souveräner Staaten. Die neuere Forschung sieht das als nachträgliche Konstruktion („Westfälischer Mythos“).'),
   E('e8','Die EU hat 28 Mitgliedstaaten','behauptung','Politik','veraltet',['EU','Brexit'],['s8'],50,'Diese Angabe galt bis zum Austritt des Vereinigten Königreichs am 31. Januar 2020. Seitdem hat die EU 27 Mitgliedstaaten.')
  ],
  args:[
   {id:'a1',title:'Abschreckung verhindert Großmachtkriege',claim:'Atomwaffen haben seit 1945 einen direkten Krieg zwischen Großmächten verhindert.',counter:'Der Zusammenhang ist nicht beweisbar, da das Ausbleiben eines Krieges viele Ursachen haben kann. Zudem gab es Beinahe-Katastrophen (Kubakrise 1962, Fehlalarm 1983), und Stellvertreterkriege fanden trotzdem statt.',topic:'Internationale Beziehungen',status:'umstritten',sourceIds:[],created:t(25)},
   {id:'a2',title:'Der Klimawandel ist rein natürlich',claim:'Das Klima hat sich schon immer verändert, also ist die heutige Erwärmung natürlich.',counter:'Frühere Klimawandel hatten identifizierbare Ursachen wie Orbitalzyklen oder Vulkanismus. Für die aktuelle Erwärmung zeigen Messungen (u. a. Kohlenstoff-Isotope, Abkühlung der Stratosphäre bei Erwärmung der unteren Atmosphäre), dass der verstärkte Treibhauseffekt durch menschliche CO₂-Emissionen die Ursache ist.',topic:'Wissenschaft',status:'belegt',sourceIds:['s4'],created:t(20)},
   {id:'a3',title:'Der Versailler Vertrag führte zwangsläufig zum Zweiten Weltkrieg',claim:'Der Vertrag von 1919 machte einen neuen Krieg unvermeidlich.',counter:'Der Vertrag war belastend und wurde propagandistisch genutzt. Weltwirtschaftskrise, die Schwäche der Weimarer Institutionen und Entscheidungen einzelner Akteure 1930 bis 1933 waren aber ebenso entscheidend. „Zwangsläufig“ blendet Handlungsspielräume aus.',topic:'Geschichte',status:'umstritten',sourceIds:[],created:t(22)},
   {id:'a4',title:'Sanktionen wirken nie',claim:'Sanktionen haben noch nie ein Regime zum Einlenken gebracht.',counter:'Es gibt Fälle mit teilweisem Erfolg, etwa die Sanktionen gegen das Apartheid-Regime in Südafrika oder den Druck, der zum Iran-Atomabkommen 2015 beitrug. Der Erfolg hängt von Ziel und Durchsetzung ab; pauschale Aussagen in beide Richtungen sind angreifbar.',topic:'Internationale Beziehungen',status:'teilweise',sourceIds:[],created:t(7)}
  ]
 };
}

/* ================= Datenschicht (IndexedDB, Write-through) =================
 * Die Oberfläche liest aus einer Kopie im Arbeitsspeicher (schnell).
 * Jede Änderung wird sofort als Transaktion in IndexedDB geschrieben.
 * Schlägt das Schreiben fehl, wird der Stand neu aus der Datenbank geladen,
 * damit Anzeige und gespeicherte Daten nie auseinanderlaufen. */
var COLS=['entries','sources','args','links','posts'];
var TAX={entries:1,args:1,posts:1};
var MAX_BACKUPS=5;
function emptyDb(){return {entries:[],sources:[],args:[],links:[],posts:[],settings:{theme:'system'},meta:{}}}
function byCreated(a,b){return (b.created||0)-(a.created||0)}
var Repo={
 db:null,ready:false,persistent:false,error:'',backups:[],persisted:null,
 fromRows:function(d){
  var db=emptyDb();
  COLS.forEach(function(c){db[c]=(d[c]||[]).slice().sort(byCreated)});
  (d.settings||[]).forEach(function(r){db.settings[r.key]=r.value});
  (d.meta||[]).forEach(function(r){db.meta[r.key]=r.value});
  db.settings.theme=db.settings.theme||'system';
  this.backups=(d.backups||[]).sort(function(a,b){return b.at-a.at});
  return db},
 load:function(){var self=this;
  return DB.open().then(function(){return DB.readAll()}).then(function(d){
   self.db=self.fromRows(d);self.ready=true;self.persistent=true;
   if(!self.db.meta.schema){
    self.db.meta.schema=DB.VERSION;self.db.meta.firstStart=Date.now();self.db.meta.appVersion=APP_VERSION;
    return DB.write({put:{meta:[{key:'schema',value:DB.VERSION},{key:'firstStart',value:self.db.meta.firstStart},{key:'appVersion',value:APP_VERSION}]}})}
  }).catch(function(e){self.db=emptyDb();self.ready=false;self.persistent=false;self.error=e&&e.message?e.message:String(e)})},
 reload:function(){var self=this;return DB.readAll().then(function(d){self.db=self.fromRows(d);self.persistent=true})},
 commit:function(ch,tax){
  var self=this,t=Date.now();ch=ch||{};ch.put=ch.put||{};
  if(!self.ready){self.persistent=false;updateSaved();return Promise.resolve()}
  ch.put.meta=(ch.put.meta||[]).concat([{key:'lastSaved',value:t}]);
  if(tax){var x=taxonomy();ch.clear=(ch.clear||[]).concat(['topics','tags']);ch.put.topics=x.topics;ch.put.tags=x.tags}
  return DB.write(ch).then(function(){
   self.db.meta.lastSaved=t;self.persistent=true;updateSaved();
   var ls=document.getElementById('lastSaved');if(ls)ls.textContent=fmtSaved(t)},
  function(e){
   self.persistent=false;updateSaved();toast('Nicht gespeichert: '+e.message,true);
   e.shown=true;
   return self.reload().then(function(){render()},function(){}).then(function(){throw e})})},
 all:function(c){return this.db[c]},
 get:function(c,id){return this.db[c].filter(function(x){return x.id===id})[0]},
 put:function(c,o){var a=this.db[c],i=a.map(function(x){return x.id}).indexOf(o.id);if(i>=0)a[i]=o;else a.unshift(o);
  var p={};p[c]=[o];return this.commit({put:p},TAX[c])},
 remove:function(c,id){
  var D=this.db,del={},put={entries:[],args:[],posts:[]},mark=function(col,o){if(put[col].indexOf(o)<0)put[col].push(o)};
  del[c]=[id];D[c]=D[c].filter(function(x){return x.id!==id});
  if(c==='entries'||c==='args'){
   var gone=D.links.filter(function(l){return (l.fromK===c&&l.fromId===id)||(l.toK===c&&l.toId===id)});
   del.links=gone.map(function(l){return l.id});
   D.links=D.links.filter(function(l){return gone.indexOf(l)<0})}
  if(c==='entries'){D.posts.forEach(function(p){if((p.convertedTo||[]).indexOf(id)>=0){p.convertedTo=p.convertedTo.filter(function(x){return x!==id});mark('posts',p)}})}
  if(c==='posts'){D.entries.forEach(function(e){if(e.postId===id){e.postId='';mark('entries',e)}})}
  if(c==='sources'){['entries','args'].forEach(function(col){D[col].forEach(function(e){var s=e.sourceIds||[];if(s.indexOf(id)>=0){e.sourceIds=s.filter(function(x){return x!==id});mark(col,e)}})})}
  return this.commit({del:del,put:put},TAX[c])},
 /* Ersetzt alle Datensätze (Zurücksetzen, Löschen, Wiederherstellen). */
 replace:function(nd){var self=this,put={};
  COLS.forEach(function(c){self.db[c]=Array.isArray(nd[c])?nd[c].slice().sort(byCreated):[];put[c]=self.db[c]});
  return this.commit({clear:COLS.slice(),put:put},true)},
 /* Fügt viele Datensätze auf einmal hinzu bzw. ersetzt gleiche IDs. */
 bulkPut:function(out){var self=this,put={};
  COLS.forEach(function(c){var list=out[c]||[];put[c]=list;list.forEach(function(o){var a=self.db[c],i=a.map(function(x){return x.id}).indexOf(o.id);if(i>=0)a[i]=o;else a.push(o)})});
  return this.commit({put:put},true)},
 setSetting:function(k,v){this.db.settings[k]=v;return this.commit({put:{settings:[{key:k,value:v}]}})},
 setMeta:function(k,v){this.db.meta[k]=v;return this.commit({put:{meta:[{key:k,value:v}]}})},
 /* Protokoll aller Importe und Wiederherstellungen (die letzten 50) */
 logMigration:function(entry){var log=(this.db.meta.migrations||[]).concat([entry]).slice(-50);return this.setMeta('migrations',log)},
 /* Automatische Sicherung vor gefährlichen Vorgängen. Die neuesten 5 bleiben erhalten. */
 addBackup:function(reason){var self=this;
  if(!self.ready)return Promise.resolve(false);
  var snap={};COLS.forEach(function(c){snap[c]=self.db[c]});snap=JSON.parse(JSON.stringify(snap));
  var b={id:uid('b'),at:Date.now(),reason:reason,app:'DebateBase',appVersion:APP_VERSION,schema:DB.VERSION,counts:counts(snap),db:snap};
  var all=[b].concat(self.backups),keep=all.slice(0,MAX_BACKUPS),drop=all.slice(MAX_BACKUPS);
  return DB.write({put:{backups:[b]},del:{backups:drop.map(function(x){return x.id})}}).then(function(){self.backups=keep;return true},
   function(e){toast('Sicherung fehlgeschlagen, Vorgang abgebrochen: '+e.message,true);e.shown=true;throw e})}
};
function counts(d){var c={};COLS.forEach(function(k){c[k]=(d[k]||[]).length});return c}
/* Themen und Tags werden automatisch aus den Datensätzen gepflegt. */
function taxonomy(){
 var T={},G={},add=function(m,k){k=String(k||'').trim();if(!k)return;var n=norm(k);(m[n]=m[n]||{name:k,count:0}).count++};
 Repo.db.entries.forEach(function(e){add(T,e.topic);(e.tags||[]).forEach(function(t){add(G,t)})});
 Repo.db.args.forEach(function(a){add(T,a.topic)});
 Repo.db.posts.forEach(function(p){add(T,p.topic)});
 var vals=function(m){return Object.keys(m).map(function(k){return m[k]})};
 return {topics:vals(T),tags:vals(G)}}
/* Prüfung der gespeicherten Daten: findet Verweise ins Leere. Löscht nichts. */
function checkIntegrity(){
 var D=Repo.db,iss=[],set=function(c){var s={};D[c].forEach(function(x){s[x.id]=1});return s};
 var S=set('sources'),E=set('entries'),A=set('args'),P=set('posts'),K={entries:E,args:A};
 ['entries','args'].forEach(function(c){D[c].forEach(function(o){var n=(o.sourceIds||[]).filter(function(s){return !S[s]}).length;if(n)iss.push('„'+o.title+'“ verweist auf '+n+(n===1?' fehlende Quelle':' fehlende Quellen'))})});
 D.links.forEach(function(l){if(!(K[l.fromK]&&K[l.fromK][l.fromId])||!(K[l.toK]&&K[l.toK][l.toId]))iss.push('Verknüpfung '+l.id+' verweist auf einen fehlenden Eintrag')});
 D.entries.forEach(function(e){if(e.postId&&!P[e.postId])iss.push('„'+e.title+'“ verweist auf einen fehlenden X-Beitrag')});
 D.posts.forEach(function(p){var n=(p.convertedTo||[]).filter(function(x){return !E[x]}).length;if(n)iss.push('X-Beitrag '+(p.handle?'@'+p.handle:p.id)+' verweist auf '+n+' fehlende Einträge')});
 var tw={};D.posts.forEach(function(p){if(p.tweetId){if(tw[p.tweetId])iss.push('X-Beitrag '+p.tweetId+' ist doppelt gespeichert');tw[p.tweetId]=1}});
 return iss}

/* ---------- Hilfen ---------- */
var ui={route:'dashboard',q:'',type:'',topic:'',status:'',sort:'relevanz',sq:'',skind:'',aq:'',dq:'',donly:false,focusImport:false};
var ROUTES=[['dashboard','Dashboard','Start','home','Übersicht über deine Wissensdatenbank'],['wissen','Wissensbibliothek','Wissen','book','Fakten, Definitionen, Studien und mehr'],['argumente','Argumentationsarchiv','Argumente','scale','Behauptungen mit Gegenargumenten'],['quellen','Quellenarchiv','Quellen','doc','Belege und Fundstellen'],['diskussion','Diskussionsmodus','Diskussion','chat','Schnell nachschlagen und kopieren'],['einstellungen','Einstellungen','Optionen','sliders','Darstellung und Daten']];
function norm(s){return String(s||'').toLowerCase()}
function matches(hay,q){var ts=norm(q).split(/\s+/).filter(Boolean),h=norm(hay);return ts.every(function(t){return h.indexOf(t)>=0})}
function fmtDate(ts){return new Date(ts).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}
function rel(ts){var d=Math.floor((Date.now()-ts)/DAY);if(d<=0)return 'heute';if(d===1)return 'gestern';if(d<30)return 'vor '+d+' Tagen';var m=Math.floor(d/30);return m===1?'vor 1 Monat':'vor '+m+' Monaten'}
function stChip(s){return '<span class="chip st st-'+s+'">'+esc(STATUS[s]||s)+'</span>'}
function srcTitles(ids){return (ids||[]).map(function(i){var s=Repo.get('sources',i);return s?s.title:''}).filter(Boolean)}
function toast(m,bad){var t=$('#toast');t.textContent=m;t.className='toast'+(bad?' bad':'');t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){t.hidden=true},bad?5000:2200)}
function copy(text,msg){
 var done=function(){toast(msg||'In die Zwischenablage kopiert')};
 var fb=function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('Kopieren nicht möglich. Text bitte markieren.')}ta.remove()};
 try{navigator.clipboard.writeText(text).then(done,fb)}catch(e){fb()}
}
function armed(btn,lbl){
 if(btn.dataset.armed)return true;
 btn.dataset.armed='1';btn.dataset.label=btn.innerHTML;btn.innerHTML=lbl||'Sicher? Noch einmal tippen';btn.classList.add('armed');
 setTimeout(function(){if(btn.isConnected&&btn.dataset.armed){delete btn.dataset.armed;btn.innerHTML=btn.dataset.label;btn.classList.remove('armed')}},4000);
 return false}
function opts(map,sel,all){var h=all?'<option value="">'+all+'</option>':'';Object.keys(map).forEach(function(k){h+='<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(map[k])+'</option>'});return h}
function arrOpts(a,sel,all){var h=all?'<option value="">'+all+'</option>':'';a.forEach(function(k){h+='<option'+(k===sel?' selected':'')+'>'+esc(k)+'</option>'});return h}
function allTopics(){var s=TOPICS.slice();Repo.all('entries').concat(Repo.all('args')).forEach(function(e){if(e.topic&&s.indexOf(e.topic)<0)s.push(e.topic)});return s}
function parseTags(v){var seen={},out=[];String(v).split(/[,;]+/).forEach(function(t){t=t.trim().replace(/^#/,'');if(t&&!seen[norm(t)]){seen[norm(t)]=1;out.push(t)}});return out}
function xText(kind,o){
 var txt,src;
 if(kind==='args'){txt=o.title+': '+o.counter}else{txt=o.title+' – '+o.description+(o.status?' ('+STATUS[o.status]+')':'')}
 src=srcTitles(o.sourceIds)[0];
 var tail=src?' Quelle: '+src:'';
 if((txt+tail).length>280){txt=txt.slice(0,Math.max(0,277-tail.length))+'…'}
 return txt+tail}

/* ================= Intelligente Suche (Phase 4) =================
 * Die Rechenregeln stehen in analyse.js. Hier wird nur festgelegt, welche
 * Felder durchsucht werden und wie wichtig sie sind (Gewicht).
 * Es arbeitet keine KI: Wörter, Wortformen, verwandte Begriffe, Tippfehler. */
function userSynonyms(){var s=Repo.db&&Repo.db.settings.synonyms;return Array.isArray(s)?s.filter(Array.isArray):[]}
var synCache={key:null,idx:null};
function synIdx(){var u=userSynonyms(),k=JSON.stringify(u);if(synCache.key!==k){synCache.key=k;synCache.idx=Analyse.synIndex(Analyse.SYNONYMS.concat(u))}return synCache.idx}
function srcText(ids){return (ids||[]).map(function(i){var s=Repo.get('sources',i);return s?s.title+' '+(s.publisher||''):''}).join(' ; ')}
function docFor(k,o){
 var f=function(label,weight,text){return {label:label,weight:weight,text:text==null?'':String(text)}},fields;
 if(k==='entries')fields=[f('Titel',5,o.title),f('Tags',4,(o.tags||[]).join(', ')),f('Kernaussage',3,o.claimCore),f('Themengebiet',3,o.topic),f('Quellen',2,srcText(o.sourceIds)),f('Beschreibung',2,o.description),f('Begründung',1,o.reason),f('Evidenz',1,o.evidence),f('Einschränkungen',1,o.limits),f('Schlussfolgerung',1,o.conclusion),f('Typ und Status',1,(TYPES[o.type]||o.type||'')+' '+(STATUS[o.status]||o.status||'')),f('Verknüpfungen',1,linkText('entries',o.id))];
 else if(k==='args')fields=[f('Titel',5,o.title),f('Behauptung',3,o.claim),f('Themengebiet',3,o.topic),f('Gegenargument',2,o.counter),f('Quellen',2,srcText(o.sourceIds)),f('Status',1,STATUS[o.status]||o.status),f('Verknüpfungen',1,linkText('args',o.id))];
 else if(k==='sources')fields=[f('Titel',5,o.title),f('Herausgeber',3,o.publisher),f('Autor',3,o.author),f('Kernaussagen',2,o.keyClaims),f('Jahr',2,o.year),f('Quellentyp',2,o.kind),f('Methodik',1,o.method),f('Einschränkungen',1,o.limitations),f('Interessenkonflikte',1,o.conflicts),f('Notiz',1,o.note)];
 else fields=[f('Beitragstext',3,o.text),f('Konto',3,o.handle),f('Thema',3,o.topic),f('Notiz',1,o.note),f('Link',1,o.url)];
 return {id:o.id,kind:k,item:o,fields:fields,tags:o.tags||[],sourceIds:o.sourceIds||[],topic:o.topic||''}}
function smartSearch(k,list,q){return Analyse.search(list.map(function(o){return docFor(k,o)}),q,{synIndex:synIdx()})}
/* Ergebnis einer Suche: Liste der Datensätze + Begründungen */
function ranked(k,list,q){
 var r=smartSearch(k,list,q),partial=!r.full.length,R=partial?r.partial:r.full,why={};
 R.forEach(function(x){why[x.doc.id]=x});
 return {items:R.map(function(x){return x.doc.item}),why:why,partial:partial&&R.length>0}}
function whyLine(r){if(!r)return '';
 return '<p class="why"><b>Warum:</b> '+esc(r.reasons.slice(0,3).join(' · ')+(r.reasons.length>3?' · …':''))+(r.missing&&r.missing.length?' <span class="miss">· nicht gefunden: '+esc(r.missing.join(', '))+'</span>':'')+'</p>'}
var PARTIAL_NOTE='<p class="note partial">Kein Treffer enthält alle Suchwörter. Hier sind Teiltreffer:</p>';
/* Verwandte Inhalte in der Detailansicht (ohne die bereits direkt verknüpften) */
function relatedSection(k,id){
 var me=Repo.get(k,id);if(!me)return '';
 var docs=Repo.all('entries').map(function(o){return docFor('entries',o)}).concat(Repo.all('args').map(function(o){return docFor('args',o)}));
 var R=Analyse.related(docFor(k,me),docs,{links:Repo.all('links'),ltypes:LTYPES,max:12,
  label:function(kk,i){var x=itemOf(kk,i);return x?x.title:i},sourceTitle:function(s){var x=Repo.get('sources',s);return x?x.title:s}}).filter(function(r){return !r.linked}).slice(0,5);
 return '<div class="sec" id="related"><h2>Verwandte Inhalte ('+R.length+')</h2><p class="note">Vorschläge nach festen Regeln: gemeinsame Tags und Quellen, indirekte Verknüpfungen, ähnliche Wörter. Keine inhaltliche Prüfung.</p>'+
 (R.length?R.map(function(r){var o=r.doc.item;
  return '<div class="lk lk-rel"><button class="lk-main" data-act="open-item" data-k="'+r.doc.kind+'" data-id="'+esc(o.id)+'"><small>'+KINDNAME[r.doc.kind]+(r.doc.kind==='entries'?' · '+esc(TYPES[o.type]||o.type):'')+'</small><b>'+esc(o.title)+'</b><span>'+esc(r.reasons.join(' · '))+'</span></button>'+
  '<button class="icon-btn sm" data-act="link-related" data-ck="'+k+'" data-cid="'+esc(id)+'" data-v="'+r.doc.kind+':'+esc(o.id)+'" aria-label="Verknüpfung anlegen">'+ic('link',18)+'</button></div>'}).join(''):'<p class="note">Keine weiteren verwandten Inhalte gefunden.</p>')+'</div>'}
/* Eigene verwandte Begriffe: eine Gruppe pro Zeile, durch Komma getrennt */
function parseSynText(t){return String(t||'').split(/\n+/).map(function(l){var seen={};return l.split(/[,;]+/).map(function(x){return x.trim()}).filter(function(x){var n=Analyse.flat(x);if(!n||seen[n])return false;seen[n]=1;return true})}).filter(function(g){return g.length>=2})}
function synSection(){
 var u=userSynonyms();
 return '<section class="sec" id="sec-syn"><h2>Verwandte Begriffe für die Suche</h2><div class="card"><p style="margin:0 0 8px">Die Suche findet auch verwandte Begriffe, z. B. „Vereinte Nationen“ bei der Suche nach „UNO“. Eine Gruppe pro Zeile, Begriffe durch Komma trennen.</p>'+
 '<textarea class="sm" id="syn-text" aria-label="Eigene verwandte Begriffe" placeholder="z. B. Bundeswehr, Streitkräfte">'+esc(u.map(function(g){return g.join(', ')}).join('\n'))+'</textarea>'+
 '<button class="btn primary block" style="margin-top:8px" data-act="save-syn">Eigene Begriffe speichern</button>'+
 '<details style="margin-top:10px"><summary>Eingebaute Gruppen ansehen ('+Analyse.SYNONYMS.length+')</summary><ul class="issues">'+Analyse.SYNONYMS.map(function(g){return '<li>'+esc(g.join(' = '))+'</li>'}).join('')+'</ul></details></div></section>'}

/* ---------- Sheet ---------- */
function openSheet(html){var s=$('#sheet');s.innerHTML=html;$('#overlay').hidden=false;document.body.style.overflow='hidden';s.scrollTop=0}
function closeSheet(){$('#overlay').hidden=true;document.body.style.overflow='';$('#sheet').innerHTML=''}
function sheetHead(t,extra){return '<div class="sheet-h"><h2 class="t">'+esc(t)+'</h2><button class="icon-btn" data-act="close" aria-label="Schließen">'+ic('x')+'</button></div>'+(extra||'')}
function sourcePicker(sel){
 var S=Repo.all('sources');
 if(!S.length)return '<p class="note">Noch keine Quellen vorhanden. Lege zuerst Quellen im Quellenarchiv an.</p>';
 return '<div class="pick">'+S.map(function(s){return '<label><input type="checkbox" name="src" value="'+esc(s.id)+'"'+((sel||[]).indexOf(s.id)>=0?' checked':'')+'><span>'+esc(s.title)+' <small style="color:var(--muted)">'+esc(s.publisher||'')+'</small></span></label>'}).join('')+'</div>'}
function checkedSources(f){return [].slice.call(f.querySelectorAll('input[name=src]:checked')).map(function(i){return i.value})}

/* ---------- Eintrag ---------- */
function entryForm(id,preset){
 var e=id?Repo.get('entries',id):Object.assign({type:'fakt',status:'neu',topic:'',tags:[],sourceIds:[],title:'',description:''},preset||{});
 var used={};(e.tags||[]).forEach(function(t){used[norm(t)]=1});
 var cnt={};Repo.all('entries').forEach(function(x){(x.tags||[]).forEach(function(t){cnt[t]=(cnt[t]||0)+1})});
 var sug=Object.keys(cnt).filter(function(t){return !used[norm(t)]}).sort(function(a,b){return cnt[b]-cnt[a]}).slice(0,8);
 openSheet(sheetHead(id?'Eintrag bearbeiten':'Neuer Eintrag')+
 '<form data-form="entry" data-id="'+esc(id||'')+'" class="stack" novalidate>'+
 '<div class="field"><label for="f-title">Titel</label><input id="f-title" name="title" required maxlength="200" value="'+esc(e.title)+'" placeholder="z. B. Gründung der Vereinten Nationen"></div>'+
 '<div class="field"><label for="f-desc">Beschreibung</label><textarea id="f-desc" name="description" placeholder="Kernaussage in eigenen Worten">'+esc(e.description)+'</textarea></div>'+
 '<div class="two"><div class="field"><label for="f-type">Inhaltstyp</label><select id="f-type" name="type">'+opts(TYPES,e.type)+'</select></div>'+
 '<div class="field"><label for="f-status">Prüfstatus</label><select id="f-status" name="status">'+opts(STATUS,e.status)+'</select></div></div>'+
 '<div class="field"><label for="f-topic">Themengebiet</label><input id="f-topic" name="topic" list="topics" value="'+esc(e.topic)+'" placeholder="Auswählen oder neu eingeben"><datalist id="topics">'+allTopics().map(function(t){return '<option value="'+esc(t)+'">'}).join('')+'</datalist></div>'+
 '<div class="field"><label for="f-tags">Tags (durch Komma getrennt)</label><input id="f-tags" name="tags" value="'+esc((e.tags||[]).join(', '))+'" placeholder="z. B. NATO, Kalter Krieg">'+
 (sug.length?'<div class="chips" style="flex-wrap:wrap">'+sug.map(function(t){return '<button type="button" data-act="addtag" data-v="'+esc(t)+'">+ '+esc(t)+'</button>'}).join('')+'</div>':'')+'</div>'+
 extraFields(e)+'<input type="hidden" name="postId" value="'+esc(e.postId||'')+'">'+
 '<div class="field"><span class="lbl">Quellen verknüpfen</span>'+sourcePicker(e.sourceIds)+'</div>'+
 '<p class="err" id="err" hidden></p>'+
 '<div class="btns"><button type="button" class="btn" data-act="close">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form>')}
function saveEntry(f){
 var d=new FormData(f),title=String(d.get('title')).trim(),id=f.dataset.id;
 if(!title){var er=$('#err');er.textContent='Bitte gib einen Titel ein.';er.hidden=false;$('#f-title').focus();return}
 var old=id?Repo.get('entries',id):null,t=Date.now();
 /* Felder, die diese Version nicht kennt (z. B. aus einem Import), bleiben erhalten. */
 var o=Object.assign({},old||{},{id:id||uid('e'),title:title,description:String(d.get('description')).trim(),type:d.get('type'),status:d.get('status'),topic:String(d.get('topic')).trim(),tags:parseTags(d.get('tags')),sourceIds:checkedSources(f),postId:String(d.get('postId')||''),claimCore:String(d.get('claimCore')||'').trim(),reason:String(d.get('reason')||'').trim(),evidence:String(d.get('evidence')||'').trim(),limits:String(d.get('limits')||'').trim(),conclusion:String(d.get('conclusion')||'').trim(),created:old?old.created:t,updated:t});
 var pid=o.postId;Repo.put('entries',o).then(function(){var p=pid&&Repo.get('posts',pid);if(p){p.convertedTo=p.convertedTo||[];if(p.convertedTo.indexOf(o.id)<0){p.convertedTo.push(o.id);return Repo.put('posts',p)}}}).then(function(){closeSheet();render();toast(id?'Eintrag gespeichert':'Eintrag angelegt')})}
function entryDetail(id){
 var e=Repo.get('entries',id);if(!e)return;
 var S=(e.sourceIds||[]).map(function(i){return Repo.get('sources',i)}).filter(Boolean);
 openSheet(sheetHead(e.title,'<div class="meta"><span class="chip">'+esc(TYPES[e.type]||e.type)+'</span>'+stChip(e.status)+'</div>')+
 (e.description?'<p class="body" style="margin:0">'+esc(e.description)+'</p>':'<p class="note">Keine Beschreibung.</p>')+
 extraView(e)+postOrigin(e)+'<dl><dt>Themengebiet</dt><dd>'+esc(e.topic||'–')+'</dd><dt>Tags</dt><dd>'+((e.tags||[]).length?e.tags.map(function(t){return '<span class="chip tag">'+esc(t)+'</span>'}).join(' '):'–')+'</dd><dt>Erstellt</dt><dd>'+fmtDate(e.created)+'</dd><dt>Geändert</dt><dd>'+fmtDate(e.updated||e.created)+'</dd></dl>'+
 '<div class="sec"><h2>Quellen</h2>'+(S.length?S.map(function(s){return '<button class="row" data-act="open-source" data-id="'+esc(s.id)+'"><div><b>'+esc(s.title)+'</b><small>'+esc(s.publisher||'')+(s.year?', '+esc(s.year):'')+'</small></div></button>'}).join(''):'<p class="note">Keine Quelle verknüpft.</p>')+'</div>'+
 linkSection('entries',id)+relatedSection('entries',id)+delNote('entries',id)+'<div class="btns"><button class="btn" data-act="edit-entry" data-id="'+esc(id)+'">'+ic('edit',18)+'Bearbeiten</button><button class="btn" data-act="copyx" data-k="entries" data-id="'+esc(id)+'">'+ic('copy',18)+'Für X kopieren</button><button class="btn danger" data-act="del-entry" data-id="'+esc(id)+'">'+ic('trash',18)+'Löschen</button></div>')}

/* ---------- Quelle ----------
 * Phase 4, Etappe 2: strukturierte Quellenbewertung.
 * Grundsatz: DebateBase ergänzt keine Angaben selbst. Leere Felder werden als
 * „nicht angegeben“ angezeigt. Alle neuen Felder sind freiwillig. */
var COI={'':'Nicht geprüft',keine:'Keine bekannt',ja:'Vorhanden'};
var METHOD_KINDS=['Studie','Statistik','Fachartikel'];
/* Angaben, die für die Vollständigkeit zählen. Methodik nur bei Studie, Statistik, Fachartikel. */
function srcChecks(s){
 var has=function(v){return !!String(v||'').trim()};
 var L=[['Herausgeber',has(s.publisher)],['Autor',has(s.author)],['Veröffentlichungsdatum',has(s.year)||has(s.date)]];
 if(METHOD_KINDS.indexOf(s.kind)>=0)L.push(['Methodik',has(s.method)]);
 L.push(['Kernaussagen',has(s.keyClaims)],['Einschränkungen',has(s.limitations)],['Interessenkonflikte',!!COI[s.coi]&&!!s.coi]);
 return L}
function srcDoc(s){var L=srcChecks(s),ok=L.filter(function(x){return x[1]}).length;return {ok:ok,total:L.length,missing:L.filter(function(x){return !x[1]}).map(function(x){return x[0]})}}
function docChip(s){var d=srcDoc(s);return '<span class="chip tag doc-'+(d.ok===d.total?'voll':d.ok>=Math.ceil(d.total/2)?'teil':'wenig')+'" title="Dokumentierte Angaben">Doku '+d.ok+'/'+d.total+'</span>'}
function fmtSrcDate(s){
 var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s.date||'');
 if(m)return new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
 return s.year||''}
function srcOpts(sel){var a=SKINDS.slice();if(sel&&a.indexOf(sel)<0)a.push(sel);return arrOpts(a,sel)}
function sourceForm(id){
 var s=id?Repo.get('sources',id):{title:'',publisher:'',year:'',kind:'Studie',url:'',note:''};
 var ta=function(name,label,ph,val){return '<div class="field"><label for="s-'+name+'">'+label+' (optional)</label><textarea class="sm" id="s-'+name+'" name="'+name+'" placeholder="'+ph+'">'+esc(val)+'</textarea></div>'};
 var filled=['method','keyClaims','limitations','conflicts','coi'].some(function(k){return String(s[k]||'').trim()});
 openSheet(sheetHead(id?'Quelle bearbeiten':'Neue Quelle')+
 '<form data-form="source" data-id="'+esc(id||'')+'" class="stack" novalidate>'+
 '<div class="field"><label for="s-title">Titel</label><input id="s-title" name="title" required value="'+esc(s.title)+'"></div>'+
 '<div class="field"><label for="s-pub">Herausgeber</label><input id="s-pub" name="publisher" value="'+esc(s.publisher)+'" placeholder="z. B. Umweltbundesamt, The Lancet"></div>'+
 '<div class="field"><label for="s-author">Autor oder Autorin (optional)</label><input id="s-author" name="author" value="'+esc(s.author)+'" placeholder="z. B. Cook, J. et al."></div>'+
 '<div class="two"><div class="field"><label for="s-year">Jahr</label><input id="s-year" name="year" inputmode="numeric" maxlength="4" value="'+esc(s.year)+'"></div>'+
 '<div class="field"><label for="s-kind">Quellentyp</label><select id="s-kind" name="kind">'+srcOpts(s.kind)+'</select></div></div>'+
 '<div class="field"><label for="s-date">Genaues Datum (optional)</label><input id="s-date" name="date" type="date" value="'+esc(s.date)+'"></div>'+
 '<div class="field"><label for="s-url">Link</label><input id="s-url" name="url" type="url" inputmode="url" placeholder="https://" value="'+esc(s.url)+'"></div>'+
 '<div class="field"><label for="s-note">Notiz</label><textarea id="s-note" name="note">'+esc(s.note)+'</textarea></div>'+
 '<details class="card eval"'+(filled?' open':'')+'><summary><b>Quellenbewertung (optional)</b></summary>'+
 '<p class="note" style="margin:6px 0 10px">Nur eintragen, was die Quelle selbst angibt oder was du geprüft hast. Leer lassen ist besser als raten.</p><div class="stack">'+
 ta('method','Methodik','Wie wurden die Ergebnisse gewonnen? z. B. Umfrage mit 2.000 Personen, Metaanalyse',s.method)+
 ta('keyClaims','Kernaussagen','Was sagt die Quelle im Kern? Eine Aussage pro Zeile',s.keyClaims)+
 ta('limitations','Einschränkungen','Was nennt die Quelle selbst als Grenzen? Was fehlt?',s.limitations)+
 '<div class="field"><label for="s-coi">Interessenkonflikte</label><select id="s-coi" name="coi">'+opts(COI,s.coi||'')+'</select></div>'+
 '<div class="field" id="s-conflicts-f"'+(s.coi==='ja'?'':' hidden')+'><label for="s-conflicts">Welche? (z. B. Finanzierung, Auftraggeber)</label><textarea class="sm" id="s-conflicts" name="conflicts">'+esc(s.conflicts)+'</textarea></div>'+
 '</div></details>'+
 '<p class="err" id="err" hidden></p>'+
 '<div class="btns"><button type="button" class="btn" data-act="close">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form>')}
function saveSource(f){
 var d=new FormData(f),title=String(d.get('title')).trim(),id=f.dataset.id,er=$('#err');
 var fail=function(m,el){er.textContent=m;er.hidden=false;if(el)$(el).focus()};
 if(!title)return fail('Bitte gib einen Titel ein.');
 var url=String(d.get('url')).trim();
 if(url&&!/^https?:\/\//i.test(url))return fail('Der Link muss mit http:// oder https:// beginnen.');
 var year=String(d.get('year')).trim(),date=String(d.get('date')||'').trim(),coi=String(d.get('coi')||''),conflicts=String(d.get('conflicts')||'').trim();
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return fail('Das Datum ist ungültig.','#s-date');
 if(date&&year&&year!==date.slice(0,4))return fail('Jahr ('+year+') und Datum ('+date.slice(0,4)+') passen nicht zusammen.','#s-year');
 if(coi==='ja'&&!conflicts)return fail('Bitte beschreibe kurz den Interessenkonflikt oder wähle „Nicht geprüft“.','#s-conflicts');
 /* Jahr aus dem eingegebenen Datum übernehmen (keine Schätzung) */
 if(date&&!year)year=date.slice(0,4);
 var old=id?Repo.get('sources',id):null;
 var o=Object.assign({},old||{},{id:id||uid('s'),title:title,publisher:String(d.get('publisher')).trim(),author:String(d.get('author')||'').trim(),year:year,date:date,kind:d.get('kind'),url:url,note:String(d.get('note')).trim(),
  method:String(d.get('method')||'').trim(),keyClaims:String(d.get('keyClaims')||'').trim(),limitations:String(d.get('limitations')||'').trim(),coi:COI[coi]?coi:'',conflicts:coi==='ja'?conflicts:'',created:old?old.created:Date.now()});
 Repo.put('sources',o).then(function(){closeSheet();render();toast(id?'Quelle gespeichert':'Quelle angelegt')})}
function citedBy(id){return Repo.all('entries').filter(function(e){return (e.sourceIds||[]).indexOf(id)>=0})}
function citedByArgs(id){return Repo.all('args').filter(function(a){return (a.sourceIds||[]).indexOf(id)>=0})}
var CLAIM_TYPES=['behauptung','argument','gegenargument','meinung'];
function sourceDetail(id){
 var s=Repo.get('sources',id);if(!s)return;var C=citedBy(id),CA=citedByArgs(id),D=srcDoc(s);
 var val=function(v,multi){v=String(v||'').trim();return v?(multi?'<span class="body">'+esc(v)+'</span>':esc(v)):'<span class="na">nicht angegeben</span>'};
 var claims=C.filter(function(e){return CLAIM_TYPES.indexOf(e.type)>=0});
 openSheet(sheetHead(s.title,'<div class="meta"><span class="chip">'+esc(s.kind)+'</span>'+docChip(s)+'</div>')+
 '<dl><dt>Herausgeber</dt><dd>'+val(s.publisher)+'</dd><dt>Autor</dt><dd>'+val(s.author)+'</dd><dt>Veröffentlicht</dt><dd>'+val(fmtSrcDate(s))+'</dd><dt>Link</dt><dd>'+(s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">'+esc(s.url)+'</a>':'–')+'</dd><dt>Notiz</dt><dd>'+esc(s.note||'–')+'</dd></dl>'+
 '<div class="sec" id="src-eval"><h2>Quellenbewertung</h2><dl>'+
 '<dt>Methodik</dt><dd>'+(METHOD_KINDS.indexOf(s.kind)>=0||String(s.method||'').trim()?val(s.method,1):'<span class="na">für „'+esc(s.kind)+'“ meist nicht nötig</span>')+'</dd>'+
 '<dt>Kernaussagen</dt><dd>'+val(s.keyClaims,1)+'</dd><dt>Einschränkungen</dt><dd>'+val(s.limitations,1)+'</dd>'+
 '<dt>Interessenkonflikte</dt><dd>'+(s.coi==='ja'?'<b>Vorhanden:</b> <span class="body">'+esc(s.conflicts)+'</span>':s.coi==='keine'?'Keine bekannt':'<span class="na">nicht geprüft</span>')+'</dd></dl>'+
 '<p class="note" style="margin-top:8px">'+D.ok+' von '+D.total+' Angaben dokumentiert'+(D.missing.length?'. Fehlt: '+esc(D.missing.join(', '))+'.':'.')+' DebateBase ergänzt keine Angaben selbst.</p></div>'+
 '<div class="sec" id="src-claims"><h2>Verknüpfte Behauptungen ('+(claims.length+CA.length)+')</h2>'+
 (claims.length||CA.length?claims.map(function(e){return '<button class="row" data-act="open-entry" data-id="'+esc(e.id)+'"><div><b>'+esc(e.title)+'</b><small>'+esc(TYPES[e.type]||e.type)+'</small></div>'+stChip(e.status)+'</button>'}).join('')+
  CA.map(function(a){return '<button class="row" data-act="open-arg" data-id="'+esc(a.id)+'"><div><b>'+esc(a.title)+'</b><small>Argumentationskarte</small></div>'+stChip(a.status)+'</button>'}).join('')
  :'<p class="note">Keine Behauptung, kein Argument und keine Argumentationskarte nennt diese Quelle.</p>')+'</div>'+
 '<div class="sec"><h2>Zitiert in '+C.length+' Einträgen</h2>'+C.map(function(e){return '<button class="row" data-act="open-entry" data-id="'+esc(e.id)+'"><div><b>'+esc(e.title)+'</b></div>'+stChip(e.status)+'</button>'}).join('')+'</div>'+
 (C.length?'<p class="note">Beim Löschen wird die Quelle aus '+C.length+(C.length===1?' Eintrag':' Einträgen')+' entfernt.</p>':'')+'<div class="btns"><button class="btn" data-act="edit-source" data-id="'+esc(id)+'">'+ic('edit',18)+'Bearbeiten</button><button class="btn danger" data-act="del-source" data-id="'+esc(id)+'">'+ic('trash',18)+'Löschen</button></div>')}

/* ---------- Argumentationskarte ---------- */
function argForm(id){
 var a=id?Repo.get('args',id):{title:'',claim:'',counter:'',topic:'',status:'neu',sourceIds:[]};
 openSheet(sheetHead(id?'Argumentationskarte bearbeiten':'Neue Argumentationskarte')+
 '<form data-form="arg" data-id="'+esc(id||'')+'" class="stack" novalidate>'+
 '<div class="field"><label for="a-title">Titel</label><input id="a-title" name="title" required value="'+esc(a.title)+'"></div>'+
 '<div class="field"><label for="a-claim">Behauptung der Gegenseite</label><textarea id="a-claim" name="claim">'+esc(a.claim)+'</textarea></div>'+
 '<div class="field"><label for="a-counter">Gegenargument</label><textarea id="a-counter" name="counter">'+esc(a.counter)+'</textarea></div>'+
 '<div class="two"><div class="field"><label for="a-topic">Themengebiet</label><input id="a-topic" name="topic" list="topics2" value="'+esc(a.topic)+'"><datalist id="topics2">'+allTopics().map(function(t){return '<option value="'+esc(t)+'">'}).join('')+'</datalist></div>'+
 '<div class="field"><label for="a-status">Prüfstatus</label><select id="a-status" name="status">'+opts(STATUS,a.status)+'</select></div></div>'+
 '<div class="field"><span class="lbl">Quellen verknüpfen</span>'+sourcePicker(a.sourceIds)+'</div>'+
 '<p class="err" id="err" hidden></p>'+
 '<div class="btns"><button type="button" class="btn" data-act="close">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form>')}
function saveArg(f){
 var d=new FormData(f),title=String(d.get('title')).trim(),id=f.dataset.id;
 if(!title){var er=$('#err');er.textContent='Bitte gib einen Titel ein.';er.hidden=false;return}
 var old=id?Repo.get('args',id):null;
 var o=Object.assign({},old||{},{id:id||uid('a'),title:title,claim:String(d.get('claim')).trim(),counter:String(d.get('counter')).trim(),topic:String(d.get('topic')).trim(),status:d.get('status'),sourceIds:checkedSources(f),created:old?old.created:Date.now()});
 Repo.put('args',o).then(function(){closeSheet();render();toast(id?'Karte gespeichert':'Karte angelegt')})}
function argDetail(id){
 var a=Repo.get('args',id);if(!a)return;
 var S=(a.sourceIds||[]).map(function(i){return Repo.get('sources',i)}).filter(Boolean);
 openSheet(sheetHead(a.title,'<div class="meta">'+stChip(a.status)+(a.topic?'<span class="chip">'+esc(a.topic)+'</span>':'')+'</div>')+
 '<div class="cols"><div class="pane pro"><small>Behauptung</small><span class="body">'+esc(a.claim||'–')+'</span></div><div class="pane con"><small>Gegenargument</small><span class="body">'+esc(a.counter||'–')+'</span></div></div>'+
 '<div class="sec"><h2>Quellen</h2>'+(S.length?S.map(function(s){return '<button class="row" data-act="open-source" data-id="'+esc(s.id)+'"><div><b>'+esc(s.title)+'</b><small>'+esc(s.publisher||'')+'</small></div></button>'}).join(''):'<p class="note">Keine Quelle verknüpft.</p>')+'</div>'+
 linkSection('args',id)+relatedSection('args',id)+delNote('args',id)+'<div class="btns"><button class="btn" data-act="edit-arg" data-id="'+esc(id)+'">'+ic('edit',18)+'Bearbeiten</button><button class="btn" data-act="copyx" data-k="args" data-id="'+esc(id)+'">'+ic('copy',18)+'Für X kopieren</button><button class="btn danger" data-act="del-arg" data-id="'+esc(id)+'">'+ic('trash',18)+'Löschen</button></div>')}

/* ================= Verknüpfungen ================= */
var LTYPES={unterstuetzt:['Unterstützt','Wird unterstützt von'],widerspricht:['Widerspricht','Wird widersprochen von'],ergaenzt:['Ergänzt','Wird ergänzt von'],relativiert:['Relativiert','Wird relativiert von'],basiert:['Basiert auf','Grundlage für'],zitiert:['Zitiert','Wird zitiert von']};
var KINDNAME={entries:'Wissenseintrag',args:'Argumentationskarte'};
function itemOf(k,id){return (k==='entries'||k==='args')?Repo.get(k,id):null}
function linksOf(k,id){return Repo.all('links').filter(function(l){return (l.fromK===k&&l.fromId===id)||(l.toK===k&&l.toId===id)})}
function linkView(l,k,id){
 var out=(l.fromK===k&&l.fromId===id);
 var pk=out?l.toK:l.fromK,pid=out?l.toId:l.fromId,lt=LTYPES[l.type]||[l.type,l.type];
 return {out:out,label:lt[out?0:1],pk:pk,pid:pid,partner:itemOf(pk,pid)}}
function linkText(k,id){return linksOf(k,id).map(function(l){var v=linkView(l,k,id);return v.label+' '+(v.partner?v.partner.title:'')+' '+(l.note||'')}).join(' ')}
function linkBadge(k,id){var n=linksOf(k,id).length;return n?'<span class="chip tag">'+ic('link',13)+n+(n===1?' Verknüpfung':' Verknüpfungen')+'</span>':''}
function delNote(k,id){var n=linksOf(k,id).length;return n?'<p class="note">Beim Löschen werden auch '+n+(n===1?' Verknüpfung':' Verknüpfungen')+' entfernt.</p>':''}
function openItem(k,id){if(k==='args')argDetail(id);else entryDetail(id)}
function linkSection(k,id){
 var L=linksOf(k,id);
 var rows=L.map(function(l){var v=linkView(l,k,id);if(!v.partner)return '';
  return '<div class="lk lk-'+esc(l.type)+'"><button class="lk-main" data-act="open-item" data-k="'+v.pk+'" data-id="'+esc(v.pid)+'"><small>'+esc(v.label)+' · '+KINDNAME[v.pk]+'</small><b>'+esc(v.partner.title)+'</b>'+(l.note?'<span>'+esc(l.note)+'</span>':'')+'</button>'+
  '<button class="icon-btn sm" data-act="edit-link" data-id="'+esc(l.id)+'" data-ck="'+k+'" data-cid="'+esc(id)+'" aria-label="Verknüpfung bearbeiten">'+ic('edit',18)+'</button>'+
  '<button class="icon-btn sm" data-act="del-link" data-id="'+esc(l.id)+'" data-ck="'+k+'" data-cid="'+esc(id)+'" aria-label="Verknüpfung löschen">'+ic('trash',18)+'</button></div>'}).join('');
 return '<div class="sec"><div class="sec-h"><h2>Verknüpfungen ('+L.length+')</h2><button class="link" data-act="new-link" data-ck="'+k+'" data-cid="'+esc(id)+'">+ Verknüpfung</button></div>'+(rows||'<p class="note">Noch keine Verknüpfungen. Verbinde diesen Eintrag z. B. mit einer Studie oder einem Gegenargument.</p>')+'</div>'}
function partnerOptions(k,id,sel){
 var h='<option value="">Bitte wählen</option>';
 var grp=function(name,col){var a=Repo.all(col).filter(function(x){return !(col===k&&x.id===id)}).sort(function(a,b){return a.title.localeCompare(b.title,'de')});
  if(!a.length)return '';return '<optgroup label="'+name+'">'+a.map(function(x){var v=col+':'+x.id;return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc((col==='entries'?(TYPES[x.type]||x.type)+' · ':'')+x.title)+'</option>'}).join('')+'</optgroup>'};
 return h+grp('Wissenseinträge','entries')+grp('Argumentationskarten','args')}
function linkForm(lid,k,id,preset){
 var l=lid?Repo.get('links',lid):null,out=true,partner=preset||'',type='unterstuetzt',note='';
 if(l){out=(l.fromK===k&&l.fromId===id);partner=out?l.toK+':'+l.toId:l.fromK+':'+l.fromId;type=l.type;note=l.note||''}
 var me=itemOf(k,id);
 openSheet(sheetHead(lid?'Verknüpfung bearbeiten':'Neue Verknüpfung','<p class="note" style="margin:0">Von: '+esc(me?me.title:'')+'</p>')+
 '<form data-form="link" data-id="'+esc(lid||'')+'" data-ck="'+k+'" data-cid="'+esc(id)+'" class="stack" novalidate>'+
 '<div class="field"><label for="lk-type">Art der Verknüpfung</label><select id="lk-type" name="type">'+Object.keys(LTYPES).map(function(t){return '<option value="'+t+'"'+(t===type?' selected':'')+'>'+LTYPES[t][0]+'</option>'}).join('')+'</select></div>'+
 '<div class="field"><label for="lk-dir">Richtung</label><select id="lk-dir" name="dir"><option value="out"'+(out?' selected':'')+'>Dieser Eintrag → Partner</option><option value="in"'+(out?'':' selected')+'>Partner → dieser Eintrag</option></select></div>'+
 '<div class="field"><label for="lk-partner">Partner</label><select id="lk-partner" name="partner">'+partnerOptions(k,id,partner)+'</select></div>'+
 '<div class="field"><label for="lk-note">Notiz (optional)</label><input id="lk-note" name="note" maxlength="300" value="'+esc(note)+'" placeholder="z. B. Tabelle 2 der Studie"></div>'+
 '<p class="note" id="lk-prev"></p><p class="err" id="err" hidden></p>'+
 '<div class="btns"><button type="button" class="btn" data-act="back-item" data-ck="'+k+'" data-cid="'+esc(id)+'">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form>');
 updateLinkPreview()}
function updateLinkPreview(){
 var f=document.querySelector('form[data-form=link]');if(!f)return;
 var me=itemOf(f.dataset.ck,f.dataset.cid),sel=f.querySelector('#lk-partner'),pv=$('#lk-prev');
 var pt=sel.value?sel.options[sel.selectedIndex].text:'…',t=LTYPES[f.querySelector('#lk-type').value][0],out=f.querySelector('#lk-dir').value==='out';
 var a=me?me.title:'Dieser Eintrag';pv.textContent='„'+(out?a:pt)+'“ '+t.toLowerCase()+' „'+(out?pt:a)+'“.'}
function saveLink(f){
 var d=new FormData(f),k=f.dataset.ck,id=f.dataset.cid,lid=f.dataset.id,er=$('#err');
 var raw=String(d.get('partner')||''),cut=raw.indexOf(':'),p=cut>0?[raw.slice(0,cut),raw.slice(cut+1)]:[];
 if(p.length!==2||!itemOf(p[0],p[1])){er.textContent='Bitte wähle einen Partner aus.';er.hidden=false;return}
 var out=d.get('dir')==='out',old=lid?Repo.get('links',lid):null;
 var o=Object.assign({},old||{},{id:lid||uid('l'),type:d.get('type'),fromK:out?k:p[0],fromId:out?id:p[1],toK:out?p[0]:k,toId:out?p[1]:id,note:String(d.get('note')).trim(),created:old?old.created:Date.now()});
 var dup=Repo.all('links').some(function(l){return l.id!==o.id&&l.type===o.type&&l.fromK===o.fromK&&l.fromId===o.fromId&&l.toK===o.toK&&l.toId===o.toId});
 if(dup){er.textContent='Diese Verknüpfung existiert bereits.';er.hidden=false;return}
 Repo.put('links',o).then(function(){closeSheet();render();openItem(k,id);toast(lid?'Verknüpfung gespeichert':'Verknüpfung angelegt')})}

/* ================= Zusatzfelder ================= */
var FIELDS=[['claimCore','Kernaussage','Die Aussage in einem Satz'],['reason','Begründung','Warum gilt oder gilt die Aussage nicht?'],['evidence','Evidenz / Beleg','Welche Daten oder Belege stützen sie?'],['limits','Einschränkungen','Wann oder wo gilt sie nicht?'],['conclusion','Eigene Schlussfolgerung','Was folgt für dich daraus?']];
var ALL5=['claimCore','reason','evidence','limits','conclusion'];
var FIELD_BY_TYPE={definition:['claimCore','limits'],fakt:['claimCore','evidence','limits'],statistik:['claimCore','evidence','limits'],studie:['claimCore','evidence','limits','conclusion'],behauptung:ALL5,argument:ALL5,gegenargument:ALL5,meinung:['claimCore','reason','conclusion'],frage:['claimCore','reason','conclusion']};
function fieldRelevant(type,key,val){return (FIELD_BY_TYPE[type]||ALL5).indexOf(key)>=0||!!String(val||'').trim()}
function extraFields(e){
 return '<div class="stack" id="extra">'+FIELDS.map(function(f){return '<div class="field" data-f="'+f[0]+'"'+(fieldRelevant(e.type,f[0],e[f[0]])?'':' hidden')+'><label for="x-'+f[0]+'">'+f[1]+' (optional)</label><textarea class="sm" id="x-'+f[0]+'" name="'+f[0]+'" placeholder="'+f[2]+'">'+esc(e[f[0]])+'</textarea></div>'}).join('')+'</div>'}
function toggleExtra(){var t=$('#f-type');if(!t)return;document.querySelectorAll('#extra .field').forEach(function(el){var key=el.dataset.f,v=el.querySelector('textarea').value;el.hidden=!fieldRelevant(t.value,key,v)})}
function extraView(e){
 var parts=FIELDS.filter(function(f){return String(e[f[0]]||'').trim()});
 return parts.length?'<div class="cols">'+parts.map(function(f){return '<div class="pane"><small>'+f[1]+'</small><span class="body">'+esc(e[f[0]])+'</span></div>'}).join('')+'</div>':''}

/* ================= Speicherstatus ================= */
function fmtSaved(ts){var d=new Date(ts),today=new Date().toDateString()===d.toDateString();return (today?'heute ':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+' ')+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function updateSaved(){
 var el=$('#saved');if(!el||!Repo.db)return;var ts=Repo.db.meta&&Repo.db.meta.lastSaved;
 if(!Repo.ready){el.className='bad';el.textContent='Nicht dauerhaft gespeichert (nur Arbeitsspeicher)'}
 else if(!Repo.persistent){el.className='bad';el.textContent='Letzte Änderung nicht gespeichert'}
 else{el.className='';el.textContent=ts?'Automatisch gespeichert '+fmtSaved(ts):'Gespeichert auf diesem Gerät'}
 if(navigator.onLine===false)el.textContent+=' · Offline'}

/* ================= X-Beiträge ================= */
var XHOSTS=['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com','mobile.x.com'];
function parseXUrl(u){
 u=String(u||'').trim();if(!u)return null;
 try{var x=new URL(u);if(XHOSTS.indexOf(x.hostname.toLowerCase())<0)return null;
  var m=x.pathname.match(/^\/([^\/]+)\/status(?:es)?\/(\d+)/)||x.pathname.match(/^\/(i)\/(?:web\/)?status\/(\d+)/);
  if(!m)return null;var h=m[1]==='i'?'':m[1];
  return {handle:h,tweetId:m[2],url:'https://x.com/'+(h||'i/web')+'/status/'+m[2]}}catch(e){return null}}
/* Trennt geteilten Text in Link und Beitragstext. */
function parseShared(raw){
 raw=String(raw||'');var m=raw.match(/https?:\/\/[^\s]+/g)||[];
 for(var i=0;i<m.length;i++){if(parseXUrl(m[i]))return {url:m[i],text:raw.replace(m[i],'').replace(/\s+\n/g,'\n').trim()}}
 return {url:'',text:raw.trim()}}
/* ================= Android-Teilen: Eingang =================
 * Der Service Worker legt geteilte Inhalte unverändert im Eingang (Store „inbox“) ab.
 * Hier werden sie angezeigt; gespeichert wird erst nach deiner Entscheidung. */
var Inbox={items:[],
 load:function(){var self=this;if(!Repo.ready)return Promise.resolve([]);return DB.getAll('inbox').then(function(r){self.items=r.sort(function(a,b){return a.received-b.received});return self.items},function(){return []})},
 get:function(id){return this.items.filter(function(x){return x.id===id})[0]},
 remove:function(id){var self=this;return DB.write({del:{inbox:[id]}}).then(function(){self.items=self.items.filter(function(x){return x.id!==id})})}};
var URLRE=/https?:\/\/[^\s<>"]+/g;
function cleanUrl(u){return String(u).replace(/[)\].,;:!?»«“”"'’]+$/,'')}
/* Zerlegt die übergebenen Felder: X-Link finden und prüfen, Text ohne Link, Duplikat erkennen. */
function analyzeShare(it){
 var title=String(it.title||''),text=String(it.text||''),url=String(it.url||''),urls=[];
 [url,text,title].forEach(function(f){(f.match(URLRE)||[]).forEach(function(u){urls.push(cleanUrl(u))})});
 var x=null,xraw='',other='';
 urls.forEach(function(u){var p=parseXUrl(u);if(p&&!x){x=p;xraw=u}else if(!p&&!other)other=u});
 var body=text;
 (text.match(URLRE)||[]).forEach(function(u){if(parseXUrl(cleanUrl(u)))body=body.split(u).join('')});
 body=body.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 var dup=x?Repo.all('posts').filter(function(p){return p.tweetId===x.tweetId})[0]:null;
 return {x:x,xraw:xraw,other:other,text:body,onlyLink:!!x&&!body,dup:dup,title:title.trim(),fieldsUsed:[title?'Titel':'',text?'Text':'',url?'Link':''].filter(Boolean)}}
var shareCur=null;
function shareSheet(id){
 var it=Inbox.get(id);if(!it){toast('Dieser geteilte Beitrag ist nicht mehr vorhanden.');return}
 var a=analyzeShare(it);shareCur={id:id,a:a};
 var n=Inbox.items.length,h=sheetHead('Geteilter X-Beitrag','<p class="note" style="margin:0">Über die Android-Teilen-Funktion empfangen'+(n>1?' · '+n+' warten':'')+' · noch nicht gespeichert</p>');
 if(a.dup){
  h+='<div class="card alert"><p><b>Dieser Beitrag ist bereits gespeichert</b> (seit '+fmtDate(a.dup.created)+').</p></div>'+
  '<div class="btns"><button class="btn" data-act="share-open-dup" data-id="'+esc(a.dup.id)+'">Gespeicherten Beitrag öffnen</button><button class="btn danger" data-act="share-discard">Verwerfen</button></div>'+
  shareRaw(it)+'<div class="btns"><button class="btn" data-act="close">Später entscheiden</button></div>';
  openSheet(h);return}
 if(a.onlyLink)h+='<div class="card alert"><p><b>X hat nur den Link übergeben, keinen Beitragstext.</b> Den Text liest DebateBase nicht selbst aus. Wenn du ihn speichern willst: in der X-App lange auf den Beitrag tippen, Text kopieren und unten einfügen. Du kannst auch nur den Link speichern.</p></div>';
 if(!a.x&&a.other)h+='<div class="card alert"><p><b>Der geteilte Link stammt nicht von X oder Twitter:</b><br><span style="overflow-wrap:anywhere">'+esc(a.other)+'</span><br>Er wird nicht als Beitragslink übernommen. Du findest ihn unten in den Originaldaten.</p></div>';
 if(!a.x&&!a.other)h+='<div class="card"><p style="color:var(--fg);margin:0">Es wurde kein Link übergeben, nur Text.</p></div>';
 h+='<form data-form="post" data-id="" data-inbox="'+esc(id)+'" class="stack" novalidate>'+
 '<div class="field"><label for="p-url">Link zum Beitrag'+(a.x?' <span class="chip st st-belegt">X-Link geprüft</span>':'')+'</label><input id="p-url" name="url" inputmode="url" autocomplete="off" value="'+esc(a.x?a.x.url:'')+'" placeholder="https://x.com/name/status/123…"></div>'+
 '<div class="field"><label for="p-text">Beitragstext</label><textarea id="p-text" name="text" placeholder="'+(a.onlyLink?'Beitragstext hier einfügen (optional)':'Text des Beitrags')+'">'+esc(a.text)+'</textarea></div>'+
 '<div class="field"><label for="p-topic">Thema zuordnen</label><input id="p-topic" name="topic" list="topics3" placeholder="Bestehendes Thema wählen oder neu eingeben"><datalist id="topics3">'+allTopics().map(function(t){return '<option value="'+esc(t)+'">'}).join('')+'</datalist></div>'+
 '<div class="field"><label for="p-note">Eigene Notiz (optional)</label><textarea class="sm" id="p-note" name="note"></textarea></div>'+
 '<p class="err" id="err" hidden></p>'+
 '<div class="btns"><button type="submit" class="btn primary" name="mode" value="save">Als X-Beitrag speichern</button></div>'+
 '<div class="btns"><button type="submit" class="btn" name="mode" value="fakt">Speichern + Wissenseintrag</button><button type="submit" class="btn" name="mode" value="behauptung">Speichern + Behauptung</button></div>'+
 '<div class="btns"><button type="button" class="btn" data-act="close">Später entscheiden</button><button type="button" class="btn danger" data-act="share-discard">Verwerfen</button></div></form>'+shareRaw(it);
 openSheet(h)}
function shareRaw(it){
 var row=function(k,v){return '<dt>'+k+'</dt><dd class="body">'+(v?esc(v):'<span style="color:var(--muted)">(leer)</span>')+'</dd>'};
 return '<details class="card"><summary><b>Übergebene Originaldaten</b></summary><p class="note" style="margin:6px 0">So hat Android die Inhalte übergeben, unverändert. Sie werden beim Speichern mit abgelegt.</p><dl>'+row('Titel',it.title)+row('Text',it.text)+row('Link',it.url)+row('Empfangen',fmtSaved(it.received))+'</dl></details>'}
function inboxCard(){var n=Inbox.items.length;if(!n)return '';
 return '<div class="card welcome"><h3>'+(n===1?'1 geteilter Beitrag wartet':n+' geteilte Beiträge warten')+'</h3><p>Aus der Android-Teilen-Funktion. Entscheide, ob du '+(n===1?'ihn':'sie')+' speichern willst.</p><div class="btns" style="margin-top:12px"><button class="btn primary" data-act="share-next">Ansehen</button></div></div>'}
function afterShareDecision(){var next=Inbox.items[0];render();if(next)setTimeout(function(){shareSheet(next.id)},0)}
function postTitle(p){var t=String(p.text||'').replace(/\s+/g,' ').trim();if(!t)return p.handle?'Beitrag von @'+p.handle:'X-Beitrag';var s=t.split(/(?<=[.!?])\s/)[0];return (s.length>90?s.slice(0,87).trimEnd()+'…':s)}
function postCard(p,why){
 var n=(p.convertedTo||[]).filter(function(i){return Repo.get('entries',i)}).length;
 return '<article class="card" role="button" tabindex="0" data-act="open-post" data-id="'+esc(p.id)+'"><div class="meta"><span class="chip">'+(p.handle?'@'+esc(p.handle):'X-Beitrag')+'</span>'+(p.url?'':'<span class="chip tag">ohne Link</span>')+(n?'<span class="chip tag">'+n+(n===1?' Eintrag':' Einträge')+' erstellt</span>':'')+'</div>'+
 '<p class="clamp" style="color:var(--fg);margin-top:8px">'+esc(p.text||p.url)+'</p>'+whyLine(why)+'<div class="foot">'+(p.topic?'<span>'+esc(p.topic)+'</span>':'')+'<span>'+rel(p.created)+'</span></div></article>'}
function postsSection(){var P=Repo.all('posts');
 return '<div class="sec" style="margin-top:8px"><h2>Gespeicherte X-Beiträge ('+P.length+')</h2>'+(P.length?P.map(postCard).join(''):empty('Noch keine Beiträge. Füge einen X-Link oder Beitragstext ein.'))+'</div>'}
function postForm(id,preset){
 var p=id?Repo.get('posts',id):Object.assign({url:'',text:'',topic:'',note:''},preset||{});
 openSheet(sheetHead(id?'X-Beitrag bearbeiten':'X-Beitrag erfassen')+
 '<p class="note">Füge Link und Text von Hand ein. Du kannst auch beides in das Textfeld einfügen, der Link wird dann erkannt und abgetrennt.</p>'+
 '<form data-form="post" data-id="'+esc(id||'')+'" class="stack" novalidate>'+
 '<div class="field"><label for="p-url">Link zum Beitrag</label><input id="p-url" name="url" inputmode="url" autocomplete="off" placeholder="https://x.com/name/status/123…" value="'+esc(p.url)+'"></div>'+
 '<div class="field"><label for="p-text">Beitragstext</label><textarea id="p-text" name="text" placeholder="Text des Beitrags">'+esc(p.text)+'</textarea></div>'+
 '<div class="field"><label for="p-topic">Thema zuordnen</label><input id="p-topic" name="topic" list="topics3" value="'+esc(p.topic)+'" placeholder="Bestehendes Thema wählen oder neu eingeben"><datalist id="topics3">'+allTopics().map(function(t){return '<option value="'+esc(t)+'">'}).join('')+'</datalist></div>'+
 '<div class="field"><label for="p-note">Eigene Notiz (optional)</label><textarea class="sm" id="p-note" name="note">'+esc(p.note)+'</textarea></div>'+
 '<p class="err" id="err" hidden></p>'+
 '<div class="btns"><button type="submit" class="btn primary" name="mode" value="save">Speichern</button></div>'+
 (id?'':'<div class="btns"><button type="submit" class="btn" name="mode" value="fakt">Speichern + Wissenseintrag</button><button type="submit" class="btn" name="mode" value="behauptung">Speichern + Behauptung</button></div>')+
 '<div class="btns"><button type="button" class="btn" data-act="close">Abbrechen</button></div></form>')}
function savePost(f,mode){
 var d=new FormData(f),id=f.dataset.id,er=$('#err'),url=String(d.get('url')).trim(),text=String(d.get('text')).trim();
 if(!url&&!text){er.textContent='Bitte gib einen Link oder einen Beitragstext ein.';er.hidden=false;return}
 var x=null;
 if(url){x=parseXUrl(url);if(!x){er.textContent='Das ist kein gültiger X-Link. Erwartet wird z. B. https://x.com/name/status/123456.';er.hidden=false;$('#p-url').focus();return}
  var dup=Repo.all('posts').filter(function(p){return p.id!==id&&p.tweetId===x.tweetId})[0];
  if(dup){er.textContent='Dieser Beitrag ist bereits gespeichert.';er.hidden=false;return}}
 var old=id?Repo.get('posts',id):null,inboxId=f.dataset.inbox||'',inItem=inboxId?Inbox.get(inboxId):null;
 var o=Object.assign({},old||{},{id:id||uid('p'),url:x?x.url:'',handle:x?x.handle:'',tweetId:x?x.tweetId:'',text:text,topic:String(d.get('topic')).trim(),note:String(d.get('note')).trim(),convertedTo:old?old.convertedTo||[]:[],created:old?old.created:Date.now()});
 /* Bei geteilten Beiträgen: Originaldaten unverändert mitspeichern */
 if(inItem)o.shared={title:inItem.title,text:inItem.text,url:inItem.url,received:inItem.received};
 Repo.put('posts',o).then(function(){return inboxId?Inbox.remove(inboxId):null}).then(function(){closeSheet();render();
  if(mode==='fakt'||mode==='behauptung')postToEntry(o.id,mode);else{toast('Beitrag gespeichert');if(inboxId)afterShareDecision()}})}
function postToEntry(pid,mode){
 var p=Repo.get('posts',pid);if(!p)return;
 entryForm(null,{title:postTitle(p),description:p.text,type:mode,status:'neu',topic:p.topic,postId:p.id,evidence:''})}
function postDetail(id){
 var p=Repo.get('posts',id);if(!p)return;
 var E=(p.convertedTo||[]).map(function(i){return Repo.get('entries',i)}).filter(Boolean);
 openSheet(sheetHead(p.handle?'Beitrag von @'+p.handle:'X-Beitrag','<div class="meta">'+(p.topic?'<span class="chip">'+esc(p.topic)+'</span>':'')+'<span class="chip tag">'+fmtDate(p.created)+'</span></div>')+
 '<p class="body" style="margin:0">'+esc(p.text||'(kein Text gespeichert)')+'</p>'+
 (p.url?'<p style="margin:0"><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer" style="color:var(--accent);overflow-wrap:anywhere">'+esc(p.url)+'</a></p>':'')+
 (p.note?'<dl><dt>Notiz</dt><dd>'+esc(p.note)+'</dd></dl>':'')+(p.shared?shareRaw({title:p.shared.title,text:p.shared.text,url:p.shared.url,received:p.shared.received}).replace('Sie werden beim Speichern mit abgelegt.','Über die Android-Teilen-Funktion empfangen.'):'')+
 '<div class="sec"><h2>Daraus erstellt ('+E.length+')</h2>'+(E.length?E.map(function(e){return '<button class="row" data-act="open-entry" data-id="'+esc(e.id)+'"><div><b>'+esc(e.title)+'</b><small>'+esc(TYPES[e.type]||e.type)+'</small></div>'+stChip(e.status)+'</button>'}).join(''):'<p class="note">Noch kein Eintrag aus diesem Beitrag erstellt.</p>')+'</div>'+
 '<div class="btns"><button class="btn" data-act="post-entry" data-id="'+esc(id)+'" data-v="fakt">Als Wissenseintrag</button><button class="btn" data-act="post-entry" data-id="'+esc(id)+'" data-v="behauptung">Als Behauptung</button></div>'+
 '<div class="btns"><button class="btn" data-act="edit-post" data-id="'+esc(id)+'">'+ic('edit',18)+'Bearbeiten</button><button class="btn danger" data-act="del-post" data-id="'+esc(id)+'">'+ic('trash',18)+'Löschen</button></div>')}
function postOrigin(e){
 var p=e.postId?Repo.get('posts',e.postId):null;if(!p)return '';
 return '<div class="sec"><h2>Herkunft</h2><button class="row" data-act="open-post" data-id="'+esc(p.id)+'"><div><b>X-Beitrag'+(p.handle?' von @'+esc(p.handle):'')+'</b><small>'+esc((p.text||p.url).slice(0,120))+'</small></div></button></div>'}

/* ================= Sicherung, Prüfung, Import ================= */
function buildExport(){var D=Repo.db;return {app:'DebateBase',version:3,schema:DB.VERSION,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),counts:counts(D),settings:{theme:D.settings.theme,synonyms:userSynonyms()},entries:D.entries,sources:D.sources,args:D.args,links:D.links,posts:D.posts}}
function pad(n){return (n<10?'0':'')+n}
function fileStamp(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'_'+pad(d.getHours())+'-'+pad(d.getMinutes())}
/* Echter Datei-Download: Android legt die Datei im Ordner „Downloads“ ab. */
function downloadExport(){
 var data,name='debatebase-sicherung-'+fileStamp()+'.json';
 try{data=JSON.stringify(buildExport(),null,2)}catch(e){toast('Export fehlgeschlagen: '+e.message,true);return}
 try{
  var blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},30000);
 }catch(e){toast('Download nicht möglich: '+e.message+'. Nutze „JSON anzeigen und kopieren“.',true);return}
 Repo.setMeta('lastExport',Date.now()).then(function(){if(ui.route!=='dashboard'||$('#overlay').hidden)render()},function(){});
 toast('Datei „'+name+'“ wird gespeichert (Ordner Downloads)');
 return name}
function daysSince(ts){return ts?Math.floor((Date.now()-ts)/DAY):null}

/* ================= Migrationsassistent =================
 * Schritt 1: Daten einfügen oder Datei wählen
 * Schritt 2: Vorschau mit Prüfergebnis und deinen Entscheidungen
 * Schritt 3: Ergebnis mit Nachkontrolle */
var mig=null;
var KNOWN={types:TYPES,status:STATUS,ltypes:LTYPES};
function currentData(){var o={};COLS.forEach(function(c){o[c]=Repo.db[c]});return o}
function migStart(){mig={step:1,text:'',fileName:'',a:null,mode:'merge',conflict:'skip',error:'',result:null,busy:false};migRender()}
function migRender(keepScroll){
 var s=$('#sheet'),top=s.scrollTop;
 if(mig.step===1)openSheet(migStep1());else if(mig.step===2)openSheet(migStep2());else openSheet(migStep3());
 if(keepScroll)s.scrollTop=top}
function migStep1(){
 return sheetHead('Daten übernehmen','<p class="note" style="margin:0">Schritt 1 von 3 · Daten einlesen</p>')+
 '<div class="card"><p style="color:var(--fg);margin:0 0 6px"><b>So holst du deine Daten aus Version 2:</b></p><ol class="steps">'+
 '<li>Version 2 in der Claude-App öffnen und unten auf <b>Optionen</b> tippen.</li>'+
 '<li><b>Vollständigen Export (JSON) anzeigen</b> und dann <b>JSON kopieren</b> tippen.</li>'+
 '<li>Hierher zurückkehren und den Text unten einfügen (lange auf das Feld tippen → Einfügen).</li></ol>'+
 '<p class="note" style="margin-top:8px">Bewahre den kopierten Text zusätzlich auf, z. B. per Mail an dich selbst. Version 2 bleibt unverändert, dort wird nichts gelöscht.</p></div>'+
 '<p class="note">Du kannst hier auch eine Sicherungsdatei von DebateBase 3 (.json) wählen.</p>'+
 '<div class="field"><label for="mig-text">Exportierter Text</label><textarea class="mono" id="mig-text" placeholder="{&quot;app&quot;:&quot;DebateBase&quot;, …}" spellcheck="false" autocapitalize="off">'+esc(mig.text)+'</textarea></div>'+
 '<div class="field"><label for="mig-file">Oder Datei wählen</label><input type="file" id="mig-file" accept=".json,application/json,text/plain">'+(mig.fileName?'<span class="note">Geladen: '+esc(mig.fileName)+'</span>':'')+'</div>'+
 (mig.error?'<div class="card alert"><p class="err">'+esc(mig.error)+'</p></div>':'')+
 '<p class="note">Beim Prüfen wird noch nichts gespeichert.</p>'+
 '<div class="btns"><button class="btn" data-act="close">Abbrechen</button><button class="btn primary" data-act="mig-check">Prüfen</button></div>'}
function migCheck(){
 var ta=$('#mig-text');if(ta)mig.text=ta.value;
 var p=Migrate.parse(mig.text);
 if(!p.ok){mig.error=p.error;migRender();return}
 var a=Migrate.analyze(p.data,currentData(),KNOWN);
 if(!a.ok){mig.error=a.errors.join(' ');migRender();return}
 mig.error='';mig.a=a;mig.mode='merge';mig.conflict='skip';mig.step=2;migRender()}
function listBlock(title,items,cls){
 if(!items.length)return '';
 return '<details class="card"'+(cls?' data-kind="'+cls+'"':'')+'><summary><b>'+esc(title)+' ('+items.length+')</b></summary><ul class="issues">'+items.slice(0,30).map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+(items.length>30?'<li>… und '+(items.length-30)+' weitere (siehe „Bericht kopieren“)</li>':'')+'</ul></details>'}
function migStep2(){
 var a=mig.a,empty=isEmptyDb(),plan=Migrate.build(a,currentData(),{mode:mig.mode,conflict:mig.conflict});mig.plan=plan;
 var nConf=a.conflicts.length;
 var rows=Migrate.COLS.map(function(c){var i=a.cols[c];if(!i.inFile)return '<dt>'+Migrate.LABEL[c]+'</dt><dd>–</dd>';
  var parts=[i.inFile+' in der Datei'];
  if(!empty){parts.push(i.neu.length+' neu');if(i.same.length)parts.push(i.same.length+' schon vorhanden');if(i.conflict.length)parts.push('<b>'+i.conflict.length+' Konflikte</b>')}
  if(i.invalid)parts.push('<span style="color:var(--danger)">'+i.invalid+' übersprungen</span>');
  return '<dt>'+Migrate.LABEL[c]+'</dt><dd>'+parts.join(' · ')+'</dd>'}).join('');
 var h=sheetHead('Vorschau','<p class="note" style="margin:0">Schritt 2 von 3 · Noch wurde nichts gespeichert</p>')+
 '<div class="card"><p style="color:var(--fg);margin:0 0 8px">Erkannt: <b>'+esc(a.format.label)+'</b>'+(a.format.exportedAt?'<br><small style="color:var(--muted)">Exportiert am '+esc(fmtIso(a.format.exportedAt))+'</small>':'')+'</p><dl>'+rows+'</dl></div>'+
 listBlock('Übersprungene Datensätze',a.skipped,'skipped')+listBlock('Hinweise',a.warnings,'warnings');
 if(!empty){
  h+='<div class="sec"><h2>Wie soll importiert werden?</h2><div class="pick">'+
  radio('mig-mode','merge',mig.mode,'<b>Zusammenführen</b> (empfohlen)<br><small>Deine vorhandenen Daten bleiben erhalten. Neue Datensätze kommen hinzu.</small>')+
  radio('mig-mode','replace',mig.mode,'<b>Komplett ersetzen</b><br><small>Alle Daten auf diesem Gerät werden durch den Inhalt der Datei ersetzt (Wiederherstellung).</small>')+'</div></div>';
  if(mig.mode==='merge'&&nConf){
   h+='<div class="sec"><h2>'+nConf+(nConf===1?' Konflikt':' Konflikte')+'</h2><p class="note">Diese Datensätze gibt es auf dem Gerät schon mit derselben ID, aber mit anderem Inhalt:</p>'+
   '<ul class="issues">'+a.conflicts.slice(0,5).map(function(k){return '<li>'+esc(Migrate.LABEL[k.col]+': '+(k.existing.title||k.existing.text||k.id))+'</li>'}).join('')+(nConf>5?'<li>… und '+(nConf-5)+' weitere</li>':'')+'</ul>'+
   '<div class="pick">'+
   radio('mig-conflict','skip',mig.conflict,'<b>Vorhandene behalten</b> (empfohlen)<br><small>Die Version aus der Datei wird nicht übernommen.</small>')+
   radio('mig-conflict','replace',mig.conflict,'<b>Durch Datei ersetzen</b><br><small>Die Version auf dem Gerät wird überschrieben.</small>')+
   radio('mig-conflict','copy',mig.conflict,'<b>Beide behalten</b><br><small>Die Version aus der Datei wird als Kopie mit neuer ID angelegt. Verweise werden angepasst.</small>')+'</div></div>'}
 }
 var willDelete=mig.mode==='replace'?counts(Repo.db):null;
 h+='<div class="card"><p style="color:var(--fg);margin:0"><b>Es werden '+plan.count+' Datensätze gespeichert.</b>'+
  (willDelete?'<br>Dabei werden die aktuellen '+willDelete.entries+' Einträge, '+willDelete.sources+' Quellen, '+willDelete.args+' Karten, '+willDelete.links+' Verknüpfungen und '+willDelete.posts+' X-Beiträge ersetzt.':'')+'</p>'+
  '<p class="note" style="margin-top:6px">Vorher wird automatisch eine Sicherung des aktuellen Stands angelegt. Der Import geschieht in einem Schritt: entweder vollständig oder gar nicht.</p></div>';
 if(mig.mode==='replace')h+='<div class="field"><label for="mig-word">Tippe ERSETZEN, um zu bestätigen</label><input id="mig-word" autocomplete="off" autocapitalize="characters" data-word="ERSETZEN"></div>';
 h+='<div class="btns"><button class="btn" data-act="mig-copy-report">Bericht kopieren</button></div>'+
 '<div class="btns"><button class="btn" data-act="mig-back">Zurück</button><button class="btn primary" id="mig-go" data-act="mig-apply"'+(plan.count&&mig.mode!=='replace'?'':' disabled')+'>'+(mig.mode==='replace'?'Ersetzen':'Importieren')+'</button></div>';
 return h}
function radio(name,val,cur,label){return '<label><input type="radio" name="'+name+'" value="'+val+'"'+(val===cur?' checked':'')+'><span>'+label+'</span></label>'}
function fmtIso(s){var d=new Date(s);return isNaN(d)?s:d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function migApply(){
 if(mig.busy)return;var plan=mig.plan;if(!plan||!plan.count)return;
 mig.busy=true;var go=$('#mig-go');if(go){go.disabled=true;go.textContent='Wird gespeichert …'}
 var reason=mig.mode==='replace'?'Vor Wiederherstellung aus Datei':'Vor Import';
 Repo.addBackup(reason).then(function(){
  return mig.mode==='replace'?Repo.replace(plan.write):Repo.bulkPut(plan.write)
 }).then(function(){return importSynonyms()}).then(function(){return DB.readAll()}).then(function(stored){
  var ver=Migrate.verify(plan,stored);
  mig.result={ok:true,ver:ver};
  return Repo.logMigration({at:Date.now(),format:mig.a.format.label,mode:plan.mode,conflict:plan.conflict,written:plan.count,verified:ver.ok,problems:ver.problems.length})
 }).catch(function(e){mig.result={ok:false,error:e&&e.message?e.message:String(e)}}).then(function(){
  mig.busy=false;mig.step=3;render();migRender()})}
/* Eigene verwandte Begriffe aus einer Sicherungsdatei übernehmen (zusammenführen, nichts löschen) */
function importSynonyms(){var p;try{p=Migrate.parse(mig.text).data}catch(e){return null}
 var inc=p&&p.settings&&Array.isArray(p.settings.synonyms)?p.settings.synonyms.filter(Array.isArray):[];if(!inc.length)return null;
 var cur=userSynonyms(),key=function(g){return g.map(Analyse.flat).sort().join('|')},have={};cur.forEach(function(g){have[key(g)]=1});
 var add=inc.map(function(g){return g.map(function(x){return String(x)})}).filter(function(g){return g.length>=2&&!have[key(g)]});
 return add.length?Repo.setSetting('synonyms',cur.concat(add)):null}
function migStep3(){
 var r=mig.result,plan=mig.plan,h;
 if(!r.ok){
  return sheetHead('Import nicht durchgeführt','<p class="note" style="margin:0">Schritt 3 von 3</p>')+
  '<div class="card alert"><p><b>Es wurde nichts geändert.</b> '+esc(r.error)+'</p></div>'+
  '<p class="note">Deine bisherigen Daten sind unverändert. Du kannst es erneut versuchen oder den Bericht kopieren und mir schicken.</p>'+
  '<div class="btns"><button class="btn" data-act="mig-copy-report">Bericht kopieren</button><button class="btn primary" data-act="mig-back">Zurück zur Vorschau</button></div>'}
 var v=r.ver;
 h=sheetHead(v.ok_all?'Import abgeschlossen':'Import mit Problemen','<p class="note" style="margin:0">Schritt 3 von 3 · Ergebnis</p>')+
 '<div class="card'+(v.ok_all?' welcome':' alert')+'"><p style="margin:0"><b>Nachkontrolle: '+v.ok+' von '+v.checked+' Datensätzen korrekt gespeichert.</b></p>'+
 (v.ok_all?'<p class="note" style="margin-top:6px">Alle Datensätze wurden nach dem Speichern neu gelesen und mit der Datei verglichen.</p>':'<ul class="issues">'+v.problems.slice(0,10).map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul><p class="note" style="margin-top:6px">Unter Einstellungen → Automatische Sicherungen kannst du den Stand vor dem Import wiederherstellen.</p>')+'</div>'+
 '<div class="card"><dl>'+Migrate.COLS.map(function(c){var s=plan.summary[c],p=[];if(s.neu)p.push(s.neu+' neu');if(s.ersetzt)p.push(s.ersetzt+' ersetzt');if(s.kopiert)p.push(s.kopiert+' als Kopie');if(s.behalten)p.push(s.behalten+' vorhandene behalten');if(s.gleich)p.push(s.gleich+' schon vorhanden');return '<dt>'+Migrate.LABEL[c]+'</dt><dd>'+(p.join(' · ')||'–')+'</dd>'}).join('')+'</dl>'+
 (plan.remapped?'<p class="note" style="margin-top:6px">'+plan.remapped+' Verweise wurden auf die neuen IDs umgeschrieben.</p>':'')+'</div>'+
 '<div class="card"><p style="color:var(--fg);margin:0"><b>Empfehlung:</b> Lade jetzt eine Sicherungsdatei herunter. Das ist deine erste echte Sicherung außerhalb der App.</p><button class="btn primary block" style="margin-top:10px" data-act="download">Sicherungsdatei herunterladen</button></div>'+
 '<div class="btns"><button class="btn" data-act="mig-copy-report">Bericht kopieren</button><button class="btn" data-act="close">Fertig</button></div>';
 return h}
function migReport(){return Migrate.report(mig.a||{format:null,cols:{},errors:[mig.error],warnings:[],skipped:[]},mig.step>=2?mig.plan:null,mig.result&&mig.result.ver)+(mig.result&&!mig.result.ok?'\nFehler beim Speichern: '+mig.result.error:'')}
function dangerSheet(kind){
 var w=kind==='wipe'?'LÖSCHEN':'ZURÜCKSETZEN',D=Repo.db;
 openSheet(sheetHead(kind==='wipe'?'Alle Daten löschen?':'Auf Beispieldaten zurücksetzen?')+
 '<div class="card"><p style="color:var(--fg)">Betroffen sind '+D.entries.length+' Einträge, '+D.sources.length+' Quellen, '+D.args.length+' Karten, '+D.links.length+' Verknüpfungen und '+D.posts.length+' X-Beiträge.'+(kind==='wipe'?' Danach ist die Datenbank leer.':' Deine eigenen Daten werden durch die Beispieldaten ersetzt.')+'</p></div>'+
 '<p class="note">Vor dem Vorgang wird automatisch eine Sicherung angelegt. Du kannst sie danach in den Einstellungen wiederherstellen. Es werden die letzten '+MAX_BACKUPS+' Sicherungen aufbewahrt. Exportiere wichtige Daten zusätzlich als JSON.</p>'+
 '<div class="field"><label for="dg-word">Tippe '+w+', um zu bestätigen</label><input id="dg-word" autocomplete="off" autocapitalize="characters" data-word="'+w+'"></div>'+
 '<div class="btns"><button class="btn" data-act="close">Abbrechen</button><button class="btn danger" id="dg-go" data-act="do-danger" data-v="'+kind+'" disabled>'+(kind==='wipe'?'Endgültig löschen':'Zurücksetzen')+'</button></div>')}
function doDanger(kind){
 Repo.addBackup(kind==='wipe'?'Vor Löschen aller Daten':'Vor Zurücksetzen').then(function(){
  return Repo.replace(kind==='wipe'?{}:seed())}).then(function(){closeSheet();render();toast(kind==='wipe'?'Alle Daten gelöscht':'Beispieldaten wiederhergestellt')})}
function restoreBackup(id){
 var bk=Repo.backups.filter(function(b){return b.id===id})[0];if(!bk||!bk.db)return;
 var data=JSON.parse(JSON.stringify(bk.db)); /* Kopie, bevor die Sicherungsliste sich ändert */
 Repo.addBackup('Vor Wiederherstellung').then(function(){return Repo.replace(data)}).then(function(){render();toast('Sicherung wiederhergestellt')})}

/* ================= Installation, Offline-Betrieb, Updates ================= */
var pwa={reg:null,waiting:null,prompt:null,standalone:false,offline:'pruefe',applying:false,error:''};
function isStandalone(){try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}}
function setupPWA(){
 pwa.standalone=isStandalone();
 window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();pwa.prompt=e;refreshPwaUi()});
 window.addEventListener('appinstalled',function(){pwa.prompt=null;toast('DebateBase wurde installiert');DB.requestPersist().then(function(p){Repo.persisted=p;refreshPwaUi()})});
 window.addEventListener('online',updateSaved);window.addEventListener('offline',updateSaved);
 if(!('serviceWorker' in navigator)){pwa.offline='nein';pwa.error='Dieser Browser unterstützt keine Service Worker.';return}
 navigator.serviceWorker.register('./service-worker.js').then(function(reg){
  pwa.reg=reg;
  if(reg.waiting&&navigator.serviceWorker.controller){pwa.waiting=reg.waiting;showUpdate()}
  reg.addEventListener('updatefound',function(){var nw=reg.installing;if(!nw)return;nw.addEventListener('statechange',function(){
   if(nw.state==='installed'){if(navigator.serviceWorker.controller){pwa.waiting=nw;showUpdate()}else{pwa.offline='ja';toast('DebateBase ist jetzt auch offline verfügbar');refreshPwaUi()}}
   else if(nw.state==='redundant'&&!navigator.serviceWorker.controller){pwa.offline='nein';pwa.error='Die App-Dateien konnten nicht gespeichert werden.';refreshPwaUi()}})});
  navigator.serviceWorker.ready.then(function(r){pwa.offline='ja';refreshPwaUi();if(r.active)r.active.postMessage('cacheFonts')});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')reg.update().catch(function(){})});
 }).catch(function(e){pwa.offline='nein';pwa.error=e&&e.message?e.message:String(e);refreshPwaUi()});
 navigator.serviceWorker.addEventListener('controllerchange',function(){if(pwa.applying){pwa.applying=false;location.reload()}});
}
function refreshPwaUi(){
 var a=document.activeElement,typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
 if((ui.route==='einstellungen'||ui.route==='dashboard')&&$('#overlay').hidden&&!typing&&Repo.db)render()}
function showUpdate(){var b=$('#update');if(b)b.hidden=false}
function applyUpdate(){
 if(!pwa.waiting){location.reload();return}
 pwa.applying=true;var b=$('#update [data-act=apply-update]');if(b){b.disabled=true;b.textContent='Wird aktualisiert …'}
 pwa.waiting.postMessage('skipWaiting')}
function installApp(){
 if(!pwa.prompt){toast('Bitte über das Chrome-Menü ⋮ → „App installieren“');return}
 var p=pwa.prompt;pwa.prompt=null;p.prompt();
 p.userChoice.then(function(c){if(c&&c.outcome!=='accepted')toast('Installation abgebrochen. Du kannst es später erneut versuchen.');refreshPwaUi()},function(){refreshPwaUi()})}
function installCard(){
 if(pwa.standalone||!pwa.prompt||Repo.db.meta.installHintHidden)return '';
 return '<div class="card welcome"><h3>Als App installieren</h3><p>Dann startet DebateBase vom Startbildschirm, ohne Browserleiste und auch ohne Internet.</p><div class="btns" style="margin-top:12px"><button class="btn primary" data-act="install">Installieren</button><button class="btn" data-act="hide-install">Später</button></div></div>'}
function viewApp(){
 var st=pwa.standalone?'Als App installiert':'Im Browser geöffnet';
 var off=pwa.offline==='ja'?'Bereit: startet auch ohne Internet':pwa.offline==='nein'?'Nicht verfügbar'+(pwa.error?' ('+esc(pwa.error)+')':''):'Wird vorbereitet …';
 var h='<section class="sec" id="sec-app"><h2>App</h2><div class="card"><dl><dt>Status</dt><dd>'+st+'</dd><dt>Offline</dt><dd>'+off+'</dd><dt>Internet</dt><dd>'+(navigator.onLine===false?'Keine Verbindung':'Verbunden')+'</dd><dt>Version</dt><dd>'+esc(APP_VERSION)+'</dd></dl></div>';
 if(!pwa.standalone){
  h+=pwa.prompt?'<button class="btn primary block" data-act="install">DebateBase als App installieren</button>':
  '<div class="card"><p style="color:var(--fg);margin:0 0 6px"><b>So installierst du DebateBase:</b></p><ol class="steps"><li>In Chrome oben rechts auf <b>⋮</b> tippen.</li><li><b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b> wählen.</li><li><b>Installieren</b> bestätigen. Das Symbol erscheint auf dem Startbildschirm.</li></ol><p class="note" style="margin-top:8px">Deine Daten bleiben dabei erhalten: Browser und App nutzen dieselbe Datenbank auf diesem Gerät.</p></div>'}
 h+='<button class="btn block" data-act="check-update">Nach Updates suchen</button></section>';
 return h}
function checkUpdate(){
 if(!pwa.reg){toast('Updates sind erst nach dem Laden der App-Dateien möglich.');return}
 if(navigator.onLine===false){toast('Keine Internetverbindung. Bitte später erneut versuchen.');return}
 pwa.reg.update().then(function(){setTimeout(function(){if(pwa.waiting)showUpdate();else toast('DebateBase ist auf dem neuesten Stand ('+APP_VERSION+')')},1500)},function(){toast('Update-Prüfung fehlgeschlagen',true)})}

/* ================= Einstellungen ================= */
function bkCounts(c){c=c||{};return (c.entries||0)+' Einträge, '+(c.sources||0)+' Quellen, '+(c.args||0)+' Karten, '+(c.links||0)+' Verknüpfungen, '+(c.posts||0)+' X-Beiträge'}
function viewSettings(){
 var th=Repo.db.settings.theme,D=Repo.db,ts=D.meta&&D.meta.lastSaved,iss=checkIntegrity();
 var prot=Repo.persisted===true?'Aktiv':Repo.persisted===false?'Nicht gewährt (Chrome entscheidet selbst; nach der Installation meist aktiv)':'Unbekannt';
 return '<section class="sec"><h2>Darstellung</h2><div class="seg">'+[['system','System'],['hell','Hell'],['dunkel','Dunkel']].map(function(p){return '<button data-act="set-theme" data-v="'+p[0]+'" aria-pressed="'+(th===p[0])+'">'+p[1]+'</button>'}).join('')+'</div></section>'+viewApp()+synSection()+
 '<section class="sec"><h2>Datensicherheit</h2><div class="card"><dl><dt>Einträge</dt><dd>'+D.entries.length+'</dd><dt>Quellen</dt><dd>'+D.sources.length+'</dd><dt>Karten</dt><dd>'+D.args.length+'</dd><dt>Verknüpfungen</dt><dd>'+D.links.length+'</dd><dt>X-Beiträge</dt><dd>'+D.posts.length+'</dd>'+
 '<dt>Speicher</dt><dd>'+(Repo.ready?'IndexedDB auf diesem Gerät':'Nur Arbeitsspeicher, geht beim Schließen verloren')+'</dd>'+
 '<dt>Schutz vor Löschen</dt><dd>'+prot+'</dd><dt>Belegt</dt><dd id="usage">…</dd><dt>Datenbank</dt><dd>Version '+DB.VERSION+'</dd>'+
 '<dt>Zuletzt gespeichert</dt><dd id="lastSaved">'+(ts?fmtSaved(ts):'–')+'</dd></dl></div>'+
 (Repo.error?'<div class="card alert"><p><b>Speicherfehler:</b> '+esc(Repo.error)+'</p></div>':'')+
 '<p class="note">Jede Änderung wird sofort automatisch gespeichert. Die Daten verlassen dein Gerät nicht.</p></section>'+
 '<section class="sec"><div class="sec-h"><h2>Datenprüfung</h2><button class="link" data-act="check-data">Erneut prüfen</button></div><div class="card">'+
 (iss.length?'<p style="color:var(--fg)">'+iss.length+(iss.length===1?' Auffälligkeit':' Auffälligkeiten')+' gefunden. Es wurde nichts verändert.</p><ul class="issues">'+iss.slice(0,10).map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+(iss.length>10?'<li>… und '+(iss.length-10)+' weitere</li>':'')+'</ul>':'<p style="color:var(--fg)">Keine Auffälligkeiten. Alle Verweise zeigen auf vorhandene Datensätze.</p>')+'</div></section>'+
 '<section class="sec"><h2>Automatische Sicherungen ('+Repo.backups.length+')</h2>'+
 (Repo.backups.length?Repo.backups.map(function(b){return '<div class="card bk"><div><b>'+fmtSaved(b.at)+'</b><small>'+esc(b.reason)+'</small><small>'+bkCounts(b.counts)+'</small></div><button class="btn" data-act="restore-backup" data-id="'+esc(b.id)+'">Wiederherstellen</button></div>'}).join(''):'<p class="note">Noch keine Sicherung. Vor jedem Import, Zurücksetzen, Löschen und Wiederherstellen wird automatisch eine angelegt (die letzten '+MAX_BACKUPS+' bleiben erhalten).</p>')+'</section>'+
 '<section class="sec" id="sec-backup"><h2>Datensicherung</h2><div class="card"><dl><dt>Letzte Sicherungsdatei</dt><dd>'+(D.meta.lastExport?fmtSaved(D.meta.lastExport):'noch nie')+'</dd></dl><button class="btn primary block" style="margin-top:10px" data-act="download">Sicherungsdatei herunterladen</button><p class="note" style="margin-top:8px">Speichert die gesamte Datenbank als JSON-Datei im Ordner „Downloads“. Lege sie zusätzlich an einem sicheren Ort ab, z. B. in Google Drive.</p></div>'+
 '<button class="btn block" data-act="export">JSON anzeigen und kopieren</button><textarea class="mono" id="exp" readonly hidden aria-label="Export"></textarea><button class="btn block" id="expCopy" data-act="copy-export" hidden>'+ic('copy',18)+'JSON kopieren</button></section>'+
 '<section class="sec" id="sec-import"><h2>Import und Wiederherstellung</h2><button class="btn block" data-act="open-migration">Daten übernehmen oder Sicherung wiederherstellen</button><p class="note">Für den Export aus Version 2 und für Sicherungsdateien. Du siehst vor dem Speichern eine Vorschau und entscheidest bei Konflikten selbst.</p>'+migLog()+'</section>'+
 '<section class="sec"><h2>X-Beiträge</h2><button class="btn block" data-act="new-post">'+ic('link',18)+'X-Beitrag erfassen</button>'+
 '<div class="card"><div class="meta"><b style="font-family:var(--f-display)">Android-Teilen</b>'+(pwa.standalone?'<span class="chip st st-belegt">Aktiv</span>':'<span class="chip st st-pruefung">Nach Installation</span>')+'</div><p style="margin-top:8px">In der X-App bei einem Beitrag auf <b>Teilen</b> tippen und <b>DebateBase</b> wählen. Der Beitrag landet zuerst im Eingang; du entscheidest danach, ob er gespeichert wird. DebateBase erscheint erst im Teilen-Menü, wenn die App installiert ist (siehe oben „App“).</p>'+(Inbox.items.length?'<button class="btn block" style="margin-top:10px" data-act="share-next">Eingang ansehen ('+Inbox.items.length+')</button>':'')+'</div></section>'+
 '<section class="sec"><h2>Zurücksetzen</h2><button class="btn block" data-act="reset-sample">Beispieldaten wiederherstellen</button><button class="btn block danger" data-act="wipe">Alle Daten löschen</button></section>'+
 '<p class="note">DebateBase '+esc(APP_VERSION)+'. Beispieldaten dienen nur zur Demonstration, bitte Fakten vor der Verwendung selbst prüfen.</p>'}
function migLog(){var L=(Repo.db.meta.migrations||[]).slice(-3).reverse();if(!L.length)return '';
 return '<div class="card"><p style="color:var(--fg);margin:0 0 4px"><b>Letzte Importe</b></p><ul class="issues">'+L.map(function(m){return '<li>'+fmtSaved(m.at)+': '+esc(m.format)+', '+(m.mode==='replace'?'ersetzt':'zusammengeführt')+', '+m.written+' Datensätze, Nachkontrolle '+m.verified+'/'+m.written+(m.problems?' – '+m.problems+' Probleme':' ✓')+'</li>'}).join('')+'</ul></div>'}
function paintUsage(){var el=$('#usage');if(!el)return;DB.estimate().then(function(e){if(!el.isConnected)return;el.textContent=e&&e.usage!=null?(e.usage/1048576).toFixed(2).replace('.',',')+' MB':'Unbekannt'})}

/* ================= Zusätzliche Ereignisse ================= */
document.addEventListener('change',function(ev){var i=ev.target.id;
 if(i==='f-type')toggleExtra();
 else if(i==='lk-type'||i==='lk-dir'||i==='lk-partner')updateLinkPreview();
 else if(i==='p-text')splitShared()});
document.addEventListener('paste',function(ev){if(ev.target.id==='p-text')setTimeout(splitShared,0)});
document.addEventListener('input',function(ev){if(ev.target.id==='dg-word'){$('#dg-go').disabled=ev.target.value.trim().toUpperCase()!==ev.target.dataset.word}
 else if(ev.target.id==='mig-word'){$('#mig-go').disabled=ev.target.value.trim().toUpperCase()!==ev.target.dataset.word||!(mig.plan&&mig.plan.count)}
 else if(ev.target.id==='mig-text'&&mig){mig.text=ev.target.value}});
function splitShared(){var t=$('#p-text'),u=$('#p-url');if(!t||!u||u.value.trim())return;var s=parseShared(t.value);if(s.url){u.value=s.url;t.value=s.text;toast('Link erkannt und abgetrennt')}}

/* ---------- Karten ---------- */
function entryCard(e,why){
 return '<article class="card" role="button" tabindex="0" data-act="open-entry" data-id="'+esc(e.id)+'"><div class="meta"><span class="chip">'+esc(TYPES[e.type]||e.type)+'</span>'+stChip(e.status)+'</div><h3>'+esc(e.title)+'</h3>'+((e.description||e.claimCore)?'<p class="clamp">'+esc(e.description||e.claimCore)+'</p>':'')+
 whyLine(why)+'<div class="foot">'+linkBadge('entries',e.id)+(e.topic?'<span>'+esc(e.topic)+'</span>':'')+(e.tags||[]).slice(0,3).map(function(t){return '<span class="chip tag">'+esc(t)+'</span>'}).join('')+'</div></article>'}
function argCard(a,why){
 return '<article class="card" role="button" tabindex="0" data-act="open-arg" data-id="'+esc(a.id)+'"><div class="meta">'+stChip(a.status)+(a.topic?'<span class="chip">'+esc(a.topic)+'</span>':'')+'</div><h3>'+esc(a.title)+'</h3>'+
 '<div class="cols"><div class="pane pro"><small>Behauptung</small><span class="clamp" style="-webkit-line-clamp:2">'+esc(a.claim)+'</span></div><div class="pane con"><small>Gegenargument</small><span class="clamp" style="-webkit-line-clamp:3">'+esc(a.counter)+'</span></div></div>'+whyLine(why)+(linksOf('args',a.id).length?'<div class="foot">'+linkBadge('args',a.id)+'</div>':'')+'</article>'}
function srcCard(s,why){
 var n=citedBy(s.id).length;
 return '<article class="card" role="button" tabindex="0" data-act="open-source" data-id="'+esc(s.id)+'"><div class="meta"><span class="chip">'+esc(s.kind)+'</span>'+(s.year?'<span class="chip tag">'+esc(s.year)+'</span>':'')+docChip(s)+'</div><h3>'+esc(s.title)+'</h3><p>'+esc(s.publisher||'')+'</p>'+whyLine(why)+'<div class="foot"><span>Zitiert in '+n+(n===1?' Eintrag':' Einträgen')+'</span></div></article>'}
function empty(t){return '<div class="empty">'+t+'</div>'}

/* ---------- Dashboard ---------- */
function isEmptyDb(){return COLS.every(function(c){return !Repo.all(c).length})}
function welcomeCard(){
 if(!Repo.ready)return '<div class="card alert"><h3>Speichern nicht möglich</h3><p>'+esc(Repo.error||'Die Datenbank konnte nicht geöffnet werden.')+' Änderungen gehen beim Schließen verloren. Bitte die Seite in Chrome (nicht im Inkognito-Modus) öffnen.</p></div>';
 if(!isEmptyDb())return '';
 return '<div class="card welcome"><h3>Willkommen bei DebateBase 3</h3><p>Deine Datenbank auf diesem Gerät ist noch leer. Übernimm deine Daten aus Version 2 oder schau dich mit Beispieldaten um.</p>'+
 '<div class="btns" style="margin-top:12px"><button class="btn primary" data-act="goto-import">Daten aus Version 2 übernehmen</button><button class="btn" data-act="load-sample">Beispieldaten laden</button></div></div>'}
function backupHint(){
 if(!Repo.ready||isEmptyDb())return '';var d=daysSince(Repo.db.meta.lastExport);
 if(d!==null&&d<14)return '';
 return '<div class="card"><p style="color:var(--fg);margin:0">'+(d===null?'Du hast noch keine Sicherungsdatei heruntergeladen.':'Deine letzte Sicherungsdatei ist '+d+' Tage alt.')+' Eine Datei schützt deine Daten, falls das Handy verloren geht oder Chrome zurückgesetzt wird.</p><button class="btn block" style="margin-top:10px" data-act="download">Sicherungsdatei herunterladen</button></div>'}
function viewDashboard(){
 var E=Repo.all('entries'),S=Repo.all('sources'),A=Repo.all('args');
 var open=E.filter(function(e){return e.type==='frage'||e.status==='pruefung'}).sort(function(a,b){return (b.updated||0)-(a.updated||0)});
 var recent=[].concat(E.map(function(o){return {k:'Wissen',a:'open-entry',o:o,t:o.created}}),S.map(function(o){return {k:'Quelle',a:'open-source',o:o,t:o.created}}),A.map(function(o){return {k:'Argument',a:'open-arg',o:o,t:o.created}})).sort(function(a,b){return b.t-a.t}).slice(0,6);
 var cnt={};E.forEach(function(e){cnt[e.status]=(cnt[e.status]||0)+1});
 var keys=Object.keys(STATUS).filter(function(k){return cnt[k]});
 return inboxCard()+welcomeCard()+installCard()+backupHint()+'<div class="tiles"><button class="tile" data-go="wissen"><b>'+E.length+'</b><span>Wissens&shy;einträge</span></button><button class="tile" data-go="quellen"><b>'+S.length+'</b><span>Quellen</span></button><button class="tile" data-go="argumente"><b>'+A.length+'</b><span>Argumentations&shy;karten</span></button></div><p class="note" style="margin-top:-8px">'+Repo.all('links').length+' Verknüpfungen · '+Repo.all('posts').length+' X-Beiträge</p>'+
 '<section class="sec"><h2>Neu anlegen</h2><div class="actions"><button class="btn primary" data-act="new-entry">'+ic('plus',18)+'Neuer Eintrag</button><button class="btn" data-act="new-source">'+ic('plus',18)+'Neue Quelle</button><button class="btn" data-act="new-arg">'+ic('plus',18)+'Neue Karte</button><button class="btn" data-act="new-research">'+ic('search',18)+'Neue Recherche</button><button class="btn block" style="grid-column:1/-1" data-act="new-post">'+ic('link',18)+'X-Beitrag erfassen</button></div></section>'+
 '<section class="sec"><div class="sec-h"><h2>Offene Recherchen ('+open.length+')</h2></div>'+(open.length?open.map(function(e){return '<button class="row" data-act="open-entry" data-id="'+esc(e.id)+'"><div><b>'+esc(e.title)+'</b><small>'+esc(TYPES[e.type]||e.type)+(e.topic?' · '+esc(e.topic):'')+'</small></div>'+stChip(e.status)+'</button>'}).join(''):empty('Keine offenen Recherchen. Offene Fragen und Einträge „In Prüfung“ erscheinen hier.'))+'</section>'+
 (recent.length?'<section class="sec"><h2>Zuletzt hinzugefügt</h2>'+recent.map(function(r){return '<button class="row" data-act="'+r.a+'" data-id="'+esc(r.o.id)+'"><span class="kind">'+r.k+'</span><div><b>'+esc(r.o.title)+'</b><small>'+rel(r.t)+'</small></div></button>'}).join('')+'</section>':'')+
 (keys.length?'<section class="sec"><h2>Prüfstatus der Einträge</h2><div class="bar" role="img" aria-label="Verteilung der Prüfstatus">'+keys.map(function(k){return '<span style="flex:'+cnt[k]+';--c:var(--st-'+k+')"></span>'}).join('')+'</div><div class="legend">'+keys.map(function(k){return '<button class="chip st st-'+k+'" data-act="goto-status" data-v="'+k+'">'+STATUS[k]+' '+cnt[k]+'</button>'}).join('')+'</div></section>':'')}

/* ---------- Wissensbibliothek ---------- */
function viewLibrary(){
 var topics=allTopics();
 return '<div class="toolbar"><label class="search">'+ic('search',18)+'<input id="q" type="search" placeholder="Suchen: Titel, Inhalt, Tags, Quellen" value="'+esc(ui.q)+'" autocomplete="off" aria-label="Suche"></label>'+
 '<div class="chips" id="stChips"></div>'+
 '<div class="filters"><select class="sel" id="fType" aria-label="Inhaltstyp">'+opts(TYPES,ui.type,'Alle Typen')+'</select><select class="sel" id="fTopic" aria-label="Themengebiet">'+arrOpts(topics,ui.topic,'Alle Themen')+'</select><select class="sel" id="fSort" aria-label="Sortierung"><option value="relevanz"'+(ui.sort==='relevanz'?' selected':'')+'>Relevanz</option><option value="neu"'+(ui.sort==='neu'?' selected':'')+'>Neueste</option><option value="geaendert"'+(ui.sort==='geaendert'?' selected':'')+'>Geändert</option><option value="titel"'+(ui.sort==='titel'?' selected':'')+'>A bis Z</option></select></div>'+
 '<div class="resultline"><span id="count"></span><button class="link" data-act="reset-filters">Filter zurücksetzen</button></div></div><div id="list" class="stack"></div>'+
 '<button class="fab" data-act="new-entry" aria-label="Neuer Eintrag">'+ic('plus',22)+'Neu</button>'}
function paintStChips(){var el=$('#stChips');if(!el)return;var all=[['','Alle']].concat(Object.keys(STATUS).map(function(k){return [k,STATUS[k]]}));el.innerHTML=all.map(function(p){return '<button data-act="f-status" data-v="'+p[0]+'" aria-pressed="'+(ui.status===p[0])+'">'+p[1]+'</button>'}).join('')}
function paintList(){
 var all=Repo.all('entries'),q=ui.q.trim(),why={},partial=false;
 var L=all.filter(function(e){
  if(ui.type&&e.type!==ui.type)return false;if(ui.topic&&e.topic!==ui.topic)return false;if(ui.status&&e.status!==ui.status)return false;return true});
 if(q){var R=ranked('entries',L,q);L=R.items;why=R.why;partial=R.partial}
 /* Bei einer Suche mit „Relevanz“ bleibt die Reihenfolge nach Punkten; sonst wie bisher */
 if(!(q&&ui.sort==='relevanz'))L.sort(function(a,b){return ui.sort==='titel'?a.title.localeCompare(b.title,'de'):ui.sort==='geaendert'?(b.updated||0)-(a.updated||0):(b.created||0)-(a.created||0)});
 $('#list').innerHTML=L.length?(partial?PARTIAL_NOTE:'')+L.map(function(e){return entryCard(e,why[e.id])}).join(''):empty(all.length?'Keine Einträge gefunden. Passe Suche oder Filter an.':'Noch keine Einträge. Tippe auf „Neu“, um den ersten anzulegen.');
 $('#count').textContent=(partial?L.length+' Teiltreffer':L.length+' von '+all.length+' Einträgen')+(q&&L.length&&ui.sort==='relevanz'?' · nach Relevanz':'');paintStChips()}

/* ---------- Argumente ---------- */
function viewArgs(){return '<label class="search">'+ic('search',18)+'<input id="aq" type="search" placeholder="Karten durchsuchen" value="'+esc(ui.aq)+'" autocomplete="off" aria-label="Suche"></label><div id="alist" class="stack"></div><button class="fab" data-act="new-arg" aria-label="Neue Karte">'+ic('plus',22)+'Neu</button>'}
function paintArgs(){var L=Repo.all('args'),q=ui.aq.trim(),R=q?ranked('args',L,q):{items:L,why:{},partial:false};
 $('#alist').innerHTML=R.items.length?(R.partial?PARTIAL_NOTE:'')+R.items.map(function(a){return argCard(a,R.why[a.id])}).join(''):empty('Keine Argumentationskarten gefunden.')}

/* ---------- Quellen ---------- */
function viewSources(){return '<div class="toolbar"><label class="search">'+ic('search',18)+'<input id="sq" type="search" placeholder="Quellen durchsuchen" value="'+esc(ui.sq)+'" autocomplete="off" aria-label="Suche"></label><select class="sel" id="sKind" aria-label="Art">'+arrOpts(SKINDS,ui.skind,'Alle Arten')+'</select></div><div id="slist" class="stack"></div><button class="fab" data-act="new-source" aria-label="Neue Quelle">'+ic('plus',22)+'Neu</button>'}
function paintSources(){var L=Repo.all('sources').filter(function(s){return !ui.skind||s.kind===ui.skind}),q=ui.sq.trim(),R=q?ranked('sources',L,q):{items:L,why:{},partial:false};
 $('#slist').innerHTML=R.items.length?(R.partial?PARTIAL_NOTE:'')+R.items.map(function(s){return srcCard(s,R.why[s.id])}).join(''):empty('Keine Quellen gefunden.')}

/* ---------- Diskussionsmodus ---------- */
function viewDisc(){
 var cnt={};Repo.all('entries').forEach(function(e){(e.tags||[]).forEach(function(t){cnt[t]=(cnt[t]||0)+1})});
 var top=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]}).slice(0,8);
 return '<label class="search">'+ic('search',18)+'<input id="dq" type="search" placeholder="Stichwort aus der Diskussion" value="'+esc(ui.dq)+'" autocomplete="off" aria-label="Schnellsuche"></label>'+
 '<div class="chips"><button data-act="disc-only" aria-pressed="'+ui.donly+'">Nur belegte Einträge</button>'+top.map(function(t){return '<button data-act="disc-tag" data-v="'+esc(t)+'" aria-pressed="false">'+esc(t)+'</button>'}).join('')+'</div><button class="btn block" data-act="new-post">'+ic('link',18)+'X-Beitrag erfassen</button><div id="dres" class="stack"></div>'}
function paintDisc(){
 var q=ui.dq.trim(),el=$('#dres');
 if(!q){el.innerHTML=empty('Gib ein Stichwort ein oder tippe auf einen Tag. Treffer lassen sich mit einem Tipp als Text für X kopieren.')+postsSection();return}
 var ok=function(s){return !ui.donly||s==='belegt'};
 var sE=smartSearch('entries',Repo.all('entries').filter(function(e){return ok(e.status)}),q),sA=smartSearch('args',Repo.all('args').filter(function(a){return ok(a.status)}),q),sP=smartSearch('posts',Repo.all('posts'),q);
 /* Teiltreffer nur, wenn es in keinem Bereich einen vollständigen Treffer gibt */
 var partial=!sE.full.length&&!sA.full.length&&!sP.full.length,pick=function(r){return partial?r.partial:r.full};
 var why={};[sE,sA,sP].forEach(function(r){pick(r).forEach(function(x){why[x.doc.kind+':'+x.doc.id]=x})});
 var E=pick(sE).map(function(x){return x.doc.item}),A=pick(sA).map(function(x){return x.doc.item}),P=pick(sP).map(function(x){return x.doc.item});
 var h=partial&&(E.length||A.length||P.length)?PARTIAL_NOTE:'';
 if(E.length)h+='<h2>Wissen ('+E.length+')</h2>'+E.map(function(e){return '<article class="card"><div class="meta"><span class="chip">'+esc(TYPES[e.type]||e.type)+'</span>'+stChip(e.status)+'</div><h3>'+esc(e.title)+'</h3><p class="clamp">'+esc(e.description)+'</p>'+whyLine(why['entries:'+e.id])+'<div class="btns" style="margin-top:10px"><button class="btn" data-act="copyx" data-k="entries" data-id="'+esc(e.id)+'">'+ic('copy',18)+'Für X kopieren</button><button class="btn" data-act="open-entry" data-id="'+esc(e.id)+'">Öffnen</button></div></article>'}).join('');
 if(A.length)h+='<h2>Argumente ('+A.length+')</h2>'+A.map(function(a){return '<article class="card"><div class="meta">'+stChip(a.status)+'</div><h3>'+esc(a.title)+'</h3><div class="cols"><div class="pane con"><small>Gegenargument</small><span class="clamp">'+esc(a.counter)+'</span></div></div>'+whyLine(why['args:'+a.id])+'<div class="btns" style="margin-top:10px"><button class="btn" data-act="copyx" data-k="args" data-id="'+esc(a.id)+'">'+ic('copy',18)+'Für X kopieren</button><button class="btn" data-act="open-arg" data-id="'+esc(a.id)+'">Öffnen</button></div></article>'}).join('');
 if(P.length)h+='<h2>X-Beiträge ('+P.length+')</h2>'+P.map(function(p){return postCard(p,why['posts:'+p.id])}).join('');
 if(!h)h=empty('Nichts zu „'+esc(q)+'“ gefunden.');
 h+='<button class="btn block" data-act="disc-save">'+ic('plus',18)+'Als neuen Eintrag speichern</button>';
 el.innerHTML=h}

/* ---------- Darstellung ---------- */
function applyTheme(){var r=document.documentElement,t=Repo.db.settings.theme;if(t==='hell')r.setAttribute('data-theme','light');else if(t==='dunkel')r.setAttribute('data-theme','dark');else r.removeAttribute('data-theme');
 var dark=t==='dunkel'||(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);$('#themeBtn').innerHTML=ic(dark?'sun':'moon',22);
 document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.setAttribute('content',dark?'#0B1118':'#F1F4F9');m.removeAttribute('media')})}

/* ---------- Render ---------- */
function render(){
 var R=ROUTES.filter(function(r){return r[0]===ui.route})[0]||ROUTES[0];
 $('#title').textContent=R[1];$('#sub').textContent=R[4];document.title='DebateBase – '+R[1];updateSaved();
 $('#nav').innerHTML='<div>'+ROUTES.map(function(r){return '<a href="#'+r[0]+'" aria-label="'+r[1]+'"'+(r[0]===ui.route?' aria-current="page"':'')+'>'+ic(r[3],22)+'<span>'+r[2]+'</span></a>'}).join('')+'</div>';
 var v={dashboard:viewDashboard,wissen:viewLibrary,argumente:viewArgs,quellen:viewSources,diskussion:viewDisc,einstellungen:viewSettings}[R[0]];
 $('#view').innerHTML=v();
 if(R[0]==='wissen')paintList();if(R[0]==='argumente')paintArgs();if(R[0]==='quellen')paintSources();if(R[0]==='diskussion')paintDisc();
 if(R[0]==='einstellungen'){paintUsage()}
 applyTheme()}
function route(){var h=location.hash.slice(1);ui.route=ROUTES.some(function(r){return r[0]===h})?h:'dashboard';closeSheet();render();if(!ui.focusImport)window.scrollTo(0,0)}

/* ---------- Ereignisse ---------- */
function delDone(kind,id,msg){var c={entry:'entries',source:'sources',arg:'args'}[kind];Repo.remove(c,id).then(function(){closeSheet();render();toast(msg)})}
document.addEventListener('click',function(ev){
 var go=ev.target.closest('[data-go]');if(go){location.hash=go.dataset.go;return}
 if(ev.target.id==='overlay'){closeSheet();return}
 var b=ev.target.closest('[data-act]');if(!b)return;
 var a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 switch(a){
  case 'close':closeSheet();break;
  case 'toggle-theme':var cur=document.documentElement.getAttribute('data-theme');var dark=cur?cur==='dark':matchMedia('(prefers-color-scheme: dark)').matches;Repo.setSetting('theme',dark?'hell':'dunkel');applyTheme();if(ui.route==='einstellungen')render();break;
  case 'set-theme':Repo.setSetting('theme',v);render();break;
  case 'new-entry':entryForm(null,ui.route==='wissen'&&ui.topic?{topic:ui.topic}:null);break;
  case 'new-research':entryForm(null,{type:'frage',status:'pruefung'});break;
  case 'new-source':sourceForm();break;
  case 'new-arg':argForm();break;
  case 'open-entry':entryDetail(id);break;
  case 'open-source':sourceDetail(id);break;
  case 'open-arg':argDetail(id);break;
  case 'edit-entry':entryForm(id);break;
  case 'edit-source':sourceForm(id);break;
  case 'edit-arg':argForm(id);break;
  case 'del-entry':if(armed(b))delDone('entry',id,'Eintrag gelöscht');break;
  case 'del-source':if(armed(b))delDone('source',id,'Quelle gelöscht');break;
  case 'del-arg':if(armed(b))delDone('arg',id,'Karte gelöscht');break;
  case 'copyx':copy(xText(b.dataset.k,Repo.get(b.dataset.k,id)),'Text für X kopiert');break;
  case 'addtag':var ti=$('#f-tags');ti.value=(ti.value.trim()?ti.value.trim().replace(/,$/,'')+', ':'')+v;b.remove();break;
  case 'f-status':ui.status=v;paintList();break;
  case 'reset-filters':ui.q=ui.type=ui.topic=ui.status='';ui.sort='relevanz';render();break;
  case 'goto-status':ui.status=v;ui.q=ui.type=ui.topic='';location.hash='wissen';if(ui.route==='wissen')render();break;
  case 'disc-only':ui.donly=!ui.donly;b.setAttribute('aria-pressed',ui.donly);paintDisc();break;
  case 'disc-tag':ui.dq=v;$('#dq').value=v;paintDisc();break;
  case 'disc-save':entryForm(null,{title:ui.dq.trim()});break;
  case 'export':var x=$('#exp');x.value=JSON.stringify(buildExport(),null,2);x.hidden=false;$('#expCopy').hidden=false;x.focus();x.select();break;
  case 'copy-export':copy($('#exp').value,'Export kopiert');break;
  case 'mig-check':migCheck();break;
  case 'mig-back':mig.step=mig.step===3?2:1;mig.result=null;if(mig.step===2){var cur=Migrate.analyze(Migrate.parse(mig.text).data,currentData(),KNOWN);mig.a=cur}migRender();break;
  case 'mig-apply':migApply();break;
  case 'mig-copy-report':copy(migReport(),'Bericht kopiert');break;
  case 'download':downloadExport();break;
  case 'install':installApp();break;
  case 'share-next':if(Inbox.items[0])shareSheet(Inbox.items[0].id);break;
  case 'share-open-dup':postDetail(id);break;
  case 'share-discard':if(armed(b,'Wirklich verwerfen?')&&shareCur){Inbox.remove(shareCur.id).then(function(){closeSheet();toast('Geteilten Beitrag verworfen');afterShareDecision()})}break;
  case 'hide-install':Repo.setMeta('installHintHidden',Date.now()).then(render);break;
  case 'apply-update':applyUpdate();break;
  case 'check-update':checkUpdate();break;
  case 'reset-sample':dangerSheet('reset');break;
  case 'wipe':dangerSheet('wipe');break;
  case 'do-danger':doDanger(v);break;
  case 'restore-backup':if(armed(b,'Sicher? Tippen'))restoreBackup(id);break;
  case 'check-data':render();toast('Datenprüfung abgeschlossen');break;
  case 'goto-import':case 'open-migration':migStart();break;
  case 'load-sample':if(isEmptyDb())Repo.replace(seed()).then(function(){render();toast('Beispieldaten geladen')});break;
  case 'new-post':postForm();break;
  case 'open-post':postDetail(id);break;
  case 'edit-post':postForm(id);break;
  case 'del-post':if(armed(b)){Repo.remove('posts',id).then(function(){closeSheet();render();toast('Beitrag gelöscht')})}break;
  case 'post-entry':closeSheet();postToEntry(id,v);break;
  case 'open-item':openItem(b.dataset.k,id);break;
  case 'new-link':linkForm(null,b.dataset.ck,b.dataset.cid);break;
  case 'link-related':linkForm(null,b.dataset.ck,b.dataset.cid,v);break;
  case 'save-syn':var sg=parseSynText($('#syn-text').value);Repo.setSetting('synonyms',sg).then(function(){render();toast(sg.length?sg.length+(sg.length===1?' Gruppe gespeichert':' Gruppen gespeichert'):'Eigene Begriffe entfernt')});break;
  case 'edit-link':linkForm(id,b.dataset.ck,b.dataset.cid);break;
  case 'back-item':openItem(b.dataset.ck,b.dataset.cid);break;
  case 'del-link':if(armed(b,'Löschen?')){var ck=b.dataset.ck,cid=b.dataset.cid;Repo.remove('links',id).then(function(){render();openItem(ck,cid);toast('Verknüpfung gelöscht')})}break;
 }});
document.addEventListener('keydown',function(ev){
 if(ev.key==='Escape'&&!$('#overlay').hidden){closeSheet();return}
 if((ev.key==='Enter'||ev.key===' ')&&ev.target.getAttribute&&ev.target.getAttribute('role')==='button'){ev.preventDefault();ev.target.click()}});
document.addEventListener('input',function(ev){var i=ev.target.id;
 if(i==='q'){ui.q=ev.target.value;paintList()}else if(i==='aq'){ui.aq=ev.target.value;paintArgs()}else if(i==='sq'){ui.sq=ev.target.value;paintSources()}else if(i==='dq'){ui.dq=ev.target.value;paintDisc()}});
document.addEventListener('change',function(ev){var i=ev.target.id,v=ev.target.value;
 if(i==='fType'){ui.type=v;paintList()}else if(i==='fTopic'){ui.topic=v;paintList()}else if(i==='fSort'){ui.sort=v;paintList()}else if(i==='sKind'){ui.skind=v;paintSources()}else if(i==='s-coi'){var cf=$('#s-conflicts-f');if(cf)cf.hidden=v!=='ja'}
 else if(i==='mig-file'&&ev.target.files[0]){var fl=ev.target.files[0],r=new FileReader();r.onload=function(){mig.text=String(r.result);mig.fileName=fl.name+' ('+Math.round(fl.size/1024)+' KB)';mig.error='';migRender()};r.onerror=function(){mig.error='Die Datei konnte nicht gelesen werden.';migRender()};r.readAsText(fl)}
 else if(ev.target.name==='mig-mode'){mig.mode=v;migRender(true)}else if(ev.target.name==='mig-conflict'){mig.conflict=v;migRender(true)}});
document.addEventListener('submit',function(ev){ev.preventDefault();var f=ev.target,k=f.dataset.form;if(k==='entry')saveEntry(f);else if(k==='source')saveSource(f);else if(k==='arg')saveArg(f);else if(k==='link')saveLink(f);else if(k==='post')savePost(f,ev.submitter&&ev.submitter.value)});
window.addEventListener('hashchange',route);
/* Speicherfehler wurden bereits angezeigt; nicht zusätzlich als unbehandelt melden. */
window.addEventListener('unhandledrejection',function(ev){if(ev.reason&&ev.reason.shown)ev.preventDefault()});
if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(Repo.db)applyTheme()})}catch(e){}

/* ---------- Start ---------- */
DB.onBlocked=function(){toast('Bitte andere geöffnete DebateBase-Tabs schließen.',true)};
DB.onVersionChange=function(){Repo.ready=false;updateSaved();toast('Eine neue Version ist aktiv. Bitte die App neu laden.',true)};
setupPWA();
Repo.load().then(function(){return Inbox.load()}).then(function(){
 updateSaved();route();
 var qs=new URLSearchParams(location.search),sid=qs.get('geteilt');
 if(qs.has('geteilt')||qs.has('teilenfehler')||qs.has('quelle'))history.replaceState(null,'',location.pathname+location.hash);
 if(qs.has('teilenfehler'))toast('Der geteilte Inhalt konnte nicht übernommen werden. Bitte erneut teilen.',true);
 else if(sid&&Inbox.get(sid))shareSheet(sid);
 else if(sid&&Inbox.items.length)shareSheet(Inbox.items[0].id);
 var iss=Repo.ready?checkIntegrity():[];
 if(iss.length)toast('Datenprüfung: '+iss.length+' Auffälligkeiten, siehe Einstellungen',true);
 return DB.requestPersist().then(function(p){Repo.persisted=p;if(ui.route==='einstellungen')render()});
});
/* Für automatische Tests */
window.DebateBase={docFor:docFor,smartSearch:smartSearch,Inbox:Inbox,analyzeShare:analyzeShare,Repo:Repo,checkIntegrity:checkIntegrity,buildExport:buildExport,version:APP_VERSION,pwa:pwa};
})();
