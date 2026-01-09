// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: "Use DateTime from 'src/lib/datetime' instead of native Date.",
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Use DateTime.now() or fromISO() from 'src/lib/datetime' instead of new Date()",
        },
        {
          selector: "CallExpression[callee.object.name='Date']",
          message: "Use DateTime from 'src/lib/datetime' instead of Date static methods",
        },
        {
          selector: "MemberExpression[object.name='Date']",
          message: "Use DateTime from 'src/lib/datetime' instead of Date properties",
        },
      ],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'luxon',
              message: "Import from 'src/lib/datetime' instead of 'luxon' directly",
            },
          ],
        },
      ],
    },
  },
);