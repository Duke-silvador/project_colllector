import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/api.ts';
import { initRealtime } from './server/realtime.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isProductionMode(): boolean {
  if (process.env.NODE_ENV === 'development') return false;
  if (process.env.npm_lifecycle_event === 'dev') return false;
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.npm_lifecycle_event === 'start') return true;
  if (fs.existsSync(path.join(__dirname, 'dist', 'index.html')) && process.env.NODE_ENV !== 'development') {
    return true;
  }
  return false;
}

function resolvePort(): number {
  // 1. Explicit CLI argument takes precedence (--port 3000)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 2. Explicit custom APP_PORT
  if (process.env.APP_PORT) {
    const parsed = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 3. AI Studio internal container environment:
  // In AI Studio, Nginx listens on 8080 and proxies internal traffic to DEFAULT_APP_PORT (3000).
  // When DEFAULT_APP_PORT or NGINX_PORT is present, we must bind to 3000 to avoid EADDRINUSE on 8080.
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NGINX_PORT) {
    return 3000;
  }

  // 4. Standalone production (Cloud Run, Docker, Render, Railway, Heroku):
  // When running standalone without an internal Nginx proxy, respect the platform assigned PORT (e.g. 8080 on Cloud Run)
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Standard fallback port
  return 3000;
}

async function startServer() {
  const app = express();
  const isProd = isProductionMode();
  const PORT = resolvePort();

  // Initialize SQLite schema and initial fixtures
  initDatabase();

  // CORS and Security Middleware (ensures Preview, Shared App, and External Deployments connect)
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check endpoint for external hosts (Cloud Run, Kubernetes, Render)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ServiceHub India Marketplace',
      timestamp: new Date().toISOString(),
      environment: isProd ? 'production' : 'development',
      port: PORT,
    });
  });

  // API router mounted under /api
  app.use('/api', apiRouter);

  // Serve public static assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve image assets statically with robust directory aliases
  app.use('/src/assets', express.static(path.join(__dirname, 'src/assets')));
  app.use('/src/assets', express.static(path.join(__dirname, 'public/src/assets')));
  app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
  app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));

  // In development, mount Vite dev server middlewares
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built dist files
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ServiceHub full-stack server running on http://0.0.0.0:${PORT}`);
  });

  // Attach authenticated WebSocket server for real-time tracking
  initRealtime(server);

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

process.on('uncaughtException', (err) => {
  console.error('[ServiceHub Server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ServiceHub Server] Unhandled rejection at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
