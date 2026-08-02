import type { AgentPart, AgentRole } from "@sarchauhan/protocol";

export type ChatRole = AgentRole;

export type ChatMessage = {
  id: string;
  role: ChatRole;
  parts: Array<AgentPart | { type: string; [key: string]: unknown }>;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

export type ChatThread = {
  id: string;
  title: string;
};

export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export type SendMessageInput = {
  threadId: string;
  message: ChatMessage;
  messages: ChatMessage[];
  provider?: string;
  model?: string;
  signal?: AbortSignal;
};

export type EditMessageInput = {
  threadId: string;
  messageId: string;
  text: string;
};

/** Same shape as `@sarchauhan/chat` ChatAdapter — adapters are interchangeable. */
export type ChatAdapter = {
  listThreads?: () => Promise<ChatThread[]>;
  createThread?: () => Promise<ChatThread>;
  deleteThread?: (threadId: string) => Promise<void>;
  loadMessages?: (threadId: string) => Promise<ChatMessage[]>;
  sendMessage: (input: SendMessageInput) => AsyncIterable<ChatMessage>;
  editMessage?: (input: EditMessageInput) => Promise<ChatMessage[]>;
};

export type SendMessage = (
  message: { text: string },
  options?: { body?: { provider?: string; model?: string } },
) => Promise<void>;
