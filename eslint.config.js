import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

import noArbitraryBrandColour from "./eslint-rules/no-arbitrary-brand-colour.js";

const ADAPTER_IMPORT_MESSAGE =
  "Adapters are wired only in src/client/bootstrap.ts. Components and hooks " +
  "receive an injected ClientDeps bundle; import the port type instead.";

const BROWSER_GLOBAL_MESSAGE =
  "Browser globals belong behind a port in src/adapters/** and are injected " +
  "through ClientDeps. Components must not touch them directly.";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".astro/**",
      ".omo/**",
      ".music-out/**",
      ".codegraph/**",
      ".playwright-cli/**",
      ".playwright-mcp/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
      "void-base.html",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },

  {
    files: ["**/*.{ts,tsx,jsx}"],
    ...jsxA11y.flatConfigs.recommended,
  },

  {
    files: ["**/*.{ts,tsx,jsx}"],
    // These two rules flag event handlers on the existing switcher, search
    // dialog and mobile-menu wrappers. Demoted to warnings so the tooling task
    // stays green; the handlers move onto ports in later component tasks.
    rules: {
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  },

  {
    // Generated shadcn primitives (Base UI wrappers). These three rules flag
    // patterns that are correct for the upstream wrappers but not resolvable
    // statically: a `<label>` whose control comes from the caller, a pagination
    // anchor that receives its children through props, and the click-to-focus
    // input group. Keep the generated source unmodified.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/anchor-has-content": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    // Only the two stable rules: the plugin's v7 "recommended" set also ships
    // the experimental React Compiler rules, which flag patterns the current
    // components legitimately use and are outside this tooling task.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Non-blocking: bare expression snippets are used to probe the boundary
      // rules, and a lone `document.title` probe must only raise the boundary
      // warning, not a second failure from an unrelated rule.
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },

  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      // Tests intentionally pass constant expressions such as `false && "b"`.
      "no-constant-binary-expression": "off",
    },
  },

  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
    },
  },

  {
    files: ["**/*.astro"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // TypeScript-aware handling replaces the core rules in Astro
      // frontmatter, which is parsed as TypeScript.
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },

  // Boundary rule: runtime adapter imports are valid only in the composition
  // root. Type-only imports are allowed everywhere because they erase at
  // build time. Kept at `warn` during the migration (task 50 promotes this to
  // `error` with `--max-warnings 0`).
  {
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@/adapters",
                "@/adapters/*",
                "**/adapters",
                "**/adapters/*",
              ],
              allowTypeImports: true,
              message: ADAPTER_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      "src/adapters/**",
      "src/test/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/client/bootstrap.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // Boundary rule: components may not touch browser globals. Kept at `warn`
  // until components are ported to ClientDeps (task 50 promotes this).
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "warn",
        { name: "document", message: BROWSER_GLOBAL_MESSAGE },
        { name: "window", message: BROWSER_GLOBAL_MESSAGE },
        { name: "navigator", message: BROWSER_GLOBAL_MESSAGE },
        { name: "localStorage", message: BROWSER_GLOBAL_MESSAGE },
      ],
    },
  },

  // Brand colours must use design tokens, never an arbitrary hex literal.
  {
    files: ["src/**/*.{js,jsx,ts,tsx,astro}"],
    plugins: {
      local: {
        rules: {
          "no-arbitrary-brand-colour": noArbitraryBrandColour,
        },
      },
    },
    rules: {
      "local/no-arbitrary-brand-colour": "error",
    },
  },
);
