"use client";

import type { AgentWidgetPart } from "@sarchauhan/protocol";
import { useState } from "react";
import { resolveWidgetPart, useWidgets } from "./widget.context";

export function WidgetRenderer({ part }: { part: AgentWidgetPart }) {
  const { widgets, respondToWidget, disabled } = useWidgets();
  const Component = resolveWidgetPart(part, widgets);
  const [submitted, setSubmitted] = useState(false);

  if (!Component) {
    return (
      <div className="chat-widget chat-widget-missing">
        <div className="chat-widget-label">Widget</div>
        <div className="chat-widget-title">{part.name}</div>
        <pre className="agent-tool-code">{JSON.stringify(part.props, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="chat-widget">
      <Component
        id={part.id}
        name={part.name}
        props={part.props}
        interactive={part.interactive}
        disabled={disabled || submitted}
        onRespond={async (response) => {
          if (!part.interactive || disabled || submitted) {
            return;
          }

          setSubmitted(true);
          await respondToWidget(response);
        }}
      />
    </div>
  );
}
