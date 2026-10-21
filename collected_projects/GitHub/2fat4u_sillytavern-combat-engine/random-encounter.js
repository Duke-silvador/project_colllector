import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { profileFrom } from './profiles.js?v=2.0.0-beta.2-hotfix.2';
function number(v,min,max){if(typeof v==='boolean'||v==null||v===''||!Number.isInteger(Number(v))||Number(v)<min||Number(v)>max)throw Error('Invalid random encounter count');return Number(v);}
function random(seed){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6d2b79f5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function randomEncounter(s,library,options={},prepare=v=>v){
    if(['active','paused'].includes(s.phase))throw Error('Stop combat before creating a random encounter');
    if(!s.rules.boardEnabled)throw Error('Enable the board first');
    const source=options.source??'library',ids=options.ids;
    if(!['library','participants'].includes(source)||!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Choose an opponent pool');
    const pool=source==='library'?library:s.actors.filter(a=>a.side==='enemy'&&E.canDeployRandom(a));
    const chosen=ids.map(id=>pool.find(a=>a.id===id));if(chosen.some(a=>!a))throw Error('Opponent pool changed; reopen the selection');
    const min=number(options.count??options.min??1,1,100),max=number(options.max??min,min,100),repeats=options.repeats??false;
    if(typeof repeats!=='boolean'||source==='participants'&&repeats)throw Error('Repeated participants require library templates');
    const control=options.control??'keep';if(!['keep','basic','advanced','manual'].includes(control))throw Error('Invalid encounter control');
    if(options.hidden!==undefined&&typeof options.hidden!=='boolean')throw Error('Invalid encounter visibility');
    const hidden=options.hidden??true,seed=String(options.seed?.trim()||E.uid()).slice(0,200),draw=random(seed);
    if(!repeats&&max>chosen.length)throw Error('The opponent pool is smaller than the requested count');
    const count=min+Math.floor(draw()*(max-min+1)),available=[...chosen],selected=[];
    for(let i=0;i<count;i++){const index=Math.floor(draw()*available.length);selected.push(available[index]);if(!repeats)available.splice(index,1);}
    let state=E.clone(s),deployed=[];
    if(hidden)state=E.setRules(state,{visionEnabled:true,hideUnseenEnemies:true}).state;
    if(source==='participants'){
        for(const a of chosen)state=E.reserveActor(state,a.id).state;
        for(const a of selected){if(control!=='keep')state=E.editActor(state,a.id,{control}).state;deployed.push(a.id);}
    }else for(const template of selected){
        const stats=E.convertStats(template.stats,template.templateStatMode??'scores',state.rules.statMode);
        const p=profileFrom({kind:'combat-actors',version:1,statMode:state.rules.statMode,actors:[{...template,stats}]}).actors[0];
        const input=prepare({...p,id:E.uid(),side:'enemy',...(control==='keep'?{}:{control}),position:null,portraitImage:p.portraitImage});
        const result=E.addActor(state,input);state=result.state;deployed.push(state.actors.at(-1).id);
    }
    state=E.randomPlace(state,{mode:'custom',scope:'all',ids:deployed,seed,partyFormation:'compact',enemyFormation:options.formation??'spread',outsideVision:hidden}).state;
    // Replace setup logs from the transaction with a neutral event. Undo still
    // retains the complete prior state, and GM/export retains actual actors.
    state.log=s.log.slice();state.log.push({id:E.uid(),type:'edit',at:new Date().toISOString(),text:state.rules.language==='en'?'Random encounter deployed.':'Zufallsbegegnung aufgestellt.',textDe:'Zufallsbegegnung aufgestellt.',textEn:'Random encounter deployed.',details:{type:'randomEncounter'}});state.log=state.log.slice(-300);
    return {state:E.validateState(state),result:{type:'randomEncounter'}};
}
