export type ChatRole = "user" | "assistant" | "system";

export type ChatMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; status?: "streaming" | "done" }
  | { type: string; [key: string]: unknown };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  parts: ChatMessagePart[];
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
  signal?: AbortSignal;
};

export type EditMessageInput = {
  threadId: string;
  messageId: string;
  text: string;
};

export type ChatAdapter = {
  listThreads?: () => Promise<ChatThread[]>;
  createThread?: () => Promise<ChatThread>;
  deleteThread?: (threadId: string) => Promise<void>;
  loadMessages?: (threadId: string) => Promise<ChatMessage[]>;
  sendMessage: (input: SendMessageInput) => AsyncIterable<ChatMessage>;
  editMessage?: (input: EditMessageInput) => Promise<ChatMessage[]>;
};

