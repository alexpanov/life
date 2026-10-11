import parser from "@babel/eslint-parser";
import {
  isTailwindImport,
  tailwindClassTokens,
  tailwindStylesheetIssue,
} from "./packages/design/src/tailwind-boundary.mjs";
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
  "no-tailwind": {
    meta: {
      type: "problem",
      schema: [],
      messages: {
        tailwind: "Tailwind belongs in @questos/design.",
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename();
      if (filename.endsWith(".css")) {
        return {
          Program(node) {
            const issue = tailwindStylesheetIssue(context.sourceCode.getText());
            if (issue) context.report({ node, messageId: "tailwind" });
          },
        };
      }
      const reportClasses = (node, text) => {
        if (tailwindClassTokens(text).length > 0)
          context.report({ node, messageId: "tailwind" });
      };
      const walk = (node) => {
        if (!node) return;
        if (
          (node.type === "Literal" || node.type === "StringLiteral") &&
          typeof node.value === "string"
        ) {
          reportClasses(node, node.value);
          return;
        }
        if (node.type === "TemplateLiteral") {
          for (const quasi of node.quasis)
            reportClasses(quasi, quasi.value?.cooked ?? quasi.value?.raw ?? "");
          return;
        }
        if (node.type === "ConditionalExpression") {
          walk(node.consequent);
          walk(node.alternate);
          return;
        }
        if (
          node.type === "LogicalExpression" ||
          (node.type === "BinaryExpression" && node.operator === "+")
        ) {
          walk(node.left);
          walk(node.right);
          return;
        }
        if (node.type === "ArrayExpression") {
          for (const element of node.elements) walk(element);
          return;
        }
        if (node.type === "CallExpression") {
          for (const argument of node.arguments) walk(argument);
        }
      };
      const reportImport = (source) => {
        if (source && isTailwindImport(source.value))
          context.report({ node: source, messageId: "tailwind" });
      };
      return {
        ImportDeclaration(node) {
          reportImport(node.source);
        },
        ExportAllDeclaration(node) {
          reportImport(node.source);
        },
        ExportNamedDeclaration(node) {
          reportImport(node.source);
        },
        ImportExpression(node) {
          if (
            node.source &&
            (node.source.type === "Literal" ||
              node.source.type === "StringLiteral")
          )
            reportImport(node.source);
        },
        JSXAttribute(node) {
          if (node.name.type !== "JSXIdentifier" || node.name.name !== "className")
            return;
          if (!node.value) return;
          if (
            node.value.type === "Literal" ||
            node.value.type === "StringLiteral"
          ) {
            if (typeof node.value.value === "string")
              reportClasses(node.value, node.value.value);
            return;
          }
          if (node.value.type === "JSXExpressionContainer") walk(node.value.expression);
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
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
    ],
  },
  {
    files: [
      "packages/**/*.ts",
      "packages/**/*.tsx",
      "apps/**/*.ts",
      "apps/**/*.tsx",
      "scripts/**/*.ts",
      "vite.config.ts",
      "supabase/functions/**/*.ts",
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
      "functional/no-tailwind": "error",
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
    files: ["apps/**/*.tsx", "packages/**/*.tsx"],
    rules: { "functional/no-absence-return": "off" },
  },
  {
    files: ["packages/design/**/*.ts", "packages/design/**/*.tsx"],
    rules: { "functional/no-tailwind": "off" },
  },
  {
    files: ["**/*.css"],
    ignores: ["packages/design/**", "dist/**", "node_modules/**"],
    languageOptions: {
      parser: {
        meta: { name: "questos-css" },
        parse(text) {
          const lines = text.split("\n").length;
          return {
            type: "Program",
            body: [],
            sourceType: "script",
            range: [0, text.length],
            loc: {
              start: { line: 1, column: 0 },
              end: { line: lines, column: 0 },
            },
            tokens: [],
            comments: [],
          };
        },
      },
    },
    plugins: {
      functional: {
        rules: {
          "no-tailwind": rules["no-tailwind"],
        },
      },
    },
    rules: { "functional/no-tailwind": "error" },
  },
];
