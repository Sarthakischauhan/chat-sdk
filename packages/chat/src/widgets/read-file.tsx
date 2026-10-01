"use client";
import { useState } from "react";
import { ToolFrame } from "./tool-frame";
import type { ReadFileWidgetProps } from "./types";
export function ReadFileWidget({
  path,
  content,
  startLine = 1,
  language,
  maxLines = 80,
  ...props
}: ReadFileWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const lines = content?.split(/\r?\n/) ?? [];
  const limit = Math.max(1, maxLines);
  const firstLine = Math.max(1, Math.floor(startLine));
  return (
    <ToolFrame
      {...props}
      label="Read file"
      title={path}
      meta={lines.length ? `${lines.length} lines` : language}
    >
      {content === undefined ? (
        <p className="chat-widget-empty">
          {props.state === "running"
            ? "Reading file…"
            : "No file content supplied."}
        </p>
      ) : (
        <div
          className="chat-code-preview"
          role="region"
          aria-label={`Contents of ${path}`}
          tabIndex={0}
        >
          {(expanded ? lines : lines.slice(0, limit)).map((line, index) => (
            <div className="chat-code-line" key={index}>
              <span className="chat-line-number" aria-hidden="true">
                {firstLine + index}
              </span>
              <code>{line || " "}</code>
            </div>
          ))}
        </div>
      )}
      {!expanded && lines.length > limit ? (
        <button
          className="chat-widget-more"
          type="button"
          onClick={() => setExpanded(true)}
        >
          Show {lines.length - limit} more lines
        </button>
      ) : null}
    </ToolFrame>
  );
}
