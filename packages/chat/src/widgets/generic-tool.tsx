"use client";
import type { AgentToolPart } from "@sarchauhan/protocol";
import { Wrench } from "lucide-react";
import { computeToolState, runFacts } from "./compute";
import { ToolFrame } from "./tool-frame";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Run facts a host merges into a tool's output; they are shown in the row, not the body. */
const RUN_FACTS = new Set(["summary", "startedAt", "durationMs", "exitCode", "chunks"]);

/**
 * The body text for a finished call: a string result as is, a lone `output`
 * string, or the remaining structured result without its run facts. Undefined
 * when there is nothing to show. The call's input is never part of it.
 */
export function toolResultText(output: unknown): string | undefined {
  if (output === undefined || output === null) return undefined;
  if (typeof output === "string") return output.trim() ? output : undefined;
  if (!isRecord(output)) return String(output);
  const rest = Object.fromEntries(Object.entries(output).filter(([key]) => !RUN_FACTS.has(key)));
  const keys = Object.keys(rest);
  if (keys.length === 0) return undefined;
  if (keys.length === 1 && typeof rest.output === "string") return rest.output.trim() ? rest.output : undefined;
  try {
    return JSON.stringify(rest, null, 2);
  } catch {
    return String(output);
  }
}

/** The call's target from its arguments (path, query, command, …), shown as the mono title. */
function toolTarget(input: unknown): string {
  if (!isRecord(input)) return "";
  for (const key of ["path", "file", "filename", "file_path", "query", "command", "url", "name"]) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

/** `write_file` -> "Write file", `memorySearch` -> "Memory search". */
export function toolLabel(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "Tool";
}

/**
 * Any tool call without a prebuilt widget, drawn as the same inline row as the
 * prebuilt ones. The expanded body is the result only (or the error); the call's
 * arguments appear only as the row's target, never as a JSON dump.
 */
export function GenericToolWidget({ part, className }: { part: AgentToolPart; className?: string }) {
  const state = computeToolState(part);
  const facts = runFacts(isRecord(part.output) ? part.output : {});
  const result = state === "complete" ? toolResultText(part.output) : undefined;
  // A failed call shows its error once; hosts that put the message in `output` still get it shown.
  const error =
    part.errorText || (state === "error" || state === "denied" ? toolResultText(part.output) : undefined);
  return (
    <ToolFrame
      icon={Wrench}
      label={part.title ?? toolLabel(part.toolName)}
      title={toolTarget(part.input)}
      state={state}
      error={error}
      startedAt={facts.startedAt}
      durationMs={facts.durationMs}
      exitCode={facts.exitCode}
      className={className}
    >
      {result === undefined ? null : <pre className="chat-tool-result">{result}</pre>}
    </ToolFrame>
  );
}
