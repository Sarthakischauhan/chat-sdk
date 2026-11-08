import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GenericToolWidget, toolLabel, toolResultText } from "../dist/widgets.mjs";
import { MessageContent, WidgetProvider } from "../dist/index.mjs";

const tool = (fields) => ({
  type: "tool",
  toolCallId: "t1",
  toolName: "write_file",
  state: "output-available",
  input: { path: "src/cursor.ts", content: "export const secret = 1;\n" },
  ...fields,
});
const message = (part) =>
  renderToStaticMarkup(createElement(WidgetProvider, {}, createElement(MessageContent, { parts: [part] })));

test("tools without a prebuilt widget render as a row whose body is only the result", () => {
  const html = message(tool({ output: { output: "Wrote src/cursor.ts (2 lines)", durationMs: 9 } }));
  assert.match(html, /chat-tool-widget/);
  assert.match(html, /Write file/);
  assert.match(html, /chat-tool-widget-title" title="src\/cursor.ts"/);
  assert.match(html, /<pre class="chat-tool-result">Wrote src\/cursor.ts \(2 lines\)<\/pre>/);
  assert.match(html, /9ms/);
  // Never the call's arguments, run facts or section labels as a JSON dump.
  assert.doesNotMatch(html, /agent-tool|Input|Output|durationMs|secret/);
});

test("a failed generic call shows its error once and no result", () => {
  const error = "Error: memory index is not built for this workspace";
  const html = message(
    tool({ toolName: "memory_search", state: "output-error", input: { query: "replay" }, output: { durationMs: 31 }, errorText: error }),
  );
  assert.match(html, /data-state="error"/);
  assert.match(html, /Memory search/);
  assert.match(html, /failed/);
  assert.equal(html.split(error).length, 2);
  assert.doesNotMatch(html, /chat-tool-result|durationMs/);
});

test("a failed call whose message is only in the output still shows it as the error", () => {
  const html = renderToStaticMarkup(
    createElement(GenericToolWidget, { part: tool({ state: "output-error", output: "disk full" }) }),
  );
  assert.match(html, /role="alert">disk full/);
  assert.equal(html.split("disk full").length, 2);
});

test("rows with nothing to show have no body or chevron", () => {
  const running = renderToStaticMarkup(
    createElement(GenericToolWidget, { part: tool({ state: "input-available", output: undefined }) }),
  );
  assert.match(running, /data-state="running"/);
  assert.doesNotMatch(running, /chat-tool-widget-body|chat-tool-widget-chevron/);
  const empty = renderToStaticMarkup(
    createElement(GenericToolWidget, { part: tool({ input: {}, output: { durationMs: 4 } }) }),
  );
  assert.doesNotMatch(empty, /chat-tool-widget-body|chat-tool-widget-chevron|chat-tool-widget-title/);
});

test("result text drops run facts and keeps structured results", () => {
  assert.equal(toolResultText(undefined), undefined);
  assert.equal(toolResultText("  "), undefined);
  assert.equal(toolResultText("done"), "done");
  assert.equal(toolResultText({ durationMs: 3, summary: {}, exitCode: 0 }), undefined);
  assert.equal(toolResultText({ output: "ok", startedAt: "x" }), "ok");
  assert.equal(toolResultText({ hits: 2, durationMs: 3 }), JSON.stringify({ hits: 2 }, null, 2));
});

test("labels read as words", () => {
  assert.equal(toolLabel("write_file"), "Write file");
  assert.equal(toolLabel("memorySearch"), "Memory search");
  assert.equal(toolLabel("spawn-agent"), "Spawn agent");
  assert.equal(toolLabel(""), "Tool");
});
