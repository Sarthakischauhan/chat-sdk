import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
for (const key of ["File", "FileReader", "Blob"]) globalThis[key] = dom.window[key];
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
const { render, screen, cleanup, waitFor, fireEvent } = await import("@testing-library/react");
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

const png = () => new File([new Uint8Array([137, 80, 78, 71])], "shot.png", { type: "image/png" });
const text = () => new File(["hello"], "notes.txt", { type: "text/plain" });
const shell = () => document.querySelector(".chat-composer-shell");
test("attach button picks images only when the host accepts images", () => {
  composer({ attachmentAccept: "image/*" });
  assert.equal(document.querySelector(".chat-attach-input").getAttribute("accept"), "image/*");
});
test("pasted images join the attachment preview; other files are ignored", async () => {
  composer({ attachmentAccept: "image/*" });
  fireEvent.paste(shell(), { clipboardData: { files: [png(), text()], types: ["Files"] } });
  await waitFor(() => assert.ok(screen.getByRole("img", { name: "shot.png" })));
  assert.equal(screen.queryByText("notes.txt"), null);
  assert.ok(screen.getByRole("button", { name: "Remove shot.png" }));
});
test("dropped images join the attachment preview", async () => {
  composer({ attachmentAccept: "image/*" });
  fireEvent.dragOver(shell(), { dataTransfer: { files: [png()], types: ["Files"] } });
  fireEvent.drop(shell(), { dataTransfer: { files: [png()], types: ["Files"] } });
  await waitFor(() => assert.ok(screen.getByRole("img", { name: "shot.png" })));
});
test("paste and drop attach nothing when attachments are hidden", async () => {
  composer({ showAttachments: false });
  fireEvent.paste(shell(), { clipboardData: { files: [png()], types: ["Files"] } });
  fireEvent.drop(shell(), { dataTransfer: { files: [png()], types: ["Files"] } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(screen.queryByRole("img"), null);
});
