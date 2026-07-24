"use client";

import type { AgentWidgetPart, AgentWidgetProps } from "@sarchauhan/protocol";
import type { ComponentType, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { BaseWidgetProps } from "./base.widget";

export type WidgetResponse = {
  widgetId?: string;
  name: string;
  value: unknown;
  label?: string;
};

export type WidgetControls = {
  widgetId?: string;
  widgetName: string;
  interactive: boolean;
  disabled: boolean;
  respond: (value: unknown, label?: string) => Promise<void>;
  respondWith: (response: Omit<WidgetResponse, "widgetId" | "name">) => Promise<void>;
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

export type WidgetComponentProps<TProps extends AgentWidgetProps = AgentWidgetProps> = TProps & {
  widget: WidgetControls;
};

type WidgetValue<TProps extends AgentWidgetProps, TValue> =
  | TValue
  | ((props: TProps, controls: WidgetControls) => TValue);

export type ChatWidgetDefinition<TProps extends AgentWidgetProps = AgentWidgetProps> = {
  name: string;
  component: ComponentType<WidgetComponentProps<TProps>>;
  label?: WidgetValue<TProps, string>;
  title?: WidgetValue<TProps, ReactNode>;
  status?: WidgetValue<TProps, ReactNode>;
  meta?: WidgetValue<TProps, ReactNode>;
  className?: WidgetValue<TProps, string | undefined>;
  shell?: boolean;
};

export type ChatWidgetEntry<TProps extends AgentWidgetProps = AgentWidgetProps> =
  | ChatWidgetComponent<TProps>
  | ChatWidgetDefinition<TProps>;

export type ChatWidgetRegistry = Record<string, ChatWidgetEntry>;
export type ChatWidgetInput = Array<ChatWidgetDefinition> | ChatWidgetRegistry;

export type DefineWidgetOptions<TProps extends AgentWidgetProps> = Pick<
  ChatWidgetDefinition<TProps>,
  "label" | "title" | "status" | "meta" | "className" | "shell"
>;

export function defineWidget<TProps extends AgentWidgetProps>(
  name: string,
  component: ComponentType<WidgetComponentProps<TProps>>,
  options: DefineWidgetOptions<TProps> = {},
): ChatWidgetDefinition<TProps> {
  return {
    name,
    component,
    shell: true,
    ...options,
  };
}

export function createWidgetRegistry(widgets: ChatWidgetInput = {}): ChatWidgetRegistry {
  if (Array.isArray(widgets)) {
    return Object.fromEntries(widgets.map((widget) => [widget.name, widget]));
  }

  return widgets;
}

export function readWidgetValue<TProps extends AgentWidgetProps, TValue>(
  value: WidgetValue<TProps, TValue> | undefined,
  props: TProps,
  controls: WidgetControls,
): TValue | undefined {
  return typeof value === "function"
    ? (value as (props: TProps, controls: WidgetControls) => TValue)(props, controls)
    : value;
}

export function getWidgetShellProps<TProps extends AgentWidgetProps>(
  definition: ChatWidgetDefinition<TProps>,
  props: TProps,
  controls: WidgetControls,
): Omit<BaseWidgetProps, "children"> {
  const title = readWidgetValue(definition.title, props, controls);

  return {
    label:
      readWidgetValue(definition.label, props, controls) ??
      definition.name.replace(/[-_]/g, " "),
    title: title ?? definition.name,
    status: readWidgetValue(definition.status, props, controls),
    meta: readWidgetValue(definition.meta, props, controls),
    className: readWidgetValue(definition.className, props, controls),
  };
}

export function isWidgetDefinition(
  entry: ChatWidgetEntry | null | undefined,
): entry is ChatWidgetDefinition {
  return Boolean(entry && typeof entry === "object" && "component" in entry);
}

type WidgetContextValue = {
  widgets: ChatWidgetRegistry;
  respondToWidget: (response: WidgetResponse) => Promise<void>;
  disabled: boolean;
};

const WidgetContext = createContext<WidgetContextValue | null>(null);

type WidgetProviderProps = {
  widgets?: ChatWidgetInput;
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
  const registry = useMemo(() => createWidgetRegistry(widgets), [widgets]);
  const value = useMemo(
    () => ({
      widgets: registry,
      respondToWidget,
      disabled,
    }),
    [disabled, registry, respondToWidget],
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
): ChatWidgetEntry | null {
  return registry[part.name] ?? null;
}
