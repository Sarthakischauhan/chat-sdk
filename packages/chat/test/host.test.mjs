import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
const { render, screen, cleanup, waitFor } = await import("@testing-library/react");
const { ChatComposer, ChatContextProvider, ThinkingBlock } = await import("../dist/index.mjs");
afterEach(cleanup);
const adapter = { async *sendMessage() {} };
const composer = (props) =>
  render(createElement(ChatContextProvider, { adapter, defaultThreadId: "t1" }, createElement(ChatComposer, props)));
test("composer input is labelled and takes a host placeholder", () => {
  composer({ placeholder: "Describe a task" });
  const input = screen.getByRole("textbox", { name: "Describe a task" });
  assert.equal(input.getAttribute("placeholder"), "Describe a task");
  cleanup();
  composer({ placeholder: "Describe a task", inputLabel: "Coding task" });
  assert.ok(screen.getByRole("textbox", { name: "Coding task" }));
});
test("composer can hide attachments for text-only backends", () => {
  composer({});
  assert.ok(screen.getByRole("button", { name: "Add attachment" }));
  cleanup();
  composer({ showAttachments: false });
  assert.equal(screen.queryByRole("button", { name: "Add attachment" }), null);
});
test("thinking without a measured duration does not claim zero seconds", async () => {
  render(createElement(ThinkingBlock, { isComplete: true, elapsedMs: 0 }));
  await waitFor(() => assert.match(document.body.textContent, /Thought/));
  assert.doesNotMatch(document.body.textContent, /0 seconds/);
  cleanup();
  render(createElement(ThinkingBlock, { isComplete: true, elapsedMs: 3000 }));
  await waitFor(() => assert.match(document.body.textContent, /Thought for 3 seconds/));
});
