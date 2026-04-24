import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow _ prefix for intentionally unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Ban raw console.* — use logger from @/lib/logger instead
      "no-console": "error",
    },
  },
  // Exempt: React Error Boundaries (must use console.error per React spec)
  {
    files: ["**/error.tsx", "**/global-error.tsx"],
    rules: { "no-console": ["error", { allow: ["error"] }] },
  },
  // Exempt: structured logger transport (it IS the console output layer)
  {
    files: ["**/lib/logger.ts"],
    rules: { "no-console": "off" },
  },
  // Exempt: CLI / dev scripts + migration docs with inline examples
  {
    files: ["**/emails/preview-all.tsx", "**/scripts/**/*.ts", "**/openfeature/MIGRATION.ts"],
    rules: { "no-console": "off" },
  },
  // Exempt: test files (Vitest/Jest use console for assertions and debug output)
  {
    files: ["**/__tests__/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
    rules: { "no-console": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated coverage reports
    "coverage/**",
  ]),
]);

export default eslintConfig;
