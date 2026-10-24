import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Terminals talk WebSocket, which SvelteKit routes can't. In production server.js hands
 * upgrades to the handler hooks.server.ts registers; in dev this plugin does the same
 * through Vite's module graph, so both share the store and Docker client with the app.
 */
function terminalSockets(): Plugin {
	return {
		name: 'ccm-terminal-sockets',
		configureServer(server) {
			server.httpServer?.on('upgrade', async (req, socket, head) => {
				// Vite's HMR socket shares this server; only take ours.
				if (!req.url?.startsWith('/ws/')) return;
				const mod = await server.ssrLoadModule('/src/lib/server/terminal/upgrade.ts');
				mod.handleUpgrade(req, socket, head);
			});
		}
	};
}

export default defineConfig({
	// The image build passes the release version (see Dockerfile); local builds say -dev.
	define: { __APP_VERSION__: JSON.stringify(process.env.CCM_VERSION || `${pkg.version}-dev`) },
	plugins: [
		tailwindcss(),
		terminalSockets(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ out: 'build' })
		})
	]
});
