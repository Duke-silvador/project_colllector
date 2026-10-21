import { mechanicsText } from './custom-effects.js?v=2.0.0-beta.2-hotfix.2';
import { traitsMarkup, readTraits } from './traits-ui.js?v=2.0.0-beta.2-hotfix.2';
import { selfAbility, abilityFeedbackText, abilityRestriction, coordinateInput, carrySelection, carryPreview, carryPreviewMarkup, carryDestinationMarkup } from './ability-ui.js?v=2.0.0-beta.2-hotfix.2';
import { STATUS_TYPES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
import { openRestore } from './restore-ui.js?v=2.0.0-beta.2-hotfix.2';
import { checkText } from './checks.js?v=2.0.0-beta.2-hotfix.2';
import { deploymentMarkup, bindDeployment, bindMapOptions } from './deployment-ui.js?v=2.0.0-beta.2-hotfix.2';
import { openRuleTransfer,openRandomEncounter,openTerrainAppearance,openSoundFiles } from './release-ui.js?v=2.0.0-beta.2-hotfix.2';
import { terrainSymbol } from './terrain-appearance.js?v=2.0.0-beta.2-hotfix.2';
import { rangeFrame, rangeEdges, movementEdges,visibleCells,visionEdges } from './board-range.js?v=2.0.0-beta.2-hotfix.2';
import { applyRuleSearch } from './rules-search.js?v=2.0.0-beta.2-hotfix.2';
import { abilityGroups, abilityChoices, applicationLabel, skillDefenseText, TACTICS } from './skills.js?v=2.0.0-beta.2-hotfix.2';
import { bindBoardPaint } from './board-paint.js?v=2.0.0-beta.2-hotfix.2';
import { encounterRulesMarkup, coverDistanceMarkup, pitRescueRulesMarkup, presenceMarkup, joinMarkup } from './encounter-ui.js?v=2.0.0-beta.2-hotfix.2';
import {manualUnlimited,canManualAction,visionRange,visibleTo,playerView,publicValue,publicText,isPit,canRescue,shotObstacles} from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { protection } from './defense.js?v=2.0.0-beta.2-hotfix.2';
import { openDefense, bindDefense, defenseMarkup, defenseActions, defenseBadge } from './defense-ui.js?v=2.0.0-beta.2-hotfix.2';
import { createBoardView } from './board-view.js?v=2.0.0-beta.2-hotfix.2';
import { effectRulesMarkup } from './effect-rules-ui.js?v=2.0.0-beta.2-hotfix.2';
import { createRulesDrafts, readRuleForm, RULE_CHECKS } from './rules-draft.js?v=2.0.0-beta.2-hotfix.2';
import { helpMarkup } from './help-ui.js?v=2.0.0-beta.2-hotfix.2';
import { createCheckDrafts, checkIntent, checkMarkup, narrativeFromCheck } from './checks-ui.js?v=2.0.0-beta.2-hotfix.2';
import { createVisualEffects, visualCues } from './visual-effects.js?v=2.0.0-beta.2-hotfix.2';
import { bindBoardDrag } from './board-drag.js?v=2.0.0-beta.2-hotfix.2';
import { latestResult, compactResultFeedback } from './results.js?v=2.0.0-beta.2-hotfix.2';
import { openSkills, bindSkills, skillsMarkup, customReactionPatch } from './skills-ui.js?v=2.0.0-beta.2-hotfix.2';
import { openProfiles, profileToolbar, downloadJSON, combatFilename } from './profiles-ui.js?v=2.0.0-beta.2-hotfix.2';
import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
import { contextActions } from './context-actions.js?v=2.0.0-beta.2-hotfix.2';
import { openWeapons } from './weapons-ui.js?v=2.0.0-beta.2-hotfix.2';
import { openActions } from './actions-ui.js?v=2.0.0-beta.2-hotfix.2';
import { cleanTerrain } from './terrain.js?v=2.0.0-beta.2-hotfix.2';
import { aiOptionsMarkup, readAIOptions, bindAIOptions } from './ai-ui.js?v=2.0.0-beta.2-hotfix.2';
import { compactSettingsMarkup, applyCompact, compactPreferences } from './compact-ui.js?v=2.0.0-beta.2-hotfix.2';
import { STATS, currentActor, coordinate, columnLabel, modifier, statBonus, selectedStat, turnToken, isBlocked, parseDice, validateState, demoState, movementBudget, pathDistances, conditionText, weaponFor, isCover, clearSight, distance, blastPreview, eventText, turnOverview, initiativeText, isCombatant, canFlee, canOccupy, actionBudget, canUseResource, canSpendAction, listWeapons, heightAt, adjacentAccess, coverDestination, canUseSkill, forcedDestinations, carryPlans, carryDestinations, curableStatuses, revivalDestinations, jumpDestinations, effectiveRange, weaponStat, stanceBonus, tacticalEffect, reactionPending, healingTargets, canPay, consumption, refillAmount } from './engine.js?v=2.0.0-beta.2-hotfix.2';

import { imageFrom, backgroundGeometry } from './visuals.js?v=2.0.0-beta.2-hotfix.2';
import { prepareImage } from './media.js?v=2.0.0-beta.2-hotfix.2';
import { EFFECTS, hasEffect, effectsText } from './effects.js?v=2.0.0-beta.2-hotfix.2';
import { openSupplies, weaponExtras, readEffects, bindPeriodicFields, readStandard } from './supplies-ui.js?v=2.0.0-beta.2-hotfix.2';
import { VERSION } from './version.js?v=2.0.0-beta.2-hotfix.2';
import { statusMarkers } from './status-ui.js?v=2.0.0-beta.2-hotfix.2';
import { openMaps } from './maps-ui.js?v=2.0.0-beta.2-hotfix.2';
import { createSounds, cuesForChange } from './sounds.js?v=2.0.0-beta.2-hotfix.2';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const signed = n => Number(n) >= 0 ? `+${n}` : String(n);
const sides = { player: 'Spieler', ally: 'Verbündete', enemy: 'Gegner' };
const mark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M12 2v10" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const button = (action, label, cls = '', extra = '') => `<button type="button" class="ct-button ${cls}" data-action="${action}" ${extra}>${label}</button>`;
function field(label, name, value, type = 'text', extra = '') {
    if(['attackBonus','damageBonus','meleeBonus','rangedBonus','dc','initiative','highAttackBonus','highDefenseBonus'].includes(name)){type='text';extra+=' inputmode="decimal"';}
    return `<label class="ct-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
function select(label, name, value, options) {
    return `<label class="ct-field"><span>${label}</span><select name="${name}">${Object.entries(options).map(([key, text]) => `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}
function hpBar(a) { return `<div class="ct-hp-bar" role="meter" aria-label="HP ${esc(a.name)}" aria-valuemin="0" aria-valuemax="${a.maxHp}" aria-valuenow="${a.hp}"><span style="width:${100 * a.hp / a.maxHp}%"></span></div>`; }

const controls = { manual: 'Manuell', basic: 'Basic-KI', advanced:'Advanced AI (Alpha)', dm: 'DM-Vorschlag (experimentell)' };
const behaviors = { aggressive: 'Angreifen', support: 'Unterstützend · zuerst retten', cautious: 'Vorsichtig · Flucht bei ≤25 % HP' };
function foldMarkup(key, title, content, open = false, note = '', badge = '') {
    return '<details class="ct-fold" data-fold="' + esc(key) + '" ' + (open ? 'open' : '') + '><summary><span>' + esc(title) + '</span>' + badge + (note ? '<small>' + esc(note) + '</small>' : '') + '</summary><div class="ct-fold-body">' + content + '</div></details>';
}

export function createUI(c, { modal = false, mount = document.body } = {}) {
    const root = document.createElement(modal ? 'dialog' : 'section');
    root.className = `ct-ui ct-main ${modal ? 'ct-modal' : 'ct-standalone'}`;
    root.setAttribute('aria-label', 'Kampfsteuerung');
    mount.append(root);
    const sound = createSounds(() => c.preferences(),{onError:()=>message(tr('Sound konnte nicht abgespielt werden. Unter Eigene Sounds prüfen oder Standard wiederherstellen.','Sound could not be played. Check Custom sounds or restore the built-in cue.'),'error')});
    const camera=createBoardView(root);
    let cameraKey='';
    const boardKey=s=>c.chatKey()+':'+s.board.width+':'+s.board.height+':'+s.board.mapSeed;
    const flashes=createVisualEffects(root,()=>c.preferences());
    const unsubEvents = c.subscribeEvents((before, after, events) => { events=override?events:events.filter(e=>publicValue(after,e));const viewed=override?after:playerView(after);for (const cue of cuesForChange(before, viewed, events).filter(cue=>cue!=='turn'||!viewed.unseenTurn)) sound.play(cue);flashes.play(visualCues(before,viewed,events));
        const action=events.filter(e=>compactResultFeedback(e.details)).at(-1),feedback=compactResultFeedback(action?.details,c.preferences().language);
        abilityFeedback=feedback?{key:c.chatKey()+':'+after.revision,...feedback,result:structuredClone(action.details)}:null;if(abilityFeedback&&!busy)render(); });
    let sightCache={};
    const concealedProgress=()=>{const r=c.state().rules;return !override&&r.boardEnabled&&r.visionEnabled&&r.hideUnseenEnemies;};
    const progressText=()=>{if(concealedProgress())return c.aiRunning()?tr('KI-Züge laufen …','AI turns running …'):tr('KI-Serie bereit.','AI series ready.');const p=c.aiProgress();return c.preferences().language==='en'?p.count+' / '+p.limit+' AI turns completed':p.count+' / '+p.limit+' KI-Züge abgeschlossen';};
    const unsubReactions=c.subscribeReactions(request=>{
        const shown=text=>override?String(text??''):publicText(c.state(),text,c.preferences().language);
        const language=c.preferences().language,l=(de,en)=>language==='en'?en:de;
        if(request.stage==='narrative-result'){
            const d=dialog(shown(request.name)+' · '+l('Eigene Reaktion – Ergebnis','Custom reaction – result'),'<p class="ct-narrative-result">'+esc(shown(checkText(request.result,language)))+'</p><p>'+l('Wirkung manuell ausspielen. Fortsetzen führt den ursprünglichen Angriff einmal aus. Aufheben verbraucht den Angriffsversuch und diese Reaktion, aber würfelt keinen Treffer/Schaden. Schließen setzt den Angriff fort.','Apply the effect manually. Continue resolves the original attack once. Void spends the attack attempt and this reaction without a hit/damage roll. Closing continues the attack.')+'</p>'+select(l('Spielleiterentscheidung','GM decision'),'resolution','continue',{continue:l('Angriff fortsetzen','Continue attack'),void:l('Angriff durch Spielleiterentscheidung aufheben','Void attack by GM decision')}),f=>c.respondReaction({resolution:f.elements.resolution.value}),l('Entscheidung übernehmen','Confirm decision'),l('Angriff fortsetzen','Continue attack'));
            d.addEventListener('close',()=>{if(c.pendingReaction()===request)c.respondReaction('none');});return;
        }
        const choices=[{kind:'none'},...request.options];
        const labels=choices.map((v,i)=>[String(i),v.kind==='none'?l('Nicht reagieren','Do not react'):v.kind==='block'?l('Blocken: Schaden −','Block: damage −')+v.amount:v.kind==='narrative'?l('Eigene Reaktion: ','Custom reaction: ')+v.name+(v.mechanical?' · '+(v.timing==='before'?l('Vorher','Before'):l('Nachher','After')):'')+' · '+v.cost+(v.stock?' '+v.stock:''):v.kind==='shield'?l('Schutz: ','Shield: ')+v.name+' · '+l('Kosten ','Cost ')+v.cost+(v.stock?' '+v.stock:''):l('Konter: ','Counter: ')+v.name]);
        const preview=request.preview;
        const d=dialog(shown(request.name)+' · '+l('Reaktion','Reaction'),'<p>'+esc(shown(preview.actorName+' → '+request.name+' · '+preview.weaponName))+'</p><p>'+esc(l('Maximaler Grundschaden vor Entfernung, Deckung und Schutz: ','Maximum base damage before distance, cover and shields: ')+preview.maxDamage+' ('+preview.formula+'). '+l('Konter gegen Angreifer-DC: ','Counter against attacker DC: ')+request.dc)+'</p>'+select(l('Reaktion auswählen','Choose reaction'),'reactionChoice','0',Object.fromEntries(labels))+'<p>'+esc(l('Konter erfolgt nach dem Angriff, sofern dann noch möglich. Schließen lässt den Angriff ohne Reaktion weiterlaufen. Angriff abbrechen verbraucht nichts.','A counter follows the attack if still possible. Closing continues without a reaction. Cancel attack spends nothing.'))+'</p><div data-reaction-effect></div>'+button('cancel-incoming',l('Angriff abbrechen / KI stoppen','Cancel attack / stop AI'),'ct-danger','data-cancel-incoming'),f=>{const choice=choices[Number(f.elements.reactionChoice.value)];c.respondReaction(choice?.mechanical?{...choice,target:f.elements.reactionTarget?.value??choice.targets[0]?.id}:choice);},l('Entscheidung übernehmen','Confirm decision'),l('Ohne Reaktion fortfahren','Continue without reacting'));
        const effectPanel=()=>{const f=d.querySelector('form'),choice=choices[Number(f?.elements.reactionChoice?.value??0)],host=d.querySelector('[data-reaction-effect]');if(!host)return;host.innerHTML=choice?.mechanical?'<p>'+esc(shown(choice.summary[language]))+'</p>'+select(l('Wirkungsziel (nur diese Reaktion)','Effect recipient (this reaction only)'),'reactionTarget',choice.targets[0]?.id,Object.fromEntries(choice.targets.map(v=>[v.id,shown(v.name)])))+'<p class="ct-muted">'+l('Abwehrbasis bezieht sich auf den Angreifer. Ein Einsatz, eine Probe und einmal Kosten. Nachher nur bei weiterhin handlungsfähiger Figur. Kein automatisches Blocken durch Gegenschaden.','Defense refers to the attacker. One use, one check and one cost. After requires the participant to remain capable. Counter-damage does not automatically block the attack.')+'</p>':'';};
        d.querySelector('form')?.addEventListener('change',e=>{if(e.target.name==='reactionChoice')effectPanel();});effectPanel();
        d.querySelector('[data-cancel-incoming]')?.addEventListener('click',()=>{c.stopAI();c.cancelReactions();d.close();});
        d.addEventListener('close',()=>{if(c.pendingReaction()===request)c.respondReaction('none');});
    });
    const unsubProgress=c.subscribeProgress(()=>{const node=root.querySelector('[data-ai-progress]');if(node)node.textContent=progressText();});
    let feedbackRevision=-1,noticeStateKey='';
    const tr=(de,en)=>c.preferences().language==='en'?en:de;
    let narrativeTurn='';
    let tab = 'board', selected = '', target = '', stat = 'auto', override = false, blockMode = false, zoom = 44;
    let showHiddenParticipants=false;
    const participantManagement=()=>tab==='actors'&&showHiddenParticipants;
    let terrainToolsOpen=false;
    let lastUIAction = '', dragging = false, boardDrag = null, boardPaint = null;
    let boardNotice = '', boardNoticeKind = 'info', abilityFeedback = null;
    let busy = false, notice = '', noticeKind = 'info', localPending = null, actionDraft = '';
    let healCenterMode='actor',healX=1,healY=1;
    let editor = null, resource = '', resourceTarget = '', treatmentActor = '', otherKind = 'describe';
    const folds = new Map(), groupDrafts = {};
    const ruleEdits = createRulesDrafts();
    const ruleSearches=new Map();
    const checkDrafts=createCheckDrafts();
    let helpDialog=null;
    function openInlineHelp(section) {
        helpDialog?.close();
        const wanted=section==='defense'?['reactions','shields']:[section];
        const d=document.createElement('dialog');d.className='ct-ui ct-editor ct-help-dialog';
        d.innerHTML='<header class="ct-section-heading"><h2>'+esc(c.preferences().language==='en'?'Help':'Hilfe')+'</h2><button type="button" class="ct-button" data-help-close>'+esc(c.preferences().language==='en'?'Close help':'Hilfe schließen')+'</button></header>'+helpMarkup(c.preferences().language,(key,title,body)=>wanted.includes(key.slice(5))?'<section class="ct-card"><h3>'+esc(title)+'</h3>'+body+'</section>':'',c.state());
        document.body.append(d);helpDialog=d;
        d.querySelector('[data-help-close]')?.addEventListener('click',()=>d.close());
        d.addEventListener('close',()=>{d.remove();if(helpDialog===d)helpDialog=null;});
        d.showModal();
    }
    function rulesDraftNotice() {
        return ruleEdits.dirty(c.chatKey()) ? `<aside class="ct-rules-draft" role="status"><p><strong>Ungespeicherte Regeländerungen</strong><br>Der Entwurf bleibt in diesem Chat erhalten. Bis zum Speichern gelten die bisherigen Regeln.</p><div class="ct-controls">${button('save-rules','Regeln speichern','ct-primary')}${button('discard-rules','Entwurf verwerfen')}</div></aside>` : '';
    }
    function stageRuleInput(input) {
        if (!input.closest?.('#ct-rules-form')) return false;
        const staged = ruleEdits.stage(c.chatKey(),c.state().rules,input.name,RULE_CHECKS.includes(input.name) ? input.checked : input.value);
        if (staged) { const host = root.querySelector('[data-rules-draft]'); if (host) host.innerHTML = rulesDraftNotice(); }
        return staged;
    }
    const fold = (key, title, content, open = false, note = '', badge = '') => foldMarkup(key, title, content, folds.get(key) ?? open, note, badge);
    let skillId = '', skillTarget = '', skillWeapon = '', skillDestination = '', skillDestinationKey = '', skillCarryCell = '', skillCarrierCell = '', carryPick = null, freeRemark = false;
    let weaponId = '', coverFacing = '', ladderStart = null;
    let mode = 'melee', variant = 'profile', modeActor = '';
    let damageDraft = '', damageProfile = '', areaDraft = 0, areaProfile = 0, terrainType = 'wall', rescueTarget = '', helper = '', reviveHelper = '';
    const pending = () => localPending ?? c.pendingAction();
    function showPaintResult(result){boardNotice=tr('Gelände geändert: ','Terrain updated: ')+result.count+tr(' Felder.',' cells.')+(result.skipped?' '+result.skipped+tr(' Figurenfelder ausgelassen.',' occupied cells skipped.'):'');boardNoticeKind='info';}
    function message(text, kind = 'info') { notice = !override&&!participantManagement()&&!publicValue(c.state(),String(text))?tr('Aktion nicht möglich. Ziel und Sichtweite prüfen.','Action unavailable. Check target and vision.'):String(text); noticeKind = kind; render(); }
    function openDeployment(id,position){const s=c.state(),a=s.actors.find(v=>v.id===id);dialog(a.name+' · '+tr('Einsetzen','Deploy'),joinMarkup(s,a,c.preferences().language),async f=>{await c.deploy(id,position,{initiativeMode:f.elements.initiativeMode?.value??'profile',initiative:f.elements.initiative?.value,timing:f.elements.joinTiming.value});},tr('Einsetzen','Deploy'));}
    async function moveOnBoard(id, position, correction = override) {
        const before=c.state(),a=before.actors.find(v=>v.id===id);if(position&&placementBlock(a))throw Error(a.name+': '+placementBlock(a));if(position&&!a.position&&['active','paused'].includes(before.phase)){openDeployment(id,position);return;}
        boardNotice = ''; boardNoticeKind = 'info';
        try { await c.move(id, position, correction); boardNotice = 'Figur verschoben: ' + (c.state().actors.find(a => a.id === id)?.name ?? '') + ' → ' + coordinate(position); }
        catch(error) { boardNotice = a.name+': '+error.message; boardNoticeKind = 'error'; throw error; }
    }
    async function run(fn, success = '') {
        if (busy || c.modelBusy()) return;
        busy = true; abilityFeedback=null; notice = ''; noticeKind = 'info'; boardNotice='';boardNoticeKind='info';render();
        try { await fn(); if (success) { notice = success; noticeKind = 'info'; } }
        catch (error) { c.debugRecord('error',{operation:lastUIAction,message:error.message,stack:error.stack});if(tab==='board'){notice='';if(!boardNotice||boardNoticeKind!=='error'){boardNotice=error.message;boardNoticeKind='error';}}else{notice=error.message;noticeKind='error';} }
        finally { busy = false; render(); }
    }
    const viewController=()=>({...c,state:()=>playerView(c.state(),override||participantManagement()),importProfiles:async(...args)=>{
        const result=await c.importProfiles(...args),profile=args[0];
        if(profile.kind==='combat-actors'){
            const count=profile.actors.length;
            let text=tr('Import erfolgreich: ','Import successful: ')+count+tr(' neue Figuren hinzugefügt; noch nicht platziert.',' new participants added; not yet placed.');
            if(profile.actors.some(a=>a.side==='enemy')&&c.state().rules.visionEnabled&&c.state().rules.hideUnseenEnemies&&c.state().rules.boardEnabled)text+=' '+tr('Unter Figuren „Ausgeblendete Gegner anzeigen“ wählen. Zum Aufstellen auf dem Board „Spielleitung: Positionen korrigieren“ einschalten.','Under Participants, select “Show hidden enemies”. To deploy on the Board, enable “GM: correct positions”.');
            message(text);
        }else message(tr('Import erfolgreich: Profil auf die ausgewählten Figuren angewendet.','Import successful: profile applied to the selected participants.'));
        return result;
    }});
    function render() {
        const windowScroll=modal&&Number.isFinite(root.scrollTop)?root.scrollTop:null;
        if(carryPick){const ctx=carryingContext();if(carryPick.chat!==c.chatKey()||carryPick.revision!==c.state().revision||ctx?.kind!==carryPick.kind||ctx?.a.id!==carryPick.a.id||ctx?.b.id!==carryPick.b.id||ctx?.skill.id!==carryPick.skill.id){carryPick=null;boardNotice='';}}

        boardPaint?.cancel();root.classList?.toggle('ct-paint-mode',blockMode&&terrainType!=='ladder');
        camera.capture(cameraKey,zoom);
        for (const d of root.querySelectorAll('details[data-fold]')) if(d.dataset.searchOpen===undefined)folds.set(d.dataset.fold, d.open);
        const s = playerView(c.state(),override), a = currentActor(s), active = s.phase === 'active',combatOpen=['active','paused'].includes(s.phase);
        if(!override&&!participantManagement()){if(boardNotice&&!publicValue(c.state(),boardNotice))boardNotice='';if(notice&&!publicValue(c.state(),notice))notice='';}
        const nextNoticeKey=c.chatKey()+':'+s.revision;if(noticeStateKey&&noticeStateKey!==nextNoticeKey){boardNotice='';boardNoticeKind='info';if(noticeKind==='error')notice='';}noticeStateKey=nextNoticeKey;if(abilityFeedback?.key!==nextNoticeKey||abilityFeedback&&!override&&!publicValue(c.state(),abilityFeedback.result))abilityFeedback=null;
        const currentNarrative=c.chatKey()+':'+turnToken(s);if(narrativeTurn!==currentNarrative){narrativeTurn=currentNarrative;actionDraft='';}
        if(s.revision!==feedbackRevision && ['undo','import','reset'].includes(s.log.at(-1)?.type))flashes.clear();feedbackRevision=s.revision;
        if (a?.id !== modeActor) {freeRemark=false; weaponId = a?.preferredWeapon ?? ''; variant = 'profile'; mode = a?.attackMode ?? 'melee'; modeActor = a?.id ?? ''; damageDraft = a ? weaponFor(a)?.damage ?? '' : ''; damageProfile = damageDraft; areaDraft = a ? weaponFor(a)?.radius ?? 0 : 0; areaProfile = areaDraft; }
        if (a && !listWeapons(a).some(w => w.id === weaponId)) weaponId = a.preferredWeapon ?? listWeapons(a)[0]?.id ?? '';
        if (a) mode = listWeapons(a).find(w => w.id === weaponId)?.mode ?? a.attackMode;
        const profile = a ? weaponFor(a, mode, 'profile', weaponId) : null;
        if (variant === 'standard' && !profile?.standard) variant = 'profile';
        if (variant === 'profile' && s.rules.resourcesEnabled && profile?.resource && !canPay(s,a,profile) && profile.standard) variant = 'standard';
        const weapon = a ? weaponFor(a, mode, variant, weaponId) : null;
        if (weapon?.damage !== damageProfile) { if (damageDraft === damageProfile) damageDraft = weapon?.damage ?? ''; damageProfile = weapon?.damage ?? ''; }
        if ((weapon?.radius ?? 0) !== areaProfile) { if (Number(areaDraft) === areaProfile) areaDraft = weapon?.radius ?? 0; areaProfile = weapon?.radius ?? 0; }
        if (!s.actors.some(v => v.id === selected)) selected = a?.id ?? s.actors[0]?.id ?? '';
        const enemies = s.actors.filter(v => a && isCombatant(v) && visibleTo(s,a,v) && (v.side === 'enemy') !== (a.side === 'enemy'));
        if (!s.actors.some(v => v.id === target)) target = enemies[0]?.id ?? '';
        const draft=pending(),p=override||!draft||publicValue(c.state(),draft)?draft:null;
        root.innerHTML = `<header class="ct-header"><div class="ct-brand"><span class="ct-mark">${mark}</span><div><div class="ct-eyebrow">SILLYTAVERN · COMBAT · ${VERSION}</div><h1>Kampfsteuerung</h1></div></div><div class="ct-header-right"><span class="ct-status"><i></i>${s.phase==='paused'?tr('Wartet auf Figuren','Waiting for participants'):active ? 'Kampf läuft' : s.phase === 'ended' ? 'Kampf beendet' : 'Vorbereitung'}</span>${modal ? button('close', '×', 'ct-icon', 'aria-label="Kampfsteuerung schließen"') : ''}</div></header>
        <div class="ct-toolbar"><div><span class="ct-round">RUNDE <strong>${s.round}</strong></span><span class="ct-muted">${s.actors.filter(isCombatant).length} kampffähig · ${s.board.width}×${s.board.height} Felder</span></div><div class="ct-controls">${combatOpen ? button('stop', 'Kampf stoppen') : button('start', 'Kampf starten', 'ct-primary')}${button('undo', '↶ Rückgängig', '', !c.historyLength() ? 'disabled' : '')}${button('diagnostics', 'KI-Kontext prüfen')}${button('combat-name','Kampfname')}${button('export', 'Export')}${button('import', 'Import')}${button('profiles', 'Profile übertragen')}${button('debug', 'Debug-Protokoll')}${button('reset', 'Zurücksetzen')}${c.requestBusy() ? button('cancel-request', 'KI-Anfrage abbrechen', 'ct-danger') : ''}</div></div>
        <nav class="ct-tabs" aria-label="Kampfbereiche">${[['board', 'Spielfeld'], ['actors', `Figuren (${participantManagement()?c.state().actors.length:s.actors.length})`], ['library', 'Companions'], ['rules', 'Regeln'], ['log', 'Protokoll'], ['settings', 'Oberfläche'],['help','Hilfe']].map(([key, label]) => button(`tab-${key}`, esc(label), tab === key ? 'ct-tab-active' : '', `aria-current="${tab === key ? 'page' : 'false'}"`)).join('')}</nav>
        ${notice ? `<div class="ct-notice ${noticeKind === 'error' ? 'ct-error' : noticeKind === 'failure' ? 'ct-failure' : ''}" role="status">${esc(notice)}${noticeKind==='error'?button('debug','Fehlerprotokoll öffnen'):''}${button('dismiss', '×', 'ct-icon', 'aria-label="Hinweis schließen"')}</div>` : ''}
        <div data-rules-draft>${rulesDraftNotice()}</div>
        ${s.rules.boardEnabled && s.actors.some(v => isCombatant(v) && !v.position) ? `<div class="ct-placement-hint" role="status"><strong>Noch zu platzieren:</strong> ${s.actors.filter(v => isCombatant(v) && !v.position).map(v => esc(v.name)).join(', ')}. Wähle unten die Figur und klicke ein freies Feld an.${active ? ' Neue Figuren lassen sich auch während des Kampfes erstmalig platzieren.' : ' Danach kannst du den Kampf starten.'}</div>` : ''}
        ${lastResultView(s)}
        ${p ? `<section class="ct-intervention" aria-label="Spielereingriff erforderlich"><div><strong>Spielereingriff erforderlich</strong><p>${esc(p.reason)}</p><small>HP und Zug bleiben unverändert. Position, Profil oder Aktion korrigieren, dann erneut auswerten.</small></div><div class="ct-controls">${button('retry', 'Erneut auswerten', 'ct-primary')}${button('edit-pending', 'Aktion bearbeiten')}${button('discard-pending', 'Verwerfen')}</div></section>` : ''}
        ${initiativeView(s, active)}
        <div class="ct-content">${tab === 'board' ? boardView(s, a) : tab === 'actors' ? actorsView(showHiddenParticipants?c.state():s) : tab === 'library' ? libraryView() : tab === 'rules' ? rulesView(s) : tab === 'settings' ? preferencesView() : tab === 'help' ? helpMarkup(c.preferences().language,fold,s) : logView(s)}</div>
        <footer class="ct-footer"><span><i class="ct-dot ct-ally"></i>${esc(c.connection().label)}</span><span>Die Würfel entscheiden. Die KI erzählt.</span></footer>`;
        applyCompact(root,c.preferences());
        cameraKey=boardKey(s);camera.restore(cameraKey,zoom);
        if(windowScroll!==null)root.scrollTop=windowScroll;
        if(abilityFeedback&&c.preferences().debugEnabled){const node=root.querySelector('.ct-ability-feedback'),board=root.querySelector('.ct-board-scroll'),result=root.querySelector('.ct-last-result');if(node?.getBoundingClientRect){const css=globalThis.getComputedStyle?.(node);c.debugRecord('ui-feedback',{version:VERSION,modal,parent:node.parentElement?.className,inBoard:Boolean(node.closest('.ct-board-section')),noticeTop:node.getBoundingClientRect().top,boardBottom:board?.getBoundingClientRect?.().bottom,resultTop:result?.getBoundingClientRect?.().top,position:css?.position,order:css?.order,display:css?.display,scrollTop:root.scrollTop});}}
        flashes.refresh();
        if(tab==='rules')applyRuleSearch(root,ruleSearches.get(c.chatKey())??'',c.preferences().language);
        if (busy || c.aiRunning() || c.modelBusy()) for (const b of root.querySelectorAll('button, input, select')) if (!['close', 'stop-ai', 'cancel-request', 'debug', 'debug-export', 'debug-clear', 'diagnostics'].includes(b.dataset.action)) b.disabled = true;
    }

    function exportDebug(){const url=URL.createObjectURL(new Blob([c.debugText()],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Combat-Debug-'+VERSION+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
    function openActorContext(id){
        if(dragging)return;const s=c.state(),b=s.actors.find(v=>v.id===id);if(!b)return;
        const list=contextActions(s,id,c.preferences().language), l=(de,en)=>c.preferences().language==='en'?en:de;
        let group='';const editButton=button('edit',tr('Bearbeiten','Edit'),'', 'data-context-manage="edit" data-id="'+esc(id)+'"');const content='<p>'+esc(l('Aktionen der aktiven Figur. Auswahl bereitet die Aktion vor; danach separat ausführen.','Actions of the current actor. Selection prepares an action; resolve it separately.'))+'</p><button type="button" class="ct-button ct-primary" data-context-target>'+esc(l('Figur als Ziel übernehmen','Use participant as target'))+'</button>'+list.map((v,i)=>{const heading=v.group===group?'':'<h3>'+esc(v.group)+'</h3>';group=v.group;return heading+'<div class="ct-context-entry"><button type="button" class="ct-button" data-context-entry="'+i+'" '+(v.reason?'disabled':'')+'>'+esc(v.label)+'</button>'+(v.reason?'<small>'+esc(v.reason)+'</small>':'')+'</div>';}).join('')+'<h3>'+tr('Figur verwalten','Manage participant')+'</h3>'+editButton+(b.hanging?'':button(b.position?'reserve-actor':'place-actor',b.position?tr('Vom Spielfeld nehmen','Remove from board'):tr('Wieder einsetzen / platzieren','Deploy / place'),'', 'data-context-manage="'+(b.position?'reserve':'place')+'" data-id="'+esc(id)+'"'))+button('remove',tr('Aus Szenario löschen','Delete from encounter'),'ct-danger','data-context-manage="delete" data-id="'+esc(id)+'"')+(b.hidden?button('reveal',tr('Verstecken beenden','Reveal participant'),'', 'data-context-manage="reveal" data-id="'+esc(id)+'"'):'')+profileToolbar('actor',id,c.preferences().language);
        const d=dialog(b.name+' · '+l('Aktionen','Actions'),content,()=>{},l('Schließen','Close'));
        d.querySelector('form').addEventListener('click',async event=>{
            const manage=event.target.closest('[data-context-manage]');if(manage){d.close();if(manage.dataset.contextManage==='edit'){editActor(id);return;}if(manage.dataset.contextManage==='place'){selected=id;tab='board';notice=tr('Freies Zielfeld anklicken oder Figur aufs Brett ziehen.','Click a free destination or drag the participant onto the board.');render();}else await run(()=>manage.dataset.contextManage==='delete'?c.remove(id):manage.dataset.contextManage==='reveal'?c.reveal(id):c.reserve(id));return;}
            if(event.target.closest('[data-context-target]')){target=id;skillTarget=id;resourceTarget=id;rescueTarget=id;d.close();render();return;}
            const button=event.target.closest('[data-context-entry]');if(!button||button.disabled)return;
            const v=list[Number(button.dataset.contextEntry)];target=v.target;skillTarget=v.target;resourceTarget=v.target;rescueTarget=v.target;otherKind=v.kind;
            if(v.kind==='attack'){weaponId=v.weapon;variant=v.variant;mode=v.mode;const w=weaponFor(currentActor(c.state()),mode,variant,weaponId);damageDraft=w.damage;damageProfile=w.damage;areaDraft=w.radius;areaProfile=w.radius;folds.set(`manual-${currentActor(c.state()).id}-${currentActor(c.state()).control}`,true);}
            if(['shield','reserve'].includes(v.kind)){otherKind='describe';d.close();render();root.querySelector('.ct-action-card')?.scrollIntoView?.({block:'nearest'});return;}
            if(v.kind==='skill')skillId=v.skill;if(v.kind==='heal'||v.kind==='refill')resource=v.resource;
            if(v.kind==='check'){otherKind='check';checkDrafts.get(c.chatKey(),currentActor(s).id).target=v.target;}
            if(v.kind==='remark'){otherKind='describe';freeRemark=true;}if(['flee','stabilize','cover','describe'].includes(v.kind))otherKind=v.kind;
            d.close();render();root.querySelector(v.kind==='attack'?'#ct-action-form':'#ct-other-form')?.scrollIntoView?.({block:'nearest'});
        });
    }

    function initiativeView(s, active) {
        const overview = turnOverview(s);
        const chips = s.order.length ? s.order.map((id, i) => {
            const v = s.actors.find(a => a.id === id), now = active && i === s.turn, next = active && !now && id === overview.next?.id;
            return `<button type="button" data-action="select" data-id="${esc(id)}" class="ct-turn-chip ${now ? 'ct-current' : next ? 'ct-next' : ''} ${v.hp === 0 ? 'ct-down' : v.escaped ? 'ct-escaped' : ''}" ${now ? 'aria-current="step"' : ''}><span class="ct-dot ct-${v.side}"></span><b>${esc(v.name)}</b><small>${v.initiative}</small>${v.escaped ? '<span class="ct-next-label">GEFLOHEN</span>' : now ? '<span class="ct-now">AM ZUG</span>' : next ? `<span class="ct-next-label">DANACH${overview.next.round !== s.round ? ` · ${overview.next.round}` : ''}</span>` : ''}</button>`;
        }).join('') : '<span class="ct-muted">Initiative beim Start festlegen · danach bleibt die Reihenfolge gleich.</span>';
        return `<section class="ct-initiative" aria-label="Feste Initiative"><div class="ct-initiative-heading"><span class="ct-eyebrow">INITIATIVE</span>${active ? `<p aria-live="polite">${esc(s.unseenTurn?tr('Unentdeckte Figur am Zug.','Unseen participant taking a turn.'):initiativeText(overview, c.preferences().language))}</p>` : ''}</div><div class="ct-turn-track">${chips}</div></section>`;
    }
    function lastResultView(s) {
        const selectedResult=latestResult(s.log),e=selectedResult.event,latest=selectedResult.turn ?? e;
        if (!e) return '';
        const r = e.details;
        const failed = e.type === 'miss' || (['skill','check'].includes(e.type) && r?.success === false);
        const title = r?.interrupted?tr('Angriff unterbrochen','Attack interrupted'):r?.voided?tr('Angriff aufgehoben','Attack voided'):e.type==='rescue'?tr('Figur hochgezogen','Participant pulled up'):e.type==='check'?(r.success?'Eigene Probe erfolgreich':'Eigene Probe fehlgeschlagen'):r?.refill?'Vorrat aufgefüllt':e.type==='shield'?'Schutz aktiviert':e.type==='reserve'?'Reaktion reserviert':e.type === 'skill' ? (r.success ? 'Fähigkeit erfolgreich' : 'Fähigkeit fehlgeschlagen') : e.type === 'remark' ? 'Kostenlose Handlung' : e.type==='restore'?tr('Figuren wiederhergestellt','Participants restored'):e.type === 'reset' ? 'Zurückgesetzt' : e.type === 'use' ? 'Behandlung' : e.type === 'effect' ? 'Statuseffekt' : e.type === 'turn' ? 'Zug beendet' : e.type === 'end' ? 'Kampf beendet' : e.type === 'flee' ? 'Figur geflohen' : e.type === 'stabilize' ? 'Figur gerettet' : ['condition', 'time'].includes(e.type) ? 'Rettungsfrist' : e.type === 'undo' ? 'Änderung zurückgenommen' : e.type === 'other' ? 'Aktion abgeschlossen' : r?.critical ? 'Kritischer Treffer' : e.type === 'hit' ? 'Treffer' : 'Fehlschlag';
        const fullText = eventText(e, c.preferences().language);
        const summary = r?.type === 'attack' ? `${r.actorName} → ${r.targetName} · ${r.mode === 'ranged' ? 'Fernkampf' : 'Nahkampf'}${r.weaponName && !['Melee','Ranged','melee','ranged'].includes(r.weaponName) ? ' · ' + r.weaponName : ''}${r.cover ? ' · Deckung' : ''}` : fullText.split('\n')[r?.movement ? 1 : 0];
        const movement = r?.movement ? `<p class="ct-result-movement">${esc(r.actorName)} · ${esc(r.movement.from)} → ${esc(r.movement.to)}</p>` : '';
        const area = r?.type==='attack' && r?.radius > 0 ? `<p class="ct-muted">Flächenschaden: ${r.affected.filter(v => v.damage > 0).map(v => `${esc(v.name)} −${v.damage} HP`).join(' · ') || '0 Schaden'}</p>` : '';
        const friendlyDamage=r?.type==='attack'&&r.radius>0?r.affected.filter(v=>v.damage>0&&(v.friendly??((s.actors.find(b=>b.id===v.id)?.side==='enemy')===(s.actors.find(b=>b.id===r.actor)?.side==='enemy')))):[];
        const friendlyResult=friendlyDamage.length?'<p class="ct-warning ct-friendly-warning">Friendly Fire: '+friendlyDamage.map(v=>esc(v.name)+' −'+v.damage+' HP').join(' · ')+'</p>':'';
        const lastAttack = e.type === 'end' ? s.log.filter(v => ['hit', 'miss'].includes(v.type)).at(-1) : null;
        return `<section class="ct-last-result ct-result-${esc(e.type)}${failed ? ' ct-result-failure' : ''}" aria-label="Letztes Kampfergebnis" aria-live="polite"><div class="ct-result-body"><span class="ct-eyebrow">LETZTES ERGEBNIS · ${esc(new Date(e.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))}</span><h2>${title}${r?.type === 'attack'&&!r.voided ? ` <span>${esc(r.damage)} Schaden · ${esc(r.finalHp??r.afterHp)}/${esc(r.maxHp)} HP</span>` : ''}</h2>${movement}<p>${esc(summary)}</p>${latest?.type==='turn'&&latest!==e?'<p class="ct-result-turn">'+esc(eventText(latest,c.preferences().language))+'</p>':''}${area}${friendlyResult}${selectedResult.following.length?'<p class="ct-muted">'+selectedResult.following.map(v=>esc(eventText(v,c.preferences().language))).join('<br>')+'</p>':''}${fold('result-details', 'Würfe und Details', `${lastAttack ? `<p>${esc(eventText(lastAttack, c.preferences().language))}</p>` : ''}<p>${esc(fullText)}</p>`)}</div><div class="ct-controls">${button('narrate', 'KI erzählt')}${button('post', 'Im Chat anzeigen')}</div></section>`;
    }

    function actorImage(a) {
        try { const image = c.image(a.portrait) ?? a.portraitImage; return image ? imageFrom(image) : null; } catch { return null; }
    }
    function avatar(a, cls = 'ct-avatar') {
        const image = actorImage(a);
        return '<span class="' + cls + ' ct-' + a.side + '">' + (image ? '<img src="' + esc(image.src) + '" alt="" draggable="false" decoding="async">' : esc(a.name.slice(0, 2).toUpperCase())) + '</span>';
    }
    function mapSurface(s, cells, size, background = s.board.background, image = c.image(background?.asset)) {
        const visible = background?.enabled && image;
        const width = s.board.width * size + (s.board.width - 1) * 2, height = s.board.height * size + (s.board.height - 1) * 2;
        const geometry = visible ? backgroundGeometry(background, image, width, height) : null;
        const picture = visible ? '<img class="ct-map-image" src="' + esc(image.src) + '" alt="" draggable="false" style="width:' + geometry.width + 'px;height:' + geometry.height + 'px;left:' + geometry.left + 'px;top:' + geometry.top + 'px;opacity:' + background.opacity / 100 + '">' : '';
        const appearance=s.board.appearance??{},textureStyle=Object.entries(appearance.assets??{}).map(([type,id])=>{const image=c.image(id);return image?'--ct-texture-'+type+':url('+image.src+');':'';}).join('');
        return '<div class="ct-board-surface ct-texture-style-'+(appearance.style??'natural')+' ' + (visible ? 'ct-with-background' : '') + '" style="'+textureStyle+'--ct-grid-alpha:' + (background?.gridOpacity ?? 25) / 100 + ';--ct-columns:' + s.board.width + ';--ct-cell-size:' + size + 'px">' + picture + '<div class="ct-grid">' + cells.join('') + '</div></div>';
    }
    function fittedZoom(s) {
        const area = root.querySelector('.ct-board-scroll');
        const width = Math.max(180, (area?.clientWidth || 560) - 38);
        const height = Math.max(180, Math.min(620, (globalThis.innerHeight || 900) * 0.55) - 38);
        return Math.max(2, Math.min(96, Math.floor(Math.min((width - (s.board.width - 1) * 2) / s.board.width, (height - (s.board.height - 1) * 2) / s.board.height))));
    }
    function boardView(s, active) {
        // Prepare action selections before drawing their target preview on the board.
        const actionsMarkup=freeDiceView(s)+actionView(s,active);
        const view = c.view(); zoom = view.fit ? fittedZoom(s) : view.zoom;
        const labelStep = Math.max(1, Math.ceil(18 / zoom));
        const actor = s.actors.find(a => a.id === selected);
        const transport=carryBoardContext(),helperPick=transport&&carryPick?.endpoint==='carrier';
        const carriedCell=transport&&coordinateInput(transport.raw);
        const transportRoutes=transport?(helperPick?(carriedCell?carryPlans(s,transport.a,transport.b,transport.a.position,carriedCell):[]):carryDestinations(s,transport.a,transport.b)):[];
        const available = transport ? new Map(transportRoutes.map(p=>{const cell=helperPick?p.carrier:p;return [cell.x+','+cell.y,p.cost];}))
            : !override && !blockMode && s.phase === 'active' && actor?.id === active?.id && actor.position
            ? pathDistances(s, actor.position, actor.id, movementBudget(s, actor).remaining) : new Map();
        const cellMap = new Map(s.actors.filter(a => a.position).map(a => [`${a.position.x},${a.position.y}`, a]));
        for(const h of s.actors.filter(v=>v.hanging&&!v.reserve))cellMap.set(h.hanging.anchor.x+','+h.hanging.anchor.y,h);
        const healActor=s.phase==='active'?active:s.actors.find(a=>a.id===treatmentActor),healItem=healActor?.resources.find(v=>v.id===resource),healCenter=healCenterMode==='cell'?{x:healX-1,y:healY-1}:s.actors.find(v=>v.id===resourceTarget)?.position;
        const healing=new Set(otherKind==='heal'&&healItem?.radius?healingTargets(s,healActor,healItem,healCenter).map(v=>v.actor.id):[]);
        const rangeWeapon=active?weaponFor(active,mode,variant,weaponId):null;
        const reach=s.phase==='active'&&!blockMode&&!transport&&s.rules.boardEnabled&&active?.position&&rangeWeapon?.mode==='ranged'?effectiveRange(s,active,rangeWeapon):null;
        const frame=reach===null?null:rangeFrame(s.board,active.position,reach);
        const observer=actor?.position?actor:active?.position?active:null,showSight=s.rules.boardEnabled&&s.rules.visionEnabled&&c.preferences().showVision&&observer;
        const sightKey=c.chatKey()+':'+s.revision+':'+observer?.id+':'+Boolean(showSight);
        if(sightCache.key!==sightKey)sightCache={key:sightKey,cells:showSight?visibleCells(s.board,observer.position,visionRange(s,observer),(p,q)=>clearSight(s,p,q)):new Set()};
        const sight=sightCache.cells;
        const movementCells=new Set(s.rules.boardEnabled?[...available.keys()].filter(key=>{if(transport)return true;const [x,y]=key.split(',').map(Number),occupant=cellMap.get(key);return canOccupy(s,{x,y})&&(!occupant||occupant.id===actor?.id);}):[]);
        const cells = [];
        const area = Number(areaDraft), center = s.actors.find(v => v.id === target)?.position;
        const showArea = !transport && otherKind!=='heal' && s.phase === 'active' && area > 0 && area <= 10 && center;
        for (let y = 0; y < s.board.height; y++) for (let x = 0; x < s.board.width; x++) {
            const a = cellMap.get(`${x},${y}`), blocked = isBlocked(s, { x, y }), cover = isCover(s, { x, y });
            const pos = coordinate({ x, y });
            const cost = available.get(`${x},${y}`);
            const edges=rangeEdges(frame,x,y),moveEdges=movementEdges(movementCells,x,y),sightEdges=visionEdges(sight,x,y),textureType=blocked?'wall':cover?'cover':isPit(s,{x,y})?'pit':heightAt(s,{x,y})?'height':'ground';
            cells.push(`<button type="button" class="ct-cell ${heightAt(s, {x,y}) ? 'ct-elevated' : ''} ${(x + y) % 2 ? 'ct-cell-dark' : ''} ${isPit(s,{x,y})?'ct-pit':''} ${blocked ? 'ct-blocked' : ''} ${cover ? 'ct-cover' : ''} ${showArea && distance(center, { x, y }) <= area && clearSight(s, center, { x, y }) ? 'ct-blast' : ''} ${(!a || transport) && cost !== undefined && canOccupy(s, { x, y }) ? 'ct-reachable' : ''} ${a&&healing.has(a.id)?'ct-heal-recipient':''} ${a?.id === selected ? 'ct-cell-selected' : ''} ${a?.id === active?.id && s.phase === 'active' ? 'ct-cell-current' : ''}" data-action="cell" data-x="${x}" data-y="${y}" ${a ? `data-id="${esc(a.id)}" draggable="${!blockMode&&!a.hanging}"` : ''} aria-label="${pos}${isPit(s,{x,y})?', Abgrund':''}${cover ? ', Deckung' : ''}${blocked ? ', gesperrt' : cover && !s.rules.coverWalkable ? (s.rules.coverCrossable ? ', nur übersteigen' : ', nicht betretbar') : a ? `, ${esc(a.name)}, ${a.hp} HP` : ', frei'}, Höhe ${heightAt(s,{x,y})}" title="${pos} · Höhe ${heightAt(s,{x,y})}${cover ? ` · Deckung${s.rules.coverWalkable ? '' : s.rules.coverCrossable ? ' · '+tr('übersteigen (','cross (')+((active?.acrobaticsTurn===s.turnSerial&&s.rules.skillsEnabled)?1:2)+tr(') · kein Halt',') · no stopping') : ' · nicht betretbar'}` : ''}${a ? ` · ${esc(a.name)} · ${a.hp}/${a.maxHp} HP${a.effects.length ? ' · ' + esc(effectsText(a, c.preferences().language)) : ''}` : blocked ? ' · gesperrt' : cost !== undefined && canOccupy(s, { x, y }) ? ` · ${cost} Bewegung` : ''}">${s.board.appearance?.textures?'<span class="ct-terrain-texture ct-texture-'+textureType+'" aria-hidden="true"></span>':''}${sightEdges?'<span class="ct-vision-edge '+sightEdges+'" aria-hidden="true"></span>':''}${moveEdges?'<span class="ct-move-edge '+moveEdges+'" aria-hidden="true"></span>':''}${edges?'<span class="ct-range-edge '+edges+'" aria-hidden="true"></span>':''}${isPit(s,{x,y})?'<span class="ct-pit-mark" aria-hidden="true">▽</span>':''}${heightAt(s,{x,y}) ? '<span class="ct-height-mark" title="Höhe 1">1↑</span>' : ''}${(s.board.ladders ?? []).some(v => [v.from,v.to].some(p => p.x === x && p.y === y)) ? '<span class="ct-ladder-mark" title="Leiter"><svg viewBox="0 0 16 20" aria-hidden="true"><path d="M3 1v18M13 1v18M3 5h10M3 10h10M3 15h10" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>' : ''}${(s.board.coverFaces ?? []).find(p => p.x === x && p.y === y) ? '<span class="ct-face-mark">' + ({ north:'↑', east:'→', south:'↓', west:'←' })[(s.board.coverFaces ?? []).find(p => p.x === x && p.y === y).facing] + '</span>' : ''}${a ? `<span class="ct-token ct-${a.side} ${a.hp === 0 ? 'ct-down' : ''} ${a.condition==='dead'?'ct-token-dead':''}">${actorImage(a) ? `<img src="${esc(actorImage(a).src)}" alt="" draggable="false" decoding="async">` : esc(a.name.slice(0, 2).toUpperCase())}</span>${statusMarkers(s, a, c.preferences().language, true)}<span class="ct-cell-hp">${a.hp}</span>` : blocked ? `<span class="ct-obstacle">${terrainSymbol(s.board.appearance,'wall',s.board.preset)}</span>` : cover ? '<span class="ct-cover-mark">'+terrainSymbol(s.board.appearance,'cover',s.board.preset)+'</span>' : ''}</button>`);
        }
        return `<div class="ct-board-layout"><section class="ct-board-section ct-map-${s.board.preset ?? 'custom'}"><div class="ct-section-heading"><div><h2>Spielfeld</h2><p>${transport ? esc(helperPick?tr('Markierte Helfer-Endfelder anklicken. Auswahl bewegt noch keine Figur.','Click a highlighted helper endpoint. Selection does not move anyone.'):tr('Markierte Felder sind erreichbare Bergungsziele für ','Highlighted cells are reachable carrying destinations for ')+transport.b.name+tr('. Klick wählt das Ziel; danach Fähigkeit ausführen. Zum normalen Bewegen eine andere Aktion wählen.','. Click to choose a destination, then resolve the ability. Choose another action for normal movement.')) : blockMode ? 'Felder anklicken oder mit gedrückter linker Maustaste zeichnen. Auf vorhandenem Gelände beginnen, um diesen Typ zu entfernen. Leitern mit zwei Klicks setzen.' : 'Figur auswählen und freies Feld anklicken oder aus der Übersicht aufs Feld ziehen. Platzierte Figuren lassen sich verschieben. Linksklick wählt aus; Rechtsklick oder Aktionen öffnet das Menü.'}</p></div><div class="ct-controls">${button('reset-map', 'Karte zurücksetzen')}${button('map-background', 'Kartenbild')}${button('terrain-appearance',tr('Gelände darstellen','Terrain appearance'))}${button('maps', 'Kartenbibliothek')}${button('random-map', 'Zufallskarte')}${button('random-place','Zufällig aufstellen','',['active','paused'].includes(s.phase)?'disabled title="Nur vor dem Kampf verfügbar"':'')}${button('random-encounter',tr('Zufallsgegner','Random opponents'),'', ['active','paused'].includes(s.phase)?'disabled':'')}${button('board-size', `${s.board.width}×${s.board.height} ändern`)}</div></div><details class="ct-fold ct-terrain-palette" ${(terrainToolsOpen||blockMode||ladderStart||boardPaint?.pending())?'open':''}><summary data-action="terrain-toggle" aria-disabled="${blockMode?'true':'false'}"><span>${tr('Geländewerkzeuge','Terrain tools')}</span><small>${blockMode?tr('Aktiv – vor dem Einklappen Werkzeug ausschalten','Active – turn the tool off before collapsing'):tr('Mauern, Deckung, Abgründe, Höhen und Leitern','Walls, cover, pits, heights and ladders')}</small></summary><div class="ct-fold-body"><div class="ct-controls">${button('block-mode', blockMode && terrainType === 'wall' ? '✓ Mauern' : 'Mauern', blockMode && terrainType === 'wall' ? 'ct-selected' : '')}${button('cover-mode', blockMode && terrainType === 'cover' ? '✓ Deckung' : 'Deckung', blockMode && terrainType === 'cover' ? 'ct-selected' : '')}${button('pit-mode',tr('Abgrund','Pit'),blockMode&&terrainType==='pit'?'ct-selected':'')}${button('height-mode', 'Höhe 1', blockMode && terrainType === 'height' ? 'ct-selected' : '')}${button('ladder-mode', 'Leitern', blockMode && terrainType === 'ladder' ? 'ct-selected' : '')}${button('erase-mode','Gelände entfernen',blockMode && terrainType==='erase'?'ct-selected':'')}</div><div class="ct-terrain-tools">${blockMode ? '<p class="ct-terrain-hint" role="status">Geländebearbeitung aktiv: klicken oder gedrückt ziehen. Figurenfelder bleiben frei; Escape verwirft den Strich. Zum Bewegen das aktive Werkzeug erneut anklicken.</p>' : ''}${blockMode && terrainType === 'cover' ? select('Deckung schützt von','coverFacing',coverFacing,{ '':'Alle Richtungen (bisherige Regel)', north:'Norden',east:'Osten',south:'Süden',west:'Westen' }) : blockMode && terrainType === 'ladder' ? 'Zwei freie Nachbarfelder verschiedener Höhe anklicken. Erneutes Verbinden entfernt die Leiter.' + (ladderStart ? ' Start: ' + coordinate(ladderStart) : '') : blockMode && terrainType === 'height' ? 'Felder anklicken: Höhe 0 ↔ 1. Höhen und Deckung sind unabhängig.' : ''}</div></div></details><div class="ct-board-scroll"><div class="ct-board-frame ${zoom < 20 ? 'ct-zoom-small' : ''}" style="--ct-columns:${s.board.width};--ct-cell-size:${zoom}px"><div class="ct-corner"></div><div class="ct-columns">${Array.from({ length: s.board.width }, (_, x) => `<span>${x % labelStep === 0 ? columnLabel(x) : ''}</span>`).join('')}</div><div class="ct-rows">${Array.from({ length: s.board.height }, (_, y) => `<span>${y % labelStep === 0 ? y + 1 : ''}</span>`).join('')}</div>${mapSurface(s, cells, zoom)}</div></div><div class="ct-board-options"><label><input type="checkbox" name="override" ${override ? 'checked' : ''}> Spielleitung: Positionen korrigieren</label>${s.rules.visionEnabled&&s.rules.boardEnabled?'<label class="ct-vision-legend"><input type="checkbox" name="showVision" '+(c.preferences().showVision?'checked':'')+'> '+tr('Sichtbereich anzeigen (violett)','Show vision (purple)')+'</label>':''}${showSight?'<small class="ct-vision-legend">'+esc(tr('Sicht von ','Vision of ')+observer.name+' · '+visionRange(s,observer)+tr(' Felder; Mauern begrenzen die Sicht.',' cells; walls limit sight.'))+'</small>':''}<div class="ct-zoom-controls" aria-label="Kartenzoom">${button('zoom-out', '−', 'ct-icon', 'aria-label="Karte verkleinern"')}${button('zoom-in', '+', 'ct-icon', 'aria-label="Karte vergrößern"')}<span class="ct-zoom-value" aria-live="polite">${Math.round(zoom / 44 * 100)} %</span>${button('zoom-fit', 'Karte einpassen', view.fit ? 'ct-selected' : '')}${button('zoom-reset', '100 %')}${button('center-active','Aktive Figur zentrieren','',currentActor(s)?.position?'':'disabled')}${button('center-selected','Auswahl zentrieren','',s.actors.find(v=>v.id===selected)?.position?'':'disabled')}<label>Feldgröße <input type="range" name="zoom" min="2" max="96" value="${zoom}" aria-label="Feldgröße"></label></div></div>${carryPick?button('cancel-carry-pick',tr('Zielfeldwahl abbrechen','Cancel destination selection')):''}<div class="ct-board-feedback-slot" data-board-feedback>${boardNotice ? `<p class="ct-board-notice ${boardNoticeKind === 'error' ? 'ct-error' : ''}" role="status">${esc(boardNotice)} ${button('dismiss-board','×','ct-icon','aria-label="'+tr('Hinweis schließen','Dismiss notice')+'"')}</p>` : abilityFeedback?'<p class="ct-board-notice ct-ability-feedback '+(abilityFeedback.kind==='failure'?'ct-error ct-failure':abilityFeedback.kind==='success'?'ct-success':'ct-info')+'" role="status"><span class="ct-ability-feedback-copy">'+button('show-last-result',compactResultFeedback(abilityFeedback.result,c.preferences().language).label,'ct-ability-feedback-link','title="'+tr('Ausführliches Ergebnis anzeigen','Show detailed result')+'"')+abilityFeedbackText(abilityFeedback.result,c.preferences().language)+'</span>'+button('dismiss-board','×','ct-icon','aria-label="'+tr('Hinweis schließen','Dismiss notice')+'"')+'</p>':''}</div><div class="ct-legend"><span><i class="ct-dot ct-player"></i>Spieler</span><span><i class="ct-dot ct-ally"></i>Verbündete</span><span><i class="ct-dot ct-enemy"></i>Gegner</span><span>▽ ${tr('Abgrund','Pit')}</span><span>× Gesperrt</span><span>▰ Deckung${s.rules.coverWalkable ? '' : s.rules.coverCrossable ? ' · '+tr('übersteigen (','cross (')+((active?.acrobaticsTurn===s.turnSerial&&s.rules.skillsEnabled)?1:2)+tr(') · kein Halt',') · no stopping') : ' · nicht betretbar'}</span><span class="ct-reachable-legend">${esc(transport?(helperPick?tr('Grüner Rand: Helfer-Endfelder für ','Green outline: helper endpoints for ')+transport.a.name:tr('Grüner Rand: Bergungsziele für ','Green outline: carrying destinations for ')+transport.b.name):tr('Grüner Rand: Bewegung erreichbar','Green outline: reachable movement'))}</span>${reach!==null?'<span class="ct-range-legend">'+esc(tr('Türkis: Fernkampfreichweite ' ,'Cyan: ranged reach ')+reach+tr(' Felder · Sichtlinie separat prüfen',' cells · check line of sight separately'))+'</span>':''}</div>${!s.rules.boardEnabled ? '<p class="ct-warning">Reichweitenprüfung ist deaktiviert. Das Feld dient als Übersicht.</p>' : ''}${!s.actors.length ? `<div class="ct-empty"><strong>Die Bühne ist bereit.</strong><p>Lege deinen Spieler, Companions und Gegner an.</p>${button('add', 'Erste Figur anlegen', 'ct-primary')}${button('demo', 'Beispielkampf laden')}</div>` : ''}${reserveView(s)}${rosterView(s, active)}</section><aside class="ct-sidebar">${actionsMarkup}</aside></div>`;
    }
    function pitAfterView(s){if(!s.actors.some(b=>b.hanging&&!b.reserve))return '';const helpers=s.actors.filter(a=>isCombatant(a)&&a.position);if(!helpers.some(a=>a.id===helper))helper=helpers[0]?.id??'';return '<section class="ct-card"><h2>'+tr('Rettung am Abgrund','Pit rescue')+'</h2>'+select(tr('Helfende Figur','Helping participant'),'helper',helper,Object.fromEntries(helpers.map(a=>[a.id,a.name])))+pitRescueView(s,helpers.find(a=>a.id===helper))+button('elapse',tr('Zeit weiter: 1 volle Runde','Time: 1 full round'))+'</section>';}
    function pitRescueView(s,a){if(!isCombatant(a)||!a.position)return '<p class="ct-muted" role="status">'+tr('Keine helfende Figur platziert. Stelle zuerst eine handlungsfähige Figur aufs Spielfeld.','No helping participant is placed. Deploy an able participant first.')+'</p>'+button('rescue-pit',tr('Hochziehen','Pull up'),'ct-primary ct-full','disabled');const candidates=s.actors.filter(b=>canRescue(s,a,b));if(!candidates.some(b=>b.id===rescueTarget))rescueTarget=candidates[0]?.id??'';return select(tr('Hängende Figur','Hanging participant'),'rescueTarget',rescueTarget,Object.fromEntries(candidates.map(b=>[b.id,b.name])))+button('rescue-pit',tr('Hochziehen','Pull up'),'ct-primary ct-full',candidates.length&&(s.phase!=='active'||canManualAction(s,a,'stabilize'))?'':'disabled');}
    function otherActionsView(s, a) {
        const available = actionBudget(s, a).available,manualAvailable=available||manualUnlimited(s,a);
        const options = { ...(s.rules.skillsEnabled ? { skill:'Fähigkeit einsetzen' } : {}), cover: 'Deckung aufsuchen', check:'Eigene DC-Probe', describe: 'Eigene Aktion beschreiben', ...(s.rules.resourcesEnabled ? { heal: 'Heilen / Gegenmittel',refill:'Vorrat auffüllen' } : {}), rescue:tr('Vom Abgrund hochziehen','Pull up from pit'),stabilize: 'Stabilisieren', flee: 'Fliehen' };
        if (!options[otherKind]) otherKind = 'describe';
        const content = otherKind==='rescue'?pitRescueView(s,a):otherKind==='check'?checkMarkup(s,a,checkDrafts.get(c.chatKey(),a.id),c.preferences().language):otherKind === 'skill' ? skillView(s,a) : otherKind === 'cover' ? '<p class="ct-muted">Nutzt verbleibende Bewegung zu einer freien geschützten Position. Verbraucht keine Aktion.</p>' + button('go-cover', 'Deckung aufsuchen', 'ct-full', coverDestination(s, a)?.cost > 0 ? '' : 'disabled') : otherKind === 'refill'?treatmentView(s,true,'refill'):otherKind === 'heal' ? treatmentView(s,true,'treatment') : otherKind === 'stabilize' ? rescueView(s) || '<p class="ct-muted">Keine bewusstlose Figur verfügbar.</p>' : otherKind === 'flee' ? '<p class="ct-muted">' + (s.rules.boardEnabled ? 'Zum Fliehen an ein freies Randfeld bewegen.' : 'Flucht ohne Spielfeld ist sofort möglich.') + '</p>' + button('flee', 'Fliehen · Zug verwenden', 'ct-full', canManualAction(s, a, 'flee') && canFlee(s, a) ? '' : 'disabled') : '<label><input name="freeRemark" type="checkbox" ' + (freeRemark ? 'checked' : '') + '> Kostenlose Handlung ohne Regelwirkung</label><label class="ct-field"><span>Beschreibe deine eigene Aktion</span><textarea name="otherDescription" rows="3" placeholder="Ich lenke den Gegner ab …">' + esc(actionDraft) + '</textarea></label><p class="ct-muted">Eigene Aktionen verbrauchen die Aktion und werden erzählt. Zusätzliche Zahlenänderungen entscheidet die Spielleitung.</p>' + button('other', 'Andere Aktion ausführen', 'ct-full', freeRemark || canManualAction(s, a, 'other') ? '' : 'disabled');
        return '<section class="ct-other-actions"><h3>Andere Aktionen</h3>' + select('Aktion auswählen', 'otherKind', otherKind, options) + '<div id="ct-other-form">' + content + '</div></section>';
    }
    function bindingTimeView(s){
        const bound=s.actors.filter(v=>v.allegiance?.turns!=null);if(s.phase==='active'||!bound.length)return '';
        return '<section class="ct-card"><h2>'+tr('Seitenwechsel & Zeit','Allegiance & time')+'</h2><p>'+bound.map(v=>esc(v.name)+' · '+v.allegiance.turns).join(' · ')+'</p><p class="ct-muted">'+tr('Zeitbegrenzte Bindungen nach dem Kampf hier weiterzählen. In Reserve, bei Flucht, Bewusstlosigkeit oder Kampfpause pausiert die eigene Zugdauer.','Advance temporary bindings here after combat. Own-turn duration pauses in reserve, after fleeing, while unconscious or while combat is paused.')+'</p>'+button('elapse',tr('Zeit weiter: 1 volle Runde','Time: 1 full round'),'ct-full',s.phase==='paused'?'disabled':'')+'</section>';
    }
    function revivalView(s){
        if(!s.rules.skillsEnabled||!s.actors.some(v=>v.condition==='dead'))return '';
        const helpers=s.actors.filter(v=>isCombatant(v)&&v.skills.some(k=>['revive','raise'].includes(k.kind)));if(!helpers.length)return '';
        if(!helpers.some(v=>v.id===reviveHelper))reviveHelper=helpers[0].id;
        return '<section class="ct-card"><h2>'+tr('Wiederbeleben','Revival')+'</h2>'+select(tr('Anwender','Caster'),'reviveHelper',reviveHelper,Object.fromEntries(helpers.map(v=>[v.id,v.name])))+skillView(s,helpers.find(v=>v.id===reviveHelper),true)+'</section>';
    }
    function skillView(s,a,revivalOnly=false) {
        if(!a.skills.length)return '<p class="ct-muted">'+tr('Noch keine Fähigkeiten. Unter Figuren → Fähigkeiten eine Vorlage hinzufügen und Änderungen übernehmen.','No abilities yet. Add a template under Participants → Abilities and apply changes.')+'</p>';
        const skills=revivalOnly?a.skills.filter(v=>['revive','raise'].includes(v.kind)):a.skills;
        if(!skills.some(v=>v.id===skillId))skillId=skills[0].id;
        const skill=skills.find(v=>v.id===skillId),own=selfAbility(skill),selfContext=skill?.mechanics?.target==='self'&&!own,targets=own?[a]:s.actors.filter(b=>canUseSkill(s,a,b,skill));
        if(own)skillTarget=a.id;else if(!targets.some(b=>b.id===skillTarget))skillTarget=skill.kind==='narrative'?'':targets[0]?.id??'';
        const b=targets.find(v=>v.id===skillTarget),destinations=skill.kind==='jump'?jumpDestinations(s,a,skill):b&&['revive','raise'].includes(skill.kind)?revivalDestinations(s,a,b,skill):b&&skill.kind==='carry'?(coordinateInput(skillCarryCell)?carryPlans(s,a,b,a.position,coordinateInput(skillCarryCell)):[]):b&&skill.kind==='shove'?forcedDestinations(s,a,b):[];
        const destinationKey=[c.chatKey(),turnToken(s),a.id,skillId,b?.id,a.position?.x,a.position?.y,b?.position?.x,b?.position?.y].join(':');
        if(destinationKey!==skillDestinationKey){skillDestination='';skillCarryCell='';skillCarrierCell='';carryPick=null;skillDestinationKey=destinationKey;}
        let destinationView='',carryValid=true;
        if(skill.kind==='carry'){
            const selection=carrySelection(s,a,b,skillCarryCell,c.preferences().language,destinations,skillCarrierCell);carryValid=Boolean(selection.plan);skillDestination=selection.plan?selection.point.x+','+selection.point.y:'';
            destinationView=carryDestinationMarkup(s,a,b,skillCarryCell,c.preferences().language,'skill',destinations,skillCarrierCell);
        }else{if(!destinations.some(p=>p.x+','+p.y===skillDestination))skillDestination=destinations[0]?destinations[0].x+','+destinations[0].y:'';if(destinations.length)destinationView=select('Zielfeld','skillDestination',skillDestination,Object.fromEntries(destinations.map(p=>[p.x+','+p.y,coordinate(p)])));}
        const weapons=b&&skill.kind==='disarm'?listWeapons(b).filter(w=>tacticalEffect(s,b,'disarmed')?.weapon!==w.id):[];if(!weapons.some(w=>w.id===skillWeapon))skillWeapon=weapons[0]?.id??'';
        const reason=abilityRestriction(s,a,b??(skill.kind==='narrative'&&skill.dcMode==='fixed'?a:null),skill,c.preferences().language),paid=consumption(s,a,skill),valid=!reason&&carryValid&&!(skill.kind==='narrative'&&(skill.dcMode!=='fixed'||skill.mechanics?.target==='selected')&&!skillTarget);
        return select('Fähigkeit','skill',abilityGroups(skills).find(g=>g.skills.some(v=>v.id===skillId))?.id??skillId,Object.fromEntries(abilityChoices(skills,c.preferences().language)))+
            (['acrobatics','jump'].includes(skill.kind)?select(tr('Anwendung','Application'),'skillApplication',skillId,Object.fromEntries((abilityGroups(skills).find(g=>g.skills.some(v=>v.id===skillId))?.skills??[skill]).map(v=>[v.id,applicationLabel(v,c.preferences().language)]))):'')+
            (own?'<p class="ct-self-ability">'+esc(tr('Wirkt auf die eigene Figur: ','Applies to the acting participant: ')+a.name)+'</p>':select(selfContext?tr('Bezugsfigur für Abwehr (Wirkung auf selbst)','Defense reference (effect on self)'):skill.mechanics?.target==='selected'?tr('Wirkungsziel','Effect recipient'):'Ziel','skillTarget',skillTarget,{...(skill.kind==='narrative'?{'':selfContext?tr('Bezugsfigur für Abwehr wählen','Choose defense reference'):skill.mechanics?.target==='selected'?tr('Wirkungsziel wählen','Choose effect recipient'):tr('Kein Figurenbezug / siehe Beschreibung','None / see description')}:{}),...Object.fromEntries(targets.map(v=>[v.id,v.id===a.id?tr('Eigene Figur: ','Self: ')+v.name:v.name]))}))+(selfContext?'<p class="ct-self-ability">'+esc(tr('Wirkt auf die eigene Figur: ','Applies to the acting participant: ')+a.name)+'</p>':'')+destinationView+
            (weapons.length?select('Zielwaffe','skillWeapon',skillWeapon,Object.fromEntries(weapons.map(w=>[w.id,w.name]))):'')+
            '<p class="ct-muted">'+esc(skill.check?'W20 + '+statLabels(c.preferences().language)[skill.stat]+' + '+skill.bonus+' · '+skillDefenseText(s,b,skill,c.preferences().language):'Ohne Probe')+
            (['revive','raise'].includes(skill.kind)?tr(' · Rückkehr mit bis zu ',' · Return with up to ')+(skill.reviveHp??5)+' HP'+(skill.kind==='raise'?(skill.permanent!==false?tr(' · dauerhaft',' · permanent'):' · '+skill.turns+tr(' eigene Züge',' own turns')):''):['narrative','jump','shove','carry'].includes(skill.kind)?tr(' · einmalig',' · immediate'):' · '+skill.turns+tr(' eigene Züge',' own turns'))+
            (paid.id?' · '+esc(paid.stock.name)+' · '+tr('Kosten pro Versuch ','Cost per attempt ')+paid.cost+' · '+tr('übrig ','remaining ')+paid.stock.quantity:'')+'</p>'+
            (reason?'<p class="ct-warning ct-ability-restriction" role="status">'+esc(reason)+'</p>':'')+
            (skill.kind==='narrative'?'<p class="ct-muted">'+esc(skill.description||skill.name)+' · '+esc(mechanicsText(skill.mechanics,c.preferences().language))+'</p>':'')+
            button(revivalOnly?'revive-after':'use-skill','Fähigkeit ausführen','ct-primary ct-full',valid?'':'disabled');
    }
    function carryingContext(kind=null){
        const s=c.state(),a=currentActor(s);if(!a)return null;
        kind??=otherKind==='check'?'check':otherKind==='skill'?'skill':'';
        if(!['skill','check'].includes(kind))return null;
        const draft=kind==='check'?checkDrafts.get(c.chatKey(),a.id):null,k=a.skills.find(v=>v.id===(draft?.effect??skillId)),b=s.actors.find(v=>v.id===(draft?.target??skillTarget));
        return k?.kind==='carry'&&b?{s,a,b,kind,draft,skill:k,raw:draft?.carryCell??skillCarryCell,carrierRaw:draft?.carrierCell??skillCarrierCell}:null;
    }
    function carryBoardContext(){
        return !override&&!blockMode&&c.state().phase==='active'&&c.state().rules.boardEnabled?carryingContext():null;
    }
    function setCarryDestination(ctx,position,endpoint='target'){
        const current=carryingContext(ctx.kind);if(!current||current.a.id!==ctx.a.id||current.b.id!==ctx.b.id||current.skill.id!==ctx.skill.id)throw Error(tr('Bergungsaktion wurde geändert. Zielfeld erneut wählen.','Carrying action changed. Choose the destination again.'));
        const raw=endpoint==='carrier'?current.raw:coordinate(position),carrierRaw=endpoint==='carrier'?coordinate(position):'',choice=carrySelection(current.s,current.a,current.b,raw,c.preferences().language,null,carrierRaw);if(!choice.plan)throw Error(choice.error);
        if(ctx.kind==='check'){current.draft.carryCell=raw;current.draft.carrierCell=carrierRaw;current.draft.destination=choice.point.x+','+choice.point.y;}else{skillCarryCell=raw;skillCarrierCell=carrierRaw;skillDestination=choice.point.x+','+choice.point.y;}
        carryPick=null;boardNotice=carryPreview(current.a,current.b,choice.plan,c.preferences().language);boardNoticeKind='info';return choice;
    }
    function openCarryContext(position){
        const ctx=carryingContext();if(!ctx)return false;const revision=ctx.s.revision,chat=c.chatKey(),endpoint=carryPick?.endpoint??'target';
        const choice=carrySelection(ctx.s,ctx.a,ctx.b,endpoint==='carrier'?ctx.raw:coordinate(position),c.preferences().language,null,endpoint==='carrier'?coordinate(position):'');
        const d=dialog((endpoint==='carrier'?tr('Helfer-Endfeld ','Helper endpoint '):tr('Bergen nach ','Carry to '))+coordinate(position),choice.plan?carryPreviewMarkup(ctx.a,ctx.b,choice.plan,c.preferences().language):'<p>'+esc(choice.error)+'</p>',()=>{if(c.chatKey()!==chat||c.state().revision!==revision)throw Error(tr('Kampf wurde geändert. Zielfeld erneut wählen.','Combat changed. Choose the destination again.'));setCarryDestination(ctx,position,endpoint);render();},tr('Als Zielfeld übernehmen','Use as destination'));
        if(!choice.plan)d.querySelector('[type=submit]').disabled=true;return true;
    }
    function placementBlock(a){return a?.condition==='dead'&&c.state().rules.autoRemoveDead?tr('Tot – bei aktiver Leichen-Regel nicht platzierbar. Erst wiederbeleben oder erheben.','Dead – cannot deploy while automatic corpse removal is enabled. Revive or raise first.'):'';}
    function managementButtons(a) {
        const id='data-id="'+esc(a.id)+'"',title=tr('Aus Szenario löschen: ','Delete from encounter: ')+a.name;
        const presence=a.escaped?button('return-actor',tr('Zurückholen','Return'),'',id):a.position||a.hanging&&!a.reserve?button('unplace',tr('Vom Feld nehmen','Remove from board'),'',id):a.hanging?'':button('place-actor',tr('Einsetzen / platzieren','Deploy / place'),'',id);
        return presence+button('remove','×','ct-danger',id+' aria-label="'+esc(title)+'" title="'+esc(title)+'"');
    }
    function freeDiceView(s) {
        const last=s.log.findLast(e=>e.type==='free-roll')?.details;
        return fold('free-dice',tr('Frei würfeln','Free dice'),'<div class="ct-controls ct-free-dice">'+[4,6,8,10,12,20,100].map(sides=>button('free-roll',(c.preferences().language==='en'?'d':'W')+sides,'','data-sides="'+sides+'"')).join('')+'</div><p class="ct-muted">'+tr('Ohne Aktion oder Regelwirkung. Ergebnis auch im Log.','No action cost or mechanical effect. Result also in the log.')+'</p>'+(last?'<output class="ct-free-dice-result" aria-live="polite">'+tr('Letzter freier Wurf: W','Last free roll: d')+last.sides+' → '+last.value+'</output>':''));
    }
    function reserveView(s) {
        const actors=s.actors.filter(a=>!a.position&&!a.escaped&&(!a.hanging||a.reserve));
        return '<details class="ct-reserve-zone" '+(c.preferences().reserveCollapsed?'':'open')+' data-reserve-drop aria-label="'+tr('Figuren außerhalb des Spielfelds','Participants off the board')+'"><summary data-action="reserve-toggle"><strong>'+tr('Außerhalb des Spielfelds','Off the board')+' ('+actors.length+')</strong></summary><p class="ct-muted">'+tr('Figur vom Brett hierher ziehen, um sie herauszunehmen. Zum Einsetzen auswählen und ein freies Feld anklicken oder aufs Brett ziehen.','Drag a participant here to remove it from the board. To deploy, select and click a free cell or drag onto the board.')+'</p><div class="ct-unplaced">'+actors.map(a=>'<article class="ct-reserve-card '+(a.condition==='dead'?'ct-dead ':'')+(a.id===selected?'ct-roster-selected':'')+'" data-reserve-id="'+esc(a.id)+'"><button type="button" class="ct-roster-heading" data-action="select" data-id="'+esc(a.id)+'" '+'data-drag-actor="true"'+' draggable="'+!a.hanging+'" aria-pressed="'+(a.id===selected)+'">'+avatar(a)+'<strong>'+esc(a.name)+'</strong></button>'+presenceMarkup(s,a,c.preferences().language)+(a.lastPosition?'':'<small>'+tr('Noch nie platziert','Never placed')+'</small>')+statusMarkers(s,a,c.preferences().language)+(a.condition==='dead'?'':'<small>'+esc(conditionText(a,c.preferences().language))+'</small>')+'<div class="ct-controls">'+managementButtons(a)+'</div></article>').join('')+'</div></details>';
    }
    async function takeOffBoard(id,context=null) {
        if(context&&(c.chatKey()!==context.chat||c.state().revision!==context.state.revision))throw new Error(tr('Kampfzustand wurde während des Ziehens geändert. Bitte erneut verschieben.','Combat changed during dragging. Please drag again.'));
        const a=c.state().actors.find(v=>v.id===id);if(!a||a.escaped||!a.position)throw new Error(tr('Nur eine platzierte Figur hier ablegen.','Only drop a placed participant here.'));
        selected=id;await c.reserve(id);
    }
    function compactRoster(a,markup){return c.preferences().compactUI?fold('roster-actions-'+a.id,tr('Verwalten','Manage'),markup):markup;}
    function rosterView(s, active) {
        const activeId = s.phase === 'active' ? active?.id : null;
        const ordered = s.actors.filter(a=>!c.preferences().hideDeadParticipants||a.condition!=='dead').sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId));
        return '<section class="ct-board-roster"><div class="ct-section-heading"><div><h2>Figurenübersicht</h2><p>Alle Teilnehmer · die aktive Figur steht zuerst.</p></div><div class="ct-controls">'+'<label><input type="checkbox" name="hideDeadParticipants" '+(c.preferences().hideDeadParticipants?'checked':'')+'> '+tr('Tote ausblenden','Hide dead')+' ('+s.actors.filter(a=>a.condition==="dead").length+')</label>'+button('restore-actors',tr('Figuren wiederherstellen','Restore participants'),'',['active','paused'].includes(s.phase)?'disabled title="'+tr('Kampf zuerst beenden','End combat first')+'"':'')+'</div></div><div class="ct-roster-grid">' + ordered.map(a => {
            const chosen = a.id === selected, now = s.phase === 'active' && a.id === active?.id;
            return '<article class="ct-roster-card ' + (a.condition==='dead'?'ct-dead ':'') + (chosen ? 'ct-roster-selected ' : '') + (now ? 'ct-roster-current' : '') + '"><button type="button" class="ct-roster-heading" data-action="select" data-id="' + esc(a.id) + '" draggable="true" data-drag-actor="true" '+' aria-pressed="' + chosen + '">' + avatar(a) + '<span><strong>' + esc(a.name) + '</strong><small>' + (now ? 'AM ZUG' : esc(sides[a.side])) + '</small></span></button><div class="ct-roster-values"><span>' + a.hp + '/' + a.maxHp + ' HP</span><span>DC ' + a.dc + '</span><span>' + coordinate(a.position) + '</span></div>'+presenceMarkup(s,a,c.preferences().language) + hpBar(a) + (a.condition==='dead'?'':'<p class="ct-condition">' + esc(conditionText({ ...a, effects: [] })) + '</p>') + statusMarkers(s, a, c.preferences().language) + (chosen ? '<div class="ct-mini-stats">' + Object.entries(statLabels(c.preferences().language)).map(([k, label]) => '<span title="' + label + '">' + label.slice(0, 3).toUpperCase() + ' <b>' + signed(statBonus(s, a, k)) + '</b></span>').join('') + '</div>' : '') + compactRoster(a,'<div class="ct-controls">' + button('edit', 'Bearbeiten', '', 'data-id="' + esc(a.id) + '"') + button('actor-menu','Aktionen','','data-id="'+esc(a.id)+'"') + button('weapons', 'Waffenliste', '', `data-id="${esc(a.id)}"`) + button('defense','Reaktionen & Schilde','',`data-id="${esc(a.id)}"`) + button('skills', 'Fähigkeiten', '', `data-id="${esc(a.id)}"`) + button('actions', 'Aktionsbudget', '', `data-id="${esc(a.id)}"`) + button('supplies', 'Ressourcen & Zustände', '', 'data-id="' + esc(a.id) + '"') + managementButtons(a) + (chosen ? button('template', 'Als Vorlage speichern', '', 'data-id="' + esc(a.id) + '"') : '') + '</div>') + '</article>';
        }).join('') + '</div></section>';
    }
    function actionView(s, a) {
        if(s.unseenTurn)return '<section class="ct-card"><h2>'+tr('Unentdeckter Gegner am Zug','Unseen enemy turn')+'</h2><p>'+tr('GM-Korrektur zeigt alle Figuren zur Verwaltung.','GM correction reveals all participants for management.')+'</p><p data-ai-progress role="status">'+esc(progressText())+'</p>'+(c.aiRunning()?button('stop-ai',tr('KI-Automatik stoppen','Stop AI automation'),'ct-danger'):'')+(['basic','advanced'].includes(currentActor(c.state())?.control)?button('ai-step',tr('KI-Zug ausführen','Run AI turn'))+button('ai-run',tr('KI-Züge bis zum manuellen Zug','Run AI until manual turn'),'ct-primary ct-full'):'')+button('end-turn',tr('Zug beenden','End turn'))+'</section>';
        if (s.phase !== 'active' || !a) return `<section class="ct-card"><span class="ct-eyebrow">KAMPFVORBEREITUNG</span><h2>${s.phase==='paused'?tr('Wartet auf Wiedereinsetzen','Waiting for deployment'):s.phase === 'ended' ? 'Kampf beendet' : 'Bereit für die erste Runde?'}</h2><p>Figuren anlegen, HP und Boni prüfen, Positionen setzen. Initiative wird einmal festgelegt.</p>${button('add', '+ Figur hinzufügen', 'ct-primary')}${button('scan', 'Figuren aus Chat')}${button('profiles-actors','Figuren importieren')}</section>${bindingTimeView(s)}${revivalView(s)}${treatmentView(s)}${rescueView(s)}${pitAfterView(s)}`;
        const targets = s.actors.filter(b => isCombatant(b));
        const chosen = weaponStat(s,a,weaponFor(a,mode,variant,weaponId)??{},stat==='auto'?undefined:stat);
        const available = actionBudget(s, a).available,manualAvailable=available||manualUnlimited(s,a);
        const budget = movementBudget(s, a), weapon = weaponFor(a, mode, variant, weaponId), modeOptions = {};
        const stocked = weapon && canPay(s,a,weapon);
        const profile = weaponFor(a, mode, 'profile', weaponId), variants = { profile: 'Profilangriff / Spezialmunition' };
        if (profile?.standard) variants.standard = 'Standardangriff';
        const stock = weapon?.resource ? a.resources.find(v => v.id === weapon.resource) : null;
        if (weaponFor(a, 'melee')) modeOptions.melee = 'Nahkampf · benachbart, auch diagonal';
        if (weaponFor(a, 'ranged')) modeOptions.ranged = `Fernkampf · bis ${a.range} Felder`;
        const weaponChoices = select('Waffe / Angriffszauber', 'weapon', weaponId, Object.fromEntries(listWeapons(a).map(w => [w.id, `${w.name} · ${w.mode === 'melee' ? 'Nahkampf' : 'Fernkampf'} · ${w.damage} ${signed(w.damageBonus)}${w.mode === 'ranged' ? ' · ' + w.range : ''}`]))) + (profile?.standard ? select('Angriffsvariante', 'variant', variant, variants) : '') + '<p class="ct-weapon-note">' + (stock && s.rules.resourcesEnabled ? esc(stock.name) + ' · ' + stock.quantity + ' Einheiten · Kosten ' + (weapon.cost??1) : 'Ohne Munitionsverbrauch') + '</p>';
        const areaTargets = Number(areaDraft) > 0 ? blastPreview(s, s.actors.find(v => v.id === target)?.position, Number(areaDraft)).filter(v => !v.blocked&&visibleTo(s,a,s.actors.find(b=>b.id===v.id))&&(s.rules.friendlyFireArea||(s.actors.find(b=>b.id===v.id)?.side==='enemy')!==(a.side==='enemy'))) : [];
        const areaFriends=areaTargets.filter(v=>(s.actors.find(b=>b.id===v.id)?.side==='enemy')===(a.side==='enemy'));
        const extras = field('Schadenswürfel für diesen Angriff', 'damageOverride', damageDraft, 'text', 'required placeholder="2d6+1"') + field('Flächenradius (0 = einzelnes Ziel)', 'radiusOverride', areaDraft, 'number', 'min="0" max="10" required') + select('Angriffsattribut', 'stat', stat, { auto: 'Profil / höheres STR oder DEX', ...statLabels(c.preferences().language) });
        const risky=a.position&&s.actors.find(v=>v.id===target)&&mode==='ranged'?shotObstacles(s,a,s.actors.find(v=>v.id===target)):[];
        const visibleRisk=risky.filter(v=>visibleTo(s,a,v)),friendlyRisk=visibleRisk.filter(v=>(v.side==='enemy')===(a.side==='enemy'));
        const shotWarning=risky.length?'<p class="ct-muted">'+tr('Figuren in der Schusslinie: ','Figures in the shot path: ')+visibleRisk.map(v=>esc(v.name)).join(', ')+' · −'+risky.length*s.rules.shotRiskPenalty+tr(' auf Treffer.',' to hit.')+'</p>'+(friendlyRisk.length?'<p class="ct-warning ct-friendly-warning">Friendly Fire: '+friendlyRisk.map(v=>esc(v.name)).join(', ')+'</p>':''):'';

        const manual = `<form id="ct-action-form">${select('Ziel', 'target', target, Object.fromEntries(targets.map(b => [b.id, `${b.name} · DC ${b.dc} · ${b.hp} HP`])))}<div class="ct-weapon-note">${esc(weapon?.damage ?? 'keine Waffe')} ${signed(weapon?.damageBonus ?? 0)} · ${Number(areaDraft) ? `Flächenradius ${esc(areaDraft)}` : 'Einzelziel'}</div>${areaTargets.length ? `<p class="ct-area-preview">Fläche trifft: ${areaTargets.map(v => esc(v.name)).join(', ')}. Mauern blockieren die Ausbreitung.</p>` : ''}${areaFriends.length?'<p class="ct-warning ct-friendly-warning">Friendly Fire: '+areaFriends.map(v=>esc(v.name)).join(', ')+'</p>':''}${shotWarning}${fold('attack-options', 'Würfel & weitere Optionen', extras)}<p class="ct-formula">W20 ${signed(statBonus(s, a, chosen))} ${signed(a.attackBonus + (weapon?.attackBonus ?? 0) + stanceBonus(s,a).attack)}${hasEffect(s, a, 'poisoned') ? ' '+signed(-s.rules.poisonPenalty)+' Gift' : ''} <span>gegen Ziel-DC</span></p>${button('attack', mode === 'ranged' ? 'Fernangriff auswerten' : 'Nahkampfangriff auswerten', 'ct-primary ct-full', canManualAction(s, a, 'attack') && !protection(s,a).attackLock && !reactionPending(s,a) && tacticalEffect(s,a,'disarmed')?.weapon !== weapon?.id && targets.some(b=>b.id===target&&(b.side==='enemy')!==(a.side==='enemy')) && weapon && stocked ? '' : 'disabled')}</form>`;
        const automatic = ['basic','advanced'].includes(a.control) ? `<div class="ct-ai-actions">${button('ai-step', 'KI-Zug ausführen', 'ct-primary ct-full')}${button('ai-run', 'KI-Züge bis zum manuellen Zug', 'ct-full')}<p class="ct-muted">${esc(behaviors[a.aiBehavior])} · ${esc(weaponFor(a)?.damage ?? 'keine Waffe')}</p></div>` : a.control === 'dm' ? `<div class="ct-ai-actions">${button('propose', 'DM-Vorschlag anfordern (experimentell)', 'ct-primary ct-full', available ? '' : 'disabled')}<p class="ct-muted">Benötigt eine Modellverbindung und gültiges combat-JSON. Du bestätigst vor dem Würfeln.</p></div>` : '';
        return `<section class="ct-card ct-action-card"><div class="ct-section-heading"><div><span class="ct-eyebrow">AM ZUG</span><h2>${esc(a.name)}</h2></div>${button('edit-control', esc(controls[a.control]), 'ct-control-badge', `data-id="${esc(a.id)}"`)}</div>${s.rules.stancesEnabled ? '<div data-compact-section="stance">'+select('Kampfhaltung','stance',a.stance,{neutral:'Neutral',defensive:`Defensiv: ${signed(s.rules.defensiveAttack)} Treffer / ${signed(s.rules.defensiveDefense)} DC`,offensive:`Offensiv: ${signed(s.rules.offensiveAttack)} Treffer / ${signed(s.rules.offensiveDefense)} DC`}).replace('<select name="stance">','<select name="stance" '+((s.action.actorId===a.id&&(s.action.freeSpent>0||Object.values(s.action.bonusSpent??{}).some(v=>v>0)))?'disabled':'')+'>') + '<p class="ct-muted">Vor der ersten Aktion wechseln. Die Haltung bleibt bis zur bewussten Änderung erhalten.</p></div>' : ''}${reactionPending(s,a) ? '<p class="ct-warning">Eingeschüchtert: zuerst Deckung suchen oder zurückweichen. Bei Fluchtabsicht zum Kartenrand gehen.</p>' : ''}${automatic}${c.preferences().compactUI&&c.aiRunning()?'<div class="ct-compact-stop"><p role="status">'+esc(progressText())+'</p>'+button('stop-ai',tr('KI-Automatik stoppen','Stop AI automation'),'ct-danger ct-full')+'</div>':''}<div class="ct-ai-batch" data-compact-section="batch">${select('KI-Serie: maximale Züge','aiBatchSize',String(c.preferences().aiBatchSize??20),{'10':'10','20':'20','50':'50','100':'100'})}<p data-ai-progress aria-live="polite">${esc(progressText())}</p>${c.aiRunning() ? button('stop-ai', 'KI-Automatik stoppen', 'ct-danger ct-full') : ''}</div><p class="ct-movement" data-compact-section="movement"><strong>${budget.remaining} / ${budget.total}</strong> Bewegungspunkte übrig <small>Erreichbare Felder sind grün markiert.</small></p><p class="ct-action-status ${manualAvailable ? 'ct-action-ready' : 'ct-action-used'}" aria-live="polite"><strong>${hasEffect(s, a, 'stunned') ? 'Betäubt · Zug aussetzen' : manualAvailable ? 'Aktion verfügbar' : 'Aktion verbraucht'}</strong><small>${s.rules.splitMovement ? "Restbewegung nutzen oder Zug beenden." : ""}</small></p>${s.rules.multiActionsEnabled ? '<p class="ct-budget-summary">' + esc(budgetText(s, a)) + '</p>' : ''}${button('end-turn', 'Zug beenden', 'ct-full ct-end-turn')}${protection(s,a).attackLock?"<p class=\"ct-warning\">Aktiver Schutz sperrt eigene Angriffe.</p>":""}${fold("action-defense-"+a.id,tr("Reaktionen & Schutz","Reactions & protection"),defenseActions(s,a,c.preferences().language),false,"",defenseBadge(s,a,c.preferences().language))}<label class="ct-field ct-narrative-input"><span>${tr('Mein Zug / Erzählhinweis (optional)','My turn / narrative hint (optional)')}</span><textarea name="description" rows="2" maxlength="500" placeholder="${tr('Ich versuche, ihn am Kopf zu treffen …','I try to strike his head …')}">${esc(actionDraft)}</textarea><small>${tr('Nur erzählerische Absicht; verändert keine Würfe oder Schäden.','Narrative intent only; does not change rolls or damage.')}</small></label><label class="ct-rule"><input type="checkbox" name="manualUnlimited" ${manualUnlimited(s,a)?'checked':''}><span><strong>${tr('Aktionslimit für diesen Zug aufheben','Lift the action limit for this turn')}</strong><small>${tr('Nur manuell; Bewegung und Vorratskosten bleiben. Zug selbst beenden.','Manual actions only; movement and stock costs remain. End the turn yourself.')}</small></span></label>${weaponChoices} ${a.control === 'manual' ? manual : fold(`manual-${a.id}-${a.control}`, 'Manuelle Aktion', manual)}${otherActionsView(s, a)}<div class="ct-divider"></div>${button('narrate', 'KI erzählt das Ergebnis', 'ct-full')}</section>`;
    }

    function budgetText(s, a) {
        const b = actionBudget(s,a), labels = { skill:'Fähigkeiten', attack:'Angriffe', use:'Heilen / Gegenmittel', stabilize:'Stabilisieren', other:'Eigene Aktionen', flee:'Fliehen',refill:'Vorrat auffüllen',shield:'Schutz',reserve:'Reaktion reservieren' };
        return 'Normale Aktionen: ' + b.free.remaining + '/' + b.free.total + (b.bonus.length ? ' · ' + b.bonus.map(v => v.name + ': ' + v.remaining + '/' + v.total + ' (' + v.allowed.map(k => labels[k]).join(', ') + ')').join(' · ') : '');
    }
    function treatmentView(s, embedded = false, filter='all') {
        if (!s.rules.resourcesEnabled) return '';
        const l=(de,en)=>c.preferences().language==='en'?en:de;
        const helpers=s.actors.filter(a=>isCombatant(a)&&!hasEffect(s,a,'stunned'));if(!helpers.length)return '';
        if(!helpers.some(a=>a.id===treatmentActor))treatmentActor=helpers.find(a=>a.id===selected)?.id??helpers[0].id;
        const a=s.phase==='active'?currentActor(s):helpers.find(a=>a.id===treatmentActor);if(!a)return '';
        const items=a.resources.filter(v=>v.kind==='supply'&&canPay(s,a,v,true)&&(filter==='all'||(filter==='refill')===Boolean(v.refill)));if(!items.some(v=>v.id===resource))resource=items[0]?.id??'';
        const item=items.find(v=>v.id===resource);
        const refillStock=item?.refill?a.resources.find(v=>v.id===item.refill.stock):null;
        const needs=b=>item?.refill?refillAmount(a,item)>0:item?.radius?healingTargets(s,a,item,b.position).some(v=>v.needsHealing||v.cures.length):item&&(item.heal!=='0'&&b.hp<b.maxHp||curableStatuses(s,b,item.cures).length);
        const targets=item?s.actors.filter(b=>canUseResource(s,a,b,item)&&needs(b)):[];
        if(!targets.some(v=>v.id===resourceTarget))resourceTarget=targets.find(v=>v.id===a.id)?.id??targets[0]?.id??'';
        if(!item?.radius)healCenterMode='actor';
        const center=healCenterMode==='cell'?{x:healX-1,y:healY-1}:s.actors.find(v=>v.id===resourceTarget)?.position;
        const recipients=item?.radius?healingTargets(s,a,item,center):[];
        const payable=item?consumption(s,a,item,true):null;
        const legal=healCenterMode==='cell'?recipients.some(v=>v.needsHealing||v.cures.length):targets.length>0;
        const enabled=(s.phase!=='active'||canManualAction(s,a,item?.refill?'refill':'use'))&&!hasEffect(s,a,'stunned');
        const body=(s.phase!=='active'?select(l('Helfende Figur','Helping participant'),'treatmentActor',a.id,Object.fromEntries(helpers.map(v=>[v.id,v.name]))):'')+(item?
            select(l('Ressource','Supply'),'resource',resource,Object.fromEntries(items.map(v=>[v.id,v.name])))+
            (item.radius?select(l('Heilzentrum','Healing center'),'healCenterMode',healCenterMode,{actor:l('Figur','Participant'),cell:l('Freies Feld','Free cell')}):'')+
            (item.refill?'':healCenterMode==='cell'?'<div class="ct-form-grid">'+field(l('Spalte (1 = A)','Column (1 = A)'),'healX',healX,'number','min="1" max="'+s.board.width+'"')+field(l('Zeile','Row'),'healY',healY,'number','min="1" max="'+s.board.height+'"')+'</div>':select(l('Behandlungsziel / Zentrum','Treatment target / center'),'resourceTarget',resourceTarget,Object.fromEntries(targets.map(v=>[v.id,v.name+' · '+v.hp+'/'+v.maxHp+' HP · '+coordinate(v.position)]))))+
            (item.refill?'<p class="ct-muted">'+esc(l('Aufladen: ','Refill: '))+esc(refillStock.name)+' · '+refillStock.quantity+(refillStock.capacity!=null?'/'+refillStock.capacity:'')+' → '+(refillStock.quantity+refillAmount(a,item))+' · +'+refillAmount(a,item)+' · '+l('Ohne Würfel; nur eigener Vorrat.','No dice; own stock only.')+'</p>':'<p class="ct-muted">'+esc(item.heal)+' · '+l('Reichweite','Range')+' '+item.range+' · '+l('Radius','Radius')+' '+item.radius+' · '+l('entfernt','removes')+' '+esc(item.cures.map(k=>STATUS_TYPES[k][c.preferences().language]).join(', ')||l('keine','none'))+'</p>')+
            '<p class="ct-muted">'+(payable.id?esc(payable.stock.name)+' · '+l('Kosten','Cost')+' '+payable.cost+' · '+payable.stock.quantity+' '+l('übrig','left'):l('Ohne Verbrauch','No consumption'))+'</p>'+
            (item.refill?'<p class="ct-muted">'+esc(l('Einmal bezahlen und den Vorrat um die eingestellte Menge auffüllen, bis zum optionalen Maximum. Ein voller Vorrat verbraucht nichts.','Pay once and add the configured amount, up to the optional capacity. A full stock spends nothing.'))+'</p>':
            (item.radius?'<p class="ct-heal-preview">'+esc(l('Empfänger (grün auf der Karte): ','Recipients (green on the board): '))+recipients.map(v=>esc(v.actor.name)+' · '+l('Ring','Ring')+' '+v.distance).join(' · ')+'</p>':'')+
            '<p class="ct-muted">'+esc(l('Flächenheilung würfelt und bezahlt einmal. Mauern blockieren; Deckung reduziert Heilung nicht. Tote und geflohene Figuren werden nicht geheilt.','Area healing rolls and pays once. Walls block; cover does not reduce healing. Dead and escaped participants cannot be healed.'))+'</p>')+
            button('use-resource',item.refill?l('Vorrat auffüllen','Refill stock'):l('Heilen / Gegenmittel verwenden','Heal / use remedy'),'ct-primary ct-full',enabled&&legal?'':'disabled'):
            '<p class="ct-muted">'+esc(filter==='refill'?l('Keine verfügbaren Aufladeitems. Unter Ressourcen & Zustände anlegen oder Vorräte prüfen.','No refill items available. Add them under Resources & statuses or check stocks.'):l('Keine verfügbaren Heilmittel. Vorräte und Kosten im Ressourcen-Editor prüfen.','No healing supplies available. Check stocks and costs in the resources editor.'))+'</p>')+button('supplies',l('Ressourcen & Zustände','Resources & statuses'),'ct-full','data-id="'+esc(a.id)+'"');
        return embedded?body:'<section class="ct-card ct-treatment-card">'+fold('treatment',l('Heilung & Gegenmittel','Healing & remedies'),body,Boolean(items.length))+'</section>';
    }

    function rescueView(s) {
        const targets = s.actors.filter(a => a.hp === 0 && a.condition === 'unconscious');
        if (!targets.length) return '';
        const helpers = s.actors.filter(isCombatant);
        if (!helpers.some(a => a.id === helper)) helper = helpers[0]?.id ?? '';
        if (!targets.some(a => a.id === rescueTarget)) rescueTarget = targets[0].id;
        return `<section class="ct-card ct-rescue-card"><span class="ct-eyebrow">RETTUNG · ALLE SEITEN</span><h2>Bewusstlose stabilisieren</h2><p class="ct-muted">Helfer und Ziel müssen benachbart stehen, auch diagonal. Stabilisiert heißt: 0 HP, kampfunfähig, ohne Countdown.</p>${s.phase !== 'active' ? select('Helfende Figur', 'helper', helper, Object.fromEntries(helpers.map(a => [a.id, `${a.name} · ${coordinate(a.position)}`]))) : `<p>${esc(currentActor(s)?.name)} kann helfen. Die Rettung verbraucht deine Aktion.</p>`}${select('Bewusstlose Figur', 'rescueTarget', rescueTarget, Object.fromEntries(targets.map(a => [a.id, `${a.name} · ${a.roundsLeft} Runden · ${coordinate(a.position)}`])))}${button('stabilize', 'Retten / stabilisieren', 'ct-primary ct-full', helpers.length && (s.phase !== 'active' || canManualAction(s, currentActor(s), 'stabilize')) ? '' : 'disabled')}${s.phase !== 'active' ? `${button('elapse', 'Zeit weiter: 1 volle Runde', 'ct-full')}<small class="ct-muted">Nach dem Kampf bleibt die Rettungszeit stehen, bis du eine volle Runde vergehen lässt.</small>` : ''}</section>`;
    }
    function actorsView(s) {
        const list = [...s.actors].sort((a, b) => ['player', 'ally', 'enemy'].indexOf(a.side) - ['player', 'ally', 'enemy'].indexOf(b.side));
        const concealed=s.rules.boardEnabled&&s.rules.visionEnabled&&s.rules.hideUnseenEnemies;
        const visibility='<div class="ct-controls ct-participant-visibility">'+(concealed?'<label><input type="checkbox" name="showHiddenParticipants" '+(showHiddenParticipants||override?'checked ':'')+(override?'disabled ':'')+'> '+tr('Ausgeblendete Gegner anzeigen','Show hidden enemies')+'</label>':'')+'<span class="ct-muted" role="status">'+(concealed&&!showHiddenParticipants&&!override?tr('Unentdeckte Gegner sind in dieser Liste ausgeblendet.','Undiscovered enemies are hidden in this list.'):tr('Alle Gegner werden angezeigt.','All enemies are shown.'))+'</span></div>'+(concealed?'<p class="ct-muted">'+tr('Die zusätzliche Anzeige gilt nur für diese Figurenverwaltung. Zum Platzieren auf dem Board die Spielleiter-Positionskorrektur verwenden.','The extra visibility applies only to this participant management view. Use GM position correction to deploy on the Board.')+'</p>':'');
        return `<div class="ct-section-heading"><div><h2>Alle Figuren</h2><p>Werte jederzeit bearbeiten. Neue Teilnehmer werden im laufenden Kampf hinten angefügt.</p></div><div class="ct-controls">${button('add', '+ Figur', 'ct-primary')}${button('scan', 'Aus Chat einlesen')}${button('profiles-actors','Figuren importieren')}</div></div>${visibility}<div class="ct-actor-list">${list.map(a => `<article class="ct-actor-row"><div>${avatar(a)}<strong>${esc(a.name)}</strong><small>${sides[a.side]} · ${esc(controls[a.control])} · ${coordinate(a.position)} · ${esc(conditionText(a))}</small>${statusMarkers(s, a, c.preferences().language)}</div><div class="ct-row-hp"><span>${a.hp}/${a.maxHp} HP</span>${hpBar(a)}${presenceMarkup(s,a,c.preferences().language)}</div><div class="ct-muted">DC ${a.dc} · ${esc(a.damage)}${signed(weaponFor(a)?.damageBonus ?? 0)} · Treffer ${signed(a.attackBonus)}</div><div class="ct-controls">${button('edit', 'Bearbeiten', '', `data-id="${esc(a.id)}"`)}${button('actor-menu','Aktionen','',`data-id="${esc(a.id)}"`)}${button('weapons', 'Waffenliste', '', `data-id="${esc(a.id)}"`) + button('skills', 'Fähigkeiten', '', `data-id="${esc(a.id)}"`) + button('actions', 'Aktionsbudget', '', `data-id="${esc(a.id)}"`) + button('supplies', 'Ressourcen & Zustände', '', `data-id="${esc(a.id)}"`)}${button('template', 'Als Vorlage speichern', '', `data-id="${esc(a.id)}"`)}${button('profile-actor','Importieren','',`data-id="${esc(a.id)}"`)}${button('export-actor','Exportieren','',`data-id="${esc(a.id)}"`)}${managementButtons(a)}</div></article>`).join('') || '<p class="ct-muted">Noch keine Figuren vorhanden.</p>'}</div>${s.order.length ? `<h2 class="ct-subheading">Feste Initiative bearbeiten</h2><p class="ct-muted">Die aktuelle Figur behält ihren Zug. Änderungen an Initiativewerten sortieren einen laufenden Kampf nicht neu.</p><div class="ct-order-list">${s.order.map((id, i) => `<div><span>${i + 1}. ${esc(s.actors.find(a => a.id === id)?.name)}</span><div>${button('order-up', '↑', '', `data-id="${esc(id)}" ${i === 0 ? 'disabled' : ''} aria-label="In Initiative nach oben"`)}${button('order-down', '↓', '', `data-id="${esc(id)}" ${i === s.order.length - 1 ? 'disabled' : ''} aria-label="In Initiative nach unten"`)}</div></div>`).join('')}</div>` : ''}`;
    }
    function libraryView() {
        return `<div class="ct-section-heading"><div><h2>Companion-Bibliothek</h2><p>Einmal anlegen, in beliebige Chats übernehmen. Vorlagen starten mit vollen HP und ohne Position.</p></div>${button('add', '+ Figur anlegen', 'ct-primary')}</div><div class="ct-library">${c.library().map(a => `<article class="ct-card"><h2 class="ct-portrait-heading">${avatar(a)}${esc(a.name)}</h2><p>${a.maxHp} HP · DC ${a.dc} · ${esc(a.damage)} ${signed(a.damageBonus)}</p><p class="ct-muted">Trefferbonus ${signed(a.attackBonus)} · ${sides[a.side]}</p>${button('load-template', 'In Kampf übernehmen', 'ct-primary', `data-id="${esc(a.id)}"`)}${button('delete-template', 'Vorlage entfernen', '', `data-id="${esc(a.id)}"`)}</article>`).join('') || '<div class="ct-empty"><strong>Deine Gruppe reist mit.</strong><p>Wähle bei einer Figur „Als Companion speichern“. Die Vorlage steht anschließend in jedem Chat bereit.</p></div>'}</div>`;
    }
    function groupsView(s) {
        const rows = ['player', 'ally', 'enemy'].map(side => {
            const config = { ...s.rules.sideDefaults[side], ...groupDrafts[side] }, members = s.actors.filter(a => a.side === side);
            const individual = members.some(a => a.control !== config.control || a.aiBehavior !== config.aiBehavior);
            return `<div class="ct-group-row"><div><strong>${side === 'ally' ? 'Verbündete' : sides[side]}</strong><small>${members.length} Figuren${individual ? ' · individuelle Einstellungen' : ''}</small></div>${select('Steuerung', `${side}-control`, config.control, controls)}${select('KI-Verhalten', `${side}-aiBehavior`, config.aiBehavior, behaviors)}${button('apply-group', 'Übernehmen', '', `data-side="${side}"`)}</div>`;
        }).join('');
        return `<section class="ct-card ct-group-controls"><div class="ct-section-heading"><div><span class="ct-eyebrow">SPIELER · VERBÜNDETE · GEGNER</span><h2>Gruppensteuerung</h2><p>Eine Auswahl für die ganze Seite. Einzelne Figuren bleiben separat editierbar.</p></div></div><form id="ct-group-form">${rows}<div class="ct-group-footer"><p class="ct-muted">Übernehmen setzt bestehende Figuren dieser Seite und speichert die Vorgabe für neue Figuren.</p>${button('apply-groups', 'Alle Gruppen übernehmen', 'ct-primary')}</div></form></section>`;
    }
    function rulesView(s) {
        const r = ruleEdits.view(c.chatKey(),s.rules);
        const check = (key, title, note) => `<label class="ct-rule"><input name="${key}" type="checkbox" ${r[key] ? 'checked' : ''}><span><strong>${title}</strong><small>${note}</small></span></label>`;
        const hits = check('hitEqual', 'Gleichstand trifft', 'W20 + Attribut + Trefferbonus ≥ DC. Ausgeschaltet: strikt größer als DC.') + check('damageAbility', 'Attribut zum Schaden addieren', 'Zusätzlich zu Würfelformel und Schadensbonus.') + check('natural20', 'Natürliche 1 / 20', '1 verfehlt immer. 20 trifft; kritischen Schaden unten auswählen.') + select('Kritischer Schaden','criticalDamage',r.criticalDamage,{doubleDice:'Doppelte Schadenswürfel',max:'Maximaler normaler Schaden',doubleMax:'Doppelter maximaler Schaden'}) + select('Attributwerte', 'statMode', r.statMode, { scores: 'D&D-Werte: z. B. 14 ergibt +2', bonuses: 'Direkte Boni: +2 direkt eintragen' }) + '<p class="ct-muted">D&D-Werte werden umgerechnet. Direkte Boni werden unverändert verwendet. Boni und DC erlauben bis zu zwei Nachkommastellen; HP, Felder und Anzahlen bleiben ganzzahlig.</p>';
        const terrain = check('heightsEnabled', 'Höhen & Leitern aktiv', 'Wechsel zwischen Höhe 0 und 1 nur über Leitern. Deckung kann zusätzlich auf erhöhten Feldern liegen.') + field('Angriffsbonus gegen tiefere Ziele', 'highAttackBonus', r.highAttackBonus, 'number', 'min="0" max="100"') + field('DC-Bonus gegen tiefere Angreifer', 'highDefenseBonus', r.highDefenseBonus, 'number', 'min="0" max="100"') + field('Bewegungskosten pro Leiter', 'climbCost', r.climbCost, 'number', 'min="1" max="100"') + check('boardEnabled', 'Position und Hindernisse prüfen', 'Nahkampf benachbart, diagonal erlaubt. Fernkampf mit Reichweite und Sichtlinie.') + check('coverCrossable', 'Deckung übersteigen', 'Betreten kostet 2 Bewegungspunkte; du musst noch ein freies Feld erreichen und darfst nicht auf Deckung bleiben.') + check('coverWalkable', 'Auf Deckung stehen (Kompatibilität)', 'Erlaubt belegbare Deckungsfelder wie in älteren Kämpfen. Dann kostet Deckung nur 1 Bewegungspunkt.') + field('Restschaden bei Deckung (%)', 'coverPercent', r.coverPercent, 'number', 'min="0" max="100" required') + coverDistanceMarkup(r,c.preferences().language) + '<p class="ct-muted">Über Deckung kann man schießen; dahinter schützt sie je nach Schussrichtung. Die Reduktion gilt einmal. Mauern blockieren Sicht und Explosionen.</p>' + check('sharePositions', 'Koordinaten und Nähe an KI übergeben', 'Nächste Gegner, Nachbarfelder, Hindernisse und mögliche Ziele.');
        const movement = check('passAllies',tr('Verbündete passieren','Pass through allies'),tr('Durch befreundete Figuren ziehen, aber auf einem freien Feld enden. Normale Wegkosten; gilt für beide Seiten.','Move through friendly participants, but end on a free cell. Normal movement costs; applies to both sides.')) + check('splitMovement', 'Bewegung vor und nach der Aktion', 'Optional: eine Aktion pro Zug. Verbleibende Bewegung kann danach genutzt werden; mit „Zug beenden“ weitergeben. Basic-KI beendet ihre Züge automatisch.') + field('Grundbewegung pro Zug', 'movementBase', r.movementBase, 'number', 'min="1" max="100" required') + select('Attribut für Bewegung', 'movementStat', r.movementStat, { none: 'Kein Attributbonus', ...statLabels(c.preferences().language) }) + '<p class="ct-muted">Grundbewegung + Attributmodifikator + Figurenbonus, mindestens 1 Feld. Das Budget wird erst im nächsten eigenen Zug erneuert. Spielleiter-Korrekturen umgehen das Budget.</p><p class="ct-muted">Fliehen verbraucht am Rand einen Zug und erhält die HP. Vorsichtige Basic-KI versucht bei höchstens 25 % HP zu fliehen; ohne erreichbaren Ausgang kämpft sie weiter.</p>';
        const modules = check('reactionsEnabled','Reaktionen aktiv','Reaktionsanzahl bis zum nächsten eigenen Zug. Vorgabe hier, Abweichung und Kostenquelle je Figur unter Reaktionen & Schilde einstellen.') + field(tr('Reaktionen pro eigenem Zug · Standard','Reactions per own turn · default'),'reactionsPerTurn',r.reactionsPerTurn??1,'number','min="0" max="20"') + check('shieldsEnabled','Schilde aktiv','DC-Bonus, feste Reduktion oder Absorption eines Treffers. Profile pro Figur anlegen.') + field('Schadensreduktion beim Blocken','reactionBlock',r.reactionBlock,'text','inputmode="decimal"') + check('skillsEnabled','Fähigkeiten aktiv','Sonderaktionen ohne HP-Schaden und taktische Zustände.') + check('stancesEnabled','Kampfhaltungen aktiv','Boni und Abzüge gemeinsam unter Haltungen & Effekte einstellen.') + check('perceptionRange','Wahrnehmung erhöht Fernkampfreichweite','Optional: Waffenreichweite + positiver Wahrnehmung-Bonus, abgerundet.') + check('multiActionsEnabled', 'Mehrere Aktionen', 'Freie Aktionen und eingeschränkte Zusatzaktionen pro Figur unter Aktionsbudget einstellen. Ohne diese Regel bleibt es bei einer Aktion.') + button('group-budgets','Standard-Zusatzaktionen für alle') + check('resourcesEnabled', 'Heilung & Ressourcen aktiv', 'Einheiten, Behandlungen und Waffenverbrauch. Ohne Ressourcen bleiben Angriffe wie bisher unbegrenzt.') + check('effectsEnabled', 'Statuseffekte aktiv', 'Gift, Blutung, Brennen, Betäubung und Verlangsamung. Ausschalten pausiert Effekte und ihre Dauer.');
        const rescue = pitRescueRulesMarkup(r,c.preferences().language) + field('Rettungsfrist bei 0 HP (0 = Hardcore)', 'deathRounds', r.deathRounds, 'number', 'min="0" max="1000" required') + '<p class="ct-muted">Standard: 3 volle Runden bis zum Tod. Die angebrochene Runde zählt nicht. Gilt für neue Bewusstlosigkeit auf allen Seiten. Jede Figur kann eine eigene Frist erhalten.</p>';
        const hpRule = check('constitutionHp', 'Konstitution erhöht HP', 'Optional: Basis-HP + zweimal Konstitution-Modifikator, mindestens 1 maximale HP. Neue Figuren verwenden die Regel sofort.') + '<p class="ct-muted">Regeln speichern lässt bestehende HP unverändert. Mit HP-Regel übernehmen werden alle Figuren neu berechnet. Vorhandener Schaden bleibt erhalten, lebende Figuren behalten mindestens 1 HP; Bewusstlose werden nicht geheilt. Ausschalten und Übernehmen stellt die Basis-HP wieder her.</p>' + button('apply-hp', 'HP-Regel übernehmen', 'ct-primary');
        const dice = select('Würfelmodus', 'rngMode', r.rngMode, { crypto: 'Zufallswürfel', seeded: 'Reproduzierbare Würfel mit Seed' }) + field('Seed für reproduzierbare Würfel', 'seed', r.seed) + '<p class="ct-muted">Gleicher Seed + gleiche Würfelreihenfolge = gleiche Würfe. Der Seed und künftige Würfe werden nicht an die KI gesendet.</p>';
        const protocol = '<p>Bei einem Modell mit Werkzeugaufrufen genügt eine normale Aktionsbeschreibung. Sonst gibt die KI einen combat-Block aus; er wird nach der Antwort ausgewertet. Alle Aktionen erscheinen automatisch im Chat. Danach „KI erzählt das Ergebnis“ drücken. Reine Erzähltexte verändern keine HP.</p><code>type: attack / other / stabilize / flee · mode: melee / ranged · actor: Figuren-ID · target: Ziel-ID · turn: Zugtoken</code><p>Fehlerhafte Aktionen halten den Zug an. Du kannst Figuren verschieben, Werte korrigieren oder die Aktion bearbeiten.</p>';
        const ruleFold=(key,...args)=>fold(key,...args).replace('<details','<details data-rule-search-section data-search-terms="'+(key==='rules-modules'?'mana munition ammunition charges':'')+'"');
        const search='<div class="ct-rule-search"><label class="ct-field"><span>'+tr('Regeln durchsuchen','Search rules')+'</span><input type="search" name="rulesSearch" value="'+esc(ruleSearches.get(c.chatKey())??'')+'" placeholder="'+tr('Zum Beispiel: Deckung, Mana, Initiative','For example: cover, mana, initiative')+'"></label>'+button('clear-rule-search',tr('Suche leeren','Clear search'))+'<span data-rule-search-status role="status" aria-live="polite"></span></div>';
        return '<div class="ct-controls">'+button('rules-transfer',tr('Regeln importieren / exportieren','Import / export rules'))+'</div>'+search+'<div data-rule-search-section>'+groupsView(s)+'</div>' + `<form id="ct-rules-form"><div class="ct-section-heading"><div><h2>Deine Kampfregeln</h2><p>Bereiche aufklappen, Werte ändern und gemeinsam speichern.</p></div>${button('save-rules', 'Regeln speichern', 'ct-primary')}</div><div class="ct-rule-sections">${ruleFold('rules-encounter',tr('Verstecken, Friendly Fire & Figurenverwaltung','Hiding, Friendly Fire & participant management'),encounterRulesMarkup(r,c.preferences().language))}${ruleFold('rules-hits', 'Treffer & Schaden', hits, true)}${ruleFold('rules-effects','Haltungen & Effekte',effectRulesMarkup(r,c.preferences().language))}${ruleFold('rules-terrain', 'Spielfeld & Deckung', terrain)}${ruleFold('rules-movement', 'Bewegung', movement)}${ruleFold('rules-hp', 'Konstitution & HP', hpRule)}${ruleFold('rules-modules', 'Heilung, Ressourcen & Effekte', modules)}${ruleFold('rules-rescue', 'Rettung & Zustand', rescue)}${ruleFold('rules-dice', 'Würfel & Seed', dice)}</div></form>${ruleFold('rules-protocol', 'Aktionen aus dem Chat', protocol)}`;
    }

    function preferencesView() {
        const p = c.preferences();
        const sounds = `<label class="ct-rule"><input type="checkbox" name="narrativePersona" ${p.narrativePersona?'checked':''}><span><strong>${tr('Erzählhinweise als Persona-Nachricht','Narrative hints as persona messages')}</strong><small>${tr('Absicht unter deiner aktiven Persona vor dem verbindlichen Ergebnis anzeigen.','Show intent under your active persona before the authoritative result.')}</small></span></label><h3>Sounds</h3><label class="ct-rule"><input type="checkbox" name="soundEnabled" ${p.soundEnabled ? 'checked' : ''}><span><strong>Kampfsounds aktiv</strong><small>Treffer, Fehlschlag, Behandlung, Statuseffekt und neuer Zug. Kurze lokal erzeugte Töne.</small></span></label>${field('Lautstärke (%)', 'soundVolume', p.soundVolume ?? 35, 'range', 'min="0" max="100"')}${button('test-sound', 'Sound testen')}${button('sound-files',tr('Eigene Sounds verwalten','Manage custom sounds'))}<p class="ct-muted">Sounds sind standardmäßig aus. Einschalten oder „Sound testen“ schaltet Audio für diesen Browser frei.</p>`;
        return `<section class="ct-card"><h2>Oberfläche & Sprache</h2><p>Die Sprache gilt für die Oberfläche, neue Chat-Einträge und die gewünschte KI-Erzählung. Vorhandene Chattexte bleiben erhalten.</p>${select('Sprache', 'language', p.language, { de: 'Deutsch', en: 'English' })}${select('Schnellzugriff positionieren', 'quickSide', p.quickSide, { right: 'Rechts', left: 'Links' })}<p class="ct-muted">Du kannst den Kampf-Button auch frei verschieben. Die Position wird gespeichert. Mit Rechts oder Links setzt du ihn wieder an den Rand.</p><label class="ct-rule"><input type="checkbox" name="contextOnClick" ${p.contextOnClick?'checked':''}> Kontextmenü auch per Linksklick öffnen</label><p class="ct-muted">Standard: Linksklick wählt aus, Rechtsklick oder Aktionen öffnet das Menü.</p>${sounds}${compactSettingsMarkup(p,c.preferences().language)}<h3>${tr('KI-Kontext','Model context')}</h3>${field(tr('Kampfverlauf: Anzahl Ereignisse','Combat history: event count'),'contextEventCount',p.contextEventCount??8,'number','min="1" max="30" step="1" required')}<p class="ct-muted">${tr('1 = letzte ausgeführte Aktion mit ihren Folgen. 2–30 = letzte Ereignisse; Standard 8. Aktueller Kampfstand und nötige Zielhilfen bleiben enthalten. Der normale SillyTavern-Chatverlauf wird hier nicht begrenzt.','1 = latest resolved action with its consequences. 2–30 = recent events; default 8. Current combat state and required target guidance remain included. This does not limit the normal SillyTavern chat history.')}</p><h3>Visuelle Rückmeldungen</h3><label class="ct-rule"><input type="checkbox" name="visualEffects" ${p.visualEffects!==false?'checked':''}> Felder kurz hervorheben</label><p class="ct-muted">Treffer rot, Fehlschlag gelb, Heilung grün, Bewegung und neuer Zug türkis. Die Einstellung für reduzierte Bewegung im Browser wird berücksichtigt.</p><h3>Diagnose & Debug</h3><label class="ct-rule"><input type="checkbox" name="debugEnabled" ${p.debugEnabled?'checked':''}> Debug-Modus aktiv</label><p class="ct-muted">Fehler werden lokal erfasst; Debug ergänzt die letzten Bedienaktionen. Maximal 200 Einträge, keine automatische Übermittlung.</p>${button('debug','Debug-Protokoll')}${button('debug-export','Fehlerprotokoll exportieren')}${button('debug-clear','Protokoll leeren')}<h3>Figuren steuern</h3><p>Unter Regeln → Gruppensteuerung stellst du Spieler, Verbündete und Gegner gemeinsam ein. Einzelne Figuren steuerst du unter Figuren → Bearbeiten oder über den Steuerungsbutton bei der aktiven Figur. Die Basic-KI bevorzugt erreichbare Ziele mit wenig HP, berücksichtigt Wege und Sichtlinien und vermeidet eigene Flächentreffer. Unterstützend rettet zuerst erreichbare bewusstlose Verbündete.</p><p>KI-Zug ausführen rechnet genau einen Zug. KI-Züge bis zum manuellen Zug stoppt bei einer manuell gesteuerten Figur, bei Kampfende oder einem Fehler; nach der gewählten Serienlänge (Standard: 20 Züge). Zwischen Aktionen kann gestoppt und später fortgesetzt werden. Die Automatik kann jederzeit gestoppt werden.</p></section>`;
    }
    function logView(s) {
        return `<div class="ct-section-heading"><div><h2>Kampfprotokoll</h2><p>Würfe, Boni, Treffer, HP-Änderungen und manuelle Eingriffe.</p></div>${button('post', 'Letztes Ergebnis im Chat')}</div><div class="ct-log">${[...s.log].reverse().map(e => `<article class="ct-log-entry ct-log-${esc(e.type)}"><span>${e.type === 'hit' ? '✦' : e.type === 'miss' ? '○' : '·'}</span><div><p>${esc(eventText(e, c.preferences().language))}</p><small>${new Date(e.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</small></div></article>`).join('') || '<p class="ct-muted">Das erste Ereignis erscheint hier.</p>'}</div>`;
    }
    function dialog(title, content, onSave, saveLabel = 'Änderungen übernehmen', cancelLabel = 'Abbrechen') {
        editor?.close();
        editor?.remove();
        editor = document.createElement('dialog');
        editor.className = 'ct-ui ct-editor';
        editor.innerHTML = `<form novalidate><header class="ct-section-heading"><h2>${esc(title)}</h2><button type="button" class="ct-button ct-icon" data-cancel aria-label="Schließen">×</button></header><div class="ct-editor-body">${content}</div><p class="ct-editor-error" role="alert"></p><footer class="ct-controls"><button type="button" class="ct-button" data-cancel>${esc(cancelLabel)}</button><button type="submit" class="ct-button ct-primary">${saveLabel}</button></footer></form>`;
        document.body.append(editor);
        for (const b of editor.querySelectorAll('[data-cancel]')) b.addEventListener('click', () => editor.close());
        const currentEditor = editor;
        editor.addEventListener('close', () => { currentEditor.remove(); if (editor === currentEditor) editor = null; });
        bindPeriodicFields(editor.querySelector('form'));
        editor.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault(); const form = event.currentTarget;
            const save = form.querySelector('[type=submit]'); save.disabled = true;
            const previousError=form.querySelector('.ct-editor-error');if(previousError.textContent)previousError.textContent='';
            try { await onSave(form); currentEditor.close(); }
            catch (error) { c.debugRecord('error',{operation:title,message:error.message,stack:error.stack}); form.querySelector('.ct-editor-error').textContent = error.message; for (const panel of form.querySelectorAll('details')) panel.open = true; save.disabled = false; }
        });
        editor.querySelector('form').addEventListener('click',event=>{
            const help=event.target.closest('[data-help-section]');if(help?.dataset.helpSection){openInlineHelp(help.dataset.helpSection);return;}
            const b=event.target.closest('[data-profile-kind]');if(!b?.dataset?.profileKind)return;
            if(b.dataset.profileDirection==='export'){try{downloadJSON(c.exportProfiles(b.dataset.profileKind,b.dataset.profileId),(c.state().actors.find(a=>a.id===b.dataset.profileId)?.name??'Combat')+'-'+b.dataset.profileKind);}catch(error){c.debugRecord('error',{operation:'export',message:error.message});currentEditor.querySelector('.ct-editor-error').textContent=error.message;}}
            else openProfiles(viewController(),dialog,{kind:b.dataset.profileKind,id:b.dataset.profileId});
        });
        editor.showModal();
        return editor;
    }
    function imagePickerMarkup(image, kind) {
        return '<div class="ct-image-picker ' + (kind === 'background' ? 'ct-image-picker-map' : '') + '"><div class="ct-image-preview" data-image-preview>' + (image ? '<img src="' + esc(image.src) + '" alt="" draggable="false">' : '<span>Kein Bild</span>') + '</div><div><label class="ct-field"><span>Bild auswählen</span><input data-image-file type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>' + button('remove-image', 'Bild entfernen', '', 'data-image-remove') + '<p class="ct-muted">PNG, JPEG, WebP oder GIF bis 20 MB. Das Bild wird verkleinert und eingebettet; GIFs werden als Standbild gespeichert.</p><p class="ct-image-status" data-image-status role="status"></p></div></div>';
    }
    function bindImagePicker(d, image, kind, onChange = () => {}) {
        let draft = image, changed = false, loading = false, job = 0;
        const fileInput = d.querySelector('[data-image-file]'), preview = d.querySelector('[data-image-preview]'), status = d.querySelector('[data-image-status]');
        function show() { if (preview) preview.innerHTML = draft ? '<img src="' + esc(draft.src) + '" alt="" draggable="false">' : '<span>Kein Bild</span>'; onChange(draft); }
        const saveButton = () => d.querySelector('[type=submit]');
        fileInput?.addEventListener('change', async event => {
            const file = event.target.files?.[0]; if (!file) return;
            const ticket = ++job; loading = true; if (saveButton()) saveButton().disabled = true; if (status) status.textContent = 'Bild wird vorbereitet …';
            try { const value = await prepareImage(file, kind); if (ticket !== job || !d.open) return; draft = value; changed = true; show(); if (status) status.textContent = 'Bild bereit. Zum Übernehmen speichern.'; }
            catch (error) { if (ticket === job && status) status.textContent = error.message; }
            finally { if (ticket === job) { loading = false; if (saveButton()) saveButton().disabled = false; } }
        });
        d.querySelector('[data-image-remove]')?.addEventListener('click', () => { job++; loading = false; draft = null; changed = true; if (fileInput) fileInput.value = ''; if (status) status.textContent = 'Bild wird beim Speichern entfernt.'; if (saveButton()) saveButton().disabled = false; show(); });
        d.addEventListener('close', () => { job++; });
        return { value: () => { if (loading) throw new Error('Bild wird noch vorbereitet.'); return draft; }, patch: () => { if (loading) throw new Error('Bild wird noch vorbereitet.'); return changed ? { portraitImage: draft } : {}; } };
    }
    function editBackground() {
        const s = c.state(), key = c.chatKey(), initial = s.board.background, image = c.image(initial?.asset);
        const values = { enabled: true, fit: 'contain', scale: 100, x: 0, y: 0, opacity: 90, gridOpacity: 25, ...initial };
        let picker;
        const fields = '<label class="ct-rule"><input type="checkbox" name="enabled" ' + (values.enabled ? 'checked' : '') + '><span><strong>Kartenbild anzeigen</strong></span></label><div class="ct-form-grid">' + select('Bild einpassen', 'fit', values.fit, { contain: 'Ganzes Bild zeigen', cover: 'Spielfeld ausfüllen' }) + field('Bildskalierung (%)', 'scale', values.scale, 'number', 'min="25" max="400" required') + field('Horizontal verschieben (%)', 'x', values.x, 'number', 'min="-100" max="100" required') + field('Vertikal verschieben (%)', 'y', values.y, 'number', 'min="-100" max="100" required') + field('Bilddeckkraft (%)', 'opacity', values.opacity, 'range', 'min="0" max="100"') + field('Rasterdeckkraft (%)', 'gridOpacity', values.gridOpacity, 'range', 'min="0" max="100"') + '</div>' + button('center-image', 'Bild zentrieren', '', 'data-center-image') + '<p class="ct-muted">Das Bild dient als Vorlage. Mauern und Deckung darüber markieren; das Bild selbst verändert weder Sichtlinien noch Bewegung. Verschiebung wird relativ zur Spielfeldgröße gespeichert.</p><div class="ct-background-preview" data-map-preview></div>';
        function config(form) { const result = { enabled: form.elements.enabled.checked, fit: form.elements.fit.value }; for (const k of ['scale', 'x', 'y', 'opacity', 'gridOpacity']) result[k] = Number(form.elements[k].value); return result; }
        const d = dialog('Kartenhintergrund', imagePickerMarkup(image, 'background') + fields, async form => {
            if (c.chatKey() !== key) throw new Error('Chat wurde gewechselt. Aktion erneut im richtigen Chat ausführen.');
            const value = picker.value(); await c.background(value ? { ...config(form), ...(initial ? { asset: initial.asset } : {}), image: value } : null);
            message('Kartenbild gespeichert.');
        });
        const form = d.querySelector('form');
        function preview(value = picker ? picker.value() : image) {
            const area = d.querySelector('[data-map-preview]'); if (!area) return;
            const settings = config(form);
            if (!Number.isFinite(settings.scale) || settings.scale < 25 || settings.scale > 400) settings.scale = 100;
            const positions = new Map(s.actors.filter(a => a.position).map(a => [a.position.x + ',' + a.position.y, a]));
            const cells = []; for (let y = 0; y < s.board.height; y++) for (let x = 0; x < s.board.width; x++) { const a = positions.get(x + ',' + y); cells.push('<span class="ct-cell ' + (isBlocked(s, { x, y }) ? 'ct-blocked' : isCover(s, { x, y }) ? 'ct-cover' : '') + '">' + (a ? avatar(a, 'ct-token') : isBlocked(s, { x, y }) ? '×' : isCover(s, { x, y }) ? '▰' : '') + '</span>'); }
            area.innerHTML = mapSurface(s, cells, Math.max(4, Math.min(28, Math.floor(420 / s.board.width) - 2)), settings, value);
        }
        picker = bindImagePicker(d, image, 'background', value => preview(value));
        form.addEventListener('input', event => { if (event.target.type !== 'file') { try { preview(); } catch { /* File still being decoded. */ } } });
        d.querySelector('[data-center-image]')?.addEventListener('click', () => { form.elements.x.value = 0; form.elements.y.value = 0; preview(); });
        preview();
    }
    function editActor(id, focusControl = false) {
        const chat = c.chatKey(); let picker;
        const s = c.state(), defaults = s.rules.sideDefaults?.enemy ?? { control: 'manual', aiBehavior: 'aggressive' };
        const a = id ? s.actors.find(a => a.id === id) : { name: '', side: 'enemy', maxHp: 20, hp: 20, dc: 12, attackBonus: 0, damageBonus: 0, initiative: 0, attackMode: 'melee', attackStat: 'auto', range: 10, movementBonus: 0, weapons: { melee: { damage: '1d6', radius: 0 }, ranged: null }, ...defaults, deathRounds: null, condition: 'fit', roundsLeft: null, stats: Object.fromEntries(Object.keys(STATS).map(k => [k, s.rules.statMode === 'scores' ? 10 : 0])), notes: '', skills:[], resources:[] };
        const melee = weaponFor(a, 'melee'), ranged = weaponFor(a, 'ranged');
        const general = `<div class="ct-form-grid">${field('Name', 'name', a.name, 'text', 'required maxlength="100"')}${select('Seite', 'side', a.side, sides)}${field('Maximale HP', 'maxHp', a.maxHp, 'number', 'min="1" max="1000000" required')}${field('Basis-HP für Konstitution', 'baseHp', a.baseHp ?? a.maxHp, 'number', 'min="1" max="1000000" required')}${field('Aktuelle HP', 'hp', a.hp, 'number', 'min="0" required')}${field('Verteidigung / DC', 'dc', a.dc, 'number', 'min="0" max="100" required')}${field('Initiative', 'initiative', a.initiative, 'number', 'min="-100000" max="100000" required')}</div>`;
        const hpHelp = `<p class="ct-muted">Basis-HP sind die HP ohne Konstitution. Maximale HP bleiben bis zum ausdrücklichen Übernehmen editierbar. Aktuell übernommener Konstitution-Bonus: ${signed(a.constitutionHpBonus ?? 0)}.</p>${s.rules.constitutionHp ? `<label class="ct-rule"><input name="applyConstitutionHp" type="checkbox" ${id ? '' : 'checked'}><span><strong>Konstitution-HP beim Speichern übernehmen</strong><small>Basis-HP + zweimal Konstitution-Modifikator. Bestehender Schaden bleibt erhalten; 0 HP bleiben 0.</small></span></label>` : ''}`;
        const control = aiOptionsMarkup(a,c.preferences().language)+`<div class="ct-form-grid">${select('Steuerung', 'control', a.control ?? 'manual', controls)}${select('KI-Verhalten', 'aiBehavior', a.aiBehavior ?? 'aggressive', behaviors)}</div><p class="ct-muted">Basic-KI bewegt und handelt. DM-Vorschläge warten auf deine Bestätigung. Unterstützend rettet zuerst erreichbare Verbündete. Vorsichtig versucht bei höchstens 25 % HP zu fliehen.</p>`;
        const weapons = `<p class="ct-muted">Diese Felder bearbeiten jeweils das erste Profil einer Art. Weitere Waffen, Zauber und Munition verwaltest du über Waffenliste an der Figurenkarte.</p><div class="ct-weapon-grid"><section><h3>Nahkampf</h3>${field('Waffenname', 'meleeName', melee?.name ?? tr('Nahkampf','Melee'), 'text', 'maxlength="100"')}${field('Nahkampf-Würfel (leer = keine Waffe)', 'meleeDamage', melee?.damage ?? '', 'text', 'placeholder="1d8"')}${field('Nahkampf-Schadensbonus', 'meleeBonus', melee?.damageBonus ?? a.damageBonus ?? 0, 'number', 'min="-100" max="100" required')}${field('Nahkampf-Flächenradius', 'meleeRadius', melee?.radius ?? 0, 'number', 'min="0" max="10"')}${weaponExtras(a, melee, 'melee', c.preferences().language)}</section><section><h3>Fernkampf</h3>${field('Waffenname', 'rangedName', ranged?.name ?? tr('Fernkampf','Ranged'), 'text', 'maxlength="100"')}${field('Fernkampf-Würfel (leer = keine Waffe)', 'rangedDamage', ranged?.damage ?? '', 'text', 'placeholder="1d6"')}${field('Fernkampf-Schadensbonus', 'rangedBonus', ranged?.damageBonus ?? a.damageBonus ?? 0, 'number', 'min="-100" max="100" required')}${field('Fernkampf-Flächenradius', 'rangedRadius', ranged?.radius ?? 0, 'number', 'min="0" max="10"')}${field('Fernkampfreichweite (Felder)', 'range', a.range, 'number', 'min="1" max="100" required')}${weaponExtras(a, ranged, 'ranged', c.preferences().language)}</section></div><div class="ct-form-grid">${field('Trefferbonus (+1, +2, …)', 'attackBonus', a.attackBonus, 'number', 'min="-100" max="100" required')}${select('Standard-Angriffsart', 'attackMode', a.attackMode, { melee: 'Nahkampf', ranged: 'Fernkampf' })}${select('Standard-Attribut', 'attackStat', a.attackStat, { auto: 'Höheres STR oder DEX', ...statLabels(c.preferences().language) })}</div><p class="ct-muted">Leerer Würfel entfernt die Waffe. Würfel: W4, W6, W8, W10, W12, W20, W100; zum Beispiel 2d6+1.</p>`;
        const stats = `<div class="ct-attribute-grid">${Object.entries(statLabels(c.preferences().language)).map(([k, label]) => field(`${label}${s.rules.statMode === 'scores' ? ` (${signed(modifier(a.stats[k]))})` : ''}`, `stat-${k}`, a.stats[k], s.rules.statMode==='bonuses'?'text':'number', `inputmode="decimal" min="${s.rules.statMode === 'scores' ? 1 : -100}" max="${s.rules.statMode === 'scores' ? 40 : 100}" required`)).join('')}</div>`;
        const movement = `${field('Zusätzlicher Bewegungsbonus', 'movementBonus', a.movementBonus ?? 0, 'number', 'min="-100" max="100" required')}<p class="ct-muted">Grundbewegung und Bewegungsattribut stellst du unter Regeln ein. Der Figurenbonus kommt hinzu.</p>`;
        const rescue = `<div class="ct-form-grid">${field('Eigene Rettungsfrist (leer = Kampfregel)', 'deathRounds', a.deathRounds ?? '', 'number', 'min="0" max="1000"')}${select('Zustand bei 0 HP', 'condition', a.hp > 0 ? 'auto' : a.condition, { auto: 'Nach Rettungsregel entscheiden', unconscious: 'Bewusstlos · Countdown läuft', stabilized: 'Stabilisiert · kampfunfähig', dead: 'Tot' })}${field('Verbleibende Runden (nur bewusstlos)', 'roundsLeft', a.roundsLeft ?? '', 'number', 'min="1" max="1000"')}</div>`;
        const tactics='<p class="ct-muted">'+tr('Klassische und taktische Effekte unter Ressourcen & Zustände gemeinsam verwalten.','Manage classic and tactical effects together under Resources & statuses.')+'</p>';
        const content = (id?profileToolbar('actor',id,c.preferences().language):'') + foldMarkup('actor-general', 'Allgemeines', general + hpHelp, !focusControl, 'Name, Seite, HP und Initiative') + foldMarkup('actor-portrait', 'Figurenbild', imagePickerMarkup(actorImage(a), 'portrait'), Boolean(a.portrait)) + foldMarkup('actor-control', 'Steuerung & KI', control, true, controls[a.control] ?? 'Manuell') + foldMarkup('actor-weapons', 'Waffen & Angriffe', weapons, false, `${melee?.damage ?? '—'} / ${ranged?.damage ?? '—'}`) + foldMarkup('actor-skills','Fähigkeiten','<div data-actor-skills>'+skillsMarkup(a,a.skills??[],c.preferences().language,s.rules)+'</div>',false,'Verfügbare Sonderaktionen für diese Figur') + traitsMarkup(a,c.preferences().language) + foldMarkup('actor-defense','Reaktionen & Schilde','<div data-defense>'+defenseMarkup(a,c.preferences().language,s.rules)+'</div>') + foldMarkup('actor-stats', 'Attribute', stats, false, s.rules.statMode === 'scores' ? 'Modifikatoren werden berechnet' : 'Direkte Attributboni') + foldMarkup('actor-movement', 'Bewegung', movement) + foldMarkup('actor-rescue', 'Rettung & Zustand', rescue+tactics, a.hp === 0, conditionText(a, c.preferences().language)) + foldMarkup('actor-notes', 'Notizen', `<label class="ct-field"><span>Notizen</span><textarea name="notes" rows="3" maxlength="2000">${esc(a.notes)}</textarea></label>`);
        let skillDraft,defenseDraft,customPermissionOverride=false;
        const d = dialog(id ? `${a.name} bearbeiten` : 'Figur hinzufügen', content, async form => {
            if (c.chatKey() !== chat) throw new Error('Chat wurde gewechselt. Aktion erneut im richtigen Chat ausführen.');
            const data = new FormData(form), v = { ...Object.fromEntries(data), ...picker.patch() };
            v.weapons = { melee: v.meleeDamage.trim() ? { name: String(data.get('meleeName') ?? melee?.name ?? '').trim() || melee?.name || tr('Nahkampf','Melee'), damage: v.meleeDamage, radius: Number(v.meleeRadius), damageBonus: v.meleeBonus } : null, ranged: v.rangedDamage.trim() ? { name: String(data.get('rangedName') ?? ranged?.name ?? '').trim() || ranged?.name || tr('Fernkampf','Ranged'), damage: v.rangedDamage, radius: Number(v.rangedRadius), damageBonus: v.rangedBonus } : null };
            Object.assign(v,readTraits(data,a));v.aiConfig=readAIOptions(data,a);
            for (const mode of ['melee', 'ranged']) if (v.weapons[mode]) {if(data.has(mode+'DamageType'))v.weapons[mode].damageType=data.get(mode+'DamageType'); v.weapons[mode].standard = readStandard(data, mode, a.weapons?.[mode]?.standard); v.weapons[mode].effects = readEffects(data, mode + '-effect', a.weapons?.[mode]?.effects); v.weapons[mode].cost=Number(data.get(mode+'Cost')??a.weapons?.[mode]?.cost??1);v.weapons[mode].resource = data.has(mode + 'Resource') ? data.get(mode + 'Resource') || null : a.weapons?.[mode]?.resource ?? null; }
            if (v.condition === 'auto') delete v.condition;
            if (v.roundsLeft === '') delete v.roundsLeft;
            v.applyConstitutionHp = v.applyConstitutionHp === 'on';
            if (!v.applyConstitutionHp && Number(v.baseHp) === (a.baseHp ?? a.maxHp) && Number(v.maxHp) !== a.maxHp)
                v.baseHp = Math.max(1, Number(v.maxHp) - (a.constitutionHpBonus ?? 0));
            if(data.has('tacticFields'))v.tactics=(a.tactics??[]).filter((_v,i)=>data.has('keepTactic-'+i));
            v.skills=skillDraft.get();Object.assign(v,defenseDraft.get());if(!customPermissionOverride)Object.assign(v,customReactionPatch(v.skills,v.reactionChoices,a.skills??[]));
            v.stats = Object.fromEntries(Object.keys(STATS).map(k => [k, v[`stat-${k}`]]));
            if (id) await c.edit(id, v); else { const actor = await c.add(v); selected = actor.id; }
            message('Figur gespeichert.');
        });
        skillDraft=bindSkills(d.querySelector('[data-actor-skills]'),a,c.preferences().language,s.rules);defenseDraft=bindDefense(d.querySelector('[data-defense]'),a,c.preferences().language,s.rules);
        d.querySelector('form').addEventListener('change',event=>{
            if(event.target.name==='reaction-narrative')customPermissionOverride=true;
            if(/^skill-\d+-reaction$/.test(event.target.name??'')&&event.target.checked&&!event.target.disabled){const permission=d.querySelector('form').querySelector('[name="reaction-narrative"]');if(permission)permission.checked=true;customPermissionOverride=false;}
        });
        bindAIOptions(d.querySelector('form'));
        picker = bindImagePicker(d, actorImage(a), 'portrait');
        if (!id) d.addEventListener('change', event => {
            if (event.target.name !== 'side') return;
            const defaults = c.state().rules.sideDefaults[event.target.value], form = d.querySelector('form');
            form.elements.control.value = defaults.control; form.elements.aiBehavior.value = defaults.aiBehavior;
        });
    }

    async function perform(intent, options = {}) {
        const performedChat=c.chatKey();
        try {
            if(intent.type!=='check'&&intent.description===undefined&&actionDraft.trim())intent={...intent,description:actionDraft};
            const result = await c.act(intent, options);
            if (result?.cancelled) {notice='';boardNotice=tr('Angriff abgebrochen; nichts verbraucht.','Attack cancelled; nothing spent.');boardNoticeKind='info';return;}
            actionDraft = ''; localPending = null; c.clearPending();
            const live=c.state(),latest=latestResult(live.log).event,feedback=compactResultFeedback(result,c.preferences().language);
            if(performedChat===c.chatKey()&&feedback&&JSON.stringify(latest?.details)===JSON.stringify(result))abilityFeedback={key:c.chatKey()+':'+live.revision,...feedback,result:structuredClone(result)};
            notice='';
            if(!abilityFeedback){boardNotice=result?.duplicate?tr('Aktion bereits ausgeführt; nichts erneut verbraucht.','Action already resolved; nothing spent again.'):tr('Aktion abgeschlossen.','Action completed.');boardNoticeKind='info';}
        }
        catch (error) { localPending = { intent, options, reason: error.message }; throw error; }
    }
    root.addEventListener('input', event => { if(event.target.name==='rulesSearch'){ruleSearches.set(c.chatKey(),event.target.value);applyRuleSearch(root,event.target.value,c.preferences().language);return;}stageRuleInput(event.target);const checkActor=currentActor(c.state());if(checkActor)checkDrafts.update(c.chatKey(),checkActor,event.target,c.state());if(event.target.name==='skillCarryCell'){skillCarryCell=event.target.value;skillCarrierCell='';}if (['description', 'otherDescription'].includes(event.target.name)) actionDraft = event.target.value; if (event.target.name === 'damageOverride') damageDraft = event.target.value; if (event.target.name === 'radiusOverride') { areaDraft = event.target.value; } });
    root.addEventListener('change', async event => {
        if (stageRuleInput(event.target)) return;
        const checkActor=currentActor(c.state());if(checkActor&&checkDrafts.update(c.chatKey(),checkActor,event.target,c.state())){render();return;}
        const n = event.target.name;
        if(n==='showHiddenParticipants'){showHiddenParticipants=Boolean(event.target.checked);render();return;}
        if(n==='compactUI'){await c.preferences({compactUI:event.target.checked});render();return;}
        if(n?.startsWith('compact-')){const key=n.slice(8);if(['movement','batch','stance'].includes(key)){await c.preferences({compactSections:{...compactPreferences(c.preferences()).compactSections,[key]:event.target.checked}});render();return;}}
        if(n==='contextOnClick'){await c.preferences({contextOnClick:event.target.checked});render();}
        if(n==='aiBatchSize'){await c.preferences({aiBatchSize:Number(event.target.value)});render();}
        if(n==='showVision'){await c.preferences({showVision:event.target.checked});render();return;}
        if(n==='visualEffects'){await c.preferences({visualEffects:event.target.checked});flashes.clear();render();}
        if(n==='skillCarryCell'){skillCarryCell=event.target.value;skillCarrierCell='';render();return;}
        if(n==='skillCarrierCell'){skillCarrierCell=event.target.value;render();return;}
        if (n === 'freeRemark') {freeRemark=event.target.checked;render();}
        if (n === 'skill' || n === 'skillApplication' || n === 'skillTarget' || n === 'skillWeapon' || n === 'skillDestination') { if(n==='skill'||n==='skillApplication'){skillId=event.target.value;skillTarget='';}else if(n==='skillTarget')skillTarget=event.target.value;else if(n==='skillWeapon')skillWeapon=event.target.value;else {skillDestination=event.target.value;const [x,y]=skillDestination.split(',').map(Number);if(currentActor(c.state())?.skills.find(v=>v.id===skillId)?.kind==='carry')skillCarryCell=coordinate({x,y});}render(); }
        if (n === 'stance') await run(()=>c.stance(currentActor(c.state()).id,event.target.value,turnToken(c.state())));
        if (n === 'otherKind') { otherKind = event.target.value; render(); }
        if(n==='manualUnlimited'){await run(()=>c.unlimited(currentActor(c.state()).id,event.target.checked,turnToken(c.state())));return;}
        if(n==='hideDeadParticipants'){await c.preferences({hideDeadParticipants:event.target.checked});render();return;}
        if(n==='contextEventCount'){await run(()=>c.preferences({contextEventCount:Number(event.target.value)}));return;}
        if(n==='narrativePersona'){await c.preferences({narrativePersona:event.target.checked});render();return;}
        if (n === 'soundEnabled' || n === 'soundVolume') { try { await c.preferences({ [n]: n === 'soundEnabled' ? event.target.checked : Number(event.target.value) }); await sound.unlock(); render(); } catch (error) { message(error.message, 'error'); } }
        if (n === 'resource') {resource = event.target.value;healCenterMode='actor';}if(n==='healCenterMode')healCenterMode=event.target.value;if(n==='healX')healX=Number(event.target.value);if(n==='healY')healY=Number(event.target.value);
        if (n === 'resourceTarget') resourceTarget = event.target.value;
        if (n === 'treatmentActor') treatmentActor = event.target.value;
        if (['resource', 'resourceTarget', 'treatmentActor','healCenterMode','healX','healY'].includes(n)) render();
        const groupField = /^(player|ally|enemy)-(control|aiBehavior)$/.exec(n);
        if (groupField) { (groupDrafts[groupField[1]] ??= {})[groupField[2]] = event.target.value; }
        if (n === 'override') {override = event.target.checked;flashes.clear();}
        if (n === 'zoom') await run(() => c.view({ zoom: Number(event.target.value), fit: false }));
        if (n === 'target') { target = event.target.value; render(); }
        if (n === 'stat') { stat = event.target.value; render(); }
        if (n === 'coverFacing') { coverFacing = event.target.value; render(); }
        if (n === 'weapon' || n === 'mode' || n === 'variant') { if (n === 'weapon') { weaponId = event.target.value; mode = listWeapons(c.state().actors.find(v => v.id === modeActor)).find(w => w.id === weaponId)?.mode ?? 'melee'; variant = 'profile'; } else if (n === 'mode') { weaponId = listWeapons(c.state().actors.find(v => v.id === modeActor)).find(w => w.mode === event.target.value)?.id ?? ''; mode = event.target.value; variant = 'profile'; } else variant = event.target.value; const w = weaponFor(c.state().actors.find(v => v.id === modeActor), mode, variant, weaponId); damageDraft = w?.damage ?? ''; damageProfile = damageDraft; areaDraft = w?.radius ?? 0; areaProfile = areaDraft; render(); }
        if (n === 'radiusOverride') render();
        if (n === 'language' || n === 'quickSide') { try { await c.preferences({ [n]: event.target.value }); } catch (error) { message(error.message, 'error'); } }
        if (n === 'debugEnabled') { await c.preferences({debugEnabled:event.target.checked});render(); }
        if (n === 'helper') helper = event.target.value;
        if (n === 'reviveHelper') {reviveHelper=event.target.value;skillId='';render();}
        if (n === 'rescueTarget') rescueTarget = event.target.value;
        if (n === 'override') render();
    });
    root.addEventListener('click', async event => {
        const help=event.target.closest('[data-help-section]');if(help?.dataset.helpSection){openInlineHelp(help.dataset.helpSection);return;}
        if (boardPaint?.consumeClick(event)||boardDrag?.consumeClick(event)) return;
        const b = event.target.closest('[data-action]');
        if (!b || b.disabled || ((busy || c.modelBusy()) && !['close', 'stop-ai', 'cancel-request', 'debug', 'debug-export', 'debug-clear', 'diagnostics'].includes(b.dataset.action))) return;
        const action = b.dataset.action, id = b.dataset.id, s = c.state();
        if(id&&!override&&!participantManagement()&&!playerView(s).actors.some(a=>a.id===id))return;
        lastUIAction=action;c.debugRecord('ui',{action,id});
        sound.unlock();
        if(action==='show-last-result'){folds.set('result-details',true);const details=root.querySelector('details[data-fold="result-details"]');if(details)details.open=true;root.querySelector('.ct-last-result')?.scrollIntoView?.({block:'start',behavior:'smooth'});return;}
        if(action==='free-roll'){await run(()=>c.freeRoll(Number(b.dataset.sides)));return;}
        if(action==='reserve-toggle'){event.preventDefault?.();await c.preferences({reserveCollapsed:!c.preferences().reserveCollapsed});render();return;}
        if(action==='terrain-toggle'){event.preventDefault?.();if(blockMode||ladderStart||boardPaint?.pending())return;terrainToolsOpen=!terrainToolsOpen;render();return;}
        if(action==='dismiss-board'){boardNotice='';abilityFeedback=null;render();return;}
        if(action==='restore-actors'){openRestore(viewController(),dialog,id??'');return;}
        if(action==='save-check-ability'){const a=currentActor(s),draft=structuredClone(checkDrafts.get(c.chatKey(),a.id)),chat=c.chatKey();dialog(tr('Eigene Fähigkeit speichern','Save custom ability'),field(tr('Name','Name'),'abilityName',draft.description.slice(0,70)||tr('Eigene Fähigkeit','Custom ability'),'text','required maxlength="100"'),async f=>{if(c.chatKey()!==chat)throw Error(tr('Chat wurde gewechselt.','Chat changed.'));await c.edit(a.id,{skills:[...c.state().actors.find(v=>v.id===a.id).skills,narrativeFromCheck(draft,f.elements.abilityName.value)]});},tr('Fähigkeit speichern','Save ability'));return;}
        if (action === 'cancel-request') { c.cancelRequest(); return; }
        if (action === 'test-sound') { if (!c.preferences().soundEnabled) await c.preferences({ soundEnabled: true }); await sound.unlock(); sound.play('hit'); sound.play('turn'); return; }
        if (action === 'profiles') {openProfiles(viewController(),dialog);return;}
        if (action === 'profiles-actors') {openProfiles(viewController(),dialog,{kind:'actors'});return;}
        if(action==='combat-name'){dialog('Kampfname',field('Name (optional)','combatName',s.name??'','text','maxlength="200"')+'<p class="ct-muted">Wird mit dem Kampf gespeichert und als Export-Dateiname verwendet. Leer: kampf.json.</p>',f=>c.name(f.elements.combatName.value),'Speichern');return;}
        if (action === 'export-actor') {downloadJSON(c.exportProfiles('actor',id),(s.actors.find(a=>a.id===id)?.name??'Participant')+'-actor');return;}
        if (action === 'profile-actor') {openProfiles(viewController(),dialog,{kind:'actor',id});return;}
        if (action === 'debug-clear') {c.debugClear();message('Debug-Protokoll geleert.');return;}
        if (action === 'debug-export') {exportDebug();return;}
        if (action === 'debug') {dialog('Debug-Protokoll','<p>Fehler und letzte Bedienaktionen · lokal · maximal 200 Einträge.</p><button type="button" class="ct-button" data-debug-download>Fehlerprotokoll exportieren</button><button type="button" class="ct-button" data-debug-clear>Protokoll leeren</button><label class="ct-field"><span>Protokoll</span><textarea rows="16" readonly data-debug-text>'+esc(c.debugText())+'</textarea></label>',()=>{},'Schließen').querySelector('form').addEventListener('click',event=>{if(event.target.closest('[data-debug-download]'))exportDebug();if(event.target.closest('[data-debug-clear]')){c.debugClear();editor.querySelector('[data-debug-text]').value=c.debugText();}});return;}
        if(action==='reset-map'){dialog('Karte zurücksetzen','<p>Gelände und Kartenbild entfernen. Größe und Figurenwerte bleiben erhalten; Figuren werden vom Feld genommen. Ein laufender Kampf wird beendet. Rückgängig ist möglich.</p>',()=>c.reset('map'),'Karte zurücksetzen');return;}
        if (action === 'group-budgets') {openActions(viewController(),{name:'Gruppen',actionsPerTurn:1,...(s.rules.budgetDefaults?.player??s.rules.budgetDefaults?.ally??s.rules.budgetDefaults?.enemy??{actionsPerTurn:1,bonusActions:[]})},dialog,{groups:true});return;}
        if (action === 'reset') { const key=c.chatKey();dialog('Szenario zurücksetzen',select('Bereich','scope','map',{map:'Karte leeren: Gelände und Bild entfernen; Figuren neu platzieren',actors:'Figurenliste leeren: Karte erhalten',all:'Neues Szenario: Figuren, Karte und Kampfprotokoll leeren'}) + '<p>Beendet einen laufenden Kampf. Kampfregeln, Companion- und Kartenbibliothek bleiben erhalten. Rückgängig ist möglich.</p>',async form=>{if(c.chatKey()!==key)throw new Error('Chat wurde gewechselt.');await c.reset(form.elements.scope.value);},'Auswahl zurücksetzen');return;}
        if (action === 'skills') {const a=s.actors.find(v=>v.id===id);if(a)openSkills(viewController(),a,dialog);return;}
        if (action === 'maps') { openMaps(c, dialog); return; }
        const actionDescription = root.querySelector('[name=description]')?.value ?? actionDraft;
        const otherDescription = root.querySelector('[name=otherDescription]')?.value ?? actionDraft;
        const actionDamage = root.querySelector('#ct-action-form')?.elements.damageOverride?.value ?? damageDraft;
        const actionRadius = root.querySelector('#ct-action-form')?.elements.radiusOverride?.value ?? areaDraft;
        const groupsForm = root.querySelector('#ct-group-form'), groupsData = groupsForm ? new FormData(groupsForm) : null;
        const rulesData = root.querySelector('#ct-rules-form') ? new FormData(root.querySelector('#ct-rules-form')) : null;
        if (action.startsWith('tab-')) { tab = action.slice(4); render(); return; }
        if (action === 'close') { root.close(); return; }
        if (action === 'dismiss') { notice = ''; render(); return; }
        if(action==='clear-rule-search'){ruleSearches.delete(c.chatKey());const input=root.querySelector('[name=rulesSearch]');if(input)input.value='';applyRuleSearch(root,'',c.preferences().language);return;}
        if (action === 'discard-rules') { ruleEdits.discard(c.chatKey()); render(); return; }
        if(action==='center-active'||action==='center-selected'){const a=action==='center-active'?currentActor(s):s.actors.find(v=>v.id===selected);camera.center(a?.position,zoom);return;}
        if(action==='actor-menu'){openActorContext(id);return;}
        if (action === 'select') { selected=id;render();if(c.preferences().contextOnClick&&s.actors.find(a=>a.id===id)?.position)openActorContext(id);return; }
        if (action === 'weapons' || action === 'actions') { const actor = s.actors.find(v => v.id === id); if (actor) (action === 'weapons' ? openWeapons : openActions)(c, actor, dialog); return; }
        if (action === 'supplies') { const actor = s.actors.find(v => v.id === id); if (actor) openSupplies(viewController(), actor, dialog); return; }
        if (['add', 'edit', 'edit-control'].includes(action)) { editActor(id, action === 'edit-control'); return; }
        if (['pit-mode','block-mode','cover-mode','height-mode','ladder-mode','erase-mode'].includes(action)) { const kind = ({ 'pit-mode':'pit','block-mode':'wall', 'cover-mode':'cover', 'height-mode':'height', 'ladder-mode':'ladder', 'erase-mode':'erase' })[action]; ladderStart = null; blockMode = !(blockMode && terrainType === kind); terrainType = kind; render(); return; }
        if (action === 'stop-ai') { c.stopAI(); return; }
        if (action === 'narrate' || action === 'propose') { if (action === 'propose') localPending = null; if (modal && root.open) root.close(); await run(() => action === 'narrate' ? c.narrate() : c.propose()); if (noticeKind === 'error' && modal && !root.open) root.showModal(); return; }
        if(action==='rules-transfer'){openRuleTransfer(c,dialog,()=>{ruleEdits.discard(c.chatKey());render();});return;}
        if(action==='terrain-appearance'){openTerrainAppearance(c,dialog);return;}
        if(action==='sound-files'){openSoundFiles(c,dialog);return;}
        if(action==='random-encounter'){if(['active','paused'].includes(c.state().phase))throw Error(tr('Kampf zuerst stoppen.','Stop combat first.'));openRandomEncounter(c,dialog,()=>{override=false;selected='';message(tr('Zufallsbegegnung aufgestellt.','Random encounter deployed.'));});return;}
        if (action === 'map-background') { editBackground(); return; }
        if (action.startsWith('zoom-')) {
            const next = action === 'zoom-fit' ? fittedZoom(s) : action === 'zoom-reset' ? 44 : Math.max(2, Math.min(96, zoom + (action === 'zoom-in' ? 1 : -1) * (zoom < 20 ? 2 : 8)));
            await run(() => c.view({ zoom: next, fit: action === 'zoom-fit' })); return;
        }
        if(action==='random-place'){
            const d=dialog(tr('Zufällige Figurenaufstellung','Random participant deployment'),deploymentMarkup(s,c.preferences().language),f=>c.randomPlace({mode:f.elements.placementMode.value,partyFormation:f.elements.partyFormation.value,enemyFormation:f.elements.enemyFormation.value,scope:f.elements.placementScope.value,seed:f.elements.placementSeed.value,ids:new FormData(f).getAll('placeActor')}),tr('Aufstellen','Deploy'));bindDeployment(d);return;
        }
        if (action === 'random-map') {
            const d=dialog('Zufällige Karte', '<p>Figuren bleiben stehen. Wege zwischen ihnen bleiben frei. Vorhandenes Gelände wird ersetzt.</p>' + select('Kartentyp', 'preset', s.board.mapSeed ? s.board.preset : 'forest', { dungeon:'Dungeon · verbundene Räume und Gänge', forest: 'Wald · Baumgruppen und Deckung', open: 'Offene Fläche · wenige Hindernisse', cliff:tr('Klippe','Cliff'),castle:'Burgmauer · erhöhte Wehrgänge und Leitern', city: 'Stadt · Häuser, Dächer und Straßen', indoor: 'Innenraum · Möbel, Säulen und Türen', custom: 'Eigene Verteilung' }) + '<div data-map-option="cliff">'+select(tr('Klippen-/Küstenform','Cliff / coast shape'),'cliffForm',s.board.cliffForm??'random',{random:tr('Zufällig','Random'),coast:tr('Unregelmäßige Küste','Irregular coast'),bridge:tr('Mittelsteg / Landbrücke','Central land bridge'),hole:tr('Loch in der Mitte','Central hole'),'edge-hole':tr('Loch am Rand','Edge hole'),island:tr('Innenfläche mit Abgrund ringsherum','Interior with surrounding abyss'),headland:tr('Zulaufende Felszunge','Tapering headland')})+select(tr('Zusätzliche Hindernisse','Additional obstacles'),'cliffScenery',s.board.cliffScenery??'open',{open:tr('Offene Fläche','Open ground'),scattered:tr('Hindernisse und Deckung','Obstacles and cover')})+'</div><div data-map-option="forest">'+select(tr('Waldaufteilung','Forest layout'),'forestStyle',s.board.forestStyle??'groves',{light:tr('Lichter Wald','Light woodland'),groves:tr('Baumgruppen und Lichtungen','Tree clusters and clearings'),dense:tr('Dichter Wald','Dense forest'),path:tr('Wald mit Weg','Forest trail')})+'<p class="ct-muted">'+tr('Bäume bilden Gruppen; Deckung steht mit Abstand. Der Waldweg bleibt frei.','Trees form clusters; cover is spaced apart. The forest trail stays clear.')+'</p></div><div data-map-option="dungeon">'+select('Dungeon-Raumgröße','roomScale',s.board.roomScale??'mixed',{mixed:'Gemischte Räume und einzelne große Hallen',large:'Große Räume und Hallen'})+'</div>' + field('Karten-Seed (optional)', 'mapSeed', '', 'text', 'placeholder="Leer: neue Zufallskarte"') + '<p class="ct-muted">Leer erzeugt eine neue Karte. Mit demselben Seed lässt sie sich wiederholen. Aktueller Seed: ' + esc(s.board.mapSeed || '—') + '</p><div data-map-option="custom">' + foldMarkup('map-density', 'Eigene Dichte', '<p class="ct-muted">Diese Werte gelten für Eigene Verteilung.</p><div class="ct-form-grid">' + field('Mauern (%)', 'wallPercent', 12, 'number', 'min="0" max="60" required') + field('Deckung (%)', 'coverDensity', 18, 'number', 'min="0" max="60" required') + '</div>')+'</div>', f => c.randomBoard({ preset: f.elements.preset.value,...(f.elements.preset.value==='cliff'?{cliffForm:f.elements.cliffForm.value,cliffScenery:f.elements.cliffScenery.value}:{}),...(f.elements.preset.value==='forest'?{forestStyle:f.elements.forestStyle.value}:{}),...(f.elements.preset.value==='dungeon'?{roomScale:f.elements.roomScale.value}:{}), seed: f.elements.mapSeed.value, ...(f.elements.preset.value === 'custom' ? { wallPercent: Number(f.elements.wallPercent.value), coverPercent: Number(f.elements.coverDensity.value) } : {}) }), 'Karte erzeugen');bindMapOptions(d);return;
        }
        if (action === 'diagnostics') {
            const d = c.diagnostics();
            dialog('KI-Kontext prüfen', `<p class="ct-diagnostic-status">${esc(d.label)}</p><p class="ct-muted">${d.queued ? `${d.queued} Chat-Einträge warten auf das Ende der laufenden Antwort. ` : ''}Diese Prüfung zeigt, ob der Kampfkontext im vorbereiteten Aufruf enthalten war. Ob die KI ihn beachtet, hängt zusätzlich vom Modell und deinem Prompt ab.</p><label class="ct-field"><span>Aktuell registrierter Kampfkontext</span><textarea name="prompt" rows="16" readonly>${esc(d.prompt)}</textarea></label>`, () => {}, 'Schließen'); return;
        }
        if(action==='defense'){openDefense(viewController(),s.actors.find(a=>a.id===id),dialog);return;}
        if (action === 'board-size') {
            dialog('Spielfeldgröße', `<div class="ct-form-grid">${field('Breite (2–50)', 'width', s.board.width, 'number', 'min="2" max="50" required')}${field('Höhe (2–50)', 'height', s.board.height, 'number', 'min="2" max="50" required')}</div><p class="ct-muted">Figuren außerhalb einer kleineren Fläche zuerst vom Feld nehmen. Hindernisse außerhalb werden entfernt.</p>`, async f => {
                const width = Number(f.elements.width.value), height = Number(f.elements.height.value);
                await c.board(cleanTerrain(s.board, { width, height, blocked: s.board.blocked.filter(p => p.x < width && p.y < height), cover: (s.board.cover ?? []).filter(p => p.x < width && p.y < height) }));
            }); return;
        }
        if (action === 'start') {
            const missing = s.actors.filter(a => isCombatant(a) && !a.position);
            if(s.rules.boardEnabled&&missing.length){const d=dialog(tr('Nicht alle Figuren sind platziert','Not all participants are placed'),'<p>'+tr('Mit den platzierten Figuren starten? In Reserve bleiben: ','Start with placed participants? Remaining in reserve: ')+(missing.filter(a=>override||publicValue(s,a)).map(a=>esc(a.name)).join(', ')||tr('Weitere unentdeckte Figuren','Additional unseen participants'))+'</p><label><input type="checkbox" name="roll">'+tr('Initiative würfeln','Roll initiative')+'</label>',f=>c.start(f.elements.roll.checked,{allowUnplaced:true}),tr('Mit platzierten Figuren starten','Start with placed participants'),tr('Zur Aufstellung zurück','Back to deployment'));d.querySelector('[data-cancel]')?.setAttribute('title',tr('Zur Aufstellung zurück','Back to deployment'));return;}
            dialog('Initiative einmal festlegen', '<p>Danach läuft diese Reihenfolge Runde für Runde weiter. Bei Gleichstand zählt die Reihenfolge, in der Figuren hinzugefügt wurden.</p><label class="ct-rule"><input type="checkbox" name="roll"><span><strong>Initiative einmal würfeln</strong><small>W20 + Geschicklichkeit-Modifikator. Sonst werden die eingetragenen Initiativewerte verwendet.</small></span></label>', f => c.start(f.elements.roll.checked), 'Kampf starten'); return;
        }
        if (action === 'import') {
            const isProfile=raw=>raw&&typeof raw.kind==='string'&&raw.kind.startsWith('combat-');
            const d = dialog(tr('Kampf, Figuren oder Profile importieren','Import combat, participants or profiles'), '<label class="ct-field"><span>'+tr('JSON: vollständiger Kampf, Figurenliste oder Profildatei','JSON: full combat, participant list or profile file')+'</span><textarea name="json" rows="12" placeholder="'+tr('JSON hier einfügen','Paste JSON here')+'" required></textarea></label><label class="ct-field"><span>'+tr('Oder JSON-Datei auswählen','Or select a JSON file')+'</span><input type="file" name="file" accept=".json,application/json"></label><p class="ct-muted">'+tr('Nur ein vollständiger Kampf ersetzt den aktuellen Zustand. Profildateien öffnen die passende Vorschau; Figurenprofile fügen neue Figuren hinzu. Rückgängig ist möglich.','Only a full combat replaces the current state. Profile files open the appropriate preview; participant profiles add new participants. Undo is available.')+'</p>', async f => {
                const raw = JSON.parse(f.elements.json.value);
                if(isProfile(raw))openProfiles(viewController(),dialog,{profile:raw});
                else if (Array.isArray(raw)) {await c.addRoster(raw);message(tr('Import erfolgreich: neue Figuren hinzugefügt.','Import successful: new participants added.'));}
                else {await c.import(raw);message(tr('Import erfolgreich: Kampf geladen.','Import successful: combat loaded.'));}
            }, tr('Importieren','Import'));
            let readGeneration=0;
            d.querySelector('[name=file]').addEventListener('change', async e => {
                const file=e.target.files?.[0],ticket=++readGeneration;if(!file)return;
                const button=d.querySelector('form').querySelector('[type=submit]');button.disabled=true;
                try{
                    if(file.size>20*1024*1024)throw new Error(tr('Datei zu groß (20 MB).','File too large (20 MB).'));
                    const text=await file.text();if(ticket!==readGeneration||!d.open||d.isConnected===false)return;
                    d.querySelector('[name=json]').value=text;const raw=JSON.parse(text);
                    if(isProfile(raw))openProfiles(viewController(),dialog,{profile:raw});
                    else d.querySelector('.ct-editor-error').textContent='';
                }catch(error){if(ticket===readGeneration&&d.open){c.debugRecord('error',{operation:'import file',message:error.message});d.querySelector('.ct-editor-error').textContent=error.message;}}
                finally{if(ticket===readGeneration&&d.open)button.disabled=false;}
            }); return;
        }
        if (action === 'export') {
            const json = JSON.stringify(c.export(), null, 2), blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = combatFilename(s.name); link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
            message('Kampf als JSON exportiert.'); return;
        }
        if (action === 'edit-pending') {
            const draft=pending(),p=override||!draft||publicValue(c.state(),draft)?draft:null;
            dialog('Zurückgewiesene Aktion bearbeiten', `<label class="ct-field"><span>Aktion (keine HP, DC oder Würfel)</span><textarea name="json" rows="10" required>${esc(JSON.stringify(p.intent, null, 2))}</textarea></label>`, async f => {
                await perform({ ...JSON.parse(f.elements.json.value), turn: turnToken(c.state()) });
            }, 'Auswerten'); return;
        }
        if (action === 'discard-pending') { localPending = null; c.clearPending(); render(); return; }
        if (rulesData && ['save-rules','apply-hp'].includes(action)) ruleEdits.stageForm(c.chatKey(),s.rules,rulesData);
        await run(async () => {
            if (action === 'apply-group' || action === 'apply-groups') {
                const selectedSides = action === 'apply-group' ? [b.dataset.side] : ['player', 'ally', 'enemy'];
                const groups = Object.fromEntries(selectedSides.map(side => [side, { control: groupsData.get(side + '-control'), aiBehavior: groupsData.get(side + '-aiBehavior') }]));
                await c.groups(groups); for (const side of selectedSides) delete groupDrafts[side];
                notice = 'Gruppensteuerung gespeichert und übernommen.';
                noticeKind = 'info';
            } else if(['pick-carry-skill','pick-carry-check','pick-carrier-skill','pick-carrier-check'].includes(action)){
                const ctx=carryingContext(action.endsWith('-check')?'check':'skill');if(!ctx)throw Error(tr('Zuerst eine zu bergende Figur wählen.','Choose the participant to carry first.'));
                const endpoint=action.startsWith('pick-carrier-')?'carrier':'target';if(endpoint==='carrier'&&!carrySelection(s,ctx.a,ctx.b,ctx.raw,c.preferences().language).plan)throw Error(tr('Zuerst das Zielfeld der geretteten Figur wählen.','Choose the carried participant destination first.'));
                carryPick={...ctx,endpoint,chat:c.chatKey(),revision:s.revision};blockMode=false;tab='board';boardNotice=endpoint==='carrier'?tr('Endfeld für den Helfer anklicken. Es muss neben der geretteten Figur liegen.','Click the helper endpoint. It must neighbor the carried participant.'):tr('Zielfeld für die getragene Figur anklicken. Rechtsklick zeigt die Vorschau; Escape oder Abbrechen beendet die Auswahl.','Click the carried participant’s destination. Right-click previews it; Escape or Cancel ends selection.');boardNoticeKind='info';
            } else if(action==='cancel-carry-pick'){carryPick=null;boardNotice='';
            } else if (action === 'cell') {
                const pos = { x: Number(b.dataset.x), y: Number(b.dataset.y) };
                if(carryPick){const ctx=carryPick;if(ctx.chat!==c.chatKey()||ctx.revision!==s.revision){carryPick=null;throw Error(tr('Kampf wurde geändert. Zielfeld erneut wählen.','Combat changed. Choose the destination again.'));}setCarryDestination(ctx,pos,ctx.endpoint);}
                else if (blockMode) {
                    if(terrainType!=='ladder'){const result=await c.paint(terrainType,[pos],{facing:coverFacing});showPaintResult(result);}
                    else {
                        if (!canOccupy(s,pos) || isCover(s,pos)) throw new Error('Leiterende muss frei sein.');
                        if (!ladderStart) { ladderStart = pos; return; }
                        const from=ladderStart;ladderStart=null;
                        if(distance(from,pos)!==1||heightAt({...s,rules:{...s.rules,heightsEnabled:true,boardEnabled:true}},from)===heightAt({...s,rules:{...s.rules,heightsEnabled:true,boardEnabled:true}},pos))throw new Error('Leiter benötigt Nachbarfelder auf verschiedenen Höhen.');
                        const links=s.board.ladders??[],same=p=>p.x===pos.x&&p.y===pos.y,existing=links.find(v=>distance(v.from,from)===0&&same(v.to)||distance(v.to,from)===0&&same(v.from));
                        await c.board(cleanTerrain(s.board,{ladders:existing?links.filter(v=>v!==existing):[...links,{from,to:pos}]}));
                    }
                } else if (carryBoardContext()) setCarryDestination(carryBoardContext(),pos);
                else if (id) {selected = id;if(c.preferences().contextOnClick)openActorContext(id);}
                else if (selected) await moveOnBoard(selected, pos, override);
                else throw new Error('Zuerst eine Figur wählen.');
            } else if(action==='resolve-check'){await perform(checkIntent(c.state(),currentActor(c.state()),checkDrafts.get(c.chatKey(),currentActor(c.state()).id)));}
            else if(action==='use-skill'||action==='revive-after'){const acting=s.actors.find(v=>v.id===(action==='revive-after'?reviveHelper:currentActor(s).id)),chosen=acting.skills.find(v=>v.id===skillId);if(selfAbility(chosen))skillTarget=acting.id;if(chosen?.kind==='carry'){const choice=carrySelection(s,acting,s.actors.find(v=>v.id===skillTarget),skillCarryCell,c.preferences().language,null,skillCarrierCell);if(!choice.plan)throw Error(choice.error);skillDestination=choice.point.x+','+choice.point.y;}const intent={type:'skill',actor:action==='revive-after'?reviveHelper:currentActor(s).id,target:skillTarget||undefined,skill:skillId,turn:turnToken(s)};if(chosen?.kind==='carry'){const choice=carrySelection(s,acting,s.actors.find(v=>v.id===skillTarget),skillCarryCell,c.preferences().language,null,skillCarrierCell);intent.carrierDestination={...choice.plan.carrier};}if(skillWeapon)intent.weapon=skillWeapon;if(skillDestination){const [x,y]=skillDestination.split(',').map(Number);intent.destination={x,y};}await perform(intent);}
            else if(action==='activate-shield')await perform({type:'shield',actor:currentActor(s).id,profile:b.dataset.profile,turn:turnToken(s)});
            else if(action==='reserve-reaction')await perform({type:'reserve',actor:currentActor(s).id,turn:turnToken(s)});
            else if (action === 'go-cover') await c.goCover(currentActor(s).id, turnToken(s));
            else if (action === 'use-resource') await perform({ type: 'use', actor: s.phase === 'active' ? currentActor(s).id : treatmentActor, ...(healCenterMode==='cell'?{center:{x:healX-1,y:healY-1}}:{target:resourceTarget}), resource, turn: turnToken(s) });
            else if (action === 'end-turn') { await c.endTurn({ actor: currentActor(s).id, turn: turnToken(s) }); localPending = null; c.clearPending(); notice='';boardNotice=tr('Zug beendet.','Turn ended.');boardNoticeKind='info'; }
            else if (action === 'flee') await perform({ type: 'flee', actor: currentActor(s).id, turn: turnToken(s) });
            else if (action === 'return-actor') await c.returnActor(id);
            else if (action === 'attack' || action === 'other') {
                const intent = { type: action === 'attack' ? 'attack' : 'other', actor: currentActor(s).id, turn: turnToken(s), description: action === 'other' ? otherDescription : actionDescription };
                if (action === 'attack') { intent.target = target; if(stat!=='auto')intent.stat=stat; intent.mode = mode; intent.variant = variant; intent.weapon = weaponId; }
                if(action==='other'&&freeRemark){await c.remark(currentActor(s).id,otherDescription,turnToken(s));return;}
                await perform(intent, action === 'attack' ? { damageOverride: actionDamage, radiusOverride: actionRadius } : {});
            } else if (action === 'stabilize') await perform({ type: 'stabilize', actor: s.phase === 'active' ? currentActor(s).id : helper, target: rescueTarget, turn: turnToken(s) });
            else if (action === 'elapse') await c.elapse();
            else if (action === 'retry') await perform({ ...pending().intent, turn: turnToken(c.state()) }, pending().options ?? {});
            else if (action === 'ai-step') await c.aiStep();
            else if (action === 'ai-run') { const result = await c.aiRun(); if (result?.limited) notice = concealedProgress()?tr('KI-Serie abgeschlossen. Zum Fortsetzen erneut starten.','AI series completed. Start again to continue.'):result.count+' KI-Züge abgeschlossen. Zum Fortsetzen erneut starten.';else if(result?.stopped)notice='KI-Serie angehalten. Erneut starten setzt den verbleibenden Zug fort.'; }
            else if (action === 'undo') await c.undo();
            else if (action === 'stop') await c.stop();
            else if (action === 'remove') await c.remove(id);
            else if (action === 'unplace'||action==='reserve-actor') await c.reserve(id);
            else if(action==='place-actor'){selected=id;tab='board';notice=tr('Freies Zielfeld anklicken oder Figur aufs Brett ziehen.','Click a free destination or drag the participant onto the board.');}
            else if(action==='reveal-actor')await c.reveal(id);
            else if(action==='rescue-pit')await perform({type:'rescue',actor:currentActor(c.state())?.id??helper,target:rescueTarget,turn:turnToken(c.state())});
            else if (action === 'template') { await c.saveTemplate(id); notice = 'Vorlage in der Companion-Bibliothek gespeichert. Unter Companions → In Kampf übernehmen laden.'; }
            else if (action === 'load-template') await c.loadTemplate(id);
            else if (action === 'delete-template') await c.deleteTemplate(id);
            else if (action === 'demo') await c.import(demoState());
            else if (action === 'narrate') await c.narrate();
            else if (action === 'post') await c.postResult();
            else if (action === 'scan') {
                const rows = await c.scanRoster();
                if (!rows.length) throw new Error('Keine Figuren gefunden. Die KI um Namen und Werte in einem combat-roster-Block bitten oder Figuren manuell anlegen.');
                dialog('Figuren aus dem Chat prüfen', `<p>Diese Vorschläge ändern erst nach dem Import den Kampf. Fehlende Werte prüfen.</p><label class="ct-field"><span>Alle Werte vor dem Import editierbar</span><textarea name="json" rows="15">${esc(JSON.stringify(rows, null, 2))}</textarea></label>`, f => c.addRoster(JSON.parse(f.elements.json.value)), 'Als neue Figuren importieren');
            } else if (action === 'order-up' || action === 'order-down') {
                const order = [...s.order], i = order.indexOf(id), j = i + (action === 'order-up' ? -1 : 1);
                [order[i], order[j]] = [order[j], order[i]]; await c.order(order);
            } else if (action === 'save-rules' || action === 'apply-hp') {
                const key = c.chatKey(), r = rulesData ? readRuleForm(rulesData) : ruleEdits.patch(key,c.state().rules);
                await c.rules(r, action === 'apply-hp');ruleEdits.discard(key); notice = action === 'apply-hp' ? 'HP-Regel übernommen.' : 'Regeln gespeichert.';
            }
        });
    });
    root.addEventListener('contextmenu',event=>{if(blockMode||busy||c.aiRunning()||c.modelBusy())return;const cell=event.target.closest('.ct-cell');if(cell&&!cell.dataset.id&&carryingContext()){event.preventDefault();openCarryContext({x:Number(cell.dataset.x),y:Number(cell.dataset.y)});return;}const source=event.target.closest('[data-id]');if(!source||!playerView(c.state(),override).actors.some(a=>a.id===source.dataset.id))return;event.preventDefault();selected=source.dataset.id;openActorContext(selected);});
    root.addEventListener('keydown',event=>{if(event.key==='Escape'&&carryPick){event.preventDefault();carryPick=null;boardNotice='';render();}});
    root.addEventListener('dragstart', event => {
        const cell = event.target.closest('[data-drag-actor], [data-id][data-x]');
        if (!cell || boardDrag?.pending() || blockMode || busy || c.modelBusy() || c.aiRunning()) { event.preventDefault(); return; } dragging=true;
        event.dataTransfer.setData('text/plain', cell.dataset.id); event.dataTransfer.effectAllowed = 'move';
    });
    root.addEventListener('dragend',()=>{dragging=false;});
    root.addEventListener('dragover', event => { if ((event.target.closest('.ct-cell')||event.target.closest('[data-reserve-drop]')) && !blockMode) event.preventDefault(); });
    root.addEventListener('drop', event => {
        const cell = event.target.closest('.ct-cell'),reserve=!cell&&event.target.closest('[data-reserve-drop]');
        if ((!cell&&!reserve) || blockMode || busy || c.modelBusy() || c.aiRunning()) return;
        event.preventDefault();dragging=false;boardDrag?.suppressClick();
        const id = event.dataTransfer.getData('text/plain');
        if (c.state().actors.some(a => a.id === id)) { lastUIAction=reserve?'reserve-drag':'move-drag';run(() => reserve?takeOffBoard(id):moveOnBoard(id, { x: Number(cell.dataset.x), y: Number(cell.dataset.y) }, override)); }
    });
    boardDrag = bindBoardDrag(root, {
        enabled: () => !carryPick && !blockMode && !busy && !c.modelBusy() && !c.aiRunning(),
        begin: id => ({ chat: c.chatKey(), state: c.state(), correction: override, paths: null }),
        start: id => { dragging = true; selected = id; },
        end: () => { dragging = false; },
        preview: (id, position, context) => {
            const s=context.state, a=s.actors.find(v=>v.id===id);
            if(position===null)return Boolean(a?.position&&!a.escaped);
            if(!a || a.escaped || a.hanging || !canOccupy(s,position) || s.actors.some(v=>v.id!==id && v.position && distance(v.position,position)===0))return false;
            if(context.correction || s.phase!=='active' || !a.position)return true;
            if(currentActor(s)?.id!==id)return false;
            context.paths ??= pathDistances(s,a.position,id,movementBudget(s,a).remaining);
            return context.paths.has(position.x+','+position.y);
        },
        reserve: (id,context) => {lastUIAction='reserve-drag';run(()=>takeOffBoard(id,context));},
        drop: (id, position, context) => {
            lastUIAction='move-drag';c.debugRecord('ui',{action:'move-drag',id,position,override:context.correction});
            run(async()=>{
                if(c.chatKey()!==context.chat || c.state().revision!==context.state.revision)throw new Error('Kampfzustand wurde während des Ziehens geändert. Bitte erneut verschieben.');
                await moveOnBoard(id,position,context.correction);
            });
        }
    });
    boardPaint=bindBoardPaint(root,{
        enabled:()=>tab==='board'&&blockMode&&terrainType!=='ladder'&&!busy&&!c.modelBusy()&&!c.aiRunning(),
        begin:position=>{const state=c.state(),name={wall:'blocked',cover:'cover',height:'heights',pit:'pits'}[terrainType];return {chat:c.chatKey(),revision:state.revision,tool:terrainType,facing:coverFacing,remove:terrainType==='erase'||(state.board[name]??[]).some(p=>p.x===position.x&&p.y===position.y),occupied:new Set(state.actors.flatMap(a=>[a.position,a.hanging?.anchor].filter(Boolean).map(p=>p.x+','+p.y)))};},
        preview:(p,context)=>!context.occupied.has(p.x+','+p.y),
        commit:(cells,context)=>{lastUIAction='terrain-stroke';return run(async()=>{if(c.chatKey()!==context.chat)throw new Error('Chat wurde gewechselt.');const result=await c.paint(context.tool,cells,{remove:context.remove,facing:context.facing,revision:context.revision});showPaintResult(result);});}
    });
    const resize = typeof globalThis.ResizeObserver === 'function' ? new globalThis.ResizeObserver(() => { if (tab === 'board' && c.view().fit && fittedZoom(c.state()) !== zoom) render(); }) : null;
    resize?.observe(root);
    const unsub = c.subscribe(render);
    render();
    return {
        open() { flashes.clear(); render(); if (modal && !root.open) root.showModal();camera.restore(cameraKey,zoom); },
        chatChanged() {showHiddenParticipants=false;carryPick=null;skillCarryCell='';skillCarrierCell='';abilityFeedback=null;skillDestinationKey='';helpDialog?.close(); healCenterMode='actor';healX=1;healY=1;c.cancelReactions();camera.clear();cameraKey='';flashes.clear(); boardDrag?.cancel();boardPaint?.cancel(); boardNotice='';boardNoticeKind='info'; folds.clear(); for (const side of Object.keys(groupDrafts)) delete groupDrafts[side]; selected = ''; target = ''; actionDraft = ''; localPending = null; notice = ''; modeActor = ''; variant = 'profile'; areaDraft = 0; areaProfile = 0; terrainType = 'wall'; weaponId = ''; coverFacing = ''; ladderStart = null; otherKind = 'describe'; resource = ''; resourceTarget = ''; treatmentActor = ''; rescueTarget = ''; helper = ''; reviveHelper = ''; damageDraft = ''; damageProfile = ''; override = false; blockMode = false; editor?.close(); },
        destroy() {helpDialog?.close(); boardDrag?.destroy();boardPaint?.destroy(); resize?.disconnect(); unsub(); unsubEvents(); unsubProgress();unsubReactions(); flashes.destroy(); sound.close(); editor?.remove(); root.remove(); },
        root,
    };
}

