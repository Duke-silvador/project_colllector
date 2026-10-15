import {FIELDS} from './model.js';
import {keywordDigest,snapshotResult} from './snapshot.js';

export function createSnapshotReader(path,{fetch:request=globalThis.fetch,validate:customValidate}={}) {
  let cached=null,etag='',signature='',revision=0,pending=null;
  function validate(value) {
    if(value?.schemaVersion!==1||!value.words||Array.isArray(value.words)||typeof value.words!=='object'||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('每日数据格式异常，保留上次数据。');
    for(const word of Object.values(value.words)) {
      if(!word?.days||typeof word.days!=='object'||Array.isArray(word.days))throw Error('每日数据格式异常，保留上次数据。');
      for(const day of Object.values(word.days))if(!Number.isInteger(day?.recordCount)||day.recordCount<0||!Number.isFinite(Date.parse(day.updatedAt))||FIELDS.some(field=>day.totals?.[field]!==null&&!Number.isFinite(day.totals?.[field])))throw Error('每日数据格式异常，保留上次数据。');
    }
  }
  return {
    get revision(){return revision;},
    read(){
      if(pending)return pending;
      pending=(async()=>{
        const response=await request(path,{cache:'no-cache',credentials:'omit',headers:etag?{'If-None-Match':etag}:{},signal:AbortSignal.timeout(60000)});
        if(response.status===304){if(!cached)throw Error('每日数据暂未同步，请稍后重试。');return cached;}
        if(!response.ok)throw Error('每日数据暂未同步，请稍后重试。');
        const next=await response.json();(customValidate||validate)(next);
        if(cached&&Date.parse(next.updatedAt)<Date.parse(cached.updatedAt))throw Error('暂未取得最新快照，保留上次数据。');
        const nextSignature=JSON.stringify(next);
        if(nextSignature!==signature){cached=next;signature=nextSignature;revision++;}
        etag=response.headers.get('etag')||'';
        return cached;
      })().finally(()=>{pending=null;});
      return pending;
    }
  };
}

// Only the public snapshot is read. No JD requests or subscription writes occur here.
export function startSnapshotRefresh({reader,initialSnapshot,scheduler,context,busy,apply,onError,onSuccess=()=>{}}) {
  let first=true,retry=0;
  const contextKey=value=>JSON.stringify([value.generation,value.words,value.range]);
  const controller=scheduler.create({
    intervalMs:60000,canPoll:()=>!busy(),
    read:async()=>{
      const snapshot=first&&initialSnapshot?initialSnapshot:await reader.read();first=false;
      const current=context();
      const entries=await Promise.all(current.words.map(async word=>[word,snapshotResult(snapshot,await keywordDigest(word),word,current.range)]));
      return {snapshot,revision:reader.revision,current,entries};
    },
    key:value=>JSON.stringify([value.revision,contextKey(value.current),retry]),
    apply:value=>{
      if(busy()||contextKey(value.current)!==contextKey(context())){retry++;return;}
      apply(value.snapshot,value.entries,value.current.range);onSuccess();
    },
    onUnchanged:onSuccess,onError
  });
  controller.start();return controller;
}
