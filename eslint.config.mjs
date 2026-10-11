import parser from "@babel/eslint-parser";
const literalAbsence = (node) =>
  node &&
  ((node.type === "Literal" && node.value === null) ||
    (node.type === "Identifier" && node.name === "undefined") ||
    (node.type === "UnaryExpression" && node.operator === "void"));
const rules = {
  "no-absence-return": {
    meta: {
      type: "problem",
      schema: [],
      messages: {
        absence: "Return Option, Either, or Effect instead of null/undefined.",
      },
    },
    create(context) {
      const check = (node) => {
        if (literalAbsence(node))
          context.report({ node, messageId: "absence" });
      };
      return {
        ReturnStatement(node) {
          check(node.argument);
        },
        ArrowFunctionExpression(node) {
          check(node.body);
        },
      };
    },
  },
  "no-any": {
    meta: {
      type: "problem",
      schema: [],
      messages: {
        any: "Use a precise type, or validate unknown at the boundary.",
      },
    },
    create(context) {
      return {
        TSAnyKeyword(node) {
          context.report({ node, messageId: "any" });
        },
      };
    },
  },
};
export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "native-dist/**",
      "packages/infrastructure/src/generated/**",
    ],
  },
  {
    files: [
      "packages/**/*.ts",
      "apps/**/*.ts",
      "apps/**/*.tsx",
      "scripts/**/*.ts",
    ],
    languageOptions: {
      parser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [["@babel/plugin-syntax-typescript", { isTSX: true }]],
        },
      },
    },
    plugins: { functional: { rules } },
    rules: {
      "functional/no-any": "error",
      "functional/no-absence-return": "error",
      "no-debugger": "error",
      "no-constant-condition": "error",
    },
  },
  {
    files: ["packages/core/**/*.ts", "packages/foundation/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react",
            "react-native",
            "*application*",
            "*infrastructure*",
            "*apps/*",
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message: "Inject time through TransitionContext.",
        },
        {
          object: "Math",
          property: "random",
          message: "Inject IDs or randomness.",
        },
      ],
    },
  },
  // Domain repository files stay vendor-free. Prisma lives in the parser and the Prisma repository.
  {
    files: [
      "packages/infrastructure/src/**/*-repository.ts",
      "packages/infrastructure/src/**/*-repository-facade.ts",
      "packages/infrastructure/src/**/*-routine.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["*prisma*", "*/generated/*"],
        },
      ],
    },
  },
  // Explicit wire encoding only; internal domain absence is always Option.
  {
    files: ["packages/core/src/codec.ts"],
    rules: { "functional/no-absence-return": "off" },
  },
  // React/native APIs use null to omit rendered elements. Domain rules remain strict.
  {
    files: ["apps/**/*.tsx"],
    rules: { "functional/no-absence-return": "off" },
  },
];
