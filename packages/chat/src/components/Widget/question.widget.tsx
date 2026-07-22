"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import type { ChatWidgetProps } from "./widget.context";

type QuestionProps = {
  prompt?: string;
  options?: Array<string | { label: string; value: string }>;
};

const normalizeOptions = (options: QuestionProps["options"] = []) =>
  options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );

export function QuestionWidget({
  id,
  name,
  props,
  interactive,
  disabled,
  onRespond,
}: ChatWidgetProps<QuestionProps>) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = normalizeOptions(props.options);
  const prompt = typeof props.prompt === "string" ? props.prompt : "Choose an option";

  return (
    <div className="chat-widget-card">
      <div className="chat-widget-label">Question</div>
      <div className="chat-widget-title">{prompt}</div>
      <div className="chat-widget-options">
        {options.map((option) => {
          const isActive = selected === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="justify-start"
              disabled={!interactive || disabled}
              onClick={async () => {
                setSelected(option.value);
                await onRespond?.({
                  widgetId: id,
                  name,
                  value: option.value,
                  label: option.label,
                });
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      {selected && <div className="chat-widget-meta">Selected: {selected}</div>}
    </div>
  );
}
