import {
  defineAdapter,
  messagesFromEvents,
  type ChatMessage,
  type ChatThread,
} from "@sarchauhan/adapter";
import { normalizeSymphonyStream } from "./normalize";

type SymphonyAdapterOptions = {
  chatUrl?: string;
  threadsUrl?: string;
};

const messageText = (message: ChatMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? String(part.text) : ""))
    .join("\n");

const request = async <T,>(url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

export function createSymphonyAdapter({
  chatUrl = "/api/chat",
  threadsUrl = "/api/threads",
}: SymphonyAdapterOptions = {}) {
  return defineAdapter({
    async listThreads() {
      const data = await request<{ threads: ChatThread[] }>(threadsUrl, {
        cache: "no-store",
      });
      return data.threads;
    },

    async createThread() {
      const data = await request<{ thread: ChatThread }>(threadsUrl, {
        method: "POST",
      });
      return data.thread;
    },

    async deleteThread(threadId) {
      await request(`${threadsUrl}/${threadId}`, { method: "DELETE" });
    },

    async loadMessages(threadId) {
      const data = await request<{ messages: ChatMessage[] }>(
        `${threadsUrl}/${threadId}/messages`,
        { cache: "no-store" },
      );
      return data.messages;
    },

    async *sendMessage({ threadId, message, messages, model, thinkingLevel, signal }) {
      if (!model) {
        throw new Error("Symphony models are still loading or unavailable");
      }

      const conversation = messages
        .filter((item) => item.id !== message.id)
        .map((item) => ({ role: item.role, content: messageText(item) }))
        .filter((item) => item.content);

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText(message),
          conversation,
          session_id: threadId,
          model_id: model,
          ...(thinkingLevel ? { reasoning_effort: thinkingLevel } : {}),
        }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error((await response.text()) || "Symphony server did not return a stream");
      }

      let assistant: ChatMessage | undefined;
      const messageId = globalThis.crypto.randomUUID();
      const events = normalizeSymphonyStream(response.body, messageId);

      for await (const snapshot of messagesFromEvents(events)) {
        assistant = snapshot;
        yield snapshot;
      }

      if (!assistant) {
        throw new Error("Symphony stream ended without an assistant message");
      }

      if (!signal?.aborted) {
        await request(`${threadsUrl}/${threadId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...messages, assistant] }),
        });
      }
    },

    async editMessage({ threadId, messageId, text }) {
      const data = await request<{ messages: ChatMessage[] }>(
        `${threadsUrl}/${threadId}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        },
      );
      return data.messages;
    },
  });
}
