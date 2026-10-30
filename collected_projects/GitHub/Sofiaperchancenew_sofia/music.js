import { SOUND, PRESETS_FR, BANK_FR, JOURNEY_FR } from './music-data.js';
import { SUNO_FAM, familyFor, sunoExtra } from './music-suno.js';
import { buildCoverPrompt, COVER_STYLE_LABELS } from './music-cover.js';
import { BANK_DE, BANK_EN, BANK_ES, BANK_IT, BANK_PL, BANK_JA, BANK_ZH, BANK_ZH_CN, BANK_KO, BANK_HI } from './music-i18n.js';
var BANKS = { fr: BANK_FR, de: BANK_DE, en: BANK_EN, es: BANK_ES, it: BANK_IT, pl: BANK_PL, ja: BANK_JA, zh: BANK_ZH, 'zh-CN': BANK_ZH_CN, ko: BANK_KO, hi: BANK_HI };
var VL = { fr: 'accent France fr_fr, prononciation claire', de: 'Akzent Deutschland de_de, klare Aussprache', en: 'en_us accent, clear pronunciation', es: 'acento España es_es, pronunciación clara', it: 'accento Italia it_it, pronuncia chiara', pl: 'akcent Polska pl_pl, wyraźna wymowa', ja: 'アクセント 日本 ja_jp、明瞭な発音', zh: '口音 台灣 zh_tw，發音清晰', ko: '억양 대한민국 ko_kr, 명확한 발음', hi: 'लहजा भारत hi_in, स्पष्ट उच्चारण' };
var SV = { fr: 'Voix', de: 'Stimme', en: 'Voice', es: 'Voz', it: 'Voce', pl: 'Głos', ja: '声', zh: '聲音', ko: '음성', hi: 'आवाज़' };
var SEC = {
fr: { v1: 'Couplet 1', v2: 'Couplet 2', pre: 'Pré-refrain', ch: 'Refrain', chf: 'Refrain final', br: 'Pont', out: 'Final', intro: 'Intro', sec: 'Section', tex: 'Texture', up: 'Montée', drop: 'Explosion', calm: 'Accalmie', peak: 'Apogée', ins: 'Instrumental', choir: 'Chœur français euphorique' },
de: { v1: 'Strophe 1', v2: 'Strophe 2', pre: 'Pre-Refrain', ch: 'Refrain', chf: 'Schlussrefrain', br: 'Bridge', out: 'Finale', intro: 'Intro', sec: 'Teil', tex: 'Textur', up: 'Aufbau', drop: 'Explosion', calm: 'Ruhephase', peak: 'Höhepunkt', ins: 'Instrumental', choir: 'Euphorischer deutscher Chor' },
en: { v1: 'Verse 1', v2: 'Verse 2', pre: 'Pre-chorus', ch: 'Chorus', chf: 'Final chorus', br: 'Bridge', out: 'Outro', intro: 'Intro', sec: 'Section', tex: 'Texture', up: 'Build-up', drop: 'Drop', calm: 'Breakdown', peak: 'Peak', ins: 'Instrumental', choir: 'Euphoric English choir' },
es: { v1: 'Estrofa 1', v2: 'Estrofa 2', pre: 'Pre-estribillo', ch: 'Estribillo', chf: 'Estribillo final', br: 'Puente', out: 'Final', intro: 'Intro', sec: 'Sección', tex: 'Textura', up: 'Subida', drop: 'Explosión', calm: 'Calma', peak: 'Apogeo', ins: 'Instrumental', choir: 'Coro español eufórico' },
it: { v1: 'Strofa 1', v2: 'Strofa 2', pre: 'Pre-ritornello', ch: 'Ritornello', chf: 'Ritornello finale', br: 'Ponte', out: 'Finale', intro: 'Intro', sec: 'Sezione', tex: 'Tessitura', up: 'Salita', drop: 'Esplosione', calm: 'Calma', peak: 'Apice', ins: 'Strumentale', choir: 'Coro italiano euforico' },
pl: { v1: 'Zwrotka 1', v2: 'Zwrotka 2', pre: 'Przed-refren', ch: 'Refren', chf: 'Refren finalny', br: 'Most', out: 'Finał', intro: 'Intro', sec: 'Sekcja', tex: 'Tekstura', up: 'Narastanie', drop: 'Eksplozja', calm: 'Uspokojenie', peak: 'Apogeum', ins: 'Instrumental', choir: 'Euforyczny polski chór' },
ja: { v1: 'ヴァース1', v2: 'ヴァース2', pre: 'プレコーラス', ch: 'サビ', chf: '最終サビ', br: 'ブリッジ', out: 'アウトロ', intro: 'イントロ', sec: 'セクション', tex: 'テクスチャ', up: '盛り上がり', drop: '爆発', calm: '静寂', peak: '頂点', ins: 'インストゥルメンタル', choir: '歓喜の日本語コーラス' },
zh: { v1: '主歌1', v2: '主歌2', pre: '導副歌', ch: '副歌', chf: '最終副歌', br: '橋段', out: '結尾', intro: '前奏', sec: '段落', tex: '質地', up: '堆疊', drop: '爆發', calm: '沉澱', peak: '頂點', ins: '純音樂', choir: '歡騰華語合唱' }
};
var NLBL = { fr: ['INTENTION','SOMATIQUE','VOIX','MIX','ASTUCE SUNO'], de: ['INTENTION','SOMATIK','STIMME','MIX','SUNO-TIPP'], en: ['INTENTION','SOMATIC','VOICE','MIX','SUNO TIP'], es: ['INTENCIÓN','SOMÁTICO','VOZ','MEZCLA','CONSEJO SUNO'], it: ['INTENZIONE','SOMATICO','VOCE','MIX','CONSIGLIO SUNO'], pl: ['INTENCJA','SOMATYKA','GŁOS','MIKS','TRIK SUNO'], ja: ['意図','身体','声','ミックス','SUNOのコツ'], zh: ['意圖','身體','聲音','混音','SUNO訣竅'] };
var HDR = { fr: ['TITRE','STYLE','À EXCLURE','STRUCTURE','PAROLES'], de: ['TITEL','STYLE','AUSSCHLIESSEN','STRUKTUR','TEXTE'], en: ['TITLE','STYLE','EXCLUDE','STRUCTURE','LYRICS'], es: ['TÍTULO','STYLE','EXCLUIR','ESTRUCTURA','LETRA'], it: ['TITOLO','STYLE','ESCLUDERE','STRUTTURA','TESTO'], pl: ['TYTUŁ','STYL','WYKLUCZ','STRUKTURA','TEKST'], ja: ['タイトル','スタイル','除外','構成','歌詞'], zh: ['標題','風格','排除','結構','歌詞'] };
SEC['zh-CN'] = { v1: '主歌1', v2: '主歌2', pre: '导副歌', ch: '副歌', chf: '最终副歌', br: '桥段', out: '结尾', intro: '前奏', sec: '段落', tex: '质地', up: '堆叠', drop: '爆发', calm: '沉淀', peak: '顶点', ins: '纯音乐', choir: '欢腾华语合唱' };
SV['zh-CN'] = '声音'; VL['zh-CN'] = '口音 中国大陆 zh_cn，发音清晰'; NLBL['zh-CN'] = ['意图','身体','声音','混音','SUNO诀窍']; HDR['zh-CN'] = ['标题','风格','排除','结构','歌词'];
SEC['ko'] = { v1: '벌스1', v2: '벌스2', pre: '프리코러스', ch: '코러스', chf: '최종 코러스', br: '브릿지', out: '아웃트로', intro: '인트로', sec: '섹션', tex: '텍스처', up: '고조', drop: '폭발', calm: '가라앉음', peak: '정점', ins: '인스트루멘털', choir: '환희의 한국어 합창' };
SV['ko'] = '음성'; VL['ko'] = '억양 대한민국 ko_kr, 명확한 발음'; NLBL['ko'] = ['의도','신체','음성','믹스','SUNO 팁']; HDR['ko'] = ['제목','스타일','제외','구성','가사'];
SEC['hi'] = { v1: 'अंतरा 1', v2: 'अंतरा 2', pre: 'प्री-कोरस', ch: 'कोरस', chf: 'अंतिम कोरस', br: 'ब्रिज', out: 'आउट्रो', intro: 'इंट्रो', sec: 'खंड', tex: 'बनावट', up: 'उठान', drop: 'धमाका', calm: 'ठहराव', peak: 'चरम', ins: 'वाद्य', choir: 'उल्लासपूर्ण हिन्दी समूहगान' };
SV['hi'] = 'आवाज़'; VL['hi'] = 'लहजा भारत hi_in, स्पष्ट उच्चारण'; NLBL['hi'] = ['इरादा','देह','आवाज़','मिक्स','SUNO टिप']; HDR['hi'] = ['शीर्षक','स्टाइल','बाहर','संरचना','गीत'];
var CSS = '#musicModal{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);overflow:auto}' + '#musicModal .mz-wrap{max-width:1020px;margin:0 auto;padding:20px 16px 80px;text-align:left;background:#0a0812;color:#efe9ff;font-family:Inter,system-ui,sans-serif}' + '#musicModal h1{font-size:clamp(22px,4vw,36px);line-height:1.05;margin:8px 0}' + '#musicModal .mz-sub{color:#b9aef5;max-width:75ch;line-height:1.55}' + '#musicModal .mz-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}' + '@media(max-width:760px){#musicModal .mz-grid{grid-template-columns:1fr}}' + '#musicModal .mz-card{background:#151126;border:1px solid #2d2456;border-radius:14px;padding:12px}' + '#musicModal label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#b9aef5;margin:0 0 6px}' + '#musicModal select,#musicModal input[type=text],#musicModal textarea{width:100%;background:#0e0b1c;color:#fff;border:1px solid #3a2f73;border-radius:10px;padding:10px;font-size:14px;box-sizing:border-box}' + '#musicModal textarea{min-height:110px;resize:vertical;line-height:1.6;font-family:inherit}' + '#musicModal input[type=range]{width:100%;accent-color:#ff2e9a}' + '#musicModal .mz-presets{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}' + '#musicModal .mz-presets button{background:#1d1740;color:#fff;border:1px solid #4a3aa3;border-radius:999px;padding:8px 12px;cursor:pointer;font-size:13px}' + '#musicModal .mz-presets button.on{background:#ff2e9a;border-color:#ff2e9a}' + '#musicModal .mz-row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}' + '#musicModal .mz-big{background:#ff2e9a;border:0;color:#fff;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer;font-size:15px}' + '#musicModal .mz-ghost{background:#221c4d;border:1px solid #4a3aa3;color:#fff;border-radius:12px;padding:12px 14px;cursor:pointer}' + '#musicModal .mz-out{display:grid;grid-template-columns:1fr 1fr;gap:12px}' + '@media(max-width:760px){#musicModal .mz-out{grid-template-columns:1fr}}' + '#musicModal pre{background:#000;border:1px solid #333;border-radius:12px;padding:12px;white-space:pre-wrap;min-height:180px;font-size:13px;line-height:1.6;margin:8px 0;color:#efe9ff}' + '#musicModal .mz-count{font-size:12px;color:#b9aef5}' + '#musicModal .mz-count.bad{color:#ff6b6b}' + '#musicModal .mz-kv{font-size:13px;color:#d9d2ff;line-height:1.6}' + '#musicModal .mz-tip{background:#0e0b1c;border:1px dashed #4a3aa3;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.6;color:#d9d2ff}' + '#musicModal canvas{width:100%;border-radius:12px;background:#000;border:1px solid #333}';
export function attachMusic(App) {
function gi(id){ return document.getElementById(id); }
function curLang(){ try{ var c = null; try{ c = App.State.currentSessionId; }catch(e){} try{ var ss = App.State.sessions || []; for (var i = 0; i < ss.length; i++){ if (ss[i] && ss[i].id === c && ss[i].lockedLanguage){ var l0 = String(ss[i].lockedLanguage).slice(0,2).toLowerCase(); if (l0 === 'zh' && String((App.State.settings && App.State.settings.zhScript) || 'trad').toLowerCase() === 'simp') return 'zh-CN'; if (BANKS[l0]) return l0; } } }catch(e){} }catch(e){} try{ var l = String((App.State.settings && App.State.settings.language) || 'fr').slice(0,2).toLowerCase(); if (l === 'zh' && String((App.State.settings && App.State.settings.zhScript) || 'trad').toLowerCase() === 'simp') return 'zh-CN'; if (BANKS[l]) return l; }catch(e){} return 'fr'; }
function BK(){ var l = curLang(); return BANKS[l] || BANK_FR; }
function UI(){ return BK().ui; }
function SECL(){ var l = curLang(); return SEC[l] || SEC.fr; }
function M(name){ App.Music._m = App.Music._m || {}; return App.Music._m[name]; }
function SM(name, v){ App.Music._m = App.Music._m || {}; App.Music._m[name] = v; }
function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
function pickN(a, n){ var b = a.slice(); for (var i = b.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b.slice(0, n); }
// Styles avec leurs rythmes : chaque style listé impose sa couleur rythmique
// (liste Percussions) dès qu'on le choisit dans Genre — le rythme suit le style.
var GENRE_RHYTHM = {
'Catchy modern pop':'Catchy four-on-the-floor pop beat',
'Driving electric rock':'Driving rock backbeat',
'Hard-hitting hip-hop':'Boom-bap hip-hop groove',
'Synthetic club EDM':'Synthetic EDM build-and-drop drums',
'Classic heavy metal':'Galloping double-kick metal drive',
'Improvised jazz combo':'Swinging jazz ride with brushes',
'Melancholic Delta blues':'Slow 12/8 blues shuffle',
'Groovy soul and funk':'Syncopated soul-funk groove',
'Laid-back roots reggae':'One-drop reggae groove',
'Full symphonic orchestra':'Orchestral percussion with timpani',
'Mozart-style classical':'Elegant Mozart orchestral pulse',
'Classic rock':'Driving rock backbeat',
'Punk rock':'Driving rock backbeat',
'Pop-punk':'Driving rock backbeat',
'Post-punk':'Driving rock backbeat',
'Garage rock':'Driving rock backbeat',
'Indie rock':'Driving rock backbeat',
'Alternative rock':'Driving rock backbeat',
'Psychedelic rock':'Driving rock backbeat',
'Progressive rock':'Driving rock backbeat',
'Math rock':'Driving rock backbeat',
'Post-rock':'Driving rock backbeat',
'Shoegaze':'Driving rock backbeat',
'Emo rock':'Driving rock backbeat',
'Screamo':'Driving rock backbeat',
'Surf rock':'Driving rock backbeat',
'Rockabilly':'Driving rock backbeat',
'Fifties rock\'n\'roll':'Driving rock backbeat',
'Blues rock':'Driving rock backbeat',
'Folk rock':'Driving rock backbeat',
'Arena rock':'Driving rock backbeat',
'Glam rock':'Driving rock backbeat',
'New wave':'Driving rock backbeat',
'Noise rock':'Driving rock backbeat',
'Space rock':'Driving rock backbeat',
'Krautrock':'Driving rock backbeat',
'Sludge rock':'Driving rock backbeat',
'J-rock':'Driving rock backbeat',
'Anatolian rock':'Driving rock backbeat',
'Southern rock':'Driving rock backbeat',
'Country rock':'Driving rock backbeat',
'Coldwave':'Driving rock backbeat',
'Gothic rock':'Driving rock backbeat',
'Dark wave':'Driving rock backbeat',
'Stoner rock':'Massive rock kit, double kick',
'Desert rock':'Massive rock kit, double kick',
'Dream pop':'Catchy four-on-the-floor pop beat',
'Synthpop':'Catchy four-on-the-floor pop beat',
'Electropop':'Catchy four-on-the-floor pop beat',
'Dance-pop':'Catchy four-on-the-floor pop beat',
'Chamber pop':'Catchy four-on-the-floor pop beat',
'Baroque pop':'Catchy four-on-the-floor pop beat',
'Indie pop':'Catchy four-on-the-floor pop beat',
'Bedroom pop':'Catchy four-on-the-floor pop beat',
'K-pop':'Catchy four-on-the-floor pop beat',
'J-pop':'Catchy four-on-the-floor pop beat',
'City pop':'Catchy four-on-the-floor pop beat',
'Hyperpop':'Catchy four-on-the-floor pop beat',
'Bubblegum pop':'Catchy four-on-the-floor pop beat',
'Teen pop':'Catchy four-on-the-floor pop beat',
'Pop rock':'Catchy four-on-the-floor pop beat',
'Power pop':'Catchy four-on-the-floor pop beat',
'Sophisti-pop':'Catchy four-on-the-floor pop beat',
'Art pop':'Catchy four-on-the-floor pop beat',
'Ambient pop':'Catchy four-on-the-floor pop beat',
'Future pop':'Catchy four-on-the-floor pop beat',
'French chanson pop':'Catchy four-on-the-floor pop beat',
'French variete':'Catchy four-on-the-floor pop beat',
'Trop pop':'Catchy four-on-the-floor pop beat',
'Country pop':'Catchy four-on-the-floor pop beat',
'Latin pop':'Catchy four-on-the-floor pop beat',
'C-pop':'Catchy four-on-the-floor pop beat',
'Thai pop':'Catchy four-on-the-floor pop beat',
'Arabic pop':'Catchy four-on-the-floor pop beat',
'Cartoon playful':'Catchy four-on-the-floor pop beat',
'Classic soul Motown':'Syncopated soul-funk groove',
'Neo-soul':'Syncopated soul-funk groove',
'Contemporary R&B':'Syncopated soul-funk groove',
'Quiet storm':'Syncopated soul-funk groove',
'Funk':'Syncopated soul-funk groove',
'P-funk':'Syncopated soul-funk groove',
'Funk rock':'Syncopated soul-funk groove',
'Boogie':'Syncopated soul-funk groove',
'Philly soul':'Syncopated soul-funk groove',
'Northern soul':'Syncopated soul-funk groove',
'Gospel soul':'Syncopated soul-funk groove',
'Doo-wop':'Syncopated soul-funk groove',
'Smooth jazz':'Syncopated soul-funk groove',
'French rap':'Syncopated soul-funk groove',
'Disco funk':'Quantized four-on-the-floor kick',
'Deep house':'Quantized four-on-the-floor kick',
'Tech house':'Quantized four-on-the-floor kick',
'Progressive house':'Quantized four-on-the-floor kick',
'UK garage':'Quantized four-on-the-floor kick',
'Vocal house':'Quantized four-on-the-floor kick',
'Uplifting trance':'Quantized four-on-the-floor kick',
'New beat':'Quantized four-on-the-floor kick',
'Chiptune 8-bit':'Quantized four-on-the-floor kick',
'Amapiano':'Quantized four-on-the-floor kick',
'Afro-house':'Quantized four-on-the-floor kick',
'Video game music':'Quantized four-on-the-floor kick',
'Minimal techno':'Heavy kick drum',
'Hard techno':'Heavy kick drum',
'Acid techno':'Heavy kick drum',
'Detroit techno':'Heavy kick drum',
'Melodic techno':'Heavy kick drum',
'Hardstyle':'Heavy kick drum',
'Hardcore gabber':'Heavy kick drum',
'Hardtekk':'Heavy kick drum',
'Psytrance':'Heavy kick drum',
'Cinematic trailer':'Heavy kick drum',
'Drum and bass':'Rolling drum\'n\'bass break',
'Jungle':'Rolling drum\'n\'bass break',
'Breakbeat':'Rolling drum\'n\'bass break',
'Dubstep':'Half-step dubstep wobble',
'Riddim':'Half-step dubstep wobble',
'Future bass':'Synthetic EDM build-and-drop drums',
'Trap EDM':'Synthetic EDM build-and-drop drums',
'Electro funk':'Synthetic EDM build-and-drop drums',
'Big beat':'Synthetic EDM build-and-drop drums',
'IDM':'Synthetic EDM build-and-drop drums',
'Glitch':'Synthetic EDM build-and-drop drums',
'Boom-bap':'Boom-bap hip-hop groove',
'Old-school hip-hop':'Boom-bap hip-hop groove',
'Cloud rap':'Boom-bap hip-hop groove',
'Mumble rap':'Boom-bap hip-hop groove',
'Conscious rap':'Boom-bap hip-hop groove',
'Gangsta rap':'Boom-bap hip-hop groove',
'Jazz rap':'Boom-bap hip-hop groove',
'Lo-fi hip-hop':'Boom-bap hip-hop groove',
'Grime':'Boom-bap hip-hop groove',
'Abstract hip-hop':'Boom-bap hip-hop groove',
'Alternative rap':'Boom-bap hip-hop groove',
'Downtempo':'Boom-bap hip-hop groove',
'Trip-hop':'Boom-bap hip-hop groove',
'Lo-fi chill':'Boom-bap hip-hop groove',
'Trap hip-hop':'Bouncy trap 808 groove',
'Drill':'Bouncy trap 808 groove',
'Crunk':'Bouncy trap 808 groove',
'Chopped and screwed':'Bouncy trap 808 groove',
'UK drill':'Bouncy trap 808 groove',
'Hyphy':'Bouncy trap 808 groove',
'Phonk rap':'Half-time phonk drive',
'Traditional jazz':'Swinging jazz ride with brushes',
'Dixieland':'Swinging jazz ride with brushes',
'Swing':'Swinging jazz ride with brushes',
'Big band':'Swinging jazz ride with brushes',
'Bebop':'Swinging jazz ride with brushes',
'Hard bop':'Swinging jazz ride with brushes',
'Cool jazz':'Swinging jazz ride with brushes',
'Modal jazz':'Swinging jazz ride with brushes',
'Free jazz':'Swinging jazz ride with brushes',
'Jazz fusion':'Swinging jazz ride with brushes',
'Acid jazz':'Swinging jazz ride with brushes',
'Nu-jazz':'Swinging jazz ride with brushes',
'Jazz manouche':'Swinging jazz ride with brushes',
'Ragtime':'Swinging jazz ride with brushes',
'Stride piano':'Swinging jazz ride with brushes',
'Bossa nova':'Brushed bossa-nova sway',
'Latin jazz':'Polyrhythmic Afro-Latin percussion',
'Salsa':'Polyrhythmic Afro-Latin percussion',
'Merengue':'Polyrhythmic Afro-Latin percussion',
'Bachata':'Polyrhythmic Afro-Latin percussion',
'Cumbia':'Polyrhythmic Afro-Latin percussion',
'Reggaeton':'Polyrhythmic Afro-Latin percussion',
'Latin trap':'Polyrhythmic Afro-Latin percussion',
'Tango':'Polyrhythmic Afro-Latin percussion',
'Bolero':'Polyrhythmic Afro-Latin percussion',
'Rumba':'Polyrhythmic Afro-Latin percussion',
'Mambo':'Polyrhythmic Afro-Latin percussion',
'Cha-cha-cha':'Polyrhythmic Afro-Latin percussion',
'Samba':'Polyrhythmic Afro-Latin percussion',
'MPB':'Polyrhythmic Afro-Latin percussion',
'Forro':'Polyrhythmic Afro-Latin percussion',
'Norteno':'Polyrhythmic Afro-Latin percussion',
'Mariachi':'Polyrhythmic Afro-Latin percussion',
'Banda':'Polyrhythmic Afro-Latin percussion',
'Flamenco':'Polyrhythmic Afro-Latin percussion',
'Rumba flamenca':'Polyrhythmic Afro-Latin percussion',
'Soca':'Polyrhythmic Afro-Latin percussion',
'Calypso':'Polyrhythmic Afro-Latin percussion',
'Kompa':'Polyrhythmic Afro-Latin percussion',
'Zouk':'Polyrhythmic Afro-Latin percussion',
'Bollywood playback':'Polyrhythmic Afro-Latin percussion',
'Chicago blues':'Slow 12/8 blues shuffle',
'Texas blues':'Slow 12/8 blues shuffle',
'Piedmont blues':'Slow 12/8 blues shuffle',
'Jump blues':'Slow 12/8 blues shuffle',
'Electric blues':'Slow 12/8 blues shuffle',
'Swamp blues':'Slow 12/8 blues shuffle',
'Gospel blues':'Slow 12/8 blues shuffle',
'Hill country blues':'Slow 12/8 blues shuffle',
'Classic country':'Campfire folk strum kit',
'Honky tonk':'Campfire folk strum kit',
'Outlaw country':'Campfire folk strum kit',
'Bluegrass':'Campfire folk strum kit',
'Newgrass':'Campfire folk strum kit',
'Americana':'Campfire folk strum kit',
'Alt-country':'Campfire folk strum kit',
'Western swing':'Campfire folk strum kit',
'Cajun':'Campfire folk strum kit',
'Zydeco':'Campfire folk strum kit',
'Nashville sound':'Campfire folk strum kit',
'Traditional folk':'Campfire folk strum kit',
'Indie folk':'Campfire folk strum kit',
'Freak folk':'Campfire folk strum kit',
'Psychedelic folk':'Campfire folk strum kit',
'French chanson a texte':'Campfire folk strum kit',
'Singer-songwriter':'Campfire folk strum kit',
'Celtic folk':'Campfire folk strum kit',
'Irish folk':'Campfire folk strum kit',
'Nordic folk':'Campfire folk strum kit',
'Medieval folk':'Campfire folk strum kit',
'Bardcore':'Campfire folk strum kit',
'Sea shanty':'Campfire folk strum kit',
'Intimate acoustic':'Campfire folk strum kit',
'Dancehall':'One-drop reggae groove',
'Dub':'One-drop reggae groove',
'Ska':'One-drop reggae groove',
'Rocksteady':'One-drop reggae groove',
'Reggae fusion':'One-drop reggae groove',
'Ragga':'One-drop reggae groove',
'Afrobeat':'Interlocking afrobeat groove',
'Afropop':'Interlocking afrobeat groove',
'Highlife':'Interlocking afrobeat groove',
'Juju':'Interlocking afrobeat groove',
'Fuji':'Interlocking afrobeat groove',
'Coupe-decale':'Interlocking afrobeat groove',
'Ndombolo':'Interlocking afrobeat groove',
'Soukous':'Interlocking afrobeat groove',
'Kizomba':'Interlocking afrobeat groove',
'Kuduro':'Interlocking afrobeat groove',
'Mbalax':'Interlocking afrobeat groove',
'Gamelan':'Interlocking afrobeat groove',
'Qawwali':'Interlocking afrobeat groove',
'Sufi':'Interlocking afrobeat groove',
'Gnawa':'Syncopated congas and bongos',
'Rai':'Syncopated congas and bongos',
'Chaabi':'Syncopated congas and bongos',
'Arabic maqam':'Syncopated congas and bongos',
'Gqom':'Rolling tribal drums',
'Thrash metal':'Galloping double-kick metal drive',
'Melodic death metal':'Galloping double-kick metal drive',
'Atmospheric black metal':'Galloping double-kick metal drive',
'Symphonic metal':'Galloping double-kick metal drive',
'Power metal':'Galloping double-kick metal drive',
'Speed metal':'Galloping double-kick metal drive',
'Doom metal':'Galloping double-kick metal drive',
'Stoner doom metal':'Galloping double-kick metal drive',
'Sludge metal':'Galloping double-kick metal drive',
'Gothic metal':'Galloping double-kick metal drive',
'Nu metal':'Galloping double-kick metal drive',
'Metalcore':'Galloping double-kick metal drive',
'Mathcore':'Galloping double-kick metal drive',
'Djent':'Galloping double-kick metal drive',
'Progressive metal':'Galloping double-kick metal drive',
'Folk metal':'Galloping double-kick metal drive',
'Viking metal':'Galloping double-kick metal drive',
'Groove metal':'Galloping double-kick metal drive',
'Alternative metal':'Galloping double-kick metal drive',
'Post-metal':'Galloping double-kick metal drive',
'Pirate metal':'Galloping double-kick metal drive',
'Funk metal':'Galloping double-kick metal drive',
'Rap metal':'Galloping double-kick metal drive',
'Crystal metal':'Galloping double-kick metal drive',
'Epic orchestral metal':'Galloping double-kick metal drive',
'Black metal':'Galloping double-kick metal drive',
'Death metal':'Galloping double-kick metal drive',
'Grindcore':'Blast beats and trashy cymbals',
'Brutal death metal':'Blast beats and trashy cymbals',
'Deathcore':'Blast beats and trashy cymbals',
'Industrial metal':'Metallic industrial hits',
'Industrial electro':'Metallic industrial hits',
'Electro-swing':'Punchy kick with dry claps',
'Moombahton':'Jersey club bounce',
'Jersey club':'Jersey club bounce',
'Synthwave':'Gated synthwave drums',
'Retrowave':'Gated synthwave drums',
'Outrun':'Gated synthwave drums',
'Vaporwave':'Gated synthwave drums',
'Baroque':'Orchestral percussion with timpani',
'Romantic classical':'Orchestral percussion with timpani',
'Impressionist classical':'Orchestral percussion with timpani',
'Contemporary classical':'Orchestral percussion with timpani',
'String orchestra':'Orchestral percussion with timpani',
'Opera':'Orchestral percussion with timpani',
'Choral sacred':'Orchestral percussion with timpani',
'Requiem':'Orchestral percussion with timpani',
'Ballet':'Orchestral percussion with timpani',
'Military march':'Orchestral percussion with timpani',
'Fanfare brass':'Orchestral percussion with timpani',
'National anthem':'Orchestral percussion with timpani',
'Christmas song':'Orchestral percussion with timpani',
'Wedding music':'Orchestral percussion with timpani',
'Epic cinematic orchestral':'Orchestral percussion with timpani',
'Epic hybrid trailer':'Orchestral percussion with timpani',
'Film score':'Orchestral percussion with timpani',
'Chamber music':'Solo piano with string swells',
'Solo piano classical':'Solo piano with string swells',
'Waltz':'Lilting 3/4 waltz pulse',
'Circus cabaret':'Lilting 3/4 waltz pulse',
'Burlesque':'Lilting 3/4 waltz pulse'
};
function applyGenreRhythm(){ var g = val('mzGenre'); var p = GENRE_RHYTHM[g]; if(p){ var el = gi('mzPerc'); if(el){ for(var i=0;i<el.options.length;i++){ if(el.options[i].text === p){ el.selectedIndex = i; break; } } } } var fk = null; try{ fk = familyFor(g); }catch(e){} if(fk && SUNO_FAM[fk]){ var F = SUNO_FAM[fk]; var ce = gi('mzChords'); if(ce){ for(var j=0;j<ce.options.length;j++){ if(ce.options[j].text === F.chords){ ce.selectedIndex = j; break; } } } var be = gi('mzBpm'); if(be){ var bv = Math.max(parseInt(be.min || '60', 10) || 60, Math.min(parseInt(be.max || '180', 10) || 180, F.bpm)); be.value = bv; var bvl = gi('mzBpmVal'); if(bvl) bvl.textContent = bv; } } return !!(p || fk); }
function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
async function clip(t){ try{ await navigator.clipboard.writeText(t); return; }catch(e){} try{ var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }catch(e){} }
function fillSel(id, arr){ var el = gi(id); if (!el) return 0; var keep = -1; try{ keep = el.selectedIndex; }catch(e){} el.innerHTML = arr.map(function(v){ return "<option>" + esc(v) + "</option>"; }).join(''); if (keep >= 0 && keep < arr.length){ try{ el.selectedIndex = keep; }catch(e){} } return arr.length; }
function val(id){ var el = gi(id); return el ? el.value : ''; }
function setVal(id, v){ var el = gi(id); if (el) el.value = v; }
function buildPanel(){
if (gi('musicModal')) return;
var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
var d = document.createElement('div'); d.id = 'musicModal'; d.hidden = true;
d.innerHTML = "<div class='mz-wrap'>"
 + "<div class='mz-row' style='justify-content:space-between'><h1 id='mzTitle'></h1><button class='mz-ghost' id='mzClose'>\u2715</button></div>"
 + "<div class='mz-sub' id='mzSub'></div><div class='mz-presets' id='mzPresets'></div><div class='mz-grid' id='mzGrid'></div>"
 + "<div class='mz-row'><button class='mz-big' id='mzGen'></button><button class='mz-ghost' id='mzRand'></button><button class='mz-ghost' id='mzCopyBoth'></button><button class='mz-ghost' id='mzCopyAll'></button><button class='mz-ghost' id='mzExport'></button></div>"
 + "<div class='mz-out'><div class='mz-card'><label id='mzLStyle'></label><pre id='mzStyle'></pre><div class='mz-row'><span class='mz-count' id='mzChars'></span><button class='mz-ghost' id='mzCopyStyle'></button></div></div>"
 + "<div class='mz-card'><label id='mzLStruct'></label><pre id='mzStruct'></pre><div class='mz-row'><button class='mz-ghost' id='mzCopyStruct'></button></div></div></div>"
 + "<div class='mz-card' style='margin-top:12px;border-color:#ff2e9a'><label id='mzLLyrics'></label>"
 + "<pre id='mzLyrics' style='min-height:280px'></pre>"
 + "<div class='mz-row'><button class='mz-ghost' id='mzAiLyrics'></button><button class='mz-ghost' id='mzEdit'></button><button class='mz-ghost' id='mzWrap'></button><button class='mz-ghost' id='mzCopyLyrics'></button></div>"
 + "<div class='mz-kv' id='mzCheck' style='font-size:12px;margin-top:8px'></div><div class='mz-tip' id='mzTipVoice' style='margin-top:8px'></div></div>"
 + "<div class='mz-card' style='margin-top:12px'><label>🎨 Cover</label><div class='mz-row'><select id='mzCoverStyle' style='flex:1;min-width:0'></select><button class='mz-big' id='mzCoverGo'>🎨 Cover</button><button class='mz-ghost' id='mzCoverCopy'>Prompt</button></div><div class='mz-sub' id='mzCoverStatus' style='font-size:12px'></div><div id='mzCoverOut' style='margin-top:8px'></div></div>" + "<div class='mz-card' style='margin-top:12px'><label id='mzLGallery'></label><div class='mz-sub' style='font-size:13px' id='mzGalleryNote'></div>"
+ "<div id='mzGalleryCtn' style='margin-top:8px'></div><div class='mz-kv' id='mzPubStatus' style='font-size:12px;margin-top:8px'></div></div>"
 + "<div class='mz-card' style='margin-top:12px'><label id='mzLListen'></label><div class='mz-sub' style='font-size:13px' id='mzListenNote'></div>"
 + "<div id='mzListenCtn' style='margin-top:8px'></div></div>"
 + "<div class='mz-card' style='margin-top:12px'><label id='mzLNotes'></label><div class='mz-kv' id='mzNotes'></div><div class='mz-tip' id='mzTipSuno' style='margin-top:8px'></div></div>"
 + "<div class='mz-card' style='margin-top:12px'><label id='mzLHist'></label><div class='mz-row'><button class='mz-ghost' id='mzSaveHist'></button><select id='mzHist' style='max-width:320px;flex:1;min-width:0'></select><button class='mz-ghost' id='mzDelHist'></button></div><div class='mz-kv' style='font-size:12px' id='mzHistNote'></div></div>"
 + "<div class='mz-card' style='margin-top:12px;border-color:#ff2e9a'><label id='mzLOneSong'></label><div class='mz-sub' style='font-size:13px' id='mzOneSongNote'></div>"
 + "<div class='mz-presets' id='mzThemeChips' style='margin-top:10px'></div>"
 + "<div class='mz-row'><button class='mz-big' id='mzModeAi'></button><button class='mz-ghost' id='mzModeMine'></button></div>"
 + "<label id='mzLCustom2'></label><textarea id='mzCustom' rows='8'></textarea>"
 + "<div class='mz-row'><button class='mz-big' id='mzWriteLyrics'></button><button class='mz-big' id='mzCompose'></button><button class='mz-ghost' id='mzPublish'></button></div></div>"
 + "<div class='mz-sub' style='margin-top:12px;font-size:12px' id='mzFoot'></div></div>";
document.body.appendChild(d);
App.Music.buildGrid();
gi('mzClose').onclick = function(){ App.Music.close(); };
d.addEventListener('click', function(e){ if (e.target === d) App.Music.close(); });
gi('mzGen').onclick = function(){ App.Music.generate(); };
gi('mzRand').onclick = function(){ App.Music.surprise(); };
gi('mzCopyBoth').onclick = function(){ clip('STYLE:\n' + gi('mzStyle').textContent + '\n\nSTRUCTURE:\n' + gi('mzStruct').textContent); };
gi('mzCopyAll').onclick = function(){ App.Music.copyAll(); };
gi('mzExport').onclick = function(){ App.Music.exportTxt(); };
gi('mzCopyStyle').onclick = function(){ clip(gi('mzStyle').textContent); };
gi('mzCopyStruct').onclick = function(){ clip(gi('mzStruct').textContent); };
gi('mzCopyLyrics').onclick = function(){ clip(gi('mzLyrics').textContent); };
gi('mzCoverGo').onclick = function(){ App.Music.coverGo(); };
gi('mzCoverCopy').onclick = function(){ try{ clip(App.Music.coverPromptText().prompt); }catch(e){} };
gi('mzAiLyrics').onclick = function(){ App.Music.aiLyrics(); };
gi('mzEdit').onclick = function(){ App.Music.editLyrics(); };
gi('mzWrap').onclick = function(){ App.Music.wrapLyrics(); };
gi('mzCustom').oninput = function(){ App.Music.setLyricMode('mine', true); App.Music.refreshLyrics(false); };
var _td = gi('mzTitreDice'); if (_td) _td.onclick = function(){ setVal('mzTitre', pick(BK().titles)); };
gi('mzSaveHist').onclick = function(){ App.Music.saveHist(); };
gi('mzHist').onchange = function(){ App.Music.loadHist(); };
gi('mzDelHist').onclick = function(){ App.Music.delHist(); };
gi('mzModeAi').onclick = function(){ App.Music.setLyricMode('sofia'); };
gi('mzModeMine').onclick = function(){ App.Music.setLyricMode('mine'); };
gi('mzWriteLyrics').onclick = function(){ App.Music.aiLyrics(); };
gi('mzCompose').onclick = function(){ App.Music.composeSong(); };
gi('mzPublish').onclick = function(){ App.Music.publishSong(); };
}
function buildGrid(){
var g = gi('mzGrid'); if (!g || g.children.length) return;
function card(lid, inner){ return "<div class='mz-card'><label id='" + lid + "'></label>" + inner + "</div>"; }
var h = '';
h += card('mzLGenre', "<select id='mzGenre'></select>");
h += card('mzLIntent', "<select id='mzIntent'></select>");
h += card('mzLBpm', "<input type='range' id='mzBpm' min='60' max='180' value='124'> <span class='mz-count' id='mzBpmVal'>124</span>");
h += card('mzLKey', "<select id='mzKey'></select>");
h += card('mzLChords', "<select id='mzChords'></select>");
h += card('mzLBass', "<select id='mzBass'></select>");
h += card('mzLPerc', "<select id='mzPerc'></select>");
h += card('mzLTex', "<select id='mzTex'></select>");
h += card('mzLSpat', "<select id='mzSpat'></select>");
h += card('mzLEnergy', "<select id='mzEnergy'></select>");
h += card('mzLSoma', "<select id='mzSoma'></select>");
h += card('mzLVocal', "<select id='mzVocal'></select>");
h += card('mzLTheme', "<select id='mzTheme'></select>");
h += card('mzLLen', "<select id='mzLen'></select>");
h += card('mzLLyrLen', "<select id='mzLyrLen'></select>");
h += card('mzLTitre', "<div class='mz-row' style='margin:0'><input type='text' id='mzTitre' style='flex:1;min-width:0'><button class='mz-ghost' id='mzTitreDice'>\uD83C\uDFB2</button></div>");
h += card('mzLSunoVer', "<select id='mzSunoVer'></select>");
h += card('mzLExclude', "<input type='text' id='mzExclude'>");
g.innerHTML = h;
var bpm = gi('mzBpm'); if (bpm) bpm.oninput = function(e){ gi('mzBpmVal').textContent = e.target.value; };
var td = gi('mzTitreDice'); if (td) td.onclick = function(){ setVal('mzTitre', pick(BK().titles)); };
var al = gi('mzGrid'); if (al) al.querySelectorAll('select,input').forEach(function(el){ el.onchange = function(){ App.Music.generate(); }; });
var mg = gi('mzGenre'); if (mg){ var _mgPrev = mg.onchange; mg.onchange = function(){ try{ App.Music.applyGenreRhythm(); }catch(e){} if (_mgPrev) _mgPrev.call(this); }; }
}
var LABELS = [['mzTitle','title'],['mzSub','sub'],['mzLGenre','genre'],['mzLIntent','intent'],['mzLBpm','bpm'],['mzLKey','key'],['mzLBass','bass'],['mzLPerc','perc'],['mzLTex','tex'],['mzLSpat','spat'],['mzLEnergy','energy'],['mzLSoma','soma'],['mzLVocal','vocal'],['mzLTheme','theme'],['mzLLen','len'],['mzLLyrLen','lyrLen'],['mzLTitre','titre'],['mzLSunoVer','sunoVer'],['mzLExclude','exclude'],['mzGen','gen'],['mzRand','surprise'],['mzCopyBoth','copyBoth'],['mzCopyAll','copyAll'],['mzExport','export'],['mzLStyle','styleBox'],['mzLStruct','structBox'],['mzLLyrics','lyricsBox'],['mzLCustom2','customLbl'],['mzAiLyrics','aiLyrics'],['mzEdit','edit'],['mzWrap','wrap'],['mzCopyLyrics','copyLyrics'],['mzCopyStyle','copyStyle'],['mzCopyStruct','copyStruct'],['mzLNotes','notes'],['mzLHist','hist'],['mzSaveHist','saveHist'],['mzDelHist','delHist'],['mzHistNote','localOnly'],['mzLOneSong','oneSong'],['mzOneSongNote','oneSongNote'],['mzModeAi','modeAi'],['mzModeMine','modeMine'],['mzWriteLyrics','writeLyrics'],['mzCompose','compose'],['mzPublish','publish'],['mzLGallery','galleryT'],['mzGalleryNote','galleryNote'],['mzLListen','listenT'],['mzListenNote','listenNote'],['mzLChords','chords'],['mzTipVoice','tipVoice'],['mzTipSuno','tipSuno'],['mzFoot','foot'],['mzClose','close']];
function localize(){
buildPanel(); App.Music.buildGrid();
var ui = UI(), bk = BK();
LABELS.forEach(function(p){ var el = gi(p[0]); if (el) el.textContent = ui[p[1]] || ''; });
var first = !M('built'); SM('built', true);
fillSel('mzGenre', SOUND.genre); fillSel('mzIntent', SOUND.intent); fillSel('mzKey', SOUND.key); fillSel('mzBass', SOUND.bass); fillSel('mzPerc', SOUND.perc); fillSel('mzTex', SOUND.tex); fillSel('mzSpat', SOUND.spat); fillSel('mzEnergy', SOUND.energy); fillSel('mzSoma', SOUND.soma);
(function(){ var gz = gi('mzGenre'); var hints = ui.genreHints || {}; if (gz && hints) Array.prototype.forEach.call(gz.options, function(o){ if (hints[o.text]) o.title = hints[o.text]; }); })();
fillSel('mzVocal', bk.vocal.map(function(v){ return v.t; }));
fillSel('mzTheme', bk.themes); fillSel('mzLen', ui.lenOpts); fillSel('mzLyrLen', ui.lyrOpts);
var sv = gi('mzSunoVer'); if (sv){ var ki = -1; try{ ki = sv.selectedIndex; }catch(e){} sv.innerHTML = ui.verOpts.map(function(p){ return "<option value='" + p[1] + "'>" + esc(p[0]) + "</option>"; }).join(''); if (ki >= 0 && ki < ui.verOpts.length){ try{ sv.selectedIndex = ki; }catch(e){} } }
fillSel('mzChords', SOUND.chords); fillSel('mzCoverStyle', COVER_STYLE_LABELS); App.Music.renderThemeChips(); App.Music.setLyricMode(M('lyrMode') || 'sofia', true); App.Music.mountGallery(); App.Music.renderListen();
var te = gi('mzTitre'); if (te) te.placeholder = ui.titrePh;
var ce = gi('mzCustom'); if (ce) ce.placeholder = ui.customPh;
if (first){ setVal('mzExclude', ui.excludeDef); }
var pc = gi('mzPresets'); if (pc){ pc.innerHTML = ''; ui.presetNames.forEach(function(n, i){ var btn = document.createElement('button'); btn.textContent = n; btn.onclick = function(){ App.Music.applyPreset(i); }; btn.dataset.i = i; pc.appendChild(btn); }); }
var tb = gi('musicToggleLabel'); if (tb) tb.textContent = ui.musicBtn;
var tbb = gi('musicToggleBtn'); if (tbb){ tbb.title = ui.title; tbb.setAttribute('aria-label', ui.musicBtn); }
App.Music.renderHist();
}
function vocalInfo(){ var bk = BK(); var el = gi('mzVocal'); var i = el ? el.selectedIndex : 0; if (i < 0 || i >= bk.vocal.length) i = 0; return { i: i, v: bk.vocal[i] }; }
function styleMax(){ var el = gi('mzSunoVer'); var v = el ? parseInt(el.value) : 200; return v || 200; }
function styleText(){ var ui = UI(); var g = val('mzGenre'), bpm = val('mzBpm'), k = val('mzKey'), ch = val('mzChords'), ba = val('mzBass'), pe = val('mzPerc'), te = val('mzTex'), sp = val('mzSpat'), en = val('mzEnergy'); var vi = vocalInfo(); var max = styleMax(); var voixTag = vi.v.instru ? vi.v.t : (vi.v.t + ', ' + ui.vocalClause + (vi.v.fem ? ', ' + ui.femClause : '')); var chTag = ch ? ', ' + ch + ' chords' : ''; var fam = ''; try{ fam = sunoExtra(familyFor(g), max); }catch(e){} var s = g + ', ' + bpm + ' BPM, ' + k + chTag + fam + ', ' + ba + ', ' + pe + ', ' + te + ', ' + sp + ', ' + en + ', ' + voixTag; if (s.length > max) s = g + ', ' + bpm + ' BPM, ' + k + chTag + ', ' + ba + ', ' + pe + ', ' + en + ', ' + voixTag; if (s.length > max) s = g + ', ' + bpm + ' BPM, ' + k + ', ' + en + ', ' + voixTag; if (s.length > max + 50) s = s.slice(0, max - 3) + '...'; return s; }
function shortTag(){ var vi = vocalInfo(); return vi.v.short || vi.v.t; }
function structText(){ var l = curLang(), ui = UI(), se = SECL(); var bpm = val('mzBpm'), g = val('mzGenre'), ba = val('mzBass'), pe = val('mzPerc'), te = val('mzTex'), so = val('mzSoma'), len = val('mzLen'); var vi = vocalInfo(); var tag = shortTag(); var ext = (len === ui.lenOpts[1]) ? '[' + se.up + ' : 16] \n\n' : ''; var tool = (len === ui.lenOpts[2]) ? '[' + se.out + ' : 16, percussions]' : '[' + se.out + ' : echo]'; var bloc = vi.v.instru ? '[' + se.ins + ']' : '[' + SV[l] + ' : ' + tag + (vi.v.fem ? ' (f)' : '') + ', ' + VL[l] + ']'; var chLine = val('mzChords') ? '[' + ui.chords + ' : ' + val('mzChords') + ']\n\n' : ''; return bloc + '\n\n[' + se.intro + ' : ' + bpm + ' BPM]\n\n' + chLine + '[' + se.sec + ' : ' + pe + ']\n\n[' + se.tex + ' : ' + te + ']\n\n[' + se.up + ' : ' + so + ']\n\n[' + se.drop + ' : ' + ba + ']\n\n[' + se.sec + ' : ' + g + ']\n\n[' + se.calm + ']\n\n' + ext + '[' + se.up + ' : percussions]\n\n[' + se.peak + ']\n\n' + tool; }
function lyricsText(){ var ui = UI(), bk = BK(), se = SECL(); var tag = shortTag(), theme = val('mzTheme'); var complet = false; try{ complet = gi('mzLyrLen').selectedIndex === 1; }catch(e){} var vi = vocalInfo(); if (vi.v.instru){ return '[' + se.ins + ']\n(' + ui.themeOf + ' : ' + theme + ')\n[' + ui.breathAllow + ' : ' + pickN(bk.excla, 3).join(' \u2026 ') + ']\n\n' + ui.instruTip; } var rk = /rock|m.tal|guitare|guitar|metal|grunge|screamo|shoegaze|djent|grind|mathcore|coldwave|dark wave/i.test(val('mzGenre')) && bk.coupletRock; var c1 = pickN(rk ? bk.coupletRock : bk.couplet, 4), c2 = pickN(rk ? bk.coupletRock : bk.couplet, 4), r = pickN(rk && bk.refrainRock ? bk.refrainRock : bk.refrain, 4), p = pickN(rk && bk.pontRock ? bk.pontRock : bk.pont, 2); var ex = pickN(bk.excla, 2).join(' \u2026 '); var big = /diva|duo|chor|ch\u0153ur|choir|coro/i.test(tag); var chTag = big ? tag : se.choir; var t = '[' + se.v1 + ' — ' + tag + ']\n' + c1.join('\n') + '\n(' + theme + ')\n\n[' + se.pre + ']\n' + ex + ' \u2026\n\n[' + se.ch + ' — ' + chTag + ']\n' + r.join('\n') + '\n'; if (complet){ t += '\n[' + se.v2 + ' — ' + tag + ']\n' + c2.join('\n') + '\n\n[' + se.ch + ' — ' + chTag + ']\n' + r.slice().reverse().join('\n') + '\n\n[' + se.br + ']\n' + p.join('\n') + '\n\n[' + se.chf + ']\n' + r.join('\n') + '\n\n[' + se.out + ']\n' + ex + '\n'; } return t; }
function notesText(){ var ui = UI(), nl = NLBL[curLang()] || NLBL.fr; var cur = M('preset'); var s = nl[0] + ' : ' + val('mzIntent') + ' \u00b7 ' + (cur || '') + '<br>' + 'BPM ' + val('mzBpm') + ' \u00b7 ' + val('mzKey') + ' \u00b7 ' + val('mzGenre') + '<br>' + nl[1] + ' : ' + val('mzSoma') + ' — ' + val('mzBass') + '.<br>' + nl[2] + ' ' + BK().meta.voice + ' : ' + shortTag() + ' — ' + ui.vocalClause + '. ' + ui.theme + ' : ' + val('mzTheme') + '.<br>' + nl[3] + ' : kick + prioritaire, mono <120 Hz.<br>' + nl[4] + ' : Style < ' + styleMax() + ' ' + ui.chars + '.'; return s; }
function syllables(line, lang){ var tot = 0; var words = String(line).toLowerCase().replace(/[\u2019']/g, ' ').replace(/[^a-z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u00f9\u00fb\u00fc\u00ff\u0153\u00e6\u00e7\u00e1\u00ed\u00f3\u00fa\u00f1\u00e0\u00e8\u00ec\u00f2\u00f9\u0105\u0107\u0119\u0142\u0144\u015b\u017a\u017c]+/g, ' ').trim().split(/\s+/); for (var k = 0; k < words.length; k++){ var w = words[k]; if (!w) continue; var groups = w.match(/[aeiouy\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u00f9\u00fb\u00fc\u00e1\u00ed\u00f3\u00fa\u00f1\u00e0\u00e8\u00ec\u00f2\u0105\u0119]+/g); var n = groups ? groups.length : 0; if (lang === 'fr'){ if (n > 1 && /e$/.test(w)) n--; if (n > 1 && /ent$/.test(w) && w.length > 4) n--; } tot += Math.max(n, 1); } return tot; }
function checker(){ var ui = UI(), bk = BK(), l = curLang(); var el = gi('mzCheck'); if (!el) return; var raw = gi('mzLyrics').textContent; var lines = raw.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s && !/^\[.+\]$/.test(s) && !/^\(.+\)$/.test(s); }); if (!lines.length){ el.textContent = ui.chkNone; return; } var counts = lines.map(function(s){ return syllables(s, l); }); var avg = counts.reduce(function(a, b){ return a + b; }, 0) / counts.length; var longs = []; counts.forEach(function(c, i){ if (c > 10) longs.push((i + 1) + ' (' + c + ')'); }); var low = ' ' + raw.toLowerCase().replace(/[^a-z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u00f9\u00fb\u00fc\u00ff\u0153\u00e6\u00e7\u00e1\u00ed\u00f3\u00fa\u00f1\u00e0\u00e8\u00ec\u00f2\u0105\u0107\u0119\u0142\u0144\u015b\u017a\u017c]+/g, ' ') + ' '; var found = []; bk.foreignWords.forEach(function(w){ if (low.indexOf(' ' + w + ' ') >= 0 && found.indexOf(w) < 0) found.push(w); }); var h = ui.chkVerses + ' : ' + lines.length + ' \u00b7 ' + avg.toFixed(1) + ' ' + ui.chkAvg; if (longs.length) h += '\n\u26a0\ufe0f ' + ui.chkLong + ' (>10) : ' + longs.join(', '); else h += '\n\u2705 ' + ui.chkLongOk; if (found.length) h += '\n\u26a0\ufe0f ' + ui.chkForeign + ' : ' + found.join(', '); else h += '\n\u2705 ' + ui.chkForeignOk; el.textContent = h; }
function generate(){ var ui = UI(), bk = BK(); if (!val('mzTitre').trim()) setVal('mzTitre', pick(bk.titles)); var s = styleText(); gi('mzStyle').textContent = s; var max = styleMax(); var c = gi('mzChars'); c.textContent = '\u00b7 ' + s.length + '/' + max + ' ' + ui.chars; try{ c.classList.toggle('bad', s.length > max); }catch(e){} gi('mzStruct').textContent = structText(); gi('mzNotes').innerHTML = notesText(); App.Music.refreshLyrics(false); }
function surprise(){ var ids = ['mzGenre','mzKey','mzChords','mzBass','mzPerc','mzTex','mzSpat','mzEnergy','mzSoma','mzVocal','mzIntent','mzTheme']; ids.forEach(function(id){ var el = gi(id); if (el && el.options.length) el.selectedIndex = Math.floor(Math.random() * el.options.length); }); var bpm = gi('mzBpm'); if (bpm){ bpm.value = 60 + Math.floor(Math.random() * 121); gi('mzBpmVal').textContent = bpm.value; } setVal('mzTitre', pick(BK().titles)); SM('preset', ''); var pc = gi('mzPresets'); if (pc) Array.prototype.forEach.call(pc.children, function(x){ x.classList.remove('on'); }); generate(); }
function applyPreset(i){ var ui = UI(); var pr = PRESETS_FR[i]; if (!pr) return; SM('preset', ui.presetNames[i] || pr[0]); var p = pr[1]; setVal('mzGenre', p[0]); var bpm = gi('mzBpm'); if (bpm){ bpm.value = p[1]; gi('mzBpmVal').textContent = p[1]; } setVal('mzKey', p[2]); setVal('mzBass', p[3]); setVal('mzPerc', p[4]); setVal('mzTex', p[5]); setVal('mzSpat', p[6]); setVal('mzEnergy', p[7]); setVal('mzSoma', p[8]); var vo = gi('mzVocal'); if (vo && p[9] < vo.options.length) vo.selectedIndex = p[9]; var pc = gi('mzPresets'); if (pc) Array.prototype.forEach.call(pc.children, function(x){ try{ x.classList.toggle('on', String(x.dataset.i) === String(i)); }catch(e){} }); generate(); }
function copyAll(){ var ui = UI(), hd = HDR[curLang()] || HDR.fr; var ver = ''; try{ ver = gi('mzSunoVer').selectedOptions[0].text; }catch(e){} clip(hd[0] + ':\n' + val('mzTitre') + '\n\n' + hd[1] + ' (' + ver + '):\n' + gi('mzStyle').textContent + '\n\n' + hd[2] + ':\n' + val('mzExclude') + '\n\n' + hd[3] + ':\n' + gi('mzStruct').textContent + '\n\n' + hd[4] + ' ' + BK().meta.voice + ':\n' + gi('mzLyrics').textContent); }
function exportTxt(){ var ui = UI(), hd = HDR[curLang()] || HDR.fr; var ver = ''; try{ ver = gi('mzSunoVer').selectedOptions[0].text; }catch(e){} var slug = (val('mzTitre') || 'morceau').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'morceau'; var d = new Date(); function pad(n){ return String(n).padStart(2, '0'); } var txt = (val('mzTitre') || '') + '\nPack Suno — ' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' — ' + ver + '\n\n=== ' + hd[1] + ' ===\n' + gi('mzStyle').textContent + '\n\n=== ' + hd[2] + ' ===\n' + val('mzExclude') + '\n\n=== ' + hd[3] + ' ===\n' + gi('mzStruct').textContent + '\n\n=== ' + hd[4] + ' ' + BK().meta.voice + ' ===\n' + gi('mzLyrics').textContent + '\n'; var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })); a.download = 'suno-' + slug + '.txt'; a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000); }
var HIST_KEY = 'sofia-musique-suno-hist-v1';
function loadHistArr(){ try{ return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }catch(e){ return []; } }
function storeHistArr(h){ try{ localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 30))); }catch(e){} }
function renderHist(){ var ui = UI(); var sel = gi('mzHist'); if (!sel) return; var h = loadHistArr(); sel.innerHTML = h.length ? h.map(function(e, i){ return "<option value='" + i + "'>" + esc((e.titre || ui.emptyHist).slice(0, 40)) + '</option>'; }).join('') : '<option>' + esc(ui.emptyHist) + '</option>'; }
function saveHist(){ var ui = UI(); var h = loadHistArr(); h.unshift({ t: new Date().toISOString(), lang: curLang(), titre: val('mzTitre'), style: gi('mzStyle').textContent, struct: gi('mzStruct').textContent, lyrics: gi('mzLyrics').textContent, exclude: val('mzExclude'), ver: val('mzSunoVer') }); storeHistArr(h); var back = loadHistArr(); renderHist(); var sel = gi('mzHist'); if (sel) sel.value = '0'; var note = gi('mzHistNote'); if (note) note.textContent = (back.length ? '\u2713 ' + ui.saveHist + ' (\u00b7 ' + back.length + '/30)' : '\u26a0\ufe0f stockage local bloqu\u00e9 — sauvegarde impossible (mode priv\u00e9 ?)'); }
function loadHistSel(){ var ui = UI(); var sel = gi('mzHist'); if (!sel) return; var h = loadHistArr(); var e = h[parseInt(sel.value)]; if (!e) return; setVal('mzTitre', e.titre || ''); setVal('mzCustom', e.lyrics || ''); App.Music.setLyricMode('mine', true); if (e.exclude != null) setVal('mzExclude', e.exclude); if (e.ver) setVal('mzSunoVer', e.ver); generate(); }
function delHist(){ var ui = UI(); var sel = gi('mzHist'); if (!sel) return; var h = loadHistArr(); var i = parseInt(sel.value); if (isNaN(i) || !h[i]) return; h.splice(i, 1); storeHistArr(h); renderHist(); var note = gi('mzHistNote'); if (note) note.textContent = '\u2713 ' + ui.delHist + ' (\u00b7 ' + h.length + '/30)'; }
function setLyricMode(m, silent){ SM('lyrMode', m); var a = gi('mzModeAi'), b = gi('mzModeMine'); if (a) a.className = (m === 'mine') ? 'mz-ghost' : 'mz-big'; if (b) b.className = (m === 'mine') ? 'mz-big' : 'mz-ghost'; if (!silent && m === 'mine'){ var c = gi('mzCustom'); if (c){ try{ c.scrollIntoView({ block: 'center' }); }catch(eS){} try{ c.focus({ preventScroll: true }); }catch(eF){ try{ c.focus(); }catch(eF2){} } } } }
function renderThemeChips(){ var pc = gi('mzThemeChips'); if (!pc) return; pc.innerHTML = ''; var cur = val('mzTheme'); BK().themes.forEach(function(t){ var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = t; btn.title = t; if (t === cur) btn.classList.add('on'); btn.onclick = function(){ setVal('mzTheme', t); Array.prototype.forEach.call(pc.children, function(x){ x.classList.remove('on'); }); btn.classList.add('on'); }; pc.appendChild(btn); }); }
async function composeSong(){ try{ var ll = gi('mzLyrLen'); if (ll && ll.options.length > 1) ll.selectedIndex = 1; }catch(e){} var mode = M('lyrMode') || 'sofia'; if (mode === 'sofia'){ if (val('mzCustom').trim()){ setLyricMode('mine', true); } else { try{ await aiLyrics(); }catch(e){} } } else { setLyricMode('mine', true); } generate(); renderThemeChips(); try{ var y = gi('mzStyle'); if (y && y.scrollIntoView) y.scrollIntoView({ block: 'start' }); }catch(e){} }
var SONG_CHANNEL = 'sofia-chansons';
var SONG_ADMIN_HASH = '04bb44deb93d0e331c908a13c8b1e6ef1fda8548312e6b198da927f71c1cf311';
function mountGallery(){
  try {
    var ctn = gi('mzGalleryCtn'); if (!ctn) return;
    var ui = UI();
    ctn.innerHTML = '';
    var com = null;
    try { com = root.commentsPlugin({ channel: SONG_CHANNEL, channelLabel: '🎵 Sofia chansons', newestCommentsAtTop: true, height: 420, forceColorScheme: 'dark', commentPlaceholderText: ui.pubPh, submitButtonText: ui.pubSend, adminPasswordHash: SONG_ADMIN_HASH }); } catch(e) { ctn.textContent = ui.pubFail; return; }
    SM('songCom', com);
    try { ctn.innerHTML = com; } catch(e2) { ctn.textContent = String(com); }
  } catch(e) {}
}
var SUNO_TRACKS = [{ t: 'Czuj Więcej — 1813Watt', id: 'adefcf2b-94fe-43fc-b3da-79078e063f3a' }, { t: 'Isabel und Valeria das gleiche Ziel — 1813Watt', id: 'ea851d4a-d933-44f0-bb2e-fd988e322cd7' }, { t: 'Sulla Riva Setosa (version 2) — 1813Watt', id: 'cdd94818-028e-4932-a9c4-87f5986a17ff' }, { t: 'Eine Frau an meiner Seite (version 2) — 1813Watt', id: 'f88c9097-2d6f-4126-8f71-5af240405497' }, { t: 'Primal Pulse — 1813Watt', id: '83456d63-684b-4188-b39e-2c2eb1043382' }, { t: 'La Rose au Beau Contour (version 2) — 1813Watt', id: '85cae89f-fa6d-46c7-a450-306d152b8293' }, { t: 'Apogé en Écho (version 2) — 1813Watt', id: 'ce4a34a9-648f-4ac2-b381-7c65a66123d2' }, { t: 'C\u0027est pour cela que je t\u0027aime si étrange version hard rock — 1813Watt', id: '72ad8415-0e85-4af7-a6c5-b1708498aa18' }, { t: 'Mi Último Imperio — 1813Watt', id: '4e90aa51-1fd5-4402-81e4-a525e7e8969f' }, { t: 'Sulla Riva Setosa — 1813Watt', id: 'd11301f0-772b-4fc7-b19b-ef74104442ba' }, { t: 'Le paradis \u2014 1813Watt', id: '83b9e3bb-423b-45a2-b04e-5e384c8c8f16' }, { t: 'C\u0027est pour cela que je t\u0027aime si \u00e9trange remix techno \u2014 1813Watt', id: '704dbbc6-b101-4435-b573-59c3eb086c17' }, { t: 'Apog\u00e9 en \u00c9cho \u2014 1813Watt', id: 'cdb82cd4-816b-4242-b68a-cadf1eb5bf83' }, { t: 'Deep G Minor Pulse \u2014 1813Watt', id: '4d3a51f1-f1aa-4e92-ad11-903b249bae93' }, { t: 'La Rose au Beau Contour \u2014 1813Watt', id: '77fecd57-8747-4f29-8ad4-c1a6a23b2d03' }, { t: 'A Rose with a Beautiful \u2014 1813Watt', id: 'ed0d5e91-7ade-45d7-911a-8017dc350b59' }, { t: 'Eine Frau an meiner Seite \u2014 1813Watt', id: 'e958bf3e-87e8-4d39-a898-060af91462c1' }, { t: 'She', mp3: 'src/music/she.mp3' }];
function renderListen(){
  try {
    var ctn = gi('mzListenCtn'); if (!ctn) return;
    ctn.innerHTML = '';
    SUNO_TRACKS.forEach(function(tr){
      var cap = document.createElement('div'); cap.className = 'mz-sub'; cap.style.fontSize = '13px'; cap.style.margin = '8px 0 4px'; cap.textContent = '\uD83C\uDFB5 ' + tr.t;
      if (tr.mp3){
        var au = document.createElement('audio');
        au.controls = true; au.preload = 'none'; au.src = tr.mp3;
        au.style.width = '100%'; au.style.margin = '4px 0 12px';
        ctn.appendChild(cap); ctn.appendChild(au);
      } else {
        var fr = document.createElement('iframe');
        fr.src = 'https://suno.com/embed/' + tr.id;
        fr.width = '100%'; fr.height = '240';
        fr.setAttribute('frameborder', '0');
        fr.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
        fr.allowFullscreen = true; fr.loading = 'lazy';
        fr.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        fr.style.width = '100%'; fr.style.border = '0'; fr.style.borderRadius = '8px';
        ctn.appendChild(cap); ctn.appendChild(fr);
      }
    });
  } catch(e) {}
}
function coverPromptText(){ var si = gi('mzCoverStyle'); var style = si ? si.value : 'Cinematic'; try{ return buildCoverPrompt(val('mzTitre') || 'Untitled', val('mzGenre'), style); }catch(e){ return { prompt: '', negative: '' }; } }
async function coverGo(){ var st = gi('mzCoverStatus'), box = gi('mzCoverOut'); var say = function(x){ if(st) st.textContent = x; }; var btn = gi('mzCoverGo'); var timer = null; try{ var b = coverPromptText(); if(!b.prompt){ say(''); return; } if(box) box.innerHTML = ''; if(btn) btn.disabled = true; var k = 0; timer = setInterval(function(){ k++; var d = ''; for(var i = 0; i < k % 4; i++) d += '.'; say('\uD83C\uDFA8' + d); }, 350); var r = await root.generateImage({ prompt: b.prompt, negativePrompt: b.negative, resolution: '768x768' }); var url = (r && r.dataUrl) || String(r || ''); if(timer) clearInterval(timer); timer = null; if(btn) btn.disabled = false; if(!url){ say(''); return; } say(''); if(box){ box.innerHTML = ''; var img = document.createElement('img'); img.src = url; img.alt = 'cover'; img.style.cssText = 'max-width:100%;border-radius:12px'; box.appendChild(img); } }catch(e){ if(timer) clearInterval(timer); if(btn) btn.disabled = false; say(''); } }
async function publishSong(){
  var ui = UI();
  var st = gi('mzPubStatus');
  var say = function(t){ if (st) st.textContent = t; };
  var title = val('mzTitre').trim(), lyrics = val('mzCustom').trim();
  if (!title || !lyrics){ say(ui.pubEmpty); return; }
  var ok = false;
  try { ok = window.confirm(ui.pubConfirm); } catch(e) { ok = true; }
  if (!ok) return;
  say(ui.aiWriting);
  var txt = '🎵 ' + title + '\n\nSTYLE:\n' + gi('mzStyle').textContent + '\n\nSTRUCTURE:\n' + gi('mzStruct').textContent + '\n\nPAROLES:\n' + lyrics;
  try {
    var com = M('songCom');
    if (!com || !com.submit) throw new Error('no-instance');
    try { if (com.setNicknameForNextComment) { var _nr = com.setNicknameForNextComment('🎵 ' + title.slice(0, 40)); if (_nr && _nr.catch) _nr.catch(function(){}); } } catch(eN) {}
    await Promise.race([com.submit(txt), new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timeout')); }, 60000); })]);
    say(ui.pubOk);
  } catch(e) { say(ui.pubFail); }
}
function refreshLyrics(force){ var ui = UI(); var c = val('mzCustom').trim(); gi('mzLyrics').textContent = c || ui.customEmpty; checker(); }
async function aiLyrics(){ var ui = UI(), bk = BK(); if (val('mzCustom').trim()){ var keep = true; try{ keep = window.confirm('Remplacer tes paroles par des paroles IA ?'); }catch(eC){ keep = true; } if (!keep) return; } var tag = shortTag(); var prompt = bk.aiPrompt.split('{genre}').join(val('mzGenre')).split('{theme}').join(val('mzTheme')).split('{tag}').join(tag); gi('mzLyrics').textContent = ui.aiWriting; try{ var res = await App.Core.generateText({ instruction: prompt, onChunk: function(d){ try{ var c = (d && (d.fullTextSoFar || d.textChunk)) || ''; if (c) gi('mzLyrics').textContent = c; }catch(e){} } }); var txt = String((res && res.text) || '').trim(); if (txt){ gi('mzLyrics').textContent = txt; setVal('mzCustom', txt); setLyricMode('mine', true); } checker(); }catch(e){ gi('mzLyrics').textContent = ui.aiFail + '\n\n' + lyricsText(); checker(); } }
function wrapLyrics(){ var ui = UI(), se = SECL(); var tag = shortTag(); var raw = val('mzCustom').trim() || gi('mzLyrics').textContent.trim(); if (!raw) return; var lines = raw.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s && !/^\[.+\]$/.test(s); }); if (!lines.length) return; var out = ''; if (lines.length <= 4) out = '[' + se.v1 + ' — ' + tag + ']\n' + lines.join('\n'); else if (lines.length <= 8) out = '[' + se.v1 + ' — ' + tag + ']\n' + lines.slice(0, 4).join('\n') + '\n\n[' + se.ch + ' — ' + se.choir + ']\n' + lines.slice(4).join('\n'); else out = '[' + se.v1 + ' — ' + tag + ']\n' + lines.slice(0, 4).join('\n') + '\n\n[' + se.ch + ' — ' + se.choir + ']\n' + lines.slice(4, 8).join('\n') + '\n\n[' + se.v2 + ' — ' + tag + ']\n' + lines.slice(8).join('\n'); setVal('mzCustom', out); setLyricMode('mine', true); gi('mzLyrics').textContent = out; checker(); }
function editLyrics(){ var ui = UI(); var t = gi('mzLyrics').textContent; setVal('mzCustom', t); setLyricMode('mine', true); checker(); var c = gi('mzCustom'); if (c){ try{ c.focus(); }catch(e){} } }
function triad(){ var a = (val('mzTrigA') || 'sombre').trim(), b = (val('mzTrigB') || 'ouvre').trim(), c = (val('mzTrigC') || 'br\u00fble').trim(); return { a: a, b: b, c: c }; }
function triHash(t){ var s = t.a + '|' + t.b + '|' + t.c, h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function friction(){ var t = triad(); var h = triHash(t); var f = 30 + (h % 61); var distinct = {}; distinct[t.a.toLowerCase()] = 1; distinct[t.b.toLowerCase()] = 1; distinct[t.c.toLowerCase()] = 1; var n = Object.keys(distinct).length; if (n < 3) f -= 15; var el = gi('mzFriction'); if (el) el.innerHTML = 'triade <b>' + esc(t.a) + ' \u00b7 ' + esc(t.b) + ' \u00b7 ' + esc(t.c) + '</b> — 120\u00b0<br>friction ' + f + '/100 \u00b7 spirale \u2192 porte HSP90 \u2192 projection'; return f; }
function maStyle(v, bpm, m1, m2, f){ var heat = f > 66 ? 'air heurt\u00e9, frapp\u00e9 des trois c\u00f4t\u00e9s' : (f > 33 ? 'air tendu entre les tractions' : 'air laiss\u00e9 large, \u00e0 peine troubl\u00e9'); return 'm\u00e9lancolie ' + v.genre + ', ' + bpm + ' BPM senti comme pouls sous la peau, ' + m1 + ', ' + m2 + ', ' + heat + ', sans paroles chant\u00e9es'; }
function storyBrackets(i, n, ctx){ var green2 = 'vert veut dire encore, jaune ralentit, rouge stoppe tout'; var wlist = (ctx.words || []).map(function(w, k){ return (k + 1) + ':' + String(w).split(' — ')[0]; }).join(' > '); var spiral = '[Triade : ' + ctx.tri.a + ' x ' + ctx.tri.b + ' x ' + ctx.tri.c + ' — 120 degr\u00e9s][Spirale : ' + wlist + '][Porte : pli HSP90 — ' + ctx.gate + '][Projection vers avant]'; var body = '[Combat somatique : ' + ctx.combat.pair + ' — friction ' + ctx.combat.force + '][Vide Ma : ' + ctx.maV + '][Racine : ' + ctx.root + ']'; var head = (i === 0) ? ('[Intro : ' + ctx.bpm + ' BPM — ' + ctx.beat + '][Seuil : ' + ctx.god + ' regarde, ' + ctx.mania + ' commence][Transe : ' + ctx.tri.a + ' / ' + ctx.tri.b + ' / ' + ctx.tri.c + ' — ' + ctx.nlp + ']') : ('[Chapitre : ' + ctx.bpm + ' BPM — ' + ctx.beat + '][Possession : ' + ctx.god + ', ' + ctx.mania + '][Transe : ' + ctx.nlp + ']'); var tail = (i === n - 1) ? ('[Apaisement : poids chaud, eau, couverture][Forme ouverte : ' + ctx.geo + ' ' + ctx.site + '][Final : fondu sub tenu]') : ('[Forme : ' + ctx.geo + ' ' + ctx.site + '][Explosion : d\u00e9ferlante sentie dans le corps]'); return ((ctx.sung ? '[Paroles chantées]' : '[Instrumental, sans paroles chant\u00e9es, sans voix]') + '\n' + head + '\n' + spiral + '\n' + body + '\n' + tail); }
var SOMA27 = ['plantes','chevilles','poplit\u00e9','int\u00e9rieur cuisses','plancher pelvien','sacrum','p\u00e9rin\u00e9e','pli fessier','bas-ventre','lombaires','plexus solaire','diaphragme','intercostaux','sternum','pectoraux','omoplates','clavicules','gorge','cervicales','m\u00e2choire','l\u00e8vres','nasal','temporal','occiput','sommet','poignets-paume','doigts'];
var BRANCH5 = ['R1 racine 1-5 ancre sous-pelvienne','R2 tronc 6-11 pompe visc\u00e9rale','R3 anneau 12-17 bois agoniste','R4 \u00e9corce 18-22 coque dissidente','R5 canop\u00e9e 23-27 feuilles apex'];
function combatPair(i, seed){ var k = (seed + i * 5) % 27; var k2 = (k + 13) % 27; return { k: k + 1, k2: k2 + 1, pair: SOMA27[k] + ' vs ' + SOMA27[k2], v1: 'V' + (k + 1) + '/32', v2: 'V' + (k2 + 1) + '/32', force: '100/117', branch: BRANCH5[Math.min(4, Math.floor(k / 5.5))] }; }
function nineWords(seed){ var pool = JOURNEY_FR.doubles.slice(); var h = seed >>> 0; var arr = pool.slice(); for (var i = arr.length - 1; i > 0; i--){ h = (h * 1103515245 + 12345) >>> 0; var j = h % (i + 1); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; } return arr.slice(0, 9); }
function drawGeo(trackWords){ var cv = gi('mzGeo'); if (!cv) return; var x = cv.getContext('2d'), t = triad(), f = friction() / 100; var W = cv.width, H = cv.height; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); var cx = W / 2, cy = H / 2 + 12, R = Math.min(W, H) * 0.36; var hue = (f * 120) % 360; var angs = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]; var labels = [t.a, t.b, t.c]; var pts = angs.map(function(a){ return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; }); x.strokeStyle = 'hsla(' + hue + ',60%,40%,.5)'; x.lineWidth = 1; x.beginPath(); pts.forEach(function(p, i){ if (i === 0) x.moveTo(p[0], p[1]); else x.lineTo(p[0], p[1]); }); x.closePath(); x.stroke(); pts.forEach(function(p, i){ x.fillStyle = 'hsla(' + hue + ',95%,65%,1)'; x.beginPath(); x.arc(p[0], p[1], 5, 0, 7); x.fill(); x.fillStyle = '#efe9ff'; x.font = '12px sans-serif'; x.fillText(labels[i], Math.min(Math.max(p[0] - 20, 4), W - 60), p[1] - 10); }); x.strokeStyle = 'hsla(' + hue + ',100%,65%,.9)'; x.lineWidth = 1.6; x.beginPath(); var steps = 200; for (var s = 0; s <= steps; s++){ var th = s * 0.075; var r = R * (1 - s / (steps * 0.9)); var px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r * 0.72; if (s === 0) x.moveTo(px, py); else x.lineTo(px, py); } x.stroke(); x.fillStyle = '#b9aef5'; x.font = '11px sans-serif'; x.fillText('triade \u00e9quilat\u00e9rale \u00b7 spirale \u00b7 porte HSP90 \u2192 projection', 8, 16); var words = trackWords || nineWords(triHash(t)); x.fillStyle = '#8f86c9'; words.slice(0, 9).forEach(function(w, i){ x.fillText((i + 1) + ':' + String(w).split(' — ')[0], 8 + (i % 3) * 150, H - 34 + Math.floor(i / 3) * 12); }); }
function drawTree(pairs, lift){ var cv = gi('mzTree'); if (!cv) return; var x = cv.getContext('2d'); var W = cv.width, H = cv.height; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); var cx = W / 2, base = H - 14; x.strokeStyle = '#5a4a9a'; x.lineWidth = 10 - Math.min(6, lift); x.beginPath(); x.moveTo(cx, base); x.lineTo(cx, 70); x.stroke(); x.lineWidth = 2; var zones = ['RACINE 1-5', 'TRONC 6-11', 'ANNEAU 12-17', 'ECORCE 18-22', 'CANOP\u00c9E 23-27']; zones.forEach(function(z, j){ var y = base - 14 - j * 30; x.strokeStyle = 'hsla(' + (280 - j * 22) + ',80%,' + (55 + j * 4) + '%,.9)'; x.beginPath(); x.moveTo(cx - 70 + j * 6, y); x.lineTo(cx + 70 - j * 6, y - 14); x.stroke(); x.fillStyle = '#efe9ff'; x.font = '11px sans-serif'; x.fillText(z, 8, y - 4); }); x.fillStyle = '#b9aef5'; x.font = '11px sans-serif'; x.fillText('mont\u00e9e arborescente \u00b7 ' + pairs.slice(0, 3).map(function(p){ return p.pair; }).join(' / '), 8, 14); }
async function aiStory(n){ var J = JOURNEY_FR; var god = val('mzGod'), mania = val('mzMania'), t = triad(), f = friction(); var beats = J.ritual.slice(0, n).map(function(v){ return v.arc + ' (' + v.genre + '): ' + v.primal; }).join('\n'); var task = 'T\u00c2CHE : \u00c9cris ' + n + ' temps forts num\u00e9rot\u00e9s, en fran\u00e7ais, 1-2 phrases chacun, non-explicites, consentis. Voix : ' + god + '. Mania : ' + mania + '. Triade ' + t.a + ' / ' + t.b + ' / ' + t.c + '. Sortie : temps num\u00e9rot\u00e9s uniquement.'; var prompt = 'Tu \u00e9cris une histoire musicale en fran\u00e7ais : tout public, \u00e9motion sinc\u00e8re, jamais vulgaire.\nMORCEAUX :\n' + beats + '\n' + task; gi('mzStory').innerHTML = '<i>\u2728 IA…</i>'; try{ var res = await App.Core.generateText({ instruction: prompt, onChunk: function(d){ try{ var c = (d && (d.fullTextSoFar || d.textChunk)) || ''; if (c) gi('mzStory').innerHTML = '<b>HISTOIRE IA :</b><br>' + esc(c).replace(/\n/g, '<br>'); }catch(e){} } }); var txt = String((res && res.text) || ''); gi('mzStory').innerHTML = '<b>HISTOIRE IA :</b><br>' + esc(txt).replace(/\n/g, '<br>'); return txt.split('\n').map(function(s){ return s.replace(/^\d+[\)\.:]\s*/, '').trim(); }).filter(Boolean); }catch(e){ gi('mzStory').innerHTML = '<b>IA indisponible.</b>'; return []; } }
async function genJourney(useAI){ var J = JOURNEY_FR; var n = parseInt(val('mzTrackCount')) || 5; var god = val('mzGod'), mania = val('mzMania'), t = triad(), f = friction(); var beats = useAI === false ? [] : await aiStory(n); var sung = false; try { sung = !!(gi('mzSung') && gi('mzSung').checked); } catch (eSg) {} var _fullRock = false; try { _fullRock = /rock|m.tal|guitare|guitar|metal|grunge|screamo|shoegaze|djent|grind|mathcore|coldwave|dark wave/i.test(val('mzGenre')); } catch (eFR) {} if (!beats.length){ for (var i = 0; i < n; i++){ var v0 = J.ritual[i % J.ritual.length]; beats.push(((_fullRock && v0.primalRock) ? v0.primalRock : v0.primal) + ' — sous le regard de ' + god.split(' — ')[0]); } } var phases = J.phases.slice(); while (phases.length < n) phases = phases.concat(phases); var nlpPool = val('mzNlp').split('/').map(function(s){ return s.trim(); }).filter(Boolean); var out = '', pairs = []; for (var i = 0; i < n; i++){ var ph = phases[i % phases.length]; var nlp = nlpPool.length ? nlpPool[i % nlpPool.length] : 'laisse-toi sombrer'; var words = nineWords(triHash(t) + i * 101 + 7); var gate = (i === n - 1) ? 'lib\u00e9ration apais\u00e9e finale' : ('pli chaperon HSP90 ' + (i + 1) + '/' + n); var combat = combatPair(i, triHash(t)); pairs.push(combat); var maV = pick(J.maVoids), rootP = pick(J.roots); var geo = pick(J.geo), site = pick(J.sites); var ma1 = pick(J.maSpaces), ma2 = pick(J.maSpaces); var v = J.ritual[i % J.ritual.length]; try { var _sg = val('mzGenre') || '', _sb = parseInt(val('mzBpm')) || 0; if ((_fullRock || /rock|m.tal|guitare|guitar|grunge|screamo|shoegaze|djent|grind|mathcore|coldwave|dark wave/i.test(v.genre || '')) && /rock|m.tal|guitare|guitar|metal|grunge|screamo|shoegaze|djent|grind|mathcore|coldwave|dark wave/i.test(_sg) && _sg !== v.genre) { v = Object.assign({}, v, { genre: _sg }); if (_sb >= 100 && _sb <= 200) v.bpm = _sb; v._sel = true; } } catch (eSg) {} var snd = J.geo2sound[geo] || ['ligne de basse puls\u00e9e roulante']; var bpm = v.bpm + Math.round((f / 100) * 8) + (i === n - 1 ? -6 : 0); var style = maStyle(v, bpm, ma1, ma2, f); try { if (/rock|m.tal|guitare|guitar|grunge|screamo|shoegaze|djent|grind|mathcore|coldwave|dark wave/i.test(v.genre || '')) style = style.replace(/^m[^ ]+ /, 'rage '); } catch (eRg) {} try { if (sung) { var _vt = ''; try { _vt = shortTag(); } catch(eV){} style = style.replace(/sans paroles chantées/, _vt ? ('paroles chantées : ' + _vt) : 'paroles chantées'); } } catch (eSg2) {} if (style.length > 200) style = style.slice(0, 197) + '...'; try { if (v._sel) { var _pn = ''; try { _pn = M('preset') || ''; } catch (eP) {} if (_pn) style += ' · preset « ' + _pn + ' »'; } } catch (ePm) {} var struct = storyBrackets(i, n, { bpm: bpm, geo: geo, nlp: nlp, site: site, snd: snd, beat: beats[i % beats.length], sung: sung, god: god.split(' — ')[0], mania: mania, f: f, tri: t, words: words, gate: gate, combat: combat, maV: maV, root: rootP }); try { if (sung) { var _raw = ''; try { _raw = gi('mzLyrics').textContent || ''; } catch(eLR){} var _vl = _raw.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s && s[0] !== '[' && s[0] !== '('; }); if (!_vl.length) { try { _vl = lyricsText().split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s && s[0] !== '[' && s[0] !== '('; }); } catch(eLG){} } if (_vl.length) { var _tg2 = ''; try { _tg2 = shortTag(); } catch(eT2){} var _take = []; for (var _k = 0; _k < 4; _k++) _take.push(_vl[(i * 4 + _k) % _vl.length]); struct += '\n[Paroles' + (_tg2 ? ' — ' + _tg2 : '') + ']\n' + _take.join('\n'); } } } catch(eSu) {} out += 'MORCEAU ' + (i + 1) + ' \u00b7 ' + String(ph).toUpperCase() + ' — ' + v.arc + ' \u00b7 friction ' + f + '\nTRIADE : ' + t.a + ' x ' + t.b + ' x ' + t.c + '\nSTYLE : ' + style + '\nSTRUCTURE :\n' + struct + '\n\n'; } gi('mzJourney').textContent = out.trim(); gi('mzChain').textContent = 'CHA\u00ceNE : triade ' + t.a + ' x ' + t.b + ' x ' + t.c + ' \u2192 ' + (sung ? n + ' morceaux chantés.' : n + ' instrumentaux.'); drawGeo(nineWords(triHash(t) + 7)); gi('mzBody').innerHTML = pairs.map(function(p, i){ return 'T' + (i + 1) + ': ' + esc(p.pair) + ' \u2192 ' + esc(p.branch); }).join('<br>'); drawTree(pairs, f / 25); }
/* ---- Ronde musique-chat : une demande de chanson dans la fenêtre principale
   utilise le mode musique (banques procédurales fr/en/de/es/it/pl) et rapatrie
   le pack Suno (Style + Structure + Paroles) directement dans le chat. */
var SONGBANK_NAMES = {
pl: ["polonais","polonaise","polish","polski","polska","polskie","polsku","polszczyzna","polnisch","polaco","polacco"],
fr: ["francais","français","francaise","française","french","franzosisch","französisch","frances","francés","francese","francusku","francuski","francuska","francuskie"],
en: ["anglais","anglaise","english","englisch","ingles","inglese","angielsku","angielski","angielska","angielskie"],
de: ["allemand","allemande","german","deutsch","aleman","tedesco","niemiecku","niemiecki","niemiecka","niemieckie"],
es: ["espagnol","espagnole","spanish","spanisch","espanol","español","spagnolo","hiszpansku","hiszpanski","hiszpanska","hiszpanskie"],
it: ["italien","italienne","italian","italienisch","italiano","italiana","wlosku","wloski","wloska","wloskie"],
ja: ["japonais","japonaise","japanese","japanisch","japones","giapponese","japonsku","japonski","japonska","japonskie","nihongo","nihon","japan","にほんご","にほん","日本語","日文","日语"],
zh: ["chinois","chinoise","chinese","chinesisch","chino","cinese","chinsku","chinski","chinska","chinskie","mandarin","putonghua","zhongwen","hanyu","guoyu","huayu","中文","普通话","國語","国语","華語","华语","漢語","汉语"],
ko: ["coreen","coreenne","korean","koreanisch","coreano","coreana","koreansku","koreanski","koreanska","koreanskie","hangugeo","hangugmal","hangul","한국어","한국말","한글"],
hi: ["hindi","hindie","hindou","hindoue","hindoustani","hindustani","indien","indienne","hind","hindoustan","हिन्दी","हिन्दुस्तानी","हिंदू"]
};
function songNorm(s){ return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function songTargetLang(text){
  var n = " " + songNorm(text) + " ";
  var nraw = " " + String(text || "") + " ";
  var codes = ["pl","fr","en","de","es","it","ja","zh","ko","hi"];
  var CJKJ = ["にほんご","にほん","日本語","日文","日语"];
  var CJKZ = ["中文","普通话","國語","国语","華語","华语","漢語","汉语"];
  var CJKK = ["한국어","한국말","한글"];
  if (CJKJ.some(function(w){ return nraw.indexOf(w) >= 0; })) return "ja";
  if (CJKZ.some(function(w){ return nraw.indexOf(w) >= 0; })) return "zh";
  if (CJKK.some(function(w){ return nraw.indexOf(w) >= 0; })) return "ko";
  if (/[\u0900-\u097F]/.test(nraw)) return "hi";
  var SONGN = "(?:chanson|song|lied|piosenk|utwor|musique|music|muzyk|cancion|canzone|brano|lyrics|paroles|piosenka)\\w*";
  for (var k = 0; k < codes.length; k++){
    var names = SONGBANK_NAMES[codes[k]];
    for (var i = 0; i < names.length; i++){
      var w = songNorm(names[i]);
      if (new RegExp("(en|in)\\s+(langue|language|lingua|sprache|lengua|jezyk)\\s+" + w).test(n)) return codes[k];
      if (new RegExp("(^|\\W)(en|in|auf|po|em|na)\\s+" + w + "\\w*(\\W|$)").test(n)) return codes[k];
      if (new RegExp("\\b" + SONGN + "\\s+" + w + "\\w*").test(n)) return codes[k];
      if (new RegExp("\\b" + w + "\\w*\\s+" + SONGN).test(n)) return codes[k];
    }
  }
  var vm = n.match(/(?:la\s+|en\s+)?version\s+(francaise|anglaise|allemande|espagnole|italienne|polonaise|portugaise|russe|chinoise|japonaise|coreenne|indienne|hindoue|hindi|hindie|hindou|fr|en|de|es|it|pl|hi)\b/);
  if (vm) { var vv = vm[1]; if (/^fr/.test(vv)) return "fr"; if (/^anglaise$|^en$/.test(vv)) return "en"; if (/^allemande$|^de$/.test(vv)) return "de"; if (/^espagnole$|^es$/.test(vv)) return "es"; if (/^italienne$|^it$/.test(vv)) return "it"; if (/^polonaise$|^pl$/.test(vv)) return "pl"; if (/^indienne$|^hindoue$|^hindi$|^hindie$|^hindou$|^hi$/.test(vv)) return "hi"; }
  return null;
}
var SONG_VERBS = "cree\\w*|crea\\w*|compose\\w*|compos\\w*|ecris|ecriv\\w*|chante\\w*|fais\\w*|fait\\w*|fair\\w*|donn\\w*|gener\\w*|make\\w*|creat\\w*|sing\\w*|write\\w*|writ\\w*|canta\\w*|escrib\\w*|escriv\\w*|scriv\\w*|scrivi|compon\\w*|haz\\w*|fammi|fai|napisz|stworz|skomponuj|utworz|zrob|wymysl|spiewaj|zaspiewaj|uloz|banao|banaiye|likho|gao|sunao|rache";
var SONG_NOUNS = "lied\\w*|songs?|musik\\w*|melod\\w*|chanson\\w*|musique\\w*|morceau\\w*|music\\w*|tunes?|anthem\\w*|cancion\\w*|canzone\\w*|brano\\w*|paroles\\w*|lyrics|piosenk\\w*|utwor\\w*|muzyk\\w*|kawalek|kawalka|kawalki|szlagier\\w*|hymn\\w*|gana|gan[ae]|geet|sangeet|dhun";
function isSongRequest(text){
  var t = String(text || "").trim();
  if (!t || t.length > 2000) return false;
  var head = t.length > 600 ? t.slice(0, 600) : t;
  var n = " " + songNorm(head) + " ";
  var nraw = " " + head + " ";
  if (/traduis|traduire|traduction|translate|ubersetz|traduc|przetlumacz|tlumacz/i.test(n)) return false;
  if (/cours|lecon|apprendre|apprends|learn|unterricht|lekcj|naucz/i.test(n)) return false;
  if (/comment|dit-on|how do you say|veut dire|what does|co to znaczy|jak sie mowi/i.test(n)) return false;
  if (/(cette|ce|cet|this|that|ten|ta|to)\s+(phrase|texte|mot|text|word|zdanie|slowo)/i.test(n)) return false;
  if (/翻訳|翻译|번역|課程|课程|授業|レッスン|수업|教えて|教我|어떻게 말해|どう言う|怎么说|怎麼說/.test(nraw)) return false;
  if (/(この|その|这个|這個|이|그|저)\s*(歌詞|歌词|가사)/.test(nraw)) return false;
  if (/聴かせて|聞かせて|かけて|流して|播放|听歌|聽歌|放一首|틀어줘|재생|[^만]들어줘/.test(nraw)) return false;
  if (/बजाओ|बजाइए|चलाओ|प्ले करो/.test(nraw)) return false;
  if (/\bsuno\b/i.test(n) && new RegExp(SONG_VERBS + "|musique|music|chanson|song|piosenk|muzyk").test(n)) return true;
  if (/(mets?|joue|jouer|lance|lancer|ecoute|ecouter|listen|sluchaj|posluchaj|odtworz|puszcz|wlacz)\b[^?!;]{0,30}\b(chanson|musique|music|piosenk|song)\b/i.test(n)) return false;
  if (new RegExp("\\b(" + SONG_VERBS + ")\\b[^?!;]{0,40}\\b(" + SONG_NOUNS + ")\\b").test(n)) return true;
  var CJKV = "作って|作る|書いて|書く|歌って|歌う|創って|創る|作曲|创作|創作|作詞|作词|编曲|編曲|写|寫|唱|编|編|来一首|來一首|만들어줘|만들어|써줘|지어줘|불러줘|작곡해줘|작곡|지어|써|불러";
  var CJKN = "メロディー|メロディ|音楽|ソング|歌曲|歌|曲|音乐|音樂|曲子|旋律|멜로디|음악|노래|곡";
  if (new RegExp("(" + CJKV + ")[^?!;。！？]{0,40}(" + CJKN + ")|(" + CJKN + ")[^?!;。！？]{0,40}(" + CJKV + ")").test(nraw)) return true;
  var HIV = "बनाओ|बनाइए|बना दो|लिखो|लिखिए|लिख दो|गाओ|गाइए|सुनाओ|रचो|कंपोज़ करो|तैयार करो";
  var HIN = "गाना|गाने|गीत|संगीत|धुन|तराना|नग़मा";
  if (new RegExp("(" + HIV + ")[^?!;।]{0,40}(" + HIN + ")|(" + HIN + ")[^?!;।]{0,40}(" + HIV + ")").test(nraw)) return true;
  if (/\bmach\w*\b[^?!;]{0,20}\b(mir|uns|ein\w*|neue\w*|eigen\w*)\b[^?!;]{0,20}\b(lied\w*|songs?|musik\w*|melodie\w*)\b/.test(n)) return true;
  if (/\b(lied\w*|songs?|musik\w*)\b[^?!;]{0,30}\b(mach\w*|erstell\w*|komponier\w*|schreib\w*|dicht\w*)\b/.test(n)) return true;
  if (/^\s*(une?|a|the|eine?|one)?\s*(chanson|song|piosenka|piosenke|utwor|melodia|lied|cancion|canzone)\s+(sur|about|o|na|uber|sobre|su|di|von)\b/.test(n)) return true;
  return false;
}
var SONG_VERSION_WORDS = "francaise|anglaise|allemande|espagnole|italienne|polonaise|portugaise|russe|chinoise|japonaise|coreenne|indienne|hindoue|hindi|hindie|hindou|fr|en|de|es|it|pl|hi";
function isSongVersionRequest(text){
  var t = String(text || "").trim();
  if (!t || t.length > 300) return false;
  try { if (isSongRequest(t)) return false; } catch(e){}
  if (!new RegExp("(remets?\\s+(la\\s+)?version|version\\s+(" + SONG_VERSION_WORDS + "))", "i").test(t)) return false;
  try { return !!songTargetLang(t); } catch(e2) { return false; }
}
function curSessionM(){
  try { var st = App.State; var ss = st.sessions || []; for (var i = 0; i < ss.length; i++){ if (ss[i] && ss[i].id === st.currentSessionId) return ss[i]; } } catch(e){}
  return null;
}
function answerSongVersion(txt){
  var target = songTargetLang(txt);
  var lang = (target && BANKS[target]) ? target : curLang();
  try { if (target === "zh" && curLang() === "zh-CN") lang = "zh-CN"; } catch(eZ) {}
  var s = curSessionM();
  var prev = s && s._lastSong;
  if (!prev || !prev.names || !prev.names.length) { answerSong(txt); return; }
  var personTxt = prev.names.join(" ") + " : " + (prev.facts || "");
  var pack = generatePack(lang, prev.genre || genreFromText(txt), personTxt);
  postSong(pack, pack.lang);
}
function songBlocked(txt){
  try{
    if (App.RPG && App.RPG.state && App.RPG.state.active) return true;
    if (App.Deites && App.Deites.isActive && App.Deites.isActive()) return true;
    var s = null;
    try{ var ss = App.State.sessions || []; for (var i = 0; i < ss.length; i++){ if (ss[i] && ss[i].id === App.State.currentSessionId){ s = ss[i]; break; } } }catch(eS){}
    void s;
  }catch(e){}
  return false;
}
function freshSongMsg(text){
  try{
    var st = App.State, now = Date.now();
    var cur = st && st.sessions && st.sessions.find(function(s){ return s.id === st.currentSessionId; });
    var msgs = (cur && cur.messages) || [];
    var want = String(text).trim().slice(0, 300);
    for (var i = msgs.length - 1; i >= 0 && i >= msgs.length - 8; i--){
      var m = msgs[i];
      if (m && m.role === "user" && typeof m.content === "string" && String(m.content).trim().slice(0, 300) === want){
        var age = now - (+m.ts || 0);
        return age >= 0 && age < 20000;
      }
    }
  }catch(e){}
  return false;
}
/* Bâtisseurs hors-panneau (même format que le panneau) : P = {lang,bk,ui,se,
   genre,bpm,key,bass,perc,tex,spat,energy,soma,intent,vocal,tag,theme,titre,
   full,lenIdx,max,exclude}. */
function packStyle(P){
  var voixTag = P.vocal.instru ? P.vocal.t : (P.vocal.t + ", " + P.ui.vocalClause + (P.vocal.fem ? ", " + P.ui.femClause : ""));
  var chTag = P.chords ? ", " + P.chords + " chords" : "";
  var s = P.genre + ", " + P.bpm + " BPM, " + P.key + chTag + ", " + P.bass + ", " + P.perc + ", " + P.tex + ", " + P.spat + ", " + P.energy + ", " + voixTag;
  if (s.length > P.max) s = P.genre + ", " + P.bpm + " BPM, " + P.key + chTag + ", " + P.bass + ", " + P.perc + ", " + P.energy + ", " + voixTag;
  if (s.length > P.max) s = P.genre + ", " + P.bpm + " BPM, " + P.key + ", " + P.energy + ", " + voixTag;
  if (s.length > P.max + 50) s = s.slice(0, P.max - 3) + "...";
  return s;
}
function packStruct(P){
  var se = P.se, l = P.lang;
  var ext = (P.lenIdx === 1) ? "[" + se.up + " : 16] \n\n" : "";
  var tool = (P.lenIdx === 2) ? "[" + se.out + " : 16, percussions]" : "[" + se.out + " : echo]";
  var bloc = P.vocal.instru ? "[" + se.ins + "]" : "[" + SV[l] + " : " + P.tag + (P.vocal.fem ? " (f)" : "") + ", " + VL[l] + "]";
  var chLine = P.chords ? "[" + P.ui.chords + " : " + P.chords + "]\n\n" : "";
  return bloc + "\n\n[" + se.intro + " : " + P.bpm + " BPM]\n\n" + chLine + "[" + se.sec + " : " + P.perc + "]\n\n[" + se.tex + " : " + P.tex + "]\n\n[" + se.up + " : " + P.soma + "]\n\n[" + se.drop + " : " + P.bass + "]\n\n[" + se.sec + " : " + P.genre + "]\n\n[" + se.calm + "]\n\n" + ext + "[" + se.up + " : percussions]\n\n[" + se.peak + "]\n\n" + tool;
}
function varyLines(arr, all){ var b = (arr || []).slice(); var s = all ? 0 : 1; for (var i = b.length - 1; i > s; i--){ var j = s + Math.floor(Math.random() * (i - s + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
function packLyrics(P){
  var bk = P.bk, ui = P.ui, se = P.se, tag = P.tag, theme = P.theme;
  if (P.vocal.instru) return "[" + se.ins + "]\n(" + ui.themeOf + " : " + theme + ")\n" + ui.instruTip;
  var rk = /rock|m.tal|guitare|guitar|metal|grunge|screamo|shoegaze|djent|grind|mathcore|coldwave|dark wave/i.test(P.genre) && bk.coupletRock;
  var c1 = pickN(rk ? bk.coupletRock : bk.couplet, 4), c2 = pickN(rk ? bk.coupletRock : bk.couplet, 4);
  var r = pickN(rk && bk.refrainRock ? bk.refrainRock : bk.refrain, 4);
  var p = pickN(rk && bk.pontRock ? bk.pontRock : bk.pont, 2);
  var ex = pickN(bk.excla, 2).join(" … ");
  var big = /diva|duo|chor|chœur|choir|coro/i.test(tag);
  var chTag = big ? tag : se.choir;
  var pers = null;
  try { if (P.F && P.F.names && P.F.names.length) pers = personalSongBlock(P.lang, P.F); } catch (ePers) { pers = null; }
  var vv1 = (pers && pers.v1) || c1, vv2 = (pers && pers.v2) || c2, cc = (pers && pers.ch) || r;
  if (pers) { vv1 = varyLines(pers.v1); vv2 = varyLines(pers.v2); cc = varyLines(pers.ch, true); }
  var ccFin = (Math.random() < 0.5) ? cc.slice().reverse() : varyLines(cc, true);
  var themeLine = (P.F && P.F.facts) ? "" : "\n(" + theme + ")";
  var t = "[" + se.v1 + " — " + tag + "]\n" + vv1.join("\n") + themeLine + "\n\n[" + se.pre + "]\n" + ex + " …\n\n[" + se.ch + " — " + chTag + "]\n" + cc.join("\n") + "\n";
  if (P.full){ t += "\n[" + se.v2 + " — " + tag + "]\n" + vv2.join("\n") + "\n\n[" + se.ch + " — " + chTag + "]\n" + cc.slice().reverse().join("\n") + "\n\n[" + se.br + "]\n" + p.join("\n") + "\n\n[" + se.chf + "]\n" + ccFin.join("\n") + "\n\n[" + se.out + "]\n" + ex + "\n"; }
  return t;
}
function songStats(bk, lang, lyrics){
  var lines = String(lyrics).split("\n").map(function(s){ return s.trim(); }).filter(function(s){ return s && !/^\[.+\]$/.test(s) && !/^\(.+\)$/.test(s); });
  if (!lines.length) return { n: 0, avg: 0, longs: [], foreign: [] };
  var counts = lines.map(function(s){ return syllables(s, lang); });
  var avg = counts.reduce(function(a, b){ return a + b; }, 0) / counts.length;
  var longs = [];
  counts.forEach(function(c, i){ if (c > 10) longs.push((i + 1) + " (" + c + ")"); });
  var low = " " + String(lyrics).toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿœæçáíóúñàèìòąćęłńśźż]+/g, " ") + " ";
  var foreign = [];
  bk.foreignWords.forEach(function(w){ if (low.indexOf(" " + w + " ") >= 0 && foreign.indexOf(w) < 0) foreign.push(w); });
  return { n: lines.length, avg: avg, longs: longs, foreign: foreign };
}
function extractSongFacts(txt){
  var raw = String(txt == null ? "" : txt);
  var low = "";
  try { low = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { low = String(raw).toLowerCase(); }
  var stop = { fais:1, faites:1, fait:1, faire:1, pour:1, avec:1, alors:1, elle:1, nous:1, ils:1, elles:1, mais:1, comme:1, quand:1, suis:1, est:1, sont:1, une:1, des:1, les:1, qui:1, que:1, ans:1, rock:1, pop:1, soul:1, polonais:1, polonaise:1, langue:1, musique:1, chanson:1, francais:1, homme:1, femme:1, fille:1, famille:1, vie:1, chemin:1, etudes:1, moments:1, aime:1, bien:1, plus:1, moins:1, mon:1, ma:1, mes:1, son:1, sa:1, ses:1, notre:1, votre:1, leur:1, leurs:1, dans:1, sur:1, par:1, pas:1,Hend:1 };
  var names = [], seen = {};
  var re = /[A-Z\u00C0-\u00DE\u0104\u0106\u0118\u0141\u0143\u00D3\u015A\u0179\u017B][a-z\u00E0-\u00FF\u0105\u0107\u0119\u0142\u0144\u00F3\u015B\u017A\u017C'\-]{2,}/g;
  var m;
  while ((m = re.exec(raw))) {
    var w = String(m[0]).replace(/['\-.,;:!?]+$/, "");
    if (w.length < 3) continue;
    var wl = "";
    try { wl = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e2) { wl = w.toLowerCase(); }
    if (stop[wl]) continue; try { var _w0 = String(wl).split(/['\-]/)[0]; if (_w0 && stop[_w0]) continue; } catch (eW0) {}
    if (/^(janv|fevr|mars|avr|mai|juin|juil|aout|sept|oct|nov|dec|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|rock|pop|soul|funk|metal|rap|jazz|blues)/.test(wl)) continue;
    if (!seen[wl]) { seen[wl] = 1; names.push(w); }
    if (names.length >= 5) break;
  }
  var facts = raw.replace(/\s+/g, " ").trim();
  var ci = facts.indexOf(":");
  if (ci >= 0 && ci < 200) facts = facts.slice(ci + 1).trim();
  facts = facts.slice(0, 160);
  return { names: names, facts: facts, low: low, raw: raw };
}
var SONG_TITLE_JOIN = { fr: " et ", en: " and ", de: " und ", es: " y ", it: " e ", pl: " i ", hi: " और ", ja: "\u3068", zh: "\u8207", "zh-CN": "\u4E0E", ko: "\uC640 " };

function personalSongBlock(lang, F) {
  var N = (F && F.names) || [];
  var n1 = N[0] || "", n2 = N[1] || "";
  var pair = n1 && n2;
  if (lang === "pl") {
    return {
      v1: [pair ? n1 + " spotkał " + n2 + ", serce zabiło mocniej" : (n1 ? n1 + " odnalazł drogę do serca" : "Spotkaliśmy się, gdy serce chciało znów żyć"), "Po latach ciszy serce budzi się", "Miłość, która trwa, zostaje w sercu", "Każda chwila razem to cud"],
      v2: ["Każdy telefon to most, każdy weekend to święto", "Twoja dłoń w mojej dłoni, to cały mój świat", "Osobno nie z wyboru, blisko sercem", "Każdy powrót jak pierwszy raz"],
      ch: [pair ? n2 + ", idziemy razem jedną drogą" : "Idziemy razem jedną drogą", "Choć daleko, serce zna drogę", "Piękne chwile, miłość niesie", "Kochać i być kochanym"]
    };
  }
  if (lang === "fr") {
    return {
      v1: [pair ? n1 + " a rencontré " + n2 + ", le cœur a chanté" : "Un cœur qui voulait croire au bonheur", "Après les silences, un chemin nouveau", "Un amour vrai reste dans le cœur", "Chaque instant ensemble est un miracle"],
      v2: ["Chaque appel est un pont, chaque week-end une fête", "Ta main dans la mienne, c'est mon univers", "Loin des yeux, mais proches par le cœur", "Et chaque retour a le goût de la première fois"],
      ch: [pair ? n2 + ", marchons ensemble sur le même chemin" : "Marchons ensemble sur le même chemin", "Malgré la distance, nos cœurs se retrouvent", "De beaux moments à partager", "Aimer et être aimé, simplement"]
    };
  }
  if (lang === "en") {
    return {
      v1: [pair ? n1 + " met " + n2 + ", and the heart sang" : "A heart that wanted to believe again", "After the silence, a brand-new road", "A love that's true stays in the heart", "Every moment together is a miracle"],
      v2: ["Every call's a bridge, every weekend a feast", "Your hand in mine is my whole world", "Far apart, but close at heart", "And each return tastes like the first time"],
      ch: [pair ? n2 + ", we walk together down one road" : "We walk together down one road", "Miles apart, our hearts still meet", "Beautiful moments to share", "To love and be loved, that's all"]
    };
  }
  if (lang === "de") {
    return {
      v1: [pair ? n1 + " traf " + n2 + ", und das Herz sang" : "Ein Herz, das wieder glauben wollte", "Nach der Stille ein völlig neuer Weg", "Wahre Liebe bleibt im Herzen", "Jeder Moment zu zweit ist ein Wunder"],
      v2: ["Jeder Anruf eine Brücke, jedes Wochenende ein Fest", "Deine Hand in meiner ist meine Welt", "Fern und doch im Herzen nah", "Und jede Rückkehr schmeckt wie das erste Mal"],
      ch: [pair ? n2 + ", wir gehen gemeinsam einen Weg" : "Wir gehen gemeinsam einen Weg", "Trotz der Ferne finden sich die Herzen", "Schöne Momente, Seite an Seite", "Lieben und geliebt werden, einfach so"]
    };
  }
  if (lang === "es") {
    return {
      v1: [pair ? n1 + " conoció a " + n2 + ", y el corazón cantó" : "Un corazón que quería volver a creer", "Tras el silencio, un camino nuevo", "Un amor verdadero queda en el corazón", "Cada instante juntos es un milagro"],
      v2: ["Cada llamada es un puente, cada finde una fiesta", "Tu mano en la mía es mi universo", "Lejos de vista, cerca de corazón", "Y cada regreso sabe a primera vez"],
      ch: [pair ? n2 + ", caminamos juntos el mismo camino" : "Caminamos juntos el mismo camino", "Pese a la distancia, el corazón se encuentra", "Hermosos momentos para compartir", "Amar y ser amado, sin más"]
    };
  }
  if (lang === "it") {
    return {
      v1: [pair ? n1 + " ha incontrato " + n2 + ", e il cuore ha cantato" : "Un cuore che voleva tornare a credere", "Dopo il silenzio, una strada nuova", "Un amore vero resta nel cuore", "Ogni istante insieme è un miracolo"],
      v2: ["Ogni chiamata è un ponte, ogni weekend una festa", "La tua mano nella mia è il mio mondo", "Lontani dagli occhi, vicini di cuore", "E ogni ritorno sa di prima volta"],
      ch: [pair ? n2 + ", camminiamo insieme sulla stessa strada" : "Camminiamo insieme sulla stessa strada", "Nonostante la distanza, i cuori si ritrovano", "Bei momenti da condividere", "Amare ed essere amati, semplicemente"]
    };
  }
  if (lang === "ja") {
    var j1 = pair ? n1 + "と" + n2 + "の出会い" : (n1 ? n1 + "の物語" : "幸せを願う心");
    return { v1: [j1 + "、新しい光", "沈黙の後に新しい道", "小さな光が家を照らす", "一緒の時間は奇跡"], v2: ["毎電話が橋", "家族と共に家", "心はいつも近く", "帰るたび初めての味"], ch: [pair ? n2 + "と一緒に呼吸して" : "一緒に呼吸して", "心は道を知っている", "家族の奇跡", "愛し愛されること"] };
  }
  if (lang === "hi") {
    var h1 = pair ? n1 + " और " + n2 + " की मुलाकात" : (n1 ? n1 + " की कहानी" : "खुशी चाहने वाला दिल");
    return { v1: [h1 + ", नई रोशनी", "ख़ामोशी के बाद नई राह", "दो नन्ही रूहें", "साथ बिताया हर पल चमत्कार"], v2: ["हर फ़ोन एक पुल", "परिवार के साथ घर", "दिल हमेशा पास", "हर वापसी पहली सी"], ch: [pair ? n2 + ", साथ साँस लेते एक राह" : "साथ साँस लेते एक राह", "दिल राह जानता है", "परिवार का चमत्कार", "प्यार करना और पाना"] };
  }
  if (lang === "zh" || lang === "zh-CN") {
    var simp = lang === "zh-CN";
    var meet = simp ? "遇见" : "遇見", love = simp ? "爱" : "愛";
    var z1 = pair ? n1 + meet + n2 : (n1 ? n1 + "的故事" : "幸福的心");
    var L1 = simp ? ["新的光", "沉默之后的新路", "两颗小心点亮家", "相聚的每一刻都是奇迹"] : ["新的光", "沉默之後的新路", "兩顆小心點亮家", "相聚的每一刻都是奇蹟"];
    var L2 = simp ? ["每通电话都是桥", "与家人在家", "心永远接近", "每次回来像第一次"] : ["每通電話都是橋", "與家人在家", "心永遠接近", "每次回來像第一次"];
    var LC = simp ? ["一起呼吸同一路", "心知道路", "家庭的奇迹", "相爱的人"] : ["一起呼吸同一路", "心知道路", "家庭的奇蹟", "相愛的人"];
    return { v1: [z1 + "，" + L1[0], L1[1], L1[2], L1[3]], v2: L2, ch: [pair ? n2 + "，" + LC[0] : LC[0], LC[1], LC[2], LC[3]] };
  }
  if (lang === "ko") {
    var k1 = pair ? n1 + "와 " + n2 + "의 만남" : (n1 ? n1 + "의 이야기" : "행복을 바라는 마음");
    return { v1: [k1 + ", 새로운 빛", "침묵 뒤에 새 길", "두 작은 영혼", "함께한 시간은 기적"], v2: ["매 전화마다 다리", "가족과 함께 집", "마음은 언제나 가까워", "돌아올 때마다 처음처럼"], ch: [pair ? n2 + ", 함께 숨쉬는 하나의 길" : "함께 숨쉬는 하나의 길", "마음은 길을 알아", "가족의 기적", "사랑하고 사랑받는 것"] };
  }
  return null;
}
function extractUserLyrics(txt){
  try {
    var t = String(txt || "").replace(/\r/g, "");
    var m = t.match(/paroles?\s*:\s*([\s\S]+)/i);
    var body = m ? m[1] : null;
    if (!body){
      var lines = t.split("\n");
      if (lines.length < 4) return null;
      body = lines.slice(1).join("\n");
    }
    body = body.replace(/^[\u0022\u00ab\u201c\s]+|[\u0022\u00bb\u201d\s]+$/g, "").trim();
    var bl = body.split("\n").map(function(x){ return x.trim(); }).filter(Boolean);
    if (bl.length < 3) return null;
    var tot = bl.join(" ").length;
    if (tot < 30 || tot > 4000) return null;
    return bl.join("\n");
  } catch(e){ return null; }
}
function generatePack(lang, forceGenre, personTxt){
  lang = (lang && BANKS[lang]) ? lang : curLang();
  var fg = (typeof forceGenre === "string" && SOUND.genre.indexOf(forceGenre) >= 0) ? forceGenre : null;
  var bk = BANKS[lang] || BANK_FR, ui = bk.ui, se = SEC[lang] || SEC.fr;
  var sung = [];
  bk.vocal.forEach(function(v, i){ if (!v.instru) sung.push(i); });
  var vi = sung.length ? sung[Math.floor(Math.random() * sung.length)] : 0;
  var vocal = bk.vocal[vi] || bk.vocal[0];
  var P = { lang: lang, bk: bk, ui: ui, se: se,
    genre: (fg || pick(SOUND.genre)), bpm: (function(){ try{ var _fk = familyFor(fg || ''); if(_fk && SUNO_FAM[_fk]) return String(Math.max(60, Math.min(180, SUNO_FAM[_fk].bpm))); }catch(e){} return String(60 + Math.floor(Math.random() * 121)); })(),
    key: pick(SOUND.key), chords: (function(){ try{ var _fk2 = familyFor(fg || ''); if(_fk2 && SUNO_FAM[_fk2]) return SUNO_FAM[_fk2].chords; }catch(e){} return (SOUND.chords ? pick(SOUND.chords) : ''); })(), bass: pick(SOUND.bass), perc: (function(){ try{ if (fg && GENRE_RHYTHM[fg]) return GENRE_RHYTHM[fg]; }catch(e){} return pick(SOUND.perc); })(),
    tex: pick(SOUND.tex), spat: pick(SOUND.spat), energy: pick(SOUND.energy),
    soma: pick(SOUND.soma), intent: pick(SOUND.intent),
    vocal: vocal, tag: vocal.short || vocal.t, theme: pick(bk.themes), titre: pick(bk.titles),
    full: true, lenIdx: 0, max: 200, exclude: ui.excludeDef, F: null };
  try {
    if (typeof personTxt === "string" && personTxt.trim()) {
      var _F = extractSongFacts(personTxt);
      P.F = _F;
      if (_F.facts) P.theme = _F.facts;
      if (_F.names && _F.names.length >= 2) {
        var _j = SONG_TITLE_JOIN[lang] || " & ";
        P.titre = _F.names[0] + _j + _F.names[1];
      } else if (_F.names && _F.names.length === 1) { P.titre = _F.names[0]; }
    }
  } catch (ePF) {}
  var _userLyr = extractUserLyrics(personTxt); var lyrics = _userLyr || packLyrics(P);
  var st = songStats(bk, lang, lyrics);
  return { lang: lang, title: P.titre, genre: P.genre, bpm: P.bpm, theme: P.theme, vocalTag: P.tag,
    style: packStyle(P), struct: packStruct(P), lyrics: lyrics, exclude: P.exclude, stats: st };
}
var SONG_INTRO = {
fr: "Voilà ta chanson, prête pour Suno 🎵 — copie chaque bloc ci-dessous, ou ouvre le panneau pour la retravailler.",
en: "Here is your song, ready for Suno 🎵 — copy each block below, or open the panel to rework it.",
de: "Hier ist dein Song, fertig für Suno 🎵 — kopiere die Blöcke unten oder öffne das Panel zum Bearbeiten.",
es: "Aquí tienes tu canción, lista para Suno 🎵 — copia cada bloque o abre el panel para retocarla.",
it: "Ecco la tua canzone, pronta per Suno 🎵 — copia i blocchi qui sotto o apri il pannello per rielaborarla.",
pl: "Oto twoja piosenka, gotowa do Suno 🎵 — skopiuj bloki poniżej albo otwórz panel, by ją dopracować.",
ja: "あなたの曲ができたよ、Suno用だよ🎵 — 下のブロックをコピーしてね、パネルで手直しもできるよ。",
zh: "你的歌曲準備好了，可直接用於 Suno🎵 — 複製下方區塊，或打開面板繼續打磨。",
"zh-CN": "你的歌曲准备好了，可直接用于 Suno🎵 — 复制下方区块，或打开面板继续打磨。",
ko: "네 노래 완성됐어, Suno용이야🎵 — 아래 블록을 복사하거나 패널에서 다듬어 봐。",
hi: "तुम्हारा गाना तैयार है, Suno के लिए 🎵 — नीचे के ब्लॉक कॉपी करो, या पैनल में सँवारो।"
};
function convoLang(){
  try{
    var s = null, ss = App.State.sessions || [];
    for (var i = 0; i < ss.length; i++){ if (ss[i] && ss[i].id === App.State.currentSessionId){ s = ss[i]; break; } }
    var l = String((s && s.lockedLanguage) || (App.State.settings && App.State.settings.language) || "en").slice(0, 2).toLowerCase();
    if (SONG_INTRO[l]) return l;
  }catch(e){}
  return "en";
}
function copyAllText(pack){
  var hd = HDR[pack.lang] || HDR.fr;
  var bk = BANKS[pack.lang] || BANK_FR;
  return hd[0] + ":\n" + pack.title + "\n\n" + hd[1] + ":\n" + pack.style + "\n\n" + hd[2] + ":\n" + pack.exclude + "\n\n" + hd[3] + ":\n" + pack.struct + "\n\n" + hd[4] + " " + bk.meta.voice + ":\n" + pack.lyrics;
}
function ensureSongCss(){
  if (document.getElementById("smusicCss")) return;
  var st = document.createElement("style");
  st.id = "smusicCss";
  st.textContent = ".smusic-intro{color:#d4d4d8;margin-bottom:6px}"
  + ".smusic-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#b9aef5;margin:12px 0 6px}"
  + ".smusic-pre{background:#000;border:1px solid #333;border-radius:12px;padding:12px;white-space:pre-wrap;font-size:13px;line-height:1.6;color:#efe9ff;margin:0;font-family:inherit}"
  + ".smusic-chk{font-size:12px;color:#8e8e96;margin-top:8px;white-space:pre-line}"
  + ".smusic-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}"
  + ".smusic-btn{background:#221c4d;border:1px solid #4a3aa3;color:#fff;border-radius:12px;padding:9px 14px;cursor:pointer;font-size:13px;font-family:inherit;min-height:38px}"
  + ".smusic-btn:hover{background:#2d2560}";
  document.head.appendChild(st);
}
function postSong(pack, cl){
  var bk = BANKS[pack.lang] || BANK_FR, ui = bk.ui;
  ensureSongCss();
  var list = document.querySelector("#messageListEl");
  if (!list) return null;
  var row = document.createElement("div");
  row.className = "messageRow assistantRow";
  var wrap = document.createElement("div");
  wrap.className = "msgWrapper";
  var body = document.createElement("div");
  body.className = "messageContent markdown-content";
  var intro = document.createElement("div");
  intro.className = "smusic-intro";
  intro.textContent = SONG_INTRO[cl] || SONG_INTRO.en;
  body.appendChild(intro);
  var h = document.createElement("h3");
  h.style.margin = "8px 0";
  h.textContent = "🎵 " + pack.title;
  body.appendChild(h);
  function block(lbl, txt){
    var l = document.createElement("div");
    l.className = "smusic-lbl";
    l.textContent = lbl;
    body.appendChild(l);
    var pre = document.createElement("pre");
    pre.className = "smusic-pre";
    pre.textContent = txt;
    body.appendChild(pre);
  }
  block(ui.styleBox, pack.style);
  block(ui.structBox, pack.struct);
  block(ui.lyricsBox, pack.lyrics);
  var chk = document.createElement("div");
  chk.className = "smusic-chk";
  var sl = ui.chkVerses + " : " + pack.stats.n + " · " + pack.stats.avg.toFixed(1) + " " + ui.chkAvg;
  if (pack.stats.longs.length) sl += "\n⚠️ " + ui.chkLong + " (>10) : " + pack.stats.longs.join(", ");
  else sl += "\n✅ " + ui.chkLongOk;
  if (pack.stats.foreign.length) sl += "\n⚠️ " + ui.chkForeign + " : " + pack.stats.foreign.join(", ");
  else sl += "\n✅ " + ui.chkForeignOk;
  chk.textContent = sl;
  body.appendChild(chk);
  var btns = document.createElement("div");
  btns.className = "smusic-btns";
  function btn(lbl, fn){
    var b = document.createElement("button");
    b.type = "button";
    b.className = "smusic-btn";
    b.textContent = lbl;
    b.onclick = fn;
    btns.appendChild(b);
  }
  btn(ui.copyStyle, function(){ clip(pack.style); });
  btn(ui.copyStruct, function(){ clip(pack.struct); });
  btn(ui.copyLyrics, function(){ clip(pack.lyrics); });
  btn(ui.copyAll, function(){ clip(copyAllText(pack)); });
  btn("🎵 " + ui.musicBtn, function(){ App.Music.openWith(pack); });
  body.appendChild(btns);
  wrap.appendChild(body);
  row.appendChild(wrap);
  list.appendChild(row);
  var sc = document.querySelector("#chatHistoryCtn");
  if (sc) sc.scrollTop = sc.scrollHeight;
  return row;
}
function genreFromText(txt){
  var n = " " + songNorm(txt) + " ";
  var r = " " + String(txt || "") + " ";
  var SUBG = [/symphonic metal|metal symphonique/,"Symphonic metal",/folk metal|metal folk/,"Folk metal",/gothic metal|metal gothique/,"Gothic metal",/nu metal|nu-metal/,"Nu metal",/groove metal/,"Groove metal",/rap metal|metal rap/,"Rap metal",/funk metal|metal funk/,"Funk metal",/post-metal|post metal/,"Post-metal",/speed metal/,"Speed metal",/brutal death|death brutal/,"Brutal death metal",/melodic death|death melodique/,"Melodic death metal",/atmospheric black|black.*atmospherique/,"Atmospheric black metal",/stoner doom|doom stoner/,"Stoner doom metal",/thrash/,"Thrash metal",/deathcore/,"Deathcore",/metalcore/,"Metalcore",/mathcore/,"Mathcore",/djent/,"Djent",/grind/,"Grindcore",/viking/,"Viking metal",/pirate/,"Pirate metal",/doom/,"Doom metal",/sludge metal|metal sludge/,"Sludge metal",/sludge/,"Sludge rock",/stoner/,"Stoner rock",/desert rock|rock du desert/,"Desert rock",/black metal/,"Black metal",/death metal/,"Death metal",/power metal|metal power/,"Power metal",/epic metal|metal epique|orchestral metal/,"Epic orchestral metal",/alternative metal|metal alternatif/,"Alternative metal",/industrial metal|metal industriel/,"Industrial metal",/progressive metal|metal progressif|prog metal/,"Progressive metal",/pop-punk|pop punk/,"Pop-punk",/post-punk|post punk/,"Post-punk",/ska-punk|skapunk/,"Punk rock",/punk/,"Punk rock",/grunge/,"Grunge",/screamo/,"Screamo",/emo(?!ji)/,"Emo rock",/shoegaze|shoe gaze/,"Shoegaze",/dream pop|dreampop/,"Dream pop",/math rock|rock math/,"Math rock",/post-rock|post rock/,"Post-rock",/garage rock|rock garage/,"Garage rock",/indie rock|rock inde/,"Indie rock",/alternative rock|rock alternatif/,"Alternative rock",/psych folk|folk psych|freak folk/,"Psychedelic folk",/psychedelic rock|rock psychedelique|psych rock/,"Psychedelic rock",/surf rock|rock surf/,"Surf rock",/rockabilly/,"Rockabilly",/rock.?n.?roll|fifties|50s|rock 50/,"Fifties rock'n'roll",/southern rock|rock sudiste/,"Southern rock",/blues rock|rock blues/,"Blues rock",/folk rock|rock folk/,"Folk rock",/country rock|rock country/,"Country rock",/arena rock/,"Arena rock",/glam rock|rock glam/,"Glam rock",/coldwave|cold wave/,"Coldwave",/dark wave|darkwave/,"Dark wave",/new wave/,"New wave",/noise rock|rock bruitiste/,"Noise rock",/space rock|rock spatial/,"Space rock",/kraut/,"Krautrock",/goth rock|rock gothique/,"Gothic rock",/synthpop|synth-pop|synth pop/,"Synthpop",/electropop|electro-pop/,"Electropop",/hyperpop|hyper pop/,"Hyperpop",/k-pop|kpop/,"K-pop",/j-pop|jpop/,"J-pop",/city pop|citypop/,"City pop",/dance-pop|dance pop/,"Dance-pop",/chamber pop/,"Chamber pop",/baroque pop/,"Baroque pop",/indie pop|pop inde/,"Indie pop",/bedroom pop/,"Bedroom pop",/bubblegum|bubblegum pop/,"Bubblegum pop",/teen pop/,"Teen pop",/pop rock|rock pop/,"Pop rock",/power pop/,"Power pop",/sophisti-pop|sophisti pop/,"Sophisti-pop",/art pop/,"Art pop",/ambient pop/,"Ambient pop",/future pop/,"Future pop",/trop pop/,"Trop pop",/chanson a texte/,"French chanson a texte",/chanson pop|variete|chanson francaise/,"French chanson pop",/neo-soul|neo soul|soul moderne/,"Neo-soul",/quiet storm/,"Quiet storm",/p-funk|pfunk|parliament/,"P-funk",/philly soul|soul philly/,"Philly soul",/northern soul/,"Northern soul",/doo-wop|doowop/,"Doo-wop",/gospel/,"Gospel soul",/smooth jazz/,"Smooth jazz",/r&b|rnb/,"Contemporary R&B",/boogie/,"Boogie",/disco/,"Disco funk",/funk rock/,"Funk rock",/boom bap|boombap/,"Boom-bap",/old school|old-school/,"Old-school hip-hop",/uk drill/,"UK drill",/drill/,"Drill",/cloud rap/,"Cloud rap",/mumble rap/,"Mumble rap",/conscious rap|rap conscient/,"Conscious rap",/gangsta/,"Gangsta rap",/g-funk|g funk/,"G-funk",/jazz rap|rap jazz/,"Jazz rap",/lofi|lo-fi/,"Lo-fi hip-hop",/phonk/,"Phonk rap",/grime/,"Grime",/crunk/,"Crunk",/chopped and screwed|chopped|screwed/,"Chopped and screwed",/abstract hip|hip hop abstrait/,"Abstract hip-hop",/alternative rap|rap alternatif/,"Alternative rap",/rap francais|rap fr /,"French rap",/hyphy/,"Hyphy",/trap/,"Trap hip-hop",/deep house|house profonde/,"Deep house",/tech house/,"Tech house",/progressive house|house progressive/,"Progressive house",/uk garage|garage uk/,"UK garage",/vocal house|house vocale/,"Vocal house",/afro-house|afro house|afrohouse/,"Afro-house",/minimal techno|techno minimale/,"Minimal techno",/hard techno|techno hard/,"Hard techno",/acid techno|techno acid/,"Acid techno",/detroit techno/,"Detroit techno",/melodic techno|techno melodique/,"Melodic techno",/psytrance|psy-trance|psy trance|goa/,"Psytrance",/uplifting trance|trance /,"Uplifting trance",/hardstyle/,"Hardstyle",/gabber|hardcore techno|hardcore electro/,"Hardcore gabber",/hardtekk|hardtek|tekk/,"Hardtekk",/drum and bass|drum.?n.?bass|\bDNB\b/,"Drum and bass",/jungle/,"Jungle",/breakbeat|break beat/,"Breakbeat",/riddim/,"Riddim",/dubstep/,"Dubstep",/future bass/,"Future bass",/trap edm|edm trap/,"Trap EDM",/electro funk|funk electro/,"Electro funk",/big beat/,"Big beat",/\bidm\b/,"IDM",/glitch/,"Glitch",/downtempo|down tempo/,"Downtempo",/trip-hop|trip hop|triphop/,"Trip-hop",/dark ambient|ambient sombre/,"Dark ambient",/ambient techno|techno ambient/,"Ambient techno",/drone/,"Drone",/synthwave|synth wave/,"Synthwave",/retrowave|retro wave/,"Retrowave",/outrun/,"Outrun",/vaporwave|vapor wave/,"Vaporwave",/chiptune|8-bit|8bit|chip music/,"Chiptune 8-bit",/electro-swing|electro swing|electroswing/,"Electro-swing",/moombahton/,"Moombahton",/jersey club|jersey/,"Jersey club",/new beat/,"New beat",/industrial electro|electro indus/,"Industrial electro",/bebop|bop /,"Bebop",/hard bop/,"Hard bop",/big band/,"Big band",/dixieland|dixie /,"Dixieland",/cool jazz|jazz cool/,"Cool jazz",/modal jazz|jazz modal/,"Modal jazz",/free jazz/,"Free jazz",/acid jazz/,"Acid jazz",/nu-jazz|nu jazz/,"Nu-jazz",/latin jazz|jazz latin/,"Latin jazz",/manouche|gypsy|gipsy|gitan/,"Jazz manouche",/jazz fusion|fusion jazz/,"Jazz fusion",/bossa/,"Bossa nova",/ragtime|rag /,"Ragtime",/stride/,"Stride piano",/swing occidental|western swing/,"Western swing",/swing/,"Swing",/chicago blues|blues chicago/,"Chicago blues",/texas blues|blues texas/,"Texas blues",/piedmont/,"Piedmont blues",/jump blues/,"Jump blues",/swamp blues|swamp/,"Swamp blues",/hill country/,"Hill country blues",/electric blues|blues electrique/,"Electric blues",/delta blues|blues delta/,"Melancholic Delta blues",/honky tonk|honkytonk/,"Honky tonk",/outlaw country|country outlaw/,"Outlaw country",/bluegrass/,"Bluegrass",/newgrass/,"Newgrass",/americana/,"Americana",/alt-country|alt country|country alternatif/,"Alt-country",/cajun/,"Cajun",/zydeco/,"Zydeco",/nashville/,"Nashville sound",/country pop|pop country/,"Country pop",/country /,"Classic country",/singer-songwriter|auteur interprete|chanson a texte/,"Singer-songwriter",/celtic|celtique/,"Celtic folk",/irish|irlandais/,"Irish folk",/nordic|nordique|viking folk/,"Nordic folk",/medieval|medieval folk/,"Medieval folk",/bardcore/,"Bardcore",/shanty|chant marin/,"Sea shanty",/intimate acoustic|acoustique intimiste|unplugged/,"Intimate acoustic",/indie folk|folk inde/,"Indie folk",/folk /,"Traditional folk",/dancehall/,"Dancehall",/rocksteady/,"Rocksteady",/reggae fusion|fusion reggae/,"Reggae fusion",/ragga/,"Ragga",/soca/,"Soca",/calypso/,"Calypso",/kompa/,"Kompa",/zouk/,"Zouk",/ska/,"Ska",/dub /,"Dub",/salsa/,"Salsa",/merengue/,"Merengue",/bachata/,"Bachata",/cumbia/,"Cumbia",/reggaeton/,"Reggaeton",/latin trap|trap latin/,"Latin trap",/latin pop|pop latine/,"Latin pop",/tango/,"Tango",/bolero/,"Bolero",/rumba flamenca/,"Rumba flamenca",/rumba/,"Rumba",/mambo/,"Mambo",/cha-cha|chacha/,"Cha-cha-cha",/samba/,"Samba",/\bmpb\b/,"MPB",/forro/,"Forro",/norteno|norteño/,"Norteno",/mariachi/,"Mariachi",/banda /,"Banda",/flamenco/,"Flamenco",/afropop|afro pop/,"Afropop",/afrobeat|afro beat/,"Afrobeat",/amapiano|piano /,"Amapiano",/highlife|high life/,"Highlife",/juju/,"Juju",/fuji /,"Fuji",/coupe-decale|coupe decale/,"Coupe-decale",/ndombolo/,"Ndombolo",/soukous/,"Soukous",/kizomba/,"Kizomba",/kuduro/,"Kuduro",/mbalax/,"Mbalax",/gnawa|gnaoua/,"Gnawa",/desert blues|blues du desert/,"Desert blues",/ethio/,"Ethio-jazz",/chaabi/,"Chaabi",/gqom/,"Gqom",/rai /,"Rai",/j-rock|jrock/,"J-rock",/enka/,"Enka",/c-pop|cpop|mandopop/,"C-pop",/bollywood|playback indien/,"Bollywood playback",/qawwali/,"Qawwali",/sufi/,"Sufi",/maqam|makam/,"Arabic maqam",/anatolien|anadolu/,"Anatolian rock",/thai |thai pop|musique thai/,"Thai pop",/gamelan/,"Gamelan",/arab pop|pop arabe|musique arabe/,"Arabic pop",/baroque/,"Baroque",/romantique classique|musique romantique|romantic classical/,"Romantic classical",/impressionnisme|impressionist/,"Impressionist classical",/contemporary classical|classique contemporain/,"Contemporary classical",/chambre|chamber music/,"Chamber music",/piano solo|piano seul/,"Solo piano classical",/string orchestra|orchestre a cordes/,"String orchestra",/opera/,"Opera",/choral|chorale|choeur/,"Choral sacred",/requiem/,"Requiem",/ballet/,"Ballet",/marche militaire|military march/,"Military march",/valse|waltz/,"Waltz",/neo-class|neoclassical/,"Neo-classical",/minimalis/,"Minimalist classical",/film |score|bande originale|cinema|film score/,"Film score",/epic trailer|trailer epique|hybrid trailer/,"Epic hybrid trailer",/cinematic trailer|bande annonce/,"Cinematic trailer",/epic|cinematique|cinematic/,"Epic cinematic orchestral",/new age/,"New age",/meditation|relaxation/,"Relaxation meditation",/soundscape|field recording/,"Soundscape",/concrete|musique concrete/,"Musique concrete",/noise experimental|bruitiste/,"Noise experimental",/lofi chill|chill lofi|lo-fi chill/,"Lo-fi chill",/jeu video|video game|game music/,"Video game music",/cirque|circus|cabaret/,"Circus cabaret",/burlesque/,"Burlesque",/noel|christmas/,"Christmas song",/mariage|wedding/,"Wedding music",/hymne|anthem/,"National anthem",/cartoon/,"Cartoon playful",/fanfare/,"Fanfare brass",];
  for (var sg = 0; sg < SUBG.length; sg += 2) { if (SUBG[sg].test(n)) return SUBG[sg+1]; }
  if (/\bmetal\b|\bheavy\b/.test(n)) return "Classic heavy metal";
  if (/\brock\b/.test(n)) return "Driving electric rock";
  if (/\bsoul\b|\bfunk\b|\bdisco\b/.test(n)) return "Groovy soul and funk";
  if (/\bpop\b/.test(n)) return "Catchy modern pop";
  if (/\bhip\b|\brap\b|\bboom\b/.test(n)) return "Hard-hitting hip-hop";
  if (/\belectro\b|\bedm\b|\btechno\b|\bhouse\b|\bdance\b|\bclub\b/.test(n)) return "Synthetic club EDM";
  if (/\bjazz\b/.test(n)) return "Improvised jazz combo";
  if (/\bblues\b/.test(n)) return "Melancholic Delta blues";
  if (/\breggae\b/.test(n)) return "Laid-back roots reggae";
  if (/\bmozart\b/.test(n)) return "Mozart-style classical";
  if (/\bclassique\b|\bclassical\b|\borchestr|\bsymphon/.test(n)) return "Full symphonic orchestra";
  if (/ロック|摇滚|搖滾|록/.test(r)) return "Driving electric rock";
  if (/ポップ|流行|팝/.test(r)) return "Catchy modern pop";
  if (/ソウル|ファンク|灵魂|靈魂|放克|소울|펑크/.test(r)) return "Groovy soul and funk";
  if (/メタル|金属|메탈/.test(r)) return "Classic heavy metal";
  if (/ヒップホップ|ラップ|嘻哈|说唱|說唱|힙합|랩/.test(r)) return "Hard-hitting hip-hop";
  if (/エレクトロ|テクノ|ダンス|电子|電子|일렉트로|테크노|댄스/.test(r)) return "Synthetic club EDM";
  if (/ジャズ|爵士|재즈/.test(r)) return "Improvised jazz combo";
  if (/ブルース|蓝调|藍調|블루스/.test(r)) return "Melancholic Delta blues";
  if (/レゲエ|雷鬼|레게/.test(r)) return "Laid-back roots reggae";
  if (/クラシック|オーケストラ|交響|古典|交响|管弦|클래식|오케스트라|교향/.test(r)) return "Full symphonic orchestra";
  if (/रॉक/.test(r)) return "Driving electric rock";
  if (/पॉप/.test(r)) return "Catchy modern pop";
  if (/मेटल/.test(r)) return "Classic heavy metal";
  if (/हिप-हॉप|हिपहॉप|रैप/.test(r)) return "Hard-hitting hip-hop";
  if (/इलेक्ट्रो|टेक्नो|डांस|हाउस/.test(r)) return "Synthetic club EDM";
  if (/जैज|जैज़/.test(r)) return "Improvised jazz combo";
  if (/ब्लूज|ब्लूज़/.test(r)) return "Melancholic Delta blues";
  if (/रेग्गे/.test(r)) return "Laid-back roots reggae";
  if (/सोल|फंक|डिस्को/.test(r)) return "Groovy soul and funk";
  if (/शास्त्रीय|कर्नाटक|ध्रुपद|खयाल|ख़याल|सिम्फनी|ऑर्केस्ट्रा/.test(r)) return "Full symphonic orchestra";
  return null;
}
function answerSong(txt){
  var target = songTargetLang(txt);
  var lang = (target && BANKS[target]) ? target : curLang();
  try { if (target === "zh" && curLang() === "zh-CN") lang = "zh-CN"; } catch(eZh) {}
  var pack = generatePack(lang, genreFromText(txt), txt);
  postSong(pack, pack.lang);
  try { var F0 = extractSongFacts(txt); var s0 = curSessionM(); if (s0 && F0 && F0.names && F0.names.length){ s0._lastSong = { names: F0.names.slice(0, 5), facts: F0.facts || "", genre: pack.genre }; } } catch(eLS) {} }
function watchSongChat(){
  var list = document.querySelector("#messageListEl");
  if (!list){ setTimeout(watchSongChat, 500); return; }
  if (list.dataset.smusicWatch === "1") return;
  list.dataset.smusicWatch = "1";
  var obs = new MutationObserver(function(muts){
    for (var mi = 0; mi < muts.length; mi++){
      var added = muts[mi].addedNodes;
      for (var ni = 0; ni < added.length; ni++){
        var n = added[ni];
        if (!(n instanceof HTMLElement)) continue;
        var isUser = n.classList && n.classList.contains("userRow");
        if (!isUser || n.dataset.smusicAnswered) continue;
        if (n.dataset.smediaAnswered) continue;
        var txt = n.innerText || n.textContent || "";
        if (songBlocked(txt)) continue;
        var _isV = false; try { _isV = isSongVersionRequest(txt); } catch(eV) {}
        if (!isSongRequest(txt) && !_isV) continue;
        n.dataset.smusicAnswered = "1";
        n.dataset.smediaAnswered = "1";
        if (!freshSongMsg(txt)) continue;
        try{ if (_isV) answerSongVersion(txt); else answerSong(txt); }catch(e){ console.warn("[Music] song-in-chat failed", e); }
      }
    }
  });
  obs.observe(list, { childList: true, subtree: false });
}
App.Music = {
open: function(){ buildPanel(); App.Music.buildGrid(); localize(); var d = gi('musicModal'); if (d) d.hidden = false; App.Music.generate(); },
close: function(){ var d = gi('musicModal'); if (d) d.hidden = true; },
toggle: function(){ var d = gi('musicModal'); if (d && !d.hidden) App.Music.close(); else App.Music.open(); },
localize: function(){ try{ if (!gi('musicModal')) return; localize(); var d = gi('musicModal'); if (d && !d.hidden) App.Music.generate(); }catch(e){} },
buildGrid: buildGrid, generate: generate, surprise: surprise, applyPreset: applyPreset, applyGenreRhythm: applyGenreRhythm, sunoFamily: function(){ try{ return familyFor(val('mzGenre')); }catch(e){ return null; } }, copyAll: copyAll, exportTxt: exportTxt,
refreshLyrics: refreshLyrics, checker: checker, aiLyrics: aiLyrics, editLyrics: editLyrics, wrapLyrics: wrapLyrics,
setLyricMode: setLyricMode, renderThemeChips: renderThemeChips, composeSong: composeSong, publishSong: publishSong, coverGo: coverGo, coverPromptText: coverPromptText, mountGallery: mountGallery, renderListen: renderListen,
saveHist: saveHist, loadHist: loadHistSel, delHist: delHist, renderHist: renderHist,
genJourney: genJourney, drawGeo: function(){ drawGeo(); }, lang: curLang, voiceTag: function(){ return BK().meta.voice; },
pack: generatePack, detectSong: isSongRequest, songLang: songTargetLang, answerSong: answerSong,
openWith: function(pack){ App.Music.open(); try{ if (pack){ if (pack.title) setVal("mzTitre", pack.title); if (pack.lyrics){ setVal("mzCustom", pack.lyrics); App.Music.setLyricMode('mine', true); } if (pack.exclude != null) setVal("mzExclude", pack.exclude); App.Music.generate(); } }catch(e){ console.warn("[Music] openWith failed", e); } },
_m: {}
};
try{ var ctn = document.getElementById('modeTogglesCtn'); if (ctn && !document.getElementById('musicToggleBtn')){ var b = document.createElement('button'); b.id = 'musicToggleBtn'; b.className = 'mode-toggle'; b.onclick = function(){ App.Music.toggle(); }; var sp = document.createElement('span'); sp.className = 'mode-toggle-icon'; sp.textContent = '\uD83C\uDFB5'; b.appendChild(sp); var lb = document.createElement('span'); lb.id = 'musicToggleLabel'; lb.className = 'mode-toggle-label'; lb.textContent = 'Musique'; b.appendChild(lb); ctn.appendChild(b); } }catch(e){}
try{ if (App.UI && App.UI.setLanguage){} }catch(e){}
try{ watchSongChat(); }catch(e){ console.warn("[Music] watch failed", e); }
}
