// Reliable free TTS for FARRUKH AI Mobile.
// Prefer the phone/browser system voice because it works after async AI replies
// without a paid API or remote audio autoplay.
const originalSpeak = typeof speak === 'function' ? speak : null;

function nativeSpeak(text){
  if(!state.tts || !text || !('speechSynthesis' in window)) return false;
  try{
    speechSynthesis.cancel();
    speechSynthesis.resume();

    const u=new SpeechSynthesisUtterance(String(text));
    u.lang='ru-RU';
    u.rate=0.96;
    u.pitch=0.98;
    u.volume=1;

    const voices=speechSynthesis.getVoices()||[];
    const ru=voices.find(v=>/^ru(-|_)/i.test(v.lang||'')) ||
             voices.find(v=>/russian|рус/i.test((v.name||'')+' '+(v.lang||''))) ||
             voices.find(v=>v.default);
    if(ru) u.voice=ru;

    u.onerror=e=>console.warn('Native TTS error:',e.error);
    speechSynthesis.speak(u);

    // Some Android builds pause synthesis after an async fetch.
    setTimeout(()=>{ try{ speechSynthesis.resume(); }catch(e){} },250);
    return true;
  }catch(err){
    console.warn('Native TTS failed:',err);
    return false;
  }
}

speak=function(text){
  if(!state.tts || !text) return;
  if(nativeSpeak(text)) return;
  if(originalSpeak) originalSpeak(text);
};

if('speechSynthesis' in window){
  speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
  window.addEventListener('pageshow',()=>{ try{speechSynthesis.resume();}catch(e){} });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){ try{speechSynthesis.resume();}catch(e){} }
  });
}