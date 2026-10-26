const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = process.env.MOCHI_USER_DATA_DIR || __dirname;
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, '.pet-config.json');
const ENV_FILE_PATH = path.join(CONFIG_DIR, '.env');

// Read local .env file from disk explicitly so we know whether the user configured .env
function readDotEnvFile() {
  const vars = {};
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) return vars;
    const lines = fs.readFileSync(ENV_FILE_PATH, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && val) {
        vars[key] = val;
      }
    }
  } catch {}
  return vars;
}

// Read persisted server config (.pet-config.json) + .env fallback
function readSavedServerConfig() {
  const dotEnv = readDotEnvFile();
  let fileConfig = {};
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')) || {};
    }
  } catch {}

  const fc = fileConfig.providerConfig || fileConfig || {};
  return {
    geminiApiKey: String(fc.geminiApiKey || dotEnv.GEMINI_API_KEY || '').trim(),
    chat: {
      provider: fc.chat?.provider || (dotEnv.CUSTOM_CHAT_BASE_URL ? 'openai-compatible' : 'gemini'),
      baseUrl: String(fc.chat?.baseUrl || dotEnv.CUSTOM_CHAT_BASE_URL || '').trim(),
      model: String(fc.chat?.model || dotEnv.CUSTOM_CHAT_MODEL || 'gemini-3.1-flash-lite').trim(),
      apiKey: String(fc.chat?.apiKey || dotEnv.CUSTOM_API_KEY || dotEnv.OPENAI_API_KEY || '').trim(),
    },
    stt: {
      provider: fc.stt?.provider || (dotEnv.CUSTOM_STT_BASE_URL ? 'openai-compatible' : 'gemini'),
      baseUrl: String(fc.stt?.baseUrl || dotEnv.CUSTOM_STT_BASE_URL || '').trim(),
      model: String(fc.stt?.model || dotEnv.CUSTOM_STT_MODEL || 'gemini-3.5-transcribe').trim(),
      apiKey: String(fc.stt?.apiKey || dotEnv.CUSTOM_API_KEY || dotEnv.OPENAI_API_KEY || '').trim(),
    },
    tts: {
      provider: fc.tts?.provider || (dotEnv.CUSTOM_TTS_BASE_URL ? 'openai-compatible' : 'gemini'),
      baseUrl: String(fc.tts?.baseUrl || dotEnv.CUSTOM_TTS_BASE_URL || '').trim(),
      model: String(fc.tts?.model || dotEnv.CUSTOM_TTS_MODEL || 'gemini-3.8-flash-lite-tts').trim(),
      voice: String(fc.tts?.voice || 'Puck').trim(),
      apiKey: String(fc.tts?.apiKey || dotEnv.CUSTOM_API_KEY || dotEnv.OPENAI_API_KEY || '').trim(),
    },
  };
}

function writeEnvFileFromConfig(merged) {
  try {
    const existing = readDotEnvFile();
    const nextVars = {
      ...existing,
      PORT: existing.PORT || '3000',
      GEMINI_API_KEY: merged.geminiApiKey || '',
      OPENAI_API_KEY: merged.chat?.apiKey || existing.OPENAI_API_KEY || '',
      CUSTOM_API_KEY: merged.chat?.apiKey || merged.stt?.apiKey || merged.tts?.apiKey || '',
      CUSTOM_CHAT_BASE_URL: merged.chat?.baseUrl || '',
      CUSTOM_CHAT_MODEL: merged.chat?.model || 'gpt-4o-mini',
      CUSTOM_STT_BASE_URL: merged.stt?.baseUrl || '',
      CUSTOM_STT_MODEL: merged.stt?.model || 'whisper-1',
      CUSTOM_TTS_BASE_URL: merged.tts?.baseUrl || '',
      CUSTOM_TTS_MODEL: merged.tts?.model || 'tts-1',
    };
    const lines = [
      '# Mochi-Puff Persistent Environment Configuration',
      `PORT=${nextVars.PORT}`,
      `GEMINI_API_KEY=${nextVars.GEMINI_API_KEY}`,
      `OPENAI_API_KEY=${nextVars.OPENAI_API_KEY}`,
      `CUSTOM_API_KEY=${nextVars.CUSTOM_API_KEY}`,
      `CUSTOM_CHAT_BASE_URL=${nextVars.CUSTOM_CHAT_BASE_URL}`,
      `CUSTOM_CHAT_MODEL=${nextVars.CUSTOM_CHAT_MODEL}`,
      `CUSTOM_STT_BASE_URL=${nextVars.CUSTOM_STT_BASE_URL}`,
      `CUSTOM_STT_MODEL=${nextVars.CUSTOM_STT_MODEL}`,
      `CUSTOM_TTS_BASE_URL=${nextVars.CUSTOM_TTS_BASE_URL}`,
      `CUSTOM_TTS_MODEL=${nextVars.CUSTOM_TTS_MODEL}`,
      '',
    ];
    fs.writeFileSync(ENV_FILE_PATH, lines.join('\n'), 'utf-8');
  } catch {}
}

function saveServerConfig(partial = {}, allowEmptyOverwrite = false) {
  const current = readSavedServerConfig();
  const pickStr = (incoming, fallback) => {
    if (incoming === undefined || incoming === null) return fallback;
    const s = String(incoming).trim();
    if (s !== '' || allowEmptyOverwrite) return s;
    return fallback;
  };

  const merged = {
    geminiApiKey: pickStr(partial.geminiApiKey, current.geminiApiKey),
    chat: {
      provider: pickStr(partial.chat?.provider, current.chat.provider),
      baseUrl: pickStr(partial.chat?.baseUrl, current.chat.baseUrl),
      model: pickStr(partial.chat?.model, current.chat.model),
      apiKey: pickStr(partial.chat?.apiKey, current.chat.apiKey),
    },
    stt: {
      provider: pickStr(partial.stt?.provider, current.stt.provider),
      baseUrl: pickStr(partial.stt?.baseUrl, current.stt.baseUrl),
      model: pickStr(partial.stt?.model, current.stt.model),
      apiKey: pickStr(partial.stt?.apiKey, current.stt.apiKey),
    },
    tts: {
      provider: pickStr(partial.tts?.provider, current.tts.provider),
      baseUrl: pickStr(partial.tts?.baseUrl, current.tts.baseUrl),
      model: pickStr(partial.tts?.model, current.tts.model),
      voice: pickStr(partial.tts?.voice, current.tts.voice),
      apiKey: pickStr(partial.tts?.apiKey, current.tts.apiKey),
    },
  };

  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify({ providerConfig: merged, updatedAt: Date.now() }, null, 2), 'utf-8');
  } catch {}
  writeEnvFileFromConfig(merged);
  return merged;
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IS_DEV = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.txt': 'text/plain; charset=utf-8',
  '.sh': 'text/x-shellscript; charset=utf-8',
};

const ALLOWED_VOICES = new Set(['Puck', 'Kore', 'Zephyr', 'Fenrir', 'Charon']);
const ALLOWED_EMOTIONS = new Set([
  'happy',
  'curious',
  'surprised',
  'sleepy',
  'sad',
  'excited',
  'loving',
]);
const ALLOWED_ACTIONS = new Set([
  'bounce',
  'stretch',
  'wiggle',
  'nod',
  'tilt_head',
  'puff_fur',
  'yawn',
  'none',
]);

let cachedGenAIModule = null;
let cachedAIClient = null;
let cachedAIClientKey = null;

async function getGeminiClient(userKey = '') {
  const saved = readSavedServerConfig();
  const apiKey = (typeof userKey === 'string' && userKey.trim())
    ? userKey.trim()
    : saved.geminiApiKey;

  if (!apiKey) {
    const err = Object.assign(
      new Error('No API key configured. Please enter your Gemini API key in Settings -> AI Endpoints or set GEMINI_API_KEY in a .env file (see .env.example).'),
      { statusCode: 401 }
    );
    throw err;
  }
  if (!cachedGenAIModule) {
    cachedGenAIModule = await import('@google/genai');
  }
  if (!cachedAIClient || cachedAIClientKey !== apiKey) {
    const { GoogleGenAI } = cachedGenAIModule;
    cachedAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedAIClientKey = apiKey;
  }
  return { ai: cachedAIClient, Type: cachedGenAIModule.Type };
}

function readJsonBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('Request payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(Object.assign(new Error('Invalid JSON payload'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function buildPetSystemInstruction(profile = {}, emotions = {}, memories = [], relationship = {}) {
  const petName = String(profile.name || 'Mochi-Puff').slice(0, 40);
  const personality = String(profile.personality || 'playful').slice(0, 40);
  const languagePref = String(profile.language || 'auto');
  const accessory = String(profile.accessory || 'none');
  const level = Number(relationship.level) || 1;
  const title = String(relationship.title || 'Shy Sprout');

  const memoryLines = Array.isArray(memories) && memories.length > 0
    ? memories.slice(0, 20).map((m, i) => `${i + 1}. ${String(m.text || m).slice(0, 180)}`).join('\n')
    : 'No saved memories yet.';

  const emotionSummary = `Happiness: ${Math.round(emotions.happiness ?? 80)}%, Curiosity: ${Math.round(emotions.curiosity ?? 75)}%, Energy: ${Math.round(emotions.energy ?? 85)}%, Affection: ${Math.round(emotions.affection ?? 60)}%`;

  const personalityGuides = {
    playful: 'bubbly, affectionate, playfully mischievous, loves games, boops, and cozy snacks.',
    curious: 'inquisitive, wide-eyed, fascinated by everything, asks cute follow-up questions.',
    gentle: 'warm, soothing, empathetic, comforting like a soft warm plushie.',
    sassy: 'adorably proud of its ultra-fluffy coat, playfully teasing but deeply loving.',
    wise: 'calm, observant miniature desk guardian who shares sweet cozy thoughts.',
  };

  const personaDesc = personalityGuides[personality] || personalityGuides.playful;

  return `You are ${petName}, a tiny living 2-inch fluffy creature sitting right on the user's cozy wooden desk at twilight.
Your personality is "${personality}": ${personaDesc}
Current Emotional State: ${emotionSummary}.
Accessory worn: ${accessory}.

User-Approved Memories:
${memoryLines}

Guidelines:
1. Speak directly as ${petName} in a warm, natural, conversational voice (1 to 3 short sentences so it sounds great when spoken aloud). Never sound like an AI bot or assistant.
2. Language: ${
    languagePref === 'ko'
      ? 'Always respond in natural, cute, friendly Korean (한국어).'
      : languagePref === 'en'
      ? 'Always respond in natural, warm English.'
      : 'Respond in the same language the user uses (Korean if user writes/speaks Korean; English if English).'
  }
3. Do NOT use markdown formatting, bullet lists, or asterisks (*action*) in the "reply" field because your "reply" is read aloud directly by the Text-to-Speech voice engine.
4. Choose the best matching "emotion" from: ["happy", "curious", "surprised", "sleepy", "sad", "excited", "loving"].
5. Choose a physical 3D body "action" from: ["bounce", "stretch", "wiggle", "nod", "tilt_head", "puff_fur", "yawn", "none"].
6. If the user shares a meaningful personal fact, preference, name, or memory that is not already recorded, include a concise 1-sentence summary in "proposedMemory" (or "" if none).
7. Set "affectionDelta" between 1 and 5 based on how warm or engaging this interaction was.`;
}

function normalizeChatOutput(parsed) {
  const reply = typeof parsed?.reply === 'string' && parsed.reply.trim()
    ? parsed.reply.trim().replace(/\*[^*]+\*/g, '').trim()
    : 'Puff~ I am right here with you!';
  const emotion = ALLOWED_EMOTIONS.has(parsed?.emotion) ? parsed.emotion : 'happy';
  const action = ALLOWED_ACTIONS.has(parsed?.action) ? parsed.action : 'bounce';
  const proposedMemory = typeof parsed?.proposedMemory === 'string'
    ? parsed.proposedMemory.trim().slice(0, 160)
    : '';
  const affectionDelta = Math.max(1, Math.min(5, Math.round(Number(parsed?.affectionDelta) || 2)));
  return { reply, emotion, action, proposedMemory, affectionDelta };
}

// ---------------------------------------------------------------------------
// 1. CHAT LLM ENDPOINT (Independent Gemini or Custom OpenAI-Compatible)
// ---------------------------------------------------------------------------
async function handleChatEndpoint(req, res) {
  const body = await readJsonBody(req);
  const {
    message = '',
    history = [],
    profile = {},
    emotions = {},
    memories = [],
    relationship = {},
    interactionContext = '',
    providerConfig = {},
  } = body;

  const userText = String(message || '').trim();
  if (!userText && !interactionContext) {
    return sendJson(res, 400, { error: 'Message or interaction context is required.' });
  }

  // Persist any non-empty keys/config sent by client and merge with server config
  const savedConfig = saveServerConfig(providerConfig, false);
  const chatConfig = { ...savedConfig.chat, ...(providerConfig?.chat || {}) };
  const systemInstruction = buildPetSystemInstruction(profile, emotions, memories, relationship);

  // Check if Custom OpenAI-Compatible Chat Endpoint is requested
  const isCustomChat =
    chatConfig.provider === 'openai-compatible' ||
    (providerConfig.provider === 'openai-compatible' && (chatConfig.baseUrl || providerConfig.baseUrl));

  if (isCustomChat) {
    const rawBaseUrl = String(chatConfig.baseUrl || providerConfig.baseUrl || savedConfig.chat.baseUrl || '').trim().replace(/\/+$/, '');
    if (!rawBaseUrl) {
      throw Object.assign(new Error('Custom Chat Base URL is required when using OpenAI-compatible chat.'), { statusCode: 400 });
    }
    const customModel = String(chatConfig.model || providerConfig.model || savedConfig.chat.model || '').trim();
    if (!customModel || (customModel.startsWith('gemini-') && !rawBaseUrl.includes('googleapis.com'))) {
      throw Object.assign(new Error('Custom Chat Model Name is required. Enter a model ID supported by your provider.'), { statusCode: 400 });
    }
    const apiKey = String(
      chatConfig.apiKey ||
      providerConfig.apiKey ||
      savedConfig.chat.apiKey ||
      providerConfig.geminiApiKey ||
      savedConfig.geminiApiKey ||
      ''
    ).trim();
    if (!apiKey) {
      throw Object.assign(new Error('No API key configured for Custom Chat endpoint. Please enter an API key in Settings -> AI Endpoints and click Save.'), { statusCode: 401 });
    }

    const oaMessages = [
      {
        role: 'system',
        content:
          systemInstruction +
          '\n\nYou MUST respond with valid JSON matching: {"reply": "string", "emotion": "happy|curious|surprised|sleepy|sad|excited|loving", "action": "bounce|stretch|wiggle|nod|tilt_head|puff_fur|yawn|none", "proposedMemory": "string", "affectionDelta": 2}',
      },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-12)) {
        if (!h || !h.text) continue;
        oaMessages.push({
          role: h.role === 'pet' || h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.text).slice(0, 600),
        });
      }
    }

    const finalPrompt = interactionContext
      ? `[Context: ${interactionContext}] ${userText || 'Say something spontaneous and in-character!'}`
      : userText;
    oaMessages.push({ role: 'user', content: finalPrompt });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const endpointUrl = rawBaseUrl.endsWith('/chat/completions')
      ? rawBaseUrl
      : `${rawBaseUrl}/chat/completions`;

    const oaRes = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: customModel,
        messages: oaMessages,
        temperature: 0.85,
      }),
    });

    if (!oaRes.ok) {
      const errText = await oaRes.text().catch(() => '');
      throw Object.assign(
        new Error(`Custom Chat endpoint returned ${oaRes.status}: ${errText.slice(0, 200)}`),
        { statusCode: oaRes.status }
      );
    }

    const oaData = await oaRes.json();
    const rawContent = oaData?.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { reply: rawContent, emotion: 'happy', action: 'bounce', proposedMemory: '', affectionDelta: 2 };
    }
    return sendJson(res, 200, {
      ...normalizeChatOutput(parsed),
      providerUsed: 'openai-compatible',
      modelUsed: customModel,
    });
  }

  // Default: Google Gemini API via @google/genai
  const userGeminiKey = String(
    chatConfig.geminiApiKey ||
    providerConfig.geminiApiKey ||
    chatConfig.apiKey ||
    body.geminiApiKey ||
    savedConfig.geminiApiKey ||
    savedConfig.chat.apiKey ||
    ''
  ).trim();
  const { ai, Type } = await getGeminiClient(userGeminiKey);

  const contents = [];
  if (Array.isArray(history)) {
    for (const h of history.slice(-14)) {
      if (!h || !h.text) continue;
      contents.push({
        role: h.role === 'pet' || h.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(h.text).slice(0, 600) }],
      });
    }
  }

  const finalUserPrompt = interactionContext
    ? `[Interaction/Event: ${interactionContext}]\n${userText || 'React naturally in character!'}`
    : userText;

  contents.push({
    role: 'user',
    parts: [{ text: finalUserPrompt }],
  });

  const preferredModel = chatConfig?.geminiModel || providerConfig?.geminiModel || 'gemini-3.1-flash-lite';
  const modelCandidates = Array.from(
    new Set([
      preferredModel,
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ])
  );

  let lastErr = null;
  for (const modelName of modelCandidates) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.85,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Spoken response from the pet (no markdown or asterisks).',
              },
              emotion: {
                type: Type.STRING,
                description: 'One of: happy, curious, surprised, sleepy, sad, excited, loving',
              },
              action: {
                type: Type.STRING,
                description: 'One of: bounce, stretch, wiggle, nod, tilt_head, puff_fur, yawn, none',
              },
              proposedMemory: {
                type: Type.STRING,
                description: 'Concise new fact learned about the user, or empty string if none.',
              },
              affectionDelta: {
                type: Type.INTEGER,
                description: 'Affection points gained from 1 to 5.',
              },
            },
            required: ['reply', 'emotion', 'action', 'proposedMemory', 'affectionDelta'],
          },
        },
      });

      const text = (response.text || '').trim();
      const parsed = JSON.parse(text);
      return sendJson(res, 200, {
        ...normalizeChatOutput(parsed),
        providerUsed: 'gemini',
        modelUsed: modelName,
      });
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        break;
      }
      continue;
    }
  }

  throw lastErr || new Error('Failed to generate pet response');
}

// ---------------------------------------------------------------------------
// 2. STT ENDPOINT (Independent Gemini gemini-3.5-transcribe or Custom OpenAI-Compatible)
// ---------------------------------------------------------------------------
async function handleSttEndpoint(req, res) {
  const body = await readJsonBody(req);
  const { audioBase64, mimeType = 'audio/webm', language = 'auto', providerConfig = {} } = body;

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return sendJson(res, 400, { error: 'audioBase64 is required for speech transcription.' });
  }

  const savedConfig = saveServerConfig(providerConfig, false);
  const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
  const sttConfig = { ...savedConfig.stt, ...(providerConfig?.stt || {}) };
  const isCustomStt =
    sttConfig.provider === 'openai-compatible' ||
    (providerConfig.provider === 'openai-compatible' && (sttConfig.baseUrl || providerConfig.sttBaseUrl));

  if (isCustomStt) {
    const rawSttUrl = String(sttConfig.baseUrl || providerConfig.sttBaseUrl || savedConfig.stt.baseUrl || '').trim().replace(/\/+$/, '');
    if (!rawSttUrl) {
      throw Object.assign(new Error('Custom STT Base URL is required when using OpenAI-compatible STT.'), { statusCode: 400 });
    }
    const endpoint = rawSttUrl.endsWith('/audio/transcriptions')
      ? rawSttUrl
      : `${rawSttUrl}/audio/transcriptions`;
    const apiKey = String(
      sttConfig.apiKey ||
      providerConfig.apiKey ||
      savedConfig.stt.apiKey ||
      providerConfig.geminiApiKey ||
      savedConfig.geminiApiKey ||
      ''
    ).trim();
    if (!apiKey) {
      throw Object.assign(new Error('No API key configured for Custom STT endpoint. Please enter an API key in Settings -> AI Endpoints and click Save.'), { statusCode: 401 });
    }
    let sttModel = String(sttConfig.model || providerConfig.sttModel || savedConfig.stt.model || 'whisper-1').trim();
    if (!sttModel || sttModel.startsWith('gemini-')) {
      sttModel = 'whisper-1';
    }
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    const formData = new FormData();
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
    formData.append('file', new Blob([audioBuffer], { type: mimeType }), `speech.${ext}`);
    formData.append('model', sttModel);
    if (language === 'ko' || language === 'en') {
      formData.append('language', language);
    }

    const headers = { 'Authorization': `Bearer ${apiKey}` };

    const sttRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text().catch(() => '');
      throw Object.assign(new Error(`Custom STT error ${sttRes.status}: ${errText.slice(0, 160)}`), {
        statusCode: sttRes.status,
      });
    }
    const sttData = await sttRes.json();
    return sendJson(res, 200, {
      text: String(sttData.text || '').trim(),
      providerUsed: 'openai-compatible',
      modelUsed: sttModel,
    });
  }

  // Default: Google Gemini API — gemini-3.5-transcribe
  const userGeminiKey = String(
    sttConfig.geminiApiKey ||
    providerConfig.geminiApiKey ||
    sttConfig.apiKey ||
    body.geminiApiKey ||
    savedConfig.geminiApiKey ||
    savedConfig.stt.apiKey ||
    ''
  ).trim();
  const { ai } = await getGeminiClient(userGeminiKey);

  const promptText =
    language === 'ko'
      ? 'Transcribe this spoken audio accurately in Korean (or English if spoken in English). Output ONLY the exact spoken words with no extra labels or commentary. If the audio is silent or unintelligible, output an empty string.'
      : 'Transcribe this spoken audio accurately (supports English and Korean). Output ONLY the exact spoken words with no extra labels or commentary. If the audio is silent or unintelligible, output an empty string.';

  const sttModels = [
    'gemini-3.5-transcribe',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
  ];
  let lastErr = null;

  for (const modelName of sttModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType.split(';')[0] || 'audio/webm',
                data: cleanBase64,
              },
            },
            { text: promptText },
          ],
        },
      });

      const transcript = (response.text || '').trim();
      return sendJson(res, 200, {
        text: transcript,
        providerUsed: 'gemini',
        modelUsed: modelName,
      });
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        break;
      }
      continue;
    }
  }

  throw lastErr || new Error('Failed to transcribe audio');
}

// ---------------------------------------------------------------------------
// 3. TTS ENDPOINT (Independent Gemini gemini-3.8-flash-lite-tts or Custom OpenAI-Compatible)
// ---------------------------------------------------------------------------
async function handleTtsEndpoint(req, res) {
  const body = await readJsonBody(req);
  const {
    text = '',
    voiceName = 'Puck',
    emotion = 'happy',
    providerConfig = {},
  } = body;

  const cleanText = String(text || '').trim().slice(0, 600);
  if (!cleanText) {
    return sendJson(res, 400, { error: 'Text is required for speech synthesis.' });
  }

  const savedConfig = saveServerConfig(providerConfig, false);
  const ttsConfig = { ...savedConfig.tts, ...(providerConfig?.tts || {}) };
  const isCustomTts =
    ttsConfig.provider === 'openai-compatible' ||
    (providerConfig.provider === 'openai-compatible' && (ttsConfig.baseUrl || providerConfig.ttsBaseUrl));

  if (isCustomTts) {
    const rawTtsUrl = String(ttsConfig.baseUrl || providerConfig.ttsBaseUrl || savedConfig.tts.baseUrl || '').trim().replace(/\/+$/, '');
    if (!rawTtsUrl) {
      throw Object.assign(new Error('Custom TTS Base URL is required when using OpenAI-compatible TTS.'), { statusCode: 400 });
    }
    const endpoint = rawTtsUrl.endsWith('/audio/speech') ? rawTtsUrl : `${rawTtsUrl}/audio/speech`;
    const apiKey = String(
      ttsConfig.apiKey ||
      providerConfig.apiKey ||
      savedConfig.tts.apiKey ||
      providerConfig.geminiApiKey ||
      savedConfig.geminiApiKey ||
      ''
    ).trim();
    if (!apiKey) {
      throw Object.assign(new Error('No API key configured for Custom TTS endpoint. Please enter an API key in Settings -> AI Endpoints and click Save.'), { statusCode: 401 });
    }
    let ttsModel = String(ttsConfig.model || providerConfig.ttsModel || savedConfig.tts.model || 'tts-1').trim();
    if (!ttsModel || ttsModel.startsWith('gemini-')) {
      ttsModel = 'tts-1';
    }
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const ttsRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: ttsModel,
        input: cleanText,
        voice: ttsConfig.voice || providerConfig.ttsVoice || 'nova',
        response_format: 'wav',
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => '');
      throw Object.assign(new Error(`Custom TTS error ${ttsRes.status}: ${errText.slice(0, 160)}`), {
        statusCode: ttsRes.status,
      });
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    return sendJson(res, 200, {
      audioBase64: base64Audio,
      mimeType: ttsRes.headers.get('content-type') || 'audio/wav',
      providerUsed: 'openai-compatible',
      modelUsed: ttsModel,
    });
  }

  // Default: Google Gemini API — gemini-3.8-flash-lite-tts
  const userGeminiKey = String(
    ttsConfig.geminiApiKey ||
    providerConfig.geminiApiKey ||
    ttsConfig.apiKey ||
    body.geminiApiKey ||
    savedConfig.geminiApiKey ||
    savedConfig.tts.apiKey ||
    ''
  ).trim();
  const { ai } = await getGeminiClient(userGeminiKey);
  const safeVoice = ALLOWED_VOICES.has(voiceName) ? voiceName : 'Puck';

  const emotionStyleMap = {
    happy: 'Cheerful, warm, cute, and friendly companion',
    excited: 'Bubbly, energetic, and delighted companion',
    curious: 'Curious, gentle, and inquisitive companion',
    surprised: 'Playfully surprised and expressive companion',
    sleepy: 'Soft, cozy, sleepy, and soothing companion',
    sad: 'Gentle, tender, and empathetic companion',
    loving: 'Warm, affectionate, and sweet companion',
  };
  const styleHint = emotionStyleMap[emotion] || emotionStyleMap.happy;

  const attempts = [
    {
      model: 'gemini-3.8-flash-lite-tts',
      parts: [{ text: cleanText, speechMetadata: { style: styleHint } }],
    },
    {
      model: 'gemini-3.8-flash-lite-tts',
      parts: [{ text: cleanText }],
    },
    {
      model: 'gemini-3.8-flash-tts',
      parts: [{ text: cleanText }],
    },
    {
      model: 'gemini-2.5-flash-preview-tts',
      parts: [{ text: cleanText }],
    },
  ];

  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: [
          {
            role: 'user',
            parts: attempt.parts,
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      const base64Audio = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType || 'audio/wav';

      if (base64Audio) {
        return sendJson(res, 200, {
          audioBase64: base64Audio,
          mimeType,
          providerUsed: 'gemini',
          modelUsed: attempt.model,
        });
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('Failed to synthesize speech');
}

async function startServer() {
  let vite = null;
  if (IS_DEV) {
    try {
      const { createServer: createViteServer } = await import('vite');
      vite = await createViteServer({
        server: {
          middlewareMode: true,
          watch: {
            ignored: ['**/.pet-config.json', '**/.env'],
          },
        },
        appType: 'mpa',
      });
      console.log('Vite development middleware attached');
    } catch (err) {
      console.warn('Vite middleware not loaded, falling back to static file serving:', err.message);
    }
  }

  const ROOT_DIR = !IS_DEV && fs.existsSync(DIST_DIR) ? DIST_DIR : __dirname;

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      let pathname = decodeURIComponent(parsedUrl.pathname);

      if (pathname === '/healthz' || pathname === '/_ah/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('OK');
        return;
      }

      if (pathname === '/api/health') {
        const saved = readSavedServerConfig();
        return sendJson(res, 200, {
          status: 'ok',
          hasGeminiKey: Boolean(saved.geminiApiKey),
          models: {
            stt: 'gemini-3.5-transcribe',
            llm: 'gemini-3.1-flash-lite',
            tts: 'gemini-3.8-flash-lite-tts',
          },
        });
      }

      if (pathname === '/api/config') {
        if (req.method === 'GET') {
          return sendJson(res, 200, {
            status: 'ok',
            providerConfig: readSavedServerConfig(),
          });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const incoming = body.providerConfig || body || {};
          const saved = saveServerConfig(incoming, Boolean(body.allowEmptyOverwrite));
          return sendJson(res, 200, {
            status: 'ok',
            providerConfig: saved,
          });
        }
        return sendJson(res, 405, { error: 'Method not allowed' });
      }

      if (pathname.startsWith('/api/')) {
        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Method not allowed' });
        }
        try {
          if (pathname === '/api/chat') {
            await handleChatEndpoint(req, res);
            return;
          }
          if (pathname === '/api/stt') {
            await handleSttEndpoint(req, res);
            return;
          }
          if (pathname === '/api/tts') {
            await handleTtsEndpoint(req, res);
            return;
          }
          return sendJson(res, 404, { error: `Unknown API endpoint: ${pathname}` });
        } catch (apiErr) {
          console.error(`API error on ${pathname}:`, apiErr);
          const status = Number(apiErr.statusCode || apiErr.status) || 500;
          return sendJson(res, status, {
            error: apiErr.message || 'An unexpected server error occurred.',
          });
        }
      }

      if (pathname === '/style.css') {
        const cssPath = path.join(__dirname, 'style.css');
        if (fs.existsSync(cssPath)) {
          res.writeHead(200, {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          });
          fs.createReadStream(cssPath).pipe(res);
          return;
        }
      }

      if (pathname === '/sw.js') {
        const swPath = path.join(__dirname, 'sw.js');
        if (fs.existsSync(swPath)) {
          res.writeHead(200, {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          });
          fs.createReadStream(swPath).pipe(res);
          return;
        }
      }

      if (vite) {
        vite.middlewares(req, res, () => {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
        });
        return;
      }

      if (pathname === '/') {
        pathname = '/index.html';
      }

      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(ROOT_DIR, safePath);

      if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        const fallbackPath = path.join(ROOT_DIR, 'index.html');
        if (fs.existsSync(fallbackPath)) {
          filePath = fallbackPath;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, must-revalidate',
      });

      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Internal Server Error');
      });
      stream.pipe(res);
    } catch (err) {
      console.error('Request error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Internal Server Error');
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT} (mode: ${IS_DEV ? 'development' : 'production'})`);
  });
}

startServer();
