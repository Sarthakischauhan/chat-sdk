"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { ToolWidgetProps } from "./types";
export function ToolFrame({
  label,
  title,
  meta,
  state = "complete",
  error,
  className = "",
  children,
}: ToolWidgetProps & {
  label: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  const status = {
    running: "Working",
    complete: "Done",
    error: "Failed",
    denied: "Denied",
    approval: "Needs approval",
  }[state];
  return (
    <details
      className={`chat-prebuilt chat-tool-widget ${className}`}
      data-state={state}
      open={state !== "complete"}
    >
      <summary>
        <ChevronDown size={14} aria-hidden="true" />
        <span className="chat-tool-widget-label">{label}</span>
        <span className="chat-tool-widget-title" title={title}>
          {title}
        </span>
        <span className="chat-tool-widget-meta">{meta}</span>
        <span className="chat-tool-widget-status" role="status">
          {status}
        </span>
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
