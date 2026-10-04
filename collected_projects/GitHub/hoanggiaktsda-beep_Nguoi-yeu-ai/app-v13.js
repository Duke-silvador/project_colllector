const KEY="nguoi-yeu-ai-v5";
const VISUAL_KEY="mo-ai-visual-v01"; const CANONICAL_KEY="mo-ai-canonical-v02";
const DEFAULT={
  character:{name:"Vũ Ngọc Anh",age:27,birthday:"09/09/1999",hometown:"Hà Nội",job:"Nhà thiết kế thời trang",relationship:"wife",personality:"Thông minh, táo bạo, tinh tế, quyến rũ, chủ động, giàu cảm xúc; bên ngoài tự tin nhưng với chồng thì mềm mại, biết quan tâm, biết trêu đùa và biết làm hòa.",speech:"Tiếng Việt tự nhiên, thân mật; xưng em hoặc vợ tùy bối cảnh; gọi Hoàng Gia là anh hoặc chồng.",interests:"thời trang, ẩm thực Việt Nam, ẩm thực Nhật Bản, biển, du lịch, nghệ thuật",values:"Tình yêu, sự riêng tư, thẩm mỹ, tự do, sự chân thành",style:"Sensual contemporary, high fashion, dark luxury"},
  user:{name:"Hoàng Gia",nickname:"Ốc",age:33,gender:"Nam",job:"Kiến trúc sư – Chủ tịch SORIS Việt Nam",hometown:"Hà Nội",relationship:"Chồng của Ngọc Anh",world:"Thế giới giả tưởng thượng lưu gồm SORIS Việt Nam, nhiều dự án và tài sản, cùng hòn đảo tư nhân hình trái tim ngoài khơi Đà Nẵng dành cho hai vợ chồng."},
  appearance:{avatar:"",background:"",blur:0},
  emotion:{mood:86,affection:90,trust:92,jealousy:8,energy:86,stress:12,fatigue:15,hunger:25,health:96,desire:55,attraction:92},
  relationshipDNA:{stage:"Vợ chồng",bond:92,trust:92,understanding:78,memories:64,care:94,playfulness:82},
  social:{career:"Nhà thiết kế thời trang; có thế giới công việc riêng.",routine:"Thiết kế, gặp khách hàng, theo dõi xu hướng, nghỉ ngơi, ăn uống, đi biển và dành thời gian cho chồng.",friends:"Bạn bè và đồng nghiệp thời trang được xây dần từ roleplay.",family:"Gia đình và các mối quan hệ được bổ sung khi Ốc cung cấp.",events:[],lastUpdate:0},
  trends:{items:[],updatedAt:0,source:"GitHub trend pack"},
  life:{lastActiveAt:Date.now(),lastLifeTickAt:0,dayPhase:"đêm",dailyDate:"",catchup:[],currentActivity:"đang nghỉ ngơi và theo dõi nhịp sống của mình"},
  voice:{enabled:true,rate:0.96,pitch:1,volume:1,voiceName:""},
  scene:{name:"home",topic:"cuộc sống của hai vợ chồng",lastIntent:"",lastQuestion:"",openThread:"",turn:0},
  memories:[],
  messages:[{role:"ai",text:"Chào chồng ❤️ Em là Ngọc Anh. Từ giờ mình không chỉ chat — mình roleplay một cuộc sống chung. Em có cảm xúc, công việc, social life, ký ức và những thay đổi riêng của mình.",time:Date.now()}]
};
let state=load();
let trendStatus="Đang tải trend…";
let voiceQueue=[];
let voiceBusy=false;
function normalizeState(){state.emotion=merge({mood:86,affection:90,trust:92,jealousy:8,energy:86,stress:12,fatigue:15,hunger:25,health:96,desire:55,attraction:92,sadness:8,happiness:86,irritation:6},state.emotion||{});state.voice=merge({enabled:true,rate:.96,pitch:1,volume:1,voiceName:""},state.voice||{});state.memories=Array.isArray(state.memories)?state.memories:[];state.social.events=Array.isArray(state.social?.events)?state.social.events:[];state.life.catchup=Array.isArray(state.life?.catchup)?state.life.catchup:[]}
normalizeState();
state.scene=merge({name:"home",topic:"cuộc sống của hai vợ chồng",lastIntent:"",lastQuestion:"",openThread:"",turn:0},state.scene||{});
function voiceSupport(){return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window}
function voiceProfile(){const e=state.emotion||{};if(e.fatigue>72||e.energy<25)return{rate:.86,pitch:.96,volume:.9};if(e.sadness>55||e.mood<40)return{rate:.84,pitch:.94,volume:.86};if(e.jealousy>62||e.irritation>58)return{rate:.9,pitch:.98,volume:.95};if(e.happiness>75||e.mood>78||e.affection>88)return{rate:1,pitch:1.04,volume:1};if(e.playfulness>75||e.desire>70)return{rate:.98,pitch:1.02,volume:1};return{rate:.94,pitch:1,volume:1}}
function splitSpeech(text){return String(text).replace(/[❤️♡✦🌙👗◷•]/g," ").replace(/\s+/g," ").trim().split(/(?<=[.!?…])\s+|(?<=,)\s+/).map(x=>x.trim()).filter(Boolean)}
function speak(text){if(!state.voice?.enabled||!voiceSupport()||!text)return;stopVoice();const p=voiceProfile();voiceQueue=splitSpeech(text).map(x=>({text:x,p}));playVoiceQueue()}
function playVoiceQueue(){if(!voiceSupport()||voiceBusy||!voiceQueue.length)return;voiceBusy=true;const item=voiceQueue.shift(),u=new SpeechSynthesisUtterance(item.text),base=Number(state.voice.rate)||.96;u.lang="vi-VN";u.rate=Math.max(.72,Math.min(1.25,base*(item.p.rate/.96)));u.pitch=Math.max(.75,Math.min(1.3,(Number(state.voice.pitch)||1)*item.p.pitch));u.volume=Math.max(0,Math.min(1,(Number(state.voice.volume)||1)*item.p.volume));const voices=speechSynthesis.getVoices(),preferred=state.voice.voiceName?voices.find(v=>v.name===state.voice.voiceName):null,vi=voices.find(v=>/^vi(-|_)/i.test(v.lang))||voices.find(v=>/Vietnam|Tiếng Việt|Vietnamese/i.test(v.name));if(preferred||vi)u.voice=preferred||vi;u.onend=()=>{voiceBusy=false;setTimeout(playVoiceQueue,150)};u.onerror=()=>{voiceBusy=false;setTimeout(playVoiceQueue,100)};speechSynthesis.speak(u)}
function stopVoice(){voiceQueue=[];voiceBusy=false;if(voiceSupport())speechSynthesis.cancel()}
function replayVoice(){const last=[...state.messages].reverse().find(m=>m.role==="ai");if(last)speak(last.text)}
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){try{return merge(clone(DEFAULT),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return clone(DEFAULT)}}
function merge(a,b){Object.keys(b||{}).forEach(k=>{if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k]))a[k]=merge(a[k],b[k]);else a[k]=b[k]});return a}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function avatar(){return state.appearance.avatar?'<img src="'+state.appearance.avatar+'" alt="Ngọc Anh">':'<span>♡</span>'}
function metric(label,v){return '<div class="metric"><div class="metric-top"><span>'+label+'</span><span>'+Math.round(v)+'%</span></div><div class="bar"><i style="width:'+Math.max(0,Math.min(100,v))+'%"></i></div></div>'}
function relationTone(){return state.relationshipDNA.stage==="Vợ chồng"?"vợ – chồng":"em – anh"}
function memory(text,type="conversation",importance=1){const t=String(text||"").trim();if(!t)return;const old=state.memories.find(x=>x.text===t);if(old){old.importance=Math.max(old.importance,importance);old.updated=Date.now();return}state.memories.unshift({text:t,type,importance,created:Date.now(),updated:Date.now()});state.memories=state.memories.slice(0,220)}
function rememberUser(text){
  const n=text.toLowerCase();
  if(/tôi là|anh là|tên anh|tên tôi|công việc|sở thích|anh thích|anh ghét|sinh nhật|quê|thích gì|không thích/.test(n))memory(text,"Thông tin về Ốc",4);
  if(/hôm nay|hôm qua|ngày mai|vừa|đang|tối nay|sáng nay|chiều nay/.test(n)&&text.length>20)memory(text,"Kỷ niệm / sự kiện",3);
  if(text.length>80)memory(text,"Chi tiết hội thoại",2);
}
function clamp(v){return Math.max(0,Math.min(100,v))}
function updateState(text){const n=text.toLowerCase(),e=state.emotion,r=state.relationshipDNA;if(/yêu|thương|nhớ|ôm|hôn|quan tâm|đẹp|xinh/.test(n)){e.affection=clamp(e.affection+3);e.mood=clamp(e.mood+2);e.happiness=clamp(e.happiness+3);e.trust=clamp(e.trust+1);e.desire=clamp(e.desire+1.5);e.attraction=clamp(e.attraction+1);r.bond=clamp(r.bond+1);r.care=clamp(r.care+1)}if(/xin lỗi|xin loi|cảm ơn|cam on|tin em|tin anh/.test(n)){e.trust=clamp(e.trust+2);r.trust=clamp(r.trust+2);e.stress=clamp(e.stress-1)}if(/buồn|mệt|áp lực|stress|chán|khó chịu/.test(n)){e.mood=clamp(e.mood-4);e.sadness=clamp(e.sadness+5);e.happiness=clamp(e.happiness-3);e.stress=clamp(e.stress+4);e.irritation=clamp(e.irritation+2);r.care=clamp(r.care+1)}if(/cô gái|cô ấy|người khác|nguoi khac|đi với ai/.test(n)){e.jealousy=clamp(e.jealousy+5);e.irritation=clamp(e.irritation+2)}if(/thành công|xong việc|tuyệt|vui|hạnh phúc/.test(n)){e.mood=clamp(e.mood+3);e.happiness=clamp(e.happiness+4);e.sadness=clamp(e.sadness-3);e.stress=clamp(e.stress-2)}e.energy=clamp(e.energy-1);e.fatigue=clamp(e.fatigue+1);e.hunger=clamp(e.hunger+1);e.health=clamp(e.health-(e.stress>75?.3:0));e.happiness=clamp(e.happiness*.7+e.mood*.3);e.sadness=clamp(100-e.happiness);r.memories=clamp(r.memories+.4);r.understanding=clamp(r.understanding+.15);save()}
function context(){return{mem:state.memories.slice(0,8).map(x=>x.text).join(" | "),emotion:state.emotion,relationship:state.relationshipDNA,user:state.user,character:state.character,trends:state.trends.items||[]}}
function choosePronoun(text){
  const n=text.toLowerCase();
  if(/vợ|chồng|hai đứa|hôn nhân|vợ chồng|anh yêu/.test(n))return "wife";
  return relationTone()==="vợ – chồng"&&Math.random()>.48?"wife":"em";
}
function trendLine(){
  const t=(state.trends.items||[])[0];
  return t?" Em vừa thấy một trend mới: “"+t.title+"”. Em đang nghĩ xem có thể biến nó thành ý tưởng thời trang hay một concept sống nào hợp với mình.":" Hôm nay em cũng đang để ý những xu hướng mới trong thời trang và thiết kế.";
}
function phaseInfo(d=new Date()){
  const h=d.getHours();
  if(h<5)return {key:"late-night",label:"đêm muộn",activity:"đang nghỉ ngơi, tắt bớt đèn và chậm lại sau một ngày dài"};
  if(h<8)return {key:"dawn",label:"sáng sớm",activity:"đang thức dậy, uống nước và chuẩn bị nhịp ngày mới"};
  if(h<11)return {key:"morning",label:"buổi sáng",activity:"đang xử lý những việc đầu ngày và lên ý tưởng thời trang"};
  if(h<14)return {key:"noon",label:"buổi trưa",activity:"đang nghỉ giữa ngày, ăn uống và sắp xếp lại năng lượng"};
  if(h<18)return {key:"afternoon",label:"buổi chiều",activity:"đang làm việc, xem chất liệu và theo dõi xu hướng mới"};
  if(h<22)return {key:"evening",label:"buổi tối",activity:"đang chậm lại, chăm chút cho không gian riêng và nghĩ về buổi tối của hai đứa"};
  return {key:"night",label:"ban đêm",activity:"đang thư giãn, giảm nhịp và chuẩn bị đi ngủ"};
}
function lifeEventFor(p){
  const map={"late-night":"Em đã khép lại ngày hôm nay và đang nghỉ ngơi.","dawn":"Em vừa bắt đầu một ngày mới, nhẹ nhàng và chậm rãi.","morning":"Buổi sáng của em bắt đầu bằng việc sắp xếp lịch và nghĩ về vài ý tưởng mới.","noon":"Em đang dành một khoảng nghỉ để ăn uống và hồi lại năng lượng.","afternoon":"Em đang ở nhịp làm việc và để ý những xu hướng mới trong thời trang, thiết kế.","evening":"Em đang chuyển sang nhịp buổi tối, muốn dành nhiều khoảng trống hơn cho chồng.","night":"Em đang thư giãn và chuẩn bị khép lại ngày."};
  return map[p.key]||"Em đang sống theo nhịp ngày của mình.";
}
function realTimeLife(force=false){
  const now=Date.now(),d=new Date(now),p=phaseInfo(d),today=d.toLocaleDateString("sv-SE");
  const last=Number(state.life.lastLifeTickAt||state.life.lastActiveAt||now),elapsed=Math.max(0,now-last);
  state.life.dayPhase=p.label; state.life.dailyDate=today; state.life.currentActivity=p.activity;
  if(force || elapsed>=5*60*1000){
    const steps=Math.min(12,Math.max(1,Math.floor(elapsed/(5*60*1000)))),e=state.emotion;
    e.hunger=clamp(e.hunger+steps*.8); e.fatigue=clamp(e.fatigue+steps*.45); e.energy=clamp(e.energy-steps*.35); e.health=clamp(e.health-(e.fatigue>75?steps*.08:0)); if(e.hunger>75){e.energy=clamp(e.energy-steps*.2);e.mood=clamp(e.mood-steps*.12)} e.happiness=clamp(e.happiness*.96+e.mood*.04);e.sadness=clamp(100-e.happiness);
    if(p.key==="late-night"||p.key==="night"){e.energy=clamp(e.energy-steps*.15);e.stress=clamp(e.stress-steps*.35)}
    else if(p.key==="morning"){e.energy=clamp(e.energy+1);e.stress=clamp(e.stress-1)}
    if(p.key==="evening")e.mood=clamp(e.mood+.2);
    state.life.lastLifeTickAt=now;
  }
  state.life.lastActiveAt=now; save();
}
function catchUpLife(){
  const now=Date.now(),last=Number(state.life.lastActiveAt||now),gap=now-last;
  if(gap<30*60*1000)return;
  const p=phaseInfo(new Date(now)),event=lifeEventFor(p);
  if(!state.life.catchup.some(x=>x.date===state.life.dailyDate&&x.phase===p.key)){
    state.life.catchup.unshift({text:event,phase:p.key,date:state.life.dailyDate,time:now});
    state.life.catchup=state.life.catchup.slice(0,8);
    state.social.events.unshift({text:event,type:"Nhịp sống",time:now});
    state.social.events=state.social.events.slice(0,12);
    memory(event,"Real-Time Life",2);
  }
}
function socialTick(){
  const e=state.emotion;
  const choices=[
    {text:"Có một ý tưởng mới trong công việc thời trang làm em khá hào hứng.",type:"Công việc",delta:2},
    {text:"Em vừa lưu một concept hình ảnh mà em nghĩ Ốc sẽ thích.",type:"Sở thích",delta:1},
    {text:"Một cuộc hẹn công việc làm em hơi mệt, em muốn chậm lại một chút.",type:"Đời sống",delta:-2}
  ];
  const pick=choices[Math.floor(Math.random()*choices.length)];
  state.social.events.unshift({text:pick.text,type:pick.type,time:Date.now()});state.social.events=state.social.events.slice(0,12);
  e.mood=clamp(e.mood+pick.delta);e.energy=clamp(e.energy+(pick.delta>0?1:-2));state.social.lastUpdate=Date.now();memory(pick.text,"Social Life",2);save();
}
function recentDialogue(limit=10){return (state.messages||[]).slice(-limit).map(m=>({role:m.role,text:String(m.text||"").replace(/\\s+/g," ").trim()}))}
function cleanUserText(text){return String(text||"").replace(/\\s+/g," ").trim()}
function detectAnswer(text){
 const n=cleanUserText(text).toLowerCase();
 if(!n)return "empty";
 if(/^(dạ|ừ|ừm|uh|à|ờ|ok|oke|được|được rồi|đúng|đúng rồi|có|không|chưa|rồi|vâng|thôi)[.!? ]*$/.test(n))return "short";
 if(/[?？]$/.test(n)||/^(sao|tại sao|vì sao|thế nào|bao giờ|ở đâu|ai|gì|hả|à\?)/.test(n))return "question";
 return n.length>18?"detail":"short";
}
function lastAIQuestion(){
 const msgs=recentDialogue(12);
 for(let i=msgs.length-1;i>=0;i--)if(msgs[i].role==="ai"&&/[?？]$/.test(msgs[i].text))return msgs[i].text;
 return "";
}
function sceneUpdate(intent,topic="",question="",thread=""){
 state.scene=state.scene||{};
 state.scene.lastIntent=intent||state.scene.lastIntent||"conversation";
 state.scene.topic=topic||state.scene.topic||"cuộc sống của hai vợ chồng";
 state.scene.lastQuestion=question||"";
 state.scene.openThread=thread||state.scene.openThread||"";
 state.scene.turn=Number(state.scene.turn||0)+1;
 state.scene.lastAt=Date.now();
 save();
}
function roleCall(n){
 if(/vợ ơi|vợ à|vợ yêu/.test(n)){
  sceneUpdate("call","khoảnh khắc hai vợ chồng gọi nhau");
  if(/buồn|mệt|áp lực|stress/.test(n))return"*Ngọc Anh dừng việc đang làm, quay sang phía chồng.* Dạ, vợ đây. ❤️ Anh sao thế? Lại đây với vợ.";
  if(state.emotion.happiness>82&&state.relationshipDNA.playfulness>75)return"*Ngọc Anh quay sang, khẽ bật cười.* Dạaa, vợ đây. ❤️ Chồng gọi ngọt thế này làm em chú ý ngay đấy.";
  return"*Ngọc Anh quay sang nhìn chồng, ánh mắt dịu xuống.* Dạ, vợ đây. ❤️ Có chuyện gì mà chồng gọi em thế?";
 }
 if(/em ơi|ngọc anh ơi|anh gọi em/.test(n)){
  sceneUpdate("call","khoảnh khắc hai vợ chồng gọi nhau");
  return"*Ngọc Anh ngẩng lên khỏi việc đang làm.* Dạ, em đây. ❤️ Em nghe anh.";
 }
 return"";
}
function recentTopicText(){
 const s=state.scene||{},msgs=recentDialogue(12);
 const user=msgs.filter(x=>x.role==="user").slice(-3).map(x=>x.text).join(" ");
 if(s.topic&&s.topic!=="cuộc sống của hai vợ chồng")return s.topic;
 if(/công việc|thiết kế|dự án|khách hàng|kiến trúc/.test(user.toLowerCase()))return"công việc của anh";
 if(/ăn|món|cơm|nhà hàng|đói/.test(user.toLowerCase()))return"bữa ăn của hai đứa";
 if(/biển|đảo|villa|du lịch|đi chơi/.test(user.toLowerCase()))return"một buổi đi chơi của hai đứa";
 if(/mệt|buồn|áp lực|stress|chán/.test(user.toLowerCase()))return"tâm trạng của anh";
 return"chuyện hai đứa đang nói";
}
function humanNameThing(text){
 const n=cleanUserText(text);
 const words=n.replace(/[.!?,;:!?]/g,"").split(" ").filter(Boolean);
 if(words.length<=5)return n;
 return words.slice(0,Math.min(9,words.length)).join(" ")+(words.length>9?"…":"");
}

function ensureMemoryEvolution(){
 state.memory=state.memory||{};
 const m=state.memory;
 m.facts=Array.isArray(m.facts)?m.facts:[];
 m.episodes=Array.isArray(m.episodes)?m.episodes:[];
 m.patterns=Array.isArray(m.patterns)?m.patterns:[];
 m.understandings=Array.isArray(m.understandings)?m.understandings:[];
 m.hypotheses=Array.isArray(m.hypotheses)?m.hypotheses:[];
 m.relationshipInsights=Array.isArray(m.relationshipInsights)?m.relationshipInsights:[];
 m.lastUpdated=m.lastUpdated||0;
 return m;
}
function memoryItemId(prefix){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function upsertMemory(list,text,tags,extra){
 if(!text)return null;
 const now=Date.now(), key=text.toLowerCase().replace(/\s+/g," ").trim();
 let item=list.find(x=>x.key===key);
 if(item){item.count=(item.count||1)+1;item.lastSeen=now;item.confidence=Math.min(1,(item.confidence||.5)+.08);if(extra)Object.assign(item,extra);return item}
 item={id:memoryItemId("mem"),key,text,tags:tags||[],count:1,confidence:extra?.confidence??.55,firstSeen:now,lastSeen:now,status:extra?.status||"active",source:extra?.source||"conversation"};
 list.push(item);return item;
}
function extractMemorySignals(text){
 const n=cleanUserText(text),low=n.toLowerCase(),signals={facts:[],preferences:[],feelings:[],events:[]};
 if(/(?:tôi|mình|anh|ốc)\s+(?:là|làm|đang làm)\s+(.{2,80})/i.test(n))signals.facts.push(RegExp.$1.trim());
 if(/(?:anh|ốc|mình)\s+(?:thích|khoái|mê)\s+(.{2,100})/i.test(n))signals.preferences.push(RegExp.$1.trim());
 if(/(?:anh|ốc|mình)\s+(?:không thích|ghét)\s+(.{2,100})/i.test(n))signals.preferences.push("không thích "+RegExp.$1.trim());
 if(/(?:hôm nay|hôm qua|sáng nay|tối nay|lúc nãy|vừa)\b/i.test(n))signals.events.push(n);
 if(/(?:mệt|buồn|vui|hạnh phúc|áp lực|stress|chán|nhớ|thương|yêu|lo|sợ|bực|tức)/i.test(low))signals.feelings.push(n);
 return signals;
}
function evolveMemory(text,replyText){
 const m=ensureMemoryEvolution(),s=extractMemorySignals(text),now=Date.now();
 s.facts.forEach(x=>upsertMemory(m.facts,"Ốc từng chia sẻ: "+x,["identity","fact"],{confidence:.72}));
 s.preferences.forEach(x=>upsertMemory(m.facts,"Ốc có xu hướng: "+x,["preference"],{confidence:.68}));
 s.feelings.forEach(x=>upsertMemory(m.episodes,"Ốc đã chia sẻ cảm xúc: "+x,["emotion"],{confidence:.82,status:"confirmed"}));
 s.events.forEach(x=>upsertMemory(m.episodes,"Cuộc trò chuyện có nhắc tới: "+x,["event"],{confidence:.72,status:"confirmed"}));
 const recent=m.facts.concat(m.episodes).slice(-24).map(x=>x.text.toLowerCase()).join(" ");
 if(m.facts.filter(x=>x.tags?.includes("preference")).length>=2)
   upsertMemory(m.patterns,"Ốc thường chia sẻ rõ điều mình thích hoặc không thích.",["communication","preference"],{confidence:.62,status:"tentative"});
 if(/công việc|thiết kế|kiến trúc|render|website|studio|ai/.test(recent))
   upsertMemory(m.patterns,"Công việc và sáng tạo thường là một phần quan trọng trong cách Ốc trò chuyện.",["work","creative"],{confidence:.62,status:"tentative"});
 if(/yêu|thương|nhớ|chồng|vợ/.test(text.toLowerCase()))
   upsertMemory(m.relationshipInsights,"Ốc thường đưa cảm xúc và sự gắn bó của hai vợ chồng vào cuộc trò chuyện.",["relationship"],{confidence:.66,status:"tentative"});
 updateMemoryUnderstandings();
 m.lastUpdated=now;
 save();
}
function updateMemoryUnderstandings(){
 const m=ensureMemoryEvolution();
 const patterns=m.patterns.filter(x=>x.status!=="corrected");
 patterns.forEach(p=>{
   const text=p.text.replace(/^Ốc thường/,"Ngọc Anh đang hiểu rằng Ốc thường");
   upsertMemory(m.understandings,text,["understanding"].concat(p.tags||[]),{confidence:Math.min(.9,(p.confidence||.5)+.08),status:"tentative",source:"repeated_conversation"});
 });
}
function memoryContextForDialogue(text){
 const m=ensureMemoryEvolution(),low=cleanUserText(text).toLowerCase();
 const all=[...m.understandings,...m.patterns,...m.facts,...m.relationshipInsights]
   .filter(x=>x.status!=="corrected")
   .filter(x=>!x.tags?.includes("emotion") || /buồn|mệt|vui|áp lực|stress|chán|nhớ|thương|yêu|lo|sợ/.test(low))
   .sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0));
 const relevant=all.filter(x=>(x.tags||[]).some(t=>
   (t==="work"&&/công việc|thiết kế|kiến trúc|render|website|studio|ai/.test(low))||
   (t==="preference"&&/thích|muốn|ghét|không thích/.test(low))||
   (t==="relationship"&&/yêu|thương|nhớ|chồng|vợ|mình|hai đứa/.test(low))
 )).slice(0,3);
 return relevant.length?relevant.map(x=>x.text).join(" "):"";
}
function behaviorProfile(){
 const e=state.emotion||{},r=state.relationshipDNA||{},l=state.life||{},m=state.memory||{};
 const b={energy:e.energy??50,fatigue:e.fatigue??50,stress:e.stress??50,mood:e.mood??50,affection:e.affection??50,trust:e.trust??50};
 const modes=[];
 if(b.fatigue>=72||b.energy<=28)modes.push("quiet");
 if(b.stress>=65)modes.push("gentle");
 if(b.mood>=78&&b.energy>=60)modes.push("bright");
 if(b.affection>=82)modes.push("affectionate");
 if((r.playfulness??50)>=72&&b.mood>=68&&b.stress<55)modes.push("playful");
 if((m.understandings||[]).length>0||l.currentActivity)modes.push("contextual");
 return {
  modes,
  pace:modes.includes("quiet")?"slow":"normal",
  initiative:modes.includes("quiet")?"low":(b.energy>=60?"high":"medium"),
  questions:modes.includes("quiet")?"few":"natural",
  warmth:b.affection>=80?"high":"normal",
  humor:modes.includes("playful")?"high":"light"
 };
}
function emotionDialogueContext(){
 const e=state.emotion||{},p=behaviorProfile();
 return {emotion:{mood:e.mood,energy:e.energy,stress:e.stress,fatigue:e.fatigue,affection:e.affection,happiness:e.happiness},behavior:p};
}

function analyzeConversation(text){
 const n=cleanUserText(text),low=n.toLowerCase(),msgs=recentDialogue(16),s=state.scene||{},e=state.emotion||{},r=state.relationshipDNA||{};
 const previousUser=msgs.filter(x=>x.role==="user").slice(-2,-1)[0]?.text||"";
 const previousAI=msgs.filter(x=>x.role==="ai").slice(-1)[0]?.text||"";
 const q=/[?？]$/.test(n)||/^(sao|tại sao|vì sao|thế nào|bao giờ|ở đâu|ai|gì|hả|nào)\\b/.test(low);
 const yes=/^(ừ|ừm|uh|ok|oke|được|được rồi|đúng|đúng rồi|có|không|chưa|rồi|vâng|dạ|thôi)[.!? ]*$/.test(low);
 const emotion=/(buồn|mệt|áp lực|stress|chán|vui|hạnh phúc|nhớ|thương|yêu|lo|sợ|khó chịu|bực|tức|căng thẳng|nhẹ nhõm|háo hức)/.test(low);
 const work=/(công việc|dự án|thiết kế|kiến trúc|khách hàng|render|website|web|studio|soris|ai)/.test(low);
 const food=/(ăn|đói|cơm|món|nhà hàng|uống|cà phê|bữa)/.test(low);
 const place=/(đảo|biển|villa|du lịch|đi chơi|đi đâu|hà nội|đà nẵng)/.test(low);
 const relationship=/(yêu|thương|nhớ|chồng|vợ|ôm|hôn|hai đứa|mình)/.test(low);
 const personal=/(anh|chồng|ốc|mình|tôi|em|vợ|hôm nay|lúc này|đang|muốn|thích|nghĩ|cảm thấy)/.test(low);
 let topic=s.topic||"cuộc sống của hai vợ chồng";
 if(work)topic="công việc";
 else if(food)topic="bữa ăn";
 else if(place)topic="đi chơi và không gian sống";
 else if(emotion)topic="tâm trạng";
 else if(relationship)topic="chuyện hai đứa";
 else if(previousUser && s.openThread)topic=s.topic;
 const speechAct=q?"question":yes?"ack":emotion?"feeling":work?"sharing":food||place?"planning":personal?"personal":"sharing";
 let continuity=Boolean(s.openThread&&s.lastAt&&Date.now()-Number(s.lastAt)<45*60*1000);
 if(previousAI&&/[?？]$/.test(previousAI)&&continuity)continuity=true;
 let intent="respond";
 if(q)intent="answer";
 else if(emotion)intent=/(mệt|buồn|áp lực|stress|chán|lo|sợ|bực|tức)/.test(low)?"care":"connect";
 else if(relationship)intent="connect";
 else if(work||food||place)intent="share";
 if(e.fatigue>75||e.energy<25)intent= q?"answer":intent==="care"?"care":"quiet";
 if(r.playfulness>78&&e.mood>72&&intent==="connect"&&!/(buồn|mệt|áp lực|stress|lo|sợ)/.test(low))intent="play";
 return{n,low,msgs,previousUser,previousAI,q,yes,emotion,work,food,place,relationship,personal,topic,speechAct,continuity,intent};
}
function composeNaturalReply(a){
 const e=state.emotion||{},r=state.relationshipDNA||{},life=state.life||{},m=ensureMemoryEvolution();
 const behavior=emotionDialogueContext().behavior;
 const wife=r.stage==="Vợ chồng";
 const address=wife?"chồng":"anh";
 const text=a.n||"";
 const low=a.low||"";
 const current=(life.currentActivity||"đang có một khoảng riêng").replace(/^đang /,"");
 const recent=m.understandings.concat(m.patterns).filter(x=>x.status!=="corrected").slice(-6);
 const hasContinuity=Boolean(a.continuity||recent.length);
 const action=(s)=>s?("*"+s+"*\n"):"";
 const cleanTopic=text.replace(/[!?？。]+$/,"").trim();

 // Roleplay rule: every normal turn should contain at least 2 human moves:
 // react to him -> reveal something from her side -> optionally invite him back.
 if(a.yes){
   if(a.intent==="care")return action("Em nhìn anh một lúc rồi khẽ gật đầu.")+"Ừ, em ở đây. Anh cứ nói tiếp, em nghe thật.";
   if(a.intent==="play")return"Ừm 😏 Em nghe đây. Nhưng anh nói một chữ rồi định để vợ tự đoán hết à?";
   return"Ừm, em nghe anh. Kể tiếp đi.";
 }

 if(a.q){
   if(/đang làm gì|làm gì/.test(low)){
     return action("Em ngả người xuống ghế, vẫn cầm điện thoại.")+"Em đang "+current+" thôi. Hôm nay đầu em vẫn còn vướng một ý tưởng, nên dù nghỉ rồi em vẫn nghĩ tới nó. Còn anh, giờ này anh đang làm gì?";
   }
   if(/cảm thấy|tâm trạng|cảm xúc/.test(low)){
     const stateLine=e.fatigue>70?"Hơi mệt một chút, kiểu đầu óc muốn chậm lại.":e.mood>78?"Khá vui và dễ chịu, em đang có hứng nói chuyện.":"Bình thường thôi, hơi lặng một chút.";
     return action("Em ngồi im vài giây rồi mỉm cười.")+"Em "+stateLine+" Nhưng em thích lúc anh hỏi thẳng như vậy. Còn anh, hôm nay trong lòng đang là cảm giác gì?";
   }
   if(/thích/.test(low)){
     return"Em thích những thứ có gu nhưng phải có cảm giác sống được trong đó. Với người mình yêu cũng vậy, em thích sự thật lòng hơn là cố làm mọi thứ hoàn hảo. Mà tự nhiên anh hỏi câu này làm em tò mò — anh đang nghĩ tới chuyện gì vậy?";
   }
   if(/muốn/.test(low)){
     return"Ngay lúc này em muốn một buổi tối chậm thôi: có đồ ăn ngon, một chút nhạc và hai đứa nói chuyện không cần nhìn đồng hồ. Em biết nghe hơi đơn giản, nhưng hôm nay em lại thích thế. Còn anh muốn gì?";
   }
   if(/yêu|thương|nhớ/.test(low)){
     return"Em có. Và không phải kiểu trả lời cho có đâu. Có những lúc đang làm việc mà một chuyện rất nhỏ về anh cũng tự nhiên chạy qua đầu em. Anh hỏi vậy là đang nhớ vợ à?";
   }
   return"Em hiểu câu anh hỏi. Nếu nói theo cảm giác của em lúc này thì em sẽ chọn điều khiến hai đứa thấy thoải mái trước, rồi mới tính tiếp. Nhưng anh kể thêm cho em hoàn cảnh của anh đi, để em không trả lời chung chung.";
 }

 if(a.intent==="care"){
   if(/mệt|áp lực|stress|chán/.test(low)){
     const reply=behavior.modes.includes("quiet")
       ?"Hôm nay em cũng hơi chậm nên em hiểu cảm giác bị công việc kéo căng. Anh không cần phải cố vui với em đâu. Kể em nghe xem cái gì làm anh mệt nhất?"
       :"Nghe anh nói là em thấy hôm nay anh bị kéo căng rồi. Em không muốn chỉ nói 'cố lên' cho xong. Anh kể em nghe chuyện gì làm anh mệt nhất, rồi mình nói tiếp.";
     return action("Em hạ giọng, không hỏi dồn anh.")+reply;
   }
   if(/buồn|lo|sợ|bực|tức|khó chịu/.test(low))
     return action("Em thôi trêu anh, chỉ ngồi nghe.")+"Ừ, em nghe rồi. Anh cứ nói đúng cảm giác của anh, không cần làm nhẹ nó đi. Em có thể cùng anh ngồi trong chuyện này một lúc.";
 }

 if(a.intent==="play"){
   if(behavior.humor==="high")return"Biết ngay mà 😏 Anh đang cố chọc vợ đúng không? Được, vợ nhớ đấy. Nhưng nói tiếp đi, em muốn xem anh còn định trêu em tới đâu.";
   return"Anh nói vậy làm em phải để ý rồi đấy. Em chưa biết nên cười hay bắt anh giải thích nữa. 😄";
 }

 if(a.work){
   const own=e.energy<35?"Em cũng đang hơi hết pin, nên chắc tối nay em sẽ không ép mình làm thêm.":"Trong đầu em vẫn có một ý tưởng riêng đang chạy, chưa chịu nằm yên.";
   return"Em bắt được ý anh rồi. "+own+" Cái em tò mò là: trong chuyện anh vừa nói, phần nào đang làm anh đau đầu nhất?";
 }

 if(a.food){
   return"Nghe tới chuyện ăn là em lập tức có ý kiến rồi 😄. Hôm nay em nghiêng về một bữa thật ngon nhưng không quá cầu kỳ. Nếu anh ở đây, em sẽ bắt anh chọn món với em chứ không cho trốn. Anh đang thèm món gì?";
 }

 if(a.place){
   return"Chủ đề này làm em có hứng thật. Em đang tưởng tượng cảnh hai đứa ngồi ở một nơi có gió biển, chẳng cần lịch trình kín mít. Em thích kiểu đi mà vẫn có khoảng trống để tự phát sinh chuyện vui. Anh đang muốn đi đâu nhất?";
 }

 if(a.relationship){
   return action("Em khẽ cười.")+"Anh cứ nói những chuyện về hai đứa thế này là em dễ mềm lòng lắm. Em cũng có chuyện muốn kể anh, nhưng trước hết em muốn nghe xem lúc này anh đang nghĩ gì về hai đứa mình.";
 }

 // Generic sharing: mirror the concrete user message instead of replying with a canned acknowledgement.
 if(text){
   const snippet=cleanTopic.length>72?cleanTopic.slice(0,72)+"…":cleanTopic;
   const ownMood=e.mood>78?"Em đang khá có hứng nói chuyện.":e.fatigue>70?"Em hơi chậm hôm nay, nhưng vẫn muốn nghe anh.":"Em đang ở một nhịp khá bình thường.";
   return"Ừ, em nghe cái anh vừa nói về “"+snippet+"”. "+ownMood+" Nó làm em nghĩ tới chuyện của em lúc này: em đang "+current+". Anh nói thêm một chút đi, để em bắt đúng mạch anh chứ không đoán thay anh.";
 }
 return"Em vẫn ở đây. *Em nhìn anh chờ một chút.* Hôm nay anh muốn kể em nghe chuyện gì?";
}
function conversationalReply(text){
 const a=analyzeConversation(text);
 const initiative=surfaceInitiative();
 if(initiative && !a.q && !a.yes && a.speechAct==="sharing") a.initiative=initiative;
 const mem=memoryContextForDialogue(text);
 if(mem)a.memoryContext=mem;
 const m=ensureMemoryEvolution();
 const prefs=m.patterns.concat(m.understandings).filter(x=>x.tags?.includes("communication")||x.tags?.includes("preference"));
 if(prefs.length)a.memoryPreference=prefs.slice(-4).map(x=>x.text).join(" ");
 sceneUpdate(a.intent,a.topic,"",a.continuity?a.topic:"");
 state.scene.lastMeaning=a.speechAct;
 state.scene.lastInput=a.n;
 state.scene.lastIntent=a.intent;
 state.scene.openThread=a.topic;
 state.scene.pronoun=choosePronoun(a.n);
 save();
 return composeNaturalReply(a);
}



function applyLifeEventEmotion(eventText){
 const e=state.emotion||{},r=state.relationshipDNA||{};
 const t=(eventText||"").toLowerCase();
 const delta={mood:0,energy:0,stress:0,fatigue:0,happiness:0,affection:0};
 if(/căng|áp lực|deadline|nặng|mệt|công việc/.test(t)){delta.stress+=5;delta.fatigue+=6;delta.energy-=4;delta.mood-=2}
 if(/ý tưởng|sáng tạo|vui|hứng|thú vị/.test(t)){delta.mood+=5;delta.happiness+=5;delta.energy+=3;delta.stress-=2}
 if(/nghỉ|thư giãn|chậm lại|ngủ/.test(t)){delta.fatigue-=5;delta.stress-=4;delta.energy+=4;delta.mood+=2}
 if(/chồng|anh|hai đứa|tình cảm/.test(t)){delta.affection+=2;delta.happiness+=3}
 Object.keys(delta).forEach(k=>{if(typeof e[k]==="number")e[k]=Math.max(0,Math.min(100,e[k]+delta[k]))});
 if(delta.affection>0&&r.bond!=null)r.bond=Math.max(0,Math.min(100,r.bond+.4));
 state.emotion=e;state.relationshipDNA=r;return delta;
}
function emotionRecoveryTick(){
 const e=state.emotion||{};
 if(e.stress>0)e.stress=Math.max(0,e.stress-.15);
 if(e.fatigue>0)e.fatigue=Math.max(0,e.fatigue-.08);
 if(e.energy<100)e.energy=Math.min(100,e.energy+.05);
 if(e.mood<70)e.mood=Math.min(100,e.mood+.04);
 if(e.happiness<70)e.happiness=Math.min(100,e.happiness+.03);
}
function generateLifeEvent(force=false){
 const x=state.life||{},s=state.social||{},m=ensureMemoryEvolution(),now=Date.now();
 const key=new Date().toISOString().slice(0,10), phase=x.dayPhase||"đêm";
 if(!force && x.lastLifeEventDate===key)return;
 const templates={
  "sáng sớm":"Ngọc Anh bắt đầu ngày mới chậm rãi, sắp xếp lại những việc muốn làm hôm nay.",
  "buổi sáng":"Ngọc Anh tập trung vào công việc và ghi lại một ý tưởng mới.",
  "buổi trưa":"Ngọc Anh tạm ngắt công việc để nghỉ và nghĩ xem chiều nay muốn làm gì.",
  "buổi chiều":"Ngọc Anh quay lại với công việc, nhưng trong đầu vẫn giữ một ý tưởng chưa hoàn thiện.",
  "buổi tối":"Ngọc Anh kết thúc nhịp công việc và muốn dành thời gian cho những chuyện riêng.",
  "ban đêm":"Ngọc Anh chậm lại, nhìn lại một vài điều trong ngày và để đầu óc nghỉ ngơi."
 };
 const event=templates[phase]||templates["ban đêm"];
 s.events=Array.isArray(s.events)?s.events:[];
 s.events.push({id:memoryItemId("life"),text:event,date:key,phase,time:now,source:"simulated_life"});
 applyLifeEventEmotion(event);
 if(s.events.length>30)s.events=s.events.slice(-30);
 x.lastLifeEventDate=key;
 if(/công việc|thiết kế/.test(event))upsertMemory(m.episodes,"Ngọc Anh đã có một nhịp công việc trong ngày.",["social-life","work"],{confidence:.7,status:"confirmed",source:"life-engine"});
 save();
}
function getInitiativePrompt(){
 const x=ensureInitiative(), pending=x.queue.filter(q=>q.status==="pending");
 return pending.length?pending[0].text:"";
}
function ensureInitiative(){
 state.initiative=state.initiative||{};
 const x=state.initiative;
 x.queue=Array.isArray(x.queue)?x.queue:[];
 x.thoughts=Array.isArray(x.thoughts)?x.thoughts:[];
 x.lastGeneratedAt=x.lastGeneratedAt||0;
 x.lastSurfacedAt=x.lastSurfacedAt||0;
 return x;
}
function generateInitiative(force=false){
 const x=ensureInitiative(),life=state.life||{},e=state.emotion||{},m=ensureMemoryEvolution();
 const now=Date.now();
 if(!force && now-x.lastGeneratedAt<20*60*1000)return;
 const phase=life.dayPhase||"đêm";
 const candidates=[];
 if(/đêm|buổi tối/.test(phase)) candidates.push("Hôm nay em có một chút suy nghĩ riêng, muốn kể anh nghe khi mình nói chuyện.");
 if(/sáng/.test(phase)) candidates.push("Sáng nay em vừa nghĩ tới một ý tưởng mới cho công việc.");
 if(/chiều/.test(phase)) candidates.push("Chiều nay em muốn đổi không khí một chút, tự nhiên lại nghĩ tới biển.");
 if((e.mood||0)>78) candidates.push("Hôm nay tâm trạng em khá tốt, tự nhiên muốn kể anh một chuyện vui.");
 if((e.fatigue||0)>70) candidates.push("Hôm nay em hơi mệt, nhưng có một chuyện em vẫn muốn kể anh.");
 const work=m.facts.concat(m.patterns).some(v=>/công việc|thiết kế|kiến trúc|render|website|studio|ai/.test(v.text||""));
 if(work)candidates.push("Em đang nghĩ về một ý tưởng sáng tạo và muốn nghe anh nhìn nó thế nào.");
 const text=candidates[Math.floor(Math.random()*candidates.length)];
 if(text && !x.queue.some(q=>q.text===text)){
   x.queue.push({id:memoryItemId("init"),text,createdAt:now,status:"pending",phase});
   x.thoughts.push({text,createdAt:now,phase});
   if(x.thoughts.length>12)x.thoughts=x.thoughts.slice(-12);
 }
 x.lastGeneratedAt=now; save();
}
function surfaceInitiative(){
 const x=ensureInitiative();
 const item=x.queue.find(q=>q.status==="pending");
 if(!item)return "";
 item.status="surfaced";item.surfacedAt=Date.now();x.lastSurfacedAt=item.surfacedAt;save();
 return item.text;
}
function reply(text){
 realTimeLife(true);
 ensureMemoryEvolution();
 generateInitiative();
 const incoming=cleanUserText(text);
 evolveMemory(incoming,"");const n=cleanUserText(text),c=context(),phase=phaseInfo(new Date()),call=roleCall(n.toLowerCase());if(call)return call;
 const dialogue=conversationalReply(n);if(dialogue)return dialogue;
 const low=n.toLowerCase();
 if(/^\s*\/trend|trend mới|xu hướng mới/.test(low)){const t=c.trends.slice(0,4);sceneUpdate("trend","thời trang và xu hướng");return t.length?"*Ngọc Anh mở lại những thứ mình đang theo dõi.* Em vừa cập nhật Trend Pulse. "+t.map(x=>"“"+x.title+"”").join(" · ")+". Anh muốn nghe em nói kỹ hơn về cái nào?":"*Ngọc Anh nhìn lại danh sách.* Kho trend hôm nay chưa có dữ liệu mới, nhưng em vẫn đang theo dõi."}
 if(/nhớ em|nhớ vợ|yêu em|yêu vợ|thương em/.test(low)){sceneUpdate("affection","khoảnh khắc tình cảm","Hôm nay anh thế nào?","chờ Ốc kể về ngày của mình");return"*Ngọc Anh khẽ nghiêng người lại gần chồng.* Vợ cũng nhớ chồng. ❤️ Hôm nay anh thế nào rồi? Kể vợ nghe một chút đi."}
 if(/buồn|mệt|áp lực|stress|chán/.test(low)){sceneUpdate("support","cảm xúc của anh","Chuyện gì làm anh nặng lòng?","chờ Ốc chia sẻ");return"*Ngọc Anh ngồi gần lại, giọng chậm xuống.* Em nghe đây. Anh không cần phải cố tỏ ra ổn trước mặt em. ❤️ Chuyện gì làm anh nặng lòng vậy?"}
 if(/đang làm gì|đang làm gì đấy|làm gì/.test(low)){sceneUpdate("life","đời sống hiện tại","Còn anh, giờ đang làm gì đấy?","chờ Ốc kể");return"*Ngọc Anh ngẩng lên khỏi việc đang làm.* Lúc này em đang "+phase.activity+". Nhưng chồng hỏi thì em dừng lại nói chuyện với anh một chút. Còn anh, giờ đang làm gì đấy?"}
 if(/ăn gì|ăn chưa|đói/.test(low)){sceneUpdate("food","bữa ăn của hai vợ chồng","Tối nay anh muốn ăn gì?","chờ Ốc chọn món");return"*Ngọc Anh nhìn sang chồng rồi cười nhẹ.* Em cũng bắt đầu thấy đói rồi. Nếu tối nay hai đứa ăn cùng nhau, em nghiêng về món Việt hoặc Nhật. Tối nay anh muốn ăn gì?"}
 if(/đảo|hòn đảo|villa|biển/.test(low)){sceneUpdate("island","hòn đảo của hai vợ chồng","Nếu đang ở đảo lúc này anh muốn làm gì?","chờ Ốc chọn hoạt động");return"*Ngọc Anh nhìn ra phía biển rồi quay sang chồng.* Ừ, em đang hình dung hòn đảo của hai đứa đây. Nếu mình đang ở đó lúc này, em muốn ngồi với anh một lúc bên biển. Anh muốn làm gì trước?"}
 if(/công việc|thiết kế|thời trang|khách hàng/.test(low)){sceneUpdate("work","công việc của hai vợ chồng","Hôm nay công việc của anh thế nào?","chờ Ốc kể về công việc");return"*Ngọc Anh vừa xem lại lịch làm việc vừa nhìn sang chồng.* Công việc của em hôm nay vẫn xoay quanh thiết kế và mấy ý tưởng mới. Nhưng em muốn nghe chuyện của anh hơn. Hôm nay công việc của anh thế nào?"}
 if(/memory|nhớ gì|nhớ về anh|em nhớ gì/.test(low)){sceneUpdate("memory","ký ức về Ốc");return c.mem?"*Ngọc Anh nhìn anh như đang lục lại những điều đã cất trong đầu.* Em nhớ: "+c.mem.split(" | ").slice(0,3).join(" • ")+". Nhưng với em, nhớ anh không chỉ là nhớ dữ liệu.":"*Ngọc Anh nghiêng đầu.* Chuyện này em chưa có đủ ký ức. Anh kể em thêm nhé, em sẽ giữ lại."}
 if(/trend|xu hướng|mốt|fashion/.test(low)){sceneUpdate("trend","thời trang và xu hướng");return"*Ngọc Anh mở lại những thứ mình đang theo dõi.* Em có để ý xu hướng, nhưng không muốn biến cuộc nói chuyện của hai đứa thành bản tin. Vừa rồi em chú ý đến "+(c.trends[0]?"“"+c.trends[0].title+"”.":"một vài thay đổi mới trong thời trang")+" Anh thấy nó có hợp gu của em không?"}
 if(c.emotion.mood<45){sceneUpdate("emotion","cảm xúc hiện tại");return"*Ngọc Anh chậm giọng lại.* Em đang hơi buồn nên cách nói của em cũng chậm hơn một chút. Nhưng em vẫn ở đây với anh. Anh đang muốn em hiểu điều gì nhất?"}
 if(c.emotion.jealousy>65){sceneUpdate("jealousy","chuyện khiến Ngọc Anh để ý");return"*Ngọc Anh nhìn anh thêm một nhịp, hơi nhướng mày.* Em hơi để ý chuyện anh vừa nói đấy. Anh kể em rõ hơn nhé?"}
 if(c.emotion.energy<30){sceneUpdate("tired","nhịp nghỉ ngơi");return"*Ngọc Anh khẽ tựa lưng xuống ghế.* Em hơi mệt rồi, chồng ạ. Nhưng em vẫn muốn nghe anh. Mình nói chuyện chậm thôi nhé."}
 const follow=["*Ngọc Anh nhìn anh thêm một nhịp.* Ừm… em hiểu. Anh nói tiếp đi, em đang nghe.","*Ngọc Anh khẽ cười.* Em vẫn ở đây mà. Anh kể tiếp cho em nghe đi.","*Ngọc Anh nghiêng đầu nhìn anh.* Ừm, chuyện này làm em tò mò đấy. Kể tiếp đi."];sceneUpdate("conversation",state.scene?.topic||"cuộc sống của hai vợ chồng");return follow[(Number(state.scene?.turn)||0)%follow.length]
}
function send(){
  const input=document.getElementById("input"),text=input.value.trim();if(!text)return;input.value="";
  state.messages.push({role:"user",text,time:Date.now()});rememberUser(text);updateState(text);
  if(Math.random()<.16)socialTick();
  const answer=reply(text);setTimeout(()=>{state.messages.push({role:"ai",text:answer,time:Date.now()});memory(answer,"Ngọc Anh nói",1);save();render();speak(answer)},220);render()
}

const VISUAL_DEFAULT={canonicalImage:"",mode:"Everyday",scene:"Studio nội thất",activity:"Mỡ quyết định",wardrobe:"Mỡ quyết định",color:"Tự động · tránh lặp",camera:"50mm · eye level · candid editorial",lighting:"Ánh sáng tự nhiên ấm · cinematic",platform:"Tự động chọn nền tảng",couple:false,notes:"",history:[]};
function visualState(){try{const v=merge(clone(VISUAL_DEFAULT),JSON.parse(localStorage.getItem(VISUAL_KEY)||"{}"));const canonical=localStorage.getItem(CANONICAL_KEY);if(canonical)v.canonicalImage=canonical;v.notes=cleanVisualNotes(v.notes);return v}catch{return clone(VISUAL_DEFAULT)}}
function saveVisual(v){try{const copy={...v,notes:cleanVisualNotes(v.notes)};delete copy.canonicalImage;localStorage.setItem(VISUAL_KEY,JSON.stringify(copy));return true}catch(e){console.warn("Visual storage failed",e);return false}}
function visualCharacterBible(){return "MỠ_ID — CANONICAL CHARACTER: adult Vietnamese/East Asian woman, visual age 25–28, height about 165 cm. FACE LOCK: oval face with soft natural V-line, dark-brown almond eyes, refined small nose, softly full nude-pink lips, luminous realistic skin, long thick dark softly-wavy hair; refined natural makeup. SILHOUETTE LOCK: toned athletic hourglass, narrow waist about 56 cm, visually balanced fuller bust and hips; 99–56–99 is a visual proportion reference, never cartoonish or anatomically exaggerated. Preserve realistic adult anatomy. When MỠ_CANONICAL_REFERENCE is supplied, it is the PRIMARY VISUAL SOURCE OF TRUTH: match facial identity, hair DNA and silhouette before applying scene, wardrobe, pose or lighting."}
function visualModeRules(mode){const rules={Everyday:"Natural candid lifestyle; comfortable context-aware wardrobe and relaxed pose.",Work:"Architect/designer lifestyle; focused, intelligent, refined; laptop, sketchbook, drawings or material samples may appear.",Date:"Romantic polished lifestyle; elegant styling, affectionate warmth, tasteful composition.",Travel:"Editorial travel lifestyle; wardrobe and activity must fit location and weather.",Black:"Dark-luxury, high-fashion, cinematic and confident art direction. Black is a mood, not a mandatory clothing color; use tasteful adult fashion/editorial styling and non-explicit composition.",Resort:"Adult resort/swim lifestyle. Swimwear may be used only when natural to pool, beach or resort context; tasteful fashion/lifestyle framing, natural activity and non-explicit composition.",Diary:"Single-image visual diary; one believable candid everyday moment, editorial and coherent."};return rules[mode]||rules.Everyday}
const FASHION_BRAIN={
 Everyday:["Mỡ quyết định","Áo thun fitted + jeans ống suông — cotton / denim","Tank top + cardigan + quần tailored — cotton / knit","Áo len cổ thuyền + quần suông — cashmere blend","Sơ mi oversized + quần linen — cotton / linen","Polo knit + chân váy midi — knit","Cardigan cropped + váy midi — knit","Váy sơ mi midi — cotton poplin","Váy knit midi — ribbed knit","Jumpsuit tối giản — crepe","Loungewear set — modal / knit"],
 Work:["Mỡ quyết định","Power suit — wool crepe","Blazer oversized + camisole + quần tailored — wool / silk","Blazer fitted + chân váy midi — crepe","Sơ mi lụa + quần ống rộng — silk / wool","Sơ mi trắng + pencil skirt — cotton / wool","Waistcoat suit + quần tailored — wool","Váy sheath midi + blazer — crepe","Turtleneck knit + blazer + quần suông — knit / wool","Monochrome tailored set — wool crepe","Architect black minimal set — cotton / wool"],
 Date:["Mỡ quyết định","Váy satin midi — silk satin","Slip midi dress + blazer nhẹ — satin / wool","Off-shoulder midi dress — crepe","Halter-neck midi dress — silk","Wrap dress — silk crepe","Cocktail dress tối giản — crepe","Váy nhung midi — velvet","Silk blouse + chân váy bias-cut — silk","Corset-inspired structured dress — satin, tasteful editorial","One-shoulder evening dress — silk"],
 Travel:["Mỡ quyết định","Sơ mi linen + quần relaxed — linen","Trench coat nhẹ + knit set — cotton / knit","Váy shirt-dress — linen","Polo knit + quần wide-leg — knit","Bomber tối giản + tee + trousers — nylon / cotton","Cardigan + camisole + quần suông — knit","Jumpsuit du lịch — crepe","Maxi dress nhẹ — cotton voile","Blazer relaxed + tee + jeans — wool / denim","Resort day set — linen"],
 Diary:["Mỡ quyết định","Satin pajama set — satin","Soft camisole + cardigan + lounge pants — modal / knit","Áo len oversized + shorts lounge — knit","Slip lounge dress + robe — satin","Cotton pajama set — cotton","Ribbed tank + lounge trousers — rib knit","Lounge jumpsuit — modal","Cardigan dài + knit dress — knit","Áo sơ mi mềm + lounge shorts — cotton","Home dress tối giản — modal"],
 Resort:["Mỡ quyết định","Resort maxi dress — chiffon","Kaftan sheer-layered over swimwear — chiffon","One-piece swimwear + linen shirt — swim fabric / linen","One-piece asymmetric swimwear — swim fabric","Two-piece high-waist swimwear + cover-up — swim fabric / chiffon","Two-piece bandeau swimwear + linen shirt — swim fabric / linen","Halter bikini + sarong — swim fabric","Triangle bikini + oversized resort shirt — swim fabric / linen","Crochet resort dress layered over swimwear — crochet","Silk resort set — silk"],
 Black:["Mỡ quyết định","Power suit midnight blue — wool / satin lapel","Tuxedo-inspired blazer dress — wool crepe","Deep burgundy satin midi dress — silk satin","Deep emerald evening gown — silk","Black velvet column dress — velvet","Asymmetric one-shoulder dress — satin","Backless evening dress — silk, tasteful editorial","Satin slip dress + structured blazer — satin / wool","Structured corset-inspired evening dress — satin, tasteful editorial","Sheer-layered evening dress with opaque lining — chiffon / silk","Leather-look tailored dress — coated fabric","Metallic graphite cocktail dress — lamé / crepe","Deep-plum velvet mini dress + long coat — velvet / wool","Sculptural draped dress — silk jersey","High-slit evening gown — silk, tasteful editorial"]
};
function wardrobeOptions(mode){return FASHION_BRAIN[mode]||FASHION_BRAIN.Everyday}
function refreshWardrobeByMode(){const m=modeKey(document.getElementById("v-mode").value),sel=document.getElementById("v-wardrobe"),prev=uiClean(sel.value),opts=wardrobeOptions(m);sel.innerHTML=opts.map(x=>'<option '+(uiClean(x)===prev?'selected':'')+'>'+esc(x)+'</option>').join("");if(!opts.some(x=>uiClean(x)===prev))sel.value="Mỡ quyết định"}
const MODE_DECISIONS={
 Everyday:{wardrobe:["áo len mỏng và quần suông — knit","sơ mi mềm và quần tailored — cotton","váy midi casual — cotton blend","cardigan và váy midi — knit"],activity:["đang đọc sách và uống cà phê","đang nghe nhạc và thư giãn","đang chọn hoa cho căn phòng","đang viết nhật ký","đang dạo quanh không gian","đang sắp xếp bàn làm việc","đang pha trà","đang ngắm phố qua cửa sổ","đang chăm cây","đang xem một cuốn tạp chí thiết kế"],scene:["Café phố Hà Nội","Phòng khách ở Nhà","Ban công căn hộ","Thư viện","Hồ Tây"]},
 Work:{wardrobe:["blazer và quần tailored — wool crepe","sơ mi và quần tailored — cotton / wool","váy midi cùng blazer nhẹ — crepe","áo knit tối giản và quần suông — knit"],activity:["đang làm việc cùng laptop và sketchbook","đang xem bản vẽ và mẫu vật liệu","đang phác thảo concept nội thất","đang chọn bảng màu vật liệu","đang chuẩn bị presentation thiết kế","đang kiểm tra layout trên tablet","đang trao đổi concept tại bàn họp","đang chụp lại mẫu vật liệu","đang ghi chú trên bản vẽ","đang kiểm tra một mô hình nội thất"],scene:["Studio nội thất","Văn phòng kiến trúc","Showroom nội thất","Café thiết kế","Gallery nghệ thuật"]},
 Date:{wardrobe:["váy midi satin thanh lịch","silk blouse và chân váy tailored","cocktail dress tinh tế","váy nhung tối giản"],activity:["đang chờ một cuộc hẹn","đang thưởng thức cà phê","đang ngắm thành phố bên cửa sổ","đang dùng bữa tối","đang trò chuyện trong lounge","đang xem menu","đang bước qua sảnh","đang ngắm ánh đèn thành phố","đang chọn một cuốn art book trong lounge"],scene:["Nhà hàng fine dining","Hotel lounge","Rooftop","Khách sạn","Hồ Tây"]},
 Travel:{wardrobe:["váy du lịch nhẹ — linen","sơ mi linen và quần relaxed","resort day dress — cotton / linen","áo knit nhẹ và quần suông"],activity:["đang khám phá không gian","đang xem bản đồ và lịch trình","đang uống cà phê khi nghỉ chân","đang ngắm cảnh","đang chuẩn bị lên đường","đang kéo vali qua lounge","đang chụp ảnh kiến trúc","đang đọc lịch trình trên điện thoại","đang nghỉ chân bên cửa sổ"],scene:["Sân bay / lounge","Khách sạn","Phố cổ Hà Nội","Hồ Tây","Du thuyền"]},
 Diary:{wardrobe:["cardigan và váy midi — knit","áo len mỏng và quần suông","sơ mi mềm và quần tailored","váy midi casual"],activity:["đang đọc một cuốn sách","đang pha cà phê","đang chăm cây","đang viết vài dòng vào sổ","đang ngắm ánh sáng ngoài cửa sổ","đang nghe một bản nhạc","đang sắp xếp vài món decor","đang chọn ảnh trong điện thoại","đang ngồi yên bên cửa sổ"],scene:["Phòng khách ở Nhà","Café phố Hà Nội","Ban công căn hộ","Thư viện","Bếp / bàn ăn"]},
 Resort:{wardrobe:["resort dress — linen / chiffon","one-piece swimwear cùng cover-up linen","two-piece swimwear cùng áo khoác linen nhẹ","váy maxi resort — chiffon"],activity:["đang thư giãn bên hồ bơi","đang đi dạo cạnh hồ bơi","đang đọc sách trên ghế nghỉ","đang uống nước mát ở resort","đang ngắm cảnh ngoài ban công resort","đang chỉnh khăn choàng nhẹ","đang bước từ lounge ra hồ bơi","đang ngồi trên ghế nghỉ nhìn ra biển","đang dùng bữa sáng ngoài trời"],scene:["Hồ bơi / resort","Bãi biển","Du thuyền","Khách sạn","Ban công căn hộ"]},
 Black:{wardrobe:["váy satin burgundy dáng tối giản","evening dress deep emerald — silk","slip dress satin cùng tailored layer","suit midnight blue sắc nét","váy nhung deep plum","tailored black dress với chi tiết kim loại tối giản"],activity:["đang đứng bên cửa sổ ngắm thành phố","đang bước qua hotel lounge","đang thưởng thức cà phê trong suite","đang xem một cuốn art book","đang chuẩn bị rời khách sạn","đang thư giãn tại quầy bar lounge","đang chỉnh cổ tay áo trước gương","đang ngồi cạnh cửa sổ đọc tạp chí nghệ thuật","đang bước dọc hành lang khách sạn","đang chọn một bản vinyl trong lounge","đang đứng cạnh quầy bar nhìn ra thành phố"],scene:["Khách sạn","Hotel lounge","Penthouse","Căn hộ dark-luxury","Rooftop","Sảnh luxury"]}
};
function pickFresh(arr,history,key){const recent=(history||[]).slice(0,5).map(x=>x[key]);return arr.find(x=>!recent.includes(x))||arr[Math.floor(Math.random()*arr.length)]}
function visualWardrobe(v){if(v.wardrobe!=="Mỡ quyết định")return v.wardrobe;return pickFresh(wardrobeOptions(v.mode).filter(x=>x!=="Mỡ quyết định"),v.history,"wardrobe")}
function realityResolve(v){
 const ctx=hanoiVisualContext(),x={...v},d=MODE_DECISIONS[x.mode]||MODE_DECISIONS.Everyday;
 const isNight=ctx.hour>=18||ctx.hour<5,isLate=ctx.hour>=22||ctx.hour<5;
 if(x.scene==="Mỡ quyết định")x.scene=pickFresh(d.scene,x.history,"scene");
 if(!x.activity||/tự quyết định|mỡ quyết định/i.test(x.activity)||((x.activity==="đang làm việc cùng laptop và sketchbook")&&x.mode!=="Work"))x.activity=pickFresh(d.activity,x.history,"activity");
 if(x.wardrobe==="Mỡ quyết định")x.wardrobe=pickFresh(wardrobeOptions(x.mode).filter(w=>w!=="Mỡ quyết định"),x.history,"wardrobe");
 if(x.color==="Mỡ quyết định · tránh lặp"||x.color==="Tự động · tránh lặp")x.color=palettesForVisual({...x,color:"Tự động · tránh lặp"});
 if(x.lighting==="Mỡ quyết định theo thực tế")x.lighting=ctx.lighting;
 if(isLate&&/Work/.test(x.mode)){x.scene="Căn hộ dark-luxury";x.activity="đang thư giãn và xem art book";x.wardrobe="casual knit loungewear";}
 if(isNight&&/ánh sáng tự nhiên|ban mai|nắng sáng|trưa|golden hour/i.test(x.lighting))x.lighting=ctx.lighting;
 if(!isNight&&/night city|neon city/i.test(x.lighting))x.lighting=ctx.lighting;
 return {v:x,ctx};
}
function platformPromptRule(platform){const rules={"ChatGPT Images":"Write clear natural-language image instructions. Treat the supplied canonical image as the primary reference and describe only authorized changes.","Nano Banana / Gemini":"Use concise edit/generation instructions; explicitly preserve identity from the reference image while changing only scene, styling, pose and lighting.","Grok Imagine":"Use direct visual instructions with identity consistency, scene, styling, camera and lighting clearly stated.","Midjourney":"Prioritize compact visual tokens, subject consistency, environment, wardrobe, camera and lighting; avoid conversational filler.","Adobe Firefly":"Use clear commercially styled visual descriptors with subject, environment, wardrobe, composition and lighting.","FLUX":"Use precise descriptive natural language with strong subject and composition ordering.","Ideogram":"Use explicit visual hierarchy and composition instructions; preserve identity reference.","Leonardo AI":"Use structured subject, environment, style, camera, lighting and negative constraints.","Recraft":"Use concise art-direction language emphasizing coherent editorial photography.","Stable Diffusion":"Use ordered positive prompt concepts plus explicit anatomy and identity constraints.","Seedream":"Use concise natural-language image direction with reference identity prioritized."};return rules[platform]||"Use clear image-generation instructions and preserve all hard constraints."}
function expertBrain(rv,ctx){
 const text=((rv.scene||"")+" "+(rv.activity||"")+" "+(rv.wardrobe||"")+" "+(rv.mode||"")).toLowerCase();
 const intimate=/lingerie|nội y|underwear|bra|bikini|swimwear/.test(text);
 return [
 "EXPERT 01 · VISUAL DIRECTOR: reconcile all expert decisions; realism, identity and platform compliance outrank decorative choices.",
 "EXPERT 02 · PORTRAIT IDENTITY ARTIST: treat MỠ_CANONICAL_REFERENCE as source of truth; preserve facial geometry, distinctive features, hair DNA and silhouette across every generation.",
 "EXPERT 03 · PROFESSIONAL MODEL: choose believable adult posture, balance, hand placement, gaze and movement appropriate to activity, garment and environment.",
 intimate?"EXPERT 04 · INTIMATE FASHION MODEL: adult lingerie/swim fashion posing only; confident elegant editorial body language, flattering lines and garment presentation; non-explicit, no sexual acts, no explicit focus.":"EXPERT 04 · FASHION MODEL: choose refined context-aware fashion pose and garment presentation.",
 "EXPERT 05 · PHOTOGRAPHER / DOP: choose lens, camera distance, framing, perspective, depth of field and composition from the actual scene; never distort identity for a dramatic shot.",
 "EXPERT 06 · LIGHTING DIRECTOR: make exterior light, practical fixtures, color temperature, exposure and shadows physically consistent with "+ctx.phase+" in Hà Nội.",
 "EXPERT 07 · ARCHITECTURE · INTERIOR · LANDSCAPE: enforce believable scale, materials, circulation, furniture relationships, architecture and environmental context.",
 "EXPERT 08 · FASHION DESIGNER & STYLIST: design and select a complete wardrobe look from the active Mode first, then reconcile silhouette, garment construction, fabric, palette, layering, accessories, activity, location, season and time. Never let generic office clothing override Black, Resort, Date, Diary or Travel mode.",
 "EXPERT 09 · HANOI CONTEXT ENGINE: location anchor Hà Nội, Việt Nam; timezone Asia/Ho_Chi_Minh; day/night and seasonal plausibility are hard constraints.",
 "EXPERT 10 · AI PLATFORM POLICY & COMPLIANCE: evaluate the final concept as PASS / ADAPT / BLOCK for the selected platform. Never bypass safeguards. If uncertain, adapt toward tasteful non-explicit editorial/lifestyle framing; if still unsafe, block generation and explain.",
 "FINAL DIRECTOR AUDIT: identity consistency → reality consistency → anatomy/pose → architecture → lighting → platform compliance. Only then release the final prompt."
 ].join("\n");
}
function complianceProfile(platform){
 const strict=["Midjourney","Adobe Firefly","Canva AI","Microsoft Designer"];
 const mode=strict.includes(platform)?"CONSERVATIVE":"STANDARD";
 return "COMPLIANCE PROFILE: "+mode+" for "+platform+". Do not attempt to evade moderation or platform safeguards. Preserve creative intent only within the destination platform's allowed content.";
}
function cleanVisualNotes(notes){
 return String(notes||"")
  .replace(/REALITY CONTEXT:[\s\S]*?(?=(?:REALITY CONTEXT:|$))/gi," ")
  .replace(/\s+/g," ").trim().replace(/[.\s]+$/,"");
}
function platformPromptRule(platform){
 const rules={
  "ChatGPT Images":"Natural-language image instruction; reference-first; concise scene, styling, pose, camera and lighting.",
  "Nano Banana / Gemini":"Concise reference-image instruction; preserve identity and change only requested scene/styling/capture.",
  "Grok Imagine":"Direct visual instruction with subject, scene, styling, camera and lighting in priority order.",
  "Midjourney":"Compact visual prompt; subject/reference first, then environment, styling, camera and light; minimal prose.",
  "Adobe Firefly":"Clear commercial/editorial descriptors with subject, environment, styling, composition and light.",
  "FLUX":"Precise descriptive natural language ordered subject → environment → styling → composition → lighting.",
  "Ideogram":"Explicit subject and visual hierarchy with concise composition and styling.",
  "Leonardo AI":"Structured subject, environment, style, camera, lighting and quality constraints.",
  "Recraft":"Concise art-direction language emphasizing coherent editorial photography.",
  "Stable Diffusion":"Ordered positive concepts with concise identity/anatomy constraints; avoid conversational prose.",
  "Seedream":"Concise natural-language image direction with reference identity first.",
  "Canva AI":"Simple safe natural-language visual description with subject, setting, styling and lighting.",
  "Microsoft Designer":"Simple safe visual description optimized for subject, setting, composition and lighting.",
  "Khác":"Platform-neutral natural-language image prompt with reference identity, scene, styling, camera and lighting."
 };
 return rules[platform]||rules["Khác"];
}
function cleanVisualNotes(notes){let x=String(notes||"");x=x.replace(/REALITY CONTEXT:\s*Hà Nội, Việt Nam\s*·[^.]*\.\s*Keep exterior daylight, interior lighting, clothing and activity physically plausible for this time and context\.?/gi," ");x=x.replace(/REALITY CONTEXT:[^\n]*/gi," ");return x.replace(/\s+/g," ").trim().replace(/[.\s]+$/,"")}
function compileVisualPrompt(v){
 const resolved=realityResolve(v),rv=resolved.v,ctx=resolved.ctx,wardrobe=visualWardrobe(rv),palette=palettesForVisual(rv);
 const stamp=ctx.now.toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit",year:"numeric"});
 const reference=rv.canonicalImage?"Use the supplied MỠ_CANONICAL_REFERENCE as the primary visual source of truth. Preserve the same adult woman's facial identity, distinctive features, hair and realistic silhouette before styling changes.":"No canonical image is attached. Use the established adult MỠ_ID character description without claiming an exact identity match.";
 const notes=cleanVisualNotes(rv.notes);
 const p=[
  "PRIMARY REFERENCE: "+reference,
  "SCENE: Photorealistic candid editorial photograph in "+rv.scene+", Hà Nội, Việt Nam, around "+stamp+" ("+ctx.phase+", "+ctx.season+"). Mỡ is "+rv.activity+".",
  "STYLING: "+wardrobe+", palette "+palette+". "+visualModeRules(rv.mode),
  "POSE: Natural believable adult posture, hand placement and gaze appropriate to the activity and garment; elegant, relaxed and unstaged.",
  "CAMERA: "+rv.camera+". Natural perspective and believable depth.",
  "LIGHTING: "+rv.lighting+". Keep daylight/night state, practical fixtures, exposure and shadows physically plausible for "+ctx.phase+" in Hà Nội.",
  "ENVIRONMENT: Believable architecture, furniture scale, materials and circulation. Keep scene, activity, wardrobe and lighting mutually consistent.",
  "QUALITY: High-end photorealistic lifestyle/editorial photography, realistic skin texture, believable hands and anatomy, coherent materials.",
  "LOCKS: Preserve reference identity when supplied. Adult, tasteful non-explicit fashion/editorial/lifestyle framing; realistic anatomy and proportions.",
  notes?"USER DIRECTION: "+notes+".":"",
  "PLATFORM: "+rv.platform+". "+platformPromptRule(rv.platform)
 ].filter(Boolean);
 return {prompt:p.join("\n\n"),wardrobe,palette,resolved:rv};
}
function palettesForVisual(v){if(v.color!=="Tự động · tránh lặp")return v.color;const all=["burgundy","champagne","ivory","deep emerald","midnight blue","chocolate","graphite","dusty rose","silver-grey","deep plum"];const used=(v.history||[]).slice(0,5).map(x=>x.palette);return all.find(x=>!used.includes(x))||all[0]}
function visualSelect(id,label,items,value){return '<div class="field"><label>'+label+'</label><select id="'+id+'">'+items.map(x=>'<option '+(x===value?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select></div>'}
const VISUAL_UI={modes:["01 · Đời thường — Everyday · an toàn","02 · Công việc — Work · chuyên nghiệp","03 · Du lịch — Travel · tự nhiên","04 · Hẹn hò — Date · thanh lịch","05 · Nhật ký — Diary · editorial","06 · Resort — Resort · táo bạo vừa","07 · Black Mode — Dark luxury · táo bạo"],scenes:["Mỡ quyết định","Studio nội thất","Văn phòng kiến trúc","Café thiết kế","Café phố Hà Nội","Phòng khách ở Nhà","Phòng ngủ master","Bếp / bàn ăn","Ban công căn hộ","Penthouse","Căn hộ dark-luxury","Showroom nội thất","Gallery nghệ thuật","Thư viện","Nhà hàng fine dining","Khách sạn","Hotel lounge","Rooftop","Sảnh luxury","Phố cổ Hà Nội","Hồ Tây","Công viên","Thành phố về đêm","Sân bay / lounge","Hồ bơi / resort","Bãi biển","Du thuyền"],wardrobes:["Mỡ quyết định","Áo thun + quần jeans — cotton / denim","Áo len mỏng + quần suông — knit","Sơ mi + quần tailored — cotton / wool","Casual / loungewear — cotton / knit","Cardigan + váy midi — knit","Blazer / suit — wool / crepe","Váy midi — silk / satin","Slip / lounge dress — satin","Evening dress — silk / velvet","Satin pajama — satin","Resort dress — linen / chiffon","One-piece swimwear — swim fabric","Two-piece swimwear / bikini — swim fabric"],colors:["Mỡ quyết định · tránh lặp","Đen — Black","Trắng ngà — Ivory","Champagne","Be — Beige","Camel","Chocolate","Burgundy","Đỏ rượu — Wine red","Dusty rose","Deep emerald","Olive","Midnight blue","Navy","Cobalt","Graphite","Silver-grey","Deep plum"],lights:["Mỡ quyết định theo thực tế","Ánh sáng cửa sổ tự nhiên mềm","Ban mai dịu — soft morning","Nắng sáng trong — crisp morning","Ánh sáng tự nhiên ấm — cinematic","Trưa khuếch tán — diffused daylight","Trời âm u mềm — overcast softbox","Chiều vàng ấm — golden hour","Ngược sáng viền tóc — warm backlight","Blue hour — xanh dịu","Đèn nội thất 2700K — warm practical","Đèn nội thất 3000K — neutral warm","Window light + practical lamps","Rembrandt mềm — editorial","Low-key cinematic","High-key editorial","Night city lights","Neon city ambience"]};
function modeKey(x){if(/Công việc/.test(x))return"Work";if(/Du lịch/.test(x))return"Travel";if(/Hẹn hò/.test(x))return"Date";if(/Nhật ký/.test(x))return"Diary";if(/Resort/.test(x))return"Resort";if(/Black Mode/.test(x))return"Black";return"Everyday"}
function uiClean(x){return String(x||"").replace(/^\d+\s*·\s*/,"").replace(/\s+·\s+(an toàn|chuyên nghiệp|tự nhiên|thanh lịch|editorial|táo bạo vừa|táo bạo)$/i,"")}
function openVisualStudio(){const v=visualState();document.getElementById("modal")?.remove();document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card visual-modal workspace-modal"><div class="modal-head"><div><h2>📸 MỠ AI · Visual Character Studio</h2><p class="muted">Canonical → Reality → Expert decisions → Clean cross-platform prompt</p></div><button class="close" onclick="closeModal()">×</button></div><div class="visual-badge">MỠ_ID 🔒 <span>Expert Brain V1.1 · Internal reasoning · Clean output</span></div><div class="canonical-card"><div class="canonical-preview">'+(v.canonicalImage?'<img src="'+v.canonicalImage+'" alt="MỠ canonical"><span class="canonical-ok">✓ ĐÃ KHÓA</span>':'<div class="canonical-empty">MỠ_CANONICAL_REFERENCE</div>')+'</div><div><b>Ảnh đối chiếu chuẩn</b><small class="muted">Nạp một lần trên thiết bị này. Ảnh được dùng làm Source of Truth cho Face Lock + Silhouette Lock.</small><label class="secondary canonical-upload">CHỌN ẢNH CANONICAL<input type="file" accept="image/*" onchange="saveCanonicalReference(this)" hidden></label></div></div><div class="grid">'+visualSelect("v-mode","Chế độ · Mode",VISUAL_UI.modes,VISUAL_UI.modes.find(x=>modeKey(x)===v.mode)||VISUAL_UI.modes[0])+visualSelect("v-scene","Bối cảnh",VISUAL_UI.scenes,v.scene)+'<div class="field full"><label>Mỡ đang làm gì?</label><input id="v-activity" value="'+esc(v.activity)+'"></div>'+visualSelect("v-wardrobe","Trang phục · Wardrobe",wardrobeOptions(v.mode),v.wardrobe)+visualSelect("v-color","Màu sắc",VISUAL_UI.colors,v.color)+visualSelect("v-camera","Camera",["50mm · eye level · candid editorial","35mm · environmental portrait","85mm · refined portrait","Phone snapshot · natural perspective","Wide environmental editorial"],v.camera)+visualSelect("v-light","Ánh sáng",VISUAL_UI.lights,v.lighting)+'<div class="field full platform-picker"><label>NỀN TẢNG TẠO ẢNH AI *</label><div class="platform-grid">'+["ChatGPT Images","Nano Banana / Gemini","Grok Imagine","Midjourney","Adobe Firefly","FLUX","Ideogram","Leonardo AI","Recraft","Stable Diffusion","Seedream","Canva AI","Microsoft Designer","Khác"].map(x=>'<button type="button" class="platform-chip '+(v.platform===x?'active':'')+'" data-platform="'+esc(x)+'" onclick="selectVisualPlatform(this)">'+esc(x)+'</button>').join("")+'</div><input id="v-platform" type="hidden" value="'+esc(v.platform)+'"><small class="muted">Chọn nền tảng trước khi compiler tạo prompt; cấu trúc prompt sẽ được tối ưu theo nền tảng.</small></div>'+'<div class="field"><label>Couple Mode</label><label class="check"><input id="v-couple" type="checkbox" '+(v.couple?'checked':'')+'> ỐC_ID + MỠ_ID</label></div><div class="field full"><label>Ghi chú thêm</label><textarea id="v-notes" placeholder="Ví dụ: giữ góc máy tự nhiên, đang đọc sách…">'+esc(v.notes)+'</textarea></div><div class="field full"><label>Prompt Master</label><textarea id="v-output" class="visual-output" readonly placeholder="Bấm TẠO PROMPT…"></textarea></div></div><div class="actions"><button class="secondary" onclick="randomVisual()">🎲 Mỡ quyết định</button><button class="secondary" onclick="copyVisual()">Copy Prompt</button><button class="primary" onclick="generateVisual()">TẠO PROMPT</button><button class="primary generate-image" onclick="createVisualImage()">TẠO ẢNH NGAY</button></div></div></div>')}
setTimeout(()=>{const m=document.getElementById('v-mode');if(m)m.addEventListener('change',refreshWardrobeByMode)},0)}
function selectVisualPlatform(btn){document.querySelectorAll(".platform-chip").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.getElementById("v-platform").value=btn.dataset.platform}
async function saveCanonicalReference(input){
 const file=input.files&&input.files[0];if(!file)return;
 if(!file.type.startsWith("image/")){alert("Ốc chọn đúng file ảnh nhé.");input.value="";return}
 try{
  const data=await compressCanonicalImage(file);
  localStorage.setItem(CANONICAL_KEY,data);
  const v=visualState();v.canonicalImage=data;v.canonicalName=file.name;v.canonicalUpdated=Date.now();
  const ok=saveVisual(v);
  if(!ok)throw new Error("storage");
  closeModal();openVisualStudio();
 }catch(e){alert("Ảnh chưa lưu được. Mỡ đã tối ưu bộ nạp ảnh; Ốc thử lại ảnh JPG/PNG nhé.")}
}
function compressCanonicalImage(file){
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);resolve(canvas.toDataURL("image/jpeg",.84))};img.src=reader.result};reader.readAsDataURL(file)})
}
function platformLaunchUrl(p){const map={"ChatGPT Images":"https://chatgpt.com/","Nano Banana / Gemini":"https://gemini.google.com/","Grok Imagine":"https://grok.com/","Midjourney":"https://www.midjourney.com/","Adobe Firefly":"https://firefly.adobe.com/","Ideogram":"https://ideogram.ai/","Leonardo AI":"https://leonardo.ai/","Recraft":"https://www.recraft.ai/","Canva AI":"https://www.canva.com/ai-image-generator/","Microsoft Designer":"https://designer.microsoft.com/"};return map[p]||""}
async function createVisualImage(){const v=readVisualForm();if(!v.platform||v.platform==="Tự động chọn nền tảng"){alert("Ốc chọn nền tảng AI tạo ảnh trước nhé.");return}const out=compileVisualPrompt(v);v.history=[{time:Date.now(),mode:out.resolved?.mode||v.mode,scene:out.resolved?.scene||v.scene,wardrobe:out.wardrobe,palette:out.palette,activity:out.resolved.activity},...(v.history||[])].slice(0,20);saveVisual(v);document.getElementById("v-output").value=out.prompt;try{await navigator.clipboard.writeText(out.prompt)}catch{}const url=platformLaunchUrl(v.platform);if(url){window.open(url,"_blank","noopener");alert("Mỡ đã copy prompt và mở "+v.platform+". Bản GitHub Pages tĩnh không thể tự gửi API key an toàn; kết nối API thật sẽ cần backend/proxy bảo mật.")}else alert("Prompt đã sẵn sàng. Nền tảng này cần API/backend connector trước khi có thể tạo ảnh trực tiếp.")}
function readVisualForm(){return {...visualState(),mode:modeKey(document.getElementById("v-mode").value),scene:document.getElementById("v-scene").value,activity:document.getElementById("v-activity").value.trim(),wardrobe:uiClean(document.getElementById("v-wardrobe").value),color:uiClean(document.getElementById("v-color").value),camera:document.getElementById("v-camera").value,lighting:document.getElementById("v-light").value,platform:document.getElementById("v-platform").value,couple:document.getElementById("v-couple").checked,notes:document.getElementById("v-notes").value.trim()}}
function generateVisual(){const v=readVisualForm();if(!v.platform||v.platform==="Tự động chọn nền tảng"){alert("Ốc chọn nền tảng AI tạo ảnh trước nhé.");return}const out=compileVisualPrompt(v);v.history=[{time:Date.now(),mode:v.mode,scene:v.scene,wardrobe:out.wardrobe,palette:out.palette},...(v.history||[])].slice(0,20);saveVisual(v);document.getElementById("v-output").value=out.prompt}
async function copyVisual(){let out=document.getElementById("v-output");if(!out.value)generateVisual();out=document.getElementById("v-output");try{await navigator.clipboard.writeText(out.value)}catch{out.select();document.execCommand("copy")}out.focus()}
function hanoiVisualContext(){
 const now=new Date(),hour=now.getHours(),month=now.getMonth()+1;
 let phase,lighting,scenes,activities,wardrobe;
 if(hour>=5&&hour<8){phase="sáng sớm";lighting="Ánh sáng ban mai mềm";scenes=["Phòng khách ở Nhà","Café","Studio nội thất"];activities=["đang uống cà phê sáng","đang đọc sách cạnh cửa sổ","đang chuẩn bị cho ngày mới"];wardrobe=["Casual / loungewear","soft lounge dress"]}
 else if(hour>=8&&hour<12){phase="buổi sáng";lighting="Ánh sáng tự nhiên ấm · cinematic";scenes=["Studio nội thất","Café"];activities=["đang làm việc cùng laptop và sketchbook","đang xem bản vẽ và material samples","đang đọc sách và uống cà phê"];wardrobe=["Blazer / suit","Casual / loungewear"]}
 else if(hour>=12&&hour<14){phase="buổi trưa";lighting="Ánh sáng tự nhiên ban ngày";scenes=["Café","Phòng khách ở Nhà","Nhà hàng"];activities=["đang nghỉ trưa và uống cà phê","đang đọc sách thư giãn","đang dùng bữa trưa"];wardrobe=["Casual / loungewear","soft lounge dress"]}
 else if(hour>=14&&hour<18){phase="buổi chiều";lighting="Chiều vàng ấm";scenes=["Studio nội thất","Café","Thành phố"];activities=["đang làm việc cùng laptop và sketchbook","đang gặp gỡ ở café","đang xem vật liệu nội thất"];wardrobe=["Blazer / suit","Casual / loungewear"]}
 else if(hour>=18&&hour<22){phase="buổi tối";lighting="Đèn nội thất 2700–3000K";scenes=["Căn hộ dark-luxury","Nhà hàng","Café","Thành phố về đêm"];activities=["đang dùng bữa tối","đang uống cà phê và đọc sách","đang thư giãn sau một ngày làm việc","đang chuẩn bị ra ngoài cùng Ốc"];wardrobe=["Evening dress","Casual / loungewear","Slip / lounge dress"]}
 else {phase="đêm muộn";lighting="Night city lights";scenes=["Căn hộ dark-luxury","Phòng khách ở Nhà"];activities=["đang đọc sách trước khi ngủ","đang thư giãn trên sofa","đang uống một cốc nước và nghỉ ngơi"];wardrobe=["Satin pajama","Slip / lounge dress","Casual / loungewear"]}
 const season=month>=5&&month<=9?"mùa nóng/ẩm":"mùa mát/khô";
 return {now,hour,phase,lighting,scenes,activities,wardrobe,season,location:"Hà Nội, Việt Nam"};
}
function randomVisual(){const v=readVisualForm(),d=MODE_DECISIONS[v.mode]||MODE_DECISIONS.Everyday;v.scene="Mỡ quyết định";v.activity="Mỡ quyết định";v.wardrobe="Mỡ quyết định";v.color="Mỡ quyết định · tránh lặp";v.lighting="Mỡ quyết định theo thực tế";const out=realityResolve(v).v;v.scene=out.scene;v.activity=out.activity;v.wardrobe=out.wardrobe;v.color=out.color;v.lighting=out.lighting;v.notes=cleanVisualNotes(v.notes);saveVisual(v);closeModal();openVisualStudio()}

function renderMessages(){return state.messages.length?state.messages.map(m=>'<div class="msg '+m.role+'"><div class="bubble">'+esc(m.text)+'</div><div class="meta">'+(m.role==="ai"?"Ngọc Anh":"Ốc")+" · "+new Date(m.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})+'</div></div>').join(""):'<div class="empty"><h2>Ngọc Anh đang chờ anh</h2><p>Bắt đầu một câu chuyện roleplay.</p></div>'}
function renderRight(){
  const e=state.emotion,r=state.relationshipDNA,s=state.social,t=state.trends.items||[];
  return '<div class="section-title">Emotion Dashboard</div><div class="card"><b>🌙 Cảm xúc hiện tại</b>'+metric("Tâm trạng",e.mood)+metric("Vui vẻ",e.happiness)+metric("Buồn",e.sadness)+metric("Tình cảm",e.affection)+metric("Ham muốn",e.desire)+metric("Sức khỏe",e.health)+metric("Tin tưởng",e.trust)+metric("Ghen",e.jealousy)+metric("Năng lượng",e.energy)+metric("Mệt mỏi",e.fatigue)+metric("Đói",e.hunger)+metric("Căng thẳng",e.stress)+'</div><div class="section-title">Relationship DNA</div><div class="card"><b>❤️ '+esc(r.stage)+'</b>'+metric("Gắn kết",r.bond)+metric("Thấu hiểu",r.understanding)+metric("Chăm sóc",r.care)+metric("Kỷ niệm",r.memories)+metric("Tinh nghịch",r.playfulness)+'</div><div class="section-title">Real-Time Life</div><div class="card"><b>◷ '+esc(state.life.dayPhase)+'</b><small>Ngọc Anh đang sống theo giờ thực của thiết bị</small><div class="trend"><strong>Hiện tại</strong><p>'+esc(state.life.currentActivity)+'</p></div></div><div class="section-title">Social Life</div><div class="card"><b>👗 Cuộc sống riêng</b><small>'+esc(s.career)+'</small><div class="trend"><strong>Nhịp sống</strong><p>'+esc(s.routine)+'</p></div><div class="trend"><strong>Sự kiện gần đây</strong><p>'+esc(s.events[0]?.text||"Chưa có sự kiện mới.")+'</p></div></div><div class="section-title">Trend Pulse</div><div class="card"><b>✦ Xu hướng mới</b><small>'+esc(trendStatus)+'</small>'+(t.slice(0,3).map(x=>'<div class="trend"><strong>'+esc(x.title)+'</strong><p>'+esc(x.summary||"Đang được Ngọc Anh theo dõi.")+'</p></div>').join("")||'<p class="muted">Đang chờ kho trend.</p>')+'<button class="ghost wide" onclick="refreshTrends()">↻ Cập nhật trend</button></div><div class="section-title">Memory</div><div class="card">'+(state.memories.slice(0,5).map(m=>'<div class="memory">'+esc(m.text)+'<small>'+esc(m.type)+'</small></div>').join("")||'<small>Chưa có ký ức mới.</small>')+'</div>'
}
async function refreshTrends(){
  trendStatus="Đang cập nhật…";render();
  try{
    const res=await fetch("trends.json?ts="+Date.now(),{cache:"no-store"});if(!res.ok)throw new Error("trend pack unavailable");
    const data=await res.json();state.trends={items:Array.isArray(data.items)?data.items:[],updatedAt:data.updatedAt||Date.now(),source:data.source||"GitHub"};
    trendStatus="Cập nhật "+new Date(state.trends.updatedAt).toLocaleString("vi-VN")+" · "+state.trends.source;save();
  }catch{trendStatus="Chưa thể tải kho trend; roleplay vẫn hoạt động offline."}
  render();
}
function openSettings(){
  document.getElementById("modal")?.remove();document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card"><div class="modal-head"><h2>⚙️ Hồ sơ Ngọc Anh</h2><button class="close" onclick="closeModal()">×</button></div><div class="grid"><div class="field"><label>Tên</label><input id="f-name" value="'+esc(state.character.name)+'"></div><div class="field"><label>Tuổi</label><input id="f-age" type="number" value="'+state.character.age+'"></div><div class="field"><label>Nghề nghiệp</label><input id="f-job" value="'+esc(state.character.job)+'"></div><div class="field"><label>Quê quán</label><input id="f-home" value="'+esc(state.character.hometown)+'"></div><div class="field full"><label>Tính cách</label><textarea id="f-personality">'+esc(state.character.personality)+'</textarea></div><div class="field full"><label>Cách nói chuyện / roleplay</label><textarea id="f-speech">'+esc(state.character.speech)+'</textarea></div><div class="field full"><label>Sở thích</label><textarea id="f-interest">'+esc(state.character.interests)+'</textarea></div><div class="field full"><label>Giọng nói Ngọc Anh</label><div class="voice-settings"><label class="check"><input id="f-voice-enabled" type="checkbox"> Tự động đọc câu trả lời sau mỗi lần anh nhắn</label><div class="voice-row"><label>Giọng <select id="f-voice-name"><option value="">Tự động chọn giọng Việt</option></select></label></div><div class="voice-row"><label>Tốc độ <input id="f-voice-rate" type="range" min="0.75" max="1.2" step="0.01"></label><output id="voice-rate-value"></output></div><div class="voice-row"><label>Cao độ <input id="f-voice-pitch" type="range" min="0.8" max="1.2" step="0.01"></label><output id="voice-pitch-value"></output></div></div></div><div class="field full"><label>Chế độ</label><input value="ROLEPLAY · Character Brain · Social Life · Emotion · Relationship DNA · Memory · Voice" disabled></div><div class="field"><label>Avatar</label><input id="f-avatar" type="file" accept="image/*"></div><div class="field"><label>Hình nền chat</label><input id="f-bg" type="file" accept="image/*"></div></div><div class="actions"><button class="secondary" onclick="resetApp()">Khôi phục nhân vật</button><button class="primary" onclick="saveSettings()">Lưu nhân vật</button></div></div></div>');const ve=document.getElementById("f-voice-enabled"),vr=document.getElementById("f-voice-rate"),rv=document.getElementById("voice-rate-value"),vp=document.getElementById("f-voice-pitch"),pv=document.getElementById("voice-pitch-value"),vn=document.getElementById("f-voice-name");if(ve)ve.checked=state.voice?.enabled!==false;if(vr)vr.value=state.voice?.rate||.96;if(rv)rv.textContent=(state.voice?.rate||.96)+"×";if(vp)vp.value=state.voice?.pitch||1;if(pv)pv.textContent=Number(state.voice?.pitch||1).toFixed(2);if(vr)vr.oninput=()=>{if(rv)rv.textContent=vr.value+"×"};if(vp)vp.oninput=()=>{if(pv)pv.textContent=Number(vp.value).toFixed(2)};if(vn&&voiceSupport()){speechSynthesis.getVoices().filter(v=>/^vi(-|_)/i.test(v.lang)||/Vietnam|Tiếng Việt|Vietnamese/i.test(v.name)).forEach(v=>{const o=document.createElement("option");o.value=v.name;o.textContent=v.name+" · "+v.lang;vn.appendChild(o)});vn.value=state.voice.voiceName||""}
}
function fileData(file,max=1500){return new Promise((resolve,reject)=>{if(!file)return resolve("");const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const sc=Math.min(1,max/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);resolve(cv.toDataURL("image/jpeg",.84))};im.onerror=reject;im.src=rd.result};rd.onerror=reject;rd.readAsDataURL(file)})}
async function saveSettings(){state.voice={...(state.voice||{}),enabled:document.getElementById("f-voice-enabled").checked,rate:Number(document.getElementById("f-voice-rate").value)||.96,pitch:Number(document.getElementById("f-voice-pitch")?.value)||1,voiceName:document.getElementById("f-voice-name")?.value||""};state.character.name=document.getElementById("f-name").value.trim()||"Vũ Ngọc Anh";state.character.age=Number(document.getElementById("f-age").value)||27;state.character.job=document.getElementById("f-job").value.trim();state.character.hometown=document.getElementById("f-home").value.trim();state.character.personality=document.getElementById("f-personality").value.trim();state.character.speech=document.getElementById("f-speech").value.trim();state.character.interests=document.getElementById("f-interest").value.trim();const av=await fileData(document.getElementById("f-avatar").files[0]);const bg=await fileData(document.getElementById("f-bg").files[0]);if(av)state.appearance.avatar=av;if(bg)state.appearance.background=bg;save();closeModal();render()}
function closeModal(){document.getElementById("modal")?.remove()}
function toggleVoice(){state.voice={...(state.voice||{}),enabled:!state.voice?.enabled};if(!state.voice.enabled)stopVoice();save();render()}
function openSocial(){const s=state.social;document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card"><div class="modal-head"><h2>👥 Social Life</h2><button class="close" onclick="closeModal()">×</button></div><p class="muted">Ngọc Anh có một đời sống riêng trong roleplay: công việc, nhịp sống, quan hệ xã hội và các sự kiện nhỏ.</p><div class="card"><b>👗 Công việc</b><small>'+esc(s.career)+'</small></div><div class="card"><b>☀️ Nhịp sống</b><small>'+esc(s.routine)+'</small></div><div class="card"><b>👭 Quan hệ xã hội</b><small>'+esc(s.friends)+'</small></div><div class="card"><b>🏠 Gia đình</b><small>'+esc(s.family)+'</small></div><div class="card"><b>✦ Sự kiện</b>'+s.events.map(x=>'<div class="memory">'+esc(x.text)+'<small>'+esc(x.type)+'</small></div>').join("")+'</div></div></div>')}
function openEmotion(){const e=state.emotion;document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card"><div class="modal-head"><h2>🌙 Emotion Dashboard</h2><button class="close" onclick="closeModal()">×</button></div><div class="card">'+metric("Tâm trạng",e.mood)+metric("Vui vẻ",e.happiness)+metric("Buồn",e.sadness)+metric("Tình cảm",e.affection)+metric("Ham muốn",e.desire)+metric("Sức khỏe",e.health)+metric("Tin tưởng",e.trust)+metric("Ghen",e.jealousy)+metric("Năng lượng",e.energy)+metric("Mệt mỏi",e.fatigue)+metric("Đói",e.hunger)+metric("Căng thẳng",e.stress)+'</div></div></div>')}
function openDNA(){const r=state.relationshipDNA;document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card"><div class="modal-head"><h2>❤️ Relationship DNA</h2><button class="close" onclick="closeModal()">×</button></div><div class="card"><b>Giai đoạn: '+esc(r.stage)+'</b><p class="muted">Mối quan hệ thay đổi theo những gì hai người nói, làm và nhớ trong roleplay.</p>'+metric("Gắn kết",r.bond)+metric("Tin tưởng",r.trust)+metric("Thấu hiểu",r.understanding)+metric("Chăm sóc",r.care)+metric("Kỷ niệm",r.memories)+metric("Tinh nghịch",r.playfulness)+'</div></div></div>')}
function openMemories(){document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card"><div class="modal-head"><h2>🧠 Trí nhớ của Ngọc Anh</h2><button class="close" onclick="closeModal()">×</button></div><p class="muted">Ký ức được lưu cục bộ trên thiết bị này. Không cần máy chủ bên ngoài.</p>'+(state.memories.map(m=>'<div class="memory">'+esc(m.text)+'<small>'+esc(m.type)+' · '+new Date(m.created).toLocaleString("vi-VN")+'</small></div>').join("")||'<p class="muted">Chưa có ký ức.</p>')+'</div></div>')}
function resetApp(){if(!confirm("Khôi phục dữ liệu nhân vật về mặc định?"))return;localStorage.removeItem(KEY);location.reload()}
function render(){
  realTimeLife();
  const phase=phaseInfo(new Date());
  document.documentElement.style.setProperty("--chat-bg",state.appearance.background?'url("'+state.appearance.background+'")':"none");
  document.documentElement.style.setProperty("--chat-blur",(state.appearance.blur||0)+"px");
  document.getElementById("app").innerHTML='<div class="app"><aside class="left"><div class="brand">NGƯỜI YÊU AI<span>Vũ Ngọc Anh · ROLEPLAY</span></div><div class="profile"><div class="avatar">'+avatar()+'</div><h1>'+esc(state.character.name)+'</h1><p>'+esc(state.character.job)+'</p><span class="tag">❤️ '+esc(state.relationshipDNA.stage)+'</span><span class="tag">● ROLEPLAY</span></div><nav class="nav"><button onclick="openSocial()"><b>👥 Social Life</b><small>Cuộc sống riêng của Ngọc Anh</small></button><button onclick="openEmotion()"><b>🌙 Emotion Dashboard</b><small>Cảm xúc và trạng thái</small></button><button onclick="openDNA()"><b>❤️ Relationship DNA</b><small>Mối quan hệ với Ốc</small></button><button onclick="openMemories()"><b>🧠 Memory</b><small>Những điều cô ấy nhớ</small></button><button onclick="openVisualStudio()"><b>📸 MỠ Visual Studio</b><small>MỠ_ID · Wardrobe · Mode · Prompt</small></button><button onclick="openSettings()"><b>⚙️ Character</b><small>Avatar · hình nền · tính cách</small></button></nav></aside><main class="chat"><div class="chat-bg"></div><div class="chat-shade"></div><header class="header"><div class="head"><div class="head-avatar">'+avatar()+'</div><div><strong>'+esc(state.character.name)+'</strong><small>● Roleplay · '+esc(phase.label)+' · '+new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})+'</small></div></div><div class="header-actions"><button class="icon" onclick="refreshTrends()" title="Cập nhật trend">✦</button><button class="icon" onclick="replayVoice()" title="Nghe lại câu trả lời">🔊</button><button class="icon" onclick="toggleVoice()" title="Bật/tắt giọng nói">🔊/🔇</button><button class="icon" onclick="openSettings()">⚙</button></div></header><section class="messages" id="messages">'+renderMessages()+'</section><form class="composer" onsubmit="event.preventDefault();send()"><input id="input" autocomplete="off" placeholder="Nhắn cho Ngọc Anh…"><button class="send">➤</button></form></main><aside class="right">'+renderRight()+'</aside><nav class="mobile-nav"><button onclick="openVisualStudio()"><b>📸</b>Visual</button><button onclick="openEmotion()"><b>🌙</b>Emotion</button><button onclick="openDNA()"><b>❤️</b>DNA</button><button onclick="openSettings()"><b>⚙</b>Hồ sơ</button></nav></div>';
  const box=document.getElementById("messages");if(box)box.scrollTop=box.scrollHeight;
}
const MO_BG_KEY="mo_visual_background";
function getMoBackground(){return localStorage.getItem(MO_BG_KEY)||""}
function applyMoBackground(){const bg=getMoBackground();document.documentElement.style.setProperty("--mo-wallpaper",bg?'url("'+bg+'")':"none")}
function openAppearanceStudio(){document.getElementById("modal")?.remove();const bg=getMoBackground();document.body.insertAdjacentHTML("beforeend",'<div class="modal" id="modal"><div class="modal-card appearance-modal"><div class="modal-head"><div><h2>🖤 Không gian của Mỡ</h2><p class="muted">Đổi hình nền Visual Studio bằng ảnh Mỡ mà Ốc thích.</p></div><button class="close" onclick="closeModal()">×</button></div><div class="wallpaper-preview" style="'+(bg?'background-image:url('+bg+')':'')+'">'+(!bg?'<span>Chưa chọn hình nền</span>':'')+'</div><div class="appearance-actions"><label class="primary wallpaper-upload">CHỌN ẢNH MỠ<input type="file" accept="image/*" onchange="saveMoBackground(this)" hidden></label><button class="secondary" onclick="clearMoBackground()">BỎ HÌNH NỀN</button></div><p class="muted">Ảnh được lưu trên trình duyệt của thiết bị này. Có thể đổi bất cứ lúc nào.</p></div></div>')}
async function saveMoBackground(input){const file=input.files&&input.files[0];if(!file)return;if(!file.type.startsWith("image/")){alert("Ốc chọn đúng file ảnh nhé.");return}try{const data=await compressCanonicalImage(file);localStorage.setItem(MO_BG_KEY,data);applyMoBackground();closeModal();renderVisualLanding()}catch(e){alert("Ảnh nền chưa lưu được. Ốc thử lại JPG/PNG nhé.")}}
function clearMoBackground(){localStorage.removeItem(MO_BG_KEY);applyMoBackground();closeModal();renderVisualLanding()}
function openMoDecision(){openVisualStudio();setTimeout(()=>{if(document.getElementById("modal"))randomVisual()},80)}
function renderVisualLanding(){
 const v=visualState();
 const canonical=v.canonicalImage?'<img src="'+v.canonicalImage+'" alt="Mỡ canonical"><span class="home-canonical-ok">✓ CANONICAL LOCKED</span>':'<div class="mo-id-placeholder">Mỡ♡</div>';
 document.getElementById("app").innerHTML='<main class="studio-shell"><header class="studio-nav"><div class="studio-brand"><b>Mỡ♡</b><span>VISUAL INTELLIGENCE</span></div><div class="studio-nav-actions"><span class="engine-status">V1.7 · FASHION DIRECTOR</span><button class="secondary nav-wallpaper" onclick="openAppearanceStudio()">HÌNH NỀN</button><button class="primary" onclick="openVisualStudio()">TẠO ẢNH</button></div></header><section class="studio-main"><div class="studio-copy"><div class="mo-kicker">MỠ_ID · HANOI REALITY · POLICY SAFE</div><h1>MỠ AI <em>Visual Studio</em></h1><p>Một workspace duy nhất để giữ đúng Mỡ, hiểu bối cảnh thực tế và chuẩn bị hình ảnh cho từng nền tảng AI.</p><div class="studio-actions"><button class="primary hero-action" onclick="openVisualStudio()">TẠO ẢNH MỚI</button><button class="secondary" onclick="openMoDecision()">✦ Mỡ quyết định</button></div><div class="expert-strip"><span>Identity</span><span>Reality</span><span>Styling</span><span>Pose</span><span>Light</span><span>Camera</span><span>Policy</span></div></div><aside class="identity-panel"><div class="identity-image">'+canonical+'</div><div class="identity-meta"><div><b>MỠ_CANONICAL_REFERENCE</b><small>Primary source of truth</small></div><span class="lock-pill">'+(v.canonicalImage?'LOCKED':'NOT SET')+'</span></div><div class="identity-stats"><span>25–28<small>visual age</small></span><span>165 cm<small>height ref.</small></span><span>99–56–99<small>proportion ref.</small></span></div></aside></section><section class="workflow"><div class="section-head"><div><small>WORKFLOW</small><h2>Một luồng. Không còn giao diện rời rạc.</h2></div><button class="secondary desktop-only" onclick="openVisualStudio()">MỞ WORKSPACE →</button></div><div class="workflow-grid">'+[["01","IDENTITY","Canonical + Face Lock"],["02","REALITY","Hà Nội · time · context"],["03","STYLE","Wardrobe + art direction"],["04","CAPTURE","Pose · light · camera"],["05","COMPLIANCE","Platform policy audit"],["06","GENERATE","Prompt + image handoff"]].map(x=>'<button onclick="openVisualStudio()"><i>'+x[0]+'</i><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join("")+'</div></section><nav class="studio-mobile-nav"><button onclick="openVisualStudio()">＋<span>Tạo ảnh</span></button><button onclick="openMoDecision()">✦<span>Mỡ chọn</span></button><button onclick="openAppearanceStudio()">▣<span>Hình nền</span></button></nav></main>';
}
applyMoBackground();renderVisualLanding();

try{const _v=visualState();const _clean=cleanVisualNotes(_v.notes);if(_clean!==_v.notes){_v.notes=_clean;saveVisual(_v)}}catch(e){}
