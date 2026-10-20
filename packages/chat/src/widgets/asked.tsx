"use client";
import type { AskedWidgetProps } from "./types";

/**
 * Direction B row for a question the agent asked: "Asked <question> → <answer>".
 * The choices show only while the question is still open; a settled row keeps
 * just the answer, and the raw tool payload is never shown.
 */
export function AskedWidget({
  question,
  answer,
  choices = [],
  state = "complete",
  error,
  className = "",
}: AskedWidgetProps) {
  const open = state === "running" || state === "approval";
  return (
    <div className={`chat-prebuilt chat-asked ${className}`} data-state={state}>
      <p className="chat-asked-row">
        <span className="chat-asked-verb">{open ? "Asking" : "Asked"}</span>{" "}
        <span className="chat-asked-question">{question}</span>
        {!open && answer ? (
          <>
            {" "}
            <span className="chat-asked-answer">
              <span aria-hidden="true">→ </span>
              <span className="chat-sr-only">Answer: </span>
              {answer}
            </span>
          </>
        ) : null}
        {state === "error" || state === "denied" ? (
          <span className="chat-asked-status" role="status">
            {" "}
            · {state === "denied" ? "denied" : "failed"}
          </span>
        ) : null}
      </p>
      {open && choices.length ? (
        <ul className="chat-asked-choices" aria-label="Choices">
          {choices.map((choice, index) => (
            <li key={`${choice}-${index}`}>{choice}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="chat-asked-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
