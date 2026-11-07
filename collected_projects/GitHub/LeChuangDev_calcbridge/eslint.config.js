import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

/**
 * 全仓库统一规范（ESLint 9 flat config）。
 * 除通用 TS / React 规则外，这里用 no-restricted-imports 把分层约束固化成可执行检查：
 *   lib（基础设施）  → 不得依赖 app / features / components
 *   features（领域） → 不得依赖 app 外壳，且不横向依赖其它 feature
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/web/dist/**',
      'apps/web/offline-build/**',
      'offline/app/**',
      'build/**',
      'restructure.mjs',
      'split.mjs',
      'fiximports.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // 跨层/跨模块一律走 @/ 别名，避免 ../../.. 这类脆弱相对路径
              group: ['..\\..\\..\\*', '../../../*'],
              message: '跨三层以上的相对导入请改用 @/ 别名。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/pages/**', '@/widgets/**', '@/features/**', '@/entities/**'],
              message: 'shared 是最底层，不得依赖任何上层（app/pages/widgets/features/entities）。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/pages/**', '@/widgets/**', '@/features/**'],
              message: 'entities 只能向下依赖 shared。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/pages/**', '@/widgets/**'],
              message:
                'features 只能依赖 entities、shared 与本切片内部模块，不得引用 app/pages/widgets。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/pages/**'],
              message: 'widgets 只能依赖 features / entities / shared。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**'],
              message: 'pages 不得依赖 app 层，页面组合由 app 负责。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
  {
    // Provider 与 hook 同文件导出是 React 通用模式
    files: ['apps/web/src/shared/lib/providers/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // CLI 的输出就是产品行为
    files: ['packages/cli/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // 构建脚本运行在 Node，输出进度属于脚本行为
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { 'no-console': 'off' },
  },
  prettier,
);
