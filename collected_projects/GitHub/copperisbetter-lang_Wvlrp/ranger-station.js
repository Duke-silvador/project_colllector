(()=>{
const $=s=>document.querySelector(s),dialog=$('#detail'),body=$('#detailBody'),title=$('#detailTitle');let returnFocus=null,muted=false;
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}},read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const config=window.RANGER_SCENE={image:'assets/ranger-station-v1.webp',startU:.50,pitch:-.08,spots:[
{id:'map',label:'Look at the West Virginia wall map',u:.156,v:.39,width:.10,height:.24},
{id:'official',label:'Read the project bulletin board',u:.27,v:.40,width:.095,height:.23},
{id:'visitors',label:'Read the visitor bulletin board',u:.765,v:.40,width:.10,height:.24},
{id:'coffee',label:'Pick up the coffee cup',u:.484,v:.55,width:.018,height:.045,url:'coffee-room.html'},
{id:'passport',label:'Open the passport',u:.526,v:.566,width:.028,height:.027},
{id:'radio',label:'Call the ranger on the CB radio',u:.576,v:.543,width:.046,height:.045},
{id:'signup',label:'Read the signup clipboard',u:.64,v:.578,width:.032,height:.04},
{id:'lost',label:'Look inside lost and found',u:.084,v:.617,width:.04,height:.07},
{id:'specimens',label:'Look at the field collection',u:.89,v:.49,width:.09,height:.16},
{id:'gator',label:'Examine the tiny reptile figure on the shelf',u:.884,v:.49,width:.016,height:.038},
{id:'waldo',label:'Inspect the striped miniature among the shelves',u:.935,v:.476,width:.014,height:.04},
{id:'exit',label:'Step outside',u:.016,v:.47,width:.065,height:.30,url:'woodland-fork.html'},
...Array.from({length:7},(_,i)=>({id:'note'+i,label:'Read desk note stack '+(i+1),u:.354+i*.041,v:.594,width:.034,height:.038}))]};
const feeds=[{id:'eastFeed',name:'East Bank',url:'east-bank.html',stream:'https://sacred-showtimes-volvo-foods.trycloudflare.com/eastbank/index.m3u8'},{id:'roostFeed',name:'The Roost',url:'the-roost.html',stream:'https://sacred-showtimes-volvo-foods.trycloudflare.com/roost/index.m3u8'}];
for(const f of feeds){const v=document.getElementById(f.id);f.video=v;f.lastProgress=0;f.lastTime=-1;f.state='Connecting';let hls,retry,timer;
 function attach(){clearTimeout(retry);if(hls)hls.destroy();f.state='Connecting';if(window.Hls&&Hls.isSupported()){hls=new Hls({backBufferLength:5,maxBufferLength:8,liveSyncDurationCount:4});hls.loadSource(f.stream);hls.attachMedia(v);hls.on(Hls.Events.MANIFEST_PARSED,()=>v.play().catch(()=>{f.state='Tap to play'}));hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal){f.state='Signal unavailable';retry=setTimeout(attach,6000)}})}else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=f.stream;v.play().catch(()=>{f.state='Tap to play'})}else f.state='Open camera page to watch'}
 v.addEventListener('timeupdate',()=>{if(v.currentTime!==f.lastTime){f.lastTime=v.currentTime;f.lastProgress=Date.now();f.state='Live'}});v.addEventListener('error',()=>{f.state='Signal unavailable'});v.addEventListener('click',()=>v.play().catch(()=>{}));attach();timer=setInterval(()=>{if(document.hidden)return;if(f.lastProgress&&Date.now()-f.lastProgress>20000){f.state='Reconnecting';attach()}const label=document.querySelector('[data-status="'+f.id+'"]');if(label)label.textContent=live(f)?'Live':f.state},5000);
 addEventListener('pagehide',()=>{clearInterval(timer);clearTimeout(retry);hls?.destroy()});}
function live(f){return f.lastProgress&&Date.now()-f.lastProgress<15000&&!f.video.paused}
window.rangerPosition=project=>{const p=project(.437,.5),monitor=$('#monitor'),w=p.f*.061*2*Math.PI/Math.max(p.z,.2),h=p.f*.08*Math.PI/Math.max(p.z,.2);Object.assign(monitor.style,{left:p.x+'px',top:p.y+'px',width:w+'px',height:h+'px',visibility:p.z>.25?'visible':'hidden'});const q=project(.576,.535);Object.assign($('#radioLamp').style,{left:q.x+'px',top:q.y+'px',visibility:q.z>.25?'visible':'hidden'})};
const inactiveFeeds=[
{name:'West Bank',state:'Not connected'},
{name:'South Hill',state:'Not connected'},
{name:'Infrared / Night Vision',state:'Not connected'},
{name:'Camera 6',state:'Not connected'}
];
let enlargedCleanup=[];
function stopEnlargedFeeds(){
 for(const stop of enlargedCleanup){try{stop()}catch{}}
 enlargedCleanup=[];
}
function openMonitor(){
 stopEnlargedFeeds();
 const running=feeds.map(f=>'<section class="feed-card"><div class="feed-player"><video data-enlarged="'+f.id+'" autoplay muted playsinline controls aria-label="'+f.name+' live view"></video></div><a class="feed-card-name" href="'+f.url+'">'+f.name+'</a><div class="feed-status" data-status="'+f.id+'">'+(live(f)?'Live':f.state)+'</div></section>').join('');
 const unused=inactiveFeeds.map(f=>'<section class="feed-card"><div class="feed-player feed-player-offline" aria-label="'+f.name+' not connected"><span>NO SIGNAL</span></div><span class="feed-card-name">'+f.name+'</span><div class="feed-status">'+f.state+'</div></section>').join('');
 show('monitor','The ranger’s six-camera monitor','<div class="feed-grid">'+running+unused+'</div><p class="secondary">East Bank and The Roost are connected camera feeds. The other four positions are reserved for future live systems.</p>');
 for(const f of feeds){
  const v=body.querySelector('[data-enlarged="'+f.id+'"]');
  if(!v)continue;
  let hls=null,stopped=false;
  const status=body.querySelector('[data-status="'+f.id+'"]');
  const setStatus=text=>{if(status)status.textContent=text};
  const onVideoTime=()=>{if(!stopped&&!v.paused&&v.readyState>=2)setStatus('Live')};
  v.addEventListener('timeupdate',onVideoTime);
  // Reuse the playing desk feed where media capture is supported to avoid
  // decoding duplicate live streams. Fall back to a fresh HLS connection.
  try{
   const captured=f.video.captureStream?.()||f.video.mozCaptureStream?.();
   if(captured&&captured.getVideoTracks().length){
    v.srcObject=captured;
    v.play().catch(()=>setStatus('Tap play to view'));
   }
  }catch{}
  if(!v.srcObject){
   if(window.Hls&&Hls.isSupported()){
    hls=new Hls({backBufferLength:5,maxBufferLength:8,liveSyncDurationCount:4});
    hls.loadSource(f.stream);
    hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED,()=>v.play().catch(()=>setStatus('Tap play to view')));
    hls.on(Hls.Events.ERROR,(_,error)=>{if(error.fatal)setStatus('Signal unavailable — open camera page')});
   }else if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src=f.stream;
    v.play().catch(()=>setStatus('Tap play to view'));
   }else setStatus('Open the camera page to watch');
  }
  enlargedCleanup.push(()=>{stopped=true;v.removeEventListener('timeupdate',onVideoTime);v.pause();if(hls)hls.destroy();v.srcObject=null;v.removeAttribute('src');v.load()});
 }
}
function show(id,heading,html){returnFocus=document.activeElement;title.textContent=heading;body.innerHTML=html;dialog.dataset.section=id;dialog.showModal();$('#menu').hidden=true;$('#menuButton').setAttribute('aria-expanded','false')}
window.rangerOpen=id=>{
if(id==='notes')return window.WVLRP_CASES?.openStack(0);
const stack=/^note([0-6])$/.exec(id);if(stack)return window.WVLRP_CASES?.openStack(Number(stack[1]));
if(id==='official')return window.WVLRP_CASES?.openBoard();
if(id==='passport')return window.WVLRP_CASES?.openPassport();
if(id==='lost')return window.WVLRP_CASES?.openLost();
if(id==='monitor')return openMonitor();
if(id==='official')show(id,'Project notices','<article class="note"><h3>West Virginia Live Research Project</h3><p>We do it live.</p><p>East Bank and The Roost are our current camera destinations. Bird and squirrel clearings are waiting for their dedicated live systems.</p></article><article class="note"><h3>Ranger station field desk</h3><p>The station is taking shape. Wildlife reports will use real sightings, camera images and observer credit as records become available.</p></article>');
if(id==='map')show(id,'West Virginia · Field destinations','<p>You are here: Ranger Station.</p><div class="map-links">'+[['adventures.html','Base Camp'],['woodland-trail.html','Woodland Trail'],['adventure-east-bank.html','East Bank Clearing'],['adventure-roost.html','The Roost Clearing'],['bird.html','Bird Clearing'],['squirrel.html','Squirrel Woods']].map(([url,label])=>'<a href="'+url+'">'+label+'</a>').join('')+'</div><p class="secondary">The wall map shows West Virginia; these links are project destinations, not surveyed positions.</p>');
if(id==='notes')show(id,'Ranger’s desk notes','<article class="note"><h3>A worried ranger</h3><p>Several things have gone missing while I have been out maintaining the camera systems. I need to take a proper inventory before I can work out what happened.</p></article><article class="note"><h3>Where have the nuts gone?</h3><p>A squirrel’s stored nuts are missing. Check the woodland reports.</p></article><article class="note"><h3>Honey, I miss you.</h3><p>The honeybees have lost their honey. There is more to look into here.</p></article><article class="note"><h3>Telephone message</h3><p>Caller reported a large shape near the trees. No information on file regarding Sasquatch or Bigfoot. Advised caller to contact the Kentucky Live Research Project for further inquiries.</p><p class="secondary">Fictional ranger’s note.</p></article><p class="secondary">These are early case notes. The clue trails are still being prepared.</p>');
if(id==='passport'){const visits=read('wvlrpRangerPassport',{firstVisit:new Date().toISOString()});save('wvlrpRangerPassport',visits);show(id,'Your woodland passport','<h3>Ranger Station</h3><p>First visit: '+new Date(visits.firstVisit).toLocaleDateString()+'</p><p>Your visit is recorded on this device.</p><p class="secondary">Watch-time stamps and drawing entries are still being arranged. This visit does not enter you in a drawing.</p>')}
if(id==='signup'){show(id,'Email signup clipboard','<p>Create a WVLRP account with your email to join the project.</p><button id="clipboardAccount">Sign In / Create Account</button>');$('#clipboardAccount').onclick=()=>{dialog.close();$('.wv-auth-pill')?.click()}}
if(id==='gator'){save('wvlrpRangerLittleGatorFound',true);show(id,'An unexpected little ranger','<p>A tiny alligator figurine sits among the old field collections. Someone scratched a single word underneath: <strong>Gator</strong>.</p><p class="secondary">A quiet little Easter egg. Good eyes!</p>')}
if(id==='waldo'){save('wvlrpRangerStripedVisitorFound',true);show(id,'A traveler hiding in plain sight','<p>That little red-and-white striped visitor really gets around. The ranger has no idea how he got on this shelf.</p><p class="secondary">A hidden station discovery.</p>')}
if(id==='specimens')show(id,'Field collection','<p>Rocks, feathers, shed antlers and small woodland finds.</p><p class="secondary">The station illustration is a recreated scene. Identified specimens and their field records will be added as the collection develops.</p>');
if(id==='lost')show(id,'Lost & found','<p>A few things waiting for their owners.</p>');
if(id==='visitors'){show(id,'Visitor messages & ideas','<p>Shared posting is being prepared. You can keep a draft here on this device.</p><label for="visitorDraft">Your message</label><textarea id="visitorDraft" maxlength="1000"></textarea><button id="saveDraft">Save draft</button><p id="draftStatus" role="status"></p>');$('#visitorDraft').value=read('wvlrpRangerDraft','');$('#saveDraft').onclick=()=>{$('#draftStatus').textContent=save('wvlrpRangerDraft',$('#visitorDraft').value)?'Draft saved on this device. It has not been posted.':'Your browser could not save this draft.'}}
if(id==='radio'){const running=feeds.filter(live),other=feeds.filter(f=>!live(f));let line;if(running.length===feeds.length)line='Ranger here. East Bank and The Roost are coming through on the desk monitor. I am out on the trail. Leave a message on the visitor bulletin board if you need me.';else line='Ranger here. '+(running.length?running.map(f=>f.name).join(' and ')+' is coming through. ':'')+'I cannot confirm a live signal from '+other.map(f=>f.name).join(' or ')+' on this monitor. We do not have a confirmed outage time. Leave a message on the visitor bulletin board if you need me.';show(id,'Ranger radio','<p id="radioReply"></p><button id="radioMute" aria-pressed="'+muted+'">'+(muted?'Unmute radio':'Mute radio')+'</button><p class="secondary">'+('speechSynthesis' in window?'':'Voice playback is unavailable in this browser.')+'</p>');$('#radioReply').textContent=line;$('#radioMute').onclick=()=>{muted=!muted;window.speechSynthesis?.cancel();$('#radioLamp').classList.remove('talking');$('#radioMute').textContent=muted?'Unmute radio':'Mute radio';$('#radioMute').setAttribute('aria-pressed',String(muted));if(!muted)speak(line)};speak(line)}
};
function speak(line){if(muted||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(line);speech.rate=.92;speech.onstart=()=>$('#radioLamp').classList.add('talking');speech.onend=speech.onerror=()=>$('#radioLamp').classList.remove('talking');window.speechSynthesis.speak(speech)}
$('#monitor').onclick=()=>window.rangerOpen('monitor');$('#detail .close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{stopEnlargedFeeds();window.speechSynthesis?.cancel();$('#radioLamp').classList.remove('talking');body.querySelectorAll('video').forEach(v=>{v.pause();v.srcObject=null});returnFocus?.focus()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
$('#menuButton').onclick=()=>{const open=$('#menu').hidden;$('#menu').hidden=!open;$('#menuButton').setAttribute('aria-expanded',String(open))};document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.rangerOpen(b.dataset.open));$('#faceDesk').onclick=()=>window.rangerFace?.(.5,.52);$('#zoomIn').onclick=()=>window.rangerZoom?.(-.18);$('#zoomOut').onclick=()=>window.rangerZoom?.(.18);$('#zoomReset').onclick=()=>window.rangerResetZoom?.();$('#account').onclick=()=>{$('#menu').hidden=true;$('.wv-auth-pill')?.click()};setTimeout(()=>$('#hint').style.opacity='0',6500);
})();
