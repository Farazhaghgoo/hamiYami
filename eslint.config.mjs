import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Screens must reach demo data through src/data, never by importing fixtures directly.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/data/fixtures/*", "**/data/fixtures/*"],
              message: "Read fixtures through the data-access layer in src/data instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/data/**"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "scripts/**",
  ]),
]);
