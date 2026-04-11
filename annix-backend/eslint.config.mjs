import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["eslint.config.mjs", "dist/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-inline-comments": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-globals": [
        "error",
        {
          name: "Date",
          message: "Use DateTime from 'src/lib/datetime' instead of native Date.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ForStatement",
          message:
            "Imperative for loops are not allowed. Use declarative array operations (map, reduce, filter, etc.) instead for side-effect free code.",
        },
        {
          selector: "WhileStatement",
          message:
            "Imperative while loops are not allowed. Use declarative array operations (map, reduce, filter, etc.) instead for side-effect free code.",
        },
        {
          selector: "DoWhileStatement",
          message:
            "Imperative do-while loops are not allowed. Use declarative array operations (map, reduce, filter, etc.) instead for side-effect free code.",
        },
        {
          selector: "ForInStatement",
          message:
            "for...in loops are not allowed. Use keys() from es-toolkit/compat with forEach/map, or declarative operations instead.",
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            "Use DateTime.now() or fromISO() from 'src/lib/datetime' instead of new Date()",
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
          message:
            "Use keys() from es-toolkit/compat instead of Object.keys() for better type safety.",
        },
        {
          selector: "MemberExpression[object.name='Object'][property.name='values']",
          message:
            "Use values() from es-toolkit/compat instead of Object.values() for better type safety.",
        },
        {
          selector: "MemberExpression[object.name='Object'][property.name='entries']",
          message:
            "Use entries() from es-toolkit/compat instead of Object.entries() for better type safety.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Array'][callee.property.name='isArray']",
          message:
            "Use isArray() from es-toolkit/compat instead of Array.isArray() for consistency.",
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.operator='typeof'][right.value='string']",
          message:
            "Use isString() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.operator='typeof'][right.value='number']",
          message:
            "Use isNumber() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.operator='typeof'][right.value='boolean']",
          message:
            "Use isBoolean() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.operator='typeof'][right.value='object']",
          message:
            "Use isObject() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='==='][left.operator='typeof'][right.value='undefined']",
          message:
            "Use isUndefined() from es-toolkit/compat instead of typeof checks. Note: prefer null over undefined for absence of value.",
        },
        {
          selector:
            "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='string']",
          message:
            "Use !isString() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='number']",
          message:
            "Use !isNumber() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='boolean']",
          message:
            "Use !isBoolean() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='object']",
          message:
            "Use !isObject() from es-toolkit/compat instead of typeof checks for better type safety.",
        },
        {
          selector:
            "BinaryExpression[operator='!=='][left.operator='typeof'][right.value='undefined']",
          message:
            "Use !isUndefined() from es-toolkit/compat instead of typeof checks. Note: prefer null over undefined for absence of value.",
        },
        {
          selector: "Literal[value=/api\\.anthropic\\.com/]",
          message:
            "Direct calls to api.anthropic.com are forbidden. Use AiChatService (Gemini-first) per CLAUDE.md AI Provider Policy. Only the canonical Claude provider files inside src/nix/ai-providers/ may reference this URL.",
        },
        {
          selector:
            "Literal[value=/(sageone\\.com|sageone\\.co\\.za|accounting\\.sage\\.com|api\\.sage|sagecloud)/i]",
          message:
            "Direct calls to Sage API endpoints are forbidden — use SageApiService or SageService via sageRateLimiter (CLAUDE.md Sage DLA compliance). Only files inside src/sage-export/ and src/comply-sa/comply-integrations/sage/ may reference Sage URLs.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "luxon",
              message: "Import from 'src/lib/datetime' instead of 'luxon' directly",
            },
            {
              name: "@anthropic-ai/sdk",
              message:
                "Direct imports of @anthropic-ai/sdk are forbidden. Inject AiChatService (which uses Gemini by default per CLAUDE.md AI Provider Policy).",
            },
          ],
        },
      ],
    },
  },
);
