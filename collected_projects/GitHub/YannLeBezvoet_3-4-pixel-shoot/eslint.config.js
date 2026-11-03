// ESLint configuration. Module boundary rules are derived from each package's
// package.json, so the dependency table in docs/ARCHITECTURE.md §4 has a single
// source of truth: the declared dependencies.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import pixelShoot from './tools/eslint/no-literal-ui-text.js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

/** Workspace folders whose code must run unchanged in the browser and in Node. */
const AGNOSTIC_ROOTS = ['packages'];

/** Imports that tie code to a platform or to the presentation layer. */
const PLATFORM_MODULES = [
  'node:*',
  ...[
    'fs',
    'path',
    'os',
    'url',
    'crypto',
    'child_process',
    'worker_threads',
    'http',
    'https',
    'net',
  ].flatMap((name) => [name, `${name}/*`]),
];
const PRESENTATION_MODULES = [
  'pixi.js',
  'pixi.js/*',
  'preact',
  'preact/*',
  '@preact/*',
  'i18next',
  'vite',
  'ws',
];

function readWorkspaces() {
  const result = [];
  for (const root of ['packages', 'apps']) {
    for (const name of readdirSync(root)) {
      const manifest = `${root}/${name}/package.json`;
      if (existsSync(manifest))
        result.push({ dir: `${root}/${name}`, pkg: JSON.parse(readFileSync(manifest, 'utf8')) });
    }
  }
  const tools = JSON.parse(readFileSync('tools/package.json', 'utf8'));
  result.push({ dir: 'tools', pkg: tools });
  return result;
}

const workspaces = readWorkspaces();
const projectPackages = workspaces.map((w) => w.pkg.name);

/** Patterns shared by every area: no deep imports into another package. */
const commonPatterns = [
  {
    group: ['@pixel-shoot/*/*'],
    message: 'Import other packages through their public entry point only (src/index.ts).',
  },
];

/**
 * Test files may use Node (to read fixtures) and the packages declared as devDependencies
 * (e.g. modes are tested inside a match host); the code they test may not.
 */
function restrictionsFor({ dir, pkg }, { tests = false } = {}) {
  const allowed = new Set([
    pkg.name,
    ...Object.keys(pkg.dependencies ?? {}),
    ...(tests ? Object.keys(pkg.devDependencies ?? {}) : []),
  ]);
  const forbiddenPackages = projectPackages.filter((name) => !allowed.has(name));
  const paths = forbiddenPackages.map((name) => ({
    name,
    message: `${pkg.name} may not depend on ${name}. Allowed dependencies are declared in ${dir}/package.json and docs/ARCHITECTURE.md §4.`,
  }));
  const patterns = [...commonPatterns];
  if (AGNOSTIC_ROOTS.some((root) => dir.startsWith(`${root}/`))) {
    patterns.push({
      group: tests ? PRESENTATION_MODULES : [...PLATFORM_MODULES, ...PRESENTATION_MODULES],
      message: `${pkg.name} is platform-agnostic: it must not use Node, browser or presentation libraries (docs/ARCHITECTURE.md §4).`,
    });
  }
  return ['error', { paths, patterns }];
}

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-types/**',
      '**/coverage/**',
      'schemas/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.es2023 } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  ...workspaces.flatMap((workspace) => [
    {
      files: [`${workspace.dir}/**/*.{ts,tsx,js}`],
      rules: { 'no-restricted-imports': restrictionsFor(workspace) },
    },
    {
      files: [`${workspace.dir}/**/*.test.{ts,tsx}`],
      rules: { 'no-restricted-imports': restrictionsFor(workspace, { tests: true }) },
    },
  ]),
  {
    // PixiJS stays inside the render folder so a renderer upgrade touches one place (decision 0003).
    files: ['apps/client/src/**/*.{ts,tsx}'],
    ignores: ['apps/client/src/render/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictionsFor(workspaces.find((w) => w.dir === 'apps/client'))[1].paths,
          patterns: [
            ...commonPatterns,
            {
              group: ['pixi.js', 'pixi.js/*'],
              message: 'Only apps/client/src/render may import PixiJS (decision 0003).',
            },
            {
              group: PLATFORM_MODULES,
              message: 'Client code runs in the browser: Node modules are not available.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/client/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: [
      'tools/**/*.{ts,js}',
      'apps/server/**/*.ts',
      '*.config.{js,ts}',
      'apps/client/vite/**/*.ts',
      'apps/client/*.config.ts',
      'apps/client/e2e/**/*.ts',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // No displayed text in code (decision 0009): interface text comes from translation keys.
    files: ['apps/client/src/ui/**/*.tsx', 'apps/client/src/dev/**/*.tsx'],
    plugins: { 'pixel-shoot': pixelShoot },
    rules: { 'pixel-shoot/no-literal-ui-text': 'error' },
  },
  prettier,
);
