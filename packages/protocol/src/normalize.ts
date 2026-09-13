import type {
  AgentPart,
  AgentToolPart,
  AgentToolState,
  AgentMessage,
  AgentRole,
} from "./parts";
import { isAgentWidgetData, toWidgetPart } from "./widgets";

type RawPart = {
  type: string;
  [key: string]: unknown;
};

type RawMessage = {
  id: string;
  role: string;
  parts?: ReadonlyArray<{ type: string }>;
  metadata?: unknown;
};

const TOOL_STATES: ReadonlySet<string> = new Set([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAgentToolState = (value: unknown): value is AgentToolState =>
  typeof value === "string" && TOOL_STATES.has(value);

const asToolState = (value: unknown): AgentToolState =>
  isAgentToolState(value) ? value : "input-streaming";

const toRawPart = (part: { type: string }): RawPart =>
  Object.assign({ type: part.type }, isRecord(part) ? part : null);

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getStaticToolName = (type: string) => type.slice("tool-".length);

const normalizeToolPart = (
  part: RawPart,
  toolName: string,
): AgentToolPart => {
  const tool: AgentToolPart = {
    type: "tool",
    toolName,
    toolCallId: asString(part.toolCallId),
    state: asToolState(part.state),
    input: part.input,
    output: part.output,
    errorText: typeof part.errorText === "string" ? part.errorText : undefined,
    title: typeof part.title === "string" ? part.title : undefined,
    providerExecuted:
      typeof part.providerExecuted === "boolean" ? part.providerExecuted : undefined,
    preliminary: typeof part.preliminary === "boolean" ? part.preliminary : undefined,
  };

  if (isRecord(part.approval)) {
    const approval = part.approval;
    tool.approval = {
      id: asString(approval.id),
      approved: typeof approval.approved === "boolean" ? approval.approved : undefined,
      reason: typeof approval.reason === "string" ? approval.reason : undefined,
    };
  }

  return tool;
};

/**
 * Normalize an AI SDK / UI message part into a stable AgentPart for rendering.
 */
export const normalizeAgentPart = (part: RawPart): AgentPart => {
  switch (part.type) {
    case "text":
      return {
        type: "text",
        text: asString(part.text),
        state: part.state === "streaming" || part.state === "done" ? part.state : undefined,
      };
    case "reasoning":
      return {
        type: "reasoning",
        text: asString(part.text),
        state: part.state === "streaming" || part.state === "done" ? part.state : undefined,
      };
    case "step-start":
      return { type: "step-start" };
    case "source-url":
      return {
        type: "source-url",
        sourceId: asString(part.sourceId),
        url: asString(part.url),
        title: typeof part.title === "string" ? part.title : undefined,
      };
    case "source-document":
      return {
        type: "source-document",
        sourceId: asString(part.sourceId),
        mediaType: asString(part.mediaType),
        title: asString(part.title),
        filename: typeof part.filename === "string" ? part.filename : undefined,
      };
    case "file":
      return {
        type: "file",
        mediaType: asString(part.mediaType),
        url: asString(part.url),
        filename: typeof part.filename === "string" ? part.filename : undefined,
      };
    case "tool":
    case "dynamic-tool":
      return normalizeToolPart(part, asString(part.toolName, "tool"));
    case "data":
      return {
        type: "data",
        name: asString(part.name, "data"),
        data: part.data,
        id: typeof part.id === "string" ? part.id : undefined,
      };
    case "widget":
      return {
        type: "widget",
        name: asString(part.name, "widget"),
        props: isRecord(part.props) ? part.props : {},
        id: typeof part.id === "string" ? part.id : undefined,
        interactive: part.interactive === true,
      };
    case "unknown":
      return {
        type: "unknown",
        rawType: asString(part.rawType, "unknown"),
        raw: isRecord(part.raw) ? part.raw : part,
      };
    default: {
      if (part.type.startsWith("tool-")) {
        return normalizeToolPart(part, getStaticToolName(part.type) || "tool");
      }

      if (part.type.startsWith("data-")) {
        const name = part.type.slice("data-".length) || "data";
        const id = typeof part.id === "string" ? part.id : undefined;

        if (name === "widget" && isAgentWidgetData(part.data)) {
          return toWidgetPart(part.data, id);
        }

        return {
          type: "data",
          name,
          data: part.data,
          id,
        };
      }

      return {
        type: "unknown",
        rawType: part.type,
        raw: part,
      };
    }
  }
};

export const normalizeAgentParts = (
  parts: ReadonlyArray<{ type: string }> | undefined | null,
): AgentPart[] => (parts ?? []).map((part) => normalizeAgentPart(toRawPart(part)));

export const normalizeAgentMessage = (message: RawMessage): AgentMessage => {
  const role: AgentRole =
    message.role === "user" || message.role === "system" || message.role === "assistant"
      ? message.role
      : "assistant";

  return {
    id: message.id,
    role,
    parts: normalizeAgentParts(message.parts),
    metadata: message.metadata,
  };
};

export const normalizeAgentMessages = (messages: RawMessage[]): AgentMessage[] =>
  messages.map(normalizeAgentMessage);
