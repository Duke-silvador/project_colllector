import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Lets `npm run dev` answer /api/chat locally (on Vercel the api/ folder runs by itself).
// Put your key in a file called .env.local:  ANTHROPIC_API_KEY=sk-ant-your-key
function localApi(env) {
  return {
    name: 'local-api',
    configureServer(server) {
      for (const [k, v] of Object.entries(env)) if (k.startsWith('ANTHROPIC_')) process.env[k] = v;
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/chat.js');
          return await mod.default(req, res);
        } catch (e) {
          console.error('[api/chat]', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Local API error: ' + (e && e.message ? e.message : e) }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // reads .env / .env.local
  return {
    plugins: [react(), localApi(env)],
    base: './'
  };
});
