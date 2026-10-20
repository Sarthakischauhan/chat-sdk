import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const { render, fireEvent, screen, cleanup, waitFor } = await import("@testing-library/react");
const { AskedWidget, TerminalWidget, ApprovalWidget, PatchWidget, ReadFileWidget, SearchWidget, SubagentWidget, computeToolWidget, formatStatus, parseAskUser } = await import("../dist/widgets.mjs");
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

test("subagent widgets take no steps prop", () => {
  const html = renderToStaticMarkup(createElement(SubagentWidget, { subagent: { id: "c1", title: "Audit", state: "running" } }));
  assert.match(html, /Delegated/);
  assert.doesNotMatch(html, /chat-subagent-steps/);
});

test("bash tool parts fall back to the terminal widget", () => {
  const widget = computeToolWidget({ type: "tool", toolName: "bash", toolCallId: "b1", state: "output-available", input: { command: "ls" }, output: "a" });
  assert.equal(widget.name, "terminal");
  assert.equal(widget.props.command, "ls");
  assert.equal(widget.props.output, "a");
  assert.equal(widget.props.exitCode, undefined);
});
test("terminal reads only bash, input.command and output.output", () => {
  const part = (toolName, input, output) =>
    computeToolWidget({ type: "tool", toolName, toolCallId: "b9", state: "output-available", input, output });
  // Other harnesses' tool names are not guessed at.
  assert.equal(part("shell", { command: "ls" }, "a"), null);
  assert.equal(part("run_command", { command: "ls" }, "a"), null);
  // Nor are other argument or output names.
  assert.equal(part("bash", { cmd: "ls" }, "a"), null);
  assert.equal(part("bash", "ls", "a"), null);
  assert.equal(part("bash", { command: "ls" }, { stdout: "a" }).props.output, undefined);
});

test("tool output carries protocol 3 facts through to widget props", () => {
  const summary = { lines: null, matches: null, added: 7, removed: null };
  const patch = computeToolWidget({
    type: "tool", toolName: "patch", toolCallId: "p1", state: "output-available",
    input: { path: "a.ts", before: "a", after: "b" },
    output: { message: "patched", summary, durationMs: 12, startedAt: "2026-10-18T10:00:00Z" },
  });
  assert.equal(patch.name, "patch");
  assert.equal(patch.props.durationMs, 12);
  assert.equal(patch.props.startedAt, "2026-10-18T10:00:00Z");
  assert.deepEqual(patch.props.summary, summary);
  assert.equal(patch.props.exitCode, undefined);
  const terminal = computeToolWidget({
    type: "tool", toolName: "bash", toolCallId: "b2", state: "output-error", errorText: "boom",
    input: { command: "npm test" },
    output: {
      output: "boom", exitCode: 1, durationMs: 1400,
      chunks: [{ stream: "stdout", text: "ok\n" }, { stream: "stderr", text: "boom\n" }, { text: 1 }],
    },
  });
  assert.equal(terminal.props.exitCode, 1);
  assert.equal(terminal.props.output, "boom");
  assert.deepEqual(terminal.props.chunks, [
    { stream: "stdout", text: "ok\n" },
    { stream: "stderr", text: "boom\n" },
  ]);
});

const askInput = { question: "Bypass the hook and push?", choices: ["Bypass the hook and push", "Stop without pushing"], default: "Bypass the hook and push", activity: { verb: "Asking" } };
test("a settled ask_user call becomes an Asked row with the answer inline", () => {
  const widget = computeToolWidget({ type: "tool", toolCallId: "a1", toolName: "ask_user", state: "output-available", input: askInput, output: { answer: "Bypass the hook and push", durationMs: 9100 } });
  assert.equal(widget.name, "asked");
  assert.equal(widget.props.answer, "Bypass the hook and push");
  assert.equal(widget.interactive, false);
  const html = renderToStaticMarkup(createElement(WidgetProvider, {}, createElement(WidgetRenderer, { part: widget })));
  assert.match(html, /Asked/);
  assert.match(html, /Bypass the hook and push\?/);
  assert.match(html, /→ /);
  assert.doesNotMatch(html, /Stop without pushing/);
  assert.doesNotMatch(html, /activity|"question"|Input|Output/);
});
test("ask_user reads only input.question and the host's explicit output.answer", () => {
  const settled = (input, output) =>
    computeToolWidget({ type: "tool", toolCallId: "a1", toolName: "ask_user", state: "output-available", input, output });
  assert.deepEqual(parseAskUser({ question: "Push?", choices: ["Yes", 3] }, { answer: "Yes" }), { question: "Push?", choices: ["Yes"], answer: "Yes" });
  // Other field names are not guessed at.
  assert.equal(settled({ prompt: "Push?" }, { answer: "Yes" }), null);
  for (const output of [{ output: "Yes" }, { result: "Yes" }, "Yes"]) {
    const widget = settled(askInput, output);
    assert.equal(widget.name, "asked");
    assert.equal(widget.props.answer, undefined);
  }
});
test("an open ask_user call lists its choices and no answer", () => {
  const widget = computeToolWidget({ type: "tool", toolCallId: "a2", toolName: "ask_user", state: "input-available", input: askInput });
  const html = renderToStaticMarkup(createElement(AskedWidget, widget.props));
  assert.match(html, /Asking/);
  assert.match(html, /Stop without pushing/);
  assert.doesNotMatch(html, /→/);
});
test("ask_user without a question keeps the raw tool view", () => {
  assert.equal(computeToolWidget({ type: "tool", toolCallId: "a3", toolName: "ask_user", state: "output-available", input: {}, output: "x" }), null);
});
