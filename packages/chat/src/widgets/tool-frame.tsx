"use client";
import { useRef } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useAutoDisclosure } from "./disclosure";
import { formatDuration, formatStatus, useElapsed } from "./format";
import type { ToolWidgetProps } from "./types";

/**
 * Inline prose row: muted verb, mono target, dim meta, status suffix, optional collapsible body.
 * `label` is the completed verb ("Read"); `activeLabel` is used while running and
 * in the approval prompt ("Allow reading …"). Exit code and timing appear only when sent.
 */
export function ToolFrame({
  label,
  activeLabel,
  title,
  meta,
  state = "complete",
  error,
  defaultOpen,
  showBodyOnError,
  startedAt,
  durationMs,
  exitCode,
  className = "",
  children,
}: Omit<ToolWidgetProps, "summary"> & {
  label: string;
  activeLabel?: string;
  title: string;
  meta?: ReactNode;
  /** Start open when the row mounts already complete (e.g. history). Live rows still close when they finish. */
  defaultOpen?: boolean;
  /** Render children below the error (e.g. terminal output of a failed command). */
  showBodyOnError?: boolean;
  children: ReactNode;
}) {
  const active = activeLabel ?? label;
  const elapsed = useElapsed(startedAt, state === "running");
  const status = formatStatus(state, { exitCode }, elapsed);
  const duration = state !== "running" && typeof durationMs === "number" ? formatDuration(durationMs) : undefined;
  // Open while running/failed/awaiting approval; closes itself when it completes unless the user toggled it.
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { defaultOpen: startOpen, onToggle, onSummaryClick } = useAutoDisclosure(
    detailsRef,
    state !== "complete",
    state !== "complete" || defaultOpen === true,
  );
  return (
    <details
      ref={detailsRef}
      className={`chat-prebuilt chat-tool-widget ${className}`}
      data-state={state}
      open={startOpen}
      onToggle={onToggle}
    >
      <summary onClick={onSummaryClick}>
        {state === "approval" ? (
          <>
            <span className="chat-tool-widget-allow">Allow</span>
            <span className="chat-tool-widget-label">{active.toLowerCase()}</span>
          </>
        ) : (
          <span className="chat-tool-widget-label">
            {state === "running" ? active : label}
          </span>
        )}
        <span className="chat-tool-widget-title" title={title}>
          {title}
        </span>
        {meta ? <span className="chat-tool-widget-meta">· {meta}</span> : null}
        {status ? (
          <span className="chat-tool-widget-status" data-tone={status.tone} role="status">
            · {status.text}
          </span>
        ) : (
          <span className="chat-sr-only" role="status">
            Done
          </span>
        )}
        {duration ? <span className="chat-tool-widget-meta">· {duration}</span> : null}
        <ChevronRight className="chat-tool-widget-chevron" size={12} aria-hidden="true" />
      </summary>
      <div className="chat-tool-widget-body">
        {error ? (
          <p className="chat-widget-error" role="alert">
            {error}
          </p>
        ) : null}
        {error && !showBodyOnError ? null : children}
      </div>
    </details>
  );
}
