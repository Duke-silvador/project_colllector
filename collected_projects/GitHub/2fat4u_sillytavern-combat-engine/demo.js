import { prepareHistory } from './history-codec.js?v=2.0.0-beta.2-hotfix.2';
import { modelEventCount } from './model-context.js?v=2.0.0-beta.2-hotfix.2';
import { createPreviewStorage, mountPreviewStorage } from './preview-storage.js?v=2.0.0-beta.2-hotfix.2';
import { createController } from './controller.js?v=2.0.0-beta.2-hotfix.2';
import { createUI } from './ui.js?v=2.0.0-beta.2-hotfix.2';
import { createUIEnglish } from './ui.en.js?v=2.0.0-beta.2-hotfix.2';
import { demoState, clone, resultText, validateState } from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { imagesFrom, assertImages } from './visuals.js?v=2.0.0-beta.2-hotfix.2';
import { soundPreferences } from './sounds.js?v=2.0.0-beta.2-hotfix.2';
const storageKey = 'ct-combat-demo-v1';
let bundle;
try { bundle = JSON.parse(localStorage.getItem(storageKey)); } catch { /* First run. */ }
bundle ??= { state: demoState(), history: [], library: [] };
bundle.state = validateState(bundle.state);
bundle.history = prepareHistory(prepareHistory(bundle.history).map(validateState));
bundle.images = imagesFrom(bundle.images ?? {});
assertImages(bundle.state, bundle.images);
bundle.preferences ??= { language: 'de', quickSide: 'right' };
try { bundle.preferences.contextEventCount=modelEventCount(bundle.preferences.contextEventCount); } catch { bundle.preferences.contextEventCount=8; }
bundle.state.rules.language = bundle.preferences.language;
let demoUI, storagePanel;
let rejected = null;
const previewStorage=createPreviewStorage({storage:()=>localStorage,key:storageKey,getBundle:()=>bundle,setBundle:next=>{bundle=next;},onChange:()=>c.refresh(),onStatus:()=>storagePanel?.refresh()});
const c = createController({
    key: () => 'demo', read: () => { bundle.state.rules.language = bundle.preferences.language; return bundle; }, write: next => { bundle = next; },
    save: async () => previewStorage.save(),
    library: () => bundle.library ?? [],
    maps: () => bundle.maps ?? [],
    saveMaps: async maps => { bundle.maps = maps; previewStorage.save(); },
    saveTemplate: async a => { bundle.library ??= []; const i = bundle.library.findIndex(b => b.id === a.id); if (i < 0) bundle.library.push(a); else bundle.library[i] = a; previewStorage.save(); },
    deleteTemplate: async id => { bundle.library = bundle.library.filter(a => a.id !== id); previewStorage.save(); },
    scanRoster: async () => [],
    narrate: () => { throw new Error('In der Vorschau ist keine KI verbunden. In SillyTavern wird das Ergebnis im aktuellen Chat erzählt.'); },
    postResult: () => { throw new Error('Die Vorschau hat keinen Chat. Alle Ergebnisse stehen unter Protokoll.'); },
    pendingAction: () => rejected,
    clearPending: () => { rejected = null; },
    preferences: patch => {
        if (!patch) return { ...bundle.preferences, ...soundPreferences(bundle.preferences) };
        if(patch.contextEventCount!==undefined)patch={...patch,contextEventCount:modelEventCount(patch.contextEventCount)};
        Object.assign(bundle.preferences, soundPreferences({ ...bundle.preferences, ...patch }));
        const languageChanged = patch.language && patch.language !== bundle.preferences.language;
        Object.assign(bundle.preferences, patch); bundle.state.rules.language = bundle.preferences.language;
        if (languageChanged) { demoUI.destroy(); demoUI = (bundle.preferences.language === 'en' ? createUIEnglish : createUI)(c); }
        c.refresh(); previewStorage.save(); return bundle.preferences;
    },
    propose: () => { throw new Error(bundle.preferences.language === 'en' ? 'No model is connected to this preview.' : 'In der Vorschau ist keine KI verbunden.'); },
    connection: () => ({ label: bundle.preferences.language === 'en' ? 'Local preview · no model connected' : 'Lokale Vorschau · kein KI-Aufruf', tools: false }),
});
storagePanel=mountPreviewStorage(previewStorage,{getBundle:()=>bundle,language:()=>bundle.preferences.language});
demoUI = (bundle.preferences.language === 'en' ? createUIEnglish : createUI)(c);
previewStorage.save();
// Expose only in the standalone demo, useful for inspecting exported state.
globalThis.combatDemo = c;
