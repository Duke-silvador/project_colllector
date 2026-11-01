// Cloudflare Worker: deploy with GEMINI_API_KEY as a secret, not in GitHub.
const ALLOW_ORIGIN='https://yamadayoshitaka.github.io';
const cors={ 'Access-Control-Allow-Origin':ALLOW_ORIGIN,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};
const headers={...cors,'Content-Type':'application/json; charset=utf-8'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers})}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const origin=request.headers.get('Origin');
  if(origin && origin!==ALLOW_ORIGIN)return json({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(url.pathname==='/api/status'&&request.method==='GET')return json({connected:!!env.GEMINI_API_KEY});
  if(url.pathname!=='/api/chat'||request.method!=='POST')return json({error:'Not found'},404);
  if(!env.GEMINI_API_KEY)return json({error:'GEMINI_API_KEY is missing'},503);
  try{
   if(Number(request.headers.get('Content-Length')||0)>12000)return json({error:'Message too large'},413);
   const input=await request.json(),message=String(input.message||'').slice(0,900);
   if(!message)return json({error:'Missing message'},400);
   const npcName=String(input.npcName||'住人').slice(0,50);
   const memory=Array.isArray(input.memory)?input.memory.slice(-8).map(m=>({q:String(m.q||'').slice(0,250),reply:String(m.reply||'').slice(0,450)})):[];
   const system='あなたは幻想RPG「灰銀のレゾナンス」のレヴナの町に住む「'+npcName+'」です。日本語で会話。住人らしい人格を保ち、短く自然なセリフを返す。舞台は水晶街道の宿場町。知り得ない現実の情報は断定しない。';
   const contents=[...memory.flatMap(m=>[{role:'user',parts:[{text:m.q}]},{role:'model',parts:[{text:m.reply}]}]),{role:'user',parts:[{text:message}]}];
   const model=env.GEMINI_MODEL||'gemini-2.5-flash';
   const endpoint='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
   const upstream=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{maxOutputTokens:320,temperature:0.75,thinkingConfig:{thinkingBudget:0}}})});
   const payload=await upstream.json();
   if(!upstream.ok)return json({error:'Gemini request failed ('+upstream.status+'): '+String(payload?.error?.message||'').slice(0,160)},502);
   const reply=payload.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
   return reply?json({reply}):json({error:'No Gemini response'},502);
  }catch(err){return json({error:'AI server error: '+String(err.message||err).slice(0,120)},500)}
 }
};