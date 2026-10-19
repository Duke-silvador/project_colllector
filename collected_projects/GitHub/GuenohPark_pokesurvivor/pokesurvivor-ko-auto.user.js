// ==UserScript==
// @name PokéSurvivor 한국어 자동 업데이트
// @namespace pokesurvivor-ko-auto
// @version 0.1.1
// @description 접속 시 GitHub 버전 확인, 새 번역팩만 다운로드, 오프라인 캐시와 플레이 중 교체 방지.
// @match https://pokesurvivor.org/*
// @match https://www.pokesurvivor.org/*
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @homepageURL https://github.com/GuenohPark/pokesurvivor
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js
// @run-at document-end
// @inject-into content
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.xmlHttpRequest
// @connect raw.githubusercontent.com
// ==/UserScript==

function createPokesurvivorAutoLoader(env) {
  'use strict';
  const NS='pokesurvivor-ko-local-test';
  function versionParts(value){
    const m=/^(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value||'');
    if(!m)throw new Error('잘못된 버전 형식');
    return {nums:[+m[1],+m[2],+(m[3]||0)],pre:m[4]?m[4].split('.'):null};
  }
  function compare(a,b){
    const x=versionParts(a),y=versionParts(b);
    for(let i=0;i<3;i++)if(x.nums[i]!==y.nums[i])return x.nums[i]>y.nums[i]?1:-1;
    if(!x.pre&&!y.pre)return 0;if(!x.pre)return 1;if(!y.pre)return -1;
    for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){
      if(x.pre[i]===undefined)return -1;if(y.pre[i]===undefined)return 1;
      if(x.pre[i]===y.pre[i])continue;
      const xn=/^\d+$/.test(x.pre[i]),yn=/^\d+$/.test(y.pre[i]);
      if(xn&&yn)return +x.pre[i]>+y.pre[i]?1:-1;if(xn!==yn)return xn?-1:1;
      return x.pre[i]>y.pre[i]?1:-1;
    }return 0;
  }
  function header(code){
    if(typeof code!=='string'||code.length>4000000)throw new Error('패치 응답 크기 오류');
    const m=/^\uFEFF?\s*\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/.exec(code);
    if(!m)throw new Error('패치 파일 형식 오류');
    const version=/^\/\/\s*@version\s+(\S+)/m.exec(m[1])?.[1];
    const namespace=/^\/\/\s*@namespace\s+(\S+)/m.exec(m[1])?.[1];
    if(namespace!==NS)throw new Error('패치 식별자 불일치');versionParts(version);return version;
  }
  function validated(record,expected){
    if(!record||typeof record.code!=='string')return null;
    const version=header(record.code);if(version!==record.version||(expected&&version!==expected))throw new Error('버전과 코드 불일치');
    return {...record,version,compiled:env.compile(record.code)};
  }
  async function run(){
    let cached=null,installed=null,interacted=false,cacheError=null;
    const report=x=>{env.status?.(x);return x;};
    if(env.otherPatch?.())return report({action:'duplicate-script'});
    const install=record=>{
      if(installed)return;
      if(env.otherPatch?.())throw new Error('이전 패치가 중복 실행 중입니다');
      env.execute(record.compiled,record.version);installed=record.version;
    };
    const detach=env.onInteraction?.(()=>{interacted=true;if(cached&&!installed){try{install(cached);}catch(e){cacheError=String(e.message||e);}}})||(()=>{});
    try{
      try{cached=validated(await env.getCache());}catch(e){cacheError=String(e.message||e);}
      if(interacted&&cached&&!installed)install(cached);
      report({action:'checking',version:cached?.version||null});
      const meta=await env.fetchMeta();const remote=header(meta);
      if(cached&&compare(remote,cached.version)<=0){install(cached);return report({action:'installed-cache',version:cached.version});}
      report({action:'downloading',version:remote});
      const code=await env.fetchBundle(remote);
      const next=validated({version:remote,code},remote);
      // Reread shared extension storage to avoid ordinary stale-frame downgrades.
      let store=next;
      try{const latest=validated(await env.getCache());if(latest&&compare(latest.version,next.version)>0)store=latest;}catch(e){}
      let saved=false;
      try{await env.setCache({version:store.version,code:store.code,savedAt:Date.now()});saved=true;}catch(e){cacheError='캐시 저장 실패';}
      if(installed||interacted){return report({action:'staged-update',version:installed,available:store.version,saved,cacheError});}
      install(store);
      return report({action:'installed-new',version:store.version,saved,cacheError});
    }catch(e){
      const error=String(e.message||e);
      if(cached){try{install(cached);return report({action:'offline-cache',version:cached.version,error,cacheError});}catch(installError){return report({action:'execution-failed',error:String(installError.message||installError)});}}
      return report({action:'first-load-failed',error,cacheError});
    }finally{detach();}
  }
  return {run,compare,header};
}

(async function(){
 'use strict';
 if(globalThis.__PSKO_AUTO_BOOTED)return;globalThis.__PSKO_AUTO_BOOTED=true;
 const BASE='https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/';
 const CACHE='pokesurvivor-ko:bundle-cache:v1';
 let badge=null,hideTimer=null;
 const show=text=>{
  if(!/(^|\.)pokesurvivor\.com$/i.test(location.hostname))return;
  if(!badge){badge=document.createElement('div');badge.id='psko-auto-status';badge.setAttribute('translate','no');badge.setAttribute('data-psko-own','');badge.setAttribute('role','status');badge.style.cssText='position:fixed;right:8px;bottom:8px;z-index:2147483647;max-width:90vw;padding:6px 9px;color:#ffdf8c;background:rgba(10,17,28,.94);border:1px solid #8b7440;font:12px Pixelify,system-ui,sans-serif;line-height:1.5;pointer-events:none';(document.body||document.documentElement).appendChild(badge);}
  clearTimeout(hideTimer);badge.hidden=false;badge.textContent=text;
 };
 const status=r=>{
  globalThis.__PSKO_AUTO_STATUS={...r};
  const labels={checking:r.version?'한국어 v'+r.version+' · 업데이트 확인 중':'한국어 패치 확인 중',downloading:'한국어 v'+r.version+' 받는 중', 'installed-cache':'한국어 v'+r.version, 'installed-new':'한국어 v'+r.version+' 적용됨', 'offline-cache':'한국어 v'+r.version+' · 저장된 버전 사용', 'staged-update':r.saved?'한국어 v'+r.available+' 준비됨 · 다음 새로고침 때 적용':'패치 캐시 저장 실패 · 다음 접속 시 재시도', 'duplicate-script':'기존 한국어 패치를 끄고 자동 로더만 켜 주세요', 'first-load-failed':'한국어 패치 연결 실패 · 인터넷 확인 후 새로고침', 'execution-failed':'한국어 패치 실행 실패 · Userscripts 실행 권한을 확인해 주세요'};
  show(labels[r.action]||'한국어 패치');
  if(badge && !['checking','downloading','duplicate-script'].includes(r.action))hideTimer=setTimeout(()=>{badge.hidden=true;},r.action==='staged-update'?9000:5000);
  if(['first-load-failed','execution-failed'].includes(r.action))console.warn('[PSKO auto]',r.error||r.action);
 };
 const gm=typeof GM==='object'?GM:null;
 if(!gm?.getValue||!gm?.setValue||!gm?.xmlHttpRequest){status({action:'execution-failed',error:'GM 권한이 없는 파일입니다. 자동 로더 원본을 설치해 주세요.'});return;}
 function request(url,timeout){
  return new Promise((resolve,reject)=>{
   let settled=false,req,timer;
   const done=r=>{if(settled)return;settled=true;clearTimeout(timer);if(r.status<200||r.status>=300){reject(new Error('HTTP '+r.status));return;}resolve(String(r.responseText??r.response??''));};
   const fail=e=>{if(settled)return;settled=true;clearTimeout(timer);reject(new Error(e?.message||'네트워크 연결 실패'));};
   try{req=gm.xmlHttpRequest({method:'GET',url,timeout,responseType:'text',onload:done,onerror:fail,ontimeout:()=>fail({message:'연결 시간 초과'})});if(req?.then)req.then(done,fail);if(!settled)timer=setTimeout(()=>{try{req?.abort?.();}catch(e){}fail({message:'연결 시간 초과'});},timeout+500);}catch(e){fail(e);}
  });
 }
 const loader=createPokesurvivorAutoLoader({
  getCache:()=>gm.getValue(CACHE,null),setCache:value=>gm.setValue(CACHE,value),
  fetchMeta:()=>request(BASE+'pokesurvivor-ko-menu.meta.js?check='+Date.now(),5000),
  fetchBundle:version=>request(BASE+'pokesurvivor-ko-menu.user.js?v='+encodeURIComponent(version)+'&check='+Date.now(),15000),
  compile:source=>Function(source),execute:fn=>fn(),
  otherPatch:()=>!!document.documentElement.dataset.pskoDom,
  onInteraction:handler=>{const once=()=>handler();for(const name of ['pointerdown','touchstart','keydown'])addEventListener(name,once,{capture:true,passive:true});return()=>{for(const name of ['pointerdown','touchstart','keydown'])removeEventListener(name,once,true);};},
  status,
 });
 await loader.run();
})();
