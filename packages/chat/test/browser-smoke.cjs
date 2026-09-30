const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.resolve("storybook/storybook-static");
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
  const server = http.createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const filename = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
      if (filename !== root && !filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      response.setHeader("Content-Type", types[path.extname(filename)] || "application/octet-stream");
      response.end(fs.readFileSync(filename));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(6007, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    fs.mkdirSync("test-results", { recursive: true });
    const go = async (story) => {
      await page.goto("http://127.0.0.1:6007/iframe.html?id=chat-artifacts-and-agents--" + story + "&viewMode=story&globals=theme:dark");
      await page.locator(".chat-prebuilt").first().waitFor();
    };
    await go("subagent");
    const trigger = page.getByRole("button", { name: "View activity for Research agent" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await dialog.getAttribute("data-theme"), "dark");
    let box = await dialog.boundingBox();
    assert.ok(box.x > 0 && box.y > 0 && box.width < 1000, "desktop dialog must be centered");
    await page.screenshot({ path: "test-results/subagent-desktop.png" });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "View activity for Research agent");
    await page.setViewportSize({ width: 375, height: 812 });
    await trigger.click();
    await dialog.waitFor();
    // Wait until the entrance animation settles before measuring the sheet.
    await page.waitForFunction(() => [...(document.querySelector('[role="dialog"]')?.getAnimations() ?? [])].every((animation) => animation.playState === "finished"));
    box = await dialog.boundingBox();
    assert.ok(Math.abs(box.x) < 1 && Math.abs(box.width - 375) < 1, "mobile sheet must span the viewport");
    assert.ok(Math.abs(box.y + box.height - 812) < 2, "mobile sheet must dock to the bottom");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: "test-results/subagent-mobile.png" });
    await page.getByRole("button", { name: "Close details" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.setViewportSize({ width: 1000, height: 800 });
    await go("file");
    await page.getByRole("button", { name: "Preview" }).click();
    await page.getByRole("dialog").waitFor();
    assert.match(await page.getByRole("dialog").textContent(), /Research findings/);
    await page.screenshot({ path: "test-results/artifact-preview.png" });
    assert.deepEqual(errors, []);
    console.log("Browser smoke passed: desktop modal, theme, Escape/focus restoration, mobile bottom sheet, no horizontal overflow, artifact preview.");
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
