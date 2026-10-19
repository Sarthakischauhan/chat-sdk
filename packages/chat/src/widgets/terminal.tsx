"use client";
import { useState } from "react";
import { formatDuration } from "./format";
import { ToolFrame } from "./tool-frame";
import type { TerminalWidgetProps } from "./types";

/** Ran row with a collapsible terminal block. stderr chunks are styled separately. */
export function TerminalWidget({ command, chunks, output, maxLines = 400, ...props }: TerminalWidgetProps) {
  const [copied, setCopied] = useState(false);
  const streamed = chunks && chunks.length ? chunks : output ? [{ stream: "stdout" as const, text: output }] : [];
  const text = streamed.map((chunk) => chunk.text).join("");
  const lineCount = text ? text.replace(/\n$/, "").split("\n").length : 0;
  const footer = [
    typeof props.exitCode === "number" ? `exit ${props.exitCode}` : undefined,
    typeof props.durationMs === "number" ? formatDuration(props.durationMs) : undefined,
  ].filter((part): part is string => part !== undefined);
  // Keep the tail when output is long: drop whole leading chunks past maxLines.
  let visible = streamed;
  if (lineCount > maxLines) {
    let lines = 0;
    const kept: typeof streamed = [];
    for (let index = streamed.length - 1; index >= 0 && lines < maxLines; index--) {
      kept.unshift(streamed[index]);
      lines += streamed[index].text.split("\n").length - 1;
    }
    visible = kept;
  }
  return (
    <ToolFrame {...props} label="Ran" activeLabel="Running" title={command} defaultOpen showBodyOnError>
      <pre className="chat-terminal-output" role="log" aria-label={`Output of ${command}`} tabIndex={0}>
        <span className="chat-terminal-prompt">$ </span>
        {command}
        {"\n"}
        {visible.length < streamed.length ? <span className="chat-terminal-prompt">…{"\n"}</span> : null}
        {visible.map((chunk, index) => (
          <span key={index} data-stream={chunk.stream}>
            {chunk.text}
          </span>
        ))}
        {!streamed.length && props.state === "running" ? <span className="chat-terminal-prompt">Waiting for output…</span> : null}
      </pre>
      <div className="chat-terminal-footer">
        <span>{footer.join(" · ")}</span>
        <button
          type="button"
          disabled={!text}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </ToolFrame>
  );
}
