const KEY="naam_jap_v7";
const NAAMS=[
 {id:"radha",hi:"राधा",en:"Radha",group:"Radha"},
 {id:"radhe",hi:"राधे राधे",en:"Radhe Radhe",group:"Radha"},
 {id:"shri-radha",hi:"श्री राधा",en:"Shri Radha",group:"Radha"},
 {id:"krishna",hi:"कृष्ण",en:"Krishna",group:"Krishna"},
 {id:"govind",hi:"गोविंद",en:"Govind",group:"Krishna"},
 {id:"gopal",hi:"गोपाल",en:"Gopal",group:"Krishna"},
 {id:"shyam",hi:"श्याम",en:"Shyam",group:"Krishna"},
 {id:"madhav",hi:"माधव",en:"Madhav",group:"Krishna"},
 {id:"hari",hi:"हरि",en:"Hari",group:"Hari"},
 {id:"ram",hi:"राम",en:"Ram",group:"Ram"},
 {id:"shri-ram",hi:"श्री राम",en:"Shri Ram",group:"Ram"},
 {id:"siyaram",hi:"सिया राम",en:"Siya Ram",group:"Ram"},
 {id:"om",hi:"ॐ",en:"Om",group:"Mantra"},
 {id:"om-namah-shivaya",hi:"ॐ नमः शिवाय",en:"Om Namah Shivaya",group:"Shiva"},
 {id:"shiv",hi:"शिव",en:"Shiv",group:"Shiva"},
 {id:"mahadev",hi:"महादेव",en:"Mahadev",group:"Shiva"},
 {id:"narayan",hi:"नारायण",en:"Narayan",group:"Vishnu"},
 {id:"hare-krishna",hi:"हरे कृष्ण हरे कृष्ण",en:"Hare Krishna Hare Krishna",group:"Maha Mantra"},
 {id:"hare-rama",hi:"हरे राम हरे राम",en:"Hare Rama Hare Rama",group:"Maha Mantra"},
 {id:"full-mahamantra",hi:"हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे\nहरे राम हरे राम, राम राम हरे हरे",en:"Hare Krishna Hare Krishna, Krishna Krishna Hare Hare\nHare Rama Hare Rama, Rama Rama Hare Hare",group:"Maha Mantra"}
];

const I={
 en:{
  welcome:"A simple offline companion for Naam Jap.",chooseLanguage:"Choose your language",chooseNaam:"Choose your Jap Naam",continue:"Continue",changeLater:"You can change these anytime in Settings.",
  selectedNaam:"Selected Naam",todayJap:"Today's Jap",mala:"Mala",startJap:"Start Jap",totalJap:"Total Jap",totalMala:"Total Mala",goal:"Current Goal",dailySmaran:"Aaj ka Smaran",beforeJap:"Jap se pehle",japWith:"Jap with",back:"Back",undo:"Undo",pause:"Pause",finish:"Finish",reminder:"Smaran",countReminder:"Ginti se zyada bhav aur niyamit Naam Smaran par dhyan dein.",myNaam:"My Naam",addNaam:"Add",sankalp:"Sankalp",goalNaam:"Jap Naam",target:"Target Jap",deadline:"Deadline (optional)",saveGoal:"Save Sankalp",history:"Sadhana History",export:"Export",certificate:"Certificates",settings:"Settings",language:"Language",defaultNaam:"Default Jap Naam",tapGuard:"Fast-tap protection",volumeNote:"Volume buttons",volumeNoteText:"Web preview cannot reliably capture Android volume keys. The native Android version can add this bridge later.",data:"Local Data",dataText:"All practice data in this MVP stays on this device/browser.",reset:"Reset all local data",home:"Home",naam:"Naam",naamJap:"Jap",profile:"Profile",myProfile:"My Profile",edit:"Edit",summary:"Summary",daysPracticed:"Days",naamSummary:"Naam Jap Summary",goalSummary:"Sankalp Summary",profileName:"Your name",saveProfile:"Save Profile",sound:"Jap Sound",soundOn:"Sound On",soundOff:"Sound Off",profileHint:"Your profile stays on this device.",certificateSystem:"Certificate Milestones",certificateSystemText:"Certificates unlock automatically when the required Naam Jap total is genuinely completed.",certificateProgress:"Certificate Progress",unlocked:"Unlocked",remaining:"remaining",nextCertificate:"Next certificate"
 },
 hi:{
  welcome:"Naam Jap ke liye ek saral offline saathi.",chooseLanguage:"Apni bhasha chunen",chooseNaam:"Apna Jap Naam chunen",continue:"Aage badhein",changeLater:"In settings ko baad mein bhi badla ja sakta hai.",
  selectedNaam:"Chuna hua Naam",todayJap:"Aaj ka Jap",mala:"Mala",startJap:"Jap shuru karein",totalJap:"Kul Jap",totalMala:"Kul Mala",goal:"Vartaman Sankalp",dailySmaran:"Aaj ka Smaran",beforeJap:"Jap se pehle",japWith:"Jap",back:"Wapas",undo:"Undo",pause:"Rokein",finish:"Samapt",reminder:"Smaran",countReminder:"Ginti se zyada bhav aur niyamit Naam Smaran par dhyan dein.",myNaam:"Mere Naam",addNaam:"Joden",sankalp:"Sankalp",goalNaam:"Jap Naam",target:"Lakshya Jap",deadline:"Antim din (optional)",saveGoal:"Sankalp save karein",history:"Sadhana History",export:"Export",certificate:"Certificates",settings:"Settings",language:"Bhasha",defaultNaam:"Default Jap Naam",tapGuard:"Tez tap suraksha",volumeNote:"Volume buttons",volumeNoteText:"Web preview mein Android volume keys reliably capture nahi hote. Native Android version mein baad mein bridge add kiya ja sakta hai.",data:"Local Data",dataText:"Is MVP ka practice data isi device/browser mein rehta hai.",reset:"Sabhi local data reset karein",home:"Home",naam:"Naam",naamJap:"Jap",profile:"Profile",myProfile:"Mera Profile",edit:"Badlein",summary:"Saar",daysPracticed:"Din",naamSummary:"Naam Jap Saar",goalSummary:"Sankalp Saar",profileName:"Aapka naam",saveProfile:"Profile Save Karein",sound:"Jap Sound",soundOn:"Sound On",soundOff:"Sound Off",profileHint:"Aapka profile isi device par save rahega.",certificateSystem:"Certificate Milestones",certificateSystemText:"Required Naam Jap sach mein poora hone par certificate automatically unlock hoga.",certificateProgress:"Certificate Progress",unlocked:"Unlock ho gaya",remaining:"baaki",nextCertificate:"Agla certificate"
 }
};

const CERT_MILESTONES=[{id:"m108",target:108,titleEn:"First Mala",titleHi:"पहली माला",descEn:"108 Naam Jap",descHi:"108 नाम जाप"},{id:"m1008",target:1008,titleEn:"Sadhana Step",titleHi:"साधना चरण",descEn:"1,008 Naam Jap",descHi:"1,008 नाम जाप"},{id:"m10008",target:10008,titleEn:"Deep Sadhana",titleHi:"गहरी साधना",descEn:"10,008 Naam Jap",descHi:"10,008 नाम जाप"},{id:"m108000",target:108000,titleEn:"Naam Sankalp",titleHi:"नाम संकल्प",descEn:"1,08,000 Naam Jap",descHi:"1,08,000 नाम जाप"}];
const thoughts={
 en:["Naam Jap sirf ginti poori karna nahi; prem, shraddha aur smaran ka abhyas hai.","Man bhatak jaaye to nirash na hon. Prem se phir Naam ki or laut aayein.","Jahan sambhav ho, Jap ke liye saaf aur shaant sthaan chunen.","Apne Ishta Naam mein shraddha rakhein aur doosre bhakton ke Naam ka bhi samman karein.","Jap ko dikhawa ya competition na banayein. Niyamita aur bhav par dhyan dein.","Naam ke saath daya, satya, vinamrata aur seva ko jeevan mein lane ka prayas karein."],
 hi:["Naam Jap sirf ginti poori karna nahi; prem, shraddha aur smaran ka abhyas hai.","Man bhatak jaaye to nirash na hon. Prem se phir Naam ki ओर laut aayein.","Jahan sambhav ho, Jap ke liye saaf aur shaant sthaan chunen.","Apne Ishta Naam mein shraddha rakhein aur doosre bhakton ke Naam ka bhi samman karein.","Jap ko dikhawa ya competition na banayein. Niyamita aur bhav par dhyan dein.","Naam ke saath daya, satya, vinamrata aur seva ko jeevan mein lane ka prayas karein."]
};

let state;
let session={active:false,count:0,undone:0,lastTap:0,paused:false,start:0,history:[],lastMala:0};

function defaultState(){return {version:7,onboarded:false,lang:"hi",selected:"radhe",customNaams:[],favourites:[],counts:{},daily:{},sessions:[],goals:[],certificates:[],profile:{name:"",joined:todayKey()},settings:{tapGuard:"strict",sound:true,tapSound:true,malaSound:true,soundVolume:55},milestoneCertificates:{}}}
function load(){try{state=JSON.parse(localStorage.getItem(KEY))||defaultState()}catch(e){state=defaultState()} normalize()}
function normalize(){const d=defaultState();state={...d,...state,profile:{...d.profile,...(state.profile||{})},settings:{...d.settings,...(state.settings||{})},counts:state.counts||{},daily:state.daily||{},customNaams:state.customNaams||[],favourites:state.favourites||[],sessions:state.sessions||[],goals:state.goals||[],certificates:state.certificates||[],milestoneCertificates:state.milestoneCertificates||{}};if(!state.profile.name)state.profile.name=""}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function allNaams(){return NAAMS.concat(state.customNaams)}
function naamObj(id){return allNaams().find(n=>n.id===id)||NAAMS[1]}
function displayNaam(n){return state.lang==="hi"?n.hi:n.en}
function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function todayData(){const k=todayKey();if(!state.daily[k])state.daily[k]={};return state.daily[k]}
function totalFor(id){return Number(state.counts[id]||0)}
function totalAllJap(){return Object.values(state.counts).reduce((a,b)=>a+Number(b||0),0)}
function addCount(id,n){state.counts[id]=Math.max(0,totalFor(id)+n);const td=todayData();td[id]=Math.max(0,Number(td[id]||0)+n)}
function getToday(id){return Number((state.daily[todayKey()]||{})[id]||0)}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2400)}
function t(k){return (I[state.lang]||I.hi)[k]||k}
function applyLang(){document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));document.documentElement.lang=state.lang;render()}
function fillNaamSelect(sel,selected){if(!sel)return;sel.innerHTML="";const groups={};allNaams().forEach(n=>{if(!groups[n.group])groups[n.group]=[];groups[n.group].push(n)});Object.keys(groups).forEach(g=>{const og=document.createElement("optgroup");og.label=g;groups[g].forEach(n=>{const o=document.createElement("option");o.value=n.id;o.textContent=displayNaam(n);og.appendChild(o)});sel.appendChild(og)});const custom=document.createElement("option");custom.value="__custom";custom.textContent=state.lang==="hi"?"＋ अपना Naam जोड़ें":"＋ Add custom Naam";sel.appendChild(custom);const wanted=selected||state.selected||"radhe";sel.value=Array.from(sel.options).some(o=>o.value===wanted)?wanted:"radhe"}
function renderOnboard(){const sel=document.getElementById("onboardNaam");if(!sel)return;fillNaamSelect(sel,state.selected);const custom=document.getElementById("onboardCustom");if(custom)custom.classList.toggle("hidden",sel.value!=="__custom")}
function renderSoundControls(){const on=state.settings.sound!==false;const tap=state.settings.tapSound!==false;const mala=state.settings.malaSound!==false;const vol=Math.max(0,Math.min(100,Number(state.settings.soundVolume??55)));const all=document.getElementById("soundToggle"),tapBtn=document.getElementById("tapSoundToggle"),malaBtn=document.getElementById("malaSoundToggle"),r=document.getElementById("soundVolume"),lab=document.getElementById("soundVolumeLabel");if(all){all.textContent=on?"🔔 "+t("soundOn"):"🔕 "+t("soundOff");all.classList.toggle("off",!on)}if(tapBtn){tapBtn.textContent=(on&&tap)?"ON":"OFF";tapBtn.classList.toggle("off",!(on&&tap))}if(malaBtn){malaBtn.textContent=(on&&mala)?"ON":"OFF";malaBtn.classList.toggle("off",!(on&&mala))}if(r)r.value=vol;if(lab)lab.textContent=vol+"%"}
function render(){renderSoundControls();renderOnboard();const n=naamObj(state.selected);document.getElementById("homeNaam").textContent=displayNaam(n);document.getElementById("japNaam").textContent=displayNaam(n);document.getElementById("todayCount").textContent=getToday(n.id).toLocaleString();document.getElementById("todayMala").textContent=Math.floor(getToday(n.id)/108);document.getElementById("todayRemain").textContent=getToday(n.id)%108;document.getElementById("malaProgress").style.width=`${(getToday(n.id)%108)/108*100}%`;document.getElementById("totalCount").textContent=totalFor(n.id).toLocaleString();document.getElementById("totalMala").textContent=Math.floor(totalFor(n.id)/108).toLocaleString();const g=state.goals.find(x=>x.active);document.getElementById("goalText").textContent=g?`${Math.min(totalFor(g.naamId),g.target).toLocaleString()}/${g.target.toLocaleString()}`:"—";document.getElementById("dailyThought").textContent=thoughts[state.lang][new Date().getDate()%thoughts[state.lang].length];document.getElementById("guidanceList").innerHTML=(state.lang==="hi"?["Jahan sambhav ho, saaf aur shaant sthaan chunen.","Mobile ko Jap ke dauran anuchit ya gandi jagah par na rakhein.","Notifications aur doosre distractions ko kam karein.","Ek chune hue Naam par man lagane ka abhyas karein.","Naam Jap ko competition ya dikhawa na banayein."]:["Where possible, choose a clean and quiet place.","Keep the phone in a clean and appropriate place during Jap.","Reduce notifications and other distractions.","Practice bringing the mind back to your chosen Naam.","Do not turn Naam Jap into competition or display."]).map(x=>`<li>${x}</li>`).join("");fillNaamSelect(document.getElementById("goalNaam"),state.selected);fillNaamSelect(document.getElementById("defaultNaamSelect"),state.selected);document.getElementById("languageSelect").value=state.lang;document.getElementById("tapGuardSelect").value=state.settings.tapGuard;renderNaamList();renderGoals();renderMilestones();renderHistory();renderCertificates();renderProfile();renderSession();}

function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo(0,0)}
function openModal(html){document.getElementById("modalContent").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function addCustomNaam(){const inp=document.getElementById("newNaamInput");const text=inp.value.trim();if(!text){toast(state.lang==="hi"?"Naam likhiye":"Enter a Naam");return}const id="custom-"+Date.now();state.customNaams.push({id,hi:text,en:text,group:"Custom"});state.selected=id;save();closeModal();render();toast(state.lang==="hi"?"Naam add ho gaya":"Naam added")}
function renderNaamList(){const el=document.getElementById("naamList");el.innerHTML=allNaams().map(n=>{const fav=state.favourites.includes(n.id);return `<div class="list-item"><div class="list-main"><b>${escapeHtml(displayNaam(n))}</b><div class="tiny muted">${totalFor(n.id).toLocaleString()} Jap · ${Math.floor(totalFor(n.id)/108)} Mala</div></div><div class="list-actions"><button class="secondary small selectNaam" data-id="${n.id}">${n.id===state.selected?(state.lang==="hi"?"Chuna":"Selected"):(state.lang==="hi"?"Chunein":"Select")}</button><button class="secondary small favNaam" data-id="${n.id}">${fav?"♥":"♡"}</button></div></div>`}).join("");el.querySelectorAll(".selectNaam").forEach(b=>b.onclick=()=>{state.selected=b.dataset.id;save();render();showPage("home");});el.querySelectorAll(".favNaam").forEach(b=>b.onclick=()=>{const i=state.favourites.indexOf(b.dataset.id);if(i>=0)state.favourites.splice(i,1);else state.favourites.push(b.dataset.id);save();render();})}
function renderMilestones(){const total=totalAllJap(),el=document.getElementById("milestoneList");if(!el)return;el.innerHTML=CERT_MILESTONES.map(m=>{const done=total>=m.target,r=Math.max(0,m.target-total);return `<div class="milestone-row"><div class="milestone-icon">${done?"✓":"🏅"}</div><div class="milestone-main"><b>${state.lang==="hi"?m.titleHi:m.titleEn}</b><small>${state.lang==="hi"?m.descHi:m.descEn}</small></div><span class="milestone-status ${done?"done":""}">${done?t("unlocked"):`${r.toLocaleString()} ${t("remaining")}`}</span></div>`}).join("")}
function renderGoals(){const el=document.getElementById("goalList");if(!state.goals.length){el.innerHTML=`<div class="card muted">${state.lang==="hi"?"Abhi koi Sankalp nahi hai.":"No Sankalp yet."}</div>`;return}el.innerHTML=state.goals.map((g,i)=>{const c=Math.min(totalFor(g.naamId),g.target),pct=Math.min(100,c/g.target*100);return `<div class="goal-item"><div class="goal-top"><b>${escapeHtml(displayNaam(naamObj(g.naamId)))}</b><span>${c.toLocaleString()}/${g.target.toLocaleString()}</span></div><div class="goal-bar progress"><span style="width:${pct}%"></span></div><div class="tiny muted">${g.deadline?`Deadline: ${g.deadline}`:"No deadline"} · ${g.active?"Active":"Completed/Paused"}</div><div class="goal-actions"><button class="secondary small completeTest" data-i="${i}">${state.lang==="hi"?"Certificate check":"Certificate check"}</button><button class="danger small deleteGoal" data-i="${i}">${state.lang==="hi"?"Delete":"Delete"}</button></div></div>`}).join("");el.querySelectorAll(".deleteGoal").forEach(b=>b.onclick=()=>{state.goals.splice(Number(b.dataset.i),1);save();render()});el.querySelectorAll(".completeTest").forEach(b=>checkCertificate(state.goals[Number(b.dataset.i)]))}
function renderHistory(){const el=document.getElementById("historyList");const arr=state.sessions.slice().reverse().slice(0,50);el.innerHTML=arr.length?arr.map(s=>`<div class="history-item"><b>${escapeHtml(displayNaam(naamObj(s.naamId)))}</b><div>${s.count.toLocaleString()} Jap · ${Math.floor(s.count/108)} Mala</div><div class="tiny muted">${new Date(s.at).toLocaleString()}</div></div>`).join(""):`<div class="card muted">${state.lang==="hi"?"Abhi history khali hai.":"No history yet."}</div>`}
function renderCertificates(){const el=document.getElementById("certificateList");el.innerHTML=state.certificates.length?state.certificates.slice().reverse().map(c=>`<div class="cert-item"><div class="cert"><div>🪷</div><h3>Naam Jap<br>Completion Certificate</h3><p>This acknowledges completion of a self-recorded Naam Jap practice.</p><p class="cert-user-name"><b>${escapeHtml(state.profile.name||"Naam Sadhak")}</b></p><h4>${escapeHtml(c.naamId==="all"?(state.lang==="hi"?(CERT_MILESTONES.find(m=>m.id===c.milestoneId)?.titleHi||"Naam Jap"):(CERT_MILESTONES.find(m=>m.id===c.milestoneId)?.titleEn||"Naam Jap")):displayNaam(naamObj(c.naamId)))}</h4><b>${c.target.toLocaleString()} Jap</b><p class="tiny">Completed: ${c.date}</p><p class="cert-num">Certificate ID: ${c.id}</p><button class="secondary small printCert" data-id="${c.id}">${state.lang==="hi"?"Print / Save PDF":"Print / Save PDF"}</button></div></div>`).join(""):`<div class="card muted">${state.lang==="hi"?"Target poora hone par certificate yahan milega.":"Completed target certificates will appear here."}</div>`;el.querySelectorAll(".printCert").forEach(b=>b.onclick=()=>printCertificate(b.dataset.id))}

function renderProfile(){
 const name=state.profile.name||(state.lang==="hi"?"Naam Sadhak":"Naam Sadhak");
 const initial=(name.trim()[0]||"A").toUpperCase();
 document.getElementById("profileName").textContent=name;document.getElementById("profileMiniName").textContent=name;document.getElementById("profileAvatar").textContent=initial;document.getElementById("profileMiniAvatar").textContent=initial;document.getElementById("profileJoined").textContent="Naam Jap Sadhana · "+state.profile.joined;
 const total=Object.values(state.counts).reduce((a,b)=>a+Number(b||0),0);document.getElementById("profileTotalJap").textContent=total.toLocaleString();document.getElementById("profileTotalMala").textContent=Math.floor(total/108).toLocaleString();document.getElementById("profileDays").textContent=Object.keys(state.daily).filter(k=>Object.values(state.daily[k]||{}).some(v=>Number(v)>0)).length;
 const ns=allNaams().filter(n=>totalFor(n.id)>0).sort((a,b)=>totalFor(b.id)-totalFor(a.id));document.getElementById("profileNaamSummary").innerHTML=ns.length?ns.map(n=>`<div class="summary-row"><div class="summary-name"><b>${escapeHtml(displayNaam(n))}</b><span class="tiny muted">${Math.floor(totalFor(n.id)/108)} ${t("mala")} · ${totalFor(n.id)%108}/108</span></div><span class="badge">${totalFor(n.id).toLocaleString()}</span></div>`).join(""):`<p class="muted">${state.lang==="hi"?"Jap shuru karte hi aapke Naam yahan dikhne lagenge.":"Start Jap to see your Naam summary here."}`;
 const gs=state.goals.slice().reverse();document.getElementById("profileGoalSummary").innerHTML=gs.length?gs.map(g=>{const c=Math.min(totalFor(g.naamId),g.target),p=Math.min(100,c/g.target*100);return `<div class="summary-row"><div class="summary-name"><b>${escapeHtml(displayNaam(naamObj(g.naamId)))}</b><span class="tiny muted">${c.toLocaleString()}/${g.target.toLocaleString()}</span></div><span class="badge">${Math.round(p)}%</span></div>`}).join(""):`<p class="muted">${state.lang==="hi"?"Abhi koi Sankalp nahi hai.":"No Sankalp yet."}`;
 const next=CERT_MILESTONES.find(m=>total<m.target);document.getElementById("profileCertificateProgress").innerHTML=next?`<div class="cert-progress-next"><b>${t("nextCertificate")}: ${state.lang==="hi"?next.titleHi:next.titleEn}</b><div class="tiny muted">${(next.target-total).toLocaleString()} ${t("remaining")} · ${next.target.toLocaleString()} Jap</div></div>`:`<div class="cert-progress-next"><b>🏅 ${t("unlocked")}</b><div class="tiny muted">${state.lang==="hi"?"सभी milestones पूरे हो गए।":"All current milestones are unlocked."}</div></div>`;
}
function editProfile(){
 openModal(`<h2>${t("myProfile")}</h2><label>${t("profileName")}</label><input id="profileNameInput" maxlength="40" value="${escapeHtml(state.profile.name||"")}" placeholder="${state.lang==="hi"?"Jaise: Asish":"e.g. Asish"}"><p class="tiny muted">${t("profileHint")}</p><button id="saveProfile" class="primary wide">${t("saveProfile")}</button>`);
 document.getElementById("saveProfile").onclick=()=>{const v=document.getElementById("profileNameInput").value.trim();if(!v){toast(state.lang==="hi"?"Naam likhiye":"Enter your name");return}state.profile.name=v;save();closeModal();render();showPage("profile");toast(state.lang==="hi"?"Profile save ho gaya":"Profile saved")}
}
function switchProfileTab(tab){
 document.querySelectorAll(".profile-tab").forEach(b=>b.classList.toggle("active",b.dataset.profileTab===tab));
 document.querySelectorAll(".profile-panel").forEach(p=>p.classList.remove("active"));
 const id=tab==="summary"?"profileSummaryTab":tab==="history"?"profileHistoryTab":"profileCertificatesTab";
 document.getElementById(id).classList.add("active");
}

function renderSession(){document.getElementById("sessionCount").textContent=session.count.toLocaleString();document.getElementById("sessionMala").textContent=Math.floor(session.count/108);document.getElementById("sessionRemain").textContent=session.count%108;document.getElementById("sessionProgress").style.width=`${session.count%108/108*100}%`;document.getElementById("sessionPill").textContent=session.count.toLocaleString();document.getElementById("pauseBtn").textContent=session.paused?(state.lang==="hi"?"Jari rakhein":"Resume"):t("pause");const ss=document.getElementById("sessionSoundBtn");if(ss){ss.textContent=state.settings.sound?"🔔 "+t("soundOn"):"🔕 "+t("soundOff");ss.classList.toggle("off",!state.settings.sound)}document.getElementById("japButton").disabled=session.paused;document.getElementById("sessionStatus").textContent=session.paused?(state.lang==="hi"?"Jap filhaal roka gaya hai.":"Jap is paused."):session.active?(state.lang==="hi"?"Har sachet tap ko 1 Jap gina jayega.":"Each accepted tap counts as 1 Jap."):""}

let audioCtx=null;
function ensureAudio(){
 try{
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended")audioCtx.resume();
  return audioCtx;
 }catch(e){return null}
}
function tone(freq,when,duration,volume,type="sine"){
 const ctx=ensureAudio(); if(!ctx)return;
 const osc=ctx.createOscillator(), gain=ctx.createGain();
 const master=Math.max(0,Math.min(1,Number(state.settings.soundVolume??55)/100));
 osc.type=type; osc.frequency.setValueAtTime(freq,when);
 gain.gain.setValueAtTime(0.0001,when);
 gain.gain.exponentialRampToValueAtTime(Math.max(0.0001,volume*master),when+0.015);
 gain.gain.exponentialRampToValueAtTime(0.0001,when+duration);
 osc.connect(gain);gain.connect(ctx.destination);
 osc.start(when);osc.stop(when+duration+0.02);
}
function japSound(kind="tap"){
 if(state.settings.sound===false)return;
 if(kind==="mala" && state.settings.malaSound===false)return;
 if(kind!=="mala" && state.settings.tapSound===false)return;
 const ctx=ensureAudio(); if(!ctx)return;
 const now=ctx.currentTime;
 if(kind==="mala"){
  tone(523.25,now,.22,.055,"sine");tone(659.25,now+.16,.28,.055,"sine");tone(783.99,now+.32,.40,.065,"sine");
 }else tone(520,now,.075,.035,"triangle");
}

function startJap(){
 session={active:true,paused:false,count:0,lastMala:0,lastTap:0,history:[],startedAt:Date.now()};
 showPage("jap");
 renderSession();
}
function acceptTap(){
 if(!session.active) startJap();
 if(session.paused)return;
 const now=Date.now();
 if(state.settings.tapGuard==="strict" && session.lastTap && now-session.lastTap<420)return;
 if(state.settings.tapGuard==="normal" && session.lastTap && now-session.lastTap<220)return;
 session.lastTap=now;
 session.count++;
 session.history.push(1);
 addCount(state.selected,1);
 japSound("tap");
 if(typeof checkMilestoneCertificates==="function")checkMilestoneCertificates();
 const newMala=Math.floor(session.count/108);
 if(newMala>session.lastMala){
   session.lastMala=newMala;
   if(newMala>0)japSound("mala");
   toast(state.lang==="hi"?`🪷 ${newMala} ${t("mala")} complete`:`🪷 Mala ${newMala} complete`);
 }
 save();
 render();
 renderSession();
}
function undo(){if(!session.active||session.count<=0)return;if(session.history.length){session.history.pop();session.count--;addCount(state.selected,-1);session.undone++;save();renderSession();render()}}
function showMalaMessage(m){openModal(`<div style="text-align:center"><div style="font-size:45px">🌸</div><h2>${state.lang==="hi"?"एक माला पूर्ण":"One Mala Complete"}</h2><p>${state.lang==="hi"?`आपने 108 Naam Jap पूरे किए। यह ${m}वीं माला है।`:`You completed 108 Naam Jap. This is Mala ${m}.`}</p><p class="muted">${state.lang==="hi"?"गिनती से अधिक महत्वपूर्ण आपका भाव और नियमितता है।":"Your bhav and regularity matter more than the number."}</p><button id="malaClose" class="primary wide">${state.lang==="hi"?"आगे बढ़ें":"Continue"}</button></div>`);document.getElementById("malaClose").onclick=closeModal}
function finishSession(){if(!session.active)return;if(session.count>0)state.sessions.push({naamId:state.selected,count:session.count,at:new Date().toISOString()});session.active=false;save();render();showPage("home");toast(state.lang==="hi"?"Jap session save ho gaya":"Jap session saved")}
function checkMilestoneCertificates(){const total=totalAllJap();let unlocked=[];CERT_MILESTONES.forEach(m=>{if(total>=m.target&&!state.milestoneCertificates[m.id]){const id=`NJ-${m.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;const c={id,milestoneId:m.id,naamId:"all",target:m.target,date:todayKey()};state.milestoneCertificates[m.id]=c;state.certificates.push(c);unlocked.push(m)}});if(unlocked.length){save();showMilestoneUnlocked(unlocked[unlocked.length-1])}}
function showMilestoneUnlocked(m){openModal(`<div style="text-align:center"><div style="font-size:52px">🪷</div><h2>${state.lang==="hi"?"Certificate Unlock हुआ":"Certificate Unlocked"}</h2><p><b>${state.lang==="hi"?m.titleHi:m.titleEn}</b></p><p>${m.target.toLocaleString()} Naam Jap complete</p><p class="muted">${state.lang==="hi"?"यह self-recorded in-app completion acknowledgement है।":"This is a self-recorded in-app completion acknowledgement."}</p><button id="openNewCert" class="primary wide">${state.lang==="hi"?"Certificate देखें":"View Certificate"}</button></div>`);document.getElementById("openNewCert").onclick=()=>{closeModal();showPage("profile");switchProfileTab("certificates")}}
function checkGoalsForCertificate(){state.goals.forEach(g=>{if(g.active&&totalFor(g.naamId)>=g.target&&!state.certificates.some(c=>c.goalId===g.id)){g.active=false;const id=`NJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;state.certificates.push({id,goalId:g.id,naamId:g.naamId,target:g.target,date:todayKey()});showCertificateUnlocked(g)}})}
function checkCertificate(g){if(totalFor(g.naamId)>=g.target){checkGoalsForCertificate();render();toast(state.lang==="hi"?"Sankalp poora — certificate unlock ho gaya":"Sankalp complete — certificate unlocked")}else{toast(state.lang==="hi"?`Abhi ${(g.target-totalFor(g.naamId)).toLocaleString()} Jap baaki hain.`:`${(g.target-totalFor(g.naamId)).toLocaleString()} Jap remaining.`)}}
function showCertificateUnlocked(g){openModal(`<div style="text-align:center"><div style="font-size:48px">🪷</div><h2>${state.lang==="hi"?"Sankalp poorn":"Sankalp Complete"}</h2><p>${displayNaam(naamObj(g.naamId))} · ${g.target.toLocaleString()} Jap</p><p class="muted">${state.lang==="hi"?"Aapka in-app completion certificate tayyar hai.":"Your in-app completion certificate is ready."}</p><button id="viewCert" class="primary wide">${state.lang==="hi"?"Certificate dekhein":"View Certificate"}</button></div>`);document.getElementById("viewCert").onclick=()=>{closeModal();showPage("certificate")}}
function printCertificate(id){
 const c=state.certificates.find(x=>x.id===id);if(!c)return;
 const n=c.naamId==="all"?(CERT_MILESTONES.find(m=>m.id===c.milestoneId)?.titleEn||"Naam Jap Milestone"):displayNaam(naamObj(c.naamId));
 const w=window.open("","_blank");if(!w){toast(state.lang==="hi"?"Popup allow karein":"Allow popups");return}
 w.document.write(`<html><head><title>Naam Jap Certificate</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 @page{size:A4;margin:12mm}
 *{box-sizing:border-box}
 body{margin:0;font-family:Georgia,"Times New Roman",serif;background:#eef6ff;color:#172033;padding:18px}
 .cert{max-width:760px;margin:10px auto;background:linear-gradient(145deg,#ffffff 0%,#f0f7ff 52%,#f0fdf4 100%);border:3px solid #2563eb;border-radius:24px;padding:42px 38px;text-align:center;position:relative;overflow:hidden;box-shadow:0 14px 36px rgba(15,23,42,.14)}
 .cert:before{content:"";position:absolute;inset:10px;border:2px solid #16a34a;border-radius:18px;pointer-events:none}
 .top{position:relative;z-index:1;color:#1d4ed8;font:800 13px system-ui;letter-spacing:4px}
 .lotus{position:relative;z-index:1;font-size:64px;margin:8px 0}
 h1{position:relative;z-index:1;margin:4px 0;color:#1d4ed8;font-size:38px}
 h2{position:relative;z-index:1;margin:8px 0;color:#15803d;font-size:22px}
 .intro{position:relative;z-index:1;color:#475569}
 .person{position:relative;z-index:1;font-size:28px;font-weight:800;color:#172033;margin:20px 0 8px}
 .naam-label{position:relative;z-index:1;display:inline-block;padding:8px 18px;border-radius:999px;background:#dcfce7;color:#166534;font:800 16px system-ui;margin:4px 0 14px}
 .count{position:relative;z-index:1;font-size:30px;font-weight:900;color:#b45309;margin:10px}
 .date{position:relative;z-index:1;color:#475569}
 .id{position:relative;z-index:1;font:12px system-ui;color:#64748b;margin-top:22px}
 .footer{position:relative;z-index:1;margin-top:18px;color:#1d4ed8;font:700 12px system-ui;letter-spacing:1px}
 @media print{body{background:#fff;padding:0}.cert{box-shadow:none;margin:0;max-width:none}}
 </style></head><body><div class="cert">
 <div class="top">✦ NAAM JAP • NAAM SMARAN ✦</div>
 <div class="lotus">🪷</div>
 <h1>Naam Jap</h1><h2>Completion Certificate</h2>
 <p class="intro">This acknowledges completion of a self-recorded Naam Jap practice.</p>
 <div class="person">${escapeHtml(state.profile.name||"Naam Sadhak")}</div>
 <div class="naam-label">🙏 Naam Jap: ${escapeHtml(n)}</div>
 <div class="count">${c.target.toLocaleString()} Jap</div>
 <div class="date">Completed: ${c.date}</div>
 <div class="id">Certificate ID: ${c.id}</div>
 <div class="footer">श्रद्धा • नियमितता • नाम स्मरण</div>
 </div><script>window.print()<\/script></body></html>`);
 w.document.close()
}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`naam-jap-backup-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

function finishSplash(){const s=document.getElementById("splashScreen");if(s)setTimeout(()=>s.remove(),900)}
function init(){
 load();
 const onboard=document.getElementById("onboarding"), main=document.getElementById("mainApp");
 if(!state.onboarded){onboard.classList.remove("hidden");main.classList.add("hidden");renderOnboard()}
 else{onboard.classList.add("hidden");main.classList.remove("hidden")}

 const onboardNaam=document.getElementById("onboardNaam");
 if(onboardNaam) onboardNaam.addEventListener("change",e=>document.getElementById("onboardCustom").classList.toggle("hidden",e.target.value!=="__custom"));

 document.querySelectorAll(".choice-btn").forEach(b=>b.onclick=()=>{
   document.querySelectorAll(".choice-btn").forEach(x=>x.classList.remove("selected"));
   b.classList.add("selected");state.lang=b.dataset.lang;
   document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
   renderOnboard();
 });

 document.getElementById("finishOnboard").onclick=()=>{
   const s=document.getElementById("onboardNaam").value;
   if(!s){toast(state.lang==="hi"?"Pehle Naam chuniye":"Please choose a Naam");return}
   if(s==="__custom"){
     const v=document.getElementById("onboardCustom").value.trim();
     if(!v){toast(state.lang==="hi"?"Custom Naam likhiye":"Enter custom Naam");return}
     const id="custom-"+Date.now();state.customNaams.push({id,hi:v,en:v,group:"Custom"});state.selected=id;
   }else state.selected=s;
   openModal(`<h2>${t("profileName")}</h2><input id="firstProfileName" maxlength="40" placeholder="${state.lang==="hi"?"Apna naam likhiye":"Enter your name"}"><p class="tiny muted">${t("profileHint")}</p><button id="finishProfile" class="primary wide">${t("continue")}</button>`);
   document.getElementById("finishProfile").onclick=()=>{
     const v=document.getElementById("firstProfileName").value.trim();
     if(!v){toast(state.lang==="hi"?"Naam likhiye":"Enter your name");return}
     state.profile.name=v;state.onboarded=true;save();closeModal();
     onboard.classList.add("hidden");main.classList.remove("hidden");applyLang();showPage("home");
   };
 };

 // Core Jap controls
 document.getElementById("startJap").onclick=startJap;
 document.getElementById("backHome").onclick=()=>showPage("home");
 const japBtn=document.getElementById("japButton");
 if(japBtn){japBtn.onclick=acceptTap;japBtn.onpointerup=e=>{if(e.pointerType!=="mouse"){e.preventDefault();acceptTap()}}}
 document.getElementById("undoBtn").onclick=undo;
 document.getElementById("pauseBtn").onclick=()=>{if(session.active){session.paused=!session.paused;renderSession()}};
 document.getElementById("finishSessionBtn").onclick=finishSession;
 document.getElementById("sessionSoundBtn").onclick=()=>{
   state.settings.sound=!state.settings.sound;save();render();renderSession();
   if(state.settings.sound)japSound("tap");
 };

 // Navigation
 document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
 document.getElementById("profileTopBtn").onclick=()=>{showPage("profile");switchProfileTab("summary")};
 document.getElementById("editProfileBtn").onclick=editProfile;
 document.querySelectorAll(".profile-tab").forEach(b=>b.onclick=()=>switchProfileTab(b.dataset.profileTab));

 // Settings
 document.getElementById("soundToggle").onclick=()=>{state.settings.sound=state.settings.sound===false;save();render();if(state.settings.sound)japSound("tap")};
 document.getElementById("tapSoundToggle").onclick=()=>{state.settings.tapSound=state.settings.tapSound===false;save();render();if(state.settings.tapSound&&state.settings.sound)japSound("tap")};
 document.getElementById("malaSoundToggle").onclick=()=>{state.settings.malaSound=state.settings.malaSound===false;save();render();if(state.settings.malaSound&&state.settings.sound)japSound("mala")};
 document.getElementById("soundVolume").oninput=e=>{state.settings.soundVolume=Number(e.target.value);save();renderSoundControls()};
 document.getElementById("soundVolume").onchange=()=>{if(state.settings.sound)japSound("tap")};
 document.getElementById("addNaamBtn").onclick=()=>openModal(`<h2>${state.lang==="hi"?"Apna Naam joden":"Add custom Naam"}</h2><input id="newNaamInput" maxlength="60" placeholder="${state.lang==="hi"?"Naam likhiye":"Enter Naam"}"><button id="saveCustom" class="primary wide">${state.lang==="hi"?"Joden":"Add"}</button>`);

 // Modal
 document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
 document.getElementById("modalClose").onclick=closeModal;
 document.getElementById("modalContent").addEventListener("click",e=>{if(e.target.id==="saveCustom")addCustomNaam()});

 // Sankalp
 document.getElementById("goalForm").onsubmit=e=>{
   e.preventDefault();
   const id=document.getElementById("goalNaam").value,target=Math.floor(Number(document.getElementById("goalTarget").value)),deadline=document.getElementById("goalDeadline").value;
   if(!id||id==="__custom"||!Number.isFinite(target)||target<108){toast(state.lang==="hi"?"Target kam se kam 108 hona chahiye":"Target must be at least 108");return}
   state.goals.push({id:"goal-"+Date.now(),naamId:id,target,deadline,active:true});save();render();
   toast(state.lang==="hi"?"Sankalp save ho gaya":"Sankalp saved")
 };
 document.querySelectorAll(".goal-chip").forEach(b=>b.onclick=()=>document.getElementById("goalTarget").value=b.dataset.target);

 // Settings selectors
 document.getElementById("languageSelect").onchange=e=>{state.lang=e.target.value;save();applyLang();render()};
 document.getElementById("defaultNaamSelect").onchange=e=>{if(e.target.value!=="__custom"){state.selected=e.target.value;save();render()}};
 document.getElementById("tapGuardSelect").onchange=e=>{state.settings.tapGuard=e.target.value;save();render()};
 document.getElementById("exportBtn").onclick=exportData;
 document.getElementById("resetDataBtn").onclick=()=>{
   if(confirm(state.lang==="hi"?"Kya aap sab local data reset karna chahte hain?":"Reset all local data?")){
     localStorage.removeItem(KEY);location.reload()
   }
 };

 // Keyboard shortcut
 document.addEventListener("keydown",e=>{
   if(e.code==="Space"&&document.getElementById("jap").classList.contains("active")&&
      document.activeElement.tagName!=="INPUT"&&document.activeElement.tagName!=="SELECT"&&document.activeElement.tagName!=="TEXTAREA"){
     e.preventDefault();acceptTap()
   }
 });

 applyLang();
 try{render();}catch(e){console.error("Naam Jap render error:",e)}
 setTimeout(finishSplash,100);
}init();
/* v18: certificate Naam label helper. Existing certificate records remain untouched. */
window.formatCertificateNaam = function(record){
  if (!record) return "";
  const naam = record.naam || record.name || record.japNaam || record.japName || record.selectedNaam || "";
  return naam ? `Naam Jap: ${naam}` : "";
};
