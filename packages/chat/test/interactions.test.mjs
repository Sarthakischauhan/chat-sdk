import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const { render, fireEvent, screen, cleanup, waitFor } = await import("@testing-library/react");
const { QuestionWidget, ReadFileWidget } = await import("../dist/widgets.mjs");
const { WidgetProvider, WidgetRenderer, MessageContent } = await import("../dist/index.mjs");
afterEach(cleanup);
test("question confirms selected values with text and prevents duplicate submits", async () => {
  const received = [];
  render(createElement(QuestionWidget, { prompt: "Choose", options: ["A", "B"], allowCustom: true, onSubmit: async (answer) => { received.push(answer); } }));
  assert.equal(screen.getByRole("button", { name: "Confirm" }).disabled, true);
  fireEvent.click(screen.getByRole("radio", { name: "B" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: " extra " } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => assert.equal(screen.getByRole("status").textContent, "Answer sent"));
  assert.deepEqual(received, [{ values: ["B"], text: "extra" }]);
  fireEvent.submit(screen.getByRole("button", { name: "Submitted" }).closest("form"));
  assert.equal(received.length, 1);
});
test("registered question retries failed response and retains selection", async () => {
  let attempts = 0;
  render(createElement(WidgetProvider, { respondToWidget: async () => { if (++attempts === 1) throw new Error("Try again"); } }, createElement(WidgetRenderer, { part: { type: "widget", id: "q1", name: "question", interactive: true, props: { prompt: "Choose", options: ["A", "B"] } } })));
  fireEvent.click(screen.getByRole("radio", { name: "A" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => assert.equal(screen.getByRole("alert").textContent, "Try again"));
  assert.equal(screen.getByRole("radio", { name: "A" }).checked, true);
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => assert.equal(screen.getByRole("status").textContent, "Answer sent"));
  assert.equal(attempts, 2);
});
test("multiple choices are independent and submit together", async () => {
  let received;
  render(createElement(QuestionWidget, { prompt: "Choose", multiple: true, options: ["A", "B", "C"], onSubmit: async (answer) => { received = answer; } }));
  fireEvent.click(screen.getByRole("checkbox", { name: "A" }));fireEvent.click(screen.getByRole("checkbox", { name: "C" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() => assert.deepEqual(received.values, ["A", "C"]));
});
test("file preview expands beyond initial line limit", () => {
  const { container } = render(createElement(ReadFileWidget, { path: "a", maxLines: 2, content: "one\ntwo\nthree\nfour" }));
  assert.equal(container.querySelectorAll(".chat-code-line").length, 2);
  fireEvent.click(screen.getByRole("button", { name: "Show 2 more lines" }));
  assert.equal(container.querySelectorAll(".chat-code-line").length, 4);
});
test("message renderer computes defaults and honors custom tool registry", () => {
  const parts = [{ type: "tool", toolName: "read_file", toolCallId: "read-1", state: "output-available", input: { path: "a" }, output: { content: "hello" } }];
  const { container, unmount } = render(createElement(MessageContent, { parts }));
  assert.equal(container.querySelectorAll(".chat-tool-widget").length, 1);unmount();
  render(createElement(WidgetProvider, { widgets: { read_file: { name: "read_file", shell: false, component: () => createElement("p", null, "Custom reader") } }, respondToWidget: async () => undefined }, createElement(MessageContent, { parts })));
  assert.ok(screen.getByText("Custom reader"));
});
