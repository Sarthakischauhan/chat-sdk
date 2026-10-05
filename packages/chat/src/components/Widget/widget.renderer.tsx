"use client";

import type { AgentWidgetPart } from "@sarchauhan/protocol";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { WidgetActionSkeleton } from "../Message/message.skeleton";
import { BaseWidget } from "./base.widget";
import {
  getWidgetShellProps,
  isWidgetDefinition,
  resolveWidgetPart,
  useWidgets,
  type WidgetControls,
} from "./widget.context";

export function WidgetRenderer({
  part,
  pending = false,
}: {
  part: AgentWidgetPart;
  pending?: boolean;
}) {
  const { widgets, respondToWidget, disabled } = useWidgets();
  const entry = resolveWidgetPart(part, widgets);
  const [submitted, setSubmitted] = useState(false);
  const responsePending = useRef(false);
  const widgetDisabled = disabled || submitted;

  const respond = async (value: unknown, label?: string, actionId?: string) => {
    if (!part.interactive || disabled || submitted || responsePending.current) {
      return;
    }

    responsePending.current = true;
    setSubmitted(true);
    try {
      await respondToWidget({
        widgetId: part.id,
        name: part.name,
        actionId,
        value,
        label,
      });
    } catch (error) {
      setSubmitted(false);
      throw error;
    } finally {
      responsePending.current = false;
    }
  };

  const controls: WidgetControls = {
    widgetId: part.id,
    widgetName: part.name,
    interactive: Boolean(part.interactive),
    disabled: widgetDisabled,
    respond,
    respondWith: async (response) => {
      await respond(response.value, response.label, response.actionId);
    },
  };

  const frame = (node: ReactNode) => (
    <div className="chat-widget" data-pending={pending ? "true" : undefined}>
      {node}
      {pending ? <WidgetActionSkeleton /> : null}
    </div>
  );

  if (!entry) {
    return frame(
      <BaseWidget
        label="Unhandled widget"
        title={part.name}
        status="Raw props"
        className="chat-widget-missing"
      >
        <pre className="agent-tool-code">{JSON.stringify(part.props, null, 2)}</pre>
      </BaseWidget>,
    );
  }

  if (isWidgetDefinition(entry)) {
    const Component = entry.component;
    const content = <Component {...part.props} widget={controls} />;

    if (entry.shell === false) {
      return frame(content);
    }

    return frame(
      <BaseWidget {...getWidgetShellProps(entry, part.props, controls)}>{content}</BaseWidget>,
    );
  }

  const Component = entry;

  return frame(
    <Component
      id={part.id}
      name={part.name}
      props={part.props}
      interactive={part.interactive}
      disabled={widgetDisabled}
      onRespond={async (response) => {
        if (!part.interactive || disabled || submitted || responsePending.current) {
          return;
        }

        responsePending.current = true;
        setSubmitted(true);
        try {
          await respondToWidget(response);
        } catch (error) {
          setSubmitted(false);
          throw error;
        } finally {
          responsePending.current = false;
        }
      }}
    />,
  );
}
