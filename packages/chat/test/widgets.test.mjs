import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  computeDiff,
  computeTextDiff,
  computeToolWidget,
  ReadFileWidget,
  SearchWidget,
  QuestionWidget,
  prebuiltWidgets,
  safeResultUrl,
} from "../dist/widgets.mjs";
const tool = (toolName, input, output, state = "output-available") => ({
  type: "tool",
  toolName,
  toolCallId: "t1",
  state,
  input,
  output,
});
test("known tools merge input context with outputs and preserve error state", () => {
  const read = computeToolWidget(
    tool("read_file", { path: "src/a.ts", startLine: 9 }, "hello"),
  );
  assert.equal(read.props.path, "src/a.ts");
  assert.equal(read.props.content, "hello");
  assert.equal(read.props.startLine, 9);
  assert.equal(
    computeToolWidget({
      ...tool("read", { path: "a" }, undefined, "output-error"),
      errorText: "missing",
    }).props.error,
    "missing",
  );
  assert.equal(
    computeToolWidget(tool("read", { path: "a" }, { other: "unsupported" })),
    null,
  );
  assert.equal(computeToolWidget(tool("unknown", {}, {})), null);
});
test("search normalizes file and web results, skips malformed entries", () => {
  const result = computeToolWidget(
    tool(
      "grep",
      { pattern: "foo" },
      {
        matches: [
          { file: "a", lineNumber: 2, snippet: "foo" },
          null,
          {},
          { url: "https://example.com", title: "Example" },
        ],
      },
    ),
  );
  assert.equal(result.props.query, "foo");
  assert.equal(result.props.results.length, 2);
  assert.equal(result.props.results[0].line, 2);
  assert.equal(
    computeToolWidget(tool("grep", { pattern: "foo" }, "unknown text")),
    null,
  );
});
test("completed questions preserve prompt but cannot submit", () => {
  assert.equal(
    computeToolWidget(
      tool("question", { prompt: "Choose", options: ["A"] }, { answer: "A" }),
    ).interactive,
    false,
  );
  assert.equal(
    computeToolWidget(
      tool("question", { prompt: "Choose" }, undefined, "input-available"),
    ).interactive,
    true,
  );
});
test("unified multi-file diffs count edits and reset line numbers", () => {
  const result = computeDiff(
    "--- a/a\n+++ b/a\n@@ -8,2 +8,2 @@\n keep\n-old\n+new\ndiff --git a/b b/b\n--- a/b\n+++ b/b\n@@ -0,0 +1,1 @@\n+created\n",
  );
  assert.equal(result.additions, 2);
  assert.equal(result.deletions, 1);
  assert.deepEqual(
    result.lines
      .filter((line) => line.kind === "add")
      .map((line) => line.newLine),
    [9, 1],
  );
  assert.equal(
    computeDiff("@@ -1 +1 @@\n--- content\n+++ content").additions,
    1,
  );
});
test("computed text diff handles creation, deletion, equality, context and newline changes", () => {
  assert.equal(computeTextDiff("same", "same"), "");
  assert.match(computeTextDiff("", "new\n"), /@@ -0,0 \+1,1 @@/);
  assert.match(computeTextDiff("old\n", ""), /@@ -1,1 \+0,0 @@/);
  const diff = computeTextDiff("a\nb\nc\n", "a\nB\nc\n");
  assert.match(diff, / a\n-b\n\+B\n c/);
  assert.equal(computeDiff(diff).additions, 1);
  assert.match(computeTextDiff("a", "a\n"), /No newline at end of file/);
  assert.equal(
    computeToolWidget(
      tool(
        "edit",
        { file_path: "a", old_string: "old", new_string: "new" },
        { success: true },
      ),
    ).name,
    "patch",
  );
});
test("read previews escape markup, bound rendering and preserve line numbers", () => {
  const html = renderToStaticMarkup(
    createElement(ReadFileWidget, {
      path: "a",
      content: "<script>\nsecond\nthird",
      startLine: 9,
      maxLines: 2,
    }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, />9</);
  assert.doesNotMatch(html, />third</);
  assert.match(html, /Show 1 more/);
});
test("search blocks executable links and renders empty states", () => {
  assert.equal(safeResultUrl("javascript:alert(1)"), undefined);
  const html = renderToStaticMarkup(
    createElement(SearchWidget, {
      query: "x",
      results: [{ path: "a", url: "javascript:alert(1)" }],
    }),
  );
  assert.doesNotMatch(html, /href=/);
  assert.match(
    renderToStaticMarkup(createElement(SearchWidget, { query: "x" })),
    /No results found/,
  );
});
test("question presents native input semantics and disables without handler", () => {
  const html = renderToStaticMarkup(
    createElement(QuestionWidget, {
      prompt: "Choose",
      multiple: true,
      options: ["A", "B"],
    }),
  );
  assert.match(html, /type="checkbox"/);
  assert.match(html, /fieldset disabled/);
  assert.match(html, /Confirm/);
  assert.deepEqual(Object.keys(prebuiltWidgets), [
    "read-file",
    "patch",
    "search",
    "question",
  ]);
});
