jQuery(() => {
    const EXTENSION_PROMPT_ID = 'st_arcana_fate_deck';

    // ================= ПОЛНАЯ КОЛОДА: 22 СТАРШИХ АРКАНА ТАРО =================
    const MAJOR_ARCANA = [
        {
            num: '0', nameRu: 'Шут (The Fool)', glyph: '🃏',
            upRu: 'Неожиданная случайность, безрассудный порыв, новый поворот или наивный шаг в неизвестность.',
            revRu: 'Опрометчивая ошибка, неловкая оплошность, потеря осторожности или внезапный риск.',
            upPrompt: 'Introduce an unexpected, spontaneous event, a reckless impulse, or a surprising coincidence that shifts the scene in a fresh, unpredictable direction.',
            revPrompt: 'Introduce a careless mistake, a sudden miscalculation, or an awkward/risky slip-up by one of the characters that complicates the moment.'
        },
        {
            num: 'I', nameRu: 'Маг (The Magician)', glyph: '✧',
            upRu: 'Мастерская инициатива, хитроумный приём, демонстрация силы воли или перехват контроля над ситуацией.',
            revRu: 'Тонкая манипуляция, иллюзия, блеф, скрытый умысел или хитрая уловка.',
            upPrompt: 'Have a character display sudden resourcefulness, confidence, or a clever initiative to take control of the situation.',
            revPrompt: 'Introduce subtle manipulation, a bluff, a hidden agenda, or a deceptive trick into the interaction.'
        },
        {
            num: 'II', nameRu: 'Верховная Жрица (High Priestess)', glyph: '🌙',
            upRu: 'Интуитивное прозрение, недосказанность, прикосновение к тайне или немой многозначительный взгляд.',
            revRu: 'Всплывший секрет, проговорка, подавленные чувства, вырвавшиеся наружу.',
            upPrompt: 'Infuse the scene with unspoken tension, sharp intuition, a mysterious hint, or a secret sensed between the lines.',
            revPrompt: 'Let a hidden secret, a slip of the tongue, or repressed feelings accidentally surface in the conversation.'
        },
        {
            num: 'III', nameRu: 'Императрица (The Empress)', glyph: '👑',
            upRu: 'Тёплая забота, чувственность, тактильная нежность, уют или проявление красоты.',
            revRu: 'Ревность, собственнический жест, эмоциональная требовательность или каприз.',
            upPrompt: 'Bring a wave of sensory warmth, tactile tenderness, comfort, or genuine care into the character’s behavior.',
            revPrompt: 'Introduce a flash of possessiveness, jealousy, or emotional over-protectiveness.'
        },
        {
            num: 'IV', nameRu: 'Император (The Emperor)', glyph: '⚜️',
            upRu: 'Твёрдый авторитет, защита, жёсткое решение, демонстрация статуса и непоколебимости.',
            revRu: 'Упрямство, борьба за доминирование, давление или потеря самообладания.',
            upPrompt: 'Emphasize authority, protective dominance, firm boundaries, or a decisive, commanding presence.',
            revPrompt: 'Create a clash of stubbornness, a struggle for control, or a crack in someone’s rigid composure.'
        },
        {
            num: 'V', nameRu: 'Иерофант (The Hierophant)', glyph: '🗝️',
            upRu: 'Верность принципам, клятва, важное правило, традиция или мудрый совет.',
            revRu: 'Нарушение правил, бунт против запретов, искушение переступить черту.',
            upPrompt: 'Bring up a shared code of honor, a past promise, a solemn principle, or a moment of mentorship/trust.',
            revPrompt: 'Tempt the characters to break a rule, defy expectations, or cross a forbidden line together.'
        },
        {
            num: 'VI', nameRu: 'Влюблённые (The Lovers)', glyph: '❤️‍🔥',
            upRu: 'Притяжение, химия между персонажами, момент искренней близости или важный выбор сердцем.',
            revRu: 'Внутреннее противоречие, колебание, страх близости или непростой выбор между долгом и чувством.',
            upPrompt: 'Heighten the romantic or emotional chemistry, creating a charged moment of closeness, vulnerability, or heartfelt choice.',
            revPrompt: 'Introduce inner conflict between duty and desire, hesitation, or mixed signals in a tense intimate moment.'
        },
        {
            num: 'VII', nameRu: 'Колесница (The Chariot)', glyph: '⚔️',
            upRu: 'Стремительный напор, ускорение событий, решительное действие или прорыв вперёд.',
            revRu: 'Внезапное препятствие на пути, заминка, потеря контроля над темпом событий.',
            upPrompt: 'Accelerate the pacing with bold, decisive action, physical momentum, or an urgent push forward.',
            revPrompt: 'Throw an abrupt obstacle, interruption, or loss of momentum that forces an immediate halt or detour.'
        },
        {
            num: 'VIII', nameRu: 'Сила (Strength)', glyph: '🦁',
            upRu: 'Укрощение гнева мягкостью, выдержка, глубокое самообладание на грани срыва.',
            revRu: 'Прорыв сдерживаемых эмоций, вспышка слабости, потеря контроля над импульсом.',
            upPrompt: 'Show quiet inner strength, restraint under pressure, or gentle patience calming a volatile situation.',
            revPrompt: 'Let raw, restrained emotion or vulnerability break through a character’s tough exterior.'
        },
        {
            num: 'IX', nameRu: 'Отшельник (The Hermit)', glyph: '🏮',
            upRu: 'Тихая пауза, уединение, погружение в воспоминания или откровенное одиночество.',
            revRu: 'Отстранённость, попытка закрыться в себе, холодная стена отчуждения.',
            upPrompt: 'Create a quiet, introspective pause where a character reflects on the past or shares a solitary truth.',
            revPrompt: 'Have a character momentarily withdraw, put up emotional walls, or hide their true ache behind distance.'
        },
        {
            num: 'X', nameRu: 'Колесо Фортуны (Wheel of Fortune)', glyph: '☸️',
            upRu: 'Удар судьбы, счастливый случай, внезапное совпадение или поворот обстоятельств на 180 градусов.',
            revRu: 'Ирония судьбы, невовремя случившаяся помеха, вмешательство внешних сил.',
            upPrompt: 'Trigger a sudden twist of fate, a stroke of luck, or an unexpected external event that changes the dynamics.',
            revPrompt: 'Introduce a bittersweet irony of fate, bad timing, or an untimely interruption from the outside world.'
        },
        {
            num: 'XI', nameRu: 'Справедливость (Justice)', glyph: '⚖️',
            upRu: 'Прямой разговор начистоту, расплата за прошлый поступок, требование честного ответа.',
            revRu: 'Несправедливое обвинение, предвзятость, уход от ответа или скрытая вина.',
            upPrompt: 'Bring a moment of reckoning, a demand for honesty, or the direct consequence of an earlier action.',
            revPrompt: 'Introduce an unfair assumption, a dodge of accountability, or a sting of unspoken guilt.'
        },
        {
            num: 'XII', nameRu: 'Повешенный (The Hanged Man)', glyph: '⏳',
            upRu: 'Зависшая пауза, вынужденное ожидание, жертва ради другого или взгляд на проблему под новым углом.',
            revRu: 'Бесполезное сопротивление неизбежному, тупик, ощущение ловушки.',
            upPrompt: 'Create a suspended, breathless moment of waiting, a willing sacrifice, or a sudden shift in perspective.',
            revPrompt: 'Highlight a feeling of being cornered or stalling to avoid an inevitable truth.'
        },
        {
            num: 'XIII', nameRu: 'Смерть (Death)', glyph: '💀',
            upRu: 'Конец прежнего этапа, бесповоротная перемена, сжигание мостов или прощание с иллюзией.',
            revRu: 'Цепляние за прошлое, страх перемен, возвращение старого незакрытого гештальта.',
            upPrompt: 'Mark a definitive turning point—an old pretense ends, a bridge is burned, or the dynamic shifts irreversibly.',
            revPrompt: 'Have the past refuse to stay buried—an old habit, memory, or unresolved issue resurfaces.'
        },
        {
            num: 'XIV', nameRu: 'Умеренность (Temperance)', glyph: '🏺',
            upRu: 'Примирение, передышка после бури, компромисс, исцеляющее спокойствие.',
            revRu: 'Крайность, нарушение хрупкого баланса, нетерпение или эмоциональные качели.',
            upPrompt: 'Bring a soothing moment of truce, emotional balance, healing, or quiet harmony after tension.',
            revPrompt: 'Tip the delicate balance with impatience, an extreme reaction, or sudden emotional friction.'
        },
        {
            num: 'XV', nameRu: 'Дьявол (The Devil)', glyph: '⛓️',
            upRu: 'Опасный соблазн, мрачная одержимость, провокация, азарт или запретное желание.',
            revRu: 'Попытка вырваться из зависимости, отрезвление, сопротивление провокации.',
            upPrompt: 'Inject dark temptation, dangerous allure, a provocative tease, or an obsessive edge into the scene.',
            revPrompt: 'Show a sudden moment of sobering clarity or a struggle to resist a dangerous temptation.'
        },
        {
            num: 'XVI', nameRu: 'Башня (The Tower)', glyph: '⚡',
            upRu: 'Внезапное потрясение! Гром среди ясного неба, разрушение планов, взрыв эмоций или шокирующая правда.',
            revRu: 'Чудом избежавшаяся катастрофа, глухой раскат надвигающейся бури, тревожный звоночок.',
            upPrompt: 'Deliver a sudden, dramatic shock—an abrupt interruption, a shattered assumption, or an explosive revelation!',
            revPrompt: 'Create a tense near-miss crisis or an ominous warning sign that something is about to collapse.'
        },
        {
            num: 'XVII', nameRu: 'Звезда (The Star)', glyph: '🌟',
            upRu: 'Луч надежды в темноте, вдохновение, искренняя мечта или тихое обещание на будущее.',
            revRu: 'Разочарование, сомнение, усталый цинизм или угасающая надежда.',
            upPrompt: 'Offer a glimmer of hope, quiet inspiration, or a sincere, comforting promise amidst the darkness.',
            revPrompt: 'Tint the moment with weary cynicism, self-doubt, or fear of hoping for too much.'
        },
        {
            num: 'XVIII', nameRu: 'Луна (The Moon)', glyph: '🌕',
            upRu: 'Двусмысленность, наваждение, ночные страхи, странное предчувствие или игра теней.',
            revRu: 'Рассеивание обмана, разоблачение иллюзии, выход правды из тени на свет.',
            upPrompt: 'Steep the atmosphere in eerie mystery, ambiguity, a haunting premonition, or shadows playing tricks.',
            revPrompt: 'Pierce through an illusion or misunderstanding, bringing a hidden fear or deception into the light.'
        },
        {
            num: 'XIX', nameRu: 'Солнце (The Sun)', glyph: '☀️',
            upRu: 'Искренний смех, ясность, теплота, победа, разрядка обстановки удачной шуткой.',
            revRu: 'Напускное веселье, бравада, скрывающая усталость, или преувеличенный оптимизм.',
            upPrompt: 'Brighten the scene with genuine warmth, a shared laugh, clear honesty, or a small triumphant moment.',
            revPrompt: 'Show a character masking their exhaustion or worry behind a forced smile or bravado.'
        },
        {
            num: 'XX', nameRu: 'Суд (Judgement)', glyph: '🎺',
            upRu: 'Момент истины, судьбоносное признание, пробуждение совести или отголосок прошлого.',
            revRu: 'Самоосуждение, сожаление о прошлом, нежелание признавать очевидное.',
            upPrompt: 'Bring a decisive moment of truth, a powerful realization, or a call from the past that demands an answer.',
            revPrompt: 'Surface a pang of regret, self-doubt, or reluctance to face a looming realization.'
        },
        {
            num: 'XXI', nameRu: 'Мир (The World)', glyph: '🌐',
            upRu: 'Глубокое взаимопонимание, ощущение полноты момента, завершение спора, единство.',
            revRu: 'Незавершённость, недосказанность, ощущение, что в истории не хватает последней детали.',
            upPrompt: 'Create a sense of profound connection, closure on a lingering tension, or a complete, harmonious beat.',
            revPrompt: 'Leave a tantalizing sense of unfinished business—a lingering question or an incomplete gesture.'
        }
    ];

    // ================= 1. ВСТРАИВАЕМ UI В SILLYTAVERN =================
    const tarotHTML = `
        <div id="st-tarot-button-container" class="st-tarot-button-container">
            <button id="btn-tarot-open" class="toggleTarot" title="Мистическая колода Таро (Arcana Fate Deck)">🃏</button>
        </div>

        <div id="st-tarot-modal-overlay" class="st-tarot-modal-overlay">
            <div class="st-tarot-window">
                <div class="st-tarot-header">
                    <div class="st-tarot-title">✧ ARCANA FATE DECK ✧</div>
                    <button id="st-tarot-close" class="st-tarot-close" title="Закрыть">✕</button>
                </div>

                <div class="st-tarot-spread-bar">
                    <button class="st-tarot-mode-btn active" data-count="1">🃏 1 Аркан (Знамение)</button>
                    <button class="st-tarot-mode-btn" data-count="2">✨ Комбо (2 карты)</button>
                    <button class="st-tarot-mode-btn" data-count="3">🔮 Триплет (3 карты)</button>
                </div>

                <div id="st-tarot-cards-stage" class="st-tarot-cards-stage"></div>

                <div id="st-tarot-reading-box" class="st-tarot-reading-box">
                    Нажми на карту, чтобы перевернуть её и узнать волю Старших Арканов...
                </div>

                <div class="st-tarot-actions">
                    <button id="btn-tarot-draw-new" class="st-tarot-btn">🔄 Вытянуть заново</button>
                    <button id="btn-tarot-weave" class="st-tarot-btn primary-weave">✧ Вплести в следующий ход ✧</button>
                    <button id="btn-tarot-clear" class="st-tarot-btn" style="display:none;">✕ Сбросить влияние</button>
                </div>

                <div class="st-tarot-footer-controls">
                    <div class="st-tarot-ControlRow">
                        <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                            <input class="st-tarot-auto-master" type="checkbox" />
                            <span><b>🎲 Включить Авто-Судьбу</b> (выскакивают карты при отправке сообщений)</span>
                        </label>
                    </div>
                    <div class="st-tarot-ControlRow">
                        <span>Шанс срабатывания на ход: <b id="st-tarot-chance-label">25%</b></span>
                        <input id="st-tarot-chance-slider" type="range" min="5" max="100" step="5" value="25" style="width:140px;" />
                    </div>
                    <div class="st-tarot-ControlRow" style="justify-content:flex-start; gap:14px; margin-top:4px;">
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input class="st-tarot-auto-m1" type="checkbox" />
                            <span>🃏 Авто: 1 карта</span>
                        </label>
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input class="st-tarot-auto-m2" type="checkbox" />
                            <span>✨ Авто: Комбо (2)</span>
                        </label>
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input class="st-tarot-auto-m3" type="checkbox" />
                            <span>🔮 Авто: Триплет (3)</span>
                        </label>
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input class="st-tarot-auto-mall" type="checkbox" />
                            <span>🌌 Авто: Все режимы</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Кинематографичный вылет 3D-карт прямо на экран! -->
        <div id="st-tarot-cinematic-popup" class="st-tarot-cinematic-popup">
            <div class="st-tarot-cinematic-banner">✧ ВМЕШАТЕЛЬСТВО АРКАНОВ СУДЬБЫ ✧</div>
            <div id="st-tarot-cinematic-cards" class="st-tarot-cinematic-cards"></div>
            <div id="st-tarot-cinematic-reading" class="st-tarot-reading-box st-tarot-cinematic-reading"></div>
            <div class="st-tarot-cinematic-hint">(Нажми в любое место, чтобы скрыть)</div>
        </div>
    `;

    $('body').append(tarotHTML);

    // 2. Встраиваем настройки в панель Extensions
    const settingsHTML = `
        <div class="tarot-extension-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>🃏 Arcana Fate Deck (Колода Таро)</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label" for="st-tarot-ext-enabled" style="margin-top:8px;">
                        <input id="st-tarot-ext-enabled" type="checkbox" />
                        <span>Показывать кнопку колоды Таро (🃏) в интерфейсе</span>
                    </label>
                    <label class="checkbox_label" style="margin-top:6px;">
                        <input class="st-tarot-auto-master" type="checkbox" />
                        <span>🎲 Включить Авто-Судьбу при отправке сообщений</span>
                    </label>
                    <div style="padding-left:18px; margin-top:4px; display:flex; flex-direction:column; gap:4px; margin-bottom:6px;">
                        <label class="checkbox_label">
                            <input class="st-tarot-auto-m1" type="checkbox" />
                            <span>🃏 Авто: 1 карта (Одиночный Аркан)</span>
                        </label>
                        <label class="checkbox_label">
                            <input class="st-tarot-auto-m2" type="checkbox" />
                            <span>✨ Авто: Комбо (2 карты)</span>
                        </label>
                        <label class="checkbox_label">
                            <input class="st-tarot-auto-m3" type="checkbox" />
                            <span>🔮 Авто: Триплет (3 карты)</span>
                        </label>
                        <label class="checkbox_label">
                            <input class="st-tarot-auto-mall" type="checkbox" />
                            <span>🌌 Авто: Все режимы (1, 2 и 3 карты случайно)</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('#extensions_settings').append(settingsHTML);

    // Автоматический сдвиг кнопки 🃏, если соседние панели 🌤️ или 🎧 развёрнуты
    setInterval(() => {
        const wContainer = document.getElementById('st-weather-buttons-container');
        const sContainer = document.getElementById('st-sound-buttons-container');
        if (window.innerWidth <= 768) return;

        let rightEdge = 12;
        if (wContainer && wContainer.offsetParent !== null) {
            rightEdge = Math.max(rightEdge, wContainer.getBoundingClientRect().right + 6);
        }
        if (sContainer && sContainer.offsetParent !== null) {
            rightEdge = Math.max(rightEdge, sContainer.getBoundingClientRect().right + 6);
        }
        $('#st-tarot-button-container').css('left', `${rightEdge}px`);
    }, 200);

    // ================= СОСТОЯНИЕ И НАСТРОЙКИ =================
    let extensionEnabled = localStorage.getItem('st_tarot_enabled') !== 'false';
    let autoFateEnabled = localStorage.getItem('st_tarot_auto') === 'true';
    let autoFateChance = parseInt(localStorage.getItem('st_tarot_chance') ?? '25', 10);

    let autoMode1 = localStorage.getItem('st_tarot_auto_m1') !== 'false';
    let autoMode2 = localStorage.getItem('st_tarot_auto_m2') === 'true';
    let autoMode3 = localStorage.getItem('st_tarot_auto_m3') === 'true';
    let autoModeAll = localStorage.getItem('st_tarot_auto_mall') === 'true';

    let spreadCount = 1;
    let currentDrawnCards = [];
    let queuedPrompt = '';

    function saveAutoModes() {
        localStorage.setItem('st_tarot_auto_m1', autoMode1);
        localStorage.setItem('st_tarot_auto_m2', autoMode2);
        localStorage.setItem('st_tarot_auto_m3', autoMode3);
        localStorage.setItem('st_tarot_auto_mall', autoModeAll);
    }

    function syncSettingsUI() {
        $('#st-tarot-ext-enabled').prop('checked', extensionEnabled);
        $('.st-tarot-auto-master').prop('checked', autoFateEnabled);
        $('#st-tarot-chance-slider').val(autoFateChance);
        $('#st-tarot-chance-label').text(`${autoFateChance}%`);

        $('.st-tarot-auto-m1').prop('checked', autoMode1);
        $('.st-tarot-auto-m2').prop('checked', autoMode2);
        $('.st-tarot-auto-m3').prop('checked', autoMode3);
        $('.st-tarot-auto-mall').prop('checked', autoModeAll);

        if (extensionEnabled) {
            $('#st-tarot-button-container').show();
        } else {
            clearFatePrompt();
            $('#st-tarot-button-container').hide();
        }
    }

    // ================= СКРЫТАЯ ИНЪЕКЦИЯ В ПРОМПТ SILLYTAVERN =================
    function applyExtensionPromptToST(promptText) {
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                const ctx = SillyTavern.getContext();
                if (ctx && typeof ctx.setExtensionPrompt === 'function') {
                    ctx.setExtensionPrompt(EXTENSION_PROMPT_ID, promptText, 1, 0, false, 0);
                }
            }
        } catch (e) {
            console.warn('Arcana Fate Deck prompt injection warning:', e);
        }
    }

    function setQueuedFatePrompt(promptText) {
        queuedPrompt = promptText;
        applyExtensionPromptToST(promptText);
        const isQueued = !!promptText;
        $('#btn-tarot-open').toggleClass('tarot-queued', isQueued);
        $('#btn-tarot-weave').toggleClass('active-queued', isQueued).text(
            isQueued ? '✓ Судьба вплетена в следующий ход!' : '✧ Вплести в следующий ход ✧'
        );
        $('#btn-tarot-clear').toggle(isQueued);
    }

    function clearFatePrompt() {
        setQueuedFatePrompt('');
    }

    try {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            const ctx = SillyTavern.getContext();
            if (ctx && typeof ctx.registerMacro === 'function') {
                ctx.registerMacro('tarot_fate', () => queuedPrompt);
            }
        }
    } catch (e) {}

    // ================= ЛОГИКА ВЫТЯГИВАНИЯ КАРТ И ФОРМИРОВАНИЯ ПРОМПТА =================
    function drawRandomCards(count) {
        const pool = [...MAJOR_ARCANA];
        const result = [];
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            const picked = pool.splice(idx, 1)[0];
            const reversed = Math.random() < 0.38;
            result.push({
                card: picked,
                reversed,
                flipped: false
            });
        }
        return result;
    }

    function buildHiddenDirective(cardsArray) {
        if (!cardsArray.length) return '';
        const parts = cardsArray.map((item, idx) => {
            const posName = item.reversed ? 'Reversed' : 'Upright';
            const instruction = item.reversed ? item.card.revPrompt : item.card.upPrompt;
            const prefix = cardsArray.length > 1
                ? `(Card ${idx + 1}: ${item.card.num} ${item.card.nameRu} - ${posName}) `
                : `(${item.card.num} ${item.card.nameRu} - ${posName}) `;
            return prefix + instruction;
        });

        return `[System Narrative Direction — Fate Twist: Seamlessly weave the following subtle plot development or emotional shift into this response without mentioning Tarot or cards explicitly: ${parts.join(' Combined with: ')}]`;
    }

    function formatReadingHTML(cardsArray) {
        return cardsArray.map((item, i) => {
            const posBadge = item.reversed ? '↻ Перевёрнутая' : '↑ Прямая';
            const desc = item.reversed ? item.card.revRu : item.card.upRu;
            const prefix = cardsArray.length > 1
                ? `<b>${i + 1}. ${item.card.num} — ${item.card.nameRu} (${posBadge}):</b> `
                : `<b>${item.card.num} — ${item.card.nameRu} (${posBadge}):</b> `;
            return `<div style="margin-bottom:6px;">${prefix}${desc}</div>`;
        }).join('');
    }

    function updateReadingBox() {
        const flippedCards = currentDrawnCards.filter(c => c.flipped);
        if (flippedCards.length === 0) {
            $('#st-tarot-reading-box').html('Нажми на карту (или «Вплести в следующий ход»), чтобы открыть Арканы...');
            return;
        }
        $('#st-tarot-reading-box').html(formatReadingHTML(flippedCards));
    }

    function createCardElement(item, startFlipped = false) {
        const posText = item.reversed ? '↻ Перевёрнутая' : '↑ Прямая';
        return $(`
            <div class="st-tarot-card-slot ${startFlipped ? 'flipped' : ''}">
                <div class="st-tarot-card-face st-tarot-card-back">
                    <div class="st-tarot-back-motif">✧<br>☽ ❅ ☾<br>✧</div>
                    <div class="st-tarot-back-hint">Судьба</div>
                </div>
                <div class="st-tarot-card-face st-tarot-card-front ${item.reversed ? 'is-reversed' : ''}">
                    <div class="st-tarot-roman">${item.card.num}</div>
                    <div class="st-tarot-art-glyph">${item.card.glyph}</div>
                    <div>
                        <div class="st-tarot-card-name">${item.card.nameRu}</div>
                        <div class="st-tarot-card-orientation">${posText}</div>
                    </div>
                </div>
            </div>
        `);
    }

    function renderStage(autoFlipAll = false) {
        const stage = $('#st-tarot-cards-stage');
        stage.empty();

        currentDrawnCards.forEach((item) => {
            if (autoFlipAll) item.flipped = true;
            const cardEl = createCardElement(item, item.flipped);
            cardEl.on('click', function() {
                item.flipped = !item.flipped;
                $(this).toggleClass('flipped', item.flipped);
                updateReadingBox();
            });
            stage.append(cardEl);
        });

        updateReadingBox();
    }

    function startNewSpread(count, flipImmediately = false) {
        spreadCount = count;
        currentDrawnCards = drawRandomCards(count);
        renderStage(flipImmediately);
    }

    // ================= КИНЕМАТОГРАФИЧНЫЙ ВЫЛЕТ 3D-КАРТ НА ЭКРАН =================
    let popupTimeout = null;
    function showCinematicCardsPopup(cardsArray) {
        const container = $('#st-tarot-cinematic-cards');
        container.empty();

        // Сперва создаём карты рубашкой вверх, чтобы они перевернулись прямо на глазах!
        const cardEls = cardsArray.map((item) => {
            const el = createCardElement(item, false);
            container.append(el);
            return el;
        });

        $('#st-tarot-cinematic-reading').html(formatReadingHTML(cardsArray));
        $('#st-tarot-cinematic-popup').addClass('show');

        // Каскадный 3D-переворот каждой карты (с интервалом 220мс)
        cardEls.forEach((el, idx) => {
            setTimeout(() => {
                el.addClass('flipped');
            }, 260 + idx * 240);
        });

        clearTimeout(popupTimeout);
        popupTimeout = setTimeout(() => {
            $('#st-tarot-cinematic-popup').removeClass('show');
        }, 6200);
    }

    // Клик по всплывшему оверлею сразу закрывает его
    $('#st-tarot-cinematic-popup').on('click', function() {
        clearTimeout(popupTimeout);
        $(this).removeClass('show');
    });

    // ================= ПЕРЕХВАТ ОТПРАВКИ СООБЩЕНИЯ В ПОСЛЕДНИЙ МОМЕНТ =================
    function getRandomAllowedAutoCount() {
        if (autoModeAll) {
            const allPool = [1, 2, 3];
            return allPool[Math.floor(Math.random() * allPool.length)];
        }
        const pool = [];
        if (autoMode1) pool.push(1);
        if (autoMode2) pool.push(2);
        if (autoMode3) pool.push(3);
        if (pool.length === 0) return 1;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function onBeforeUserSendMessage() {
        if (!extensionEnabled) return;

        // Если юзер уже сам вручную зарядил карту на этот ход — оставляем её!
        if (queuedPrompt) return;

        // Иначе, если включена Авто-Судьба — бросаем кубик!
        if (autoFateEnabled && Math.random() * 100 < autoFateChance) {
            const count = getRandomAllowedAutoCount();
            const autoCards = drawRandomCards(count);
            autoCards.forEach(c => c.flipped = true);
            currentDrawnCards = autoCards;
            spreadCount = count;
            $('.st-tarot-mode-btn').removeClass('active');
            $(`.st-tarot-mode-btn[data-count="${count}"]`).addClass('active');
            renderStage(true);

            const hiddenPrompt = buildHiddenDirective(autoCards);
            setQueuedFatePrompt(hiddenPrompt);

            // Выбрасываем 3D-карты прямо на экран с каскадным переворотом!
            showCinematicCardsPopup(autoCards);
        }
    }

    window.addEventListener('pointerdown', (e) => {
        if (e.target && (e.target.id === 'send_but' || e.target.closest('#send_but'))) {
            onBeforeUserSendMessage();
        }
    }, true);

    window.addEventListener('keydown', (e) => {
        if (e.target && e.target.id === 'send_textarea' && e.key === 'Enter' && !e.shiftKey) {
            onBeforeUserSendMessage();
        }
    }, true);

    // Очищаем одноразовый промпт Судьбы после того, как генерация ответа завершилась!
    const attachSTEvents = setInterval(() => {
        try {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                const ctx = SillyTavern.getContext();
                if (ctx && ctx.eventSource && ctx.event_types) {
                    clearInterval(attachSTEvents);
                    const ev = ctx.event_types;
                    if (ev.GENERATION_ENDED) {
                        ctx.eventSource.on(ev.GENERATION_ENDED, () => {
                            if (queuedPrompt) clearFatePrompt();
                        });
                    }
                    if (ev.GENERATION_STOPPED) {
                        ctx.eventSource.on(ev.GENERATION_STOPPED, () => {
                            if (queuedPrompt) clearFatePrompt();
                        });
                    }
                }
            }
        } catch (e) {}
    }, 1000);

    // ================= ОБРАБОТЧИКИ КНОПОК И ГАЛОЧЕК =================
    $('#btn-tarot-open').on('click', () => {
        if (currentDrawnCards.length === 0) {
            startNewSpread(spreadCount, false);
        }
        $('#st-tarot-modal-overlay').addClass('open');
    });

    $('#st-tarot-close, #st-tarot-modal-overlay').on('click', function(e) {
        if (e.target === this) {
            $('#st-tarot-modal-overlay').removeClass('open');
        }
    });

    $('.st-tarot-mode-btn').on('click', function() {
        $('.st-tarot-mode-btn').removeClass('active');
        $(this).addClass('active');
        const count = parseInt($(this).data('count'), 10);
        startNewSpread(count, false);
    });

    $('#btn-tarot-draw-new').on('click', () => {
        clearFatePrompt();
        startNewSpread(spreadCount, true);
    });

    $('#btn-tarot-weave').on('click', () => {
        currentDrawnCards.forEach(c => c.flipped = true);
        $('.st-tarot-card-slot').addClass('flipped');
        updateReadingBox();

        const directive = buildHiddenDirective(currentDrawnCards);
        setQueuedFatePrompt(directive);
        $('#st-tarot-modal-overlay').removeClass('open');
        showCinematicCardsPopup(currentDrawnCards);
    });

    $('#btn-tarot-clear').on('click', () => {
        clearFatePrompt();
    });

    $('#st-tarot-ext-enabled').on('change', function() {
        extensionEnabled = $(this).is(':checked');
        localStorage.setItem('st_tarot_enabled', extensionEnabled);
        syncSettingsUI();
    });

    $('.st-tarot-auto-master').on('change', function() {
        autoFateEnabled = $(this).is(':checked');
        localStorage.setItem('st_tarot_auto', autoFateEnabled);
        if (!autoFateEnabled) clearFatePrompt();
        syncSettingsUI();
    });

    $('#st-tarot-chance-slider').on('input', function() {
        autoFateChance = parseInt($(this).val(), 10);
        localStorage.setItem('st_tarot_chance', autoFateChance);
        $('#st-tarot-chance-label').text(`${autoFateChance}%`);
    });

    function updateIndividualAutoModes() {
        if (!autoMode1 && !autoMode2 && !autoMode3) {
            autoMode1 = true;
        }
        autoModeAll = (autoMode1 && autoMode2 && autoMode3);
        saveAutoModes();
        syncSettingsUI();
    }

    $('.st-tarot-auto-m1').on('change', function() {
        autoMode1 = $(this).is(':checked');
        updateIndividualAutoModes();
    });

    $('.st-tarot-auto-m2').on('change', function() {
        autoMode2 = $(this).is(':checked');
        updateIndividualAutoModes();
    });

    $('.st-tarot-auto-m3').on('change', function() {
        autoMode3 = $(this).is(':checked');
        updateIndividualAutoModes();
    });

    $('.st-tarot-auto-mall').on('change', function() {
        autoModeAll = $(this).is(':checked');
        if (autoModeAll) {
            autoMode1 = true;
            autoMode2 = true;
            autoMode3 = true;
        } else {
            autoMode1 = true;
            autoMode2 = false;
            autoMode3 = false;
        }
        saveAutoModes();
        syncSettingsUI();
    });

    syncSettingsUI();
    startNewSpread(1, false);
});