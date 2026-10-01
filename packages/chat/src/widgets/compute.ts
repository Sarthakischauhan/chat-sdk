import { parseArtifact } from "@sarchauhan/protocol";
import type { AgentToolPart, AgentWidgetPart } from "@sarchauhan/protocol";
import type { SearchResult, WidgetState } from "./types";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === "string");
const number = (...values: unknown[]) =>
  values.find(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
const aliases: Record<string, string> = {
  read: "read-file",
  read_file: "read-file",
  readFile: "read-file",
  "read-file": "read-file",
  patch: "patch",
  apply_patch: "patch",
  edit_file: "patch",
  edit: "patch",
  search: "search",
  grep: "search",
  file_search: "search",
  web_search: "search",
  question: "question",
  ask_question: "question",
};
export function computeToolState(part: AgentToolPart): WidgetState {
  if (part.state === "output-error") return "error";
  if (part.state === "output-denied") return "denied";
  if (part.state === "approval-requested") return "approval";
  return part.state === "output-available" && !part.preliminary
    ? "complete"
    : "running";
}
export function normalizeSearchResults(value: unknown): SearchResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const result = record(item);
    const path = string(result.path, result.file, result.url);
    if (!path) return [];
    return [
      {
        path,
        line: number(result.line, result.lineNumber),
        text: string(result.text, result.snippet, result.content),
        title: string(result.title),
        url: string(result.url),
      },
    ];
  });
}
/** Convert known tool payloads; unknown or incomplete formats retain the raw tool view. */
export function computeToolWidget(part: AgentToolPart): AgentWidgetPart | null {
  const name = aliases[part.toolName];
  if (!name) {
    // Explicit artifact envelopes work across harnesses without guessing filesystem paths.
    const output = record(part.output);
    if (part.state !== "output-available") return null;
    if (Array.isArray(output.artifacts)) {
      const artifacts = output.artifacts.flatMap((value) => {
        const artifact = parseArtifact(value); return artifact ? [artifact] : [];
      });
      return artifacts.length ? { type: "widget", name: "artifacts", id: part.toolCallId, props: { artifacts } } : null;
    }
    const artifact = parseArtifact(output.artifact);
    return artifact ? { type: "widget", name: "artifact", id: part.toolCallId, props: { artifact } } : null;
  }
  const input = record(part.input),
    output = record(part.output);
  const values = { ...input, ...output };
  const common = { state: computeToolState(part), error: part.errorText };
  let props: Record<string, unknown>;
  if (name === "read-file") {
    const path = string(
      values.path,
      values.file,
      values.filename,
      values.file_path,
    );
    if (!path) return null;
    props = {
      ...common,
      path,
      content: string(output.content, output.text, part.output),
      startLine: number(values.startLine, values.start_line, values.offset),
      language: string(values.language),
    };
    if (part.state === "output-available" && props.content === undefined)
      return null;
  } else if (name === "patch") {
    const before = string(values.before, values.old_string, values.oldText);
    const after = string(values.after, values.new_string, values.newText);
    const diff =
      string(
        output.diff,
        output.patch,
        input.diff,
        input.patch,
        part.input,
        part.output,
      ) ??
      (before !== undefined && after !== undefined
        ? computeTextDiff(
            before,
            after,
            string(values.path, values.file_path, "file"),
          )
        : undefined);
    if (
      diff === undefined ||
      (diff && !/^(@@|diff --git|--- |\*\*\* Begin Patch)/m.test(diff))
    )
      return null;
    props = {
      ...common,
      path: string(values.path, values.file, values.file_path),
      diff,
    };
  } else if (name === "search") {
    const query = string(values.query, values.pattern, values.search);
    if (query === undefined) return null;
    const results =
      output.results ??
      output.matches ??
      (Array.isArray(part.output) ? part.output : undefined);
    if (part.state === "output-available" && !Array.isArray(results))
      return null;
    props = {
      ...common,
      query,
      results: normalizeSearchResults(results),
      total: number(output.total, output.totalCount),
    };
  } else {
    if (
      ["output-error", "output-denied", "approval-requested"].includes(
        part.state,
      )
    )
      return null;
    // The answer output is not a new question. Keep the original prompt and choices.
    const prompt = string(input.prompt, input.question);
    if (!prompt) return null;
    props = { ...input, prompt };
  }
  return {
    type: "widget",
    name,
    id: part.toolCallId,
    props,
    interactive: name === "question" && part.state === "input-available",
  };
}

export type DiffLine = {
  kind: "add" | "remove" | "context" | "header";
  text: string;
  oldLine?: number;
  newLine?: number;
};
/** Parse unified diffs (including multiple files) without counting file headers as edits. */
export function computeDiff(diff: string) {
  let oldLine = 0,
    newLine = 0,
    inHunk = false,
    oldRemaining = 0,
    newRemaining = 0,
    additions = 0,
    deletions = 0;
  const lines: DiffLine[] = diff
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((text) => {
      const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(text);
      if (hunk) {
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[3]);
        oldRemaining = Number(hunk[2] ?? 1);
        newRemaining = Number(hunk[4] ?? 1);
        inHunk = true;
        return { kind: "header", text };
      }
      if (oldRemaining === 0 && newRemaining === 0) inHunk = false;
      if (!inHunk && /^(diff --git|--- |\+\+\+ |\*\*\* )/.test(text)) {
        inHunk = false;
        return { kind: "header", text };
      }
      // apply_patch has unnumbered hunks; counts remain useful without invented line numbers.
      if (text.startsWith("@@")) {
        inHunk = false;
        return { kind: "header", text };
      }
      if (text.startsWith("+")) {
        additions++;
        if (inHunk) newRemaining--;
        return { kind: "add", text, newLine: inHunk ? newLine++ : undefined };
      }
      if (text.startsWith("-")) {
        deletions++;
        if (inHunk) oldRemaining--;
        return {
          kind: "remove",
          text,
          oldLine: inHunk ? oldLine++ : undefined,
        };
      }
      if (inHunk && text.startsWith(" ")) {
        oldRemaining--;
        newRemaining--;
        return {
          kind: "context",
          text,
          oldLine: oldLine++,
          newLine: newLine++,
        };
      }
      return { kind: "header", text };
    });
  return { lines, additions, deletions };
}
export function safeResultUrl(url?: string): string | undefined {
  try {
    const parsed = new URL(url ?? "");
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** Compute a unified replacement hunk with three context lines. Common edges stay out of the diff. */
export function computeTextDiff(
  before: string,
  after: string,
  path = "file",
): string {
  if (before === after) return "";
  const split = (text: string) =>
    text === ""
      ? []
      : text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  const oldLines = split(before),
    newLines = split(after);
  let prefix = 0,
    suffix = 0;
  while (
    prefix < oldLines.length &&
    prefix < newLines.length &&
    oldLines[prefix] === newLines[prefix]
  )
    prefix++;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] ===
      newLines[newLines.length - 1 - suffix]
  )
    suffix++;
  if (before.endsWith("\n") !== after.endsWith("\n")) suffix = 0;
  // If only the final newline changed, include the last line as a replacement.
  if (prefix === oldLines.length && prefix === newLines.length) {
    prefix = Math.max(0, prefix - 1);
    suffix = 0;
  }
  const start = Math.max(0, prefix - 3),
    tail = Math.min(3, suffix);
  const oldEnd = oldLines.length - suffix,
    newEnd = newLines.length - suffix;
  const oldCount = oldEnd + tail - start,
    newCount = newEnd + tail - start;
  const label = path.replace(/[\r\n]/g, "");
  const body = [
    ...oldLines.slice(start, prefix).map((line) => " " + line),
    ...oldLines
      .slice(prefix, oldEnd)
      .flatMap((line, index) => [
        "-" + line,
        ...(prefix + index === oldLines.length - 1 && !before.endsWith("\n")
          ? ["\\ No newline at end of file"]
          : []),
      ]),
    ...newLines
      .slice(prefix, newEnd)
      .flatMap((line, index) => [
        "+" + line,
        ...(prefix + index === newLines.length - 1 && !after.endsWith("\n")
          ? ["\\ No newline at end of file"]
          : []),
      ]),
    ...oldLines.slice(oldEnd, oldEnd + tail).map((line) => " " + line),
  ];
  return [
    `--- a/${label}`,
    `+++ b/${label}`,
    `@@ -${oldCount ? start + 1 : start},${oldCount} +${newCount ? start + 1 : start},${newCount} @@`,
    ...body,
  ].join("\n");
}
