"use client";
import { useState } from "react";
import type { ApprovalWidgetProps } from "./types";

const formatBytes = (bytes: number) => `${bytes.toLocaleString("en-US")} ${bytes === 1 ? "byte" : "bytes"}`;

/** Inline "Allow" prose row. Choices and default come straight from the harness; the chosen label is the answer. */
export function ApprovalWidget({ question, toolName, target, detail, bytes, choices, defaultChoice, disabled = false, onAnswer, className = "" }: ApprovalWidgetProps) {
  const [chosen, setChosen] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const locked = disabled || pending || chosen !== undefined || !onAnswer;
  const meta = [toolName, typeof bytes === "number" ? formatBytes(bytes) : undefined].filter((part): part is string => Boolean(part));
  return (
    <section className={`chat-prebuilt chat-approval ${className}`} aria-label="Approval request">
      <p className="chat-approval-question">
        <strong>Allow</strong>
        {target ? <><code>{target}</code>{" "}</> : null}
        {question}
      </p>
      {detail ? <p className="chat-approval-detail">{detail}</p> : null}
      <div className="chat-approval-footer">
        <span className="chat-approval-meta">{meta.join(" · ")}</span>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={locked}
            data-default={choice === defaultChoice}
            aria-pressed={chosen === choice}
            onClick={async () => {
              if (locked) return;
              setPending(true);
              setError(undefined);
              try {
                await onAnswer?.(choice);
                setChosen(choice);
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "Could not send the answer.");
              } finally {
                setPending(false);
              }
            }}
          >
            {choice}
          </button>
        ))}
      </div>
      {error ? <p className="chat-approval-error" role="alert">{error}</p> : null}
    </section>
  );
}
