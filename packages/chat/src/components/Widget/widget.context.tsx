"use client";

import type { AgentWidgetPart, AgentWidgetProps } from "@sarchauhan/protocol";
import type { ComponentType, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

export type WidgetResponse = {
  widgetId?: string;
  name: string;
  value: unknown;
  label?: string;
};

export type ChatWidgetProps<TProps extends AgentWidgetProps = AgentWidgetProps> = {
  id?: string;
  name: string;
  props: TProps;
  interactive?: boolean;
  disabled?: boolean;
  onRespond?: (response: WidgetResponse) => void | Promise<void>;
};

export type ChatWidgetComponent<TProps extends AgentWidgetProps = AgentWidgetProps> = ComponentType<
  ChatWidgetProps<TProps>
>;

export type ChatWidgetRegistry = Record<string, ChatWidgetComponent>;

type WidgetContextValue = {
  widgets: ChatWidgetRegistry;
  respondToWidget: (response: WidgetResponse) => Promise<void>;
  disabled: boolean;
};

const WidgetContext = createContext<WidgetContextValue | null>(null);

type WidgetProviderProps = {
  widgets?: ChatWidgetRegistry;
  respondToWidget: (response: WidgetResponse) => Promise<void>;
  disabled?: boolean;
  children: ReactNode;
};

export function WidgetProvider({
  widgets = {},
  respondToWidget,
  disabled = false,
  children,
}: WidgetProviderProps) {
  const value = useMemo(
    () => ({
      widgets,
      respondToWidget,
      disabled,
    }),
    [disabled, respondToWidget, widgets],
  );

  return <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>;
}

export function useWidgets() {
  const context = useContext(WidgetContext);

  if (!context) {
    return {
      widgets: {} as ChatWidgetRegistry,
      respondToWidget: async () => undefined,
      disabled: false,
    };
  }

  return context;
}

export function resolveWidgetPart(
  part: AgentWidgetPart,
  registry: ChatWidgetRegistry,
): ChatWidgetComponent | null {
  return registry[part.name] ?? null;
}
