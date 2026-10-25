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
const { ChatComposer, ChatContextProvider, orbReasoningTiming, announceableReasoning, reasoningText } = await import("../dist/index.mjs");
const chunks = (...texts) => texts.map((text, index) => ({ id: `c${index}`, text }));
const adapter = { async *sendMessage() {} };
const tree = (props) => createElement(ChatContextProvider, { adapter, defaultThreadId: "t1" }, createElement(ChatComposer, { collapsedVariant: "circle", ...props }));
const mount = (props) => {
  const view = render(tree(props));
  return { ...view, anchor: () => view.container.querySelector(".chat-orb-anchor"), pop: () => document.querySelector(".chat-orb-reasoning"), update: (next) => view.rerender(tree(next)) };
};
// Each tick also flushes the zero-delay "next frame" that moves entering -> open.
const tick = (ms) => { act(() => mock.timers.tick(ms)); act(() => mock.timers.tick(0)); };
const hover = (view) => fireEvent.pointerOver(view.anchor());
const leave = (view) => fireEvent.pointerOut(view.anchor(), { relatedTarget: document.body });
beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => { cleanup(); mock.timers.reset(); });

test("hover opens after the intent delay and closes after the grace period", () => {
  const view = mount({ state: "thinking", reasoning: chunks("Reading the repo.") });
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
  const view = mount({ state: "thinking", reasoning: chunks("Plan.") });
  hover(view); tick(orbReasoningTiming.openDelay);
  leave(view); tick(100); hover(view); tick(500);
  assert.equal(view.pop().dataset.state, "open");
});

test("gated by state and by non-empty reasoning", () => {
  const view = mount({ state: "idle", reasoning: chunks("Hidden text") });
  hover(view); tick(500);
  assert.equal(view.pop(), null);
  view.update({ state: "thinking", reasoning: chunks("   ") });
  tick(500);
  assert.equal(view.pop(), null);
  view.update({ state: "thinking", reasoning: chunks("Now visible") });
  assert.equal(view.pop().dataset.state, "entering");
  tick(0);
  assert.equal(view.pop().dataset.state, "open");
});

test("pill composer never renders the popover", () => {
  const view = render(tree({ collapsedVariant: "pill", state: "thinking", reasoning: chunks("x") }));
  assert.equal(view.container.querySelector(".chat-orb-anchor"), null);
});

test("streaming tokens update the text and announce at sentence boundaries", () => {
  const view = mount({ state: "thinking", reasoning: chunks("First idea.") });
  hover(view); tick(orbReasoningTiming.openDelay);
  view.update({ state: "thinking", reasoning: chunks("First idea.\n", "Second, ", "still go") });
  assert.equal(document.querySelector(".chat-orb-reasoning-newest").textContent, "Second, still go");
  assert.equal(document.querySelector(".chat-orb-reasoning-older").textContent, "First idea.\n");
  const status = document.querySelector(".chat-orb-reasoning [role='status']");
  assert.equal(status.getAttribute("aria-live"), "polite");
  assert.equal(status.textContent, "First idea.");
  view.update({ state: "thinking", reasoning: chunks("First idea.\n", "Second, ", "still go", "ing.") });
  assert.equal(status.textContent, "First idea.\nSecond, still going.");
  assert.equal(announceableReasoning("Half a thought", false), "");
});

test("holds the last frame 400ms after thinking ends, then fades", () => {
  const view = mount({ state: "thinking", reasoning: chunks("Done soon.") });
  hover(view); tick(orbReasoningTiming.openDelay);
  view.update({ state: "idle", reasoning: [] });
  tick(orbReasoningTiming.hold - 1);
  assert.equal(view.pop().dataset.state, "open");
  assert.equal(document.querySelector(".chat-orb-reasoning-newest").textContent, "Done soon.");
  assert.equal(document.querySelector(".chat-orb-reasoning-caret"), null);
  tick(1);
  assert.equal(view.pop().dataset.state, "closing");
  tick(orbReasoningTiming.exit);
  assert.equal(view.pop(), null);
});

test("keyboard focus opens immediately and Escape closes", () => {
  const view = mount({ state: "thinking", reasoning: chunks("Focus me.") });
  const input = view.container.querySelector("textarea");
  fireEvent.focus(input);
  tick(0);
  assert.equal(view.pop().dataset.state, "open");
  fireEvent.keyDown(input, { key: "Escape" });
  assert.equal(view.pop().dataset.state, "closing");
  tick(orbReasoningTiming.exit);
  assert.equal(view.pop(), null);
  fireEvent.blur(input);
  fireEvent.focus(input);
  tick(0);
  assert.equal(view.pop().dataset.state, "open");
});

test("reasoningText joins chunks in order", () => {
  assert.equal(reasoningText(chunks("a ", "b", "\nc")), "a b\nc");
  assert.equal(reasoningText([]), "");
});

test("popover is portalled into the chat root, outside the composer", () => {
  const root = document.createElement("div");
  root.className = "chat-root";
  document.body.appendChild(root);
  const view = render(tree({ state: "thinking", reasoning: chunks("Portal.") }), { container: root.appendChild(document.createElement("div")) });
  fireEvent.pointerOver(view.container.querySelector(".chat-orb-anchor"));
  tick(orbReasoningTiming.openDelay);
  const pop = document.querySelector(".chat-orb-reasoning");
  assert.equal(pop.parentElement, root);
  assert.equal(pop.closest(".chat-composer-shell"), null);
  cleanup();
  root.remove();
});
