import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

const DEFAULT_EXPORT_WHITELIST = [
  'App.tsx',
  'components/PianoDisplay.tsx',
  'components/StaffDisplay.tsx',
  'features/ai/AiCoachPanel.tsx',
  'features/controls/TopBar.tsx',
  'features/practice/PracticeArea.tsx',
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '.github', 'scripts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
      import: importPlugin,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-compiler/react-compiler': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      complexity: ['error', { max: 15 }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'import/no-default-export': 'error',
      'import/no-relative-packages': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: DEFAULT_EXPORT_WHITELIST,
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/*.config.{ts,tsx}', 'vite.config.ts', 'vitest.config.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/contexts/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['packages/*/src/model/**/*.{ts,tsx}', 'packages/*/src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Feature models must remain independent of React.' },
            { name: 'react-dom', message: 'Feature models must remain independent of React.' },
            { name: 'zustand', message: 'Feature models own state transitions directly.' },
          ],
          patterns: [
            {
              group: ['@sentry/*', '@passwordless-id/*'],
              message: 'Use an injected port outside the feature model.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Move browser access to an adapter.' },
        { name: 'document', message: 'Move browser access to an adapter.' },
        { name: 'navigator', message: 'Move browser access to an adapter.' },
        { name: 'fetch', message: 'Inject a network port.' },
        { name: 'localStorage', message: 'Inject a storage port.' },
        { name: 'sessionStorage', message: 'Inject a storage port.' },
        { name: 'setTimeout', message: 'Return a typed effect and inject a scheduler.' },
        { name: 'clearTimeout', message: 'Return a typed effect and inject a scheduler.' },
        { name: 'setInterval', message: 'Return a typed effect and inject a scheduler.' },
        { name: 'clearInterval', message: 'Return a typed effect and inject a scheduler.' },
        { name: 'crypto', message: 'Inject an identifier or randomness port.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Inject a clock.' },
        { object: 'Math', property: 'random', message: 'Inject a random source.' },
        { object: 'performance', property: 'now', message: 'Inject a clock.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'JSXElement', message: 'Feature models cannot render UI.' },
        { selector: 'JSXFragment', message: 'Feature models cannot render UI.' },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Inject a clock instead of reading the current time.',
        },
        {
          selector: "CallExpression[callee.name='Date'][arguments.length=0]",
          message: 'Inject a clock instead of reading the current time.',
        },
      ],
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      complexity: 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['e2e/fixtures/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-invalid-void-type': 'off',
      'no-empty-pattern': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  prettier
);
