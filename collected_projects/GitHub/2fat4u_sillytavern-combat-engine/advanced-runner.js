import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { planAdvancedTurn } from './advanced-ai.js?v=2.0.0-beta.2-hotfix.2';

function aggregate(state,results,id,paused=false){const ended=state.phase!=='active'||E.currentActor(state)?.id!==id;return {state,result:results.length?{...results.at(-1),advancedAI:true,...(results.length>1?{actions:results}:{}),initiative:E.turnOverview(state),turnEnded:ended,...(paused&&!ended?{paused:true}:{})}:{advancedAI:true,paused:true,actions:[]}};}
function prepare(state,plan){let staged=E.applyAIPlan(state,plan).state;return plan.move?E.moveActor(staged,plan.actor,plan.move).state:staged;}
function resolve(state,plan,options){
    if(plan.intent.type==='stance')return E.setStance(state,plan.actor,plan.intent.stance,plan.intent.turn);
    if(plan.intent.type==='endTurn')return E.endTurn(state,plan.intent,options);
    return (options.resolve??E.resolveAction)(state,plan.intent,{...options,source:'advanced'});
}
function decorate(before,resolved,plan){const result={...(resolved.result??{type:'stance',actor:plan.actor}),advancedAI:true,plan};
    if(plan.move){result.movement={from:E.coordinate(E.findActor(before,plan.actor).position),to:E.coordinate(plan.move)};const event=resolved.state.log.findLast(e=>e.details===resolved.result);if(event&&plan.intent.type!=='endTurn'){Object.assign(event.details,result);event.textDe=E.resultText(result,'de');event.textEn=E.resultText(result,'en');event.text=resolved.state.rules.language==='en'?event.textEn:event.textDe;}}
    return result;
}
function timing(options,started,plan){try{options.onPlanTiming?.({planMs:Math.round((performance.now()-started)*100)/100,actor:plan.actor,type:plan.intent.type});}catch{/* Optional diagnostics. */}}
export function resolveAdvancedTurn(s,options={}){const id=E.currentActor(s)?.id,results=[];let state=s;for(let i=0;i<250&&state.phase==='active'&&E.currentActor(state)?.id===id;i++){
    if(options.shouldStop?.())return aggregate(state,results,id,true);const before=state,started=performance.now(),plan=planAdvancedTurn(state);timing(options,started,plan);const staged=prepare(state,plan);
    const resolved=staged.phase!=='active'||E.currentActor(staged)?.id!==id?{state:staged,result:{type:'endTurn',actor:id}}:resolve(staged,plan,options);
    if(resolved.result?.cancelled)return aggregate(before,results,id,true);state=resolved.state;results.push(decorate(before,resolved,plan));
    }if(state.phase==='active'&&E.currentActor(state)?.id===id)state=E.endTurn(state).state;return aggregate(state,results,id);}
export async function resolveAdvancedTurnAsync(s,options={}){const id=E.currentActor(s)?.id,results=[];let state=s;for(let i=0;i<250&&state.phase==='active'&&E.currentActor(state)?.id===id;i++){
    if(options.shouldStop?.())return aggregate(state,results,id,true);const before=state,started=performance.now(),plan=planAdvancedTurn(state);timing(options,started,plan);const staged=prepare(state,plan);
    const resolved=staged.phase!=='active'||E.currentActor(staged)?.id!==id?{state:staged,result:{type:'endTurn',actor:id}}:await resolve(staged,plan,options);
    if(resolved.result?.cancelled)return aggregate(before,results,id,true);state=resolved.state;results.push(decorate(before,resolved,plan));await(options.yield?.()??new Promise(r=>setTimeout(r,0)));
    }if(state.phase==='active'&&E.currentActor(state)?.id===id)state=E.endTurn(state).state;return aggregate(state,results,id);}
