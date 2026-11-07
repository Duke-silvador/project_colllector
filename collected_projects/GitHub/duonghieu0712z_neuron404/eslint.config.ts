import path from 'node:path';

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
    includeIgnoreFile(gitignorePath),
    { ignores: ['.claude/**'] },
    js.configs.recommended,
    ts.configs.recommended,
    svelte.configs.recommended,
    prettier,
    svelte.configs.prettier,
    {
        plugins: { perfectionist },
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        rules: {
            // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
            // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
            'no-undef': 'off',
            curly: ['error', 'all'],
            'no-nested-ternary': 'error',

            'perfectionist/sort-imports': [
                'error',
                {
                    newlinesBetween: 1,
                    customGroups: [{ groupName: 'environment', elementNamePattern: '^\\./env$' }],
                    groups: [
                        'environment',
                        'type-import',
                        'value-builtin',
                        'value-external',
                        'value-internal',
                        ['value-parent', 'value-sibling', 'value-index'],
                        'side-effect-style',
                        'style',
                        'side-effect',
                        'unknown',
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
            },
        },
    },
    {
        // shadcn-svelte generated primitives forward an arbitrary `href` prop and can't know
        // whether it's an internal route, so they can't call resolve() themselves.
        files: ['src/lib/components/ui/**'],
        rules: {
            'svelte/no-navigation-without-resolve': 'off',
        },
    },
    {
        files: ['src/routes/neurons/+page.svelte'],
        rules: {
            'svelte/no-navigation-without-resolve': ['error', { ignoreGoto: true }],
        },
    },
);
