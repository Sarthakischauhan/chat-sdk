import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = mkdtempSync(join(tmpdir(), "chat-package-smoke-"));
const npm = (args, cwd = root) => execFileSync("npm", args, { cwd, encoding: "utf8" });

try {
  const tarballs = ["protocol", "chat"].map((name) => {
    const [packed] = JSON.parse(npm([
      "pack", "-w", `@sarchauhan/${name}`, "--ignore-scripts", "--json",
      "--pack-destination", directory,
    ]));
    return join(directory, packed.filename);
  });
  const chat = JSON.parse(readFileSync(join(root, "packages/chat/package.json"), "utf8"));
  const protocol = JSON.parse(readFileSync(join(root, "packages/protocol/package.json"), "utf8"));
  assert.equal(chat.dependencies[protocol.name], protocol.version);
  writeFileSync(join(directory, "package.json"), JSON.stringify({
    name: "chat-package-smoke", version: "1.0.0", private: true,
  }));
  // Install outside the workspace so published adapter dependencies cannot use local links.
  npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs, "react@19", "react-dom@19"], directory);
  const smoke = `
    import assert from "node:assert/strict";
    import { createRequire } from "node:module";
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import * as protocol from "@sarchauhan/protocol";
    const require = createRequire(import.meta.url);
    for (const name of ["@sarchauhan/chat", "@sarchauhan/chat/widgets"]) {
      for (const module of [await import(name), require(name)]) {
        for (const helper of ["createArtifactData", "createSubagentData", "parseArtifact", "parseSubagent"]) {
          assert.equal(typeof module[helper], "function", name + ": " + helper);
        }
        const artifact = { id: "report", filename: "report.md", mediaType: "text/markdown", content: "Release verified" };
        assert.equal(module.createArtifactData(artifact).type, "data-artifact");
        assert.equal(module.parseArtifact(artifact).filename, "report.md");
        const subagent = { id: "agent", title: "Release check", state: "completed" };
        assert.equal(module.createSubagentData(subagent).type, "data-subagent");
        assert.equal(module.parseSubagent(subagent).state, "completed");
        assert.match(renderToStaticMarkup(createElement(module.ArtifactWidget, { artifact })), /report.md/);
      }
    }
    for (const module of [protocol, require("@sarchauhan/protocol")]) {
      assert.equal(module.parseUsage({ total_tokens: 42 }).total_tokens, 42);
      assert.equal(module.parseContext({ context_window: 100 }).context_window, 100);
    }
    console.log("Packed consumer smoke passed: ESM, CommonJS, artifact rendering, protocol helpers.");
  `;
  writeFileSync(join(directory, "smoke.mjs"), smoke);
  console.log(execFileSync(process.execPath, ["smoke.mjs"], { cwd: directory, encoding: "utf8" }).trim());
} finally {
  rmSync(directory, { recursive: true, force: true });
}
