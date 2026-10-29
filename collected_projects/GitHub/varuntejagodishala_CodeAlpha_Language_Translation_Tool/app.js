/**
 * PolyGlot Studio - Universal Language Translator
 * Core Application Logic & Multi-Provider Engine
 */

// Application State
const state = {
  sourceLang: 'auto',
  targetLang: 'es',
  sourceText: '',
  translatedText: '',
  isTranslating: false,
  autoTranslate: true,
  provider: 'google-free', // 'google-free' | 'mymemory-free' | 'google-official' | 'azure' | 'libre'
  googleApiKey: '',
  azureApiKey: '',
  azureRegion: '',
  libreUrl: '',
  libreKey: '',
  speechRate: 1.0,
  debounceDelay: 600,
  history: [],
  isRecording: false,
  speechSynth: window.speechSynthesis || null,
  activeSpeechUtterance: null,
  speechRecognition: null,
};

// DOM Element References
const elements = {
  // Selects & Flags
  sourceLangSelect: document.getElementById('sourceLangSelect'),
  targetLangSelect: document.getElementById('targetLangSelect'),
  sourceFlag: document.getElementById('sourceFlag'),
  targetFlag: document.getElementById('targetFlag'),
  sourceQuickPills: document.getElementById('sourceQuickPills'),
  targetQuickPills: document.getElementById('targetQuickPills'),
  swapLangBtn: document.getElementById('swapLangBtn'),

  // Inputs & Outputs
  sourceTextInput: document.getElementById('sourceTextInput'),
  targetOutputArea: document.getElementById('targetOutputArea'),
  skeletonLoading: document.getElementById('skeletonLoading'),
  clearInputBtn: document.getElementById('clearInputBtn'),
  detectedLangBadge: document.getElementById('detectedLangBadge'),
  detectedLangText: document.getElementById('detectedLangText'),
  charCounter: document.getElementById('charCounter'),
  outputWordCount: document.getElementById('outputWordCount'),

  // Actions
  translateBtn: document.getElementById('translateBtn'),
  translateBtnLabel: document.getElementById('translateBtnLabel'),
  translateBtnSpinner: document.getElementById('translateBtnSpinner'),
  copySourceBtn: document.getElementById('copySourceBtn'),
  copyTargetBtn: document.getElementById('copyTargetBtn'),
  pasteBtn: document.getElementById('pasteBtn'),
  ttsSourceBtn: document.getElementById('ttsSourceBtn'),
  ttsTargetBtn: document.getElementById('ttsTargetBtn'),
  micBtn: document.getElementById('micBtn'),
  micBtnText: document.getElementById('micBtnText'),
  downloadBtn: document.getElementById('downloadBtn'),

  // Badges & Settings
  currentProviderLabel: document.getElementById('currentProviderLabel'),
  providerBadgeBtn: document.getElementById('providerBadgeBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  resetSettingsBtn: document.getElementById('resetSettingsBtn'),
  providerSelect: document.getElementById('providerSelect'),
  googleKeyGroup: document.getElementById('googleKeyGroup'),
  googleApiKeyInput: document.getElementById('googleApiKey'),
  azureKeyGroup: document.getElementById('azureKeyGroup'),
  azureApiKeyInput: document.getElementById('azureApiKey'),
  azureRegionInput: document.getElementById('azureRegion'),
  libreGroup: document.getElementById('libreGroup'),
  libreUrlInput: document.getElementById('libreUrl'),
  libreKeyInput: document.getElementById('libreKey'),
  speechRateSlider: document.getElementById('speechRateSlider'),
  speechRateLabel: document.getElementById('speechRateLabel'),
  autoDebounceSlider: document.getElementById('autoDebounceSlider'),
  debounceLabel: document.getElementById('debounceLabel'),

  // Controls & History
  autoTranslateToggle: document.getElementById('autoTranslateToggle'),
  spellcheckToggle: document.getElementById('spellcheckToggle'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  historyToggleBtn: document.getElementById('historyToggleBtn'),
  historySection: document.getElementById('historySection'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  historyList: document.getElementById('historyList'),
  toastContainer: document.getElementById('toastContainer'),
};

// Debounce Timer Reference
let debounceTimer = null;

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadStoredSettings();
  populateLanguageSelects();
  initTheme();
  initSpeechRecognition();
  bindEventListeners();
  updateUI();
});

// Load persistent settings from localStorage
function loadStoredSettings() {
  try {
    const saved = localStorage.getItem('polyglot_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.provider = parsed.provider || 'google-free';
      state.googleApiKey = parsed.googleApiKey || '';
      state.azureApiKey = parsed.azureApiKey || '';
      state.azureRegion = parsed.azureRegion || '';
      state.libreUrl = parsed.libreUrl || '';
      state.libreKey = parsed.libreKey || '';
      state.speechRate = parsed.speechRate || 1.0;
      state.debounceDelay = parsed.debounceDelay || 600;
      state.autoTranslate = parsed.autoTranslate !== undefined ? parsed.autoTranslate : true;
      state.sourceLang = parsed.sourceLang || 'auto';
      state.targetLang = parsed.targetLang || 'es';
    }

    const savedHistory = localStorage.getItem('polyglot_history');
    if (savedHistory) {
      state.history = JSON.parse(savedHistory);
    }
  } catch (err) {
    console.warn('Failed to load settings from localStorage:', err);
  }
}

// Save settings to localStorage
function saveStoredSettings() {
  try {
    const data = {
      provider: state.provider,
      googleApiKey: state.googleApiKey,
      azureApiKey: state.azureApiKey,
      azureRegion: state.azureRegion,
      libreUrl: state.libreUrl,
      libreKey: state.libreKey,
      speechRate: state.speechRate,
      debounceDelay: state.debounceDelay,
      autoTranslate: state.autoTranslate,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
    };
    localStorage.setItem('polyglot_settings', JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }
}

// Populate language select options
function populateLanguageSelects() {
  // Source languages (Includes "Detect Language")
  elements.sourceLangSelect.innerHTML = '<option value="auto">🌐 Detect Language</option>';
  LANGUAGES.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.flag} ${lang.name} (${lang.native})`;
    elements.sourceLangSelect.appendChild(opt);
  });

  // Target languages
  elements.targetLangSelect.innerHTML = '';
  LANGUAGES.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.flag} ${lang.name} (${lang.native})`;
    elements.targetLangSelect.appendChild(opt);
  });

  // Set selected values
  elements.sourceLangSelect.value = state.sourceLang;
  elements.targetLangSelect.value = state.targetLang;

  updateFlagIcons();
  syncQuickPills();
}

// Update flag icons beside dropdowns
function updateFlagIcons() {
  const src = getLanguageByCode(state.sourceLang);
  elements.sourceFlag.textContent = src.flag || '🌐';

  const tgt = getLanguageByCode(state.targetLang);
  elements.targetFlag.textContent = tgt.flag || '🌐';
}

// Synchronize quick-pick pills with selected language
function syncQuickPills() {
  document.querySelectorAll('#sourceQuickPills .quick-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === state.sourceLang);
  });

  document.querySelectorAll('#targetQuickPills .quick-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === state.targetLang);
  });
}

// Synchronize all settings in the UI
function updateUI() {
  elements.autoTranslateToggle.checked = state.autoTranslate;
  elements.speechRateSlider.value = state.speechRate;
  elements.speechRateLabel.textContent = `${state.speechRate}x`;
  elements.autoDebounceSlider.value = state.debounceDelay;
  elements.debounceLabel.textContent = `${state.debounceDelay}ms`;

  elements.providerSelect.value = state.provider;
  elements.googleApiKeyInput.value = state.googleApiKey;
  elements.azureApiKeyInput.value = state.azureApiKey;
  elements.azureRegionInput.value = state.azureRegion;
  elements.libreUrlInput.value = state.libreUrl;
  elements.libreKeyInput.value = state.libreKey;

  updateProviderBadge();
  toggleProviderFields();
  renderHistoryList();
}

// Update the provider badge label in the topbar
function updateProviderBadge() {
  const map = {
    'google-free': 'Google Translate (Free)',
    'mymemory-free': 'MyMemory (Free)',
    'google-official': 'Google Cloud (Official)',
    'azure': 'Azure Translator',
    'libre': 'LibreTranslate',
  };
  elements.currentProviderLabel.textContent = map[state.provider] || 'Translation Engine';
}

// Toggle visibility of API key inputs in settings based on selected provider
function toggleProviderFields() {
  const p = elements.providerSelect.value;
  elements.googleKeyGroup.style.display = p === 'google-official' ? 'flex' : 'none';
  elements.azureKeyGroup.style.display = p === 'azure' ? 'flex' : 'none';
  elements.libreGroup.style.display = p === 'libre' ? 'flex' : 'none';
}

// ============================================================================
// Event Listeners
// ============================================================================

function bindEventListeners() {
  // Source Language Select
  elements.sourceLangSelect.addEventListener('change', (e) => {
    state.sourceLang = e.target.value;
    updateFlagIcons();
    syncQuickPills();
    saveStoredSettings();
    if (state.sourceText.trim()) triggerTranslation();
  });

  // Target Language Select
  elements.targetLangSelect.addEventListener('change', (e) => {
    state.targetLang = e.target.value;
    updateFlagIcons();
    syncQuickPills();
    saveStoredSettings();
    if (state.sourceText.trim()) triggerTranslation();
  });

  // Quick pills clicks
  elements.sourceQuickPills.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-pill')) {
      const lang = e.target.dataset.lang;
      state.sourceLang = lang;
      elements.sourceLangSelect.value = lang;
      updateFlagIcons();
      syncQuickPills();
      saveStoredSettings();
      if (state.sourceText.trim()) triggerTranslation();
    }
  });

  elements.targetQuickPills.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-pill')) {
      const lang = e.target.dataset.lang;
      state.targetLang = lang;
      elements.targetLangSelect.value = lang;
      updateFlagIcons();
      syncQuickPills();
      saveStoredSettings();
      if (state.sourceText.trim()) triggerTranslation();
    }
  });

  // Language Swap Button
  elements.swapLangBtn.addEventListener('click', swapLanguages);

  // Input typing and debounced translation
  elements.sourceTextInput.addEventListener('input', (e) => {
    state.sourceText = e.target.value;
    updateCharCount();
    elements.clearInputBtn.style.display = state.sourceText.length > 0 ? 'flex' : 'none';

    if (!state.sourceText.trim()) {
      clearOutput();
      return;
    }

    if (state.autoTranslate) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        triggerTranslation();
      }, state.debounceDelay);
    }
  });

  // Clear Input Button
  elements.clearInputBtn.addEventListener('click', () => {
    elements.sourceTextInput.value = '';
    state.sourceText = '';
    elements.clearInputBtn.style.display = 'none';
    clearOutput();
    updateCharCount();
    elements.sourceTextInput.focus();
  });

  // Translate Button
  elements.translateBtn.addEventListener('click', () => {
    if (!state.sourceText.trim()) {
      showToast('Please enter text to translate', 'info');
      elements.sourceTextInput.focus();
      return;
    }
    triggerTranslation();
  });

  // Copy Buttons
  elements.copySourceBtn.addEventListener('click', () => {
    if (!state.sourceText.trim()) return;
    navigator.clipboard.writeText(state.sourceText).then(() => {
      showToast('Source text copied to clipboard', 'success');
    });
  });

  elements.copyTargetBtn.addEventListener('click', () => {
    if (!state.translatedText.trim()) return;
    navigator.clipboard.writeText(state.translatedText).then(() => {
      showToast('Translation copied to clipboard!', 'success');
    });
  });

  // Paste Button
  elements.pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        elements.sourceTextInput.value = text;
        state.sourceText = text;
        elements.clearInputBtn.style.display = 'flex';
        updateCharCount();
        triggerTranslation();
        showToast('Pasted text from clipboard', 'info');
      }
    } catch (err) {
      showToast('Clipboard access denied or unsupported', 'error');
    }
  });

  // Text-to-Speech Listeners
  elements.ttsSourceBtn.addEventListener('click', () => {
    const lang = state.sourceLang === 'auto' ? 'en-US' : (getLanguageByCode(state.sourceLang).speech || 'en-US');
    speakText(state.sourceText, lang, elements.ttsSourceBtn);
  });

  elements.ttsTargetBtn.addEventListener('click', () => {
    const lang = getLanguageByCode(state.targetLang).speech || 'es-ES';
    speakText(state.translatedText, lang, elements.ttsTargetBtn);
  });

  // Microphone (Speech-to-Text)
  elements.micBtn.addEventListener('click', toggleVoiceDictation);

  // Download translation
  elements.downloadBtn.addEventListener('click', downloadTranslationAsFile);

  // Auto-translate & Spellcheck toggles
  elements.autoTranslateToggle.addEventListener('change', (e) => {
    state.autoTranslate = e.target.checked;
    saveStoredSettings();
    showToast(`Auto-translation ${state.autoTranslate ? 'Enabled' : 'Disabled'}`, 'info');
  });

  elements.spellcheckToggle.addEventListener('change', (e) => {
    elements.sourceTextInput.spellcheck = e.target.checked;
  });

  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // History Panel
  elements.historyToggleBtn.addEventListener('click', () => {
    elements.historySection.classList.toggle('open');
  });

  elements.closeHistoryBtn.addEventListener('click', () => {
    elements.historySection.classList.remove('open');
  });

  elements.clearHistoryBtn.addEventListener('click', clearAllHistory);

  // Settings Modal Handlers
  elements.settingsBtn.addEventListener('click', openSettingsModal);
  elements.providerBadgeBtn.addEventListener('click', openSettingsModal);
  elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
  });

  elements.providerSelect.addEventListener('change', toggleProviderFields);

  elements.speechRateSlider.addEventListener('input', (e) => {
    state.speechRate = parseFloat(e.target.value);
    elements.speechRateLabel.textContent = `${state.speechRate}x`;
  });

  elements.autoDebounceSlider.addEventListener('input', (e) => {
    state.debounceDelay = parseInt(e.target.value, 10);
    elements.debounceLabel.textContent = `${state.debounceDelay}ms`;
  });

  elements.saveSettingsBtn.addEventListener('click', saveModalSettings);
  elements.resetSettingsBtn.addEventListener('click', resetSettingsToDefault);

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl + Enter or Cmd + Enter = Translate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      triggerTranslation();
    }
    // Ctrl + Shift + S = Swap Languages
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      swapLanguages();
    }
    // Escape = Close modals/history
    if (e.key === 'Escape') {
      closeSettingsModal();
      elements.historySection.classList.remove('open');
    }
  });
}

// ============================================================================
// Core Translation Logic
// ============================================================================

async function triggerTranslation() {
  const text = state.sourceText.trim();
  if (!text) {
    clearOutput();
    return;
  }

  // Prevent identical translation loop or duplicate execution
  setTranslatingState(true);

  try {
    let result = null;

    // Route to appropriate provider
    switch (state.provider) {
      case 'google-official':
        result = await translateWithGoogleOfficial(text, state.sourceLang, state.targetLang);
        break;
      case 'azure':
        result = await translateWithAzure(text, state.sourceLang, state.targetLang);
        break;
      case 'libre':
        result = await translateWithLibre(text, state.sourceLang, state.targetLang);
        break;
      case 'mymemory-free':
        result = await translateWithMyMemory(text, state.sourceLang, state.targetLang);
        break;
      case 'google-free':
      default:
        // Try Google Free (GTX); if blocked, automatically fallback to MyMemory
        try {
          result = await translateWithGoogleFree(text, state.sourceLang, state.targetLang);
        } catch (gtxError) {
          console.warn('Google Free failed, falling back to MyMemory:', gtxError);
          result = await translateWithMyMemory(text, state.sourceLang, state.targetLang);
          showToast('Switched to backup provider (MyMemory)', 'info');
        }
        break;
    }

    if (result && result.text) {
      state.translatedText = result.text;
      renderTranslatedOutput(result.text);

      // Handle detected source language
      if (result.detectedLang && state.sourceLang === 'auto') {
        const detectedObj = getLanguageByCode(result.detectedLang);
        elements.detectedLangText.textContent = `Detected: ${detectedObj.flag || ''} ${detectedObj.name}`;
        elements.detectedLangBadge.style.display = 'inline-flex';
      } else {
        elements.detectedLangBadge.style.display = 'none';
      }

      // Add to Translation History
      addToHistory({
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        sourceText: text,
        translatedText: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      throw new Error('Received empty response from translation service');
    }
  } catch (error) {
    console.error('Translation error:', error);
    elements.targetOutputArea.classList.remove('empty-state');
    elements.targetOutputArea.innerHTML = `<span style="color: var(--danger);">⚠️ Translation Error: ${escapeHtml(error.message || 'Unable to translate text. Check network or API settings.')}</span>`;
    showToast(error.message || 'Translation failed', 'error');
  } finally {
    setTranslatingState(false);
  }
}

// 1. Google Translate (Free Client GTX API)
async function translateWithGoogleFree(text, src, tgt) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google API returned status ${response.status}`);
  }
  
  const data = await response.json();
  if (!data || !data[0]) {
    throw new Error('Malformed translation response');
  }

  // Join all translated text chunks
  const translatedText = data[0].map(segment => segment[0]).filter(Boolean).join('');
  const detectedLang = data[2] || null;

  return { text: translatedText, detectedLang };
}

// 2. MyMemory Public Translation API
async function translateWithMyMemory(text, src, tgt) {
  const sourceCode = src === 'auto' ? 'en' : src.split('-')[0];
  const targetCode = tgt.split('-')[0];
  const pair = `${sourceCode}|${targetCode}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MyMemory API returned status ${response.status}`);
  }

  const data = await response.json();
  if (data.responseStatus !== 200 && data.responseStatus !== '200') {
    throw new Error(data.responseDetails || 'MyMemory translation failed');
  }

  return {
    text: data.responseData.translatedText,
    detectedLang: null,
  };
}

// 3. Official Google Cloud Translation API v2
async function translateWithGoogleOfficial(text, src, tgt) {
  if (!state.googleApiKey) {
    throw new Error('Google Cloud API Key is required. Please set it in Settings.');
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${state.googleApiKey}`;
  const payload = {
    q: text,
    target: tgt,
    format: 'text',
  };
  if (src !== 'auto') payload.source = src;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google API error ${response.status}`);
  }

  const data = await response.json();
  const item = data.data.translations[0];
  return {
    text: item.translatedText,
    detectedLang: item.detectedSourceLanguage || null,
  };
}

// 4. Microsoft Azure Cognitive Translator API
async function translateWithAzure(text, src, tgt) {
  if (!state.azureApiKey) {
    throw new Error('Azure Subscription Key is required. Please configure it in Settings.');
  }

  let url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${tgt}`;
  if (src !== 'auto') url += `&from=${src}`;

  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': state.azureApiKey,
  };
  if (state.azureRegion) {
    headers['Ocp-Apim-Subscription-Region'] = state.azureRegion;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify([{ Text: text }]),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Azure API error ${response.status}`);
  }

  const data = await response.json();
  const translation = data[0].translations[0].text;
  const detected = data[0].detectedLanguage?.language || null;

  return { text: translation, detectedLang: detected };
}

// 5. LibreTranslate Instance
async function translateWithLibre(text, src, tgt) {
  const baseUrl = state.libreUrl.trim() || 'https://libretranslate.com';
  const url = `${baseUrl.replace(/\/$/, '')}/translate`;

  const payload = {
    q: text,
    source: src === 'auto' ? 'auto' : src,
    target: tgt,
    format: 'text',
  };
  if (state.libreKey) payload.api_key = state.libreKey;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `LibreTranslate error ${response.status}`);
  }

  const data = await response.json();
  return { text: data.translatedText, detectedLang: data.detectedLanguage?.language || null };
}

// ============================================================================
// UI & State Helpers
// ============================================================================

function setTranslatingState(isLoading) {
  state.isTranslating = isLoading;
  elements.translateBtn.disabled = isLoading;
  elements.translateBtnSpinner.style.display = isLoading ? 'inline-block' : 'none';
  elements.translateBtnLabel.textContent = isLoading ? 'Translating...' : 'Translate';

  if (isLoading) {
    elements.skeletonLoading.style.display = 'flex';
    elements.targetOutputArea.style.display = 'none';
  } else {
    elements.skeletonLoading.style.display = 'none';
    elements.targetOutputArea.style.display = 'block';
  }
}

function renderTranslatedOutput(text) {
  elements.targetOutputArea.classList.remove('empty-state');
  elements.targetOutputArea.textContent = text;

  // Update target word count
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  elements.outputWordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
}

function clearOutput() {
  state.translatedText = '';
  elements.targetOutputArea.classList.add('empty-state');
  elements.targetOutputArea.textContent = 'Translation will appear here in real-time...';
  elements.detectedLangBadge.style.display = 'none';
  elements.outputWordCount.textContent = '0 words';
}

function updateCharCount() {
  const count = state.sourceText.length;
  elements.charCounter.textContent = `${count.toLocaleString()} / 5,000`;
  if (count > 5000) {
    elements.charCounter.style.color = 'var(--danger)';
  } else {
    elements.charCounter.style.color = 'var(--text-muted)';
  }
}

// Swap source and target languages and texts
function swapLanguages() {
  // If source was 'auto', swap to the current target and default target to 'en'
  const newSource = state.targetLang;
  const newTarget = state.sourceLang === 'auto' ? 'en' : state.sourceLang;

  state.sourceLang = newSource;
  state.targetLang = newTarget;

  elements.sourceLangSelect.value = state.sourceLang;
  elements.targetLangSelect.value = state.targetLang;

  updateFlagIcons();
  syncQuickPills();

  // Swap texts if translated text exists
  if (state.translatedText.trim()) {
    const tempText = state.translatedText;
    state.sourceText = tempText;
    elements.sourceTextInput.value = tempText;
    clearOutput();
    updateCharCount();
    triggerTranslation();
  }

  saveStoredSettings();
  showToast('Swapped languages', 'info');
}

// Download translation to a .txt file
function downloadTranslationAsFile() {
  if (!state.translatedText.trim()) {
    showToast('Nothing to download yet', 'info');
    return;
  }

  const content = `PolyGlot Translation\n====================\nFrom: ${state.sourceLang}\nTo: ${state.targetLang}\nDate: ${new Date().toLocaleString()}\n\nOriginal Text:\n${state.sourceText}\n\nTranslated Text:\n${state.translatedText}\n`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `translation_${state.sourceLang}_to_${state.targetLang}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Translation downloaded', 'success');
}

// ============================================================================
// Text to Speech (TTS)
// ============================================================================

function speakText(text, langCode, buttonElement) {
  if (!state.speechSynth) {
    showToast('Speech synthesis not supported in this browser', 'error');
    return;
  }

  if (!text.trim()) {
    showToast('No text available to speak', 'info');
    return;
  }

  // If already speaking, stop
  if (state.speechSynth.speaking) {
    state.speechSynth.cancel();
    if (buttonElement && buttonElement.classList.contains('speaking')) {
      buttonElement.classList.remove('speaking');
      return;
    }
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode || 'en-US';
  utterance.rate = state.speechRate || 1.0;

  // Match available browser voice if possible
  const voices = state.speechSynth.getVoices();
  const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase().slice(0, 2)));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (buttonElement) buttonElement.classList.add('speaking');

  utterance.onend = () => {
    if (buttonElement) buttonElement.classList.remove('speaking');
  };

  utterance.onerror = (e) => {
    console.warn('TTS error:', e);
    if (buttonElement) buttonElement.classList.remove('speaking');
  };

  state.speechSynth.speak(utterance);
}

// ============================================================================
// Speech to Text (Voice Input)
// ============================================================================

function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    elements.micBtn.style.opacity = '0.5';
    elements.micBtn.title = 'Speech recognition not supported in this browser';
    return;
  }

  const recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    state.isRecording = true;
    elements.micBtn.classList.add('recording');
    elements.micBtnText.textContent = 'Listening...';
    showToast('Listening... Speak into your microphone', 'info');
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    elements.sourceTextInput.value = transcript;
    state.sourceText = transcript;
    updateCharCount();
    elements.clearInputBtn.style.display = 'flex';
  };

  recognition.onend = () => {
    state.isRecording = false;
    elements.micBtn.classList.remove('recording');
    elements.micBtnText.textContent = 'Dictate';
    if (state.sourceText.trim()) {
      triggerTranslation();
    }
  };

  recognition.onerror = (event) => {
    state.isRecording = false;
    elements.micBtn.classList.remove('recording');
    elements.micBtnText.textContent = 'Dictate';
    showToast(`Speech recognition error: ${event.error}`, 'error');
  };

  state.speechRecognition = recognition;
}

function toggleVoiceDictation() {
  if (!state.speechRecognition) {
    showToast('Speech recognition is not supported in this browser', 'error');
    return;
  }

  if (state.isRecording) {
    state.speechRecognition.stop();
  } else {
    const srcLang = state.sourceLang === 'auto' ? 'en-US' : (getLanguageByCode(state.sourceLang).speech || 'en-US');
    state.speechRecognition.lang = srcLang;
    try {
      state.speechRecognition.start();
    } catch (e) {
      console.warn('Recognition start failed:', e);
    }
  }
}

// ============================================================================
// Translation History
// ============================================================================

function addToHistory(entry) {
  // Deduplicate consecutive entries
  if (state.history.length > 0 && state.history[0].sourceText === entry.sourceText && state.history[0].targetLang === entry.targetLang) {
    return;
  }

  state.history.unshift(entry);
  if (state.history.length > 30) state.history.pop();

  localStorage.setItem('polyglot_history', JSON.stringify(state.history));
  renderHistoryList();
}

function renderHistoryList() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.9rem;">No translation history yet.</div>`;
    return;
  }

  elements.historyList.innerHTML = '';
  state.history.forEach((item, index) => {
    const srcObj = getLanguageByCode(item.sourceLang);
    const tgtObj = getLanguageByCode(item.targetLang);

    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-item-content">
        <div class="history-lang-meta">${srcObj.flag || ''} ${srcObj.name} ➔ ${tgtObj.flag || ''} ${tgtObj.name} · <span style="color: var(--text-muted);">${item.timestamp}</span></div>
        <div class="history-item-src">${escapeHtml(item.sourceText)}</div>
        <div class="history-item-target">${escapeHtml(item.translatedText)}</div>
      </div>
      <div class="history-item-actions">
        <button class="action-btn" data-action="copy" title="Copy Translation">📋</button>
        <button class="action-btn" data-action="delete" title="Delete">🗑️</button>
      </div>
    `;

    // Click item to load into translator
    div.querySelector('.history-item-content').addEventListener('click', () => {
      state.sourceLang = item.sourceLang;
      state.targetLang = item.targetLang;
      elements.sourceLangSelect.value = item.sourceLang;
      elements.targetLangSelect.value = item.targetLang;
      updateFlagIcons();
      syncQuickPills();

      elements.sourceTextInput.value = item.sourceText;
      state.sourceText = item.sourceText;
      elements.clearInputBtn.style.display = 'flex';
      updateCharCount();
      renderTranslatedOutput(item.translatedText);
      state.translatedText = item.translatedText;
      showToast('Loaded translation from history', 'info');
    });

    // Action buttons inside item
    div.querySelector('[data-action="copy"]').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.translatedText);
      showToast('Copied to clipboard', 'success');
    });

    div.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      state.history.splice(index, 1);
      localStorage.setItem('polyglot_history', JSON.stringify(state.history));
      renderHistoryList();
    });

    elements.historyList.appendChild(div);
  });
}

function clearAllHistory() {
  if (!confirm('Clear all translation history?')) return;
  state.history = [];
  localStorage.removeItem('polyglot_history');
  renderHistoryList();
  showToast('History cleared', 'info');
}

// ============================================================================
// Settings Modal & Theme
// ============================================================================

function openSettingsModal() {
  elements.settingsModal.classList.add('active');
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('active');
}

function saveModalSettings() {
  state.provider = elements.providerSelect.value;
  state.googleApiKey = elements.googleApiKeyInput.value.trim();
  state.azureApiKey = elements.azureApiKeyInput.value.trim();
  state.azureRegion = elements.azureRegionInput.value.trim();
  state.libreUrl = elements.libreUrlInput.value.trim();
  state.libreKey = elements.libreKeyInput.value.trim();
  state.speechRate = parseFloat(elements.speechRateSlider.value);
  state.debounceDelay = parseInt(elements.autoDebounceSlider.value, 10);

  updateProviderBadge();
  saveStoredSettings();
  closeSettingsModal();
  showToast('Settings saved successfully', 'success');

  if (state.sourceText.trim()) {
    triggerTranslation();
  }
}

function resetSettingsToDefault() {
  elements.providerSelect.value = 'google-free';
  elements.googleApiKeyInput.value = '';
  elements.azureApiKeyInput.value = '';
  elements.azureRegionInput.value = '';
  elements.libreUrlInput.value = '';
  elements.libreKeyInput.value = '';
  elements.speechRateSlider.value = 1.0;
  elements.speechRateLabel.textContent = '1.0x';
  elements.autoDebounceSlider.value = 600;
  elements.debounceLabel.textContent = '600ms';
  toggleProviderFields();
  showToast('Reset settings to defaults', 'info');
}

function initTheme() {
  const savedTheme = localStorage.getItem('polyglot_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  setTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('polyglot_theme', theme);

  if (theme === 'dark') {
    elements.themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
  } else {
    elements.themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 3000);
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}
