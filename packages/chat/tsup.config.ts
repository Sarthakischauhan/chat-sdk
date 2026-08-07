import { cpSync, mkdirSync } from "node:fs";
import { defineConfig } from "tsup";

const cssFiles = [
  "styles.css",
  "markdown.css",
  "chat.css",
  "chat.select.css",
  "blocks.css",
  "widgets.css",
];

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@sarchauhan/adapter",
    "@sarchauhan/protocol",
  ],
  async onSuccess() {
    for (const file of cssFiles) {
      cpSync(`src/${file}`, `dist/${file}`);
    }

    mkdirSync("dist/theme", { recursive: true });
    cpSync("src/theme/tokens.css", "dist/theme/tokens.css");
  },
});
