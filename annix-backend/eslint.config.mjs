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
      '@typescript-eslint/consistent-generic-constructors': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-case-declarations': 'off',
      'no-dupe-else-if': 'off',
      'no-constant-condition': 'off',
      'no-empty': 'off',
      'no-extra-boolean-cast': 'off',
      'no-useless-escape': 'off',
      'no-inline-comments': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
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
          selector: 'ForStatement',
          message: 'Imperative for loops are not allowed. Use declarative array operations (map, reduce, filter, etc.) instead for side-effect free code.',
        },
        {
          selector: 'WhileStatement',
          message: 'Imperative while loops are not allowed. Use declarative array operations (map, reduce, filter, etc.) instead for side-effect free code.',
        },
        {
          selector: 'DoWhileStatement',
          message: 'Imperative do-while loops are not allowed. Use declarative array operations (map, reduce, filter, etc.) instead for side-effect free code.',
        },
        {
          selector: 'ForInStatement',
          message: 'for...in loops are not allowed. Use keys() from es-toolkit/compat with forEach/map, or declarative operations instead.',
        },
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
        {
          selector: "MemberExpression[object.name='Object'][property.name='keys']",
          message: 'Use keys() from es-toolkit/compat instead of Object.keys() for better type safety.',
        },
        {
          selector: "MemberExpression[object.name='Object'][property.name='values']",
          message: 'Use values() from es-toolkit/compat instead of Object.values() for better type safety.',
        },
        {
          selector: "MemberExpression[object.name='Object'][property.name='entries']",
          message: 'Use entries() from es-toolkit/compat instead of Object.entries() for better type safety.',
        },
        {
          selector: "CallExpression[callee.object.name='Array'][callee.property.name='isArray']",
          message: 'Use isArray() from es-toolkit/compat instead of Array.isArray() for consistency.',
        },
        {
          selector: "BinaryExpression[operator='==='][left.operator='typeof'][right.value='string']",
          message: 'Use isString() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='==='][left.operator='typeof'][right.value='number']",
          message: 'Use isNumber() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='==='][left.operator='typeof'][right.value='boolean']",
          message: 'Use isBoolean() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='==='][left.operator='typeof'][right.value='object']",
          message: 'Use isObject() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='==='][left.operator='typeof'][right.value='undefined']",
          message: 'Use isUndefined() from es-toolkit/compat instead of typeof checks. Note: prefer null over undefined for absence of value.',
        },
        {
          selector: "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='string']",
          message: 'Use !isString() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='number']",
          message: 'Use !isNumber() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='boolean']",
          message: 'Use !isBoolean() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='object']",
          message: 'Use !isObject() from es-toolkit/compat instead of typeof checks for better type safety.',
        },
        {
          selector: "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='undefined']",
          message: 'Use !isUndefined() from es-toolkit/compat instead of typeof checks. Note: prefer null over undefined for absence of value.',
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
