// Production entry: adapter-node's request handler plus WebSocket upgrades for terminals.
// adapter-node's own build/index.js has no upgrade hook, so we run the HTTP server here.
import { createServer } from 'node:http';

// The image's entrypoint starts us as root to give CCM_RUN_AS the Docker socket's group.
// Drop to that user before loading the app, so nothing it writes is owned by root.
const runAs = process.env.CCM_RUN_AS;
if (runAs && process.getuid?.() === 0) {
	process.initgroups(runAs, runAs);
	process.setgid(runAs);
	process.setuid(runAs);
}

const { handler } = await import('./build/handler.js');

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

const server = createServer(handler);

server.on('upgrade', (req, socket, head) => {
	// Registered by hooks.server.ts `init`, which handler.js runs before it resolves.
	const upgrade = globalThis.__ccmUpgrade;
	if (!upgrade || !req.url?.startsWith('/ws/')) {
		socket.destroy();
		return;
	}
	upgrade(req, socket, head);
});

server.listen(port, host, () => console.log(`[cc-modern] listening on http://${host}:${port}`));

let stopping = false;
function shutdown() {
	if (stopping) return;
	stopping = true;
	// Session containers keep running: terminals reattach when the app comes back.
	server.close(() => process.exit(0));
	server.closeAllConnections();
	setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
