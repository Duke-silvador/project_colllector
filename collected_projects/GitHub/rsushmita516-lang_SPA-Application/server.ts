import 'dotenv/config';
import express, { Request, Response } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, getMongoClient } from './server/db.js';
import { seedDatabase } from './server/seed.js';
import { verifyCsrf } from './server/middleware.js';
import authRoutes from './server/routes/auth.routes.js';
import userRoutes from './server/routes/user.routes.js';
import recordRoutes from './server/routes/record.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Initialize MongoDB and seed if needed
  await getDb();
  await seedDatabase(false);

  // 2. Body parsing and cookies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 3. CORS configuration (for any client-server decoupling)
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // 4. Session management with MongoDB store
  app.use(
    session({
      name: 'user_portal_sid',
      secret: process.env.SESSION_SECRET || 'access-portal-secure-secret-key-2026',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: getMongoClient(),
        dbName: 'user_access_portal',
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60, // 14 days
      }),
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // 5. CSRF verification on mutating API routes
  app.use('/api', verifyCsrf);

  // 6. API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/records', recordRoutes);

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 7. Static / Vite Middleware serving
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 8. Start listening
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] User Access Portal server running on http://0.0.0.0:${PORT}`);
  });

  return { app, server };
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
