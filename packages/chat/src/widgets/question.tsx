"use client";
import { useId, useRef, useState } from "react";
import { ArrowUp, Check } from "lucide-react";
import type { QuestionWidgetProps } from "./types";
export function QuestionWidget({
  prompt,
  description,
  options = [],
  multiple = false,
  allowCustom = false,
  disabled = false,
  onSubmit,
  className = "",
}: QuestionWidgetProps) {
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]),
    [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();
  const submitting = useRef(false);
  const choices = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  const locked = disabled || status !== "idle" || !onSubmit;
  return (
    <form
      className={`chat-prebuilt chat-question ${className}`}
      aria-labelledby={`${id}-prompt`}
      onSubmit={async (event) => {
        event.preventDefault();
        if (locked || submitting.current || (!selected.length && !text.trim()))
          return;
        submitting.current = true;
        setStatus("sending");
        setError(undefined);
        try {
          await onSubmit?.({
            values: selected,
            ...(text.trim() ? { text: text.trim() } : {}),
          });
          setStatus("sent");
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not send your answer. Try again.",
          );
          setStatus("idle");
        } finally {
          submitting.current = false;
        }
      }}
    >
      <div className="chat-question-eyebrow">Your input</div>
      <h3 id={`${id}-prompt`}>{prompt}</h3>
      {description ? (
        <p className="chat-question-description">{description}</p>
      ) : null}
      <fieldset disabled={locked}>
        <legend className="chat-sr-only">
          {multiple ? "Select one or more options" : "Select an option"}
        </legend>
        {choices.map((option, index) => (
          <label
            className="chat-question-option"
            data-selected={selected.includes(option.value)}
            key={`${option.value}-${index}`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={id}
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={() =>
                setSelected((current) =>
                  multiple
                    ? current.includes(option.value)
                      ? current.filter((value) => value !== option.value)
                      : [...current, option.value]
                    : [option.value],
                )
              }
            />
            <span>
              <span className="chat-question-option-title">
                {option.label}
                {option.recommended ? <small>Recommended</small> : null}
              </span>
              {option.description ? (
                <span className="chat-question-option-description">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
        {allowCustom || !choices.length ? (
          <label className="chat-question-custom">
            {choices.length ? "Additional context" : "Your answer"}
            <textarea
              rows={2}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type your answer…"
            />
          </label>
        ) : null}
      </fieldset>
      <footer>
        <span role="status">
          {status === "sent"
            ? "Answer sent"
            : status === "sending"
              ? "Sending…"
              : multiple
                ? "Choose one or more"
                : choices.length ? "Choose and confirm" : "Write and confirm"}
        </span>
        <button
          type="submit"
          disabled={locked || (!selected.length && !text.trim())}
        >
          {status === "sent" ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <ArrowUp size={14} aria-hidden="true" />
          )}
          {status === "sent" ? "Submitted" : "Confirm"}
        </button>
      </footer>
      {error ? (
        <p className="chat-widget-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
