// Run with: node --experimental-strip-types --test examples/next-symphony/test/normalize.test.ts (Node >= 22.6)
import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentEvent } from "@sarchauhan/protocol";
import { normalizeSymphonyStream } from "../lib/symphony/normalize.ts";

type Frame = { event_type: string; payload: Record<string, unknown> };

const streamOf = (frames: Frame[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const frame of frames) controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      controller.close();
    },
  });

const collect = async (frames: Frame[]) => {
  const events: AgentEvent[] = [];
  for await (const event of normalizeSymphonyStream(streamOf(frames), "m1")) events.push(event);
  return events;
};
const widgets = (events: AgentEvent[], name: string) =>
  events.flatMap((event) =>
    event.type === "data-widget" && typeof event.data === "object" && event.data !== null && "name" in event.data && event.data.name === name && "props" in event.data
      ? [event.data.props as Record<string, unknown>]
      : [],
  );

test("bash streams stdout/stderr and carries exit code, duration, started_at", async () => {
  const events = await collect([
    { event_type: "tool_call_started", payload: { tool_call_id: "t1", tool_name: "bash" } },
    { event_type: "tool_execution_started", payload: { tool_call_id: "t1", tool_name: "bash", arguments: { command: "npm test" }, started_at: "2026-10-18T10:00:00Z", call_id: "c1", parent_call_id: null } },
    { event_type: "tool_execution_output", payload: { tool_call_id: "t1", tool_name: "bash", delta: "ok\n", stream: "stdout" } },
    { event_type: "tool_execution_output", payload: { tool_call_id: "t1", tool_name: "bash", delta: "boom\n", stream: "stderr" } },
    { event_type: "tool_execution_completed", payload: { tool_call_id: "t1", tool_name: "bash", status: "error", result: "boom", duration_ms: 1400, exit_code: 1 } },
  ]);
  const terminal = widgets(events, "terminal");
  assert.equal(terminal[0].state, "running");
  assert.equal(terminal[0].startedAt, "2026-10-18T10:00:00Z");
  const last = terminal[terminal.length - 1];
  assert.deepEqual(last.chunks, [{ stream: "stdout", text: "ok\n" }, { stream: "stderr", text: "boom\n" }]);
  assert.equal(last.exitCode, 1);
  assert.equal(last.durationMs, 1400);
  assert.equal(last.state, "error");
  assert.ok(!events.some((event) => event.type === "tool-input-available"));
});

test("old sessions without new fields fall back: no exit code or time, result as output", async () => {
  const events = await collect([
    { event_type: "tool_execution_started", payload: { tool_call_id: "t1", tool_name: "bash", arguments: { command: "ls" } } },
    { event_type: "tool_execution_completed", payload: { tool_call_id: "t1", tool_name: "bash", status: "success", result: "a\nb" } },
  ]);
  const last = widgets(events, "terminal").at(-1)!;
  assert.equal(last.exitCode, undefined);
  assert.equal(last.durationMs, undefined);
  assert.equal(last.output, "a\nb");
});

test("read/patch/search completions carry summary counts", async () => {
  const events = await collect([
    { event_type: "tool_execution_started", payload: { tool_call_id: "r1", tool_name: "read_file", arguments: { path: "src/a.ts" } } },
    { event_type: "tool_execution_completed", payload: { tool_call_id: "r1", tool_name: "read_file", status: "success", result: "x", duration_ms: 5, summary: { lines: 120, matches: null, added: null, removed: null } } },
  ]);
  const read = widgets(events, "read-file").at(-1)!;
  assert.deepEqual(read.summary, { lines: 120, matches: null, added: null, removed: null });
  assert.equal(read.path, "src/a.ts");
});

test("approval requests use choices/default and the request id", async () => {
  const events = await collect([
    { event_type: "input_requested", payload: { kind: "approval", request_id: "q1", question: "Overwrite?", choices: ["Deny", "Always allow", "Allow once"], default: "Allow once", tool_name: "write_file", tool_call_id: "w1", target: "src/retry.ts", detail: "exists", bytes: 1204 } },
  ]);
  const approval = events.find((event) => event.type === "data-widget");
  assert.ok(approval && approval.type === "data-widget");
  assert.equal(approval.id, "q1");
  const props = widgets(events, "approval")[0];
  assert.deepEqual(props.choices, ["Deny", "Always allow", "Allow once"]);
  assert.equal(props.default, "Allow once");
  assert.equal(props.bytes, 1204);
});

test("subagent steps nest under the spawning call via parent_call_id", async () => {
  const events = await collect([
    { event_type: "agent_spawned", payload: { child_id: "child-1", tool_call_id: "spawn-1", label: "Audit" } },
    { event_type: "subagent_step", payload: { agent_id: "child-1", parent_id: "root", parent_call_id: "spawn-1", turn: 1, started_at: "2026-10-18T10:00:00Z" } },
    { event_type: "tool_execution_started", payload: { tool_call_id: "ct1", tool_name: "read_file", arguments: { path: "tests/t.py" }, parent_call_id: "spawn-1", started_at: "2026-10-18T10:00:01Z" } },
    { event_type: "tool_execution_completed", payload: { tool_call_id: "ct1", tool_name: "read_file", status: "success", result: "x", duration_ms: 20, parent_call_id: "spawn-1" } },
  ]);
  const last = widgets(events, "subagent").at(-1)!;
  assert.equal(last.parentCallId, "spawn-1");
  assert.deepEqual(last.steps, [{ id: "tool-ct1", label: "read_file", target: "tests/t.py", state: "complete", startedAt: "2026-10-18T10:00:01Z", durationMs: 20 }]);
  assert.ok(!widgets(events, "read-file").length, "child tool calls stay inside the subagent");
});
