import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: ['dist/**', 'coverage/**', 'bun.lock', 'pnpm-lock.yaml', 'LICENSE'],
  trailingComma: 'all',
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  printWidth: 100,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  jsxSingleQuote: false,
  sortPackageJson: true,
});
