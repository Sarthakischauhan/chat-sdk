/**
 * Widget payloads ride on AI SDK `data-*` stream parts.
 * Prefer `data-widget` with `{ name, props, interactive? }`.
 */

export type AgentWidgetProps = Record<string, unknown>;

export type AgentWidgetPart = {
  type: "widget";
  /** Registry key used by the chat UI to pick a React component. */
  name: string;
  props: AgentWidgetProps;
  id?: string;
  /** When true, the widget may submit a response back into the conversation. */
  interactive?: boolean;
};

export type AgentWidgetData = {
  name: string;
  props?: AgentWidgetProps;
  interactive?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const isAgentWidgetData = (value: unknown): value is AgentWidgetData =>
  isRecord(value) && typeof value.name === "string" && value.name.length > 0;

/**
 * Build a `data-widget` stream payload for AI SDK writers / custom backends.
 */
export const createWidgetData = (
  name: string,
  props: AgentWidgetProps = {},
  options?: { interactive?: boolean; id?: string },
): { type: "data-widget"; id?: string; data: AgentWidgetData } => ({
  type: "data-widget",
  id: options?.id,
  data: {
    name,
    props,
    interactive: options?.interactive,
  },
});

export const toWidgetPart = (
  data: AgentWidgetData,
  id?: string,
): AgentWidgetPart => ({
  type: "widget",
  name: data.name,
  props: isRecord(data.props) ? data.props : {},
  id,
  interactive: data.interactive === true,
});
