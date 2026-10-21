import { ruleFileFrom,exportRules } from './rule-transfer.js?v=2.0.0-beta.2-hotfix.2';
import { randomEncounter } from './random-encounter.js?v=2.0.0-beta.2-hotfix.2';
import { appearanceFrom } from './terrain-appearance.js?v=2.0.0-beta.2-hotfix.2';
import { prepareHistory } from './history-codec.js?v=2.0.0-beta.2-hotfix.2';
import { exportProfiles, profileFrom, weaponProfilePatch, transferPatch } from './profiles.js?v=2.0.0-beta.2-hotfix.2';
import { createDebug } from './debug.js?v=2.0.0-beta.2-hotfix.2';
import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { resolveAdvancedTurnAsync } from './advanced-runner.js?v=2.0.0-beta.2-hotfix.2';
import { resolveBasicTurnAsync } from './ai.js?v=2.0.0-beta.2-hotfix.2';
import { imageFrom, imagesFrom, selectImages, assertImages } from './visuals.js?v=2.0.0-beta.2-hotfix.2';
import { combatChanged, correctionSummary, markChatEvents, checksRevoked } from './chat-events.js?v=2.0.0-beta.2-hotfix.2';
import { captureMap, mapFrom, mapsFrom } from './maps.js?v=2.0.0-beta.2-hotfix.2';

export function createController(io) {
    let queue = Promise.resolve();
    let aiRunning = false, aiStop = false;
    const subscribers = new Set();
    const eventSubscribers = new Set(), progressSubscribers=new Set();
    const reactionSubscribers = new Set();
    let reactionRequest = null;
    function settleReaction(choice = 'none') {
        const request = reactionRequest;
        reactionRequest = null;
        if(request)debug.record('reaction',{actor:request.actor,status:choice==='cancel'?'cancelled':'decided',choice,waitMs:Math.round(now()-request.waitStarted)});
        request?.resolve(choice);
    }
    async function resolveWithReactions(s, intent, options = {}) {
        if(options.receipt&&s.receipts.includes(options.receipt))return E.resolveAction(s,intent,options);
        if (intent.type !== 'attack' || !s.rules.reactionsEnabled) return E.resolveAction(s,intent,options);
        const preview = E.attackPreview(s,intent,options), key = io.key(), decisions = Object.create(null), reactionDraws=Object.create(null),rolling=E.clone(s);
        for (const request of preview.defenders) {
            if (request.control !== 'manual' || !reactionSubscribers.size) continue;
            const choice = await new Promise((resolve,reject) => {
                reactionRequest = {...request, preview, key, resolve,waitStarted:now()};
                debug.record('reaction',{actor:request.actor,status:'waiting',options:request.options,attacker:preview.actor,maxDamage:preview.maxDamage});
                for (const fn of reactionSubscribers) { try { fn(reactionRequest); } catch(error) {reactionRequest=null;debug.record('error',{operation:'reaction-dialog',message:error.message,stack:error.stack});reject(new Error('Reaktionsfenster konnte nicht geöffnet werden: '+error.message));return;} }
            });
            if (io.key() !== key || choice === 'cancel' || options.shouldStop?.()) return {state:s,result:{cancelled:true}};
            if(choice?.kind==='narrative'&&!request.options.find(v=>v.kind==='narrative'&&v.skill===choice.skill)?.mechanical){
                const draw=E.narrativeReactionPreview(rolling,request.actor,preview.actor,choice.skill,options);rolling.rng.cursor=draw.cursorAfter;reactionDraws[request.actor]=draw;
                const follow=await new Promise((resolve,reject)=>{reactionRequest={...request,stage:'narrative-result',result:draw.result,preview,key,resolve,waitStarted:now()};for(const fn of reactionSubscribers){try{fn(reactionRequest);}catch(error){reactionRequest=null;debug.record('error',{operation:'reaction-result-dialog',message:error.message,stack:error.stack});reject(new Error('Reaktionsergebnis konnte nicht geöffnet werden: '+error.message));return;}}});
                if(io.key()!==key)return {state:s,result:{cancelled:true}};
                decisions[request.actor]={kind:'narrative',skill:choice.skill,resolution:follow==='cancel'||follow?.resolution==='void'?'void':'continue'};
                if(decisions[request.actor].resolution==='void')break;
            }else decisions[request.actor] = choice === 'none' ? {kind:'none'} : choice;
        }
        return E.resolveAction(s,intent,{...options,reactionDecisions:decisions,reactionDraws});
    }
    let progress={count:0,limit:20,running:false};
    const now=()=>globalThis.performance?.now?.()??Date.now();
    const report=patch=>{progress={...progress,...patch};for(const fn of progressSubscribers){try{fn({...progress});}catch{}}};
    let localMaps = [];
    const notify = () => {if(reactionRequest&&reactionRequest.key!==io.key())settleReaction('cancel'); for (const fn of subscribers) fn(); };
    const read = () => {const bundle=io.read();bundle.history=prepareHistory(bundle.history);return bundle;};
    const debug = createDebug(()=>Boolean(io.preferences?.()?.debugEnabled),()=>{
        const s=read().state;return {phase:s.phase,round:s.round,active:E.currentActor(s)?.id,action:s.action,movement:s.movement,rng:s.rng,rules:{reactionsEnabled:s.rules.reactionsEnabled,shieldsEnabled:s.rules.shieldsEnabled,resourcesEnabled:s.rules.resourcesEnabled,reactionBlock:s.rules.reactionBlock,reactionsPerTurn:s.rules.reactionsPerTurn,visionEnabled:s.rules.visionEnabled,visionBase:s.rules.visionBase,visionPerception:s.rules.visionPerception},board:{width:s.board.width,height:s.board.height,preset:s.board.preset},connection:io.connection?.()?.label,requestBusy:Boolean(io.requestBusy?.()),actors:s.actors.map(a=>({id:a.id,name:a.name,aiConfig:a.aiConfig,aiSearch:{goal:a.aiMemory.searchGoal,team:a.aiMemory.searchTeam,rally:a.aiMemory.rally,counter:a.aiMemory.counter,contacts:a.aiMemory.allyContacts.length,surveyedRows:a.aiMemory.survey.length},hp:a.hp,maxHp:a.maxHp,tactics:a.tactics,dc:a.dc,stats:a.stats,position:a.position,lastPosition:a.lastPosition,lastHeight:a.lastHeight,reserve:a.reserve,hidden:a.hidden,hanging:a.hanging,joinRound:a.joinRound,turnRound:a.turnRound,unlimitedTurn:a.unlimitedTurn,resources:a.resources,effects:a.effects,condition:a.condition,roundsLeft:a.roundsLeft,shields:a.shields,shieldProfiles:a.shieldProfiles,control:a.control,reactionChoices:a.reactionChoices,reactionControl:a.reactionControl,reactionCost:a.reactionCost,reactionUsed:a.reactionUsed,reactionReserve:a.reactionReserve,reactionSpent:a.reactionSpent,reactionReserved:a.reactionReserved,reactionsPerTurn:a.reactionsPerTurn,conditionImmunities:a.conditionImmunities,damageImmunities:a.damageImmunities,damageResistances:a.damageResistances}))};
    });
    function serial(fn) {
        const key = io.key();
        const next = queue.then(async () => {
            if (io.key() !== key) throw new Error('Chat wurde gewechselt. Aktion erneut im richtigen Chat ausführen.');
            io.requireChat?.();
            return await fn();
        });
        queue = next.catch(error => {debug.record('error',{message:error.message,stack:error.stack});});
        return next;
    }
    async function change(operation, imported = false) {
        return serial(async () => {
            const key=io.key(),bundle = read(),started=now();
            const before = E.clone(bundle.state);
            const { state, result, images } = await operation(bundle.state, bundle);
            const computeMs=now()-started;
            if(io.key()!==key)throw new Error('Chat wurde gewechselt. Aktion erneut im richtigen Chat ausführen.');
            if (state === bundle.state) return result;
            const history = [...bundle.history, before].slice(-30);
            const storedImages = imagesFrom(selectImages(images ?? bundle.images ?? {}, [state, ...history]));
            assertImages(state, storedImages);
            bundle.images = storedImages;
            bundle.history = prepareHistory(history);
            bundle.state = state;
            const previousIds = new Set(before.log.map(e => e.id));
            const events = imported ? state.log.slice(-1) : state.log.filter(e => !previousIds.has(e.id));
            debug.record('change',{events:events.map(e=>({type:e.type,text:e.text,...(e.details?.type==='attack'?{hit:e.details.hit,rawDamage:e.details.rawDamage,defense:e.details.affected.map(v=>({actor:v.id,damage:v.damage,blocked:v.blocked,cover:v.cover,absorbed:v.absorbed,shieldReduction:v.shieldReduction,blockReduction:v.blockReduction}))}:{})}))});
            markChatEvents(before, state, events);
            io.onChange?.(bundle, events);
            io.write(bundle);
            const renderStarted=now();notify();const renderMs=now()-renderStarted;
            for (const fn of eventSubscribers) { try { fn(before, state, events); } catch { /* Optional feedback cannot block combat. */ } }
            const saveStarted=now();await io.save();
            debug.record('timing',{operationMs:Math.round(computeMs*100)/100,renderMs:Math.round(renderMs*100)/100,saveMs:Math.round((now()-saveStarted)*100)/100,paused:Boolean(result?.paused),steps:result?.actions?.length});
            return result;
        });
    }
    function withPortrait(input, bundle) {
        if (!Object.hasOwn(input, 'portraitImage')) return { input, images: bundle.images ?? {} };
        const images = { ...bundle.images }, portrait = input.portraitImage == null ? null : storeImage(images, input.portraitImage, 'portrait');
        const { portraitImage, ...rest } = input;
        return { input: { ...rest, portrait }, images };
    }
    function storeImage(images, raw, kind) {
        const image = imageFrom(raw);
        if (image.kind !== kind) throw new Error('Ungültiger Bildtyp.');
        const existing = Object.entries(images).find(([, v]) => v.src === image.src && v.kind === image.kind && v.width === image.width && v.height === image.height);
        const id = existing?.[0] ?? `img-${E.uid()}`;
        images[id] = image;
        return id;
    }
    const controller = {
        state: () => read().state,
        chatKey: () => io.key(),
        historyLength: () => read().history.length,
        subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
        subscribeEvents(fn) { eventSubscribers.add(fn); return () => eventSubscribers.delete(fn); },
        subscribeReactions(fn) { reactionSubscribers.add(fn); return () => {reactionSubscribers.delete(fn);settleReaction('cancel');}; },
        pendingReaction: () => reactionRequest,
        respondReaction: settleReaction,
        cancelReactions: () => settleReaction('cancel'),
        refresh: notify,
        subscribeProgress(fn){progressSubscribers.add(fn);return ()=>progressSubscribers.delete(fn);},
        aiProgress:()=>({...progress}),
        freeRoll: (sides,options)=>change(s=>E.freeRoll(s,sides,options)),
        name: value=>change(s=>E.setCombatName(s,value)),
        add: input => change((s, b) => { const staged = withPortrait(input, b); return { ...E.addActor(s, staged.input), images: staged.images }; }),
        edit: (id, input) => change((s, b) => { const staged = withPortrait(input, b); return { ...E.editActor(s, id, staged.input), images: staged.images }; }),
        image: id => read().images?.[id] ?? null,
        view: patch => {
            if (!patch) return { zoom: 44, fit: false, ...read().view };
            return serial(async () => {
                const view = { zoom: 44, fit: false, ...read().view, ...patch };
                if (!Number.isInteger(view.zoom) || view.zoom < 2 || view.zoom > 96 || typeof view.fit !== 'boolean') throw new Error('Ungültige Zoom-Einstellung.');
                const bundle = read(); bundle.view = view; io.write(bundle); notify(); await io.save();
            });
        },
        background: patch => change((s, b) => {
            if (patch == null) return E.setBackground(s, null);
            const images = { ...b.images }, { image, ...settings } = patch;
            const asset = image == null ? settings.asset ?? s.board.background?.asset : storeImage(images, image, 'background');
            return { ...E.setBackground(s, { ...s.board.background, ...settings, asset }), images };
        }),
        reserve: id=>change(s=>E.reserveActor(s,id)),
        deploy: (id,pos,options)=>change(s=>E.deployActor(s,id,pos,options)),
        unlimited: (id,enabled,token)=>change(s=>E.setUnlimited(s,id,enabled,token)),
        reveal: id=>change(s=>E.revealActor(s,id)),
        returnActor: id => change(s => E.returnActor(s, id)),
        remove: id => change(s => E.removeActor(s, id)),
        move: (id, pos, override) => change(s => E.moveActor(s, id, pos, override)),
        goCover: (id, token) => change(s => E.goCover(s, id, token)),
        stance: (id,value,token) => change(s=>E.setStance(s,id,value,token)),
        remark: (id,description,token) => change(s=>E.remark(s,id,description,token)),
        restore: options => change(s=>E.restoreParticipants(s,options)),
        reset: scope => change(s=>E.resetScenario(s,scope)),
        groupBudgets: (sides,config,mode) => change(s=>E.setGroupBudgets(s,sides,config,mode)),
        exportProfiles: (kind,id) => exportProfiles(controller.state(),kind,id,controller.image),
        checkProfiles: raw => {try{return profileFrom(raw);}catch(error){debug.record('error',{operation:'profile validation',message:error.message});throw error;}},
        importProfiles: (raw,id,options) => change((s,b)=>{
            const profile=profileFrom(raw);
            if(options && profile.kind!=='combat-actors'){
                const ids=Array.isArray(id)?id:[id];if(!ids.length)throw new Error('Mindestens eine Zielfigur auswählen.');let state=s;
                for(const actorId of new Set(ids)){
                    const patch=transferPatch(E.findActor(state,actorId),profile,options.mode??'append',state);
                    if(patch.effects)patch.effects=patch.effects.map(e=>({...e,appliedTurn:e.appliedTurn??state.turnSerial}));
                    state=E.editActor(state,actorId,patch).state;
                }
                return {state};
            }
            if(profile.kind==='combat-budget')return E.editActor(s,id,profile);
            if(profile.kind==='combat-weapons')return E.editActor(s,id,weaponProfilePatch(E.findActor(s,id),profile));
            if(profile.kind!=='combat-actors')return E.editActor(s,id,transferPatch(E.findActor(s,id),profile,'replace',s));
            let state=s,images={...b.images};for(const a of profile.actors){const staged=withPortrait({...a,stats:E.convertStats(a.stats,profile.statMode,s.rules.statMode)}, {images});images=staged.images;state=E.addActor(state,staged.input).state;}return {state,images};
        }),
        start: (roll,options={}) => change(s => E.startCombat(s, roll,undefined,options)),
        stop: () => change(E.stopCombat),
        elapse: () => change(E.elapseRound),
        exportRules:()=>exportRules(controller.state()),
        importRules:raw=>change(s=>E.setRules(s,{...ruleFileFrom(raw).rules,language:s.rules.language},false)),
        appearance:(raw,pictures={})=>change((s,b)=>{
            const appearance=appearanceFrom(raw),images={...b.images};
            for(const [type,picture]of Object.entries(pictures)){if(!['ground','wall','cover','pit','height'].includes(type))throw Error('Invalid terrain texture');if(picture==null)delete appearance.assets[type];else appearance.assets[type]=storeImage(images,picture,'texture');}
            const result=E.setBoard(s,{appearance});return {...result,images};
        }),
        randomEncounter:options=>change((s,b)=>{const images={...b.images};const result=randomEncounter(s,controller.library(),options,input=>{const staged=withPortrait(input,{images});Object.assign(images,staged.images);return staged.input;});return {...result,images};}),
        rules: (patch, applyHp = false) => change(s => E.setRules(s, patch, applyHp)),
        groups: patch => change(s => E.setGroupControls(s, patch)),
        paint: (tool,cells,options={})=>change(s=>E.paintTerrain(s,tool,cells,options)),
        board: patch => change(s => E.setBoard(s, patch)),
        randomBoard: (options={}) => change(s => E.randomBoard(s, {...options,seed:options.seed?.trim()||E.uid()})),
        randomPlace: (options={}) => change(s=>E.randomPlace(s,{...options,seed:options.seed?.trim()||E.uid()})),
        order: ids => change(s => E.setOrder(s, ids)),
        async endTurn(intent = { actor: E.currentActor(controller.state())?.id, turn: E.turnToken(controller.state()) }, options = {}) {
            const key = io.key();
            const result = await change(s => E.endTurn(s, intent, options));
            if (io.key() === key) io.onAction?.(result);
            return result;
        },
        async act(intent, options = {}) {
            const key = io.key();
            const result = await change(s => resolveWithReactions(s, intent, options));
            if (!result?.duplicate && !result?.cancelled && io.key() === key) io.onAction?.(result);
            return result;
        },
        async aiStep(options = {}) {
            if (io.modelBusy?.()) throw new Error('Die laufende KI-Antwort zuerst abschließen.');
            const key = io.key();
            const result = await change(s => (E.currentActor(s)?.control==='advanced'?resolveAdvancedTurnAsync:resolveBasicTurnAsync)(s, {...options,resolve:resolveWithReactions,onPlanTiming:detail=>{debug.record('timing',{...detail,stage:'AI plan'});options.onPlanTiming?.(detail);},shouldStop:()=>io.key()!==key || Boolean(options.shouldStop?.())}));
            if (result?.type && io.key() === key) io.onAction?.(result);
            return result;
        },
        async aiRun(limit = io.preferences?.()?.aiBatchSize ?? 20) {
            if (aiRunning) return;
            if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('KI-Serie: 1 bis 100 Züge erforderlich.');
            const key = io.key(); let count = 0;
            aiRunning = true; aiStop = false; report({count:0,limit,running:true}); notify();
            try {
                while (!aiStop && io.key() === key && count < limit && controller.state().phase === 'active' && ['basic','advanced'].includes(E.currentActor(controller.state())?.control)) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    if (aiStop || io.key() !== key) break;
                    const token=E.turnToken(controller.state());
                    await controller.aiStep({shouldStop:()=>aiStop});
                    if(io.key()!==key)break;
                    if(controller.state().phase!=='active'||E.turnToken(controller.state())!==token)count++;
                    report({count});
                }
                return { count, limited: count >= limit, stopped: aiStop };
            } finally { aiRunning = false; report({running:false}); notify(); }
        },
        stopAI: () => { aiStop = true; settleReaction('cancel'); },
        aiRunning: () => aiRunning,
        modelBusy: () => Boolean(io.modelBusy?.()),
        requestBusy: () => Boolean(io.requestBusy?.()),
        cancelRequest: () => io.cancelRequest?.(),
        undo: () => serial(async () => {
            const bundle = read();
            if (!bundle.history.length) throw new Error('Keine Änderung zum Rückgängigmachen vorhanden.');
            const old = bundle.state;
            const restored = bundle.history.pop();
            restored.receipts = [...new Set([...restored.receipts, ...old.receipts])].slice(-1000);
            const previousSerial = restored.turnSerial;
            restored.turnSerial = Math.max(restored.turnSerial, old.turnSerial) + 1;
            for (const a of restored.actors) { for(const key of ['stanceTurn','sprintTurn','acrobaticsTurn','acrobaticsUsedTurn','reactionTurn','unlimitedTurn']) if(a[key]===previousSerial)a[key]=restored.turnSerial; for(const t of [...(a.tactics??[]),...(a.shields??[])])if(t.appliedTurn===previousSerial)t.appliedTurn=restored.turnSerial; }
            for(const a of restored.actors){if(a.hidden?.appliedTurn===previousSerial)a.hidden.appliedTurn=restored.turnSerial;if(a.allegiance?.appliedTurn===previousSerial)a.allegiance.appliedTurn=restored.turnSerial;}
            for (const a of restored.actors) for (const effect of a.effects ?? []) if (effect.appliedTurn === previousSerial) effect.appliedTurn = restored.turnSerial;
            if (restored.movement) restored.movement.turnSerial = restored.turnSerial;
            if (restored.action) restored.action.turnSerial = restored.turnSerial;
            restored.revision = old.revision + 1;
            assertImages(restored, bundle.images ?? {});
            const relevant = combatChanged(old, restored) || checksRevoked(old,restored);
            const textDe = relevant ? 'Letzte Kampfänderung rückgängig gemacht. Ihr Ergebnis ist widerrufen; dieser Zustand gilt.\n' + correctionSummary(restored) : 'Letzte Bearbeitung rückgängig gemacht.';
            const textEn = relevant ? 'Last combat change undone. Its result is revoked; this state is authoritative.\n' + correctionSummary(restored, 'en') : 'Last edit undone.';
            restored.log.push({ id: E.uid(), type: 'undo', chatRelevant: relevant, text: restored.rules.language === 'en' ? textEn : textDe, textEn, textDe, at: new Date().toISOString(), details: {} });
            restored.log = restored.log.slice(-300);
            bundle.state = restored;
            io.onChange?.(bundle, restored.log.slice(-1));
            io.write(bundle); notify(); await io.save();
        }),
        import: raw => change((s, b) => {
            const state = E.validateState(raw);
            const images = { ...b.images, ...imagesFrom(raw.images ?? {}) };
            // An import may not replace an existing image used by undo history.
            for (const [id, image] of Object.entries(b.images ?? {})) if (JSON.stringify(images[id]) !== JSON.stringify(image)) throw new Error('Bildverweis kollidiert mit einem vorhandenen Bild.');
            assertImages(state, images);
            state.revision = s.revision + 1;
            const previousSerial = state.turnSerial;
            state.turnSerial = Math.max(s.turnSerial, state.turnSerial) + 1;
            for (const a of state.actors) { for(const key of ['stanceTurn','sprintTurn','acrobaticsTurn','acrobaticsUsedTurn','reactionTurn','unlimitedTurn'])if(a[key]===previousSerial)a[key]=state.turnSerial;for(const t of [...(a.tactics??[]),...(a.shields??[])])if(t.appliedTurn===previousSerial)t.appliedTurn=state.turnSerial; }
            for(const a of state.actors){if(a.hidden?.appliedTurn===previousSerial)a.hidden.appliedTurn=state.turnSerial;if(a.allegiance?.appliedTurn===previousSerial)a.allegiance.appliedTurn=state.turnSerial;}
            for (const a of state.actors) for (const effect of a.effects) if (effect.appliedTurn === previousSerial) effect.appliedTurn = state.turnSerial;
            state.movement.turnSerial = state.turnSerial;
            state.action.turnSerial = state.turnSerial;
            state.receipts = [...new Set([...s.receipts, ...state.receipts])].slice(-1000);
            const textDe = `Kampf importiert: ${state.actors.length} Figuren, Phase ${state.phase}. Dieser Zustand gilt.` + (state.phase === 'active' ? '\n' + correctionSummary(state) : '');
            const textEn = `Combat imported: ${state.actors.length} participants, phase ${state.phase}. This state is authoritative.` + (state.phase === 'active' ? '\n' + correctionSummary(state, 'en') : '');
            state.log.push({ id: E.uid(), type: 'import', text: state.rules.language === 'en' ? textEn : textDe, textEn, textDe, at: new Date().toISOString(), details: {} });
            state.log = state.log.slice(-300);
            return { state, images };
        }, true),
        addRoster: inputs => change((s, b) => {
            let state = s;
            let images = { ...b.images };
            for (const input of inputs) { const staged = withPortrait(input, { images }); images = staged.images; state = E.addActor(state, { ...staged.input, position: null }).state; }
            return { state, images };
        }),
        export: () => E.clone({ ...read().state, images: selectImages(read().images ?? {}, [read().state]) }),
        maps: () => mapsFrom(io.maps?.() ?? localMaps),
        saveMap: (name, id) => serial(async () => {
            const s = controller.state(), map = captureMap(s, name, controller.image(s.board.background?.asset), id,controller.image);
            const maps = controller.maps(), index = maps.findIndex(v => v.id === map.id);
            if (index < 0) maps.push(map); else maps[index] = map;
            const valid = mapsFrom(maps); await io.saveMaps?.(valid); localMaps = valid; notify(); return map;
        }),
        importMap: raw => serial(async () => {
            const map = mapFrom({ ...raw, id: E.uid() }), maps = mapsFrom([...controller.maps(), map]);
            await io.saveMaps?.(maps); localMaps = maps; notify(); return map;
        }),
        renameMap: (id, name) => serial(async () => {
            const maps = controller.maps(); if (!maps.some(v => v.id === id)) throw new Error('Karte fehlt.');
            const valid = mapsFrom(maps.map(v => v.id === id ? { ...v, name } : v)); await io.saveMaps?.(valid); localMaps = valid; notify();
        }),
        deleteMap: id => serial(async () => { const maps = controller.maps().filter(v => v.id !== id); await io.saveMaps?.(maps); localMaps = maps; notify(); }),
        exportMap: id => { const map = controller.maps().find(v => v.id === id); if (!map) throw new Error('Karte fehlt.'); return E.clone(map); },
        loadMap: (id, { keepPositions = false } = {}) => change((s, b) => {
            if (['active','paused'].includes(s.phase)) throw new Error('Kampf vor dem Kartenwechsel stoppen.');
            const map = controller.maps().find(v => v.id === id); if (!map) throw new Error('Karte fehlt.');
            const images = { ...b.images }, draft = E.clone(s), board = E.clone(map.board);
            if (board.background) board.background.asset = storeImage(images, map.backgroundImage, 'background');
            board.appearance.assets=Object.fromEntries(Object.entries(map.textureImages).map(([type,image])=>[type,storeImage(images,image,'texture')]));
            draft.board = board;
            let unplaced = 0;
            for (const a of draft.actors) if (a.position && (!keepPositions || !E.canOccupy(draft, a.position))) { a.position = null; unplaced++; }
            const { state } = E.setBoard(draft, board);
            const valid = E.validateState(state);
            valid.log.at(-1).textDe = `Karte geladen: ${map.name}. ${unplaced} Figuren neu platzieren.`;
            valid.log.at(-1).textEn = `Map loaded: ${map.name}. Place ${unplaced} participants again.`;
            valid.log.at(-1).text = s.rules.language === 'en' ? valid.log.at(-1).textEn : valid.log.at(-1).textDe;
            return { state: valid, images, result: { unplaced } };
        }),
        library: () => io.library?.() ?? [],
        saveTemplate: async id => {
            const a = E.clone(E.findActor(controller.state(), id));
            a.side=a.allegiance?.originalSide??a.side;a.control=a.allegiance?.originalControl??a.control;a.allegiance=null;a.raiseLocked=false;
            a.aiMemory=null;if(a.aiConfig){a.aiConfig.home=null;a.aiConfig.homeMode='deployment';}a.position = null; a.hp = a.maxHp; a.escaped = false;
            Object.assign(a,{reserve:false,initiativeReady:false,lastPosition:null,lastHeight:0,joinRound:0,turnRound:-1,unlimitedTurn:-1,hidden:null,hanging:null});a.effects = [];a.shields=[];a.reactionSpent=0;a.reactionReserved=0;a.reactionUsed=false;a.reactionReserve=false;a.reactionTurn=-1; a.tactics=[];a.stance='neutral';a.stanceTurn=-1;a.sprintTurn=-1;a.acrobaticsTurn=-1;a.acrobaticsUsedTurn=-1;
            a.templateStatMode = controller.state().rules.statMode;
            // Templates carry their one picture so they also work in other chats.
            a.portraitImage = controller.image(a.portrait); a.portrait = null;
            await io.saveTemplate?.(a); notify();
        },
        loadTemplate: id => {
            const a = controller.library().find(v => v.id === id);
            if (!a) throw new Error('Vorlage fehlt.');
            return controller.add({ ...a, aiMemory:null,aiConfig:a.aiConfig?{...a.aiConfig,home:null,homeMode:'deployment'}:undefined,side:a.allegiance?.originalSide??a.side,control:a.allegiance?.originalControl??a.control,allegiance:null,raiseLocked:false,stats: E.convertStats(a.stats, a.templateStatMode ?? 'scores', controller.state().rules.statMode), position: null, hp: a.maxHp, escaped: false });
        },
        deleteTemplate: async id => { await io.deleteTemplate?.(id); notify(); },
        scanRoster: () => io.scanRoster?.() ?? [],
        narrate: () => debugRequest('narrate',()=>io.narrate?.()),
        propose: () => debugRequest('proposal',()=>io.propose?.()),
        postResult: () => io.postResult?.(),
        flushChat: () => io.flushChat?.(),
        diagnostics: () => io.diagnostics?.() ?? { label: 'Offline-Vorschau: kein KI-Aufruf verbunden.', prompt: E.buildPrompt(controller.state(),{compact:true}), verified: false },
        preferences: patch => {if(patch?.showVision!==undefined&&typeof patch.showVision!=='boolean')throw Error('Invalid vision display setting');return patch ? io.preferences?.(patch) : io.preferences?.() ?? { language: 'de', quickSide: 'right' };},
        connection: () => io.connection?.() ?? { label: 'Offline-Vorschau', tools: false },
        pendingAction: () => io.pendingAction?.() ?? null,
        clearPending: () => { io.clearPending?.(); notify(); },
        debugRecord: (type,detail)=>debug.record(type,detail),
        debugEntries: debug.entries,
        debugText: debug.text,
        debugClear: debug.clear,
    };
    async function debugRequest(operation,fn){debug.record('request',{operation,status:'started',expected:operation==='proposal'?'One fenced combat JSON block: type, actor ID, target/resource/skill/weapon as needed, current turn.':undefined});try{const result=await fn();try{debug.record('request',{operation,status:'completed',pending:io.pendingAction?.()?.reason,context:io.diagnostics?.()?.label});}catch{/* Diagnostic adapters cannot change a successful request. */}return result;}catch(error){try{debug.record('error',{operation,message:error.message,status:io.requestBusy?.()?'pending':'released'});}catch{}throw error;}}
    return controller;
}
