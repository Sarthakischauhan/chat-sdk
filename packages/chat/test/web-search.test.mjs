import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const { render, screen, fireEvent, cleanup } = await import("@testing-library/react");
const { WebSearchWidget, computeToolWidget, normalizeWebSearchResults } = await import("../dist/widgets.mjs");
const { MessageContent } = await import("../dist/index.mjs");
afterEach(cleanup);
const results = [
  { url: "https://nodejs.org/docs", title: "Node docs", snippet: "Runtime reference" },
  { url: "https://example.com/news", title: "Release notes", snippet: "Changes" },
];
const tool = (state, output) => ({ type: "tool", toolCallId: "web-1", toolName: "web_search", state, input: { query: "runtime" }, output });
test("web tools normalize sources and retain unknown output in the raw view", () => {
  const part = computeToolWidget(tool("output-available", { sources: [{ link: results[0].url, title: "Node docs", description: "Reference" }, { url: "javascript:alert(1)" }, null] }));
  assert.equal(part.name, "web-search");
  assert.deepEqual(part.props.results, [{ url: results[0].url, title: "Node docs", snippet: "Reference" }]);
  assert.equal(computeToolWidget(tool("output-available", "unrecognized output")), null);
  assert.equal(computeToolWidget(tool("input-available")).props.state, "running");
  assert.equal(computeToolWidget(tool("output-error")).props.state, "error");
  assert.equal(normalizeWebSearchResults([{ path: "src/index.ts" }, { url: "file:///etc/passwd" }]).length, 0);
  assert.equal(computeToolWidget({ ...tool("output-available", { results: [] }), toolName: "grep", input: { query: "runtime" } }).name, "search");
});
test("source cards use safe links and plain snippets without remote images", () => {
  const { container } = render(createElement(WebSearchWidget, { query: "runtime", defaultOpen: true, results: [...results, { url: "javascript:alert(1)", title: "Unsafe" }, { url: "https://example.com/plain", snippet: "<script>alert(1)</script>" }] }));
  assert.equal(screen.getAllByRole("link").length, 3);
  const link = screen.getByRole("link", { name: /Node docs/ });
  assert.equal(link.getAttribute("href"), results[0].url);
  assert.equal(link.getAttribute("rel"), "noopener noreferrer");
  assert.equal(container.querySelectorAll("script, img").length, 0);
  assert.ok(screen.getByText("<script>alert(1)</script>"));
});
test("more sources can expand and collapse", () => {
  render(createElement(WebSearchWidget, { query: "runtime", defaultOpen: true, results, maxResults: 1 }));
  assert.equal(screen.getAllByRole("link").length, 1);
  fireEvent.click(screen.getByRole("button", { name: "Show 1 more source" }));
  assert.equal(screen.getAllByRole("link").length, 2);
  fireEvent.click(screen.getByRole("button", { name: "Show fewer sources" }));
  assert.equal(screen.getAllByRole("link").length, 1);
});
test("running, empty, and failure states render through the shared tool frame", () => {
  const view = render(createElement(WebSearchWidget, { query: "runtime", state: "running" }));
  assert.ok(screen.getByText("Searching the web…"));
  view.rerender(createElement(WebSearchWidget, { query: "runtime", state: "error", error: "Provider unavailable" }));
  assert.equal(screen.getByRole("alert").textContent, "Provider unavailable");
  view.rerender(createElement(WebSearchWidget, { query: "runtime", defaultOpen: true }));
  assert.ok(screen.getByText("No web sources found."));
});
test("MessageContent automatically renders web_search using the registered widget", () => {
  const { container } = render(createElement(MessageContent, { parts: [tool("output-available", { results })] }));
  assert.ok(screen.getByText("Searched the web for"));
  assert.equal(container.querySelectorAll(".chat-web-search-source").length, 2);
});
