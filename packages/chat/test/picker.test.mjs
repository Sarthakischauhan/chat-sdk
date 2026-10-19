import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "Element", "Node", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "FocusEvent"])
  globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.ResizeObserver = dom.window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.Element.prototype.scrollIntoView = () => {};
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
dom.window.HTMLElement.prototype.hasPointerCapture = () => false;
const registry = {
  defaultProviderId: "openai",
  providers: [
    {
      id: "openai",
      label: "openai",
      defaultModel: "openai:gpt-6.1",
      models: [
        { id: "openai:gpt-6.1", label: "GPT-6.1", contextWindow: 1_000_000 },
        { id: "openai:gpt-6.1-mini", label: "GPT-6.1 mini", contextWindow: 400_000 },
      ],
    },
    {
      id: "anthropic",
      label: "anthropic",
      defaultModel: "anthropic:claude-5",
      models: [{ id: "anthropic:claude-5", label: "Claude 5", contextWindow: 200_000 }],
    },
    { id: "local", label: "local", defaultModel: "local:qwen", models: [{ id: "local:qwen", label: "qwen" }] },
  ],
};
globalThis.fetch = async () => ({ ok: true, json: async () => registry });
const { render, screen, cleanup, waitFor, fireEvent, within } = await import("@testing-library/react");
const { ChatSelect, ChatContextProvider, formatContextWindow } = await import("../dist/index.mjs");
afterEach(cleanup);
// Polls with real timers; the popover's close tween unmounts it after a delay.
const closed = async () => {
  for (let i = 0; i < 50 && screen.queryByRole("combobox"); i++) await new Promise((r) => setTimeout(r, 20));
  assert.equal(screen.queryByRole("combobox"), null);
};
const picker = async () => {
  render(
    createElement(
      "div",
      { className: "chat-root" },
      createElement(ChatContextProvider, { adapter: { async *sendMessage() {} }, defaultThreadId: "t" }, createElement(ChatSelect)),
    ),
  );
  const trigger = await waitFor(() => screen.getByRole("button", { name: /GPT-6\.1/ }));
  fireEvent.click(trigger);
  return waitFor(() => screen.getByRole("combobox", { name: "Search models" }));
};

test("context window labels", () => {
  assert.equal(formatContextWindow(1_000_000), "1M");
  assert.equal(formatContextWindow(1_500_000), "1.5M");
  assert.equal(formatContextWindow(1_048_576), "1M");
  assert.equal(formatContextWindow(131_072), "131K");
});

test("rows are grouped by provider with a context window line and a check on the selection", async () => {
  await picker();
  const groups = screen.getAllByRole("group").filter((g) => g.classList.contains("chat-model-group"));
  assert.deepEqual(groups.map((g) => g.getAttribute("aria-label")), ["openai", "anthropic", "local"]);
  const [first] = screen.getAllByRole("option");
  assert.match(first.textContent, /1M context window/);
  assert.equal(first.getAttribute("aria-selected"), "true");
  assert.ok(first.querySelector("svg.chat-model-check"));
  // No context_limit on the frame: no secondary line is invented.
  const qwen = within(groups[2]).getByRole("option");
  assert.doesNotMatch(qwen.textContent, /context window/);
  assert.equal(screen.getAllByRole("option")[1].querySelector("svg.chat-model-check"), null);
});

test("search filters by model and provider name; chips filter providers", async () => {
  const input = await picker();
  fireEvent.change(input, { target: { value: "mini" } });
  assert.equal(screen.getAllByRole("option").length, 1);
  fireEvent.change(input, { target: { value: "anthropic" } });
  assert.match(screen.getByRole("option").textContent, /Claude 5/);
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "local" }));
  assert.equal(screen.getByRole("button", { name: "local" }).getAttribute("aria-pressed"), "true");
  assert.equal(screen.getAllByRole("option").length, 1);
  fireEvent.click(screen.getByRole("button", { name: "local" }));
  assert.equal(screen.getAllByRole("option").length, 4);
});

test("arrow keys move the highlight, Enter picks, Escape closes", async () => {
  const input = await picker();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  assert.equal(screen.getAllByRole("option")[2].getAttribute("data-highlighted"), "true");
  fireEvent.keyDown(input, { key: "ArrowUp" });
  fireEvent.keyDown(input, { key: "Enter" });
  await closed();
  assert.ok(screen.getByRole("button", { name: /GPT-6\.1 mini/ }));
  fireEvent.click(screen.getByRole("button", { name: /GPT-6\.1 mini/ }));
  const again = await waitFor(() => screen.getByRole("combobox", { name: "Search models" }));
  fireEvent.keyDown(again, { key: "Escape" });
  await closed();
});
