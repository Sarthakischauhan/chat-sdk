import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const workspaces = [
  "packages/protocol",
  "packages/adapter",
  "packages/adapter/ai-sdk",
  "packages/chat-tui",
  "packages/chat",
];
const packages = workspaces.map((path) => ({
  ...JSON.parse(readFileSync(`${path}/package.json`, "utf8")),
  path,
}));
const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
const tag = process.env.RELEASE_TAG;

if (!/^chat-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$/.test(tag ?? "")) {
  throw new Error(`Expected a stable GitHub Release tag like chat-0.0.3, got ${tag ?? "(none)"}`);
}

const chat = byName.get("@sarchauhan/chat");
if (tag !== `chat-${chat.version}`) {
  throw new Error(`Release ${tag} must match @sarchauhan/chat version ${chat.version}`);
}
for (const pkg of packages) {
  if (pkg.private) throw new Error(`${pkg.name} is private, cannot publish`);
  for (const [name, range] of Object.entries({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
    const local = byName.get(name);
    if (local && range !== local.version) {
      throw new Error(`${pkg.name} pins ${name}@${range}, but workspace has ${local.version}. Update internal dependencies and package-lock.json before releasing.`);
    }
  }
}
const version = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
const [major, minor] = version.split(".").map(Number);
if (major < 11 || (major === 11 && minor < 5)) {
  throw new Error(`npm >= 11.5.1 is required for trusted publishing; found ${version}`);
}
console.log(`Validated ${tag} (npm ${version}). Workspace versions:`);
for (const pkg of packages) console.log(`  ${pkg.name}@${pkg.version}`);
