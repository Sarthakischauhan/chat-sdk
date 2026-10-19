"use client";
import { useMemo, useState } from "react";
import { computeDiff, computeTextDiff } from "./compute";
import { FilePen } from "lucide-react";
import { ToolFrame } from "./tool-frame";
import type { PatchWidgetProps } from "./types";
export function PatchWidget({
  path = "File changes",
  diff: rawDiff,
  before,
  after,
  startLine = 1,
  maxLines = 100,
  summary,
  ...props
}: PatchWidgetProps) {
  const diff = useMemo(
    () =>
      rawDiff ??
      (before !== undefined && after !== undefined
        ? computeTextDiff(before, after, path, startLine)
        : ""),
    [rawDiff, before, after, path, startLine],
  );
  const [expanded, setExpanded] = useState(false);
  const { lines, additions: derivedAdded, deletions: derivedRemoved } = useMemo(
    () => computeDiff(diff),
    [diff],
  );
  const additions = typeof summary?.added === "number" ? summary.added : derivedAdded;
  const deletions = typeof summary?.removed === "number" ? summary.removed : derivedRemoved;
  const limit = Math.max(1, maxLines);
  return (
    <ToolFrame
      {...props}
      icon={FilePen}
      label="Edited"
      activeLabel="Editing"
      defaultOpen
      title={path}
      meta={
        <>
          <span className="chat-diff-add-count">+{additions}</span>{" "}
          <span className="chat-diff-remove-count">−{deletions}</span>
        </>
      }
    >
      {diff ? (
        <div
          className="chat-code-preview chat-diff"
          role="region"
          aria-label={`Diff for ${path}`}
          tabIndex={0}
        >
          {(expanded ? lines : lines.slice(0, limit)).map((line, index) => (
            <div className="chat-code-line" data-kind={line.kind} key={index}>
              <span className="chat-line-number" aria-hidden="true">
                {line.oldLine}
              </span>
              <span className="chat-line-number" aria-hidden="true">
                {line.newLine}
              </span>
              <code>{line.text || " "}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className="chat-widget-empty">No changes supplied.</p>
      )}
      {!expanded && lines.length > limit ? (
        <button
          className="chat-widget-more"
          type="button"
          onClick={() => setExpanded(true)}
        >
          Show full diff ({lines.length} lines)
        </button>
      ) : null}
    </ToolFrame>
  );
}
