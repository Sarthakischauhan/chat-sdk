import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createAgentMessageState, applyAgentEvent, createSubagentData, createArtifactData, parseArtifact, parseSubagent } from "@sarchauhan/protocol";
import { ArtifactWidget, SubagentWidget, safeArtifactUrl, computeToolWidget } from "../dist/widgets.mjs";
const artifact = { id: "a1", filename: "report.md", mediaType: "text/markdown", url: "/files/report.md", content: "# Report" };
const agent = { id: "s1", title: "Research", state: "running", task: "Compare implementations" };
test("subagent snapshots update one row and preserve other agents and text", () => {
  let state = createAgentMessageState("m1");
  state = applyAgentEvent(state, { type: "text-start", id: "text" });
  state = applyAgentEvent(state, { type: "text-delta", id: "text", delta: "Delegating" });
  state = applyAgentEvent(state, createSubagentData(agent));
  state = applyAgentEvent(state, createSubagentData({ ...agent, id: "s2", title: "Implementation" }));
  state = applyAgentEvent(state, createSubagentData({ ...agent, state: "completed", summary: "Done" }));
  assert.equal(state.message.parts.length, 3);
  assert.equal(state.message.parts[1].data.state, "completed");
  assert.equal(state.message.parts[2].data.id, "s2");
  assert.equal(state.message.parts[0].text, "Delegating");
});
test("artifact snapshots update in place, scoped by data name", () => {
  let state = createAgentMessageState();
  state = applyAgentEvent(state, createArtifactData({ ...artifact, status: "creating" }));
  state = applyAgentEvent(state, createSubagentData({ ...agent, id: artifact.id }));
  state = applyAgentEvent(state, createArtifactData({ ...artifact, status: "ready" }));
  assert.equal(state.message.parts.length, 2);
  assert.equal(state.message.parts[0].data.status, "ready");
  const unchanged = applyAgentEvent(state, { ...createSubagentData(agent), transient: true });
  assert.deepEqual(unchanged.message.parts, state.message.parts);
});
test("existing generic data remains append-only", () => {
  let state = createAgentMessageState();
  state = applyAgentEvent(state, { type: "data-custom", id: "x", data: 1 });
  state = applyAgentEvent(state, { type: "data-custom", id: "x", data: 2 });
  assert.equal(state.message.parts.length, 2);
});
test("snapshot parsers reject malformed envelopes and sanitize optional fields", () => {
  assert.equal(parseArtifact({ filename: "a" }), null);
  assert.equal(parseSubagent({ ...agent, state: "invented" }), null);
  assert.equal(parseSubagent({ ...agent, progress: 2 }).progress, 1);
  assert.equal(parseArtifact({ ...artifact, sizeBytes: -1 }).sizeBytes, undefined);
  assert.equal(parseSubagent({ ...agent, messages: [null, { id: "x", role: "assistant", parts: [null, { type: "text", text: "hello" }] }] }).messages[0].parts[0].text, "hello");
});
test("artifact links reject executable URLs and allow raster images without SVG", () => {
  assert.equal(safeArtifactUrl("javascript:alert(1)"), undefined);
  assert.equal(safeArtifactUrl("data:text/html;base64,AAAA"), undefined);
  assert.equal(safeArtifactUrl("data:image/svg+xml;base64,AAAA", true), undefined);
  assert.equal(safeArtifactUrl("data:image/png;base64,AAAA", true), "data:image/png;base64,AAAA");
  assert.equal(safeArtifactUrl("/files/report.md"), "/files/report.md");
});
test("artifact views escape inline HTML and never preview it as a document", () => {
  const html = renderToStaticMarkup(createElement(ArtifactWidget, { artifact: { ...artifact, content: "<script>alert(1)</script>" } }));
  assert.doesNotMatch(html, /<script|<iframe/);
  assert.match(html, /report.md/);
  assert.match(html, /Download/);
  const pending = renderToStaticMarkup(createElement(ArtifactWidget, { artifact: { ...artifact, status: "creating" } }));
  assert.doesNotMatch(pending, /href=/);
});
test("explicit artifact tool outputs compute a view; local paths do not", () => {
  const tool = { type: "tool", toolName: "generate_file", toolCallId: "t", state: "output-available" };
  assert.equal(computeToolWidget({ ...tool, output: { artifact } }).name, "artifact");
  assert.equal(computeToolWidget({ ...tool, output: { artifacts: [artifact, null] } }).props.artifacts.length, 1);
  assert.equal(computeToolWidget({ ...tool, output: { path: "/tmp/a" } }), null);
});
test("subagent summary uses an inspect action and preserves failed state", () => {
  const html = renderToStaticMarkup(createElement(SubagentWidget, { subagent: { ...agent, state: "failed", error: "Timed out" } }));
  assert.match(html, /View activity for Research/);
  assert.match(html, /Timed out/);
  assert.match(html, /data-state="failed"/);
});
