import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Interdit à un dossier d'importer les couches listées (`react` : ni React ni zustand, logique pure).
function layer(files, forbidden, { react = false } = {}) {
  return [{
    files: [files],
    rules: {
      'no-restricted-imports': ['error', {
        ...(react ? { paths: ['react', 'react-dom', 'zustand'].map(name => ({ name, message: 'Couche sans React : logique pure uniquement.' })) } : {}),
        patterns: [{ regex: `(^|/)(${forbidden.join('|')})/`, message: `Import interdit depuis ${files.split('/')[1]}/ : dépendance vers une couche supérieure.` }]
      }]
    }
  }];
}

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules', 'test-results', 'playwright-report'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  // Fixtures Playwright : leur paramètre `use` n'est pas un hook React.
  { files: ['tests/e2e/**'], rules: { 'react-hooks/rules-of-hooks': 'off' } },
  // Couches de l'application : chaque dossier n'importe que les couches inférieures (voir CLAUDE.md).
  ...layer('src/data/**', ['domain', 'state', 'services', 'ui', 'features', 'app'], { react: true }),
  ...layer('src/lib/**', ['data', 'domain', 'state', 'services', 'ui', 'features', 'app']),
  ...layer('src/domain/**', ['state', 'services', 'ui', 'features', 'app'], { react: true }),
  ...layer('src/services/**', ['state', 'ui', 'features', 'app'], { react: true }),
  ...layer('src/state/**', ['ui', 'features', 'app']),
  ...layer('src/ui/**', ['domain', 'state', 'services', 'features', 'app']),
  ...layer('src/features/**', ['app'])
];
