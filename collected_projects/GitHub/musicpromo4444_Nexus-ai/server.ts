import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Live data detection helper
  function isLiveDataQuery(prompt: string): boolean {
    const p = prompt.toLowerCase();
    const livePatterns = [
      'score', 'scores', 'who won', 'game result', 'match result',
      'nba', 'nfl', 'mlb', 'nhl', 'premier league', 'la liga', 'champions league', 'super bowl', 'world cup',
      'olympics', 'standings', 'yesterday', 'tonight',
      'news', 'headline', 'headlines', 'breaking news', 'what happened',
      'current price', 'stock price', 'crypto price', 'weather', 'forecast',
      'current president', 'current prime minister', 'current ceo',
      'who is the current', 'who is currently', 'latest update',
      'recent events', 'released in 2024', 'released in 2025', 'released in 2026', 'this year', 'today'
    ];
    return livePatterns.some((pattern) => p.includes(pattern));
  }

  // Dual-Tier Execution Router / Hybrid Reasoning Endpoint
  app.post('/api/reason', async (req, res) => {
    const { prompt, deepReasoning, autoTriggered, enableSearch } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAI();

    // If Gemini key is not configured, signal client to use rich local reasoning engine
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server',
        fallbackToLocal: true,
      });
    }

    const startTime = Date.now();
    const needsSearch = Boolean(enableSearch || isLiveDataQuery(prompt));

    // Resilient generation helper: prioritizes high-availability gemini-3.1-flash-lite,
    // with silent graceful failover across models to prevent 429/503 interruptions.
    async function generateWithFallback(config: Record<string, any>) {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
      let lastError: unknown = null;

      for (const model of modelsToTry) {
        try {
          const response = await Promise.race([
            ai!.models.generateContent({ model, contents: prompt, config }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Model request timed out')), 20000)),
          ]);

          if (response && response.text) return { response, usedSearch: Boolean(config.tools) };
        } catch (error) {
          lastError = error;
        }
      }

      // Search grounding can fail independently of the model. Retry once without it.
      if (config.tools) {
        const fallbackConfig = { ...config };
        delete fallbackConfig.tools;
        for (const model of modelsToTry) {
          try {
            const response = await Promise.race([
              ai!.models.generateContent({ model, contents: prompt, config: fallbackConfig }),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Model request timed out')), 20000)),
            ]);
            if (response && response.text) return { response, usedSearch: false };
          } catch (error) {
            lastError = error;
          }
        }
      }

      throw lastError instanceof Error ? lastError : new Error('All model candidates temporarily unavailable');
    }

    try {
      if (deepReasoning) {
        // Structured Chain-of-Thought System Instruction
        const systemInstruction = `You are Nexus AI's Deep Cognitive Reasoning Engine.
The user has requested Deep Reasoning Mode.
Decompose the problem step-by-step before arriving at the conclusion.
Your response MUST be formatted strictly as follows:
<thought>
Step 1: Deconstruction & Objective: [Deconstruct the query into fundamental goals and constraints]
Step 2: Key Variables & Mechanics: [Analyze variables, edge cases, failure points, or architecture]
Step 3: Multi-Step Logical Deduction: [Work through the logic or technical solution step by step]
Step 4: Verification & Synthesis: [Verify against constraints and test assumptions]
</thought>
[Provide your clear, polished, structured markdown answer here. If code is requested, format it cleanly with syntax highlighted code blocks.]`;

        const config: Record<string, any> = {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 2500,
          ...(needsSearch ? { tools: [{ googleSearch: {} }] } : {}),
        };

        const { response } = await generateWithFallback(config);

        const rawText = response.text || '';
        const thoughtMatch = rawText.match(/<thought>([\s\S]*?)<\/thought>/i);
        let thoughts = '';
        let cleanedText = rawText;

        const reasoningSteps: Array<{ step: number; title: string; details: string; status: 'completed' }> = [];

        if (thoughtMatch) {
          thoughts = thoughtMatch[1].trim();
          cleanedText = rawText.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim();

          // Extract individual steps from thoughts
          const stepMatches = thoughts.split(/Step \d+:/i).filter((s) => s.trim().length > 0);
          stepMatches.forEach((stepContent, idx) => {
            const parts = stepContent.split(':');
            const title = parts.length > 1 ? parts[0].trim() : `Stage ${idx + 1}`;
            const details = parts.length > 1 ? parts.slice(1).join(':').trim() : stepContent.trim();
            reasoningSteps.push({
              step: idx + 1,
              title: title.length > 35 ? title.slice(0, 32) + '...' : title,
              details,
              status: 'completed',
            });
          });
        }

        // Check for code snippet
        const codeBlockMatch = cleanedText.match(/```(\w+)?\n([\s\S]*?)```/);
        let codeSnippet: { language: string; code: string } | undefined = undefined;
        if (codeBlockMatch) {
          codeSnippet = {
            language: codeBlockMatch[1] || 'typescript',
            code: codeBlockMatch[2].trim(),
          };
        }

        // Extract sources if search grounding was activated
        const sources: Array<{ title: string; url: string }> = [];
        const candidate = response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web?.uri) {
              sources.push({
                title: chunk.web.title || new URL(chunk.web.uri).hostname,
                url: chunk.web.uri,
              });
            }
          }
        }

        const latencyMs = Date.now() - startTime;
        const tokensUsed = response.usageMetadata?.totalTokenCount || (Math.floor(rawText.length / 4) + 120);

        return res.json({
          text: cleanedText || rawText,
          thoughts,
          reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined,
          effectiveTier: 'deep',
          executionTier: 'cloud',
          routeReason: needsSearch
            ? 'Cloud API: Real-Time Dynamic Knowledge + CoT'
            : 'Cloud API: Deep Cognitive Reasoning',
          sources: sources.length > 0 ? sources.slice(0, 5) : undefined,
          autoTriggered: Boolean(autoTriggered),
          latencyMs,
          tokensUsed,
          codeSnippet,
        });
      } else {
        // Fast Tier / High-Efficiency dynamic response
        const config: Record<string, any> = {
          systemInstruction:
            'You are Nexus AI running with Cloud Dynamic Inference. Provide an accurate, direct, helpful, and concise response. Never use generic canned placeholders.',
          temperature: 0.3,
          maxOutputTokens: 1200,
          ...(needsSearch ? { tools: [{ googleSearch: {} }] } : {}),
        };

        const { response } = await generateWithFallback(config);

        const latencyMs = Date.now() - startTime;
        const rawText = response.text || '';
        const tokensUsed = response.usageMetadata?.totalTokenCount || (Math.floor(rawText.length / 4) + 20);

        // Check for code snippet in fast tier as well
        const codeBlockMatch = rawText.match(/```(\w+)?\n([\s\S]*?)```/);
        let codeSnippet: { language: string; code: string } | undefined = undefined;
        if (codeBlockMatch) {
          codeSnippet = {
            language: codeBlockMatch[1] || 'typescript',
            code: codeBlockMatch[2].trim(),
          };
        }

        // Extract sources if search grounding was activated
        const sources: Array<{ title: string; url: string }> = [];
        const candidate = response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web?.uri) {
              sources.push({
                title: chunk.web.title || new URL(chunk.web.uri).hostname,
                url: chunk.web.uri,
              });
            }
          }
        }

        return res.json({
          text: rawText,
          effectiveTier: 'quick',
          executionTier: 'cloud',
          routeReason: needsSearch
            ? 'Cloud API: Real-Time Dynamic Knowledge'
            : 'Cloud API: Fast Dynamic Synthesis',
          sources: sources.length > 0 ? sources.slice(0, 5) : undefined,
          autoTriggered: false,
          latencyMs,
          tokensUsed,
          codeSnippet,
        });
      }
    } catch {
      return res.status(503).json({
        error: 'AI inference is temporarily unavailable.',
        fallbackToLocal: true,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
