import { DefaultChatTransport, readUIMessageStream } from "ai";
import type { UIMessage } from "ai";
import {
  defineAdapter,
  type ChatAdapter,
  type ChatMessage,
  type ChatThread,
} from "@sarchauhan/adapter";
import { normalizeAgentMessage } from "@sarchauhan/protocol";

export type AiSdkAdapterOptions = {
  chatUrl?: string;
  threadsUrl?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isChatRole = (value: unknown): value is ChatMessage["role"] =>
  value === "system" || value === "user" || value === "assistant";

const isUIMessage = (value: unknown): value is UIMessage =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isChatRole(value.role) &&
  Array.isArray(value.parts) &&
  value.parts.every((part) => isRecord(part) && typeof part.type === "string");

const isChatThread = (value: unknown): value is ChatThread =>
  isRecord(value) && typeof value.id === "string" && typeof value.title === "string";

const toUIMessage = (message: ChatMessage): UIMessage => {
  const candidate = {
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata,
  };

  if (!isUIMessage(candidate)) {
    throw new Error("ChatMessage is not a valid UIMessage");
  }

  return candidate;
};

const fromUIMessage = (message: UIMessage): ChatMessage => {
  const normalized = normalizeAgentMessage({
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata,
  });

  return {
    id: normalized.id,
    role: normalized.role,
    parts: normalized.parts,
    ...(isRecord(normalized.metadata) ? { metadata: normalized.metadata } : {}),
  };
};

const parseThreads = (value: unknown): ChatThread[] => {
  if (!isRecord(value) || !Array.isArray(value.threads)) {
    throw new Error("Invalid threads response");
  }

  const threads = value.threads.filter(isChatThread);
  if (threads.length !== value.threads.length) {
    throw new Error("Invalid threads response");
  }

  return threads;
};

const parseThread = (value: unknown): ChatThread => {
  if (!isRecord(value) || !isChatThread(value.thread)) {
    throw new Error("Invalid thread response");
  }

  return value.thread;
};

const parseMessages = (value: unknown): ChatMessage[] => {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw new Error("Invalid messages response");
  }

  const messages = value.messages.filter(isUIMessage);
  if (messages.length !== value.messages.length) {
    throw new Error("Invalid messages response");
  }

  return messages.map(fromUIMessage);
};

/**
 * AI SDK transport adapter for `@sarchauhan/chat` / `@sarchauhan/chat-tui`.
 * Drop-in replacement for the previous example `createDefaultFetchAdapter`.
 */
export function createAiSdkAdapter({
  chatUrl = "/api/chat",
  threadsUrl = "/api/threads",
}: AiSdkAdapterOptions = {}): ChatAdapter {
  const transport = new DefaultChatTransport<UIMessage>({
    api: chatUrl,
    prepareSendMessagesRequest({ id, messages, body }) {
      return {
        body: {
          id,
          message: messages[messages.length - 1],
          provider: body?.provider,
          model: body?.model,
          thinkingLevel: body?.thinkingLevel,
        },
      };
    },
  });

  return defineAdapter({
    async listThreads() {
      const response = await fetch(threadsUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to list threads");
      }

      return parseThreads(await response.json());
    },

    async createThread() {
      const response = await fetch(threadsUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to create thread");
      }

      return parseThread(await response.json());
    },

    async deleteThread(threadId) {
      const response = await fetch(`${threadsUrl}/${threadId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete thread");
      }
    },

    async loadMessages(threadId) {
      const response = await fetch(`${threadsUrl}/${threadId}/messages`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      return parseMessages(await response.json());
    },

    async *sendMessage({ threadId, messages, provider, model, thinkingLevel, signal }) {
      const stream = await transport.sendMessages({
        trigger: "submit-message",
        chatId: threadId,
        messageId: undefined,
        messages: messages.map(toUIMessage),
        abortSignal: signal,
        body: { provider, model, thinkingLevel },
      });

      for await (const message of readUIMessageStream<UIMessage>({
        stream,
        terminateOnError: true,
      })) {
        yield fromUIMessage(message);
      }
    },

    async editMessage({ threadId, messageId, text }) {
      const response = await fetch(
        `${threadsUrl}/${threadId}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to edit message");
      }

      return parseMessages(await response.json());
    },
  });
}

/** @deprecated Prefer `createAiSdkAdapter` */
export const createDefaultFetchAdapter = createAiSdkAdapter;
