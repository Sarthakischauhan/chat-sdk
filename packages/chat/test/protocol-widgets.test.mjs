import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const { render, fireEvent, screen, cleanup, waitFor } = await import("@testing-library/react");
const { TerminalWidget, ApprovalWidget, PatchWidget, ReadFileWidget, SearchWidget, SubagentWidget, computeToolWidget, formatStatus } = await import("../dist/widgets.mjs");
const { WidgetProvider, WidgetRenderer } = await import("../dist/index.mjs");
afterEach(cleanup);

test("terminal renders streamed stdout and stderr with exit code and duration", () => {
  const html = renderToStaticMarkup(createElement(TerminalWidget, {
    command: "npm test", state: "error", exitCode: 1, durationMs: 1400,
    chunks: [{ stream: "stdout", text: "ok 1\n" }, { stream: "stderr", text: "boom\n" }],
  }));
  assert.match(html, /Ran/);
  assert.match(html, /failed, exit 1/);
  assert.match(html, /1\.4s/);
  assert.match(html, /data-stream="stderr">boom/);
  assert.match(html, /data-stream="stdout">ok 1/);
});

test("terminal hides exit code and time when the payload lacks them (old sessions)", () => {
  const html = renderToStaticMarkup(createElement(TerminalWidget, { command: "ls", output: "a\nb" }));
  assert.doesNotMatch(html, /exit/);
  assert.doesNotMatch(html, /passed/);
  assert.match(html, /a\nb/);
});

test("passed status needs exit code 0; running shows elapsed from started_at", () => {
  assert.deepEqual(formatStatus("complete", { exitCode: 0 }), { text: "passed", tone: "success" });
  assert.equal(formatStatus("complete", {}), undefined);
  assert.equal(formatStatus("running", {}, 12_400).text, "running 12s");
  assert.equal(formatStatus("running", {}).text, "running");
});

test("summary counts override derived counts and null falls back", () => {
  const diff = "@@ -1 +1 @@\n-a\n+b";
  assert.match(renderToStaticMarkup(createElement(PatchWidget, { path: "a.ts", diff, summary: { added: 7, removed: 3 } })), /\+7.*−3/s);
  assert.match(renderToStaticMarkup(createElement(PatchWidget, { path: "a.ts", diff, summary: { added: null, removed: null } })), /\+1.*−1/s);
  assert.match(renderToStaticMarkup(createElement(ReadFileWidget, { path: "a.ts", content: "x", summary: { lines: 120 } })), /120 lines/);
  assert.match(renderToStaticMarkup(createElement(SearchWidget, { query: "q", results: [], summary: { matches: 2 } })), /2 matches/);
});

test("approval uses harness choices and answers with the chosen label", async () => {
  const answers = [];
  render(createElement(ApprovalWidget, {
    question: "It already exists and will be overwritten.", target: "src/retry.ts", toolName: "write_file", bytes: 1204,
    choices: ["Deny", "Always allow", "Allow once"], defaultChoice: "Allow once", onAnswer: async (c) => { answers.push(c); },
  }));
  assert.match(document.body.textContent, /write_file · 1,204 bytes/);
  assert.equal(screen.getByRole("button", { name: "Allow once" }).dataset.default, "true");
  fireEvent.click(screen.getByRole("button", { name: "Always allow" }));
  await waitFor(() => assert.deepEqual(answers, ["Always allow"]));
  fireEvent.click(screen.getByRole("button", { name: "Deny" }));
  assert.equal(answers.length, 1);
});

test("registered approval responds through the widget answer path", async () => {
  const responses = [];
  render(createElement(WidgetProvider, { respondToWidget: async (r) => { responses.push(r); } },
    createElement(WidgetRenderer, { part: { type: "widget", id: "req-1", name: "approval", interactive: true,
      props: { question: "Run?", choices: ["Deny", "Allow once"], default: "Allow once" } } })));
  fireEvent.click(screen.getByRole("button", { name: "Deny" }));
  await waitFor(() => assert.equal(responses.length, 1));
  assert.equal(responses[0].value, "Deny");
  assert.equal(responses[0].label, "Deny");
});

test("subagent renders nested steps under the Delegated row", () => {
  const html = renderToStaticMarkup(createElement(SubagentWidget, {
    subagent: { id: "c1", title: "Audit", state: "running" },
    steps: [
      { id: "s1", label: "Read", target: "tests/test_session.py", state: "complete" },
      { id: "s2", label: "Running", target: "pytest -k reconnect", state: "running" },
    ],
  }));
  assert.match(html, /Delegated/);
  assert.match(html, /chat-subagent-steps/);
  assert.match(html, /tests\/test_session\.py/);
  assert.match(html, /data-state="running"/);
});

test("bash tool parts fall back to the terminal widget", () => {
  const widget = computeToolWidget({ type: "tool", toolName: "bash", toolCallId: "b1", state: "output-available", input: { command: "ls" }, output: "a" });
  assert.equal(widget.name, "terminal");
  assert.equal(widget.props.command, "ls");
  assert.equal(widget.props.output, "a");
  assert.equal(widget.props.exitCode, undefined);
});
