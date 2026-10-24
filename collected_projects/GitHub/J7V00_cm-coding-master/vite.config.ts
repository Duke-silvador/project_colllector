import { defineConfig } from "vite";
import { resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";

const root = dirname(fileURLToPath(import.meta.url));

const pages = [
  "index",
  "about",
  "contact",
  "download",
  "admin",
  "welcome",
  "editor",
];

// Build the website pages at dist/ and the desktop pages at dist/html/.
const inputs = Object.fromEntries([
  ...pages
    .filter((name) => existsSync(resolve(root, `${name}.html`)))
    .map((name) => [name, resolve(root, `${name}.html`)]),
  ...pages
    .filter((name) => existsSync(resolve(root, "html", `${name}.html`)))
    .map((name) => [`html/${name}`, resolve(root, "html", `${name}.html`)]),
]);

function copyLegacyRuntimeScripts() {
  return {
    name: "copy-legacy-runtime-scripts",
    closeBundle() {
      const sourceRoot = resolve(root, "html");
      const outputRoot = resolve(root, "dist", "html");
      if (!existsSync(sourceRoot)) return;

      function walk(sourceDir) {
        for (const entry of readdirSync(sourceDir)) {
          const source = resolve(sourceDir, entry);
          const info = statSync(source);

          if (info.isDirectory()) {
            walk(source);
            continue;
          }

          // Classic scripts are intentionally kept as standalone files because
          // the legacy HTML pages load them without type="module".
          if (!entry.toLowerCase().endsWith(".js")) continue;

          const relativePath = relative(sourceRoot, source);
          const destination = resolve(outputRoot, relativePath);
          mkdirSync(dirname(destination), { recursive: true });
          copyFileSync(source, destination);
        }
      }

      walk(sourceRoot);
    },
  };
}

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [copyLegacyRuntimeScripts()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: inputs,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
