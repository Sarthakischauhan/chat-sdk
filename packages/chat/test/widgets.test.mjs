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
    tool("read_file", { path: "src/a.ts", startLine: 9 }, { content: "hello" }),
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
test("read-file content comes only from output.content", () => {
  // A plain string or `text` is not the read-file contract; with no content
  // a finished read keeps the raw tool view.
  assert.equal(computeToolWidget(tool("read_file", { path: "a" }, "hello")), null);
  assert.equal(computeToolWidget(tool("read_file", { path: "a" }, { text: "hello" })), null);
  assert.equal(
    computeToolWidget(tool("read_file", { path: "a" }, { content: "hello", text: "other" })).props.content,
    "hello",
  );
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
  assert.deepEqual(Object.keys(prebuiltWidgets).sort(), [
    "approval",
    "artifact",
    "artifacts",
    "asked",
    "patch",
    "question",
    "read-file",
    "search",
    "subagent",
    "terminal",
    "web-search",
  ]);
});

// Patch line numbers: a before/after edit is numbered from where it sits in the file.
const gutter = (diff) =>
  computeDiff(diff).lines.filter((line) => line.kind !== "header").map((line) => [line.kind, line.oldLine, line.newLine]);
test("text diffs use file line numbers from startLine (summary.start_line)", () => {
  const diff = computeTextDiff("a\nb\nc\n", "a\nB\nc\n", "f.py", 42);
  assert.match(diff, /@@ -42,3 \+42,3 @@/);
  assert.deepEqual(gutter(diff), [
    ["context", 42, 42],
    ["remove", 43, undefined],
    ["add", undefined, 43],
    ["context", 44, 44],
  ]);
  // Default and invalid starts keep the snippet-relative numbering.
  assert.match(computeTextDiff("a\n", "b\n"), /@@ -1,1 \+1,1 @@/);
  assert.match(computeTextDiff("a\n", "b\n", "f", 0), /@@ -1,1 \+1,1 @@/);
});
test("insert at top and delete at end headers", () => {
  // Insert above the first line of the file.
  const top = computeTextDiff("first\n", "new\nfirst\n", "f", 1);
  assert.match(top, /@@ -1,1 \+1,2 @@/);
  assert.deepEqual(gutter(top), [
    ["add", undefined, 1],
    ["context", 1, 2],
  ]);
  // Delete the last two lines of a 20-line file (match at line 19).
  const end = computeTextDiff("y\nz\n", "", "f", 19);
  assert.match(end, /@@ -19,2 \+18,0 @@/);
  assert.deepEqual(gutter(end).map((row) => row[1]), [19, 20]);
});
test("multi-hunk diffs number each hunk from its own header", () => {
  const diff = "@@ -10,2 +10,2 @@\n a\n-b\n+B\n@@ -40,2 +40,3 @@\n c\n+new\n d\n";
  assert.deepEqual(gutter(diff), [
    ["context", 10, 10],
    ["remove", 11, undefined],
    ["add", undefined, 11],
    ["context", 40, 40],
    ["add", undefined, 41],
    ["context", 41, 42],
  ]);
});
test("patch widgets take the start line from the protocol summary", () => {
  const part = tool(
    "patch",
    { path: "f.py", before: "x = 1\n", after: "x = 2\n" },
    { output: "patched f.py at line 120 (1 replacement(s), +0 bytes)", summary: { added: 1, removed: 1, start_line: 120 } },
  );
  const widget = computeToolWidget(part);
  assert.equal(widget.props.startLine, 120);
  assert.equal(widget.props.summary.startLine, 120);
  assert.match(widget.props.diff, /@@ -120,1 \+120,1 @@/);
  const html = renderToStaticMarkup(createElement(prebuiltWidgets.patch.component, widget.props));
  assert.match(html, />120</);
  assert.doesNotMatch(html, /chat-line-number"[^>]*>1</);
});
test("the registry Patch forwards startLine and summary.start_line", () => {
  // No precomputed diff: the widget builds it from before/after and startLine.
  const html = renderToStaticMarkup(
    createElement(prebuiltWidgets.patch.component, { before: "x = 1\n", after: "x = 2\n", startLine: 120, summary: { startLine: 120 } }),
  );
  assert.match(html, />120</);
  assert.doesNotMatch(html, /chat-line-number"[^>]*>1</);
});
test("patch start lines come only from summary.start_line", () => {
  const widget = computeToolWidget(
    tool("patch", { path: "f.py", before: "x = 1\n", after: "x = 2\n", startLine: 7, start_line: 7 }, { start_line: 7, message: "patched" }),
  );
  assert.equal(widget.props.startLine, undefined);
  assert.match(widget.props.diff, /@@ -1,1 \+1,1 @@/);
});
