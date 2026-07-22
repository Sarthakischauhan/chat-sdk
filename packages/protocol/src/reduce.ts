import type { AgentEvent } from "./events";
import type { AgentMessage, AgentPart, AgentToolPart } from "./parts";

export type AgentMessageState = {
  message: AgentMessage;
  status: "streaming" | "ready" | "error" | "aborted";
  errorText?: string;
  textIds: Map<string, number>;
  reasoningIds: Map<string, number>;
};

const createEmptyMessage = (id = "assistant"): AgentMessage => ({
  id,
  role: "assistant",
  parts: [],
});

const upsertTextLike = (
  parts: AgentPart[],
  type: "text" | "reasoning",
  id: string,
  update: (currentText: string) => { text: string; state?: "streaming" | "done" },
  ids: Map<string, number>,
): AgentPart[] => {
  const existingIndex = ids.get(id);

  if (existingIndex === undefined) {
    const next = update("");
    const part: AgentPart =
      type === "text"
        ? { type: "text", text: next.text, state: next.state }
        : { type: "reasoning", text: next.text, state: next.state };
    ids.set(id, parts.length);
    return [...parts, part];
  }

  return parts.map((part, index) => {
    if (index !== existingIndex || part.type !== type) {
      return part;
    }

    const next = update(part.text);
    return { ...part, text: next.text, state: next.state };
  });
};

const findToolIndex = (parts: AgentPart[], toolCallId: string) =>
  parts.findIndex((part) => part.type === "tool" && part.toolCallId === toolCallId);

const upsertTool = (
  parts: AgentPart[],
  toolCallId: string,
  patch: Partial<AgentToolPart> & Pick<AgentToolPart, "toolName" | "state">,
): AgentPart[] => {
  const index = findToolIndex(parts, toolCallId);

  if (index === -1) {
    return [
      ...parts,
      {
        type: "tool",
        toolCallId,
        toolName: patch.toolName,
        state: patch.state,
        input: patch.input,
        output: patch.output,
        errorText: patch.errorText,
        title: patch.title,
        providerExecuted: patch.providerExecuted,
        preliminary: patch.preliminary,
        approval: patch.approval,
      },
    ];
  }

  return parts.map((part, partIndex) => {
    if (partIndex !== index || part.type !== "tool") {
      return part;
    }

    return {
      ...part,
      ...patch,
      toolCallId,
      type: "tool" as const,
    };
  });
};

/**
 * Reduce AI SDK / agent stream events into a single assistant message snapshot.
 */
export const createAgentMessageState = (messageId?: string): AgentMessageState => ({
  message: createEmptyMessage(messageId),
  status: "streaming",
  textIds: new Map(),
  reasoningIds: new Map(),
});

export const applyAgentEvent = (
  state: AgentMessageState,
  event: AgentEvent,
): AgentMessageState => {
  const textIds = new Map(state.textIds);
  const reasoningIds = new Map(state.reasoningIds);

  switch (event.type) {
    case "start":
      return {
        ...state,
        status: "streaming",
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          id: event.messageId ?? state.message.id,
          metadata: event.messageMetadata ?? state.message.metadata,
        },
      };
    case "text-start":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTextLike(
            state.message.parts,
            "text",
            event.id,
            () => ({ text: "", state: "streaming" }),
            textIds,
          ),
        },
      };
    case "text-delta":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTextLike(
            state.message.parts,
            "text",
            event.id,
            (current) => ({ text: current + event.delta, state: "streaming" }),
            textIds,
          ),
        },
      };
    case "text-end":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTextLike(
            state.message.parts,
            "text",
            event.id,
            (current) => ({ text: current, state: "done" }),
            textIds,
          ),
        },
      };
    case "reasoning-start":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTextLike(
            state.message.parts,
            "reasoning",
            event.id,
            () => ({ text: "", state: "streaming" }),
            reasoningIds,
          ),
        },
      };
    case "reasoning-delta":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTextLike(
            state.message.parts,
            "reasoning",
            event.id,
            (current) => ({ text: current + event.delta, state: "streaming" }),
            reasoningIds,
          ),
        },
      };
    case "reasoning-end":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTextLike(
            state.message.parts,
            "reasoning",
            event.id,
            (current) => ({ text: current, state: "done" }),
            reasoningIds,
          ),
        },
      };
    case "tool-input-start":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTool(state.message.parts, event.toolCallId, {
            toolName: event.toolName,
            state: "input-streaming",
            title: event.title,
            providerExecuted: event.providerExecuted,
            input: undefined,
          }),
        },
      };
    case "tool-input-delta": {
      const index = findToolIndex(state.message.parts, event.toolCallId);
      if (index === -1) {
        return { ...state, textIds, reasoningIds };
      }

      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: state.message.parts.map((part, partIndex) => {
            if (partIndex !== index || part.type !== "tool") {
              return part;
            }

            const current =
              typeof part.input === "string"
                ? part.input
                : part.input == null
                  ? ""
                  : JSON.stringify(part.input);

            return {
              ...part,
              state: "input-streaming" as const,
              input: current + event.inputTextDelta,
            };
          }),
        },
      };
    }
    case "tool-input-available":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTool(state.message.parts, event.toolCallId, {
            toolName: event.toolName,
            state: "input-available",
            input: event.input,
            title: event.title,
            providerExecuted: event.providerExecuted,
          }),
        },
      };
    case "tool-input-error":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: upsertTool(state.message.parts, event.toolCallId, {
            toolName: event.toolName,
            state: "output-error",
            input: event.input,
            errorText: event.errorText,
            title: event.title,
            providerExecuted: event.providerExecuted,
          }),
        },
      };
    case "tool-approval-request":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: state.message.parts.map((part) => {
            if (part.type !== "tool" || part.toolCallId !== event.toolCallId) {
              return part;
            }

            return {
              ...part,
              state: "approval-requested" as const,
              approval: { id: event.approvalId },
            };
          }),
        },
      };
    case "tool-output-available":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: state.message.parts.map((part) => {
            if (part.type !== "tool" || part.toolCallId !== event.toolCallId) {
              return part;
            }

            return {
              ...part,
              state: "output-available" as const,
              output: event.output,
              providerExecuted: event.providerExecuted ?? part.providerExecuted,
              preliminary: event.preliminary,
              errorText: undefined,
            };
          }),
        },
      };
    case "tool-output-error":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: state.message.parts.map((part) => {
            if (part.type !== "tool" || part.toolCallId !== event.toolCallId) {
              return part;
            }

            return {
              ...part,
              state: "output-error" as const,
              errorText: event.errorText,
              providerExecuted: event.providerExecuted ?? part.providerExecuted,
            };
          }),
        },
      };
    case "tool-output-denied":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: state.message.parts.map((part) => {
            if (part.type !== "tool" || part.toolCallId !== event.toolCallId) {
              return part;
            }

            return {
              ...part,
              state: "output-denied" as const,
              approval: part.approval
                ? { ...part.approval, approved: false }
                : { id: event.toolCallId, approved: false },
            };
          }),
        },
      };
    case "source-url":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: [
            ...state.message.parts,
            {
              type: "source-url",
              sourceId: event.sourceId,
              url: event.url,
              title: event.title,
            },
          ],
        },
      };
    case "source-document":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: [
            ...state.message.parts,
            {
              type: "source-document",
              sourceId: event.sourceId,
              mediaType: event.mediaType,
              title: event.title,
              filename: event.filename,
            },
          ],
        },
      };
    case "file":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: [
            ...state.message.parts,
            {
              type: "file",
              url: event.url,
              mediaType: event.mediaType,
              filename: event.filename,
            },
          ],
        },
      };
    case "start-step":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          parts: [...state.message.parts, { type: "step-start" }],
        },
      };
    case "finish-step":
      return { ...state, textIds, reasoningIds };
    case "message-metadata":
      return {
        ...state,
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          metadata: event.messageMetadata,
        },
      };
    case "finish":
      return {
        ...state,
        status: "ready",
        textIds,
        reasoningIds,
        message: {
          ...state.message,
          metadata: event.messageMetadata ?? state.message.metadata,
        },
      };
    case "error":
      return {
        ...state,
        status: "error",
        errorText: event.errorText,
        textIds,
        reasoningIds,
      };
    case "abort":
      return {
        ...state,
        status: "aborted",
        errorText: event.reason,
        textIds,
        reasoningIds,
      };
    default: {
      if (event.type.startsWith("data-")) {
        const dataEvent = event as Extract<AgentEvent, { type: `data-${string}` }>;
        return {
          ...state,
          textIds,
          reasoningIds,
          message: {
            ...state.message,
            parts: dataEvent.transient
              ? state.message.parts
              : [
                  ...state.message.parts,
                  {
                    type: "data",
                    name: dataEvent.type.slice("data-".length),
                    data: dataEvent.data,
                    id: dataEvent.id,
                  },
                ],
          },
        };
      }

      return { ...state, textIds, reasoningIds };
    }
  }
};

export const reduceAgentEvents = (
  events: Iterable<AgentEvent>,
  initial?: AgentMessageState,
): AgentMessageState => {
  let state = initial ?? createAgentMessageState();

  for (const event of events) {
    state = applyAgentEvent(state, event);
  }

  return state;
};
