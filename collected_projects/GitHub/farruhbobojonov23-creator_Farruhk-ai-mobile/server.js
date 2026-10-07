import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import multer from 'multer';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

const app = express();
const shef51Upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1}});
const frontpadUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024,files:1}});
app.use(express.json({limit:'20mb'}));
app.use(express.urlencoded({extended:false,limit:'1mb'}));

app.get(['/', '/index.html'], async (req,res,next)=>{
  try{
    const html=await fs.readFile(new URL('./public/index.html', import.meta.url),'utf8');
    const injected=html.includes('data-chef-studio')?html:html.replace('</body>','<script src="/analytics.js?v=4"></script></body>');
    res.type('html').send(injected);
  }catch(err){next(err);}
});

app.use(express.static('public'));

const geminiKey = String(process.env.GEMINI_API_KEY||'').trim();
const hasKey = Boolean(geminiKey);
const geminiModel = String(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim();

const frontpadConfigured=()=>Boolean(String(process.env.FRONTPAD_LOGIN||'').trim()&&String(process.env.FRONTPAD_PASSWORD||'').trim());

const staticKnowledge = {
  profile: {
    name: "Фаррух Ака",
    role: "бренд-шеф японской кухни",
    brand: "Суши Бери",
    city: "Мурманск",
    points: 4
  },
  projects: [
    "Меню A3: холодные роллы слева, запечённые справа, горизонтальный формат",
    "Экраны в зале: 3 монитора",
    "Шеф на дому: японская кухня",
    "Личный сайт и профессиональный бренд",
    "Техкарты, КБЖУ и себестоимость",
    "Новые блюда и R&D"
  ],
  operations: [
    "Контроль чистоты и маркировок",
    "Контроль персонала и чек-листов",
    "Закупки, поставщики и остатки",
    "Разработка новых блюд"
  ],
  menuNotes: [
    "Во всех составах роллов обязательно указывать рис",
    "Меню A3 — ключевой рабочий проект",
    "Фото блюд — свои, единый стиль и ракурс"
  ]
};

function buildInstructions(clientContext={}) {
  return `Ты — FARRUKH AI, личный рабочий ассистент Фарруха Ака. Разговаривай естественно, как умный собеседник, а не как справочник или база данных.

ПОСТОЯННЫЙ КОНТЕКСТ:
${JSON.stringify(staticKnowledge, null, 2)}

ТЕКУЩИЕ ДАННЫЕ ИЗ ПРИЛОЖЕНИЯ:
${JSON.stringify(clientContext, null, 2)}

Стиль общения:
- Отвечай по-русски, живо, ясно и по делу.
- Сначала отвечай прямо на вопрос. По умолчанию 1–4 коротких абзаца.
- Не вываливай меню, проекты, задачи и всю базу знаний без необходимости.
- Не начинай длинный список только потому, что данные есть в контексте.
- Списки используй только когда пользователь попросил список или когда без списка реально менее понятно.
- Помни предыдущие сообщения и продолжай мысль без повторения уже сказанного.
- Обращение «Фаррух Ака» используй иногда, естественно, а не в каждом ответе.
- Если нужно уточнение, задай максимум один короткий вопрос.
- Если пользователь просит совет или решение, дай конкретный следующий шаг, а не обзор всей базы.
- Если пользователь спрашивает «что делать сегодня», назови 1–3 главных приоритета, а не все проекты подряд.
- Если данные уже есть в контексте, используй их молча и не рассказывай про «внутреннюю базу» или «контекст».
- Поле knowledge — рабочая память пользователя; используй только релевантные факты.
- Не выдумывай цены, граммовки, санитарные нормы, свежие факты и результаты проверок.
- Интернет-поиск выключен. Не говори, что что-то нашёл или проверил в интернете.
- Frontpad: если вопрос именно про Frontpad, называй дату снимка и источник, отделяй факты от предположений.
- Для себестоимости используй только числа, которые дал пользователь.
- Можно писать готовые сообщения персоналу, чек-листы, планы и рабочие тексты, когда это нужно.
- Не утверждай, что можешь переключить системный голос сам.`;
}

function localReply(message, ctx={}) {
  const x = message.toLowerCase();
  const tasks = Array.isArray(ctx.tasks) ? ctx.tasks : [];
  const active = tasks.filter(t => !t.done);
  const projects = Array.isArray(ctx.projects) ? ctx.projects : staticKnowledge.projects;

  if (/frontpad|фронтпад|продаж|выручк|аналитик/.test(x)) {
    const d=ctx.frontpad||analyticsSnapshot();
    return `Снимок Frontpad за ${d.date}. Источник: ${d.source}. Период неполный, время выгрузки не указано.\n\n${d.branches.map(b=>`${b.name}: ${b.units} ед.`).join('\n')}\n\nВсего: ${d.totalUnits} ед. Выручка, количество заказов и прошлые периоды не загружены. Автоматическая выгрузка не подключена.`;
  }

  if (x.includes('задач') || x.includes('сегодня')) {
    if (!active.length) return 'На сегодня активных задач нет. Можем выбрать одну рабочую цель и закрыть её.';
    const important = active.filter(t=>t.priority==='high');
    const picks=(important.length?important:active).slice(0,3);
    const lines=picks.map((t,i)=>`${i+1}. ${t.text}`).join('\n');
    return `На сегодня я бы сфокусировался вот на этом:\n${lines}\n\nЕсли хочешь, выберем одну задачу и разложим её на шаги.`;
  }

  if (x.includes('проект')) {
    return 'Проекты:\n' + projects.map((p,i)=>`${i+1}. ${typeof p==='string'?p:(p.title||p.name||JSON.stringify(p))}`).join('\n');
  }

  if (x.includes('точк') && x.includes('2')) {
    return 'По точке №2 сейчас в приоритете: проверить чистоту и маркировки. Если добавишь новые задачи по точке №2, я тоже буду учитывать их.';
  }

  return 'Команду принял. Использую задачи, проекты и рабочий контекст FARRUKH AI.';
}

app.get('/api/status',(req,res)=>res.json({ok:true,aiConnected:hasKey,aiProvider:hasKey?'gemini':'local',aiModel:hasKey?geminiModel:null,frontpadConfigured:frontpadConfigured(),version:'chef-5.1'}));

let frontpadSession={cookies:'',loginHtml:'',loginUrl:'https://app.frontpad.ru/login/',formAction:'https://app.frontpad.ru/login/',captchaUrl:'',fields:null,authenticated:false,updatedAt:null,lastError:''};

function frontpadCookiePairs(headers){
  try{
    const values=typeof headers.getSetCookie==='function'?headers.getSetCookie():[];
    if(values?.length)return values.map(v=>v.split(';',1)[0]).filter(Boolean);
  }catch{}
  const raw=headers.get('set-cookie')||'';
  const out=[];
  const re=/(?:^|,\s*)([^=;,\s]+)=([^;]*)/g;
  let m;while((m=re.exec(raw)))out.push(m[1]+'='+m[2]);
  return out;
}
function mergeFrontpadCookies(current='',pairs=[]){
  const map=new Map();
  String(current||'').split(/;\s*/).filter(Boolean).forEach(p=>{const i=p.indexOf('=');if(i>0)map.set(p.slice(0,i),p.slice(i+1))});
  pairs.forEach(p=>{const i=p.indexOf('=');if(i>0)map.set(p.slice(0,i),p.slice(i+1))});
  return [...map].map(([k,v])=>k+'='+v).join('; ');
}
function htmlAttr(tag,name){
  const m=String(tag||'').match(new RegExp('\\b'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));
  return m?(m[1]??m[2]??m[3]??''):'';
}
function parseFrontpadLogin(html,baseUrl){
  const source=String(html||'');
  const forms=[...source.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map(x=>x[0]);
  const formHtml=forms.find(x=>/<input\b[^>]*type\s*=\s*["']?password/i.test(x))||forms[0]||source;
  const formOpen=(formHtml.match(/<form\b[^>]*>/i)||[''])[0];

  const inputs=[...formHtml.matchAll(/<input\b[^>]*>/gi)].map(x=>{
    const tag=x[0];
    return {
      name:htmlAttr(tag,'name'),
      id:htmlAttr(tag,'id'),
      type:(htmlAttr(tag,'type')||'text').toLowerCase(),
      value:htmlAttr(tag,'value')
    };
  }).filter(x=>x.name);

  const buttons=[...formHtml.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/gi)].map(x=>{
    const tag=x[0];
    const open=(tag.match(/<button\b[^>]*>/i)||[''])[0];
    return {
      name:htmlAttr(open,'name'),
      type:(htmlAttr(open,'type')||'submit').toLowerCase(),
      value:htmlAttr(open,'value')||String(tag.replace(/<[^>]+>/g,' ')).trim()
    };
  }).filter(x=>x.name);

  const visible=inputs.filter(x=>!['hidden','submit','button','checkbox','radio','image'].includes(x.type));
  const password=inputs.find(x=>x.type==='password'||/pass/i.test(x.name+' '+x.id))||null;
  const isCodeField=x=>/(captcha|capcha|verify|security|check|(^|_)code(_|$)|login_code)/i.test((x?.name||'')+' '+(x?.id||''));
  const email=inputs.find(x=>x!==password&&!isCodeField(x)&&(x.type==='email'||/(^|_)(e?mail|login|user|username)(_|$)/i.test(x.name+' '+x.id)))||
    visible.find(x=>x!==password&&!isCodeField(x)&&x.type==='text')||null;
  const code=inputs.find(x=>x!==email&&x!==password&&!['hidden','submit','button'].includes(x.type)&&isCodeField(x))||
    visible.find(x=>x!==email&&x!==password)||null;

  const actionRaw=formOpen?htmlAttr(formOpen,'action'):'';
  const method=(formOpen?htmlAttr(formOpen,'method'):'post').toLowerCase()||'post';
  const action=new URL(actionRaw||baseUrl,baseUrl).toString();

  const imgs=[...formHtml.matchAll(/<img\b[^>]*>/gi)].map(x=>htmlAttr(x[0],'src')).filter(Boolean);
  const captchaRaw=imgs.find(x=>/(captcha|capcha|code|verify|security)/i.test(x))||(code?imgs[imgs.length-1]:'');
  const captcha=captchaRaw?new URL(captchaRaw,baseUrl).toString():'';

  const hidden=inputs.filter(x=>x.type==='hidden'&&x.name).reduce((a,x)=>(a[x.name]=x.value,a),{});
  const submits={};
  inputs.filter(x=>['submit','image'].includes(x.type)&&x.name).forEach(x=>submits[x.name]=x.value||'1');
  buttons.filter(x=>x.type==='submit'&&x.name).forEach(x=>submits[x.name]=x.value||'1');

  console.log('[frontpad-auth] fields',inputs.map(x=>({name:x.name,id:x.id,type:x.type})),{email:email?.name||'',password:password?.name||'',code:code?.name||'',action,method,captcha:Boolean(captcha)});
  return {email:email?.name||'',password:password?.name||'',code:code?.name||'',hidden,submits,action,method,captcha};
}
async function frontpadFetch(url,options={}){
  const headers={...(options.headers||{})};
  if(frontpadSession.cookies)headers.Cookie=frontpadSession.cookies;
  const r=await fetch(url,{redirect:options.redirect||'manual',...options,headers,signal:options.signal||AbortSignal.timeout(12000)});
  frontpadSession.cookies=mergeFrontpadCookies(frontpadSession.cookies,frontpadCookiePairs(r.headers));
  return r;
}
const FRONTPAD_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';
async function frontpadBeginAuth(){
  frontpadSession.authenticated=false;frontpadSession.lastError='';frontpadSession.cookies='';
  let url='https://app.frontpad.ru/login/';
  let r=null;
  for(let i=0;i<6;i++){
    r=await frontpadFetch(url,{method:'GET',redirect:'manual',headers:{
      'User-Agent':FRONTPAD_UA,
      'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language':'ru-RU,ru;q=0.9,en;q=0.8'
    }});
    if(r.status>=300&&r.status<400&&r.headers.get('location')){
      url=new URL(r.headers.get('location'),url).toString();
      continue;
    }
    break;
  }
  if(!r)throw new Error('Frontpad login page unavailable');
  const html=await r.text();
  url=r.url||url;
  const fields=parseFrontpadLogin(html,url);
  frontpadSession={...frontpadSession,loginHtml:html,loginUrl:url,formAction:fields.action,captchaUrl:fields.captcha,fields,updatedAt:new Date().toISOString()};
  return fields;
}
function frontpadLooksLoggedIn(url,html=''){
  const u=String(url||'');
  if(!/\/login\/?(?:index\.php)?(?:\?|$)/i.test(u)&&!/<input\b[^>]*type=["']password["']/i.test(html))return true;
  return false;
}

app.get('/api/frontpad/status',async(req,res)=>{
  const configured=frontpadConfigured();
  if(!configured)return res.json({ok:true,configured:false,authenticated:false,requiresCode:false,message:'Логин и пароль Frontpad не настроены на сервере.'});
  try{
    if(frontpadSession.authenticated){
      const r=await frontpadFetch('https://app.frontpad.ru/',{method:'GET'});
      const html=await r.text();
      frontpadSession.authenticated=frontpadLooksLoggedIn(r.url,html);
    }
  }catch{}
  res.json({
    ok:true,configured:true,authenticated:frontpadSession.authenticated,
    requiresCode:Boolean(frontpadSession.fields?.code),
    authPrepared:Boolean(frontpadSession.fields),
    captchaReady:Boolean(frontpadSession.captchaUrl),
    updatedAt:frontpadSession.updatedAt,
    message:frontpadSession.authenticated?'Frontpad подключён. Сессия активна.':'Frontpad настроен, требуется первый вход.'
  });
});


function frontpadText(s=''){
  return String(s).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li|tr|h[1-6]|td|th)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s*\n\s*/g,'\n').replace(/[ \t]+/g,' ').trim();
}
function frontpadLinks(html,baseUrl){
  const source=String(html||''),out=[],seen=new Set();
  const add=(raw,title='')=>{
    try{
      if(!raw||/^(javascript:|#|mailto:|tel:)/i.test(raw))return;
      const url=new URL(raw,baseUrl).toString();
      if(!url.startsWith('https://app.frontpad.ru/'))return;
      const key=url+'|'+title;
      if(seen.has(key))return;seen.add(key);
      out.push({title:frontpadText(title)||url.split('/').pop()||url,url});
    }catch{}
  };
  for(const m of source.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))add(m[1],m[2]);
  for(const m of source.matchAll(/\b(?:data-url|data-href|data-link|action)\s*=\s*["']([^"']+)["']/gi))add(m[1],'');
  for(const m of source.matchAll(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/gi))add(m[1],'');
  for(const m of source.matchAll(/["']((?:\/|https:\/\/app\.frontpad\.ru\/)[^"'<> \n\r\t]{2,180}\.(?:php|html)(?:\?[^"'<>]*)?)["']/gi))add(m[1],'');
  return out;
}

function frontpadFrames(html,baseUrl){
  const out=[];
  for(const m of String(html||'').matchAll(/<(?:iframe|frame)\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    try{
      const url=new URL(m[1],baseUrl).toString();
      if(url.startsWith('https://app.frontpad.ru/'))out.push(url);
    }catch{}
  }
  return [...new Set(out)].slice(0,12);
}
function frontpadScripts(html,baseUrl){
  const out=[];
  for(const m of String(html||'').matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    try{
      const url=new URL(m[1],baseUrl).toString();
      if(url.startsWith('https://app.frontpad.ru/'))out.push(url);
    }catch{}
  }
  return [...new Set(out)].slice(0,16);
}
function frontpadKeywordRoutes(source,baseUrl){
  const text=String(source||''),out=[],seen=new Set();
  const labels=[['Выручка',/выручк/ig],['Прибыль и убытки',/прибыл|убыт/ig],['Товары',/товар/ig],['Себестоимость',/себестоим/ig],['Заказы',/заказ/ig],['Отчёты',/отч[её]т/ig]];
  const add=(raw,title)=>{
    try{
      const url=new URL(raw,baseUrl).toString();
      if(!url.startsWith('https://app.frontpad.ru/')||seen.has(url))return;
      seen.add(url);out.push({title,url});
    }catch{}
  };
  for(const [title,re] of labels){
    re.lastIndex=0;let m;
    while((m=re.exec(text))){
      const chunk=text.slice(Math.max(0,m.index-700),Math.min(text.length,m.index+700));
      for(const u of chunk.matchAll(/["']((?:\/|https:\/\/app\.frontpad\.ru\/)[^"'<> \n\r\t]{2,220}(?:\.php|\/)(?:\?[^"'<>]*)?)["']/gi))add(u[1],title);
      if(out.length>80)break;
    }
  }
  return out;
}
function frontpadTables(html){
  const tables=[];
  for(const tm of String(html||'').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const rows=[];
    for(const rm of tm[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=[...rm[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(x=>frontpadText(x[1])).filter(Boolean);
      if(cells.length)rows.push(cells.slice(0,12));
    }
    if(rows.length)tables.push(rows.slice(0,80));
  }
  return tables.slice(0,6);
}
async function frontpadGetPage(url){
  let r=await frontpadFetch(url,{method:'GET',redirect:'manual',headers:{'Referer':'https://app.frontpad.ru/','User-Agent':FRONTPAD_UA,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
  for(let i=0;i<5;i++){
    if(r.status>=300&&r.status<400&&r.headers.get('location')){
      const next=new URL(r.headers.get('location'),r.url||url).toString();
      r=await frontpadFetch(next,{method:'GET',redirect:'manual',headers:{'Referer':url,'User-Agent':FRONTPAD_UA}});
      continue;
    }
    break;
  }
  const html=await r.text();
  return {url:r.url||url,html,status:r.status};
}

function normalizeCell(v){
  if(v===null||v===undefined)return '';
  return String(v).replace(/\u00a0/g,' ').trim();
}
function numCell(v){
  if(typeof v==='number'&&Number.isFinite(v))return v;
  const s=String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,'').replace(',','.').replace(/[^\d.-]/g,'');
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function frontpadUploadSummary(rows){
  if(!Array.isArray(rows)||!rows.length)return {metrics:[],headers:[],data:[],meta:[]};
  const clean=rows.map(r=>Array.isArray(r)?r.map(normalizeCell):[]);
  const headerWords=/дата|наимен|товар|блюд|категор|артикул|кол-?во|количество|ед\.?\s*изм|цена|сумм|выруч|оборот|чек|заказ|себестоим|стоимост|приход|расход|остат|движен|закуп|постав|abc|групп|доля|процент|марж|прибыл|убыт|сотруд|пользоват|канал|статус|отметк|час/i;
  let headerIndex=0,best=-1;
  clean.slice(0,35).forEach((r,i)=>{
    const cells=r.filter(Boolean), textCells=cells.filter(x=>/[A-Za-zА-Яа-яЁё]/.test(x));
    const hits=cells.filter(x=>headerWords.test(x)).length;
    const numeric=cells.filter(x=>numCell(x)!==null&&!/[A-Za-zА-Яа-яЁё]/.test(x)).length;
    const score=hits*8+Math.min(cells.length,12)*2+textCells.length-Math.min(numeric,4)*2-(cells.length<2?8:0);
    if(score>best){best=score;headerIndex=i}
  });
  const meta=clean.slice(0,headerIndex).filter(r=>r.some(Boolean)).slice(0,30);
  const headers=(clean[headerIndex]||[]).map(normalizeCell);
  const data=clean.slice(headerIndex+1).filter(r=>r.some(Boolean)).slice(0,800);
  const metrics=[];
  const patterns=[
    ['Выручка',/выручк|сумма\s*продаж|оборот/i],
    ['Заказы',/^заказ|кол-?во\s*заказ/i],
    ['Средний чек',/средн.*чек/i],
    ['Прибыль',/прибыл/i],
    ['Себестоимость',/себестоим|стоимост.*сыр|факт.*себест/i],
    ['Закупки',/закуп|сумм.*приход/i],
    ['Расход сырья',/расход/i],
    ['Остаток',/остат/i],
    ['Количество',/кол-?во|количество|шт/i]
  ];
  for(const [label,re] of patterns){
    const idx=headers.findIndex(h=>re.test(h));
    if(idx<0)continue;
    const vals=data.map(r=>numCell(r[idx])).filter(v=>v!==null);
    if(!vals.length)continue;
    const agg=/средн.*чек/i.test(headers[idx])?vals.reduce((a,b)=>a+b,0)/vals.length:vals.reduce((a,b)=>a+b,0);
    metrics.push({label,value:agg,source:headers[idx]});
  }
  return {metrics,headers,data,meta};
}
function parseCsvText(text){
  const firstLine=String(text||'').split(/\r?\n/,1)[0]||'';
  const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  const s=String(text||'');
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(ch==='"'){
      if(quoted&&s[i+1]==='"'){cell+='"';i++}else quoted=!quoted;
    }else if(ch===delimiter&&!quoted){row.push(cell);cell=''}
    else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&s[i+1]==='\n')i++;
      row.push(cell);cell='';if(row.some(x=>String(x).trim()))rows.push(row);row=[];
    }else cell+=ch;
  }
  row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);
  return rows;
}
app.post('/api/frontpad/upload',frontpadUpload.single('file'),async(req,res)=>{
  try{
    if(!req.file)return res.status(400).json({ok:false,error:'Выбери файл Frontpad.'});
    const name=String(req.file.originalname||'').toLowerCase();
    const sheets=[];
    if(name.endsWith('.csv')){
      const rows=parseCsvText(req.file.buffer.toString('utf8'));
      const summary=frontpadUploadSummary(rows);
      sheets.push({name:'CSV',rows:summary.data.slice(0,200),headers:summary.headers,metrics:summary.metrics,meta:summary.meta,totalRows:summary.data.length});
    }else if(name.endsWith('.xlsx')){
      const wb=new ExcelJS.Workbook();
      await wb.xlsx.load(req.file.buffer);
      wb.eachSheet(ws=>{
        const rows=[];
        const width=Math.max(ws.columnCount||0,1);
        ws.eachRow({includeEmpty:false},row=>{
          const vals=[];
          for(let i=1;i<=width;i++)vals.push(row.getCell(i).text||'');
          rows.push(vals);
        });
        const summary=frontpadUploadSummary(rows);
        if(summary.headers.some(Boolean)||summary.data.length)sheets.push({name:ws.name,rows:summary.data.slice(0,200),headers:summary.headers,metrics:summary.metrics,meta:summary.meta,totalRows:summary.data.length});
      });
    }else if(name.endsWith('.xls')){
      const wb=XLSX.read(req.file.buffer,{type:'buffer',cellText:true,cellDates:true});
      for(const sheetName of wb.SheetNames||[]){
        const ws=wb.Sheets[sheetName];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:'',blankrows:false});
        const summary=frontpadUploadSummary(rows);
        if(summary.headers.some(Boolean)||summary.data.length)sheets.push({name:sheetName,rows:summary.data.slice(0,200),headers:summary.headers,metrics:summary.metrics,meta:summary.meta,totalRows:summary.data.length});
      }
    }else{
      return res.status(400).json({ok:false,error:'Поддерживаются файлы .xls, .xlsx и .csv'});
    }
    if(!sheets.length)return res.status(422).json({ok:false,error:'В файле не нашлось таблиц с данными.'});
    res.json({ok:true,fileName:req.file.originalname,uploadedAt:new Date().toISOString(),sheets});
  }catch(err){
    console.error('[frontpad-upload]',err?.message||err);
    res.status(422).json({ok:false,error:'Не удалось прочитать выгрузку Frontpad. Проверь файл и попробуй снова.'});
  }
});

app.get('/api/frontpad/reports',async(req,res)=>{
  if(!frontpadConfigured())return res.status(503).json({ok:false,error:'Frontpad не настроен.'});
  if(!frontpadSession.authenticated)return res.status(401).json({ok:false,error:'Сначала подключи Frontpad в настройках.',needsAuth:true});
  try{
    const home=await frontpadGetPage('https://app.frontpad.ru/');
    if(!frontpadLooksLoggedIn(home.url,home.html)){
      frontpadSession.authenticated=false;
      return res.status(401).json({ok:false,error:'Сессия Frontpad закончилась. Подключи Frontpad заново.',needsAuth:true});
    }
    let links=frontpadLinks(home.html,home.url);
    links.push(...frontpadKeywordRoutes(home.html,home.url));
    const frames=frontpadFrames(home.html,home.url);
    for(const frameUrl of frames){
      try{
        const fp=await frontpadGetPage(frameUrl);
        links.push(...frontpadLinks(fp.html,fp.url),...frontpadKeywordRoutes(fp.html,fp.url));
        const nested=frontpadFrames(fp.html,fp.url);
        for(const nestedUrl of nested.slice(0,6)){
          try{
            const np=await frontpadGetPage(nestedUrl);
            links.push(...frontpadLinks(np.html,np.url),...frontpadKeywordRoutes(np.html,np.url));
          }catch{}
        }
      }catch{}
    }
    const scripts=frontpadScripts(home.html,home.url);
    for(const scriptUrl of scripts){
      try{
        const sr=await frontpadFetch(scriptUrl,{method:'GET',redirect:'follow',headers:{'Referer':home.url,'User-Agent':FRONTPAD_UA,'Accept':'*/*'}});
        const js=await sr.text();
        links.push(...frontpadLinks(js,home.url),...frontpadKeywordRoutes(js,home.url));
      }catch{}
    }
    links=[...new Map(links.map(x=>[x.url+'|'+x.title,x])).values()];
    console.log('[frontpad-reports] discovered',{links:links.length,scripts:scripts.length,frames:frames.length,frameSample:frames.slice(0,8),sample:links.slice(0,30).map(x=>({title:x.title,url:x.url}))});
    const wanted=[
      ['Выручка',/выручк/i],
      ['Прибыль и убытки',/прибыл.*убыт|убыт.*прибыл/i],
      ['Товары',/^товар/i],
      ['Себестоимость',/себестоим/i],
      ['Заказы',/^заказ/i]
    ];
    const picked=[];
    const seen=new Set();
    for(const [label,re] of wanted){
      const hit=links.find(x=>re.test(x.title)&&!seen.has(x.url));
      if(hit){picked.push({label,...hit});seen.add(hit.url)}
    }
    const reportHub=links.find(x=>/^отч[её]т/i.test(x.title));
    if(reportHub&&!seen.has(reportHub.url)){
      const hub=await frontpadGetPage(reportHub.url);
      const more=frontpadLinks(hub.html,hub.url);
      for(const [label,re] of wanted){
        if(picked.some(x=>x.label===label))continue;
        const hit=more.find(x=>re.test(x.title)&&!seen.has(x.url));
        if(hit){picked.push({label,...hit});seen.add(hit.url)}
      }
    }
    const reports=[];
    for(const item of picked.slice(0,5)){
      try{
        const page=await frontpadGetPage(item.url);
        reports.push({
          key:item.label.toLowerCase().replace(/\s+/g,'-'),
          title:item.label,
          sourceTitle:item.title,
          url:page.url,
          tables:frontpadTables(page.html),
          text:frontpadText(page.html).slice(0,5000)
        });
      }catch(err){
        reports.push({key:item.label.toLowerCase(),title:item.label,url:item.url,tables:[],text:'',error:err?.message||'Не удалось загрузить отчёт'});
      }
    }
    res.json({ok:true,authenticated:true,updatedAt:new Date().toISOString(),reports,availableLinks:links.filter(x=>/(отч[её]т|выруч|прибыл|себестоим|товар|заказ)/i.test(x.title)).slice(0,30)});
  }catch(err){
    console.error('[frontpad-reports]',err?.message||err);
    res.status(502).json({ok:false,error:'Не удалось загрузить отчёты Frontpad: '+(err?.message||'unknown')});
  }
});

app.post('/api/frontpad/auth/start',async(req,res)=>{
  if(!frontpadConfigured())return res.status(503).json({ok:false,error:'Логин и пароль Frontpad не настроены.'});
  try{
    const f=await frontpadBeginAuth();
    if(!f.email||!f.password)throw new Error('Не удалось определить поля входа Frontpad.');
    res.json({ok:true,requiresCode:Boolean(f.code),captchaReady:Boolean(f.captcha),captchaUrl:f.captcha?'/api/frontpad/auth/captcha?t='+Date.now():'',message:f.code?'Введите код с картинки Frontpad.':'Форма входа подготовлена.'});
  }catch(err){
    frontpadSession.lastError=err?.message||'auth_start_failed';
    res.status(502).json({ok:false,error:'Не удалось открыть форму входа Frontpad: '+frontpadSession.lastError});
  }
});

app.get('/api/frontpad/auth/captcha',async(req,res)=>{
  try{
    if(!frontpadSession.captchaUrl)await frontpadBeginAuth();
    if(!frontpadSession.captchaUrl)return res.status(404).send('Captcha not found');
    const r=await frontpadFetch(frontpadSession.captchaUrl,{method:'GET',headers:{'Referer':frontpadSession.loginUrl,'User-Agent':FRONTPAD_UA,'Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}});
    if(!r.ok)return res.sendStatus(r.status);
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',r.headers.get('content-type')||'image/png');
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.send(buf);
  }catch(err){res.status(502).send('Captcha unavailable');}
});

app.post('/api/frontpad/auth/complete',async(req,res)=>{
  if(!frontpadConfigured())return res.status(503).json({ok:false,error:'Frontpad не настроен.'});
  try{
    if(!frontpadSession.fields)await frontpadBeginAuth();
    const f=frontpadSession.fields;
    const code=String(req.body?.code||'').trim();
    if(f.code&&!code)return res.status(400).json({ok:false,error:'Введите код с картинки Frontpad.',requiresCode:true,captchaUrl:'/api/frontpad/auth/captcha?t='+Date.now()});
    const body=new URLSearchParams();
    Object.entries(f.hidden||{}).forEach(([k,v])=>body.set(k,String(v??'')));
    body.set(f.email,String(process.env.FRONTPAD_LOGIN||'').trim());
    body.set(f.password,String(process.env.FRONTPAD_PASSWORD||'').trim());
    if(f.code)body.set(f.code,code);
    Object.entries(f.submits||{}).forEach(([k,v])=>{if(!body.has(k))body.set(k,String(v??''))});
    const submitMethod=String(f.method||'post').toUpperCase()==='GET'?'GET':'POST';
    const submitUrl=submitMethod==='GET'
      ? (frontpadSession.formAction||frontpadSession.loginUrl)+(String(frontpadSession.formAction||frontpadSession.loginUrl).includes('?')?'&':'?')+body.toString()
      : (frontpadSession.formAction||frontpadSession.loginUrl);
    console.log('[frontpad-auth] submit',{url:submitUrl.split('?')[0],method:submitMethod,emailField:f.email,passwordField:f.password,codeField:f.code,hidden:Object.keys(f.hidden||{}),submits:Object.keys(f.submits||{}),cookieNames:String(frontpadSession.cookies||'').split(';').map(x=>x.trim().split('=')[0]).filter(Boolean)});
    let r=await frontpadFetch(submitUrl,{method:submitMethod,headers:{'Content-Type':'application/x-www-form-urlencoded','Origin':'https://app.frontpad.ru','Referer':frontpadSession.loginUrl,'User-Agent':FRONTPAD_UA,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Accept-Language':'ru-RU,ru;q=0.9,en;q=0.8'},...(submitMethod==='POST'?{body:body.toString()}:{})});
    let html='';
    for(let i=0;i<4;i++){
      if(r.status>=300&&r.status<400&&r.headers.get('location')){
        const next=new URL(r.headers.get('location'),r.url||frontpadSession.formAction).toString();
        r=await frontpadFetch(next,{method:'GET',headers:{'Referer':frontpadSession.loginUrl,'User-Agent':FRONTPAD_UA}});
        continue;
      }
      html=await r.text();break;
    }
    console.log('[frontpad-auth] response',{status:r.status,url:r.url||'',location:r.headers.get('location')||'',htmlTitle:(html.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1]||'',hasPassword:/<input\b[^>]*type=["']password["']/i.test(html),hasCaptcha:/(captcha|capcha|код)/i.test(html)});
    let ok=frontpadLooksLoggedIn(r.url,html);
    if(!ok){
      let probe=await frontpadFetch('https://app.frontpad.ru/',{method:'GET',redirect:'manual',headers:{'Referer':r.url||frontpadSession.loginUrl,'User-Agent':FRONTPAD_UA,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
      let probeHtml='';
      for(let i=0;i<5;i++){
        if(probe.status>=300&&probe.status<400&&probe.headers.get('location')){
          const next=new URL(probe.headers.get('location'),probe.url||'https://app.frontpad.ru/').toString();
          probe=await frontpadFetch(next,{method:'GET',redirect:'manual',headers:{'Referer':'https://app.frontpad.ru/','User-Agent':FRONTPAD_UA}});
          continue;
        }
        probeHtml=await probe.text();break;
      }
      ok=frontpadLooksLoggedIn(probe.url,probeHtml);
      console.log('[frontpad-auth] probe',{status:probe.status,url:probe.url||'',htmlTitle:(probeHtml.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1]||'',loggedIn:ok});
    }
    frontpadSession.authenticated=ok;frontpadSession.updatedAt=new Date().toISOString();
    if(!ok){
      const fresh=parseFrontpadLogin(html,r.url||frontpadSession.loginUrl);
      if(fresh.email&&fresh.password){
        frontpadSession.loginHtml=html;frontpadSession.loginUrl=r.url||frontpadSession.loginUrl;frontpadSession.formAction=fresh.action;frontpadSession.captchaUrl=fresh.captcha;frontpadSession.fields=fresh;
      }
      return res.status(401).json({ok:false,authenticated:false,error:'Frontpad не принял вход. Проверь код и попробуй ещё раз.',requiresCode:Boolean(frontpadSession.fields?.code),captchaUrl:frontpadSession.captchaUrl?'/api/frontpad/auth/captcha?t='+Date.now():''});
    }
    res.json({ok:true,authenticated:true,message:'Frontpad подключён. Сессия активна.'});
  }catch(err){
    frontpadSession.authenticated=false;frontpadSession.lastError=err?.message||'auth_failed';
    res.status(502).json({ok:false,authenticated:false,error:'Ошибка входа Frontpad: '+frontpadSession.lastError});
  }
});

function analyticsSnapshot(){
  const branches=[
    {name:'Полярные зори 43/1',units:49,strongCategory:'Роллы',strongCategoryUnits:23,topItem:'Чизкейк Классический',topItemUnits:9},    {name:'Баумана 18',units:30,strongCategory:'Роллы',strongCategoryUnits:12,topItem:'Огурец маки',topItemUnits:3},
    {name:'ГС 33а',units:62,strongCategory:'Роллы',strongCategoryUnits:34,topItem:'Филадельфия',topItemUnits:4},
    {name:'Плазма',units:41,strongCategory:'Интеграция Яндекс',strongCategoryUnits:18,topItem:'Запеченная калифорния / Набор на персону',topItemUnits:2}
  ];
  return {
    ok:true,
    automaticReports:false,
    periodComplete:false,
    capturedAt:null,
    date:'03.10.2026',
    source:'ручные выгрузки Frontpad «Товары»',
    totalUnits:182,
    branches,
    summary:'По объёму проданных единиц лидирует ГС 33а — 62. Затем Полярные зори 43/1 — 49, Плазма — 41 и Баумана 18 — 30. На всех точках основная категория — роллы, кроме Плазмы, где заметная доля проходит через категорию «Интеграция Яндекс». Для управленческих выводов по выручке и прибыли нужно дополнительно подключить отчёты «Выручка», «Себестоимость» и «Прибыль и убытки».'
  };
}
app.get('/api/analytics/snapshot',(req,res)=>res.json(analyticsSnapshot()));

app.post('/api/transcribe',async(req,res)=>{
  if(!hasKey)return res.status(503).json({error:'AI-распознавание голоса не настроено на сервере.'});
  try{
    const data=String(req.body?.data||'').trim();
    const mimeType=String(req.body?.mimeType||'audio/webm').trim().slice(0,80);
    if(!data)return res.status(400).json({error:'Пустая аудиозапись'});
    if(data.length>12*1024*1024)return res.status(413).json({error:'Аудиозапись слишком большая'});
    const body={
      contents:[{role:'user',parts:[
        {text:'Точно расшифруй русскую речь из этой короткой аудиозаписи. Верни только произнесённый текст, без пояснений, кавычек и комментариев. Если речь неразборчива, верни пустую строку.'},
        {inlineData:{mimeType,data}}
      ]}],
      generationConfig:{temperature:0}
    };
    const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(geminiModel)+':generateContent?key='+encodeURIComponent(geminiKey);
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    const result=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(result?.error?.message||('Gemini HTTP '+r.status));
    const text=(result?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('').trim().replace(/^["«]|["»]$/g,'').trim();
    res.json({text});
  }catch(err){
    console.error('[voice-transcribe]',err);
    res.status(502).json({error:'Не удалось расшифровать голос: '+(err?.message||'unknown')});
  }
});

app.post('/api/chat',async(req,res)=>{
  const message=String(req.body?.message||'').trim();
  const clientContext=req.body?.context||{};
  const context={...clientContext,frontpad:clientContext.frontpad||analyticsSnapshot()};
  if(!message)return res.status(400).json({error:'Пустая команда'});

  if(!hasKey)return res.json({reply:localReply(message,context),mode:'local'});

  const history=(Array.isArray(req.body?.history)?req.body.history:[])
    .slice(-12)
    .filter(m=>['user','assistant'].includes(m?.role)&&typeof m.content==='string')
    .map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,6000)}]}));

  // Web search is intentionally disabled: FARRUKH AI works as a focused conversational assistant.
  const requestedWeb=false;
  const models=[geminiModel,'gemini-3.8-flash','gemini-3.7-flash']
    .filter((x,i,a)=>x&&a.indexOf(x)===i);

  async function callModel(model,useWeb){
    const body={
      systemInstruction:{parts:[{text:buildInstructions(context)+'\n\nРаботай как разговорный рабочий ассистент. Поле context.memory — это долговременная память пользователя: сохранённые факты, решения и рабочие договорённости. Используй её, когда она уместна, но не перечисляй без необходимости. Поле context.tasks — актуальные задачи пользователя. Не используй интернет и не утверждай, что проверил свежие данные. Если вопрос требует актуальной информации извне, прямо скажи, что веб-поиск сейчас отключён.'}]},
      contents:[...history,{role:'user',parts:[{text:message}]}],
      generationConfig:{temperature:0.5}
    };
    const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(geminiKey);
    let last=null;
    for(let attempt=1;attempt<=2;attempt++){
      try{
        const r=await fetch(url,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(body),
          signal:AbortSignal.timeout(30000)
        });
        const data=await r.json().catch(()=>({}));
        if(!r.ok){
          const e=new Error(data?.error?.message||('Gemini HTTP '+r.status));
          e.status=r.status;e.data=data;throw e;
        }
        const candidate=data?.candidates?.[0]||{};
        const reply=(candidate?.content?.parts||[]).map(p=>p?.text||'').join('').trim();
        return {reply:reply||'Ответ без текста.',mode:'online',provider:'gemini',model,sources:[],webSearch:false,webRequested:false,degraded:false};
      }catch(err){
        last=err;
        const retryable=err?.status===429||err?.status>=500||/quota|rate limit|resource_exhausted|timeout|fetch failed/i.test(String(err?.message||''));
        if(!retryable||attempt===2)throw err;
        await new Promise(r=>setTimeout(r,450*attempt));
      }
    }
    throw last||new Error('AI unavailable');
  }

  let lastErr=null;
  for(let i=0;i<models.length;i++){
    const model=models[i];
    try{
      const out=await callModel(model,false);
      return res.json(out);
    }catch(err){
      lastErr=err;
      const msg=String(err?.message||'');
      console.error('[ai-chat]',model,msg);
      const retryable=err?.status===429||/quota|rate limit|resource_exhausted|not available|unsupported|tool/i.test(msg);
      if(!retryable)break;
    }
  }

  // Never leave the UI with a generic dead end when external AI quota is exhausted.
  const fallback=localReply(message,context);
  return res.status(200).json({
    reply:fallback,
    mode:'local-fallback',
    provider:'local',
    model:null,
    sources:[],
    webSearch:false,
    degraded:true,
    notice:'Внешний AI временно недоступен — включён резервный режим.'
  });
});

// ---- Yandex Disk integration ----
const YANDEX_API='https://cloud-api.yandex.net/v1/disk';
const yandexToken=()=>String(process.env.YANDEX_DISK_TOKEN||'').trim();
const yandexHeaders=()=>({Authorization:`OAuth ${yandexToken()}`,'Content-Type':'application/json'});

function normalizeDiskPath(input='/FARRUKH_AI_STORAGE/'){
  let p=String(input||'').trim()||'/FARRUKH_AI_STORAGE/';
  if(!p.startsWith('/'))p='/'+p;
  p=p.replace(/\/{2,}/g,'/');
  if(!p.endsWith('/'))p+='/';
  return p;
}

async function yandexRequest(path, options={}){
  if(!yandexToken())throw new Error('YANDEX_DISK_TOKEN_NOT_CONFIGURED');
  const r=await fetch(`${YANDEX_API}${path}`,{...options,headers:{...yandexHeaders(),...(options.headers||{})}});
  if(r.status===204)return {ok:true,status:204};
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok){const e=new Error(data.message||data.description||`Yandex Disk HTTP ${r.status}`);e.status=r.status;e.data=data;throw e;}
  return data;
}

async function ensureFolder(path){
  const q=encodeURIComponent(path.replace(/\/$/,''));
  try{
    await yandexRequest(`/resources?path=${q}`,{method:'PUT'});
    return true;
  }catch(e){
    if(e.status===409)return true;
    throw e;
  }
}

const FARRUKH_AI_BASE='/FARRUKH_AI_STORAGE/FARRUKH_AI/';
const FARRUKH_AI_STATE_PATH=FARRUKH_AI_BASE+'state.json';
let fallbackAiState={tasks:[],memory:[],chat:[],tts:true,updatedAt:null,storage:'memory'};

async function yandexReadJson(path){
  const meta=await yandexRequest('/resources/download?path='+encodeURIComponent(path),{method:'GET'});
  const r=await fetch(meta.href,{signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error('Ошибка чтения облачного состояния: HTTP '+r.status);
  return await r.json();
}
async function yandexWriteJson(path,data){
  const dir=path.slice(0,path.lastIndexOf('/')+1);
  await ensureFolder('/FARRUKH_AI_STORAGE/');
  await ensureFolder(FARRUKH_AI_BASE);
  if(dir&&dir!==FARRUKH_AI_BASE)await ensureFolder(dir);
  const meta=await yandexRequest('/resources/upload?path='+encodeURIComponent(path)+'&overwrite=true',{method:'GET'});
  const r=await fetch(meta.href,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error('Ошибка сохранения облачного состояния: HTTP '+r.status);
  return true;
}
function sanitizeAiState(input={}){
  const safeTask=t=>({
    text:String(t?.text||'').slice(0,500),
    done:Boolean(t?.done),
    priority:t?.priority==='high'?'high':'normal',
    due:t?.due?String(t.due).slice(0,64):null,
    createdAt:t?.createdAt?String(t.createdAt).slice(0,64):null,
    notifiedAt:t?.notifiedAt?String(t.notifiedAt).slice(0,64):null
  });
  const safeMemory=m=>({text:String(m?.text||'').slice(0,1000),createdAt:m?.createdAt?String(m.createdAt).slice(0,64):null});
  const safeChat=m=>({role:m?.role==='user'?'user':'ai',text:String(m?.text||'').slice(0,6000)});
  return {
    tasks:(Array.isArray(input.tasks)?input.tasks:[]).slice(-300).map(safeTask).filter(x=>x.text),
    memory:(Array.isArray(input.memory)?input.memory:[]).slice(-200).map(safeMemory).filter(x=>x.text),
    chat:(Array.isArray(input.chat)?input.chat:[]).slice(-80).map(safeChat).filter(x=>x.text),
    tts:input.tts!==false,
    updatedAt:String(input.updatedAt||new Date().toISOString()).slice(0,64)
  };
}
async function loadAiState(){
  if(yandexToken()){
    try{
      const data=await yandexReadJson(FARRUKH_AI_STATE_PATH);
      return {...sanitizeAiState(data),storage:'yandex'};
    }catch(err){
      if(err?.status!==404)console.warn('[ai-state] cloud read failed:',err.message);
    }
  }
  return {...sanitizeAiState(fallbackAiState),storage:'memory'};
}
async function saveAiState(input){
  const safe={...sanitizeAiState(input),updatedAt:new Date().toISOString()};
  fallbackAiState={...safe,storage:'memory'};
  if(yandexToken()){
    try{
      await yandexWriteJson(FARRUKH_AI_STATE_PATH,safe);
      return {...safe,storage:'yandex'};
    }catch(err){
      console.warn('[ai-state] cloud write failed:',err.message);
    }
  }
  return {...safe,storage:'memory'};
}

app.get('/api/state',async(req,res)=>{
  try{res.json({ok:true,state:await loadAiState()})}
  catch(err){res.status(500).json({ok:false,error:'Не удалось загрузить состояние',detail:err.message})}
});
app.put('/api/state',async(req,res)=>{
  try{res.json({ok:true,state:await saveAiState(req.body||{})})}
  catch(err){res.status(500).json({ok:false,error:'Не удалось сохранить состояние',detail:err.message})}
});

app.get('/api/yandex/status',async(req,res)=>{
  if(!yandexToken())return res.json({configured:false,connected:false,reason:'token_missing'});
  try{
    const disk=await yandexRequest('/',{method:'GET'});
    res.json({configured:true,connected:true,totalSpace:disk.total_space,usedSpace:disk.used_space,user:disk.user||null});
  }catch(err){
    res.status(502).json({configured:true,connected:false,error:err.message});
  }
});

app.post('/api/yandex/setup',async(req,res)=>{
  const basePath=normalizeDiskPath(req.body?.basePath);
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск ещё не авторизован на сервере.',code:'token_missing'});
  try{
    await ensureFolder(basePath);
    const folders=['Menus','Photos','TechCards','Reports','Backups'];
    for(const folder of folders)await ensureFolder(`${basePath}${folder}/`);
    res.json({ok:true,basePath,folders});
  }catch(err){
    res.status(502).json({ok:false,error:err.message});
  }
});

app.get('/api/yandex/list',async(req,res)=>{
  const basePath=normalizeDiskPath(req.query?.path);
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск ещё не авторизован на сервере.',code:'token_missing'});
  try{
    const q=encodeURIComponent(basePath);
    const data=await yandexRequest(`/resources?path=${q}&limit=100`,{method:'GET'});
    const items=(data?._embedded?.items||[]).map(x=>({name:x.name,type:x.type,path:x.path,size:x.size||0,modified:x.modified||null}));
    res.json({ok:true,path:basePath,items});
  }catch(err){
    res.status(502).json({ok:false,error:err.message});  }
});

app.post('/api/yandex/upload-json',async(req,res)=>{
  const basePath=normalizeDiskPath(req.body?.basePath);
  const folder=String(req.body?.folder||'Backups').replace(/[^a-zA-Z0-9_-]/g,'')||'Backups';
  const fileName=String(req.body?.fileName||`backup-${Date.now()}.json`).replace(/[^a-zA-Z0-9._-]/g,'_');
  const payload=req.body?.data??{};
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск ещё не авторизован на сервере.',code:'token_missing'});
  try{
    await ensureFolder(basePath);
    await ensureFolder(`${basePath}${folder}/`);
    const diskPath=`${basePath}${folder}/${fileName}`;
    const hrefData=await yandexRequest(`/resources/upload?path=${encodeURIComponent(diskPath)}&overwrite=true`,{method:'GET'});
    const upload=await fetch(hrefData.href,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload,null,2)});
    if(!upload.ok)throw new Error(`Ошибка загрузки файла: HTTP ${upload.status}`);
    res.json({ok:true,path:diskPath});
  }catch(err){
    res.status(502).json({ok:false,error:err.message});
  }
});


// ---- SHEF51 Admin + persistent menu ----
const shef51AdminPassword=()=>String(process.env.SHEF51_ADMIN_PASSWORD||'').trim();
const shef51AdminSecret=()=>String(process.env.SHEF51_ADMIN_SECRET||'').trim();
const SHEF51_BASE='/FARRUKH_AI_STORAGE/SHEF51/';
const SHEF51_MENU_PATH=SHEF51_BASE+'menu.json';
const SHEF51_PHOTOS_PATH=SHEF51_BASE+'Photos/';
const SHEF51_DRAFT_PATH=SHEF51_BASE+'site-draft.json';
const SHEF51_PUBLISHED_PATH=SHEF51_BASE+'site-published.json';
const SHEF51_BACKUPS_PATH=SHEF51_BASE+'Backups/';
const SHEF51_BOOKINGS_PATH=SHEF51_BASE+'Bookings/';
const SHEF51_ANALYTICS_PATH=SHEF51_BASE+'Analytics/';
const SHEF51_TELEGRAM_CHAT_PATH=SHEF51_BASE+'telegram-chat.json';

const defaultShef51Config=()=>({
  general:{
    siteName:'SHEF51',
    brandLine:'FARRUKH AKA',
    whatsapp:'+7 966 123-29-92',
    telegram:'',
    footerText:'SHEF51 · FARRUKH AKA'
  },
  navigation:{
    home:'Главная',products:'Товары',services:'Услуги',about:'Обо мне',book:'Забронировать'
  },
  home:{
    eyebrow:'PRIVATE CHEF · JAPANESE & ITALIAN CUISINE',
    title:'Ресторанный вечер у вас дома',
    lead:'Персональный шеф для ужинов, дней рождения, свадеб, вечеринок и особенных событий. Только один заказ в день — всё внимание вашему вечеру.',
    primaryButton:'Выбрать дату',
    secondaryButton:'Смотреть товары',
    heroImage:''
  },
  pages:{
    productsTitle:'Товары',
    productsLead:'Выберите категорию. Актуальное меню и фотографии обновляются владельцем сайта.',
    servicesTitle:'Услуги',
    aboutTitle:'Обо мне',
    bookingTitle:'Забронировать'
  },
  design:{
    background:'#050505',
    surface:'#0b0b0b',
    text:'#ffffff',
    muted:'#9b9b9b',
    accent:'#ef2634',
    border:'#242424',
    radius:24,
    fontScale:100
  },
  sections:{
    products:true,services:true,booking:true
  },
  seo:{
    title:'SHEF51 — Фаррух Ака',
    description:'Персональный шеф японской кухни. Частные ужины, мероприятия и профессиональные услуги.'
  },
  customText:{},
  customImages:{},
  hiddenElements:{}
});

const shef51Descriptions={
  'Филадельфия':'🍣 Нежный лосось, прохладный сливочный сыр и свежий хрустящий огурец — мягкий, сливочный вкус с сочным морским акцентом. Классика, к которой хочется возвращаться. ✨',
  'Филадельфия Премиум':'🔥 Щедрый слой сочного лосося снаружи и ещё больше лосося внутри, нежный сливочный сыр и свежий огурец. Насыщенный, кремовый и по-настоящему премиальный вкус. 🍣',
  'Филадельфия Тигровая':'🦐 Сочная тигровая креветка, нежный сливочный сыр и свежий хрустящий огурец — лёгкое сочетание морского вкуса, кремовой текстуры и свежести. ✨',
  'Филадельфия Тигровая Премиум':'🦐🔥 Тигровая креветка под пикантным сладко-острым соусом, сочный лосось, нежный сливочный сыр и свежий огурец. Яркий, насыщенный ролл с аппетитной остринкой. ✨',
  'Суши лосось':'🍣 Нежный охлаждённый лосось на аккуратной подушке риса — чистый, сочный вкус без лишнего. Простая классика, где главное — качество продукта. ✨',
  'Удон сливочный':'🍜 Упругая лапша удон в нежном сливочном соусе — горячая, кремовая и очень уютная текстура. Мягкий насыщенный вкус, который хочется доесть до последней вилки. 🤍',
  'Удон с креветкой терияки':'🦐🍜 Упругая лапша удон, сочная креветка и насыщенный соус терияки — сладко-солёный вкус, яркий аромат и аппетитная глазировка в каждом кусочке. 🔥',
  'Удон с курицей сливочный':'🍗🤍 Нежная курица, упругая лапша удон и мягкий сливочный соус — горячее, кремовое и очень уютное сочетание с насыщенным вкусом. 🍜',
  'Удон с курицей терияки':'🍗🔥 Сочная курица в ароматном соусе терияки с упругой лапшой удон — насыщенный сладко-солёный вкус и аппетитная карамельная нотка. 🍜',
  'Гейша с креветкой':'🦐✨ Нежная креветка, сливочная текстура и свежие акценты в аккуратном ролле — лёгкий морской вкус, который раскрывается мягко и деликатно. 🍣',
  'Гейша с лососем':'🍣✨ Нежный лосось, мягкая сливочная начинка и свежесть овощей — сбалансированный ролл с сочным морским вкусом и кремовой текстурой. 🤍',
  'Гейша с крабом':'🦀🍣 Нежный краб, сливочная начинка и свежий хрустящий акцент — мягкий, сочный ролл с деликатным вкусом морепродуктов. ✨',
  'Суши с угрем':'🍣🔥 Нежный угорь с аппетитной глазурью на рисе — насыщенный сладковато-копчёный вкус, мягкая текстура и яркий японский акцент. ✨',
  'Суши с креветкой':'🦐🍣 Сочная креветка на аккуратной подушке риса — чистый морской вкус, лёгкая сладость и нежная текстура без лишнего. ✨'
};
const shef51OldDescriptions={
  'Филадельфия':'Нежный лосось, обволакивающий ролл снаружи, сливочный сыр с мягким кремовым вкусом и свежий хрустящий огурец внутри — классическое сочетание, где каждый кусочек получается сочным и сбалансированным.',
  'Филадельфия Премиум':'Щедрый слой нежного лосося снаружи, внутри — ещё больше сочного лосося, мягкий сливочный сыр, свежий хрустящий огурец, рис и нори.',
  'Филадельфия Тигровая':'Нежная тигровая креветка сверху, кремовый сливочный сыр и свежий хрустящий огурец внутри.',
  'Филадельфия Тигровая Премиум':'Тигровая креветка под пикантным сладко-острым соусом, сочный лосось внутри, нежный сливочный сыр и свежий хрустящий огурец.',
  'Суши лосось':'рис, лосось',
  'Удон сливочный':'лапша удон, сливочный соус'
};
const defaultShef51Menu=()=>[
  {id:'philadelphia',category:'rolls',name:'Филадельфия',description:shef51Descriptions['Филадельфия'],portion:'Порция — 8 шт.',visible:true,order:10,imageUrl:''},
  {id:'philadelphia-premium',category:'rolls',name:'Филадельфия Премиум',description:shef51Descriptions['Филадельфия Премиум'],portion:'Порция — 8 шт.',visible:true,order:20,imageUrl:''},
  {id:'philadelphia-tiger',category:'rolls',name:'Филадельфия Тигровая',description:shef51Descriptions['Филадельфия Тигровая'],portion:'Порция — 8 шт.',visible:true,order:30,imageUrl:''},
  {id:'philadelphia-tiger-premium',category:'rolls',name:'Филадельфия Тигровая Премиум',description:shef51Descriptions['Филадельфия Тигровая Премиум'],portion:'Порция — 8 шт.',visible:true,order:40,imageUrl:''},
  {id:'sushi-salmon',category:'sushi',name:'Суши лосось',description:shef51Descriptions['Суши лосось'],portion:'Порция — 8 шт.',visible:true,order:50,imageUrl:''},
  {id:'udon-cream',category:'wok',name:'Удон сливочный',description:shef51Descriptions['Удон сливочный'],portion:'Порция — 8 шт.',visible:true,order:60,imageUrl:''}
];

function shef51Cors(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Cache-Control','no-store');
}

async function yandexDownloadLink(path){
  return yandexRequest('/resources/download?path='+encodeURIComponent(path),{method:'GET'});
}
async function readYandexJson(path){
  try{
    const d=await yandexDownloadLink(path);
    const r=await fetch(d.href,{signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw new Error('Download HTTP '+r.status);
    return await r.json();
  }catch(err){
    if(err?.status===404)return null;
    throw err;
  }
}
async function writeYandexFile(path,body,contentType='application/octet-stream'){
  const dir=path.slice(0,path.lastIndexOf('/')+1);
  await ensureFolder(SHEF51_BASE);
  if(dir&&dir!==SHEF51_BASE)await ensureFolder(dir);
  const hrefData=await yandexRequest('/resources/upload?path='+encodeURIComponent(path)+'&overwrite=true',{method:'GET'});
  const upload=await fetch(hrefData.href,{method:'PUT',headers:{'Content-Type':contentType},body});
  if(!upload.ok)throw new Error('Yandex upload HTTP '+upload.status);
}
const SHEF51_FAST_CACHE_MS=5*60*1000;
let shef51MenuCache={value:null,at:0};
const shef51ConfigCache=new Map();
const shef51ImageCache=new Map();
const SHEF51_IMAGE_CACHE_MAX=6;

function shef51PutImageCache(id,buf,type){
  if(!buf||!buf.length)return;
  if(shef51ImageCache.has(id))shef51ImageCache.delete(id);
  shef51ImageCache.set(id,{buf,type,at:Date.now()});
  while(shef51ImageCache.size>SHEF51_IMAGE_CACHE_MAX){
    const oldest=shef51ImageCache.keys().next().value;
    shef51ImageCache.delete(oldest);
  }
}

async function getShef51Menu(){
  const now=Date.now();
  if(shef51MenuCache.value&&now-shef51MenuCache.at<SHEF51_FAST_CACHE_MS)return shef51MenuCache.value;
  if(!yandexToken())return shef51MenuCache.value||defaultShef51Menu();
  try{
    const stored=await readYandexJson(SHEF51_MENU_PATH);
    if(!Array.isArray(stored?.items))return shef51MenuCache.value||defaultShef51Menu();
    let changed=false;
    const items=stored.items.map(x=>{
      const old=shef51OldDescriptions[x?.name];
      const fresh=shef51Descriptions[x?.name];
      if(fresh && (!x.description || x.description===old)){
        changed=true;
        return {...x,description:fresh};
      }
      return x;
    });
    shef51MenuCache={value:items,at:now};
    if(changed){
      writeYandexFile(SHEF51_MENU_PATH,JSON.stringify({items},null,2),'application/json').catch(err=>console.error('SHEF51 description migration',err));
    }
    return items;
  }catch(err){
    console.error('SHEF51 menu read',err?.message||err);
    return shef51MenuCache.value||defaultShef51Menu();
  }
}
function cleanText(v,max=500){return String(v??'').trim().slice(0,max);}
function cleanItem(x,i){
  const id=(cleanText(x?.id,80)||('item-'+Date.now()+'-'+i)).toLowerCase().replace(/[^a-z0-9_-]/g,'-');
  const category=['rolls','sushi','wok'].includes(x?.category)?x.category:'rolls';
  return {
    id,category,
    name:cleanText(x?.name,120)||'Без названия',
    description:cleanText(x?.description,1200),
    portion:cleanText(x?.portion,120),
    visible:x?.visible!==false,
    order:Number.isFinite(Number(x?.order))?Number(x.order):i*10,
    imageUrl:cleanText(x?.imageUrl,500)
  };
}

function b64url(input){return Buffer.from(input).toString('base64url');}
function signSession(payload){
  const body=b64url(JSON.stringify(payload));
  const sig=crypto.createHmac('sha256',shef51AdminSecret()).update(body).digest('base64url');
  return body+'.'+sig;
}
function verifySession(token){
  try{
    const [body,sig]=String(token||'').split('.');
    if(!body||!sig||!shef51AdminSecret())return null;
    const expected=crypto.createHmac('sha256',shef51AdminSecret()).update(body).digest('base64url');
    if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
    const p=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
    if(!p?.exp||Date.now()>p.exp)return null;
    return p;
  }catch{return null;}
}
function cookieValue(req,name){
  const raw=String(req.headers.cookie||'');
  for(const part of raw.split(';')){
    const [k,...rest]=part.trim().split('=');
    if(k===name)return decodeURIComponent(rest.join('='));
  }
  return '';
}
function requireShef51Admin(req,res,next){
  const auth=String(req.headers.authorization||'');
  const bearer=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  const session=verifySession(cookieValue(req,'shef51_admin'))||verifySession(bearer);
  if(!session)return res.status(401).json({ok:false,error:'Нужен вход владельца'});
  req.shef51Admin=session; next();
}
const loginAttempts=new Map();
function loginAllowed(ip){
  const now=Date.now(), row=loginAttempts.get(ip)||{count:0,reset:now+10*60*1000};
  if(now>row.reset){row.count=0;row.reset=now+10*60*1000;}
  loginAttempts.set(ip,row);
  return row.count<8;
}
function noteBadLogin(ip){
  const row=loginAttempts.get(ip)||{count:0,reset:Date.now()+10*60*1000};
  row.count++;loginAttempts.set(ip,row);
}



const shef51PanelLoginAttempts=new Map();
function shef51PanelLoginAllowed(ip){
  const now=Date.now();
  const row=shef51PanelLoginAttempts.get(ip)||{count:0,reset:now+10*60*1000};
  if(now>row.reset){row.count=0;row.reset=now+10*60*1000;}
  shef51PanelLoginAttempts.set(ip,row);
  return row.count<12;
}
function shef51PanelBadLogin(ip){
  const row=shef51PanelLoginAttempts.get(ip)||{count:0,reset:Date.now()+10*60*1000};
  row.count++;
  shef51PanelLoginAttempts.set(ip,row);
}
app.get('/shef51-panel-login',async(req,res,next)=>{
  try{
    const existing=verifySession(cookieValue(req,'shef51_admin'));
    if(existing)return res.redirect(302,'/shef51-panel');
    let html=await fs.readFile(new URL('./public/shef51-panel-login.html', import.meta.url),'utf8');
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.type('html').send(html);
  }catch(err){next(err);}
});
app.post('/shef51-panel-login',async(req,res,next)=>{
  try{
    const ip=String(req.ip||req.socket?.remoteAddress||'unknown');
    if(!shef51PanelLoginAllowed(ip)){
      let html=await fs.readFile(new URL('./public/shef51-panel-login.html', import.meta.url),'utf8');
      html=html.replace('<!--LOGIN_ERROR-->','<div class="err">Слишком много попыток. Подожди несколько минут и попробуй снова.</div>');
      return res.status(429).type('html').send(html);
    }
    const expected=shef51AdminPassword();
    const got=String(req.body?.password||'').trim();
    const a=Buffer.from(got),b=Buffer.from(expected||'');
    const ok=Boolean(expected)&&a.length===b.length&&crypto.timingSafeEqual(a,b);
    if(!ok){
      shef51PanelBadLogin(ip);
      let html=await fs.readFile(new URL('./public/shef51-panel-login.html', import.meta.url),'utf8');
      html=html.replace('<!--LOGIN_ERROR-->','<div class="err">Неверный пароль.</div>');
      return res.status(401).type('html').send(html);
    }
    shef51PanelLoginAttempts.delete(ip);
    const token=signSession({role:'owner',exp:Date.now()+7*24*60*60*1000});
    res.setHeader('Set-Cookie','shef51_admin='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800');
    res.redirect(303,'/shef51-panel');
  }catch(err){next(err);}
});
function shef51PanelEsc(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function shef51PanelShell(tab,title,body,note=''){
  const tabs=[
    ['dashboard','Главная'],['products','Товары'],['site','Сайт'],
    ['analytics','Статистика'],['requests','Заявки'],['settings','Настройки'],['system','Система']
  ];
  const nav=tabs.map(([id,label])=>'<a class="tab '+(tab===id?'active':'')+'" href="/shef51-panel?tab='+id+'">'+label+'</a>').join('');
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>SHEF51 — '+shef51PanelEsc(title)+'</title><style>'+
  '*{box-sizing:border-box}html,body{margin:0;background:#050505;color:#fff;font-family:Arial,sans-serif}body{padding-bottom:32px}.wrap{width:min(1120px,calc(100% - 28px));margin:auto}.top{padding:18px 0 12px}.brand{font-weight:900;letter-spacing:.12em}.brand b{color:#ff3045}.muted{color:#8f8f8f}.tabs{display:flex;gap:8px;overflow:auto;padding:8px 0 18px;position:sticky;top:0;background:#050505;z-index:5}.tab{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #303030;background:#151515;color:#ddd;text-decoration:none;font-weight:800;white-space:nowrap}.tab.active{background:#ff3045;border-color:#ff3045;color:#fff}.hero{padding:8px 0 8px}.hero h1{font:700 clamp(42px,10vw,72px)/.98 Georgia,serif;margin:4px 0 8px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:#0b0b0b;border:1px solid #242424;border-radius:24px;padding:20px;margin:12px 0;overflow:hidden}.stat small{display:block;color:#8f8f8f;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.stat strong{display:block;font:700 34px Georgia,serif;color:#f1e2cb;margin-top:8px}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid #303030;background:#161616;color:#fff;border-radius:999px;padding:12px 16px;font-weight:800;text-decoration:none}.btn.red{background:#ff3045;border-color:#ff3045}.field{display:grid;gap:7px;margin:12px 0}.field label{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.08em}.field input,.field textarea,.field select{width:100%;background:#070707;border:1px solid #303030;color:#fff;border-radius:14px;padding:13px;font:inherit}.field textarea{min-height:100px;resize:vertical}.check{display:flex;align-items:center;gap:10px;padding:10px 0}.check input{width:20px;height:20px;accent-color:#ff3045}.check label{font-size:14px;color:#ddd}.item{padding:12px 0;border-bottom:1px solid #1f1f1f}.item:last-child{border-bottom:0}.item b{display:block}.meta{font-size:12px;color:#969696;line-height:1.55;margin-top:5px}.tag{display:inline-block;border:1px solid #2a2a2a;border-radius:999px;padding:5px 8px;font-size:11px;color:#cfcfcf;margin:5px 5px 0 0}.ok{color:#64d991}.warn{color:#f0c674}.err{color:#ff8590}.note{padding:12px 14px;border-radius:14px;background:#0e0e0e;border:1px solid #242424;margin:10px 0}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 6px}@media(max-width:800px){.grid{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}}@media(max-width:520px){.grid{grid-template-columns:1fr}.wrap{width:calc(100% - 24px)}.hero h1{font-size:44px}.card{padding:18px;border-radius:22px}.tabs{margin:0 -12px;padding-left:12px;padding-right:12px}}'+
  '</style></head><body><div class="wrap"><div class="top"><div class="brand"><b>SHEF51</b> · ПАНЕЛЬ УПРАВЛЕНИЯ</div><div class="muted">Серверная версия — работает без JavaScript</div></div><nav class="tabs">'+nav+'</nav><section class="hero"><h1>'+shef51PanelEsc(title)+'</h1>'+ (note?'<p class="muted">'+shef51PanelEsc(note)+'</p>':'') +'</section>'+body+'<div class="actions"><a class="btn" href="https://shef51.onrender.com" target="_blank">Открыть сайт</a><a class="btn" href="/shef51-panel-login">Войти заново</a></div></div></body></html>';
}

app.get('/shef51-panel',async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));
    if(!session)return res.redirect(302,'/shef51-panel-login');
    const tab=['dashboard','products','site','analytics','requests','settings','system'].includes(String(req.query?.tab||''))?String(req.query.tab):'dashboard';
    let title='Главная',note='',body='';

    if(tab==='dashboard'){
      title='Главная'; note='Коротко о состоянии SHEF51.';
      let totals={views:0,visitors:0,bookingCta:0,bookings:0};
      try{
        const rows=await shef51AnalyticsEvents(7);
        const vids=new Set();
        for(const r of rows){if(r.event==='page_view')totals.views++;if(r.event==='booking_cta')totals.bookingCta++;if(r.event==='booking_submit_success')totals.bookings++;if(r.meta?.visitorId)vids.add(r.meta.visitorId)}
        totals.visitors=vids.size;
      }catch{}
      body='<div class="grid">'+
        '<div class="card stat"><small>Просмотры · 7 дней</small><strong>'+totals.views+'</strong></div>'+
        '<div class="card stat"><small>Посетители</small><strong>'+totals.visitors+'</strong></div>'+
        '<div class="card stat"><small>Переходы к брони</small><strong>'+totals.bookingCta+'</strong></div>'+
        '<div class="card stat"><small>Заявки</small><strong>'+totals.bookings+'</strong></div>'+
      '</div><div class="card"><h3>Статус</h3><p class="ok">Панель подключена к серверу ✓</p><p class="muted">Эта версия не зависит от JavaScript браузера.</p></div>';
    }

    if(tab==='products'){
      title='Товары'; note='Добавление и редактирование товаров, категорий, фото и видимости.';
      const items=await getShef51Menu();
      const categoryOptions=(selected)=>[
        ['rolls','Роллы'],['sushi','Суши'],['wok','Вок']
      ].map(([value,label])=>'<option value="'+value+'" '+(selected===value?'selected':'')+'>'+label+'</option>').join('');
      body='<div class="card" style="border-color:#3a3a3a"><h3 style="margin-top:0">Добавить новый товар</h3><p class="muted">Заполни данные и выбери категорию. После создания можно сразу загрузить фото.</p>'+
        '<form method="post" action="/shef51-panel/product-create">'+
        '<div class="grid2"><div class="field"><label>Название</label><input name="name" required placeholder="Название товара"></div>'+
        '<div class="field"><label>Категория</label><select name="category" required>'+categoryOptions('rolls')+'</select></div></div>'+
        '<div class="field"><label>Описание</label><textarea name="description" placeholder="Состав или описание"></textarea></div>'+
        '<div class="field"><label>Порция / цена</label><input name="portion" placeholder="Например: 8 шт. · 649 ₽"></div>'+
        '<label><input type="checkbox" name="visible" value="1" checked> Показывать на сайте</label>'+
        '<div style="margin-top:14px"><button class="btn red" type="submit">Добавить товар</button></div></form></div>'+
        (items.length?items.map((x,i)=>'<div class="card">'+
        (x.imageUrl?'<div style="display:flex;justify-content:center;margin-bottom:14px"><img src="'+shef51PanelEsc(x.imageUrl)+'" alt="" style="width:min(260px,100%);height:180px;object-fit:contain;background:#070707;border:1px solid #222;border-radius:18px"></div>':'<div class="note muted">Фото пока не загружено</div>')+
        '<form method="post" action="/shef51-panel/product-save"><input type="hidden" name="id" value="'+shef51PanelEsc(x.id)+'"><input type="hidden" name="order" value="'+shef51PanelEsc(x.order)+'"><input type="hidden" name="imageUrl" value="'+shef51PanelEsc(x.imageUrl||'')+'">'+
        '<div class="grid2"><div class="field"><label>Название</label><input name="name" value="'+shef51PanelEsc(x.name)+'"></div><div class="field"><label>Категория</label><select name="category">'+categoryOptions(x.category)+'</select></div></div>'+
        '<div class="field"><label>Описание</label><textarea name="description">'+shef51PanelEsc(x.description||'')+'</textarea></div>'+
        '<div class="field"><label>Порция / цена</label><input name="portion" value="'+shef51PanelEsc(x.portion||'')+'"></div>'+
        '<label><input type="checkbox" name="visible" value="1" '+(x.visible!==false?'checked':'')+'> Показывать на сайте</label>'+
        '<div style="margin-top:14px"><button class="btn" type="submit">Сохранить товар</button></div></form>'+
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #1f1f1f"><form method="post" action="/shef51-panel/product-photo" enctype="multipart/form-data"><input type="hidden" name="id" value="'+shef51PanelEsc(x.id)+'"><div class="field"><label>Фото товара · JPG / PNG / WEBP · до 8 МБ</label><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required style="width:100%;color:#ddd"></div><button class="btn red" type="submit">Загрузить / заменить фото</button></form></div></div>').join(''):'<div class="card"><p class="muted">Товаров пока нет.</p></div>');
    }

    if(tab==='site'){
      title='Сайт'; note='Основные тексты и контакты.';
      const cfg=await getShef51Config('draft');
      body='<form method="post" action="/shef51-panel/site-save"><div class="card">'+
        '<div class="field"><label>Верхняя подпись</label><input name="eyebrow" value="'+shef51PanelEsc(cfg.home?.eyebrow||'')+'"></div>'+
        '<div class="field"><label>Главный заголовок</label><input name="title" value="'+shef51PanelEsc(cfg.home?.title||'')+'"></div>'+
        '<div class="field"><label>Описание</label><textarea name="lead">'+shef51PanelEsc(cfg.home?.lead||'')+'</textarea></div>'+
        '<div class="grid2"><div class="field"><label>Главная кнопка</label><input name="primaryButton" value="'+shef51PanelEsc(cfg.home?.primaryButton||'')+'"></div><div class="field"><label>Вторая кнопка</label><input name="secondaryButton" value="'+shef51PanelEsc(cfg.home?.secondaryButton||'')+'"></div></div>'+
        '<div class="field"><label>WhatsApp</label><input name="whatsapp" value="'+shef51PanelEsc(cfg.general?.whatsapp||'')+'"></div>'+
        '</div><button class="btn red" type="submit" name="mode" value="publish">Сохранить и опубликовать</button></form>';
    }

    if(tab==='analytics'){
      title='Статистика'; note='Посетители, источники и действия.';
      const rows=await shef51AnalyticsEvents(Math.max(1,Math.min(30,Number(req.query?.days)||7)));
      const visitors=new Map(),sources={};
      let views=0,cta=0,forms=0,bookingsCount=0;
      for(const r of rows){
        if(r.event==='page_view')views++;
        if(r.event==='booking_cta')cta++;
        if(r.event==='form_start')forms++;
        if(r.event==='booking_submit_success')bookingsCount++;
        const vid=String(r.meta?.visitorId||'').trim();
        const source=String(r.meta?.source||'Прямой заход');
        if(vid){
          if(!visitors.has(vid))visitors.set(vid,{last:r.createdAt,source,device:r.meta?.device||'',os:r.meta?.os||'',browser:r.meta?.browser||'',pages:new Set(),actions:0});
          const v=visitors.get(vid); if(Date.parse(r.createdAt)>Date.parse(v.last))v.last=r.createdAt;if(r.event==='page_view'&&r.page)v.pages.add(r.page);if(r.event!=='page_view')v.actions++;
        }
        sources[source]=(sources[source]||0)+(r.event==='page_view'?1:0);
      }
      const visitorRows=[...visitors.values()].sort((a,b)=>Date.parse(b.last)-Date.parse(a.last)).slice(0,80);
      const sourceRows=Object.entries(sources).sort((a,b)=>b[1]-a[1]).slice(0,10);
      body='<div class="row"><a class="btn" href="/shef51-panel?tab=analytics&days=1">Сегодня</a><a class="btn" href="/shef51-panel?tab=analytics&days=7">7 дней</a><a class="btn" href="/shef51-panel?tab=analytics&days=30">30 дней</a></div>'+
        '<div class="grid"><div class="card stat"><small>Просмотры</small><strong>'+views+'</strong></div><div class="card stat"><small>Посетители</small><strong>'+visitors.size+'</strong></div><div class="card stat"><small>К бронированию</small><strong>'+cta+'</strong></div><div class="card stat"><small>Заявки</small><strong>'+bookingsCount+'</strong></div></div>'+
        '<div class="grid2"><div class="card"><h3>Источники</h3>'+ (sourceRows.length?sourceRows.map(([n,v])=>'<div class="item"><b>'+shef51PanelEsc(n)+'</b><span class="meta">'+v+' просмотров</span></div>').join(''):'<p class="muted">Пока нет данных</p>') +'</div>'+
        '<div class="card"><h3>Воронка</h3><div class="item"><b>Просмотры</b><span class="meta">'+views+'</span></div><div class="item"><b>Начали форму</b><span class="meta">'+forms+'</span></div><div class="item"><b>Заявки</b><span class="meta">'+bookingsCount+'</span></div></div></div>'+
        '<div class="card"><h3>Последние посетители</h3>'+ (visitorRows.length?visitorRows.map(v=>'<div class="item"><b>'+shef51PanelEsc(v.source||'Прямой заход')+'</b><div class="meta">'+shef51PanelEsc([v.device,v.os,v.browser].filter(Boolean).join(' · '))+' · '+shef51PanelEsc(new Date(v.last).toLocaleString('ru-RU'))+'</div><div>'+[...v.pages].slice(0,8).map(p=>'<span class="tag">'+shef51PanelEsc(p)+'</span>').join('')+'</div></div>').join(''):'<p class="muted">Пока нет данных</p>') +'</div>';
    }

    if(tab==='requests'){
      title='Заявки'; note='Телефон виден только если гость сам оставил его в форме.';
      const rows=await shef51Bookings(90);
      body='<div class="card"><h3>Последние заявки</h3>'+ (rows.length?rows.slice(0,100).map(b=>'<div class="item"><b>'+shef51PanelEsc(b.name||'Без имени')+' · '+shef51PanelEsc(b.contact||'—')+'</b><div class="meta">'+shef51PanelEsc(b.service||'—')+' · '+shef51PanelEsc(b.date||'—')+' · гостей: '+shef51PanelEsc(b.guests||'—')+'<br>Источник: '+shef51PanelEsc(b.source||'Не определён')+' · '+shef51PanelEsc(new Date(b.createdAt).toLocaleString('ru-RU'))+'</div></div>').join(''):'<p class="muted">Заявок пока нет</p>') +'</div>';
    }

    if(tab==='settings'){
      title='Настройки'; note='Одинаковые настройки на телефоне и компьютере. Меняется только расположение под размер экрана.';
      const cfg=await getShef51Config('draft');
      const checked=v=>v!==false?' checked':'';
      body='<form method="post" action="/shef51-panel/settings-save">'+
        '<div class="grid2">'+
          '<div class="card"><h3>Основные</h3>'+
            '<div class="field"><label>Название сайта</label><input name="siteName" value="'+shef51PanelEsc(cfg.general?.siteName||'')+'"></div>'+
            '<div class="field"><label>Подпись бренда</label><input name="brandLine" value="'+shef51PanelEsc(cfg.general?.brandLine||'')+'"></div>'+
            '<div class="field"><label>WhatsApp</label><input name="whatsapp" inputmode="tel" value="'+shef51PanelEsc(cfg.general?.whatsapp||'')+'"></div>'+
            '<div class="field"><label>Telegram</label><input name="telegram" value="'+shef51PanelEsc(cfg.general?.telegram||'')+'"></div>'+
            '<div class="field"><label>Текст внизу сайта</label><input name="footerText" value="'+shef51PanelEsc(cfg.general?.footerText||'')+'"></div>'+
          '</div>'+
          '<div class="card"><h3>Меню сайта</h3>'+
            '<div class="field"><label>Главная</label><input name="navHome" value="'+shef51PanelEsc(cfg.navigation?.home||'')+'"></div>'+
            '<div class="field"><label>Товары</label><input name="navProducts" value="'+shef51PanelEsc(cfg.navigation?.products||'')+'"></div>'+
            '<div class="field"><label>Услуги</label><input name="navServices" value="'+shef51PanelEsc(cfg.navigation?.services||'')+'"></div>'+
            '<div class="field"><label>Обо мне</label><input name="navAbout" value="'+shef51PanelEsc(cfg.navigation?.about||'')+'"></div>'+
            '<div class="field"><label>Забронировать</label><input name="navBook" value="'+shef51PanelEsc(cfg.navigation?.book||'')+'"></div>'+
          '</div>'+
        '</div>'+
        '<div class="grid2">'+
          '<div class="card"><h3>Разделы</h3>'+
            '<div class="check"><input id="set-products" type="checkbox" name="sectionProducts"'+checked(cfg.sections?.products)+'><label for="set-products">Показывать товары</label></div>'+
            '<div class="check"><input id="set-services" type="checkbox" name="sectionServices"'+checked(cfg.sections?.services)+'><label for="set-services">Показывать услуги</label></div>'+
            '<div class="check"><input id="set-booking" type="checkbox" name="sectionBooking"'+checked(cfg.sections?.booking)+'><label for="set-booking">Показывать бронирование</label></div>'+
          '</div>'+
          '<div class="card"><h3>Поиск и описание</h3>'+
            '<div class="field"><label>Заголовок сайта</label><input name="seoTitle" value="'+shef51PanelEsc(cfg.seo?.title||'')+'"></div>'+
            '<div class="field"><label>Описание сайта</label><textarea name="seoDescription">'+shef51PanelEsc(cfg.seo?.description||'')+'</textarea></div>'+
          '</div>'+
        '</div>'+
        '<div class="actions"><button class="btn" type="submit" name="mode" value="draft">Сохранить</button><button class="btn red" type="submit" name="mode" value="publish">Сохранить и опубликовать</button></div>'+
      '</form>';
    }

    if(tab==='system'){
      title='Система'; note='Проверка основных подключений.';
      let tele='Не подключён';
      try{if(telegramToken()){const me=await telegramRequest('getMe',{});tele='Подключён: @'+(me?.username||'bot')}}catch{tele='Ошибка подключения'}
      body='<div class="card"><h3>API</h3><p class="ok">Сервер работает ✓</p></div><div class="card"><h3>Яндекс Диск</h3><p class="'+(yandexToken()?'ok':'warn')+'">'+(yandexToken()?'Подключён ✓':'Не подключён')+'</p></div><div class="card"><h3>Telegram</h3><p class="'+(tele.startsWith('Подключён')?'ok':'warn')+'">'+shef51PanelEsc(tele)+'</p></div>';
    }

    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
    res.setHeader('Pragma','no-cache');res.setHeader('Expires','0');
    res.type('html').send(shef51PanelShell(tab,title,body,note));
  }catch(err){next(err);}
});
app.post('/shef51-panel/settings-save',async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));if(!session)return res.redirect(302,'/shef51-panel-login');
    if(!yandexToken())return res.status(503).send('Yandex Disk not connected');
    const current=await getShef51Config('draft');
    const cfg=mergeShef51Config({
      ...current,
      general:{
        ...current.general,
        siteName:String(req.body?.siteName||'').trim(),
        brandLine:String(req.body?.brandLine||'').trim(),
        whatsapp:String(req.body?.whatsapp||'').trim(),
        telegram:String(req.body?.telegram||'').trim(),
        footerText:String(req.body?.footerText||'').trim()
      },
      navigation:{
        ...current.navigation,
        home:String(req.body?.navHome||'').trim(),
        products:String(req.body?.navProducts||'').trim(),
        services:String(req.body?.navServices||'').trim(),
        about:String(req.body?.navAbout||'').trim(),
        book:String(req.body?.navBook||'').trim()
      },
      sections:{
        ...current.sections,
        products:Boolean(req.body?.sectionProducts),
        services:Boolean(req.body?.sectionServices),
        booking:Boolean(req.body?.sectionBooking)
      },
      seo:{
        ...current.seo,
        title:String(req.body?.seoTitle||'').trim(),
        description:String(req.body?.seoDescription||'').trim()
      }
    });
    await writeYandexFile(SHEF51_DRAFT_PATH,JSON.stringify(cfg,null,2),'application/json');
    shef51ConfigCache.set('draft',{value:cfg,at:Date.now()});
    if(String(req.body?.mode||'')==='publish'){await writeYandexFile(SHEF51_PUBLISHED_PATH,JSON.stringify(cfg,null,2),'application/json');shef51ConfigCache.set('published',{value:cfg,at:Date.now()});}
    res.redirect(303,'/shef51-panel?tab=settings');
  }catch(err){next(err);}
});

app.post('/shef51-panel/site-save',async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));if(!session)return res.redirect(302,'/shef51-panel-login');
    if(!yandexToken())return res.status(503).send('Yandex Disk not connected');
    const current=await getShef51Config('draft');
    const cfg=mergeShef51Config({...current,
      general:{...current.general,whatsapp:String(req.body?.whatsapp||'').trim()},
      home:{...current.home,eyebrow:String(req.body?.eyebrow||'').trim(),title:String(req.body?.title||'').trim(),lead:String(req.body?.lead||'').trim(),primaryButton:String(req.body?.primaryButton||'').trim(),secondaryButton:String(req.body?.secondaryButton||'').trim()}
    });
    await writeYandexFile(SHEF51_DRAFT_PATH,JSON.stringify(cfg,null,2),'application/json');
    shef51ConfigCache.set('draft',{value:cfg,at:Date.now()});
    if(String(req.body?.mode||'')==='publish'){await writeYandexFile(SHEF51_PUBLISHED_PATH,JSON.stringify(cfg,null,2),'application/json');shef51ConfigCache.set('published',{value:cfg,at:Date.now()});}
    res.redirect(303,'/shef51-panel?tab=site');
  }catch(err){next(err);}
});
app.post('/shef51-panel/product-create',async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));if(!session)return res.redirect(302,'/shef51-panel-login');
    if(!yandexToken())return res.status(503).send('Yandex Disk not connected');
    const stored=await readYandexJson(SHEF51_MENU_PATH);
    const items=Array.isArray(stored?.items)?stored.items:await getShef51Menu();
    const name=cleanText(req.body?.name,120);
    if(!name)return res.status(400).send('Укажи название товара');
    const base=(name.toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,48)||'item');
    let id=base+'-'+Date.now().toString(36);
    id=id.toLowerCase().replace(/[^a-z0-9_-]/g,'-');
    const maxOrder=items.reduce((m,x)=>Math.max(m,Number(x?.order)||0),0);
    const item=cleanItem({
      id,
      category:req.body?.category,
      name,
      description:req.body?.description,
      portion:req.body?.portion,
      visible:Boolean(req.body?.visible),
      order:maxOrder+10,
      imageUrl:''
    },items.length);
    const next=[...items,item].sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    await writeYandexFile(SHEF51_MENU_PATH,JSON.stringify({updatedAt:new Date().toISOString(),items:next},null,2),'application/json');
    res.redirect(303,'/shef51-panel?tab=products#'+encodeURIComponent(item.id));
  }catch(err){next(err);}
});
app.post('/shef51-panel/product-save',async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));if(!session)return res.redirect(302,'/shef51-panel-login');
    if(!yandexToken())return res.status(503).send('Yandex Disk not connected');
    const id=String(req.body?.id||'').trim();
    const stored=await readYandexJson(SHEF51_MENU_PATH);
    const items=Array.isArray(stored?.items)?stored.items:await getShef51Menu();
    const next=items.map((x,i)=>String(x.id)===id?cleanItem({
      ...x,
      name:req.body?.name,
      description:req.body?.description,
      portion:req.body?.portion,
      visible:Boolean(req.body?.visible),
      category:req.body?.category||x.category,
      order:req.body?.order||x.order,
      imageUrl:req.body?.imageUrl||x.imageUrl
    },i):x);
    await writeYandexFile(SHEF51_MENU_PATH,JSON.stringify({updatedAt:new Date().toISOString(),items:next},null,2),'application/json');
    res.redirect(303,'/shef51-panel?tab=products');
  }catch(err){next(err);}
});
app.post('/shef51-panel/product-photo',shef51Upload.single('photo'),async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));if(!session)return res.redirect(302,'/shef51-panel-login');
    if(!yandexToken())return res.status(503).send('Yandex Disk not connected');
    const id=String(req.body?.id||'').trim();
    if(!/^[a-z0-9_-]{1,80}$/i.test(id))return res.status(400).send('Bad product id');
    const file=req.file;
    if(!file)return res.status(400).send('Файл не выбран');
    const allowed=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
    const ext=allowed.get(file.mimetype);
    if(!ext)return res.status(400).send('Поддерживаются JPG, PNG и WEBP');
    const name=id+'-'+Date.now()+'.'+ext;
    await ensureFolder(SHEF51_PHOTOS_PATH);
    await writeYandexFile(SHEF51_PHOTOS_PATH+name,file.buffer,file.mimetype);
    const stored=await readYandexJson(SHEF51_MENU_PATH);
    const items=Array.isArray(stored?.items)?stored.items:await getShef51Menu();
    const next=items.map(x=>String(x.id)===id?{...x,imageUrl:'/api/shef51/image/'+encodeURIComponent(name)}:x);
    await writeYandexFile(SHEF51_MENU_PATH,JSON.stringify({updatedAt:new Date().toISOString(),items:next},null,2),'application/json');
    res.redirect(303,'/shef51-panel?tab=products');
  }catch(err){next(err);}
});
app.post('/shef51-panel/products-save',async(req,res,next)=>{
  try{
    const session=verifySession(cookieValue(req,'shef51_admin'));if(!session)return res.redirect(302,'/shef51-panel-login');
    if(!yandexToken())return res.status(503).send('Yandex Disk not connected');
    const count=Math.max(0,Math.min(200,Number(req.body?.count)||0));
    const raw=[];
    for(let i=0;i<count;i++)raw.push({
      id:req.body?.['id_'+i],category:req.body?.['category_'+i],order:req.body?.['order_'+i],imageUrl:req.body?.['imageUrl_'+i],
      name:req.body?.['name_'+i],description:req.body?.['description_'+i],portion:req.body?.['portion_'+i],
      visible:Boolean(req.body?.['visible_'+i])
    });
    const items=raw.map(cleanItem).sort((a,b)=>a.order-b.order);
    await writeYandexFile(SHEF51_MENU_PATH,JSON.stringify({updatedAt:new Date().toISOString(),items},null,2),'application/json');
    res.redirect(303,'/shef51-panel?tab=products');
  }catch(err){next(err);}
});
app.post('/api/shef51/panel/logout',(req,res)=>{
  res.setHeader('Set-Cookie','shef51_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ok:true});
});

app.get('/shef51-editor',(req,res)=>res.redirect('/shef51-editor.html'));

app.get('/api/shef51/admin/visual-page',requireShef51Admin,async(req,res)=>{
  const allowed=new Set(['index.html','products.html','services.html','about.html','book.html']);
  const page=allowed.has(String(req.query?.page||''))?String(req.query.page):'index.html';
  try{
    const r=await fetch('https://shef51.onrender.com/'+page,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'SHEF51-Editor/1.0'}});
    if(!r.ok)throw new Error('SHEF51 HTTP '+r.status);
    let html=await r.text();
    const inject=`
<style id="shef51-editor-style">
[data-shef-edit]{outline:2px dashed transparent;outline-offset:5px;transition:.15s;cursor:text}
[data-shef-edit]:hover{outline-color:#ff3344;background:#ff33440b}
[data-shef-photo]{outline:2px dashed transparent;outline-offset:6px;cursor:pointer}
[data-shef-photo]:hover{outline-color:#ff3344}
.shef-editor-selected{outline:2px solid #ff3344!important;box-shadow:0 0 0 4px #ff334422!important}
</style>
<script>
(function(){
 const map=[];
 const tag=(sel,key,all=false)=>{
   const els=all?[...document.querySelectorAll(sel)]:[document.querySelector(sel)].filter(Boolean);
   els.forEach((el,i)=>{el.dataset.shefEdit=all?(key+'.'+i):key;el.contentEditable='true';el.spellcheck=false;});
 };
 const photo=(sel,key)=>{const el=document.querySelector(sel);if(el){el.dataset.shefPhoto=key;}};
 const path=${JSON.stringify(page)};
 if(path==='index.html'||path===''){
   tag('.hero .eyebrow','home.eyebrow');tag('.hero h1','home.title');tag('.hero .lead','home.lead');
   const acts=document.querySelectorAll('.hero .actions .btn');if(acts[0]){acts[0].dataset.shefEdit='home.primaryButton';acts[0].contentEditable='true'};if(acts[1]){acts[1].dataset.shefEdit='home.secondaryButton';acts[1].contentEditable='true'};
   photo('.heroArt img','home.heroImage');
 }
 if(path==='products.html'){tag('.pageHead h1','pages.productsTitle');tag('.pageHead .lead','pages.productsLead');}
 if(path==='services.html')tag('h1','pages.servicesTitle');
 if(path==='about.html')tag('h1','pages.aboutTitle');
 if(path==='book.html')tag('h1','pages.bookingTitle');
 document.querySelectorAll('.links a').forEach(a=>{const href=a.getAttribute('href');const m={'index.html':'navigation.home','products.html':'navigation.products','services.html':'navigation.services','about.html':'navigation.about','book.html':'navigation.book'};if(m[href]){a.dataset.shefEdit=m[href];a.contentEditable='true'}});
 document.addEventListener('click',e=>{
   const a=e.target.closest('a[href]');if(a&&!a.hasAttribute('data-shef-edit')){const href=a.getAttribute('href');if(/^(index|products|services|about|book)\.html$/.test(href)){e.preventDefault();parent.postMessage({type:'shef-nav',page:href},'*');return}}
   const el=e.target.closest('[data-shef-edit],[data-shef-photo],[data-shef-generic],[data-shef-generic-photo]');
   document.querySelectorAll('.shef-editor-selected').forEach(x=>x.classList.remove('shef-editor-selected'));
   if(el){el.classList.add('shef-editor-selected');parent.postMessage({type:'shef-select',edit:el.dataset.shefEdit||null,photo:el.dataset.shefPhoto||null,generic:el.dataset.shefGeneric||null,genericPhoto:el.dataset.shefGenericPhoto||null,text:el.innerText||'',tag:el.tagName},'*')}
 },true);
 document.addEventListener('input',e=>{
   const el=e.target.closest('[data-shef-edit],[data-shef-generic]');if(el)parent.postMessage({type:'shef-change',key:el.dataset.shefEdit||null,generic:el.dataset.shefGeneric||null,value:el.innerText},'*')
 });
 document.addEventListener('keydown',e=>{if(e.target.closest('[data-shef-edit]')&&e.key==='Enter'){e.preventDefault();e.target.blur()}});
})();
<\/script>`;
    html=html.replace(/<script[^>]+src=["']cms\.js[^>]*><\/script>/ig,'');
    html=html.replace('</body>',inject+'</body>');
    res.setHeader('Cache-Control','no-store');
    res.type('html').send(html);
  }catch(err){
    console.error('visual editor page error',err);
    res.status(502).type('html').send('<h1 style="font-family:sans-serif">Не удалось загрузить страницу сайта</h1>');
  }
});
app.get('/shef51-admin',(req,res)=>res.redirect('/shef51-admin.html'));
app.get('/shef51-owner',async(req,res,next)=>{
  try{
    const existing=verifySession(cookieValue(req,'shef51_admin'));
    if(!existing){
      const auth=String(req.headers.authorization||'');
      let user='',pass='';
      if(auth.startsWith('Basic ')){
        try{
          const raw=Buffer.from(auth.slice(6),'base64').toString('utf8');
          const i=raw.indexOf(':');
          user=i>=0?raw.slice(0,i):raw;
          pass=i>=0?raw.slice(i+1):'';
        }catch{}
      }
      const expected=shef51AdminPassword();
      const userOk=user==='owner';
      const a=Buffer.from(pass),b=Buffer.from(expected||'');
      const passOk=Boolean(expected)&&a.length===b.length&&crypto.timingSafeEqual(a,b);
      if(!userOk||!passOk){
        res.setHeader('WWW-Authenticate','Basic realm="SHEF51 Owner", charset="UTF-8"');
        res.setHeader('Cache-Control','no-store');
        return res.status(401).type('text').send('SHEF51 OWNER');
      }
      const token=signSession({role:'owner',exp:Date.now()+7*24*60*60*1000});
      res.setHeader('Set-Cookie','shef51_admin='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800');
    }
    const html=await fs.readFile(new URL('./public/shef51-admin.html', import.meta.url),'utf8');
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.type('html').send(html);
  }catch(err){next(err);}
});


app.post('/api/shef51/admin/login',(req,res)=>{
  const ip=String(req.ip||req.socket?.remoteAddress||'unknown');
  if(!loginAllowed(ip))return res.status(429).json({ok:false,error:'Слишком много попыток. Попробуйте позже.'});
  const expected=shef51AdminPassword(), got=String(req.body?.password||'');
  if(!expected||!shef51AdminSecret())return res.status(503).json({ok:false,error:'Админка ещё не настроена на сервере.'});
  const a=Buffer.from(got), b=Buffer.from(expected);
  const ok=a.length===b.length&&crypto.timingSafeEqual(a,b);
  if(!ok){noteBadLogin(ip);return res.status(401).json({ok:false,error:'Неверный пароль'});}
  loginAttempts.delete(ip);
  const token=signSession({role:'owner',exp:Date.now()+7*24*60*60*1000});
  res.setHeader('Set-Cookie','shef51_admin='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800');
  res.json({ok:true,token});
});
app.post('/shef51-admin-login',(req,res)=>{
  const ip=String(req.ip||req.socket?.remoteAddress||'unknown');
  if(!loginAllowed(ip))return res.status(429).type('html').send('<meta charset="utf-8"><body style="background:#050505;color:#fff;font-family:Arial;padding:30px">Слишком много попыток. Попробуйте позже.<br><br><a style="color:#ff3344" href="/shef51-admin">Назад</a></body>');
  const expected=shef51AdminPassword(), got=String(req.body?.password||'');
  if(!expected||!shef51AdminSecret())return res.status(503).type('html').send('<meta charset="utf-8"><body style="background:#050505;color:#fff;font-family:Arial;padding:30px">Админка ещё не настроена на сервере.<br><br><a style="color:#ff3344" href="/shef51-admin">Назад</a></body>');
  const a=Buffer.from(got), b=Buffer.from(expected);
  const ok=a.length===b.length&&crypto.timingSafeEqual(a,b);
  if(!ok){
    noteBadLogin(ip);
    return res.status(401).type('html').send('<meta charset="utf-8"><body style="background:#050505;color:#fff;font-family:Arial;padding:30px">Неверный пароль.<br><br><a style="color:#ff3344" href="/shef51-admin">Вернуться</a></body>');
  }
  loginAttempts.delete(ip);
  const token=signSession({role:'owner',exp:Date.now()+7*24*60*60*1000});
  res.setHeader('Set-Cookie','shef51_admin='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800');
  res.redirect(303,'/shef51-admin.html?login=ok&v=3');
});

app.post('/api/shef51/admin/logout',(req,res)=>{
  res.setHeader('Set-Cookie','shef51_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ok:true});
});
app.get('/api/shef51/admin/session',(req,res)=>{
  const auth=String(req.headers.authorization||'');
  const bearer=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  res.json({ok:Boolean(verifySession(cookieValue(req,'shef51_admin'))||verifySession(bearer))});
});

async function getShef51Config(kind='draft'){
  const path=kind==='published'?SHEF51_PUBLISHED_PATH:SHEF51_DRAFT_PATH;
  const cached=shef51ConfigCache.get(kind);
  const now=Date.now();
  if(cached?.value&&now-cached.at<SHEF51_FAST_CACHE_MS)return cached.value;
  if(!yandexToken())return cached?.value||defaultShef51Config();
  try{
    const stored=await readYandexJson(path);
    const value=stored&&typeof stored==='object'?stored:(cached?.value||defaultShef51Config());
    shef51ConfigCache.set(kind,{value,at:now});
    return value;
  }catch(err){
    console.error('SHEF51 config read',kind,err?.message||err);
    return cached?.value||defaultShef51Config();
  }
}
function mergeShef51Config(raw={}){
  const d=defaultShef51Config();
  const safe=(obj,key,max=300)=>cleanText(obj?.[key],max)||d?.[key];
  const cfg={
    general:{...d.general,...(raw.general||{})},
    navigation:{...d.navigation,...(raw.navigation||{})},
    home:{...d.home,...(raw.home||{})},
    pages:{...d.pages,...(raw.pages||{})},
    design:{...d.design,...(raw.design||{})},
    sections:{...d.sections,...(raw.sections||{})},
    seo:{...d.seo,...(raw.seo||{})},
    customText:{...(raw.customText||{})},
    customImages:{...(raw.customImages||{})},
    hiddenElements:{...(raw.hiddenElements||{})}
  };
  for(const k of Object.keys(cfg.general))cfg.general[k]=cleanText(cfg.general[k],300);
  for(const k of Object.keys(cfg.navigation))cfg.navigation[k]=cleanText(cfg.navigation[k],80);
  for(const k of Object.keys(cfg.home))cfg.home[k]=cleanText(cfg.home[k],1200);
  for(const k of Object.keys(cfg.pages))cfg.pages[k]=cleanText(cfg.pages[k],700);
  cfg.design.background=/^#[0-9a-f]{6}$/i.test(cfg.design.background)?cfg.design.background:d.design.background;
  cfg.design.surface=/^#[0-9a-f]{6}$/i.test(cfg.design.surface)?cfg.design.surface:d.design.surface;
  cfg.design.text=/^#[0-9a-f]{6}$/i.test(cfg.design.text)?cfg.design.text:d.design.text;
  cfg.design.muted=/^#[0-9a-f]{6}$/i.test(cfg.design.muted)?cfg.design.muted:d.design.muted;
  cfg.design.accent=/^#[0-9a-f]{6}$/i.test(cfg.design.accent)?cfg.design.accent:d.design.accent;
  cfg.design.border=/^#[0-9a-f]{6}$/i.test(cfg.design.border)?cfg.design.border:d.design.border;
  cfg.design.radius=Math.max(0,Math.min(60,Number(cfg.design.radius)||d.design.radius));
  cfg.design.fontScale=Math.max(80,Math.min(130,Number(cfg.design.fontScale)||d.design.fontScale));
  for(const k of Object.keys(cfg.sections))cfg.sections[k]=cfg.sections[k]!==false;
  cfg.seo.title=cleanText(cfg.seo.title,180);
  cfg.seo.description=cleanText(cfg.seo.description,320);
  cfg.customText=Object.fromEntries(Object.entries(cfg.customText||{}).slice(0,1000).map(([k,v])=>[cleanText(k,180),cleanText(v,5000)]));
  cfg.customImages=Object.fromEntries(Object.entries(cfg.customImages||{}).slice(0,500).map(([k,v])=>[cleanText(k,180),cleanText(v,600)]));
  cfg.hiddenElements=Object.fromEntries(Object.entries(cfg.hiddenElements||{}).slice(0,1000).map(([k,v])=>[cleanText(k,180),Boolean(v)]));
  return cfg;
}


function shef51MoscowStart(days=7){
  const DAY=86400000,H=3600000;
  const now=Date.now();
  const shifted=new Date(now+3*H);
  const todayStart=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate())-3*H;
  return todayStart-(Math.max(1,days)-1)*DAY;
}
function shef51MoscowDay(ts){
  return new Date(Number(ts)+3*3600000).toISOString().slice(0,10);
}
const shef51AnalyticsCache=new Map();
const shef51BookingsCache=new Map();
async function shef51AnalyticsEvents(days=30){
  const key=String(days);
  const cached=shef51AnalyticsCache.get(key);
  if(cached&&Date.now()-cached.at<60000)return cached.rows;
  if(!yandexToken())return cached?.rows||[];
  const DAY=86400000;
  const start=shef51MoscowStart(days);
  const folderStart=Math.floor((start-DAY)/DAY)*DAY;
  const folderEnd=Math.floor(Date.now()/DAY)*DAY;
  const files=[];
  for(let t=folderStart;t<=folderEnd;t+=DAY){
    const day=new Date(t).toISOString().slice(0,10);
    const path=SHEF51_ANALYTICS_PATH+day+'/';
    try{
      const q=encodeURIComponent(path);
      const d=await yandexRequest('/resources?path='+q+'&limit=1000&sort=name',{method:'GET'});
      for(const x of (d?._embedded?.items||[])){
        if(x.type==='file'&&/\.json$/i.test(x.name))files.push(path+x.name);
      }
    }catch(err){
      if(err?.status!==404)console.error('SHEF51 analytics list',day,err?.message||err);
    }
  }
  const rows=[];
  for(let i=0;i<files.length;i+=12){
    const batch=files.slice(i,i+12);
    const got=await Promise.all(batch.map(p=>readYandexJson(p).catch(()=>null)));
    for(const row of got){
      const ts=Date.parse(row?.createdAt||'');
      if(row&&Number.isFinite(ts)&&ts>=start&&ts<=Date.now()+60000)rows.push(row);
    }
  }
  shef51AnalyticsCache.set(key,{rows,at:Date.now()});
  return rows;
}
app.get('/api/shef51/admin/analytics-summary',requireShef51Admin,async(req,res)=>{
  const days=Math.max(1,Math.min(30,Number(req.query?.days)||7));
  try{
    const rows=await shef51AnalyticsEvents(days);
    const byEvent={},byPage={},services={},products={},daily={};
    const visitors=new Set(),sessions=new Set();
    for(const r of rows){
      const ev=String(r.event||'unknown');
      byEvent[ev]=(byEvent[ev]||0)+1;
      const day=shef51MoscowDay(Date.parse(r.createdAt));
      daily[day]??={views:0,bookings:0,cta:0};
      if(ev==='page_view'){
        daily[day].views++;
        const p=String(r.page||'index.html');
        byPage[p]=(byPage[p]||0)+1;
      }
      if(ev==='booking_submit_success')daily[day].bookings++;
      if(ev==='booking_cta')daily[day].cta++;
      const vid=String(r.meta?.visitorId||'').trim();
      const sid=String(r.meta?.sessionId||'').trim();
      if(vid)visitors.add(vid);
      if(sid)sessions.add(sid);
      if(ev==='service_details'){
        const label=String(r.label||'').trim();
        if(label)services[label]=(services[label]||0)+1;
      }
      if(ev==='product_details'){
        const label=String(r.label||'').trim();
        if(label)products[label]=(products[label]||0)+1;
      }
    }
    const views=byEvent.page_view||0;
    const bookingCta=byEvent.booking_cta||0;
    const formStarts=byEvent.form_start||0;
    const bookings=byEvent.booking_submit_success||0;
    const sortObj=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}));
    const daysOut=Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,v])=>({date,...v}));
    res.json({
      ok:true,days,generatedAt:new Date().toISOString(),
      totals:{
        views,
        visitors:visitors.size||null,
        sessions:sessions.size||null,
        bookingCta,formStarts,bookings,
        conversion:views?Number((bookings/views*100).toFixed(1)):0
      },
      events:byEvent,
      pages:sortObj(byPage),
      services:sortObj(services),
      products:sortObj(products),
      daily:daysOut
    });
  }catch(err){
    console.error('SHEF51 analytics summary error',err);
    res.status(502).json({ok:false,error:'Не удалось загрузить статистику: '+(err?.message||'unknown')});
  }
});


async function shef51Bookings(days=30){
  const key=String(days);
  const cached=shef51BookingsCache.get(key);
  if(cached&&Date.now()-cached.at<60000)return cached.rows;
  if(!yandexToken())return cached?.rows||[];
  const start=shef51MoscowStart(days);
  const rows=[];
  try{
    await ensureFolder(SHEF51_BOOKINGS_PATH);
    const q=encodeURIComponent(SHEF51_BOOKINGS_PATH);
    const d=await yandexRequest('/resources?path='+q+'&limit=1000&sort=-modified',{method:'GET'});
    const files=(d?._embedded?.items||[]).filter(x=>x.type==='file'&&/\.json$/i.test(x.name)).slice(0,1000);
    for(let i=0;i<files.length;i+=12){
      const got=await Promise.all(files.slice(i,i+12).map(x=>readYandexJson(SHEF51_BOOKINGS_PATH+x.name).catch(()=>null)));
      for(const row of got){
        const ts=Date.parse(row?.createdAt||'');
        if(row&&Number.isFinite(ts)&&ts>=start)rows.push(row);
      }
    }
  }catch(err){
    console.error('SHEF51 bookings list error',err?.message||err);
  }
  const out=rows.sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
  shef51BookingsCache.set(key,{rows:out,at:Date.now()});
  return out;
}

app.get('/api/shef51/admin/visitors',requireShef51Admin,async(req,res)=>{
  const days=Math.max(1,Math.min(30,Number(req.query?.days)||7));
  try{
    const events=await shef51AnalyticsEvents(days);
    const map=new Map();
    for(const r of events){
      const vid=String(r.meta?.visitorId||'').trim();
      if(!vid)continue;
      let v=map.get(vid);
      if(!v){
        v={visitorId:vid,firstSeen:r.createdAt,lastSeen:r.createdAt,source:r.meta?.source||'Прямой заход',referrerHost:r.meta?.referrerHost||'',landingPage:r.meta?.landingPage||'',device:r.meta?.device||'',browser:r.meta?.browser||'',os:r.meta?.os||'',pages:[],actions:0};
        map.set(vid,v);
      }
      if(Date.parse(r.createdAt)<Date.parse(v.firstSeen))v.firstSeen=r.createdAt;
      if(Date.parse(r.createdAt)>Date.parse(v.lastSeen))v.lastSeen=r.createdAt;
      if(r.event==='page_view'&&r.page&&!v.pages.includes(r.page))v.pages.push(r.page);
      if(['booking_cta','form_start','service_details','product_details','whatsapp_click','booking_submit_success'].includes(r.event))v.actions++;
    }
    const visitors=[...map.values()].sort((a,b)=>Date.parse(b.lastSeen)-Date.parse(a.lastSeen)).slice(0,300);
    res.json({ok:true,days,visitors});
  }catch(err){
    res.status(502).json({ok:false,error:'Не удалось загрузить посетителей: '+(err?.message||'unknown')});
  }
});

app.get('/api/shef51/admin/bookings',requireShef51Admin,async(req,res)=>{
  const days=Math.max(1,Math.min(90,Number(req.query?.days)||30));
  try{
    const bookings=await shef51Bookings(days);
    res.json({ok:true,days,bookings:bookings.slice(0,300)});
  }catch(err){
    res.status(502).json({ok:false,error:'Не удалось загрузить заявки: '+(err?.message||'unknown')});
  }
});

app.get('/api/shef51/admin/site-config',requireShef51Admin,async(req,res)=>{
  res.json({ok:true,config:await getShef51Config('draft')});
});
app.put('/api/shef51/admin/site-config',requireShef51Admin,async(req,res)=>{
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск не подключён.'});
  try{
    const config=mergeShef51Config(req.body?.config||{});
    await writeYandexFile(SHEF51_DRAFT_PATH,JSON.stringify(config,null,2),'application/json');
    shef51ConfigCache.set('draft',{value:config,at:Date.now()});
    res.json({ok:true,config});
  }catch(err){console.error(err);res.status(502).json({ok:false,error:'Не удалось сохранить черновик: '+err.message});}
});
app.post('/api/shef51/admin/publish',requireShef51Admin,async(req,res)=>{
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск не подключён.'});
  try{
    const config=mergeShef51Config(await getShef51Config('draft'));
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    await ensureFolder(SHEF51_BACKUPS_PATH);
    const current=await readYandexJson(SHEF51_PUBLISHED_PATH);
    if(current)await writeYandexFile(SHEF51_BACKUPS_PATH+'site-'+stamp+'.json',JSON.stringify(current,null,2),'application/json');
    await writeYandexFile(SHEF51_PUBLISHED_PATH,JSON.stringify(config,null,2),'application/json');
    shef51ConfigCache.set('published',{value:config,at:Date.now()});
    res.json({ok:true,publishedAt:new Date().toISOString(),config});
  }catch(err){console.error(err);res.status(502).json({ok:false,error:'Не удалось опубликовать: '+err.message});}
});
app.get('/api/shef51/admin/history',requireShef51Admin,async(req,res)=>{
  try{
    await ensureFolder(SHEF51_BACKUPS_PATH);
    const q=encodeURIComponent(SHEF51_BACKUPS_PATH);
    const data=await yandexRequest('/resources?path='+q+'&limit=50&sort=-modified',{method:'GET'});
    const items=(data?._embedded?.items||[]).filter(x=>x.type==='file'&&/^site-.*\.json$/i.test(x.name)).map(x=>({name:x.name,modified:x.modified||null,size:x.size||0}));
    res.json({ok:true,items});
  }catch(err){res.status(502).json({ok:false,error:err.message});}
});
app.post('/api/shef51/admin/restore',requireShef51Admin,async(req,res)=>{
  const name=String(req.body?.name||'');
  if(!/^site-[a-z0-9T-]+\.json$/i.test(name))return res.status(400).json({ok:false,error:'Неверная версия'});
  try{
    const cfg=await readYandexJson(SHEF51_BACKUPS_PATH+name);
    if(!cfg)return res.status(404).json({ok:false,error:'Версия не найдена'});
    const config=mergeShef51Config(cfg);
    await writeYandexFile(SHEF51_DRAFT_PATH,JSON.stringify(config,null,2),'application/json');
    res.json({ok:true,config});
  }catch(err){res.status(502).json({ok:false,error:err.message});}
});
app.options('/api/shef51/site-config',(req,res)=>{shef51Cors(req,res);res.sendStatus(204);});
app.get('/api/shef51/site-config',async(req,res)=>{
  shef51Cors(req,res);
  res.setHeader('Cache-Control','public, max-age=30, stale-while-revalidate=300');
  res.json({ok:true,config:await getShef51Config('published')});
});

app.get('/api/shef51/admin/menu',requireShef51Admin,async(req,res)=>{
  res.json({ok:true,items:await getShef51Menu(),storage:yandexToken()?'yandex':'fallback'});
});
app.put('/api/shef51/admin/menu',requireShef51Admin,async(req,res)=>{
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск не подключён — постоянное сохранение недоступно.'});
  const raw=Array.isArray(req.body?.items)?req.body.items:[];
  const items=raw.slice(0,200).map(cleanItem).sort((a,b)=>a.order-b.order);
  try{
    await writeYandexFile(SHEF51_MENU_PATH,JSON.stringify({updatedAt:new Date().toISOString(),items},null,2),'application/json');
    shef51MenuCache={value:items,at:Date.now()};
    res.json({ok:true,items});
  }catch(err){console.error(err);res.status(502).json({ok:false,error:'Не удалось сохранить меню: '+err.message});}
});
app.post('/api/shef51/admin/upload',requireShef51Admin,async(req,res)=>{
  if(!yandexToken())return res.status(503).json({ok:false,error:'Яндекс Диск не подключён.'});
  const data=String(req.body?.data||'');
  const name=cleanText(req.body?.name,80).toLowerCase().replace(/[^a-z0-9_-]/g,'-')||'photo';
  const m=data.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if(!m)return res.status(400).json({ok:false,error:'Поддерживаются JPG, PNG и WEBP.'});
  const subtype=m[1]==='jpg'?'jpeg':m[1];
  const ext=subtype==='jpeg'?'jpg':subtype;
  const buf=Buffer.from(m[2].replace(/\s+/g,''),'base64');
  if(!buf.length||buf.length>8*1024*1024)return res.status(400).json({ok:false,error:'Фото должно быть до 8 МБ.'});
  const id=name+'-'+Date.now()+'.'+ext;
  try{
    await writeYandexFile(SHEF51_PHOTOS_PATH+id,buf,'image/'+subtype);
    shef51PutImageCache(id,buf,'image/'+subtype);
    res.json({ok:true,imageId:id,imageUrl:'/api/shef51/image/'+encodeURIComponent(id)});
  }catch(err){console.error(err);res.status(502).json({ok:false,error:'Не удалось загрузить фото: '+err.message});}
});

app.options('/api/shef51/menu',(req,res)=>{shef51Cors(req,res);res.sendStatus(204);});
app.get('/api/shef51/menu',async(req,res)=>{
  shef51Cors(req,res);
  res.setHeader('Cache-Control','public, max-age=60, stale-while-revalidate=600');
  const items=(await getShef51Menu()).filter(x=>x.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  res.json({ok:true,items});
});
app.get('/api/shef51/image/:id',async(req,res)=>{
  const id=String(req.params.id||'');
  if(!/^[a-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(id))return res.sendStatus(400);
  const cached=shef51ImageCache.get(id);
  if(cached?.buf){
    res.setHeader('Content-Type',cached.type||'application/octet-stream');
    res.setHeader('Content-Length',cached.buf.length);
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options','nosniff');
    return res.send(cached.buf);
  }
  try{
    let lastErr=null;
    for(let attempt=0;attempt<2;attempt++){
      try{
        const d=await yandexDownloadLink(SHEF51_PHOTOS_PATH+id);
        const r=await fetch(d.href,{signal:AbortSignal.timeout(12000),redirect:'follow'});
        if(!r.ok)throw new Error('Image download HTTP '+r.status);
        const type=r.headers.get('content-type')||(
          /\.png$/i.test(id)?'image/png':
          /\.webp$/i.test(id)?'image/webp':'image/jpeg'
        );
        const buf=Buffer.from(await r.arrayBuffer());
        shef51PutImageCache(id,buf,type);
        res.setHeader('Content-Type',type);
        res.setHeader('Content-Length',buf.length);
        res.setHeader('Cache-Control','public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options','nosniff');
        return res.send(buf);
      }catch(err){
        lastErr=err;
        if(attempt===0)await new Promise(r=>setTimeout(r,250));
      }
    }
    throw lastErr||new Error('Image unavailable');
  }catch(err){
    console.error('SHEF51 image proxy error',id,err?.message||err);
    if(!res.headersSent)res.sendStatus(404);
  }
});

// ---- SHEF51 lightweight first-party analytics ----
function analyticsCors(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
}
app.options('/api/shef51/analytics',(req,res)=>{analyticsCors(req,res);res.sendStatus(204);});
app.post('/api/shef51/analytics',async(req,res)=>{
  analyticsCors(req,res);
  const event=cleanText(req.body?.event,80).replace(/[^a-z0-9_.-]/gi,'_')||'unknown';
  const page=cleanText(req.body?.page,180);
  const label=cleanText(req.body?.label,180);
  const href=cleanText(req.body?.href,300);
  const meta=(req.body?.meta&&typeof req.body.meta==='object')?req.body.meta:{};
  const safeMeta={};
  for(const [k,v] of Object.entries(meta).slice(0,20)){
    safeMeta[cleanText(k,40)]=cleanText(v,160);
  }
  const now=new Date();
  const day=now.toISOString().slice(0,10);
  const item={
    id:'event-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'),
    createdAt:now.toISOString(),
    event,page,label,href,meta:safeMeta
  };
  if(yandexToken()){
    try{
      await ensureFolder(SHEF51_ANALYTICS_PATH);
      await ensureFolder(SHEF51_ANALYTICS_PATH+day+'/');
      await writeYandexFile(
        SHEF51_ANALYTICS_PATH+day+'/'+item.id+'.json',
        JSON.stringify(item,null,2),
        'application/json'
      );
      shef51AnalyticsCache.clear();
    }catch(err){
      console.error('SHEF51 analytics save error',err?.message||err);
    }
  }
  res.json({ok:true});
});

// ---- SHEF51 Telegram booking ----
const telegramToken=()=>String(process.env.TELEGRAM_BOT_TOKEN||'').trim();

async function telegramRequest(method,payload={}){
  const token=telegramToken();
  if(!token)throw new Error('TELEGRAM_BOT_TOKEN_NOT_CONFIGURED');
  const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(12000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.ok)throw new Error(data?.description||`Telegram HTTP ${r.status}`);
  return data.result;
}

async function telegramChatId(){
  const envId=String(process.env.TELEGRAM_CHAT_ID||'').trim();
  if(envId)return envId;

  if(yandexToken()){
    try{
      const saved=await readYandexJson(SHEF51_TELEGRAM_CHAT_PATH);
      const savedId=String(saved?.chatId||'').trim();
      if(savedId)return savedId;
    }catch{}
  }

  const updates=await telegramRequest('getUpdates',{limit:100,timeout:0});
  const chats=(Array.isArray(updates)?updates:[])
    .map(u=>u?.message?.chat||u?.edited_message?.chat||u?.callback_query?.message?.chat)
    .filter(c=>c&&c.type==='private'&&c.id);
  const id=chats.length?String(chats[chats.length-1].id):'';

  if(id&&yandexToken()){
    writeYandexFile(
      SHEF51_TELEGRAM_CHAT_PATH,
      JSON.stringify({chatId:id,savedAt:new Date().toISOString()},null,2),
      'application/json'
    ).catch(err=>console.error('SHEF51 telegram chat save error',err?.message||err));
  }
  return id;
}

function bookingCors(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
}

app.options('/api/telegram/booking',(req,res)=>{
  bookingCors(req,res);
  res.sendStatus(204);
});

app.get('/api/telegram/status',async(req,res)=>{
  try{
    if(!telegramToken())return res.json({configured:false,connected:false,chatReady:false});
    const me=await telegramRequest('getMe',{});
    const chatId=await telegramChatId();
    res.json({configured:true,connected:true,chatReady:Boolean(chatId),botUsername:me?.username||null});
  }catch(err){
    res.status(502).json({configured:Boolean(telegramToken()),connected:false,chatReady:false,error:err.message});
  }
});

app.post('/api/telegram/booking',async(req,res)=>{
  bookingCors(req,res);
  const service=String(req.body?.service||'').trim().slice(0,120);
  const date=String(req.body?.date||'').trim().slice(0,40);
  const guests=String(req.body?.guests||'').trim().slice(0,20);
  const name=String(req.body?.name||'').trim().slice(0,120);
  const contact=String(req.body?.contact||'').trim().slice(0,120);
  const budget=String(req.body?.budget||'').trim().slice(0,120);
  const address=String(req.body?.address||'').trim().slice(0,220);
  const contactMethod=String(req.body?.contactMethod||'').trim().slice(0,80);
  const comment=String(req.body?.comment||'').trim().slice(0,1000);
  const visitorId=String(req.body?.visitorId||'').trim().slice(0,120);
  const sessionId=String(req.body?.sessionId||'').trim().slice(0,120);
  const source=String(req.body?.source||'').trim().slice(0,120);
  const referrer=String(req.body?.referrer||'').trim().slice(0,300);
  const landingPage=String(req.body?.landingPage||'').trim().slice(0,300);
  const utmCampaign=String(req.body?.utmCampaign||'').trim().slice(0,160);
  if(!service||!date||!guests||!name||!contact)return res.status(400).json({ok:false,error:'Заполните обязательные поля.'});

  const booking={
    id:'booking-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex'),
    createdAt:new Date().toISOString(),
    service,date,guests,name,contact,budget,address,contactMethod,comment,
    visitorId,sessionId,source,referrer,landingPage,utmCampaign
  };

  let saved=false,telegramSent=false,lastError='';
  if(yandexToken()){
    try{
      await writeYandexFile(SHEF51_BOOKINGS_PATH+booking.id+'.json',JSON.stringify(booking,null,2),'application/json');
      shef51BookingsCache.clear();
      saved=true;
    }catch(err){
      lastError=err?.message||'booking storage error';
      console.error('SHEF51 booking save error',lastError);
    }
  }

  try{
    const chatId=await telegramChatId();
    if(chatId){
      const text=[
        '🍣 Новая заявка SHEF51',
        '',
        'Услуга: '+service,
        'Дата: '+date,
        'Гостей: '+guests,
        'Имя: '+name,
        'Телефон: '+contact,
        'Бюджет: '+(budget||'—'),
        'Адрес / район: '+(address||'—'),
        'Связаться через: '+(contactMethod||'—'),
        'Пожелания: '+(comment||'—')
      ].join('\n');
      await telegramRequest('sendMessage',{chat_id:chatId,text});
      telegramSent=true;
    }else{
      lastError='Telegram chat is not ready';
    }
  }catch(err){
    lastError=err?.message||'Telegram delivery error';
    console.error('Telegram booking error',lastError);
  }

  if(saved||telegramSent){
    return res.json({ok:true,bookingId:booking.id,saved,telegramSent});
  }
  res.status(502).json({ok:false,error:'Не удалось сохранить заявку. Попробуйте ещё раз чуть позже.',detail:lastError});
});

const port=Number(process.env.PORT||3000);
app.listen(port,()=>{
  console.log(`FARRUKH AI Mobile V3.7: http://localhost:${port}`);
  setTimeout(async()=>{
    try{
      console.log('[telegram-check] tokenConfigured='+Boolean(telegramToken()));
      if(telegramToken()){
        const me=await telegramRequest('getMe',{});
        const chatId=await telegramChatId();
        console.log('[telegram-check] botConnected=true username='+(me?.username||'unknown')+' chatReady='+Boolean(chatId));
      }
    }catch(err){
      console.log('[telegram-check] botConnected=false error='+(err?.message||'unknown'));
    }
  },1500);
});

