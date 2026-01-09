import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: "Use DateTime from '@/app/lib/datetime' instead of native Date. See docs/LIBRARY_AUDIT.md for details.",
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Use DateTime.now() or DateTime.fromISO() from '@/app/lib/datetime' instead of new Date()",
        },
        {
          selector: "CallExpression[callee.object.name='Date']",
          message: "Use DateTime from '@/app/lib/datetime' instead of Date static methods",
        },
        {
          selector: "MemberExpression[object.name='Date']",
          message: "Use DateTime from '@/app/lib/datetime' instead of Date properties",
        },
      ],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'luxon',
              message: "Import from '@/app/lib/datetime' instead of 'luxon' directly to ensure consistent configuration",
            },
          ],
        },
      ],
    },
  }
);
