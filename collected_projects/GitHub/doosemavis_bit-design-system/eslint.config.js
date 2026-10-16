import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/** The gallery is bit's first consumer, so it must use bit's components, never the raw tags they wrap. */
const RAW_TAGS = [
  ['button', 'Use <Button> (or <Switch> / <SegmentedControl>) from @bit-ds/react.'],
  ['a', 'Use <Link> from @bit-ds/react (asChild around a router link).'],
  ['input', 'Use <Input> inside <Field> from @bit-ds/react.'],
  ['textarea', 'Use <Input> inside <Field> from @bit-ds/react.'],
  ['select', 'Use <Select> from @bit-ds/react.'],
  ['table', 'Use <Table> from @bit-ds/react.'],
  ['code', 'Use <Code> from @bit-ds/react.'],
  ['pre', 'Use <CodeBlock> from @bit-ds/react.'],
  ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => [h, 'Use <Heading> from @bit-ds/react.']),
];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '.superpowers/**', '**/*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['apps/gallery/src/**/*.tsx'],
    ignores: ['apps/gallery/src/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...RAW_TAGS.map(([tag, message]) => ({ selector: `JSXOpeningElement[name.name="${tag}"]`, message })),
      ],
    },
  },
);
