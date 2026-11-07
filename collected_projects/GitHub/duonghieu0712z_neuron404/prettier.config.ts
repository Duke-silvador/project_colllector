import type { Config } from 'prettier';

const config: Config = {
    endOfLine: 'lf',
    printWidth: 100,
    semi: true,
    singleQuote: true,
    jsxSingleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
    plugins: [
        'prettier-plugin-svelte',
        'prettier-plugin-packagejson',
        'prettier-plugin-tailwindcss',
    ],
    overrides: [
        { files: '*.svelte', options: { parser: 'svelte', htmlWhitespaceSensitivity: 'ignore' } },
        { files: ['*.yml', '*.yaml'], options: { tabWidth: 2 } },
    ],
    tailwindStylesheet: './src/routes/layout.css',
    tailwindFunctions: ['clsx', 'cn', 'cva', 'twMerge'],
};

export default config;
