import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement, useRef } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const { render, fireEvent, cleanup, waitFor, act } = await import("@testing-library/react");
const { TerminalWidget } = await import("../dist/widgets.mjs");
const { useStickToBottom } = await import("../dist/index.mjs");
afterEach(() => { cleanup(); window.getSelection()?.removeAllRanges(); });

const row = (state) => createElement(TerminalWidget, { command: "npm test", state, chunks: [{ stream: "stdout", text: "ok\n" }] });
const details = (container) => container.querySelector("details");
const toggled = (element) => new Promise((resolve) => element.addEventListener("toggle", resolve, { once: true }));

test("a running row is open and closes itself when it finishes", async () => {
  const view = render(row("running"));
  assert.equal(details(view.container).open, true);
  view.rerender(row("complete"));
  await waitFor(() => assert.equal(details(view.container).open, false));
});

test("a row the user toggled keeps the user's state when it finishes", async () => {
  const view = render(row("running"));
  const element = details(view.container);
  // The user collapses, then re-opens it while it runs.
  element.open = false;
  element.dispatchEvent(new window.Event("toggle"));
  element.open = true;
  element.dispatchEvent(new window.Event("toggle"));
  view.rerender(row("complete"));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(element.open, true);
});

test("an automatic close does not count as a user toggle", async () => {
  const view = render(row("running"));
  const element = details(view.container);
  const closed = toggled(element);
  view.rerender(row("complete"));
  await closed;
  view.rerender(row("running"));
  await waitFor(() => assert.equal(element.open, true));
});

test("dragging a text selection across the summary does not toggle the row", () => {
  const view = render(row("complete"));
  const summary = view.container.querySelector("summary");
  const range = document.createRange();
  range.selectNodeContents(summary);
  window.getSelection().addRange(range);
  const event = new window.MouseEvent("click", { bubbles: true, cancelable: true });
  summary.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  window.getSelection().removeAllRanges();
  const plain = new window.MouseEvent("click", { bubbles: true, cancelable: true });
  summary.dispatchEvent(plain);
  assert.equal(plain.defaultPrevented, false);
});

/** A scroll box with fake layout: jsdom has none. */
function fakeLayout(element, { clientHeight = 200 } = {}) {
  let top = 0;
  Object.defineProperty(element, "clientHeight", { configurable: true, get: () => clientHeight });
  Object.defineProperty(element, "scrollHeight", { configurable: true, get: () => element.children.length * 100 });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (value) => { top = Math.max(0, Math.min(value, element.scrollHeight - clientHeight)); },
  });
}
let box;
function Scroller({ items }) {
  const ref = useRef(null);
  useStickToBottom(ref);
  return createElement("div", { ref: (node) => { if (node && node !== box) { fakeLayout(node); box = node; } ref.current = node; } },
    ...Array.from({ length: items }, (_, index) => createElement("p", { key: index }, `line ${index}`)));
}

test("stick-to-bottom follows new content while the user is near the bottom", async () => {
  const view = render(createElement(Scroller, { items: 5 }));
  await act(async () => { box.scrollTop = box.scrollHeight; fireEvent.scroll(box); });
  view.rerender(createElement(Scroller, { items: 8 }));
  await waitFor(() => assert.equal(box.scrollTop, 800 - 200));
});

test("stick-to-bottom leaves the view alone once the user scrolls up", async () => {
  const view = render(createElement(Scroller, { items: 5 }));
  await act(async () => { box.scrollTop = 100; fireEvent.scroll(box); });
  view.rerender(createElement(Scroller, { items: 9 }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(box.scrollTop, 100);
  // Within 48px of the bottom counts as at the bottom again.
  await act(async () => { box.scrollTop = box.scrollHeight - 200 - 40; fireEvent.scroll(box); });
  view.rerender(createElement(Scroller, { items: 12 }));
  await waitFor(() => assert.equal(box.scrollTop, 1200 - 200));
});

test("the browser's mount-time toggle event does not count as a user toggle", async () => {
  const view = render(row("running"));
  const element = details(view.container);
  element.dispatchEvent(new window.Event("toggle")); // Chrome fires this for an initially open <details>.
  view.rerender(row("complete"));
  await waitFor(() => assert.equal(element.open, false));
});
