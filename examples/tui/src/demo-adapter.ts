import { defineAdapter, type ChatAdapter, type ChatMessage, type ChatThread } from "@sarchauhan/adapter";

type DemoStore = {
  threads: ChatThread[];
  messages: Map<string, ChatMessage[]>;
};

const store: DemoStore = {
  threads: [{ id: "welcome", title: "Welcome" }],
  messages: new Map([
    [
      "welcome",
      [
        {
          id: "assistant-welcome",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Welcome to chat-tui. This demo adapter streams locally — no server required.\n\nAsk me anything, or try /help to see the coding-assistant commands.",
            },
          ],
        },
      ],
    ],
  ]),
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

async function* streamAssistant(
  prompt: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatMessage> {
  const id = `assistant-${Date.now()}`;
  const reply =
    `You said: “${prompt.slice(0, 120)}”\n\n` +
    "This is a streamed demo reply with reasoning and a tool call.";

  yield {
    id,
    role: "assistant",
    parts: [{ type: "reasoning", text: "Planning a helpful terminal reply…", state: "streaming" }],
  };
  await sleep(250, signal);

  yield {
    id,
    role: "assistant",
    parts: [
      { type: "reasoning", text: "Planning a helpful terminal reply…", state: "done" },
      {
        type: "tool",
        toolName: "terminal_status",
        toolCallId: "tool-1",
        state: "input-available",
        input: { ok: true },
      },
    ],
  };
  await sleep(200, signal);

  let text = "";
  for (const word of reply.split(/(\s+)/)) {
    text += word;
    yield {
      id,
      role: "assistant",
      parts: [
        { type: "reasoning", text: "Planning a helpful terminal reply…", state: "done" },
        {
          type: "tool",
          toolName: "terminal_status",
          toolCallId: "tool-1",
          state: "output-available",
          input: { ok: true },
          output: { pane: "messages", status: "ready" },
        },
        { type: "text", text, state: "streaming" },
      ],
    };
    await sleep(18, signal);
  }

  yield {
    id,
    role: "assistant",
    parts: [
      { type: "reasoning", text: "Planning a helpful terminal reply…", state: "done" },
      {
        type: "tool",
        toolName: "terminal_status",
        toolCallId: "tool-1",
        state: "output-available",
        input: { ok: true },
        output: { pane: "messages", status: "ready" },
      },
      { type: "text", text, state: "done" },
      {
        type: "source-url",
        sourceId: "docs",
        url: "https://github.com/Sarthakischauhan/chat-sdk",
        title: "chat-sdk",
      },
    ],
  };
}

/**
 * In-process adapter for showcasing the TUI without a backend.
 */
export function createDemoAdapter(): ChatAdapter {
  return defineAdapter({
    async listThreads() {
      return store.threads;
    },

    async createThread() {
      const thread = {
        id: `thread-${Date.now()}`,
        title: `Chat ${store.threads.length + 1}`,
      };
      store.threads = [thread, ...store.threads];
      store.messages.set(thread.id, []);
      return thread;
    },

    async deleteThread(threadId) {
      store.threads = store.threads.filter((thread) => thread.id !== threadId);
      store.messages.delete(threadId);
    },

    async loadMessages(threadId) {
      return store.messages.get(threadId) ?? [];
    },

    async *sendMessage({ threadId, message, signal }) {
      const existing = store.messages.get(threadId) ?? [];
      const withUser = [...existing, message];
      store.messages.set(threadId, withUser);

      const textPart = message.parts.find((part) => part.type === "text");
      const prompt =
        textPart && "text" in textPart && typeof textPart.text === "string"
          ? textPart.text
          : "";

      let latest: ChatMessage | null = null;
      try {
        for await (const snapshot of streamAssistant(String(prompt), signal)) {
          latest = snapshot;
          yield snapshot;
        }
      } finally {
        if (latest) {
          store.messages.set(threadId, [...withUser, latest]);
        }
      }
    },

    async editMessage({ threadId, messageId, text }) {
      const existing = store.messages.get(threadId) ?? [];
      const index = existing.findIndex((message) => message.id === messageId);
      if (index === -1) {
        return existing;
      }

      const next = existing.slice(0, index + 1).map((message) =>
        message.id === messageId
          ? { ...message, parts: [{ type: "text" as const, text }] }
          : message,
      );
      store.messages.set(threadId, next);
      return next;
    },
  });
}
