import { DefaultChatTransport, readUIMessageStream } from "ai";
import type { UIMessage } from "ai";
import type { ChatAdapter, ChatMessage, ChatThread } from "@your-scope/chat";

type FetchAdapterOptions = {
  chatUrl?: string;
  threadsUrl?: string;
};

const asUIMessage = (message: ChatMessage) => message as UIMessage;
const asChatMessage = (message: UIMessage) => message as ChatMessage;

export function createDefaultFetchAdapter({
  chatUrl = "/api/chat",
  threadsUrl = "/api/threads",
}: FetchAdapterOptions = {}): ChatAdapter {
  const transport = new DefaultChatTransport<UIMessage>({
    api: chatUrl,
    prepareSendMessagesRequest({ id, messages, body }) {
      return {
        body: {
          id,
          message: messages[messages.length - 1],
          provider: body?.provider,
          model: body?.model,
        },
      };
    },
  });

  return {
    async listThreads() {
      const response = await fetch(threadsUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to list threads");
      }

      const data = (await response.json()) as { threads: ChatThread[] };
      return data.threads;
    },

    async createThread() {
      const response = await fetch(threadsUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to create thread");
      }

      const data = (await response.json()) as { thread: ChatThread };
      return data.thread;
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

      const data = (await response.json()) as { messages: UIMessage[] };
      return data.messages.map(asChatMessage);
    },

    async *sendMessage({ threadId, messages, provider, model, signal }) {
      const stream = await transport.sendMessages({
        trigger: "submit-message",
        chatId: threadId,
        messageId: undefined,
        messages: messages.map(asUIMessage),
        abortSignal: signal,
        body: { provider, model },
      });

      for await (const message of readUIMessageStream<UIMessage>({
        stream,
        terminateOnError: true,
      })) {
        yield asChatMessage(message);
      }
    },

    async editMessage({ threadId, messageId, text }) {
      const response = await fetch(`${threadsUrl}/${threadId}/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to edit message");
      }

      const data = (await response.json()) as { messages: UIMessage[] };
      return data.messages.map(asChatMessage);
    },
  };
}
