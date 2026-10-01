import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["packages/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression[typeAnnotation.type='TSAnyKeyword']",
          message: "Do not use `as any` in packages.",
        },
        {
          selector: "TSTypeAssertion[typeAnnotation.type='TSAnyKeyword']",
          message: "Do not use `<any>` assertions in packages.",
        },
      ],
    },
  },
  { settings: { next: { rootDir: ["examples/next-symphony", "examples/next-ai-sdk"] } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/dist/**",
  ]),
]);

export default eslintConfig;
