import { pathToFileURL } from 'node:url';
import app from './server/index';
import { attachFrontend } from './server/http/frontend';
import { startHttpServer } from './server/http/listen';

async function startServer(): Promise<void> {
  await attachFrontend(app);
  startHttpServer(app);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url && process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('[server] failed to start:', error);
    process.exit(1);
  });
}

export default app;
