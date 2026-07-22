import type {
  AgentPart,
  AgentToolPart,
  AgentToolState,
  AgentMessage,
  AgentRole,
} from "./parts";

type RawPart = {
  type: string;
  [key: string]: unknown;
};

type RawMessage = {
  id: string;
  role: string;
  parts?: RawPart[];
  metadata?: unknown;
};

const TOOL_STATES = new Set<AgentToolState>([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
]);

const asToolState = (value: unknown): AgentToolState =>
  typeof value === "string" && TOOL_STATES.has(value as AgentToolState)
    ? (value as AgentToolState)
    : "input-streaming";

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getStaticToolName = (type: string) => type.slice("tool-".length);

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
    case "dynamic-tool": {
      const tool: AgentToolPart = {
        type: "tool",
        toolName: asString(part.toolName, "tool"),
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

      if (part.approval && typeof part.approval === "object") {
        const approval = part.approval as Record<string, unknown>;
        tool.approval = {
          id: asString(approval.id),
          approved: typeof approval.approved === "boolean" ? approval.approved : undefined,
          reason: typeof approval.reason === "string" ? approval.reason : undefined,
        };
      }

      return tool;
    }
    default: {
      if (part.type.startsWith("tool-")) {
        const tool: AgentToolPart = {
          type: "tool",
          toolName: getStaticToolName(part.type) || "tool",
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

        if (part.approval && typeof part.approval === "object") {
          const approval = part.approval as Record<string, unknown>;
          tool.approval = {
            id: asString(approval.id),
            approved: typeof approval.approved === "boolean" ? approval.approved : undefined,
            reason: typeof approval.reason === "string" ? approval.reason : undefined,
          };
        }

        return tool;
      }

      if (part.type.startsWith("data-")) {
        return {
          type: "data",
          name: part.type.slice("data-".length) || "data",
          data: part.data,
          id: typeof part.id === "string" ? part.id : undefined,
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

export const normalizeAgentParts = (parts: RawPart[] | undefined | null): AgentPart[] =>
  (parts ?? []).map(normalizeAgentPart);

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
