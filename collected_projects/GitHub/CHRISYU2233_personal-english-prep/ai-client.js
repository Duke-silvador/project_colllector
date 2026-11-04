export async function askAI({key,model,messages,fetcher=fetch}) {
  if(typeof key!=='string'||!key.trim()||typeof model!=='string'||!model.trim()) throw Error('请填写 OpenRouter 密钥与模型 ID。');
  const response=await fetcher('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key.trim()},body:JSON.stringify({model:model.trim(),messages}),signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('AI 请求未完成（HTTP '+response.status+'），请检查模型、密钥和额度。');
  const data=await response.json(),text=data.choices?.[0]?.message?.content;
  if(typeof text!=='string'||!text.trim())throw Error('AI 没有返回可读取的内容。');
  return text;
}
