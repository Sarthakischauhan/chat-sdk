"use client";

import type { AgentWidgetPart } from "@sarchauhan/protocol";
import { useState } from "react";
import { BaseWidget } from "./base.widget";
import {
  getWidgetShellProps,
  isWidgetDefinition,
  resolveWidgetPart,
  useWidgets,
  type WidgetControls,
} from "./widget.context";

export function WidgetRenderer({ part }: { part: AgentWidgetPart }) {
  const { widgets, respondToWidget, disabled } = useWidgets();
  const entry = resolveWidgetPart(part, widgets);
  const [submitted, setSubmitted] = useState(false);
  const widgetDisabled = disabled || submitted;

  const respond = async (value: unknown, label?: string) => {
    if (!part.interactive || disabled || submitted) {
      return;
    }

    setSubmitted(true);
    await respondToWidget({
      widgetId: part.id,
      name: part.name,
      value,
      label,
    });
  };

  const controls: WidgetControls = {
    widgetId: part.id,
    widgetName: part.name,
    interactive: Boolean(part.interactive),
    disabled: widgetDisabled,
    respond,
    respondWith: async (response) => {
      await respond(response.value, response.label);
    },
  };

  if (!entry) {
    return (
      <div className="chat-widget">
        <BaseWidget
          label="Unhandled widget"
          title={part.name}
          status="Raw props"
          className="chat-widget-missing"
        >
          <pre className="agent-tool-code">{JSON.stringify(part.props, null, 2)}</pre>
        </BaseWidget>
      </div>
    );
  }

  if (isWidgetDefinition(entry)) {
    const Component = entry.component;
    const content = <Component {...part.props} widget={controls} />;

    if (entry.shell === false) {
      return <div className="chat-widget">{content}</div>;
    }

    return (
      <div className="chat-widget">
        <BaseWidget {...getWidgetShellProps(entry, part.props, controls)}>{content}</BaseWidget>
      </div>
    );
  }

  const Component = entry;

  return (
    <div className="chat-widget">
      <Component
        id={part.id}
        name={part.name}
        props={part.props}
        interactive={part.interactive}
        disabled={widgetDisabled}
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
