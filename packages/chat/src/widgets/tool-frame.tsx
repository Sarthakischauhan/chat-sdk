"use client";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { ToolWidgetProps, WidgetState } from "./types";

/** Direction B status suffix. Only states carried by the payload are shown; complete rows stay quiet. */
const statusText: Record<WidgetState, string | undefined> = {
  running: "running",
  complete: undefined,
  error: "failed",
  denied: "denied",
  approval: "needs approval",
};

/**
 * Inline prose row: muted verb, mono target, dim meta, optional collapsible body.
 * `label` is the completed verb ("Read"); `activeLabel` is used while running and
 * in the approval prompt ("Allow reading …").
 */
export function ToolFrame({
  label,
  activeLabel,
  title,
  meta,
  state = "complete",
  error,
  defaultOpen,
  className = "",
  children,
}: ToolWidgetProps & {
  label: string;
  activeLabel?: string;
  title: string;
  meta?: ReactNode;
  /** Open the body when complete. Running, failed and approval rows always start open. */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const active = activeLabel ?? label;
  const status = statusText[state];
  return (
    <details
      className={`chat-prebuilt chat-tool-widget ${className}`}
      data-state={state}
      open={state !== "complete" || defaultOpen === true}
    >
      <summary>
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
          <span className="chat-tool-widget-status" role="status">
            · {status}
          </span>
        ) : (
          <span className="chat-sr-only" role="status">
            Done
          </span>
        )}
        <ChevronRight className="chat-tool-widget-chevron" size={12} aria-hidden="true" />
      </summary>
      <div className="chat-tool-widget-body">
        {error ? (
          <p className="chat-widget-error" role="alert">
            {error}
          </p>
        ) : (
          children
        )}
      </div>
    </details>
  );
}
