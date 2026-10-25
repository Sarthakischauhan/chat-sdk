import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Route the component's window timers through node's (mockable) timers.
dom.window.setTimeout = (...args) => globalThis.setTimeout(...args);
dom.window.clearTimeout = (id) => globalThis.clearTimeout(id);
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
const { render, fireEvent, cleanup } = await import("@testing-library/react");
const { ChatComposer, ChatContextProvider, orbReasoningTiming, announceableReasoning } = await import("../dist/index.mjs");
const adapter = { async *sendMessage() {} };
const tree = (props) => createElement(ChatContextProvider, { adapter, defaultThreadId: "t1" }, createElement(ChatComposer, { collapsedVariant: "circle", ...props }));
const mount = (props) => {
  const view = render(tree(props));
  return { ...view, anchor: () => view.container.querySelector(".chat-orb-anchor"), pop: () => view.container.querySelector(".chat-orb-reasoning"), update: (next) => view.rerender(tree(next)) };
};
const tick = (ms) => act(() => mock.timers.tick(ms));
const hover = (view) => fireEvent.pointerOver(view.anchor());
const leave = (view) => fireEvent.pointerOut(view.anchor(), { relatedTarget: document.body });
beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => { cleanup(); mock.timers.reset(); });

test("hover opens after the intent delay and closes after the grace period", () => {
  const view = mount({ state: "thinking", reasoning: "Reading the repo." });
  hover(view);
  tick(orbReasoningTiming.openDelay - 1);
  assert.equal(view.pop(), null);
  tick(1);
  assert.equal(view.pop().dataset.state, "open");
  leave(view);
  tick(orbReasoningTiming.closeDelay - 1);
  assert.equal(view.pop().dataset.state, "open");
  tick(1);
  assert.equal(view.pop().dataset.state, "closing");
  tick(orbReasoningTiming.exit);
  assert.equal(view.pop(), null);
});

test("re-entering before the grace period keeps it open", () => {
  const view = mount({ state: "thinking", reasoning: "Plan." });
  hover(view); tick(orbReasoningTiming.openDelay);
  leave(view); tick(100); hover(view); tick(500);
  assert.equal(view.pop().dataset.state, "open");
});

test("gated by state and by non-empty reasoning", () => {
  const view = mount({ state: "idle", reasoning: "Hidden text" });
  hover(view); tick(500);
  assert.equal(view.pop(), null);
  view.update({ state: "thinking", reasoning: "   " });
  tick(500);
  assert.equal(view.pop(), null);
  view.update({ state: "thinking", reasoning: "Now visible" });
  tick(0);
  assert.equal(view.pop().dataset.state, "open");
});

test("pill composer never renders the popover", () => {
  const view = render(tree({ collapsedVariant: "pill", state: "thinking", reasoning: "x" }));
  assert.equal(view.container.querySelector(".chat-orb-anchor"), null);
});

test("streaming tokens update the text and announce at sentence boundaries", () => {
  const view = mount({ state: "thinking", reasoning: "First idea." });
  hover(view); tick(orbReasoningTiming.openDelay);
  view.update({ state: "thinking", reasoning: "First idea.\nSecond, still go" });
  assert.equal(view.container.querySelector(".chat-orb-reasoning-newest").textContent, "Second, still go");
  assert.equal(view.container.querySelector(".chat-orb-reasoning-older").textContent, "First idea.\n");
  const status = view.container.querySelector("[role='status']");
  assert.equal(status.getAttribute("aria-live"), "polite");
  assert.equal(status.textContent, "First idea.");
  view.update({ state: "thinking", reasoning: "First idea.\nSecond, still going." });
  assert.equal(status.textContent, "First idea.\nSecond, still going.");
  assert.equal(announceableReasoning("Half a thought", false), "");
});

test("holds the last frame 400ms after thinking ends, then fades", () => {
  const view = mount({ state: "thinking", reasoning: "Done soon." });
  hover(view); tick(orbReasoningTiming.openDelay);
  view.update({ state: "idle", reasoning: "" });
  tick(orbReasoningTiming.hold - 1);
  assert.equal(view.pop().dataset.state, "open");
  assert.equal(view.container.querySelector(".chat-orb-reasoning-newest").textContent, "Done soon.");
  assert.equal(view.container.querySelector(".chat-orb-reasoning-caret"), null);
  tick(1);
  assert.equal(view.pop().dataset.state, "closing");
  tick(orbReasoningTiming.exit);
  assert.equal(view.pop(), null);
});

test("keyboard focus opens immediately and Escape closes", () => {
  const view = mount({ state: "thinking", reasoning: "Focus me." });
  const input = view.container.querySelector("textarea");
  fireEvent.focus(input);
  assert.equal(view.pop().dataset.state, "open");
  fireEvent.keyDown(input, { key: "Escape" });
  assert.equal(view.pop().dataset.state, "closing");
  tick(orbReasoningTiming.exit);
  assert.equal(view.pop(), null);
  fireEvent.blur(input);
  fireEvent.focus(input);
  assert.equal(view.pop().dataset.state, "open");
});
